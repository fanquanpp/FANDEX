---
order: 280
title: 拖拽 API
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 用原生 Drag and Drop 从零做出一个文件拖入上传区与可排序列表：七事件的握手协议、dataTransfer 的读写规则、移动端为何失效与 Pointer Events 替代。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/160-ProgressMeter'
  - 'html5/140-ImagesAndResponsiveImages'
  - 'html5/430-HTML5DialogPopoverGuide'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置知识

- [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)
- JavaScript 事件监听基础（`javascript/001`-`005` 与 `javascript/039`，DOM 与事件）。本篇所有交互都靠事件驱动，没有事件基础会读不懂代码。

> 测试提示：拖拽在 `file://` 直接打开大多可用，但部分浏览器行为受限，建议用 VS Code 的 Live Server 或 `npx serve` 起本地服务器测试；移动端触摸不触发本 API，替代方案见第 7 节。

## 1. 场景切入：把图片拖进网页就上传

你往 FANDEX 网页端传一张律动背景素材，或者往 pixel-vault 的作品上传页丢一张像素画：把文件从桌面按住、拖到浏览器窗口里，页面浮出一圈虚线框，一松手，文件进来了。网盘、邮箱、设计工具的网页版全都有这个交互。

这类"拖入区"背后就是浏览器原生的 HTML5 Drag and Drop API。它不引入任何库，核心只有三步：

1. 给源元素标 `draggable="true"`，在 `dragstart` 里"打包数据"；
2. 给目标区域在 `dragover` 里"放行"（不拦截就收不到投放）；
3. 在 `drop` 里"拆包处理"。

学完本篇你会做出两样东西：一个能接收桌面文件并预览的上传区，和一个拖拽排序的列表。

## 2. 动手：最小可运行的拖拽上传区

新建 `drag-upload.html`，整份复制即可运行：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>拖拽上传区</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 40px auto; }
    #zone {
      padding: 48px 24px; text-align: center; color: #667;
      border: 2px dashed #b8c0c8; border-radius: 12px;
      transition: border-color .15s, background .15s;
    }
    /* 拖拽悬停在区域内时，JS 会挂 is-over 类 */
    #zone.is-over {
      border-color: #39C5BB; background: #39c5bb14; color: #0a7d76;
    }
    #preview { margin-top: 16px; max-width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="zone">把一张图片从桌面拖到这里</div>
  <img id="preview" hidden alt="上传预览" />

  <script>
    const zone = document.getElementById('zone');
    const preview = document.getElementById('preview');

    // dragover 是开关：不 preventDefault，drop 永远不触发
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    // dragenter / dragleave 只负责"视觉反馈"
    zone.addEventListener('dragenter', () => zone.classList.add('is-over'));
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));

    // drop 里才拿得到数据
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-over');

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) {
        zone.textContent = '只支持图片文件';
        return;
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
      zone.textContent = '已接收：' + file.name;
    });
  </script>
</body>
</html>
```

动手清单：

1. 从桌面拖一张图片进来，看到预览出现；
2. 拖一个 `.txt` 文件进来，看到"只支持图片文件"；
3. 把 `dragover` 里的 `e.preventDefault()` 注释掉再拖——`drop` 不触发了，这就是最多人踩的坑，先亲手踩一遍。

## 3. 讲为什么：一套七事件的握手协议

拖拽不是"一个事件"，而是源端和目标端之间的一次握手。两个角色各听各的事件：

| 事件 | 触发在谁身上 | 时机 | 你通常做什么 |
| --- | --- | --- | --- |
| `dragstart` | 被拖元素 | 按住并开始移动 | `setData` 打包数据 |
| `drag` | 被拖元素 | 拖动全程持续触发 | 少用，避免高频逻辑 |
| `dragend` | 被被拖元素 | 松手（无论是否成功） | 清理状态 |
| `dragenter` | 放置目标 | 拖着进入目标 | 高亮目标 |
| `dragover` | 放置目标 | 在目标上方持续触发 | `preventDefault()` 放行 |
| `dragleave` | 放置目标 | 拖着离开目标 | 取消高亮 |
| `drop` | 放置目标 | 在目标上松手 | `getData` 拆包处理 |

两个为什么值得停下来想清楚：

**为什么 `dragover` 必须 `preventDefault()`？** 浏览器默认行为是"任何元素都不接受投放"。只有你在 `dragover` 里显式取消默认行为，浏览器才把这个区域登记为合法落点，后续才会派发 `drop`。这也顺便给了你选择权：只对部分区域 `preventDefault()`，就能天然实现"这里能放、那里不能放"。

**为什么 `dragover` 里读不到数据？** 拖着的东西可能跨窗口、跨应用飞行，恶意页面可以诱导你"拖着文件悬停"来偷读内容。所以浏览器规定：`getData` 只在 `drop` 里生效；在 `dragover` 阶段你只能看 `e.dataTransfer.types`（知道有哪些类型，看不到内容）。这是安全模型，不是 bug。

## 4. 页面内拖拽：把卡片拖进回收站

文件拖入只是"目标端"的故事。源端是页面元素时，先标 `draggable`（注意 `img` 和带 `href` 的 `a` 默认就可拖，无需设置），然后三步走：

```html
<ul id="list">
  <li draggable="true">练习曲 No.1</li>
  <li draggable="true">练习曲 No.2</li>
  <li draggable="true">练习曲 No.3</li>
