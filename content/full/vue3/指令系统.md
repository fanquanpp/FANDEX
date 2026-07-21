---
order: 40
tags:
  - vue3
difficulty: intermediate
title: 'Vue3 指令系统'
module: vue3
category: 'Vue3 Basics'
description: 内置指令、自定义指令与指令钩子函数。
author: fanquanpp
updated: '2026-05-03'
related:
  - vue3/快速入门指南
  - vue3/模板语法
  - vue3/Teleport与Suspense
  - vue3/组合式API
prerequisites:
  - vue3/语法速查
---

## 1. 指令概述

指令是 Vue 模板中特殊的标记，以 `v-` 前缀开头，用于在 DOM 上应用特殊的响应式行为。Vue3 提供了丰富的内置指令，同时支持自定义指令。

## 2. 内置指令

### 2.1 条件渲染指令

#### v-if

**作用**：根据表达式的值条件性地渲染元素
**用法**：

```vue
<template>
  <div>
    <p v-if="isLoggedIn">欢迎回来！</p>
    <p v-else>请登录</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const isLoggedIn = ref(false);
</script>
```

#### v-else-if

**作用**：与 `v-if` 配合使用，作为其 else-if 分支
**用法**：

```vue
<template>
  <div>
    <p v-if="score >= 90">优秀</p>
    <p v-else-if="score >= 80">良好</p>
    <p v-else-if="score >= 60">及格</p>
    <p v-else>不及格</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const score = ref(85);
</script>
```

#### v-else

**作用**：与 `v-if` 或 `v-else-if` 配合使用，作为最后的 else 分支
**用法**：见上面的示例

#### v-show

**作用**：根据表达式的值条件性地显示元素（通过 CSS display 属性）
**用法**：

```vue
<template>
  <div>
    <p v-show="isVisible">这是一个可显示/隐藏的元素</p>
    <button @click="isVisible = !isVisible">切换显示</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const isVisible = ref(true);
</script>
```

**v-if vs v-show**：

- `v-if`：真正的条件渲染，会销毁和重建元素
- `v-show`：只是切换元素的 display 属性，元素始终存在

### 2.2 列表渲染指令

#### v-for

**作用**：基于源数据多次渲染元素
**用法**：

```vue
<template>
  <div>
    <!-- 遍历数组 -->
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
    <!-- 遍历数组（带索引） -->
    <ul>
      <li v-for="(item, index) in items" :key="index">{{ index + 1 }}. {{ item.name }}</li>
    </ul>
    <!-- 遍历对象 -->
    <ul>
      <li v-for="(value, key, index) in user" :key="key">
        {{ index + 1 }}. {{ key }}: {{ value }}
      </li>
    </ul>
    <!-- 遍历数字 -->
    <ul>
      <li v-for="n in 5" :key="n">
        {{ n }}
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const items = ref([
 { id: 1, name: '项目 1' },
 { id: 2, name: '项目 2' },
 { id: 3, name: '项目 3' }
]
const user = reactive({
 name: '张三',
 age: 20,
 email: 'zhangsan@example.com'
}
</script>
```

**key 的重要性**：

- 用于 Vue 的虚拟 DOM 算法，提高渲染性能
- 必须是唯一的，且不应该在渲染过程中改变
- 推荐使用稳定且唯一的 ID，避免使用索引

### 2.3 属性绑定指令

#### v-bind

**作用**：动态绑定一个或多个属性，或一个组件 prop 到表达式
**用法**：

```vue
<template>
  <div>
    <!-- 绑定单个属性 -->
    <img v-bind:src="imageSrc" alt="图片" />
    <a v-bind:href="linkUrl">链接</a>
    <!-- 简写形式 -->
    <img :src="imageSrc" alt="图片" />
    <a :href="linkUrl">链接</a>
    <!-- 绑定多个属性 -->
    <div v-bind="objectOfAttrs"></div>
    <!-- 绑定 class -->
    <div :class="className">单个类</div>
    <div :class="[classA, classB]">多个类</div>
    <div :class="{ active: isActive, 'text-danger': hasError }">条件类</div>
    <!-- 绑定 style -->
    <div :style="styleObject">对象样式</div>
    <div :style="[styleObject1, styleObject2]">多个样式</div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const imageSrc = ref('https://example.com/image.jpg')
const linkUrl = ref('https://example.com')
const className = ref('container')
const classA = ref('class-a')
const classB = ref('class-b')
const isActive = ref(true)
const hasError = ref(false)
const objectOfAttrs = reactive({
 id: 'container',
 class: 'box'
}
const styleObject = reactive({
 color: 'red',
 fontSize: '16px'
}
const styleObject1 = reactive({
 color: 'blue'
}
const styleObject2 = reactive({
 fontSize: '18px'
}
</script>
```

