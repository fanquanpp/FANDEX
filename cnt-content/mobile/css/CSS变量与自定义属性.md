# CSS 变量与自定义属性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量定义

**基本写法：定义全局变量**
`:root { --<变量名>: <值>; }`
```css
/* 在根元素定义全局变量 */
:root {
  --primary-color: #007bff;
}
```

---

**基本写法：定义局部变量**
`<选择器> { --<变量名>: <值>; }`
```css
/* 在特定元素定义局部变量 */
.card {
  --card-padding: 20px;
}
```

---

**基本写法：定义颜色变量**
`--<变量名>: <颜色值>;`
```css
/* 定义颜色变量 */
:root {
  --text-color: #333333;
  --bg-color: #ffffff;
}
```

---

**基本写法：定义尺寸变量**
`--<变量名>: <长度值>;`
```css
/* 定义尺寸变量 */
:root {
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}
```

---

**基本写法：定义字号变量**
`--<变量名>: <字号值>;`
```css
/* 定义字号变量 */
:root {
  --font-size-base: 16px;
  --font-size-lg: 1.25rem;
}
```

---

**基本写法：定义字体变量**
`--<变量名>: <字体栈>;`
```css
/* 定义字体变量 */
:root {
  --font-family-sans: "Helvetica Neue", sans-serif;
  --font-family-mono: "Fira Code", monospace;
}
```

---

**基本写法：定义动画变量**
`--<变量名>: <动画值>;`
```css
/* 定义动画变量 */
:root {
  --transition-fast: 0.2s ease-in-out;
  --transition-slow: 0.5s ease;
}
```

---

## 变量使用

**基本写法：使用变量**
`<属性>: var(--<变量名>);`
```css
/* 使用自定义变量 */
.button {
  background-color: var(--primary-color);
  padding: var(--spacing-md);
}
```

---

**基本写法：变量带默认值**
`<属性>: var(--<变量名>, <默认值>);`
```css
/* 变量未定义时使用默认值 */
.box {
  padding: var(--custom-padding, 10px);
}
```

---

**基本写法：变量嵌套使用**
`--<变量名>: var(--<其他变量>);`
```css
/* 变量引用其他变量 */
:root {
  --base-spacing: 10px;
  --double-spacing: calc(var(--base-spacing) * 2);
}
```

---

**基本写法：变量在 calc 中使用**
`<属性>: calc(<表达式> var(--<变量名>));`
```css
/* 在 calc 中使用变量 */
.box {
  width: calc(100% - var(--sidebar-width));
  margin: calc(var(--spacing-md) * 2);
}
```

---

**基本写法：变量在渐变中使用**
`background: linear-gradient(<方向>, var(--<颜色1>), var(--<颜色2>));`
```css
/* 在渐变中使用变量 */
.header {
  background: linear-gradient(135deg, var(--color-start), var(--color-end));
}
```

---

**基本写法：变量在 transform 中使用**
`transform: translate(var(--<x>), var(--<y>));`
```css
/* 在 transform 中使用变量 */
.box {
  transform: translate(var(--offset-x), var(--offset-y));
}
```

---

## 变量作用域

**基本写法：全局变量**
`:root { --<变量名>: <值>; }`
```css
/* 全局作用域变量 */
:root {
  --global-color: #007bff;
}
```

---

**基本写法：局部变量覆盖**
`<选择器> { --<变量名>: <新值>; }`
```css
/* 局部覆盖全局变量 */
.dark-theme {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
}
```

---

**基本写法：组件级变量**
`.<组件类> { --<变量名>: <值>; }`
```css
/* 组件作用域变量 */
.card {
  --card-bg: white;
  --card-border: 1px solid #ccc;
  background: var(--card-bg);
  border: var(--card-border);
}
```

---

**基本写法：媒体查询中修改变量**
`@media <条件> { :root { --<变量名>: <新值>; } }`
```css
/* 响应式调整变量值 */
:root {
  --font-size: 16px;
}
@media (max-width: 768px) {
  :root {
    --font-size: 14px;
  }
}
```

---

## 主题切换

**基本写法：亮色主题变量**
`[data-theme="light"] { --<变量名>: <值>; }`
```css
/* 亮色主题变量定义 */
[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #333333;
  --border-color: #cccccc;
}
```

---

**基本写法：暗色主题变量**
`[data-theme="dark"] { --<变量名>: <值>; }`
```css
/* 暗色主题变量定义 */
[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --border-color: #444444;
}
```

---

**基本写法：使用主题变量**
`<属性>: var(--<变量名>);`
```css
/* 应用主题变量 */
body {
  background-color: var(--bg-color);
  color: var(--text-color);
}
```

---

**基本写法：prefers-color-scheme 自动切换**
`@media (prefers-color-scheme: dark) { :root { --<变量名>: <值>; } }`
```css
/* 跟随系统主题自动切换 */
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
  }
}
```

---

## 变量与 JavaScript

**基本写法：JavaScript 读取变量**
`getComputedStyle(<元素>).getPropertyValue('--<变量名>')`
```css
/* JavaScript 读取 CSS 变量 */
```

---

