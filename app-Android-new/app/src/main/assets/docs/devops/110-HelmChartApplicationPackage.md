---
order: 110
title: Helm Chart 应用打包
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Helm Chart 应用打包：Chart 结构、模板语法、Values 覆盖与仓库发布。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/210-Terraform'
  - 'devops/120-HelmCommands'
prerequisites:
  - 'devops/090-KubernetesCoreDetailed'
---

## 0. 一句话理解

> Helm 是 Kubernetes 的"包管理器"（类比 apt/npm）：**Chart** 是打包格式（一组带
> Go 模板变量的 YAML），**Values** 是配置参数，**Release** 是一次安装实例。
> 写一个 Chart，就能用不同参数部署到开发/测试/生产的任何集群。

## 1. 为什么需要 Helm

裸 YAML 清单的问题：多环境要复制粘贴改镜像版本/副本数；升级要手动 `kubectl apply`
每个文件；回滚没有记录。Helm 的解法：

| 概念 | 是什么 | 类比 npm |
| :--- | :--- | :--- |
| Chart | 模板化应用包 | package.json + 代码 |
| values.yaml | 参数默认值 | 默认配置 |
| Release | Chart + 参数的一次安装 | node_modules 里的一次安装 |
| Repository | Chart 仓库 | npm registry |

Helm 3（当前 3.x 主线）相比 Helm 2 的关键变化：去掉服务端组件 Tiller，
直接用 kubeconfig 权限操作——这也是今天大家敢用它的前提。

## 2. Chart 目录结构

```
mychart/
├── Chart.yaml          # Chart 元数据：名称、版本、依赖
├── values.yaml         # 默认参数值
├── charts/             # 子 Chart（依赖的 Chart）
├── templates/          # 模板清单
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── _helpers.tpl    # 模板片段/命名模板（下划线开头不会被渲染为资源）
│   └── NOTES.txt       # 安装后输出给用户的使用提示
└── .helmignore         # 打包时忽略的文件
```

```yaml
# Chart.yaml
apiVersion: v2 # Helm 3 必须为 v2
name: myapp
description: A demo web application chart
type: application # application（应用）或 library（纯模板库）
version: 0.1.0    # Chart 自身版本（SemVer，发布必须递增）
appVersion: '2.0.0' # 所打包应用的版本（字符串，与 chart version 独立）
dependencies:
  - name: postgresql
    version: '16.x.x'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: postgresql.enabled # 由 values 开关是否启用子 Chart
```

## 3. 模板语法：Go Template + Sprig

### 3.1 三类最常用的写法

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}  # 引用 _helpers.tpl 的命名模板（推荐方式）
  labels:
    {{- include "myapp.labels" . | nindent 4 }}  # 管道：模板输出后再缩进 4 格
spec:
  replicas: {{ .Values.replicaCount }}    # 读 values
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}         # 内置对象：.Chart/.Release/.Values/.Files
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          # default 管道：tag 未设置时回退到 appVersion，避免出现空标签
```

内置对象速查：

| 对象 | 内容 |
| :--- | :--- |
| `.Values` | values.yaml 合并后的参数树 |
| `.Release.Name` / `.Release.Namespace` | 本次安装名 / 命名空间 |
| `.Chart` | Chart.yaml 的元数据 |
| `.Capabilities` | 集群能力（K8s 版本等，用于版本兼容分支） |

### 3.2 流程控制与陷阱

```yaml
{{- if .Values.ingress.enabled }}   # -}} 吃掉换行，控制空白符
apiVersion: networking.k8s.io/v1
kind: Ingress
...
{{- end }}
```

常见模板陷阱：

1. **空白符失控**：Go Template 会保留换行与缩进，养成 `{{- -}}` 与 `| nindent`
   的使用习惯，渲染错位的 YAML 是新手最大挫败来源。
2. **strict 模式调试**：`helm lint`、`helm template --validate`、`helm install --dry-run`
   三连是排错顺序。
3. **模板里写死镜像 latest**：打包的意义就是可追溯，镜像版本永远参数化。

## 4. Values：默认值与覆盖链

覆盖优先级（低到高）：

```text
chart 自带 values.yaml
  < -f my-values.yaml（用户文件，多个时后者覆盖前者）
  < --set foo.bar=1（命令行，优先级最高）
```

```yaml
# values.yaml
replicaCount: 1
image:
  repository: myapp
  tag: '' # 留空回退 appVersion
resources:
  requests: { cpu: 100m, memory: 128Mi }
ingress:
  enabled: false
# 子 Chart 的参数挂在子 Chart 名下
postgresql:
  enabled: true
  auth:
    database: myapp
```

```bash
# 生产覆盖示例
helm upgrade --install myapp ./mychart \
  -f values-production.yaml \
  --set image.tag=2.0.0 \
  --set replicaCount=3
```

实践建议：`--set` 适合临时覆盖，**正式环境差异一律用 values 文件进 Git**，
否则"这次到底改了什么"无法追溯（这也为 GitOps 打基础）。

## 5. 仓库与发布

### 5.1 Chart 仓库

```bash
# 打包与维护仓库（仓库本质=一组 tgz + index.yaml 静态文件）
helm package ./mychart                    # 生成 mychart-0.1.0.tgz
helm repo index ./dist --url https://charts.example.com  # 重建索引
# 也可推送到支持 OCI 的镜像仓库（Helm 3.8+ GA）
helm push mychart-0.1.0.tgz oci://registry.example.com/charts
```

### 5.2 生命周期：安装/升级/回滚

```bash
helm install myapp ./mychart -n prod --create-namespace
helm upgrade myapp ./mychart -f values-production.yaml --atomic  # 失败自动回滚
helm history myapp                       # 查看修订历史
helm rollback myapp 3                    # 回滚到修订 3
helm uninstall myapp                     # 卸载
```

`--atomic`（等价 `--wait` + 失败回滚）是生产升级的常用保险；
`helm get manifest myapp` 可查看 Release 实际渲染出的完整清单。

## 6. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| 用 `--set` 管理全部生产差异 | 配置漂移、不可追溯 | values 文件进 Git |
| 忘记递增 Chart version | `helm upgrade` 拒绝或混淆 | 升级必改 version |
| 模板中硬编码命名空间 | 多环境无法复用 | 用 `.Release.Namespace` |
| 密码写进 values.yaml | 泄漏进 Git | 引用 Secret 或接外部密钥系统 |
| 升级不 `--dry-run` 预览 | 直接改坏生产 | `helm diff upgrade`（插件）先行 |

## 7. 动手试试

1. `helm create guestbook`，通读生成的模板，找到 `_helpers.tpl` 中 fullname 的拼法。
2. 用 `--set ingress.enabled=true` 渲染 `helm template`，对比开关前后的输出差异。
3. 把 `helm lint` 故意弄红：在 deployment.yaml 里制造一个缩进错误并修复。

## 8. 小结

**初学者要点**

1. Chart=模板包、Values=参数、Release=安装实例；三层结构对应"复用、差异、版本"。
2. 起步姿势：`helm create` 骨架 + `helm template` 本地预览 + `helm upgrade --install`。
3. 生产差异用 values 文件管理并纳入版本控制。

**进阶注意**

1. `--atomic`/`--wait` 是升级安全的两道保险；`helm diff upgrade` 是变更评审工具。
2. OCI 仓库让 Chart 与镜像同仓管理；library Chart 用于多团队共享模板片段。
3. 复杂多环境管理（几千个 Release）交给 ArgoCD/Flux 渲染 Chart（见 GitOps 篇），
   Helm 命令行退居调试位。
