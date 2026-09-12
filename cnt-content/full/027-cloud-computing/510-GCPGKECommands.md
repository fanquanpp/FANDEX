---
order: 510
title: GCP GKE Kubernetes 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'GKE 命令实战：项目与凭证、集群创建与升级、节点池、自动伸缩与网络/安全配置。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---
## 学习目标

本文是「云计算」模块的第 51 篇，难度定位为入门。重点内容：GKE 命令实战：项目与凭证、集群创建与升级、节点池、自动伸缩与网络/安全配置。

主要章节：

- 凭证与项目
- 集群创建
- 凭证与连接
- 节点池管理
- 集群升级
- 自动伸缩与维护
- ……共 12 个章节

## 凭证与项目

**基本写法：登录 GCP**
`gcloud auth login`
```bash
# 通过浏览器交互登录 Google Cloud
gcloud auth login
```

---

**基本写法：设置项目**
`gcloud config set project <项目ID>`
```bash
# 切换到指定项目
gcloud config set project my-project-123
```

---

**基本写法：查看当前配置**
`gcloud config list`
```bash
# 查看当前账户、项目等配置
gcloud config list
```

---

**基本写法：应用凭证**
`gcloud auth application-default login`
```bash
# 为本地应用设置默认凭证
gcloud auth application-default login
```

---

**基本写法：列出账户**
`gcloud auth list`
```bash
# 查看所有已登录账户
gcloud auth list
```

---

## 集群创建

**基本写法：创建 Autopilot 集群**
`gcloud container clusters create-auto <集群名> --region <区域>`
```bash
# 创建 Autopilot 集群(Google 托管节点)
gcloud container clusters create-auto my-gke \
  --region us-central1
```

---

**基本写法：创建标准集群**
`gcloud container clusters create <集群名> --region <区域> --num-nodes <节点数>`
```bash
# 创建标准模式 GKE 集群
gcloud container clusters create my-gke \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type e2-medium
```

---

**基本写法：创建带可用区集群**
`gcloud container clusters create <集群名> --zone <可用区> --num-nodes <数量>`
```bash
# 创建单可用区集群
gcloud container clusters create my-gke \
  --zone us-central1-a \
  --num-nodes 3
```

---

**基本写法：启用 Workload Identity**
`gcloud container clusters create <集群名> --region <区域> --workload-pool <项目ID>.svc.id.goog`
```bash
# 启用 Workload Identity
gcloud container clusters create my-gke \
  --region us-central1 \
  --workload-pool my-project-123.svc.id.goog
```

---

**基本写法：使用发布通道**
`gcloud container clusters create <集群名> --region <区域> --release-channel <通道>`
```bash
# 使用 Regular 发布通道
gcloud container clusters create my-gke \
  --region us-central1 \
  --release-channel regular \
  --enable-ip-alias
```

---

## 凭证与连接

**基本写法：获取集群凭证**
`gcloud container clusters get-credentials <集群名> --region <区域>`
```bash
# 配置 kubectl 连接到 GKE 集群
gcloud container clusters get-credentials my-gke \
  --region us-central1
```

---

**基本写法：跨项目获取凭证**
`gcloud container clusters get-credentials <集群名> --region <区域> --project <项目ID>`
```bash
# 访问其他项目的集群
gcloud container clusters get-credentials my-gke \
  --region us-central1 \
  --project other-project-456
```

---

**基本写法：使用内部 IP**
`gcloud container clusters get-credentials <集群名> --region <区域> --internal-ip`
```bash
# 通过内部 IP 连接私有集群
gcloud container clusters get-credentials my-gke \
  --region us-central1 \
  --internal-ip
```

---

**基本写法：查看集群列表**
`gcloud container clusters list`
```bash
# 列出当前项目所有集群
gcloud container clusters list
```

---

**基本写法：查看集群详情**
`gcloud container clusters describe <集群名> --region <区域>`
```bash
# 查看 my-gke 集群配置
gcloud container clusters describe my-gke \
  --region us-central1
```

---

## 节点池管理

**基本写法：创建节点池**
`gcloud container node-pools create <池名> --cluster <集群> --region <区域> --num-nodes <数量>`
```bash
# 为集群添加新节点池
gcloud container node-pools create user-pool \
  --cluster my-gke \
  --region us-central1 \
  --num-nodes 5 \
  --machine-type e2-standard-4
```

---

**基本写法：列出节点池**
`gcloud container node-pools list --cluster <集群> --region <区域>`
```bash
# 查看集群所有节点池
gcloud container node-pools list \
  --cluster my-gke \
  --region us-central1
```

---

**基本写法：缩放节点池**
`gcloud container clusters resize <集群> --region <区域> --node-pool <池名> --num-nodes <数量>`
```bash
# 缩放节点池到 10 个节点
gcloud container clusters resize my-gke \
  --region us-central1 \
  --node-pool user-pool \
  --num-nodes 10
```

---

