---
order: 300
title: 日志管理
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 结构化日志与采集链路选型：日志级别纪律、JSON 日志、Filebeat/Fluent Bit/Vector 对比、采样与脱敏、logrotate 与单机兜底
author: fanquanpp
updated: '2026-10-05'
related:
  - 'devops/280-ELKStackLogAnalysis'
  - 'devops/240-MonitorAndObservability'
  - 'devops/015-LinuxSystemManagement'
prerequisites:
  - 'devops/015-LinuxSystemManagement'
---

## 知识点地图

- **知识类别**：DevOps 可观测性 / 日志这条支柱（指标在[监控与可观测性](/devops/240-MonitorAndObservability)，检索分析实操在 [ELK](/devops/280-ELKStackLogAnalysis)——本篇管"日志怎么生、怎么收、怎么管住成本"）。
- **解决什么问题**：应用打了日志但查问题还是靠登机器 grep；日志把磁盘吃爆；敏感信息（手机号、token）裸奔进日志库；一天 2TB 日志没人敢删也没人敢查。这些是日志**治理**问题，不是"再装一个采集器"能解决的。
- **什么时候用到**：新服务定义日志规范；搭建/更换采集链路；日志存储成本失控；安全审计要求脱敏。

## 心智模型：日志的三段生命周期

```text
生产（应用怎么写）→ 采集（怎么送出去）→ 消费与治理（怎么存、怎么查、怎么删）
```

大多数团队的痛点在第三段，但根因在第一段——**非结构化的文本日志让后面每一环都低效**。治理日志从改日志格式开始，而不是从换采集器开始。

## 第一环：生产侧——级别纪律与结构化

### 日志级别纪律（先把"什么该打"定下来）

| 级别 | 该打什么 | 生产开关 |
| --- | --- | --- |
| FATAL | 进程无法继续的致命错误（启动失败、无法绑定端口） | 开 |
| ERROR | 影响功能的错误（外部调用失败、数据不一致）——**必须带上下文与堆栈** | 开 |
| WARN | 潜在问题但已降级处理（重试成功、慢查询、接近阈值） | 开 |
| INFO | 关键业务事件（请求完成、任务启动/结束）——一条一个事件，别循环打 | 开（控制量） |
| DEBUG | 诊断细节（变量值、分支路径） | 默认关，动态开 |
| TRACE | 极细粒度跟踪 | 默认关 |

两条高频纪律：**级别反映"要不要人看"，不是"严重程度"**（重试第三次成功的请求是 WARN 不是 ERROR——最终成功了就别吵醒值班的人）；**ERROR 必须可行动**（一条 ERROR 拿不到下一步动作的线索，就等于垃圾邮件）。

### JSON 结构化日志：治理的杠杆点

```text
非结构化：
2026-10-07 14:23:01 ERROR 订单支付失败 orderId=10023 user=张三 cost=450ms
  → 每家的格式都不一样，采集端只能全文索引，聚合统计靠正则（慢且脆）

结构化（一行一个 JSON）：
{"ts":"2026-10-07T14:23:01.312Z","level":"error","svc":"order",
 "orderId":10023,"userId":"u-8823","costMs":450,
 "err":"upstream timeout","traceId":"7fa9c2..."}
  → 字段即 schema：按 userId 聚合、按 traceId 串联、按 costMs 直方图统计都是原生能力
```

落地要点：**时间戳 ISO8601 带时区**（`2026-10-07T14:23:01.312Z`，别用本地格式）、**级别用小写枚举**、**traceId 必须有**（跨服务串联的生命线，与[OpenTelemetry](/devops/290-OpenTelemetry)的链路 ID 同源）。输出到 **stdout** 而不是自己写文件——文件轮转交给容器运行时或 systemd（见第三环）。

### 采样与脱敏（成本与安全的两个闸）

```text
采样：INFO 级的请求日志按 10% 采样（成功请求不值得全量留存），
      ERROR/WARN 永不采样——异常必须全量。
脱敏：手机号 138****1234、token 只记前 8 位、身份证/密码绝不入日志。
      落地位置在日志框架的脱敏 converter/pattern，别指望开发者每次手写。
```

脱敏是**合规底线**（个保法/安全审计），在采集端再脱敏一层是双保险，但源头不做就等于明文已经落过一次盘。

## 第二环：采集链路选型

三段式心智模型：**采集（Agent）→ 缓冲/路由（可选中转）→ 存储/检索（后端）**。

