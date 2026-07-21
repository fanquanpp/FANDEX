---
order: 61
title: 地理位置定位
module: html5
category: HTML5
difficulty: intermediate
description: Geolocation
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/WebComponents与PWA开发
  - html5/拖拽API
  - html5/Web工作线程
  - 'html5/Service-Worker与PWA'
prerequisites:
  - html5/概述与核心特性
---

## 1. Geolocation API

```javascript
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('纬度:', position.coords.latitude);
      console.log('经度:', position.coords.longitude);
      console.log('精度:', position.coords.accuracy);
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          console.error('用户拒绝');
          break;
        case error.POSITION_UNAVAILABLE:
          console.error('位置不可用');
          break;
        case error.TIMEOUT:
          console.error('请求超时');
          break;
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
```

### watchPosition

```javascript
const watchId = navigator.geolocation.watchPosition(
  (pos) => console.log(`位置: ${pos.coords.latitude}, ${pos.coords.longitude}`),
  (err) => console.error(err),
  { enableHighAccuracy: true }
);
navigator.geolocation.clearWatch(watchId);
```

## 2. Haversine 距离计算

$$
d = 2r \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\varphi_2 - \varphi_1}{2}\right) + \cos(\varphi_1) \cos(\varphi_2) \sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)
$$

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
```

## 3. 地理围栏

```javascript
class Geofence {
  constructor(centerLat, centerLng, radiusMeters) {
    this.center = { lat: centerLat, lng: centerLng };
    this.radius = radiusMeters;
  }
  contains(lat, lng) {
    return haversineDistance(this.center.lat, this.center.lng, lat, lng) * 1000 <= this.radius;
  }
}
```
