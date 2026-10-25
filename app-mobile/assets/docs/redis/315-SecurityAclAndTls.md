---
order: 380
title: 安全：ACL 访问控制与 TLS 加密
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 6+ ACL 用户体系（用户、密码、键模式、命令类别）、ACL LOG 审计与最小权限清单、TLS 加密链路（客户端/复制/集群 mTLS）。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Redis 的两大安全面——ACL（Authentication & Authorization，Redis 6.0 起内建的多用户访问控制）与 TLS（传输加密，覆盖客户端连接、主从复制、集群总线三条链路）。
- **解决什么问题**：让「一个应用一个账号、按业务线限权」成为原生能力，替代「全库共享一个 requirepass」的粗放模式；让 ACL 违规可审计可告警；让公网/跨机房链路上的数据与凭据不再明文传输。
- **什么时候用到**：给报表/BI 系统开只读账号；多团队共用一个 Redis 实例时按前缀隔离；外网或不可信网络中部署、副本跨机房同步、云上安全合规扫描要求传输加密。

前置：了解 redis.conf 基本结构；生产实例至少已在用单密码（`requirepass`），本文从那里讲起。

## 1. 心智模型：从「一把大门钥匙」到「门禁系统」

Redis 6 之前的安全模型只有一把大门钥匙：`requirepass` 设置一个密码，知道的人对整个实例有全权（连 `FLUSHALL`、`CONFIG SET` 都能跑）。ACL 把模型升级为：

```
用户 = 密码（可多个） + 命令白名单 + 键模式 + 频道模式 + on/off 状态
```

一句话模型：**ACL 回答的是「谁（user）、用什么密码、能跑哪些命令、碰哪些键、订阅哪些频道」这五个问题的组合**。默认用户 `default` 兼容旧行为——只配 `requirepass` 时，等价于只给 `default` 设了密码并放开全部权限。

与「外置代理做权限」相比，内建 ACL 的优势：零额外组件、命令级粒度（代理只能拦连接拦不准 MULTI 排队的命令）、性能无损。劣势：ACL 不做行级/值级脱敏（键内值的内容它管不着），需要值级安全时仍要应用层加密。

## 2. ACL 命令与语法

（本节内容承接自原《缓存策略与高级特性》ACL 一节，全部保留并扩写讲解。）

```bash
# 查看所有用户
ACL LIST

# 添加用户
ACL SETUSER app_readonly on >ReadPass123 ~* +@read
# on: 启用  >密码  ~*: 所有键  +@read: 只读命令

ACL SETUSER app_write on >WritePass123 ~orders:* +@read +@write -@dangerous
ACL SETUSER admin on >AdminPass123 ~* +@all

# 命令类别
+@read       # 所有读命令
+@write      # 所有写命令
+@string     # String 命令
+@hash       # Hash 命令
+@list       # List 命令
+@set        # Set 命令
+@sortedset  # ZSet 命令
+@pubsub     # Pub/Sub 命令
-@dangerous  # 排除危险命令（FLUSHALL/CONFIG等）

# 键模式
~*           # 所有键
~user:*      # 仅 user: 前缀
~order:* ~product:*  # 多个模式

# 禁用危险命令
ACL SETUSER app_readonly -@dangerous -FLUSHALL -FLUSHDB -CONFIG -DEBUG
```

规则语法的心智模型是「**从零开始，逐条叠加**」：每个 SETUSER 规则按书写顺序累加，`+` 加权限、`-` 减权限。所以 `-@dangerous -FLUSHALL` 里第二条其实是冗余的（FLUSHALL 本就在 dangerous 类别中），但显式写出来有自文档价值。

`ACL SETUSER` 的增量语义要特别注意：**重复对同一用户执行 SETUSER 是修改不是覆盖**。清空重来用 `ACL DELUSER <name>` 后重建，或 `ACL SETUSER <name> reset`（重置该用户全部规则）。想一次性原子地定义完整用户，把规则写成一行即可——SETUSER 单条命令内多段规则是原子生效的。

