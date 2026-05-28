---
order: 30
tags:
  - 'mysql'
  - 'database'
difficulty: 'beginner'
title: 'MySQL 数据类型与约束'
module: 'mysql'
category: 'MySQL Basics'
description: '数值、字符串、日期类型及主键、外键、唯一约束。'
author: 'Anonymous'
---

## 目录

1. [数据类型选择原则](#数据类型选择原则)
2. [数值类型](#数值类型)
3. [字符串类型](#字符串类型)
4. [日期与时间](#日期与时间)
5. [JSON 类型](#json-类型)
6. [字符集与排序规则](#字符集与排序规则)
7. [约束](#约束)
8. [建表示例](#建表示例)

---

## 1. 数据类型选择原则 (Selection Principles)

核心目标：

- 正确表达业务含义（语义清晰）
- 保证数据完整性（约束与校验）
- 兼顾性能与存储成本（索引友好、空间可控）
  实践要点：
- 能用更小的类型就不用更大类型（但不要牺牲语义）
- 经常参与过滤/排序/Join 的列优先选择“可索引且稳定”的类型
- 避免把结构化字段塞进一个字符串里（除非确实是原始文本）

## 2. 数值类型 (Numeric)

### 2.1 整数

常用：`TINYINT`、`INT`、`BIGINT`
实践建议：

- 业务自增主键常用 `BIGINT`（预留增长空间）
- 状态枚举常用 `TINYINT`（配合业务层枚举）
- 需要非负时用 `UNSIGNED`

### 2.2 定点与浮点

- 金额优先用 `DECIMAL(p, s)`，避免浮点误差
- 测量数据/近似值可用 `DOUBLE`

## 3. 字符串类型 (String)

### 3.1 `CHAR` vs `VARCHAR`

- `CHAR(n)`：定长，适合长度固定的值（如国家码、短编码），更新更稳定
- `VARCHAR(n)`：变长，适合长度变化较大的值（如昵称、标题）
  实践建议：
- `VARCHAR` 不是越大越好，过大的上限会影响行格式与索引策略
- 经常参与索引的长文本字段慎用 `VARCHAR(1024+)`

### 3.2 `TEXT` 家族

用于长文本（文章内容、描述）。注意：

- `TEXT` 列通常不适合直接做常规索引（需要前缀索引或全文索引）
- `TEXT` 列会影响行存储与读取代价

## 4. 日期与时间 (Date & Time)

常用：`DATE`、`DATETIME`、`TIMESTAMP`

- `DATETIME`：范围大，存储不依赖时区转换（更“客观”）
- `TIMESTAMP`：存储与时区有关（读取/写入可能发生转换），范围较小
  实践建议：
- 业务“发生时间”通常用 `DATETIME`，统一用 UTC 或在应用层明确时区策略
- 保存“仅日期”用 `DATE`，避免在应用层反复截断

## 5. JSON 类型 (JSON)

MySQL 的 `JSON` 适合存放：

- 结构频繁变化的扩展字段
- 不适合拆表但需要一定结构的配置项
  注意：
- JSON 查询需要函数/生成列配合索引，否则易慢
- 不要用 JSON 替代关键业务字段（关键字段应拆列以便约束、索引与统计）

## 6. 字符集与排序规则 (Charset & Collation)

实践建议：

- 统一使用 `utf8mb4`
- 明确排序规则（collation），避免跨表/跨库比较时发生隐式转换

## 7. 约束 (Constraints)

### 7.1 `NOT NULL`

优先用 `NOT NULL` 来表达“必填”。配合默认值要谨慎，确保默认值也符合业务语义。

### 7.2 `DEFAULT`

示例：

```sql
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

注意：不要用默认值掩盖业务层输入缺失，应区分“未知/未填”与“默认”。

### 7.3 `UNIQUE`

用于业务唯一性约束（如手机号、邮箱、业务单号）。
实践建议：

- 唯一约束应该从业务语义出发，而不是“为了查得快”
- 可组合唯一：例如 `(tenant_id, email)`

### 7.4 `PRIMARY KEY`

通常建议：

- 使用单列自增或雪花 ID 作为主键
- 避免使用可变业务字段（例如手机号）作为主键

### 7.5 `FOREIGN KEY`

MySQL 支持外键，但很多互联网业务会选择在应用层维护约束，原因包括：

- 高并发下跨表约束可能放大锁冲突
- 分库分表/异构存储下外键不可用
  是否使用外键取决于：
- 业务规模与一致性要求
- 团队治理与数据质量策略

## 8. 建表示例 (Example)

```sql
 CREATE TABLE user_account (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email)
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 更新日志 (Changelog)

- 2026-04-06: 新增「数据类型与约束」知识点，补全类型选择与约束实践
