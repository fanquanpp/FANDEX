---
order: 260
title: 网络安全技术
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: 网络安全技术：防火墙、IDS/IPS、VPN、NAT与访问控制
author: fanquanpp
updated: '2026-10-11'
related:
  - 'networking/020-OSITCPIPModel'
  - 'networking/160-SwitchingAndRouting'
  - 'networking/170-WirelessNetwork'
  - 'networking/350-NetworkProgrammability'
prerequisites: []
---


## 1. 防火墙技术

### 1.1 防火墙类型

| 类型     | 工作层        | 检查内容     | 性能 |
| -------- | ------------- | ------------ | ---- |
| 包过滤   | 网络层        | IP/端口/协议 | 高   |
| 状态检测 | 网络层+传输层 | 连接状态     | 中   |
| 应用网关 | 应用层        | 应用协议     | 低   |
| 下一代   | 多层          | 深度包检测   | 中   |

### 1.2 安全域划分

```
Internet ←→ Untrust(外网)
               <->
            DMZ(隔离区)：Web服务器、邮件服务器
               <->
            Trust(内网)：办公网络
               <->
            Management(管理区)：运维管理
```

### 1.3 防火墙配置

```bash
# Cisco ASA
access-list OUTSIDE_IN permit tcp any host 203.0.113.10 eq 80
access-list OUTSIDE_IN permit tcp any host 203.0.113.10 eq 443
access-list OUTSIDE_IN deny ip any any

access-group OUTSIDE_IN in interface outside

# NAT 配置
object network WEB_SERVER
  host 10.0.0.10
  nat (inside,outside) static 203.0.113.10
```

### 1.4 安全策略设计原则

- 默认拒绝，显式允许
- 最小权限
- 纵深防御
- 分区隔离

## 2. IDS/IPS

### 2.1 入侵检测系统

| 类型 | 部署方式 | 检测方法     |
| ---- | -------- | ------------ |
| NIDS | 旁路部署 | 网络流量分析 |
| HIDS | 主机部署 | 系统日志分析 |

### 2.2 检测方法

**特征检测**：

```bash
# Snort 规则
alert tcp $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
  (msg:"SQL Injection Attempt"; \
   content:"UNION SELECT"; nocase; \
   sid:1000001; rev:1;)
```

**异常检测**：建立正常行为基线，偏离基线触发告警。

### 2.3 IPS 部署

```
Internet → IPS(内联) → 内部网络
              │
              ↓ 阻断恶意流量
```

IPS 在检测到攻击时主动阻断，但误报可能影响正常业务。

## 3. VPN 技术

### 3.1 VPN 类型

| 类型       | 场景     | 协议          |
| ---------- | -------- | ------------- |
| 远程访问   | 单用户   | SSL VPN, L2TP |
| 站点到站点 | 网络互联 | IPsec         |
| MPLS VPN   | 运营商   | MPLS          |

### 3.2 IPsec VPN

**IKE 阶段1（ISAKMP SA）**：

```bash
# Cisco 配置
crypto isakmp policy 10
  encryption aes-256
  hash sha256
  authentication pre-share
  group 14
  lifetime 86400

crypto isakmp key SECRET address 203.0.113.2
```

**IKE 阶段2（IPsec SA）**：

```bash
crypto ipsec transform-set TS esp-aes-256 esp-sha256-hmac

crypto map VPN 10 ipsec-isakmp
  set peer 203.0.113.2
  set transform-set TS
  match address CRYPTO_ACL

interface GigabitEthernet0/0
  crypto map VPN
```

### 3.3 SSL VPN

```
浏览器 → HTTPS → VPN网关 → 内部网络
```

优势：无需客户端，浏览器直接访问。

## 4. NAT 技术

### 4.1 NAT 类型

| 类型     | 映射方式     | 适用场景   |
| -------- | ------------ | ---------- |
| 静态NAT  | 一对一       | 服务器发布 |
| 动态NAT  | 地址池       | 内网上网   |
| NAPT/PAT | 端口多路复用 | 最常用     |

