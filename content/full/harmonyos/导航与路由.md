---
order: 54
title: 导航与路由
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: Navigation与Router
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/自定义组件
  - harmonyos/列表与网格
  - harmonyos/网络请求
  - harmonyos/数据持久化
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

HarmonyOS 提供了两套路由导航方案：Navigation 组件和 Router 模块。Navigation 是声明式的导航容器，支持 NavDestination 子页面管理、导航栏定制和路由栈操作，适合复杂的单页面应用架构。Router 是命令式的页面路由，通过 API 调用实现页面跳转和返回，适合简单的多页面应用。在实际开发中，推荐优先使用 Navigation，它提供了更丰富的导航能力和更好的类型安全。

## 基础概念

**Navigation**：导航容器组件，内部管理一个路由栈，每个栈元素对应一个 NavDestination 页面。支持 pushPath（入栈）、pop（出栈）、replacePath（替换）等操作。

**NavDestination**：Navigation 的子页面组件，每个 NavDestination 代表一个可导航的目标页面。通过 title 设置导航栏标题，通过 hideBackButton 控制返回按钮显示。

**NavPathStack**：Navigation 的路由栈对象，提供了完整的栈操作 API，包括 push、pop、replace、clear、moveToTop 等。支持获取栈信息、监听栈变化。

**Router**：全局路由模块，通过 router.pushUrl 和 router.back 等方法实现页面跳转。每个页面需要在 main_pages.json 中注册路径。

**页面参数传递**：两种方案都支持页面间参数传递。Navigation 通过 NavPathStack 的参数机制传递，Router 通过 params 字段传递。

## 快速上手

### Navigation 基本用法

```typescript
// 创建路由栈
@Entry
@Component
struct NavigationDemo {
  // 创建导航栈
  navStack: NavPathStack = new NavPathStack()

  build() {
    // Navigation 容器
    Navigation(this.navStack) {
      // 首页内容
      Column() {
        Text('首页')
          .fontSize(24)
          .margin({ bottom: 20 })

        Button('跳转到详情页')
          .onClick(() => {
            // 将页面路径压入导航栈
            this.navStack.pushPath({ name: 'Detail' })
          })
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    }
    .title('应用首页')
    // 注册 NavDestination 页面
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'Detail') {
      DetailPage({ navStack: this.navStack })
    }
  }
}

// 详情页组件
@Component
struct DetailPage {
  navStack: NavPathStack = new NavPathStack()

  build() {
    NavDestination() {
      Column() {
        Text('详情页内容')
          .fontSize(20)
        Button('返回')
          .onClick(() => {
            this.navStack.pop()
          })
      }
    }
    .title('详情页')
  }
}
```

### Router 基本用法

```typescript
import router from '@ohos.router'

@Entry
@Component
struct RouterDemo {
  build() {
    Column() {
      Button('跳转到详情页')
        .onClick(() => {
          // 使用 Router 跳转，传递参数
          router.pushUrl({
            url: 'pages/DetailPage',
            params: {
              id: 42,
              name: '测试数据'
            }
          })
        })

      Button('替换当前页')
        .onClick(() => {
          // 替换当前页面，无法返回
          router.replaceUrl({
            url: 'pages/LoginPage'
          })
        })
    }
  }
}

// 详情页接收参数
@Entry
@Component
struct DetailPage {
  build() {
    Column() {
      // 获取路由传递的参数
      Text(`参数: ${JSON.stringify(router.getParams())}`)
        .fontSize(16)

      Button('返回上一页')
        .onClick(() => {
          router.back()
        })
    }
  }
}
```

## 详细用法

### Navigation 带参数跳转

