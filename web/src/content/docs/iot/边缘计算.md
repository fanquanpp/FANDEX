---
order: 4
title: 边缘计算
module: iot
category: 物联网
difficulty: advanced
description: '边缘计算架构、边缘节点部署、KubeEdge/k3s、AI 推理与边云协同。'
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/传感器与嵌入式
  - iot/通信协议
  - iot/IoT平台
  - iot/数据处理与分析
prerequisites: []
---

## 1. 边缘计算架构

### 1.1 为什么需要边缘计算

| 挑战       | 云计算   | 边缘计算         |
| :--------- | :------- | :--------------- |
| **延迟**   | 50-200ms | 1-10ms           |
| **带宽**   | 高成本   | 本地处理减少传输 |
| **隐私**   | 数据上云 | 数据本地处理     |
| **可靠性** | 依赖网络 | 离线可用         |
| **实时性** | 不确定   | 确定性延迟       |

### 1.2 三层架构

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  云端     │ ←─────→ │  边缘层   │ ←─────→ │  设备层   │
│          │  模型/策略 │          │  采集/控制│          │
│ 模型训练  │         │ 数据预处理 │         │ 传感器   │
│ 全局分析  │         │ AI 推理   │         │ 执行器   │
│ 长期存储  │         │ 规则引擎   │         │ MCU     │
└──────────┘         └──────────┘         └──────────┘
  分钟/小时级           毫秒/秒级            实时
```

### 1.3 边缘节点类型

| 类型       | 算力 | 示例           | 用途               |
| :--------- | :--- | :------------- | :----------------- |
| **薄边缘** | 低   | 树莓派、网关   | 协议转换、简单过滤 |
| **厚边缘** | 中   | 工控机、Jetson | AI 推理、数据聚合  |
| **微边缘** | 极低 | 边缘MCU        | 实时控制、数据采集 |

## 2. 边缘节点部署

### 2.1 k3s（轻量级 Kubernetes）

```bash
# 安装 k3s Server
curl -sfL https://get.k3s.io | sh -s - server \
  --tls-san=edge-server.local \
  --datastore-endpoint="mysql://user:pass@tcp(db:3306)/k3s"

# 获取 Token
cat /var/lib/rancher/k3s/server/node-token

# 在边缘节点安装 Agent
curl -sfL https://get.k3s.io | K3S_URL=https://edge-server:6443 \
  K3S_TOKEN=<token> sh -

# 查看节点
kubectl get nodes
```

### 2.2 KubeEdge

```bash
# Cloud 端安装
keadm init --advertise-address=cloud-ip

# 获取 Token
keadm gettoken

# Edge 端安装
keadm join --cloudcore-ipport=cloud-ip:10000 \
  --token=<token> \
  --edgenode-name=edge-node-1
```

### 2.3 边缘应用部署

```yaml
# 边缘节点标签
kubectl label node edge-node-1 node-type=edge location=factory-a

# 边缘部署（仅调度到边缘节点）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-gateway
  template:
    metadata:
      labels:
        app: edge-gateway
    spec:
      nodeSelector:
        node-type: edge
      containers:
      - name: gateway
        image: myregistry/edge-gateway:v1
        env:
        - name: MQTT_BROKER
          value: "mqtt://localhost:1883"
        - name: CLOUD_ENDPOINT
          value: "https://cloud.example.com/api"
        resources:
          limits:
            cpu: "1"
            memory: 512Mi
        volumeMounts:
        - name: config
          mountPath: /app/config
      volumes:
      - name: config
        configMap:
          name: edge-config
```

## 3. 数据预处理

### 3.1 边缘数据流水线

```python
# 边缘数据预处理
import json
from collections import deque
from datetime import datetime

