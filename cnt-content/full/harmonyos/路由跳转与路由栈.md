---
order: 104
title: 路由跳转与路由栈
module: harmonyos
category: 'dev-lang'
difficulty: advanced
description: HarmonyOS路由跳转与路由栈详解：router.pushUrl、replaceUrl。
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/ArkUI声明式语法
  - harmonyos/组件生命周期详解
  - harmonyos/权限申请
  - harmonyos/分布式数据管理
prerequisites:
  - harmonyos/概述与环境搭建
---

# 路由跳转与路由栈详解

## 1. 概述与背景

### 1.1 路由的本质

在移动应用开发中,路由(routing)指的是页面之间的跳转与堆栈管理机制。一个典型的应用由多个页面组成,如登录页、首页、详情页、设置页等,用户在不同页面间切换的过程就是路由跳转。路由系统负责维护页面的历史栈,支持前进、后退、替换等操作,并管理页面间的参数传递。

HarmonyOS 的路由系统可以分为两个阶段:

1. **早期路由 API**(`@ohos.router`)——基于路由栈的命令式 API,提供 `pushUrl`、`replaceUrl`、`back` 等方法,API 9 起稳定可用
2. **Navigation 组件**(`@ohos.plugin.component.Navigation`)——声明式路由,API 10 起推荐使用,更灵活、更易组合

两种路由系统不是互斥关系,而是可以并存。本章将详细讲解两种路由机制,以及它们与组件生命周期的协作。

### 1.2 路由栈模型

路由栈(route stack)是 HarmonyOS 路由系统的核心数据结构,采用后进先出(LIFO)的栈结构管理页面历史。

用一个具体的例子理解路由栈:

```
用户操作:                     路由栈(底部到顶部):       说明
应用启动                      [Index]                   默认页面入栈
跳转到 List                   [Index, List]             pushUrl 压栈
跳转到 Detail                 [Index, List, Detail]    pushUrl 压栈
返回                          [Index, List]              back 弹栈
跳转到 Profile (替换)          [Index, List, Profile]  replaceUrl 替换栈顶
返回                          [Index, List]              back 弹栈
返回                          [Index]                   back 弹栈
```

可以看到路由栈遵循栈的基本操作:
- **压栈(push)**——`router.pushUrl` 将新页面压入栈顶,旧页面保留在栈中
- **弹栈(pop)**——`router.back` 弹出栈顶页面,显示前一个页面
- **替换(replace)**——`router.replaceUrl` 替换栈顶页面,栈深度不变

### 1.3 与 Web 路由的对比

Web 路由(History API)与 HarmonyOS 路由有相似之处,但实现机制不同:

| 维度 | Web 路由 | HarmonyOS 路由 |
| --- | --- | --- |
| 数据结构 | History stack(浏览器维护) | Route stack(应用内维护) |
| 跨应用跳转 | 支持(跨域名) | 不支持(应用内页面) |
| URL 形式 | 完整 URL | 相对路径(如 `pages/Detail`) |
| 参数传递 | URL query string | params 对象 |
| 状态持久化 | 可序列化到 URL | 内存中(重启丢失) |
| 深度链接 | 直接通过 URL | 通过 Want 或 URI scheme |

### 1.4 与 React/Flutter 路由的对比

| 框架 | 路由方案 | 命令式 API | 声明式 API |
| --- | --- | --- | --- |
| HarmonyOS | router + Navigation | `router.pushUrl` | `Navigation` + `NavPathStack` |
| React | react-router | `history.push` | `<Route>` + `useNavigate` |
| Flutter | Navigator | `Navigator.push` | `MaterialPageRoute` |
| SwiftUI | NavigationStack | (无) | `NavigationStack` + `NavigationLink` |

可以看到 HarmonyOS 的路由演进趋势与 SwiftUI 类似:从命令式 API 起步,逐步引入声明式组件以获得更好的组合性与可测试性。

### 1.5 学习路由的工程价值

掌握路由系统对工程实践有以下直接价值:

- **用户体验**——合理使用 `replaceUrl` 避免用户在登录页与首页之间反复跳转
- **状态管理**——通过路由参数在页面间传递数据,避免全局状态污染
- **性能优化**——预加载页面、合理使用 `RouterMode.Single` 避免重复创建
- **深度链接**——支持通过 URL 直接打开特定页面,用于推送通知、分享链接
- **模块化**——通过命名路由解耦页面引用,支持动态加载模块
- **可测试性**——声明式路由(Navigation)更易进行单元测试与状态快照

## 2. 学习目标

完成本章学习后,读者应能够:

1. **概念层面**——准确解释路由栈的工作原理,以及 `pushUrl`、`replaceUrl`、`back` 三者的区别
2. **代码层面**——熟练使用 `@ohos.router` API 实现页面跳转、参数传递、返回控制
3. **架构层面**——理解何时使用命令式 router API,何时使用声明式 Navigation 组件
4. **进阶应用**——掌握 `RouterMode.Single`、命名路由、动态路由、深度链接等高级特性
5. **性能优化**——能够通过路由预加载、参数优化、栈清理等手段提升应用性能
6. **调试排错**——能够诊断路由栈溢出、参数丢失、白屏等常见问题

## 3. 前置知识

阅读本章前,建议读者具备以下基础:

- **ArkUI 基础**——已阅读"ArkUI 声明式语法"章节,理解 `@Entry`、`@Component`、`build()` 等概念
- **组件生命周期**——已阅读"组件生命周期详解"章节,理解 `aboutToAppear`、`onPageShow` 等回调
- **ArkTS 异步**——熟悉 `async/await`、Promise,因为路由跳转多为异步操作
- **Stage 模型**——了解 UIAbility、windowStage 等基础概念

## 4. 核心概念

### 4.1 路由 API 总览

HarmonyOS 提供 `@ohos.router` 模块作为命令式路由 API,核心方法如下:

| 方法 | 用途 | 是否压栈 | 是否异步 |
| --- | --- | --- | --- |
| `router.pushUrl(options)` | 压栈跳转(可返回) | 是 | 是(Promise) |
| `router.replaceUrl(options)` | 替换跳转(不可返回) | 否 | 是(Promise) |
| `router.back(options?)` | 返回上一页或指定页 | 弹栈 | 否(同步触发) |
| `router.push(options)` | `pushUrl` 的同步变体(API 9 废弃) | 是 | 否 |
| `router.replace(options)` | `replaceUrl` 的同步变体(API 9 废弃) | 否 | 否 |
| `router.clear()` | 清空路由栈(仅保留当前页) | 清空 | 否 |
| `router.getLength()` | 获取路由栈深度 | - | 否 |
| `router.getState()` | 获取路由栈状态 | - | 否 |
| `router.showAlertBeforeBackPage()` | 返回前显示确认弹窗 | - | 否 |
| `router.hideAlertBeforeBackPage()` | 隐藏返回确认弹窗 | - | 否 |
| `router.getParams()` | 获取上一页传递的参数 | - | 否 |

### 4.2 路由配置 `main_pages.json`

HarmonyOS 应用启动时,会从 `resources/base/profile/main_pages.json` 读取路由表,声明所有可访问的页面路径:

```json
{
  "src": [
    "pages/Index",
    "pages/Login",
    "pages/Home",
    "pages/Detail",
    "pages/Profile",
    "pages/Settings"
  ]
}
```

