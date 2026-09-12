---
order: 520
title: Go 与 gRPC
module: 'go'
category: 后端技术
difficulty: intermediate
description: gRPC 与 Protobuf 实战：proto3 服务定义、代码生成、四种通信模式、拦截器、超时与状态码、生产级实践。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'go/530-GoGraphQL'
  - 'go/470-GoHTTP'
  - 'go/610-GoKubernetes'
  - 'go/510-GoDistributedTracing'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [Go 概述与环境配置](/go/020-GoOverviewEnvSetup)

## 概述

gRPC 是 Google 开源的高性能远程过程调用（RPC）框架，使用 Protocol Buffers 作为接口定义语言和序列化格式。与 REST/JSON 相比，gRPC 使用二进制传输，性能更高；强类型定义，开发更安全；支持双向流，通信更灵活。Go 是 gRPC 的一等公民语言，官方提供了完整的 SDK。

## 基础概念

在开始编码之前，需要理解 gRPC 的几个核心概念：

- **Protobuf**：Protocol Buffers，一种二进制序列化格式，比 JSON 更小更快。用 `.proto` 文件定义数据结构和服务接口。
- **Service**：在 `.proto` 文件中定义的一组 RPC 方法，类似于接口。
- **Stub/Client**：根据 `.proto` 文件自动生成的客户端代码，调用远程方法就像调用本地函数。
- **四种通信模式**：一元调用（请求-响应）、服务端流、客户端流、双向流。
- **Channel**：客户端与服务端之间的逻辑连接，底层是一条 HTTP/2 连接，多个 RPC 通过多路复用共享它，这也是 gRPC 高吞吐的关键。

一个容易忽略的事实：gRPC 建立在 HTTP/2 之上，因此天然获得头部压缩（HPACK）、单连接多路复用与双向流能力；而 Protobuf 的二进制编码靠"字段编号"而非字段名来标识数据，这决定了它的向后兼容规则（见下文 Protobuf 设计要点）。

## 快速上手

### 1. 安装工具

```bash
# 安装 protoc 编译器
# Windows: 从 https://github.com/protocolbuffers/protobuf/releases 下载
# Mac: brew install protobuf
# Linux: apt install protobuf-compiler

# 安装 Go 插件
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 安装 gRPC 库
go get google.golang.org/grpc
```

### 2. 定义 Protobuf

创建 `proto/user.proto`：

```protobuf
syntax = "proto3";

package user;

option go_package = "myapp/proto/user";

// 定义数据结构
message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

// 定义服务
service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

### 3. 生成代码

```bash
protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative proto/user.proto
```

生成两个文件：`user.pb.go`（消息类型的序列化代码）与 `user_grpc.pb.go`（服务端接口与客户端 Stub）。

### 4. 实现服务端

```go
package main

import (
    "context"
    "log"
    "net"

    pb "myapp/proto/user"
    "google.golang.org/grpc"
)

// 实现服务接口
type server struct {
    pb.UnimplementedUserServiceServer // 必须嵌入
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    // 模拟数据库查询
    return &pb.GetUserResponse{
        User: &pb.User{
            Id:    req.Id,
            Name:  "小明",
            Email: "ming@example.com",
        },
    }, nil
}

func main() {
    // 创建 gRPC 服务器
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }

    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, &server{})

    log.Println("gRPC 服务器启动在 :50051")
    s.Serve(lis)
}
```

运行服务端，预期输出：

```text
2026/09/09 10:00:00 gRPC 服务器启动在 :50051
```

### 5. 实现客户端

```go
package main

