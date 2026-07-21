# 类型守卫与自定义守卫

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## typeof 类型守卫

**基本写法：使用 typeof 收窄类型**
`if (typeof <变量> === "<类型>") { <语句> }`

```typescript
// 使用 typeof 类型守卫
function process(value: string | number): void {
    if (typeof value === "string") {
        console.log(value.toUpperCase())
    } else {
        console.log(value.toFixed(2))
    }
}
```

---

**基本写法：typeof 检查多种类型**
`if (typeof <变量> === "<类型1>" || typeof <变量> === "<类型2>") { <语句> }`

```typescript
// typeof 检查多种类型
function process(value: string | number | boolean): void {
    if (typeof value === "string" || typeof value === "number") {
        console.log(value.toString())
    } else {
        console.log(value)
    }
}
```

---

## instanceof 类型守卫

**基本写法：使用 instanceof 收窄类型**
`if (<变量> instanceof <类>) { <语句> }`

```typescript
// 使用 instanceof 类型守卫
class Dog {
    bark(): void {}
}

class Cat {
    meow(): void {}
}

function speak(animal: Dog | Cat): void {
    if (animal instanceof Dog) {
        animal.bark()
    } else {
        animal.meow()
    }
}
```

---

**基本写法：instanceof 检查多个类**
`if (<变量> instanceof <类1> || <变量> instanceof <类2>) { <语句> }`

```typescript
// instanceof 检查多个类
function process(obj: Dog | Cat | Bird): void {
    if (obj instanceof Dog || obj instanceof Cat) {
        console.log("哺乳动物")
    } else {
        console.log("鸟类")
    }
}
```

---

## in 类型守卫

**基本写法：使用 in 收窄类型**
`if ("<属性>" in <对象>) { <语句> }`

```typescript
// 使用 in 操作符类型守卫
function process(obj: { a: string } | { b: number }): void {
    if ("a" in obj) {
        console.log(obj.a)
    } else {
        console.log(obj.b)
    }
}
```

---

**基本写法：in 检查多个属性**
`if ("<属性1>" in <对象> && "<属性2>" in <对象>) { <语句> }`

```typescript
// in 检查多个属性
function process(obj: { a?: string } | { b?: number }): void {
    if ("a" in obj && "b" in obj) {
        console.log("同时具有 a 和 b")
    }
}
```

---

## 可辨识联合类型守卫

**换行写法：可辨识联合类型**
`type <类型> =`
`    | { kind: "<标识1>", <属性1>: <类型1> }`
`    | { kind: "<标识2>", <属性2>: <类型2> }`

```typescript
// 可辨识联合类型
type Shape =
    | { kind: "circle", radius: number }
    | { kind: "square", size: number }
```

---

**基本写法：使用可辨识属性收窄类型**
`if (<变量>.kind === "<标识>") { <语句> }`

```typescript
// 使用可辨识属性类型守卫
function area(shape: Shape): number {
    if (shape.kind === "circle") {
        return Math.PI * shape.radius ** 2
    } else {
        return shape.size ** 2
    }
}
```

---

**换行写法：使用 switch 收窄类型**
`switch (<变量>.kind) {`
`    case "<标识1>": return <处理1>`
`    case "<标识2>": return <处理2>`
`}`

```typescript
// 使用 switch 收窄类型
function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2
        case "square":
            return shape.size ** 2
    }
}
```

---

## 自定义类型守卫

**换行写法：定义自定义类型守卫**
`function <函数>(<参数>: <类型>): <参数> is <目标类型> {`
`    return <条件>`
`}`

```typescript
// 定义自定义类型守卫
function is_string(value: any): value is string {
    return typeof value === "string"
}
```

---

**基本写法：使用自定义类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用自定义类型守卫
let value: any = "hello"
if (is_string(value)) {
    console.log(value.toUpperCase())  // value 被收窄为 string
}
```

---

## 数组类型守卫

**换行写法：数组类型守卫**
`function <函数>(<参数>: any): <参数> is <类型>[] {`
`    return Array.isArray(<参数>) && <参数>.every(item => <检查>)`
`}`

```typescript
// 数组类型守卫
function is_string_array(value: any): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === "string")
}
```

---

**基本写法：使用数组类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用数组类型守卫
let value: any = ["a", "b", "c"]
if (is_string_array(value)) {
    value.forEach(item => console.log(item.toUpperCase()))
}
```

---

## 对象类型守卫

**换行写法：对象类型守卫**
`function <函数>(<参数>: any): <参数> is <接口> {`
`    return <参数> !== null && typeof <参数> === "object" && "<属性>" in <参数>`
`}`

```typescript
// 对象类型守卫
interface User {
    name: string
    age: number
}

function is_user(value: any): value is User {
    return value !== null
        && typeof value === "object"
        && "name" in value
        && "age" in value
}
```

---

