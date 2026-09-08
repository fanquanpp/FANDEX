---
order: 460
title: C# HttpClient 网络请求
module: 'csharp'
category: 后端技术
difficulty: beginner
description: C# HttpClient 网络请求 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## HttpClient 基础

**基本写法：创建 HttpClient**
`HttpClient <变量> = new();`
```csharp
// 单例复用，避免套接字耗尽
private static readonly HttpClient _client = new();
```

---

**基本写法：GET 字符串**
`await <client>.GetStringAsync(<url>);`
```csharp
// 直接获取响应文本
string body = await _client.GetStringAsync("https://api.example.com/users");
```

---

**基本写法：GET 字节数组**
`await <client>.GetByteArrayAsync(<url>);`
```csharp
// 获取二进制内容
byte[] bytes = await _client.GetByteArrayAsync("https://a.com/img.png");
```

---

**基本写法：GET 流**
`await <client>.GetStreamAsync(<url>);`
```csharp
// 获取响应流，适合大文件
using Stream s = await _client.GetStreamAsync(url);
```

---

**基本写法：HttpClientFactory 注册**
`services.AddHttpClient();`
```csharp
// ASP.NET Core 中使用工厂管理生命周期
builder.Services.AddHttpClient();
```

---

## 基本请求响应

**基本写法：发送 GET 请求**
`await <client>.GetAsync(<url>);`
```csharp
// 获取完整响应对象
using var resp = await _client.GetAsync(url);
resp.EnsureSuccessStatusCode();
```

---

**基本写法：读取响应内容**
`await <响应>.Content.ReadAsStringAsync();`
```csharp
// 读取响应体字符串
var resp = await _client.GetAsync(url);
string body = await resp.Content.ReadAsStringAsync();
```

---

**基本写法：POST 字符串**
`await <client>.PostAsync(<url>, <内容>);`
```csharp
// 提交字符串内容
var content = new StringContent("raw body", Encoding.UTF8, "text/plain");
await _client.PostAsync(url, content);
```

---

**基本写法：POST JSON**
`JsonContent.Create(<对象>);`
```csharp
// .NET 5+ 直接创建 JSON 内容
var json = JsonContent.Create(user);
await _client.PostAsync(url, json);
```

---

**基本写法：POST 表单**
`new FormUrlEncodedContent(<字典>);`
```csharp
// 提交 application/x-www-form-urlencoded
var form = new FormUrlEncodedContent(new[]
{
    new KeyValuePair<string, string>("name", "Alice")
});
await _client.PostAsync(url, form);
```

---

## HttpRequestMessage 自定义

**基本写法：构造请求消息**
`new HttpRequestMessage(<方法>, <url>);`
```csharp
// 完全自定义请求
var req = new HttpRequestMessage(HttpMethod.Post, url);
req.Content = json;
var resp = await _client.SendAsync(req);
```

---

**基本写法：自定义方法**
`new HttpMethod("<方法名>")`
```csharp
// 使用 PATCH 等非标准方法
var req = new HttpRequestMessage(new HttpMethod("PATCH"), url);
```

---

**基本写法：添加请求头**
`<请求>.Headers.Add("<名称>", "<值>");`
```csharp
// 设置请求头
req.Headers.Add("Authorization", "Bearer token123");
req.Headers.Add("X-Request-Id", Guid.NewGuid().ToString());
```

---

**基本写法：默认请求头**
`<client>.DefaultRequestHeaders.Add("<名称>", "<值>");`
```csharp
// 所有请求都带上的头
_client.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");
```

---

**基本写法：超时设置**
`<client>.Timeout = <时间>;`
```csharp
// 设置全局超时
_client.Timeout = TimeSpan.FromSeconds(30);
```

---

## 响应处理

**基本写法：读取响应头**
`<响应>.Headers.<名称>`
```csharp
// 获取响应头
foreach (var h in resp.Headers)
{
    Console.WriteLine($"{h.Key}: {string.Join(",", h.Value)}");
}
```

---

**基本写法：获取状态码**
`<响应>.StatusCode`
```csharp
// 读取 HTTP 状态码
HttpStatusCode code = resp.StatusCode;
if (code == HttpStatusCode.OK) { }
```

---