密码的两种写法：`>password` 是明文（ACL LIST/GETUSER 里会显示哈希）；更安全的是先算哈希再写入：

```bash
# 用任意 Redis 4+ 实例算哈希（SHA256）
echo -n "ReadPass123" | sha256sum
# 或者：ACL SETUSER app_readonly #<sha256哈希>   ← # 前缀表示密码已哈希
ACL SETUSER app_readonly on #a665a...~* +@read
```

**易错点**：`nopass` 标志会让用户免密登录，配了密码又写了 `nopass`，密码全部作废——这是 ACL LIST 排查「明明设了密码怎么不用密码也能连」的第一嫌疑。

### 2.1 查看与验证

```bash
ACL LIST                    # 全部用户的规则串
ACL GETUSER app_readonly    # 结构化查看单个用户（flags/密码哈希/命令/键/频道）
ACL WHOAMI                  # 当前连接是什么用户（调试用）
AUTH app_readonly ReadPass123   # 多用户后 AUTH 要带用户名
```

客户端连接方式随之变化：单密码时代 `redis-cli -a oldpass`，多用户后是 `redis-cli --user app_readonly --pass ReadPass123`。redis-py 对应 `redis.Redis(username="app_readonly", password="...")`。**易错点**：老版本客户端库只发 `AUTH <password>`（不含用户名），会被当作 default 用户的密码——连接成功但身份不对，权限报错时先 `ACL WHOAMI` 确认身份。

### 2.2 频道权限（Pub/Sub 资源管控）

Redis 6.2+ 把 Pub/Sub 频道也纳入 ACL：`&channel` 模式控制可订阅/可发布的频道。不给用户配任何 `&` 规则时，该用户默认**没有**任何频道权限（注意与键权限 `~*` 默认全开的差异）。

```bash
ACL SETUSER notifier on >Np123 ~* &order:* +publish
# 只允许向 order:* 频道发布，不能订阅、不能碰其他频道
```

## 3. ACL 持久化与运行时管理

（承接自原《缓存策略与高级特性》，全部保留。）

```bash
# 保存 ACL 到文件
ACL SAVE

# redis.conf 配置
aclfile /etc/redis/users.acl

# 加载 ACL 文件
ACL LOAD
```

三者的关系与坑：

- `ACL SAVE` 把内存中的用户写进 `aclfile` 指定的文件；没配 `aclfile` 时，规则被写回 redis.conf（Redis 7+ 行为）。
- `ACL LOAD` 从 aclfile 重读，**覆盖内存状态**；文件语法错误时 LOAD 失败且不改动现状，可以放心在低峰执行。
- 直接编辑 users.acl 文件不会自动生效，必须 `ACL LOAD`；运行时 SETUSER 的改动不 SAVE 就会在重启后丢失——把「改 ACL」做成工单流程时，最后一步固定是 `ACL SAVE`。

**易错点**：`aclfile` 与 redis.conf 里的用户配置二选一，同时使用时 LOAD 会报错「conf 和 aclfile 冲突」。

## 4. ACL LOG：让违规可审计

ACL 内建了违规日志：任何被 ACL 拒绝的命令（命令不在白名单、键不匹配模式、频道不匹配、认证失败）都会记入 ACL LOG，这是构建「最小权限持续校准」闭环的基础数据。

```bash
ACL LOG          # 查看最近 128 条（上限可配 acl-pubsub-default 无关，默认 128 条）
# 1) 1) (integer) 12            # 序号
#    2) (integer) 1728200000    # Unix 时间戳
#    3) "app_readonly"          # 用户名
#    4) "SET"                   # 被拒绝的命令
#    5) "user:1001"             # 尝试访问的对象（键/频道）
#    6) "192.168.1.50:51234"    # 客户端来源
#    7) "key"                   # 拒绝原因：key/command/channel/auth

ACL LOG RESET    # 清空
```

