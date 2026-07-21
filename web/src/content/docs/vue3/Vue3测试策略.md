---
order: 56
title: Vue3测试策略
module: vue3
category: Vue3
difficulty: intermediate
description: 组件测试与组合式函数测试
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Vue3服务端渲染
  - vue3/生命周期钩子
  - 'vue3/Vue3与Web Components'
  - vue3/Vue3性能优化实践
prerequisites:
  - vue3/语法速查
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
