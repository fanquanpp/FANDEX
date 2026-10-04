---
order: 40
title: 网络实验环境与模拟器
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: 网络是操作性知识：eNSP 与 HCL 两台模拟器的选型与安装坑、最小互联实验、四种典型组网、抓包入口与「拓扑即文档」的实验方法论。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'networking/010-NetworkBasicsAndProtocol'
  - 'networking/270-Tcpdump'
  - 'networking/190-NetworkDiagnosis'
  - 'networking/165-VLANAndTrunk'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：网络分层模型（见 [网络基础与协议](networking/010-NetworkBasicsAndProtocol)）。
本文是模块内所有动手实验的「第零步」：先把实验室搬进自己的电脑。

## 为什么第一课是搭实验环境

网络知识有一个特点：读懂了和会了之间隔着一条鸿沟。路由表、VLAN、STP 这些概念在书面上
各成体系，只有亲手把两台设备连起来、配错一个参数、看着 ping 不通再一步步排回来，概念
才会长出肌肉记忆。但真机实验室有三个现实问题：设备昂贵、配置不可逆（一条命令可能断网）、
无法每人一套。

模拟器（Network Simulator）一次解决三件事：设备是虚拟机、配置随时回滚、一台笔记本就是
一间实验室。本模块后续的 VLAN、路由、Keepalived 实验，都默认你有这样一套环境。

## 平台选择：命令行方言先看清楚

| 平台 | 厂商与系统 | 命令风格 | 适用 |
| --- | --- | --- | --- |
| eNSP | 华为，VRP 系统 | `system-view`、`port link-type trunk` | 华为系认证与国内项目 |
| HCL（H3C Cloud Lab） | 新华三，Comware V7 | `system-view`、`port link-type trunk` | H3C 系认证与项目 |
| Packet Tracer / GNS3 / EVE-NG | Cisco 系或通用 | IOS 风格 | Cisco 系学习 |

华为 VRP 与 H3C Comware 是两套独立实现，**大量命令字面相同、细节行为不同**（比如
`display` 与 `show` 的取舍、缺省路由写法、用户角色体系）。本模块文档中的厂商配置示例
都会标注平台；自己动手时**同一实验固定用一个平台做完**，混用平台是新手实验「明明照抄
却报错」的第一原因。以下以 HCL 为主展开（安装坑最典型），eNSP 的对应操作在同位置。

## 安装与第一次启动：坑都在这里

模拟器本质是「宿主机上的虚拟化管理器 + 一堆设备虚拟机」，所以故障几乎都出在虚拟化层：

1. **BIOS 虚拟化没开（第一大坑）**：宿主机 CPU 必须支持并启用 VT-x/AMD-V。没开的表现
   很有迷惑性——设备启动极慢、命令行黑屏无回显，新手会误以为设备坏了或自己操作错了。
   处理：进 BIOS 开启虚拟化，任务管理器「性能」页能看到「虚拟化：已启用」。
2. **路径与用户名不能用中文**：安装路径或 Windows 用户名含非 ASCII 字符会直接启动失败
   （报「系统用户名中包含非 ASCII 字符」之类）。虚拟化底座（VirtualBox）同样不允许
   中文路径。
3. **设备内存别贪大**：单台设备内存建议不超过 1024M；OSPF、BGP 这类协议吃内存，内存
   压缩过度时邻居状态到不了 Full，表现为「协议配了就是不收敛」。
4. **设备起不来**：多半是上次异常退出留下的残留虚拟机（如 Simware_Base 与 topo-device
   虚拟机），清掉残留、结束后台虚拟化进程再重试。
5. **端口冲突**：本机管理端口（如 127.0.0.1:16600）被占用时无法连接，换端口或释放
   占用进程。
6. **规模边界提前知道**：单台设备最多约 7 条连线、单个工程进程最多 50 台设备；端口
   隔离、Netconf、SR/SRv6 等依赖硬件芯片或高版本平台的功能不支持——实验做不出来先查
   能力边界，别先怀疑自己。

## 最小实验：两台路由器互通

所有模拟器实验都遵循同一套四步节奏：**拖设备 → 连线 → 启动 → 进命令行**。用两台
MSR36-20 路由器做全网最小的互通实验（十行配置，跑通后你会拥有完整的「排错基线」）：

