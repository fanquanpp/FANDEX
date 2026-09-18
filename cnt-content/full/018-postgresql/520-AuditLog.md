---
order: 520
title: 审计日志：谁在什么时候动了什么
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL 审计的三层方案：log_statement 日志级、pgAudit 扩展标准级、触发器审计表级，含金融级合规配置、日志膨胀治理与审计自身的安全防护。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/380-TriggerEventTrigger'
  - 'postgresql/500-RowLevelSecurity'
  - 'postgresql/490-RoleBasedPermissionManagement'
  - 'cybersecurity/010-SecurityBasicsDefense'
prerequisites:
  - 'postgresql/380-TriggerEventTrigger'
  - 'postgresql/490-RoleBasedPermissionManagement'
---

## 前置知识

- 触发器机制（[触发器与事件触发器](/postgresql/380-TriggerEventTrigger)）——表级审计的地基；
- 权限体系（[角色与权限管理](/postgresql/490-RoleBasedPermissionManagement)）——审计要回答"谁"，而"谁"依赖登录与权限治理做对。

## 审计要回答的四个问题

一套合格的审计体系，事发后能在十分钟内回答：

1. **谁**：哪个登录角色（不是应用写的 user_id，而是数据库连接身份）；
2. **何时**：精确时间与事务上下文；
3. **做了什么**：完整语句或行级前后镜像；
4. **影响范围**：改了哪些表哪些行。

不同层级方案回答能力不同，先看全景再选型：

| 方案 | 粒度 | 开销 | 能看到 | 适用 |
| --- | --- | --- | --- | --- |
| `log_statement` 日志 | 语句级 | 低到中 | SQL 文本 + 连接信息 | 常规运维审计 |
| pgAudit 扩展 | 语句/对象级 | 中 | 结构化审计日志，可按对象过滤 | 合规要求、等保 |
| 触发器审计表 | 行级 | 随写入放大 | 行级前后镜像 | 核心表追责、数据回溯 |

## 第一层：日志级（log_statement）

```conf
# postgresql.conf
logging_collector = on
log_statement = 'ddl'        # none/mod/ddl/all 四档
log_connections = on         # 登录审计
log_disconnections = on
log_line_prefix = '%m [%p] %u@%d %r '   # 时间/进程/用户@库/来源IP
```

选档建议：**生产环境用 `ddl` 而不是 `all`**——`all` 会把每条 SQL 写日志，高并发下磁盘 IO 与日志量双重爆炸，而且业务 SQL 大多没有审计价值。`ddl` 挡住的是"谁改了结构"这类高危动作，成本几乎为零；需要更细再升级到 pgAudit，而不是直接开 `all`。

`log_line_prefix` 必须配 `%u@%d %r`，否则日志里的 SQL 不知道是谁执行的——审计价值直接归零。

## 第二层：pgAudit（合规标准方案）

pgAudit（pgaudit 扩展）是 PostgreSQL 官方生态的审计标准，等保、PCI-DSS 类合规审查的默认答案。它把审计记录从服务器日志中结构化分离，支持按会话与按对象两条审计路径：

```conf
# postgresql.conf（shared_preload_libraries 需重启）
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'WRITE, DDL'          # 审计写操作与 DDL
pgaudit.log_catalog = off           # 不审计对系统目录的访问（降噪）
pgaudit.log_parameter = on          # 记录语句参数（敏感场景权衡后开启）
```

```sql
-- 验证：对目标表的写操作会带 AUDIT: 前缀进入日志
CREATE EXTENSION pgaudit;
CREATE TABLE audit_demo (id int);
INSERT INTO audit_demo VALUES (1);
-- 日志出现：AUDIT: SESSION,1,1,WRITE,INSERT,TABLE,public.audit_demo,...
```

对象级审计（只盯某张核心表）用角色继承机制：`CREATE ROLE auditor; CREATE EXTENSION pgaudit; ALTER ROLE auditor SET pgaudit.role = 'auditor';` 之后把要盯的对象 GRANT 给该角色即可精准捕获。

**参数记录的权衡**要慎重：`pgaudit.log_parameter = on` 会把 SQL 里的身份证号、密码明文写进日志——审计日志本身变成敏感数据泄露点，需要与日志的访问控制、加密存储联动（合规里常要求脱敏，具体按等保条款执行）。

