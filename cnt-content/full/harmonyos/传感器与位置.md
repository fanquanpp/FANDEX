---
order: 62
title: 传感器与位置
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 传感器与定位服务
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/网络请求
  - harmonyos/手势与交互
  - harmonyos/多媒体能力
  - harmonyos/通知与权限
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

HarmonyOS 提供了丰富的传感器和位置服务 API。传感器包括加速度计、陀螺仪、磁力计、光线传感器等，可以感知设备的运动和环境状态。位置服务则通过 GPS、Wi-Fi 和基站等方式获取设备的地理位置信息。这些能力是运动健康、导航、AR 等应用的基础。

为什么需要传感器和位置服务？运动类应用需要加速度计来计步，导航类应用需要 GPS 来定位，相机应用需要陀螺仪来防抖，阅读类应用需要光线传感器来自动调节亮度。了解这些 API 的使用，能让你的应用更好地感知用户的物理环境。

## 基础概念

**加速度传感器**：测量设备在三个轴（X、Y、Z）上的加速度，包括重力加速度。单位是 m/s^2。常用于计步、摇一摇等功能。

**陀螺仪传感器**：测量设备绕三个轴的旋转角速度，单位是 rad/s。常用于游戏控制、防抖等。

**磁力计**：测量周围磁场的强度，常用于电子罗盘。

**光线传感器**：测量环境光照强度，单位是 lux。常用于自动调节屏幕亮度。

**位置服务**：通过 GPS、Wi-Fi 和基站等方式获取经纬度坐标。精度从几米到几十米不等。

## 快速上手

### 获取加速度数据

```typescript
import sensor from '@ohos.sensor'

@Entry
@Component
struct AccelerometerDemo {
  @State x: number = 0
  @State y: number = 0
  @State z: number = 0

  aboutToAppear() {
    // 订阅加速度传感器数据
    sensor.on(sensor.SensorType.ACCELEROMETER, (data: sensor.AccelerometerResponse) => {
      this.x = data.x
      this.y = data.y
      this.z = data.z
    })
  }

  aboutToDisappear() {
    // 取消订阅，避免内存泄漏
    sensor.off(sensor.SensorType.ACCELEROMETER)
  }

  build() {
    Column() {
      Text('加速度传感器').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`X轴: ${this.x.toFixed(2)} m/s²`)
      Text(`Y轴: ${this.y.toFixed(2)} m/s²`)
      Text(`Z轴: ${this.z.toFixed(2)} m/s²`)
    }
    .padding(16)
  }
}
```

### 获取位置信息

```typescript
import geoLocationManager from '@ohos.geoLocationManager'

@Entry
@Component
struct LocationDemo {
  @State latitude: number = 0
  @State longitude: number = 0
  @State accuracy: number = 0

  async getCurrentLocation() {
    try {
      // 获取当前位置
      const location = await geoLocationManager.getCurrentLocation({
        priority: geoLocationManager.LocationRequestPriority.FIRST_FIX,
        scenario: geoLocationManager.LocationRequestScenario.UNSET,
        maxAccuracy: 0
      })

      this.latitude = location.latitude
      this.longitude = location.longitude
      this.accuracy = location.accuracy
    } catch (error) {
      console.error(`获取位置失败: ${error}`)
    }
  }

  build() {
    Column() {
      Text('位置信息').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`纬度: ${this.latitude.toFixed(6)}`)
      Text(`经度: ${this.longitude.toFixed(6)}`)
      Text(`精度: ${this.accuracy.toFixed(1)} 米`)

      Button('获取当前位置').onClick(() => this.getCurrentLocation())
    }
    .padding(16)
  }
}
```

## 详细用法

### 传感器订阅与取消

```typescript
import sensor from '@ohos.sensor';

// 订阅传感器数据
// interval 参数控制采样频率
sensor.on(
  sensor.SensorType.ACCELEROMETER,
  (data) => {
    console.info(`加速度: x=${data.x}, y=${data.y}, z=${data.z}`);
  },
  { interval: 100000000 }
); // 间隔 100ms（单位：纳秒）

// 取消订阅
sensor.off(sensor.SensorType.ACCELEROMETER);

// 订阅一次性传感器数据（只获取一次）
sensor.once(sensor.SensorType.ACCELEROMETER, (data) => {
  console.info(`单次加速度: x=${data.x}, y=${data.y}, z=${data.z}`);
});
```

### 陀螺仪

