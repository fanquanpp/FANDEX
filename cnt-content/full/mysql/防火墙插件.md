---
order: 89
title: 防火墙插件
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL企业防火墙插件：SQL白名单、学习模式、拦截模式与SQL注入防护
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/账户与权限管理
  - 'mysql/SSL-TLS加密'
  - mysql/InnoDB体系架构
  - mysql/数据加密
prerequisites:
  - mysql/语法速查
---

## 1. MySQL 企业防火墙

MySQL Enterprise Firewall 记录正常SQL模式，拦截异常SQL，防止SQL注入。

## 2. 安装与配置

```sql
-- 安装防火墙插件
INSTALL PLUGIN mysql_firewall SONAME 'mysql_firewall.so';
INSTALL PLUGIN mysql_firewall_users SONAME 'mysql_firewall.so';
INSTALL PLUGIN mysql_firewall_whitelist SONAME 'mysql_firewall.so';

-- 创建防火墙用户
CREATE USER 'fw_user'@'%';
CALL mysql.sp_set_firewall_mode('fw_user@%', 'RECORDING');
```

## 3. 三种模式

| 模式       | 说明                       |
| ---------- | -------------------------- |
| RECORDING  | 记录SQL模式，建立白名单    |
| PROTECTING | 允许白名单SQL，拦截异常SQL |
| DETECTING  | 允许所有SQL，记录异常SQL   |

```sql
-- 学习模式：记录正常SQL
CALL mysql.sp_set_firewall_mode('fw_user@%', 'RECORDING');
-- 执行正常业务SQL...

-- 切换到保护模式
CALL mysql.sp_set_firewall_mode('fw_user@%', 'PROTECTING');

-- 检测模式（不拦截，只记录）
CALL mysql.sp_set_firewall_mode('fw_user@%', 'DETECTING');
```

## 4. 查看防火墙状态

```sql
-- 查看用户防火墙模式
SELECT * FROM mysql.firewall_users;

-- 查看白名单规则
SELECT * FROM mysql.firewall_whitelist;

-- 查看拦截统计
SELECT * FROM performance_schema.firewall_status;
```
