---
order: 250
title: 拖拽 API
module: 'html5'
category: 前端技术
difficulty: intermediate
description: drag/drop
author: fanquanpp
updated: '2026-09-13'
related:
  - 'html5/160-ProgressMeter'
  - 'html5/310-WebComponentsPWADevelopment'
  - 'html5/260-Geolocation'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)

> 前置要求：本节全部示例依赖 JavaScript 事件监听（dragstart/dragover/drop 等），请先完成 `javascript/001`-`005` 与 `javascript/039`（DOM 与事件）。
>
> 测试提示：拖拽在本地 `file://` 打开大多可用，但部分浏览器行为受限，建议用 VS Code 的 Live Server 或 `npx serve` 起本地服务器（`http://localhost`）测试；移动端触摸不触发本 API，替代方案见第 5 章。

## 1. 拖拽 API 概述

HTML5 原生拖拽 API 允许用户通过拖拽操作在页面内或页面间移动元素和数据。

### 1.1 事件

| 事件        | 触发时机           | 用途                    |
| ----------- | ------------------ | ----------------------- |
| `dragstart` | 开始拖拽           | 设置拖拽数据            |
| `drag`      | 拖拽过程中持续触发 | 更新状态                |
| `dragend`   | 拖拽结束           | 清理状态                |
| `dragenter` | 拖拽进入目标       | 高亮放置区域            |
| `dragover`  | 拖拽在目标上方     | **必须 preventDefault** |
| `dragleave` | 拖拽离开目标       | 取消高亮                |
| `drop`      | 在目标上释放       | 处理放置逻辑            |

## 2. 基本实现

```html
<div id="draggable" draggable="true">拖拽我</div>
<div id="dropzone">放置区域</div>
```

```javascript
const draggable = document.getElementById('draggable');
const dropzone = document.getElementById('dropzone');

draggable.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', e.target.id);
  e.dataTransfer.effectAllowed = 'move';
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault(); // 必须！否则无法触发 drop
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  dropzone.appendChild(document.getElementById(id));
});
```

## 3. DataTransfer 对象

```javascript
e.dataTransfer.setData('text/plain', '文本数据');
e.dataTransfer.setData('application/json', JSON.stringify({ id: 1 }));
e.dataTransfer.effectAllowed = 'move';
e.dataTransfer.dropEffect = 'copy';

// 自定义拖拽图像
const img = new Image();
img.src = 'drag-icon.png';
e.dataTransfer.setDragImage(img, 0, 0);
```

## 4. 文件拖拽

```javascript
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
for (const file of files) {
    console.log(`文件名: ${file.name}, 大小: ${file.size} bytes`);
  }
});
```

## 5. 移动端兼容：Touch Events 替代方案

HTML5 拖拽 API 是**桌面端专属**：触摸屏上不会触发 `dragstart/drop`。移动端做"拖拽排序、滑动放置"要用触摸事件（Touch Events）自己实现，或直接用成熟的库（如 SortableJS）。下面是最小实现骨架：

```javascript
const item = document.getElementById('drag-item');
let offsetX = 0, offsetY = 0;

item.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  const rect = item.getBoundingClientRect();
  offsetX = touch.clientX - rect.left;
  offsetY = touch.clientY - rect.top;
});

item.addEventListener('touchmove', (e) => {
  e.preventDefault(); // 阻止页面滚动
  const touch = e.touches[0];
  item.style.left = touch.clientX - offsetX + 'px';
  item.style.top = touch.clientY - offsetY + 'px';
});

item.addEventListener('touchend', () => {
  // 放置逻辑：判断落点、写回数据、恢复定位
});
```

**讲解：**

1. `touchstart` 记录手指按下位置与元素偏移，为后续移动计算基准。
2. `touchmove` 里必须 `preventDefault()`，否则页面会跟着手指滚动。
3. `e.touches[0]` 是第一个触点；多指场景还要处理 `e.changedTouches`。
4. 生产项目优先用 SortableJS 等库：边界、排序、动画、无障碍都已处理好，不用重复造轮子。
5. 别忘了样式：`touch-action: none` 或 `position: absolute` 才能让元素自由跟随手指。

## draggable 属性

**启用元素拖拽**
`<element draggable="true | false">`

```html
<!-- 将元素标记为可拖拽 -->
<div id="draggable" draggable="true">拖拽我</div>
<div id="dropzone">放置区域</div>

<!-- 图片和带 href 的链接默认可拖拽,无需设置 -->
<img src="logo.png" alt="Logo" />
<a href="/page">链接</a>
```

---

## 拖拽事件

**事件触发顺序表**

