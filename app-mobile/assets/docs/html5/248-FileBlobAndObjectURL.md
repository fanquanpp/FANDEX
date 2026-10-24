---
order: 270
title: File/Blob 与对象 URL
module: 'html5'
category: 前端技术
difficulty: beginner
description: File/Blob/FileList 数据结构、FileReader 与 file.text()、URL.createObjectURL 的 revoke 时机、a[download] 触发下载。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/246-FetchApiAndErrorHandling'
  - 'html5/250-DragAPI'
  - 'html5/230-HTML5MultimediaCanvasDrawing'
prerequisites: []
---

## 知识点地图

- **知识类别**：存储与文件（浏览器内的文件数据模型）。
- **解决什么问题**：用户拖一张图进来、Canvas 画完一幅作品、后台导出一份报表——这些「文件」在浏览器里以 File 与 Blob 的形态存在。本篇回答：怎么读它们（FileReader 与 file.text() 两条路）、怎么给它们一个临时 URL 塞进 `<img>` 或触发下载（createObjectURL 与 revoke 时机）、怎么不经过服务器生成文件（Blob 构造 + a[download]）。
- **什么时候用到**：文件选择与拖拽上传的预览；Canvas 导出；前端导出 CSV/JSON 报表；把接口返回的 blob 保存为文件。

本篇承接原 [Web Storage 与 Fetch API](/html5/245-WebStorage) 的 File API 速查节并扩为专篇；拖拽进入（dataTransfer.files）的交互细节见 [DragAPI](/html5/250-DragAPI)，Canvas 绘制本身见 [Canvas 2D 绘图](/html5/235-Canvas2DDrawing)。

## 1. 数据模型：File 是特殊的 Blob

```text
Blob（二进制大对象，不可变的原始数据）
 └── File（Blob 的子类，多了 name、lastModified 等元信息）
      └── FileList（input.files 或 dataTransfer.files 返回的集合）
```

三个入口拿到 File 对象：

```html
<input type="file" id="picker" accept="image/*" multiple />
<script>
  // 入口一：文件选择框
  const input = document.getElementById('picker');
  input.addEventListener('change', () => {
    console.log(input.files);        // FileList（类数组）
    const first = input.files[0];    // File 对象
    console.log(first.name, first.size, first.type, first.lastModified);
  });

  // 入口二：拖拽（详见 250-DragAPI）
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files; // 同样的 FileList
  });

  // 入口三：接口返回（fetch 的 blob() 直接产出 Blob 而不是 File）
  fetch('/api/report')
    .then((res) => res.blob())
    .then((blob) => console.log(blob.size, blob.type));
</script>
```

**讲解：**

- `size` 是字节、`type` 是 MIME（可能为空串，不能只信它，服务端必须二次校验）；
- `input.files` 永远是 FileList 即使只选了一个——取 `[0]` 是固定动作；`multiple` 属性允许多选；
- File/Blob 的**数据本身不可变**：想改内容（压缩、加水印）是「读出来 -> 加工 -> 生成新 Blob」，不是原地修改。

### 1.1 读取的三条路：FileReader、file.text()、ArrayBuffer

```javascript
// 路一：FileReader（事件式，老牌 API，功能最全）
const reader = new FileReader();
reader.onload = (e) => console.log(e.target.result); // 读取结果在 e.target.result
reader.onerror = () => console.error('读取失败');
reader.readAsDataURL(file); // 其他方法：readAsText / readAsArrayBuffer / abort()

// 路二：Promise 化的便捷方法（现代浏览器，读文本与 Buffer 的首选）
const text = await file.text();          // 等价 readAsText，一行搞定
const buffer = await file.arrayBuffer(); // 等价 readAsArrayBuffer

// 路三：只想要一个预览 URL 时，根本不用读内容
const url = URL.createObjectURL(file);   // 指向文件内存块的临时 URL
img.src = url;
```

选型口诀：**预览/下载用 createObjectURL（最快，零拷贝）；读文本用 file.text()；需要 Base64（如内嵌 CSS 背景、旧接口）才用 readAsDataURL**。Data URL 会把体积膨胀约 33%，大图用它预览是常见的性能坑。

| FileReader 方法 | 说明 |
| --- | --- |
| `readAsText(file, [encoding])` | 读取为文本 |
| `readAsDataURL(file)` | 读取为 Data URL（Base64） |
| `readAsArrayBuffer(file)` | 读取为二进制缓冲 |
| `abort()` | 中断读取 |

