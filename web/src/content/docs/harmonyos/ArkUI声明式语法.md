---
order: 102
title: ArkUI声明式语法
module: harmonyos
category: 'dev-lang'
difficulty: advanced
description: 'HarmonyOS ArkUI声明式语法详解:@Component、@Entry、@State、@Prop、@Link。'
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/Stage模型与FA模型区别
  - harmonyos/ArkTS与TypeScript差异
  - harmonyos/组件生命周期详解
  - harmonyos/路由跳转与路由栈
prerequisites:
  - harmonyos/概述与环境搭建
---

# ArkUI 声明式语法详解

## 1. 概述与背景

### 1.1 声明式 UI 的演进历史

ArkUI 是 HarmonyOS 的官方 UI 框架,采用**声明式编程范式**(declarative paradigm)。要理解 ArkUI 的设计,需要回顾 UI 编程范式的演进历史。

**命令式 UI 范式**(imperative UI):传统 GUI 框架如 Swing、WinForms、Android View 系统采用命令式范式。开发者通过代码逐步创建控件、设置属性、添加到父容器、注册事件监听器。这种范式的问题在于:

- UI 状态与代码逻辑交织,难以追踪当前 UI 应该呈现什么样子
- 状态变更需要手动调用 `setText()`、`setVisibility()` 等方法刷新 UI
- 复杂界面下状态管理混乱,容易产生 UI 与数据不同步的 bug

**声明式 UI 范式**(declarative UI):现代 UI 框架如 React、Flutter、SwiftUI、Jetpack Compose 采用声明式范式。开发者**描述 UI 在任何给定状态下应该呈现的样子**,框架负责在状态变化时高效更新 UI。这种范式的核心思想可以用一个公式概括:

$$
UI = f(State)
$$

即 UI 是状态的函数。给定相同的状态,应该渲染出相同的 UI,无需关心"如何从旧 UI 变为新 UI"——这是框架的责任。

ArkUI 是华为在 HarmonyOS 上实现的声明式 UI 框架,设计上借鉴了 React、SwiftUI、Flutter 等框架的优点,同时针对 HarmonyOS 的多设备、分布式场景做了优化。ArkUI 与 ArkTS 深度集成,通过装饰器系统将声明式语法嵌入 ArkTS 语言中。

### 1.2 ArkUI 的设计目标

ArkUI 的设计目标可以概括为五点:

1. **开发效率**——通过声明式语法减少样板代码,让开发者专注于业务逻辑
2. **运行性能**——通过差分算法(diff algorithm)实现最小化 UI 更新
3. **跨设备一致性**——同一套代码适配手机、平板、手表、车机等不同设备
4. **状态可预测**——单向数据流保证状态变更可追溯、可调试
5. **类型安全**——与 ArkTS 类型系统深度集成,编译期捕获 UI 相关错误

### 1.3 与其他声明式框架的对比

下表对比 ArkUI 与主流声明式 UI 框架:

| 维度 | ArkUI | React | Flutter | SwiftUI |
| --- | --- | --- | --- | --- |
| 语言 | ArkTS | JavaScript/TS | Dart | Swift |
| UI 描述 | 链式调用 DSL | JSX | Widget 嵌套 | View 结果构建器 |
| 状态管理 | 装饰器(`@State`等) | `useState`/`useReducer` | `setState`/Provider | `@State`/`@Binding` |
| 跨平台 | HarmonyOS 全场景 | Web | iOS/Android/Web/Desktop | 仅 Apple 平台 |
| 编译方式 | AOT | JIT(运行时) | AOT | AOT |
| UI 树差异 | 静态(编译期生成) | 动态(运行时 VDOM) | 静态(Widget 树) | 静态 |

可以看到,ArkUI 在状态管理装饰器上与 SwiftUI 最为相似,在跨平台目标上与 Flutter 类似,在编译方式上与 SwiftUI、Flutter 一致采用 AOT。

## 2. 学习目标

完成本章学习后,读者应能够:

1. **概念层面**——理解声明式 UI 的核心思想,能够解释 ArkUI 的 `UI = f(State)` 模型
2. **语法层面**——熟练使用 `@Component`、`@Entry`、`@Builder`、`@Extend`、`@Styles` 等装饰器构建 UI
3. **状态层面**——掌握 `@State`、`@Prop`、`@Link`、`@Provide`、`@Consume`、`@Observed`、`@ObjectLink` 等状态管理装饰器的使用场景与区别
4. **布局层面**——能够使用 Column、Row、Flex、Grid、List 等容器组件构建复杂布局
5. **工程层面**——理解 ArkUI 的渲染流程与差分更新机制,能够优化 UI 性能

## 3. 前置知识

阅读本章前,建议读者具备以下基础:

- **ArkTS 基础**——已阅读"ArkTS 与 TypeScript 差异"章节,理解 `struct`、装饰器等概念
- **CSS 布局基础**——理解 flexbox、grid 等布局模型,有助于理解 ArkUI 的布局容器
- **面向对象设计**——理解组件复用、组合等设计原则
- **声明式 UI 经验**(可选)——若有 React、Flutter、SwiftUI 经验,理解会更深入

## 4. 核心概念

### 4.1 装饰器总览

ArkUI 的核心是装饰器系统。下表列出所有核心装饰器及其用途:

| 类别 | 装饰器 | 作用范围 | 用途 |
| --- | --- | --- | --- |
| 组件声明 | `@Component` | `struct` | 声明自定义组件 |
| 组件声明 | `@Entry` | `struct` | 标记页面入口组件 |
| UI 构建 | `@Builder` | 方法 | 抽取可复用 UI 片段 |
| UI 构建 | `@BuilderParam` | 字段 | 接收父组件传入的 UI 构建函数 |
| 样式 | `@Extend` | 全局函数 | 扩展内置组件样式 |
| 样式 | `@Styles` | 方法/全局函数 | 复用样式集合 |
| 状态(组件内) | `@State` | 字段 | 组件内部可变状态 |
| 状态(父→子) | `@Prop` | 字段 | 单向同步,父→子 |
| 状态(双向) | `@Link` | 字段 | 双向同步,父↔子 |
| 状态(跨层级) | `@Provide` | 字段 | 祖先提供数据 |
| 状态(跨层级) | `@Consume` | 字段 | 后代消费数据 |
| 状态(嵌套对象) | `@Observed` | `class` | 标记可观察类 |
| 状态(嵌套对象) | `@ObjectLink` | 字段 | 接收 `@Observed` 类实例 |
| 监听 | `@Watch` | 字段 | 监听状态变化 |
| 参数传递 | `@Require` | 字段 | 必传参数(API 10+) |

### 4.2 `@Component` 与 `@Entry`

`@Component` 装饰器用于声明一个 ArkUI 自定义组件。被装饰的 `struct` 必须实现 `build()` 方法,该方法返回 UI 描述。

```typescript
@Component
struct MyComponent {
  build() {
    Text('Hello, ArkUI!')
  }
}
```

`@Entry` 装饰器用于标记页面入口组件。一个 `.ets` 文件只能有一个 `@Entry` 组件,作为该页面的根组件被路由系统加载。

```typescript
@Entry
@Component
struct HomePage {
  build() {
    Column() {
      Text('Home Page')
      Button('Go to Detail')
    }
  }
}
```

`@Entry` 与 `@Component` 的区别:

- `@Entry` 标记的组件会被路由系统识别为页面入口,可通过 `router.pushUrl` 跳转
- `@Component` 仅声明自定义组件,可在其他组件中复用
- 一个页面文件可以包含多个 `@Component`,但只能有一个 `@Entry`

### 4.3 `build()` 方法与 UI 描述

`build()` 方法是组件的核心,返回 UI 描述。UI 描述由 ArkUI 内置组件(`Text`、`Button`、`Column`、`Row` 等)嵌套构成,采用链式调用配置样式与事件。

```typescript
@Entry
@Component
struct GreetingPage {
  @State name: string = 'World';

  build() {
    Column() {
      // 文本组件,通过链式调用设置样式
      Text(`Hello, ${this.name}!`)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .margin({ top: 20, bottom: 16 })

      // 按钮组件,通过 onClick 设置点击事件
      Button('Change Name')
        .width(200)
        .height(44)
        .backgroundColor('#007DFF')
        .fontColor('#FFFFFF')
        .onClick(() => {
          this.name = 'ArkUI';
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }
}
```

理解这个例子需要注意:

1. **`this` 指向组件实例**——在 `build()` 内部,`this.name` 访问组件的状态字段
2. **链式调用配置样式**——`.fontSize()`、`.fontWeight()` 等方法返回组件本身,允许链式调用
3. **容器组件**——`Column` 是垂直布局容器,其内部通过 `{ }` 包含子组件
4. **事件回调**——`.onClick(() => { ... })` 接收箭头函数作为点击回调
5. **状态驱动 UI**——`this.name` 变化时,`Text` 自动重新渲染

### 4.4 `@State` 状态管理

`@State` 是最基础的状态装饰器,用于声明组件内部的可变状态。当 `@State` 修饰的变量变化时,ArkUI 自动重新执行 `build()` 方法,刷新依赖该状态的 UI。

```typescript
@Entry
@Component
struct CounterPage {
  @State count: number = 0;

  build() {
    Column() {
      Text(`Count: ${this.count}`)
        .fontSize(32)

      Row() {
        Button('-')
          .onClick(() => {
            this.count--;
          })

        Button('+')
          .onClick(() => {
            this.count++;
          })
      }
    }
  }
}
```

`@State` 的关键特性:

1. **必须本地初始化**——`@State` 字段在声明时必须有初始值
2. **类型必须是基本类型或对象**——支持 `number`、`string`、`boolean`、`object`、`array`、`class` 实例
3. **变化检测**——基本类型通过值比较,对象/数组通过引用比较
4. **触发 UI 刷新**——变化时自动重新渲染依赖 UI

**对象与数组的不可变更新**:

```typescript
@Entry
@Component
struct TodoListPage {
  @State todos: Todo[] = [];
  @State user: User = { name: 'Alice', age: 30 };

  addTodo() {
    // 错误:直接修改数组,引用未变,UI 不刷新
    // this.todos.push({ id: 1, text: 'new', completed: false });

    // 正确:不可变更新,创建新数组
    this.todos = [...this.todos, { id: 1, text: 'new', completed: false }];
  }

  updateAge() {
    // 错误:直接修改属性,引用未变
    // this.user.age = 31;

    // 正确:创建新对象
    this.user = { ...this.user, age: 31 };
  }
}
```

### 4.5 `@Prop` 单向同步

`@Prop` 用于父子组件间的单向数据同步。父组件的状态变化会自动同步到子组件的 `@Prop` 字段,但子组件不能反向修改 `@Prop`。

```typescript
interface ParentData {
  title: string;
  count: number;
}

@Component
struct ChildComponent {
  @Prop title: string = '';      // 父→子单向同步
  @Prop count: number = 0;

  build() {
    Column() {
      Text(`Title: ${this.title}`)
      Text(`Count: ${this.count}`)

      // 错误:不能修改 @Prop
      // Button('Increment').onClick(() => this.count++)
    }
  }
}

@Entry
@Component
struct ParentComponent {
  @State title: string = 'Hello';
  @State count: number = 0;

  build() {
    Column() {
      // 父组件传递数据给子组件
      ChildComponent({ title: this.title, count: this.count })

      Button('Increment')
        .onClick(() => {
          this.count++;
        })

      Button('Change Title')
        .onClick(() => {
          this.title = 'World';
        })
    }
  }
}
```

`@Prop` 的特点:

- **单向数据流**——父组件是数据源,子组件是消费者
- **本地拷贝**——子组件接收的是父组件数据的拷贝,修改不影响父组件(但 `@Prop` 不允许修改)
- **类型必须匹配**——父组件传入的类型与子组件 `@Prop` 声明的类型必须一致
- **支持默认值**——`@Prop` 字段必须有默认值

### 4.6 `@Link` 双向同步

`@Link` 用于父子组件间的双向数据同步。父组件与子组件共享同一份数据,任一方修改都会反映到另一方。

```typescript
@Component
struct CounterChild {
  @Link count: number;   // 注意:@Link 不需要默认值

  build() {
    Button(`Count: ${this.count}`)
      .onClick(() => {
        this.count++;   // 子组件可以修改,父组件会同步
      })
  }
}

@Entry
@Component
struct CounterParent {
  @State count: number = 0;

  build() {
    Column() {
      Text(`Parent count: ${this.count}`)

      // 注意:传递 @Link 时使用 $ 前缀
      CounterChild({ count: $count })

      Button('Reset')
        .onClick(() => {
          this.count = 0;
        })
    }
  }
}
```

`@Link` 的特点:

- **双向绑定**——父子任一方修改,另一方自动同步
- **无需默认值**——`@Link` 字段声明时不需要初始值,值来自父组件
- **使用 `$` 前缀传值**——父组件传递时使用 `$变量名` 而非 `变量名`,表示传引用
- **类型必须匹配**——父组件的 `@State` 类型与子组件 `@Link` 类型必须一致

### 4.7 `@Provide` 与 `@Consume` 跨层级共享

当组件嵌套层级较深时,通过 `@Prop`/`@Link` 逐层传递数据会变得繁琐。`@Provide` 与 `@Consume` 允许祖先组件与后代组件跨层级共享数据。

```typescript
// 祖先组件
@Entry
@Component
struct GrandParent {
  @Provide theme: string = 'light';   // 提供数据

  build() {
    Column() {
      MiddleComponent()
      Button('Toggle Theme')
        .onClick(() => {
          this.theme = this.theme === 'light' ? 'dark' : 'light';
        })
    }
  }
}

// 中间组件(不感知 theme)
@Component
struct MiddleComponent {
  build() {
    Column() {
      DeepChild()    // 不需要传递 theme
    }
  }
}

// 后代组件
@Component
struct DeepChild {
  @Consume theme: string;   // 消费数据,自动向上查找

  build() {
    Text(`Current theme: ${this.theme}`)
      .backgroundColor(this.theme === 'light' ? '#FFFFFF' : '#333333')
  }
}
```

`@Provide`/`@Consume` 的特点:

- **跨层级传递**——祖先 `@Provide` 提供的数据,任意层级的后代都可通过 `@Consume` 获取
- **同名匹配**——通过变量名匹配,祖先 `@Provide theme` 与后代 `@Consume theme` 自动关联
- **双向同步**——后代修改 `@Consume`,祖先的 `@Provide` 也会同步
- **慎用**——过度使用会破坏组件封装性,建议仅用于全局性数据(主题、语言、用户信息)

### 4.8 `@Builder` 与 `@BuilderParam`

`@Builder` 用于抽取可复用的 UI 片段,类似 React 中的"渲染函数"或 SwiftUI 中的 `@ViewBuilder`。

```typescript
@Entry
@Component
struct BuilderExample {
  @State items: string[] = ['Apple', 'Banana', 'Cherry'];

  // @Builder 方法:可复用的 UI 片段
  @Builder
  ItemBuilder(name: string, index: number) {
    Row() {
      Text(`${index + 1}.`)
        .width(40)
        .fontColor('#888')

      Text(name)
        .fontSize(16)

      Blank()   // 弹性空白,推开后续内容

      Button('Delete')
        .fontSize(12)
        .onClick(() => {
          this.items = this.items.filter((item: string, i: number): boolean => i !== index);
        })
    }
    .width('100%')
    .padding(12)
  }

  build() {
    Column() {
      // 调用 @Builder 方法
      ForEach(this.items, (item: string, index: number) => {
        this.ItemBuilder(item, index)
      }, (item: string): string => item)
    }
  }
}
```

`@BuilderParam` 用于让父组件向子组件传入 UI 构建函数,实现"插槽"功能:

```typescript
@Component
struct Card {
  @BuilderProp header: () => void = this.defaultHeader;   // 接收外部传入的 UI
  @State title: string = 'Default Title';

  @Builder
  defaultHeader() {
    Text(this.title)
  }

  build() {
    Column() {
      this.header()   // 渲染传入的 UI
      Column() {
        // 卡片内容
      }
      .padding(16)
    }
    .backgroundColor('#FFFFFF')
    .borderRadius(8)
  }
}

@Entry
@Component
struct CardPage {
  @Builder
  customHeader() {
    Row() {
      Image($r('app.media.icon'))
        .width(24)
        .height(24)
      Text('Custom Header')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
    }
  }

  build() {
    Column() {
      // 使用默认 header
      Card()

      // 传入自定义 header
      Card({
        header: (): void => {
          this.customHeader()
        }
      })
    }
  }
}
```

### 4.9 `@Extend` 与 `@Styles`

`@Extend` 用于扩展内置组件的样式,封装复用:

```typescript
// @Extend:扩展 Text 组件的样式
@Extend(Text)
function emphasisText(text: string) {
  .fontSize(18)
  .fontColor('#FF0000')
  .fontWeight(FontWeight.Bold)
  .letterSpacing(1.5)
}

@Entry
@Component
struct ExtendExample {
  build() {
    Column() {
      Text('Important')
        .emphasisText('')   // 应用扩展样式

      Text('Warning')
        .emphasisText('')
    }
  }
}
```