class EdgeDataProcessor:
    def __init__(self, window_size=60, sample_rate=5):
        self.window_size = window_size
        self.sample_rate = sample_rate
        self.data_buffer = deque(maxlen=window_size)
        self.last_upload = 0

    def process(self, raw_data: dict) -> dict | None:
        """处理单条传感器数据"""
        # 1. 数据清洗
        cleaned = self._clean(raw_data)
        if not cleaned:
            return None

        # 2. 添加到缓冲区
        self.data_buffer.append(cleaned)

        # 3. 异常检测
        if self._is_anomaly(cleaned):
            return {"type": "alert", "data": cleaned}

        # 4. 降采样（减少上传频率）
        if len(self.data_buffer) % self.sample_rate != 0:
            return None

        # 5. 聚合上传
        return self._aggregate()

    def _clean(self, data: dict) -> dict | None:
        """数据清洗"""
        # 去除超出范围的数据
        if not (-40 <= data.get("temperature", 0) <= 80):
            return None
        if not (0 <= data.get("humidity", 0) <= 100):
            return None
        return data

    def _is_anomaly(self, data: dict) -> bool:
        """简单异常检测"""
        if len(self.data_buffer) < 10:
            return False
        recent = list(self.data_buffer)[-10:]
        avg_temp = sum(d["temperature"] for d in recent) / len(recent)
        return abs(data["temperature"] - avg_temp) > 15

    def _aggregate(self) -> dict:
        """数据聚合"""
        data_list = list(self.data_buffer)
        temps = [d["temperature"] for d in data_list]
        humis = [d["humidity"] for d in data_list]

        return {
            "type": "aggregate",
            "count": len(data_list),
            "temperature": {
                "avg": sum(temps) / len(temps),
                "min": min(temps),
                "max": max(temps)
            },
            "humidity": {
                "avg": sum(humis) / len(humis),
                "min": min(humis),
                "max": max(humis)
            },
            "timestamp": datetime.now().isoformat()
        }
```

## 4. AI 推理

### 4.1 TensorFlow Lite

```python
# 边缘 AI 推理
import tflite_runtime.interpreter as tflite
import numpy as np

class EdgeAI:
    def __init__(self, model_path: str):
        self.interpreter = tflite.Interpreter(
            model_path=model_path,
            num_threads=4
        )
        self.interpreter.allocate_tensors()

        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

    def predict(self, input_data: np.ndarray) -> np.ndarray:
        """执行推理"""
        self.interpreter.set_tensor(
            self.input_details[0]['index'], input_data
        )
        self.interpreter.invoke()
        return self.interpreter.get_tensor(
            self.output_details[0]['index']
        )

# 异常检测模型推理
model = EdgeAI("anomaly_detection.tflite")

# 传感器数据 → 特征 → 推理
sensor_window = np.array([...], dtype=np.float32).reshape(1, -1)
result = model.predict(sensor_window)
is_anomaly = result[0][0] > 0.5
```

### 4.2 ONNX Runtime

```python
import onnxruntime as ort
import numpy as np

class ONNXInference:
    def __init__(self, model_path: str):
        # 优化边缘推理
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.intra_op_num_threads = 4

        self.session = ort.InferenceSession(
            model_path,
            sess_options,
            providers=['CPUExecutionProvider']
        )

    def predict(self, input_data: np.ndarray) -> np.ndarray:
        input_name = self.session.get_inputs()[0].name
        output = self.session.run(None, {input_name: input_data})
        return output[0]
```

### 4.3 模型优化

| 技术             | 描述               | 精度损失 | 加速比 |
| :--------------- | :----------------- | :------- | :----- |
| **量化（INT8）** | FP32 → INT8        | 1-3%     | 2-4x   |
| **剪枝**         | 移除冗余参数       | 1-5%     | 1.5-3x |
| **蒸馏**         | 大模型教小模型     | 2-5%     | 3-10x  |
| **TFLite 转换**  | 优化为 TFLite 格式 | <1%      | 1.5-2x |

```python
# TFLite 量化转换
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model("saved_model")
converter.optimizations = [tf.lite.Optimize.DEFAULT]  # 动态量化
converter.target_spec.supported_types = [tf.float16]   # FP16 量化

