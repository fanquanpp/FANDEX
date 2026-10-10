---
order: 330
title: 存储过程与函数
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 以批量对账与审计场景讲 PL/pgSQL：变量与控制流、异常处理、RETURNING、SECURITY DEFINER 与函数属性易错点
author: fanquanpp
updated: '2026-10-07'
related:
  - 'postgresql/380-TriggerEventTrigger'
  - 'postgresql/340-ExtensionModuleDetailed'
  - 'postgresql/255-MonitoringStatisticsViews'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 知识点地图

- **知识类别**：PostgreSQL 服务器端编程（Chapter 41 PL/pgSQL）。
- **解决什么问题**：一批数据要"读出来、算一遍、写回去"，放应用层要来回拉几十万行数据；放 PL/pgSQL 里数据不挪窝、一次往返完成。另外，**跨表多步写操作要在数据库侧保证原子性**（过程内的语句同属一个事务）。
- **什么时候用到**：批量对账、数据订正、审计留痕、复杂业务规则下沉；以及给报表提供可复用的带参查询。
- **取舍先行**：逻辑放库里的代价是**部署与版本管理绕过应用**（改一行 SQL 要走 DBA 流程）、单元测试更难。小而稳、读多写少的逻辑适合下沉；频繁变动的业务规则留在应用层。

## 心智模型：函数 vs 存储过程

| | FUNCTION | PROCEDURE |
| --- | --- | --- |
| 调用 | `SELECT fn(...)`，可进 SQL 表达式 | `CALL proc(...)`，独立语句 |
| 返回值 | 必须有（标量/表/void） | 可无 |
| 事务控制 | 不能 COMMIT/ROLLBACK | **可以**（PG 11+） |
| 典型用途 | 计算、查询封装 | 多步批处理、事务边界管理 |

选择口诀：**要"算个数/出个表"用函数；要"干一串活、自己管事务"用过程**。

## 场景一：批量对账（存储过程 + 分批提交 + 异常处理）

需求：每天凌晨对支付流水与账单表核对，差异写进对账结果表；流水百万级，要分批提交避免长事务。这个例子覆盖 PL/pgSQL 的四大件：变量、控制流、异常、过程事务。

```sql
CREATE TABLE recon_results (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id  bigint,
    diff_kind   text,          -- 'MISSING' | 'AMOUNT' | 'BATCH_ERROR'
    detail      text,
    batch_no    int
);

CREATE OR REPLACE PROCEDURE reconcile_batch(
    p_batch_size int DEFAULT 10000
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch   int := 0;
    v_done    bigint;
    r         record;          -- 行变量，循环里逐行取
BEGIN
    LOOP
        v_batch := v_batch + 1;
        v_done := 0;

        -- 每批一个独立事务：COMMIT 后行锁释放、WAL 刷盘
        BEGIN
            FOR r IN
                SELECT p.id, p.amount, b.bill_amount
                FROM payments p
                LEFT JOIN bills b ON b.payment_id = p.id
                WHERE p.recon_flag = false      -- 待对账标记
                ORDER BY p.id
                LIMIT p_batch_size
                FOR UPDATE SKIP LOCKED          -- 多实例并行跑互不抢行
            LOOP
                IF r.bill_amount IS NULL THEN
                    INSERT INTO recon_results (payment_id, diff_kind, detail, batch_no)
                    VALUES (r.id, 'MISSING', '无对应账单', v_batch);
                ELSIF r.bill_amount <> r.amount THEN
                    INSERT INTO recon_results (payment_id, diff_kind, detail, batch_no)
                    VALUES (r.id, 'AMOUNT',
                            format('流水 %s vs 账单 %s', r.amount, r.bill_amount),
                            v_batch);
                END IF;

                UPDATE payments SET recon_flag = true WHERE id = r.id;
                v_done := v_done + 1;
            END LOOP;

            COMMIT;   -- 过程里合法：本批提交，下一批新事务
        EXCEPTION
            WHEN OTHERS THEN
                -- 本批出错：记录后回滚，继续下一批（不让单条脏数据停整个对账）
                INSERT INTO recon_results (payment_id, diff_kind, detail, batch_no)
                VALUES (NULL, 'BATCH_ERROR', SQLERRM, v_batch);
                ROLLBACK;
        END;

        EXIT WHEN v_done < p_batch_size;   -- 没取满一批 = 干完了
    END LOOP;

    RAISE NOTICE '对账完成，共 % 批', v_batch;
END;
$$;

CALL reconcile_batch(50000);
```