```typescript
// 定义页面参数类型
interface DetailParams {
  itemId: number
  title: string
}

@Entry
@Component
struct NavWithParamsDemo {
  navStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navStack) {
      Column({ space: 10 }) {
        Button('查看商品1')
          .onClick(() => {
            this.navStack.pushPath({
              name: 'ProductDetail',
              param: { itemId: 1, title: '商品一' } as DetailParams
            })
          })

        Button('查看商品2')
          .onClick(() => {
            this.navStack.pushPath({
              name: 'ProductDetail',
              param: { itemId: 2, title: '商品二' } as DetailParams
            })
          })
      }
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'ProductDetail') {
      ProductDetailPage({ navStack: this.navStack })
    }
  }
}

@Component
struct ProductDetailPage {
  navStack: NavPathStack = new NavPathStack()
  // 从导航栈获取参数
  @State params: DetailParams = this.navStack.getParamByName('ProductDetail')[0] as DetailParams

  build() {
    NavDestination() {
      Column() {
        Text(`商品ID: ${this.params.itemId}`)
        Text(`商品名称: ${this.params.title}`)
        Button('返回')
          .onClick(() => this.navStack.pop())
      }
    }
    .title(this.params.title)
  }
}
```

### Navigation 路由栈操作

```typescript
@Entry
@Component
struct NavStackOpsDemo {
  navStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navStack) {
      Column({ space: 10 }) {
        Text(`当前栈深度: ${this.navStack.size()}`)
          .fontSize(14)

        Button('压入页面A')
          .onClick(() => this.navStack.pushPath({ name: 'PageA' }))

        Button('压入页面B')
          .onClick(() => this.navStack.pushPath({ name: 'PageB' }))

        Button('弹出当前页')
          .onClick(() => this.navStack.pop())

        Button('弹出到指定页面')
          .onClick(() => this.navStack.popToName('PageA'))

        Button('清空栈')
          .onClick(() => this.navStack.clear())

        Button('移动到栈顶')
          .onClick(() => this.navStack.moveToTop('PageA'))
      }
      .padding(20)
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'PageA') {
      PageA({ navStack: this.navStack })
    } else if (name === 'PageB') {
      PageB({ navStack: this.navStack })
    }
  }
}
```

### 自定义导航栏

```typescript
@Entry
@Component
struct CustomNavBarDemo {
  navStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navStack) {
      Column() {
        Text('首页内容')
      }
    }
    // 隐藏默认导航栏
    .hideToolBar(true)
    // 自定义导航栏
    .customNavContentTransition(() => {
      // 返回自定义导航栏内容
      return undefined
    })
    .titleMode(NavigationTitleMode.Mini)
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    // 空实现
  }
}
```

## 常见场景

### Tab 页签与导航结合

```typescript
@Entry
@Component
struct TabNavDemo {
  navStack: NavPathStack = new NavPathStack()
  @State currentTab: number = 0

  build() {
    Navigation(this.navStack) {
      Tabs({ index: this.currentTab }) {
        TabContent() {
          Column() {
            Text('首页')
            Button('查看详情')
              .onClick(() => this.navStack.pushPath({ name: 'Detail' }))
          }
        }.tabBar('首页')

        TabContent() {
          Column() {
            Text('我的')
            Button('设置')
              .onClick(() => this.navStack.pushPath({ name: 'Settings' }))
          }
        }.tabBar('我的')
      }
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'Detail') {
      DetailPage({ navStack: this.navStack })
    } else if (name === 'Settings') {
      SettingsPage({ navStack: this.navStack })
    }
  }
}
```

### 带返回结果的页面跳转

```typescript
import { CommonDataSource } from '@ohos.base'

@Entry
@Component
struct ResultNavDemo {
  navStack: NavPathStack = new NavPathStack()
  @State selectedCity: string = '未选择'

  build() {
    Navigation(this.navStack) {
      Column({ space: 10 }) {
        Text(`当前城市: ${this.selectedCity}`)
          .fontSize(18)

        Button('选择城市')
          .onClick(() => {
            this.navStack.pushPath({ name: 'CityPicker' })
          })
      }
      .padding(20)
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'CityPicker') {
      CityPickerPage({
        navStack: this.navStack,
        onCitySelected: (city: string) => {
          this.selectedCity = city
        }
      })
    }
  }
}

@Component
struct CityPickerPage {
  navStack: NavPathStack = new NavPathStack()
  onCitySelected: (city: string) => void = () => {}
  @State cities: string[] = ['北京', '上海', '广州', '深圳', '杭州']

  build() {
    NavDestination() {
      List() {
        ForEach(this.cities, (city: string) => {
          ListItem() {
            Text(city)
              .width('100%')
              .padding(16)
              .onClick(() => {
                this.onCitySelected(city)
                this.navStack.pop()
              })
          }
        }, (city: string) => city)
      }
    }
    .title('选择城市')
  }
}
```

