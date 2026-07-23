# ArkUI 通用属性+事件 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 尺寸属性

**width / height 宽高**
`.width(<Length>): void / .height(<Length>): void`
```typescript
Text('Hello')
  .width(120)
  .height(40)
```

**size 同时设置宽高**
`.size({ width: <Length>, height: <Length> }): void`
```typescript
Text('Hello').size({ width: 120, height: 40 })
```

**constraintSize 约束尺寸**
`.constraintSize({ minWidth?, maxWidth?, minHeight?, maxHeight? }): void`
```typescript
Text('Hello').constraintSize({ minWidth: 100, maxWidth: 200 })
```

**aspectRatio 宽高比**
`.aspectRatio(<ratio>: number): void`
```typescript
Image($r('app.media.icon')).aspectRatio(1.5)
```

**layoutWeight 权重**
`.layoutWeight(<weight>: number): void`
```typescript
Row() {
  Text('Left').layoutWeight(1)
  Text('Right').layoutWeight(2)
}
```

---

## 位置属性

**position 绝对定位**
`.position({ x: <Length>, y: <Length> }): void`
```typescript
Text('Hello').position({ x: 100, y: 100 })
```

**markAnchor 锚点**
`.markAnchor({ x: <Length>, y: <Length> }): void`
```typescript
Text('Hello').markAnchor({ x: 0, y: 0 })
```

**offset 相对偏移**
`.offset({ x: <Length>, y: <Length> }): void`
```typescript
Text('Hello').offset({ x: 10, y: 10 })
```

**zIndex 层级**
`.zIndex(<number>): void`
```typescript
Text('Hello').zIndex(10)
```

---

## 边距与边框

**margin 外边距**
`.margin({ top?, right?, bottom?, left? } | <Length>): void`
```typescript
Text('Hello').margin({ top: 8, right: 8, bottom: 8, left: 8 })
Text('Hello').margin(8)
```

**padding 内边距**
`.padding({ top?, right?, bottom?, left? } | <Length>): void`
```typescript
Text('Hello').padding({ top: 8, right: 8, bottom: 8, left: 8 })
```

**border 边框**
`.border({ width, color, radius, style }): void`
```typescript
Text('Hello').border({
  width: 1,
  color: '#ccc',
  radius: 8,
  style: BorderStyle.Solid
})
```

**borderRadius 圆角**
`.borderRadius(<Length> | { topLeft?, topRight?, bottomLeft?, bottomRight? }): void`
```typescript
Text('Hello').borderRadius(8)
```

---

## 背景与前景

**backgroundColor 背景色**
`.backgroundColor(<ResourceColor>): void`
```typescript
Text('Hello').backgroundColor('#1a73e8')
```

**backgroundImage 背景图**
`.backgroundImage(<ResourceStr>): void`
```typescript
Text('Hello').backgroundImage($r('app.media.bg'))
```

**backgroundImageSize 背景图尺寸**
`.backgroundImageSize(<ImageSize> | { width, height }): void`
```typescript
Text('Hello').backgroundImageSize(ImageSize.Cover)
```

**opacity 透明度**
`.opacity(<number>): void`
```typescript
Text('Hello').opacity(0.8)
```

**foregroundColor 前景色**
`.foregroundColor(<ResourceColor>): void`
```typescript
Text('Hello').foregroundColor(Color.White)
```

---

## 可见性

**visibility 可见性**
`.visibility(<Visibility>): void`
```typescript
Column().visibility(Visibility.Hidden)  // Visible | Hidden | None
```

**enabled 是否启用**
`.enabled(<boolean>): void`
```typescript
Button('Submit').enabled(false)
```

---

## 点击事件

**onClick 点击**
`<Component>.onClick((event: ClickEvent) => { ... }): void`
```typescript
Button('Click').onClick((event: ClickEvent) => {
  console.info(`x: ${event.x}, y: ${event.y}`)
})
```

---

## 触摸事件

**onTouch 触摸**
`<Component>.onTouch((event: TouchEvent) => { ... }): void`
```typescript
Column().onTouch((event: TouchEvent) => {
  if (event.type === TouchType.Down) {
    console.info('按下')
  } else if (event.type === TouchType.Up) {
    console.info('抬起')
  }
})
```

**TouchType 枚举**
```typescript
enum TouchType {
  Down = 0,
  Up = 1,
  Move = 2,
  Cancel = 3
}
```

---

## 挂载事件

**onAppear 显示**
`<Component>.onAppear(() => { ... }): void`
```typescript
Column().onAppear(() => {
  console.info('显示')
})
```

**onDisappear 隐藏**
`<Component>.onDisappear(() => { ... }): void`
```typescript
Column().onDisappear(() => {
  console.info('隐藏')
})
```

---

## 区域变化事件

