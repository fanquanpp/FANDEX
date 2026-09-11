---
order: 400
title: GCP Compute 与 Storage
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'GCP 命令实战：Compute Engine 实例、Cloud Storage 对象操作与 Cloud Run 部署。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/390-GCPCliConfigure'
  - 'cloud-computing/510-GCPGKECommands'
prerequisites:
  - 'cloud-computing/390-GCPCliConfigure'
---

**概念 30 秒**：GCP 三件常用能力——Compute Engine（VM，机器类型
`e2/m/n/c` 系列分档）、Cloud Storage（对象存储，桶名全局唯一）、
Cloud Run（容器版 Serverless，缩到 0 实例免计费）。gcloud 命令默认
读取 `390-GCPCliConfigure` 设置的项目与区域默认值。

## Compute Engine 实例

**基本写法：列出所有实例**
`gcloud compute instances list`
```bash
# 列出当前项目所有 VM 实例
gcloud compute instances list
```

---

**基本写法：创建实例**
`gcloud compute instances create <实例名> [--machine-type=<类型>] [--image-family=<镜像族>] [--image-project=<项目>]`
```bash
# 创建 e2-medium Ubuntu 22.04 实例
gcloud compute instances create my-instance --machine-type=e2-medium --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud
```

---

**基本写法：查看实例详情**
`gcloud compute instances describe <实例名> [--zone <可用区>]`
```bash
# 查看实例完整配置
gcloud compute instances describe my-instance --zone us-central1-a
```

---

**基本写法：启动实例**
`gcloud compute instances start <实例名> [--zone <可用区>]`
```bash
# 启动已停止的实例
gcloud compute instances start my-instance
```

---

**基本写法：停止实例**
`gcloud compute instances stop <实例名> [--zone <可用区>]`
```bash
# 停止运行中的实例
gcloud compute instances stop my-instance
```

---

**基本写法：重启实例**
`gcloud compute instances reset <实例名> [--zone <可用区>]`
```bash
# 强制重置实例
gcloud compute instances reset my-instance
```

---

**基本写法：删除实例**
`gcloud compute instances delete <实例名> [--zone <可用区>]`
```bash
# 删除实例及关联磁盘
gcloud compute instances delete my-instance
```

---

## SSH 连接

**基本写法：SSH 登录实例**
`gcloud compute ssh <实例名> [--zone <可用区>]`
```bash
# 自动管理密钥并 SSH 登录
gcloud compute ssh my-instance
```

---

**基本写法：使用 scp 传输文件**
`gcloud compute scp <本地文件> <实例名>:<远程路径> [--zone <可用区>]`
```bash
# 上传本地文件到实例
gcloud compute scp ./file.txt my-instance:~/file.txt
```

---

**基本写法：从实例下载文件**
`gcloud compute scp <实例名>:<远程路径> <本地路径>`
```bash
# 下载实例文件到本地
gcloud compute scp my-instance:~/log.txt ./
```

---

## 防火墙规则

**基本写法：列出防火墙规则**
`gcloud compute firewall-rules list`
```bash
# 查看所有防火墙规则
gcloud compute firewall-rules list
```

---

**基本写法：创建允许 HTTP 规则**
`gcloud compute firewall-rules create <规则名> --allow tcp:80 --source-ranges 0.0.0.0/0`
```bash
# 创建允许任意 IP 访问 80 端口的规则
gcloud compute firewall-rules create allow-http --allow tcp:80 --source-ranges 0.0.0.0/0
```

---

**基本写法：创建允许 SSH 规则**
`gcloud compute firewall-rules create <规则名> --allow tcp:22 --source-ranges <CIDR>`
```bash
# 允许特定 CIDR 通过 SSH 访问
gcloud compute firewall-rules create allow-ssh --allow tcp:22 --source-ranges 192.168.1.0/24
```

---

**基本写法：删除防火墙规则**
`gcloud compute firewall-rules delete <规则名>`
```bash
# 删除指定防火墙规则
gcloud compute firewall-rules delete allow-http
```

---

## Cloud Storage 桶

**基本写法：列出所有桶**
`gcloud storage buckets list`
```bash
# 列出项目下所有存储桶
gcloud storage buckets list
```

---

**基本写法：创建桶**
`gcloud storage buckets create gs://<桶名> [--location=<区域>]`
```bash
# 在指定区域创建桶
gcloud storage buckets create gs://my-unique-bucket --location=us-central1
```

---

**基本写法：列出桶内对象**
`gcloud storage ls gs://<桶名>/[<前缀>]`
```bash
# 列出桶内所有对象
gcloud storage ls gs://my-bucket
```

---

**基本写法：上传文件**
`gcloud storage cp <本地文件> gs://<桶名>/[<前缀>]`
```bash
# 上传本地文件到桶
gcloud storage cp ./file.txt gs://my-bucket/
```

---

**基本写法：下载文件**
`gcloud storage cp gs://<桶名>/<键> <本地路径>`
```bash
# 从桶下载文件到本地
gcloud storage cp gs://my-bucket/file.txt ./
```

---

**基本写法：同步目录**
`gcloud storage rsync <本地目录> gs://<桶名>/<前缀> [--delete]`
```bash
# 增量同步本地目录到桶
gcloud storage rsync ./src gs://my-bucket/src --delete
```

---

**基本写法：删除对象**
`gcloud storage rm gs://<桶名>/<键> [-r]`
```bash
# 递归删除桶内目录
gcloud storage rm gs://my-bucket/folder -r
```

---

**基本写法：删除桶**
`gcloud storage buckets delete gs://<桶名>`
```bash
# 删除空桶
gcloud storage buckets delete gs://my-bucket
```

---

## Cloud Run 部署

**基本写法：部署 Cloud Run 服务**
`gcloud run deploy --source . [--region <区域>] [--allow-unauthenticated]`
```bash
# 从源码部署并允许匿名访问
gcloud run deploy --source . --region us-central1 --allow-unauthenticated
```

---

**基本写法：列出 Cloud Run 服务**
`gcloud run services list`
```bash
# 列出所有 Cloud Run 服务
gcloud run services list
```

---

**基本写法：查看服务日志**
`gcloud run services logs tail <服务名> [--region <区域>]`
```bash
# 实时跟踪服务日志
gcloud run services logs tail my-service --region us-central1
```

---

**基本写法：删除 Cloud Run 服务**
`gcloud run services delete <服务名> [--region <区域>]`
```bash
# 删除指定服务
gcloud run services delete my-service --region us-central1
```

---

## 小结

- 初学者要点：VM 用 `e2` 系列起步（成本最优），镜像用 `--image-family`
  自动取族内最新；Cloud Storage 桶名全局唯一，`gsutil` 的传统命令已
  统一到 `gcloud storage`；Cloud Run 从源码或镜像一条命令部署，默认
  缩容到 0。
- 进阶注意：VM 用完即删或加标签便于成本归集；预留实例（Committed Use
  Discount）适合稳态负载，Spot VM 适合可中断任务；存储桶的位置类型
  （region/dual-region/multi-region）创建后不可改；Cloud Run 的并发数、
  最小实例数（min-instances 防冷启动）是延迟与成本的主要调节项。
