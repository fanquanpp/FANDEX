---
order: 570
title: GCP GKE Kubernetes 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'GKE 学习笔记：Autopilot 与标准模式怎么选、从创建到部署的全流程命令，以及节点池、升级、Workload Identity 的实操要点。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cloud-computing/500-AzureAKSCommands'
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/390-GCPCliConfigure'
prerequisites:
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/390-GCPCliConfigure'
---

## 场景

团队决定把应用从自管虚拟机迁到托管 Kubernetes，云上选了 GCP，对应服务是 GKE（Google Kubernetes Engine）——Kubernetes 诞生于 Google，GKE 是历史最久的托管 K8s。目标是：今天把集群建起来、把应用跑上去；顺便搞懂 GKE 相比其他托管 K8s 最特别的一个选择题——Autopilot 还是标准模式。

工具是 `gcloud` CLI。开始前确认登录和项目配置没问题。

## 第零步：登录与项目配置

GCP 的一切资源都挂在项目（Project）下，`gcloud` 的行为由"当前项目 + 当前区域"决定：

```bash
# 浏览器交互登录
gcloud auth login

# 切换到目标项目
gcloud config set project my-project-123

# 设置默认计算区域，之后命令可以不写 --region
gcloud config set compute/region us-central1

# 查看当前全部配置（账户、项目、区域一眼看清）
gcloud config list

# 查看本机已登录的所有账户
gcloud auth list

# 这一条容易漏：给本地跑的应用代码（SDK/客户端库）单独配一套用户凭证
# 它和 gcloud 的 CLI 凭证是两套东西
gcloud auth application-default login
```

坑点：`auth login` 与 `auth application-default login` 是两套凭证——前者给 gcloud 命令用，后者给程序里的 Google 客户端库用。CLI 能跑通但程序报 401 时，先想起这条。

## 第一步：模式选择——Autopilot 还是标准

这是 GKE 的第一个决策点，也影响后面所有命令：

| 维度 | Autopilot | 标准（Standard） |
| :--- | :--- | :--- |
| 节点管理 | Google 全托管，你只管 Pod | 你管节点池 |
| 计费 | 按 Pod 申请的资源计费 | 按节点 VM 计费 |
| 适合 | 大多数业务负载、小团队 | 特殊节点需求（GPU/自定义内核/特权容器）、极致成本调优 |

拿不准就选 Autopilot——它把"节点打补丁、伸缩、容量规划"全部收走，代价是失去节点级控制权：

```bash
# Autopilot：区域级集群（控制面与节点自动跨 3 个可用区）
gcloud container clusters create-auto my-gke \
  --region us-central1
```

标准模式则要自己定义节点：

```bash
# 标准模式：区域级集群，3 个节点
gcloud container clusters create my-gke \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-ip-alias \
  --release-channel regular
```

两个参数说明：
- `--region` 创建的是**区域级**集群（节点分布在区域内多个 zone），比 `--zone` 单可用区集群的抗故障能力强得多，生产默认区域级。
- `--release-channel regular` 让 Google 自动把集群升级到稳定版本通道，少操心手动升级（也可选 rapid/production 等通道节奏）。

## 第二步：连上集群

```bash
# 把集群凭证写入 kubeconfig，之后 kubectl 直接可用
gcloud container clusters get-credentials my-gke \
  --region us-central1

kubectl get nodes
```

常用变体：

```bash
# 访问其他项目的集群
gcloud container clusters get-credentials my-gke \
  --region us-central1 \
  --project other-project-456

# 私有集群（控制面仅内网）在 VPC 内连接时走内部 IP
gcloud container clusters get-credentials my-gke \
  --region us-central1 \
  --internal-ip

# 查看与管理
gcloud container clusters list
gcloud container clusters describe my-gke --region us-central1
```

## 第三步：镜像——Artifact Registry

GCP 的容器镜像仓库是 Artifact Registry（旧版 Container Registry 已淘汰）。流程：建仓库 → 配 Docker 认证 → 推镜像 → 部署引用。

```bash
# 创建 Docker 格式仓库
gcloud artifacts repositories create my-repo \
  --repository-format docker \
  --location us-central1

# 让本机 docker 能推拉该仓库（写入 docker 的凭证助手配置）
gcloud auth configure-docker us-central1-docker.pkg.dev

# 镜像地址格式：<位置>-docker.pkg.dev/<项目>/<仓库>/<镜像>:<标签>
docker tag myapp:1.0 us-central1-docker.pkg.dev/my-project-123/my-repo/myapp:1.0
docker push us-central1-docker.pkg.dev/my-project-123/my-repo/myapp:1.0

# 列出仓库镜像
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-123/my-repo
```

