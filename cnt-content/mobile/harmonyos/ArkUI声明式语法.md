# ArkUI 组件语法 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## build 函数

**build 函数签名**
`build() { <UIContent> }`
```typescript
@Entry
@Component
struct Index {
  @State message: string = 'Hello'
  build() {
    Column() {
      Text(this.message)
    }
  }
}
```

---

## 布局组件

**Column 纵向布局**
`Column([{ space }: { space?: Length }]) { ... }`
```typescript
Column({ space: 12 }) {
  Text('Item 1')
  Text('Item 2')
}
.alignItems(HorizontalAlign.Center)
.justifyContent(FlexAlign.Start)
```

**Row 横向布局**
`Row([{ space }: { space?: Length }]) { ... }`
```typescript
Row({ space: 8 }) {
  Text('Left')
  Text('Right')
}
.justifyContent(FlexAlign.SpaceBetween)
.alignItems(VerticalAlign.Center)
```

**Stack 叠加布局**
`Stack([{ alignContent }: { alignContent?: Alignment }]) { ... }`
```typescript
Stack({ alignContent: Alignment.Center }) {
  Image($r('app.media.bg'))
  Text('Overlay')
}
```

**Flex 弹性布局**
`Flex({ direction, justifyContent, alignItems, wrap }) { ... }`
```typescript
Flex({
  direction: FlexDirection.Row,
  justifyContent: FlexAlign.SpaceAround,
  alignItems: ItemAlign.Center,
  wrap: FlexWrap.Wrap
}) {
  Text('A')
  Text('B')
}
```

**Grid 网格布局**
`Grid() { ... }.columnsTemplate('<template>').rowsTemplate('<template>')`
```typescript
Grid() {
  ForEach(this.items, (item: string) => {
    GridItem() { Text(item) }
  })
}
.columnsTemplate('1fr 1fr 1fr')
.rowsTemplate('1fr 1fr')
.columnsGap(8)
.rowsGap(8)
```

---

## 基础组件

**Text 文本**
`Text(<content>: string | Resource)`
```typescript
Text('Hello')
  .fontSize(16)
  .fontColor('#333')
  .fontWeight(FontWeight.Bold)
  .textAlign(TextAlign.Center)
  .maxLines(2)
  .textOverflow({ overflow: TextOverflow.Ellipsis })
  .lineHeight(24)
```

**Button 按钮**
`Button([<label>]: string | Resource, [<options>]: { type?: ButtonType })`
```typescript
Button('Submit', { type: ButtonType.Capsule })
  .width(120)
  .height(40)
  .backgroundColor('#1a73e8')
  .fontColor(Color.White)
  .onClick(() => {})

Button({ type: ButtonType.Circle }) {
  Text('OK')
}
```

**Image 图片**
`Image(<src>: string | Resource)`
```typescript
Image($r('app.media.icon'))
  .width(48)
  .height(48)
  .objectFit(ImageFit.Cover)
  .alt($r('app.media.placeholder'))
  .borderRadius(8)
```

**TextInput 文本输入**
`TextInput({ placeholder?: string | Resource, text?: string | Resource, controller?: TextInputController })`
```typescript
TextInput({ placeholder: '请输入' })
  .type(InputType.Normal)
  .fontSize(16)
  .maxLength(20)
  .onChange((value: string) => { console.info(value) })
  .onSubmit((enterKey) => { console.info(`submitted: ${enterKey}`) })
```

**TextArea 多行输入**
`TextArea({ placeholder?: string | Resource, text?: string | Resource })`
```typescript
TextArea({ placeholder: '请输入内容' })
  .maxLength(200)
  .onChange((value: string) => {})
```

**Toggle 开关**
`Toggle({ type: ToggleType, isOn?: boolean })`
```typescript
Toggle({ type: ToggleType.Switch, isOn: true })
  .onChange((isOn: boolean) => { console.info(`switch: ${isOn}`) })
```

---

## 渲染控制

**if/else 条件渲染**
`if (<condition>) { ... } else if (<condition>) { ... } else { ... }`
```typescript
build() {
  Column() {
    if (this.isLoading) {
      LoadingProgress()
    } else if (this.error) {
      Text('Error')
    } else {
      Text('Done')
    }
  }
}
```

**ForEach 循环渲染**
`ForEach(<array>: T[], (item: T, index?: number) => { ... }, [keyGenerator?: (item: T, index?: number) => string])`
```typescript
ForEach(this.items, (item: string, index: number) => {
  Text(`${index}: ${item}`)
}, (item: string) => item)
```

**LazyForEach 懒加载**
`LazyForEach(<dataSource>: IDataSource, (item: T, index?: number) => { ... }, [keyGen?: (item: T) => string])`
```typescript
class MyDataSource implements IDataSource {
  private data: string[] = ['A', 'B', 'C']
  totalCount(): number { return this.data.length }
  getData(index: number): string { return this.data[index] }
  registerDataChangeListener(listener: DataChangeListener): void {}
  unregisterDataChangeListener(listener: DataChangeListener): void {}
}

LazyForEach(this.dataSource, (item: string) => {
  ListItem() { Text(item) }
}, (item: string) => item)
```

---

## 链式调用语法

**组件属性链式调用**
```typescript
Text('Hello')
  .fontSize(16)
  .fontColor('#333')
  .fontWeight(FontWeight.Bold)
  .margin({ top: 8, bottom: 8 })
```

**事件链式调用**
```typescript
Button('Click')
  .onClick((event: ClickEvent) => { console.info('clicked') })
  .onTouch((event: TouchEvent) => { console.info('touched') })
```

**动画属性链式调用**
```typescript
Row()
  .width(100)
  .height(100)
  .backgroundColor(Color.Blue)
  .animation({
    duration: 300,
    curve: Curve.EaseInOut,
    delay: 0,
    iterations: 1
  })
```

---

## 组件参数语法

**构造参数对象**
```typescript
Text({ value: 'Hello' })              // 简写:Text('Hello')
Image({ src: $r('app.media.icon') })   // 简写:Image($r('app.media.icon'))
Button({ type: ButtonType.Circle }) { Text('OK') }
```

**子组件内容**
```typescript
Column() {
  Text('Item 1')
  Text('Item 2')
  Row() { Text('Nested') }
}
```

**组件参数+子内容**
```typescript
Column({ space: 12 }) {
  Text('Item 1')
  Text('Item 2')
}
```

---

## 资源引用

**$r 引用资源**
```typescript
Text($r('app.string.greeting'))
Image($r('app.media.icon'))
.fontSize($r('app.float.title_size'))
.fontColor($r('app.color.primary'))
```

**$rawfile 引用 rawfile**
```typescript
Image($rawfile('logo.png'))
```

**字符串与数值字面量**
```typescript
Text('Hello')
Image('https://example.com/img.png')
.width(120)
```

---

## 自定义组件调用

**基础调用**
```typescript
@Component
struct MyButton {
  @Prop label: string = ''
  build() {
    Button(this.label).width(120)
  }
}

build() {
  MyButton({ label: 'Submit' })
}
```

**带事件回调**
```typescript
@Component
struct MyButton {
  @Prop label: string = ''
  onClick?: () => void
  build() {
    Button(this.label).onClick(() => this.onClick?.())
  }
}

build() {
  MyButton({ label: 'Click', onClick: () => console.info('clicked') })
}
```

**带 BuilderParam 内容**
```typescript
@Component
struct Card {
  @BuilderParam content: () => void
  build() {
    Column() { this.content() }.padding(16)
  }
}

build() {
  Card() { Text('Card content') }
}
```
