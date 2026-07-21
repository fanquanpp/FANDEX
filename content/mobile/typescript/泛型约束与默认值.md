# 泛型约束与默认值

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型约束基础

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

**基本写法：使用约束泛型**
`<函数>(<值>)`

```typescript
// 使用约束泛型函数
log_length("hello")  // string 有 length 属性
log_length([1, 2, 3])  // array 有 length 属性
```

---

## keyof 约束

**基本写法：使用 keyof 约束泛型**
`function <函数><<T>, <K> extends keyof <T>>(<参数>: <T>, <键>: <K>): <返回类型> { <语句> }`

```typescript
// 使用 keyof 约束泛型
function get_property<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}
```

---

**基本写法：使用 keyof 约束泛型函数**
`<函数>(<对象>, "<属性>")`

```typescript
// 使用 keyof 约束泛型函数
let user = { name: "Alice", age: 30 }
let name = get_property(user, "name")
```

---

## 类型参数约束

**换行写法：类型参数之间约束**
`function <函数><<T>, <U> extends keyof <T>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 类型参数之间约束（U 必须是 T 的键）
function get_keys<T, U extends keyof T>(obj: T): U[] {
    return Object.keys(obj) as U[]
}
```

---

**基本写法：约束为特定类型**
`function <函数><<T> extends <类型>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 约束泛型为特定类型
function sum<T extends number>(a: T, b: T): number {
    return a + b
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

**基本写法：使用默认类型**
`<函数>(<值>)`

```typescript
// 使用默认类型（不指定类型参数）
let arr = create_array(3, "hello")  // T 默认为 string
```

---

**基本写法：覆盖默认类型**
`<函数><<新类型>>(<值>)`

```typescript
// 覆盖默认类型
let arr = create_array<number>(3, 42)
```

---

## 泛型接口默认类型

**换行写法：泛型接口默认类型**
`interface <接口名><<T> = <默认类型>> {`
`    <属性>: <T>`
`}`

```typescript
// 泛型接口默认类型
interface Container<T = string> {
    value: T
}
```

---

**基本写法：使用默认类型的泛型接口**
`let <变量>: <接口名> = { <属性>: <值> }`

```typescript
// 使用默认类型的泛型接口
let container: Container = { value: "hello" }  // T 默认为 string
```

---

## 泛型类默认类型

**换行写法：泛型类默认类型**
`class <类名><<T> = <默认类型>> {`
`    private <属性>: <T>[]`
`}`

```typescript
// 泛型类默认类型
class Stack<T = string> {
    private items: T[] = []

    push(item: T): void {
        this.items.push(item)
    }
}
```

---

**基本写法：使用默认类型的泛型类**
`let <变量> = new <类名>()`

```typescript
// 使用默认类型的泛型类
let stack = new Stack()  // T 默认为 string
```

---

## 条件类型约束

**基本写法：条件类型约束**
`type <类型> = <T> extends <条件> ? <真类型> : <假类型>`

```typescript
// 条件类型约束
type IsString<T> = T extends string ? true : false
```

---

**基本写法：使用条件类型约束**
`type <别名> = <类型函数><<参数类型>>`

```typescript
// 使用条件类型约束
type A = IsString<string>  // true
type B = IsString<number>  // false
```

---

## infer 推断

**换行写法：使用 infer 推断类型**
`type <类型> = <T> extends (<参数>: infer <U>) => any ? <U> : never`

```typescript
// 使用 infer 推断函数参数类型
type GetParameter<T> = T extends (arg: infer U) => any ? U : never
```

---

**基本写法：使用 infer 推断返回类型**
`type <类型> = <T> extends (...args: any[]) => infer <R> ? <R> : never`

```typescript
// 使用 infer 推断函数返回类型
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never
```

---

**基本写法：使用 infer 推断数组元素类型**
`type <类型> = <T> extends (infer <U>)[] ? <U> : never`

```typescript
// 使用 infer 推断数组元素类型
type GetArrayElement<T> = T extends (infer U)[] ? U : never
```

---

**基本写法：使用 infer 推断 Promise 类型**
`type <类型> = <T> extends Promise<infer <U>> ? <U> : <T>`

```typescript
// 使用 infer 推断 Promise 的类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
```

---

## 多重约束

**换行写法：多重约束泛型**
`function <函数><<T> extends <接口1> & <接口2>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 多重约束泛型（必须同时满足多个约束）
interface HasLength {
    length: number
}

