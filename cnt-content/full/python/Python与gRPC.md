---
order: 77
title: Python与gRPC
module: python
category: Python
difficulty: intermediate
description: gRPC与Protocol Buffers
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与消息队列
  - python/Python与WebSocket
  - 'python/Python与CI-CD'
  - python/Python与性能优化
prerequisites:
  - python/语法速查
---

## 什么是 gRPC

gRPC 是 Google 开发的高性能远程过程调用（RPC）框架。它让客户端像调用本地函数一样调用服务器上的函数，不需要关心底层的网络通信细节。

gRPC 使用 Protocol Buffers（简称 protobuf）作为接口定义语言和序列化格式，默认基于 HTTP/2 协议传输，支持双向流、连接多路复用等特性。与 REST API 相比，gRPC 的数据传输更紧凑、速度更快，特别适合微服务之间的高效通信。

## 基础概念

### Protocol Buffers

Protocol Buffers 是一种结构化数据序列化格式，类似于 JSON，但更小、更快。你在一个 .proto 文件中定义数据结构，protobuf 编译器会自动生成 Python 代码。

### 服务定义

在 .proto 文件中定义服务接口，包括方法名、请求参数和响应参数。gRPC 支持四种通信模式：

- 一元调用（Unary）：客户端发一个请求，服务器回一个响应，类似普通函数调用
- 服务端流：客户端发一个请求，服务器回一个流式响应
- 客户端流：客户端发一个流式请求，服务器回一个响应
- 双向流：双方都可以流式发送消息

### 存根（Stub）

客户端通过存根调用服务端的方法。存根是 protobuf 编译器根据 .proto 文件自动生成的客户端代码，它把方法调用转换为网络请求。

## 快速上手

### 安装依赖

```bash
# 安装 gRPC 和 protobuf 工具
pip install grpcio grpcio-tools
```

### 定义 Protobuf 文件

创建文件 `greeter.proto`：

```protobuf
// 指定 protobuf 语法版本
syntax = "proto3";

// 包名
package greeter;

// 定义请求消息
message HelloRequest {
  string name = 1;
}

// 定义响应消息
message HelloReply {
  string message = 1;
}

// 定义服务
service Greeter {
  // 一元调用：发送名字，返回问候
  rpc SayHello (HelloRequest) returns (HelloReply);
}
```

### 生成 Python 代码

```bash
# 从 proto 文件生成 Python 代码
python -m grpc_tools.protoc \
  -I. \
  --python_out=. \
  --grpc_python_out=. \
  greeter.proto
```

这会生成两个文件：`greeter_pb2.py`（消息类）和 `greeter_pb2_grpc.py`（服务存根）。

### 编写服务端

```python
# server.py
import grpc
from concurrent import futures
import greeter_pb2
import greeter_pb2_grpc

# 实现服务接口
class GreeterServicer(greeter_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        """处理 SayHello 请求"""
        # request.name 就是客户端传来的名字
        reply = greeter_pb2.HelloReply(message=f"你好, {request.name}!")
        return reply

# 启动服务器
def serve():
    # 创建 gRPC 服务器，使用线程池处理并发
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # 注册服务
    greeter_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)
    # 监听端口
    server.add_insecure_port('[::]:50051')
    server.start()
    print("服务器已启动，监听端口 50051")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

### 编写客户端

```python
# client.py
import grpc
import greeter_pb2
import greeter_pb2_grpc

def run():
    # 连接到 gRPC 服务器
    with grpc.insecure_channel('localhost:50051') as channel:
        # 创建存根
        stub = greeter_pb2_grpc.GreeterStub(channel)
        # 调用远程方法
        response = stub.SayHello(greeter_pb2.HelloRequest(name='世界'))
        print(f"收到响应: {response.message}")

if __name__ == '__main__':
    run()
```

## 详细用法

### 定义复杂消息类型

```protobuf
syntax = "proto3";
package ecommerce;

// 商品消息
message Product {
  int32 id = 1;
  string name = 2;
  float price = 3;
  repeated string tags = 4;  // 列表类型
}

// 订单消息
message Order {
  int32 id = 1;
  string user_id = 2;
  repeated Product items = 3;  // 嵌套消息的列表
  double total = 4;
}

// 请求和响应
message GetOrderRequest {
  int32 order_id = 1;
}

message ListOrdersRequest {
  string user_id = 1;
  int32 page_size = 2;
}

message ListOrdersResponse {
  repeated Order orders = 1;
}

// 订单服务
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
}
```

### 服务端流式响应

```protobuf
// 服务端流：服务器持续推送数据
message SubscribeRequest {
  string topic = 1;
}

message Notification {
  string message = 1;
  int64 timestamp = 2;
}

service NotificationService {
  // returns 前面加 stream 表示服务端流
  rpc Subscribe(SubscribeRequest) returns (stream Notification);
}
```

```python
# 服务端实现
import time
import grpc
import notification_pb2
import notification_pb2_grpc

class NotificationServicer(notification_pb2_grpc.NotificationServiceServicer):
    def Subscribe(self, request, context):
        """持续推送通知"""
        count = 0
        while context.is_active():  # 客户端还在线
            count += 1
            yield notification_pb2.Notification(
                message=f"[{request.topic}] 通知 #{count}",
                timestamp=int(time.time())
            )
            time.sleep(2)  # 每 2 秒推送一条
