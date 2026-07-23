# 索引签名与动态属性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 字符串索引签名

**换行写法：定义字符串索引签名**
`interface <接口名> {`
`    [key: string]: <类型>`
`}`

```typescript
// 字符串索引签名
interface StringArray {
    [index: string]: string
}
```

---

**基本写法：使用字符串索引签名**
`let <变量>: <接口名> = { <键>: <值> }`

```typescript
// 使用字符串索引签名
let colors: StringArray = {
    red: "#FF0000",
    green: "#00FF00",
}
```

---

**基本写法：通过索引访问**
`<对象>[<键>]`

```typescript
// 通过字符串索引访问
let color: string = colors["red"]
```

---

## 数字索引签名

**换行写法：定义数字索引签名**
`interface <接口名> {`
`    [index: number]: <类型>`
`}`

```typescript
// 数字索引签名
interface NumberArray {
    [index: number]: string
}
```

---

**基本写法：使用数字索引签名**
`let <变量>: <接口名> = [<值>]`

```typescript
// 使用数字索引签名
let names: NumberArray = ["Alice", "Bob", "Charlie"]
```

---

**基本写法：通过数字索引访问**
`<对象>[<索引>]`

```typescript
// 通过数字索引访问
let name: string = names[0]
```

---

## 混合索引签名

**换行写法：混合字符串和数字索引签名**
`interface <接口名> {`
`    [key: string]: <类型>`
`    [key: number]: <类型>`
`}`

```typescript
// 混合字符串和数字索引签名
interface MixedArray {
    [index: string]: string
    [index: number]: string
}
```

---

**基本写法：使用混合索引签名**
`let <变量>: <接口名> = [<值>]`

```typescript
// 使用混合索引签名
let mixed: MixedArray = ["Alice", "Bob"]
```

---

## 索引签名与已知属性

**换行写法：索引签名与已知属性共存**
`interface <接口名> {`
`    <属性>: <类型>`
`    [key: string]: <类型>`
`}`

```typescript
// 索引签名与已知属性共存（已知属性类型必须兼容索引签名类型）
interface User {
    name: string
    age: number
    [key: string]: string | number
}
```

---

**基本写法：使用带已知属性的索引签名**
`let <变量>: <接口名> = { <属性>: <值>, <动态键>: <值> }`

```typescript
// 使用带已知属性的索引签名
let user: User = {
    name: "Alice",
    age: 30,
    email: "alice@example.com",
}
```

---

## 索引签名与 readonly

**换行写法：只读索引签名**
`interface <接口名> {`
`    readonly [key: string]: <类型>`
`}`

```typescript
// 只读索引签名
interface ReadonlyConfig {
    readonly [key: string]: string
}
```

---

**基本写法：使用只读索引签名**
`let <变量>: <接口名> = { <键>: <值> }`

```typescript
// 使用只读索引签名
let config: ReadonlyConfig = {
    host: "localhost",
    port: "8080",
}
```

---

## Record 工具类型

**基本写法：使用 Record 创建索引类型**
`type <类型> = Record<<键类型>, <值类型>>`

```typescript
// 使用 Record 创建索引类型
type ColorMap = Record<string, string>
```

---

**基本写法：使用 Record 类型**
`let <变量>: <类型> = { <键>: <值> }`

```typescript
// 使用 Record 类型
let colors: ColorMap = {
    red: "#FF0000",
    green: "#00FF00",
}
```

---

**换行写法：Record 与字面量键类型**
`type <类型> = Record<<"<键1>" | "<键2>", <值类型>>`

```typescript
// Record 与字面量键类型
type UserProperties = Record<"name" | "age", string>
```

---

**基本写法：使用字面量键 Record**
`let <变量>: <类型> = { <键>: <值> }`

```typescript
// 使用字面量键 Record
let props: UserProperties = {
    name: "Alice",
    age: "30",
}
```

---

## 动态属性访问

**基本写法：使用方括号访问动态属性**
`<对象>[<变量>]`

```typescript
// 使用方括号访问动态属性
let key: string = "name"
let user: Record<string, any> = { name: "Alice" }
let value: any = user[key]
```

---

**基本写法：使用变量作为键**
`let <变量> = <对象>[<键变量>]`

```typescript
// 使用变量作为键访问属性
let property: string = "age"
let user: Record<string, number> = { age: 30 }
let age: number = user[property]
```

---

## 索引签名与类型推断

**换行写法：索引签名类型推断**
`function <函数>(<参数>: <接口>): <返回类型> {`
`    return <参数>[<键>]`
`}`

```typescript
// 索引签名类型推断
function get_property(obj: Record<string, number>, key: string): number {
    return obj[key]
}
```

---

**基本写法：使用索引签名函数**
`let <变量> = <函数>(<对象>, "<键>")`

```typescript
// 使用索引签名函数
let user: Record<string, number> = { age: 30, score: 95 }
let age: number = get_property(user, "age")
```

---

## 索引签名与映射类型

**换行写法：索引签名与映射类型**
`type <类型><<T>> = {`
`    [P in keyof T]: <类型>`
`}`

```typescript
// 索引签名与映射类型
type Stringify<T> = {
    [P in keyof T]: string
}
```

