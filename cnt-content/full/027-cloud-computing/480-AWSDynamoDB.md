---
order: 480
title: AWS DynamoDB 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'DynamoDB 命令实战：建表与键设计、增删改查、索引与事务、流/TTL 与备份恢复。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 表创建与管理

**基本写法：创建表**
`aws dynamodb create-table --table-name <表名> --attribute-definitions <属性> --key-schema <键> --billing-mode <计费>`
```bash
# 创建按用户 ID 分区的表
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=UserId,AttributeType=S \
  --key-schema AttributeName=UserId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

---

**基本写法：创建带排序键的表**
`aws dynamodb create-table --table-name <表名> --attribute-definitions <属性> --key-schema <键>`
```bash
# 创建复合主键表(分区键 + 排序键)
aws dynamodb create-table \
  --table-name Orders \
  --attribute-definitions AttributeName=UserId,AttributeType=S AttributeName=OrderId,AttributeType=S \
  --key-schema AttributeName=UserId,KeyType=HASH AttributeName=OrderId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

---

**基本写法：列出所有表**
`aws dynamodb list-tables`
```bash
# 查看当前账户所有表
aws dynamodb list-tables
```

---

**基本写法：查看表描述**
`aws dynamodb describe-table --table-name <表名>`
```bash
# 查看表结构详情
aws dynamodb describe-table --table-name Users
```

---

**基本写法：删除表**
`aws dynamodb delete-table --table-name <表名>`
```bash
# 删除指定表及其所有数据
aws dynamodb delete-table --table-name Users
```

---

**基本写法：更新表配置**
`aws dynamodb update-table --table-name <表名> --billing-mode PROVISIONED --provisioned-throughput <吞吐量>`
```bash
# 切换为预置计费模式
aws dynamodb update-table \
  --table-name Users \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

---

## 数据写入

**基本写法：写入单条数据**
`aws dynamodb put-item --table-name <表名> --item <项>`
```bash
# 写入一条用户记录
aws dynamodb put-item \
  --table-name Users \
  --item '{"UserId":{"S":"u001"},"Name":{"S":"Alice"},"Age":{"N":"30"}}'
```

---

**基本写法：条件写入**
`aws dynamodb put-item --table-name <表名> --item <项> --condition-expression <条件>`
```bash
# 仅在用户不存在时写入
aws dynamodb put-item \
  --table-name Users \
  --item '{"UserId":{"S":"u001"},"Name":{"S":"Alice"}}' \
  --condition-expression 'attribute_not_exists(UserId)'
```

---

**基本写法：批量写入**
`aws dynamodb batch-write-item --request-items <请求>`
```bash
# 一次写入多条记录到多张表
aws dynamodb batch-write-item \
  --request-items '{
    "Users": [{"PutRequest":{"Item":{"UserId":{"S":"u002"},"Name":{"S":"Bob"}}}}],
    "Orders": [{"PutRequest":{"Item":{"UserId":{"S":"u002"},"OrderId":{"S":"o001"}}}}]
  }'
```

---

**基本写法：更新条目**
`aws dynamodb update-item --table-name <表名> --key <键> --update-expression <表达式> --expression-attribute-values <值>`
```bash
# 更新用户姓名和年龄
aws dynamodb update-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}' \
  --update-expression 'SET #n = :name, Age = :age' \
  --expression-attribute-names '{"#n":"Name"}' \
  --expression-attribute-values '{":name":{"S":"Alice Smith"},":age":{"N":"31"}}'
```

---

**基本写法：原子计数器更新**
`aws dynamodb update-item --table-name <表名> --key <键> --update-expression <表达式>`
```bash
# 原子自增计数
aws dynamodb update-item \
  --table-name Counters \
  --key '{"CounterId":{"S":"views"}}' \
  --update-expression 'SET Value = Value + :inc' \
  --expression-attribute-values '{":inc":{"N":"1"}}'
```

---

## 数据查询

**基本写法：按主键读取**
`aws dynamodb get-item --table-name <表名> --key <键>`
```bash
# 根据用户 ID 获取单条记录
aws dynamodb get-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}'
```

---

**基本写法：投影指定字段**
`aws dynamodb get-item --table-name <表名> --key <键> --projection-expression <字段>`
```bash
# 仅返回 Name 字段
aws dynamodb get-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}' \
  --projection-expression '#n' \
  --expression-attribute-names '{"#n":"Name"}'
```

---

**基本写法：查询分区键**
`aws dynamodb query --table-name <表名> --key-condition-expression <条件>`
```bash
# 查询指定用户所有订单
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid' \
  --expression-attribute-values '{":uid":{"S":"u001"}}'
