---
order: 20
title: 网络管理与接入控制协议
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: ACL 访问控制、SNMP 网管协议与 Portal/802.1X/RADIUS 接入认证链
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：网络管理与接入控制——ACL 管「谁能过」，SNMP 管「设备健康怎么看」，Portal/802.1X/RADIUS 管「谁有资格接入」。本文承接原「网络基础」篇的 §11 ACL、§13 SNMP、§15 Portal 章节，扩展为独立知识类别。
- **解决什么问题**：财务服务器只允许特定网段访问（ACL）；几百台设备的 CPU、端口状态不能一台台登录看（SNMP）；访客连 Wi-Fi 要弹网页输凭证（Portal）；员工设备入网要统一身份核验（802.1X + RADIUS）。
- **什么时候用到**：写设备安全策略；搭网管系统；企业无线/有线准入方案；运营商与酒店场景的上网认证。

## 1. ACL：访问控制列表

ACL 是按规则逐条匹配数据包五元组（源/目的地址、协议、端口）的过滤器。两条铁律：**规则自上而下匹配，命中即停**；**默认隐含拒绝一切**（部分厂商的 ACL 末尾隐式 deny all）。

```bash
# 基本 ACL（2000-2999，基于源地址）——华为 VRP 语法
[Router] acl 2000
[Router-acl-basic-2000] rule 5 permit source 192.168.1.0 0.0.0.255
[Router-acl-basic-2000] rule 10 deny source any

# 高级 ACL（3000-3999，基于五元组）
[Router] acl 3000
[Router-acl-adv-3000] rule 5 permit tcp source 192.168.1.0 0.0.0.255 \
  destination 10.1.1.0 0.0.0.255 destination-port eq 80
[Router-acl-adv-3000] rule 10 deny ip source any destination any

# 应用到接口（traffic-filter 决定方向）
[Router] interface GigabitEthernet0/0/1
[Router-GE0/0/1] traffic-filter inbound acl 3000
```

逐段讲：`rule 5`/`rule 10` 的序号留了间隙——以后要在两条规则之间插规则，直接用序号 6/7，不必重写整张表；`0.0.0.255` 是**通配符掩码**不是子网掩码，0 表示「必须精确匹配」、255 表示「忽略」——`192.168.1.0 0.0.0.255` 匹配整个 C 段，这是 ACL 最容易看错的地方；`traffic-filter inbound` 表示「进入该接口的流量」被过滤，方向搞反等于在错误的门设卡。

**易错点**：规则顺序错误是最常见事故——把 `deny any` 放在最前，后面的 permit 全部失效（匹配到 deny 即停）。华为基本 ACL 应靠近**目的**端应用（只看源地址，放太早会误伤过路流量），高级 ACL 靠近**源**端应用，这条经验来自「尽早拒绝、减少无效转发」的原则。

## 2. SNMP：网络管理协议

SNMP 让网管服务器（NMS）采集几百台设备的运行数据并接收告警。模型三角色：被管设备的 SNMP Agent、网管站 NMS、设备上的 MIB（管理信息库，一棵树形 OID 数据库，每个节点是一个可读写的指标，如接口流量、CPU 温度）。

```bash
# 华为设备 SNMP 配置（华为 VRP 语法）
[Huawei] snmp-agent community read Public@123       # 只读团体名
[Huawei] snmp-agent community write Private@123     # 读写团体名
[Huawei] snmp-agent sys-info version v2c
[Huawei] snmp-agent target-host trap address udp-domain 192.168.1.100 \
  params securityname Public@123                    # 告警发往网管站
[Huawei] snmp-agent trap enable
```

| SNMP 版本 | 认证方式     | 安全性 | 说明                                     |
| :-------- | :----------- | :----- | :--------------------------------------- |
| v1        | 团体名       | 低     | 明文传输，无加密                         |
| v2c       | 团体名       | 低     | v1 的批量增强（GetBulk），安全性未改进   |
| v3        | USM 用户认证 | 高     | 用户名 + 认证密码 + 加密密钥，生产首选   |

v1/v2c 的「团体名」本质是一个明文口令——旧设备出厂默认 `public`/`private` 是教科书级漏洞。v3 的 USM 提供认证（防伪造）与加密（防窃听）两层，新部署一律 v3。两个方向的数据流：**轮询**（NMS 主动 Get OID 读指标，适合趋势监控）与**Trap**（设备主动推告警到 NMS，适合秒级感知故障），生产上两者都用。

## 3. 接入认证：Portal、802.1X 与 RADIUS

三种主流准入方式，按「谁来验证、何时验证」区分：

| 方式    | 验证时机             | 适用对象           | 典型场景           |
| :------ | :------------------- | :----------------- | :----------------- |
| Portal  | 用户打开网页时       | 访客、临时终端     | 酒店/商场 Wi-Fi    |
| 802.1X  | 端口接入瞬间         | 企业员工、受控设备 | 办公有线/无线准入  |
| MAC 认证 | 设备首次上线        | 打印机、摄像头     | 无交互能力的哑终端 |

三者后台都常用 **RADIUS**（RFC 2865）做认证服务器：接入设备（NAS）收到用户凭证后转发给 RADIUS，用共享密钥交互，返回 Accept/Reject。认证链完整读法：终端 -> 接入设备（交换机/AC）-> RADIUS 服务器 -> 用户数据库（本地或 LDAP/AD）。

