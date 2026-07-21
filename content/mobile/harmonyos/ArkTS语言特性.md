# ArkTS 装饰器 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 组件装饰器

**@Entry 页面入口**
`@Entry [@Component] struct <ComponentName> { build() { ... } }`
```typescript
@Entry
@Component
struct Index {
  @State message: string = 'Hello'
  build() {
    Column() { Text(this.message) }
  }
}
```

**@Component 自定义组件**
`@Component struct <ComponentName> { build() { ... } }`
```typescript
@Component
struct MyCard {
  build() {
    Column() { Text('Card') }.padding(16)
  }
}
```

**@Reusable 可复用组件**
`@Reusable @Component struct <Name> { aboutToReuse(params: Record<string, Object>): void { ... } }`
```typescript
@Reusable
@Component
struct Item {
  @State data: string = ''
  aboutToReuse(params: Record<string, Object>) {
    this.data = params.data as string
  }
  build() { Text(this.data) }
}
```

---

## V1 状态管理装饰器

**@State 组件内状态**
`@State <varName>: <Type> = <initialValue>;`
```typescript
@State count: number = 0
@State name: string = 'Tom'
@State list: Array<string> = []
@State user: User = { name: 'Tom', age: 18 }
```

**@Prop 父子单向同步**
`@Prop <varName>: <Type>;`
```typescript
@Component
struct Child {
  @Prop title: string
  build() { Text(this.title) }
}
```

**@Link 父子双向同步**
`@Link <varName>: <Type>;`
```typescript
@Component
struct Counter {
  @Link count: number
  build() {
    Button('+').onClick(() => this.count++)
  }
}
// 父组件调用:Counter({ count: $count })
```

**@Watch 状态变化监听**
`@Watch('<cbName>') @State <var>: <Type> = <value>;`
```typescript
@Component
struct Demo {
  @Watch('onCountChange') @State count: number = 0
  onCountChange(newValue: number): void {
    console.info(`count 变为 ${newValue}`)
  }
}
```

**@Provide 祖先提供数据**
`@Provide [<key>] <varName>: <Type> = <value>;`
```typescript
@Component
struct GrandParent {
  @Provide('theme') themeColor: string = '#1a73e8'
  @Provide user: User = { name: 'Tom' }
}
```

**@Consume 后代消费数据**
`@Consume [<key>] <varName>: <Type>;`
```typescript
@Component
struct DeepChild {
  @Consume('theme') themeColor: string
  @Consume user: User
}
```

**@Observed 可观察类**
`@Observed class <ClassName> { <field>: <Type>; ... }`
```typescript
@Observed
class User {
  name: string
  age: number
  constructor(name: string, age: number) {
    this.name = name
    this.age = age
  }
}
```

**@ObjectLink 链接观察对象**
`@ObjectLink <varName>: <ObservedClass>;`
```typescript
@Component
struct UserCard {
  @ObjectLink user: User
  build() { Text(`${this.user.name}, ${this.user.age}`) }
}
```

**@StorageLink 全局双向同步**
`@StorageLink('<key>') <varName>: <Type> = <value>;`
```typescript
@StorageLink('token') token: string = ''
```

**@StorageProp 全局单向同步**
`@StorageProp('<key>') <varName>: <Type> = <value>;`
```typescript
@StorageProp('theme') themeColor: string = '#fff'
```

**@LocalStorageLink 局部存储双向同步**
`@LocalStorageLink('<key>') <varName>: <Type>;`
```typescript
let storage = new LocalStorage({ count: 0 })

@Component
struct Child {
  @LocalStorageLink('count') count: number
}
```

**@LocalStorageProp 局部存储单向同步**
`@LocalStorageProp('<key>') <varName>: <Type>;`
```typescript
@LocalStorageProp('count') count: number
```

---

## V2 状态管理装饰器

**@ObservedV2 可观察类(V2)**
`@ObservedV2 class <ClassName> { @Trace <field>: <Type> = <value>; ... }`
```typescript
@ObservedV2
class User {
  @Trace name: string = ''
  @Trace age: number = 0
}
```

**@Trace 字段跟踪**
`@Trace <varName>: <Type> = <value>;`
```typescript
@ObservedV2
class Counter {
  @Trace count: number = 0
  increment(): void { this.count++ }
}
```