**基本写法：JavaScript 设置变量**
`<元素>.style.setProperty('--<变量名>', <值>)`
```css
/* JavaScript 设置 CSS 变量 */
```

---

## 变量继承

**基本写法：变量继承**
`<父选择器> { --<变量名>: <值>; } <子选择器> { <属性>: var(--<变量名>); }`
```css
/* 子元素继承父元素变量 */
.parent {
  --text-size: 18px;
}
.child {
  font-size: var(--text-size);
}
```

---

**基本写法：变量覆盖继承**
`<子选择器> { --<变量名>: <新值>; }`
```css
/* 子元素覆盖继承的变量 */
.parent {
  --text-size: 18px;
}
.child {
  --text-size: 24px;
  font-size: var(--text-size);
}
```

---

## 设计令牌系统

**单行写法：多颜色变量定义**
`:root { --color-<名1>: <值1>; --color-<名2>: <值2>; --color-<名3>: <值3>; }`
```css
/* 单行定义颜色令牌系统 */
:root { --color-primary: #007bff; --color-secondary: #6c757d; --color-success: #28a745; --color-danger: #dc3545; }
```

---

**换行写法：多颜色变量定义**
`:root { --color-<名>: <值>; }`
```css
/* 换行定义颜色令牌系统 */
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
}
```

---

**单行写法：多尺寸变量定义**
`:root { --size-<名1>: <值1>; --size-<名2>: <值2>; --size-<名3>: <值3>; }`
```css
/* 单行定义尺寸令牌系统 */
:root { --size-sm: 8px; --size-md: 16px; --size-lg: 24px; --size-xl: 32px; }
```

---

**换行写法：多尺寸变量定义**
`:root { --size-<名>: <值>; }`
```css
/* 换行定义尺寸令牌系统 */
:root {
  --size-xs: 4px;
  --size-sm: 8px;
  --size-md: 16px;
  --size-lg: 24px;
  --size-xl: 32px;
  --size-2xl: 48px;
}
```

---

**单行写法：多字号变量定义**
`:root { --font-size-<名1>: <值1>; --font-size-<名2>: <值2>; --font-size-<名3>: <值3>; }`
```css
/* 单行定义字号令牌系统 */
:root { --font-size-sm: 0.875rem; --font-size-base: 1rem; --font-size-lg: 1.25rem; --font-size-xl: 1.5rem; }
```

---

**换行写法：多字号变量定义**
`:root { --font-size-<名>: <值>; }`
```css
/* 换行定义字号令牌系统 */
:root {
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 3rem;
}
```

---

## 变量类型与 @property

**基本写法：@property 定义类型**
`@property --<变量名> { syntax: "<类型>"; inherits: <布尔>; initial-value: <值>; }`
```css
/* 定义带类型的自定义属性 */
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
```

---

**基本写法：@property 颜色类型**
`@property --<变量名> { syntax: "<color>"; inherits: true; initial-value: <颜色>; }`
```css
/* 定义颜色类型自定义属性 */
@property --theme-color {
  syntax: "<color>";
  inherits: true;
  initial-value: #007bff;
}
```

---

**基本写法：@property 长度类型**
`@property --<变量名> { syntax: "<length>"; inherits: true; initial-value: <长度>; }`
```css
/* 定义长度类型自定义属性 */
@property --spacing {
  syntax: "<length>";
  inherits: true;
  initial-value: 16px;
}
```

---

**基本写法：@property 动画**
`@keyframes <名称> { from { --<变量名>: <值1>; } to { --<变量名>: <值2>; } }`
```css
/* 使用 @property 实现变量动画 */
@property --rotation {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
@keyframes spin {
  from { --rotation: 0deg; }
  to { --rotation: 360deg; }
}
.spinner {
  animation: spin 1s linear infinite;
  transform: rotate(var(--rotation));
}
```

---

## 变量回退值

**基本写法：单层回退**
`<属性>: var(--<变量名>, <默认值>);`
```css
/* 变量未定义时使用默认值 */
.box {
  color: var(--text-color, #333333);
}
```

---

**基本写法：多层回退**
`<属性>: var(--<变量1>, var(--<变量2>, <默认值>));`
```css
/* 多层变量回退 */
.box {
  color: var(--custom-color, var(--theme-color), #333333);
}
```

---

## 变量与 calc 计算

**基本写法：变量乘法**
`<属性>: calc(var(--<变量>) * <系数>);`
```css
/* 变量乘法计算 */
.box {
  width: calc(var(--base-width) * 2);
}
```

---

**基本写法：变量加法**
`<属性>: calc(var(--<变量1>) + var(--<变量2>));`
```css
/* 变量加法计算 */
.box {
  padding: calc(var(--spacing-sm) + var(--spacing-md));
}
```

---

**基本写法：变量减法**
`<属性>: calc(var(--<变量1>) - var(--<变量2>));`
```css
/* 变量减法计算 */
.box {
  margin: calc(var(--container-width) - var(--content-width));
}
```

---

**基本写法：变量除法**
`<属性>: calc(var(--<变量>) / <系数>);`
```css
/* 变量除法计算 */
.box {
  width: calc(var(--full-width) / 3);
}
```
