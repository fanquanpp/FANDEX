# Transition + TransitionGroup 组件语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Transition 单元素过渡

**Transition 基础用法**
```vue
<template>
  <button @click="show = !show">切换</button>
  <Transition name="fade">
    <p v-if="show">Hello</p>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

<script setup>
import { ref } from 'vue';
const show = ref(true);
</script>
```

**Transition 类名约定**
```css
.<name>-enter-from { /* 进入起点 */ }
.<name>-enter-active { /* 进入过程 */ }
.<name>-enter-to { /* 进入终点 */ }
.<name>-leave-from { /* 离开起点 */ }
.<name>-leave-active { /* 离开过程 */ }
.<name>-leave-to { /* 离开终点 */ }
```

**Transition 自定义类名**
```vue
<Transition
  enter-from-class="custom-enter-from"
  enter-active-class="custom-enter-active"
  enter-to-class="custom-enter-to"
  leave-from-class="custom-leave-from"
  leave-active-class="custom-leave-active"
  leave-to-class="custom-leave-to"
>
  <div v-if="show">content</div>
</Transition>
```

---

## Transition Props

**name 与 appear**
`<Transition name="<name>" appear>`
```vue
<Transition name="fade" appear>
  <p v-if="show">初次渲染也会执行动画</p>
</Transition>
```

**type 与 duration**
`<Transition type="<transition|animation>" :duration="<ms>">`
```vue
<Transition type="transition" :duration="1000">
  <div v-if="show">content</div>
</Transition>

<Transition :duration="{ enter: 500, leave: 800 }">
  <div v-if="show">content</div>
</Transition>
```

**mode 过渡模式**
`<Transition mode="<out-in|in-out>">`
```vue
<!-- 先离开再进入 -->
<Transition mode="out-in">
  <component :is="currentComp" />
</Transition>

<!-- 同时进行(默认) -->
<Transition>
  <div :key="current">content</div>
</Transition>
```

---

## Transition 钩子

**JavaScript 钩子**
```vue
<Transition
  @before-enter="beforeEnter"
  @enter="enter"
  @after-enter="afterEnter"
  @enter-cancelled="enterCancelled"
  @before-leave="beforeLeave"
  @leave="leave"
  @after-leave="afterLeave"
  @leave-cancelled="leaveCancelled"
>
  <div v-if="show">content</div>
</Transition>

<script setup>
function beforeEnter(el) {
  el.style.opacity = 0;
}
function enter(el, done) {
  // 调用 done 表示动画完成
  el.offsetHeight;  // 触发重排
  el.style.transition = 'opacity 0.5s';
  el.style.opacity = 1;
  el.addEventListener('transitionend', done);
}
function afterEnter(el) {
  console.log('enter 完成');
}
function leave(el, done) {
  el.style.opacity = 0;
  el.addEventListener('transitionend', done);
}
</script>
```

**CSS 与 JS 钩子组合**
```vue
<Transition
  name="fade"
  @enter="onEnter"
  :css="false"
>
  <div v-if="show">content</div>
</Transition>

<script setup>
function onEnter(el, done) {
  // :css="false" 跳过 CSS 类名规则,完全用 JS 控制
  gsap.to(el, { opacity: 1, duration: 0.5, onComplete: done });
}
</script>
```

---

## TransitionGroup 列表过渡

**TransitionGroup 基础**
```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </TransitionGroup>
</template>

<style>
.list-enter-active, .list-leave-active {
  transition: all 0.5s;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.5s;
}
</style>
```

**TransitionGroup Props**
```vue
<TransitionGroup
  name="list"
  tag="ul"
  appear
  :css="true"
>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</TransitionGroup>
```

**移动动画**
```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</TransitionGroup>

<style>
.list-move {
  transition: transform 0.5s ease;
}
.list-enter-active, .list-leave-active {
  transition: all 0.5s ease;
}
.list-leave-active {
  position: absolute;  /* 离开时脱离文档流,触发 move 动画 */
}
</style>
```

**TransitionGroup 钩子**
```vue
<TransitionGroup
  tag="ul"
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @leave="onLeave"
  @before-leave="onBeforeLeave"
>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</TransitionGroup>
```

---

## 动画集成

**CSS animation 动画**
```vue
<Transition name="bounce">
  <p v-if="show">Bounce!</p>
</Transition>

<style>
.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
</style>
```

**GSAP 集成**
```vue
<script setup>
import { ref } from 'vue';
import gsap from 'gsap';

const show = ref(true);

function onEnter(el, done) {
  gsap.fromTo(el,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.5, onComplete: done }
  );
}

function onLeave(el, done) {
  gsap.to(el, {
    opacity: 0, y: -30, duration: 0.5, onComplete: done
  });
}
</script>

<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <p v-if="show">Animated</p>
  </Transition>
</template>
```

---

## 综合应用

**列表删除/添加/排序动画**
```vue
<script setup>
import { ref, reactive } from 'vue';
const items = ref([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
]);
let nextId = 4;

function add() {
  items.value.push({ id: nextId++, name: String.fromCharCode(64 + nextId) });
}
function remove(index) {
  items.value.splice(index, 1);
}
function shuffle() {
  items.value = items.value.sort(() => Math.random() - 0.5);
}
</script>

<template>
  <button @click="add">添加</button>
  <button @click="shuffle">随机排序</button>
  <TransitionGroup name="list" tag="ul">
    <li v-for="(item, index) in items" :key="item.id">
      {{ item.name }}
      <button @click="remove(index)">删除</button>
    </li>
  </TransitionGroup>
</template>

<style>
.list-enter-active, .list-leave-active, .list-move {
  transition: all 0.5s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-active {
  position: absolute;
}
</style>
```

**Transition + 动态组件**
```vue
<template>
  <button @click="toggle">切换</button>
  <Transition name="fade" mode="out-in">
    <component :is="currentComp" />
  </Transition>
</template>

<script setup>
import { ref, computed, shallowRef } from 'vue';
import CompA from './CompA.vue';
import CompB from './CompB.vue';

const isA = ref(true);
const currentComp = computed(() => isA.value ? CompA : CompB);
const toggle = () => { isA.value = !isA.value; };
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```
