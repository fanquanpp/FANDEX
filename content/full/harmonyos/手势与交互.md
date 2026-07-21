---
order: 58
title: 手势与交互
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 手势识别与触摸事件
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/数据持久化
  - harmonyos/动画系统
  - harmonyos/通知与权限
  - harmonyos/多媒体能力
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

手势与交互是移动应用用户体验的核心。HarmonyOS 提供了丰富的手势识别能力，包括点击、长按、拖动、缩放、旋转等基础手势，以及组合手势和自定义手势。通过手势系统，你可以让用户以自然的方式与应用交互，而不局限于按钮点击。

为什么需要手势系统？触屏设备上，手势是最自然的交互方式。用户习惯通过滑动浏览内容、双指缩放图片、长按呼出菜单。如果你的应用只支持点击，用户体验会大打折扣。HarmonyOS 的手势系统让你可以轻松实现这些交互模式。

## 基础概念

**TapGesture**：点击手势，支持单击、双击和多击识别。

**LongPressGesture**：长按手势，用户按住一段时间后触发。

**PanGesture**：拖动手势，用户按住并移动手指时触发，常用于滑动和拖拽。

**PinchGesture**：捏合手势，双指缩放，用于图片缩放等场景。

**RotationGesture**：旋转手势，双指旋转，用于图片旋转等场景。

**GestureGroup**：组合手势，将多个手势组合在一起，支持串行、并行和互斥模式。

## 快速上手

最简单的手势示例：

```typescript
@Entry
@Component
struct GestureDemo {
  @State message: string = '试试各种手势'

  build() {
    Column() {
      Text(this.message)
        .fontSize(24)

      // 点击手势
      Text('点击我')
        .fontSize(20)
        .padding(20)
        .backgroundColor('#f0f0f0')
        .gesture(
          TapGesture()
            .onAction(() => {
              this.message = '你点击了！'
            })
        )
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

## 详细用法

### 点击手势

```typescript
@Component
struct TapGestureDemo {
  @State clickCount: number = 0
  @State doubleClickMsg: string = ''

  build() {
    Column() {
      // 单击手势
      Text('单击计数: ' + this.clickCount)
        .fontSize(20)
        .padding(20)
        .backgroundColor('#e0e0e0')
        .gesture(
          TapGesture({ count: 1 }) // count: 1 表示单击
            .onAction(() => {
              this.clickCount++
            })
        )

      // 双击手势
      Text(this.doubleClickMsg || '双击我')
        .fontSize(20)
        .padding(20)
        .backgroundColor('#d0d0d0')
        .gesture(
          TapGesture({ count: 2 }) // count: 2 表示双击
            .onAction(() => {
              this.doubleClickMsg = '双击成功！'
            })
        )
    }
  }
}
```

### 长按手势

```typescript
@Component
struct LongPressDemo {
  @State pressMsg: string = '长按我'

  build() {
    Column() {
      Text(this.pressMsg)
        .fontSize(20)
        .padding(20)
        .backgroundColor('#c0c0c0')
        .gesture(
          LongPressGesture({ repeat: true }) // repeat: 重复触发
            .onAction((event: GestureEvent) => {
              this.pressMsg = `长按中... 重复次数: ${event.repeatCount}`
            })
            .onActionEnd(() => {
              this.pressMsg = '长按结束'
            })
        )
    }
  }
}
```

### 拖动手势

```typescript
@Component
struct PanGestureDemo {
  @State offsetX: number = 0
  @State offsetY: number = 0

  build() {
    Column() {
      Row() {
        Text('拖动我')
          .fontSize(18)
          .fontColor(Color.White)
      }
      .width(100)
      .height(100)
      .backgroundColor(Color.Blue)
      .translate({ x: this.offsetX, y: this.offsetY }) // 使用 translate 实现移动
      .gesture(
        PanGesture()
          .onActionStart(() => {
            console.info('开始拖动')
          })
          .onActionUpdate((event: GestureEvent) => {
            // 累加偏移量
            this.offsetX += event.offsetX
            this.offsetY += event.offsetY
          })
          .onActionEnd(() => {
            console.info('拖动结束')
          })
      )

      Button('重置位置').onClick(() => {
        this.offsetX = 0
        this.offsetY = 0
      })
    }
    .width('100%')
    .height('100%')
  }
}
```

### 缩放手势

```typescript
@Component
struct PinchGestureDemo {
  @State scale: number = 1.0