| 采集器 | 资源占用 | 生态 | 一句话定位 |
| --- | --- | --- | --- |
| Filebeat | 低（Go） | ELK 亲和 | ELK 体系默认起点，稳 |
| Fluent Bit | 最低（C） | K8s 事实标准 | 边缘采集 + 转发的首选 |
| Vector | 低（Rust） | 新锐 | 性能强、转换 DSL 灵活 |
| Fluentd | 中（Ruby 内核） | 老牌 | 插件最多，重转换场景 |

选型判据三条：

1. **K8s 环境**：DaemonSet 方式每个节点跑一个 Fluent Bit，收集容器 stdout（/var/log/containers）——这是云原生默认架构；
2. **ELK 体系**：Filebeat 直接进 Elasticsearch 是最短路径，中间没有转换需求就别加层；
3. **多后端/重转换**（同一份日志发 ES 与对象存储、要脱敏/富化）：选 Vector 或 Fluent Bit 的 pipeline 转换。

K8s 容器日志的流向值得记牢：容器写 stdout → 运行时落盘为 `/var/log/containers/*.log`（符号链接到 `/var/log/pods/...`）→ 节点上的采集 Agent tail 这些文件。**应用直接写文件（不写 stdout）会绕过这套机制**，要么改应用要么给 Agent 加文件路径——排障时"日志没进 ELK"第一查这里。

## 第三环：存储、轮转与单机兜底

### 集中存储的留存策略

```text
热（可检索，7-30 天）：Elasticsearch，副本与分片按查询量定
温（可回放，90 天）：对象存储（S3/OSS）压缩归档，要查时再导入
冷（合规留底，1 年+）：对象存储归档层/磁带，只守合规不服务查询
```

留存天数按"谁会来查、查多久之前的"定，不是越多越好——存储成本按天线性涨。

### 单机兜底：logrotate 与 journal（承接自系统管理篇的姊妹知识）

没有集中式日志的机器上，两个机制守住"磁盘不被日志吃爆"：

系统日志的位置与归属：

| 日志 | 路径 | 内容 |
| --- | --- | --- |
| 系统日志 | `/var/log/syslog`（或 messages） | 系统消息 |
| 认证日志 | `/var/log/auth.log` | 登录与 sudo |
| 内核日志 | `/var/log/kern.log` | 内核消息 |
| 服务日志 | `journalctl -u 服务` | systemd 服务（见[Linux 系统管理](/devops/015-LinuxSystemManagement)） |

应用自写文件日志的轮转交给 logrotate：

```text
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily                    # 每天切一刀
    rotate 30                # 保留 30 份
    compress                 # 旧文件压缩（delaycompress：最近一份延迟一天压）
    missingok                # 日志不存在不报错
    notifempty               # 空文件不轮转
    create 0644 appuser appgroup   # 新日志文件的属主与权限
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true    # 通知应用重新打开日志文件
    endscript
}
```

（原素材里 `endspostrotate` 是笔误——正确定界符是 `endscript`，照抄会静默不生效。）`postrotate` 的 reload 是关键一步：应用持有旧文件句柄时，不通知它就继续往已改名的文件写，磁盘照样涨——"logrotate 配了没效果"九成漏了这步。journal 自身的占用上限用 `SystemMaxUse` 配置、临时瘦身用 `journalctl --vacuum-time`（命令细节见[Linux 系统管理](/devops/015-LinuxSystemManagement)）。

## 场景：三套典型架构

**场景一：三台 VM 的小系统**。应用打 JSON 到 stdout → systemd 收进 journal → logrotate 兜底 → 排障就 `journalctl -u app | jq 'select(.level=="error")'`。**别上 ELK**——规模不配，维护成本大于收益。

**场景二：K8s 集群（30 节点内）**。Fluent Bit DaemonSet 采集容器 stdout → 加 namespace/pod 标签 → 进 Elasticsearch（或 Loki）。Loki 与 ES 的选择：只按标签过滤 + 少量全文检索选 Loki（存储便宜一个量级），复杂全文聚合选 ES。

**场景三：合规敏感（金融/医疗）**。全量日志双写：一份进检索后端，一份压缩归档对象存储 WORM（不可改）层；采集管道内嵌脱敏节点；日志删除策略过安全评审。

## 常见困惑

**"日志和指标什么关系？"**——指标回答"有没有问题"（便宜、常驻、聚合），日志回答"为什么有问题"（贵、按需、明细）。告警挂指标，排障下钻日志，链路串中间（见[监控与可观测性](/devops/240-MonitorAndObservability)三支柱）。用日志算告警指标（扫 ERROR 行数）是本末倒置——量大且慢。

