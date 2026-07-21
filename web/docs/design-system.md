# FANDEX-web 设计系统

本文件是 FANDEX-web 视觉语言的唯一权威，定义 Design Tokens、组件库使用规范、双主题切换机制与自定义组件开发指南。任何涉及视觉表现的变更须先对照本文档评估一致性。

## Design Tokens 概览

Design Tokens 是设计系统的原子单位，集中定义在 `src/styles/tokens.css`，全站使用 `--fandex-` 前缀避免冲突。Tokens 覆盖九大类别：

| 类别 | 命名前缀                         | 说明                                       |
| :--- | :------------------------------- | :----------------------------------------- |
| 颜色 | `--fandex-color-*`               | 基础色板、语义色、文本色、背景色、边框色   |
| 排版 | `--fandex-font-*`                | 字族、字号、行高、字重、字距、段落间距     |
| 间距 | `--fandex-spacing-*`             | 4px 基础栅格，0 至 32 步进                 |
| 圆角 | `--fandex-radius-*`              | 从 none 到 full 的 9 档圆角                |
| 阴影 | `--fandex-shadow-*`              | 8 档投影 + 内阴影                          |
| 动效 | `--fandex-duration-*` / `ease-*` | 时长、缓动函数、延迟                       |
| 断点 | `--fandex-breakpoint-*`          | sm / md / lg / xl / 2xl 五档（仅 JS 读取） |
| 层级 | `--fandex-z-*`                   | z-index 7 档，从 base 到 notification      |
| 过渡 | `--fandex-transition-*`          | 预定义的过渡组合                           |

### 使用原则

1. **唯一来源**：所有视觉参数必须从 Tokens 引用，禁止硬编码颜色、尺寸、时长
2. **语义优先**：组件应使用语义 Token（如 `--fandex-color-text-primary`），而非基础色板（如 `--fandex-color-neutral-900`）
3. **主题感知**：组件通过 `var()` 引用 Token，主题切换时自动更新，无需手动适配
4. **命名一致**：新增 Token 须遵循现有命名规范，`--fandex-<category>-<variant>`

## 颜色系统

### 基础色板

FANDEX-web 采用四色基础色板，每色 11 档（50 至 950）：

| 色板      | 色相         | 用途                     | 主色值（500） |
| :-------- | :----------- | :----------------------- | :------------ |
| Primary   | Sky 天蓝     | 主品牌色、链接、按钮主色 | `#0ea5e9`     |
| Secondary | Teal 蓝绿    | 辅助品牌色、次级强调     | `#14b8a6`     |
| Accent    | Amber 琥珀   | 强调色、关键交互、高亮   | `#f59e0b`     |
| Neutral   | Slate 石板灰 | 文字、背景、边框、分隔线 | `#64748b`     |

### 语义色

基础色板通过语义映射服务于组件，所有组件应优先使用语义色：

| 语义色  | 亮色模式值 | 暗色模式值 | 用途               |
| :------ | :--------- | :--------- | :----------------- |
| success | `#059669`  | `#34d399`  | 成功提示、完成状态 |
| warning | `#b45309`  | `#fbbf24`  | 警告、注意事项     |
| error   | `#be123c`  | `#fb7185`  | 错误、危险操作     |
| info    | `#0369a1`  | `#38bdf8`  | 信息提示           |

每个语义色提供 5 个变体：默认、light、dark、bg、border，覆盖文本、背景、边框三种使用场景。

### 文本与背景

文本色分四级（primary / secondary / tertiary / disabled），背景色分三层深度（base / surface / elevated / sunken），通过组合营造视觉层次。暗色模式重新映射语义层令牌，基础色板保持不变。

### 对比度

所有文本色与背景色组合满足 WCAG AA 4.5:1 标准。暗色模式下提亮主色（使用 400 而非 500）以保证在深色背景上的可读性。

## 排版系统

### 字族

