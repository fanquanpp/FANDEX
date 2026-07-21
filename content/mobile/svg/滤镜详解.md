# SVG 滤镜 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## filter 滤镜容器

**filter 滤镜定义**
`<filter id="<id>" [x="<x>"] [y="<y>"] [width="<w>"] [height="<h>"] [filterUnits="<区域坐标系>"] [primitiveUnits="<基元坐标系>"]><滤镜基元></filter>`
```html
<svg viewBox="0 0 200 100">
  <defs>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </defs>
  <rect x="20" y="20" width="160" height="60" fill="#4f5bd5" filter="url(#blur)" />
</svg>
```

### filter 区域属性

| 属性             | 说明           | 默认值            |
| ---------------- | -------------- | ----------------- |
| `x, y`           | 滤镜区域左上角 | -10%              |
| `width, height`  | 滤镜区域尺寸   | 120%              |
| `filterUnits`    | 区域坐标系     | objectBoundingBox |
| `primitiveUnits` | 滤镜基元坐标   | userSpaceOnUse    |

### filter 应用属性

**filter 引用滤镜**
`filter="url(#<filter-id>)"`
```html
<rect x="20" y="20" width="160" height="60" fill="#4f5bd5" filter="url(#blur)" />
```

---

## feGaussianBlur 高斯模糊

**feGaussianBlur 高斯模糊**
`<feGaussianBlur [in="<输入>"] stdDeviation="<半径>" [result="<输出名>"] />`
```html
<filter id="blur5">
  <feGaussianBlur stdDeviation="5" />
</filter>
<filter id="blur-xy">
  <feGaussianBlur stdDeviation="5 2" />
  <!-- X 方向模糊 5,Y 方向模糊 2 -->
</filter>
```

| 参数           | 说明                     |
| -------------- | ------------------------ |
| `stdDeviation` | 模糊半径,可分别指定 X Y |

---

## feDropShadow 阴影

**feDropShadow 投影**
`<feDropShadow [dx="<x偏移>"] [dy="<y偏移>"] [stdDeviation="<模糊>"] [flood-color="<颜色>"] [flood-opacity="<透明度>"] />`
```html
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="4" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3" />
</filter>
```

| 参数            | 说明       | 默认值 |
| --------------- | ---------- | ------ |
| `dx, dy`        | 阴影偏移   | 2      |
| `stdDeviation`  | 模糊半径   | 2      |
| `flood-color`   | 阴影颜色   | #000   |
| `flood-opacity` | 阴影透明度 | 1      |

### 内阴影模拟

**feComposite 实现内阴影**
```html
<filter id="inner-shadow">
  <feOffset dx="0" dy="2">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5" />
  </feOffset>
  <feComposite operator="out" in="SourceGraphic" />
  <feComposite operator="in" in2="SourceAlpha" />
  <feComposite operator="over" in="SourceGraphic" />
</filter>
```

---

## feColorMatrix 颜色矩阵

**feColorMatrix 颜色矩阵变换**
`<feColorMatrix [in="<输入>"] type="<matrix | saturate | hueRotate | luminanceToAlpha>" values="<矩阵值或参数>" [result="<输出名>"] />`

### matrix 自定义矩阵

**4x5 矩阵变换 RGBA**
```html
<filter id="grayscale">
  <feColorMatrix
    type="matrix"
    values="0.3 0.59 0.11 0 0
            0.3 0.59 0.11 0 0
            0.3 0.59 0.11 0 0
            0   0    0    1 0"
  />
</filter>
```

每个像素的 RGBA 按矩阵相乘:`R' = 0.3R + 0.59G + 0.11B + 0A + 0`,得到灰度。

### type 预设类型

| 值                 | 说明                               |
| ------------------ | ---------------------------------- |
| `matrix`           | 自定义矩阵                         |
| `saturate`         | 饱和度(0=灰度,1=原色,2=高饱和) |
| `hueRotate`        | 色相旋转(度)                     |
| `luminanceToAlpha` | 亮度转透明度                       |

**saturate 饱和度**
```html
<filter id="saturate">
  <feColorMatrix type="saturate" values="2" />
</filter>
```

