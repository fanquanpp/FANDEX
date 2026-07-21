# 基础类型系统

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 原始类型

**基本写法：布尔类型**
`let <变量>: boolean = <值>`

```typescript
// 布尔类型
let is_active: boolean = true
```

---

**基本写法：数字类型**
`let <变量>: number = <值>`

```typescript
// 数字类型
let count: number = 42
```

---

**基本写法：字符串类型**
`let <变量>: string = <值>`

```typescript
// 字符串类型
let name: string = "Alice"
```

---

**基本写法：空值类型**
`let <变量>: void = undefined`

```typescript
// void 类型（通常用于函数返回值）
let unused: void = undefined
```

---

**基本写法：null 类型**
`let <变量>: null = null`

```typescript
// null 类型
let empty: null = null
```

---

**基本写法：undefined 类型**
`let <变量>: undefined = undefined`

```typescript
// undefined 类型
let not_defined: undefined = undefined
```

---

**基本写法：symbol 类型**
`let <变量>: symbol = Symbol(<描述>)`

```typescript
// symbol 类型
let unique_id: symbol = Symbol("id")
```

---

**基本写法：bigint 类型**
`let <变量>: bigint = <大整数>n`

```typescript
// bigint 类型
let large_number: bigint = 9007199254740991n
```

---

## 数组类型

**基本写法：使用类型加方括号**
`let <变量>: <类型>[] = [<值>]`

```typescript
// 数字数组
let numbers: number[] = [1, 2, 3]
```

---

**基本写法：使用泛型数组**
`let <变量>: Array<<类型>> = [<值>]`

```typescript
// 使用泛型语法的字符串数组
let names: Array<string> = ["Alice", "Bob"]
```

---

**换行写法：多行数组定义**
`let <变量>: <类型>[] = [`
`    <值1>,`
`    <值2>,`
`]`

```typescript
// 多行数组定义
let users: string[] = [
    "Alice",
    "Bob",
    "Charlie",
]
```

---

## 元组类型

**单行写法：定义元组**
`let <变量>: [<类型1>, <类型2>] = [<值1>, <值2>]`

```typescript
// 元组类型（固定长度和类型的数组）
let person: [string, number] = ["Alice", 30]
```

---

**换行写法：多元素元组**
`let <变量>: [`
`    <类型1>,`
`    <类型2>,`
`    <类型3>,`
`] = [<值1>, <值2>, <值3>]`

```typescript
// 多元素元组定义
let record: [
    string,
    number,
    boolean,
] = ["Alice", 30, true]
```

---

## 枚举类型

**换行写法：数字枚举**
`enum <枚举名> {`
`    <成员1>,`
`    <成员2>,`
`}`

```typescript
// 数字枚举
enum Direction {
    Up,
    Down,
    Left,
    Right,
}
```

---

**换行写法：字符串枚举**
`enum <枚举名> {`
`    <成员1> = "<值1>",`
`    <成员2> = "<值2>",`
`}`

```typescript
// 字符串枚举
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}
```

---

**基本写法：访问枚举成员**
`<枚举名>.<成员>`

```typescript
// 访问枚举成员
let direction: Direction = Direction.Up
```

---

## any 类型

**基本写法：使用 any 类型**
`let <变量>: any = <值>`

```typescript
// any 类型（允许任意类型赋值）
let data: any = "hello"
data = 123
```

---

## unknown 类型

**基本写法：使用 unknown 类型**
`let <变量>: unknown = <值>`

```typescript
// unknown 类型（安全的 any，使用前必须类型检查）
let value: unknown = "hello"
if (typeof value === "string") {
    console.log(value.toUpperCase())
}
```

---

## never 类型

**基本写法：使用 never 类型**
`function <函数>(): never { <语句> }`

```typescript
// never 类型（表示永不返回的函数）
function error(message: string): never {
    throw new Error(message)
}
```

---

**基本写法：无限循环返回 never**
`function <函数>(): never { while(true) {} }`

```typescript
// 无限循环返回 never
function infinite_loop(): never {
    while (true) {}
}
```

---

## object 类型

**基本写法：使用 object 类型**
`let <变量>: object = <对象>`

```typescript
// object 类型（表示非原始类型）
let obj: object = { name: "Alice" }
```

---

## 类型断言

