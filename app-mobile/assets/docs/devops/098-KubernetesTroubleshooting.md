---
order: 110
title: Kubernetes 排障
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: Pod 状态机逐状态排查路径、kubectl describe/events/logs 信息层次、ephemeral container 调试、节点 NotReady 处置——从"上线后 Pod 起不来"讲起
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：DevOps 容器编排 / Kubernetes 专属排障（通用 Linux 排障方法论见[排障方法论](/devops/330-Troubleshooting)，本篇是 K8s 层的专深线）。
- **解决什么问题**：`kubectl get pods` 里出现 Pending、ImagePullBackOff、CrashLoopBackOff、OOMKilled——每个状态背后是一条固定的排查路径；K8s 的信息分散在 describe/ events/ logs/ 三处，不知道先看哪个就变成了"命令乱试"。
- **什么时候用到**：上线后 Pod 起不来；应用时好时坏；节点 NotReady；OOM 与重启风暴。
- **前置阅读**：[K8s 核心资源](/devops/090-KubernetesCoreDetailed)。

## 主线案例：一次"上线后 Pod 起不来"的完整排查

背景：周五下午发版，新版本 Pod 起不来，回滚按钮还不敢按（数据库迁移已执行）。完整过程与每个命令的角色：

```text
14:02  kubectl get pods → 新版本的 web-7d9f8-* 全部 Pending（不是 CrashLoop，先排除应用本身）
14:03  kubectl describe pod web-7d9f8 → Events 尾部：
       "0/6 nodes are available: 6 insufficient memory."
       —— 集群内存不够，方向从"应用问题"切换到"资源问题"
14:05  kubectl top nodes → 三台节点内存都在 90% 上下
14:06  kubectl get pods -A --sort-by=.status.containerStatuses[0].lastState.terminated
       → 发现一个失控的日志采集器把内存吃爆
14:08  缩掉测试环境的非关键 Deployment 腾内存 → 新 Pod 调度成功
14:10  新版本又变 CrashLoopBackOff → kubectl logs --previous 看崩溃前的日志
14:12  日志显示数据库连接失败——迁移改了表结构，旧配置连的是只读副本
14:15  修配置 → Pod 起来 → 业务验证 → 复盘归档
```

这个案例里的方法论：**状态 → describe 的 Events → 分层下钻（调度层/镜像层/应用层）**。下面把每类状态的标准路径展开。

## 心智模型：Pod 状态机与排查路径

```text
Pod 提交后的一生：
Pending ──调度成功──→ 容器创建 ──镜像拉取──→ Running ──探针通过──→ Ready
   │                    │                      │
   │ 调度失败            │ 镜像拉取失败           │ 崩溃/探针失败
   ▼                    ▼                      ▼
 （卡在 Pending）   ImagePullBackOff        CrashLoopBackOff
                                              OOMKilled（退出码 137）
```

| 状态 | 出问题的层 | 第一反应 |
| --- | --- | --- |
| Pending | 调度层（没找到能放它的节点） | describe 看 Events |
| ImagePullBackOff | 镜像层（名字错/仓库不通/凭据缺） | describe 看镜像名与事件 |
| CrashLoopBackOff | 应用层（启动即崩） | logs --previous |
| OOMKilled (137) | 资源层（超 limits 被杀） | describe 看 Last State |
| Running 但 NotReady | 探针层（readiness 不通过） | describe 看探针配置与结果 |

## 排查工具的信息层次

三个命令三层信息，从粗到细：

```bash
# 第一层：describe —— 全景 + 事件时间线（90% 的"起不来"在这定位）
kubectl describe pod web-7d9f8
# 重点读两段：Events（时间序的事件）与 Container Statuses（退出码/重启次数）

# 第二层：events —— 集群视角的事件流（describe 只看一个对象时用它）
kubectl get events --sort-by=.lastTimestamp -n prod
# --for 按对象过滤；Warning 事件优先看

# 第三层：logs —— 应用自己在说什么
kubectl logs web-7d9f8                 # 当前容器的日志
kubectl logs web-7d9f8 --previous      # 上一次崩溃前的日志（CrashLoop 必看）
kubectl logs web-7d9f8 -c sidecar      # 多容器 Pod 指定容器
kubectl logs -l app=web --all-containers --tail=100   # 按标签聚合
```

