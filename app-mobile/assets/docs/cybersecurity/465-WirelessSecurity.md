---
order: 500
title: 无线网络安全
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 无线网络安全专篇：WPA2-PSK 与 WPA3-SAE 握手差异与降级攻击、aircrack-ng 四步工作流（监控模式、抓握手包、字典跑包、破解研判）、WPA-Enterprise 与 802.1X、rogue AP 与 Karma 攻击、BLE 嗅探与授权法律边界。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/360-PenetrationTestingMethodology'
  - 'cybersecurity/460-Hashcat'
  - 'cybersecurity/480-IDSIPSCommands'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
  - 'cybersecurity/360-PenetrationTestingMethodology'
---

# 无线网络安全

## 知识点地图

- **知识类别**：无线（Wi-Fi/BLE）安全——物理层之上的接入认证与空口流量防护。这是本模块此前完全缺失的维度：红队打点往往从「停车场里的 Wi-Fi」开始，企业边界再牢固，一个弱口令 SSID 就绕过了全部防火墙。
- **解决什么问题**：无线把「接入」从插网线变成了广播——任何人在信号范围内都能参与。要回答三件事：WPA2/WPA3 的四次握手到底在验证什么、为什么抓到握手包就能离线爆破、企业级（802.1X）与家用级（PSK）的防御差距在哪。以及攻：aircrack-ng 四步工作流的每一步在做什么。
- **什么时候用到**：
  - 企业办公网巡检：盘点 SSID、加密方式、信号覆盖外溢范围；
  - 红队项目外围打点：先查目标机构的无线（访客网、printer 直连、隐藏 SSID）；
  - 智能家居/物联网评估：BLE 配对嗅探、设备与云端通信审计（固件侧见 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity)）；
  - 防御侧：rogue AP 检测与无线入侵规则（配合 [IDS/IPS](/cybersecurity/480-IDSIPSCommands)）。
- **素材与致谢**：本文工具用法依据 Kali 官方工具文档（aircrack-ng 套件）与 Wi-Fi 联盟 WPA3 说明（公开资料），文末注明；无本机扫描素材。

## 1. 心智模型：四次握手在验证什么

Wi-Fi 加密的演进是一条「握手协议修复史」：

| 标准 | 年代 | 认证方式 | 核心弱点 |
| --- | --- | --- | --- |
| WEP | 1999 | RC4 静态密钥 | 已彻底攻破（数分钟），仅存于博物馆 |
| WPA | 2003 | TKIP | 过渡方案，已淘汰 |
| WPA2-PSK | 2004 | 四次握手 + CCMP(AES) | 握手包可离线爆破；支持 SAE 前的个人网主流 |
| WPA3-SAE | 2018 | SAE（Dragonfly 握手） | 抵抗离线字典爆破；早期实现有过侧信道漏洞（Dragonblood） |
| WPA2/WPA3-Enterprise | - | 802.1X/EAP | 企业级，每用户独立凭证 |

**WPA2-PSK 的四次握手**（4-way handshake）解决的问题是：客户端与 AP 都知道预共享密钥（PSK，就是那条 Wi-Fi 密码），但密钥不能明文传——双方用 PSK + 随机数（ANonce/SNonce）各自推导出会话密钥，四次报文互相确认「我们算出的是同一把」。关键弱点：**握手里含有可用于离线验证猜测的材料**——攻击者抓到握手包后，对每个候选密码「推导会话密钥、校验 MIC」，命中即破解。这就是「抓握手包 + 字典」攻击的原理：爆破发生在本地，AP 毫无感知。

**WPA3-SAE 的修复**：SAE（Simultaneous Authentication of Equals）用「密码元素」（password element）承诺机制替代直接传递可验证材料——每次握手引入随机性，抓包后**每个候选密码都要在线逐次验证**，离线字典爆破不再可行。降级风险由此而来：WPA3 过渡模式下 AP 同时支持 WPA2，攻击者伪造管理帧诱导客户端用 WPA2 重连，抓的又是可离线爆破的握手——**部署 WPA3 必须「WPA3-only」或至少关闭过渡，否则安全承诺打折**。

