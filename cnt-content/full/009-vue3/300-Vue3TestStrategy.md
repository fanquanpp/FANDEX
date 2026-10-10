---
order: 300
title: Vue3 测试策略：测行为，不测实现
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从「改一处崩三处」的回归恐惧讲起：用 Vitest 加 Vue Test Utils 给收藏按钮写第一个组件测试，再覆盖组合函数（withSetup 助手）、Pinia store（setActivePinia）、路由与 mock（vi.mock 提升机制），附忘 await trigger、Pinia 未激活、mock 提升三则调试实录与测试金字塔取舍。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'vue3/080-CompositionAPIAdvantageScene'
  - 'vue3/220-PiniaPersistencePlugin'
  - 'vue3/090-CustomHook'
  - 'vue3/270-Vue3ViteBuildConfig'
prerequisites:
  - 'vue3/080-CompositionAPIAdvantageScene'
---

## 前置知识

- [组合式 API 优势场景](/vue3/080-CompositionAPIAdvantageScene)：写过组合函数（本篇要测它）；
- [Pinia 状态管理详解](/vue3/210-PiniaStateManagementDetailed)：会定义 store；
- Vitest 语法不要求预备知识，用到的都会现场讲。

## 学习目标

读完本文你将能够：

1. 搭起 Vitest + Vue Test Utils 的测试环境并跑通第一个组件测试；
2. 用 mount、trigger、setValue、emitted 组合出「模拟用户操作并断言结果」的行为测试；
3. 测试无生命周期的组合函数，以及需要 onMounted 的组合函数（withSetup 助手）；
4. 用 setActivePinia 隔离测试 store，用 vi.mock 替换 API 模块并理解其提升机制；
5. 用测试金字塔决定「什么值得测」——组件行为优先，实现细节靠后。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

阅读页迭代到第五版，出现一种普遍焦虑：改进度条的逻辑，收藏状态坏了；动 store 的字段名，目录组件崩了。每次发版靠手点全站功能，十分钟点完，两周后又漏。原因不是代码写得差，是**没有任何东西在你改坏时立刻喊停**——测试就是那个自动喊停的装置。

但先回答策略问题再写代码，否则会写出一堆「改一行断言改十行」的负资产。本篇的策略立场一句话：**测用户能感知的行为（点击后出现什么、事件带什么参数），不测实现细节（内部 ref 叫什么、调了哪个私有方法）。** 实现测试在重构时全军覆没，行为测试在重构后依然全绿——后者才是资产。

## 2. 动手：第一个组件测试

技术栈 2026 年的事实标准：Vitest（跑测试，与 Vite 同源零配置）+ Vue Test Utils（挂载与操作组件）。安装：

```bash
npm install -D vitest @vue/test-utils jsdom @vitejs/plugin-vue
```

vite.config.ts（或独立的 vitest.config.ts）补测试配置：

```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',   // 组件测试需要伪 DOM 环境
    globals: true,          // 免去每个文件 import describe/test/expect
  },
});
```

被测组件——阅读页的收藏按钮：

```vue
<!-- FavoriteButton.vue -->
<script setup>
import { ref } from 'vue';
const props = defineProps<{ docId: string; initial?: boolean }>();
const emit = defineEmits<{ toggle: [docId: string, on: boolean] }>();

const on = ref(props.initial ?? false);
function handleClick() {
  on.value = !on.value;
  emit('toggle', props.docId, on.value);
}
</script>

<template>
  <button class="fav" :class="{ active: on }" data-test="fav-btn">
    {{ on ? '已收藏' : '收藏' }}
  </button>
</template>
```

测试文件与组件同目录（`FavoriteButton.spec.ts`），三条断言覆盖「初始、点击、事件」：

