---
order: 170
title: Provide 与 Inject
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从「给全站做主题切换」的真实场景学会 provide / inject：响应式注入、InjectionKey 类型安全、readonly 加修改方法的状态保护模式，以及异步调用与 SSR 单例污染两大坑。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/110-ComponentSystem'
  - 'vue3/100-CustomComposableWrapper'
  - 'vue3/210-PiniaStateManagementDetailed'
  - 'vue3/180-API'
prerequisites:
  - 'vue3/050-ReactiveSystem'
  - 'vue3/110-ComponentSystem'
---

## 前置知识

- [响应式系统](/vue3/050-ReactiveSystem)：知道 ref / reactive 的区别，理解「解构丢响应性」
- [组件系统](/vue3/110-ComponentSystem)：熟练使用 props 与 emit

## 学习目标

- 用 provide / inject 解决「props 钻透」（prop drilling）：数据隔了五层组件还要一层层传的问题
- 写出类型安全的注入：InjectionKey 让 provide 和 inject 两端共享类型，拼错键名直接编译报错
- 掌握「readonly 状态 + 修改方法」的保护模式：谁能改数据，由提供方说了算
- 避开两个高危坑：在异步代码里调用 provide / inject、SSR 下 app.provide 的单例污染
- 判断什么时候该用 provide / inject、什么时候该用 Pinia

## 场景：全站主题切换为什么传不动了

FANDEX 网页端右上角有主题切换按钮，切换后代码高亮、侧边栏、阅读进度条全部跟着变色。设想用 Vue 3 实现同样的功能：`theme` 状态在应用根部的 `ThemeProvider` 里，但要消费它的组件散落在组件树的各个角落——`ThemeToggle` 在头部，代码块在文章深处，侧边栏高亮在导航组件里。

用 props 传递的路径长这样：

```
ThemeProvider (持有 theme)
  → AppHeader (prop: theme，自己不用，只为了往下传)
    → Sidebar (prop: theme，也不用)
      → NavGroup (prop: theme，也不用)
        → NavItem (prop: theme，终于用了)
```

中间三层是纯粹的「搬运工」，每一层都要声明自己根本不关心的 prop——这就是 prop drilling。更糟的是以后加「字号偏好」「语言设置」，每条数据都要铺一条这样的管道。provide / inject 就是给这种情况准备的：提供方声明一次，任意深度的后代直接取用，中间层完全无感。

## 一、动手：先跑通最小版本

### 提供方

```vue
<!-- ThemeProvider.vue -->
<script setup>
import { ref, provide } from 'vue';

const theme = ref('dark');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

// 提供 ref 本身，不是 .value
provide('theme', theme);
provide('toggleTheme', toggleTheme);
</script>

<template>
  <div :class="`theme-${theme}`">
    <slot />
  </div>
</template>
```

### 消费方（任意深度的后代）

```vue
<!-- 深处的 CodeBlock.vue -->
<script setup>
import { inject } from 'vue';

const theme = inject('theme');           // 拿到的是 Ref<string>
const toggleTheme = inject('toggleTheme');
</script>

<template>
  <pre :class="`hljs-${theme}`">...</pre>
</template>
```

`theme` 是 ref，模板里自动解包，脚本里照常 `.value`。父组件改 `theme.value`，所有注入了它的组件自动更新——因为注入传的是**同一个响应式对象**，响应性跟着引用走。

### 第二个参数：默认值

不是所有组件都保证有 Provider 包着（比如单元测试里单挂一个组件）：

```ts
// 没找到注入时用默认值
const theme = inject('theme', ref('light'));

// 默认值创建成本高时用工厂形式，仅真的需要时才执行
const config = inject('config', () => createHeavyDefaultConfig(), true);
```

## 二、为什么： InjectionKey，把类型和键名绑在一起

字符串 key 有个隐蔽的问题：`provide('thene', ...)` 和 `inject('theme')` 拼错一个字母，运行时静默返回 undefined，没有任何报错，界面表现是「样式永远不变」——排查半天发现是手滑。

```ts
import type { InjectionKey, Ref } from 'vue';

// key 携带类型信息：注入的必须是 Ref<'dark' | 'light'>
export const ThemeKey: InjectionKey<Ref<'dark' | 'light'>> = Symbol('theme');
```

```ts
// 提供方：类型不匹配直接编译报错
provide(ThemeKey, ref('dark'));

// 消费方：类型自动推断，不需要手写注解
const theme = inject(ThemeKey); // Ref<'dark' | 'light'> | undefined
```

`InjectionKey<T>` 是 Symbol 的子类型，等于「运行时唯一标识 + 编译时类型契约」二合一。Symbol 本身还顺带解决了**命名冲突**：两个不同父组件都提供 `config` 时，字符串 key 会沿组件树就近覆盖，Symbol key 则天然不会撞。约定俗成的做法是把 key 集中放在独立文件里导出，一处定义、两端引用。

## 三、进阶：readonly 加修改方法——数据的主权在提供方

直接把可写的 ref 发给所有后代，等于任何人都能 `theme.value = 'xxx'` 改全局状态，出了 bug 无法定位是谁改的。标准模式是：**发只读的，收修改权**。

