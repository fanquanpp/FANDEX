---
order: 450
title: AWS RDS 数据库命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'RDS 学习笔记：把应用数据库搬到托管实例上——创建、连接、调参、高可用、备份还原与 Aurora 的完整路径。'
author: fanquanpp
updated: '2026-09-29'
related:
  - 'cloud-computing/200-CloudDatabaseService'
  - 'cloud-computing/460-AWSVPCCommands'
  - 'cloud-computing/300-AWSCliConfigure'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
  - 'cloud-computing/200-CloudDatabaseService'
---

## 场景

你的应用原来把 MySQL 装在 EC2 上，每周自己备份、打补丁、担心磁盘写满。现在想换成 RDS（Amazon 关系型数据库服务）：主备切换、自动备份、监控这些脏活交给 AWS。目标是一步步把库建起来、连上应用、再配上高可用和备份策略。

前提：已安装并配置 AWS CLI（见 [AWS CLI 配置](/cloud-computing/300-AWSCliConfigure)），且决定让数据库跑在与应用同一个 VPC 里（网络细节见 [AWS VPC 命令](/cloud-computing/460-AWSVPCCommands)）。

## 第一步：选引擎和版本

```bash
# 列出所有支持的数据库引擎及版本
aws rds describe-db-engine-versions

# 只看 MySQL 有哪些版本
aws rds describe-db-engine-versions --engine mysql
```

版本选择的现实规则：跟紧次要版本（如 MySQL 8.0.x 的最新几个），但不要追大版本首发——新大版本（如 8.4 → 9.x）生态兼容要等 ORM 驱动跟进。你的应用怎么连库不重要，RDS 对外就是一个标准 MySQL 协议的端点。

## 第二步：创建实例

一个能被应用连上的 RDS 实例，由四块东西组成：实例（计算 + 存储）、子网组（决定放哪个网络）、安全组（谁能连）、参数组（数据库参数）。前三步按顺序做：

```bash
# 1. 创建 DB 子网组：至少跨两个可用区的子网（高可用的前提）
aws rds create-db-subnet-group \
  --db-subnet-group-name my-subnet-group \
  --db-subnet-group-description "my subnet group" \
  --subnet-ids subnet-abc subnet-def subnet-ghi

# 确认已有哪些子网组
aws rds describe-db-subnet-groups
```

```bash
# 2. 创建 MySQL 实例（生产至少 db.t3.medium 起步，db.t3.micro 只适合练手）
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.42 \
  --master-username admin \
  --master-user-password 'MyStrongPass123!' \
  --allocated-storage 20
```

创建要几分钟，实例状态会经历 `creating` → `available`。查看进度：

```bash
# 列出实例名与状态
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' \
  --output table

# 查看单个实例详情（端点地址在这里）
aws rds describe-db-instances --db-instance-identifier mydb

# 顺手看安全组规则是否放通了 3306
aws ec2 describe-security-groups --group-ids sg-12345678
```

```bash
# 3. 把安全组挂到实例上（控制哪些客户端能连）
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --vpc-security-group-ids sg-12345678 \
  --apply-immediately
```

连上之后，应用配置里写的是 `Endpoint` 字段的地址（形如 `mydb.xxxx.region.rds.amazonaws.com`），不要写 IP。

### 为什么参数要用命令行传密码

上面 `--master-user-password` 直接出现在命令里会进 shell 历史。真实操作建议用 `--generate-cli-skeleton` 生成 JSON 参数文件、或从 Secrets Manager 取值——至少做到**别把它提交进 Git**。这个习惯比任何单条命令都重要。

## 第三步：调数据库参数

RDS 不让你改配置文件，改参数走参数组。思路是：建一个自定义参数组 → 改参数 → 挂到实例上 → 需要时重启生效。

```bash
# 创建 MySQL 8.0 家族的参数组（family 必须匹配引擎版本）
aws rds create-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --db-parameter-group-family mysql8.0 \
  --description "My custom MySQL params"

# 修改参数：注意 ApplyMethod 决定生效方式
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --parameters "ParameterName=max_connections,ParameterValue=500,ApplyMethod=immediate" \
               "ParameterName=time_zone,ParameterValue=Asia/Shanghai,ApplyMethod=pending-reboot"

# 应用参数组到实例
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-parameter-group-name myparamgroup \
  --apply-immediately

# 查看参数组里的参数与生效状态
aws rds describe-db-parameters --db-parameter-group-name my-param-group

# pending-reboot 的参数需要重启
aws rds reboot-db-instance --db-instance-identifier mydb

# 删除不再使用的参数组
aws rds delete-db-parameter-group --db-parameter-group-name my-param-group
```

