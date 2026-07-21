# 传感器与位置 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 传感器模块导入

**导入 sensor 模块**
`import sensor from '@ohos.sensor'`
```typescript
import sensor from '@ohos.sensor';
```

**通过 SensorServiceKit 导入**
`import { sensor } from '@kit.SensorServiceKit'`
```typescript
import { sensor } from '@kit.SensorServiceKit';
```

---

## 传感器订阅 API

**订阅传感器数据**
`sensor.on(type: SensorType, callback: Callback<T>, options?: Options): void`
```typescript
sensor.on(sensor.SensorType.ACCELEROMETER, (data: sensor.AccelerometerResponse) => {
  console.info(`x=${data.x}, y=${data.y}, z=${data.z}`);
}, { interval: 100000000 }); // 间隔 100ms(单位:纳秒)
```

**通过 SensorId 订阅**
`sensor.on(type: SensorId, callback: Callback<T>, options?: Options): void`
```typescript
sensor.on(sensor.SensorId.ACCELEROMETER, (data: sensor.AccelerometerResponse) => {
  console.info(`x=${data.x}, y=${data.y}, z=${data.z}`);
}, { interval: 200000000 }); // 200ms 间隔
```

**取消订阅**
`sensor.off(type: SensorType | SensorId): void`
```typescript
sensor.off(sensor.SensorType.ACCELEROMETER);
```

**订阅一次性数据**
`sensor.once(type: SensorType | SensorId, callback: Callback<T>): void`
```typescript
sensor.once(sensor.SensorType.ACCELEROMETER, (data: sensor.AccelerometerResponse) => {
  console.info(`单次数据: x=${data.x}`);
});
```

**Options 配置**
```typescript
interface Options {
  interval?: number; // 采样间隔(纳秒)
}
```

---

## SensorType 枚举

**SensorType 常用值**
`sensor.SensorType`
```typescript
enum SensorType {
  ACCELEROMETER = 'accelerometer',
  GYROSCOPE = 'gyroscope',
  AMBIENT_LIGHT = 'ambient_light',
  PROXIMITY = 'proximity',
  MAGNETIC_FIELD = 'magnetic_field',
  BAROMETER = 'barometer',
  HALL = 'hall',
  ORIENTATION = 'orientation',
  HEART_RATE = 'heart_rate',
  PEDOMETER = 'pedometer',
  STEP_DETECTOR = 'step_detector'
}
```

**SensorId 枚举**
`sensor.SensorId`
```typescript
enum SensorId {
  ACCELEROMETER = 1,
  GYROSCOPE = 2,
  AMBIENT_LIGHT = 5,
  PROXIMITY = 7,
  MAGNETIC_FIELD = 8,
  BAROMETER = 9,
  HALL = 10,
  ORIENTATION = 11,
  HEART_RATE = 12,
  PEDOMETER = 13,
  STEP_DETECTOR = 14
}
```

---

## 传感器响应数据结构

**AccelerometerResponse**
```typescript
interface AccelerometerResponse {
  x: number; // X 轴加速度 m/s^2
  y: number; // Y 轴加速度 m/s^2
  z: number; // Z 轴加速度 m/s^2
}
```

**GyroscopeResponse**
```typescript
interface GyroscopeResponse {
  x: number; // 绕 X 轴角速度 rad/s
  y: number; // 绕 Y 轴角速度 rad/s
  z: number; // 绕 Z 轴角速度 rad/s
}
```

**LightResponse**
```typescript
interface LightResponse {
  intensity: number; // 光照强度 lux
}
```

**OrientationResponse**
```typescript
interface OrientationResponse {
  alpha: number; // 绕 Z 轴角度(磁北方向角) 0-360
  beta: number;  // 绕 X 轴角度 0-360
  gamma: number; // 绕 Y 轴角度 0-360
}
```

**PedometerResponse**
```typescript
interface PedometerResponse {
  steps: number; // 步数
}
```

---

## 位置服务模块导入

**导入 geoLocationManager**
`import geoLocationManager from '@ohos.geoLocationManager'`
```typescript
import geoLocationManager from '@ohos.geoLocationManager';
```

**通过 LocationKit 导入**
`import { geoLocationManager } from '@kit.LocationKit'`
```typescript
import { geoLocationManager } from '@kit.LocationKit';
```

---

## 位置服务 API

**获取当前位置**
`geoLocationManager.getCurrentLocation(request?: CurrentLocationRequest): Promise<Location>`
```typescript
const location = await geoLocationManager.getCurrentLocation({
  priority: geoLocationManager.LocationRequestPriority.FIRST_FIX,
  scenario: geoLocationManager.LocationRequestScenario.UNSET,
  maxAccuracy: 0
});
console.info(`纬度: ${location.latitude}, 经度: ${location.longitude}`);
```

