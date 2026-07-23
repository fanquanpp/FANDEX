# 字面量类型与联合类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 字符串字面量类型

**基本写法：定义字符串字面量类型**
`let <变量>: "<值>" = "<值>"`

```typescript
// 字符串字面量类型
let direction: "left" = "left"
```

---

**换行写法：联合字符串字面量类型**
`type <类型> = "<值1>" | "<值2>" | "<值3>"`

```typescript
// 联合字符串字面量类型
type Direction = "left" | "right" | "up" | "down"
```

---

**基本写法：使用字符串字面量类型**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用字符串字面量类型
let move: Direction = "left"
```

---

## 数字字面量类型

**基本写法：定义数字字面量类型**
`let <变量>: <数字> = <数字>`

```typescript
// 数字字面量类型
let dice: 6 = 6
```

---

**换行写法：联合数字字面量类型**
`type <类型> = <数字1> | <数字2> | <数字3>`

```typescript
// 联合数字字面量类型
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6
```

---

## 布尔字面量类型

**基本写法：定义布尔字面量类型**
`let <变量>: true = true`

```typescript
// 布尔字面量类型
let is_true: true = true
```

---

## 联合类型

**基本写法：基本联合类型**
`let <变量>: <类型1> | <类型2> = <值>`

```typescript
// 基本联合类型
let id: string | number = 123
id = "ABC"
```

---

**换行写法：多类型联合**
`type <类型> =`
`    | <类型1>`
`    | <类型2>`
`    | <类型3>`

```typescript
// 多类型联合（换行书写）
type Result =
    | string
    | number
    | boolean
```

---

**基本写法：联合类型与 null**
`let <变量>: <类型> | null = <值>`

```typescript
// 联合类型与 null
let name: string | null = "Alice"
name = null
```

---

**基本写法：联合类型与 undefined**
`let <变量>: <类型> | undefined = <值>`

```typescript
// 联合类型与 undefined
let value: string | undefined = undefined
```

---

## 可辨识联合

**换行写法：可辨识联合类型**
`type <类型> =`
`    | { kind: "<标识1>", <属性1>: <类型1> }`
`    | { kind: "<标识2>", <属性2>: <类型2> }`

```typescript
// 可辨识联合类型
type Shape =
    | { kind: "circle", radius: number }
    | { kind: "square", size: number }
    | { kind: "rectangle", width: number, height: number }
```

---

**换行写法：使用可辨识联合**
`function <函数>(<参数>: <类型>): <返回类型> {`
`    switch (<参数>.kind) {`
`        case "<标识1>": return <处理1>`
`        case "<标识2>": return <处理2>`
`    }`
`}`

```typescript
// 使用可辨识联合（通过 kind 属性区分）
function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2
        case "square":
            return shape.size ** 2
        case "rectangle":
            return shape.width * shape.height
    }
}
```

---

## 接口可辨识联合

**换行写法：接口形式可辨识联合**
`interface <接口1> { kind: "<标识1>", <属性>: <类型> }`
`interface <接口2> { kind: "<标识2>", <属性>: <类型> }`
`type <类型> = <接口1> | <接口2>`

```typescript
// 接口形式可辨识联合
interface Circle {
    kind: "circle"
    radius: number
}

interface Square {
    kind: "square"
    size: number
}

type Shape = Circle | Square
```

---

## 类型收窄

**基本写法：使用 typeof 收窄**
`if (typeof <变量> === "<类型>") { <语句> }`

```typescript
// 使用 typeof 类型收窄
function process(value: string | number): void {
    if (typeof value === "string") {
        console.log(value.toUpperCase())
    } else {
        console.log(value.toFixed(2))
    }
}
```

---

**基本写法：使用 instanceof 收窄**
`if (<变量> instanceof <类>) { <语句> }`

```typescript
// 使用 instanceof 类型收窄
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

**基本写法：使用 in 收窄**
`if ("<属性>" in <对象>) { <语句> }`

```typescript
// 使用 in 操作符类型收窄
function process(obj: { a: string } | { b: number }): void {
    if ("a" in obj) {
        console.log(obj.a)
    } else {
        console.log(obj.b)
    }
}
```

---

**基本写法：使用可辨识属性收窄**
`if (<变量>.kind === "<标识>") { <语句> }`

```typescript
// 使用可辨识属性类型收窄
function area(shape: Shape): number {
    if (shape.kind === "circle") {
        return Math.PI * shape.radius ** 2
    } else {
        return shape.size ** 2
    }
}
```

---

## 联合类型函数

**基本写法：联合类型作为函数参数**
`function <函数>(<参数>: <类型1> | <类型2>): <返回类型> { <语句> }`

