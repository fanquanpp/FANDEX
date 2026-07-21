---
order: 103
title: 组件生命周期详解
module: harmonyos
category: 'dev-lang'
difficulty: advanced
description: HarmonyOS组件生命周期详解：aboutToAppear、aboutToDisappear。
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/ArkTS与TypeScript差异
  - harmonyos/ArkUI声明式语法
  - harmonyos/路由跳转与路由栈
  - harmonyos/权限申请
prerequisites:
  - harmonyos/概述与环境搭建
---

# 组件生命周期详解

## 1. 概述与背景

### 1.1 什么是生命周期

在软件工程中,生命周期(lifecycle)指的是一个对象从创建到销毁所经历的一系列阶段。每个阶段对应一个明确的回调函数,开发者可以在这些回调中执行特定的初始化、清理或状态转换逻辑。

HarmonyOS ArkUI 框架中的组件生命周期指的是自定义组件(`@Component struct`)从被创建、添加到组件树、渲染、状态更新、最终从组件树移除并销毁的整个过程。框架为每个阶段提供了对应的回调函数,开发者通过实现这些回调来介入组件的不同生命阶段,完成数据加载、订阅注册、资源释放等关键任务。

理解生命周期的重要性可以类比为建造一栋房子:你不能在房子还没盖好时就摆放家具,也不能在房子拆除后还想要清理房间。组件的生命周期回调就是框架给开发者的"时间锚点",保证在正确的时机执行正确的逻辑。

### 1.2 生命周期的两个层次

HarmonyOS 应用中存在两个层次的生命周期,初学者常将其混淆:

1. **组件级生命周期**(Component Lifecycle)——针对 `@Component struct`,由 ArkUI 框架管理,关注 UI 组件的创建与销毁
2. **UIAbility 级生命周期**(UIAbility Lifecycle)——针对 `UIAbility` 抽象,由 Ability 框架管理,关注应用窗口的前后台切换

下表对比两个层次的关键差异:

| 维度 | 组件生命周期 | UIAbility 生命周期 |
| --- | --- | --- |
| 作用对象 | `@Component struct` | `UIAbility` 子类 |
| 管理框架 | ArkUI 引擎 | Ability 框架 |
| 触发时机 | 组件创建、显示、隐藏、销毁 | 应用启动、前后台切换、退出 |
| 关键回调 | `aboutToAppear`、`aboutToDisappear`、`onPageShow`、`onPageHide` | `onCreate`、`onForeground`、`onBackground`、`onDestroy` |
| 文件位置 | `.ets` 组件文件 | `UIAbility` 子类(`.ets` 或 `.ts`) |
| 典型用途 | 数据初始化、订阅注册、清理资源 | 全局状态管理、窗口管理、长连接维护 |

本章重点讲解组件级生命周期,在最后一节也会覆盖 UIAbility 生命周期以便读者完整理解。

### 1.3 学习生命周期的工程价值

掌握组件生命周期对工程实践有以下直接价值:

- **资源管理**——在 `aboutToAppear` 申请资源(网络订阅、定时器、事件监听),在 `aboutToDisappear` 释放资源,避免内存泄漏
- **数据加载时机**——在 `aboutToAppear` 而非 `build()` 中触发异步数据加载,避免在渲染阶段执行副作用
- **页面可见性响应**——通过 `onPageShow` 与 `onPageHide` 在页面切换时刷新数据或暂停动画
- **返回键拦截**——通过 `onBackPress` 实现自定义返回逻辑(如表单未保存提示)
- **性能优化**——理解生命周期与渲染流程的关系,避免在错误时机执行高开销操作
- **调试与排错**——通过生命周期日志快速定位组件未销毁、状态未更新等问题

### 1.4 与其他框架的对比

下表将 ArkUI 组件生命周期与 React、Flutter、SwiftUI 三个主流框架的生命周期进行对比:

| 框架 | 创建阶段 | 渲染阶段 | 销毁阶段 | 页面可见性 |
| --- | --- | --- | --- | --- |
| ArkUI | `aboutToAppear` | `build()` | `aboutToDisappear` | `onPageShow` / `onPageHide` |
| React | `constructor` / `componentDidMount` | `render` / `useEffect` | `componentWillUnmount` / `useEffect` cleanup | (无原生支持,需第三方库) |
| Flutter | `initState` | `build` | `dispose` | `didChangeAppLifecycleState` |
| SwiftUI | `init` | `body` | (无显式销毁) | `onAppear` / `onDisappear` |

可以看到 ArkUI 的设计更接近 SwiftUI,通过 `aboutToAppear` / `aboutToDisappear` 提供清晰的"前后"钩子,而非 React 的"渲染后再回调"模式。

## 2. 学习目标

完成本章学习后,读者应能够:

1. **概念层面**——准确解释组件生命周期与 UIAbility 生命周期的区别,以及各回调的触发时机
2. **代码层面**——能够正确实现 `aboutToAppear`、`aboutToDisappear`、`onPageShow`、`onPageHide`、`onBackPress` 等回调
3. **资源管理**——掌握在生命周期中正确申请与释放资源(订阅、定时器、监听)的模式
4. **数据加载**——理解为何应在 `aboutToAppear` 而非 `build()` 中执行异步数据加载
5. **性能优化**——识别生命周期相关的高开销操作,并通过 LazyForEach、组件复用等手段优化
6. **调试排错**——能够通过生命周期日志与 DevEco Studio 工具定位组件未销毁、内存泄漏等问题

## 3. 前置知识

阅读本章前,建议读者具备以下基础:

- **ArkUI 基础**——已阅读"ArkUI 声明式语法"章节,理解 `@Component`、`@State`、`build()` 等概念
- **ArkTS 基础**——熟悉 `struct`、装饰器、异步 `async/await` 等语法
- **状态管理**——理解 `@State`、`@Prop`、`@Link` 的数据同步机制
- **Stage 模型**——了解 Ability、UIAbility 等基础概念(可参考"Stage 模型与 FA 模型区别"章节)

## 4. 核心概念

### 4.1 组件生命周期总览

ArkUI 组件的生命周期包含以下回调函数,按典型触发顺序排列:

| 回调 | 触发时机 | 用途 | 是否可异步 |
| --- | --- | --- | --- |
| `aboutToAppear` | 组件创建后、`build()` 执行前 | 初始化数据、加载异步资源、注册订阅 | 是(推荐) |
| `build` | 组件首次渲染 | 描述 UI 结构 | 否(必须同步返回 UI 描述) |
| `onPageShow` | 页面变为可见 | 刷新数据、恢复动画、上报 PV | 是 |
| `onPageHide` | 页面变为不可见 | 暂停动画、停止轮询、上报时长 | 是 |
| `onBackPress` | 用户按下返回键 | 拦截返回、提示未保存数据 | 否(返回 boolean) |
| `aboutToDisappear` | 组件即将销毁 | 释放资源、取消订阅、清除定时器 | 是 |

需要注意:
- `aboutToAppear` 与 `aboutToDisappear` 是所有组件都有的回调
- `onPageShow`、`onPageHide`、`onBackPress` 仅在 `@Entry` 页面入口组件中生效
- `build()` 是必须实现的方法,但严格意义上不属于"回调",而是组件的核心契约

### 4.2 生命周期时序图

理解生命周期的关键是掌握各回调的触发顺序。下图展示一个典型的"页面 A 跳转到页面 B,然后返回"的完整生命周期:

```
[页面 A 创建]
   |
   v
aboutToAppear (A)
   |
   v
build (A)  ----> UI 渲染 ----> onPageShow (A)
                                      |
                                      v
                              [用户点击跳转到 B]
                                      |
                                      v
                              onPageHide (A)
                                      |
                                      v
                              aboutToAppear (B)
                                      |
                                      v
                              build (B)  ----> UI 渲染 ----> onPageShow (B)
                                                                      |
                                                                      v
                                                              [用户按返回键]
                                                                      |
                                                                      v
                                                              onBackPress (B) -> false
                                                                      |
                                                                      v
                                                              onPageHide (B)
                                                                      |
                                                                      v
                                                              aboutToDisappear (B)
                                                                      |
                                                                      v
                                                              [B 销毁]
                                                                      |
                                                                      v
                                                              onPageShow (A)
```

需要特别注意的是:
1. 页面 A 的 `onPageHide` 在页面 B 的 `aboutToAppear` 之前触发,即"先隐藏当前页面,再创建新页面"
2. 返回时,页面 B 的 `aboutToDisappear` 在页面 A 的 `onPageShow` 之前触发,即"先销毁旧页面,再显示目标页面"
3. 默认 `router.pushUrl` 行为下,页面 A 不会被销毁(保留在路由栈中),只有 `router.replaceUrl` 或栈满时才会触发 A 的 `aboutToDisappear`

