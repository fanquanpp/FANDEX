---
order: 340
title: 触发器与事件触发器
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 以审计日志与冗余字段同步两个场景讲触发器：BEFORE/AFTER 与行级/语句级、WHEN 条件、事件触发器
author: fanquanpp
updated: '2026-10-11'
related:
  - 'postgresql/370-StoredProcedureAndFunction'
  - 'postgresql/520-AuditLog'
  - 'postgresql/340-ExtensionModuleDetailed'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 知识点地图

- **知识类别**：PostgreSQL 服务器端编程（Chapter 39 Triggers / Chapter 40 Event Triggers）。
- **解决什么问题**：**每次**对某表的 INSERT/UPDATE/DELETE 都要做同一件事（写审计、同步冗余字段），而写操作散布在应用各处、未来还会新增入口——把这件事挂在表上，比指望每个开发者记得调用统一入口可靠。
- **什么时候用到**：审计留痕、冗余字段同步（如订单表冗余"最近一笔支付时间"）、物化计数字段、软删除统一拦截、（事件触发器）生产库 DDL 防线。
- **代价先行**：触发器把逻辑藏进数据库，**应用层看不到它的存在**——排查"为什么 UPDATE 这么慢/为什么多了一行数据"时它是隐形嫌疑人。能用外键、CHECK、生成列表达的规则，不要用触发器。

## 心智模型：一张时间线图

```text
语句开始
  ├─ BEFORE ROW 触发器（每行，可改写 NEW / 取消操作 RETURN NULL）
  ├─ 执行约束检查
  ├─ 实际写入
  ├─ AFTER ROW 触发器（每行，NEW/OLD 都已落定，只读它们）
  └─ AFTER STATEMENT 触发器（每语句一次）
语句结束（触发器与原操作同事务：触发器里出错，原操作一起回滚）
```

| 维度 | BEFORE | AFTER |
| --- | --- | --- |
| 典型用途 | 校验、改写数据、软删拦截 | 审计、联动写别的表、通知 |
| 能改 NEW 吗 | 能 | 不能（数据已写入） |
| 时机保证 | 在约束检查前 | 在写入后，见到的 NEW 一定是最终值 |

行级（FOR EACH ROW）与语句级（FOR EACH STATEMENT）：批量 UPDATE 10 万行，行级触发器跑 10 万次，语句级跑 1 次（无 NEW/OLD 可用）。**审计用行级，聚合统计用语句级**——把本该语句级的事写成行级是触发器慢的第一大原因。

## 场景一：审计日志（AFTER 行级触发器）

需求：orders 表的一切增删改都要留痕，审计表记录操作前后镜像、操作者与时间。

```sql
-- 1. 审计表（JSONB 存镜像，字段演进不用改审计表）
CREATE TABLE orders_audit (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  text NOT NULL,
    op          text NOT NULL,               -- INSERT / UPDATE / DELETE
    old_data    jsonb,
    new_data    jsonb,
    changed_by  text NOT NULL DEFAULT current_user,
    changed_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. 通用触发器函数：一张函数服务多张表
CREATE OR REPLACE FUNCTION audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO orders_audit (table_name, op, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSE
        INSERT INTO orders_audit (table_name, op, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP,
                CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END,
                to_jsonb(NEW));
        RETURN NEW;
    END IF;
END;
$$;

-- 3. 挂到表上：一张表一条 CREATE TRIGGER
CREATE TRIGGER trg_orders_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_log();
```

逐段讲解：

- `to_jsonb(OLD)/to_jsonb(NEW)` 是核心技巧：整行转 JSONB，**加列不用改触发器**。存成宽表镜像列则每加一列要同步改审计表——JSONB 形态的审计表是长期维护成本最低的；
- `TG_OP/TG_TABLE_NAME/TG_USER`：触发器上下文变量，分别给"什么操作/哪张表/谁干的"；`changed_by` 若业务用应用层账号而非数据库账号，从会话变量取（`current_setting('app.user', true)`），这是应用侧 `SET app.user = 'zhang'` 的配套约定；
- `RETURN NEW/OLD`：AFTER 触发器的返回值被忽略，但语法上必须返回非 NULL（约定俗成：改数据 RETURN NEW，删 RETURN OLD）；
- DELETE 分支单独写的理由：DELETE 只有 OLD，UPDATE/INSERT 才有 NEW——用一个 ELSE 合并能少写重复的 INSERT。

