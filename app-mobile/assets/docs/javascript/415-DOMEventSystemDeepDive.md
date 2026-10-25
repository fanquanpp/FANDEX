---
order: 470
title: DOM 事件系统深入
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 事件流三阶段实验、preventDefault 与 stopPropagation 的分工、事件委托两段实战（列表高亮与 data-* 分组分发）、常见事件族与 removeEventListener 正确姿势，含三个真实翻车现场的纠错练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：DOM 事件系统——事件流（捕获/目标/冒泡）、事件对象、事件委托与监听器生命周期。
- **解决什么问题**：[DOM 基础](/javascript/410-DOMOperationEvent)里事件冒泡"第一次现身"，但"点了一下子元素为什么父级也响应""一个列表一百个 li 要不要绑一百次""a 标签怎么阻止跳转"这些问题要靠完整的流模型来答。
- **什么时候用到**：写任何交互的第一天；排查"事件触发两次/没触发/触发在错误的元素上"；性能优化（委托减少监听器数量）。
- **前置**：[DOM 操作与事件](/javascript/410-DOMOperationEvent)；[定时器与调度](/javascript/255-TimersAndScheduling)（本篇练习里的轮播按钮会用到）。

## 0. 一句话理解

> 一次点击不是"点在按钮上"这一件事，而是事件从 window 出发往下走（捕获）、到达目标（目标阶段）、再原路冒回顶层（冒泡）的完整旅程。addEventListener 的第三个参数决定你在旅程的哪一段接客。

## 1. 三阶段实验：亲手把事件流走一遍

准备三层嵌套：`body > div#box > span`，三层都挂 click 监听（[DOM 基础](/javascript/410-DOMOperationEvent)篇的冒泡例子的完整版）：

```html
<body>
  <div id="box"><span id="inner">点我</span></div>
</body>
```

```javascript
const inner = document.querySelector('#inner');
const box = document.querySelector('#box');

// 第三个参数 true = 捕获阶段监听；默认 false = 冒泡阶段监听
document.body.addEventListener('click', () => console.log('body-冒泡'), false);
document.body.addEventListener('click', () => console.log('body-捕获'), true);
box.addEventListener('click', () => console.log('box-冒泡'), false);
box.addEventListener('click', () => console.log('box-捕获'), true);
inner.addEventListener('click', () => console.log('inner'), false);
```

点击 span，输出顺序固定为：

```text
body-捕获  →  box-捕获  →  inner  →  box-冒泡  →  body-冒泡
```

这就是三阶段：**捕获从外向内**（body → box → span），**目标阶段**（span 自己，捕获/冒泡监听按注册顺序执行），**冒泡从内向外**（span → box → body）。两个必考细节：目标元素上的两类监听按**注册顺序**执行（不分捕获冒泡）；`event.eventPhase` 属性可在运行时打印当前阶段（1 捕获 / 2 目标 / 3 冒泡），把它加进三个日志里亲手验证一遍比背十遍都牢。

## 2. 事件对象：preventDefault 与 stopPropagation

回调的第一个参数是事件对象，由浏览器自动传入——**必须用这个形参**，见第 6 节的真实翻车。它最常用的两个方法经常被混为一谈：

| 方法 | 干什么 | 不管什么 |
| :--- | :--- | :--- |
| `event.preventDefault()` | 取消**默认行为**（a 跳转、表单提交、右键菜单） | 事件继续冒泡 |
| `event.stopPropagation()` | 切断**传播**（不再走后面的捕获/冒泡） | 默认行为照常发生 |

```javascript
// 场景一：拦截 a 标签跳转，做 SPA 式路由
document.querySelector('a#logout').addEventListener('click', (event) => {
  event.preventDefault();      // 不跳转
  doLogout();                  // 改走自己的逻辑
});

// 场景二：输入框只允许数字——键盘事件无默认行为可"跳转"，
// 但阻止的是字符被输入这个默认结果
input.addEventListener('keydown', (event) => {
  if (!/^\d$/.test(event.key) && event.key !== 'Backspace') {
    event.preventDefault();    // 非数字键不进入输入框
  }
});

// 场景三：按钮点击要"既不冒泡也不触发默认"，两个一起加
btn.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  handleOnlyHere();
});
```

为什么"想阻止冒泡时两个方法都加"是课件里反复强调的口径：`stopPropagation` 只管传播，如果这个元素还有浏览器默认行为（比如它其实是超链接或提交按钮），默认行为会照常发生——单独调用它的代码经常"看起来没生效"。现代补充：`event.stopPropagationImmediate()` 连**同一元素上排在本回调之后**的监听器也取消；`{ once: true }` 选项则让监听器触发一次后自动移除，不必手写 removeEventListener。

## 3. 事件委托：把一百个监听器变成一个