```ts
import { mount } from '@vue/test-utils';
import FavoriteButton from './FavoriteButton.vue';

describe('FavoriteButton', () => {
  it('初始显示收藏，点击后切换并发出 toggle 事件', async () => {
    const wrapper = mount(FavoriteButton, {
      props: { docId: 'd1', initial: false },
    });

    expect(wrapper.text()).toContain('收藏');           // 初始状态

    await wrapper.find('[data-test="fav-btn"]').trigger('click'); // 模拟点击

    expect(wrapper.text()).toContain('已收藏');          // 界面变了
    expect(wrapper.classes()).not.toContain('active');   // 类在按钮上，见下
    expect(wrapper.emitted('toggle')).toEqual([['d1', true]]); // 事件与参数
  });
});
```

终端跑 `npx vitest`（watch 模式）或 `npx vitest run`（跑一次，CI 用）。预期输出一条绿。这个测试的三个动作就是组件测试的全部骨架：**mount 挂载、trigger 模拟用户、emitted/text 断言结果**。注意 trigger 前面的 await——它不是装饰，第 8 节实录一就是漏了它的翻车现场。

修一下上面第四行断言：`active` 类挂在 button 上，应该查按钮的 classes——`expect(wrapper.find('[data-test="fav-btn"]').classes()).toContain('active')`。查错层级的断言在真实项目里天天见，宁可查窄了（选择器定位）也别查宽了（整组件 html 包含某字符串）。

## 3. 更新时机：nextTick 与 flushPromises

Vue 的 DOM 更新是异步批处理的（050 篇的响应式队列），断言前必须等更新落地，两条规则：

```ts
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';

// 规则一：响应式数据变化后，等一帧微任务
count.value++;
await nextTick();
expect(wrapper.text()).toContain('1');

// 规则二：组件里有 Promise（fetch、setTimeout 封装）时，清空微任务队列
await flushPromises();
expect(wrapper.text()).toContain('加载完成');
```

经验法则：**trigger / setValue 带 await 就够覆盖大部分场景**（它们内部会等更新）；测试失败断言拿到了旧文本时，先补 `await nextTick()`，涉及网络再上 `await flushPromises()`。

## 4. 组合函数测试：普通函数直接调，带生命周期的搭壳

080 篇写的 useReadingProgress 有 onMounted / onUnmounted——直接在测试里调用会报「无活跃组件实例」。分两种情况：

无生命周期的组合函数就是普通函数，直接调（ref 读写用 .value）：

```ts
import { useCounter } from './useCounter';

test('useCounter', () => {
  const { count, increment } = useCounter(5);
  expect(count.value).toBe(5);
  increment();
  expect(count.value).toBe(6);
});
```

有生命周期的，用官方文档推荐的 withSetup 助手搭一个一次性组件做壳（@vue/test-utils 并没有内置导出它，十几行手写）：

```ts
// test-utils/withSetup.ts
import { createApp, defineComponent } from 'vue';

export function withSetup(composable) {
  let result;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();   // 在组件 setup 上下文里调用
        return () => {};         // 空渲染函数
      },
    })
  );
  app.mount(document.createElement('div'));
  return { result, app };
}

// 用法
test('useReadingProgress 计算进度', () => {
  const { result } = withSetup(() => useReadingProgress());
  expect(result.percent.value).toBeGreaterThanOrEqual(0);
  result.app.unmount();   // 触发 onUnmounted，验证清理不报错
});
```

窗口滚动这类浏览器行为在 jsdom 里可以用 `window.scrollY = ...` 直接赋值再手动触发事件——组合函数的测试因此比组件测试更「白盒」一点，但断言的仍是返回值（行为），不是内部过程。

## 5. Pinia store 测试：每个用例前换一个新 Pinia

store 是全局单例，测试必须互相隔离——beforeEach 里新建一个 Pinia 并激活：

