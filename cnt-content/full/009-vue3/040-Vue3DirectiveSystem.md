---
order: 40
title: Vue3 指令系统
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 内置指令、自定义指令与指令钩子函数。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'vue3/020-Vue3QuickStartGuide'
  - 'vue3/030-Vue3TemplateSyntax'
  - 'vue3/120-TeleportSuspense'
  - 'vue3/050-ReactiveSystem'
prerequisites: []
---

## 前置知识

- [Vue3 模板语法](/vue3/030-Vue3TemplateSyntax)：建议先完成前一篇的学习

## 学习目标

读完本文你将能够：

- 说清指令与手写 DOM 操作的对应关系：v-if/v-for/v-model 各收编了哪类命令式行为；
- 在 v-if 与 v-show、下标 key 与 id key 之间做出正确选择并解释原因；
- 用 `<script setup>` 的 vFocus 命名约定写出带完整生命周期的局部自定义指令，并处理好监听器清理；
- 判断一个 DOM 操作该用内置指令、自定义指令还是组合式函数来封装。


## 1. 指令概述

先回答为什么需要指令。模板里你写的 `<p>{{ text }}</p>` 是纯插值——把值放到那里。但大量界面行为不是「放个值」能表达的：这段内容「可能不出现」（条件）、这段要「重复 N 份」（列表）、这个输入要「和状态双向同步」（表单）。这些行为如果手写，就是 010 篇刚淘汰的命令式 DOM 操作：判断再增删节点、循环再克隆节点、监听 input 再回写状态。指令的作用是**把这些常见 DOM 行为声明成一个标记**，让编译器替你生成对应的命令式代码——你写 `v-if`，编译器生成增删节点；你写 `v-for`，编译器生成循环克隆。所以指令不是「模板里多出来的功能」，而是「本该手写的 DOM 操作的声明式收编」。

指令是 Vue 模板中特殊的标记，以 `v-` 前缀开头，用于在 DOM 上应用特殊的响应式行为。Vue3 提供了丰富的内置指令，同时支持自定义指令——当内置指令覆盖不了某个「操作 DOM 的通用行为」（如自动聚焦、拖拽）时，自定义指令让你把自己的命令式操作也收编成声明式标记。学习时按三问推进：这个指令解决什么 DOM 行为？和近邻指令的分工边界在哪（v-if 与 v-show、v-for 的 key）？什么场景该改用自定义指令而不是堆逻辑？

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

**依赖数组的语义**：依赖数组里的值都没变时，Vue 跳过该子树的整体更新——依赖数组为空数组 `[ ]` 是极端情况：没有任何依赖参与比较，子树**只随父级首次渲染一次**，之后即使父组件重渲染也不再更新，等价于 `v-once` 的「渲染一次」语义（区别在 v-once 缓存的是渲染结果本身，v-memo `[ ]` 缓存的是 vnode 引用）。因此 `[ ]` 只适合「内容完全由初始数据决定、永不变化」的节点；只要节点里有任何会变的插值，就必须把它列进依赖数组，否则界面会停在旧值——这是 v-memo 最常见的误用。

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
 })
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

**定义**：`<script setup>` 里不需要任何导入，也不用注册函数——只要声明一个以 `v` 开头的驼峰变量（如 `vFocus`），模板里就能直接用 `v-focus`。这是编译器的命名约定，`<script setup>` 会在编译时自动识别 `vXxx` 形式的变量并把它当指令绑定到对应模板。

```vue
<template>
  <div>
    <input v-focus type="text" placeholder="自动聚焦" />
    <div v-highlight="{ color: 'red' }">高亮文本</div>
  </div>
</template>
<script setup lang="ts">
// 定义局部自定义指令：变量名 vFocus 对应模板里的 v-focus
const vFocus = {
  mounted(el) {
    el.focus()
  }
}
const vHighlight = {
  mounted(el, binding) {
    el.style.color = binding.value.color
  },
  updated(el, binding) {
    el.style.color = binding.value.color
  }
}
</script>
```