**hueRotate 色相旋转**
```html
<filter id="hue-rotate">
  <feColorMatrix type="hueRotate" values="90" />
</filter>
```

---

## feComponentTransfer 通道映射

**feComponentTransfer 通道函数**
`<feComponentTransfer [in="<输入>"] [result="<输出名>"]><feFuncR type="<类型>" ... /><feFuncG ... /><feFuncB ... /><feFuncA ... /></feComponentTransfer>`
```html
<filter id="brightness">
  <feComponentTransfer>
    <feFuncR type="linear" slope="1.5" intercept="0" />
    <feFuncG type="linear" slope="1.5" intercept="0" />
    <feFuncB type="linear" slope="1.5" intercept="0" />
  </feComponentTransfer>
</filter>
```

| 函数              | 说明                            |
| ----------------- | ------------------------------- |
| `feFuncR/G/B/A`   | 通道函数                        |
| `type="linear"`   | 线性:`y = slope*x + intercept` |
| `type="table"`    | 表格查找                        |
| `type="discrete"` | 阶梯量化                        |
| `type="gamma"`    | 伽马校正                        |

---

## feMerge 合成

**feMerge 多滤镜结果叠加**
`<feMerge><feMergeNode in="<输入>" />...</feMerge>`
```html
<filter id="glow">
  <feGaussianBlur stdDeviation="4" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

模糊结果叠加两次产生更强光晕,最后叠加原图,形成发光效果。

---

## 滤镜基元 result/in

**result 命名输出 / in 引用输入**
```html
<filter id="emboss">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
  <feSpecularLighting
    in="blur"
    surfaceScale="3"
    specularConstant="1"
    specularExponent="20"
    lighting-color="#fff"
    result="spec"
  >
    <fePointLight x="-50" y="-50" z="200" />
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specMasked" />
  <feComposite
    in="SourceGraphic"
    in2="specMasked"
    operator="arithmetic"
    k1="0"
    k2="1"
    k3="1"
    k4="0"
  />
</filter>
```

### 内置输入

| 输入              | 含义                              |
| ----------------- | --------------------------------- |
| `SourceGraphic`   | 原始彩色图形                      |
| `SourceAlpha`     | 原始图形的 alpha 通道(黑白蒙版) |
| `BackgroundImage` | 背景图(需 `enable-background`)  |
| `Previous`        | 前一基元结果                      |
| 自定义 result     | 命名的中间结果                    |

---

## feOffset 偏移

**feOffset 位置偏移**
`<feOffset [in="<输入>"] dx="<x偏移>" dy="<y偏移>" [result="<输出名>"] />`
```html
<filter id="offset">
  <feOffset dx="10" dy="10" in="SourceAlpha" />
  <feFlood flood-color="#000" flood-opacity="0.3" />
  <feComposite operator="in" in2="SourceAlpha" />
  <feMerge>
    <feMergeNode />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

等价于 feDropShadow 的手动实现。

---

## feFlood 纯色填充

**feFlood 纯色填充区域**
`<feFlood flood-color="<颜色>" [flood-opacity="<透明度>"] [result="<输出名>"] />`
```html
<filter id="red-overlay">
  <feFlood flood-color="#d63031" flood-opacity="0.5" />
  <feComposite operator="in" in2="SourceGraphic" />
</filter>
```

将图形填充为指定颜色,配合 feComposite 可制作色彩滤镜。

---

## feSpecularLighting 光照

**feSpecularLighting 镜面光照**
`<feSpecularLighting [in="<输入>"] surfaceScale="<表面深度>" specularConstant="<常数>" specularExponent="<指数>" lighting-color="<光色>" [result="<输出名>"]><光源元素></feSpecularLighting>`
```html
<filter id="metallic">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
  <feSpecularLighting
    in="blur"
    surfaceScale="5"
    specularConstant="1"
    specularExponent="20"
    lighting-color="#fff"
    result="spec"
  >
    <feDistantLight azimuth="135" elevation="45" />
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" />
  <feComposite in="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
</filter>
```

### 光源元素

