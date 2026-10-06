---
order: 360
title: 客户端连接、RESP 协议与 CLIENT 命令
module: 'redis'
category: 数据库
difficulty: beginner
description: RESP2/RESP3 线协议格式、连接池参数对线上抖动的影响、CLIENT LIST/KILL/SETNAME/INFO 与 NO-EVICT 排障，附连接池耗尽事故复盘、僵死连接清理、telnet 手写 RESP 三个场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Redis 客户端层——RESP 线协议（RESP2/RESP3）、连接管理（连接池参数）、CLIENT 命令族排障。
- **解决什么问题**：看懂客户端与服务端之间到底在传什么字节；解释「命令本身很快但接口就是慢」的连接池类事故；定位与清理僵死连接、控制服务端连接上限。
- **什么时候用到**：接口超时但 SLOWLOG 干净时；客户端库调参时；排查「连接数异常」类告警；理解 pubsub push、RESP3 特性等协议行为时。

前置：会基本命令与 SLOWLOG（redis/320-LatencyObservabilityAndSlowlog）；本篇与它分工——那边看「命令内」耗时，这边看「命令外」的连接与协议层。

## 1. RESP：Redis 与客户端之间的「普通话」

RESP（REdis Serialization Protocol）是 Redis 的线协议。一条命令的往返就是「客户端发 RESP 请求、服务端回 RESP 响应」。理解它的最大收益：任何客户端库的诡异行为（慢、断连、消息格式怪异），抓包看一眼 RESP 就真相大白。

### 1.1 RESP2 的五种类型标记

RESP2 用**首字节标记类型**，其余是数据：

```
+OK\r\n                    简单字符串（Simple String）：状态回复
-ERR unknown command\r\n   错误（Error）：以 - 开头的错误消息
:1000\r\n                  整数（Integer）：INCR 等的返回
$6\r\nhello\r\n            批量字符串（Bulk String）：定长二进制；$-1 表示 NULL
*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n
                           数组（Array）：元素个数后跟各元素
```

客户端发命令不必手拼 RESP（inline 命令也接受），但响应就是上面这些字节。**空值协议**值得专门记：`$-1\r\n` 是「批量字符串 NULL」（键不存在），`*-1\r\n` 是「数组 NULL」（BLPOP 超时）——很多客户端 bug 报告的「返回了奇怪的东西」其实是这两种 NULL 没被正确区分。

### 1.2 RESP3 新增了什么

RESP3（Redis 6.0+，`HELLO 3` 切换）在 RESP2 之上加了几类类型，最重要的三个：

```
>4\r\n$9\r\ninvalidate\r\n...   Push（> 开头）：服务端主动推的消息
%2\r\n...                       Map（% 开头）：键值对类型
#t\r\n / #f\r\n                 Boolean（# 开头）
_ \r\n                          NULL（独立类型，不再借用 $-1）
```

- **Push 类型**是 CLIENT TRACKING 失效消息（redis/115 的 6.4 节）与 RESP3 Pub/Sub 消息的载体；RESP2 时代 push 消息只能伪装成普通回复或借用订阅通道，这是老客户端支持不佳的根源。
- RESP3 下 `HELLO 3` 握手时服务端还会返回一个 Map 类型的服务器信息（版本、模块等）。
- 兼容性：Redis 同时支持 RESP2 与 RESP3，不升级客户端不受影响；升级了客户端库但服务端太老（< 6.0），`HELLO 3` 会报错，好的客户端库会自动降级。

### 1.3 与 AOF 的呼应：协议即日志

Redis 的 AOF 文件内容就是**RESP 协议文本**（redis/160-AOFLogPersistence）。打开 `appendonlydir/incr*.aof` 文件你会看到：

```
*3\r\n$3\r\nSET\r\n$4\r\nkey1\r\n$5\r\nhello\r\n
```

这正是客户端发来的命令字节原样追加。理解了这一点，两件事豁然开朗：其一，AOF 重写是把内存数据「重新生成最小命令集」；其二，手写 RESP 会话（见第 4 节场景三）后你连 AOF 都能直接读。

## 2. 连接池参数：线上抖动最常见的隐形凶手

客户端库的连接池有四个参数决定生死（以 redis-py / Jedis / Lettuce 的对应项命名，概念通用）：

| 参数 | 含义 | 调错的症状 |
| :--- | :--- | :--- |
| max_total / max connections | 池内最大连接数 | 调小→获取等待超时；调大→打爆服务端 maxclients |
| max_idle / min_idle | 空闲连接上下限 | max_idle 过小→高峰反复建连，CPU 与延迟双抖 |
| max_wait / acquire timeout | 获取连接最长等待 | 过长→请求堆积雪崩；过短→毛刺误报 |
| socket timeout | 单命令读写超时 | 过短→正常慢命令被判死；过长→故障时线程全挂住 |

