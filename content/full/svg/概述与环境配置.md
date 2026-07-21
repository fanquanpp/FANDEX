---
order: 10
title: 'SVG 概述与环境配置'
module: svg
category: 'SVG Basics'
difficulty: beginner
description: 'SVG 发展历程、核心特性、与 Canvas/位图对比、嵌入方式与开发环境。'
author: fanquanpp
updated: '2026-07-18'
related:
  - svg/基础语法与文档结构
  - svg/坐标系与viewBox
  - html5/SVG矢量图形
prerequisites:
  - html5/概述与核心特性
---

## 1. 学习目标

本章节对标 MIT 6.831《用户界面设计与实现》、Stanford CS147《人机交互设计》以及 CMU 15-462《计算机图形学》的教学标准,系统构建 SVG 学习者的认知框架。学完本章后,学习者应当能够在 Bloom 教育目标分类法的六个层级上达成下列能力。

### 1.1 Bloom 能力矩阵

| 层级 | 行为动词 | 本章目标能力 | 评估方式 |
| ---- | -------- | ------------ | -------- |
| **Remember** 记忆 | 列举、复述 | 能复述 SVG 的全称、规范制定机构、版本演进时间线 | 选择题、填空题 |
| **Understand** 理解 | 解释、归纳 | 能解释矢量图形与位图的本质差异、SVG 与 Canvas 的描述模型差异 | 概念辨析题 |
| **Apply** 应用 | 使用、实现 | 能在 HTML 中以四种方式嵌入 SVG,并配置基础开发环境 | 实操题 |
| **Analyze** 分析 | 比较、分解 | 能对比 SVG/Canvas/WebGL/PNG 四种图形技术的性能特征与适用场景 | 对比分析题 |
| **Evaluate** 评价 | 评判、推荐 | 能根据业务场景评估 SVG 的技术选型,给出工程化决策建议 | 决策题 |
| **Create** 创造 | 设计、构建 | 能设计一个具备生产级质量的 SVG 工程目录结构与构建流程 | 项目设计题 |

### 1.2 知识图谱前置依赖

```mermaid
graph LR
    A[HTML5 基础] --> B[DOM 与 XML 语法]
    C[CSS 基础] --> D[选择器与样式属性]
    B --> E[SVG 概述与环境配置]
    D --> E
    E --> F[基础语法与文档结构]
    E --> G[坐标系与 viewBox]
    F --> H[基本图形详解]
    G --> H
    F --> I[路径 path 详解]
```

### 1.3 学习路径建议

| 阶段 | 主题 | 目标 | 建议学时 |
| ---- | ---- | ---- | -------- |
| **入门** | 概述、语法、坐标系、基本图形、路径 | 能手写常见几何图形 | 6-8 小时 |
| **进阶** | 文本、渐变、变换、滤镜、蒙版 | 能还原 Figma 视觉稿 | 10-12 小时 |
| **高级** | 动画、JavaScript、性能、图标系统 | 能构建生产级可视化系统 | 15-20 小时 |
| **专家** | 设计系统、跨平台、WebGL 协同 | 能主导 SVG 工程化与架构决策 | 持续迭代 |

### 1.4 本章学习成果清单

完成本章学习后,学习者应当能够产出下列成果:

1. 一份 SVG 与 Canvas/WebGL 的技术选型对比报告
2. 一个可在浏览器中运行的 SVG Hello World 示例
3. 一个基于 SVGO 的 SVG 工程优化脚本
4. 一份覆盖 Figma 导出、SVGO 压缩、Sprite 雪碧图生成的工程化方案

## 2. 历史动机与发展脉络

### 2.1 矢量图形的起源:从 PostScript 到 Web

矢量图形的思想可追溯至 20 世纪 60 年代。1963 年,Ivan Sutherland 在麻省理工学院(MIT)开发了 Sketchpad 系统,这是公认的计算机图形学开山之作,首次实现了基于约束的矢量绘图。1976 年,John Warnock 与 Charles Geschke 在施乐帕克研究中心(Xerox PARC)开发页面描述语言 InterPress,后于 1982 年创立 Adobe 公司并推出 PostScript,奠定了矢量描述的工业标准。

PostScript 的成功启发了 W3C 在 Web 平台引入矢量图形标准。1998 年,Microsoft 提交 VML(Vector Markup Language),Adobe 与 Sun 提交 PGML(Precision Graphics Markup Language),两份提案并行演进促使 W3C 成立 SVG Working Group,于 2001 年发布 SVG 1.0 正式推荐标准。

### 2.2 SVG 规范版本演进

SVG 规范历经二十余年迭代,形成了清晰的版本演进图谱。

| 版本 | 发布年份 | 关键特性 | W3C 状态 | 浏览器支持现状 |
| ---- | -------- | -------- | -------- | -------------- |
| SVG 1.0 | 2001 | 基础图形、路径、文本、变换 | Recommendation | 全平台支持 |
| SVG 1.1 | 2003 | 模块化拆分,引入 SVG Tiny/Basic 子集 | Recommendation | 全平台支持 |
| SVG Tiny 1.2 | 2008 | 移动设备优化,聚焦资源受限场景 | Recommendation | 已废弃 |
| SVG 1.2 Full | - | 计划增加流式音频/视频、DOM Level 3 | 草案废止 | 未实现 |
| SVG 2 | 2018-至今 | 融合 HTML5、CSS Grid、Web Components | Candidate Recommendation | 现代浏览器部分支持 |
| SVG 2.1 | 2024+ | Web Animations API 集成、属性简化 | Working Draft | 实验性支持 |

### 2.3 关键技术决策节点

```mermaid
timeline
    title SVG 关键技术演进
    1998 : VML 与 PGML 双提案
    2001 : SVG 1.0 正式发布
    2003 : SVG 1.1 模块化
    2005 : SVG Tiny 1.2 进入移动端
    2011 : HTML5 将 SVG 纳入规范
    2014 : SVG 2 草案融合 CSS
    2018 : SVG 2 Candidate Recommendation
    2020 : CSS Containment 与 SVG 协同
    2024 : SVG 2.1 Working Draft
```

### 2.4 设计哲学:为什么是 XML

SVG 1.x 选择 XML 作为语法基础,而非自定义二进制格式,这一决策源于三方面权衡:

1. **可读性与可编辑性**:XML 文本格式让开发者能直接用文本编辑器阅读与修改,降低调试门槛
2. **DOM 互操作性**:XML 与 HTML DOM 自然衔接,使 SVG 元素成为真实 DOM 节点,支持事件绑定与 CSS 样式化
3. **工具链生态**:XML 拥有成熟的解析、校验、变换(XSLT)工具链,加速生态成熟

SVG 2 虽保留 XML 语法,但允许 HTML 解析器宽松解析内联 SVG,降低了对严格 XML 语法的依赖。

### 2.5 与同期技术的关系

| 技术 | 出现时间 | 定位 | 与 SVG 关系 |
| ---- | -------- | ---- | ------------ |
| Flash | 1996 | 矢量动画与富媒体 | 已退出历史舞台,SVG 接替其位置 |
| VML | 1998 | Microsoft 矢量格式 | 已废弃,被 SVG 统一 |
| Canvas | 2005 | 位图实时绘制 | 互补关系,各自适合不同场景 |
| WebGL | 2011 | GPU 加速 3D 绘制 | 高端场景互补,SVG 不擅长 3D |
| WebGPU | 2023+ | 现代图形 API | 高性能场景,SVG 不参与竞争 |

## 3. 形式化定义

### 3.1 SVG 的规范定义

依据 W3C SVG 1.1 规范第 1 章,SVG 的形式化定义如下:

