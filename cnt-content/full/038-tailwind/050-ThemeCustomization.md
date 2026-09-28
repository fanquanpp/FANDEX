---
order: 50
title: Tailwind CSS 主题定制与设计令牌
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: Tailwind CSS 4 主题定制实战：@theme 令牌声明、primitive/semantic/component 三层令牌、@theme inline 桥接 CSS 变量、data-theme 运行时换肤，以 FANDEX 仓库的真实令牌管线为案例
author: fanquanpp
updated: '2026-09-28'
related:
  - 'tailwind/020-InstallConfig'
  - 'tailwind/060-ResponsiveDark'
  - 'tailwind/080-V4Features'
prerequisites:
  - 'tailwind/020-InstallConfig'
---

## 前置知识

- [Tailwind CSS 安装与配置](/tailwind/020-InstallConfig)：能跑起一个带 `@import "tailwindcss"` 的项目。

## 学习目标

- 能说清设计令牌是什么，并用 `@theme` 把一套品牌色、圆角、阴影注册成全站工具类。
- 能按 primitive / semantic / component 三层组织令牌，理解"换肤只改基础层"的依赖方向。
- 能用 `@theme inline` 把外部 CSS 变量桥接进 Tailwind，并说出它与普通 `@theme` 的取舍。
- 能用 `data-theme` 属性 + 绘制前内联脚本实现亮暗换肤，且不闪白。
- 能给令牌体系配上"漂移检查"，防止多份拷贝各改各的。

## 0. 先从一个真实场景切入

想象你维护一个内容站：首页横幅、文档正文、代码块、侧栏导航，加起来用了上百处蓝色。某天品牌换色，从蓝改成青——如果你的样式里散落着 `#2563eb`、`#3b82f6`、`rgb(37,99,235)` 这些写死的值，这就是一次全站考古。设计令牌（Design Token）就是为这一刻准备的：**给每个设计决策起一个名字，全站只用名字，改值只改一处**。

这不是假想练习。你现在读的这个站点（FANDEX 仓库）就是这么做的：全部颜色、间距、圆角先以 W3C DTCG 格式的 JSON 令牌定义，由脚本生成一份纯 CSS 变量文件，再桥接进 Tailwind 4 的 `@theme`。本篇就沿着"概念 -> 自己动手 -> 真实仓库怎么做"的顺序走一遍。

## 1. 设计令牌：给设计决策起名字

一句话定义：**把颜色、字体、间距、圆角、阴影等设计决策，起一个有意义的名字，存成一个可复用的变量**。

```css
/* 给"品牌主色"起个名字，全站共用 */
--color-brand-500: #1677ff;
```

定义之后，`bg-brand-500`、`text-brand-500`、`border-brand-500` 底层都是同一个值。改品牌色时，只动这一行。

Tailwind 4 的令牌声明入口是 CSS 里的 `@theme` 块。它有个双重身份：**在这里声明的每个变量，既是真实的 CSS 变量（输出到 `:root`），又会按命名空间前缀自动生成全套工具类**。

```css
/* src/styles/global.css —— 项目唯一的样式入口 */
@import "tailwindcss";

@theme {
  /* --color- 前缀生成 bg-* / text-* / border-* 等全家桶 */
  --color-primary: #1677ff;
  --color-surface: #ffffff;

  /* --radius- 前缀生成 rounded-card */
  --radius-card: 12px;

  /* --shadow- 前缀生成 shadow-card */
  --shadow-card: 0 2px 8px rgb(0 0 0 / 0.08);
}
```

```html
<!-- 主按钮：类名即品牌规范 -->
<button class="bg-primary text-white rounded-card px-4 py-2">主按钮</button>

<!-- 卡片：语义类组合，改令牌一处全站生效 -->
<div class="bg-surface shadow-card rounded-card p-6">卡片内容</div>
```

命名空间速查（前缀决定生成什么工具类）：

| 变量前缀 | 生成的工具类 | 说明 |
| --- | --- | --- |
| `--color-*` | `bg-*`、`text-*`、`border-*`、`fill-*`、`ring-*` 等 | 颜色全家桶 |
| `--font-*` | `font-*` | 字体族 |
| `--text-*` | `text-*` | 字号（注意与文字颜色前缀区分） |
| `--font-weight-*` | `font-*`（字重） | 如 `font-semibold` |
| `--spacing-*` | `p-*`、`m-*`、`gap-*`、`w-*`、`h-*` 等 | 间距与尺寸 |
| `--radius-*` | `rounded-*` | 圆角 |
| `--shadow-*` | `shadow-*` | 外阴影 |
| `--breakpoint-*` | `sm:`、`md:`、`lg:` 等前缀 | 响应式断点 |
| `--animate-*` | `animate-*` | 动画 |
| `--ease-*` | `ease-*` | 缓动函数 |

