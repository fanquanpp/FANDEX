---
order: 240
title: Canvas 2D 绘图与动画
module: 'html5'
category: 前端技术
difficulty: beginner
description: 画布坐标系、路径与变换、图像与离屏画布、requestAnimationFrame 动画循环、Canvas 与 SVG 选型。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Canvas 2D 即时模式绘图——HTML5 提供的位图画布，通过 JavaScript 逐帧绘制。
- **解决什么问题**：需要"像素级自由绘制"的场景——动态图表、绘图板、图片滤镜、粒子与游戏画面。这些需求 DOM + CSS 做不了或做不好。
- **什么时候用到**：
  - 大量图形对象频繁重绘（超过几百个 DOM 节点就不划算）；
  - 像素级处理：滤镜、取色、裁剪、导出图片；
  - 与媒体配合：视频截帧、音频可视化、摄像头画面处理；
  - 需要导出为 PNG/JPEG 分享时（Canvas 原生支持 `toDataURL`/`toBlob`）。
- **前置要求**：JavaScript 基础（函数、事件、回调）。SVG 路线的矢量绘图见 [210-SVG](/html5/210-SVG)；音频可视化的 Web Audio 部分见 [200-AudioVideo](/html5/200-AudioVideo)。

## 1. 心智模型：画布是一张"一次性的位图"

Canvas 与 DOM 最大的思维差异：**画上去的东西不是元素，是像素**。

- DOM 模型：每个节点都被浏览器记住，改一处浏览器自己重排；
- Canvas 模型：像素画上就"忘了"，想改只能整块清除重画。所以 Canvas 动画的固定循环是"清除 → 更新 → 重绘"。

理解了"即时模式"，下面这些现象都能解释：为什么 Canvas 图形收不到点击事件（像素不认识自己是谁）；为什么缩放画布会让图形模糊（位图拉伸）；为什么动画要自己重画全部（上一帧不保留）。

## 2. 画布与坐标系

### 2.1 标签与上下文

```html
<canvas id="myCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
<script>
  const canvas = document.getElementById('myCanvas');
  const ctx = canvas.getContext('2d');
</script>
```

**逐段讲解：**

- `<canvas>` 本身只是一块空白矩形，所有绘图能力来自 `getContext('2d')` 返回的上下文对象 `ctx`——矩形、路径、文本、图像、变换的方法全部挂在它身上；
- 需要 3D 时改用 `getContext('webgl')` 或 `getContext('webgl2')`，同一个标签可以承载完全不同的绘图体系；
- 标签内可写兜底文字，供不支持 Canvas 的环境显示。

**易错点（新手第一坑）：`width`/`height` 属性 vs CSS 尺寸。**

```html
<!-- 正确：画布 400x300 像素，显示也是 400x300，1 像素对 1 像素 -->
<canvas width="400" height="300"></canvas>

<!-- 错误：画布默认 300x150，CSS 强行拉大 → 内容被拉伸模糊 -->
<canvas style="width:400px;height:300px;"></canvas>
```

属性决定画布的"物理像素栅格"，CSS 只决定显示尺寸。两者不一致时，浏览器把小栅格拉伸到显示尺寸，就像把小图放大——模糊或变形。需要高清屏适配时按"显示尺寸 x devicePixelRatio"设置属性再用 CSS 缩回，见第 7.3 节。

### 2.2 坐标系

Canvas 2D 的原点 (0,0) 在**左上角**，x 向右增长，y 向下增长（与数学课的 y 向上相反）。所有 API 的坐标都是这个坐标系下的值：

```javascript
// 在 (10, 10) 处画一个 150x75 的矩形：从左上角往右下延伸
ctx.fillRect(10, 10, 150, 75);
```

**为什么这样设计：** 屏幕扫描线就是从左上到右下刷新的，GUI 系统普遍沿用这一约定（Windows GDI、HTML、CSS 都是 y 向下）。换算到"中心点在画布中央"这类需求时，用 `canvas.width / 2` 与 `canvas.height / 2` 即可。

## 3. 路径绘制

### 3.1 矩形三兄弟

```javascript
ctx.fillStyle = '#FF0000';          // 填充色
ctx.fillRect(10, 10, 150, 75);      // 填充矩形

ctx.strokeStyle = '#0000FF';        // 描边色
ctx.lineWidth = 2;                  // 线宽
ctx.strokeRect(200, 10, 150, 75);   // 描边矩形

ctx.clearRect(50, 25, 50, 30);      // 清除区域（变透明）
```

