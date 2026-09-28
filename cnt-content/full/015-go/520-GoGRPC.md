---
order: 520
title: Go 与 gRPC：两个服务之间说同一种话
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"订单服务调用户服务"为主线学 gRPC：proto 定义与代码生成、grpc.NewClient 与超时纪律、四种通信模式、拦截器、状态码错误处理、Protobuf 演进纪律与 grpcurl 调试，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'go/470-GoHTTP'
  - 'go/530-GoGraphQL'
  - 'go/510-GoDistributedTracing'
  - 'go/610-GoKubernetes'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：订单服务要调用户服务，然后接口悄悄变了

订单服务需要用户昵称，于是你 HTTP 调用户服务的 `/api/user?id=123`，解析 JSON。三个月后用户服务把 `name` 字段改名 `nickname`，返回结构多了层包装——订单服务的解析静默失败，日志里只有一串零值。

这就是服务间裸调 REST 的病根：**没有契约**。接口的形状只存在于对方的实现里，双方靠口口相传。gRPC 的思路是把契约变成一个 `.proto` 文件：字段类型、方法签名、服务名全部写死在里面，两端各自生成类型安全的代码，编译期就发现不兼容。传输走 HTTP/2（多路复用、头部压缩、双向流），序列化走 Protobuf 二进制（靠字段编号而非字段名识别数据，体积小、向后兼容规则明确）。

## 动手第一步：装工具、写契约、生成代码

```bash
# protoc 编译器
# Windows: 从 https://github.com/protocolbuffers/protobuf/releases 下载
# Mac: brew install protobuf
# Linux: apt install protobuf-compiler

go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
go get google.golang.org/grpc
```

`proto/user.proto`：

```protobuf
syntax = "proto3";

package user;

option go_package = "myapp/proto/user";

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

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

生成代码（两个输出：`user.pb.go` 是消息序列化，`user_grpc.pb.go` 是服务接口与客户端 Stub）：

```bash
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/user.proto
```

从这一刻起，"用户服务提供 GetUser(id) 返回 User"不再依赖口头约定，它编译进两边的代码。字段后面的 `= 1` 是字段编号——Protobuf 靠它在二进制流里识别数据，这个编号一旦发布就永久属于这个字段（演进纪律见后文）。

## 动手第二步：服务端实现与客户端调用

服务端：

```go
package main

import (
    "context"
    "log"
    "net"

    pb "myapp/proto/user"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type server struct {
    pb.UnimplementedUserServiceServer // 必须嵌入：proto 加新方法时旧实现不用改
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    if req.Id == "" {
        return nil, status.Error(codes.InvalidArgument, "id 不能为空")
    }
    return &pb.GetUserResponse{
        User: &pb.User{Id: req.Id, Name: "小明", Email: "ming@example.com"},
    }, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }
    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, &server{})
    log.Println("gRPC 服务器启动在 :50051")
    log.Fatal(s.Serve(lis))
}
```

客户端：

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
    // grpc.NewClient（gRPC-Go 1.63+，grpc.Dial 已废弃）是懒连接：
    // 立即返回，首次 RPC 时才真正建连，失败也在那时才报错
    conn, err := grpc.NewClient("localhost:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewUserServiceClient(conn)

    // 一元调用必须带超时：NewClient 的失败不在创建时暴露，
    // 超时控制从"拨号阶段"前移到了"每次调用"
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: "123"})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("用户: %s, 邮箱: %s", resp.User.Name, resp.User.Email)
}
```

先 `go run server.go` 再 `go run client.go`，预期输出：

```text
2026/09/09 10:00:00 gRPC 服务器启动在 :50051
2026/09/09 10:00:05 用户: 小明, 邮箱: ming@example.com
```

旧教程里的 `grpc.Dial` 会在调用时立刻建连（可用 `WithBlock` 改阻塞），gRPC-Go 1.63（2023-12）起废弃。两者的关键行为差异：`NewClient` 用名字解析器 + 负载均衡器异步建连，连接失败不在创建时报错而是在第一次 RPC 上体现——这正是一元调用必须带 deadline 的结构性理由。连接本身长驻复用：进程启动建一次、包级或 DI 持有，不要每个请求新建。

## 动手第三步：流式——四种通信模式按需选

契约里方法签名多一个 `stream` 字，通信形状就变了：

```protobuf
service OrderService {
  rpc ListOrders(ListOrdersRequest) returns (stream Order);   // 服务端流
  rpc UploadLogs(stream LogEntry) returns (UploadSummary);    // 客户端流
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);  // 双向流
}
```

服务端流的实现与消费——`io.EOF` 表示流正常结束，其余错误直接向上传：

```go
// 服务端：逐条 Send，最后 return nil
func (s *server) ListOrders(req *pb.ListOrdersRequest, stream pb.OrderService_ListOrdersServer) error {
    for _, order := range getOrders(req.UserId) {
        if err := stream.Send(order); err != nil {
            return err
        }
    }
    return nil
}

// 客户端：循环 Recv 直到 EOF
stream, _ := client.ListOrders(ctx, &pb.ListOrdersRequest{UserId: "123"})
for {
    order, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        return err
    }
    fmt.Println(order.Id)
}
```

客户端流在服务端循环 `Recv`，收到 EOF 后 `stream.SendAndClose(...)` 返回汇总；双向流则两端同时 Recv/Send。选择口诀：一元对应普通请求-响应，服务端流对应列表/推送，客户端流对应批量上报，双向流对应实时会话。流式服务端在长循环里应周期检查 `ctx.Err()`——客户端取消会传导到这里，别再傻算一百万条。

