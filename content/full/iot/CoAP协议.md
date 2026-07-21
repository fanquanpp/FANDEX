---
order: 51
title: CoAP协议
module: iot
category: 'eng-infra'
difficulty: intermediate
description: CoAP协议详解：受限环境下的RESTful协议、消息模型、观察模式与安全机制。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/实战项目
  - iot/MQTT协议
  - iot/Arduino开发
  - iot/ESP32开发
prerequisites:
  - iot/概述与架构
---

## 1. CoAP 概述

### 1.1 什么是 CoAP

CoAP（Constrained Application Protocol）是专为受限设备设计的 RESTful 协议，运行在 UDP 之上。

### 1.2 与 HTTP 对比

| 对比项   | CoAP                | HTTP      |
| -------- | ------------------- | --------- |
| 传输层   | UDP                 | TCP       |
| 头部大小 | 4 字节              | 数百字节  |
| 方法     | GET/POST/PUT/DELETE | 相同      |
| 数据格式 | CBOR/JSON           | JSON/HTML |
| 发现     | 内置                | 需外部    |
| 组播     | 支持                | 不支持    |
| 功耗     | 低                  | 高        |

### 1.3 协议栈

```
┌──────────────┐
│  Application │
├──────────────┤
│  CoAP        │
├──────┬───────┤
│ DTLS │  UDP  │
├──────┴───────┤
│  IPv4/IPv6   │
├──────────────┤
│  6LoWPAN     │
└──────────────┘
```

## 2. 消息模型

### 2.1 消息类型

| 类型            | 缩写 | 描述      |
| --------------- | ---- | --------- |
| Confirmable     | CON  | 需要确认  |
| Non-confirmable | NON  | 不需确认  |
| Acknowledgement | ACK  | 确认响应  |
| Reset           | RST  | 拒绝/错误 |

### 2.2 消息格式

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Ver| T |  TKL  |      Code     |          Message ID           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Token (if any, TKL bytes) ...
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options (if any) ...
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|1 1 1 1 1 1 1 1|    Payload (if any) ...
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### 2.3 请求/响应模式

**CON 请求**：

```
Client → CON GET /temperature → Server
Client ← ACK 2.05 Content "25.5" ← Server
```

**NON 请求**：

```
Client → NON GET /temperature → Server
Client ← NON 2.05 Content "25.5" ← Server
```

**分离响应**（处理时间较长时）：

```
Client → CON GET /temperature → Server
Client ← ACK (空确认) ← Server
Client ← CON 2.05 Content "25.5" ← Server
Client → ACK → Server
```

## 3. RESTful 接口

### 3.1 方法

| 方法   | 描述      |
| ------ | --------- |
| GET    | 获取资源  |
| POST   | 创建/处理 |
| PUT    | 更新资源  |
| DELETE | 删除资源  |

### 3.2 响应码

| 码   | 含义                  |
| ---- | --------------------- |
| 2.01 | Created               |
| 2.02 | Deleted               |
| 2.03 | Valid                 |
| 2.04 | Changed               |
| 2.05 | Content               |
| 4.01 | Unauthorized          |
| 4.04 | Not Found             |
| 4.06 | Not Acceptable        |
| 5.00 | Internal Server Error |

### 3.3 资源发现

```
GET /.well-known/core

→ </sensors/temp>;rt="temperature";if="sensor",
   </sensors/humidity>;rt="humidity";if="sensor",
   </actuators/led>;rt="led";if="actuator"
```

## 4. 观察模式（Observe）

### 4.1 原理

客户端注册观察，服务器在资源变化时主动推送。

```
Client → GET /temperature (Observe=0) → Server
Client ← 2.05 Content "25.5" (Observe=10) ← Server
Client ← 2.05 Content "26.0" (Observe=11) ← Server
Client ← 2.05 Content "25.8" (Observe=12) ← Server
```

### 4.2 注册与取消

| Observe 值 | 描述     |
| ---------- | -------- |
| 0          | 注册观察 |
| 1          | 取消观察 |

## 5. 组播

### 5.1 组播地址

| 地址        | 描述                  |
| ----------- | --------------------- |
| FF02::FD    | CoAP 组播（链路本地） |
| FF03::FD    | CoAP 组播（站点本地） |
| 224.0.1.187 | IPv4 组播             |

### 5.2 组播场景

```
Client → MULTICAST GET /temperature → All Devices
Client ← 2.05 Content "25.5" ← Device 1
Client ← 2.05 Content "24.0" ← Device 2
Client ← 2.05 Content "26.2" ← Device 3
```

## 6. 安全机制

### 6.1 DTLS

CoAP 使用 DTLS（Datagram TLS）提供安全传输。

| 模式         | 描述           |
| ------------ | -------------- |
| NoSec        | 无安全（默认） |
| PreSharedKey | 预共享密钥     |
| RawPublicKey | 原始公钥       |
| Certificate  | X.509 证书     |

### 6.2 OSCORE

OSCORE（Object Security for Constrained RESTful Environments）提供端到端安全，是 CoAP 的推荐安全方案。

## 7. 代码示例

### 7.1 Python (aiocoap)

```python
import asyncio
from aiocoap import *

async def main():
    context = await Context.create_client_context()
    request = Message(code=GET, uri='coap://localhost/temperature')
    response = await context.request(request).response
    print(f"Temperature: {response.payload.decode()}")

asyncio.run(main())
```

### 7.2 CoAP Server

```python
import asyncio
from aiocoap import *

class TemperatureResource(resource.Resource):
    async def render_get(self, request):
        temp = read_sensor()
        return Message(payload=str(temp).encode())

async def main():
    root = resource.Site()
    root.add_resource(['temperature'], TemperatureResource())
    await Context.create_server_context(root)
    await asyncio.get_event_loop().create_future()

asyncio.run(main())
```