```ts
// composables/useTheme.ts
import { inject, provide, readonly, ref, type InjectionKey, type Ref } from 'vue';

type Theme = 'dark' | 'light';

interface ThemeContext {
  theme: Readonly<Ref<Theme>>;   // 消费方只能读
  toggleTheme: () => void;       // 想改？走这里
  setTheme: (t: Theme) => void;
}

const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme');

// 提供方在根部组件调用一次
export function provideTheme() {
  const theme = ref<Theme>('dark');

  const context: ThemeContext = {
    theme: readonly(theme),
    toggleTheme: () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
    },
    setTheme: (t) => { theme.value = t; },
  };

  provide(ThemeKey, context);
  return context;
}

// 消费方在任何后代组件里调用
export function useTheme(): ThemeContext {
  const ctx = inject(ThemeKey);
  if (!ctx) {
    throw new Error('useTheme() 必须在 provideTheme() 的后代组件中调用');
  }
  return ctx;
}
```

三层收益：类型安全（key 不外泄）、明确报错（忘包 Provider 时抛出人话而不是 undefined）、状态保护（readonly 包装的注入被修改时 Vue 会直接警告）。这对 provide / inject 函数——`provideTheme` / `useTheme`——是组件库和大型应用的标准形态。

> `readonly` 是浅的 deep 只读代理：`theme.value` 本身不能赋值。如果注入的是 reactive 对象，`readonly(state)` 返回的代理连嵌套属性都只读，子组件直接改会收到「Set operation on key failed: target is readonly」警告——这正是设计意图。

## 四、应用级 provide 与 Pinia 的边界

有些注入不属于某个子树，而是全应用级别的：HTTP 客户端实例、i18n 实例、当前用户信息。这时不用在根组件 provide，直接挂在应用上：

```ts
// main.ts
import { createApp, ref } from 'vue';
import App from './App.vue';
import { UserKey } from './composables/useUser';

const app = createApp(App);
app.provide(UserKey, ref(null)); // 全应用任何组件都能 inject
app.mount('#app');
```

什么时候该停，改用 Pinia？一个实用的判断：

| 信号 | 选择 |
| :--- | :--- |
| 一个子树的内部协作（Form 传给 FormItem） | provide / inject |
| 提供方与消费方明确是「祖先 - 后代」关系 | provide / inject |
| 多个不相干子树共享、需要在 DevTools 里审查、需要 SSR 请求级隔离 | Pinia |
| 开发者工具里想看状态变化时间线 | Pinia |

provide / inject 的调试可见性远弱于 Pinia，跨子树的全局状态别用它硬扛。

## 五、坑点与自检

### 坑一：provide 传了 .value

```ts
const theme = ref('dark');
provide('theme', theme.value); // 传的是字符串 'dark'，从此断开
```

响应性建立在「共享同一个响应式对象」上，传值等于发快照。永远 provide ref / reactive 本身。

### 坑二：异步之后才调用 provide / inject

```ts
// 错误：await 之后当前组件实例已经丢失
async setup() {
  const data = await fetchData();
  provide('data', data); // 报错或静默失败
}
```

provide / inject 依赖「当前正在初始化的组件实例」，这个引用只在 setup 同步执行期间存在。修复：先 provide 一个 ref，异步结果填进去：

```ts
setup() {
  const data = ref(null);
  provide('data', data);
  onMounted(async () => {
    data.value = await fetchData();
  });
}
```

同理，自定义 composable 里调用 inject 也必须保持同步调用链——在 setTimeout / 事件回调里 inject 一律失效。

### 坑三：SSR 单例污染

`app.provide` 挂在应用实例上。Node 服务端如果只创建一次 app、每个请求都往里写用户数据，用户 A 的数据会漏给用户 B——这是安全事故而不仅是 bug。规则：**服务端每个请求 `createSSRApp` 一个新实例**，请求级数据 provide 到请求级实例上。客户端每个页面加载本来就会新建应用，没有这个问题。

### 坑四：默认值副作用

`inject('config', { features: createDefaultFeatures() })` 的第二个参数无论用不用都会先求值。重默认值用工厂形式（第三个参数 `true`），真正需要时才执行。

### 自检

1. 为什么 `provide('theme', theme.value)` 会丢响应性？响应性靠什么维持？
2. InjectionKey 一次性解决哪两个问题？
3. 消费方想改注入的状态，规范做法是什么？直接改 readonly 注入会怎样？
4. SSR 下 app.provide 为什么危险？正确姿势是什么？

## 练习

1. 把本文的主题系统补完整：`provideTheme` + `useTheme` 两个函数、三个消费组件（按钮、卡片、代码块），运行后验证切换主题时三处同步更新；再故意在没包 Provider 的组件里调 `useTheme`，确认报错信息友好。
2. 实现一个 `FormKey` / `FormItemKey` 双注入的表单系统：`Form` provide 校验函数注册表，`FormItem` 注册自己的校验规则，`Form` 提交时统一执行。这是 Element Plus 内部的真实模式。
3. 写一个测试：用 `@vue/test-utils` 挂载消费组件，通过 `global.provide`（或包一层 Provider 组件）注入 mock 的主题上下文，断言主题类名正确渲染。

## 下一步

- [Pinia 状态管理](/vue3/210-PiniaStateManagementDetailed)：跨子树全局状态的正规军
- [自定义 Composable 封装](/vue3/100-CustomComposableWrapper)：provideTheme / useTheme 这对函数的通用化写法
- [Composition API](/vue3/180-API)：provide / inject 在整套 API 中的位置