`@Styles` 用于复用一组样式,可应用于任何组件:

```typescript
// @Styles:复用样式集合
@Styles
function cardStyle() {
  .backgroundColor('#FFFFFF')
  .borderRadius(8)
  .padding(16)
  .shadow({ radius: 8, color: 'rgba(0,0,0,0.1)', offsetX: 0, offsetY: 2 })
}

@Entry
@Component
struct StylesExample {
  build() {
    Column() {
      Column() {
        Text('Card 1')
      }
      .cardStyle()    // 应用样式集合

      Column() {
        Text('Card 2')
      }
      .cardStyle()
    }
  }
}
```

`@Extend` 与 `@Styles` 的区别:

| 维度 | `@Extend` | `@Styles` |
| --- | --- | --- |
| 作用对象 | 特定组件(如 `Text`) | 任何组件 |
| 参数支持 | 支持参数 | 不支持参数 |
| 复用范围 | 单一组件样式 | 通用样式集合 |
| 使用场景 | 组件特有样式 | 跨组件通用样式 |

### 4.10 `@Watch` 状态监听

`@Watch` 用于监听状态变化,在状态变化时执行副作用。

```typescript
@Entry
@Component
struct WatchExample {
  @State @Watch('onCountChange') count: number = 0;
  @State doubled: number = 0;

  // 状态变化时的回调
  onCountChange(propName: string): void {
    console.log(`${propName} changed from ${this.count - 1} to ${this.count}`);
    this.doubled = this.count * 2;
  }

  build() {
    Column() {
      Text(`Count: ${this.count}`)
      Text(`Doubled: ${this.doubled}`)

      Button('Increment')
        .onClick(() => {
          this.count++;
        })
    }
  }
}
```

`@Watch` 的特点:

- **回调签名**——`(propName: string) => void`,`propName` 是变化的字段名
- **触发时机**——状态变化后,UI 重新渲染前
- **不应用于派生状态**——派生状态应使用 `@Computed`(若可用)或在 `build()` 中计算
- **慎用副作用**——避免在 `@Watch` 回调中执行异步操作或修改其他状态

### 4.11 `@Observed` 与 `@ObjectLink`

`@Observed` 与 `@ObjectLink` 用于处理嵌套对象的响应式更新。当 `@State` 修饰的对象包含嵌套对象数组时,直接修改嵌套对象的属性不会触发 UI 刷新。`@Observed` + `@ObjectLink` 解决了这个问题。

```typescript
// 标记可观察类
@Observed
class TodoItem {
  public text: string;
  public completed: boolean;

  constructor(text: string, completed: boolean = false) {
    this.text = text;
    this.completed = completed;
  }

  toggle(): void {
    this.completed = !this.completed;
  }
}

// 子组件接收 @Observed 类实例
@Component
struct TodoItemView {
  @ObjectLink item: TodoItem;   // 接收可观察对象

  build() {
    Row() {
      Checkbox()
        .select(this.item.completed)
        .onChange((value: boolean) => {
          this.item.toggle();   // 直接修改,UI 自动刷新
        })

      Text(this.item.text)
        .decoration({
          type: this.item.completed ? TextDecorationType.LineThrough : TextDecorationType.None
        })
    }
  }
}

@Entry
@Component
struct TodoListPage {
  @State todos: TodoItem[] = [
    new TodoItem('Learn ArkUI'),
    new TodoItem('Build an app'),
    new TodoItem('Ship to AppGallery')
  ];

  build() {
    Column() {
      ForEach(this.todos, (todo: TodoItem) => {
        TodoItemView({ item: todo })
      }, (todo: TodoItem): string => todo.text)
    }
  }
}
```

`@Observed` + `@ObjectLink` 的工作原理:

1. `@Observed` 装饰的类实例会被代理(proxy),所有属性访问与修改都被追踪
2. `@ObjectLink` 接收 `@Observed` 实例,在子组件中建立响应式依赖
3. 修改嵌套对象的属性时,代理触发依赖刷新,子组件 UI 自动更新

### 4.12 `if/else` 与 `ForEach` 控制流

ArkUI 在 `build()` 方法中支持 `if/else` 条件渲染与 `ForEach` 列表渲染:

```typescript
@Entry
@Component
struct ControlFlowExample {
  @State isLoading: boolean = true;
  @State items: string[] = ['A', 'B', 'C'];
  @State isLoggedIn: boolean = false;

  build() {
    Column() {
      // if/else 条件渲染
      if (this.isLoading) {
        LoadingProgress()
          .width(48)
          .height(48)
      } else if (this.isLoggedIn) {
        Text('Welcome back!')
      } else {
        Column() {
          Text('Please log in')
          Button('Login')
        }
      }

      // ForEach 列表渲染
      ForEach(this.items, (item: string, index: number) => {
        Text(`${index}: ${item}`)
      }, (item: string): string => item)
    }
  }
}
```

注意:

- `if/else` 必须在 `build()` 内的容器组件中使用,不能直接在 `build()` 顶层使用
- `ForEach` 必须提供 `keyGenerator`(第三个参数),用于 diff 算法识别项的唯一性
- `keyGenerator` 返回的字符串必须是稳定的(同一项始终返回相同 key)

## 5. 代码示例

### 5.1 示例一:基础计数器

```typescript
@Entry
@Component
struct Counter {
  @State count: number = 0;
  @State step: number = 1;

  build() {
    Column() {
      // 显示当前值
      Text(`${this.count}`)
        .fontSize(48)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 20 })

      // 步长控制
      Row() {
        Text('Step:')
          .margin({ right: 8 })

        Button('-')
          .width(40)
          .onClick(() => {
            if (this.step > 1) {
              this.step--;
            }
          })

        Text(`${this.step}`)
          .width(60)
          .textAlign(TextAlign.Center)

        Button('+')
          .width(40)
          .onClick(() => {
            this.step++;
          })
      }
      .margin({ bottom: 20 })

      // 增减按钮
      Row() {
        Button('-')
          .width(80)
          .onClick(() => {
            this.count -= this.step;
          })

        Button('Reset')
          .width(80)
          .backgroundColor('#888888')
          .onClick(() => {
            this.count = 0;
          })

        Button('+')
          .width(80)
          .onClick(() => {
            this.count += this.step;
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

### 5.2 示例二:表单输入

```typescript
interface FormData {
  username: string;
  email: string;
  age: number;
  agreeTerms: boolean;
}

@Entry
@Component
struct FormPage {
  @State form: FormData = {
    username: '',
    email: '',
    age: 0,
    agreeTerms: false
  };
  @State errors: Record<string, string> = {};

  validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (this.form.username.length < 3) {
      newErrors.username = '用户名至少 3 个字符';
    }

    if (!this.form.email.includes('@')) {
      newErrors.email = '邮箱格式不正确';
    }

    if (this.form.age < 18 || this.form.age > 120) {
      newErrors.age = '年龄必须在 18-120 之间';
    }

    if (!this.form.agreeTerms) {
      newErrors.agreeTerms = '必须同意条款';
    }

    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  submit(): void {
    if (this.validate()) {
      console.info('Form submitted:', JSON.stringify(this.form));
      // 实际项目中此处调用 API
    }
  }

  build() {
    Column() {
      TextInput({ text: this.form.username, placeholder: '用户名' })
        .onChange((value: string) => {
          this.form = { ...this.form, username: value };
        })

      if (this.errors.username) {
        Text(this.errors.username)
          .fontColor('#FF0000')
          .fontSize(12)
      }

      TextInput({ text: this.form.email, placeholder: '邮箱' })
        .onChange((value: string) => {
          this.form = { ...this.form, email: value };
        })

      if (this.errors.email) {
        Text(this.errors.email)
          .fontColor('#FF0000')
          .fontSize(12)
      }

      TextInput({ text: this.form.age.toString(), placeholder: '年龄' })
        .type(InputType.Number)
        .onChange((value: string) => {
          const num: number = parseInt(value, 10) || 0;
          this.form = { ...this.form, age: num };
        })

      if (this.errors.age) {
        Text(this.errors.age)
          .fontColor('#FF0000')
          .fontSize(12)
      }

      Row() {
        Checkbox()
          .select(this.form.agreeTerms)
          .onChange((value: boolean) => {
            this.form = { ...this.form, agreeTerms: value };
          })

        Text('我同意服务条款')
      }

      if (this.errors.agreeTerms) {
        Text(this.errors.agreeTerms)
          .fontColor('#FF0000')
          .fontSize(12)
      }

      Button('Submit')
        .margin({ top: 20 })
        .onClick(() => {
          this.submit();
        })
    }
    .padding(20)
  }
}
```

### 5.3 示例三:列表与详情

```typescript
interface Article {
  id: number;
  title: string;
  summary: string;
  content: string;
}

