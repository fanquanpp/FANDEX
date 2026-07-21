---
order: 6
title: 数据处理与分析
module: iot
category: 物联网
difficulty: advanced
description: 时序数据库、流处理、数据清洗、异常检测与数字孪生。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/边缘计算
  - iot/IoT平台
  - iot/安全与隐私
  - iot/实战项目
prerequisites: []
---

## 1. IoT 数据特征

### 1.1 数据特点

| 特点           | 描述           | 影响         |
| :------------- | :------------- | :----------- |
| **时序性**     | 数据带时间戳   | 需时序数据库 |
| **高频**       | 传感器秒级上报 | 高写入吞吐   |
| **海量**       | 千万级设备     | 分布式存储   |
| **多源**       | 异构传感器     | 数据融合     |
| **低价值密度** | 大量正常数据   | 需过滤和分析 |

### 1.2 数据处理流水线

```
采集 → 传输 → 预处理 → 存储 → 分析 → 可视化
  │      │      │       │      │      │
  边缘   MQTT   边缘/云  TSDB  流/批  Grafana
```

## 2. 时序数据库

### 2.1 对比

| 数据库          | 写入性能 | 查询性能 | 压缩率 | 集群   | 特点              |
| :-------------- | :------- | :------- | :----- | :----- | :---------------- |
| **InfluxDB**    | 高       | 高       | 好     | 企业版 | 生态好、Flux 查询 |
| **TDengine**    | 很高     | 很高     | 很好   |        | 国产、超高性能    |
| **TimescaleDB** | 高       | 高       | 中     |        | 基于 PostgreSQL   |
| **QuestDB**     | 很高     | 很高     | 好     |        | SQL 兼容、零依赖  |
| **IoTDB**       | 高       | 高       | 好     |        | Apache、国产      |

### 2.2 InfluxDB

```python
# InfluxDB 写入和查询
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# 连接
client = InfluxDBClient(url="http://localhost:8086", token="my-token", org="my-org")
write_api = client.write_api(write_options=SYNCHRONOUS)
query_api = client.query_api()

# 写入数据
point = Point("sensor_data") \
    .tag("device_id", "sensor-001") \
    .tag("location", "factory-a") \
    .field("temperature", 25.5) \
    .field("humidity", 60.2) \
    .time(datetime.utcnow(), WritePrecision.MS)

write_api.write(bucket="iot-bucket", record=point)

# 批量写入
points = []
for i in range(100):
    p = Point("sensor_data") \
        .tag("device_id", f"sensor-{i:03d}") \
        .field("temperature", 20 + i * 0.1) \
        .time(datetime.utcnow() + timedelta(seconds=i), WritePrecision.MS)
    points.append(p)

write_api.write(bucket="iot-bucket", record=points)

# 查询
query = '''
from(bucket: "iot-bucket")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.device_id == "sensor-001")
  |> filter(fn: (r) => r._field == "temperature")
  |> aggregateWindow(every: 5m, fn: mean)
'''

tables = query_api.query_data_frame(query)
print(tables)
```

### 2.3 TDengine

```sql
-- 创建数据库和超级表
CREATE DATABASE iot_db KEEP 3650 DAYS 10 BLOCKS 6;
USE iot_db;

-- 超级表（模板）
CREATE STABLE sensor_data (ts TIMESTAMP, temperature FLOAT, humidity FLOAT)
TAGS (device_id NCHAR(32), location NCHAR(64), product_key NCHAR(32));

-- 自动建表写入
INSERT INTO d001 USING sensor_data TAGS ("sensor-001", "factory-a", "pk001")
VALUES (NOW, 25.5, 60.2);

-- 查询
-- 最近1小时平均温度
SELECT _wstart, AVG(temperature)
FROM sensor_data
WHERE ts > NOW - 1h AND device_id = "sensor-001"
INTERVAL(5m);

-- 异常检测：超过 2σ 的数据
SELECT ts, temperature
FROM sensor_data
WHERE ABS(temperature - (SELECT AVG(temperature) FROM sensor_data WHERE ts > NOW - 1h)) >
      2 * (SELECT STDDEV(temperature) FROM sensor_data WHERE ts > NOW - 1h)
AND ts > NOW - 1h;

-- 降采样
SELECT _wstart, AVG(temperature) as avg_temp, MIN(temperature) as min_temp, MAX(temperature) as max_temp
FROM sensor_data
WHERE ts > NOW - 24h
INTERVAL(1h);
```

### 2.4 TimescaleDB