运维节奏建议：把 `ACL LOG` 接进巡检脚本，出现 `reason:command` 或 `reason:auth` 的条目即时告警——前者是权限清单落后于代码（应用新上了命令），后者可能是撞库或配置错乱的前兆。

### 4.1 最小权限清单（上线前逐条自查）

1. **每个应用独立用户**，禁止多应用共用 default 或同一个业务账号；
2. **命令类别从零起配**：业务账号基线 `+@read +@write -@dangerous`，而不是 `+@all` 再去减；
3. **键模式绑定业务前缀**：`~apporder:*`，禁止 `~*`；键前缀规划在前（参考 redis/020-KeyManagement 的键命名），ACL 在后兜底；
4. **危险命令双重保险**：账号级 `-@dangerous`，再加 rename-command 兜底（`rename-command FLUSHALL ""`，config 层面直接废掉）；
5. **报表只读账号**：`+@read +@connection -@dangerous`，且不给 `+@write`；需要 SCAN/KEYS 类巡检命令时显式 `+scan +dbsize +info`；
6. **密码哈希管理**：SETUSER 只写 `#<sha256>` 形式，明文不出现在任何配置与工单里；
7. **default 用户收敛**：`ACL SETUSER default off`（管理面走独立 admin 账号），或至少 `-@dangerous`；
8. **ACL LOG 告警**接入监控，连续 auth 失败触发告警。

## 5. TLS 加密

（承接自原《缓存策略与高级特性》TLS 一节，全部保留并扩写。）

```ini
# redis.conf
tls-port 6380
tls-cert-file /etc/redis/tls/server.crt
tls-key-file /etc/redis/tls/server.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# 客户端认证
tls-auth-clients optional    # no/optional/yes

# 复制 TLS
tls-replication yes

# 集群 TLS
tls-cluster yes
```

```bash
# 客户端 TLS 连接
redis-cli --tls --cert client.crt --key client.key --cacert ca.crt -p 6380

# 从节点 TLS 复制
replicaof 192.168.1.10 6380
tls-replication yes
```

逐项拆解：

- `tls-port 6380` 与明文 `port 6379` **可以并存**（TLS 开启不自动关闭明文端口）。迁移期双端口并存、观察 `INFO stats` 的 `tls_accepted_conns` 稳定后再 `port 0` 关闭明文——直接一步切 TLS 是常见的「改完连不上」事故来源。
- `tls-auth-clients yes` 要求客户端出示证书（mTLS）；`optional` 时有证书则校验、无证书也能连（靠 AUTH 密码）；`no` 只加密不验客户端身份。生产建议 `yes`，把「网络可达」与「身份可信」同时收口。
- `tls-replication yes` 让主从同步走 TLS（从节点的 `masterauth` 照常生效，加密与认证是两层）；
- `tls-cluster yes` 加密集群总线（节点间 Gossip + 槽迁移），不开它时集群内部流量仍明文——跨可用区/跨机房部署必须开。

### 5.1 用 redis-cli 快速生成自签证书（实验环境）

```bash
# 正式环境用企业 CA；实验环境可以自签
openssl req -x509 -newkey rsa:4096 -nodes -days 365 \
  -keyout ca.key -out ca.crt -subj "/CN=fandex-test-ca"
openssl req -newkey rsa:4096 -nodes \
  -keyout server.key -out server.csr -subj "/CN=redis-node1"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -days 365 \
  -out server.crt
```

自签证书只用于本机学习：生产上证书轮换、CRL/OCSP、SAN 匹配主机名这些事情自签都照顾不了，交给企业 PKI。

**易错点**：证书 SAN（Subject Alternative Name）里没有客户端连接用的主机名时，客户端严格校验会握手失败（报 certificate verify failed），而 `-insecure` 类开关一开又变成「加密但不防中间人」——证书签发时就把所有节点 IP/主机名写进 SAN 列表。

