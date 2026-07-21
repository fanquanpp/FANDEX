---
order: 8
title: 实战项目
module: iot
category: 物联网
difficulty: advanced
description: 智能家居、环境监测、工业预测维护、智慧农业与完整链路实战。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/数据处理与分析
  - iot/安全与隐私
  - iot/MQTT协议
  - iot/CoAP协议
prerequisites: []
---

## 1. 智能家居系统

### 1.1 系统架构

```
┌──────────┐  Wi-Fi/BLE  ┌──────────┐   MQTT   ┌──────────┐
│ 智能设备  │ ←─────────→ │ 家庭网关  │ ────────→│ 云平台    │
│ 灯/空调   │             │ (ESP32)  │          │          │
│ 门锁/窗帘 │             └──────────┘          └──────────┘
└──────────┘                                    ┌──────────┐
                                                │ 手机 App │
                                                └──────────┘
```

### 1.2 设备端实现

```cpp
// ESP32 智能灯控制器
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "HomeWiFi";
const char* password = "password";
const char* mqtt_server = "broker.emqx.io";

// 设备信息
const char* device_id = "light-living-001";
const char* device_type = "smart_light";

// 引脚
#define LED_R 25
#define LED_G 26
#define LED_B 27

WiFiClient espClient;
PubSubClient client(espClient);

// 当前状态
struct LightState {
    bool power = false;
    int brightness = 100;
    int color_r = 255, color_g = 255, color_b = 255;
} state;

void apply_state() {
    if (!state.power) {
        ledcWrite(0, 0); ledcWrite(1, 0); ledcWrite(2, 0);
        return;
    }
    float factor = state.brightness / 100.0;
    ledcWrite(0, (int)(state.color_r * factor));
    ledcWrite(1, (int)(state.color_g * factor));
    ledcWrite(2, (int)(state.color_b * factor));
}

void handle_command(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload, length);

    String cmd = doc["command"];
    if (cmd == "set_power") {
        state.power = doc["value"];
    } else if (cmd == "set_brightness") {
        state.brightness = doc["value"];
    } else if (cmd == "set_color") {
        state.color_r = doc["r"];
        state.color_g = doc["g"];
        state.color_b = doc["b"];
    }

    apply_state();
    report_state();
}

void report_state() {
    StaticJsonDocument<256> doc;
    doc["device_id"] = device_id;
    doc["power"] = state.power;
    doc["brightness"] = state.brightness;
    doc["color"]["r"] = state.color_r;
    doc["color"]["g"] = state.color_g;
    doc["color"]["b"] = state.color_b;

    char buffer[256];
    serializeJson(doc, buffer);
    client.publish("home/light/state", buffer);
}

void setup() {
    ledcSetup(0, 5000, 8); ledcAttachPin(LED_R, 0);
    ledcSetup(1, 5000, 8); ledcAttachPin(LED_G, 1);
    ledcSetup(2, 5000, 8); ledcAttachPin(LED_B, 2);

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) delay(500);

    client.setServer(mqtt_server, 1883);
    client.setCallback(handle_command);
    client.connect(device_id);
    client.subscribe("home/light/command");
}

void loop() {
    client.loop();
}
```

### 1.3 规则引擎

```python
# 智能家居规则引擎
class SmartHomeRules:
    def __init__(self, mqtt_client):
        self.client = mqtt_client
        self.rules = []

    def add_rule(self, trigger, action):
        self.rules.append({"trigger": trigger, "action": action})

    def evaluate(self, event: dict):
        for rule in self.rules:
            if rule["trigger"](event):
                rule["action"](event)

# 定义规则
rules = SmartHomeRules(mqtt_client)

# 规则1：温度超过 28°C 自动开空调
rules.add_rule(
    trigger=lambda e: e.get("type") == "temperature" and e["value"] > 28,
    action=lambda e: mqtt_client.publish("home/ac/command",
        json.dumps({"command": "set_power", "value": True}))
)

# 规则2：人离开自动关灯
rules.add_rule(
    trigger=lambda e: e.get("type") == "presence" and e["value"] == "left",
    action=lambda e: mqtt_client.publish("home/light/command",
        json.dumps({"command": "set_power", "value": False}))
)

# 规则3：日落自动开灯
rules.add_rule(
    trigger=lambda e: e.get("type") == "sun_event" and e["value"] == "sunset",
    action=lambda e: mqtt_client.publish("home/light/command",
        json.dumps({"command": "set_power", "value": True, "brightness": 60}))
)
```

