---
order: 430
title: Actions 自托管运行器
module: 'github'
category: 工具链
difficulty: advanced
description: GitHub Actions自托管运行器对比驱动详解：GitHub托管运行器 vs 自托管运行器全程对比，覆盖注册安装、标签路由、安全加固与运维管理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/390-ActionsMatrixBuild'
  - 'github/400-ActionsCacheDependency'
  - 'github/410-ActionsArtifact'
  - 'github/420-ActionsEnvironmentDeploy'
prerequisites:
  - 'github/010-GitHubOverview'
---

## 0. 开始之前："自家健身房"与"商业健身房"的选择

想健身，你有两种选择：

- **商业健身房**：办卡就能去，器械全新、环境干净，有教练指导，不操心维护。缺点：器械规格固定（没有你家那台祖传跑步机）、人多要排队、月卡按时间收费。
- **自家健身房**：把自家车库改造成健身房，器械随你挑（可以买专业深蹲架、上跑步机还能看内网监控）。缺点：设备自己买、坏了自己修、还要操心防盗。

GitHub Actions 的**运行器（Runner）** 就是"执行工作流的机器"，同样有这两种形态：

- **GitHub 托管运行器（GitHub-hosted runner）**：商业健身房。GitHub 提供现成的虚拟机（Linux/macOS/Windows），用完即焚，干净隔离。
- **自托管运行器（Self-hosted runner）**：自家健身房。你把**自己的服务器/电脑**接入 GitHub 来跑任务，硬件、环境、网络全由你掌控，但也由你负责安全与维护。

本文采用**对比驱动**的方式，把这两种运行器从头到尾比一遍，再深入讲自托管运行器的注册、标签与安全。

## 1. 运行器是什么：先直观理解

### 1.1 一个朴素的问题

工作流（workflow）是写在 YAML 里的"指令"，指令总得有台机器去执行吧？`runs-on: ubuntu-latest` 里的 `ubuntu-latest` 就是告诉 GitHub："这次任务给我一台最新的 Ubuntu 虚拟机来跑"。这台"执行机器"就是运行器。

```yaml
jobs:
  build:
    runs-on: ubuntu-latest        # GitHub 托管运行器：标准虚拟机
    steps:
      - run: echo "Hello"

  build-local:
    runs-on: [self-hosted, linux] # 自托管运行器：你自己的机器
    steps:
      - run: echo "Hello"
```

### 1.2 运行器在 Actions 体系中的位置

```
事件（push/PR/定时）→ 触发工作流 → 分配 job → 匹配运行器 → 在运行器上依次执行 steps
                                              │
                        runs-on: ubuntu-latest（托管） 或 [self-hosted, linux]（自托管）
```

## 2. 全程对比：GitHub 托管运行器 vs 自托管运行器

### 2.1 大对比表

| 维度 | GitHub 托管运行器 | 自托管运行器 |
| --- | --- | --- |
| 硬件规格 | 固定（标准型约 2 核 CPU/7 GB 内存/14 GB SSD） | 完全自定义（大内存、多核、GPU 都行） |
| 环境洁净度 | 每次任务都是全新虚拟机，用完销毁 | 持久环境，上一个任务可能留下文件 |
| 费用 | 公开仓库免费；私有仓库按分钟计费（含免费额度） | 自行承担硬件、电费与运维成本 |
| 网络 | 公网环境 | 可访问内网资源（数据库、私有 API） |
| GPU | 不支持 | 可配置 GPU（ML/AI 训练） |
| 运行时长限制 | 有超时限制 | 可跑更长时间的任务 |
| 安全 | 隔离环境，风险低 | 需要自行加固，风险高 |
| 维护 | GitHub 全权维护 | 自己负责升级、监控、排障 |

### 2.2 什么场景该选自托管（官方建议 + 实践经验）

- 需要 **GPU** 的 ML/AI 训练任务。
- 需要访问**内网资源**（公司数据库、内部 API、私有镜像仓库）。
- 需要**特殊硬件/架构**（ARM 芯片、特定 CPU 指令集）。
- 需要**持久缓存**（大体积依赖、Docker 镜像，见 033 缓存主题）。
- 需要**更长运行时间**的任务。
- **成本优化**：私有仓库高频使用时，按分钟计费可能比自建更贵；官方给出的经验是"运行时间较多时自托管更划算"。

### 2.3 什么时候别选自托管

一个极其重要的官方警告：**GitHub 官方强烈建议只对私有仓库使用自托管运行器**。因为公开仓库的 fork 可能通过 PR 在工作流中执行任意代码——一旦这些代码跑在你的自托管机器上，就相当于陌生人拿到了你服务器的执行权限。如果必须用于公开仓库，务必做好隔离与加固（见第 5 节）。

