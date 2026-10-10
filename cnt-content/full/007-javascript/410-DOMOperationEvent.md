---
order: 460
title: DOM 操作与事件：按钮点了没反应的时候
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「按钮点了没反应——你还没认识 DOM」讲起：DOM 树与节点、querySelector 查询、textContent 与 innerHTML 的取舍（XSS 一句话红线）、classList、addEventListener 与事件对象、事件冒泡初次现身，以「添加待办 + 完成切换」收尾，附 Cannot read properties of null 与 defer 调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/420-BOMBrowserObjectModel'
  - 'javascript/440-FetchApiAndAbortController'
  - 'javascript/700-JavaScriptProjectExampleTodoApp'
prerequisites:
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
  - 'javascript/090-ArrayHigherOrderMethod'
---

## 前置知识

- 已完成 [JavaScript 概述与运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv)：知道 JS 跑在浏览器和 Node 里——本文只在浏览器，Node 没有 DOM，`document` 是 undefined；
- 已完成 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：会把函数当参数传，addEventListener 的第二个参数就是它。

没学过 090 也能跟：回调只需要「把函数当值传」，用到时现场解释。

## 学习目标

读完本文你将能够：

1. 把 HTML 说成一棵树，区分元素节点与文本节点，用 querySelector/querySelectorAll 查询元素；
2. 区分 textContent 与 innerHTML，背出「用户输入只进 textContent」的 XSS 红线；
3. 用 classList 切换类名，用 addEventListener 挂监听，从事件对象读出「谁被点了」；
4. 预测事件冒泡顺序，修复脚本早于元素执行导致的 `Cannot read properties of null`；
5. 从零写出「添加待办 + 点击切换完成」的小交互。

预计 60 到 75 分钟。

## 1. 你现在要解决什么问题

第一次把 JS 放进网页：页面上有个按钮，想点了它计数加一，代码写好了，按钮无动于衷。

先别急着查代码——你还没认识 JS 怎么「看见」按钮。浏览器打开网页时把 HTML 解析成一棵对象树，树的根交到你手上，叫 `document`。**JS 摸到页面的一切，都从 document 顺藤摸瓜。** 这里埋一颗雷：`querySelector` 查不到不报错，安静返回 `null`——第 11 节引爆。

## 2. 最小可运行示例：让按钮有反应

保存两个文件到同一文件夹，浏览器打开 html：

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="like-btn">点赞 0</button>
    <script src="script.js"></script>
  </body>
</html>
```

```javascript
const btn = document.querySelector('#like-btn');
let count = 0;

btn.addEventListener('click', () => {   // 「点击发生时，请调用这个函数」
  count = count + 1;
  btn.textContent = '点赞 ' + count;
});
```

预期行为：点一下变「点赞 1」，再点变「点赞 2」。控制台无报错。

三个零件——查询、改文本、登记监听——接下来逐个拆开。

## 3. DOM 树与节点

DOM（Document Object Model，文档对象模型）就是第 1 节那棵树。以 `<ul><li>任务一</li></ul>` 为例，层级是 `document → body → ul → li → "任务一"`：标签是**元素节点**，文字是**文本节点**，嵌套结构就是树本身。

最关键的一句：**节点是一个个 JS 对象**——DOM 是浏览器递给 JS 的对象接口，操作它和操作 070 篇的对象没有本质区别。Node 里没有这棵树，所以没有 `document`。

## 4. 查询：querySelector 与 querySelectorAll

选择器语法与 CSS 完全一致：

```javascript
document.querySelector('#app');      // 按 id：第一个匹配的元素

const items = document.querySelectorAll('.item');   // 全部匹配项
items.forEach((el) => console.log(el.textContent)); // NodeList 可直接 forEach
```

预期输出（ul 里放两条 li 时）：

```text
任务一
任务二
```

两个高频坑：NodeList **不是数组**——有 forEach，没有 map/filter（第 11 节错误二），要数组方法先 `Array.from(items)`；**查不到不报错**——querySelector 返回 `null`，querySelectorAll 返回空集合。

## 5. 改内容：textContent 与 innerHTML

两种改法，能力与风险完全不同：

```javascript
const userInput = '<img src=x onerror=alert(1)>';   // 假装是用户提交的评论

el.textContent = userInput;   // 当纯文本：原样显示这串字符，安全
el.innerHTML = userInput;     // 当 HTML 解析：img 标签真的生成，onerror 真的执行
```

`textContent` 当**纯文本**，写什么显示什么；`innerHTML` 当 **HTML 解析**，内容来自用户时恶意脚本会随标签一起执行——这就是 XSS（跨站脚本攻击）的入口。一句话红线：**用户输入只能进 textContent；innerHTML 的内容必须出自你自己的代码或经过清洗。**

## 6. 改外观：classList

类名是 JS 与 CSS 的分界线：CSS 写 .done 长什么样，JS 只负责给谁加 .done。

```javascript
const li = document.querySelector('.task');