**讲解：**

- `fillRect`/`strokeRect`/`clearRect` 是唯三不经过路径系统的绘制方法，直接生效；
- `clearRect` 在动画循环里承担"擦黑板"职责，通常一次清全画布：`ctx.clearRect(0, 0, canvas.width, canvas.height)`；
- 参数统一为 `(x, y, width, height)`，后两个是尺寸不是右下角坐标——写反了会画歪。

### 3.2 路径四步法

```javascript
ctx.beginPath();          // 1. 开始一条新路径
ctx.moveTo(50, 150);      // 2. 抬笔移动到起点（不画线）
ctx.lineTo(150, 150);     // 3. 落笔画线到终点
ctx.lineTo(100, 50);      //    可继续画折线
ctx.closePath();          // 4. 回到起点闭合（可选）
ctx.fillStyle = '#FFFF00';
ctx.fill();               // 填充内部
ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.stroke();             // 描边轮廓
```

**讲解：**

- 路径系统是"先记账、后结算"：`moveTo/lineTo` 只记录轨迹，`fill()`/`stroke()` 才真正画到像素上。结算前可以随时改 `fillStyle`，改的就是这次结算的颜色；
- **不调用 `beginPath()` 时，新轨迹会追加到旧路径上**——第二次 `stroke()` 会把第一条线再描一遍（还叠加了新颜色）。这是 Canvas 第二大坑，记住"换一条路径必先 beginPath"；
- `fill()` 与 `stroke()` 可以对同一条路径先后调用，得到"填充 + 描边"的效果。

### 3.3 圆与弧

```javascript
// 完整圆：起止角 0 到 2PI
ctx.beginPath();
ctx.arc(250, 100, 50, 0, Math.PI * 2);
ctx.fillStyle = '#00FF00';
ctx.fill();

// 半圆弧：0 到 PI（不闭合只描边）
ctx.beginPath();
ctx.arc(250, 200, 50, 0, Math.PI);
ctx.strokeStyle = '#FF00FF';
ctx.lineWidth = 3;
ctx.stroke();
```

**讲解：**

- `arc(x, y, r, startAngle, endAngle, [anticlockwise])` 角度用弧度制：`Math.PI * 2` 是整圆、`Math.PI` 是半圆、`Math.PI / 6` 是 30 度；
- 0 弧度在 3 点钟方向，默认顺时针增长（y 轴向下的直接后果）；
- `closePath()` 对弧线是"用直线连回起点"，不是补另一半弧——想要完整圆就画 `0` 到 `Math.PI * 2`。

### 3.4 文本

```javascript
ctx.font = '30px Arial';            // CSS 字体简写语法
ctx.fillStyle = '#000000';
ctx.fillText('Hello Canvas', 50, 250);   // 填充文本
ctx.strokeStyle = '#FF0000';
ctx.strokeText('Hello Canvas', 50, 290); // 描边文本

ctx.textAlign = 'center';    // 水平对齐：left/center/right
ctx.textBaseline = 'middle'; // 垂直基线：top/middle/bottom
```

**讲解：**

- `(x, y)` 是文本"锚点"的位置，默认锚点是文本的左下基线；改 `textAlign`/`textBaseline` 后锚点含义变化——居中绘制文字的标准写法是两个属性都设 center/middle 再画；
- 字体没加载完成时 `fillText` 会用后备字体绘制，动态字体要先等 `document.fonts.ready`；
- 多行文本没有内置换行，需要自己按 `\n` 拆行、逐行计算 y 坐标。

### 3.5 综合练习：画一个笑脸

把圆、弧、填充组合起来：

```html
<canvas id="smileCanvas" width="200" height="200"></canvas>
<script>
  const canvas = document.getElementById('smileCanvas');
  const ctx = canvas.getContext('2d');

  // 画脸：整圆填充 + 描边
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.stroke();

  // 画眼睛：两个小实心圆，注意每个都先 beginPath
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(70, 80, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(130, 80, 8, 0, Math.PI * 2);
  ctx.fill();

  // 画嘴巴：下半弧（0 到 PI 在 y 向下坐标系里是"下弯"，视觉上就是"笑"）
  ctx.beginPath();
  ctx.arc(100, 100, 40, 0, Math.PI);
  ctx.stroke();
</script>
```

