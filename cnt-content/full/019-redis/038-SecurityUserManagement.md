---
order: 380
title: 安全与用户管理
module: 'redis'
category: 数据库
difficulty: intermediate
description: 认证、角色与最小权限：把数据库的门锁好。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'redis/035-SchemaDesignEnterprise'
prerequisites:
  - 'redis/031-MongoDBOverviewQuickStart'
---

## 0. 把数据库的门锁好（先读这里）

> 学习目标：给一台新装的 MongoDB 打开访问控制并创建首位管理员；按最小权限为应用与报表场景分别建号并验证权限边界；会配置 bindIp 与 TLS；能识别六类常见安全反模式并完成一次自查。

MongoDB 历史上最惨烈的安全事故不是技术缺陷，而是配置问题：成千上万台不做认证、直接绑公网的 mongod 被扫到后勒索删库。数据库安全的多数工作其实是"把默认该开的开关打开、把不该开的大门关上"。这一篇按"访问控制、账号与角色、网络、加密审计、反模式自查"的顺序，把门锁好。

## 1. 安全清单总览

| 层面 | 要做的事 |
| --- | --- |
| 访问控制 | 开启 `authorization`，创建首位管理员，禁止裸奔 |
| 账号 | 每个应用独立账号、最小权限，root 只留给人，不进应用配置 |
| 网络 | `bindIp` 只绑内网地址，防火墙 / 安全组收紧，绝不暴露公网 |
| 传输 | 客户端与节点间启用 TLS |
| 存储 | 静态加密（商业版能力）或磁盘层加密；超敏感字段用字段级加密 |
| 审计 | 记录认证与 DDL 事件（企业版 / Atlas 能力） |
| 运维 | 跟进安全补丁与官方安全通告 |

这份清单对应官方 Security Checklist 的思路。下面逐层落地。

## 2. 开启访问控制：localhost exception 与首位管理员

```yaml
# /etc/mongod.conf 关键片段
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod   # Linux 让配置生效（也可用命令行参数 --auth 启动）
```

**localhost exception**：实例上还没有任何用户时，允许来自本机的连接创建第一个用户——这是"没有用户就无法登录、无法登录就无法建用户"死结的官方解法。这个窗口只维持到第一个用户创建成功，随后立即关闭，因此必须在本机上完成下面的操作。

```javascript
// 重启后在本机直连（mongosh 默认连 127.0.0.1:27017，此时无需认证）
use admin
db.createUser({
  user: "admin",
  pwd: "请改成高强度随机密码",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" }  // 用户管理员：只管账号与角色，不碰业务数据
  ]
})
```

```javascript
// 此后所有连接都必须认证；用新账号登录验证
db.auth("admin", "请改成高强度随机密码")
```

**讲解：**

1. 首位管理员的最佳实践是只授予 `userAdminAnyDatabase`——它能创建与管理用户，但读不到业务数据；这样即使 admin 账号泄露，攻击者还差一层。
2. 不在首位管理员上直接给 `root` 的理由：权限一旦给出去就很难收回，"高权限账号只管人"是分权的第一步。
3. 如果重启后发现本机也要密码——那说明库里已有用户，localhost exception 已关闭，走正常认证即可。

## 3. SCRAM 认证与 createUser

MongoDB 默认使用 **SCRAM**（当前默认机制为 SCRAM-SHA-256）质询-响应认证：密码以加盐哈希形式存在 admin 库中，认证过程不在网络上传输明文密码（跨不可信网络仍应配合 TLS）。

```javascript
use appdb
// 给应用创建业务账号：只对 appdb 有读写权限
db.createUser({
  user: "app_writer",
  pwd: "另一个高强度密码",
  roles: [ { role: "readWrite", db: "appdb" } ]
})

// 查看库内用户与角色
db.getUsers()
```