```ts
import { setActivePinia, createPinia } from 'pinia';
import { usePreferences } from '@/stores/preferences';

describe('preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());   // 每个用例拿全新的 store
  });

  it('setFontSize 修改字号', () => {
    const store = usePreferences();
    store.setFontSize(20);
    expect(store.fontSize).toBe(20);
  });

  it('fetchProfile 失败时保持默认值', async () => {
    const store = usePreferences();
    await store.fetchProfile();      // 内部调 API —— 需 mock，见下
    expect(store.theme).toBe('light');
  });
});
```

store 的 action 里若调了 API 模块，用 vi.mock 替换：

```ts
vi.mock('@/api/profile', () => ({
  fetchProfile: vi.fn().mockResolvedValue({ theme: 'dark' }),
}));
```

## 6. 路由、provide 与子组件隔离

组件依赖 router 或 inject 时，mount 的 global 选项是万能注入口：

```ts
import { createRouter, createMemoryHistory } from 'vue-router';

const router = createRouter({
  history: createMemoryHistory(),  // 测试用内存路由，不动浏览器地址栏
  routes: [{ path: '/', component: { template: '<div />' } }],
});

const wrapper = mount(NavBar, {
  global: {
    plugins: [router],                       // 注入路由
    provide: { theme: 'dark' },              // 覆盖 inject
    stubs: { HeavyChart: true },             // 子组件替换成空壳
    mocks: { $route: { params: { id: '1' } } }, // 模拟选项式 API 用的 $route
  },
});
```

策略提示：`shallowMount`（所有子组件自动 stub）适合「只测本组件模板逻辑」的场合；常规更推荐 mount + 定点 stubs——浅挂载会连真实协作行为一起隔离掉，测试容易与真实表现脱节。

## 7. 策略层：金字塔怎么搭

工具全会了，反过来决定「写多少」：

```text
        E2E（Playwright，冒烟几条：登录、阅读、收藏）
      组件行为测试（本文主角：核心交互组件，每个 3-8 条）
    组合函数 / store 单测（纯逻辑，最容易写、收益最高，量最大）
```

优先级从下往上：组合函数和 store 是纯逻辑，测试最便宜，先铺满；组件只测「关键用户路径」——收藏、提交、切换，别追求每个按钮都有测试；E2E 只留冒烟。两个反模式：快照测试（toMatchSnapshot）写起来快但人人都无脑按 -u 更新，最后退化成「改了就同意」的摆设，只用于真正稳定的小片段；覆盖率当 KPI 会催生大批无断言测试——覆盖率是发现盲区的仪表，不是目标。CI 里 `vitest run --coverage`（provider 用 v8）看报告即可。

## 8. 常见错误与调试实录

**错误一：trigger 没加 await，断言拿到旧值。** `wrapper.find('button').trigger('click')` 后立刻断言，text 还是「收藏」。三步定位：断言值是**上一步之前**的状态——时序问题；验真身——trigger 返回 Promise（内部等 DOM 更新），不 await 就是「点了个寂寞」；修正——所有 trigger / setValue / setProps 一律 await。这是 Vue 组件测试命中率第一的错误。

**错误二：`getActivePinia was called with no active Pinia`。** store 测试一跑就崩。原因：usePreferences 在组件外调用需要「当前激活的 Pinia」，测试环境没人创建过。修正：文件级 beforeEach 里 `setActivePinia(createPinia())`——它同时解决了用例间状态污染，一举两得。

**错误三：vi.mock 不生效，测试发起了真实请求。** 原因：vi.mock 调用被**提升（hoist）到文件顶部**，写在测试函数内部或不合法的位置会被静默忽略；另外被 mock 的模块路径必须与 import 路径完全一致。修正：vi.mock 固定写在文件顶部、路径逐字符核对，需要动态改返回值时在用例里操作 `vi.mocked(fetchProfile).mockResolvedValueOnce(...)`。

**错误四：测试里 mount 报「Failed to resolve component」。** 组件里用了全局注册的组件或插件。修正：global.plugins / global.components 补注入（第 6 节），而不是全局污染测试环境。

## 9. 修改实验

