# 路由跳转与路由栈 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## router 基础 API

**router.pushUrl 推入页面**
`router.pushUrl(<options>: RouterOptions, [<mode>?: RouterMode]): Promise<void>`
```typescript
import { router } from '@kit.ArkUI'

router.pushUrl({
  url: 'pages/Detail',
  params: { id: 1, name: 'Tom' }
})
  .then(() => console.info('跳转成功'))
  .catch((err) => console.error(`失败: ${JSON.stringify(err)}`))
```

**router.replaceUrl 替换当前页**
`router.replaceUrl(<options>: RouterOptions, [<mode>?: RouterMode]): Promise<void>`
```typescript
router.replaceUrl({
  url: 'pages/Home',
  params: {}
})
```

**router.back 返回**
`router.back([<options>?]: { url?: string, params?: Object })`
```typescript
router.back()                              // 返回上一页
router.back({ url: 'pages/Home' })         // 返回到指定页面
router.back({ url: 'pages/Home', params: { ok: true } })
```

**router.clear 清空栈**
`router.clear(): void`
```typescript
router.clear()
```

---

## router 路由模式

**RouterMode.Standard 标准模式**
```typescript
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Standard)
```

**RouterMode.Single 单例模式**
```typescript
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Single)
```

---

## router 路由信息

**router.getState 当前状态**
`router.getState(): RouterState`
```typescript
const state = router.getState()
console.info(`index: ${state.index}`)
console.info(`name: ${state.name}`)
console.info(`path: ${state.path}`)
```

**router.getLength 栈深度**
`router.getLength(): number`
```typescript
const length = router.getLength()
```

**router.getParams 获取参数**
`router.getParams(): Object`
```typescript
@Entry
@Component
struct Detail {
  private params = router.getParams() as { id: number; name: string }

  build() {
    Column() {
      Text(`ID: ${this.params.id}`)
      Text(`Name: ${this.params.name}`)
    }
  }
}
```

---

## router 事件

**router.enableAlertBeforeBackPage 返回确认**
`router.enableAlertBeforeBackPage(<options>): Promise<void>`
```typescript
router.enableAlertBeforeBackPage({
  message: '确认要退出当前页面?'
})
```

**router.disableAlertBeforeBackPage 取消确认**
`router.disableAlertBeforeBackPage(): void`
```typescript
router.disableAlertBeforeBackPage()
```

---

## RouterOptions 参数

**RouterOptions 接口**
```typescript
interface RouterOptions {
  url: string       // 目标页面路径
  params?: Object   // 传递参数
}
```

```typescript
router.pushUrl({
  url: 'pages/UserDetail',
  params: {
    userId: 1001,
    userName: 'Tom',
    isAdmin: true,
    tags: ['vip', 'active']
  }
})
```

---

## NavPathStack 路由栈 API

**NavPathStack 创建**
`new NavPathStack(): NavPathStack`
```typescript
private pathStack: NavPathStack = new NavPathStack()
```

**pushPath 推入路由**
`<stack>.pushPath(<info>: NavPathInfo): void`
```typescript
this.pathStack.pushPath({ name: 'detail', param: { id: 1 } })
```

**pushPath 带回调**
`<stack>.pushPath(<info>, <onPop>: (popInfo: PopInfo) => void): void`
```typescript
this.pathStack.pushPath({ name: 'editor' }, (popInfo: PopInfo) => {
  const result = popInfo.result
  console.info(`返回结果: ${JSON.stringify(result)}`)
})
```

**pushPathByName 按名称推入**
`<stack>.pushPathByName(<name>: string, <param>: Object, [<onPop>?]): void`
```typescript
this.pathStack.pushPathByName('detail', { id: 1 })
this.pathStack.pushPathByName('editor', { mode: 'edit' }, (popInfo) => {
  console.info('编辑完成')
})
```

**replacePath 替换路由**
`<stack>.replacePath(<info>: NavPathInfo): void`
```typescript
this.pathStack.replacePath({ name: 'home', param: {} })
```

**replacePathByName 按名称替换**
`<stack>.replacePathByName(<name>: string, <param>: Object): void`
```typescript
this.pathStack.replacePathByName('home', {})
```

**pop 返回**
`<stack>.pop([<result>?]: Object): void`
```typescript
this.pathStack.pop()
this.pathStack.pop({ success: true, data: 'saved' })
```

**popToName 返回到指定页面**
`<stack>.popToName(<name>: string, [<result>?]): void`
```typescript
this.pathStack.popToName('home')
this.pathStack.popToName('home', { result: 'ok' })
```

