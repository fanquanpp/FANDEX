---
order: 150
title: 网络诊断工具
module: 'shell'
category: 工具链
difficulty: beginner
description: Shell 场景的网络诊断速查：ping/traceroute 连通性、dig/nslookup 的 DNS 排查、ss/lsof/netstat 三代端口占用、curl 排查姿态与 ufw 防火墙，附跨平台命令对照。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'shell/140-CrossPlatformCommandLine'
  - 'shell/120-TroubleshootingGuide'
  - 'networking/090-SSNetstat'
prerequisites:
  - 'shell/130-CommandLineBasics'
---

## 知识点地图

- **知识类别**：命令行网络诊断——连通性测试、DNS 查询、端口占用排查、HTTP 探测、防火墙开关的 shell 工具面。
- **解决什么问题**：服务起不来（端口被占）、接口不通（网络/DNS 问题）、防火墙拦了（端口没放行）——开发机与服务器上最高频的三类网络故障，用几条命令定位。
- **什么时候用到**：`EADDRINUSE` 报错时、接口突然 4xx/5xx 时、改了 hosts 不生效时；本篇定位是 **shell 场景的速查与跨平台对照**。

**与 025-networking 模块的分工**（跨模块划界）：networking 模块已有整套协议与工具正篇——连通性与路由原理（networking/080-PingTraceroute）、ss/netstat 深入（networking/090-SSNetstat）、DNS 解析深入（networking/110-DigNslookup）、curl 与 HTTP 协议（networking/130-CurlHTTPRequest）、nc/nmap（networking/260-NetcatNmap）、抓包分析（networking/270-Tcpdump）。**协议原理、抓包分析、工具的深度参数让位上述正篇；本篇讲跨平台命令差异与 shell 排障的组合套路**（ss/lsof 在不同平台的可用性、ufw 与 Windows/macOS 防火墙的对照是 networking 未覆盖的部分）。

## 1. 连接测试：ping 与 traceroute

（搬移自 140 号第 5.1 节并扩写。）

```bash
ping -c 4 google.com      # 测试连通性（-c 4 发 4 个包后停止；Windows 默认 4 个，Linux/macOS 不加会一直发）
traceroute google.com     # 跟踪路由路径（Windows 对应 tracert）
mtr google.com            # 持续跟踪路由（推荐，动态刷新每一跳）
```

排障读法：ping 通但业务不通 → 问题在应用层（端口、服务），ping 只测 ICMP；ping 不通但 traceroute 有一跳返回 → 问题在那一跳之后的网络策略；mtr 把 traceroute 的每一跳丢包率实时化，找「从哪一跳开始丢」比 ping 端到端更快。原理与参数深入见 networking/080-PingTraceroute。

## 2. DNS 查询：dig / nslookup / host

（搬移自 140 号第 5.2 节并扩写。）

```bash
nslookup google.com       # DNS 查询（三平台都有，最通用）
dig google.com            # 详细 DNS 查询（Linux/macOS）
dig +short google.com     # 只显示 IP 地址
host google.com           # 简洁 DNS 查询
```

排查 DNS 时的组合：

```bash
dig google.com +short                     # 当前解析结果
dig @8.8.8.8 google.com +short            # 指定 DNS 服务器对比（绕过本地缓存）
ipconfig /displaydns                      # Windows：查看本机 DNS 缓存
ipconfig /flushdns                        # Windows：清空 DNS 缓存
sudo systemd-resolve --flush-caches       # Linux (systemd)：清空缓存
```

「改了 hosts 不生效」九成是缓存：浏览器自己的 DNS 缓存、系统缓存、nscd/systemd-resolved 三层都可能留旧值——按「浏览器重启 → 系统清缓存」顺序逐层排除，原理见 networking/110-DigNslookup。

## 3. 端口与连接：ss / lsof / netstat 三代

（搬移自 140 号第 5.3 节并扩写。）

```bash
# 查看端口占用
ss -tlnp                  # 查看所有监听端口（netstat 的现代替代，Linux）
lsof -i :8080             # 查看占用 8080 端口的进程（Linux/macOS 通用）

# 网络请求与连通性
curl -I https://example.com        # 只看响应头
wget https://example.com/file.zip  # 下载文件
nc -zv localhost 3306              # 测试端口连通性
```

三代工具的谱系与平台可用性：

