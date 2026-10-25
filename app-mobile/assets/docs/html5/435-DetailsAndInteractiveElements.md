---
order: 510
title: details 与交互元素：原生折叠面板与手风琴
module: 'html5'
category: 前端技术
difficulty: beginner
description: details/summary 语义折叠、name 手风琴模式、与 popover/dialog 的选型对比、hidden=until-found 查找联动。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：HTML 交互元素（Interactive Elements）——浏览器内置、免 JavaScript 的可交互组件。
- **解决什么问题**：页面里大量"点击展开/收起"的需求（FAQ、设置面板、答题卡、侧栏目录），过去要写 JS + class 切换 + 无障碍属性三件套；`<details>` 把这三件事合并成一个原生元素。
- **什么时候用到**：
  - 内容"默认收起、按需展开"：FAQ、帮助文档、术语解释；
  - 一组互斥折叠（开一个关其他）：手风琴、抽屉导航；
  - 长页面分节收纳：课程任务单、更新日志、隐私条款全文；
  - 想让浏览器 Ctrl+F 能搜到收起内容：`hidden=until-found` 联动。
- **前置要求**：只需要 HTML；涉及样式定制部分需少量 CSS。衔接阅读：[430-HTML5DialogPopoverGuide](/html5/430-HTML5DialogPopoverGuide)（模态与弹出层）、[440-HTMLNewElementsAndCapabilities](/html5/440-HTMLNewElementsAndCapabilities)（hidden=until-found 完整讲解）。

## 1. 一句话理解

`<details>` 是浏览器自带的折叠面板，`<summary>` 是它的标题行；`name` 属性让多个 `<details>` 组成"手风琴"；三行 HTML 就能获得过去需要 JavaScript + ARIA 属性才能实现的完整交互。

## 2. details/summary 语义折叠

### 2.1 最小可用示例

```html
<details>
  <summary>常见问题：如何重置密码？</summary>
  <p>请访问登录页面，点击"忘记密码"链接，输入注册邮箱后按提示操作。</p>
</details>

<details open>
  <summary>使用说明（默认展开）</summary>
  <p>这是默认展开的说明内容，去掉 open 属性即恢复默认折叠。</p>
</details>
```

**逐段讲解：**

- `<details>` 是折叠容器，有两个内部状态：`open`（展开）与非 `open`（收起）。`open` 是布尔属性，写上即展开——注意它不是"值等于 true"的写法，`open="false"` 仍然是展开的，这是布尔属性最容易踩的坑；
- `<summary>` 必须是 `<details>` 的第一个子元素，它是始终可见的标题行。**不写 `<summary>` 时，浏览器会自动补一个内容为"详细信息"（英文环境为 Details）的默认标题**——这就是很多同学发现"页面上多了一行英文"的原因；
- summary 之后的所有兄弟内容都是折叠体，可以放任意流内容：段落、列表、表格甚至另一个 `<details>`；
- 点击 summary 切换状态，同时键盘 Tab 聚焦 summary 后按空格/回车也能切换——无障碍能力是免费的，不需要 `role="button"`、不需要 `tabindex="0"`。

### 2.2 用 JS 监听切换事件

`<details>` 的状态变化会派发 `toggle` 事件，比轮询 `open` 属性干净得多：

```html
<details id="panel">
  <summary>实验步骤</summary>
  <ol>
    <li>新建 index.html，写好骨架</li>
    <li>添加 details 折叠区</li>
    <li>用浏览器打开验证</li>
  </ol>
</details>
<script>
  const panel = document.getElementById('panel');
  panel.addEventListener('toggle', () => {
    console.log('当前状态:', panel.open ? '展开' : '收起');
  });
</script>
```

**讲解：**

- `toggle` 事件在状态变化后触发（不是变化前），没有 `preventDefault` 的机会——要阻止切换只能拦截 summary 的 click；
- 事件也会在"初始渲染完成"时触发一次（从无状态到当前状态），所以不要假定监听后第一次触发一定是用户点了它；
- 用 `panel.open = true` 可以编程展开，与用户点击等效，同样会派发 toggle。

### 2.3 展开动画：interpolate-size 与 ::details-content

纯 HTML 的 `<details>` 长期被诟病"切换太生硬"。新的 CSS 能力补上了这一环（Chrome 131+）：

```css
/* 允许过渡到 auto 高度（如 max-content） */
:root {
  interpolate-size: allow-keywords;
}

/* 折叠体有内容过渡的空间 */
details::details-content {
  block-size: 0;
  overflow: hidden;
  transition:
    block-size 0.3s,
    content-visibility 0.3s allow-discrete;
}

details[open]::details-content {
  block-size: auto;
}
```

