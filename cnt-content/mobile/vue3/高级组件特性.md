# 高级组件 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## defineExpose 暴露实例

**暴露属性/方法**
`defineExpose({ <key>: <value>, ... });`
```typescript
<script setup>
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
const reset = () => { count.value = 0; };

defineExpose({
  count,
  increment,
  reset,
  // 也可以暴露计算属性
  double: computed(() => count.value * 2)
});
</script>
```

**父组件通过 ref 访问**
```vue
<template>
  <ChildComp ref="childRef" />
  <button @click="childRef?.increment()">+1</button>
  <button @click="childRef?.reset()">重置</button>
</template>

<script setup>
import { useTemplateRef } from 'vue';
import ChildComp from './ChildComp.vue';

const childRef = useTemplateRef<InstanceType<typeof ChildComp>>('childRef');
</script>
```

---

## useAttrs 透传属性

**获取透传属性**
`const <attrs> = useAttrs();`
```typescript
<script setup>
import { useAttrs } from 'vue';

const attrs = useAttrs();
// attrs.class, attrs.id, attrs['data-test'] 等
console.log(attrs);
</script>

<template>
  <input v-bind="$attrs" />
</template>
```

**配合 inheritAttrs:false**
```vue
<script setup>
import { useAttrs } from 'vue';

defineOptions({
  inheritAttrs: false  // 阻止自动透传到根元素
});

const attrs = useAttrs();
</script>

<template>
  <div>
    <input v-bind="attrs" />
    <span>{{ attrs.placeholder }}</span>
  </div>
</template>
```

**attrs 响应性**
```typescript
import { useAttrs, watchEffect } from 'vue';

const attrs = useAttrs();
watchEffect(() => {
  console.log('attrs 变化:', attrs.class, attrs.id);
});
```

---

## useSlots 插槽访问

**获取插槽**
`const <slots> = useSlots();`
```typescript
<script setup>
import { useSlots, computed } from 'vue';

const slots = useSlots();

const hasHeader = computed(() => !!slots.header);
const hasFooter = computed(() => !!slots.footer);
</script>

<template>
  <div>
    <header v-if="hasHeader">
      <slot name="header" />
    </header>
    <main>
      <slot />
    </main>
    <footer v-if="hasFooter">
      <slot name="footer" />
    </footer>
  </div>
</template>
```

**条件渲染插槽**
```typescript
import { useSlots, h } from 'vue';

const slots = useSlots();

function renderContent() {
  if (slots.default) {
    return slots.default();
  }
  if (slots.fallback) {
    return slots.fallback();
  }
  return h('div', '默认内容');
}
```

---

## defineModel 双向绑定

**基础 defineModel**
`const <model> = defineModel([modelName], [options]);`
```typescript
<script setup lang="ts">
const model = defineModel<string>();

function update(value: string) {
  model.value = value;
}
</script>

<template>
  <input
    :value="model"
    @input="model = ($event.target as HTMLInputElement).value"
  />
</template>
```

**命名 model**
```typescript
const firstName = defineModel<string>('firstName');
const lastName = defineModel<string>('lastName');
```

**带默认值**
```typescript
const count = defineModel<number>({ default: 0 });
const title = defineModel<string>('title', { default: '标题' });
```

**local 模式(本地副本)**
```typescript
const text = defineModel<string>({ default: '', local: true });
// local:true 时,修改不立即同步到父组件
```

**修饰符处理**
```typescript
const [model, modifiers] = defineModel<string>({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (modifiers.trim) {
      return value.trim();
    }
    return value;
  }
});
```
```vue
<MyInput v-model.capitalize="text" />
<MyInput v-model.trim="text" />
```

---

## defineOptions 选项定义

**defineOptions 用法**
```typescript
defineOptions({
  name: 'UserCard',
  inheritAttrs: false,
  components: { MyButton },
  directives: {
    focus: { mounted: (el: HTMLElement) => el.focus() }
  },
  emits: ['change'],
  // 其他选项式 API 选项
  data() {
    return { extra: '' };
  },
  created() {
    console.log('created');
  }
});
```

---

## defineSlots 插槽类型

**defineSlots 类型声明**
```typescript
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { item: any; index: number }): any;
  header?(props: { title: string }): any;
  footer?(): any;
}>();
</script>

<template>
  <slot name="header" :title="pageTitle" />
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <slot :item="item" :index="index" />
    </li>
  </ul>
  <slot name="footer" />
</template>
```

---

## v-model 高级用法

**多个 v-model**
```vue
<!-- 父组件 -->
<UserForm
  v-model:firstName="first"
  v-model:lastName="last"
  v-model:age="age"
/>

<!-- 子组件 UserForm.vue -->
<script setup lang="ts">
const firstName = defineModel<string>('firstName');
const lastName = defineModel<string>('lastName');
const age = defineModel<number>('age', { default: 0 });
</script>
```

**v-model 与自定义事件**
```typescript
<script setup lang="ts">
const model = defineModel<string>();

// 等价于
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

// model.value = x 等价于 emit('update:modelValue', x)
</script>
```

---

## 高阶组件模式

**函数式高阶组件**
```typescript
import { h, defineComponent, type Component } from 'vue';

export function withLoading<T extends Component>(WrappedComp: T) {
  return defineComponent({
    name: 'WithLoading',
    props: ['loading'],
    setup(props, { attrs, slots }) {
      return () => {
        if (props.loading) {
          return h('div', { class: 'loading' }, 'Loading...');
        }
        return h(WrappedComp, { ...attrs }, slots);
      };
    }
  });
}

// 使用
const AsyncUser = withLoading(UserCard);
```

**透传 props 与 emits**
```vue
<script setup lang="ts">
import { useAttrs, useListeners } from 'vue';

// 透传所有 props 和事件
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
</script>

<template>
  <Child v-bind="$attrs" v-on="$attrs" />
</template>
```

---

## 渲染函数与 JSX

**h 函数**
```typescript
import { h, defineComponent } from 'vue';

export default defineComponent({
  name: 'MyList',
  props: { items: Array as PropType<string[]> },
  setup(props) {
    return () =>
      h('ul', props.items.map(item => h('li', { key: item }, item)));
  }
});
```

**JSX 语法**
```typescript
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'MyComp',
  setup() {
    const count = ref(0);
    return () => (
      <button onClick={() => count.value++}>
        Clicked {count.value} times
      </button>
    );
  }
});
```

---

## 组件通信综合

**v-model + emit 模式**
```vue
<!-- 子组件 -->
<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'submit': [value: string];
}>();

function handleInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}

function handleSubmit() {
  emit('submit', props.modelValue);
}
</script>

<template>
  <input :value="modelValue" @input="handleInput" />
  <button @click="handleSubmit">提交</button>
</template>
```

**provide + inject 通信**
```typescript
import { provide, inject, readonly, type InjectionKey, type Ref } from 'vue';

interface FormContext {
  values: Ref<Record<string, any>>;
  errors: Ref<Record<string, string>>;
  setField: (name: string, value: any) => void;
}

const FormKey: InjectionKey<FormContext> = Symbol('form');

// 父组件
const values = ref({});
const errors = ref({});
provide(FormKey, {
  values: readonly(values),
  errors: readonly(errors),
  setField: (name, value) => {
    values.value[name] = value;
  }
});

// 子组件
const formCtx = inject(FormKey);
formCtx?.setField('username', 'Tom');
```
