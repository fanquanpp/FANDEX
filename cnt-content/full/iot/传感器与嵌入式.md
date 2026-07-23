---
order: 2
title: 传感器与嵌入式
module: iot
category: 物联网
difficulty: intermediate
description: '传感器类型与原理、嵌入式开发、GPIO/I2C/SPI/UART、RTOS 与低功耗设计。'
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/概述与架构
  - iot/通信协议
  - iot/边缘计算
prerequisites: []
---

## 1. 传感器类型与原理

### 1.1 传感器分类

| 类型       | 测量对象  | 代表传感器       | 输出信号 |
| :--------- | :-------- | :--------------- | :------- |
| **温度**   | 温度      | DS18B20、DHT22   | 数字/I2C |
| **湿度**   | 湿度      | DHT22、SHT30     | 数字/I2C |
| **压力**   | 气压/液压 | BMP280、MPX5010  | I2C/模拟 |
| **加速度** | 加速度    | MPU6050、ADXL345 | I2C/SPI  |
| **光照**   | 光强      | BH1750、光敏电阻 | I2C/模拟 |
| **气体**   | 气体浓度  | MQ-2、BME680     | 模拟/I2C |
| **距离**   | 距离      | HC-SR04、VL53L0X | 数字/I2C |
| **GPS**    | 位置      | NEO-6M、NEO-M8N  | UART     |

### 1.2 模拟与数字传感器

| 类型     | 原理             | 优点           | 缺点             |
| :------- | :--------------- | :------------- | :--------------- |
| **模拟** | 输出连续电压信号 | 简单、低成本   | 需 ADC、抗干扰差 |
| **数字** | 输出数字信号     | 抗干扰、精度高 | 协议复杂         |

### 1.3 ADC/DAC

```c
// STM32 ADC 读取模拟传感器
#include "stm32f4xx_hal.h"

ADC_HandleTypeDef hadc1;

void ADC_Init(void) {
    hadc1.Instance = ADC1;
    hadc1.Init.ClockPrescaler = ADC_CLOCK_SYNC_PCLK_DIV4;
    hadc1.Init.Resolution = ADC_RESOLUTION_12B;      // 12位精度
    hadc1.Init.ScanConvMode = DISABLE;
    hadc1.Init.ContinuousConvMode = ENABLE;           // 连续转换
    hadc1.Init.DMAContinuousRequests = ENABLE;
    HAL_ADC_Init(&hadc1);
}

uint16_t ADC_Read(uint32_t channel) {
    ADC_ChannelConfTypeDef sConfig = {0};
    sConfig.Channel = channel;
    sConfig.Rank = 1;
    sConfig.SamplingTime = ADC_SAMPLETIME_480CYCLES;
    HAL_ADC_ConfigChannel(&hadc1, &sConfig);

    HAL_ADC_Start(&hadc1);
    HAL_ADC_PollForConversion(&hadc1, HAL_MAX_DELAY);
    return HAL_ADC_GetValue(&hadc1);
}

// 将 ADC 值转换为电压和温度
float read_temperature(void) {
    uint16_t adc_value = ADC_Read(ADC_CHANNEL_0);
    float voltage = (adc_value / 4095.0f) * 3.3f;  // 12位, 3.3V参考
    float temperature = voltage * 100.0f;           // LM35: 10mV/°C
    return temperature;
}
```

## 2. 嵌入式开发

### 2.1 MCU 对比

| MCU             | 架构           | 主频   | Flash    | RAM   | Wi-Fi | 价格 |
| :-------------- | :------------- | :----- | :------- | :---- | :---- | :--- |
| **ESP32**       | Xtensa         | 240MHz | 4MB      | 520KB |       | ¥15  |
| **ESP32-S3**    | Xtensa         | 240MHz | 8-16MB   | 512KB |       | ¥20  |
| **STM32F4**     | ARM Cortex-M4  | 168MHz | 1MB      | 192KB |       | ¥25  |
| **STM32H7**     | ARM Cortex-M7  | 480MHz | 2MB      | 1MB   |       | ¥60  |
| **RP2040**      | ARM Cortex-M0+ | 133MHz | 16MB(外) | 264KB |       | ¥8   |
| **Arduino Uno** | AVR            | 16MHz  | 32KB     | 2KB   |       | ¥25  |

### 2.2 ESP32 开发（Arduino）

