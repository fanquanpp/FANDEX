# 映射类型与键重映射

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本映射类型

**换行写法：基本映射类型**
`type <类型><<T>> = {`
`    [P in keyof T]: T[P]`
`}`

```typescript
// 基本映射类型（复制类型）
type Copy<T> = {
    [P in keyof T]: T[P]
}
```

---

**换行写法：使用映射类型**
`type <别名> = <类型><<接口>>`

```typescript
// 使用映射类型
interface User {
    name: string
    age: number
}

type UserCopy = Copy<User>
```

---

## 修改属性类型

**换行写法：映射类型修改属性类型**
`type <类型><<T>> = {`
`    [P in keyof T]: <新类型>`
`}`

```typescript
// 映射类型将所有属性改为 string
type Stringify<T> = {
    [P in keyof T]: string
}
```

---

**换行写法：映射类型将属性改为可选**
`type <类型><<T>> = {`
`    [P in keyof T]?: T[P]`
`}`

```typescript
// 映射类型将所有属性改为可选
type MyPartial<T> = {
    [P in keyof T]?: T[P]
}
```

---

**换行写法：映射类型将属性改为只读**
`type <类型><<T>> = {`
`    readonly [P in keyof T]: T[P]`
`}`

```typescript
// 映射类型将所有属性改为只读
type MyReadonly<T> = {
    readonly [P in keyof T]: T[P]
}
```

---

## 移除修饰符

**换行写法：移除只读修饰符**
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

**换行写法：移除可选修饰符**
`type <类型><<T>> = {`
`    [P in keyof T]-?: T[P]`
`}`

```typescript
// 移除可选修饰符
type Required<T> = {
    [P in keyof T]-?: T[P]
}
```

---

## 键重映射 as

**换行写法：使用 as 重映射键**
`type <类型><<T>> = {`
`    [P in keyof T as <新键>]: T[P]`
`}`

```typescript
// 使用 as 重映射键（将键转为大写）
type GetKeys<T> = {
    [P in keyof T as Uppercase<string & P>]: T[P]
}
```

---

**换行写法：使用 as 添加前缀**
`type <类型><<T>> = {`
`    [P in keyof T as \`get_\${P & string}\`]: T[P]`
`}`

```typescript
// 使用 as 为键添加前缀
type Getters<T> = {
    [P in keyof T as `get_${P & string}`]: () => T[P]
}
```

---

**换行写法：使用 as 过滤键**
`type <类型><<T>> = {`
`    [P in keyof T as <条件> extends <真> ? <P> : never]: T[P]`
`}`

```typescript
// 使用 as 过滤键（只保留 string 类型的键）
type StringKeys<T> = {
    [P in keyof T as P extends string ? P : never]: T[P]
}
```

---

## 映射类型与条件类型

**换行写法：映射类型与条件类型组合**
`type <类型><<T>> = {`
`    [P in keyof T]: T[P] extends <条件> ? <真类型> : <假类型>`
`}`

```typescript
// 映射类型与条件类型组合
type StringifyStrings<T> = {
    [P in keyof T]: T[P] extends string ? string : never
}
```

---

## 内置工具类型

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

## 自定义映射类型

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

**换行写法：实现 Getters**
`type <类型><<T>> = {`
`    [P in keyof T as \`get_\${P & string}\`]: () => T[P]`
`}`

```typescript
// 为所有属性生成 getter 方法
type Getters<T> = {
    [P in keyof T as `get_${P & string}`]: () => T[P]
}
```

---

**换行写法：实现 Setters**
`type <类型><<T>> = {`
`    [P in keyof T as \`set_\${P & string}\`]: (<值>: T[P]) => void`
`}`

```typescript
// 为所有属性生成 setter 方法
type Setters<T> = {
    [P in keyof T as `set_${P & string}`]: (value: T[P]) => void
}
```

---

## 映射类型与联合类型

**换行写法：从联合类型创建映射类型**
`type <类型> = {`
`    [P in <联合类型>]: <类型>`
`}`

```typescript
// 从联合类型创建映射类型
type Events = "click" | "hover" | "focus"

type EventHandlers = {
    [P in Events]: (event: string) => void
}
```

---

**换行写法：从枚举创建映射类型**
`type <类型> = {`
`    [P in <枚举>]: <类型>`
`}`

```typescript
// 从枚举创建映射类型
enum Status {
    Idle = "IDLE",
    Loading = "LOADING",
}

type StatusMessages = {
    [P in Status]: string
}
```

---

## 键重映射实战

