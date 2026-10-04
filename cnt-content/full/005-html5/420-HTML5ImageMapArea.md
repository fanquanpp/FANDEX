---
order: 450
title: 专项：图像热区 map 与 area
module: 'html5'
category: 前端技术
difficulty: beginner
description: 在图片上划分可点击区域：map 与 area 的 shape/coords 坐标系统（rect/circle/poly），含坐标计算、hit-testing 原理与可视化示例。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'html5/140-ImagesAndResponsiveImages'
  - 'html5/210-SVG'
  - 'html5/180-Accessibility'
prerequisites:
  - 'html5/140-ImagesAndResponsiveImages'
---

## 0. 学习目标（可验证）

- [ ] 能写出 `usemap` + `<map>` + `<area>` 的最小可用结构
- [ ] 能说出 rect、circle、poly 三种 shape 的 coords 格式
- [ ] 能解释「图片被 CSS 缩放后热区为什么会错位」以及出路
- [ ] 能给一张图片手工估算并验证一个矩形热区

## 1. 一句话理解

> 图像热区 = 在图片上「画看不见的点击区域」。低频，但做信息图、地图、示意图时，比切图或叠按钮更省事。

## 2. 基本结构

```html
<img src="diagram.png" alt="架构示意图" usemap="#arch-map" />

<map name="arch-map">
  <area shape="rect" coords="10,10,120,90" href="frontend.html" alt="前端模块" />
  <area shape="circle" coords="200,50,40" href="backend.html" alt="后端模块" />
  <area shape="poly" coords="300,10,360,40,340,90,290,70" href="ops.html" alt="运维模块" />
</map>
```

要点：

- `<img>` 加 `usemap="#名字"`，`<map name="名字">` 必须同名；
- `<area>` 与 `<a>` 类似：`href`、`alt`、`target`、`rel` 都支持；
- 每个热区必须写 `alt`（读屏用户需要知道这块区域去哪）。

## 3. 坐标系统

坐标以图片左上角为原点，单位是像素：

| shape | coords 格式 | 含义 |
| --- | --- | --- |
| `rect` | `x1,y1,x2,y2` | 左上角 + 右下角 |
| `circle` | `cx,cy,r` | 圆心 + 半径 |
| `poly` | `x1,y1,x2,y2,...` | 依次连接的多边形顶点 |
| `default` | 不写 coords | 覆盖图片剩余全部区域 |

坐标示意（300x200 的图片）：

```svg
<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="120" height="90" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="18" y="24" font-size="10" fill="#2563eb">rect 10,10,130,100</text>
  <circle cx="200" cy="50" r="40" fill="none" stroke="#16a34a" stroke-width="2"/>
  <text x="188" y="52" font-size="10" fill="#16a34a">circle 200,50,40</text>
  <polygon points="300,10 360,40 340,90 290,70" fill="none" stroke="#dc2626" stroke-width="2"/>
  <text x="292" y="108" font-size="10" fill="#dc2626">poly 四顶点</text>
</svg>
```

**坐标怎么取：** 在图片编辑工具（或浏览器 F12 的 Elements 面板选中 img 后看尺寸）里读像素值，或用画图工具光标位置换算；验证阶段把 coords 写进代码，点击热区边缘确认没有偏差。

## 4. 底层原理：hit-testing 与坐标基准

**点击命中的判定（hit-testing）由浏览器在渲染层完成**：用户点击时，浏览器把点击位置换算成图片内容坐标，逐一与各 `area` 的几何形状做「点在矩形/圆/多边形内」测试，命中即触发跳转——重叠热区按 DOM 顺序取先命中的。这意味着热区是**几何层**的概念，看不见也无需任何 CSS。

两个由机制直接推出的结论：

- **坐标基准是图片的固有尺寸（像素），不是 CSS 显示尺寸**。CSS 把 300px 宽的图显示成 600px 时，点击位置换算回内容坐标仍按固有尺寸算，现代浏览器会等比缩放命中区域，但老实现与混合缩放场景常出现偏差——这就是「响应式布局里热区错位」的根源。稳妥做法：使用热区的图片**不要随意缩放**，或改用 SVG 方案；
- **`usemap` 按名字引用 `map`**：老规范要求 `name`，现代浏览器同时支持 `name` 与 `id`。一张 `map` 可以被多张 `img` 复用（同名 `usemap`），这是「同一张导航图多处出现」时的省事写法。

