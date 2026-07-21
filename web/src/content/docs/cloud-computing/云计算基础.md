---
order: 1
title: 云计算基础
module: 'cloud-computing'
category: 云计算
difficulty: beginner
description: 云计算概念与演进、服务模型、部署模型、高可用架构设计、负载均衡配置、弹性伸缩策略与云成本优化。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/云网络与存储'
  - 'cloud-computing/容器与编排'
prerequisites: []
---

## 1. 云计算概念与演进

### 1.1 什么是云计算

云计算是通过互联网按需提供**计算资源（服务器、存储、数据库、网络、软件）**的技术模式，核心特征是按需自助、广泛的网络接入、资源池化、快速弹性和可计量服务。

### 1.2 发展历程

| 阶段           | 时间      | 特点                     | 代表           |
| :------------- | :-------- | :----------------------- | :------------- |
| **大型机时代** | 1960s     | 集中计算、分时共享       | IBM System/360 |
| **PC 时代**    | 1980s-90s | 分布式计算、客户端服务器 | PC 局域网      |
| **网格计算**   | 2000s 初  | 跨组织资源共享           | SETI@home      |
| **云计算兴起** | 2006      | AWS 发布，按需付费       | AWS EC2        |
| **云原生时代** | 2015+     | 容器化、微服务、DevOps   | Kubernetes     |
| **智能云**     | 2023+     | AI + 云、Serverless      | AI 云服务      |

### 1.3 云计算核心特征

| 特征             | 说明                           |
| :--------------- | :----------------------------- |
| **按需自助服务** | 用户自行申请资源，无需人工干预 |
| **广泛网络接入** | 通过网络标准机制访问           |
| **资源池化**     | 多租户共享物理资源，动态分配   |
| **快速弹性**     | 资源可快速扩缩容，按需自动调整 |
| **可计量服务**   | 资源使用可监控、可计量、可计费 |

## 2. 服务模型

### 2.1 三种服务模型

```
┌──────────────────────────────────────────────────────┐
│  SaaS (软件即服务)                                    │
│  完整应用：Gmail、Salesforce、钉钉                     │
├──────────────────────────────────────────────────────┤
│  PaaS (平台即服务)                                    │
│  运行环境：Heroku、Cloud Run、函数计算                  │
├──────────────────────────────────────────────────────┤
│  IaaS (基础设施即服务)                                │
│  虚拟机/网络：AWS EC2、阿里云 ECS                       │
├──────────────────────────────────────────────────────┤
│  物理硬件（数据中心）                                  │
└──────────────────────────────────────────────────────┘
```

### 2.2 服务模型对比

| 维度         | IaaS               | PaaS           | SaaS       |
| :----------- | :----------------- | :------------- | :--------- |
| **你管理**   | 应用、数据、运行时 | 应用、数据     | 几乎不需要 |
| **云商管理** | OS、中间件、运行时 | OS、中间件     | 全部       |
| **灵活性**   | 最高               | 中等           | 最低       |
| **运维负担** | 最重               | 中等           | 最轻       |
| **典型产品** | EC2、ECS           | Cloud Run、SAE | 钉钉、飞书 |
| **适用场景** | 定制化基础设施     | 应用快速部署   | 即开即用   |

## 3. 部署模型

### 3.1 四种部署模型

| 模型       | 说明                       | 优势           | 劣势           |
| :--------- | :------------------------- | :------------- | :------------- |
| **公有云** | 第三方云商提供，多租户共享 | 低成本、弹性好 | 安全合规顾虑   |
| **私有云** | 企业自建或托管，独享资源   | 安全可控       | 成本高、弹性差 |
| **混合云** | 公有云 + 私有云组合        | 灵活平衡       | 架构复杂       |
| **多云**   | 使用多个云服务商           | 避免锁定       | 管理复杂       |

### 3.2 混合云架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   私有云     │ ←→  │   混合云网关  │ ←→  │   公有云     │
│ 核心业务     │     │  专线/VPN    │     │ 弹性业务     │
│ 敏感数据     │     │  数据同步    │     │ 大数据分析   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3.3 主流云服务商

| 云商       | 优势                | 代表产品                |
| :--------- | :------------------ | :---------------------- |
| **AWS**    | 生态最全、全球覆盖  | EC2、S3、Lambda         |
| **Azure**  | 企业集成、混合云    | VM、Blob、Functions     |
| **GCP**    | 大数据/AI、K8s 原生 | GCE、GCS、Cloud Run     |
| **阿里云** | 国内领先、生态完善  | ECS、OSS、函数计算      |
| **腾讯云** | 游戏社交、音视频    | CVM、COS、SCF           |
| **华为云** | 政企市场、AI        | ECS、OBS、FunctionGraph |

