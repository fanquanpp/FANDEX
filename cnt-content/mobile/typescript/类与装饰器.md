# 类与装饰器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 类定义

**换行写法：定义基本类**
`class <类名> {`
`    <属性>: <类型>`
`    <方法>(<参数>): <返回类型> { <语句> }`
`}`

```typescript
// 定义基本类
class User {
    name: string
    age: number

    greet(): string {
        return `Hello, ${this.name}`
    }
}
```

---

**基本写法：创建类实例**
`let <变量> = new <类名>(<参数>)`

```typescript
// 创建类实例
let user = new User()
```

---

## 构造函数

**换行写法：定义构造函数**
`class <类名> {`
`    constructor(<参数>: <类型>) { <语句> }`
`}`

```typescript
// 定义构造函数
class User {
    name: string

    constructor(name: string) {
        this.name = name
    }
}
```

---

**基本写法：构造函数参数简写**
`class <类名> {`
`    constructor(public <属性>: <类型>) {}`
`}`

```typescript
// 构造函数参数简写（自动创建属性）
class User {
    constructor(public name: string, public age: number) {}
}
```

---

## 属性修饰符

**换行写法：public 公有属性**
`class <类名> {`
`    public <属性>: <类型>`
`}`

```typescript
// public 公有属性（默认）
class User {
    public name: string = "Alice"
}
```

---

**换行写法：private 私有属性**
`class <类名> {`
`    private <属性>: <类型>`
`}`

```typescript
// private 私有属性
class User {
    private age: number = 30
}
```

---

**换行写法：protected 受保护属性**
`class <类名> {`
`    protected <属性>: <类型>`
`}`

```typescript
// protected 受保护属性
class User {
    protected id: number = 1
}
```

---

**换行写法：readonly 只读属性**
`class <类名> {`
`    readonly <属性>: <类型>`
`}`

```typescript
// readonly 只读属性
class User {
    readonly id: number

    constructor(id: number) {
        this.id = id
    }
}
```

---

**换行写法：static 静态属性**
`class <类名> {`
`    static <属性>: <类型>`
`}`

```typescript
// static 静态属性
class User {
    static count: number = 0
}
```

---

**基本写法：访问静态属性**
`<类名>.<静态属性>`

```typescript
// 访问静态属性
console.log(User.count)
```

---

## 方法

**换行写法：定义实例方法**
`class <类名> {`
`    <方法>(<参数>: <类型>): <返回类型> { <语句> }`
`}`

```typescript
// 定义实例方法
class User {
    greet(name: string): string {
        return `Hello, ${name}`
    }
}
```

---

**换行写法：定义静态方法**
`class <类名> {`
`    static <方法>(<参数>: <类型>): <返回类型> { <语句> }`
`}`

```typescript
// 定义静态方法
class User {
    static create(name: string): User {
        return new User(name)
    }
}
```

---

**换行写法：定义 getter**
`class <类名> {`
`    get <属性>(): <类型> { <语句> }`
`}`

```typescript
// 定义 getter
class User {
    private _name: string = ""

    get name(): string {
        return this._name
    }
}
```

---

**换行写法：定义 setter**
`class <类名> {`
`    set <属性>(<值>: <类型>) { <语句> }`
`}`

```typescript
// 定义 setter
class User {
    private _name: string = ""

    set name(value: string) {
        this._name = value
    }
}
```

---

## 继承

**换行写法：类继承**
`class <子类> extends <父类> {`
`    constructor(<参数>) { super(<参数>) }`
`}`

```typescript
// 类继承
class Animal {
    constructor(public name: string) {}
}

class Dog extends Animal {
    constructor(name: string, public breed: string) {
        super(name)
    }
}
```

---

**换行写法：方法重写**
`class <子类> extends <父类> {`
`    <方法>(<参数>): <返回类型> { <新语句> }`
`}`

```typescript
// 方法重写
class Animal {
    speak(): string {
        return "sound"
    }
}

class Dog extends Animal {
    speak(): string {
        return "Woof!"
    }
}
```

---

**基本写法：调用父类方法**
`super.<方法>(<参数>)`

```typescript
// 调用父类方法
class Dog extends Animal {
    speak(): string {
        return `${super.speak()} - Woof!`
    }
}
```

---

## 抽象类

