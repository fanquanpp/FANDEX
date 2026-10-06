---
order: 630
title: IoT 与工控安全
module: 'cybersecurity'
category: 云与基础设施
difficulty: advanced
description: 物联网与工控系统安全：IoT 攻击面与固件分析（binwalk）、工控协议风险（Modbus/S7comm/DNP3）与纵深防御、CTF 入门路线、网络安全法律法规与渗透测试合规要求。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/585-BinaryExploitationPwn'
  - 'cybersecurity/590-ReverseEngineering'
  - 'cybersecurity/560-IncidentResponse'
  - 'cybersecurity/360-PenetrationTestingMethodology'
prerequisites:
  - 'cybersecurity/150-WebSecurityPenetrationTesting'
---

# IoT 与工控安全

## 知识点地图

- **知识类别**：特殊领域安全——物联网（IoT，设备侧）与工业控制系统（ICS/OT，产线侧）。这两个领域的共同点：设备长年不重启、不能随便打补丁、协议设计于安全意识普及之前。
- **解决什么问题**：Web 安全的方法论在这里大量失灵——目标不是跑在 x86 上的 Web 服务，而是 MIPS/ARM 固件、裸机协议、PLC 控制器；「打补丁」在产线上可能等于停线损失百万。本篇给出两个领域的攻击面地图、固件分析入口、工控协议风险表与纵深防御架构，并以 CTF 与法律法规收尾（这两节是安全从业者的「练兵场」与「护栏」）。
- **什么时候用到**：
  - 评估智能设备（摄像头、路由器、门锁）的采购与接入安全；
  - 甲方 OT 网络的安全评估与分区整改；
  - 安全研究的进阶方向：固件里的硬编码凭证与内存破坏漏洞；
  - 任何渗透测试项目开始前：先确认法律边界（第 5 节）。
- **与相邻篇目的分工**：固件里发现的二进制漏洞怎么利用，在 [二进制漏洞利用](/cybersecurity/585-BinaryExploitationPwn)；固件逆向分析的工具细节在 [逆向工程](/cybersecurity/590-ReverseEngineering)；OT 网络被入侵后的处置在 [应急响应](/cybersecurity/560-IncidentResponse)。本篇讲领域本身的攻防结构。

## 1. IoT 攻击面

| 攻击面       | 风险                     | 工具               |
| :----------- | :----------------------- | :----------------- |
| 固件         | 硬编码凭证、后门         | binwalk、Firmadyne |
| Web 管理界面 | 默认密码、命令注入       | Burp Suite         |
| 通信协议     | 明文传输、弱加密         | Wireshark          |
| 移动 App     | API 密钥泄露、不安全存储 | jadx、Frida        |
| 硬件接口     | UART/JTAG 调试口暴露     | 逻辑分析仪         |

五类攻击面里最独特的是**固件**与**硬件接口**：固件是「整个操作系统打成一个包」，可以离线拆开慢慢分析；UART 调试口是设备厂商自己的后门通道，很多时候拿个 USB-TTL 线接上就能拿到 root shell。Web 管理界面与 App 的分析手法与常规 Web/移动渗透一致（[Web 安全导览](/cybersecurity/150-WebSecurityPenetrationTesting)），差异只在目标架构。

## 2. 固件分析入门

```bash
# 提取固件
binwalk firmware.bin                    # 分析固件结构（识别嵌入的文件系统/内核）
binwalk -e firmware.bin                 # 自动提取

# 分析提取的文件系统
squashfs-root/
├── bin/          # 二进制文件
├── etc/          # 配置文件
│   ├── passwd    # 用户凭证
│   ├── shadow    # 密码哈希
│   └── config    # 设备配置
├── web/          # Web 管理界面
└── usr/bin/      # 用户程序

# 搜索硬编码凭证
grep -r "password" squashfs-root/etc/
grep -r "admin" squashfs-root/web/
find squashfs-root -name "*.cfg" -exec cat {} \;
```