> 提示：`--text-*` 还能用复合变量控制行高，如 `--text-hero--line-height: 1.2`，声明 `--text-hero: 2.5rem` 后即可用 `text-hero` 得到"字号 + 行高"成对的排版预设。

## 2. 新增还是覆盖：动默认色板前的判断

在 `@theme` 中定义 `--color-*` 有两种语义，务必分清：

- **新增令牌**：定义 `--color-brand-500`，`bg-brand-500` 立即可用，默认色板不受影响，安全；
- **覆盖默认令牌**：重新定义 `--color-blue-500`，会替换 Tailwind 预设的蓝色 500，影响所有用到它的地方，需谨慎。

```css
@theme {
  /* 覆盖：把全站 blue-* 换成品牌蓝（影响面大，确认再动） */
  --color-blue-500: #1677ff;

  /* 新增：完全安全的品牌色系 */
  --color-brand-500: #1677ff;
  --color-brand-600: #0958d9;
}
```

策略口诀：**新增为主、覆盖为辅**。日常用 `brand-*` 这类自定义色系；只有确需"全站默认色统一换成品牌色"时才覆盖 `blue-*`。

各命名空间的实务要点，用一张速记表收拢：

| 命名空间 | 实务要点 |
| --- | --- |
| 颜色 | v4 默认色板是 OKLCH 色彩空间，色阶过渡感知均匀；自己定义时写 HEX 完全没问题，框架会处理兼容 |
| 字体 | `--font-sans` 覆盖默认字体栈，中文字体记得补 `"PingFang SC", "Microsoft YaHei"` 兜底 |
| 间距 | 默认刻度是 0.25rem 的倍数；新增 `--spacing-18: 4.5rem` 后 `p-18`、`gap-18`、`w-18` 全部可用 |
| 圆角/阴影 | `--radius-card`、`--shadow-card-hover` 这类语义命名，让"卡片规范"成为可检索的令牌 |
| 断点 | 覆盖 `--breakpoint-sm: 560px` 改默认档；新增 `--breakpoint-3xl: 1920px` 自动生成 `3xl:` 前缀 |

## 3. 动手：搭一套三层令牌体系

单层令牌（所有变量平铺）在换肤时会露馅：暗色模式下 `--color-surface` 的值要从白变黑，可它可能同时被亮色专属的组件引用。成熟的做法是**分三层，依赖方向单一**：

```text
primitive（原始层）  原子取值，无语义：#0A0A0A、16px
      ↑ 被引用
semantic（语义层）   表达用途：--color-surface、--color-text-main（分亮暗两套值）
      ↑ 被引用
component（组件层）  组件专属：--color-btn-bg 引用 semantic
```

FANDEX 仓库就是这条路线的真实落地，流程分四步，你可以照着做：

**第 1 步：令牌的"源"用 JSON 管理（DTCG 格式）。** 设计师在 Figma 等工具里维护的令牌，与代码里消费的令牌，用同一份机器可读的 JSON 表达：

```json
// shd-shared/tokens/color.semantic.json（节选示意）
{
  "color": {
    "surface": {
      "light": { "$value": "#FFFFFF" },
      "dark": { "$value": "#141414" }
    }
  }
}
```

**第 2 步：脚本把 JSON 生成纯 CSS 变量文件。** 生成物按选择器分作用域——`:root` 放浅色默认值，`[data-theme='dark']` 覆盖深色值：

```css
/* shd-shared/styles/tokens.css（生成产物，节选示意） */
@layer tokens {
  :root {
    color-scheme: light;
    /* primitive 层：原始取值 */
    --color-neutral-50: #0A0A0A;
    /* semantic 层：浅色默认 */
    --fandex-color-surface: #FFFFFF;
  }

  [data-theme='dark'] {
    color-scheme: dark;
    /* semantic 层：深色覆盖，变量名不变，值换掉 */
    --fandex-color-surface: #141414;
  }
}
```

**第 3 步：用 `@theme inline` 把外部变量桥接进 Tailwind。** 这是承上启下的一步——令牌本体在 `tokens.css` 里自管，Tailwind 只负责"把变量名暴露成工具类"：

