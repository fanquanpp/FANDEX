---
order: 560
title: Go 与分布式追踪：一次请求到底慢在哪一跳
module: 'go'
category: 后端技术
difficulty: advanced
description: 以"接口 P99 偶发 3 秒但日志看不出慢在哪"为主线学 OpenTelemetry：Span 与父子链、stdout 导出跑通第一段链路、otelhttp/otelgrpc 一行接入、采样策略、trace_id 串起 slog 日志，附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'go/380-GoLog'
  - 'go/520-GoGRPC'
  - 'go/140-ContextDetailed'
  - 'go/480-GoMiddleware'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：P99 三秒，日志却都说自己很快

网关日志显示 300ms 就把请求转出去了；订单服务日志显示自己只用了 280ms；用户服务显示 20ms 返回。可用户端 P99 就是 3 秒。四个服务各说各话，时间对不上——因为每个服务只知道"我处理了多久"，不知道"我等下游等了多久、请求在我这之前走了多久"。

缺的是一张全程时间线：从用户发出请求开始，每一跳的开始、结束、耗时、状态，串在同一条记录里。这就是分布式追踪。事实标准是 OpenTelemetry（OTel）：Trace 是一次请求的全程记录（由全局 Trace ID 标识），Span 是其中一个操作单元（谁调了谁、耗时多少、带什么属性），Span 组成树；跨服务传播靠 context 里的 Trace ID/Span ID。

## 动手第一步：stdout 导出，五分钟看到父子链

不装任何后端，先把追踪数据打印到标准输出，亲眼看到 Trace 结构：

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/stdout/stdouttrace
```

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
    exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
    if err != nil {
        log.Fatal(err)
    }

    // TracerProvider：追踪数据的"总开关"，进程级初始化一次
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter), // 攒批导出
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("order-service"), // 这是哪台服务发的
        )),
    )
    defer tp.Shutdown(context.Background()) // 不 Shutdown 会丢缓冲区里的数据
    otel.SetTracerProvider(tp)

    tracer := otel.Tracer("order-service")

    // 父 Span：接到 ctx 上
    ctx, span := tracer.Start(context.Background(), "process-order")
    defer span.End()

    span.AddEvent("开始处理订单")
    doWork(ctx) // ctx 继续往下传
    fmt.Println("处理完成")
}

func doWork(ctx context.Context) {
    tracer := otel.Tracer("order-service")
    _, span := tracer.Start(ctx, "query-database") // 从 ctx 挂到父 Span 下
    defer span.End()
}
```

```bash
go run main.go
```

预期输出（JSON 行，节选关键字段）：

```text
{"Name":"query-database","SpanContext":{"TraceID":"4bf92f35...","SpanID":"00f067aa..."}}
{"Name":"process-order","SpanContext":{"TraceID":"4bf92f35...","SpanID":"8e0c9f43..."}}
```

关键观察：两个 Span 的 `TraceID` 相同、`SpanID` 不同——父子关系成立，一条链路就成型了。跑通这一步，剩下的全是"把同一套机制接到 HTTP/gRPC 上"。

## 动手第二步：接入 HTTP 服务与客户端

真实链路在服务之间。服务端用 otelhttp 中间件，每个请求自动生成 Span；客户端用 otelhttp Transport，请求自动携带追踪头：

```bash
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

```go
import (
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    tp, _ := InitTracer() // 第一步的初始化，OTLP 配置见下文
    defer tp.Shutdown(context.Background())

    mux := http.NewServeMux()
    mux.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
        // 从请求 context 取出中间件创建的 Span
        span := trace.SpanFromContext(r.Context())
        span.SetAttributes(attribute.String("order.channel", "web"))
        w.Write([]byte("订单列表"))
    })

    // 一行接入：此后每个请求都有 Span
    http.ListenAndServe(":8080", otelhttp.NewHandler(mux, "http-server"))
}

// 调下游时用带追踪的客户端：追踪头自动注入请求
var client = &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}
```

gRPC 同样一行：`grpc.NewServer(grpc.StatsHandler(otelgrpc.NewServerHandler()))`，客户端 `grpc.NewClient(addr, grpc.WithStatsHandler(otelgrpc.NewClientHandler()))`。上游的 Span 与下游的 Span 在同一棵树上，开头"时间对不上"的问题就从结构上消失了——Jaeger 的瀑布图里，每一段等待都有名字。

## 动手第三步：trace_id 写进日志，两个排查入口打通

追踪后端（Jaeger/Tempo）回答"哪一跳慢"，日志系统回答"当时发生了什么"。把两者串起来只要一件事：每条日志带上当前 trace_id。Go 1.21 的 slog 配合 OTel 做成通用辅助函数：

```go
import (
    "log/slog"

    "go.opentelemetry.io/otel/trace"
)

func LoggerWithTrace(ctx context.Context) *slog.Logger {
    sc := trace.SpanContextFromContext(ctx)
    if !sc.IsValid() {
        return slog.Default()
    }
    return slog.Default().With(
        slog.String("trace_id", sc.TraceID().String()),
        slog.String("span_id", sc.SpanID().String()),
    )
}