**讲解：** 嘴巴用 `0` 到 `Math.PI` 的下半弧，视觉上开口向上——弧度方向与 y 轴方向共同决定了"哪半边是笑"。

## 4. 变换：平移、旋转、缩放

### 4.1 save/restore 包裹律

```javascript
ctx.save();                    // 快照当前状态（变换、样式、裁剪）
ctx.translate(100, 50);        // 平移原点到 (100, 50)
ctx.fillStyle = '#FF0000';
ctx.fillRect(0, 0, 100, 50);   // 在新原点下画矩形
ctx.restore();                 // 恢复到快照，仿佛什么都没发生
```

**逐行讲解：**

- `translate(x, y)` 移动的是**坐标系原点**，不是图形。之后所有坐标都相对新原点——这是"局部坐标"思维的基础；
- `save()` 把当前全部状态压栈，`restore()` 弹栈恢复。成对使用可以把变换的影响限制在两行之间；
- 忘记 `restore()` 是第三大坑：平移/旋转会一直累积到后续所有绘制，表现为"图形越画越歪"。

### 4.2 旋转：先平移到中心再转

```javascript
ctx.save();
ctx.translate(200, 100);       // 把原点移到想要的旋转中心
ctx.rotate(Math.PI / 4);       // 绕新原点旋转 45 度
ctx.fillStyle = '#00FF00';
ctx.fillRect(-50, -25, 100, 50); // 以中心为轴画矩形（负偏移）
ctx.restore();
```

**讲解：**

- `rotate(angle)` 只能绕**当前原点**旋转，所以"绕图形自身中心旋转"的标准姿势是三步：translate 到中心 → rotate → 用负半宽/负半高画图形；
- 直接在原点画再 rotate，图形会绕画布左上角公转，多数时候不是想要的效果；
- `scale(sx, sy)` 同理作用于坐标系，影响之后绘制的尺寸与线宽；负值可镜像，`scale(1, -1)` 常用来把 y 翻回数学方向（图表库的常用技巧）。

## 5. 图像与离屏画布

### 5.1 绘制图片

```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 三参数版：原图多大画多大
  ctx.drawImage(img, 300, 150);
  // 五参数版：指定目标宽高（可缩放）
  ctx.drawImage(img, 300, 150, 100, 80);
  // 九参数版：sx, sy, sw, sh 裁剪原图 → dx, dy, dw, dh 画到画布
  ctx.drawImage(img, 100, 100, 50, 50, 300, 200, 50, 50);
};
```

**讲解：**

- `new Image()` 加载是异步的，`drawImage` 必须放在 `onload`（或 `await img.decode()`）之后——图片未解码就绘制是静默失败（什么都不画也不报错），排错时优先检查这一点；
- 九参数版本是"雪碧图"的基础：从一张大图裁出小图标画到指定位置；
- 跨域图片未配置 CORS 时画入画布会"污染"画布，之后 `toDataURL` 导出会抛错（安全限制，防止偷读他人图片像素）。

### 5.2 离屏画布：先画好再贴

重复绘制昂贵的内容（复杂背景、大量图标）时，先在内存画布上画一次，每帧只做一次 `drawImage`：

```javascript
// 离屏画布：不在 DOM 里，纯内存
const offscreen = document.createElement('canvas');
offscreen.width = 400;
offscreen.height = 300;
const octx = offscreen.getContext('2d');

// 昂贵的背景只画一次
drawComplexBackground(octx);

// 主画布每帧复用
function renderFrame(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offscreen, 0, 0); // 贴背景，一次 API 调用
  drawMovingParts(t);             // 只重画动的部分
  requestAnimationFrame(renderFrame);
}
```

**讲解：**

- 离屏画布就是普通 `<canvas>` 元素，只是不 append 到 DOM——不需要显示，只需要它的像素；
- 与"每帧全量重画"相比，复杂背景的绘制成本被摊销为一次；这是游戏与数据可视化循环的标准优化；
- 也可以用 `new OffscreenCanvas(w, h)`（可在 Worker 里使用，主线程两者皆可）。

## 6. requestAnimationFrame 动画循环

### 6.1 最小弹跳动画

