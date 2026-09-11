---
order: 180
title: 无障碍访问
module: 'html5'
category: 前端技术
difficulty: intermediate
description: Web无障碍访问（A11y）核心概念、ARIA属性、键盘导航、屏幕阅读器适配与WCAG标准。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/100-HTML5BasicContentTags'
  - 'html5/170-SemanticTag'
  - 'html5/190-HTML5FormValidation'
  - 'html5/230-HTML5MultimediaCanvasDrawing'
prerequisites: []
---

> 前置依赖：先读 008 语义化标签。入门必读：第 1-2 章与 4.4 键盘体验；ARIA 组件实现（3.3/6.2）为进阶选读。

## 0. 盲人如何“看”网页？——理解无障碍的意义

你可能从未想过：一个盲人是怎么浏览网页的？

他们用的是屏幕阅读器——一种把网页内容“读”出来的软件。光标移到哪里，就读到哪里。

问题来了：如果网页结构混乱，屏幕阅读器就会读出“链接、链接、按钮、链接”……用户完全不知道这些是干嘛的。

无障碍（A11y）的目标就是：让每个人——无论是否使用屏幕阅读器、是否用键盘操作、是否有色觉障碍——都能正常使用网页。

> 这节课的目标：学会最基本的无障碍写法。你会发现，做好无障碍，就是在帮所有人，包括未来的你自己（比如手受伤只能用键盘时）。

## 1. 无障碍访问概述

### 1.1 什么是 Web 无障碍

Web无障碍（Web Accessibility，简称 A11y）确保网站和Web应用对所有用户可用，包括有视觉、听觉、运动或认知障碍的人群。

### 1.2 WCAG 四原则：从用户视角理解

Web 内容无障碍指南（WCAG）围绕四个原则，从用户视角看就是：

| 原则 | 如果没做到…… | 谁会被影响 |
| --- | --- | --- |
| **可感知（Perceivable）** | 图片没有 `alt`，盲人不知道图里是什么 | 视障用户 |
| **可操作（Operable）** | 按钮只能用鼠标点击，键盘用户没法操作 | 运动障碍、临时受伤的用户 |
| **可理解（Understandable）** | 页面用语晦涩、导航混乱 | 认知障碍、非母语用户 |
| **健壮性（Robust）** | 大量 `div` 模拟按钮，读屏软件认不出来 | 使用辅助技术的所有用户 |

> 一句话记住：无障碍不是“给少数人用的功能”，而是“让所有用户都能平等访问”的设计原则。

### 1.3 无障碍的商业价值

- 全球约15%的人口有某种形式的残疾
- 无障碍改善所有用户体验（如移动端、慢速网络）
- 法律合规要求（如ADA、EN 301 549）
- SEO提升（语义化HTML同时利于搜索引擎）

## 2. 语义化HTML与无障碍

### 2.1 正确使用HTML元素

```html
<!-- 错误：用div模拟按钮 -->
<div class="btn" onclick="submit()">提交</div>
<!-- 问题：不可键盘聚焦、屏幕阅读器不识别 -->

<!-- 正确：使用原生button -->
<button type="submit">提交</button>
<!-- 优势：可键盘聚焦、可回车触发、屏幕阅读器识别 -->

<!-- 错误：用div模拟链接 -->
<div class="link" onclick="navigate()">点击这里</div>

<!-- 正确：使用原生a标签 -->
<a href="/page">点击这里</a>

<!-- 错误：用span模拟标题 -->
<span class="title" style="font-size:24px;font-weight:bold">标题</span>

<!-- 正确：使用h1-h6 -->
<h2>标题</h2>
```

**讲解：**

- 原生 `button`/`a`/`h1`-`h6` 自带焦点、键盘事件与语义，`div` 模拟需要手工补齐全部行为；
- `onclick` 只能响应鼠标，键盘用户无法触发 `div` 的“点击”；
- 规则可概括为“能原生就别模拟”，这是无障碍的第一优先级。

### 2.2 图片无障碍

```html
<!-- 有意义的图片：提供alt描述 -->
<img src="chart.png" alt="2026年Q1销售额增长15%的柱状图" />

<!-- 装饰性图片：alt留空 -->
<img src="decorative-line.png" alt="" role="presentation" />

<!-- 图标字体 -->
<span class="icon-search" aria-hidden="true"></span>
<span class="sr-only">搜索</span>

<!-- 复杂图片：使用长描述 -->
<figure>
  <img src="infographic.png" alt="公司发展历程信息图" />
  <figcaption>详细描述：公司从2010年成立至今的发展里程碑...</figcaption>
</figure>
```

