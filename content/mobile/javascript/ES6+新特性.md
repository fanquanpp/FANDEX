# JavaScript ES6+ 新特性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## let 与 const

**基本写法：let 声明**
`let <变量名> = <值>;`
```javascript
// 声明块级作用域变量
let count = 0;
```

---

**基本写法：const 声明**
`const <常量名> = <值>;`
```javascript
// 声明不可重新赋值的常量
const PI = 3.14159;
```

---

## 箭头函数

**基本写法：箭头函数**
`(<参数>) => <表达式>`
```javascript
// 箭头函数直接返回表达式
let square = x => x * x;
```

---

**基本写法：箭头函数带函数体**
`(<参数>) => { return <值>; }`
```javascript
// 箭头函数带函数体
let greet = (name) => {
    return "Hello, " + name;
};
```

---

## 模板字符串

**基本写法：模板字符串**
`` ` <文本> ` ``
```javascript
// 使用反引号创建字符串
let str = `Hello World`;
```

---

**基本写法：变量插值**
`` ` <文本> ${<变量>} ` ``
```javascript
// 在模板字符串中嵌入变量
let greeting = `Hello, ${name}!`;
```

---

**基本写法：多行字符串**
`` ` <行1> <行2> ` ``
```javascript
// 模板字符串支持多行
let text = `Line 1
Line 2`;
```

---

**基本写法：表达式插值**
`` ` <文本> ${<表达式>} ` ``
```javascript
// 在模板字符串中嵌入表达式
let result = `Sum: ${a + b}`;
```

---

## 解构赋值

**基本写法：数组解构**
`let [ <变量1>, <变量2> ] = <数组>;`
```javascript
// 解构数组元素
let [a, b] = [1, 2];
```

---

**基本写法：对象解构**
`let { <属性1>, <属性2> } = <对象>;`
```javascript
// 解构对象属性
let { name, age } = user;
```

---

**基本写法：默认值解构**
`let { <属性> = <默认值> } = <对象>;`
```javascript
// 解构时设置默认值
let { name = "Unknown" } = user;
```

---

**基本写法：重命名解构**
`let { <属性>: <新名> } = <对象>;`
```javascript
// 解构时重命名变量
let { name: userName } = user;
```

---

**基本写法：剩余元素解构**
`let [ <变量1>, ...<剩余> ] = <数组>;`
```javascript
// 解构剩余元素到数组
let [first, ...rest] = numbers;
```

---

## 展开运算符

**基本写法：数组展开**
`[...<数组1>, ...<数组2>]`
```javascript
// 合并数组
let combined = [...arr1, ...arr2];
```

---

**基本写法：对象展开**
`{ ...<对象1>, ...<对象2> }`
```javascript
// 合并对象
let merged = { ...obj1, ...obj2 };
```

---

**基本写法：函数参数展开**
`<函数>(...<数组>)`
```javascript
// 将数组展开为函数参数
Math.max(...numbers);
```

---

## 默认参数

**基本写法：默认参数**
`function <函数>(<参数> = <默认值>) { }`
```javascript
// 参数默认值
function greet(name = "Guest") {
}
```

---

## 剩余参数

**基本写法：剩余参数**
`function <函数>(...<参数名>) { }`
```javascript
// 收集剩余参数为数组
function sum(...numbers) {
}
```

---

## for-of 循环

**基本写法：for-of 遍历**
`for (let <元素> of <可迭代对象>) { }`
```javascript
// 遍历可迭代对象
for (let item of array) {
}
```

---

## Symbol

**基本写法：创建 Symbol**
`let <变量> = Symbol("<描述>");`
```javascript
// 创建唯一符号
let id = Symbol("id");
```

---

**基本写法：Symbol 作为属性键**
`{ [<Symbol>]: <值> }`
```javascript
// 使用 Symbol 作为对象属性键
let obj = { [id]: 123 };
```

---

## 类

**基本写法：类定义**
`class <类名> { }`
```javascript
// 定义类
class Person {
}
```

---

**基本写法：构造方法**
`constructor(<参数>) { }`
```javascript
// 类的构造方法
class Person {
    constructor(name) {
        this.name = name;
    }
}
```

---