## 2. 对象 URL：createObjectURL 与 revoke 的时机

`URL.createObjectURL(blobOrFile)` 返回形如 `blob:https://site.example/uuid` 的 URL。三个必须记住的语义：

```javascript
const url = URL.createObjectURL(file);
img.src = url;

// 1. URL 与页面同生命周期：不手动 revoke 就一直占着内存
// 2. 页面卸载时才自动释放；SPA 里组件卸载不会释放——必须手动
// 3. revoke 之后 url 立即失效，再加载会报错

img.onload = () => URL.revokeObjectURL(url); // 加载完成后立刻归还内存——标准时机
```

- **revoke 时机**是本主题最容易出错的地方：太早（图片还没加载）会裂图；不 revoke 则长驻页面（切换几十张预览图后内存暴涨）。固定模式是「onload 后 revoke」或「替换引用前 revoke 旧的」；
- 对象 URL 只在**创建它的文档**里有效，不能跨页面/跨 Worker 传递（跨上下文传二进制用 transferable ArrayBuffer 或直接传 File 引用）；
- 同一个 Blob 可以 createObjectURL 多次，得到不同 URL，各自独立 revoke。

## 3. 三个真实工程例子

### 3.1 Canvas 作品导出 PNG

Canvas 画完的东西只存在于画布像素里，导出 = Canvas 转 Blob 再触发下载：

```javascript
// canvas 来自 235-Canvas2DDrawing 的绘制结果
canvas.toBlob((blob) => {
  if (!blob) return alert('导出失败');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'island-poster.png';   // download 属性让浏览器下载而非导航
  a.click();
  URL.revokeObjectURL(url);           // 下载已被浏览器接管，可立即归还
}, 'image/png');
```

**逐段讲解：**

- `toBlob(callback, type)` 异步产出 Blob，比 `toDataURL()`（同步产出 Base64 字符串）省内存——大画布的 Data URL 能到几十 MB；
- `a.download` 属性是关键：没有它，点击 `<a href="blob:...">` 是「导航到 blob」，浏览器多半会打开预览而不是下载；
- 想导出 JPG 就传 `'image/jpeg'`（第二参还可给压缩质量 0-1）；背景透明的图注意 JPG 不支持透明，导出前先铺白底。

### 3.2 拖入图片即时预览（衔接 DragAPI）

网页可以不经过 `<input type="file">` 直接接收用户拖入的文件：

```html
<div id="dropzone" style="border:2px dashed #999; padding:40px">把图片拖到这里</div>
<script>
  const zone = document.getElementById('dropzone');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault(); // 不拦下默认行为，drop 不会触发
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      zone.textContent = '请拖入图片文件';
      return;
    }
    const url = URL.createObjectURL(file);
    zone.innerHTML = '';
    const img = new Image();
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url); // 渲染完成后释放
    zone.appendChild(img);
    // 拿到 File 后直接可上传：FormData.append('avatar', file)，见 246 的表单上传
  });
</script>
```

**逐段讲解：**

- `dragover` 与 `drop` 必须**都** preventDefault：前者声明「我接受放置」，后者阻止浏览器默认「打开这个文件」；
- 类型检查用 `file.type.startsWith('image/')` 而不是扩展名——扩展名可以随便改；
- 这个模式与课堂/作业里常见的「图片轮播上传预览页」完全同构：把预览图 push 进轮播数组即可扩展为多图轮播（e-core-java-mysql-web 素材库第 3.1 节的轮播练习即可用本例承接：拖入若干张 -> 生成预览 URL 列表 -> 定时切换 src）。

### 3.3 前端导出 CSV 报表

表格数据不发请求、直接在浏览器里生成文件下载：

```javascript
function exportCSV(rows, filename) {
  // rows: [{name, score}, ...]
  const header = 'name,score';
  const body = rows.map((r) => `${r.name},${r.score}`).join('\n');
  // \uFEFF BOM 头：让 Excel 识别 UTF-8，否则中文乱码
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportCSV(
  [{ name: '林岛民', score: 96 }, { name: '赵读者', score: 88 }],
  '阅读成绩.csv',
);
```

**逐段讲解：**