@Entry
@Component
struct ArticleListPage {
  @State articles: Article[] = [
    {
      id: 1,
      title: 'ArkUI 入门',
      summary: '了解 ArkUI 基础概念',
      content: 'ArkUI 是 HarmonyOS 的 UI 框架...'
    },
    {
      id: 2,
      title: '状态管理详解',
      summary: '深入 @State、@Prop、@Link',
      content: '状态管理是声明式 UI 的核心...'
    },
    {
      id: 3,
      title: '性能优化技巧',
      summary: '如何写出高性能 ArkUI 代码',
      content: '性能优化需要从渲染、内存、CPU 三个维度...'
    }
  ];
  @State selectedArticle: Article | null = null;

  @Builder
  ArticleCard(article: Article) {
    Column() {
      Text(article.title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)

      Text(article.summary)
        .fontSize(14)
        .fontColor('#666')
        .margin({ top: 4 })

      Text('阅读全文 →')
        .fontSize(12)
        .fontColor('#007DFF')
        .margin({ top: 8 })
    }
    .padding(16)
    .backgroundColor('#FFFFFF')
    .borderRadius(8)
    .margin({ bottom: 8 })
    .onClick(() => {
      this.selectedArticle = article;
    })
  }

  @Builder
  ArticleDetail(article: Article) {
    Column() {
      Text(article.title)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 16 })

      Text(article.content)
        .fontSize(16)
        .lineHeight(24)

      Button('返回列表')
        .margin({ top: 24 })
        .onClick(() => {
          this.selectedArticle = null;
        })
    }
    .padding(16)
  }

  build() {
    Column() {
      if (this.selectedArticle !== null) {
        this.ArticleDetail(this.selectedArticle)
      } else {
        ForEach(this.articles, (article: Article) => {
          this.ArticleCard(article)
        }, (article: Article): string => article.id.toString())
      }
    }
    .padding(16)
  }
}
```

### 5.4 示例四:主题切换

```typescript
interface Theme {
  background: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}

@Entry
@Component
struct ThemePage {
  @Provide theme: Theme = {
    background: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#666666',
    accent: '#007DFF'
  };

  @State isDark: boolean = false;

  toggleTheme(): void {
    if (this.isDark) {
      this.theme = {
        background: '#FFFFFF',
        textPrimary: '#333333',
        textSecondary: '#666666',
        accent: '#007DFF'
      };
    } else {
      this.theme = {
        background: '#1A1A1A',
        textPrimary: '#FFFFFF',
        textSecondary: '#AAAAAA',
        accent: '#0A84FF'
      };
    }
    this.isDark = !this.isDark;
  }

  build() {
    Column() {
      Text('主题切换示例')
        .fontSize(24)
        .fontColor(this.theme.textPrimary)
        .margin({ bottom: 20 })

      ThemeCard({ title: '卡片 1', content: '这是卡片内容' })
      ThemeCard({ title: '卡片 2', content: '这是另一个卡片' })

      Button(this.isDark ? '切换到亮色' : '切换到暗色')
        .backgroundColor(this.theme.accent)
        .fontColor('#FFFFFF')
        .margin({ top: 20 })
        .onClick(() => {
          this.toggleTheme();
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.background)
    .padding(20)
  }
}

@Component
struct ThemeCard {
  @Consume theme: Theme;

  @Prop title: string = '';
  @Prop content: string = '';

  build() {
    Column() {
      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.textPrimary)

      Text(this.content)
        .fontSize(14)
        .fontColor(this.theme.textSecondary)
        .margin({ top: 4 })
    }
    .width('100%')
    .padding(16)
    .backgroundColor(this.theme.background)
    .borderRadius(8)
    .margin({ bottom: 12 })
  }
}
```

## 6. 实战案例

### 6.1 案例:完整的待办事项应用

这个案例综合运用所有装饰器,构建一个完整的待办事项应用。

```typescript
// 数据模型
@Observed
class Todo {
  public id: number;
  public text: string;
  public completed: boolean;
  public priority: Priority;
  public createdAt: number;

  constructor(id: number, text: string, priority: Priority = Priority.Medium) {
    this.id = id;
    this.text = text;
    this.completed = false;
    this.priority = priority;
    this.createdAt = Date.now();
  }

  toggle(): void {
    this.completed = !this.completed;
  }
}

enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High'
}

enum FilterType {
  All = 'All',
  Active = 'Active',
  Completed = 'Completed'
}

// 主题
interface AppTheme {
  primary: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  completedColor: string;
}

// 待办项视图组件
@Component
struct TodoItemView {
  @ObjectLink todo: Todo;
  @Link toggleTodo: (id: number) => void;
  @Link deleteTodo: (id: number) => void;
  @Consume theme: AppTheme;

  @Builder
  PriorityBadge() {
    Text(this.todo.priority)
      .fontSize(10)
      .fontColor('#FFFFFF')
      .backgroundColor(this.getPriorityColor())
      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
      .borderRadius(4)
  }

  getPriorityColor(): string {
    switch (this.todo.priority) {
      case Priority.High:
        return '#FF3B30';
      case Priority.Medium:
        return '#FF9500';
      case Priority.Low:
        return '#34C759';
      default:
        return '#888888';
    }
  }

  build() {
    Row() {
      // 复选框
      Checkbox()
        .select(this.todo.completed)
        .onChange(() => {
          this.toggleTodo(this.todo.id);
        })

      // 优先级
      this.PriorityBadge()

      // 文本
      Column() {
        Text(this.todo.text)
          .fontSize(16)
          .fontColor(this.todo.completed ? this.theme.completedColor : this.theme.textPrimary)
          .decoration({
            type: this.todo.completed ? TextDecorationType.LineThrough : TextDecorationType.None
          })

        Text(new Date(this.todo.createdAt).toLocaleString())
          .fontSize(11)
          .fontColor(this.theme.textSecondary)
          .margin({ top: 2 })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: 8 })

      // 删除按钮
      Button('×')
        .fontSize(18)
        .fontColor(this.theme.textSecondary)
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
        .onClick(() => {
          this.deleteTodo(this.todo.id);
        })
    }
    .width('100%')
    .padding(12)
    .backgroundColor(this.theme.cardBackground)
    .borderRadius(8)
    .margin({ bottom: 8 })
  }
}

// 过滤器组件
@Component
struct FilterBar {
  @Prop current: FilterType;
  @Link onFilterChange: (filter: FilterType) => void;
  @Consume theme: AppTheme;

  @Builder
  FilterButton(label: string, filter: FilterType) {
    Button(label)
      .fontSize(13)
      .backgroundColor(this.current === filter ? this.theme.primary : this.theme.cardBackground)
      .fontColor(this.current === filter ? '#FFFFFF' : this.theme.textSecondary)
      .padding({ left: 12, right: 12, top: 6, bottom: 6 })
      .borderRadius(16)
      .margin({ right: 8 })
      .onClick(() => {
        this.onFilterChange(filter);
      })
  }

  build() {
    Row() {
      this.FilterButton('全部', FilterType.All)
      this.FilterButton('未完成', FilterType.Active)
      this.FilterButton('已完成', FilterType.Completed)
    }
    .width('100%')
    .margin({ bottom: 12 })
  }
}

// 统计信息组件
@Component
struct StatsBar {
  @Prop total: number;
  @Prop completed: number;
  @Prop active: number;
  @Consume theme: AppTheme;

  build() {
    Row() {
      Column() {
        Text(`${this.total}`)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.textPrimary)
        Text('总数')
          .fontSize(11)
          .fontColor(this.theme.textSecondary)
      }
      .layoutWeight(1)

      Column() {
        Text(`${this.active}`)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#FF9500')
        Text('未完成')
          .fontSize(11)
          .fontColor(this.theme.textSecondary)
      }
      .layoutWeight(1)

      Column() {
        Text(`${this.completed}`)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#34C759')
        Text('已完成')
          .fontSize(11)
          .fontColor(this.theme.textSecondary)
      }
      .layoutWeight(1)
    }
    .width('100%')
    .padding(12)
    .backgroundColor(this.theme.cardBackground)
    .borderRadius(8)
    .margin({ bottom: 12 })
  }
}

