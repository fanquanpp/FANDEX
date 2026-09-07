---
order: 900
title: Python ssl 安全套接字
module: 'python'
category: 后端技术
difficulty: beginner
description: Python ssl 安全套接字 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## SSLContext 上下文

**基本写法：创建默认上下文**
`ssl.create_default_context(<用途>)`
```python
# 创建默认 SSL 上下文
import ssl

ctx = ssl.create_default_context()  # 服务端验证
ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)  # 服务端
```

**基本写法：创建基础上下文**
`ssl.SSLContext(<协议>)`
```python
# 手动创建上下文
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
```

**基本写法：加载证书**
`ctx.load_cert_chain(<证书>, keyfile=<密钥>)`
```python
# 加载服务器证书与私钥
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("server.crt", keyfile="server.key")
```

**基本写法：加载 CA 证书**
`ctx.load_verify_locations(<CA 文件>)`
```python
# 加载 CA 证书用于验证
ctx = ssl.create_default_context()
ctx.load_verify_locations("ca-bundle.crt")
```

---

## 客户端配置

**基本写法：禁用主机名检查**
`ctx.check_hostname = False`
```python
# 关闭主机名校验（不推荐）
ctx = ssl.create_default_context()
ctx.check_hostname = False
```

**基本写法：调整验证模式**
`ctx.verify_mode = ssl.CERT_NONE`
```python
# 关闭证书验证（不推荐）
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
```

**基本写法：设置最低 TLS 版本**
`ctx.minimum_version = ssl.TLSVersion.TLSv1_2`
```python
# 设置最低 TLS 版本
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ctx.minimum_version = ssl.TLSVersion.TLSv1_2
```

---

## 包装套接字

**基本写法：包装客户端套接字**
`ctx.wrap_socket(<套接字>, server_hostname=<主机>)`
```python
# 客户端包装 socket
import socket
import ssl

ctx = ssl.create_default_context()
sock = socket.create_connection(("www.python.org", 443))
ssock = ctx.wrap_socket(sock, server_hostname="www.python.org")
ssock.send(b"GET / HTTP/1.1\r\nHost: www.python.org\r\n\r\n")
print(ssock.recv(1024)[:50])
ssock.close()
```

**基本写法：包装服务端套接字**
`ctx.wrap_socket(<套接字>, server_side=True)`
```python
# 服务端包装 socket
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("server.crt", keyfile="server.key")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind(("0.0.0.0", 8443))
sock.listen()
ssock, addr = ctx.wrap_socket(sock, server_side=True)
```

---

## 证书信息

**基本写法：获取对端证书**
`ssock.getpeercert()`
```python
# 获取对端证书字典
cert = ssock.getpeercert()
print(cert["subject"])
```

**基本写法：获取证书二进制**
`ssock.getpeercert(binary_form=True)`
```python
# 获取 DER 编码的证书
der = ssock.getpeercert(binary_form=True)
print(len(der))
```

**基本写法：cipher 信息**
`ssock.cipher()`
```python
# 获取当前使用的加密套件
print(ssock.cipher())
```

**基本写法：协议版本**
`ssock.version()`
```python
# 获取协商的 TLS 版本
print(ssock.version())
```

---

## 证书校验回调

**基本写法：设置回调**
`ctx.set_servername_callback(<函数>)`
```python
# 服务端根据 SNI 选择证书
def sni_callback(sslsocket, sni_name, ssl_context):
    if sni_name == "example.com":
        ssl_context.load_cert_chain("example.crt", "example.key")

ctx.set_servername_callback(sni_callback)
```

---

## 证书与 PKCS

**基本写法：DER 转 PEM**
`ssl.DER_cert_to_PEM_cert(<DER 字节>)`
```python
# DER 转 PEM 字符串
pem = ssl.DER_cert_to_PEM_cert(der_bytes)
```

**基本写法：PEM 转 DER**
`ssl.PEM_cert_to_DER_cert(<PEM 字符串>)`
```python
# PEM 转 DER 字节
der = ssl.PEM_cert_to_DER_cert(pem_string)
```

---

## OCSP 与 CRL

**基本写法：加载 CRL**
`ctx.load_verify_locations(cafile=<文件>)`
```python
# 加载证书吊销列表
ctx = ssl.create_default_context()
ctx.load_verify_locations(cafile="crl.pem")
ctx.verify_flags |= ssl.VERIFY_CRL_CHECK_LEAF
```

**基本写法：3.13 默认严格标志**
`ctx.verify_flags`
```python
# Python 3.13 默认启用 VERIFY_X509_STRICT 等
ctx = ssl.create_default_context()
print(ctx.verify_flags)
```

---

## 常量与枚举

**基本写法：TLSVersion**
`ssl.TLSVersion.TLSv1_2` | `ssl.TLSVersion.TLSv1_3`
```python
# TLS 版本常量
ctx.minimum_version = ssl.TLSVersion.TLSv1_2
ctx.maximum_version = ssl.TLSVersion.TLSv1_3
```

**基本写法：CERT_* 验证模式**
`ssl.CERT_NONE` | `ssl.CERT_OPTIONAL` | `ssl.CERT_REQUIRED`
```python
# 证书验证模式
ctx.verify_mode = ssl.CERT_REQUIRED
```