**换行写法：定义抽象类**
`abstract class <类名> {`
`    abstract <方法>(<参数>): <返回类型>`
`}`

```typescript
// 定义抽象类
abstract class Animal {
    abstract speak(): string

    eat(): void {
        console.log("eating")
    }
}
```

---

**换行写法：实现抽象类**
`class <子类> extends <抽象类> {`
`    <方法>(<参数>): <返回类型> { <语句> }`
`}`

```typescript
// 实现抽象类
class Dog extends Animal {
    speak(): string {
        return "Woof!"
    }
}
```

---

## 接口实现

**换行写法：类实现接口**
`interface <接口> { <方法>(<参数>): <返回类型> }`
`class <类名> implements <接口> { <语句> }`

```typescript
// 类实现接口
interface Comparable {
    compare(other: any): number
}

class Number implements Comparable {
    constructor(public value: number) {}

    compare(other: Number): number {
        return this.value - other.value
    }
}
```

---

## 泛型类

**换行写法：定义泛型类**
`class <类名><<T>> {`
`    private <属性>: <T>[]`
`    <方法>(<参数>: <T>): void { <语句> }`
`}`

```typescript
// 定义泛型类
class Stack<T> {
    private items: T[] = []

    push(item: T): void {
        this.items.push(item)
    }

    pop(): T | undefined {
        return this.items.pop()
    }
}
```

---

**基本写法：使用泛型类**
`let <变量> = new <类名><<类型>>()`

```typescript
// 使用泛型类
let stack = new Stack<number>()
stack.push(1)
```

---

## 装饰器

**换行写法：类装饰器**
`function <装饰器>(<构造函数>: { new (...args: any[]): any }) { <语句> }`
`@<装饰器>`
`class <类名> { <语句> }`

```typescript
// 类装饰器
function logged<T extends { new (...args: any[]): any }>(constructor: T) {
    return class extends constructor {
        created_at = new Date()
    }
}

@logged
class User {
    constructor(public name: string) {}
}
```

---

**换行写法：方法装饰器**
`function <装饰器>(<目标>, <键>, <描述符>) { <语句> }`
`class <类名> {`
`    @<装饰器>`
`    <方法>(<参数>) { <语句> }`
`}`

```typescript
// 方法装饰器
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value
    descriptor.value = function(...args: any[]) {
        console.log(`调用 ${key}`)
        return original.apply(this, args)
    }
}

class User {
    @log
    greet(name: string): string {
        return `Hello, ${name}`
    }
}
```

---

**换行写法：属性装饰器**
`function <装饰器>(<目标>, <键>) { <语句> }`
`class <类名> {`
`    @<装饰器>`
`    <属性>: <类型>`
`}`

```typescript
// 属性装饰器
function required(target: any, key: string) {
    console.log(`${key} 是必填的`)
}

class User {
    @required
    name: string = ""
}
```

---

**换行写法：参数装饰器**
`function <装饰器>(<目标>, <键>, <参数索引>) { <语句> }`
`class <类名> {`
`    <方法>(@<装饰器> <参数>: <类型>) { <语句> }`
`}`

```typescript
// 参数装饰器
function log_param(target: any, key: string, index: number) {
    console.log(`参数 ${index} of ${key}`)
}

class User {
    greet(@log_param name: string): string {
        return `Hello, ${name}`
    }
}
```

---

## 装饰器工厂

**换行写法：装饰器工厂**
`function <装饰器>(<参数>): <装饰器> {`
`    return function(<目标>) { <语句> }`
`}`

```typescript
// 装饰器工厂
function repeat(times: number) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value
        descriptor.value = function(...args: any[]) {
            for (let i = 0; i < times; i++) {
                original.apply(this, args)
            }
        }
    }
}

class User {
    @repeat(3)
    greet(): void {
        console.log("Hello")
    }
}
```

---

## 访问器

**换行写法：使用 getter 和 setter**
`class <类名> {`
`    private _<属性>: <类型>`
`    get <属性>(): <类型> { return this._<属性> }`
`    set <属性>(<值>: <类型>) { this._<属性> = <值> }`
`}`

```typescript
// 使用 getter 和 setter 实现属性访问控制
class User {
    private _age: number = 0

    get age(): number {
        return this._age
    }

    set age(value: number) {
        if (value < 0 || value > 150) {
            throw new Error("Invalid age")
        }
        this._age = value
    }
}
```