CI 构建的镜像日积月累，无标签镜像（被新构建顶掉的旧层）定期清理：

```bash
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-123/my-repo \
  --filter="-tags:*" \
  --format="get(package)" \
  | xargs -I{} gcloud artifacts docker images delete {}
```

然后按正常 Kubernetes 流程部署 Deployment（镜像写上面的完整地址）。标准模式 + `deploy` 命令族或 Autopilot 都一样走 kubectl。

## 第四步：伸缩

两层伸缩在 GKE 里的分工与 AKS 相同：节点池自动扩缩解决"没有机器"，HPA 解决"Pod 不够"。

```bash
# 节点池自动伸缩：1-10 个节点
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --node-pool default-pool

# 关闭自动伸缩
gcloud container clusters update my-gke \
  --region us-central1 \
  --no-enable-autoscaling \
  --node-pool default-pool

# 手动调整节点数
gcloud container clusters resize my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --num-nodes 5
```

注意命名不对称：查询/创建节点池用 `node-pools` 子命令，**改节点数却挂在 `clusters resize` 下**，这是 gcloud 的高频踩坑点。

开发环境省钱：把节点池缩到 0（控制面仍计费但便宜，节点费用归零）：

```bash
gcloud container clusters resize my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --num-nodes 0
```

Autopilot 没有这些命令——它按 Pod 资源申请计费、自动调度，没负载就没开销。

## 第五步：升级与维护窗口

GKE 的版本形如 `1.31.x-gke.xxxx`。手动升级分两步走：

```bash
# 查看该区域支持的版本与默认版本
gcloud container get-server-config \
  --region us-central1

# 第一步：升级控制面
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --master \
  --cluster-version 1.31.1-gke.1000

# 第二步：升级节点池（滚动替换节点）
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --cluster-version 1.31.1-gke.1000
```

大规模节点池可以分批升级、每批之间留观察期（soak time），出问题及时停：

```bash
# 每批 3 个节点，批间隔 120 秒观察
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --batch-size 3 \
  --batch-soak-duration 120s

# 升级过程中发现异常，取消剩余批次（已升级的节点不回滚）
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --cancel
```

控制维护节奏的两个配置：

```bash
# 每日维护窗口（自动升级只会在此期间动手）
gcloud container clusters update my-gke \
  --region us-central1 \
  --maintenance-window-start 03:00 \
  --maintenance-window-end 07:00 \
  --maintenance-window-recurrence FREQ=DAILY

# 大促/节假日排除期：这段时间绝不自动维护
gcloud container clusters update my-gke \
  --region us-central1 \
  --add-maintenance-exclusion-name holiday \
  --add-maintenance-exclusion-start 2026-12-24T00:00:00Z \
  --add-maintenance-exclusion-end 2026-12-26T00:00:00Z
```

排查"集群现在在干什么"：

```bash
gcloud container operations list \
  --region us-central1 \
  --filter="status=RUNNING"
```

## 第六步：节点池——GPU 与专用负载

标准模式的节点池是承载异构负载的单位：

```bash
# 添加业务节点池
gcloud container node-pools create user-pool \
  --cluster my-gke \
  --region us-central1 \
  --num-nodes 5 \
  --machine-type e2-standard-4

# GPU 节点池（推理/训练用，注意配额要提前申请）
gcloud container node-pools create gpu-pool \
  --cluster my-gke \
  --region us-central1 \
  --num-nodes 2 \
  --machine-type n1-standard-4 \
  --accelerator type=nvidia-tesla-t4,count=1

gcloud container node-pools list --cluster my-gke --region us-central1
gcloud container node-pools delete user-pool --cluster my-gke --region us-central1
```

调度习惯：给 GPU 池上的 Pod 加 nodeSelector/taint，避免普通业务被调度到贵 10 倍的 GPU 机器上。

## 第七步：身份——Workload Identity

GKE 上 Pod 访问 GCP 服务（读 GCS、发消息）的正道是 Workload Identity：把 K8s ServiceAccount 和 GCP 服务账号（GSA）绑定，Pod 无需存放任何密钥。三步：

```bash
# 1. 集群开启 Workload Identity（标准模式；Autopilot 默认开启）
gcloud container clusters update my-gke \
  --region us-central1 \
  --workload-pool my-project-123.svc.id.goog

# 2. 授权 K8s SA 冒充 GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  my-gsa@my-project-123.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project-123.svc.id.goog[default/my-ksa]"

# 3. 给 K8s SA 打注解，指向 GCP SA
kubectl annotate serviceaccount my-ksa \
  iam.gke.io/gcp-service-account=my-gsa@my-project-123.iam.gserviceaccount.com
```

