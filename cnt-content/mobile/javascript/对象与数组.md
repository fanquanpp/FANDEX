# JavaScript 对象与数组

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 对象创建

**基本写法：对象字面量**
`let <变量> = { <键>: <值> };`
```javascript
// 使用字面量创建对象
let user = { name: "Alice", age: 25 };
```

---

**基本写法：new Object 创建**
`let <变量> = new Object();`
```javascript
// 使用 new Object 创建对象
let user = new Object();
```

---

**基本写法：构造函数创建**
`function <构造函数>(<参数>) { this.<属性> = <参数>; }`
```javascript
// 定义构造函数
function Person(name, age) {
    this.name = name;
    this.age = age;
}
```

---

**基本写法：使用构造函数**
`let <变量> = new <构造函数>(<参数>);`
```javascript
// 通过构造函数创建对象
let p = new Person("Alice", 25);
```

---

**基本写法：Object.create**
`let <变量> = Object.create(<原型>);`
```javascript
// 以指定原型创建对象
let child = Object.create(parent);
```

---

## 对象属性

**基本写法：点访问属性**
`<对象>.<属性>`
```javascript
// 使用点号访问属性
let name = user.name;
```

---

**基本写法：方括号访问属性**
`<对象>["<属性>"]`
```javascript
// 使用方括号访问属性
let name = user["name"];
```

---

**基本写法：设置属性**
`<对象>.<属性> = <值>;`
```javascript
// 设置对象属性值
user.age = 26;
```

---

**基本写法：删除属性**
`delete <对象>.<属性>`
```javascript
// 删除对象属性
delete user.age;
```

---

**基本写法：检查属性存在**
`"<属性>" in <对象>`
```javascript
// 检查属性是否存在于对象中
let has = "name" in user;
```

---

**基本写法：hasOwnProperty**
`<对象>.hasOwnProperty("<属性>")`
```javascript
// 检查对象自身是否包含属性
let has = user.hasOwnProperty("name");
```

---

## 对象方法

**基本写法：方法简写**
`let <对象> = { <方法名>() { } };`
```javascript
// 对象方法简写
let user = {
    greet() {
    }
};
```

---

**基本写法：计算属性名**
`let <对象> = { [<表达式>]: <值> };`
```javascript
// 使用表达式作为属性名
let key = "dynamic";
let obj = { [key]: "value" };
```

---

## 对象遍历

**基本写法：for-in 遍历**
`for (let <键> in <对象>) { }`
```javascript
// 遍历对象的可枚举属性
for (let key in user) {
}
```

---

**基本写法：Object.keys**
`Object.keys(<对象>)`
```javascript
// 获取对象所有键的数组
let keys = Object.keys(user);
```

---

**基本写法：Object.values**
`Object.values(<对象>)`
```javascript
// 获取对象所有值的数组
let values = Object.values(user);
```

---

**基本写法：Object.entries**
`Object.entries(<对象>)`
```javascript
// 获取对象键值对数组
let entries = Object.entries(user);
```

---

## 对象操作

**基本写法：Object.assign**
`Object.assign(<目标>, <源对象>)`
```javascript
// 合并对象到目标对象
Object.assign(target, source);
```

---

**基本写法：展开运算符合并**
`let <结果> = { ...<对象1>, ...<对象2> };`
```javascript
// 使用展开运算符合并对象
let merged = { ...obj1, ...obj2 };
```

---

**基本写法：对象解构**
`let { <属性1>, <属性2> } = <对象>;`
```javascript
// 解构对象属性到变量
let { name, age } = user;
```

---

**基本写法：重命名解构**
`let { <属性>: <新名> } = <对象>;`
```javascript
// 解构时重命名变量
let { name: userName } = user;
```

---

**基本写法：默认值解构**
`let { <属性> = <默认值> } = <对象>;`
```javascript
// 解构时设置默认值
let { name = "Unknown" } = user;
```

---

**基本写法：嵌套解构**
`let { <对象>: { <属性> } } = <对象>;`
```javascript
// 解构嵌套对象
let { address: { city } } = user;
```

---

## 对象保护

**基本写法：Object.freeze**
`Object.freeze(<对象>)`
```javascript
// 冻结对象不可修改
Object.freeze(user);
```

---

**基本写法：Object.seal**
`Object.seal(<对象>)`
```javascript
// 密封对象不可增删属性
Object.seal(user);
```

---

**基本写法：Object.preventExtensions**
`Object.preventExtensions(<对象>)`
```javascript
// 阻止对象扩展
Object.preventExtensions(user);
```

---

## 数组创建

**基本写法：数组字面量**
`let <变量> = [ <元素1>, <元素2> ];`
```javascript
// 使用字面量创建数组
let numbers = [1, 2, 3];
```

---

**基本写法：new Array 创建**
`let <变量> = new Array(<长度>);`
```javascript
// 创建指定长度的空数组
let arr = new Array(5);
```

---

**基本写法：Array.of**
`Array.of(<元素1>, <元素2>)`
```javascript
// 创建包含指定元素的数组
let arr = Array.of(1, 2, 3);
```

---

**基本写法：Array.from**
`Array.from(<可迭代对象>)`
```javascript
// 从可迭代对象创建数组
let arr = Array.from("hello");
```

---

## 数组访问

**基本写法：索引访问**
`<数组>[<索引>]`
```javascript
// 通过索引获取元素
let first = numbers[0];
```

---

