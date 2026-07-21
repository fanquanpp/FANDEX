# UI 组件与动画 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

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
  .interpolation(ImageInterpolation.High)
```

**TextInput 文本输入**
`TextInput({ placeholder?: string | Resource, text?: string | Resource, controller?: TextInputController })`
```typescript
TextInput({ placeholder: '请输入' })
  .type(InputType.Normal)
  .fontSize(16)
  .maxLength(20)
  .onChange((value: string) => {
    console.info(value)
  })
  .onSubmit((enterKey) => {
    console.info(`submitted: ${enterKey}`)
  })
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
  .onChange((isOn: boolean) => {
    console.info(`switch: ${isOn}`)
  })
```

**Slider 滑块**
`Slider({ value, min, max, step, style, direction, reverse })`
```typescript
Slider({ value: 50, min: 0, max: 100, step: 1, style: SliderStyle.OutSet })
  .blockColor('#1a73e8')
  .trackColor('#e0e0e0')
  .selectedColor('#1a73e8')
  .onChange((value: number, mode: SliderChangeMode) => {})
```

**Progress 进度条**
`Progress({ value, total, type: ProgressType })`
```typescript
Progress({ value: 50, total: 100, type: ProgressType.Linear })
Progress({ value: 0.7, type: ProgressType.Circular })
```

**LoadingProgress 加载**
`LoadingProgress()`
```typescript
LoadingProgress()
  .width(48)
  .height(48)
  .color('#1a73e8')
```

**Divider 分割线**
`Divider()`
```typescript
Divider()
  .color('#e0e0e0')
  .strokeWidth(1)
  .vertical(false)
```

---

## 容器组件

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

**Grid 网格**
`Grid() { ... }.columnsTemplate('<template>').rowsTemplate('<template>')`
```typescript
Grid() {
  ForEach(this.items, (item: string) => {
    GridItem() { Text(item) }
  })
}
.columnsTemplate('1fr 1fr 1fr')
.columnsGap(8)
.rowsGap(8)
```

**List 列表**
`List([{ space, initialIndex, scroller }]) { ... }`
```typescript
List({ space: 8 }) {
  ForEach(this.items, (item: string) => {
    ListItem() {
      Text(item).padding(12)
    }
  })
}
.cachedCount(5)
.scrollBar(BarState.Auto)
```

**Tabs 选项卡**
`Tabs({ barPosition, index, controller }) { ... }`
```typescript
Tabs({ barPosition: BarPosition.Start }) {
  TabContent() {
    Text('Tab 1 Content')
  }.tabBar('Tab 1')

  TabContent() {
    Text('Tab 2 Content')
  }.tabBar('Tab 2')
}
.onChange((index: number) => {})
```

**Swiper 轮播**
`Swiper() { ... }`
```typescript
Swiper() {
  Image($r('app.media.img1'))
  Image($r('app.media.img2'))
}
.index(0)
.autoPlay(true)
.interval(3000)
.loop(true)
.indicator(true)
.duration(500)
```

---

## 文本组件

**Span 行内文本**
```typescript
Text() {
  Span('Hello ')
  Span('World').fontColor('#1a73e8').fontWeight(FontWeight.Bold)
}
```

**ImageSpan 行内图片**
```typescript
Text() {
  Span('Welcome ')
  ImageSpan($r('app.media.icon'))
    .width(16)
    .height(16)
    .verticalAlign(ImageSpanAlignment.CENTER)
}
```

**TextPicker 选择器**
`TextPicker({ range, selected })`
```typescript
TextPicker({ range: ['A', 'B', 'C'], selected: 0 })
  .onAccept((value: string, index: number) => {})
```

**TimePicker 时间选择**
`TimePicker({ selected })`
```typescript
TimePicker({ selected: new Date() })
  .onChange((value: TimePickerResult) => {})
```

**DatePicker 日期选择**
`DatePicker({ start, end, selected })`
```typescript
DatePicker({ start: new Date('2020-01-01'), end: new Date('2030-12-31') })
  .onChange((value: DatePickerResult) => {})
```

---

## 形状组件

**Circle 圆形**
`Circle({ width, height })`
```typescript
Circle({ width: 100, height: 100 })
  .fill('#1a73e8')
  .stroke('#333')
  .strokeWidth(2)
```

**Rectangle 矩形**
`Rectangle({ width, height })`
```typescript
Rectangle({ width: 100, height: 50 })
  .radiusWidth(8)
  .radiusHeight(8)
  .fill('#1a73e8')
```

**Path 路径**
`Path()`
```typescript
Path()
  .commands('M10 10 L100 100')
  .stroke('#1a73e8')
  .strokeWidth(2)