### 2.1 参数怎么算

一条经验公式（起步值，再压测校准）：

```
max_total ≈ 单实例峰值 QPS × 平均单命令耗时（秒） + 余量 30%
          ≈ 峰值并发中「同时在等 Redis 回复」的请求数

例：QPS 5000、平均命令耗时 1ms → 5000 × 0.001 × 1.3 ≈ 7 条/实例
   但注意多线程模型要乘线程数上限，且要为慢命令突刺留头寸
```

配套原则：

- **socket timeout 必须 > 最慢合法命令的耗时**（如有 50ms 的 Lua 脚本，超时至少 100ms），且**小于**下游用户的超时预算——让 Redis 层先失败，错误才能被上层捕获而不是把线程拖死。
- **获取超时（acquire）要远小于 socket timeout**（如 50ms vs 2000ms）：拿不到连接快速失败并告警，好过全链路排队。
- 池大小**不是越大越好**：服务端单实例 `maxclients` 默认 10000，200 个应用实例 × 50 连接 = 10000，直接触顶。连接是共享资源，按「每实例并发需要」配，不按「以防万一」配。

### 2.2 服务端的镜像参数

```ini
# redis.conf
maxclients 10000                       # 最大客户端连接数
timeout 0                              # 空闲连接保留秒数（0=永不踢）
tcp-keepalive 300                      # TCP 保活探测间隔（秒）
client-output-buffer-limit normal 0 0 0          # 普通客户端不限
client-output-buffer-limit pubsub 32mb 8mb 60    # 订阅客户端 32MB 硬限/8MB 60 秒软限
client-output-buffer-limit replica 256mb 64mb 60 # 复制客户端
```

`timeout` 的取舍：设 0（默认）时业务方漏关的连接会永远占着名额，最终 `rejected_connections` 告警；设 300 秒能自动回收泄漏，但会误杀「合法长空闲」（如夜间停流的连接池空闲连接）——池有 min_idle 心跳时设 300 更稳。`client-output-buffer-limit` 的含义与订阅者被踢的案例见 redis/115 第 3 节。

## 3. CLIENT 命令族：服务端的排障仪表盘

```bash
CLIENT LIST
# id=123 addr=192.168.1.50:51234 laddr=10.0.0.1:6379 fd=8 name=order-svc#1
# age=3600 idle=5 flags=N db=0 sub=0 psub=0 multi=-1 qbuf=26 qbuf-free=2048
# argv-mem=10 tot-net-in=0 tot-net-out=0 oll=0 omem=0 tot-mem=2048 rbs=1024
# rbp=0 obl=0 oll=0 events=r cmd=client|list user=default redir=-1 resp=2

CLIENT SETNAME order-svc#1        # 给连接起名（连接池每个连接都该有）
CLIENT GETNAME
CLIENT KILL ADDR 192.168.1.50:51234
CLIENT KILL ID 123
CLIENT NO-EVICT ON                # 把当前连接标记为「内存压力下不淘汰」
CLIENT UNPAUSE / CLIENT PAUSE 1000 WRITE   # 暂停客户端处理（运维窗口用）
```

`CLIENT LIST` 重点字段判读（按排障场景分组）：

- **定位连接是谁**：`name`（建议服务名+实例号，见第 6 节场景一）、`addr`、`user`（ACL 用户，redis/315）、`resp`（2 或 3）。
- **判断连接健康**：`age` 连接存活秒数、`idle` 空闲秒数——`age` 大 `idle` 大是正常空闲连接；`age` 大 `idle` 小是常驻业务连接；大量 `age` 很小的连接 = 短连接问题（`total_connections_received` 增速交叉验证）。
- **判断客户端读得慢不慢**：`qbuf` 输入缓冲（客户端发的命令还没执行完）异常大 = 服务端忙或客户端狂发；`oll`（输出大链表长度）与 `omem`（输出缓冲字节数）异常大 = **客户端收得太慢**，服务端在替它攒回复——omem 持续增长的连接就是「僵死连接」的直接证据。
- **判断卡在哪**：`cmd` 最近一条命令；`multi` 非 -1 表示在事务排队中；`flags` 里 `b` 表示被 BLPOP 等阻塞。

### 3.1 CLIENT KILL 的三种姿势

```bash
CLIENT KILL ADDR 10.0.0.5:51234    # 按地址杀（同一实例可能多条，要逐条）
CLIENT KILL ID 123                 # 按连接 id 杀（id 单调唯一，最精确）
CLIENT KILL USER app_order         # 按用户杀（Redis 6.2+，整个业务线连接全断）
CLIENT KILL LADDR 10.0.0.1:6379    # 按服务端本地地址杀（多端口实例用）
```

