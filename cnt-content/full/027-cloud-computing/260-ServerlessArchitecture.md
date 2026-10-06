---
order: 300
title: 无服务器架构
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 'Serverless：FaaS/BaaS、事件驱动、Lambda 冷启动优化、限制对策与 Serverless Framework 实操。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/020-IaaSPaaSSaaS'
  - 'cloud-computing/270-AWSCore'
  - 'cloud-computing/250-LoadBalanceAutoScaling'
  - 'cloud-computing/330-AWSLambdaCommand'
prerequisites:
  - 'cloud-computing/270-AWSCore'
---

## 知识点地图

- **知识类别**：Serverless 架构——FaaS/BaaS 模型、冷启动与并发控制、事件管道模式、可靠性语义（幂等/DLQ/编排）。
- **解决什么问题**：函数按事件触发、多实例并发、失败自动重试，这三件事叠加让「同一条数据被处理两次」「失败悄无声息」成为默认行为；本文给出架构层的对策。
- **什么时候用到**：设计事件触发型函数（S3/SQS/定时）；给异步链路配重试与死信；多步骤流程（超过单函数 15 分钟）的编排拆解。

## 前置知识与学习目标

Serverless（无服务器）不是「没有服务器」，而是**你不管理服务器**：
机器的供给、扩缩容、打补丁全部由云商负责，你只上传代码与声明触发器。
它同时是一种计费模式——不为闲置时间付费，只在代码运行时计费（毫秒级）。

完成本文后，你应当能够：区分 FaaS 与 BaaS；解释冷启动的成因并用预留
并发/预置并发缓解；说出 FaaS 的硬性限制与绕行方案；用 Serverless
Framework 部署一个事件驱动的服务。

## 1. Serverless 原理

### 1.1 FaaS 与 BaaS：两块拼图

| 组件 | 全称 | 是什么 | 例子 |
| :--- | :--- | :--- | :--- |
| FaaS | Function as a Service | 托管的函数运行时，事件触发、按次计费 | Lambda、Cloud Functions、阿里云 FC |
| BaaS | Backend as a Service | 托管的后端能力，API 即用 | DynamoDB、Cognito、S3、AppSync |

完整的 Serverless 应用 = FaaS（计算）+ BaaS（状态与能力）。只用 Lambda
但自建一台 MySQL「配菜」，等于只走了一半——那台 MySQL 仍然要你管。

### 1.2 事件驱动模型

FaaS 的心脏是**事件源 -> 触发器 -> 函数**：

```mermaid
flowchart LR
    subgraph 事件源
        API[API Gateway]
        S3[S3 上传]
        Q[队列/流]
        T[定时器]
    end
    API --> F[Lambda 函数]
    S3 --> F
    Q --> F
    T --> F
    F --> DB[(DynamoDB)]
    F --> O[下游调用]
```

两种调用语义决定了容错设计：

- **同步调用**（API Gateway -> Lambda）：调用方等结果，错误直接返回；
- **异步调用**（S3/SQS 事件触发）：事件入队后立即返回，失败自动重试
  （通常 2 次），重试耗尽后进入**死信队列（DLQ）或失败目标**——生产
  系统必须配置并监控 DLQ，否则错误事件会静默消失。

## 2. Lambda：冷启动与并发控制

### 2.1 冷启动的成因

一个请求到达时若没有现成的执行环境，Lambda 要经历「init 阶段」：

```text
下载代码 -> 启动运行时（如 Python 解释器/JVM）-> 执行函数初始化代码 -> 处理请求
└────────────────── 这段就是冷启动延迟，用户在等待 ──────────────────┘
```

量级经验：Python/Node 通常几十到几百毫秒；JVM/.NET 大型应用可达秒级。
后续请求复用同一执行环境（ warm），不再付费 init。

缓解手段（按性价比排序）：

1. **选对运行时**：解释型语言冷启动天然低；Java 用 SnapStart（恢复
   执行环境快照）可把冷启动压到百毫秒级，Python/.NET 也已有 SnapStart
   能力（以官方文档支持矩阵为准）；
2. **减小包体**：依赖裁剪、分层（Lambda Layers 按需挂载）；
3. **内存即 CPU**：Lambda 的 CPU 配额与内存成正比，加大内存反而常常
   降总成本（跑得快 = 计费毫秒少），用 AWS Lambda Power Tuning 工具
   找最优点；
4. **初始化移出处理路径**：SDK 客户端、数据库连接放在 handler 外的
   全局段，init 阶段完成一次。

### 2.2 预留并发 vs 预置并发（最容易混淆的两个开关）

| 机制 | 做什么 | 解决什么 |
| :--- | :--- | :--- |
| 预留并发（Reserved Concurrency） | 从账户并发池里**划走**一块，保证该函数最多可用 N 个并发 | 防止某个函数吃光全账户并发（限流保护） |
| 预置并发（Provisioned Concurrency） | **预先加热** N 个执行环境常驻 | 消灭冷启动，延迟稳定 |

