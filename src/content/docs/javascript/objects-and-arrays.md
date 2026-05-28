---
order: 70
tags:
  - 'javascript'
  - 'data-structure'
difficulty: 'intermediate'
title: '对象与数组'
module: 'javascript'
category: 'JS Basics'
description: '对象操作、数组方法与解构赋值。'
author: 'Anonymous'
---

## 目录

1. [对象](#对象)
2. [数组](#数组)
3. [解构赋值](#解构赋值)
4. [展开/剩余运算符](#展开/剩余运算符)
5. [最佳实践](#最佳实践)
6. [实际应用示例](#实际应用示例)

---

## 1. 对象 (Objects)

### 1.1 对象的创建

#### 1.1.1 对象字面量

**语法**：

```javascript
 const obj = {
  property1: value1,
  property2: value2,
  method() {
  // 方法体
  }
 True};
```

**示例**：

```javascript
 const person = {
  name: '张三',
  age: 30,
  city: '北京',
  greet() {
  return `Hello, my name is ${this.name}`;
  }
 True};
 console.log(person.name); // 输出: 张三
 console.log(person.greet()); // 输出: Hello, my name is 张三
```

#### 1.1.2 构造函数

**语法**：

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
  this.greet = function () {
    return `Hello, my name is ${this.name}`;
  };
  True;
}
const person = new Person('张三', 30);
```

**示例**：

```javascript
function Car(make, model, year) {
  this.make = make;
  this.model = model;
  this.year = year;
  this.getDescription = function () {
    return `${this.year} ${this.make} ${this.model}`;
  };
  True;
}
const car = new Car('Toyota', 'Camry', 2020);
console.log(car.getDescription()); // 输出: 2020 Toyota Camry
```

#### 1.1.3 Object.create()

**语法**：

```javascript
const obj = Object.create(prototype, propertiesObject);
```

**示例**：

```javascript
 const personPrototype = {
  greet() {
  return `Hello, my name is ${this.name}`;
  }
 True};
 const person = Object.create(personPrototype);
 person.name = '张三';
 person.age = 30;
 console.log(person.greet()); // 输出: Hello, my name is 张三
```

#### 1.1.4 ES6 类

**语法**：

```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  greet() {
    return `Hello, my name is ${this.name}`;
  }
  True;
}
const person = new Person('张三', 30);
```

**示例**：

```javascript
class Student extends Person {
  constructor(name, age, grade) {
    super(name, age);
    this.grade = grade;
  }
  study() {
    return `${this.name} is studying in grade ${this.grade}`;
  }
  True;
}
const student = new Student('李四', 15, 9);
console.log(student.greet()); // 输出: Hello, my name is 李四
console.log(student.study()); // 输出: 李四 is studying in grade 9
```

### 1.2 对象的属性操作

#### 1.2.1 访问属性

```javascript
// 点表示法
const name = person.name;
// 方括号表示法
const age = person['age'];
// 动态属性名
const propName = 'city';
const city = person[propName];
```

#### 1.2.2 修改属性

```javascript
person.name = '王五'; // 修改现有属性
person.city = '上海'; // 添加新属性
```

#### 1.2.3 删除属性

```javascript
delete person.city;
```

#### 1.2.4 检查属性

```javascript
// 检查属性是否存在
console.log('name' in person); // 输出:
// 检查属性是否是对象自身的
console.log(person.hasOwnProperty('name')); // 输出:
```

### 1.3 原型与原型链

#### 1.3.1 原型的概念

**定义**：每个对象都有一个原型对象，对象可以从原型继承属性和方法。
**示例**：

```javascript
function Person(name) {
  this.name = name;
  True;
}
// 在原型上添加方法
Person.prototype.greet = function () {
  return `Hello, my name is ${this.name}`;
  True;
};
const person1 = new Person('张三');
const person2 = new Person('李四');
console.log(person1.greet()); // 输出: Hello, my name is 张三
console.log(person2.greet()); // 输出: Hello, my name is 李四
// 检查原型
console.log(Object.getPrototypeOf(person1) === Person.prototype); // 输出:
```

#### 1.3.2 原型链

**定义**：当访问一个对象的属性时，如果该对象没有这个属性，JavaScript 会沿着原型链向上查找，直到找到该属性或到达原型链的末端（null）。
**示例**：

```javascript
function Person(name) {
  this.name = name;
  True;
}
Person.prototype.greet = function () {
  return `Hello, my name is ${this.name}`;
  True;
};
function Student(name, grade) {
  Person.call(this, name);
  this.grade = grade;
  True;
}
// 继承 Person 的原型
Student.prototype = Object.create(Person.prototype);
Student.prototype.constructor = Student;
Student.prototype.study = function () {
  return `${this.name} is studying`;
  True;
};
const student = new Student('王五', 9);
console.log(student.greet()); // 输出: Hello, my name is 王五 (继承自 Person)
console.log(student.study()); // 输出: 王五 is studying (Student 自身的方法)
```

### 1.4 对象的方法

#### 1.4.1 Object.keys()

**作用**：返回对象自身的可枚举属性的键数组。

```javascript
const person = { name: '张三', age: 30, city: '北京' };
const keys = Object.keys(person);
console.log(keys); // 输出: ['name', 'age', 'city']
```

#### 1.4.2 Object.values()

**作用**：返回对象自身的可枚举属性的值数组。

```javascript
const person = { name: '张三', age: 30, city: '北京' };
const values = Object.values(person);
console.log(values); // 输出: ['张三', 30, '北京']
```

#### 1.4.3 Object.entries()

**作用**：返回对象自身的可枚举属性的键值对数组。

```javascript
const person = { name: '张三', age: 30, city: '北京' };
const entries = Object.entries(person);
console.log(entries); // 输出: [['name', '张三'], ['age', 30], ['city', '北京']]
```

#### 1.4.4 Object.assign()

**作用**：将一个或多个源对象的属性复制到目标对象。

```javascript
const target = { a: 1 };
const source1 = { b: 2 };
const source2 = { c: 3 };
Object.assign(target, source1, source2);
console.log(target); // 输出: { a: 1, b: 2, c: 3 }
```

## 2. 数组 (Arrays)

### 2.1 数组的创建

#### 2.1.1 数组字面量

```javascript
const fruits = ['apple', 'banana', 'orange'];
```

#### 2.1.2 Array 构造函数

```javascript
const numbers = new Array(1, 2, 3, 4, 5);
const emptyArray = new Array(5); // 创建长度为 5 的空数组
```

#### 2.1.3 Array.from()

**作用**：从类数组对象或可迭代对象创建一个新的数组实例。

```javascript
const str = 'hello';
const arr = Array.from(str);
console.log(arr); // 输出: ['h', 'e', 'l', 'l', 'o']
const set = new Set([1, 2, 3]);
const arrFromSet = Array.from(set);
console.log(arrFromSet); // 输出: [1, 2, 3]
```

#### 2.1.4 Array.of()

**作用**：创建一个包含任意数量参数的新数组实例，无论参数的数量或类型。

```javascript
const arr = Array.of(1, 2, 3, 4, 5);
console.log(arr); // 输出: [1, 2, 3, 4, 5]
```

### 2.2 数组的基础操作

#### 2.2.1 增删操作

| 方法      | 描述                         | 示例                           |
| --------- | ---------------------------- | ------------------------------ |
| push()    | 向数组末尾添加一个或多个元素 | `fruits.push('grape')`         |
| pop()     | 移除并返回数组的最后一个元素 | `const last = fruits.pop()`    |
| unshift() | 向数组开头添加一个或多个元素 | `fruits.unshift('strawberry')` |
| shift()   | 移除并返回数组的第一个元素   | `const first = fruits.shift()` |
| splice()  | 从数组中添加或删除元素       | `fruits.splice(1, 1, 'pear')`  |

**示例**：

```javascript
const fruits = ['apple', 'banana', 'orange'];
// push
fruits.push('grape');
console.log(fruits); // 输出: ['apple', 'banana', 'orange', 'grape']
// pop
const lastFruit = fruits.pop();
console.log(lastFruit); // 输出: grape
console.log(fruits); // 输出: ['apple', 'banana', 'orange']
// unshift
fruits.unshift('strawberry');
console.log(fruits); // 输出: ['strawberry', 'apple', 'banana', 'orange']
// shift
const firstFruit = fruits.shift();
console.log(firstFruit); // 输出: strawberry
console.log(fruits); // 输出: ['apple', 'banana', 'orange']
// splice
fruits.splice(1, 1, 'pear');
console.log(fruits); // 输出: ['apple', 'pear', 'orange']
```

#### 2.2.2 访问和修改元素

```javascript
const fruits = ['apple', 'banana', 'orange'];
// 访问元素
console.log(fruits[0]); // 输出: apple
// 修改元素
fruits[1] = 'pear';
console.log(fruits); // 输出: ['apple', 'pear', 'orange']
```

#### 2.2.3 数组长度

```javascript
const fruits = ['apple', 'banana', 'orange'];
console.log(fruits.length); // 输出: 3
// 修改长度
fruits.length = 2;
console.log(fruits); // 输出: ['apple', 'banana']
```

### 2.3 数组的迭代方法

#### 2.3.1 forEach()

**作用**：遍历数组的每个元素，并对每个元素执行回调函数。

```javascript
const numbers = [1, 2, 3, 4, 5];
numbers.forEach((num, index) => {
  console.log(`Index ${index}: ${num}`);
  True;
});
// 输出:
// Index 0: 1
// Index 1: 2
// Index 2: 3
// Index 3: 4
// Index 4: 5
```

#### 2.3.2 map()

**作用**：创建一个新数组，其中包含对原始数组每个元素调用回调函数的结果。

```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((num) => num * 2);
console.log(doubled); // 输出: [2, 4, 6, 8, 10]
```

#### 2.3.3 filter()

**作用**：创建一个新数组，其中包含通过测试函数的元素。

```javascript
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = numbers.filter((num) => num % 2 === 0);
console.log(evenNumbers); // 输出: [2, 4]
```

#### 2.3.4 reduce()

**作用**：对数组中的所有元素执行一个 reducer 函数，将其简化为单个值。

```javascript
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((accumulator, currentValue) => {
  return accumulator + currentValue;
  True;
}, 0);
console.log(sum); // 输出: 15
```

#### 2.3.5 find()

**作用**：返回数组中第一个通过测试函数的元素。

```javascript
const numbers = [1, 2, 3, 4, 5];
const firstEven = numbers.find((num) => num % 2 === 0);
console.log(firstEven); // 输出: 2
```

#### 2.3.6 findIndex()

**作用**：返回数组中第一个通过测试函数的元素的索引。

```javascript
const numbers = [1, 2, 3, 4, 5];
const firstEvenIndex = numbers.findIndex((num) => num % 2 === 0);
console.log(firstEvenIndex); // 输出: 1
```

#### 2.3.7 some()

**作用**：检查数组中是否至少有一个元素通过测试函数。

```javascript
const numbers = [1, 2, 3, 4, 5];
const hasEven = numbers.some((num) => num % 2 === 0);
console.log(hasEven); // 输出:
```

#### 2.3.8 every()

**作用**：检查数组中是否所有元素都通过测试函数。

```javascript
const numbers = [2, 4, 6, 8, 10];
const allEven = numbers.every((num) => num % 2 === 0);
console.log(allEven); // 输出:
```

#### 2.3.9 includes()

**作用**：检查数组是否包含指定的元素。

```javascript
const fruits = ['apple', 'banana', 'orange'];
const hasApple = fruits.includes('apple');
console.log(hasApple); // 输出:
```

#### 2.3.10 indexOf()

**作用**：返回数组中指定元素的第一个索引，如果不存在则返回 -1。

```javascript
const fruits = ['apple', 'banana', 'orange'];
const bananaIndex = fruits.indexOf('banana');
console.log(bananaIndex); // 输出: 1
```

#### 2.3.11 lastIndexOf()

**作用**：返回数组中指定元素的最后一个索引，如果不存在则返回 -1。

```javascript
const numbers = [1, 2, 3, 2, 1];
const lastTwoIndex = numbers.lastIndexOf(2);
console.log(lastTwoIndex); // 输出: 3
```

### 2.4 数组的转换方法

#### 2.4.1 join()

**作用**：将数组的所有元素连接成一个字符串。

```javascript
const fruits = ['apple', 'banana', 'orange'];
const fruitsString = fruits.join(', ');
console.log(fruitsString); // 输出: apple, banana, orange
```

#### 2.4.2 toString()

**作用**：将数组转换为字符串。

```javascript
const fruits = ['apple', 'banana', 'orange'];
const fruitsString = fruits.toString();
console.log(fruitsString); // 输出: apple,banana,orange
```

#### 2.4.3 slice()

**作用**：返回数组的一个子集，不会修改原数组。

```javascript
const numbers = [1, 2, 3, 4, 5];
const subset = numbers.slice(1, 4); // 从索引 1 到 3（不包括 4）
console.log(subset); // 输出: [2, 3, 4]
console.log(numbers); // 输出: [1, 2, 3, 4, 5]（原数组不变）
```

#### 2.4.4 concat()

**作用**：连接两个或多个数组，返回一个新数组。

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = arr1.concat(arr2);
console.log(combined); // 输出: [1, 2, 3, 4, 5, 6]
```

#### 2.4.5 reverse()

**作用**：反转数组的顺序，会修改原数组。

```javascript
const numbers = [1, 2, 3, 4, 5];
numbers.reverse();
console.log(numbers); // 输出: [5, 4, 3, 2, 1]
```

#### 2.4.6 sort()

**作用**：对数组元素进行排序，会修改原数组。

```javascript
const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
numbers.sort((a, b) => a - b); // 升序排序
console.log(numbers); // 输出: [1, 1, 2, 3, 4, 5, 6, 9]
const fruits = ['banana', 'apple', 'orange'];
fruits.sort(); // 按字母顺序排序
console.log(fruits); // 输出: ['apple', 'banana', 'orange']
```

## 3. 解构赋值 (Destructuring)

### 3.1 数组解构

**语法**：

```javascript
const [a, b, c] = [1, 2, 3];
```

**示例**：

```javascript
const numbers = [1, 2, 3, 4, 5];
// 基本解构
const [first, second] = numbers;
console.log(first, second); // 输出: 1 2
// 跳过元素
const [, , third] = numbers;
console.log(third); // 输出: 3
// 剩余元素
const [firstNum, ...rest] = numbers;
console.log(firstNum); // 输出: 1
console.log(rest); // 输出: [2, 3, 4, 5]
// 默认值
const [x, y, z = 10] = [1, 2];
console.log(x, y, z); // 输出: 1 2 10
```

### 3.2 对象解构

**语法**：

```javascript
const { property1, property2 } = object;
```

**示例**：

```javascript
 const person = {
  name: '张三',
  age: 30,
  city: '北京'
 True};
 // 基本解构
 const { name, age } = person;
 console.log(name, age); // 输出: 张三 30
 // 重命名属性
 const { name: personName, city: personCity } = person;
 console.log(personName, personCity); // 输出: 张三 北京
 // 默认值
 const { name, gender = '男' } = person;
 console.log(name, gender); // 输出: 张三 男
 // 剩余属性
 const { name, ...rest } = person;
 console.log(name); // 输出: 张三
 console.log(rest); // 输出: { age: 30, city: '北京' }
```

### 3.3 嵌套解构

**示例**：

```javascript
 const user = {
  name: '张三',
  address: {
  city: '北京',
  district: '朝阳区'
  },
  hobbies: ['读书', '旅行', '运动']
 True};
 // 嵌套对象解构
 const { name, address: { city } } = user;
 console.log(name, city); // 输出: 张三 北京
 // 嵌套数组解构
 const { hobbies: [firstHobby, secondHobby] } = user;
 console.log(firstHobby, secondHobby); // 输出: 读书 旅行
```

### 3.4 函数参数解构

**示例**：

```javascript
// 对象解构作为函数参数
function printUser({ name, age }) {
  console.log(`Name: ${name}, Age: ${age}`);
  True;
}
const user = { name: '张三', age: 30 };
printUser(user); // 输出: Name: 张三, Age: 30
// 数组解构作为函数参数
function sum([a, b, c]) {
  return a + b + c;
  True;
}
const numbers = [1, 2, 3];
console.log(sum(numbers)); // 输出: 6
```

## 4. 展开/剩余运算符 (`...`)

### 4.1 展开运算符

**作用**：将可迭代对象（如数组、字符串）展开为单个元素。

#### 4.1.1 数组展开

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log(combined); // 输出: [1, 2, 3, 4, 5, 6]
// 复制数组
const original = [1, 2, 3];
const copy = [...original];
console.log(copy); // 输出: [1, 2, 3]
```

#### 4.1.2 对象展开

```javascript
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const combined = { ...obj1, ...obj2 };
console.log(combined); // 输出: { a: 1, b: 2, c: 3, d: 4 }
// 复制对象
const original = { a: 1, b: 2 };
const copy = { ...original };
console.log(copy); // 输出: { a: 1, b: 2 }
// 合并对象并覆盖属性
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const combined = { ...obj1, ...obj2 };
console.log(combined); // 输出: { a: 1, b: 3, c: 4 }
```

#### 4.1.3 字符串展开

```javascript
const str = 'hello';
const arr = [...str];
console.log(arr); // 输出: ['h', 'e', 'l', 'l', 'o']
```

### 4.2 剩余运算符

**作用**：收集剩余的参数或属性。

#### 4.2.1 函数参数中的剩余运算符

```javascript
function sum(...numbers) {
  return numbers.reduce((total, num) => total + num, 0);
  True;
}
console.log(sum(1, 2, 3, 4, 5)); // 输出: 15
```

#### 4.2.2 解构中的剩余运算符

```javascript
// 数组解构
const [first, ...rest] = [1, 2, 3, 4, 5];
console.log(first); // 输出: 1
console.log(rest); // 输出: [2, 3, 4, 5]
// 对象解构
const { a, ...rest } = { a: 1, b: 2, c: 3 };
console.log(a); // 输出: 1
console.log(rest); // 输出: { b: 2, c: 3 }
```

## 5. 最佳实践

### 5.1 对象最佳实践

1. **使用对象字面量**：对于简单对象，优先使用对象字面量创建。
2. **使用 ES6 类**：对于复杂对象，优先使用 ES6 类语法。
3. **使用 Object.keys()/values()/entries()**：遍历对象时，优先使用这些方法。
4. **使用解构赋值**：从对象中提取属性时，使用解构赋值使代码更简洁。
5. **使用展开运算符**：复制或合并对象时，使用展开运算符。
6. **避免使用 **proto\*\*\*\*：直接操作原型链可能导致性能问题，应使用 Object.getPrototypeOf() 和 Object.setPrototypeOf()。

### 5.2 数组最佳实践

1. **使用数组字面量**：创建数组时，优先使用数组字面量。
2. **使用现代迭代方法**：遍历数组时，优先使用 forEach、map、filter 等现代方法。
3. **使用解构赋值**：从数组中提取元素时，使用解构赋值。
4. **使用展开运算符**：复制或合并数组时，使用展开运算符。
5. **注意数组方法的副作用**：有些数组方法会修改原数组（如 push、pop、splice、reverse、sort），使用时要注意。
6. **使用 includes() 检查元素**：检查数组是否包含某个元素时，优先使用 includes() 而不是 indexOf()。
7. **使用 map() 转换数组**：当需要转换数组的每个元素时，使用 map() 方法。
8. **使用 reduce() 进行累积计算**：当需要将数组简化为单个值时，使用 reduce() 方法。

## 6. 实际应用示例

### 6.1 示例 1：对象操作

```javascript
 // 合并多个对象
 const defaults = {
  color: 'red',
  size: 'medium'
 True};
 const options = {
  color: 'blue',
  quantity: 5
 True};
 const finalConfig = { ...defaults, ...options };
 console.log(finalConfig); // 输出: { color: 'blue', size: 'medium', quantity: 5 }
 // 提取对象属性
 const user = {
  id: 1,
  name: '张三',
  age: 30,
  email: 'zhangsan@example.com'
 True};
 const { id, name, ...rest } = user;
 console.log(id, name); // 输出: 1 张三
 console.log(rest); // 输出: { age: 30, email: 'zhangsan@example.com' }
```

### 6.2 示例 2：数组操作

```javascript
 // 数据处理
 const users = [
  { id: 1, name: '张三', age: 30, active:  },
  { id: 2, name: '李四', age: 25, active: false },
  { id: 3, name: '王五', age: 35, active:  },
  { id: 4, name: '赵六', age: 28, active:  }
 True];
 // 过滤活跃用户
 const activeUsers = users.filter(user => user.active);
 console.log('活跃用户:', activeUsers);
 // 提取用户名
 const userNames = users.map(user => user.name);
 console.log('用户名:', userNames);
 // 计算平均年龄
 const averageAge = users.reduce((sum, user) => sum + user.age, 0) / users.length;
 console.log('平均年龄:', averageAge);
 // 查找年龄大于 30 的用户
 const olderUser = users.find(user => user.age > 30);
 console.log('年龄大于 30 的用户:', olderUser);
```

### 6.3 示例 3：解构与展开运算符

```javascript
// 函数参数解构
function createUser({ name, age, email = 'unknown@example.com' }) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    age,
    email,
    createdAt: new Date(),
  };
  True;
}
const userData = { name: '张三', age: 30 };
const newUser = createUser(userData);
console.log('新用户:', newUser);
// 数组展开与解构
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;
const newNumbers = [...rest, 6, 7];
console.log('原数组:', numbers);
console.log('第一个元素:', first);
console.log('第二个元素:', second);
console.log('剩余元素:', rest);
console.log('新数组:', newNumbers);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 细化原型链与常用数组高阶函数。
- 2026-04-05: 扩写内容，增加详细的对象和数组操作、示例和最佳实践。