### 4.3 `aboutToAppear` 详解

`aboutToAppear` 是组件创建后、`build()` 执行前的回调。这是组件生命周期中**最重要的初始化时机**。

**触发时机**:
- 组件被创建并添加到组件树时
- 在 `build()` 方法首次执行之前
- 仅触发一次(组件销毁前不会再次触发)

**推荐用途**:
- 初始化 `@State` 状态的复杂值(无法在声明时确定的)
- 发起网络请求加载页面数据
- 注册事件订阅(如 WebSocket、EventBus)
- 启动定时器(轮询、动画驱动)
- 读取本地存储(Preferences、文件)

**关键约束**:
- 不要在 `aboutToAppear` 中执行同步高耗时操作(会阻塞 `build()`)
- 不要在 `aboutToAppear` 中直接修改 `@State` 触发渲染(因为 `build()` 还未执行,框架会在 `aboutToAppear` 完成后自动触发首次渲染)
- 异步操作完成后修改 `@State` 是合法的,框架会在异步完成后重新渲染

```typescript
@Entry
@Component
struct UserProfilePage {
  @State user: User | null = null;
  @State loading: boolean = true;
  @State error: string = '';

  // 推荐模式:在 aboutToAppear 中启动异步加载
  async aboutToAppear() {
    try {
      // 异步加载用户数据,完成后框架会自动触发重新渲染
      this.user = await fetchUser(123);
      this.loading = false;
    } catch (e) {
      this.error = (e as Error).message;
      this.loading = false;
    }
  }

  build() {
    Column() {
      if (this.loading) {
        LoadingProgress().width(48).height(48)
      } else if (this.error.length > 0) {
        Text(`Error: ${this.error}`).fontColor('#FF0000')
      } else if (this.user !== null) {
        Text(`Name: ${this.user.name}`)
        Text(`Age: ${this.user.age}`)
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

interface User {
  name: string;
  age: number;
}

async function fetchUser(id: number): Promise<User> {
  // 模拟网络请求
  return new Promise((resolve: (u: User) => void) => {
    setTimeout(() => {
      resolve({ name: 'Alice', age: 30 });
    }, 500);
  });
}
```

### 4.4 `aboutToDisappear` 详解

`aboutToDisappear` 是组件即将从组件树移除并销毁前的回调。这是**资源释放的最后时机**。

**触发时机**:
- 组件即将从组件树移除时(如父组件条件渲染切换、路由跳转导致页面销毁)
- 在 ArkUI 引擎执行组件清理之前
- 仅触发一次

**推荐用途**:
- 取消事件订阅(避免回调到已销毁组件)
- 清除定时器(`setInterval`、`setTimeout`)
- 关闭网络连接(WebSocket、长连接)
- 释放文件句柄、数据库游标
- 保存未持久化的状态(草稿、临时数据)

**关键约束**:
- 不要在 `aboutToDisappear` 中修改 `@State`(组件即将销毁,无意义)
- 不要在 `aboutToDisappear` 中执行同步高耗时操作(会阻塞路由跳转)
- 异步操作(`async`)中需谨慎,组件可能已在异步操作完成前被销毁,此时访问 `this` 可能导致错误

```typescript
@Entry
@Component
struct TimerPage {
  @State count: number = 0;
  private timerId: number = -1;
  private listener: ((data: string) => void) | null = null;

  aboutToAppear() {
    // 启动定时器
    this.timerId = setInterval(() => {
      this.count++;
    }, 1000);

    // 注册全局事件监听
    this.listener = (data: string): void => {
      console.log(`Received: ${data}`);
    };
    eventBus.on('update', this.listener);
  }

  aboutToDisappear() {
    // 清除定时器(避免回调到已销毁组件)
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }

    // 取消事件订阅
    if (this.listener !== null) {
      eventBus.off('update', this.listener);
      this.listener = null;
    }
  }

  build() {
    Column() {
      Text(`Count: ${this.count}`).fontSize(32)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

// 简化的事件总线示例
class EventBus {
  private listeners: Map<string, ((data: string) => void)[]> = new Map();

  on(event: string, cb: (data: string) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(cb);
  }

  off(event: string, cb: (data: string) => void): void {
    const arr = this.listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(cb);
      if (idx >= 0) {
        arr.splice(idx, 1);
      }
    }
  }

  emit(event: string, data: string): void {
    const arr = this.listeners.get(event);
    if (arr) {
      arr.forEach((cb: (d: string) => void) => cb(data));
    }
  }
}

const eventBus = new EventBus();
```

### 4.5 `onPageShow` 与 `onPageHide`

`onPageShow` 与 `onPageHide` 仅在 `@Entry` 页面入口组件中生效,用于响应页面可见性的变化。

**`onPageShow` 触发时机**:
- 页面首次显示时(`aboutToAppear` + `build()` 之后)
- 从其他页面返回到当前页面时
- 应用从后台恢复到前台时(配合 UIAbility 的 `onForeground`)

**`onPageHide` 触发时机**:
- 跳转到其他页面时
- 应用进入后台时(配合 UIAbility 的 `onBackground`)
- 页面被销毁前(在 `aboutToDisappear` 之前)

**典型用途**:
- `onPageShow`:刷新数据、恢复动画、上报页面浏览(PV)、更新未读数
- `onPageHide`:暂停动画、停止轮询、上报页面停留时长、保存草稿

```typescript
@Entry
@Component
struct NewsListPage {
  @State news: News[] = [];
  @State unreadCount: number = 0;
  private pageEnterTime: number = 0;

  async aboutToAppear() {
    await this.loadNews();
  }

  onPageShow() {
    // 页面显示时记录进入时间,用于上报停留时长
    this.pageEnterTime = Date.now();

    // 刷新未读数
    this.refreshUnreadCount();

    console.log('NewsListPage shown');
  }

  onPageHide() {
    // 页面隐藏时上报停留时长
    const duration = Date.now() - this.pageEnterTime;
    analytics.report('news_list_stay_duration', duration);

    console.log('NewsListPage hidden');
  }

  private async loadNews(): Promise<void> {
    // 模拟网络请求
    this.news = await fetchNews();
  }

  private async refreshUnreadCount(): Promise<void> {
    this.unreadCount = await fetchUnreadCount();
  }

  build() {
    Column() {
      Text(`Unread: ${this.unreadCount}`).fontSize(16)
      List() {
        ForEach(this.news, (item: News) => {
          ListItem() {
            Text(item.title).fontSize(16)
          }
        }, (item: News): string => item.id)
      }
    }
  }
}

interface News {
  id: string;
  title: string;
}

async function fetchNews(): Promise<News[]> {
  return [{ id: '1', title: 'Hello HarmonyOS' }];
}

async function fetchUnreadCount(): Promise<number> {
  return 5;
}

class Analytics {
  report(event: string, value: number): void {
    console.log(`Analytics: ${event} = ${value}`);
  }
}

const analytics = new Analytics();
```

### 4.6 `onBackPress` 返回键拦截

`onBackPress` 仅在 `@Entry` 组件中生效,用于拦截系统返回键(物理返回键或手势返回)。

**返回值含义**:
- `true`:已处理返回事件,框架不再执行默认返回行为(路由出栈)
- `false`:未处理,框架执行默认返回行为

**典型场景**:
- 弹窗未关闭时,先关闭弹窗而非退出页面
- 表单有未保存修改时,提示用户确认
- 多步操作(如向导)中,返回上一步而非退出

```typescript
@Entry
@Component
struct EditFormPage {
  @State name: string = '';
  @State phone: string = '';
  @State hasUnsavedChanges: boolean = false;
  @State showConfirmDialog: boolean = false;

  // 拦截返回键
  onBackPress(): boolean {
    if (this.hasUnsavedChanges) {
      // 有未保存修改时,显示确认弹窗而非退出
      this.showConfirmDialog = true;
      return true;  // 阻止默认返回行为
    }
    return false;  // 无修改,执行默认返回
  }

  build() {
    Column() {
      TextInput({ placeholder: 'Name', text: this.name })
        .onChange((value: string) => {
          this.name = value;
          this.hasUnsavedChanges = true;
        })

      TextInput({ placeholder: 'Phone', text: this.phone })
        .onChange((value: string) => {
          this.phone = value;
          this.hasUnsavedChanges = true;
        })

      Button('Save')
        .onClick(() => {
          // 保存逻辑...
          this.hasUnsavedChanges = false;
          router.back();
        })

      if (this.showConfirmDialog) {
        // 确认弹窗
        AlertDialog.show({
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Discard?',
          primaryButton: {
            value: 'Discard',
            action: () => {
              this.showConfirmDialog = false;
              router.back();
            }
          },
          secondaryButton: {
            value: 'Cancel',
            action: () => {
              this.showConfirmDialog = false;
            }
          }
        });
      }
    }
  }
}

import router from '@ohos.router';
```

