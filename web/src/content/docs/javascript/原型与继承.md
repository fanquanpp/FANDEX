---
order: 110
tags:
  - javascript
difficulty: intermediate
title: 'JavaScript 原型与继承'
module: javascript
category: 'JS Basics'
description: '原型链、构造函数、class 语法与继承模式。'
author: Anonymous
related:
  - javascript/Proxy与Reflect实际应用
  - javascript/模块动态导入与代码分割
  - javascript/正则表达式
  - javascript/错误边界与全局错误捕获
prerequisites:
  - javascript/语法速查
---

## 1. 原型与原型链 (Prototype & Prototype Chain)

### 1.1 什么是原型

在 JavaScript 中，对象的属性查找并不只发生在对象自身。当访问 `obj.x` 时：

1. 先在 `obj` 自身属性中查找 `x`
2. 找不到则沿着 `[Prototype](Prototype)`（俗称"原型"）指向的对象继续查找
3. 直到 `null` 为止（链尾）
   这个沿着 `[Prototype](Prototype)` 向上查找的结构就是原型链。

### 1.2 `__proto__`、`Object.getPrototypeOf` 与 `prototype`

- `Object.getPrototypeOf(obj)`：读取对象的原型（推荐）
- `Object.setPrototypeOf(obj, proto)`：设置对象的原型（不推荐，影响性能）
- `obj.__proto__`：历史遗留访问器（不推荐）
- `Fn.prototype`：函数对象特有属性，用于 `new Fn()` 创建实例时的原型指向
  它们的关系可以用一句话记住：
- 实例对象通过 `[Prototype](Prototype)` 链接到构造函数的 `prototype`

```js
function Foo() {}
const x = new Foo();
Object.getPrototypeOf(x) === Foo.prototype;
```

### 1.3 原型链的终点

原型链的终点是 `null`。完整的查找路径：

```js
function Person(name) {
  this.name = name;
}
Person.prototype.say = function () {
  return `I am ${this.name}`;
};
const p = new Person('Alice');
p.say();
p.hasOwnProperty('name');
p.toString();
p.hasOwnProperty === Object.prototype.hasOwnProperty;
```

查找 `p.toString()` 的过程：

```
 p → Person.prototype → Object.prototype → null
```

每一层都找不到 `toString`，直到 `Object.prototype` 上才找到。

### 1.4 原型链可视化

```
 ┌
 │ null │
 │ ↑ │
 │ Object.prototype │
 │ (hasOwnProperty, toString, valueOf…) │
 │ ↑ │
 │ Person.prototype │
 │ (say, constructor) │
 │ ↑ │
 │ p (实例对象) │
 │ (name: "Alice") │
 └──────────────────────────────────────────────────────────┘
```

---

## 2. 构造函数与 `new` (Constructor & new)

### 2.1 `new` 的执行过程

`new Fn(...args)` 的关键步骤可以理解为：

1. 创建一个新对象 `obj`
2. 设置 `obj.[Prototype](Prototype) = Fn.prototype`
3. 执行 `Fn`，并把 `this` 绑定到 `obj`
4. 若 `Fn` 显式返回对象，则返回该对象；否则返回 `obj`
   用伪代码表示：

```js
function myNew(Fn, ...args) {
  const obj = Object.create(Fn.prototype);
  const ret = Fn.apply(obj, args);
  return ret !== null && (typeof ret === 'object' || typeof ret === 'function') ? ret : obj;
}
```

### 2.2 构造函数返回值的影响

```js
function Foo() {
  this.x = 1;
  return { y: 2 };
}
const a = new Foo();
a.x;
a.y;
function Bar() {
  this.x = 1;
  return 42;
}
const b = new Bar();
b.x;
```

**规则**：构造函数如果返回一个**对象**，则 `new` 的结果就是该对象；如果返回**非对象**（或无 `return`），则返回 `this`。

### 2.3 构造函数的 `constructor` 属性

每个函数的 `prototype` 对象默认有一个 `constructor` 属性，指回函数本身：

```js
function Foo() {}
Foo.prototype.constructor === Foo;
const x = new Foo();
x.constructor === Foo;
```

[警告] 如果手动替换了 `prototype`，需要修复 `constructor`：

```js
function Foo() {}
Foo.prototype = {
  constructor: Foo,
  method() {
    return 'hello';
  },
};
```

---

## 3. `__proto__`、`prototype`、`constructor` 三角关系

### 3.1 三角关系图解

