# 多媒体与 Canvas 绘图 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Canvas 元素

**canvas 标签**
`<canvas id="<ID>" width="<宽>" height="<高>" [style]></canvas>`
```html
<!-- 画布元素 -->
<canvas id="myCanvas" width="400" height="300" style="border:1px solid #000;">
  您的浏览器不支持 Canvas。
</canvas>
```

**获取绘图上下文**
```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// WebGL 上下文
const gl = canvas.getContext('webgl');
// 或 webgl2
const gl2 = canvas.getContext('webgl2');
```

---

## Canvas 2D 矩形

**矩形绘制**
`ctx.fillRect(x, y, width, height)` | `ctx.strokeRect(...)` | `ctx.clearRect(...)`
```javascript
// 填充矩形
ctx.fillStyle = '#FF0000';
ctx.fillRect(10, 10, 150, 75);

// 描边矩形
ctx.strokeStyle = '#0000FF';
ctx.lineWidth = 2;
ctx.strokeRect(200, 10, 150, 75);

// 清除矩形区域
ctx.clearRect(50, 25, 50, 30);

// 圆角矩形(新 API)
ctx.beginPath();
ctx.roundRect(10, 10, 100, 50, 8);
ctx.fill();
```

---

## Canvas 路径

**路径绘制**
```javascript
// 三角形
ctx.beginPath();
ctx.moveTo(50, 150);       // 移动到起点
ctx.lineTo(150, 150);      // 画线到
ctx.lineTo(100, 50);
ctx.closePath();           // 闭合路径
ctx.fillStyle = '#FFFF00';
ctx.fill();                // 填充
ctx.stroke();              // 描边
```

**圆形与弧线**
`ctx.arc(x, y, radius, startAngle, endAngle, [anticlockwise])`
```javascript
// 完整圆
ctx.beginPath();
ctx.arc(250, 100, 50, 0, Math.PI * 2);
ctx.fillStyle = '#00FF00';
ctx.fill();

// 半圆弧
ctx.beginPath();
ctx.arc(250, 200, 50, 0, Math.PI);
ctx.strokeStyle = '#FF00FF';
ctx.lineWidth = 3;
ctx.stroke();

// 椭圆
ctx.beginPath();
ctx.ellipse(100, 200, 50, 30, 0, 0, Math.PI * 2);
ctx.stroke();
```

**贝塞尔曲线**
```javascript
// 二次贝塞尔
ctx.beginPath();
ctx.moveTo(0, 100);
ctx.quadraticCurveTo(50, 0, 100, 100); // 控制点,终点
ctx.stroke();

// 三次贝塞尔
ctx.beginPath();
ctx.moveTo(0, 200);
ctx.bezierCurveTo(30, 150, 70, 250, 100, 200); // 控制点1,控制点2,终点
ctx.stroke();
```

---

## Canvas 文本

**文本绘制**
`ctx.fillText(text, x, y, [maxWidth])` | `ctx.strokeText(...)`
```javascript
// 填充文本
ctx.font = '30px Arial';
ctx.fillStyle = '#000000';
ctx.textAlign = 'start';  // start/end/left/right/center
ctx.textBaseline = 'alphabetic'; // top/hanging/middle/alphabetic/ideographic/bottom
ctx.fillText('Hello Canvas', 50, 250);

// 描边文本
ctx.font = '24px Times New Roman';
ctx.strokeStyle = '#FF0000';
ctx.strokeText('Hello Canvas', 50, 290);

// 测量文本
const metrics = ctx.measureText('Hello');
console.log(metrics.width);
```

---

## Canvas 图像

**图像绘制**
`ctx.drawImage(image, x, y, [width, height])` | `ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)`
```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 完整绘制
  ctx.drawImage(img, 0, 0);

  // 缩放绘制
  ctx.drawImage(img, 0, 0, 100, 80);

  // 裁剪绘制(源 x,y,w,h,目标 x,y,w,h)
  ctx.drawImage(img, 100, 100, 50, 50, 200, 200, 50, 50);
};
```

---

## Canvas 样式

