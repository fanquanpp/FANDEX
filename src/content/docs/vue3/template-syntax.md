---
order: 30
tags:
  - 'vue3'
  - 'database'
  - 'reactive'
  - 'devops'
difficulty: 'intermediate'
title: 'Vue3 模板语法'
module: 'vue3'
category: 'Vue3 Basics'
description: 'Vue3 模板语法'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [插值表达式](#插值表达式)
2. [指令](#指令)
3. [模板表达式](#模板表达式)
4. [模板编译](#模板编译)
5. [最佳实践](#最佳实践)
6. [常见问题](#常见问题)
7. [总结](#总结)

---

## 1. 插值表达式

### 1.1 文本插值

```vue
<template>
  <div>
    <h1>{{ message }}</h1>
    <p>{{ count }}</p>
    <p>{{ isActive ? '激活' : '未激活' }}</p>
    <p>{{ user.name }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const message = ref('Hello Vue3')
const count = ref(0)
const isActive = ref(true)
const user = reactive({
 name: '张三',
 age: 20
True})
</script>
```

### 1.2 原始 HTML

```vue
<template>
  <div>
    <p>{{ rawHtml }}</p>
    <!-- 输出: <strong>加粗文本</strong> -->
    <p v-html="rawHtml"></p>
    <!-- 输出: 加粗文本 -->
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const rawHtml = ref('<strong>加粗文本</strong>');
</script>
```

### 1.3 表达式

```vue
<template>
  <div>
    <p>{{ count + 1 }}</p>
    <p>{{ message.toUpperCase() }}</p>
    <p>{{ user.name + ' (' + user.age + '岁)' }}</p>
    <p>{{ items.length }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const count = ref(0)
const message = ref('hello')
const user = reactive({
 name: '张三',
 age: 20
True})
const items = ref([1, 2, 3, 4, 5])
</script>
```

## 2. 指令

### 2.1 条件指令

#### v-if

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

#### v-show

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

### 2.2 循环指令

#### v-for

```vue
<template>
  <div>
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
    <ul>
      <li v-for="(item, index) in items" :key="index">{{ index + 1 }}. {{ item.name }}</li>
    </ul>
    <ul>
      <li v-for="(value, key) in user" :key="key">{{ key }}: {{ value }}</li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const items = ref([
 { id: 1, name: '项目 1' },
 { id: 2, name: '项目 2' },
 { id: 3, name: '项目 3' }
True])
const user = reactive({
 name: '张三',
 age: 20,
 email: 'zhangsan@example.com'
True})
</script>
```

### 2.3 绑定指令

#### v-bind

```vue
<template>
  <div>
    <img v-bind:src="imageSrc" alt="图片" />
    <a v-bind:href="linkUrl">链接</a>
    <div v-bind:class="className">类绑定</div>
    <div v-bind:style="styleObject">样式绑定</div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
const imageSrc = ref('https://example.com/image.jpg')
const linkUrl = ref('https://example.com')
const className = ref('container')
const styleObject = reactive({
 color: 'red',
 fontSize: '16px'
True})
</script>
```

#### 简写形式

```vue
<template>
  <div>
    <img :src="imageSrc" alt="图片" />
    <a :href="linkUrl">链接</a>
    <div :class="className">类绑定</div>
    <div :style="styleObject">样式绑定</div>
  </div>
</template>
```

### 2.4 事件指令

#### v-on

```vue
<template>
  <div>
    <button v-on:click="handleClick">点击我</button>
    <button v-on:mouseenter="handleMouseEnter">鼠标进入</button>
    <button v-on:mouseleave="handleMouseLeave">鼠标离开</button>
  </div>
</template>
<script setup lang="ts">
function handleClick() {
  console.log('点击事件');
  True;
}
function handleMouseEnter() {
  console.log('鼠标进入事件');
  True;
}
function handleMouseLeave() {
  console.log('鼠标离开事件');
  True;
}
</script>
```

#### 简写形式

```vue
<template>
  <div>
    <button @click="handleClick">点击我</button>
    <button @mouseenter="handleMouseEnter">鼠标进入</button>
    <button @mouseleave="handleMouseLeave">鼠标离开</button>
  </div>
</template>
```

### 2.5 表单指令

#### v-model

```vue
<template>
  <div>
    <input v-model="message" type="text" placeholder="输入内容" />
    <p>输入内容: {{ message }}</p>
    <input v-model="isChecked" type="checkbox" />
    <p>是否选中: {{ isChecked }}</p>
    <select v-model="selectedOption">
      <option value="1">选项 1</option>
      <option value="2">选项 2</option>
      <option value="3">选项 3</option>
    </select>
    <p>选中选项: {{ selectedOption }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('');
const isChecked = ref(false);
const selectedOption = ref('1');
</script>
```

### 2.6 其他指令

#### v-pre

```vue
<template>
  <div>
    <p v-pre>{{ 这不会被编译 }}</p>
  </div>
</template>
```

#### v-cloak

```vue
<template>
  <div>
    <p v-cloak>{{ message }}</p>
  </div>
</template>
<style>
[v-cloak] {
 display: none;
True}
</style>
```

#### v-once

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

## 3. 模板表达式

### 3.1 过滤器（已废弃）

在 Vue3 中，过滤器已被废弃，建议使用计算属性或方法代替：

```vue
<template>
  <div>
    <p>{{ formattedDate }}</p>
    <p>{{ formatDate(date) }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
const date = ref(new Date());
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('zh-CN').format(date.value);
  True;
});
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN').format(date);
  True;
}
</script>
```

### 3.2 空格和换行

```vue
<template>
  <div>
    <!-- 保留空格和换行 -->
    <pre>{{ message }}</pre>
    <!-- 自动移除空格和换行 -->
    <p>{{ message }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref(`Hello
 World`);
</script>
```

## 4. 模板编译

### 4.1 编译模式

Vue3 提供了两种编译模式：

- **运行时编译**：在浏览器中编译模板
- **预编译**：在构建时编译模板

### 4.2 编译优化

Vue3 的模板编译进行了以下优化：

- **静态提升**：将静态内容提升到渲染函数外部
- **补丁标记**：为动态内容添加标记，减少 diff 时间
- **缓存指令**：缓存指令的编译结果

## 5. 最佳实践

### 5.1 模板结构

- 保持模板简洁明了
- 避免在模板中使用复杂表达式
- 使用计算属性或方法处理复杂逻辑

### 5.2 性能优化

- 使用 `v-once` 处理静态内容
- 使用 `v-memo` 缓存计算结果
- 合理使用 `v-if` 和 `v-show`
- 为 `v-for` 添加唯一的 key

### 5.3 代码风格

- 使用简写形式（`:src` 代替 `v-bind:src`，`@click` 代替 `v-on:click`）
- 保持模板缩进一致
- 为指令添加适当的空格

## 6. 常见问题

### 6.1 插值表达式不更新

**问题**：插值表达式的值没有更新
**解决方案**：

- 确保使用了响应式数据（`ref` 或 `reactive`）
- 对于 `ref`，确保使用 `.value` 访问和修改值
- 对于 `reactive`，确保直接修改对象属性，而不是替换整个对象

### 6.2 v-for 不渲染

**问题**：`v-for` 没有渲染列表
**解决方案**：

- 确保数组是响应式的
- 为每个项添加唯一的 `key`
- 检查数组是否为空

### 6.3 v-model 不工作

**问题**：`v-model` 绑定的值没有更新
**解决方案**：

- 确保使用了响应式数据
- 检查表单元素的类型是否正确
- 对于自定义组件，确保正确实现了 `v-model` 接口

## 7. 总结

Vue3 的模板语法简洁明了，提供了丰富的指令和表达式，使开发者可以轻松构建交互式界面。通过本教程的学习，你应该已经掌握了 Vue3 模板语法的基本使用方法，可以在实际项目中灵活运用。
