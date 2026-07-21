# 条件类型与infer

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本条件类型

**基本写法：基本条件类型**
`type <类型> = <T> extends <条件> ? <真类型> : <假类型>`

```typescript
// 基本条件类型
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

## 分布式条件类型

**基本写法：分布式条件类型**
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

**基本写法：阻止分布式条件类型**
`type <类型><<T>> = [<T>] extends [<条件>] ? <真类型> : <假类型>`

```typescript
// 阻止分布式条件类型（使用方括号包裹）
type ToArrayAll<T> = [T] extends [any] ? T[] : never
```

---

## infer 基础

**基本写法：使用 infer 推断类型**
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

## infer 推断元组

**基本写法：推断元组第一个元素**
`type <类型> = <T> extends [infer <First>, ...any[]] ? <First> : never`

```typescript
// 推断元组第一个元素类型
type GetFirst<T extends any[]> = T extends [infer First, ...any[]] ? First : never
```

---

**基本写法：推断元组最后一个元素**
`type <类型> = <T> extends [...any[], infer <Last>] ? <Last> : never`

```typescript
// 推断元组最后一个元素类型
type GetLast<T extends any[]> = T extends [...any[], infer Last] ? Last : never
```

---

**换行写法：推断元组所有元素**
`type <类型> = <T> extends [infer <First>, ...infer <Rest>]`
`    ? [<First>, ...<类型><<Rest>>]`
`    : []`

```typescript
// 递归推断元组所有元素类型
type ToTuple<T extends any[]> = T extends [infer First, ...infer Rest]
    ? [First, ...ToTuple<Rest>]
    : []
```

---

## infer 推断对象

**基本写法：推断对象属性类型**
`type <类型> = <T> extends { <属性>: infer <U> } ? <U> : never`

```typescript
// 推断对象属性的类型
type GetPropertyType<T> = T extends { value: infer U } ? U : never
```

---

**换行写法：推断构造函数实例类型**
`type <类型> = <T> extends new (...args: any[]) => infer <Instance> ? <Instance> : never`

```typescript
// 推断构造函数的实例类型
type GetInstance<T> = T extends new (...args: any[]) => infer Instance ? Instance : never
```

---

## 条件类型组合

**换行写法：嵌套条件类型**
`type <类型> =`
`    <T> extends string ? <处理1> :`
`    <T> extends number ? <处理2> :`
`    <处理3>`

```typescript
// 嵌套条件类型
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    "other"
```

---

**基本写法：使用嵌套条件类型**
`type <别名> = <类型函数><<参数类型>>`

```typescript
// 使用嵌套条件类型
type Name1 = TypeName<string>  // "string"
type Name2 = TypeName<number>  // "number"
```

---

## 条件类型与联合类型

**基本写法：条件类型过滤联合类型**
`type <类型> = <T> extends <条件> ? <T> : never`

```typescript
// 条件类型过滤联合类型
type ExtractString<T> = T extends string ? T : never
```

---

**基本写法：使用条件类型过滤**
`type <别名> = <类型函数><<联合类型>>`

```typescript
// 使用条件类型过滤联合类型
type Result = ExtractString<string | number | boolean>  // string
```

---

## Exclude 与 Extract

**基本写法：使用 Exclude 排除类型**
`type <别名> = Exclude<<联合类型>, <排除类型>>`

```typescript
// 使用 Exclude 排除特定类型
type T = Exclude<string | number | boolean, boolean>
```

---

**基本写法：使用 Extract 提取类型**
`type <别名> = Extract<<联合类型>, <匹配类型>>`

```typescript
// 使用 Extract 提取符合条件的类型
type T = Extract<string | number | boolean, string | number>
```

---

## NonNullable

**基本写法：使用 NonNullable 排除 null**
`type <别名> = NonNullable<<类型>>`

```typescript
// 使用 NonNullable 排除 null 和 undefined
type T = NonNullable<string | null | undefined>
```

---

## ReturnType 与 Parameters

**基本写法：使用 ReturnType 获取返回类型**
`type <别名> = ReturnType<typeof <函数>>`

```typescript
// 从函数推断返回类型
function get_user() {
    return { name: "Alice", age: 30 }
}

