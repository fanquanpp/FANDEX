---
order: 65
title: 性能优化
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: HarmonyOS应用性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/卡片开发
  - harmonyos/应用签名与发布
  - harmonyos/测试与调试
  - harmonyos/国际化与无障碍
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

性能优化是 HarmonyOS 应用开发中不可忽视的环节。一个流畅、响应迅速的应用能显著提升用户体验，而卡顿、耗电的应用则会被用户快速卸载。HarmonyOS 提供了多种性能优化手段，从列表渲染、组件复用到状态管理和内存控制，覆盖了应用开发的各个方面。

为什么需要性能优化？移动设备的计算资源有限，如果应用在列表滚动时掉帧、页面切换时卡顿、后台运行时耗电，用户会直接感受到体验下降。性能问题通常不是单一原因造成的，而是多个小问题叠加的结果，因此需要系统性地排查和优化。

## 基础概念

**LazyForEach**：懒加载列表组件，只在列表项进入可视区域时才创建和渲染，适合大数据量场景。与 ForEach 不同，ForEach 会一次性创建所有列表项。

**cachedCount**：列表预渲染的缓存项数量。在可视区域外预先渲染若干项，滚动时可以立即显示，减少白屏时间。

**@Reusable**：组件复用装饰器，标记的组件在从组件树上移除后不会被销毁，而是缓存起来供下次复用，减少组件创建和销毁的开销。

**状态管理**：@State、@Prop、@Link 等装饰器管理组件状态。不合理的状态更新会触发不必要的重新渲染，是性能问题的常见来源。

**Profiling**：使用 DevEco Profiler 工具分析应用的 CPU、内存和渲染性能，定位瓶颈。

## 快速上手

最常见的性能优化场景是列表渲染：

```typescript
// 不推荐：ForEach 一次性渲染所有项
@Component
struct BadList {
  @State items: string[] = Array.from({ length: 10000 }, (_, i) => `项目 ${i}`)

  build() {
    List() {
      ForEach(this.items, (item: string) => {
        ListItem() {
          Text(item).fontSize(16)
        }
      })
    }
  }
}

// 推荐：LazyForEach 懒加载
@Component
struct GoodList {
  // 实现 IDataSource 接口的数据源
  private dataSource: MyDataSource = new MyDataSource()

  build() {
    List() {
      LazyForEach(this.dataSource, (item: string) => {
        ListItem() {
          Text(item).fontSize(16)
        }
      })
    }
    .cachedCount(5) // 预渲染5个缓存项
  }
}

// 实现 IDataSource
class MyDataSource implements IDataSource {
  private data: string[] = Array.from({ length: 10000 }, (_, i) => `项目 ${i}`)
  private listeners: DataChangeListener[] = []

  totalCount(): number {
    return this.data.length
  }

  getData(index: number): string {
    return this.data[index]
  }

  registerDataChangeListener(listener: DataChangeListener): void {
    this.listeners.push(listener)
  }

  unregisterDataChangeListener(listener: DataChangeListener): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }
}
```

## 详细用法

### 组件复用

```typescript
// 使用 @Reusable 标记可复用组件
@Reusable
@Component
struct ReusableItem {
  @State title: string = ''

  // aboutToReuse 在组件被复用时调用，接收新的数据
  aboutToReuse(params: Record<string, Object): void {
    this.title = params.title as string
  }

  build() {
    Row() {
      Text(this.title).fontSize(16)
    }
    .width('100%')
    .height(60)
  }
}

// 在列表中使用复用组件
@Component
struct ReusableList {
  private dataSource: MyDataSource = new MyDataSource()

  build() {
    List() {
      LazyForEach(this.dataSource, (item: string) => {
        ListItem() {
          // 复用组件，滚动时不会反复创建和销毁
          ReusableItem({ title: item })
        }
      })
    }
    .cachedCount(5)
  }
}
```

### 减少嵌套层级

```typescript
// 不推荐：深层嵌套
@Component
struct DeepNested {
  build() {
    Column() {
      Column() {
        Row() {
          Column() {
            Text('内容')
          }
        }
      }
    }
  }
}

// 推荐：扁平化布局
@Component
struct FlatLayout {
  build() {
    Column() {
      Text('内容')
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .justifyContent(FlexAlign.Center)
  }
}
```

### 状态更新优化

```typescript
@Component
struct StateOptimization {
  @State count: number = 0
  @State list: number[] = []

  // 不推荐：直接修改数组引用（触发整个列表重新渲染）
  addItemBad() {
    this.list = [...this.list, this.count]
  }

  // 推荐：使用数组方法（只更新变化的部分）
  addItemGood() {
    this.list.push(this.count)
  }

  // 不推荐：频繁更新状态
  incrementBad() {
    for (let i = 0; i < 100; i++) {
      this.count += 1 // 每次循环都触发重新渲染
    }
  }

  // 推荐：批量更新
  incrementGood() {
    this.count += 100 // 只触发一次重新渲染
  }

  build() {
    Column() {
      Text(`计数: ${this.count}`)
      Button('增加').onClick(() => this.incrementGood())
    }
  }
}
```

### 图片优化

