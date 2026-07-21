# 拖拽API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

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
