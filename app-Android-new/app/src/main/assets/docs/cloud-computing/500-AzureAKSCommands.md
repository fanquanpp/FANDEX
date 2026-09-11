---
order: 500
title: Azure AKS Kubernetes 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'AKS 命令实战：集群创建、凭证访问、节点池、升级维护、自动伸缩与网络/安全配置。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 集群创建

**基本写法：创建 AKS 集群**
`az aks create --name <集群名> --resource-group <组> --node-count <节点数> --generate-ssh-keys`
```bash
# 创建 3 节点 AKS 集群
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --generate-ssh-keys
```

---

**基本写法：创建带系统池的集群**
`az aks create --name <集群名> --resource-group <组> --nodepool-name <池名> --node-count <数量>`
```bash
# 创建系统节点池
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --nodepool-name systempool \
  --node-count 3 \
  --mode System
```

---

**基本写法：使用托管 AAD 集成**
`az aks create --name <集群名> --resource-group <组> --enable-aad --aad-admin-group-object-ids <组ID>`
```bash
# 启用 Azure AD 集成与 RBAC
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --enable-aad \
  --aad-admin-group-object-ids 00000000-0000-0000-0000-000000000000 \
  --enable-azure-rbac
```

---

**基本写法：创建带网络插件集群**
`az aks create --name <集群名> --network-plugin <插件> --network-plugin-mode <模式>`
```bash
# 创建 Azure CNI Overlay 网络的集群
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 10.244.0.0/16
```

---

**基本写法：使用可用区**
`az aks create --name <集群名> --resource-group <组> --zones 1 2 3`
```bash
# 跨三个可用区部署节点
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --zones 1 2 3 \
  --node-count 3
```

---

## 凭证与访问

**基本写法：获取集群凭证**
`az aks get-credentials --name <集群名> --resource-group <组>`
```bash
# 将 AKS 凭证合并到 kubeconfig
az aks get-credentials \
  --name my-aks \
  --resource-group my-rg
```

---

**基本写法：覆盖现有凭证**
`az aks get-credentials --name <集群名> --resource-group <组> --overwrite-existing`
```bash
# 覆盖已有的同名上下文
az aks get-credentials \
  --name my-aks \
  --resource-group my-rg \
  --overwrite-existing
```

---

**基本写法：使用管理员凭证**
`az aks get-credentials --name <集群名> --resource-group <组> --admin`
```bash
# 获取 cluster-admin 凭证(应急使用)
az aks get-credentials \
  --name my-aks \
  --resource-group my-rg \
  --admin
```

---

**基本写法：查看集群信息**
`az aks show --name <集群名> --resource-group <组>`
```bash
# 查看集群详细配置
az aks show --name my-aks --resource-group my-rg
```

---

**基本写法：列出所有集群**
`az aks list --resource-group <组>`
```bash
# 列出资源组下所有 AKS 集群
az aks list --resource-group my-rg --output table
```

---

## 节点池管理

**基本写法：添加节点池**
`az aks nodepool add --cluster-name <集群> --name <池名> --resource-group <组> --node-count <数量>`
```bash
# 添加用户节点池
az aks nodepool add \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --node-count 5 \
  --node-vm-size Standard_DS3_v2 \
  --mode User
```

---

**基本写法：列出节点池**
`az aks nodepool list --cluster-name <集群> --resource-group <组>`
```bash
# 查看集群所有节点池
az aks nodepool list \
  --cluster-name my-aks \
  --resource-group my-rg \
  --output table
```

---

**基本写法：缩放节点池**
`az aks nodepool scale --cluster-name <集群> --name <池名> --resource-group <组> --node-count <数量>`
```bash
# 将节点池缩放到 8 个节点
az aks nodepool scale \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --node-count 8
```

---

**基本写法：删除节点池**
`az aks nodepool delete --cluster-name <集群> --name <池名> --resource-group <组>`
```bash
# 删除指定节点池
az aks nodepool delete \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg
```

---

**基本写法：升级节点池**
`az aks nodepool upgrade --cluster-name <集群> --name <池名> --resource-group <组> --kubernetes-version <版本>`
```bash
# 升级节点池到指定 K8s 版本
az aks nodepool upgrade \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --kubernetes-version 1.30.0
```

---

## 集群升级与维护

**基本写法：查看可用升级版本**
`az aks get-upgrades --name <集群名> --resource-group <组>`
```bash
# 列出集群可升级的版本
az aks get-upgrades \
  --name my-aks \
  --resource-group my-rg
```

