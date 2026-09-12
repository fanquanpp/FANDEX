---
order: 470
title: AWS SQS/SNS 消息队列命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'SQS/SNS 命令实战：队列与主题管理、消息收发、死信队列、订阅过滤与 Kinesis 对照。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---
## 学习目标

本文是「云计算」模块的第 47 篇，难度定位为入门。重点内容：SQS/SNS 命令实战：队列与主题管理、消息收发、死信队列、订阅过滤与 Kinesis 对照。

主要章节：

- SQS 队列管理
- SQS 消息收发
- SQS 死信队列
- SNS 主题管理
- SNS 订阅管理
- SNS 发布消息
- ……共 9 个章节

## SQS 队列管理

**基本写法：创建标准队列**
`aws sqs create-queue --queue-name <队列名>`
```bash
# 创建标准队列
aws sqs create-queue --queue-name my-queue
```

---

**基本写法：创建 FIFO 队列**
`aws sqs create-queue --queue-name <队列名.fifo> --attributes FIFOQueueEnabled=true`
```bash
# 创建 FIFO 队列(.fifo 后缀必填)
aws sqs create-queue \
  --queue-name my-queue.fifo \
  --attributes FIFOQueueEnabled=true,ContentBasedDeduplication=true
```

---

**基本写法：列出所有队列**
`aws sqs list-queues [--queue-name-prefix <前缀>]`
```bash
# 列出以 my 开头的队列
aws sqs list-queues --queue-name-prefix my
```

---

**基本写法：查看队列 URL**
`aws sqs get-queue-url --queue-name <队列名>`
```bash
# 获取指定队列的 URL
aws sqs get-queue-url --queue-name my-queue
```

---

**基本写法：删除队列**
`aws sqs delete-queue --queue-url <队列URL>`
```bash
# 删除指定队列
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
```

---

**基本写法：设置队列属性**
`aws sqs set-queue-attributes --queue-url <URL> --attributes <属性>`
```bash
# 设置消息保留 4 天、可见性超时 300 秒
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes MessageRetentionPeriod=345600,VisibilityTimeout=300
```

---

## SQS 消息收发

**基本写法：发送消息**
`aws sqs send-message --queue-url <URL> --message-body <内容>`
```bash
# 发送一条文本消息到队列
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --message-body '{"order_id":"12345","status":"paid"}'
```

---

**基本写法：FIFO 队列发送消息**
`aws sqs send-message --queue-url <URL> --message-body <内容> --message-group-id <组ID>`
```bash
# FIFO 队列必须指定 MessageGroupId
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue.fifo \
  --message-body '{"order_id":"12345"}' \
  --message-group-id order-group-1 \
  --message-deduplication-id dedup-001
```

---

**基本写法：批量发送消息**
`aws sqs send-message-batch --queue-url <URL> --entries <条目>`
```bash
# 一次发送最多 10 条消息
aws sqs send-message-batch \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --entries '[{"Id":"msg1","MessageBody":"first"},{"Id":"msg2","MessageBody":"second"}]'
```

---

**基本写法：接收消息**
`aws sqs receive-message --queue-url <URL> [--max-number-of-messages <数量>] [--wait-time-seconds <秒>]`
```bash
# 长轮询接收 10 条消息
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --max-number-of-messages 10 \
  --wait-time-seconds 20
```

---

**基本写法：删除消息**
`aws sqs delete-message --queue-url <URL> --receipt-handle <回执>`
```bash
# 处理完成后删除消息
aws sqs delete-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --receipt-handle AQEBwJm...EXAMPLE
```

---

**基本写法：改变可见性超时**
`aws sqs change-message-visibility --queue-url <URL> --receipt-handle <回执> --visibility-timeout <秒>`
```bash
# 延长消息处理时间
aws sqs change-message-visibility \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --receipt-handle AQEBwJm...EXAMPLE \
  --visibility-timeout 600
```

---

## SQS 死信队列

