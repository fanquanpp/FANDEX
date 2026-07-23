---
order: 180
tags:
  - java
  - network
difficulty: advanced
title: 网络编程
module: java
category: 'Java Basics'
description: Java网络编程基础、Socket编程、URL处理、NIO网络编程与HTTP客户端详解。
author: fanquanpp
updated: '2026-06-13'
related:
  - java/流式API
  - java/SpringBoot学习笔记
  - java/SpringCloud微服务开发
  - java/Swing图形界面
prerequisites:
  - java/概述与开发环境
---

## 1. 网络编程基础

### 1.1 网络基本概念

```java
import java.net.*;

public class NetworkBasics {
    public static void main(String[] args) throws Exception {
        // 获取本机信息
        InetAddress localHost = InetAddress.getLocalHost();
        System.out.println("主机名: " + localHost.getHostName());
        System.out.println("IP地址: " + localHost.getHostAddress());

        // 通过域名获取地址
        InetAddress[] addresses = InetAddress.getAllByName("www.baidu.com");
        for (InetAddress addr : addresses) {
            System.out.println("百度IP: " + addr.getHostAddress());
        }

        // 检测可达性
        boolean reachable = InetAddress.getByName("www.baidu.com")
            .isReachable(5000);  // 5秒超时
        System.out.println("百度可达: " + reachable);

        // InetSocketAddress: 包含IP和端口
        InetSocketAddress socketAddr = new InetSocketAddress("localhost", 8080);
        System.out.println("地址: " + socketAddr.getAddress());
        System.out.println("端口: " + socketAddr.getPort());
    }
}
```

### 1.2 URL 处理

```java
import java.net.*;
import java.io.*;

public class URLDemo {
    public static void main(String[] args) throws Exception {
        URL url = new URL("https://example.com:443/api/users?page=1#top");

        System.out.println("协议: " + url.getProtocol());     // https
        System.out.println("主机: " + url.getHost());         // example.com
        System.out.println("端口: " + url.getPort());         // 443
        System.out.println("路径: " + url.getPath());         // /api/users
        System.out.println("查询: " + url.getQuery());        // page=1
        System.out.println("片段: " + url.getRef());          // top

        // URL编码解码
        String encoded = URLEncoder.encode("你好世界", "UTF-8");
        String decoded = URLDecoder.decode(encoded, "UTF-8");
        System.out.println("编码: " + encoded);
        System.out.println("解码: " + decoded);

        // 读取URL内容
        URLConnection conn = url.openConnection();
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10000);
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        }
    }
}
```

## 2. Socket 编程

### 2.1 TCP 服务器与客户端

```java
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

// TCP服务器
class TCPServer {
    public static void main(String[] args) {
        int port = 8888;
        ExecutorService pool = Executors.newFixedThreadPool(10);

        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("服务器启动，监听端口: " + port);

            while (true) {
                Socket clientSocket = serverSocket.accept();
                System.out.println("客户端连接: " + clientSocket.getRemoteSocketAddress());
                pool.submit(() -> handleClient(clientSocket));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static void handleClient(Socket socket) {
        try (socket;
             BufferedReader in = new BufferedReader(
                 new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

            String inputLine;
            while ((inputLine = in.readLine()) != null) {
                System.out.println("收到: " + inputLine);
                out.println("Echo: " + inputLine);

                if ("bye".equalsIgnoreCase(inputLine.trim())) {
                    break;
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

// TCP客户端
class TCPClient {
    public static void main(String[] args) {
        String host = "localhost";
        int port = 8888;

        try (Socket socket = new Socket(host, port);
             BufferedReader in = new BufferedReader(
                 new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader console = new BufferedReader(
                 new InputStreamReader(System.in))) {

            System.out.println("已连接到服务器: " + socket.getRemoteSocketAddress());

            // 读取服务器响应的线程
            Thread readerThread = new Thread(() -> {
                String response;
                try {
                    while ((response = in.readLine()) != null) {
                        System.out.println("服务器: " + response);
                    }
                } catch (IOException e) {
                    // 连接关闭
                }
            });
            readerThread.setDaemon(true);
            readerThread.start();

            // 从控制台读取输入并发送
            String userInput;
            while ((userInput = console.readLine()) != null) {
                out.println(userInput);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

### 2.2 UDP 编程

```java
import java.net.*;

