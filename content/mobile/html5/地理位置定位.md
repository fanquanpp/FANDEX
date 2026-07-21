# 地理位置定位 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

## Geolocation API 检测与获取

**API 存在性检测**
`'geolocation' in navigator`

```javascript
// 检测浏览器是否支持 Geolocation API
if ('geolocation' in navigator) {
  // 支持,可调用相关 API
} else {
  // 不支持,需降级处理
}
```

**获取当前位置**
`navigator.geolocation.getCurrentPosition(<success>, [error], [options])`

```javascript
// 异步获取设备当前位置(经纬度)
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('纬度:', position.coords.latitude);   // 纬度(-180 ~ 180)
    console.log('经度:', position.coords.longitude);  // 经度(-90 ~ 90)
    console.log('精度:', position.coords.accuracy);   // 精度(米)
  },
  (error) => {
    console.error('错误码:', error.code, '消息:', error.message);
  },
  {
    enableHighAccuracy: true, // 是否启用高精度模式
    timeout: 10000,           // 超时时间(毫秒)
    maximumAge: 0             // 缓存位置最大有效期(毫秒),0 表示不使用缓存
  }
);
```

---

## 位置监听

**持续监听位置变化**
`const watchId = navigator.geolocation.watchPosition(<success>, [error], [options])`

```javascript
// 持续监听位置变化(适用于导航、运动追踪等场景)
const watchId = navigator.geolocation.watchPosition(
  (pos) => {
    console.log(`当前位置: ${pos.coords.latitude}, ${pos.coords.longitude}`);
  },
  (err) => {
    console.error('监听失败:', err.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  }
);
```

**停止位置监听**
`navigator.geolocation.clearWatch(<watchId>)`

```javascript
// 停止位置监听,释放资源
navigator.geolocation.clearWatch(watchId);
```

---

## Position 对象属性

**coords 属性表**

| 属性                      | 类型   | 说明                              |
| ------------------------- | ------ | --------------------------------- |
| `coords.latitude`         | Double | 纬度(十进制度,范围 -90 ~ 90)     |
| `coords.longitude`        | Double | 经度(十进制度,范围 -180 ~ 180)   |
| `coords.accuracy`         | Double | 位置精度(米)                     |
| `coords.altitude`         | Double | 海拔高度(米,null 表示不可用)     |
| `coords.altitudeAccuracy` | Double | 海拔精度(米)                     |
| `coords.heading`          | Double | 方向(度,正北顺时针,null 表示静止)|
| `coords.speed`            | Double | 速度(米/秒,null 表示不可用)      |
| `timestamp`               | Long   | 获取位置的时间戳(DOMTimeStamp)   |

---

## 错误处理

**PositionError 错误码表**

| 错误码 | 常量名                  | 说明               |
| ------ | ----------------------- | ------------------ |
| 1      | `PERMISSION_DENIED`     | 用户拒绝了位置请求 |
| 2      | `POSITION_UNAVAILABLE`  | 位置信息不可用     |
| 3      | `TIMEOUT`               | 请求超时           |
| 0      | `UNKNOWN_ERROR`         | 未知错误           |

```javascript
// 错误处理示例
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords),
  (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('用户拒绝授权');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('位置不可用');
        break;
      case error.TIMEOUT:
        console.error('请求超时');
        break;
      default:
        console.error('未知错误:', error.message);
    }
  }
);
```

---

## Permissions API 权限查询

**查询地理定位权限状态**
`navigator.permissions.query({ name: 'geolocation' })`

```javascript
// 查询当前地理位置权限状态
navigator.permissions.query({ name: 'geolocation' }).then((result) => {
  console.log('权限状态:', result.state); // granted | denied | prompt
  result.onchange = () => {
    console.log('权限变更:', result.state);
  };
});
```

---

## Haversine 距离计算

**计算两点间球面距离**
`haversineDistance(<lat1>, <lon1>, <lat2>, <lon2>)`

```javascript
// 使用 Haversine 公式计算地球表面两点间最短距离(千米)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径(千米)
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// 示例:北京到上海的距离
const distance = haversineDistance(39.9042, 116.4074, 31.2304, 121.4737);
console.log(`距离: ${distance.toFixed(2)} 千米`);
```

---

## 地理围栏

**Geofence 类实现**
`new Geofence(<centerLat>, <centerLng>, <radiusMeters>)`

```javascript
// 地理围栏:判断设备是否进入指定圆形区域
class Geofence {
  constructor(centerLat, centerLng, radiusMeters) {
    this.center = { lat: centerLat, lng: centerLng };
    this.radius = radiusMeters; // 半径(米)
  }

  // 判断指定坐标是否在围栏内
  contains(lat, lng) {
    const distanceKm = haversineDistance(this.center.lat, this.center.lng, lat, lng);
    return distanceKm * 1000 <= this.radius;
  }
}

// 使用示例
const fence = new Geofence(39.9042, 116.4074, 500); // 北京中心 500 米范围
console.log(fence.contains(39.9050, 116.4080)); // true/false
```

---

## 注意事项

- **HTTPS 要求**:Geolocation API 仅在安全上下文(HTTPS 或 localhost)中可用
- **用户授权**:首次调用会弹出权限请求,用户拒绝后返回 `PERMISSION_DENIED`
- **精度限制**:`enableHighAccuracy: true` 会消耗更多电量(使用 GPS)
- **移动设备**:结合 `watchPosition` 可实现导航功能,但需注意电池消耗
- **隐私保护**:不得在未经用户同意的情况下收集或上传位置数据