## 2. 环境监测站

### 2.1 系统架构

```
传感器集群 → LoRa 网关 → MQTT Broker → 时序数据库 → Grafana
  (野外)     (太阳能)    (EMQX)       (TDengine)    (可视化)
```

### 2.2 传感器节点

```cpp
// LoRa 环境监测节点
#include <LoRa.h>
#include <DHT.h>
#include <BH1750.h>
#include <Wire.h>

#define DHT_PIN 4
#define LORA_CS 18
#define LORA_RST 14
#define LORA_IRQ 26

DHT dht(DHT_PIN, DHT22);
BH1750 lightMeter;

struct SensorData {
    float temperature;
    float humidity;
    float light;
    float battery_voltage;
    uint32_t timestamp;
};

void setup() {
    dht.begin();
    Wire.begin();
    lightMeter.begin();

    LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);
    LoRa.begin(470E6);  // 中国 LoRa 频段
    LoRa.setSpreadingFactor(10);
    LoRa.setCodingRate4(5);
    LoRa.setTxPower(17);
}

void loop() {
    SensorData data;
    data.temperature = dht.readTemperature();
    data.humidity = dht.readHumidity();
    data.light = lightMeter.readLightLevel();
    data.battery_voltage = readBattery();
    data.timestamp = millis();

    // 发送数据
    LoRa.beginPacket();
    LoRa.write((uint8_t*)&data, sizeof(data));
    LoRa.endPacket();

    // Deep Sleep 5分钟
    esp_sleep_enable_timer_wakeup(300 * 1000000);
    esp_deep_sleep_start();
}
```

### 2.3 数据后端

```python
# 环境监测数据后端
from influxdb_client import InfluxDBClient, Point
import paho.mqtt.client as mqtt
import json

# InfluxDB 写入
influx_client = InfluxDBClient(url="http://localhost:8086", token="token", org="org")
write_api = influx_client.write_api()

# MQTT 消费
def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())

    point = Point("environment") \
        .tag("station_id", data["station_id"]) \
        .tag("location", data["location"]) \
        .field("temperature", data["temperature"]) \
        .field("humidity", data["humidity"]) \
        .field("pm25", data.get("pm25", 0)) \
        .field("light", data.get("light", 0)) \
        .field("battery", data.get("battery", 0))

    write_api.write(bucket="environment", record=point)

mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message
mqtt_client.connect("emqx", 1883)
mqtt_client.subscribe("env/+/data")
mqtt_client.loop_forever()
```

## 3. 工业预测维护

### 3.1 系统架构

```
振动/温度传感器 → 边缘网关 → 特征提取 → 异常检测 → 告警
                                    ↓
                              云端模型训练 → 模型下发
```

### 3.2 振动数据采集

```python
import numpy as np
from scipy import signal, fft

class VibrationAnalyzer:
    """振动数据分析"""
    def __init__(self, sample_rate=10000):
        self.sample_rate = sample_rate

    def extract_features(self, vibration_data: np.ndarray) -> dict:
        """提取振动特征"""
        # 时域特征
        rms = np.sqrt(np.mean(vibration_data ** 2))
        peak = np.max(np.abs(vibration_data))
        crest_factor = peak / rms if rms > 0 else 0
        kurtosis = self._kurtosis(vibration_data)

        # 频域特征
        freqs, psd = signal.welch(vibration_data, fs=self.sample_rate, nperseg=1024)
        dominant_freq = freqs[np.argmax(psd)]
        spectral_centroid = np.sum(freqs * psd) / np.sum(psd)

        return {
            "rms": float(rms),
            "peak": float(peak),
            "crest_factor": float(crest_factor),
            "kurtosis": float(kurtosis),
            "dominant_freq": float(dominant_freq),
            "spectral_centroid": float(spectral_centroid)
        }

    def _kurtosis(self, data: np.ndarray) -> float:
        n = len(data)
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0
        return float(np.sum(((data - mean) / std) ** 4) / n - 3)

    def detect_anomaly(self, features: dict, thresholds: dict) -> dict:
        """异常检测"""
        alerts = []
        for key, threshold in thresholds.items():
            if key in features and features[key] > threshold:
                alerts.append(f"{key} 超阈值: {features[key]:.2f} > {threshold}")
        return {"is_anomaly": len(alerts) > 0, "alerts": alerts}
```