describe 的 Events 判读速查：

```text
FailedScheduling: 0/6 nodes are available: 6 insufficient memory.
  → 资源不足；若报 "node(s) had untolerated taint" 则是污点/容忍问题
Failed to pull image "xxx": not found
  → 镜像名/tag 错，或私有仓库没有 imagePullSecrets
Readiness probe failed: HTTP 503
  → 应用没就绪（连不上依赖/还在预热），进容器自查
Back-off restarting failed container
  → CrashLoop 确认，转 logs --previous
```

## 场景一：CrashLoopBackOff 的三种病因

```bash
kubectl logs web-xxx --previous     # 先看崩溃现场
kubectl describe pod web-xxx        # 确认退出码
```

| 线索 | 病因 | 处置 |
| --- | --- | --- |
| 退出码 1 + 日志是应用异常栈 | 应用配置错（连不上库、配置缺项） | 修配置；用 `kubectl exec` 进旧版本对照 |
| 退出码 137 | OOMKilled：内存超 limits | describe 看 Last State 的 Reason；调大 limits 或查内存泄漏 |
| 退出码 0 但一直重启 | 应用"跑完就退"——前台进程误写成一次性任务 | 容器主进程必须常驻（`Type=simple` 的 K8s 版要求） |

易错点：CrashLoopBackOff 有**指数退避**（10s、20s、40s...最长 5 分钟）——改完配置 `kubectl rollout restart` 或删 Pod 立即重试，别干等退避周期。

## 场景二：临时容器调试（ephemeral container）

生产镜像为了安全通常是 distroless——**没有 shell**，`kubectl exec` 进不去。K8s 的答案是往运行中的 Pod 里"打进去"一个带工具的临时容器：

```bash
kubectl debug -it web-7d9f8 \
  --image=busybox:1.36 \
  --target=web \
  -- sh
# 进入后与目标容器共享进程视图与网络命名空间：
ps aux          # 能看到 web 进程
wget -qO- localhost:8080/healthz    # 在同一网络空间里探活
# 排查完 exit，临时容器自动清理，目标容器全程不受影响
```

`--target=web` 让临时容器加入 web 容器的进程命名空间——能看到它的进程列表，这是"容器里没工具"时代的标准解法。节点层面的等价物：`kubectl debug node/<节点名> -it --image=busybox` 拿到节点根文件系统的调试壳（宿主机路径挂载在 /host）。

## 场景三：节点 NotReady 处置

```bash
kubectl get nodes                       # NotReady 的节点先找出来
kubectl describe node node-3            # Events 与 Conditions 是关键
# 常见 Conditions 异常：
# MemoryPressure / DiskPressure   → 资源压力（df -h 看 /var/lib 容器目录）
# KubeletNotReady: container runtime network not ready
#   → CNI 插件挂了，kube-system 里查 calico/cilium Pod
```

处置路径：SSH 上节点 → `systemctl status kubelet` 与 `journalctl -u kubelet -n 50` → 常见三因（kubelet 挂、磁盘满、CNI 失联）→ 修复后节点自动回到 Ready。期间的**业务止损**：`kubectl cordon node-3` 停止向该节点调度新 Pod，`kubectl drain node-3 --ignore-daemonsets` 把存量 Pod 迁走——**先止损再修机器**，别在"影响业务的节点"上慢慢试。

## 命令速查：排障十连