import (
    "context"
    "log"
    "time"

    pb "myapp/proto/user"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    // grpc.NewClient（gRPC-Go 1.63+ 推荐）创建懒连接：
    // 它立即返回，不立即发起 TCP 握手，首次调用时才真正连接
    conn, err := grpc.NewClient("localhost:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewUserServiceClient(conn)

    // 一元调用必须带超时，避免对端无响应时永久阻塞
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: "123"})
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("用户: %s, 邮箱: %s", resp.User.Name, resp.User.Email)
}
```

先启动服务端，再运行客户端，预期输出：

```text
2026/09/09 10:00:05 用户: 小明, 邮箱: ming@example.com
```

> **grpc.Dial 与 grpc.NewClient**：旧教程里常见的 `grpc.Dial` 会在调用时立刻建立 TCP 连接（可被 `grpc.WithBlock()` 改为阻塞等待），该 API 自 gRPC-Go 1.63（2023-12）起已被标记废弃，由 `grpc.NewClient` 取代。两者最关键的行为差异：`NewClient` 使用名字解析器 + 负载均衡器异步建连，连接失败不会在创建时报错，而是在第一次 RPC 上体现——因此超时控制从"拨号阶段"前移到了"每次调用"，务必给每个调用都带上 deadline。

## 详细用法

### 1. 服务端流

服务端返回一个流，客户端逐条接收：

```protobuf
service OrderService {
  rpc ListOrders(ListOrdersRequest) returns (stream Order);
}
```

```go
func (s *server) ListOrders(req *pb.ListOrdersRequest, stream pb.OrderService_ListOrdersServer) error {
    orders := getOrders(req.UserId)
    for _, order := range orders {
        // 逐条发送
        if err := stream.Send(order); err != nil {
            return err
        }
    }
    return nil
}
```

客户端接收：

```go
stream, _ := client.ListOrders(ctx, &pb.ListOrdersRequest{UserId: "123"})
for {
    order, err := stream.Recv()
    if err == io.EOF {
        break // 流结束
    }
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("订单: %s\n", order.Id)
}
```

### 2. 客户端流

客户端发送一个流，服务端接收后返回一个响应：

```protobuf
service UploadService {
  rpc UploadFile(stream FileChunk) returns (UploadResponse);
}
```

```go
func (s *server) UploadFile(stream pb.UploadService_UploadFileServer) error {
    var totalSize int
    for {
        chunk, err := stream.Recv()
        if err == io.EOF {
            return stream.SendAndClose(&pb.UploadResponse{
                Size: int32(totalSize),
                Message: "上传完成",
            })
        }
        if err != nil {
            return err
        }
        totalSize += len(chunk.Data)
    }
}
```

### 3. 双向流

双方都可以随时发送数据：

```protobuf
service ChatService {
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

```go
func (s *server) Chat(stream pb.ChatService_ChatServer) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }
        // 收到消息后回复
        stream.Send(&pb.ChatMessage{
            User:    "服务器",
            Content: "收到: " + msg.Content,
        })
    }
}
```

### 4. 拦截器（中间件）

gRPC 的拦截器类似 HTTP 中间件，可以在请求前后执行通用逻辑：

```go
// 一元拦截器
func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    start := time.Now()
    log.Printf("请求: %s", info.FullMethod)

    resp, err := handler(ctx, req)

    log.Printf("完成: %s, 耗时: %v", info.FullMethod, time.Since(start))
    return resp, err
}

// 注册拦截器
s := grpc.NewServer(
    grpc.UnaryInterceptor(loggingInterceptor),
)
```

### 5. 超时和取消

```go
// 客户端设置超时
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.GetUser(ctx, req)
if err != nil {
    // 检查是否超时
    if ctx.Err() == context.DeadlineExceeded {
        log.Println("请求超时")
    }
}
```

### 6. 错误处理

gRPC 使用状态码表示错误：

```go
import "google.golang.org/grpc/codes"
import "google.golang.org/grpc/status"

// 返回错误
return nil, status.Error(codes.NotFound, "用户不存在")
return nil, status.Error(codes.InvalidArgument, "参数错误")
return nil, status.Error(codes.Internal, "内部错误")

// 客户端判断错误
resp, err := client.GetUser(ctx, req)
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        switch st.Code() {
        case codes.NotFound:
            fmt.Println("用户不存在")
        case codes.InvalidArgument:
            fmt.Println("参数错误")
        }
    }
}
```

## 常见场景

### 场景一：微服务间通信

```go
// 用户服务
type UserServer struct { pb.UnimplementedUserServiceServer }

// 订单服务调用用户服务：连接应长驻复用（进程启动时建一次），而不是每个请求新建
conn, _ := grpc.NewClient("user-service:50051",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
userClient := pb.NewUserServiceClient(conn)
user, _ := userClient.GetUser(ctx, &pb.GetUserRequest{Id: userID})
```

### 场景二：TLS 加密通信

```go
creds, _ := credentials.NewServerTLSFromFile("cert.pem", "key.pem")
s := grpc.NewServer(grpc.Creds(creds))

// 客户端
creds, _ := credentials.NewClientTLSFromFile("cert.pem", "example.com")
conn, _ := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(creds))
```

## 注意事项与常见错误

1. **UnimplementedServer**：服务端结构体必须嵌入 `UnimplementedXxxServer`，否则编译不通过。这是为了向前兼容。

2. **protoc 路径**：生成代码时注意 `go_package` 选项和输出路径的配置，否则生成的代码 import 路径不对。

3. **连接不释放**：客户端 `grpc.Dial` 返回的连接必须用 `conn.Close()` 关闭。

4. **默认不加密**：gRPC 默认使用不安全连接。生产环境必须使用 TLS。

5. **消息大小限制**：gRPC 默认最大消息大小为 4MB。传输大文件应使用流式 RPC：

```go
grpc.MaxRecvMsgSize(10 * 1024 * 1024) // 设置为 10MB
```

6. **阻塞调用**：一元 RPC 是阻塞的，在客户端应该使用带超时的 Context。

7. **status.FromError 与 errors.Is 的分工**：`status.FromError` 解析 gRPC 状态码，`errors.Is` 匹配应用层 sentinel 错误。跨服务传递业务错误有两种做法：要么统一用状态码 + details，要么用 `status.FromError` 包装后再在客户端 `errors.Is(status.Convert(err).Err(), target)`。混着判断又不做转换，是最常见的"为什么 Is 判不出来"的原因。

## Protobuf 兼容性设计要点

Protobuf 靠字段编号（field number）识别数据而不是字段名，这决定了演进规则：**已发布的编号绝不能复用**。字段删除时必须用 `reserved` 封锁编号与名字，防止后人不知情地重用导致新旧消息互相错位解析：

```protobuf
message User {
  reserved 4, 5;            // 曾经的 phone、fax 字段，编号永久封存
  reserved "phone", "fax";  // 名字一并封存，避免误加回
  string id = 1;
  string name = 2;
  string email = 3;
  // 新增字段用新编号追加即可：旧客户端会跳过不认识的字段
  string avatar_url = 6;
}
```

配套的三条工程约定：

1. **标量选择**：金额用 `int64`（分）或字符串表示，绝不用 `float`（二进制浮点误差在金额上不可接受）；时间统一用 `google.protobuf.Timestamp`，不要自定义秒/纳秒字段。
2. **枚举演进**：`proto3` 枚举第一个值必须是 `0` 且通常命名为 `_UNSPECIFIED`，作为向后兼容的默认值；枚举值同样只增不改。
3. **包与路径**：`option go_package` 决定生成代码的 import 路径，多服务共享 proto 时提前规划，后期改路径是全仓库级重构。

## 进阶用法

### 健康检查

```go
import "google.golang.org/grpc/health"
import "google.golang.org/grpc/health/grpc_health_v1"

// 服务端注册健康检查
healthServer := health.NewServer()
healthServer.SetServingStatus("user.UserService", grpc_health_v1.HealthCheckResponse_SERVING)
grpc_health_v1.RegisterHealthServer(s, healthServer)
```

### 反射

注册反射服务后，可以使用 grpcurl 等工具调试：

```go
import "google.golang.org/grpc/reflection"

s := grpc.NewServer()
reflection.Register(s) // 注册反射服务
```

```bash
# 使用 grpcurl 调试
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 user.UserService/GetUser -d '{"id":"123"}'
```

## 本篇小结

1. gRPC = HTTP/2 传输 + Protobuf 序列化 + 代码生成：`.proto` 是唯一事实源，protoc 生成类型安全的服务端接口与客户端 Stub，调用远程方法如同调用本地函数。
2. 四种通信模式按需选择：一元调用对应普通请求-响应；服务端流适合列表推送，客户端流适合批量上报，双向流适合实时会话。流式接口中 `io.EOF` 表示流正常结束，其余错误直接向上传递。
3. 客户端用 `grpc.NewClient`（`grpc.Dial` 已废弃），连接懒建立、长驻复用；每次调用必须带 deadline，超时会沿着调用链向下游传播。
4. 错误用 `codes` + `status` 表达，客户端 `status.FromError` 解析；拦截器承载日志、鉴权、恢复等横切逻辑，一元与流式拦截器需要分别注册。
5. Protobuf 兼容性靠纪律维持：字段编号与枚举值只增不改，删除字段必须 `reserved`，金额不用 float，时间用 Timestamp。生产环境必开 TLS，调试时注册 reflection 服务配合 grpcurl。

## 动手实践

1. 把本篇的 UserService 示例从零跑通：定义 proto、生成代码、实现服务端与客户端，分别用正常、超时（服务端 `time.Sleep(10*time.Second)`）与 `codes.NotFound` 三种情况运行客户端，记录三种输出。
2. 给 GetUser 增加服务端流版本 `StreamUsers`，一次返回全部用户，客户端用 `stream.Recv()` 循环消费；随后在服务端 Send 循环里检查 `ctx.Err()`，体会取消传播对流式服务端的意义。
3. 写一个一元拦截器统计每个方法的耗时与错误码，注册到服务器后用 grpcurl 打 10 次请求，观察拦截器日志顺序，并思考它与 HTTP 中间件洋葱模型的对应关系。