| 工具 | 状态 | 平台 | 适用 |
| :--- | :--- | :--- | :--- |
| netstat | 老牌、已过时 | 三平台都有（参数各异） | 只在老系统上用 |
| ss | 现代、更快 | 仅 Linux | Linux 首选 |
| lsof | 经典 | Linux/macOS | 「哪个进程占的端口」最快答案 |

`netstat -tlnp` 仍可用，但 Linux 新系统逐渐以 `ss` 为主；**Windows 上三者都没有**，对应的是 `netstat -ano`（找 PID）配 `tasklist /fi "PID eq xxx"`（看进程名）——这是跨平台脚本最容易翻车的点。排查「端口被占用」的标准组合：`lsof -i :端口`（或 Windows 的 netstat）找进程，`kill` 处理。过滤语法与状态机深入见 networking/090-SSNetstat。

## 4. curl 排查姿态

curl 是接口问题的第一响应工具，三个层级由浅入深：

```bash
curl -I https://api.example.com/health     # 第一步：只看状态行与响应头
curl -v https://api.example.com/health     # 第二步：详细握手过程（DNS、TCP、TLS、请求响应全文）
curl -o /dev/null -s -w "DNS %{time_namelookup}s | 连接 %{time_connect}s | TLS %{time_appconnect}s | 总计 %{time_total}s\n" https://api.example.com
                                           # 第三步：分阶段耗时定位瓶颈
```

读法：`-w` 的分阶段耗时把「慢」拆开归因——namelookup 大是 DNS 问题，connect 大是网络/防火墙，appconnect 大是 TLS 握手，都正常但 total 大是服务端慢。4xx/5xx 初判：401/403 查鉴权头、404 查路径与网关路由、499/504 查上游超时。HTTP 协议与 curl 全参数见 networking/130-CurlHTTPRequest。

## 5. 防火墙：三平台对照

（搬移自 140 号第 5.4 节 ufw 部分并扩写跨平台。）

```bash
# Ubuntu ufw
ufw status                # 查看状态
ufw allow 80/tcp          # 允许 80 端口
ufw deny 3306             # 拒绝 3306 端口
ufw enable                # 启用防火墙
```

| 平台 | 工具 | 查看一条规则 | 放行一个端口 |
| :--- | :--- | :--- | :--- |
| Ubuntu | ufw | `ufw status` | `ufw allow 8080/tcp` |
| CentOS/RHEL | firewalld | `firewall-cmd --list-all` | `firewall-cmd --add-port=8080/tcp --permanent` + `--reload` |
| macOS | pfctl | `sudo pfctl -s rules` | 编辑 `/etc/pf.conf` + `sudo pfctl -f` 加载 |
| Windows | Windows Defender 防火墙 | `netsh advfirewall show allprofiles` | `netsh advfirewall firewall add rule name="dev8080" dir=in action=allow protocol=TCP localport=8080` |

「服务明明起了、外部连不上」的排查顺序：本机 curl 通不通（服务本身）→ `ss/lsof` 确认监听地址是 0.0.0.0 还是 127.0.0.1（只听回环外部必不通）→ 防火墙放行了吗 → 云安全组放行了吗。四步各排除一层，比乱猜快得多。

## 6. 工程场景

### 6.1 场景一：本机端口占用 EADDRINUSE

`Error: listen EADDRINUSE: address already in use :3000`——开发机重启后的经典报错。三步定位：

```bash
lsof -i :3000             # 谁占着 3000（Windows: netstat -ano | findstr :3000）
# COMMAND   PID   USER   ... NAME
# node     4521   dev    ... TCP *:3000 (LISTEN)

kill 4521                 # 确认是残留进程后优雅终止（先 TERM，见 220 篇）
npm run dev               # 重新启动成功
```

易错点：`kill -9` 一步到位看似高效，但 node 的调试端口、数据库的锁文件来不及清理，下次启动报另一类错——先 TERM 后 KILL 的纪律在端口排查里同样适用（220 篇第 2 节）。占用的若是系统服务（如被 Windows 的 http.sys 占的 80），改自己的端口比对抗系统服务省事。

### 6.2 场景二：接口 4xx/5xx 的初判

前端反馈「接口挂了」，按返回码分流：

- **401/403**：先用 curl 重放带 token 的请求——curl 通了是前端没带/带了过期 token；curl 也 401 是 token 签发侧问题；
- **404**：curl `-v` 看实际命中的路径——网关路由规则改了、或前端拼错了 baseURL；
- **500**：直接看服务端日志（这不是网络问题了）；**502/504**：网关到上游的链路——502 上游进程挂了（回到 6.1 查端口与进程），504 上游慢（回到第 4 节 `-w` 分段计时定位慢在哪段）。

