# CSS 层叠层

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## @layer 定义

**基本写法：定义命名层**
`@layer <层名>;`
```css
/* 声明层叠层 */
@layer base;
@layer components;
@layer utilities;
```

---

**基本写法：定义并写入样式**
`@layer <层名> { <样式> }`
```css
/* 定义层并写入样式 */
@layer base {
  body {
    font-size: 16px;
  }
}
```

---

**单行写法：多层级声明**
`@layer <层1>, <层2>, <层3>;`
```css
/* 单行声明多个层叠层顺序 */
@layer base, components, utilities;
```

---

**换行写法：多层级声明**
`@layer <层1>, <层2>, <层3>;`
```css
/* 换行声明多个层叠层顺序 */
@layer
  base,
  components,
  utilities;
```

---

**基本写法：匿名层**
`@layer { <样式> }`
```css
/* 创建匿名层叠层 */
@layer {
  .box {
    padding: 10px;
  }
}
```

---

## 层优先级

**基本写法：层顺序决定优先级**
`@layer <低优先级>, <中优先级>, <高优先级>;`
```css
/* 后声明的层优先级更高 */
@layer base, components, utilities;
@layer base {
  p { color: black; }
}
@layer utilities {
  p { color: red; }
}
```

---

**基本写法：未分层样式优先**
`<选择器> { <样式> }`
```css
/* 未分层样式优先级高于所有层 */
p {
  color: blue;
}
@layer base {
  p { color: black; }
}
```

---

**基本写法：层内 !important 反转**
`<选择器> { <属性>: <值> !important; }`
```css
/* !important 在层间反转优先级 */
@layer base {
  p { color: black !important; }
}
@layer utilities {
  p { color: red; }
}
```

---

## 嵌套层

**基本写法：嵌套层定义**
`@layer <父层>.<子层> { <样式> }`
```css
/* 定义嵌套层叠层 */
@layer components.buttons {
  .btn {
    padding: 8px 16px;
  }
}
```

---

**基本写法：嵌套层顺序**
`@layer <父层>.<子层1>, <父层>.<子层2>;`
```css
/* 声明嵌套层顺序 */
@layer components.buttons, components.forms;
```

---

**基本写法：嵌套层内定义**
`@layer <父层> { @layer <子层> { <样式> } }`
```css
/* 在父层内定义子层 */
@layer components {
  @layer buttons {
    .btn { padding: 8px; }
  }
  @layer forms {
    .input { padding: 4px; }
  }
}
```

---

## @import 分层导入

**基本写法：@import 导入到层**
`@import url("<文件>") layer(<层名>);`
```css
/* 导入样式到指定层 */
@import url("reset.css") layer(base);
```

---

**基本写法：@import 带媒体查询导入层**
`@import url("<文件>") layer(<层名>) <媒体查询>;`
```css
/* 导入样式到层并应用媒体查询 */
@import url("mobile.css") layer(components) (max-width: 768px);
```

---

## 层与特异性

**基本写法：层优先于特异性**
`@layer <层名> { <高特异性选择器> { <样式> } }`
```css
/* 层优先级高于选择器特异性 */
@layer base {
  #header {
    color: black;
  }
}
.text-red {
  color: red;
}
```

---

**基本写法：同层内特异性生效**
`@layer <层名> { <低特异性>, <高特异性> { <样式> } }`
```css
/* 同一层内特异性正常生效 */
@layer base {
  p { color: black; }
  .highlight { color: red; }
}
```

---

## 实际应用模式

**基本写法：重置层**
`@layer base { <重置样式> }`
```css
/* 将重置样式放入 base 层 */
@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}
```

---

**基本写法：组件层**
`@layer components { <组件样式> }`
```css
/* 将组件样式放入 components 层 */
@layer components {
  .card {
    padding: 16px;
    border: 1px solid #ccc;
  }
}
```

---

**基本写法：工具层**
`@layer utilities { <工具样式> }`
```css
/* 将工具类样式放入 utilities 层 */
@layer utilities {
  .text-center { text-align: center; }
  .mt-4 { margin-top: 1rem; }
}
```

---

**基本写法：主题层**
`@layer theme { <主题样式> }`
```css
/* 将主题样式放入 theme 层 */
@layer theme {
  :root {
    --primary: #007bff;
  }
}
```

---

## 层叠层与级联

**基本写法：层顺序覆盖**
`@layer <低层>, <高层>;`
```css
/* 后声明的层覆盖先声明的层 */
@layer base, theme, components;
@layer base {
  body { background: white; }
}
@layer theme {
  body { background: #f5f5f5; }
}
```

---

**基本写法：层内顺序**
`@layer <层名> { <样式1> <样式2> }`
```css
/* 同层内后定义的覆盖先定义的 */
@layer components {
  .btn { color: black; }
  .btn { color: red; }
}
```

---

## 层与媒体查询

**基本写法：媒体查询中重新排序**
`@media <条件> { @layer <新顺序>; }`
```css
/* 响应式调整层顺序 */
@media (max-width: 768px) {
  @layer base, utilities, components;
}
```

---

**基本写法：层内媒体查询**
`@layer <层名> { @media <条件> { <样式> } }`
```css
/* 在层内使用媒体查询 */
@layer components {
  .container {
    width: 100%;
    @media (min-width: 768px) {
      max-width: 720px;
    }
  }
}
```

---

## 层调试

**基本写法：层顺序检查**
`@layer <层1>, <层2>, <层3>;`
```css
/* 通过声明顺序检查层优先级 */
@layer base, components, utilities;
```

---

**基本写法：层覆盖测试**
`@layer <测试层> { <选择器> { <样式> } }`
```css
/* 临时添加层测试覆盖 */
@layer test {
  .box {
    border: 2px solid red;
  }
}
```

---

## @layer 与 @scope 进阶

**基本写法：@layer 命名层叠层**
`@layer <层1>, <层2>, <层3>;`
```css
/* 通过命名层叠层管理样式优先级 */
@layer reset, base, components, utilities;
@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
}
@layer utilities {
  .text-center { text-align: center; }
}
```

---

**基本写法：@layer 匿名层**
`@layer { <样式声明> }`
```css
/* 匿名层按声明顺序参与层叠 */
@layer {
  /* 该样式进入匿名层,优先级低于未分层样式 */
  p { line-height: 1.5; }
}
```

---

**基本写法：@scope 与 @layer 对比**
`@layer <层名> { <样式> }  vs  @scope (<选择器>) { <样式> }`
```css
/* @layer 控制优先级,@scope 控制作用范围 */
@layer components {
  /* 通过层序控制优先级 */
  .title { color: black; }
}
@scope (.article) {
  /* 通过作用域限定应用范围 */
  .title { font-size: 1.5rem; }
}
```

---

**基本写法：@scope 与 cascade origins**
`@scope (<根>) to (<下限>) { <样式声明> }`
```css
/* @scope 不影响优先级,仅限定范围 */
@scope (.content) to (.ad) {
  /* 仅作用于 .content 内、.ad 之外 */
  a { color: #007bff; }
}
/* @scope 内样式特异性仍按选择器计算 */
```