```

**Shape 形状容器**
`Shape() { ... }`
```typescript
Shape() {
  Circle({ width: 50, height: 50 }).fill('#1a73e8')
  Rectangle({ width: 50, height: 50 }).fill('#fff')
}
```

---

## 通用属性

**尺寸**
```typescript
.width(<Length>).height(<Length>)
.size({ width: <L>, height: <L> })
.constraintSize({ minWidth, maxWidth, minHeight, maxHeight })
.aspectRatio(<ratio>)
.layoutWeight(<weight>)
```

**位置**
```typescript
.position({ x: <Length>, y: <Length> })
.offset({ x: <Length>, y: <Length> })
.markAnchor({ x: <Length>, y: <Length> })
.zIndex(<number>)
```

**边距**
```typescript
.margin({ top, right, bottom, left })
.padding({ top, right, bottom, left })
.border({ width, color, radius, style })
.borderRadius(<Length>)
```

**背景**
```typescript
.backgroundColor(<ResourceColor>)
.backgroundImage(<ResourceStr>)
.backgroundImageSize(<ImageSize>)
.opacity(<number>)
```

**可见性**
```typescript
.visibility(<Visibility>)
.enabled(<boolean>)
```

---

## 属性动画

**animation 属性动画**
`.animation({ duration, curve, delay, iterations, playMode })`
```typescript
Row()
  .width(this.width)
  .height(this.height)
  .backgroundColor(Color.Blue)
  .animation({
    duration: 300,
    curve: Curve.EaseInOut,
    delay: 0,
    iterations: 1,
    playMode: PlayMode.Normal
  })
```

**animateTo 显式动画**
`animateTo({ duration, curve, delay, iterations, onFinish }, () => { ... })`
```typescript
animateTo({ duration: 500, curve: Curve.EaseOut }, () => {
  this.width = 200
  this.opacity = 1
})
```

**transition 转场动画**
`.transition({ type, opacity, translate, scale, rotate })`
```typescript
Column()
  .transition({ type: TransitionType.All, opacity: 0 })
```

---

## 关键帧动画

**keyframeAnimateTo 关键帧**
`keyframeAnimateTo({ iterations, onFinish }, [<keyframe>])`
```typescript
keyframeAnimateTo({ iterations: 1 }, [
  { duration: 200, curve: Curve.EaseIn, event: () => { this.width = 100 } },
  { duration: 300, curve: Curve.EaseOut, event: () => { this.width = 200 } }
])
```

---

## 内置动画组件

**ImageAnimator 帧动画**
`ImageAnimator({ images, duration, iterations, state })`
```typescript
ImageAnimator({
  images: [
    { src: $r('app.media.frame1') },
    { src: $r('app.media.frame2') },
    { src: $r('app.media.frame3') }
  ],
  duration: 1000,
  iterations: -1,
  state: AnimationStatus.Running
})
```

---

## 动画曲线

**Curve 内置曲线**
```typescript
Curve.Linear          // 线性
Curve.Ease            // 默认缓动
Curve.EaseIn          // 缓入
Curve.EaseOut         // 缓出
Curve.EaseInOut       // 缓入缓出
Curve.FastOutSlowIn   // 快出慢入
Curve.LinearOutSlowIn // 线性出慢入
Curve.FastLinearInSlowOut
```

**curves 自定义曲线**
```typescript
import { curves } from '@kit.ArkUI'

const spring = curves.springCurve(0, 10, 200, 20)
const cubic = curves.cubicBezierCurve(0.4, 0, 0.6, 1)
```

---

## 组件动画事件

**onAppear 显示事件**
`<Component>.onAppear(() => { ... })`
```typescript
Column().onAppear(() => {
  console.info('shown')
})
```

**onDisappear 隐藏事件**
`<Component>.onDisappear(() => { ... })`
```typescript
Column().onDisappear(() => {
  console.info('hidden')
})
```

**onAreaChange 区域变化**
`<Component>.onAreaChange((old, new) => { ... })`
```typescript
Column().onAreaChange((old: Area, new: Area) => {
  console.info(`width: ${new.width}`)
})
```

---

## 滚动与下拉

**Scroll 滚动容器**
`Scroll([<scroller>]) { ... }`
```typescript
Scroll() {
  Column() {
    ForEach(this.items, (item: string) => {
      Text(item).padding(16)
    })
  }
}
.scrollBar(BarState.Auto)
.edgeEffect(EdgeEffect.Spring)
```

**Refresh 下拉刷新**
`Refresh({ refreshing, offset, friction }) { ... }`
```typescript
Refresh({ refreshing: $$this.isRefreshing }) {
  List() {
    ForEach(this.items, (item: string) => {
      ListItem() { Text(item) }
    })
  }
}
.onRefreshing(() => {
  this.loadData()
})
```
