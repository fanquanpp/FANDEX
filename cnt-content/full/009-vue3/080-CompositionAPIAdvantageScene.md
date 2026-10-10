---
order: 90
title: 组合式 API 优势场景：从「跳四个块」到「一个函数」
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 从阅读页改一个功能要在 data、methods、mounted 间跳四趟讲起：同一组件两种写法对照，把阅读进度抽成 useReadingProgress 组合函数，对比 mixins 的来源不明与命名冲突，附 setup 漏 return、组合函数丢上下文、props 解构三则调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vue3/050-ReactiveSystem'
  - 'vue3/060-ComputedCacheWatchTiming'
  - 'vue3/090-CustomHook'
  - 'vue3/210-PiniaStateManagementDetailed'
prerequisites:
  - 'vue3/070-LifecycleHook'
---

## 前置知识

- [响应式系统](/vue3/050-ReactiveSystem) 与 [生命周期钩子](/vue3/070-LifecycleHook)：用过 ref、onMounted、onUnmounted；
- [computed 缓存与 watch 时机](/vue3/060-ComputedCacheWatchTiming)：知道 computed 怎么写。

## 学习目标

读完本文你将能够：

1. 对照同一组件的选项式与组合式两种写法，说出两者真实的差异（不是语法糖那么简单）；
2. 把一个「注册订阅 + 更新 + 卸载清理」的完整功能抽成组合函数，并在多个组件复用；
3. 说出组合式 API 相对 mixins 的两条结构性优势；
4. 判断手头的场景该用哪种 API——而不是站队；
5. 避开 setup 漏 return、组合函数在组件外调用、props 解构丢响应性三个经典坑。

预计 50 到 70 分钟。

## 1. 你现在要解决什么问题

FANDEX 阅读页要加第五个功能：阅读进度条（记录滚动位置、离屏时保存）。打开组件一看，前四个功能的代码长这样：

```text
data()        → progress、theme、tocOpen、fontSize、commentDraft（五个功能的状态混在一起）
computed()    → progressPercent、tocs、canSubmit（三种归属的计算属性混在一起）
methods()     → handleScroll、toggleTheme、toggleToc、enlargeFont、submit（五个功能的动作混在一起）
mounted()     → 绑滚动监听、读 localStorage、初始化目录（五件事挤在一起）
unmounted()   → 解绑滚动监听（就这一件事，还得记得写）
```

维护痛点不是「写不了」，是**改一个功能要跳五个块**：进度条的逻辑被拆进 data、computed、methods、mounted、unmounted 五个抽屉，旁边还混着另外四个功能的零件。功能一多，「按选项类型分柜」就输给了「按功能聚合」——组合式 API 要解决的就是这个组织问题。

## 2. 同一组件，两种写法

先用一个小组件公平对比。需求：一个计数器，翻倍显示，挂载后拉一次用户信息。

选项式：

```js
export default {
  data() {
    return { count: 0, user: null };
  },
  computed: {
    doubled() {
      return this.count * 2;
    },
  },
  methods: {
    increment() {
      this.count++;
    },
  },
  mounted() {
    this.fetchUser();
  },
};
```

组合式（script setup 是 2026 年的默认写法）：

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

const count = ref(0);
const user = ref(null);
const doubled = computed(() => count.value * 2);
const increment = () => count.value++;
onMounted(() => fetchUser());
</script>
```

小组件上两者都清晰。差别在「团队能力」而非语法：组合式把状态、计算、动作、生命周期**按功能就近书写**——计数器三行连在一起，用户加载一行自成一体；且没有 `this`，TypeScript 能从 `ref(0)` 直接推导出 `Ref<number>`，不需要选项式那套额外的类型标注（`this.count` 的类型要靠复杂的 this 类型推导，大组件上经常失灵）。Vue 3.5 起官方文档全面以组合式为默认教学写法，但选项式仍是完全受支持的第一方 API——老项目迁移、无构建工具的 CDN 场景里它依然顺手。

## 3. 动手：把「阅读进度」抽成组合函数

组合式 API 最大的红利是：**一个功能的全部零件可以装进一个普通函数**。把第 1 节的进度条抽出来：

```js
// composables/useReadingProgress.js
import { ref, computed, onMounted, onUnmounted } from 'vue';

export function useReadingProgress(threshold = 0.9) {
  const scrollY = ref(0);
  const docHeight = ref(1);

  const percent = computed(() =>
    Math.min(100, Math.round((scrollY.value / docHeight.value) * 100))
  );
  const finished = computed(() => percent.value >= threshold * 100);

  function update() {
    scrollY.value = window.scrollY;
    docHeight.value = document.documentElement.scrollHeight;
  }

  onMounted(() => {
    update();
    window.addEventListener('scroll', update, { passive: true });
  });
  onUnmounted(() => window.removeEventListener('scroll', update));

  return { percent, finished };
}
```

阅读页里一行接入：

```vue
<script setup>
import { useReadingProgress } from '@/composables/useReadingProgress';