审计触发器的两个坑：

- **它放大写入量**：每行变更多一次 INSERT，批量导入千万行时先禁触发器（`ALTER TABLE orders DISABLE TRIGGER trg_orders_audit`）再补跑审计，否则导入时间可能翻倍；
- **触发器里的查询也占锁**：审计表写热了会拖慢原表 DML。审计表按月分区（见[分区表](/postgresql/270-PartitionedTable)）是标准解法。

## 场景二：冗余字段同步（BEFORE 行级触发器）

需求：订单表冗余"最近支付时间"与"累计支付金额"，列表页因此免 JOIN。写入分散在支付回调、后台订正等多个入口——挂触发器保证任何入口写 payments 后订单冗余字段自动一致。

```sql
CREATE OR REPLACE FUNCTION sync_order_payinfo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.status <> OLD.status THEN
        UPDATE orders o
        SET last_paid_at = NEW.paid_at,
            paid_total = o.paid_total + NEW.amount
        WHERE o.id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_payinfo
AFTER INSERT OR UPDATE OF status, amount ON payments
FOR EACH ROW
WHEN (NEW.status = 'paid')          -- 条件触发：只在意变"已支付"
EXECUTE FUNCTION sync_order_payinfo();
```

逐段讲解：

- `AFTER INSERT OR UPDATE OF status, amount`：只在这两列被写时触发——`UPDATE payments SET remark='x'` 不再触发，减少无谓执行；
- `WHEN (NEW.status = 'paid')`：条件继续前置过滤。WHEN 里写不下的复杂判断才进函数体；
- 幂等靠 `NEW.status <> OLD.status`：支付回调可能重发，状态没变就不加金额。**换成 BEFORE 触发器做这个场景是错的**——BEFORE 阶段行还没落库，此时 UPDATE orders 拿不到本行新值保证，且约束失败时已执行的 UPDATE 不会自动回退到触发前状态那样干净（同事务回滚倒是会，但语义上 AFTER 才是"确认成功后联动"）；
- 触发器里的 UPDATE orders 又可能命中 orders 自己的触发器——**触发器链**。链上的每个环节都要审查，避免环（A 同步 B，B 又同步 A，互相触发到深度上限报错）。

替代方案对照：这个需求用**生成列**（GENERATED ALWAYS AS，见[生成列](/postgresql/150-GeneratedColumn)）能表达"同表内派生"，跨表派生只能触发器或应用层双写。若不需要强一致（列表页能容忍秒级旧值），应用层发消息异步更新比触发器吞吐好得多。

## 场景三：事件触发器（DDL 防线）

行级/语句级触发器只管 DML。**事件触发器**挂在 DDL 上，是生产库的变更防线：

```sql
-- 1. 记录全部 DDL
CREATE TABLE ddl_log (
    id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cmd_tag  text,       -- CREATE TABLE / DROP INDEX / ...
    obj      text,       -- 对象标识
    fired_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_ddl()
RETURNS event_trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO ddl_log (cmd_tag, obj)
    SELECT tg_tag, object_identity
    FROM pg_event_trigger_ddl_commands();
END;
$$;

CREATE EVENT TRIGGER trg_log_ddl
ON ddl_command_end
EXECUTE FUNCTION log_ddl();

-- 2. 拦截危险 DDL：DROP TABLE 必须先进维护模式
CREATE OR REPLACE FUNCTION guard_drop()
RETURNS event_trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_event_trigger_dropped_objects()
        WHERE object_type = 'table'
    ) AND current_setting('app.maintenance') <> 'on' THEN
        RAISE EXCEPTION 'DROP TABLE 被拦截：先 SET app.maintenance = on';
    END IF;
END;
$$;

CREATE EVENT TRIGGER trg_guard_drop
ON sql_drop
EXECUTE FUNCTION guard_drop();
```

逐段讲解：`ddl_command_end` 在 DDL 完成后触发（记录用），`sql_drop` 在删除已发生但提交前触发（拦截用——RAISE EXCEPTION 回滚整个 DDL）；`pg_event_trigger_ddl_commands()` 只在事件触发器内可用，返回本次 DDL 的对象清单。事件触发器是**库级**的（跨 schema），只有超级用户能建——它防的是"权限够、判断错"的内部事故，如周五下午手滑 `DROP TABLE`。