```typescript
import sensor from '@ohos.sensor'

@Component
struct GyroscopeDemo {
  @State alpha: number = 0  // 绕 Z 轴旋转
  @State beta: number = 0   // 绕 X 轴旋转
  @State gamma: number = 0  // 绕 Y 轴旋转

  aboutToAppear() {
    sensor.on(sensor.SensorType.GYROSCOPE, (data: sensor.GyroscopeResponse) => {
      this.alpha = data.x  // 角速度 rad/s
      this.beta = data.y
      this.gamma = data.z
    })
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorType.GYROSCOPE)
  }

  build() {
    Column() {
      Text('陀螺仪').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`X轴角速度: ${this.alpha.toFixed(3)} rad/s`)
      Text(`Y轴角速度: ${this.beta.toFixed(3)} rad/s`)
      Text(`Z轴角速度: ${this.gamma.toFixed(3)} rad/s`)
    }
    .padding(16)
  }
}
```

### 光线传感器

```typescript
import sensor from '@ohos.sensor'

@Component
struct LightSensorDemo {
  @State illuminance: number = 0

  aboutToAppear() {
    sensor.on(sensor.SensorType.AMBIENT_LIGHT, (data: sensor.LightResponse) => {
      this.illuminance = data.intensity // 光照强度（lux）
    })
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorType.AMBIENT_LIGHT)
  }

  build() {
    Column() {
      Text('光线传感器').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`光照强度: ${this.illuminance.toFixed(1)} lux`)

      // 根据光照强度给出提示
      Text(this.getLightLevel())
        .fontSize(16)
        .margin({ top: 12 })
    }
    .padding(16)
  }

  private getLightLevel(): string {
    if (this.illuminance < 10) return '很暗（夜间）'
    if (this.illuminance < 100) return '较暗（室内）'
    if (this.illuminance < 500) return '正常（办公室）'
    if (this.illuminance < 1000) return '较亮（阴天户外）'
    return '很亮（晴天户外）'
  }
}
```

### 持续位置追踪

```typescript
import geoLocationManager from '@ohos.geoLocationManager'

@Component
struct LocationTrackingDemo {
  @State locations: string[] = []
  private locationChange?: number

  startTracking() {
    // 订阅位置变化
    const requestInfo: geoLocationManager.LocationRequest = {
      priority: geoLocationManager.LocationRequestPriority.ACCURACY,
      scenario: geoLocationManager.LocationRequestScenario.NAVIGATION,
      timeInterval: 5,     // 最小更新间隔 5 秒
      distanceInterval: 10  // 最小更新距离 10 米
    }

    try {
      this.locationChange = geoLocationManager.on('locationChange', requestInfo, (location) => {
        const msg = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        this.locations = [...this.locations, msg]
      })
    } catch (error) {
      console.error(`订阅位置失败: ${error}`)
    }
  }

  stopTracking() {
    if (this.locationChange !== undefined) {
      geoLocationManager.off('locationChange', this.locationChange)
      this.locationChange = undefined
    }
  }

  aboutToDisappear() {
    this.stopTracking()
  }

  build() {
    Column() {
      Text('位置追踪').fontSize(20).fontWeight(FontWeight.Bold)

      List() {
        ForEach(this.locations, (loc: string, index: number) => {
          ListItem() {
            Text(`#${index + 1}: ${loc}`).fontSize(14)
          }
        })
      }
      .height(300)

      Row() {
        Button('开始追踪').onClick(() => this.startTracking())
        Button('停止追踪').onClick(() => this.stopTracking())
      }
    }
    .padding(16)
  }
}
```

### 地理编码与逆地理编码

```typescript
import geoLocationManager from '@ohos.geoLocationManager';

// 地理编码：地址 -> 经纬度
async function geocode(address: string) {
  try {
    const results = await geoLocationManager.getAddressesFromLocationName(address, 1);
    if (results.length > 0) {
      const location = results[0];
      console.info(`纬度: ${location.latitude}, 经度: ${location.longitude}`);
    }
  } catch (error) {
    console.error(`地理编码失败: ${error}`);
  }
}

// 逆地理编码：经纬度 -> 地址
async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const reverseCodeRequest: geoLocationManager.ReverseGeoCodeRequest = {
      latitude,
      longitude,
      maxItems: 1,
    };
    const results = await geoLocationManager.getAddressesFromLocation(reverseCodeRequest);
    if (results.length > 0) {
      const address = results[0];
      console.info(`地址: ${address.placeName}`);
      console.info(`详细: ${address.addressLine}`);
    }
  } catch (error) {
    console.error(`逆地理编码失败: ${error}`);
  }
}
```

## 常见场景

### 摇一摇

```typescript
import sensor from '@ohos.sensor'

@Component
struct ShakeDemo {
  @State shakeCount: number = 0
  private lastShakeTime: number = 0

