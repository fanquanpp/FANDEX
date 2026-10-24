# fx — FANDEX 动效特效体系

无框架、零新依赖的 DOM 级动效组件化体系，参考 typelex 的场景背景与
氛围层思路重写。与 `src/motion/` 的分工：motion/ 服务 React 岛屿
（motion/react 预设），fx/ 服务 Astro 静态页与任意原生节点。

## 结构

```
fx/
  index.ts          单一入口：注册全部特效 + 启动生命周期（BaseLayout 引入）
  capabilities.ts   能力门控：full / lite / off 三档 + WebGL2 探测 + 自动化检测
  registry.ts       注册表：data-fx 命名挂载 + 选择器挂载，幂等，统一回收
  lifecycle.ts      astro:page-load 挂载 / astro:before-swap 回收
  scene.ts          场景令牌读取、主题订阅（fandex:themechange）、共享 rAF
  layers/
    backdrop.ts     scene-backdrop：声纹线场背景，单例画布跨页搬迁
    cursor-grid.ts  指针点亮网格（点击波纹、环境闪烁、hold-then-fade 包络）
    letter-field.ts 代码字符场（指针注能、整行扫描）
  effects/
    reveal.ts       滚动显现（data-fx-reveal / data-fx-reveal-group）
    text.ts         拆字（data-fx-split）与解密（data-fx-decrypt）
    count-up.ts     数字滚动（data-fx-count，兼容 .stat-num[data-countup]）
  decor-config.ts   GeoBgDecor 律动装饰配置的单一数据源
```

配套：

- `components/SceneBackdrop.astro` — 背景宿主（底色 + 技术网格 + 暗角 +
  画布挂载点），BaseLayout 通过 fxScene prop 选择 full / calm 浓度；
- `components/AmbientLayers.astro` — 环境画布层组合（可由 GeoBgDecor 的
  ambient prop 组合，也可单独使用）；
- `styles/fx.css` — 全部 fx 样式；场景颜色令牌在 `styles/variables.css`
  的 `--fx-scene-*` / `--fx-ambient-ink`（随主题切换，WebGL uniform 经
  fx/scene.ts 解析读取）。

## 使用

页面不需要写任何 JS：在标记上声明即可，注册表在 astro:page-load 自动挂载。

```html
<div class="fx-reveal" data-fx-reveal data-fx-reveal-delay="80">...</div>
<div data-fx-reveal-group data-fx-reveal-step="70">
  <div class="fx-reveal" data-fx-reveal>...</div>
</div>
<span data-fx-split="pop" data-fx-split-stagger="55">FANDEX</span>
<span data-fx-decrypt data-fx-decrypt-speed="34">FX_REGISTRY</span>
<span data-fx-count="42">42</span>
<div data-fx="cursor-grid letter-field"></div>
```

新增一个特效：实现 `(host: HTMLElement) => void | (() => void)` 挂载函数，
`registerFx(name, mount, selector?)` 注册进 `fx/index.ts`，需要调参时从
`host.dataset` 读取 `data-<kebab-name>` 选项。清理函数必须完整回收 rAF、
监听器与定时器——它们在 astro:before-swap 统一触发。

## 约束与坑位

- 隐藏态样式一律挂在 `html[data-fx-ready]` 之下（BaseLayout 头部内联脚本
  先于首帧写入），无 JS 环境内容完整可见，杜绝隐形内容与布局跳动。
- 首屏元素在挂载时按 rect 直接显形，不等 IntersectionObserver 回调，
  后台标签页不出现永久蒙灰。
- localStorage `fandex-fx = off` 可整体关闭（无障碍逃生口）；
  prefers-reduced-motion / 省流 / 触屏 / 窄屏归入 lite 档：零画布，
  文本与数字特效直接呈现终值。
- 设计约束：不使用光斑与色散类装饰——背景一律单墨色线与几何
  （声纹线场、技术网格、暗角为压暗而非发光），禁止径向辉光、
  彩虹混色与 iridescent 场。
- `navigator.webdriver`（Lighthouse / Playwright）下画布层全部跳过：
  SwiftShader 软渲染拖慢 CI 性能分，且冒烟测试只要求零未捕获异常。
- 暗色场景令牌遵守色彩裁定基线：纯黑灰板（#0A0A0A 系）+ 青系
  （#00E5FF / #00D6C7 / #39C5BB）不可动；调整前先读裁定记录。

## 致谢

cursor-grid 的单元格状态纹理 + 单 pass 着色器架构来自 react-bits 的
CursorGrid（MIT + Commons Clause），经 typelex 间接引用后按 FANDEX
约束重写为无框架版本；backdrop 的虹彩迭代场着色器源自 typelex 的
Backdrop（three.js 实现改写为原生 WebGL2）。
