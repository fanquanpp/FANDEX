---
order: 54
title: 'RT-Thread实时系统'
module: iot
category: 'eng-infra'
difficulty: intermediate
description: 'RT-Thread实时操作系统：内核机制、设备驱动、组件框架与项目开发详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/Arduino开发
  - iot/ESP32开发
  - iot/边缘AI
  - iot/LwM2M设备管理
prerequisites:
  - iot/概述与架构
---

## 1. RT-Thread 概述

### 1.1 什么是 RT-Thread

RT-Thread 是国产开源实时操作系统（RTOS），适用于资源受限的嵌入式场景。

### 1.2 版本对比

| 版本     | RAM 需求 | Flash 需求 | 适用场景        |
| -------- | -------- | ---------- | --------------- |
| Nano     | 3KB      | 24KB       | 极小资源 MCU    |
| Standard | 10KB+    | 100KB+     | 通用嵌入式      |
| Smart    | 64KB+    | 512KB+     | 带 MMU 的处理器 |

### 1.3 架构

```
┌──────────────────────────────────┐
│          应用层                   │
├──────────────────────────────────┤
│  组件层 (FinSH/DFS/Net/...)      │
├──────────────────────────────────┤
│  内核层 (线程/IPC/定时器/内存)    │
├──────────────────────────────────┤
│  硬件层 (BSP/驱动)               │
└──────────────────────────────────┘
```

## 2. 内核机制

### 2.1 线程管理

```c
// 静态线程
ALIGN(RT_ALIGN_SIZE)
static char thread_stack[512];
static struct rt_thread thread;

rt_thread_init(&thread,
    "my_thread",
    thread_entry, RT_NULL,
    &thread_stack[0], sizeof(thread_stack),
    10, 20);

rt_thread_startup(&thread);

// 动态线程
rt_thread_t tid = rt_thread_create("dynamic",
    thread_entry, RT_NULL,
    1024, 10, 20);
rt_thread_startup(tid);
```

### 2.2 线程调度

| 调度算法   | 描述                   |
| ---------- | ---------------------- |
| 优先级抢占 | 高优先级立即抢占       |
| 时间片轮转 | 同优先级轮流执行       |
| 优先级范围 | 0（最高）~ 255（最低） |

### 2.3 线程间通信

| IPC 机制 | 描述       |
| -------- | ---------- |
| 信号量   | 同步/互斥  |
| 互斥量   | 互斥访问   |
| 事件集   | 事件通知   |
| 邮箱     | 4 字节消息 |
| 消息队列 | 变长消息   |

**信号量示例**：

```c
static rt_sem_t sem;

void producer(void *parameter) {
    while (1) {
        produce_data();
        rt_sem_release(sem);
        rt_thread_delay(100);
    }
}

void consumer(void *parameter) {
    while (1) {
        rt_sem_take(sem, RT_WAITING_FOREVER);
        consume_data();
    }
}

// 初始化
sem = rt_sem_create("data_sem", 0, RT_IPC_FLAG_PRIO);
```

**消息队列示例**：

```c
static rt_mq_t msg_queue;

struct sensor_data {
    float temperature;
    float humidity;
};

void sender(void *parameter) {
    struct sensor_data data = {25.5, 60.0};
    rt_mq_send(msg_queue, &data, sizeof(data));
}

void receiver(void *parameter) {
    struct sensor_data data;
    while (1) {
        if (rt_mq_recv(msg_queue, &data, sizeof(data), RT_WAITING_FOREVER) == RT_EOK) {
            rt_kprintf("Temp: %.1f, Hum: %.1f\n", data.temperature, data.humidity);
        }
    }
}

msg_queue = rt_mq_create("sensor_mq", sizeof(struct sensor_data), 10, RT_IPC_FLAG_PRIO);
```

### 2.4 定时器

```c
// 硬件定时器（高精度）
rt_timer_t timer = rt_timer_create("my_timer",
    timeout_callback, RT_NULL,
    100,  // 100 个 tick
    RT_TIMER_FLAG_PERIODIC);
rt_timer_start(timer);

// 软件定时器（低精度）
rt_timer_t soft_timer = rt_timer_create("soft_timer",
    timeout_callback, RT_NULL,
    1000,
    RT_TIMER_FLAG_PERIODIC | RT_TIMER_FLAG_SOFT_TIMER);
rt_timer_start(soft_timer);
```

### 2.5 内存管理

| 算法       | 描述         | 适用场景  |
| ---------- | ------------ | --------- |
| 小内存算法 | 简单链表     | RAM < 2MB |
| SLAB       | 类 SLAB 分配 | 中等 RAM  |
| memheap    | 多内存池     | 多片 RAM  |

## 3. 设备驱动框架

### 3.1 I/O 设备模型

```c
// 打开设备
rt_device_t dev = rt_device_find("uart1");
rt_device_open(dev, RT_DEVICE_OFLAG_RDWR);

// 读取
char buffer[64];
rt_size_t size = rt_device_read(dev, 0, buffer, sizeof(buffer));

// 写入
rt_device_write(dev, 0, "Hello", 5);

// 关闭
rt_device_close(dev);
```

### 3.2 PIN 设备

```c
#define LED_PIN    GET_PIN(A, 5)
#define BUTTON_PIN GET_PIN(C, 13)

rt_pin_mode(LED_PIN, PIN_MODE_OUTPUT);
rt_pin_write(LED_PIN, PIN_HIGH);

rt_pin_mode(BUTTON_PIN, PIN_MODE_INPUT_PULLUP);
rt_pin_attach_irq(BUTTON_PIN, PIN_IRQ_MODE_FALLING, button_isr, RT_NULL);
rt_pin_irq_enable(BUTTON_PIN, PIN_IRQ_ENABLE);
```

### 3.3 ADC 设备

```c
rt_adc_device_t adc_dev = (rt_adc_device_t)rt_device_find("adc1");
rt_adc_enable(adc_dev, 0);  // 通道 0
rt_uint32_t value = rt_adc_read(adc_dev, 0);
float voltage = value * 3.3 / 4096;
rt_adc_disable(adc_dev, 0);
```

## 4. 组件框架

### 4.1 FinSH 控制台

```c
// 导出命令
MSH_CMD_EXPORT(hello, hello command);

// 带参数命令
int echo_args(int argc, char **argv) {
    rt_kprintf("argc=%d\n", argc);
    for (int i = 0; i < argc; i++) {
        rt_kprintf("argv[%d]=%s\n", i, argv[i]);
    }
    return 0;
}
MSH_CMD_EXPORT(echo_args, echo args command);
```

### 4.2 DFS 文件系统

```c
// 挂载文件系统
dfs_mount("flash", "/", "elm", 0, 0);

// 文件操作
int fd = open("/data/log.txt", O_WRONLY | O_CREAT);
write(fd, "Hello RT-Thread", 15);
close(fd);
```

### 4.3 网络框架

```c
// TCP 客户端
int sock = socket(AF_INET, SOCK_STREAM, 0);
struct sockaddr_in server_addr;
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8080);
inet_pton(AF_INET, "192.168.1.100", &server_addr.sin_addr);
connect(sock, (struct sockaddr *)&server_addr, sizeof(server_addr));
send(sock, "Hello", 5, 0);
closesocket(sock);
```

## 5. 项目实战

### 5.1 智能网关

```
传感器 → RT-Thread → MQTT → 云平台
              ↓
         本地控制逻辑
```

### 5.2 开发流程

```
1. 选择 BSP → env 工具配置
2. menuconfig → 选择组件
3. scons → 编译
4. 烧录 → 调试
5. FinSH → 测试
```