```typescript
@Component
struct ImageOptimization {
  build() {
    Column() {
      // 不推荐：加载原始尺寸的大图
      Image('https://example.com/large-image.jpg')
        .width(100).height(100)

      // 推荐：指定解码尺寸，减少内存占用
      Image('https://example.com/large-image.jpg')
        .width(100).height(100)
        .objectFit(ImageFit.Cover)
        .alt($r('app.media.placeholder')) // 加载中显示占位图

      // 推荐：使用本地资源
      Image($r('app.media.icon'))
        .width(48).height(48)
    }
  }
}
```

### 条件渲染优化

```typescript
@Component
struct ConditionalRender {
  @State isLoading: boolean = true
  @State data: string[] = []

  build() {
    Column() {
      // 不推荐：使用 if/else 频繁切换（组件会被销毁和重建）
      if (this.isLoading) {
        LoadingProgress()
      } else {
        List() {
          ForEach(this.data, (item: string) => {
            ListItem() { Text(item) }
          })
        }
      }

      // 推荐：使用 visibility 控制显隐（组件不会被销毁）
      LoadingProgress()
        .visibility(this.isLoading ? Visibility.Visible : Visibility.None)

      List() {
        ForEach(this.data, (item: string) => {
          ListItem() { Text(item) }
        })
      }
      .visibility(this.isLoading ? Visibility.None : Visibility.Visible)
    }
  }
}
```

### 动画性能优化

```typescript
@Component
struct AnimationOptimization {
  @State translateX: number = 0

  build() {
    Column() {
      Row()
        .width(100).height(100)
        .backgroundColor(Color.Blue)
        // 推荐：使用 transform 属性做动画（GPU 加速）
        .translate({ x: this.translateX })
        .animation({
          duration: 300,
          curve: Curve.EaseInOut
        })

      Button('移动').onClick(() => {
        this.translateX = this.translateX === 0 ? 200 : 0
      })
    }
  }
}
```

## 常见场景

### 长列表优化完整示例

```typescript
@Reusable
@Component
struct ArticleItem {
  @State title: string = ''
  @State summary: string = ''
  @State imageUrl: string = ''

  aboutToReuse(params: Record<string, Object): void {
    this.title = params.title as string
    this.summary = params.summary as string
    this.imageUrl = params.imageUrl as string
  }

  build() {
    Row() {
      Image(this.imageUrl)
        .width(80).height(80)
        .objectFit(ImageFit.Cover)
        .alt($r('app.media.placeholder'))
      Column() {
        Text(this.title).fontSize(16).fontWeight(FontWeight.Bold)
        Text(this.summary).fontSize(14).fontColor('#666666')
          .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .margin({ left: 12 })
    }
    .width('100%')
    .padding(12)
  }
}

@Component
struct ArticleList {
  private dataSource: ArticleDataSource = new ArticleDataSource()

  build() {
    List({ space: 8 }) {
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
    .cachedCount(3)
    .width('100%')
    .height('100%')
  }
}
```

### 页面加载优化

```typescript
@Entry
@Component
struct OptimizedPage {
  @State data: string[] = []
  @State isLoading: boolean = true

  // 页面即将显示时加载数据
  aboutToAppear() {
    this.loadData()
  }

  private async loadData() {
    try {
      // 模拟数据加载
      this.data = await fetchData()
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      if (this.isLoading) {
        // 加载中状态
        Column() {
          LoadingProgress().width(48).height(48)
          Text('加载中...').margin({ top: 12 })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        // 内容区域
        List() {
          ForEach(this.data, (item: string) => {
            ListItem() { Text(item).padding(16) }
          })
        }
      }
    }
  }
}
```

## 注意事项

**避免在 build 方法中创建对象**：build 方法在每次状态更新时都会被调用，在其中创建新对象会导致频繁的垃圾回收。将对象的创建移到组件初始化阶段。

**合理使用 @Watch**：@Watch 装饰器会在状态变化时触发回调，如果回调中又修改了被监听的状态，可能导致无限循环。

**LazyForEach 的 key**：LazyForEach 需要通过 key 来标识列表项的唯一性。确保 key 的生成逻辑稳定且唯一，否则会导致列表渲染异常。

**图片资源大小**：移动设备屏幕有限，加载超过显示尺寸的图片是浪费内存。根据显示尺寸选择合适的图片分辨率。

**内存泄漏**：注意在组件销毁时（aboutToDisappear）清理定时器、取消订阅和释放资源。

## 进阶用法

### 使用 DevEco Profiler 分析性能

在 DevEco Studio 中打开 Profiler 工具：

1. 选择 "Run" -> "Profile" 启动性能分析
2. 选择分析类型：CPU、内存、渲染
3. 操作应用复现性能问题
4. 分析热点函数和内存分配

### 使用 TaskPool 进行耗时计算

```typescript
import taskpool from '@ohos.taskpool'

// 定义耗时任务
@Concurrent
function heavyCalculation(data: number[]): number {
  return data.reduce((sum, val) => sum + val * val, 0)
}

@Component
struct TaskPoolExample {
  @State result: number = 0

  async calculate() {
    const data = Array.from({ length: 1000000 }, (_, i) => i)
    // 在子线程中执行耗时计算
    const task = new taskpool.Task(heavyCalculation, data)
    this.result = await taskpool.execute(task) as number
  }

  build() {
    Column() {
      Text(`结果: ${this.result}`)
      Button('计算').onClick(() => this.calculate())
    }
  }
}
```