**关键约定**:
- 路径以 `pages/` 开头,不带 `.ets` 后缀
- 第一个声明的页面(通常是 `pages/Index`)是应用入口
- 未在 `main_pages.json` 中声明的页面无法被 `router.pushUrl` 访问
- 路由跳转的 `url` 参数必须与 `main_pages.json` 中的路径完全匹配

### 4.3 `router.pushUrl` 压栈跳转

`pushUrl` 是最常用的路由跳转方法,将新页面压入路由栈,保留原页面在栈中,支持返回。

```typescript
import router from '@ohos.router';

// 基本用法:跳转到 Detail 页面
router.pushUrl({
  url: 'pages/Detail'
});

// 带参数跳转
router.pushUrl({
  url: 'pages/Detail',
  params: {
    id: 123,
    name: 'Alice',
    timestamp: Date.now()
  }
});

// 异步等待跳转完成
router.pushUrl({
  url: 'pages/Detail'
}).then(() => {
  console.log('Jump succeeded');
}).catch((err: Error) => {
  console.error(`Jump failed: ${err.message}`);
});

// 使用 async/await
async function goToDetail() {
  try {
    await router.pushUrl({ url: 'pages/Detail' });
    console.log('Jumped successfully');
  } catch (e) {
    console.error(`Failed: ${(e as Error).message}`);
  }
}
```

**`RouterOptions` 参数说明**:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | 是 | 目标页面路径(与 `main_pages.json` 中声明一致) |
| `params` | `object` | 否 | 传递给目标页面的参数,任意可序列化对象 |

### 4.4 `router.replaceUrl` 替换跳转

`replaceUrl` 替换栈顶页面,**不增加栈深度**,常用于"不可返回"的场景,如登录成功后跳转首页。

```typescript
import router from '@ohos.router';

// 登录成功后替换为首页(用户无法返回登录页)
async function onLoginSuccess() {
  await router.replaceUrl({
    url: 'pages/Home',
    params: { userId: 'user-123' }
  });
}

// 启动页跳转到首页(启动页不应被返回)
async function onSplashFinished() {
  await router.replaceUrl({
    url: 'pages/Index'
  });
}
```

**`pushUrl` 与 `replaceUrl` 的路由栈差异**:

```
初始栈: [A]

执行 router.pushUrl({ url: 'B' }):
栈变为 [A, B]  (用户可从 B 返回 A)

执行 router.replaceUrl({ url: 'C' })  (在 A 上):
栈变为 [C]  (A 被替换,用户无法返回 A)
```

**典型场景**:

| 场景 | 推荐方法 | 原因 |
| --- | --- | --- |
| 列表 → 详情 | `pushUrl` | 用户应能返回列表 |
| 登录 → 首页 | `replaceUrl` | 登录后不应返回登录页 |
| 启动页 → 首页 | `replaceUrl` | 启动页是一次性的 |
| 表单提交 → 结果页 | `replaceUrl` | 提交后不应返回表单 |
| 引导页 → 主页 | `replaceUrl` | 引导完成后不应返回引导页 |

### 4.5 `router.back` 返回

`back` 方法用于返回上一页或指定页面。如果不传参数,默认返回上一页。

```typescript
import router from '@ohos.router';

// 返回上一页
router.back();

// 返回到指定页面(如果栈中存在该页面,弹出到该页面;否则跳转到该页面)
router.back({ url: 'pages/Index' });

// 带参数返回(目标页面通过 router.getParams() 获取)
router.back({ url: 'pages/Home' });
```

**返回路径的解析逻辑**:

1. 如果传入 `url`,系统会从栈顶向下查找匹配的页面
2. 找到后,将该页面之上的所有页面弹出
3. 如果栈中没有匹配页面,跳转到该页面(行为类似 `pushUrl`)

**`back` 与 `pushUrl` 的本质区别**:
- `back` 是**弹栈**操作,栈深度减少
- `pushUrl` 是**压栈**操作,栈深度增加

### 4.6 路由参数传递

路由参数是页面间通信的主要方式。在源页面通过 `params` 传递,在目标页面通过 `router.getParams()` 接收。

```typescript
// 源页面:pages/List.ets
import router from '@ohos.router';

@Entry
@Component
struct ListPage {
  private items: Item[] = [
    { id: 1, title: 'First' },
    { id: 2, title: 'Second' },
    { id: 3, title: 'Third' }
  ];

  build() {
    List() {
      ForEach(this.items, (item: Item) => {
        ListItem() {
          Text(item.title)
            .onClick(() => {
              // 传递参数到详情页
              router.pushUrl({
                url: 'pages/Detail',
                params: {
                  id: item.id,
                  title: item.title,
                  source: 'list'
                }
              });
            })
        }
      }, (item: Item): string => `${item.id}`)
    }
  }
}

interface Item {
  id: number;
  title: string;
}
```

```typescript
// 目标页面:pages/Detail.ets
import router from '@ohos.router';

interface DetailParams {
  id: number;
  title: string;
  source: string;
}

@Entry
@Component
struct DetailPage {
  @State params: DetailParams | null = null;

  aboutToAppear() {
    // 获取上一页传递的参数
    const raw = router.getParams();
    if (raw !== null && raw !== undefined) {
      this.params = raw as DetailParams;
    }
  }

  build() {
    Column() {
      if (this.params !== null) {
        Text(`ID: ${this.params.id}`).fontSize(20)
        Text(`Title: ${this.params.title}`).fontSize(16)
        Text(`Source: ${this.params.source}`).fontSize(12).fontColor('#888888')
      } else {
        Text('No params').fontColor('#FF0000')
      }
    }
  }
}
```

**参数序列化要求**:
- `params` 必须是可 JSON 序列化的对象
- 不支持传递函数、Symbol、循环引用对象
- 支持 `number`、`string`、`boolean`、`null`、`undefined`、普通对象、数组
- 对象深度无限制,但建议控制在 3 层以内

### 4.7 `RouterMode` 路由模式

`pushUrl` 与 `replaceUrl` 都接受可选的 `RouterMode` 参数,决定页面的入栈行为:

| 模式 | 值 | 行为 |
| --- | --- | --- |
| `Standard`(默认) | `0` | 标准模式,每次跳转都创建新实例 |
| `Single` | `1` | 单例模式,如果栈中已存在该页面,移到栈顶并复用 |

```typescript
import router from '@ohos.router';

// Standard 模式:每次创建新实例(默认)
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Standard);

// Single 模式:栈中已存在则复用
router.pushUrl({ url: 'pages/Detail' }, router.RouterMode.Single);
```

**Single 模式的栈操作示意**:

```
当前栈: [Index, List, Detail]

执行 router.pushUrl({ url: 'pages/List' }, RouterMode.Single):
栈变为 [Index, List]  (List 被移到栈顶,Detail 被弹出)

执行 router.pushUrl({ url: 'pages/Detail' }, RouterMode.Single):
栈变为 [Index, List, Detail]  (栈中没有 Detail,新创建)

再次执行 router.pushUrl({ url: 'pages/Detail' }, RouterMode.Single):
栈仍为 [Index, List, Detail]  (栈顶已是 Detail,不重复创建)
```

**适用场景**:
- **登录页**:用户已登录时,不应再次进入登录页——使用 `Single` 模式
- **设置页**:多次点击设置入口,不应叠加多个设置页——使用 `Single` 模式
- **详情页**:每次查看不同内容应创建新实例——使用 `Standard` 模式
- **搜索结果页**:保留搜索历史——使用 `Standard` 模式

