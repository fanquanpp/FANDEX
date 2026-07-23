# ArkTS 类型语法 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 类型系统约束

**禁止 any 类型**
```typescript
// 禁止:let val: any = 10

// 推荐:unknown + 类型收窄
let val: unknown = 10
if (typeof val === 'number') {
  console.info(val.toFixed(2))
}
```

**禁止 eval 与 Function 构造**
```typescript
// 禁止使用
// eval('console.info(1)')
// new Function('return 1')()
```

**对象字面量必须声明类型**
```typescript
// 禁止未类型化字面量
// const user = { name: 'Tom', age: 18 }

// 必须显式接口
interface User {
  name: string
  age: number
}
const user: User = { name: 'Tom', age: 18 }
```

**禁止动态添加属性**
```typescript
class User {
  name: string = ''
  // 禁止 this['newProp'] = 'value'
}
```

**联合类型替代 any**
`let <varName>: <Type1> | <Type2> = <value>;`
```typescript
let value: string | number | boolean = 'hello'
```

**禁止隐式 any**
```typescript
// 禁止
// function fn(param) { return param }

// 必须显式类型
function fn(param: string): string { return param }
```

**严格空检查**
```typescript
let name: string | null = null
console.info(name?.length ?? 0)
```

**严格类型推断**
```typescript
const arr = [1, 2, 3]  // 类型推断为 number[]
// arr.push('4')  // 编译错误
```

---

## 类型声明

**type 类型别名**
`type <Name> = <TypeDefinition>;`
```typescript
type ID = string | number
type Callback<T> = (value: T) => void
type Status = 'pending' | 'success' | 'error'
```

**interface 接口声明**
`interface <Name> { <field>: <Type>; [<opt>?: <Type>]; ... }`
```typescript
interface User {
  name: string
  age: number
  greet?(): void
}
```

**enum 枚举**
`enum <Name> { <MEMBER> [= <value>], ... }`
```typescript
enum Color { Red, Green, Blue }
enum Direction { Up = 'UP', Down = 'DOWN' }
```

**namespace 命名空间**
`namespace <Name> { export <declaration>; }`
```typescript
namespace Utils {
  export function format(date: Date): string {
    return date.toISOString()
  }
  export const PI: number = 3.14
}
```

---

## 工具类型

**Record 工具类型**
`Record<<Key>, <Value>>`
```typescript
type UserMap = Record<string, User>
const users: UserMap = { 'u1': { name: 'Tom' } as User }
```

**Partial 部分类型**
`Partial<<Type>>`
```typescript
interface User { name: string; age: number }
type PartialUser = Partial<User>  // { name?: string; age?: number }
```

**Readonly 只读类型**
`Readonly<<Type>>`
```typescript
type ReadonlyUser = Readonly<User>
const u: ReadonlyUser = { name: 'Tom', age: 18 }
// u.name = 'Jerry'  // 编译错误
```

**Pick 选取字段**
`Pick<<Type>, <<Key1> | <Key2>>>`
```typescript
type UserBasic = Pick<User, 'name'>  // { name: string }
```

**Omit 省略字段**
`Omit<<Type>, <<Key1> | <Key2>>>`
```typescript
type UserWithoutAge = Omit<User, 'age'>  // { name: string }
```

---

## 泛型

**泛型函数**
`function <fnName><<T>>(<param>: T): T { ... }`
```typescript
function identity<T>(value: T): T { return value }
```

**泛型类**
`class <Name><<T>> { ... }`
```typescript
class Stack<T> {
  private items: T[] = []
  push(item: T) { this.items.push(item) }
  pop(): T | undefined { return this.items.pop() }
}
```

**泛型约束**
`function <fn><<T extends <Constraint>>>(<param>: T): T { ... }`
```typescript
function getLength<T extends { length: number }>(item: T): number {
  return item.length
}
```

---

## 模块导入导出

**import 模块导入**
`import { <name> } from '<module>';`
```typescript
import { http } from '@kit.NetworkKit'
import { preferences } from '@kit.ArkData'
```

**import type 类型导入**
`import type { <TypeName> } from '<module>';`
```typescript
import type { User } from './types'
```

**import 模块别名**
`import { <name> as <alias> } from '<module>';`
```typescript
import { http as httpKit } from '@kit.NetworkKit'
```

**import * as 导入整个模块**
`import * as <alias> from '<module>';`
```typescript
import * as media from '@kit.MultimediaKit'
media.createAVPlayer()
```

**export 导出**
`export <declaration>`
```typescript
export function add(a: number, b: number): number { return a + b }
export class User {}
export const PI: number = 3.14
```

**export default 默认导出**
`export default <declaration>`
```typescript
export default class EntryAbility extends UIAbility { ... }
```

**export type 仅导出类型**
`export type { <TypeName> };`
```typescript
export type { User, Order }
```

---

## 异步与并发

**Promise 异步**
`new Promise<<T>>((resolve, reject) => { ... })`
```typescript
const p: Promise<string> = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000)
})
```

**async/await**
`async function <fn>(): Promise<<T>> { ... await <promise>; ... }`
```typescript
async function fetchData(): Promise<string> {
  const response = await fetch('https://api.example.com')
  return await response.text()
}
```

**Promise.all 并行**
`Promise.all([<p1>, <p2>, ...])`
```typescript
const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()])
```

**Promise.race 竞速**
`Promise.race([<p1>, <p2>])`
```typescript
const result = await Promise.race([fetchData(), timeout(5000)])
```

**Worker 子线程**
```typescript
import worker from '@ohos.worker'

const workerInstance = new worker.ThreadWorker('workers/MyWorker.ets')
workerInstance.postMessage({ data: 'hello' })
workerInstance.onmessage = (e) => {
  console.info(`received: ${e.data}`)
}
```

---

## 异常处理

**try/catch/finally**
```typescript
try {
  const data = await fetchData()
} catch (error) {
  console.error(`请求失败: ${error}`)
} finally {
  httpRequest.destroy()
}
```

**抛出错误**
`throw new <Error>('<message>')`
```typescript
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('除数不能为零')
  return a / b
}
```

**自定义错误类**
`class <Name> extends Error { ... }`
```typescript
class BusinessError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'BusinessError'
  }
}

throw new BusinessError(404, '用户不存在')
```

**ErrorCallback 错误回调**
`<api>.<method>([<args>,] (err, data) => { ... })`
```typescript
windowStage.loadContent('pages/Index', (err, data) => {
  if (err.code) {
    console.error(`加载失败: ${JSON.stringify(err)}`)
    return
  }
  console.info('加载成功')
})
```