这不是简写，而是 `<script setup>` 的正式用法：指令对象就是一个普通对象常量。若要在非 setup 组件（选项式）里用局部指令，则通过 `directives` 选项注册——两种写法背后的指令对象结构完全一致。

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
// vXxx 命名约定：无需导入，<script setup> 自动识别为局部指令
const vExample = {
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
import { ref } from 'vue'
const email = ref('')
const emailError = ref('')
const vValidate = {
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
import { ref } from 'vue'
const scrollTop = ref(0)
const vScroll = {
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
const vDraggable = {
  mounted(el) {
    let isDragging = false
    let startX = 0
    let startY = 0
    let initialLeft = 0
    let initialTop = 0
    const onMove = (e) => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      el.style.left = `${initialLeft + deltaX}px`
      el.style.top = `${initialTop + deltaY}px`
    }
    const onUp = () => {
      isDragging = false
      el.style.cursor = 'move'
    }
    const onDown = (e) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      initialLeft = el.offsetLeft
      initialTop = el.offsetTop
      el.style.cursor = 'grabbing'
    }
    el.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    // 卸载时清掉挂在 document 上的监听——元素没了，监听还在就是泄漏
    el._dragCleanup = () => {
      el.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  },
  unmounted(el) {
    el._dragCleanup?.()
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

## 自检

回答不出的回对应小节；模板题先遮住示例代码自己写，再对照。

1. v-if 与 v-show 的本质区别是什么？各适合什么切换频率？首屏渲染成本谁更低？
2. v-for 的 key 为什么不能省、不能用数组下标凑数？下标作 key 在「中间插入」时会发生什么？
3. `v-bind="obj"` 与 `:prop="obj.prop"` 的区别是什么？class 与 style 绑定支持哪些数据形态？
4. `<script setup>` 里写局部自定义指令需要导入什么？`vFocus` 变量是怎么变成 `v-focus` 指令的？
5. 自定义指令的钩子里，适合分别在 mounted 与 unmounted 做什么？为什么 document 级监听必须在 unmounted 清理？
6. v-memo 的依赖数组为空数组 `[ ]` 时行为是什么？什么场景才值得用它？

## 附录：内置指令速查

### 条件渲染指令

**v-if 条件渲染**
`v-if="<expression>"`
```vue
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>C</div>
```

**v-show 切换显示**
`v-show="<expression>"`
```vue
<h1 v-show="isVisible">Hello</h1>
```

**template + v-if**
```vue
<template v-if="ok">
  <h1>标题</h1>
  <p>段落</p>
</template>
```

---

### 列表渲染指令

**v-for 数组遍历**
`v-for="(<item>, [index]) in <list>" :key="<key>"`
```vue
<li v-for="(item, index) in items" :key="item.id">
  {{ index }}: {{ item.name }}
</li>
```

**v-for 对象遍历**
`v-for="(<value>, [key], [index]) in <object>"`
```vue
<li v-for="(value, key) in user" :key="key">{{ key }}: {{ value }}</li>
```

**v-for 数字范围**
`v-for="<n> in <number>"`
```vue
<span v-for="n in 10" :key="n">{{ n }} </span>
```

**v-for 与 v-if 优先级注意**
```vue
<!-- 推荐写法:用 computed 过滤 -->
<template v-for="item in visibleItems" :key="item.id">
  <li>{{ item.name }}</li>
</template>
```

---

### 属性与事件指令

**v-bind 属性绑定**
`v-bind:<attr>="<value>"` / `:<attr>="<value>"`
```vue
<img :src="url" :alt="altText" />
<button :disabled="isLoading">提交</button>
<div :class="{ active: isActive }" :style="{ color: theme }"></div>
```

**v-bind 动态属性**
`:[<attrExpr>]="<value>"`
```vue
<a :[attrName]="url">链接</a>
```

**v-bind 对象展开**
`v-bind="<object>"`
```vue
<div v-bind="attributeObject"></div>
```

**v-on 事件绑定**
`v-on:<event>[.<modifier>]="<handler>"` / `@<event>[.<modifier>]="<handler>"`
```vue
<button @click="onClick">点击</button>
<form @submit.prevent="onSubmit">提交</form>
<input @keyup.enter="onEnter" />
<a @click.stop="onLinkClick">链接</a>
```

---

### 双向绑定指令

**v-model 基础用法**
`v-model[.<modifier>]="<variable>"`
```vue
<input v-model="message" />
<input v-model.lazy="message" />
<input v-model.number="age" />
<input v-model.trim="text" />
<textarea v-model="content"></textarea>
```

**v-model 不同表单元素**
```vue
<input type="checkbox" v-model="checked" />
<input type="checkbox" value="A" v-model="checkedNames" />
<input type="radio" value="Yes" v-model="picked" />
<select v-model="selected">
  <option value="a">A</option>
</select>
<select v-model="multi" multiple></select>
```

**v-model 绑定到组件**
```vue
<MyInput v-model="text" />
<MyInput v-model:title="title" />
<MyInput v-model:show="isVisible" />
```

---

### 文本渲染指令

**v-text 设置文本**
`v-text="<expression>"`
```vue
<span v-text="message"></span>
```

**v-html 设置 HTML**
`v-html="<htmlString>"`
```vue
<div v-html="rawHtml"></div>
```

**Mustache 插值**
`{{ <expression> }}`
```vue
<span>{{ message }}</span>
<span>{{ count + 1 }}</span>
<span>{{ ok ? '是' : '否' }}</span>
```

---

### 性能优化指令

**v-once 一次性渲染**
`v-once`
```vue
<span v-once>{{ msg }}</span>
<div v-once>
  <h1>{{ title }}</h1>
  <p>{{ content }}</p>
</div>
```

**v-memo 依赖缓存**
`v-memo="[<dep1>, <dep2>, ...]"`
```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
  <span v-if="item.selected">已选</span>
</div>
```

**v-pre 跳过编译**
`v-pre`
```vue
<span v-pre>{{ this will not compile }}</span>
<div v-pre>
  <raw-content>{{ keepAsIs }}</raw-content>
</div>
```

**v-cloak 隐藏未编译**
`v-cloak`
```vue
<div v-cloak>{{ message }}</div>
<style>
[v-cloak] { display: none; }
</style>
```

---

### 指令缩写

**v-bind 缩写**
```vue
<!-- 完整 -->
<img v-bind:src="url" />
<!-- 缩写 -->
<img :src="url" />
<!-- 动态属性缩写 -->
<a :[attrName]="url" />
```

**v-on 缩写**
```vue
<!-- 完整 -->
<button v-on:click="onClick">点击</button>
<!-- 缩写 -->
<button @click="onClick">点击</button>
```
