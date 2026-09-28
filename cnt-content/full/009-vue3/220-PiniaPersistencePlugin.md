---
order: 220
title: Pinia 持久化插件：刷新之后，状态还在
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 从阅读偏好刷新即丢讲起：先手写 $subscribe 加 localStorage 版理解原理，再接入 pinia-plugin-persistedstate v4（pick/omit、sessionStorage、serializer、beforeHydrate/afterHydrate），附 v3 paths 静默失效、SSR 无 window、setup store 的 $reset 三则调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/210-PiniaStateManagementDetailed'
  - 'vue3/250-PluginDevelopment'
  - 'vue3/350-Vue3SSR'
prerequisites:
  - 'vue3/210-PiniaStateManagementDetailed'
---

## 前置知识

- [Pinia 状态管理详解](/vue3/210-PiniaStateManagementDetailed)：会定义 store（选项式与 setup 两种写法），知道 $patch、$state；
- [自定义组合函数封装](/vue3/100-CustomComposableWrapper)：知道 watch / $subscribe 的用法。

## 学习目标

读完本文你将能够：

1. 用 $subscribe + localStorage 手写一版持久化，说清持久化插件的原理骨架；
2. 接入 pinia-plugin-persistedstate v4，用 pick / omit 控制落盘字段，按场景选 localStorage 或 sessionStorage；
3. 用 serializer 做序列化定制（加密），用 beforeHydrate / afterHydrate 做恢复前后处理；
4. 说出 v3 到 v4 的配置改名（paths 变 pick、beforeRestore 变 beforeHydrate），避免静默失效；
5. 处理 SSR 环境与 setup store 的 $reset 缺失这两个真实工程问题。

预计 50 到 70 分钟。

## 1. 你现在要解决什么问题

FANDEX 阅读页的偏好 store（字号、主题、上次读到的位置）用 Pinia 管理，体验很好——直到用户按下 F5：全部回到默认值。Pinia 的状态住在内存里，刷新即清空；而「用户偏好」的生命周期显然比页面长。需求很典型：

- 字号、主题：**跨会话保留**（关浏览器再开也在）；
- 播放器临时队列这类数据：只在本会话保留；
- token：要保留，但落盘方式要考虑安全（第 7 节）。

思路直白：状态变化时写入 Web Storage，启动时读回来。下面先手写，看懂原理再上插件。

## 2. 动手：先手写一版，看懂骨架

```ts
// stores/preferences.ts
import { defineStore } from 'pinia';

const KEY = 'fandex-preferences';

export const usePreferences = defineStore('preferences', {
  state: () => ({
    fontSize: 16,
    theme: 'light',
    lastPosition: 0,
  }),
  actions: {
    restore() {
      const saved = localStorage.getItem(KEY);
      if (saved) this.$patch(JSON.parse(saved));   // 启动时读回
    },
  },
});

// main.ts：创建 store 后立即恢复
const preferences = usePreferences(pinia);
preferences.restore();
```

写入侧用 $subscribe 订阅状态变化（210 篇提过，这里补上关键参数）：

```ts
// 在入口处全局订阅；detached: true 让订阅不随组件卸载而停止
usePreferences(pinia).$subscribe(
  (_mutation, state) => {
    localStorage.setItem(KEY, JSON.stringify(state));
  },
  { detached: true }
);
```

预期行为：改字号、切主题，Application 面板里 localStorage 的 `fandex-preferences` 实时更新；刷新后偏好原样恢复。手写版跑通了，也就看清了持久化的骨架：**订阅变化写盘 + 启动时读回**。但工程问题立刻冒出来：每个 store 都要复制这两段；临时字段不该落盘却全量写入了；恢复时机的钩子无处安放。这些正是插件要收编的。

## 3. 接入 pinia-plugin-persistedstate

```bash
npm install pinia-plugin-persistedstate
```

```ts
// main.ts
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
```

store 里加一行 `persist` 选项即启用（默认整库写入 localStorage，键名默认取 store 的 id）：

```ts
export const usePreferences = defineStore('preferences', {
  state: () => ({ fontSize: 16, theme: 'light', lastPosition: 0 }),
  persist: true,
});
```

预期行为与手写版一致，但两段样板代码都没了——插件的原理就是第 2 节的骨架封装：它给每个声明了 persist 的 store 自动挂 $subscribe 写盘、并在 store 初始化时读回水合（hydrate）。

## 4. 精细控制：v4 的 persist 配置

真实项目从不需要「整库落盘」。v4 的完整配置：

