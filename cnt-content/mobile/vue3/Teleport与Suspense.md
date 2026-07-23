# Teleport + Suspense 组件语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Teleport 传送门

**Teleport 基础用法**
`<Teleport to="<target>">...</Teleport>`
```vue
<template>
  <Teleport to="body">
    <div class="modal">弹窗内容</div>
  </Teleport>

  <Teleport to="#modals">
    <div>传送到指定容器</div>
  </Teleport>

  <Teleport :to="dynamicTarget">
    <div>动态目标</div>
  </Teleport>
</template>
```

**Teleport 禁用传送**
`<Teleport to="<target>" :disabled="<flag>">`
```vue
<Teleport to="body" :disabled="isInline">
  <div>条件传送</div>
</Teleport>

<script setup>
import { ref } from 'vue';
const isInline = ref(false);
</script>
```

**Teleport 多个目标**
```vue
<Teleport to="body">
  <Modal v-if="showA" />
</Teleport>

<Teleport to="body">
  <Modal v-if="showB" />
</Teleport>
<!-- 多个 Teleport 到同一目标按顺序追加 -->
```

**Teleport 配合组件**
```vue
<template>
  <button @click="show = true">打开</button>
  <Teleport to="body">
    <Modal v-if="show" @close="show = false">
      <h2>标题</h2>
      <p>内容</p>
    </Modal>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import Modal from './Modal.vue';
const show = ref(false);
</script>
```

---

## Teleport 事件与样式

**Teleport 内事件冒泡**
```vue
<template>
  <div @click="onParentClick">
    <Teleport to="body">
      <div @click="onModalClick">点击</div>
      <!-- 点击事件在 DOM 上冒泡到 body,但 Vue 逻辑冒泡仍按组件树 -->
    </Teleport>
  </div>
</template>
```

**Teleport 与样式作用域**
```vue
<style scoped>
.modal {
  background: white;  /* 即使传送走,scoped 样式仍生效 */
}
</style>
```

---

## Suspense 异步组件

**Suspense 基础用法**
```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
const AsyncComponent = defineAsyncComponent(() => import('./Async.vue'));
</script>
```

**Suspense 多异步组件**
```vue
<Suspense>
  <template #default>
    <Header />      <!-- 都是异步组件 -->
    <Content />
    <Footer />
  </template>
  <template #fallback>
    <PageSkeleton />
  </template>
</Suspense>
```

**Suspense 配合 async setup**
```vue
<!-- AsyncPage.vue -->
<script setup>
import { ref } from 'vue';

// setup 可以是 async
const data = await fetch('/api/data').then(r => r.json());
</script>

<template>
  <div>{{ data }}</div>
</template>

<!-- 父组件 -->
<Suspense>
  <AsyncPage />
  <template #fallback>
    <Spinner />
  </template>
</Suspense>
```

---

## Suspense 事件

**Suspense 事件处理**
```vue
<template>
  <Suspense
    @resolve="onResolve"
    @pending="onPending"
    @fallback="onFallback"
  >
    <template #default>
      <AsyncComp />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
function onResolve() {
  console.log('异步组件加载完成');
}
function onPending() {
  console.log('开始加载异步组件');
}
function onFallback() {
  console.log('显示 fallback');
}
</script>
```

---

## Suspense 嵌套

**Suspense 嵌套**
```vue
<Suspense>
  <template #default>
    <Layout>
      <Suspense>
        <template #default>
          <AsyncWidget />
        </template>
        <template #fallback>
          <WidgetSkeleton />
        </template>
      </Suspense>
    </Layout>
  </template>
  <template #fallback>
    <PageSkeleton />
  </template>
</Suspense>
```

---

## 异步组件加载错误

**defineAsyncComponent 错误处理**
```typescript
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,       // 显示 loading 前延迟
  timeout: 3000,    // 超时显示 error
  onError(err, retry, fail, attempts) {
    if (attempts <= 3) {
      retry();
    } else {
      fail();
    }
  }
});
```

**onErrorCaptured 捕获异步错误**
```vue
<template>
  <Suspense>
    <AsyncComp v-if="!error" />
    <ErrorComp v-else :error="error" />
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';
const error = ref(null);

onErrorCaptured((err) => {
  error.value = err;
  return false;  // 阻止继续向上传递
});
</script>
```

---

## 综合应用

**Modal + Teleport + Transition**
```vue
<template>
  <button @click="open">打开</button>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-mask" @click.self="close">
        <div class="modal">
          <slot />
          <button @click="close">关闭</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
const isOpen = ref(false);
const open = () => { isOpen.value = true; };
const close = () => { isOpen.value = false; };
</script>

<style>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
```

**异步数据 + Suspense + Skeleton**
```vue
<!-- AsyncList.vue -->
<script setup>
const items = await fetch('/api/items').then(r => r.json());
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>

<!-- 父组件 -->
<template>
  <Suspense>
    <AsyncList />
    <template #fallback>
      <ul>
        <li v-for="n in 5" :key="n" class="skeleton">Loading...</li>
      </ul>
    </template>
  </Suspense>
</template>
```