const { percent, finished } = useReadingProgress(0.9);
</script>

<template>
  <div class="progress" :style="{ width: percent + '%' }" />
  <p v-if="finished">已读完全文</p>
</template>
```

预期行为：滚动时进度条实时变宽，读到 90% 弹出「已读完全文」。组件里关于进度的代码从五处抽屉收敛为一个 import；下一个页面（题解页、博客页）要同款进度条，再 import 一次——**这就是「逻辑复用」在 Vue 3 里的形态：组合函数（composable），一个以 use 开头、内部调用其他组合式 API 的函数。**

注意函数体里的 onMounted / onUnmounted 不需要 this、不需要传组件实例——它们在组件的 setup 执行期间被调用时自动挂到当前组件实例上。这也埋下本篇最经典的坑（第 8 节实录二）。

## 4. 对比 mixins：为什么老方案被淘汰

Vue 2 时代复用逻辑靠 mixins，同样的 useMouse 功能混进组件，两个结构性问题：

1. **来源不明**：组件模板里用了 `x`、`y`，但在组件内部找不到定义——它们藏在某个 mixin 里，五个 mixin 都可能有 x，改一个要全库搜；
2. **命名冲突**：两个 mixin 都声明 `update` 方法，后者静默覆盖前者，运行时才发现。

组合函数把这两条都断了：`const { x, y } = useMouse()`——来源写在解构处，冲突在编辑器里就报错（同一作用域重复声明）。加上 TypeScript 推导完整、可以传参定制（第 3 节的 threshold），mixins 在新代码里已经没有生存空间。

## 5. 什么时候仍选选项式

不是站队，是看场景：

| 场景                               | 建议                          |
| ---------------------------------- | ----------------------------- |
| 新项目、逻辑会长大、用 TypeScript  | 组合式（默认选择）            |
| 逻辑复用（跨组件的订阅/定时/持久化） | 组合式（只有它能干净地做到）  |
| 老项目渐进迁移                     | 两种共存，逐组件改            |
| 无构建、CDN 引入的轻量页面         | 选项式更顺手（无需 setup 编译）|
| 一次性小组件                       | 哪个熟用哪个，差异可以忽略    |

判断的锚点是一个：**这个组件的逻辑会不会长到「改功能要跳多个块」？** 会，用组合式；一个只会变大的项目不该用「按类型分柜」的方式组织代码。

## 6. 修改实验

实验一：把阅读页（或你手头任意组件）的某个功能照第 3 节抽成组合函数，验收标准：组件里该功能的代码只剩一行 import 加一次解构，且抽出的函数在第二个组件里直接可用。

实验二：给 useReadingProgress 加参数化——支持传入「监听目标元素」而不是 window（ref 传入，函数内部监听 ref.value 的 scroll 事件），体会组合函数传参定制的威力。

实验三：把同一个功能用 mixin 重写一遍（练习用途），亲手体验「模板里用了一个来源不明的变量」的感觉，对比后删掉。

## 7. 常见错误与调试实录

**错误一：setup（或 script setup）里定义了变量但模板用不了。** 选项式里包了一层 setup() 的写法下最容易犯：定义了一堆 ref 忘了 return，模板里全是 undefined 且无报错。三步定位：模板变量为空但控制台干净；检查 setup() 的 return 对象——变量不在里面；补上，或直接换 `<script setup>`（顶层代码自动暴露给模板，没有 return 这回事）。这也是「新代码一律 script setup」的工程理由之一：消灭整类低级失误。

**错误二：组合函数在组件外调用。** 图省事在模块顶层调用：

```js
// composables/useReadingProgress.js 模块顶层
const { percent } = useReadingProgress();   // 报错
```

控制台：`onMounted is called when there is no active component instance`。三步定位：读报错——「没有活跃的组件实例」；验真身——onMounted 之类生命周期注册依赖「当前正在初始化的组件」，模块加载时没有这个上下文；修正——组合函数只能在 setup（或另一个组合函数）的执行过程中调用，模块顶层只导出函数本身。这条和 React Hook 的「只在组件顶层调用」同源：生命周期 API 的注册时机依赖隐式上下文。

**错误三：props 解构丢响应性。** `const { title } = props` 之后 title 不再随父组件更新。2026 年的准确说法：**Vue 3.5 起编译器支持响应式 props 解构**——`const { title } = defineProps<{ title: string }>()` 里解构出的 title 在模板和侦听中仍是响应式的；但普通 reactive 对象、Pinia store 的直接解构依然是老规矩：reactive 对象解构即断链（050 篇讲过 Proxy 的原理），store 要用 `storeToRefs(store)` 解构（210 篇）。拿到老代码先确认 Vue 版本，再决定要不要改写法。

## 8. 实际项目中的使用场景

- **组合函数即微架构**：一个中型 Vue 项目通常沉淀 10 到 30 个组合函数——useTheme、useStorage、useFetch 类，它们是「比组件小、比工具函数重」的复用单元，100 篇讲封装规范；
- **Pinia 也是组合式**：setup store 写法（`defineStore('id', () => { ... })`）就是把组合函数放进全局作用域，状态跨组件共享；组件里消费时 storeToRefs 保响应性（210 篇）；
- **provide/inject 的类型安全**：组合式的 provide/inject 配合 InjectionKey 符号，注入值的类型一路推导，跨层共享配置（主题、i18n 实例）时不再盲转类型（170 篇）；
- **生态库全是组合式形态**：VueUse 的三百多个工具函数、Vue Router 的 useRouter、Pinia 的 useStore——2026 年 Vue 生态的公共 API 已经统一在「use 开头的组合函数」这一种形态上，学它就是学生态的通用语言。

## 9. 小练习

预测题（3 分钟）：下面的组件渲染什么？为什么？

```vue
<script setup>
const { percent } = useReadingProgress();
console.log(percent.value);
</script>
<template>
  <p>{{ percent }}</p>
