# 文档类型声明 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## DOCTYPE 声明

**HTML5 文档类型声明**
`<!DOCTYPE html>`
```html
<!-- 文档首行声明,触发标准模式 -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>文档类型声明示例</title>
  </head>
  <body>
    <p>这是一个 HTML5 文档</p>
  </body>
</html>
```

**DOCTYPE 历史版本对照**

| 版本             | DOCTYPE 声明                                                    |
| ---------------- | --------------------------------------------------------------- |
| HTML 2.0         | `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">`            |
| HTML 4.01 Strict | `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "...">`      |
| XHTML 1.0        | `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "...">` |
| HTML5            | `<!DOCTYPE html>`                                               |

---

## 渲染模式检测

**渲染模式分类**

| 模式             | 触发条件            | 特点                         |
| ---------------- | ------------------- | ---------------------------- |
| 标准模式         | 存在有效的 DOCTYPE  | 按 W3C 标准渲染              |
| 怪异模式         | 缺少 DOCTYPE 或无效 | 模拟旧浏览器行为             |
| 几乎标准模式     | 某些过渡型 DOCTYPE  | 除表格单元格高度外按标准渲染 |

**JavaScript 检测当前模式**
`document.compatMode`
```javascript
// 检测当前渲染模式
if (document.compatMode === 'CSS1Compat') {
  console.log('标准模式');
} else {
  console.log('怪异模式');
}
```

---

## HTML Living Standard 新特性时间线

| 年份 | 新增特性                              |
| ---- | ------------------------------------- |
| 2020 | `loading="lazy"`                      |
| 2021 | `<dialog>` 元素、`popover` 属性       |
| 2022 | Container Queries、`:has()` 选择器    |
| 2023 | View Transitions API、`<search>` 元素 |
| 2024 | CSS Anchor Positioning                |
| 2025 | Declarative Shadow DOM                |
