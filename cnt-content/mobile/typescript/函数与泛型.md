# 函数与泛型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数声明

**基本写法：函数声明**
`function <函数名>(<参数>: <类型>): <返回类型> { <语句> }`

```typescript
// 函数声明
function add(a: number, b: number): number {
    return a + b
}
```

---

**基本写法：函数表达式**
`const <函数名> = function(<参数>: <类型>): <返回类型> { <语句> }`

```typescript
// 函数表达式
const add = function(a: number, b: number): number {
    return a + b
}
```

---

**基本写法：箭头函数**
`const <函数名> = (<参数>: <类型>): <返回类型> => <表达式>`

```typescript
// 箭头函数
const add = (a: number, b: number): number => a + b
```

---

## 函数类型

**基本写法：使用 type 定义函数类型**
`type <函数类型> = (<参数>: <类型>) => <返回类型>`

```typescript
// 使用 type 定义函数类型
type MathFunc = (a: number, b: number) => number
```

---

**换行写法：使用 interface 定义函数类型**
`interface <函数类型> {`
`    (<参数>: <类型>): <返回类型>`
`}`

```typescript
// 使用 interface 定义函数类型
interface MathFunc {
    (a: number, b: number): number
}
```

---

**基本写法：使用函数类型**
`let <变量>: <函数类型> = (<参数>) => <表达式>`

```typescript
// 使用函数类型注解
let add: MathFunc = (a, b) => a + b
```

---

## 可选参数

**基本写法：可选参数**
`function <函数>(<参数1>: <类型>, <参数2>?: <类型>): <返回类型> { <语句> }`

```typescript
// 可选参数（必须放在必选参数后）
function greet(name: string, greeting?: string): string {
    return `${greeting || "Hello"}, ${name}`
}
```

---

## 默认参数

**基本写法：默认参数**
`function <函数>(<参数>: <类型> = <默认值>): <返回类型> { <语句> }`

```typescript
// 默认参数值
function greet(name: string = "World"): string {
    return `Hello, ${name}`
}
```

---

## 剩余参数

**基本写法：剩余参数**
`function <函数>(...<参数>: <类型>[]): <返回类型> { <语句> }`

```typescript
// 剩余参数
function sum(...numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0)
}
```

---

## 函数重载

**换行写法：函数重载签名**
`function <函数>(<参数>: <类型1>): <返回类型1>`
`function <函数>(<参数>: <类型2>): <返回类型2>`
`function <函数>(<参数>: <类型>): <返回类型> { <语句> }`

```typescript
// 函数重载
function process(data: number): string
function process(data: string): number
function process(data: number | string): string | number {
    if (typeof data === "number") {
        return String(data)
    }
    return data.length
}
```

---

## 泛型函数

**基本写法：定义泛型函数**
`function <函数><<类型参数>>(<参数>: <类型参数>): <类型参数> { <语句> }`

```typescript
// 定义泛型函数
function identity<T>(value: T): T {
    return value
}
```

---

**基本写法：使用泛型函数**
`<函数><<类型>>(<值>)`

```typescript
// 使用泛型函数（显式指定类型）
let result = identity<string>("hello")
```

---

**基本写法：类型推断泛型**
`<函数>(<值>)`

```typescript
// 使用泛型函数（自动推断类型）
let result = identity("hello")  // T 推断为 string
```

---

## 多类型参数泛型

**单行写法：多类型参数泛型函数**
`function <函数><<T>, <U>>(<参数1>: <T>, <参数2>: <U>): [<T>, <U>] { <语句> }`

```typescript
// 多类型参数泛型函数
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second]
}
```

---

**换行写法：多类型参数泛型函数**
`function <函数><`
`    <T>,`
`    <U>,`
`>(<参数1>: <T>, <参数2>: <U>): [<T>, <U>] { <语句> }`

```typescript
// 多类型参数泛型函数（换行书写）
function pair<
    T,
    U,
>(first: T, second: U): [T, U] {
    return [first, second]
}
```

---

## 泛型接口

**换行写法：定义泛型接口**
`interface <接口名><<T>> {`
`    <属性>: <T>`
`}`

```typescript
// 定义泛型接口
interface Container<T> {
    value: T
}
```

---

**基本写法：使用泛型接口**
`let <变量>: <接口名><<类型>> = { <属性>: <值> }`