一句话：Reserved 是「限量」，Provisioned 是「预热」。关键路径 API 用
Provisioned + 自动扩缩（按计划或按利用率），批处理函数用 Reserved
做账户级隔离。

## 3. 架构模式

### 3.1 API Gateway + Lambda：标准 Web API

```yaml
# serverless.yml 片段：一个函数 + HTTP 触发
service: my-service
provider:
  name: aws
  runtime: python3.12
  region: us-east-1
  environment:
    TABLE_NAME: users
functions:
  api:
    handler: handler.api
    events:
      - httpApi:
          path: /users
          method: get
```

优点：零闲置成本、自动扩缩；要注意 API Gateway 按请求计费且 P99 比
常驻服务高（含冷启动尾部），对延迟极敏感的同步链路需评估。

### 3.2 事件管道：Serverless 的主场

```mermaid
flowchart LR
    UP[S3 上传图片] --> L1[缩略图函数] --> S32[S3 存储]
    UP --> L2[元数据函数] --> DB[(DynamoDB)]
    Q[SQS 队列] --> L3[订单处理函数] --> M[发邮件]
```

「上传触发处理」、日志/事件清洗、定时对账这类碎片化异步任务，是
Serverless 相对常驻服务有绝对优势的场景：事件源天然解耦、按次计费、
无需为 99% 的空闲时间付钱。

### 3.3 限制与对策

| 限制（Lambda，以官方为准） | 影响 | 对策 |
| :--- | :--- | :--- |
| 单次执行 <= 15 分钟 | 长任务跑不完 | 分片、Step Functions 编排、改容器/批次 |
| 部署包体积上限（解压 10GB 级） | 大依赖装不下 | Layers、镜像格式部署 |
| /tmp 临时空间有限 | 大文件中转难 | 直传 S3，不落地本地 |
| 无持久连接上下文 | WebSocket 要配合 API Gateway | 托管 WebSocket API |
| 并发账户级默认上限 | 突发被限流 | 提额 + Reserved 隔离 |
| 每毫秒计费但粒度 1ms | 高频长跑不划算 | 稳态常驻负载改容器/EC2 |

> 陷阱：Serverless 不是「总更便宜」。7x24 稳态、高利用率的负载，
> 容器/实例的包月成本远低于按毫秒累计的函数账单；**波动大、稀疏、
> 可并行**的负载才是 Serverless 的成本甜区。

### 3.4 幂等与重试：异步事件链的默认世界观

异步调用的事件源在失败时会**自动重试**（多数 2 次，SQS 触发则按可见性超时无限循环直到删消息）——重试叠加多实例并发，「至少一次投递」就是 Serverless 的默认世界观，**函数必须是幂等的**。

```python
# 幂等消费模板：以业务唯一键为护栏
def handler(event, context):
    for record in event["Records"]:
        body = json.loads(record["body"])
        order_id = body["orderId"]

        # 条件写入：已处理过则条件不满足，重放无副作用
        table.put_item(
            Item={"pk": f"processed#{order_id}", "ttl": expire_in(7, "days")},
            ConditionExpression="attribute_not_exists(pk)",
        )
        process_order(order_id)   # 真正的业务逻辑只应执行一次
```

- 「先占位再处理」的占位键模板：`ConditionExpression` 保证并发重放只有一个赢家；占位记录带 TTL 自动过期，重放窗口外的重复再由业务状态机兜底。
- 易错点：占位成功后 `process_order` 崩溃——重试时占位已存在，函数直接返回成功，**这条订单永远不会被处理**。修复：占位与业务在同一事务（DynamoDB TransactWriteItems），或占位失败时校验业务结果确已完成才放行。

**工程场景（短信重复发送事故复盘到幂等键设计）**：营销函数消费 SQS 群发短信，一次部署引发的执行超时使已发送的消息重投，同一手机号收到三条。修复三步：加 `sent_log`（手机号+活动 id 唯一约束）；发送前 `PutItem ConditionExpression` 抢占；对抢占成功但发送失败的路径显式删除占位允许重试。事故根因不是「函数有 bug」，而是**架构默认重试而代码默认只执行一次**——两者的假设要对齐。

### 3.5 DLQ 隔离与重放流程

异步链路的失败终点配置（重试耗尽后的去处）：

```yaml
functions:
  orderProcessor:
    handler: handler.process
    events:
      - sqs:
          arn: !GetAtt OrdersQueue.Arn
          batchSize: 10
    # 部分批次失败：可见性超时后整批重投（默认）；成功的那部分要靠幂等挡重放
    destinations:
      onFailure: !Ref OrderDLQ
```

完整的隔离-修复-重放流程：

1. **隔离**：DLQ 收到失败消息，配队列深度告警（> 0 即告警，见[云消息与事件服务](/cloud-computing/235-CloudMessagingEventServices)）；
2. **定位**：消息体 + 失败时间 + 上下文日志（trace id 关联，函数要主动打印 `record.messageId`）还原现场；
3. **修复**：代码或数据修复；先在预发用真实消息重放验证；
4. **限速重放**：SQS 控制台 Start DLQ redrive 或脚本按小批量倒回主队列——不限速的整批重放会把刚修复好的下游再打垮一次，等于二次事故。