### 2.4 事件处理指令

#### v-on

**作用**：监听 DOM 事件
**用法**：

```vue
<template>
  <div>
    <!-- 基本用法 -->
    <button v-on:click="handleClick">点击我</button>
    <!-- 简写形式 -->
    <button @click="handleClick">点击我</button>
    <!-- 带参数 -->
    <button @click="handleClickWithParam('Hello')">点击我</button>
    <!-- 带事件对象 -->
    <button @click="handleClickWithEvent">点击我</button>
    <!-- 事件修饰符 -->
    <button @click.stop="handleClick">阻止冒泡</button>
    <button @click.prevent="handleSubmit">阻止默认行为</button>
    <button @click.capture="handleClick">捕获模式</button>
    <button @click.self="handleClick">仅自身触发</button>
    <button @click.once="handleClick">仅触发一次</button>
    <!-- 按键修饰符 -->
    <input @keyup.enter="handleEnter" placeholder="按 Enter 键" />
    <input @keyup.esc="handleEsc" placeholder="按 Esc 键" />
    <!-- 系统修饰符 -->
    <button @click.ctrl="handleCtrlClick">Ctrl + 点击</button>
    <button @click.alt="handleAltClick">Alt + 点击</button>
  </div>
</template>
<script setup lang="ts">
function handleClick() {
  console.log('点击事件');
}
function handleClickWithParam(message: string) {
  console.log('点击事件，参数:', message);
}
function handleClickWithEvent(event: MouseEvent) {
  console.log('点击事件，事件对象:', event);
}
function handleSubmit(event: Event) {
  console.log('提交事件');
}
function handleEnter() {
  console.log('Enter 键被按下');
}
function handleEsc() {
  console.log('Esc 键被按下');
}
function handleCtrlClick() {
  console.log('Ctrl + 点击');
}
function handleAltClick() {
  console.log('Alt + 点击');
}
</script>
```

### 2.5 表单输入绑定指令

#### v-model

**作用**：在表单元素上创建双向数据绑定
**用法**：

```vue
<template>
  <div>
    <!-- 文本输入 -->
    <input v-model="message" type="text" placeholder="输入内容" />
    <p>输入内容: {{ message }}</p>
    <!-- 多行文本 -->
    <textarea v-model="textareaContent" placeholder="输入多行内容"></textarea>
    <p>多行内容: {{ textareaContent }}</p>
    <!-- 复选框 -->
    <input v-model="isChecked" type="checkbox" />
    <p>是否选中: {{ isChecked }}</p>
    <!-- 多个复选框 -->
    <div>
      <input v-model="checkedValues" type="checkbox" value="option1" /> 选项 1
      <input v-model="checkedValues" type="checkbox" value="option2" /> 选项 2
      <input v-model="checkedValues" type="checkbox" value="option3" /> 选项 3
    </div>
    <p>选中值: {{ checkedValues }}</p>
    <!-- 单选按钮 -->
    <div>
      <input v-model="selectedRadio" type="radio" value="option1" /> 选项 1
      <input v-model="selectedRadio" type="radio" value="option2" /> 选项 2
    </div>
    <p>选中值: {{ selectedRadio }}</p>
    <!-- 选择框 -->
    <select v-model="selectedOption">
      <option value="">请选择</option>
      <option value="option1">选项 1</option>
      <option value="option2">选项 2</option>
      <option value="option3">选项 3</option>
    </select>
    <p>选中值: {{ selectedOption }}</p>
    <!-- 多选选择框 -->
    <select v-model="selectedOptions" multiple>
      <option value="option1">选项 1</option>
      <option value="option2">选项 2</option>
      <option value="option3">选项 3</option>
    </select>
    <p>选中值: {{ selectedOptions }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('');
const textareaContent = ref('');
const isChecked = ref(false);
const checkedValues = ref<string[]>([]);
const selectedRadio = ref('');
const selectedOption = ref('');
const selectedOptions = ref<string[]>([]);
</script>
```