### 4.7 UIAbility 生命周期

UIAbility 是 Stage 模型中的应用组件抽象,管理应用窗口与前后台切换。一个应用可以包含多个 UIAbility,每个 UIAbility 负责一个独立的功能模块(如主界面、登录、设置)。

UIAbility 的生命周期包含以下回调:

| 回调 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `onCreate` | Ability 创建(应用冷启动) | 初始化全局资源、读取启动参数 |
| `onWindowStageCreate` | 窗口创建 | 加载首页、设置窗口属性 |
| `onForeground` | 应用进入前台 | 恢复动画、刷新数据 |
| `onBackground` | 应用进入后台 | 暂停动画、保存状态 |
| `onWindowStageDestroy` | 窗口销毁 | 释放窗口资源 |
| `onDestroy` | Ability 销毁 | 清理全局资源、关闭连接 |

```typescript
import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import Want from '@ohos.app.ability.Want';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    // 应用冷启动时触发,仅一次
    console.log('EntryAbility onCreate');
    // 解析启动参数
    const params = want.parameters;
    console.log(`Launch params: ${JSON.stringify(params)}`);
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // 窗口创建,加载首页
    console.log('EntryAbility onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err: Error) => {
      if (err) {
        console.error(`Failed to load content: ${err.message}`);
        return;
      }
      console.log('Content loaded successfully');
    });
  }

  onForeground(): void {
    // 应用进入前台
    console.log('EntryAbility onForeground');
    // 恢复数据同步、刷新通知等
  }

  onBackground(): void {
    // 应用进入后台
    console.log('EntryAbility onBackground');
    // 暂停轮询、保存草稿等
  }

  onWindowStageDestroy(): void {
    // 窗口销毁
    console.log('EntryAbility onWindowStageDestroy');
  }

  onDestroy(): void {
    // Ability 销毁
    console.log('EntryAbility onDestroy');
    // 清理全局资源
  }
}
```

UIAbility 生命周期与组件生命周期的关系:

```
应用启动
   |
   v
[UIAbility] onCreate
   |
   v
[UIAbility] onWindowStageCreate
   |
   v
   loadContent('pages/Index')
   |
   v
[Entry Component] aboutToAppear
   |
   v
[Entry Component] build  ----> 渲染
   |
   v
[Entry Component] onPageShow
   |
   v
   [应用进入后台]
   |
   v
[Entry Component] onPageHide
   |
   v
[UIAbility] onBackground
   |
   v
   [应用恢复前台]
   |
   v
[UIAbility] onForeground
   |
   v
[Entry Component] onPageShow
```

## 5. 代码示例

### 5.1 示例一:数据加载与状态管理

展示在 `aboutToAppear` 中加载数据、在 `build()` 中根据状态渲染不同 UI 的完整模式。

```typescript
@Entry
@Component
struct DataListPage {
  @State data: string[] = [];
  @State loadingState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @State errorMessage: string = '';

  async aboutToAppear() {
    this.loadingState = 'loading';
    try {
      this.data = await this.fetchData();
      this.loadingState = 'success';
    } catch (e) {
      this.errorMessage = (e as Error).message;
      this.loadingState = 'error';
    }
  }

  private async fetchData(): Promise<string[]> {
    return new Promise((resolve: (d: string[]) => void, reject: (e: Error) => void) => {
      setTimeout(() => {
        // 模拟 20% 失败率
        if (Math.random() < 0.2) {
          reject(new Error('Network timeout'));
        } else {
          resolve(['Item 1', 'Item 2', 'Item 3']);
        }
      }, 800);
    });
  }

  @Builder
  LoadingView() {
    Column() {
      LoadingProgress().width(48).height(48)
      Text('Loading...').fontSize(14).fontColor('#888888').margin({ top: 12 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder
  ErrorView() {
    Column() {
      Text('Load Failed').fontSize(18).fontColor('#FF0000').fontWeight(FontWeight.Bold)
      Text(this.errorMessage).fontSize(14).fontColor('#666666').margin({ top: 8 })
      Button('Retry')
        .margin({ top: 24 })
        .onClick(() => {
          this.aboutToAppear();  // 复用加载逻辑
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder
  SuccessView() {
    List() {
      ForEach(this.data, (item: string, index: number) => {
        ListItem() {
          Row() {
            Text(`${index + 1}.`).width(40).fontColor('#888888')
            Text(item).fontSize(16).layoutWeight(1)
          }
          .width('100%')
          .padding(16)
        }
      }, (item: string): string => item)
    }
    .width('100%')
    .height('100%')
  }

  build() {
    Column() {
      if (this.loadingState === 'loading' || this.loadingState === 'idle') {
        this.LoadingView()
      } else if (this.loadingState === 'error') {
        this.ErrorView()
      } else {
        this.SuccessView()
      }
    }
    .width('100%')
    .height('100%')
  }
}
```

### 5.2 示例二:WebSocket 订阅与清理

展示在生命周期中正确管理 WebSocket 连接的完整模式,包含自动重连。

```typescript
import webSocket from '@ohos.net.webSocket';

@Entry
@Component
struct ChatPage {
  @State messages: ChatMessage[] = [];
  @State connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private ws: webSocket.WebSocket = webSocket.createWebSocket();
  private reconnectTimer: number = -1;
  private isComponentActive: boolean = false;

  aboutToAppear() {
    this.isComponentActive = true;
    this.connect();
  }

  aboutToDisappear() {
    this.isComponentActive = false;
    this.cleanup();
  }

  private async connect(): Promise<void> {
    this.connectionState = 'connecting';
    try {
      await this.ws.connect('ws://example.com/chat');
      this.connectionState = 'connected';

      // 注册消息回调
      this.ws.on('message', (err: Error, data: string | ArrayBuffer) => {
        if (!this.isComponentActive) return;  // 组件已销毁,忽略回调
        if (typeof data === 'string') {
          const msg: ChatMessage = JSON.parse(data);
          this.messages = [...this.messages, msg];
        }
      });

      // 注册关闭回调,自动重连
      this.ws.on('close', () => {
        if (!this.isComponentActive) return;
        this.connectionState = 'disconnected';
        this.scheduleReconnect();
      });
    } catch (e) {
      this.connectionState = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== -1) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = -1;
      this.connect();
    }, 3000);
  }

  private cleanup(): void {
    // 清除重连定时器
    if (this.reconnectTimer !== -1) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = -1;
    }
    // 关闭 WebSocket 连接
    this.ws.off('message');
    this.ws.off('close');
    this.ws.close();
  }

  build() {
    Column() {
      // 顶部状态条
      Row() {
        Circle({ width: 8, height: 8 })
          .fill(this.connectionState === 'connected' ? '#00AA00' : '#AA0000')
        Text(this.connectionState).fontSize(12).margin({ left: 8 })
      }
      .width('100%')
      .padding(12)

      // 消息列表
      List() {
        ForEach(this.messages, (msg: ChatMessage) => {
          ListItem() {
            Text(msg.text).fontSize(14)
          }
        }, (msg: ChatMessage): string => msg.id)
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
  }
}

interface ChatMessage {
  id: string;
  text: string;
}
```

### 5.3 示例三:KeepAlive 模式

通过 `if` 控制组件显示/隐藏时,ArkUI 会销毁并重建组件。如果希望保留组件状态(如表单输入、滚动位置),需要使用 KeepAlive 模式——通过透明度或可见性而非条件渲染来控制显示。