为什么分两种 ApplyMethod：`immediate` 对动态参数立即生效，不打扰业务；`pending-reboot` 针对 static 参数（改了必须重启进程才有效）。`max_connections` 这类改小可能踢掉现有连接的参数，挑流量低谷操作。

## 第四步：高可用——Multi-AZ 与只读副本

这是 RDS 相对自建数据库最值钱的部分，两种机制解决两个不同问题：

| 机制 | 解决什么 | 对应用可见性 |
| :--- | :--- | :--- |
| Multi-AZ（同步复制） | 主库所在可用区故障时自动切换 | 端点地址不变，切换期间短暂断连 |
| 只读副本（异步复制） | 读流量分流、报表查询隔离 | 需要单独连接副本端点 |

```bash
# 开 Multi-AZ（生产默认要开）
aws rds modify-db-instance --db-instance-identifier mydb --multi-az --apply-immediately

# 加只读副本
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-read-replica \
  --source-db-instance-identifier mydb \
  --db-instance-class db.t3.micro

# 极端情况：把只读副本提升为独立主实例（不可逆，副本脱离复制）
aws rds promote-read-replica --db-instance-identifier mydb-read-replica

# 灾备：在另一个区域建只读副本
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-dr \
  --source-db-instance-identifier arn:aws:rds:us-east-1:123456789012:db:mydb \
  --region us-west-2
```

坑点：只读副本是异步复制，主从延迟存在；把"读己之写"的请求路由到副本会出现数据不一致，应用侧要区分读写端点。

## 第五步：备份与恢复

RDS 的备份分两层，恢复方式不同：

- **自动备份**：按保留期自动打快照 + 记录 binlog，支持恢复到任意时间点（PITR）。
- **手动快照**：你主动创建、永不自动过期（也意味着一直占钱）。

```bash
# 手动快照
aws rds create-db-snapshot \
  --db-instance-identifier mydb \
  --db-snapshot-identifier mydb-snapshot-20260731

# 列出手动快照
aws rds describe-db-snapshots --snapshot-type manual

# 自动备份保留 14 天
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --backup-retention-period 14 \
  --apply-immediately

# 灾备：把快照复制到另一区域（跨区域复制必须用源快照的完整 ARN）
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:mydb-snapshot \
  --target-db-snapshot-identifier mydb-snapshot-copy \
  --region us-west-2

# 从快照恢复：注意——恢复出来的是一个"新实例"，端点是新的
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-restored \
  --db-snapshot-identifier mydb-snapshot-20260731

# 删除快照（删除实例的最终快照同理）
aws rds delete-db-snapshot --db-snapshot-identifier mydb-snapshot-20260731
```

恢复演练是自检题：不演练的备份等于没有备份。季度性做一次"从快照恢复到临时实例 → 跑数据校验 → 删除临时实例"的完整流程。

## 第六步：维护窗口与事件订阅

RDS 会定期做引擎小版本升级和 OS 补丁，你要控制"什么时候能动我"：

```bash
# 设置维护窗口（UTC 时间，避开业务高峰）
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --preferred-maintenance-window sun:03:00-sun:05:00

# 看有哪些待处理的维护动作（引擎补丁、OS 更新）
aws rds describe-pending-maintenance-actions

# 决定立即应用某个维护动作
aws rds apply-pending-maintenance-action \
  --resource-id db:mydb \
  --apply-action system-update \
  --opt-in-type immediate
```

被动等维护不如主动订阅事件。事件走 SNS 主题推送（邮件/短信/回调都能接）：

```bash
# 订阅实例故障类事件
aws rds create-event-subscription \
  --subscription-name my-failure-sub \
  --source-type db-instance \
  --event-categories failure \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events

# 查看已有哪些订阅
aws rds describe-event-subscriptions

# 临时查最近 1 小时的事件（排障时用）
aws rds describe-events \
  --source-identifier mydb \
  --source-type db-instance \
  --duration 60

# 拉取数据库错误日志
aws rds download-db-log-file-portion \
  --db-instance-identifier mydb \
  --log-file-name error/mysql-error-running.log \
  --output text > error.log
```

## 第七步：性能排查（Performance Insights）

慢查询定位开 Performance Insights：它按 SQL 语句聚合数据库负载（DB load），直接告诉你"哪条 SQL 吃掉了最多的数据库时间"。