| 事件        | 触发对象   | 触发时机             | 用途                    |
| ----------- | ---------- | -------------------- | ----------------------- |
| `dragstart` | 拖拽元素   | 开始拖拽             | 设置拖拽数据            |
| `drag`      | 拖拽元素   | 拖拽过程中持续触发   | 更新状态                |
| `dragend`   | 拖拽元素   | 拖拽结束             | 清理状态                |
| `dragenter` | 放置目标   | 拖拽进入目标         | 高亮放置区域            |
| `dragover`  | 放置目标   | 拖拽在目标上方移动   | **必须 preventDefault** |
| `dragleave` | 放置目标   | 拖拽离开目标         | 取消高亮                |
| `drop`      | 放置目标   | 在目标上释放         | 处理放置逻辑            |

---

## 基本拖拽实现

**HTML 结构**
`<div draggable="true">源</div> <div>目标</div>`

```html
<!-- 拖拽源与放置目标 -->
<div id="draggable" draggable="true">拖拽我</div>
<div id="dropzone">放置区域</div>
```

**JavaScript 事件绑定**
`element.addEventListener('dragstart' | 'dragover' | 'drop', handler)`

```javascript
const draggable = document.getElementById('draggable');
const dropzone = document.getElementById('dropzone');

// 拖拽开始:设置数据与效果
draggable.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', e.target.id); // 设置拖拽数据
  e.dataTransfer.effectAllowed = 'move';             // 允许的效果:copy | move | link
});

// 拖拽悬停:必须阻止默认行为,否则无法触发 drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move'; // 设置放置效果
});

// 拖拽进入:高亮目标
dropzone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

// 拖拽离开:取消高亮
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

// 放置:处理数据
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain'); // 获取拖拽数据
  const draggedEl = document.getElementById(id);
  dropzone.appendChild(draggedEl);
});
```

---

## DataTransfer 对象

**DataTransfer 方法表**

| 方法                              | 说明                          |
| --------------------------------- | ----------------------------- |
| `setData(format, data)`           | 设置指定格式的数据            |
| `getData(format)`                 | 读取指定格式的数据            |
| `clearData([format])`             | 清除数据                      |
| `setDragImage(img, x, y)`         | 设置自定义拖拽图像            |
| `types`                           | 只读属性,数据格式数组        |
| `files`                           | 只读属性,FileList 对象       |
| `items`                           | 只读属性,DataTransferItemList |

**常用数据格式**
`e.dataTransfer.setData('text/plain' | 'text/uri-list' | 'text/html', data)`

```javascript
// 设置多种格式的数据
e.dataTransfer.setData('text/plain', '纯文本数据');
e.dataTransfer.setData('text/uri-list', 'https://example.com');
e.dataTransfer.setData('text/html', '<strong>HTML 数据</strong>');
e.dataTransfer.setData('application/json', JSON.stringify({ id: 1, name: '张三' }));

// 读取数据(在 drop 事件中)
const text = e.dataTransfer.getData('text/plain');
const json = JSON.parse(e.dataTransfer.getData('application/json'));
```

**拖拽效果设置**
`e.dataTransfer.effectAllowed = 'copy | move | link | copyMove | all | none'`

```javascript
// 设置允许的效果
e.dataTransfer.effectAllowed = 'copy';   // 仅复制
e.dataTransfer.effectAllowed = 'move';   // 仅移动
e.dataTransfer.effectAllowed = 'link';   // 仅链接
e.dataTransfer.effectAllowed = 'copyMove'; // 复制或移动

// 设置放置效果(在 dragover 事件中)
e.dataTransfer.dropEffect = 'copy'; // copy | move | link | none
```

**自定义拖拽图像**
`e.dataTransfer.setDragImage(<element>, <offsetX>, <offsetY>)`

```javascript
// 使用自定义图像作为拖拽预览
draggable.addEventListener('dragstart', (e) => {
  const img = new Image();
  img.src = 'drag-icon.png';
  e.dataTransfer.setDragImage(img, 10, 10); // 偏移量(像素)
});
```

---

## 文件拖拽

**获取拖入的文件**
`e.dataTransfer.files` 或 `e.dataTransfer.items`

```javascript
// 处理拖拽上传的文件
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files; // FileList 对象
  for (const file of files) {
    console.log(`文件名: ${file.name}`);
    console.log(`大小: ${file.size} bytes`);
    console.log(`类型: ${file.type}`);
    console.log(`最后修改: ${new Date(file.lastModified).toLocaleString()}`);
  }
});
```

**异步读取文件内容**
`file.text() | file.arrayBuffer() | reader.readAsDataURL(file)`

