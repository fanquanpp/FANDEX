---
order: 450
title: AWS RDS 数据库命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'RDS 命令实战：实例创建与配置、快照恢复、参数组、Aurora 集群与只读副本。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 实例创建与查看

**基本写法：查看可用数据库引擎**
`aws rds describe-db-engine-versions`
```bash
# 列出所有数据库引擎及版本
aws rds describe-db-engine-versions
```

---

**基本写法：查看 MySQL 引擎版本**
`aws rds describe-db-engine-versions --engine mysql`
```bash
# 查看 MySQL 引擎的所有可用版本
aws rds describe-db-engine-versions --engine mysql
```

---

**基本写法：创建 RDS 实例**
`aws rds create-db-instance --db-instance-identifier <实例ID> --db-instance-class <实例类> --engine <引擎> --master-username <用户> --master-user-password <密码> --allocated-storage <GB>`
```bash
# 创建 MySQL 8.0 实例
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password 'MyStrongPass123!' \
  --allocated-storage 20
```

---

**基本写法：列出所有 RDS 实例**
`aws rds describe-db-instances [--db-instance-identifier <实例ID>]`
```bash
# 查看账户下所有 RDS 实例
aws rds describe-db-instances
```

---

**基本写法：查看实例详情**
`aws rds describe-db-instances --db-instance-identifier <实例ID>`
```bash
# 查看指定实例详情
aws rds describe-db-instances --db-instance-identifier mydb
```

---

**基本写法：删除实例**
`aws rds delete-db-instance --db-instance-identifier <实例ID> [--skip-final-snapshot]`
```bash
# 删除实例但不保留最终快照
aws rds delete-db-instance --db-instance-identifier mydb --skip-final-snapshot
```

---

## 实例配置管理

**基本写法：修改实例规格**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --db-instance-class <实例类> --apply-immediately`
```bash
# 立即将实例规格升级到 t3.medium
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.medium \
  --apply-immediately
```

---

**基本写法：扩容存储**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --allocated-storage <GB> --apply-immediately`
```bash
# 扩容存储至 100GB
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --allocated-storage 100 \
  --apply-immediately
```

---

**基本写法：修改参数组**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --db-parameter-group-name <参数组>`
```bash
# 应用新的参数组
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-parameter-group-name myparamgroup \
  --apply-immediately
```

---

**基本写法：重启实例**
`aws rds reboot-db-instance --db-instance-identifier <实例ID>`
```bash
# 重启 RDS 实例
aws rds reboot-db-instance --db-instance-identifier mydb
```

---

**基本写法：查看实例状态**
`aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]'`
```bash
# 列出实例名与状态
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' \
  --output table
```

---

## 快照管理

**基本写法：创建手动快照**
`aws rds create-db-snapshot --db-instance-identifier <实例ID> --db-snapshot-identifier <快照名>`
```bash
# 为 mydb 实例创建手动快照
aws rds create-db-snapshot \
  --db-instance-identifier mydb \
  --db-snapshot-identifier mydb-snapshot-20260731
```

---

**基本写法：列出快照**
`aws rds describe-db-snapshots [--db-instance-identifier <实例ID>]`
```bash
# 列出所有手动快照
aws rds describe-db-snapshots --snapshot-type manual
```

---

**基本写法：从快照还原实例**
`aws rds restore-db-instance-from-db-snapshot --db-instance-identifier <新实例ID> --db-snapshot-identifier <快照名>`
```bash
# 从快照还原为新实例
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-restored \
  --db-snapshot-identifier mydb-snapshot-20260731
```

---

**基本写法：删除快照**
`aws rds delete-db-snapshot --db-snapshot-identifier <快照名>`
```bash
# 删除指定快照
aws rds delete-db-snapshot --db-snapshot-identifier mydb-snapshot-20260731
```

---

**基本写法：将快照复制到另一区域**
`aws rds copy-db-snapshot --source-db-snapshot-identifier <源ARN> --target-db-snapshot-identifier <目标快照名>`
```bash
# 跨区域复制快照用于灾备
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:mydb-snapshot \
  --target-db-snapshot-identifier mydb-snapshot-copy \
  --region us-west-2
```