## 5. 使用时机与替代方案

| 场景 | 建议 |
| --- | --- |
| 静态信息图/组织结构图 | map + area 合适，零依赖 |
| 复杂地图或需要缩放的图 | 优先 SVG（矢量、可缩放、可样式化） |
| 需要悬停高亮的区域 | SVG 或叠 div 更灵活 |
| 响应式图片热区 | 坐标是像素绝对值，缩放会失配；响应式场景用 SVG 或 JS 重算 |

**与相邻方案的对比**：SVG 里每个形状天然是 DOM 元素，可直接绑事件、写 CSS、被读屏朗读，是交互图形的「正解」；`clip-path` 裁剪的是**元素自身的可点击与可见区域**，适合「给一张图剪出异形按钮」，但没有多区域跳转语义；canvas 是像素画布，命中要自己算（`isPointInPath`）。map + area 的独特价值是**零 JS、零 SVG 知识**就能给一张位图划分跳转区域。

## 6. 面试题思路

**「图片被 CSS 缩放后图像热区还能对准吗？」** 先答机制（坐标基准是固有尺寸、命中换算由浏览器完成），再说边界（现代浏览器多数会等比换算，但混合缩放与老内核不可靠），给结论（严肃场景不用缩放位图热区，改 SVG）。这题考「从机制推导行为」而不是背 API。

**「map/area、SVG、clip-path 三者怎么选？」** 按需求维度拆：多区域跳转 + 零依赖 + 静态图 → map/area；需要样式、动画、缩放、无障碍 → SVG；单个元素的异形裁剪 → clip-path。能说出「SVG 形状是 DOM、天然可访问」这层对比是加分项。

## 7. 动手试试

先看任务与提示，自己算完再看参考实现。

### 入门版

1. 用一张 400x300 的图片，划分一个矩形热区，点击验证跳转；
2. 加一个圆形热区，确认半径取值正确。

### 进阶版

1. 用 poly 给一个五边形区域画热区，画出顶点坐标并验证；
2. 把同一张图换成响应式（`srcset`），思考热区失配问题，再用 SVG 方案重做对比。

参考实现（任务 1，含坐标推算过程）：

```text
目标：在 400x300 图片的左上角划一个「首页」矩形热区。
推算：用画图工具读像素——区块左上角 (20,15)，右下角 (150,80)。
写法：coords="20,15,150,80"（x1,y1,x2,y2 顺序，不要写成宽高）。
验证：点击 (21,16) 应命中，点击 (19,15) 不应命中——边缘各点试一圈。
```

```html
<img src="plan.png" alt="楼层平面图" width="400" height="300" usemap="#plan" />
<map name="plan">
  <area shape="rect" coords="20,15,150,80" href="home.html" alt="首页入口" />
</map>
```

自检：`coords` 里第二个坐标对是「右下角坐标」还是「宽高」？写反了热区会怎么偏？（右下角坐标；写反会把宽高当成对角点，热区偏小且位置错。）

## 8. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 热区点击无反应 | `usemap` 与 `map name` 不一致，或图片被缩放 | 核对名字一致；非响应式场景固定图片尺寸 |
| 热区位置偏差 | 图片实际显示尺寸与坐标基准不一致 | 用图片的实际渲染尺寸（含 CSS 缩放）重算，或换 SVG |
| 忘了写 alt | 热区对读屏用户不可见 | 每个 area 写描述性 alt |
| 用 map 做响应式热区 | 坐标是绝对像素 | 响应式需求换 SVG 或按钮叠加 |
| 多个热区重叠时行为意外 | 重叠区域按 DOM 顺序命中 | 安排 area 顺序：小而具体的写在前面 |

## 9. 下一步

图像热区之后，下一篇专项是 `430-HTML5DialogPopoverGuide`：dialog 与 popover 两个现代交互组件；最后以 `440-HTMLNewElementsAndCapabilities` 速览 2023-2025 的新元素与新能力。回到主线后，可以把 `370-HTML5FormProjectExample` 综合项目作为最终检验。