---

## 静态块

**换行写法：静态初始化块**
`class <类名> {`
`    static <属性>: <类型>`
`    static { <语句> }`
`}`

```typescript
// 静态初始化块
class Config {
    static settings: Record<string, string>

    static {
        Config.settings = {
            host: "localhost",
            port: "8080",
        }
    }
}
```

---

## 私有字段

**换行写法：使用 # 私有字段**
`class <类名> {`
`    #<属性>: <类型>`
`}`

```typescript
// 使用 # 私有字段（ES2022+）
class User {
    #age: number

    constructor(age: number) {
        this.#age = age
    }

    get_age(): number {
        return this.#age
    }
}
```

---

## 类表达式

**基本写法：类表达式**
`const <变量> = class <类名> { <语句> }`

```typescript
// 类表达式
const User = class {
    constructor(public name: string) {}
}
```

---

## 抽象属性

**换行写法：抽象属性**
`abstract class <类名> {`
`    abstract <属性>: <类型>`
`}`

```typescript
// 抽象属性
abstract class Animal {
    abstract name: string

    abstract speak(): string
}
```

---

## 实现多个接口

**换行写法：实现多个接口**
`class <类名> implements <接口1>, <接口2> { <语句> }`

```typescript
// 实现多个接口
interface Comparable {
    compare(other: any): number
}

interface Serializable {
    serialize(): string
}

class User implements Comparable, Serializable {
    compare(other: User): number {
        return 0
    }

    serialize(): string {
        return "User"
    }
}
```

---

## this 类型

**换行写法：使用 this 类型**
`class <类名> {`
`    <方法>(<参数>: <类型>): this { return this }`
`}`

```typescript
// 使用 this 类型实现链式调用
class Calculator {
    private value = 0

    add(n: number): this {
        this.value += n
        return this
    }

    multiply(n: number): this {
        this.value *= n
        return this
    }
}
```

---

## 类与类型

**基本写法：类作为类型**
`let <变量>: <类名> = <实例>`

```typescript
// 类作为类型使用
class User {
    constructor(public name: string) {}
}

let user: User = new User("Alice")
```

---

**基本写法：使用 typeof 获取构造函数类型**
`type <别名> = typeof <类名>`

```typescript
// 获取类的构造函数类型
type UserConstructor = typeof User
```

---

## 类装饰器实战

**换行写法：使用类装饰器添加属性**
`function <装饰器><<T> extends { new (...args: any[]): any }>(<构造函数>: <T>) {`
`    return class extends <T> { <新属性> }`
`}`

```typescript
// 使用类装饰器添加属性
function timestamp<T extends { new (...args: any[]): any }>(constructor: T) {
    return class extends constructor {
        timestamp = Date.now()
    }
}

@timestamp
class User {
    constructor(public name: string) {}
}
```

---

## 方法装饰器实战

**换行写法：使用方法装饰器实现日志**
`function <装饰器>(<目标>, <键>, <描述符>) {`
`    const <原方法> = <描述符>.value`
`    <描述符>.value = function(...args) { <前置> return <原方法>.apply(this, args) }`
`}`

```typescript
// 使用方法装饰器实现日志
function log_execution(target: any, key: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value
    descriptor.value = function(...args: any[]) {
        console.log(`执行 ${key}，参数: ${args}`)
        const result = original.apply(this, args)
        console.log(`${key} 执行完成`)
        return result
    }
}

class Calculator {
    @log_execution
    add(a: number, b: number): number {
        return a + b
    }
}
```

---

## 属性装饰器实战

**换行写法：使用属性装饰器实现验证**
`function <装饰器>(<目标>, <键>) {`
`    let <值>: <类型>`
`    Object.defineProperty(<目标>, <键>, { get, set })`
`}`

```typescript
// 使用属性装饰器实现验证
function validate_age(target: any, key: string) {
    let value: number

    Object.defineProperty(target, key, {
        get() { return value },
        set(new_value: number) {
            if (new_value < 0 || new_value > 150) {
                throw new Error("Invalid age")
            }
            value = new_value
        }
    })
}

class User {
    @validate_age
    age: number = 0
}
```