**onAreaChange 区域变化**
`<Component>.onAreaChange((oldValue: Area, newValue: Area) => { ... }): void`
```typescript
Column().onAreaChange((oldValue: Area, newValue: Area) => {
  console.info(`width: ${newValue.width}`)
})
```

**onVisibleAreaChange 可见区域变化**
`<Component>.onVisibleAreaChange([<ratios>], (isDetect: boolean, ratio: number) => { ... }): void`
```typescript
Column().onVisibleAreaChange([0.5, 1.0], (isDetect: boolean, ratio: number) => {
  console.info(`可见比例: ${ratio}`)
})
```

---

## 按键与鼠标事件

**onKeyEvent 按键**
`<Component>.onKeyEvent((event: KeyEvent) => { ... }): void`
```typescript
TextInput({ placeholder: '请输入' })
  .onKeyEvent((event: KeyEvent) => {
    if (event.type === KeyType.Down) {
      console.info(`按下键: ${event.keyCode}`)
    }
  })
```

**onMouse 鼠标**
`<Component>.onMouse((event: MouseEvent) => { ... }): void`
```typescript
Text('鼠标区域').onMouse((event: MouseEvent) => {
  console.info(`鼠标事件: ${event.action}`)
})
```

**onHover 悬停**
`<Component>.onHover((isHover: boolean) => { ... }): void`
```typescript
Text('鼠标区域').onHover((isHover: boolean) => {
  console.info(`悬停状态: ${isHover}`)
})
```

---

## 焦点事件

**onFocus 获得焦点**
`<Component>.onFocus(() => { ... }): void`
```typescript
TextInput().onFocus(() => console.info('获得焦点'))
```

**onBlur 失去焦点**
`<Component>.onBlur(() => { ... }): void`
```typescript
TextInput().onBlur(() => console.info('失去焦点'))
```

---

## 动画属性绑定

**animation 属性动画绑定**
`.animation(value: AnimateParam): void`
```typescript
Image($r('app.media.icon'))
  .width(100).height(100)
  .scale({ x: this.scale, y: this.scale })
  .opacity(this.opacity)
  .animation({
    duration: 300,
    curve: Curve.EaseInOut,
    delay: 0,
    iterations: 1,
    playMode: PlayMode.Normal,
    onFinish: () => {}
  })
```

**AnimateParam 参数**
```typescript
interface AnimateParam {
  duration: number
  tempo?: number
  curve?: Curve | ICurve
  delay?: number
  iterations?: number
  playMode?: PlayMode
  onFinish?: () => void
  onStart?: () => void
}
```

---

## 变换属性

**scale 缩放**
`.scale(value: ScaleOptions): void`
```typescript
.scale({ x: 1.5, y: 1.5, centerX: 0, centerY: 0 })
```

**translate 平移**
`.translate(value: TranslateOptions): void`
```typescript
.translate({ x: 100, y: 50 })
```

**rotate 旋转**
`.rotate(value: RotateOptions): void`
```typescript
.rotate({ angle: 45, centerX: 0, centerY: 0 })
```

**ScaleOptions**
```typescript
interface ScaleOptions {
  x?: number
  y?: number
  z?: number
  centerX?: number | string
  centerY?: number | string
}
```

**TranslateOptions**
```typescript
interface TranslateOptions {
  x?: number | string
  y?: number | string
  z?: number | string
}
```

**RotateOptions**
```typescript
interface RotateOptions {
  angle: number | string
  centerX?: number | string
  centerY?: number | string
  centerZ?: number | string
  perspective?: number
}
```

---

## 图像效果

**brightness 亮度**
`.brightness(<number>): void`
```typescript
Image($r('app.media.icon')).brightness(1.5)
```

**saturate 饱和度**
`.saturate(<number>): void`
```typescript
Image($r('app.media.icon')).saturate(2.0)
```

**contrast 对比度**
`.contrast(<number>): void`
```typescript
Image($r('app.media.icon')).contrast(1.2)
```

---

## 转场动画

**transition 转场**
`.transition(value: TransitionOptions | TransitionOptions[]): void`
```typescript
Column() {
  Text('展开内容')
}
.transition({
  type: TransitionType.Insert,
  opacity: 0,
  translate: { y: -20 }
})
.transition({
  type: TransitionType.Delete,
  opacity: 0,
  translate: { y: -20 }
})
```

**TransitionType 枚举**
```typescript
enum TransitionType {
  All = 'all',
  Insert = 'insert',
  Delete = 'delete'
}
```

**TransitionOptions 配置**
```typescript
interface TransitionOptions {
  type?: TransitionType
  opacity?: number
  translate?: TranslateOptions
  scale?: ScaleOptions
  rotate?: RotateOptions
}
```

---

## 共享元素转场

**geometryTransition 共享元素**
`.geometryTransition(id: string): void`
```typescript
Image($r('app.media.photo'))
  .geometryTransition('shared_image_id')
  .width(100).height(100)
```
