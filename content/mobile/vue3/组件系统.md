# 组件定义 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 单文件组件(SFC)

**script setup 语法糖**
```vue
<script setup>
import { ref } from 'vue';
const count = ref(0);
function increment() {
  count.value++;
}
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

**普通 script + setup 函数**
```vue
<script>
import { defineComponent, ref } from 'vue';
export default defineComponent({
  setup() {
    const count = ref(0);
    return { count };
  }
});
</script>
```

**TypeScript + script setup**
```vue
<script setup lang="ts">
import { ref } from 'vue';
const count = ref<number>(0);
</script>
```

---

## 组件注册

**局部注册**
```vue
<script setup>
import MyButton from './MyButton.vue';
import { UserCard } from './components';
</script>

<template>
  <MyButton />
  <UserCard />
</template>
```

**全局注册**
```typescript
import { createApp } from 'vue';
import MyButton from './MyButton.vue';

const app = createApp({});
app.component('MyButton', MyButton);
app.component('AsyncComp', () => import('./AsyncComp.vue'));
```

---

## defineComponent 类型辅助

**defineComponent 类型推断**
`defineComponent(<componentOptions>);`
```typescript
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'MyComp',
  props: {
    title: String,
    count: { type: Number, default: 0 }
  },
  emits: ['change'],
  setup(props, { emit }) {
    return {};
  }
});
```

**defineComponent + 泛型**
```typescript
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  props: {
    list: { type: Array as PropType<string[]>, required: true },
    config: Object as PropType<{ apiBase: string }>
  }
});
```

---

## Props 声明

**defineProps 运行时声明**
```typescript
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 },
  list: { type: Array, required: true },
  callback: { type: Function, default: () => {} },
  user: { type: Object, default: () => ({ name: '' }) }
});
```

**defineProps 泛型声明**
```typescript
interface Props {
  title: string;
  count?: number;
  list: string[];
  user?: { name: string };
}
const props = defineProps<Props>();
```

**defineProps 带默认值(泛型)**
```typescript
const props = withDefaults(defineProps<{
  title?: string;
  count?: number;
}>(), {
  title: 'default',
  count: 0
});
```

**响应式 props 解构(Vue 3.5+)**
```typescript
const { title = 'default', count = 0 } = defineProps<{
  title?: string;
  count?: number;
}>();
```

**PropType 复杂类型**
```typescript
import { defineProps, PropType } from 'vue';

const props = defineProps({
  list: Array as PropType<{ id: number; name: string }[]>,
  callback: Function as PropType<(value: string) => void>
});
```

---

## Emits 声明

**defineEmits 数组形式**
```typescript
const emit = defineEmits(['change', 'submit', 'delete']);
emit('change', newValue);
emit('submit', { id: 1 });
```

**defineEmits 对象形式(校验)**
```typescript
const emit = defineEmits({
  change: (val: string) => typeof val === 'string',
  submit: (payload: { id: number }) => !!payload.id
});
```

**defineEmits 泛型形式**
```typescript
const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'submit', payload: { id: number; data?: any }): void;
  (e: 'delete', id: number): void;
}>();
```

---

## 组件选项

**defineOptions 定义组件选项**
```typescript
defineOptions({
  name: 'UserCard',
  inheritAttrs: false,
  components: { MyButton },
  directives: { focus: { mounted: (el) => el.focus() } }
});
```

**defineSlots 声明插槽类型**
```typescript
const slots = defineSlots<{
  default(props: { item: any }): any;
  header?(props: { title: string }): any;
  footer?(): any;
}>();
```

---

## 插槽

**默认插槽**
```vue
<!-- 父组件 -->
<Card>
  <p>这是默认插槽内容</p>
</Card>

<!-- 子组件 Card.vue -->
<template>
  <div class="card">
    <slot />
  </div>
</template>
```

**具名插槽**
```vue
<!-- 父组件 -->
<Card>
  <template #header>
    <h1>标题</h1>
  </template>
  <template #footer>
    <p>页脚</p>
  </template>
</Card>

<!-- 子组件 -->
<template>
  <slot name="header" />
  <slot />
  <slot name="footer" />
</template>
```

**作用域插槽**
```vue
<!-- 子组件 -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="item.id" />
    </li>
  </ul>
</template>

<!-- 父组件 -->
<List :items="items">
  <template #default="{ item, index }">
    {{ index }}: {{ item.name }}
  </template>
</List>

<!-- 简写 -->
<List :items="items">
  <template="{ item }">
    {{ item.name }}
  </template>
</List>
```

**useSlots 访问插槽**
```typescript
import { useSlots, computed } from 'vue';
const slots = useSlots();
const hasHeader = computed(() => !!slots.header);
```

---

## 组件 v-model

**单 v-model**
```vue
<!-- 父组件 -->
<MyInput v-model="text" />

<!-- 子组件 MyInput.vue -->
<script setup>
const model = defineModel<string>();
</script>
<template>
  <input :value="model" @input="model = $event.target.value" />
</template>
```

**多个 v-model**
```vue
<!-- 父组件 -->
<UserForm v-model:firstName="first" v-model:lastName="last" />

<!-- 子组件 -->
<script setup>
const firstName = defineModel<string>('firstName');
const lastName = defineModel<string>('lastName');
</script>
```

**v-model 修饰符**
```typescript
const [model, modifiers] = defineModel({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  }
});
```

---

## 异步组件

**defineAsyncComponent 异步组件**
`const <comp> = defineAsyncComponent(<loader>);`
```typescript
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent(() => import('./AsyncComp.vue'));

const AsyncCompWithOpts = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingComp,
  errorComponent: ErrorComp,
  delay: 200,
  timeout: 3000,
  suspensible: true,
  onError(err, retry, fail, attempts) {
    if (attempts <= 3) retry();
    else fail();
  }
});
```

---

## 透传 Attributes

**默认透传**
```vue
<!-- 父组件 -->
<MyInput class="large" id="name-input" data-test="input" />

<!-- 子组件 MyInput.vue(单根) -->
<template>
  <input />  <!-- class/id/data-* 自动透传到此 -->
</template>
```

**禁用透传**
```typescript
defineOptions({
  inheritAttrs: false
});
```

**$attrs 显式绑定**
```vue
<template>
  <input v-bind="$attrs" />
</template>
```

**useAttrs**
```typescript
import { useAttrs } from 'vue';
const attrs = useAttrs();
console.log(attrs.class, attrs.id);
```

---

## 暴露组件实例

**defineExpose 暴露**
```vue
<script setup>
import { ref } from 'vue';
const count = ref(0);
const reset = () => { count.value = 0; };

defineExpose({ count, reset });
</script>
```

**父组件通过 ref 访问**
```vue
<template>
  <ChildComp ref="childRef" />
  <button @click="childRef?.reset()">重置</button>
</template>
<script setup>
import { useTemplateRef } from 'vue';
const childRef = useTemplateRef('childRef');
</script>
```