```
 ┌
 │ │
 │ Foo (构造函数) │
 │ ├── Foo.prototype ──────────→ Foo.prototype (原型对象) │
 │ │ ├── constructor → Foo │
 │ │ ├── method1() │
 │ │ └── __proto__ → Object.prototype │
 │ │ │
 │ └── Foo.__proto__ → Function.prototype │
 │ (因为 Foo 本质上也是函数对象) │
 │ │
 │ x (实例) │
 │ ├── x.__proto__ → Foo.prototype │
 │ └── x.constructor → Foo (沿原型链找到) │
 │ │
 └─────────────────────────────────────────────────────────────────┘
```

### 3.2 核心等式

```js
function Foo() {}
const x = new Foo();
x.__proto__ === Foo.prototype;
Foo.prototype.constructor === Foo;
x.constructor === Foo;
Foo.__proto__ === Function.prototype;
Foo.prototype.__proto__ === Object.prototype;
Object.prototype.__proto__ === null;
```

### 3.3 函数对象的原型链

函数本身也是对象，它的原型链：

```
 Foo → Function.prototype → Object.prototype → null
```

```js
 function Foo() {}
 Foo.__proto__ === Function.prototype
 function.prototype.__proto__ === Object.prototype
 Object.prototype.__proto__ === null
```

### 3.4 原型链的完整查找路径示例

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.eat = function () {
  return `${this.name} is eating`;
};
function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}
dog.prototype = Object.create(Animal.prototype);
dog.prototype.constructor = Dog;
dog.prototype.bark = function () {
  return `${this.name} says woof!`;
};
const d = new Dog('Rex', 'Shepherd');
d.bark();
d.eat();
d.toString();
```

查找路径：

```
 d → Dog.prototype → Animal.prototype → Object.prototype → null
