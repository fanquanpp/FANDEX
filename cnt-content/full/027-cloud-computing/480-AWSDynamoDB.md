---
order: 480
title: AWS DynamoDB 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'DynamoDB 学习笔记：从键设计开始建表、增删改查、GSI 索引、事务，再到流/TTL/备份与计费，理解它和关系库的思维差异。'
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cloud-computing/200-CloudDatabaseService'
  - 'cloud-computing/450-AWSRDSCommands'
  - 'cloud-computing/260-ServerlessArchitecture'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
---

## 场景

给一个订单查询服务选存储：请求量暴涨暴跌（促销时百倍流量），又不想半夜处理数据库连接打满的告警。这类"键值访问为主、流量波动大、不想管运维"的场景正是 DynamoDB 的主场——AWS 的全托管 NoSQL，毫秒级延迟，按请求付费，没有"实例"概念。

但它的第一课不是建表命令，而是换脑子：**DynamoDB 没有 JOIN、没有自由 SQL，能快是因为它只承诺"按主键访问"这一条快路径**。所以设计表 = 设计你的访问模式。先想清楚"我会怎么查"，再建表。

## 第一步：键设计，然后建表

访问模式想成两句话："按用户 ID 查用户"和"列出一个用户的所有订单、按订单号排"。

- 前者是简单主键：只有分区键（HASH），DynamoDB 按它的哈希把数据打散到后端分区。
- 后者是复合主键：分区键 + 排序键（RANGE），同一分区键下的条目按排序键有序存放。

```bash
# 简单主键表：按 UserId 访问用户
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=UserId,AttributeType=S \
  --key-schema AttributeName=UserId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# 复合主键表：UserId + OrderId，天然支持"某用户的全部订单"
aws dynamodb create-table \
  --table-name Orders \
  --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=OrderId,AttributeType=S \
  --key-schema AttributeName=UserId,KeyType=HASH AttributeName=OrderId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# 查看账户所有表
aws dynamodb list-tables

# 查看表结构、状态与容量详情
aws dynamodb describe-table --table-name Users
```

注意 `--billing-mode PAY_PER_REQUEST`（按请求付费）：流量波动大的首选。稳定大流量才值得换成 PROVISIONED 预置模式（更便宜，但要管容量）：

```bash
aws dynamodb update-table \
  --table-name Users \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

还有一个反直觉点：`--attribute-definitions` 只声明**主键属性**的类型，不是全部字段——DynamoDB 表没有 schema，每条 Item 想有什么字段就有什么字段。

## 第二步：写入——注意 JSON 里的类型标注

DynamoDB 的 JSON 格式每个值都带类型标注（S=字符串、N=数字），N 也写成字符串是它的怪癖，CLI 下躲不开，见多了就习惯：

```bash
# 写入一条用户记录
aws dynamodb put-item \
  --table-name Users \
  --item '{"UserId":{"S":"u001"},"Name":{"S":"Alice"},"Age":{"N":"30"}}'

# 条件写入：只在用户不存在时创建（幂等注册的实现方式）
aws dynamodb put-item \
  --table-name Users \
  --item '{"UserId":{"S":"u001"},"Name":{"S":"Alice"}}' \
  --condition-expression 'attribute_not_exists(UserId)'

# 批量写入（一次最多 25 条，可跨表）
aws dynamodb batch-write-item \
  --request-items '{
    "Users": [{"PutRequest":{"Item":{"UserId":{"S":"u002"},"Name":{"S":"Bob"}}}}],
    "Orders": [{"PutRequest":{"Item":{"UserId":{"S":"u002"},"OrderId":{"S":"o001"}}}}]
  }'
```

条件写入失败会返回 ConditionalCheckFailedException——在应用里这不是错误，是"用户已存在"的正常分支。并发安全全靠它，不靠锁。

## 第三步：读——get、query、scan 三种姿势，成本差一个数量级

```bash
# 1. get-item：按完整主键读一条，最便宜最快
aws dynamodb get-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}'

# 只取需要的字段，省读取容量
aws dynamodb get-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}' \
  --projection-expression '#n' \
  --expression-attribute-names '{"#n":"Name"}'

# 2. query：按分区键（可加排序键范围）读一组，高效
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid' \
  --expression-attribute-values '{":uid":{"S":"u001"}}'

# 排序键范围：该用户订单号在 o001-o099 之间的
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid AND OrderId BETWEEN :start AND :end' \
  --expression-attribute-values '{":uid":{"S":"u001"},":start":{"S":"o001"},":end":{"S":"o099"}}'

# 翻页：limit + 上一页返回的 LastEvaluatedKey
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid' \
  --expression-attribute-values '{":uid":{"S":"u001"}}' \
  --limit 10 \
  --exclusive-start-key '{"UserId":{"S":"u001"},"OrderId":{"S":"o010"}}'