---

**基本写法：使用映射类型**
`type <别名> = <类型><<接口>>`

```typescript
// 使用映射类型
interface User {
    name: string
    age: number
}

type StringUser = Stringify<User>
```

---

## 索引签名与 Partial

**基本写法：使用 Partial 使索引签名可选**
`type <别名> = Partial<<接口>>`

```typescript
// 使用 Partial 使索引签名可选
interface Config {
    host: string
    port: number
}

type PartialConfig = Partial<Config>
```

---

**基本写法：使用 Partial 索引签名**
`let <变量>: <别名> = { <属性>: <值> }`

```typescript
// 使用 Partial 索引签名
let config: PartialConfig = {
    host: "localhost",
}
```

---

## 索引签名与 Pick

**基本写法：使用 Pick 选取部分属性**
`type <别名> = Pick<<接口>, "<属性1>" | "<属性2>">`

```typescript
// 使用 Pick 选取部分属性
interface User {
    name: string
    age: number
    email: string
}

type UserBasic = Pick<User, "name" | "age">
```

---

**基本写法：使用 Pick 类型**
`let <变量>: <别名> = { <属性>: <值> }`

```typescript
// 使用 Pick 类型
let user: UserBasic = {
    name: "Alice",
    age: 30,
}
```

---

## 索引签名与 Omit

**基本写法：使用 Omit 排除属性**
`type <别名> = Omit<<接口>, "<属性>">`

```typescript
// 使用 Omit 排除属性
type UserWithoutAge = Omit<User, "age">
```

---

**基本写法：使用 Omit 类型**
`let <变量>: <别名> = { <属性>: <值> }`

```typescript
// 使用 Omit 类型
let user: UserWithoutAge = {
    name: "Alice",
    email: "alice@example.com",
}
```

---

## 索引签名与 keyof

**基本写法：使用 keyof 获取键类型**
`type <类型> = keyof <接口>`

```typescript
// 使用 keyof 获取键类型
interface User {
    name: string
    age: number
}

type UserKey = keyof User  // "name" | "age"
```

---

**基本写法：使用 keyof 约束**
`function <函数><<K> extends keyof <接口>>(<参数>: <接口>, <键>: <K>): <返回类型> { <语句> }`

```typescript
// 使用 keyof 约束函数参数
function get_property<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}
```

---

**基本写法：使用 keyof 约束函数**
`let <变量> = <函数>(<对象>, "<属性>")`

```typescript
// 使用 keyof 约束函数
let user: User = { name: "Alice", age: 30 }
let name: string = get_property(user, "name")
```

---

## 索引签名与 in 操作符

**基本写法：使用 in 检查属性存在**
`if ("<属性>" in <对象>) { <语句> }`

```typescript
// 使用 in 检查属性是否存在
let user: Record<string, any> = { name: "Alice" }
if ("name" in user) {
    console.log(user.name)
}
```

---

**基本写法：使用 in 检查动态属性**
`if (<键变量> in <对象>) { <语句> }`

```typescript
// 使用 in 检查动态属性
let key: string = "age"
let user: Record<string, any> = { name: "Alice" }
if (key in user) {
    console.log(user[key])
}
```

---

## 索引签名与 delete

**基本写法：使用 delete 删除属性**
`delete <对象>[<键>]`

```typescript
// 使用 delete 删除属性
let user: Record<string, any> = { name: "Alice", age: 30 }
delete user["age"]
```

---

**基本写法：使用 delete 删除动态属性**
`delete <对象>[<键变量>]`

```typescript
// 使用 delete 删除动态属性
let key: string = "email"
let user: Record<string, any> = { name: "Alice", email: "alice@example.com" }
delete user[key]
```

---

## 索引签名与遍历

**换行写法：遍历索引签名对象**
`for (const <键> in <对象>) { <语句> }`

```typescript
// 遍历索引签名对象
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
for (const key in user) {
    console.log(`${key}: ${user[key]}`)
}
```

---

**换行写法：使用 Object.keys 遍历**
`for (const <键> of Object.keys(<对象>)) { <语句> }`

```typescript
// 使用 Object.keys 遍历
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
for (const key of Object.keys(user)) {
    console.log(`${key}: ${user[key]}`)
}
```

---

**换行写法：使用 Object.entries 遍历**
`for (const [<键>, <值>] of Object.entries(<对象>)) { <语句> }`

```typescript
// 使用 Object.entries 遍历
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
for (const [key, value] of Object.entries(user)) {
    console.log(`${key}: ${value}`)
}
```

---

## 索引签名与 Object 方法

**基本写法：使用 Object.keys 获取键**
`Object.keys(<对象>)`

```typescript
// 使用 Object.keys 获取所有键
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
let keys: string[] = Object.keys(user)
```

---

**基本写法：使用 Object.values 获取值**
`Object.values(<对象>)`

```typescript
// 使用 Object.values 获取所有值
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
let values: string[] = Object.values(user)
```

---

**基本写法：使用 Object.entries 获取键值对**
`Object.entries(<对象>)`

