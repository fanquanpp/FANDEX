# 枚举进阶

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 数字枚举

**换行写法：定义数字枚举**
`enum <枚举名> {`
`    <成员1>,`
`    <成员2>,`
`}`

```typescript
// 定义数字枚举（自动从 0 开始递增）
enum Direction {
    Up,
    Down,
    Left,
    Right,
}
```

---

**换行写法：指定起始值的数字枚举**
`enum <枚举名> {`
`    <成员1> = <值>,`
`    <成员2>,`
`}`

```typescript
// 指定起始值的数字枚举
enum Direction {
    Up = 1,
    Down,
    Left,
    Right,
}
```

---

**换行写法：指定每个成员的值**
`enum <枚举名> {`
`    <成员1> = <值1>,`
`    <成员2> = <值2>,`
`}`

```typescript
// 指定每个成员的值
enum StatusCode {
    OK = 200,
    NotFound = 404,
    ServerError = 500,
}
```

---

**基本写法：访问数字枚举成员**
`<枚举名>.<成员>`

```typescript
// 访问数字枚举成员
let direction: Direction = Direction.Up
```

---

**基本写法：反向映射（数字枚举）**
`<枚举名>[<数字>]`

```typescript
// 数字枚举的反向映射
let name: string = Direction[0]  // "Up"
```

---

## 字符串枚举

**换行写法：定义字符串枚举**
`enum <枚举名> {`
`    <成员1> = "<值1>",`
`    <成员2> = "<值2>",`
`}`

```typescript
// 定义字符串枚举
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}
```

---

**基本写法：访问字符串枚举成员**
`<枚举名>.<成员>`

```typescript
// 访问字符串枚举成员
let color: Color = Color.Red
```

---

**基本写法：获取字符串枚举的值**
`<枚举名>.<成员>`

```typescript
// 获取字符串枚举的值
let value: string = Color.Red  // "RED"
```

---

## 异构枚举

**换行写法：混合数字和字符串枚举**
`enum <枚举名> {`
`    <成员1> = <数字>,`
`    <成员2> = "<字符串>",`
`}`

```typescript
// 混合数字和字符串的异构枚举
enum Boolean {
    No = 0,
    Yes = "YES",
}
```

---

## 常量枚举

**换行写法：定义常量枚举**
`const enum <枚举名> {`
`    <成员1>,`
`    <成员2>,`
`}`

```typescript
// 定义常量枚举（编译时内联，不生成代码）
const enum Direction {
    Up,
    Down,
    Left,
    Right,
}
```

---

**基本写法：使用常量枚举**
`let <变量>: <枚举名> = <枚举名>.<成员>`

```typescript
// 使用常量枚举（编译时替换为具体值）
let direction: Direction = Direction.Up
```

---

## 枚举与联合类型

**换行写法：从枚举提取联合类型**
`type <类型> = \`${<枚举名>}\``

```typescript
// 从枚举提取字符串联合类型
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}

type ColorValue = `${Color}`  // "RED" | "GREEN" | "BLUE"
```

---

**基本写法：枚举成员作为类型**
`type <类型> = <枚举名>.<成员>`

```typescript
// 枚举成员作为类型
type RedColor = Color.Red
```

---

## 枚举与映射类型

**换行写法：枚举键映射**
`type <类型> = {`
`    [P in <枚举名>]: <类型>`
`}`

```typescript
// 从枚举创建映射类型
enum Status {
    Active = "ACTIVE",
    Inactive = "INACTIVE",
}

type StatusMessages = {
    [P in Status]: string
}
```

---

**换行写法：枚举值映射**
`type <类型> = {`
`    [P in <枚举名>]: <类型>`
`}`

```typescript
// 从枚举创建值映射类型
type StatusConfig = {
    [P in Status]: {
        label: string
        color: string
    }
}
```

---

## 枚举与条件类型

**换行写法：枚举条件类型**
`type <类型> = <T> extends <枚举名> ? <真类型> : <假类型>`

```typescript
// 枚举条件类型
type IsColor<T> = T extends Color ? true : false
```

---

## 枚举方法

**换行写法：枚举与命名空间合并**
`enum <枚举名> { <成员> }`
`namespace <枚举名> {`
`    export function <方法>(<参数>): <返回类型> { <语句> }`
`}`

```typescript
// 枚举与命名空间合并（为枚举添加方法）
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}

namespace Color {
    export function from_string(value: string): Color | undefined {
        switch (value) {
            case "RED": return Color.Red
            case "GREEN": return Color.Green
            case "BLUE": return Color.Blue
            default: return undefined
        }
    }
}
```

---

**基本写法：调用枚举方法**
`<枚举名>.<方法>(<参数>)`

```typescript
// 调用枚举方法
let color = Color.from_string("RED")
```

---

## 枚举与对象

**换行写法：使用对象替代枚举**
`const <对象> = {`
`    <成员1>: "<值1>",`
`    <成员2>: "<值2>",`
`} as const`

```typescript
// 使用对象替代枚举（使用 as const）
const Color = {
    Red: "RED",
    Green: "GREEN",
    Blue: "BLUE",
} as const
```

---

**基本写法：从对象提取类型**
`type <类型> = typeof <对象>[keyof typeof <对象>]`

```typescript
// 从对象提取联合类型
type ColorValue = typeof Color[keyof typeof Color]  // "RED" | "GREEN" | "BLUE"
```

---

## 枚举与 switch

**换行写法：枚举与 switch 语句**
`function <函数>(<参数>: <枚举名>): <返回类型> {`
`    switch (<参数>) {`
`        case <枚举名>.<成员1>: return <处理1>`
`        case <枚举名>.<成员2>: return <处理2>`
`    }`
`}`