易错点：DLQ 里的消息默认有保留期（SQS 14 天），超期静默删除——重放流程要跑在保留期内，或把 DLQ 保留期调大；更稳妥的做法是 DLQ 消息同时归档到 S3 做长期留存。

### 3.6 Step Functions：多步骤编排的实战拆解

单函数 15 分钟上限、多步骤依赖、失败分支处理——这些把「一个大函数」推向「状态机编排」。三种实战模式：

```json
{
  "Comment": "订单处理：校验 -> 扣库存 -> 支付 -> 通知（含失败回滚）",
  "StartAt": "Validate",
  "States": {
    "Validate": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:validate",
      "Retry": [
        { "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0 }
      ],
      "Catch": [
        { "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }
      ],
      "Next": "DeductStock"
    },
    "DeductStock": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "Next": "Charge"
    },
    "Charge": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:charge",
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "RestoreStock" }],
      "Next": "NotifySuccess"
    },
    "RestoreStock": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "Next": "NotifyFailure"
    },
    "NotifySuccess": { "Type": "Succeed" },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:notifyOps",
      "End": true
    }
  }
}
```

- **模式一：标准状态机替代「函数链」**。函数 A 成功后手动触发函数 B 的写法，中间态散落在两个函数的环境变量与数据库里；状态机把「流程」本身变成可查看、可重跑的资源——控制台能点开每一次执行的输入输出与失败点。
- **模式二：`Retry` + `Catch` 分层**。`Retry` 处理瞬态错误（网络、限流），`Catch` 处理终态失败（业务拒绝）走补偿分支。上图 `Charge` 失败后 `RestoreStock` 是**补偿事务**（saga 模式的托管版）——分布式事务没有回滚键，只有逆操作。
- **模式三：SDK 集成省函数**。`Resource` 直接写 `arn:aws:states:::dynamodb:updateItem` 这样的 SDK 优化集成，状态机直接调 DynamoDB/SNS，**不用为「调一下 API」单独写函数**——函数数量减半是状态机最容易被低估的红利。
- 选择边界：两三步且无分支的流程用不上状态机（编排成本 > 收益）；有失败补偿、人工审批（`waitForTaskToken`）、长等待（`Wait` 状态不占函数时长）的流程，状态机是唯一合理解。
- 易错点：状态机的输入输出默认**整对象传递**，`ResultPath` 不配置时下游状态拿到的是上游的完整输出，状态定义与数据流逐渐纠缠——在 `ResultPath`/`Payload` 里显式声明每个状态吃什么吐什么，状态机才能活过第三个迭代。

## 4. Serverless Framework 实操

Serverless Framework 是最流行的 FaaS 部署工具（另有 AWS SAM、CDK、
Pulumi，见 `530-PulumiCommands`）。注意其 v4 起改为专有许可（个人与
小团队注册后可免费使用，商业使用需留意授权条款）；纯开源诉求可选
AWS SAM。

```bash
# 安装 CLI
npm install -g serverless
serverless --version

# 配置 AWS 部署凭证（复用 AWS CLI 的 profile 更规范）
serverless config credentials --provider aws --key <AK> --secret <SK>
serverless deploy --aws-profile production   # 或用指定 profile 部署

# 从模板创建项目
serverless create --template aws-python3 --path my-service

# 部署 / 单函数快速部署 / 删除整个服务
serverless deploy --stage dev --region us-east-1
serverless deploy function --function myHandler
serverless remove --stage dev

# 调试：云端调用、本地调用、实时日志
serverless invoke --function myHandler --path event.json
serverless invoke local --function myHandler
serverless logs --function myHandler --tail
```

```yaml
# 定时触发与环境变量注入（完整示例片段）
functions:
  cron:
    handler: handler.cron
    events:
      - schedule:
          rate: cron(0 12 * * ? *)   # 每天 12:00 UTC
          enabled: true
    environment:
      TABLE_NAME: my-table
      STAGE: ${sls:stage}            # 内置变量：当前部署阶段
plugins:
  - serverless-python-requirements   # 自动打包 Python 依赖
  - serverless-offline               # 本地模拟 API 调试
```

版本控制与回滚：每次 deploy 生成函数版本，`serverless rollback
--function myHandler --version 5` 可按版本回滚；正式环境建议配合
别名（alias）与渐进式流量切换。

## 小结

- 初学者要点：Serverless = FaaS + BaaS，本质是事件驱动 + 按量计费 +
  免运维；冷启动来自「环境初始化」，用预热与运行时选择缓解；
  Reserved 管限额、Provisioned 管预热，别混；异步事件必须配死信队列。
- 进阶注意：15 分钟上限与无持久连接是架构级约束，长流程用 Step
  Functions 编排；加大内存常常降总成本（CPU 随内存增长），用工具
  寻优；稳态高频负载不是 Serverless 的菜；部署工具链留意 Serverless
  Framework v4 的许可变化，开源诉求用 SAM/CDK。
