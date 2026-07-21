---
order: 57
title: 动画系统
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 属性动画与显式动画
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/网络请求
  - harmonyos/数据持久化
  - harmonyos/手势与交互
  - harmonyos/通知与权限
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

HarmonyOS 提供了丰富的动画能力，涵盖属性动画、显式动画、转场动画和帧动画等多种类型。动画系统能够让界面状态变化更加平滑自然，提升用户体验。属性动画通过监听状态变化自动执行，显式动画通过代码主动触发，转场动画用于组件的插入与删除，帧动画则用于播放序列图片。

## 基础概念

**属性动画（animation）**：绑定在组件上的动画修饰器，当组件的属性值发生变化时自动产生过渡动画效果。支持设置持续时间、曲线、延迟等参数。

**显式动画（animateTo）**：通过函数调用主动触发的动画，在闭包内修改状态值即可驱动动画执行。适合需要精确控制动画时机的场景。

**转场动画（transition）**：组件插入或删除时的过渡效果，配合 if/else 条件渲染使用。支持透明度、缩放、平移、旋转等组合效果。

**动画曲线（Curve）**：控制动画速度变化的函数，如 Linear（匀速）、EaseInOut（先慢后快再慢）、Spring（弹簧）等。

**animatableParameter**：用于自定义可动画属性的装饰器，使自定义类型的属性也能参与动画插值。

## 快速上手

### 属性动画

```typescript
@Component
struct AnimationDemo {
  @State scale: number = 1
  @State opacity: number = 1

  build() {
    Column() {
      Image($r('app.media.icon'))
        .width(100)
        .height(100)
        .scale({ x: this.scale, y: this.scale })
        .opacity(this.opacity)
        // 绑定属性动画，属性变化时自动过渡
        .animation({
          duration: 300,
          curve: Curve.EaseInOut
        })

      Button('缩放')
        .onClick(() => {
          this.scale = this.scale === 1 ? 1.5 : 1
        })

      Button('淡入淡出')
        .onClick(() => {
          this.opacity = this.opacity === 1 ? 0.3 : 1
        })
    }
    .padding(20)
  }
}
```

### 显式动画

```typescript
@Component
struct ExplicitAnimationDemo {
  @State offsetX: number = 0
  @State rotation: number = 0

  build() {
    Column() {
      Row() {
        Text('可移动的元素')
          .fontSize(16)
      }
      .width(150)
      .height(50)
      .backgroundColor('#4CAF50')
      .borderRadius(8)
      .translate({ x: this.offsetX })
      .rotate({ angle: this.rotation })

      Button('向右移动并旋转')
        .margin({ top: 20 })
        .onClick(() => {
          // 在闭包中修改状态，触发显式动画
          animateTo({ duration: 500, curve: Curve.Spring }, () => {
            this.offsetX = this.offsetX === 0 ? 100 : 0
            this.rotation = this.rotation === 0 ? 45 : 0
          })
        })
    }
    .padding(20)
  }
}
```

## 详细用法

### 动画曲线详解

```typescript
@Component
struct CurveDemo {
  @State progress: number = 0

  build() {
    Column({ space: 20 }) {
      // 不同的动画曲线对比
      this.curveRow('Linear', Curve.Linear)
      this.curveRow('EaseIn', Curve.EaseIn)
      this.curveRow('EaseOut', Curve.EaseOut)
      this.curveRow('EaseInOut', Curve.EaseInOut)
      this.curveRow('FastOutSlowIn', Curve.FastOutSlowIn)
      this.curveRow('Spring', Curve.Spring)

      Button('开始动画')
        .onClick(() => {
          this.progress = this.progress === 0 ? 200 : 0
        })
    }
    .padding(20)
  }

  @Builder
  curveRow(name: string, curve: Curve) {
    Row() {
      Text(name)
        .width(100)
        .fontSize(12)
      Row()
        .width(20)
        .height(20)
        .backgroundColor('#2196F3')
        .borderRadius(10)
        .translate({ x: this.progress })
        .animation({ duration: 1000, curve: curve })
    }
    .width('100%')
  }
}
```

### 转场动画