**@Local 组件内状态(V2)**
`@Local <varName>: <Type> = <value>;`
```typescript
@Component
struct Demo {
  @Local count: number = 0
  build() {
    Button(`${this.count}`).onClick(() => this.count++)
  }
}
```

**@Param 外部参数(V2)**
`@Param <varName>: <Type> [= <default>];`
```typescript
@Component
struct Child {
  @Param title: string = ''
  @Param count: number = 0
}
```

**@Event 事件回调(V2)**
`@Event <fnName>: <Signature> = <default>;`
```typescript
@Component
struct Btn {
  @Param label: string = ''
  @Event onClick: () => void = () => {}
  build() {
    Button(this.label).onClick(() => this.onClick())
  }
}
```

**@Once 一次性同步(V2)**
`@Once @Param <varName>: <Type>;`
```typescript
@Component
struct Child {
  @Once @Param initialData: string
}
```

**@Computed 计算属性(V2)**
`@Computed get <name>(): <Type> { ... }`
```typescript
@Local a: number = 1
@Local b: number = 2
@Computed get sum(): number { return this.a + this.b }
@Computed get isPositive(): boolean { return this.sum > 0 }
```

**@Monitor 深度监听(V2)**
`@Monitor('<path1>'[, '<path2>', ...]) <fnName>(monitor: IMonitor): void { ... }`
```typescript
@ObservedV2
class User {
  @Trace name: string = ''
  @Monitor('name', 'age')
  onUserChange(monitor: IMonitor): void {
    console.info(`path: ${monitor.path()}, before: ${monitor.before()}, after: ${monitor.value()}`)
  }
}
```

---

## 构建与样式装饰器

**@Builder 构建函数**
`@Builder function <fnName>([<param>: <Type>]): void { ... }`
```typescript
@Builder
function ItemBuilder(text: string, size: number = 16) {
  Text(text).fontSize(size).padding(8)
}

// 组件内 @Builder
@Component
struct Demo {
  @Builder itemBuilder(text: string) {
    Text(text).fontSize(16)
  }
  build() {
    Column() { this.itemBuilder('Item 1') }
  }
}
```

**@BuilderParam 构建器参数**
`@BuilderParam <name>: <Signature>;`
```typescript
@Component
struct Container {
  @BuilderParam content: () => void
  @BuilderParam header: (title: string) => void = (title: string) => {
    Text(title).fontSize(20)
  }
  build() {
    Column() {
      this.header('Title')
      this.content()
    }
  }
}
```

**@Extend 扩展内置组件属性**
`@Extend(<Component>) function <fnName>([<params>]) { ... }`
```typescript
@Extend(Text)
function primaryText(size: number, color: ResourceColor = '#333') {
  .fontSize(size)
  .fontColor(color)
  .fontWeight(FontWeight.Bold)
}

Text('Hello').primaryText(16)
Text('World').primaryText(20, '#1a73e8')
```

**@Styles 复用样式**
`@Styles function <fnName>() { ... }`
```typescript
@Styles
function cardStyle() {
  .padding(16)
  .borderRadius(12)
  .backgroundColor(Color.White)
  .shadow({ radius: 8, color: 'rgba(0,0,0,0.1)' })
}

Column() { Text('Card') }.cardStyle()

// 组件内 @Styles
@Component
struct Demo {
  @Styles cardStyle() {
    .padding(16)
    .backgroundColor(Color.White)
  }
  build() {
    Column() { Text('Card') }.cardStyle()
  }
}
```

**@AnimatableExtend 动画扩展**
`@AnimatableExtend(<Component>) function <fnName>(<param>: <Type>): void { ... }`
```typescript
@AnimatableExtend(Text)
function animatableFontSize(size: number) {
  .fontSize(size)
}
```

---

## 并发装饰器

**@Concurrent 跨线程任务**
`@Concurrent function <fnName>([<params>]): <ReturnType> { ... }`
```typescript
import { taskpool } from '@kit.ArkTS'

@Concurrent
function heavyCompute(data: number[]): number {
  return data.reduce((sum, n) => sum + n * n, 0)
}

const task = new taskpool.Task(heavyCompute, [1, 2, 3])
const result = await taskpool.execute(task) as number
```