> SVG 是一种用于描述二维矢量图形的 XML 应用,其全称为 Scalable Vector Graphics(可缩放矢量图形)。SVG 支持三种类型的图形对象:矢量图形(由路径、直线、曲线组成的几何形状)、图像、文本。图形对象可被分组、样式化、变换与组合,并支持动画与交互。

### 3.2 形式化数学模型

从数学视角,SVG 描述的是一个有限维欧氏空间 $\mathbb{R}^2$ 中的图形对象集合。设 $S$ 为 SVG 文档,则 $S$ 可形式化定义为:

$$
S = \langle E, T, P, A \rangle
$$

其中:

- $E = \{e_1, e_2, \dots, e_n\}$ 为元素(element)有限集合
- $T: E \to E \cup \{\bot\}$ 为元素间的树形包含关系
- $P: E \to \text{Attr}$ 为属性(attribute)赋值函数
- $A: E \to \text{Anim}$ 为动画绑定函数

### 3.3 坐标系统的形式化

SVG 坐标系建立在二维欧氏空间上,以左上角为原点,X 轴向右递增,Y 轴向下递增。这与数学中笛卡尔坐标系 Y 轴向上相反,源于屏幕扫描的历史约定。

设 $p = (x, y) \in \mathbb{R}^2$ 为坐标系中一点,则其变换遵循仿射变换:

$$
\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix}
=
\begin{bmatrix}
a & c & e \\
b & d & f \\
0 & 0 & 1
\end{bmatrix}
\begin{bmatrix} x \\ y \\ 1 \end{bmatrix}
$$

其中变换矩阵 $M = \begin{bmatrix} a & c & e \\ b & d & f \\ 0 & 0 & 1 \end{bmatrix}$ 包含六个自由度,可表达平移(translate)、旋转(rotate)、缩放(scale)、倾斜(skew)等仿射变换。详细推导见第 4 章及《变换 transform》章节。

### 3.4 W3C 标准体系定位

SVG 在 W3C 标准体系中归属于**图形与渲染**(Graphics and Rendering)工作组,与下列规范协同:

| 规范 | 关系 | 协同内容 |
| ---- | ---- | -------- |
| HTML Living Standard | 嵌入与解析 | HTML5 将 SVG 作为外来内容(foreign content)支持 |
| CSS Snapshot | 样式与动画 | SVG 元素支持大量 CSS 属性 |
| DOM Standard | 脚本编程 | SVG 元素实现 SVGDOM 接口 |
| Web Animations | 动画模型 | SVG 2 与 Web Animations API 对齐 |
| ARIA 1.2 | 可访问性 | SVG 元素支持 ARIA 角色 |
| CSS Color 4 | 颜色定义 | SVG 支持 OKLCH、color() 等新颜色函数 |

### 3.5 SVG 命名空间的形式化

SVG 命名空间 URI 为 `http://www.w3.org/2000/svg`,其形式化定义为:

$$
\text{NS}_{\text{SVG}} = \text{URIRef}(\text{"http://www.w3.org/2000/svg"})
$$

在 XML 文档中,命名空间通过 `xmlns` 属性声明,用于消除元素名冲突。独立 .svg 文件必须声明 SVG 命名空间,内联在 HTML 中的 SVG 则由 HTML 解析器自动处理命名空间。

## 4. 理论推导与原理解析

### 4.1 矢量描述与位图采样的本质区别

位图图像通过对连续信号 $f(x, y)$ 在离散网格点采样得到:

$$
I[i, j] = f(i \cdot \Delta x, j \cdot \Delta y), \quad i \in [0, W), j \in [0, H)
$$

其中 $\Delta x, \Delta y$ 为采样间隔,$W, H$ 为图像分辨率。当放大显示时,采样点不足导致锯齿(aliasing)现象。

矢量图形则用参数方程描述图形,例如圆 $C$ 可表示为:

$$
C: \begin{cases}
x(t) = c_x + r \cos t \\
y(t) = c_y + r \sin t
\end{cases}, \quad t \in [0, 2\pi)
$$

放大时只需重新参数化,采样密度由显示设备决定,因此任意缩放下保持锐利。

### 4.2 SVG 描述模型:保留模式 vs 立即模式

SVG 采用**保留模式**(retained mode)绘图:浏览器维护一棵图形场景树,应用层只声明图形对象,渲染时机由浏览器决定。Canvas 采用**立即模式**(immediate mode):应用层主动调用绘图命令,浏览器不保留场景状态。

两种模式的性能特征可形式化分析。设场景含 $n$ 个图元,每帧更新 $k$ 个:

- **保留模式(SVG)**:每次更新开销 $O(k)$,但浏览器需维护完整场景,内存开销 $O(n)$
- **立即模式(Canvas)**:每帧重绘开销 $O(n)$,内存开销 $O(1)$

因此 $n$ 较小时 SVG 性能更优,$n$ 较大时 Canvas 性能更优,交叉点通常在 $n \approx 1000 \sim 5000$,具体取决于图元复杂度与浏览器实现。

### 4.3 SVG 渲染管线

SVG 渲染管线可抽象为五个阶段:

```mermaid
flowchart LR
    A[XML 解析] --> B[DOM 树构建]
    B --> C[样式计算]
    C --> D[布局与变换]
    D --> E[光栅化与合成]
    E --> F[屏幕显示]
```

每个阶段的开销分析:

| 阶段 | 时间复杂度 | 主要开销 |
| ---- | ---------- | -------- |
| XML 解析 | $O(L)$, $L$ 为文档长度 | 字符串扫描与 token 化 |
| DOM 构建 | $O(n)$ | 节点分配与父子链接 |
| 样式计算 | $O(n \cdot m)$, $m$ 为属性数 | 属性继承与 CSS 计算 |
| 布局与变换 | $O(n)$ | 仿射矩阵复合与坐标映射 |
| 光栅化 | $O(A)$, $A$ 为像素数 | 几何采样与抗锯齿 |

### 4.4 仿射变换的复合

多个变换的复合遵循矩阵乘法。设 $T_1, T_2$ 为两个仿射变换,其复合 $T = T_2 \circ T_1$ 表示先应用 $T_1$ 再应用 $T_2$:

$$
T = T_2 \cdot T_1
=
\begin{bmatrix}
a_2 & c_2 & e_2 \\
b_2 & d_2 & f_2 \\
0 & 0 & 1
\end{bmatrix}
\begin{bmatrix}
a_1 & c_1 & e_1 \\
b_1 & d_1 & f_1 \\
0 & 0 & 1
\end{bmatrix}
=
\begin{bmatrix}
a_2 a_1 + c_2 b_1 & a_2 c_1 + c_2 d_1 & a_2 e_1 + c_2 f_1 + e_2 \\
b_2 a_1 + d_2 b_1 & b_2 c_1 + d_2 d_1 & b_2 e_1 + d_2 f_1 + f_2 \\
0 & 0 & 1
\end{bmatrix}
$$

矩阵乘法**不可交换**:$T_1 \cdot T_2 \neq T_2 \cdot T_1$。这解释了为何 `transform="translate(100,0) rotate(45)"` 与 `transform="rotate(45) translate(100,0)"` 在 SVG 中渲染结果不同。

### 4.5 SVG 路径长度的微分定义

SVG `<path>` 的几何长度通过曲线积分计算。设路径参数化为 $\gamma(t) = (x(t), y(t)), t \in [0, 1]$,则其长度为:

$$
L = \int_0^1 \sqrt{\left(\frac{dx}{dt}\right)^2 + \left(\frac{dy}{dt}\right)^2} \, dt
$$

对于三次贝塞尔曲线 $B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3$,其导数为:

$$
B'(t) = 3(1-t)^2 (P_1 - P_0) + 6(1-t) t (P_2 - P_1) + 3 t^2 (P_3 - P_2)
$$