## 6. 工程场景一：只读报表账号

需求：BI 系统直连 Redis 拉聚合数据做日报，要求：只能读、不能写、不能碰管理命令、只允许访问 `stats:*` 前缀。

```bash
ACL SETUSER bi_report on '>Bi#2024!' '~stats:*' '~agg:*' +@read +@connection -@dangerous
```

逐段讲：`~stats:*` `~agg:*` 把键范围锁死，报表误配置的 SQL 式全表扫描最多伤到这两个前缀；`+@read` 涵盖 GET/MGET/HGETALL/ZRANGE 等；`+@connection` 是必须显式加的——AUTH/PING/QUIT 等连接管理命令不在 read 类别里，漏加会导致客户端握手期就断连（报错 NOPERM）；`-@dangerous` 从 read 里再减掉 CONFIG/DEBUG 等被划进危险类的读性命令。

上线后用 ACL LOG 验证：跑一遍报表任务，`ACL LOG | grep bi_report` 应该为空；有条目就说明权限清单缺命令，按日志补。

## 7. 工程场景二：按业务线分用户限权

需求：订单、库存、营销三个团队共用一套 3 主 3 从集群，要求互相不能读写对方的键，且任何一个团队都不应有集群管理权限。

```bash
# 各业务线用户（键模式 + 业务前缀绑定）
ACL SETUSER team_order  on >O#Pass1 '~{order}:*'  +@read +@write -@dangerous
ACL SETUSER team_stock  on >S#Pass1 '~{stock}:*'  +@read +@write -@dangerous
ACL SETUSER team_market on >M#Pass1 '~{market}:*' +@read +@write -@dangerous

# 集群管理只给运维
ACL SETUSER ops_cluster on >Op#Pass1 '~*' +@all
```

设计意图：键前缀里的 `{order}` 既是 Hash Tag（保证业务内多键同槽，见 redis/220-RedisClusterHashSlot）又天然成为 ACL 的键模式边界，一鱼两吃——这就是「键命名规范先行」的回报。

多用户上集群的两个注意点：其一，ACL 规则通过 `CLUSTER ADDSLOTS` 之外的方式在每个节点独立生效，`ACL SAVE` 只写当前节点，**要在所有主节点执行或用配置管理工具下发**（Redis 7.4+ 的 `--cluster` 工具尚未统一 ACL 分发，这步必须进发布脚本）；其二，Pub/Sub 若在用，按业务线补 `&order:*` 等频道规则，否则默认无频道权限会让订阅报错。

## 8. 工程场景三：内网节点间 mTLS

需求：Redis 部署在两个 VPC（主从跨机房同步），安全要求：所有传输加密、节点间互验身份、客户端双向认证。

```ini
# 主节点（机房 A）
port 0                      # 关闭明文
tls-port 6379
tls-cert-file /etc/redis/tls/nodeA.crt
tls-key-file /etc/redis/tls/nodeA.key
tls-ca-cert-file /etc/redis/tls/internal-ca.crt
tls-auth-clients yes        # 客户端必须带证书（含从节点）
tls-replication yes
tls-cluster yes             # 若为集群

# 从节点（机房 B）
port 0
tls-port 6379
tls-cert-file /etc/redis/tls/nodeB.crt
tls-key-file /etc/redis/tls/nodeB.key
tls-ca-cert-file /etc/redis/tls/internal-ca.crt
tls-auth-clients yes
replicaof 10.8.0.10 6379
masterauth "MasterPass123"
tls-replication yes
```

验证链路是否真的加密：`INFO` 里看 `tls_accepted_conns`（TLS 连接数）应等于 `total_connections_received` 减运维通道；抓包验证可以 `tcpdump -i any port 6379 -A` 确认载荷已不可读。