```

---

## 4. `Object.create()` 与 `Object.setPrototypeOf()`

### 4.1 `Object.create(proto, propertyDescriptors)`

创建一个新对象，并将其 `[Prototype](Prototype)` 设置为 `proto`：

```js
const base = {
  greet() {
    return `Hello, I am ${this.name}`;
  },
};
const alice = Object.create(base);
alice.name = 'Alice';
alice.greet();
Object.getPrototypeOf(alice) === base;
```

第二个参数可以定义属性描述符：

```js
 const bob = Object.create(base, {
  name: {
  value: 'Bob',
  writable: true,
  enumerable: true,
  configurable:
  }
 }
 bob.greet()
```

### 4.2 `Object.create(null)`——纯净字典对象

```js
const dict = Object.create(null);
dict.key = 'value';
dict.toString;
dict.hasOwnProperty;
'key' in dict;
```

用途：当需要用对象做纯字典时，避免原型链上的属性干扰（如 `toString`、`hasOwnProperty`）。

### 4.3 `Object.setPrototypeOf(obj, proto)`

运行时修改对象的原型：

```js
const proto = {
  greet() {
    return 'hello';
  },
};
const obj = { name: 'test' };
Object.setPrototypeOf(obj, proto);
obj.greet();
```

[警告] **强烈不推荐**在性能敏感代码中使用，原因：

1. 修改已有对象的原型会使 V8 的隐藏类（Hidden Class）优化失效
2. 所有后续属性访问都会变慢（退化为字典模式）
3. 各浏览器引擎对此操作都有性能惩罚
   **替代方案**：用 `Object.create()` 在创建时就确定原型关系。

### 4.4 `Object.getPrototypeOf(obj)`

安全地读取对象原型：

```js
function Foo() {}
const x = new Foo();
Object.getPrototypeOf(x) === Foo.prototype;
Object.getPrototypeOf(Foo.prototype) === Object.prototype;
Object.getPrototypeOf(Object.prototype) === null;
```

---

## 5. 继承的常见实现 (Common Inheritance Patterns)

### 5.1 原型链继承

```js
function Parent() {
  this.colors = ['red', 'blue'];
}
Parent.prototype.say = function () {
  return 'parent';
};
function Child() {}
Child.prototype = new Parent();
Child.prototype.constructor = Child;
const c1 = new Child();
const c2 = new Child();
c1.colors.push('green');
c2.colors;
```

问题：

- `Child.prototype` 上共享 `Parent` 实例状态（若 Parent 构造函数里初始化引用类型，会导致实例间共享）
- 无法向 `Parent` 构造函数传参

### 5.2 借用构造函数继承（构造函数继承）

```js
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
Parent.prototype.say = function () {
  return this.name;
};
function Child(name) {
  Parent.call(this, name);
}
const c1 = new Child('Alice');
const c2 = new Child('Bob');
c1.colors.push('green');
c1.colors;
c2.colors;
c1.say;
```

优点：可传参、每个实例独立状态。缺点：方法无法复用（每次实例化都复制一份），且无法继承原型上的方法。

### 5.3 组合继承

结合两者优点：在 `Child` 中 `Parent.call(this, ...)` 初始化实例属性，再用原型链复用方法。

```js
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
Parent.prototype.say = function () {
  return this.name;
};
function Child(name, age) {
  Parent.call(this, name);
  this.age = age;
}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
const c1 = new Child('Alice', 20);
const c2 = new Child('Bob', 25);
c1.colors.push('green');
c1.colors;
c2.colors;
c1.say();
```

这也是 ES5 下最常用、最稳定的写法之一。
**缺点**：`Parent` 构造函数被调用了两次（`Parent.call(this, ...)` 和 `Object.create(Parent.prototype)` 中的隐式调用），存在冗余。

### 5.4 寄生组合继承（最优 ES5 方案 [完成]）

通过寄生方式避免 `Parent` 构造函数的重复调用：

```js
function inheritPrototype(Child, Parent) {
  const prototype = Object.create(Parent.prototype);
  prototype.constructor = Child;
  Child.prototype = prototype;
}
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
Parent.prototype.say = function () {
  return this.name;
};
function Child(name, age) {
  Parent.call(this, name);
  this.age = age;
}
inheritPrototype(Child, Parent);
Child.prototype.introduce = function () {
  return `${this.say()}, age ${this.age}`;
};
const c = new Child('Alice', 20);
c.say();
c.introduce();
c instanceof Child;
c instanceof Parent;
```

**优点**：

- `Parent` 构造函数只调用一次
- 原型链保持完整
- 实例属性独立，方法共享
  这是 ES5 时代最完美的继承方案，也是很多库（如 Vue 2.x）内部使用的继承方式。

### 5.5 ES6 `class`/`extends` 的本质

`class` 只是更清晰的语法糖，底层仍然是原型链：

- 实例方法在 `Child.prototype`
- 静态方法在 `Child` 本身
- `extends` 建立两条链：
- `Child.__proto__ = Parent`（继承静态方法）
- `Child.prototype.__proto__ = Parent.prototype`（继承实例方法）

```js
class Parent {
  constructor(name) {
    this.name = name;
    this.colors = ['red', 'blue'];
  }
  say() {
    return this.name;
  }
  static version() {
    return 1;
  }
}
class Child extends Parent {
  constructor(name, age) {
    super(name);
    this.age = age;
  }
  introduce() {
    return `${this.say()}, age ${this.age}`;
  }
}
const c = new Child('Alice', 20);
c.say();
c.introduce();
c instanceof Child;
c instanceof Parent;
Child.version();
```

**`class` 继承的注意事项**：

```js
class Parent {
  constructor() {
    this.type = 'parent';
  }
}
class Child extends Parent {
  constructor() {
    console.log(this);
    super();
    console.log(this);
  }
}
```

在 `class` 的 `constructor` 中，`this` 在 `super()` 调用前不可用，否则报 `ReferenceError`。

### 5.6 继承方式对比总结

| 继承方式     | 原型方法 | 实例属性独立 | 可传参 | 调用父构造次数 | 推荐度 |
| :----------- | :------- | :----------- | :----- | :------------- | :----- |
| 原型链继承   | [完成]   | [错误]       | [错误] | 1              |        |
| 构造函数继承 | [错误]   | [完成]       | [完成] | 1              |        |
| 组合继承     | [完成]   | [完成]       | [完成] | 2              |        |
| 寄生组合继承 | [完成]   | [完成]       | [完成] | 1              |        |
| ES6 class    | [完成]   | [完成]       | [完成] | 1              |        |

---

## 6. 属性查找、遮蔽与删除 (Lookup, Shadowing, Delete)

### 6.1 属性查找机制

```js
const base = { x: 1, y: 2 };
const obj = Object.create(base);
obj.z = 3;
obj.z;
obj.x;
obj.y;
obj.w;
```

查找过程：`obj 自身 → base → Object.prototype → null`

### 6.2 属性遮蔽（Shadowing）

子对象自有属性会遮蔽原型链同名属性：

```js
const base = { x: 1 };
const obj = Object.create(base);
obj.x = 2;
obj.x;
base.x;
delete obj.x;
obj.x;
```

### 6.3 属性设置与遮蔽规则

给对象属性赋值时，有三种情况：

```js
const base = {
  x: 1,
  get y() {
    return this._y || 10;
  },
  set y(val) {
    this._y = val;
  },
};
const obj = Object.create(base);
obj.x = 100;
obj.x;
base.x;
obj.y = 200;
obj.y;
obj._y;
```

**规则**：

1. 如果属性在自身且可写 → 直接修改自身属性
2. 如果属性在原型链上且是数据属性（可写）→ 在自身创建新属性（遮蔽）
3. 如果属性在原型链上是 getter/setter → 调用 setter，不会自动遮蔽

### 6.4 删除属性

- `delete obj.x` 只能删除自有属性，删不掉原型上的 `x`
- `in` 会沿原型链查找；`Object.hasOwn(obj, key)` 只看自有属性

```js
const base = { x: 1 };
const obj = Object.create(base);
obj.x = 2('x' in obj);
Object.hasOwn(obj, 'x');
delete obj.x;
Object.hasOwn(obj, 'x');
obj.x;
```

### 6.5 属性枚举与检测方法对比

```js
 const base = { inherited:  }
 const obj = Object.create(base)
 obj.own =
 Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false })
 'own' in obj
 'inherited' in obj
 'hidden' in obj
 Object.hasOwn(obj, 'own')
 Object.hasOwn(obj, 'inherited')
 Object.hasOwn(obj, 'hidden')
 Object.keys(obj)
 Object.getOwnPropertyNames(obj)
 for (const key in obj) { console.log(key) }