```cpp
// ESP32 + DHT22 温湿度传感器
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// 引脚定义
#define DHT_PIN 4
#define LED_PIN 2
#define DHT_TYPE DHT22

// WiFi 配置
const char* ssid = "YourWiFi";
const char* password = "YourPassword";

// MQTT 配置
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_topic = "iot/sensor/data";

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
    delay(10);
    Serial.println("Connecting to WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected, IP: " + WiFi.localIP().toString());
}

void reconnect() {
    while (!client.connected()) {
        String clientId = "ESP32-" + String(random(0xffff), HEX);
        if (client.connect(clientId.c_str())) {
            Serial.println("MQTT connected");
            client.subscribe("iot/sensor/commands");
        } else {
            Serial.print("MQTT failed, rc=");
            Serial.print(client.state());
            delay(5000);
        }
    }
}

void callback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    Serial.println("Command: " + message);

    if (message == "LED_ON") digitalWrite(LED_PIN, HIGH);
    else if (message == "LED_OFF") digitalWrite(LED_PIN, LOW);
}

void setup() {
    Serial.begin(115200);
    dht.begin();
    pinMode(LED_PIN, OUTPUT);

    setup_wifi();
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
}

void loop() {
    if (!client.connected()) reconnect();
    client.loop();

    // 读取传感器
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
        Serial.println("Sensor read failed!");
        delay(2000);
        return;
    }

    // 构建 JSON
    String payload = "{\"device\":\"ESP32-001\","
                     "\"temperature\":" + String(temperature, 1) + ","
                     "\"humidity\":" + String(humidity, 1) + "}";

    client.publish(mqtt_topic, payload.c_str());
    Serial.println("Published: " + payload);

    delay(5000);  // 每5秒上报
}
```

### 2.3 ESP32 开发（MicroPython）

```python
# MicroPython - ESP32 温湿度上报
import machine
import dht
import time
import json
from umqtt.simple import MQTTClient

# 配置
WIFI_SSID = "YourWiFi"
WIFI_PASS = "YourPassword"
MQTT_BROKER = "broker.emqx.io"
MQTT_TOPIC = b"iot/sensor/data"

# 初始化
d = dht.DHT22(machine.Pin(4))
led = machine.Pin(2, machine.Pin.OUT)

def connect_wifi():
    import network
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    sta.connect(WIFI_SSID, WIFI_PASS)
    while not sta.isconnected():
        time.sleep(0.5)
    print("WiFi connected:", sta.ifconfig()[0])

def publish_data():
    mqtt = MQTTClient("esp32-001", MQTT_BROKER)
    mqtt.connect()

    while True:
        try:
            d.measure()
            data = {
                "device": "ESP32-001",
                "temperature": d.temperature(),
                "humidity": d.humidity(),
                "timestamp": time.time()
            }
            mqtt.publish(MQTT_TOPIC, json.dumps(data).encode())
            print("Published:", data)
        except Exception as e:
            print("Error:", e)

        time.sleep(5)

connect_wifi()
publish_data()
```

## 3. 通信接口

### 3.1 接口对比

| 接口       | 类型     | 速率           | 距离 | 设备数   | 用途              |
| :--------- | :------- | :------------- | :--- | :------- | :---------------- |
| **GPIO**   | 数字 I/O | -              | 板级 | 1        | LED、按键、继电器 |
| **I2C**    | 总线     | 100K-3.4Mbps   | 板级 | 127      | 传感器、EEPROM    |
| **SPI**    | 总线     | 10-80Mbps      | 板级 | 理论无限 | Flash、显示屏     |
| **UART**   | 点对点   | 9600-921600bps | 15m  | 1        | GPS、调试         |
| **1-Wire** | 总线     | 16.3kbps       | 100m | 100+     | DS18B20           |

### 3.2 I2C 示例

```cpp
// ESP32 I2C 读取 BH1750 光照传感器
#include <Wire.h>

#define BH1750_ADDR 0x23

void setup() {
    Serial.begin(115200);
    Wire.begin(21, 22);  // SDA=21, SCL=22
}

uint16_t readLight() {
    Wire.beginTransmission(BH1750_ADDR);
    Wire.write(0x10);  // 连续高分辨率模式
    Wire.endTransmission();
    delay(120);

    Wire.requestFrom(BH1750_ADDR, 2);
    if (Wire.available() == 2) {
        uint16_t lux = (Wire.read() << 8) | Wire.read();
        return lux / 1.2;
    }
    return 0;
}

void loop() {
    uint16_t light = readLight();
    Serial.printf("Light: %d lux\n", light);
    delay(1000);
}
```

### 3.3 SPI 示例

