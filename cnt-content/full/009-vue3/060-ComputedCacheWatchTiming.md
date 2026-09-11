---
order: 60
title: computed 缓存机制与 watch 执行时机
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Vue 3 computed缓存机制与watch执行时机详解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/210-PiniaStateManagementDetailed'
  - 'vue3/250-PluginDevelopment'
  - 'vue3/190-VueRouterDetailed'
  - 'vue3/080-CompositionAPIAdvantageScene'
prerequisites: []
---

## 1. computed 缓存机制

### 1.1 惰性求值

computed 只有在被读取时才会计算，且缓存结果：

```javascript
const count = ref(0);
const doubled = computed(() => {
  console.log('computed 执行');
  return count.value * 2;
});

// 首次读取：执行计算
console.log(doubled.value); // computed 执行 → 0

// 再次读取：返回缓存
console.log(doubled.value); // 无日志 → 0（缓存）

// 依赖变化
count.value = 1;
// 此时不会重新计算！computed 是惰性的

// 再次读取：重新计算
console.log(doubled.value); // computed 执行 → 2
```

### 1.2 脏标记机制

Vue 3 使用脏标记（dirty flag）实现缓存：

```
初始状态: dirty = true
首次读取: 执行计算 → dirty = false → 缓存结果
依赖变化: dirty = true → 不立即重新计算
再次读取: dirty === true → 重新计算 → dirty = false
```

### 1.3 computed vs methods

| 特性     | computed | methods  |
| -------- | -------- | -------- |
| 缓存     | 有       | 无       |
| 响应式   | 是       | 否       |
| 调用方式 | 属性访问 | 函数调用 |
| 副作用   | 不应有   | 可以有   |

## 2. watch 执行时机

### 2.1 默认行为

```javascript
const count = ref(0);

watch(
  count,
  (newVal, oldVal) => {
    console.log('watch 触发:', newVal);
  },
  { flush: 'pre' }
); // 默认值

count.value = 1;
console.log('同步代码');
// 输出顺序: 同步代码 → watch 触发: 1
```

### 2.2 flush 选项

| flush 值 | 执行时机           | 用途               |
| -------- | ------------------ | ------------------ |
| `pre`    | DOM 更新前（默认） | 修改其他响应式数据 |
| `post`   | DOM 更新后         | 访问更新后的 DOM   |
| `sync`   | 同步执行           | 调试（性能差）     |

```javascript
watch(
  count,
  (newVal) => {
    // pre: DOM 还未更新
  },
  { flush: 'pre' }
);

watch(
  count,
  (newVal) => {
    // post: DOM 已更新，可安全访问
    document.getElementById('counter').textContent;
  },
  { flush: 'post' }
);
```

### 2.3 immediate 选项

```javascript
watch(
  source,
  (newVal, oldVal) => {
    // 创建时立即执行一次
  },
  { immediate: true }
);
```

### 2.4 deep 选项

```javascript
const state = reactive({ nested: { count: 0 } });

watch(
  state,
  (newVal) => {
    // 深层变化也会触发
  },
  { deep: true }
);

// 直接传入 reactive 对象作为源时，watch 会隐式深层监听（Vue 3.0 起即如此，与版本无关）；
// 传入 ref 或 getter 作为源时，则需要显式 deep: true 才能监听到深层变化
```

## 3. watchEffect

```javascript
// 自动追踪依赖
watchEffect(() => {
  console.log(count.value); // 自动追踪 count
});

// 与 watch 的区别
// watchEffect: 自动追踪、立即执行、无旧值
// watch: 显式指定、惰性执行、有旧值
```

## 4. 停止侦听器

```javascript
const stop = watch(source, callback);

// 组件卸载时自动停止
// 手动停止
stop();
```
## computed 计算属性

**computed 只读**
`const <result> = computed(() => <expression>);`
```typescript
import { ref, computed } from 'vue';
const count = ref(1);

const double = computed(() => count.value * 2);
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
console.log(double.value);  // 2
```

**computed 可写**
`const <result> = computed({ get, set });`
```typescript
const firstName = ref('John');
const lastName = ref('Doe');

const fullName = computed({
  get() {
    return `${firstName.value} ${lastName.value}`;
  },
  set(newValue) {
    [firstName.value, lastName.value] = newValue.split(' ');
  }
});

fullName.value = 'Tom Smith';
```

**computed 缓存特性**
```typescript
const count = ref(0);
const expensive = computed(() => {
  console.log('computing...');
  return count.value * 2;
});

console.log(expensive.value);  // computing... 0
console.log(expensive.value);  // 0(使用缓存,不重新计算)
count.value = 1;
console.log(expensive.value);  // computing... 2
```

**computed 与 reactive 配合**
```typescript
import { reactive, computed } from 'vue';
const state = reactive({
  items: [
    { id: 1, name: 'A', price: 10 },
    { id: 2, name: 'B', price: 20 }
  ]
});

const total = computed(() =>
  state.items.reduce((sum, item) => sum + item.price, 0)
);

const expensiveItems = computed(() =>
  state.items.filter(item => item.price > 15)
);
```

---

## watch 侦听器

**watch 单源侦听**
`watch(<source>, (<newVal>, [oldVal], [onCleanup]) => {}, [options]);`
```typescript
import { ref, watch } from 'vue';
const count = ref(0);

watch(count, (newVal, oldVal) => {
  console.log(`从 ${oldVal} 变为 ${newVal}`);
});
```