  aboutToAppear() {
    sensor.on(sensor.SensorType.ACCELEROMETER, (data) => {
      // 计算加速度的合力
      const force = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z)

      // 当合力超过阈值时认为是摇动
      // 正常静止时约 9.8（重力），摇动时会更大
      if (force > 20) {
        const now = Date.now()
        // 防抖：两次摇动间隔至少 500ms
        if (now - this.lastShakeTime > 500) {
          this.lastShakeTime = now
          this.shakeCount++
          console.info(`检测到摇动！第 ${this.shakeCount} 次`)
        }
      }
    })
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorType.ACCELEROMETER)
  }

  build() {
    Column() {
      Text('摇一摇').fontSize(24).fontWeight(FontWeight.Bold)
      Text(`摇动次数: ${this.shakeCount}`).fontSize(18)
      Text('请摇动手机试试').fontSize(14).fontColor('#999999')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

### 计步器

```typescript
import sensor from '@ohos.sensor'

@Component
struct PedometerDemo {
  @State steps: number = 0

  aboutToAppear() {
    // 订阅计步传感器
    sensor.on(sensor.SensorType.PEDOMETER, (data: sensor.PedometerResponse) => {
      this.steps = data.steps
    })
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorType.PEDOMETER)
  }

  build() {
    Column() {
      Text('今日步数').fontSize(16).fontColor('#999999')
      Text(`${this.steps}`).fontSize(48).fontWeight(FontWeight.Bold)
      Text('步').fontSize(16).fontColor('#999999')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

## 注意事项

**权限声明**：使用传感器和位置服务需要在 module.json5 中声明权限。位置服务需要 `ohos.permission.LOCATION`，加速度计等传感器通常不需要特殊权限。

**耗电问题**：持续订阅传感器数据和 GPS 定位会显著增加耗电。不使用时应及时取消订阅，并设置合理的采样间隔。

**传感器可用性**：不是所有设备都有所有传感器。使用前应检查传感器是否可用。

**GPS 精度**：GPS 在室内可能无法定位。位置服务的精度取决于定位方式：GPS 精度最高（几米），Wi-Fi 次之（几十米），基站最低（几百米）。

**主线程安全**：传感器回调在主线程执行，不要在回调中执行耗时操作。

## 进阶用法

### 传感器数据滤波

```typescript
// 低通滤波器：平滑传感器数据，减少噪声
class LowPassFilter {
  private alpha: number = 0.8; // 滤波系数，0-1 之间
  private filteredX: number = 0;
  private filteredY: number = 0;
  private filteredZ: number = 0;
  private initialized: boolean = false;

  filter(x: number, y: number, z: number): [number, number, number] {
    if (!this.initialized) {
      this.filteredX = x;
      this.filteredY = y;
      this.filteredZ = z;
      this.initialized = true;
    } else {
      // 低通滤波公式：output = alpha * output + (1 - alpha) * input
      this.filteredX = this.alpha * this.filteredX + (1 - this.alpha) * x;
      this.filteredY = this.alpha * this.filteredY + (1 - this.alpha) * y;
      this.filteredZ = this.alpha * this.filteredZ + (1 - this.alpha) * z;
    }
    return [this.filteredX, this.filteredY, this.filteredZ];
  }
}

// 使用滤波器
const filter = new LowPassFilter();
sensor.on(sensor.SensorType.ACCELEROMETER, (data) => {
  const [fx, fy, fz] = filter.filter(data.x, data.y, data.z);
  console.info(`滤波后: x=${fx.toFixed(2)}, y=${fy.toFixed(2)}, z=${fz.toFixed(2)}`);
});
```

### 电子罗盘

```typescript
import sensor from '@ohos.sensor'

@Component
struct CompassDemo {
  @State heading: number = 0  // 朝向角度，0-360

  aboutToAppear() {
    // 使用方向传感器获取朝向
    sensor.on(sensor.SensorType.ORIENTATION, (data: sensor.OrientationResponse) => {
      this.heading = data.alpha  // alpha 是磁北方向角
    })
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorType.ORIENTATION)
  }

  build() {
    Column() {
      Text('电子罗盘').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`${this.heading.toFixed(0)} 度`).fontSize(48).fontWeight(FontWeight.Bold)
      Text(this.getDirection()).fontSize(18)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  private getDirection(): string {
    const h = this.heading
    if (h < 22.5 || h >= 337.5) return '北'
    if (h < 67.5) return '东北'
    if (h < 112.5) return '东'
    if (h < 157.5) return '东南'
    if (h < 202.5) return '南'
    if (h < 247.5) return '西南'
    if (h < 292.5) return '西'
    return '西北'
  }
}
```