```typescript
@Entry
@Component
struct TabPage {
  @State activeTab: number = 0;

  build() {
    Column() {
      // Tab 切换栏
      Row() {
        Button('Tab 1')
          .layoutWeight(1)
          .backgroundColor(this.activeTab === 0 ? '#007DFF' : '#CCCCCC')
          .onClick(() => { this.activeTab = 0; })

        Button('Tab 2')
          .layoutWeight(1)
          .backgroundColor(this.activeTab === 1 ? '#007DFF' : '#CCCCCC')
          .onClick(() => { this.activeTab = 1; })

        Button('Tab 3')
          .layoutWeight(1)
          .backgroundColor(this.activeTab === 2 ? '#007DFF' : '#CCCCCC')
          .onClick(() => { this.activeTab = 2; })
      }
      .width('100%')

      // 错误模式:使用 if 切换会销毁组件,状态丢失
      Stack({ alignContent: Alignment.Center }) {
        // Tab 1 始终保留,通过 visibility 控制
        ExpensiveForm()
          .visibility(this.activeTab === 0 ? Visibility.Visible : Visibility.Hidden)

        // Tab 2 始终保留
        DataChart()
          .visibility(this.activeTab === 1 ? Visibility.Visible : Visibility.Hidden)

        // Tab 3 始终保留
        SettingsPanel()
          .visibility(this.activeTab === 2 ? Visibility.Visible : Visibility.Hidden)
      }
      .layoutWeight(1)
      .width('100%')
    }
  }
}

@Component
struct ExpensiveForm {
  @State inputValue: string = '';

  aboutToAppear() {
    console.log('ExpensiveForm aboutToAppear');
  }

  aboutToDisappear() {
    console.log('ExpensiveForm aboutToDisappear');
  }

  build() {
    Column() {
      Text('Form Tab').fontSize(20)
      TextInput({ placeholder: 'Enter something', text: this.inputValue })
        .onChange((value: string) => { this.inputValue = value; })
      Text(`You entered: ${this.inputValue}`).fontSize(14)
    }
    .width('100%')
    .padding(20)
  }
}

@Component
struct DataChart {
  @State data: number[] = [10, 20, 30, 40, 50];

  aboutToAppear() {
    console.log('DataChart aboutToAppear');
  }

  aboutToDisappear() {
    console.log('DataChart aboutToDisappear');
  }

  build() {
    Column() {
      Text('Chart Tab').fontSize(20)
      // 简化的图表渲染
      Column() {
        ForEach(this.data, (val: number, i: number) => {
          Row()
            .width(`${val * 2}`)
            .height(20)
            .backgroundColor('#007DFF')
            .margin({ bottom: 4 })
        }, (val: number, i: number): string => `${i}`)
      }
    }
    .width('100%')
    .padding(20)
  }
}

@Component
struct SettingsPanel {
  @State toggle: boolean = false;

  aboutToAppear() {
    console.log('SettingsPanel aboutToAppear');
  }

  aboutToDisappear() {
    console.log('SettingsPanel aboutToDisappear');
  }

  build() {
    Column() {
      Text('Settings Tab').fontSize(20)
      Row() {
        Text('Enable Feature').layoutWeight(1)
        Toggle({ type: ToggleType.Switch, isOn: this.toggle })
          .onChange((isOn: boolean) => { this.toggle = isOn; })
      }
      .width('100%')
    }
    .width('100%')
    .padding(20)
  }
}
```

使用 KeepAlive 模式后,切换 Tab 时控制台**不会**打印 `aboutToDisappear`,所有组件保留状态。

### 5.4 示例四:UIAbility 生命周期与全局状态

展示完整 UIAbility 生命周期,以及如何与组件生命周期协作管理全局状态。

```typescript
// EntryAbility.ts
import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import Want from '@ohos.app.ability.Want';

// 全局应用状态(简化示例)
export class AppState {
  private static instance: AppState;
  private _isForeground: boolean = false;
  private _userData: UserData | null = null;
  private listeners: ((state: AppState) => void)[] = [];

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  get isForeground(): boolean { return this._isForeground; }
  get userData(): UserData | null { return this._userData; }

  setForeground(value: boolean): void {
    this._isForeground = value;
    this.notify();
  }

  setUserData(data: UserData | null): void {
    this._userData = data;
    this.notify();
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  private notify(): void {
    this.listeners.forEach((l: (s: AppState) => void) => l(this));
  }
}

interface UserData {
  id: number;
  name: string;
}

export default class EntryAbility extends UIAbility {
  private appState: AppState = AppState.getInstance();

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    console.log('EntryAbility onCreate');
    // 冷启动时从持久化存储恢复用户数据
    this.restoreUserData();
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    console.log('EntryAbility onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err: Error) => {
      if (err) {
        console.error(`Failed to load content: ${err.message}`);
      }
    });
  }

  onForeground(): void {
    console.log('EntryAbility onForeground');
    this.appState.setForeground(true);
    // 应用回到前台时刷新用户数据
    this.refreshUserData();
  }

  onBackground(): void {
    console.log('EntryAbility onBackground');
    this.appState.setForeground(false);
  }

  onWindowStageDestroy(): void {
    console.log('EntryAbility onWindowStageDestroy');
  }

  onDestroy(): void {
    console.log('EntryAbility onDestroy');
    // 应用销毁时持久化用户数据
    this.persistUserData();
  }

  private restoreUserData(): void {
    // 从 Preferences 恢复
    // 简化示例
    this.appState.setUserData({ id: 1, name: 'Alice' });
  }

  private async refreshUserData(): Promise<void> {
    // 简化示例:从网络刷新
    this.appState.setUserData({ id: 1, name: 'Alice Updated' });
  }

  private persistUserData(): void {
    // 持久化到 Preferences
    console.log('Persisting user data');
  }
}
```

```typescript
// pages/Index.ets
import { AppState } from '../EntryAbility';

@Entry
@Component
struct IndexPage {
  @State isForeground: boolean = false;
  @State userName: string = '';
  private unsubscribe: (() => void) | null = null;
  private appState: AppState = AppState.getInstance();

  aboutToAppear() {
    // 订阅全局状态变化
    this.unsubscribe = this.appState.subscribe((state: AppState) => {
      this.isForeground = state.isForeground;
      this.userName = state.userData ? state.userData.name : '';
    });

    // 初始化本地状态
    this.isForeground = this.appState.isForeground;
    this.userName = this.appState.userData ? this.appState.userData.name : '';
  }

  aboutToDisappear() {
    // 必须取消订阅,避免回调到已销毁组件
    if (this.unsubscribe !== null) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  build() {
    Column() {
      Text(`App Status: ${this.isForeground ? 'Foreground' : 'Background'}`)
        .fontColor(this.isForeground ? '#00AA00' : '#AA0000')

      Text(`User: ${this.userName}`)

      Button('Go to Detail')
        .onClick(() => {
          router.pushUrl({ url: 'pages/Detail' });
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

import router from '@ohos.router';
```

## 6. 实战案例:实时聊天应用

本节通过一个完整的实时聊天应用案例,综合运用所有生命周期回调,展示真实业务场景下的最佳实践。

### 6.1 需求分析

实现一个简单的实时聊天页面,具备以下功能:
- 进入页面时连接 WebSocket
- 显示连接状态
- 接收并显示消息
- 支持发送消息
- 应用进入后台时暂停接收,回到前台时恢复
- 离开页面时关闭连接
- 拦截返回键,有未读消息时提示

### 6.2 完整实现

