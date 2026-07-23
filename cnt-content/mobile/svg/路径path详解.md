# SVG 路径 path 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## path 元素

**path 路径元素**
`<path d="<命令序列>" [fill="<填充色>"] [stroke="<描边色>"] [stroke-width="<描边宽度>"] [fill-rule="<填充规则>"] [pathLength="<归一化长度>"] />`
```html
<svg viewBox="0 0 200 100">
  <path d="M 10 10 L 190 10 L 190 90 L 10 90 Z" fill="#4f5bd5" />
</svg>
```

---

## 命令总览

| 命令 | 含义             | 参数                      | 大小写区别         |
| ---- | ---------------- | ------------------------- | ------------------ |
| `M`  | 移动到(moveTo) | x,y                       | 大写绝对,小写相对 |
| `L`  | 直线到(lineTo) | x,y                       | 同上               |
| `H`  | 水平线           | x                         | 同上               |
| `V`  | 垂直线           | y                         | 同上               |
| `C`  | 三次贝塞尔       | x1,y1 x2,y2 x,y           | 同上               |
| `S`  | 平滑三次贝塞尔   | x2,y2 x,y                 | 同上               |
| `Q`  | 二次贝塞尔       | x1,y1 x,y                 | 同上               |
| `T`  | 平滑二次贝塞尔   | x,y                       | 同上               |
| `A`  | 弧线             | rx,ry rot large,sweep x,y | 同上               |
| `Z`  | 闭合路径         | 无                        | 大小写等价         |

> **绝对坐标**:以坐标系原点为参考;**相对坐标**:以前一命令终点为参考。

---

## 直线命令

### M / L 移动与直线

**M L 直线**
`d="M <x> <y> L <x> <y> ..."`
```html
<path d="M 10 10 L 100 10 L 100 50 L 10 50 Z" fill="#4f5bd5" />
```

### H / V 水平与垂直线

**H V 直线**
`d="M <x> <y> H <x> V <y> ..."`
```html
<path d="M 10 10 H 100 V 50 H 10 Z" fill="#00b894" />
```

`H 100` 等价于 `L 100 当前y`,`V 50` 等价于 `L 当前x 50`。

### 相对坐标

**小写命令相对坐标**
```html
<!-- 绝对 -->
<path d="M 10 10 L 100 10 L 100 50" />
<!-- 相对:等价效果 -->
<path d="M 10 10 l 90 0 l 0 40" />
```

相对命令 `l 90 0` 表示从前一点向右移动 90,y 不变。

---

## 贝塞尔曲线

### Q 二次贝塞尔

**Q 二次贝塞尔**
`d="... Q <控制点x> <控制点y> <终点x> <终点y>"`
```html
<svg viewBox="0 0 200 100">
  <!-- 控制点 (100,10),终点 (190,90) -->
  <path d="M 10 90 Q 100 10 190 90" fill="none" stroke="#4f5bd5" stroke-width="3" />
  <!-- 辅助线 -->
  <line x1="10" y1="90" x2="100" y2="10" stroke="#ccc" stroke-dasharray="3" />
  <line x1="100" y1="10" x2="190" y2="90" stroke="#ccc" stroke-dasharray="3" />
</svg>
```

### T 平滑二次贝塞尔

**T 平滑二次贝塞尔**
`d="... T <终点x> <终点y>"`
```html
<path d="M 10 90 Q 100 10 190 90 T 370 90" fill="none" stroke="#d63031" stroke-width="3" />
```

第二个控制点自动为 (280, 170),形成波浪。

### C 三次贝塞尔

**C 三次贝塞尔**
`d="... C <控制点1x> <控制点1y> <控制点2x> <控制点2y> <终点x> <终点y>"`
```html
<svg viewBox="0 0 200 100">
  <path d="M 10 50 C 50 10 150 90 190 50" fill="none" stroke="#00b894" stroke-width="3" />
</svg>
```

### S 平滑三次贝塞尔

**S 平滑三次贝塞尔**
`d="... S <控制点2x> <控制点2y> <终点x> <终点y>"`
```html
<path d="M 10 50 C 50 10 100 90 150 50 S 250 10 290 50" fill="none" stroke="#d63031" />
```

---

## 弧线命令 A

**A 弧线命令**
`d="... A <rx> <ry> <x-axis-rotation> <large-arc-flag> <sweep-flag> <终点x> <终点y>"`

| 参数              | 含义                |
| ----------------- | ------------------- |
| `rx,ry`           | 椭圆半径            |
| `x-axis-rotation` | 椭圆 x 轴旋转角度   |
| `large-arc-flag`  | 0 短弧 / 1 长弧     |
| `sweep-flag`      | 0 逆时针 / 1 顺时针 |
| `x,y`             | 终点                |