li.classList.add('done');          // 加类
li.classList.remove('done');       // 删类
li.classList.toggle('done');       // 有则删、无则加：切换
```

配套 CSS：`.done { text-decoration: line-through; color: gray; }`。预期行为：toggle 后出现删除线且变灰，再执行一次恢复。**改类名而不是改样式**：JS 不堆颜色字符串，样式全留在 CSS 里——第 9 节的原材料。

## 7. 事件：addEventListener 与事件对象

点击、打字、按键——浏览器把「发生了一件事」叫**事件**：无法预知何时发生，只能提前登记「这类事发生时，调用我这个函数」。给输入框挂 `input` 监听：`input.addEventListener('input', (e) => console.log(e.target.value))`，逐字打出 hi 会依次打印 `h`、`hi`。

浏览器会造一个**事件对象**传给回调：`e.target` 是目标元素（用户到底点了谁），`e.type` 是事件类型；`console.log(e)` 可展开看全部成员。常用事件先记四个：`click`、`input`、`keydown`、`submit`。

### 7.1 三种绑定方式对照（含一个真实错例）

同一个点击，三种挂法：

```javascript
// 方式一：HTML 行内属性（不推荐，但必须认识）
// <button onclick="doSave()">保存</button>

// 方式二：DOM 属性赋值——同一事件只能有一个处理器，后赋值覆盖前者
btn.onclick = function () { console.log("方式二"); };

// 方式三：addEventListener——可挂多个、可移除、可选捕获阶段
btn.addEventListener("click", () => console.log("方式三-a"));
btn.addEventListener("click", () => console.log("方式三-b")); // 两个都执行
```

真实错例（出自课堂演示页）：行内属性把调用写成了赋值——

```html
<button onclick="alert=('box被点击了')">点我</button>
```

点击后**什么都不弹**，控制台报 `Invalid left-hand side in assignment`：`alert=(...)` 是"把调用结果赋给 alert 这个名字"，不是调用 alert。行内绑定的三个固有毛病也顺带看清：JS 混进 HTML 里难维护、作用域坑多（函数必须挂在全局）、一个属性只能塞一段代码。**工程口径**：读得懂方式一（老代码里有），写只用方式三；方式二在"快速原型、只要一个处理器"时可以接受。

## 8. 事件冒泡的第一次现身

给每条待办单独挂监听？列表会增删，新元素没挂上就漏。先看一个现象：

```html
<ul id="list">
  <li><button>A</button></li>
  <li><button>B</button></li>
</ul>
```

```javascript
document.querySelector('#list').addEventListener('click', (e) => {
  console.log('ul 收到点击，目标是：', e.target.textContent);
});

document.querySelector('li button').addEventListener('click', () =>
  console.log('按钮自己收到点击')
);
```

预期输出（点击按钮 A）：

```text
按钮自己收到点击
ul 收到点击，目标是： A
```

明明只点了按钮，ul 的监听也触发了——事件**命中目标后沿父级一路向上**（button → li → ul → body……），像水泡往上冒，所以叫**冒泡**（bubbling）。父元素靠 `e.target` 分辨「孩子们里谁被点了」，一个监听管一整个列表，新加的条目自动被覆盖。本文只要求理解「会往上冒」；三个阶段、stopPropagation、事件委托的完整版图，[DOM 事件系统深入](/javascript/415-DOMEventSystemDeepDive) 讲透。

## 9. 完整小交互：待办清单的单项

把零件全部组装：输入 + 添加 + 点击切换完成。这是 [项目实战：待办应用](/javascript/700-JavaScriptProjectExampleTodoApp) 的最小内核，700 篇把它长成完整项目。

```html
<!DOCTYPE html>
<html>
  <body>
    <input class="new-task" />
    <button class="add-btn">添加</button>
    <ul class="task-list"></ul>
    <script src="todo.js" defer></script>
  </body>
</html>
```

```javascript
const input = document.querySelector('.new-task');
const addBtn = document.querySelector('.add-btn');
const list = document.querySelector('.task-list');

function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  const li = document.createElement('li');
  li.textContent = text;                 // 用户输入，只走 textContent（第 5 节红线）
  list.append(li);
  input.value = '';
}

addBtn.addEventListener('click', addTodo);

