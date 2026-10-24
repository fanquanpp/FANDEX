---
order: 220
title: 操作系统级虚拟化与容器
module: 'cs-fundamentals'
category: 计算机科学
difficulty: beginner
description: 从特权级到 hypervisor 再到 namespace 与 cgroup：容器到底虚拟化了什么、与虚拟机的本质区别、GOMAXPROCS 与 JVM 内存感知失败的 OS 根源，附 cgroup 实操与练习
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：操作系统延伸——虚拟化与资源隔离。它站在 200 特权级与 210 分页之上，
  回答「一台物理机怎么同时跑多个互不信任的环境」。
- **解决什么问题**：虚拟机重、启动慢、资源固定；多进程共享内核又互相踩踏
  （端口冲突、库版本冲突、抢 CPU 抢内存）。容器是这两个极端之间的工程折衷。
- **什么时候用到**：部署 Go/JVM/Node 服务进 Docker 与 Kubernetes；排查
  「开发机正常、进容器就怪」类问题；理解 CI 限流、OOMKilled、CPU 节流的根因；
  面试中「容器是轻量级虚拟机吗」这道必考题。

## 真实场景：同一份代码，搬进 2 核容器后吞吐掉了一半

015-go 模块 170-GMPModel 记录过这个真实场景：Go 并发服务在 16 核开发机压测跑满，
搬进 CPU limit=2 的容器后延迟反升，CPU 显示 2000% 被限流打满。根因不在 Go：

- 老版本 Go 运行时启动时读「机器核数」设置 GOMAXPROCS，而容器里的进程
  通过 `sched_getaffinity` 看到的是**宿主机的 64 核**，不是 limit 里的 2 核；
- 于是调度器开出 64 个逻辑处理器 P，64 个线程去抢 cgroup 分给这个容器
  每个 100ms 周期里的 200ms CPU 时间，配额提前用光，全进程被冻结到下一周期。

这不是 Go 的 bug，是**应用对「容器里的 CPU 视图」的误解**。理解 namespace 与
cgroup 各管什么，这类问题就能一眼定位。本文结束时你会能回答：容器到底虚拟化了什么、
没虚拟化什么、为什么 JVM 不感知 cgroup 会被内核 OOM Killer 杀掉。

## 1. 演进主线：三级隔离强度

一台物理机跑多个「环境」有三条技术路线，隔离强度与开销递增：

```
普通多进程          容器（OS 级虚拟化）        虚拟机（硬件级虚拟化）
--------------      ---------------------     ----------------------
共享内核            共享内核                  每台 VM 独立内核
共享文件系统        独立 mount 视图           独立虚拟硬件
无资源边界          cgroup 资源边界           hypervisor 划分内存/CPU
进程可互相杀        PID 空间隔离              guest 内核与 host 无关
```

- **普通多进程**：200 篇讲过，进程有独立虚拟地址空间，但共享内核对象——
  两个进程绑同一个端口直接冲突，`kill` 对方进程也不需要任何隔离边界。
- **容器**：所有容器仍是宿主机内核上的普通进程（`ps` 在宿主机上能看到容器里的进程），
  靠 namespace 改变「进程能看见什么」，靠 cgroup 限制「进程能用多少」。
- **虚拟机**：hypervisor 在硬件与 guest 内核之间再插一层，每个 guest 拥有
  真正的内核，崩溃互不影响，但启动一个内核要数秒、内存开销以百 MB 计。

### hypervisor 的两类

- **Type 1（裸金属型）**：hypervisor 直接跑在硬件上，如 Xen、ESXi、KVM
  （KVM 把 Linux 内核本身变成 Type 1 hypervisor）。
- **Type 2（宿主型）**：hypervisor 作为宿主 OS 的应用程序，如 VirtualBox、
  macOS 上的 VMware Fusion。

虚拟化的硬件基础是 200 篇的特权级：CPU 提供比「用户态/内核态」更细的
虚拟化扩展（Intel VT-x / AMD-V），让 guest 内核也以为自己跑在 ring 0，
敏感指令触发 VM exit 陷入 hypervisor 处理。

### 为什么容器不是「轻量级虚拟机」

这是面试与架构评审里最常见的错误表述。准确的心智模型：