  build() {
    Column() {
      Image($r('app.media.test_image'))
        .width(300)
        .height(300)
        .objectFit(ImageFit.Contain)
        .scale({ x: this.scale, y: this.scale }) // 根据缩放比例调整大小
        .gesture(
          PinchGesture()
            .onActionStart(() => {
              console.info('开始缩放')
            })
            .onActionUpdate((event: GestureEvent) => {
              // event.scale 是相对于初始状态的缩放比
              this.scale = Math.max(0.5, Math.min(3.0, this.scale * event.scale))
            })
        )

      Text(`缩放比例: ${this.scale.toFixed(2)}`)
        .fontSize(16)
        .margin({ top: 12 })

      Button('重置').onClick(() => {
        this.scale = 1.0
      })
    }
  }
}
```

### 旋转手势

```typescript
@Component
struct RotationGestureDemo {
  @State angle: number = 0

  build() {
    Column() {
      Image($r('app.media.test_image'))
        .width(200)
        .height(200)
        .objectFit(ImageFit.Contain)
        .rotate({ angle: this.angle }) // 根据角度旋转
        .gesture(
          RotationGesture()
            .onActionUpdate((event: GestureEvent) => {
              this.angle += event.angle
            })
        )

      Text(`旋转角度: ${this.angle.toFixed(0)} 度`)
        .fontSize(16)
        .margin({ top: 12 })

      Button('重置').onClick(() => {
        this.angle = 0
      })
    }
  }
}
```

### 组合手势

```typescript
@Component
struct GestureGroupDemo {
  @State msg: string = '试试不同手势'

  build() {
    Column() {
      Text(this.msg)
        .fontSize(20)
        .padding(30)
        .backgroundColor('#e8e8e8')
        .gesture(
          // 互斥模式：只响应第一个识别成功的手势
          GestureGroup(GestureMode.Exclusive,
            TapGesture({ count: 2 })
              .onAction(() => {
                this.msg = '双击'
              }),
            LongPressGesture()
              .onAction(() => {
                this.msg = '长按'
              }),
            PanGesture()
              .onAction(() => {
                this.msg = '拖动'
              })
          )
        )
    }
  }
}
```

组合手势的三种模式：

```typescript
// 1. 互斥模式（Exclusive）：只响应第一个识别成功的手势
GestureGroup(GestureMode.Exclusive, tapGesture, longPressGesture);

// 2. 并行模式（Parallel）：所有手势同时识别
GestureGroup(GestureMode.Parallel, pinchGesture, rotationGesture);

// 3. 串行模式（Sequential）：按顺序识别，前一个完成后才开始下一个
GestureGroup(GestureMode.Sequential, longPressGesture, panGesture);
// 先长按，长按成功后才能拖动
```

### 触摸事件

除了手势，还可以直接处理触摸事件：

```typescript
@Component
struct TouchEventDemo {
  @State touchMsg: string = '触摸此区域'
  @State x: number = 0
  @State y: number = 0

  build() {
    Column() {
      Text(this.touchMsg)
        .fontSize(16)
      Text(`坐标: (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`)
        .fontSize(14)
        .fontColor('#666666')
    }
    .width(300)
    .height(200)
    .backgroundColor('#f0f0f0')
    .justifyContent(FlexAlign.Center)
    .onTouch((event: TouchEvent) => {
      switch (event.type) {
        case TouchType.Down:
          this.touchMsg = '手指按下'
          break
        case TouchType.Move:
          this.touchMsg = '手指移动'
          break
        case TouchType.Up:
          this.touchMsg = '手指抬起'
          break
      }
      this.x = event.touches[0].x
      this.y = event.touches[0].y
    })
  }
}
```

## 常见场景

### 可拖动的浮动按钮

```typescript
@Component
struct DraggableButton {
  @State posX: number = 300
  @State posY: number = 500