**讲解：**

- 有意义的图片用 `alt` 描述内容；装饰图片 `alt=""` 即可让读屏跳过（`role="presentation"` 属于锦上添花的重复声明，写了不扣分，但别以为不写就出错）；
- 图标字体本身无语义，用 `aria-hidden="true"` 屏蔽，再补 `sr-only` 可见文本；
- 复杂图表在 `figcaption` 中提供长描述，`alt` 保持一句话概括。

### 2.3 表单无障碍

```html
<form>
  <!-- 方式1：label包裹 -->
  <label>
    用户名：
    <input type="text" name="username" required />
  </label>

  <!-- 方式2：label的for属性 -->
  <label for="email">邮箱：</label>
  <input type="email" id="email" name="email" required aria-describedby="email-hint" />
  <span id="email-hint" class="hint">请输入有效的邮箱地址</span>

  <!-- 必填字段提示 -->
  <!-- 星号仅供视觉识别；读屏的"必填"信息由 required 属性原生播报，星号对辅助技术隐藏 -->
  <label for="phone"> 电话：<span aria-hidden="true">*</span> </label>
  <input type="tel" id="phone" name="phone" required />

  <!-- 错误提示 -->
  <label for="password">密码：</label>
  <input
    type="password"
    id="password"
    name="password"
    aria-describedby="password-error"
    aria-invalid="true"
  />
  <span id="password-error" role="alert" class="error"> 密码至少需要8个字符 </span>

  <!-- 分组表单 -->
  <fieldset>
    <legend>联系方式偏好</legend>
    <label><input type="radio" name="contact" value="email" /> 邮件</label>
    <label><input type="radio" name="contact" value="phone" /> 电话</label>
  </fieldset>
</form>
```

**讲解：**

- `label` 的两种关联方式（包裹式与 `for`/`id` 式）都能让点击文字聚焦输入框；
- `aria-describedby` 把提示文本与输入框关联，读屏用户输入时能听到提示；
- 必填提示用 `required` 原生表达（读屏会播报"必填"），视觉星号用 `aria-hidden="true"` 屏蔽即可——给 `<span>` 这类泛型元素写 `aria-label` 是无效的，它们不支持命名；
- `aria-invalid="true"` 配合 `role="alert"` 的错误提示，让校验结果即时可感知；
- `fieldset` + `legend` 为单选组提供分组标题，避免读屏用户迷失选项含义。

## 3. ARIA 属性

### 3.1 ARIA 角色与属性

ARIA（Accessible Rich Internet Applications）为复杂组件提供语义信息。

```html
<!-- 角色role：nav 元素自带 navigation 地标角色，role 属性可省略；aria-label 用于区分多个导航区 -->
<nav aria-label="主导航">
  <ul>
    <!-- 站点导航就是普通链接：不要加 role="menuitem"，
         menu/menuitem 是给"应用式菜单组件"（带方向键交互）用的，用在站点导航反而会误导读屏用户 -->
    <li><a href="/">首页</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>

<!-- 常用ARIA角色 -->
<div role="alert">操作成功！</div>
<!-- 警告/通知 -->
<div role="dialog" aria-modal="true">...</div>
<!-- 对话框 -->
<div role="tablist">...</div>
<!-- 标签列表 -->
<div role="tab">...</div>
<!-- 标签 -->
<div role="tabpanel">...</div>
<!-- 标签面板 -->
<div role="progressbar">...</div>
<!-- 进度条 -->
<div role="tooltip">...</div>
<!-- 工具提示 -->
```

**讲解：**

- `role` 声明组件的“语义身份”，例如 `alert`、`dialog`、`tab`、`progressbar`；
- `aria-label` 为没有可见文字的组件补充名称，读屏播报时使用；
- ARIA 角色只影响辅助技术，不改变视觉与交互行为，必须配合实现相应行为。

### 3.2 常用 ARIA 属性

ARIA 属性不需要全部背下来。先记住最常用的 3 个，其余遇到再查：