// 输入区组件
@Component
struct InputBar {
  @State text: string = '';
  @State priority: Priority = Priority.Medium;
  @Link onAdd: (text: string, priority: Priority) => void;
  @Consume theme: AppTheme;

  build() {
    Column() {
      TextInput({ text: this.text, placeholder: '添加新待办...' })
        .width('100%')
        .onChange((value: string) => {
          this.text = value;
        })

      Row() {
        ForEach([Priority.Low, Priority.Medium, Priority.High], (p: Priority) => {
          Button(p)
            .fontSize(12)
            .backgroundColor(this.priority === p ? this.theme.primary : this.theme.cardBackground)
            .fontColor(this.priority === p ? '#FFFFFF' : this.theme.textSecondary)
            .padding({ left: 10, right: 10, top: 4, bottom: 4 })
            .borderRadius(12)
            .margin({ right: 8 })
            .onClick(() => {
              this.priority = p;
            })
        }, (p: Priority): string => p)

        Blank()

        Button('添加')
          .backgroundColor(this.theme.primary)
          .fontColor('#FFFFFF')
          .fontSize(14)
          .padding({ left: 16, right: 16, top: 6, bottom: 6 })
          .borderRadius(16)
          .onClick(() => {
            if (this.text.trim().length > 0) {
              this.onAdd(this.text.trim(), this.priority);
              this.text = '';
              this.priority = Priority.Medium;
            }
          })
      }
      .width('100%')
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(12)
    .backgroundColor(this.theme.cardBackground)
    .borderRadius(8)
    .margin({ bottom: 12 })
  }
}

// 主页面
@Entry
@Component
struct TodoApp {
  @Provide theme: AppTheme = {
    primary: '#007DFF',
    background: '#F2F2F7',
    cardBackground: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    completedColor: '#C7C7CC'
  };

  @State todos: Todo[] = [];
  @State filter: FilterType = FilterType.All;
  @State nextId: number = 1;

  // 添加待办
  addTodo(text: string, priority: Priority): void {
    const newTodo: Todo = new Todo(this.nextId, text, priority);
    this.todos = [newTodo, ...this.todos];
    this.nextId++;
  }

  // 切换完成状态
  toggleTodo(id: number): void {
    this.todos = this.todos.map((todo: Todo): Todo => {
      if (todo.id === id) {
        todo.toggle();
      }
      return todo;
    });
  }

  // 删除待办
  deleteTodo(id: number): void {
    this.todos = this.todos.filter((todo: Todo): boolean => todo.id !== id);
  }

  // 切换过滤器
  onFilterChange(filter: FilterType): void {
    this.filter = filter;
  }

  // 根据过滤器获取待办列表
  getFilteredTodos(): Todo[] {
    switch (this.filter) {
      case FilterType.Active:
        return this.todos.filter((todo: Todo): boolean => !todo.completed);
      case FilterType.Completed:
        return this.todos.filter((todo: Todo): boolean => todo.completed);
      default:
        return this.todos;
    }
  }

  build() {
    Column() {
      Text('待办事项')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.textPrimary)
        .margin({ top: 16, bottom: 16 })

      StatsBar({
        total: this.todos.length,
        completed: this.todos.filter((t: Todo): boolean => t.completed).length,
        active: this.todos.filter((t: Todo): boolean => !t.completed).length
      })

      InputBar({
        onAdd: (text: string, priority: Priority): void => {
          this.addTodo(text, priority);
        }
      })

      FilterBar({
        current: this.filter,
        onFilterChange: (filter: FilterType): void => {
          this.onFilterChange(filter);
        }
      })

      // 列表
      if (this.getFilteredTodos().length === 0) {
        Column() {
          Text(this.filter === FilterType.Completed ? '暂无已完成项' : '暂无待办,开始添加吧')
            .fontColor(this.theme.textSecondary)
            .fontSize(16)
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      } else {
        List() {
          ForEach(this.getFilteredTodos(), (todo: Todo) => {
            ListItem() {
              TodoItemView({
                todo: todo,
                toggleTodo: (id: number): void => {
                  this.toggleTodo(id);
                },
                deleteTodo: (id: number): void => {
                  this.deleteTodo(id);
                }
              })
            }
          }, (todo: Todo): string => todo.id.toString())
        }
        .width('100%')
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.background)
    .padding(16)
  }
}
```

这个综合案例展示了:

- `@Observed` + `@ObjectLink`:处理 `Todo` 类的响应式嵌套对象
- `@State`:管理本地状态(todos、filter、nextId)
- `@Prop`:子组件接收父组件传入的只读数据(current、total 等)
- `@Link`:子组件接收回调函数(toggleTodo、deleteTodo 等)
- `@Provide` + `@Consume`:跨层级共享主题数据
- `@Builder`:抽取可复用 UI 片段(PriorityBadge、FilterButton)
- `if/else` + `ForEach`:条件渲染与列表渲染

## 7. 进阶技巧

### 7.1 自定义组件的复用

通过 `@Reusable` 装饰器(API 10+)标记可复用的组件,优化列表性能:

```typescript
@Reusable
@Component
struct ExpensiveItem {
  @Prop item: ItemData;

  aboutToReuse(params: Record<string, unknown>): void {
    // 组件被复用前的清理逻辑
    console.log('Item reused');
  }

  build() {
    // 复杂 UI...
  }
}
```

`@Reusable` 让 ArkUI 在列表滚动时复用已存在的组件实例,而不是销毁重建,显著提升长列表性能。

### 7.2 自定义绘制组件

通过 `@Component` + `Canvas` 实现自定义绘制:

```typescript
@Component
struct CustomChart {
  @Prop data: number[];

  build() {
    Canvas(this.canvasContext)
      .width('100%')
      .height(200)
      .onReady(() => {
        this.drawChart();
      })
  }

  private canvasContext: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true));