| 字族    | 用途           | 字体栈                                                         |
| :------ | :------------- | :------------------------------------------------------------- |
| sans    | 默认正文       | Inter, -apple-system, PingFang SC, Microsoft YaHei, sans-serif |
| serif   | 长文阅读、引文 | Source Serif Pro, Source Han Serif SC, Noto Serif SC, serif    |
| mono    | 代码           | JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace  |
| display | 大标题         | Inter（与 sans 同源，字距收紧）                                |

### 字号

12 档字号，基准 1rem = 16px：

| Token            | 值       | 用途          |
| :--------------- | :------- | :------------ |
| `font-size-xs`   | 0.75rem  | 12px 辅助文字 |
| `font-size-sm`   | 0.875rem | 14px 次要文字 |
| `font-size-base` | 1rem     | 16px 正文基准 |
| `font-size-lg`   | 1.125rem | 18px 略大正文 |
| `font-size-xl`   | 1.25rem  | 20px 小标题   |
| `font-size-2xl`  | 1.5rem   | 24px 中标题   |
| `font-size-3xl`  | 1.875rem | 30px 大标题   |
| `font-size-4xl`  | 2.25rem  | 36px 主标题   |
| `font-size-5xl`  | 3rem     | 48px 页面标题 |
| `font-size-6xl`  | 3.75rem  | 60px 英雄标题 |

### 行高与字距

- 行高分 5 档：tight（1.2）/ snug（1.375）/ normal（1.5）/ relaxed（1.625）/ loose（2）
- 中文正文使用 `relaxed`（1.625）保证阅读舒适度
- 字距分 5 档：tighter（-0.05em）/ tight / normal / wide（0.025em）/ wider（0.05em）
- 大标题使用 `tight` 收紧，按钮与标签使用 `wide` 放宽

## 间距系统

采用 4px 基础栅格，13 档间距：

| Token        | 值      | 用途              |
| :----------- | :------ | :---------------- |
| `spacing-0`  | 0       | 无间距            |
| `spacing-1`  | 0.25rem | 4px 微小间距      |
| `spacing-2`  | 0.5rem  | 8px 紧凑间距      |
| `spacing-3`  | 0.75rem | 12px              |
| `spacing-4`  | 1rem    | 16px 标准间距     |
| `spacing-5`  | 1.25rem | 20px              |
| `spacing-6`  | 1.5rem  | 24px              |
| `spacing-8`  | 2rem    | 32px 区块间距     |
| `spacing-10` | 2.5rem  | 40px              |
| `spacing-12` | 3rem    | 48px 大区块间距   |
| `spacing-16` | 4rem    | 64px 章节间距     |
| `spacing-20` | 5rem    | 80px              |
| `spacing-24` | 6rem    | 96px 页面章节间距 |
| `spacing-32` | 8rem    | 128px 英雄区间距  |

## 圆角与阴影

### 圆角

9 档圆角，覆盖从微小到圆形的全场景：

| Token            | 值       | 用途        |
| :--------------- | :------- | :---------- |
| `radius-none`    | 0        | 无圆角      |
| `radius-sm`      | 0.125rem | 2px 微小    |
| `radius-default` | 0.25rem  | 4px 默认    |
| `radius-md`      | 0.375rem | 6px 中等    |
| `radius-lg`      | 0.5rem   | 8px 大      |
| `radius-xl`      | 0.75rem  | 12px 卡片   |
| `radius-2xl`     | 1rem     | 16px 模态   |
| `radius-3xl`     | 1.5rem   | 24px 大模态 |
| `radius-full`    | 9999px   | 圆形        |

### 阴影

8 档投影 + 内阴影，亮色模式柔和克制，暗色模式更深更柔：

| Token            | 用途                   |
| :--------------- | :--------------------- |
| `shadow-xs`      | 微弱投影，分隔相邻元素 |
| `shadow-sm`      | 小投影，卡片默认       |
| `shadow-default` | 默认投影               |
| `shadow-md`      | 中等投影，悬停态       |
| `shadow-lg`      | 大投影，下拉菜单       |
| `shadow-xl`      | 更大投影，弹层         |
| `shadow-2xl`     | 最大投影，模态         |
| `shadow-inner`   | 内阴影，输入框凹陷     |

## 动效系统

### 时长

