---
order: 80
tags:
  - javascript
difficulty: intermediate
title: 'DOM 操作与事件'
module: javascript
category: 'JS Basics'
description: 'DOM 树操作、事件模型与事件委托。'
author: Anonymous
related:
  - javascript/Records与Tuples
  - javascript/对象与数组
  - javascript/JavaScript最新特性与运行时
  - javascript/模块化
prerequisites:
  - javascript/语法速查
---

## 1. DOM 基础 (DOM Basics)

### 1.1 DOM 树结构

DOM（Document Object Model）把 HTML 文档表示为一棵节点树。浏览器解析 HTML 后，会构建如下结构：

```
 document
 └── html
  ├── head
  │ ├── meta
  │ ├── title
  │ └── link
  └── body
  ├── header
  │ └── nav
  ├── main
  │ ├── section
  │ └── article
  └── footer
```

每个 HTML 标签对应一个**元素节点**，标签内的文本对应**文本节点**。

### 1.2 节点类型

DOM 中有 12 种节点类型，最常用的有：
| 节点类型 | `nodeType` 值 | 说明 | 示例 |
|:--|:--|:--|:--|
| `Element` | 1 | 元素节点 | `<div>`, `<p>` |
| `Text` | 3 | 文本节点 | 标签间的文字 |
| `Comment` | 8 | 注释节点 | `<!-- comment -->` |
| `Document` | 9 | 文档节点 | `document` |
| `DocumentType` | 10 | 文档类型 | `<!DOCTYPE html>` |
| `DocumentFragment` | 11 | 文档片段 | 轻量级容器 |

```js
const el = document.querySelector('div');
el.nodeType;
el.nodeName;
const text = el.firstChild;
text.nodeType;
text.nodeName;
```

### 1.3 节点关系

```
 parentElement
 ├── firstChild / firstElementChild
 ├── child1
 ├── child2 (previousSibling ← → nextSibling)
 ├── child3
 └── lastChild / lastElementChild
```

**节点导航属性**：

```js
const el = document.querySelector('li');
el.parentNode;
el.parentElement;
el.childNodes;
el.children;
el.firstChild;
el.firstElementChild;
el.lastChild;
el.lastElementChild;
el.previousSibling;
el.previousElementSibling;
el.nextSibling;
el.nextElementSibling;
```

**`Node` vs `Element` 属性区别**：

- `childNodes` / `firstChild` / `nextSibling`：包含所有节点类型（文本、注释等）
- `children` / `firstElementChild` / `nextElementSibling`：只包含元素节点

```html
<ul id="list">
  <li>A</li>
  <li>B</li>
</ul>
```

```js
const list = document.getElementById('list');
list.childNodes.length;
list.children.length;
```

---

## 2. 查询与遍历 (Query & Traverse)

### 2.1 常用查询 API

```js
const app = document.getElementById('app');
const firstBtn = document.querySelector('button');
const items = document.querySelectorAll('.item');
```

| API                      | 返回类型         | 动态/静态 | 兼容性 |
| :----------------------- | :--------------- | :-------- | :----- |
| `getElementById`         | Element / null   | —         | IE6+   |
| `getElementsByClassName` | HTMLCollection   | 动态      | IE9+   |
| `getElementsByTagName`   | HTMLCollection   | 动态      | IE6+   |
| `querySelector`          | Element / null   | —         | IE8+   |
| `querySelectorAll`       | NodeList（静态） | 静态      | IE8+   |

### 2.2 节点集合差异

- `NodeList` 可能是静态也可能是动态（取决于来源）
- `HTMLCollection` 通常是动态集合（会随 DOM 变化）

```js
const liveList = document.getElementsByClassName('item');
const staticList = document.querySelectorAll('.item');
document.body.append(document.createElement('div'));
liveList.length;
staticList.length;
```

工程实践里，若要数组方法：

```js
const arr = Array.from(document.querySelectorAll('.item'));
const arr2 = [...document.querySelectorAll('.item')];
```