```typescript
// 枚举与 switch 语句
function get_color_name(color: Color): string {
    switch (color) {
        case Color.Red:
            return "红色"
        case Color.Green:
            return "绿色"
        case Color.Blue:
            return "蓝色"
    }
}
```

---

## 枚举与穷尽检查

**换行写法：使用 never 进行穷尽检查**
`function <函数>(<参数>: <枚举名>): <返回类型> {`
`    switch (<参数>) {`
`        case <枚举名>.<成员1>: return <处理1>`
`        case <枚举名>.<成员2>: return <处理2>`
`        default: const _exhaustive: never = <参数> return _exhaustive`
`    }`
`}`

```typescript
// 使用 never 进行穷尽检查
function get_color_name(color: Color): string {
    switch (color) {
        case Color.Red:
            return "红色"
        case Color.Green:
            return "绿色"
        case Color.Blue:
            return "蓝色"
        default:
            const _exhaustive: never = color
            return _exhaustive
    }
}
```

---

## 枚举与 const 断言

**换行写法：使用 const 断言替代枚举**
`const <对象> = {`
`    <成员1>: <值1>,`
`    <成员2>: <值2>,`
`} as const`
`type <类型> = keyof typeof <对象>`

```typescript
// 使用 const 断言替代枚举
const Direction = {
    Up: "UP",
    Down: "DOWN",
    Left: "LEFT",
    Right: "RIGHT",
} as const

type Direction = keyof typeof Direction  // "Up" | "Down" | "Left" | "Right"
```

---

**基本写法：使用 const 断言对象**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用 const 断言对象
let direction: Direction = "Up"
```

---

## 枚举与映射

**换行写法：枚举值映射**
`const <映射>: Record<<枚举名>, <类型>> = {`
`    [<枚举名>.<成员1>]: <值1>,`
`    [<枚举名>.<成员2>]: <值2>,`
`}`

```typescript
// 枚举值映射
const ColorHex: Record<Color, string> = {
    [Color.Red]: "#FF0000",
    [Color.Green]: "#00FF00",
    [Color.Blue]: "#0000FF",
}
```

---

**基本写法：访问枚举映射**
`<映射>[<枚举名>.<成员>]`

```typescript
// 访问枚举映射
let hex: string = ColorHex[Color.Red]
```

---

## 枚举与类型守卫

**换行写法：枚举类型守卫**
`function <函数>(<参数>: any): <参数> is <枚举名> {`
`    return Object.values(<枚举名>).includes(<参数>)`
`}`

```typescript
// 枚举类型守卫
function is_color(value: any): value is Color {
    return Object.values(Color).includes(value)
}
```

---

**基本写法：使用枚举类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用枚举类型守卫
let value: any = "RED"
if (is_color(value)) {
    let color: Color = value
}
```

---

## 枚举与反向映射

**换行写法：字符串枚举反向映射**
`const <映射>: Record<string, <枚举名>> = {`
`    ["<值1>"]: <枚举名>.<成员1>,`
`    ["<值2>"]: <枚举名>.<成员2>,`
`}`

```typescript
// 字符串枚举反向映射
const ColorFromValue: Record<string, Color> = {
    ["RED"]: Color.Red,
    ["GREEN"]: Color.Green,
    ["BLUE"]: Color.Blue,
}
```

---

**基本写法：使用反向映射**
`let <变量>: <枚举名> = <映射>["<值>"]`

```typescript
// 使用反向映射
let color: Color = ColorFromValue["RED"]
```

---

## 枚举与迭代

**换行写法：迭代枚举值**
`for (const <值> of Object.values(<枚举名>)) { <语句> }`

```typescript
// 迭代枚举值
for (const color of Object.values(Color)) {
    console.log(color)
}
```

---

**换行写法：迭代枚举键值对**
`for (const [<键>, <值>] of Object.entries(<枚举名>)) { <语句> }`

```typescript
// 迭代枚举键值对
for (const [key, value] of Object.entries(Color)) {
    console.log(`${key}: ${value}`)
}
```

---

## 枚举与工具类型

**换行写法：获取枚举所有值**
`type <类型> = \`${<枚举名>}\``

```typescript
// 获取枚举所有值的联合类型
type ColorValues = `${Color}`  // "RED" | "GREEN" | "BLUE"
```

---

**换行写法：获取枚举所有键**
`type <类型> = keyof typeof <枚举名>`

```typescript
// 获取枚举所有键的联合类型
type ColorKeys = keyof typeof Color  // "Red" | "Green" | "Blue"
```

---

## 枚举与函数

**换行写法：枚举作为函数参数**
`function <函数>(<参数>: <枚举名>): <返回类型> { <语句> }`

```typescript
// 枚举作为函数参数
function get_color_code(color: Color): string {
    return color
}
```

---

**换行写法：枚举作为函数返回值**
`function <函数>(<参数>: <类型>): <枚举名> { <语句> }`

```typescript
// 枚举作为函数返回值
function parse_color(value: string): Color {
    switch (value) {
        case "RED": return Color.Red
        case "GREEN": return Color.Green
        case "BLUE": return Color.Blue
        default: throw new Error("Invalid color")
    }
}
```

---

## 枚举与接口

**换行写法：枚举与接口组合**
`interface <接口> {`
`    <属性>: <枚举名>`
`}`

```typescript
// 枚举与接口组合
interface User {
    name: string
    status: Status
}
```

---

**换行写法：枚举与类型别名**
`type <类型> = {`
`    <属性>: <枚举名>`
`}`

```typescript
// 枚举与类型别名组合
type Config = {
    color: Color
    direction: Direction
}
```
