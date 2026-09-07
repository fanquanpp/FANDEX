---
order: 370
title: Vue 3.4 / 3.5 新特性
module: 'vue3'
category: 前端技术
difficulty: beginner
description: Vue 3.4 / 3.5 新特性 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## Vue 3.4 defineModel

**基本写法：defineModel 简化 v-model**
`const <model> = defineModel()`
```vue
<!-- 替代手动 props 与 emits -->
<script setup>
const model = defineModel();
</script>
<template><input v-model="model" /></template>
```

---

**基本写法：命名模型**
`const <model> = defineModel('<名称>')`
```vue
<!-- 多个 v-model -->
<script setup>
const firstName = defineModel('firstName');
const lastName = defineModel('lastName');
</script>
```

---

**基本写法：配置类型与默认值**
`const <model> = defineModel({ type: <类型>, default: <值> })`
```vue
<!-- 声明类型 -->
<script setup>
const count = defineModel({ type: Number, default: 0 });
</script>
```

---

**基本写法：解构获取修饰符**
`const [<model>, <modifiers>] = defineModel()`
```vue
<!-- 获取 v-model 修饰符 -->
<script setup>
const [model, modifiers] = defineModel();
if (modifiers.trim) model.value = model.value.trim();
</script>
```

---

## Vue 3.4 v-bind 同名简写

**基本写法：属性名与变量名相同省略值**
`<img :src :alt>`
```vue
<!-- 简写形式 -->
<script setup>
import { ref } from 'vue';
const src = ref('/a.jpg');
const alt = ref('图片');
</script>
<template><img :src :alt /></template>
```

---

## Vue 3.4 defineModel 双向绑定

**基本写法：父组件使用 v-model**
`<子组件 v-model="<值>" />`
```vue
<!-- 父组件 -->
<script setup>
import { ref } from 'vue';
import Child from './Child.vue';
const text = ref('');
</script>
<template><Child v-model="text" /></template>
```

---

## Vue 3.5 响应式 props 解构

**基本写法：直接解构 defineProps 保持响应**
`const { <字段> = <默认值> } = defineProps(['<字段>'])`
```vue
<!-- Vue 3.5 编译器自动保持响应式 -->
<script setup>
const { count = 0, msg = 'hello' } = defineProps(['count', 'msg']);
console.log(count);
</script>
```

---

**基本写法：类型声明带默认值**
`const { <字段> = <默认> } = defineProps<{ <字段>?: <类型> }>()`
```vue
<!-- TypeScript 写法 -->
<script setup lang="ts">
const { count = 0 }: { count?: number } = defineProps<{ count?: number }>();
</script>
```

---

## Vue 3.5 useTemplateRef

**基本写法：语义化获取模板引用**
`const <ref> = useTemplateRef('<名称>')`
```vue
<!-- 替代 ref(null) -->
<script setup>
import { useTemplateRef, onMounted } from 'vue';
const inputRef = useTemplateRef('my-input');
onMounted(() => inputRef.value?.focus());
</script>
<template><input ref="my-input" /></template>
```

---

## Vue 3.5 useId

**基本写法：生成唯一 ID**
`const <id> = useId()`
```vue
<!-- SSR 一致的唯一 ID -->
<script setup>
import { useId } from 'vue';
const id = useId();
</script>
<template>
  <label :for="id">用户名</label>
  <input :id="id" />
</template>
```

---

**基本写法：生成多个相关 ID**
`const <id1> = useId(); const <id2> = useId()`
```vue
<!-- 表单元素关联 -->
<script setup>
import { useId } from 'vue';
const labelId = useId();
const inputId = useId();
</script>
```

---

## Vue 3.4 watch once 选项

**基本写法：watch 只触发一次**
`watch(<源>, <回调>, { once: true })`
```ts
// 监听一次后自动停止
watch(count, (n) => console.log('首次变化', n), { once: true });
```

---

## Vue 3.5 watch 暂停与恢复

**基本写法：手动暂停恢复监听**
`const { pause, resume } = watch(<源>, <回调>)`
```ts
// 返回控制方法
const { pause, resume, stop } = watch(count, cb);
pause();
resume();
stop();
```

---

## Vue 3.5 watch 深度监听性能优化

**基本写法：深度监听性能提升 10 倍**
`watch(<对象>, <回调>, { deep: true })`
```ts
// 大型对象深度监听更快
watch(bigObj, (n) => update(n), { deep: true });
```

---

## Vue 3.5 shallowRef 数组优化

**基本写法：shallowRef 性能提升**
`const <ref> = shallowRef(<数组>)`
```ts
// 大型数组读取更快
const list = shallowRef(hugeArray);
```

---

## Vue 3.5 内存优化

**基本写法：响应式系统内存占用减少**
`reactive(<对象>) // 内存更省`
```ts
// 内部优化使内存占用下降约 60%
const state = reactive({ items: [] });
```

