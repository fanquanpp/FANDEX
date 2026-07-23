---
order: 2
title: ArkTS与ArkUI
module: harmonyos
category: 鸿蒙开发
difficulty: beginner
description: 'ArkTS 语言基础、ArkUI 方舟开发框架、声明式 UI 范式、组件化开发、装饰器与状态管理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/概述与环境搭建
  - harmonyos/UI组件与动画
  - harmonyos/网络与数据持久化
prerequisites: []
---

## 1. ArkTS 语言基础

### 1.1 ArkTS 概述

ArkTS 是基于 **TypeScript 扩展**的编程语言，专为 HarmonyOS 应用开发设计。它在 TypeScript 基础上进行了如下扩展和约束：

| 特性         | 说明                                       |
| :----------- | :----------------------------------------- |
| **类型系统** | 基于 TypeScript 静态类型，更严格的类型检查 |
| **UI 语法**  | 扩展了声明式 UI 构建语法                   |
| **状态管理** | 内置响应式状态管理装饰器                   |
| **性能优化** | 静态编译，AOT 优化                         |
| **安全约束** | 禁止部分动态特性（如 eval、with）          |

### 1.2 基础数据类型

```typescript
// 基本类型
let isDone: boolean = false;
let count: number = 42;
let name: string = 'HarmonyOS';

// 数组
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ['a', 'b', 'c'];

// 元组
let tuple: [string, number] = ['age', 25];

// 枚举
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}
let dir: Direction = Direction.Up;

// 联合类型
let value: string | number = 'hello';
value = 100;

// 类型别名
type NullableString = string | null;
let name2: NullableString = null;
```

### 1.3 函数与箭头函数

```typescript
// 普通函数
function add(a: number, b: number): number {
  return a + b;
}

// 可选参数与默认值
function greet(name: string, greeting?: string): string {
  return `${greeting || '你好'}, ${name}!`;
}

// 箭头函数
const multiply = (a: number, b: number): number => a * b;

// 回调函数类型
type Callback = (result: string) => void;

function fetchData(url: string, callback: Callback): void {
  // 模拟异步操作
  callback('data loaded');
}
```

### 1.4 类与接口

```typescript
// 接口定义
interface IUser {
  id: number;
  name: string;
  email?: string;
  getDisplayName(): string;
}

// 类实现
class User implements IUser {
  id: number;
  name: string;
  email?: string;

  constructor(id: number, name: string, email?: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  getDisplayName(): string {
    return this.email ? `${this.name} <${this.email}>` : this.name;
  }
}

// 泛型类
class DataStore<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  getAll(): T[] {
    return [...this.items];
  }
}

const store = new DataStore<string>();
store.add('item1');
```

### 1.5 ArkTS 与 TypeScript 差异

| 特性           | TypeScript | ArkTS                 |
| :------------- | :--------- | :-------------------- |
| **eval**       | 支持       | 禁止                  |
| **with**       | 支持       | 禁止                  |
| **动态属性**   | 支持       | 限制使用              |
| **原型链修改** | 支持       | 禁止                  |
| **any 类型**   | 支持       | 不推荐，严格限制      |
| **装饰器**     | 实验性支持 | 原生支持（UI 装饰器） |

## 2. ArkUI 方舟开发框架

### 2.1 ArkUI 概述

ArkUI 是 HarmonyOS 的**声明式 UI 开发框架**，提供一套统一的开发范式：

| 特性          | 说明                           |
| :------------ | :----------------------------- |
| **声明式 UI** | 描述 UI 应该是什么，而非怎么做 |
| **组件化**    | 一切皆组件，可组合嵌套         |
| **状态驱动**  | UI 自动响应状态变化            |
| **跨设备**    | 一套代码适配多种设备           |

### 2.2 声明式 UI 范式

```typescript
// 命令式 UI（传统方式）
// textView.setText("Hello");
// textView.setTextColor(Color.BLUE);

// 声明式 UI（ArkUI 方式）
@Entry
@Component
struct HelloPage {
  @State message: string = 'Hello';

  build() {
    Column() {
      Text(this.message)
        .fontSize(24)
        .fontColor(Color.Blue)
    }
  }
}
```

### 2.3 UI 渲染流程

```
状态变化 → 框架检测变化 → 重新执行 build() → 虚拟 DOM Diff → 最小化更新真实 DOM
```

## 3. 装饰器体系

### 3.1 @Entry 装饰器

标记页面入口组件，一个页面只能有一个 `@Entry` 组件：

```typescript
@Entry
@Component
struct MainPage {
  build() {
    Column() {
      Text('这是页面入口')
    }
  }
}
```

### 3.2 @Component 装饰器

将 struct 声明为 UI 组件，每个组件必须包含 `build()` 方法：

```typescript
@Component
export struct GreetingCard {
  @Prop name: string = '';

  build() {
    Row() {
      Text(`你好, ${this.name}!`)
        .fontSize(20)
    }
    .padding(16)
    .backgroundColor('#f5f5f5')
    .borderRadius(8)
  }
}
```

