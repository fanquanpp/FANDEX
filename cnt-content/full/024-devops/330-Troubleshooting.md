---
order: 350
title: 故障排查
module: 'devops'
category: 云与基础设施
difficulty: advanced
description: 一次完整故障的排查主线：从告警到定位到恢复——CPU/内存/磁盘/网络逐层命令与判读，标注每条命令的替代写法与误判风险
author: fanquanpp
updated: '2026-10-05'
related:
  - 'devops/098-KubernetesTroubleshooting'
  - 'devops/320-IncidentRetrospectiveMethodology'
  - 'devops/350-HighAvailabilityArchitecture'
prerequisites:
  - 'devops/015-LinuxSystemManagement'
---

## 知识点地图

- **知识类别**：DevOps 运营 / 系统级排障方法论（K8s 对象层的排查见 [K8s 排障](/devops/098-KubernetesTroubleshooting)，本篇管机器与应用之间这层）。
- **解决什么问题**：告警响了之后的第一小时决定事故的长度。没有固定流程的团队会在"命令乱试"中烧掉黄金时间；本篇给一条从告警到恢复的固定路径。
- **什么时候用到**：响应 CPU/内存/磁盘/网络类告警；接手"服务器很卡"类工单；演练故障响应。
- **前置阅读**：[Linux 系统管理](/devops/015-LinuxSystemManagement)（命令的语法基础在这里）。

## 主线：周三 14:07 的告警

完整走一遍一次真实形态的故障（应用响应变慢 → 告警 → 定位 → 恢复），每一步标注命令、判读、替代写法与**误判风险**：

```text
14:07  收到告警：web 集群 P99 延迟从 200ms 涨到 2.4s，错误率未升
14:09  登录一台实例开始逐层排查（下文四层）
14:21  定位：/var/log 所在分区被一个失控的调试日志写满，应用同步写日志阻塞
14:25  恢复：归档截断日志 + 调低应用日志级别
14:30  复测 P99 回到 250ms；观察 30 分钟无复发
14:45  复盘：给 /var/log 配置轮转与告警（见日志管理篇），故障单归档
```

方法论骨架（先立住再展开）：**先看影响面（用户在经历什么），再分层下钻（资源四层），每层只问"这个层正常吗"，异常才深入，正常就下一层**。避免两个极端：一头扎进应用代码（其实是磁盘满），或四层全查一遍（黄金时间烧光）。

## 第零层：确认影响面（1 分钟内）

```bash
# 外部视角：用户到底经历了什么
curl -o /dev/null -sw '%{http_code} %{time_total}\n' https://app.example.com/healthz
# 200 0.08     ← 我这台看着正常 → 问题可能是局部的，先别急着改这台
```

**误判风险**：从集群外任意一台机器 curl 只代表"那条路径"正常。确认影响面的正确工具是监控大盘（错误率/延迟按实例分组），命令只做单点复核。替代写法：多实例批量 curl（`for h in web1 web2 web3; do ...`）快速圈出异常实例。

## 第一层：CPU——负载是果，先找是谁的因

```bash
uptime                          # 负载三兄弟：1/5/15 分钟
top                             # 交互式总览（按 P 按CPU排序、M 按内存）
# top 内替代：htop（更友好）；非交互替代：
ps aux --sort=-%cpu | head      # 吃 CPU 前几名进程

# 判读：load 8.0 在 4 核机器 = 过载 2 倍；但先分清 CPU 忙在用户态还是内核态
mpstat 1 5                      # %usr 高 = 应用计算忙；%sys 高 = 系统调用/上下文切换
vmstat 1 5                      # us/sy 之外看 wa（IO 等待）与 cs（上下文切换）
```

**误判风险一**：load 高不一定是 CPU 忙——**不可中断睡眠（D 状态）的 IO 等待也算 load**。`ps aux | awk '$8 ~ /D/'` 看到一堆 D 状态进程时，load 高的元凶是磁盘而不是 CPU，直接去第三层。**误判风险二**：`top` 里单个 Java 进程 400% CPU 可能是 JVM 正常 GC 或 JIT，先看线程（`top -H -p <pid>`）再下结论。

