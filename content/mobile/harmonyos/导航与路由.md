# 导航与路由 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Navigation 导航组件

**Navigation 容器**
`Navigation([<pathStack>?]: NavPathStack) { ... }`
```typescript
@Component
struct Index {
  private pathStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.pathStack) {
      Column() {
        Button('Go Detail').onClick(() => {
          this.pathStack.pushPath({ name: 'detail' })
        })
      }
    }
    .title('Home')
    .titleMode(NavigationTitleMode.Mini)
  }
}
```

**NavDestination 目标页**
`NavDestination() { ... }`
```typescript
@Component
struct DetailPage {
  build() {
    NavDestination() {
      Column() {
        Text('Detail Page')
      }
    }
    .title('Detail')
    .onShown(() => {})
    .onHidden(() => {})
  }
}
```

**NavPathStack 路由栈**
`new NavPathStack(): NavPathStack`
```typescript
private pathStack: NavPathStack = new NavPathStack()

// 路由跳转
pathStack.pushPath({ name: 'detail', param: { id: 1 } })
pathStack.pushPath({ name: 'detail' }, (popInfo: PopInfo) => {})
pathStack.replacePath({ name: 'detail' })
pathStack.replacePathByName('detail', { id: 1 })

// 路由返回
pathStack.pop()
pathStack.pop({ result: 'success' })
pathStack.popToName('home')
pathStack.popToIndex(0)
pathStack.clear()
```

**NavPathStack 路由信息**
```typescript
// 获取栈大小
const size = pathStack.size()

// 获取所有路由信息
const allPaths = pathStack.getAllPathName()

// 获取参数
const param = pathStack.getParamByName('detail')
const paramByIndex = pathStack.getParamByIndex(0)
```

---

## NavRouter 路由组件

**NavRouter 路由容器**
`NavRouter() { ... }.navDestination(() => { ... })`
```typescript
@Component
struct Index {
  @State list: Array<string> = ['A', 'B', 'C']

  build() {
    Navigation() {
      List() {
        ForEach(this.list, (item: string) => {
          ListItem() {
            NavRouter() {
              Text(item).padding(16)
            }
            .navDestination(() => {
              DetailPage({ title: item })
            })
          }
        })
      }
    }
  }
}
```

---

## router 路由 API

**router.pushUrl 推入页面**
`router.pushUrl(<options>: RouterOptions, [<mode>?: RouterMode]): Promise<void>`
```typescript
import { router } from '@kit.ArkUI'

router.pushUrl({
  url: 'pages/Detail',
  params: { id: 1, name: 'Tom' }
}).then(() => {
  console.info('跳转成功')
}).catch((err) => {
  console.error(`跳转失败: ${JSON.stringify(err)}`)
})
```

**router.pushUrl 指定模式**
`router.pushUrl(<options>, <mode>: RouterMode)`
```typescript
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Standard)
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Single)
```

**router.replaceUrl 替换页面**
`router.replaceUrl(<options>: RouterOptions, [<mode>?: RouterMode]): Promise<void>`
```typescript
router.replaceUrl({
  url: 'pages/Home',
  params: {}
})
```

**router.back 返回**
`router.back([<options>?]: RouterOptions | string])`
```typescript
router.back()                              // 返回上一页
router.back({ url: 'pages/Home' })         // 返回到指定页
router.back({ url: 'pages/Home', params: { ok: true } })
```

**router.clear 清空栈**
`router.clear(): void`
```typescript
router.clear()
```

---

## router 路由信息

**router.getState 获取状态**
`router.getState(): RouterState`
```typescript
const state = router.getState()
console.info(`index: ${state.index}`)
console.info(`name: ${state.name}`)
console.info(`path: ${state.path}`)
```

**router.getLength 栈长度**
`router.getLength(): number`
```typescript
const length = router.getLength()
console.info(`栈深度: ${length}`)
```

**router.getParams 获取参数**
`router.getParams(): Object`
```typescript
const params = router.getParams() as DetailParams
console.info(`id: ${params.id}`)
```

---

## router 路由模式

**RouterMode 路由模式**
```typescript
router.RouterMode.Standard  // 标准模式,允许多个相同页面
router.RouterMode.Single    // 单例模式,相同页面只保留一个
```

---

## router 事件

