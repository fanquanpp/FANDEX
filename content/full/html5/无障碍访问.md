---
order: 30
tags:
  - html5
  - accessibility
difficulty: intermediate
title: 无障碍访问
module: html5
category: 'HTML5 Basics'
description: Web无障碍访问（A11y）核心概念、ARIA属性、键盘导航、屏幕阅读器适配与WCAG标准。
author: fanquanpp
updated: '2026-06-13'
related:
  - html5/基础标签与全局属性
  - html5/语义化标签
  - html5/表单与验证
  - html5/多媒体与Canvas绘图
prerequisites: []
---

## 1. 无障碍访问概述

### 1.1 什么是 Web 无障碍

Web无障碍（Web Accessibility，简称 A11y）确保网站和Web应用对所有用户可用，包括有视觉、听觉、运动或认知障碍的人群。

### 1.2 WCAG 标准

Web内容无障碍指南（WCAG）围绕四个原则：

| 原则                         | 含义         | 示例                      |
| :--------------------------- | :----------- | :------------------------ |
| **可感知（Perceivable）**    | 信息可被感知 | 图片有alt文本、视频有字幕 |
| **可操作（Operable）**       | 界面可操作   | 键盘可访问、有足够时间    |
| **可理解（Understandable）** | 内容可理解   | 清晰语言、一致的导航      |
| **健壮性（Robust）**         | 兼容辅助技术 | 语义化HTML、ARIA          |

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
  <label for="phone"> 电话：<span aria-label="必填">*</span> </label>
  <input type="tel" id="phone" name="phone" required aria-required="true" />

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

## 3. ARIA 属性

### 3.1 ARIA 角色与属性

ARIA（Accessible Rich Internet Applications）为复杂组件提供语义信息。

```html
<!-- 角色role -->
<nav role="navigation" aria-label="主导航">
  <ul>
    <li><a href="/" role="menuitem">首页</a></li>
    <li><a href="/about" role="menuitem">关于</a></li>
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

### 3.2 常用 ARIA 属性

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

### 3.3 标签页组件示例

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

### 6.2 自定义组件无障碍

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