```bash
# 开启 PI，保留 7 天（免费档）
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately

# 查询按 SQL 分组的负载指标
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier db-mydb \
  --metric-queries '[{"Metric":"db.load.avg","GroupBy":{"Group":"db.sql"}}]' \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period-in-seconds 300

# 不需要时关掉省成本（保留期更长的档位按量收费）
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --no-enable-performance-insights \
  --apply-immediately
```

## 进阶：Aurora 集群

如果规模到了或要求更高可用，Aurora（AWS 兼容 MySQL/PostgreSQL 协议的自研引擎）是升级路径。与普通 RDS 的结构差异：先建**集群**（共享一套分布式存储），再往集群里加**实例**（一个写节点 + 若干读节点），切换走集群端点。

```bash
# 创建 Aurora MySQL 集群
aws rds create-db-cluster \
  --db-cluster-identifier my-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.0 \
  --master-username admin \
  --master-user-password 'MyStrongPass123!' \
  --database-name mydb \
  --backup-retention-period 7

# 给集群添加实例（写节点或读节点）
aws rds create-db-instance \
  --db-instance-identifier my-cluster-instance-1 \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql \
  --db-cluster-identifier my-cluster

# 手动演练一次故障转移（定期演练，别等真故障）
aws rds failover-db-cluster \
  --db-cluster-identifier my-cluster \
  --target-db-instance-identifier my-cluster-instance-2

# 删除集群（先删实例再删集群，或加 --skip-final-snapshot）
aws rds delete-db-cluster \
  --db-cluster-identifier my-cluster \
  --skip-final-snapshot
```

选型直觉：流量不大、要省钱，普通 RDS Multi-AZ 够用；写入吞吐大、读扩展节点多、要秒级故障切换，才值得换 Aurora（Aurora 存储按用量计费但单价更高）。

## 日常运维命令速记

规格与存储变更是最常见的两类修改，`--apply-immediately` 与否的区别要牢记：不加则等到下一个维护窗口，加了则立刻执行（规格变更会有数分钟不可用）。

```bash
# 升配到 t3.medium
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.medium \
  --apply-immediately

# 存储扩到 100GB（RDS 只能扩不能缩，扩容过程通常不中断）
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --allocated-storage 100 \
  --apply-immediately

# 删除实例（生产环境强烈建议保留最终快照，去掉 --skip-final-snapshot）
aws rds delete-db-instance --db-instance-identifier mydb --skip-final-snapshot
```

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| `--apply-immediately` 当成默认习惯 | 规格变更在业务高峰执行 | 无紧急需求就让改动排队到维护窗口 |
| 密码出现在 shell 历史/Git 里 | 凭证泄漏 | 用参数文件或 Secrets Manager |
| 恢复快照后连旧端点 | 应用连的还是故障实例 | 恢复 = 新实例新端点，需要改连接配置 |
| 读请求打到只读副本出现"读不到刚写的数据" | 复制延迟 | 读写分离时区分一致性要求 |
| 删除实例忘了最终快照 | 数据彻底消失 | 删除时保留 final snapshot，名字带日期 |
| 只扩不缩的存储 | 存储费用只涨不降 | 初期留合理余量，靠监控触发扩容 |
| 存储自动扩容没开（Storage Autoscaling） | 磁盘告警半夜响 | 创建时开启 storage autoscaling |

## 自检

1. 实例状态卡在 `modifying` 很久，你怎么判断它是排队等维护窗口还是正在执行？
2. Multi-AZ 和只读副本复制方式的本质区别是什么？分别对应什么故障场景？
3. 从快照恢复后应用的连接串需要改哪些内容？

## 练习

1. 创建一个 db.t3.micro 的 MySQL 实例，改一个 immediate 参数和一个 pending-reboot 参数，观察两者生效路径的差异。
2. 开 Multi-AZ 后手动 reboot 实例，用 `describe-events` 观察切换过程的时间线。
3. 打一个手动快照，恢复成新实例并连上去验证数据，完成后清理全部资源，最后核对账单里没留"孤儿快照"。

## 下一步

- 网络先行：子网和安全组设计见 [AWS VPC 命令](/cloud-computing/460-AWSVPCCommands)。
- 监控整合：RDS 指标进 CloudWatch 的告警实践见 [AWS CloudWatch](/cloud-computing/440-AWSCloudWatch)。
- 数据库选型横向对比（RDS/Aurora/DynamoDB）见 [云数据库服务](/cloud-computing/200-CloudDatabaseService)。