```html
<canvas id="animationCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
<script>
  const canvas = document.getElementById('animationCanvas');
  const ctx = canvas.getContext('2d');
  let x = 0;
  let speed = 2;
  function animate() {
    // 1. 清除：整块擦黑板
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 2. 绘制：按当前状态画
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x, 100, 50, 50);
    // 3. 更新：改变状态，供下一帧使用
    x += speed;
    if (x > canvas.width - 50 || x < 0) {
      speed = -speed; // 碰到边界反向
    }
    // 4. 请求下一帧
    requestAnimationFrame(animate);
  }
  animate();
</script>
```

**逐段讲解：**

- 循环四步固定：清除 → 绘制 → 更新 → 请求下一帧。"更新"放在绘制之后意味着第一帧画的是初始位置，行为最直观；
- `requestAnimationFrame` 让回调在下一次渲染前执行：跟随屏幕刷新率（60Hz 屏幕约每秒 60 帧），后台标签页自动暂停省资源；
- 对比 `setInterval`：间隔不与刷新率对齐（容易掉帧、撕裂），页面切后台仍持续运行浪费资源——动画一律用 rAF，不用 setInterval。

**速度陷阱：** `x += speed` 是"每帧加 2 像素"，帧率不同的屏幕动画快慢不同（144Hz 屏比 60Hz 快 2.4 倍）。严谨做法是按时间增量：`x += speed * (deltaMs / 16.7)`，或直接用 `deltaMs` 换算速度。

### 6.2 停止动画

rAF 的返回值是帧 id，配合 `cancelAnimationFrame` 可停：

```javascript
let rafId;
function animate() {
  // ...绘制...
  rafId = requestAnimationFrame(animate);
}
rafId = requestAnimationFrame(animate);

// 条件满足时停止
if (x > canvas.width) {
  cancelAnimationFrame(rafId);
}
```

页面不可见时 rAF 自动暂停，因此多数情况无需手动处理暂停；但单次动画（加载进度、入场特效）结束时应主动 cancel，避免空转。

## 7. 三个真实工程例子

### 7.1 数据仪表盘迷你折线图

仪表盘里常见的 sparkline（迷你趋势线）：几十个数据点画一条线，鼠标悬停显示数值。

```javascript
function drawSparkline(canvas, data, color = '#1677ff') {
  const ctx = canvas.getContext('2d');
  const max = Math.max(...data);
  const min = Math.min(...data);
  const stepX = canvas.width / (data.length - 1);
  const y = (v) => canvas.height - 4 - ((v - min) / (max - min)) * (canvas.height - 8);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  data.forEach((v, i) => {
    i === 0 ? ctx.moveTo(0, y(v)) : ctx.lineTo(i * stepX, y(v));
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 用法：监控面板里每个指标一张迷你图
drawSparkline(document.getElementById('qps-chart'), [12, 18, 15, 30, 22, 40, 35]);
```

**讲解：**

- `y()` 函数把数据值映射为画布坐标：留 4px 边距、按最小最大值归一化、翻转 y 轴（值大的画在上面）——这就是"数据到像素"的线性变换，一切图表库的地基；
- 数据为空或 `max === min` 时除零得 NaN，工程实现要加守卫；
- 数据更新时重调 `drawSparkline` 即可，每秒一次的频率对 Canvas 毫无压力。

### 7.2 图片滤镜（像素级操作）

 grayscale 滤镜演示 `getImageData` 像素读写：

```javascript
function grayscale(imgCanvas) {
  const ctx = imgCanvas.getContext('2d');
  const image = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
  const d = image.data; // RGBA 四通道一维数组
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray; // R=G=B 为灰度
    // d[i+3] 是 alpha，保持不变
  }
  ctx.putImageData(image, 0, 0);
}
```

**讲解：**

- `getImageData` 返回一维 Uint8ClampedArray，按 RGBA 顺序每 4 字节一个像素——这是"Canvas 就是位图"的直接证明；
- 加权平均用感知亮度系数（0.299/0.587/0.114），直接取均值会偏暗；
- 同样的套路可以做复古色调、亮度/对比度调节；视频截帧加滤镜 = `drawImage(video)` 后调本函数；
- 大图逐像素循环较慢，浏览器提供了更快的替代：`ctx.filter = 'grayscale(100%)'`（CSS 滤镜语法）在绘制时生效。

### 7.3 CSS 斜纹背景动画的 Canvas 对照实现

E 盘 CSS 笔记里有一个斜纹背景动画实战页：`linear-gradient` 四向叠加斜纹、`background-size: 20px`、`@keyframes moveBackground` 让 `background-position` 循环移动。同一视觉用 Canvas 实现是很好的对照——理解两者各自擅长什么：