```bash
kubectl get pods -A --field-selector=status.phase!=Running   # 找出所有异常 Pod
kubectl describe pod <p> -n <ns>                              # 全景+事件
kubectl get events -n <ns> --sort-by=.lastTimestamp           # 事件流
kubectl logs <p> --previous                                   # 崩溃前日志
kubectl exec -it <p> -- sh                                    # 进容器（有 shell 时）
kubectl debug -it <p> --image=busybox --target=<c> -- sh      # 无 shell 时
kubectl top pods --sort-by=memory | head                      # 内存大户
kubectl get endpoints <svc>                                   # Service 后端有没有
kubectl rollout status deploy/web                             # 发布卡在哪
kubectl get pod <p> -o jsonpath='{.status.containerStatuses[0].lastState}'  # 上次退出详情
```

## 动手实践：制造四种故障并逐一修复

任务（kind/minikube 上完成，每种故障刻意制造）：

1. 镜像写错 tag → 观察 ImagePullBackOff，用 describe 定位并修复；
2. limits 设 32Mi + 跑一个吃内存的进程 → 观察 OOMKilled 与退出码 137；
3. readiness 探针指向不存在的路径 → Pod Running 但 Service 摘除，用 endpoints 验证；
4. 把 replicas 设为 20（kind 集群放不下）→ Pending + FailedScheduling；
5. （进阶）用 `kubectl debug` 的临时容器进一个 nginx 容器排查它的进程列表。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1
kubectl set image deploy/web nginx=nginx:no-such-tag
kubectl get pods -w                          # ImagePullBackOff
kubectl describe pod -l app=web | grep -A5 Events   # Failed to pull image
kubectl rollout undo deploy/web

# 2
kubectl set resources deploy/web --containers=nginx \
  --limits=memory=32Mi
kubectl exec deploy/web -- dd if=/dev/zero of=/dev/null bs=1M count=100000
kubectl get pods -w                          # OOMKilled 后 CrashLoop
kubectl get pod -l app=web -o jsonpath='{.items[0].status.containerStatuses[0].lastState}'
# exitCode: 137, reason: OOMKilled
kubectl rollout undo deploy/web

# 3
kubectl patch deploy/web --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/nowhere"}]'
kubectl get endpoints web-svc                # 后端 IP 消失（流量摘除）
kubectl describe pod -l app=web | grep -i readiness  # 0/1 success
kubectl rollout undo deploy/web

# 4
kubectl scale deploy/web --replicas=20
kubectl get pods | grep Pending
kubectl describe pod web-xxx | grep -A3 FailedScheduling
kubectl scale deploy/web --replicas=2
```

判读要点：任务 2 的 OOMKilled 与任务 4 的 FailedScheduling 是两种最容易混淆的"资源不足"——前者节点肯收但容器被杀（limits 层），后者根本没节点收（调度层）。分清这两层，K8s 排障就成功了一半。
</details>

## 检验清单

- 能对 Pending/ImagePullBackOff/CrashLoopBackOff/OOMKilled/NotReady 各说出第一反应命令；
- 能按 describe（全景）→ events（集群流）→ logs（应用）的层次组织排查，并知道 --previous 的用途；
- 会用 ephemeral container 调试无 shell 的生产镜像；
- 能走完节点 NotReady 的"止损（cordon/drain）→ 修复"路径；
- 能区分"容器被杀"（OOMKilled）与"没节点收"（FailedScheduling）两层资源问题。

## 下一步

- [排障方法论](/devops/330-Troubleshooting)：CPU/内存/磁盘/网络的通用排查命令与判读；
- [kubectl 基础](/devops/100-KubectlBasics)：本篇命令的完整语法与上下文管理；
- [On-Call 实战](/devops/310-OnCallPractice)：排障结果如何进入告警与复盘闭环。

## 参考与致谢

- Kubernetes 官方文档 Debugging Applications / Debug Pods / Debug Running Pods（CC BY 4.0）：<https://kubernetes.io/docs/tasks/debug/debug-application/>
- Kubernetes 官方文档 Resource Management for Pods（CC BY 4.0）：<https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/>
- 主线案例为通用工程实践改编，退出码与状态语义已对照 K8s 官方文档核校。
