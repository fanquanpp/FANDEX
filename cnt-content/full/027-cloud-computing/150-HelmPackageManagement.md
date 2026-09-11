---
order: 150
title: Helm 包管理
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 'Helm：Chart 结构、values 覆盖链、模板语法、依赖管理、回滚与 GitOps 实践。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/140-KubernetesStorage'
  - 'cloud-computing/430-TerraformStateModule'
prerequisites:
  - 'cloud-computing/110-KubernetesCore'
---

## 前置知识与学习目标

Helm 是 Kubernetes 的包管理器。K8s 原生清单文件是静态 YAML：部署一个带
数据库的中间件要复制粘贴十几份相近的 YAML，改环境要全文替换。Helm 的
解法与系统包管理器（apt/brew）同构：**Chart 是软件包，Release 是安装
实例，values 是安装参数**，升级与回滚都有版本记录。

版本现状：Helm 3（2019 年起，移除 Tiller）是长期主流；Helm 4 已于
2025 年底发布，撰写时 4.x 为现行主线，核心概念（Chart/Release/Values）
与工作流延续 3.x，本文内容对两者基本通用。

完成本文后，你应当能够：读懂并修改任意第三方 Chart；用 values 覆盖链
管理多环境；用 `--dry-run`/`template` 安全调试模板；处理依赖 Chart。

## 1. 核心概念

| 概念       | 描述                  | 类比           |
| ---------- | --------------------- | -------------- |
| Chart      | 应用包（模板+默认值） | apt 的 .deb    |
| Release    | Chart 的部署实例      | 一次「安装」   |
| Repository | Chart 仓库            | apt 源         |
| Values     | 配置值（有覆盖链）    | 安装向导的选项 |

同一个 Chart 可以装出多个 Release（`helm install app-a ...` 与
`app-b ...`），互不影响——这是「一_chart 多实例」的关键。

### 1.1 Helm 2 -> 3 的关键变化

| 对比项       | Helm 2           | Helm 3/4        |
| ------------ | ---------------- | --------------- |
| Tiller       | 需要（服务端）   | 已移除          |
| 安全模型     | Tiller 权限      | kubeconfig 权限 |
| Release 存储 | ConfigMap/Secret | Secret          |

Tiller 是 Helm 2 的服务端组件，持有集群管理员权限，成为著名的安全
短板；Helm 3 起改为客户端直连 API Server，权限跟随你的 kubeconfig。
历史资料里的 `helm init`/`tiller` 内容已全部过时。

## 2. Chart 结构

```text
my-chart/
├── Chart.yaml          # Chart 元数据与依赖声明
├── values.yaml         # 默认值（用户覆盖的起点）
├── charts/             # 依赖 Chart（dependency update 生成）
├── templates/          # Go 模板化的 K8s 清单
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── _helpers.tpl    # 可复用的模板片段
│   └── tests/          # helm test 用的测试 Pod
└── .helmignore         # 打包时忽略的文件
```

### 2.1 Chart.yaml

```yaml
apiVersion: v2
name: my-app
description: My application Helm chart
type: application        # application 应用 / library 库
version: 1.0.0           # Chart 自身版本（语义化，务必递增）
appVersion: '2.1.0'      # 所含应用的版本（仅元信息）
dependencies:
  - name: redis
    version: '17.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: redis.enabled    # values 里可开关整个依赖
```

注意 `version` 与 `appVersion` 是两回事：改了模板升前者，升级了软件
升后者，混用会让历史与回滚失去意义。

### 2.2 values.yaml

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

resources:
  requests: {cpu: 100m, memory: 128Mi}
  limits:   {cpu: 500m, memory: 512Mi}

redis:
  enabled: true
```

values 是 Chart 的「公开 API」：模板只应引用 values 中声明过的键，
不要让用户需要读模板才能知道可配什么。

## 3. 模板语法速成

模板语言是 Go text/template 的 K8s 化封装，四件事覆盖 90% 场景：

```yaml
# 1. 引用值（顶层对象：.Values / .Release / .Chart / .Template）
replicas: {{ .Values.replicaCount }}

# 2. 条件块：{{- 会吃掉前面的空白，保持 YAML 缩进整洁
{{- if .Values.ingress.enabled }}
# ingress 清单内容
{{- end }}

# 3. 循环
{{- range .Values.ingress.hosts }}
- host: {{ .host }}          # range 作用域内 . 即当前元素
{{- end }}

