# 组合式 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 响应式状态

**ref 响应式引用**
`const <state> = ref(<initialValue>);`
```typescript
import { ref } from 'vue';
const count = ref(0);
count.value++;              // 修改值
console.log(count.value);  // 读取值

const user = ref({ name: 'Tom' });
user.value.name = 'Jerry';  // 修改对象属性
```

**reactive 对象响应式**
`const <state> = reactive(<object>);`
```typescript
import { reactive } from 'vue';
const state = reactive({
  count: 0,
  user: { name: 'Tom' }
});
state.count++;
state.user.name = 'Jerry';
```

**shallowRef 浅响应式引用**
`const <state> = shallowRef(<initialValue>);`
```typescript
import { shallowRef } from 'vue';
const obj = shallowRef({ count: 0 });
obj.value.count = 1;            // 不会触发更新
obj.value = { count: 1 };       // 替换整个值才触发
```

**shallowReactive 浅响应式对象**
`const <state> = shallowReactive(<object>);`
```typescript
import { shallowReactive } from 'vue';
const state = shallowReactive({ nested: { count: 0 } });
state.nested.count = 1;  // 不会触发更新
```

**readonly 只读代理**
`const <readonly> = readonly(<reactiveSource>);`
```typescript
import { reactive, readonly } from 'vue';
const original = reactive({ count: 0 });
const copy = readonly(original);
copy.count++;  // 警告并失败
```

---

## 计算属性

**computed 计算属性**
`const <result> = computed(() => <expression>);`
```typescript
import { ref, computed } from 'vue';
const count = ref(1);
const double = computed(() => count.value * 2);
console.log(double.value);  // 2
```

**可写 computed**
`const <result> = computed({ get, set });`
```typescript
const firstName = ref('John');
const lastName = ref('Doe');
const fullName = computed({
  get() { return `${firstName.value} ${lastName.value}`; },
  set(val) {
    [firstName.value, lastName.value] = val.split(' ');
  }
});
fullName.value = 'Tom Smith';
```

---

## 侦听器

**watch 侦听器**
`watch(<source>, (<newVal>, [oldVal]) => {}, [options]);`
```typescript
import { ref, watch } from 'vue';
const count = ref(0);

watch(count, (newVal, oldVal) => {
  console.log(`从 ${oldVal} 变为 ${newVal}`);
});

watch(count, (newVal, oldVal, onCleanup) => {
  const timer = setTimeout(() => doSomething(newVal), 500);
  onCleanup(() => clearTimeout(timer));
});
```

**watch 多源侦听**
```typescript
watch([fooRef, barRef], ([newFoo, newBar], [oldFoo, oldBar]) => {
  console.log('foo 或 bar 变化');
});

watch(
  () => state.user.name,
  (newVal, oldVal) => console.log('name 变化')
);
```

**watch 配置选项**
```typescript
watch(count, callback, {
  immediate: true,    // 立即执行
  deep: true,         // 深度侦听
  flush: 'post',      // 'pre' | 'post' | 'sync'
  once: true          // 只触发一次
});
```

**watchEffect 自动追踪依赖**
`watchEffect(<effect> => {});`
```typescript
import { ref, watchEffect } from 'vue';
const count = ref(0);

watchEffect(() => {
  console.log('count:', count.value);
});

watchEffect((onCleanup) => {
  const timer = setInterval(() => console.log(count.value), 1000);
  onCleanup(() => clearInterval(timer));
});
```

**watchPostEffect DOM 更新后执行**
```typescript
import { watchPostEffect } from 'vue';
watchPostEffect(() => {
  console.log('DOM 已更新');
});
```

**watchSyncEffect 同步执行**
```typescript
import { watchSyncEffect } from 'vue';
watchSyncEffect(() => {
  console.log('同步执行');
});
```

---

## 工具函数

**toRef 转换为 ref**
`const <ref> = toRef(<source>, <key>);`
```typescript
import { reactive, toRef } from 'vue';
const state = reactive({ count: 0 });
const countRef = toRef(state, 'count');
countRef.value++;  // 同步修改 state.count
```

**toRefs 解构响应式对象**
`const { <key>, ... } = toRefs(<reactive>);`
```typescript
import { reactive, toRefs } from 'vue';
const state = reactive({ count: 0, name: 'Tom' });
const { count, name } = toRefs(state);
count.value++;
```