该积分无解析解,需通过数值积分(如高斯-勒让德求积)计算。浏览器 `getTotalLength()` API 即采用此方法。

## 5. 代码示例

### 5.1 第一个 SVG:Hello World

下面是一个具备生产级质量的 SVG Hello World 示例,符合 SVG 2 规范:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SVG Hello World - FANDEX</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8f9fa;
      }
      .svg-container {
        max-width: 480px;
        margin: 0 auto;
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    </style>
  </head>
  <body>
    <div class="svg-container">
      <svg
        width="240"
        height="120"
        viewBox="0 0 240 120"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="hello-title hello-desc"
      >
        <title id="hello-title">Hello SVG 示例</title>
        <desc id="hello-desc">带渐变背景与居中文字的 SVG 卡片</desc>

        <defs>
          <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4f5bd5" />
            <stop offset="100%" stop-color="#00b894" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="240" height="120" rx="12" fill="url(#brandGrad)" />

        <text
          x="120"
          y="65"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#ffffff"
          font-size="20"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
          font-weight="600"
        >
          Hello SVG
        </text>
      </svg>
    </div>
  </body>
</html>
```

**要点解析**:

- `xmlns` 命名空间在独立 SVG 文件中必需,内联在 HTML 中可省略
- `<defs>` 存放可复用定义,不会直接渲染
- `url(#id)` 引用 defs 中的渐变、滤镜等资源
- `role="img"` 与 `aria-labelledby` 提供可访问性语义

### 5.2 独立 SVG 文件

生产环境常将 SVG 作为独立 .svg 文件使用,需严格遵循 XML 规范:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width="24"
  height="24"
  role="img"
  aria-label="关闭图标"
>
  <title>关闭</title>
  <path
    d="M6 6 L18 18 M18 6 L6 18"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  />
</svg>
```

注意独立文件中:

1. 必须有 XML 声明 `<?xml version="1.0" encoding="UTF-8"?>`
2. 必须声明 `xmlns="http://www.w3.org/2000/svg"` 命名空间
3. 属性值必须用双引号包裹,不能省略
4. 标签必须严格闭合,自闭合标签需以 `/>` 结尾

### 5.3 四种嵌入方式完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>SVG 四种嵌入方式对比</title>
    <style>
      /* 方式三:CSS 背景图 */
      .hero-bg {
        width: 200px;
        height: 80px;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><rect width="200" height="80" fill="%234f5bd5"/></svg>');
        background-size: cover;
        border-radius: 8px;
      }

      /* 方式一:内联 SVG 可被外部 CSS 控制 */
      .inline-svg {
        width: 100px;
        height: 100px;
      }
      .inline-svg circle {
        fill: #d63031;
        transition: fill 0.3s ease;
      }
      .inline-svg:hover circle {
        fill: #00b894;
      }
    </style>
  </head>
  <body>
    <h2>方式一:内联 SVG(推荐)</h2>
    <svg class="inline-svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" />
    </svg>

    <h2>方式二:img 标签引用</h2>
    <img src="logo.svg" alt="Logo" width="200" height="100" />

    <h2>方式三:CSS 背景图</h2>
    <div class="hero-bg"></div>

    <h2>方式四:object 嵌入</h2>
    <object data="diagram.svg" type="image/svg+xml" width="400" height="300">
      <p>您的浏览器不支持 SVG,请升级到现代浏览器。</p>
    </object>
  </body>
</html>
```

### 5.4 生产级 SVG 工程目录结构

```text
fandex-svg-system/
├── src/
│   ├── icons/                    原始图标 SVG
│   │   ├── arrow-left.svg
│   │   └── arrow-right.svg
│   ├── illustrations/            插画 SVG
│   ├── logos/                    品牌 Logo SVG
│   └── patterns/                 纹理图案
├── optimized/                    SVGO 优化后输出
│   ├── icons/
│   └── ...
├── sprites/                      雪碧图(symbol 模式)
│   └── icon-sprite.svg
├── dist/                         构建产物
│   ├── icon-font/                 图标字体
│   └── react-components/         React 组件
├── scripts/
│   ├── optimize.mjs              SVGO 优化脚本
│   ├── sprite.mjs                雪碧图生成脚本
│   └── validate.mjs              SVG 校验脚本
├── .svgo.config.mjs              SVGO 配置
├── package.json
└── README.md
```

### 5.5 SVGO 优化脚本示例

```javascript
// scripts/optimize.mjs
import { optimize } from 'svgo';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { glob } from 'node:fs/promises';

const config = {
  plugins: [
    'preset-default',
    'removeDimensions',
    'removeXMLNS',
    'sortAttrs',
    'convertColors',
    {
      name: 'removeAttrs',
      params: { attrs: ['class', 'data-name'] }
    }
  ]
};

async function optimizeSvg(inputPath, outputPath) {
  const svg = await readFile(inputPath, 'utf8');
  const result = optimize(svg, { path: inputPath, ...config });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.data, 'utf8');
  const before = Buffer.byteLength(svg);
  const after = Buffer.byteLength(result.data);
  const saved = ((before - after) / before * 100).toFixed(1);
  console.log(`${relative('.', inputPath)} -> ${relative('.', outputPath)} (节省 ${saved}%)`);
}

const files = await glob('src/**/*.svg');
await Promise.all(
  files.map(file => {
    const out = file.replace(/^src\//, 'optimized/');
    return optimizeSvg(file, out);
  })
);
```

### 5.6 SVG 校验脚本

```javascript
// scripts/validate.mjs
import { readFile } from 'node:fs/promises';

const REQUIRED_ATTRS = ['viewBox'];
const FORBIDDEN_ATTRS = ['width', 'height'];

async function validateSvg(filePath) {
  const content = await readFile(filePath, 'utf8');
  const errors = [];

  if (!content.startsWith('<?xml')) {
    errors.push('缺少 XML 声明');
  }

  if (!content.includes('xmlns="http://www.w3.org/2000/svg"')) {
    errors.push('缺少 SVG 命名空间声明');
  }

  for (const attr of REQUIRED_ATTRS) {
    if (!content.includes(`${attr}=`)) {
      errors.push(`缺少必需属性:${attr}`);
    }
  }

  for (const attr of FORBIDDEN_ATTRS) {
    const regex = new RegExp(`\\s${attr}="`);
    if (regex.test(content)) {
      errors.push(`包含禁止属性:${attr}(应通过 viewBox + CSS 控制尺寸)`);
    }
  }

  return { filePath, errors };
}

const files = process.argv.slice(2);
const results = await Promise.all(files.map(validateSvg));
const failed = results.filter(r => r.errors.length > 0);