**基本写法：使用对象类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用对象类型守卫
let value: any = { name: "Alice", age: 30 }
if (is_user(value)) {
    console.log(value.name)
}
```

---

## null 与 undefined 守卫

**基本写法：检查 null**
`if (<变量> !== null) { <语句> }`

```typescript
// 检查 null 后安全使用
function process(name: string | null): void {
    if (name !== null) {
        console.log(name.toUpperCase())
    }
}
```

---

**基本写法：检查 undefined**
`if (<变量> !== undefined) { <语句> }`

```typescript
// 检查 undefined 后安全使用
function process(value: string | undefined): void {
    if (value !== undefined) {
        console.log(value.toUpperCase())
    }
}
```

---

**基本写法：同时检查 null 和 undefined**
`if (<变量> != null) { <语句> }`

```typescript
// 同时检查 null 和 undefined
function process(value: string | null | undefined): void {
    if (value != null) {
        console.log(value.toUpperCase())
    }
}
```

---

## 类型断言守卫

**基本写法：使用 as 断言类型**
`<值> as <类型>`

```typescript
// 使用 as 类型断言
let value: any = "hello"
let length: number = (value as string).length
```

---

**基本写法：使用非空断言**
`<值>!`

```typescript
// 使用非空断言操作符
let value: string | null = "hello"
let length: number = value!.length
```

---

## 类型守卫与联合类型

**换行写法：联合类型守卫**
`function <函数>(<参数>: <类型1> | <类型2>): void {`
`    if (typeof <参数> === "<类型1>") { <处理1> }`
`    else { <处理2> }`
`}`

```typescript
// 联合类型守卫
function process(value: string | number): void {
    if (typeof value === "string") {
        console.log(value.toUpperCase())
    } else {
        console.log(value.toFixed(2))
    }
}
```

---

## 类型守卫与数组

**换行写法：数组元素类型守卫**
`function <函数>(<参数>: any[]): <参数> is <类型>[] {`
`    return <参数>.every(item => <检查>)`
`}`

```typescript
// 数组元素类型守卫
function is_number_array(value: any[]): value is number[] {
    return value.every(item => typeof item === "number")
}
```

---

**基本写法：使用数组元素守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用数组元素守卫
let value: any[] = [1, 2, 3]
if (is_number_array(value)) {
    let sum: number = value.reduce((a, b) => a + b, 0)
}
```

---

## 类型守卫与函数

**换行写法：函数类型守卫**
`function <函数>(<参数>: any): <参数> is (<值>: any) => <返回类型> {`
`    return typeof <参数> === "function"`
`}`

```typescript
// 函数类型守卫
function is_function(value: any): value is Function {
    return typeof value === "function"
}
```

---

**基本写法：使用函数类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用函数类型守卫
let value: any = () => "hello"
if (is_function(value)) {
    console.log(value())
}
```

---

## 类型守卫与 Promise

**换行写法：Promise 类型守卫**
`function <函数>(<参数>: any): <参数> is Promise<<类型>> {`
`    return <参数> instanceof Promise`
`}`

```typescript
// Promise 类型守卫
function is_promise<T>(value: any): value is Promise<T> {
    return value instanceof Promise
}
```

---

**基本写法：使用 Promise 类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用 Promise 类型守卫
let value: any = Promise.resolve("hello")
if (is_promise<string>(value)) {
    value.then(v => console.log(v.toUpperCase()))
}
```

---

## 类型守卫与 Error

**换行写法：Error 类型守卫**
`function <函数>(<参数>: any): <参数> is Error {`
`    return <参数> instanceof Error`
`}`

```typescript
// Error 类型守卫
function is_error(value: any): value is Error {
    return value instanceof Error
}
```

---

**基本写法：使用 Error 类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用 Error 类型守卫
try {
    // 可能抛出异常的代码
} catch (error) {
    if (is_error(error)) {
        console.log(error.message)
    } else {
        console.log(String(error))
    }
}
```

---

## 类型守卫与 Date

**换行写法：Date 类型守卫**
`function <函数>(<参数>: any): <参数> is Date {`
`    return <参数> instanceof Date`
`}`

```typescript
// Date 类型守卫
function is_date(value: any): value is Date {
    return value instanceof Date
}
```

---

**基本写法：使用 Date 类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用 Date 类型守卫
let value: any = new Date()
if (is_date(value)) {
    console.log(value.getFullYear())
}
```

---

## 类型守卫与类

**换行写法：类实例类型守卫**
`function <函数>(<参数>: any): <参数> is <类名> {`
`    return <参数> instanceof <类名>`
`}`

```typescript
// 类实例类型守卫
class User {
    constructor(public name: string) {}
}

function is_user(value: any): value is User {
    return value instanceof User
}
```

---

