## 前置知识

- [Vue3 快速入门指南](/vue3/002-Vue3QuickStartGuide)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 插值表达式」的核心机制、典型用法与常见陷阱
- 掌握「2. 指令」的核心机制、典型用法与常见陷阱
- 掌握「3. 模板表达式」的核心机制、典型用法与常见陷阱
- 掌握「4. 模板编译」的核心机制、典型用法与常见陷阱
- 掌握「5. 最佳实践」的核心机制、典型用法与常见陷阱


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
}
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
}
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
]
const user = reactive({
 name: '张三',
 age: 20,
 email: 'zhangsan@example.com'
}
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
}
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
}
function handleMouseEnter() {
  console.log('鼠标进入事件');
}
function handleMouseLeave() {
  console.log('鼠标离开事件');
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
}
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
});
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN').format(date);
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
## 文本插值

**Mustache 文本插值**
`{{ <expression> }}`
```vue
<template>
  <span>{{ message }}</span>
  <span>{{ count + 1 }}</span>
  <span>{{ reverseMessage() }}</span>
  <span>{{ user.name + ' - ' + user.age }}</span>
</template>
```

**v-text 设置元素文本**
`v-text="<expression>"`
```vue
<span v-text="message"></span>
```

**v-html 设置 HTML 内容**
`v-html="<htmlString>"`
```vue
<div v-html="rawHtml"></div>
```

---

## 属性绑定 v-bind

**v-bind 单属性绑定**
`v-bind:<attr>="<value>"` / `:<attr>="<value>"`
```vue
<img v-bind:src="imageUrl" />
<a :href="url" :title="title">链接</a>
<button :disabled="isDisabled">提交</button>
```

**动态属性名**
`:[<attrExpr>]="<value>"`
```vue
<a :[attrName]="url">动态属性</a>
```

**对象语法(多属性一次性绑定)**
`:<attr>="{ <key>: <value>, ... }"` / `v-bind="<object>"`
```vue
<div :class="{ active: isActive, 'has-error': hasError }"></div>
<div :style="{ color: activeColor, fontSize: size + 'px' }"></div>
<div v-bind="attributeObject"></div>
```

**数组语法(class/style)**
```vue
<div :class="[activeClass, errorClass]"></div>
<div :class="[isActive ? 'active' : '', errorClass]"></div>
<div :class="[{ active: isActive }, errorClass]"></div>
<div :style="[baseStyles, overridingStyles]"></div>
```

---

## 事件绑定 v-on

**v-on 事件绑定**
`v-on:<event>="<handler>"` / `@<event>="<handler>"`
```vue
<button v-on:click="handleClick">点击</button>
<button @click="count++">+1</button>
<input @input="onInput" @focus="onFocus" />
```

**内联调用与参数**
`@<event>="<handler>(<args>)"`
```vue
<button @click="say('hello', $event)">say</button>
<button @click="handle(item, index)">处理</button>
```

**事件修饰符**
`@<event>.<modifier>="<handler>"`
```vue
<a @click.stop="onClick">阻止冒泡</a>
<form @submit.prevent="onSubmit">阻止默认</form>
<div @click.capture="onClick">捕获模式</div>
<div @click.self="onSelf">仅自身触发</div>
<div @click.once="onClick">只触发一次</div>
<div @scroll.passive="onScroll">滚动优化</div>
```

**按键修饰符**
```vue
<input @keyup.enter="onEnter" />
<input @keyup.esc="onEsc" />
<input @keydown.page-down="onPageDown" />
```

**系统修饰符组合**
```vue
<input @keyup.ctrl.enter="onCtrlEnter" />
<div @click.ctrl="onCtrlClick">Ctrl+Click</div>
<div @click.exact="onExactClick">仅精确按键</div>
```

**鼠标按键修饰符**
```vue
<div @click.left="onLeft">左键</div>
<div @click.right="onRight">右键</div>
<div @click.middle="onMiddle">中键</div>
```

---

## 条件渲染 v-if

**v-if / v-else-if / v-else**
```vue
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>其他</div>
```

**v-show 切换 display**
`v-show="<expression>"`
```vue
<h1 v-show="isVisible">Hello</h1>
```

**template 包裹多元素条件**
```vue
<template v-if="ok">
  <h1>标题</h1>
  <p>段落</p>
</template>
```

---

## 列表渲染 v-for

**v-for 数组遍历**
`v-for="(<item>, [index]) in <array>"` / `v-for="(<item>, [index]) of <array>"`
```vue
<li v-for="(item, index) in items" :key="item.id">
  {{ index }} - {{ item.name }}
</li>
<li v-for="item of items" :key="item.id">{{ item }}</li>
```

**v-for 对象遍历**
`v-for="(<value>, [key], [index]) in <object>"`
```vue
<li v-for="(value, key) in user" :key="key">
  {{ key }}: {{ value }}
</li>
```

**v-for 数字范围**
`v-for="<n> in <number>"`
```vue
<span v-for="n in 10" :key="n">{{ n }}</span>
```

**template 多元素遍历**
```vue
<template v-for="item in items" :key="item.id">
  <li>{{ item.name }}</li>
  <li>{{ item.desc }}</li>
</template>
```

---

## 双向绑定 v-model

**v-model 基础用法**
`v-model="<variable>"`
```vue
<input v-model="message" placeholder="输入" />
<textarea v-model="text"></textarea>
<input type="checkbox" v-model="checked" />
<select v-model="selected"><option value="a">A</option></select>
```

**复选框绑定数组**
```vue
<input type="checkbox" value="A" v-model="checkedNames" />
<input type="checkbox" value="B" v-model="checkedNames" />
```

**单选按钮**
```vue
<input type="radio" value="One" v-model="picked" />
<input type="radio" value="Two" v-model="picked" />
```

**选择框多选**
```vue
<select v-model="multi" multiple>
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**v-model 修饰符**
```vue
<input v-model.lazy="message" />          <!-- 失焦或回车同步 -->
<input v-model.number="age" />            <!-- 转为数字 -->
<input v-model.trim="msg" />              <!-- 去除首尾空格 -->
```

**v-model 自定义组件(双向绑定)**
```vue
<MyInput v-model="searchText" />
<MyInput v-model:modelValue="val" />
<MyInput v-model:title="title" />
```

**组件内定义(defineModel - Vue 3.4+)**
```vue
<!-- Child.vue -->
<script setup>
const model = defineModel();
function update() {
  model.value = 'new value';
}
</script>
```

---

## 其他指令

**v-once 一次性渲染**
```vue
<span v-once>{{ msg }}</span>
<div v-once>
  <h1>静态内容</h1>
  <p>{{ computed }}</p>
</div>
```

**v-memo 性能优化缓存**
`v-memo="[<dep1>, <dep2>]"`
```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
</div>
```

**v-cloak 隐藏未编译模板**
```vue
<div v-cloak>{{ message }}</div>
<style>[v-cloak] { display: none; }</style>
```

**v-pre 跳过编译**
```vue
<span v-pre>{{ this will not be compiled }}</span>
```
