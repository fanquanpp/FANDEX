# 动画系统 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 属性动画

**绑定属性动画**
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
  });
```

**AnimateParam 参数**
```typescript
interface AnimateParam {
  duration: number;          // 动画持续时间(ms)
  tempo?: number;            // 播放速率,默认 1.0
  curve?: Curve | ICurve;    // 动画曲线
  delay?: number;            // 延迟启动时间(ms)
  iterations?: number;       // 重复次数,-1 表示无限循环
  playMode?: PlayMode;       // 播放模式
  onFinish?: () => void;     // 动画结束回调
  onStart?: () => void;      // 动画开始回调
}
```

---

## 显式动画

**触发显式动画**
`animateTo(value: AnimateParam, event: () => void): void`
```typescript
animateTo({ duration: 500, curve: Curve.Spring }, () => {
  this.offsetX = 100;
  this.rotation = 45;
});
```

**带回调的显式动画**
`animateTo(value: AnimateParam, event: () => void): void`
```typescript
animateTo({
  duration: 1000,
  curve: Curve.EaseInOut,
  onFinish: () => {
    console.info('动画完成');
  }
}, () => {
  this.width = 300;
});
```

**关闭显式动画**
`animateToWithClosedOptions(event: () => void): void`
```typescript
animateToWithClosedOptions(() => {
  this.width = 200;
});
```

---

## 动画曲线

**Curve 枚举**
`Curve`
```typescript
enum Curve {
  Linear = 'linear',
  Ease = 'ease',
  EaseIn = 'easeIn',
  EaseOut = 'easeOut',
  EaseInOut = 'easeInOut',
  FastOutSlowIn = 'fastOutSlowIn',
  LinearOutSlowIn = 'linearOutSlowIn',
  FastOutLinearIn = 'fastOutLinearIn',
  ExtremeDeceleration = 'extremeDeceleration',
  Sharp = 'sharp',
  Rhythm = 'rhythm',
  Smooth = 'smooth',
  Friction = 'friction'
}
```

**Spring 弹簧曲线**
`curves.springCurve(velocity: number, mass: number, stiffness: number, damping: number): ICurve`
```typescript
import { curves } from '@kit.ArkUI';

const springCurve = curves.springCurve(10, 1, 228, 30);
```

**SpringMotion 曲线**
`curves.springMotion(options: SpringMotionOptions): ICurve`
```typescript
const motion = curves.springMotion({
  stiffness: 200,
  damping: 20,
  mass: 1
});
```

**自定义贝塞尔曲线**
`curves.cubicBezierCurve(p1x: number, p1y: number, p2x: number, p2y: number): ICurve`
```typescript
const bezier = curves.cubicBezierCurve(0.4, 0.0, 0.2, 1.0);
```

**自定义阶跃曲线**
`curves.stepsCurve(count: number, isEnd: boolean): ICurve`
```typescript
const steps = curves.stepsCurve(4, true);
```

---

## PlayMode 播放模式

**PlayMode 枚举**
`PlayMode`
```typescript
enum PlayMode {
  Normal = 'normal',       // 正常播放
  Reverse = 'reverse',     // 反向播放
  Alternate = 'alternate', // 正反交替播放
  AlternateReverse = 'alternateReverse' // 反正交替播放
}
```

---

## 转场动画

**定义转场动画**
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
});
```

**TransitionType 枚举**
`TransitionType`
```typescript
enum TransitionType {
  All = 'all',     // 所有情况
  Insert = 'insert', // 插入时
  Delete = 'delete'  // 删除时
}
```

**TransitionOptions 配置**
```typescript
interface TransitionOptions {
  type?: TransitionType;
  opacity?: number;
  translate?: TranslateOptions;
  scale?: ScaleOptions;
  rotate?: RotateOptions;
}
```

**转场动画必须配合 animateTo**
```typescript
animateTo({ duration: 300 }, () => {
  this.isExpanded = !this.isExpanded;
});
```

---

## 组件转场动画 API

**共享元素转场**
`.geometryTransition(id: string): void`
```typescript
Image($r('app.media.photo'))
  .geometryTransition('shared_image_id')
  .width(100).height(100);
```