| 属性 | 用途 | 什么时候用 |
| --- | --- | --- |
| `aria-label` | 给元素起一个读屏能听到的名字 | 图标按钮没有文字时 |
| `aria-hidden="true"` | 告诉读屏忽略这个元素 | 纯装饰图标、重复性内容 |
| `aria-expanded` | 告诉读屏展开/折叠状态 | 菜单、手风琴、下拉框 |

了解即可：`aria-labelledby`（引用已有文本作名称）、`aria-describedby`（关联描述文本）、`aria-current`（标记当前项）、`aria-live`（动态更新播报）、`aria-disabled`（语义禁用）。

```html
<!-- aria-label：提供不可见的标签 -->
<button aria-label="关闭菜单" class="close-btn"></button>

<!-- aria-labelledby：用其他元素的ID作为标签 -->
<div id="dialog-title">确认删除</div>
<div role="dialog" aria-labelledby="dialog-title">
  <p>确定要删除这条记录吗？</p>
</div>

<!-- aria-describedby：描述信息 -->
<input type="text" aria-describedby="help-text" />
<span id="help-text">请输入6-12位字母数字组合</span>

<!-- aria-hidden：对辅助技术隐藏 -->
<span class="icon" aria-hidden="true"></span>
<span class="sr-only">收藏</span>

<!-- aria-expanded：展开/折叠状态 -->
<button aria-expanded="false" aria-controls="menu">菜单</button>
<ul id="menu" role="menu" hidden>
  <li role="menuitem">选项1</li>
  <li role="menuitem">选项2</li>
</ul>

<!-- aria-current：当前项 -->
<nav aria-label="面包屑">
  <a href="/">首页</a>
  <a href="/products" aria-current="page">产品</a>
</nav>

<!-- aria-live：动态内容更新 -->
<div aria-live="polite">搜索结果已更新</div>
<div aria-live="assertive">发生错误！</div>

<!-- aria-disabled：视觉禁用但仍可聚焦 -->
<button aria-disabled="true">暂不可用</button>
```

**讲解：**

- `aria-labelledby` 引用页面中已有文本的 `id`，避免重复维护名称；
- `aria-expanded` 与 `aria-controls` 描述“控制者-被控制者”关系及展开状态；
- `aria-live="polite"` 用于普通更新、`assertive` 用于紧急错误，可让动态内容被自动播报；
- `aria-disabled` 与 `disabled` 的区别：前者仍可聚焦，语义上“当前不可用”。

### 3.3 标签页组件示例

> 进阶内容：以下代码涉及完整键盘事件处理，入门阶段先理解“为什么需要这些属性”，不要求能独立写出完整实现。

```html
<div class="tabs">
  <div role="tablist" aria-label="账户设置">
    <button role="tab" id="tab-profile" aria-selected="true" aria-controls="panel-profile">
      个人资料
    </button>
    <button
      role="tab"
      id="tab-security"
      aria-selected="false"
      aria-controls="panel-security"
      tabindex="-1"
    >
      安全设置
    </button>
    <button
      role="tab"
      id="tab-notify"
      aria-selected="false"
      aria-controls="panel-notify"
      tabindex="-1"
    >
      通知偏好
    </button>
  </div>

  <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
    <h3>个人资料</h3>
    <p>编辑你的个人信息...</p>
  </div>

  <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
    <h3>安全设置</h3>
    <p>修改密码和安全选项...</p>
  </div>

  <div role="tabpanel" id="panel-notify" aria-labelledby="tab-notify" hidden>
    <h3>通知偏好</h3>
    <p>管理通知设置...</p>
  </div>
</div>
```

**讲解：**

- 标签页由 `tablist`/`tab`/`tabpanel` 三种角色组成，`aria-controls` 与 `aria-labelledby` 互相指认；
- 当前标签用 `aria-selected="true"` 标记，未选中标签用 `tabindex="-1"` 移出 Tab 序列；
- 键盘规范要求方向键在标签间切换，实际项目中还需补充左右键事件。

## 4. 键盘导航

### 4.1 焦点管理

```html
<!-- tabindex 属性 -->
<!-- tabindex="0": 可聚焦，按文档顺序 -->
<!-- tabindex="-1": 可编程聚焦，不在Tab序列中 -->
<!-- tabindex="1+": 在Tab序列中，但不推荐（破坏自然顺序） -->

<div class="custom-widget" tabindex="0" role="button">自定义按钮</div>

<!-- 跳过导航链接 -->
<a href="#main-content" class="skip-link">跳到主要内容</a>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    z-index: 100;
    transition: top 0.2s;
  }
  .skip-link:focus {
    top: 0;
  }
</style>
```