```

第三种是 scan（扫描），先记结论：**scan 是全表遍历，读多少行花多少钱，生产代码里出现 scan 基本都是设计问题**。

```bash
# 全表扫描（管理用途：看看表里有什么）
aws dynamodb scan --table-name Users

# scan 时过滤：注意——先读全行再过滤，费用按读的行算，不是按结果算
aws dynamodb scan \
  --table-name Users \
  --filter-expression 'Age > :minAge' \
  --expression-attribute-values '{":minAge":{"N":"25"}}'

# 大表用分段并行扫描提速（管理工具，不是业务查询）
aws dynamodb scan --table-name Users --limit 100
aws dynamodb scan \
  --table-name Users \
  --total-segments 4 \
  --segment 0
```

心智模型一句话：get = 精确取一件，query = 按目录翻一节，scan = 把整本书读一遍再挑。应用查询永远优先设计成前两种。

## 第四步：更新与删除

```bash
# 更新字段（SET 语法，字段不存在则创建）
aws dynamodb update-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}' \
  --update-expression 'SET #n = :name, Age = :age' \
  --expression-attribute-names '{"#n":"Name"}' \
  --expression-attribute-values '{":name":{"S":"Alice Smith"},":age":{"N":"31"}}'

# 原子计数器：服务端自增，天然并发安全（浏览量/库存的经典用法）
aws dynamodb update-item \
  --table-name Counters \
  --key '{"CounterId":{"S":"views"}}' \
  --update-expression 'SET Value = Value + :inc' \
  --expression-attribute-values '{":inc":{"N":"1"}}'

# 删除
aws dynamodb delete-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}'
```

计数器示例里的 `Name` 是 DynamoDB 保留字，所以用了 `#n` 占位符——遇到 `attribute name is a reserved keyword` 报错就是这个问题。

## 第五步：索引——为"另一种查询方式"开目录

主键之外的查询需要二级索引。GSI（全局二级索引）最常用：可以选任何属性当新的分区键，和主表分开扩容。比如"按邮箱登录"需要 Email 索引：

```bash
# 给 Users 表加 Email GSI
aws dynamodb update-table \
  --table-name Users \
  --attribute-definitions AttributeName=Email,AttributeType=S \
  --global-secondary-index-updates '[{"Create":{"IndexName":"EmailIndex","KeySchema":[{"AttributeName":"Email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}}]'

# 查询走索引（--index-name）
aws dynamodb query \
  --table-name Users \
  --index-name EmailIndex \
  --key-condition-expression 'Email = :email' \
  --expression-attribute-values '{":email":{"S":"alice@example.com"}}'

# LSI：与主表共用分区键、换排序键（建表时才能创建，这里演示语法）
aws dynamodb update-table \
  --table-name Orders \
  --attribute-definitions AttributeName=CreatedAt,AttributeType=S \
  --local-secondary-index-updates '[{"Create":{"IndexName":"CreatedIndex","KeySchema":[{"AttributeName":"UserId","KeyType":"HASH"},{"AttributeName":"CreatedAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}}]'

# 删除索引
aws dynamodb update-table \
  --table-name Users \
  --global-secondary-index-updates '[{"Delete":{"IndexName":"EmailIndex"}}]'
```

每个 GSI 都是主表数据的完整副本：写入翻倍计费，索引键选太随意会显著抬成本。GSI 是最终一致的（写主表到索引可见有毫秒级延迟），读己之写的场景别查 GSI。

## 第六步：事务——跨条目原子操作

DynamoDB 单条操作原子，跨条目要用事务 API（双倍容量计费，不要滥用）：

```bash
# 原子写入用户和订单：要么都成功，要么都失败
aws dynamodb transact-write-items \
  --transact-items '[
    {"Put":{"TableName":"Users","Item":{"UserId":{"S":"u003"},"Name":{"S":"Charlie"}}}},
    {"Put":{"TableName":"Orders","Item":{"UserId":{"S":"u003"},"OrderId":{"S":"o003"}}}}
  ]'

# 事务读：一致性地读多条
aws dynamodb transact-get-items \
  --transact-items '[
    {"Get":{"TableName":"Users","Key":{"UserId":{"S":"u001"}}}},
    {"Get":{"TableName":"Users","Key":{"UserId":{"S":"u002"}}}}
  ]'

# 条件 + 计数组合：抢库存的完整形态
aws dynamodb transact-write-items \
  --transact-items '[
    {"Put":{"TableName":"Users","Item":{"UserId":{"S":"u004"}},"ConditionExpression":"attribute_not_exists(UserId)"}},
    {"Update":{"TableName":"Counters","Key":{"CounterId":{"S":"users"}},"UpdateExpression":"SET Value = Value + :inc","ExpressionAttributeValues":{":inc":{"N":"1"}}}}
  ]'
```

