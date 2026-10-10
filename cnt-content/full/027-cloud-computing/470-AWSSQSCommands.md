---
order: 530
title: AWS SQS/SNS 消息队列命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'SQS/SNS 学习笔记：用订单解耦场景走通队列收发、可见性超时、死信队列与 SNS 扇出过滤，末尾对照 Kinesis 与 EventBridge。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/260-ServerlessArchitecture'
  - 'cloud-computing/440-AWSCloudWatch'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
  - 'devops/370-MessageQueueOverview'
---

## 场景

下单接口现在这样工作：扣库存、发短信、记积分、生成物流单，全在一个 HTTP 请求里同步做完。大促时积分服务一慢，下单接口跟着超时——一个下游拖垮全链路。解法是把"下单后要做的事"拆出去：接口只发一条"订单已支付"的消息，下游各自消费。

AWS 上第一选择是 SQS（Simple Queue Service，队列）。它免运维、按请求计费、没有消息数量上限，是学习消息解耦最便宜的实验场。本篇主线走 SQS，再讲用 SNS 做"一条消息多方接收"，最后对比 Kinesis 和 EventBridge 各管什么。

## 第一步：创建队列并理解两个关键属性

```bash
# 创建标准队列
aws sqs create-queue --queue-name my-queue

# SQS 所有操作都要用队列 URL（不是队列名）
aws sqs get-queue-url --queue-name my-queue

# 设置消息保留 4 天、可见性超时 300 秒
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes MessageRetentionPeriod=345600,VisibilityTimeout=300

# 按前缀列出队列
aws sqs list-queues --queue-name-prefix my

# 删除队列
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
```

这两个属性是 SQS 的灵魂，必须先弄懂再用：

- **可见性超时（VisibilityTimeout）**：消费者取到一条消息后，这条消息对其他消费者"隐身"这么久。设计意图是给处理留时间；处理完主动删掉，处理失败则等超时后消息重新可见、别人再试。它本质上就是"自动重试的节奏器"。
- **消息保留期（MessageRetentionPeriod）**：没人消费的消息最多留多久（默认 4 天，上限 14 天，单位秒）。积压超过保留期的消息会被静默丢弃，所以"反正有队列兜底"是有期限的。

标准队列 vs FIFO：标准队列吞吐大但不保序、可能重复投递；FIFO 队列严格保序去重，但要求队列名以 `.fifo` 结尾：

```bash
aws sqs create-queue \
  --queue-name my-queue.fifo \
  --attributes FIFOQueueEnabled=true,ContentBasedDeduplication=true
```

多数业务先选标准队列 + 消费端幂等；只有"同一实体的事件顺序不能乱"（比如同一账户的扣款序列）才用 FIFO。

## 第二步：收发消息——体验可见性超时

```bash
# 发送一条订单消息
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --message-body '{"order_id":"12345","status":"paid"}'

# 批量发送（一次最多 10 条，省请求费）
aws sqs send-message-batch \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --entries '[{"Id":"msg1","MessageBody":"first"},{"Id":"msg2","MessageBody":"second"}]'

# 长轮询接收：等最多 20 秒，一次最多取 10 条
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --max-number-of-messages 10 \
  --wait-time-seconds 20
```

接收响应里有两样东西要分清：`Body` 是消息内容，`ReceiptHandle` 是"处理凭证"——删消息和改超时都凭它，且每次接收都会变。

```bash
# 处理成功：凭回执删除消息（不删的话超时后会重新投递）
aws sqs delete-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --receipt-handle AQEBwJm...EXAMPLE

# 预计处理不完：延长这条消息的隐身时间，避免被别人抢走重复处理
aws sqs change-message-visibility \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --receipt-handle AQEBwJm...EXAMPLE \
  --visibility-timeout 600
```

消费循环的标准写法就三步：长轮询取消息 → 处理 → 成功则 delete / 失败则什么都不做（等超时自动重试）。反复 `receive-message` 同一条消息、每 1 秒空轮询一次是新手最典型的两种错误用法。

FIFO 发送必须带分组键，同组内严格按序：

```bash
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue.fifo \
  --message-body '{"order_id":"12345"}' \
  --message-group-id order-group-1 \
  --message-deduplication-id dedup-001
```