## 第二层：内存——free 的 available 与 OOM 现场取证

```bash
free -h                         # 看 available 列（buff/cache 会被回收，free 列误人）
ps aux --sort=-%mem | head      # 内存大户

# OOM 取证：进程被内核杀掉的现场
dmesg -T | grep -i "killed process"      # 或 journalctl -k | grep -i oom
# 输出含被杀进程名、PID 与各进程 oom_score——确认是谁的内存被回收
```

**误判风险一**：`free` 里 used 很高不是问题（缓存是设计行为），**available 低 + swap 持续换入换出（vmstat 的 si/so 非零）才是真缺内存**。**误判风险二**：OOM 杀掉的是"分数最高"的进程，不一定是吃内存最多的元凶——Java 常被杀是因为分数高，真凶可能是 cgroup 泄漏的其他进程。**误判风险三**：容器内看内存用 `cat /sys/fs/cgroup/memory/memory.usage_in_bytes`（cgroup v1）——容器里的 `free` 看到的是宿主机全局值，在容器里排查内存故障它是完全误导的。

## 第三层：磁盘——inode 与空间是两个独立的坑

```bash
df -h                           # 空间水位（按文件系统）
df -i                           # inode 水位（海量小文件会耗尽 inode 而 df -h 显示还有空间！）
du -sh /var/* 2>/dev/null | sort -rh | head    # 空间去哪了（逐层下钻）

# 文件已删除但空间没释放的经典现场：进程还握着句柄
lsof +L1 | head                 # 列出"已删除但被打开"的文件
# 处置：重启对应进程或 truncate（echo > /proc/<pid>/fd/<n>），别只 rm
```

**误判风险一**：`rm` 大文件后 `df` 不变——进程还握着句柄（上面 lsof 的场景），这是"删了日志磁盘还是满"的标准答案。**误判风险二**：只查 `df -h` 不查 `df -i`——小文件把 inode 耗尽时，报错是 "No space left on device" 但空间明明还有，不看 `df -i` 会原地打转。主线案例里 /var/log 写满就是本层故障：`du -sh /var/log/*` 一步定位到失控日志。

## 第四层：网络——从连通到质量的三级下钻

```bash
ss -tlnp                        # 谁在监听（服务没起来的第一确认）
ss -s                           # 连接统计总览（timewait 暴涨/连接数逼近上限）

# 连通性：ping 只证明 ICMP 通，端口通要这样测
curl -o /dev/null -sw '%{http_code} %{time_total}\n' http://db-host:5432 2>/dev/null || nc -zvw3 db-host 5432

# DNS：连接慢的隐形元凶
dig api.internal.example.com +stats    # 查询耗时 / 是否走了错误解析器

# 抓包（定位到"包没到/被重置"才用，成本高）
sudo tcpdump -i any port 5432 -nn -c 100
```

**误判风险一**：`ping` 通不代表服务通（ICMP 与 TCP 是两条路，安全组常只挡一个）；`telnet` 通也不代表应用正常（端口开着进程可能已经假死）——最终一定要发一次真实请求。**误判风险二**：连接数暴涨先看是**谁**连的（`ss -tn state established | awk '{print $4}' | sort | uniq -c | sort -rn`），急着重启应用只会把问题挪到重启完成后的下一分钟。**误判风险三**：tcpdump 全量抓包在万兆网卡上会丢包且拖垮机器，永远带 `-c` 上限与端口过滤。

## 恢复：先止血，再除根

```text
止血（分钟级，恢复服务优先）：
  - 截断失控日志 / kill 异常进程 / 扩容一台实例 / 摘除故障节点（负载均衡摘除）
  - 每个止血动作单独记录（时间 + 操作 + 效果）——复盘的原料
除根（小时到天级，走变更流程）：
  - 修配置、补监控、加防护（轮转、限流、熔断）
验证：恢复动作后复测第零层的指标，观察至少一个流量高峰周期
```

**纪律**：止血动作可以不走完整变更流程，但**必须留痕**；"顺手把配置也改了"是二次事故的温床——止血与除根分离，除根走正常变更。

## 升级与求援的时机