5 档时长，匹配不同交互场景：

| Token              | 值    | 用途                 |
| :----------------- | :---- | :------------------- |
| `duration-instant` | 75ms  | 即时反馈（颜色切换） |
| `duration-fast`    | 150ms | 快速（悬停、焦点）   |
| `duration-normal`  | 250ms | 常规（展开、收起）   |
| `duration-slow`    | 400ms | 慢速（页面过渡）     |
| `duration-slower`  | 600ms | 极慢（复杂动画）     |

### 缓动函数

7 种缓动函数，覆盖常见交互模式：

| Token          | 曲线                                   | 推荐场景     |
| :------------- | :------------------------------------- | :----------- |
| `ease-default` | cubic-bezier(0.4, 0, 0.2, 1)           | 默认入出     |
| `ease-in`      | cubic-bezier(0.4, 0, 1, 1)             | 加速         |
| `ease-out`     | cubic-bezier(0, 0, 0.2, 1)             | 减速（推荐） |
| `ease-in-out`  | cubic-bezier(0.4, 0, 0.2, 1)           | 入出         |
| `ease-spring`  | cubic-bezier(0.34, 1.56, 0.64, 1)      | 弹簧         |
| `ease-bounce`  | cubic-bezier(0.68, -0.55, 0.265, 1.55) | 弹跳         |
| `ease-linear`  | linear                                 | 机械感       |

### 预定义过渡

为常见场景预定义过渡组合，直接通过 `transition: var(--fandex-transition-colors)` 引用：

- `transition-colors`：颜色、背景色、边框色、fill、stroke
- `transition-opacity`：透明度
- `transition-shadow`：阴影
- `transition-transform`：变换
- `transition-all`：全部属性

## 双主题切换机制

### 切换策略

FANDEX-web 支持亮色与暗色双主题，采用「CSS 变量 + data-theme 属性」方案：

1. 默认在 `:root` 定义亮色令牌
2. `[data-theme='dark']` 选择器覆盖暗色令牌
3. `prefers-color-scheme: dark` 媒体查询作为系统偏好兜底
4. 防闪烁脚本在 HTML 解析前根据 localStorage 或系统偏好设置 `data-theme`

### 优先级

| 优先级 | 来源                            | 说明                       |
| :----- | :------------------------------ | :------------------------- |
| 1      | `[data-theme="dark"]` 显式设置  | 用户主动选择，最高优先级   |
| 2      | `[data-theme="light"]` 显式设置 | 用户主动选择               |
| 3      | `prefers-color-scheme: dark`    | 系统偏好，未显式设置时生效 |

### 防闪烁脚本

为避免页面加载时短暂显示错误主题，在 `<head>` 中内联执行：

