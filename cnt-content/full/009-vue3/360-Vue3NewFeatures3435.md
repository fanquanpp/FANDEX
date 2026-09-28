---
order: 360
title: Vue 3.4 / 3.5 新特性
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从一个真实组件库升级场景学会 Vue 3.4 与 3.5 的高频新特性：defineModel、同名简写、响应式 props 解构、useTemplateRef、useId、watch 暂停恢复与 onWatcherCleanup，附 3.6 Vapor 进展。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'vue3/110-ComponentSystem'
  - 'vue3/060-ComputedCacheWatchTiming'
  - 'vue3/370-VaporMode'
  - 'vue3/310-Vue3WebComponents'
prerequisites:
  - 'vue3/020-Vue3QuickStartGuide'
  - 'vue3/050-ReactiveSystem'
---

## 前置知识

- [第一个组件](/vue3/020-Vue3QuickStartGuide)：会写 `<script setup>` 组件、知道 props 与 emit 怎么用
- [响应式系统](/vue3/050-ReactiveSystem)：知道 `ref` / `reactive` 的区别，理解依赖收集的大致原理

## 学习目标

- 用 `defineModel` 把「双 prop + emit」的模板代码缩成一行，并处理 `v-model` 修饰符
- 用 3.5 的响应式 props 解构、`useTemplateRef`、`useId` 替代三种旧写法
- 用 `watch` 的 `once`、`pause` / `resume` 与 `onWatcherCleanup` 写出更干净的侦听逻辑
- 知道 3.4 / 3.5 在性能上改了什么（模板解析提速、大数组深度监听提速、内存下降）
- 了解 3.6（Vapor）当前的版本状态与升级策略

## 场景：升级一个 2023 年的组件库

假设你在维护 FANDEX 网页端里「前端实验室」用到的一套表单组件。仓库还是 Vue 3.3 时代写的，到处是这样的双向绑定样板：

```vue
<!-- VersionInput.vue，Vue 3.3 时代的写法 -->
<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

function onInput(event) {
  emit('update:modelValue', event.target.value);
}
</script>

<template>
  <input :value="modelValue" @input="onInput" />
</template>
```

父组件每多一个 `v-model` 字段，这段样板就要复制一份。2026 年的新项目早就不用这么写了：Vue 3.4 把 `defineModel` 转正为稳定 API，Vue 3.5 又补上了 props 解构、模板引用、唯一 ID 三块长期痛点。本文带你把这套旧组件逐步改成 3.4 / 3.5 风格，顺带讲清每个新特性解决的是什么问题。

## 一、defineModel：把双向绑定压成一行

### 动手：先做最简单的版本

```vue
<!-- VersionInput.vue，Vue 3.4+ -->
<script setup>
const model = defineModel();
</script>

<template>
  <input v-model="model" />
</template>
```

父组件用法不变：

```vue
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue';
import VersionInput from './VersionInput.vue';

const version = ref('');
</script>

<template>
  <VersionInput v-model="version" />
</template>
```

### 为什么一行就够了

`v-model="version"` 编译后本来就是 `:model-value="version"` 加 `@update:model-value="version = $event"`。以前这两个「协议」要靠你手写 props 和 emits 声明来对接，现在 `defineModel()` 让编译器替你声明，并返回一个读写都会触发更新的 ref——写 `model.value = x` 内部就是 emit。

### 命名模型：一个组件多个 v-model

```vue
<script setup>
const firstName = defineModel('firstName');
const lastName = defineModel('lastName');
</script>

<template>
  <input v-model="firstName" placeholder="姓" />
  <input v-model="lastName" placeholder="名" />
</template>
```

```vue
<NameForm v-model:first-name="a" v-model:last-name="b" />
```

### 类型、默认值与修饰符

```vue
<script setup>
const count = defineModel({ type: Number, default: 0 });

// 第二个返回值是修饰符对象，对应 v-model.trim 里的 .trim
const [text, modifiers] = defineModel({ default: '' });

function onBlur() {
  if (modifiers.trim) {
    text.value = text.value.trim();
  }
}
</script>
```

### 坑点

- `defineModel` 返回的是 ref，模板里直接 `v-model` 用，脚本里别忘了 `.value`。
- 父组件必须绑定响应式数据（`ref` 或 state 里的字段）。如果父组件传的是普通常量，子组件写入时只更新不了任何东西，且开发环境会有警告。
- 修饰符处理是「读时约定」：`modifiers.trim` 只告诉你父组件用了 `.trim`，真正裁剪逻辑要你自己写，框架不会替你 trim。

### 自检