### 3.3 预测模型

```python
# 剩余使用寿命（RUL）预测
from sklearn.ensemble import GradientBoostingRegressor
import numpy as np

class RULPredictor:
    """剩余使用寿命预测"""
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1
        )

    def train(self, features: np.ndarray, rul_labels: np.ndarray):
        self.model.fit(features, rul_labels)

    def predict(self, features: np.ndarray) -> dict:
        predicted_rul = self.model.predict(features.reshape(1, -1))[0]
        confidence = self._estimate_confidence(features)

        return {
            "predicted_rul_hours": float(predicted_rul),
            "confidence": float(confidence),
            "maintenance_needed": predicted_rul < 72  # 72小时阈值
        }

    def _estimate_confidence(self, features):
        # 简化的置信度估计
        predictions = []
        for estimator in self.model.estimators_:
            pred = estimator[0].predict(features.reshape(1, -1))
            predictions.append(pred[0])
        return 1.0 - np.std(predictions) / (np.mean(predictions) + 1e-6)
```

## 4. 智慧农业

### 4.1 系统架构

```
土壤/气象传感器 → NB-IoT → 云平台 → 农业决策引擎 → 自动灌溉
                                              ↓
                                         手机 App 通知
```

### 4.2 农业决策引擎

```python
class AgricultureDecisionEngine:
    """农业决策引擎"""
    def __init__(self, mqtt_client):
        self.client = mqtt_client
        self.crop_config = {
            "tomato": {
                "optimal_temp": (20, 30),
                "optimal_humidity": (60, 80),
                "optimal_soil_moisture": (40, 60),
                "water_per_irrigation_ml": 500
            }
        }

    def evaluate(self, sensor_data: dict, crop: str = "tomato"):
        config = self.crop_config.get(crop, {})
        decisions = []

        # 温度决策
        temp = sensor_data.get("temperature", 0)
        opt_temp = config.get("optimal_temp", (0, 100))
        if temp < opt_temp[0]:
            decisions.append({"action": "close_ventilation", "reason": f"温度过低: {temp}°C"})
        elif temp > opt_temp[1]:
            decisions.append({"action": "open_ventilation", "reason": f"温度过高: {temp}°C"})

        # 灌溉决策
        soil_moisture = sensor_data.get("soil_moisture", 50)
        opt_moisture = config.get("optimal_soil_moisture", (30, 70))
        if soil_moisture < opt_moisture[0]:
            water = config.get("water_per_irrigation_ml", 500)
            decisions.append({
                "action": "irrigate",
                "amount_ml": water,
                "reason": f"土壤湿度低: {soil_moisture}%"
            })

        # 执行决策
        for decision in decisions:
            self._execute(decision)

        return decisions

    def _execute(self, decision: dict):
        self.client.publish(
            "farm/actuator/command",
            json.dumps(decision)
        )
```

## 5. MQTT 数据采集完整链路

### 5.1 完整系统

