---
order: 52
title: Arduino开发
module: iot
category: 'eng-infra'
difficulty: beginner
description: Arduino入门：开发环境、编程基础、传感器交互与项目实战详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/MQTT协议
  - iot/CoAP协议
  - iot/ESP32开发
  - 'iot/RT-Thread实时系统'
prerequisites:
  - iot/概述与架构
---

## 1. Arduino 概述

### 1.1 什么是 Arduino

Arduino 是开源电子原型平台，包含硬件（微控制器板）和软件（IDE），适合快速开发交互式电子项目。

### 1.2 常见开发板

| 开发板    | MCU        | 电压 | Flash | 特点     |
| --------- | ---------- | ---- | ----- | -------- |
| Uno R3    | ATmega328P | 5V   | 32KB  | 入门首选 |
| Nano      | ATmega328P | 5V   | 32KB  | 小型     |
| Mega 2560 | ATmega2560 | 5V   | 256KB | 引脚多   |
| Leonardo  | ATmega32U4 | 5V   | 32KB  | USB HID  |
| Due       | SAM3X8E    | 3.3V | 512KB | ARM      |

### 1.3 开发环境

- Arduino IDE 2.x
- PlatformIO (VS Code)
- Arduino Web Editor

## 2. 编程基础

### 2.1 程序结构

```cpp
void setup() {
  // 初始化代码，只执行一次
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // 主循环，重复执行
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```

### 2.2 数字 I/O

```cpp
// 设置引脚模式
pinMode(7, OUTPUT);   // 输出
pinMode(8, INPUT);    // 输入
pinMode(9, INPUT_PULLUP); // 内部上拉

// 数字输出
digitalWrite(7, HIGH);
digitalWrite(7, LOW);

// 数字输入
int value = digitalRead(8);
```

### 2.3 模拟 I/O

```cpp
// 模拟读取（0-1023）
int sensorValue = analogRead(A0);

// 模拟输出（PWM，0-255）
analogWrite(9, 128);  // 50% 占空比

// 模拟参考电压
analogReference(INTERNAL);  // 1.1V
```

### 2.4 串口通信

```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) {
    char data = Serial.read();
    Serial.print("Received: ");
    Serial.println(data);
  }
  Serial.println("Hello");
  delay(1000);
}
```

## 3. 传感器交互

### 3.1 温湿度传感器（DHT11/DHT22）

```cpp
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Sensor read failed!");
    return;
  }

  Serial.print("Temp: "); Serial.print(temperature);
  Serial.print("°C  Humidity: "); Serial.print(humidity);
  Serial.println("%");
  delay(2000);
}
```

### 3.2 超声波测距（HC-SR04）

```cpp
#define TRIG_PIN 9
#define ECHO_PIN 10

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;  // cm
}

void loop() {
  float dist = getDistance();
  Serial.print("Distance: "); Serial.print(dist); Serial.println(" cm");
  delay(500);
}
```

### 3.3 光敏电阻

```cpp
#define LIGHT_PIN A0

void setup() {
  Serial.begin(9600);
}

void loop() {
  int lightValue = analogRead(LIGHT_PIN);
  Serial.print("Light: "); Serial.println(lightValue);
  delay(500);
}
```

## 4. 执行器控制

### 4.1 LED 控制

```cpp
// 呼吸灯
#define LED_PIN 9

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  for (int brightness = 0; brightness <= 255; brightness++) {
    analogWrite(LED_PIN, brightness);
    delay(5);
  }
  for (int brightness = 255; brightness >= 0; brightness--) {
    analogWrite(LED_PIN, brightness);
    delay(5);
  }
}
```

### 4.2 舵机控制

```cpp
#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  myServo.write(0);     // 0度
  delay(1000);
  myServo.write(90);    // 90度
  delay(1000);
  myServo.write(180);   // 180度
  delay(1000);
}
```

### 4.3 电机控制（L298N）

```cpp
#define ENA 5
#define IN1 6
#define IN2 7

void setup() {
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
}

void motorForward(int speed) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, speed);
}

void motorStop() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0);
}
```

## 5. 通信模块

### 5.1 WiFi（ESP8266）

```cpp
#include <ESP8266WiFi.h>

const char* ssid = "YourWiFi";
const char* password = "YourPassword";

void setup() {
  Serial.begin(9600);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  Serial.println(WiFi.localIP());
}
```

### 5.2 I2C 通信

```cpp
#include <Wire.h>

void setup() {
  Wire.begin();  // 加入 I2C 总线
  Serial.begin(9600);
}

void loop() {
  Wire.requestFrom(0x68, 6);  // 从地址 0x68 读取 6 字节
  while (Wire.available()) {
    char c = Wire.read();
    Serial.print(c);
  }
  delay(500);
}
```

## 6. 项目实战：智能温控器

```cpp
#include <DHT.h>
#include <LiquidCrystal_I2C.h>

#define DHTPIN 2
#define RELAY_PIN 3
#define BUTTON_PIN 4

DHT dht(DHTPIN, DHT11);
LiquidCrystal_I2C lcd(0x27, 16, 2);

float targetTemp = 25.0;

void setup() {
  dht.begin();
  lcd.init();
  lcd.backlight();
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void loop() {
  float temp = dht.readTemperature();

  lcd.setCursor(0, 0);
  lcd.print("Temp: "); lcd.print(temp); lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Target: "); lcd.print(targetTemp); lcd.print("C");

  // 温度控制
  if (temp < targetTemp) {
    digitalWrite(RELAY_PIN, HIGH);  // 开启加热
  } else {
    digitalWrite(RELAY_PIN, LOW);   // 关闭加热
  }

  // 按钮调节目标温度
  if (digitalRead(BUTTON_PIN) == LOW) {
    targetTemp += 0.5;
    if (targetTemp > 30) targetTemp = 20;
    delay(200);
  }

  delay(1000);
}
```