  build() {
    Stack() {
      // 页面内容
      Text('页面内容区域')
        .fontSize(24)

      // 可拖动的浮动按钮
      Button('+')
        .width(56)
        .height(56)
        .fontSize(28)
        .borderRadius(28)
        .position({ x: this.posX, y: this.posY })
        .gesture(
          PanGesture()
            .onActionUpdate((event: GestureEvent) => {
              this.posX += event.offsetX
              this.posY += event.offsetY
            })
        )
    }
    .width('100%')
    .height('100%')
  }
}
```

### 图片查看器（缩放+旋转）

```typescript
@Component
struct ImageViewer {
  @State scale: number = 1.0
  @State angle: number = 0
  @State offsetX: number = 0
  @State offsetY: number = 0

  build() {
    Stack() {
      Image($r('app.media.photo'))
        .objectFit(ImageFit.Contain)
        .scale({ x: this.scale, y: this.scale })
        .rotate({ angle: this.angle })
        .translate({ x: this.offsetX, y: this.offsetY })
        .gesture(
          GestureGroup(GestureMode.Parallel,
            // 缩放
            PinchGesture()
              .onActionUpdate((event: GestureEvent) => {
                this.scale = Math.max(0.5, Math.min(5.0, this.scale * event.scale))
              }),
            // 旋转
            RotationGesture()
              .onActionUpdate((event: GestureEvent) => {
                this.angle += event.angle
              }),
            // 拖动
            PanGesture()
              .onActionUpdate((event: GestureEvent) => {
                this.offsetX += event.offsetX
                this.offsetY += event.offsetY
              })
          )
        )

      // 重置按钮
      Button('重置')
        .position({ x: 16, y: 16 })
        .onClick(() => {
          this.scale = 1.0
          this.angle = 0
          this.offsetX = 0
          this.offsetY = 0
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.Black)
  }
}
```

## 注意事项

**手势冲突**：当父子组件都绑定了手势时，默认由子组件消费手势事件。如果需要父组件处理，可以使用 `.priorityGesture()` 代替 `.gesture()`。

**手势与滚动的冲突**：在可滚动容器（List、Scroll）中使用 PanGesture 可能会与滚动冲突。使用 `.parallelGesture()` 可以让两者同时工作。

**性能考虑**：手势回调中的计算应尽量轻量，避免在 onActionUpdate 中执行耗时操作，因为它在手指移动时会被高频调用。

**手势识别距离**：PanGesture 默认需要移动一定距离才会触发，可以通过 `distance` 参数调整。

## 进阶用法

### 自定义手势识别

```typescript
@Component
struct CustomGestureDemo {
  @State msg: string = ''

  build() {
    Column() {
      Text(this.msg).fontSize(20)

      // 使用原始触摸事件实现自定义手势
      Column() {
        Text('自定义手势区域')
      }
      .width(200)
      .height(200)
      .backgroundColor('#e0e0e0')
      .onTouch((event: TouchEvent) => {
        if (event.type === TouchType.Down) {
          // 记录按下位置和时间
          console.info(`按下位置: (${event.touches[0].x}, ${event.touches[0].y})`)
        } else if (event.type === TouchType.Up) {
          // 计算滑动方向和速度
          console.info('手指抬起')
        }
      })
    }
  }
}
```

### 手势与动画配合

```typescript
@Component
struct GestureAnimationDemo {
  @State scale: number = 1.0
  @State brightness: number = 1.0

  build() {
    Column() {
      Image($r('app.media.photo'))
        .width(300)
        .height(300)
        .objectFit(ImageFit.Cover)
        .scale({ x: this.scale, y: this.scale })
        .brightness(this.brightness)
        .gesture(
          PinchGesture()
            .onActionUpdate((event: GestureEvent) => {
              this.scale = Math.max(0.5, Math.min(3.0, this.scale * event.scale))
            })
        )
        .animation({
          duration: 200,
          curve: Curve.EaseOut
        })
    }
  }
}
```