```

---

**基本写法：范围查询排序键**
`aws dynamodb query --table-name <表名> --key-condition-expression <范围条件>`
```bash
# 查询用户订单 ID 在 o001-o099 之间
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid AND OrderId BETWEEN :start AND :end' \
  --expression-attribute-values '{":uid":{"S":"u001"},":start":{"S":"o001"},":end":{"S":"o099"}}'
```

---

**基本写法：索引分页**
`aws dynamodb query --table-name <表名> --key-condition-expression <条件> --limit <数量> --exclusive-start-key <键>`
```bash
# 翻页查询下 10 条
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression 'UserId = :uid' \
  --expression-attribute-values '{":uid":{"S":"u001"}}' \
  --limit 10 \
  --exclusive-start-key '{"UserId":{"S":"u001"},"OrderId":{"S":"o010"}}'
```

---

## 扫描与过滤

**基本写法：全表扫描**
`aws dynamodb scan --table-name <表名>`
```bash
# 扫描表所有记录
aws dynamodb scan --table-name Users
```

---

**基本写法：扫描过滤**
`aws dynamodb scan --table-name <表名> --filter-expression <过滤> --expression-attribute-values <值>`
```bash
# 过滤年龄大于 25 的用户
aws dynamodb scan \
  --table-name Users \
  --filter-expression 'Age > :minAge' \
  --expression-attribute-values '{":minAge":{"N":"25"}}'
```

---

**基本写法：扫描分页**
`aws dynamodb scan --table-name <表名> --limit <数量> --exclusive-start-key <键>`
```bash
# 每次扫描 100 条
aws dynamodb scan --table-name Users --limit 100
```

---

**基本写法：并行扫描**
`aws dynamodb scan --table-name <表名> --total-segments <段数> --segment <段号>`
```bash
# 并行扫描第 0 段(总共 4 段)
aws dynamodb scan \
  --table-name Users \
  --total-segments 4 \
  --segment 0
```

---

**基本写法：删除条目**
`aws dynamodb delete-item --table-name <表名> --key <键>`
```bash
# 删除指定用户记录
aws dynamodb delete-item \
  --table-name Users \
  --key '{"UserId":{"S":"u001"}}'
```

---

## 索引管理

**基本写法：创建全局二级索引**
`aws dynamodb update-table --table-name <表名> --attribute-definitions <属性> --global-secondary-index-updates <索引>`
```bash
# 为 Users 表创建按 Email 查询的 GSI
aws dynamodb update-table \
  --table-name Users \
  --attribute-definitions AttributeName=Email,AttributeType=S \
  --global-secondary-index-updates '[{"Create":{"IndexName":"EmailIndex","KeySchema":[{"AttributeName":"Email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}}]'
```

---

**基本写法：查询全局二级索引**
`aws dynamodb query --table-name <表名> --index-name <索引名> --key-condition-expression <条件>`
```bash
# 通过 Email 索引查询
aws dynamodb query \
  --table-name Users \
  --index-name EmailIndex \
  --key-condition-expression 'Email = :email' \
  --expression-attribute-values '{":email":{"S":"alice@example.com"}}'
```

---

**基本写法：创建本地二级索引**
`aws dynamodb update-table --table-name <表名> --attribute-definitions <属性> --local-secondary-index-updates <索引>`
```bash
# 创建按 CreatedAt 排序的 LSI
aws dynamodb update-table \
  --table-name Orders \
  --attribute-definitions AttributeName=CreatedAt,AttributeType=S \
  --local-secondary-index-updates '[{"Create":{"IndexName":"CreatedIndex","KeySchema":[{"AttributeName":"UserId","KeyType":"HASH"},{"AttributeName":"CreatedAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}}]'
```

---

**基本写法：删除索引**
`aws dynamodb update-table --table-name <表名> --global-secondary-index-updates <删除>`
```bash
# 删除 EmailIndex 索引
aws dynamodb update-table \
  --table-name Users \
  --global-secondary-index-updates '[{"Delete":{"IndexName":"EmailIndex"}}]'
```

---

## 事务操作

**基本写法：事务写入**
`aws dynamodb transact-write-items --transact-items <项>`
```bash
# 原子写入用户和订单(要么都成功,要么都失败)
aws dynamodb transact-write-items \
  --transact-items '[
    {"Put":{"TableName":"Users","Item":{"UserId":{"S":"u003"},"Name":{"S":"Charlie"}}}},
    {"Put":{"TableName":"Orders","Item":{"UserId":{"S":"u003"},"OrderId":{"S":"o003"}}}}
  ]'