`MessageGroupId` 是分组排序的单位：不同组并行、同组串行。把所有消息塞进同一个组，FIFO 就退化成了单线程队列。

## 第三步：死信队列——失败消息的去处

可见性超时到期消息会无限重试。如果一条消息永远处理失败（毒消息），它会一直在队列里打转，阻塞后续消费。死信队列（DLQ）的规则：**被接收超过 N 次还没被成功删除，就转进 DLQ**。

```bash
# 前提：先建一个普通队列当 DLQ
aws sqs create-queue --queue-name my-dlq

# 给主队列挂上死信策略：接收 5 次仍失败转入 my-dlq
# （注意 JSON 里的引号转义）
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:my-dlq\",\"maxReceiveCount\":\"5\"}"}'

# 查看死信策略
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attribute-names RedrivePolicy
```

maxReceiveCount 的取值逻辑：正常抖动重试几次能过，设 3-5 次；之后进 DLQ 由人来处理，而不是无限重试压垮下游。

修复了 bug 之后，把 DLQ 里的消息搬回主队列重放（不用手写搬运脚本）：

```bash
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:us-east-1:123456789012:my-dlq \
  --destination-arn arn:aws:sqs:us-east-1:123456789012:my-queue
```

监控积压用 CloudWatch 的队列深度指标：

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=my-queue \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period 300 \
  --statistics Average
```

这个指标持续上涨 = 消费速度跟不上生产速度，要么扩消费者要么查慢消费。给 DLQ 的消息数配告警（见 [CloudWatch](/cloud-computing/440-AWSCloudWatch)），DLQ 有消息就响，是最有效的早期预警。

## 第四步：SNS——一条消息，多方接收

回到场景：订单事件下游有积分、短信、物流三个系统，各自建队列各自拉取也行，但更好的形状是"发布订阅"：生产者只发一次到 SNS 主题（Topic），多个 SQS 队列各自订阅，SNS 负责扇出。

```bash
# 创建主题
aws sns create-topic --name my-topic
aws sns list-topics
aws sns get-topic-attributes --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic

# 给主题起个显示名（邮件通知里可见）
aws sns set-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --attribute-name DisplayName \
  --attribute-value "My Topic"

# 让 SQS 队列订阅主题（经典组合：SNS 扇出 + SQS 缓冲）
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:my-queue

# 也可以订阅邮件（要收确认邮件点确认）或 HTTPS webhook
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol email \
  --notification-endpoint user@example.com
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol https \
  --notification-endpoint https://example.com/webhook

# 管理订阅
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic
aws sns unsubscribe --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:12345678-1234-1234-1234-123456789012
```

发布端就一条命令。注意 SQS 队列订阅后收到的是 SNS 的"信封"，真实业务 JSON 在 `Body` 里的 `Message` 字段，消费端解析要剥一层：

```bash
# 发布普通消息
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Deployment completed"

# 带主题行发布（邮件订阅者看到的就是这行标题）
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Build failed: see logs" \
  --subject "ALERT: Build Failure"

# 带消息属性发布——属性是给过滤策略用的
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Order 12345" \
  --message-attributes '{"event":{"DataType":"String","StringValue":"order_created"}}'

# 直接发短信（验证码类场景，走 SNS 的 SMS 通道）
aws sns publish \
  --phone-number +8613800138000 \
  --message "Your verification code is 123456"

# 删除主题
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic
```

### 订阅过滤：让每个消费者只收自己关心的事件

不带过滤的扇出会让物流系统也收到积分事件。给订阅挂 FilterPolicy，SNS 在投递前就过滤掉：

```bash
# 只收 order_created 事件
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{"event":["order_created"]}'

# 数值范围过滤：只收 100-1000 的订单
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{"price":[{"numeric":[">=",100,"<=",1000]}]}'