## 讲为什么：错误码、拦截器与演进纪律

### 错误用状态码而不是字符串

跨服务错误不能靠 `errors.Is` 直接比对（对端结构不同），gRPC 用状态码表达：

```go
// 服务端
return nil, status.Error(codes.NotFound, "用户不存在")
return nil, status.Error(codes.InvalidArgument, "参数错误")

// 客户端
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        switch st.Code() {
        case codes.NotFound:
            fmt.Println("用户不存在")
        case codes.DeadlineExceeded:
            fmt.Println("调用超时")
        }
    }
}
```

分工要记牢：`status.FromError` 解析跨服务的 gRPC 状态码，`errors.Is` 只在本进程内的 sentinel 错误上工作。"为什么 errors.Is 判不出来"的最常见原因，就是拿它去比一个从网络上反序列化回来的错误——先 `status.Convert(err).Err()` 转换再判。

### 拦截器是 gRPC 的中间件

日志、鉴权、panic 恢复、指标都写在拦截器里，等价于 HTTP 的洋葱模型：

```go
func loggingInterceptor(ctx context.Context, req any,
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {

    start := time.Now()
    resp, err := handler(ctx, req) // 洋葱的"内层"
    log.Printf("%s 耗时 %v err=%v", info.FullMethod, time.Since(start), err)
    return resp, err
}

s := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor))
```

注意一元与流式拦截器是两个 API（`grpc.UnaryInterceptor` / `grpc.StreamInterceptor`），要分别注册；生产中通常用链式版本（`grpc.ChainUnaryInterceptor`）叠多层。

### Protobuf 的兼容性靠纪律维持

字段编号是二进制协议的身份标识，于是规则很硬：**已发布的编号与字段名绝不能复用**。删除字段时用 `reserved` 封存，防止后人不知情地加回来导致新旧消息错位解析：

```protobuf
message User {
  reserved 4, 5;            // 曾经的 phone、fax，编号永久封存
  reserved "phone", "fax";  // 名字一并封存
  string id = 1;
  string name = 2;
  string email = 3;
  string avatar_url = 6;    // 新增字段追加新编号：旧客户端会跳过不认识的字段
}
```

三条配套约定：金额用 `int64`（分）或字符串，绝不用 float（二进制浮点误差在金额上不可接受）；时间统一 `google.protobuf.Timestamp`，不自定义秒/纳秒字段；proto3 枚举第一个值必须是 0（惯例命名 `_UNSPECIFIED`），枚举值只增不改。`option go_package` 决定生成代码的 import 路径，多服务共享 proto 时提前规划——后期改是全仓库级重构。

## 坑点与自检

**坑 1：忘嵌 UnimplementedXxxServer。** 编译不过；这是向前兼容设计——proto 加了新方法而旧实现未更新时，运行期返回 UNIMPLEMENTED 而不是崩溃。

**坑 2：生成代码 import 路径不对。** `go_package` 与 `--go_opt=paths=source_relative` 的组合决定输出位置，换目录重新生成前先想清楚。

**坑 3：默认不加密。** `insecure.NewCredentials()` 只配本地开发；生产必须 TLS（服务端 `grpc.Creds(creds)`，客户端 `credentials.NewClientTLSFromFile`）。

**坑 4：4MB 消息上限。** 默认单条消息最大 4MB，传大对象直接报错。大文件走流式分块，而不是调大 `grpc.MaxRecvMsgSize`——那只是把内存问题推迟。

**坑 5：没有 deadline 的一元调用。** 对端 hang 住，你的 goroutine 与连接池就跟着 hang。团队纪律：每个 RPC 的 ctx 都带 timeout，超时会沿调用链向下游传播（下游收到的是剩余时间）。

自检——能不看文档回答这些吗：

1. gRPC = 哪三种技术组合？字段编号在协议里起什么作用？
2. grpc.Dial 与 grpc.NewClient 的行为差异？为什么 NewClient 时代超时必须放在每次调用上？
3. 四种通信模式各适合什么场景？流式 RPC 里 io.EOF 的含义？
4. 服务端如何返回"资源不存在"？客户端如何区分超时与不存在？
5. 删除一个字段为什么要 reserved 编号和名字两样？
6. 拦截器与 HTTP 中间件的对应关系？一元与流式为什么要分别注册？

## 练习

1. 从零跑通本篇示例，然后给 GetUser 服务端加 `time.Sleep(10*time.Second)`，分别用 2 秒与 20 秒超时的客户端调用，观察 `codes.DeadlineExceeded` 与正常返回两种输出。
2. 增加 `rpc StreamUsers(Empty) returns (stream User)`：服务端逐条发 3 个用户，客户端循环消费；再在 Send 循环里检查 `ctx.Err()`，用超时 1 秒的客户端验证取消会中断服务端。
3. 注册 reflection 服务后装 grpcurl：`grpcurl -plaintext localhost:50051 list` 列出服务，再调用一次 GetUser；写一个一元拦截器打印每个请求的方法名与耗时，对比 grpcurl 打出的日志。

## 下一步

- 同为 API 技术的对照与取舍：[Go 与 GraphQL](/go/530-GoGraphQL)；
- 外部 API 仍用 REST 时的客户端工程：[Go HTTP 客户端](/go/460-GoHTTPClient)；
- 跨服务排查靠什么串起来：[Go 与分布式追踪](/go/510-GoDistributedTracing)；
- gRPC 服务在 K8s 里的部署与健康检查：[Go 与 Kubernetes](/go/610-GoKubernetes)。
