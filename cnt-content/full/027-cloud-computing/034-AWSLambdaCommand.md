---
order: 340
title: AWS Lambda 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 AWS Lambda 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 函数管理

**基本写法：列出函数**
`aws lambda list-functions [--region <区域>]`
```bash
# 列出当前区域所有 Lambda 函数
aws lambda list-functions
```

---

**基本写法：查看函数详情**
`aws lambda get-function --function-name <函数名>`
```bash
# 查看指定函数配置与代码位置
aws lambda get-function --function-name my-function
```

---

**基本写法：创建函数**
`aws lambda create-function --function-name <函数名> --runtime <运行时> --role <角色ARN> --handler <处理函数> --zip-file fileb://<zip 路径>`
```bash
# 创建 Python 函数
aws lambda create-function --function-name my-function --runtime python3.12 --role arn:aws:iam::123456789012:role/lambda-role --handler index.handler --zip-file fileb://function.zip
```

---

**基本写法：更新函数代码**
`aws lambda update-function-code --function-name <函数名> --zip-file fileb://<zip 路径>`
```bash
# 上传新的代码包
aws lambda update-function-code --function-name my-function --zip-file fileb://function.zip
```

---

**基本写法：更新函数配置**
`aws lambda update-function-configuration --function-name <函数名> [--timeout <秒>] [--memory-size <MB>]`
```bash
# 修改超时与内存配置
aws lambda update-function-configuration --function-name my-function --timeout 30 --memory-size 512
```

---

**基本写法：删除函数**
`aws lambda delete-function --function-name <函数名>`
```bash
# 删除指定 Lambda 函数
aws lambda delete-function --function-name my-function
```

---

## 函数调用

**基本写法：同步调用**
`aws lambda invoke --function-name <函数名> <输出文件>`
```bash
# 同步调用并保存响应到文件
aws lambda invoke --function-name my-function response.json
```

---

**基本写法：异步调用**
`aws lambda invoke --function-name <函数名> --invocation-type Event <输出文件>`
```bash
# 异步调用不等待返回
aws lambda invoke --function-name my-function --invocation-type Event response.json
```

---

**基本写法：传递 payload**
`aws lambda invoke --function-name <函数名> --payload fileb://<文件> <输出文件>`
```bash
# 通过文件传递 JSON 载荷
aws lambda invoke --function-name my-function --payload fileb://payload.json response.json
```

---

**基本写法：指定别名或版本**
`aws lambda invoke --function-name <函数名>:<限定符> <输出文件>`
```bash
# 调用 prod 别名的版本
aws lambda invoke --function-name my-function:prod response.json
```

---

## 版本与别名

**基本写法：发布版本**
`aws lambda publish-version --function-name <函数名>`
```bash
# 发布当前代码为新版本
aws lambda publish-version --function-name my-function
```

---

**基本写法：列出版本**
`aws lambda list-versions-by-function --function-name <函数名>`
```bash
# 查看所有已发布版本
aws lambda list-versions-by-function --function-name my-function
```

---

**基本写法：创建别名**
`aws lambda create-alias --function-name <函数名> --name <别名> --function-version <版本号>`
```bash
# 为版本 1 创建 prod 别名
aws lambda create-alias --function-name my-function --name prod --function-version 1
```

---

**基本写法：更新别名指向**
`aws lambda update-alias --function-name <函数名> --name <别名> --function-version <版本号>`
```bash
# 将 prod 别名切换到版本 2
aws lambda update-alias --function-name my-function --name prod --function-version 2
```

---

## 层管理

**基本写法：发布层**
`aws lambda publish-layer-version --layer-name <层名> --zip-file fileb://<zip 路径> --compatible-runtimes <运行时>`
```bash
# 发布 Python 依赖层
aws lambda publish-layer-version --layer-name my-deps --zip-file fileb://layer.zip --compatible-runtimes python3.12
```

---

**基本写法：列出层**
`aws lambda list-layers`
```bash
# 列出账号下所有层
aws lambda list-layers
```

---

**基本写法：为函数附加层**
`aws lambda update-function-configuration --function-name <函数名> --layers <层ARN>`
```bash
# 将层附加到函数
aws lambda update-function-configuration --function-name my-function --layers arn:aws:lambda:us-east-1:123456789012:layer:my-deps:1
```

---

## 日志查看

**基本写法：查看日志组**
`aws logs describe-log-groups --log-group-name-prefix /aws/lambda/<函数名>`
```bash
# 查看 Lambda 函数对应日志组
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/my-function
```

---

**基本写法：查看最近日志流**
`aws logs tail /aws/lambda/<函数名> [--since <时间>]`
```bash
# 查看最近 10 分钟的日志
aws logs tail /aws/lambda/my-function --since 10m
```
