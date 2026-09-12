---
order: 460
title: Go 与 HTTP 客户端
module: 'go'
category: 后端技术
difficulty: intermediate
description: net/http 客户端实战：请求构建、超时与连接池设计、重试退避、流式处理与 httptest 测试。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'go/400-GoTime'
  - 'go/330-GoJSON'
  - 'go/470-GoHTTP'
  - 'go/480-GoMiddleware'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [Go 概述与环境配置](/go/020-GoOverviewEnvSetup)

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
    // 超时或连接错误：用 errors.As 判定，避免对具体错误类型硬编码
    var netErr net.Error
    if errors.As(err, &netErr) && netErr.Timeout() {
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

`MaxIdleConnsPerHost` 的默认值只有 2——并发调用同一服务时，多余的请求用完连接后直接丢弃，表现为"压测时大量 TIME_WAIT、吞吐上不去"。高并发调用单个下游务必调大它。

### 8. 超时的完整设计

`Client.Timeout` 是"从拨号到读完响应体"的整体上限，简单但一刀切：下载大文件会被误杀。生产级客户端应拆开控制——连接建立、TLS 握手、响应头到达各管一段，响应体交给 `context` 控制：

| 字段 | 控制阶段 | 建议值 |
| --- | --- | --- |
| `DialContext` 里的 `Timeout` | TCP 连接建立 | 3-5 秒 |
| `TLSHandshakeTimeout` | TLS 握手 | 5-10 秒 |
| `ResponseHeaderTimeout` | 发出请求到收到响应头 | 按接口 SLA |
| `ExpectContinueTimeout` | 100-continue 等待 | 1 秒 |
| `Client.Timeout` | 全程兜底 | 设置后不可依赖部分超时 |
| `req.WithContext(ctx)` | 单次请求粒度，含响应体读取 | 首选手段 |

```go
transport := &http.Transport{
    DialContext: (&net.Dialer{
        Timeout:   5 * time.Second,  // 连接超时
        KeepAlive: 30 * time.Second, // TCP keepalive 探测间隔
    }).DialContext,
    TLSHandshakeTimeout:   10 * time.Second,
    ResponseHeaderTimeout: 10 * time.Second,
    ExpectContinueTimeout: time.Second,
    MaxIdleConns:          100,
    MaxIdleConnsPerHost:   32,
    IdleConnTimeout:       90 * time.Second,
}
client := &http.Client{Transport: transport} // 不再设整体 Timeout，交给各阶段与 context
```

分层超时只解决"每一阶段都不会永久阻塞"；业务上"这次调用最多等 2 秒"仍要用 `context.WithTimeout` 传入请求（见注意事项第 6 条），两者互为补充。

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

网络请求可能因临时故障失败，重试机制可以提高可靠性。重试有三个要点：只重试幂等请求或失败安全请求、用指数退避加抖动避免重试风暴、请求体不能复用（`req.Body` 读完即耗尽，重试需通过 `GetBody` 重新生成）。

```go
func DoWithRetry(ctx context.Context, client *http.Client, req *http.Request, maxRetries int) (*http.Response, error) {
    var lastErr error
    for attempt := 0; attempt <= maxRetries; attempt++ {
        if attempt > 0 {
            // 指数退避 + 随机抖动：250ms、500ms、1s...，抖动防止同一时刻集体重试
            backoff := time.Duration(1<<uint(attempt-1)) * 250 * time.Millisecond
            backoff += time.Duration(rand.Int63n(int64(backoff / 2)))
            select {
            case <-time.After(backoff):
            case <-ctx.Done():
                return nil, ctx.Err()
            }
        }
        // 每次尝试都重置 Body：NewRequest 对 bytes.Reader/strings.Reader 会自动
        // 填充 GetBody；若 body 是 os.File 等其他 Reader，需在创建请求时手动设置 GetBody
        if req.GetBody != nil {
            body, err := req.GetBody()
            if err != nil {
                return nil, err
            }
            req.Body = body
        }
        resp, err := client.Do(req.WithContext(ctx))
        if err != nil {
            lastErr = err
            continue
        }
        // 只重试 5xx 与 429；4xx 属于客户端问题，重试无意义
        if resp.StatusCode >= 500 || resp.StatusCode == http.StatusTooManyRequests {
            io.Copy(io.Discard, resp.Body) // 读干排空，底层连接才能复用
            resp.Body.Close()
            lastErr = fmt.Errorf("服务器错误: %d", resp.StatusCode)
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

### 场景四：用 httptest 测试客户端代码

`net/http/httptest` 能在进程内起一个真实的 HTTP 服务，让客户端代码被完整测试而无需访问外网。下面是一个可直接运行的完整程序（`go run main.go`）：

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
)

func main() {
    // 起一个本地测试服务，模拟下游 API
    ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path != "/price" {
            http.NotFound(w, r)
            return
        }
        json.NewEncoder(w).Encode(map[string]int{"price": 199})
    }))
    defer ts.Close() // 测试结束必须关闭，释放端口与 goroutine

    // 用被测客户端请求它——URL 来自 ts.URL，测试不依赖任何外部地址
    resp, err := http.Get(ts.URL + "/price")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    var result struct {
        Price int `json:"price"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println("状态码:", resp.StatusCode, "票价:", result.Price)
}
```

预期输出：

```text
状态码: 200 票价: 199
```

在单元测试里同样写法，配合表驱动用例可以覆盖 404、500、超时等分支（`httptest.NewServer` 换成自定义 handler 即可模拟）；被测代码若把 baseURL 做成可注入字段，测试就不需要任何 mock 框架。

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

## 本篇小结

1. 客户端三件套：`http.Get` 快速上手，`http.NewRequest` + `client.Do` 精细控制，自定义 `Transport` 管连接池、代理与 TLS。
2. 永远给 Client 设超时：默认客户端零超时，会永久阻塞；`Client.Timeout` 是整体兜底，连接/握手/响应头超时用 `Transport` 分层控制，单次调用时限用 `context` 传入。
3. `resp.Body` 必须关闭且只能读一次；重试时通过 `GetBody` 重建请求体，重试前读干排空响应体以复用连接。
4. 重试只针对幂等请求与 5xx/429，用指数退避加抖动；`MaxIdleConnsPerHost` 默认仅 2，高并发调用单个下游要调大。
5. 用 `httptest` 在进程内起真实服务测试客户端代码，配合可注入的 baseURL 无需 mock 框架即可覆盖各类分支。

## 下一步

服务端一侧的镜像知识见 [Go 与 HTTP 服务](/go/470-GoHTTP)；请求体的 JSON 编解码细节见 [Go 与 JSON](/go/330-GoJSON)，超时与取消的底层机制见 [Context 详解](/go/140-ContextDetailed)。
