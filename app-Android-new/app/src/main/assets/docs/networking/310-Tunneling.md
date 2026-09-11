---
order: 310
title: 隧道技术
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: 隧道封装原理：GRE/IPIP/VXLAN/WireGuard/IPsec 隧道模式对比、TUN 设备、MTU 与防火墙陷阱、双私网互通完整实验。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'networking/240-HighAvailabilityLVS'
  - 'networking/340-SDN'
  - 'networking/320-VPNConfig'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：IP 报文结构与路由转发（见 [网络基础与协议](networking/010-NetworkBasicsAndProtocol)）；
VPN 的加密与密钥协商细节见 [VPN 与隧道配置](networking/320-VPNConfig)。

学习目标：

- 理解隧道「封装-传输-解封装」的通用模型，知道 TUN/TAP 虚拟网卡在其中的角色；
- 能区分 GRE、IPIP、VXLAN、IPsec 隧道模式各自封装什么、解决什么问题；
- 能用 `ip tunnel` / `ip link` 配出打通两个私网的 GRE 隧道并验证；
- 掌握隧道类问题的两大高频故障：MTU 黑洞与外层协议被防火墙拦截。

## 1. 隧道是什么：报文套报文

隧道（Tunneling）是把一种协议的完整报文**当作数据**，装进另一种协议的报文里传输：

```text
正常转发：  [IP头 | TCP头 | 数据]
GRE 隧道：  [新IP头(公网可达) | GRE头 | 旧IP头(私网源目) | TCP头 | 数据]
             └──────── 外层，负责穿越中间网络 ────────┘
```

> 类比：寄一件物品（内层报文），快递员把它装进快递箱（外层报文），箱面写的是中转仓地址；
> 收件方拆箱后看到的还是原始包裹。类比失真提示：快递箱会增大体积，隧道也会增大报文——这正是
> MTU 问题（第 6 节）的来源。

隧道的价值是把「中间网络不理解的东西」送过去，三类典型用途：

1. **跨越不连续的同构网络**：两个 IPv6 岛之间没有原生 IPv6 链路，用 IPv4 隧道运载 IPv6；
2. **在公网上延续私网拓扑**：总部与分支的两个 `192.168.x.0/24` 通过隧道像一根网线直连；
3. **叠加网络（Overlay）**：在物理三层网络之上虚拟出大量二层网络（数据中心多租户），VXLAN
   是代表，与 SDN 的关系见 [SDN](networking/340-SDN)。

## 2. 通用模型：虚拟网卡 + 路由牵引

Linux 上隧道通常表现为一块虚拟网卡（TUN 设备）：`ip tunnel add` / `ip link add` 创建后，系统
里多出一个接口；你只需把路由指向它，内核在从这个接口发包时自动封装、收到对端封装包时自动解
封装：

- **TUN（三层）**：接口上收发的是 IP 包，用户态程序读到的也是 IP 包（WireGuard、OpenVPN 路由
  模式用 TUN）；
- **TAP（二层）**：接口上收发的是以太网帧，可以承载 ARP 等二层协议（网桥模式）。

要点：隧道两端各自需要「路由牵引」——把目标私网段指向隧道接口；隧道本身不改变路由协议，只
是提供了一条点对点的虚拟链路（可以直接配静态路由，也可以在隧道上跑 OSPF/BGP）。

## 3. 常见隧道协议对比

| 协议        | 标准          | 外层载体                    | 内层         | 加密 | 典型用途                       |
| :---------- | :------------ | :-------------------------- | :----------- | :--- | :----------------------------- |
| IPIP        | RFC 1853/2003 | IP（协议号 4）              | 单个 IP 包   | 无   | 最简单的 IP-in-IP，LVS TUN 用它 |
| GRE         | RFC 2784/2890 | IP（协议号 47）             | 几乎任意协议 | 无   | 多协议通用隧道、路由协议载体   |
| VXLAN       | RFC 7348      | UDP（端口 4789）            | 完整以太网帧 | 无   | 数据中心二层 Overlay、24 位 VNI 租户隔离 |
| GENEVE      | RFC 8926      | UDP（端口 6081）            | 以太网帧     | 无   | VXLAN 的演进，选项字段可扩展   |
| IPsec 隧道  | RFC 4301 系列 | IP（协议 50/51：ESP/AH）    | IP 包        | 有   | 站点到站点 VPN、加密专线替代   |
| WireGuard   | 现代加密协议  | UDP（常用端口 51820）       | IP 包        | 有   | 简洁高性能的点对点加密隧道     |

关键辨析：**GRE/IPIP/VXLAN 本身不加密**。很多人以为「打了隧道就安全」，实际上 GRE 明文里连
内层 IP 头都可读；需要保密性时选 IPsec/WireGuard，或在 GRE 外再套 IPsec（GRE over IPsec）。
加密与认证的完整方案见 [VPN 与隧道配置](networking/320-VPNConfig)。

## 4. 完整实验：GRE 打通两个私网

拓扑：站点 A（内网 192.168.10.0/24，出口 203.0.113.1）、站点 B（内网 192.168.20.0/24，出口
198.51.100.1），两台网关均为 Linux。