### 2.3 `closest()` 与 `matches()`

```js
const btn = document.querySelector('button');
btn.closest('.card');
btn.closest('.card').querySelector('.title');
btn.matches('.primary');
btn.matches('button');
```

- `closest(selector)`：从自身开始向上查找，返回最近的匹配祖先（或自身）
- `matches(selector)`：检查元素是否匹配选择器，返回 `boolean`

### 2.4 遍历 DOM 树

```js
function walkDOM(node, callback) {
  callback(node);
  node = node.firstChild;
  while (node) {
    walkDOM(node, callback);
    node = node.nextSibling;
  }
}
walkDOM(document.body, (node) => {
  if (node.nodeType === 1) {
    console.log(node.tagName);
  }
});
```

---

## 3. 创建与插入节点 (Create & Insert)

### 3.1 创建元素与文本

```js
const li = document.createElement('li');
li.className = 'item';
li.textContent = 'hello';
const text = document.createTextNode('world');
```

优先使用 `textContent` 来设置文本，避免把不可信内容当作 HTML 解析。

### 3.2 插入与移动

- `parent.append(child)`：追加（可追加多个参数）
- `parent.prepend(child)`：头部插入
- `node.before(x)` / `node.after(x)`：在节点前后插入
- `parent.replaceChild(newNode, oldNode)`：替换
- `node.replaceWith(newNode)`：替换自身
  节点插入时会发生"移动"，不会复制：

```js
const a = document.querySelector('#a');
const b = document.querySelector('#b');
const x = document.querySelector('#x');
b.append(x);
```

### 3.3 复制节点

```js
const original = document.querySelector('.card');
const copy = original.cloneNode(true);
document.body.append(copy);
```

- `cloneNode(false)`（默认）：浅克隆，只复制元素本身
- `cloneNode(true)`：深克隆，复制元素及其所有子节点
  [警告] **注意**：克隆不会复制事件监听器和 `data-*` 属性中通过 JS 设置的值。

### 3.4 删除节点

```js
const el = document.querySelector('.item');
el.remove();
const parent = document.querySelector('.list');
const child = parent.querySelector('.item');
parent.removeChild(child);
```

- `el.remove()`：现代 API，直接删除自身
- `parent.removeChild(child)`：经典 API，返回被删除的节点

### 3.5 批量更新：DocumentFragment

批量创建并一次性插入可减少重排重绘：

```js
const frag = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = String(i);
  frag.append(div);
}
document.body.append(frag);
```

Fragment 插入时，其子节点会被插入，Fragment 本身不会成为 DOM 的一部分。
**现代替代方案**：直接构建 HTML 字符串

```js
const html = Array.from({ length: 1000 }, (_, i) => `<div>${i}</div>`).join('');
container.innerHTML = html;
```

## 在大量简单元素场景下，`innerHTML` 可能比逐个 `createElement` 更快，但需注意 XSS 风险。

## 4. 属性操作 (Attribute Operations)

### 4.1 HTML 属性 vs DOM 属性

```html
<input id="name" type="text" value="hello" class="input-field" data-role="username" />
```

```js
const input = document.getElementById('name');
input.getAttribute('type');
input.getAttribute('value');
input.getAttribute('class');
input.type;
input.value;
input.className;
```

**关键区别**：
| 对比项 | HTML 属性 (`getAttribute`) | DOM 属性 (`obj.prop`) |
|:--|:--|:--|
| 来源 | HTML 标签上的属性 | DOM 对象的属性 |
| 值类型 | 始终是字符串 | 可以是任意类型 |
| 同步性 | 初始值，不随用户输入变化 | 实时值（如 `input.value`） |
| 自定义属性 | `getAttribute('data-x')` | `dataset.x` |

```js
input.value = 'changed';
input.getAttribute('value');
input.value;
input.setAttribute('value', 'new default');
input.getAttribute('value');
```

### 4.2 `setAttribute` / `getAttribute` / `removeAttribute`

