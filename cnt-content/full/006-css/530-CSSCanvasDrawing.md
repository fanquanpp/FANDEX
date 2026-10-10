---
order: 580
title: CSS Canvas 绘图
module: 'css'
category: 前端技术
difficulty: intermediate
description: 从 CSS 的边界出发学 Canvas 2D：什么时候必须上画布、从零做一个像素画生成器（含高清屏 DPR 处理与 toBlob 导出）、路径/变换/合成模式核心 API、rAF 动画循环与性能清单。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/230-HTML5MultimediaCanvasDrawing'
  - 'css/310-CSSFilters'
  - 'css/330-CSSAnimationTransition'
  - 'html5/290-WebWorkers'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)
- JavaScript 基础（DOM、事件、`requestAnimationFrame` 见 `javascript/027` 事件循环）。本篇代码量大于样式量。

> 定位说明：本篇从 CSS 的视角切入 Canvas——先讲清 CSS 做不到什么、Canvas 补什么；Canvas 本身的完整体系见 `html5/230-HTML5MultimediaCanvasDrawing`，两篇互补。

## 1. 场景切入：CSS 够用与不够用的那条线

你已经会用 CSS 画出很多东西：渐变、阴影、圆角、滤镜、遮罩，甚至配合 `clip-path` 做出复杂形状。FANDEX 网页端的律动背景、pixel-vault 的卡片描边，都是纯 CSS。但有些需求 CSS 一行都写不出来：

- **逐像素控制**：做一个像素画编辑器，用户点一格改一格的颜色；
- **运行时生成图像**：把用户数据画成海报再导出 PNG；
- **成百上千个独立运动的元素**：粒子背景、数据可视化的数千个节点——用 DOM + CSS 每个元素一帧一次重排，帧率立刻崩。

这条线的判断标准是：**形状固定、数量有限 → CSS；像素级、动态生成、海量元素 → Canvas**。Canvas 是一块"内存里的位图"，你用 JavaScript 一笔一笔往里画，画完浏览器整块上屏。本篇的动手项目就是第一种场景：给 pixel-vault 做一个最小像素画生成器——16x16 网格点选上色、实时预览、导出 PNG。

## 2. 动手：像素画生成器

