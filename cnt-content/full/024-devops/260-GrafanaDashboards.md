---
order: 260
title: Grafana 仪表盘配置
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Grafana 仪表盘配置：数据源、面板类型、变量模板与告警集成。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/220-AnsiblePlaybookConfigManagement'
  - 'devops/250-Prometheus'
  - 'devops/280-ELKStackLogAnalysis'
  - 'devops/290-OpenTelemetry'
prerequisites:
  - 'devops/010-OverviewLinuxBasics'
---

## 0. 一句话理解

> Grafana 是"可视化与告警的展示层"：它自己不存数据，而是连接 Prometheus、Loki、
> Elasticsearch 等数据源，用仪表盘（Dashboard）把查询变成图形，再统一承载告警。
> 数据在数据源里查，Grafana 只负责"看得清、报得准"。

## 1. 数据源与目录结构

| 概念 | 含义 | 层级关系 |
| :--- | :--- | :--- |
| Data Source | 外部数据库连接（Prometheus/Loki/...） | 最底层 |
| Folder | 仪表盘的组织目录 | 按团队/系统分组 |
| Dashboard | 一组面板 + 变量的集合 | Folder 下 |
| Panel | 单个可视化单元（有独立查询） | Dashboard 下 |

添加 Prometheus 数据源的关键三件事：URL（如 `http://prometheus:9090`）、
访问模式选 Server（浏览器直连数据源会有跨域与凭证问题）、保存后点
"Save & test" 验证连通。

## 2. 面板选型：先选对图，再调样式

| 面板 | 适用 | 典型查询场景 |
| :--- | :--- | :--- |
| Time series | 一切随时间变化的量 | QPS、延迟、CPU 趋势 |
| Stat | 单值 + 阈值着色 | 当前在线数、版本号、错误率 |
| Bar gauge | 多维对比 | 各服务错误数排行 |
| Table | 明细与聚合行 | 慢查询 Top、资源余量表 |
| Heatmap | 分布随时间的热力 | 延迟分布（配合 Histogram） |
| Logs | 日志浏览（Loki/Elastic） | 带日志级别的流式查看 |
| Traces | 链路瀑布 | Jaeger/Tempo 数据源 |

反模式：用折线图展示只有两个状态的健康位；用饼图比较超过 5 个维度的占比
（人眼对扇形角度极不敏感）；一屏超过 15 个面板导致没人真正看。

## 3. 变量与模板：一个仪表盘服务多个对象

变量（Dashboard variables）是仪表盘的灵魂——把"服务名"做成下拉框，
一份仪表盘就能看所有服务：

```text
新建变量 service（Query 类型）：
  label_values(http_requests_total, service)     # 从指标标签取所有可选值

面板查询里引用：
  sum(rate(http_requests_total{service=~"$service"}[5m])) by (handler)
```

常用技巧：

1. `includeAll` + `allValue: .*`：默认看全部，可下钻单个服务。
2. 变量级联：先选 namespace，再联动选 service（上一个变量作为下一个的过滤条件）。
3. `$__rate_interval` 内置变量替代手写 `[5m]`，自动适配抓取间隔，避免 rate 失真。

## 4. 阈值、覆盖与告警集成

1. **Thresholds**：面板级红黄绿分段（如错误率 1%/5%），与告警阈值保持一致才有意义。
2. **Field override**：同一个面板里对特定序列单独设单位/小数位/阈值。
3. **Grafana Unified Alerting**：告警规则与数据源解耦，支持多数据源条件
   （如"错误率涨 && 流量未跌"才告警，排除发布期间流量归零的误报）。
   告警面板（Alertlist）与注释（Annotations）配合，把发布事件直接画在图上。

## 5. Dashboard as Code：Provisioning

手工搭的仪表盘无法评审、无法恢复。Grafana 支持启动时自动加载配置：

```yaml
# /etc/grafana/provisioning/datasources/prom.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

```yaml
# /etc/grafana/provisioning/dashboards/provider.yml
apiVersion: 1
providers:
  - name: default
    orgId: 1
    folder: ''
    type: file
    options:
      path: /var/lib/grafana/dashboards # 放 JSON 文件的目录