| 维度 | 虚拟机 | 容器 |
| --- | --- | --- |
| 内核 | 每台 VM 一个独立内核 | 所有容器共享宿主机一个内核 |
| 隔离单位 | 一台完整计算机 | 一个进程（组） |
| 隔离机制 | hypervisor + 虚拟硬件 | namespace + cgroup |
| 能跑的 OS | 任意（Windows VM 跑在 Linux 上） | 只能跑与宿主机内核兼容的「用户态发行版」 |
| 启动时间 | 秒到分钟级（引导内核） | 毫秒级（fork 一个进程） |
| 崩溃影响 | guest 内核崩溃不伤 host | 内核 bug 影响所有容器 |

最后一行是关键推论：容器镜像里的 Ubuntu/Alpine 只是**用户态文件系统**
（glibc、busybox 这些），没有内核。Linux 容器镜像里的程序跑在 Windows 的
Docker 上时，真正干活的内核是 Windows 里藏着的一台 Linux 虚拟机
（WSL2/Hyper-V）——这恰恰证明「容器不能替代内核隔离」。

## 2. namespace：改写进程的「视野」

namespace 不限制资源，只回答一个问题：**这个进程调用系统调用时，看到的世界是什么样**。
Linux 提供八类常用 namespace：

| namespace | 隔离内容 | 效果举例 |
| --- | --- | --- |
| PID | 进程编号 | 容器内自己就是 1 号进程 |
| NET | 网络栈 | 独立网卡、独立 IP、独立端口空间 |
| MNT | 挂载点 | 独立根文件系统，看不见宿主机目录 |
| UTS | 主机名 | 容器内 `hostname` 显示容器 id |
| IPC | System V IPC 对象 | 独立共享内存、信号量键空间 |
| USER | 用户与组 ID 映射 | 容器内 root 映射为宿主机普通用户 |
| CGROUP | cgroup 根目录视图 | 容器内只见自己的 cgroup 树 |
| TIME | 系统时钟视图 | Linux 5.6 起，可给容器偏移时钟 |

### 用 unshare 亲手创建 namespace

`unshare` 是理解容器最短路径——它创建新 namespace 并在其中执行一条命令。
在 Linux 机器上（Windows 用户用 WSL2）：

```bash
# 创建独立 PID namespace，运行 sleep 300
sudo unshare --pid --fork --mount-proc sleep 300
```

逐参数解释：

- `--pid`：新建 PID namespace。`sleep 300` 在新空间里是 **1 号进程**——
  容器里的主进程收到 `SIGKILL` 时没有父进程收养机制，这就是容器内 1 号进程
  要自己处理僵尸进程与信号的原因（Kubernetes 官方镜像普遍用 tini 处理此事）；
- `--fork`：unshare 自身 fork 一个子进程进入新 namespace（PID namespace
  创建者自己不能进入，必须由后代进入）；
- `--mount-proc`：在新挂载点重新挂 `/proc`。没有它，`ps` 读到的仍是宿主机
  进程表——这就是「namespace 要配合 MNT 隔离才完整」的实例。

另开终端验证隔离效果：

```bash
# 宿主机视角：sleep 300 就是普通进程，直接可见
ps aux | grep "sleep 300"
# 容器视角：进入该进程的 PID namespace 后只能看见自己
sudo nsenter -t <sleep的PID> -p -m ps aux
```

**为什么这样写**：`ps aux` 本质是读 `/proc/[pid]` 目录，MNT namespace 决定
它读到的 `/proc` 是谁的。换成 `ls /proc` 也能看到同样的隔离——
**「工具的行为差异」都能归结到底层视图差异**，这是排查容器问题的通用思路。

## 3. cgroup：限制进程的「配额」

namespace 管视野，cgroup 管预算。cgroup（control groups）把进程挂到树上，
每个节点带一组资源控制器。现代系统统一用 **cgroup v2**，控制文件都在
`/sys/fs/cgroup` 下。三个最常用的控制器：

```
cpu.max          CPU 配额，格式 "$quota $period"，如 "200000 100000"
memory.max       内存硬上限，超过即触发 OOM Killer
memory.high      软上限，超过后内核开始回收/节流，不直接杀
```

### 逐项对应：docker run 参数与 cgroup 文件

理解容器的最快方式是看 `docker run` 的参数落到哪个 cgroup 文件：