</template>
```

（正常渲染进度条数值。script setup 顶层调用组合函数完全合法——setup 执行期就是「活跃组件实例」存在的窗口；错的是模块顶层，见第 7 节实录二。）

修改题（10 分钟）：把阅读页的主题切换抽成 useTheme()：返回 { theme, toggle }，初始化读 localStorage，切换时写回并同步 document.documentElement.dataset.theme。验收：刷新后主题保留，组件里不再出现 localStorage 字样。

修 Bug 题（15 分钟）：下面代码里按钮点击后 count 不变，找出原因并修复：

```vue
<script setup>
import { reactive } from 'vue';
const state = reactive({ count: 0 });
const { count } = state;          // 问题行
const increment = () => state.count++;
</script>
<template>
  <button @click="increment">{{ count }}</button>
</template>
```

（reactive 对象解构即取值断链，count 是个普通数字常量。修法：模板里直接用 state.count，或用 toRef / toRefs 保链接。）

挑战题（30 分钟）：写 useFetch(url) 组合函数，返回 { data, error, loading, refetch }，要求：url 为 ref 时响应式重新请求；组件卸载后返回的结果不再写入状态（竞态保护）。验收：快速切换 url 不出现旧数据覆盖新数据。

## 10. 与之前和之后的知识的关系

- 往前：050 篇的响应式系统是组合函数的原材料（ref/reactive 断链规则直接沿用）；070 篇的生命周期钩子在组合函数里完成注册与清理的配对；
- 往后：[自定义组合式函数](/vue3/090-CustomHook) 讲封装规范与测试；[Pinia 状态管理详解](/vue3/210-PiniaStateManagementDetailed) 的 setup store 是组合函数的全局化；[Provide 与 Inject](/vue3/170-ProvideInject) 补齐跨层传递的另一半。

## 11. 官方文档

- 组合式 API 常见问答（含与选项式的取舍）：https://cn.vuejs.org/guide/extras/composition-api-faq.html
- 组合式函数：https://cn.vuejs.org/guide/reusability/composables
- script setup 与 defineProps：https://cn.vuejs.org/api/sfc-script-setup.html
- 响应式进阶（toRef / toRefs / 解构）：https://cn.vuejs.org/guide/extras/reactivity-in-depth

## 12. 自我检查

- 能向同事解释「组合式不是语法糖」——它是把「按选项类型分柜」换成「按功能聚合」的组织方式；
- 能不看笔记写出 useReadingProgress 这类「订阅 + 更新 + 清理」三件套组合函数；
- 能说出 mixins 的两条结构性缺陷及组合函数如何各自化解；
- 能判断三个场景（新项目、CDN 无构建、老项目迁移）各该用哪种 API 并给出理由；
- 拿到「setup 变量模板不可用」「组合函数报无实例」「解构丢响应性」三个报错能各在 30 秒内定位。

## 本章总结

组合式 API 的价值不在语法，在组织：一个功能的 ref、computed、函数、生命周期注册收敛到一起，进而能整体装进一个普通函数——组合函数，成为 Vue 3 逻辑复用的唯一正解（mixins 的来源不明与命名冲突被解构与作用域天然消灭）。script setup 是 2026 年的默认写法，TypeScript 推导与生态 API（VueUse、Router、Pinia）都长在这个形态上；选项式在无构建与迁移场景仍有一席之地。三条纪律：组合函数只在 setup 执行期调用；reactive/store 解构需 toRefs 或 storeToRefs；新代码统一 script setup 消灭漏 return。

## 下一步

进入 [自定义组合式函数](/vue3/090-CustomHook)：本篇抽了第一个组合函数，下一篇讲怎么把它写得规范——参数约定、返回值设计、竞态与清理，以及怎么给组合函数写测试。
