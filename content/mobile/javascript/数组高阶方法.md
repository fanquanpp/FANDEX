# JavaScript 数组高阶方法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## map 方法

**基本写法：map 转换元素**
`<数组>.map(<回调函数>)`
```javascript
// 将数组元素转换为新值
let doubled = numbers.map(n => n * 2);
```

---

**基本写法：map 提取属性**
`<数组>.map(<回调函数>)`
```javascript
// 从对象数组提取属性
let names = users.map(user => user.name);
```

---

**基本写法：map 带索引**
`<数组>.map((<元素>, <索引>) => <表达式>)`
```javascript
// map 回调函数使用索引
let indexed = numbers.map((n, i) => `${i}: ${n}`);
```

---

## filter 方法

**基本写法：filter 过滤**
`<数组>.filter(<条件函数>)`
```javascript
// 过滤满足条件的元素
let evens = numbers.filter(n => n % 2 === 0);
```

---

**基本写法：filter 过滤对象**
`<数组>.filter(<条件函数>)`
```javascript
// 过滤对象数组
let adults = users.filter(user => user.age >= 18);
```

---

**基本写法：filter 去重**
`<数组>.filter((<元素>, <索引>, <数组>) => <条件>)`
```javascript
// 使用 filter 去重
let unique = arr.filter((item, index, array) => array.indexOf(item) === index);
```

---

## reduce 方法

**基本写法：reduce 求和**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 计算数组元素总和
let sum = numbers.reduce((acc, n) => acc + n, 0);
```

---

**基本写法：reduce 求最大值**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>)`
```javascript
// 查找数组最大值
let max = numbers.reduce((a, b) => Math.max(a, b));
```

---

**基本写法：reduce 计数**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 统计元素出现次数
let count = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
}, {});
```

---

**基本写法：reduce 数组转对象**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 将数组转换为对象
let obj = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
}, {});
```

---

## find 方法

**基本写法：find 查找元素**
`<数组>.find(<条件函数>)`
```javascript
// 查找第一个满足条件的元素
let user = users.find(u => u.age > 18);
```

---

**基本写法：findIndex 查找索引**
`<数组>.findIndex(<条件函数>)`
```javascript
// 查找第一个满足条件的元素索引
let index = users.findIndex(u => u.age > 18);
```

---

## some 方法

**基本写法：some 判断存在**
`<数组>.some(<条件函数>)`
```javascript
// 判断是否有元素满足条件
let hasAdult = users.some(u => u.age >= 18);
```

---

## every 方法

**基本写法：every 判断全部**
`<数组>.every(<条件函数>)`
```javascript
// 判断是否所有元素都满足条件
let allAdult = users.every(u => u.age >= 18);
```

---

## flat 方法

**基本写法：flat 展平一层**
`<数组>.flat()`
```javascript
// 展平数组一层
let flat = [1, [2, 3], [4]].flat();
```

---

**基本写法：flat 展平多层**
`<数组>.flat(<深度>)`
```javascript
// 展平数组指定深度
let flat = [1, [2, [3, [4]]]].flat(Infinity);
```

---

## flatMap 方法

**基本写法：flatMap 映射并展平**
`<数组>.flatMap(<回调函数>)`
```javascript
// 先映射再展平一层
let result = numbers.flatMap(n => [n, n * 2]);
```

---

## sort 方法

**基本写法：sort 数字升序**
`<数组>.sort((<a>, <b>) => <a> - <b>)`
```javascript
// 数字升序排序
numbers.sort((a, b) => a - b);
```

---

**基本写法：sort 数字降序**
`<数组>.sort((<a>, <b>) => <b> - <a>)`
```javascript
// 数字降序排序
numbers.sort((a, b) => b - a);
```

---

**基本写法：sort 对象数组**
`<数组>.sort((<a>, <b>) => <a>.<属性> - <b>.<属性>)`
```javascript
// 按对象属性排序
users.sort((a, b) => a.age - b.age);
```

---

