---
order: 430
title: 专项：图像热区 map 与 area
module: 'html5'
category: 前端技术
difficulty: beginner
description: 在图片上划分可点击区域：map 与 area 的 shape/coords 坐标系统（rect/circle/poly），含坐标计算与可视化示例。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/020-ImageResponsiveImage'
prerequisites:
  - 'html5/020-ImageResponsiveImage'
---

## 0. 学习目标（可验证）

- [ ] 能写出 `usemap` + `<map>` + `<area>` 的最小可用结构
- [ ] 能说出 rect、circle、poly 三种 shape 的 coords 格式
- [ ] 能给一张图片手工估算并验证一个矩形热区

## 1. 一句话理解

> 图像热区 = 在图片上"画看不见的点击区域"。低频，但做信息图、地图、示意图时，比切图或叠按钮更省事。

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

## 4. 使用时机与替代方案

| 场景 | 建议 |
| --- | --- |
| 静态信息图/组织结构图 | map + area 合适，零依赖 |
| 复杂地图或需要缩放的图 | 优先 SVG（矢量、可缩放、可样式化） |
| 需要悬停高亮的区域 | SVG 或叠 div 更灵活 |
| 响应式图片热区 | 坐标是像素绝对值，缩放会失配；响应式场景用 SVG 或 JS 重算 |

## 5. 动手试试

### 入门版

1. 用一张 400x300 的图片，划分一个矩形热区，点击验证跳转；
2. 加一个圆形热区，确认半径取值正确。

### 进阶版

1. 用 poly 给一个五边形区域画热区，画出顶点坐标并验证；
2. 把同一张图换成响应式（`srcset`），思考热区失配问题，再用 SVG 方案重做对比。

## 6. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 热区点击无反应 | `usemap` 与 `map name` 不一致，或图片被缩放 | 核对名字一致；非响应式场景固定图片尺寸 |
| 热区位置偏差 | 图片实际显示尺寸与坐标基准不一致 | 用图片的实际渲染尺寸（含 CSS 缩放）重算 |
| 忘了写 alt | 热区对读屏用户不可见 | 每个 area 写描述性 alt |
| 用 map 做响应式热区 | 坐标是绝对像素 | 响应式需求换 SVG 或按钮叠加 |

## 7. 下一步

五篇专项至此闭环：内容模型（037）、废弃标签（038）、dialog/popover（039）、国际化（040）、图像热区（041）。回到主线后，可以把 035 综合项目作为最终检验。
