---
order: 50
title: MQTT协议
module: iot
category: 'eng-infra'
difficulty: intermediate
description: MQTT协议详解：发布/订阅模型、QoS等级、保留消息、遗嘱消息与Broker选型。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/安全与隐私
  - iot/实战项目
  - iot/CoAP协议
  - iot/Arduino开发
prerequisites:
  - iot/概述与架构
---

## 1. MQTT 概述

### 1.1 什么是 MQTT

MQTT（Message Queuing Telemetry Transport）是轻量级的发布/订阅消息协议，专为物联网场景设计。

### 1.2 核心特点

| 特点      | 描述            |
| --------- | --------------- |
| 轻量      | 最小报文 2 字节 |
| 发布/订阅 | 解耦通信双方    |
| 多种 QoS  | 灵活可靠性      |
| 持久会话  | 离线消息保留    |
| 安全      | TLS + 认证      |

### 1.3 架构

```
Publisher → Broker → Subscriber
  (设备)    (服务器)   (应用)
```

## 2. 发布/订阅模型

### 2.1 主题（Topic）

```
home/livingroom/temperature
home/+/temperature          # + 单层通配符
home/#                      # # 多层通配符
```

| 通配符 | 描述     | 示例                                     |
| ------ | -------- | ---------------------------------------- |
| `+`    | 单层匹配 | `sensor/+/temp` 匹配 `sensor/1/temp`     |
| `#`    | 多层匹配 | `sensor/#` 匹配 `sensor/1/temp/humidity` |

### 2.2 主题设计最佳实践

```
# 推荐格式
{version}/{domain}/{device_type}/{device_id}/{property}

# 示例
v1/factory/sensor/temp/device001/value
v1/smart-home/light/switch/livingroom/state
```

## 3. QoS 等级

| QoS | 描述     | 传输次数 | 适用场景              |
| --- | -------- | -------- | --------------------- |
| 0   | 最多一次 | 1 次     | 传感器数据（可丢失）  |
| 1   | 至少一次 | 2+ 次    | 控制命令（需确认）    |
| 2   | 恰好一次 | 4 次     | 支付/计费（不可重复） |

### 3.1 QoS 0 流程

```
Publisher → PUBLISH → Broker → PUBLISH → Subscriber
```

### 3.2 QoS 1 流程

```
Publisher → PUBLISH → Broker → PUBACK → Publisher
Broker → PUBLISH → Subscriber → PUBACK → Broker
```

### 3.3 QoS 2 流程

```
Publisher → PUBLISH → Broker → PUBREC → Publisher → PUBREL → Broker → PUBCOMP → Publisher
Broker → PUBLISH → Subscriber → PUBREC → Broker → PUBREL → Subscriber → PUBCOMP → Broker
```

## 4. 保留消息与遗嘱消息

### 4.1 保留消息（Retained Message）

Broker 保留最新一条消息，新订阅者立即收到。

```python
# 发布保留消息
client.publish("device/status", payload="online", retain=True)
```

### 4.2 遗嘱消息（LWT）

客户端异常断开时，Broker 自动发布遗嘱消息。

```python
client.will_set("device/status", payload="offline", qos=1, retain=True)
```

## 5. MQTT 5.0 新特性

| 特性          | 描述                |
| ------------- | ------------------- |
| 原因码        | 明确的连接/断开原因 |
| 用户属性      | 自定义键值对        |
| 共享订阅      | 负载均衡            |
| 主题别名      | 减少带宽            |
| 流控          | 限制消息速率        |
| 会话/消息过期 | 自动清理            |

## 6. Broker 选型

| Broker    | 特点         | 适用场景    |
| --------- | ------------ | ----------- |
| Mosquitto | 轻量开源     | 小规模/开发 |
| EMQX      | 高性能分布式 | 大规模生产  |
| HiveMQ    | 企业级       | 企业 IoT    |
| VerneMQ   | 分布式       | 高可用      |

### 6.1 EMQX 示例

```bash
# Docker 部署
docker run -d --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  emqx/emqx:latest
```

## 7. 代码示例

### 7.1 Python (paho-mqtt)

```python
import paho.mqtt.client as mqtt

def on_connect(client, userdata, flags, rc):
    print(f"Connected with code {rc}")
    client.subscribe("home/+/temperature")

def on_message(client, userdata, msg):
    print(f"{msg.topic}: {msg.payload.decode()}")

client = mqtt.Client(client_id="sensor-app")
client.on_connect = on_connect
client.on_message = on_message
client.will_set("device/status", "offline", qos=1, retain=True)

client.connect("broker.emqx.io", 1883, 60)
client.loop_forever()
```

### 7.2 ESP32 (Arduino)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  WiFi.begin("SSID", "password");
  client.setServer("broker.emqx.io", 1883);
}

void loop() {
  if (!client.connected()) {
    client.connect("esp32-client");
  }
  client.publish("home/temperature", String(readTemperature()).c_str());
  client.loop();
  delay(5000);
}
```
