## 0. 一个类比：搬家打包与快递分装

假设你要搬家，把所有家当堆进**一个**巨大的行李箱，然后整个搬走。后果是什么？路上每开一段就要翻箱倒柜找东西；到了新家，哪怕只想用一把勺子，也得先把整个行李箱翻个底朝天。

聪明的搬家方式是这样的：

- **常用的小件**（证件、钥匙、充电器）随身带着——对应"首屏只加载必需代码"
- **大型家电**（冰箱、洗衣机）单独包装、单独运输——对应"大依赖拆成独立 chunk"
- **不常穿的换季衣服**先寄存在仓库，需要时再取——对应"路由懒加载，用到了才请求"
- **搬家公司还提供"打包清单"**，告诉你每箱装了什么——对应"产物分析工具"

网页加载的道理完全一样：把全部代码塞进一个文件，用户打开页面就要下载几 MB 的 JS，首屏等得心焦；拆成多个文件按需加载，用户只下载当前页面需要的部分。这就是**代码分割（Code Splitting）**。本文用一个真实事故开场，带你完整走一遍 Vite 生产构建与代码分割的优化链路。

## 1. 事故现场：首屏加载 5 秒

某电商后台项目上线后，用户反馈"打开页面要转 5 秒的圈"。排查过程如下：

```text
第一步：看 Network 面板
  index-abc123.js     2.1 MB   下载耗时 2.8s（4G 网络）
  chunk-xyz789.js     800 KB
  vendor-qwe456.js    1.5 MB    ← 注意：第三方库竟然有 1.5 MB！

第二步：看终端构建输出
  dist/assets/index-abc123.js  2,850.42 kB │ gzip: 820.11 kB
  (!) Some chunks are larger than 500 kB after minification.
```

两个关键线索：

1. **所有路由的代码都打进了同一个文件**——用户打开登录页，却下载了整个后台的所有页面代码。
2. **第三方库全部混在一起**——图表库、UI 库、工具库打包成一个巨型 vendor 文件，只要升级其中任意一个库，整个 vendor 都要重新下载，浏览器缓存形同虚设。

这就是典型的分包失败案例。接下来的内容，就是教你一步步解决这类问题。

## 2. 生产构建做了什么

`vite build` 把开发产物转换成可上线的优化版本。Vite 8 中整条流程由 **Rolldown** 统一完成（开发与生产同一套管线，详见 009 篇）。一次构建的执行链：

vite build 的执行链：
1. 入口分析：从 index.html 追踪所有模块
2. 转换与解析：TS/JSX 转 JS、处理 import 图
3. tree-shaking：删除未使用的代码
4. 代码分割：按动态 import 边界与 manualChunks 拆分 chunk
5. 压缩：JS/CSS 压缩 + 文件内容哈希
6. 输出到 dist/（默认）

讲解：开发环境（dev）不打包、按需转换；生产构建则相反——完整打包、深度优化。Vite 8 中两者由同一个打包器承担，"本地能跑、上线就挂"的差异问题从架构上被大幅消除（009 篇详述）。

先看一个最简单的构建示例：

```bash
# 执行生产构建
pnpm build

# 典型输出
vite v8.x.x building for production...
42 modules transformed.
dist/index.html                  0.45 kB
dist/assets/index-Bh7kRCDa.js    85.14 kB │ gzip: 26.32 kB
```

文件名的 `Bh7kRCDa` 是**内容哈希**：文件内容变化，哈希就变化，文件名随之变化。这是浏览器缓存策略的基础——内容没变，文件名不变，浏览器继续用缓存；内容变了，新文件名迫使浏览器下载新版本。

## 3. 问题一：整包太大——动态 import 按路由拆分

### 3.1 动态 import 是什么

`import()` 是 JavaScript 原生的动态导入语法，也是 Vite 代码分割的"天然边界"。只要代码里出现 `import()`，构建时就会自动拆出一个独立 chunk，按需加载：

```ts
// 静态导入：无论用不用，都会被打进主包
import UserPage from './pages/UserPage'

// 动态导入：构建时自动拆出独立 chunk，用到了才下载
const UserPage = () => import('./pages/UserPage')
```

### 3.2 路由级懒加载

实际项目中最常见的用法是"一个路由一个 chunk"：

```ts
// React + React Router 写法
import { lazy, Suspense } from 'react'

// 每个 lazy() 对应一个独立 chunk
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// 用 Suspense 包裹，加载 chunk 时显示 fallback
function App() {
  return (
    <Suspense fallback={<div>页面加载中...</div>}>
      {/* 路由切换时按需加载对应 chunk */}
    </Suspense>
  )
}
```

```ts
// Vue Router 写法：component 使用函数形式即可
const routes = [
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/settings', component: () => import('../views/Settings.vue') },
]
```

效果：构建后 `dist/assets/` 下出现 `HomePage-xxx.js`、`DashboardPage-xxx.js` 等多个文件，用户访问 `/` 时只下载 Home 页面的 chunk。