**讲解：**

- `tabindex="0"` 让元素按文档顺序可聚焦，`-1` 允许脚本聚焦但不进 Tab 序列，正数会破坏自然顺序；
- 跳过导航链接平时移出视口（`top: -40px`），获得焦点时回到可视位置，是经典的键盘友好模式；
- 键盘用户每次进入新页面，都要按无数次 `Tab` 才能穿过导航栏到达正文；“跳过导航链接”让用户按一下 `Tab` 就能看到“跳到主要内容”的链接，按 `Enter` 直接跳到正文；
- 这是 WCAG 2.4.1 的经典实现，也是成本最低、收益最高的无障碍优化之一；
- 自定义组件若需要可聚焦，通常给 `tabindex="0"` 并补充键盘事件。

### 4.2 模态对话框焦点陷阱

```javascript
function trapFocus(element) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const focusableElements = element.querySelectorAll(focusableSelectors.join(','));
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  });

  // 打开对话框时聚焦第一个元素
  firstFocusable.focus();
}
```

**讲解：**

- 焦点陷阱保证 Tab 循环只在对话框内移动：焦点在末尾时按 Tab 回到开头，Shift+Tab 反向；
- 选择器统一收集可聚焦元素（链接、按钮、表单控件、非负 `tabindex`）；
- 打开对话框时把焦点移到第一个可聚焦元素，关闭后应恢复到触发按钮。

### 4.3 键盘快捷键

```html
<!-- accesskey 属性（谨慎使用） -->
<button accesskey="s">保存</button>

<!-- 自定义键盘交互 -->
<div class="dropdown" role="combobox" aria-expanded="false">
  <input type="text" role="searchbox" aria-autocomplete="list" aria-controls="dropdown-list" />
  <ul id="dropdown-list" role="listbox">
    <li role="option">选项1</li>
    <li role="option">选项2</li>
  </ul>
</div>

<script>
  // 键盘交互：上下箭头选择，Enter确认，Esc关闭
  document.querySelector('[role="combobox"]').addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        // 选择下一个选项
        break;
      case 'ArrowUp':
        // 选择上一个选项
        break;
      case 'Enter':
        // 确认选择
        break;
      case 'Escape':
        // 关闭下拉
        break;
    }
  });
</script>
```

**讲解：**

- `accesskey` 在不同浏览器中的触发组合不一致，可能与其他快捷键冲突，需谨慎使用；
- `combobox`/`listbox`/`option` 角色描述了“输入框 + 下拉列表”的完整语义；
- 键盘事件按 `ArrowDown`/`ArrowUp`/`Enter`/`Escape` 分发，是下拉组件的基本键盘协议。

### 4.4 动手试试：用键盘“走一遍”你的页面

在开始写代码之前，先建立“键盘用户”的体验：

1. 打开任何一个你经常访问的网站；
2. 放下鼠标，只用键盘上的 `Tab` 键在页面中移动焦点；
3. 观察焦点移动的顺序是否符合你的预期；
4. 按 `Enter` 键是否能激活按钮或链接；
5. 按 `Esc` 键是否能关闭弹窗。

你能感受到的：如果页面焦点顺序混乱，或者某些按钮按了 `Enter` 没反应——这就是键盘用户的日常困境。我们接下来学的所有无障碍技术，核心目的之一就是避免这种困境。

## 5. 颜色与对比度

### 5.1 对比度要求

| 文本类型                  | WCAG AA | WCAG AAA |
| :------------------------ | :------ | :------- |
| 正文文本（<18px）         | 4.5:1   | 7:1      |
| 大文本（≥18px或14px粗体） | 3:1     | 4.5:1    |
| UI组件和图形对象          | 3:1     | -        |

```css
/* 对比度检查 */
/* AA通过：深灰文字 #333 在白色 #fff 背景 */
.text-aa {
  color: #333333; /* 对比度 12.6:1  */
}

/* AA未通过：浅灰文字 #999 在白色背景 */
.text-fail {
  color: #999999; /* 对比度 2.8:1  */
}

/* 修正：使用更深的灰色 */
.text-fixed {
  color: #767676; /* 对比度 4.5:1  */
}
```

**讲解：**