```html
<script>
  // 在 HTML 解析前设置 data-theme，避免主题闪烁
  (function () {
    const stored = localStorage.getItem('theme');
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

### 暗色模式设计原则

- 基础色板（50-950）保持不变，仅重新映射语义层令牌
- 暗色背景使用 `slate-900 (#0F172A)` 而非纯黑，避免压抑感
- 文字使用 `slate-100/200/400` 保证层次与对比度
- 阴影加深加柔，模拟暗环境下光线的漫反射
- 语义色提亮（如 success 从 600 提至 400）以保证深色背景上的可读性

### 主题切换组件

`src/islands/ThemeToggle.vue` 实现主题切换：

1. 读取当前 `data-theme`，无设置时根据系统偏好初始化
2. 点击切换 `data-theme`，同步写入 `localStorage`
3. 监听 `prefers-color-scheme` 变化，未显式设置时跟随系统

## shadcn-vue 组件使用

FANDEX-web 采用 [shadcn-vue](https://shadcn-vue.com) 组件库，基于 radix-vue 实现。组件源码归项目所有，存放于 `src/ui/components/`。

### 配置

组件库配置文件 `components.json`：

```json
{
  "style": "default",
  "typescript": true,
  "tailwind": {
    "css": "src/styles/tailwind.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/ui/components",
    "composables": "@/ui/composables",
    "utils": "@/lib/utils",
    "ui": "@/ui",
    "lib": "@/lib"
  },
  "iconLibrary": "lucide"
}
```

### 已集成组件

| 组件       | 路径                         | 用途                                     |
| :--------- | :--------------------------- | :--------------------------------------- |
| Accordion  | `ui/components/accordion/`   | 折叠面板，FAQ 与详细说明                 |
| Badge      | `ui/components/badge/`       | 标签、状态标记                           |
| Button     | `ui/components/button/`      | 按钮，多变体（default/outline/ghost 等） |
| Card       | `ui/components/card/`        | 卡片容器                                 |
| Dialog     | `ui/components/dialog/`      | 模态对话框                               |
| ScrollArea | `ui/components/scroll-area/` | 自定义滚动条                             |
| Tabs       | `ui/components/tabs/`        | 标签页切换                               |
| Tooltip    | `ui/components/tooltip/`     | 悬浮提示                                 |

### 引用方式

UI 层通过统一入口引用：

```typescript
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/ui/components';
```

### 添加新组件

通过 CLI 添加：

```bash
npx shadcn-vue@latest add <component-name>
```

组件将生成至 `src/ui/components/<component-name>/`，包含：

- 主组件 `.vue` 文件
- 变体定义 `*-variants.ts`（如适用）
- 导出索引 `index.ts`

添加后须在 `src/ui/components/index.ts` 中聚合导出。

## 自定义组件指南

### 命名规范

- Astro 组件：`PascalCase.astro`（如 `ModuleCard.astro`）
- Vue 岛屿：`PascalCase.vue`（如 `SearchDialog.vue`）
- shadcn-vue 组件：与官方命名一致（如 `Button.vue`）

### 样式策略

1. **优先 Tailwind**：组件内样式优先使用 Tailwind 工具类
2. **Token 引用**：颜色、间距、圆角等须通过 `var(--fandex-*)` 或 Tailwind 主题映射引用
3. **作用域样式**：组件特有样式使用 `<style scoped>` 或 Astro 局部样式
4. **避免 !important**：通过提升选择器特异性解决优先级问题

### 示例：自定义卡片组件

```vue
<script setup lang="ts">
import type { PropType } from 'vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/components';

interface DocCardData {
  title: string;
  description: string;
  module: string;
}

defineProps({
  data: {
    type: Object as PropType<DocCardData>,
    required: true,
  },
});
</script>

<template>
  <Card class="hover:shadow-md transition-shadow" data-testid="doc-card">
    <CardHeader>
      <CardTitle class="text-fandex-primary">{{ data.title }}</CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">{{ data.description }}</p>
      <span class="text-xs text-fandex-text-tertiary">{{ data.module }}</span>
    </CardContent>
  </Card>
</template>
```

### 可访问性

所有自定义组件须满足 WCAG AA 标准：

- 键盘导航：所有交互元素可通过 Tab 访问，焦点可见
- 屏幕阅读器：语义化 HTML + ARIA 属性
- 对比度：文字与背景对比度 ≥ 4.5:1
- 焦点指示：使用 `:focus-visible` 提供清晰焦点环

### 响应式

- 移动端优先：默认样式适配移动端，通过 `sm:` / `md:` / `lg:` 渐进增强
- 断点对齐 Tailwind v4 默认断点（640px / 768px / 1024px / 1280px / 1536px）
- 触控目标：移动端可点击元素最小 44x44px

## 设计系统演示页

`src/pages/design-system.astro` 是设计系统的可视化演示页，展示所有 Token 与组件的实际效果，用于：

- 视觉回归测试参照
- 设计稿与实现对照
- 新成员快速了解设计语言

修改 Token 或组件后须同步更新演示页，确保演示内容与实际一致。

## 参考文档

- [架构文档](./architecture.md) — 三层架构与目录结构
- [贡献指南](./contributing.md) — 内容贡献流程与质量基准
- [Tailwind CSS v4 文档](https://tailwindcss.com)
- [shadcn-vue 官方文档](https://shadcn-vue.com)
- [radix-vue 官方文档](https://radix-vue.com)
