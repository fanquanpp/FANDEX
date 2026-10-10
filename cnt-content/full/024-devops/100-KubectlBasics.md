---
order: 120
title: kubectl 基础命令
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 'kubectl 学习笔记：入职第一天连上集群——看状态、部署应用、查日志排障、扩缩容与端口转发，最后是绝不能搞错的上下文管理。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/110-HelmChartApplicationPackage'
  - 'devops/120-HelmCommands'
prerequisites:
  - 'devops/090-KubernetesCoreDetailed'
---

## 0. 场景

入职第一天拿到了集群的 kubeconfig，主管说："先熟悉一下环境，然后把我们那个 nginx 服务部署上去。"这篇文章就是这一天的操作手册：kubectl 是操作 Kubernetes 的唯一指挥棒，高频命令不超过二十个，但每一个都要知道"它在问集群什么"。

排序按真实工作流：先看（get/describe）→ 再部署（create/apply）→ 出问题查（logs/exec）→ 日常操作（scale/port-forward）→ 最后是最容易出事故的 config。

## 1. 看：get 与 describe

### 1.1 get：集群的"ls"

```bash
# 查看当前命名空间的 Pod
kubectl get pods

# 查看所有命名空间的 Pod（-A = --all-namespaces）
kubectl get pods -A

# 只看某个命名空间
kubectl get pods -n kube-system

# 多列几列：Pod 的 IP 和所在节点（排查网络问题必加）
kubectl get pods -o wide

# 按标签过滤：只看这个应用的
kubectl get pods -l app=nginx

# 导出完整 YAML（照抄别人资源的最快方式）
kubectl get pod nginx -o yaml
```

get 默认输出太"瘦"——只给你 READY/STATUS。两条经验：`-o wide` 是排网络问题的第一步；`-o yaml` 是"这个资源到底长什么样"的标准答案，比任何文档都准。

### 1.2 describe：资源为什么变成这样

get 只给状态，describe 给**原因**——事件（Events）都附在最后，Pod 起不来时九成答案在这里：

```bash
kubectl describe pod nginx
kubectl describe pod kube-apiserver -n kube-system
kubectl describe node node1
```

排障的固定套路：`get pods` 发现 STATUS 异常 → `describe pod` 看 Events（镜像拉不下来？探针失败？调度不上？）→ 对症下药。

## 2. 部署：create 与 apply

### 2.1 create：命令行直接造

适合临时验证：

```bash
# 创建 nginx Deployment
kubectl create deployment nginx --image=nginx

# 带 3 个副本
kubectl create deployment nginx --image=nginx --replicas=3

# 创建命名空间
kubectl create namespace dev

# 创建 Secret（密码这类敏感配置不进 YAML、不进 Git）
kubectl create secret generic db-secret --from-literal=password=secret123
```

### 2.2 apply：声明式的主航道

真实工作里资源定义都在 YAML 文件中（进 Git、可评审、可回滚）：

```bash
kubectl apply -f deployment.yaml      # 单个文件
kubectl apply -f ./k8s/               # 整个目录
kubectl apply -f https://raw.githubusercontent.com/example/repo/main/deploy.yaml
kubectl apply -k ./overlays/prod      # kustomize：按 overlay 目录合并配置
```

create 与 apply 的关系一句话：**create 是"给我创建这个"，apply 是"让实际状态等于文件里写的"**。apply 可以反复执行做增量更新，CI/CD 和 GitOps 全部建立在它上面；create 造出来的东西 Git 里没有记录，团队协作别用。

## 3. 查：logs 与 exec

部署完了但它不听话，这两条命令是你的眼睛和手：

```bash
# 看日志
kubectl logs nginx
kubectl logs -f nginx                # 跟踪输出（tail -f）
kubectl logs pod1 -c sidecar         # Pod 里多个容器时指定容器
kubectl logs nginx --previous        # 上一次崩溃前的日志（查 CrashLoopBackOff 神器）
kubectl logs nginx --since=1h        # 最近一小时

# 进容器
kubectl exec -it nginx -- bash       # 进交互 shell
kubectl exec nginx -- ps aux         # 执行单条命令
kubectl exec -it pod1 -c sidecar -- sh
```

两个高频场景：

- **CrashLoopBackOff**：`logs --previous` 看崩溃前的报错，通常是应用启动即退出（配置缺失、依赖连不上）。
- **容器里没有 bash**：精简镜像（distroless/alpine）用 `-- sh` 甚至 `-- /bin/busybox sh`。