### 4.8 路由与组件生命周期的协作

路由跳转触发的组件生命周期变化是理解路由行为的关键。

**`pushUrl` 跳转的生命周期触发**:

```
源页面 A -> router.pushUrl(目标页面 B)

[A] onPageHide
[B] aboutToAppear
[B] build  -> 渲染
[B] onPageShow
```

注意:A 的 `aboutToDisappear` **不会**触发(因为 A 仍保留在路由栈中)。

**`replaceUrl` 跳转的生命周期触发**:

```
源页面 A -> router.replaceUrl(目标页面 B)

[A] onPageHide
[A] aboutToDisappear  (A 被销毁)
[B] aboutToAppear
[B] build  -> 渲染
[B] onPageShow
```

**`back` 返回的生命周期触发**:

```
当前栈: [A, B],B 为栈顶
router.back()

[B] onPageHide
[B] aboutToDisappear  (B 被销毁)
[A] onPageShow  (A 重新可见)
```

**`Single` 模式的特殊生命周期**:

```
当前栈: [Index, List, Detail]
router.pushUrl({ url: 'pages/List' }, RouterMode.Single)

[Detail] onPageHide
[Detail] aboutToDisappear  (Detail 被弹出)
[List] onPageShow  (List 重新可见,但 aboutToAppear 不触发,因为 List 未被销毁)
```

### 4.9 路由栈状态查询

`router` 模块提供了查询路由栈状态的方法,用于诊断与监控:

```typescript
import router from '@ohos.router';

// 获取路由栈深度(页面数量)
const length: number = router.getLength();
console.log(`Stack length: ${length}`);

// 获取路由栈状态(包括所有页面的路径与索引)
const state: router.RouterState = router.getState();
console.log(`Current page index: ${state.index}`);
console.log(`Current page name: ${state.name}`);
console.log(`Current page path: ${state.path}`);

// 获取路由栈所有页面信息
const stack: router.RouterState[] = router.getStack();
stack.forEach((s: router.RouterState, i: number) => {
  console.log(`[${i}] ${s.path}`);
});
```

**`RouterState` 字段说明**:

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `index` | `number` | 页面在栈中的索引(0-based) |
| `name` | `string` | 页面名称 |
| `path` | `string` | 页面路径(如 `pages/Detail`) |

### 4.10 返回前确认弹窗

`router.showAlertBeforeBackPage` 用于在返回前显示确认弹窗,常用于表单未保存提示。

```typescript
import router from '@ohos.router';

@Entry
@Component
struct EditFormPage {
  @State hasUnsavedChanges: boolean = false;

  aboutToAppear() {
    // 注册返回前确认弹窗
    router.showAlertBeforeBackPage({
      message: 'You have unsaved changes. Are you sure to leave?'
    });
  }

  onPageHide() {
    // 页面隐藏时移除弹窗(避免影响其他页面)
    router.hideAlertBeforeBackPage();
  }

  aboutToDisappear() {
    // 组件销毁时确保弹窗已关闭
    router.hideAlertBeforeBackPage();
  }

  build() {
    Column() {
      TextInput({ placeholder: 'Enter something' })
        .onChange((value: string) => {
          this.hasUnsavedChanges = value.length > 0;
          // 根据是否有修改,动态显示/隐藏弹窗
          if (this.hasUnsavedChanges) {
            router.showAlertBeforeBackPage({
              message: 'You have unsaved changes. Are you sure to leave?'
            });
          } else {
            router.hideAlertBeforeBackPage();
          }
        })

      Button('Save and Back')
        .onClick(() => {
          router.hideAlertBeforeBackPage();
          // 保存逻辑...
          router.back();
        })
    }
  }
}
```

### 4.11 Navigation 声明式路由(API 10+)

`Navigation` 组件是 API 10 引入的声明式路由方案,提供了更灵活的路由管理能力。与命令式 `router` API 相比,`Navigation` 通过组件嵌套描述路由结构,更易于组合与测试。

```typescript
@Entry
@Component
struct MainPage {
  private pathStack: NavPathStack = new NavPathStack();

  @Builder
  pageMap(name: string) {
    if (name === 'Home') {
      HomePage()
    } else if (name === 'Detail') {
      DetailPage()
    } else if (name === 'Settings') {
      SettingsPage()
    }
  }

  build() {
    Navigation(this.pathStack) {
      // 首页内容
      Column() {
        Text('Main Page').fontSize(24)
        Button('Go to Detail')
          .onClick(() => {
            this.pathStack.pushPath({ name: 'Detail' });
          })
      }
    }
    .navDestination(this.pageMap)
    .mode(NavigationMode.Stack)
  }
}

@Component
struct HomePage {
  build() {
    Column() {
      Text('Home').fontSize(20)
    }
  }
}

@Component
struct DetailPage {
  build() {
    Column() {
      Text('Detail').fontSize(20)
      NavRouter() {
        Text('Go to Settings')
        NavDestination() {
          SettingsPage()
        }
      }
    }
  }
}

@Component
struct SettingsPage {
  build() {
    Column() {
      Text('Settings').fontSize(20)
    }
  }
}
```

**`Navigation` 的核心 API**:

| 方法 | 用途 |
| --- | --- |
| `pushPath(path)` | 压栈跳转 |
| `pop()` | 返回上一页 |
| `popTo(name)` | 返回到指定页面 |
| `popToRoot()` | 返回根页面 |
| `clear()` | 清空栈(仅保留根) |
| `getAllPathName()` | 获取栈中所有页面名 |

**`Navigation` 与 `router` 的对比**:

| 维度 | `router` API | `Navigation` 组件 |
| --- | --- | --- |
| 范式 | 命令式 | 声明式 |
| 入口 | 全局函数 | 组件实例 |
| 状态管理 | 隐式(模块内部) | 显式(`NavPathStack`) |
| 可测试性 | 较弱(依赖全局状态) | 强(可注入栈) |
| 跨平台一致性 | 仅 HarmonyOS | 仅 HarmonyOS |
| 推荐度 | 旧项目兼容 | 新项目首选 |

### 4.12 命名路由

命名路由(named route)允许通过名称而非路径引用页面,提升代码可读性与可维护性。

```typescript
// 定义命名路由表
const routeTable: Record<string, string> = {
  'home': 'pages/Home',
  'detail': 'pages/Detail',
  'settings': 'pages/Settings'
};

// 封装跳转方法
function navigate(name: string, params?: Record<string, unknown>): Promise<void> {
  const url = routeTable[name];
  if (!url) {
    return Promise.reject(new Error(`Unknown route: ${name}`));
  }
  return router.pushUrl({ url, params });
}

// 使用
navigate('detail', { id: 123 })
  .then(() => console.log('Jumped'))
  .catch((e: Error) => console.error(e));
```

命名路由的优势:
1. **解耦**——页面引用通过名称,不直接依赖路径
2. **可重构**——修改路径只需更新路由表
3. **可读性**——`navigate('detail')` 比 `router.pushUrl({ url: 'pages/Detail' })` 更清晰
4. **可扩展**——易于添加路由守卫、日志、权限检查等中间件

## 5. 代码示例

### 5.1 示例一:基础列表-详情跳转