逐段讲解四个关键写法：

- `FOR UPDATE SKIP LOCKED`：多实例部署时两个对账进程不会重复领单——谁先锁到谁处理，后到的**跳过已锁行而不是排队**。换成普通 `FOR UPDATE`，两个实例会互相等锁，吞吐减半；不写 FOR UPDATE，则可能重复对账。
- `COMMIT` 在过程内：每批提交后，前面批次的锁与 WAL 都落定，长事务对 VACUUM 的阻塞（见[VACUUM 机制](/postgresql/210-VACUUMMechanism)）被限制在单批之内。**同样的代码写在函数里会直接报错**——函数不能控制事务，这是"该用过程"的最硬判据。
- `EXCEPTION WHEN OTHERS`：等价于其他语言的 catch-all。`SQLERRM` 是当前错误消息。注意捕获即"吞掉"——这里主动记录后继续，是刻意的容错策略；**不带处理的空 EXCEPTION 块会静默吞错**，是 PL/pgSQL 第一大坑。
- `EXIT WHEN v_done < p_batch_size`：LIMIT 取不满说明没有更多待处理行，循环收尾。写成 `EXIT WHEN v_done = 0` 会在"最后一批恰好全部异常"时漏掉终止判断。

## 场景二：审计函数（表函数 + RETURNS TABLE + RETURNING）

需求：每次状态变更要留痕，同时把"变更后的最新值"返回给应用，免得应用再查一次。

```sql
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id bigint,
    p_new_status text
)
RETURNS TABLE (order_id bigint, status text, changed_at timestamptz)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 校验：状态机白名单
    IF p_new_status NOT IN ('paid', 'shipped', 'done', 'cancelled') THEN
        RAISE EXCEPTION '非法状态: %', p_new_status
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN QUERY
    UPDATE orders o
    SET status = p_new_status,
        updated_at = now()
    WHERE o.id = p_order_id
    RETURNING o.id, o.status, o.updated_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION '订单不存在: %', p_order_id;
    END IF;
END;
$$;

-- 调用：函数直接当表用
SELECT * FROM update_order_status(1001, 'shipped');
```

逐段讲解：

- `RETURNS TABLE (...)` 隐式声明了与列同名的 OUT 参数——**如果表列恰好也叫 order_id，函数体内裸写 `order_id` 会撞名**（解析成 OUT 参数而非表列，报 "column reference is ambiguous"）。稳妥做法：RETURNS TABLE 的列名加前缀，或查询里全部用表限定（`o.id`）；
- `RETURN QUERY UPDATE ... RETURNING`：一条语句完成"改 + 返回"，应用省一次往返。换成"先 SELECT 确认存在再 UPDATE"有两步间竞态，并发下可能空更新；
- `IF NOT FOUND`：UPDATE 影响 0 行时 FOUND 为假，把"订单不存在"变成显式异常而不是静默无操作——**调用方拿到异常才能正确处理，拿到空结果集往往会当成成功**；
- `USING ERRCODE` 给异常带错误码，应用层可按码分支处理而不是解析错误消息文本。

## SECURITY DEFINER：权限易错点重灾区

函数默认以**调用者**权限执行（SECURITY INVOKER）。声明 `SECURITY DEFINER` 后以**函数属主**（通常是表属主）执行——这正好用来实现"普通用户无权直改表，只能通过函数走受控路径"：

