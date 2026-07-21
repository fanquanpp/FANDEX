# 列表与网格 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## List 列表

**List 基础列表**
`List([{ space, initialIndex, scroller }]: { space?: Length, initialIndex?: number, scroller?: Scroller }) { ... }`
```typescript
List({ space: 8 }) {
  ForEach(this.items, (item: string) => {
    ListItem() { Text(item).padding(12) }
  })
}
.cachedCount(5)
.scrollBar(BarState.Auto)
```

**ListItem 列表项**
`ListItem() { ... }`
```typescript
ListItem() {
  Row() {
    Text('Title')
    Text('Subtitle')
  }
}
```

**List 垂直滚动**
```typescript
List() {
  ForEach(this.data, (item: string) => {
    ListItem() { Text(item) }
  })
}
.listDirection(Axis.Vertical)
```

**List 水平滚动**
```typescript
List() {
  ForEach(this.data, (item: string) => {
    ListItem() { Text(item).width(120) }
  })
}
.listDirection(Axis.Horizontal)
```

**List 多列布局**
```typescript
List() {
  ForEach(this.data, (item: string) => {
    ListItem() { Text(item) }
  })
}
.lanes(2, 8)  // 2 列,间距 8
```

---

## ListItemGroup 分组

**ListItemGroup 列表分组**
`ListItemGroup({ header, footer }) { ... }`
```typescript
List() {
  ListItemGroup({ header: this.headerBuilder, footer: this.footerBuilder }) {
    ForEach(this.items, (item: string) => {
      ListItem() { Text(item).padding(12) }
    })
  }
}
@Builder headerBuilder() { Text('Header').fontSize(16) }
@Builder footerBuilder() { Text('Footer').fontSize(12) }
```

---

## LazyForEach 懒加载

**LazyForEach 数据懒加载**
`LazyForEach(<dataSource>: IDataSource, (item: T, index?: number) => { ... }, [keyGen?: (item: T) => string])`
```typescript
class MyDataSource implements IDataSource {
  private data: string[] = []
  private listeners: DataChangeListener[] = []

  totalCount(): number { return this.data.length }
  getData(index: number): string { return this.data[index] }

  pushData(item: string): void {
    this.data.push(item)
    this.listeners.forEach(l => l.onDataChange(this.data.length - 1))
  }

  registerDataChangeListener(listener: DataChangeListener): void {
    this.listeners.push(listener)
  }
  unregisterDataChangeListener(listener: DataChangeListener): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }
}

List() {
  LazyForEach(this.dataSource, (item: string) => {
    ListItem() { Text(item) }
  }, (item: string) => item)
}
.cachedCount(5)
```

---

## ForEach 同步循环

**ForEach 基础循环**
`ForEach(<array>: T[], (item: T, index?: number) => { ... }, [keyGen?: (item: T, index?: number) => string])`
```typescript
ForEach(this.items, (item: string, index: number) => {
  Text(`${index}: ${item}`)
}, (item: string) => item)
```

---

## Grid 网格

**Grid 网格布局**
`Grid([<scroller>]: Scroller, [<range>]: { start, end }) { ... }`
```typescript
Grid() {
  ForEach(this.items, (item: string) => {
    GridItem() { Text(item).padding(12) }
  })
}
.columnsTemplate('1fr 1fr 1fr')
.rowsTemplate('1fr 1fr')
.columnsGap(8)
.rowsGap(8)
.scrollBar(BarState.Auto)
```

**GridItem 网格项**
`GridItem() { ... }`
```typescript
GridItem() {
  Column() {
    Image($r('app.media.icon')).width(80)
    Text('Item')
  }
}
.rowStart(0).rowEnd(1)
```

**Grid 跨行跨列**
```typescript
GridItem() { Text('Span') }
  .rowStart(0).rowEnd(1)
  .columnStart(0).columnEnd(1)
```

---

## WaterFlow 瀑布流

**WaterFlow 瀑布流**
`WaterFlow([<scroller>]) { ... }`
```typescript
WaterFlow() {
  ForEach(this.items, (item: string) => {
    FlowItem() {
      Column() {
        Image($r('app.media.icon')).height(Math.random() * 100 + 100)
        Text(item)
      }
    }
  })
}
.columnsTemplate('1fr 1fr')
.columnsGap(8)
.rowsGap(8)
```

**FlowItem 瀑布流项**
`FlowItem() { ... }`
```typescript
FlowItem() {
  Column() {
    Text('Item')
  }
}
```

---

## Scroller 滚动控制

**Scroller 滚动器**
```typescript
private scroller: ListScroller = new ListScroller()

List({ scroller: this.scroller }) {
  ForEach(this.items, (item: string) => {
    ListItem() { Text(item) }
  })
}

// 滚动到指定位置
this.scroller.scrollToIndex(10)
// 滚动到指定偏移
this.scroller.scrollTo({ xOffset: 0, yOffset: 100 })
// 滚动到顶部
this.scroller.scrollEdge(Edge.Top)
```

---

## 列表事件

**onScrollIndex 索引变化**
`List().onScrollIndex((start: number, end: number) => { ... })`
```typescript
List() { ... }
  .onScrollIndex((start: number, end: number) => {
    console.info(`visible: ${start} - ${end}`)
  })
```

**onScroll 滚动事件**
`List().onScroll((scrollOffset, scrollState) => { ... })`
```typescript
List() { ... }
  .onScroll((scrollOffset: number, scrollState: ScrollState) => {
    console.info(`offset: ${scrollOffset}`)
  })
```

**onReachEnd 滚动到底部**
`List().onReachEnd(() => { ... })`
```typescript
List() { ... }
  .onReachEnd(() => {
    this.loadMore()
  })
```

**onReachStart 滚动到顶部**
`List().onReachStart(() => { ... })`
```typescript
List() { ... }
  .onReachStart(() => {
    console.info('reached start')
  })
```

---

## 性能优化属性

**cachedCount 缓存数量**
`List().cachedCount(<count>)`
```typescript
List() { ... }.cachedCount(5)
```

**scrollBar 滚动条**
`<Component>.scrollBar(<BarState>)`
```typescript
List() { ... }.scrollBar(BarState.Auto)  // Auto | On | Off
```

**edgeEffect 边缘效果**
`<Component>.edgeEffect(<EdgeEffect>)`
```typescript
List() { ... }.edgeEffect(EdgeEffect.Spring)  // Spring | Fade | None
```

---

## 多端适配

**listDirection 列表方向**
`List().listDirection(<Axis>)`
```typescript
List().listDirection(Axis.Vertical)    // 垂直
List().listDirection(Axis.Horizontal)  // 水平
```

**lanes 多列**
`List().lanes(<count>, [<gap>])`
```typescript
List().lanes(2, 8)
```

**sticky 粘性头部**
`List().sticky(<StickyStyle>)`
```typescript
List() { ... }.sticky(StickyStyle.Header)  // Header | Footer
```