### 3.3 @Builder 装饰器

定义轻量级 UI 构建函数，用于复用 UI 片段：

```typescript
@Entry
@Component
struct BuilderDemo {
  @State items: string[] = ['首页', '发现', '我的'];

  // 定义 Builder
  @Builder
  TabItem(title: string, index: number) {
    Column() {
      Text(title)
        .fontSize(14)
        .fontColor(index === 0 ? '#1a73e8' : '#999999')
      Divider()
        .color(index === 0 ? '#1a73e8' : 'transparent')
        .width(20)
    }
    .padding({ left: 12, right: 12 })
  }

  build() {
    Row() {
      ForEach(this.items, (item: string, index?: number) => {
        this.TabItem(item, index ?? 0)
      })
    }
  }
}
```

### 3.4 @BuilderParam 与 @WrapBuilder

用于插槽式组件设计：

```typescript
// 子组件定义插槽
@Component
struct Card {
  @BuilderParam contentBuilder: () => void;

  build() {
    Column() {
      // 渲染插槽内容
      this.contentBuilder()
    }
    .padding(16)
    .backgroundColor('#ffffff')
    .borderRadius(12)
    .shadow({ radius: 4, color: '#1a000000', offsetY: 2 })
  }
}

// 父组件传入内容
@Entry
@Component
struct CardDemo {
  @Builder
  cardContent() {
    Text('这是卡片内容')
      .fontSize(16)
  }

  build() {
    Column() {
      Card({ contentBuilder: this.cardContent })
    }
    .padding(20)
  }
}
```

## 4. 状态管理

### 4.1 状态管理总览

```
@State ────→ @Prop ────→ 子组件
  │
  ├──→ @Link ←───→ 子组件（双向）
  │
  └──→ @Provide ──→ @Consume（跨层级）
```

### 4.2 @State 装饰器

组件内部状态，变化会触发 UI 刷新：

```typescript
@Entry
@Component
struct StateDemo {
  @State count: number = 0;
  @State user: User = { name: '张三', age: 25 };

  build() {
    Column() {
      Text(`计数: ${this.count}`)
        .fontSize(24)

      Button('增加')
        .onClick(() => {
          this.count += 1;  // 触发 UI 刷新
        })

      Button('修改用户')
        .onClick(() => {
          this.user.name = '李四';  // 嵌套属性变化也触发刷新
        })
    }
  }
}
```

> **注意**：@State 支持观察 Object 和 Array 的嵌套属性变化（一级嵌套）。

### 4.3 @Prop 装饰器

父组件向子组件**单向传递**数据，子组件本地可修改但不影响父组件：

```typescript
@Component
struct ChildComponent {
  @Prop title: string = '';
  @Prop count: number = 0;

  build() {
    Column() {
      Text(this.title)
        .fontSize(20)
      Text(`数量: ${this.count}`)
        .fontSize(16)
    }
  }
}

@Entry
@Component
struct ParentComponent {
  @State message: string = '标题';
  @State num: number = 5;

  build() {
    Column() {
      ChildComponent({ title: this.message, count: this.num })
      Button('修改')
        .onClick(() => {
          this.num += 1;  // 父组件修改会同步到子组件
        })
    }
  }
}
```

### 4.4 @Link 装饰器

父子组件**双向绑定**，子组件修改会同步回父组件：

```typescript
@Component
struct Counter {
  @Link value: number;

  build() {
    Row() {
      Button('-')
        .onClick(() => {
          this.value -= 1;  // 修改会同步到父组件
        })
      Text(`${this.value}`)
        .fontSize(24)
        .margin({ left: 16, right: 16 })
      Button('+')
        .onClick(() => {
          this.value += 1;
        })
    }
  }
}

@Entry
@Component
struct LinkDemo {
  @State count: number = 0;

  build() {
    Column() {
      Text(`父组件计数: ${this.count}`)
        .fontSize(20)
      // 使用 $ 语法传递引用
      Counter({ value: $count })
    }
  }
}
```

### 4.5 @Provide 与 @Consume

跨层级组件通信，无需逐层传递：

```typescript
@Entry
@Component
struct GrandParent {
  @Provide theme: string = 'light';

  build() {
    Column() {
      Text(`主题: ${this.theme}`)
      Parent()
      Button('切换主题')
        .onClick(() => {
          this.theme = this.theme === 'light' ? 'dark' : 'light';
        })
    }
  }
}

@Component
struct Parent {
  build() {
    Column() {
      Child()  // 无需传递 theme
    }
  }
}

@Component
struct Child {
  @Consume theme: string;  // 自动匹配同名的 @Provide

  build() {
    Text(`当前主题: ${this.theme}`)
      .fontColor(this.theme === 'dark' ? '#ffffff' : '#000000')
  }
}
```