```sql
-- 创建超表
CREATE TABLE sensor_data (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity    DOUBLE PRECISION,
    location    TEXT
);

SELECT create_hypertable('sensor_data', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- 创建索引
CREATE INDEX idx_device ON sensor_data (device_id, time DESC);

-- 连续聚合（实时物化视图）
CREATE MATERIALIZED VIEW sensor_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    device_id,
    AVG(temperature) AS avg_temp,
    MIN(temperature) AS min_temp,
    MAX(temperature) AS max_temp,
    COUNT(*) AS samples
FROM sensor_data
GROUP BY bucket, device_id;

-- 查询
SELECT * FROM sensor_5min
WHERE device_id = 'sensor-001'
AND bucket > NOW() - INTERVAL '1 hour'
ORDER BY bucket DESC;
```

## 3. 流处理

### 3.1 Kafka

```python
# Kafka IoT 数据采集
from kafka import KafkaProducer, KafkaConsumer
import json

producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# 发送传感器数据
def send_sensor_data(device_id, data):
    producer.send(
        topic=f'iot-sensor-{device_id[:3]}',  # 按前缀分区
        key=device_id.encode('utf-8'),
        value=data
    )

# 消费
consumer = KafkaConsumer(
    'iot-sensor-.*',
    bootstrap_servers=['kafka:9092'],
    group_id='iot-processor',
    auto_offset_reset='latest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    data = message.value
    process_sensor_data(data)
```

### 3.2 Flink

```python
# PyFlink 流处理
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment

env = StreamExecutionEnvironment.get_execution_environment()
t_env = StreamTableEnvironment.create(env)

# Kafka Source
t_env.execute_sql("""
    CREATE TABLE sensor_source (
        device_id STRING,
        temperature DOUBLE,
        humidity DOUBLE,
        event_time TIMESTAMP(3),
        WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'iot-sensor-data',
        'properties.bootstrap.servers' = 'kafka:9092',
        'properties.group.id' = 'flink-processor',
        'format' = 'json',
        'scan.startup.mode' = 'latest-offset'
    )
""")

# 5分钟窗口平均温度
result = t_env.sql_query("""
    SELECT
        TUMBLE_START(event_time, INTERVAL '5' MINUTE) AS window_start,
        device_id,
        AVG(temperature) AS avg_temp,
        MIN(temperature) AS min_temp,
        MAX(temperature) AS max_temp,
        COUNT(*) AS sample_count
    FROM sensor_source
    GROUP BY
        TUMBLE(event_time, INTERVAL '5' MINUTE),
        device_id
""")

# 输出到 InfluxDB
t_env.execute_sql("""
    CREATE TABLE influx_sink (
        window_start TIMESTAMP(3),
        device_id STRING,
        avg_temp DOUBLE,
        min_temp DOUBLE,
        max_temp DOUBLE,
        sample_count BIGINT
    ) WITH (
        'connector' = 'influxdb',
        'url' = 'http://influxdb:8086',
        'database' = 'iot_db',
        'measurement' = 'sensor_5min_agg'
    )
""")

result.execute_insert("influx_sink")
```

## 4. 数据清洗

### 4.1 常见问题与处理

| 问题           | 描述         | 处理方法      |
| :------------- | :----------- | :------------ |
| **缺失值**     | 传感器断线   | 插值/前值填充 |
| **异常值**     | 传感器故障   | 统计检测/过滤 |
| **重复值**     | 网络重传     | 去重          |
| **时间漂移**   | 设备时钟不准 | NTP 同步/校正 |
| **单位不一致** | 不同传感器   | 统一转换      |

### 4.2 数据清洗实现

```python
import pandas as pd
import numpy as np

class DataCleaner:
    def __init__(self, config: dict):
        self.ranges = config.get("ranges", {})
        self.fill_method = config.get("fill_method", "ffill")

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        # 1. 去重
        df = df.drop_duplicates(subset=["device_id", "timestamp"])

        # 2. 范围过滤
        for col, (min_val, max_val) in self.ranges.items():
            if col in df.columns:
                mask = (df[col] >= min_val) & (df[col] <= max_val)
                df.loc[~mask, col] = np.nan

        # 3. 异常值检测（IQR 方法）
        for col in self.ranges.keys():
            if col in df.columns:
                df = self._remove_outliers_iqr(df, col)

        # 4. 缺失值填充
        df = df.sort_values("timestamp")
        if self.fill_method == "ffill":
            df = df.fillna(method="ffill")
        elif self.fill_method == "interpolate":
            df = df.interpolate(method="time")

        return df

    def _remove_outliers_iqr(self, df: pd.DataFrame, col: str) -> pd.DataFrame:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR
        mask = (df[col] >= lower) & (df[col] <= upper)
        df.loc[~mask, col] = np.nan
        return df

# 使用
config = {
    "ranges": {
        "temperature": (-40, 80),
        "humidity": (0, 100),
        "pressure": (800, 1200)
    },
    "fill_method": "interpolate"
}
cleaner = DataCleaner(config)
clean_df = cleaner.clean(raw_df)
```

