---
order: 84
title: Go与HTTP客户端
module: go
category: Go
difficulty: intermediate
description: net/http与HTTP请求
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与时间
  - go/Go与JSON
  - go/Go与HTTP服务器
  - go/Go与中间件
prerequisites:
  - go/概述与环境配置
---

## 概述

HTTP 客户端是程序与外部服务通信的基本工具。无论是调用第三方 API、下载文件还是微服务间通信，都需要发送 HTTP 请求。Go 标准库的 `net/http` 包提供了完整的 HTTP 客户端实现，无需第三方依赖即可完成绝大多数 HTTP 操作。

## 基础概念

在开始编码之前，需要了解 HTTP 客户端的几个核心概念：

- **请求（Request）**：客户端发送给服务器的消息，包含方法（GET/POST 等）、URL、头部和请求体。
- **响应（Response）**：服务器返回给客户端的消息，包含状态码、头部和响应体。
- **Client**：HTTP 客户端对象，管理连接池、超时和重定向等策略。
- **Transport**：底层传输层，控制连接复用、TLS 配置和代理设置。
- **超时**：防止请求长时间阻塞，包括连接超时、读写超时和整体超时。

## 快速上手

最简单的 GET 请求：

```go
package main

import (
    "fmt"
    "io"
    "net/http"
)

func main() {
    // 发送 GET 请求
    resp, err := http.Get("https://httpbin.org/get")
    if err != nil {
        panic(err)
    }
    // 必须关闭响应体，否则会造成资源泄漏
    defer resp.Body.Close()

    // 读取响应体
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        panic(err)
    }

    fmt.Println("状态码:", resp.StatusCode)
    fmt.Println("响应体:", string(body))
}
```

## 详细用法

### 1. 自定义 Client

默认的 `http.Get` 使用默认客户端，没有超时限制。生产环境应该自定义客户端：

```go
client := &http.Client{
    Timeout: 10 * time.Second, // 整体超时时间
}

resp, err := client.Get("https://api.example.com/data")
if err != nil {
    // 超时或连接错误
    if timeoutErr, ok := err.(interface{ Timeout() bool }); ok && timeoutErr.Timeout() {
        fmt.Println("请求超时")
    }
    return
}
defer resp.Body.Close()
```

### 2. POST 请求

发送 JSON 数据：

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
)

func main() {
    // 准备请求数据
    data := map[string]string{
        "name":  "小明",
        "email": "ming@example.com",
    }
    jsonData, _ := json.Marshal(data)

    // 发送 POST 请求
    resp, err := http.Post(
        "https://httpbin.org/post",
        "application/json", // Content-Type
        bytes.NewReader(jsonData),
    )
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}
```

发送表单数据：

```go
import "net/url"

// 构建表单数据
form := url.Values{}
form.Set("username", "admin")
form.Set("password", "123456")

resp, err := http.PostForm("https://httpbin.org/post", form)
if err != nil {
    panic(err)
}
defer resp.Body.Close()
```

### 3. 自定义请求

使用 `http.NewRequest` 可以完全控制请求的每个细节：

```go
// 创建请求对象
req, err := http.NewRequest("GET", "https://api.example.com/users", nil)
if err != nil {
    panic(err)
}

// 设置请求头
req.Header.Set("Authorization", "Bearer your-token-here")
req.Header.Set("Accept", "application/json")
req.Header.Set("User-Agent", "MyApp/1.0")

// 添加查询参数
q := req.URL.Query()
q.Set("page", "1")
q.Set("limit", "20")
req.URL.RawQuery = q.Encode()

// 发送请求
client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Do(req)
if err != nil {
    panic(err)
}
defer resp.Body.Close()
```

### 4. 处理响应

```go
resp, err := client.Do(req)
if err != nil {
    panic(err)
}
defer resp.Body.Close()

// 读取状态码
fmt.Println("状态码:", resp.StatusCode)

// 读取响应头
contentType := resp.Header.Get("Content-Type")
fmt.Println("Content-Type:", contentType)

// 读取响应体
body, err := io.ReadAll(resp.Body)
if err != nil {
    panic(err)
}

// 将 JSON 响应解析到结构体
var result struct {
    Data []struct {
        ID   int    `json:"id"`
        Name string `json:"name"`
    } `json:"data"`
}
json.Unmarshal(body, &result)
```

### 5. PUT 和 DELETE 请求

```go
// PUT 请求：更新资源
jsonData, _ := json.Marshal(updateData)
req, _ := http.NewRequest("PUT", "https://api.example.com/users/1", bytes.NewReader(jsonData))
req.Header.Set("Content-Type", "application/json")
resp, err := client.Do(req)

// DELETE 请求：删除资源
req, _ = http.NewRequest("DELETE", "https://api.example.com/users/1", nil)
resp, err = client.Do(req)
```

### 6. 文件上传

上传文件需要使用 `multipart/form-data` 格式：

```go
package main