interface HasName {
    name: string
}

function process<T extends HasLength & HasName>(value: T): void {
    console.log(value.length, value.name)
}
```

---

## 泛型约束与类

**换行写法：泛型类约束**
`class <类名><<T> extends <接口>> {`
`    private <属性>: <T>`
`}`

```typescript
// 泛型类约束
interface Comparable {
    compare(other: any): number
}

class SortedList<T extends Comparable> {
    private items: T[] = []

    add(item: T): void {
        this.items.push(item)
        this.items.sort((a, b) => a.compare(b))
    }
}
```

---

## 泛型约束与构造函数

**换行写法：约束为构造函数**
`function <函数><<T>>(<类>: new (...args: any[]) => <T>): <T> { <语句> }`

```typescript
// 约束泛型为构造函数
function create_instance<T>(constructor: new (...args: any[]) => T): T {
    return new constructor()
}
```

---

**换行写法：使用 new 约束**
`interface <接口> { new (...args: any[]): <类型> }`
`function <函数><<T>>(<类>: <接口>): <T> { <语句> }`

```typescript
// 使用 new 约束泛型
interface Constructor<T> {
    new (...args: any[]): T
}

function factory<T>(ctor: Constructor<T>): T {
    return new ctor()
}
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

## 泛型与工具类型

**基本写法：使用 Partial 工具类型**
`type <别名> = Partial<<接口>>`

```typescript
// 使用 Partial 使所有属性可选
type PartialUser = Partial<User>
```

---

**基本写法：使用 Required 工具类型**
`type <别名> = Required<<接口>>`

```typescript
// 使用 Required 使所有属性必填
type RequiredUser = Required<User>
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

**基本写法：使用 Omit 工具类型**
`type <别名> = Omit<<接口>, "<属性>">`

```typescript
// 使用 Omit 排除部分属性
type UserWithoutAge = Omit<User, "age">
```

---

**基本写法：使用 Record 工具类型**
`type <别名> = Record<<键类型>, <值类型>>`

```typescript
// 使用 Record 创建键值对类型
type UserMap = Record<string, User>
```

---

## 泛型与条件类型组合

**换行写法：条件类型与泛型组合**
`type <类型><<T>> = <T> extends <条件> ? <真类型> : <假类型>`

```typescript
// 条件类型与泛型组合
type NonNullable<T> = T extends null | undefined ? never : T
```

---

**换行写法：分布式条件类型**
`type <类型><<T>> = <T> extends <条件> ? <真类型> : <假类型>`

```typescript
// 分布式条件类型（对联合类型逐个判断）
type ToArray<T> = T extends any ? T[] : never
```

---

**基本写法：使用分布式条件类型**
`type <别名> = <类型><<联合类型>>`

```typescript
// 使用分布式条件类型
type Result = ToArray<string | number>  // string[] | number[]
```

---

## 泛型与 infer 组合

**换行写法：使用 infer 提取类型**
`type <类型> = <T> extends Promise<infer <U>> ? <U> : <T>`

```typescript
// 使用 infer 提取 Promise 的类型
type Awaited<T> = T extends Promise<infer U> ? U : T
```

---

**换行写法：递归条件类型**
`type <类型> = <T> extends Promise<infer <U>> ? <类型><<U>> : <T>`

```typescript
// 递归条件类型（处理嵌套 Promise）
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T
```

---

## 泛型约束最佳实践

**换行写法：约束泛型为特定结构**
`interface <接口> { <属性>: <类型> }`
`function <函数><<T> extends <接口>>(<参数>: <T>): <返回类型> { <语句> }`

```typescript
// 约束泛型为特定结构
interface Identifiable {
    id: string | number
}

function find_item<T extends Identifiable>(items: T[], id: string | number): T | undefined {
    return items.find(item => item.id === id)
}
```

---

**换行写法：使用泛型约束实现工厂模式**
`interface <接口> { create(): <类型> }`
`function <函数><<T>>(<工厂>: <接口>): <T> { <语句> }`

```typescript
// 使用泛型约束实现工厂模式
interface Factory<T> {
    create(): T
}

function create_instance<T>(factory: Factory<T>): T {
    return factory.create()
}
```