```

配套实践：仪表盘 JSON 存 Git（或用 grafana-kit/Terraform provider 管理），
CI 校验 + 部署；社区生态里有大量现成仪表盘（grafana.com 的 Dashboard ID 一键导入），
拿来改造比自己从零画快得多。

## 6. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| 面板查询没有聚合 sum by | 序列爆炸、图变"面条" | 查询先聚合再展示 |
| 图例塞满全部标签值 | 图例比图还大 | Legend 里用 Format 精简 |
| 用仪表盘当日志检索工具 | Grafana 变卡 | 明细排查交给 Loki/ES 界面 |
| 仪表盘手工改不进 Git | 改坏无法回滚 | provisioning + JSON 版本化 |
| 告警阈值与面板阈值不一致 | "图是绿的告警在响" | 统一定义、一处引用 |

## 7. 动手试试

1. 连接本地 Prometheus，导入官方 Node Exporter Full 仪表盘（Dashboard ID 1860），
   观察"变量 + 复用"的实际效果。
2. 把错误率面板加上 1%/5% 阈值着色，再用同一表达式建一条 Grafana 告警。
3. 把当前仪表盘导出 JSON 存档，用 provisioning 目录方式在另一个实例里复现。

## 8. 小结

**初学者要点**

1. Grafana 不存数据：数据源连进来，仪表盘用查询说话。
2. 先选对面板类型，再用变量把一份仪表盘变成"全服务通用版"。
3. 阈值、单位、图例是让图形"可信易读"的三个细节。

**进阶注意**

1. Dashboard as Code（provisioning/JSON 进 Git）是团队协作与灾备的前提。
2. 统一告警支持多数据源条件与路由，逐步替代旧版面板级告警。
3. 大屏设计面向"一眼判断健康度"：概览层少而精，细节下钻靠变量与链接。

## 服务管理

**基本用法:启动 Grafana**
`grafana-server --config=<配置文件>`

```bash
# Linux 启动
systemctl start grafana-server
systemctl enable grafana-server

# 直接运行二进制
grafana-server --config=/etc/grafana/grafana.ini --homepath=/usr/share/grafana

# Docker 启动
docker run -d --name=grafana -p 3000:3000 grafana/grafana:latest

# Docker Compose 启动(带持久化)
docker run -d --name=grafana -p 3000:3000 \
  -v grafana-storage:/var/lib/grafana \
  -v /etc/grafana/provisioning:/etc/grafana/provisioning \
  grafana/grafana:latest
```

---

**基本用法:查看 Grafana 状态**
`systemctl status grafana-server`

```bash
# 查看服务状态
systemctl status grafana-server

# 查看日志
journalctl -u grafana-server -f --tail=50

# 查看容器日志
docker logs -f grafana --tail=50

# 查看版本
grafana-server -v
docker exec grafana grafana-cli --version
```

---

## grafana-cli 命令

**基本用法:安装插件**
`grafana-cli plugins install <插件名>`

```bash
# 安装饼图插件
grafana-cli plugins install grafana-piechart-panel

# 安装时钟插件
grafana-cli plugins install grafana-clock-panel

# 安装点击house 数据源
grafana-cli plugins install vertamedia-clickhouse-datasource

# 重启 Grafana 使插件生效
systemctl restart grafana-server
```

---

**基本用法:管理插件**
`grafana-cli plugins <list|install|remove>`

```bash
# 列出已安装插件
grafana-cli plugins ls

# 升级指定插件
grafana-cli plugins upgrade grafana-piechart-panel

# 卸载插件
grafana-cli plugins remove grafana-piechart-panel

# 安装指定版本
grafana-cli plugins install grafana-piechart-panel 1.5.0
```

---

**基本用法:重置管理员密码**
`grafana-cli admin reset-admin-password <新密码>`

```bash
# 重置 admin 密码
grafana-cli admin reset-admin-password newpassword

# Docker 环境重置密码
docker exec -it grafana grafana-cli admin reset-admin-password newpassword

# 查看用户列表(SQLite)
sqlite3 /var/lib/grafana/grafana.db "SELECT login,email FROM user;"
```

---

## API 操作

**基本用法:认证与获取 API Key**
`curl -u <用户>:<密码> <服务器>/api/...`

```bash
# 基本认证访问 API
curl -u admin:admin http://localhost:3000/api/health

# 创建 API Token
curl -X POST -H "Content-Type: application/json" -u admin:admin \
  http://localhost:3000/api/auth/keys \
  -d '{"name":"ci-key","role":"Admin","secondsToLive":86400}'

# 使用 Token 访问
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/org
```

---

**基本用法:管理数据源**
`curl <服务器>/api/datasources`

```bash
# 列出所有数据源
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/datasources

# 创建 Prometheus 数据源
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/datasources \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy",
    "isDefault": true
  }'

# 测试数据源连接
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/datasources/name/Prometheus/health
```

---

**基本用法:管理仪表盘**
`curl <服务器>/api/dashboards`

```bash
# 查找仪表盘
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/search?query=node"