杀连接是**断开**不是封禁：客户端池发现连接死亡会自动重建。所以 KILL 是安全的排障手段——清掉僵死连接让它重建，比重启服务端温和得多。

### 3.2 CLIENT INFO 与 NO-EVICT

```bash
CLIENT INFO    # 只看当前连接自己的信息（脚本里免得 LIST 全量）
CLIENT NO-EVICT ON
```

`NO-EVICT`（Redis 7.0+）解决一个特定问题：`maxmemory` 触发键淘汰的同时，内存压力过大时 Redis 7 起还会**断开普通客户端连接**（`CLIENT FREE-OF...` 语义，防止内存被输出缓冲吃爆）——把关键连接（监控采集、哨兵之外的配置同步通道）标记 NO-EVICT 后，内存压力下 Redis 优先断别人不断你。普通业务连接不要乱开，否则内存压力时被保住的可能是拖累最大的那个。

## 4. 工程场景一：一次连接池耗尽引发接口超时的复盘

时间线（事故还原）：

```
10:02:10  运营后台触发一次全表导出，内部调用了一个 800ms 的 Lua 脚本
10:02:10  socket timeout 配置 200ms → 所有调用该脚本的请求「超时但脚本仍在服务端跑」
10:02:10  客户端池连接被这些挂起请求占满（max_total=20）
10:02:11  后续普通 GET/SET 请求「获取连接超时」（acquire=100ms）批量报错
10:02:12  错误向上传播，接口可用率从 100% 跌到 70%
10:02:40  导出脚本结束，连接陆续释放，可用率回升
```

排障过程（为什么 SLOWLOG 帮不上忙）：`SLOWLOG GET` 只有那几条 Lua 脚本记录（800ms 确实慢），但**普通 GET 明明 0.1ms 也报超时**——矛盾点指向「命令之外」。`CLIENT LIST` 显示 20 条连接 `cmd=evalsha`、`age` 都在涨；应用侧错误日志是 `connection acquire timeout`。结论：慢脚本吃掉池 + 超时参数失配的连环事故。

整改四条（对应第 2 节的参数原则）：

1. 慢脚本单独走**独立连接池**（隔离舱模式），业务池永远只跑快命令；
2. `socket timeout` 分池配置：业务池 200ms、脚本池 2000ms；
3. `acquire timeout` 降到 50ms + 获取失败快速告警（宁可快速失败不排队）；
4. 监控加「池活跃连接数 / max_total」水位线指标，85% 告警——事故前 10 分钟其实水位已经到顶。

## 5. 工程场景二：CLIENT KILL 清理僵死连接

背景：监控告警 `connected_clients` 缓慢爬升到 8000+，逼近 maxclients；`rejected_connections` 开始出现。应用侧连接池配置正常（每实例 30 × 40 实例 ≈ 1200 才对）。

定位：

```bash
CLIENT LIST | awk '{print $2}' | cut -d= -f2 | cut -d: -f1 | sort | uniq -c | sort -rn | head
# 5600 10.2.3.4        ← 某个出口 IP 占了 5600 条
CLIENT LIST | grep "10.2.3.4" | grep -c "idle=[0-9]\{4,\}"
# 5480                  ← 其中 5480 条 idle 超千秒：僵尸
```

判决：NAT 后面某个服务的连接池泄漏（代码里手动 new 了连接没还池）。两条修复路径并行：

```bash
# 服务端应急：按地址精准清理（分批，避免一次杀太多触发重连风暴）
CLIENT LIST | grep "addr=10.2.3.4" | grep "idle=[0-9]\{4,\}" \
  | awk '{print $2}' | cut -d= -f2 | head -500 \
  | xargs -I{} redis-cli CLIENT KILL ADDR {}
# 服务端兜底：timeout 300 让未来泄漏自动回收
CONFIG SET timeout 300
# 客户端根治：修池泄漏 + 池指标接入监控
```

分批杀的原因：一次杀几千条，客户端同时重建连接会形成重连风暴（新建连接要 AUTH + SELECT + 可能的 CLIENT SETNAME，瞬间又是一次压力）。每批 500、间隔几秒，是操作大连接数的安全节奏。

## 6. 工程场景三：telnet 手写 RESP 会话

需求：不依赖任何客户端库，用 telnet 直接和 Redis 说话——验证协议理解、排查「客户端库行为怪异」时也这么干。

```bash
telnet 127.0.0.1 6379
```

发一条 RESP2 格式的 `SET name hello`（`*3` 表示 3 个元素；每段 `\r\n` 结尾）：