```bash
# ---- 站点 A 网关 ----
sudo ip tunnel add gre1 mode gre \
  local 203.0.113.1 remote 198.51.100.1 ttl 255
sudo ip addr add 10.255.0.1/30 dev gre1     # 隧道互联地址
sudo ip link set gre1 up
sudo ip route add 192.168.20.0/24 dev gre1  # 路由牵引：B 的私网走隧道

# ---- 站点 B 网关 ----
sudo ip tunnel add gre1 mode gre \
  local 198.51.100.1 remote 203.0.113.1 ttl 255
sudo ip addr add 10.255.0.2/30 dev gre1
sudo ip link set gre1 up
sudo ip route add 192.168.10.0/24 dev gre1

# ---- 开启转发（网关角色必须）----
sudo sysctl -w net.ipv4.ip_forward=1
```

验证与排障：

```bash
# 站点 A 内网主机 ping 站点 B 内网主机
ping -c 3 192.168.20.11
# 预期：3 个响应，通即表明「公网隧道已延续私网」

# 在网关抓隧道口：可见 GRE 封装（协议 47）与内层原始报文
sudo tcpdump -i gre1 -nn icmp
sudo tcpdump -i eth0 -nn 'ip proto 47 and host 198.51.100.1'
# 预期：eth0 上看到外层 203.0.113.1 > 198.51.100.1 的 GRE
```

VXLAN 的配置风格与之类似，但对象是二层：

```bash
# 创建 VNI=10 的 VXLAN 接口并挂入网桥（单播对端示例）
sudo ip link add vxlan10 type vxlan id 10 \
  local 203.0.113.1 remote 198.51.100.1 dstport 4789 dev eth0
sudo ip link set vxlan10 up
sudo ip link set vxlan10 master br0     # 多租户时每个 VNI 一个网桥
```

## 5. 抓包视角：隧道改变与不改变什么

抓包能直接验证封装结构：

```text
外层帧：  eth0 上：src=203.0.113.1 dst=198.51.100.1 proto=47(GRE)
GRE 头：  flags + protocol type（标识内层是什么协议）
内层包：  src=192.168.10.11 dst=192.168.20.11 proto=1(ICMP) —— 私网地址原样可见
```

这正是「GRE 不加密」的证据：公网中间设备抓包即可读出内层 IP 与载荷。换成 IPsec ESP 或
WireGuard 后，同样的位置只能看到密文。抓包工具的使用见
[Tcpdump 抓包分析](networking/270-Tcpdump)。

## 6. 陷阱与调试

1. **MTU 黑洞（隧道第一大坑）**：外层头占据开销——GRE 约 24 字节、IPIP 20 字节、VXLAN 约 50
   字节、WireGuard 约 60 字节。若内层接口仍按 1500 发包，封装后超 MTU 的包会被丢弃；小包
   ping 得通、大包传不动（如 SSH 能连上、`scp` 卡死）就是典型症状。处理：隧道接口 MTU 下调
   （`ip link set gre1 mtu 1460`），并确认 PMTUD 不被防火墙挡住（ICMP type 3 code 4）；
2. **外层协议被防火墙/NAT 设备拦截**：GRE 是 IP 协议号 47 不是端口，很多只能配「端口」的安
   全组/NAT 网关天然放不了 GRE——公有云上 GRE 打不通先查这里；VXLAN 走 UDP 4789 反而更容易
   穿越；
3. **忘记路由牵引或对称性**：隧道只有一端配了回程路由，表现为单向 ping 通（A 能 ping B，B
   的回包出不了隧道）；两端路由表都要覆盖对端私网；
4. **ip_forward 未开**：网关角色（两个私网互通）必须开转发，只配隧道不配转发，主机自身通、
   转发不通；
5. **VXLAN 混淆 VNI 与 VLAN**：VNI 是 24 位（约 1600 万），与 VLAN ID（4094）不在一个数量
   级，二者通过网桥/VLAN 子接口映射；别把 VLAN 号直接当 VNI 用；
6. **TTL 与环路**：GRE 配置遗漏 `ttl` 时默认 64，进入路由环路时内层包无法靠 TTL 自杀，排查
   环路时注意外层 TTL。

## 7. 小结

**初学者要点**

- 隧道 = 报文套报文：外层负责穿越中间网络，内层保持原始端到端语义；
- 记住三兄弟的分工：IPIP 最简（LVS TUN 模式用）、GRE 多协议通用（IP 协议号 47）、VXLAN 做二
  层 Overlay（UDP 4789，24 位 VNI）；
- Linux 上两步配通：创建隧道接口（`ip tunnel add`）+ 把目标网段路由指向它。

**进阶注意**

- GRE/IPIP/VXLAN 不加密，保密场景选 IPsec/WireGuard 或 GRE over IPsec；
- 大多数隧道故障是 MTU 与外层协议放行：先查隧道口 MTU 与 ICMP 3/4，再查安全组对协议 47 的
  支持；
- Overlay 网络把二三层虚拟化交给封装协议，运维心智从「接线」转向「配置 VNI 与路由」——这是
  云网络与 SDN（见 [SDN](networking/340-SDN)）的共同底座。
