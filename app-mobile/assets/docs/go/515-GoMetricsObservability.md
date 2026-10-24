---
order: 570
title: 服务指标与可观测性
module: 'go'
category: 后端技术
difficulty: beginner
description: 可观测性第三支柱：Prometheus client_golang 的四种指标类型选型、/metrics 端点与中间件接入、Histogram 分桶看 P99、命名与标签基数陷阱——给限流服务与服务端 handler 挂上指标的全过程
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：可观测性三支柱之一——指标（metrics）。日志看「发生了
  什么」（380-GoLog），链路看「一次请求经过了哪」（510-GoDistributedTracing），
  指标看「系统整体现在怎么样」：速率、延迟分布、积压深度。
- **解决什么问题**：没有指标的服务是黑盒——不知道 QPS、不知道 P99
  延迟、不知道限流器拒了多少请求，容量规划与告警无从谈起。
- **什么时候用到**：服务上线前定 SLO（延迟/可用性目标）、容量评估、
  排查「用户说慢但看不出哪里慢」、给告警系统（Alertmanager）供数。

## 真实场景：限流服务拒掉的请求，用户骂了三天才定位

500-GoRateLimiting 的限流服务有个尴尬：它安静地拒绝了大量请求
（返回 429），但没有任何记录说「每分钟拒了多少、哪个租户被拒最多」。
业务方反馈接口变慢，后端查日志翻半天才知道是限流阈值设低了。

给限流器挂上指标后，同样的事故 30 秒定位：Grafana 曲线显示
`rate_limit_rejected_total{tenant="acme"}` 在 10:00 突然抬升——
要么 acme 流量异常，要么阈值配错。这就是指标的价值：
**把离散的日志事件聚合成可比较的时间序列**。

## 1. 四种指标类型：选错类型，查询全废

Prometheus（client_golang 是其官方 Go 客户端）只有四种指标类型，
选型的关键是「回答什么问题」：

| 类型 | 回答什么问题 | 例子 |
| --- | --- | --- |
| Counter | 累计发生了多少次（只增不减） | 请求总数、错误总数、限流拒绝总数 |
| Gauge | 当前值是多少（可增可减） | 在线连接数、队列长度、内存占用 |
| Histogram | 值的分布（分桶计数） | 请求延迟、响应大小 |
| Summary | 客户端预计算的分布 | 少用（不可聚合，见下） |

```go
var (
    reqTotal = promauto.NewCounter(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total number of HTTP requests.",
    })
    inflight = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "http_requests_inflight",
        Help: "Number of requests currently being served.",
    })
    latency = promauto.NewHistogram(prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "Request latency distribution.",
        Buckets: prometheus.DefBuckets, // 0.005s 到 10s 的指数桶
    })
)
```

**逐行讲解**：命名后缀 `_total` 是 Counter 的社区约定（PromQL 的
`rate()` 函数按约定找它）；`promauto` 包在注册的同时完成初始化，
替代 `prometheus.MustRegister(NewCounter(...))` 两步——写错名字
（重复注册）在启动时 panic，**指标注册错误宁可启动失败也不要带病
上线**；`DefBuckets` 是 `5ms 10ms 25ms 50ms 100ms 250ms 500ms 1s 2.5s 5s 10s`，
如果你的 P99 落在最后一个桶之外（>10s），曲线顶端是平的——
**必须按业务实际延迟范围自定义 Buckets**。

Counter 的操作只有 `Inc()` 与 `Add(n)`（n >= 0）：进程重启归零是
常态，PromQL 用 `rate()`/`increase()` 计算变化率，**永远不要直接
对 Counter 绝对值告警**。Gauge 用 `Set()/Inc()/Dec()/Add()`，
反映瞬时状态。

## 2. /metrics 端点与中间件接入

### 2.1 最小接入

```go
func main() {
    http.Handle("/metrics", promhttp.Handler()) // 标准 /metrics 端点
    log.Fatal(http.ListenAndServe(":2112", nil))
}
```

**为什么常开独立端口（2112）**：`/metrics` 是给抓取器（Prometheus
server）读的机器接口，不该暴露给公网——独立端口让「业务端口进
LB、指标端口只进监控网段」的隔离变成一行 K8s Service 配置。
单端口部署也可以，但要配认证或路径过滤。

### 2.2 指标中间件

给 470-GoHTTP 的 handler 体系挂统一指标：

```go
func Metrics(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        inflight.Inc()
        sw := &statusWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(sw, r)
        route := r.URL.Path // 简化写法，生产应映射为路由模板
        reqTotal.WithLabelValues(r.Method, route).Inc()
        latency.Observe(time.Since(start).Seconds())
        inflight.Dec()
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}
```

