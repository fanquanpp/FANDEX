---
order: 53
title: 列表与网格
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: List与Grid组件
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/状态管理
  - harmonyos/自定义组件
  - harmonyos/导航与路由
  - harmonyos/网络请求
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

列表和网格是移动应用中最常见的布局方式。HarmonyOS 提供了 List 和 Grid 两个核心组件，分别用于线性列表和二维网格的展示。它们内置了滚动、复用和懒加载能力，能够高效地处理大量数据的渲染。配合 ForEach 或 LazyForEach，可以灵活地实现动态数据驱动的列表与网格界面。

## 基础概念

**List 组件**：垂直或水平方向的线性列表容器，每个子项通过 ListItem 包裹。支持分组（ListItemGroup）、滑动删除、下拉刷新、滚动定位等特性。

**Grid 组件**：二维网格布局容器，每个子项通过 GridItem 包裹。通过 columnsTemplate 和 rowsTemplate 定义行列结构，支持不规则网格和可滚动网格。

**LazyForEach**：与 ForEach 不同，LazyForEach 采用懒加载机制，仅渲染可视区域内的组件，适合大数据量场景。需要配合 IDataSource 数据源使用。

**cachedCount**：列表预渲染的缓存项数量，在可视区域外额外渲染若干项以提升滑动流畅度。

## 快速上手

### 基本列表

```typescript
@Component
struct BasicList {
  // 定义数据源
  @State items: string[] = ['项目一', '项目二', '项目三', '项目四', '项目五']

  build() {
    Column() {
      List() {
        // 使用 ForEach 遍历数据
        ForEach(this.items, (item: string, index?: number) => {
          ListItem() {
            Row() {
              Text(`第${index}项`)
                .fontSize(16)
              Text(item)
                .fontSize(14)
                .fontColor('#666666')
            }
            .width('100%')
            .padding(12)
          }
        }, (item: string, index?: number) => `${index}`)
      }
      .width('100%')
      .height('100%')
    }
  }
}
```

### 基本网格

```typescript
@Component
struct BasicGrid {
  @State items: number[] = [1, 2, 3, 4, 5, 6]

  build() {
    Grid() {
      ForEach(this.items, (item: number) => {
        GridItem() {
          Text(`项目${item}`)
            .fontSize(18)
            .textAlign(TextAlign.Center)
        }
        .backgroundColor('#f0f0f0')
        .borderRadius(8)
        .padding(20)
      }, (item: number) => item.toString())
    }
    // 定义三列等宽布局
    .columnsTemplate('1fr 1fr 1fr')
    .rowsGap(10)
    .columnsGap(10)
    .padding(10)
  }
}
```

## 详细用法

### List 分组与粘性标题

```typescript
@Component
struct GroupedList {
  // 按分组组织数据
  @State groups: object[] = [
    { title: '水果', items: ['苹果', '香蕉', '橙子'] },
    { title: '蔬菜', items: ['番茄', '黄瓜', '胡萝卜'] },
    { title: '饮料', items: ['咖啡', '茶', '果汁'] },
  ]

  build() {
    List({ space: 8 }) {
      ForEach(this.groups, (group: Record<string, Object>) => {
        ListItemGroup({ header: this.groupHeader(group.title) }) {
          ForEach(group.items, (item: string) => {
            ListItem() {
              Text(item)
                .fontSize(15)
                .padding({ left: 16, top: 10, bottom: 10 })
            }
          }, (item: string) => item)
        }
        // 粘性标题：滑动时标题固定在顶部
        .sticky(StickyStyle.Header)
      }, (group: Record<string, Object>) => group.title)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  groupHeader(title: string) {
    Row() {
      Text(title)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
    }
    .width('100%')
    .padding(12)
    .backgroundColor('#e8e8e8')
  }
}
```

### LazyForEach 懒加载列表

```typescript
// 实现 IDataSource 接口的数据源
class ListDataSource implements IDataSource {
  private dataArray: string[] = []
  private listeners: DataChangeListener[] = []

  // 构造函数中初始化数据
  constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.dataArray.push(`数据项 ${i}`)
    }
  }

  // 返回数据总数
  totalCount(): number {
    return this.dataArray.length
  }

  // 返回指定位置的数据
  getData(index: number): string {
    return this.dataArray[index]
  }

  // 注册数据变更监听器
  registerDataChangeListener(listener: DataChangeListener): void {
    if (this.listeners.indexOf(listener) < 0) {
      this.listeners.push(listener)
    }
  }

  // 注销数据变更监听器
  unregisterDataChangeListener(listener: DataChangeListener): void {
    const pos = this.listeners.indexOf(listener)
    if (pos >= 0) {
      this.listeners.splice(pos, 1)
    }
  }

  // 追加数据并通知监听器
  public appendData(item: string): void {
    this.dataArray.push(item)
    this.listeners.forEach(listener => listener.onDataAdd(this.dataArray.length - 1))
  }
}

@Component
struct LazyListPage {
  // 使用 LazyForEach 数据源
  private dataSource: ListDataSource = new ListDataSource(100)

  build() {
    List() {
      // 懒加载：仅渲染可视区域内的项
      LazyForEach(this.dataSource, (item: string) => {
        ListItem() {
          Text(item)
            .width('100%')
            .height(60)
            .fontSize(15)
            .padding({ left: 16 })
          Divider().margin({ left: 16 })
        }
      }, (item: string) => item)
    }
    .cachedCount(5) // 预渲染5个缓存项
    .width('100%')
    .height('100%')
  }
}
```