- `new Blob(parts, { type })` 从字符串/ArrayBuffer/其他 Blob 拼出新文件，这是「浏览器当文件工厂」的基石；
- CSV 字段若可能含逗号/引号/换行，需按 RFC 4180 用引号包裹并转义内部引号——上面是精简教学版，生产实现要补；
- `\uFEFF`（BOM）是兼容 Windows Excel 的民间必备知识，缺了它中文必乱码，且只在部分机器上复现——最阴险的一类线上小事故。

## 4. 动手实践

### 任务

1. 做一个「选择图片 -> 显示缩略图 -> 显示文件名与大小」的预览组件，多选可用，切换重新选择时旧的预览与 URL 都要清理；
2. 把任务 1 扩展为「拖拽也支持」（复用 3.2 的模式）；
3. 写一个 JSON 导出按钮：把 localStorage 里存的任意键值对导出为 `backup.json`；
4. 思考题：任务 1 如果改用 FileReader.readAsDataURL 实现预览，有什么可感知的差别？

### 提示

- 多选遍历 FileList 用 `for (const file of input.files)`；
- 每张图都要有自己的 URL 变量以便 revoke；重新选择时先把旧列表 revoke 干净；
- JSON 导出就是 3.3 的变体：`JSON.stringify(data, null, 2)` 加 `type: 'application/json'`。

<details>
<summary>参考实现（先自己写，写完再展开对照）</summary>

```html
<input type="file" id="picker" accept="image/*" multiple />
<div id="gallery"></div>
<script>
  const picker = document.getElementById('picker');
  const gallery = document.getElementById('gallery');
  let urls = []; // 追踪本批对象 URL

  function clearGallery() {
    urls.forEach((u) => URL.revokeObjectURL(u)); // 先还内存
    urls = [];
    gallery.innerHTML = '';
  }

  function renderFiles(files) {
    clearGallery();
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      urls.push(url);

      const card = document.createElement('figure');
      const img = new Image();
      img.src = url;
      img.alt = file.name;
      img.style.maxWidth = '160px';
      const caption = document.createElement('figcaption');
      caption.textContent = `${file.name}（${(file.size / 1024).toFixed(1)} KB）`;
      card.append(img, caption);
      gallery.appendChild(card);
    }
  }

  picker.addEventListener('change', () => renderFiles(picker.files));
  // 任务 2：拖拽支持
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    renderFiles(e.dataTransfer.files);
  });
</script>
```

```javascript
// 任务 3：localStorage 备份导出
const dump = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  dump[key] = localStorage.getItem(key);
}
const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = Object.assign(document.createElement('a'), { href: url, download: 'backup.json' });
a.click();
URL.revokeObjectURL(url);
```

**任务 4 答案：** Data URL 是 Base64 文本内嵌（体积 +33%，大图明显变慢），但它是自包含的字符串，可以持久化、可以复制到别的页面/邮件里仍然有效；对象 URL 是零拷贝的引用，快且省内存，但页面一关/一 revoke 就失效，无法持久化。「要快用 objectURL，要持久用 Data URL」。

</details>

## 5. 常见陷阱速查

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 不 revoke 对象 URL | SPA 里内存持续增长 | onload 后或替换前 revoke |
| revoke 过早 | 图片裂图、下载失败 | 在 load 事件或下载接管后 revoke |
| 用 readAsDataURL 做大图预览 | 体积膨胀 33%、同步编码卡顿 | 改用 createObjectURL |
| 只信 file.type / 扩展名 | 两者都可伪造 | 前端提示用，服务端必校验 |
| a 缺 download 属性 | 点击变成导航预览 | 恒定带上 download |
| 导出 CSV 无 BOM | Excel 打开中文乱码 | 内容前置 `\uFEFF` |
| toDataURL 导出大画布 | 阻塞主线程且占内存 | 改用 toBlob 异步导出 |

## 6. 扩展学习

- 拖拽交互全景：[DragAPI](/html5/250-DragAPI)；
- 上传进度与表单提交：[Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)；
- Canvas 绘制主体：[Canvas 2D 绘图](/html5/235-Canvas2DDrawing)；
- 更大的文件与结构化查询：`javascript/460-StorageForTheWeb` 与 IndexedDB 系列。

## 参考与致谢

- MDN Web Docs：File、Blob、URL.createObjectURL、Canvas.toBlob 文档（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/API/Blob
- WHATWG File API Standard，https://www.w3.org/TR/FileAPI/