**逐行讲解**：`statusWriter` 包装 ResponseWriter 是为了让中间件能拿到
handler 写入的状态码——`http.ResponseWriter` 没有读状态码的接口，
包装模式是唯一通路（对照 480-GoMiddleware 的包装链）；`Observe`
把本次延迟丢进直方图（一次观测同时更新所有命中的桶）；`inflight`
的 Inc/Dec 必须成对出现在 handler 前后——panic 时 Dec 不会执行，
会缓慢泄漏到无穷大，解法是把业务执行包一层 `defer inflight.Dec()`。

### 2.3 限流服务挂指标

```go
var rejected = promauto.NewCounterVec(prometheus.CounterOpts{
    Name: "rate_limit_rejected_total",
    Help: "Requests rejected by the rate limiter.",
}, []string{"tenant"})

func Allow(tenant string) bool {
    if limiter.Allow(tenant) {
        return true
    }
    rejected.WithLabelValues(tenant).Inc() // 按租户分维度计数
    return false
}
```

`CounterVec` 是带标签维度的 Counter 组：同一个指标名按 `tenant`
拆成多条时间序列。这一行改动让「谁被限流」从猜测变成查询
`topk(5, rate(rate_limit_rejected_total[5m]))`。

## 3. Histogram 读数：为什么 P99 要看直方图

延迟指标的取用是新手重灾区，两个铁律：

**铁律一：不要用平均值做 SLO。** `sum / count` 会把 1% 的 10 秒慢请求
稀释进 99% 的 50ms 快请求里——平均值 0.15s 看起来健康，头部用户体验
灾难。正确的问法是分位数：

```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

P99 的含义：99% 的请求快于这个值——它直接对应「最不满的那批用户」。

**铁律二：分位数不可跨实例聚合，直方图桶可以。** Summary 类型在
客户端预计算分位数，多实例的分位数没法合并（Prometheus 抓的是多台
机器），只能逐实例看；Histogram 存桶计数，服务端聚合后再算分位数，
这就是**生产环境几乎只用 Histogram** 的原因。Summary 留给单机工具。

桶边界的取舍：桶太密增加存储与抓取成本（每个桶一条序列），
太疏丢失分位数精度。经验值 8-12 个桶、覆盖预期 P99.9 的 2 倍范围。
分位数精度受桶宽限制——P99 报 250ms 的真实含义是「落在了 100-250ms
这个桶里」，想更准就加密 100ms 附近的桶。

## 4. 本地验证：docker-compose 起 Prometheus 抓取

第三步是把指标真正抓起来看（联动 600-GoDocker 的容器基础）：

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"   # 业务端口
      - "2112:2112"   # 指标端口
  prometheus:
    image: prom/prometheus:v3.7.2
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "app"
    static_configs:
      - targets: ["app:2112"]   # compose 网络内用服务名寻址
```

```bash
docker compose up -d
curl localhost:2112/metrics | head   # 人肉验证端点活着
# 浏览器开 localhost:9090，查 rate(http_requests_total[1m])
```

**逐行讲解**：`targets: ["app:2112"]` 用 compose 内部 DNS 服务名而非
localhost——抓取器与业务在同一容器网络里互相通过服务名寻址；
`scrape_interval: 15s` 是采集粒度，决定你的告警最快延迟——
**15 秒采样配 1 分钟窗口的 rate() 至少要 4 个样本**，窗口太短
PromQL 直接报错或输出空。手工验证顺序永远是先 curl `/metrics`
（确认暴露正常）再开 Prometheus UI（确认抓取链路正常），
两步隔离定位「没数据」卡在哪一环。

## 常见陷阱与调试

- **坑 1：标签基数爆炸。** 给指标加 `user_id` 或 `trace_id` 标签，
  每个唯一值一条序列——百万用户就是百万序列，Prometheus OOM。
  规则：**标签只放「可枚举的低基数维度」**（租户、路由模板、状态码），
  高基数字段交给日志与链路。
- **坑 2：路径直做标签。** `route := r.URL.Path` 遇到 REST 风格
  `/users/123` 就是每个 id 一条序列——同样的基数爆炸。用路由模板
  （Gin 的 `c.FullPath()` 返回 `/users/:id`）或 Go 1.22 mux 的 pattern。
- **坑 3：指标命名与单位混乱。** 社区约定单位用基础单位（秒、字节）
  放进名字（`_seconds`、`_bytes`），自造毫秒/KB 单位后 PromQL 的
  通用面板与录制规则全部对不上。