```js
const img = document.querySelector('img');
img.setAttribute('src', 'photo.jpg');
img.setAttribute('alt', 'A photo');
img.getAttribute('src');
img.removeAttribute('alt');
img.hasAttribute('alt');
```

### 4.3 `dataset`（自定义数据属性）

```html
<div id="user" data-user-id="42" data-role="admin" data-last-login="2026-01-01">User Info</div>
```

```js
const el = document.getElementById('user');
el.dataset.userId;
el.dataset.role;
el.dataset.lastLogin;
el.dataset.status = 'active';
el.dataset.newField = 'value';
```

**命名规则**：

- HTML 中 `data-user-id` → JS 中 `dataset.userId`（短横线转驼峰）
- `dataset` 的值始终是字符串
- 设置新属性时驼峰会自动转为短横线

### 4.4 布尔属性

```html
<input type="checkbox" checked disabled /> <button disabled>Click</button>
```

```js
const checkbox = document.querySelector('input[type="checkbox"]');
checkbox.hasAttribute('checked');
checkbox.checked;
checkbox.getAttribute('checked');
checkbox.checked = checkbox.setAttribute('checked', '');
```

## 布尔属性（`checked`、`disabled`、`selected`、`readonly`）推荐使用 DOM 属性而非 `setAttribute`。

## 5. 样式操作 (Style Operations)

### 5.1 `style` 属性（行内样式）

```js
const el = document.querySelector('.box');
el.style.width = '200px';
el.style.backgroundColor = 'red';
el.style.fontSize = '16px';
el.style.display = 'none';
el.style.display = '';
```

**注意**：

- `style` 只能读写行内样式，无法获取 CSS 类或 `<style>` 中的样式
- CSS 属性名需转为驼峰：`background-color` → `backgroundColor`
- 设置空字符串 `''` 可移除行内样式

### 5.2 `classList`（类名操作）

```js
const el = document.querySelector('.box');
el.classList.add('active');
el.classList.remove('hidden');
el.classList.toggle('dark-mode');
el.classList.toggle('visible', window.innerWidth > 768);
el.classList.contains('active');
el.classList.replace('old-class', 'new-class');
el.className = 'box active dark-mode';
```

| 方法                    | 说明                                       |
| :---------------------- | :----------------------------------------- |
| `add(...tokens)`        | 添加一个或多个类名                         |
| `remove(...tokens)`     | 移除一个或多个类名                         |
| `toggle(token, force?)` | 切换类名，`force` 为 `` 添加，`false` 移除 |
| `contains(token)`       | 是否包含指定类名                           |
| `replace(old, new)`     | 替换类名                                   |

**`className` vs `classList`**：

```js
el.className = 'box active';
el.className += ' dark-mode';
el.classList.add('active', 'dark-mode');
```

推荐使用 `classList`，语义更清晰且不会意外覆盖已有类名。

### 5.3 `getComputedStyle`（计算样式）

获取元素最终应用的样式（包括 CSS 继承、层叠、默认值）：

```js
const el = document.querySelector('.box');
const styles = window.getComputedStyle(el);
styles.width;
styles.height;
styles.backgroundColor;
styles.fontSize;
styles.marginTop;
styles.getPropertyValue('margin-top');
```

**注意**：

- 返回的是**只读**的 `CSSStyleDeclaration` 对象
- 返回的值是**计算值**（如 `font-size: 2em` 可能返回 `32px`）
- 简写属性（如 `margin`）可能返回空字符串，需查具体子属性（如 `marginTop`）

### 5.4 获取元素尺寸与位置

```js
const el = document.querySelector('.box');
el.offsetWidth;
el.offsetHeight;
el.clientWidth;
el.clientHeight;
el.scrollWidth;
el.scrollHeight;
el.offsetTop;
el.offsetLeft;
el.offsetParent;
el.scrollTop;
el.scrollLeft;
```