list.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {       // 靠冒泡统一监听所有待办
    e.target.classList.toggle('done');
  }
});
```

预期行为：输入「买牛奶」点添加，列表出现一条；点击变灰加删除线，再点恢复。

## 10. 修改实验

实验一：加一个完成计数徽章 `<span class="counter"></span>`，每次切换后用 `querySelectorAll('.task-list .done')` 数出数量并更新。

实验二：支持按 Enter 添加——给 input 挂 `keydown` 监听，`e.key === 'Enter'` 时调用 addTodo（MDN 搜 keydown）。

## 11. 常见错误与调试实录

**错误一：`Cannot read properties of null (reading 'addEventListener')`。** 全网新手第一报错。复现：把 script 标签挪进 head。浏览器控制台真实报错：

```text
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
```

三步定位：读报错——在 `null` 身上读属性，调用它的变量是 null；验真身——报错行前加 `console.log(btn)`，输出 null；想时序——**执行脚本时按钮还不存在**。修法首选 `defer`：

```html
<script src="script.js" defer></script>
```

defer 让脚本先下载，**等 HTML 全部解析完再按顺序执行**——查询必然找得到人（放 body 末尾是等效老办法）。看到这个报错，先查两件事：选择器拼错没有、脚本是否跑在元素前面。

**错误二：`items.map is not a function`。** 080 篇的手滑换了个马甲：

```javascript
const items = document.querySelectorAll('.item');
const texts = items.map((el) => el.textContent);   // NodeList 不是数组
```

真实报错：

```text
Uncaught TypeError: items.map is not a function
```

NodeList 有 forEach，却没有 map/filter/reduce，要数组方法先 `Array.from(items)`。080 篇的 `typeof` 验真身在这里同样好使。

## 12. 实际项目中的使用场景

- 无框架交互：表单校验、暗色模式开关、下拉菜单——今天的东西直接撑起这些；
- 框架时代的地基：React/Vue 最终也要变成真实 DOM，框架在替你干第 9 节的活；状态一多「数据变界面跟着变」会失控——700 篇演示分层，框架解决同一件事。

## 13. 小练习

预测题（5 分钟）：沿用第 8 节的 HTML，执行下面的代码后点击按钮 B，控制台输出几行？

```javascript
document.querySelectorAll('#list button').forEach((b) =>
  b.addEventListener('click', () => console.log('按钮：' + b.textContent))
);
document.querySelector('#list').addEventListener('click', () =>
  console.log('ul 也听到了')
);
```

修改题（15 分钟）：给第 9 节加「清空已完成」按钮：点击移除所有带 done 类的待办（提示：`el.remove()`）。验收：两条完成后点它，两条消失，未完成的还在。

修 Bug 题（10 分钟）：页面已经用了 defer，按钮却毫无反应，控制台报 `Cannot read properties of null (reading 'addEventListener')`。HTML 里按钮是 `<button id="save-btn">`，app.js 第一行是 `document.querySelector('#save_btn')`。按三步定位并修复。

挑战题（半小时）：把待办升级为「点击待办旁的删除按钮，只删这一条」。要求：删除按钮带 `data-id`，监听挂在 ul 上（用冒泡），回调里用 `e.target.closest('li')` 找到所属待办再移除。验收：只删被点的；点文字仍切换完成；新增待办不用重新挂监听也能删。提示：`e.target` 与 `e.currentTarget` 的差别是关键。


综合任务（承接自扫描素材的三个课堂项目，先自己做再对照提示）：

1. **选项卡互斥切换**：三个内容 div 叠放，点第几个标签只显示第几个（提示：循环给标签挂监听，回调里再把所有内容 div 的 `style.display` 置 `"none"`、当前置 `"block"`——"先全灭再点亮"是互斥的标准套路）。
2. **全选 / 全不选 / 反选**：一个总开关复选框加一组爱好复选框（提示：`document.getElementsByName("ck")` 或 `querySelectorAll` 拿到列表后遍历赋 `checked`；反选一行：`box.checked = !box.checked`）。
3. **领养宠物表单校验**：宠物名输入框非空且长度不超过 6，不合法时点提交才在提示 div 里显示文字（提示：`value.trim()` 去首尾空格；提示区"点击提交后才出现"是**延迟渲染**需求——div 初始为空，校验失败才写 `innerText`）。

## 14. 与之前和之后的知识的关系

- 往前：[运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv) 解释了本文为什么只在浏览器；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的「函数当参数」是 addEventListener 的日常；拉真实数据渲染进页面，接 [异步编程入门](/javascript/250-AsyncProgramming) 的 fetch；
- 往后：[BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel) 管树外的窗口与地址栏；[DOM 事件系统深入](/javascript/415-DOMEventSystemDeepDive) 把冒泡与委托讲透；[fetch 与 AbortController](/javascript/440-FetchApiAndAbortController) 接手网络请求；[项目实战：待办应用](/javascript/700-JavaScriptProjectExampleTodoApp) 把第 9 节长成完整工程。

## 15. 官方文档

- MDN DOM 入门：https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model
- querySelector：https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector
- classList：https://developer.mozilla.org/zh-CN/docs/Web/API/Element/classList
- addEventListener：https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener

## 16. 自我检查

- 能说出两类节点的关系，解释「Node 里为什么没有 document」；
- 能预测 querySelector 查不到时的返回值，说出头号报错全文；
- 能背出「用户输入只进 textContent」的红线及理由；
- 拿到头号报错，能按三步定位并用 defer 修复。

## 本章总结

浏览器把 HTML 解析成对象树交给 JS，根是 document：querySelector 查人（查不到返回 null），textContent 改纯文本（用户输入的安全通道），classList 管类名，addEventListener 登记回调（事件对象告诉你谁被点了）。事件命中目标后沿父级向上冒泡，父元素因此一个监听管住整个列表。最常见崩溃是脚本跑在元素前面——查询拿到 null，addEventListener 一调就炸，defer 是标准解法。这些零件合起来就是待办单项交互，也是 700 篇项目的地基。

## 下一步

进入 [BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel)：从树里的元素走向树外的浏览器——窗口、地址栏、历史记录。
