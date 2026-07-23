---
order: 103
title: Actions自托管运行器
module: github
category: toolchain
difficulty: advanced
description: 'GitHub Actions自托管运行器详解：安装配置、自动扩展、安全加固与运维管理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Actions矩阵构建
  - github/Actions缓存依赖
  - github/Actions制品传递
  - github/Actions环境部署
prerequisites:
  - github/GitHub概述
---

## 1. 自托管运行器概述

### 1.1 与 GitHub 托管运行器对比

| 维度   | GitHub 托管运行器                | 自托管运行器           |
| ------ | -------------------------------- | ---------------------- |
| 硬件   | 固定规格（2核/7GB/14GB SSD）     | 自定义硬件             |
| 环境   | 每次全新虚拟机                   | 持久环境               |
| 费用   | 公开仓库免费，私有仓库按分钟计费 | 自行承担硬件和运维成本 |
| 网络   | 公网访问                         | 可访问内网资源         |
| GPU    | 不支持                           | 可配置 GPU             |
| 安全性 | 隔离环境，安全                   | 需自行加固             |
| 维护   | GitHub 维护                      | 自行维护               |

### 1.2 适用场景

- 需要 **GPU** 的 ML/AI 训练
- 需要访问**内网资源**（数据库、API）
- 需要**特殊硬件**（ARM、特定芯片）
- 需要**持久缓存**（大型依赖、Docker 镜像）
- 需要**更长运行时间**（超过 6 小时）
- **成本优化**（高频使用时比按分钟计费更便宜）

## 2. 安装与配置

### 2.1 添加运行器

在仓库 Settings → Actions → Runners → New self-hosted runner 中获取安装命令：

```bash
# 1. 下载
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 2. 解压
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# 3. 配置
./config.sh --url https://github.com/OWNER/REPO --token ABC123

# 4. 运行
./run.sh
```

### 2.2 作为服务运行

```bash
# 安装为 systemd 服务
sudo ./svc.sh install

# 启动服务
sudo ./svc.sh start

# 查看状态
sudo ./svc.sh status

# 停止服务
sudo ./svc.sh stop

# 卸载服务
sudo ./svc.sh uninstall
```

### 2.3 运行器标签

```bash
# 配置时指定自定义标签
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --labels gpu,linux-arm64,high-memory
```

在工作流中使用标签选择运行器：

```yaml
jobs:
  train:
    runs-on: [self-hosted, gpu]
    steps:
      - run: nvidia-smi
```

### 2.4 运行器组

```yaml
# 组织级别运行器组
jobs:
  build:
    runs-on: [self-hosted, linux, x64]
    # 从匹配的运行器组中选择
```

## 3. 自动扩展

### 3.1 基于需求的扩展

使用 [actions-runner-controller](https://github.com/actions/actions-runner-controller)（ARC）在 Kubernetes 中自动扩展：

```yaml
# values.yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 10
  scaleDownDelaySecondsAfterScaleOut: 300
  metrics:
    - type: External
      external:
        metric:
          name: github_runner_queue_length
        target:
          type: AverageValue
          averageValue: '1'
```

### 3.2 ARC 部署

```bash
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml

# 安装 ARC
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm install arc actions-runner-controller/actions-runner-controller \
  --namespace arc-systems --create-namespace

# 创建 Runner Deployment
kubectl apply -f runnerdeployment.yaml
```

### 3.3 RunnerDeployment 配置

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: org-runner
spec:
  replicas: 2
  template:
    spec:
      organization: my-org
      labels:
        - k8s-runner
      resources:
        limits:
          cpu: '4'
          memory: '8Gi'
      dockerEnabled: false
      volumeMounts:
        - name: cache
          mountPath: /cache
      volumes:
        - name: cache
          persistentVolumeClaim:
            claimName: runner-cache
```

## 4. 安全加固

### 4.1 安全风险

自托管运行器在非隔离环境中执行任意代码，存在以下风险：

| 风险       | 说明                             |
| ---------- | -------------------------------- |
| 代码执行   | PR 中的恶意代码可直接访问运行器  |
| 凭据泄露   | 运行器上的环境变量和文件可被读取 |
| 持久化攻击 | 修改运行器环境影响后续 Job       |
| 网络访问   | 运行器可访问内网资源             |

### 4.2 安全措施

**1. 使用 ephemeral 运行器**：

```bash
# 每次执行后自动注销
./config.sh --url https://github.com/OWNER/REPO --token ABC123 --ephemeral
```

**2. 限制 PR 触发**：

```yaml
# 仅允许内部仓库的 PR 触发自托管运行器
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

jobs:
  build:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: [self-hosted, linux]
```

**3. 使用 Docker 模式**：

```yaml
jobs:
  build:
    runs-on: [self-hosted, linux]
    container:
      image: node:22
      options: --user 1001
    steps:
      - run: npm test
```

**4. 最小权限原则**：

```bash
# 创建专用用户运行 runner
sudo useradd -m -s /bin/bash github-runner
sudo -u github-runner ./config.sh --url ... --token ...
```

### 4.3 运行器清理

```yaml
# 工作流末尾清理
steps:
  - name: Cleanup
    if: always()
    run: |
      rm -rf $RUNNER_TEMP/*
      rm -rf $GITHUB_WORKSPACE/*
      docker system prune -af 2>/dev/null || true
```

## 5. 运维管理

### 5.1 监控

```yaml
# 健康检查
- name: Runner health check
  run: |
    echo "Runner OS: $RUNNER_OS"
    echo "Runner Arch: $RUNNER_ARCH"
    echo "Runner Temp: $RUNNER_TEMP"
    echo "Disk usage:"
    df -h
    echo "Memory usage:"
    free -h
```

### 5.2 更新运行器

```bash
# 停止服务
sudo ./svc.sh stop

# 更新
./config.sh --url https://github.com/OWNER/REPO --token NEW_TOKEN

# 重启服务
sudo ./svc.sh start
```

### 5.3 故障排查

```bash
# 查看运行器日志
cat ~/actions-runner/_diag/Runner_*.log

# 查看 systemd 日志
journalctl -u actions.runner.*

# 检查运行器连接
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/runners
```

### 5.4 运行器生命周期

```
Online → Idle → Running → Idle → ...
                   ↓
               Offline（手动停止/故障）
                   ↓
               Online（重新连接）
```

## 6. 最佳实践

### 6.1 环境隔离

```
推荐架构:
  开发/测试 → GitHub 托管运行器
  生产部署 → 自托管运行器（访问内网）
  GPU 任务 → 自托管运行器（GPU 实例）
```

### 6.2 缓存策略

```yaml
# 自托管运行器可利用持久存储
- name: Cache Docker images
  run: |
    if ! docker image inspect my-base-image:latest &>/dev/null; then
      docker pull my-base-image:latest
    fi
```

### 6.3 成本优化

```
运行时间 < 3000 分钟/月 → GitHub 托管更划算
运行时间 > 3000 分钟/月 → 自托管可能更便宜
需要 GPU → 必须自托管
需要内网 → 必须自托管
```