新建 `pixel-painter.html`，整份复制即可运行：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>像素画生成器</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; }
    canvas { border: 2px solid #ccc; image-rendering: pixelated; touch-action: none; }
    .bar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    input[type="color"] { width: 48px; height: 32px; }
    button { padding: 6px 14px; border: none; border-radius: 6px;
             background: #39C5BB; color: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <h3>16x16 像素画</h3>
  <div class="bar">
    <input type="color" id="color" value="#39C5BB" />
    <button id="clear">清空</button>
    <button id="export">导出 PNG</button>
  </div>
  <canvas id="board" width="320" height="320"></canvas>

  <script>
    const N = 16;                          // 16x16 格
    const CELL = 20;                       // 每格 20 CSS 像素
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');   // 画笔，所有绘制都通过它

    // 高清屏处理：物理像素 = CSS 像素 x devicePixelRatio，否则画布会发虚
    const dpr = window.devicePixelRatio || 1;
    canvas.width = N * CELL * dpr;
    canvas.height = N * CELL * dpr;
    canvas.style.width = N * CELL + 'px';
    canvas.style.height = N * CELL + 'px';
    ctx.scale(dpr, dpr);

    const grid = Array.from({ length: N }, () => Array(N).fill(null));

    function render() {
      ctx.clearRect(0, 0, N * CELL, N * CELL);
      // 网格线
      ctx.strokeStyle = '#eee';
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, N * CELL);
        ctx.moveTo(0, i * CELL); ctx.lineTo(N * CELL, i * CELL);
        ctx.stroke();
      }
      // 已上色的格子
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (grid[y][x]) {
            ctx.fillStyle = grid[y][x];
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
    }

    // 按住拖动连续上色：pointerdown/pointermove 一套通吃鼠标与触摸
    let painting = false;
    function paintAt(e) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL);
      const y = Math.floor((e.clientY - rect.top) / CELL);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      grid[y][x] = document.getElementById('color').value;
      render();
    }
    canvas.addEventListener('pointerdown', (e) => {
      painting = true;
      canvas.setPointerCapture(e.pointerId);
      paintAt(e);
    });
    canvas.addEventListener('pointermove', (e) => { if (painting) paintAt(e); });
    canvas.addEventListener('pointerup', () => { painting = false; });

    document.getElementById('clear').addEventListener('click', () => {
      grid.forEach((row) => row.fill(null));
      render();
    });
    document.getElementById('export').addEventListener('click', () => {
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pixel-art.png';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });

    render();
  </script>
</body>
</html>
```

动手清单：

1. 选色后按住鼠标拖过网格，像素画成形；
2. 点"导出 PNG"，下载的文件能直接当素材用——这就是"运行时生成图像"的最小闭环；
3. 把 DPR 那四行删掉再在高分屏（手机或缩放 150% 的显示器）看：画布文字与线条明显发虚，体会为什么它必不可少。

## 3. 讲为什么：一套"状态机 + 重绘"的心智模型

像素画器只有 60 行，却包含了 Canvas 编程的全部主干，值得拆开看。

### 3.1 一切从上下文开始

`<canvas>` 元素本身只是容器，`getContext('2d')` 返回的 `ctx` 才是画笔。所有绘制都是对 ctx 的**有状态调用**：先设 `fillStyle` 再 `fillRect`，后面所有填充都沿用这个颜色，直到你改它。这和 CSS"每条规则独立生效"的气质完全不同——Canvas 更像拿着一支会换墨的笔画水彩。

```javascript
ctx.fillStyle = '#39C5BB';
ctx.fillRect(10, 10, 100, 50);     // 实心矩形
ctx.strokeRect(120, 10, 100, 50);  // 描边矩形（颜色看 strokeStyle）
ctx.clearRect(0, 0, w, h);         // 擦除（透明），动画每帧的第一步
```

### 3.2 路径：复杂形状的统一画法

矩形之外的一切形状（线、圆、多边形）都走同一套流程：`beginPath()` 开新路径 → `moveTo/lineTo/arc` 描点 → `fill()` 或 `stroke()` 落笔。

```javascript
ctx.beginPath();               // 忘了这句，新形状会和旧路径连成一体
ctx.arc(100, 100, 40, 0, Math.PI * 2);  // 圆：圆心、半径、起止角
ctx.fillStyle = '#ffd9e3';
ctx.fill();

ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(100, 100);
ctx.strokeStyle = '#333';
ctx.lineWidth = 2;
ctx.stroke();
```

`beginPath` 是 Canvas 的头号坑：路径是**累积**的，不开新路径，`fill` 会把之前的路径一起填掉。排错口诀：每个新形状前先 `beginPath`。

### 3.3 状态栈：save/restore 与变换

`translate/rotate/scale` 改变后续所有绘制的坐标系，配 `save()`/`restore()` 入栈出栈，画出"局部坐标系"里的东西而不污染全局：

```javascript
ctx.save();
ctx.translate(200, 100);        // 原点挪到 (200,100)
ctx.rotate(Math.PI / 4);        // 之后画的都旋转 45 度
ctx.fillRect(-25, -25, 50, 50); // 以新原点为中心画方块
ctx.restore();                  // 坐标系原样恢复
```

### 3.4 重绘循环：清除、更新、画

Canvas 没有"改某个元素"的概念，动画永远是**整帧重画**。像素画器的 `render()` 是最朴素的版本（事件触发重绘），连续动画则交给 `requestAnimationFrame`：

```javascript
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // 1. 清
  update();                                          // 2. 更新状态
  draw();                                            // 3. 重画
  requestAnimationFrame(animate);                    // 4. 下一帧（约 60fps）
}
requestAnimationFrame(animate);
```

`requestAnimationFrame` 而不是 `setInterval` 的原因：它与屏幕刷新同步、标签页切后台时自动暂停、掉帧时不堆叠回调。经典应用是弹跳球——维护 x/y 与速度 dx/dy，每帧累加并做边界反弹；把像素画器里任意一个格子的坐标动起来，就是这个例子的变体。

## 4. 进阶 API 速览：图片、渐变与合成

三个常用高阶能力，了解即可，用时回来查。

**绘制图片**：`drawImage` 九参数形态能"取图一块、画到一处、缩放一尺寸"，是最常用的形态：

```javascript
const img = new Image();
img.onload = () => {
  // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  ctx.drawImage(img, 100, 100, 200, 100,  0, 0, 400, 200);  // 裁剪原图一块并放大绘制
};
img.src = 'photo.jpg';
```

**程序化渐变与图案**：比 CSS 渐变更自由（可作 fillStyle 参与任意绘制）：

```javascript
const g = ctx.createLinearGradient(0, 0, 400, 0);  // 或 createRadialGradient
g.addColorStop(0, '#39C5BB');
g.addColorStop(1, '#ffd9e3');
ctx.fillStyle = g;
ctx.fillRect(0, 0, 400, 300);
```

**合成模式**：`globalCompositeOperation` 控制新像素与已有像素的叠加方式，做遮罩擦除（`destination-out`）、发光叠加（`lighter`）必备：

```javascript
ctx.globalCompositeOperation = 'destination-out';
// 之后再画的部分会变成"橡皮擦"，把下层像素抠掉
```

## 5. 坑点自检

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 画布在高分屏发虚 | 位图尺寸是 CSS 尺寸 1 倍 | DPR 三件套：属性尺寸乘 dpr、style 尺寸不变、`ctx.scale(dpr, dpr)` |
| 图形越画越连成一片 | 忘 `beginPath()`，路径累积 | 每个新形状前开新路径 |
| 画布显示比例不对/模糊 | 用 CSS 拉伸了默认 300x150 的位图 | 用 `width`/`height` 属性（或 JS）设真实位图尺寸 |
| 动画卡顿、切后台回来狂跳 | 用了 `setInterval` | 改 `requestAnimationFrame`，时间差用帧间隔算 |
| 满帧重绘拖慢页面 | 每帧清整幅、画全部 | 只清更新区域；静态背景分层到离屏 canvas |
| 图片画上去但 `toDataURL/toBlob` 报安全错误 | 画过跨域且无 CORS 头的图，画布被"污染" | 图片服务返回 CORS 头并设 `img.crossOrigin = 'anonymous'` |
| 想在点击处画但位置偏了 | 事件坐标是页面坐标 | `getBoundingClientRect()` 换算（见像素画器的 `paintAt`） |

## 6. 性能清单

Canvas 性能问题只有一条主线：**每帧做了多少像素工作**。按收益排序：

1. 减少每帧绘制范围：只 `clearRect` 与重画变化区域；
2. 静态内容离屏预渲染：背景、网格这类不变的内容画进 `document.createElement('canvas')`，每帧 `drawImage` 贴上去一次即可；
3. 批量路径：同色的一批形状合成一条路径再 `fill`；
4. 粒子规模（几百上千个）还嫌慢时，把渲染搬进 Worker：`OffscreenCanvas`（`html5/290-WebWorkers` 有完整示例）；
5. 导出用 `toBlob`（异步、内存友好），`toDataURL` 留给调试。

## 7. 可访问性与降级

两条与直觉不同的规则：

- Canvas **没有 alt 属性**。替代文本的写法是把内容作为 canvas 的**子内容**（旧浏览器或读屏降级时展示）并配 `role="img"` 与 `aria-label`：

```html
<canvas id="chart" role="img" aria-label="近 12 个月投稿量柱状图">
  你的浏览器不支持画布，图表数据见下方表格。
  <table>……同数据的表格版本……</table>
</canvas>
```

- 纯装饰性 Canvas（粒子背景）设 `aria-hidden="true"`，别让读屏用户听一段空白。

## 8. 练习

1. （必做）跑通像素画生成器，加一个"橡皮擦"模式：切换后点击格子变回透明（提示：`grid[y][x] = null`）；
2. （必做）加"取色器"：右键点击格子把它的颜色读回颜色输入框（`<input type="color">` 的 `value` 可写）；
3. （选做）把弹跳球动画写出来：一个圆在画布内匀速运动、四壁反弹（核心是 x += dx 与边界判断）；
4. （选做）给像素画加"调色板"：固定 8 个预设色按钮，点击切换当前色，模拟复古游戏机的限色调色板；
5. （选做）进阶：粒子连线背景（约 100 个粒子运动、距离小于阈值时画线连接），并按第 6 节清单优化到 60fps。

## 9. 下一步

- Canvas 的完整体系（WebGL、文本度量、像素读写 `getImageData`）：`html5/230-HTML5MultimediaCanvasDrawing`；
- 同样能画图但走矢量路线的 SVG 及两者选型：`html5/210-SVG`；
- "形状固定、数量有限"的场景回头用 CSS：渐变见 `css/260-Gradient`，滤镜见 `css/310-CSSFilters`，动画与过渡见 `css/330-CSSAnimationTransition`。