## 注意事项

- **Navigation vs Router**：Navigation 是推荐方案，支持类型安全的参数传递和声明式路由管理。Router 适合简单场景或从旧项目迁移。不要在同一页面中混用两种方案。
- **NavPathStack 传递**：NavPathStack 需要通过组件参数传递给子页面，确保每个 NavDestination 都能访问到同一个栈实例。
- **页面注册**：Router 方案需要在 main_pages.json 中注册页面路径，未注册的路径无法跳转。Navigation 方案通过 navDestination 构建器动态注册。
- **路由栈大小**：注意控制路由栈深度，过深的栈会占用大量内存。适时使用 replacePath 替代 pushPath，或使用 clear 清空栈。
- **生命周期**：NavDestination 拥有独立的生命周期回调（onShown、onHidden、aboutToAppear、aboutToDisappear），适合在此处管理页面级资源。

## 进阶用法

### 导航转场动画

```typescript
@Entry
@Component
struct TransitionNavDemo {
  navStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navStack) {
      Column() {
        Button('跳转')
          .onClick(() => this.navStack.pushPath({ name: 'AnimatedPage' }))
      }
    }
    // 自定义导航转场动画
    .navTransition({
      // 入场动画
      onTransitionEnter: (transition: NavigationTransition) => {
        // 从右侧滑入
        transition.to.translate({ x: 0 })
        transition.from.translate({ x: '100%' })
      },
      // 出场动画
      onTransitionExit: (transition: NavigationTransition) => {
        transition.to.translate({ x: '-30%' })
        transition.from.translate({ x: 0 })
      }
    })
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'AnimatedPage') {
      AnimatedPage({ navStack: this.navStack })
    }
  }
}
```

### 路由拦截与守卫

```typescript
@Entry
@Component
struct GuardNavDemo {
  navStack: NavPathStack = new NavPathStack()
  @State isLoggedIn: boolean = false

  build() {
    Navigation(this.navStack) {
      Column({ space: 10 }) {
        Button('查看个人中心')
          .onClick(() => {
            // 路由守卫：未登录时跳转到登录页
            if (!this.isLoggedIn) {
              this.navStack.pushPath({ name: 'Login' })
            } else {
              this.navStack.pushPath({ name: 'Profile' })
            }
          })

        Button(this.isLoggedIn ? '退出登录' : '模拟登录')
          .onClick(() => {
            this.isLoggedIn = !this.isLoggedIn
          })
      }
      .padding(20)
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    if (name === 'Login') {
      LoginPage({
        navStack: this.navStack,
        onLoginSuccess: () => {
          this.isLoggedIn = true
          this.navStack.replacePath({ name: 'Profile' })
        }
      })
    } else if (name === 'Profile') {
      ProfilePage({ navStack: this.navStack })
    }
  }
}
```

### 深度链接与路由恢复

```typescript
@Entry
@Component
struct DeepLinkDemo {
  navStack: NavPathStack = new NavPathStack()

  aboutToAppear() {
    // 处理深度链接，恢复路由状态
    const deepLink = this.getDeepLink()
    if (deepLink) {
      // 根据深度链接构建路由栈
      this.navStack.pushPath({ name: 'Home' })
      if (deepLink.page === 'Detail') {
        this.navStack.pushPath({
          name: 'Detail',
          param: { id: deepLink.id }
        })
      }
    }
  }

  private getDeepLink(): object | null {
    // 从意图中获取深度链接信息
    return null
  }

  build() {
    Navigation(this.navStack) {
      Column() {
        Text('首页')
      }
    }
    .navDestination(this.buildNavDestination)
  }

  @Builder
  buildNavDestination(name: string) {
    // 路由页面注册
  }
}
```