```bash
docker run --cpus=2 --memory=512m alpine sleep 300
```

- `--cpus=2` 写进容器的 cgroup 文件为 `cpu.max: 200000 100000`——
  每 100ms 周期最多用 200ms CPU 时间（即 2 核）。**170-GMPModel 场景里
  64 个线程抢的就是这 200ms**；
- `--memory=512m` 写为 `memory.max: 536870912`——RSS 加页缓存超过此值，
  内核 OOM Killer 选中该 cgroup 里 oom_score 最高的进程直接 SIGKILL。
  `docker inspect` 里看到的 `OOMKilled: true` 就是这个事件。

### JVM 被 OOMKill 的完整因果链

第二个真实场景：JVM 服务容器内存 limit 2G，`docker stats` 显示才用 800M
却被 `OOMKilled`。因果链：

1. 老版本 JVM（8u131 之前，或未开 `-XX:+UseContainerSupport` 的版本）
   读物理内存总量设置默认堆大小——JVM 没有读 cgroup 的 `memory.max`，
   于是默认堆按宿主机 32G 算出 8G；
2. 应用把堆用到 8G 附近，加上堆外内存，进程 RSS 突破容器的 2G；
3. 内核检查 `memory.max`，触发 OOM Killer，杀掉 Java 进程；
4. `docker stats` 显示的 800M 可能只是某个瞬间的采样，堆上涨的尖峰没被看到。

修复有两层：升级 JVM/JDK 让 `UseContainerSupport` 生效（Java 10+ 默认开启），
或者显式 `-Xmx` 与 `--memory` 联动配比（堆约为 limit 的 50-75%，留堆外空间）。
**通用教训：任何运行时都可能在用「物理机假设」读书，进容器前先确认它
有没有 cgroup 感知。** Go 1.25+、Java 10+、Node.js 12+ 都已内置感知。

## 4. 把三者串起来：容器的完整解剖

一次 `docker run` 在内核层面发生了什么（简化版，可对照阅读 docker 源码注释）：

```text
1. 由镜像层_union mount_拼出容器的根文件系统（MNT namespace 的内容）
2. clone() 创建进程，flags 里带 CLONE_NEWPID | CLONE_NEWNET | CLONE_NEWNS | ...
   ——一次性创建多个 namespace（对照 200 篇：clone 本是创建线程的系统调用，
   容器只是多传了几个"换世界"的 flag）
3. 把新进程的 PID 写入某 cgroup 节点的 cgroup.procs，cpu.max/memory.max 生效
4. 设置 capabilities 与 seccomp：容器内进程默认没有挂载、改内核参数等权限
   ——这是容器安全模型的一部分，也是"容器内不能 mount"报错的来源
5. exec 容器镜像里 ENTRYPOINT 指定的程序
```

关键结论：**容器 = 受 namespace 约束视野、受 cgroup 约束预算、受 capabilities
约束权限的普通 Linux 进程**。它没有任何一个组件是「虚拟化 CPU 指令集」的。

### 第三个场景：弹层里限流，CI 上压测失真

第三个工程场景来自 FANDEX 自身：CI 在容器里跑构建，同事发现「压测脚本
本地跑 3 分钟完成，CI 上要 20 分钟」。排查路径恰好复用本文概念：

1. 先查 `cpu.max`：CI runner 的容器配置给了 1 核（`100000 100000`），
   本地开发机是 16 核——第一嫌疑人是配额而不是代码；
2. 再查 `memory.high`：Node 构建工具吃内存超过 soft limit 后，内核回收
   页缓存导致磁盘 IO 放大，构建时间进一步劣化；
3. 结论：CI 与本地的差异不是「机器快慢」，是 **cgroup 预算不同**。
   任何基准测试都必须在相同 cgroup 配额下比较，否则数字没有意义。

## 常见陷阱与调试

- **坑 1：容器内看 `/proc/cpuinfo` 仍是宿主机的。** `/proc/cpuinfo` 的内容
  不受 namespace 隔离（TIME/CGROUP namespace 也不管它），应用如果靠解析它
  数核数会拿到宿主机核数。正确姿势是读 cgroup 文件，或用带感知的运行时版本。