### List 滑动删除与下拉刷新

```typescript
@Component
struct SwipeListPage {
  @State items: string[] = ['待办事项一', '待办事项二', '待办事项三']

  build() {
    List({ space: 10 }) {
      ForEach(this.items, (item: string, index?: number) => {
        ListItem() {
          Row() {
            Text(item).fontSize(15)
          }
          .width('100%')
          .padding(16)
          .backgroundColor(Color.White)
          .borderRadius(8)
        }
        // 左滑显示删除按钮
        .swipeAction({ end: this.deleteButton(index) })
      }, (item: string, index?: number) => `${index}`)
    }
    .padding(16)
    .onRefresh(() => {
      // 下拉刷新回调
      console.info('正在刷新数据...')
    })
  }

  @Builder
  deleteButton(index?: number) {
    Button('删除')
      .backgroundColor(Color.Red)
      .fontColor(Color.White)
      .borderRadius(8)
      .onClick(() => {
        if (index !== undefined) {
          this.items.splice(index, 1)
        }
      })
  }
}
```

### Grid 不规则布局

```typescript
@Component
struct IrregularGrid {
  build() {
    Grid() {
      // 大图项：占据两列
      GridItem() {
        Text('推荐')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
      }
      .columnStart(0).columnEnd(1) // 跨两列
      .backgroundColor('#ff6b6b')
      .borderRadius(8)
      .padding(30)

      GridItem() {
        Text('热门')
          .fontSize(16)
      }
      .backgroundColor('#ffd93d')
      .borderRadius(8)
      .padding(20)

      GridItem() {
        Text('最新')
          .fontSize(16)
      }
      .backgroundColor('#6bcb77')
      .borderRadius(8)
      .padding(20)

      GridItem() {
        Text('精选')
          .fontSize(16)
      }
      .backgroundColor('#4d96ff')
      .borderRadius(8)
      .padding(20)
    }
    .columnsTemplate('1fr 1fr')
    .rowsGap(10)
    .columnsGap(10)
    .padding(10)
  }
}
```

## 常见场景

### 聊天消息列表

```typescript
interface ChatMessage {
  id: string
  content: string
  isMine: boolean  // 是否为自己发送的消息
  time: string
}

@Component
struct ChatListPage {
  @State messages: ChatMessage[] = [
    { id: '1', content: '你好！', isMine: false, time: '10:00' },
    { id: '2', content: '你好，最近怎么样？', isMine: true, time: '10:01' },
    { id: '3', content: '挺好的，在学习 HarmonyOS', isMine: false, time: '10:02' },
  ]

  build() {
    Column() {
      // 消息列表
      List() {
        ForEach(this.messages, (msg: ChatMessage) => {
          ListItem() {
            Row() {
              if (msg.isMine) {
                Blank() // 自己的消息靠右
              }
              Column() {
                Text(msg.content)
                  .fontSize(15)
                  .padding(10)
                  .borderRadius(12)
                  .backgroundColor(msg.isMine ? '#95ec69' : '#ffffff')
                Text(msg.time)
                  .fontSize(10)
                  .fontColor('#999999')
                  .margin({ top: 4 })
              }
              .alignItems(msg.isMine ? HorizontalAlign.End : HorizontalAlign.Start)

              if (!msg.isMine) {
                Blank() // 对方的消息靠左
              }
            }
            .width('100%')
          }
        }, (msg: ChatMessage) => msg.id)
      }
      .layoutWeight(1)
    }
  }
}
```

### 商品网格展示

```typescript
interface Product {
  id: string
  name: string
  price: number
  image: Resource
}

@Component
struct ProductGridPage {
  @State products: Product[] = [
    { id: '1', name: '商品A', price: 99.9, image: $r('app.media.product1') },
    { id: '2', name: '商品B', price: 199.0, image: $r('app.media.product2') },
    { id: '3', name: '商品C', price: 49.9, image: $r('app.media.product3') },
    { id: '4', name: '商品D', price: 299.0, image: $r('app.media.product4') },
  ]

  build() {
    Grid() {
      ForEach(this.products, (product: Product) => {
        GridItem() {
          Column() {
            Image(product.image)
              .width('100%')
              .height(120)
              .objectFit(ImageFit.Cover)
              .borderRadius({ topLeft: 8, topRight: 8 })
            Text(product.name)
              .fontSize(14)
              .margin({ top: 8 })
            Text(`¥${product.price.toFixed(2)}`)
              .fontSize(16)
              .fontColor('#ff4d4f')
              .fontWeight(FontWeight.Bold)
              .margin({ top: 4 })
          }
          .padding(8)
          .backgroundColor(Color.White)
          .borderRadius(8)
        }
      }, (product: Product) => product.id)
    }
    .columnsTemplate('1fr 1fr')
    .rowsGap(12)
    .columnsGap(12)
    .padding(12)
  }
}
```