**"日志该打到 stdout 还是文件？"**——容器与 systemd 时代默认 stdout，让运行时负责落盘与轮转；自己写文件是给"必须兼容传统采集器"的场景，代价是要自己管 logrotate。

**"为什么查日志总是查不全？"**——三个常见漏斗：采样丢了一部分（设计使然）、采集器重启期间的 gap、时区错位（应用 UTC、人按本地时间查）。排查顺序从最后一条开始——时区问题占"日志丢了"工单的一半。

## 动手实践：从裸文本到结构化的完整链路

任务：

1. 写一个 20 行的 Python/Node 小服务，分别以文本与 JSON 两种格式打日志到 stdout，用 systemd 跑起来；
2. `journalctl -u demo -o json` 观察 journal 的字段化能力；给文本版写一条 grep 提取 orderId，与 JSON 版的 `jq` 查询对比脆弱性；
3. 装 Fluent Bit（Docker 单机即可），配置 tail journal 或文件，输出到 stdout 模拟转发，观察字段富化；
4. 给 logrotate 配一个测试目录（`rotate 3 size 1k`），用 logrotate -f 手动触发三轮，观察文件滚动与 postrotate 的通知时机；
5. （安全实验）在日志里故意打一条带手机号的日志，写一条 Vector/Fluent Bit 的脱敏规则把它替换掉。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1（Node 示例，Python 同理）
cat > /opt/logdemo/server.js <<'EOF'
const http = require('http');
http.createServer((req, res) => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(), level: 'info', svc: 'logdemo',
    path: req.url, userId: 'u-8823', phone: '13812345678'
  }));
  res.end('ok');
}).listen(3000);
EOF
# 单元文件 ExecStart=/usr/bin/node /opt/logdemo/server.js（参照 015 篇）

# 2
journalctl -u logdemo -o cat | grep -oP 'orderId=\K\d+'
journalctl -u logdemo -o cat | jq -r 'select(.path=="/pay") | .userId'
# 结论：grep 依赖格式不变；jq 依赖字段名——字段名是显式契约，比正则稳

# 3
docker run -d --name fb -v /var/log:/var/log bitnami/fluent-bit
# 配置 tail /var/log/... 输出 stdout，观察每条日志被加上 host/file 字段

# 4
cat > /tmp/logrotate-test <<'EOF'
/tmp/rot/*.log { rotate 3 size 1k compress missingok }
EOF
logrotate -f /tmp/logrotate-test    # 手动触发
ls /tmp/rot/                        # x.log x.log.1 x.log.2 ...（.gz）

# 5（Fluent Bit 的 Lua 过滤器或 Vector 的 remap：）
# Vector VRL: .phone = replace(.phone, r'(\d{3})\d{4}(\d{4})', '${1}****${2}')
```

判读要点：任务 4 的三轮轮转后最老的日志被自动删除（rotate 3），配合 compress 看到旧文件变 .gz——这就是"磁盘与日志共存"的机制本体。
</details>

## 检验清单

- 能背出六个日志级别的使用纪律，并解释"ERROR 必须可行动"；
- 能说出结构化 JSON 日志的四个必备字段（ts/level/svc/traceId）与非结构化日志在采集与聚合上的代价；
- 能按场景在三套采集架构中做选型，并说出"应用写 stdout"与容器日志流向的关系；
- 能写一份 logrotate 配置并解释 postrotate 通知的必要性（含 endscript 拼写）；
- 能设计热温冷三层留存并说出采样与脱敏的落点。

## 下一步

- [ELK Stack 日志分析](/devops/280-ELKStackLogAnalysis)：集中后端的索引与检索实操；
- [监控与可观测性](/devops/240-MonitorAndObservability)：日志之外的指标与链路支柱；
- [OpenTelemetry](/devops/290-OpenTelemetry)：traceId 从哪里来、三支柱如何统一。

## 参考与致谢

- Fluent Bit 官方文档（Apache-2.0）：<https://docs.fluentbit.io/>
- Vector 官方文档（MPL-2.0）：<https://vector.dev/docs/>
- logrotate 手册页（GPLv2+）：<https://linux.die.net/man/8/logrotate>
- 本篇采集器对比、级别纪律与 logrotate 段落承接自旧篇 270 与 010 §8 并重写扩写（endscript 笔误已修正）。