**尺寸属性对比**：
| 属性 | 包含 padding | 包含 border | 包含 scrollbar | 包含溢出内容 |
|:--|:--|:--|:--|:--|
| `clientWidth/Height` | [完成] | [错误] | [错误] | [错误] |
| `offsetWidth/Height` | [完成] | [完成] | [完成] | [错误] |
| `scrollWidth/Height` | [完成] | [错误] | [错误] | [完成] |
**获取精确位置**：

```js
const rect = el.getBoundingClientRect();
rect.top;
rect.right;
rect.bottom;
rect.left;
rect.width;
rect.height;
rect.x;
rect.y;
```

## `getBoundingClientRect()` 返回相对于**视口**的位置，随滚动变化。

## 6. 事件系统 (Events)

### 6.1 监听与移除

```js
function onClick(e) {
  console.log('clicked', e.target);
}
const btn = document.querySelector('#btn');
btn.addEventListener('click', onClick);
btn.removeEventListener('click', onClick);
```

移除监听必须使用同一个函数引用，因此匿名函数不便于移除。
**`addEventListener` 第三个参数**：

```js
btn.addEventListener('click', handler, {
  capture: false,
  once: true,
  passive: True,
});
```

| 选项      | 说明                                                        |
| :-------- | :---------------------------------------------------------- |
| `capture` | 在捕获阶段触发（默认 `false`，冒泡阶段）                    |
| `once`    | 触发一次后自动移除（默认 `false`）                          |
| `passive` | 声明不会调用 `preventDefault`，优化滚动性能（默认 `false`） |

### 6.2 捕获与冒泡

DOM 事件传播的三个阶段：

```
 1. 捕获阶段（Capture）：window → document → ... → 目标父元素
 2. 目标阶段（Target）：目标元素本身
 3. 冒泡阶段（Bubble）：目标父元素 → ... → document → window
```

```html
<div id="outer">
  <div id="inner">
    <button id="btn">Click</button>
  </div>
</div>
```

```js
document.getElementById('outer').addEventListener(
  'click',
  (e) => {
    console.log('outer capture', e.eventPhase);
  },
  true
);
document.getElementById('outer').addEventListener('click', (e) => {
  console.log('outer bubble', e.eventPhase);
});
document.getElementById('inner').addEventListener(
  'click',
  (e) => {
    console.log('inner capture', e.eventPhase);
  },
  true
);
document.getElementById('inner').addEventListener('click', (e) => {
  console.log('inner bubble', e.eventPhase);
});
document.getElementById('btn').addEventListener('click', (e) => {
  console.log('btn target', e.eventPhase);
});
```

点击按钮后输出顺序：

```
 outer capture 1
 inner capture 1
 btn target 2
 inner bubble 3
 outer bubble 3
```

**`eventPhase` 值**：1 = 捕获，2 = 目标，3 = 冒泡

### 6.3 事件对象常用属性与方法

```js
btn.addEventListener('click', (e) => {
  e.target;
  e.currentTarget;
  e.type;
  e.bubbles;
  e.cancelable;
  e.timeStamp;
  e.isTrusted;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
});
```

| 属性/方法                    | 说明                                 |
| :--------------------------- | :----------------------------------- |
| `target`                     | 触发事件的元素（最内层）             |
| `currentTarget`              | 绑定事件监听的元素（等于 `this`）    |
| `preventDefault()`           | 阻止默认行为（如表单提交、链接跳转） |
| `stopPropagation()`          | 阻止事件继续传播（捕获/冒泡）        |
| `stopImmediatePropagation()` | 阻止传播 + 阻止同元素上的后续监听器  |

### 6.4 事件委托 (Event Delegation)

当列表项动态增删时，把监听挂在父元素上更稳：

```js
const list = document.querySelector('#list');
list.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  console.log('item clicked', item.dataset.id);
});
```

**事件委托的优势**：

1. **减少内存**：不需要为每个子元素绑定监听器
2. **动态元素**：新增子元素自动拥有事件处理
3. **统一管理**：代码更集中、更易维护
   **适用场景**：