```bash
# 华为设备 Portal 认证配置（华为 VRP 语法）
[Switch] portal free-rule 0 destination ip 192.168.1.100 mask 255.255.255.255
# free-rule：免认证放行规则（如认证服务器自身、DNS）
[Switch] portal web-server Server1
[Switch-portal-web-server-Server1] url http://192.168.1.100/portal
[Switch] interface Vlanif10
[Switch-Vlanif10] web-auth-server Server1 direct
```

逐段看：`free-rule` 放行认证页自己与 DNS——否则用户还没认证就打不开认证页，死锁；`web-server` 指向 Portal 页面地址；`direct` 模式表示终端与 Portal 服务器二层可达。Portal 的用户体验是「连上 Wi-Fi、打开任意网页、被重定向到登录页」，认证通过前流量全部拦截，只放行 free-rule 里的目的地。

**易错点**：Portal 只拦 HTTP 流量劫持跳转——现代浏览器全 HTTPS 后，重定向经常被浏览器拦截提示「不安全」，所以生产 Portal 都靠 DNS 劫持 + 客户端 App/小程序兜底触发。802.1X 则不依赖浏览器：交换机端口在认证通过前只放行 EAPOL 帧，数据帧一个不放，安全强度高得多，但要求终端装 supplicant（Windows/macOS 原生支持）。

## 4. 不同场景下的例子

**例一：财务服务器只允许特定网段访问（真实工程场景）**。财务系统 `10.1.1.0/24` 只许财务部 `192.168.10.0/24` 与审计部 `192.168.20.0/24` 访问：在核心交换机对财务网段网关接口应用 ACL，permit 两个源网段 + deny any。上线后研发反馈连不上财务系统——这正是策略生效，把研发需要的服务器单独开一条 rule 放在 deny 之前。

**例二：运营商 Portal 认证页**。机场连 Wi-Fi 后弹出「输入手机号获取验证码」页面，就是 Portal：AC 把你的首个 HTTP 请求劫持到 Portal 服务器，输入手机号、短信验证码，RADIUS 校验通过后 AC 放行你的 MAC 地址。能用是因为「先免费放行认证域名，再验证放行全部」的两段式 free-rule。

**例三：园区网 802.1X 准入**。公司交换机全部端口启用 802.1X，员工电脑开机时用域账号通过 RADIUS 认证，未认证端口连网线都「不通」；访客区则配 MAC 认证 + Portal 兜底。同一台 RADIUS 服务器给两类人群走不同的认证策略。

**例四：监控大盘的 SNMP 数据**。运维用 Zabbix/Grafana 通过 SNMP v3 每 30 秒轮询 200 台交换机的接口流量 OID（如 `1.3.6.1.2.1.31.1.1.1.6` 接口入字节数），画出流量趋势；某台设备断链时设备主动发 linkDown Trap，大盘 5 秒内红色告警——轮询管「看趋势」、Trap 管「报突发」。

## 动手实践

**练习 1（ACL 顺序）**：写出实现「只拒绝 192.168.1.100 访问服务器、放行其他所有人」的 ACL 规则，故意先把 deny any 写在前面，然后用一条具体流量（源地址、目的地址）走一遍匹配过程，解释为什么放行规则永远命中不了。

**提示**：ACL 命中即停是推演的全部规则。

**练习 2（通配符换算）**：把需求翻译成通配符掩码：匹配 `192.168.8.0 ~ 192.168.15.255`（一段连续的 8 个 C 网段）；匹配任意主机。

**提示**：通配符的反掩码思路——想「忽略多少位」。

**练习 3（SNMP 版本对比）**：在同一台设备（或模拟器）上分别启用 v2c 与 v3，用 `snmpwalk`（Linux 命令）各走一遍，用抓包工具（tcpdump 见 270 篇）对比两种版本的报文里团体名/用户名的可见性。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```text
练习 1（正确顺序）:
  rule 5 deny source 192.168.1.100 0.0.0.0
  rule 10 permit source any
  流量 192.168.1.100 -> 服务器：命中 rule 5，deny，停止
  流量 192.168.1.101 -> 服务器：rule 5 不匹配，rule 10 permit
  若 deny any 在前：一切流量第 0 步就被拒，后面规则形同虚设

练习 2:
  192.168.8.0 ~ 192.168.15.255 → 192.168.8.0 0.0.7.255
    （第三段 8~15 = 2^3 个连续值，忽略低 3 位，其余精确匹配）
  任意主机 → 0.0.0.0 255.255.255.255（常写作 any）

练习 3（命令骨架，Linux 侧）:
  # v2c：团体名明文可见
  snmpwalk -v 2c -c Public@123 <设备IP> 1.3.6.1.2.1.1
  tcpdump -i eth0 -A udp port 161     # -A 直接看到 ASCII 团体名
  # v3：认证加密后报文不可读
  snmpwalk -v 3 -u netops -l authPriv -a SHA -A "AuthPass" \
           -x AES -X "PrivPass" <设备IP> 1.3.6.1.2.1.1
```

</details>

## 参考与致谢

- RFC 2865「RADIUS」与 RFC 3411 系（SNMP 框架）：<https://www.rfc-editor.org/rfc/rfc2865>（IETF 开放标准文档）
- IEEE 802.1X 端口准入标准（IEEE 标准概览页公开章节）
- 华为 VRP 命令参考（ACL/SNMP/Portal 配置命令）：华为官方文档，本节命令整理自本仓库原 010 篇既有内容
- H3C Comware 命令参考（QoS/802.1X 大类索引备查）
- 本文 ACL/SNMP/Portal 章节承接本仓库原「网络基础」篇 §11/§13/§15 既有内容深化重组。