```typescript
// pages/List.ets
import router from '@ohos.router';

interface Article {
  id: number;
  title: string;
  summary: string;
}

@Entry
@Component
struct ArticleListPage {
  private articles: Article[] = [
    { id: 1, title: 'HarmonyOS Overview', summary: 'Introduction to HarmonyOS' },
    { id: 2, title: 'ArkUI Basics', summary: 'Declarative UI in ArkUI' },
    { id: 3, title: 'ArkTS Language', summary: 'TypeScript for HarmonyOS' }
  ];

  build() {
    Column() {
      Text('Articles').fontSize(24).fontWeight(FontWeight.Bold).margin({ bottom: 16 })

      List({ space: 12 }) {
        ForEach(this.articles, (article: Article) => {
          ListItem() {
            Column() {
              Text(article.title)
                .fontSize(18)
                .fontWeight(FontWeight.Medium)
              Text(article.summary)
                .fontSize(14)
                .fontColor('#666666')
                .margin({ top: 4 })
            }
            .width('100%')
            .padding(16)
            .backgroundColor('#FFFFFF')
            .borderRadius(8)
            .onClick(() => {
              router.pushUrl({
                url: 'pages/ArticleDetail',
                params: { id: article.id, title: article.title, summary: article.summary }
              });
            })
          }
        }, (article: Article): string => `${article.id}`)
      }
      .width('100%')
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#F5F5F5')
  }
}
```

```typescript
// pages/ArticleDetail.ets
import router from '@ohos.router';

interface ArticleParams {
  id: number;
  title: string;
  summary: string;
}

@Entry
@Component
struct ArticleDetailPage {
  @State params: ArticleParams | null = null;

  aboutToAppear() {
    const raw = router.getParams();
    if (raw !== null && raw !== undefined) {
      this.params = raw as ArticleParams;
    }
  }

  build() {
    Column() {
      if (this.params !== null) {
        Text(this.params.title)
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 16 })

        Text(this.params.summary)
          .fontSize(16)
          .fontColor('#333333')
          .margin({ bottom: 24 })

        Text(`Article ID: ${this.params.id}`)
          .fontSize(12)
          .fontColor('#888888')

        Button('Back')
          .margin({ top: 32 })
          .onClick(() => {
            router.back();
          })
      } else {
        Text('Article not found').fontColor('#FF0000')
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .justifyContent(FlexAlign.Center)
  }
}
```

### 5.2 示例二:登录-首页-退出流程

展示登录成功后跳转首页,退出时清空栈的完整流程。

```typescript
// pages/Login.ets
import router from '@ohos.router';

@Entry
@Component
struct LoginPage {
  @State username: string = '';
  @State password: string = '';
  @State errorMessage: string = '';

  async login() {
    if (this.username.length === 0 || this.password.length === 0) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    try {
      // 模拟登录请求
      const user = await mockLogin(this.username, this.password);

      // 登录成功,使用 replaceUrl 跳转首页(用户无法返回登录页)
      await router.replaceUrl({
        url: 'pages/Home',
        params: { userId: user.id, userName: user.name }
      });
    } catch (e) {
      this.errorMessage = (e as Error).message;
    }
  }

  build() {
    Column() {
      Text('Login').fontSize(28).fontWeight(FontWeight.Bold).margin({ bottom: 32 })

      TextInput({ placeholder: 'Username', text: this.username })
        .onChange((v: string) => { this.username = v; })
        .margin({ bottom: 12 })

      TextInput({ placeholder: 'Password', text: this.password })
        .type(InputType.Password)
        .onChange((v: string) => { this.password = v; })
        .margin({ bottom: 12 })

      if (this.errorMessage.length > 0) {
        Text(this.errorMessage).fontColor('#FF0000').margin({ bottom: 12 })
      }

      Button('Login')
        .width('100%')
        .onClick(() => this.login())
    }
    .width('100%')
    .height('100%')
    .padding(24)
    .justifyContent(FlexAlign.Center)
  }
}

interface User { id: string; name: string; }

async function mockLogin(username: string, password: string): Promise<User> {
  return new Promise((resolve: (u: User) => void, reject: (e: Error) => void) => {
    setTimeout(() => {
      if (username === 'admin' && password === '123456') {
        resolve({ id: 'u-1', name: 'Admin' });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 500);
  });
}
```

```typescript
// pages/Home.ets
import router from '@ohos.router';

interface HomeParams {
  userId: string;
  userName: string;
}

@Entry
@Component
struct HomePage {
  @State params: HomeParams | null = null;

  aboutToAppear() {
    const raw = router.getParams();
    if (raw !== null && raw !== undefined) {
      this.params = raw as HomeParams;
    }
  }

  async logout() {
    // 清空路由栈,返回登录页
    // 使用 replaceUrl 替换为登录页,栈深度变为 1
    await router.replaceUrl({ url: 'pages/Login' });

    // 或者使用 router.clear() 清空栈后再跳转
    // router.clear();
    // await router.replaceUrl({ url: 'pages/Login' });
  }

  build() {
    Column() {
      Text(`Welcome, ${this.params ? this.params.userName : 'User'}`)
        .fontSize(24)
        .margin({ bottom: 32 })

      Button('View Profile')
        .width('100%')
        .margin({ bottom: 12 })
        .onClick(() => {
          router.pushUrl({
            url: 'pages/Profile',
            params: { userId: this.params ? this.params.userId : '' }
          });
        })

      Button('Settings')
        .width('100%')
        .margin({ bottom: 12 })
        .onClick(() => {
          router.pushUrl({ url: 'pages/Settings' }, router.RouterMode.Single);
        })

      Button('Logout')
        .width('100%')
        .backgroundColor('#FF4444')
        .onClick(() => this.logout())
    }
    .width('100%')
    .height('100%')
    .padding(24)
  }
}
```

### 5.3 示例三:返回指定页面

展示如何从深层页面返回到中间页面,而非逐层返回。

```typescript
// pages/Checkout.ets (结账流程的最后一页)
import router from '@ohos.router';

@Entry
@Component
struct CheckoutPage {
  async completeOrder() {
    // 模拟订单完成
    await mockCreateOrder();

    // 返回到首页,跳过中间的 Cart 和 Confirm 页面
    // 路由栈: [Home, Cart, Confirm, Checkout]
    // 执行后: [Home]
    router.back({ url: 'pages/Home' });
  }

  build() {
    Column() {
      Text('Checkout').fontSize(24)
      Button('Complete Order')
        .onClick(() => this.completeOrder())
    }
  }
}

async function mockCreateOrder(): Promise<void> {
  return new Promise((resolve: () => void) => {
    setTimeout(resolve, 500);
  });
}
```

### 5.4 示例四:Navigation 声明式路由

展示使用 `Navigation` 组件实现完整的多页面应用。

