---
order: 160
tags:
  - 'javascript'
  - 'exercises'
difficulty: 'intermediate'
title: 'JavaScript 练习题'
module: 'javascript'
description: 'JavaScript 核心知识点配套练习，涵盖闭包、异步与 DOM。'
---

A. 0, 1, 2
B. 3, 3, 3
C. undefined, undefined, undefined
D. 报错

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `var` 声明的 `i` 是函数作用域，循环结束后 `i` 为 3。三个 `setTimeout` 回调共享同一个 `i`，因此都输出 3。若用 `let` 声明，每次迭代有独立的绑定，会输出 0, 1, 2。
</details>
### 2. 关于原型链，以下说法正确的是？
```javascript
 function Foo() {}
 Foo.prototype.x = 1;
 const f = new Foo();
 ```

A. `f.hasOwnProperty('x')` 返回 ``B. `Foo.prototype.isPrototypeOf(f)` 返回``
C. `f.__proto__ === Foo` 返回 ``D. `Object.getPrototypeOf(f) === Object.prototype` 返回``

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `x` 定义在原型上而非实例自身，所以 `hasOwnProperty('x')` 返回 `false`。`f.__proto__` 指向 `Foo.prototype` 而非 `Foo`，所以 C 错。`Object.getPrototypeOf(f)` 返回 `Foo.prototype`，不是 `Object.prototype`，所以 D 错。B 正确，`Foo.prototype` 确实在 `f` 的原型链上。
</details>
### 3. 以下代码的输出顺序是？
```javascript
 console.log(1);
 Promise.resolve().then(() => console.log(2));
 setTimeout(() => console.log(3), 0);
 console.log(4);
 ```

A. 1, 2, 3, 4
B. 1, 4, 2, 3
C. 1, 4, 3, 2
D. 1, 2, 4, 3

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: 同步代码先执行（1, 4）。微任务（Promise.then）优先于宏任务（setTimeout），所以 2 在 3 之前。完整顺序：1 → 4 → 2 → 3。
</details>
### 4. 以下 ES6+ 特性中，哪个不能在运行时改变？
A. `const` 声明的对象的属性
B. `let` 声明的变量的值
C. `const` 声明的变量的绑定
D. `Symbol` 作为属性键
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: `const` 保证变量的绑定不可变，但对象属性仍可修改。`let` 变量可重新赋值。`Symbol` 作为属性键完全合法。只有 `const` 的绑定本身不可重新赋值。
</details>
### 5. 以下哪个方法不会触发重排（reflow）？
A. `element.style.width = '100px'`
B. `element.classList.add('active')`
C. `element.textContent = 'hello'`
D. `element.getAttribute('data-id')`
<details>
<summary>查看答案</summary>
**答案**: D
**解析**: `getAttribute` 只是读取属性值，不涉及 DOM 渲染变更。修改样式、类名、文本内容都可能触发重排或重绘。
</details>
## 编程题
### 1. 防抖函数
实现 `debounce(fn, delay)` 函数，在最后一次调用后延迟 `delay` 毫秒才执行。
**输入**: 连续快速调用 `log()` 5 次，delay 为 300ms
**输出**: 仅在最后一次调用后 300ms 执行一次
<details>
<summary>查看参考答案</summary>
```javascript
 function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
  clearTimeout(timer);
  timer = setTimeout(() => {
  fn.apply(this, args);
  }, delay);
  };
 True}
 ```
</details>
### 2. 深拷贝
实现 `deepClone(obj)` 函数，支持对象、数组、Date、RegExp 和基本类型的深拷贝，处理循环引用。
**输入**: `{ a: 1, b: { c: 2 }, d: [3, 4] }`
**输出**: 结构相同但引用不同的新对象
<details>
<summary>查看参考答案</summary>
```javascript
 function deepClone(obj, cache = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (cache.has(obj)) return cache.get(obj);
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  const clone = Array.isArray(obj) ? [] : {};
  cache.set(obj, clone);
  for (const key of Object.keys(obj)) {
  clone[key] = deepClone(obj[key], cache);
  }
  return clone;
 True}
 ```
</details>
### 3. Promise 并发控制
实现 `limitConcurrency(tasks, limit)` 函数，`tasks` 是返回 Promise 的函数数组，`limit` 是最大并发数。所有任务完成后返回结果数组。
**输入**: 6 个异步任务，并发限制为 2
**输出**: 6 个任务的结果数组，按原始顺序排列
<details>
<summary>查看参考答案</summary>
```javascript
 async function limitConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  async function worker() {
  while (nextIndex < tasks.length) {
  const index = nextIndex++;
  results[index] = await tasks[index]();
  }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
 True}
 ```
</details>