**基本写法：修改元素**
`<数组>[<索引>] = <值>;`
```javascript
// 修改指定索引的元素
numbers[0] = 100;
```

---

**基本写法：获取长度**
`<数组>.length`
```javascript
// 获取数组长度
let len = numbers.length;
```

---

## 数组方法

**基本写法：push 添加末尾**
`<数组>.push(<元素>)`
```javascript
// 向数组末尾添加元素
numbers.push(4);
```

---

**基本写法：pop 删除末尾**
`<数组>.pop()`
```javascript
// 删除并返回数组末尾元素
let last = numbers.pop();
```

---

**基本写法：unshift 添加头部**
`<数组>.unshift(<元素>)`
```javascript
// 向数组头部添加元素
numbers.unshift(0);
```

---

**基本写法：shift 删除头部**
`<数组>.shift()`
```javascript
// 删除并返回数组头部元素
let first = numbers.shift();
```

---

**基本写法：splice 删除**
`<数组>.splice(<起始>, <数量>)`
```javascript
// 删除指定位置的元素
numbers.splice(1, 2);
```

---

**基本写法：splice 插入**
`<数组>.splice(<位置>, 0, <元素>)`
```javascript
// 在指定位置插入元素
numbers.splice(1, 0, "new");
```

---

**基本写法：slice 截取**
`<数组>.slice(<起始>, <结束>)`
```javascript
// 截取数组指定范围返回新数组
let part = numbers.slice(1, 3);
```

---

**基本写法：concat 合并**
`<数组>.concat(<其他数组>)`
```javascript
// 合并多个数组
let combined = arr1.concat(arr2);
```

---

**基本写法：indexOf 查找**
`<数组>.indexOf(<元素>)`
```javascript
// 查找元素首次出现的索引
let index = numbers.indexOf(3);
```

---

**基本写法：includes 包含**
`<数组>.includes(<元素>)`
```javascript
// 判断数组是否包含元素
let has = numbers.includes(3);
```

---

**基本写法：join 转字符串**
`<数组>.join("<分隔符>")`
```javascript
// 将数组元素连接为字符串
let str = numbers.join(",");
```

---

**基本写法：reverse 反转**
`<数组>.reverse()`
```javascript
// 反转数组元素顺序
numbers.reverse();
```

---

**基本写法：sort 排序**
`<数组>.sort()`
```javascript
// 对数组进行排序
numbers.sort();
```

---

**基本写法：自定义排序**
`<数组>.sort(<比较函数>)`
```javascript
// 使用比较函数排序
numbers.sort((a, b) => a - b);
```

---

## 数组遍历

**基本写法：for 循环遍历**
`for (let i = 0; i < <数组>.length; i++) { }`
```javascript
// 使用索引遍历数组
for (let i = 0; i < numbers.length; i++) {
}
```

---

**基本写法：for-of 遍历**
`for (let <元素> of <数组>) { }`
```javascript
// 遍历数组元素
for (let num of numbers) {
}
```

---

**基本写法：forEach 遍历**
`<数组>.forEach(<回调函数>)`
```javascript
// 使用 forEach 遍历数组
numbers.forEach((num) => {
});
```

---

## 数组解构

**基本写法：数组解构**
`let [ <变量1>, <变量2> ] = <数组>;`
```javascript
// 解构数组元素到变量
let [first, second] = numbers;
```

---

**基本写法：跳过元素**
`let [, <变量2>] = <数组>;`
```javascript
// 解构时跳过某些元素
let [, second] = numbers;
```

---

**基本写法：剩余元素**
`let [ <变量1>, ...<剩余> ] = <数组>;`
```javascript
// 解构剩余元素到数组
let [first, ...rest] = numbers;
```

---

**基本写法：默认值解构**
`let [ <变量> = <默认值> ] = <数组>;`
```javascript
// 解构时设置默认值
let [a = 0, b = 0] = numbers;
```

---

## 二维数组

**基本写法：创建二维数组**
`let <数组> = [[<元素>], [<元素>]];`
```javascript
// 创建二维数组
let matrix = [[1, 2], [3, 4]];
```

---

**基本写法：访问二维数组**
`<数组>[<行>][<列>]`
```javascript
// 获取二维数组元素
let element = matrix[0][1];
```

---

**基本写法：遍历二维数组**
`for (let i = 0; i < <数组>.length; i++) { for (let j = 0; j < <数组>[i].length; j++) { } }`
```javascript
// 嵌套循环遍历二维数组
for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
    }
}
```

---

## ES2024+ 对象数组新方法

**基本写法：Object.groupBy 分组**
`Object.groupBy(<数组>, <回调函数>)`
```javascript
// 按回调返回的键对数组分组返回普通对象
let grouped = Object.groupBy([1, 2, 3, 4], n => n % 2 === 0 ? "even" : "odd");
```

---

**基本写法：Map.groupBy 分组**
`Map.groupBy(<数组>, <回调函数>)`
```javascript
// 返回 Map 实例键可以是任意类型不只是字符串
let grouped = Map.groupBy(users, u => u.role);
```

---

**基本写法：Object.hasOwn 检查自身属性**
`Object.hasOwn(<对象>, "<属性>")`
```javascript
// ES2022 新增替代 hasOwnProperty 更安全不会被原型链覆盖
let has = Object.hasOwn(user, "name");
```

---

**基本写法：structuredClone 深拷贝**
`structuredClone(<对象>)`
```javascript
// 结构化克隆算法深拷贝支持循环引用与 Date 等内置类型
let copy = structuredClone(original);
```
