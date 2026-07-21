---
order: 5
title: 'IoT 平台'
module: iot
category: 物联网
difficulty: intermediate
description: 'AWS IoT Core、Azure IoT Hub、阿里云 IoT、ThingsBoard、EMQX 与设备管理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/通信协议
  - iot/边缘计算
  - iot/数据处理与分析
  - iot/安全与隐私
prerequisites: []
---

## 1. IoT 平台概述

### 1.1 核心功能

| 功能         | 描述                         |
| :----------- | :--------------------------- |
| **设备管理** | 设备注册、认证、生命周期管理 |
| **数据接入** | MQTT/HTTP/CoAP 协议接入      |
| **规则引擎** | 数据流转、条件触发           |
| **数据存储** | 时序数据、设备影子           |
| **消息推送** | 命令下发、属性设置           |
| **监控告警** | 设备状态监控、异常告警       |

### 1.2 平台选型

| 平台              | 类型   | 特点               | 适用场景   |
| :---------------- | :----- | :----------------- | :--------- |
| **AWS IoT Core**  | 云服务 | 全球部署、生态完善 | 海外业务   |
| **Azure IoT Hub** | 云服务 | 企业集成、安全     | 微软生态   |
| **阿里云 IoT**    | 云服务 | 中文友好、国内合规 | 国内业务   |
| **ThingsBoard**   | 开源   | 可私有化、功能全   | 中小企业   |
| **EMQX**          | 开源   | MQTT 专用、高性能  | 消息中间件 |

## 2. AWS IoT Core

### 2.1 核心组件

| 组件               | 描述               |
| :----------------- | :----------------- |
| **Device Gateway** | MQTT/HTTP 接入网关 |
| **Rules Engine**   | SQL 风格规则引擎   |
| **Device Shadow**  | 设备状态同步       |
| **Registry**       | 设备注册表         |
| **Security**       | X.509 证书认证     |

### 2.2 设备连接

```python
# AWS IoT Device SDK
import awsiot
from awsiot import mqtt_connection_builder

# 使用证书连接
mqtt_connection = mqtt_connection_builder.mtls_from_path(
    endpoint="xxxxx-ats.iot.us-east-1.amazonaws.com",
    cert_filepath="device-certificate.pem.crt",
    pri_key_filepath="device-private-key.pem.key",
    ca_filepath="AmazonRootCA1.pem",
    client_id="my-device-001"
)

connect_future = mqtt_connection.connect()
connect_future.result()

# 发布消息
mqtt_connection.publish(
    topic="my-device-001/data",
    payload=json.dumps({"temperature": 25.5}),
    qos=mqtt.QoS.AT_LEAST_ONCE
)

# 订阅
def on_message(topic, payload, **kwargs):
    print(f"Received: {payload}")

mqtt_connection.subscribe(
    topic="my-device-001/command",
    qos=mqtt.QoS.AT_LEAST_ONCE,
    callback=on_message
)
```

### 2.3 规则引擎

```sql
-- AWS IoT 规则：将温度数据写入 DynamoDB
SELECT device_id, temperature, timestamp
FROM 'iot/+/data'
WHERE temperature > 30

-- 动作：
-- 1. 写入 DynamoDB
-- 2. 发送 SNS 通知
-- 3. 调用 Lambda 函数
```

### 2.4 Device Shadow

```json
// 设备影子（期望状态 vs 报告状态）
{
  "state": {
    "desired": {
      "led": "on",
      "interval": 10
    },
    "reported": {
      "led": "off",
      "interval": 5,
      "temperature": 25.5
    }
  },
  "metadata": {
    "desired": {
      "led": { "timestamp": 1718300000 },
      "interval": { "timestamp": 1718300000 }
    }
  },
  "version": 5,
  "timestamp": 1718300100
}
```

## 3. Azure IoT Hub

### 3.1 核心功能

```python
# Azure IoT Device SDK
from azure.iot.device import IoTHubDeviceClient, Message

# 连接字符串
conn_str = "HostName=my-hub.azure-devices.net;DeviceId=device-001;SharedAccessKey=xxx"
client = IoTHubDeviceClient.create_from_connection_string(conn_str)

client.connect()

# 发送遥测数据
message = Message(json.dumps({"temperature": 25.5}))
message.content_type = "application/json"
client.send_message(message)

# 接收云端命令
def message_handler(message):
    print(f"Command: {message.data}")

client.on_message_received = message_handler
```