- 对比度是“前景与背景的亮度差”：`#333` 在 `#fff` 上约 12.6:1，满足 AAA；`#999` 仅 2.8:1，连 AA 都不够；
- WCAG AA 要求正文 4.5:1、大文本 3:1、图形 3:1；
- 调色时先用计算器验证，再以“至少满足 AA”作为设计门槛。

### 5.2 不仅依赖颜色传达信息

```html
<!-- 错误：仅用颜色区分 -->
<p>请填写 <span style="color:red">红色</span> 标记的字段</p>

<!-- 正确：颜色 + 图标/文字 -->
<p>
  请填写带 <span class="required"><span aria-hidden="true">*</span>星号</span> 的字段
</p>

<!-- 错误：仅用颜色表示状态 -->
<div class="status" style="color: green">成功</div>

<!-- 正确：颜色 + 图标 -->
<div class="status success">
  <span aria-hidden="true"></span>
  <span>成功</span>
</div>
```

**讲解：**

- 色觉障碍用户无法仅凭红绿判断状态，信息必须同时以文字、图标或形状呈现；
- 必填标记用“星号 + 文字”双通道表达，`aria-hidden` 屏蔽装饰符号本身；
- 状态组件保留可见文字（如“成功”），颜色只做增强而非唯一信号。

## 6. 常见问题与解决方案

### 6.1 动态内容更新

**问题**：AJAX更新内容后屏幕阅读器不通知

```html
<!-- 解决方案：使用aria-live区域 -->
<div aria-live="polite" aria-atomic="true" id="status">
  <!-- 动态更新的内容 -->
</div>

<!-- 紧急通知用assertive -->
<div aria-live="assertive" role="alert" id="errors">
  <!-- 错误消息 -->
</div>
```

**讲解：**

- `aria-live="polite"` 表示更新不打断当前播报，`assertive` 表示立即打断播报；
- `aria-atomic="true"` 让整个区域整体播报，而不是只播报变化片段；
- 动态插入到 live 区域的内容会被读屏自动感知，无需用户重新浏览。

### 6.2 自定义组件无障碍

> 进阶内容：自定义组件需要同时补齐语义角色、状态属性与键盘事件，入门阶段先理解“为什么需要这些属性”。

**问题**：自定义组件缺少键盘支持和ARIA

```html
<!-- 自定义开关组件 -->
<div class="switch" role="switch" aria-checked="false" aria-label="深色模式" tabindex="0">
  <span class="switch-thumb"></span>
</div>

<script>
  const switchEl = document.querySelector('.switch');
  switchEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleSwitch();
    }
  });

  function toggleSwitch() {
    const isChecked = switchEl.getAttribute('aria-checked') === 'true';
    switchEl.setAttribute('aria-checked', !isChecked);
  }
</script>
```

**讲解：**

- `role="switch"` 声明开关语义，`aria-checked` 保存当前状态，`aria-label` 提供名称；
- 空格与回车键都要触发切换，且切换后同步更新 `aria-checked`；
- 组件视觉状态（滑块位置）与语义状态（`aria-checked`）必须保持一致。

### 6.3 图标按钮缺少标签

```html
<!-- 错误：图标按钮无文本 -->
<button><i class="fa fa-search"></i></button>

<!-- 正确方案1：aria-label -->
<button aria-label="搜索"><i class="fa fa-search" aria-hidden="true"></i></button>

<!-- 正确方案2：视觉隐藏文本 -->
<button>
  <i class="fa fa-search" aria-hidden="true"></i>
  <span class="sr-only">搜索</span>
</button>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

**讲解：**

- 图标按钮必须有可访问名称：`aria-label` 直接命名，或 `sr-only` 提供视觉隐藏文本；
- 装饰图标用 `aria-hidden="true"` 屏蔽，避免读屏重复播报图标字符；
- `sr-only` 用绝对定位 + 1px 裁剪实现“视觉隐藏但读屏可见”，是通用工具类。

## 7. 总结与最佳实践

### 7.1 无障碍检查清单

- [ ] 所有图片有alt文本
- [ ] 表单控件有label关联
- [ ] 页面有且仅有一个main地标
- [ ] 键盘可以访问所有交互元素
- [ ] 文本对比度满足WCAG AA标准
- [ ] 不仅依赖颜色传达信息
- [ ] 动态内容使用aria-live通知
- [ ] 自定义组件有正确的ARIA角色和属性
- [ ] 提供跳过导航链接
- [ ] 模态对话框有焦点陷阱

### 7.2 测试工具

- **Lighthouse**：Chrome内置的无障碍审计
- **axe DevTools**：浏览器扩展，自动检测无障碍问题
- **NVDA/VoiceOver**：屏幕阅读器实际测试
- **键盘测试**：不使用鼠标，仅用键盘操作页面
- **色盲模拟**：Chrome DevTools 的渲染面板

### 7.3 核心原则

1. **原生HTML优先**：使用语义化标签，减少ARIA需求
2. **键盘可操作**：所有功能可通过键盘完成
3. **渐进增强**：基础功能不依赖JavaScript
4. **持续测试**：开发过程中定期进行无障碍测试

## 8. 进阶知识点

### 8.1 视觉隐藏文本（sr-only）

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**讲解：**

- 该工具类让文本对视觉用户隐藏，但保留在可访问性树中供读屏播报；
- 不要用 `display: none` 或 `visibility: hidden` 隐藏这类文本，那会连读屏一起隐藏；
- `clip: rect(0, 0, 0, 0)` 是经典裁剪写法，配合 `position: absolute` 避免撑开布局。

### 8.2 自定义开关组件

```html
<button
  class="switch"
  role="switch"
  aria-checked="false"
  aria-label="深色模式"
  id="theme-switch"
