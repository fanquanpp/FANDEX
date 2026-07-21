---
order: 19
title: TensorFlow框架
module: 'ai-engineering'
category: data
difficulty: intermediate
description: 'TensorFlow/Keras核心概念、Eager Mode、SavedModel与部署。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/PyTorch框架'
  - 'ai-engineering/聚类算法'
  - 'ai-engineering/降维算法'
  - 'ai-engineering/模型优化与部署'
prerequisites: []
---

## 1. TensorFlow核心概念

### 1.1 Tensor

```python
import tensorflow as tf

# 创建张量
a = tf.constant([1, 2, 3], dtype=tf.float32)
b = tf.Variable([4, 5, 6], dtype=tf.float32)

# 常用操作
c = tf.add(a, b)
d = tf.matmul(x, y)
e = tf.reduce_mean(a)
```

### 1.2 Eager Mode

TensorFlow 2.x 默认启用**即时执行模式**：

```python
# Eager Mode: 操作立即执行
x = tf.constant([[1, 2], [3, 4]])
y = tf.constant([[5, 6], [7, 8]])
z = tf.matmul(x, y)
print(z)  # 直接输出结果
```

### 1.3 GPU管理

```python
# 检查GPU
gpus = tf.config.list_physical_devices('GPU')

# 内存增长
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# 混合精度
tf.keras.mixed_precision.set_global_policy('mixed_float16')
```

## 2. Keras高层API

### 2.1 Sequential模型

```python
from tensorflow import keras

model = keras.Sequential([
    keras.layers.Dense(256, activation='relu', input_shape=(784,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.fit(x_train, y_train, epochs=10, batch_size=64,
          validation_data=(x_val, y_val))
```

### 2.2 Functional API

```python
inputs = keras.Input(shape=(784,))
x = keras.layers.Dense(256, activation='relu')(inputs)
x = keras.layers.Dropout(0.2)(x)
x = keras.layers.Dense(128, activation='relu')(x)
outputs = keras.layers.Dense(10, activation='softmax')(x)

model = keras.Model(inputs=inputs, outputs=outputs)
```

### 2.3 自定义模型

```python
class CustomModel(keras.Model):
    def __init__(self, hidden_dim, output_dim):
        super().__init__()
        self.dense1 = keras.layers.Dense(hidden_dim, activation='relu')
        self.dense2 = keras.layers.Dense(hidden_dim, activation='relu')
        self.output_layer = keras.layers.Dense(output_dim)
        self.dropout = keras.layers.Dropout(0.1)

    def call(self, inputs, training=False):
        x = self.dropout(self.dense1(inputs), training=training)
        x = self.dropout(self.dense2(x), training=training)
        return self.output_layer(x)
```

## 3. 自定义训练

### 3.1 自定义训练循环

```python
optimizer = keras.optimizers.Adam(1e-3)
loss_fn = keras.losses.SparseCategoricalCrossentropy(from_logits=True)
train_metric = keras.metrics.SparseCategoricalAccuracy()

@tf.function
def train_step(x, y):
    with tf.GradientTape() as tape:
        logits = model(x, training=True)
        loss = loss_fn(y, logits)

    gradients = tape.gradient(loss, model.trainable_variables)
    optimizer.apply_gradients(zip(gradients, model.trainable_variables))
    train_metric.update_state(y, logits)
    return loss

for epoch in range(num_epochs):
    for batch_x, batch_y in train_dataset:
        loss = train_step(batch_x, batch_y)
    print(f"Epoch {epoch}: loss={loss:.4f}, acc={train_metric.result():.4f}")
    train_metric.reset_state()
```

### 3.2 tf.function加速

```python
# 将Python函数编译为计算图
@tf.function
def predict(x):
    return model(x, training=False)

# 自动图优化，显著提升性能
```

## 4. 数据管道

### 4.1 tf.data

```python
dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
dataset = dataset.shuffle(buffer_size=10000)
dataset = dataset.batch(64)
dataset = dataset.prefetch(tf.data.AUTOTUNE)
dataset = dataset.cache()  # 缓存到内存

# 从文件加载
dataset = tf.data.TFRecordDataset(filenames)
dataset = dataset.map(parse_fn, num_parallel_calls=tf.data.AUTOTUNE)
```

### 4.2 数据增强

```python
data_augmentation = keras.Sequential([
    keras.layers.RandomFlip("horizontal"),
    keras.layers.RandomRotation(0.1),
    keras.layers.RandomZoom(0.1),
])
```

## 5. SavedModel与部署

### 5.1 模型保存

```python
# SavedModel格式（推荐）
model.save('model_savedmodel')

# HDF5格式
model.save('model.h5')

# 只保存权重
model.save_weights('weights.h5')
```

### 5.2 模型加载

```python
# 加载SavedModel
loaded_model = keras.models.load_model('model_savedmodel')

# 加载HDF5
loaded_model = keras.models.load_model('model.h5')
```

### 5.3 部署方式

| 方式       | 工具   | 适用场景         |
| :--------- | :----- | :--------------- |
| TF Serving | Docker | 生产环境推理服务 |
| TF Lite    | 转换器 | 移动端/嵌入式    |
| TF.js      | 浏览器 | Web应用          |
| ONNX       | 转换器 | 跨框架部署       |

### 5.4 TF Lite转换

```python
converter = tf.lite.TFLiteConverter.from_saved_model('model_savedmodel')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
```

## 6. TensorBoard可视化

```python
import datetime

log_dir = "logs/" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
tensorboard_callback = keras.callbacks.TensorBoard(
    log_dir=log_dir, histogram_freq=1
)

model.fit(x_train, y_train, epochs=10,
          callbacks=[tensorboard_callback])
```

```bash
tensorboard --logdir logs
```