子元素的事件会冒泡到父级——那就只在父级挂一个监听器，用 `event.target`（**实际被点的元素**）分发。这与 `event.currentTarget`（**监听器挂在谁身上**）是委托的两个支柱：

```text
event.target       用户真正点中的元素（li、span、文字节点都可能是它）
event.currentTarget 监听器所在元素（= 委托场景下的父容器）
```

### 3.1 实战一：列表高亮切换

需求来自课程实战：点击列表项高亮它，同时取消上一个高亮。传统做法给每个 li 绑监听、切换时再 for 循环清除；委托版只要一个监听器：

```javascript
const list = document.querySelector('.list');
let currentActive = null;

list.addEventListener('click', (event) => {
  const li = event.target.closest('li');   // closest：从被点元素向上找最近的 li
  if (!li || !list.contains(li)) return;   // 点在列表缝隙里：忽略
  if (currentActive) currentActive.classList.remove('active');
  li.classList.add('active');
  currentActive = li;
});
```

`closest('li')` 是委托的标配：`event.target` 可能是 li 里面的 span，直接对 target 加 class 会加错层；closest 从命中点向上冒泡查找，点在 span 上也能找到它所属的 li。**为什么委托更快**：监听器从 N 个变 1 个（内存省）；列表项是 JS 动态增删的也不用重新绑定（新增的 li 自动被父级覆盖）。

### 3.2 实战二：data-* 分组分发（工具栏模式）

工具栏有一排操作按钮（新建、搜索、导出……），用 `data-action` 声明语义，一个监听器 + switch 分发：

```javascript
const toolbar = document.querySelector('.toolbar');

toolbar.addEventListener('click', (event) => {
  const action = event.target.dataset.action; // data-action 属性 → dataset.action
  switch (action) {
    case 'new':
      openEditor();
      break;                    // 每个 case 必须有 break，见第 6 节翻车
    case 'search':
      focusSearch();
      break;
    case 'export':
      exportData();
      break;
    default:
      return;                   // 点到图标空白处：action 是 undefined，安静返回
  }
});
```

`dataset` 是 HTML `data-*` 属性的 JS 映射：`data-action` 对应 `dataset.action`（驼峰化）。这个模式把"按钮集合"变成一张**声明式的路由表**——加新按钮只要在 HTML 里补一个 `data-action`，JS 的 switch 加一个 case，没有新的 addEventListener。

## 4. 常见事件族速查

| 族 | 事件 | 触发时机与要点 |
| :--- | :--- | :--- |
| 鼠标 | `click` / `dblclick` / `mousedown` / `mouseup` / `mouseover` / `mouseout` | `mouseover/out` 会因进入子元素而反复触发；只关心"进出自身"用 `mouseenter/mouseleave`（不冒泡） |
| 键盘 | `keydown` / `keyup` | `event.key` 是字符（"a"、"Enter"），长按连续触发 keydown |
| 焦点 | `focus` / `blur`（不冒泡） / `focusin` / `focusout`（冒泡） | 委托焦点事件要选带 in/out 的版本 |
| 表单 | `input`（每敲一键） / `change`（失焦且值变了） / `submit` | 实时校验用 input，最终校验用 change/submit |
| 文档 | `DOMContentLoaded` / `load` | 前者 DOM 树就绪（图片未加载），后者全部资源就绪；脚本放 body 底部时可省 DOMContentLoaded |

`DOMContentLoaded` 与 `load` 的区别是高频考点：轮播初始化要等**图片**（否则读不到宽高）就用 `load`；只是绑按钮、读文本内容，`DOMContentLoaded` 更早更好。键盘事件的键位判断（`event.key`、方向键移动元素）在 [BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel) 的键盘节里有对照表。

## 5. removeEventListener 的正确姿势

移除监听的条件是**同一个元素 + 同一事件类型 + 同一个函数引用**：

```javascript
function onResize() { /* ... */ }

window.addEventListener('resize', onResize);
window.removeEventListener('resize', onResize);   // 能移除：同一个函数引用

// 移除失败的两种典型：
el.addEventListener('click', function () { /* ... */ });
el.removeEventListener('click', function () { /* ... */ }); // 不同引用，移不掉

el.addEventListener('click', (e) => handle(e, 1));          // 匿名函数无法移除
```

匿名函数没有名字、每次书写都是新函数对象，永远无法匹配。所以要移除的监听器**必须先把函数存进变量**。组件卸载时清理监听（React 的 useEffect 返回值、原生 SPA 的销毁钩子）是这条规则的刚需场景，泄漏机制见 [内存管理](/javascript/350-MemoryManagementAndGarbageCollection)。

## 6. 三个真实翻车现场（纠错练习）

以下案例全部来自真实课堂源码与作业，先自己找错再展开答案。

