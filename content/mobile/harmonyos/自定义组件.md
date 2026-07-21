# 自定义组件 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 装饰器

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

**@Entry 页面入口**
`@Entry [@Component] struct <Name> { ... }`
```typescript
@Entry
@Component
struct Index {
  build() {
    Column() { MyCard() }
  }
}
```

**@Reusable 可复用组件**
`@Reusable @Component struct <Name> { ... }`
```typescript
@Reusable
@Component
struct ListItem {
  @State data: string = ''
  aboutToReuse(params: Record<string, Object>) {
    this.data = params.data as string
  }
  build() { Text(this.data) }
}
```

---

## 状态管理

**@State 组件内状态**
`@State <varName>: <Type> = <value>;`
```typescript
@State count: number = 0
@State name: string = 'Tom'
@State list: Array<string> = []
```

**@Prop 单向同步**
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

**@Link 双向同步**
`@Link <varName>: <Type>;`
```typescript
@Component
struct Child {
  @Link count: number
  build() {
    Button('+').onClick(() => this.count++)
  }
}

// 调用时使用 $ 前缀
Child({ count: $count })
```

**@Provide/@Consume 跨层级**
`@Provide [<key>] <var>: <Type> = <value>; / @Consume [<key>] <var>: <Type>;`
```typescript
@Component
struct GrandParent {
  @Provide('theme') theme: string = 'dark'
}

@Component
struct DeepChild {
  @Consume('theme') theme: string
}
```

**@Watch 状态监听**
`@Watch('<cb>') @State <var>: <Type> = <value>;`
```typescript
@Watch('onChange') @State count: number = 0

onChange(newValue: number) {
  console.info(`count: ${newValue}`)
}
```

**@Observed/@ObjectLink 嵌套对象**
`@Observed class <Name> { ... } / @ObjectLink <var>: <Class>;`
```typescript
@Observed
class User {
  name: string
  age: number
}

@Component
struct UserCard {
  @ObjectLink user: User
  build() { Text(this.user.name) }
}
```

---

## 构建函数

**@Builder 构建函数**
`@Builder function <fnName>([<param>]) { ... }`
```typescript
@Builder
function ItemBuilder(text: string, size: number = 16) {
  Text(text).fontSize(size).padding(8)
}

build() {
  Column() {
    ItemBuilder('Item 1')
    ItemBuilder('Item 2', 20)
  }
}
```

**@Builder 组件内构建**
```typescript
@Component
struct Demo {
  @Builder itemBuilder(text: string) {
    Text(text).fontSize(16)
  }

  build() {
    Column() {
      this.itemBuilder('Item 1')
    }
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

// 调用
Container() {
  Text('Body content')
}
```

---

## 样式复用

**@Extend 扩展内置组件**
`@Extend(<Component>) function <fnName>(<params>) { ... }`
```typescript
@Extend(Text)
function primaryText(size: number, color: ResourceColor = '#333') {
  .fontSize(size)
  .fontColor(color)
  .fontWeight(FontWeight.Bold)
  .lineHeight(size * 1.5)
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
  .shadow({ radius: 8, color: 'rgba(0,0,0,0.1)', offsetX: 0, offsetY: 2 })
}

Column() { Text('Card') }.cardStyle()
```

**@Styles 组件内复用**
```typescript
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

---

## 生命周期

**aboutToAppear 即将显示**
`aboutToAppear(): void { ... }`
```typescript
aboutToAppear() {
  console.info('即将显示')
  this.loadData()
}
```

**aboutToDisappear 即将销毁**
`aboutToDisappear(): void { ... }`
```typescript
aboutToDisappear() {
  this.releaseResources()
  this.cancelTimer()
}
```

**aboutToReuse 复用回调**
`aboutToReuse(params: Record<string, Object>): void { ... }`
```typescript
@Reusable
@Component
struct Item {
  @State id: string = ''
  @State data: ItemData = {} as ItemData