固件分析三步走：

1. **拆包**：`binwalk -e` 自动识别 squashfs/cramfs/jffs2 等嵌入式文件系统并解出目录树；
2. **翻配置**：`/etc/passwd`、`/etc/shadow`（拿去 [Hashcat](/cybersecurity/460-Hashcat) 跑）、启动脚本、证书私钥——硬编码凭证几乎总是第一波收获；
3. **找二进制**：`usr/bin` 下的自研守护进程用 `file` 看架构（MIPS/ARM），扔进 QEMU 或 Firmadyne 模拟运行，漏洞分析走 [二进制漏洞利用](/cybersecurity/585-BinaryExploitationPwn) 的方法。

易错点：加密固件直接 binwalk 无有效输出时，先找 bootloader 或从 U-Boot 环境变量入手；解出的二进制是交叉编译的，本机跑不起来要配 qemu-user 或对应架构的动态链接库。

## 3. 工控系统安全

### 3.1 工控协议风险

| 协议       | 端口  | 安全问题          |
| :--------- | :---- | :---------------- |
| Modbus TCP | 502   | 明文、无认证      |
| S7comm     | 102   | 明文、无认证      |
| DNP3       | 20000 | 明文（可选认证）  |
| OPC DA     | 135   | DCOM 安全配置复杂 |
| IEC 104    | 2404  | 明文、无认证      |

这张表解释了工控安全的核心困境：**主流工控协议出生在「物理隔离即安全」的年代**，认证与加密根本不在设计里——Modbus 的一个写线圈报文就能改变 PLC 输出，没有任何身份验证。协议层短期内改不动，防御只能退到网络层。

### 3.2 工控安全防护

```
1. 网络隔离: IT/OT 网络物理/逻辑隔离
2. 纵深防御: 防火墙 → DMZ → 工控防火墙 → PLC
3. 协议白名单: 仅允许合法工控协议和操作
4. 入侵检测: 工控专用 IDS 规则
5. 安全运维: 变更管理、补丁管理、备份恢复
```

五条防线按部署顺序理解：IT 与 OT 网络之间先隔离（Purdue 模型的层级边界）；跨网必经 DMZ 区的中转（跳板、历史库）；工控防火墙做**协议白名单**——不只拦 IP/端口，还校验功能码（只放行读、拦写）；工控专用 IDS（如 Snort 的工控规则集）识别异常指令序列；最后是运维兜底——**补丁窗口与产线计划的协调**是 OT 安全管理与 IT 最大的差异，「下个季度大修时统一打补丁」是常态。合规侧对应等保 2.0 的工业控制系统安全扩展要求（框架见 [安全基线](/cybersecurity/520-SecurityBaseline) 第 3 节）。

## 4. CTF 夺旗挑战

### 4.1 CTF 题目类型

| 类型    | 内容                   | 推荐平台           |
| :------ | :--------------------- | :----------------- |
| Web     | SQL注入、XSS、代码审计 | CTFHub、BUUCTF     |
| Pwn     | 栈/堆溢出、ROP         | pwnable.kr、BUUCTF |
| Reverse | 逆向分析、算法还原     | Reversing.kr       |
| Crypto  | 密码学攻击、RSA/AES    | CryptoHack         |
| Misc    | 隐写、流量分析、取证   | CTFHub             |
| Mobile  | Android/iOS 逆向       | 看雪 CTF           |

### 4.2 学习路线

```
入门: CTFHub 技能树 → 掌握基础题型
进阶: BUUCTF 刷题 → 积累解题经验
实战: 参加线上 CTF 比赛 → 团队协作
提升: 复现真实漏洞 CVE → 深入理解原理
```

CTF 是本模块各专篇的「靶场总入口」：Web 题对应 Web 漏洞块、Pwn 题对应 [二进制漏洞利用](/cybersecurity/585-BinaryExploitationPwn)、Reverse 对应 [逆向工程](/cybersecurity/590-ReverseEngineering)、Misc 里的隐写对应 [隐写工具](/cybersecurity/600-SteganographyTools)。反过来，每学完一个专篇都能在对应分类里找到验证题——「学一篇、打一类」是消化这些知识最有效的节奏。