**现场一：`Event` 大写。** 学生源码 shijianliu.js：

```javascript
box.addEventListener('click', function (e) {
  Event.preventDefault();   // 运行报错
});
```

<details>
<summary>纠错</summary>

`Event` 是**构造函数/全局类**，不是事件对象——调用 `Event.preventDefault()` 报 `Event.preventDefault is not a constructor` 一类的错误。事件对象是回调的**形参**（这里叫 `e`），正确写法 `e.preventDefault()`。记忆口诀：形参收到的才是"这一次点击"，`Event` 类只是"事件这一概念"。

</details>

**现场二：switch 漏 break。** 学生源码 shijianweituo.js，点击"新建"按钮把三个分支全执行了：

```javascript
switch (action) {
  case 'new':
    createDoc();
  case 'search':
    focusSearch();
  case 'export':
    exportData();
}
```

<details>
<summary>纠错</summary>

switch 的 case 不写 `break` 会**穿透**到下一个 case 继续执行——点"新建"依次执行 createDoc、focusSearch、exportData。每个 case 分支末尾补 `break;`（或统一用 `return`）。这是[控制流](/javascript/060-ControlFlow)里 switch 章的翻车案例在事件场景的再现，也是第 3.2 节示例里每个 case 都带 break 的原因。

</details>

**现场三：removeEventListener 参数写反。** 教师示例文件里的原始写法：

```javascript
spanEl.addEventListener('click', spanEv);
spanEl.removeEventListener(spanEl, spanEv);   // 移除无效
```

<details>
<summary>纠错</summary>

`removeEventListener` 的参数顺序与 add 相同：**先事件名，再函数**。`removeEventListener(spanEl, spanEv)` 把元素对象当成了事件类型字符串，静默失败（不报错，但监听器还在）。正确写法 `spanEl.removeEventListener('click', spanEv)`。它的隐蔽性在于**没有报错**——排查手段是点击后观察回调是否仍触发，或用 `getEventListeners(el)`（DevTools 专用）检查。

</details>

## 7. 动手实践

任务（先写，写完再展开参考实现）：

1. 复现第 1 节的三层实验，并把 `event.eventPhase` 加进每条日志，验证 1/2/3 的阶段编号。
2. 用委托实现一个 todo 列表的"点击删除"：每行有删除按钮，只允许在 `<ul>` 上挂一个监听器。
3. 写一个"右键自定义菜单"：在图片上右键时弹出自己的菜单（阻止默认菜单），点击页面其他地方关闭菜单。
4. 纠错题：下面代码想"点击后只弹一次"，实际每点一次弹一次，为什么？`btn.addEventListener('click', function once() { alert('hi'); }); btn.removeEventListener('click', function once() { alert('hi'); });`

提示：第 2 题先问"点到的会不会是按钮里的 svg/span"；第 3 题菜单的打开监听与关闭监听可以都挂在 document 上靠 target 区分；第 4 题回看第 5 节的"同一个函数引用"。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```javascript
// 2：todo 删除的委托
list.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-role="delete"]');
  if (!btn || !list.contains(btn)) return;
  btn.closest('li').remove();     // 从按钮向上找行再删行
});

// 3：自定义右键菜单
const menu = document.querySelector('#ctx-menu');
img.addEventListener('contextmenu', (e) => {
  e.preventDefault();                       // 关掉浏览器默认菜单
  menu.style.left = `${e.pageX}px`;         // 定位到鼠标处
  menu.style.top = `${e.pageY}px`;
  menu.hidden = false;
});
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target)) menu.hidden = true; // 点在菜单外就关
});

// 4：两个 function once() 是两个不同的函数对象——
// 即便代码一字不差，每次求值函数表达式都会创建新引用。
// 修法：存变量。
//   const once = () => alert('hi');
//   btn.addEventListener('click', once);
//   btn.removeEventListener('click', once);   // 这才移得掉
//   （或者一步到位：btn.addEventListener('click', once, { once: true })）
```

</details>

## 8. 下一步

- [BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel)：window 级事件与键盘对照表；
- [防抖与节流](/javascript/490-DebounceThrottle)：scroll/resize/input 这类高频事件的频率治理；
- [Service Worker 与 PWA](/javascript/680-ServiceWorkerPWA)：fetch 事件——事件模型的"另一个世界"。

## 参考与致谢

- MDN Web Docs：Introduction to events、Event reference（CC-BY-SA 2.5），https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events
- DOM Living Standard：event dispatch 与 EventTarget，https://dom.spec.whatwg.org/#dispatching-events
- 本篇三阶段实验、委托两例与三个翻车现场的教学蓝本来自教师源码与学生作业素材（02~06 事件系列、shijianliu.js、shijianweituo.js），代码为重写并补充工程要点。