type User = ReturnType<typeof get_user>
```

---

**基本写法：使用 Parameters 获取参数类型**
`type <别名> = Parameters<typeof <函数>>`

```typescript
// 从函数推断参数类型
function greet(name: string, age: number): void {}

type GreetParams = Parameters<typeof greet>  // [string, number]
```

---

**基本写法：使用 ConstructorParameters 获取构造函数参数**
`type <别名> = ConstructorParameters<typeof <类>>`

```typescript
// 从类推断构造函数参数类型
class User {
    constructor(public name: string, public age: number) {}
}

type UserParams = ConstructorParameters<typeof User>
```

---

**基本写法：使用 InstanceType 获取实例类型**
`type <别名> = InstanceType<typeof <类>>`

```typescript
// 从类推断实例类型
type UserInstance = InstanceType<typeof User>
```

---

## 条件类型与映射类型

**换行写法：条件类型与映射类型组合**
`type <类型><<T>> = {`
`    [P in keyof T]: T[P] extends <条件> ? <真类型> : <假类型>`
`}`

```typescript
// 条件类型与映射类型组合
type StringifyStrings<T> = {
    [P in keyof T]: T[P] extends string ? string : never
}
```

---

## 递归条件类型

**换行写法：递归条件类型**
`type <类型> = <T> extends Promise<infer <U>> ? <类型><<U>> : <T>`

```typescript
// 递归条件类型（处理嵌套 Promise）
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T
```

---

**换行写法：递归展平元组**
`type <类型> = <T> extends [infer <First>, ...infer <Rest>]`
`    ? <First> extends any[] ? [...<类型><<First>>, ...<类型><<Rest>>]`
`    : [<First>, ...<类型><<Rest>>]`
`    : []`

```typescript
// 递归展平嵌套元组
type Flatten<T extends any[]> = T extends [infer First, ...infer Rest]
    ? First extends any[] ? [...Flatten<First>, ...Flatten<Rest>]
    : [First, ...Flatten<Rest>]
    : []
```

---

## 条件类型推断函数重载

**换行写法：推断重载函数返回类型**
`type <类型> = <T> extends (...args: any[]) => infer <R> ? <R> : never`

```typescript
// 推断重载函数的返回类型（取最后一个重载）
type GetOverloadReturn<T> = T extends (...args: any[]) => infer R ? R : never
```

---

## infer 与模板字面量

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

## 条件类型实战

**换行写法：实现 DeepPartial**
`type <类型><<T>> = {`
`    [P in keyof T]?: T[P] extends object ? <类型><T[P]> : T[P]`
`}`

```typescript
// 实现深度可选类型
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

---

**换行写法：实现 DeepReadonly**
`type <类型><<T>> = {`
`    readonly [P in keyof T]: T[P] extends object ? <类型><T[P]> : T[P]`
`}`

```typescript
// 实现深度只读类型
type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}
```

---

**换行写法：实现 Mutable**
`type <类型><<T>> = {`
`    -readonly [P in keyof T]: T[P]`
`}`

```typescript
// 移除只读修饰符
type Mutable<T> = {
    -readonly [P in keyof T]: T[P]
}
```

---

## 条件类型与 never

**基本写法：使用 never 过滤**
`type <类型> = <T> extends <条件> ? <T> : never`

```typescript
// 使用 never 过滤不符合条件的类型
type FilterString<T> = T extends string ? T : never
```

---

**基本写法：使用 never 过滤联合类型**
`type <别名> = <类型函数><<联合类型>>`

```typescript
// 使用 never 过滤联合类型
type Result = FilterString<string | number | boolean>  // string
```

---

## 条件类型与函数推断

**换行写法：推断异步函数返回类型**
`type <类型> = <T> extends (...args: any[]) => Promise<infer <R>> ? <R> : never`

```typescript
// 推断异步函数的返回类型
type AsyncReturnType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never
```

---

**换行写法：推断函数第一个参数类型**
`type <类型> = <T> extends (<参数>: infer <P>, ...args: any[]) => any ? <P> : never`

```typescript
// 推断函数第一个参数类型
type FirstParameter<T> = T extends (first: infer P, ...args: any[]) => any ? P : never
```