if (failed.length > 0) {
  console.error('校验失败:');
  failed.forEach(f => {
    console.error(`  ${f.filePath}:`);
    f.errors.forEach(e => console.error(`    - ${e}`));
  });
  process.exit(1);
} else {
  console.log(`✓ 所有 ${files.length} 个 SVG 校验通过`);
}
```

## 6. 对比分析

### 6.1 SVG vs Canvas vs WebGL vs PNG 图标字体

| 维度 | SVG | Canvas | WebGL | PNG | Icon Font |
| ---- | --- | ------ | ----- | --- | --------- |
| **描述方式** | 矢量(保留模式) | 位图(立即模式) | 位图(立即模式) | 位图(光栅) | 字体 |
| **DOM 节点** | 每个图形都是 DOM 元素 | 单一 canvas 元素 | 单一 canvas 元素 | img 元素 | 文本元素 |
| **事件绑定** | 直接绑定到子元素 | 需自行做命中检测 | 需自行做命中检测 | 仅 img 级别 | 仅文本级别 |
| **缩放表现** | 无损缩放 | 放大后锯齿明显 | 放大后锯齿明显 | 放大后锯齿明显 | 无损(矢量字体) |
| **性能特征** | 元素多时(>1000)下降 | 元素数量影响小 | 性能最高 | 渲染快,无运行时开销 | 渲染快 |
| **动画支持** | SMIL/CSS/DOM | requestAnimationFrame | 着色器 | 帧序列 | CSS 动画 |
| **文本可访问性** | 原生支持 | 需额外处理 | 需额外处理 | 需 alt | 依赖字体 |
| **样式控制** | 完整 CSS 支持 | 仅 canvas 元素本身 | 仅 canvas 元素本身 | 仅 img 属性 | 仅字体属性 |
| **文件大小** | 小(文本格式) | N/A(动态绘制) | N/A | 大(光栅数据) | 小(字体文件) |
| **适用场景** | 图标、图表、UI、数据可视化 | 游戏、图像处理、粒子 | 3D 游戏、复杂可视化 | 照片、复杂图像 | 图标系统 |
| **学习曲线** | 中(XML + CSS) | 中(命令式 API) | 高(着色器、矩阵) | 低 | 中(字体工具链) |
| **浏览器支持** | 全平台 | 全平台 | 现代浏览器 | 全平台 | 全平台 |

### 6.2 性能基准测试参考数据

下列数据基于 Chrome 120、MacBook Pro M1,渲染 1000 个圆形图元:

| 技术 | 首屏渲染 | 每帧更新 | 内存占用 |
| ---- | -------- | -------- | -------- |
| SVG(内联) | 120ms | 8ms | 12MB |
| SVG(use+symbol) | 80ms | 5ms | 8MB |
| Canvas 2D | 30ms | 2ms | 4MB |
| WebGL | 15ms | 1ms | 6MB |

数据表明:SVG 在 1000 元素级别仍可接受,但 10000 元素级别应迁移至 Canvas 或 WebGL。

### 6.3 选型决策树

```mermaid
flowchart TD
    A[图形需求] --> B{需要 3D?}
    B -- 是 --> C[WebGL]
    B -- 否 --> D{元素数量 > 5000?}
    D -- 是 --> E[Canvas 2D]
    D -- 否 --> F{需要交互/可访问性?}
    F -- 是 --> G[SVG]
    F -- 否 --> H{需要无损缩放?}
    H -- 是 --> G
    H -- 否 --> I{是照片?}
    I -- 是 --> J[PNG/WebP]
    I -- 否 --> K{是图标系统?}
    K -- 是 --> L[SVG 或 Icon Font]
    K -- 否 --> G
```

### 6.4 工程化成本对比

| 维度 | SVG | Canvas | WebGL |
| ---- | --- | ------ | ----- |
| 初始开发成本 | 低 | 中 | 高 |
| 维护成本 | 低 | 中 | 高 |
| 调试难度 | 低(可 DOM 检查) | 中(需截图) | 高(需 GPU 调试) |
| 团队学习成本 | 低(XML+CSS) | 中(命令式) | 高(着色器、矩阵) |
| 工具链成熟度 | 高(Figma/SVGO) | 中(Canvas API) | 低(Three.js 等) |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1:忘记声明 viewBox

```html
<!-- 错误:仅有 width/height,响应式缩放后变形 -->
<svg width="24" height="24">
  <circle cx="12" cy="12" r="10" />
</svg>

<!-- 正确:声明 viewBox,由 CSS 控制尺寸 -->
<svg viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" />
</svg>
```

**最佳实践**:图标 SVG 始终声明 viewBox,通过 CSS 控制实际显示尺寸。

### 7.2 陷阱 2:小数坐标导致抗锯齿模糊

```html
<!-- 模糊:1px 描边落在 .5 坐标 -->
<line x1="0" y1="10.5" x2="100" y2="10.5" stroke="#000" stroke-width="1" />

<!-- 清晰:整数坐标 + 0.5 偏移技巧(1px 锐利描边) -->
<line x1="0" y1="10.5" x2="100" y2="10.5" stroke="#000" stroke-width="1" shape-rendering="crispEdges" />
```

**最佳实践**:对 1px 描边使用 `shape-rendering="crispEdges"`,对一般场景保持默认抗锯齿。

### 7.3 陷阱 3:过多 DOM 元素导致性能问题

```html
<!-- 错误:10000 个独立 circle 元素 -->
<svg viewBox="0 0 1000 1000">
  <!-- 10000 个 <circle>,渲染极慢 -->
</svg>

<!-- 正确:使用 Canvas 或合并 path -->
<svg viewBox="0 0 1000 1000">
  <path d="M10 10 ..." fill="#4f5bd5" />
</svg>
```

**最佳实践**:SVG 元素数量控制在 5000 以内,超出考虑 Canvas/WebGL 或 path 合并。

### 7.4 陷阱 4:外部 CSS 无法作用于 img 引用的 SVG

```html
<!-- 无效:img 引用的 SVG 内部无法被外部 CSS 控制 -->
<img src="icon.svg" class="icon" />
<style>
  .icon path {
    fill: red; /* 不生效 */
  }
</style>

<!-- 正确:使用内联 SVG 或 CSS 变量 -->
<svg class="icon" viewBox="0 0 24 24">
  <path fill="currentColor" d="..." />
</svg>
```

### 7.5 陷阱 5:z-index 在 SVG 中无效

SVG 元素绘制顺序由文档顺序决定,**不支持 z-index**。

```html
<!-- 错误:z-index 不生效 -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="red" style="z-index: 2;" />
  <rect x="40" y="40" width="20" height="20" fill="blue" />
</svg>

<!-- 正确:调整 DOM 顺序 -->
<svg viewBox="0 0 100 100">
  <rect x="40" y="40" width="20" height="20" fill="blue" />
  <circle cx="50" cy="50" r="40" fill="red" />
</svg>
```

### 7.6 浏览器兼容性最佳实践

| 特性 | Chrome | Firefox | Safari | Edge | 兼容策略 |
| ---- | ------ | ------- | ------ | ---- | -------- |
| SVG 2 核心子集 | 90+ | 88+ | 14+ | 90+ | 直接使用 |
| `href`(替代 `xlink:href`) | 88+ | 85+ | 13+ | 88+ | 优先 href |
| CSS `mask` 在 SVG 中 | 120+ | 53+ | 13.1+ | 120+ | 加前缀 |
| `path()` CSS 函数 | 88+ | - | - | 88+ | 渐进增强 |
| SMIL 动画 | 全部 | 全部 | 全部 | 全部 | Chrome 曾废弃但恢复 |

### 7.7 可访问性最佳实践

```html
<svg viewBox="0 0 100 100" role="img" aria-labelledby="title-id desc-id">
  <title id="title-id">2024 年度销售额</title>
  <desc id="desc-id">柱状图展示四个季度的销售额对比,Q3 达到峰值 210 万</desc>
  <!-- 图形内容 -->
</svg>
```

**要点**:

1. 装饰性 SVG 使用 `aria-hidden="true"`
2. 交互性 SVG 必须提供 `role`、`aria-label` 或 `<title>`/`<desc>`
3. 焦点元素需添加 `tabindex="0"`
4. 文字内容优先用 SVG `<text>` 元素而非位图

### 7.8 性能优化清单

- [ ] 使用 SVGO 压缩 SVG 文件,通常可减小 30-70% 体积
- [ ] 合并相似 path,减少 DOM 节点数
- [ ] 使用 `<use>` 引用复用元素
- [ ] 复杂图形用 `transform` 而非坐标重写
- [ ] 大量动画优先用 CSS 而非 SMIL
- [ ] 静态 SVG 用 `will-change="transform"` 提示浏览器
- [ ] 图标用 `<symbol>` + `<use>` 雪碧图模式
- [ ] 避免 `<filter>` 过度使用,渲染开销大

## 8. 工程实践

### 8.1 构建工具集成

#### 8.1.1 Vite + SVGO

```javascript
// vite.config.mjs
import { defineConfig } from 'vite';
import { optimize } from 'svgo';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    {
      name: 'svg-optimize',
      transform(code, id) {
        if (id.endsWith('.svg')) {
          const result = optimize(code, {
            plugins: ['preset-default', 'removeDimensions']
          });
          return { code: `export default ${JSON.stringify(result.data)}` };
        }
      }
    }
  ]
});
```

#### 8.1.2 Webpack + svg-sprite-loader

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'svg-sprite-loader',
            options: {
              symbolId: 'icon-[name]'
            }
          },
          {
            loader: 'svgo-loader',
            options: {
              plugins: ['preset-default', 'removeDimensions']
            }
          }
        ]
      }
    ]
  }
};
```

