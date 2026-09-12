---
order: 520
title: GCP BigQuery 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'BigQuery 命令实战：bq 工具、数据集与表管理、查询作业、数据加载导出与流式插入。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---
## 学习目标

本文是「云计算」模块的第 52 篇，难度定位为入门。重点内容：BigQuery 命令实战：bq 工具、数据集与表管理、查询作业、数据加载导出与流式插入。

主要章节：

- bq 工具基础
- 数据集管理
- 表操作
- 数据查询
- 数据加载
- 数据导出
- ……共 14 个章节

## bq 工具基础

**基本写法：查看帮助**
`bq --help`
```bash
# 查看 bq 命令行工具帮助
bq --help
```

---

**基本写法：查看版本**
`bq version`
```bash
# 查看 bq 工具版本
bq version
```

---

**基本写法：设置默认项目**
`gcloud config set project <项目ID>`
```bash
# 设置 bq 操作的默认项目
gcloud config set project my-project-123
```

---

**基本写法：指定项目运行**
`bq --project_id <项目ID> query <查询>`
```bash
# 在指定项目下运行查询
bq --project_id my-project-123 query 'SELECT 1'
```

---

**基本写法：设置查询位置**
`bq --location <位置> query <查询>`
```bash
# 指定查询在 EU 区域执行
bq --location EU query 'SELECT 1'
```

---

## 数据集管理

**基本写法：创建数据集**
`bq mk --dataset --location <位置> <项目>:<数据集>`
```bash
# 创建 US 多区域数据集
bq mk --dataset --location US my-project-123:my_dataset
```

---

**基本写法：列出数据集**
`bq ls [--project_id <项目ID>]`
```bash
# 列出当前项目所有数据集
bq ls
```

---

**基本写法：查看数据集信息**
`bq show <项目>:<数据集>`
```bash
# 查看数据集详细信息
bq show my-project-123:my_dataset
```

---

**基本写法：删除数据集**
`bq rm -r -d <数据集>`
```bash
# 删除数据集及其所有表
bq rm -r -d my_dataset
```

---

**基本写法：更新数据集**
`bq update --description <描述> <数据集>`
```bash
# 更新数据集描述
bq update --description "用户分析数据集" my_dataset
```

---

## 表操作

**基本写法：创建表**
`bq mk --table <项目>:<数据集>.<表> <字段:类型>`
```bash
# 创建带 schema 的表
bq mk --table my_dataset.users \
  user_id:STRING,name:STRING,age:INTEGER,created_at:TIMESTAMP
```

---

**基本写法：列出表**
`bq ls <项目>:<数据集>`
```bash
# 列出数据集中所有表
bq ls my_dataset
```

---

**基本写法：查看表结构**
`bq show --schema <项目>:<数据集>.<表>`
```bash
# 查看表 schema
bq show --schema --format=prettyjson my_dataset.users
```

---

**基本写法：查看表详情**
`bq show <项目>:<数据集>.<表>`
```bash
# 查看表详细信息
bq show my_dataset.users
```

---

**基本写法：删除表**
`bq rm -t <项目>:<数据集>.<表>`
```bash
# 删除指定表
bq rm -t my_dataset.users
```

---

**基本写法：复制表**
`bq cp <源表> <目标表>`
```bash
# 复制表到另一数据集
bq cp my_dataset.users my_dataset.users_backup
```

---

## 数据查询

**基本写法：运行查询**
`bq query <SQL>`
```bash
# 运行标准 SQL 查询
bq query 'SELECT * FROM my_dataset.users LIMIT 10'
```

---

**基本写法：格式化输出**
`bq query --format <格式> <SQL>`
```bash
# 以 JSON 格式输出
bq query --format=prettyjson 'SELECT * FROM my_dataset.users LIMIT 10'
```

---

**基本写法：保存查询结果到表**
`bq query --destination_table <表> --use_legacy_sql=false <SQL>`
```bash
# 查询结果保存到新表
bq query \
  --destination_table my_dataset.results \
  --use_legacy_sql=false \
  'SELECT * FROM my_dataset.users WHERE age > 18'
```

---

**基本写法：追加结果到表**
`bq query --destination_table <表> --append_table <SQL>`
```bash
# 将结果追加到已有表
bq query \
  --destination_table my_dataset.results \
  --append_table \
  'SELECT * FROM my_dataset.users WHERE age > 30'
```