## 4. 高可用架构设计

### 4.1 高可用核心指标

| 指标        | 计算方式    | 年停机时间 |
| :---------- | :---------- | :--------- |
| **99%**     | 1 - 0.99    | 87.6 小时  |
| **99.9%**   | 1 - 0.999   | 8.76 小时  |
| **99.99%**  | 1 - 0.9999  | 52.6 分钟  |
| **99.999%** | 1 - 0.99999 | 5.26 分钟  |

### 4.2 多可用区架构

```
┌──────────────────────────────────────────────────────┐
│                     Region（区域）                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │  AZ-a        │  │  AZ-b        │  │  AZ-c        ││
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ ││
│  │ │ 实例 x2  │ │  │ │ 实例 x2  │ │  │ │ 实例 x2  │ ││
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ ││
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ ││
│  │ │ RDS 主   │ │  │ │ RDS 从   │ │  │ │ RDS 从   │ ││
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└──────────────────────────────────────────────────────┘
```

### 4.3 高可用设计原则

| 原则             | 实践                       |
| :--------------- | :------------------------- |
| **消除单点故障** | 多实例、多可用区部署       |
| **故障检测**     | 健康检查、心跳检测         |
| **自动恢复**     | 自动重启、自动替换故障实例 |
| **数据冗余**     | 多副本、跨区域备份         |
| **优雅降级**     | 核心功能优先，非核心可降级 |
| **限流熔断**     | 防止级联故障               |

## 5. 负载均衡配置

### 5.1 负载均衡类型

| 类型            | OSI 层 | 特点                      | 适用场景      |
| :-------------- | :----- | :------------------------ | :------------ |
| **L4 负载均衡** | 传输层 | 基于 IP+端口转发          | TCP/UDP 服务  |
| **L7 负载均衡** | 应用层 | 基于 HTTP 头/URL/内容转发 | Web 应用、API |

### 5.2 负载均衡算法

| 算法            | 说明                     | 适用场景       |
| :-------------- | :----------------------- | :------------- |
| **轮询**        | 依次分配请求             | 服务器性能一致 |
| **加权轮询**    | 按权重比例分配           | 服务器性能不同 |
| **最少连接**    | 分配给连接数最少的服务器 | 长连接服务     |
| **IP Hash**     | 同一 IP 分配到同一服务器 | 会话保持       |
| **一致性 Hash** | 减少节点变化时的请求迁移 | 缓存服务       |

### 5.3 Nginx 负载均衡配置

```nginx
# nginx.conf
upstream backend {
    # 加权轮询
    server 10.0.1.1:8080 weight=3;
    server 10.0.1.2:8080 weight=2;
    server 10.0.1.3:8080 weight=1;

    # 健康检查
    # server 10.0.1.4:8080 backup;  # 备用服务器

    keepalive 32;  # 长连接数
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 连接超时
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # 健康检查端点
    location /health {
        access_log off;
        return 200 "OK";
    }
}
```

### 5.4 云负载均衡配置（阿里云 SLB）

```bash
# 使用阿里云 CLI 创建负载均衡
aliyun slb CreateLoadBalancer \
  --RegionId cn-hangzhou \
  --LoadBalancerName web-slb \
  --AddressType internet \
  --InternetChargeType paybytraffic

# 添加后端服务器
aliyun slb AddBackendServers \
  --LoadBalancerId lb-xxx \
  --BackendServers '[{"ServerId":"i-xxx1","Weight":"100"},{"ServerId":"i-xxx2","Weight":"100"}]'

# 创建监听
aliyun slb CreateLoadBalancerHTTPListener \
  --LoadBalancerId lb-xxx \
  --ListenerPort 80 \
  --BackendServerPort 8080 \
  --HealthCheckURI /health \
  --HealthCheckInterval 5
```

## 6. 弹性伸缩策略

### 6.1 伸缩模式

| 模式         | 触发方式       | 适用场景           |
| :----------- | :------------- | :----------------- |
| **定时伸缩** | 定时任务触发   | 可预测的周期性流量 |
| **动态伸缩** | 监控指标触发   | 不可预测的突发流量 |
| **固定数量** | 保持固定实例数 | 稳定业务           |
| **手动伸缩** | 人工调整       | 临时需求           |

### 6.2 动态伸缩策略