```typescript
import webSocket from '@ohos.net.webSocket';
import router from '@ohos.router';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: number;
}

@Entry
@Component
struct RealtimeChatPage {
  @State messages: ChatMessage[] = [];
  @State inputText: string = '';
  @State connectionState: 'disconnected' | 'connecting' | 'connected' | 'paused' = 'disconnected';
  @State unreadCount: number = 0;
  @State showExitConfirm: boolean = false;

  private ws: webSocket.WebSocket = webSocket.createWebSocket();
  private reconnectTimer: number = -1;
  private isComponentActive: boolean = false;
  private isPageVisible: boolean = false;
  private messageIdCounter: number = 0;

  // ========== 生命周期回调 ==========

  async aboutToAppear() {
    this.isComponentActive = true;
    await this.connectWebSocket();
  }

  onPageShow() {
    this.isPageVisible = true;
    // 页面恢复可见时清零未读数
    this.unreadCount = 0;

    // 如果连接已暂停,恢复连接
    if (this.connectionState === 'paused') {
      this.resumeConnection();
    }
  }

  onPageHide() {
    this.isPageVisible = false;
    // 页面隐藏时暂停接收(但不断开连接)
    if (this.connectionState === 'connected') {
      this.connectionState = 'paused';
    }
  }

  onBackPress(): boolean {
    // 有未读消息时,提示用户确认
    if (this.unreadCount > 0) {
      this.showExitConfirm = true;
      return true;  // 阻止默认返回
    }
    return false;
  }

  aboutToDisappear() {
    this.isComponentActive = false;
    this.cleanupResources();
  }

  // ========== 业务逻辑 ==========

  private async connectWebSocket(): Promise<void> {
    this.connectionState = 'connecting';
    try {
      await this.ws.connect('ws://example.com/chat');
      this.connectionState = 'connected';

      this.ws.on('message', (err: Error, data: string | ArrayBuffer) => {
        if (!this.isComponentActive) return;
        if (typeof data !== 'string') return;

        const msg: ChatMessage = JSON.parse(data);
        this.messages = [...this.messages, msg];

        // 页面不可见时累加未读数
        if (!this.isPageVisible) {
          this.unreadCount++;
        }
      });

      this.ws.on('close', () => {
        if (!this.isComponentActive) return;
        this.connectionState = 'disconnected';
        this.scheduleReconnect();
      });
    } catch (e) {
      this.connectionState = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== -1) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = -1;
      this.connectWebSocket();
    }, 3000);
  }

  private resumeConnection(): void {
    // 简化:重连即可
    if (this.connectionState !== 'connected') {
      this.connectWebSocket();
    }
  }

  private cleanupResources(): void {
    if (this.reconnectTimer !== -1) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = -1;
    }
    this.ws.off('message');
    this.ws.off('close');
    this.ws.close();
  }

  private async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (text.length === 0) return;
    if (this.connectionState !== 'connected') return;

    const msg: ChatMessage = {
      id: `local-${++this.messageIdCounter}`,
      text: text,
      sender: 'me',
      timestamp: Date.now()
    };

    try {
      await this.ws.send(JSON.stringify(msg));
      this.messages = [...this.messages, msg];
      this.inputText = '';
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  // ========== UI 构建 ==========

  @Builder
  ConnectionStatusBadge() {
    Row() {
      Circle({ width: 8, height: 8 })
        .fill(this.getStatusColor())
      Text(this.getStatusText())
        .fontSize(12)
        .fontColor('#666666')
        .margin({ left: 4 })
      if (this.unreadCount > 0) {
        Text(`${this.unreadCount}`)
          .fontSize(10)
          .fontColor('#FFFFFF')
          .backgroundColor('#FF0000')
          .borderRadius(8)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
          .margin({ left: 8 })
      }
    }
    .padding(8)
  }

  private getStatusColor(): string {
    switch (this.connectionState) {
      case 'connected': return '#00AA00';
      case 'connecting': return '#FFA500';
      case 'paused': return '#888888';
      default: return '#AA0000';
    }
  }

  private getStatusText(): string {
    switch (this.connectionState) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'paused': return 'Paused';
      default: return 'Disconnected';
    }
  }

  @Builder
  MessageItem(msg: ChatMessage) {
    Row() {
      if (msg.sender === 'me') {
        Blank()
      }
      Column() {
        Text(msg.text)
          .fontSize(14)
          .fontColor(msg.sender === 'me' ? '#FFFFFF' : '#333333')
          .padding({ left: 12, right: 12, top: 8, bottom: 8 })
          .backgroundColor(msg.sender === 'me' ? '#007DFF' : '#F0F0F0')
          .borderRadius(12)
        Text(new Date(msg.timestamp).toLocaleTimeString())
          .fontSize(10)
          .fontColor('#999999')
          .margin({ top: 4 })
      }
      .alignItems(msg.sender === 'me' ? HorizontalAlign.End : HorizontalAlign.Start)
      .layoutWeight(1)

      if (msg.sender !== 'me') {
        Blank()
      }
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 4, bottom: 4 })
  }

  build() {
    Column() {
      // 顶部状态栏
      Row() {
        Text('Chat').fontSize(18).fontWeight(FontWeight.Bold).layoutWeight(1)
        this.ConnectionStatusBadge()
      }
      .width('100%')
      .padding(12)
      .backgroundColor('#FFFFFF')

      // 消息列表
      List() {
        ForEach(this.messages, (msg: ChatMessage) => {
          ListItem() {
            this.MessageItem(msg)
          }
        }, (msg: ChatMessage): string => msg.id)
      }
      .layoutWeight(1)
      .width('100%')

      // 底部输入栏
      Row() {
        TextInput({ placeholder: 'Type a message', text: this.inputText })
          .layoutWeight(1)
          .onChange((value: string) => { this.inputText = value; })

        Button('Send')
          .enabled(this.connectionState === 'connected' && this.inputText.trim().length > 0)
          .onClick(() => { this.sendMessage(); })
      }
      .width('100%')
      .padding(12)
      .backgroundColor('#FFFFFF')
    }
    .width('100%')
    .height('100%')
  }
}
```

### 6.3 案例要点解析

1. **资源生命周期与组件生命周期对齐**——`aboutToAppear` 中申请 WebSocket 连接,`aboutToDisappear` 中关闭,确保资源不泄漏
2. **页面可见性优化**——`onPageHide` 时将状态置为 `paused` 而非断开连接,平衡资源消耗与响应速度
3. **未读消息提示**——`onPageShow` 时清零未读数,`onPageHide` 时累加,符合用户预期
4. **回调守卫**——所有异步回调中检查 `isComponentActive`,避免操作已销毁组件
5. **返回键拦截**——`onBackPress` 中根据未读数决定是否提示,提供更好的用户体验

## 7. 进阶技巧

### 7.1 异步加载与骨架屏

在 `aboutToAppear` 中加载数据时,可以在 `build()` 中先渲染骨架屏,提升用户体验感知。

```typescript
@Entry
@Component
struct ArticlePage {
  @State article: Article | null = null;
  @State loading: boolean = true;

  async aboutToAppear() {
    try {
      this.article = await fetchArticle(1);
    } finally {
      this.loading = false;
    }
  }

  @Builder
  SkeletonView() {
    Column() {
      // 标题骨架
      Column()
        .width('80%')
        .height(24)
        .backgroundColor('#F0F0F0')
        .borderRadius(4)

      // 正文骨架(多行)
      Column() {
        ForEach([0, 1, 2, 3, 4], (_: number, i: number) => {
          Column()
            .width(`${90 - i * 5}%`)
            .height(14)
            .backgroundColor('#F0F0F0')
            .borderRadius(4)
            .margin({ top: 8 })
        }, (_: number, i: number): string => `${i}`)
      }
      .margin({ top: 16 })
    }
    .width('100%')
    .padding(16)
  }

  build() {
    Scroll() {
      Column() {
        if (this.loading) {
          this.SkeletonView()
        } else if (this.article !== null) {
          Text(this.article.title)
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
          Text(this.article.content)
            .fontSize(14)
            .margin({ top: 16 })
        }
      }
      .width('100%')
      .padding(16)
    }
  }
}

interface Article {
  title: string;
  content: string;
}

async function fetchArticle(id: number): Promise<Article> {
  return new Promise((resolve: (a: Article) => void) => {
    setTimeout(() => {
      resolve({
        title: 'HarmonyOS Development Guide',
        content: 'This is the article content...'
      });
    }, 1000);
  });
}
```

### 7.2 防抖与节流

在生命周期中注册的事件监听常需要防抖(debounce)或节流(throttle)以避免频繁触发。

```typescript
@Entry
@Component
struct SearchPage {
  @State keyword: string = '';
  @State suggestions: string[] = [];
  private debounceTimer: number = -1;

  aboutToDisappear() {
    // 必须清除防抖定时器
    if (this.debounceTimer !== -1) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = -1;
    }
  }

  onKeywordChange(value: string) {
    this.keyword = value;
    // 清除上一次的定时器
    if (this.debounceTimer !== -1) {
      clearTimeout(this.debounceTimer);
    }
    // 设置新的定时器(300ms 防抖)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = -1;
      this.searchSuggestions(value);
    }, 300);
  }

  private async searchSuggestions(keyword: string): Promise<void> {
    if (keyword.trim().length === 0) {
      this.suggestions = [];
      return;
    }
    // 模拟 API 调用
    this.suggestions = await fetchSuggestions(keyword);
  }

  build() {
    Column() {
      TextInput({ placeholder: 'Search...', text: this.keyword })
        .onChange((value: string) => { this.onKeywordChange(value); })

      List() {
        ForEach(this.suggestions, (item: string) => {
          ListItem() {
            Text(item).fontSize(14).padding(12)
          }
        }, (item: string): string => item)
      }
    }
  }
}

async function fetchSuggestions(keyword: string): Promise<string[]> {
  return [`${keyword} 1`, `${keyword} 2`, `${keyword} 3`];
}
```

### 7.3 组件复用 `@Reusable`

对于频繁创建销毁的列表项组件,使用 `@Reusable` 装饰器可以让框架复用已销毁组件的实例,减少创建开销。

