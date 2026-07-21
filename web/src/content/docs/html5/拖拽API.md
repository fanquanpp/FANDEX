---
order: 60
title: 拖拽API
module: html5
category: HTML5
difficulty: intermediate
description: drag/drop
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/progress与meter
  - html5/WebComponents与PWA开发
  - html5/地理位置定位
  - html5/Web工作线程
prerequisites:
  - html5/概述与核心特性
---

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