```

| 方法                         | 自有可枚举 | 自有不可枚举 | 继承可枚举 |
| :--------------------------- | :--------- | :----------- | :--------- |
| `in`                         | [完成]     | [完成]       | [完成]     |
| `Object.hasOwn`              | [完成]     | [完成]       | [错误]     |
| `Object.keys`                | [完成]     | [错误]       | [错误]     |
| `Object.getOwnPropertyNames` | [完成]     | [完成]       | [错误]     |
| `for...in`                   | [完成]     | [错误]       | [完成]     |

---

## 7. 原型链判断方法

### 7.1 `instanceof`

检测构造函数的 `prototype` 是否出现在某个实例对象的原型链上：

```js
 function Foo() {}
 const x = new Foo()
 x instanceof Foo
 x instanceof Object
 Foo instanceof Function
 function instanceof Object
 Object instanceof Function
```

**`instanceof` 的实现原理**：

```js
function myInstanceof(obj, Constructor) {
  if (typeof Constructor !== 'function') throw new TypeError('Right-hand side is not callable');
  let proto = Object.getPrototypeOf(obj);
  while (proto !== null) {
    if (proto === Constructor.prototype) return;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
myInstanceof(x, Foo);
myInstanceof(x, Object);
myInstanceof(x, Array);
```

**`instanceof` 的局限性**：

```js
const str = 'hello';
str instanceof String;
const obj = Object.create(null);
obj instanceof Object;
```

- 原始值使用 `instanceof` 始终返回 `false`
- `Object.create(null)` 创建的对象没有原型链，`instanceof Object` 也返回 `false`
- 跨 iframe/realm 时，不同全局对象的 `Array.prototype` 不同，`instanceof` 会失效

### 7.2 `isPrototypeOf()`

检测一个对象是否存在于另一个对象的原型链上：

```js
function Animal() {}
function Dog() {}
dog.prototype = Object.create(Animal.prototype);
dog.prototype.constructor = Dog;
const d = new Dog();
Animal.prototype.isPrototypeOf(d);
dog.prototype.isPrototypeOf(d);
Object.prototype.isPrototypeOf(d);
```

**`instanceof` vs `isPrototypeOf`**：

```js
d instanceof Dog;
dog.prototype.isPrototypeOf(d);
d instanceof Animal;
Animal.prototype.isPrototypeOf(d);
```

| 对比项   | `instanceof`                 | `isPrototypeOf`                |
| :------- | :--------------------------- | :----------------------------- |
| 语法     | `obj instanceof Constructor` | `prototype.isPrototypeOf(obj)` |
| 关注点   | 构造函数                     | 原型对象                       |
| 跨 realm | [错误] 可能失效              | [完成] 不受影响                |
| 原始值   | 始终 `false`                 | 始终 `false`                   |

### 7.3 更可靠的类型判断

```js
Object.prototype.toString.call([]);
Object.prototype.toString.call({});
Object.prototype.toString.call('hello');
Object.prototype.toString.call(42);
Object.prototype.toString.call(null);
Object.prototype.toString.call(undefined);
Object.prototype.toString.call(() => {});
Object.prototype.toString.call(new Date());
Object.prototype.toString.call(/regex/);
```

## `Object.prototype.toString` 是最可靠的类型判断方法，不受跨 realm 影响。

## 8. 工程实践与性能 (Best Practices & Performance)

### 8.1 原型链性能

属性查找沿原型链逐层搜索，链越长查找越慢：

```js
const a = { x: 1 };
const b = Object.create(a);
const c = Object.create(b);
const d = Object.create(c);
const e = Object.create(d);
console.time('own');
for (let i = 0; i < 1e6; i++) {
  e.y = 1;
  void e.y;
}
console.timeEnd('own');
console.time('deep');
for (let i = 0; i < 1e6; i++) {
  void e.x;
}
console.timeEnd('deep');
```

实践建议：避免过深的原型链（一般不超过 3-4 层）。

### 8.2 避免运行时修改原型

- 避免运行时频繁 `Object.setPrototypeOf`：会使对象"退化"，影响 JIT 优化
- 避免运行时修改 `Fn.prototype`：会影响所有已创建的实例
- 优先用 `class`/`extends` 或 `Object.create` 明确建立原型关系

```js
function Foo() {}
const a = new Foo();
Foo.prototype.method = function () {
  return 'new method';
};
a.method();
Foo.prototype = {
  otherMethod() {
    return 'other';
  },
};
a.otherMethod;
a.method();
```

### 8.3 对需要枚举的对象

- 尽量用 `Object.keys`/`Object.entries`（只枚举自有可枚举属性）
- 对安全敏感输入，避免把外部数据直接合并到对象原型链相关位置
- 使用 `Object.hasOwn()` 代替 `obj.hasOwnProperty()`（更安全，避免 `hasOwnProperty` 被遮蔽）

```js
const obj = Object.create(null);
obj.hasOwnProperty;
Object.hasOwn(obj, 'key');
```

### 8.4 方法定义的最佳位置

```js
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function () {
  return `Hello, ${this.name}`;
};
const p1 = new Person('Alice');
const p2 = new Person('Bob');
p1.greet === p2.greet;
```

## 方法定义在原型上，所有实例共享同一个函数引用，节省内存。如果定义在构造函数内，每次 `new` 都会创建新的函数对象。

## 9. 安全注意：原型污染 (Prototype Pollution)

### 9.1 什么是原型污染

当把不可信输入合并到对象时，若允许写入 `__proto__`/`constructor.prototype` 等字段，可能污染全局对象原型，导致权限绕过或逻辑劫持。

```js
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}
const payload = JSON.parse('{"__proto__":{"isAdmin":true}}');
merge({}, payload)({}).isAdmin;
```

### 9.2 防御措施

实践建议：

- 合并用户输入时做 key 白名单或过滤：`__proto__`、`prototype`、`constructor`
- 对纯字典对象使用 `Object.create(null)`，避免原型链

```js
 const dict = Object.create(null)
 dict['__proto__'] = { polluted:  }
 ({}).polluted
```

- 使用 `Object.defineProperty` 设置 `__proto__` 为不可配置

```js
function safeMerge(target, source) {
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(source)) {
    if (dangerous.includes(key)) continue;
    target[key] = source[key];
  }
  return target;
}
```

- 使用 `Map` 代替普通对象存储键值对

```js
 const map = new Map()
 map.set('__proto__', { polluted:  })
 map.get('__proto__')
 ({}).polluted
```

### 9.3 深层原型污染

不仅 `__proto__`，嵌套路径也可能导致污染：

```json
 {
  "constructor": {
  "prototype": {
  "isAdmin":
  }
  }
 }
```

防御：递归合并时，对每一层的 key 都做危险 key 过滤。

## 延伸阅读

- [TS 类型系统](typescript/type-system-basics)

---

### 更新日志 (Changelog)

- 2026-05-27: v1.0.0 大幅扩充——新增三角关系图解、Object.create/setPrototypeOf 详解、寄生组合继承、instanceof/isPrototypeOf 判断方法、属性枚举对比、深层原型污染
- 2026-04-06: 新增「原型与继承」知识点，补充继承模式、性能与安全要点
