---
order: 310
title: AWS S3 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'S3 桶与对象操作命令实战：cp/sync/rm 高层命令、s3api 精细控制、预签名 URL 与数据安全陷阱。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/300-AWSCliConfigure'
  - 'cloud-computing/210-CloudStorageService'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
---

## 前置知识与学习目标

S3（Simple Storage Service）是 AWS 的对象存储：数据以「桶（Bucket）+ 对象键
（Key）」组织，按用量计费，容量近乎无限。类比：桶像一块磁盘分区，对象键
则是这块「磁盘」上的完整路径文件名（不是目录树，只是名字长得像路径）。

本文延续 `300-AWSCliConfigure` 的环境，学完后你应当能够：

1. 完成桶的创建、列举与删除，理解区域与命名规则；
2. 用 `cp`/`sync`/`rm` 完成日常上传下载与镜像同步；
3. 知道何时下探到 `s3api` 低层命令；
4. 规避删除、同步、公开访问三类高危陷阱。

## 1. 桶操作

```bash
# 列出当前账号所有桶（桶名全局唯一，输出含创建时间）
aws s3 ls
# 预期输出：
# 2026-05-12 09:30:11 my-app-assets
# 2026-07-01 14:02:55 my-backup-bucket

# 在默认区域创建桶（us-east-1 之外也可显式指定区域）
aws s3 mb s3://my-unique-bucket-20260901 --region cn-northwest-1
# 预期输出：make_bucket: my-unique-bucket-20260901

# 删除空桶
aws s3 rb s3://my-unique-bucket-20260901

# 删除非空桶：先删光所有对象再删桶（高危，先想清楚）
aws s3 rb s3://my-bucket --force
```

桶命名规则：3-63 个字符，只能小写字母、数字、连字符与点，全局唯一。
桶默认阻止公开访问；开启公开读写需要显式改两项配置，属于需要审批的操作。

> 陷阱：版本控制开启后的「删除」只是打删除标记，`rb --force` 会真正逐个
> 清理所有版本对象，耗时与对象数成正比——几亿对象的桶可能删一天。

## 2. 对象操作：cp 与 sync

### 2.1 上传与下载

```bash
# 上传单个文件
aws s3 cp app.tar.gz s3://my-bucket/releases/app.tar.gz

# 下载单个文件到当前目录
aws s3 cp s3://my-bucket/releases/app.tar.gz .

# 递归上传整个目录（目录同步的另一种写法）
aws s3 cp ./dist s3://my-bucket/dist --recursive

# 上传时指定存储类别：归档类冷数据大幅省钱
aws s3 cp backup.dump s3://my-bucket/backup/ --storage-class DEEP_ARCHIVE

# 大文件自动并行分片上传（默认分片 8MB，大文件无需手工干预）
aws s3 cp video.mp4 s3://my-bucket/media/
```

下载/复制大对象默认走多线程分片传输，中断后重跑 `cp` 即可续传（已传
分片会被复用），这是高层命令相对手写 API 的最大便利。

### 2.2 sync：只传差异

`sync` 对比源与目标的大小和修改时间，只传输有差异的文件，是静态网站
发布、备份上云的主力命令：

```bash
# 静态网站发布：同步构建产物到 S3
aws s3 sync ./dist s3://my-bucket --delete

# 更安全的变体：先排除垃圾文件，且首次运行先加 --dryrun 预览
aws s3 sync ./dist s3://my-bucket --delete --exclude "*.map" --dryrun

# 双向各一次即可实现「镜像 S3 到本地」（下行同步）
aws s3 sync s3://my-bucket ./backup --exclude "*.log"
```

> 陷阱一：`--delete` 会把目标端「源里没有」的文件删掉。如果目标端有别人
> 手工放的文件（比如控制台里直接上传的配置），一次 sync 就没了——所以
> 带 `--delete` 的命令永远先 `--dryrun` 预览再执行。
>
> 陷阱二：`sync` 比较依据是大小与时间戳，内容相同但时间戳变了的文件也会
> 重传；追求严格一致请用 `--size-only` 或自行做校验和。

### 2.3 删除

```bash
# 删除单个对象
aws s3 rm s3://my-bucket/releases/app-v1.tar.gz

# 递归删除整个前缀（危险：不可恢复，重要桶先开版本控制）
aws s3 rm s3://my-bucket/tmp/ --recursive

# 只删除一天前的旧备份
aws s3 rm s3://my-bucket/backup/ --recursive \
  --exclude "*" --include "*.dump"  # 先排除全部再精确包含
```

