---
order: 340
title: React 与 Canvas
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 集成 Canvas 绘图：命令式绘制的所有权边界、useRef + Effect 绘制流、rAF 动画循环与 React 渲染解耦、DPR 高清适配、ResizeObserver 响应式与指针交互画板示例。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/320-ReactAccessibility'
  - 'react/330-ReactPWA'
  - 'react/350-ReactD3'
  - 'react/250-ReactAnimation'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

`<canvas>` 是一块**像素画布**：画上去的是位图，DOM 里没有任何子元素——这与 React"声明式描述 UI"的模型天然相斥。正确的心智模型是**所有权分离**：React 拥有画布的"外壳"（尺寸、样式、可见性、加载态），Canvas 的**内容**完全由命令式绘制代码（Effect/rAF）接管。一句话：**React 管"什么时候重画"，绘制函数管"怎么画"**。适合的场景是高频图形（白板、图表动画、小游戏、图像处理）；静态低频图形直接用 SVG 更好（可访问、可交互、矢量缩放）。

## 2. 最小绘制流：useRef + useEffect

```tsx
import { useEffect, useRef, useState } from 'react';

export function Badge({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawnAt, setDrawnAt] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 命令式绘制：清空 -> 画背景 -> 画文字
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3367d6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, canvas.height / 2);
    setDrawnAt(new Date().toLocaleTimeString()); // 验证：text 不变时本 Effect 不会重跑
  }, [text]); // text 变化 = 触发一次重画

  return <canvas ref={canvasRef} width={200} height={40} />;
}
```

预期渲染行为：显示蓝底白字的徽章；修改 `text` 后画布内容同步更新。注意 `text` 不变的其他 state 更新**不会**触发重画——Effect 依赖决定了重画时机，这正是分离的价值。

## 3. 高清屏适配：devicePixelRatio

Canvas 的 `width/height` 是**像素缓冲区尺寸**，CSS 尺寸是显示尺寸；两者相等时高分屏会模糊。标准做法是按 `devicePixelRatio` 放大缓冲区再缩放坐标系：

```tsx
function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);   // 缓冲区放大 dpr 倍
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);                            // 绘制坐标仍按 CSS 像素
  return ctx;
}
```

之后所有绘制代码都按 CSS 像素写（如 `fillRect(0, 0, 100, 40)`），无需关心屏幕密度。

## 4. 动画循环：rAF 与 React 渲染解耦

60fps 的动画若把每帧数据放进 React state，每秒 60 次全组件重渲染，很快掉帧。正确姿势：**帧内状态放 ref + 直接重画**，React 只在"语义变化"时介入：

```tsx
import { useEffect, useRef } from 'react';

function BouncingBall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupCanvas(canvas);
    const raf = { id: 0 };

    // 物理状态全部活在这个闭包/ref 里，不进 React
    const ball = { x: 20, y: 20, vx: 3, vy: 2, r: 8 };

    function frame() {
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < ball.r || ball.x > canvas.clientWidth - ball.r) ball.vx *= -1; // 碰壁反弹
      if (ball.y < ball.r || ball.y > canvas.clientHeight - ball.r) ball.vy *= -1;

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight); // 每帧全清全画
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      raf.id = requestAnimationFrame(frame);
    }
    raf.id = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf.id); // 卸载必须停帧
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 200 }} />;
}
```

预期渲染行为：小球在画布内匀速弹跳，全程零次 React 重渲染；组件卸载后动画停止。需要"外部控制"（暂停按钮）时，把控制标志放 ref，按钮 onClick 只改 ref，循环每帧读取。

## 5. 交互画板：指针事件与坐标换算

完整示例：可手绘的白板，数据（笔画）留在 ref，React 只管理"清空"按钮与笔画计数：

```tsx
import { useRef, useState } from 'react';

export function Sketchpad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState(0); // 语义数据：笔画数（React 渲染）

  function pos(e: React.PointerEvent): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    // 指针坐标换算成画布内 CSS 像素坐标（减去画布偏移）
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 240, touchAction: 'none', border: '1px solid #ccc' }}
        onPointerDown={(e) => { drawing.current = true; last.current = pos(e); }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const ctx = canvasRef.current!.getContext('2d')!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.lineWidth = 2;
          ctx.stroke();
          last.current = p;
        }}
        onPointerUp={() => {
          if (drawing.current) setStrokes((n) => n + 1); // 一笔结束才更新 React 状态
          drawing.current = false;
          last.current = null;
        }}
        onPointerLeave={() => { drawing.current = false; last.current = null; }}
      />
      <p>已画 {strokes} 笔</p>
    </div>
  );
}
```