tflite_model = converter.convert()
with open("model_quant.tflite", "wb") as f:
    f.write(tflite_model)
```

## 5. 雾计算

### 5.1 雾计算 vs 边缘计算

| 维度     | 边缘计算 | 雾计算        |
| :------- | :------- | :------------ |
| **位置** | 设备附近 | 网络中间层    |
| **节点** | 单一节点 | 多层节点      |
| **延迟** | 1-10ms   | 10-50ms       |
| **计算** | 有限     | 中等          |
| **典型** | 工控机   | 路由器/交换机 |

### 5.2 雾节点架构

```
终端设备 → 雾节点1(近端) → 雾节点2(中间) → 云端
  实时控制   本地过滤/聚合    区域分析      全局优化
```

## 6. 边云协同

### 6.1 协同模式

| 模式                   | 描述                       | 示例     |
| :--------------------- | :------------------------- | :------- |
| **边端推理，云端训练** | 边缘推理，云端训练模型     | 异常检测 |
| **边缘过滤，云端存储** | 边缘过滤无效数据           | 数据归档 |
| **边缘实时，云端批量** | 边缘实时响应，云端批量分析 | 预测维护 |
| **边缘自治，云端同步** | 断网时边缘自治             | 远程站点 |

### 6.2 模型更新流程

```
云端训练新模型 → 模型压缩/量化 → 推送到边缘节点
    → 灰度验证 → 全量替换 → 反馈效果 → 云端迭代
```

```python
# 边缘模型热更新
class ModelManager:
    def __init__(self, model_dir="/models"):
        self.model_dir = model_dir
        self.current_version = 0
        self.model = None

    def load_model(self, version: int):
        path = f"{self.model_dir}/model_v{version}.tflite"
        self.model = EdgeAI(path)
        self.current_version = version

    def check_update(self):
        """检查云端是否有新模型"""
        response = requests.get(
            "https://cloud.example.com/api/model/latest",
            headers={"current_version": str(self.current_version)}
        )
        if response.status_code == 200:
            # 下载新模型
            model_data = response.content
            new_version = response.headers["model-version"]
            path = f"{self.model_dir}/model_v{new_version}.tflite"
            with open(path, "wb") as f:
                f.write(model_data)
            # 验证后切换
            self.load_model(int(new_version))
```

## 7. 边缘安全

### 7.1 安全挑战

| 挑战         | 描述             | 解决方案      |
| :----------- | :--------------- | :------------ |
| **物理安全** | 边缘设备易被接触 | TPM、安全启动 |
| **网络安全** | 边缘网络开放     | VPN、mTLS     |
| **数据安全** | 本地数据泄露     | 加密存储      |
| **更新安全** | 恶意模型注入     | 签名验证      |
| **访问控制** | 未经授权访问     | 证书认证      |

### 7.2 边缘安全架构

```python
# 边缘节点安全通信
import ssl
import paho.mqtt.client as mqtt

def create_secure_client(device_id, cert_path, key_path, ca_path):
    client = mqtt.Client(client_id=device_id)

    # TLS 配置
    context = ssl.create_default_context()
    context.load_verify_locations(ca_path)
    context.load_cert_chain(cert_path, key_path)
    context.verify_mode = ssl.CERT_REQUIRED

    client.tls_set_context(context)
    return client
```

## 8. 小结

边缘计算是 IoT 系统的关键中间层：

1. **边缘计算**解决延迟、带宽和隐私问题，是 IoT 的必选项
2. **k3s/KubeEdge** 将 K8s 能力延伸到边缘，统一管理云和边
3. **数据预处理**在边缘完成清洗、聚合和降采样，减少云端压力
4. **AI 推理**通过 TFLite/ONNX 在边缘执行，实现实时智能决策
5. **边云协同**是最佳实践，边缘负责实时，云端负责全局
6. **模型热更新**使边缘 AI 持续进化，无需停机