**易错点一**：从节点自己同时是「服务端」（接受客户端连接）与「客户端」（向主节点发起复制）双重身份，两份证书语义都要配——`tls-cert-file` 对应它作为服务端出示的身份，向主节点复制时它同样出示这张证书，主节点的 `tls-auth-clients yes` 校验的就是它。

**易错点二**：哨兵（Sentinel）也有自己的 TLS 配置项（`sentinel tls-*` 系列），只改数据节点的 TLS 不改哨兵，会出现「数据链路加密成功、哨兵探测明文失败」的混合态故障，迁移时把哨兵纳入同一批变更。

## 9. 动手实践

任务一：搭一个最小 ACL 体系。创建 `app_demo`（读写 `demo:*`、禁危险命令）与 `auditor`（只读全部键），分别用 redis-cli 以两个身份连接验证：auditor 跑 `SET` 应报 NOPERM，app_demo 跑 `FLUSHDB` 应报 NOPERM。

<details>
<summary>任务一参考命令序列</summary>

```bash
ACL SETUSER app_demo on >Demo123 '~demo:*' +@read +@write -@dangerous +@connection
ACL SETUSER auditor on >Audit123 '~*' +@read +@connection -@dangerous

redis-cli --user app_demo --pass Demo123 SET demo:1 ok        # OK
redis-cli --user app_demo --pass Demo123 FLUSHDB              # NOPERM
redis-cli --user auditor --pass Audit123 GET demo:1           # "ok"
redis-cli --user auditor --pass Audit123 SET demo:2 x         # NOPERM
```

注意两个用户都加了 `+@connection`：没有它，客户端在 AUTH 之后的第一条命令就可能被拒（部分客户端握手期发 SELECT/CLIENT SETINFO）。
</details>

任务二：阅读并解读 ACL LOG。用 auditor 身份故意 `SET demo:x 1`，然后 `ACL LOG` 查看该条目的 reason 字段应为 `command`，对象字段为 `SET`。

<details>
<summary>任务二参考观察</summary>

条目形如 `... auditor SET demo:x <ip> command`。reason 取值有 `command`（命令不在白名单）、`key`（键不匹配 ~ 模式）、`channel`、`auth`（认证失败）。巡检脚本可以按 reason 分组计数：`auth` 激增重点查撞库，`key`/`command` 激增重点查应用发布是否引入了未授权用法。
</details>

任务三：本地起一个 TLS 实验实例（自签证书 + `tls-port 6380`），分别用 `redis-cli --tls -p 6380`（带证书）与 `-p 6379`（若明文端口未关）连接，执行 `INFO` 对比 `tls_accepted_conns`；随后把 `port 0` 配置生效，确认明文连接被拒。

<details>
<summary>任务三参考要点</summary>

关键观察：`port 0` 后明文端口的 TCP 连接能建立但立即被关（不是端口未监听）；`INFO server` 中 `tcp_port` 显示的是 TLS 端口。常见失败：`--tls` 忘带 `--cacert` 时报自签名证书不受信，需要加 `--insecure` 才能连——生产环境禁止 `--insecure`，正确做法是签发包含正确 SAN 的证书。
</details>

## 10. 下一步与延伸阅读

- 《客户端连接、RESP 协议与 CLIENT 命令》（redis/305-RespProtocolAndClientConnections）：ACL 拒绝在协议层的表现与连接排障；
- 《发布订阅与客户端缓存》（redis/115-PubSubAndClientCaching）：本文 `&` 频道权限管控的对象；
- 《键管理与过期策略》（redis/020-KeyManagement）：键前缀规划是 ACL 键模式的前提。

## 参考与致谢

- Redis 官方文档 ACL：<https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl>（Redis Public Source License / CC-BY-SA 4.0 授权文档），规则语法、ACL LOG 与 aclfile 章节；
- Redis 官方文档 TLS：<https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption>（同上许可），tls-port/tls-auth-clients/tls-replication 配置说明；
- 本篇正文为教学重写，命令与配置项以官方文档为准。
