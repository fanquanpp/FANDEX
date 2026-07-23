# JavaScript 变量与数据类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量声明

**基本写法：let 声明**
`let <变量名> = <值>;`
```javascript
// 声明可变变量
let age = 18;
```

---

**基本写法：const 声明**
`const <常量名> = <值>;`
```javascript
// 声明不可变常量
const PI = 3.14159;
```

---

**基本写法：var 声明**
`var <变量名> = <值>;`
```javascript
// 声明函数级作用域变量
var name = "Alice";
```

---

**基本写法：多变量声明**
`let <变量1> = <值1>, <变量2> = <值2>;`
```javascript
// 一次声明多个变量
let x = 1, y = 2, z = 3;
```

---

**基本写法：解构声明**
`let { <属性1>, <属性2> } = <对象>;`
```javascript
// 对象解构声明变量
let { name, age } = user;
```

---

**基本写法：数组解构声明**
`let [ <变量1>, <变量2> ] = <数组>;`
```javascript
// 数组解构声明变量
let [first, second] = numbers;
```

---

## 原始数据类型

**基本写法：Number 类型**
`let <变量> = <数字>;`
```javascript
// 声明数字类型
let count = 42;
```

---

**基本写法：浮点数**
`let <变量> = <浮点数>;`
```javascript
// 声明浮点数
let price = 9.99;
```

---

**基本写法：String 类型**
`let <变量> = "<字符串>";`
```javascript
// 声明字符串
let name = "Hello";
```

---

**基本写法：模板字符串**
`let <变量> = \`<模板>\`;`
```javascript
// 使用模板字符串嵌入变量
let greeting = `Hello, ${name}!`;
```

---

**基本写法：Boolean 类型**
`let <变量> = <true|false>;`
```javascript
// 声明布尔值
let isActive = true;
```

---

**基本写法：null 值**
`let <变量> = null;`
```javascript
// 声明空值
let data = null;
```

---

**基本写法：undefined 值**
`let <变量> = undefined;`
```javascript
// 声明未定义值
let value = undefined;
```

---

**基本写法：Symbol 类型**
`let <变量> = Symbol("<描述>");`
```javascript
// 创建唯一符号
let id = Symbol("id");
```

---

**基本写法：BigInt 类型**
`let <变量> = <大整数>n;`
```javascript
// 声明大整数
let big = 9007199254740991n;
```

---

## 引用数据类型

**基本写法：Object 类型**
`let <变量> = { <键>: <值> };`
```javascript
// 声明对象
let user = { name: "Alice", age: 25 };
```

---

**基本写法：Array 类型**
`let <变量> = [ <元素1>, <元素2> ];`
```javascript
// 声明数组
let numbers = [1, 2, 3];
```

---

**基本写法：Function 类型**
`let <变量> = function() { };`
```javascript
// 声明函数表达式
let greet = function() {
};
```

---

**基本写法：Date 类型**
`let <变量> = new Date();`
```javascript
// 创建日期对象
let now = new Date();
```

---

**基本写法：RegExp 类型**
`let <变量> = /<模式>/<标志>;`
```javascript
// 创建正则表达式
let pattern = /hello/gi;
```

---

## 类型检查

**基本写法：typeof 操作符**
`typeof <变量>`
```javascript
// 获取变量类型字符串
let type = typeof name;
```

---

**基本写法：instanceof 操作符**
`<对象> instanceof <构造函数>`
```javascript
// 检查对象是否为某构造函数的实例
let isArray = arr instanceof Array;
```

---

**基本写法：Array.isArray**
`Array.isArray(<变量>)`
```javascript
// 检查变量是否为数组
let isArray = Array.isArray(numbers);
```

---

**基本写法：Object.prototype.toString**
`Object.prototype.toString.call(<变量>)`
```javascript
// 获取对象精确类型
let type = Object.prototype.toString.call(obj);
```

---

## 类型转换

**基本写法：转字符串**
`String(<值>)`
```javascript
// 将值转换为字符串
let str = String(123);
```

---

**基本写法：toString 方法**
`<值>.toString()`
```javascript
// 调用 toString 方法转换
let str = (123).toString();
```

---

**基本写法：转数字**
`Number(<值>)`
```javascript
// 将字符串转换为数字
let num = Number("123");
```

---

**基本写法：parseInt**
`parseInt(<字符串>, <基数>)`
```javascript
// 解析整数
let num = parseInt("42px", 10);
```

---

**基本写法：parseFloat**
`parseFloat(<字符串>)`
```javascript
// 解析浮点数
let num = parseFloat("3.14abc");
```

---

**基本写法：转布尔**
`Boolean(<值>)`
```javascript
// 将值转换为布尔
let bool = Boolean(0);
```

---

**基本写法：双重否定转布尔**
`!!<值>`
```javascript
// 使用双重否定转换为布尔
let bool = !!value;
```

---

## 变量作用域

**基本写法：全局作用域**
`<变量名> = <值>;`
```javascript
// 不使用关键字声明为全局变量
globalVar = 10;
```

---

**基本写法：函数作用域**
`function <函数>() { var <变量> = <值>; }`
```javascript
// var 声明的变量为函数级作用域
function test() {
    var functionVar = 10;
}
```

---

**基本写法：块级作用域**
`{ let <变量> = <值>; }`
```javascript
// let 声明的变量为块级作用域
{
    let blockVar = 10;
}
```

---

## 变量提升

**基本写法：var 提升**
`console.log(<变量>); var <变量> = <值>;`
```javascript
// var 声明的变量会提升值为 undefined
console.log(x);
var x = 10;
```

---

**基本写法：let 暂时性死区**
`console.log(<变量>); let <变量> = <值>;`
```javascript
// let 声明的变量在声明前访问会报错
// console.log(y);
// let y = 10;
```

---

## 常量特性

**基本写法：const 不可重新赋值**
`const <常量> = <值>;`
```javascript
// const 声明的常量不能重新赋值
const MAX = 100;
```

---

**基本写法：const 对象属性可变**
`const <对象> = { }; <对象>.<属性> = <值>;`
```javascript
// const 对象的属性可以修改
const obj = {};
obj.name = "Alice";
```

---

**基本写法：冻结对象**
`Object.freeze(<对象>)`
```javascript
// 冻结对象使其属性不可变
const frozen = Object.freeze({});
```

---

## ES2025 新数据类型

**基本写法：Float16Array 半精度浮点数组**
`new Float16Array([<元素>])`
```javascript
// 创建半精度浮点数组节省内存适合机器学习场景
let arr = new Float16Array([1.0, 2.5, 3.14]);
```

---

**基本写法：Iterator 协议对象**
`<对象>[Symbol.iterator] = function() { return { next: () => ({ value, done }) }; }`
```javascript
// 自定义迭代器协议对象支持 for-of 与扩展运算符
let range = {
    [Symbol.iterator]() {
        let n = 0;
        return {
            next: () => ({ value: n++, done: n > 3 })
        };
    }
};
```