把 `defineModel` 版本编译回等价的 3.3 代码，你应该能默写出：`props` 里的 `modelValue`、`emits` 里的 `update:modelValue`。写不出来就回上一节再看一遍。

## 二、v-bind 同名简写：属性名单词只出现一次

3.4 之前，属性名和变量名相同时也要写两遍：`:src="src"`。3.4 起可以直接写 `:src`：

```vue
<script setup>
const src = '/logo.svg';
const alt = 'FANDEX 徽标';
</script>

<template>
  <img :src :alt />
</template>
```

适合「壳组件透传一堆同名字段」的场景。可读性下降的边界在于一行里挤了太多简写——只对同名的用简写，不同名的一律写全，团队 review 时一眼能分清哪个是变量、哪个是字符串。

## 三、响应式 props 解构（3.5）：默认值不再需要 withDefaults

### 动手

```vue
<script setup lang="ts">
const { count = 0, msg = 'hello' } = defineProps<{
  count?: number;
  msg?: string;
}>();
</script>

<template>
  <p>{{ count }} / {{ msg }}</p>
</template>
```

### 为什么解构后还是响应式的

3.5 之前，`props` 一旦被解构成普通变量，就与响应式系统断开了——这就是当年必须搞出 `withDefaults`、且模板里仍要写 `props.count` 的原因。3.5 的编译器在解构位置插入了响应式访问，`count` 在编译产物里仍然指向 `props.count`，所以父组件更新后子组件照常重渲染。默认值也回归了 JavaScript 本身的解构语法，`withDefaults` 在新代码里可以退休。

### 坑点

- 解构发生在编译时，`watch(() => count, ...)` 这类写法要小心：编译器能处理传入解构变量的多数场景，但把解构结果塞进普通对象再读，就会丢响应式。拿不准时 `watch(() => props.count)` 永远不会错。
- 这是 3.5 的编译器行为，**升级编译器**（create-vue / @vitejs/plugin-vue 新版本）即可用，不要求运行时升到 3.5。但建议 vue 与编译工具链一起升，避免版本错配。

## 四、useTemplateRef（3.5）：拿 DOM 引用不再靠「同名 ref 变量」魔法

### 动手：聚焦一个输入框

```vue
<script setup>
import { useTemplateRef, onMounted } from 'vue';

const inputRef = useTemplateRef('my-input');

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <input ref="my-input" />
</template>
```

### 为什么要有这个 API

旧写法是声明一个**与 ref 属性同名**的 `ref(null)` 变量，靠模板编译器做「名字配对」。三个毛病：变量必须叫那个名字（不直观）、类型推断弱、配合 `v-for` 时容易拿错。`useTemplateRef` 把配对变成显式参数，名字只是字符串标签，返回值类型也由编译器推断成对应的 DOM 类型。

### 坑点

- 参数必须与模板里 `ref="my-input"` 的字符串完全一致，拼错了运行时不报错、拿到的是 `null`。
- 挂载前（比如 `setup` 同步阶段）`inputRef.value` 就是 `null`，访问 DOM 要放在 `onMounted` 或事件回调里。

### 自检

新建一个组件，要求：两个输入框，页面加载后焦点落在第二个。用 `useTemplateRef` 写完再对照：你是不是给两个 ref 起了不同的名字，并只在 `onMounted` 里访问了 DOM？

## 五、useId（3.5）：label 和 input 的可靠配对

表单可访问性要求 `<label for>` 与 `<input id>` 一一对应。手写 `id="name-input-1"` 在组件复用和 SSR 场景下必然撞车：

```vue
<script setup>
import { useId } from 'vue';

const id = useId();
</script>

<template>
  <label :for="id">仓库地址</label>
  <input :id="id" />
</template>
```

`useId` 保证同一应用内唯一，且服务端与客户端渲染结果一致（SSR 不再水合警告）。FANDEX 网页端的 islands 是多实例共存的环境，这类 ID 生成必须由框架统一分配，手写计数器迟早出事。

衍生技巧：需要一组关联 ID（比如 `aria-describedby`）时，调两次 `useId` 各拿一个，不要手动拼接。

## 六、watch 的三个新能力（3.4 / 3.5）

### once：只触发一次（3.4）

```ts
import { watch } from 'vue';

watch(filters, (v) => {
  console.log('筛选条件首次确定', v);
}, { once: true });
```

替代「手动记个 flag 再 stop」的写法。

### pause / resume：暂停与恢复（3.5）

```ts
const { pause, resume, stop } = watch(query, doSearch);

// 拉起编辑态时冻结自动搜索
pause();
// 保存后恢复
resume();
```

3.5 之前 watcher 只能停不能停后再启，要暂停就得销毁重建，状态还得自己保存。