```typescript
// 使用 Object.entries 获取所有键值对
let user: Record<string, string> = { name: "Alice", email: "alice@example.com" }
let entries: [string, string][] = Object.entries(user)
```

---

## 索引签名与扩展运算符

**基本写法：使用扩展运算符合并对象**
`{ ...<对象1>, ...<对象2> }`

```typescript
// 使用扩展运算符合并对象
let defaults: Record<string, any> = { host: "localhost", port: 8080 }
let overrides: Record<string, any> = { port: 3000 }
let config = { ...defaults, ...overrides }
```

---

**基本写法：使用扩展运算符复制对象**
`let <变量> = { ...<对象> }`

```typescript
// 使用扩展运算符复制对象
let original: Record<string, any> = { name: "Alice", age: 30 }
let copy = { ...original }
```

---

## 索引签名与可选属性

**换行写法：索引签名与可选属性**
`interface <接口名> {`
`    <属性>?: <类型>`
`    [key: string]: <类型> | undefined`
`}`

```typescript
// 索引签名与可选属性
interface Config {
    host?: string
    port?: number
    [key: string]: string | number | undefined
}
```

---

**基本写法：使用可选属性索引签名**
`let <变量>: <接口名> = { <属性>: <值> }`

```typescript
// 使用可选属性索引签名
let config: Config = {
    host: "localhost",
    custom_setting: "value",
}
```

---

## 索引签名与类型守卫

**换行写法：索引签名与类型守卫**
`function <函数>(<参数>: Record<string, unknown>): <参数> is Record<string, <类型>> {`
`    return <检查>`
`}`

```typescript
// 索引签名与类型守卫
function is_string_record(value: Record<string, unknown>): value is Record<string, string> {
    return Object.values(value).every(v => typeof v === "string")
}
```

---

**基本写法：使用索引签名类型守卫**
`if (<函数>(<值>)) { <语句> }`

```typescript
// 使用索引签名类型守卫
let data: Record<string, unknown> = { name: "Alice", city: "NYC" }
if (is_string_record(data)) {
    Object.values(data).forEach(v => console.log(v.toUpperCase()))
}
```

---

## 索引签名与 Map

**换行写法：使用 Map 替代索引签名**
`let <变量>: Map<<键类型>, <值类型>> = new Map()`

```typescript
// 使用 Map 替代索引签名
let user_map: Map<string, string> = new Map()
user_map.set("name", "Alice")
user_map.set("email", "alice@example.com")
```

---

**基本写法：访问 Map**
`<Map>.get(<键>)`

```typescript
// 访问 Map
let name: string | undefined = user_map.get("name")
```

---

**换行写法：遍历 Map**
`for (const [<键>, <值>] of <Map>) { <语句> }`

```typescript
// 遍历 Map
for (const [key, value] of user_map) {
    console.log(`${key}: ${value}`)
}
```

---

## 索引签名与 WeakMap

**换行写法：使用 WeakMap**
`let <变量>: WeakMap<<对象类型>, <值类型>> = new WeakMap()`

```typescript
// 使用 WeakMap（键必须是对象）
let metadata: WeakMap<object, string> = new WeakMap()
let user = { name: "Alice" }
metadata.set(user, "admin")
```

---

**基本写法：访问 WeakMap**
`<WeakMap>.get(<对象>)`

```typescript
// 访问 WeakMap
let role: string | undefined = metadata.get(user)
```

---

## 索引签名与动态键

**换行写法：使用计算属性名**
`let <变量>: <接口> = {`
`    [<表达式>]: <值>,`
`}`

```typescript
// 使用计算属性名
let key: string = "dynamic_key"
let obj: Record<string, string> = {
    [key]: "value",
}
```

---

**基本写法：使用模板字面量作为键**
`let <变量>: <接口> = { [\`prefix_\${<变量>}\`]: <值> }`

```typescript
// 使用模板字面量作为键
let prefix: string = "user"
let obj: Record<string, string> = {
    [`${prefix}_name`]: "Alice",
}
```

---

## 索引签名与 JSON

**基本写法：使用 JSON.parse 解析**
`JSON.parse(<字符串>) as <接口>`

```typescript
// 使用 JSON.parse 解析为索引签名类型
let json: string = '{"name": "Alice", "age": 30}'
let user: Record<string, any> = JSON.parse(json)
```

---

**基本写法：使用 JSON.stringify 序列化**
`JSON.stringify(<对象>)`

```typescript
// 使用 JSON.stringify 序列化索引签名对象
let user: Record<string, any> = { name: "Alice", age: 30 }
let json: string = JSON.stringify(user)
```

---

## 索引签名与 Proxy

**换行写法：使用 Proxy 拦截属性访问**
`let <变量> = new Proxy(<目标>, {`
`    get(<目标>, <键>) { return <值> }`
`    set(<目标>, <键>, <值>) { return <布尔值> }`
`})`

```typescript
// 使用 Proxy 拦截属性访问
let handler: ProxyHandler<Record<string, any>> = {
    get(target, key: string) {
        return key in target ? target[key] : "not found"
    },
    set(target, key: string, value) {
        target[key] = value
        return true
    }
}

let user: Record<string, any> = new Proxy({}, handler)
```