**基本写法：配置死信队列**
`aws sqs set-queue-attributes --queue-url <URL> --attributes RedrivePolicy=<JSON>`
```bash
# 设置接收 5 次后转入死信队列
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:my-dlq\",\"maxReceiveCount\":\"5\"}"}'
```

---

**基本写法：查看死信队列属性**
`aws sqs get-queue-attributes --queue-url <URL> --attribute-names RedrivePolicy`
```bash
# 查看队列的死信策略
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
  --attribute-names RedrivePolicy
```

---

**基本写法：从死信队列重新驱动消息**
`aws sqs start-message-move-task --source-arn <DLQ ARN> --destination-arn <目标 ARN>`
```bash
# 将死信队列消息重新投递回主队列
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:us-east-1:123456789012:my-dlq \
  --destination-arn arn:aws:sqs:us-east-1:123456789012:my-queue
```

---

**基本写法：查看队列指标**
`aws cloudwatch get-metric-statistics --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible`
```bash
# 查看队列中可见消息数量
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=my-queue \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period 300 \
  --statistics Average
```

---

## SNS 主题管理

**基本写法：创建 SNS 主题**
`aws sns create-topic --name <主题名>`
```bash
# 创建 SNS 主题
aws sns create-topic --name my-topic
```

---

**基本写法：列出所有主题**
`aws sns list-topics`
```bash
# 列出账户下所有 SNS 主题
aws sns list-topics
```

---

**基本写法：查看主题属性**
`aws sns get-topic-attributes --topic-arn <主题ARN>`
```bash
# 查看主题配置
aws sns get-topic-attributes --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic
```

---

**基本写法：删除主题**
`aws sns delete-topic --topic-arn <主题ARN>`
```bash
# 删除指定 SNS 主题
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic
```

---

**基本写法：设置主题属性**
`aws sns set-topic-attributes --topic-arn <主题ARN> --attribute-name <属性> --attribute-value <值>`
```bash
# 设置主题显示名称
aws sns set-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --attribute-name DisplayName \
  --attribute-value "My Topic"
```

---

## SNS 订阅管理

**基本写法：订阅 SQS 队列**
`aws sns subscribe --topic-arn <主题ARN> --protocol sqs --notification-endpoint <队列ARN>`
```bash
# 让 SQS 队列订阅 SNS 主题
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:my-queue
```

---

**基本写法：邮件订阅**
`aws sns subscribe --topic-arn <主题ARN> --protocol email --notification-endpoint <邮箱>`
```bash
# 通过邮件订阅主题(需邮件确认)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol email \
  --notification-endpoint user@example.com
```

---

**基本写法：HTTP 端点订阅**
`aws sns subscribe --topic-arn <主题ARN> --protocol https --notification-endpoint <URL>`
```bash
# 通过 HTTPS 端点订阅主题
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --protocol https \
  --notification-endpoint https://example.com/webhook
```

---

**基本写法：列出订阅**
`aws sns list-subscriptions-by-topic --topic-arn <主题ARN>`
```bash
# 查看指定主题所有订阅
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic
```

---

**基本写法：取消订阅**
`aws sns unsubscribe --subscription-arn <订阅ARN>`
```bash
# 删除指定订阅
aws sns unsubscribe --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:12345678-1234-1234-1234-123456789012
```

---

## SNS 发布消息

**基本写法：发布消息**
`aws sns publish --topic-arn <主题ARN> --message <内容>`
```bash
# 向主题发布消息
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Deployment completed"
```

---

**基本写法：带主题发布**
`aws sns publish --topic-arn <主题ARN> --message <内容> --subject <主题>`
```bash
# 发送带主题的邮件通知
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Build failed: see logs" \
  --subject "ALERT: Build Failure"
```

---

**基本写法：消息属性**
`aws sns publish --topic-arn <主题ARN> --message <内容> --message-attributes <属性>`
```bash
# 携带属性便于订阅端过滤
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --message "Order 12345" \
  --message-attributes '{"event":{"DataType":"String","StringValue":"order_created"}}'
```

---

**基本写法：直接发送到手机号**
`aws sns publish --phone-number <号码> --message <内容>`
```bash
# 直接发 SMS 短信
aws sns publish \
  --phone-number +8613800138000 \
  --message "Your verification code is 123456"
```