```typescript
// 使用泛型接口
let container: Container<string> = { value: "hello" }
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

## 泛型约束

**换行写法：使用 extends 约束泛型**
`interface <接口> { <属性>: <类型> }`
`function <函数><<T> extends <接口>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 泛型约束（限制类型必须包含指定属性）
interface HasLength {
    length: number
}

function log_length<T extends HasLength>(value: T): void {
    console.log(value.length)
}
```

---

**基本写法：使用 keyof 约束泛型**
`function <函数><<T>, <K> extends keyof <T>>(<参数>: <T>, <键>: <K>): <返回类型> { <语句> }`

```typescript
// 使用 keyof 约束泛型
function get_property<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}
```

---

## 泛型默认类型

**基本写法：泛型默认类型**
`function <函数><<T> = <默认类型>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 泛型默认类型
function create_array<T = string>(length: number, value: T): T[] {
    return Array(length).fill(value)
}
```

---

**换行写法：多泛型默认类型**
`function <函数><`
`    <T> = <默认类型1>,`
`    <U> = <默认类型2>,`
`>(<参数1>: <T>, <参数2>: <U>): <返回类型> { <语句> }`

```typescript
// 多泛型默认类型
function create_pair<
    T = string,
    U = number,
>(first: T, second: U): [T, U] {
    return [first, second]
}
```

---

## 泛型工具类型

**基本写法：使用 Partial 工具类型**
`type <别名> = Partial<<接口>>`

```typescript
// 使用 Partial 使所有属性可选
interface User {
    name: string
    age: number
}