```sql
CREATE OR REPLACE FUNCTION reset_user_password(p_user_id bigint, p_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER                        -- 以属主权限执行，绕过调用者的表权限
SET search_path = pg_catalog, public    -- 锁定 search_path，防劫持
AS $$
BEGIN
    UPDATE users SET password_hash = p_hash WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION reset_user_password(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_user_password(bigint, text) TO app_support;
```

三个必须一起做的动作，缺一个就是漏洞：

1. `SET search_path`：不锁定 search_path 时，攻击者若有 schema 建权，可在靠前 schema 放同名对象**劫持解析**（官方文档点名的高危项）；
2. `REVOKE ... FROM PUBLIC`：默认所有用户可执行 DEFINER 函数，等于权限白放；
3. 函数体里**绝不**执行拼接 SQL（`EXECUTE '...' || p_input`）——DEFINER 权限放大注入后果。

判断口诀：**DEFINER 是给"表属主身份"用的，不是给"超级用户"用的**；属主若是超级用户，函数一旦被注入等于沦陷整个库。

## 函数属性：三个影响优化器的小开关

```sql
CREATE OR REPLACE FUNCTION get_rate(p_date date) RETURNS numeric
LANGUAGE sql
STABLE            -- 只读：同一条语句内同参数返回不变（可下推/可用在索引条件）
PARALLEL SAFE     -- 可在并行 worker 里执行（默认 UNSAFE，强制串行）
COST 10           -- 代价提示，影响优化器排序
AS $$ SELECT rate FROM price_windows WHERE effective @> p_date $$;
```

易错点：函数默认 `VOLATILE`——优化器不敢对它做任何跨行假设，**在 WHERE 里每行调一次**。纯读表函数标成 `STABLE`、纯计算函数标成 `IMMUTABLE` 后，优化器才能做常量折叠与索引匹配。把含写操作的函数误标 IMMUTABLE 会被优化器折叠掉——后果是写入没执行。

## 常见困惑

**"同名的多个函数怎么删？"**——PG 按签名（参数类型列表）区分重载：`DROP FUNCTION fn(int)` 只删 int 版。不带签名会报"函数不唯一"。重命名/改签名后旧版本还在，是"改了没生效"的常见原因。

**"PL/pgSQL 里写的 SQL 每次都重新解析吗？"**——静态 SQL 首次执行时做计划缓存，之后复用；**动态 SQL（EXECUTE）每次重新解析**，热点路径避免字符串拼 SQL。

**"存储过程能替代定时任务吗？"**——过程自己不会定时跑，要配 `pg_cron` 扩展或外部调度（应用定时器、crontab 调 psql）。

## 动手实践：写一个自己的对账过程

任务：

1. 建两张表 `deposits(id, user_id, amount, checked bool)` 与 `ledger(id, deposit_id, amount)`，各造 1 万行，其中故意留一批不配 ledger、一批金额不一致；
2. 仿照场景一写 `reconcile_demo(int)` 过程，把差异落 `demo_diffs` 表，支持 `SKIP LOCKED`；
3. 开两个 psql 会话同时 `CALL`，确认没有重复对账记录；
4. 把过程中的 `COMMIT` 放进函数体会怎样？实际试一次并读报错。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1
CREATE TABLE demo_diffs (deposit_id bigint, kind text, detail text);
INSERT INTO deposits SELECT g, g % 100 + 1, (random()*100)::numeric(10,2), false
FROM generate_series(1, 10000) g;
INSERT INTO ledger SELECT g, g, amount FROM deposits WHERE id % 5 <> 0;      -- 缺 20%
UPDATE ledger SET amount = amount + 1 WHERE id % 300 = 0;                    -- 制造金额差