```js
document.addEventListener('click', (e) => {
  if (e.target.matches('.modal-overlay')) {
    closeModal();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
```

**不适合委托的场景**：

- `focus`/`blur` 事件（不冒泡，需用 `focusin`/`focusout` 替代）
- `mousemove`/`touchmove` 等高频事件（委托反而增加判断开销）
- 需要精确 `currentTarget` 的场景

### 6.5 自定义事件

```js
 const event = new CustomEvent('userLogin', {
  bubbles: true,
  detail: { userId: 42, username: 'alice' }
 }
 document.dispatchEvent(event)
 document.addEventListener('userLogin', (e) => {
  console.log('User logged in:', e.detail.username)
 }
```

**应用场景**：

```js
class TodoList extends HTMLElement {
  addTodo(text) {
    const todo = { id: Date.now(), text };
    this.dispatchEvent(
      new CustomEvent('todo-added', {
        bubbles: true,
        detail: todo,
      })
    );
  }
}
document.querySelector('todo-list').addEventListener('todo-added', (e) => {
  console.log('New todo:', e.detail.text);
});
```

### 6.6 常用事件类型汇总

| 分类 | 事件                                                     | 说明     |
| :--- | :------------------------------------------------------- | :------- |
| 鼠标 | `click`, `dblclick`, `mousedown`, `mouseup`, `mousemove` | 鼠标交互 |
| 鼠标 | `mouseenter`, `mouseleave`, `mouseover`, `mouseout`      | 鼠标悬停 |
| 键盘 | `keydown`, `keyup`, `keypress`(已废弃)                   | 键盘输入 |
| 表单 | `input`, `change`, `submit`, `focus`, `blur`             | 表单交互 |
| 滚动 | `scroll`, `wheel`                                        | 滚动行为 |
| 触摸 | `touchstart`, `touchmove`, `touchend`                    | 移动端   |
| 拖拽 | `dragstart`, `drag`, `dragend`, `drop`                   | 拖放操作 |
| 资源 | `load`, `error`, `DOMContentLoaded`                      | 资源加载 |
| 视口 | `resize`, `scroll`, `visibilitychange`                   | 视口变化 |

---

## 7. 性能优化 (Performance)

### 7.1 避免布局抖动 (Layout Thrashing)

读布局信息（如 `offsetHeight`）会触发布局计算；写样式会使布局失效。交替读写会导致反复布局。

```js
const items = document.querySelectorAll('.item');
items.forEach((item) => {
  const height = item.offsetHeight;
  item.style.height = height * 2 + 'px';
});
```

优化：批量读取，再批量写入：

```js
const items = document.querySelectorAll('.item');
const heights = Array.from(items, (item) => item.offsetHeight);
items.forEach((item, i) => {
  item.style.height = heights[i] * 2 + 'px';
});
```

或使用 `requestAnimationFrame`：

```js
function updateLayout() {
  const height = el.offsetHeight;
  requestAnimationFrame(() => {
    el.style.height = height * 2 + 'px';
  });
}
```

### 7.2 `innerHTML` 的取舍

- 优点：构建复杂结构时省代码
- 风险：容易引入 XSS；会重建子树导致事件丢失
  当内容来自不可信输入时，不要直接拼接 `innerHTML`。

### 7.3 DocumentFragment 与批量操作

```js
const frag = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  frag.append(li);
}
list.append(frag);
```

Fragment 的优势：

- 不触发重排（不在 DOM 中）
- 插入时 Fragment 自身不进入 DOM 树
- 一次重排代替 N 次重排

### 7.4 事件节流与防抖

高频事件（`scroll`、`resize`、`input`、`mousemove`）需要节流或防抖：

```js
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
function throttle(fn, interval) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
window.addEventListener(
  'resize',
  debounce(() => {
    console.log('Resized:', window.innerWidth);
  }, 200)
);
window.addEventListener(
  'scroll',
  throttle(() => {
    console.log('Scrolled:', window.scrollY);
  }, 100)
);
```