### 3.3 组件级懒加载

大组件（如富文本编辑器、大图表）也可以单独懒加载，而不必等到路由级别：

```ts
// 仅在用户点击"编辑"时才加载编辑器（约 400KB）
const onClickEdit = async () => {
  const { Editor } = await import('../components/Editor')
  setEditorReady(Editor)
}
```

### 3.4 注意事项

- **不要滥用**：把 20 行的简单组件也拆出去，只会制造大量小文件，增加 HTTP 请求数，得不偿失。一般"路由级 + 超大第三方依赖"是拆分重点。
- **`import()` 里尽量用静态路径**：`import(\`./locales/${lang}.json\`)` 这种带变量的写法，打包器只能把该目录下所有文件都作为候选拆出，容易失控。

## 4. 问题二：第三方库混在一起——manualChunks 手动分组

动态 import 解决"按需加载"，`manualChunks` 解决"缓存复用"。目标：把变更频率接近的代码放在同一个 chunk 里，某个库升级只重下对应 chunk。

### 4.1 对象形式（简单分组）

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 echarts 及其子依赖合并为独立 chunk
          charts: ['echarts', 'echarts-gl'],
          // 将 UI 库单独拆出
          ui: ['antd', '@ant-design/icons'],
          // 框架与路由单独拆出
          framework: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
```

对象形式的缺点：若某个库实际未被引入，会生成**空的 chunk**。

### 4.2 函数形式（推荐，更灵活）

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 函数形式：根据模块 ID 动态决定归属
        manualChunks(id) {
          // 只处理 node_modules 里的第三方依赖
          if (id.includes('node_modules')) {
            // 图表库体积大且很少变更，单独成包
            if (id.includes('echarts') || id.includes('d3')) return 'charts'
            // 框架代码极少变更，单独成包
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
            // UI 组件库按需引入，中等变更频率
            if (id.includes('antd') || id.includes('@arco-design')) return 'ui'
            // 其余依赖统一放进 vendor
            return 'vendor'
          }
        },
      },
    },
  },
})
```

讲解：函数形式的判断顺序很重要——把"变更频率低、体积大"的库放在最前面匹配。分包粒度太粗（全塞 vendor）缓存命中率低；太细（每个库一包）又会制造几十个文件。业界经验：**框架 1 包、UI 库 1 包、大图表库 1 包、其余 vendor 1 包**是比较稳妥的起点。

配置名仍是 `rollupOptions`：在 Vite 8 中它作为 Rolldown 的兼容入口保留，保持插件与配置的兼容性（009 篇会讲 `rolldownOptions` 与迁移）。

### 4.3 分包后的实际收益

以第 1 节事故项目为例，分四步整改：

```text
整改前：
  index.js  2.85 MB（全部页面 + 全部第三方库混在一起）

整改后：
  react-vendor.js  180 kB   ← 极少变更，长期缓存
  ui.js            320 kB
  charts.js        1.1 MB   ← 只在用到图表的页面按需加载
  vendor.js        260 kB
  index.js         95 kB    ← 首屏主包
  HomePage.js      60 kB    ← 路由 chunk，按需加载
  Dashboard.js     85 kB
```

首屏从"下载 2.85 MB"降到"下载约 1 MB 以内"，且之后每次发布，只要依赖没变，vendor 全部走缓存。

## 5. build 配置核心项

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',            // 输出目录（相对项目根）
    assetsDir: 'assets',       // 静态资源子目录
    sourcemap: false,          // 是否生成 sourcemap，调试用 'hidden'
    minify: true,              // 是否压缩 JS
    target: 'baseline-widely-available', // 编译目标浏览器
    cssCodeSplit: true,        // CSS 代码分割
    assetsInlineLimit: 4096,   // 小于 4KB 的资源内联为 base64
    chunkSizeWarningLimit: 500, // chunk 超过 500KB 时警告
    emptyOutDir: true,         // 构建前清空 outDir
  },
})
```

| 选项 | 说明 |
| --- | --- |
| `outDir` | 构建产物目录，构建前自动清空（默认 `emptyOutDir: true`） |
| `sourcemap` | `true` 生成 .map 文件；`'hidden'` 生成但不写注释（避免源码映射暴露给用户）；`'inline'` 内联到 JS 里（会让文件显著变大） |
| `target` | 目标浏览器语法。Vite 8 默认 `'baseline-widely-available'`（2026 年起的主流浏览器基线，Chrome 111 / Edge 111 / Firefox 114 / Safari 16.4 起） |
| `minify` | 是否压缩 JS。Vite 8 中由 Rolldown 基于 Oxc 原生执行，不再依赖单独压缩器 |
| `chunkSizeWarningLimit` | 单个 chunk 超过该体积（KB）时输出警告。默认 500，这是提醒而非错误 |
| `emptyOutDir` | 构建前是否清空输出目录。注意：`outDir` 位于项目根目录之外时默认为 false，需显式开启 |

## 6. tree-shaking：消除无用代码

tree-shaking（摇树）依赖 ES Module 的静态结构——`import`/`export` 在编译期即可确定，构建时删除"被引入但从未使用"的代码：

```ts
// utils.ts
export function used() { return 'ok' }
export function unused() { return 'dead code' }   // 会被删除