```cpp
// ESP32 SPI 读取数据
#include <SPI.h>

#define CS_PIN 5

void setup() {
    Serial.begin(115200);
    SPI.begin(18, 19, 23);  // SCK=18, MISO=19, MOSI=23
    pinMode(CS_PIN, OUTPUT);
    digitalWrite(CS_PIN, HIGH);
}

uint16_t spiRead16(uint8_t reg) {
    digitalWrite(CS_PIN, LOW);
    SPI.transfer(reg | 0x80);  // 读命令
    uint8_t msb = SPI.transfer(0x00);
    uint8_t lsb = SPI.transfer(0x00);
    digitalWrite(CS_PIN, HIGH);
    return (msb << 8) | lsb;
}
```

## 4. 实时操作系统（RTOS）

### 4.1 FreeRTOS

```c
// FreeRTOS 多任务示例
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

// 数据队列
QueueHandle_t sensor_queue;

// 传感器读取任务
void sensor_task(void *pvParameters) {
    float sensor_data;
    while (1) {
        sensor_data = read_temperature();
        xQueueSend(sensor_queue, &sensor_data, portMAX_DELAY);
        vTaskDelay(pdMS_TO_TICKS(1000));  // 1秒周期
    }
}

// 数据上报任务
void upload_task(void *pvParameters) {
    float received_data;
    while (1) {
        if (xQueueReceive(sensor_queue, &received_data, portMAX_DELAY)) {
            mqtt_publish("iot/sensor/temp", &received_data);
        }
    }
}

// LED 闪烁任务
void led_task(void *pvParameters) {
    while (1) {
        gpio_set_level(LED_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(500));
        gpio_set_level(LED_PIN, 0);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

void app_main() {
    sensor_queue = xQueueCreate(10, sizeof(float));

    xTaskCreate(sensor_task, "sensor", 4096, NULL, 2, NULL);
    xTaskCreate(upload_task, "upload", 4096, NULL, 1, NULL);
    xTaskCreate(led_task, "led", 2048, NULL, 0, NULL);
}
```

### 4.2 任务优先级设计

| 任务       | 优先级 | 周期  | 说明               |
| :--------- | :----- | :---- | :----------------- |
| 安全监控   | 最高   | 10ms  | 紧急停止、过温保护 |
| 传感器采集 | 高     | 100ms | 数据采集           |
| 通信上报   | 中     | 1s    | MQTT 数据上报      |
| 显示更新   | 低     | 100ms | UI 刷新            |
| 系统维护   | 最低   | 10s   | 看门狗、日志       |

## 5. 低功耗设计

### 5.1 功耗模式

| 模式            | 电流      | 唤醒方式         | 适用场景 |
| :-------------- | :-------- | :--------------- | :------- |
| **Active**      | 100-240mA | -                | 正常运行 |
| **Light Sleep** | 0.8mA     | GPIO/Timer       | 短暂空闲 |
| **Deep Sleep**  | 10μA      | GPIO/Timer/Touch | 长期待机 |
| **Power Off**   | ~1μA      | 复位             | 极低功耗 |

### 5.2 Deep Sleep 示例

```cpp
// ESP32 Deep Sleep 低功耗采集
#define uS_TO_S_FACTOR 1000000ULL
#define TIME_TO_SLEEP  300  // 5分钟

RTC_DATA_ATTR int bootCount = 0;  // RTC 内存保持

void setup() {
    Serial.begin(115200);
    bootCount++;
    Serial.printf("Boot #%d\n", bootCount);

    // 1. 唤醒后快速采集数据
    float temp = read_temperature();
    float humi = read_humidity();

    // 2. 连接 WiFi 并上报
    connect_wifi();
    mqtt_publish(temp, humi);

    // 3. 断开连接
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // 4. 进入 Deep Sleep
    esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
}

void loop() {
    // Deep Sleep 后不会执行到这里
}
```

### 5.3 低功耗策略

| 策略         | 描述                 | 节电效果 |
| :----------- | :------------------- | :------- |
| **间歇工作** | 周期性唤醒采集       | 90-99%   |
| **降低频率** | 降低 CPU 主频        | 30-50%   |
| **关闭外设** | 不用时关闭 Wi-Fi/BLE | 60-80%   |
| **数据压缩** | 减少传输数据量       | 10-30%   |
| **批量传输** | 积攒后一次发送       | 20-40%   |

## 6. 小结

传感器与嵌入式是 IoT 的硬件基础：

1. **传感器选型**需考虑精度、功耗、接口和成本
2. **ESP32** 是 IoT 开发的首选 MCU，内置 Wi-Fi/BLE，生态丰富
3. **I2C** 适合连接传感器，**SPI** 适合高速设备，**UART** 适合调试和 GPS
4. **FreeRTOS** 是嵌入式实时系统的标准，多任务协作提高效率
5. **Deep Sleep** 是电池供电设备的关键，可将功耗降至 μA 级
6. 低功耗设计需从硬件选型、软件策略和通信协议三方面综合考虑