```javascript
const canvas = document.getElementById('stripes');
const ctx = canvas.getContext('2d');
const SIZE = 20; // 与 CSS 版 background-size: 20px 对应

// 画一个平铺单元：两条对角线构成斜纹
function drawTile() {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, SIZE);
  ctx.lineTo(SIZE, 0);
  ctx.moveTo(-SIZE / 2, SIZE / 2);
  ctx.lineTo(SIZE / 2, -SIZE / 2);
  ctx.stroke();
}

let offset = 0;
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 平铺：让单元阵列覆盖全画布，offset 制造移动感
  for (let x = -SIZE; x < canvas.width + SIZE; x += SIZE) {
    for (let y = -SIZE; y < canvas.height + SIZE; y += SIZE) {
      ctx.save();
      ctx.translate(x + offset, y + offset);
      drawTile();
      ctx.restore();
    }
  }
  offset = (offset + 0.5) % SIZE; // 移动一个单元后回卷，形成无缝循环
  requestAnimationFrame(animate);
}
drawTile();
animate();
```

**对照讲解：**

- CSS 版一行 `@keyframes` 就能动的背景，Canvas 版要自己算平铺循环与回卷——**静态/简单平移动画，CSS 更合适**；
- Canvas 版的优势在"下一步的自由度"：想让斜纹跟随鼠标改变角度、随音乐节奏改变间距、与粒子叠加，CSS 渐变就无能为力了；
- 结论与 8.4 选型表一致：装饰性背景交给 CSS，交互式/数据驱动画画交给 Canvas。

## 8. Canvas 与 SVG 选型

| 特性 | Canvas | SVG |
| --- | --- | --- |
| 绘图方式 | 基于像素，JavaScript 绘制 | 基于矢量，XML 标记 |
| 缩放 | 缩放会失真（位图） | 缩放不失真（矢量） |
| 性能 | 适合大量图形与逐帧动画 | 适合少量静态图形 |
| 事件处理 | 需手动实现（自己算坐标命中） | 每个图形都是 DOM 元素，原生事件 |
| 无障碍 | 像素对读屏不可见，需替代文本 | 元素有语义，可访问 |
| 适用场景 | 游戏、复杂动画、数据可视化、像素处理 | 图标、图表、标志、可交互示意图 |

**判断口诀：** 图形少、要交互、要缩放 → SVG；图形多、逐帧动、要像素操作 → Canvas。两者可以混用（SVG 做静态骨架 + Canvas 做动态层）。

## 9. 进阶：导出与 WebGL 速览

### 9.1 画布导出为图片

```javascript
// 转为 data URL（可直接作为图片地址）
const dataURL = canvas.toDataURL('image/png');
const jpegURL = canvas.toDataURL('image/jpeg', 0.9); // 第二参 0-1 控制质量

// 转为 Blob 并触发下载
canvas.toBlob((blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canvas.png';
  a.click();
  URL.revokeObjectURL(url); // 用完释放，避免内存泄漏
}, 'image/png');
```

**讲解：** `toDataURL` 生成 base64 字符串（体积大、适合预览）；`toBlob` 是二进制（体积小、适合下载与上传）。导出受画布污染限制：画过无 CORS 的跨域图片后导出抛 SecurityError。

### 9.2 WebGL 与高 DPI

```javascript
// WebGL：GPU 加速的 3D/高性能 2D
const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');

// 高 DPI 适配：物理像素渲染，CSS 缩回显示尺寸
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';
ctx.scale(dpr, dpr); // 之后按 CSS 像素画，输出高清
```

**讲解：** WebGL 需要着色器与缓冲区管理，复杂度远高于 2D，项目需要 3D 时通常直接用 Three.js。高 DPI 不处理时 Canvas 在 Retina 屏上是模糊的——`scale(dpr, dpr)` 让坐标系逻辑不变、物理像素翻倍，是所有图表库的标配。

## 10. 动手实践

### 任务

1. 画布上画一个矩形、一个圆和一行居中文字；
2. 用 rAF 让圆在画布内左右弹跳（碰壁反向），动画速度与屏幕刷新率无关；
3. 给弹跳加"暂停/继续"按钮（用 cancelAnimationFrame）；
4. 把绘制结果导出为 PNG 下载。

### 提示