### onWatcherCleanup：清理逻辑放回调旁边（3.5）

```ts
import { watch, onWatcherCleanup } from 'vue';

watch(source, () => {
  const timer = setInterval(poll, 1000);
  onWatcherCleanup(() => clearInterval(timer));
});
```

下一次回调触发或 watcher 停止时，清理函数自动执行。它解决的是「清理代码离创建代码太远」的问题——旧写法里 `onCleanup` 是回调第三个参数，深层嵌套时容易漏；`onWatcherCleanup` 是显式导入的函数，在任何帮助函数里都能调，写在组合式函数里尤其顺手。

### 坑点与自检

- `pause()` 只暂停回调，不取消已经在跑的异步任务。轮询暂停要配合 `onWatcherCleanup` 或业务层 flag，别以为 pause 能掐断 setTimeout。
- 自检：写一个「输入停止 500ms 后搜索，搜索中切换关键词要取消上一次请求」的逻辑，只允许用 `watch` + `onWatcherCleanup`，不许用 abort 之外的手动 flag。能写对，说明清理时机理解到位了。

## 七、性能层面的改进：知道有这回事即可

这些是「白拿」的优化，不需要你改代码，但要知道量级，免得重复造轮子：

| 改进 | 版本 | 说明 |
| :--- | :--- | :--- |
| 模板解析器重写（状态机解析） | 3.4 | 解析效率约 2 倍，构建产物同时更小 |
| SSR 渲染路径优化 | 3.4 | 服务端渲染吞吐提升 |
| 深层响应式数组提速 | 3.5 | 大数组深度操作最快约 10 倍 |
| 内存占用下降 | 3.5 | 响应式 internals 重构，大型响应式数组场景内存最多省约 56% |
| computed / watch 依赖追踪重构 | 3.5 | API 不变，行为更精确 |

结论：性能敏感的场景（长列表、大表单状态树）升级到 3.5.x 就有收益，不需要切第三方方案。

## 八、其他值得知道的点

### Teleport 的 defer（3.5）

`<Teleport defer to="#target">` 会等目标容器完成本轮挂载后再传送，解决「目标节点和 Teleport 在同一次更新里渲染、目标还不存在」的经典报错。

### 自定义元素增强（3.5）

`defineCustomElement` 场景新增 `useHost()`（拿宿主元素）与 `useShadowRoot()`（拿 Shadow Root），Vue 组件发布成 Web Component 时操作宿主样式和事件不再需要绕路。FANDEX 里若有组件要嵌入非 Vue 页面，这条是正路，详见[自定义元素](/vue3/310-Vue3WebComponents)。

### 3.4 顺带的稳定性确认

Teleport、KeepAlive 等内置组件在 3.4 已稳定；Suspense 保持实验性状态——生产代码里继续用 `defineAsyncComponent` 加 loading 组件，别把 Suspense 当稳定 API 依赖。

## 九、3.6 与 Vapor：现在的状态和你的升级策略

截至 2026-09（以 npm dist-tags 为准）：Vue 稳定线是 3.5.x，3.6 处于 RC 阶段，核心特性即 [Vapor 模式](/vue3/370-VaporMode)——编译期直接生成定向 DOM 操作，跳过虚拟 DOM。组件 API 不变，是编译策略的变化。

生产策略三句话：

1. 业务项目留在 3.5.x，等 3.6 稳定版。
2. 3.6 稳定后，先在非关键项目验证组件库兼容性（重点盯依赖 `getCurrentInstance` 等底层 API 的库）。
3. 升级本身是小版本行为：`npm install vue@latest` 配合迁移公告即可，3.4 / 3.5 的新特性都是增量 API，没有破坏性变更需要先处理。

## 练习

1. 把本文开头那段 3.3 风格的 `VersionInput` 重写成 `defineModel` 版本，并支持 `v-model.trim`（父组件写 `<VersionInput v-model.trim="text" />` 时自动去首尾空格）。
2. 写一个 `SearchBox` 组件：`useId` 生成 label 关联、`useTemplateRef` 聚焦、`watch` 加 500ms 防抖、用 `onWatcherCleanup` 清理定时器。
3. 用 `defineModel('firstName')` / `defineModel('lastName')` 做一个双字段组件，父组件分别绑定两个不同的 ref，验证互不干扰。

## 下一步

- [Vapor 模式与 Vue 3.6 展望](/vue3/370-VaporMode)：编译策略变化的原理与迁移路线
- [组件系统](/vue3/110-ComponentSystem)：把 defineModel 放回组件通信全景里理解
- [Computed 缓存与 watch 时机](/vue3/060-ComputedCacheWatchTiming)：watch 暂停恢复之外的时机细节