```typescript
@Entry
@Component
struct AppNav {
  private pathStack: NavPathStack = new NavPathStack();

  @Builder
  pageMap(name: string, param?: Record<string, unknown>) {
    if (name === 'home') {
      HomePageContent({ stack: this.pathStack })
    } else if (name === 'list') {
      ListPageContent({ stack: this.pathStack })
    } else if (name === 'detail') {
      DetailPageContent({ stack: this.pathStack, param: param as DetailParam })
    }
  }

  build() {
    Navigation(this.pathStack) {
      // 根页面内容
      HomePageContent({ stack: this.pathStack })
    }
    .navDestination(this.pageMap)
    .mode(NavigationMode.Stack)
    .titleMode(NavigationTitleMode.Mini)
  }
}

interface DetailParam { id: number; }

@Component
struct HomePageContent {
  private stack: NavPathStack = new NavPathStack();

  build() {
    Column() {
      Text('Home').fontSize(24)
      Button('Go to List')
        .onClick(() => {
          this.stack.pushPath({ name: 'list' });
        })
    }
  }
}

@Component
struct ListPageContent {
  private stack: NavPathStack = new NavPathStack();
  private items: Array<Record<string, number>> = [
    { id: 1 }, { id: 2 }, { id: 3 }
  ];

  build() {
    Column() {
      Text('List').fontSize(24)
      List() {
        ForEach(this.items, (item: Record<string, number>) => {
          ListItem() {
            Text(`Item ${item.id}`)
              .onClick(() => {
                this.stack.pushPath({
                  name: 'detail',
                  param: { id: item.id } as DetailParam
                });
              })
          }
        }, (item: Record<string, number>): string => `${item.id}`)
      }
    }
  }
}

@Component
struct DetailPageContent {
  private stack: NavPathStack = new NavPathStack();
  @Prop param: DetailParam | null = null;

  build() {
    Column() {
      Text(`Detail: ${this.param ? this.param.id : 'N/A'}`).fontSize(24)
      Button('Back')
        .onClick(() => { this.stack.pop(); })
    }
  }
}
```

## 6. 实战案例:电商应用路由架构

本节通过一个电商应用的完整路由架构,展示如何在实际项目中组织路由代码。

### 6.1 需求分析

一个典型电商应用包含以下页面:
- 启动页(Splash)
- 登录页(Login)
- 首页(Home,带底部 Tab)
- 商品列表(List)
- 商品详情(Detail)
- 购物车(Cart)
- 结账(Checkout)
- 订单详情(OrderDetail)
- 个人中心(Profile)
- 设置(Settings)

路由需求:
- 启动后判断登录状态,未登录跳转登录页
- 登录后使用 `replaceUrl` 进入首页,无法返回登录页
- 商品详情可被列表、订单、收藏等多个入口跳转
- 结账完成后清空购物车相关页面,返回首页
- 设置页使用 `Single` 模式避免重复创建

### 6.2 路由表设计

```typescript
// common/RouteTable.ets
export class RouteTable {
  static readonly SPLASH: string = 'pages/Splash';
  static readonly LOGIN: string = 'pages/Login';
  static readonly HOME: string = 'pages/Home';
  static readonly LIST: string = 'pages/List';
  static readonly DETAIL: string = 'pages/Detail';
  static readonly CART: string = 'pages/Cart';
  static readonly CHECKOUT: string = 'pages/Checkout';
  static readonly ORDER_DETAIL: string = 'pages/OrderDetail';
  static readonly PROFILE: string = 'pages/Profile';
  static readonly SETTINGS: string = 'pages/Settings';
}
```

### 6.3 路由管理器

```typescript
// common/RouterManager.ets
import router from '@ohos.router';
import { RouteTable } from './RouteTable';

export class RouterManager {
  static async push(url: string, params?: Record<string, unknown>): Promise<void> {
    try {
      await router.pushUrl({ url, params });
      console.log(`[Router] push: ${url}`);
    } catch (e) {
      console.error(`[Router] push failed: ${(e as Error).message}`);
      throw e;
    }
  }

  static async pushSingle(url: string, params?: Record<string, unknown>): Promise<void> {
    try {
      await router.pushUrl({ url, params }, router.RouterMode.Single);
      console.log(`[Router] pushSingle: ${url}`);
    } catch (e) {
      console.error(`[Router] pushSingle failed: ${(e as Error).message}`);
      throw e;
    }
  }

  static async replace(url: string, params?: Record<string, unknown>): Promise<void> {
    try {
      await router.replaceUrl({ url, params });
      console.log(`[Router] replace: ${url}`);
    } catch (e) {
      console.error(`[Router] replace failed: ${(e as Error).message}`);
      throw e;
    }
  }

  static back(url?: string): void {
    if (url) {
      router.back({ url });
      console.log(`[Router] back to: ${url}`);
    } else {
      router.back();
      console.log('[Router] back');
    }
  }

  static backToRoot(): void {
    router.back({ url: RouteTable.HOME });
    console.log('[Router] back to root');
  }

  static clear(): void {
    router.clear();
    console.log('[Router] stack cleared');
  }

  static getParams<T>(): T | null {
    const raw = router.getParams();
    if (raw === null || raw === undefined) return null;
    return raw as T;
  }

  static getStackDepth(): number {
    return router.getLength();
  }
}
```

### 6.4 启动流程

```typescript
// pages/Splash.ets
import { RouterManager } from '../common/RouterManager';
import { RouteTable } from '../common/RouteTable';

@Entry
@Component
struct SplashPage {
  async aboutToAppear() {
    // 模拟初始化(加载资源、检查更新等)
    await this.initializeApp();

    // 检查登录状态
    const isLoggedIn = await this.checkLoginStatus();

    if (isLoggedIn) {
      await RouterManager.replace(RouteTable.HOME);
    } else {
      await RouterManager.replace(RouteTable.LOGIN);
    }
  }

  private async initializeApp(): Promise<void> {
    return new Promise((resolve: () => void) => {
      setTimeout(resolve, 1000);
    });
  }

  private async checkLoginStatus(): Promise<boolean> {
    // 从 Preferences 读取 token
    return false;  // 简化示例
  }

  build() {
    Column() {
      Text('App Logo').fontSize(32)
      LoadingProgress().margin({ top: 16 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

### 6.5 商品详情页(支持多入口跳转)

```typescript
// pages/Detail.ets
import { RouterManager } from '../common/RouterManager';
import { RouteTable } from '../common/RouteTable';

interface DetailParams {
  productId: number;
  source: 'list' | 'order' | 'favorite' | 'search';
}

@Entry
@Component
struct ProductDetailPage {
  @State params: DetailParams | null = null;
  @State product: Product | null = null;
  @State loading: boolean = true;

  async aboutToAppear() {
    this.params = RouterManager.getParams<DetailParams>();
    if (this.params !== null) {
      this.product = await this.loadProduct(this.params.productId);
    }
    this.loading = false;
  }

  private async loadProduct(id: number): Promise<Product> {
    return new Promise((resolve: (p: Product) => void) => {
      setTimeout(() => {
        resolve({ id, name: `Product ${id}`, price: 99.9 });
      }, 300);
    });
  }

  async addToCart() {
    if (this.product === null) return;
    // 添加到购物车逻辑...

    // 跳转购物车(使用 Single 模式避免叠加)
    await RouterManager.pushSingle(RouteTable.CART, {
      from: 'detail',
      productId: this.product.id
    });
  }

  async buyNow() {
    if (this.product === null) return;
    await RouterManager.push(RouteTable.CHECKOUT, {
      productId: this.product.id,
      quantity: 1
    });
  }

  build() {
    Column() {
      if (this.loading) {
        LoadingProgress()
      } else if (this.product !== null) {
        Text(this.product.name).fontSize(24)
        Text(`¥${this.product.price}`).fontSize(20).fontColor('#FF6600')

        Row() {
          Button('Add to Cart').layoutWeight(1).onClick(() => this.addToCart())
          Button('Buy Now').layoutWeight(1).onClick(() => this.buyNow())
        }
        .margin({ top: 24 })
      }
    }
    .padding(16)
  }
}