实验一：给 FavoriteButton 补「initial 为 true 的初始态」用例与「连点两次发出两次事件」用例，验收：`emitted('toggle')` 的数组长度为 2。

实验二：给 useReadingProgress 写测试：jsdom 里模拟 `window.scrollY = 400`、`document.documentElement.scrollHeight = 1000`，触发 scroll 事件，断言 percent 为 40；再把窗口缩小事件触发到 95% 验证 finished 为 true。

实验三：给第 5 节 preferences store 加「fetchProfile 用 mock 数据」用例，并故意把 vi.mock 路径写错一次，观察失败信息——记住这个报错长什么样。

## 10. 小练习

预测题（5 分钟）：下面的测试为什么失败？

```ts
const wrapper = mount(FavoriteButton, { props: { docId: 'd1' } });
wrapper.find('button').trigger('click');
expect(wrapper.emitted('toggle')).toBeTruthy();
```

（trigger 未 await，事件派发前的微任务还没落地，emitted 为 undefined。补 await 即绿——第 8 节实录一的复现。）

修改题（10 分钟）：给阅读页目录组件（点击目录项 emit jump 并高亮当前项）写测试：点击第二项后断言 emitted('jump') 参数与高亮类的位置变化。

修 Bug 题（15 分钟）：store 测试里第二个用例「污染」了第一个用例的结果（第一个跑单独通过、一起跑失败）。用「每个用例独立 Pinia」重写测试结构，并说出污染的来源（store 是模块级单例，状态跨用例残留）。

挑战题（30 分钟）：为 220 篇的持久化 preferences store 写测试：mock localStorage（jsdom 自带），验证 setFontSize 后 localStorage 出现对应键值、restore 后状态恢复。验收：不依赖真实网络与真实浏览器存储。

## 11. 与之前和之后的知识的关系

- 往前：080 篇的组合函数、210/220 篇的 store 都是本篇的被测对象——测试是学习成果的验收场；
- 往后：[Vue 3 与 Vite](/vue3/270-Vue3ViteBuildConfig) 里把 vitest run 挂进 CI 脚本；[Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice) 的优化改动靠本篇的测试兜底——没有测试保护的优化是在裸奔。

## 12. 官方文档

- Vue 官方测试指引：https://cn.vuejs.org/guide/scaling-up/testing.html
- Vue Test Utils：https://test-utils.vuejs.org/
- Vitest：https://cn.vitest.dev/guide/
- 测试 Pinia：https://pinia.vuejs.cn/zh/cookbook/testing.html

## 13. 自我检查

- 能说出「测行为不测实现」的判断标准，并对一个测试案例判断它属于哪类；
- 能不查文档写出「mount + trigger + emitted」三段式组件测试；
- 能解释 nextTick 与 flushPromises 各自等的是什么，并说出使用顺序；
- 能写出 withSetup 助手并解释它为什么能激活生命周期；
- 拿到「断言旧值」「无激活 Pinia」「mock 不生效」三个报错能各在 30 秒内定位。

## 本章总结

Vue3 测试的技术栈是 Vitest + Vue Test Utils，环境 jsdom，配置进 vite.config。组件测试三段式：mount 挂载（global 注入 plugins/provide/stubs/mocks）、trigger/setValue 模拟用户（一律 await，内部等 DOM 更新）、emitted/text/classes 断言结果；异步等 nextTick，网络等 flushPromises。组合函数无生命周期直接调，有生命周期用 withSetup 搭壳（@vue/test-utils 无内置导出，手写十几行）；store 测试 beforeEach 里 setActivePinia(createPinia()) 一举解决隔离与激活。策略上金字塔从下往上：纯逻辑单测铺满、组件测关键行为、E2E 只留冒烟；快照慎用、覆盖率不当 KPI。三大翻车点：漏 await、Pinia 未激活、vi.mock 提升与路径。

## 下一步

进入 [Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice)：功能正确且被测试保护之后，下一场仗是快——测量、渲染控制与体积治理的完整实战。
