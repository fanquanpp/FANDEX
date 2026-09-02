## 前置知识

- [自定义 Hook](/vue3/017-CustomHook)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 组件系统概述 | Component System Overview」的核心机制、典型用法与常见陷阱
- 掌握「2. 单文件组件 | Single-File Components」的核心机制、典型用法与常见陷阱
- 掌握「3. 组件的 props」的核心机制、典型用法与常见陷阱
- 掌握「4. 组件的事件」的核心机制、典型用法与常见陷阱
- 掌握「5. 组件的插槽」的核心机制、典型用法与常见陷阱


## 1. 组件系统概述 | Component System Overview

组件是 Vue3 应用的基本构建块，它允许我们将 UI 拆分为独立、可复用的部分。Vue3 的组件系统提供了一种清晰的方式来组织和管理应用的 UI 结构，使代码更加模块化、可维护。

### 1.1 组件的特点

- **封装性**：组件将模板、逻辑和样式封装在一起
- **可复用性**：组件可以在多个地方重复使用
- **组合性**：组件可以嵌套组合，形成复杂的 UI 结构
- **可维护性**：组件化使代码更加清晰、易于维护

### 1.2 组件的类型

- **全局组件**：在整个应用中可用
- **局部组件**：只在特定组件中可用
- **单文件组件**：使用 `.vue` 文件格式，包含模板、脚本和样式

## 2. 单文件组件 | Single-File Components

单文件组件（SFC）是 Vue3 推荐的组件编写方式，它使用 `.vue` 文件格式，包含三个部分：

- `<template>`：组件的模板
- `<script>`：组件的逻辑
- `<style>`：组件的样式

### 2.1 基本结构

```vue
<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const title = ref('Hello');
const message = ref('Welcome to Vue3');
const handleClick = () => {
  message.value = 'You clicked the button!';
};
</script>
<style scoped>
.component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
h2 {
  color: #42b983;
}
button {
  padding: 5px 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### 2.2 script setup 语法

Vue3.2+ 提供了 `script setup` 语法糖，使组件的编写更加简洁：

- 不需要导出组件
- 直接在模板中使用定义的变量和函数
- 自动注册导入的组件

## 3. 组件的 props

Props 是组件的输入数据，允许父组件向子组件传递数据。

### 3.1 基本用法

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
  </div>
</template>
<script setup>
defineProps({
 title: String,
 message: {
 type: String,
 default: 'Default message'
 }
}
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent title="Hello from parent" message="This is a prop" />
  </div>
</template>
<script setup>
import ChildComponent from './ChildComponent.vue';
</script>
```

### 3.2 Props 验证

```vue
<script setup>
defineProps({
 // 基本类型
 title: String,
 count: Number,
 isActive: Boolean,
 items: Array,
 user: Object,
 callback: Function,
 // 带默认值
 message: {
 type: String,
 default: 'Default message'
 },
 // 必需的
 requiredProp: {
 type: String,
 required:
 },
 // 自定义验证
 customProp: {
 validator: (value) => {
 return ['option1', 'option2'].includes(value)
 }
 }
}
</script>
```

## 4. 组件的事件

事件允许子组件向父组件传递消息。

### 4.1 基本用法

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup>
const emit = defineEmits(['click', 'custom-event']);
const handleClick = () => {
  emit('click', 'Button clicked');
  emit('custom-event', { data: 'Custom event data' });
};
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent @click="handleChildClick" @custom-event="handleCustomEvent" />
  </div>