  aboutToReuse(params: Record<string, Object>) {
    this.id = params.id as string
    this.data = params.data as ItemData
  }
}
```

**aboutToRecycle 即将回收**
`aboutToRecycle(): void { ... }`
```typescript
@Reusable
@Component
struct Item {
  aboutToRecycle() {
    this.reset()
  }
}
```

**onBackPress 返回键拦截**
`onBackPress(): boolean { ... }`
```typescript
onBackPress(): boolean {
  if (this.hasUnsavedData) {
    this.showConfirm()
    return true
  }
  return false
}
```

---

## 组件参数传递

**基础参数**
```typescript
@Component
struct MyButton {
  @Prop label: string = ''
  @Prop color: string = '#1a73e8'

  build() {
    Button(this.label)
      .backgroundColor(this.color)
      .fontColor(Color.White)
  }
}

// 调用
MyButton({ label: 'Submit', color: '#1a73e8' })
```

**事件回调**
```typescript
@Component
struct MyButton {
  @Prop label: string = ''
  onClick?: () => void

  build() {
    Button(this.label).onClick(() => this.onClick?.())
  }
}

MyButton({
  label: 'Click',
  onClick: () => console.info('clicked')
})
```

**BuilderParam 内容**
```typescript
@Component
struct Card {
  @BuilderParam content: () => void
  build() {
    Column() { this.content() }.padding(16)
  }
}

Card() {
  Column() {
    Text('Title')
    Text('Body')
  }
}
```

---

## 状态管理 V2

**@Local 组件内状态**
`@Local <var>: <Type> = <value>;`
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
`@Param <var>: <Type> [= <default>];`
```typescript
@Component
struct Child {
  @Param title: string = ''
  build() { Text(this.title) }
}
```

**@Event 事件回调**
`@Event <fn>: <Signature> = <default>;`
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

**@Computed 计算属性**
`@Computed get <name>(): <Type> { ... }`
```typescript
@Local a: number = 1
@Local b: number = 2
@Computed get sum(): number { return this.a + this.b }
@Computed get isPositive(): boolean { return this.sum > 0 }
```

**@Monitor 深度监听**
`@Monitor('<path>') <fn>(monitor: IMonitor): void { ... }`
```typescript
@Monitor('count')
onCountChange(monitor: IMonitor) {
  console.info(`before: ${monitor.before()}, after: ${monitor.value()}`)
}

@Monitor('user.name', 'user.age')
onUserChange(monitor: IMonitor) {
  console.info(monitor.path())
}
```

---

## 调用示例

**基础自定义组件**
```typescript
@Component
struct MyHeader {
  @Prop title: string = ''
  @Prop subtitle: string = ''

  build() {
    Column({ space: 4 }) {
      Text(this.title).fontSize(20).fontWeight(FontWeight.Bold)
      Text(this.subtitle).fontSize(12).fontColor('#666')
    }
    .alignItems(HorizontalAlign.Start)
    .padding(16)
  }
}

// 使用
MyHeader({ title: '我的应用', subtitle: 'v1.0.0' })
```

**带状态和事件的组件**
```typescript
@Component
struct Counter {
  @State count: number = 0
  onChange?: (count: number) => void

  build() {
    Row({ space: 8 }) {
      Button('-').onClick(() => {
        this.count--
        this.onChange?.(this.count)
      })
      Text(`${this.count}`).fontSize(20)
      Button('+').onClick(() => {
        this.count++
        this.onChange?.(this.count)
      })
    }
  }
}

// 使用
Counter({ onChange: (count) => console.info(`count: ${count}`) })
```

**可复用列表项**
```typescript
@Reusable
@Component
struct ArticleItem {
  @State title: string = ''
  @State summary: string = ''
  @State imageUrl: string = ''

  aboutToReuse(params: Record<string, Object>) {
    this.title = params.title as string
    this.summary = params.summary as string
    this.imageUrl = params.imageUrl as string
  }

  build() {
    Row({ space: 12 }) {
      Image(this.imageUrl).width(80).height(80).objectFit(ImageFit.Cover)
      Column() {
        Text(this.title).fontSize(16).fontWeight(FontWeight.Bold)
        Text(this.summary).fontSize(12).fontColor('#666').maxLines(2)
      }.layoutWeight(1)
    }.padding(12)
  }
}

List() {
  LazyForEach(this.dataSource, (item: ArticleData) => {
    ListItem() {
      ArticleItem({
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl
      })
    }
  })
}
```