# 4. 默认值与管道
image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
```

### 3.1 辅助模板与引用

```go
// templates/_helpers.tpl：定义可复用片段
{{- define "my-app.fullname" -}}
{{ .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "my-app.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

```yaml
# 普通模板中引用（include 后用 nindent 控制缩进）
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
```

> 陷阱：模板渲染失败最常见的原因不是语法，而是**空白符**——`{{- `
> 与 `- }}` 是否裁剪空格决定 YAML 缩进是否被破坏。调试认准
> `helm template`（见 4.3）。

## 4. 常用命令

### 4.1 仓库管理

```bash
# 添加仓库
helm repo add bitnami https://charts.bitnami.com/bitnami

# 更新本地索引（新增/升级 Chart 前都应执行）
helm repo update

# 搜索 Chart
helm search repo nginx
```

### 4.2 安装与升级

```bash
# 安装：release 名 + chart
helm install my-release bitnami/nginx

# 用自定义 values 安装（多环境的标准姿势：默认值 + 环境文件）
helm install my-release bitnami/nginx -f values-prod.yaml

# 覆盖单个值（快速试验用，生产脚本里避免散落的 --set）
helm install my-release bitnami/nginx --set service.type=NodePort

# 升级（Chart 或 values 变化后重新应用）
helm upgrade my-release bitnami/nginx -f values-prod.yaml

# 安装或升级二合一：CI/CD 幂等发布的标准写法
helm upgrade --install my-release bitnami/nginx -f values-prod.yaml \
  --atomic --timeout 5m
```

`--atomic` 让失败时自动回滚到上一版本，是生产升级的保险丝。

### 4.3 管理与调试

```bash
helm list                          # 当前命名空间已安装的 Release
helm status my-release             # 资源状态
helm history my-release            # 修订历史（回滚的依据）
helm rollback my-release 1         # 回滚到修订 1
helm uninstall my-release          # 卸载

# 两大调试利器：只渲染不执行
helm template my-release . --debug           # 输出最终 YAML
helm install --dry-run my-release . --debug  # 模拟安装并校验
```

> 陷阱一：Release 元数据存在 Secret 里（默认按命名空间隔离），`helm
> list` 看不到其他命名空间的 Release——加 `-A` 或 `-n`。换人/换机器
> 后「看不到自己装的 Release」，多半是 namespace 不对而非丢数据。
>
> 陷阱二：`--set` 不支持复杂结构且类型易错（数字被转字符串），团队
> 协作请统一走 values 文件 + Git。
>
> 陷阱三：Helm 不会自动更新已装的依赖子 Chart——改了 `Chart.yaml`
> 依赖版本后必须 `helm dependency update`，否则 upgrade 用的是
> `charts/` 里的旧包。

## 5. Chart 依赖

```yaml
# Chart.yaml 声明依赖，condition 允许按环境开关
dependencies:
  - name: redis
    version: '17.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: redis.enabled
  - name: postgresql
    version: '12.0.0'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: postgresql.enabled
    alias: db                # 别名：values 中写作 db.enabled 等
```

```bash
helm dependency update      # 解析依赖下载到 charts/
helm dependency build       # 按 Chart.lock 精确重建（CI 用）
```

依赖的 values 以依赖名（或 alias）为前缀传入：顶层 `redis.auth.password`
作用于依赖的 `auth.password`。

## 6. 最佳实践

| 实践     | 描述                                         |
| -------- | -------------------------------------------- |
| 版本控制 | Chart 与各环境 values 全部进 Git             |
| 环境分离 | values-{dev,prod}.yaml，禁止散落 --set       |
| 幂等发布 | CI 统一 `helm upgrade --install --atomic`    |
| 锁依赖   | dependency build + Chart.lock 提交入库       |
| 资源限制 | Chart 内始终给出 resources 默认值            |
| 不用 latest | 镜像 tag 显式化，tag 与 appVersion 对应   |
| 可测试   | templates/tests 提供 helm test 连通性检查    |
| 先渲染   | 任何 upgrade 前 `helm template` 或 --dry-run |

进阶方向：大型团队会向 **GitOps 演进**——Argo CD/Flux 监听 Git 仓库，
把「helm upgrade」变成仓库提交，Helm 退居「渲染引擎」。Helm 与
Kustomize 的分工：Helm 管「参数化整包」，Kustomize 管「在既有清单上
做差异叠加」，两者可以组合使用。

## 小结

- 初学者要点：Chart/Release/Values 三概念；安装升级走
  `helm upgrade --install --atomic`；调试先 `helm template`；Release
  元数据按命名空间隔离存储；依赖改版本后要 `dependency update`。
- 进阶注意：values 是 Chart 的公开 API，保持模板只引用声明过的键；
  `--set` 适合临时实验、不适合生产流水线；version 与 appVersion 语义
  分开；Helm 4 已发布但概念延续 3.x，历史资料中的 Tiller 内容一律
  过时；规模化的下一步通常是 Argo CD/Flux GitOps 化。