**基本写法：使用尖括号断言**
`<<类型>><表达式>`

```typescript
// 尖括号语法类型断言
let value: any = "hello"
let length: number = (<string>value).length
```

---

**基本写法：使用 as 断言**
`<表达式> as <类型>`

```typescript
// as 语法类型断言
let value: any = "hello"
let length: number = (value as string).length
```

---

## 联合类型

**基本写法：联合类型**
`let <变量>: <类型1> | <类型2> = <值>`

```typescript
// 联合类型（可以是多种类型之一）
let id: string | number = 123
id = "ABC"
```

---

## 交叉类型

**基本写法：交叉类型**
`type <类型> = <类型1> & <类型2>`

```typescript
// 交叉类型（组合多个类型）
type Person = { name: string }
type Employee = { employee_id: number }
type Staff = Person & Employee
```

---

## 字面量类型

**基本写法：字符串字面量类型**
`let <变量>: "<值>" = "<值>"`

```typescript
// 字符串字面量类型
let direction: "left" = "left"
```

---

**基本写法：数字字面量类型**
`let <变量>: <数字> = <数字>`

```typescript
// 数字字面量类型
let dice: 6 = 6
```

---

## let 与 const

**基本写法：使用 let 声明变量**
`let <变量>: <类型> = <值>`

```typescript
// 使用 let 声明可变变量
let count: number = 0
count = 1
```

---

**基本写法：使用 const 声明常量**
`const <变量>: <类型> = <值>`

```typescript
// 使用 const 声明不可变常量
const PI: number = 3.14159
```

---

## 类型推断

**基本写法：自动类型推断**
`let <变量> = <值>`

```typescript
// 自动推断变量类型
let name = "Alice"  // 推断为 string
let count = 42      // 推断为 number
```

---

## 解构赋值类型

**基本写法：数组解构类型**
`let [<变量1>, <变量2>]: <类型>[] = <数组>`

```typescript
// 数组解构赋值
let [first, second]: number[] = [1, 2]
```

---

**基本写法：对象解构类型**
`let { <属性1>, <属性2> }: { <属性1>: <类型1>, <属性2>: <类型2> } = <对象>`

```typescript
// 对象解构赋值
let { name, age }: { name: string, age: number } = { name: "Alice", age: 30 }
```

---

## 函数类型

**基本写法：函数参数类型**
`function <函数名>(<参数>: <类型>): <返回类型> { <语句> }`

```typescript
// 函数参数和返回值类型注解
function add(a: number, b: number): number {
    return a + b
}
```

---

**基本写法：箭头函数类型**
`const <函数名> = (<参数>: <类型>): <返回类型> => <表达式>`

```typescript
// 箭头函数类型注解
const greet = (name: string): string => `Hello, ${name}`
```

---

**基本写法：可选参数**
`function <函数名>(<参数1>: <类型>, <参数2>?: <类型>): <返回类型> { <语句> }`

```typescript
// 可选参数（使用 ? 标记）
function greet(name: string, greeting?: string): string {
    return `${greeting || "Hello"}, ${name}`
}
```

---

**基本写法：默认参数**
`function <函数名>(<参数>: <类型> = <默认值>): <返回类型> { <语句> }`

```typescript
// 默认参数值
function greet(name: string = "World"): string {
    return `Hello, ${name}`
}
```

---

**基本写法：剩余参数**
`function <函数名>(...<参数>: <类型>[]): <返回类型> { <语句> }`

```typescript
// 剩余参数
function sum(...numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0)
}
```

---

## 类型别名

**基本写法：定义类型别名**
`type <别名> = <类型>`

```typescript
// 定义类型别名
type ID = string | number
```

---

## 可空类型

**基本写法：可空类型**
`let <变量>: <类型> | null = <值>`

```typescript
// 可空类型（值为指定类型或 null）
let name: string | null = "Alice"
name = null
```

---

## 可选链

**基本写法：使用可选链**
`<对象>?.<属性>`

```typescript
// 可选链操作符
let user: { name?: string } = {}
let name: string | undefined = user?.name
```

---

## 空值合并

**基本写法：使用空值合并**
`<值> ?? <默认值>`

```typescript
// 空值合并运算符
let name: string | null = null
let display_name: string = name ?? "Anonymous"
```