批量清理的正确工具其实是**生命周期规则**（过期自动删除/转冷），而不是
每天跑 `rm --recursive`。临时清理脚本只该用于一次性运维。

## 3. 统计与检查

```bash
# 统计桶内对象总数与总大小（--summarize 在输出末尾给汇总行）
aws s3 ls s3://my-bucket --recursive --summarize | tail -3
# 预期输出末尾：
# Total Objects: 15234
#   Total Size: 107374182400 Bytes

# 预览同步将做什么，不实际执行（高危命令的标配前奏）
aws s3 sync ./src s3://my-bucket/src --delete --dryrun
# 预期输出：每行一个 (dryrun) upload/delete 操作
```

大规模桶统计 `ls --recursive` 很慢（逐页列举数亿对象），生产上应改用
S3 Storage Lens 或清单（Inventory）报告。

## 4. 下探 s3api：高层命令不够用时

`aws s3` 是高层封装（自动分片、并发、对比），`aws s3api` 直接映射 REST
API（操作粒度细、参数全）。需要桶策略、生命周期、预签名这类「对象数据
之外」的能力时必须用 s3api：

```bash
# 在 us-east-1 创建桶（该区域不接收 LocationConstraint，其他区域必须传）
aws s3api create-bucket --bucket my-bucket --region us-east-1

# 为桶开启版本控制（防误删的第一道保险）
aws s3api put-bucket-versioning --bucket my-bucket \
  --versioning-configuration Status=Enabled

# 生成 1 小时有效的预签名下载 URL（对象本身保持私有）
aws s3 presign s3://my-bucket/releases/app.tar.gz --expires-in 3600
# 预期输出：
# https://my-bucket.s3.cn-north-1.amazonaws.com.cn/releases/app.tar.gz?X-Amz-...

# 查看单个对象元数据（大小、类型、存储类别）
aws s3api head-object --bucket my-bucket --key releases/app.tar.gz
```

选型口诀：传文件、同步目录用 `s3`；配策略、算签名、读元数据用 `s3api`。

## 5. 实战：安全的静态站点发布脚本

```bash
#!/usr/bin/env bash
# deploy-site.sh：构建并发布静态站点到 S3（配合 CloudFront 使用）
set -euo pipefail   # 任一步失败立即退出，未定义变量报错

BUCKET=my-site-bucket
npm run build                       # 1. 本地构建
aws s3 sync ./dist "s3://$BUCKET" --dryrun   # 2. 预览变更（不删旧文件先看一眼）
aws s3 sync ./dist "s3://$BUCKET" --delete   # 3. 正式同步
aws cloudfront create-invalidation \
  --distribution-id E1234XYZ \
  --paths "/*"                      # 4. 刷新 CDN 缓存（如接了 CloudFront）
echo "部署完成"
```

注意该脚本故意「先 dryrun 后 delete」，并使用 `set -euo pipefail` 保证
构建失败时绝不会有半成品同步上桶。

## 6. 陷阱与调试速查

| 现象/报错 | 原因 | 处理 |
| :--- | :--- | :--- |
| `IllegalLocationConstraintException` | 桶区域与请求区域不一致 | `--region` 指定桶所在区域 |
| `AccessDenied` 上传失败 | IAM 无 `s3:PutObject` 或桶策略拒绝 | `aws sts get-caller-identity` 核对身份后查权限 |
| `A client-side error... socket hang up` | 网络抖动/代理 | 重跑即可续传；必要时调 `--cli-connect-timeout` |
| sync 后控制台看不到新文件 | 看错了区域或前缀 | 列桶确认区域；S3 无目录，路径区分大小写 |
| 误删对象 | 无版本控制 | 开版本控制；已误删找旧版本恢复 |
| 大目录 sync 很慢 | 对象数量级大 | 调大 `--max-concurrent-requests`，或用 S3 清单 |

## 小结

- 初学者要点：桶名全局唯一、区域敏感；`cp` 传文件、`sync` 传差异、
  `rm` 删除；冷数据用 `--storage-class` 转归档类别；统计用
  `ls --recursive --summarize`；任何带 `--delete` 的同步先 `--dryrun`。
- 进阶注意：`s3` 与 `s3api` 的分工；版本控制 + 生命周期规则是防误删与
  自动清理的正规手段，脚本 `rm --recursive` 只做一次性运维；对外分享用
  预签名 URL 而非开公开访问；生产统计交给 Storage Lens/Inventory。