```typescript
@Component
struct TransitionDemo {
  @State isExpanded: boolean = false

  build() {
    Column() {
      Button('展开/收起')
        .onClick(() => {
          // 使用显式动画包裹状态变更
          animateTo({ duration: 300 }, () => {
            this.isExpanded = !this.isExpanded
          })
        })

      if (this.isExpanded) {
        // 展开内容，带转场动画
        Column() {
          Text('这是展开的内容区域')
            .fontSize(14)
            .padding(16)
        }
        .width('100%')
        .backgroundColor('#f5f5f5')
        .borderRadius(8)
        .margin({ top: 10 })
        // 定义出现和消失的转场效果
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
      }
    }
    .padding(20)
  }
}
```

### 组合动画

```typescript
@Component
struct CombinedAnimationDemo {
  @State isPlaying: boolean = false

  build() {
    Column() {
      Row() {
        Text('组合动画')
          .fontSize(16)
          .fontColor(Color.White)
      }
      .width(120)
      .height(120)
      .justifyContent(FlexAlign.Center)
      .backgroundColor('#E91E63')
      .borderRadius(60)
      // 同时应用多种动画属性
      .scale({ x: this.isPlaying ? 1.2 : 1, y: this.isPlaying ? 1.2 : 1 })
      .rotate({ angle: this.isPlaying ? 360 : 0 })
      .opacity(this.isPlaying ? 0.7 : 1)
      .animation({
        duration: 800,
        curve: Curve.EaseInOut,
        iterations: this.isPlaying ? -1 : 1, // 无限循环
        playMode: PlayMode.Alternate // 正反交替播放
      })

      Button(this.isPlaying ? '停止' : '播放')
        .margin({ top: 30 })
        .onClick(() => {
          this.isPlaying = !this.isPlaying
        })
    }
    .padding(20)
  }
}
```

## 常见场景

### 按钮点击反馈

```typescript
@Component
struct ButtonFeedbackDemo {
  @State buttonScale: number = 1

  build() {
    Column() {
      Button('点击我')
        .width(200)
        .height(50)
        .fontSize(18)
        .scale({ x: this.buttonScale, y: this.buttonScale })
        .animation({
          duration: 150,
          curve: Curve.Sharp
        })
        .onClick(() => {
          // 按下缩小，松开恢复
          this.buttonScale = 0.9
          setTimeout(() => {
            this.buttonScale = 1
          }, 100)
        })
    }
    .padding(20)
  }
}
```

### 页面切换动画

```typescript
@Component
struct PageTransitionDemo {
  @State currentPage: number = 0

  build() {
    Column() {
      if (this.currentPage === 0) {
        Column() {
          Text('第一页')
            .fontSize(24)
        }
        .width('100%')
        .height(300)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#E3F2FD')
        .transition({ type: TransitionType.Insert, translate: { x: -300 } })
        .transition({ type: TransitionType.Delete, translate: { x: -300 } })
      } else {
        Column() {
          Text('第二页')
            .fontSize(24)
        }
        .width('100%')
        .height(300)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#FFF3E0')
        .transition({ type: TransitionType.Insert, translate: { x: 300 } })
        .transition({ type: TransitionType.Delete, translate: { x: 300 } })
      }

      Row() {
        Button('上一页')
          .onClick(() => {
            animateTo({ duration: 300, curve: Curve.EaseInOut }, () => {
              this.currentPage = 0
            })
          })
        Button('下一页')
          .onClick(() => {
            animateTo({ duration: 300, curve: Curve.EaseInOut }, () => {
              this.currentPage = 1
            })
          })
      }
      .margin({ top: 20 })
    }
    .padding(20)
  }
}
```

### 加载动画

```typescript
@Component
struct LoadingAnimationDemo {
  @State dot1Scale: number = 1
  @State dot2Scale: number = 1
  @State dot3Scale: number = 1

  build() {
    Row({ space: 12 }) {
      Circle()
        .width(12)
        .height(12)
        .fill('#2196F3')
        .scale({ x: this.dot1Scale, y: this.dot1Scale })
        .animation({ duration: 400, curve: Curve.EaseInOut, iterations: -1, playMode: PlayMode.Alternate })

      Circle()
        .width(12)
        .height(12)
        .fill('#2196F3')
        .scale({ x: this.dot2Scale, y: this.dot2Scale })
        .animation({ duration: 400, delay: 200, curve: Curve.EaseInOut, iterations: -1, playMode: PlayMode.Alternate })

      Circle()
        .width(12)
        .height(12)
        .fill('#2196F3')
        .scale({ x: this.dot3Scale, y: this.dot3Scale })
        .animation({ duration: 400, delay: 400, curve: Curve.EaseInOut, iterations: -1, playMode: PlayMode.Alternate })
    }
    .onAppear(() => {
      // 启动弹跳动画
      this.dot1Scale = 1.5
      this.dot2Scale = 1.5
      this.dot3Scale = 1.5
    })
  }
}
```

