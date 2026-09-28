---
order: 460
title: Go 与 HTTP 客户端：接入一个不可靠的第三方 API
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"接入需要鉴权、偶发 429 的第三方 API"为主线学 net/http 客户端：请求构建、分层超时设计、重试退避、连接池调优、流式与文件上传、httptest 测试，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'go/400-GoTime'
  - 'go/330-GoJSON'
  - 'go/470-GoHTTP'
  - 'go/480-GoMiddleware'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：第三方 API 会慢、会挂、会拒绝你

需求：接入某计费平台的"查价格"接口。对接文档读完，你会发现三件事它没写但一定会发生：**偶尔超时**（对方也在升级）、**偶发 429/500**（对方限流或抖动）、**响应偶发很慢**（拖着你的接口一起超时）。所以本篇的顺序是：先跑通一个请求（5 分钟的事），再把"不可靠"当成默认假设来设计——超时怎么拆、重试怎么退、连接怎么复用、怎么在测试里模拟故障。

标准库 `net/http` 全部够用，不需要第三方依赖。

## 动手第一步：五分钟跑通 GET

```go
resp, err := http.Get("https://httpbin.org/get")
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close() // 永远关闭，不读也要关

body, err := io.ReadAll(resp.Body)
if err != nil {
    log.Fatal(err)
}
fmt.Println("状态码:", resp.StatusCode)
fmt.Println("响应体:", string(body))
```

带 JSON 的 POST 同样直接：

```go
data := map[string]string{"name": "小明", "email": "ming@example.com"}
jsonData, _ := json.Marshal(data)

resp, err := http.Post("https://httpbin.org/post", "application/json", bytes.NewReader(jsonData))
```

表单用 `http.PostForm(url, url.Values{...})`；文件上传用 `mime/multipart` 组装请求体（见下文"文件上传"）。

这一步能跑通，但**它不能上线**。两个致命点藏在"方便"背后：`http.Get` 用的是包级默认客户端，**没有任何超时**——对方卡住，你的 goroutine 永久阻塞；每个细节（请求头、查询参数、PUT/DELETE）也没有出口。

## 动手第二步：NewRequest + client.Do，精细控制一个请求

真实对接从 `http.NewRequest`（或带 context 的 `http.NewRequestWithContext`）开始：

```go
func queryPrice(ctx context.Context, client *http.Client, token string, sku string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet,
        "https://api.billing.example.com/v1/price", nil)
    if err != nil {
        return nil, err
    }

    // 请求头：鉴权、接受类型、UA
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Accept", "application/json")
    req.Header.Set("User-Agent", "MyApp/1.0")

    // 查询参数：用 url.Values 编码，别手拼字符串
    q := req.URL.Query()
    q.Set("sku", sku)
    q.Set("page", "1")
    req.URL.RawQuery = q.Encode()

    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("计费接口返回 %d", resp.StatusCode)
    }
    return io.ReadAll(resp.Body)
}
```

PUT/DELETE 只是换 `http.MethodPut` 等常量并给 Body 传 `bytes.NewReader(jsonData)`。

## 讲为什么：超时要分层设计

`http.Client` 三层结构决定了超时该往哪放：

- **Client**：策略层——整体超时、重定向、Cookie；
- **Transport**：连接层——连接池、代理、TLS；
- **Request**：单次调用——context 取消与超时。

`Client.Timeout` 是"从拨号到读完响应体"的整体上限，简单但一刀切：下载大文件会被误杀。生产级客户端把各阶段拆开，响应体交给 context：

| 字段 | 控制阶段 | 建议值 |
| --- | --- | --- |
| `DialContext` 里的 `Timeout` | TCP 连接建立 | 3-5 秒 |
| `TLSHandshakeTimeout` | TLS 握手 | 5-10 秒 |
| `ResponseHeaderTimeout` | 发出请求到收到响应头 | 按接口 SLA |
| `ExpectContinueTimeout` | 100-continue 等待 | 1 秒 |
| `Client.Timeout` | 全程兜底 | 设了就别依赖部分超时 |
| `NewRequestWithContext(ctx)` | 单次请求粒度，含响应体读取 | 首选手段 |

```go
transport := &http.Transport{
    DialContext: (&net.Dialer{
        Timeout:   5 * time.Second,
        KeepAlive: 30 * time.Second,
    }).DialContext,
    TLSHandshakeTimeout:   10 * time.Second,
    ResponseHeaderTimeout: 10 * time.Second,
    ExpectContinueTimeout: time.Second,
    MaxIdleConns:          100,
    MaxIdleConnsPerHost:   32, // 见下文，默认值只有 2
    IdleConnTimeout:       90 * time.Second,
}
client := &http.Client{Transport: transport}
```

分层超时保证"每一阶段都不会永久阻塞"；"这次调用最多等 2 秒"这类业务时限，用 `context.WithTimeout` 传给 `NewRequestWithContext`，两者互为补充（机制详见 [Context 详解](/go/140-ContextDetailed)）。超时错误的判定用 `errors.As` 而不是字符串匹配：

```go
var netErr net.Error
if errors.As(err, &netErr) && netErr.Timeout() {
    // 超时分支：记日志、进重试
}
```

## 动手第三步：重试——只救"值得救"的失败

面对偶发 429/5xx，重试有三个要点：**只重试幂等请求或失败安全请求**；**指数退避加抖动**，避免故障恢复瞬间所有客户端集体重试；**请求体不能复用**——`req.Body` 是流，读完即耗尽，重试要靠 `GetBody` 重新生成。