## 4. 日常操作：scale 与 port-forward

```bash
# 扩到 5 个副本
kubectl scale deployment nginx --replicas=5

# 缩到 0（停服务但保留 Deployment 定义，比 delete 温和）
kubectl scale deployment nginx --replicas=0

# 基于文件伸缩
kubectl scale -f deployment.yaml --replicas=3
```

本地调试集群内服务的利器——端口转发（不用暴露 Service、不用 LoadBalancer）：

```bash
# 本地 8080 → Pod 的 80
kubectl port-forward nginx 8080:80

# 更常用：转发 Service（Pod 会换，Service 名字稳定）
kubectl port-forward svc/nginx 8080:80

# 绑定到所有网卡（让同事也能访问你转发的端口）
kubectl port-forward nginx 0.0.0.0:8080:80
```

port-forward 是临时通道：终端断开即失效，生产流量请走正经的 Service/Ingress。

## 5. 删除：慢一点

```bash
kubectl delete pod nginx                    # 删指定资源
kubectl delete -f deployment.yaml           # 按文件删
kubectl delete pods -l app=test             # 按标签批量删（先 get 同样的标签确认范围！）

# 强制立即删除（绕过优雅终止）
kubectl delete pod nginx --grace-period=0 --force
```

`--force --grace-period=0` 只用于节点失联导致 Pod 卡 Terminating 的场景——它跳过正常关闭流程，可能造成数据不一致，不要当"快速删除"用。批量删除前先跑一遍同标签的 `kubectl get`，确认要删的就是你以为的那些。

## 6. config：一天最重要的事

kubeconfig 里可以存多个集群的访问凭证，每个叫一个"上下文"（context）。**你敲的每一条 kubectl 都作用在当前上下文指向的集群上**：

```bash
kubectl config current-context              # 我现在连的是哪个集群？
kubectl config get-contexts                 # 本机有哪些集群凭证
kubectl config use-context prod-cluster     # 切换上下文
kubectl config set-context --current --namespace=dev   # 给当前上下文设默认命名空间
```

这条规则值得写进肌肉记忆：**每次打开新终端，先 `current-context` 再干活。** 在错误上下文里跑 `delete` 是 Kubernetes 世界最经典的事故来源，没有之一。团队约定俗成的做法还包括给上下文命名带上环境前缀（dev-xxx / prod-xxx），并配合 kubectx 这类切换工具显示当前环境。

## 7. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| 新终端直接敲命令 | 在生产集群上执行了 delete | 每次先 `config current-context` |
| 命名空间没对上 | `get pods` 显示为空以为部署失败 | 记住默认命名空间是 default，用 `-n` 或 `set-context --namespace` |
| Pod 卡 Terminating 就 force 删 | 数据不一致 | 先 describe 看原因，force 只留给节点失联 |
| 用 create 管理长期资源 | 配置无版本记录 | 日常 apply -f，资源定义进 Git |
| 拿 port-forward 当生产入口 | 终端一断服务全断 | 只用于调试，流量走 Service/Ingress |

## 8. 动手试试

1. `kubectl get pods -A` 通读一遍输出：找出 STATUS 不是 Running 的 Pod，挑一个 describe 看它的 Events 讲了个什么故事。
2. 用 `create deployment` 起一个 nginx，`port-forward` 到本地 8080，浏览器确认页面；然后 `scale --replicas=3` 再看 `get pods -o wide` 里三个 Pod 分布在哪些节点。
3. 故意把镜像名写错 apply 一个 Deployment，用 describe 找到 ImagePullBackOff 的原因，再修正。

## 9. 小结

**初学者要点**

1. 看状态用 get，查原因用 describe，读日志用 logs——三件套覆盖日常八成操作。
2. 资源管理以 `apply -f` 为正道：文件进 Git，集群状态可追溯。
3. 上下文即生死线：换终端先确认连的是哪个集群。

**进阶注意**

1. `get -o yaml` 是学习他人资源配置的最快途径；配合 `explain <资源>` 看字段文档。
2. 批量操作永远先以同样条件 get 预览，再换成 delete 执行。
3. 应用多了手写 YAML 不现实，包管理交给 Helm（见 [Helm Chart 应用打包](/devops/110-HelmChartApplicationPackage) 与 [Helm 常用命令](/devops/120-HelmCommands)）。