```javascript
// 读取文本文件
const text = await file.text();

// 读取为 ArrayBuffer
const buffer = await file.arrayBuffer();

// 使用 FileReader 读取为 Data URL(图片预览)
const reader = new FileReader();
reader.onload = (e) => {
  const img = document.createElement('img');
  img.src = e.target.result;
  document.body.appendChild(img);
};
reader.readAsDataURL(file);
```

---

## 拖拽方向控制

**仅允许垂直/水平拖拽**
`if (Math.abs(dx) > Math.abs(dy)) { ... }`

```javascript
// 限制为水平拖拽
let isDragging = false;
let startX, startY;

element.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  // 仅水平方向有效
  if (Math.abs(dx) > Math.abs(dy)) {
    element.style.left = `${dx}px`;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});
```

---

## 注意事项

- **dragover 必须 preventDefault**:否则 `drop` 事件不会触发
- **数据类型一致性**:`setData` 和 `getData` 的 format 参数必须完全一致
- **安全性**:拖拽内容来源不可信时,需进行数据校验,防止 XSS
- **触摸设备**:原生 HTML5 拖拽 API 在移动端支持有限,需使用 polyfill 或自定义实现
- **可访问性**:拖拽操作对屏幕阅读器不友好,需提供等价的非拖拽操作方式(如按钮)
- **DataTransfer 生命周期**:`getData` 仅在 `drop` 事件中可读取,`dragstart` 中设置的数据在 `dragover` 中无法读取

## 动手试试

### 入门版（必做）

先复制下面这个最小示例到本地 `drag.html`，双击打开即可试验：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>拖拽最小示例</title>
    <style>
      #box { width: 120px; height: 60px; background: #1677ff; color: #fff;
             display: flex; align-items: center; justify-content: center; }
      #zone { width: 300px; height: 160px; margin-top: 20px;
              border: 2px dashed #999; display: flex;
              align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div id="box" draggable="true">拖拽我</div>
    <div id="zone">放置区域</div>
    <script>
      const box = document.getElementById('box');
      const zone = document.getElementById('zone');
      box.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', 'box');
      });
      zone.addEventListener('dragover', (e) => e.preventDefault());
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.textContent = '收到：' + e.dataTransfer.getData('text/plain');
      });
    </script>
  </body>
</html>
```

1. 实现“把卡片拖到垃圾桶删除”：一个可拖元素 + 一个放置区，drop 后移除元素；
2. 在 `dragstart` 中写入 `text/plain` 数据，在 `drop` 中读取并显示；
3. 实现文件拖拽：把图片拖到区域后，用 FileReader 在页面预览。

### 进阶版（选做）

1. 做一个可拖拽排序的列表：拖起一项，移动到其它项时交换位置；
2. 用 `setDragImage` 自定义拖拽缩略图；
3. 给放置区加高亮与禁用状态，拖拽进入时变色、离开时恢复。

## 核心知识点

> 一句话记住拖拽：源端 `dragstart` 写数据，目标端 `dragover` 放行、`drop` 收数据；文件拖拽看 `dataTransfer.files`。

- 被拖元素：`draggable="true"` + `dragstart`（写入数据）；
- 放置区域：`dragover` 必须 `preventDefault()`，`drop` 处理放置；
- `dataTransfer` 是数据与效果的载体：`setData`/`getData`/`effectAllowed`/`dropEffect`；
- 文件拖拽：`e.dataTransfer.files` + FileReader/FormData 实现拖拽上传；
- 生命周期：`dragstart` → `drag` → `dragend`，配合 `dragenter`/`dragleave` 做视觉反馈。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 `preventDefault()` | `drop` 永远不触发 | `dragover` 中必须放行 |
| 未设置 `draggable` | 元素不可拖 | 目标元素加 `draggable="true"` |
| 数据只在 `dragstart` 写 | 其它事件中读取为空 | 统一在 `dragstart` 中 `setData` |
| 忽略 `dropEffect` | 移动/复制行为不明确 | 按场景设置 move/copy |
| 未处理 `dragend` 清理 | 状态残留 | 结束后复位视觉状态 |
| 触屏设备不生效 | 原生 DnD 不支持触摸 | 触屏用 Pointer Events 或第三方库 |

## 扩展学习

- 文件读取：`html5/240-HTML5OfflineStorageWebAPI` 中 File API；
- 触屏拖拽：`html5/260-Geolocation` 之外的 Pointer Events 教程；
- 排序组件：Vue/React 生态中的 drag-and-drop 库（vuedraggable、dnd-kit）；
- 无障碍：拖拽交互需要为键盘用户提供替代操作（如上下移动按钮）。
