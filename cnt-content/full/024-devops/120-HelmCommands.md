---
order: 140
title: Helm 包管理命令
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 'Helm 学习笔记：把一个开源 Chart 装进集群并管好它的一生——搜索、装、升、回滚、卸载，再到自己写 Chart 的调试循环。'
author: fanquanpp
updated: '2026-10-05'
related:
  - 'devops/110-HelmChartApplicationPackage'
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/190-GitOpsArgoCD'
prerequisites:
  - 'devops/090-KubernetesCoreDetailed'
---

## 0. 场景

团队要部署一个 nginx，手写 YAML 要写 Deployment、Service、ConfigMap 好几百行；而社区早就把"一套能跑的生产级 nginx 配置"打包成了 Chart。Helm 的工作就是：**装别人打包好的应用，以及把自己写的应用打包起来反复部署**。概念解释（Chart/Values/Release）见 [Helm Chart 应用打包](/devops/110-HelmChartApplicationPackage)，本篇只管动手，按一个应用的一生来走命令。

## 1. 找：搜索与添加仓库

Chart 从仓库（repo）里来。Helm Hub 是个目录，具体安装还得先把来源仓库添加到本机：

```bash
# 添加 bitnami 仓库（最常见的开源 Chart 来源）
helm repo add bitnami https://charts.bitnami.com/bitnami

# 更新本地仓库索引（隔天搜索不到新版本多半是忘了这句）
helm repo update

# 列出已添加的仓库
helm repo list

# 删除仓库
helm repo remove bitnami

# 搜索：hub 是在线目录，repo 是本地已添加仓库
helm search hub nginx
helm search repo nginx
```

习惯配置：`repo add` 之后紧跟一次 `repo update`，然后才 search——顺序错了搜索结果是旧的。

## 2. 装：install 之前先看 values

直接 install 是新手的错误顺序。正确姿势是**先读默认配置，再决定覆盖什么**：

```bash
# 看这个 Chart 有哪些可调参数（这是最重要的命令之一）
helm show values bitnami/nginx

# 看 Chart 元数据与全部信息
helm show chart bitnami/nginx
helm show all bitnami/nginx
```

然后安装。四种传参方式按优先级从低到高：

```bash
# 默认参数安装
helm install my-nginx bitnami/nginx

# 指定命名空间
helm install my-nginx bitnami/nginx -n dev

# 用 values 文件覆盖（正式环境差异用这个，文件进 Git）
helm install my-nginx bitnami/nginx -f custom-values.yaml

# 命令行临时覆盖（快速实验用）
helm install my-nginx bitnami/nginx --set replicaCount=3 --set image.tag=1.25

# 安装自己写的本地 Chart
helm install my-app ./mychart
```

values 的覆盖优先级与陷阱（`--set` 最高、生产差异必须落文件）在 110 篇有展开，这里记结论：**`--set` 用完即弃，正式环境一律 `-f` 文件**。

## 3. 管：list 与 status

装完先确认它真的起来了：

```bash
helm list                    # 当前命名空间的 Release
helm list -A                 # 所有命名空间
helm list -n dev             # 指定命名空间
helm list --all              # 连已卸载的一起列出

helm status my-nginx                     # Release 状态
helm status my-nginx -n dev
helm status my-nginx --show-resources    # 它创建了哪些 K8s 资源
```

`status` 卡在 `pending-install` 或 `pending-upgrade` 超过几分钟，通常是资源起不来——接 `kubectl get pods` 与 `describe` 排查，修完再重试。

## 4. 升：upgrade 与它的保险丝

升级是 Helm 的高频动作——改 values、换镜像版本都是 upgrade：

```bash
helm upgrade my-nginx bitnami/nginx
helm upgrade my-nginx bitnami/nginx -f new-values.yaml
helm upgrade my-nginx bitnami/nginx --set replicaCount=5

# 里程碑命令：不存在则安装，存在则升级（CI/CD 与脚本的标配）
helm upgrade my-nginx bitnami/nginx --install
```

`upgrade --install` 幂等，脚本里无脑可用；配合 110 篇讲过的 `--atomic`（失败自动回滚）是生产升级的完整保险。

## 5. 悔：history 与 rollback

Helm 每次安装/升级都会生成一个修订号（revision），回滚就是"把状态指回某个修订"：

```bash
helm history my-nginx        # 看所有修订
helm rollback my-nginx 2     # 回滚到修订 2
```

演练一次最踏实：`--set replicaCount=3` 升上去，`helm history` 看到新修订，`rollback` 回来，`kubectl get pods` 亲眼看到副本数变回去。

卸载是最后一站：

```bash
helm uninstall my-nginx
helm uninstall my-nginx -n dev
helm uninstall my-nginx --keep-history   # 卸载资源但留历史（想 rollback 就靠它）
```

## 6. 自己写 Chart：create 与渲染循环

写 Chart 的调试循环是"改模板 → 本地渲染 → 检查输出"，**不碰集群**就能完成大半开发：

```bash
# 生成 Chart 骨架（自带 deployment/service/ingress 模板，是最好的学习材料）
helm create myapp
helm create ./charts/myapp

# 本地渲染：把模板 + values 渲染成纯 YAML
helm template myapp ./mychart
helm template myapp ./mychart -f values.yaml
helm template myapp ./mychart --set image.tag=v2

# 下载别人的 Chart 来学习/改造
helm pull bitnami/nginx
helm pull bitnami/nginx --untar
helm pull bitnami/nginx --version 15.0.0
helm pull bitnami/nginx --untar --untardir ./charts
```

渲染通过后再上线：`helm lint` 查问题 → `helm template` 人工过目 → `upgrade --install --atomic` 上。整套流程渲染失败不会影响集群，试错零成本。

## 7. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| add repo 后直接 search | 搜不到或版本过期 | 先 `helm repo update` |
| 生产差异全用 `--set` | 配置漂移、不可追溯 | values 文件进 Git，`--set` 只做临时实验 |
| install 前不读 `show values` | 副本数/资源限额全是默认值 | 装之前先看清单 |
| 升级失败后反复重试同一命令 | 停在 pending 状态 | `helm status` + kubectl 排查根因 |
| uninstall 后想回滚 | 历史没了 | 关键 Release 卸载时加 `--keep-history` |
| 忘了 `-n` 命名空间 | 装到了 default | 养成显式 `-n` 的习惯 |

## 8. 动手试试

1. 添加 bitnami 仓库，`helm show values bitnami/nginx` 通读一遍，找出至少三个你不知道存在的可调参数。
2. 完整走一遍生命周期：install（改副本数为 2）→ upgrade（改镜像 tag）→ history → rollback → status --show-resources → uninstall --keep-history。
3. `helm create guestbook` 后用 `helm template` 渲染，故意在模板里改坏缩进，观察错误信息长什么样再修复。

## 9. 小结

**初学者要点**

1. 一个应用的一生：search/repo → show values → install → status → upgrade → rollback → uninstall，命令顺序就是这条线。
2. `helm upgrade --install` 是幂等的部署原语，脚本与 CI 的首选入口。
3. 模板开发靠 `helm template` 本地循环，便宜且安全。

**进阶注意**

1. `--atomic`/`--wait` 是升级保险，`helm diff`（插件）是升级前评审工具，两者配合构成变更安全网。
2. `helm get manifest <release>` 能看 Release 实际渲染出的完整清单——排查"线上到底是什么配置"的最终答案。
3. 多环境规模化后，Helm 命令行退居调试位，渲染与发布交给 ArgoCD/Flux（见 [GitOps ArgoCD](/devops/190-GitOpsArgoCD)）。