## 3. 注册与安装：把"自家健身房"开起来

### 3.1 前置条件

- 能安装并运行自托管运行器应用的机器（支持 Linux、Windows 10/11、较新的 macOS 版本，以及 x64/ARM64 架构；Linux ARM32 已被官方弃用，安装前以 runner 发布说明的支持矩阵为准）。
- 机器能与 GitHub 通信（出站 HTTP/HTTPS 连接）。
- 硬件资源足够跑目标工作流（运行器应用本身占用极小）。
- 若工作流使用 Docker 容器或服务容器，必须是 Linux 机器且安装了 Docker。

### 3.2 添加运行器（官方标准流程）

在仓库 **Settings → Actions → Runners → New self-hosted runner** 页面，选择操作系统与架构后，GitHub 会给出完整的安装命令，核心四步如下：

```bash
# 1. 下载运行器应用（以 Linux x64 为例，版本号以页面提示为准）
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 2. 解压
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# 3. 配置并注册（--token 为页面生成的限时令牌，约 1 小时后过期，过期需重新生成）
./config.sh --url https://github.com/OWNER/REPO --token ABC123

# 4. 启动运行器
./run.sh
```

Windows 上的对应命令为 `.\config.cmd` 与 `.\run.cmd`；若要把运行器安装为 Windows 服务，需要用管理员权限的 shell 打开。

### 3.3 作为服务运行（Linux/macOS，推荐生产用法）

直接跑 `./run.sh` 会占用一个终端，机器重启后还要手动再跑。推荐用官方自带的 systemd 服务脚本：

```bash
# 安装为 systemd 服务
sudo ./svc.sh install

# 启动 / 查看状态 / 停止
sudo ./svc.sh start
sudo ./svc.sh status
sudo ./svc.sh stop

# 卸载服务
sudo ./svc.sh uninstall
```

### 3.4 自动补全：注册时的可选参数

```bash
# 配置时指定自定义标签（逗号分隔）
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --labels gpu,linux-arm64,high-memory

# 不添加默认标签（默认标签见第 4 节）
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --no-default-labels

# 临时运行器：每次任务执行后自动注销（安全场景推荐，见第 5 节）
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --ephemeral
```

## 4. 标签与路由：如何把任务"派"到正确的机器

### 4.1 默认标签

运行器注册后会自动获得以下默认标签（官方定义）：

| 标签 | 含义 |
| --- | --- |
| `self-hosted` | 所有自托管运行器默认带此标签 |
| `linux` / `windows` / `macOS` | 按操作系统自动打标 |
| `x64` / `ARM` / `ARM64` | 按硬件架构自动打标 |

### 4.2 在 workflow 中按标签选择运行器

```yaml
jobs:
  build:
    # 需要同时满足三个标签才派单：自托管 + Linux + ARM64
    runs-on: [self-hosted, linux, ARM64]
    steps:
      - run: echo "在 ARM64 的 Linux 自托管机器上执行"
```

自定义标签示例（给装了 GPU 的机器打 `gpu` 标）：

```yaml
jobs:
  train:
    runs-on: [self-hosted, gpu]     # 只派给带 gpu 标签的机器
    steps:
      - run: nvidia-smi
```

### 4.3 运行器组（Runner Groups）

组织级运行器可以分组，组内的仓库才可用该组运行器——适合"敏感环境只给特定仓库用"：

```yaml
jobs:
  deploy:
    runs-on: [self-hosted, linux, x64]   # 从匹配的运行器组中调度
    steps:
      - run: ./deploy.sh
```

### 4.4 路由规则（官方行为）

GitHub 调度 job 到自托管运行器的规则：

1. 查找与 job 的 `runs-on` **标签和组全部匹配**的在线空闲运行器，把任务派过去。
2. 若运行器在 **60 秒内**未接单，任务会被重新排队，换一台运行器接。
3. 若一直没有匹配的在线运行器，job 会一直排队，**排队超过 24 小时**则失败。

## 5. 安全加固：自家健身房要有"门禁"

### 5.1 安全风险清单

| 风险 | 说明 |
| --- | --- |
| 任意代码执行 | PR 中的恶意代码可直接在运行器上执行（官方警告的核心） |
| 凭据泄露 | 运行器上的环境变量、文件、密钥可被读取 |
| 持久化攻击 | 修改运行器环境（装后门、改全局配置）影响后续所有 job |
| 内网渗透 | 自托管运行器可访问内网，成为攻击跳板 |

### 5.2 官方推荐的安全措施

**措施一：只对私有仓库使用自托管运行器**（官方首要建议）。fork 无法在私有仓库创建 PR。

**措施二：使用临时（ephemeral）运行器**。每个 job 结束后自动注销，不留持久环境：

```bash
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --ephemeral
```