之后使用 `my-ksa` 的 Pod 内，Google 客户端库会自动拿到 GSA 的凭证。权限的粒度由 GSA 的 IAM 角色控制，审计走 GCP IAM 日志。

## 第八步：网络与安全加固

```bash
# 控制面访问白名单（公网集群也建议配，只放运维出口 IP）
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-master-authorized-networks \
  --master-authorized-networks 203.0.113.0/24

# 私有节点集群：节点只有内网 IP，控制面在独立 CIDR
gcloud container clusters create my-gke \
  --region us-central1 \
  --enable-private-nodes \
  --master-ipv4-cidr 172.16.0.0/28 \
  --enable-ip-alias

# Pod 间网络策略（NetworkPolicy 生效的前提）
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-network-policy

# 供应链：只允许运行通过签名验证的镜像
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-binauthz
```

## 第九步：日志、监控与附加组件

GKE 默认把日志指标送进 Cloud Operations（原 Stackdriver），查日志不必登录节点：

```bash
# 控制日志/指标的采集范围
gcloud container clusters update my-gke \
  --region us-central1 \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM

# 查询容器日志
gcloud logging read \
  'resource.type="k8s_container" AND resource.labels.cluster_name="my-gke"' \
  --limit 50 \
  --format=json

# 实时跟踪（等价 kubectl logs -f，但不用进集群）
gcloud logging tail \
  'resource.type="k8s_container" AND resource.labels.cluster_name="my-gke"'

# 查询容器 CPU 指标
gcloud monitoring time-series list \
  --filter 'metric.type="kubernetes.io/container/cpu/core_usage_time"' \
  --interval-start-time 2026-07-31T00:00:00Z \
  --interval-end-time 2026-07-31T01:00:00Z
```

按需附加组件：

```bash
# HTTP(S) 负载均衡附加组件（Ingress 的后端实现）
gcloud container clusters update my-gke --region us-central1 --enable-addons HttpLoadBalancing

# Cloud Run（在 GKE 集群里跑 Knative）
gcloud container clusters update my-gke --region us-central1 --enable-addons CloudRun

# Config Sync：GitOps 配置同步
gcloud container clusters update my-gke --region us-central1 --enable-config-sync

# 多集群统一管理：注册到 GKE Hub
gcloud container hub memberships register my-gke \
  --gke-cluster us-central1/my-gke \
  --enable-workload-identity
```

## 清理与坑点

```bash
# 删除集群（Autopilot 与标准同命令）
gcloud container clusters delete my-gke --region us-central1
```

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| CLI 通、程序 401 | 两套凭证体系 | `gcloud auth application-default login` |
| 改节点数用了 `node-pools` 子命令 | 找不到 scale 子命令 | 节点数调整在 `clusters resize` 下 |
| `--zone` 建了单可用区集群 | zone 故障 = 集群失联 | 生产用 `--region` 区域级集群 |
| 忘记 `configure-docker` | push 报 denied | 先配 Artifact Registry 凭证助手 |
| Workload Identity 只做了三步之一 | Pod 还是拿不到凭证 | 集群池、IAM 绑定、SA 注解三样齐全 |
| 自动升级撞上大促 | 升级引发的滚动重启影响线上 | 提前配 maintenance exclusion |
| 节点池缩 0 当"停机" | 控制面与负载均衡仍在计费 | 想省钱要缩 0 + 删 Service（或干脆删集群） |

## 自检

1. 你的负载需要特权容器和自定内核参数，选 Autopilot 还是标准模式？为什么？
2. 升级到一半发现新版本有兼容问题，已经升级的节点会回滚吗？怎么止损？
3. Pod 里的程序读 GCS 报权限错误，按 Workload Identity 的三步依次检查什么？

## 练习

1. 分别用 create-auto 和标准命令各建一个最小集群，对比 `describe` 输出里 Google 替你做了哪些决策，然后都删掉。
2. 完整走通 Artifact Registry：建仓库、推镜像、部署一个 Deployment，再跑一次无标签镜像清理。
3. 配好 Workload Identity 三步，用一个 Pod 里的 `gcloud storage ls` 验证免密访问。

## 下一步

- 与 AKS 对照阅读：见 [Azure AKS 命令](/cloud-computing/500-AzureAKSCommands)，注意两者的伸缩与身份模型差异。
- GCP 项目与凭证基础：见 [GCP CLI 配置](/cloud-computing/390-GCPCliConfigure)。
- 多集群与 GitOps：GKE Hub + Config Sync 深入见 [多云与混合架构](/cloud-computing/280-MultiCloudHybridArchitecture)。