**讲解：**

- `interpolate-size: allow-keywords` 让 `height: 0` 与 `height: auto` 之间可以插值——没有它，`auto` 无法参与过渡，动画会跳变；
- `::details-content` 伪元素指向折叠体内容盒，给"展开体"单独做过渡，不影响 summary 本身；
- 旧浏览器不支持这两条时，行为回退为"瞬间展开"——这是渐进增强的典型写法，功能不丢，只是少了动画。

### 2.4 三个真实场景

**场景一：FAQ 页（客服系统/文档站）**

```html
<h2>支付相关</h2>
<details class="faq">
  <summary>支持哪些支付方式？</summary>
  <p>支持微信、支付宝与银行卡快捷支付。</p>
</details>
<details class="faq">
  <summary>退款多久到账？</summary>
  <p>原路退回，一般 1-3 个工作日到账。</p>
</details>
```

FAQ 是 `<details>` 的教科书场景：每条独立折叠、互不影响，用户可以同时开多条对比。

**场景二：把课程实验任务单改造成折叠式答题卡**

课程里常见六份实验任务单（文档结构、表格制作、表格布局、表单、选择器、综合训练），一份文件打印下来几十页。放在网页上时，把每份任务单的"操作要点/注意事项"折叠起来、只留任务标题，学生先自己尝试再展开核对：

```html
<h2>HTML5 实验任务单</h2>
<details>
  <summary>实验一 HTML 文档结构和超链接标签</summary>
  <h3>实验内容</h3>
  <ol>
    <li>按 HTML5 骨架创建文档，声明 lang 与 charset</li>
    <li>完成站内锚点与站外链接各一处</li>
  </ol>
  <details>
    <summary>操作要点（先自己试，再展开核对）</summary>
    <ul>
      <li>锚点目标元素用 id 定位，链接写 href="#id"</li>
      <li>站外链接补 target="_blank" 与 rel="noopener"</li>
    </ul>
  </details>
</details>
```

**讲解：** 嵌套 `<details>` 是合法的——外层收任务，内层收答案，形成"任务单 + 参考答案"两层结构。比把答案放页面底部省得来回滚动，也比全展开干扰注意力。

**场景三：设置面板（编辑器/工具站的偏好区）**

```html
<details open>
  <summary>外观设置</summary>
  <label><input type="radio" name="theme" value="light" checked /> 浅色</label>
  <label><input type="radio" name="theme" value="dark" /> 深色</label>
</details>
<details>
  <summary>编辑器设置</summary>
  <label><input type="checkbox" checked /> 显示行号</label>
  <label><input type="checkbox" /> 自动换行</label>
</details>
```

分组折叠让设置页保持"一眼能看到所有分组名"的信息密度，展开才看到选项细节。

## 3. name 属性：原生手风琴模式

### 3.1 互斥折叠

给多个同组 `<details>` 加相同的 `name` 属性，浏览器自动实现"开一个关其他"：

```html
<details name="course">
  <summary>第一章 概念与心智模型</summary>
  <p>……</p>
</details>
<details name="course">
  <summary>第二章 环境搭建</summary>
  <p>……</p>
</details>
<details name="course">
  <summary>第三章 动手实践</summary>
  <p>……</p>
</details>
```

**讲解：**

- `name` 的行为像表单里的单选按钮：同 `name` 的一组，同一时刻最多只有一个 `open`。打开一项时，浏览器自动移除同组其他项的 `open`；
- 不加 `name` 则各项独立，等价于过去的 FAQ 模式；
- **默认全部收起**。想要"页面加载后第一项展开"，手动给第一项写 `open` 即可——不会与 name 冲突，后续切换仍互斥。

### 3.2 社团幻灯片逐条入场：从 JS 方案到纯 HTML 方案

社团分享会上有一类幻灯片页：内容逐条出现，讲完一条放一条。以前用 JS 定时器控制 div 的显示（`display: block/none` 互斥切换）；用 `<details name>` + `open` 属性可以直接用纯 HTML 表达同样的叙事结构——每条内容是一个面板，逐条点击推进，而且允许回看任何一条：

```html
<h2>社团分享：三分钟看懂 Git</h2>
<details name="slide" open>
  <summary>第 1 页 Git 是什么</summary>
  <p>快照而非差异。没有变化的文件只存指向上次快照的引用。</p>
</details>
<details name="slide">
  <summary>第 2 页 四个区域</summary>
  <p>工作目录 → 暂存区（add）→ 本地仓库（commit）→ 远程仓库（push）。</p>
</details>
<details name="slide">
  <summary>第 3 页 分支与合并</summary>
  <p>branch 创建分支，merge 把分支汇回主线，冲突时手动取舍。</p>
</details>
```