**popToIndex 返回到指定索引**
`<stack>.popToIndex(<index>: number, [<result>?]): void`
```typescript
this.pathStack.popToIndex(0)
```

**clear 清空栈**
`<stack>.clear(): void`
```typescript
this.pathStack.clear()
```

---

## NavPathStack 信息查询

**size 栈大小**
`<stack>.size(): number`
```typescript
const size = this.pathStack.size()
```

**getAllPathName 所有路由名称**
`<stack>.getAllPathName(): string[]`
```typescript
const names = this.pathStack.getAllPathName()
```

**getParamByName 按名称获取参数**
`<stack>.getParamByName(<name>: string): Object[]`
```typescript
const params = this.pathStack.getParamByName('detail')
```

**getParamByIndex 按索引获取参数**
`<stack>.getParamByIndex(<index>: number): Object`
```typescript
const param = this.pathStack.getParamByIndex(0)
```

---

## Navigation 容器

**Navigation 创建**
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
    .mode(NavigationMode.Stack)
  }
}
```

**navDestination 路由映射**
`Navigation().navDestination(<builder>: (name: string) => void)`
```typescript
@Builder
pageMap(name: string) {
  if (name === 'detail') {
    DetailPage()
  } else if (name === 'profile') {
    ProfilePage()
  }
}

build() {
  Navigation(this.pathStack) { ... }
    .navDestination(this.pageMap)
}
```

---

## NavDestination 目标页

**NavDestination 基础**
```typescript
@Component
struct DetailPage {
  build() {
    NavDestination() {
      Column() {
        Text('Detail')
      }
    }
    .title('Detail')
    .titleMode(NavigationTitleMode.Mini)
  }
}
```

**NavDestination 事件**
```typescript
NavDestination() { ... }
  .onShown(() => {
    console.info('显示')
  })
  .onHidden(() => {
    console.info('隐藏')
  })
  .onBackPressed((): boolean => {
    return false
  })
  .onNavBarStateChange((state: NavBarState) => {})
```

---

## 页面传参与接收

**传递参数**
```typescript
// router 方式
router.pushUrl({
  url: 'pages/Detail',
  params: { id: 1, name: 'Tom' }
})

// NavPathStack 方式
this.pathStack.pushPath({
  name: 'detail',
  param: { id: 1, name: 'Tom' }
})
```

**接收参数**
```typescript
// router 方式
@Entry
@Component
struct Detail {
  private params = router.getParams() as DetailParams

  build() {
    Column() {
      Text(`ID: ${this.params.id}`)
    }
  }
}

// NavDestination 方式
@Component
struct DetailPage {
  build() {
    NavDestination() {
      Column() {
        Text(`ID: ${this.params?.id}`)
      }
    }
    .onShown(() => {
      const pathStack = this.pathStack
      const param = pathStack.getParamByIndex(pathStack.size() - 1)
    })
  }
}
```

**返回数据**
```typescript
// router 方式
router.back({ url: 'pages/Home', params: { saved: true } })

// NavPathStack 方式
this.pathStack.pop({ saved: true, data: result })
```

---

## 路由配置

**main_pages.json 配置**
```json5
{
  "src": [
    "pages/Index",
    "pages/Detail",
    "pages/Profile",
    "pages/Settings",
    "pages/Login"
  ]
}
```

**module.json5 配置 mainElement**
```json5
{
  "module": {
    "name": "entry",
    "type": "entry",
    "mainElement": "EntryAbility",
    "pages": "$profile:main_pages"
  }
}
```

---

## 路由模式选择

**Stack 栈模式**
```typescript
Navigation(this.pathStack) { ... }
  .mode(NavigationMode.Stack)
```

**Split 分栏模式(平板)**
```typescript
Navigation(this.pathStack) { ... }
  .mode(NavigationMode.Split)
```

**Auto 自适应模式**
```typescript
Navigation(this.pathStack) { ... }
  .mode(NavigationMode.Auto)
```

---

## 转场动画

**hideTitleBar 隐藏标题栏**
`NavDestination().hideTitleBar(<hide>: boolean)`
```typescript
NavDestination() { ... }.hideTitleBar(true)
```

**customNavContentTransition 自定义转场**
`Navigation().customNavContentTransition((from, to, op) => { ... })`
```typescript
Navigation(this.pathStack) { ... }
  .customNavContentTransition((from, to, op) => {
    return {
      timeout: 300,
      transition: (proxy: NavigationTransitionProxy) => {
        // 自定义动画
        proxy.finishTransition()
      }
    }
  })
```
