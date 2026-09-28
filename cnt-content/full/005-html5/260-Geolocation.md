---
order: 260
title: 地理位置定位
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 用 Geolocation API 做一个"附近活动"入口：单次定位与持续追踪、权限状态查询与被拒兜底、Haversine 距离与地理围栏，以及定位隐私的正确姿势。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/310-WebComponentsPWADevelopment'
  - 'html5/250-DragAPI'
  - 'html5/300-ServiceWorkerPWA'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

> 前置要求与运行环境：示例使用异步回调，需先完成 `javascript/001`-`005` 与 `javascript/023`（Promise/async）。
>
> **重要：Geolocation 只在安全上下文可用——`https://` 或 `http://localhost`；直接双击打开本地文件（`file://`）会被浏览器直接拒绝。** 本地测试请用 Live Server 或 `npx serve`。

## 1. 场景切入：一个"附近活动"按钮

假设 FANDEX 网页端要加一个"同城交流活动"入口：用户点按钮，页面拿到他的位置，算出他离活动场地多远，近的话给个"步行 15 分钟可达"的提示。

这个需求只需要浏览器自带的 Geolocation API，不引任何库。但在写代码之前，先想清楚一件比 API 本身更重要的事：**位置是最敏感的数据之一**。浏览器为此设了三层防线，你的代码必须围着它们设计：

1. 只在安全上下文（https 或 localhost）可用；
2. 首次调用必弹权限弹窗，用户可以拒绝，而且现在的浏览器普遍提供"仅本次允许"选项；
3. 一旦被拒，之后每次调用都直接失败，页面不能再弹（浏览器不会再问）。

所以正确的产品姿势是：**用户点了按钮才请求定位，被拒后给出优雅的降级**（比如让用户手选城市），而不是页面一打开就要坐标——那种页面用户会条件反射地点"拒绝"。

## 2. 动手：带权限兜底的最小定位页

新建 `geo.html`，整份复制即可运行（记得走 localhost）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>附近活动</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; }
    button { padding: 10px 20px; border: none; border-radius: 8px;
             background: #39C5BB; color: #fff; font-size: 16px; cursor: pointer; }
    #status { margin-top: 16px; color: #555; line-height: 1.7; }
  </style>
</head>
<body>
  <h2>同城交流活动</h2>
  <p>场地：市青年文化中心</p>
  <button id="btn">查看我离场地多远</button>
  <p id="status">点击按钮后，浏览器会询问是否允许获取位置。</p>

  <script>
    // 场地坐标（示例：上海人民广场附近）
    const VENUE = { lat: 31.2304, lng: 121.4737 };
    const status = document.getElementById('status');

    document.getElementById('btn').addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        status.textContent = '你的浏览器不支持定位，请手动选择城市。';
        return;
      }
      status.textContent = '正在定位……';

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        timeout: 10000,        // 10 秒拿不到就报超时
        maximumAge: 5 * 60000, // 允许用 5 分钟内的缓存位置，更快也更省电
      });
    });

    function onSuccess(pos) {
      const { latitude, longitude, accuracy } = pos.coords;
      const dist = haversine(latitude, longitude, VENUE.lat, VENUE.lng);
      status.textContent =
        `距离场地约 ${dist.toFixed(1)} 公里` +
        `（定位精度 ±${Math.round(accuracy)} 米）`;
    }

    function onError(err) {
      if (err.code === err.PERMISSION_DENIED) {
        status.textContent = '你拒绝了定位。可以在地址栏图标里重新允许，或手动选择城市。';
      } else if (err.code === err.TIMEOUT) {
        status.textContent = '定位超时，请检查网络或稍后再试。';
      } else {
        status.textContent = '暂时拿不到位置，请手动选择城市。';
      }
    }

    // 球面距离（千米），公式见第 4 节
    function haversine(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const toRad = (d) => (d * Math.PI) / 180;
      const a =
        Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(toRad(lng2 - lng1) / 2) ** 2;
      return R * 2 * Math.asin(Math.sqrt(a));
    }
  </script>