```typescript
@Reusable
@Component
struct MessageItem {
  @State message: string = '';
  @State sender: string = '';
  private messageId: string = '';

  // 复用前回调:框架将复用的实例传入新数据前触发
  aboutToReuse(params: Record<string, string>): void {
    this.message = params.message;
    this.sender = params.sender;
    this.messageId = params.id;
  }

  build() {
    Row() {
      Column() {
        Text(this.sender).fontSize(12).fontColor('#888888')
        Text(this.message).fontSize(14)
      }
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding(12)
  }
}

@Entry
@Component
struct MessageListPage {
  @State messages: Array<Record<string, string>> = [];

  aboutToAppear() {
    // 模拟加载大量消息
    this.messages = Array.from({ length: 1000 }, (_: unknown, i: number): Record<string, string> => ({
      id: `msg-${i}`,
      sender: i % 2 === 0 ? 'Alice' : 'Bob',
      message: `Message ${i}`
    }));
  }

  build() {
    List() {
      ForEach(this.messages, (msg: Record<string, string>) => {
        ListItem() {
          MessageItem({ message: msg.message, sender: msg.sender, id: msg.id } as Record<string, string>)
        }
      }, (msg: Record<string, string>): string => msg.id)
    }
    .width('100%')
    .height('100%')
  }
}
```

### 7.4 全局事件订阅的清理

订阅全局事件(如 EventBus、应用级状态)时,必须在 `aboutToDisappear` 中取消订阅,否则会导致:
1. 内存泄漏(组件被销毁但仍被订阅列表引用)
2. 回调到已销毁组件,访问 `this` 报错或导致 UI 异常

```typescript
// 反例:未取消订阅,导致内存泄漏
@Entry
@Component
struct BadExample {
  @State count: number = 0;

  aboutToAppear() {
    // 注册全局事件,但未保存引用
    eventBus.on('countUpdate', (data: number) => {
      this.count = data;  // 组件销毁后仍会执行,可能报错
    });
    // 没有 aboutToDisappear 取消订阅!
  }

  build() {
    Text(`Count: ${this.count}`)
  }
}

// 正例:保存引用并在 aboutToDisappear 取消
@Entry
@Component
struct GoodExample {
  @State count: number = 0;
  private handler: ((data: number) => void) | null = null;

  aboutToAppear() {
    // 使用箭头函数保存 this 引用
    this.handler = (data: number) => {
      this.count = data;
    };
    eventBus.on('countUpdate', this.handler);
  }

  aboutToDisappear() {
    if (this.handler !== null) {
      eventBus.off('countUpdate', this.handler);
      this.handler = null;
    }
  }

  build() {
    Text(`Count: ${this.count}`)
  }
}

// 简化的事件总线
class EventBus {
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  on<T>(event: string, cb: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(cb as (data: any) => void);
  }

  off<T>(event: string, cb: (data: T) => void): void {
    const arr = this.listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(cb as (data: any) => void);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  emit<T>(event: string, data: T): void {
    const arr = this.listeners.get(event);
    if (arr) {
      arr.forEach((cb: (d: any) => void) => cb(data));
    }
  }
}

const eventBus = new EventBus();
```

## 8. 性能优化

### 8.1 避免 `aboutToAppear` 中的高耗时操作

`aboutToAppear` 中执行同步高耗时操作会阻塞 `build()` 执行,导致页面渲染延迟。

```typescript
// 反例:aboutToAppear 中同步处理大量数据
@Entry
@Component
struct BadPage {
  @State data: string[] = [];

  aboutToAppear() {
    // 同步处理 10000 条数据,阻塞 UI 渲染
    const raw: string[] = [];
    for (let i = 0; i < 10000; i++) {
      raw.push(`Item ${i}`);
    }
    // 同步过滤、排序
    this.data = raw
      .filter((s: string) => s.includes('1'))
      .sort()
      .slice(0, 100);
  }

  build() {
    List() {
      ForEach(this.data, (item: string) => {
        ListItem() { Text(item) }
      }, (item: string): string => item)
    }
  }
}

// 正例:使用异步分片处理
@Entry
@Component
struct GoodPage {
  @State data: string[] = [];
  @State loading: boolean = true;

  async aboutToAppear() {
    // 让出主线程,先渲染 loading
    await Promise.resolve();

    // 异步分片处理
    const raw: string[] = [];
    for (let i = 0; i < 10000; i++) {
      raw.push(`Item ${i}`);
    }

    // 分批处理,每批 1000 条
    const result: string[] = [];
    for (let i = 0; i < raw.length; i += 1000) {
      const batch = raw.slice(i, i + 1000);
      const filtered = batch
        .filter((s: string) => s.includes('1'))
        .sort();
      result.push(...filtered);

      // 每批后让出主线程
      await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
    }

    this.data = result.slice(0, 100);
    this.loading = false;
  }

  build() {
    Column() {
      if (this.loading) {
        LoadingProgress()
      } else {
        List() {
          ForEach(this.data, (item: string) => {
            ListItem() { Text(item) }
          }, (item: string): string => item)
        }
      }
    }
  }
}
```

### 8.2 LazyForEach 与组件复用

长列表场景下,使用 `LazyForEach` 替代 `ForEach`,只在可见范围内渲染组件,大幅减少组件创建数量。

```typescript
// 反例:ForEach 一次性创建所有组件
@Entry
@Component
struct LongListBad {
  private data: MyData[] = [];

  aboutToAppear() {
    for (let i = 0; i < 10000; i++) {
      this.data.push({ id: `${i}`, value: `Item ${i}` });
    }
  }

  build() {
    List() {
      ForEach(this.data, (item: MyData) => {
        ListItem() { Text(item.value) }
      }, (item: MyData): string => item.id)
    }
  }
}

// 正例:LazyForEach 按需创建
class MyDataSource implements IDataSource {
  private data: MyData[] = [];
  private listeners: DataChangeListener[] = [];

  constructor(data: MyData[]) {
    this.data = data;
  }

  totalCount(): number { return this.data.length; }
  getData(idx: number): MyData { return this.data[idx]; }

  registerDataChangeListener(listener: DataChangeListener): void {
    this.listeners.push(listener);
  }
  unregisterDataChangeListener(listener: DataChangeListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }
}

@Entry
@Component
struct LongListGood {
  private dataSource: MyDataSource = new MyDataSource([]);

  aboutToAppear() {
    const data: MyData[] = [];
    for (let i = 0; i < 10000; i++) {
      data.push({ id: `${i}`, value: `Item ${i}` });
    }
    this.dataSource = new MyDataSource(data);
  }

  build() {
    List() {
      LazyForEach(this.dataSource, (item: MyData) => {
        ListItem() { Text(item.value) }
      }, (item: MyData): string => item.id)
    }
  }
}

interface MyData { id: string; value: string; }
```

### 8.3 减少 `build()` 中的副作用

`build()` 方法应保持纯净,仅根据当前状态描述 UI,不应执行副作用(网络请求、状态修改等)。

```typescript
// 反例:在 build 中执行副作用
@Entry
@Component
struct BadBuildExample {
  @State count: number = 0;

  build() {
    Column() {
      Button('Click')
        .onClick(() => {
          this.count++;
          // 反例:在事件回调中调用 fetch(会在每次渲染时执行)
          fetch('/api/log', { method: 'POST', body: `${this.count}` });
        })
    }
  }
}

// 正例:副作用抽离到方法
@Entry
@Component
struct GoodBuildExample {
  @State count: number = 0;

  private async logCount(value: number): Promise<void> {
    try {
      await fetch('/api/log', { method: 'POST', body: `${value}` });
    } catch (e) {
      console.error('Log failed:', e);
    }
  }

  build() {
    Column() {
      Button('Click')
        .onClick(async () => {
          this.count++;
          await this.logCount(this.count);
        })
    }
  }
}
```

### 8.4 状态精细化拆分

将不同更新频率的状态拆分到不同组件,避免单个状态变化触发大面积重渲染。