```css
/* app-web/src/styles/tailwind.css（节选示意） */
@import 'tailwindcss';

@theme inline {
  --color-primary-500: var(--fandex-color-primary-500);
  --color-surface: var(--fandex-color-surface);
}
```

桥接之后，`bg-surface` 在浅色下解析到白色变量、`data-theme='dark'` 时自动解析到深色变量——**组件里没有任何 dark: 前缀，换肤发生在变量层**。

**第 4 步：运行时切换 `data-theme`，且要在绘制前完成。** FANDEX 的做法是在 `BaseLayout` 的 `<head>` 里放一段内联脚本，页面渲染第一帧之前就设好属性：

```html
<script>
  // 内联在 head：晚于首帧就会出现"闪白/闪黑"（FOUC）
  (function () {
    var t = localStorage.getItem('theme') ?? 'light'
    document.documentElement.dataset.theme = t
  })()
</script>
```

为什么选 `data-theme` 属性而不是 `.dark` 类？两者能力等价（第 5 篇的 `@custom-variant` 都能接），但属性选择器可以**直接作为 CSS 变量的作用域**（`[data-theme='dark'] { ... }`），令牌文件不必依赖 Tailwind 的变体机制就能完成换肤——令牌层与工具层解耦，这是三层架构能成立的前提。

## 4. @theme 与 @theme inline：一字之差，两种命运

当令牌引用另一个变量时（第 3 步的桥接），普通 `@theme` 与 `@theme inline` 的编译结果不同：

```css
/* 普通 @theme：工具类引用"令牌变量"本身 */
@theme {
  --color-primary: var(--color-blue-600);
}
/* 编译结果：.bg-primary { background-color: var(--color-primary); } */

/* @theme inline：把值内联进工具类，跳过令牌变量这一跳 */
@theme inline {
  --color-primary: var(--color-blue-600);
}
/* 编译结果：.bg-primary { background-color: var(--color-blue-600); } */
```

取舍判断：

- **需要运行时换肤 -> 普通 `@theme`**。工具类引用令牌变量，覆盖变量即换肤；注意此时令牌要真的输出到 `:root` 才有东西可覆盖。
- **令牌自管在别处（如独立的 tokens.css、shadcn/ui 式的 `.dark` 变量方案）-> `@theme inline`**。Tailwind 不重复输出这些变量，只负责让 `bg-primary` 指向外部变量；`data-theme` 切换作用域后，同一工具类自动拿到新值。

两个真实的坑，都来自 FANDEX 的实践记录：

第一，**跨作用域引用必须 inline**。官方文档明确：当 `var()` 引用的变量定义在更深层选择器（如 `[data-theme='dark']`）时，若不走 `@theme inline`，编译期解析可能取不到值而回退兜底色——症状是"暗色模式下部分颜色死活不变"。

第二，**别在 `@theme` 外混用 `light-dark()` 与 `var()`**。CSS 原生的 `light-dark()` 函数看起来是亮暗适配的"银弹"，但 Tailwind 4 的解析器在 `@theme` 块之外不支持 `light-dark()` 与 `var()` 混合写法——FANDEX 的令牌注释里专门记录了这一点，最终改用 `[data-theme]` 选择器方案。想在 `@theme` 内自定义颜色时也一样：要么写死值，要么走 `@theme inline` 引用外部变量，不要叠 `light-dark()`。

## 5. 令牌的一致性防线：漂移检查

三层令牌落地后会出现一个新问题：**同一份令牌存在于多处**（FANDEX 的令牌源在 `shd-shared/styles/tokens.css`，web 应用里有一份消费拷贝）。有人只改了拷贝、没改源，两边静默漂移，排查成本极高。

解法是把"两份必须一致"变成机器断言。FANDEX 写了一个 drift 检查脚本（`check-tokens-drift.mjs`）：解析两份 CSS 里每个作用域（root / light / dark）的变量声明，逐项比对，发现差异立即报错，并挂在每次 `dev` 与 `build` 的最前面。

```text
检查逻辑（伪代码）：
1. 读取源 tokens.css 与应用内拷贝，按作用域（root/light/dark）解析 --xxx: value
2. 对每个作用域逐变量比对
3. 有任何差异 -> 非零退出，构建失败
```

你不需要照抄这个脚本，但要带走这条纪律：**凡是"同一事实的多份拷贝"，都要有一条机器检查**。令牌、环境变量样例、API 类型定义，道理相同——一致性靠约定守不住，靠 CI 才守得住。

## 6. @utility：令牌之外的补充

