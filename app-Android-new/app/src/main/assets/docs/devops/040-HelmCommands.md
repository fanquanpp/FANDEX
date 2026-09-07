---
order: 400
title: Helm 包管理命令
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: DevOps Helm 包管理命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## helm install 安装 Chart

**基本写法：安装 Chart**
`helm install <名称> <Chart>`
```bash
# 安装 nginx Chart
helm install my-nginx bitnami/nginx
```

**基本写法：指定命名空间安装**
`helm install <名称> <Chart> -n <命名空间>`
```bash
# 在 dev 命名空间安装
helm install my-nginx bitnami/nginx -n dev
```

**基本写法：通过 values 文件安装**
`helm install <名称> <Chart> -f <values文件>`
```bash
# 使用自定义 values 安装
helm install my-nginx bitnami/nginx -f custom-values.yaml
```

**基本写法：命令行传参安装**
`helm install <名称> <Chart> --set <键>=<值>`
```bash
# 设置副本数和镜像版本
helm install my-nginx bitnami/nginx --set replicaCount=3 --set image.tag=1.25
```

**基本写法：本地 Chart 安装**
`helm install <名称> <路径>`
```bash
# 安装本地 Chart
helm install my-app ./mychart
```

---

## helm upgrade 升级 Chart

**基本写法：升级 Release**
`helm upgrade <名称> <Chart>`
```bash
# 升级 my-nginx Chart
helm upgrade my-nginx bitnami/nginx
```

**基本写法：升级并安装**
`helm upgrade <名称> <Chart> --install`
```bash
# 不存在则安装，存在则升级
helm upgrade my-nginx bitnami/nginx --install
```

**基本写法：使用新 values 升级**
`helm upgrade <名称> <Chart> -f <values文件>`
```bash
# 使用新配置升级
helm upgrade my-nginx bitnami/nginx -f new-values.yaml
```

**基本写法：命令行传参升级**
`helm upgrade <名称> <Chart> --set <键>=<值>`
```bash
# 通过命令行参数升级
helm upgrade my-nginx bitnami/nginx --set replicaCount=5
```

---

## helm uninstall 卸载 Chart

**基本写法：卸载 Release**
`helm uninstall <名称>`
```bash
# 卸载 my-nginx Release
helm uninstall my-nginx
```

**基本写法：指定命名空间卸载**
`helm uninstall <名称> -n <命名空间>`
```bash
# 卸载指定命名空间的 Release
helm uninstall my-nginx -n dev
```

**基本写法：保留历史记录卸载**
`helm uninstall <名称> --keep-history`
```bash
# 卸载但保留历史记录
helm uninstall my-nginx --keep-history
```

---

## helm list 查看 Release

**基本写法：查看所有 Release**
`helm list`
```bash
# 列出所有已安装的 Release
helm list
```

**基本写法：查看所有命名空间的 Release**
`helm list -A`
```bash
# 列出所有命名空间的 Release
helm list -A
```

**基本写法：包含已卸载的 Release**
`helm list --all`
```bash
# 列出包含已卸载的所有 Release
helm list --all
```

**基本写法：查看指定命名空间**
`helm list -n <命名空间>`
```bash
# 查看 dev 命名空间的 Release
helm list -n dev
```

---

## helm search 搜索 Chart

**基本写法：搜索 Hub 上的 Chart**
`helm search hub <关键词>`
```bash
# 搜索 nginx 相关的 Chart
helm search hub nginx
```

**基本写法：搜索已添加仓库的 Chart**
`helm search repo <关键词>`
```bash
# 在已添加的仓库中搜索
helm search repo nginx
```

---

## helm repo 仓库管理

**基本写法：添加仓库**
`helm repo add <名称> <URL>`
```bash
# 添加 bitnami 仓库
helm repo add bitnami https://charts.bitnami.com/bitnami
```

**基本写法：更新仓库**
`helm repo update`
```bash
# 更新所有已添加的仓库
helm repo update
```

**基本写法：列出所有仓库**
`helm repo list`
```bash
# 列出所有已添加的仓库
helm repo list
```

**基本写法：删除仓库**
`helm repo remove <名称>`
```bash
# 删除 bitnami 仓库
helm repo remove bitnami
```

---

## helm pull 下载 Chart

**基本写法：下载 Chart**
`helm pull <仓库>/<Chart>`
```bash
# 下载 nginx Chart
helm pull bitnami/nginx
```

**基本写法：下载并解压**
`helm pull <仓库>/<Chart> --untar`
```bash
# 下载并解压到当前目录
helm pull bitnami/nginx --untar
```

**基本写法：指定版本下载**
`helm pull <仓库>/<Chart> --version <版本>`
```bash
# 下载指定版本
helm pull bitnami/nginx --version 15.0.0
```

**基本写法：指定下载目录**
`helm pull <仓库>/<Chart> --untar --untardir <目录>`
```bash
# 解压到指定目录
helm pull bitnami/nginx --untar --untardir ./charts
```

---

## helm create 创建 Chart

**基本写法：创建新 Chart**
`helm create <名称>`
```bash
# 创建名为 myapp 的 Chart
helm create myapp
```

**基本写法：指定 Chart 路径**
`helm create <路径>/<名称>`
```bash
# 在指定路径创建 Chart
helm create ./charts/myapp
```

---

## helm template 渲染模板

**基本写法：渲染模板**
`helm template <名称> <Chart>`
```bash
# 渲染 myapp Chart 的模板
helm template myapp ./mychart
```

**基本写法：使用 values 渲染**
`helm template <名称> <Chart> -f <values文件>`
```bash
# 使用 values 渲染模板
helm template myapp ./mychart -f values.yaml
```

**基本写法：命令行传参渲染**
`helm template <名称> <Chart> --set <键>=<值>`
```bash
# 通过命令行参数渲染
helm template myapp ./mychart --set image.tag=v2
```

---

## helm history/rollback 回滚

**基本写法：查看 Release 历史**
`helm history <名称>`
```bash
# 查看 my-nginx 的历史版本
helm history my-nginx
```

**基本写法：回滚到指定版本**
`helm rollback <名称> <版本号>`
```bash
# 回滚到版本 2
helm rollback my-nginx 2
```

---

## helm status 查看 Release 状态

**基本写法：查看 Release 状态**
`helm status <名称>`
```bash
# 查看 my-nginx 的状态
helm status my-nginx
```

**基本写法：查看指定命名空间状态**
`helm status <名称> -n <命名空间>`
```bash
# 查看 dev 命名空间的 Release 状态
helm status my-nginx -n dev
```

**基本写法：显示资源信息**
`helm status <名称> --show-resources`
```bash
# 显示 Release 相关的所有资源
helm status my-nginx --show-resources
```

---

## helm show 查看 Chart 信息

**基本写法：查看 Chart 的 values**
`helm show values <Chart>`
```bash
# 查看 nginx Chart 的默认 values
helm show values bitnami/nginx
```

**基本写法：查看 Chart 信息**
`helm show chart <Chart>`
```bash
# 查看 Chart 的 Chart.yaml 内容
helm show chart bitnami/nginx
```

**基本写法：查看 Chart 全部信息**
`helm show all <Chart>`
```bash
# 查看 Chart 的所有信息
helm show all bitnami/nginx
```
