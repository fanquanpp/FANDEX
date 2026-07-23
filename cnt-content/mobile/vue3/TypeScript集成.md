# Vue + TypeScript 类型语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 基础类型

**Ref 类型**
```typescript
import { ref, type Ref } from 'vue';

const count = ref(0);              // Ref<number>
const name = ref<string>('Tom');   // Ref<string>
const list = ref<number[]>([]);    // Ref<number[]>
const user = ref<{ id: number; name: string } | null>(null);

// 显式类型
const value: Ref<string> = ref('');
```

**ComputedRef 类型**
```typescript
import { computed, type ComputedRef } from 'vue';

const count = ref(0);
const double: ComputedRef<number> = computed(() => count.value * 2);

// 类型推断
const str = computed(() => 'hello');  // ComputedRef<string>
```

**reactive 类型**
```typescript
import { reactive } from 'vue';

interface State {
  count: number;
  list: string[];
  user: { id: number; name: string } | null;
}

const state = reactive<State>({
  count: 0,
  list: [],
  user: null
});
```

**shallowRef 类型**
```typescript
import { shallowRef } from 'vue';

type Widget = { el: HTMLElement; destroy(): void };
const widget = shallowRef<Widget | null>(null);
```

---

## PropType 复杂类型

**PropType 定义**
```typescript
import { defineComponent, type PropType } from 'vue';

defineComponent({
  props: {
    // 数组类型
    list: { type: Array as PropType<string[]>, required: true },
    // 对象类型
    user: Object as PropType<{ id: number; name: string }>,
    // 函数类型
    onChange: Function as PropType<(value: string) => void>,
    // 联合类型
    status: String as PropType<'active' | 'inactive'>,
    // 复杂对象
    config: {
      type: Object as PropType<{ apiBase: string; timeout?: number }>,
      required: true
    }
  }
});
```

**script setup 中使用 PropType**
```typescript
<script setup lang="ts">
import type { PropType } from 'vue';

const props = defineProps({
  list: Array as PropType<{ id: number; name: string }[]>,
  callback: Function as PropType<(value: string) => void>
});
</script>
```

---

## 泛型 props

**defineProps 泛型声明**
```typescript
<script setup lang="ts">
interface Props {
  title: string;
  count?: number;
  list: Array<{ id: number; name: string }>;
  callback?: (value: string) => void;
  status?: 'active' | 'inactive';
}

const props = defineProps<Props>();
</script>
```

**withDefaults 默认值**
```typescript
import { withDefaults } from 'vue';

interface Props {
  title?: string;
  count?: number;
  list?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '默认标题',
  count: 0,
  list: () => []  // 引用类型必须用工厂函数
});
```

**响应式 props 解构(Vue 3.5+)**
```typescript
const { title = '默认标题', count = 0 } = defineProps<{
  title?: string;
  count?: number;
}>();
```

---

## defineEmits 类型

**泛型签名**
```typescript
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'submit', payload: { id: number; data: any }): void;
  (e: 'delete', id: number): void;
}>();

emit('change', 'new value');
emit('submit', { id: 1, data: { x: 1 } });
</script>
```

**简洁语法(Vue 3.3+)**
```typescript
const emit = defineEmits<{
  change: [value: string];
  submit: [payload: { id: number; data: any }];
  delete: [id: number];
}>();

emit('change', 'new value');
```

---

## defineModel 类型

**defineModel 类型**
```typescript
const model = defineModel<string>();
model.value = 'new value';

const count = defineModel<number>('count', { default: 0 });
const visible = defineModel<boolean>('visible');
```

---

## 组件类型

**defineComponent 类型**
```typescript
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  props: {
    title: { type: String, required: true }
  },
  emits: {
    change: (val: string) => typeof val === 'string'
  },
  setup(props, { emit, slots, attrs }) {
    return {};
  }
});
```

**defineSlots 类型**
```typescript
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { item: any; index: number }): any;
  header?(props: { title: string }): any;
  footer?(): any;
}>();
</script>
```

---

## 模板引用类型

