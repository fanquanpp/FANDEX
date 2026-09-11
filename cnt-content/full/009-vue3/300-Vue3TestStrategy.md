---
order: 300
title: Vue3 测试策略
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 组件测试与组合式函数测试
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/350-Vue3SSR'
  - 'vue3/070-LifecycleHook'
  - 'vue3/310-Vue3WebComponents'
  - 'vue3/320-Vue3PerformancePractice'
prerequisites: []
---

## 1. 测试工具

```bash
npm install -D vitest @vue/test-utils
```

## 2. 组件测试

```javascript
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

test('increments counter', async () => {
  const wrapper = mount(Counter);
  expect(wrapper.text()).toContain('0');

  await wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('1');
});
```

## 3. 组合式函数测试

```javascript
import { withSetup } from './test-utils';

test('useCounter', () => {
  const { result } = withSetup(() => useCounter(0));
  expect(result.count.value).toBe(0);
  result.increment();
  expect(result.count.value).toBe(1);
});

// withSetup 辅助函数
function withSetup(composable) {
  let result;
  const app = createApp({
    setup() {
      result = composable();
      return () => {};
    },
  });
  app.mount(document.createElement('div'));
  return { result, app };
}
```

## 4. 异步测试

```javascript
test('async data', async () => {
  const wrapper = mount(AsyncComponent, {
    global: {
      plugins: [router],
    },
  });

  // 等待异步操作
  await flushPromises();
  expect(wrapper.text()).toContain('loaded data');
});
```

## 5. Mock 与 Stub

```javascript
const wrapper = mount(Component, {
  global: {
    mocks: { $route: { params: { id: '1' } } },
    stubs: { RouterLink: true, ChildComponent: true },
  },
});
```
## 测试工具安装

**基本写法：安装 Vitest 与 Vue Test Utils**
`npm install -D vitest @vue/test-utils jsdom`
```bash
# 测试核心依赖
npm install -D vitest @vue/test-utils jsdom @vitejs/plugin-vue
```

---

**基本写法：安装 Testing Library**
`npm install -D @testing-library/vue`
```bash
# 行为驱动测试库
npm install -D @testing-library/vue
```

---

## Vitest 配置

**基本写法：vite.config.ts 配置 test**
`test: { environment: 'jsdom', globals: true }`
```ts
// 配置 Vitest
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  test: { environment: 'jsdom', globals: true }
});
```

---

**基本写法：测试脚本**
`'test': 'vitest'`
```json
// package.json
{
  "scripts": { "test": "vitest", "test:run": "vitest run" }
}
```

---

## 组件挂载 mount

**基本写法：mount 挂载组件**
`const <wrapper> = mount(<组件>)`
```ts
// 创建组件实例
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';
const wrapper = mount(Counter);
```

---

**基本写法：传入 props**
`mount(<组件>, { props: { <字段>: <值> } })`
```ts
// 测试 props 传递
const wrapper = mount(User, { props: { name: 'Alice' } });
```

---

**基本写法：传入插槽**
`mount(<组件>, { slots: { default: '<内容>' } })`
```ts
// 测试插槽内容
const wrapper = mount(Card, { slots: { default: '<p>内容</p>' } });
```

---

## shallowMount 浅挂载

**基本写法：浅挂载不渲染子组件**
`const <wrapper> = shallowMount(<组件>)`
```ts
// 隔离子组件测试
const wrapper = shallowMount(App);
```

---

## DOM 查询

**基本写法：find 查找元素**
`<wrapper>.find('<选择器>')`
```ts
// 返回第一个匹配的 DOMWrapper
const btn = wrapper.find('button');
```

---

**基本写法：findAll 查找多个**
`<wrapper>.findAll('<选择器>')`
```ts
// 返回所有匹配元素
const items = wrapper.findAll('.item');
```

---

**基本写法：findComponent 查找子组件**
`<wrapper>.findComponent(<组件>)`
```ts
// 查找子组件实例
const child = wrapper.findComponent(UserCard);
```

---

## 文本与属性断言

**基本写法：text 读取文本**
`<wrapper>.text()`
```ts
// 断言渲染文本
expect(wrapper.text()).toContain('Hello');
```

---

**基本写法：attributes 读取属性**
`<wrapper>.attributes('<属性>')`
```ts
// 断言属性值
expect(wrapper.find('a').attributes('href')).toBe('/about');
```

---

**基本写法：classes 读取类名**
`<wrapper>.classes()`
```ts
// 断言 CSS 类
expect(wrapper.classes()).toContain('active');
```

---

## 交互测试

**基本写法：trigger 触发事件**
`await <wrapper>.find('button').trigger('click')`
```ts
// 触发 DOM 事件
const btn = wrapper.find('button');
await btn.trigger('click');
```

---

**基本写法：触发自定义事件**
`<wrapper>.trigger('<事件>', <数据>)`
```ts
// 触发自定义 DOM 事件
await wrapper.find('input').trigger('custom', { detail: 1 });
```

---

**基本写法：setValue 设置输入值**
`await <wrapper>.find('input').setValue('<值>')`
```ts
// 模拟用户输入
await wrapper.find('input').setValue('Alice');
```

---

## emit 事件测试

**基本写法：读取组件 emit 的事件**
`<wrapper>.emitted('<事件名>')`
```ts
// 断言触发了事件
await wrapper.find('button').trigger('click');
expect(wrapper.emitted('submit')).toBeTruthy();
```