-- 2（核心循环与正文场景一同构，替换表名与列名即可）
CREATE OR REPLACE PROCEDURE reconcile_demo(p_batch int DEFAULT 1000)
LANGUAGE plpgsql AS $$
DECLARE r record; v_done bigint; v_batch int := 0;
BEGIN
  LOOP
    v_batch := v_batch + 1; v_done := 0;
    FOR r IN SELECT id, amount, l.amount AS la
             FROM deposits d LEFT JOIN ledger l ON l.deposit_id = d.id
             WHERE NOT d.checked ORDER BY d.id LIMIT p_batch
             FOR UPDATE OF d SKIP LOCKED
    LOOP
      IF r.la IS NULL THEN
        INSERT INTO demo_diffs VALUES (r.id, 'MISSING', '无流水');
      ELSIF r.la <> r.amount THEN
        INSERT INTO demo_diffs VALUES (r.id, 'AMOUNT', r.amount || ' vs ' || r.la);
      END IF;
      UPDATE deposits SET checked = true WHERE id = r.id;
      v_done := v_done + 1;
    END LOOP;
    COMMIT;
    EXIT WHEN v_done < p_batch;
  END LOOP;
END $$;

-- 4 的预期报错：
-- ERROR: invalid transaction termination
-- CONTEXT: PL/pgSQL function ... COMMIT
```

判读要点：两个会话并发跑完后 `SELECT count(*) FROM demo_diffs GROUP BY deposit_id HAVING count(*) > 1;` 应返回空——SKIP LOCKED 生效的证据。
</details>

## 检验清单

- 能说清函数与过程在调用方式与事务控制上的区别；
- 能解释 `FOR UPDATE SKIP LOCKED` 解决的并发问题，以及去掉它的两种后果；
- 能说出 SECURITY DEFINER 的三个配套动作与各自防的风险；
- 知道 VOLATILE/STABLE/IMMUTABLE 对优化器行为的影响与误标风险；
- 能解释 EXCEPTION 吞错与 NOT FOUND 静默这两个易错点。

## 下一步

- [触发器与事件触发器](/postgresql/380-TriggerEventTrigger)：让数据库**自动**执行你的函数；
- [事务与并发控制](/postgresql/170-TransactionConcurrencyControl)：过程内 COMMIT 与隔离级别的交互；
- [运行监控与统计视图](/postgresql/255-MonitoringStatisticsViews)：对账过程跑完后怎么验证没留下长事务。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 41 PL/pgSQL、Chapter 38 Extending SQL（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/plpgsql.html>
- 场景与坑点整理自通用工程实践，SKIP LOCKED 用法已对照官方 SELECT 文档核校。

## 游标与循环

<!-- 来源: cnt-content/full/018-postgresql/370-StoredProcedureAndFunction.md 的 "1.4 游标与循环" 小节 -->

```sql
CREATE OR REPLACE PROCEDURE process_orders() AS $$
DECLARE
    order_record RECORD;
BEGIN
    FOR order_record IN
        SELECT id, amount FROM orders WHERE status = 'pending'
    LOOP
        UPDATE orders SET status = 'processing' WHERE id = order_record.id;
        -- 处理逻辑
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## PL/Python

<!-- 来源: cnt-content/full/018-postgresql/370-StoredProcedureAndFunction.md 的 "2. PL/Python" 小节 -->

```sql
CREATE EXTENSION plpython3u;

CREATE OR REPLACE FUNCTION python_hash(p_text TEXT)
RETURNS TEXT AS $$
import hashlib
return hashlib.sha256(p_text.encode()).hexdigest()
$$ LANGUAGE plpython3u;
```

## PL/Perl

<!-- 来源: cnt-content/full/018-postgresql/370-StoredProcedureAndFunction.md 的 "3. PL/Perl" 小节 -->

```sql
CREATE EXTENSION plperl;

CREATE OR REPLACE FUNCTION perl_reverse(p_text TEXT)
RETURNS TEXT AS $$
return reverse($_[0]);
$$ LANGUAGE plperl;
```
