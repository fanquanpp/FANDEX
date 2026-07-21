---
order: 88
title: Go与分布式追踪
module: go
category: Go
difficulty: advanced
description: OpenTelemetry集成
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与中间件
  - go/Go与OAuth2
  - go/Go与限流
  - go/goroutine与channel通信原理
prerequisites:
  - go/概述与环境配置
---

## 概述

分布式追踪是一种监控技术，用于跟踪请求在分布式系统中的完整路径。当用户发起一个请求，这个请求可能经过网关、多个微服务、数据库、消息队列等组件。分布式追踪记录每个环节的耗时和状态，帮助开发者定位性能瓶颈和故障原因。OpenTelemetry 是当前最主流的分布式追踪标准，Go 语言有官方的 SDK 支持。

## 基础概念

在开始编码之前，需要理解分布式追踪的几个核心概念：

- **Trace（追踪）**：一个请求从发起到完成的完整过程，由一个全局唯一的 Trace ID 标识。
- **Span（跨度）**：Trace 中的一个操作单元，记录了操作的名称、开始时间、持续时间和属性。一个 Trace 由多个 Span 组成树状结构。
- **Context Propagation（上下文传播）**：在服务间传递 Trace ID 和 Span ID，确保跨服务的请求能关联到同一个 Trace。
- **Exporter（导出器）**：将追踪数据发送到后端系统（如 Jaeger、Zipkin、Prometheus）。
- **Sampler（采样器）**：决定哪些请求需要记录追踪数据，避免在高流量下产生过多数据。

## 快速上手

首先安装 OpenTelemetry Go SDK：

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/stdout/stdouttrace
go get go.opentelemetry.io/otel/sdk/trace
```

最简单的追踪示例：

```go
package main

import (
    "context"
    "fmt"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func main() {
    // 创建导出器（将追踪数据输出到标准输出）
    exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
    if err != nil {
        log.Fatal(err)
    }

    // 创建 TracerProvider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("my-app"), // 服务名称
        )),
    )
    defer tp.Shutdown(context.Background())

    // 设置为全局 TracerProvider
    otel.SetTracerProvider(tp)

    // 获取 Tracer
    tracer := otel.Tracer("my-app")

    // 创建一个 Span
    ctx, span := tracer.Start(context.Background(), "process-order")
    defer span.End()

    // 在 Span 中添加属性
    span.SetAttributes(semconv.ServiceVersionKey.String("1.0.0"))

    // 记录事件
    span.AddEvent("开始处理订单")

    // 业务逻辑
    doWork(ctx)

    span.AddEvent("订单处理完成")
    fmt.Println("处理完成")
}

func doWork(ctx context.Context) {
    tracer := otel.Tracer("my-app")
    // 创建子 Span
    _, span := tracer.Start(ctx, "query-database")
    defer span.End()

    // 模拟数据库查询
    span.AddEvent("执行 SQL 查询")
}
```

## 详细用法

### 1. 初始化 TracerProvider

生产环境通常将追踪数据发送到 Jaeger 等后端：

```bash
go get go.opentelemetry.io/otel/exporters/jaeger
```

```go
import (
    "go.opentelemetry.io/otel/exporters/jaeger"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func InitTracer(url string) (*sdktrace.TracerProvider, error) {
    // 创建 Jaeger 导出器
    exporter, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint(url),
    ))
    if err != nil {
        return nil, err
    }

    // 创建 TracerProvider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("order-service"),
            semconv.ServiceVersionKey.String("1.0.0"),
        )),
        // 采样策略：始终采样（开发环境）
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

### 2. HTTP 服务集成

在 HTTP 服务器中集成追踪，自动为每个请求创建 Span：

```bash
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

```go
import (
    "net/http"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    // 初始化追踪
    tp, _ := InitTracer("http://localhost:14268/api/traces")
    defer tp.Shutdown(context.Background())

    // 使用 otelhttp 中间件自动追踪 HTTP 请求
    mux := http.NewServeMux()
    mux.HandleFunc("/orders", handleOrders)

    // 包装路由，自动创建 Span
    handler := otelhttp.NewHandler(mux, "http-server")
    http.ListenAndServe(":8080", handler)
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
    // 从请求中获取 Span，添加属性
    span := trace.SpanFromContext(r.Context())
    span.SetAttributes(attribute.String("http.method", r.Method))

    // 业务逻辑
    w.Write([]byte("订单列表"))
}
```

### 3. HTTP 客户端集成

追踪 HTTP 客户端请求，将追踪上下文传播到下游服务：

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

// 创建带追踪的 HTTP 客户端
client := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}

// 请求会自动携带追踪头，下游服务可以关联到同一个 Trace
resp, err := client.Get("http://order-service:8080/orders")
```

### 4. gRPC 集成

```bash
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
```

```go
import "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

// gRPC 服务器
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)

// gRPC 客户端
conn, _ := grpc.Dial(
    "localhost:50051",
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
)
```

