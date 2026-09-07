---
order: 320
title: AWS S3 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 AWS S3 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 桶操作

**基本写法：列出所有桶**
`aws s3 ls [--profile <配置名>]`
```bash
# 列出当前账号下所有 S3 桶
aws s3 ls
```

---

**基本写法：创建桶**
`aws s3 mb s3://<桶名> [--region <区域>]`
```bash
# 在默认区域创建新桶
aws s3 mb s3://my-unique-bucket
```

---

**基本写法：指定区域创建桶**
`aws s3 mb s3://<桶名> --region <区域>`
```bash
# 在 eu-west-1 区域创建桶
aws s3 mb s3://my-bucket --region eu-west-1
```

---

**基本写法：删除空桶**
`aws s3 rb s3://<桶名>`
```bash
# 仅删除空桶
aws s3 rb s3://my-bucket
```

---

**基本写法：强制删除非空桶**
`aws s3 rb s3://<桶名> --force`
```bash
# 删除桶及其所有对象
aws s3 rb s3://my-bucket --force
```

---

## 对象操作

**基本写法：列出桶内对象**
`aws s3 ls s3://<桶名>[/<前缀>] [--recursive]`
```bash
# 递归列出桶内所有对象
aws s3 ls s3://my-bucket --recursive
```

---

**基本写法：上传文件**
`aws s3 cp <本地文件> s3://<桶名>/[<路径>]`
```bash
# 上传单个文件到 S3
aws s3 cp file.txt s3://my-bucket/
```

---

**基本写法：下载文件**
`aws s3 cp s3://<桶名>/<键> <本地路径>`
```bash
# 从 S3 下载文件到本地
aws s3 cp s3://my-bucket/file.txt ./
```

---

**基本写法：递归上传目录**
`aws s3 cp <本地目录> s3://<桶名>/<前缀> --recursive`
```bash
# 递归上传整个目录
aws s3 cp ./folder s3://my-bucket/folder --recursive
```

---

**基本写法：同步本地到 S3**
`aws s3 sync <本地目录> s3://<桶名>/<前缀> [--delete] [--exclude <模式>]`
```bash
# 同步并删除目标中多余的文件
aws s3 sync ./src s3://my-bucket/src --delete --exclude "*.tmp"
```

---

**基本写法：删除单个对象**
`aws s3 rm s3://<桶名>/<键>`
```bash
# 删除指定对象
aws s3 rm s3://my-bucket/file.txt
```

---

**基本写法：递归删除目录**
`aws s3 rm s3://<桶名>/<前缀> --recursive`
```bash
# 递归删除目录下所有对象
aws s3 rm s3://my-bucket/folder --recursive
```

---

## 高级 API

**基本写法：使用 s3api 创建桶**
`aws s3api create-bucket --bucket <桶名> [--region <区域>]`
```bash
# 通过 s3api 精细控制创建桶
aws s3api create-bucket --bucket my-bucket --region us-east-1
```

---

**基本写法：获取桶大小统计**
`aws s3 ls s3://<桶名> --recursive --summarize`
```bash
# 统计桶内对象总数与总大小
aws s3 ls s3://my-bucket --recursive --summarize
```

---

**基本写法：预览操作不实际执行**
`<命令> --dryrun`
```bash
# 预览同步将执行的更改
aws s3 sync ./src s3://my-bucket/src --dryrun
```