# 清除过滤 = 恢复收全部
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{}'
```

过滤发生在属性上，不在消息体里——这就是发布时 `--message-attributes` 的意义。

## 第五步：SQS 不够用时看谁

| 服务 | 投递模型 | 典型场景 |
| :--- | :--- | :--- |
| SQS | 拉取（消费者主动取） | 任务队列、削峰填谷 |
| SNS | 推送（服务端投给订阅者） | 事件广播、通知 |
| Kinesis | 拉取 + 分片有序 + 可回放 | 日志流、点击流等高吞吐数据管道 |
| EventBridge | 规则路由推送 | 事件总线：按内容路由、对接 AWS 服务事件、定时触发 |

Kinesis 的形态更像"可以多个消费者各自从任意位置读的日志"（Kafka 同款思路）：

```bash
aws kinesis create-stream --stream-name my-stream --shard-count 3
aws kinesis put-record \
  --stream-name my-stream \
  --data '{"event":"login","user":"alice"}' \
  --partition-key alice
aws kinesis put-records \
  --stream-name my-stream \
  --records '[{"Data":"event1","PartitionKey":"k1"},{"Data":"event2","PartitionKey":"k2"}]'
aws kinesis get-shard-iterator \
  --stream-name my-stream \
  --shard-id shardId-000000000000 \
  --shard-iterator-type TRIM_HORIZON
aws kinesis list-streams
```

吞吐按分片计：一个分片约 1MB/s 写入，分片数是要监控的容量单位。`partition-key` 决定记录进哪个分片，同键保序。

EventBridge 是"带路由规则的事件总线"，还能用表达式定时触发任务：

```bash
aws events create-event-bus --name my-bus

aws events put-events \
  --entries '[{"Source":"my.app","DetailType":"Order","Detail":"{\"id\":12345}","EventBusName":"default"}]'

# 按事件内容匹配的规则
aws events put-rule \
  --name my-rule \
  --event-pattern '{"source":["my.app"]}' \
  --event-bus-name default

# 把 Lambda 挂成规则目标
aws events put-targets \
  --rule my-rule \
  --targets '[{"Id":"1","Arn":"arn:aws:lambda:us-east-1:123456789012:function:my-func"}]'

# 定时规则：每 5 分钟一次（云上 crontab）
aws events put-rule \
  --name cron-rule \
  --schedule-expression 'rate(5 minutes)'
```

选型口诀：**解耦任务用 SQS，广播事件用 SNS，流式管道用 Kinesis，事件路由和定时用 EventBridge**。四者经常组合（SNS 扇出到多个 SQS；EventBridge 规则投递到 SQS）而不是二选一。

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 用队列名代替队列 URL | 所有 API 调用报错 | 先 `get-queue-url`，URL 存进配置 |
| 消费失败不管，指望自动消失 | 毒消息无限重试 | 配 DLQ + maxReceiveCount |
| 处理时间超过可见性超时 | 消息被重复消费 | 预估处理时间设超时，长任务主动续期 |
| 消费端没有幂等 | 标准队列重复投递造成重复扣款 | 消费端按业务键去重 |
| FIFO 全部消息用同一个 group id | 吞吐退化成单线程 | 按业务实体（订单号/用户 ID）分组 |
| 没配积压告警 | 积压几天后消息过期被丢 | ApproximateNumberOfMessagesVisible 告警 |
| SQS 订阅 SNS 后解析报错 | 拿 SNS 信封当业务 JSON | 解析 Body 里的 Message 字段 |

## 自检

1. 可见性超时设为 0 会发生什么？设成 24 小时又会怎样？
2. 一条消息进了 DLQ，除了重放回主队列，还有哪种处理方式？
3. 为什么"积分服务"和"物流服务"应该各自订阅，而不是共享一个队列？

## 练习

1. 建队列、发 5 条消息，手动 receive-message 观察 ReceiptHandle 的变化，故意不删除，等可见性超时后再收一次，亲眼看到重复投递。
2. 配好 DLQ 后发一条"格式必然错误"的消息，等它被接收 5 次进入 DLQ，用 start-message-move-task 重放，再删干净资源。
3. 搭一个 SNS 主题 + 两个 SQS 队列的扇出，给两个订阅配不同的 FilterPolicy，发布三种不同 event 属性的消息验证各自只收到自己那份。

## 下一步

- 消息可靠性的通用模式（幂等、事务发件箱、重试风暴）见 [可靠消息模式](/devops/400-ReliableMessagingPatterns)。
- SQS 触发 Lambda 的无服务器组合见 [Serverless 架构](/cloud-computing/260-ServerlessArchitecture)。
- 队列积压的监控告警体系见 [AWS CloudWatch](/cloud-computing/440-AWSCloudWatch)。