type PartialUser = Partial<User>
```

---

**基本写法：使用 Readonly 工具类型**
`type <别名> = Readonly<<接口>>`

```typescript
// 使用 Readonly 使所有属性只读
type ReadonlyUser = Readonly<User>
```

---

**基本写法：使用 Pick 工具类型**
`type <别名> = Pick<<接口>, "<属性1>" | "<属性2>">`

```typescript
// 使用 Pick 选取部分属性
type UserBasic = Pick<User, "name" | "age">
```

---

**基本写法：使用 Record 工具类型**
`type <别名> = Record<<键类型>, <值类型>>`

```typescript
// 使用 Record 创建键值对类型
type UserMap = Record<string, User>
```

---

## 泛型与数组

**基本写法：泛型数组函数**
`function <函数><<T>>(<参数>: <T>[]): <T> { <语句> }`

```typescript
// 泛型数组函数
function first<T>(items: T[]): T {
    return items[0]
}
```

---

**基本写法：泛型数组方法**
`function <函数><<T>>(<参数>: <T>[], <函数>: (<项>: <T>) => boolean): <T>[] { <语句> }`

```typescript
// 泛型数组方法
function filter<T>(items: T[], predicate: (item: T) => boolean): T[] {
    return items.filter(predicate)
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

## 高阶函数

**基本写法：高阶函数**
`function <函数>(<函数参数>: (<参数>: <类型>) => <返回类型>): <返回类型> { <语句> }`

```typescript
// 高阶函数（函数作为参数）
function apply(func: (x: number) => number, value: number): number {
    return func(value)
}
```

---

**基本写法：返回函数的函数**
`function <函数>(<参数>): (<参数>: <类型>) => <返回类型> { return <函数> }`

```typescript
// 返回函数的函数
function create_multiplier(factor: number): (x: number) => number {
    return (x: number) => x * factor
}
```

---

## 泛型与 Promise

**换行写法：泛型 Promise 函数**
`async function <函数><<T>>(): Promise<<T>> { return <值> }`

```typescript
// 泛型 Promise 函数
async function fetch_data<T>(url: string): Promise<T> {
    const response = await fetch(url)
    return response.json()
}
```

---

**基本写法：使用泛型 Promise**
`let <变量>: Promise<<类型>> = <函数>()`

```typescript
// 使用泛型 Promise
let data: Promise<User> = fetch_data<User>("/api/user")
```

---

## 条件类型与泛型

**基本写法：条件类型**
`type <类型> = <T> extends <条件> ? <真类型> : <假类型>`

```typescript
// 条件类型
type IsString<T> = T extends string ? true : false
```

---

**基本写法：使用条件类型**
`type <别名> = <类型函数><<参数类型>>`

```typescript
// 使用条件类型
type A = IsString<string>  // true
type B = IsString<number>  // false
```

---

## 泛型与类方法

**换行写法：泛型类方法**
`class <类名><<T>> {`
`    <方法><<U>>(<参数>: <U>): <返回类型> { <语句> }`
`}`

```typescript
// 泛型类方法
class DataProcessor<T> {
    private data: T[] = []

    add(item: T): void {
        this.data.push(item)
    }

    transform<U>(fn: (item: T) => U): U[] {
        return this.data.map(fn)
    }
}
```

---

## 函数类型推断

**基本写法：从函数推断返回类型**
`type <别名> = ReturnType<typeof <函数>>`

```typescript
// 从函数推断返回类型
function get_user() {
    return { name: "Alice", age: 30 }
}

type User = ReturnType<typeof get_user>
```

---

**基本写法：从函数推断参数类型**
`type <别名> = Parameters<typeof <函数>>`

```typescript
// 从函数推断参数类型
function greet(name: string, age: number): void {}

type GreetParams = Parameters<typeof greet>  // [string, number]
```

---

## 泛型与映射类型

**换行写法：泛型映射类型**
`type <类型><<T>> = {`
`    [P in keyof T]: <新类型>`
`}`

```typescript
// 泛型映射类型
type Stringify<T> = {
    [P in keyof T]: string
}
```

---

**换行写法：使用泛型映射类型**
`type <别名> = <类型><<接口>>`

```typescript
// 使用泛型映射类型
interface User {
    name: string
    age: number
}

type StringUser = Stringify<User>  // { name: string, age: string }
```

---

## TypeScript 5.x 新特性

**基本写法：TypeScript 5.0 装饰器**
`function <decorator>(<target>, <context>) { }`

```typescript
// 定义符合 Stage 3 标准的装饰器函数
function log(target, context) {
    console.log(`装饰: ${context.name}`)
}
```

---

**基本写法：TypeScript 5.0 const 类型参数**
`<const T>`

```typescript
// 使用 const 类型参数锁定传入数组的字面量类型
function first_of<T extends readonly unknown[]>(arr: const T): T[0] {
    return arr[0]
}
const v = first_of([1, 2, 3] as const)  // 类型为字面量 1
```

---

**基本写法：TypeScript 5.1 函数返回类型分离声明**
`function <函数名>(<参数>): <返回类型> { return <表达式> }`

```typescript
// 返回类型与函数体解耦检查，便于提前捕获类型错误
function build_user(id: number): User {
    return { id, name: "Tom" }
}
```

---

**基本写法：TypeScript 5.2 using 资源管理**
`using <resource> = <表达式>`

```typescript
// 使用 using 声明在作用域结束时自动释放资源
function process() {
    using resource = get_resource()
    // 函数结束时自动调用 resource[Symbol.dispose]()
}
```

---

**基本写法：TypeScript 5.4 NoInfer 工具类型**
`NoInfer<T>`

```typescript
// 使用 NoInfer 阻止类型参数的逆向推断
function create_pair<T>(first: T, second: NoInfer<T>): [T, T] {
    return [first, second]
}
```

---

**基本写法：TypeScript 5.5 推断类型谓词**
`(<param>) => <param> is <类型>`

```typescript
// 自动推断类型谓词，无需显式标注 is 类型守卫
const is_string = (x: unknown) => typeof x === "string"
// 推断为 (x: unknown) => x is string
```

---

**基本写法：TypeScript 5.6 不允许真值比较**
`if (<cond> === true)`

```typescript
// 启用 --strictBooleanExpressions 后必须显式比较布尔值
function process(value?: boolean) {
    if (value === true) {
        console.log("值为 true")
    }
}
```

---

**基本写法：TypeScript 5.7 默认导入解析约束**
`import <名称> from "<模块>"`

```typescript
// 5.7 默认使用 bundler 解析模式，类型导入需显式标注 type 修饰符
import type { User } from "./types"
import { UserService } from "./service"
```

---

**基本写法：TypeScript 5.8 --erasableSyntaxOnly 选项**
`// tsconfig.json 中设置 "erasableSyntaxOnly": true`

```typescript
// 启用后仅允许类型层面的可擦除语法，禁止 enum 和 namespace 等运行时构造
type Status = "active" | "inactive"
// 以下写法将被禁止：
// enum Status { Active, Inactive }
```