```text
拓扑：  R1 GE0/0 ────── GE0/0 R2
地址：  R1 GE0/0 = 192.168.12.1/24，R2 GE0/0 = 192.168.12.2/24
```

Comware V7 参考（HCL）：

```text
<R1> system-view
[R1] interface GigabitEthernet0/0
[R1-GigabitEthernet0/0] ip address 192.168.12.1 24
[R1-GigabitEthernet0/0] quit
[R1] ping 192.168.12.2
```

VRP 参考（eNSP，接口编号通常是 GE0/0/0）：

```text
<R1> system-view
[R1] interface GigabitEthernet0/0/0
[R1-GigabitEthernet0/0/0] ip address 192.168.12.1 24
[R1-GigabitEthernet0/0/0] quit
[R1] ping 192.168.12.2
```

两个平台注意同样的三件事：接口默认是**关闭**还是开启（Comware 的部分接口需要
`undo shutdown`）、直接连线的两端必须在同一网段、ping 从任意一端发起都应通。这个实验
值得练到「闭眼配通」，因为它是后续一切复杂拓扑的验收单元——任何大实验排错到最后，
都会退化成若干个这样的两两互通检查。

## 四种典型组网：从单机到跨物理

按递进顺序掌握模拟器的四种连接形态，之后任何实验环境需求都能组合出来：

1. **同机互联**：同一工程里两台虚拟设备直接连线——即上面的最小实验，一切的基础。
2. **虚拟设备与宿主机互通**：拓扑里放一个 Host（云/桥接设备）绑定 VirtualBox 的
   Host-Only 网卡，设备接口与该网卡同网段；之后可以从宿主机用 PuTTY/Telnet 登录设备
   命令行（设备侧先 `telnet server enable` 并放通 VTY 认证）。这一步把「模拟器里的
   网络」和「你电脑上的工具」接通——抓包、脚本、自动化工具都从这里进场。
3. **虚拟设备与物理设备互通**：Host 绑定宿主机的物理网卡，网线接真机，虚拟口与真机
   口同网段验证。适合把手头的真实交换机拉进实验（注意：模拟器仅支持以太网口互通）。
4. **跨 PC 组网（Remote 模式）**：大拓扑两台电脑分担——各建工程，各放一台 Remote
   代理设备互填对端 IP 与工程名，接口之间用同名隧道对接。日常学习用不到，知道有这条路。

## 抓包：模拟器的「透视眼」

模拟器最强的教学功能是**在任意连线上直接抓包**：右键连线，选择接口，启动 Wireshark，
该链路上的每个报文都以真实封装呈现。注意 Wireshark 窗口打开后不会自动刷新，需要手动
点刷新；停止与导出都在连线的右键菜单。

它是本模块几个主题的标配验证工具：

- ARP 解析过程：抓到广播请求与单播应答（见 [ARP 与路由](networking/060-ARPRouting)）；
- VLAN 802.1Q 标签：access 口无标签、trunk 口带 4 字节标签（见
  [VLAN 与跨 VLAN 互通](networking/165-VLANAndTrunk)）；
- VRRP 通告：协议 112 组播报文与主备切换（见
  [Keepalived 双机热备](networking/250-KeepalivedDualHotStandby)）；
- ICMP 与 traceroute 的 TTL 行为（见 [ping 与 traceroute](networking/080-PingTraceroute)）。

命令行版的抓包分析（tcpdump/tshark）见 [Tcpdump 抓包分析](networking/270-Tcpdump) 与
[Wireshark CLI](networking/280-WiresharkCLI)；模拟器抓包的优势是**控制变量**——链路上
只有你生成的流量，没有宿主机噪声。

## 实验方法论：拓扑即文档、验收即排错

两个习惯能把实验从「照抄命令」升级为「学得会的东西」：

**拓扑即配置文档。** 模拟器的拓扑存档文件（如 HCL 的 `.topo`，本质是 XML）里内嵌着每
台设备的型号、接口与 PC 的 IP/掩码/网关参数。用文本编辑器打开它，就能核对整张实验的
IP 规划——「实验报告」不必另写，拓扑文件加一份地址规划表就是可复现的全部信息。把每
个实验的地址规划写下来（设备、接口、IP、用途四列），排错时先对表再敲命令。