```

```python
# 客户端接收流式响应
def subscribe():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = notification_pb2_grpc.NotificationServiceStub(channel)
        # 迭代接收流式响应
        for notification in stub.Subscribe(
            notification_pb2.SubscribeRequest(topic='news')
        ):
            print(f"收到通知: {notification.message}")
```

### 客户端流式请求

```protobuf
// 客户端流：客户端持续发送数据
message UploadChunk {
  string filename = 1;
  bytes data = 2;
}

message UploadResponse {
  bool success = 1;
  int32 size = 2;
}

service FileService {
  // 请求前面加 stream 表示客户端流
  rpc Upload(stream UploadChunk) returns (UploadResponse);
}
```

```python
# 服务端实现
class FileServicer(file_pb2_grpc.FileServiceServicer):
    def Upload(self, request_iterator, context):
        """接收客户端流式上传"""
        total_size = 0
        for chunk in request_iterator:
            total_size += len(chunk.data)
            # 在这里处理每个数据块（如写入文件）
        return file_pb2.UploadResponse(success=True, size=total_size)
```

### 错误处理

```python
import grpc
from grpc import StatusCode

class GreeterServicer(greeter_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        if not request.name:
            # 返回错误状态码
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("名字不能为空")
            return greeter_pb2.HelloReply()

        return greeter_pb2.HelloReply(message=f"你好, {request.name}!")
```

客户端处理错误：

```python
try:
    response = stub.SayHello(greeter_pb2.HelloRequest(name=''))
except grpc.RpcError as e:
    print(f"错误码: {e.code()}")     # INVALID_ARGUMENT
    print(f"错误详情: {e.details()}")  # 名字不能为空
```

### 添加超时

```python
# 客户端设置超时（5 秒）
try:
    response = stub.SayHello(
        greeter_pb2.HelloRequest(name='测试'),
        timeout=5
    )
except grpc.RpcError as e:
    if e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
        print("请求超时")
```

## 常见场景

### 微服务间通信

在微服务架构中，gRPC 常用于服务间的内部通信。相比 REST API，gRPC 更快、更节省带宽：

```python
# 用户服务客户端
class UserClient:
    def __init__(self):
        self.channel = grpc.insecure_channel('user-service:50051')
        self.stub = user_pb2_grpc.UserServiceStub(self.channel)

    def get_user(self, user_id: int):
        try:
            return self.stub.GetUser(user_pb2.GetUserRequest(id=user_id), timeout=3)
        except grpc.RpcError:
            return None

    def close(self):
        self.channel.close()
```

### 在 FastAPI 中集成 gRPC

```python
from fastapi import FastAPI, HTTPException
import grpc
import user_pb2
import user_pb2_grpc

app = FastAPI()

# 创建 gRPC 客户端连接
channel = grpc.insecure_channel('localhost:50051')
stub = user_pb2_grpc.UserServiceStub(channel)

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    try:
        response = stub.GetUser(
            user_pb2.GetUserRequest(id=user_id),
            timeout=5
        )
        return {"id": response.id, "name": response.name}
    except grpc.RpcError as e:
        raise HTTPException(status_code=404, detail="用户不存在")
```

## 注意事项与常见错误

### protobuf 字段编号不能修改

.proto 文件中每个字段后面的编号（如 `string name = 1;` 中的 1）一旦确定就不能修改。修改编号会导致旧数据无法正确反序列化。新增字段应该使用新的编号。

### 默认值与字段存在性

protobuf3 中所有字段都有默认值（字符串为空串、数字为 0、布尔为 false）。你无法区分一个字段是未设置还是被设置为默认值。如果需要区分，可以使用 `optional` 关键字：

```protobuf
message Example {
  optional string name = 1;  // 可以区分未设置和空串
}
```

### 连接管理

gRPC 连接是长连接，应该复用而不是每次请求都创建新连接。在应用启动时创建连接，在关闭时释放：

```python
# 好的做法：复用连接
channel = grpc.insecure_channel('localhost:50051')
stub = MyServiceStub(channel)
# 多次使用 stub...
# 应用关闭时
channel.close()
```

### 不要在 gRPC 中传输大文件

gRPC 默认最大消息大小为 4MB。如果需要传输大文件，应该使用流式传输分块发送，或者使用对象存储（如 S3）只传输文件 URL。

## 进阶用法

### 使用 TLS 加密

```python
# 安全连接（TLS）
import grpc

# 读取证书
with open('server.crt', 'rb') as f:
    credentials = grpc.ssl_channel_credentials(f.read())

channel = grpc.secure_channel('localhost:50051', credentials)
```

### 拦截器

拦截器类似于中间件，可以在请求前后添加通用逻辑（如日志、认证）：

```python
import grpc
import time

class LoggingInterceptor(grpc.ServerInterceptor):
    """日志拦截器"""
    def intercept_service(self, continuation, handler_call_details):
        start = time.time()
        method = handler_call_details.method
        print(f"收到请求: {method}")

        handler = continuation(handler_call_details)

        duration = time.time() - start
        print(f"请求完成: {method}, 耗时: {duration:.3f}s")
        return handler

# 使用拦截器
server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    interceptors=[LoggingInterceptor()]
)
```

### 健康检查

gRPC 内置了健康检查协议：

```python
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

# 创建健康检查服务
health_servicer = health.HealthServicer()
health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

# 设置服务状态为健康
health_servicer.set('', health_pb2.HealthCheckResponse.SERVING)
```