</ul>
<div id="trash">拖到这里删除</div>
```

```javascript
const trash = document.getElementById('trash');
let dragged = null;

document.getElementById('list').addEventListener('dragstart', (e) => {
  dragged = e.target;                       // 事件委托：监听在 ul 上
  e.dataTransfer.setData('text/plain', e.target.textContent);
  e.dataTransfer.effectAllowed = 'move';
});

trash.addEventListener('dragover', (e) => e.preventDefault());
trash.addEventListener('drop', (e) => {
  e.preventDefault();
  dragged.remove();
  trash.textContent = '已删除：' + e.dataTransfer.getData('text/plain');
});
```

`effectAllowed`（源端声明）与 `dropEffect`（目标端表态）配合决定光标形态：`copy` 显示加号、`move` 显示移动箭头。目标是"复制进收藏夹"就设 `copy`，是"移走"就设 `move`——光标会替你把意图告诉用户。

## 5. 进阶：拖拽排序列表

排序 = 拖拽 + "插到哪一项之前"的判断。核心技巧是给每个列表项监听 `dragover`，用鼠标纵坐标和列表项中线比较，决定插到前面还是后面：

```javascript
const list = document.getElementById('list');
let dragged = null;

list.addEventListener('dragstart', (e) => {
  dragged = e.target.closest('li');
});