## 2. aircrack-ng 四步工作流

从「看到网络」到「验证弱口令」的完整链路（在**自有或书面授权**的网络上操作）：

### 第一步：开监控模式

```bash
# 识别无线网卡与驱动支持
airmon-ng

# 开启 monitor 模式（wlan0 变为 wlan0mon）
airmon-ng start wlan0

# 确认：iwconfig 应看到 Mode:Monitor
iwconfig
```

监控模式让网卡接收**所有**空口帧而不只发给自己的——这是后续一切的前提。坑：NetworkManager 会抢管网卡，先 `airmon-ng check kill` 停掉它；虚拟机里的 USB 网卡要直通给客户机。

### 第二步：定位目标并抓握手包

```bash
# 扫描全网：看 SSID、信道、加密、信号强度、客户端数
airodump-ng wlan0mon

# 锁定目标信道定向抓包，-w 存盘（授权目标：本实验室 AP）
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon
```

`airodump-ng` 右下角的 STATION 列表就是已连接客户端——握手包只在**客户端（重）连入网的瞬间**出现，干等可能要等很久，于是第三步。

### 第三步： deauth 逼出握手

```bash
# 向 AP 发解除认证帧，逼客户端重连以触发新握手
aireplay-ng -0 1 -a AA:BB:CC:DD:EE:FF -c 客户端MAC wlan0mon
```

deauth 是「管理帧无认证」这一 802.11 原始设计缺陷的直接利用——任何人都能伪造「AP 请你下线」。这也正是 rogue AP 与 Karma 攻击的土壤（第 4 节）。抓到握手包的标志：airodump-ng 右上角出现 `WPA handshake: AA:BB:CC:DD:EE:FF`。

### 第四步：离线爆破与研判

```bash
# aircrack-ng 配字典跑握手包
aircrack-ng -w rockyou.txt -b AA:BB:CC:DD:EE:FF capture-01.cap

# 更快的 GPU 路线：先转 hashcat 格式（模式 22000）
hcxpcapngtool capture-01.cap -o hash.22000
hashcat -m 22000 hash.22000 rockyou.txt
```

**破解研判**——拿到密码后的三问：这个密码暴露了什么规律（公司名+年份？电话号？）；同规律密码还出现在哪（其他 SSID、VPN、路由器管理口——口令复用是无线突破扩散到内网的主通道）；建议的整改（换 WPA3、密码策略、访客网隔离）。跑包的字典与规则体系与 [Hashcat](/cybersecurity/460-Hashcat) 完全共用。

## 3. 企业级：WPA-Enterprise 与 802.1X

PSK 的结构性缺陷是「所有人共享一个密码」——一人泄露全员重置，离职无差别。企业级答案是把「认证」从 AP 剥离给 RADIUS 服务器：

```text
[客户端 supplicant] --EAP--> [AP 认证者] --RADIUS--> [认证服务器]
                                                    (FreeRADIUS / NPS / Cisco ISE)
```

- **802.1X** 是端口认证框架；EAP 方法里 **EAP-TLS**（双向证书认证）最彻底——客户端也验证服务器证书，天然抵抗假 AP（第 4 节）；PEAP-MSCHAPv2 部署更简单但要用「证书校验 + 域账号强策略」补强；
- 每用户独立凭证：可精确吊销、可审计到人；配合 MDM/证书自动下发实现全自动入网；
- **访客网隔离**是巡检必查项：访客与办公网必须 VLAN/防火墙隔离（策略见 [防火墙配置](/cybersecurity/470-FirewallConfig)），访客 Portal 不放行内网段。

巡检清单（防御视角五条）：全 SSID 盘点（含隐藏 SSID 与「影子 AP」——私接的随身路由）；加密方式台账（WEP/WPA 一票整改为 WPA2/WPA3）；信号覆盖外溢测绘（办公区之外还能连上的 SSID 就该调功率）；PSK 轮换记录；rogue AP 监测开启。

## 4. Rogue AP 与 Karma 攻击