---

## 安全组与子网

**基本写法：修改安全组**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --vpc-security-group-ids <安全组ID>`
```bash
# 修改实例所属 VPC 安全组
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --vpc-security-group-ids sg-12345678 \
  --apply-immediately
```

---

**基本写法：查看子网组**
`aws rds describe-db-subnet-groups`
```bash
# 列出所有 DB 子网组
aws rds describe-db-subnet-groups
```

---

**基本写法：创建子网组**
`aws rds create-db-subnet-group --db-subnet-group-name <组名> --db-subnet-group-description <描述> --subnet-ids <子网ID列表>`
```bash
# 创建 DB 子网组关联多个子网
aws rds create-db-subnet-group \
  --db-subnet-group-name my-subnet-group \
  --db-subnet-group-description "my subnet group" \
  --subnet-ids subnet-abc subnet-def subnet-ghi
```

---

**基本写法：查看安全组**
`aws ec2 describe-security-groups --group-ids <安全组ID>`
```bash
# 查看安全组规则
aws ec2 describe-security-groups --group-ids sg-12345678
```

---

## 参数组管理

**基本写法：创建参数组**
`aws rds create-db-parameter-group --db-parameter-group-name <组名> --db-parameter-group-family <家族> --description <描述>`
```bash
# 创建 MySQL 8.0 参数组
aws rds create-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --db-parameter-group-family mysql8.0 \
  --description "My custom MySQL params"
```

---

**基本写法：修改参数**
`aws rds modify-db-parameter-group --db-parameter-group-name <组名> --parameters <参数列表>`
```bash
# 修改 max_connections 与 time_zone
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --parameters "ParameterName=max_connections,ParameterValue=500,ApplyMethod=immediate" \
               "ParameterName=time_zone,ParameterValue=Asia/Shanghai,ApplyMethod=pending-reboot"
```

---

**基本写法：查看参数组详情**
`aws rds describe-db-parameters --db-parameter-group-name <组名>`
```bash
# 查看参数组中所有参数
aws rds describe-db-parameters --db-parameter-group-name my-param-group
```

---

**基本写法：删除参数组**
`aws rds delete-db-parameter-group --db-parameter-group-name <组名>`
```bash
# 删除未被使用的参数组
aws rds delete-db-parameter-group --db-parameter-group-name my-param-group
```

---

## Aurora 集群

**基本写法：创建 Aurora 集群**
`aws rds create-db-cluster --db-cluster-identifier <集群ID> --engine aurora-mysql --master-username <用户> --master-user-password <密码>`
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
```

---

**基本写法：创建集群实例**
`aws rds create-db-instance --db-instance-identifier <实例ID> --db-instance-class <类> --engine aurora-mysql --db-cluster-identifier <集群ID>`
```bash
# 为 Aurora 集群添加实例
aws rds create-db-instance \
  --db-instance-identifier my-cluster-instance-1 \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql \
  --db-cluster-identifier my-cluster
```

---

**基本写法：故障转移集群**
`aws rds failover-db-cluster --db-cluster-identifier <集群ID> --target-db-instance-identifier <目标实例>`
```bash
# 手动故障转移到指定实例
aws rds failover-db-cluster \
  --db-cluster-identifier my-cluster \
  --target-db-instance-identifier my-cluster-instance-2
```

---

**基本写法：删除集群**
`aws rds delete-db-cluster --db-cluster-identifier <集群ID> --skip-final-snapshot`
```bash
# 删除 Aurora 集群及其实例
aws rds delete-db-cluster \
  --db-cluster-identifier my-cluster \
  --skip-final-snapshot
```

---

## 事件与日志

**基本写法：查看事件**
`aws rds describe-events [--source-identifier <资源ID>] [--source-type <类型>]`
```bash
# 查看指定实例最近 1 小时事件
aws rds describe-events \
  --source-identifier mydb \
  --source-type db-instance \
  --duration 60
```