</template>
<script setup>
import ChildComponent from './ChildComponent.vue';
const handleChildClick = (message) => {
  console.log('Child clicked:', message);
};
const handleCustomEvent = (data) => {
  console.log('Custom event:', data);
};
</script>
```

### 4.2 事件验证

```vue
<script setup>
const emit = defineEmits({
 // 基本事件
 click: null,
 // 带参数验证的事件
 'update:count': (value) => {
 return typeof value === 'number'
 }
}
</script>
```

## 5. 组件的插槽

插槽允许父组件向子组件的特定位置插入内容。

### 5.1 基本插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <h3>Child Component</h3>
    <slot></slot>
  </div>
</template>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <p>This content is inserted into the slot</p>
    </ChildComponent>
  </div>
</template>
```

### 5.2 具名插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </div>
</template>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <template #header>
        <h2>Page Header</h2>
      </template>
      <p>Main content goes here</p>
      <template #footer>
        <p>Page Footer</p>
      </template>
    </ChildComponent>
  </div>
</template>
```

### 5.3 作用域插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <ul>
      <li v-for="item in items" :key="item.id">
        <slot :item="item">{{ item.name }}</slot>
      </li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const items = ref([
 { id: 1, name: 'Item 1' },
 { id: 2, name: 'Item 2' },
 { id: 3, name: 'Item 3' }
]
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <template #default="{ item }">
        <strong>{{ item.id }}: {{ item.name }}</strong>
      </template>
    </ChildComponent>
  </div>
</template>
```

## 6. 组件的生命周期

组件的生命周期包括创建、挂载、更新、卸载等阶段，我们可以在这些阶段执行相应的逻辑。

### 6.1 生命周期钩子

| 钩子函数            | 描述               |
| :------------------ | :----------------- |
| `onMounted`         | 组件挂载后         |
| `onUpdated`         | 组件更新后         |
| `onUnmounted`       | 组件卸载后         |
| `onBeforeMount`     | 组件挂载前         |
| `onBeforeUpdate`    | 组件更新前         |
| `onBeforeUnmount`   | 组件卸载前         |
| `onErrorCaptured`   | 捕获子组件错误     |
| `onRenderTracked`   | 响应式依赖被追踪时 |
| `onRenderTriggered` | 响应式依赖被触发时 |

### 6.2 使用生命周期钩子

```vue
<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
  </div>
</template>
<script setup>
import { ref, onMounted, onUpdated, onUnmounted } from 'vue';
const title = ref('Hello');
const message = ref('Welcome to Vue3');
onMounted(() => {
  console.log('Component mounted');
  // 执行初始化逻辑
});
onUpdated(() => {
  console.log('Component updated');
  // 执行更新后逻辑
});
onUnmounted(() => {
  console.log('Component unmounted');
  // 执行清理逻辑
});
</script>
```

## 7. 组件的通信

### 7.1 父子组件通信

- **Props**：父组件向子组件传递数据
- **Events**：子组件向父组件传递消息
- **Refs**：父组件访问子组件的实例或 DOM 元素

### 7.2 跨组件通信

- **Provide/Inject**：祖先组件向后代组件传递数据
- **Pinia/Vuex**：状态管理库
- **Event Bus**：事件总线

### 7.3 Provide/Inject 示例

```vue
<!-- GrandparentComponent.vue -->
<script setup>
import { provide, ref } from 'vue';
import ParentComponent from './ParentComponent.vue';
const theme = ref('light');
const changeTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
};
provide('theme', theme);
provide('changeTheme', changeTheme);
</script>
<!-- ChildComponent.vue -->
<script setup>
import { inject } from 'vue';
const theme = inject('theme', 'light');
const changeTheme = inject('changeTheme');
</script>
<template>
  <div :class="theme">
    <p>Current theme: {{ theme }}</p>
    <button @click="changeTheme">Change theme</button>
  </div>
</template>
<style scoped>
.light {
  background-color: white;
  color: black;
}
.dark {
  background-color: black;
  color: white;
}
</style>
```

## 8. 组件的高级特性

### 8.1 动态组件

```vue
<template>
  <div class="dynamic-component">
    <button @click="currentComponent = 'ComponentA'">Component A</button>
    <button @click="currentComponent = 'ComponentB'">Component B</button>
    <component :is="currentComponent"></component>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';
const currentComponent = ref('ComponentA');
</script>
```

### 8.2 异步组件

```vue
<template>
  <div class="async-component">
    <Suspense>
      <template #default>
        <AsyncComponent />
      </template>
      <template #fallback>
        <p>Loading...</p>
      </template>
    </Suspense>
  </div>
</template>
<script setup>
import { defineAsyncComponent } from 'vue'
const AsyncComponent = defineAsyncComponent({
 loader: () => import('./AsyncComponent.vue'),
 loadingComponent: () => '<p>Loading...</p>',
 errorComponent: () => '<p>Error</p>',
 delay: 200,
 timeout: 3000
}
</script>
```

### 8.3 递归组件

```vue
<template>
  <div class="tree-node">
    <div class="node-content" @click="toggle">
      {{ node.name }}
    </div>
    <div v-if="isOpen && node.children" class="node-children">
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const props = defineProps({
 node: Object
}
const isOpen = ref(false)
const toggle = () => {
 isOpen.value = !isOpen.value
}
</script>
<style scoped>
.tree-node {
  margin-left: 20px;
}
.node-content {
  cursor: pointer;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 5px 0;
}
.node-content:hover {
  background-color: #f0f0f0;
}
.node-children {
  margin-top: 5px;
}
</style>
```

## 9. 组件的最佳实践

### 9.1 组件设计原则

- **单一职责**：每个组件只负责一个功能
- **可复用性**：设计通用的、可复用的组件
- **可维护性**：代码清晰、易于理解和维护
- **性能优化**：避免不必要的渲染和计算

### 9.2 组件命名规范

- **组件名**：使用 PascalCase（大驼峰）命名
- **文件名**：使用 PascalCase 命名，与组件名一致
- **props 名**：使用 camelCase（小驼峰）命名
- **事件名**：使用 kebab-case（短横线分隔）命名

### 9.3 组件样式规范

- **使用 scoped**：避免样式冲突
- **使用 CSS 变量**：便于主题切换
- **使用 BEM 命名**：提高样式的可维护性
- **避免使用深度选择器**：保持组件的封装性

### 9.4 性能优化

- **使用 v-memo**：缓存计算结果
- **使用 v-once**：只渲染一次
- **使用 keep-alive**：缓存组件状态
- **使用 shallowRef 和 shallowReactive**：减少响应式开销
- **避免在模板中使用复杂表达式**：使用计算属性

## 10. 示例 | Examples

### 10.1 基础组件示例

```vue
<!-- Button.vue -->
<template>
  <button
    :class="['btn', `btn-${variant}`, { 'btn-disabled': disabled }]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot></slot>
  </button>
</template>
<script setup>
defineProps({
 variant: {
 type: String,
 default: 'primary',
 validator: (value) => {
 return ['primary', 'secondary', 'success', 'danger'].includes(value)
 }
 },
 disabled: {
 type: Boolean,
 default: false
 }
}
defineEmits(['click'])
</script>
<style scoped>
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary {
  background-color: #42b983;
  color: white;
}
.btn-secondary {
  background-color: #999;
  color: white;
}
.btn-success {
  background-color: #28a745;
  color: white;
}
.btn-danger {
  background-color: #dc3545;
  color: white;
}
.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

### 10.2 复杂组件示例

```vue
<!-- TodoList.vue -->
<template>
  <div class="todo-list">
    <h2>Todo List</h2>
    <div class="todo-input">
      <input v-model="newTodo" @keyup.enter="addTodo" placeholder="Add a new todo" />
      <button @click="addTodo">Add</button>
    </div>
    <ul class="todo-items">
      <li v-for="todo in todos" :key="todo.id" class="todo-item">
        <input type="checkbox" v-model="todo.completed" @change="updateTodo(todo)" />
        <span :class="{ completed: todo.completed }">{{ todo.text }}</span>
        <button @click="deleteTodo(todo.id)">Delete</button>
      </li>
    </ul>
    <div class="todo-stats">
      <p>Total: {{ todos.length }}</p>
      <p>Completed: {{ completedCount }}</p>
      <p>Remaining: {{ remainingCount }}</p>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
const todos = ref([
 { id: 1, text: 'Learn Vue3', completed: false },
 { id: 2, text: 'Build a project', completed: false },
 { id: 3, text: 'Deploy to production', completed: false }
]
const newTodo = ref('')
const completedCount = computed(() => {
 return todos.value.filter(todo => todo.completed).length
}
const remainingCount = computed(() => {
 return todos.value.filter(todo => !todo.completed).length
}
const addTodo = () => {
 if (newTodo.value.trim()) {
 todos.value.push({
 id: Date.now(),
 text: newTodo.value.trim(),
 completed: false
 })
 newTodo.value = ''
 }
}
const updateTodo = (todo) => {
 // 可以在这里添加更新逻辑，比如发送到服务器
 console.log('Updated todo:', todo)
}
const deleteTodo = (id) => {
 todos.value = todos.value.filter(todo => todo.id !== id)
}
</script>
<style scoped>
.todo-list {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.todo-input {
  display: flex;
  margin-bottom: 20px;
}
.todo-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}
.todo-input button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}
.todo-items {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}
.todo-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.todo-item input {
  margin-right: 10px;
}
.todo-item span {
  flex: 1;
}
.todo-item .completed {
  text-decoration: line-through;
  color: #999;
}
.todo-item button {
  padding: 4px 8px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.todo-stats {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}
</style>
```

## 11. 小结 | Summary

Vue3 的组件系统是其核心特性之一，它提供了一种清晰、模块化的方式来组织和管理应用的 UI 结构。通过本章节的学习，你已经了解了 Vue3 组件系统的基本概念和使用方法，包括单文件组件、props、事件、插槽、生命周期、组件通信和高级特性。
组件系统的核心优势在于它允许我们将 UI 拆分为独立、可复用的部分，使代码更加模块化、可维护。在实际开发中，要遵循组件设计原则，使用合适的命名规范和样式规范，注意性能优化，以构建高质量的 Vue3 应用。
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
