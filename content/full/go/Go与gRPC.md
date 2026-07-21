---
order: 63
title: Go与gRPC
module: go
category: Go
difficulty: intermediate
description: gRPC与Protobuf
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与GraphQL
  - go/Go与HTTP服务器
  - go/Go与Kubernetes
  - go/Go与分布式追踪
prerequisites:
  - go/概述与环境配置
---

## 概述

gRPC 是 Google 开源的高性能远程过程调用（RPC）框架，使用 Protocol Buffers 作为接口定义语言和序列化格式。与 REST/JSON 相比，gRPC 使用二进制传输，性能更高；强类型定义，开发更安全；支持双向流，通信更灵活。Go 是 gRPC 的一等公民语言，官方提供了完整的 SDK。

## 基础概念

在开始编码之前，需要理解 gRPC 的几个核心概念：

- **Protobuf**：Protocol Buffers，一种二进制序列化格式，比 JSON 更小更快。用 `.proto` 文件定义数据结构和服务接口。
- **Service**：在 `.proto` 文件中定义的一组 RPC 方法，类似于接口。
- **Stub/Client**：根据 `.proto` 文件自动生成的客户端代码，调用远程方法就像调用本地函数。
- **四种通信模式**：一元调用（请求-响应）、服务端流、客户端流、双向流。
- **Channel**：客户端与服务端之间的连接，底层使用 HTTP/2。

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
protoc --go_out=. --go-grpc_out=. proto/user.proto
```

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

### 5. 实现客户端

```go
package main

import (
    "context"
    "log"

    pb "myapp/proto/user"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    // 连接服务器
    conn, err := grpc.Dial("localhost:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // 创建客户端
    client := pb.NewUserServiceClient(conn)

    // 调用远程方法
    resp, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: "123"})
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("用户: %s, 邮箱: %s\n", resp.User.Name, resp.User.Email)
}
```

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

// 订单服务调用用户服务
conn, _ := grpc.Dial("user-service:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
userClient := pb.NewUserServiceClient(conn)
user, _ := userClient.GetUser(ctx, &pb.GetUserRequest{Id: userID})
```

### 场景二：TLS 加密通信

```go
creds, _ := credentials.NewServerTLSFromFile("cert.pem", "key.pem")
s := grpc.NewServer(grpc.Creds(creds))

// 客户端
creds, _ := credentials.NewClientTLSFromFile("cert.pem", "example.com")
conn, _ := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(creds))
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
