---
order: 390
title: BGP 路由协议
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: BGP 边界网关协议：AS 路径、选路策略、路由聚合与 Anycast。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/280-ComputerNetworkAdvanced'
  - 'cs-fundamentals/370-QUIC'
  - 'cs-fundamentals/380-ARPProtocolSpoofing'
  - 'cs-fundamentals/340-DNSFlow'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- 路由的基本概念：路由器按最长前缀匹配转发数据包；
- IGP（内部网关协议，如 OSPF）负责一个组织内部的选路——BGP 则负责组织之间；
- CIDR 无类域间路由：`203.0.113.0/24` 这类"地址 + 前缀长度"的表示。

## 学习目标

- 理解 AS（自治系统）与 ASN：互联网不是一张平面网络，而是上万个网络的联邦；
- 区分 eBGP 与 iBGP 的角色与部署差异；
- 掌握 BGP 选路的核心属性（LOCAL_PREF、AS_PATH、MED）与"策略优先"的选路哲学；
- 理解路由聚合、Anycast 的工程用法，以及 BGP 劫持与 RPKI 的攻防。

## 1. 概念引入：国家间的航线谈判

一个类比：把互联网看成世界地图，每个大型网络运营商（电信、Google、某大学）是一个**国家（AS）**。国内修路是国内法（IGP/OSPF 说了算）；国家与国家之间通航，靠的是**外交协议（BGP）**——两国谈判"经我可以到哪些国家"，并把谈判结果（路由宣告）层层转告盟友。

与 OSPF 等 IGP 的本质区别在这份"外交协议"的精神里：

- IGP 找的是**数学最优路径**（链路开销最小）；
- BGP 找的是**商业策略最优路径**（哪个邻居便宜、走谁家不踩雷、我的流量别绕竞争对手），"最短"只是众多考量之一。

> 类比失真提示：国家间协议需要签字画押才生效，BGP 邻居建立只需 TCP 三次握手加 OPEN 报文——这也是它容易被"误宣告"的结构性原因。

## 2. BGP 基础

### 2.1 AS 与 ASN

**自治系统（AS, Autonomous System）**：由单一机构管理、有统一路由策略的网络集合。每个 AS 有全局唯一的 **ASN（AS 号）**（16 位时代 ASN 64512-65535 保留私有，现 32 位ASN 已普及，公共 ASN 由 RIR（区域互联网注册机构）分配）。三大运营商、云厂商、大型企业都有自己的 ASN；`whois -h whois.radb.net AS4134` 可以查到一个 ASN 宣告的所有前缀。

### 2.2 eBGP 与 iBGP

| 维度 | eBGP（外部） | iBGP（内部） |
| ---- | ---- | ---- |
| 连接对象 | 不同 AS 的边界路由器 | 同一 AS 内的路由器 |
| 作用 | AS 之间交换"我能到哪" | 把 eBGP 学到的外部路由**分发到自己 AS 每个角落** |
| 附加行为 | 收到路由时把对方 ASN 追加进 AS_PATH | 不追加 AS_PATH |
| 防环规则 | AS_PATH 中出现自己 AS 号则拒收 | **iBGP 学到的路由不再传给其他 iBGP 邻居**（水平分割） |

iBGP 的水平分割规则导致一个工程后果：iBGP 必须**全网状互连（full-mesh）**或部署**路由反射器（RR, Route Reflector）**——大运营商普遍用 RR 分层反射，避免 N 台路由器两两互联的爆炸。

eBGP 会话传统上要求两台路由器物理直连（TTL=1），iBGP 则可以跨多跳建立（用 IGP 找到对方）。

## 3. BGP 选路：属性驱动的策略引擎

BGP 报文里每条路由（NLRI，即"前缀 + 属性"）携带一串属性，选路过程按固定优先级逐项比较，先分出胜负即停。核心属性：

| 属性 | 方向 | 含义 | 典型用途 |
| ---- | ---- | ---- | ---- |
| LOCAL_PREF | AS 内（iBGP 传播） | 本地优先级，越大越优 | 制定出站策略："出网流量优先走商业对等" |
| AS_PATH | 全局 | 经过的 AS 列表 | 越短越优；防环；"路径修剪"做流量工程 |
| NEXT_HOP | 全局 | 下一跳 IP | 可达性校验（需 IGP 可达） |
| MED | 相邻 AS 间 | 多出口鉴别器，越小越优 | 告诉对方"从我这几个口进，哪个便宜" |
| Origin / Community | 全局 | 起源 / 社区标签 | Community 是策略的"标记语言"，运营商标记与过滤 |