## 常见困惑

**"触发器和外键级联谁先跑？"**——外键的 CASCADE 动作属于参照动作，在用户触发器之外；同一表上外键检查与 BEFORE 触发器的相对顺序是固定的（外键先于 AFTER、后于 BEFORE 行级）。写依赖顺序的逻辑前先在测试库验证，别背条文。

**"触发器函数能复用给多张表吗？"**——能（场景一的通用审计函数），靠 TG_ 变量区分上下文。反过来说，**函数里写死表名**的触发器函数复用时就是事故。

**"怎么查一张表有哪些触发器？"**——`\d 表名` 或 `SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'orders'::regclass AND NOT tgisinternal;`（排除外键等内部触发器）。接手陌生库时这张清单值得先看一遍。

## 动手实践：给播客库配齐审计与同步

任务：

1. 给 plays 表挂通用审计触发器（复用场景一函数），分别做 INSERT/UPDATE/DELETE，检查 orders_audit 记录是否完整；
2. 给 shows 表加 `episode_count int` 冗余字段，用触发器在 episodes 插入/删除时自动增减（提示：AFTER INSERT +1，AFTER DELETE -1，触发器名不同或用 TG_OP 分支）；
3. 故意写一个"UPDATE episodes 触发同步、同步里又 UPDATE episodes"的自触发环，观察报错信息；
4. 用事件触发器拦截本会话的 `DROP TABLE`，验证拦截生效后 SET maintenance=on 放行。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1（audit_log 函数同正文；audit 表把 table_name 列放开即可服务 plays）
CREATE TRIGGER trg_plays_audit
AFTER INSERT OR UPDATE OR DELETE ON plays
FOR EACH ROW EXECUTE FUNCTION audit_log();
INSERT INTO plays (show_name, city, finished, played_at)
VALUES ('测试节目', '杭州', false, now());
SELECT op, new_data->>'show_name' FROM orders_audit
WHERE table_name = 'plays' ORDER BY id DESC LIMIT 1;

-- 2
ALTER TABLE shows ADD COLUMN episode_count int NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION bump_episode_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shows SET episode_count = episode_count +
    CASE TG_OP WHEN 'INSERT' THEN 1 WHEN 'DELETE' THEN -1 ELSE 0 END
  WHERE id = COALESCE(NEW.show_id, OLD.show_id);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_eps_ins AFTER INSERT ON episodes
  FOR EACH ROW WHEN (NEW.show_id IS NOT NULL) EXECUTE FUNCTION bump_episode_count();
CREATE TRIGGER trg_eps_del AFTER DELETE ON episodes
  FOR EACH ROW WHEN (OLD.show_id IS NOT NULL) EXECUTE FUNCTION bump_episode_count();

-- 3 的预期现象：UPDATE 卡住或报错
-- ERROR: stack depth limit exceeded（无限自触发直到栈上限）

-- 4
SET app.maintenance = 'off';
DROP TABLE some_test;            -- ERROR: DROP TABLE 被拦截
SET app.maintenance = 'on';
DROP TABLE some_test;            -- 成功
```

判读要点：任务 3 说明**触发器链必须显式防环**（如同步函数里加"值没变就不写"的短路），生产触发器上线前值得专门做一次环审查。
</details>

## 检验清单

- 能画出一条 UPDATE 语句上 BEFORE 行级 / 约束 / AFTER 行级 / AFTER 语句级的先后顺序；
- 能说明审计为什么选 AFTER 行级 + JSONB 镜像，以及批量导入时怎么处理触发器；
- 能解释 WHEN 条件、UPDATE OF 列清单、幂等短路三个减负手段；
- 知道事件触发器的两类钩子（ddl_command_end 记录 / sql_drop 拦截）与库级生效范围；
- 会查一张表的触发器清单并识别 tgisinternal。

## 下一步

- [存储过程与函数](/postgresql/370-StoredProcedureAndFunction)：触发器函数的 PL/pgSQL 全语法；
- [审计日志](/postgresql/520-AuditLog)：触发器审计 vs pgAudit vs 日志审计的三层分工；
- [生成列](/postgresql/150-GeneratedColumn)：同表派生字段的零触发器方案。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 39 Triggers、Chapter 40 Event Triggers（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/triggers.html>
- 审计表 JSONB 形态为社区通行做法，本篇实现为原创改写。