---

**基本写法：运行参数化查询**
`bq query --parameter=<参数> <SQL>`
```bash
# 使用命名参数查询
bq query \
  --parameter='min_age:INT64:21' \
  'SELECT * FROM my_dataset.users WHERE age >= @min_age'
```

---

## 数据加载

**基本写法：从本地 CSV 加载**
`bq load --source_format=CSV <数据集>.<表> <文件> <schema>`
```bash
# 加载本地 CSV 文件到表
bq load --source_format=CSV \
  my_dataset.users \
  users.csv \
  user_id:STRING,name:STRING,age:INTEGER
```

---

**基本写法：从 GCS 加载**
`bq load --source_format=<格式> <表> <gs://路径>`
```bash
# 从 Cloud Storage 加载 JSON 数据
bq load --source_format=NEWLINE_DELIMITED_JSON \
  my_dataset.events \
  gs://my-bucket/events/*.json \
  event_id:STRING,event_type:STRING,timestamp:TIMESTAMP
```

---

**基本写法：自动检测 schema**
`bq load --autodetect <表> <源>`
```bash
# 自动检测 CSV 文件 schema
bq load --autodetect \
  my_dataset.users \
  gs://my-bucket/users.csv
```

---

**基本写法：指定跳过行数**
`bq load --skip_leading_rows=<行数> <表> <源> <schema>`
```bash
# 跳过 CSV 首行表头
bq load --skip_leading_rows=1 \
  my_dataset.users \
  gs://my-bucket/users.csv \
  user_id:STRING,name:STRING,age:INTEGER
```

---

**基本写法：从 Datastore 备份加载**
`bq load --source_format=DATASTORE_BACKUP <表> <gs://路径>`
```bash
# 从 Datastore 备份导出加载
bq load --source_format=DATASTORE_BACKUP \
  my_dataset.entities \
  gs://my-bucket/backup/2026/07/31/entities.export
```

---

## 数据导出

**基本写法：导出为 CSV**
`bq extract <表> <gs://路径>`
```bash
# 导出表数据到 GCS 为 CSV
bq extract my_dataset.users \
  gs://my-bucket/exports/users-*.csv
```

---

**基本写法：导出为 JSON**
`bq extract --destination_format=NEWLINE_DELIMITED_JSON <表> <gs://路径>`
```bash
# 导出为 NDJSON 格式
bq extract \
  --destination_format=NEWLINE_DELIMITED_JSON \
  my_dataset.users \
  gs://my-bucket/exports/users.json
```

---

**基本写法：导出为 Avro**
`bq extract --destination_format=AVRO <表> <gs://路径>`
```bash
# 导出为 Avro 格式
bq extract \
  --destination_format=AVRO \
  --compression=SNAPPY \
  my_dataset.users \
  gs://my-bucket/exports/users-*.avro
```

---

**基本写法：压缩导出**
`bq extract --compression=GZIP <表> <gs://路径>`
```bash
# 导出 CSV 并使用 GZIP 压缩
bq extract \
  --compression=GZIP \
  my_dataset.users \
  gs://my-bucket/exports/users-*.csv.gz
```

---

## 流式插入

**基本写法：使用 insert 命令**
`bq insert <表> <JSON 数据>`
```bash
# 流式插入单条数据
bq insert my_dataset.users \
  '{"user_id":"u001","name":"Alice","age":30}'
```

---

**基本写法：批量插入**
`bq insert <表> <文件>`
```bash
# 从文件读取多行 JSON 插入
bq insert my_dataset.events events.ndjson
```

---

**基本写法：忽略未知字段**
`bq insert --ignore_unknown_values <表> <JSON>`
```bash
# 插入时忽略 schema 中没有的字段
bq insert --ignore_unknown_values \
  my_dataset.users \
  '{"user_id":"u002","name":"Bob","extra":"field"}'
```

---

**基本写法：模板插入**
`bq insert --template_suffix=<后缀> <模板表> <JSON>`
```bash
# 通过模板表自动创建分片表
bq insert --template_suffix=_20260731 \
  my_dataset.events_template \
  '{"event_id":"e001","type":"click"}'
```

---

## 视图与物化视图