**unref 获取值**
`const <value> = unref(<maybeRef>);`
```typescript
import { ref, unref } from 'vue';
const count = ref(0);
console.log(unref(count));  // 0
console.log(unref(123));    // 123
```

**isRef / isReactive / isProxy**
```typescript
import { ref, reactive, isRef, isReactive, isProxy } from 'vue';
isRef(ref(0));         // true
isReactive(reactive({}));  // true
isProxy(reactive({}));     // true
```

**toRaw 获取原始对象**
`const <raw> = toRaw(<proxy>);`
```typescript
import { reactive, toRaw } from 'vue';
const foo = reactive({});
const raw = toRaw(foo);
console.log(raw === foo);  // false
```

**markRaw 标记永不响应**
`const <obj> = markRaw(<object>);`
```typescript
import { reactive, markRaw } from 'vue';
const state = reactive({});
state.classInstance = markRaw(new SomeClass());
```

---

## 依赖注入

**provide 提供**
`provide(<key>, <value>);`
```typescript
import { provide, ref } from 'vue';
const theme = ref('dark');
provide('theme', theme);
provide('theme', 'dark');        // 静态值
provide(Symbol('config'), {});
```

**inject 注入**
`const <value> = inject(<key>, [defaultValue], [treatDefaultAsFactory]);`
```typescript
import { inject } from 'vue';
const theme = inject('theme');
const theme = inject('theme', 'light');
const config = inject('config', () => createDefaultConfig(), true);
```

---

## 模板引用

**useTemplateRef 模板引用(Vue 3.5+)**
`const <el> = useTemplateRef(<refName>);`
```typescript
import { useTemplateRef } from 'vue';
const inputEl = useTemplateRef('inputRef');
onMounted(() => {
  inputEl.value?.focus();
});
```
```vue
<template>
  <input ref="inputRef" />
</template>
```

**ref 字符串方式(传统)**
```vue
<template>
  <input ref="inputRef" />
</template>
<script setup>
import { ref, onMounted } from 'vue';
const inputRef = ref(null);
onMounted(() => inputRef.value?.focus());
</script>
```

**函数式 ref**
```vue
<template>
  <input :ref="(el) => { inputEl = el }" />
</template>
```

---

## 组件通信 API

**defineProps 声明 props**
`const <props> = defineProps(<propsSpec>);`
```typescript
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 },
  list: { type: Array, required: true },
  callback: { type: Function, default: () => {} }
});
```

**defineProps 泛型方式**
```typescript
const props = defineProps<{
  title: string;
  count?: number;
  list: string[];
}>();
```

**响应式 props 解构(Vue 3.5+)**
```typescript
const { title, count = 0 } = defineProps<{
  title: string;
  count?: number;
}>();
// title 和 count 自动保持响应性
```

**defineEmits 声明事件**
`const <emit> = defineEmits(<eventsSpec>);`
```typescript
const emit = defineEmits(['change', 'submit']);
emit('change', value);
emit('submit', { data: payload });
```

**defineEmits 泛型方式**
```typescript
const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'submit', payload: { id: number }): void;
}>();
```

**defineExpose 暴露方法**
`defineExpose({ <key>: <value>, ... });`
```typescript
const publicMethod = () => console.log('called');
defineExpose({ publicMethod, props });
```

**defineModel 双向绑定(Vue 3.4+)**
`const <model> = defineModel([modelName], [options]);`
```typescript
const model = defineModel<string>();
function update() {
  model.value = 'new value';
}

const title = defineModel<string>('title');
const count = defineModel<number>('count', { default: 0, local: true });
```

**defineOptions 定义选项**
```typescript
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false,
  customOption: 'value'
});
```

**defineSlots 类型声明**
```typescript
const slots = defineSlots<{
  default(props: { item: any }): any;
  header?(): any;
}>();
```

**useAttrs 获取透传属性**
`const <attrs> = useAttrs();`
```typescript
import { useAttrs } from 'vue';
const attrs = useAttrs();
console.log(attrs.class, attrs.id);
```

**useSlots 获取插槽**
`const <slots> = useSlots();`
```typescript
import { useSlots } from 'vue';
const slots = useSlots();
if (slots.header) {
  // 处理插槽
}
```