**防抖 vs 节流**：
| 对比项 | 防抖 (Debounce) | 节流 (Throttle) |
|:--|:--|:--|
| 触发时机 | 停止操作后延迟触发 | 按固定间隔触发 |
| 类比 | 电梯等人 | 红绿灯 |
| 适用场景 | 搜索输入、窗口调整 | 滚动事件、拖拽 |

### 7.5 虚拟 DOM 概念

直接操作 DOM 的代价高（重排重绘），现代框架引入虚拟 DOM 来优化：

```js
const vnode = {
  tag: 'div',
  props: { className: 'container' },
  children: [
    { tag: 'h1', children: 'Hello' },
    { tag: 'p', children: 'World' },
  ],
};
```

**虚拟 DOM 的工作流程**：

1. 用 JS 对象描述 UI 结构（虚拟 DOM 树）
2. 状态变化时，创建新的虚拟 DOM 树
3. Diff 算法比较新旧虚拟 DOM 树差异
4. 只将差异部分更新到真实 DOM（最小化 DOM 操作）
   **虚拟 DOM 的优势**：

- 批量更新：多次状态变更合并为一次 DOM 更新
- 最小化操作：只更新变化的部分
- 跨平台：虚拟 DOM 可以渲染到不同目标（DOM、Canvas、Native）
  **何时直接操作 DOM**：
- 简单交互（不需要框架时）
- 性能极端敏感的场景（如动画、Canvas）
- 与框架配合的底层操作（如 D3.js 与 React 结合）

### 7.6 `passive` 事件监听器

```js
 document.addEventListener('touchstart', handler, { passive:  })
 document.addEventListener('wheel', handler, { passive:  })
```

`passive: ` 告诉浏览器该监听器不会调用 `preventDefault()`，浏览器可以立即开始滚动而不必等待 JS 执行完毕。
Chrome 对 `touchstart`/`touchmove` 默认使用 passive 监听器。

---

## 8. 安全要点 (Security)

### 8.1 XSS 防护

- 不可信文本：用 `textContent`

```js
const userInput = '<img src=x onerror=alert(1)>';
el.textContent = userInput;
el.innerHTML = userInput;
```

- 不可信 URL：校验协议（避免 `javascript:`）、限制域名

```js
function isSafeUrl(url) {
  try {
    const parsed = new URL(url, location.href);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### 8.2 `innerHTML` 安全

```js
const name = getUserInput();
el.innerHTML = `<p>Hello, ${name}</p>`;
```

**安全替代方案**：

```js
const p = document.createElement('p');
p.textContent = `Hello, ${name}`;
el.append(p);
```

或使用 `DOMPurify` 库：

```js
import DOMPurify from 'dompurify';
el.innerHTML = DOMPurify.sanitize(untrustedHtml);
```

### 8.3 事件监听器泄漏

```js
class Modal {
  constructor() {
    this.onKeydown = this.onKeydown.bind(this);
  }
  open() {
    document.addEventListener('keydown', this.onKeydown);
  }
  close() {
    document.removeEventListener('keydown', this.onKeydown);
  }
  onKeydown(e) {
    if (e.key === 'Escape') this.close();
  }
}
```

**常见泄漏场景**：

- SPA 路由切换时未移除全局事件监听
- 组件销毁时未清理 `setInterval`/`setTimeout`
- 闭包引用了已移除的 DOM 节点

### 8.4 模板渲染安全

优先使用成熟框架或做统一的转义/白名单策略：

```js
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}
el.innerHTML = `<p>${escapeHtml(userInput)}</p>`;
```

---

### 更新日志 (Changelog)

- 2026-05-27: v1.0.0 大幅扩充——新增节点类型与关系详解、属性操作(dataset/getAttribute)、样式操作(classList/getComputedStyle/getBoundingClientRect)、自定义事件、事件节流防抖、虚拟DOM概念、passive监听器、XSS防护与事件泄漏
- 2026-04-06: 新增「DOM 操作与事件」知识点，补充事件委托、性能与安全实践
