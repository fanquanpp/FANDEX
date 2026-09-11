---
order: 320
title: React 无障碍
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 无障碍实战：语义化 HTML 与 ARIA 分工、表单标注与错误播报、键盘导航与焦点管理（弹窗焦点圈禁）、aria-live 动态播报、jsx-a11y 与 jest-axe 工具链。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/300-ReactGraphQL'
  - 'react/310-ReactMicroFrontend'
  - 'react/330-ReactPWA'
  - 'react/340-ReactCanvas'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

无障碍（accessibility，常缩写 a11y）是让读屏用户、键盘用户、低视力用户也能完成同样的操作——它不是"给少数人的公益"，而是 SEO、弱网、老化用户的共同下限。React 的角色很克制：**它渲染什么 DOM，读屏就读什么**，所以 a11y 问题 90% 出在"该用什么元素与属性"上，而不是 React 特有的技巧。原则优先级：**语义化 HTML 优先，不够再用 ARIA 补**——`<button>` 自带键盘焦点与"按钮"角色，换成 `<div onClick>` 后你需要 ARIA + tabIndex + 键盘事件三件套才勉强追平，且仍然不如原生的可靠。

## 2. 语义优先：元素本身就是 API

```tsx
// 反面：一切皆 div —— 读屏不知道这是按钮，Tab 也聚焦不到
<div className="btn" onClick={submit}>提交</div>

// 正面：语义元素自带角色、键盘行为、焦点能力
<button onClick={submit}>提交</button>
```

清单式自查：

- **标题**：每页一个 `h1`，层级不跳级（h2 下不直接出现 h4）；标题层级是读屏用户的"目录"。
- **地标**：`<header>` `<nav>` `<main>` `<footer>` 让读屏可以按区域跳转；`<main>` 每页一个。
- **列表**：导航、消息流用 `<ul>`/`<ol>`，读屏会播报"列表，共 N 项"。
- **链接 vs 按钮**：去别的地方是 `<a href>`（可中键新开、可收藏），执行动作是 `<button>`——混用是最高频的语义错误。
- **lang 属性**：`<html lang="zh-CN">` 决定读屏用什么语音引擎。

## 3. 表单：label、错误与描述

```tsx
import { useId, useState } from 'react';

export function EmailField() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  // useId 生成 SSR 安全的唯一 id：label 与控件的桥梁
  const id = useId();
  const errId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) setError('请输入有效的邮箱地址');
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id}>邮箱</label>
      <input
        id={id}
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        aria-invalid={!!error}            // 标记非法状态
        aria-describedby={error ? errId : undefined} // 关联错误描述
      />
      {error && <p id={errId} role="alert">{error}</p>} {/* role=alert 让读屏立即播报 */}
    </form>
  );
}
```

要点：`placeholder` 不是 label（输入后消失、对比度低），每个输入框都要真实 `<label>`；错误必须能被"听到"——`role="alert"` 或 `aria-live` 播报，只把文字标红对读屏用户等于没说。

## 4. 键盘：顺序、焦点与跳转

- **别乱动 Tab 顺序**：`tabIndex={0}` 让自定义元素可聚焦；`tabIndex={-1}` 只允许程序聚焦；**正数 tabIndex（1/2/3...）一律禁用**，它会把全局顺序搅乱。
- **跳过导航**：第一个 Tab 应能跳过整站导航直抵正文（skip link）：

```tsx
<a href="#main" className="skip-link">跳到主要内容</a>
{/* 视觉隐藏、聚焦时出现：.skip-link { position:absolute; left:-9999px } .skip-link:focus { left: 8px; top: 8px } */}
<main id="main">...</main>
```

- **自定义控件的键盘契约**：用 `<div role="listbox">` 就要补方向键、Enter/Esc——这也是"能用原生就用原生"的原因。第三方无障碍组件库（Radix UI、React Aria）已把这些键盘行为做对，值得优先考虑。
- **焦点可见**：别写 `outline: none` 而不提供替代焦点样式；键盘用户靠焦点环定位。

## 5. 弹窗的焦点管理：圈禁与归还

模态弹窗的经典问题：打开后焦点还在背景，键盘 Tab 会"跑出"弹窗。规范做法是三步——打开时聚焦弹窗、期间把背景标记 `inert`（整棵子树不可交互、不可聚焦）、关闭时归还焦点：

```tsx
import { useEffect, useRef } from 'react';

function ConfirmDialog({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement; // 记住触发元素
      dialogRef.current?.focus();
      // inert：现代浏览器原生支持，把背景变成"不可达"
      document.getElementById('app-root')?.setAttribute('inert', '');
      return () => {
        document.getElementById('app-root')?.removeAttribute('inert');
        restoreRef.current?.focus(); // 归还焦点，读屏上下文不丢
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
      tabIndex={-1}
    >
      <h2 id="dlg-title">{title}</h2>
      {children}
      <button onClick={onClose}>关闭</button>
    </div>
  );
}
```

