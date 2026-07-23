---
order: 57
title: Helm包管理
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: Helm包管理：Chart结构、值管理、仓库操作与最佳实践详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Kubernetes存储'
  - 'cloud-computing/云安全服务'
  - 'cloud-computing/云成本优化'
  - 'cloud-computing/12要素应用'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. Helm 概述

### 1.1 什么是 Helm

Helm 是 Kubernetes 的包管理器，将应用定义为 Chart，实现一键部署和版本管理。

### 1.2 核心概念

| 概念       | 描述                  |
| ---------- | --------------------- |
| Chart      | 应用包（模板+默认值） |
| Release    | Chart 的部署实例      |
| Repository | Chart 仓库            |
| Values     | 配置值                |

### 1.3 Helm 3 vs Helm 2

| 对比项       | Helm 2           | Helm 3          |
| ------------ | ---------------- | --------------- |
| Tiller       | 需要             | 不需要          |
| 安全模型     | Tiller 权限      | kubeconfig 权限 |
| Release 存储 | ConfigMap/Secret | Secret          |
| 命名空间     | Tiller 全局      | 按命名空间      |

## 2. Chart 结构

### 2.1 目录结构

```
my-chart/
├── Chart.yaml          # Chart 元数据
├── values.yaml         # 默认值
├── charts/             # 依赖 Chart
├── templates/          # 模板文件
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl    # 模板辅助
│   └── NOTES.txt       # 安装说明
├── templates/tests/    # 测试模板
└── .helmignore         # 忽略文件
```

### 2.2 Chart.yaml

```yaml
apiVersion: v2
name: my-app
description: My application Helm chart
type: application
version: 1.0.0 # Chart 版本
appVersion: '2.1.0' # 应用版本
dependencies:
  - name: redis
    version: '17.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: redis.enabled
```

### 2.3 values.yaml

```yaml
replicaCount: 3

image:
  repository: my-app
  pullPolicy: IfNotPresent
  tag: '2.1.0'

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

redis:
  enabled: true
  auth:
    password: ''
```

## 3. 模板语法

### 3.1 基本语法

```yaml
# 引用值
{{ .Values.replicaCount }}

# 条件判断
{{- if .Values.ingress.enabled }}
# ingress 内容
{{- end }}

# 循环
{{- range .Values.ingress.hosts }}
- host: {{ .host }}
{{- end }}

# 默认值
image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
```

### 3.2 辅助模板

```yaml
# templates/_helpers.tpl
{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "my-app.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### 3.3 使用辅助模板

```yaml
metadata:
  name: { { include "my-app.fullname" . } }
  labels: { { - include "my-app.labels" . | nindent 4 } }
```

## 4. 常用命令

### 4.1 仓库管理

```bash
# 添加仓库
helm repo add bitnami https://charts.bitnami.com/bitnami

# 更新索引
helm repo update

# 搜索 Chart
helm search repo nginx
```

### 4.2 安装与升级

```bash
# 安装
helm install my-release bitnami/nginx

# 自定义值
helm install my-release bitnami/nginx -f values.yaml

# 设置单个值
helm install my-release bitnami/nginx --set service.type=NodePort

# 升级
helm upgrade my-release bitnami/nginx -f values.yaml

# 安装或升级
helm upgrade --install my-release bitnami/nginx -f values.yaml
```

### 4.3 管理与调试

```bash
# 查看已安装
helm list

# 查看状态
helm status my-release

# 查看历史
helm history my-release

# 回滚
helm rollback my-release 1

# 卸载
helm uninstall my-release

# 调试模板
helm template my-release . --debug
helm install --dry-run my-release . --debug
```

## 5. Chart 依赖

### 5.1 声明依赖

```yaml
# Chart.yaml
dependencies:
  - name: redis
    version: '17.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: redis.enabled
  - name: postgresql
    version: '12.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: postgresql.enabled
    alias: db
```

### 5.2 更新依赖

```bash
helm dependency update
helm dependency build
```

## 6. 最佳实践

| 实践     | 描述                         |
| -------- | ---------------------------- |
| 版本控制 | Chart 和 values 文件纳入 Git |
| 环境分离 | 每个环境独立 values 文件     |
| 条件依赖 | 使用 condition 控制可选组件  |
| 模板复用 | 使用 \_helpers.tpl           |
| 资源限制 | 始终设置 resources           |
| 健康检查 | 配置 liveness/readiness      |
| 镜像标签 | 不使用 latest                |
| 测试     | 编写 helm test               |