**基本写法：类方法**
`<方法名>() { }`
```javascript
// 定义类方法
class Person {
    greet() {
    }
}
```

---

**基本写法：类继承**
`class <子类> extends <父类> { }`
```javascript
// 类继承
class Student extends Person {
}
```

---

**基本写法：super 调用**
`super.<方法>()`
```javascript
// 调用父类方法
class Student extends Person {
    greet() {
        super.greet();
    }
}
```

---

**基本写法：静态方法**
`static <方法名>() { }`
```javascript
// 定义静态方法
class Person {
    static create() {
    }
}
```

---

## Promise

**基本写法：创建 Promise**
`new Promise((<resolve>, <reject>) => { })`
```javascript
// 创建 Promise 对象
let p = new Promise((resolve, reject) => {
});
```

---

**基本写法：async-await**
`async function <函数>() { await <Promise>; }`
```javascript
// 使用 async-await 处理异步
async function fetchData() {
    let data = await promise;
}
```

---

## Map 与 Set

**基本写法：创建 Map**
`let <变量> = new Map();`
```javascript
// 创建 Map 对象
let map = new Map();
```

---

**基本写法：Map 设置**
`<map>.set(<键>, <值>);`
```javascript
// 设置 Map 键值对
map.set("name", "Alice");
```

---

**基本写法：Map 获取**
`<map>.get(<键>);`
```javascript
// 获取 Map 值
let name = map.get("name");
```

---

**基本写法：创建 Set**
`let <变量> = new Set();`
```javascript
// 创建 Set 对象
let set = new Set();
```

---

**基本写法：Set 添加**
`<set>.add(<值>);`
```javascript
// 向 Set 添加值
set.add(1);
```

---

## 模块化

**基本写法：命名导出**
`export <声明>`
```javascript
// 导出变量
export let name = "Alice";
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

**基本写法：导入**
`import { <标识符> } from "<模块>";`
```javascript
// 导入模块
import { name } from "./module.js";
```

---

## 可选链与空值合并

**基本写法：可选链**
`<对象>?.<属性>`
```javascript
// 安全访问嵌套属性
let name = user?.name;
```

---

**基本写法：可选链方法**
`<对象>?.<方法>()`
```javascript
// 安全调用方法
let result = obj?.method();
```

---

**基本写法：空值合并**
`<值1> ?? <值2>`
```javascript
// 左侧为 null 或 undefined 时返回右侧
let value = a ?? b;
```

---

## 其他特性

**基本写法：BigInt**
`<数字>n`
```javascript
// 创建大整数
let big = 9007199254740991n;
```

---

**基本写法：globalThis**
`globalThis`
```javascript
// 访问全局对象
globalThis.variable = 10;
```

---

**基本写法：数值分隔符**
`<数字>_<数字>`
```javascript
// 使用下划线分隔数字提高可读性
let num = 1_000_000;
```

---

**基本写法：Array.flat**
`<数组>.flat(<深度>)`
```javascript
// 展平嵌套数组
let flat = [1, [2, [3]]].flat(Infinity);
```

---

**基本写法：Object.fromEntries**
`Object.fromEntries(<键值对数组>)`
```javascript
// 将键值对数组转换为对象
let obj = Object.fromEntries([["a", 1], ["b", 2]]);
```

---

**基本写法：String.trimStart**
`<字符串>.trimStart()`
```javascript
// 去除字符串开头空白
let trimmed = " hello".trimStart();
```

---

**基本写法：String.trimEnd**
`<字符串>.trimEnd()`
```javascript
// 去除字符串结尾空白
let trimmed = "hello ".trimEnd();
```

---

## ES2024+ 新特性

**基本写法：Object.groupBy 分组**
`Object.groupBy(<数组>, <回调函数>)`
```javascript
// 按回调返回的键对数组元素分组返回普通对象
let grouped = Object.groupBy([6, 7, 8, 9], n => n % 2 === 0 ? "even" : "odd");
```

---

**基本写法：Map.groupBy 分组**
`Map.groupBy(<数组>, <回调函数>)`
```javascript
// 返回 Map 实例键可以是任意类型不只是字符串
let grouped = Map.groupBy(users, u => u.role);
```

---

**基本写法：Promise.withResolvers 构造器**
`Promise.withResolvers()`
```javascript
// ES2024 新增在外部获取 resolve 和 reject 函数
const { promise, resolve, reject } = Promise.withResolvers();
```

---

**基本写法：ArrayBuffer resize 调整大小**
`<buffer>.resize(<新长度>)`
```javascript
// 调整 ArrayBuffer 大小需 maxByteLength 配置
let buffer = new ArrayBuffer(8, { maxByteLength: 16 });
buffer.resize(12);
```

---

**基本写法：ArrayBuffer transfer 转移所有权**
`<buffer>.transfer([<新长度>])`
```javascript
// 转移 ArrayBuffer 所有权原对象变为 detached 状态
let detached = buffer.transfer(16);
```

---

**基本写法：Atomics.waitAsync 异步等待**
`Atomics.waitAsync(<Int32Array>, <索引>, <值>)`
```javascript
// 异步等待共享内存值变化不阻塞主线程
let result = Atomics.waitAsync(int32, 0, 0);
result.value.then(() => {});
```

---

**基本写法：RegExp v 标志与集合操作**
`/<模式>/v`
```javascript
// v 标志支持集合操作与 Unicode 属性字符串
let pattern = /[\p{Letter}&&\p{ASCII}]/v;
```

---

**基本写法：String.prototype.isWellFormed 检查**
`<字符串>.isWellFormed()`
```javascript
// 检查字符串是否为合法 Unicode 无单独代理项
let ok = "hello".isWellFormed();
```

---

**基本写法：Iterator.prototype.map/filter/take/drop 链式操作**
`<iterator>.map(<回调>).filter(<条件>).take(<数量>).drop(<数量>)`
```javascript
// 迭代器链式操作不创建中间数组惰性求值
let result = [1, 2, 3, 4, 5].values()
    .map(x => x * 2)
    .filter(x => x > 4)
    .drop(1)
    .take(2);
