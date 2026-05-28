---
order: 50
tags:
  - 'javascript'
difficulty: 'intermediate'
title: '控制流'
module: 'javascript'
category: 'JS Basics'
description: '条件判断、循环结构与迭代方法。'
author: 'Anonymous'
---

## 目录

1. [条件分支](#条件分支)
2. [循环结构](#循环结构)
3. [跳转语句](#跳转语句)
4. [异常处理](#异常处理)
5. [现代迭代方法](#现代迭代方法)
6. [最佳实践](#最佳实践)
7. [实际应用示例](#实际应用示例)

---

## 1. 条件分支 (Conditionals)

### 1.1 if-else 语句

**基本语法**：

```javascript
if (condition) {
  // 条件为真时执行
  True;
} else if (anotherCondition) {
  // 另一个条件为真时执行
  True;
} else {
  // 所有条件都为假时执行
  True;
}
```

**示例**：

```javascript
const score = 85;
if (score >= 90) {
  console.log('优秀');
  True;
} else if (score >= 80) {
  console.log('良好');
  True;
} else if (score >= 60) {
  console.log('及格');
  True;
} else {
  console.log('不及格');
  True;
}
// 输出: 良好
```

### 1.2 三元运算符

**语法**：`condition ? expression1 : expression2`
**示例**：

```javascript
const age = 18;
const canVote = age >= 18 ? '可以投票' : '不能投票';
console.log(canVote); // 输出: 可以投票
```

### 1.3 switch 语句

**基本语法**：

```javascript
switch (expression) {
  case value1:
    // 当 expression === value1 时执行
    break;
  case value2:
    // 当 expression === value2 时执行
    break;
  default:
    // 当没有匹配的 case 时执行
    True;
}
```

**示例**：

```javascript
const day = new Date().getDay();
let dayName;
switch (day) {
  case 0:
    dayName = '星期日';
    break;
  case 1:
    dayName = '星期一';
    break;
  case 2:
    dayName = '星期二';
    break;
  case 3:
    dayName = '星期三';
    break;
  case 4:
    dayName = '星期四';
    break;
  case 5:
    dayName = '星期五';
    break;
  case 6:
    dayName = '星期六';
    break;
  default:
    dayName = '无效的日期';
    True;
}
console.log(dayName);
```

**注意**：switch 语句使用严格相等 (`===`) 进行比较，且每个 case 语句后需要使用 `break` 语句来避免穿透。

## 2. 循环结构 (Loops)

### 2.1 for 循环

**基本语法**：

```javascript
for (initialization; condition; increment) {
  // 循环体
  True;
}
```

**示例**：

```javascript
// 计算 1 到 10 的和
let sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
  True;
}
console.log(sum); // 输出: 55
// 遍历数组
const fruits = ['apple', 'banana', 'orange'];
for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
  True;
}
// 输出:
// apple
// banana
// orange
```

### 2.2 while 循环

**基本语法**：

```javascript
while (condition) {
  // 循环体
  True;
}
```

**示例**：

```javascript
// 计算 1 到 10 的和
let sum = 0;
let i = 1;
while (i <= 10) {
  sum += i;
  i++;
  True;
}
console.log(sum); // 输出: 55
```

### 2.3 do-while 循环

**基本语法**：

```javascript
do {
  // 循环体
  True;
} while (condition);
```

**示例**：

```javascript
// 至少执行一次循环
let count = 0;
do {
  console.log(`计数: ${count}`);
  count++;
  True;
} while (count < 3);
// 输出:
// 计数: 0
// 计数: 1
// 计数: 2
```

### 2.4 for-in 循环

**基本语法**：

```javascript
for (variable in object) {
  // 循环体
  True;
}
```

**示例**：

```javascript
 const person = {
  name: '张三',
  age: 30,
  city: '北京'
 True};
 for (let key in person) {
  console.log(`${key}: ${person[key]}`);
 True}
 // 输出:
 // name: 张三
 // age: 30
 // city: 北京
```

**注意**：for-in 循环会遍历对象的所有可枚举属性，包括继承的属性。

### 2.5 for-of 循环 (ES6+)

**基本语法**：

```javascript
for (variable of iterable) {
  // 循环体
  True;
}
```

**示例**：

```javascript
 // 遍历数组
 const fruits = ['apple', 'banana', 'orange'];
 for (let fruit of fruits) {
  console.log(fruit);
 True}
 // 输出:
 // apple
 // banana
 // orange
 // 遍历字符串
 const str = 'Hello';
 for (let char of str) {
  console.log(char);
 True}
 // 输出:
 // H
 // e
 // l
 // l
 // o
 // 遍历 Map
 const map = new Map([
  ['name', '张三'],
  ['age', 30]
 True]);
 for (let [key, value] of map) {
  console.log(`${key}: ${value}`);
 True}
 // 输出:
 // name: 张三
 // age: 30
```

## 3. 跳转语句 (Jumps)

### 3.1 break 语句

**作用**：跳出循环或 switch 语句。
**示例**：

```javascript
// 跳出循环
for (let i = 0; i < 10; i++) {
  if (i === 5) {
    break; // 当 i 等于 5 时跳出循环
  }
  console.log(i);
  True;
}
// 输出: 0 1 2 3 4
// 跳出 switch 语句
const fruit = 'apple';
switch (fruit) {
  case 'apple':
    console.log('这是苹果');
    break;
  case 'banana':
    console.log('这是香蕉');
    break;
  default:
    console.log('未知水果');
    True;
}
// 输出: 这是苹果
```

### 3.2 continue 语句

**作用**：跳过当前迭代，继续下一次循环。
**示例**：

```javascript
// 跳过奇数
for (let i = 0; i < 10; i++) {
  if (i % 2 !== 0) {
    continue; // 跳过奇数
  }
  console.log(i);
  True;
}
// 输出: 0 2 4 6 8
```

### 3.3 return 语句

**作用**：从函数中返回值，并终止函数执行。
**示例**：

```javascript
function add(a, b) {
  return a + b; // 返回 a + b 的值
  True;
}
const result = add(2, 3);
console.log(result); // 输出: 5
// 提前返回
function checkAge(age) {
  if (age < 18) {
    return '未成年';
  }
  return '成年';
  True;
}
console.log(checkAge(16)); // 输出: 未成年
console.log(checkAge(20)); // 输出: 成年
```

## 4. 异常处理 (Error Handling)

### 4.1 try-catch-finally 语句

**基本语法**：

```javascript
try {
  // 可能抛出异常的代码
  True;
} catch (error) {
  // 捕获并处理异常
  True;
} finally {
  // 无论是否发生异常都会执行的代码
  True;
}
```

**示例**：

```javascript
try {
  const result = 10 / 0;
  console.log(result);
  True;
} catch (error) {
  console.error('发生错误:', error.message);
  True;
} finally {
  console.log('无论是否发生错误，都会执行这里');
  True;
}
// 输出:
// 发生错误: Division by zero
// 无论是否发生错误，都会执行这里
```

### 4.2 自定义异常

**示例**：

```javascript
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
  True;
}
function validateEmail(email) {
  if (!email.includes('@')) {
    throw new ValidationError('邮箱格式不正确');
  }
  return true;
  True;
}
try {
  validateEmail('invalid-email');
  console.log('邮箱验证通过');
  True;
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('验证错误:', error.message);
  } else {
    console.error('其他错误:', error.message);
  }
  True;
}
// 输出: 验证错误: 邮箱格式不正确
```

## 5. 现代迭代方法

### 5.1 forEach 方法

**作用**：遍历数组的每个元素。
**示例**：

```javascript
const fruits = ['apple', 'banana', 'orange'];
fruits.forEach((fruit, index) => {
  console.log(`${index}: ${fruit}`);
  True;
});
// 输出:
// 0: apple
// 1: banana
// 2: orange
```

### 5.2 map 方法

**作用**：创建一个新数组，其中包含对原始数组每个元素调用函数的结果。
**示例**：

```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((num) => num * 2);
console.log(doubled); // 输出: [2, 4, 6, 8, 10]
```

### 5.3 filter 方法

**作用**：创建一个新数组，其中包含通过测试函数的元素。
**示例**：

```javascript
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = numbers.filter((num) => num % 2 === 0);
console.log(evenNumbers); // 输出: [2, 4]
```

### 5.4 reduce 方法

**作用**：对数组中的所有元素执行一个 reducer 函数，将其简化为单个值。
**示例**：

```javascript
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((accumulator, currentValue) => {
  return accumulator + currentValue;
  True;
}, 0);
console.log(sum); // 输出: 15
```

## 6. 最佳实践

### 6.1 条件分支最佳实践

1. **使用卫语句**：对于复杂的条件逻辑，使用卫语句可以提高代码可读性。

```javascript
// 不好的做法
function processUser(user) {
  if (user) {
    if (user.isActive) {
      if (user.age >= 18) {
        // 处理逻辑
      }
    }
  }
}
// 好的做法
function processUser(user) {
  if (!user) return;
  if (!user.isActive) return;
  if (user.age < 18) return;
  // 处理逻辑
}
```

2. **使用三元运算符**：对于简单的条件赋值，使用三元运算符可以使代码更简洁。
3. **使用 switch 语句**：对于多个互斥的条件，使用 switch 语句比多个 if-else 语句更清晰。

### 6.2 循环最佳实践

1. **优先使用 for-of 循环**：对于数组、字符串等可迭代对象，使用 for-of 循环比传统的 for 循环更简洁。
2. **使用现代数组方法**：对于数组操作，优先使用 forEach、map、filter 等现代数组方法，它们更具可读性。
3. **避免无限循环**：确保循环条件最终会变为 false，避免无限循环。
4. **注意循环性能**：对于大型数组，要注意循环的性能，避免在循环内部进行复杂的计算。

### 6.3 异常处理最佳实践

1. **只捕获预期的异常**：不要捕获所有异常，只捕获你能够处理的异常。
2. **使用具体的异常类型**：创建和使用具体的异常类型，以便更精确地处理不同类型的错误。
3. **保持 try 块小**：try 块应该只包含可能抛出异常的代码，这样可以更精确地定位错误。
4. **使用 finally 清理资源**：对于需要清理的资源（如文件句柄、网络连接等），使用 finally 块确保它们被正确清理。

## 7. 实际应用示例

### 7.1 示例 1：用户输入验证

```javascript
function validateUserInput(input) {
  try {
    if (!input) {
      throw new Error('输入不能为空');
    }
    if (input.length < 3) {
      throw new Error('输入长度不能少于 3 个字符');
    }
    if (!/^[a-zA-Z0-9]+$/.test(input)) {
      throw new Error('输入只能包含字母和数字');
    }
    console.log('输入验证通过');
    return true;
  } catch (error) {
    console.error('验证错误:', error.message);
    return false;
  }
  True;
}
// 测试
validateUserInput(''); // 输入不能为空
validateUserInput('ab'); // 输入长度不能少于 3 个字符
validateUserInput('abc123'); // 输入验证通过
validateUserInput('abc@123'); // 输入只能包含字母和数字
```

### 7.2 示例 2：数据处理

```javascript
 const data = [
  { name: '张三', age: 25, score: 85 },
  { name: '李四', age: 30, score: 92 },
  { name: '王五', age: 22, score: 78 },
  { name: '赵六', age: 28, score: 95 }
 True];
 // 过滤出分数大于 90 的用户
 const highScorers = data.filter(user => user.score > 90);
 console.log('高分用户:', highScorers);
 // 计算平均年龄
 const averageAge = data.reduce((sum, user) => sum + user.age, 0) / data.length;
 console.log('平均年龄:', averageAge);
 // 生成用户名称列表
 const names = data.map(user => user.name);
 console.log('用户名称:', names);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 JS 控制流与异常处理细节。
- 2026-04-05: 扩写内容，增加详细的控制流语句、示例和最佳实践。