**分层验收。** 复杂实验不要配完再一次性验证，每完成一层就验收一层：

```text
物理层：连线状态、接口 up（display interface / display this）
链路层：VLAN 划分、trunk 放行（display vlan / display port vlan）
网络层：直连同段 ping 通 → 网关 ping 通 → 跨网段路由通
应用层：telnet/http 等具体服务验证
```

ping 不通时的固定排查序：先查接口 up 与 IP 配置（`display ip interface brief`），再查
链路层（VLAN/端口归属），最后查路由表（`display ip routing-table`）。这条顺序与
[网络诊断](networking/190-NetworkDiagnosis) 的排错金字塔完全一致——模拟器里练熟的
手法就是将来在真机上的手法。

## 常见坑

1. **平台混抄**：VRP 的命令抄进 Comware（或反过来），报错后逐字检查却查不出问题——
   先确认命令属于哪个平台；
2. **接口编号想当然**：GE0/0（Comware）与 GE0/0/0（VRP）、槽位从 0 还是从 1 计，各
   平台不同，以 `display interface brief` 的实际输出为准；
3. **PC 配了 IP 没配网关**：单网段实验全部通过，跨网段实验全部失败——PC 的网关要填
   对端网段的三层接口地址；
4. **配置没保存就关工程**：模拟器关机不保存运行配置，验收前先 `save`（设备视图），
   拓扑归档前确认 `.topo` 与设备配置都在；
5. **把模拟器行为当真机行为**：不支持的功能（见安装坑第 6 条）做不出结果不代表真实
   设备不行；实验结论要标注「HCL V5.x 下验证」这样的环境信息。

## 实践

环境搭建题（15 分钟）：完成模拟器安装，截图或记录以下四项证据：虚拟化已启用、模拟器
主界面可打开、一台设备能正常启动、命令行可输入。验收：设备命令行里执行
`display version`（或 `display current-configuration`）有正常回显。

提示：装不上时按第 3 节的坑逐条自查——顺序是虚拟化、路径、残留进程、端口冲突，每项
都有对应的报错特征。

最小互通题（10 分钟）：完成两台路由器互通实验。验收：任一端 `ping 192.168.12.2`
显示 5 个回包全收（0% loss）；然后故意把 R2 的 IP 改成 `192.168.13.2`，观察 ping 失败
现象，再用 `display ip interface brief` 找回病因。

提示（思路方向）：这题练的是「制造故障再修复」的完整循环。先自己造错，再对照排查路径：

```text
ping 失败（超时）→ 两端接口同网段吗 → display ip interface brief 看 GE0/0 地址
→ 发现 192.168.13.2/24 → 改回 192.168.12.2 → ping 恢复
```

抓包题（15 分钟）：在两台路由器的互联链路上启动抓包，从 R1 发起一次 ping，在 Wireshark
里找到 echo request 与 echo reply。验收：能说出报文的三层信息（源目 IP、协议号 1）
与二层信息（源目 MAC），并解释为什么两端 MAC 与两端 IP 一一对应。

提示：链路上只有两个直连设备，MAC 是接口的出厂/生成地址；request 与 reply 的源目字段
互换。这道题的产出物（一张抓包截图）会在 [ARP 与路由](networking/060-ARPRouting) 的
实验里被再次引用。

规划题（10 分钟）：为「两台交换机 + 4 台 PC」的拓扑写一份地址规划表（设备、接口、
IP、用途），IP 用 192.168.100.0/24 划分，网关占 .1。验收：表格四列齐全，且任意两台
PC 的地址不冲突；这份表是 [VLAN 与跨 VLAN 互通](networking/165-VLANAndTrunk) 实验一
的输入。

提示（思路方向）：先分配网段再分配主机位，网关统一用网段第一个可用地址是团队惯例；
拓扑存档文件里的 PC 参数（IP/掩码/网关）应与你写的表格一致——对照一遍，体会「拓扑即
文档」。

## 下一步

- 有了环境，第一组正式实验是 VLAN 划分与跨 VLAN 路由：
  [VLAN 与跨 VLAN 互通](networking/165-VLANAndTrunk)；
- 抓包分析的命令行进阶：[Tcpdump 抓包分析](networking/270-Tcpdump)；
- 实验里排错手法背后的完整方法论：[网络诊断](networking/190-NetworkDiagnosis)。
