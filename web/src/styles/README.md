# 设计系统

## 职责

集中管理 Design Tokens 与全局样式，定义应用的视觉语言基础。本目录是颜色、间距、字号、阴影、动画等设计变量的唯一来源，保证全站视觉一致性。

## 依赖规则

- 仅包含 CSS、SCSS 等样式文件，禁止包含 TypeScript 或 JavaScript 逻辑。
- Design Tokens 以 CSS Custom Properties 形式暴露，供组件消费。
- 全局样式按职责拆分，禁止在一个文件中混合多个层级的样式规则。

## 目录结构

Phase 1.2 将在此目录下创建以下文件：

- `tokens.css` — Design Tokens：颜色、间距、字号、阴影、圆角等基础变量。
- `base.css` — 基础样式：重置样式、元素默认样式、全局背景与字体。
- `typography.css` — 排版规则：标题、正文、代码块、引用等的排版层级。

## 示例

```css
/* tokens.css */
:root {
  --color-primary: #2563eb;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --spacing-unit: 0.25rem;
  --font-size-base: 1rem;
}
```

```css
/* base.css */
@import './tokens.css';

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-size: var(--font-size-base);
}
```

## 迁移说明

本目录为 Phase 1.1 新建占位，现有散落在组件内的全局样式与设计变量将在 Phase 1.2 统一迁移并重构至此。
