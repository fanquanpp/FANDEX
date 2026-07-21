# 生命周期 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 生命周期钩子总览

**组合式 API 钩子对照**
```typescript
import {
  onBeforeMount,    // 挂载前
  onMounted,        // 已挂载
  onBeforeUpdate,   // 更新前
  onUpdated,        // 已更新
  onBeforeUnmount,  // 卸载前
  onUnmounted,      // 已卸载
  onErrorCaptured,  // 错误捕获
  onActivated,      // KeepAlive 激活
  onDeactivated,    // KeepAlive 停用
  onServerPrefetch  // SSR 预取
} from 'vue';
```

---

## 创建与挂载阶段

**onBeforeMount 挂载前**
`onBeforeMount(<callback>);`
```typescript
import { onBeforeMount } from 'vue';
onBeforeMount(() => {
  console.log('组件即将挂载,DOM 尚未生成');
});
```

**onMounted 已挂载**
`onMounted(<callback>);`
```typescript
import { ref, onMounted } from 'vue';
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  console.log('组件已挂载,DOM 可访问');
  inputRef.value?.focus();
});

onMounted(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  // 在 onUnmounted 中清理
});
```

---

## 更新阶段

**onBeforeUpdate 更新前**
`onBeforeUpdate(<callback>);`
```typescript
import { onBeforeUpdate } from 'vue';
onBeforeUpdate(() => {
  console.log('DOM 即将更新,此时访问的是旧 DOM');
});
```

**onUpdated 已更新**
`onUpdated(<callback>);`
```typescript
import { onUpdated } from 'vue';
onUpdated(() => {
  console.log('DOM 已更新完毕');
  // 注意:不要在此处修改响应式状态,可能引起死循环
});
```

---

## 卸载阶段

**onBeforeUnmount 卸载前**
`onBeforeUnmount(<callback>);`
```typescript
import { onBeforeUnmount } from 'vue';
let timer: number;

onBeforeUnmount(() => {
  console.log('组件即将卸载,实例仍可用');
  clearInterval(timer);
});
```

**onUnmounted 已卸载**
`onUnmounted(<callback>);`
```typescript
import { onUnmounted } from 'vue';
onUnmounted(() => {
  console.log('组件已卸载,所有指令解绑,事件监听移除');
});
```

---

## 错误处理

**onErrorCaptured 错误捕获**
`onErrorCaptured((err, instance, info) => <boolean | void>);`
```typescript
import { onErrorCaptured } from 'vue';
onErrorCaptured((err, instance, info) => {
  console.error('捕获错误:', err);
  console.log('组件实例:', instance);
  console.log('错误信息:', info);
  return false;  // 阻止继续向上传递
});
```

---

## KeepAlive 钩子

**onActivated 激活**
`onActivated(<callback>);`
```typescript
import { onActivated } from 'vue';
onActivated(() => {
  console.log('被 keep-alive 缓存的组件激活');
});
```

**onDeactivated 停用**
`onDeactivated(<callback>);`
```typescript
import { onDeactivated } from 'vue';
onDeactivated(() => {
  console.log('被 keep-alive 缓存的组件停用');
});
```

---

## 服务端渲染钩子

**onServerPrefetch SSR 预取**
`onServerPrefetch(<asyncCallback>);`
```typescript
import { onServerPrefetch } from 'vue';
onServerPrefetch(async () => {
  await fetchInitialData();
  console.log('服务端预取完成');
});
```

---

## 调试钩子

**onRenderTracked 渲染依赖追踪(开发)**
`onRenderTracked((e) => {});`
```typescript
import { onRenderTracked } from 'vue';
onRenderTracked((event) => {
  console.log('渲染依赖被追踪:', event);
  // event: { effect, target, key, type }
});
```

**onRenderTriggered 渲染依赖触发(开发)**
`onRenderTriggered((e) => {});`
```typescript
import { onRenderTriggered } from 'vue';
onRenderTriggered((event) => {
  console.log('渲染依赖被触发:', event);
  // event: { effect, target, key, type, newValue, oldValue }
});
```

---

## 钩子注册与清理

**多次注册同一钩子**
```typescript
onMounted(() => console.log('first'));
onMounted(() => console.log('second'));
// 两个回调都会按注册顺序执行
```

**注册顺序与组件生命周期**
```typescript
import { ref, onMounted } from 'vue';
const setup = () => {
  const state = ref(0);
  // setup 同步执行期间注册的钩子按顺序触发
  onMounted(() => console.log('A'));
  onMounted(() => console.log('B'));
  return { state };
};
```

**钩子中清理副作用**
```typescript
import { onMounted, onUnmounted } from 'vue';

function useInterval(callback: () => void, delay: number) {
  let timer: number | undefined;
  onMounted(() => {
    timer = setInterval(callback, delay);
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
}
```

---

## 选项式 API 钩子对照

| 选项式 API | 组合式 API |
|---|---|
| beforeCreate | setup() 同步部分 |
| created | setup() 同步部分 |
| beforeMount | onBeforeMount |
| mounted | onMounted |
| beforeUpdate | onBeforeUpdate |
| updated | onUpdated |
| beforeUnmount | onBeforeUnmount |
| unmounted | onUnmounted |
| errorCaptured | onErrorCaptured |
| activated | onActivated |
| deactivated | onDeactivated |
| serverPrefetch | onServerPrefetch |
| renderTracked | onRenderTracked |
| renderTriggered | onRenderTriggered |