**router.enableAlertBeforeBackPage 返回拦截**
`router.enableAlertBeforeBackPage(<options>): Promise<void>`
```typescript
router.enableAlertBeforeBackPage({
  message: '确定要退出吗?'
}).then(() => {
  console.info('已注册返回拦截')
})
```

**router.disableAlertBeforeBackPage 取消拦截**
`router.disableAlertBeforeBackPage(): void`
```typescript
router.disableAlertBeforeBackPage()
```

---

## 页面路由配置

**main_pages.json 路由配置**
```json5
{
  "src": [
    "pages/Index",
    "pages/Detail",
    "pages/Profile",
    "pages/Settings"
  ]
}
```

---

## 页面间通信

**pushUrl 传参**
```typescript
// 发送方
router.pushUrl({
  url: 'pages/Detail',
  params: { id: 1, name: 'Tom' }
})

// 接收方
@Entry
@Component
struct Detail {
  private params: DetailParams = router.getParams() as DetailParams

  build() {
    Column() {
      Text(`ID: ${this.params.id}`)
      Text(`Name: ${this.params.name}`)
    }
  }
}
```

**back 返回数据**
```typescript
// 接收方
router.pushUrl({
  url: 'pages/Editor'
}).then(() => {})

// 编辑页返回时传递数据
router.back({ url: 'pages/Home', params: { saved: true } })

// 主页接收返回数据
// 通过 onBackPress 或 aboutToAppear 中读取参数
```

---

## Navigation 路由模式

**Navigation 模式**
```typescript
Navigation(this.pathStack) { ... }
  .mode(NavigationMode.Stack)     // 栈模式
  .mode(NavigationMode.Split)     // 分栏模式
  .mode(NavigationMode.Auto)      // 自适应模式
```

**titleMode 标题模式**
```typescript
Navigation() { ... }
  .titleMode(NavigationTitleMode.Mini)    // 迷你标题
  .titleMode(NavigationTitleMode.Full)    // 完整标题
  .titleMode(NavigationTitleMode.Free)    // 自由模式
```

---

## NavDestination 事件

**onShown 显示**
`NavDestination().onShown(() => { ... })`
```typescript
NavDestination() { ... }
  .onShown(() => {
    console.info('页面显示')
  })
```

**onHidden 隐藏**
`NavDestination().onHidden(() => { ... })`
```typescript
NavDestination() { ... }
  .onHidden(() => {
    console.info('页面隐藏')
  })
```

**onBackPressed 返回拦截**
`NavDestination().onBackPressed((): boolean => { ... })`
```typescript
NavDestination() { ... }
  .onBackPressed((): boolean => {
    return this.handleBack()
  })
```

**onNavBarStateChange 标题栏变化**
`NavDestination().onNavBarStateChange((state: NavBarState) => { ... })`
```typescript
NavDestination() { ... }
  .onNavBarStateChange((state: NavBarState) => {
    console.info(`state: ${state}`)
  })
```

---

## 动态路由

**NavPathStack 动态注册**
```typescript
@Entry
@Component
struct Index {
  private pathStack: NavPathStack = new NavPathStack()

  @Builder pageMap(name: string) {
    if (name === 'detail') {
      DetailPage()
    } else if (name === 'profile') {
      ProfilePage()
    }
  }

  build() {
    Navigation(this.pathStack) {
      Column() {
        Button('Detail').onClick(() => {
          this.pathStack.pushPath({ name: 'detail' })
        })
      }
    }
    .navDestination(this.pageMap)
  }
}
```

---

## 转场动画

**customNavContentTransition 自定义转场**
`Navigation().customNavContentTransition((from, to, op) => { ... })`
```typescript
Navigation(this.pathStack) { ... }
  .customNavContentTransition((from: NavContentInfo, to: NavContentInfo, op: NavigationOperation) => {
    return {
      timeout: 300,
      transition: (proxy) => {
        // 自定义转场动画
      }
    }
  })
```

---

## 路由守卫

**页面拦截示例**
```typescript
@Component
struct Index {
  private pathStack: NavPathStack = new NavPathStack()

  private checkLogin(): boolean {
    return AppStorage.get<string>('token') !== undefined
  }

  build() {
    Navigation(this.pathStack) {
      Button('Profile').onClick(() => {
        if (this.checkLogin()) {
          this.pathStack.pushPath({ name: 'profile' })
        } else {
          this.pathStack.pushPath({ name: 'login' })
        }
      })
    }
  }
}
```