**基本写法：删除节点池**
`gcloud container node-pools delete <池名> --cluster <集群> --region <区域>`
```bash
# 删除指定节点池
gcloud container node-pools delete user-pool \
  --cluster my-gke \
  --region us-central1
```

---

**基本写法：GPU 节点池**
`gcloud container node-pools create <池名> --accelerator type=<GPU 类型>,count=<数量>`
```bash
# 创建带 T4 GPU 的节点池
gcloud container node-pools create gpu-pool \
  --cluster my-gke \
  --region us-central1 \
  --num-nodes 2 \
  --machine-type n1-standard-4 \
  --accelerator type=nvidia-tesla-t4,count=1
```

---

## 集群升级

**基本写法：查看可用升级版本**
`gcloud container get-server-config --region <区域>`
```bash
# 查看区域支持的所有版本
gcloud container get-server-config \
  --region us-central1
```

---

**基本写法：升级集群控制面**
`gcloud container clusters upgrade <集群> --region <区域> --master --cluster-version <版本>`
```bash
# 升级控制面到 1.30
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --master \
  --cluster-version 1.30.1-gke.1000
```

---

**基本写法：升级节点池**
`gcloud container clusters upgrade <集群> --region <区域> --node-pool <池名> --cluster-version <版本>`
```bash
# 升级指定节点池
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --cluster-version 1.30.1-gke.1000
```

---

**基本写法：仅升级一部分节点**
`gcloud container clusters upgrade <集群> --region <区域> --node-pool <池名> --batch-soak-duration <时间>`
```bash
# 分批升级节点池并设置间隔
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --batch-size 3 \
  --batch-soak-duration 120s
```

---

**基本写法：取消升级**
`gcloud container clusters upgrade <集群> --region <区域> --node-pool <池名> --cancel`
```bash
# 取消正在进行的节点池升级
gcloud container clusters upgrade my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --cancel
```

---

## 自动伸缩与维护

**基本写法：启用节点自动伸缩**
`gcloud container clusters update <集群> --region <区域> --enable-autoscaling --min-nodes <最小> --max-nodes <最大>`
```bash
# 启用集群自动伸缩 1-10
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --node-pool default-pool
```

---

**基本写法：禁用自动伸缩**
`gcloud container clusters update <集群> --region <区域> --no-enable-autoscaling`
```bash
# 关闭节点自动伸缩
gcloud container clusters update my-gke \
  --region us-central1 \
  --no-enable-autoscaling \
  --node-pool default-pool
```

---

**基本写法：配置维护窗口**
`gcloud container clusters update <集群> --region <区域> --maintenance-window-start <时间>`
```bash
# 设置每日凌晨维护窗口
gcloud container clusters update my-gke \
  --region us-central1 \
  --maintenance-window-start 03:00 \
  --maintenance-window-end 07:00 \
  --maintenance-window-recurrence FREQ=DAILY
```

---

**基本写法：维护排除项**
`gcloud container clusters update <集群> --region <区域> --add-maintenance-exclusion-name <名称> --add-maintenance-exclusion-start <开始> --add-maintenance-exclusion-end <结束>`
```bash
# 添加维护排除窗口(该期间不进行维护)
gcloud container clusters update my-gke \
  --region us-central1 \
  --add-maintenance-exclusion-name holiday \
  --add-maintenance-exclusion-start 2026-12-24T00:00:00Z \
  --add-maintenance-exclusion-end 2026-12-26T00:00:00Z
```

---

## 网络配置

**基本写法：创建私有集群**
`gcloud container clusters create <集群> --region <区域> --enable-private-nodes --master-ipv4-cidr <CIDR>`
```bash
# 创建私有节点集群
gcloud container clusters create my-gke \
  --region us-central1 \
  --enable-private-nodes \
  --master-ipv4-cidr 172.16.0.0/28 \
  --enable-ip-alias
```

---

**基本写法：启用主授权网络**
`gcloud container clusters update <集群> --region <区域> --enable-master-authorized-networks --master-authorized-networks <CIDR>`
```bash
# 仅允许指定 IP 段访问控制面
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-master-authorized-networks \
  --master-authorized-networks 203.0.113.0/24
```

---

**基本写法：启用 Ingress**
`gcloud container clusters update <集群> --region <区域> --enable-addons HttpLoadBalancing`
```bash
# 启用 HTTP(S) 负载均衡器
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-addons HttpLoadBalancing
```

---

**基本写法：启用 Network Policy**
`gcloud container clusters update <集群> --region <区域> --enable-network-policy`
```bash
# 启用网络策略(限制 Pod 间通信)
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-network-policy
```

---

## 安全与身份

**基本写法：启用 Workload Identity**
`gcloud container clusters update <集群> --region <区域> --workload-pool <项目ID>.svc.id.goog`
```bash
# 在已有集群启用 Workload Identity
gcloud container clusters update my-gke \
  --region us-central1 \
  --workload-pool my-project-123.svc.id.goog
```

---

**基本写法：创建 IAM 绑定**
`gcloud iam service-accounts add-iam-policy-binding <SA> --role roles/iam.workloadIdentityUser --member <成员>`
```bash
# 允许 K8s SA 使用 GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  my-gsa@my-project-123.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project-123.svc.id.goog[default/my-ksa]"
```