### 3.2 IoT Edge

```json
// deployment.json - 边缘模块部署
{
  "modulesContent": {
    "$edgeAgent": {
      "properties.desired": {
        "modules": {
          "tempSensor": {
            "settings": {
              "image": "mcr.microsoft.com/azureiotedge-simulated-temperature-sensor:1.0",
              "createOptions": "{}"
            }
          },
          "edgeAI": {
            "settings": {
              "image": "myregistry/edge-ai:v1",
              "createOptions": "{\"HostConfig\":{\"PortBindings\":{\"5000/tcp\":[{\"HostPort\":\"5000\"}]}}}"
            }
          }
        }
      }
    }
  }
}
```

## 4. 阿里云 IoT

### 4.1 平台架构

```
设备 → MQTT/HTTP → IoT 接入层 → 规则引擎 → 数据流转
                                    ↓
                              设备管理/物模型
```

### 4.2 物模型（Thing Model）

```json
{
  "productKey": "a1BcDEfG",
  "deviceName": "sensor-001",
  "properties": [
    {
      "identifier": "Temperature",
      "name": "温度",
      "dataType": "float",
      "accessMode": "r",
      "unit": "°C",
      "range": [-40, 80]
    },
    {
      "identifier": "Humidity",
      "name": "湿度",
      "dataType": "float",
      "accessMode": "r",
      "unit": "%",
      "range": [0, 100]
    },
    {
      "identifier": "Switch",
      "name": "开关",
      "dataType": "bool",
      "accessMode": "rw"
    }
  ],
  "services": [
    {
      "identifier": "Reboot",
      "name": "重启",
      "inputData": [],
      "outputData": []
    }
  ],
  "events": [
    {
      "identifier": "HighTemp",
      "name": "高温告警",
      "type": "alert",
      "outputData": [{ "identifier": "Temperature", "name": "温度" }]
    }
  ]
}
```

### 4.3 设备端 SDK

```python
# 阿里云 IoT Device SDK
import linkkit

lk = linkkit.LinkKit(
    host_name="iot-as-mqtt.cn-shanghai.aliyuncs.com",
    product_key="a1BcDEfG",
    device_name="sensor-001",
    device_secret="xxx"
)

# 属性上报
def on_connect(session):
    props = {"Temperature": 25.5, "Humidity": 60.2}
    lk.thing_post_property(props)

# 命令接收
def on_thing_call(session, identifier, params):
    if identifier == "Reboot":
        print("Rebooting...")
        lk.thing_answer_service(identifier, {"code": 200})

lk.on_connect = on_connect
lk.on_thing_call = on_thing_call
lk.connect()
```

## 5. ThingsBoard

### 5.1 部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  thingsboard:
    image: thingsboard/tb-postgres:latest
    ports:
      - '9090:9090' # Web UI
      - '1883:1883' # MQTT
      - '7070:7070' # Edge RPC
      - '5683-5688:5683-5688/udp' # CoAP/LwM2M
    environment:
      TB_QUEUE_TYPE: in-memory
      SPRING_DATASOURCE_URL: 'jdbc:postgresql://postgres:5432/thingsboard'
    volumes:
      - tb-data:/data
      - tb-logs:/var/log/thingsboard

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: thingsboard
      POSTGRES_USER: thingsboard
      POSTGRES_PASSWORD: thingsboard
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  tb-data:
  tb-logs:
  pgdata:
```

### 5.2 规则链

```
消息输入 → 消息类型切换 → 脚本处理 → 保存时序数据
                                ↓
                          条件判断 → 告警通知
                                ↓
                          数据转发 → Kafka/HTTP
```

### 5.3 设备接入

```python
# ThingsBoard MQTT 接入
import paho.mqtt.client as mqtt
import json
import time

THINGSBOARD_HOST = "localhost"
ACCESS_TOKEN = "your-device-token"

client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)

def on_connect(rc):
    print(f"Connected: {rc}")
    # 订阅命令
    client.subscribe("v1/devices/me/rpc/request/+")