### 4.2 NAT 配置

```bash
# Cisco PAT
access-list NAT_ACL permit 10.0.0.0 0.0.0.255 any
ip nat inside source list NAT_ACL interface GigabitEthernet0/0 overload

interface GigabitEthernet0/0
  ip nat outside
interface GigabitEthernet0/1
  ip nat inside

# 静态NAT（端口转发）
ip nat inside source static tcp 10.0.0.10 80 203.0.113.10 80
```

### 4.3 NAT 穿越问题

| 协议  | 问题                | 解决方案       |
| ----- | ------------------- | -------------- |
| FTP   | 数据连接IP被NAT修改 | ALG/被动模式   |
| SIP   | SDP中IP被NAT修改    | ALG/STUN       |
| IPSec | AH校验失败          | NAT-T(UDP封装) |

## 5. 访问控制

### 5.1 ACL 类型

| 类型    | 编号范围 | 特点                |
| ------- | -------- | ------------------- |
| 标准ACL | 1~99     | 仅源IP              |
| 扩展ACL | 100~199  | 源/目标IP/端口/协议 |
| 命名ACL | -        | 可编辑              |

### 5.2 ACL 配置

```bash
# 扩展ACL
ip access-list extended WEB_ACCESS
  permit tcp any host 10.0.0.10 eq 80
  permit tcp any host 10.0.0.10 eq 443
  deny ip any any log

interface GigabitEthernet0/0
  ip access-group WEB_ACCESS in
```

### 5.3 802.1X 认证

```
客户端(Supplicant) ←EAPOL→ 交换机(Authenticator) ←RADIUS→ 认证服务器
```

```bash
# 交换机配置
aaa new-model
aaa authentication dot1x default group radius
radius server ISE
  address ipv4 10.0.0.100
  key SECRET_KEY

interface GigabitEthernet0/1
  dot1x port-control auto
```

## 6. 网络安全加固

### 6.1 设备安全

```bash
# 关闭不必要服务
no ip http server
no ip http secure-server
no cdp run
no ip source-route

# SSH 访问
line vty 0 4
  transport input ssh
  login local

# 密码加密
service password-encryption
enable secret LEVEL15
```

### 6.2 控制面安全

```bash
# 路由协议认证
router ospf 1
  area 0 authentication message-digest
  interface GigabitEthernet0/0
    ip ospf message-digest-key 1 md5 KEY

# BGP 认证
router bgp 65001
  neighbor 10.0.0.2 password BGP_KEY
```

### 6.3 管理面安全

- 使用 SNMPv3 替代 v2c
- 启用 Syslog 审计
- NTP 认证
- 配置变更管理

## 教学自检

按遮码自检法：遮住上文命令与表格，先自己推演，再对照。

- 包过滤、状态检测、应用网关三类防火墙的检查深度递进关系是什么？「状态检测」比包过滤多
  看了什么信息（为什么放行出站后回包不用单独放行）？
- DMZ 的设计目的是什么？Web 服务器放 DMZ 而不是内网，被攻破后的爆炸半径差在哪？
- NIDS 旁路部署与 IPS 内联部署的根本差别是什么？各自牺牲了什么（告警 vs 阻断）？
- Snort 规则的 `content`/`nocase`/`sid` 各管什么？特征检测为什么挡不住 0day？
- IPsec 两个阶段的 SA 各保护什么流量？`group 14` 指什么参数族？
- NAT 对 FTP/SIP/IPsec 的破坏点各在哪一层？NAT-T 为什么能救 IPsec（AH 为什么救不了）？
- 标准 ACL 与扩展 ACL 的编号段与过滤能力差别？「靠近目的端放标准 ACL」的理由？
- 设备加固清单里 `no cdp run`、`transport input ssh`、`service password-encryption`
  各防哪一类暴露？为什么说 `enable secret` 而不是 `enable password`？