## 链式调用

**基本写法：filter 链 map**
`<数组>.filter(<条件>).map(<映射>)`
```javascript
// 过滤后映射
let names = users.filter(u => u.age >= 18).map(u => u.name);
```

---

**基本写法：map 链 filter**
`<数组>.map(<映射>).filter(<条件>)`
```javascript
// 映射后过滤
let evens = numbers.map(n => n * 2).filter(n => n > 10);
```

---

**基本写法：filter 链 reduce**
`<数组>.filter(<条件>).reduce(<累加>, <初始值>)`
```javascript
// 过滤后求和
let sum = numbers.filter(n => n > 0).reduce((acc, n) => acc + n, 0);
```

---

**换行写法：多方法链式**
`<数组>.filter(<条件>).map(<映射>).reduce(<累加>, <初始值>)`
```javascript
// 多方法链式调用换行书写
let result = numbers
    .filter(n => n > 0)
    .map(n => n * 2)
    .reduce((acc, n) => acc + n, 0);
```

---

## 其他高阶方法

**基本写法：fill 填充**
`<数组>.fill(<值>, <起始>, <结束>)`
```javascript
// 用指定值填充数组
let arr = new Array(5).fill(0);
```

---

**基本写法：copyWithin**
`<数组>.copyWithin(<目标位置>, <起始>, <结束>)`
```javascript
// 数组内部复制
[1, 2, 3, 4, 5].copyWithin(0, 3);
```

---

**基本写法：at 访问**
`<数组>.at(<索引>)`
```javascript
// 使用 at 方法访问元素支持负索引
let last = numbers.at(-1);
```

---

## 数组判断

**基本写法：Array.isArray**
`Array.isArray(<变量>)`
```javascript
// 判断变量是否为数组
let isArray = Array.isArray(numbers);
```

---

**基本写法：includes 判断**
`<数组>.includes(<元素>)`
```javascript
// 判断数组是否包含元素
let has = numbers.includes(3);
```

---

## 数组转换

**基本写法：join 转字符串**
`<数组>.join("<分隔符>")`
```javascript
// 将数组连接为字符串
let str = numbers.join(", ");
```

---

**基本写法：toString**
`<数组>.toString()`
```javascript
// 数组转字符串默认逗号分隔
let str = numbers.toString();
```

---

**基本写法：entries 获取迭代器**
`<数组>.entries()`
```javascript
// 获取键值对迭代器
let entries = numbers.entries();
```

---

**基本写法：keys 获取键迭代器**
`<数组>.keys()`
```javascript
// 获取键索引迭代器
let keys = numbers.keys();
```

---

**基本写法：values 获取值迭代器**
`<数组>.values()`
```javascript
// 获取值迭代器
let values = numbers.values();
```

---

## ES2025 Iterator Helpers

**基本写法：Iterator.map 链式映射**
`<iterator>.map(<回调函数>)`
```javascript
// 迭代器映射元素不创建中间数组惰性求值
let iter = [1, 2, 3].values().map(x => x * 2);
```

---

**基本写法：Iterator.filter 链式过滤**
`<iterator>.filter(<条件函数>)`
```javascript
// 迭代器过滤满足条件的元素
let iter = [1, 2, 3, 4].values().filter(x => x % 2 === 0);
```

---

**基本写法：Iterator.take 取前 N 个**
`<iterator>.take(<数量>)`
```javascript
// 从迭代器取前 N 个元素后停止迭代
let iter = [1, 2, 3, 4].values().take(2);
```

---

**基本写法：Iterator.drop 跳过前 N 个**
`<iterator>.drop(<数量>)`
```javascript
// 跳过迭代器前 N 个元素返回剩余元素
let iter = [1, 2, 3, 4].values().drop(2);
```

---

**基本写法：Iterator.toArray 转数组**
`<iterator>.toArray()`
```javascript
// 将迭代器消费为数组终结链式操作
let arr = [1, 2, 3].values().map(x => x * 2).toArray();
```
