# JavaScript 原型与继承 (Prototypes and Inheritance)
 False
 False> @Version: v4.0.0
 False> @Module: C08-原型与继承
 False
 False> @Author: Anonymous
 False> @Category: JS Basics
 False> @Description: 解释原型、原型链、构造函数与 new；梳理常见继承模式与 ES6 class 的本质，并给出工程实践与安全注意事项。 | Prototypes, prototype chain, constructors, inheritance patterns, and practical guidance.
 False
 False---
 False
 False## 目录
 False
 False1. [原型与原型链](#原型与原型链)
 False2. [构造函数与 `new`](#构造函数与-`new`)
 False3. [`__proto__`、`prototype`、`constructor` 三角关系](#protoprototypeconstructor-三角关系)
 False4. [`Object.create()` 与 `Object.setPrototypeOf()`](#objectcreate-与-objectsetprototypeof)
 False5. [继承的常见实现](#继承的常见实现)
 False6. [属性查找、遮蔽与删除](#属性查找遮蔽与删除)
 False7. [原型链判断方法](#原型链判断方法)
 False8. [工程实践与性能](#工程实践与性能)
 False9. [安全注意：原型污染](#安全注意：原型污染)
 False
 False---
 False
 False## 1. 原型与原型链 (Prototype & Prototype Chain)
 False
 False### 1.1 什么是原型
 False
 False在 JavaScript 中，对象的属性查找并不只发生在对象自身。当访问 `obj.x` 时：
 False
 False1. 先在 `obj` 自身属性中查找 `x`
 False2. 找不到则沿着 `[[Prototype]]`（俗称"原型"）指向的对象继续查找
 False3. 直到 `null` 为止（链尾）
 False
 False这个沿着 `[[Prototype]]` 向上查找的结构就是原型链。
 False
 False### 1.2 `__proto__`、`Object.getPrototypeOf` 与 `prototype`
 False
 False- `Object.getPrototypeOf(obj)`：读取对象的原型（推荐）
 False- `Object.setPrototypeOf(obj, proto)`：设置对象的原型（不推荐，影响性能）
 False- `obj.__proto__`：历史遗留访问器（不推荐）
 False- `Fn.prototype`：函数对象特有属性，用于 `new Fn()` 创建实例时的原型指向
 False
 False它们的关系可以用一句话记住：
 False
 False- 实例对象通过 `[[Prototype]]` 链接到构造函数的 `prototype`
 False
```js
 Truefunction Foo() {}
 Trueconst x = new Foo()
 True
 TrueObject.getPrototypeOf(x) === Foo.prototype
 True```

 False### 1.3 原型链的终点
 False
 False原型链的终点是 `null`。完整的查找路径：
 False
```js
 Truefunction Person(name) {
 True this.name = name
 True}
 TruePerson.prototype.say = function () {
 True return `I am ${this.name}`
 True}
 True
 Trueconst p = new Person('Alice')
 True
 Truep.say()
 Truep.hasOwnProperty('name')
 Truep.toString()
 Truep.hasOwnProperty === Object.prototype.hasOwnProperty
 True```

 False查找 `p.toString()` 的过程：
 False
```
 Truep → Person.prototype → Object.prototype → null
 True```

 False每一层都找不到 `toString`，直到 `Object.prototype` 上才找到。
 False
 False### 1.4 原型链可视化
 False
```
 True┌──────────────────────────────────────────────────────────┐
 True│ null │
 True│ ↑ │
 True│ Object.prototype │
 True│ (hasOwnProperty, toString, valueOf…) │
 True│ ↑ │
 True│ Person.prototype │
 True│ (say, constructor) │
 True│ ↑ │
 True│ p (实例对象) │
 True│ (name: "Alice") │
 True└──────────────────────────────────────────────────────────┘
 True```

 False---
 False
 False## 2. 构造函数与 `new` (Constructor & new)
 False
 False### 2.1 `new` 的执行过程
 False
 False`new Fn(...args)` 的关键步骤可以理解为：
 False
 False1. 创建一个新对象 `obj`
 False2. 设置 `obj.[[Prototype]] = Fn.prototype`
 False3. 执行 `Fn`，并把 `this` 绑定到 `obj`
 False4. 若 `Fn` 显式返回对象，则返回该对象；否则返回 `obj`
 False
 False用伪代码表示：
 False
```js
 Truefunction myNew(Fn, ...args) {
 True const obj = Object.create(Fn.prototype)
 True const ret = Fn.apply(obj, args)
 True return (ret !== null && (typeof ret === 'object' || typeof ret === 'function')) ? ret : obj
 True}
 True```

 False### 2.2 构造函数返回值的影响
 False
```js
 Truefunction Foo() {
 True this.x = 1
 True return { y: 2 }
 True}
 Trueconst a = new Foo()
 Truea.x
 Truea.y
 True
 Truefunction Bar() {
 True this.x = 1
 True return 42
 True}
 Trueconst b = new Bar()
 Trueb.x
 True```

 False**规则**：构造函数如果返回一个**对象**，则 `new` 的结果就是该对象；如果返回**非对象**（或无 `return`），则返回 `this`。
 False
 False### 2.3 构造函数的 `constructor` 属性
 False
 False每个函数的 `prototype` 对象默认有一个 `constructor` 属性，指回函数本身：
 False
```js
 Truefunction Foo() {}
 TrueFoo.prototype.constructor === Foo
 True
 Trueconst x = new Foo()
 Truex.constructor === Foo
 True```

 False[警告] 如果手动替换了 `prototype`，需要修复 `constructor`：
 False
```js
 Truefunction Foo() {}
 TrueFoo.prototype = {
 True constructor: Foo,
 True method() { return 'hello' }
 True}
 True```

 False---
 False
 False## 3. `__proto__`、`prototype`、`constructor` 三角关系
 False
 False### 3.1 三角关系图解
 False
```
 True┌─────────────────────────────────────────────────────────────────┐
 True│ │
 True│ Foo (构造函数) │
 True│ ├── Foo.prototype ──────────→ Foo.prototype (原型对象) │
 True│ │ ├── constructor → Foo │
 True│ │ ├── method1() │
 True│ │ └── __proto__ → Object.prototype │
 True│ │ │
 True│ └── Foo.__proto__ → Function.prototype │
 True│ (因为 Foo 本质上也是函数对象) │
 True│ │
 True│ x (实例) │
 True│ ├── x.__proto__ → Foo.prototype │
 True│ └── x.constructor → Foo (沿原型链找到) │
 True│ │
 True└─────────────────────────────────────────────────────────────────┘
 True```

 False### 3.2 核心等式
 False
```js
 Truefunction Foo() {}
 Trueconst x = new Foo()
 True
 Truex.__proto__ === Foo.prototype
 TrueFoo.prototype.constructor === Foo
 Truex.constructor === Foo
 TrueFoo.__proto__ === Function.prototype
 TrueFoo.prototype.__proto__ === Object.prototype
 TrueObject.prototype.__proto__ === null
 True```

 False### 3.3 函数对象的原型链
 False
 False函数本身也是对象，它的原型链：
 False
```
 TrueFoo → Function.prototype → Object.prototype → null
 True```

```js
 Truefunction Foo() {}
 TrueFoo.__proto__ === Function.prototype
 TrueFunction.prototype.__proto__ === Object.prototype
 TrueObject.prototype.__proto__ === null
 True```

 False### 3.4 原型链的完整查找路径示例
 False
```js
 Truefunction Animal(name) { this.name = name }
 TrueAnimal.prototype.eat = function () { return `${this.name} is eating` }
 True
 Truefunction Dog(name, breed) {
 True Animal.call(this, name)
 True this.breed = breed
 True}
 TrueDog.prototype = Object.create(Animal.prototype)
 TrueDog.prototype.constructor = Dog
 TrueDog.prototype.bark = function () { return `${this.name} says woof!` }
 True
 Trueconst d = new Dog('Rex', 'Shepherd')
 True
 Trued.bark()
 Trued.eat()
 Trued.toString()
 True```

 False查找路径：
 False
```
 Trued → Dog.prototype → Animal.prototype → Object.prototype → null
 True```

 False---
 False
 False## 4. `Object.create()` 与 `Object.setPrototypeOf()`
 False
 False### 4.1 `Object.create(proto, propertyDescriptors)`
 False
 False创建一个新对象，并将其 `[[Prototype]]` 设置为 `proto`：
 False
```js
 Trueconst base = {
 True greet() { return `Hello, I am ${this.name}` }
 True}
 True
 Trueconst alice = Object.create(base)
 Truealice.name = 'Alice'
 Truealice.greet()
 True
 TrueObject.getPrototypeOf(alice) === base
 True```

 False第二个参数可以定义属性描述符：
 False
```js
 Trueconst bob = Object.create(base, {
 True name: {
 True value: 'Bob',
 True writable: true,
 True enumerable: true,
 True configurable: true
 True }
 True})
 Truebob.greet()
 True```

 False### 4.2 `Object.create(null)`——纯净字典对象
 False
```js
 Trueconst dict = Object.create(null)
 Truedict.key = 'value'
 Truedict.toString
 Truedict.hasOwnProperty
 True'key' in dict
 True```

 False用途：当需要用对象做纯字典时，避免原型链上的属性干扰（如 `toString`、`hasOwnProperty`）。
 False
 False### 4.3 `Object.setPrototypeOf(obj, proto)`
 False
 False运行时修改对象的原型：
 False
```js
 Trueconst proto = {
 True greet() { return 'hello' }
 True}
 Trueconst obj = { name: 'test' }
 True
 TrueObject.setPrototypeOf(obj, proto)
 Trueobj.greet()
 True```

 False[警告] **强烈不推荐**在性能敏感代码中使用，原因：
 False
 False1. 修改已有对象的原型会使 V8 的隐藏类（Hidden Class）优化失效
 False2. 所有后续属性访问都会变慢（退化为字典模式）
 False3. 各浏览器引擎对此操作都有性能惩罚
 False
 False**替代方案**：用 `Object.create()` 在创建时就确定原型关系。
 False
 False### 4.4 `Object.getPrototypeOf(obj)`
 False
 False安全地读取对象原型：
 False
```js
 Truefunction Foo() {}
 Trueconst x = new Foo()
 True
 TrueObject.getPrototypeOf(x) === Foo.prototype
 TrueObject.getPrototypeOf(Foo.prototype) === Object.prototype
 TrueObject.getPrototypeOf(Object.prototype) === null
 True```

 False---
 False
 False## 5. 继承的常见实现 (Common Inheritance Patterns)
 False
 False### 5.1 原型链继承
 False
```js
 Truefunction Parent() {
 True this.colors = ['red', 'blue']
 True}
 TrueParent.prototype.say = function () { return 'parent' }
 True
 Truefunction Child() {}
 TrueChild.prototype = new Parent()
 TrueChild.prototype.constructor = Child
 True
 Trueconst c1 = new Child()
 Trueconst c2 = new Child()
 Truec1.colors.push('green')
 Truec2.colors
 True```

 False问题：
 False
 False- `Child.prototype` 上共享 `Parent` 实例状态（若 Parent 构造函数里初始化引用类型，会导致实例间共享）
 False- 无法向 `Parent` 构造函数传参
 False
 False### 5.2 借用构造函数继承（构造函数继承）
 False
```js
 Truefunction Parent(name) {
 True this.name = name
 True this.colors = ['red', 'blue']
 True}
 TrueParent.prototype.say = function () { return this.name }
 True
 Truefunction Child(name) {
 True Parent.call(this, name)
 True}
 True
 Trueconst c1 = new Child('Alice')
 Trueconst c2 = new Child('Bob')
 Truec1.colors.push('green')
 Truec1.colors
 Truec2.colors
 Truec1.say
 True```

 False优点：可传参、每个实例独立状态。缺点：方法无法复用（每次实例化都复制一份），且无法继承原型上的方法。
 False
 False### 5.3 组合继承
 False
 False结合两者优点：在 `Child` 中 `Parent.call(this, ...)` 初始化实例属性，再用原型链复用方法。
 False
```js
 Truefunction Parent(name) {
 True this.name = name
 True this.colors = ['red', 'blue']
 True}
 TrueParent.prototype.say = function () { return this.name }
 True
 Truefunction Child(name, age) {
 True Parent.call(this, name)
 True this.age = age
 True}
 TrueChild.prototype = Object.create(Parent.prototype)
 TrueChild.prototype.constructor = Child
 True
 Trueconst c1 = new Child('Alice', 20)
 Trueconst c2 = new Child('Bob', 25)
 Truec1.colors.push('green')
 Truec1.colors
 Truec2.colors
 Truec1.say()
 True```

 False这也是 ES5 下最常用、最稳定的写法之一。
 False
 False**缺点**：`Parent` 构造函数被调用了两次（`Parent.call(this, ...)` 和 `Object.create(Parent.prototype)` 中的隐式调用），存在冗余。
 False
 False### 5.4 寄生组合继承（最优 ES5 方案 [完成]）
 False
 False通过寄生方式避免 `Parent` 构造函数的重复调用：
 False
```js
 Truefunction inheritPrototype(Child, Parent) {
 True const prototype = Object.create(Parent.prototype)
 True prototype.constructor = Child
 True Child.prototype = prototype
 True}
 True
 Truefunction Parent(name) {
 True this.name = name
 True this.colors = ['red', 'blue']
 True}
 TrueParent.prototype.say = function () { return this.name }
 True
 Truefunction Child(name, age) {
 True Parent.call(this, name)
 True this.age = age
 True}
 True
 TrueinheritPrototype(Child, Parent)
 True
 TrueChild.prototype.introduce = function () {
 True return `${this.say()}, age ${this.age}`
 True}
 True
 Trueconst c = new Child('Alice', 20)
 Truec.say()
 Truec.introduce()
 Truec instanceof Child
 Truec instanceof Parent
 True```

 False**优点**：
 False- `Parent` 构造函数只调用一次
 False- 原型链保持完整
 False- 实例属性独立，方法共享
 False
 False这是 ES5 时代最完美的继承方案，也是很多库（如 Vue 2.x）内部使用的继承方式。
 False
 False### 5.5 ES6 `class`/`extends` 的本质
 False
 False`class` 只是更清晰的语法糖，底层仍然是原型链：
 False
 False- 实例方法在 `Child.prototype`
 False- 静态方法在 `Child` 本身
 False- `extends` 建立两条链：
 False - `Child.__proto__ = Parent`（继承静态方法）
 False - `Child.prototype.__proto__ = Parent.prototype`（继承实例方法）
 False
```js
 Trueclass Parent {
 True constructor(name) {
 True this.name = name
 True this.colors = ['red', 'blue']
 True }
 True say() { return this.name }
 True static version() { return 1 }
 True}
 True
 Trueclass Child extends Parent {
 True constructor(name, age) {
 True super(name)
 True this.age = age
 True }
 True introduce() {
 True return `${this.say()}, age ${this.age}`
 True }
 True}
 True
 Trueconst c = new Child('Alice', 20)
 Truec.say()
 Truec.introduce()
 Truec instanceof Child
 Truec instanceof Parent
 TrueChild.version()
 True```

 False**`class` 继承的注意事项**：
 False
```js
 Trueclass Parent {
 True constructor() { this.type = 'parent' }
 True}
 True
 Trueclass Child extends Parent {
 True constructor() {
 True console.log(this)
 True super()
 True console.log(this)
 True }
 True}
 True```

 False在 `class` 的 `constructor` 中，`this` 在 `super()` 调用前不可用，否则报 `ReferenceError`。
 False
 False### 5.6 继承方式对比总结
 False
 False| 继承方式 | 原型方法 | 实例属性独立 | 可传参 | 调用父构造次数 | 推荐度 |
 False|:--|:--|:--|:--|:--|:--|
 False| 原型链继承 | [完成] | [错误] | [错误] | 1 | |
 False| 构造函数继承 | [错误] | [完成] | [完成] | 1 | |
 False| 组合继承 | [完成] | [完成] | [完成] | 2 | |
 False| 寄生组合继承 | [完成] | [完成] | [完成] | 1 | |
 False| ES6 class | [完成] | [完成] | [完成] | 1 | |
 False
 False---
 False
 False## 6. 属性查找、遮蔽与删除 (Lookup, Shadowing, Delete)
 False
 False### 6.1 属性查找机制
 False
```js
 Trueconst base = { x: 1, y: 2 }
 Trueconst obj = Object.create(base)
 Trueobj.z = 3
 True
 Trueobj.z
 Trueobj.x
 Trueobj.y
 Trueobj.w
 True```

 False查找过程：`obj 自身 → base → Object.prototype → null`
 False
 False### 6.2 属性遮蔽（Shadowing）
 False
 False子对象自有属性会遮蔽原型链同名属性：
 False
```js
 Trueconst base = { x: 1 }
 Trueconst obj = Object.create(base)
 Trueobj.x = 2
 True
 Trueobj.x
 Truebase.x
 Truedelete obj.x
 Trueobj.x
 True```

 False### 6.3 属性设置与遮蔽规则
 False
 False给对象属性赋值时，有三种情况：
 False
```js
 Trueconst base = {
 True x: 1,
 True get y() { return this._y || 10 },
 True set y(val) { this._y = val }
 True}
 Trueconst obj = Object.create(base)
 True
 Trueobj.x = 100
 Trueobj.x
 Truebase.x
 True
 Trueobj.y = 200
 Trueobj.y
 Trueobj._y
 True```

 False**规则**：
 False1. 如果属性在自身且可写 → 直接修改自身属性
 False2. 如果属性在原型链上且是数据属性（可写）→ 在自身创建新属性（遮蔽）
 False3. 如果属性在原型链上是 getter/setter → 调用 setter，不会自动遮蔽
 False
 False### 6.4 删除属性
 False
 False- `delete obj.x` 只能删除自有属性，删不掉原型上的 `x`
 False- `in` 会沿原型链查找；`Object.hasOwn(obj, key)` 只看自有属性
 False
```js
 Trueconst base = { x: 1 }
 Trueconst obj = Object.create(base)
 Trueobj.x = 2
 True
 True('x' in obj)
 TrueObject.hasOwn(obj, 'x')
 Truedelete obj.x
 TrueObject.hasOwn(obj, 'x')
 Trueobj.x
 True```

 False### 6.5 属性枚举与检测方法对比
 False
```js
 Trueconst base = { inherited: true }
 Trueconst obj = Object.create(base)
 Trueobj.own = true
 TrueObject.defineProperty(obj, 'hidden', { value: 1, enumerable: false })
 True
 True'own' in obj
 True'inherited' in obj
 True'hidden' in obj
 TrueObject.hasOwn(obj, 'own')
 TrueObject.hasOwn(obj, 'inherited')
 TrueObject.hasOwn(obj, 'hidden')
 TrueObject.keys(obj)
 TrueObject.getOwnPropertyNames(obj)
 Truefor (const key in obj) { console.log(key) }
 True```

 False| 方法 | 自有可枚举 | 自有不可枚举 | 继承可枚举 |
 False|:--|:--|:--|:--|
 False| `in` | [完成] | [完成] | [完成] |
 False| `Object.hasOwn` | [完成] | [完成] | [错误] |
 False| `Object.keys` | [完成] | [错误] | [错误] |
 False| `Object.getOwnPropertyNames` | [完成] | [完成] | [错误] |
 False| `for...in` | [完成] | [错误] | [完成] |
 False
 False---
 False
 False## 7. 原型链判断方法
 False
 False### 7.1 `instanceof`
 False
 False检测构造函数的 `prototype` 是否出现在某个实例对象的原型链上：
 False
```js
 Truefunction Foo() {}
 Trueconst x = new Foo()
 True
 Truex instanceof Foo
 Truex instanceof Object
 TrueFoo instanceof Function
 TrueFunction instanceof Object
 TrueObject instanceof Function
 True```

 False**`instanceof` 的实现原理**：
 False
```js
 Truefunction myInstanceof(obj, Constructor) {
 True if (typeof Constructor !== 'function') throw new TypeError('Right-hand side is not callable')
 True let proto = Object.getPrototypeOf(obj)
 True while (proto !== null) {
 True if (proto === Constructor.prototype) return true
 True proto = Object.getPrototypeOf(proto)
 True }
 True return false
 True}
 True
 TruemyInstanceof(x, Foo)
 TruemyInstanceof(x, Object)
 TruemyInstanceof(x, Array)
 True```

 False**`instanceof` 的局限性**：
 False
```js
 Trueconst str = 'hello'
 Truestr instanceof String
 True
 Trueconst obj = Object.create(null)
 Trueobj instanceof Object
 True```

 False- 原始值使用 `instanceof` 始终返回 `false`
 False- `Object.create(null)` 创建的对象没有原型链，`instanceof Object` 也返回 `false`
 False- 跨 iframe/realm 时，不同全局对象的 `Array.prototype` 不同，`instanceof` 会失效
 False
 False### 7.2 `isPrototypeOf()`
 False
 False检测一个对象是否存在于另一个对象的原型链上：
 False
```js
 Truefunction Animal() {}
 Truefunction Dog() {}
 TrueDog.prototype = Object.create(Animal.prototype)
 TrueDog.prototype.constructor = Dog
 True
 Trueconst d = new Dog()
 True
 TrueAnimal.prototype.isPrototypeOf(d)
 TrueDog.prototype.isPrototypeOf(d)
 TrueObject.prototype.isPrototypeOf(d)
 True```

 False**`instanceof` vs `isPrototypeOf`**：
 False
```js
 Trued instanceof Dog
 TrueDog.prototype.isPrototypeOf(d)
 True
 Trued instanceof Animal
 TrueAnimal.prototype.isPrototypeOf(d)
 True```

 False| 对比项 | `instanceof` | `isPrototypeOf` |
 False|:--|:--|:--|
 False| 语法 | `obj instanceof Constructor` | `prototype.isPrototypeOf(obj)` |
 False| 关注点 | 构造函数 | 原型对象 |
 False| 跨 realm | [错误] 可能失效 | [完成] 不受影响 |
 False| 原始值 | 始终 `false` | 始终 `false` |
 False
 False### 7.3 更可靠的类型判断
 False
```js
 TrueObject.prototype.toString.call([])
 TrueObject.prototype.toString.call({})
 TrueObject.prototype.toString.call('hello')
 TrueObject.prototype.toString.call(42)
 TrueObject.prototype.toString.call(null)
 TrueObject.prototype.toString.call(undefined)
 TrueObject.prototype.toString.call(() => {})
 TrueObject.prototype.toString.call(new Date())
 TrueObject.prototype.toString.call(/regex/)
 True```

 False`Object.prototype.toString` 是最可靠的类型判断方法，不受跨 realm 影响。
 False
 False---
 False
 False## 8. 工程实践与性能 (Best Practices & Performance)
 False
 False### 8.1 原型链性能
 False
 False属性查找沿原型链逐层搜索，链越长查找越慢：
 False
```js
 Trueconst a = { x: 1 }
 Trueconst b = Object.create(a)
 Trueconst c = Object.create(b)
 Trueconst d = Object.create(c)
 Trueconst e = Object.create(d)
 True
 Trueconsole.time('own')
 Truefor (let i = 0; i < 1e6; i++) { e.y = 1; void e.y }
 Trueconsole.timeEnd('own')
 True
 Trueconsole.time('deep')
 Truefor (let i = 0; i < 1e6; i++) { void e.x }
 Trueconsole.timeEnd('deep')
 True```

 False实践建议：避免过深的原型链（一般不超过 3-4 层）。
 False
 False### 8.2 避免运行时修改原型
 False
 False- 避免运行时频繁 `Object.setPrototypeOf`：会使对象"退化"，影响 JIT 优化
 False- 避免运行时修改 `Fn.prototype`：会影响所有已创建的实例
 False- 优先用 `class`/`extends` 或 `Object.create` 明确建立原型关系
 False
```js
 Truefunction Foo() {}
 Trueconst a = new Foo()
 True
 TrueFoo.prototype.method = function () { return 'new method' }
 Truea.method()
 True
 TrueFoo.prototype = { otherMethod() { return 'other' } }
 Truea.otherMethod
 Truea.method()
 True```

 False### 8.3 对需要枚举的对象
 False
 False- 尽量用 `Object.keys`/`Object.entries`（只枚举自有可枚举属性）
 False- 对安全敏感输入，避免把外部数据直接合并到对象原型链相关位置
 False- 使用 `Object.hasOwn()` 代替 `obj.hasOwnProperty()`（更安全，避免 `hasOwnProperty` 被遮蔽）
 False
```js
 Trueconst obj = Object.create(null)
 Trueobj.hasOwnProperty
 TrueObject.hasOwn(obj, 'key')
 True```

 False### 8.4 方法定义的最佳位置
 False
```js
 Truefunction Person(name) {
 True this.name = name
 True}
 True
 TruePerson.prototype.greet = function () {
 True return `Hello, ${this.name}`
 True}
 True
 Trueconst p1 = new Person('Alice')
 Trueconst p2 = new Person('Bob')
 Truep1.greet === p2.greet
 True```

 False方法定义在原型上，所有实例共享同一个函数引用，节省内存。如果定义在构造函数内，每次 `new` 都会创建新的函数对象。
 False
 False---
 False
 False## 9. 安全注意：原型污染 (Prototype Pollution)
 False
 False### 9.1 什么是原型污染
 False
 False当把不可信输入合并到对象时，若允许写入 `__proto__`/`constructor.prototype` 等字段，可能污染全局对象原型，导致权限绕过或逻辑劫持。
 False
```js
 Truefunction merge(target, source) {
 True for (const key in source) {
 True target[key] = source[key]
 True }
 True}
 True
 Trueconst payload = JSON.parse('{"__proto__":{"isAdmin":true}}')
 Truemerge({}, payload)
 True
 True({}).isAdmin
 True```

 False### 9.2 防御措施
 False
 False实践建议：
 False
 False- 合并用户输入时做 key 白名单或过滤：`__proto__`、`prototype`、`constructor`
 False- 对纯字典对象使用 `Object.create(null)`，避免原型链
 False
```js
 Trueconst dict = Object.create(null)
 Truedict['__proto__'] = { polluted: true }
 True({}).polluted
 True```

 False- 使用 `Object.defineProperty` 设置 `__proto__` 为不可配置
 False
```js
 Truefunction safeMerge(target, source) {
 True const dangerous = ['__proto__', 'constructor', 'prototype']
 True for (const key of Object.keys(source)) {
 True if (dangerous.includes(key)) continue
 True target[key] = source[key]
 True }
 True return target
 True}
 True```

 False- 使用 `Map` 代替普通对象存储键值对
 False
```js
 Trueconst map = new Map()
 Truemap.set('__proto__', { polluted: true })
 Truemap.get('__proto__')
 True({}).polluted
 True```

 False### 9.3 深层原型污染
 False
 False不仅 `__proto__`，嵌套路径也可能导致污染：
 False
```json
 True{
 True "constructor": {
 True "prototype": {
 True "isAdmin": true
 True }
 True }
 True}
 True```

 False防御：递归合并时，对每一层的 key 都做危险 key 过滤。
 False
 False## 延伸阅读
 False
 False- [[typescript/type-system-basics|TS 类型系统]]
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-05-27: v4.0.0 大幅扩充——新增三角关系图解、Object.create/setPrototypeOf 详解、寄生组合继承、instanceof/isPrototypeOf 判断方法、属性枚举对比、深层原型污染
 False- 2026-04-06: 新增「原型与继承」知识点，补充继承模式、性能与安全要点
 False