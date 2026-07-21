# JavaScript 控制流

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## if-else 语句

**基本写法：if 语句**
`if (<条件>) { }`
```javascript
// 条件为真时执行
if (score >= 90) {
}
```

---

**基本写法：if-else 语句**
`if (<条件>) { } else { }`
```javascript
// 条件为真执行 if 块否则执行 else 块
if (score >= 60) {
} else {
}
```

---

**换行写法：if-else if-else 链**
`if (<条件>) { } else if (<条件>) { } else { }`
```javascript
// 多条件分支判断
if (score >= 90) {
} else if (score >= 80) {
} else if (score >= 60) {
} else {
}
```

---

**基本写法：嵌套 if**
`if (<条件>) { if (<条件>) { } else { } }`
```javascript
// if 语句内部嵌套 if
if (score >= 90) {
    if (score >= 95) {
    } else {
    }
}
```

---

**基本写法：卫语句提前返回**
`if (<条件>) { return; }`
```javascript
// 条件不满足时提前返回
if (order == null) {
    return;
}
```

---

## switch 语句

**基本写法：传统 switch**
`switch (<表达式>) { case <值>: break; default: }`
```javascript
// 传统 switch 多分支
switch (day) {
    case 1:
        break;
    case 2:
        break;
    default:
}
```

---

**基本写法：switch case 穿透**
`case <值1>: case <值2>: <语句>; break;`
```javascript
// 多个 case 共享同一处理
switch (day) {
    case 1:
    case 2:
    case 3:
        console.log("Weekday");
        break;
    default:
}
```

---

## for 循环

**基本写法：标准 for 循环**
`for (<初始化>; <条件>; <更新>) { }`
```javascript
// 已知次数的循环
for (let i = 0; i < 10; i++) {
}
```

---

**基本写法：for-in 遍历对象**
`for (let <键> in <对象>) { }`
```javascript
// 遍历对象的可枚举属性
for (let key in obj) {
}
```

---

**基本写法：for-of 遍历可迭代对象**
`for (let <元素> of <可迭代对象>) { }`
```javascript
// 遍历数组元素
for (let item of array) {
}
```

---

**基本写法：for-of 带索引**
`for (let [<索引>, <元素>] of <数组>.entries()) { }`
```javascript
// 遍历数组同时获取索引和元素
for (let [index, item] of array.entries()) {
}
```

---

## while 循环

**基本写法：while 循环**
`while (<条件>) { }`
```javascript
// 先判断后执行
let i = 0;
while (i < 10) {
    i++;
}
```

---

## do-while 循环

**基本写法：do-while 循环**
`do { } while (<条件>);`
```javascript
// 先执行后判断至少执行一次
let i = 0;
do {
    i++;
} while (i < 10);
```

---

## 循环控制

**基本写法：break 语句**
`break;`
```javascript
// 跳出当前循环
for (let i = 0; i < 10; i++) {
    if (i === 5) {
        break;
    }
}
```

---

**基本写法：带标签的 break**
`<标签>: for (...) { break <标签>; }`
```javascript
// 跳出多层循环
outerLoop: for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        if (i * j > 6) {
            break outerLoop;
        }
    }
}
```

---

**基本写法：continue 语句**
`continue;`
```javascript
// 跳过当前迭代
for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
        continue;
    }
}
```

---

**基本写法：带标签的 continue**
`<标签>: for (...) { continue <标签>; }`
```javascript
// 跳过外层循环的当前迭代
outer: for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
        if (j === 1) {
            continue outer;
        }
    }
}
```

---

## 异常处理

**基本写法：try-catch**
`try { } catch (<错误>) { }`
```javascript
// 捕获异常
try {
    JSON.parse(invalidJson);
} catch (error) {
}
```

---

**基本写法：try-catch-finally**
`try { } catch (<错误>) { } finally { }`
```javascript
// finally 块无论是否异常都执行
try {
} catch (error) {
} finally {
}
```

---

**基本写法：throw 抛出错误**
`throw new Error("<消息>");`
```javascript
// 手动抛出错误
throw new Error("Invalid input");
```

---

**基本写法：throw 抛出对象**
`throw { <属性>: <值> };`
```javascript
// 抛出自定义错误对象
throw { code: 400, message: "Bad Request" };
```

---

## return 语句

**基本写法：返回值**
`return <值>;`
```javascript
// 返回计算结果
function add(a, b) {
    return a + b;
}
```

---

**基本写法：无返回值**
`return;`
```javascript
// 提前结束函数
function validate(value) {
    if (value < 0) {
        return;
    }
}
```