## 注意事项

- **属性动画 vs 显式动画**：属性动画绑定在组件上，属性变化即触发；显式动画需要主动调用 animateTo，适合需要精确控制时机的场景。两者不要对同一属性同时使用，否则会产生冲突。
- **animation 位置**：animation 修饰器必须放在需要动画的属性之后，否则动画不会生效。建议放在所有属性修饰器的最后。
- **性能考量**：尽量使用 transform 类属性（scale、translate、rotate）代替 width、height 等布局属性做动画，transform 不会触发布局重计算，性能更好。
- **闭包陷阱**：animateTo 闭包内只应包含状态修改语句，不要在闭包内执行异步操作或复杂逻辑，否则可能导致动画不生效。
- **转场动画前提**：transition 动画必须配合 animateTo 使用，仅修改状态而不用 animateTo 包裹时，转场动画不会执行。

## 进阶用法

### 自定义弹簧动画

```typescript
@Component
struct SpringAnimationDemo {
  @State offsetX: number = 0

  build() {
    Column() {
      Row() {
        Text('弹簧效果')
          .fontSize(16)
          .fontColor(Color.White)
      }
      .width(80)
      .height(80)
      .justifyContent(FlexAlign.Center)
      .backgroundColor('#FF5722')
      .borderRadius(40)
      .translate({ x: this.offsetX })

      Row() {
        Button('左弹')
          .onClick(() => {
            animateTo({
              duration: 1000,
              // 自定义弹簧曲线参数：速度、质量、刚度、阻尼
              curve: curves.springCurve(10, 1, 228, 30)
            }, () => {
              this.offsetX = -100
            })
          })
        Button('右弹')
          .onClick(() => {
            animateTo({
              duration: 1000,
              curve: curves.springCurve(10, 1, 228, 30)
            }, () => {
              this.offsetX = 100
            })
          })
        Button('复位')
          .onClick(() => {
            animateTo({
              duration: 1000,
              curve: curves.springCurve(10, 1, 228, 30)
            }, () => {
              this.offsetX = 0
            })
          })
      }
      .margin({ top: 30 })
    }
    .padding(20)
  }
}
```

### 动画回调与监听

```typescript
@Component
struct AnimationCallbackDemo {
  @State width: number = 100
  @State animState: string = '空闲'

  build() {
    Column() {
      Text(`动画状态: ${this.animState}`)
        .fontSize(14)
        .margin({ bottom: 20 })

      Row()
        .width(this.width)
        .height(40)
        .backgroundColor('#9C27B0')
        .borderRadius(8)
        .animation({
          duration: 1000,
          curve: Curve.EaseInOut,
          // 动画开始回调
          onStart: () => {
            this.animState = '播放中'
          },
          // 动画结束回调
          onFinish: () => {
            this.animState = '已完成'
          }
        })

      Button('切换宽度')
        .margin({ top: 20 })
        .onClick(() => {
          this.width = this.width === 100 ? 300 : 100
        })
    }
    .padding(20)
  }
}
```

### 帧动画

```typescript
@Component
struct FrameAnimationDemo {
  // 使用 ImageAnimator 播放序列帧动画
  @State images: Resource[] = [
    $r('app.media.frame1'),
    $r('app.media.frame2'),
    $r('app.media.frame3'),
    $r('app.media.frame4'),
  ]
  @State isRunning: boolean = false

  build() {
    Column() {
      ImageAnimator()
        .images(this.images.map((img, index) => {
          return { src: img }
        }))
        .duration(800)       // 一个周期的总时长
        .iterations(-1)      // 无限循环
        .fixedSize(false)
        .width(100)
        .height(100)
        .state(this.isRunning ? AnimationStatus.Running : AnimationStatus.Initial)

      Button(this.isRunning ? '暂停' : '播放')
        .margin({ top: 20 })
        .onClick(() => {
          this.isRunning = !this.isRunning
        })
    }
    .padding(20)
  }
}
```