def on_message(client, userdata, msg):
    request_id = msg.topic.split("/")[-1]
    data = json.loads(msg.payload.decode())
    print(f"RPC: {data}")

    # 响应 RPC
    response = {"result": "ok"}
    client.publish(
        f"v1/devices/me/rpc/response/{request_id}",
        json.dumps(response)
    )

client.on_connect = on_connect
client.on_message = on_message
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

# 遥测数据上报
while True:
    telemetry = {
        "temperature": 25.5,
        "humidity": 60.2
    }
    client.publish("v1/devices/me/telemetry", json.dumps(telemetry))

    # 属性上报
    attributes = {
        "firmware_version": "1.2.0",
        "location": "factory-a"
    }
    client.publish("v1/devices/me/attributes", json.dumps(attributes))

    time.sleep(5)
```

## 6. EMQX

### 6.1 部署

```bash
# Docker 部署
docker run -d \
  --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  emqx/emqx:5.7
```

### 6.2 规则引擎

```sql
-- EMQX 规则：温度告警
SELECT
  payload.temperature as temp,
  payload.device_id as device_id,
  clientid,
  timestamp
FROM "iot/sensor/+/data"
WHERE payload.temperature > 35

-- 动作：发送到 Webhook
-- URL: https://alert.example.com/api/temperature-alert
-- Body: {"device_id": "${device_id}", "temperature": ${temp}, "time": ${timestamp}}
```

### 6.3 性能调优

| 参数                           | 默认值  | 建议值 | 说明           |
| :----------------------------- | :------ | :----- | :------------- |
| `listener.tcp.max_connections` | 1024000 | 按需   | 最大连接数     |
| `listener.tcp.backlog`         | 1024    | 4096   | 连接队列       |
| `zone.max_mqueue_len`          | 10000   | 50000  | 消息队列长度   |
| `zone.keepalive_multiplier`    | 1.5     | 1.5    | Keepalive 倍数 |

## 7. 设备管理

### 7.1 设备生命周期

```
注册 → 激活 → 在线 → 离线 → 禁用 → 删除
  │      │      │      │      │
  预注册  首次连接  正常运行  断网   异常设备
```

### 7.2 设备认证方式

| 方式           | 安全性 | 复杂度 | 适用场景   |
| :------------- | :----- | :----- | :--------- |
| **Token**      | 低     | 低     | 开发测试   |
| **X.509 证书** | 高     | 中     | 生产环境   |
| **一机一密**   | 中     | 低     | 大规模部署 |
| **一型一密**   | 中     | 低     | 同类设备   |

### 7.3 OTA 固件更新

```python
# OTA 更新流程
class OTAManager:
    def __init__(self, mqtt_client):
        self.client = mqtt_client
        self.current_version = "1.0.0"

    def check_update(self):
        """检查固件更新"""
        self.client.publish(
            "ota/check",
            json.dumps({"current_version": self.current_version})
        )

    def download_firmware(self, url: str, checksum: str):
        """下载固件"""
        import hashlib
        import requests

        response = requests.get(url, stream=True)
        firmware_data = b""
        for chunk in response.iter_content(chunk_size=8192):
            firmware_data += chunk

        # 校验
        actual = hashlib.sha256(firmware_data).hexdigest()
        if actual != checksum:
            raise ValueError("固件校验失败")

        # 写入
        with open("/tmp/firmware.bin", "wb") as f:
            f.write(firmware_data)

    def apply_update(self):
        """应用更新"""
        import subprocess
        result = subprocess.run(
            ["sysupgrade", "/tmp/firmware.bin"],
            capture_output=True
        )
        return result.returncode == 0
```

## 8. 小结

IoT 平台是连接设备和应用的桥梁：

1. **AWS/Azure IoT** 适合海外和大型企业，功能完善但成本较高
2. **阿里云 IoT** 国内首选，物模型设计规范，合规性好
3. **ThingsBoard** 开源可私有化，适合中小企业和定制需求
4. **EMQX** 是高性能 MQTT Broker，适合纯消息场景
5. **设备管理**需关注认证方式、生命周期和 OTA 更新
6. **规则引擎**是平台的核心，实现数据流转和业务逻辑