**对比讲解：**

- 旧 JS 方案（三个 div + `display` 切换）只有"当前页"概念，无法回看；`<details name>` 天然保留所有页面，点击任意标题即可跳转，更适合会后翻阅；
- JS 方案需要自己维护索引变量与边界（`i > 3 归 1`）；`name` 方案由浏览器管理状态，代码量为零；
- 若确需"自动逐页播放"的演示模式，再给 summary 绑 click 事件按时间推进 `open` 属性即可——HTML 结构不变。

### 3.3 手风琴的选型边界

| 需求 | 用 name 手风琴 | 换别的 |
| --- | --- | --- |
| 一组内容互斥展示、允许全收起 | `<details name>` | - |
| 页面加载时必须展开某项且保持 | 加 `open` 后仍互斥，符合预期 | - |
| 需要同时展开多项对比 | 不加 `name` 的独立 details | - |
| 需要居中遮罩、收集用户选择 | 不合适 | `dialog.showModal()`（见 430） |
| 鼠标悬停触发的小提示 | 不合适 | `popover`（见 430） |

## 4. 与 popover / dialog 的选型对比

三者都是"原生交互组件"，但职责完全不同：

```html
<!-- 折叠：内容常驻文档流，展开后占据布局空间 -->
<details>
  <summary>阅读全文</summary>
  <p>长文内容……</p>
</details>

<!-- popover：浮层内容，不占布局，点外面自动关闭 -->
<button popovertarget="tip">查看说明</button>
<div id="tip" popover>术语解释：DOM 即文档对象模型。</div>

<!-- dialog：模态任务，屏蔽背景直到用户完成 -->
<dialog id="confirm">
  <p>确定删除这条记录吗？</p>
  <form method="dialog">
    <button value="cancel">取消</button>
    <button value="ok">确定</button>
  </form>
</dialog>
```

**判断口诀：**

- 内容属于页面文档流、展开后不离开原位置 → `details`；
- 短暂提示、点别处就应消失、不阻塞操作 → `popover`；
- 打断用户、必须先处理才能继续（删除确认、表单提交）→ `dialog.showModal()`。

**易错点：** 把长文档塞进 dialog 或 popover，用户滚动时受浮层约束、关闭即丢失阅读位置；把"删除确认"做成 details，背景仍可操作，容易误触。

## 5. hidden=until-found：让 Ctrl+F 找到收起内容

`<details>` 收起的内容默认"不在页面里"吗？其实 DOM 里一直存在，但传统 `hidden` 或折叠态内容对浏览器的页面内查找（Ctrl+F）不可见——用户明明知道文档里有这个词，却搜不到。`hidden="until-found"` 解决这个问题：

```html
<details>
  <summary>归档条款全文</summary>
  <div id="terms" hidden="until-found">
    <p>……很长的归档文本，包含"违约金"等关键词……</p>
  </div>
</details>
<script>
  const terms = document.getElementById('terms');
  // 浏览器在 until-found 内容中找到搜索词时派发 beforematch
  terms.addEventListener('beforematch', () => {
    // 典型做法：展开所在的 details，让用户看到上下文
    terms.closest('details').open = true;
  });
</script>
```

**逐段讲解：**

- `hidden="until-found"` 表示"默认隐藏，但当用户通过查找功能命中其中内容时临时显示"；
- `beforematch` 事件在浏览器准备把隐藏内容滚动到可见前触发，是展开父容器（这里是最靠近的 `<details>`）的最佳时机——不展开的话浏览器找到的是不可见内容，体验割裂；
- 该属性与 `details` 的配合是官方推荐模式：收起时折叠体等价于 `hidden=until-found`（新浏览器中 details 的折叠内容本来就支持页面内查找命中后自动展开）。完整属性讲解见 [440-HTMLNewElementsAndCapabilities](/html5/440-HTMLNewElementsAndCapabilities)。

## 6. 动手实践

### 任务

1. 写一个含 4 条 Q&A 的 FAQ 页，其中"退款政策"一条默认展开；
2. 把 FAQ 改成手风琴：任意时刻只能展开一条；
3. 给FAQ 的第一条正文里放一个含"隐私政策"的折叠区，用 `hidden=until-found` + `beforematch` 保证 Ctrl+F 搜"隐私政策"能自动展开它；
4. 做一张"任务单答题卡"：外层 details 收任务描述，内层 details 收参考答案。

### 提示