import (
    "bytes"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func main() {
    // 准备请求体
    var buf bytes.Buffer
    writer := multipart.NewWriter(&buf)

    // 添加普通字段
    writer.WriteField("description", "我的头像")

    // 添加文件字段
    fileWriter, _ := writer.CreateFormFile("avatar", "photo.jpg")
    fileData, _ := os.ReadFile("photo.jpg")
    fileWriter.Write(fileData)

    // 必须关闭 writer 才能写入结束标记
    writer.Close()

    // 发送请求
    req, _ := http.NewRequest("POST", "https://httpbin.org/post", &buf)
    req.Header.Set("Content-Type", writer.FormDataContentType())

    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}
```

### 7. 自定义 Transport

Transport 控制底层连接行为，可以设置代理、TLS 配置等：

```go
client := &http.Client{
    Transport: &http.Transport{
        // 设置代理
        Proxy: http.ProxyURL(proxyURL),

        // 跳过 TLS 证书验证（仅用于开发环境）
        TLSClientConfig: &tls.Config{InsecureSkipVerify: true},

        // 连接池设置
        MaxIdleConns:        100, // 最大空闲连接数
        MaxIdleConnsPerHost: 10,  // 每个主机的最大空闲连接数
        IdleConnTimeout:     90 * time.Second,
    },
    Timeout: 10 * time.Second,
}
```

## 常见场景

### 场景一：调用 REST API

```go
type APIClient struct {
    client  *http.Client
    baseURL string
    token   string
}

func NewAPIClient(baseURL, token string) *APIClient {
    return &APIClient{
        client:  &http.Client{Timeout: 10 * time.Second},
        baseURL: baseURL,
        token:   token,
    }
}

func (c *APIClient) Do(method, path string, body interface{}) ([]byte, error) {
    var reqBody io.Reader
    if body != nil {
        data, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        reqBody = bytes.NewReader(data)
    }

    req, err := http.NewRequest(method, c.baseURL+path, reqBody)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+c.token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### 场景二：带重试的请求

网络请求可能因临时故障失败，重试机制可以提高可靠性：

```go
func DoWithRetry(client *http.Client, req *http.Request, maxRetries int) (*http.Response, error) {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        resp, err := client.Do(req)
        if err != nil {
            lastErr = err
            time.Sleep(time.Second * time.Duration(i+1)) // 指数退避
            continue
        }

        // 5xx 错误也重试
        if resp.StatusCode >= 500 {
            resp.Body.Close()
            lastErr = fmt.Errorf("服务器错误: %d", resp.StatusCode)
            time.Sleep(time.Second * time.Duration(i+1))
            continue
        }

        return resp, nil
    }
    return nil, lastErr
}
```

### 场景三：下载文件

```go
func DownloadFile(client *http.Client, url, filepath string) error {
    resp, err := client.Get(url)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("下载失败，状态码: %d", resp.StatusCode)
    }

    out, err := os.Create(filepath)
    if err != nil {
        return err
    }
    defer out.Close()

    _, err = io.Copy(out, resp.Body)
    return err
}
```

## 注意事项与常见错误

1. **必须关闭响应体**：忘记 `defer resp.Body.Close()` 会导致连接泄漏，最终耗尽连接池。即使不读取响应体也必须关闭。

2. **默认客户端无超时**：`http.Get` 使用的默认客户端没有超时限制，可能导致程序永久阻塞。始终使用自定义客户端并设置超时。

3. **请求体只能读取一次**：`req.Body` 是一个流，读取后无法重用。如果需要重试，需要重新创建请求或缓存请求体。

4. **连接池复用**：同一个 `http.Client` 会自动复用 TCP 连接。为不同用途创建不同的 Client 实例，但不要为每个请求都创建新 Client。

5. **重定向控制**：默认情况下 Client 会自动跟随重定向。可以通过 `CheckRedirect` 自定义行为：

```go
client := &http.Client{
    CheckRedirect: func(req *http.Request, via []*http.Request) error {
        // 不跟随重定向
        return http.ErrUseLastResponse
    },
}
```

6. **Context 取消**：使用 `req.WithContext` 可以取消正在进行的请求：

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
req = req.WithContext(ctx)
```

## 进阶用法

### 流式读取大响应

对于大文件或流式数据，不应该一次性读取全部内容：

```go
resp, err := client.Get("https://example.com/large-file")
if err != nil {
    panic(err)
}
defer resp.Body.Close()

// 创建带缓冲的读取器
reader := bufio.NewReader(resp.Body)
for {
    line, err := reader.ReadString('\n')
    if err == io.EOF {
        break
    }
    if err != nil {
        panic(err)
    }
    // 逐行处理
    processLine(line)
}
```

### Cookie 管理

使用 `cookiejar` 自动管理 Cookie：

```go
import "net/http/cookiejar"

jar, _ := cookiejar.New(nil)
client := &http.Client{
    Jar: jar, // 自动存储和发送 Cookie
}

// 第一次请求：服务器设置 Cookie
client.Post("https://example.com/login", "application/json", loginBody)

// 后续请求：自动携带 Cookie
client.Get("https://example.com/dashboard")
```

### HTTP/2 支持

Go 的 `net/http` 默认支持 HTTP/2，只要服务器支持即可自动协商。如果需要强制使用 HTTP/2：

```go
import "golang.org/x/net/http2"

client := &http.Client{}
http2.ConfigureTransport(client.Transport.(*http.Transport))
```