---

## Vue 3.5 onWatcherCleanup

**基本写法：watch 内注册清理**
`watch(<源>, (<n>, <old>, <onCleanup>) => <逻辑>)`
```ts
// 替代 onCleanup 参数
watch(count, (n, old, onCleanup) => {
  const timer = setInterval(tick, 1000);
  onCleanup(() => clearInterval(timer));
});
```

---

**基本写法：导入式 onWatcherCleanup**
`import { onWatcherCleanup } from 'vue'`
```ts
// 在 watch 回调外注册
import { onWatcherCleanup } from 'vue';
watch(count, () => {
  const timer = setInterval(tick, 1000);
  onWatcherCleanup(() => clearInterval(timer));
});
```

---

## Vue 3.5 useHost

**基本写法：获取自定义元素宿主**
`const <host> = useHost()`
```ts
// 用于自定义元素场景
import { useHost } from 'vue';
const host = useHost();
```

---

## Vue 3.5 useShadowRoot

**基本写法：访问 shadow root**
`const <root> = useShadowRoot()`
```ts
// 自定义元素 Shadow DOM 操作
import { useShadowRoot } from 'vue';
const root = useShadowRoot();
```

---

## Vue 3.4 性能改进

**基本写法：模板解析器速度提升**
`compile(<模板>) // 解析更快`
```ts
// Vue 3.4 模板编译速度提升约 2 倍
import { compile } from 'vue';
```

---

**基本写法：SSR 流式渲染改进**
`renderToStream(<app>) // 性能提升`
```ts
// 服务端渲染吞吐量提升约 3 倍
import { renderToStream } from 'vue/server-renderer';
```

---

## Vue 3.4 defineModel 双向绑定原理

**基本写法：编译为 props 与 emits**
`<子组件 v-model="<值>" /> // 等价 :model-value + @update`
```vue
<!-- 编译产物等价 -->
<Child :model-value="value" @update:model-value="value = $event" />
```

---

## Vue 3.4 内置组件改进

**基本写法：Teleport 与 KeepAlive 等内置组件 API 稳定；Suspense 仍为实验性**
`<Teleport to="<选择器>">`
```vue
<!-- 内置组件 API 稳定 -->
<Teleport to="body"><Modal /></Teleport>
```

---

## Vue 3.4 defineModel 与修饰符

**基本写法：自定义修饰符处理**
`const [<model>, <modifiers>] = defineModel()`
```vue
<!-- 处理 v-model.trim 等 -->
<script setup>
const [model, modifiers] = defineModel();
watch(model, (v) => {
  if (modifiers.trim) model.value = v.trim();
});
</script>
```

---

## Vue 3.4 TypeScript 改进

**基本写法：更精确的类型推断**
`defineProps<{ <字段>: <类型> }>()`
```ts
// 类型推断更准确
defineProps<{ name: string; age?: number }>();
```

---

## Vue 3.4 错误处理改进

**基本写法：errorHandler 更详细**
`app.config.errorHandler = (<err>, <instance>, <info>) => <逻辑>`
```ts
// info 包含更多上下文
app.config.errorHandler = (err, instance, info) => {
  console.error(err, info);
};
```

---

## Vue 3.5 Reactive Proxy 减少

**基本写法：减少不必要的 Proxy**
`reactive(<对象>) // 仅对需要响应的属性代理`
```ts
// 性能优化减少代理层级
const state = reactive({ a: { b: 1 } });
```

---

## Vue 3.5 自定义元素改进

**基本写法：defineCustomElement 增强**
`defineCustomElement(<组件>)`
```ts
// 自定义元素支持更多特性
import { defineCustomElement } from 'vue';
const MyElement = defineCustomElement(MyComponent);
customElements.define('my-element', MyElement);
```

---

## Vue 3.5 Teleport 改进

**基本写法：Teleport deferred 属性**
`<Teleport defer to="<选择器>">`
```vue
<!-- 等目标挂载后再传送 -->
<Teleport defer to="#modal-container">
  <Modal />
</Teleport>
```

---

## Vue 3.5 Suspense 改进

**基本写法：Suspense 与异步组件**
`<Suspense> <AsyncComponent /> </Suspense>`
```vue
<!-- 异步组件等待改进 -->
<Suspense fallback={<Spinner />}>
  <AsyncComponent />
</Suspense>
```

---

## 版本迁移注意

**基本写法：检查依赖兼容性**
`npm install vue@3.5`
```bash
# 升级到 Vue 3.5
npm install vue@3.5 vue-router pinia
```

---

**基本写法：使用迁移指南**
`https://blog.vuejs.org/posts/vue-3-5`
```bash
# 参考官方迁移指南
# 大部分 API 向后兼容
```