</body>
</html>
```

动手清单：

1. 点击按钮，允许授权，看到距离数字（精度通常是几十米）；
2. 在浏览器设置里把该站点位置权限改为"拒绝"，刷新再点——注意这次**没有弹窗**，直接走 `PERMISSION_DENIED` 分支；
3. 把 `maximumAge` 改成 `0`，对比两次定位的响应速度。

## 3. 讲为什么：三个 API 各管一件事

Geolocation 的全部面就三块，按需取用：

**单次定位 `getCurrentPosition(success, error?, options?)`**。绝大多数场景用它。拿到的 `position.coords` 里：

| 属性 | 说明 |
| --- | --- |
| `latitude` / `longitude` | 纬度（-90 到 90）/ 经度（-180 到 180），十进制度 |
| `accuracy` | 精度半径，单位米。这个数字很重要：500 米的精度下展示"步行 3 分钟"就是欺骗用户 |
| `altitude` / `altitudeAccuracy` | 海拔，多数设备为 `null` |
| `heading` / `speed` | 朝向（度，正北顺时针）与速度（米/秒），静止时常为 `null` |

**持续追踪 `watchPosition(...)`**。签名与单次定位相同，但位置每变化就回调一次，返回一个 `watchId`。适合导航、跑步记录。两个纪律：拿到 `watchId` 后，页面离开或功能停止时必须 `clearWatch(watchId)`；`enableHighAccuracy: true` 是"建议"不是命令——它提示浏览器优先用 GPS，更准但更耗电，室内可能反而更慢。

**权限查询 `navigator.permissions.query({ name: 'geolocation' })`**。在真正调用定位**之前**知道现状，避免"用户早已拒绝、你还弹一个注定失败的请求"：

```javascript
const { state } = await navigator.permissions.query({ name: 'geolocation' });
// 'granted' 已允许 | 'denied' 已拒绝 | 'prompt' 还没问过
if (state === 'denied') {
  showCityPicker();            // 直接降级，不再发起注定失败的请求
} else {
  enableLocateButton();        // 才把"查看附近"按钮亮出来
}
```

错误码只有三个：`PERMISSION_DENIED`（1，用户拒绝）、`POSITION_UNAVAILABLE`（2，设备拿不到位置）、`TIMEOUT`（3，超过 `timeout` 毫秒）。每一个都必须有 UI 兜底，`console.error` 不算处理。

## 4. 讲为什么：距离不能拿经纬度当平面坐标算

新手最常见的数学错误是 `Math.sqrt(dx*dx + dy*dy)`。经纬度是球面坐标：纬度差 1 度约 111 公里，经度差 1 度在赤道约 111 公里、在上海只剩约 85 公里。直接当平面算，纬度越高偏差越大。

正确做法是 Haversine 公式——把两点当作球面上沿大圆的弧长计算。不用背公式，记住思路即可：先把经纬度差转成弧度，套一个半正矢组合，再对地球半径 6371 千米做 `asin` 还原成弧长。上一节代码里的 `haversine` 函数就是它的完整实现，可以直接复制。城市级距离场景（几十公里内）这个公式的误差可以忽略；真做地图产品则用 turf.js 或地图 SDK 自带的测距。

顺带一个实用组件——地理围栏（判断"进没进某个范围"）就是在 Haversine 上包一层：

```javascript
class Geofence {
  constructor(lat, lng, radiusMeters) {
    this.center = { lat, lng };
    this.radius = radiusMeters;
  }
  contains(lat, lng) {
    return haversine(lat, lng, this.center.lat, this.center.lng) * 1000
      <= this.radius;
  }
}

const fence = new Geofence(31.2304, 121.4737, 500); // 场地 500 米范围
// watchPosition 回调里：fence.contains(pos.coords.latitude, pos.coords.longitude)
// 进入范围 -> 弹提示；退出 -> 重置状态
```

## 5. 坑点自检

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 本地双击打开直接报错 | `file://` 不是安全上下文 | 用 Live Server / `npx serve` 走 localhost |
| 点按钮毫无反应 | 在 `file://` 或权限已被永久拒绝 | 先查 `permissions.query`，给降级 UI |
| 用户拒绝后再也不弹窗 | 浏览器对 `denied` 不再询问 | 引导用户去地址栏的权限图标手动改 |
| 距离算出来大得离谱 | 经纬度当平面坐标算 | 用 Haversine |
| 位置跳来跳去 | 没看 `accuracy` 就直接用 | 精度差时提示"信号弱"，连续两次稳定再用 |
| 页面耗电、发烫 | `watchPosition` 从不停止 | 用完 `clearWatch`；页面隐藏时暂停监听 |
| 页面一打开就弹权限框 | 请求时机错误 | 改为用户点击触发，并先解释用途 |

## 6. 隐私底线

定位数据一旦上传，就不再是"浏览器管得住"的东西了。三条职业底线：

1. **最小化**：只取功能必需的精度与频次。展示"同城活动"用城市级就够了，不要无脑 `enableHighAccuracy`；
2. **知情**：申请权限前用一句话说清"要位置做什么"（弹窗里浏览器的措辞你控制不了，但按钮旁的说明文字你可以写）；
3. **不留存**：内存里算完距离就丢，不要默默写进数据库。确需保存要征得同意、允许删除，并遵守《个人信息保护法》/GDPR 对位置信息的特殊要求。

## 7. 练习

1. （必做）把第 2 节示例补上 Permissions API：页面加载时查询权限，`denied` 时按钮显示"已禁用定位，点击手选城市"；
2. （必做）用 `watchPosition` 做一个"步行里程表"：累计相邻两次定位的 Haversine 距离，显示总里程，提供"停止"按钮调用 `clearWatch`；
3. （选做）地理围栏打卡：`watchPosition` 持续判断是否进入示例场地 500 米范围，进入时弹原生确认框（可用 `html5/430` 的 `dialog`），并保证不重复触发；
4. （选做）接入任一地图 JS SDK，把定位点和精度圈（`accuracy` 为半径的圆）画在地图上，直观感受定位误差。

## 8. 下一步

- 定位点要实时共享给朋友？传输层看 `html5/320-WebSocket`；
- 离线也能跑的定位 PWA，看 `html5/300-ServiceWorkerPWA`；
- 想深入坐标系（GCJ-02 火星坐标、WGS-84）与逆地理编码，是接地图 SDK 时的必修课，先知道有这回事，用的时候再查。