```text
出现以下任一情况，立即升级而不是继续单干：
  - 排查 15 分钟没有可信假设（黄金时间在流逝）
  - 需要的权限/知识超出自己（数据库内部状态、其他团队的组件）
  - 影响面在扩大（错误率从 1% 涨到 10%）
升级的格式：现象（数据）→ 已排除什么（证据）→ 当前假设 → 需要什么帮助。
"web 集群 P99 2.4s，四层排查已过，磁盘层定位到 /var/log 满，
 需要确认该分区没有其他服务的写入预期" ——这种消息才有用。
```

## 动手实践：制造并排查三种故障

任务（虚拟机或练习容器中）：

1. **CPU 型**：跑一个死循环脚本压满单核，用 top/mpstat 定位进程并 kill；
2. **磁盘型**：用 `fallocate` 造一个 90% 占用，再复现"rm 后空间不释放"（python 打开文件后删除），用 lsof +L1 取证并修复；
3. **网络型**：给一个 nginx 容器配错 upstream 端口，用 curl/ss/tcpdump 三件套定位"502 的上游在哪里挂的"；
4. 每次实验用时间盒：15 分钟内给出"现象-假设-验证-结论"四段式记录，模拟升级消息的写法。

<details>
<summary>参考实现（先自己跑再展开）</summary>

```bash
# 1
while :; do :; done &            # 死循环占一核
top -b -n1 | head -15            # 定位 PID（%CPU ~100）
kill %1                          # 收尾

# 2
fallocate -l 8G /tmp/big.img; df -h /tmp
python3 -c "
f = open('/tmp/ghost.log','w'); f.write('x'*1000000); f.flush()
import os; os.remove('/tmp/ghost.log'); import time; time.sleep(600)" &
df -h /tmp                       # rm 了但空间没回来
lsof +L1 | grep ghost            # 找到持句柄的 python PID
kill <PID>; df -h /tmp           # 空间释放
rm -f /tmp/big.img

# 3（Docker）
docker run -d --name broken-proxy -p 8090:80 nginx:1.27
# upstream 指向不存在的 10.255.255.1:80（进容器改 /etc/nginx/conf.d/default.conf 后 reload）
curl -sw '%{http_code}\n' -o /dev/null http://127.0.0.1:8090/    # 502
docker exec broken-proxy sh -c "apt-get update -qq && apt-get install -y -qq tcpdump"
docker exec broken-proxy tcpdump -i any host 10.255.255.1 -nn -c 5
# 观察到 SYN 无响应（retransmits）→ 上游不可达，修 upstream 目标
```

判读要点：实验 2 的 lsof 输出里该文件 SIZE 列非零、`/proc/<pid>/fd/` 指向 `(deleted)`——这就是"删了还在"的物理证据；实验 3 的 502 在 tcpdump 里表现为持续 SYN 重传无 SYN-ACK，与"上游返回 RST"（端口没人听）形态不同。
</details>

## 检验清单

- 能按"影响面 → CPU → 内存 → 磁盘 → 网络"的顺序组织排查，并说出每层的误判风险（load 含 D 状态、available 才是真水位、inode 与空间两独立、ping 通不代表服务通）；
- 能处理"rm 后空间不释放"并用 lsof 取证；
- 能区分 502/504 并按形态选择下一层命令；
- 能执行"止血留痕、除根走变更"的纪律并写出合格的升级消息；
- 能在 15 分钟时间盒内完成一轮"现象-假设-验证-结论"。

## 下一步

- [K8s 排障](/devops/098-KubernetesTroubleshooting)：容器编排层的同构方法论；
- [事故复盘方法论](/devops/320-IncidentRetrospectiveMethodology)：恢复之后的复盘怎么做；
- [On-Call 实战](/devops/310-OnCallPractice)：告警分级的上游与值班的制度层。

## 参考与致谢

- Brendan Gregg 的性能分析方法论（USE 方法等，博客免费公开）：<https://www.brendangregg.com/linuxperf.html>
- 《Performance》相关 man-pages（procps、iproute2，GPLv2+）：<https://man7.org/linux/man-pages/>
- 主线案例为通用工程实践改编；每条命令的行为已对照 Linux man-pages 核校。