- 手风琴只需要给每个 `<details>` 加同名 `name`；
- 展开/收起状态由 `open` 布尔属性决定，检查你的 HTML 是否写成了 `open="false"`；
- 自检时用浏览器 Ctrl+F 搜索来验证 until-found 联动。

### 参考实现（先自己写，写完再展开对照）

```html
<h1>帮助中心</h1>
<!-- 任务 1：独立 FAQ，退款一条默认展开 -->
<details>
  <summary>支持哪些支付方式？</summary>
  <p>微信、支付宝与银行卡。</p>
</details>
<details open>
  <summary>退款政策</summary>
  <p>签收后 7 天内可退，详见 <span id="privacy" hidden="until-found">隐私政策</span> 中的退款条款。</p>
</details>
<details>
  <summary>发票怎么开？</summary>
  <p>订单完成后在"订单详情"页申请。</p>
</details>

<!-- 任务 2：手风琴，同 name 互斥 -->
<h2>更多问题（互斥展开）</h2>
<details name="faq2">
  <summary>可以修改收货地址吗？</summary>
  <p>发货前可在订单页修改。</p>
</details>
<details name="faq2">
  <summary>如何注销账号？</summary>
  <p>设置 - 账号安全 - 注销。</p>
</details>

<!-- 任务 4：任务单答题卡，嵌套 details -->
<details>
  <summary>任务单：制作课程表</summary>
  <ol>
    <li>用 table 建表，thead 放星期</li>
    <li>tbody 放课程，行首用 th scope="row"</li>
  </ol>
  <details>
    <summary>参考答案（先自己写）</summary>
    <table border="1">
      <thead>
        <tr><th>节次</th><th>周一</th><th>周二</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">1</th><td>语文</td><td>数学</td></tr>
      </tbody>
    </table>
  </details>
</details>

<script>
  // 任务 3：查找命中时展开所在折叠区
  const privacy = document.getElementById('privacy');
  privacy.addEventListener('beforematch', () => {
    privacy.closest('details').open = true;
  });
</script>
```

**参考实现讲解：** 退款政策用 `open` 默认展开；两个 `name="faq2"` 的条目互斥；`beforematch` 里用 `closest('details')` 而不是写死父元素 id，这样把这段 JS 复制到任何结构里都能工作。

## 7. 核心要点回顾

- `<details>` + `<summary>` 是原生折叠面板：`open` 属性控状态、`toggle` 事件听变化、不写 summary 会得到默认英文标题；
- 同 `name` 的多个 `<details>` 组成互斥手风琴，同组最多展开一项；
- 三者选型：文档流折叠用 details，浮层提示用 popover，模态任务用 dialog；
- `hidden="until-found"` + `beforematch` 让收起内容可被 Ctrl+F 找到并自动展开；
- 动画是渐进增强：`interpolate-size: allow-keywords` + `::details-content`，旧浏览器自动回退为瞬间展开。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| `open="false"` 期待收起 | 布尔属性存在即生效，仍会展开 | 收起时移除整个属性，用 JS 删 `panel.open = false` |
| 忘写 `<summary>` | 出现浏览器默认的"详细信息"标题 | 永远显式写 summary 作为第一个子元素 |
| 往 summary 里塞表单控件 | 按钮等交互元素会抢走点击 | summary 只放标题与简单图标 |
| 用 details 做"删除确认" | 无模态屏蔽，背景可误触 | 换 `dialog.showModal()`（见 430） |
| 长内容动画卡顿 | 直接过渡 max-content 高度 | 限定展开体 `max-block-size` 或用 `::details-content` 过渡 |
| 旧浏览器断言 ::details-content | 不支持时无动画但功能正常 | 按渐进增强写，不要用 @supports 禁用折叠 |

## 9. 扩展学习

- 模态与弹出层：[430-HTML5DialogPopoverGuide](/html5/430-HTML5DialogPopoverGuide) 的 dialog/popover 完整指南与 Invoker Commands；
- 新能力：[440-HTMLNewElementsAndCapabilities](/html5/440-HTMLNewElementsAndCapabilities) 的 hidden=until-found 与 Speculation Rules；
- 无障碍：[180-Accessibility](/html5/180-Accessibility) 中键盘导航与 ARIA 补充的边界（原生交互组件何时不需要 ARIA）。

## 参考与致谢

- MDN Web Docs：`<details>`、`<summary>`、`hidden` 属性文档（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/details
- WHATWG HTML Living Standard：4.11 Interactive elements 章节，https://html.spec.whatwg.org/multipage/interactive-elements.html
- Chrome for Developers：Details/summary animation（interpolate-size 与 ::details-content），https://developer.chrome.com/blog/animate-details（开放许可许可范围以原站为准，本文仅参考 API 行为并自行重写示例）