**useTemplateRef 类型(Vue 3.5+)**
```typescript
import { useTemplateRef } from 'vue';

const inputEl = useTemplateRef<HTMLInputElement>('inputRef');
onMounted(() => inputEl.value?.focus());

const childRef = useTemplateRef<InstanceType<typeof ChildComp>>('child');
onMounted(() => childRef.value?.publicMethod());
```

**ref 字符串方式**
```typescript
import { ref, onMounted } from 'vue';

const inputEl = ref<HTMLInputElement | null>(null);
onMounted(() => inputEl.value?.focus());

const chartEl = ref<HTMLElement | null>(null);
```

**组件实例类型**
```typescript
import ChildComp from './ChildComp.vue';

// 获取组件暴露的类型
type ChildInstance = InstanceType<typeof ChildComp>;

const child = ref<ChildInstance | null>(null);
child.value?.publicMethod();
```

---

## provide / inject 类型

**InjectionKey 类型化**
```typescript
import type { InjectionKey, Ref } from 'vue';
import { provide, inject, ref } from 'vue';

interface UserContext {
  user: Ref<{ id: number; name: string } | null>;
  login: (name: string) => Promise<void>;
  logout: () => void;
}

const UserKey: InjectionKey<UserContext> = Symbol('user');

// 提供方
provide(UserKey, {
  user: ref(null),
  login: async (name) => { /* ... */ },
  logout: () => { /* ... */ }
});

// 注入方(自动类型推断)
const ctx = inject(UserKey);  // UserContext | undefined
```

---

## 事件处理类型

**事件处理函数类型**
```typescript
function onClick(event: MouseEvent): void {
  const target = event.target as HTMLButtonElement;
  console.log(target.value);
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    // ...
  }
}
```

---

## ComputedRef 与 WritableComputedRef

```typescript
import { ref, computed, type ComputedRef, type WritableComputedRef } from 'vue';

const count = ref(0);

const double: ComputedRef<number> = computed(() => count.value * 2);

const writable: WritableComputedRef<number> = computed({
  get: () => count.value,
  set: (v: number) => { count.value = v; }
});
```

---

## 自定义指令类型

```typescript
import type { Directive, DirectiveBinding } from 'vue';

const vFocus: Directive<HTMLElement, boolean> = {
  mounted(el, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      el.focus();
    }
  }
};
```

---

## 插件类型

```typescript
import type { App } from 'vue';

interface MyPluginOptions {
  apiBase: string;
  timeout?: number;
}

const MyPlugin = {
  install(app: App, options: MyPluginOptions) {
    app.provide('apiBase', options.apiBase);
  }
};

// ComponentCustomProperties 扩展
declare module 'vue' {
  interface ComponentCustomProperties {
    $apiBase: string;
    $format: (value: number) => string;
  }
}

app.use(MyPlugin, { apiBase: '/api', timeout: 3000 });
// 在组件中:this.$apiBase 可用(类型安全)
```

---

## 全局组件类型

**GlobalComponents 扩展**
```typescript
declare module 'vue' {
  interface GlobalComponents {
    MyButton: typeof import('./MyButton.vue')['default'];
    RouterLink: typeof import('vue-router')['RouterLink'];
  }
}
```

---

## 完整 TS 组件示例

```vue
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
}

const props = withDefaults(defineProps<{
  title: string;
  users?: User[];
  selectedId?: number | null;
}>(), {
  users: () => [],
  selectedId: null
});

const emit = defineEmits<{
  select: [user: User];
  delete: [id: number];
}>();

const selectedUser = computed(() =>
  props.users.find(u => u.id === props.selectedId) ?? null
);

const handleSelect = (user: User) => {
  emit('select', user);
};

defineExpose({ selectedUser });
</script>

<template>
  <div>
    <h2>{{ title }}</h2>
    <ul>
      <li
        v-for="user in users"
        :key="user.id"
        @click="handleSelect(user)"
      >
        {{ user.name }} ({{ user.role }})
      </li>
    </ul>
  </div>
</template>
```
