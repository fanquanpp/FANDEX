---
order: 230
title: QoS 服务质量
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: 流分类标记、队列调度、限速整形与拥塞避免——让语音在带宽争抢中活下来
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：QoS（Quality of Service，服务质量）——网络设备对流量的差异化对待体系。
- **解决什么问题**：链路带宽有限，下班备份任务一跑，办公室 VoIP 电话开始断续。QoS 的答案是「不同流量不同待遇」：识别（分类）、打标记（标记）、排队优先（调度）、限量（限速整形）、提前丢该丢的（拥塞避免）。
- **什么时候用到**：语音/视频与普通数据混跑的网络；多租户带宽配额；运营商与园区出口的流量治理。

## 1. 差分服务模型：DSCP 与 802.1p

QoS 的现代主流框架是 DiffServ（差分服务）：流量在入口按类打标记，中间设备只看标记决定待遇，不需要逐流协商。

两个标记位置：

| 标记      | 位置                     | 位数 | 作用范围             |
| :-------- | :----------------------- | :--- | :------------------- |
| DSCP      | IP 头 ToS 字段           | 6 位（64 类） | 三层，跨路由器生效 |
| 802.1p    | 二层 802.1Q 标签的 PRI   | 3 位（8 级）  | 二层，本交换网络内  |

常用 DSCP 取值速记：`EF`（Expedited Forwarding，46）给语音；`AF41`（34）给视频会议；`AF21`（18）给重要业务数据；`BE`（0，尽力而为）给普通流量。**802.1p 与 DSCP 的衔接**：802.1p 只在交换网络内部有效，跨路由器就丢——所以园区里通常入口做「802.1p 到 DSCP」的映射转换，出了园区全靠 DSCP。

## 2. 流分类与流行为：QoS 策略的两半

QoS 配置的通用骨架（H3C Comware 语法为例）分四步：定义流分类（traffic classifier）-> 定义流行为（traffic behavior）-> 绑定成策略（traffic policy）-> 应用到接口（qos policy）：

```text
# H3C Comware 语法

# 1) 流分类：按 ACL 或 DSCP 识别语音流量
acl number 3001
 rule 5 permit udp source 192.168.10.0 0.0.0.255 destination-port range 16384 32767

traffic classifier VOICE
 if-match acl 3001

# 2) 流行为：打 DSCP EF 标记并放进加速队列
traffic behavior VOICE-BH
 remark dscp ef
 queue ef bandwidth 2000 cbs 50000

# 3) 绑定成策略
traffic policy VOICE-POLICY
 classifier VOICE behavior VOICE-BH

# 4) 应用到入接口
interface GigabitEthernet1/0/1
 qos apply policy VOICE-POLICY inbound
```

逐段看：ACL 3001 用「UDP + 端口段 16384-32767」圈定语音流（多数 IP 话机的 RTP 媒体端口范围）；`remark dscp ef` 给流量盖上 EF 戳，让后续每一跳设备都认识它；`queue ef` 把流量送进加速转发队列并保证 2000 kbps 带宽；`inbound` 表示在入口分类打标——出口的队列调度才能认出谁是谁。

**易错点**：分类打标做在出口、调度也看出口，但打完标当跳就消费——正确姿势是入口打标、出口调度；只配了 traffic policy 忘了 `qos apply policy` 应用到接口，等于白配。

## 3. 队列调度：拥塞时谁先走

链路不拥塞时人人满速，**调度策略只在拥塞时起作用**。四种经典算法：

| 算法   | 思路                     | 问题                     | 适用         |
| :----- | :----------------------- | :----------------------- | :----------- |
| FIFO   | 先来先走                 | 大流量淹没小流量         | 无 QoS 需求  |
| PQ     | 严格优先级队列           | 低优先级可能饿死         | 语音独享预留 |
| WFQ    | 加权公平队列，按权重轮询 | 无法保证绝对时延         | 数据多类公平 |
| CBQ    | 类别队列 + LLQ 低延迟队列 | 配置复杂               | 综合业务园区 |

工程折衷是 CBQ/LLQ：语音放 LLQ（严格优先，带带宽上限防饿死别人）、视频与重要业务放保证带宽的 AF 队列、其余进默认队列——「语音要快、数据要公平、谁也别饿死」。

## 4. 限速与整形：car 与 gts

两个控制速率的手段方向相反：

- **CAR（承诺访问速率，监管）**：超速的**丢掉或重标记降级**。削峰不留情，适合运营商限制客户；
- **GTS（通用流量整形）**：超速的**缓存排队**，平滑突发。晚到但不到，适合对端接口速率不匹配的场景。

```text
# H3C：出口对服务器流量限速 50 Mbps（监管，超出丢弃）
traffic behavior LIMIT-BH
 car cir 50000 pir 50000 red discard

# H3C：出口整形到 50 Mbps（缓存，平滑发送）
qos gts interface GigabitEthernet1/0/24 cir 50000
```

`cir`（承诺速率）是长期平均速度；`pir`（峰值）允许短时突发；CAR 的 `red discard` 指定超速动作为丢弃。**选型口诀**：丢得起（可重传的数据）用 CAR 立刻执行；丢不起（TCP 流，丢包触发拥塞窗口收缩反而慢）用 GTS 攒着慢慢发。