```javascript
// 日常运维三件套
db.changeUserPassword("app_writer", "新密码")  // 改密（疑似泄露时第一步）
db.updateUser("app_writer", { roles: [ ... ] }) // 调整角色
db.dropUser("app_writer")                       // 离职 / 下线时回收
```

应用连接串的写法——账号建在哪个库，`authSource` 就指向哪个库：

```bash
# 业务账号建在 appdb，认证库就是 appdb
mongosh "mongodb://app_writer:密码@127.0.0.1:27017/appdb?authSource=appdb"
```

**讲解：** `authSource` 是新手最常踩的坑：账号建在 `admin` 库而连接串没写 `authSource=admin`（或反之），报的是"认证失败"，实际是"找错了验证库"。

## 4. 内置角色体系速查

| 分组 | 角色 | 能力摘要 |
| --- | --- | --- |
| 数据库用户 | `read` / `readWrite` | 读 / 读写指定库的集合数据 |
| 数据库管理 | `dbAdmin` | 索引、统计、校验等库级管理（不含数据读写） |
| | `dbOwner` | dbAdmin + readWrite + userAdmin，单库全权 |
| | `userAdmin` | 管理该库的用户与角色 |
| 集群管理 | `clusterMonitor` | 只读监控，Compass、监控 Exporter 用它 |
| | `clusterManager` / `clusterAdmin` | 副本集与分片的管理 / 全权 |
| 备份恢复 | `backup` / `restore` | 导出 / 导入，备份专用账号 |
| 全库角色 | `readAnyDatabase` 等 | 所有库的读 / 写 / 管理，仅能在 admin 库授予 |
| 超级用户 | `root` | 全权，只应属于人类管理员 |

**用角色的三句口诀：**

1. 应用账号给 `readWrite`（很多场景其实只需要 `read`）。
2. 监控系统给 `clusterMonitor`，不要为了看个状态给 `root`。
3. DBA 按需组合 `dbOwner` / `clusterAdmin`，`root` 不进任何应用配置文件。

## 5. 自定义角色与最小权限

内置角色有时仍然太粗：报表机器人需要"只读订单、可写报表结果"，`readWrite` 给多了，`read` 又不够。这时用 `createRole` 精确裁剪：

```javascript
use appdb
db.createRole({
  role: "reportReader",
  privileges: [
    { resource: { db: "appdb", collection: "orders" },  actions: [ "find" ] },          // 只能查订单
    { resource: { db: "appdb", collection: "reports" }, actions: [ "find", "insert" ] } // 可写报表结果
  ],
  roles: []  // 不继承任何内置角色，权限就这么多
})
db.createUser({ user: "report_bot", pwd: "第三把密码", roles: [ "reportReader" ] })
```

```javascript
// 用 report_bot 登录后验证权限边界
db.orders.find().limit(1)             // 正常返回
db.orders.insertOne({ cheat: true })  // 报 unauthorized，符合预期
db.runCommand({ connectionStatus: 1, showPrivileges: true })  // 查看当前连接的真实权限
```

**讲解：**

1. `resource` 支持三种粒度：`{ db, collection }` 集合级；`collection: ""` 该库全部集合；`{ cluster: true }` 集群级动作（如查看服务器状态）。
2. `actions` 是细粒度的动作白名单（`find`、`insert`、`createIndex` 等），以官方文档的 actions 清单为准。
3. 最小权限的三问自检：这个账号不做的事会不会被误授权？它的权限还能不能再小？一旦泄露，影响面有多大？

## 6. 网络层：bindIp、TLS 与副本集内部认证

**bindIp**：mongod 默认只绑 `127.0.0.1`，这是安全的默认值。需要远程访问时显式列出内网地址，永远不要在无认证的情况下绑 `0.0.0.0`。

```yaml
net:
  port: 27017
  bindIp: 10.0.1.5,127.0.0.1   # 只绑内网网卡与本地回环，配合防火墙 / 安全组
```

**TLS 传输加密**：

```yaml
net:
  tls:
    mode: requireTLS                    # 强制所有连接走 TLS
    certificateKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
```