#### 8.1.3 Rollup + vite-plugin-svg

```javascript
// rollup.config.mjs
import svg from 'vite-plugin-svg';
import { defineConfig } from 'rollup';

export default defineConfig({
  plugins: [
    svg({
      optimize: true,
      svgoConfig: {
        plugins: ['preset-default', 'removeDimensions']
      }
    })
  ]
});
```

### 8.2 调试工具

#### 8.2.1 浏览器开发者工具

Chrome DevTools 的 Elements 面板可直接编辑 SVG 属性并实时预览,是调试 SVG 的首选方式。

| 面板 | 用途 |
| ---- | ---- |
| Elements | 编辑 SVG 属性、查看 DOM 树 |
| Console | 通过 `$0` 访问选中元素 |
| Performance | 分析 SVG 渲染性能 |
| Rendering | 高亮重绘区域、显示 FPS |

#### 8.2.2 在线工具

- **SVGOMG**(https://jakearchibald.github.io/svgomg/):SVGO 在线可视化优化工具
- **SVG-Edit**(https://github.com/SVG-Edit/svgedit):浏览器内 SVG 编辑器
- **SVGOMG Diff**:对比优化前后差异

### 8.3 设计工具集成

#### 8.3.1 Figma 导出 SVG

Figma 是当前主流的 SVG 设计工具,导出时建议:

1. 选中图层 → 右键 "Copy as SVG"
2. 在设置中启用 "Outline text" 将文字转为路径
3. 启用 "Include id attribute" 便于后续操作
4. 关闭 "Simplify stroke" 保留原始路径

#### 8.3.2 Adobe Illustrator 导出

文件 → 导出 → 导出为 → 选择 SVG,推荐配置:

| 选项 | 推荐值 | 原因 |
| ---- | ------ | ---- |
| SVG Profiles | SVG 1.1 | 兼容性最佳 |
| Fonts | Convert to outline | 避免字体缺失 |
| Decimal places | 2 | 精度与体积平衡 |
| Minification | 启用 | 减小体积 |

#### 8.3.3 Inkscape 命令行导出

```bash
# 批量转换 .ai 为优化 .svg
inkscape --export-type=svg --export-plain-svg input.ai
svgo input.svg -o optimized.svg
```

### 8.4 SVG 雪碧图生成

```javascript
// scripts/sprite.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { basename, extname } from 'node:path';

async function generateSprite() {
  const files = await glob('optimized/icons/*.svg');
  const symbols = [];

  for (const file of files) {
    const name = basename(file, extname(file));
    const content = await readFile(file, 'utf8');
    // 提取 <svg> 内部内容,转为 <symbol>
    const inner = content.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
    symbols.push(
      `<symbol id="icon-${name}" viewBox="${viewBox}">${inner}</symbol>`
    );
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${symbols.join('\n')}
</svg>`;

  await mkdir('sprites', { recursive: true });
  await writeFile('sprites/icon-sprite.svg', sprite, 'utf8');
  console.log(`✓ 生成 ${symbols.length} 个图标的雪碧图`);
}

generateSprite();
```

使用方式:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 在 body 开头引入雪碧图 -->
  </head>
  <body>
    <svg style="display:none">
      <symbol id="icon-home" viewBox="0 0 24 24">
        <path d="..." />
      </symbol>
    </svg>

    <!-- 使用图标 -->
    <svg width="24" height="24">
      <use href="#icon-home" />
    </svg>
  </body>
</html>
```

### 8.5 React 组件自动生成

```javascript
// scripts/generate-react.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { paramCase } from 'change-case';

async function generateReactComponents() {
  const files = await glob('optimized/icons/*.svg');
  const components = [];

  for (const file of files) {
    const name = basename(file, extname(file));
    const componentName = `Icon${name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
    const content = await readFile(file, 'utf8');
    // 移除 svg 标签,保留内部
    const inner = content.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

    const code = `import React from 'react';

export const ${componentName} = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      ${inner}
    </svg>
  )
);
${componentName}.displayName = '${componentName}';
`;
    await mkdir('dist/react-components', { recursive: true });
    await writeFile(`dist/react-components/${componentName}.tsx`, code, 'utf8');
    components.push(componentName);
  }

  // 生成 index.ts
  const indexCode = components
    .map(c => `export { ${c} } from './${c}';`)
    .join('\n');
  await writeFile('dist/react-components/index.ts', indexCode, 'utf8');
}

generateReactComponents();
```

### 8.6 CI/CD 集成

```yaml
# .github/workflows/svg-pipeline.yml
name: SVG Pipeline
on:
  push:
    paths: ['src/**/*.svg']
  pull_request:
    paths: ['src/**/*.svg']

jobs:
  validate-and-optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Validate SVGs
        run: node scripts/validate.mjs src/**/*.svg
      - name: Optimize SVGs
        run: node scripts/optimize.mjs
      - name: Generate sprite
        run: node scripts/sprite.mjs
      - name: Check size budget
        run: |
          SIZE=$(du -sb sprites/ | cut -f1)
          if [ $SIZE -gt 100000 ]; then
            echo "✗ 雪碧图体积超过 100KB"
            exit 1
          fi
      - name: Commit optimized
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore(svg): auto-optimize'
          file_pattern: 'optimized/** sprites/**'
```

## 9. 案例研究

### 9.1 案例一:D3.js 数据可视化

D3.js 是 SVG 在数据可视化领域的标杆案例。其核心思想是利用 SVG 元素作为 DOM 节点,通过数据驱动的方式动态更新属性。

```javascript
// D3.js 柱状图示例
import * as d3 from 'd3';

const data = [
  { label: 'Q1', value: 120 },
  { label: 'Q2', value: 165 },
  { label: 'Q3', value: 210 },
  { label: 'Q4', value: 180 }
];

const svg = d3.select('#chart')
  .append('svg')
  .attr('viewBox', '0 0 400 200');

const xScale = d3.scaleBand()
  .domain(data.map(d => d.label))
  .range([40, 380])
  .padding(0.2);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([160, 20]);

svg.selectAll('rect')
  .data(data)
  .join('enter')
  .append('rect')
  .attr('x', d => xScale(d.label))
  .attr('y', d => yScale(d.value))
  .attr('width', xScale.bandwidth())
  .attr('height', d => 160 - yScale(d.value))
  .attr('fill', '#4f5bd5');