```

---

**基本写法：事务读取**
`aws dynamodb transact-get-items --transact-items <项>`
```bash
# 一次性原子读取多个条目
aws dynamodb transact-get-items \
  --transact-items '[
    {"Get":{"TableName":"Users","Key":{"UserId":{"S":"u001"}}}},
    {"Get":{"TableName":"Users","Key":{"UserId":{"S":"u002"}}}}
  ]'
```

---

**基本写法：条件检查事务**
`aws dynamodb transact-write-items --transact-items <带条件>`
```bash
# 带条件的事务写入
aws dynamodb transact-write-items \
  --transact-items '[
    {"Put":{"TableName":"Users","Item":{"UserId":{"S":"u004"}},"ConditionExpression":"attribute_not_exists(UserId)"}},
    {"Update":{"TableName":"Counters","Key":{"CounterId":{"S":"users"}},"UpdateExpression":"SET Value = Value + :inc","ExpressionAttributeValues":{":inc":{"N":"1"}}}}
  ]'
```

---

## 流与 TTL

**基本写法：启用 DynamoDB Streams**
`aws dynamodb update-table --table-name <表名> --stream-specification <规格>`
```bash
# 启用 NEW_AND_OLD_IMAGES 流
aws dynamodb update-table \
  --table-name Users \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

---

**基本写法：查看流描述**
`aws dynamodb describe-table --table-name <表名> --query 'Table.StreamSpecification'`
```bash
# 查看表的流配置
aws dynamodb describe-table \
  --table-name Users \
  --query 'Table.StreamSpecification'
```

---

**基本写法：启用 TTL**
`aws dynamodb update-time-to-live --table-name <表名> --time-to-live-specification <规格>`
```bash
# 启用 TTL 自动删除 30 天前的记录
aws dynamodb update-time-to-live \
  --table-name Sessions \
  --time-to-live-specification Enabled=true,AttributeName=expireAt
```

---

**基本写法：查看 TTL 配置**
`aws dynamodb describe-time-to-live --table-name <表名>`
```bash
# 查看表 TTL 状态
aws dynamodb describe-time-to-live --table-name Sessions
```

---

## 备份与恢复

**基本写法：创建备份**
`aws dynamodb create-backup --table-name <表名> --backup-name <备份名>`
```bash
# 创建表备份
aws dynamodb create-backup \
  --table-name Users \
  --backup-name Users-backup-20260731
```

---

**基本写法：列出备份**
`aws dynamodb list-backups`
```bash
# 列出所有备份
aws dynamodb list-backups
```

---

**基本写法：从备份还原表**
`aws dynamodb restore-table-from-backup --target-table-name <新表> --backup-arn <备份ARN>`
```bash
# 从备份还原到新表
aws dynamodb restore-table-from-backup \
  --target-table-name Users-restored \
  --backup-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users/backup/01234567890123-Users-backup
```

---

**基本写法：跨表还原**
`aws dynamodb restore-table-to-point-in-time --source-table-name <源表> --target-table-name <目标表>`
```bash
# 时间点恢复(PITR)到新表
aws dynamodb restore-table-to-point-in-time \
  --source-table-name Users \
  --target-table-name Users-recovered \
  --use-latest-restorable-time
```

---

**基本写法：导出到 S3**
`aws dynamodb export-table-to-point-in-time --table-arn <表ARN> --s3-bucket <桶> --s3-prefix <前缀> --export-format <格式>`
```bash
# 导出表数据到 S3
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/Users \
  --s3-bucket my-bucket \
  --s3-prefix dynamodb-exports/Users/ \
  --export-format DYNAMODB_JSON
```

---

## 容量与计费

**基本写法：自动扩容**
`aws application-autoscaling register-scalable-target --service-namespace dynamodb --resource-id <资源> --scalable-dimension <维度>`
```bash
# 注册表的写入容量为可伸缩目标
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/Users \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

---

**基本写法：配置扩容策略**
`aws application-autoscaling put-scaling-policy --policy-name <策略> --service-namespace dynamodb --resource-id <资源> --policy-type TargetTrackingScaling`
```bash
# 目标追踪策略保持利用率 70%
aws application-autoscaling put-scaling-policy \
  --policy-name UsersWriteScaling \
  --service-namespace dynamodb \
  --resource-id table/Users \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"DynamoDBWriteCapacityUtilization"}}'
```

---

**基本写法：查看表消费容量**
`aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ConsumedReadCapacityUnits`
```bash
# 查询表已消费读容量
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=Users \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period 300 \
  --statistics Sum
```