**watch getter 侦听**
`watch(() => <expression>, <callback>);`
```typescript
const state = reactive({ user: { name: 'Tom' } });

watch(
  () => state.user.name,
  (newVal, oldVal) => {
    console.log('name 变化:', oldVal, '->', newVal);
  }
);
```

**watch 多源侦听**
`watch([<source1>, <source2>], ([<new1>, <new2>], [<old1>, <old2>]) => {});`
```typescript
import { ref, watch } from 'vue';
const foo = ref('a');
const bar = ref(1);

watch([foo, bar], ([newFoo, newBar], [oldFoo, oldBar]) => {
  console.log('foo:', oldFoo, '->', newFoo);
  console.log('bar:', oldBar, '->', newBar);
});
```

**watch 选项配置**
```typescript
watch(count, callback, {
  immediate: true,    // 立即执行一次
  deep: true,         // 深度侦听
  flush: 'post',      // 'pre'(默认) | 'post' | 'sync'
  once: true          // 只触发一次(Vue 3.4+)
});
```

**watch 深度侦听**
```typescript
import { reactive, watch } from 'vue';
const state = reactive({
  user: { name: 'Tom', address: { city: 'Beijing' } }
});

watch(
  () => state.user,
  (newVal, oldVal) => {
    console.log('user 变化');
  },
  { deep: true }
);
```

**watch 清理副作用**
```typescript
watch(id, (newId, oldId, onCleanup) => {
  const controller = new AbortController();
  fetch(`/api/data/${newId}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      console.log(data);
    });

  onCleanup(() => {
    controller.abort();  // 取消上次未完成的请求
  });
});
```

---

## watchEffect 自动追踪

**watchEffect 基础**
`watchEffect(<effect> => {});`
```typescript
import { ref, watchEffect } from 'vue';
const count = ref(0);

watchEffect(() => {
  console.log('count:', count.value);  // 自动追踪 count
});

count.value++;  // 触发 effect 重新执行
```

**watchEffect 立即执行**
```typescript
watchEffect(() => {
  // 立即执行一次,然后追踪依赖变化
  console.log('initial + reactive:', count.value);
});
```

**watchEffect 清理副作用**
```typescript
watchEffect((onCleanup) => {
  const timer = setInterval(() => {
    console.log(count.value);
  }, 1000);

  onCleanup(() => {
    clearInterval(timer);
  });
});
```

**watchEffect 返回值**
```typescript
const stop = watchEffect(() => {
  console.log(count.value);
});

// 主动停止侦听
stop();
```

**watchEffect 调试信息(Vue 3.4+)**
```typescript
watchEffect(onTrack, onTrigger => {}, {
  onTrack(event) { console.log('追踪:', event); },
  onTrigger(event) { console.log('触发:', event); }
});
```

---

## watchPostEffect / watchSyncEffect

**watchPostEffect DOM 更新后执行**
`watchPostEffect(<effect>);`
```typescript
import { ref, watchPostEffect } from 'vue';
const list = ref<number[]>([]);

watchPostEffect(() => {
  // DOM 已更新,可读取最新 DOM 尺寸
  const el = document.getElementById('list');
  console.log(el?.scrollHeight);
});
```

**watchSyncEffect 同步执行**
`watchSyncEffect(<effect>);`
```typescript
import { ref, watchSyncEffect } from 'vue';
const count = ref(0);

watchSyncEffect(() => {
  // 状态变更后同步执行(无队列延迟)
  console.log('sync:', count.value);
});
```

---

## watch vs watchEffect

**watch 显式依赖**
```typescript
const count = ref(0);
const name = ref('Tom');

// 只侦听 count,name 变化不影响
watch(count, (newVal) => {
  console.log('count:', newVal, 'name:', name.value);
});
```

**watchEffect 自动追踪**
```typescript
const count = ref(0);
const name = ref('Tom');

// 自动追踪 count 和 name
watchEffect(() => {
  console.log('count:', count.value, 'name:', name.value);
});
```

---

## 调试钩子

**onTrack 依赖追踪时触发**
```typescript
watch(count, callback, {
  onTrack(event) {
    // effect 触发时首次追踪依赖
    console.log('tracked:', event);
    // event: { effect, target, key, type }
  }
});
```

**onTrigger 依赖触发时调用**
```typescript
watch(count, callback, {
  onTrigger(event) {
    // 依赖变化导致回调执行时
    console.log('triggered:', event);
    // event: { effect, target, key, type, newValue, oldValue }
  }
});
```

---

## 综合应用

**computed + watch 组合**
```typescript
import { ref, computed, watch } from 'vue';

const items = ref<{ id: number; price: number }[]>([]);
const totalPrice = computed(() =>
  items.value.reduce((sum, item) => sum + item.price, 0)
);

watch(totalPrice, (newTotal, oldTotal) => {
  console.log(`总价变化:${oldTotal} -> ${newTotal}`);
});

watch(
  () => items.value.length,
  (newLen) => {
    console.log(`商品数量:${newLen}`);
  }
);
```

**watch + 副作用清理**
```typescript
function useFetchData(url: Ref<string>) {
  const data = ref(null);
  const error = ref(null);

  watch(url, async (newUrl, _, onCleanup) => {
    data.value = null;
    error.value = null;

    const controller = new AbortController();
    onCleanup(() => controller.abort());

    try {
      const res = await fetch(newUrl, { signal: controller.signal });
      data.value = await res.json();
    } catch (e) {
      if (e.name !== 'AbortError') {
        error.value = e;
      }
    }
  }, { immediate: true });

  return { data, error };
}
```