---

**基本写法：检查 emit 参数**
`<wrapper>.emitted('<事件>')[0]`
```ts
// 断言事件参数
expect(wrapper.emitted('submit')[0]).toEqual([{ name: 'Alice' }]);
```

---

## props 测试

**基本写法：setProps 更新 props**
`await <wrapper>.setProps({ <字段>: <新值> })`
```ts
// 测试 props 变化效果
await wrapper.setProps({ count: 5 });
expect(wrapper.text()).toContain('5');
```

---

**基本写法：props 读取**
`<wrapper>.props('<字段>')`
```ts
// 读取传入的 props
expect(wrapper.props('count')).toBe(5);
```

---

## 响应式测试

**基本写法：nextTick 等待更新**
`await nextTick()`
```ts
// 等待响应式更新完成
import { nextTick } from 'vue';
count.value++;
await nextTick();
expect(wrapper.text()).toContain('1');
```

---

## Composables 测试

**基本写法：测试组合式函数**
`const { <结果> } = use<名称>()`
```ts
// 直接调用组合式函数
import { useCounter } from './useCounter';
const { count, inc } = useCounter();
inc();
expect(count.value).toBe(1);
```

---

**基本写法：测试需要生命周期的 Composable**
`test('<用例>', () => { withSetup(() => <调用>); })`
```ts
// 借助 @vue/test-utils 的 withSetup
import { withSetup } from '@vue/test-utils';
const result = withSetup(() => useCounter());
```

---

## Store 测试

**基本写法：测试 Pinia store**
`const <store> = use<Store>()`
```ts
// 创建 setActivePinia 后测试
import { setActivePinia, createPinia } from 'pinia';
setActivePinia(createPinia());
const store = useCounterStore();
store.inc();
expect(store.count).toBe(1);
```

---

**基本写法：测试 action**
`await <store>.<action>()`
```ts
// 测试异步 action
await store.fetchUser();
expect(store.user).toBeDefined();
```

---

## Mock 依赖

**基本写法：vi.mock 模拟模块**
`vi.mock('<模块>', () => ({ <函数>: vi.fn() }))`
```ts
// 模拟 API 模块
vi.mock('./api', () => ({
  getUser: vi.fn(() => Promise.resolve({ name: 'Mock' }))
}));
```

---

**基本写法：mock 实现**
`vi.fn().mockResolvedValue(<值>)`
```ts
// 模拟返回值
const mockFn = vi.fn().mockResolvedValue({ ok: true });
```

---

**基本写法：断言 mock 被调用**
`expect(<mock>).toHaveBeenCalledWith(<参数>)`
```ts
// 验证调用
expect(mockFn).toHaveBeenCalledWith('Alice');
```

---

## 路由测试

**基本写法：创建测试用 router**
`const <router> = createRouter({ history: createMemoryHistory(), routes })`
```ts
// 使用 memory history 测试
import { createRouter, createMemoryHistory } from 'vue-router';
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: Home }]
});
```

---

**基本写法：挂载时注入 router**
`mount(<组件>, { global: { plugins: [<router>] } })`
```ts
// 通过 global.plugins 注入
const wrapper = mount(App, { global: { plugins: [router] } });
```

---

## provide inject 测试

**基本写法：挂载时提供 inject 值**
`mount(<组件>, { global: { provide: { <key>: <值> } } })`
```ts
// 提供 inject 依赖
const wrapper = mount(Child, {
  global: { provide: { theme: 'dark' } }
});
```

---

## 快照测试

**基本写法：toMatchSnapshot 匹配快照**
`expect(<wrapper>.html()).toMatchSnapshot()`
```ts
// 保存组件 HTML 快照
expect(wrapper.html()).toMatchSnapshot();
```

---

**基本写法：更新快照**
`vitest -u`
```bash
# 更新过期快照
npx vitest -u
```

---

## 覆盖率

**基本写法：启用覆盖率**
`vitest run --coverage`
```bash
# 收集测试覆盖率
npx vitest run --coverage
```

---

**基本写法：配置覆盖率**
`coverage: { provider: 'v8', reporter: ['text', 'html'] }`
```ts
// vite.config.ts
test: {
  coverage: { provider: 'v8', reporter: ['text', 'html'] }
}
```

---

## 异步测试

**基本写法：等待异步更新**
`await <wrapper>.vm.$nextTick()`
```ts
// 等待 Vue 更新
await wrapper.vm.$nextTick();
```

---

**基本写法：flushPromises 等待微任务**
`await flushPromises()`
```ts
// 等待所有 Promise
import { flushPromises } from '@vue/test-utils';
await flushPromises();
```

---

## 测试生命周期

**基本写法：beforeEach 每个用例前执行**
`beforeEach(() => <初始化>)`
```ts
// 重置状态
beforeEach(() => {
  setActivePinia(createPinia());
});
```

---

## 测试命名约定

**基本写法：测试文件命名**
`<组件>.spec.ts` 或 `<组件>.test.ts`
```ts
// 推荐与组件同目录
// src/components/Counter.spec.ts
```

---

## describe 分组

**基本写法：分组相关用例**
`describe('<分组>', () => { it('<用例>', () => {}) })`
```ts
// 组织测试用例
describe('Counter', () => {
  it('初始值为 0', () => {
    const wrapper = mount(Counter);
    expect(wrapper.text()).toContain('0');
  });
});
```
