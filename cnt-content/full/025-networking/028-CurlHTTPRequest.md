---
order: 280
title: curl HTTP 请求
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking curl HTTP 请求 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## curl 基本 GET 请求

**基本写法：发送 GET 请求**
`curl <URL>`
```bash
# 获取网页内容
curl https://example.com
```

**基本写法：显示响应头**
`curl -I <URL>`
```bash
# 只获取响应头
curl -I https://example.com
```

**基本写法：显示详细通信过程**
`curl -v <URL>`
```bash
# 显示请求和响应详细信息
curl -v https://example.com
```

**基本写法：跟随重定向**
`curl -L <URL>`
```bash
# 跟随 301/302 重定向
curl -L https://example.com
```

**基本写法：保存到文件**
`curl -o <文件> <URL>`
```bash
# 保存响应到文件
curl -o page.html https://example.com
```

**基本写法：使用原文件名保存**
`curl -O <URL>`
```bash
# 使用 URL 中的文件名保存
curl -O https://example.com/file.zip
```

---

## POST 请求

**基本写法：发送 POST 请求**
`curl -X POST <URL>`
```bash
# 发送 POST 请求
curl -X POST https://api.example.com/users
```

**基本写法：发送表单数据**
`curl -d "<数据>" <URL>`
```bash
# 发送表单数据
curl -d "name=John&age=30" https://api.example.com/users
```

**基本写法：发送 JSON 数据**
`curl -H "Content-Type: application/json" -d '<JSON>' <URL>`
```bash
# 发送 JSON 格式数据
curl -H "Content-Type: application/json" -d '{"name":"John","age":30}' https://api.example.com/users
```

**基本写法：从文件发送数据**
`curl -d @<文件> <URL>`
```bash
# 从文件读取数据发送
curl -d @data.json https://api.example.com/users
```

**基本写法：表单文件上传**
`curl -F "<字段>=@<文件>" <URL>`
```bash
# 上传文件
curl -F "file=@photo.jpg" https://api.example.com/upload
```

---

## HTTP 方法

**基本写法：PUT 请求**
`curl -X PUT -d '<数据>' <URL>`
```bash
# 更新资源
curl -X PUT -H "Content-Type: application/json" -d '{"name":"Jane"}' https://api.example.com/users/1
```

**基本写法：DELETE 请求**
`curl -X DELETE <URL>`
```bash
# 删除资源
curl -X DELETE https://api.example.com/users/1
```

**基本写法：PATCH 请求**
`curl -X PATCH -d '<数据>' <URL>`
```bash
# 部分更新资源
curl -X PATCH -d '{"age":31}' https://api.example.com/users/1
```

**基本写法：HEAD 请求**
`curl -I <URL>`
```bash
# 只获取响应头
curl -I https://example.com
```

---

## 请求头设置

**基本写法：添加请求头**
`curl -H "<头部>: <值>" <URL>`
```bash
# 添加自定义请求头
curl -H "Authorization: Bearer token123" https://api.example.com/users
```

**基本写法：添加多个请求头**
`curl -H "<头部1>" -H "<头部2>" <URL>`
```bash
# 添加多个请求头
curl -H "Authorization: Bearer token" -H "Content-Type: application/json" https://api.example.com/users
```

**基本写法：设置 User-Agent**
`curl -A "<UA>" <URL>`
```bash
# 设置 User-Agent
curl -A "Mozilla/5.0" https://example.com
```

**基本写法：设置 Referer**
`curl -e "<URL>" <URL>`
```bash
# 设置 Referer
curl -e "https://google.com" https://example.com
```

---

## 认证

**基本写法：基本认证**
`curl -u <用户>:<密码> <URL>`
```bash
# HTTP 基本认证
curl -u admin:secret https://api.example.com/admin
```

**基本写法：Bearer Token 认证**
`curl -H "Authorization: Bearer <token>" <URL>`
```bash
# Bearer Token 认证
curl -H "Authorization: Bearer abc123" https://api.example.com/secure
```

**基本写法：客户端证书认证**
`curl --cert <证书> --key <私钥> <URL>`
```bash
# 使用客户端证书
curl --cert client.pem --key key.pem https://api.example.com
```

**基本写法：跳过证书验证**
`curl -k <URL>`
```bash
# 忽略 SSL 证书验证
curl -k https://self-signed.example.com
```

---

## Cookie 处理