## 第七步：Streams、TTL 与备份

### Streams：表的变更日志

开启后每条写入/修改/删除都会产生事件记录，下游（通常 Lambda）订阅它做联动——缓存失效、搜索索引同步、审计都靠这个机制：

```bash
# 启用并保留新旧两版镜像
aws dynamodb update-table \
  --table-name Users \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES

aws dynamodb describe-table \
  --table-name Users \
  --query 'Table.StreamSpecification'
```

### TTL：自动过期

会话、验证码这类数据不需要删除作业，给每条记录写一个过期时间戳属性，DynamoDB 自动清：

```bash
# expireAt 属性存的是 Unix 秒级时间戳，到点后后台异步删除
aws dynamodb update-time-to-live \
  --table-name Sessions \
  --time-to-live-specification Enabled=true,AttributeName=expireAt

aws dynamodb describe-time-to-live --table-name Sessions
```

注意 TTL 删除是"最终"的：过期后到真正删除之间可能隔最多 48 小时，期间查询仍可能读到——应用判断逻辑要自己比对时间戳。

### 备份与恢复

```bash
# 手动备份
aws dynamodb create-backup \
  --table-name Users \
  --backup-name Users-backup-20260731

aws dynamodb list-backups

# 从备份还原成新表
aws dynamodb restore-table-from-backup \
  --target-table-name Users-restored \
  --backup-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users/backup/01234567890123-Users-backup

# 时间点恢复（PITR）：恢复到过去 35 天内任意一秒，先在控制台/CLI 开启
aws dynamodb restore-table-to-point-in-time \
  --source-table-name Users \
  --target-table-name Users-recovered \
  --use-latest-restorable-time

# 导出到 S3（做数据分析、迁移）
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users \
  --s3-bucket my-bucket \
  --s3-prefix dynamodb-exports/Users/ \
  --export-format DYNAMODB_JSON
```

和 RDS 一样，恢复产物是新表新名字，应用要切换指向。

## 第八步：预置模式的容量伸缩

选了 PROVISIONED 计费的表，容量要跟着流量走。Application Auto Scaling 的目标追踪最常用："把利用率稳定在 70%":

```bash
# 注册可伸缩目标：写容量 5-100 之间自动调整
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/Users \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100

# 挂目标追踪策略
aws application-autoscaling put-scaling-policy \
  --policy-name UsersWriteScaling \
  --service-namespace dynamodb \
  --resource-id table/Users \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"DynamoDBWriteCapacityUtilization"}}'
```

超容量请求会被节流（ProvisionedThroughputExceededException），自动扩容响应需要几分钟——秒级尖峰场景要么按请求付费，要么预留突发容量。

监控实际消耗，和预置值对比：

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=Users \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period 300 \
  --statistics Sum
```

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 用关系库思维建表，之后想"再查个别的字段" | 只能 scan，成本爆炸 | 先列访问模式再定键；新查询用 GSI |
| 业务代码里用 scan + filter | 读费用与全表大小成正比 | 改 query 或建索引 |
| 写入超预置容量 | 节流报错 | 按请求计费或配自动伸缩 |
| 保留字当字段名（Name/Status/Size...） | 表达式报错 | `#占位符` + expression-attribute-names |
| GSI 当强一致读用 | 偶尔读到旧数据 | GSI 最终一致，读写一致走主表 |
| TTL 当精确闹钟 | 过期后仍能查到 | 应用侧同时判断时间戳 |
| 滥用事务 | 计费翻倍、吞吐下降 | 默认单条操作，确需跨条原子才用事务 |

## 自检

1. "查询某城市所有用户"在这个表设计下该怎么做？分别评估 scan、GSI、把城市写进主键三种方案的成本。
2. 条件写入和事务分别解决什么并发问题？
3. PAY_PER_REQUEST 什么情况下反而比 PROVISIONED 贵？

## 练习

1. 建复合主键表写入 5 个用户的订单，用 query 的 BETWEEN 查某一用户的订单号区间，再用 scan 查同样的数据，感受两者的返回差异。
2. 给表加一个 GSI 并查询，然后用 `delete-table` 清理（注意先确认没有 Lambda 在订阅流）。
3. 写入一条带 `expireAt`（当前时间 + 60 秒）的记录，开 TTL，一分钟后查询它，观察 TTL 的"最终删除"特性。

## 下一步

- 什么时候选 DynamoDB、什么时候选 RDS/Aurora：见 [云数据库服务](/cloud-computing/200-CloudDatabaseService)。
- DynamoDB + Lambda + SQS 的无服务器组合见 [Serverless 架构](/cloud-computing/260-ServerlessArchitecture)。
- 键设计深入（单表设计、热点分区）建议读 AWS 官方 Best Practices 指南，配合本篇的访问模式思维。