决策主干（简化）：

```text
1. 下一跳不可达 -> 淘汰
2. LOCAL_PREF 最高 -> 3. AS_PATH 最短 -> 4. Origin 类型
5. MED 最小 -> 6. eBGP 优于 iBGP -> 7. 到下一跳 IGP 开销最小
8. ……直至 Router-ID 比较
```

注意顺序中"本地策略（LOCAL_PREF）"压倒"路径长度（AS_PATH）"——这就是"策略优先于最优"的体现：运营商说"流量必须走我买的链路"，哪怕绕远三跳。

## 4. 路由策略工程

### 4.1 路由过滤

企业/运营商不会宣告或接受任意前缀。进出两个方向的过滤都由前缀列表 + 路由映射完成：

```text
! Cisco 风格配置节选：只向运营商宣告自己的前缀，拒绝明显非法的路由
ip prefix-list MYPREFIX seq 10 permit 203.0.113.0/24
ip prefix-list BOGON deny 10.0.0.0/8 le 32
ip prefix-list BOGON deny 192.168.0.0/16 le 32
ip prefix-list BOGON permit 0.0.0.0/0 le 32
!
router bgp 65001
  neighbor 198.51.100.1 prefix-list MYPREFIX out   ! 出向：只宣告自有前缀
  neighbor 198.51.100.1 prefix-list BOGON in       ! 入向：拒绝私有/Bogon
```

出向过滤不到位，误宣告别人前缀（见第 6 节）；入向过滤不到位，收下恶意路由被流量牵引。

### 4.2 路由聚合

把一批明细汇总成一条短前缀宣告，缩小全球路由表（当前 IPv4 公网主表约百万条量级）并隐藏内部抖动：`203.0.113.0/24 + 203.0.114.0/24 -> 203.0.112.0/22`。代价是丧失明细粒度的精细策略；实践常"聚合 + 明细都宣告"，出问题时撤明细保聚合。

### 4.3 Anycast：一址多点的路由魔法

同一个前缀从全球多个站点同时宣告：

```text
站点新加坡: 宣告 198.51.100.0/24（AS_PATH 短）
站点法兰克福: 宣告 198.51.100.0/24
站点圣保罗: 宣告 198.51.100.0/24
```

BGP 的最短 AS_PATH 规则自然让"全球用户各自被吸到最近的站点"——没有调度中心，路由表就是调度器。**根域名服务器、公共 DNS（1.1.1.1、8.8.8.8）、主流 CDN** 都靠 Anycast 实现全球就近接入（与 DNS 调度互补，见 [DNS 解析流程](cs-fundamentals/340-DNSFlow)）。注意 Anycast 下"同一个 IP"在不同地区是不同机器，长连接会话状态不能跨站点共享。

## 5. 完整示例：观察真实世界的 BGP

```bash
# 1. 查询某 IP 归属的 AS 与宣告前缀
whois -h whois.cymru.com " 8.8.8.8"
# 典型输出：
# AS      | IP               | AS Name
# 15169   | 8.8.8.8          | GOOGLE, US

# 2. 用 Looking Glass 查看 AS 的路由视图（以公开 LG 服务为例，网页操作）
#    https://bgp.he.net/AS15169 中可见其宣告的数万条前缀与对等连接

# 3. 路由器上查看某前缀的全部候选路径（Junos/Cisco 语法示意）
# show route 203.0.113.0/24 detail
# 典型输出（节选）：
# 203.0.113.0/24  *[BGP/170] 01:23:45, localpref 100
#                    AS path: 174 3356 65001 I, validation-state: valid
#                  > to 198.51.100.1 via xe-0/0/1.0
#                  [BGP/170] 01:23:44, localpref 90
#                    AS path: 6939 65001 I, validation-state: valid
```

