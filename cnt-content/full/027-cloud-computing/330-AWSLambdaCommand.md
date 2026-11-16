---
order: 380
title: AWS Lambda 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'Lambda 命令实战：函数增删改查、同步/异步调用、版本与别名、层管理与常见报错。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/270-AWSCore'
  - 'cloud-computing/260-ServerlessArchitecture'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
---

**概念 30 秒**：Lambda 函数 = 代码包 + 运行时 + 处理器入口 + 执行角色。
命令行日常操作集中在五件事：改配置（内存/超时）、发代码、看日志、
管版本/别名（灰度发布）、管层（共享依赖）。原理与冷启动优化见
`260-ServerlessArchitecture`。

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

---

## 陷阱与排错速查

| 现象/报错 | 原因 | 处理 |
| :--- | :--- | :--- |
| `ResourceConflictException` | 上一更新未完成 | 等 `--query 'Configuration.LastUpdateStatus'` 变 Successful |
| 超时但日志无异常 | 内存/CPU 不足导致慢 | `--memory-size` 加大（CPU 随内存涨） |
| `NODE_OPTIONS` 不生效 | 运行时保留变量 | 用启动属性或镜像部署绕行 |
| 无法调用 | 执行角色缺权限 | `aws lambda get-function-configuration --query Role` 核对角色 |
| zip 上传报 413 | 包体超限（直传上限 50MB） | 减依赖、用 Layers 或容器镜像部署 |

## 教学自检

遮住上面的命令示例，先自己默写，再展开对照。答不出的回到对应小节重读：

1. 创建函数的四个必填要素是什么？哪一个是「函数能访问 AWS 资源」的钥匙？
2. 同步与异步调用的参数差异是什么？异步调用的输出文件里拿得到业务结果吗？
3. 灰度发布的标准组合拳是什么（三步）？调用时怎么指定打 prod 别名？
4. 层（Layer）解决什么问题？附加层的命令改的是函数的哪类配置？
5. 超时但日志无异常，第一反应调什么参数、为什么？
6. `ResourceConflictException` 的原因与确认方式是什么？

<details>
<summary>参考答案（先答再看）</summary>

1. 函数名、运行时（--runtime）、执行角色（--role 的 ARN）、处理器入口（--handler）+ 代码包（--zip-file fileb://）。执行角色决定函数能访问哪些 AWS 资源——缺权限表现为「无法调用」。
2. 同步 `aws lambda invoke` 等结果（响应写进输出文件）；异步加 `--invocation-type Event` 入队即返回。异步拿不到业务结果——输出只有状态码（202），结果要走回调/DLQ/下游。
3. `publish-version` 发布不可变版本 → `create-alias`（或 `update-alias`）把 prod 别名指向新版本 → 调用/事件源都配 `my-function:prod`。回滚 = 把别名改回旧版本号。
4. 把共享依赖（SDK/工具链）从函数包里拆出去复用，突破 50MB 直传限制。附加层是改「配置」不是「代码」：`update-function-configuration --layers <层ARN>`。
5. 调 `--memory-size`。Lambda 的 CPU 配额随内存线性分配，内存不足即 CPU 不足——加内存往往比加超时更快也更省（跑得快计费毫秒少）。
6. 上一次代码/配置更新还没完成又提交了新更新。确认：查 `LastUpdateStatus` 变 Successful 后再继续。

</details>

## 小结

- 初学者要点：创建函数四要素（runtime/role/handler/zip）；同步 invoke 等
  结果、异步 Event 入队即返回；版本不可变、别名可重指向，灰度与回滚都
  是改别名；共享依赖进层（Layer），附加层属于配置更新。
- 进阶注意：CPU 随内存线性增长，超时无日志先加内存；更新要等
  `LastUpdateStatus` 成功再提交下一次；zip 直传上限 50MB，大依赖走
  Layers 或容器镜像；排权限问题先核对执行角色（`get-function-configuration
  --query Role`）。