---

## SNS 过滤策略

**基本写法：设置订阅过滤策略**
`aws sns set-subscription-attributes --subscription-arn <订阅ARN> --attribute-name FilterPolicy --attribute-value <JSON>`
```bash
# 仅接收 event=order_created 的消息
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{"event":["order_created"]}'
```

---

**基本写法：范围过滤策略**
`aws sns set-subscription-attributes --subscription-arn <订阅ARN> --attribute-name FilterPolicy --attribute-value <范围JSON>`
```bash
# 仅接收 price 在 100-1000 之间的消息
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{"price":[{"numeric":[">=",100,"<=",1000]}]}'
```

---

**基本写法：移除过滤策略**
`aws sns set-subscription-attributes --subscription-arn <订阅ARN> --attribute-name FilterPolicy --attribute-value "{}"`
```bash
# 清除过滤策略接收全部消息
aws sns set-subscription-attributes \
  --subscription-arn arn:aws:sns:us-east-1:123456789012:my-topic:abc-123 \
  --attribute-name FilterPolicy \
  --attribute-value '{}'
```

---

## Kinesis 数据流

**基本写法：创建数据流**
`aws kinesis create-stream --stream-name <流名> --shard-count <分片数>`
```bash
# 创建 3 分片的 Kinesis 流
aws kinesis create-stream --stream-name my-stream --shard-count 3
```

---

**基本写法：写入记录**
`aws kinesis put-record --stream-name <流名> --data <数据> --partition-key <分区键>`
```bash
# 写入一条记录到流中
aws kinesis put-record \
  --stream-name my-stream \
  --data '{"event":"login","user":"alice"}' \
  --partition-key alice
```

---

**基本写法：批量写入**
`aws kinesis put-records --stream-name <流名> --records <记录列表>`
```bash
# 批量写入多条记录
aws kinesis put-records \
  --stream-name my-stream \
  --records '[{"Data":"event1","PartitionKey":"k1"},{"Data":"event2","PartitionKey":"k2"}]'
```

---

**基本写法：读取记录**
`aws kinesis get-shard-iterator --stream-name <流名> --shard-id <分片ID> --shard-iterator-type TRIM_HORIZON`
```bash
# 获取分片迭代器
aws kinesis get-shard-iterator \
  --stream-name my-stream \
  --shard-id shardId-000000000000 \
  --shard-iterator-type TRIM_HORIZON
```

---

**基本写法：列出所有流**
`aws kinesis list-streams`
```bash
# 列出账户所有 Kinesis 流
aws kinesis list-streams
```

---

## EventBridge 事件

**基本写法：创建事件总线**
`aws events create-event-bus --name <总线名>`
```bash
# 创建自定义事件总线
aws events create-event-bus --name my-bus
```

---

**基本写法：发布事件**
`aws events put-events --entries <事件>`
```bash
# 向默认总线发布事件
aws events put-events \
  --entries '[{"Source":"my.app","DetailType":"Order","Detail":"{\"id\":12345}","EventBusName":"default"}]'
```

---

**基本写法：创建规则**
`aws events put-rule --name <规则名> --event-pattern <模式> --event-bus-name <总线>`
```bash
# 创建匹配指定源的规则
aws events put-rule \
  --name my-rule \
  --event-pattern '{"source":["my.app"]}' \
  --event-bus-name default
```

---

**基本写法：为目标添加权限**
`aws events put-targets --rule <规则名> --targets <目标>`
```bash
# 将 Lambda 函数设为规则目标
aws events put-targets \
  --rule my-rule \
  --targets '[{"Id":"1","Arn":"arn:aws:lambda:us-east-1:123456789012:function:my-func"}]'
```

---

**基本写法：定时触发**
`aws events put-rule --name <规则名> --schedule-expression <表达式>`
```bash
# 每 5 分钟触发一次
aws events put-rule \
  --name cron-rule \
  --schedule-expression 'rate(5 minutes)'
```