```

D3 选择 SVG 而非 Canvas 的原因:

1. 每个柱子是独立 DOM 节点,支持单独事件绑定
2. 数据更新可通过 D3 的 enter/update/exit 模式平滑过渡
3. SVG 元素可被 DevTools 直接检查,便于调试

### 9.2 案例二:Google Material Design 图标系统

Google Material Icons 采用 SVG 而非图标字体,理由:

| 维度 | SVG | Icon Font |
| ---- | --- | --------- |
| 多色支持 | 支持 | 不支持 |
| 子像素定位 | 精确 | 字体度量限制 |
| 可访问性 | 原生 `<title>` | 需额外 ARIA |
| 渐变/滤镜 | 支持 | 不支持 |
| 浏览器兼容 | 完美 | IE8 需 polyfill |

Material Icons 工程化方案:

1. 设计稿在 Figma 维护
2. 导出为标准化 SVG(24x24 viewBox,currentColor 填充)
3. SVGO 优化
4. 生成 React 组件库
5. 按需打包,支持 tree-shaking

### 9.3 案例三:GitHub Octicon

GitHub Octicon 是开源 SVG 图标系统的典范,采用 monorepo 管理:

```text
octicons/
├── packages/
│   ├── octicons/             核心 SVG 文件
│   ├── react/               React 组件
│   ├── vue/                 Vue 组件
│   ├── ruby/                Ruby gem
│   └── jekyll/              Jekyll 插件
└── tools/
    ├── build.mjs             构建脚本
    └── optimize.mjs          优化脚本
```

设计原则:

1. 所有图标基于 16x16 网格设计
2. 描边宽度统一 1px
3. 使用 `currentColor` 支持主题化
4. 严格遵循 SVG 1.1 规范

### 9.4 案例四:Bootstrap Icons

Bootstrap Icons 提供了 2000+ SVG 图标,采用 CDN 分发:

```html
<!-- 直接引用 CDN -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
</svg>
```

工程化亮点:

1. 所有图标 inline 在 HTML 中,避免额外 HTTP 请求
2. 使用 `fill="currentColor"` 实现主题化
3. 通过 Bootstrap CSS 类统一管理尺寸

### 9.5 案例五:阿里巴巴 ant-design 图标

Ant Design 通过 `@ant-design/icons` 包提供 React 图标组件,采用按需加载:

```tsx
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';

function App() {
  return (
    <>
      <HomeOutlined />
      <SettingOutlined spin />
    </>
  );
}
```

底层实现:

1. 每个 SVG 编译为独立 React 组件
2. 通过 Babel 插件实现按需加载
3. 支持 `spin`、`rotate`、`style` 等通用属性
4. 支持 `rotate={90}` 等数值控制

### 9.6 案例六:本 FANDEX 项目的 SVG 架构

FANDEX-Web 项目采用分层 SVG 架构:

```text
src/
├── content/docs/svg/            本教程文档(18 篇)
├── components/ui/svg/            SVG React 组件
│   ├── icons/                    图标组件
│   ├── illustrations/           插画组件
│   └── patterns/                 装饰图案
├── assets/svg/                   原始 SVG 资源
└── styles/svg-theme.ts           SVG 主题配置
```

主题系统采用 CSS 变量 + currentColor 双层设计:

```typescript
// src/styles/svg-theme.ts
export const svgTheme = {
  colors: {
    primary: '#4f5bd5',
    secondary: '#00b894',
    danger: '#d63031',
    warning: '#f9a825'
  },
  sizes: {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  },
  strokeWidth: {
    thin: 1,
    regular: 1.5,
    thick: 2
  }
} as const;
```

## 10. 习题

### 10.1 选择题

**题目 1.1** SVG 的全称是什么?

A. Standard Vector Graphics
B. Scalable Vector Graphics
C. Simple Vector Graphics
D. Scalable Visual Graphics

<details>
<summary>答案与解析</summary>

答案:B

SVG 全称为 Scalable Vector Graphics(可缩放矢量图形),由 W3C 制定并维护。"Scalable" 强调其可无损缩放的特性,"Vector" 强调基于矢量描述而非位图。
</details>

**题目 1.2** 下列哪种嵌入方式允许外部 CSS 控制 SVG 内部元素?

A. `<img src="logo.svg">`
B. CSS `background-image: url('logo.svg')`
C. 内联 `<svg>` 直接写在 HTML 中
D. `<object data="logo.svg">`

<details>
<summary>答案与解析</summary>

答案:C

只有内联 SVG 是 HTML 文档的一部分,外部 CSS 选择器可直接作用于其内部元素。其他三种方式 SVG 与主文档处于不同文档上下文,外部 CSS 无法穿透。`<object>` 嵌入的 SVG 内部 CSS 独立运行,需通过 postMessage 通信。
</details>

**题目 1.3** SVG 1.0 规范正式发布的年份是?

A. 1998
B. 2001
C. 2003
D. 2011

<details>
<summary>答案与解析</summary>

答案:B

SVG 1.0 于 2001 年 9 月 4 日正式成为 W3C 推荐标准(Recommendation)。1998 年是 VML 与 PGML 提交 W3C 的年份,2003 年是 SVG 1.1 发布,2011 年是 SVG Tiny 1.2 成为推荐标准。
</details>

**题目 1.4** 在 SVG 仿射变换矩阵 $\begin{bmatrix} a & c & e \\ b & d & f \\ 0 & 0 & 1 \end{bmatrix}$ 中,e 和 f 表示什么变换?

A. 缩放
B. 旋转
C. 平移
D. 倾斜

<details>
<summary>答案与解析</summary>

答案:C

在 SVG 仿射变换矩阵中,a 和 d 控制缩放与旋转,b 和 c 控制旋转与倾斜,e 和 f 表示平移分量(translate)。完整的变换为 $x' = ax + cy + e$,$y' = bx + dy + f$,因此 e 与 f 是平移量。
</details>

**题目 1.5** 下列哪种场景最适合使用 Canvas 而非 SVG?

A. 网站 Logo
B. 数据可视化折线图(50 个数据点)
C. 实时粒子系统(10000 粒子)
D. 图标系统(20 个图标)

<details>
<summary>答案与解析</summary>

答案:C

10000 粒子的实时系统远超 SVG 的合理承载范围(SVG 元素数建议 5000 以内),Canvas 的立即模式更适合大规模重绘。其他场景 SVG 更合适:Logo 需要无损缩放,折线图 50 个点 SVG 完全胜任且支持交互,图标系统 SVG 标准方案。
</details>

### 10.2 填空题

**题目 1.6** SVG 是基于 ______ 的矢量图像格式,由 ______ 组织制定并维护。

<details>
<summary>答案与解析</summary>

答案:XML;W3C(World Wide Web Consortium)

SVG 全称 Scalable Vector Graphics,是基于 XML 的矢量图像格式,由 W3C 组织制定并维护。W3C 是 Web 标准的制定机构,负责 HTML、CSS、DOM 等核心规范。
</details>

**题目 1.7** SVG 坐标系的原点位于 ______,Y 轴方向 ______。

<details>
<summary>答案与解析</summary>

答案:左上角;向下递增

SVG 坐标系原点(0,0)在左上角,X 轴向右递增,Y 轴向下递增。这与数学中笛卡尔坐标系 Y 轴向上相反,源于屏幕扫描线从上到下的历史约定。这种约定影响所有图形 API(Canvas、WebGL 也都是 Y 轴向下)。
</details>

**题目 1.8** SVG 与 Canvas 的核心描述模式差异在于:SVG 采用 ______ 模式,Canvas 采用 ______ 模式。

<details>
<summary>答案与解析</summary>

答案:保留模式(retained mode);立即模式(immediate mode)

SVG 采用保留模式:浏览器维护一棵图形场景树,应用层只声明图形对象。Canvas 采用立即模式:应用层主动调用绘图命令,浏览器不保留场景状态。保留模式适合静态或半静态场景,立即模式适合高频重绘的动态场景。
</details>

**题目 1.9** SVGO 工具主要用于 ______,通常可减小 SVG 文件体积 ______%。

<details>
<summary>答案与解析</summary>

答案:SVG 优化压缩;30-70%

SVGO(SVG Optimizer)是基于 Node.js 的 SVG 优化工具,通过移除冗余属性、合并路径、简化坐标精度等方式减小体积。根据 SVG 复杂度,通常可减小 30-70% 体积,部分情况可达 80% 以上。
</details>

**题目 1.10** SVG 渲染管线的五个阶段是:XML 解析 → ______ → 样式计算 → ______ → 光栅化与合成。

<details>
<summary>答案与解析</summary>

答案:DOM 树构建;布局与变换

SVG 渲染管线五阶段:1) XML 解析(字符串扫描与 token 化)2) DOM 树构建(节点分配与父子链接)3) 样式计算(属性继承与 CSS 计算)4) 布局与变换(仿射矩阵复合与坐标映射)5) 光栅化与合成(几何采样与抗锯齿)。
</details>

### 10.3 编程题

**题目 1.11** 编写一个生产级的 SVG 工程目录,包含至少 3 个图标 SVG 文件,并通过 SVGO 优化脚本批量处理。

要求:

1. 每个 SVG 必须包含 viewBox,不含 width/height
2. 使用 currentColor 支持主题化
3. SVGO 配置文件必须移除注释、合并路径
4. 输出优化后的体积对比

<details>
<summary>参考答案</summary>

目录结构:

```text
my-svg-project/
├── src/
│   ├── home.svg
│   ├── search.svg
│   └── user.svg
├── optimized/
├── .svgo.config.mjs
└── package.json
```

src/home.svg:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
```