| 光源               | 说明                           |
| ------------------ | ------------------------------ |
| `<feDistantLight>` | 平行光,参数 azimuth/elevation |
| `<fePointLight>`   | 点光源,参数 x/y/z             |
| `<feSpotLight>`    | 聚光灯                         |

---

## feTurbulence 噪声

**feTurbulence 柏林噪声**
`<feTurbulence type="<fractalNoise | turbulence>" baseFrequency="<频率>" numOctaves="<倍频>" [seed="<种子>"] [stitchTiles="<平铺>"] [result="<输出名>"] />`
```html
<filter id="texture">
  <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" />
  <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.2 0" />
  <feComposite operator="in" in2="SourceGraphic" />
</filter>
```

| 参数            | 说明                          |
| --------------- | ----------------------------- |
| `type`          | `fractalNoise` / `turbulence` |
| `baseFrequency` | 频率(越大颗粒越细)          |
| `numOctaves`    | 倍频数(细节层次)            |
| `seed`          | 随机种子                      |
| `stitchTiles`   | 平铺缝合                      |

---

## feDisplacementMap 位移映射

**feDisplacementMap 像素位移**
`<feDisplacementMap [in="<输入图>"] in2="<位移图>" scale="<位移幅度>" xChannelSelector="<R|G|B|A>" yChannelSelector="<R|G|B|A>" [result="<输出名>"] />`
```html
<filter id="ripple">
  <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="noise" />
  <feDisplacementMap
    in="SourceGraphic"
    in2="noise"
    scale="20"
    xChannelSelector="R"
    yChannelSelector="G"
  />
</filter>
```

`scale=20` 表示根据噪声 R/G 通道值最大位移 20 像素。

---

## feComposite 合成

**feComposite 像素合成**
`<feComposite [in="<输入1>"] in2="<输入2>" operator="<运算符>" [k1="<k1>"] [k2="<k2>"] [k3="<k3>"] [k4="<k4>"] [result="<输出名>"] />`

| operator 值  | 说明                  |
| ------------ | --------------------- |
| `over`       | 默认,覆盖            |
| `in`         | 交集                  |
| `out`        | 差集                  |
| `atop`       | 在...之上(仅交集)   |
| `xor`        | 异或                  |
| `arithmetic` | 算术运算(k1/k2/k3/k4) |

---

## 滤镜组合示例

### 霓虹发光

**feGaussianBlur + feColorMatrix + feMerge**
```html
<filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="4" result="blur1" />
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
  <feColorMatrix
    in="blur1"
    type="matrix"
    values="0 0 0 0 0.3
                         0 0 0 0 0.4
                         0 0 0 0 1
                         0 0 0 1.5 0"
    result="glow1"
  />
  <feColorMatrix
    in="blur2"
    type="matrix"
    values="0 0 0 0 0.3
                         0 0 0 0 0.4
                         0 0 0 0 1
                         0 0 0 0.8 0"
    result="glow2"
  />
  <feMerge>
    <feMergeNode in="glow2" />
    <feMergeNode in="glow1" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

### 玻璃磨砂

**feGaussianBlur + feColorMatrix 半透明**
```html
<filter id="frosted-glass">
  <feGaussianBlur stdDeviation="5" />
  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0.1" />
</filter>
```

---

## 综合示例:玻璃质感卡片

**filter + linearGradient 组合**
```html
<svg viewBox="0 0 400 200">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f5bd5" />
      <stop offset="100%" stop-color="#00b894" />
    </linearGradient>
    <filter id="card-shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.2" />
    </filter>
    <filter id="card-glow">
      <feGaussianBlur stdDeviation="2" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="400" height="200" fill="url(#bg)" />
  <rect
    x="60"
    y="40"
    width="280"
    height="120"
    rx="16"
    fill="#fff"
    fill-opacity="0.15"
    filter="url(#card-shadow)"
  />
  <text
    x="200"
    y="100"
    text-anchor="middle"
    font-size="24"
    fill="#fff"
    font-weight="bold"
    filter="url(#card-glow)"
  >
    Glass Card
  </text>
</svg>
```