```

---

**基本写法：Iterator.prototype.toArray 转数组**
`<iterator>.toArray()`
```javascript
// 将迭代器消费为数组终结链式操作
let arr = [1, 2, 3].values().map(x => x * 2).toArray();
```

---

**基本写法：Set.prototype.union/intersection/difference 集合操作**
`<set>.union(<其他>) | <set>.intersection(<其他>) | <set>.difference(<其他>)`
```javascript
// 返回新 Set 不修改原 Set
let u = a.union(b);
let i = a.intersection(b);
let d = a.difference(b);
```

---

**基本写法：Set.prototype.isSubsetOf/isSupersetOf/isDisjointFrom**
`<set>.isSubsetOf(<其他>) | <set>.isSupersetOf(<其他>) | <set>.isDisjointFrom(<其他>)`
```javascript
// 返回布尔值判断 Set 间关系
let isSub = a.isSubsetOf(b);
let isSuper = a.isSupersetOf(b);
let isDisjoint = a.isDisjointFrom(b);
```

---

**基本写法：Promise.try 同步函数包装为 Promise**
`Promise.try(<函数>)`
```javascript
// 将同步或异步函数调用统一包装为 Promise
let p = Promise.try(() => fetch("/api"));
```

---

**基本写法：import attributes 加载 JSON 模块**
`import <内容> from "<模块>" with { type: "json" }`
```javascript
// 使用 import attributes 显式声明模块类型
import config from "./config.json" with { type: "json" };
```

---

**基本写法：Float16Array 半精度浮点数组**
`new Float16Array([<元素>])`
```javascript
// 创建半精度浮点数组节省内存适合机器学习
let arr = new Float16Array([1.0, 2.5, 3.14]);
```

---

**基本写法：using 与 await using 显式资源管理**
`using <变量> = <资源> | await using <变量> = <异步资源>`
```javascript
// 资源在作用域结束时自动调用 Symbol.dispose 或 Symbol.asyncDispose
{
    using handle = createResource();
    await using conn = await getConnection();
}
```

---

**基本写法：RegExp.escape 转义**
`RegExp.escape(<字符串>)`
```javascript
// 转义字符串中的正则特殊字符用于安全构建正则
let escaped = RegExp.escape("a.b*c");
```