```ts
export const usePreferences = defineStore('preferences', {
  state: () => ({
    fontSize: 16,
    theme: 'light',
    lastPosition: 0,
    previewCache: null,   // 大体积临时数据，不该落盘
  }),
  persist: {
    key: 'fandex-preferences-v2',        // 自定义键名（换结构时顺手升版本，见第 7 节）
    storage: localStorage,               // 换 sessionStorage 即改为会话级
    pick: ['fontSize', 'theme', 'lastPosition'], // 白名单：只持久化这些字段
    // omit: ['previewCache'],           // 黑名单写法，与 pick 二选一
    beforeHydrate: (ctx) => {
      // 读回之前：可以做迁移、清理旧键
    },
    afterHydrate: (ctx) => {
      // 读回之后：可以做校验、上报
    },
  },
});
```

决策表：**localStorage** 跨会话（偏好、购物车）；**sessionStorage** 会话级（多标签互不干扰的场景、表单草稿防误关）；**自定义 StorageLike 对象**对接 cookies 或 IndexedDB：

```ts
persist: {
  storage: {
    getItem: (key) => Cookies.get(key) ?? null,
    setItem: (key, value) => Cookies.set(key, value, { expires: 7 }),
    removeItem: (key) => Cookies.remove(key),
  },
}
```

序列化默认是 JSON.stringify / parse，有特殊需求（压缩、加密）换 serializer：

```ts
persist: {
  serializer: {
    serialize: (state) => encrypt(JSON.stringify(state), SECRET),
    deserialize: (raw) => JSON.parse(decrypt(raw, SECRET)),
  },
}
```

setup store 写法的 persist 放在第三个参数：

```ts
export const useUser = defineStore('user', () => {
  const token = ref('');
  const name = ref('');
  return { token, name };
}, {
  persist: { pick: ['token'] },
});
```

## 5. 揭开插件的面纱：自己写一个十行版

Pinia 插件就是一个函数：每个 store 创建时被调用一次，参数里带 store 实例（250 篇展开插件系统，这里只拆持久化这一个）。手动实现核心逻辑，十行：

```ts
function miniPersist({ store }: { store: PiniaPluginContext['store'] }) {
  const key = `mini-${store.$id}`;
  const saved = localStorage.getItem(key);
  if (saved) store.$patch(JSON.parse(saved));            // 水合

  store.$subscribe((_m, state) => {
    localStorage.setItem(key, JSON.stringify(state));    // 写盘
  }, { detached: true });
}

pinia.use(miniPersist);
```

对照第 2 节的手写版：一模一样，只是搬进了插件作用域、按 store 自动生成键名。读完这段，persistedstate 的 key / pick / 钩子都不再神秘——全是这个骨架上的参数化。

## 6. 修改实验

实验一：把手写版换成插件版，用 DevTools Application 面板对比两版的键名与写入时机（插件版在首次创建 store 时就会写入一次）。

实验二：给 preferences 加 `previewCache` 临时字段并用 pick 排除，验证它变化时不触发 localStorage 更新。

实验三：把 theme 单独拆成第二个 store，storage 用 sessionStorage；开两个标签页验证——一个改主题另一个不受影响（对比 localStorage 版的同步行为，体会两种存储的隔离差异）。

## 7. 常见错误与调试实录

**错误一：v3 配置在 v4 里静默失效。** 升级插件后恢复行为消失，控制台却没有任何报错。原因：v4 把 `paths` 改名为 `pick`、`beforeRestore / afterRestore` 改名为 `beforeHydrate / afterHydrate`，旧键名被直接忽略——**配置拼错不报错是持久化类 bug 最阴险的地方**。三步定位：打开 Application 面板看键是否存在、值是否全量（全量说明 pick 没生效）；核对插件大版本与配置键名；迁移改名并跑一遍「改状态、刷新、验证」三连。读到老项目里的 paths / beforeRestore，要么降到对应大版本，要么跟着迁移，不要混用。

**错误二：SSR 环境报 `localStorage is not defined`。** 服务端渲染时模块顶层访问 localStorage 直接崩（350 篇的常规问题在插件场景的具体形态）。修法：持久化只发生在客户端，storage 按环境给值：

```ts
persist: {
  storage: typeof window !== 'undefined' ? localStorage : undefined,
}
```

undefined 时插件跳过存储操作。Nuxt 项目可直接用插件自带的 SSR 适配配置。

**错误三：setup store 里调 $reset 报错。** `store.$reset is not a function`——$reset 只有选项式 store 内置；setup store 的初始值分散在各个 ref 里，Pinia 不知道怎么「整体回到初始」。修法：自己实现 reset action，把初值抽成常量：

```ts
const initial = { token: '', name: '' };
export const useUser = defineStore('user', () => {
  const token = ref(initial.token);
  const name = ref(initial.name);
  function reset() {
    token.value = initial.token;
    name.value = initial.name;
  }
  return { token, name, reset };
});
```