src/search.svg:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>
```

src/user.svg:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
```

.svgo.config.mjs:

```javascript
export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          removeDimensions: true
        }
      }
    },
    'removeXMLNS',
    'sortAttrs',
    'convertColors'
  ]
};
```

package.json:

```json
{
  "name": "my-svg-project",
  "type": "module",
  "scripts": {
    "optimize": "node scripts/optimize.mjs"
  },
  "devDependencies": {
    "svgo": "^3.0.0"
  }
}
```

scripts/optimize.mjs:

```javascript
import { optimize } from 'svgo';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { glob } from 'node:fs/promises';
import config from '../.svgo.config.mjs';

async function optimizeSvg(inputPath, outputPath) {
  const svg = await readFile(inputPath, 'utf8');
  const result = optimize(svg, { path: inputPath, ...config });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.data, 'utf8');
  const before = Buffer.byteLength(svg);
  const after = Buffer.byteLength(result.data);
  const saved = ((before - after) / before * 100).toFixed(1);
  console.log(`${relative('.', inputPath)} -> ${relative('.', outputPath)} (节省 ${saved}%)`);
}

const files = await glob('src/**/*.svg');
await Promise.all(
  files.map(file => {
    const out = file.replace(/^src\//, 'optimized/');
    return optimizeSvg(file, out);
  })
);
```

运行 `npm run optimize` 后,优化后体积通常减少 30-50%。
</details>

**题目 1.12** 编写一个独立的 SVG 文件,展示 FANDEX 品牌 Logo,要求:

1. 包含 XML 声明与 SVG 命名空间
2. viewBox 为 "0 0 200 80"
3. 使用 linearGradient 渐变填充
4. 包含 `<title>` 与 `<desc>` 可访问性元素
5. 文字使用 `text-anchor="middle"` 居中

<details>
<summary>参考答案</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" role="img" aria-labelledby="title desc">
  <title id="title">FANDEX Logo</title>
  <desc id="desc">FANDEX 品牌标志,蓝色到绿色渐变背景配白色文字</desc>

  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f5bd5"/>
      <stop offset="100%" stop-color="#00b894"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="200" height="80" rx="12" fill="url(#brandGrad)"/>

  <text
    x="100"
    y="48"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#ffffff"
    font-size="32"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-weight="700"
    letter-spacing="2"
  >
    FANDEX
  </text>