**基本写法：反序列化 JSON 响应**
`await JsonSerializer.DeserializeAsync<<类型>>(<流>);`
```csharp
// 流式反序列化响应
var resp = await _client.GetAsync(url);
var user = await JsonSerializer.DeserializeAsync<User>(
    await resp.Content.ReadAsStreamAsync());
```

---

## 取消与进度

**基本写法：取消请求**
`await <client>.GetAsync(<url>, <token>);`
```csharp
// 传入取消令牌
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
var resp = await _client.GetAsync(url, cts.Token);
```

---

**基本写法：HttpCompletionOption**
`await <client>.GetAsync(<url>, HttpCompletionOption.ResponseHeadersRead);`
```csharp
// 收到响应头即返回，不等读完体
var resp = await _client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
```

---

**基本写法：上传进度**
`<流>.ReadAsync(<缓冲>, <token>)`
```csharp
// 自定义 HttpContent 实现上传进度
public class ProgressContent : HttpContent { /* 重写 SerializeToStreamAsync */ }
```

---

## 上传文件

**基本写法：Multipart 表单**
`MultipartFormDataContent <变量> = new();`
```csharp
// multipart/form-data 上传文件
using var form = new MultipartFormDataContent();
var fileContent = new ByteArrayContent(File.ReadAllBytes(path));
fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
form.Add(fileContent, "file", "photo.png");
await _client.PostAsync(url, form);
```

---

**基本写法：流式上传**
`new StreamContent(<流>);`
```csharp
// 大文件用流避免全加载到内存
using var fs = File.OpenRead("big.zip");
var form = new MultipartFormDataContent();
form.Add(new StreamContent(fs), "file", "big.zip");
await _client.PostAsync(url, form);
```

---

## 复用与命名客户端

**基本写法：命名客户端**
`services.AddHttpClient("<名称>", <配置>);`
```csharp
// 注册预配置的命名 HttpClient
builder.Services.AddHttpClient("github", c =>
{
    c.BaseAddress = new Uri("https://api.github.com/");
    c.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");
});
```

---

**基本写法：注入命名客户端**
`IHttpClientFactory <变量>`
```csharp
// 通过工厂获取命名客户端
public class Service(IHttpClientFactory factory)
{
    public async Task DoAsync()
    {
        var client = factory.CreateClient("github");
        var json = await client.GetStringAsync("users/octocat");
    }
}
```

---

**基本写法：类型化客户端**
`services.AddHttpClient<<类型>>();`
```csharp
// 直接绑定到某服务类
builder.Services.AddHttpClient<GitHubService>(c => c.BaseAddress = new Uri("https://api.github.com/"));
```

---

## BaseAddress 与相对路径

**基本写法：设置基地址**
`<client>.BaseAddress = new Uri(<url>);`
```csharp
// 设置基地址后用相对路径
_client.BaseAddress = new Uri("https://api.example.com/");
var json = await _client.GetStringAsync("users/1");
```

---

## 重试与弹性

**基本写法：Polly 重试**
`services.AddHttpClient("<名称>").AddTransientHttpErrorPolicy(...)`
```csharp
// 使用 Polly 实现重试
builder.Services.AddHttpClient("api")
    .AddTransientHttpErrorPolicy(p =>
        p.WaitAndRetryAsync(3, i => TimeSpan.FromSeconds(i)));
```

---

**基本写法：超时策略**
`.AddPolicyHandler(Policy.TimeoutAsync<<HttpResponseMessage>>(<秒>))`
```csharp
// 每个请求的超时策略
.AddPolicyHandler(Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(20)));
```

---

## Cookie 与代理

**基本写法：处理 Cookie**
`new HttpClient(new HttpClientHandler { UseCookies = true })`
```csharp
// 启用 Cookie 容器
var handler = new HttpClientHandler { UseCookies = true, CookieContainer = new CookieContainer() };
var client = new HttpClient(handler);
```

---

**基本写法：设置代理**
`new HttpClientHandler { Proxy = <代理> }`
```csharp
// 通过代理访问
var handler = new HttpClientHandler
{
    Proxy = new WebProxy("http://proxy:8080", true)
};
var client = new HttpClient(handler);
```

---

## SocketsHttpHandler 配置

**基本写法：自定义连接池**
`new SocketsHttpHandler { PooledConnectionLifetime = <时间> }`
```csharp
// .NET Core 2.1+ 默认使用 SocketsHttpHandler
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(2),
    MaxConnectionsPerServer = 100
};
var client = new HttpClient(handler);
```