需要一个"不属于任何命名空间"的自定义工具类时，用 `@utility` 指令注册，它自动支持 `hover:`、`dark:` 等变体组合：

```css
@utility text-gradient {
  background-image: linear-gradient(to right, #1677ff, #722ed1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

```html
<h2 class="text-gradient hover:opacity-80">渐变标题</h2>
```

使用原则不变：偶尔的例外值用任意值语法；频繁出现的值提升为 `@theme` 令牌；成套的复合样式用 `@utility` 或组件封装。

## 7. 坑点与自检

| 常见错误 | 报错 / 现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 在 `@theme` 外定义 `--color-*` 却期待生成工具类 | `bg-primary` 无效 | 只有 `@theme` 内的令牌才生成工具类 | 令牌移入 `@theme`；外部变量用 `@theme inline` 桥接 |
| 定义 `--primary: #1677ff`（漏了 `color`） | `bg-primary` 不生效 | 前缀不属于任何命名空间 | 用完整命名空间 `--color-primary` |
| 覆盖 `--color-blue-500` 后全站蓝色"失控" | 多处蓝色意外改变 | 覆盖默认令牌影响所有引用处 | 优先新增 `brand-*`，覆盖仅限明确需求 |
| 令牌引用跨作用域变量但没用 inline | 暗色下部分颜色不跟随 | 非 inline 编译在编译期解析 `var()`，深层选择器里的值取不到 | 桥接外部变量一律 `@theme inline` |
| 需要运行时换肤的令牌用了 inline | 切换主题后颜色不变 | 值被内联，变量覆盖失效 | 换肤链路上的令牌走普通 `@theme` + 输出到 `:root` |
| 用 `light-dark()` 混 `var()` 自定义颜色 | 编译解析异常或颜色回退 | Tailwind 4 解析器在 `@theme` 外不支持该组合 | 用 `[data-theme]` 选择器分作用域定义变量 |
| 换肤闪白/闪黑 | 深色用户首帧看到白底 | `data-theme` 设置晚于首帧 | 内联脚本在 `<head>` 里同步执行 |
| 令牌多份拷贝各改各的 | 同名变量两处值不一致 | 无一致性检查 | 补 drift 检查并接入构建流程 |

自检清单：

- [ ] 能说出 `@theme` 里一个变量的两重身份（CSS 变量 + 工具类来源）
- [ ] 能画出 primitive / semantic / component 三层的依赖方向，并解释为什么箭头只能朝上
- [ ] 能说清 `@theme` 与 `@theme inline` 各自的适用场景
- [ ] 能解释为什么换肤脚本必须内联在 `<head>` 同步执行
- [ ] 知道自己项目里令牌的"唯一事实源"在哪，改动要落在哪一层

## 8. 动手实践

1. **品牌色三级跳**：在练手项目里定义 `--color-brand-500`（primitive 值写死）-> `--color-primary: var(--color-brand-500)`（semantic 引用）-> 页面上用 `bg-primary`；然后把 `--color-brand-500` 换一个色值，确认所有 `bg-primary` 跟随。提示：观察 DevTools 里 `.bg-primary` 的计算值来自哪个变量。
2. **inline 对照实验**：把第 1 步的桥接改成 `@theme inline`，再用 JS `document.documentElement.style.setProperty('--color-primary', '#0ea5e9')` 尝试运行时换色，对比普通 `@theme` 下的效果——亲手验证"inline 之后变量覆盖失效"。
3. **给 FANDEX 式令牌补 dark 值**：照第 3 节的结构，给你的项目加 `[data-theme='dark']` 作用域，让 `--color-surface` 有亮暗两套值，并补上 `<head>` 内联切换脚本。提示：切换后到 DevTools 的 Computed 面板确认变量值真的换了作用域。

## 9. 一句话记忆

**设计令牌 = 起了名字的设计决策；`@theme` 声明令牌，一个变量同时变身"CSS 变量 + 全套工具类"；三层令牌 + `@theme inline` 桥接 + `data-theme` 作用域，就是"改一处、全站换肤"的完整管线——再补一条 drift 检查守住一致性。**

## 10. 下一步

- 亮暗切换的变体语法（`dark:`、`@custom-variant`）在[响应式与暗色模式](/tailwind/060-ResponsiveDark)系统展开，与本篇的 `data-theme` 方案配套食用。
- 令牌落到组件的复用方式（cva + cn）见[组件复用](/tailwind/070-ComponentReuse)。
- `@theme` 所属的 CSS-first 架构全景见[v4 新特性](/tailwind/080-V4Features)。