- **坑 2：`docker stats` 不显示就是没超内存。** `memory.high` 触发的回收
  与直接回收页缓存都不会杀进程，但会显著变慢。查根因要看
  `memory.events` 里的 `oom_kill` 计数与 `pgscan` 等回收计数。
- **坑 3：容器里 `ulimit` 与 cgroup 混为一谈。** ulimit 是单进程维度的
  旧式限制（由 dockerd 的 `--ulimit` 参数设置），cgroup 是进程组维度。
  打开文件数报错查 ulimit，内存/CPU 报错查 cgroup，两条线索别串。
- **坑 4：namespace 只隔离不授权。** 进了新 NET namespace 不代表能改网络配置
  ——还要有对应 capability。`unshare --net` 后执行 `ip link set lo up`
  报 `Operation not permitted`，缺的是 `--map-root-user` 或特权模式。

## 动手实践

**任务**：不使用 Docker，只用 `unshare` 与 cgroup 文件系统，手工搭出一个
「迷你容器」——独立 PID/挂载视图、内存上限 100M，并在其中运行 `sleep 300`
后验证两个限制都生效。

**提示**：

1. cgroup v2 下先确认 `/sys/fs/cgroup/cgroup.controllers` 存在；在
   `/sys/fs/cgroup` 下 `mkdir minict` 即创建一个 cgroup 节点（mkdir 由内核
   自动生成控制文件）；
2. 先 `unshare --pid --fork --mount-proc` 拿到新进程，再把它写进
   `minict/cgroup.procs`；
3. 验证手段：容器内 `cat /proc/self/cgroup` 看挂在哪；往 `minict/memory.max`
   写 `100M` 后，在容器内用 Python 或 dd 申请 200M 内存，观察被杀。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```bash
# 1. 创建 cgroup 节点并设预算
cd /sys/fs/cgroup
sudo mkdir minict
echo "100M" | sudo tee minict/memory.max

# 2. 建独立 namespace 的进程
sudo unshare --pid --fork --mount-proc sleep 300 &
SLEEP_PID=$!

# 3. 把该进程（及其未来子孙，v2 继承）挂进 minict
echo $SLEEP_PID | sudo tee minict/cgroup.procs

# 4. 验证视野：nsenter 进去只看得见自己
sudo nsenter -t $SLEEP_PID -p -m sh -c 'ps aux && cat /proc/self/cgroup'

# 5. 验证预算：申请 200M，应被 OOM 杀掉
sudo nsenter -t $SLEEP_PID -p -m sh -c \
  'python3 -c "a = bytearray(200*1024*1024); input()"'
# 预期输出：Killed；宿主机上 dmesg 里出现 memory cgroup out of memory
```

**逐行讲解**：第 2 步 `--mount-proc` 重挂 `/proc` 保证 `ps` 干净（见第 2 节）；
第 3 步 cgroup v2 是单树结构，一个进程只能属于一个 cgroup，写
`cgroup.procs` 即完成迁移；第 5 步 `bytearray` 申请即提交（Linux 是
按需分页，必须触碰内存才真实占用——可以顺带复习 210 的按需调页）。
如果你的发行版 cgroup v1，控制文件路径不同（`memory/memory.limit_in_bytes`），
但机制等价。

</details>

## 小结与下一步

- 容器不是轻量级虚拟机：虚拟机虚拟的是**计算机**（独立内核+虚拟硬件），
  容器虚拟的是**进程环境**（共享内核+namespace 视图+cgroup 预算）；
- namespace 管看见什么，cgroup 管能用多少，capabilities 管能做什么，
  三者缺一都会出事故；
- 一切「本地正常、容器异常」的问题，先问三个问题：进程看到的世界
  （namespace）、配额（cgroup）、权限（capability）哪一环和本地不一样。

**下一步**：带着 cgroup 的 CPU 配额概念去读 015-go 模块 170-GMPModel，
看调度器如何与配额互动；OS 视角的内存管理细节见 210 分段分页与
220 页面置换；进程与内核的边界（系统调用）见 190 中断与系统调用。

## 参考与致谢

- man 7 namespaces、man 7 cgroups（Linux 手册页，许可证见 man-pages 项目 COPYING，GPL+BSD 双许可）
- kernel.org 文档 Control Group v2（https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html ，GPL-2.0 文档）
- 场景素材：本仓库 015-go 模块 170-GMPModel.md 容器调度案例