---

**基本写法：为 K8s SA 添加注解**
`kubectl annotate serviceaccount <SA> iam.gke.io/gcp-service-account=<GCP SA>`
```bash
# 注解 K8s SA 关联 GCP SA
kubectl annotate serviceaccount my-ksa \
  iam.gke.io/gcp-service-account=my-gsa@my-project-123.iam.gserviceaccount.com
```

---

**基本写法：启用 Binary Authorization**
`gcloud container clusters update <集群> --region <区域> --enable-binauthz`
```bash
# 启用 Binary Authorization 强制镜像签名验证
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-binauthz
```

---

## 监控与日志

**基本写法：启用 Cloud Monitoring**
`gcloud container clusters update <集群> --region <区域> --enable-dataplane-v2 --logging=<日志类型>`
```bash
# 启用系统与工作负载监控
gcloud container clusters update my-gke \
  --region us-central1 \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM
```

---

**基本写法：查询日志**
`gcloud logging read "resource.type=\"k8s_container\"" --limit <数量>`
```bash
# 查询 GKE 容器日志
gcloud logging read \
  'resource.type="k8s_container" AND resource.labels.cluster_name="my-gke"' \
  --limit 50 \
  --format=json
```

---

**基本写法：流式日志**
`gcloud logging tail "resource.type=\"k8s_container\""`
```bash
# 实时跟踪容器日志
gcloud logging tail \
  'resource.type="k8s_container" AND resource.labels.cluster_name="my-gke"'
```

---

**基本写法：查询指标**
`gcloud monitoring metrics list --filter <过滤>`
```bash
# 查询容器 CPU 利用率
gcloud monitoring time-series list \
  --filter 'metric.type="kubernetes.io/container/cpu/core_usage_time"' \
  --interval-start-time 2026-07-31T00:00:00Z \
  --interval-end-time 2026-07-31T01:00:00Z
```

---

## 附加组件与功能

**基本写法：启用 Cloud Run on GKE**
`gcloud container clusters update <集群> --region <区域> --enable-addons CloudRun`
```bash
# 启用 Cloud Run 附加组件
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-addons CloudRun
```

---

**基本写法：启用 Config Sync**
`gcloud container clusters update <集群> --region <区域> --enable-config-sync`
```bash
# 启用 Config Sync 用于 GitOps 配置
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-config-sync
```

---

**基本写法：启用 HPA**
`gcloud container clusters update <集群> --region <区域> --enable-horizontal-pod-autoscaling`
```bash
# 启用水平 Pod 自动伸缩
gcloud container clusters update my-gke \
  --region us-central1 \
  --enable-horizontal-pod-autoscaling
```

---

**基本写法：启用 GKE Hub**
`gcloud container hub memberships register <集群> --gke-cluster <区域>/<集群>`
```bash
# 将集群注册到 GKE Hub 用于多集群管理
gcloud container hub memberships register my-gke \
  --gke-cluster us-central1/my-gke \
  --enable-workload-identity
```

---

## 集群操作

**基本写法：停止集群**
`gcloud container clusters update <集群> --region <区域> --no-enable-autoscaling`
```bash
# 缩容到 0(等效停止)
gcloud container clusters resize my-gke \
  --region us-central1 \
  --node-pool default-pool \
  --num-nodes 0
```

---

**基本写法：删除集群**
`gcloud container clusters delete <集群> --region <区域>`
```bash
# 删除指定集群
gcloud container clusters delete my-gke \
  --region us-central1
```

---

**基本写法：配置默认区域**
`gcloud config set compute/region <区域>`
```bash
# 设置默认计算区域避免每次指定
gcloud config set compute/region us-central1
```

---

**基本写法：查看操作列表**
`gcloud container operations list --region <区域>`
```bash
# 查看集群操作历史
gcloud container operations list \
  --region us-central1 \
  --filter="status=RUNNING"
```

---

## Artifact Registry 镜像

**基本写法：创建 Artifact Registry**
`gcloud artifacts repositories create <仓库名> --repository-format docker --location <位置>`
```bash
# 创建 Docker 仓库
gcloud artifacts repositories create my-repo \
  --repository-format docker \
  --location us-central1
```

---

**基本写法：配置 Docker 认证**
`gcloud auth configure-docker <位置>-docker.pkg.dev`
```bash
# 为 Artifact Registry 配置 Docker 凭证
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

**基本写法：列出仓库镜像**
`gcloud artifacts docker images list <位置>-docker.pkg.dev/<项目>/<仓库>`
```bash
# 列出仓库中所有镜像
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-123/my-repo
```

---

**基本写法：清理无标签镜像**
`gcloud artifacts docker images delete <镜像> --delete-tags`
```bash
# 删除无标签的镜像
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-123/my-repo \
  --filter="-tags:*" \
  --format="get(package)" \
  | xargs -I{} gcloud artifacts docker images delete {}
```