- **坑 4：只在 main 里注册、忘了 panic 风险。** 重复注册（同名同标签）
  会 panic；用 `promauto` 后注意包级变量在测试里跨用例共享，
  并行测试要各自用 `prometheus.NewRegistry` 隔离。
- **坑 5：把 Gauge 当 Counter 用或反之。** 「累计拒绝数」用 Gauge
  存的话，PromQL 的 rate() 会在进程重启时算出巨大负跳变；
  「当前连接数」用 Counter 的话每次重连都单调增加直到重启，
  两个方向都是无意义的曲线。

## 动手实践

**任务**：给一个最小限流服务补齐三个指标（请求总数、拒绝总数、
排队等待直方图），并在本地用 docker-compose 验证抓取。

1. 实现 `Allow(tenant)` 固定窗口限流（每租户每秒 5 次），挂上
   `rejected_total{tenant}`；
2. 包一层 Metrics 中间件（请求总数按 method+route、延迟直方图、
   inflight Gauge）；
3. 写 prometheus.yml 与 docker-compose.yml，起服务后用 ab/curl 打
   50 个请求触发限流；
4. 在 Prometheus UI 执行：被拒最多的租户、P99 延迟、当前 inflight。

**提示**：固定窗口用 `map[string]*slidingWindow`，窗口内计数超 5 则
拒绝并 Inc 指标（完整限流算法见 500-GoRateLimiting，本练习只求最小）；
P99 查询的桶名后缀是 `_bucket`；inflight 用 Gauge 是因为它是瞬时值。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```go
package main

import (
    "net/http"
    "sync"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    rejected = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "rate_limit_rejected_total",
        Help: "Rejected requests per tenant.",
    }, []string{"tenant"})
    reqTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total requests.",
    }, []string{"method", "route"})
    latency = promauto.NewHistogram(prometheus.HistogramOpts{
        Name: "http_request_duration_seconds",
        Help: "Latency.",
        Buckets: []float64{.001, .0025, .005, .01, .025, .05, .1, .25, .5, 1},
    })
    inflight = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "http_requests_inflight",
        Help: "In-flight requests.",
    })
)

type limiter struct {
    mu     sync.Mutex
    window map[string]*bucket
}

type bucket struct {
    count int
    reset time.Time
}

func (l *limiter) Allow(tenant string) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    b := l.window[tenant]
    now := time.Now()
    if b == nil || now.After(b.reset) {
        l.window[tenant] = &bucket{1, now.Add(time.Second)}
        return true
    }
    b.count++
    return b.count <= 5 // 超出 -> false；调用方负责 Inc(rejected)
}

func Metrics(routeOf func(*http.Request) string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        inflight.Inc()
        defer inflight.Dec() // panic 安全：Dec 放 defer
        next.ServeHTTP(w, r)
        reqTotal.WithLabelValues(r.Method, routeOf(r)).Inc()
        latency.Observe(time.Since(start).Seconds())
    })
}

func main() {
    l := &limiter{window: map[string]*bucket{}}
    mux := http.NewServeMux()
    mux.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
        tenant := r.Header.Get("X-Tenant")
        if !l.Allow(tenant) {
            rejected.WithLabelValues(tenant).Inc()
            http.Error(w, "rate limited", http.StatusTooManyRequests)
            return
        }
        w.Write([]byte("ok"))
    })
    mux.Handle("/metrics", promhttp.Handler())
    routeOf := func(r *http.Request) string {
        if r.URL.Path == "/api" {
            return "/api"
        }
        return "other" // 防止杂散路径制造高基数
    }
    http.ListenAndServe(":2112", Metrics(routeOf, mux))
}
```

**逐段讲解**：`defer inflight.Dec()` 放在 Inc 之后第一行，panic 路径
也有减无增（对照第 2.2 节的坑）；`routeOf` 把未知路径归入 `other`
——任何进标签的字符串都要先过「枚举化」这道闸；限流器用互斥锁
保护窗口 map，窗口重置在读取时惰性进行（免起后台协程）；验证时
`for i in $(seq 60); do curl -s -H "X-Tenant: acme" localhost:2112/api > /dev/null; done`
打 60 个请求，Prometheus 里
`topk(5, rate(rate_limit_rejected_total[5m]))` 应显示 acme 且速率约
55 次/秒窗口均值——与你的压力脚本对上，链路才算打通。

</details>

## 参考与致谢

- Prometheus client_golang 文档（https://github.com/prometheus/client_golang ，Apache-2.0 许可）
- Prometheus 官方文档：Instrumenting、Histograms and summaries
  （https://prometheus.io/docs/ ，Apache-2.0 许可）
- 场景素材：本仓库 500-GoRateLimiting 限流服务与 470-GoHTTP 服务端
  的既有场景续作