### 四种弧组合

```html
<svg viewBox="0 0 400 200">
  <!-- 从 (50,100) 到 (150,100),半径 50 -->
  <path d="M 50 100 A 50 50 0 0 0 150 100" fill="none" stroke="#4f5bd5" />
  <path d="M 250 100 A 50 50 0 0 1 350 100" fill="none" stroke="#00b894" />
  <path d="M 50 50 A 50 50 0 1 0 150 50" fill="none" stroke="#d63031" />
  <path d="M 250 50 A 50 50 0 1 1 350 50" fill="none" stroke="#f9a825" />
</svg>
```

### 圆弧扇形

**扇形路径**
`d="M <圆心x> <圆心y> L <起点x> <起点y> A <rx> <ry> <rot> <large> <sweep> <终点x> <终点y> Z"`
```html
<svg viewBox="0 0 200 200">
  <path d="M 100 100 L 100 20 A 80 80 0 0 1 180 100 Z" fill="#4f5bd5" />
</svg>
```

绘制 1/4 扇形:从圆心 (100,100) → (100,20) → 顺时针弧到 (180,100) → 闭合。

---

## 闭合路径 Z

**Z 闭合路径**
`d="... Z"`
```html
<!-- 不闭合:不画最后一条边 -->
<path d="M 10 10 L 100 10 L 100 50" fill="none" stroke="#000" />
<!-- 闭合:自动连接终点到起点 -->
<path d="M 10 10 L 100 10 L 100 50 Z" fill="#4f5bd5" />
```

> 闭合后 `fill` 才能正确填充内部。

---

## fill-rule 填充规则

### nonzero(默认)

**fill-rule="nonzero"**
```html
<path
  d="M 10 10 L 190 10 L 190 90 L 10 90 Z M 50 30 L 150 30 L 150 70 L 50 70 Z"
  fill="#4f5bd5"
  fill-rule="nonzero"
/>
```

外矩形 + 内矩形:nonzero 规则下内矩形被"挖空"(外顺时针 + 内逆时针 → 区域计数为 0)。

### evenodd

**fill-rule="evenodd"**
```html
<path
  d="M 10 10 L 190 10 L 190 90 L 10 90 Z M 50 30 L 150 30 L 150 70 L 50 70 Z"
  fill="#00b894"
  fill-rule="evenodd"
/>
```

evenodd 规则下,无论方向,奇数次穿越绘制,偶数次不绘制 → 形成环带效果。

### 五角星示例

```html
<!-- nonzero:中心填充 -->
<path
  d="M 100 10 L 120 70 L 180 70 L 130 105 L 150 165 L 100 130 L 50 165 L 70 105 L 20 70 L 80 70 Z"
  fill="#d63031"
  fill-rule="nonzero"
/>

<!-- evenodd:中心镂空 -->
<path
  d="M 100 10 L 120 70 L 180 70 L 130 105 L 150 165 L 100 130 L 50 165 L 70 105 L 20 70 L 80 70 Z"
  fill="#f9a825"
  fill-rule="evenodd"
/>
```

---

## 多子路径

**单个 path 包含多个 M**
`d="M <起点1> ... Z M <起点2> ... Z"`
```html
<!-- 两个独立三角形 -->
<path d="M 10 10 L 90 10 L 50 90 Z M 110 10 L 190 10 L 150 90 Z" fill="#4f5bd5" />
```

---

## pathLength 路径归一化

**pathLength 归一化路径长度**
`pathLength="<归一化长度>"`
```html
<path
  d="M 10 50 Q 100 10 190 50"
  fill="none"
  stroke="#4f5bd5"
  stroke-width="3"
  pathLength="100"
  stroke-dasharray="50 50"
/>
<!-- pathLength=100,dasharray 50 50 表示画一半留一半 -->
```

### JavaScript 路径测量 API
```javascript
const path = document.querySelector('path');
const length = path.getTotalLength();
console.log(length); // 例如 200
const point = path.getPointAtLength(100); // 路径中点坐标
```

---

## 综合示例:心形

**心形路径**
```html
<svg viewBox="0 0 100 100" width="200" height="200">
  <path
    d="M 50 30
       C 30 10 0 20 0 50
       C 0 70 30 90 50 100
       C 70 90 100 70 100 50
       C 100 20 70 10 50 30 Z"
    fill="#d63031"
  />
</svg>
```

路径解析:
- 起点 (50,30):心形顶部凹陷
- C 到 (0,50):左半弧
- C 到 (50,100):底部尖角
- C 到 (100,50):右半弧
- C 回 (50,30):闭合