预期渲染行为：按住拖动即画线（`touch-action: none` 防止移动端滚动劫持），每抬笔一次计数加一；绘制过程本身不触发任何 React 重渲染。`setupCanvas` 的高清适配应在挂载时调用一次。

## 6. 响应式：ResizeObserver 重画

容器尺寸变化时，画布需要重新分配缓冲区并重画全部内容：

```tsx
useEffect(() => {
  const canvas = canvasRef.current!;
  const observer = new ResizeObserver(() => redrawAll()); // 尺寸变化 -> 重设缓冲 + 重画
  observer.observe(canvas.parentElement!);
  return () => observer.disconnect();
}, []);
// redrawAll 内部先 setupCanvas(canvas)（会重置缓冲区）再按当前数据全量重画
```

注意：修改 `canvas.width/height` 会**清空整个画布**，所以重设尺寸后必须用"当前数据"全量重画——这要求绘制是**数据驱动**的（有份量的状态存 ref/结构化数据，画布只是投影），而不是"画完就丢"的命令流水。

## 7. 常见陷阱

- **在渲染函数里绘制**：`render` 阶段碰 canvas 会随每次重渲染叠加内容（canvas 不会自动清）；绘制只在 Effect/事件/rAF 里做。
- **忘记 DPR**：高分屏上文字与线条发虚；按第 3 节处理。
- **坐标错位**：指针事件坐标是**页面坐标**，必须减 `getBoundingClientRect()` 偏移；画布在滚动容器或缩放布局下还要乘缩放比。
- **改尺寸不清空重画**：设置 `canvas.width` 即清空画布，很多"重设尺寸后内容消失"的 bug 都源于此。
- **泄漏的 rAF 与监听**：`cancelAnimationFrame`、`ResizeObserver.disconnect()`、指针监听都要在清理函数中成对出现（并发渲染下 Effect 会双跑）。
- **无障碍为零**：canvas 内容对读屏不可见；给 `<canvas>` 加 `role="img"` 与 `aria-label` 概述内容，关键数据提供表格/文本等价物（见[React 无障碍](/react/320-ReactAccessibility)）。

## 8. 小结

初学者要点：

- React 拥有外壳（尺寸/样式/加载态），绘制代码拥有内容；绘制放在 Effect 与事件处理里，渲染函数只输出 `<canvas>` 元素。
- 高清适配三板斧：缓冲区乘 DPR、`ctx.scale`、按 CSS 像素绘制。
- 动画用 rAF 循环，帧状态放 ref，卸载取消帧。

进阶注意：

- 交互坐标 = 客户端坐标减 rect 偏移；缩放布局下再乘比例。
- 让绘制"数据驱动"（笔画/图形数据存 ref），尺寸变化与重置时全量重画，别依赖增量命令流水。
- 复杂场景上库：Konva（对象模型 + React 绑定 react-konva）、PixiJS（WebGL 高性能 2D）；静态图优先 SVG，见[React 与 D3](/react/350-ReactD3)。

## 速查

**最小绘制**

```tsx
const ref = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  const ctx = ref.current!.getContext('2d')!;
  ctx.clearRect(0, 0, w, h); // 先清再画
  ctx.fillRect(0, 0, 100, 40);
}, [deps]); // deps 变化 -> 重画
```

**DPR 适配**

```ts
const dpr = window.devicePixelRatio || 1;
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr); // 之后按 CSS 像素绘制
```

**rAF 循环**

```ts
let rafId = requestAnimationFrame(function frame() {
  update(); draw();
  rafId = requestAnimationFrame(frame);
});
// cleanup: cancelAnimationFrame(rafId)
```

**指针坐标换算**

```ts
const rect = canvas.getBoundingClientRect();
const x = e.clientX - rect.left; // 画布内 CSS 像素坐标
const y = e.clientY - rect.top;
```

**尺寸响应**

```ts
const observer = new ResizeObserver(() => { setupCanvas(canvas); redrawAll(); });
observer.observe(canvas);
// cleanup: observer.disconnect()
```
