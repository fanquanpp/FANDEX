# KeepAlive 组件语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## KeepAlive 基础

**KeepAlive 缓存组件**
```vue
<template>
  <KeepAlive>
    <component :is="currentComponent" />
  </KeepAlive>
</template>

<script setup>
import { ref, computed } from 'vue';
import CompA from './CompA.vue';
import CompB from './CompB.vue';

const tab = ref('A');
const currentComponent = computed(() => tab.value === 'A' ? CompA : CompB);
</script>
```

**KeepAlive 配合 router-view**
```vue
<template>
  <KeepAlive>
    <router-view />
  </KeepAlive>
</template>
```

---

## Props

**include 包含**
`<KeepAlive include="<name1>, <name2>">`
```vue
<!-- 缓存指定名称的组件 -->
<KeepAlive include="CompA,CompB">
  <component :is="current" />
</KeepAlive>

<!-- 数组形式 -->
<KeepAlive :include="['CompA', 'CompB']">
  <component :is="current" />
</KeepAlive>

<!-- 正则 -->
<KeepAlive :include="/^Comp/">
  <component :is="current" />
</KeepAlive>
```

**exclude 排除**
`<KeepAlive exclude="<name1>, <name2>">`
```vue
<KeepAlive exclude="CompC">
  <component :is="current" />
</KeepAlive>

<KeepAlive :exclude="['CompC', 'CompD']">
  <component :is="current" />
</KeepAlive>

<KeepAlive :exclude="/^Admin/">
  <component :is="current" />
</KeepAlive>
```

**max 最大缓存数**
`<KeepAlive :max="<number>">`
```vue
<KeepAlive :max="10">
  <component :is="current" />
</KeepAlive>
<!-- 超过 10 个时,LRU 淘汰最久未访问的 -->
```

**组合使用**
```vue
<KeepAlive :include="['CompA', 'CompB']" :max="5">
  <component :is="current" />
</KeepAlive>
```

---

## 缓存组件命名

**defineOptions 指定 name**
```vue
<script setup>
defineOptions({
  name: 'CompA'
});
</script>
```

**defineComponent 指定 name**
```typescript
export default defineComponent({
  name: 'CompA',
  setup() { /* ... */ }
});
```

**单文件组件文件名自动推断**
```vue
<!-- CompA.vue -->
<!-- 默认 name 推断为 CompA -->
<script setup>
</script>
```

---

## 生命周期钩子

**onActivated 缓存激活**
`onActivated(<callback>);`
```typescript
import { onActivated } from 'vue';

onActivated(() => {
  console.log('组件从缓存激活');
  refreshData();
  resumeTimer();
});
```

**onDeactivated 缓存停用**
`onDeactivated(<callback>);`
```typescript
import { onDeactivated } from 'vue';

onDeactivated(() => {
  console.log('组件被缓存(停用)');
  pauseTimer();
});
```

**钩子执行顺序**
```typescript
import {
  onMounted, onActivated,
  onDeactivated, onUnmounted
} from 'vue';

// 首次渲染:
//   onMounted -> onActivated
// 切换到其他组件:
//   onDeactivated
// 切换回来:
//   onActivated
// 完全销毁:
//   onDeactivated -> onUnmounted

onMounted(() => console.log('mounted'));
onActivated(() => console.log('activated'));
onDeactivated(() => console.log('deactivated'));
onUnmounted(() => console.log('unmounted'));
```

---

## KeepAlive 实战模式

**列表页 + 详情页缓存**
```vue
<template>
  <KeepAlive :include="['ListPage']">
    <router-view />
  </KeepAlive>
</template>
```

```vue
<!-- ListPage.vue -->
<script setup>
import { ref, onActivated, onDeactivated } from 'vue';

const scrollPos = ref(0);
const list = ref([]);

onActivated(() => {
  // 恢复滚动位置
  window.scrollTo(0, scrollPos.value);
});

onDeactivated(() => {
  // 保存滚动位置
  scrollPos.value = window.scrollY);
});
</script>
```

**条件缓存(动态 include)**
```vue
<template>
  <KeepAlive :include="cachedNames">
    <component :is="currentComp" />
  </KeepAlive>
</template>

<script setup>
import { ref, computed } from 'vue';

const keepAliveList = ref(['Home', 'List']);

const cachedNames = computed(() => {
  return keepAliveList.value;
});

function clearCache(name) {
  keepAliveList.value = keepAliveList.value.filter(n => n !== name);
}
</script>
```

---

## 缓存控制 API

**通过组件实例访问 cache**
```typescript
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
// instance.cache 是内部缓存 Map,不推荐直接操作
```

**max + LRU 淘汰策略**
```vue
<!-- 最多缓存 3 个,最久未访问的被淘汰 -->
<KeepAlive :max="3">
  <component :is="current" />
</KeepAlive>
```

---

## 注意事项

**必须配合动态组件或 router-view**
```vue
<!-- 正确 -->
<KeepAlive>
  <component :is="current" />
</KeepAlive>

<!-- 正确 -->
<KeepAlive>
  <router-view />
</KeepAlive>

<!-- 错误:单个静态组件 -->
<KeepAlive>
  <StaticComp />
</KeepAlive>
<!-- 不会报错但毫无意义 -->
```

**v-if 与 KeepAlive 配合**
```vue
<KeepAlive>
  <CompA v-if="showA" />
  <CompB v-else />
</KeepAlive>
```

**注意 props include/exclude 匹配**
```vue
<!-- 必须确保组件 name 与 include 字符串完全匹配 -->
<script setup>
defineOptions({ name: 'UserProfile' });
</script>

<!-- 父组件 -->
<KeepAlive include="UserProfile">
  <UserProfile />
</KeepAlive>
```

---

## 综合应用

**Tab 切换缓存**
```vue
<template>
  <div class="tabs">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      @click="current = tab.name"
      :class="{ active: current === tab.name }"
    >
      {{ tab.label }}
    </button>
  </div>

  <KeepAlive :max="5">
    <component :is="currentComp" />
  </KeepAlive>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue';
import Home from './Home.vue';
import List from './List.vue';
import Detail from './Detail.vue';

const tabs = [
  { name: 'home', label: '首页', comp: markRaw(Home) },
  { name: 'list', label: '列表', comp: markRaw(List) },
  { name: 'detail', label: '详情', comp: markRaw(Detail) }
];

const current = ref('home');
const currentComp = computed(() =>
  tabs.find(t => t.name === current.value)?.comp
);
</script>
```

**onActivated 数据刷新**
```vue
<script setup>
import { ref, onActivated } from 'vue';

const lastActiveTime = ref<Date | null>(null);
const data = ref([]);

async function loadData() {
  data.value = await fetch('/api/data').then(r => r.json());
}

onActivated(async () => {
  const now = new Date();
  // 距离上次激活超过 30 秒,刷新数据
  if (!lastActiveTime.value ||
      now.getTime() - lastActiveTime.value.getTime() > 30000) {
    await loadData();
  }
  lastActiveTime.value = now;
});
</script>
```