---

**基本写法：升级集群**
`az aks upgrade --name <集群名> --resource-group <组> --kubernetes-version <版本>`
```bash
# 升级集群控制面到 1.30.0
az aks upgrade \
  --name my-aks \
  --resource-group my-rg \
  --kubernetes-version 1.30.0
```

---

**基本写法：仅升级控制面**
`az aks upgrade --name <集群名> --resource-group <组> --kubernetes-version <版本> --control-plane-only`
```bash
# 仅升级控制面不升级节点
az aks upgrade \
  --name my-aks \
  --resource-group my-rg \
  --kubernetes-version 1.30.0 \
  --control-plane-only
```

---

**基本写法：配置维护窗口**
`az aks maintenanceconfiguration add --cluster-name <集群> --resource-group <组> --name <配置名> --config-file <文件>`
```bash
# 配置每周六维护窗口
az aks maintenanceconfiguration add \
  --cluster-name my-aks \
  --resource-group my-rg \
  --name default \
  --config-file maintenance.json
```

---

**基本写法：自动升级配置**
`az aks update --name <集群名> --resource-group <组> --auto-upgrade-channel <通道>`
```bash
# 启用 stable 自动升级通道
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --auto-upgrade-channel stable
```

---

## 缩放与自动伸缩

**基本写法：手动缩放集群**
`az aks scale --name <集群名> --resource-group <组> --node-count <数量>`
```bash
# 调整节点数为 5
az aks scale \
  --name my-aks \
  --resource-group my-rg \
  --node-count 5
```

---

**基本写法：启用集群自动伸缩**
`az aks update --name <集群名> --resource-group <组> --enable-cluster-autoscaler --min-count <最小> --max-count <最大>`
```bash
# 启用集群自动伸缩 3-10
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

---

**基本写法：节点池自动伸缩**
`az aks nodepool update --cluster-name <集群> --name <池名> --enable-cluster-autoscaler --min-count <最小> --max-count <最大>`
```bash
# 为用户节点池启用自动伸缩
az aks nodepool update \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 20
```

---

**基本写法：禁用集群自动伸缩**
`az aks update --name <集群名> --resource-group <组> --disable-cluster-autoscaler`
```bash
# 关闭集群自动伸缩
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --disable-cluster-autoscaler
```

---

**基本写法：启用 KEDA 事件驱动伸缩**
`az aks update --name <集群名> --resource-group <组> --enable-keda`
```bash
# 启用 KEDA 工作负载伸缩
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-keda
```

---

## 网络配置

**基本写法：启用 HTTP 应用路由**
`az aks update --name <集群名> --resource-group <组> --enable-http-application-routing`
```bash
# 启用 HTTP 应用路由附加功能
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-http-application-routing
```

---

**基本写法：启用 Azure 服务网格**
`az aks update --name <集群名> --resource-group <组> --enable-azure-service-mesh`
```bash
# 启用 Azure Service Mesh
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-azure-service-mesh
```

---

**基本写法：配置出口负载均衡器**
`az aks create --name <集群名> --resource-group <组> --load-balancer-outbound-ips <IP ID>`
```bash
# 使用指定公网 IP 作为出口
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --load-balancer-outbound-ips /subscriptions/.../providers/Microsoft.Network/publicIPAddresses/my-ip
```

---

**基本写法：私有集群**
`az aks create --name <集群名> --resource-group <组> --enable-private-cluster`
```bash
# 创建私有集群(API 服务器不可公网访问)
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --enable-private-cluster \
  --enable-private-cluster-public-fqdn
```

---

## 安全与身份

**基本写法：启用工作负载身份**
`az aks update --name <集群名> --resource-group <组> --enable-workload-identity --enable-oidc-issuer`
```bash
# 启用 Workload Identity(替代 AAD Pod Identity)
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-workload-identity \
  --enable-oidc-issuer
```

---

**基本写法：查看 OIDC 颁发者 URL**
`az aks show --name <集群名> --resource-group <组> --query oidcIssuerProfile.issuerURL`
```bash
# 获取 OIDC 颁发者 URL
az aks show \
  --name my-aks \
  --resource-group my-rg \
  --query oidcIssuerProfile.issuerURL \
  --output tsv
```

---

**基本写法：启用 Azure Key Vault 密钥库**
`az aks update --name <集群名> --resource-group <组> --enable-keyvault-secrets-provider`
```bash
# 启用 Key Vault Secrets Provider
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-keyvault-secrets-provider \
  --rotate-secret-after 30d