# 导出仪表盘 JSON
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/dashboards/uid/node-overview > dashboard.json

# 导入仪表盘
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/dashboards/db \
  -d @dashboard.json
```

---

## 仪表盘配置

**基本用法:仪表盘 JSON 结构**
`{ "dashboard": {...}, "folderId": 0, "overwrite": false }`

```json
{
  "dashboard": {
    "id": null,
    "uid": "node-overview",
    "title": "节点概览",
    "tags": ["node", "linux"],
    "timezone": "browser",
    "schemaVersion": 39,
    "refresh": "30s",
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "CPU 使用率",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "100 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100",
            "legendFormat": "{{instance}}"
          }
        ],
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      }
    ]
  },
  "folderId": 0,
  "overwrite": true
}
```

---

**基本用法:变量配置**
`templating.list`

```json
{
  "templating": {
    "list": [
      {
        "name": "datasource",
        "type": "datasource",
        "query": "prometheus",
        "current": {"text": "Prometheus", "value": "Prometheus"}
      },
      {
        "name": "instance",
        "type": "query",
        "datasource": "$datasource",
        "query": "label_values(node_cpu_seconds_total, instance)",
        "refresh": 1,
        "includeAll": true,
        "multi": true
      },
      {
        "name": "interval",
        "type": "interval",
        "options": [
          {"text": "1m", "value": "1m"},
          {"text": "5m", "value": "5m"},
          {"text": "1h", "value": "1h"}
        ],
        "current": {"text": "5m", "value": "5m"}
      }
    ]
  }
}
```

---

**基本用法:面板类型选择**
`type: <类型>`

```json
// 时间序列图
{"type": "timeseries", "title": "CPU 趋势"}

// 仪表盘
{"type": "gauge", "title": "内存使用率"}

// 统计数字
{"type": "stat", "title": "实例总数"}

// 表格
{"type": "table", "title": "节点列表"}

// 热力图
{"type": "heatmap", "title": "请求延迟分布"}

// 日志视图
{"type": "logs", "title": "应用日志"}
```

---

## Provisioning 自动配置

**基本用法:数据源自动配置**
`provisioning/datasources/datasource.yaml`

```yaml
# provisioning/datasources/datasource.yaml
apiVersion: 1

datasources:
- name: Prometheus
  type: prometheus
  access: proxy
  url: http://prometheus:9090
  isDefault: true
  editable: true

- name: Loki
  type: loki
  access: proxy
  url: http://loki:3100

- name: MySQL
  type: mysql
  url: mysql:3306
  user: readonly
  secureJsonData:
    password: ${MYSQL_PASSWORD}
  jsonData:
    database: metrics
```

---

**基本用法:仪表盘自动配置**
`provisioning/dashboards/dashboard.yaml`

```yaml
# provisioning/dashboards/dashboard.yaml
apiVersion: 1

providers:
- name: 'default'
  orgId: 1
  folder: 'Auto Provisioned'
  folderUid: auto-folder
  type: file
  disableDeletion: false
  updateIntervalSeconds: 30
  allowUiUpdates: true
  options:
    path: /var/lib/grafana/dashboards
    foldersFromFilesStructure: true
```

---

**基本用法:告警规则自动配置**
`provisioning/alerting/rules.yaml`

```yaml
# provisioning/alerting/rules.yaml
apiVersion: 1
groups:
- name: node-alerts
  interval: 30s
  rules:
  - uid: high-cpu
    title: High CPU Usage
    condition: A
    data:
    - refId: A
      relativeTimeRange:
        from: 600
        to: 0
      datasourceUid: prometheus-uid
      model:
        expr: "100 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100 > 80"
        instant: true
    noDataState: NoData
    execErrState: Error
    for: 5m
    annotations:
      summary: "CPU 使用率过高"
    labels:
      severity: warning
```

---

## 告警管理

**基本用法:配置通知渠道**
`provisioning/alerting/contactpoints.yaml`

```yaml
# provisioning/alerting/contactpoints.yaml
apiVersion: 1
contactPoints:
- name: slack-notification
  uid: slack-cp
  type: slack
  settings:
    url: https://hooks.slack.com/services/xxx
    channel: "#alerts"
  disableResolveMessage: false

- name: email-notification
  uid: email-cp
  type: email
  settings:
    addresses: ops@example.com
```

---

**基本用法:通知策略**
`provisioning/alerting/notificationpolicies.yaml`

```yaml
# provisioning/alerting/notificationpolicies.yaml
apiVersion: 1
policies:
- orgId: 1
  receiver: default
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
  - receiver: slack-notification
    matchers:
    - severity="critical"
    group_wait: 10s
  - receiver: email-notification
    matchers:
    - severity="warning"
    mute_time_intervals:
    - offhours