```python
# 完整 IoT 数据采集系统
import json
import time
import threading
from datetime import datetime
import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point, WritePrecision

class IoTDataPipeline:
    """IoT 数据采集完整链路"""

    def __init__(self, config: dict):
        self.config = config
        self.mqtt_client = None
        self.influx_client = None
        self.running = False

    def start(self):
        self._init_mqtt()
        self._init_influxdb()
        self.running = True
        print("IoT 数据管道已启动")

    def _init_mqtt(self):
        self.mqtt_client = mqtt.Client(client_id="data-pipeline")
        self.mqtt_client.on_connect = self._on_connect
        self.mqtt_client.on_message = self._on_message
        self.mqtt_client.connect(
            self.config["mqtt"]["host"],
            self.config["mqtt"]["port"]
        )
        self.mqtt_client.loop_start()

    def _init_influxdb(self):
        self.influx_client = InfluxDBClient(
            url=self.config["influxdb"]["url"],
            token=self.config["influxdb"]["token"],
            org=self.config["influxdb"]["org"]
        )
        self.write_api = self.influx_client.write_api()

    def _on_connect(self, client, userdata, flags, rc):
        topics = self.config["mqtt"]["subscribe_topics"]
        for topic in topics:
            client.subscribe(topic, qos=1)
        print(f"已订阅: {topics}")

    def _on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            self._process_message(msg.topic, data)
        except Exception as e:
            print(f"处理消息失败: {e}")

    def _process_message(self, topic: str, data: dict):
        # 1. 数据验证
        if not self._validate(data):
            return

        # 2. 数据清洗
        cleaned = self._clean(data)

        # 3. 写入时序数据库
        self._write_to_influx(cleaned)

        # 4. 规则检查
        alerts = self._check_rules(cleaned)
        for alert in alerts:
            self._send_alert(alert)

    def _validate(self, data: dict) -> bool:
        required = ["device_id", "timestamp"]
        return all(k in data for k in required)

    def _clean(self, data: dict) -> dict:
        # 范围过滤
        if "temperature" in data:
            if not (-40 <= data["temperature"] <= 80):
                data["temperature"] = None
        return data

    def _write_to_influx(self, data: dict):
        point = Point("sensor_data") \
            .tag("device_id", data.get("device_id", "unknown"))

        for key, value in data.items():
            if key not in ["device_id", "timestamp"] and value is not None:
                if isinstance(value, (int, float)):
                    point = point.field(key, value)

        self.write_api.write(
            bucket=self.config["influxdb"]["bucket"],
            record=point
        )

    def _check_rules(self, data: dict) -> list:
        alerts = []
        if data.get("temperature", 0) > 35:
            alerts.append({"type": "high_temp", "device": data["device_id"], "value": data["temperature"]})
        return alerts

    def _send_alert(self, alert: dict):
        self.mqtt_client.publish("iot/alerts", json.dumps(alert))

# 配置与启动
config = {
    "mqtt": {
        "host": "broker.emqx.io",
        "port": 1883,
        "subscribe_topics": ["iot/+/data", "iot/+/event"]
    },
    "influxdb": {
        "url": "http://localhost:8086",
        "token": "my-token",
        "org": "my-org",
        "bucket": "iot-data"
    }
}

pipeline = IoTDataPipeline(config)
pipeline.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("停止中...")
```

## 6. 从传感器到云端完整链路

### 6.1 部署架构

```yaml
# docker-compose.yml - 完整 IoT 平台
version: '3.8'
services:
  # MQTT Broker
  emqx:
    image: emqx/emqx:5.7
    ports:
      - '1883:1883'
      - '18083:18083'

  # 时序数据库
  tdengine:
    image: tdengine/tdengine:3.3
    ports:
      - '6041:6041'
    volumes:
      - td-data:/var/lib/taos

  # 数据管道
  data-pipeline:
    build: ./pipeline
    depends_on:
      - emqx
      - tdengine
    environment:
      MQTT_HOST: emqx
      TDENGINE_HOST: tdengine

  # 规则引擎
  rule-engine:
    build: ./rules
    depends_on:
      - emqx
    environment:
      MQTT_HOST: emqx

  # Grafana 可视化
  grafana:
    image: grafana/grafana:11.0
    ports:
      - '3000:3000'
    depends_on:
      - tdengine

  # ThingsBoard
  thingsboard:
    image: thingsboard/tb-postgres:latest
    ports:
      - '9090:9090'
      - '1883:1883'

volumes:
  td-data:
```

### 6.2 关键配置

| 组件            | 配置要点                     |
| :-------------- | :--------------------------- |
| **EMQX**        | 认证方式、ACL 规则、集群     |
| **TDengine**    | 保留天数、缓存大小、副本数   |
| **数据管道**    | 批量大小、写入间隔、错误重试 |
| **Grafana**     | Dashboard 模板、告警通道     |
| **ThingsBoard** | 设备配置、规则链、OTA        |

## 7. 小结

实战项目是掌握 IoT 开发的最佳方式：

1. **智能家居**是最常见的消费 IoT 场景，核心是设备控制和规则引擎
2. **环境监测**适合学习 LoRa + 低功耗 + 时序数据库
3. **预测维护**是工业 IoT 的核心价值，需掌握振动分析和 ML 模型
4. **智慧农业**结合传感器和自动控制，体现 IoT 的闭环价值
5. **完整链路**从传感器到云端，涵盖采集、传输、存储、分析和可视化
6. Docker Compose 可快速搭建完整 IoT 平台，适合开发和测试