**组件转场(出现/消失)**
`.transition(transition: TransitionOptions): void`
```typescript
if (this.isVisible) {
  Text('出现的内容')
    .transition({ type: TransitionType.Insert, opacity: 0 })
    .transition({ type: TransitionType.Delete, opacity: 0 });
}
```

---

## 帧动画 ImageAnimator

**ImageAnimator 组件**
```typescript
ImageAnimator()
  .images([
    { src: $r('app.media.frame1') },
    { src: $r('app.media.frame2') },
    { src: $r('app.media.frame3') },
    { src: $r('app.media.frame4') }
  ])
  .duration(800)
  .iterations(-1)
  .state(AnimationStatus.Running)
  .fixedSize(false)
  .width(100)
  .height(100);
```

**AnimationStatus 枚举**
`AnimationStatus`
```typescript
enum AnimationStatus {
  Initial = 'initial',
  Running = 'running',
  Paused = 'paused',
  Stopped = 'stopped'
}
```

**ImageAnimator 事件**
`.onStart(event: () => void): void`
`.onPause(event: () => void): void`
`.onRepeat(event: () => void): void`
`.onStop(event: () => void): void`
`.onFinish(event: () => void): void`
```typescript
ImageAnimator()
  .images(this.frames)
  .duration(800)
  .onStart(() => console.info('动画开始'))
  .onFinish(() => console.info('动画结束'));
```

---

## 属性动画变换 API

**缩放**
`.scale(value: ScaleOptions): void`
```typescript
.scale({ x: 1.5, y: 1.5, centerX: 0, centerY: 0 });
```

**平移**
`.translate(value: TranslateOptions): void`
```typescript
.translate({ x: 100, y: 50 });
```

**旋转**
`.rotate(value: RotateOptions): void`
```typescript
.rotate({ angle: 45, centerX: 0, centerY: 0 });
```

**透明度**
`.opacity(value: number | Resource): void`
```typescript
.opacity(0.5);
```

**亮度**
`.brightness(value: number): void`
```typescript
.brightness(1.5);
```

**饱和度**
`.saturate(value: number): void`
```typescript
.saturate(2.0);
```

**对比度**
`.contrast(value: number): void`
```typescript
.contrast(1.2);
```

---

## ScaleOptions/TranslateOptions/RotateOptions

**ScaleOptions**
```typescript
interface ScaleOptions {
  x?: number;     // X 轴缩放比例,默认 1
  y?: number;     // Y 轴缩放比例,默认 1
  z?: number;     // Z 轴缩放比例,默认 1
  centerX?: number | string; // 缩放中心 X
  centerY?: number | string; // 缩放中心 Y
}
```

**TranslateOptions**
```typescript
interface TranslateOptions {
  x?: number | string; // X 轴偏移
  y?: number | string; // Y 轴偏移
  z?: number | string; // Z 轴偏移
}
```

**RotateOptions**
```typescript
interface RotateOptions {
  angle: number | string;  // 旋转角度
  centerX?: number | string;
  centerY?: number | string;
  centerZ?: number | string;
  perspective?: number;    // 视距
}
```

---

## 页面转场动画

**页面进入动画**
`PageTransitionEnter(value: PageTransitionOptions): PageTransitionEnterInterface`
```typescript
@Entry
@Component
struct PageA {
  @State scale: number = 1;

  pageTransition() {
    PageTransitionEnter({ duration: 500, curve: Curve.EaseInOut })
      .opacity(0)
      .scale({ x: 0.5, y: 0.5 });
    PageTransitionExit({ duration: 500, curve: Curve.EaseInOut })
      .opacity(0)
      .translate({ x: 300 });
  }
}
```

**页面退出动画**
`PageTransitionExit(value: PageTransitionOptions): PageTransitionExitInterface`
```typescript
PageTransitionExit({ duration: 500 })
  .opacity(0)
  .translate({ x: -300 });
```

**PageTransitionOptions**
```typescript
interface PageTransitionOptions {
  duration: number;
  delay?: number;
  curve?: Curve | string;
  path?: string | CustomPath;
}
```