**修饰符**：

- `.lazy`：在 change 事件后更新
- `.number`：将输入值转换为数字
- `.trim`：去除输入值的首尾空格

```vue
<template>
  <div>
    <input v-model.lazy="message" type="text" />
    <input v-model.number="age" type="number" />
    <input v-model.trim="name" type="text" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('');
const age = ref(0);
const name = ref('');
</script>
```

### 2.6 其他内置指令

#### v-pre

**作用**：跳过这个元素及其子元素的编译过程
**用法**：

```vue
<template>
  <div>
    <p v-pre>{{ 这不会被编译 }}</p>
  </div>
</template>
```

#### v-cloak

**作用**：在 Vue 实例编译完成之前，隐藏元素
**用法**：

```vue
<template>
  <div>
    <p v-cloak>{{ message }}</p>
  </div>
</template>
<style>
[v-cloak] {
  display: none;
}
</style>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('Hello Vue3');
</script>
```

#### v-once

**作用**：只渲染元素和组件一次，随后的重新渲染会跳过
**用法**：

```vue
<template>
  <div>
    <p v-once>{{ message }}</p>
    <button @click="message = '更新后的消息'">更新消息</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('初始消息');
</script>
```

#### v-memo

**作用**：缓存元素或组件的渲染结果
**用法**：

```vue
<template>
  <div>
    <div v-memo="[valueA, valueB]">{{ valueA }} - {{ valueB }}</div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const valueA = ref(1);
const valueB = ref(2);
</script>
```

## 3. 自定义指令

### 3.1 全局自定义指令

**注册**：

```ts
 // main.ts
 import { createApp } from 'vue'
 import App from './App.vue'
 const app = createApp(App)
 // 注册全局自定义指令
 app.directive('focus', {
  mounted(el) {
  el.focus()
  }
 }
 app.mount('#app')
```

**使用**：

```vue
<template>
  <div>
    <input v-focus type="text" placeholder="自动聚焦" />
  </div>
</template>
```

### 3.2 局部自定义指令

**定义**：

```vue
<template>
  <div>
    <input v-focus type="text" placeholder="自动聚焦" />
    <div v-highlight="{ color: 'red' }">高亮文本</div>
  </div>
</template>
<script setup lang="ts">
import { directive } from 'vue'
// 定义局部自定义指令
const vFocus = directive('focus', {
 mounted(el) {
 el.focus()
 }
}
const vHighlight = directive('highlight', {
 mounted(el, binding) {
 el.style.color = binding.value.color
 },
 updated(el, binding) {
 el.style.color = binding.value.color
 }
}
</script>
```

### 3.3 指令生命周期钩子

- **created**：指令绑定到元素时调用
- **beforeMount**：元素插入 DOM 前调用
- **mounted**：元素插入 DOM 后调用
- **beforeUpdate**：元素更新前调用
- **updated**：元素更新后调用
- **beforeUnmount**：元素卸载前调用
- **unmounted**：元素卸载后调用
  **示例**：

```vue
<template>
  <div>
    <div v-example>示例元素</div>
  </div>
</template>
<script setup lang="ts">
import { directive } from 'vue'
const vExample = directive('example', {
 created(el) {
 console.log('指令创建')
 },
 beforeMount(el) {
 console.log('元素插入前')
 },
 mounted(el) {
 console.log('元素插入后')
 },
 beforeUpdate(el) {
 console.log('元素更新前')
 },
 updated(el) {
 console.log('元素更新后')
 },
 beforeUnmount(el) {
 console.log('元素卸载前')
 },
 unmounted(el) {
 console.log('元素卸载后')
 }
}
</script>
```

## 4. 指令的应用场景

### 4.1 表单验证