**基本写法：发送 Cookie**
`curl -b "<cookie>" <URL>`
```bash
# 发送 Cookie
curl -b "session=abc123" https://example.com/dashboard
```

**基本写法：从文件加载 Cookie**
`curl -b <文件> <URL>`
```bash
# 从 cookie 文件加载
curl -b cookies.txt https://example.com
```

**基本写法：保存 Cookie 到文件**
`curl -c <文件> <URL>`
```bash
# 保存响应中的 Cookie
curl -c cookies.txt https://example.com/login
```

**基本写法：同时保存和使用 Cookie**
`curl -b <文件> -c <文件> <URL>`
```bash
# 加载并更新 Cookie
curl -b cookies.txt -c cookies.txt https://example.com
```

---

## 超时与重试

**基本写法：设置连接超时**
`curl --connect-timeout <秒数> <URL>`
```bash
# 设置 5 秒连接超时
curl --connect-timeout 5 https://example.com
```

**基本写法：设置总超时**
`curl --max-time <秒数> <URL>`
```bash
# 设置 10 秒总超时
curl --max-time 10 https://example.com
```

**基本写法：重试请求**
`curl --retry <次数> <URL>`
```bash
# 失败时重试 3 次
curl --retry 3 https://example.com
```

**基本写法：重试并延迟**
`curl --retry <次数> --retry-delay <秒数> <URL>`
```bash
# 重试 3 次，每次间隔 2 秒
curl --retry 3 --retry-delay 2 https://example.com
```

---

## 代理设置

**基本写法：使用 HTTP 代理**
`curl -x <代理地址> <URL>`
```bash
# 通过 HTTP 代理访问
curl -x http://proxy.example.com:8080 https://example.com
```

**基本写法：使用 SOCKS5 代理**
`curl --socks5 <代理地址> <URL>`
```bash
# 通过 SOCKS5 代理访问
curl --socks5 proxy.example.com:1080 https://example.com
```

**基本写法：代理认证**
`curl -x http://<用户>:<密码>@<代理> <URL>`
```bash
# 代理认证
curl -x http://user:pass@proxy.example.com:8080 https://example.com
```

**基本写法：忽略代理**
`curl --noproxy <域名> <URL>`
```bash
# 指定域名不使用代理
curl --noproxy example.com https://example.com
```

---

## 输出格式化

**基本写法：输出到标准错误**
`curl -o /dev/null -w "<格式>" <URL>`
```bash
# 只输出 HTTP 状态码
curl -o /dev/null -w "%{http_code}\n" https://example.com
```

**基本写法：输出详细信息**
`curl -w "<格式>" <URL>`
```bash
# 输出响应时间和状态码
curl -w "HTTP Code: %{http_code}\nTime: %{time_total}s\n" -o /dev/null https://example.com
```

**基本写法：JSON 美化输出**
`curl -s <URL> | python3 -m json.tool`
```bash
# 美化 JSON 输出
curl -s https://api.example.com/data | python3 -m json.tool
```

**基本写法：静默模式**
`curl -s <URL>`
```bash
# 静默模式不显示进度
curl -s https://example.com
```

---

## 下载控制

**基本写法：断点续传**
`curl -C - -o <文件> <URL>`
```bash
# 断点续传下载
curl -C - -o bigfile.zip https://example.com/bigfile.zip
```

**基本写法：限速下载**
`curl --limit-rate <速度> -o <文件> <URL>`
```bash
# 限制下载速度为 1MB/s
curl --limit-rate 1M -o file.zip https://example.com/file.zip
```

**基本写法：多部分下载**
`curl -r <范围> -o <文件> <URL>`
```bash
# 下载文件的 0-1024 字节
curl -r 0-1024 -o part.bin https://example.com/file.bin
```

---

## 实用组合

**基本写法：测试接口性能**
`curl -o /dev/null -s -w "时间: %{time_total}s\n大小: %{size_download}字节\n" <URL>`
```bash
# 测试接口响应时间和大小
curl -o /dev/null -s -w "时间: %{time_total}s\n大小: %{size_download}字节\n" https://api.example.com
```

**基本写法：下载并解压**
`curl -sL <URL> | tar xz`
```bash
# 下载并解压 tar.gz 文件
curl -sL https://example.com/archive.tar.gz | tar xz
```

**基本写法：检查证书过期时间**
`curl -vI <URL> 2>&1 | grep -i expire`
```bash
# 检查 HTTPS 证书过期时间
curl -vI https://example.com 2>&1 | grep -i expire_date
```