## 5. 拥塞避免：WRED

队列满了再丢包（尾部丢弃）有个恶果：TCP 全局同步——大量 TCP 流同时丢包、同时退避、同时恢复，链路利用率锯齿震荡。WRED（加权随机早期检测）在队列**尚未满**时按概率提前丢包，且丢包概率随队列深度增加、按流的优先级加权（低优先级先丢多丢）。效果：每条 TCP 流独立收到「减速」信号，避免同步震荡。

```text
# H3C：在 AF 队列启用 WRED
traffic behavior DATA-BH
 queue af bandwidth 30000
 wred dscp enable      # 基于 DSCP 的加权丢弃
```

**为什么丢包能减速 TCP**：TCP 把丢包当拥塞信号主动降速（见 025-TCPUDPProtocolMechanics 篇第 4 节）——WRED 正是借这个机制「劝退」发送方，这是跨层协作的典型设计。

## 6. 完整案例：办公室 VoIP 与大文件备份抢带宽

场景：园区出口 100 Mbps。白天有 50 路 VoIP（每路约 100 kbps，对时延丢包极敏感），夜间备份任务跑满带宽。白天两者并发时电话断续。

治理方案（按四步落位）：

1. **分类标记**：入口按语音网段 + RTP 端口段识别，remark DSCP EF；备份服务器流量 remark DSCP BE；
2. **出口调度**：LLQ 给 EF 保证 10 Mbps（50 路留余量），备份流量进默认队列；
3. **限速**：备份流量 CAR 到 60 Mbps，防止夜间无语音时也无节制挤占（给突发业务留 30）；
4. **WRED**：数据队列启用 WRED 防全局同步。

效果：语音报文永远走 LLQ 优先出队，时延抖动降到毫秒级；备份慢一点但夜里照样跑完。**核心思想**：QoS 不创造带宽，只决定「拥塞时牺牲谁」。

## 7. 不同场景下的例子

**例一：办公室 VoIP 与备份抢带宽（上文完整案例）**——QoS 最经典的入门场景，四个环节全部用到。

**例二：多租户云网络的带宽配额**。公有云给每个虚机限速（如 100 Mbps 出向）：出口 CAR 限速实现；不同套餐给不同 `cir`，超卖时 WRED 保证高配套餐丢包率更低——限速与拥塞避免的组合拳。

**例三：视频会议的 AF 而非 EF**。Zoom 类会议流量有人误配成 EF。会议是「多流聚合 + 有一定缓冲」的流量，EF 的严格优先会让它反过来饿死普通业务；正确做法是 AF41 保证带宽 + 有限时延，语音（EF，每路流量小且时延要求毫秒级）与视频（AF，带宽大头）分开待遇。

## 动手实践

**练习 1（分类规则推演）**：给出三条流量描述（话机 RTP、视频会议、普通网页），写出各自的 ACL/if-match 分类条件与建议的 DSCP 值。

**提示**：从「时延敏感度 + 丢包容忍度」两个维度定级：都最高的是语音。

**练习 2（限速对比）**：在模拟器（eNSP/HCL，见 035 篇）里对同一 UDP 流量分别配 CAR 与 GTS，观察抓包中「丢包」与「包间隔变宽」的区别。

**提示**：CAR 丢包表现为包数变少；GTS 表现为相邻包的时间间隔均匀拉大。

**练习 3（饥饿实验）**：模拟 PQ 配置下用 iperf3 起一条大流量打满低优先级队列，观察高优先级流量抢占时低优先级吞吐掉到多少，验证「严格优先 + 无带宽上限 = 饿死」。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```text
练习 1 参考答案:
  话机 RTP:     udp 目的端口 16384-32767 → EF(46)  时延敏感+丢包不容忍
  视频会议:     udp 目的端口 5004 / tls 443 到会议云 → AF41(34)  时延敏感+可缓冲
  普通网页:     其余 → BE(0)  都不敏感

练习 2（H3C 骨架）:
  # CAR
  traffic behavior CAR-BH
   car cir 10000 red discard
  # GTS
  qos gts interface GigabitEthernet1/0/1 cir 10000
  iperf3 -u -b 20M -c <对端> 对比两种配置下的抓包差异

练习 3:
  iperf3 -s                     # 接收端
  iperf3 -c <接收端> -b 90M -t 60   # 打满链路（低优先级类）
  # 同时另一台跑高优先级类流量，观察其吞吐是否稳定、低优先级是否趋近 0
```

</details>

## 参考与致谢

- RFC 2474「Definition of the Differentiated Services Field (DSCP)」：<https://www.rfc-editor.org/rfc/rfc2474>（IETF 开放标准文档）
- RFC 3168「Explicit Congestion Notification」（WRED/ECN 的拥塞通知背景）
- H3C Comware QoS 配置指南（流分类/流行为/流量监管/整形/WRED 命令，本文 H3C 语法示例整理自本仓库扫描素材的 Comware 命令参考）
- 华为 VRP QoS 命令为同类语法变体，混用平台时以各自文档为准。
