---
order: 730
title: Java HttpClient 与 WebSocket 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java HttpClient 与 WebSocket 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/071-JavaNetworkProgramming'
  - 'java/072-NetworkProgramming'
prerequisites:
  - 'java/071-JavaNetworkProgramming'
---

## 0. 本节阅读指引（先读这一节）

本篇是「HttpClient 与 WebSocket」语法速查手册，按需查阅。

零基础第一遍只读：HttpClient 创建、HttpRequest 请求、发送请求；WebSocket、传统 Socket 遇到再查。

前置：068 Java 网络编程。


## HttpClient 创建

**基本写法：创建客户端**
`HttpClient.newHttpClient();`
```java
// 创建默认 HTTP 客户端
HttpClient client = HttpClient.newHttpClient();
```

---

**基本写法：自定义客户端**
```java
HttpClient.newBuilder()
  .version(<版本>)
  .connectTimeout(<超时>)
  .build();
```
```java
// 配置 HTTP/2 与超时
HttpClient client = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)
    .connectTimeout(Duration.ofSeconds(10))
    .build();
```

---

## HttpRequest 请求

**基本写法：构建 GET 请求**
```java
HttpRequest.newBuilder()
  .uri(URI.create(<URL>))
  .GET()
  .build();
```
```java
// 构建 GET 请求
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .GET()
    .build();
```

---

**基本写法：POST 请求体**
```java
HttpRequest.newBuilder()
  .uri(URI.create(<URL>))
  .POST(HttpRequest.BodyPublishers.ofString(<正文>))
  .build();
```
```java
// 发送 JSON POST 请求
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\"name\":\"Tom\"}"))
    .build();
```

---

**基本写法：设置头**
`<builder>.header(<名称>, <值>);`
```java
// 添加请求头
builder.header("Authorization", "Bearer token");
```

---

**基本写法：设置超时**
`<builder>.timeout(<超时>);`
```java
// 请求级超时
builder.timeout(Duration.ofSeconds(5));
```

---

## 发送请求

**基本写法：同步发送**
`<client>.send(<请求>, <响应处理器>);`
```java
// 同步获取响应
HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
int code = resp.statusCode();
String body = resp.body();
```

---

**基本写法：异步发送**
`<client>.sendAsync(<请求>, <处理器>);`
```java
// 异步获取响应
client.sendAsync(req, HttpResponse.BodyHandlers.ofString())
    .thenAccept(r -> System.out.println(r.body()));
```

---

**基本写法：响应处理器**
`HttpResponse.BodyHandlers.<类型>();`
```java
// 各种响应体处理器
HttpResponse.BodyHandlers.ofString();   // 字符串
HttpResponse.BodyHandlers.ofByteArray(); // 字节数组
HttpResponse.BodyHandlers.ofFile(Path.of("out.bin")); // 写入文件
HttpResponse.BodyHandlers.discarding();   // 丢弃
```

---

## WebSocket

**基本写法：创建 WebSocket**
```java
<client>.newWebSocketBuilder()
  .buildAsync(URI.create(<URL>), <监听器>)
  .join();
```
```java
// 连接 WebSocket
WebSocket ws = HttpClient.newHttpClient()
    .newWebSocketBuilder()
    .buildAsync(URI.create("wss://example.com/ws"), new WebSocket.Listener() {
        @Override public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            System.out.println("recv: " + data);
            return null;
        }
    })
    .join();
```

---

**基本写法：发送消息**
`<ws>.sendText(<文本>, <是否最后>);`
```java
// 发送文本帧
ws.sendText("hello", true);
```

---

**基本写法：发送二进制**
`<ws>.sendBinary(<字节>, <是否最后>);`
```java
// 发送二进制帧
ws.sendBinary(ByteBuffer.wrap(new byte[]{1,2,3}), true);
```

---

**基本写法：关闭**
`<ws>.sendClose(<状态码>, <原因>);`
```java
// 发送关闭帧
ws.sendClose(WebSocket.NORMAL_CLOSURE, "bye");
```

---

## 传统 Socket

**基本写法：创建客户端**
`new Socket(<host>, <port>);`
```java
// 连接 TCP 服务端
try (Socket s = new Socket("example.com", 8080)) {
    OutputStream out = s.getOutputStream();
    out.write("hi\n".getBytes());
}
```

---

**基本写法：创建服务端**
`new ServerSocket(<端口>);`
```java
// 监听端口
try (ServerSocket ss = new ServerSocket(8080)) {
    Socket client = ss.accept();
    InputStream in = client.getInputStream();
}
```
