# JavaScript 程序结构与基本语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 语句与分号

**基本写法：语句结尾分号**
`<语句>;`
```javascript
// 语句以分号结尾
let x = 10;
```

---

**基本写法：无分号语句**
`<语句>`
```javascript
// 语句可省略分号
let x = 10
```

---

## 严格模式

**基本写法：启用严格模式**
`"use strict";`
```javascript
// 在脚本顶部启用严格模式
"use strict";
let x = 10;
```

---

**基本写法：函数级严格模式**
`function <函数名>() { "use strict"; }`
```javascript
// 在函数内部启用严格模式
function safeFunction() {
    "use strict";
}
```

---

## 注释

**基本写法：单行注释**
`// <注释内容>`
```javascript
// 这是一个单行注释
let x = 10;
```

---

**基本写法：多行注释**
`/* <注释内容> */`
```javascript
/* 这是一个多行注释 */
let x = 10;
```

---

**换行写法：多行注释**
`/* <注释内容> */`
```javascript
/*
 * 这是一个多行注释
 * 可以跨越多行
 */
let x = 10;
```

---

**基本写法：文档注释**
`/** <注释内容> */`
```javascript
/** 计算两个数的和 */
function add(a, b) {
    return a + b;
}
```

---

## 输出

**基本写法：控制台输出**
`console.log(<内容>);`
```javascript
// 输出到控制台
console.log("Hello, World!");
```

---

**基本写法：输出多个值**
`console.log(<值1>, <值2>);`
```javascript
// 输出多个值以空格分隔
console.log("Name:", name, "Age:", age);
```

---

**基本写法：错误输出**
`console.error(<内容>);`
```javascript
// 输出错误信息到控制台
console.error("Something went wrong");
```

---

**基本写法：警告输出**
`console.warn(<内容>);`
```javascript
// 输出警告信息到控制台
console.warn("This is a warning");
```

---

## 标识符命名

**基本写法：变量名命名**
`<lowerCamelCase>`
```javascript
// 变量名使用小驼峰命名法
userName
```

---

**基本写法：常量名命名**
`<UPPER_SNAKE_CASE>`
```javascript
// 常量名全大写使用下划线分隔
MAX_VALUE
```

---

**基本写法：函数名命名**
`<lowerCamelCase>`
```javascript
// 函数名使用小驼峰命名法
getUserName
```

---

**基本写法：类名命名**
`<UpperCamelCase>`
```javascript
// 类名使用大驼峰命名法
HelloWorld
```

---

## 输入

**基本写法：浏览器输入**
`prompt("<提示文本>")`
```javascript
// 弹出输入框获取用户输入
let name = prompt("请输入你的名字");
```

---

**基本写法：确认框**
`confirm("<提示文本>")`
```javascript
// 弹出确认框返回布尔值
let result = confirm("确定要删除吗");
```

---

**基本写法：警告框**
`alert("<消息>")`
```javascript
// 弹出警告框显示消息
alert("操作成功");
```

---

## 代码块

**基本写法：块级作用域**
`{ <语句> }`
```javascript
// 使用大括号创建块级作用域
{
    let blockVar = 10;
}
```

---

**基本写法：语句分组**
`{ <语句1> <语句2> }`
```javascript
// 多条语句分组
{
    let x = 1;
    let y = 2;
}
```