### 5. 数据库集成

追踪数据库查询：

```bash
go get go.opentelemetry.io/contrib/instrumentation/github.com/lib/pq/otelpq
```

```go
import "go.opentelemetry.io/contrib/instrumentation/github.com/lib/pq/otelpq"

// 使用带追踪的数据库连接
dsn := "user=postgres dbname=mydb sslmode=disable"
conn, _ := otelpq.Open(dsn)
```

### 6. 手动创建 Span

在业务逻辑中手动创建 Span：

```go
func ProcessOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    // 创建 Span
    ctx, span := tracer.Start(ctx, "ProcessOrder",
        trace.WithAttributes(attribute.String("order.id", orderID)),
    )
    defer span.End()

    // 步骤1：验证订单
    if err := validateOrder(ctx, orderID); err != nil {
        // 记录错误
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    // 步骤2：扣减库存
    if err := deductInventory(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    span.SetStatus(codes.Ok, "处理成功")
    return nil
}

func validateOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    _, span := tracer.Start(ctx, "validateOrder")
    defer span.End()
    // 验证逻辑...
    return nil
}
```

### 7. Span 属性和事件

```go
// 设置属性（用于筛选和搜索）
span.SetAttributes(
    attribute.String("user.id", "12345"),
    attribute.Int("order.items", 3),
    attribute.Float64("order.total", 299.9),
)

// 添加事件（记录 Span 中的关键时刻）
span.AddEvent("payment_received",
    trace.WithAttributes(attribute.String("payment.method", "credit_card")),
)

// 记录错误
span.RecordError(err)
span.SetStatus(codes.Error, "处理失败")
```

## 常见场景

### 场景一：微服务调用链追踪

请求从网关到多个微服务的完整调用链：

```go
// 网关服务：创建根 Span
ctx, span := tracer.Start(r.Context(), "gateway.handle")
defer span.End()

// 调用用户服务（自动传播追踪上下文）
userClient.GetUser(ctx, userID)

// 调用订单服务
orderClient.GetOrders(ctx, userID)
```

### 场景二：性能瓶颈定位

通过 Span 的耗时数据找到慢操作：

```go
ctx, span := tracer.Start(ctx, "database.query")
start := time.Now()

// 执行查询
rows, err := db.QueryContext(ctx, sql)

duration := time.Since(start)
span.SetAttributes(attribute.Float64("query.duration_ms", float64(duration.Milliseconds())))
```

### 场景三：错误追踪

记录错误发生的位置和上下文：

```go
if err != nil {
    span.RecordError(err)
    span.SetStatus(codes.Error, err.Error())
    span.SetAttributes(
        attribute.String("error.type", "database"),
        attribute.String("error.query", query),
    )
}
```

## 注意事项与常见错误

1. **必须 Shutdown TracerProvider**：程序退出前必须调用 `tp.Shutdown(ctx)`，否则缓冲区中的追踪数据可能丢失。

2. **Context 传递**：追踪上下文通过 `context.Context` 传递。如果函数间没有传递 Context，追踪链路会断裂。

3. **采样策略**：生产环境不应使用 `AlwaysSample`，这会产生大量追踪数据。推荐使用概率采样：

```go
// 采样 10% 的请求
sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1))
```

4. **Span 命名**：Span 名称应该简洁明确，如 `GET /users`、`database.query`，避免使用动态值（如用户 ID）作为 Span 名称。

5. **不要在热路径创建过多 Span**：每个 Span 有一定开销，不要在循环中为每次迭代创建 Span。

6. **Exporter 选择**：开发环境用 stdout 导出器，生产环境用 Jaeger/Zipkin/Tempo 等专业后端。

## 进阶用法

### 自定义传播格式

```go
import "go.opentelemetry.io/otel/propagation"

// 设置全局传播器（默认使用 W3C Trace Context）
otel.SetTextMapPropagator(propagation.TraceContext{})

// 也可以使用 B3 格式（兼容 Zipkin）
import "go.opentelemetry.io/contrib/propagators/b3"
otel.SetTextMapPropagator(b3.New())
```

### Metrics 集成

OpenTelemetry 同时支持追踪和指标：

```go
import "go.opentelemetry.io/otel/metric"

meter := otel.Meter("my-app")
counter, _ := meter.Int64Counter("orders.total",
    metric.WithDescription("订单总数"),
)

// 记录指标
counter.Add(ctx, 1, attribute.String("status", "completed"))
```

### Baggage 传播

在跨服务调用中传递业务数据：

```go
import "go.opentelemetry.io/otel/baggage"

// 设置 baggage
member, _ := baggage.NewMember("user.id", "12345")
b, _ := baggage.New(member)
ctx = baggage.ContextWithBaggage(ctx, b)

// 在下游服务中读取
b = baggage.FromContext(ctx)
userID := b.Member("user.id").Value()
```
