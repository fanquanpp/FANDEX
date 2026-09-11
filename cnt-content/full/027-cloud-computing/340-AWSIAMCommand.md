---
order: 340
title: AWS IAM 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'IAM 命令实战：用户与访问密钥、策略附加、角色与信任策略、组管理及最小权限实践。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/270-AWSCore'
  - 'cloud-computing/300-AWSCliConfigure'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
---

**概念 30 秒**：IAM 管三样东西——用户/组（人怎么办）、角色（机器/服务
怎么办）、策略（允许什么的 JSON 文档）。核心原则是最小权限；生产环境
**优先用角色而非长期密钥**（EC2/Lambda 挂角色自动拿临时凭证）。用户
管理命令只在「确实需要人类长期身份」时使用，现代实践更推荐 IAM
Identity Center（SSO）。

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
# 为用户生成新的访问密钥（Secret 只在响应里出现这一次，立即妥善保存）
aws iam create-access-key --user-name john
```
> 密钥安全基线：每个用户最多 2 个密钥（为轮换留余地）；定期审计
> `list-access-keys` + `get-access-key-last-used`，长期未用的直接删；
> 密钥绝不进 git、不写 Dockerfile。

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

## 排错与验证

```bash
# 权限排错利器：模拟某身份能否执行某操作（不用真的试）
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/john \
  --action-names s3:PutObject \
  --resource-arns arn:aws:s3:::my-bucket/*

# 查看用户登录资料（是否有控制台密码、MFA 是否启用）
aws iam get-login-profile --user-name john
aws iam list-mfa-devices --user-name john

# 账号级体检：根账号是否持有访问密钥（应为 0）
aws iam get-account-summary --query 'SummaryMap.AccountAccessKeysPresent'
```

> IAM 报错规律：没有显式 Allow 即默认拒绝；同一账号内显式 Deny 永远
> 赢过 Allow；跨账号访问需要「双方授权」（本方允许 + 对方信任）。

## 小结

- 初学者要点：用户给人、角色给机器；策略是 JSON 文档、附加（attach）
  而非内联；Secret Access Key 只显示一次；权限排错用 simulate 命令
  而不是反复试错。
- 进阶注意：能上角色就不要长期密钥；密钥轮换「先建新 -> 改配置 ->
  停旧 -> 观察 -> 删旧」五步走；组是权限分配的首选载体（用户入组、
  权限挂组）；规模化后评估 Identity Center（SSO）与权限边界
  （Permissions Boundary）约束管理员权限。