**基本写法：使用类实例类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用类实例类型守卫
let value: any = new User("Alice")
if (is_user(value)) {
    console.log(value.name)
}
```

---

## 类型守卫与可辨识联合

**换行写法：可辨识联合类型守卫**
`function <函数>(<参数>: <类型>): <参数> is { kind: "<标识>", <属性>: <类型> } {`
`    return <参数>.kind === "<标识>"`
`}`

```typescript
// 可辨识联合类型守卫
type Shape =
    | { kind: "circle", radius: number }
    | { kind: "square", size: number }

function is_circle(shape: Shape): shape is { kind: "circle", radius: number } {
    return shape.kind === "circle"
}
```

---

**基本写法：使用可辨识联合类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用可辨识联合类型守卫
let shape: Shape = { kind: "circle", radius: 5 }
if (is_circle(shape)) {
    console.log(shape.radius)
}
```

---

## 类型守卫与穷尽检查

**换行写法：使用 never 进行穷尽检查**
`function <函数>(<参数>: <类型>): <返回类型> {`
`    switch (<参数>.kind) {`
`        case "<标识1>": return <处理1>`
`        case "<标识2>": return <处理2>`
`        default: const _exhaustive: never = <参数> return _exhaustive`
`    }`
`}`

```typescript
// 使用 never 进行穷尽检查
function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2
        case "square":
            return shape.size ** 2
        default:
            const _exhaustive: never = shape
            return _exhaustive
    }
}
```

---

## 类型守卫与可选属性

**换行写法：可选属性类型守卫**
`function <函数>(<参数>: any): <参数> is { <属性>: <类型> } {`
`    return "<属性>" in <参数>`
`}`

```typescript
// 可选属性类型守卫
interface User {
    name: string
    age?: number
}

function has_age(user: User): user is { name: string, age: number } {
    return "age" in user && user.age !== undefined
}
```

---

**基本写法：使用可选属性类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用可选属性类型守卫
let user: User = { name: "Alice", age: 30 }
if (has_age(user)) {
    console.log(user.age)
}
```

---

## 类型守卫与字面量类型

**换行写法：字面量类型守卫**
`function <函数>(<参数>: string): <参数> is "<值>" {`
`    return <参数> === "<值>"`
`}`

```typescript
// 字面量类型守卫
function is_hello(value: string): value is "hello" {
    return value === "hello"
}
```

---

**基本写法：使用字面量类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用字面量类型守卫
let value: string = "hello"
if (is_hello(value)) {
    console.log(value)  // value 被收窄为 "hello"
}
```

---

## 类型守卫与联合类型数组

**换行写法：联合类型数组守卫**
`function <函数>(<参数>: (<类型1> | <类型2>)[]): <参数> is <类型1>[] {`
`    return <参数>.every(item => <检查>)`
`}`

```typescript
// 联合类型数组守卫
function is_all_strings(value: (string | number)[]): value is string[] {
    return value.every(item => typeof item === "string")
}
```

---

**基本写法：使用联合类型数组守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用联合类型数组守卫
let value: (string | number)[] = ["a", "b", "c"]
if (is_all_strings(value)) {
    value.forEach(item => console.log(item.toUpperCase()))
}
```

---

## 类型守卫与类型谓词

**换行写法：复杂类型谓词**
`function <函数>(<参数>: unknown): <参数> is { <属性1>: <类型1>, <属性2>: <类型2> } {`
`    if (typeof <参数> !== "object" || <参数> === null) return false`
`    return "<属性1>" in <参数> && "<属性2>" in <参数>`
`}`

```typescript
// 复杂类型谓词
interface User {
    name: string
    age: number
}

function is_user(value: unknown): value is User {
    if (typeof value !== "object" || value === null) {
        return false
    }
    return "name" in value && "age" in value
}
```

---

## 类型守卫与 assert

**换行写法：使用 assert 函数**
`function <函数>(<参数>: unknown): asserts <参数> is <类型> {`
`    if (!<检查>) throw new Error(<消息>)`
`}`

```typescript
// 使用 assert 函数
function assert_string(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new Error("Expected string")
    }
}
```

---

**基本写法：使用 assert 函数**
`<函数>(<值>)`

```typescript
// 使用 assert 函数
let value: unknown = "hello"
assert_string(value)
console.log(value.toUpperCase())  // value 被收窄为 string
```

---

**换行写法：assert 函数检查非 null**
`function <函数>(<参数>: unknown): asserts <参数> is NonNullable<typeof <参数>> {`
`    if (<参数> === null || <参数> === undefined) throw new Error(<消息>)`
`}`

```typescript
// assert 函数检查非 null
function assert_non_null<T>(value: T): asserts value is NonNullable<T> {
    if (value === null || value === undefined) {
        throw new Error("Value is null or undefined")
    }
}
```

---

**基本写法：使用 assert 非 null**
`<函数>(<值>)`

```typescript
// 使用 assert 非 null
let value: string | null = "hello"
assert_non_null(value)
console.log(value.toUpperCase())  // value 被收窄为 string
```