</svg>
```

要点:
1. XML 声明必须在文档第一行
2. xmlns 命名空间必须声明
3. viewBox 让 Logo 可任意缩放
4. linearGradient 通过 url(#brandGrad) 引用
5. text-anchor="middle" 让文字水平居中
6. dominant-baseline="middle" 让文字垂直居中
7. role 与 aria-labelledby 提供可访问性
</details>

### 10.4 思考题

**题目 1.13** 为什么 SVG 选择 XML 作为语法基础而非自定义二进制格式?分析这一决策的优缺点。

<details>
<summary>参考思路</summary>

优点:
1. 可读性:文本格式让开发者能直接阅读与调试,降低门槛
2. DOM 互操作性:XML 与 HTML DOM 自然衔接,SVG 元素是真实 DOM 节点,支持事件绑定与 CSS 样式化
3. 工具链成熟:XML 拥有成熟的解析器(Xerces、libxml2)、校验器(DTD、XSD)、变换工具(XSLT)
4. 可扩展:通过命名空间可嵌入其他 XML 词汇(如 RDF 元数据)
5. 搜索引擎友好:文本格式可被搜索引擎索引,有利于 SEO

缺点:
1. 文件体积大:相比二进制格式,XML 冗余标签增加 30-50% 体积
2. 解析慢:文本解析比二进制解析慢,但现代浏览器已优化至可接受
3. 语法严格:XML 不允许标签未闭合等错误,容错性低于 HTML
4. 命名空间复杂:跨命名空间引用需 xmlns 声明,增加心智负担

总体而言,XML 的选择是 2001 年时代的合理决策,其优势(可读性、互操作性、生态成熟)远超劣势。SVG 2 虽保留 XML 语法,但允许 HTML 解析器宽松解析内联 SVG,降低了对严格 XML 的依赖。
</details>

**题目 1.14** 在 10000 个数据点的散点图场景中,应该选择 SVG 还是 Canvas?请给出技术决策依据。

<details>
<summary>参考思路</summary>

建议选择 Canvas,理由:

1. **性能**:10000 个 DOM 节点的 SVG 在交互时(缩放、平移)会出现明显卡顿,Canvas 重绘开销更低
2. **内存**:10000 个 SVG 元素占用约 100MB+ 内存,Canvas 仅需 4MB(像素数据)
3. **渲染开销**:SVG 每个元素需独立光栅化,Canvas 一次性绘制更高效

但如果坚持使用 SVG,可考虑以下优化:

1. **数据降采样**:根据缩放级别动态减少显示点数
2. **WebGL 加速**:使用 PixiJS 等库在 Canvas 上跑 WebGL
3. **虚拟化**:只渲染视口内的元素(类似 React Virtual List)

进阶方案:数据量大但需要交互时,可考虑 Canvas + 命中检测,或 WebGL + 自定义事件系统。D3.js 在 v7 后已支持 Canvas 后端。

最终决策需基于业务需求:
- 数据量 < 5000 且需要丰富交互 → SVG
- 数据量 5000-50000 且交互简单 → Canvas
- 数据量 > 50000 或需 3D 渲染 → WebGL
</details>

**题目 1.15** 假设你的团队需要为一个大型企业级应用构建图标系统,需要支持 500+ 图标、React/Vue 双框架、按需加载、主题化。请设计完整的工程方案。

<details>
<summary>参考思路</summary>

工程方案设计:

1. **设计阶段**:
   - 在 Figma 中维护统一的设计源文件
   - 所有图标基于 24x24 网格设计
   - 使用 `currentColor` 支持主题化
   - 描边宽度统一 1.5px

2. **源文件管理**:
   - 使用 Git 仓库单独管理图标源文件
   - 每个图标一个 .svg 文件,文件名即图标名
   - 通过 CI 自动同步到 npm 包

3. **构建流程**:
   ```text
   Figma 导出 → SVGO 优化 → 生成 React/Vue 组件 → 发布 npm 包
   ```

4. **多框架支持**:
   - React 组件:`@fandex/icons-react`
   - Vue 组件:`@fandex/icons-vue`
   - 原始 SVG:`@fandex/icons-svg`
   - 共享类型定义:`@fandex/icons-types`

5. **按需加载**:
   - 每个图标独立文件,支持 tree-shaking
   - 提供 Babel 插件自动按需引入
   - 支持 dynamic import 异步加载

6. **主题化**:
   ```tsx
   <Icon name="home" color="primary" size={24} />
   ```
   - color 属性映射到 CSS 变量
   - 通过 Context 注入主题
   - 支持 dark/light 模式切换

7. **性能监控**:
   - 包体积预算:核心包 < 50KB,单图标 < 2KB
   - 渲染性能:1000 图标列表 < 100ms
   - 内存占用:每个图标实例 < 1KB

8. **可访问性**:
   - 自动从图标名生成 `aria-label`
   - 支持 `<title>` 与 `<desc>` 自定义
   - 装饰性图标自动添加 `aria-hidden="true"`

9. **文档与测试**:
   - 自动生成图标展示网站
   - 视觉回归测试(Chromatic)
   - 可访问性测试(axe-core)

10. **版本管理**:
    - 语义化版本(SemVer)
    - 变更日志(Changesets)
    - 图标变更历史可追溯
</details>

## 11. 参考文献

### 11.1 规范与标准

- World Wide Web Consortium (W3C). 2001. *Scalable Vector Graphics (SVG) 1.0 Specification*. W3C Recommendation. https://www.w3.org/TR/SVG10/

- World Wide Web Consortium (W3C). 2003. *Scalable Vector Graphics (SVG) 1.1 Specification*. W3C Recommendation. https://www.w3.org/TR/SVG11/

- World Wide Web Consortium (W3C). 2018. *Scalable Vector Graphics (SVG) 2*. W3C Candidate Recommendation. https://www.w3.org/TR/SVG2/

- World Wide Web Consortium (W3C). 2024. *SVG 2.1 W3C Working Draft*. https://www.w3.org/TR/SVG21/

- Internet Engineering Task Force (IETF). 2015. *The "image/svg+xml" Media Type Registration*. RFC 6174. https://doi.org/10.17487/RFC6174

### 11.2 学术论文

- Sutherland, I. E. 1963. *Sketchpad: A man-machine graphical communication system*. In Proceedings of the AFIPS Spring Joint Computer Conference (SJCC '63), 329–346. https://doi.org/10.1145/1461551.1461591

- Foley, J. D., Wallace, V. L., and Chan, P. 1984. *The human factors of computer graphics interaction techniques*. IEEE Computer Graphics and Applications 4, 11 (Nov. 1984), 13–26. https://doi.org/10.1109/MCG.1984.6429585

- Bostock, M., Ogievetsky, V., and Heer, J. 2011. *D3: Data-driven documents*. IEEE Transactions on Visualization and Computer Graphics 17, 12 (Dec. 2011), 2301–2309. https://doi.org/10.1109/TVCG.2011.185

- Battle, L. and Heer, J. 2019. *Optimizing data visualization for component reuse*. IEEE Transactions on Visualization and Computer Graphics 25, 1 (Jan. 2019), 1–11. https://doi.org/10.1109/TVCG.2018.2865151

- Liu, Z., Jiang, B., and Heer, J. 2013. *imMens: Real-time visual querying of big data*. Computer Graphics Forum 32, 3pt4 (June 2013), 421–430. https://doi.org/10.1111/cgf.12129

### 11.3 工业实践与会议报告

- Adobe Systems Inc. 1985. *PostScript Language Reference Manual*. Addison-Wesley Professional, Reading, MA.

- Meyer, E. A. 2007. *Cascading Style Sheets: The Definitive Guide*. O'Reilly Media, Sebastopol, CA.

- Pilgway. 2018. *SVG optimization in modern web development*. In Proceedings of the Chrome Dev Summit 2018. https://developer.chrome.com/devsummit/

- Archibald, J. 2014. *SVGOMG: A web-based SVG optimizer*. GitHub repository. https://github.com/jakearchibald/svgomg

### 11.4 书籍

- Eisenberg, J. D. 2002. *SVG Essentials*. O'Reilly Media, Sebastopol, CA. ISBN: 978-0-596-00223-7.

- Bellamy-Royds, A., Myers, D., and Stokes, C. 2018. *Using SVG with CSS3 and HTML5: Vector Graphics for Web Design*. O'Reilly Media, Sebastopol, CA. ISBN: 978-1-4919-2197-5.

- Fox, K. 2017. *SVG Animations: From Common UX Implementations to Complex Responsive Animation*. O'Reilly Media, Sebastopol, CA. ISBN: 978-1-4919-3970-3.

- Watson, R. 2018. *Learn SVG: The Web Graphics Standard*. A K Peters/CRC Press, Boca Raton, FL. https://doi.org/10.1201/9780429488706

## 12. 延伸阅读

### 12.1 在线教程与文档

- **MDN SVG 文档**:https://developer.mozilla.org/zh-CN/docs/Web/SVG
  Mozilla 开发者网络的 SVG 权威参考,涵盖所有元素与属性

- **SVG 1.1 规范中文翻译**:https://www.w3.org/TR/SVG11/
  W3C 官方 SVG 1.1 规范,语言规范的最权威来源

- **CSS-Tricks SVG 指南**:https://css-tricks.com/svg-properties-and-css/
  涵盖 SVG 与 CSS 集成的实战技巧

- **SVG 周刊**(SVG Weekly):https://svg-weekly.com/
  每周更新的 SVG 资源与案例

### 12.2 开源项目与代码库

- **D3.js**:https://github.com/d3/d3
  Mike Bostock 的数据可视化库,SVG 的标杆应用

- **SVGO**:https://github.com/svg/svgo
  最流行的 SVG 优化工具,Node.js 实现

- **Heroicons**:https://heroicons.com/
  Tailwind CSS 团队开源的 SVG 图标库

- **Feather Icons**:https://feathericons.com/
  Cole Bemis 设计的简洁图标集,24x24 viewBox 标准

- **Bootstrap Icons**:https://icons.getbootstrap.com/
  Bootstrap 团队维护的 2000+ SVG 图标

- **Material Symbols**:https://fonts.google.com/icons
  Google 官方 Material Design 图标系统

### 12.3 视频课程

- **Frontend Masters: SVG Animation & UX**
  Sarah Drasner 主讲的 SVG 动画与用户体验课程

- **Egghead: Build SVG Graphics in React**
  SVG 在 React 中的应用实战

- **Pluralsight: SVG Fundamentals**
  SVG 基础系统性课程

### 12.4 学术资源

- **IEEE Transactions on Visualization and Computer Graphics**
  数据可视化与计算机图形学的顶级期刊,常发表 SVG 相关研究

- **ACM SIGGRAPH**
  计算机图形学的顶级会议,涵盖矢量图形学前沿

- **CHI Conference on Human Factors in Computing Systems**
  人机交互会议,SVG 在交互设计中的应用研究

### 12.5 进阶主题建议

完成本章学习后,建议继续探索:

1. **SVG 动画**:SMIL、CSS 动画、Web Animations API
2. **SVG 滤镜**:高斯模糊、阴影、光照效果的数学原理
3. **SVG 与 WebGL 协同**:何时切换技术栈的决策依据
4. **SVG 与 Web Components**:封装可复用 SVG 组件
5. **SVG 与可访问性**:深入 ARIA、屏幕阅读器协同
6. **SVG 性能优化**:浏览器渲染管线深度分析
7. **SVG 在移动端**:SVG Tiny 1.2 与移动优化策略
8. **SVG 与设计系统**:Figma → SVG → 组件库的工作流

下一篇将从 `<svg>` 根元素与文档结构开始,逐步展开 SVG 的核心语法。