interface Product { id: number; name: string; price: number; }
```

### 6.6 结账完成清空栈

```typescript
// pages/Checkout.ets
import { RouterManager } from '../common/RouterManager';
import { RouteTable } from '../common/RouteTable';

@Entry
@Component
struct CheckoutPage {
  async completeOrder() {
    // 模拟创建订单
    const orderId = await this.createOrder();

    // 跳转到订单详情(清空中间页面)
    // 栈变化: [Home, Cart, Checkout] -> [Home, OrderDetail]
    await RouterManager.replace(RouteTable.ORDER_DETAIL, {
      orderId
    });

    // 或返回首页
    // RouterManager.backToRoot();
  }

  private async createOrder(): Promise<string> {
    return new Promise((resolve: (id: string) => void) => {
      setTimeout(() => resolve('order-123'), 500);
    });
  }

  build() {
    Column() {
      Text('Checkout').fontSize(24)
      Button('Complete Order').onClick(() => this.completeOrder())
    }
    .padding(16)
  }
}
```

## 7. 进阶技巧

### 7.1 路由守卫

实现类似 Vue Router 的前置守卫,在跳转前进行权限检查。

```typescript
import router from '@ohos.router';

type GuardNext = (to: string, allow: boolean) => void;
type BeforeGuard = (to: string, from: string, next: GuardNext) => void;

class RouterGuard {
  private guards: BeforeGuard[] = [];
  private currentPath: string = '';

  beforeEach(guard: BeforeGuard): void {
    this.guards.push(guard);
  }

  async push(url: string, params?: Record<string, unknown>): Promise<void> {
    const from = this.currentPath;

    // 执行所有守卫
    for (const guard of this.guards) {
      const allowed = await this.runGuard(guard, url, from);
      if (!allowed) {
        console.log(`[Guard] Navigation to ${url} blocked`);
        return;
      }
    }

    await router.pushUrl({ url, params });
    this.currentPath = url;
  }

  private runGuard(guard: BeforeGuard, to: string, from: string): Promise<boolean> {
    return new Promise((resolve: (v: boolean) => void) => {
      guard(to, from, (_to: string, allow: boolean) => {
        resolve(allow);
      });
    });
  }
}

const guardRouter = new RouterGuard();

// 注册登录守卫
guardRouter.beforeEach((to: string, from: string, next: GuardNext) => {
  const authRequired = ['pages/Home', 'pages/Profile', 'pages/Settings'].includes(to);
  const isLoggedIn = checkLoginStatus();

  if (authRequired && !isLoggedIn) {
    // 重定向到登录页
    router.replaceUrl({ url: 'pages/Login' });
    next(to, false);
  } else {
    next(to, true);
  }
});

function checkLoginStatus(): boolean {
  return false;  // 简化
}

// 使用
guardRouter.push('pages/Home');
```

### 7.2 路由预加载

预加载即将跳转的页面资源,减少首次渲染耗时。

```typescript
import router from '@ohos.router';

class RoutePreloader {
  private preloadedPages: Set<string> = new Set();

  async preload(url: string): Promise<void> {
    if (this.preloadedPages.has(url)) return;

    // 通过隐藏的 Iframe 或后台创建组件实例预热
    // 简化示例:仅记录
    console.log(`[Preloader] Preloading ${url}`);
    this.preloadedPages.add(url);
  }

  async preloadBatch(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url: string) => this.preload(url)));
  }
}

const preloader = new RoutePreloader();

@Entry
@Component
struct ListPage {
  aboutToAppear() {
    // 预加载可能跳转的页面
    preloader.preloadBatch([
      'pages/Detail',
      'pages/Cart',
      'pages/Search'
    ]);
  }

  build() { /* ... */ }
}
```

### 7.3 深度链接

通过 URI scheme 或统一资源标识符从外部跳转到应用内特定页面。

```typescript
// 在 UIAbility 中处理 URI
import UIAbility from '@ohos.app.ability.UIAbility';
import Want from '@ohos.app.ability.Want';
import router from '@ohos.router';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want): void {
    // 解析 URI
    if (want.uri) {
      this.handleDeepLink(want.uri);
    }
  }

  onNewWant(want: Want): void {
    // 应用已在运行时,新的 URI 跳转
    if (want.uri) {
      this.handleDeepLink(want.uri);
    }
  }

  private handleDeepLink(uri: string): void {
    // 解析 URI: myapp://product/123
    const match = uri.match(/^myapp:\/\/(\w+)\/(\w+)$/);
    if (match === null) return;

    const [, page, id] = match;
    const routeMap: Record<string, string> = {
      'product': 'pages/Detail',
      'order': 'pages/OrderDetail',
      'profile': 'pages/Profile'
    };

    const url = routeMap[page];
    if (url) {
      router.pushUrl({ url, params: { id } });
    }
  }
}
```

### 7.4 路由跳转动画

自定义路由跳转动画,提升用户体验。

```typescript
import router from '@ohos.router';

// 自定义动画时长(毫秒)
router.pushUrl({
  url: 'pages/Detail',
  params: { id: 123 },
  // 动画配置(API 10+)
  animations: {
    duration: 300,
    curve: Curve.EaseInOut,
    direction: AnimationDirection.LeftToRight
  }
});
```

### 7.5 跨 Ability 路由

跨 UIAbility 跳转使用 `Want` 与 `startAbility`。

```typescript
import Want from '@ohos.app.ability.Want';
import common from '@ohos.app.ability.common';

async function startOtherAbility(context: common.UIAbilityContext) {
  const want: Want = {
    bundleName: 'com.example.app',
    abilityName: 'OtherAbility',
    parameters: {
      targetPage: 'pages/Detail',
      params: { id: 123 }
    }
  };

  await context.startAbility(want);
}
```

## 8. 性能优化

### 8.1 合理使用 `RouterMode.Single`

避免重复创建相同页面,减少内存占用与启动耗时。

```typescript
// 反例:Standard 模式导致栈堆积
router.pushUrl({ url: 'pages/Settings' });
// 用户多次点击设置入口,栈变为 [Home, Settings, Settings, Settings]

// 正例:Single 模式复用
router.pushUrl({ url: 'pages/Settings' }, router.RouterMode.Single);
// 栈变为 [Home, Settings]
```

### 8.2 路由栈深度控制

路由栈过深会消耗大量内存,需要主动清理。

```typescript
import router from '@ohos.router';

// 监控栈深度
function checkStackDepth(): void {
  const depth = router.getLength();
  if (depth > 10) {
    console.warn(`[Router] Stack too deep: ${depth}, consider clearing`);
    // 返回根页面或清空栈
    router.clear();
    router.pushUrl({ url: 'pages/Home' });
  }
}

// 在关键跳转后检查
router.pushUrl({ url: 'pages/Detail' }).then(() => {
  checkStackDepth();
});
```

### 8.3 参数大小优化

避免在路由参数中传递大对象,使用全局状态或本地存储替代。

```typescript
// 反例:通过路由参数传递大列表
router.pushUrl({
  url: 'pages/List',
  params: {
    items: hugeArray  // 10000+ 个对象
  }
});