// main.ts
import { used } from './utils'
console.log(used())
```

构建后，`unused` 函数不会出现在产物里。为保证 tree-shaking 效果，请做到：

1. **使用 ESM 语法**（`import`/`export`），避免 `require()` 等 CommonJS 写法。
2. **避免模块顶层产生副作用**。`console.log('loaded')` 这种顶层语句会让打包器认为模块有副作用而保留整段代码；`package.json` 里可配置 `"sideEffects": false` 声明包内无副作用。
3. **第三方库选择提供 ESM 产物的版本**。lodash 全量引入会拖进整个库，改用 `lodash-es`（ESM 版）才能被正确摇树；`import { debounce } from 'lodash'` 在部分库上仍会引入整库。
4. **避免 barrel 文件副作用**：`index.ts` 统一导出（barrel）里若有副作用导入，整个 barrel 都可能被保留。

Rolldown 在 Vite 8 中默认启用更强的死代码消除与常量内联，同等代码下产物往往比旧版更小。

## 7. 资源压缩

| 产物类型 | 压缩方式 | 说明 |
| --- | --- | --- |
| JS | Rolldown 内置压缩（Oxc Minifier 实现） | 无需额外依赖 |
| CSS | Lightning CSS 压缩 | 默认启用，无需配置 |
| 图片/字体 | 不压缩（原样复制） | 需用图片优化插件 |
| HTML | 极简压缩 | 保留必要结构 |

讲解：Vite 8 不再依赖 esbuild 压缩 JS、也不需要 cssnano——分别被 Rolldown（Oxc）与 Lightning CSS 取代。图片压缩不是 Vite 内置能力，可选用 `vite-plugin-imagemin` 或构建前用工具处理。另外，生产环境默认移除 `console.log` 与 `debugger`（Vite 8 由 Rolldown 相关选项控制），确认符合团队约定。

## 8. 分析产物体积

### 8.1 终端报告

```bash
pnpm build
```

终端会按 chunk 列出体积与 gzip 体积，一眼看出"哪个 chunk 超了 500KB 警告线"。

### 8.2 可视化分析

终端报告只到 chunk 级别，想看"chunk 里哪个依赖占了多少"要用可视化插件：

```bash
pnpm add -D rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [visualizer({ open: true })],  // 构建后自动打开分析页面
})
```

```bash
pnpm build   # 构建完成后自动打开 treemap 分析页
```

visualizer 生成交互式 treemap（矩形面积图）：每个矩形的大小代表体积占比，鼠标悬停能看到具体依赖。定位"某个库怎么占了 500KB"这类问题，这是必备工具。

### 8.3 体积预算意识

业界经验值：**移动端首屏 JS（gzip 后）200KB 左右是"表现良好"的上限**。500KB 压缩前的 chunk，gzip 后大约 150KB，已经接近红线。建议在 CI 中加体积检查（如 `size-limit`），防止体积悄悄膨胀。

## 9. 常见错误与对策表

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 构建输出 `Some chunks are larger than 500 kB` | 主包混入了大依赖且未分割 | 用动态 import 拆路由、`manualChunks` 拆第三方库 |
| 构建成功但上线 404 | `base` 配置与部署子路径不一致 | 部署在子路径时配置 `base: '/子路径/'`，见 004 篇 |
| tree-shaking 失效、产物里仍有死代码 | 依赖是 CommonJS 或模块有顶层副作用 | 改用 ESM 版库（如 lodash-es），配置 `sideEffects` |
| 动态 import 不生效、仍打进主包 | 误用了静态 import 或变量路径 | 用 `const Page = () => import('./Page')` 写法，路径写静态 |
| vendor chunk 反复变哈希、缓存失效 | 手动分组粒度不合理，业务代码混入 vendor | 按"框架/UI/大库/其余"分层分组 |
| manualChunks 生成空 chunk | 对象形式声明了未被引用的库 | 改用函数形式，按 `id.includes(...)` 动态判断 |
| 产物里残留 `console.log` / `debugger` | 生产压缩配置未移除 | 确认构建压缩开启（默认移除），或按团队约定配置 |
| sourcemap 泄露源码 | `sourcemap: 'inline'` 或 `true` 直接上线 | 线上用 `'hidden'`，或只用于灰度/内网 |

## 11. 一句话记忆

代码分割就是"搬家分装"：动态 import 让每个路由按需加载，manualChunks 让变更频率相近的依赖共享缓存——用户只下载当下需要的，浏览器只重新下载变了的。