## 第三层：触发器审计表（行级镜像）

核心资产表（账务、权限表）需要"改前什么样、改后什么样"的行级证据链，触发器方案：

```sql
-- 1. 审计表（JSONB 存前后镜像，天然适配任意表结构）
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  op text NOT NULL,                  -- INSERT/UPDATE/DELETE
  row_data jsonb,                    -- 操作后镜像
  old_data jsonb,                    -- 操作前镜像
  changed_by text DEFAULT current_user,
  changed_at timestamptz DEFAULT now()
);

-- 2. 通用审计函数
CREATE OR REPLACE FUNCTION fn_audit() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, op, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, op, row_data, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW), to_jsonb(OLD));
    RETURN NEW;
  ELSE
    INSERT INTO audit_log(table_name, op, row_data)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 挂到核心表
CREATE TRIGGER trg_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_audit();
```

注意两个设计要点：`current_user` 记录的是**数据库连接身份**——若应用全用一个账号连库，审计只能到"应用"这一层， finer 粒度需要应用把真实用户 ID 通过 `SET LOCAL app.user_id = 'xxx'` 传入并在函数里读取；审计表本身要**收紧权限**（禁止普通角色 UPDATE/DELETE，只许插入与查询），否则攻击者洗掉自己的痕迹，审计就成了摆设。

## 治理：审计数据的生命周期

审计数据自己也需要工程管理，否则三个月后就是一场存储灾难：

1. **分区**：audit_log 按月分区（配合分区表机制），历史分区整体转冷；
2. **归档**：保留期（合规要求常见为 6 个月到 3 年）后的分区导出对象存储压缩归档；
3. **监控**：审计表体积增长率纳入监控——写入量突增常常是异常行为的第一信号，审计同时兼作入侵检测数据源。

## 动手环节：五分钟搭出行级审计

```sql
-- 用上面三层方案的第三层代码建好审计表与函数后：
CREATE TABLE aud_test (id int primary key, note text);
CREATE TRIGGER trg_aud AFTER INSERT OR UPDATE OR DELETE ON aud_test
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

INSERT INTO aud_test VALUES (1, 'v1');
UPDATE aud_test SET note = 'v2' WHERE id = 1;
DELETE FROM aud_test WHERE id = 1;

SELECT op, old_data->>'note' AS before_val, row_data->>'note' AS after_val,
       changed_by, changed_at
FROM audit_log ORDER BY id;
-- INSERT 行 after=v1；UPDATE 行 before=v1 after=v2；DELETE 行 before=v2
-- 完整的证据链就在眼前
```

## 常见困惑

**"审计和普通日志什么区别？"**——普通日志面向排障（可改可删可轮转丢失），审计面向追责（防篡改、完整、可检索、保留期受合规约束）。工程上常做"审计数据单独存储 + 只追加权限 + 定期校验"三件事。

**"开审计会影响性能吗？"**——`log_statement=ddl` 与 pgAudit 按对象审计的开销可忽略；`all` 级别与行级触发器才有明显成本（触发器约为每行一次 INSERT 的额外开销）。按"核心表才上触发器审计"控制爆炸半径。

**"等保/等合规到底要求做到哪层？"**——不同行业条款不同，通用底线是：登录审计（log_connections）+ DDL 审计 + 核心数据写操作可追溯。拿条款对照三层方案的覆盖矩阵逐项勾选，别凭感觉堆方案。

## 检验清单

- 能说出四个审计问题与三层方案的粒度/开销/适用对照；
- 知道 `log_line_prefix` 缺 %u@%d 时审计价值归零的原因；
- 会配置 pgAudit 的会话级与对象级审计，并说出 log_parameter 的脱敏权衡；
- 独立实现行级审计触发器，并记住两条纪律：连接身份局限、审计表禁改；
- 能给出审计数据的生命周期治理方案（分区、归档、保留期与防篡改）。

## 下一步

审计记录"发生过什么"，权限治理决定"本来能发生什么"：进入[行级安全 RLS](/postgresql/500-RowLevelSecurity)，让越权操作根本无法发生。