### 4.6 状态管理对比

| 装饰器        | 方向      | 嵌套层级 | 典型场景         |
| :------------ | :-------- | :------- | :--------------- |
| **@State**    | 组件内部  | -        | 组件私有状态     |
| **@Prop**     | 父→子     | 1 层     | 只读展示数据     |
| **@Link**     | 父↔子     | 1 层     | 表单双向绑定     |
| **@Provide**  | 祖先→后代 | N 层     | 主题、全局配置   |
| **@Consume**  | 后代←祖先 | N 层     | 消费全局配置     |
| **@Watch**    | 监听变化  | -        | 状态变化回调     |
| **@Observed** | 类装饰器  | -        | 深度观察嵌套对象 |

### 4.7 @Watch 装饰器

监听状态变化并执行回调：

```typescript
@Entry
@Component
struct WatchDemo {
  @State @Watch('onPriceChange') price: number = 100;

  onPriceChange(newValue: number, oldValue: number) {
    console.info(`价格从 ${oldValue} 变为 ${newValue}`);
  }

  build() {
    Column() {
      Text(`价格: ${this.price}`)
      Button('涨价')
        .onClick(() => {
          this.price += 10;
        })
    }
  }
}
```

## 5. 条件渲染与循环渲染

### 5.1 条件渲染

```typescript
@Entry
@Component
struct ConditionalDemo {
  @State isLoggedIn: boolean = false;

  build() {
    Column() {
      if (this.isLoggedIn) {
        Text('欢迎回来！')
          .fontSize(20)
          .fontColor('#1a73e8')
      } else {
        Text('请先登录')
          .fontSize(20)
          .fontColor('#999999')
      }

      Button(this.isLoggedIn ? '退出' : '登录')
        .onClick(() => {
          this.isLoggedIn = !this.isLoggedIn;
        })
    }
  }
}
```

### 5.2 循环渲染（ForEach）

```typescript
@Entry
@Component
struct ForEachDemo {
  @State fruits: string[] = ['苹果', '香蕉', '橘子'];

  build() {
    Column() {
      ForEach(
        this.fruits,
        (item: string, index?: number) => {
          Row() {
            Text(`${(index ?? 0) + 1}. ${item}`)
              .fontSize(18)
          }
          .width('100%')
          .padding(12)
        },
        (item: string) => item  // 键值生成器
      )

      Button('添加水果')
        .onClick(() => {
          this.fruits.push('葡萄');
        })
    }
  }
}
```

### 5.3 LazyForEach 懒加载

适用于大数据量列表，按需加载：

```typescript
// 数据源需要实现 IDataSource 接口
class MyDataSource implements IDataSource {
  private data: string[] = [];

  totalCount(): number {
    return this.data.length;
  }

  getData(index: number): string {
    return this.data[index];
  }

  registerDataChangeListener(listener: DataChangeListener): void {}
  unregisterDataChangeListener(listener: DataChangeListener): void {}
}

@Entry
@Component
struct LazyForEachDemo {
  private dataSource: MyDataSource = new MyDataSource();

  aboutToAppear() {
    for (let i = 0; i < 1000; i++) {
      this.dataSource.data.push(`Item ${i}`);
    }
  }

  build() {
    List() {
      LazyForEach(
        this.dataSource,
        (item: string) => {
          ListItem() {
            Text(item).fontSize(16)
          }
          .height(60)
        },
        (item: string) => item
      )
    }
    .width('100%')
    .height('100%')
  }
}
```

## 6. 组件生命周期

### 6.1 UIAbility 生命周期

```
onCreate → onWindowStageCreate → onForeground ↔ onBackground → onWindowStageDestroy → onDestroy
```

### 6.2 组件生命周期

```typescript
@Entry
@Component
struct LifecycleDemo {
  @State message: string = 'Hello';

  // 组件即将出现
  aboutToAppear() {
    console.info('组件即将出现，可初始化数据');
  }

  // 组件即将销毁
  aboutToDisappear() {
    console.info('组件即将销毁，可清理资源');
  }

  // 页面显示
  onPageShow() {
    console.info('页面显示');
  }

  // 页面隐藏
  onPageHide() {
    console.info('页面隐藏');
  }

  // 返回键按下
  onBackPress(): boolean {
    console.info('返回键按下');
    return false;  // false 表示不拦截，true 表示拦截
  }

  build() {
    Column() {
      Text(this.message)
    }
  }
}
```

| 回调                 | 触发时机             | 用途               |
| :------------------- | :------------------- | :----------------- |
| **aboutToAppear**    | 组件创建后、build 前 | 初始化数据         |
| **aboutToDisappear** | 组件销毁前           | 清理定时器、监听器 |
| **onPageShow**       | 页面显示时           | 刷新数据           |
| **onPageHide**       | 页面隐藏时           | 暂停操作           |
| **onBackPress**      | 返回键按下时         | 拦截返回行为       |