第三段输出正是选路过程的现场：同一前缀两条候选，LOCAL_PREF 100 的一条胜出（`>` 标记当前使用），AS_PATH 依次列出途经的 AS——从本 AS 出发经 174、3356 到达 65001。`validation-state: valid` 则是 RPKI 验证结果。

## 6. BGP 安全：劫持与 RPKI

### 6.1 BGP 劫持：误宣告即事故

BGP 信任模型建立在"邻居说真话"上：任何 AS 宣告一条它不拥有的前缀，若无人过滤，这条假路由会沿对等链扩散，全球流量被牵引到攻击者（或手滑的工程师）处。两类典型：

- **配置事故（肥手指）**：2012 年某运营商误宣告了数十万条他人前缀导致大面积断网，此类事件说明"出向过滤缺失"是主要风险；
- **定向劫持**：蓄意宣告目标前缀（更精确的 /24 优于正常的 /22，最长前缀匹配优先吸流量），用于流量窃听、加密货币劫持或区域审查。历史上著名的案例包括 2008 年 Pakistan Telecom 宣告 YouTube 前缀导致全球断联数小时。

### 6.2 RPKI：给宣告配上"房产证"

**资源公钥基础设施（RPKI）**让前缀持有者用密码学方式声明"前缀 X 只授权给 ASN Y 宣告，最大长度 /24"（ROA 对象）。全网路由器可下载这些签名对象做**起源验证**：收到的前缀若与 ROA 冲突则标为 invalid 并拒绝采纳。近年主流运营商与 IXP 逐步强制 invalid 路由过滤，大型云厂商默认 RPKI 签名自家前缀。剩余短板：RPKI 只验证"起源 AS 合法"，不防"路径中间被插入"，后者的对策（BGPsec）部署仍然有限。

## 7. 常见陷阱与调试

- **以为 BGP 会选"最短路径"**：LOCAL_PREF、MED、Community 这些商业属性全部排在 AS_PATH 长度之前。排障时先看策略配置，再抱怨路由"不科学"。
- **iBGP 忘了 RR 或全互联**：新加一台路由器学不到外部路由（iBGP 水平分割），现象是"边界有路由、核心没路由"，业务间歇性不通。
- **出向无过滤**：不配 prefix-list 就宣告 `network` 语句，一条重分布失误可能把内网 10/8 宣告到全球。原则：出向白名单只放自有前缀，入向拒绝 Bogon。
- **Anycast 部署忽略会话粘性**：TCP 长连接场景下站点撤出前缀会导致用户被重定向到其他站点，会话全断；需要精细的"局部宣告 + 缓慢收缩"发布策略。
- **劫持检测滞后**：等用户投诉"网站打不开"时劫持已扩散。可用 RIPE RIS/RouteViews 数据比对自家前缀的全球可见性，异常出现"未授权 AS 突然出现在 AS_PATH"时立即告警并联系上游过滤。

## 8. 实战场景

- **多归属企业**：企业有两条上游（运营商 A/B）时，用 LOCAL_PREF 控制出站主备、MED 引导入站主备，BGP 是多线路由的标准答案。
- **CDN 与公共 DNS**：Anycast 前缀 + 全球多站点宣告，配合 BGP 收敛实现故障站点自动摘除（路由撤了流量自然改道）。
- **云网络**：AWS Direct Connect / GCP Interconnect 的动态路由就是 BGP 会话；理解 LOCAL_PREF/AS_PATH prepend 才能做好云地混合流量工程。

## 小结

初学者要点：

- 互联网是 AS 的联邦，BGP 是 AS 之间的外交协议；eBGP 对外宣告，iBGP 对内分发。
- 选路是策略引擎：LOCAL_PREF > AS_PATH > MED 等属性依序比较，商业策略优先于路径长度。
- 聚合缩小全球路由表；Anycast 用"多地宣告同一前缀"实现免调度的就近接入。

进阶注意：

- iBGP 水平分割要求 RR 或全互联；出向过滤与入向 Bogon 过滤是防事故/防劫持的第一道闸。
- RPKI 起源验证已进入主流强制阶段，但只覆盖"谁有资格宣告"，路径完整性仍是开放问题。
- 调试 BGP 依赖多源视角：Looking Glass、RouteViews/RIPE RIS、`show route detail` 的 AS_PATH 与 validation-state 是基本工具链。