- **Evil Twin（双面恶邻）**：攻击者架一个同名 SSID + 更强信号，诱导客户端连上后做中间人（抓凭据、注入流量）。防御靠 802.1X 的服务器证书校验——客户端发现「企业证书对不上」就拒绝；
- **Karma 攻击**：早期客户端会「主动广播自己记得的 SSID 列表」找网，Karma AP 来者不拒——设备找什么网就冒充什么网。现代系统已默认不再主动广播（改为被动侦听 Beacon），但旧 IoT 设备与错误配置的终端仍会中招；
- **MANA/认知 Karma**：对被动客户端伪造历史 PNL（Preferred Network List）的高级变体——红队用途，防御端没有客户端修复时只能靠无线监控告警。

无线 IDS 的检测思路：同一 SSID 出现两个不同 BSSID、deauth 帧速率异常、非授权 AP 出现在办公信道——规则化后并入 [IDS/IPS](/cybersecurity/480-IDSIPSCommands) 的监测体系。

## 5. BLE 与智能家居设备

BLE（低功耗蓝牙）的攻击面与 Wi-Fi 不同：**配对/绑定**阶段与 GATT 服务访问。入门评估三件事：

1. **嗅探**：BLE 4.0+ 的加密链路要先拿到配对密钥才能解密；Legacy Pairing（未用 LE Secure Connections）的 TK 分发可被 MITM 场景破解——nRF Sniffer + Wireshark 是标准组合；
2. **GATT 枚举**：手机 App 能看到的特征值（characteristic），攻击者也能——「写一个特征值就能开门」的设备并不罕见，评估时先枚举所有可写特征；
3. **配对模式研判**：Just Works（无保护）对 MITM 零抵抗；带数字比较/Passkey 的配对才有 MITM 防护。智能家居评估的产出通常是「App 到云端 TLS 正常，但设备本地 BLE 无认证」这类分层结论。

## 6. 授权与法律边界

无线渗透的独特风险：**信号不认墙**。你的天线覆盖到的可能包含邻居网络与无关公共网络——授权书必须写清目标 SSID/BSSID 清单与操作信道；扫描与 deauth 对未授权网络同样违法，deauth 在不少辖区还被单独定性为「拒绝服务」。开工前的三件套：书面授权（范围精确到 BSSID）、独立实验环境（自家 AP + 自购网卡）、全程时间戳记录。法律框架与七条合规要求见 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity) 第 5 节。

## 7. 动手实践

### 练习一：企业办公网巡检报告（防御视角）

任务：对办公室（自有/授权）做一次无线巡检，产出：SSID 台账（加密方式/信道/信号外溢）、rogue AP 嫌疑名单、三条整改建议。
提示：airodump-ng 扫一轮就有台账原料；「外溢」用走动观察信号强度衰减估算；自查清单见第 3 节五条。

参考思路（先自己巡，再看要点）：报告的价值在「台账 + 责任到人」——每个 SSID 标注归属（IT 配的/私接的/供应商的）；整改建议落到具体动作（关过渡模式、收功率、访客网隔离验证）而非「加强管理」。

### 练习二：自家 AP 的握手包实验

任务：把家里路由器开 WPA2，用练习环境抓一次自己手机的握手包（连接 + deauth 各来一次），再用 hashcat 跑一个 5 个候选密码的小字典验证链路。
提示：deauth 发 1 次就够；抓不到握手检查网卡是否真的进了 monitor 模式、是否锁对了信道。

参考思路（先自己做，再看）：这条链路验证的是「抓包-转换-跑包」工具链可用，密码是否跑出无关紧要；然后把路由器切到 WPA3-only 重复抓包，观察 `hcxpcapngtool` 能否拿到可爆破材料——对比正是第 1 节 SAE 结论的实证。

### 练习三（工程场景）：红队外围打点的无线开局

任务：假设进入一个授权红队项目，写出「无线评估」阶段的执行单：目标清单获取、监测时长、产出物。
提示：外围打点目标是「不进楼也拿到边界入口」——访客网、打印机直连、员工手机热点都是入口候选；产出要能衔接内网渗透阶段（跳板见 [渗透测试方法论](/cybersecurity/360-PenetrationTestingMethodology)）。

