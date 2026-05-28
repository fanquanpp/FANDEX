---
order: 140
tags:
  - 'vue3'
  - 'exercises'
  - 'async'
  - 'functional'
  - 'reactive'
  - 'web-api'
difficulty: 'intermediate'
title: 'Vue3 练习题'
module: 'vue3'
description: 'Vue3 核心知识点配套练习，涵盖响应式、组件与路由。'
---

<summary>查看答案</summary>
**答案**: C
**解析**: `ref` 可用于任何类型（包括对象和数组），A 错。`reactive` 返回的代理对象重新赋值会丢失响应式，B 错。模板中 `ref` 自动解包，C 正确。两者性能差异可忽略，D 错。
</details>
### 2. 以下组合式 API 写法中，`computed` 的依赖追踪发生在？
```javascript
 const count = ref(0);
 const doubled = computed(() => count.value * 2);
 ```

A. `ref(0)` 调用时
B. `computed()` 调用时
C. 首次读取 `doubled.value` 时
D. `count.value` 变化时

<details>
<summary>查看答案</summary>
**答案**: C
**解析**: Vue3 的 `computed` 是惰性求值的。依赖追踪在 getter 函数首次执行时（即首次读取 `.value`）建立，而非创建时。之后当依赖变化时标记为 dirty，下次读取时重新计算。
</details>
### 3. 父子组件通信中，以下哪种方式不能实现子→父通信？
A. `emit`
B. `v-model`
C. `provide/inject`
D. `defineExpose` + `ref` 模板引用
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: `provide/inject` 是祖先→后代单向数据流，子组件无法通过 inject 向父组件传递数据。`emit` 和 `v-model`（语法糖基于 emit）是标准的子→父通信方式。`defineExpose` 配合模板 `ref` 可让父组件直接调用子组件方法。
</details>
### 4. 在 Pinia 中，以下哪种方式可以修改 store 状态？
A. 直接在组件中 `store.count++`
B. 通过 `$patch` 方法
C. 通过 action
D. 以上都可以
<details>
<summary>查看答案</summary>
**答案**: D
**解析**: Pinia 允许直接修改状态、使用 `$patch`（支持对象和函数形式）、以及通过 action 修改。这比 Vuex 更灵活，Vuex 要求必须通过 mutation 修改。
</details>
### 5. Vue Router 的导航守卫执行顺序是？
A. 组件内守卫 → 全局守卫 → 路由独享守卫
B. 全局前置守卫 → 路由独享守卫 → 组件内守卫 → 全局解析守卫 → 全局后置守卫
C. 全局后置守卫 → 路由独享守卫 → 组件内守卫
D. 路由独享守卫 → 全局守卫 → 组件内守卫
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: 完整顺序：`beforeEach` → `beforeEnter` → `beforeRouteEnter` → `beforeResolve` → `afterEach`。全局前置最先执行，组件内守卫在路由独享守卫之后。
</details>
## 编程题
### 1. 可复用的分页组合式函数
实现 `usePagination(fetchFn, pageSize)` 组合式函数，封装分页逻辑（当前页、总页数、翻页、数据加载状态）。
**输入**: `const { data, page, totalPages, nextPage, prevPage, loading } = usePagination(fetchUsers, 10)`
**输出**: 响应式的分页状态和控制方法
<details>
<summary>查看参考答案</summary>
```javascript
 import { ref, computed, watch } from 'vue';
 export function usePagination(fetchFn, pageSize = 10) {
  const page = ref(1);
  const data = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const totalPages = computed(() => Math.ceil(total.value / pageSize));
  async function fetchData() {
  loading.value = true;
  try {
  const res = await fetchFn({ page: page.value, pageSize });
  data.value = res.data;
  total.value = res.total;
  } finally {
  loading.value = false;
  }
  }
  function nextPage() {
  if (page.value < totalPages.value) {
  page.value++;
  }
  }
  function prevPage() {
  if (page.value > 1) {
  page.value--;
  }
  }
  watch(page, fetchData, { immediate:  });
  return { data, page, totalPages, nextPage, prevPage, loading };
 True}
 ```
</details>
### 2. Pinia Store 实战
为一个 Todo 应用创建 Pinia store，支持：添加、删除、切换完成状态、按状态筛选、统计未完成数量。
**输入**: 添加 3 个 todo，完成 1 个，筛选 `active`
**输出**: 返回 2 个未完成的 todo
<details>
<summary>查看参考答案</summary>
```javascript
 import { defineStore } from 'pinia';
 import { ref, computed } from 'vue';
 export const useTodoStore = defineStore('todo', () => {
  const todos = ref([]);
  const filter = ref('all');
  const filteredTodos = computed(() => {
  switch (filter.value) {
  case 'active':
  return todos.value.filter((t) => !t.done);
  case 'completed':
  return todos.value.filter((t) => t.done);
  default:
  return todos.value;
  }
  });
  const remaining = computed(() => todos.value.filter((t) => !t.done).length);
  function addTodo(text) {
  todos.value.push({ id: Date.now(), text, done: false });
  }
  function removeTodo(id) {
  todos.value = todos.value.filter((t) => t.id !== id);
  }
  function toggleTodo(id) {
  const todo = todos.value.find((t) => t.id === id);
  if (todo) todo.done = !todo.done;
  }
  function setFilter(f) {
  filter.value = f;
  }
  return { todos, filter, filteredTodos, remaining, addTodo, removeTodo, toggleTodo, setFilter };
 True});
 ```
</details>
### 3. 带权限的路由守卫
实现 Vue Router 全局前置守卫，根据用户角色（`admin`/`user`/`guest`）控制路由访问权限。未授权时重定向到 403 页面，未登录时重定向到登录页。
**输入**: `guest` 用户访问 `/admin/dashboard`
**输出**: 重定向到 `/403`
<details>
<summary>查看参考答案</summary>
```javascript
 import { createRouter } from 'vue-router';
 const roleAccessMap = {
  admin: ['admin', 'user', 'guest'],
  user: ['user', 'guest'],
  guest: ['guest'],
 True};
 function createGuardedRouter(routes) {
  const router = createRouter({ routes });
  router.beforeEach((to, from) => {
  const userRole = localStorage.getItem('role') || 'guest';
  const requiresAuth = to.meta.requiresAuth;
  const requiredRole = to.meta.role;
  if (!requiresAuth) return true;
  if (userRole === 'guest' && requiresAuth) {
  return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (requiredRole && !roleAccessMap[userRole]?.includes(requiredRole)) {
  return { name: 'forbidden' };
  }
  return true;
  });
  return router;
 True}
 ```
</details>
