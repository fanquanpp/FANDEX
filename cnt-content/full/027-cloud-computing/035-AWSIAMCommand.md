---
order: 350
title: AWS IAM 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 AWS IAM 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## 用户管理

**基本写法：列出用户**
`aws iam list-users`
```bash
# 列出账号下所有 IAM 用户
aws iam list-users
```

---

**基本写法：创建用户**
`aws iam create-user --user-name <用户名>`
```bash
# 创建新的 IAM 用户
aws iam create-user --user-name john
```

---

**基本写法：删除用户**
`aws iam delete-user --user-name <用户名>`
```bash
# 删除指定 IAM 用户
aws iam delete-user --user-name john
```

---

**基本写法：查看用户详情**
`aws iam get-user --user-name <用户名>`
```bash
# 查看指定用户信息
aws iam get-user --user-name john
```

---

## 访问密钥

**基本写法：创建访问密钥**
`aws iam create-access-key --user-name <用户名>`
```bash
# 为用户生成新的访问密钥
aws iam create-access-key --user-name john
```

---

**基本写法：列出访问密钥**
`aws iam list-access-keys --user-name <用户名>`
```bash
# 查看用户的所有访问密钥 ID
aws iam list-access-keys --user-name john
```

---

**基本写法：停用访问密钥**
`aws iam update-access-key --access-key-id <密钥ID> --status Inactive --user-name <用户名>`
```bash
# 临时停用访问密钥
aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive --user-name john
```

---

**基本写法：删除访问密钥**
`aws iam delete-access-key --access-key-id <密钥ID> --user-name <用户名>`
```bash
# 永久删除访问密钥
aws iam delete-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --user-name john
```

---

## 策略管理

**基本写法：列出策略**
`aws iam list-policies [--scope Local]`
```bash
# 列出自定义策略
aws iam list-policies --scope Local
```

---

**基本写法：查看策略详情**
`aws iam get-policy --policy-arn <策略ARN>`
```bash
# 查看策略元数据
aws iam get-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

---

**基本写法：创建策略**
`aws iam create-policy --policy-name <策略名> --policy-document file://<文件>`
```bash
# 从 JSON 文件创建策略
aws iam create-policy --policy-name my-policy --policy-document file://policy.json
```

---

**基本写法：附加策略到用户**
`aws iam attach-user-policy --user-name <用户名> --policy-arn <策略ARN>`
```bash
# 为用户附加 S3 只读策略
aws iam attach-user-policy --user-name john --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

---

**基本写法：分离策略**
`aws iam detach-user-policy --user-name <用户名> --policy-arn <策略ARN>`
```bash
# 从用户移除策略
aws iam detach-user-policy --user-name john --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

---

**基本写法：列出用户策略**
`aws iam list-attached-user-policies --user-name <用户名>`
```bash
# 查看用户附加的所有策略
aws iam list-attached-user-policies --user-name john
```

---

## 角色管理

**基本写法：创建角色**
`aws iam create-role --role-name <角色名> --assume-role-policy-document file://<文件>`
```bash
# 创建可被 Lambda 服务扮演的角色
aws iam create-role --role-name lambda-role --assume-role-policy-document file://trust-policy.json
```

---

**基本写法：列出角色**
`aws iam list-roles`
```bash
# 列出账号下所有角色
aws iam list-roles
```

---

**基本写法：附加策略到角色**
`aws iam attach-role-policy --role-name <角色名> --policy-arn <策略ARN>`
```bash
# 为角色附加执行策略
aws iam attach-role-policy --role-name lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

## 用户组管理

**基本写法：创建用户组**
`aws iam create-group --group-name <组名>`
```bash
# 创建新的用户组
aws iam create-group --group-name developers
```

---

**基本写法：添加用户到组**
`aws iam add-user-to-group --group-name <组名> --user-name <用户名>`
```bash
# 将用户加入 developers 组
aws iam add-user-to-group --group-name developers --user-name john
```

---

**基本写法：列出组内用户**
`aws iam get-group --group-name <组名>`
```bash
# 查看 developers 组成员
aws iam get-group --group-name developers
```