></button>
```

**讲解：**

- 使用原生 `button` 承载开关，可免费获得焦点与回车/空格触发能力；
- `role="switch"` 告知读屏这是开关，`aria-checked` 表达开/关状态；
- 状态变化时必须同步更新 `aria-checked`，否则读屏播报与实际状态不一致。

### 8.3 自动更新通知：aria-live 用法

```html
<div aria-live="polite" aria-atomic="true" id="notification">
  暂无新消息
</div>
```

**讲解：**

- 聊天消息、搜索结果等非紧急更新用 `polite`，错误提示等紧急信息用 `assertive`；
- `aria-atomic="true"` 让区域整体播报，避免只读出变化的碎片；
- live 区域应在页面初始时就存在于 DOM，动态创建的区域无法保证被感知。

## 9. 核心知识点

- WCAG 四原则：可感知、可操作、可理解、健壮性；
- 原生语义优先：`button`/`a`/`label`/`h1`-`h6` 自带键盘与语义，`div` 模拟需要额外补齐；
- 图片必须处理 `alt`：内容图描述、装饰图留空、复杂图补充长描述；
- ARIA 是补充工具：`role`、`aria-label`、`aria-expanded`、`aria-live` 等需与行为实现配套；
- 键盘导航要求：跳过链接、`tabindex` 规范、模态焦点陷阱、自定义组件方向键协议；
- 对比度门槛：正文 4.5:1、大文本 3:1（AA），且不能只靠颜色传达信息。

## 10. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `div` 模拟交互组件 | 不可聚焦、无语义、键盘失效 | 换成原生 `button`/`a`，或补齐 `tabindex` + ARIA + 键盘事件 |
| 图片缺 `alt` | 读屏无法理解图片内容 | 内容图写描述，装饰图 `alt=""` |
| 表单控件无 `label` | 点击文字不聚焦，读屏不播报名称 | 用 `label for`/包裹式关联 |
| 动态更新无通知 | AJAX 更新后读屏用户无感知 | 使用 `aria-live` 区域包裹更新内容 |
| `tabindex` 正数滥用 | 破坏自然 Tab 顺序 | 只使用 `0` 与 `-1` |
| 对比度不足 | 低视力用户看不清文字 | 按 WCAG AA 用工具验证并调色 |
| 仅靠颜色表达状态 | 色觉障碍用户无法区分 | 颜色 + 文字/图标双通道 |
| 模态框无焦点陷阱 | Tab 可跳出对话框，读屏迷失 | 实现焦点循环并在关闭后恢复焦点 |

## 11. 扩展学习

- 规范原文：阅读 W3C WCAG 2.2 与 WAI-ARIA 1.2 官方文档；
- 组件模式：`html5/310-WebComponentsPWADevelopment` 中自定义元素如何内置无障碍；
- 表单无障碍：`html5/190-HTML5FormValidation` 的验证提示与 `aria-describedby` 结合；
- 语义基础：先掌握 `html5/170-SemanticTag`，再理解 ARIA 的补充角色；
- 实测工具：Lighthouse、axe DevTools、NVDA/VoiceOver 与键盘走查流程。