**措施三：限制 PR 触发**。即使要用，也只允许同仓库内部 PR 触发：

```yaml
jobs:
  build:
    # 仅当 PR 来自本仓库（而非 fork）时运行
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: [self-hosted, linux]
```

**措施四：用容器隔离任务**。让任务跑在容器里，降低对宿主机的污染：

```yaml
jobs:
  build:
    runs-on: [self-hosted, linux]
    container:
      image: node:22
      options: --user 1001        # 以非 root 用户运行
    steps:
      - run: npm test
```

**措施五：最小权限 + 专用账号**。用专用低权限系统账号运行运行器，避免用 root/管理员：

```bash
sudo useradd -m -s /bin/bash github-runner
sudo -u github-runner ./config.sh --url https://github.com/OWNER/REPO --token ABC123
```

**措施六：任务结束后清理现场**：

```yaml
steps:
  - name: Cleanup
    if: always()
    run: |
      rm -rf $RUNNER_TEMP/*
      rm -rf $GITHUB_WORKSPACE/*
      docker system prune -af 2>/dev/null || true
```

## 6. 自动扩展：健身房按客流调整营业面积

任务多时要多台机器，任务少时要省钱，就需要**自动扩展**。官方推荐方案是 **Actions Runner Controller（ARC）**——基于 Kubernetes 的官方参考实现。

### 6.1 ARC 部署要点

```bash
# 1. 安装 cert-manager（ARC 依赖）
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml

# 2. 用 Helm 安装 ARC
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm install arc actions-runner-controller/actions-runner-controller \
  --namespace arc-systems --create-namespace

# 3. 应用 RunnerDeployment 配置（见下）
kubectl apply -f runnerdeployment.yaml
```

### 6.2 RunnerDeployment 示例

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: org-runner
spec:
  replicas: 2                 # 基础副本数
  template:
    spec:
      organization: my-org    # 注册到组织
      labels:
        - k8s-runner          # 自定义标签
      resources:
        limits:
          cpu: '4'
          memory: 8Gi
      dockerEnabled: false
```

### 6.3 按队列长度扩缩容

```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: github_runner_queue_length   # 按待执行 job 队列长度扩容
        target:
          type: AverageValue
          averageValue: '1'
```

## 7. 运维管理：日常体检与排障

### 7.1 健康检查

```yaml
- name: Runner health check
  run: |
    echo "OS: $RUNNER_OS / Arch: $RUNNER_ARCH"
    df -h          # 磁盘
    free -h        # 内存
```

### 7.2 更新运行器

```bash
# 停止服务 → 重新配置 → 启动
sudo ./svc.sh stop
./config.sh --url https://github.com/OWNER/REPO --token NEW_TOKEN
sudo ./svc.sh start
```

### 7.3 常见排障手段

```bash
# 查看运行器诊断日志
cat ~/actions-runner/_diag/Runner_*.log

# 查看 systemd 服务日志
journalctl -u actions.runner.*

# 用 API 查看注册的运行器列表与状态
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/runners
```

### 7.4 生命周期

```
Online（在线空闲）→ Running（执行中）→ Idle → ...
                       ↓
                  Offline（手动停止/故障）
                       ↓
                  Online（重新连接）
```

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| job 一直排队不运行 | 任务卡在 queued 状态 | 没有与 `runs-on` 标签匹配的在线运行器 | 检查运行器是否在线、标签是否匹配；注意排队超 24 小时会失败 |
| 注册 token 失效 | `Invalid registration token` | 注册令牌约 1 小时后过期 | 回到 Settings → Runners 页面重新生成 token |
| fork 的 PR 在自托管运行器上跑恶意代码 | 机器被攻击 | 公开仓库 + 自托管运行器的固有风险 | 官方建议仅私有仓库使用；必须用时加 `--ephemeral` 与同仓库 PR 限制 |
| 工作流需要 Docker 但运行器不支持 | 容器相关步骤报错 | 自托管运行器跑容器任务需 Linux + 已装 Docker | 用 Linux 机器并安装 Docker，或改用托管运行器 |
| 运行器被前一个任务"污染" | 任务结果不稳定 | 持久环境残留文件/环境变量 | 任务里做清理，或使用 ephemeral 运行器 |
| 60 秒未接单导致重派 | job 在运行器间反复跳转 | 运行器启动慢或网络抖动 | 检查运行器资源与网络，确保及时接单 |
| 队列超 24 小时 | job 直接失败 | 一直没有匹配运行器在线 | 监控运行器在线率，必要时上 ARC 自动扩展 |

## 10. 一句话记忆

**自托管运行器 = 自家健身房：硬件网络全自控，安全维护全自负——官方只建议私有仓库使用，标签路由派单、ephemeral 隔离、最小权限加固是三条保命底线。**