```vue
<template>
  <div>
    <input v-model="email" v-validate.email type="email" placeholder="请输入邮箱" />
    <p v-if="emailError">{{ emailError }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, directive } from 'vue'
const email = ref('')
const emailError = ref('')
const vValidate = directive('validate', {
 mounted(el, binding) {
 el.addEventListener('blur', () => {
 validate(el, binding)
 })
 },
 updated(el, binding) {
 validate(el, binding)
 }
}
function validate(el: HTMLInputElement, binding: any) {
 const value = el.value
 const type = binding.arg
 if (type === 'email') {
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 if (!emailRegex.test(value)) {
 emailError.value = '请输入有效的邮箱地址'
 } else {
 emailError.value = ''
 }
 }
}
</script>
```

### 4.2 滚动监听

```vue
<template>
  <div>
    <div v-scroll="handleScroll" style="height: 200px; overflow: auto;">
      <div style="height: 400px; background: #f0f0f0;">滚动内容</div>
    </div>
    <p>滚动位置: {{ scrollTop }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, directive } from 'vue'
const scrollTop = ref(0)
const vScroll = directive('scroll', {
 mounted(el, binding) {
 el.addEventListener('scroll', binding.value)
 },
 unmounted(el, binding) {
 el.removeEventListener('scroll', binding.value)
 }
}
function handleScroll(event: Event) {
 const target = event.target as HTMLElement
 scrollTop.value = target.scrollTop
}
</script>
```

### 4.3 拖拽功能

```vue
<template>
  <div>
    <div
      v-draggable
      style="width: 100px; height: 100px; background: #42b983; color: white; display: flex; align-items: center; justify-content: center; cursor: move; position: absolute; top: 0; left: 0;"
    >
      拖拽我
    </div>
  </div>
</template>
<script setup lang="ts">
import { directive } from 'vue'
const vDraggable = directive('draggable', {
 mounted(el) {
 let isDragging = false
 let startX = 0
 let startY = 0
 let initialLeft = 0
 let initialTop = 0
 el.addEventListener('mousedown', (e) => {
 isDragging =
 startX = e.clientX
 startY = e.clientY
 initialLeft = el.offsetLeft
 initialTop = el.offsetTop
 el.style.cursor = 'grabbing'
 })
 document.addEventListener('mousemove', (e) => {
 if (!isDragging) return
 const deltaX = e.clientX - startX
 const deltaY = e.clientY - startY
 el.style.left = `${initialLeft + deltaX}px`
 el.style.top = `${initialTop + deltaY}px`
 })
 document.addEventListener('mouseup', () => {
 isDragging = false
 el.style.cursor = 'move'
 })
 }
}
</script>
```

## 5. 最佳实践

### 5.1 指令的使用原则

- **简洁明了**：指令应该专注于单一功能
- **可复用性**：设计指令时考虑复用性
- **性能优化**：避免在指令中执行复杂操作
- **类型安全**：使用 TypeScript 为指令添加类型

### 5.2 内置指令的使用建议

- **v-if vs v-show**：频繁切换使用 `v-show`，条件不常变化使用 `v-if`
- **v-for**：始终添加唯一的 `key`
- **v-model**：合理使用修饰符
- **v-bind**：使用简写形式 `:`
- **v-on**：使用简写形式 `@`

### 5.3 自定义指令的使用建议

- **命名规范**：使用 kebab-case 命名
- **参数传递**：合理使用 binding 参数
- **生命周期**：在适当的生命周期钩子中执行操作
- **事件监听**：在 `unmounted` 中清理事件监听

## 6. 常见问题

### 6.1 指令不生效

**问题**：自定义指令没有生效
**解决方案**：

- 检查指令名称是否正确
- 检查指令注册方式是否正确
- 检查指令的生命周期钩子是否正确实现

### 6.2 指令参数传递

**问题**：无法正确传递参数给指令
**解决方案**：

- 使用 `binding.value` 获取指令值
- 使用 `binding.arg` 获取指令参数
- 使用 `binding.modifiers` 获取指令修饰符

### 6.3 指令性能问题

**问题**：指令导致性能下降
**解决方案**：

- 避免在指令中执行复杂操作
- 合理使用 `v-memo` 缓存渲染结果
- 在 `unmounted` 中清理资源

## 7. 总结

Vue3 的指令系统提供了丰富的功能，从基本的条件渲染、列表渲染到复杂的表单处理和自定义指令，为开发者提供了强大的工具。通过本教程的学习，你应该已经掌握了 Vue3 指令系统的基本使用方法和最佳实践，可以在实际项目中灵活运用。
