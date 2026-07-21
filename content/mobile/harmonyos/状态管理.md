# 状态管理 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## V1 状态管理

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

@Component
struct Parent {
  @State title: string = 'Hello'
  build() { Child({ title: this.title }) }
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

@Component
struct Parent {
  @State count: number = 0
  build() { Counter({ count: $count }) }
}
```

**@Watch 状态变化监听**
`@Watch('<cbName>') @State <var>: <Type> = <value>;`
```typescript
@Component
struct Demo {
  @Watch('onCountChange') @State count: number = 0

  onCountChange(newValue: number): void {
    console.info(`count: ${newValue}`)
  }
}
```

---

## 跨层级状态

**@Provide 祖先提供**
`@Provide [<key>] <varName>: <Type> = <value>;`
```typescript
@Component
struct GrandParent {
  @Provide('theme') themeColor: string = '#1a73e8'
  @Provide user: User = { name: 'Tom' }
}
```

**@Consume 后代消费**
`@Consume [<key>] <varName>: <Type>;`
```typescript
@Component
struct DeepChild {
  @Consume('theme') themeColor: string
  @Consume user: User
}
```

---

## 嵌套对象观察

**@Observed 可观察类**
`@Observed class <ClassName> { ... }`
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
@Observed
class User {
  name: string = ''
  age: number = 0
}

@Component
struct UserCard {
  @ObjectLink user: User
  build() {
    Column() {
      Text(this.user.name)
      Text(`${this.user.age}`)
    }
  }
}
```

---

## 全局存储 AppStorage

**AppStorage.setOrCreate 创建/更新键值**
`AppStorage.setOrCreate<<T>>('<key>', <value>: T): void`
```typescript
AppStorage.setOrCreate<string>('token', 'abc123')
AppStorage.setOrCreate<number>('count', 0)
AppStorage.setOrCreate<User>('user', { name: 'Tom', age: 18 })
```

**AppStorage.get 读取**
`AppStorage.get<<T>>('<key>'): T | undefined`
```typescript
const token = AppStorage.get<string>('token')
const count = AppStorage.get<number>('count')
```

**AppStorage.set 设置**
`AppStorage.set<<T>>('<key>', <value>: T): boolean`
```typescript
AppStorage.set<number>('count', 100)
```

**AppStorage.has 判断存在**
`AppStorage.has('<key>'): boolean`
```typescript
if (AppStorage.has('token')) {
  console.info('已登录')
}
```

**AppStorage.delete 删除**
`AppStorage.delete('<key>'): boolean`
```typescript
AppStorage.delete('token')
```

**@StorageLink 双向同步**
`@StorageLink('<key>') <var>: <Type> = <value>;`
```typescript
@Component
struct Demo {
  @StorageLink('count') count: number = 0
  build() {
    Button(`${this.count}`).onClick(() => this.count++)
  }
}
```

**@StorageProp 单向同步**
`@StorageProp('<key>') <var>: <Type> = <value>;`
```typescript
@Component
struct Demo {
  @StorageProp('token') token: string = ''
}
```

---

## 局部存储 LocalStorage

**LocalStorage 创建**
`new LocalStorage(<initialParams>?): LocalStorage`
```typescript
let storage = new LocalStorage({
  count: 0,
  name: 'Tom'
})
```

**LocalStorage.setOrCreate**
`<storage>.setOrCreate<<T>>('<key>', <value>: T): void`
```typescript
storage.setOrCreate<number>('count', 0)
```

**LocalStorage.get**
`<storage>.get<<T>>('<key>'): T | undefined`
```typescript
const count = storage.get<number>('count')
```

**@LocalStorageLink 双向同步**
`@LocalStorageLink('<key>') <var>: <Type>;`
```typescript
@Component
struct Child {
  @LocalStorageLink('count') count: number
}
```

**@LocalStorageProp 单向同步**
`@LocalStorageProp('<key>') <var>: <Type>;`
```typescript
@Component
struct Child {
  @LocalStorageProp('count') count: number
}
```

**LocalStorage 传递给子组件**
```typescript
let storage = new LocalStorage({ count: 0 })

@Entry(storage)
@Component
struct Parent {
  @LocalStorageLink('count') count: number
  build() {
    Column() {
      Text(`${this.count}`)
      Button('+').onClick(() => this.count++)
    }
  }
}
```

---

## PersistentStorage 持久化

**PersistentStorage.persistProp 持久化属性**
`PersistentStorage.persistProp<<T>>('<key>', <defaultValue>: T): void`
```typescript
PersistentStorage.persistProp<string>('token', '')
PersistentStorage.persistProp<number>('count', 0)
```

**PersistentStorage.deleteProp 删除持久化**
`PersistentStorage.deleteProp('<key>'): void`
```typescript
PersistentStorage.deleteProp('token')
```

**PersistentStorage.persistProps 批量持久化**
`PersistentStorage.persistProps([{ key, defaultValue }])`
```typescript
PersistentStorage.persistProps([
  { key: 'token', defaultValue: '' },
  { key: 'count', defaultValue: 0 }
])
```

---

## V2 状态管理

**@ObservedV2 可观察类**
`@ObservedV2 class <ClassName> { ... }`
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

**@Local 组件内状态**
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

**@Param 外部参数**
`@Param <varName>: <Type> [= <default>];`
```typescript
@Component
struct Child {
  @Param title: string = ''
  @Param count: number = 0
}
```

**@Event 事件回调**
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

**@Once 仅首次同步**
`@Once @Param <varName>: <Type>;`
```typescript
@Component
struct Child {
  @Once @Param initialData: string
}
```

**@Computed 计算属性**
`@Computed get <name>(): <Type> { ... }`
```typescript
@Component
struct Demo {
  @Local a: number = 1
  @Local b: number = 2
  @Computed get sum(): number { return this.a + this.b }
  @Computed get isPositive(): boolean { return this.sum > 0 }
}
```

**@Monitor 深度监听**
`@Monitor('<path1>'[, '<path2>', ...]) <fnName>(monitor: IMonitor): void { ... }`
```typescript
@ObservedV2
class User {
  @Trace name: string = ''
  @Trace age: number = 0

  @Monitor('name')
  onNameChange(monitor: IMonitor): void {
    console.info(`before: ${monitor.before()}, after: ${monitor.value()}`)
  }

  @Monitor('name', 'age')
  onUserChange(monitor: IMonitor): void {
    console.info(`path: ${monitor.path()}`)
  }
}
```

**IMonitor 监听信息**
```typescript
@Monitor('count')
onCountChange(monitor: IMonitor): void {
  console.info(`path: ${monitor.path()}`)        // 'count'
  console.info(`before: ${monitor.before()}`)    // 0
  console.info(`after: ${monitor.value()}`)      // 1
}
```

---

## 状态管理示例

**计数器示例**
```typescript
@Entry
@Component
struct CounterPage {
  @State count: number = 0
  @State step: number = 1

  @Watch('onCountChange')
  onCountChange(newValue: number): void {
    if (newValue >= 10) {
      console.info('达到 10')
    }
  }

  build() {
    Column({ space: 16 }) {
      Text(`Count: ${this.count}`).fontSize(32)
      Row({ space: 8 }) {
        Button('-').onClick(() => this.count -= this.step)
        Button('+').onClick(() => this.count += this.step)
      }
    }
  }
}
```

**购物车示例**
```typescript
@Observed
class CartItem {
  name: string
  price: number
  count: number
  constructor(name: string, price: number, count: number) {
    this.name = name
    this.price = price
    this.count = count
  }
}

@Component
struct CartItemView {
  @ObjectLink item: CartItem

  build() {
    Row({ space: 8 }) {
      Text(this.item.name).layoutWeight(1)
      Text(`¥${this.item.price}`)
      Button('-').onClick(() => this.item.count--)
      Text(`${this.item.count}`)
      Button('+').onClick(() => this.item.count++)
    }
  }
}

@Entry
@Component
struct CartPage {
  @State items: CartItem[] = [
    new CartItem('Apple', 5.5, 2),
    new CartItem('Banana', 3.2, 3)
  ]

  @Computed get totalPrice(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.count, 0)
  }

  build() {
    Column() {
      List() {
        ForEach(this.items, (item: CartItem) => {
          ListItem() { CartItemView({ item }) }
        })
      }
      Text(`Total: ¥${this.totalPrice}`)
    }
  }
}
```
