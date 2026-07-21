# JavaScript 模块化

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## export 导出

**基本写法：命名导出变量**
`export let <变量名> = <值>;`
```javascript
// 导出变量
export let name = "Alice";
```

---

**基本写法：命名导出函数**
`export function <函数名>() { }`
```javascript
// 导出函数
export function greet() {
}
```

---

**基本写法：命名导出类**
`export class <类名> { }`
```javascript
// 导出类
export class Person {
}
```

---

**基本写法：命名导出常量**
`export const <常量名> = <值>;`
```javascript
// 导出常量
export const PI = 3.14159;
```

---

**基本写法：统一导出**
`export { <标识符1>, <标识符2> };`
```javascript
// 统一导出多个标识符
export { name, greet, Person };
```

---

**基本写法：导出时重命名**
`export { <原名> as <新名> };`
```javascript
// 导出时重命名标识符
export { greet as sayHello };
```

---

**基本写法：默认导出**
`export default <表达式>`
```javascript
// 默认导出
export default function() {
}
```

---

**基本写法：默认导出命名函数**
`export default function <函数名>() { }`
```javascript
// 默认导出命名函数
export default function main() {
}
```

---

**基本写法：默认导出类**
`export default class <类名> { }`
```javascript
// 默认导出类
export default class App {
}
```

---

**基本写法：默认导出对象**
`export default { <属性> };`
```javascript
// 默认导出对象
export default {
    name: "Alice",
    age: 25
};
```

---

## import 导入

**基本写法：导入命名导出**
`import { <标识符> } from "<模块>";`
```javascript
// 导入指定的命名导出
import { name } from "./module.js";
```

---

**单行写法：导入多个命名导出**
`import { <标识符1>, <标识符2> } from "<模块>";`
```javascript
// 单行导入多个命名导出
import { name, greet, Person } from "./module.js";
```

---

**换行写法：导入多个命名导出**
`import { <标识符1>, <标识符2>, <标识符3> } from "<模块>";`
```javascript
// 换行导入多个命名导出
import {
    name,
    greet,
    Person
} from "./module.js";
```

---

**基本写法：导入时重命名**
`import { <原名> as <新名> } from "<模块>";`
```javascript
// 导入时重命名标识符
import { greet as sayHello } from "./module.js";
```

---

**基本写法：导入默认导出**
`import <名称> from "<模块>";`
```javascript
// 导入默认导出
import main from "./module.js";
```

---

**基本写法：混合导入**
`import <默认>, { <命名1>, <命名2> } from "<模块>";`
```javascript
// 同时导入默认导出和命名导出
import main, { name, greet } from "./module.js";
```

---

**基本写法：命名空间导入**
`import * as <命名空间> from "<模块>";`
```javascript
// 导入整个模块作为命名空间
import * as utils from "./module.js";
```

---

**基本写法：使用命名空间**
`<命名空间>.<标识符>`
```javascript
// 通过命名空间访问导出
utils.greet();
```

---

**基本写法：副作用导入**
`import "<模块>";`
```javascript
// 仅执行模块不导入内容
import "./polyfill.js";
```

---

**基本写法：动态导入**
`import("<模块>")`
```javascript
// 动态导入返回 Promise
import("./module.js").then(module => {
});
```

---

**基本写法：await 动态导入**
`const <模块> = await import("<模块>");`
```javascript
// 使用 await 等待动态导入
const module = await import("./module.js");
```

---

## re-export 重新导出

**基本写法：重新导出**
`export { <标识符> } from "<模块>";`
```javascript
// 从其他模块重新导出
export { name } from "./module.js";
```

---

**基本写法：重新导出全部**
`export * from "<模块>";`
```javascript
// 重新导出模块全部内容
export * from "./module.js";
```

---

**基本写法：重新导出默认**
`export { default } from "<模块>";`
```javascript
// 重新导出默认导出
export { default } from "./module.js";
```

---

**基本写法：重新导出并重命名**
`export { <原名> as <新名> } from "<模块>";`
```javascript
// 重新导出并重命名
export { greet as sayHello } from "./module.js";
```

---

## 模块模式

**基本写法：模块文件结构**
`// <导出> <导入>`
```javascript
// 模块文件包含导入和导出
import { helper } from "./helper.js";
export function main() {
}
```

---

**基本写法：具名导入与默认导入**
`import <默认>, * as <命名空间> from "<模块>";`
```javascript
// 同时导入默认和命名空间
import main, * as utils from "./module.js";
```

---

## CommonJS 模块

**基本写法：module.exports**
`module.exports = <值>;`
```javascript
// CommonJS 导出模块
module.exports = {
    name: "Alice"
};
```

---

**基本写法：exports 属性**
`exports.<属性> = <值>;`
```javascript
// CommonJS 导出属性
exports.greet = function() {
};
```

---

**基本写法：require 导入**
`const <模块> = require("<模块>");`
```javascript
// CommonJS 导入模块
const fs = require("fs");
```

---

**基本写法：require 解构导入**
`const { <属性> } = require("<模块>");`
```javascript
// CommonJS 解构导入
const { readFile } = require("fs");
```

---

## 模块路径

**基本写法：相对路径**
`import <模块> from "./<文件>";`
```javascript
// 使用相对路径导入
import { helper } from "./utils.js";
```

---

**基本写法：上级目录**
`import <模块> from "../<文件>";`
```javascript
// 使用上级目录路径
import { config } from "../config.js";
```

---

**基本写法：包名导入**
`import <模块> from "<包名>";`
```javascript
// 导入 npm 包
import React from "react";
```

---

**基本写法：子路径导入**
`import <模块> from "<包名>/<子路径>";`
```javascript
// 导入包的子路径
import { button } from "react-bootstrap";
```

---

## ES2025 Import Attributes

**基本写法：import json 模块**
`import <内容> from "<模块>" with { type: "json" }`
```javascript
// 使用 import attributes 显式声明模块类型
import config from "./config.json" with { type: "json" };
```

---

**基本写法：动态 import 断言**
`import("<模块>", { with: { type: "json" } })`
```javascript
// 动态导入时使用 with 选项声明模块类型
let mod = await import("./config.json", { with: { type: "json" } });
```

---

**基本写法：import attributes 与 import assertions 区别**
`// assert 已废弃改用 with 关键字`
```javascript
// 旧写法 import assertions 使用 assert 已废弃
// import x from "./a.json" assert { type: "json" };
// 新写法 import attributes 使用 with 关键字
import x from "./a.json" with { type: "json" };
```