**基本写法：创建视图**
`bq mk --view <SQL> --use_legacy_sql=false <数据集>.<视图>`
```bash
# 创建标准 SQL 视图
bq mk --view \
  --use_legacy_sql=false \
  my_dataset.active_users \
  'SELECT * FROM my_dataset.users WHERE status = "active"'
```

---

**基本写法：创建物化视图**
`bq mk --materialized_view <SQL> <数据集>.<视图>`
```bash
# 创建物化视图聚合统计
bq mk --materialized_view \
  my_dataset.user_stats \
  'SELECT user_id, COUNT(*) AS cnt FROM my_dataset.events GROUP BY user_id'
```

---

**基本写法：更新物化视图**
`bq query --use_legacy_sql=false 'ALTER MATERIALIZED VIEW <视图> SET OPTIONS(enable_refresh=true)'`
```bash
# 启用物化视图自动刷新
bq query --use_legacy_sql=false \
  'ALTER MATERIALIZED VIEW my_dataset.user_stats SET OPTIONS(enable_refresh=true, refresh_interval_minutes=30)'
```

---

**基本写法：删除视图**
`bq rm -v <视图>`
```bash
# 删除视图
bq rm -v my_dataset.active_users
```

---

## 分区表与聚簇表

**基本写法：创建分区表**
`bq mk --table --time_partitioning_type=DAY <表> <schema>`
```bash
# 按天创建分区表
bq mk --table \
  --time_partitioning_type=DAY \
  --time_partitioning_field=created_at \
  my_dataset.events \
  event_id:STRING,created_at:TIMESTAMP
```

---

**基本写法：创建聚簇表**
`bq mk --table --clustering_fields=<字段> <表> <schema>`
```bash
# 创建带聚簇列的表
bq mk --table \
  --clustering_fields=user_id,event_type \
  my_dataset.events \
  event_id:STRING,user_id:STRING,event_type:STRING,timestamp:TIMESTAMP
```

---

**基本写法：分区与聚簇组合**
`bq mk --table --time_partitioning_type=DAY --clustering_fields=<字段> <表> <schema>`
```bash
# 创建按天分区且按 user_id 聚簇的表
bq mk --table \
  --time_partitioning_type=DAY \
  --time_partitioning_field=timestamp \
  --clustering_fields=user_id \
  my_dataset.events \
  event_id:STRING,user_id:STRING,timestamp:TIMESTAMP
```

---

**基本写法：查询指定分区**
`bq query 'SELECT * FROM <表> WHERE <分区过滤>'`
```bash
# 仅查询 2026 年 7 月 31 日数据
bq query --use_legacy_sql=false \
  'SELECT * FROM my_dataset.events WHERE DATE(timestamp) = "2026-07-31"'
```

---

## 数据处理与转换

**基本写法：使用 BigQuery ML 训练模型**
`bq query 'CREATE MODEL <模型> OPTIONS(...) AS SELECT ...'`
```bash
# 训练逻辑回归模型
bq query --use_legacy_sql=false '
  CREATE OR REPLACE MODEL my_dataset.user_churn_model
  OPTIONS(model_type="logistic_reg", input_label_cols=["churned"]) AS
  SELECT * FROM my_dataset.user_features
'
```

---

**基本写法：使用模型预测**
`bq query 'SELECT * FROM ML.PREDICT(MODEL <模型>, ...)'`
```bash
# 使用模型预测
bq query --use_legacy_sql=false '
  SELECT * FROM ML.PREDICT(MODEL my_dataset.user_churn_model,
    (SELECT * FROM my_dataset.new_users))
'
```

---

**基本写法：执行 DML 更新**
`bq query 'UPDATE <表> SET ... WHERE ...'`
```bash
# 批量更新数据
bq query --use_legacy_sql=false '
  UPDATE my_dataset.users
  SET status = "inactive"
  WHERE last_login < TIMESTAMP("2025-01-01")
'
```

---

**基本写法：删除数据**
`bq query 'DELETE FROM <表> WHERE ...'`
```bash
# 删除满足条件的数据
bq query --use_legacy_sql=false '
  DELETE FROM my_dataset.users
  WHERE status = "deleted"
'
```

---

## 调度与作业

**基本写法：列出作业**
`bq ls -j`
```bash
# 列出最近的作业
bq ls -j -n 20
```

---

**基本写法：查看作业详情**
`bq show -j <作业ID>`
```bash
# 查看指定作业状态
bq show -j job_1234567890
```

---