**错误四（安全）：token 明文进 localStorage。** 便利背后是代价：localStorage 对同源任意 JS 可读，一个被注入的第三方脚本就能带走 token（XSS 的经典战果）。工程上的分级处理：高敏凭证优先 HttpOnly Cookie（前端 JS 完全读不到，配合 CSRF 防护）；确需前端持有的短期 token 用内存或 sessionStorage，配 serializer 加密只是提高门槛而非保险箱。落盘前先问一句：这个字段被偷了会怎样。

## 8. 实际项目中的使用场景

- **多 store 各自为政**：认证 store 只 pick token（自定义 storage 走 Cookie），购物车整库进 sessionStorage，偏好 store 走 localStorage——持久化策略按 store 定制而不是全局一刀切；
- **结构升级的版本迁移**：state 结构变更时把 key 升一版（`preferences-v2`），在 beforeHydrate 里检测旧键、转换格式、写新删旧——老用户的偏好无损升级；
- **调试与兜底**：恢复出来的数据可能是几个月前存的老结构，afterHydrate 里做字段校验，非法则 $reset 回默认值；退出登录时清键 + reset（手写版对应 `localStorage.removeItem(KEY)`）。

## 9. 小练习

预测题（3 分钟）：persist 配置写成 `persist: { pick: ['fontSize'], omit: ['theme'] }` 会怎样？（pick 与 omit 互斥，同时给出时行为不符合任一预期——实际以 pick 为准，omit 被忽略；配置冲突本身就是坏味道，ESLint 自定义规则或 code review 拦住。）

修改题（10 分钟）：给第 4 节的 preferences 加「恢复后校验」：fontSize 不在 12 到 28 区间、theme 不是 light/dark 之一时，$reset 回默认值并清掉坏数据。验收：手改 localStorage 里的值为 999 后刷新，界面回到默认字号。

修 Bug 题（15 分钟）：用户反馈「升级后偏好全丢了，但 localStorage 里还有旧数据」。旧键 `fandex-preferences` 存的是 `{ font_size: 18, mode: 'dark' }`（下划线命名）。用 key 版本 + beforeHydrate 写迁移逻辑：读旧键、字段改名、写入新键、删除旧键。

挑战题（30 分钟）：照第 5 节骨架写一个「带过期时间」的 mini 持久化插件：写入时附带时间戳，水合时超过 N 分钟则丢弃。验收：把过期时间调成 10 秒，刷新验证数据被丢弃并回默认值。

## 10. 与之前和之后的知识的关系

- 往前：210 篇的 store 定义与 $subscribe / $patch 是本篇的原料；100 篇的组合函数封装思想与插件参数化一脉相承；
- 往后：[插件开发](/vue3/250-PluginDevelopment) 把第 5 节的十行骨架扩展成完整插件体系；[Vue3 服务端渲染](/vue3/350-Vue3SSR) 系统讲 SSR 下的状态处理；[KeepAlive 缓存与生命周期](/vue3/160-KeepAliveCacheLifecycle) 处理「组件级」的状态保留，与「跨会话」的持久化互补。

## 11. 官方文档

- pinia-plugin-persistedstate：https://prazdevs.github.io/pinia-plugin-persistedstate/
- Pinia 插件：https://pinia.vuejs.cn/zh/core-concepts/plugins.html
- $subscribe 与 $onAction：https://pinia.vuejs.cn/zh/api/modules/pinia.html

## 12. 自我检查

- 能白板写出「订阅写盘 + 启动读回」的手写版，并指出 detached: true 的作用；
- 能说出 v4 配置五要素（key / storage / pick 或 omit / serializer / 两个 hydrate 钩子）各自解决什么问题；
- 能说出 v3 到 v4 的两组改名，并解释为什么这类失效不报错；
- 能对 token 落盘给出安全分级方案，说清加密序列化的边界；
- 面对刷新丢状态、SSR 报错、$reset 报错三个现场能各自给出修法。

## 本章总结

Pinia 持久化的骨架只有两步：$subscribe 写盘、启动时 $patch 读回；pinia-plugin-persistedstate 把它参数化成每个 store 一行 persist 配置。v4 的控制面：key 管版本、storage 管生命周期（localStorage 跨会话、sessionStorage 会话级、StorageLike 对接 Cookie）、pick/omit 管字段白黑名单（互斥）、serializer 管序列化（加密）、beforeHydrate/afterHydrate 管恢复前后。工程三坑：v3 改名静默失效（paths 到 pick、Restore 到 Hydrate）、SSR 必须按环境给 storage、setup store 要手写 reset。安全上，token 级凭证优先 HttpOnly Cookie，localStorage 加密只是门槛不是保险箱。

## 下一步

进入 [插件开发](/vue3/250-PluginDevelopment)：第 5 节那十行骨架就是 Pinia 插件的全部秘密——下一篇系统展开 context 的完整能力：注入新 state、包装 action、注册全局订阅，做出团队级的 store 增强层。
