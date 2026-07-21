---
order: 53
title: ESP32开发
module: iot
category: 'eng-infra'
difficulty: intermediate
description: ESP32开发：双核架构、WiFi/蓝牙、FreeRTOS、低功耗模式与项目实战。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/CoAP协议
  - iot/Arduino开发
  - 'iot/RT-Thread实时系统'
  - iot/边缘AI
prerequisites:
  - iot/概述与架构
---

## 1. ESP32 概述

### 1.1 芯片特性

| 特性  | ESP32        | ESP32-S3     | ESP32-C3     |
| ----- | ------------ | ------------ | ------------ |
| 内核  | 双核 Xtensa  | 双核 Xtensa  | 单核 RISC-V  |
| 频率  | 240MHz       | 240MHz       | 160MHz       |
| WiFi  | 802.11 b/g/n | 802.11 b/g/n | 802.11 b/g/n |
| 蓝牙  | BT 4.2 + BLE | BT 5.0 + BLE | BT 5.0 + BLE |
| Flash | 4-16MB       | 8-32MB       | 4-16MB       |
| GPIO  | 34           | 45           | 22           |
| ADC   | 18 通道      | 20 通道      | 6 通道       |

### 1.2 开发框架

| 框架          | 语言   | 特点          |
| ------------- | ------ | ------------- |
| Arduino IDE   | C++    | 简单易用      |
| ESP-IDF       | C      | 官方、功能全  |
| MicroPython   | Python | 快速原型      |
| CircuitPython | Python | Adafruit 生态 |

## 2. WiFi 开发

### 2.1 STA 模式

```cpp
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  WiFi.begin("SSID", "PASSWORD");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
}
```

### 2.2 AP 模式

```cpp
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  WiFi.softAP("ESP32-Hotspot", "password123");
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());
}
```

### 2.3 HTTP 客户端

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("https://api.example.com/data");
    int code = http.GET();

    if (code > 0) {
      String payload = http.getString();
      Serial.println(payload);
    }
    http.end();
  }
  delay(10000);
}
```

### 2.4 MQTT 通信

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Message: " + message);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("esp32-client")) {
      client.subscribe("home/control/#");
    } else {
      delay(5000);
    }
  }
}

void setup() {
  WiFi.begin("SSID", "PASSWORD");
  client.setServer("broker.emqx.io", 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  client.publish("home/sensor/temp", "25.5");
  delay(5000);
}
```

## 3. BLE 开发

### 3.1 BLE Server

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

void setup() {
  BLEDevice::init("ESP32-BLE");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristic->setValue("Hello BLE");
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();
}
```

## 4. FreeRTOS 多任务

### 4.1 双核任务

```cpp
TaskHandle_t Task1;
TaskHandle_t Task2;

void task1(void *pvParameters) {
  for (;;) {
    // 核心 0：传感器读取
    float temp = readTemperature();
    vTaskDelay(1000 / portTICK_PERIOD_MS);
  }
}

void task2(void *pvParameters) {
  for (;;) {
    // 核心 1：网络通信
    publishMQTT();
    vTaskDelay(5000 / portTICK_PERIOD_MS);
  }
}

void setup() {
  xTaskCreatePinnedToCore(task1, "Sensor", 4096, NULL, 1, &Task1, 0);
  xTaskCreatePinnedToCore(task2, "Network", 8192, NULL, 1, &Task2, 1);
}
```

### 4.2 任务间通信

```cpp
QueueHandle_t tempQueue;

void sensorTask(void *pvParameters) {
  for (;;) {
    float temp = readTemperature();
    xQueueSend(tempQueue, &temp, portMAX_DELAY);
    vTaskDelay(1000 / portTICK_PERIOD_MS);
  }
}

void networkTask(void *pvParameters) {
  float temp;
  for (;;) {
    if (xQueueReceive(tempQueue, &temp, portMAX_DELAY)) {
      publishMQTT(temp);
    }
  }
}

void setup() {
  tempQueue = xQueueCreate(10, sizeof(float));
  xTaskCreate(sensorTask, "Sensor", 4096, NULL, 1, NULL);
  xTaskCreate(networkTask, "Network", 8192, NULL, 1, NULL);
}
```

## 5. 低功耗模式

### 5.1 睡眠模式

| 模式        | 功耗   | 唤醒方式         |
| ----------- | ------ | ---------------- |
| Active      | ~240mA | -                |
| Modem Sleep | ~3mA   | 定时器           |
| Light Sleep | ~0.8mA | GPIO/定时器      |
| Deep Sleep  | ~10μA  | GPIO/定时器/触摸 |

### 5.2 Deep Sleep

```cpp
#define uS_TO_S_FACTOR 1000000ULL
#define TIME_TO_SLEEP  60

void setup() {
  Serial.begin(115200);

  // 读取传感器
  float temp = readTemperature();
  sendToServer(temp);

  // 进入深度睡眠 60 秒
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}

void loop() {
  // 不会执行（Deep Sleep 后重启）
}
```

## 6. 项目实战：WiFi 温湿度监控

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHT22);
WiFiClient espClient;
PubSubClient client(espClient);

void sendSensorData() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  StaticJsonDocument<128> doc;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["device"] = "esp32-001";

  char buffer[128];
  serializeJson(doc, buffer);
  client.publish("iot/sensor/data", buffer);
}

void setup() {
  dht.begin();
  WiFi.begin("SSID", "PASSWORD");
  client.setServer("broker.emqx.io", 1883);
}

void loop() {
  if (!client.connected()) {
    client.connect("esp32-sensor-001");
  }
  client.loop();
  sendSensorData();

  // Deep Sleep 5 分钟
  esp_sleep_enable_timer_wakeup(300 * 1000000ULL);
  esp_deep_sleep_start();
}
```