**填充与描边**
```javascript
// 纯色
ctx.fillStyle = 'red';
ctx.fillStyle = '#FF0000';
ctx.fillStyle = 'rgb(255, 0, 0)';
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';

// 线性渐变
const linearGradient = ctx.createLinearGradient(0, 0, 200, 0);
linearGradient.addColorStop(0, 'red');
linearGradient.addColorStop(0.5, 'yellow');
linearGradient.addColorStop(1, 'blue');
ctx.fillStyle = linearGradient;

// 径向渐变
const radialGradient = ctx.createRadialGradient(100, 100, 10, 100, 100, 100);
radialGradient.addColorStop(0, 'white');
radialGradient.addColorStop(1, 'black');
ctx.fillStyle = radialGradient;

// 图案
const pattern = ctx.createPattern(img, 'repeat'); // repeat/repeat-x/repeat-y/no-repeat
ctx.fillStyle = pattern;
```

**线样式**
```javascript
ctx.lineWidth = 2;            // 线宽
ctx.lineCap = 'round';        // butt/round/square
ctx.lineJoin = 'round';       // miter/round/bevel
ctx.miterLimit = 10;          // 斜接限制
ctx.setLineDash([5, 5]);      // 虚线
ctx.lineDashOffset = 0;       // 虚线偏移
```

**阴影**
```javascript
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
```

**透明度与合成**
```javascript
ctx.globalAlpha = 0.5;            // 全局透明度
ctx.globalCompositeOperation = 'source-over'; // 合成模式
// source-over / destination-over / multiply / screen / overlay 等
```

---

## Canvas 变换

**坐标变换**
```javascript
ctx.save();                       // 保存状态
ctx.translate(100, 50);           // 平移
ctx.rotate(Math.PI / 4);          // 旋转(弧度)
ctx.scale(1.5, 0.8);              // 缩放
ctx.transform(a, b, c, d, e, f);  // 矩阵变换
ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换
ctx.restore();                    // 恢复状态
```

**示例:旋转矩形**
```javascript
ctx.save();
ctx.translate(200, 100);          // 移到旋转中心
ctx.rotate(Math.PI / 4);          // 旋转 45 度
ctx.fillStyle = '#00FF00';
ctx.fillRect(-50, -25, 100, 50);  // 以新原点为基准
ctx.restore();
```

---

## Canvas 动画

**requestAnimationFrame**
```javascript
let x = 0;
const speed = 2;

function animate() {
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(x, 100, 50, 50);

  // 更新位置
  x += speed;
  if (x > canvas.width - 50 || x < 0) {
    speed = -speed; // 反弹
  }

  // 请求下一帧
  requestAnimationFrame(animate);
}

animate();

// 取消动画
const animationId = requestAnimationFrame(animate);
cancelAnimationFrame(animationId);
```

---

## Canvas 交互

**鼠标绘制**
```javascript
let isDrawing = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
```

**触摸事件**
```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  isDrawing = true;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  [lastX, lastY] = [x, y];
});
```

---

## Canvas 图像导出

**toDataURL 与 toBlob**
```javascript
// 转为 data URL
const dataURL = canvas.toDataURL('image/png');
const dataURL2 = canvas.toDataURL('image/jpeg', 0.9); // 质量

// 转为 Blob
canvas.toBlob((blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canvas.png';
  a.click();
  URL.revokeObjectURL(url);
}, 'image/png');
```

---

## Canvas vs SVG

| 特性     | Canvas                         | SVG                     |
| -------- | ------------------------------ | ----------------------- |
| 绘图方式 | 基于像素,JavaScript 绘制       | 基于矢量,XML 标记       |
| 缩放     | 缩放会失真                     | 缩放不失真              |
| 性能     | 适合大量图形和动画             | 适合少量静态图形        |
| 事件处理 | 需手动实现                     | 支持元素级事件          |
| DOM      | 单一元素                       | 每个图形是 DOM 元素     |
| 适用场景 | 游戏、复杂动画、数据可视化     | 图标、图表、标志        |

---

## Web Audio API

**音频上下文**
```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 创建振荡器
const oscillator = audioCtx.createOscillator();
oscillator.type = 'sine'; // sine/square/sawtooth/triangle
oscillator.frequency.value = 440; // 频率 Hz

// 创建增益(音量)
const gainNode = audioCtx.createGain();
gainNode.gain.value = 0.5;

// 连接节点
oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);

// 播放
oscillator.start();
oscillator.stop(audioCtx.currentTime + 2); // 2 秒后停止
```