一套下来大部分「接口挂了」在五分钟内归因，不需要任何浏览器调试工具。

### 6.3 场景三：改 hosts 后 DNS 不生效

本地调试把 `api.dev.example.com` 指到 127.0.0.1，改了 `/etc/hosts`（Windows 是 `C:\Windows\System32\drivers\etc\hosts`）但请求还是打到线上。逐层排查：

```bash
ping api.dev.example.com          # 看解析到哪个 IP（第一步：确认系统层面生效没有）
dig api.dev.example.com +short    # dig 不读 hosts，对比出「hosts 生效但应用走 DNS」的差异
ipconfig /flushdns                # Windows 清缓存；Linux 重启 systemd-resolved
```

两个易错点：hosts 文件格式（IP 与域名之间的分隔符混用 tab/空格、行尾注释没空格分隔）会让整行失效；浏览器开启的「安全 DNS」（DoH）会绕过系统解析直连上游——关掉它 hosts 才算数。Linux 下 `getent hosts 域名` 是验证「系统解析器（含 hosts）」的命令，`dig/nslookup` 反而不读 hosts——工具选择错了结论就反了。

## 7. 动手实践

**任务一：端口占用三连。** 起一个占 3000 端口的进程（如 `python3 -m http.server 3000`），再用 `lsof -i :3000`（Windows 用 netstat）找到它的 PID 与命令名；杀掉后确认端口释放。把三步命令记进你的速查笔记。

<details>
<summary>任务一参考观察</summary>

lsof 输出的 COMMAND 列直接给出进程名、PID 列给出可 kill 的编号；Windows 下 `netstat -ano | findstr :3000` 的最后一列是 PID，配 `tasklist /fi "PID eq 4521"` 看名字。自查：你的系统上 ss/lsof/netstat 哪些可用？把你自己机器的可用命令固化下来——排障时翻笔记比现场想快。
</details>

**任务二：用 curl -w 给你的常用接口画延迟画像。** 对一个你手头的 HTTP 接口（或任意公网接口）分别跑三次第 4 节的 `-w` 命令，记录 namelookup/connect/appconnect/total 四个值，判断这个接口的延迟主要花在哪一段。

<details>
<summary>任务二参考观察</summary>

典型分布：公网接口 namelookup 数十毫秒（DNS）、connect 十几毫秒（建连）、appconnect 数十毫秒（TLS 握手）、total 大头通常在服务端处理。三次对比中 total 的抖动主要来自服务端处理时间——如果你发现 appconnect 抖动巨大，是 TLS 会话复用没生效，与业务无关但值得报告。这题的价值是把「接口慢」这个模糊感受拆成可归因的数字。
</details>

**任务三：写一份你自己平台的「网络三件套」速查卡。** 按本篇结构，为你日常使用的系统（Linux/macOS/Windows 任选）整理：连不通查什么（1 条命令）、端口被占查什么（1 条）、DNS 不生效查什么（1 条）、防火墙在哪查（1 条），并在与 025-networking 对应正篇间标注「深入看哪篇」。

<details>
<summary>任务三参考设计</summary>

以 Linux 为例：连不通 → `ping -c4 目标 && curl -v 目标:端口`；端口占用 → `ss -tlnp | grep :端口` 或 `lsof -i :端口`；DNS → `getent hosts 域名`（验证 hosts）与 `dig +short`（验证 DNS）；防火墙 → `ufw status`。深入标注：连通原理 networking/080、ss 细节 networking/090、DNS 机制 networking/110、curl networking/130。速查卡的意义在「每类问题只记一条入口命令」，展开参数交给正篇。
</details>

## 8. 下一步与延伸阅读

- 《跨平台命令行详解》（shell/140-CrossPlatformCommandLine）：本篇的母篇概览定位；
- 《排障方法论》（shell/120-TroubleshootingGuide）：端口占用之外的系统级排障框架；
- networking 模块对应正篇：networking/080（连通原理）、networking/090（ss/netstat 深入）、networking/110（DNS 解析）、networking/130（curl 与 HTTP）、networking/270（tcpdump 抓包）。

## 参考与致谢

- 本篇由《跨平台命令行详解》第 5 节网络工具（连接测试、DNS 查询、端口与连接、防火墙）整体搬移扩写而成，140 号保留跨平台对照概览定位；
- 各命令的深度语义参考对应工具 man 手册与 025-networking 模块正篇。