// 正例:传递 ID,目标页面自行加载
router.pushUrl({
  url: 'pages/List',
  params: {
    categoryId: 123  // 仅传递必要标识
  }
});

// 目标页面 aboutToAppear 中加载
async aboutToAppear() {
  const params = router.getParams() as { categoryId: number };
  this.items = await fetchItems(params.categoryId);
}
```

### 8.4 避免在 `build()` 中执行路由跳转

`build()` 必须保持纯净,路由跳转应在事件回调中触发。

```typescript
// 反例:在 build 中执行路由跳转
@Entry
@Component
struct BadPage {
  build() {
    // 错误:build 中调用 pushUrl 会触发无限循环
    router.pushUrl({ url: 'pages/Other' });
    Text('Hello')
  }
}

// 正例:在事件回调中跳转
@Entry
@Component
struct GoodPage {
  build() {
    Button('Go')
      .onClick(() => {
        router.pushUrl({ url: 'pages/Other' });
      })
  }
}
```

### 8.5 LazyForEach 与路由跳转的协作

长列表中点击跳转时,确保点击事件正确绑定。

```typescript
@Entry
@Component
struct LongListPage {
  private data: MyData[] = Array.from({ length: 1000 }, (_, i: number): MyData => ({
    id: `${i}`,
    title: `Item ${i}`
  }));

  build() {
    List() {
      ForEach(this.data, (item: MyData) => {
        ListItem() {
          Row() {
            Text(item.title).layoutWeight(1)
          }
          .onClick(() => {
            router.pushUrl({
              url: 'pages/Detail',
              params: { id: item.id }
            });
          })
        }
      }, (item: MyData): string => item.id)
    }
  }
}

interface MyData { id: string; title: string; }
import router from '@ohos.router';
```

## 9. 调试排错

### 9.1 路由栈溢出

**症状**:`router.pushUrl` 抛出异常,提示栈满。

**原因**:HarmonyOS 路由栈最大深度默认为 32,超过会抛出错误。

**解决方案**:
1. 使用 `RouterMode.Single` 避免重复入栈
2. 定期使用 `router.clear()` 清理栈
3. 使用 `router.replaceUrl` 替代 `pushUrl` 控制栈深度

```typescript
import router from '@ohos.router';

// 检查栈深度
function safePush(url: string, params?: Record<string, unknown>): Promise<void> {
  const maxDepth = 32;
  if (router.getLength() >= maxDepth - 1) {
    // 栈接近上限,清理历史
    console.warn('[Router] Stack near limit, clearing');
    router.clear();
  }
  return router.pushUrl({ url, params });
}
```

### 9.2 参数丢失

**症状**:目标页面 `router.getParams()` 返回 `null` 或 `undefined`。

**排查清单**:
1. 源页面是否正确传递了 `params`
2. 参数对象是否可 JSON 序列化(无函数、循环引用)
3. 是否在 `aboutToAppear` 中读取(早期时机可能未注入)
4. 是否使用了 `replaceUrl` 且未传 `params`

```typescript
// 调试代码:打印参数
aboutToAppear() {
  const params = router.getParams();
  console.log(`[Debug] params: ${JSON.stringify(params)}`);
  console.log(`[Debug] params type: ${typeof params}`);

  if (params === null || params === undefined) {
    console.warn('[Debug] params is null/undefined');
    return;
  }

  // 类型断言后访问
  const typedParams = params as MyParams;
  console.log(`[Debug] id: ${typedParams.id}`);
}
```

### 9.3 页面白屏

**症状**:路由跳转后页面空白,无报错。

**可能原因**:
1. 目标页面未在 `main_pages.json` 中声明
2. 路径拼写错误(大小写敏感)
3. 目标页面 `build()` 抛出异常
4. 异步数据加载卡住,UI 未渲染

```typescript
// 调试技巧:在目标页面所有生命周期加日志
@Entry
@Component
struct DebugPage {
  aboutToAppear() {
    console.log('[DebugPage] aboutToAppear');
  }

  build() {
    console.log('[DebugPage] build');
    try {
      return Column() {
        Text('Hello')
      };
    } catch (e) {
      console.error(`[DebugPage] build error: ${(e as Error).message}`);
      throw e;
    }
  }

  onPageShow() {
    console.log('[DebugPage] onPageShow');
  }
}
```

### 9.4 返回键无效

**症状**:点击返回键无反应或行为异常。

**可能原因**:
1. `onBackPress` 返回了 `true` 但未实现自定义返回逻辑
2. 路由栈只有一层,无页面可返回
3. `router.back({ url })` 的 URL 不在栈中

```typescript
// 调试 onBackPress
@Entry
@Component
struct DebugBackPage {
  onBackPress(): boolean {
    console.log('[Debug] back pressed');
    console.log(`[Debug] stack depth: ${router.getLength()}`);

    // 如果栈深度为 1,直接退出应用
    if (router.getLength() <= 1) {
      console.log('[Debug] exit app');
      return false;  // 让系统处理(退出应用)
    }

    // 否则正常返回
    router.back();
    return true;
  }

  build() {
    Text('Press back')
  }
}

import router from '@ohos.router';
```

## 10. 最佳实践

### 10.1 路由设计原则

1. **单一入口**——所有跳转通过路由管理器,便于统一拦截与日志
2. **命名路由**——使用常量定义路径,避免硬编码字符串
3. **最小参数**——只传必要 ID,大对象用全局状态
4. **明确模式**——每个跳转明确使用 `pushUrl` 或 `replaceUrl`,避免混淆
5. **栈深度监控**——长流程定期清理栈

### 10.2 路由参数规范

```typescript
// 反例:参数无类型
router.pushUrl({
  url: 'pages/Detail',
  params: { id: 123, data: someObject }
});

// 正例:定义参数接口
interface DetailParams {
  id: number;
  data?: SomeObject;
}

router.pushUrl({
  url: 'pages/Detail',
  params: { id: 123 } as DetailParams
});

// 目标页面接收
@Entry
@Component
struct DetailPage {
  private params: DetailParams | null = null;

  aboutToAppear() {
    const raw = router.getParams();
    if (raw !== null && raw !== undefined) {
      this.params = raw as DetailParams;
    }
  }
}
```

### 10.3 模块化路由

将路由按业务模块拆分,便于团队协作。

```typescript
// modules/user/routes.ets
export class UserRoutes {
  static readonly LOGIN: string = 'pages/user/Login';
  static readonly PROFILE: string = 'pages/user/Profile';
  static readonly SETTINGS: string = 'pages/user/Settings';
}

// modules/product/routes.ets
export class ProductRoutes {
  static readonly LIST: string = 'pages/product/List';
  static readonly DETAIL: string = 'pages/product/Detail';
  static readonly SEARCH: string = 'pages/product/Search';
}

// modules/order/routes.ets
export class OrderRoutes {
  static readonly CART: string = 'pages/order/Cart';
  static readonly CHECKOUT: string = 'pages/order/Checkout';
  static readonly DETAIL: string = 'pages/order/OrderDetail';
}
```

### 10.4 路由跳转日志

在路由管理器中添加日志,便于调试与监控。

```typescript
export class RouterManager {
  static async push(url: string, params?: Record<string, unknown>): Promise<void> {
    const startTime = Date.now();
    try {
      await router.pushUrl({ url, params });
      const duration = Date.now() - startTime;
      console.log(`[Router] push ${url} (${duration}ms)`);
    } catch (e) {
      console.error(`[Router] push ${url} failed: ${(e as Error).message}`);
      throw e;
    }
  }
}
```

### 10.5 状态恢复

应用被系统杀死后重启,需恢复用户上次浏览的页面。

```typescript
import preferences from '@ohos.data.preferences';
import router from '@ohos.router';