- 居中文字先设 `textAlign = 'center'` 与 `textBaseline = 'middle'`，再画到 `canvas.width / 2`；
- 速度与帧率解耦：在 animate 参数里拿 `performance.now()` 算 delta；
- 每个图形绘制前先 `beginPath()`。

### 参考实现（先自己写，写完再展开对照）

```html
<canvas id="demo" width="400" height="300" style="border:1px solid #000;"></canvas>
<button id="toggleBtn">暂停</button>
<button id="saveBtn">保存 PNG</button>
<script>
  const canvas = document.getElementById('demo');
  const ctx = canvas.getContext('2d');
  const r = 20;
  let x = r, y = 150, speed = 2;
  let rafId = null;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 圆
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1677ff';
    ctx.fill();
    // 居中文字
    ctx.fillStyle = '#333';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canvas 动画演示', canvas.width / 2, 30);
  }

  function animate(now) {
    const prev = animate.prev || now;
    const delta = now - prev;        // 帧间隔毫秒数
    animate.prev = now;
    x += speed * (delta / 16.7);     // 换算成 60FPS 基准的速度
    if (x > canvas.width - r) { x = canvas.width - r; speed = -speed; }
    if (x < r) { x = r; speed = -speed; }
    draw();
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  document.getElementById('toggleBtn').addEventListener('click', function () {
    if (rafId === null) {
      rafId = requestAnimationFrame(animate);
      this.textContent = '暂停';
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
      this.textContent = '继续';
    }
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'demo.png';
    a.click();
  });
</script>
```

**参考实现讲解：** delta 换算让动画在任意刷新率下速度一致；暂停用 `rafId === null` 作为状态标记，避免重复注册循环；导出前一次 `clearRect` 之后画的内容就是下载内容。

## 11. 核心要点回顾

- Canvas 是即时模式位图：`getContext('2d')` 拿上下文，坐标原点在左上角、y 向下；
- 属性 `width`/`height` 控制像素栅格，CSS 只控制显示尺寸，两者混淆导致模糊；
- 路径"先记账后结算"：换路径必 `beginPath()`，画完必 `fill()`/`stroke()`；
- 变换三件套 `translate`/`rotate`/`scale` 用 `save()`/`restore()` 成对包裹；
- 图片必须等 `onload` 再 `drawImage`；重复内容用离屏画布缓存；
- 动画循环"清除-绘制-更新-请求下一帧"，一律用 `requestAnimationFrame`；
- 选型：像素级、大批量、逐帧 → Canvas；矢量、少量、要交互 → SVG。

## 12. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| CSS 控制画布尺寸 | 位图被拉伸模糊 | 用 `width`/`height` 属性 + 高 DPI 适配 |
| 忘记 `beginPath()` | 新旧路径叠加画出意外图形 | 每组图形前调用 |
| 忘记 `fill()`/`stroke()` | 路径只记录未结算，画布空白 | 记住"记账后要结算" |
| 图片未加载就绘制 | 静默失败不报错 | `img.onload` 或 `await img.decode()` |
| 变换未恢复 | 后续绘制全部歪斜 | `save()`/`restore()` 成对包裹 |
| 高频动画用 setInterval | 掉帧、后台仍运行 | 改用 requestAnimationFrame |
| 导出抛 SecurityError | 画了无 CORS 的跨域图片 | 图片服务开 CORS 或用同源资源 |
| 忽略高 DPI | Retina 屏显示模糊 | `devicePixelRatio` 缩放（9.2 节） |

## 13. 扩展学习

- SVG 路线：[210-SVG](/html5/210-SVG) 的矢量绘图与 `viewBox`；
- 媒体配合：[200-AudioVideo](/html5/200-AudioVideo) 的截帧与 Web Audio 可视化；
- 性能：[380-CriticalRenderingPathAndResourceLoading](/html5/380-CriticalRenderingPathAndResourceLoading) 中 rAF 与渲染调度的关系；
- 回调与动画循环的语言基础：`javascript/150-HigherOrderFunction`。

## 参考与致谢

- MDN Web Docs：Canvas API 与 Canvas tutorial 教程（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API
- WHATWG HTML Living Standard：4.12.4 The canvas element，https://html.spec.whatwg.org/multipage/canvas.html
- 本篇主体内容承接仓库 `230-HTML5MultimediaCanvasDrawing` 拆分前的 Canvas 章节素材并重写扩充。