**回调方式获取当前位置**
`geoLocationManager.getCurrentLocation(request: CurrentLocationRequest, callback: AsyncCallback<Location>): void`
```typescript
geoLocationManager.getCurrentLocation(request, (err, location) => {
  if (!err) {
    console.info(`纬度: ${location.latitude}`);
  }
});
```

**订阅位置变化**
`geoLocationManager.on('locationChange', request: LocationRequest, callback: Callback<Location>): number`
```typescript
const requestInfo: geoLocationManager.LocationRequest = {
  priority: geoLocationManager.LocationRequestPriority.ACCURACY,
  scenario: geoLocationManager.LocationRequestScenario.NAVIGATION,
  timeInterval: 5,      // 最小更新间隔 5 秒
  distanceInterval: 10  // 最小更新距离 10 米
};
const callbackId = geoLocationManager.on('locationChange', requestInfo, (location) => {
  console.info(`位置更新: ${location.latitude}, ${location.longitude}`);
});
```

**取消订阅位置变化**
`geoLocationManager.off('locationChange', callbackId: number): void`
```typescript
geoLocationManager.off('locationChange', callbackId);
```

**判断位置服务是否可用**
`geoLocationManager.isLocationEnabled(): boolean`
```typescript
const enabled = geoLocationManager.isLocationEnabled();
```

**启用位置服务**
`geoLocationManager.enableLocation(): Promise<void>`
```typescript
await geoLocationManager.enableLocation();
```

---

## 位置请求配置

**CurrentLocationRequest**
```typescript
interface CurrentLocationRequest {
  priority?: LocationRequestPriority;
  scenario?: LocationRequestScenario;
  maxAccuracy?: number; // 最大精度(米)
}
```

**LocationRequest**
```typescript
interface LocationRequest {
  priority?: LocationRequestPriority;
  scenario?: LocationRequestScenario;
  timeInterval?: number;       // 最小更新间隔(秒)
  distanceInterval?: number;   // 最小更新距离(米)
  maxAccuracy?: number;
}
```

**LocationRequestPriority 枚举**
`geoLocationManager.LocationRequestPriority`
```typescript
enum LocationRequestPriority {
  UNSET = 0x300,
  ACCURACY = 0x301,
  LOW_POWER = 0x302,
  FIRST_FIX = 0x303
}
```

**LocationRequestScenario 枚举**
`geoLocationManager.LocationRequestScenario`
```typescript
enum LocationRequestScenario {
  UNSET = 0x300,
  NAVIGATION = 0x301,
  SPORT = 0x302,
  DAILY_LIFE_SERVICE = 0x303
}
```

---

## Location 数据结构

**Location 位置信息**
```typescript
interface Location {
  latitude: number;    // 纬度
  longitude: number;   // 经度
  altitude: number;    // 海拔(米)
  accuracy: number;    // 精度(米)
  speed: number;       // 速度(m/s)
  timeStamp: number;   // 时间戳
  direction: number;   // 方向(度)
  timeSinceBoot: number;
}
```

---

## 地理编码 API

**地址转经纬度**
`geoLocationManager.getAddressesFromLocationName(name: string, maxItems: number): Promise<Array<GeoAddress>>`
```typescript
const results = await geoLocationManager.getAddressesFromLocationName('北京市朝阳区', 1);
if (results.length > 0) {
  console.info(`纬度: ${results[0].latitude}, 经度: ${results[0].longitude}`);
}
```

**经纬度转地址**
`geoLocationManager.getAddressesFromLocation(request: ReverseGeoCodeRequest): Promise<Array<GeoAddress>>`
```typescript
const request: geoLocationManager.ReverseGeoCodeRequest = {
  latitude: 39.9042,
  longitude: 116.4074,
  maxItems: 1
};
const results = await geoLocationManager.getAddressesFromLocation(request);
if (results.length > 0) {
  console.info(`地址: ${results[0].placeName}`);
}
```

**ReverseGeoCodeRequest 配置**
```typescript
interface ReverseGeoCodeRequest {
  latitude: number;
  longitude: number;
  maxItems?: number;
}
```

**GeoAddress 结构**
```typescript
interface GeoAddress {
  latitude: number;
  longitude: number;
  placeName?: string;
  countryName?: string;
  administrativeArea?: string;
  locality?: string;
  subLocality?: string;
  addressLine?: string;
}
```