class RouteStateSaver {
  private static readonly KEY = 'last_route';

  static async save(url: string, params?: Record<string, unknown>): Promise<void> {
    const context = getContext();
    const prefs = await preferences.getPreferences(context, 'route_state');
    await prefs.put(RouteStateSaver.KEY, JSON.stringify({ url, params }));
    await prefs.flush();
  }

  static async restore(): Promise<void> {
    const context = getContext();
    const prefs = await preferences.getPreferences(context, 'route_state');
    const saved = await prefs.get(RouteStateSaver.KEY, '') as string;
    if (saved.length === 0) return;

    const { url, params } = JSON.parse(saved);
    await router.replaceUrl({ url, params });
  }
}

// 在页面跳转时保存
router.pushUrl({ url: 'pages/Detail' }).then(() => {
  RouteStateSaver.save('pages/Detail');
});

// 应用启动时恢复
@Entry
@Component
struct SplashPage {
  async aboutToAppear() {
    await RouteStateSaver.restore();
  }

  build() {
    Text('Splash')
  }
}
```

## 11. 总结回顾

### 11.1 核心知识点回顾

1. **路由栈模型**——LIFO 结构,`pushUrl` 压栈、`back` 弹栈、`replaceUrl` 替换
2. **三种跳转方法**——`pushUrl`(可返回)、`replaceUrl`(不可返回)、`back`(返回)
3. **RouterMode**——`Standard`(每次新建)与 `Single`(单例复用)
4. **参数传递**——`params` 传递,`router.getParams()` 接收
5. **路由配置**——`main_pages.json` 声明所有可访问页面
6. **生命周期协作**——`pushUrl` 触发旧页面 `onPageHide` + 新页面 `aboutToAppear`
7. **Navigation 组件**——API 10+ 推荐的声明式路由方案
8. **命名路由**——通过常量定义路径,提升可维护性

### 11.2 速查表

| 场景 | 推荐方法 | 注意事项 |
| --- | --- | --- |
| 列表 → 详情 | `pushUrl` | 用户应能返回 |
| 登录 → 首页 | `replaceUrl` | 替换登录页,不可返回 |
| 返回上一页 | `back()` | 默认弹栈 |
| 返回指定页 | `back({ url })` | URL 必须在栈中 |
| 避免重复创建 | `RouterMode.Single` | 适用于设置页等 |
| 清空栈 | `router.clear()` | 仅保留当前页 |
| 跨 Ability 跳转 | `startAbility` | 使用 Want 传递参数 |
| 声明式路由 | `Navigation` 组件 | API 10+ 推荐 |
| 深度链接 | URI scheme | 在 UIAbility 中处理 |

### 11.3 常见错误清单

1. **路径拼写错误**——大小写敏感,必须与 `main_pages.json` 完全匹配
2. **参数不可序列化**——包含函数或循环引用导致丢失
3. **栈深度溢出**——超过 32 层会抛出异常
4. **`Single` 模式误用**——详情页不应使用 `Single`,否则无法查看不同内容
5. **`replaceUrl` 用于可返回场景**——用户期望返回但已被替换
6. **未在 `aboutToAppear` 读取参数**——`build()` 中读取可能为 null
7. **混淆 `router` 与 `Navigation`**——两套 API 不能混用
8. **跨 Ability 跳转使用 `router`**——应使用 `startAbility`
9. **返回键拦截忘记返回 `true`**——导致系统执行默认行为
10. **未清理路由栈**——长流程后栈过深,影响性能

### 11.4 进阶学习路径

1. **学习 Navigation 组件**——掌握声明式路由的高级用法
2. **研究 NavPathStack**——理解声明式路由的状态管理
3. **学习跨 Ability 通信**——掌握 Want 与 startAbility
4. **研究分布式路由**——跨设备路由跳转
5. **学习路由动画**——自定义转场动画

## 12. 参考资料

### 12.1 官方文档

1. **HarmonyOS Developer——Navigation and Routing**
   - Router API: `https://developer.harmonyos.com/cn/docs/router`
   - Navigation Component: `https://developer.harmonyos.com/cn/docs/navigation`

2. **API Reference**
   - `@ohos.router`
   - `@ohos.app.ability.Want`
   - `@ohos.app.ability.common`

### 12.2 推荐书籍

1. **《HarmonyOS 应用开发实战》**——华为专家团队著,包含完整路由章节
2. **《移动应用架构设计》**——对比各平台路由方案的设计哲学
3. **《声明式 UI 编程范式》**——理解命令式与声明式路由的取舍

### 12.3 相关章节

- **ArkUI 声明式语法**——理解 `@Entry`、`@Component` 等概念,路由基于这些基础
- **组件生命周期详解**——路由跳转触发生命周期变化的详细机制
- **权限申请**——部分页面跳转需要先检查权限
- **分布式数据管理**——跨设备路由需要协同分布式状态

### 12.4 练习题

#### 基础题

1. 解释 `pushUrl` 与 `replaceUrl` 在路由栈上的差异,各举一个适用场景。
2. `RouterMode.Single` 模式下,如果栈中已存在目标页面,栈会如何变化?
3. 路由参数传递有几种方式?各自的限制是什么?

#### 进阶题

4. 设计一个路由守卫系统,要求:
   - 未登录用户访问受保护页面时重定向到登录页
   - 登录成功后自动跳转回原目标页面
   - 支持多个守卫链式调用

5. 实现一个电商应用的完整路由流程,包括:
   - 启动页判断登录状态
   - 登录后使用 `replaceUrl` 进入首页
   - 商品详情可被多个入口跳转
   - 结账完成后清空栈返回首页

#### 高阶题

6. 分析以下代码存在的问题并修复:
   ```typescript
   @Entry
   @Component
   struct ProblemPage {
     aboutToAppear() {
       router.pushUrl({ url: 'pages/Other' });
     }
     build() {
       Text('Hello')
     }
   }
   ```

7. 比较命令式 `router` API 与声明式 `Navigation` 组件的优劣,说明何时选择哪种方案。

### 12.5 术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 路由 | Routing | 页面之间的跳转与堆栈管理机制 |
| 路由栈 | Route Stack | 维护页面历史的 LIFO 数据结构 |
| 压栈 | Push | 将新页面加入栈顶 |
| 弹栈 | Pop | 从栈顶移除页面 |
| 替换 | Replace | 替换栈顶页面,栈深度不变 |
| 命令式路由 | Imperative Routing | 通过 API 调用触发跳转 |
| 声明式路由 | Declarative Routing | 通过组件结构描述路由 |
| 命名路由 | Named Route | 通过名称而非路径引用页面 |
| 路由守卫 | Route Guard | 跳转前的拦截与权限检查 |
| 深度链接 | Deep Link | 通过 URI 从外部跳转到应用内页面 |
| 单例模式 | Single Mode | 栈中已存在则复用,避免重复创建 |
| 路由参数 | Route Params | 页面间传递的数据 |
| 跨 Ability 跳转 | Cross-Ability Navigation | 通过 Want 在不同 UIAbility 间跳转 |