## 5. 网络安全法律法规

### 5.1 中国网络安全法律体系

| 法律法规                         | 施行日期   | 核心内容               |
| :------------------------------- | :--------- | :--------------------- |
| 《网络安全法》                   | 2017-06-01 | 网络运营者安全义务     |
| 《数据安全法》                   | 2021-09-01 | 数据分类分级、安全审查 |
| 《个人信息保护法》               | 2021-11-01 | 个人信息处理规则       |
| 《关键信息基础设施安全保护条例》 | 2021-09-01 | 关基设施保护要求       |

### 5.2 渗透测试合规要求

```
1. 必须获得书面授权（渗透测试授权书）
2. 明确测试范围、时间、限制条件
3. 不得超出授权范围进行测试
4. 发现重大漏洞及时报告，不得利用
5. 测试数据保密，不得泄露
6. 测试完成后清除所有测试痕迹
7. 出具正式报告，提出修复建议
```

这七条是本模块所有「攻击」操作的护栏，任何渗透项目开工前逐条核对——授权书里的「范围」精确到 IP 与功能，超范围扫描即违法。方法论侧的完整流程约束见 [渗透测试方法论](/cybersecurity/360-PenetrationTestingMethodology) 第 5 节。

## 6. 与之前和之后的知识的关系

- 往前：[Web 安全导览](/cybersecurity/150-WebSecurityPenetrationTesting) 的方法论（信息收集→漏洞分析→利用）在 IoT 的 Web 管理界面上原样适用；[二进制漏洞利用](/cybersecurity/585-BinaryExploitationPwn) 承接固件二进制的利用分析；
- 旁支：固件逆向的工具链在 [逆向工程](/cybersecurity/590-ReverseEngineering)；口令哈希提取后的破解在 [Hashcat](/cybersecurity/460-Hashcat)；
- 往后：IoT/OT 事件的应急处置在 [应急响应](/cybersecurity/560-IncidentResponse)；OT 网络监测的规则建设在 [IDS/IPS 命令](/cybersecurity/480-IDSIPSCommands)。

## 7. 自我检查

- 能列出 IoT 的五类攻击面，并说出固件与硬件接口为什么是 IoT 特有的；
- 能用 binwalk 完成「识别-提取-搜凭证」三步，并说出加密固件的入手点；
- 能复述工控五条防线，并解释「协议白名单」与普通防火墙规则的差别；
- 能对照第 5.2 节的七条合规要求，说出一支渗透小队的开工前置清单。

## 本章总结

IoT 与工控把安全问题带回「资源受限、不可停机、协议裸奔」的物理世界：设备侧从固件拆包（binwalk 三步走）与调试口入手，产线侧承认协议无认证的现实、退而构建隔离-白名单-专用检测的纵深体系。CTF 是全模块知识的练兵场（一题验证一类专篇），法律法规与七条合规要求是所有攻击性工作的护栏。领域会变、协议会变，「先授权、再动手」永远不变。

## 参考与致谢

- 本文 IoT 攻击面表、工控协议风险表、工控五条防线、CTF 题型与学习路线、法律法规两节整体保留自本仓库拆分前的同名文件（本文件由「二进制安全与应急响应」拆分重组而来，原二进制漏洞利用三节移入 [二进制漏洞利用](/cybersecurity/585-BinaryExploitationPwn)，原日志/取证/流量三节移入 [应急响应](/cybersecurity/560-IncidentResponse)）；
- 固件分析工具（binwalk，MIT 许可；Firmadyne，GPL-3.0）能力描述参考各自官方仓库；
- 等保 2.0 扩展要求框架与 [安全基线](/cybersecurity/520-SecurityBaseline) 交叉引用；
- 其余讲解文本为原创。