list.addEventListener('dragover', (e) => {
  e.preventDefault();
  const target = e.target.closest('li');
  if (!target || target === dragged) return;
  const rect = target.getBoundingClientRect();
  const after = (e.clientY - rect.top) > rect.height / 2;
  // insertBefore 把节点挪动（DOM 里同一节点移动等于"搬家"）
  list.insertBefore(dragged, after ? target.nextElementSibling : target);
});
```

配套样式可以让被经过的项出现一条插入指示线：

```css
li { padding: 10px 14px; border-bottom: 1px solid #eee; position: relative; }
li::after {
  content: ""; position: absolute; left: 0; right: 0; height: 2px;
  background: #39C5BB; opacity: 0;
}
/* 拖拽经过时给视觉提示：拖到上半部提示插前面，下半部插后面 */
li.hint-top::before, li.hint-bottom::after { opacity: 1; }
```

自测：拖起第 1 项放到第 3 项下半部，顺序应变成 2、3、1。做不出来多半是 `closest('li')` 没写——`e.target` 可能是 li 里面的文本节点对应的元素之外的东西。

## 6. 坑点自检

排查"拖拽没反应"，按这个清单过一遍：

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| drop 永远不触发 | `dragover` 没有 `preventDefault()` | 目标端放行，这是头号坑 |
| 元素根本拖不起来 | 没写 `draggable="true"`（div 默认不可拖） | 源端显式标记 |
| `getData` 拿到空串 | 在 `drop` 以外的事件里读数据 | 数据只在 `drop` 可读；`dragover` 只能看 `types` |
| format 对不上 | `setData('text', ...)` 与 `getData('text/plain')` 不一致 | 两端用同一个类型字符串；推荐统一 `text/plain` |
| 高亮闪烁 | `dragleave` 在拖影经过子元素时也会触发 | 用 `dragenter/dragleave` 计数器，或用 `:has()` 配合状态类 |
| 拖影半透明难看 | 默认拖影是元素截图 | `setDragImage(element, x, y)` 换成预制缩略图 |
| 松手后状态残留 | 没监听 `dragend` | 无论成败都触发，统一在这里复位 |

关于高亮闪烁，一个现代写法是放弃 `dragleave`，在 `dragover` 里持续"点亮"，靠 CSS 过渡掩盖抖动：

```css
#zone.is-over { border-color: #39C5BB; }
#zone { transition: border-color .1s; }
```

```javascript
zone.addEventListener('dragover', (e) => {
  e.preventDefault();
  zone.classList.add('is-over');
  clearTimeout(zone._t);                 // 每次经过都续期
});
zone.addEventListener('drop', hideHint);
zone.addEventListener('dragleave', () => {
  zone._t = setTimeout(() => zone.classList.remove('is-over'), 80);
});
```

## 7. 移动端：原生 API 不工作怎么办

HTML5 Drag and Drop 是桌面鼠标交互的产物：触摸屏上拖动默认是"滚动页面"，`dragstart` 根本不会触发。三条路按优先级排：

1. **生产项目直接用成熟库**（SortableJS、dnd-kit 等）：它们在底层同时监听 Pointer/Touch 事件，桌面移动端一套 API，边界检测、排序动画、无障碍都已处理好；
2. **自己用 Pointer Events 实现**：`pointerdown` 记录偏移，`pointermove` 跟随，`setPointerCapture` 保证手指滑出元素也持续收到事件，配合 `touch-action: none` 阻止页面滚动；
3. **换交互形态**：长按弹出菜单选"移到..."，或每项加"上移/下移"按钮——对无障碍反而更友好。

最小 Pointer Events 骨架（要点版）：

```javascript
item.addEventListener('pointerdown', (e) => {
  item.setPointerCapture(e.pointerId);
  const rect = item.getBoundingClientRect();
  const dx = e.clientX - rect.left;
  const dy = e.clientY - rect.top;

  const move = (ev) => {
    item.style.transform =
      `translate(${ev.clientX - dx - rect.left}px, ${ev.clientY - dy - rect.top}px)`;
  };
  const up = () => {
    item.releasePointerCapture(e.pointerId);
    item.removeEventListener('pointermove', move);
    // 落点判定与数据写回在这里做
  };
  item.addEventListener('pointermove', move);
  item.addEventListener('pointerup', up, { once: true });
});
```

```css
.item { touch-action: none; } /* 关键：声明"这个元素上的手势归我管" */
```

## 8. 无障碍与安全底线

两件事在真实项目里不能省：

- **给键盘用户留活路**：读屏用户拖不动东西。排序列表请配"上移/下移"按钮或等价命令；上传区配一个普通 `<input type="file">`。原则：拖拽必须是快捷方式，不能是唯一入口。
- **不信任拖进来的内容**：`getData('text/html')` 里的 HTML 可能携带脚本。要么只用 `text/plain`，要么插入前消毒，永远不要 `innerHTML` 直塞。

## 9. 练习

1. （必做）把第 2 节的上传区扩展为支持多图：拖入多张时逐个生成缩略图网格，右键点击缩略图移除；
2. （必做）实现"回收站"：页面内卡片拖入即删，拖错有 3 秒撤销提示（提示条可用 `<dialog>` 做确认）；
3. （选做）给第 5 节排序列表加键盘支持：按住空格进入"拿起"状态，方向键移动，再按空格放下；
4. （选做）拖拽文本进页面时，只接受纯文本并在下方渲染为 `<blockquote>`；包含 HTML 标签时提示"已按纯文本处理"。

## 10. 下一步

- 文件读进来了怎么用？File/Blob 与 `URL.createObjectURL` 的专篇在 [File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL)，响应式图像见 `html5/140-ImagesAndResponsiveImages`；
- 想给拖入确认做原生弹层？看 `html5/430-HTML5DialogPopoverGuide`；
- 拖拽只是"手势交互"的一种，Pointer Events 的完整能力（多点触控、压感、笔倾斜）是通往移动端的正门，建议系统补一遍。