```yaml
# 伸缩策略配置示例
scaling_policies:
  # 扩容策略
  scale_out:
    trigger:
      metric: cpu_utilization
      threshold: 70%
      duration: 3m
    action:
      add_instances: 2
      cooldown: 300s

  # 缩容策略
  scale_in:
    trigger:
      metric: cpu_utilization
      threshold: 30%
      duration: 5m
    action:
      remove_instances: 1
      cooldown: 300s

  # 定时策略
  scheduled:
    - name: morning_peak
      recurrence: '0 7 * * 1-5' # 工作日7点
      min_size: 10
      max_size: 20
    - name: night_off_peak
      recurrence: '0 22 * * *' # 每晚22点
      min_size: 2
      max_size: 5
```

### 6.3 伸缩组配置要点

| 配置项         | 说明                           | 建议               |
| :------------- | :----------------------------- | :----------------- |
| **最小实例数** | 伸缩组最少保持的实例数         | 保证基础可用       |
| **最大实例数** | 伸缩组最多扩展的实例数         | 控制成本上限       |
| **冷却时间**   | 伸缩活动后的等待时间           | 300-600秒          |
| **健康检查**   | 实例健康状态检测               | 自动替换不健康实例 |
| **启动配置**   | 新实例的模板（镜像/规格/脚本） | 预装应用           |

## 7. 云成本优化

### 7.1 成本构成

| 成本类型     | 占比   | 优化空间           |
| :----------- | :----- | :----------------- |
| **计算资源** | 40-60% | 弹性伸缩、预留实例 |
| **存储资源** | 15-25% | 分层存储、生命周期 |
| **网络流量** | 10-20% | 内网通信、CDN      |
| **数据库**   | 10-15% | 规格优化、读写分离 |
| **其他服务** | 5-10%  | 按需使用           |

### 7.2 成本优化策略

| 策略                  | 说明                       | 预估节省 |
| :-------------------- | :------------------------- | :------- |
| **预留实例/包年包月** | 长期使用预付费             | 30-60%   |
| **弹性伸缩**          | 按负载自动调整资源         | 20-40%   |
| **Spot/抢占式实例**   | 使用闲置算力               | 60-90%   |
| **存储分层**          | 热数据标准存储、冷数据归档 | 40-70%   |
| **资源右置**          | 选择合适的实例规格         | 20-30%   |
| **闲置资源回收**      | 清理未使用的资源           | 10-20%   |

### 7.3 成本监控脚本

```python
import boto3
from datetime import datetime, timedelta

def get_daily_cost(days: int = 30) -> list:
    """获取 AWS 每日成本"""
    client = boto3.client('ce', region_name='us-east-1')

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    response = client.get_cost_and_usage(
        TimePeriod={'Start': start_date, 'End': end_date},
        Granularity='DAILY',
        Metrics=['BlendedCost'],
        GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
    )

    costs = []
    for result in response['ResultsByTime']:
        date = result['TimePeriod']['Start']
        total = sum(
            float(group['Metrics']['BlendedCost']['Amount'])
            for group in result['Groups']
        )
        costs.append({'date': date, 'total': round(total, 2)})

    return costs

def find_idle_resources():
    """发现闲置资源"""
    ec2 = boto3.resource('ec2')

    # 未附加的 EBS 卷
    volumes = list(ec2.volumes.filter(Filters=[
        {'Name': 'status', 'Values': ['available']}
    ]))
    print(f"未附加的 EBS 卷: {len(volumes)} 个")

    # 未使用的弹性 IP
    eips = [eip for eip in ec2.vpc_addresses.all()
            if eip.instance_id is None]
    print(f"未使用的弹性 IP: {len(eips)} 个")

    # 停止的实例
    stopped = list(ec2.instances.filter(Filters=[
        {'Name': 'instance-state-name', 'Values': ['stopped']}
    ]))
    print(f"停止的实例: {len(stopped)} 个")
```

### 7.4 FinOps 实践

```
成本可视化 → 成本归因 → 成本优化 → 持续治理
     ↓            ↓           ↓           ↓
  预算告警     标签分摊     采购策略     治理策略
```

| 阶段         | 关键活动                     | 工具                    |
| :----------- | :--------------------------- | :---------------------- |
| **Inform**   | 成本可视化、预算告警         | CloudHealth、云原生工具 |
| **Optimize** | 资源右置、预留实例、闲置回收 | Spot.io、Kubecost       |
| **Operate**  | 标签治理、成本分摊、持续优化 | FinOps 平台             |