---

**基本写法：查看事件订阅**
`aws rds describe-event-subscriptions`
```bash
# 列出所有事件订阅
aws rds describe-event-subscriptions
```

---

**基本写法：创建事件订阅**
`aws rds create-event-subscription --subscription-name <订阅名> --source-type <类型> --event-categories <分类> --sns-topic-arn <SNS ARN>`
```bash
# 订阅实例故障事件
aws rds create-event-subscription \
  --subscription-name my-failure-sub \
  --source-type db-instance \
  --event-categories failure \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:rds-events
```

---

**基本写法：下载日志文件**
`aws rds download-db-log-file-portion --db-instance-identifier <实例ID> --log-file-name <文件名> --output text`
```bash
# 下载 error.log 日志到本地
aws rds download-db-log-file-portion \
  --db-instance-identifier mydb \
  --log-file-name error/mysql-error-running.log \
  --output text > error.log
```

---

## 多可用区与只读副本

**基本写法：开启多可用区**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --multi-az --apply-immediately`
```bash
# 为实例开启多 AZ 高可用
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --multi-az \
  --apply-immediately
```

---

**基本写法：创建只读副本**
`aws rds create-db-instance-read-replica --db-instance-identifier <副本ID> --source-db-instance-identifier <源实例>`
```bash
# 从主实例创建只读副本
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-read-replica \
  --source-db-instance-identifier mydb \
  --db-instance-class db.t3.micro
```

---

**基本写法：将只读副本提升为主实例**
`aws rds promote-read-replica --db-instance-identifier <副本ID>`
```bash
# 提升只读副本为独立主实例
aws rds promote-read-replica --db-instance-identifier mydb-read-replica
```

---

**基本写法：跨区域只读副本**
`aws rds create-db-instance-read-replica --db-instance-identifier <副本ID> --source-db-instance-identifier <源ARN> --region <区域>`
```bash
# 创建跨区域只读副本用于灾备
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-dr \
  --source-db-instance-identifier arn:aws:rds:us-east-1:123456789012:db:mydb \
  --region us-west-2
```

---

## 备份与维护

**基本写法：修改备份保留期**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --backup-retention-period <天>`
```bash
# 设置自动备份保留 14 天
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --backup-retention-period 14 \
  --apply-immediately
```

---

**基本写法：设置维护窗口**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --preferred-maintenance-window <窗口>`
```bash
# 设置每周日凌晨维护窗口
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --preferred-maintenance-window sun:03:00-sun:05:00
```

---

**基本写法：立即应用待处理修改**
`aws rds apply-pending-maintenance-action --resource-id <资源ID> --apply-action <动作> --opt-in-type immediate`
```bash
# 立即应用待处理的 OS 更新
aws rds apply-pending-maintenance-action \
  --resource-id db:mydb \
  --apply-action system-update \
  --opt-in-type immediate
```

---

**基本写法：查看待处理维护动作**
`aws rds describe-pending-maintenance-actions`
```bash
# 列出所有待处理的维护动作
aws rds describe-pending-maintenance-actions
```

---

## Performance Insights

**基本写法：开启 Performance Insights**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --enable-performance-insights --performance-insights-retention-period <天>`
```bash
# 开启 PI 并保留 7 天数据
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

---

**基本写法：获取性能指标**
`aws pi get-resource-metrics --service-type RDS --identifier <实例ID> --metric-queries <指标> --start-time <开始> --end-time <结束>`
```bash
# 查询数据库负载指标
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier db-mydb \
  --metric-queries '[{"Metric":"db.load.avg","GroupBy":{"Group":"db.sql"}}]' \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period-in-seconds 300
```

---

**基本写法：关闭 Performance Insights**
`aws rds modify-db-instance --db-instance-identifier <实例ID> --no-enable-performance-insights --apply-immediately`
```bash
# 关闭 PI 节省成本
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --no-enable-performance-insights \
  --apply-immediately
```