## 5. 异常检测

### 5.1 检测方法

| 方法         | 原理            | 适用场景   | 实时性 |
| :----------- | :-------------- | :--------- | :----- |
| **阈值检测** | 超过固定阈值    | 简单场景   | 高     |
| **3σ 准则**  | 超过 3 倍标准差 | 正态分布   | 高     |
| **IQR**      | 四分位距        | 非正态分布 | 高     |
| **移动平均** | 偏离移动平均    | 趋势数据   | 中     |
| **孤立森林** | 树模型          | 多维异常   | 中     |
| **LSTM-AE**  | 自编码器        | 时序模式   | 低     |

### 5.2 实时异常检测

```python
import numpy as np
from collections import deque

class RealtimeAnomalyDetector:
    def __init__(self, window_size=100, threshold=3.0):
        self.window = deque(maxlen=window_size)
        self.threshold = threshold

    def detect(self, value: float) -> dict:
        self.window.append(value)

        if len(self.window) < 30:
            return {"is_anomaly": False, "reason": "insufficient_data"}

        data = np.array(self.window)
        mean = np.mean(data)
        std = np.std(data)

        if std == 0:
            return {"is_anomaly": False, "z_score": 0}

        z_score = abs(value - mean) / std
        is_anomaly = z_score > self.threshold

        return {
            "is_anomaly": is_anomaly,
            "z_score": z_score,
            "mean": mean,
            "std": std,
            "value": value
        }

# 使用
detector = RealtimeAnomalyDetector(window_size=100, threshold=3.0)
for value in sensor_stream:
    result = detector.detect(value)
    if result["is_anomaly"]:
        send_alert(f"异常值: {value}, Z-Score: {result['z_score']:.2f}")
```

## 6. 数字孪生

### 6.1 概念

数字孪生是物理实体在数字空间的**实时映射**，通过传感器数据驱动数字模型同步更新。

```
┌──────────┐  实时数据   ┌──────────┐  分析决策  ┌──────────┐
│ 物理实体  │ ────────→ │ 数字孪生  │ ────────→ │ 优化控制  │
│ (设备/系统)│ ←──────── │ (数字模型) │           │ (指令)    │
└──────────┘  控制指令   └──────────┘           └──────────┘
```

### 6.2 数字孪生层次

| 层次         | 描述       | 技术               |
| :----------- | :--------- | :----------------- |
| **数据孪生** | 数据可视化 | Grafana、3D 可视化 |
| **模型孪生** | 仿真模拟   | 物理模型、统计模型 |
| **智能孪生** | 预测优化   | AI 模型、优化算法  |

### 6.3 实时数据同步

```python
class DigitalTwin:
    """设备数字孪生"""
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.state = {}
        self.model = None

    def update_state(self, sensor_data: dict):
        """更新孪生状态"""
        self.state.update(sensor_data)

        # 运行仿真模型
        if self.model:
            prediction = self.model.predict(sensor_data)
            self.state["prediction"] = prediction

        # 检查是否需要干预
        if self._needs_intervention():
            self._send_control_command()

    def _needs_intervention(self) -> bool:
        """判断是否需要干预"""
        temp = self.state.get("temperature", 0)
        pred = self.state.get("prediction", {})
        # 如果当前温度正常但预测将超温
        if temp < 35 and pred.get("temperature_1h", 0) > 40:
            return True
        return False

    def _send_control_command(self):
        """发送控制命令"""
        command = {"action": "reduce_load", "target": self.device_id}
        mqtt_client.publish(f"iot/command/{self.device_id}", json.dumps(command))
```

## 7. 小结

数据处理与分析是 IoT 价值的核心：

1. **时序数据库**是 IoT 数据存储的首选，TDengine 性能最优，TimescaleDB 兼容 SQL
2. **Kafka + Flink** 是流处理的黄金组合，支持实时聚合和窗口计算
3. **数据清洗**需处理缺失、异常、重复和时间漂移等问题
4. **异常检测**从简单阈值到深度学习，需根据场景选择
5. **数字孪生**是 IoT 的高级应用，实现预测性维护和优化控制
