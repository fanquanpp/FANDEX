---
order: 500
title: 行级安全策略
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL行级安全策略RLS：策略定义、USING与WITH CHECK、角色策略、多租户隔离与性能注意事项
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/480-SSLEncryptionConnection'
  - 'postgresql/490-RoleBasedPermissionManagement'
  - 'postgresql/510-DataEncryptionStorage'
  - 'postgresql/520-AuditLog'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
  - 'postgresql/490-RoleBasedPermissionManagement'
---

## 1. RLS 解决什么问题

普通的 GRANT 权限是**表级**的：能查就是能查全表。当需求变成
"每个租户只能看自己的订单、每个员工只能看自己部门的薪资"时，
过去只能靠每个查询手工加 `WHERE tenant_id = ?`——只要有一处遗漏
就是越权事故。

**行级安全（Row-Level Security, RLS）**把行级过滤下沉到数据库：
策略（POLICY）在每次查询时自动附加过滤条件，绕不开、忘不掉。

类比：表权限是**小区门禁**（能不能进这栋楼），RLS 是**每户的
门锁**（进了楼，哪一户的门能打开由你的钥匙决定）。

## 2. 启用与"默认拒绝"语义

```sql
-- 启用 RLS: 注意此时表会立即进入"默认拒绝"状态
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 关键语义:
-- 1. 没有创建任何策略之前, 除表所有者/BYPASSRLS 角色外, 谁都查不到任何行
-- 2. 表所有者(superuser 之外)默认不受 RLS 约束, 需要显式 FORCE
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- 查看策略与启用状态
SELECT * FROM pg_policies WHERE tablename = 'orders';
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'orders';
--  relname | relrowsecurity | relforcerowsecurity
-- ---------+----------------+---------------------
--  orders  | t              | t
```

## 3. 策略的解剖：命令 x 角色 x 两个表达式

每条策略由四个维度组成：

```
CREATE POLICY 名字 ON 表
  [FOR {ALL | SELECT | INSERT | UPDATE | DELETE}]
  [TO {角色 | PUBLIC}]
  [USING (可见性表达式)]      -- 决定"哪些旧行能被看到/被改"
  [WITH CHECK (新行约束)]     -- 决定"允许写入哪些新行"
```

- `USING`：过滤已有行（SELECT/UPDATE/DELETE 的 WHERE 语义）；
- `WITH CHECK`：校验新写入的行（INSERT 与 UPDATE 后的行）；
- 对 UPDATE/SELECT：只写 USING 时，新行沿用 USING 表达式做检查。

```sql
-- 只读策略
CREATE POLICY read_own_dept ON employees
    FOR SELECT USING (dept_id = get_user_dept());

-- 插入策略: 只能写入自己部门的行
CREATE POLICY insert_own_dept ON employees
    FOR INSERT WITH CHECK (dept_id = get_user_dept());

-- 更新策略: 旧行新行都要在本部门
CREATE POLICY update_own_dept ON employees
    FOR UPDATE USING (dept_id = get_user_dept())
                WITH CHECK (dept_id = get_user_dept());

-- 删除策略
CREATE POLICY delete_own_dept ON employees
    FOR DELETE USING (dept_id = get_user_dept());

-- FOR ALL 且不写 USING/WITH CHECK 时, 两者默认均为 true（全通过!）
-- 这通常不是你想要的, 显式写出条件更安全:
CREATE POLICY own_rows ON documents
  FOR ALL USING (owner = current_user) WITH CHECK (owner = current_user);
```

## 4. 多租户隔离：标准模板

```sql
-- 租户上下文放在会话自定义 GUC 里（应用每次取连接后先 SET）
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::INTEGER);

-- 应用连接初始化时:
SET app.tenant_id = '42';
SELECT count(*) FROM orders;
--  count
-- -------
--      3     <- 只会统计 tenant_id = 42 的行, 其他租户数据仿佛不存在
```

生产级模板：把租户 ID 封装进 SECURITY DEFINER 函数，避免
`current_setting` 在未 SET 时抛错，并把校验收敛到一处：

```sql
-- current_setting('app.tenant_id', true) 第二个参数 = 未设置时返回 NULL 而非报错
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', true), '')::INTEGER;
END $$;

REVOKE ALL ON FUNCTION app_tenant_id() FROM PUBLIC;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());
```

按角色放行的组合用法：

```sql
-- 按角色区分: 业务角色只看自己的行
CREATE POLICY user_orders ON orders
  FOR ALL TO app_user
  USING (user_id = current_user) WITH CHECK (user_id = current_user);

-- 客服角色放行全部: 注意必须显式建策略放行,
-- 因为"没有适用于该角色的策略"意味着默认拒绝（一行都看不到）
CREATE POLICY support_all ON orders
  FOR SELECT TO support_role
  USING (true);
```

## 5. 绕过者与例外

| 主体 | 是否受 RLS 限制 |
| -------------- | -------------------------- |
| 超级用户 | 否 |
| 带 BYPASSRLS 属性的角色 | 否 |
| 表所有者 | 默认否; FORCE 后受约束 |
| SECURITY DEFINER 函数 | 以定义者执行, 若定义者是所有者则不受限 |
| 普通角色 | 受约束 |

```sql
-- 审计与排查: 找出有 BYPASSRLS 的角色
SELECT rolname FROM pg_roles WHERE rolbypassrls;
```

注意：应用若用表所有者账号连接（一种常见坏实践），RLS 形同虚设。
**RLS 的前提是应用使用非所有者的低权限角色连接数据库。**

## 6. 性能与陷阱

- **策略表达式每行求值**：策略本质是自动附加的 WHERE 条件，
  相关列（tenant_id、user_id、dept_id）应有索引；复杂子查询策略
  会被内联到每一行，谨慎使用。
- **FOR ALL 默认 true 的误区**：见第 3 节，"没有策略"与"空策略"
  都可能造成意外放行或意外全禁，上线前用普通角色实测。
- **外键与唯一约束不受 RLS 影响**：RLS 只过滤"可见性"，
  `SELECT count(*)` 看不到别人的行，但唯一索引冲突仍可能暴露
  其他租户 ID 的存在（插入撞唯一键即信息泄露信号），敏感场景
  用"租户 ID + 业务主键"复合唯一键规避。
- **ENABLE 了但用所有者测试**：所有者默认绕过 RLS，测试结果
  全量可见，误以为策略没生效。用 `SET ROLE app_user;` 再测。
- **连接池下的租户串号**：`SET app.tenant_id` 是会话级，PgBouncer
  transaction 池模式下连接会被复用串号。对策：事务内用
  `SET LOCAL`，或在应用框架的连接归还钩子里 RESET。

## 小结

- 初学者要点：`ENABLE ROW LEVEL SECURITY` 后表立即"默认拒绝"；
  策略 = FOR 命令 + TO 角色 + USING（看旧行）+ WITH CHECK（管新行）；
  多租户场景用会话变量 + 策略表达式实现透明隔离。
- 进阶注意：FORCE 约束表所有者；BYPASSRLS 与 SECURITY DEFINER 是
  两个隐形后门；策略列务必有索引；连接池环境用 SET LOCAL 传递租户
  上下文；上线前必须用目标应用角色做正反两个方向的验证。