## 注意事项

- **ForEach 与 LazyForEach 的选择**：数据量小于 100 条时使用 ForEach 即可，数据量较大时必须使用 LazyForEach 以保证性能。ForEach 会一次性创建所有组件，LazyForEach 仅创建可视区域内的组件。
- **键值生成**：ForEach 和 LazyForEach 的键值函数必须返回唯一且稳定的值，避免使用 index 作为键值，否则在数据增删时可能导致渲染异常。
- **cachedCount 设置**：缓存数量不宜过大，一般设置为 3-5 即可。过大的缓存会增加内存占用，过小则影响滑动流畅度。
- **ListItem 高度**：List 组件中所有 ListItem 的高度应尽量一致，高度不一致时可能导致滚动条位置计算不准确。
- **Grid 列模板**：columnsTemplate 和 rowsTemplate 使用 fr 单位定义比例，支持混合使用固定值和比例值，如 `'100px 1fr 2fr'`。

## 进阶用法

### 列表滚动定位

```typescript
@Component
struct ScrollToListPage {
  private listScroller: Scroller = new Scroller()
  @State currentIndex: number = 0

  build() {
    Column() {
      // 定位按钮
      Row() {
        Button('跳到顶部').onClick(() => this.listScroller.scrollToIndex(0))
        Button('跳到第50项').onClick(() => this.listScroller.scrollToIndex(50))
        Button('跳到底部').onClick(() => this.listScroller.scrollEdge(Edge.Bottom))
      }

      List({ space: 5, scroller: this.listScroller }) {
        ForEach(Array.from({ length: 100 }, (_, i) => i), (item: number) => {
          ListItem() {
            Text(`第 ${item} 项`)
              .width('100%')
              .height(50)
              .fontSize(15)
              .padding({ left: 16 })
          }
        }, (item: number) => item.toString())
      }
      .layoutWeight(1)
    }
  }
}
```

### WaterFlow 瀑布流布局

```typescript
@Component
struct WaterFlowPage {
  @State items: number[] = Array.from({ length: 20 }, (_, i) => i + 1)

  build() {
    // WaterFlow 是更高级的网格组件，支持不等高子项
    WaterFlow() {
      ForEach(this.items, (item: number) => {
        FlowItem() {
          Column() {
            Text(`内容 ${item}`)
              .fontSize(14)
          }
          .width('100%')
          // 不同高度模拟瀑布流效果
          .height(item % 3 === 0 ? 150 : item % 3 === 1 ? 100 : 200)
          .backgroundColor(item % 2 === 0 ? '#e3f2fd' : '#fff3e0')
          .borderRadius(8)
          .padding(12)
        }
      }, (item: number) => item.toString())
    }
    .columnsTemplate('1fr 1fr')
    .columnsGap(10)
    .rowsGap(10)
    .padding(10)
  }
}
```

### List 嵌套与吸顶效果

```typescript
@Component
struct StickyHeaderList {
  @State sections: object[] = [
    { title: '推荐', items: ['推荐内容一', '推荐内容二', '推荐内容三'] },
    { title: '热门', items: ['热门内容一', '热门内容二'] },
    { title: '最新', items: ['最新内容一', '最新内容二', '最新内容三', '最新内容四'] },
  ]

  build() {
    List({ space: 0 }) {
      ForEach(this.sections, (section: Record<string, Object>) => {
        ListItemGroup({
          header: this.sectionHeader(section.title),
          space: 8
        }) {
          ForEach(section.items, (item: string) => {
            ListItem() {
              Text(item)
                .fontSize(14)
                .padding(12)
                .backgroundColor(Color.White)
                .borderRadius(6)
                .width('100%')
            }
          }, (item: string) => item)
        }
      }, (section: Record<string, Object>) => section.title)
    }
    .sticky(StickyStyle.Header) // 吸顶效果
    .divider({ strokeWidth: 1, color: '#eeeeee' })
    .width('100%')
    .height('100%')
  }

  @Builder
  sectionHeader(title: string | undefined) {
    Row() {
      Text(title ?? '')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
    }
    .width('100%')
    .padding({ left: 16, top: 12, bottom: 12 })
    .backgroundColor('#f5f5f5')
  }
}
```