预期行为：打开弹窗瞬间焦点进入对话框，按 Tab 循环不出弹窗（背景已 inert），关闭后焦点回到打开前的按钮上。原生 `<dialog>` 元素（含 `showModal()`）自带这些行为，能用则优先。

## 6. 动态内容播报：aria-live

异步更新的内容（搜索结果数、toast、倒计时）对读屏用户是"静默发生"的，需要 live region：

```tsx
function SearchResultCount({ count }: { count: number }) {
  return (
    <p aria-live="polite" aria-atomic="true">
      {/* polite：等读屏说完再说；assertive：打断播报（仅用于错误等紧急内容） */}
      共找到 {count} 条结果
    </p>
  );
}
```

规则：live region 的容器必须**从一开始就挂载**（后改内容才播报，后挂载的容器不播）；数字、余额等频繁刷新的内容不要用 assertive，会打断用户操作。

## 7. 图片、颜色与动效

- **alt 的三种情况**：有信息（`alt="销售额环比增长 12% 的折线图"`）、纯装饰（`alt=""`，读屏跳过）、复杂图表（alt 概述 + 长描述用 `aria-describedby`）。
- **对比度**：正文至少 4.5:1（大字 3:1）；"仅用颜色表达状态"是失败项——错误标红的同时要有图标或文字。
- **动效偏好**：尊重 `prefers-reduced-motion`，见[React 动画](/react/250-ReactAnimation)第 6 节。

## 8. 工具链：静态检查、自动测试、人工冒烟

```bash
# 静态检查：Lint 阶段抓常见问题（img 缺 alt、onClick 无键盘事件等）
npm install -D eslint-plugin-jsx-a11y
```

```jsonc
// eslint 配置
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

```tsx
// 自动化测试：jest-axe 扫描渲染结果的常见违规
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

it('表单无可访问性违规', async () => {
  const { container } = render(<EmailField />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

工具只能覆盖可枚举的问题（约三分之一），剩余靠人工冒烟：只用键盘走一遍核心流程、开系统读屏（Windows 的 NVDA、macOS 的 VoiceOver）听一遍关键页面。

## 9. 常见陷阱

- **`<div onClick>` 冒充按钮**：无角色、无焦点、无 Enter/Space——读屏听不到、键盘点不到；换 `<button>` 一行解决。
- **aria 滥用**：`role="button"` 加在真 `<button>` 上是冗余；`aria-hidden` 加在仍可聚焦的元素上会造成"聚焦了但听不见"的黑洞（aria-hidden 元素内不能有可聚焦内容）。
- **打开弹窗不管焦点**：背景可 Tab、关闭后焦点丢失到 body——按第 5 节三步处理。
- **用 aria-label 翻译文案硬编码**：多语言场景 aria-label 也要走 i18n（见[React 国际化](/react/240-ReactI18n)），否则读屏语言与页面语言不一致。
- **live region 后挂载**：条件渲染的 `role="alert"` 容器首次出现会播报，但"同一容器更新文本"的播报依赖容器常驻；需要反复播报时让容器常驻、只换内容。
- **只跑 axe 就安心**：axe 查不出"焦点顺序是否合理""文案是否有意义"这类语义问题，人工键盘 + 读屏冒烟不可省。

## 10. 小结

初学者要点：

- 语义 HTML 就是最好的 a11y：button/a/label/h1/landmark 用对，大半问题消失；`<div onClick>` 是头号反模式。
- 表单三件套：真实 `<label htmlFor>`、错误 `role="alert"`、状态 `aria-invalid` + `aria-describedby`。
- 图片 alt 按信息量分级，装饰图 `alt=""`。

进阶注意：

- 弹窗焦点管理三步：进入聚焦、`inert` 圈禁背景、关闭归还焦点；原生 `<dialog>` 优先。
- 动态内容用常驻 `aria-live` 容器播报，等级 polite 为主。
- 工具链三层：eslint-plugin-jsx-a11y（编码期）、jest-axe（测试期）、键盘 + 读屏冒烟（上线前）。

## 速查

**用户偏好减少动画**

```tsx
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduce) animate();
```

**ESLint 可访问性插件**

```bash
npm install -D eslint-plugin-jsx-a11y
```

```json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

**测试可访问性**

```tsx
import { axe } from 'jest-axe';
const results = await axe(container);
expect(results).toHaveNoViolations();
```

**常用属性速记**

```tsx
<label htmlFor={id} />            {/* 标注控件 */}
<input aria-describedby={errId} aria-invalid />
<p role="alert" />                {/* 立即播报错误 */}
<div aria-live="polite" />        {/* 温和播报更新 */}
<div role="dialog" aria-modal="true" aria-labelledby="t" />
<img alt="" />                    {/* 纯装饰图 */}
<el tabIndex={0} />               {/* 可聚焦；禁用正数 tabIndex */}
```