```typescript
// 反例:所有状态在一个组件中,任意变化都触发整个页面重渲染
@Entry
@Component
struct BadStatePage {
  @State time: string = '';  // 每秒更新
  @State userProfile: UserProfile | null = null;  // 偶尔更新
  @State articles: Article[] = [];  // 偶尔更新

  build() {
    Column() {
      Text(this.time)  // time 频繁变化,导致整个页面重渲染
      UserProfileView({ profile: this.userProfile })
      ArticleListView({ articles: this.articles })
    }
  }
}

// 正例:将频繁变化的状态隔离到独立子组件
@Entry
@Component
struct GoodStatePage {
  @State userProfile: UserProfile | null = null;
  @State articles: Article[] = [];

  build() {
    Column() {
      ClockView()  // 独立组件,内部状态变化不影响父组件
      UserProfileView({ profile: this.userProfile })
      ArticleListView({ articles: this.articles })
    }
  }
}

@Component
struct ClockView {
  @State time: string = '';
  private timer: number = -1;

  aboutToAppear() {
    this.updateTime();
    this.timer = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  aboutToDisappear() {
    if (this.timer !== -1) {
      clearInterval(this.timer);
      this.timer = -1;
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  }

  build() {
    Text(this.time).fontSize(20)
  }
}

interface UserProfile { name: string; }
interface Article { title: string; }

@Component
struct UserProfileView {
  @Prop profile: UserProfile | null = null;
  build() {
    Text(this.profile ? this.profile.name : 'Unknown')
  }
}

@Component
struct ArticleListView {
  @Prop articles: Article[] = [];
  build() {
    List() {
      ForEach(this.articles, (a: Article) => {
        ListItem() { Text(a.title) }
      }, (a: Article, i: number): string => `${i}`)
    }
  }
}
```

## 9. 调试排错

### 9.1 生命周期日志追踪

通过在所有生命周期回调中添加日志,可以快速定位组件创建、销毁异常。

```typescript
@Entry
@Component
struct DebuggablePage {
  private componentName: string = 'DebuggablePage';

  aboutToAppear() {
    console.log(`[${this.componentName}] aboutToAppear`);
  }

  onPageShow() {
    console.log(`[${this.componentName}] onPageShow`);
  }

  onPageHide() {
    console.log(`[${this.componentName}] onPageHide`);
  }

  aboutToDisappear() {
    console.log(`[${this.componentName}] aboutToDisappear`);
  }

  build() {
    Text('Hello').onClick(() => {
      router.pushUrl({ url: 'pages/Other' });
    })
  }
}

import router from '@ohos.router';
```

预期日志输出(进入页面 → 跳转 → 返回):

```
[DebuggablePage] aboutToAppear
[DebuggablePage] onPageShow
[DebuggablePage] onPageHide
[DebuggablePage] onPageShow  // 返回时
```

如果返回时**没有**看到 `onPageShow`,说明组件可能已被销毁(使用了 `replaceUrl` 或被路由栈清理)。

### 9.2 内存泄漏排查

组件未销毁是常见的内存泄漏问题。典型症状:
- `aboutToDisappear` 日志未打印
- DevEco Studio Profiler 显示组件实例数持续增长
- 长时间运行后内存占用持续上升

**常见泄漏原因**:

1. **未取消的事件订阅**——见 7.4 节
2. **未清除的定时器**——`setInterval`/`setTimeout` 持有 `this` 引用
3. **闭包持有组件引用**——异步回调中捕获 `this`
4. **全局缓存未清理**——单例中缓存了组件实例

```typescript
// 排查工具:引用追踪
class ComponentTracker {
  private activeComponents: Map<string, number> = new Map();

  register(name: string): void {
    const count = this.activeComponents.get(name) || 0;
    this.activeComponents.set(name, count + 1);
    console.log(`[Tracker] ${name} created, total: ${count + 1}`);
  }

  unregister(name: string): void {
    const count = this.activeComponents.get(name) || 0;
    if (count > 0) {
      this.activeComponents.set(name, count - 1);
      console.log(`[Tracker] ${name} destroyed, remaining: ${count - 1}`);
    }
  }

  report(): void {
    console.log('=== Active Components ===');
    this.activeComponents.forEach((count: number, name: string) => {
      if (count > 0) {
        console.log(`${name}: ${count}`);
      }
    });
  }
}

const tracker = new ComponentTracker();

@Entry
@Component
struct TrackedPage {
  private name: string = 'TrackedPage';

  aboutToAppear() {
    tracker.register(this.name);
  }

  aboutToDisappear() {
    tracker.unregister(this.name);
  }

  build() {
    Text('Hello')
  }
}
```

### 9.3 状态未更新的常见原因

如果 `@State` 修改后 UI 没有更新,通常是以下原因之一:

1. **直接修改了对象/数组**——`this.user.age = 31` 不会触发更新,应使用 `this.user = { ...this.user, age: 31 }`
2. **修改了 `@Prop` 字段**——`@Prop` 是只读的,需通过回调通知父组件修改
3. **`@Link` 未使用 `$` 前缀**——父组件传递时必须 `ChildComponent({ count: $count })`
4. **`aboutToAppear` 中同步赋值后立即读取**——首次 `build()` 还未执行,状态可能未生效

```typescript
// 反例:直接修改对象属性
@Entry
@Component
struct BadUpdate {
  @State user: User = { name: 'Alice', age: 30 };

  updateAge() {
    this.user.age = 31;  // UI 不会更新!
  }

  build() {
    Column() {
      Text(`Age: ${this.user.age}`)
      Button('Update').onClick(() => this.updateAge())
    }
  }
}

// 正例:不可变更新
@Entry
@Component
struct GoodUpdate {
  @State user: User = { name: 'Alice', age: 30 };

  updateAge() {
    this.user = { ...this.user, age: 31 };  // 创建新对象,触发更新
  }

  build() {
    Column() {
      Text(`Age: ${this.user.age}`)
      Button('Update').onClick(() => this.updateAge())
    }
  }
}

interface User { name: string; age: number; }
```

### 9.4 DevEco Studio 调试技巧

1. **Profiler 工具**——查看组件实例数、内存占用、函数调用耗时
2. **Inspector**——可视化组件树,检查渲染结果与预期是否一致
3. **断点调试**——在生命周期回调中设置断点,观察触发顺序
4. **Log 过滤**——使用 `[Tracker]` 等前缀过滤日志,快速定位问题

## 10. 最佳实践

### 10.1 资源管理清单

在 `aboutToAppear` 中申请的每个资源,都必须在 `aboutToDisappear` 中有对应的释放逻辑。建议使用清单核对:

| 资源类型 | 申请方式 | 释放方式 |
| --- | --- | --- |
| 定时器 | `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| 事件订阅 | `eventBus.on` | `eventBus.off` |
| WebSocket | `ws.connect` | `ws.close` + `ws.off` |
| 网络请求 | `http.createHttp` | `http.destroy` |
| 文件句柄 | `fs.open` | `fs.close` |
| 数据库游标 | `rdb.query` | `resultSet.close` |
| 全局状态订阅 | `state.subscribe` | `unsubscribe()` |

### 10.2 异步操作的回调守卫

在 `aboutToAppear` 中启动的异步操作,可能在组件销毁后才完成。所有回调中必须检查组件是否仍存活。

```typescript
@Entry
@Component
struct SafeAsyncPage {
  @State data: string = '';
  private isActive: boolean = false;

  aboutToAppear() {
    this.isActive = true;
    this.loadData();
  }

  aboutToDisappear() {
    this.isActive = false;  // 标记组件已销毁
  }

  private async loadData(): Promise<void> {
    try {
      const result = await fetchData();  // 可能耗时
      // 关键:检查组件是否仍存活
      if (!this.isActive) return;
      this.data = result;
    } catch (e) {
      if (!this.isActive) return;
      console.error('Load failed:', e);
    }
  }

  build() {
    Text(this.data || 'Loading...')
  }
}

async function fetchData(): Promise<string> {
  return new Promise((resolve: (s: string) => void) => {
    setTimeout(() => resolve('Loaded'), 1000);
  });
}
```

### 10.3 单一职责的组件设计

避免在单个组件中处理过多生命周期逻辑。如果一个组件的 `aboutToAppear` 超过 50 行,考虑拆分。

```typescript
// 反例:单组件承担过多职责
@Entry
@Component
struct MonolithPage {
  async aboutToAppear() {
    // 加载用户数据
    // 加载订单数据
    // 注册 WebSocket
    // 启动定时器
    // 注册事件监听
    // ...
  }

  aboutToDisappear() {
    // 对应的清理逻辑
    // ...
  }

  build() { /* ... */ }
}

// 正例:职责拆分到子组件
@Entry
@Component
struct SplitPage {
  build() {
    Column() {
      UserProfileSection()   // 自己管理用户数据加载
      OrderListSection()     // 自己管理订单数据加载
      NotificationSection()   // 自己管理 WebSocket 与事件订阅
    }
  }
}

@Component
struct UserProfileSection {
  @State user: User | null = null;

  async aboutToAppear() {
    this.user = await fetchUser();
  }

  build() {
    Text(this.user ? this.user.name : 'Loading...')
  }
}