```bash
# 客户端连接同样要带 TLS 参数
mongosh --tls --host mongodb.example.com --tlsCAFile /etc/ssl/ca.pem -u admin -p
```

**副本集内部认证**：节点之间互访也要认证，用共享密钥文件：

```yaml
security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile   # 节点间共享密钥；文件权限 400，仅 mongod 用户可读
```

**讲解：** 配置 `keyFile` 会隐含开启访问控制——副本集环境下"忘了开认证"并不少见，keyFile 一并解决。云上部署优先用安全组白名单兜底：即使配置失误，公网也进不来。

## 7. 加密与审计概述

**静态加密**：WiredTiger 存储引擎的静态加密是商业版本（Enterprise / Atlas）能力，主密钥可接入 KMIP / KMS 管理；社区版的等价做法是磁盘或文件系统层加密。两者保护的都是"物理介质被拿走"的场景。

**字段级加密**：身份证、手机号这类字段，可在驱动层做客户端字段级加密（CSFLE）或新版本的 Queryable Encryption；自动加密依赖商业版本，手动方案社区可用，细节以官方文档为准。

**审计**（auditLog）为 Enterprise / Atlas 能力，记录认证、建删用户、删集合等敏感事件：

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: [ "authenticate", "createUser", "dropUser", "dropCollection" ] } }'
```

**讲解：** 加密与审计属于"业务长大后再逐层加固"的部分，但清单里要有它们的位置——安全不是一次性的开关，而是随规模升级的分层防线。

## 8. 常见安全反模式与自查

| 反模式 | 风险 | 修复 |
| --- | --- | --- |
| 无认证裸奔 | 公网可扫到，历史上大规模勒索删库的根源 | `authorization: enabled` + 首位管理员 |
| root 满天飞 | 应用被拖库即全库沦陷，误操作无法限权 | 分账号 + 最小权限角色 |
| `bind_ip 0.0.0.0` 且无防火墙 | 数据库直接暴露公网 | 只绑内网 + 安全组白名单 |
| 跨网段明文传输 | 中间人窃听账号与数据 | `requireTLS` |
| 密码硬编码进仓库 | 代码泄露即事故，换密码要发版 | 环境变量 / 密钥管理服务 |
| 全员共用一个账号 | 无法审计到人、无法精细回收 | 一人一号、一应用一号 |

```javascript
// 三条自查命令，巡检时各跑一遍
db.runCommand({ connectionStatus: 1, showPrivileges: true })  // 当前连接是谁、有什么权限
db.getUsers()     // 有没有多余、过期、权限过大的账号
db.currentOp(true) // 有没有来源可疑的连接
```

**讲解：** 安全事故复盘里反复出现同一句话："我们以为内网是安全的"。公网暴露 + 无认证的组合能在几小时内丢掉整个数据库，而修复只需要本篇第二节十分钟。

## 小结与延伸

> 门锁好的三步：开认证、给最小权限、别暴露公网；TLS、加密、审计随业务长大逐层加固。

收工自查清单：

1. 首位管理员用 `userAdminAnyDatabase`，在 localhost exception 窗口内本机创建。
2. 业务账号 `readWrite`、监控 `clusterMonitor`、备份 `backup/restore`、`root` 只给人。
3. 会用 `createRole` 按 `{ db, collection, actions }` 裁剪权限，并用 `connectionStatus` 验证。
4. `bindIp` 只绑内网，副本集配 keyFile，跨网段上 TLS。
5. 三条自查命令纳入巡检：`connectionStatus`、`getUsers`、`currentOp`。

延伸阅读：安装与首次连接见 `001-MongoDBOverviewQuickStart`；生产落地全景见 `005-SchemaDesignEnterprise`；副本集的 keyFile 内部认证配合 `007-ReplicaSetSharding` 一起读。官方文档关键词：Security Checklist、Authentication、Built-in Roles、TLS，具体配置项以官方文档为准。