func HandleOrder(ctx context.Context, orderID string) {
    logger := LoggerWithTrace(ctx)
    logger.Info("订单开始处理", "order", orderID)
}
```

实际输出的日志行：

```text
2026-09-09T10:00:00 level=INFO msg="订单开始处理" order=ord-1 trace_id=4bf92f3577b34da6a3ce929d0e0e4736 span_id=00f067aa0ba902b7
```

工作流从此定型：Jaeger 里发现慢 Span，复制 trace_id 到日志系统直达现场；反过来在错误日志里看到 trace_id，粘进 Jaeger 看完整链路。这是追踪落地后收益最高的一步，多数采集方案（OTLP 日志、Loki）还能按这两个字段自动建索引。

## 讲为什么：初始化一次、采样、错误记录

生产接线的三件事：

**一，导出走 OTLP。** 旧的 jaeger 导出器已被官方废弃并从 SDK 移除——Jaeger 自 1.35 起原生接受 OTLP，统一走 OTLP 导出器（gRPC 4317，HTTP 4318）。endpoint 通常用环境变量 `OTEL_EXPORTER_OTLP_ENDPOINT` 配置而非硬编码：

```bash
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
```

```go
exporter, err := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint(endpoint),
    otlptracehttp.WithInsecure(), // 内网 collector 明文；出网关改用 TLS
)

tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exporter),
    sdktrace.WithResource(resource.NewWithAttributes(
        semconv.SchemaURL,
        semconv.ServiceNameKey.String("order-service"),
        semconv.ServiceVersionKey.String("1.0.0"),
    )),
    sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 生产采样 10%
)
otel.SetTracerProvider(tp)
```

**二，采样决定数据量。** 全量采样在高峰期每秒能产生几十万 Span，存储与带宽都是钱。按 Trace ID 比例采样（`TraceIDRatioBased`）的妙处在于：同一链路的所有服务对同一个 Trace ID 做独立判断，判断结果天然一致——要么全链路都采，要么全丢，不会出现半条链路。开发环境可以 `AlwaysSample()`，生产按流量定比例。

**三，错误要显式记录。** Span 不会自动感知你的业务错误：

```go
if err != nil {
    span.RecordError(err)                    // 记录异常详情与时间点
    span.SetStatus(codes.Error, err.Error()) // 把 Span 标红
    return err
}
```

业务节点上手动加 Span 的模式固定为"Start 拿到新 ctx、defer End、SetAttributes/RecordError"——注意必须用 `Start` 返回的 ctx 往下传，父子的挂接全靠它。

## 坑点与自检

**坑 1：退出不 Shutdown。** Batcher 在内存里攒批，进程被杀时缓冲区数据全丢。优雅关闭序列里必须有 `tp.Shutdown(ctx)`。

**坑 2：函数签名丢 ctx。** 追踪上下文只活在 context.Context 里。哪个调用链上有人"顺手"把 ctx 换成 `context.Background()`，那条链路从此断开，下游 Span 变成无父孤儿。context 的传递纪律见 [Context 详解](/go/140-ContextDetailed)。

**坑 3：Span 名带动态值。** `GET /users/12345` 会让后端聚合出几万个不同名的 Span，聚合彻底失效。名字用稳定操作名（`GET /users`、`database.query`），用户 ID 这类信息放 attribute。

**坑 4：热路径循环里建 Span。** 每批 1000 条消息建 1000 个 Span，追踪的开销反噬业务。循环体聚合为一个 Span，或者用事件（AddEvent）记录批内细节。

**坑 5：中间件顺序。** otelhttp 中间件要放在最外层（先于鉴权、日志中间件），否则部分请求绕过追踪或 trace_id 进不了日志。

自检——能不看文档回答这些吗：

1. Trace、Span、Context 传播三者各解决什么问题？父子关系靠什么建立？
2. 为什么所有服务日志都要带 trace_id？它打通了哪两个排查入口？
3. 为什么旧 Jaeger 导出器被移除？现在生产导出统一走什么协议与端口？
4. TraceIDRatioBased 采样如何保证"要么全链路采、要么全不采"？
5. span.RecordError 与 SetStatus 的分工？Span 命名的规则是什么？
6. 列出至少三个"链路断裂"的常见原因。

## 练习

1. 跑通第一步的程序，把 `doWork` 改成再嵌套一层 Span，验证三个 Span 的 TraceID 相同、SpanID 各异、树状结构正确。
2. 写两个小程序（服务 A 调服务 B），都用 otelhttp 接入并用 stdout 导出，用 httptest 或真端口联通一次，对比两个进程输出的 TraceID——应完全一致。
3. 部署本地 Jaeger（`docker run -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one`），把导出器换成 OTLP/HTTP 指向 localhost:4318，在 UI 里找到你的链路，对照瀑布图指出每个 Span 的耗时占比。

## 下一步

- 日志侧的完整工程实践：[Go 日志](/go/380-GoLog)；
- 追踪挂载的服务端结构：[Go 与 HTTP 服务](/go/470-GoHTTP)与[Go 中间件](/go/480-GoMiddleware)；
- ctx 传递为什么是铁律：[Context 详解](/go/140-ContextDetailed)；
- gRPC 链路的接入点：[Go 与 gRPC](/go/520-GoGRPC)。