  private drawChart(): void {
    const ctx = this.canvasContext;
    const width = 300;
    const height = 200;
    const barWidth = width / this.data.length - 10;

    ctx.clearRect(0, 0, width, height);

    this.data.forEach((value: number, index: number) => {
      const barHeight = (value / Math.max(...this.data)) * height;
      const x = index * (barWidth + 10);
      const y = height - barHeight;

      ctx.fillStyle = '#007DFF';
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }
}
```

### 7.3 动画与过渡

ArkUI 提供丰富的动画 API:

```typescript
@Entry
@Component
struct AnimationExample {
  @State scale: number = 1;
  @State rotate: number = 0;
  @State opacity: number = 1;

  build() {
    Column() {
      // 显式动画
      Image($r('app.media.icon'))
        .width(100)
        .height(100)
        .scale({ x: this.scale, y: this.scale })
        .rotate({ angle: this.rotate })
        .opacity(this.opacity)
        .animation({
          duration: 500,
          curve: Curve.EaseInOut,
          delay: 0,
          iterations: 1
        })

      Button('放大')
        .onClick(() => {
          this.scale = 1.5;
        })

      Button('旋转')
        .onClick(() => {
          this.rotate += 90;
        })

      Button('淡出')
        .onClick(() => {
          this.opacity = 0.3;
        })
    }
  }
}
```

### 7.4 响应式布局

使用 `Grid`、`Flex`、`Swiper` 等组件实现响应式布局:

```typescript
@Entry
@Component
struct ResponsiveLayout {
  @State isLandscape: boolean = false;

  build() {
    Grid() {
      GridItem() {
        Text('Item 1')
      }
      GridItem() {
        Text('Item 2')
      }
      GridItem() {
        Text('Item 3')
      }
      GridItem() {
        Text('Item 4')
      }
    }
    .columnsTemplate(this.isLandscape ? '1fr 1fr 1fr 1fr' : '1fr 1fr')
    .rowsTemplate('1fr 1fr')
    .width('100%')
    .height('100%')
    .onAreaChange(() => {
      // 根据宽度判断横竖屏
    })
  }
}
```

## 8. 性能优化

### 8.1 渲染性能基础

ArkUI 的渲染流程包含三个阶段:

1. **构建阶段**(build)——执行 `build()` 方法生成组件树
2. **布局阶段**(layout)——计算组件位置与大小
3. **绘制阶段**(paint)——将组件树绘制到屏幕

性能优化的目标是减少这三个阶段的耗时。

### 8.2 减少 `build()` 执行频率

`@State` 变化会触发 `build()` 重新执行。优化策略:

```typescript
@Entry
@Component
struct OptimizedPage {
  // 不推荐:大量独立 @State
  @State a: number = 0;
  @State b: number = 0;
  @State c: number = 0;
  // 任一变化都触发整个 build 重新执行

  build() {
    Column() {
      Text(`${this.a}`)
      Text(`${this.b}`)
      Text(`${this.c}`)
    }
  }
}

// 推荐:将无关状态拆分到子组件
@Component
struct IndependentWidget {
  @State value: number = 0;

  build() {
    Text(`${this.value}`)
  }
}

@Entry
@Component
struct OptimizedPageV2 {
  build() {
    Column() {
      IndependentWidget()
      IndependentWidget()
      IndependentWidget()
    }
  }
}
```

### 8.3 `ForEach` 的 key 优化

`ForEach` 的 `keyGenerator` 决定了 diff 算法的效率:

```typescript
// 不推荐:用索引作为 key
ForEach(this.items, (item: string, index: number) => {
  Text(item)
}, (item: string, index: number): string => index.toString())
// 当列表变化时,所有 item 的 key 都改变,diff 失效

// 推荐:用唯一标识作为 key
ForEach(this.items, (item: Item) => {
  Text(item.text)
}, (item: Item): string => item.id.toString())
// 列表变化时,只有变化的 item 重新渲染
```

### 8.4 懒加载长列表

使用 `LazyForEach` 替代 `ForEach` 处理超长列表:

```typescript
// 数据源实现 IDataSource 接口
class BasicDataSource implements IDataSource {
  private listeners: DataChangeListener[] = [];
  private data: string[] = [];

  totalCount(): number {
    return this.data.length;
  }

  getData(index: number): string {
    return this.data[index];
  }

  registerDataChangeListener(listener: DataChangeListener): void {
    this.listeners.push(listener);
  }

  unregisterDataChangeListener(listener: DataChangeListener): void {
    const pos = this.listeners.indexOf(listener);
    if (pos >= 0) {
      this.listeners.splice(pos, 1);
    }
  }

  notifyDataReload(): void {
    this.listeners.forEach((listener: DataChangeListener): void => {
      listener.onDataReloaded();
    });
  }

  pushData(data: string): void {
    this.data.push(data);
    this.listeners.forEach((listener: DataChangeListener): void => {
      listener.onDatasetChange([{ type: DataOperationType.ADD, index: this.data.length - 1 }]);
    });
  }
}

@Entry
@Component
struct LongListPage {
  private data: BasicDataSource = new BasicDataSource();

  aboutToAppear(): void {
    // 模拟大量数据
    for (let i = 0; i < 10000; i++) {
      this.data.pushData(`Item ${i}`);
    }
  }

  build() {
    List() {
      LazyForEach(this.data, (item: string) => {
        ListItem() {
          Text(item)
            .fontSize(16)
            .padding(12)
        }
      }, (item: string): string => item)
    }
    .width('100%')
    .height('100%')
  }
}
```

`LazyForEach` 只渲染可见区域的 item,滚动时动态创建与销毁,显著降低内存占用与首次渲染时间。

### 8.5 避免不必要的对象创建

```typescript
// 不推荐:每次 build 都创建新对象
@Component
struct BadExample {
  build() {
    Text('Hello')
      .style(new TextStyle({    // 每次 build 都 new
        fontSize: 16,
        color: '#333'
      }))
  }
}

// 推荐:使用基本类型
@Component
struct GoodExample {
  build() {
    Text('Hello')
      .fontSize(16)
      .fontColor('#333')
  }
}
```

## 9. 调试与排错

### 9.1 常见错误

**错误:`@State` 修改不刷新 UI**:

```typescript
@State user: User = { name: 'Alice', age: 30 };

// 错误:直接修改属性
this.user.age = 31;  // UI 不刷新

// 正确:重新赋值整个对象
this.user = { ...this.user, age: 31 };

// 或使用 @Observed + @ObjectLink
```

**错误:`@Link` 使用了错误的传递语法**:

```typescript
// 错误:直接传值
ChildComponent({ count: this.count })

// 正确:使用 $ 前缀
ChildComponent({ count: $count })
```

**错误:`ForEach` 缺少 keyGenerator**:

```typescript
// 错误:缺少 keyGenerator(虽然语法允许,但性能差)
ForEach(this.items, (item: Item) => {
  Text(item.text)
})

// 推荐:提供 keyGenerator
ForEach(this.items, (item: Item) => {
  Text(item.text)
}, (item: Item): string => item.id.toString())
```

**错误:在 `build()` 中执行副作用**:

```typescript
// 错误:build() 中执行副作用
build() {
  this.fetchData();  // 不要在 build 中执行副作用
  return Text('Hello');
}

// 正确:在生命周期中执行
async aboutToAppear(): Promise<void> {
  await this.fetchData();
}
```

### 9.2 DevEco Studio 调试工具

DevEco Studio 提供 ArkUI Inspector 用于可视化调试:

1. **ArkUI Inspector**——查看组件树与样式
2. **状态变化追踪**——查看 `@State` 变化与触发的 UI 更新
3. **性能分析**——分析 `build()` 执行时间与渲染性能
4. **预览器**——实时预览组件,无需运行完整应用

### 9.3 调试技巧

**技巧一:使用 `@Watch` 追踪状态变化**:

```typescript
@State @Watch('onDebug') count: number = 0;

onDebug(propName: string): void {
  console.log(`[DEBUG] ${propName} = ${this.count}`);
}
```

**技巧二:使用 `if` 切换调试视图**:

```typescript
build() {
  Column() {
    if (this.debugMode) {
      Text(`DEBUG: state = ${JSON.stringify(this.state)}`)
        .backgroundColor('#FFFF00')
    }
    // 正常 UI
  }
}
```

## 10. 最佳实践

### 10.1 组件设计原则

**单一职责原则**:每个组件只做一件事。

```typescript
// 不推荐:组件做太多事
@Component
struct UserCard {
  @Prop user: User;

  async fetchUserPosts() { /* ... */ }
  async fetchUserFollowers() { /* ... */ }
  build() { /* ... */ }
}

// 推荐:职责分离
@Component
struct UserCard {
  @Prop user: User;
  build() { /* 只渲染用户信息 */ }
}

@Component
struct UserPostsList {
  @Prop userId: number;
  build() { /* 只渲染帖子列表 */ }
}
```

**组件层次清晰**:

```
Page (页面级)
├── Header (区域级)
├── Content (区域级)
│   ├── List (功能级)
│   │   └── ListItem (项级)
│   └── Filter (功能级)
└── Footer (区域级)
```

### 10.2 状态设计原则

**就近原则**:状态应该放在使用它的最近组件中。

```typescript
// 不推荐:所有状态都放在页面组件
@Entry
@Component
struct Page {
  @State modalVisible: boolean = false;
  @State modalContent: string = '';
  @State listItems: string[] = [];
  @State filter: string = 'all';

  build() {
    Column() {
      Modal({ visible: $modalVisible, content: modalContent })
      FilterBar({ filter: $filter })
      List({ items: listItems })
    }
  }
}

// 推荐:状态分散到各自组件
@Component
struct Modal {
  @State visible: boolean = false;
  @State content: string = '';
}

@Component
struct FilterBar {
  @State filter: string = 'all';
}
```

**单向数据流**:优先使用 `@Prop`,慎用 `@Link`。

```typescript
// 推荐:单向数据流,通过回调通知父组件
@Component
struct Input {
  @Prop value: string = '';
  @Link onChange: (value: string) => void;

  build() {
    TextInput({ text: this.value })
      .onChange((v: string) => {
        this.onChange(v);
      })
  }
}
```

### 10.3 命名约定

```typescript
// 组件:PascalCase,以 View/Page/Component 结尾
struct UserCard { }
struct LoginPage { }
struct HeaderBar { }

// 状态:camelCase,描述数据
@State userName: string = '';
@State isLoading: boolean = false;
@State items: Item[] = [];

// Builder:以 Builder 后缀
@Builder
ItemBuilder(item: Item) { }

// 样式函数:以 Style 后缀
@Styles
function cardStyle() { }
```

### 10.4 文件组织

```
src/main/ets/
├── pages/                    # 页面
│   ├── Index.ets
│   └── Login.ets
├── components/               # 通用组件
│   ├── common/               # 基础组件(Button、Card)
│   └── business/             # 业务组件(UserCard、TodoItem)
├── model/                    # 数据模型
│   ├── User.ets
│   └── Todo.ets
├── theme/                    # 主题
│   ├── Colors.ets
│   └── Typography.ets
├── utils/                    # 工具
│   └── Format.ets
└── viewmodel/                # 视图模型
    ├── UserViewModel.ets
    └── TodoViewModel.ets
```

## 11. 总结与回顾

### 11.1 装饰器速查表

| 装饰器 | 用途 | 数据流向 | 必须初始化 |
| --- | --- | --- | --- |
| `@State` | 组件内可变状态 | 本地 | 是 |
| `@Prop` | 父→子单向 | 父→子 | 是(默认值) |
| `@Link` | 父↔子双向 | 父↔子 | 否(来自父) |
| `@Provide` | 祖先→后代 | 祖先→后代 | 是 |
| `@Consume` | 后代←祖先 | 后代←祖先 | 否(来自祖先) |
| `@Observed` | 可观察类 | - | - |
| `@ObjectLink` | 接收可观察对象 | 父→子 | 否(来自父) |
| `@Watch` | 监听变化 | - | - |
| `@Builder` | UI 片段复用 | - | - |
| `@BuilderParam` | 接收 UI 函数 | 父→子 | 是(默认) |
| `@Extend` | 扩展组件样式 | - | - |
| `@Styles` | 复用样式集合 | - | - |
| `@Component` | 声明组件 | - | - |
| `@Entry` | 页面入口 | - | - |
| `@Reusable` | 可复用组件 | - | - |

### 11.2 状态管理选择决策树

1. 状态只在当前组件使用?
   - 是 → `@State`
   - 否 → 继续

2. 父组件传给子组件,子组件只读?
   - 是 → `@Prop`
   - 否 → 继续

3. 父子组件需要双向同步?
   - 是 → `@Link`
   - 否 → 继续

4. 数据需要在多层级组件间共享?
   - 是 → `@Provide` + `@Consume`
   - 否 → 继续

5. 嵌套对象的属性需要响应式更新?
   - 是 → `@Observed` + `@ObjectLink`
   - 否 → 继续

6. 需要在状态变化时执行副作用?
   - 是 → `@Watch`
   - 否 → 重新评估状态设计

### 11.3 与 React/Vue/SwiftUI 的对照

| 概念 | ArkUI | React | Vue | SwiftUI |
| --- | --- | --- | --- | --- |
| 组件 | `@Component struct` | function component | `.vue` SFC | `struct: View` |
| 状态 | `@State` | `useState` | `ref`/`data` | `@State` |
| 父→子 | `@Prop` | props | props | 普通 let |
| 双向 | `@Link` | - | `v-model` | `@Binding` |
| 跨层级 | `@Provide/@Consume` | Context | provide/inject | Environment |
| UI 片段 | `@Builder` | render function | slot | `@ViewBuilder` |
| 列表 | `ForEach` | `map` | `v-for` | `ForEach` |
| 条件 | `if/else` | JSX `{cond && ...}` | `v-if` | `if` |

### 11.4 学习路径建议

完成本章后,建议按以下顺序继续学习:

1. **组件生命周期详解**——深入 `aboutToAppear`、`aboutToDisappear`、`onPageShow` 等回调
2. **路由跳转与路由栈**——理解页面导航与参数传递
3. **状态管理**——更深入的状态管理策略
4. **列表与网格**——掌握 `List`、`Grid`、`LazyForEach` 的高级用法
5. **动画系统**——学习 `animateTo`、转场动画、属性动画
6. **性能优化**——深入 ArkUI 渲染机制与优化技巧

## 12. 参考资料

### 12.1 官方文档

- **ArkUI 开发文档**——https://developer.harmonyos.com/cn/docs/arkui/
- **ArkUI 组件参考**——内置组件完整 API
- **ArkUI 状态管理**——装饰器深入说明
- **HarmonyOS 设计规范**——MD(华为移动设计规范)

### 12.2 推荐阅读

- **声明式 UI 思想**——React、Flutter、SwiftUI 的设计哲学
- **Functional UI**——了解 `UI = f(State)` 的数学基础
- **Reactive Programming**——响应式编程基础
- **Composition over Inheritance**——组合优于继承的设计原则

### 12.3 相关框架对比阅读

- **React 文档**——https://react.dev/
- **Flutter 文档**——https://flutter.dev/docs
- **SwiftUI 文档**——https://developer.apple.com/xcode/swiftui/
- **Jetpack Compose**——https://developer.android.com/jetpack/compose

### 12.4 进阶主题

- **ArkUI 跨设备适配**——断点响应、自适应布局
- **ArkUI 动效设计**——属性动画、转场动画、共享元素动画
- **ArkUI 自定义绘制**——Canvas、Path、自定义组件
- **ArkUI 性能调优**——DevTools 性能分析、渲染优化
- **ArkUI 元服务**——免安装应用开发

---

## 附录 A:内置组件速查

### A.1 基础组件

| 组件 | 用途 | 关键属性 |
| --- | --- | --- |
| `Text` | 文本 | `fontSize`、`fontColor`、`fontWeight`、`textAlign` |
| `Image` | 图片 | `src`、`width`、`height`、`objectFit` |
| `TextInput` | 输入框 | `text`、`placeholder`、`type`、`onChange` |
| `Button` | 按钮 | `label`、`type`、`onClick` |
| `Checkbox` | 复选框 | `select`、`onChange` |
| `Radio` | 单选 | `value`、`group`、`onChange` |
| `Toggle` | 开关 | `isOn`、`onChange` |
| `Slider` | 滑块 | `value`、`min`、`max`、`onChange` |
| `Progress` | 进度条 | `value`、`total`、`type` |
| `LoadingProgress` | 加载 | - |

### A.2 容器组件

| 组件 | 用途 | 关键属性 |
| --- | --- | --- |
| `Column` | 垂直布局 | `alignItems`、`justifyContent` |
| `Row` | 水平布局 | `alignItems`、`justifyContent` |
| `Flex` | 弹性布局 | `direction`、`wrap`、`justifyContent` |
| `Stack` | 堆叠 | `alignContent` |
| `Grid` | 网格 | `columnsTemplate`、`rowsTemplate` |
| `List` | 列表 | `direction`、`scrollBar` |
| `ListItem` | 列表项 | - |
| `Swiper` | 轮播 | `index`、`autoPlay`、`interval` |
| `Tabs` | 标签页 | `index`、`onChange` |
| `Navigation` | 导航 | `title`、`menus` |

### A.3 媒体组件

| 组件 | 用途 |
| --- | --- |
| `Image` | 静态图片 |
| `Video` | 视频播放 |
| `XComponent` | 自定义渲染 |
| `Canvas` | 画布绘制 |

### A.4 通用属性

```typescript
Text('Hello')
  // 尺寸
  .width(100)
  .height(40)
  .size({ width: 100, height: 40 })  // 简写

  // 间距
  .margin({ top: 10, bottom: 10, left: 16, right: 16 })
  .margin(10)  // 四周相同
  .padding(12)

  // 边框
  .border({ width: 1, color: '#333', radius: 8 })
  .borderRadius(8)
  .borderWidth(1)

  // 背景
  .backgroundColor('#FFFFFF')
  .backgroundImage($r('app.media.bg'))

  // 文本样式
  .fontSize(14)
  .fontColor('#333333')
  .fontWeight(FontWeight.Bold)
  .textAlign(TextAlign.Center)
  .lineHeight(20)
  .letterSpacing(1)

  // 可见性
  .visibility(Visibility.Visible)
  .opacity(0.8)

  // 变换
  .rotate({ angle: 45 })
  .scale({ x: 1.5, y: 1.5 })
  .translate({ x: 10, y: 20 })

  // 事件
  .onClick((event: ClickEvent) => { })
  .onTouch((event: TouchEvent) => { })
  .onHover((isHover: boolean) => { })
```

## 附录 B:布局算法

### B.1 Flexbox 布局

ArkUI 的 `Column`、`Row`、`Flex` 基于 flexbox 布局模型:

```
+---------------------------+
|       Main Axis →         |
|  +-------+  +-------+     |
|  | Item1 |  | Item2 |     | Cross Axis
|  |       |  |       |     |     ↓
|  +-------+  +-------+     |
+---------------------------+
```

关键属性:

```typescript
Row() {
  // 子组件
}
.justifyContent(FlexAlign.SpaceBetween)  // 主轴对齐
.alignItems(VerticalAlign.Center)        // 交叉轴对齐
```

`justifyContent` 选项:

- `FlexAlign.Start`——起始对齐
- `FlexAlign.Center`——居中对齐
- `FlexAlign.End`——末尾对齐
- `FlexAlign.SpaceBetween`——两端对齐,等间距
- `FlexAlign.SpaceAround`——每项两侧等间距
- `FlexAlign.SpaceEvenly`——所有间距相等

### B.2 Grid 布局

```typescript
Grid() {
  GridItem() { Text('1') }
  GridItem() { Text('2') }
  GridItem() { Text('3') }
  GridItem() { Text('4') }
}
.columnsTemplate('1fr 1fr')   // 2 列等宽
.rowsTemplate('1fr 1fr')      // 2 行等高
.columnsGap(8)
.rowsGap(8)
```

`1fr` 表示"一份剩余空间",`2fr 1fr` 表示 2:1 的比例。

### B.3 Stack 堆叠

```typescript
Stack({ alignContent: Alignment.Center }) {
  Image($r('app.media.background'))
    .width('100%')
    .height('100%')

  Text('Overlay')
    .fontSize(24)
    .fontColor('#FFFFFF')
}
.width('100%')
.height(200)
```

`alignContent` 决定子组件在堆叠中的对齐方式。

## 附录 C:ArkUI 与 Web CSS 对照

| ArkUI 属性 | CSS 对应 |
| --- | --- |
| `.width(100)` | `width: 100px` |
| `.height(40)` | `height: 40px` |
| `.margin(10)` | `margin: 10px` |
| `.padding(12)` | `padding: 12px` |
| `.borderRadius(8)` | `border-radius: 8px` |
| `.backgroundColor('#FFF')` | `background-color: #FFF` |
| `.fontSize(14)` | `font-size: 14px` |
| `.fontColor('#333')` | `color: #333` |
| `.fontWeight(FontWeight.Bold)` | `font-weight: bold` |
| `.opacity(0.8)` | `opacity: 0.8` |
| `.rotate({ angle: 45 })` | `transform: rotate(45deg)` |
| `.scale({ x: 1.5, y: 1.5 })` | `transform: scale(1.5, 1.5)` |
| `.translate({ x: 10, y: 20 })` | `transform: translate(10px, 20px)` |
| `.justifyContent(FlexAlign.Center)` | `justify-content: center` |
| `.alignItems(HorizontalAlign.Center)` | `align-items: center` |
| `.position({ x: 10, y: 20 })` | `position: absolute; left: 10px; top: 20px` |

## 附录 D:常见布局模式

### D.1 卡片布局

```typescript
@Component
struct Card {
  @BuilderProp content: () => void;

  build() {
    Column() {
      this.content()
    }
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
    .padding(16)
    .shadow({
      radius: 16,
      color: 'rgba(0,0,0,0.08)',
      offsetX: 0,
      offsetY: 4
    })
  }
}
```

### D.2 列表项布局

```typescript
@Builder
function ListItemLayout(title: string, subtitle: string, accessory: string) {
  Row() {
    Column() {
      Text(title)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)

      Text(subtitle)
        .fontSize(13)
        .fontColor('#888')
        .margin({ top: 2 })
    }
    .alignItems(HorizontalAlign.Start)
    .layoutWeight(1)

    Text(accessory)
      .fontSize(14)
      .fontColor('#999')
  }
  .width('100%')
  .padding({ left: 16, right: 16, top: 12, bottom: 12 })
  .backgroundColor('#FFFFFF')
}
```

### D.3 标签栏布局

```typescript
@Component
struct TabBar {
  @State activeIndex: number = 0;
  @BuilderProp onTabChange: (index: number) => void;

  @Builder
  TabItem(label: string, icon: Resource, index: number) {
    Column() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor(this.activeIndex === index ? '#007DFF' : '#999')

      Text(label)
        .fontSize(11)
        .fontColor(this.activeIndex === index ? '#007DFF' : '#999')
        .margin({ top: 4 })
    }
    .layoutWeight(1)
    .onClick(() => {
      this.activeIndex = index;
      this.onTabChange(index);
    })
  }

  build() {
    Row() {
      this.TabItem('首页', $r('app.media.home'), 0)
      this.TabItem('发现', $r('app.media.discover'), 1)
      this.TabItem('我的', $r('app.media.profile'), 2)
    }
    .width('100%')
    .height(56)
    .backgroundColor('#FFFFFF')
    .border({ width: { top: 1 }, color: '#EEEEEE' })
  }
}
```

## 附录 E:练习题

### E.1 基础题

**题目 1**:实现一个温度转换器,输入摄氏度,实时显示华氏度。

参考答案:

```typescript
@Entry
@Component
struct TemperatureConverter {
  @State celsius: number = 0;

  get fahrenheit(): number {
    return this.celsius * 9 / 5 + 32;
  }

  build() {
    Column() {
      Text('温度转换器')
        .fontSize(24)
        .margin({ bottom: 20 })

      Row() {
        Text('摄氏度:')
        TextInput({ text: this.celsius.toString() })
          .type(InputType.Number)
          .width(120)
          .onChange((value: string) => {
            const num: number = parseFloat(value);
            if (!isNaN(num)) {
              this.celsius = num;
            }
          })
      }

      Text(`华氏度: ${this.fahrenheit.toFixed(2)}°F`)
        .fontSize(20)
        .margin({ top: 20 })
    }
    .padding(20)
  }
}
```

**题目 2**:实现一个可勾选的待办列表,使用 `@Observed` + `@ObjectLink`。

参考答案见 6.1 案例。

### E.2 进阶题

**题目 3**:实现一个购物车组件,支持增加/减少商品数量、计算总价。

参考答案:

```typescript
@Observed
class CartItem {
  public id: number;
  public name: string;
  public price: number;
  public quantity: number;

  constructor(id: number, name: string, price: number, quantity: number = 1) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }

  increment(): void {
    this.quantity++;
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  subtotal(): number {
    return this.price * this.quantity;
  }
}

@Component
struct CartItemView {
  @ObjectLink item: CartItem;

  build() {
    Row() {
      Text(this.item.name)
        .layoutWeight(1)

      Button('-')
        .width(32)
        .onClick(() => {
          this.item.decrement();
        })

      Text(`${this.item.quantity}`)
        .width(40)
        .textAlign(TextAlign.Center)

      Button('+')
        .width(32)
        .onClick(() => {
          this.item.increment();
        })

      Text(`¥${this.item.subtotal().toFixed(2)}`)
        .width(80)
        .textAlign(TextAlign.End)
    }
    .padding(12)
  }
}

@Entry
@Component
struct CartPage {
  @State items: CartItem[] = [
    new CartItem(1, '苹果', 5.5, 2),
    new CartItem(2, '香蕉', 3.2, 3),
    new CartItem(3, '橙子', 8.0, 1)
  ];

  totalPrice(): number {
    return this.items.reduce((sum: number, item: CartItem): number => sum + item.subtotal(), 0);
  }

  build() {
    Column() {
      ForEach(this.items, (item: CartItem) => {
        CartItemView({ item: item })
      }, (item: CartItem): string => item.id.toString())

      Row() {
        Text('总计:')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
        Blank()
        Text(`¥${this.totalPrice().toFixed(2)}`)
          .fontSize(20)
          .fontColor('#FF0000')
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .padding(16)
      .backgroundColor('#F5F5F5')
    }
  }
}
```

### E.3 综合题

**题目 4**:实现一个支持增删改查的笔记应用,数据持久化到 `AppStorage`。

提示:

- 使用 `@Observed` 包装 `Note` 类
- 使用 `AppStorage` 存储笔记数组
- 实现 `NoteList`、`NoteEditor`、`NoteDetail` 三个组件
- 支持按标题搜索

(参考答案见官方 Sample)

---

## 附录 F:术语表

| 术语 | 英文 | 说明 |
| --- | --- | --- |
| 声明式 UI | declarative UI | 描述 UI 状态而非操作步骤的范式 |
| 装饰器 | decorator | `@` 开头的元编程语法 |
| 组件 | component | 可复用的 UI 单元 |
| 状态 | state | 驱动 UI 渲染的数据 |
| 单向数据流 | unidirectional data flow | 数据从父到子的流动方向 |
| 双向绑定 | two-way binding | 父子状态自动同步 |
| 差分算法 | diff algorithm | 计算新旧组件树差异的算法 |
| 虚拟 DOM | virtual DOM | 内存中的组件树表示 |
| 不可变更新 | immutable update | 通过新建对象触发更新 |
| 懒加载 | lazy loading | 按需加载列表项 |

---

**本章总结**:ArkUI 是基于 ArkTS 的声明式 UI 框架,核心是装饰器系统。`@Component` + `@Entry` 声明组件,`@State` 管理本地状态,`@Prop`/`@Link` 处理父子通信,`@Provide`/`@Consume` 跨层级共享,`@Observed`/`@ObjectLink` 处理嵌套对象,`@Builder`/`@BuilderParam` 复用 UI 片段,`@Extend`/`@Styles` 复用样式。掌握这些装饰器的使用场景与区别,是构建复杂 ArkUI 应用的基础。下一章节将深入组件生命周期,理解组件从创建到销毁的全过程。