**基本写法：取消作业**
`bq cancel <作业ID>`
```bash
# 取消运行中的查询作业
bq cancel job_1234567890
```

---

**基本写法：创建定时查询**
`bq query --schedule='every 24 hours' --destination_table=<表> <SQL>`
```bash
# 每天定时执行汇总查询
bq query \
  --schedule='every 24 hours' \
  --destination_table=my_dataset.daily_stats \
  --use_legacy_sql=false \
  'SELECT DATE(timestamp) AS day, COUNT(*) AS cnt FROM my_dataset.events GROUP BY day'
```

---

**基本写法：列出定时查询**
`bq ls --transfer_config`
```bash
# 列出所有定时查询配置
bq ls --transfer_config --transfer_location=us
```

---

## 权限与共享

**基本写法：添加表权限**
`bq add-iam-policy-binding <表> --role=<角色> --member=<成员>`
```bash
# 授予用户表查询权限
bq add-iam-policy-binding \
  my_dataset.users \
  --role=roles/bigquery.dataViewer \
  --member=user:alice@example.com
```

---

**基本写法：移除表权限**
`bq remove-iam-policy-binding <表> --role=<角色> --member=<成员>`
```bash
# 移除用户表权限
bq remove-iam-policy-binding \
  my_dataset.users \
  --role=roles/bigquery.dataViewer \
  --member=user:alice@example.com
```

---

**基本写法：授权数据集访问**
`bq update --source <文件> <数据集>`
```json
{
  "access": [
    {"role": "READER", "userByEmail": "alice@example.com"},
    {"role": "WRITER", "groupBy": "data-team@example.com"}
  ]
}
```

---

**基本写法：授权视图共享**
`bq update --view <SQL> <数据集>.<视图>`
```bash
# 更新视图并配置授权
bq update \
  --view 'SELECT user_id, name FROM my_dataset.users' \
  --use_legacy_sql=false \
  my_dataset.public_users
```

---

## 计费与优化

**基本写法：查询字节数预估**
`bq query --dry_run <SQL>`
```bash
# 干运行估算查询字节数
bq query --dry_run --use_legacy_sql=false \
  'SELECT * FROM my_dataset.events WHERE DATE(timestamp) = "2026-07-31"'
```

---

**基本写法：设置最大字节**
`bq query --maximum_bytes_billed=<字节> <SQL>`
```bash
# 限制查询最大字节数
bq query \
  --maximum_bytes_billed=1000000000 \
  --use_legacy_sql=false \
  'SELECT * FROM my_dataset.events'
```

---

**基本写法：查看表存储统计**
`bq show --format=prettyjson <表>`
```bash
# 查看表存储大小与统计
bq show --format=prettyjson my_dataset.events
```

---

**基本写法：设置表过期**
`bq update --expiration <秒> <表>`
```bash
# 设置表 30 天后过期
bq update --expiration 2592000 my_dataset.temp_data
```

---

## 跨云与外部数据

**基本写法：创建外部表**
`bq mk --external_table_definition=<定义> <表>`
```bash
# 创建映射到 GCS 的外部表
bq mk --external_table_definition='gs://my-bucket/data/*.csv@CSV=user_id:STRING,name:STRING' \
  my_dataset.external_users
```

---

**基本写法：查询 Cloud SQL**
`bq query 'SELECT * FROM EXTERNAL_QUERY("<连接>")'`
```bash
# 通过联邦查询 Cloud SQL
bq query --use_legacy_sql=false '
  SELECT * FROM EXTERNAL_QUERY("my-project.us.cloudsql-connection")
'
```

---

**基本写法：BigLake 表**
`bq mk --table --table_type=EXTERNAL --format=PARQUET <表> <gs://路径>`
```bash
# 创建 BigLake 表查询 GCS Parquet
bq mk --table \
  --table_type=EXTERNAL \
  --format=PARQUET \
  --source_uris=gs://my-bucket/data/*.parquet \
  my_dataset.biglake_table
```

---

**基本写法：导出到 BigQuery Studio**
`bq query --destination_table=<表> --overwrite_table <SQL>`
```bash
# 覆盖写结果到新表供 Studio 分析
bq query \
  --destination_table=my_dataset.analysis \
  --overwrite_table \
  --use_legacy_sql=false \
  'SELECT * FROM my_dataset.users WHERE age > 18'
```
