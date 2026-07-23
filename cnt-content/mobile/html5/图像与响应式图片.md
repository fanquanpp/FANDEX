# 图像与响应式图片 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## img 元素

**图像标签**
`<img src="<URL>" alt="<替代文本>" [width="<宽>"] [height="<高>"] [loading="lazy|eager"] [decoding="async|sync|auto"] [srcset] [sizes] />`
```html
<!-- 基础图像 -->
<img src="photo.jpg" alt="美丽的风景" width="800" height="600" />

<!-- 延迟加载 -->
<img src="photo.jpg" alt="照片" loading="lazy" />

<!-- 异步解码 -->
<img src="large.jpg" alt="大图" decoding="async" />

<!-- 错误回退 -->
<img src="photo.jpg" alt="照片" onerror="this.src='fallback.jpg'" />
```

| 属性         | 作用                          |
| ------------ | ----------------------------- |
| `src`        | 图像 URL                      |
| `alt`        | 替代文本(必填,无障碍)         |
| `width`      | 宽度(像素)                   |
| `height`     | 高度(像素)                   |
| `loading`    | lazy 懒加载 / eager 立即加载  |
| `decoding`   | 解码方式 async/sync/auto      |
| `srcset`     | 多源图像列表                  |
| `sizes`      | 不同视口下的显示尺寸          |
| `referrerpolicy` | Referer 策略              |
| `usemap`     | 关联 image map                |

---

## 响应式图片 srcset

**宽度描述符**
`<img srcset="<URL> <宽度>w, <URL> <宽度>w, ..." />`
```html
<!-- 浏览器根据视口自动选择合适尺寸 -->
<img
  src="small.jpg"
  srcset="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"
  alt="响应式图片"
/>
```

**像素密度描述符**
`<img srcset="<URL> 1x, <URL> 2x, <URL> 3x" />`
```html
<!-- Retina 屏适配 -->
<img
  src="photo.jpg"
  srcset="photo.jpg 1x, photo@2x.jpg 2x, photo@3x.jpg 3x"
  alt="高分辨率图片"
/>
```

---

## sizes 属性

**显示尺寸声明**
`<img srcset="..." sizes="<媒体查询> <尺寸>, ... <默认尺寸>" />`
```html
<img
  src="photo.jpg"
  srcset="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="响应式图片"
/>
```

**选择宽度计算**
`选择宽度 = sizes 计算值 × 设备像素比`

```javascript
// JavaScript 读取当前显示的图片
const img = document.querySelector('img');
console.log(img.currentSrc); // 当前加载的 URL
```

---

## picture 元素

**多格式回退**
`<picture><source srcset="<URL>" type="<MIME>" />...<img src="<URL>" alt="<替代>" /></picture>`
```html
<!-- 按格式优先级回退 -->
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="照片" width="800" height="600" />
</picture>
```

**按媒体查询切换**
`<source media="<媒体查询>" srcset="<URL>" />`
```html
<!-- 不同视口加载不同图片 -->
<picture>
  <source media="(min-width: 1200px)" srcset="wide.jpg" />
  <source media="(min-width: 768px)" srcset="medium.jpg" />
  <img src="small.jpg" alt="响应式图片" />
</picture>

<!-- 同时指定宽度和格式 -->
<picture>
  <source
    media="(min-width: 1200px)"
    srcset="large.avif 1200w"
    type="image/avif"
  />
  <source
    media="(min-width: 768px)"
    srcset="medium.webp 768w"
    type="image/webp"
  />
  <img src="small.jpg" alt="照片" />
</picture>
```

---

## 图片格式对照

| 格式 | 压缩类型  | 透明度 | 动画 | 压缩率 | 浏览器支持 |
| ---- | --------- | ------ | ---- | ------ | ---------- |
| JPEG | 有损      | 不支持 | 不支持 | 中等 | 全部       |
| PNG  | 无损      | 支持   | 不支持 | 较低 | 全部       |
| WebP | 有损/无损 | 支持   | 支持 | 高   | 97%+       |
| AVIF | 有损/无损 | 支持   | 支持 | 最高 | 92%+       |
| SVG  | 矢量      | 支持   | 支持 | —    | 全部       |
| GIF  | 无损      | 支持   | 支持 | 低   | 全部       |
| APNG | 无损      | 支持   | 支持 | 中等 | 95%+       |

---

## 图片预加载

**link preload**
`<link rel="preload" as="image" href="<URL>" [type="<MIME>"] [imagesrcset] [imagesizes] />`
```html
<!-- 预加载关键图片 -->
<link rel="preload" as="image" href="hero.webp" type="image/webp" />

<!-- 预加载响应式图片 -->
<link
  rel="preload"
  as="image"
  href="small.webp"
  imagesrcset="small.webp 400w, medium.webp 800w, large.webp 1200w"
  imagesizes="100vw"
/>
```

---

## image map 图像映射

**usemap 关联映射**
`<img src="<URL>" usemap="#<map名称>" alt="<替代>" />` + `<map name="<名称>">...<area>...</map>`
```html
<img src="map.png" alt="地图" usemap="#workmap" width="400" height="300" />

<map name="workmap">
  <area shape="rect" coords="34,44,270,350" alt="区域1" href="area1.html" />
  <area shape="circle" coords="337,300,44" alt="区域2" href="area2.html" />
  <area shape="poly" coords="140,21,180,40,150,80" alt="区域3" href="area3.html" />
</map>
```

| shape 值 | coords 含义              |
| -------- | ------------------------ |
| `rect`   | x1,y1,x2,y2              |
| `circle` | center-x,center-y,radius |
| `poly`   | x1,y1,x2,y2,...,xn,yn    |
| `default`| 整个区域                 |

---

## 性能优化技巧

**宽高属性防止布局跳动**
```html
<!-- 指定 width/height,CSS 用比例缩放 -->
<img
  src="photo.jpg"
  alt="照片"
  width="800" height="600"
  style="width: 100%; height: auto;"
/>
```

**fetchpriority 优先级**
```html
<!-- 关键首屏图片 -->
<img src="hero.jpg" alt="主图" fetchpriority="high" />

<!-- 非关键图片 -->
<img src="icon.png" alt="图标" fetchpriority="low" loading="lazy" />
```

**figure 与 figcaption**
```html
<figure>
  <img src="chart.png" alt="销售数据图表" />
  <figcaption>图1:2026年上半年销售数据</figcaption>
</figure>
```