参考思路（先自己写，再看）：执行单三段——前期（申请 BSSID 清单授权、设备与天线选型）、现场（24-48 小时被动侦听优先、主动操作逐项报备）、交付（SSID 台账、可利用入口、口令规律分析、整改建议）；全程强调被动收集优先，主动干扰最小化。

## 8. 实际项目中的使用场景

- **企业巡检与整改**：第 3 节五条清单是甲方安全评估的标准项；
- **红队外围**：无线经常是绕过网络边界的最短路径；
- **IoT 评估**：BLE 嗅探 + 固件分析（[IoT 与工控安全](/cybersecurity/580-IoTOTSecurity)）组成设备侧完整评估；
- **安全运营**：rogue AP/deauth 监测规则并入无线 IDS，事件进 [应急响应](/cybersecurity/560-IncidentResponse) 流程。

## 9. 与之前和之后的知识的关系

- 往前：[渗透测试方法论](/cybersecurity/360-PenetrationTestingMethodology) 的授权与流程约束直接约束本章所有操作；[防火墙配置](/cybersecurity/470-FirewallConfig) 的访客网隔离策略是无线整改的落地端；
- 旁支：跑包的字典/规则/GPU 调优与 [Hashcat](/cybersecurity/460-Hashcat) 完全共用；BLE 设备的固件与云通信审计在 [IoT 与工控安全](/cybersecurity/580-IoTOTSecurity)；
- 往后：无线是「人」之外的第二条非技术边界入口，[社会工程学与钓鱼防护](/cybersecurity/365-SocialEngineering) 讲另一条；监测与事件处置分别归 [IDS/IPS](/cybersecurity/480-IDSIPSCommands) 与 [应急响应](/cybersecurity/560-IncidentResponse)。

## 10. 官方文档

- aircrack-ng 官方文档（GPL-2.0）：https://www.aircrack-ng.org/documentation.html
- Wi-Fi 联盟 WPA3 说明：https://www.wi-fi.org/discover-wi-fi/wi-fi-wpa3
- hashcat hash 模式对照表（22000 = WPA-PBKDF2-PMKID+EAPOL）：https://hashcat.net/wiki/doku.php?id=example_hashes
- 802.1X 端口认证概览（IEEE 标准背景）：https://www.ieee802.org/1/pages/802.1x.html
- Dragonblood 分析（WPA3 早期实现漏洞，公开论文）：https://wpa3.mathyvanhoef.com/

## 11. 自我检查

- 能画出 WPA2 四次握手的信息流，并解释「为什么抓到握手就能离线爆破」；
- 能说出 WPA3-SAE 挡住离线爆破的机制，以及过渡模式引入的降级风险；
- 能按顺序默写 aircrack-ng 四步工作流的每条核心命令与其目的；
- 能解释 802.1X/EAP-TLS 为什么天然抵抗 Evil Twin，而 PSK 为什么不能；
- 能复述无线渗透的授权三件套，并说出 deauth 的额外法律风险。

## 本章总结

无线安全的核心是「接入认证」的演进：WPA2-PSK 的四次握手把可验证材料暴露在空口，抓包即得离线爆破的原料；WPA3-SAE 用承诺机制堵死离线路径，但过渡模式会从后门把 WPA2 拉回来——安全取决于最弱的那一侧。攻的路线是 aircrack-ng 四步（监控、定向抓包、deauth 逼握手、离线跑包），与企业巡检的防御路线在同一张 SSID 台账上交汇；企业级的正解是 802.1X 把认证收归 RADIUS，EAP-TLS 的双向证书校验顺手解决假 AP 问题。信号不认墙，所以无线渗透的授权要精确到 BSSID；设备不止 Wi-Fi，BLE 的配对模式与 GATT 权限是智能家居评估的独立战场。

## 参考与致谢

- aircrack-ng 套件各命令用法参考其官方文档（aircrack-ng.org，GPL-2.0 许可）；
- WPA3/SAE 的能力描述参考 Wi-Fi 联盟公开说明与 Dragonblood 研究论文（公开资料）；
- 802.1X/EAP 的架构描述参考 IEEE 802.1X 标准公开材料；
- 本文为本批次新增，无本机扫描素材；其余内容为原创。