```

---

## 用户与组织管理

**基本用法:管理用户**
`curl -X POST <服务器>/api/admin/users`

```bash
# 创建用户
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/admin/users \
  -d '{"name":"Alice","email":"alice@example.com","login":"alice","password":"pass123"}'

# 修改用户角色
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/org/users/2 \
  -d '{"role":"Editor"}'

# 列出组织成员
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/org/users
```

---

**基本用法:管理组织**
`curl <服务器>/api/orgs`

```bash
# 创建组织
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/orgs \
  -d '{"name":"Engineering"}'

# 切换当前组织
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/user/using/2

# 列出所有组织
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/orgs
```

---

## 备份与迁移

**基本用法:导出仪表盘**
`curl <服务器>/api/dashboards/uid/<uid>`

```bash
# 导出单个仪表盘
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/dashboards/uid/node-overview > node-overview.json

# 批量导出所有仪表盘
for uid in $(curl -s -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/search?type=dash-db | jq -r '.[].uid'); do
  curl -s -H "Authorization: Bearer <token>" \
    http://localhost:3000/api/dashboards/uid/$uid > "dashboard-${uid}.json"
done
```

---

**基本用法:备份 SQLite 数据库**
`sqlite3 <数据库文件> .backup <备份文件>`

```bash
# 在线备份 SQLite 数据库
sqlite3 /var/lib/grafana/grafana.db ".backup /backup/grafana-$(date +%Y%m%d).db"

# 备份配置与数据卷
docker run --rm -v grafana-storage:/data -v $(pwd):/backup alpine \
  tar czf /backup/grafana-$(date +%Y%m%d).tar.gz /data

# 恢复备份
docker run --rm -v grafana-storage:/data -v $(pwd):/backup alpine \
  tar xzf /backup/grafana-backup.tar.gz -C /
```

---

## 性能与排查

**基本用法:查看 Grafana 健康状态**
`curl <服务器>/api/health`

```bash
# 健康检查
curl http://localhost:3000/api/health

# 查看指标
curl http://localhost:3000/metrics | grep grafana_

# 查看统计信息
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/admin/stats
```

---

**基本用法:配置日志级别**
`log.level = <级别>`

```ini
# grafana.ini 日志配置
[log]
mode = console file
level = info
filters = alerting.notifier:debug

[log.file]
level = info
max_lines = 1000000
max_size_shift = 28
daily_rotate = true
max_days = 7
```

```bash
# 运行时动态修改日志级别
curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/admin/settings \
  -d '{"log.level":"debug"}'
```

---

**基本用法:查询性能优化**
`Query inspector`

```bash
# 通过 API 检查查询性能
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/ds/query \
  -d '{
    "queries": [{
      "refId": "A",
      "datasource": {"uid": "prometheus"},
      "expr": "rate(http_requests_total[5m])",
      "instant": false,
      "range": true
    }],
    "from": "now-1h",
    "to": "now"
  }'

# 查看慢查询日志
journalctl -u grafana-server | grep "slow query"
```

---

## 集成与导出

**基本用法:导出为图片或 PDF**
`curl <服务器>/render/d/<dashboard-uid>`

```bash
# 渲染仪表盘为图片(需安装 image renderer 插件)
curl "http://localhost:3000/render/d/node-overview?from=now-6h&to=now&width=1000&height=500" \
  -H "Authorization: Bearer <token>" -o dashboard.png

# 渲染特定面板
curl "http://localhost:3000/render/d-solo/node-overview/panel-1?from=now-6h&to=now&width=1000&height=500" \
  -H "Authorization: Bearer <token>" -o panel.png

# 通过共享快照 API
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  http://localhost:3000/api/snapshots \
  -d @dashboard.json
```

---

**基本用法:嵌入外部网页**
`<iframe src="<grafana-url>/d/<uid>">`

```html
<!-- 启用嵌入模式需要在 grafana.ini 中配置 -->
<!-- [security] allow_embedding = true -->

<iframe
  src="http://grafana:3000/d/node-overview?from=now-6h&to=now&kiosk=tv"
  width="100%"
  height="600"
  frameborder="0">
</iframe>

<!-- 通过 URL 参数控制显示 -->
<!-- kiosk=tv: 电视模式(隐藏顶部栏) -->
<!-- kiosk=1: 全屏模式(隐藏所有控件) -->
<!-- theme=light: 浅色主题 -->
```