```typescript
// 联合类型作为函数参数
function format(value: string | number): string {
    return String(value)
}
```

---

**基本写法：联合类型作为返回值**
`function <函数>(<参数>): <类型1> | <类型2> { <语句> }`

```typescript
// 联合类型作为返回值
function get_id(): string | number {
    return Math.random() > 0.5 ? "ABC" : 123
}
```

---

## 联合类型数组

**基本写法：联合类型数组**
`let <变量>: (<类型1> | <类型2>)[] = [<值>]`

```typescript
// 联合类型数组
let mixed: (string | number)[] = [1, "two", 3, "four"]
```

---

## null 与 undefined 处理

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

## 空值合并运算符

**基本写法：使用空值合并提供默认值**
`<值> ?? <默认值>`

```typescript
// 使用空值合并提供默认值
let name: string | null = null
let display_name: string = name ?? "Anonymous"
```

---

## 可选链与联合类型

**基本写法：可选链处理 null/undefined**
`<对象>?.<属性>`

```typescript
// 可选链处理可能为 null/undefined 的属性
interface User {
    profile?: {
        name: string
    }
}

let user: User = {}
let name: string | undefined = user?.profile?.name
```

---

## 字面量类型推断

**基本写法：const 推断字面量类型**
`const <变量> = <值>`

```typescript
// const 推断为字面量类型
const direction = "left"  // 类型为 "left"
```

---

**基本写法：let 推断宽泛类型**
`let <变量> = <值>`

```typescript
// let 推断为宽泛类型
let direction = "left"  // 类型为 string
```

---

## as const 断言

**基本写法：使用 as const 断言**
`const <变量> = <值> as const`

```typescript
// 使用 as const 断言为字面量类型
const direction = "left" as const  // 类型为 "left"
```

---

**换行写法：对象 as const**
`const <变量> = {`
`    <属性1>: <值1>,`
`    <属性2>: <值2>,`
`} as const`

```typescript
// 对象使用 as const 斿言为只读字面量类型
const config = {
    host: "localhost",
    port: 8080,
} as const
```

---

**基本写法：数组 as const**
`const <变量> = [<值1>, <值2>] as const`

```typescript
// 数组使用 as const 断言为只读元组
const colors = ["red", "green", "blue"] as const
```

---

## 模板字面量类型

**基本写法：基本模板字面量类型**
`type <类型> = \`<前缀>\${<类型>}\``

```typescript
// 基本模板字面量类型
type Greeting = `hello ${string}`
```

---

**换行写法：联合类型模板字面量**
`type <类型> = \`<前缀>\${<类型1> | <类型2>}\``

```typescript
// 联合类型模板字面量
type Side = "left" | "right"
type Direction = `turn ${Side}`
```

---

## 穷尽检查

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

## 联合类型工具

**基本写法：使用 Extract 提取类型**
`type <别名> = Extract<<联合类型>, <匹配类型>>`

```typescript
// 使用 Extract 提取符合条件的类型
type T = Extract<string | number | boolean, string | number>
```

---

**基本写法：使用 Exclude 排除类型**
`type <别名> = Exclude<<联合类型>, <排除类型>>`

```typescript
// 使用 Exclude 排除特定类型
type T = Exclude<string | number | boolean, boolean>
```

---

**基本写法：使用 NonNullable 排除 null**
`type <别名> = NonNullable<<类型>>`

```typescript
// 使用 NonNullable 排除 null 和 undefined
type T = NonNullable<string | null | undefined>
```

---

## 联合类型与数组

**基本写法：映射联合类型**
`type <别名> = <类型>[keyof <类型>]`

```typescript
// 从类型提取值的联合类型
type Config = {
    host: string
    port: number
}

type ConfigValue = Config[keyof Config]  // string | number
```

---

## 字面量类型应用

**换行写法：使用字面量类型定义事件**
`type <事件类型> = "click" | "hover" | "focus"`
`function <函数>(<事件>: <事件类型>): void { <语句> }`

```typescript
// 使用字面量类型定义事件处理器
type EventName = "click" | "hover" | "focus"

function handle_event(event: EventName): void {
    console.log(`处理事件: ${event}`)
}
```

---

**换行写法：使用字面量类型定义状态**
`type <状态类型> = "idle" | "loading" | "success" | "error"`

```typescript
// 使用字面量类型定义状态机
type Status = "idle" | "loading" | "success" | "error"

function get_status_message(status: Status): string {
    switch (status) {
        case "idle":
            return "等待中"
        case "loading":
            return "加载中"
        case "success":
            return "成功"
        case "error":
            return "错误"
    }
}
```