// ... 其他子组件类似
```

### 10.4 状态保存与恢复

页面跳转返回后,如果组件未销毁(KeepAlive 模式),状态会自动保留。但如果使用 `replaceUrl` 或栈满,组件会被销毁,需要在 `aboutToDisappear` 中持久化关键状态,在 `aboutToAppear` 中恢复。

```typescript
import preferences from '@ohos.data.preferences';

@Entry
@Component
struct FormPage {
  @State draftText: string = '';
  private prefs: preferences.Preferences | null = null;

  async aboutToAppear() {
    // 恢复草稿
    const context = getContext(this);
    this.prefs = await preferences.getPreferences(context, 'form_draft');
    this.draftText = await this.prefs.get('draftText', '') as string;
  }

  async aboutToDisappear() {
    // 保存草稿
    if (this.prefs !== null) {
      await this.prefs.put('draftText', this.draftText);
      await this.prefs.flush();
    }
  }

  build() {
    Column() {
      TextInput({ text: this.draftText })
        .onChange((value: string) => { this.draftText = value; })
    }
  }
}
```

## 11. 总结回顾

### 11.1 核心知识点回顾

1. **两个生命周期层次**——组件级(`aboutToAppear`/`aboutToDisappear`)与 UIAbility 级(`onCreate`/`onForeground`/`onBackground`/`onDestroy`),不可混淆
2. **五个核心回调**——`aboutToAppear`(初始化)、`build`(渲染)、`onPageShow`(可见)、`onPageHide`(隐藏)、`aboutToDisappear`(清理)
3. **页面级专属回调**——`onPageShow`、`onPageHide`、`onBackPress` 仅在 `@Entry` 组件中生效
4. **资源管理原则**——`aboutToAppear` 中申请的资源必须在 `aboutToDisappear` 中释放
5. **异步回调守卫**——所有异步回调中检查组件是否仍存活,避免操作已销毁组件
6. **KeepAlive 模式**——通过 `Visibility.Hidden` 而非 `if` 控制组件显隐,保留状态

### 11.2 速查表

| 场景 | 推荐回调 | 注意事项 |
| --- | --- | --- |
| 初始化 `@State` | `aboutToAppear` | 复杂值在 `aboutToAppear` 中赋值,简单值在声明时赋值 |
| 加载网络数据 | `aboutToAppear` | 使用 `async/await`,异步完成后修改 `@State` 触发重渲染 |
| 注册事件订阅 | `aboutToAppear` | 必须保存回调引用,在 `aboutToDisappear` 中取消 |
| 启动定时器 | `aboutToAppear` | 必须保存定时器 ID,在 `aboutToDisappear` 中清除 |
| 页面可见时刷新数据 | `onPageShow` | 区分首次显示与返回,避免重复加载 |
| 页面隐藏时暂停操作 | `onPageHide` | 暂停动画、轮询等 |
| 拦截返回键 | `onBackPress` | 返回 `true` 阻止默认行为,`false` 执行默认 |
| 释放资源 | `aboutToDisappear` | 必须与 `aboutToAppear` 中的申请一一对应 |
| 保存草稿 | `aboutToDisappear` | 使用 Preferences 持久化 |

### 11.3 常见错误清单

1. **在 `build()` 中执行副作用**——`build()` 必须保持纯净
2. **直接修改对象/数组属性**——必须使用不可变更新
3. **未取消事件订阅**——导致内存泄漏与回调错误
4. **未清除定时器**——导致回调到已销毁组件
5. **在异步回调中未检查组件存活**——可能导致 `this` 访问异常
6. **混淆组件级与 UIAbility 级生命周期**——`onForeground` 是 UIAbility 的,不是组件的
7. **`onPageShow` 中重复加载**——首次进入与返回都触发,需区分
8. **在 `aboutToDisappear` 中修改 `@State`**——组件即将销毁,修改无意义
9. **KeepAlive 模式下未考虑内存占用**——隐藏的组件仍占用资源,需权衡
10. **使用 `if` 控制频繁切换的组件**——会触发销毁重建,应使用 `Visibility`

### 11.4 进阶学习路径

1. **深入 ArkUI 渲染机制**——理解 diff 算法、虚拟组件树
2. **学习 Stage 模型 Ability**——掌握多 Ability 协作、跨 Ability 通信
3. **研究 `@Reusable` 实现原理**——理解组件复用池机制
4. **掌握 LazyForEach 与 `IDataSource`**——长列表性能优化的核心
5. **学习 HarmonyOS 内存管理**——理解 LMK、内存压力下的组件回收

## 12. 参考资料

### 12.1 官方文档

1. **HarmonyOS Developer——UI Development**
   - ArkUI Component Lifecycle: `https://developer.harmonyos.com/cn/docs/arkui-lifecycle`
   - UIAbility Lifecycle: `https://developer.harmonyos.com/cn/docs/uiability-lifecycle`

2. **API Reference**
   - `@ohos.app.ability.UIAbility`
   - `@ohos.router`
   - `@ohos.data.preferences`

### 12.2 推荐书籍与论文

1. **《HarmonyOS 应用开发实战》**——华为专家团队著,系统讲解 ArkUI 与生命周期
2. **《声明式 UI 编程范式》**——对比 React、Flutter、SwiftUI 的设计哲学
3. **"A Survey on Declarative UI Frameworks"**——IEEE 软件工程学报,对比分析现代声明式 UI 框架

### 12.3 相关章节

- **ArkTS 与 TypeScript 差异**——理解 ArkTS 类型系统对生命周期回调的影响
- **ArkUI 声明式语法**——掌握 `@Component`、`@State` 等装饰器,生命周期依附于此
- **路由跳转与路由栈**——路由跳转触发页面级生命周期的详细机制
- **权限申请**——权限申请通常在 `onCreate` 中完成,与 UIAbility 生命周期相关
- **分布式数据管理**——长连接与数据同步,常在生命周期中管理

### 12.4 练习题

#### 基础题

1. 解释 `aboutToAppear` 与 `onPageShow` 的区别,并各举一个适用场景。
2. 以下代码存在什么问题?如何修复?
   ```typescript
   @Component
   struct Problem {
     @State user: User = { name: 'Alice' };
     aboutToAppear() {
       setInterval(() => { this.user.name = 'Bob'; }, 1000);
     }
     build() { Text(this.user.name) }
   }
   ```
3. UIAbility 的 `onForeground` 与组件的 `onPageShow` 触发顺序是什么?

#### 进阶题

4. 设计一个"自动保存草稿"机制,要求:
   - 用户输入时每 5 秒自动保存一次
   - 应用进入后台时立即保存
   - 退出页面时保存
   - 返回页面时恢复草稿

5. 实现一个聊天页面,要求:
   - 进入页面时连接 WebSocket
   - 页面隐藏时暂停接收消息但不断开连接
   - 页面销毁时关闭连接
   - 网络断开时自动重连(指数退避)

#### 高阶题

6. 分析以下场景的内存泄漏原因并修复:
   ```typescript
   @Component
   struct LeakExample {
     @State data: string[] = [];
     private cache: Map<string, (data: any) => void> = new Map();

     aboutToAppear() {
       const handler = (data: any) => { this.data = data.items; };
       this.cache.set('handler', handler);
       globalEventBus.on('dataUpdate', handler);
     }

     aboutToDisappear() {
       // 仅取消订阅,未清理 cache
       const handler = this.cache.get('handler');
       if (handler) globalEventBus.off('dataUpdate', handler);
     }

     build() { /* ... */ }
   }
   ```

7. 比较以下两种 Tab 实现方式的性能差异,并说明适用场景:
   - 方式 A:使用 `if` 切换组件
   - 方式 B:使用 `Visibility.Hidden` 控制显隐

### 12.5 术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 生命周期 | Lifecycle | 对象从创建到销毁所经历的阶段序列 |
| 回调 | Callback | 框架在特定时机调用的函数 |
| 资源泄漏 | Resource Leak | 申请的资源未被释放,导致占用持续累积 |
| 内存泄漏 | Memory Leak | 不再使用的对象因被引用而无法被 GC 回收 |
| KeepAlive | KeepAlive | 保留组件实例与状态,避免销毁重建 |
| 回调守卫 | Callback Guard | 在异步回调中检查组件是否仍存活 |
| 防抖 | Debounce | 延迟执行,在多次触发中仅执行最后一次 |
| 节流 | Throttle | 限制执行频率,在固定时间窗口内仅执行一次 |
| 异步加载 | Async Loading | 不阻塞 UI 的数据加载方式 |
| 骨架屏 | Skeleton Screen | 加载过程中显示的占位 UI |