**换行写法：将键转为大写**
`type <类型><<T>> = {`
`    [P in keyof T as Uppercase<P & string>]: T[P]`
`}`

```typescript
// 将所有键转为大写
type UppercaseKeys<T> = {
    [P in keyof T as Uppercase<P & string>]: T[P]
}
```

---

**换行写法：将键转为小写**
`type <类型><<T>> = {`
`    [P in keyof T as Lowercase<P & string>]: T[P]`
`}`

```typescript
// 将所有键转为小写
type LowercaseKeys<T> = {
    [P in keyof T as Lowercase<P & string>]: T[P]
}
```

---

**换行写法：过滤特定类型的键**
`type <类型><<T>> = {`
`    [P in keyof T as T[P] extends <条件> ? <P> : never]: T[P]`
`}`

```typescript
// 只保留 string 类型的属性
type StringProperties<T> = {
    [P in keyof T as T[P] extends string ? P : never]: T[P]
}
```

---

**换行写法：过滤函数类型的键**
`type <类型><<T>> = {`
`    [P in keyof T as T[P] extends Function ? <P> : never]: T[P]`
`}`

```typescript
// 只保留函数类型的属性
type Methods<T> = {
    [P in keyof T as T[P] extends Function ? P : never]: T[P]
}
```

---

## 映射类型与模板字面量

**换行写法：使用模板字面量重映射键**
`type <类型><<T>> = {`
`    [P in keyof T as \`on\${Capitalize<P & string>}\`]: T[P]`
`}`

```typescript
// 使用模板字面量为键添加 on 前缀
type EventHandlers<T> = {
    [P in keyof T as `on${Capitalize<P & string>}`]: (value: T[P]) => void
}
```

---

## 同态映射类型

**换行写法：同态映射类型**
`type <类型><<T>> = {`
`    [P in keyof T]: T[P]`
`}`

```typescript
// 同态映射类型（保留修饰符）
type Homomorphic<T> = {
    [P in keyof T]: T[P]
}
```

---

## 非同态映射类型

**换行写法：非同态映射类型**
`type <类型> = {`
`    [P in <联合类型>]: <类型>`
`}`

```typescript
// 非同态映射类型（不保留修饰符）
type NonHomomorphic = {
    [P in "a" | "b" | "c"]: string
}
```

---

## 映射类型与 keyof

**换行写法：使用 keyof 过滤键**
`type <类型><<T>, <K>> = {`
`    [P in keyof T as P extends <K> ? <P> : never]: T[P]`
`}`

```typescript
// 使用 keyof 过滤键
type PickByType<T, U> = {
    [P in keyof T as T[P] extends U ? P : never]: T[P]
}
```

---

**换行写法：使用 PickByType**
`type <别名> = <类型><<接口>, <类型>>`

```typescript
// 使用 PickByType 过滤特定类型的属性
interface User {
    name: string
    age: number
    email: string
}

type StringProps = PickByType<User, string>  // { name: string, email: string }
```

---

## 映射类型与 never

**换行写法：使用 never 过滤属性**
`type <类型><<T>> = {`
`    [P in keyof T as <条件> ? <P> : never]: T[P]`
`}`

```typescript
// 使用 never 过滤属性
type RemoveMethods<T> = {
    [P in keyof T as T[P] extends Function ? never : P]: T[P]
}
```

---

## 映射类型与递归

**换行写法：递归映射类型**
`type <类型><<T>> = {`
`    [P in keyof T]: T[P] extends object ? <类型><T[P]> : T[P]`
`}`

```typescript
// 递归映射类型
type DeepCopy<T> = {
    [P in keyof T]: T[P] extends object ? DeepCopy<T[P]> : T[P]
}
```

---

## 映射类型与可选链

**换行写法：处理可选属性**
`type <类型><<T>> = {`
`    [P in keyof T]-?: T[P]`
`}`

```typescript
// 移除可选修饰符
type NonNullable<T> = {
    [P in keyof T]-?: T[P]
}
```

---

## 映射类型与联合类型键

**换行写法：从联合类型创建对象**
`type <类型> = {`
`    [P in <联合类型>]: <类型>`
`}`

```typescript
// 从联合类型创建对象类型
type Direction = "up" | "down" | "left" | "right"

type DirectionValues = {
    [P in Direction]: number
}
```

---

**换行写法：从字面量联合类型创建映射**
`type <类型> = {`
`    [P in "<值1>" | "<值2>"]: <类型>`
`}`

```typescript
// 从字面量联合类型创建映射类型
type Config = {
    [P in "host" | "port" | "timeout"]: string
}
```