```

---

**基本写法：分配 Azure 角色**
`az role assignment create --role <角色> --assignee <对象ID> --scope <范围>`
```bash
# 为用户授予 AKS 集群用户角色
az role assignment create \
  --role "Azure Kubernetes Service Cluster User Role" \
  --assignee 00000000-0000-0000-0000-000000000000 \
  --scope /subscriptions/.../resourceGroups/my-rg/providers/Microsoft.ContainerService/managedClusters/my-aks
```

---

## 监控与诊断

**基本写法：启用 Container Insights**
`az aks update --name <集群名> --resource-group <组> --enable-azure-monitor`
```bash
# 启用 Container Insights 监控
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-azure-monitor \
  --workspace-resource-id /subscriptions/.../providers/Microsoft.OperationalInsights/workspaces/my-law
```

---

**基本写法：查看集群健康状态**
`az aks show --name <集群名> --resource-group <组> --query 'powerState'`
```bash
# 查看集群电源状态
az aks show \
  --name my-aks \
  --resource-group my-rg \
  --query 'powerState'
```

---

**基本写法：列出集群活动日志**
`az monitor activity-log list --resource-id <集群ID>`
```bash
# 查看 AKS 集群活动日志
az monitor activity-log list \
  --resource-id /subscriptions/.../resourceGroups/my-rg/providers/Microsoft.ContainerService/managedClusters/my-aks \
  --max-events 50
```

---

**基本写法：运行命令**
`az aks command invoke --name <集群名> --resource-group <组> --command <命令>`
```bash
# 远程在集群中执行 kubectl 命令
az aks command invoke \
  --name my-aks \
  --resource-group my-rg \
  --command "kubectl get pods -A"
```

---

## 附加组件与功能

**基本写法：启用 ACI 虚拟节点**
`az aks update --name <集群名> --resource-group <组> --enable-virtual-node`
```bash
# 启用虚拟节点(Serverless 容器)
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-virtual-node \
  --subnet aci-subnet
```

---

**基本写法：启用 GitOps**
`az aks update --name <集群名> --resource-group <组> --enable-azure-policy`
```bash
# 启用 Azure Policy 用于合规管理
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-azure-policy
```

---

**基本写法：启用 Image Cleaner**
`az aks update --name <集群名> --resource-group <组> --enable-image-cleaner`
```bash
# 启用 Eraser 清理未使用镜像
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-image-cleaner \
  --image-cleaner-interval-hours 24
```

---

**基本写法：启用节点快照**
`az aks update --name <集群名> --resource-group <组> --enable-node-snapshot`
```bash
# 启用节点配置快照
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-node-snapshot
```

---

## 集群停止与删除

**基本写法：停止集群**
`az aks stop --name <集群名> --resource-group <组>`
```bash
# 停止集群节省成本(保留状态)
az aks stop \
  --name my-aks \
  --resource-group my-rg
```

---

**基本写法：启动集群**
`az aks start --name <集群名> --resource-group <组>`
```bash
# 启动已停止的集群
az aks start \
  --name my-aks \
  --resource-group my-rg
```

---

**基本写法：删除集群**
`az aks delete --name <集群名> --resource-group <组> --yes --no-wait`
```bash
# 删除 AKS 集群
az aks delete \
  --name my-aks \
  --resource-group my-rg \
  --yes \
  --no-wait
```

---

**基本写法：仅删除集群但不删除资源组**
`az aks delete --name <集群名> --resource-group <组>`
```bash
# 交互式确认删除集群
az aks delete \
  --name my-aks \
  --resource-group my-rg
```

---

## ACR 容器注册表集成

**基本写法：创建 ACR**
`az acr create --name <注册表名> --resource-group <组> --sku <SKU>`
```bash
# 创建 Premium ACR
az acr create \
  --name myacr123 \
  --resource-group my-rg \
  --sku Premium
```

---

**基本写法：附加 ACR 到 AKS**
`az aks update --name <集群名> --resource-group <组> --attach-acr <ACR 名>`
```bash
# 让 AKS 集群有权限拉取 ACR 镜像
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --attach-acr myacr123
```

---

**基本写法：登录 ACR**
`az acr login --name <注册表名>`
```bash
# 登录 ACR
az acr login --name myacr123
```

---

**基本写法：列出仓库**
`az acr repository list --name <注册表名>`
```bash
# 列出 ACR 中所有镜像仓库
az acr repository list --name myacr123 --output table
```
