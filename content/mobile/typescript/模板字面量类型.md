# 模板字面量类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本模板字面量类型

**基本写法：基本模板字面量类型**
`type <类型> = \`<前缀>\${<类型>}\``

```typescript
// 基本模板字面量类型
type Greeting = `hello ${string}`
```

---

**基本写法：使用模板字面量类型**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用模板字面量类型
let greeting: Greeting = "hello world"
```

---

## 联合类型模板字面量

**换行写法：联合类型模板字面量**
`type <类型> = \`<前缀>\${<类型1> | <类型2>}\``

```typescript
// 联合类型模板字面量
type Side = "left" | "right"
type Direction = `turn ${Side}`
```

---

**基本写法：使用联合类型模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用联合类型模板字面量
let direction: Direction = "turn left"
```

---

## 多变量模板字面量

**换行写法：多变量模板字面量**
`type <类型> = \`\${<类型1>}_\${<类型2>}\``

```typescript
// 多变量模板字面量
type Border = `${"top" | "bottom"}-${"left" | "right"}`
```

---

**基本写法：使用多变量模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用多变量模板字面量
let corner: Border = "top-left"
```

---

## 字符串操作类型

**基本写法：使用 Uppercase 转大写**
`type <类型> = Uppercase<<字符串类型>>`

```typescript
// 将字符串类型转为大写
type Upper = Uppercase<"hello">  // "HELLO"
```

---

**基本写法：使用 Lowercase 转小写**
`type <类型> = Lowercase<<字符串类型>>`

```typescript
// 将字符串类型转为小写
type Lower = Lowercase<"HELLO">  // "hello"
```

---

**基本写法：使用 Capitalize 首字母大写**
`type <类型> = Capitalize<<字符串类型>>`

```typescript
// 将字符串类型首字母大写
type Capitalized = Capitalize<"hello">  // "Hello"
```

---

**基本写法：使用 Uncapitalize 首字母小写**
`type <类型> = Uncapitalize<<字符串类型>>`

```typescript
// 将字符串类型首字母小写
type Uncapitalized = Uncapitalize<"Hello">  // "hello"
```

---

## 模板字面量与映射类型

**换行写法：使用模板字面量重映射键**
`type <类型><<T>> = {`
`    [P in keyof T as \`get_\${P & string}\`]: T[P]`
`}`

```typescript
// 使用模板字面量为键添加前缀
type Getters<T> = {
    [P in keyof T as `get_${P & string}`]: () => T[P]
}
```

---

**换行写法：使用 Capitalize 重映射键**
`type <类型><<T>> = {`
`    [P in keyof T as \`on\${Capitalize<P & string>}\`]: T[P]`
`}`

```typescript
// 使用 Capitalize 为键添加 on 前缀
type EventHandlers<T> = {
    [P in keyof T as `on${Capitalize<P & string>}`]: (value: T[P]) => void
}
```

---

## 模板字面量与 infer

**换行写法：使用 infer 推断模板字面量**
`type <类型> = <S> extends \`prefix_\${infer <T>}\` ? <T> : never`

```typescript
// 使用 infer 推断模板字面量中的类型
type RemovePrefix<S> = S extends `prefix_${infer T}` ? T : never
```

---

**换行写法：推断字符串前缀**
`type <类型> = <S> extends \`${infer <Prefix>}_suffix\` ? <Prefix> : never`

```typescript
// 推断字符串前缀
type GetPrefix<S> = S extends `${infer Prefix}_suffix` ? Prefix : never
```

---

**换行写法：推断字符串两部分**
`type <类型> = <S> extends \`${infer <First>}_\${infer <Second>}\` ? [<First>, <Second>] : never`

```typescript
// 推断字符串的两部分
type Split<S> = S extends `${infer First}_${infer Second}` ? [First, Second] : never
```

---

## 模板字面量实战

**换行写法：生成 getter 方法名**
`type <类型><<T>> = {`
`    [P in keyof T as \`get\${Capitalize<P & string>}\`]: () => T[P]`
`}`

```typescript
// 为所有属性生成 getter 方法名
type Getters<T> = {
    [P in keyof T as `get${Capitalize<P & string>}`]: () => T[P]
}
```

---

**换行写法：生成 setter 方法名**
`type <类型><<T>> = {`
`    [P in keyof T as \`set\${Capitalize<P & string>}\`]: (<值>: T[P]) => void`
`}`

```typescript
// 为所有属性生成 setter 方法名
type Setters<T> = {
    [P in keyof T as `set${Capitalize<P & string>}`]: (value: T[P]) => void
}
```

---

**换行写法：生成事件处理器**
`type <类型><<T>> = {`
`    [P in keyof T as \`on\${Capitalize<P & string>}\`]: (<值>: T[P]) => void`
`}`

```typescript
// 为所有属性生成事件处理器
type EventHandlers<T> = {
    [P in keyof T as `on${Capitalize<P & string>}`]: (value: T[P]) => void
}
```

---

## 模板字面量与联合类型

**换行写法：从联合类型生成字符串**
`type <类型> = \`\${<联合类型1>}_\${<联合类型2>}\``

```typescript
// 从联合类型生成所有组合
type Prefix = "get" | "set"
type Suffix = "Name" | "Age"
type MethodName = `${Prefix}${Suffix}`
```

---

**基本写法：使用联合类型模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用联合类型模板字面量
let method: MethodName = "getName"
```

---

## 模板字面量与条件类型

**换行写法：条件类型与模板字面量**
`type <类型> = <S> extends \`\${infer <T>}\` ? <T> : never`

```typescript
// 条件类型与模板字面量组合
type ExtractString<S> = S extends `${infer T}` ? T : never
```

---

**换行写法：检查字符串前缀**
`type <类型> = <S> extends \`prefix_\${string}\` ? true : false`

```typescript
// 检查字符串是否有指定前缀
type HasPrefix<S> = S extends `prefix_${string}` ? true : false
```

---

## 模板字面量与 keyof

**换行写法：从对象键生成事件名**
`type <类型> = \`on\${Capitalize<keyof <接口> & string>}\``

```typescript
// 从对象键生成事件名
interface User {
    name: string
    age: number
}

type UserEvent = `on${Capitalize<keyof User & string>}`
```

---

**基本写法：使用 keyof 模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用 keyof 模板字面量
let event: UserEvent = "onName"
```

---

## 模板字面量与递归

**换行写法：递归处理字符串**
`type <类型> = <S> extends \`${infer <First>}\${infer <Rest>}\` ? <处理> : <S>`

```typescript
// 递归处理字符串
type Reverse<S> = S extends `${infer First}${infer Rest}` ? `${Reverse<Rest>}${First}` : S
```

---

**换行写法：递归替换字符**
`type <类型> = <S> extends \`${infer <Before>}_\${infer <After>}\` ? <类型><\`${<Before>}-\${<After>}\`> : <S>`

```typescript
// 递归替换下划线为连字符
type Replace<S> = S extends `${infer Before}_${infer After}` ? Replace<`${Before}-${After}`> : S
```

---

## 模板字面量与类型推断

**换行写法：推断函数名**
`type <类型> = <F> extends \`\${infer <Prefix>}\${string}\` ? <Prefix> : never`

```typescript
// 推断函数名前缀
type GetPrefix<F> = F extends `${infer Prefix}${string}` ? Prefix : never
```

---

**换行写法：推断属性路径**
`type <类型> = <P> extends \`\${infer <First>}.\${infer <Rest>}\` ? <处理> : <P>`

```typescript
// 推断属性路径
type GetFirstPath<P> = P extends `${infer First}.${infer Rest}` ? First : P
```

---

## 模板字面量与对象

**换行写法：从对象生成配置类型**
`interface <接口> { <属性>: <类型> }`
`type <类型> = \`--\${<接口>["<属性>"]}\``

```typescript
// 从对象生成配置类型
interface Config {
    host: string
    port: number
}

type ConfigKey = `--${keyof Config}`
```

---

**基本写法：使用对象模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用对象模板字面量
let key: ConfigKey = "--host"
```

---

## 模板字面量与枚举

**换行写法：从枚举生成字符串**
`enum <枚举> { <成员1>, <成员2> }`
`type <类型> = \`\${<枚举>}\``

```typescript
// 从枚举生成字符串类型
enum Status {
    Active = "ACTIVE",
    Inactive = "INACTIVE",
}

type StatusString = `${Status}`
```

---

**基本写法：使用枚举模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用枚举模板字面量
let status: StatusString = "ACTIVE"
```

---

## 模板字面量与工具类型

**换行写法：实现 Join 工具类型**
`type <类型> = <T extends string[], <分隔符> extends string> =`
`    <T> extends [infer <First>, ...infer <Rest>]`
`    ? <Rest> extends [] ? <First> : \`\${<First>}\${<分隔符>}\${<类型><<Rest>, <分隔符>>}\``
`    : never`

```typescript
// 实现 Join 工具类型
type Join<T extends string[], D extends string> =
    T extends [infer First, ...infer Rest]
    ? Rest extends [] ? First : `${First & string}${D}${Join<Rest, D>}`
    : never
```

---

**换行写法：实现 Split 工具类型**
`type <类型> = <S extends string, <分隔符> extends string> =`
`    <S> extends \`${infer <First>}\${<分隔符>}\${infer <Rest>}\``
`    ? [<First>, ...<类型><<Rest>, <分隔符>>]`
`    : [<S>]`

```typescript
// 实现 Split 工具类型
type Split<S extends string, D extends string> =
    S extends `${infer First}${D}${infer Rest}`
    ? [First, ...Split<Rest, D>]
    : [S]
```

---

## 模板字面量与路径

**换行写法：生成属性路径**
`type <类型><<T>> = <T> extends object`
`    ? { [P in keyof T & string]: \`\${P}.\${<类型><T[P]>>}\` }[keyof T]`
`    : never`

```typescript
// 生成嵌套属性路径
type Path<T> = T extends object
    ? { [P in keyof T & string]: `${P}.${Path<T[P]>}` }[keyof T]
    : never
```

---

**换行写法：生成简单属性路径**
`type <类型><<T>> = <T> extends object`
`    ? { [P in keyof T & string]: P }[keyof T]`
`    : never`

```typescript
// 生成简单属性路径
type SimplePath<T> = T extends object
    ? { [P in keyof T & string]: P }[keyof T]
    : never
```

---

## 模板字面量与 CSS

**换行写法：生成 CSS 属性名**
`type <类型> = \`\${<属性>}-\${<值>}\``

```typescript
// 生成 CSS 属性名
type Property = "margin" | "padding"
type Side = "top" | "bottom" | "left" | "right"
type CSSProperty = `${Property}-${Side}`
```

---

**基本写法：使用 CSS 模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用 CSS 模板字面量
let css: CSSProperty = "margin-top"
```

---

## 模板字面量与 API

**换行写法：生成 API 路径**
`type <类型> = \`/api/\${<路径>}\``

```typescript
// 生成 API 路径
type Endpoint = "users" | "posts" | "comments"
type APIPath = `/api/${Endpoint}`
```

---

**基本写法：使用 API 模板字面量**
`let <变量>: <类型> = "<值>"`

```typescript
// 使用 API 模板字面量
let path: APIPath = "/api/users"
```