```go
func DoWithRetry(ctx context.Context, client *http.Client, req *http.Request, maxRetries int) (*http.Response, error) {
    var lastErr error
    for attempt := 0; attempt <= maxRetries; attempt++ {
        if attempt > 0 {
            // 250ms、500ms、1s ...，加随机抖动
            backoff := time.Duration(1<<uint(attempt-1)) * 250 * time.Millisecond
            backoff += time.Duration(rand.Int63n(int64(backoff / 2)))
            select {
            case <-time.After(backoff):
            case <-ctx.Done():
                return nil, ctx.Err()
            }
        }
        // NewRequest 对 bytes.Reader/strings.Reader 会自动填 GetBody；
        // Body 是 os.File 等其他 Reader 时需手动设置
        if req.GetBody != nil {
            body, err := req.GetBody()
            if err != nil {
                return nil, err
            }
            req.Body = body
        }
        resp, err := client.Do(req)
        if err != nil {
            lastErr = err
            continue
        }
        // 只重试 5xx 与 429；4xx 是自己的问题，重试无意义
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

`io.Copy(io.Discard, resp.Body)` 这一排空动作最容易被省掉：不读完就 Close，连接无法回到池里复用，压测时表现为大量新建连接、吞吐上不去。同族的问题是连接池参数 `MaxIdleConnsPerHost`——**默认值只有 2**，并发调用同一个下游时，多余连接用完即弃。高并发场景务必调大（上面 Transport 里设了 32）。另外同一个 `http.Client` 应按用途复用（它自带连接池），别每个请求 new 一个。

## 动手第四步：进阶三件——上传、流式、Cookie

**multipart 文件上传**：

```go
var buf bytes.Buffer
writer := multipart.NewWriter(&buf)

writer.WriteField("description", "我的头像")          // 普通字段
fileWriter, _ := writer.CreateFormFile("avatar", "photo.jpg")
fileData, _ := os.ReadFile("photo.jpg")
fileWriter.Write(fileData)
writer.Close() // 必须关闭，写入结束标记

req, _ := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, &buf)
req.Header.Set("Content-Type", writer.FormDataContentType()) // 含 boundary
```

**大响应流式处理**（别一次 `ReadAll` 几百 MB）：

```go
reader := bufio.NewReader(resp.Body)
for {
    line, err := reader.ReadString('\n')
    if err == io.EOF {
        break
    }
    if err != nil {
        return err
    }
    processLine(line)
}
```

**Cookie 会话**（登录后保持状态）：

```go
jar, _ := cookiejar.New(nil)
client := &http.Client{Jar: jar}

client.Post("https://example.com/login", "application/json", loginBody)
client.Get("https://example.com/dashboard") // 自动带上会话 Cookie
```

两个低频但要知道的开关：默认自动跟随重定向，`CheckRedirect` 返回 `http.ErrUseLastResponse` 可改为不跟随；HTTPS 下 Go 默认协商 HTTP/2，强制开启可用 `golang.org/x/net/http2` 的 `http2.ConfigureTransport`。开发期抓包跳过证书校验用 `TLSClientConfig: &tls.Config{InsecureSkipVerify: true}`，仅限本地。

## 动手第五步：用 httptest 测它，不碰外网

`net/http/httptest` 在进程内起一个真实的 HTTP 服务，客户端代码被完整测试：

```go
ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    if r.URL.Path != "/price" {
        http.NotFound(w, r)
        return
    }
    json.NewEncoder(w).Encode(map[string]int{"price": 199})
}))
defer ts.Close() // 释放端口与 goroutine

resp, err := http.Get(ts.URL + "/price")
```

被测代码若把 baseURL 做成可注入字段，测试就不需要任何 mock 框架：handler 里写上 `time.Sleep` 模拟慢响应、返回 429 模拟限流，重试逻辑的每个分支都能覆盖。测试工程化的展开见 [Go 测试](/go/350-GoTest)。

## 坑点与自检

**坑 1：忘关响应体。** 连接泄漏到耗尽池子，症状是"运行几小时后请求全部超时"。`defer resp.Body.Close()` 一行都不能少，不读也要关。

**坑 2：默认客户端零超时。** `http.Get` 便捷方法只能用于脚本与小工具；服务代码一律自定义 Client。

**坑 3：重试放大故障。** 无退避的重试等于 DoS 自己的下游；非幂等请求（下单、扣款）盲目重试等于重复扣款。

**坑 4：每次请求新建 Client。** 连接池随 Client 生灭，等于放弃了 keep-alive。

自检——能不看文档回答这些吗：

1. `Client.Timeout`、Transport 各阶段超时、请求 context 三者分别管什么？
2. 为什么重试前要 `io.Copy(io.Discard, resp.Body)`？
3. `MaxIdleConnsPerHost` 默认是多少？不改会怎样？
4. 哪些状态码值得重试？哪些重试反而有害？

## 练习

1. 把 queryPrice 改造成结构体 APIClient（client/baseURL/token 三个字段），接入 DoWithRetry，并用 httptest 写三个用例：正常 200、先 429 后 200（handler 用计数器前两次返回 429）、超时（handler 睡 3 秒，客户端 1 秒超时）。
2. 用 `http.Client{CheckRedirect: ...}` 写一个"只返回最终 URL、不自动跟随重定向"的小工具，对 `http://github.com` 这类会 301 的地址验证行为。
3. 给 MaxIdleConnsPerHost 写一个对比实验：默认值与 32 各跑一遍 200 并发请求同一 httptest 服务，对比耗时与 TCP 连接数（`netstat` 或 `ss` 观察 TIME_WAIT）。

## 下一步

- 服务端一侧的镜像知识：[Go 与 HTTP 服务](/go/470-GoHTTP)与[中间件](/go/480-GoMiddleware)；
- 请求体的 JSON 编解码细节：[Go 与 JSON](/go/330-GoJSON)；
- 超时与取消的底层机制：[Context 详解](/go/140-ContextDetailed)。