// UDP服务器
class UDPServer {
    public static void main(String[] args) {
        int port = 9999;

        try (DatagramSocket socket = new DatagramSocket(port)) {
            byte[] buffer = new byte[1024];
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);

            System.out.println("UDP服务器启动，监听端口: " + port);

            while (true) {
                socket.receive(packet);
                String message = new String(packet.getData(), 0, packet.getLength());
                System.out.println("收到来自 " + packet.getSocketAddress() + ": " + message);

                // 回复
                String reply = "Echo: " + message;
                byte[] replyData = reply.getBytes();
                DatagramPacket replyPacket = new DatagramPacket(
                    replyData, replyData.length,
                    packet.getAddress(), packet.getPort()
                );
                socket.send(replyPacket);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

// UDP客户端
class UDPClient {
    public static void main(String[] args) {
        String host = "localhost";
        int port = 9999;

        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(5000);  // 5秒超时

            InetAddress address = InetAddress.getByName(host);
            String message = "Hello UDP Server";
            byte[] sendData = message.getBytes();

            DatagramPacket sendPacket = new DatagramPacket(
                sendData, sendData.length, address, port
            );
            socket.send(sendPacket);

            // 接收回复
            byte[] receiveBuffer = new byte[1024];
            DatagramPacket receivePacket = new DatagramPacket(receiveBuffer, receiveBuffer.length);
            socket.receive(receivePacket);

            String reply = new String(receivePacket.getData(), 0, receivePacket.getLength());
            System.out.println("服务器回复: " + reply);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## 3. NIO 网络编程

### 3.1 NIO 服务器

```java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.*;
import java.util.*;

public class NIOServer {
    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.bind(new InetSocketAddress(8888));
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        System.out.println("NIO服务器启动，监听端口: 8888");
        Charset charset = StandardCharsets.UTF_8;

        while (true) {
            selector.select();  // 阻塞直到有事件
            Iterator<SelectionKey> keys = selector.selectedKeys().iterator();

            while (keys.hasNext()) {
                SelectionKey key = keys.next();
                keys.remove();

                if (!key.isValid()) continue;

                if (key.isAcceptable()) {
                    // 接受新连接
                    SocketChannel client = serverChannel.accept();
                    client.configureBlocking(false);
                    client.register(selector, SelectionKey.OP_READ);
                    System.out.println("新连接: " + client.getRemoteAddress());
                }

                if (key.isReadable()) {
                    // 读取数据
                    SocketChannel client = (SocketChannel) key.channel();
                    ByteBuffer buffer = ByteBuffer.allocate(1024);
                    int bytesRead = client.read(buffer);

                    if (bytesRead == -1) {
                        client.close();
                        continue;
                    }

                    buffer.flip();
                    String message = charset.decode(buffer).toString();
                    System.out.println("收到: " + message);

                    // 回复
                    buffer.clear();
                    buffer.put(charset.encode("Echo: " + message));
                    buffer.flip();
                    client.write(buffer);
                }
            }
        }
    }
}
```

## 4. HttpClient（Java 11+）

### 4.1 同步与异步请求

```java
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

public class HttpClientDemo {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

        // GET请求
        HttpRequest getRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://httpbin.org/get"))
            .header("Accept", "application/json")
            .GET()
            .build();

        // 同步请求
        HttpResponse<String> response = client.send(getRequest,
            HttpResponse.BodyHandlers.ofString());
        System.out.println("状态码: " + response.statusCode());
        System.out.println("响应体: " + response.body());

        // 异步请求
        CompletableFuture<HttpResponse<String>> futureResponse =
            client.sendAsync(getRequest, HttpResponse.BodyHandlers.ofString());
        futureResponse.thenAccept(resp ->
            System.out.println("异步状态码: " + resp.statusCode())
        );

        // POST请求（JSON）
        String jsonBody = "{\"name\":\"John\",\"age\":30}";
        HttpRequest postRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://httpbin.org/post"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> postResponse = client.send(postRequest,
            HttpResponse.BodyHandlers.ofString());
        System.out.println("POST响应: " + postResponse.body());

        // 文件上传
        Path filePath = Path.of("upload.txt");
        HttpRequest uploadRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://httpbin.org/post"))
            .header("Content-Type", "application/octet-stream")
            .POST(HttpRequest.BodyPublishers.ofFile(filePath))
            .build();

        // 多个并发请求
        List<URI> urls = List.of(
            URI.create("https://httpbin.org/get?id=1"),
            URI.create("https://httpbin.org/get?id=2"),
            URI.create("https://httpbin.org/get?id=3")
        );

        List<CompletableFuture<HttpResponse<String>>> futures = urls.stream()
            .map(url -> client.sendAsync(
                HttpRequest.newBuilder(url).GET().build(),
                HttpResponse.BodyHandlers.ofString()
            ))
            .collect(Collectors.toList());

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
}
```

## 5. 常见问题与解决方案

### 5.1 连接超时处理

```java
// 设置连接和读取超时
Socket socket = new Socket();
socket.connect(new InetSocketAddress(host, port), 5000);  // 连接超时5秒
socket.setSoTimeout(10000);  // 读取超时10秒

// HttpClient超时
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(url))
    .timeout(Duration.ofSeconds(10))  // 请求超时
    .build();
```

### 5.2 资源泄漏

```java
// 错误：未关闭Socket
Socket socket = new Socket(host, port);
// 如果异常，socket不会被关闭

// 正确：try-with-resources
try (Socket socket = new Socket(host, port);
     BufferedReader in = new BufferedReader(
         new InputStreamReader(socket.getInputStream()));
     PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {
    // 使用socket
} catch (IOException e) {
    e.printStackTrace();
}
```

### 5.3 粘包与半包

```java
// TCP粘包问题：发送方多次发送的数据被接收方一次读出
// 解决方案1：固定长度消息
// 解决方案2：分隔符
// 解决方案3：长度前缀（推荐）

// 长度前缀协议示例
void sendMessage(DataOutputStream out, String message) throws IOException {
    byte[] data = message.getBytes(StandardCharsets.UTF_8);
    out.writeInt(data.length);  // 先发送长度
    out.write(data);            // 再发送数据
    out.flush();
}

String receiveMessage(DataInputStream in) throws IOException {
    int length = in.readInt();  // 读取长度
    byte[] data = new byte[length];
    in.readFully(data);         // 读取完整数据
    return new String(data, StandardCharsets.UTF_8);
}
```

## 6. 总结与最佳实践

### 6.1 网络编程选择指南

| 场景         | 推荐方案                      | 原因                |
| :----------- | :---------------------------- | :------------------ |
| 简单HTTP请求 | HttpClient (Java 11+)         | 现代API，支持HTTP/2 |
| 自定义协议   | Socket/NIO                    | 灵活控制            |
| 高并发服务器 | NIO/Netty                     | 非阻塞，可扩展      |
| 简单数据报   | UDP Socket                    | 无连接，低延迟      |
| Web Service  | Spring RestTemplate/WebClient | 企业级框架          |

### 6.2 最佳实践

1. **始终设置超时**：避免无限等待
2. **使用try-with-resources**：确保Socket和流正确关闭
3. **线程池处理连接**：避免为每个连接创建线程
4. **大文件用NIO**：零拷贝提升性能
5. **协议设计用长度前缀**：解决粘包半包问题
6. **HTTPS优先**：保护数据安全