```
*3\r\n$3\r\nSET\r\n$4\r\nname\r\n$5\r\nhello\r\n
+OK                         ← 服务端回复：简单字符串
```

再试几种：

```
*2\r\n$3\r\nGET\r\n$4\r\nname\r\n
$5\r\nhello\r\n             ← 批量字符串：定长 5 字节

*2\r\n$3\r\nGET\r\n$4\r\nnope\r\n
$-1\r\n                     ← Bulk NULL：键不存在

*2\r\n$4\r\nINCR\r\n$4\r\nname\r\n
-ERR value is not an integer or out of range    ← 错误回复

HELLO 3
%7\r\n$6\r\nserver\r\n$5\r\nredis\r\n...        ← RESP3 握手，返回 Map 类型
```

三个必会的观察点：其一，RESP 是**前缀长度**协议（`$5` 告诉你后面读 5 字节），所以值里可以含 `\r\n` 不用转义——这也是二进制安全的原因；其二，`$-1` 与空串 `$0\r\n\r\n` 是两回事，客户端库对两者的处理差异是历史 bug 重灾区；其三，`HELLO` 返回的 Map 里 `proto` 字段确认协议版本，`CLIENT LIST` 的 `resp` 列交叉验证。

实操完成后你还能反向读 AOF：把 `incr*.aof` 里的 RESP 记录逐段解码，就是「回放」了当时客户端发过的每条命令（redis/160 的 AOF 篇从这里再读一遍会更有感觉）。

## 7. 动手实践

任务一：完成第 6 节的 telnet 会话，并补两条：发送格式错误的 RESP（如 `*2\r\n$3\r\nGET\r\n`，声明 2 个参数只给 1 个），观察服务端返回的错误消息与连接状态；发送 inline 命令 `PING`（裸文本不带前缀），确认服务端兼容。

<details>
<summary>任务一参考观察</summary>

格式错误会收到 `-ERR Protocol error: expected '$', got ''` 之类消息且**连接立即被关**（协议错误视为客户端不可信）——这解释了为什么客户端库的序列化 bug 表现为「随机断连」。inline `PING` 返回 `+PONG`，inline 模式存在是为了 telnet 调试兼容，生产代码永远用 RESP 数组格式。
</details>

任务二：本机压一个连接池耗尽场景。用任意压测脚本（或 20 个并发线程调用一个 `sleep 1` 的 Lua 脚本），池 max_total=5、acquire=100ms；观察错误从「脚本超时」演变为「acquire timeout」的过程；随后 CLIENT LIST 观察连接的 cmd 与 age 分布。

<details>
<summary>任务二参考观察</summary>

前 5 个请求占满池，后续全部 acquire 失败，错误类型切换清晰可见；CLIENT LIST 里 5 条连接全部 `cmd=evalsha`、`multi=-1`。把脚本挪到独立池后业务池恢复正常——对应第 4 节的隔离舱整改。
</details>

任务三：给自己常连的 Redis 执行 `CLIENT LIST`，回答三个问题：连接里有没有 name 为空的（哪来的）？`resp` 值分布如何（有没有客户端还停在 RESP2）？`omem` 最大的连接是谁、idle 多少（有没有收得慢的）？

<details>
<summary>任务三参考判读</summary>

name 为空 = 未打标的连接，巡检脚本应列出来源 IP 并推动 SETNAME 纳入启动模板；resp=2 的客户端库升级到支持 RESP3 的版本后才能消费 push 消息（redis/115 的客户端缓存）；omem 大且 idle 小 = 客户端在收数据但收得慢，重点看该连接的网络与消费代码——这仨问题就是本篇 CLIENT LIST 字段判读的实战应用。
</details>

## 8. 下一步与延伸阅读

- 《延迟观测与慢查询诊断》（redis/320-LatencyObservabilityAndSlowlog）：本篇补齐其「命令之外」的延迟来源；
- 《发布订阅与客户端缓存》（redis/115-PubSubAndClientCaching）：output buffer 限制踢订阅者的完整案例、RESP3 push 消息的应用；
- 《安全：ACL 访问控制与 TLS》（redis/315-SecurityAclAndTls）：CLIENT LIST 的 user 字段与连接认证。

## 参考与致谢

- Redis 官方文档 RESP protocol：<https://redis.io/docs/latest/develop/reference/protocol-spec>（Redis Public Source License / CC-BY-SA 4.0 授权文档），RESP2/RESP3 类型与 Push 语义；
- Redis 官方文档 Clients：<https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/>（同上许可）与 CLIENT 命令页（<https://redis.io/docs/latest/commands/client-list/>）；
- 本篇正文为教学重写，字段与选项行为以官方文档为准（CLIENT NO-EVICT 为 7.0+）。
