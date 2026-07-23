---
order: 57
title: 'Vue3与Web Components'
module: vue3
category: Vue3
difficulty: intermediate
description: 'Vue组件与Web Components互操作'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/生命周期钩子
  - vue3/Vue3测试策略
  - vue3/Vue3性能优化实践
  - vue3/响应式系统
prerequisites:
  - vue3/语法速查
---

# Vue3 与 Web Components | Vue3 and Web Components Interoperability

> 本文档对标 MIT 6.170、Stanford CS142、CMU 17-437 软件工程课程水准，系统化阐述 Vue 3 与 Web Components 的互操作机制、自定义元素（Custom Elements）、Shadow DOM、HTML 模板等核心主题。涵盖 Vue Web Component 的定义、事件系统、样式隔离、SSR 兼容性等工程实践，并辅以数学建模、对比分析、案例研究与习题。

---

## 目录

1. [学习目标](#1-学习目标--learning-objectives)
2. [历史动机与发展脉络](#2-历史动机与发展脉络--historical-motivation-and-evolution)
3. [形式化定义](#3-形式化定义--formal-definitions)
4. [理论推导与原理解析](#4-理论推导与原理解析--theoretical-derivation)
5. [代码示例](#5-代码示例--code-examples)
6. [对比分析](#6-对比分析--comparative-analysis)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践--pitfalls-and-best-practices)
8. [工程实践](#8-工程实践--engineering-practice)
9. [案例研究](#9-案例研究--case-studies)
10. [习题](#10-习题--exercises)
11. [参考文献](#11-参考文献--references)
12. [延伸阅读](#12-延伸阅读--further-reading)

---

## 1. 学习目标 | Learning Objectives

本章节基于 Bloom 教育目标分类法设计学习目标，覆盖记忆、理解、应用、分析、评价、创造六个层次。

### 1.1 记忆层（Remember）

- **R1**：准确陈述 Web Components 的四大核心规范（Custom Elements、Shadow DOM、HTML Templates、ES Modules）。
- **R2**：列举 Vue 3 提供的 Web Components 相关 API（`defineCustomElement`、`configureApp` 中的 `compilerOptions.isCustomElement`）。
- **R3**：复述 Shadow DOM 的核心概念：Shadow Root、Shadow Tree、Shadow Host、Shadow Boundary。
- **R4**：背记 Custom Elements 的两种类型：Autonomous Custom Elements（自包含）与 Customized Built-in Elements（扩展原生元素）。
- **R5**：识别 Vue 3 中 Web Components 的生命周期回调（`connectedCallback`、`disconnectedCallback`、`adoptedCallback`、`attributeChangedCallback`）。

### 1.2 理解层（Understand）

- **U1**：解释 Vue 3 中 `defineCustomElement` 与 `defineComponent` 的区别，说明前者如何将 Vue 组件转换为原生 Custom Element。
- **U2**：阐述 Shadow DOM 的样式隔离机制：外部样式无法穿透 Shadow Boundary，内部样式无法泄漏到外部。
- **U3**：描述 Vue 3 应用中如何通过 `compilerOptions.isCustomElement` 配置识别自定义元素标签。
- **U4**：理解 Custom Elements 的属性（Attribute）与属性（Property）映射规则：Vue 3 自动处理 `attr` 与 `prop` 的同步。
- **U5**：说明 Web Components 在跨框架复用、设计系统建设、微前端架构中的战略价值。

### 1.3 应用层（Apply）

- **A1**：使用 `defineCustomElement` 将 Vue SFC 转换为可分发的 Custom Element，并通过 CDN 分发。
- **A2**：在 Vue 应用中消费第三方 Web Components（如 Lit、Stencil 构建的组件）。
- **A3**：实现 Custom Elements 的事件系统，正确处理 Vue 中的 `@event` 绑定。
- **A4**：配置 Shadow DOM 的样式穿透（CSS 自定义属性、`::part()` 伪元素）。
- **A5**：在 React、Angular、Svelte 等其他框架中复用 Vue 构建的 Web Components。

### 1.4 分析层（Analyze）

- **An1**：分析 Vue Web Component 与原生 Vue SFC 在生命周期、响应式系统、依赖注入等方面的差异。
- **An2**：对比 Shadow DOM 与传统 CSS 命名空间（BEM、CSS Modules、Scoped CSS）的隔离机制。
- **An3**：解构 Custom Elements 的反应式属性（Reactive Attributes）实现原理，分析其与 Vue 响应式系统的协作。
- **An4**：分析 Web Components 在 SSR 场景下的挑战（Declarative Shadow DOM、hydration）。

### 1.5 评价层（Evaluate）

- **E1**：评估一个企业设计系统是否适合基于 Web Components 实现，权衡跨框架复用与开发成本。
- **E2**：判断何时应当使用 Vue Web Component，何时使用原生 Vue SFC，权衡运行时开销与可移植性。
- **E3**：评价微前端架构中 Web Components 与 Module Federation、Single SPA 等方案的优劣。
- **E4**：权衡 Shadow DOM 的样式隔离与可定制性，确定何时开放 `::part()` 接口。

### 1.6 创造层（Create）

- **C1**：设计一套基于 Vue Web Components 的企业设计系统，覆盖按钮、表单、表格、对话框等核心组件。
- **C2**：构建一个跨框架组件库，使用 Vue 构建并通过 Web Components 分发至 React、Angular、Svelte 项目。
- **C3**：设计一个微前端架构，使用 Web Components 作为应用间通信与隔离的边界。
- **C4**：实现一个支持 SSR 的 Vue Web Component，使用 Declarative Shadow DOM 实现服务端渲染。

---

## 2. 历史动机与发展脉络 | Historical Motivation and Evolution

### 2.1 Web Components 规范的诞生（2013-2018）

Web Components 是 W3C 与 WHATWG 联合推动的一组浏览器原生组件标准，旨在为 Web 提供原生的组件化能力。其设计动机源于：

1. **跨框架复用**：React、Angular、Vue 各自有组件模型，组件无法跨框架复用。Web Components 提供浏览器原生标准，理论上可在任何框架中使用。
2. **样式隔离**：传统 CSS 全局命名空间导致样式冲突，BEM、CSS Modules 等方案仅为工程约定。Shadow DOM 提供浏览器原生的样式隔离。
3. **原生支持**：无需依赖框架运行时，浏览器直接识别 `<my-element>` 标签，减少 JS 体积。

**关键里程碑**：

| 时间 | 事件 |
|------|------|
| 2013 | Google 提出 Web Components 概念 |
| 2016 | Custom Elements v1 规范定稿 |
| 2018 | Shadow DOM v1 在 Chrome、Safari、Firefox 全面支持 |
| 2019 | Edge（Chromium 内核）支持 Web Components |
| 2020 | HTML Modules 规范演进为 ES Modules |
| 2023 | Declarative Shadow DOM 在主流浏览器支持 |
| 2024 | Web Components 成为跨框架组件标准 |

### 2.2 Vue 与 Web Components 的关系

Vue 与 Web Components 的关系经历了三个阶段：

#### 2.2.1 Vue 2 时代（2014-2020）：观望与初步支持

Vue 2 对 Web Components 提供基础支持：通过 `compilerOptions.isCustomElement` 识别自定义元素，但缺乏官方的"Vue → Web Component"转换工具。

#### 2.2.2 Vue 3.0 时代（2020-2022）：官方支持

Vue 3 引入 `defineCustomElement` API，提供官方的 Vue → Custom Element 转换路径：

```javascript
import { defineCustomElement } from 'vue';

const MyElement = defineCustomElement({
  props: { message: String },
  template: '<span>{{ message }}</span>',
});

customElements.define('my-element', MyElement);
```

#### 2.2.3 Vue 3.2+ 时代（2022-至今）：完善与生产可用

Vue 3.2+ 对 Web Components 支持进一步完善：

- 支持 SFC 直接作为 Custom Element（`<script setup>` + `defineCustomElement`）。
- 支持 Shadow DOM 样式注入。
- 支持 Custom Element 的属性（Property）与特性（Attribute）双向同步。
- 支持 SSR 友好的 Custom Element。

### 2.3 Evan You 的设计哲学

Evan You 对 Vue 与 Web Components 的关系定位：

1. **互补而非替代**：Vue 是框架，提供完整的响应式、路由、状态管理；Web Components 是标准，提供跨框架的可移植性。两者互补，非替代关系。

2. **官方桥梁**：Vue 通过 `defineCustomElement` 提供官方的 Vue → Web Component 桥梁，使得 Vue 组件可以在不引入 Vue 运行时的情况下被其他框架消费。

3. **企业设计系统的理想载体**：对于需要在多个框架（Vue、React、Angular）中复用的企业设计系统，Web Components 是理想载体。Vue 作为开发体验，Web Components 作为分发格式。

### 2.4 与 Lit、Stencil 的对比

| 框架 | 类型 | 包体积 | 响应式 | SSR | Vue 协同 |
|------|------|--------|--------|-----|----------|
| Vue 3 | 综合框架 | 35 KB | Proxy | 支持 | 原生 |
| Lit | Web Components 库 | 5 KB | Property | 支持 | 良好 |
| Stencil | Web Components 编译器 | 0 KB（编译时） | 装饰器 | 支持 | 良好 |
| Skate.js | Web Components 库 | 8 KB | Property | 弱 | 一般 |

---

## 3. 形式化定义 | Formal Definitions

### 3.1 Custom Elements 的形式化定义

**定义 3.1（Custom Element 类）**：Custom Element 是 `HTMLElement` 的子类，记为 $E$：

$$
E \subseteq \text{HTMLElement} \\
\forall e \in E: e \text{ implements } \{\text{connectedCallback}, \text{disconnectedCallback}, \text{attributeChangedCallback}, \text{adoptedCallback}\}
$$

**定义 3.2（Custom Element 注册）**：通过 `customElements.define(name, constructor, options)` 注册：

$$
\text{define}: (\text{String}, \text{Class}, \text{Options?}) \to \text{void} \\
\text{where } \text{String} \text{ must contain '-' (kebab-case)}
$$

**定义 3.3（生命周期回调）**：

$$
\text{connectedCallback}(): \text{called when element is inserted into DOM} \\
\text{disconnectedCallback}(): \text{called when element is removed from DOM} \\
\text{attributeChangedCallback}(name, old, new): \text{called when observed attribute changes} \\
\text{adoptedCallback}(): \text{called when element is moved to a new document}
$$

### 3.2 Shadow DOM 的形式化定义

**定义 3.4（Shadow Tree）**：Shadow DOM 创建一个独立的 DOM 子树，记为 $\mathcal{S}$：

$$
\mathcal{S} = \langle \text{host}, \text{root}, \text{tree} \rangle
$$

其中：
- $\text{host} \in \text{HTMLElement}$：Shadow 宿主元素
- $\text{root} = \text{host.attachShadow}(\{\text{mode}: \text{'open' | 'closed'}\})$：Shadow Root
- $\text{tree} \subseteq \text{Node}$：Shadow 内部的 DOM 树

**定义 3.5（Shadow Boundary）**：Shadow Boundary 是 Shadow Root 与外部 DOM 的边界，满足：

$$
\forall s \in \mathcal{S}.\text{tree}, \forall e \in \text{document}: \\
\quad \text{querySelector}(s) \nRightarrow e \quad \text{（外部查询不穿透 Shadow）} \\
\quad \text{querySelector}(e) \nRightarrow s \quad \text{（内部查询不穿透 Shadow）}
$$

**定义 3.6（样式隔离）**：Shadow Boundary 阻断样式继承：

$$
\forall r \in \text{externalCSS}, \forall s \in \mathcal{S}.\text{tree}: \\
\quad \text{applies}(r, s) = \text{false} \quad \text{（外部样式不应用于 Shadow 内部）}
$$

例外：CSS 自定义属性（CSS Custom Properties）穿透 Shadow Boundary。

### 3.3 Vue Custom Element 的形式化定义

**定义 3.7（defineCustomElement）**：Vue 的 `defineCustomElement` 是一个映射函数：

$$
\text{defineCustomElement}: \text{VueComponentOptions} \to \text{CustomElementClass}
$$

转换后的 Custom Element 类满足：

1. **属性同步**：Vue 的 `props` 自动同步到 Custom Element 的 `attributes`。
2. **事件分发**：Vue 的 `emits` 自动转换为 Custom Element 的 `CustomEvent` 分发。
3. **Shadow DOM 挂载**：Vue 应用挂载到 Shadow Root，实现样式隔离。
4. **生命周期映射**：Vue 的 `mounted`/`unmounted` 映射到 `connectedCallback`/`disconnectedCallback`。

### 3.4 Attribute 与 Property 的映射

**定义 3.8（Attribute 与 Property）**：

- **Attribute**：HTML 字符串属性，如 `<my-element name="value">`。
- **Property**：JavaScript 对象属性，如 `element.name = 'value'`。

Vue 3 自动处理两者的同步：

$$
\forall p \in \text{props}(E): \\
\quad \text{getAttribute}(p) \Leftrightarrow \text{property}(p) \\
\quad \text{type conversion based on prop type declaration}
$$

类型转换规则：

| Prop 类型 | Attribute (String) → Property |
|-----------|-------------------------------|
| `String` | 原样 |
| `Number` | `Number(value)` |
| `Boolean` | `value !== 'false' && value !== null` |
| `Array` | `JSON.parse(value)` |
| `Object` | `JSON.parse(value)` |

### 3.5 事件系统的形式化

**定义 3.9（Custom Event 分发）**：Vue Web Component 通过 `dispatchEvent` 分发事件：

$$
\text{emit}(e: \text{Event}): \text{this.dispatchEvent}(\text{new CustomEvent}(e.\text{name}, \{\text{detail}: e.\text{payload}\}))
$$

**定义 3.10（事件穿透 Shadow）**：Custom Events 默认穿透 Shadow Boundary，但需要设置 `composed: true`：

$$
\text{CustomEvent}(name, \{\text{detail}, \text{bubbles}: \text{true}, \text{composed}: \text{true}\})
$$

---

## 4. 理论推导与原理解析 | Theoretical Derivation

### 4.1 Vue 响应式与 Custom Elements 的协作

Vue 3 的响应式系统基于 Proxy，Custom Elements 基于 `attributeChangedCallback`。两者协作流程：

1. **Vue 渲染**：Vue 应用挂载到 Shadow Root，正常使用响应式系统。
2. **Attribute 变化**：外部修改 `element.setAttribute('name', 'new')`，触发 `attributeChangedCallback`。
3. **Vue 响应式更新**：回调内部更新 Vue 的 `props`，触发响应式更新。
4. **DOM 更新**：Vue 重新渲染 Shadow DOM 内部的内容。

**性能分析**：

- 每次属性变化触发两次更新：Custom Element 回调 + Vue 响应式更新。
- 复杂度：$O(1)$（属性映射）+ $O(d)$（Vue Diff，$d$ 为动态节点数）。

### 4.2 Shadow DOM 样式隔离的数学建模

设全局 CSS 规则集合为 $R_{\text{global}}$，Shadow DOM 内部 CSS 规则集合为 $R_{\text{shadow}}$。

**无 Shadow DOM**：

$$
\text{applies}(R_{\text{global}}, \text{all elements}) = \text{true}
$$

**有 Shadow DOM**：

$$
\text{applies}(R_{\text{global}}, \text{shadow elements}) = \text{false} \\
\text{applies}(R_{\text{shadow}}, \text{shadow elements}) = \text{true} \\
\text{applies}(R_{\text{shadow}}, \text{external elements}) = \text{false}
$$

**例外（CSS 自定义属性）**：

$$
\forall p \in \text{CSSCustomProperties}: \text{inherits}(p) = \text{true}
$$

CSS 自定义属性（如 `--color-primary`）通过继承机制穿透 Shadow Boundary。

### 4.3 Custom Elements 注册的性能分析

**首次注册开销**：

$$
T_{\text{register}} = T_{\text{defineCustomElement}} + T_{\text{customElements.define}}
$$

- `defineCustomElement`：$O(1)$，仅包装 Vue 组件选项。
- `customElements.define`：$O(1)$，注册到全局 Custom Element Registry。

**首次实例化开销**：

$$
T_{\text{instantiate}} = T_{\text{createVueApp}} + T_{\text{mount}} + T_{\text{attachShadow}}
$$

包括 Vue 应用创建、挂载到 Shadow Root、Shadow DOM 创建。

**典型值**（Vue 3.4 + 中端设备）：

- 注册：< 1ms
- 首次实例化：5-20ms（取决于组件复杂度）
- 后续实例化：2-10ms（Vue 运行时已缓存）

### 4.4 事件传播路径分析

Custom Event 从 Shadow DOM 内部分发到外部监听器的路径：

$$
\text{path} = [\text{shadow element}] \to \text{Shadow Root} \to \text{host} \to \text{document}
$$

**关键属性**：

- `bubbles: true`：事件冒泡。
- `composed: true`：事件穿透 Shadow Boundary。

若 `composed: false`，事件仅在 Shadow DOM 内部传播，外部无法监听。

### 4.5 跨框架互操作的复杂度

Web Components 作为跨框架标准，其互操作复杂度：

$$
T_{\text{interop}} = T_{\text{framework A}} + T_{\text{Custom Element bridge}} + T_{\text{framework B}}
$$

相比直接使用单一框架：

$$
T_{\text{single framework}} = T_{\text{framework}}
$$

**开销增加**：$T_{\text{interop}} - T_{\text{single}} = T_{\text{bridge}}$（通常 1-5ms）。

**收益**：跨框架复用、设计系统统一、技术栈解耦。

---

## 5. 代码示例 | Code Examples

### 5.1 定义基础 Vue Web Component

```javascript
// my-element.js —— Vue 3.4+
import { defineCustomElement } from 'vue';

// 定义 Vue 组件选项
const MyElement = defineCustomElement({
  // 声明 props，自动同步到 attribute
  props: {
    message: {
      type: String,
      default: 'Hello',
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  // 声明 emits，自动转换为 CustomEvent
  emits: ['change', 'submit'],
  // 组件模板，挂载到 Shadow DOM
  template: `
    <div class="container">
      <span>{{ message }}</span>
      <button @click="increment">Count: {{ count }}</button>
    </div>
  `,
  // 样式自动注入到 Shadow DOM
  styles: [`
    .container {
      display: flex;
      gap: 8px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    span {
      color: var(--my-element-color, #333);
      font-weight: 600;
    }
    button {
      padding: 4px 12px;
      background: var(--my-element-bg, #007bff);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      opacity: 0.9;
    }
  `],
  setup(props, { emit }) {
    function increment() {
      // emit 自动转换为 dispatchEvent
      emit('change', { old: props.count, new: props.count + 1 });
    }
    return { increment };
  },
});

// 注册为 Custom Element
customElements.define('my-element', MyElement);

export default MyElement;
```

### 5.2 使用 SFC 定义 Vue Web Component

```vue
<!-- MyWidget.ce.vue —— Vue 3.4+ -->
<!-- 文件名 .ce.vue 后缀告诉 Vue 将其编译为 Custom Element -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// 定义 props（自动同步到 attribute）
const props = defineProps<{
  title: string;
  initialCount?: number;
  theme?: 'light' | 'dark';
}>();

// 定义 emits（自动转换为 CustomEvent）
const emit = defineEmits<{
  (e: 'change', value: number): void;
  (e: 'reset'): void;
}>();

// 响应式状态
const count = ref(props.initialCount ?? 0);
const isDark = computed(() => props.theme === 'dark');

// 监听 props 变化（外部修改 attribute 时触发）
watch(() => props.initialCount, (newVal) => {
  if (newVal !== undefined) {
    count.value = newVal;
  }
});

function increment(): void {
  count.value++;
  emit('change', count.value);
}

function reset(): void {
  count.value = props.initialCount ?? 0;
  emit('reset');
}
</script>

<template>
  <div :class="['widget', { dark: isDark }]">
    <h3>{{ title }}</h3>
    <p>Count: {{ count }}</p>
    <div class="actions">
      <button @click="increment">Increment</button>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>

<style>
/* 样式自动注入到 Shadow DOM */
.widget {
  padding: 16px;
  border: 1px solid var(--widget-border, #ddd);
  border-radius: 8px;
  background: var(--widget-bg, #fff);
  color: var(--widget-color, #333);
}

.widget.dark {
  --widget-bg: #1a1a1a;
  --widget-color: #f0f0f0;
  --widget-border: #444;
}

.widget h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.widget .actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.widget button {
  padding: 4px 12px;
  border: 1px solid var(--widget-color, #333);
  background: transparent;
  color: var(--widget-color, #333);
  border-radius: 4px;
  cursor: pointer;
}

.widget button:hover {
  opacity: 0.8;
}
</style>
```

```javascript
// 注册 SFC 为 Custom Element
import { defineCustomElement } from 'vue';
import MyWidget from './MyWidget.ce.vue';

const MyWidgetElement = defineCustomElement(MyWidget);
customElements.define('my-widget', MyWidgetElement);
```

### 5.3 在 Vue 应用中消费 Web Components

```javascript
// vite.config.ts —— 配置 isCustomElement
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 识别所有以 'my-' 或 'ion-' 开头的标签为自定义元素
          isCustomElement: (tag) =>
            tag.startsWith('my-') || tag.startsWith('ion-'),
        },
      },
    }),
  ],
});
```

```vue
<!-- App.vue —— 消费 Web Components -->
<script setup lang="ts">
import { ref } from 'vue';
import 'my-element'; // 注册 Custom Element
import 'my-widget';

const widgetTitle = ref('My Widget');
const widgetTheme = ref<'light' | 'dark'>('light');

function handleWidgetChange(value: number): void {
  console.log('Widget count changed:', value);
}

function handleWidgetReset(): void {
  console.log('Widget reset');
}

function toggleTheme(): void {
  widgetTheme.value = widgetTheme.value === 'light' ? 'dark' : 'light';
}
</script>

<template>
  <div>
    <h1>Vue + Web Components</h1>
    <button @click="toggleTheme">Toggle Theme</button>

    <!-- 使用 Custom Element，与原生 HTML 元素一致 -->
    <my-element
      message="Hello from Vue"
      :count="42"
      @change="handleWidgetChange"
    />

    <my-widget
      :title="widgetTitle"
      :theme="widgetTheme"
      :initial-count="0"
      @change="handleWidgetChange"
      @reset="handleWidgetReset"
    />
  </div>
</template>
```

### 5.4 Shadow DOM 样式穿透

```javascript
// themed-button.js
import { defineCustomElement } from 'vue';

const ThemedButton = defineCustomElement({
  props: {
    variant: {
      type: String,
      default: 'primary',
    },
  },
  template: `
    <button :class="['btn', variant]">
      <slot></slot>
    </button>
  `,
  styles: [`
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      /* 使用 CSS 自定义属性，允许外部覆盖 */
      background: var(--btn-primary-bg, #007bff);
      color: var(--btn-primary-color, white);
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .btn.secondary {
      background: var(--btn-secondary-bg, #6c757d);
      color: var(--btn-secondary-color, white);
    }
  `],
});

customElements.define('themed-button', ThemedButton);
```

```html
<!-- 外部页面：通过 CSS 自定义属性覆盖 Shadow DOM 样式 -->
<style>
  :root {
    --btn-primary-bg: #ff6b6b;
    --btn-primary-color: #fff;
    --btn-secondary-bg: #4ecdc4;
    --btn-secondary-color: #fff;
  }

  /* 使用 ::part() 穿透 Shadow DOM（需组件暴露 part） */
  themed-button::part(button) {
    font-weight: bold;
  }
</style>

<themed-button variant="primary">Primary</themed-button>
<themed-button variant="secondary">Secondary</themed-button>
```

### 5.5 事件系统与 CustomEvent

```javascript
// event-emitter-element.js
import { defineCustomElement } from 'vue';

const EventEmitterElement = defineCustomElement({
  props: {
    value: { type: String, default: '' },
  },
  emits: ['input', 'change', 'submit'],
  template: `
    <form @submit.prevent="handleSubmit">
      <input
        :value="value"
        @input="handleInput"
        @change="handleChange"
      />
      <button type="submit">Submit</button>
    </form>
  `,
  styles: [`
    form {
      display: flex;
      gap: 8px;
    }
    input {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      padding: 4px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `],
  setup(props, { emit }) {
    function handleInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('input', target.value);
    }

    function handleChange(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('change', target.value);
    }

    function handleSubmit() {
      emit('submit', { value: props.value });
    }

    return { handleInput, handleChange, handleSubmit };
  },
});

customElements.define('event-emitter', EventEmitterElement);
```

```html
<!-- 消费端：监听 CustomEvent -->
<script>
  document.querySelector('event-emitter').addEventListener('input', (e) => {
    console.log('Input:', e.detail); // CustomEvent 的 detail 属性
  });

  document.querySelector('event-emitter').addEventListener('change', (e) => {
    console.log('Change:', e.detail);
  });

  document.querySelector('event-emitter').addEventListener('submit', (e) => {
    console.log('Submit:', e.detail);
    e.preventDefault();
  });
</script>
```

### 5.6 生命周期回调

```javascript
// lifecycle-element.js
import { defineCustomElement } from 'vue';

const LifecycleElement = defineCustomElement({
  props: { label: String },
  template: `<div>{{ label }}</div>`,
  setup(props) {
    console.log('Vue setup called');

    // Vue 生命周期
    onMounted(() => console.log('Vue mounted'));
    onUnmounted(() => console.log('Vue unmounted'));

    return {};
  },
});

// 通过自定义包装，监听 Custom Element 生命周期
class LifecycleElementWrapper extends LifecycleElement {
  connectedCallback() {
    super.connectedCallback();
    console.log('Custom Element connected to DOM');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Custom Element disconnected from DOM');
  }

  attributeChangedCallback(name, oldVal, newVal) {
    super.attributeChangedCallback(name, oldVal, newVal);
    console.log(`Attribute ${name} changed: ${oldVal} -> ${newVal}`);
  }

  adoptedCallback() {
    super.adoptedCallback?.();
    console.log('Custom Element adopted to new document');
  }
}

customElements.define('lifecycle-element', LifecycleElementWrapper);
```

### 5.7 Slot 投影

```javascript
// card-element.js
import { defineCustomElement } from 'vue';

const CardElement = defineCustomElement({
  template: `
    <div class="card">
      <div class="card-header">
        <slot name="header">Default Header</slot>
      </div>
      <div class="card-body">
        <slot>Default content</slot>
      </div>
      <div class="card-footer">
        <slot name="footer">Default Footer</slot>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .card-header, .card-footer {
      padding: 8px 16px;
      background: #f5f5f5;
    }
    .card-body {
      padding: 16px;
    }
  `],
});

customElements.define('my-card', CardElement);
```

```html
<!-- 使用 slot 投影 -->
<my-card>
  <span slot="header">Card Title</span>
  <p>This is the card content.</p>
  <span slot="footer">
    <button>Action</button>
  </span>
</my-card>
```

### 5.8 跨框架复用示例

```javascript
// shared-button.js —— Vue 构建的跨框架按钮
import { defineCustomElement } from 'vue';

const SharedButton = defineCustomElement({
  props: {
    variant: { type: String, default: 'primary' },
    size: { type: String, default: 'medium' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ['click'],
  template: `
    <button
      :class="['shared-btn', variant, size]"
      :disabled="disabled || loading"
      @click="handleClick"
    >
      <span v-if="loading" class="spinner"></span>
      <slot></slot>
    </button>
  `,
  styles: [`
    .shared-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .shared-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .shared-btn.primary {
      background: #007bff;
      color: white;
    }
    .shared-btn.secondary {
      background: #6c757d;
      color: white;
    }
    .shared-btn.small {
      padding: 4px 8px;
      font-size: 12px;
    }
    .shared-btn.medium {
      padding: 8px 16px;
      font-size: 14px;
    }
    .shared-btn.large {
      padding: 12px 24px;
      font-size: 16px;
    }
    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  setup(props, { emit }) {
    function handleClick() {
      if (!props.disabled && !props.loading) {
        emit('click');
      }
    }
    return { handleClick };
  },
});

customElements.define('shared-button', SharedButton);
```

```jsx
// 在 React 中使用
import React from 'react';
import 'shared-button';

function App() {
  return (
    <div>
      <shared-button
        variant="primary"
        size="medium"
        onClick={() => console.log('Clicked in React')}
      >
        Click Me (React)
      </shared-button>
    </div>
  );
}
```

```typescript
// 在 Angular 中使用
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'shared-button';

@Component({
  selector: 'app-root',
  template: `
    <shared-button
      variant="secondary"
      size="large"
      (click)="onClicked()"
    >
      Click Me (Angular)
    </shared-button>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  onClicked() {
    console.log('Clicked in Angular');
  }
}
```

```vue
<!-- 在 Svelte 中使用 -->
<script>
  import 'shared-button';

  function onClicked() {
    console.log('Clicked in Svelte');
  }
</script>

<shared-button
  variant="primary"
  size="large"
  on:click={onClicked}
>
  Click Me (Svelte)
</shared-button>
```

### 5.9 SSR 兼容的 Custom Element

```javascript
// ssr-friendly-element.js
import { defineCustomElement, h } from 'vue';

const SSRFriendlyElement = defineCustomElement({
  props: {
    data: { type: Object, default: () => ({}) },
  },
  template: `
    <div class="ssr-element">
      <h3>{{ data.title }}</h3>
      <p>{{ data.description }}</p>
    </div>
  `,
  styles: [`
    .ssr-element {
      padding: 16px;
      border: 1px solid #ddd;
    }
    .ssr-element h3 {
      margin: 0 0 8px;
    }
  `],
  // SSR 友好：避免在 setup 中访问 window/document
  setup(props) {
    // 错误：直接访问 window（SSR 时不存在）
    // const width = window.innerWidth;

    // 正确：在 onMounted 中访问（仅客户端执行）
    onMounted(() => {
      if (typeof window !== 'undefined') {
        console.log('Client width:', window.innerWidth);
      }
    });

    return {};
  },
});

customElements.define('ssr-friendly', SSRFriendlyElement);
```

### 5.10 完整企业级组件示例

```javascript
// enterprise-table.js —— 企业级表格 Web Component
import { defineCustomElement, ref, computed, h } from 'vue';

const EnterpriseTable = defineCustomElement({
  props: {
    columns: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    pageSize: { type: Number, default: 10 },
    selectable: { type: Boolean, default: false },
    sortable: { type: Boolean, default: true },
  },
  emits: ['row-click', 'select', 'page-change'],
  setup(props, { emit }) {
    const currentPage = ref(1);
    const sortKey = ref('');
    const sortOrder = ref<'asc' | 'desc'>('asc');
    const selectedRows = ref<Set<number>>(new Set());

    const sortedRows = computed(() => {
      if (!sortKey.value) return props.rows;
      const key = sortKey.value;
      const order = sortOrder.value === 'asc' ? 1 : -1;
      return [...props.rows].sort((a, b) => {
        if (a[key] < b[key]) return -1 * order;
        if (a[key] > b[key]) return 1 * order;
        return 0;
      });
    });

    const paginatedRows = computed(() => {
      const start = (currentPage.value - 1) * props.pageSize;
      return sortedRows.value.slice(start, start + props.pageSize);
    });

    const totalPages = computed(() =>
      Math.ceil(props.rows.length / props.pageSize),
    );

    function handleSort(key: string) {
      if (!props.sortable) return;
      if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
      }
    }

    function handleRowClick(row: any, index: number) {
      emit('row-click', { row, index });
    }

    function handleSelect(rowId: number) {
      if (selectedRows.value.has(rowId)) {
        selectedRows.value.delete(rowId);
      } else {
        selectedRows.value.add(rowId);
      }
      emit('select', Array.from(selectedRows.value));
    }

    function goToPage(page: number) {
      currentPage.value = page;
      emit('page-change', page);
    }

    return {
      currentPage,
      sortKey,
      sortOrder,
      paginatedRows,
      totalPages,
      handleSort,
      handleRowClick,
      handleSelect,
      goToPage,
      selectedRows,
    };
  },
  template: `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th v-if="selectable"></th>
            <th
              v-for="col in columns"
              :key="col.key"
              @click="handleSort(col.key)"
            >
              {{ col.title }}
              <span v-if="sortKey === col.key">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in paginatedRows"
            :key="row.id || index"
            @click="handleRowClick(row, index)"
          >
            <td v-if="selectable">
              <input
                type="checkbox"
                :checked="selectedRows.has(row.id)"
                @click.stop="handleSelect(row.id)"
              />
            </td>
            <td v-for="col in columns" :key="col.key">
              {{ row[col.key] }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >Prev</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >Next</button>
      </div>
    </div>
  `,
  styles: [`
    .table-container {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f5f5f5;
      cursor: pointer;
      user-select: none;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .pagination {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }
    .pagination button {
      padding: 4px 12px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
});

customElements.define('enterprise-table', EnterpriseTable);
```

---

## 6. 对比分析 | Comparative Analysis

### 6.1 Vue Web Components 与原生 Vue SFC 对比

| 维度 | Vue SFC | Vue Web Component |
|------|---------|-------------------|
| 消费方式 | 仅在 Vue 应用中使用 | 任何框架/原生 HTML |
| 样式隔离 | Scoped CSS（编译时） | Shadow DOM（运行时） |
| 生命周期 | Vue 生命周期 | Custom Element 生命周期 + Vue 生命周期 |
| Props 传递 | Vue 响应式 | Attribute + Property 同步 |
| 事件 | Vue emit | CustomEvent 分发 |
| 依赖注入 | Provide/Inject 可用 | Provide/Inject 不可用（独立 Vue 实例） |
| 全局插件 | 可用 Vue 插件 | 独立 Vue 实例，需重新配置 |
| 性能 | 直接 Vue 渲染 | 额外 Custom Element 包装层 |
| 包体积 | 共享 Vue 运行时 | 每个 CE 独立 Vue 实例（可共享） |
| 调试 | Vue DevTools 完整支持 | Vue DevTools 有限支持 |

### 6.2 Web Components 实现方案对比

| 方案 | 类型 | 包体积 | 响应式 | DX | Vue 协同 |
|------|------|--------|--------|-----|----------|
| Vue 3 CE | 框架扩展 | 中（Vue 运行时） | Proxy | 优秀 | 原生 |
| Lit | 独立库 | 小（5 KB） | Property | 良好 | 良好 |
| Stencil | 编译器 | 零（编译时） | 装饰器 | 良好 | 良好 |
| Fast | 独立库 | 中 | Observable | 良好 | 一般 |
| 原生 | 无依赖 | 零 | 手动 | 差 | 一般 |

### 6.3 样式隔离方案对比

| 方案 | 隔离机制 | 运行时开销 | 可穿透性 | 浏览器支持 |
|------|----------|------------|----------|------------|
| Shadow DOM | 浏览器原生 | 低 | CSS 变量、`::part()` | 现代浏览器 |
| Scoped CSS | 编译时属性选择器 | 无 | 全局可读 | 全部 |
| CSS Modules | 编译时类名哈希 | 无 | 全局可读 | 全部 |
| BEM | 命名约定 | 无 | 全局可读 | 全部 |
| iframe | 完全隔离 | 高 | postMessage | 全部 |

### 6.4 跨框架组件方案对比

| 方案 | 复用度 | 性能 | 开发体验 | 维护成本 |
|------|--------|------|----------|----------|
| Web Components | 极高 | 中 | 良好 | 中 |
| Module Federation | 高 | 高 | 中 | 高 |
| Single SPA | 高 | 中 | 中 | 高 |
| Iframe 微前端 | 高 | 低 | 低 | 低 |
| NPM 包共享 | 中 | 高 | 高 | 中 |

---

## 7. 常见陷阱与最佳实践 | Pitfalls and Best Practices

### 7.1 全局状态与依赖注入陷阱

**陷阱**：Web Components 创建独立的 Vue 实例，无法访问宿主应用的 Provide/Inject。

```javascript
// 错误：在 Custom Element 中尝试 inject 宿主应用的数据
const MyElement = defineCustomElement({
  setup() {
    // inject 返回 undefined，因为 Custom Element 是独立的 Vue 实例
    const theme = inject('theme');
    console.log(theme); // undefined
  },
});
```

**正确做法**：通过 Attribute/Property 传递数据，或使用全局状态（如 Pinia 持久化到 localStorage）。

### 7.2 SSR 兼容性陷阱

**陷阱**：在 Custom Element 的 setup 中直接访问浏览器 API。

```javascript
// 错误：SSR 时 window 不存在
const MyElement = defineCustomElement({
  setup() {
    const width = window.innerWidth; // SSR 报错
  },
});
```

**正确做法**：

```javascript
const MyElement = defineCustomElement({
  setup() {
    onMounted(() => {
      // 仅在客户端执行
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
      }
    });
  },
});
```

### 7.3 样式覆盖陷阱

**陷阱**：外部 CSS 无法覆盖 Shadow DOM 内部样式。

```css
/* 错误：外部 CSS 无法穿透 Shadow Boundary */
my-element .button {
  background: red; /* 不生效 */
}
```

**正确做法**：

```css
/* 方案 1：使用 CSS 自定义属性 */
:root {
  --my-element-button-bg: red;
}

/* 方案 2：使用 ::part() 伪元素（需组件暴露 part） */
my-element::part(button) {
  background: red;
}
```

```javascript
// 组件需暴露 part
const MyElement = defineCustomElement({
  template: `
    <button part="button">Click</button>
  `,
});
```

### 7.4 事件监听陷阱

**陷阱**：Custom Event 未设置 `composed: true`，事件不穿透 Shadow Boundary。

```javascript
// 错误：事件不穿透 Shadow
this.dispatchEvent(new CustomEvent('my-event', {
  detail: { data: 'value' },
  bubbles: true,
  // 缺少 composed: true
}));
```

**正确做法**：

```javascript
// Vue 3 的 defineCustomElement 自动设置 composed: true
// 手动分发时需显式设置
this.dispatchEvent(new CustomEvent('my-event', {
  detail: { data: 'value' },
  bubbles: true,
  composed: true, // 关键：穿透 Shadow Boundary
}));
```

### 7.5 属性类型转换陷阱

**陷阱**：Complex 类型（Object、Array）通过 Attribute 传递时需 JSON 序列化。

```html
<!-- 错误：直接传递对象 -->
<my-element :data="{ key: 'value' }"></my-element>
```

**正确做法**：

```vue
<template>
  <!-- Vue 自动处理 Property 同步 -->
  <my-element :data="myData" :items="myItems"></my-element>
</template>

<script setup>
import { ref } from 'vue';
const myData = ref({ key: 'value' });
const myItems = ref([1, 2, 3]);
</script>
```

```html
<!-- 原生 HTML 中需 JSON 序列化 -->
<my-element data='{"key":"value"}'></my-element>
```

### 7.6 最佳实践清单

1. **优先使用 SFC**：在 Vue 应用内部优先使用 SFC，仅在跨框架复用时使用 Web Components。
2. **CSS 自定义属性开放定制**：所有可定制样式通过 CSS 变量暴露，便于外部覆盖。
3. **`::part()` 谨慎使用**：仅对需要深度定制的元素暴露 `part`，避免内部实现泄漏。
4. **事件命名规范**：使用 kebab-case 命名事件（如 `row-click`、`value-change`）。
5. **SSR 友好**：避免在 setup 中访问浏览器 API，将副作用放入 `onMounted`。
6. **包体积优化**：多个 Custom Elements 共享同一 Vue 运行时（通过外部 Vue CDN）。
7. **版本管理**：Custom Element 发布后需保持向后兼容，避免破坏性变更。
8. **文档完善**：为每个 Custom Element 提供属性、事件、Slot 的完整文档。
9. **测试覆盖**：使用 `@open-wc/testing` 或 Web Component Testing 库进行单元测试。
10. **可访问性**：Custom Element 内部遵循 WAI-ARIA 规范，支持键盘导航与屏幕阅读器。

---

## 8. 工程实践 | Engineering Practice

### 8.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 识别自定义元素
          isCustomElement: (tag) =>
            tag.startsWith('my-') ||
            tag.startsWith('ion-') ||
            tag.startsWith('shared-'),
        },
      },
    }),
  ],
  build: {
    // 库模式构建 Custom Element
    lib: {
      entry: 'src/components/index.ts',
      name: 'MyWebComponents',
      formats: ['es'],
    },
    rollupOptions: {
      // Vue 外部化，避免打包进每个 CE
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
});
```

### 8.2 单元测试

```typescript
// my-element.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import './my-element';

describe('my-element', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    element = document.createElement('my-element');
    document.body.appendChild(element);
    // 等待 Custom Element 升级
    await customElements.whenDefined('my-element');
  });

  it('should render with default props', () => {
    const shadow = element.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow?.querySelector('span')?.textContent).toBe('Hello');
  });

  it('should react to attribute changes', async () => {
    element.setAttribute('message', 'Updated');
    await element.updateComplete; // Lit 风格的等待
    const span = element.shadowRoot?.querySelector('span');
    expect(span?.textContent).toBe('Updated');
  });

  it('should dispatch events', () => {
    let eventDetail = null;
    element.addEventListener('change', (e: Event) => {
      eventDetail = (e as CustomEvent).detail;
    });

    const button = element.shadowRoot?.querySelector('button');
    button?.click();

    expect(eventDetail).toEqual({ old: 0, new: 1 });
  });
});
```

### 8.3 文档生成

```typescript
// 使用 Web Component Analyzer 生成文档
// npm install --save-dev @custom-elements-manifest/analyzer
import { createPlugin } from '@custom-elements-manifest/analyzer';

export default {
  plugins: [
    createPlugin(),
  ],
  // 生成 custom-elements.json
  // 可被 VS Code、Storybook 等工具消费
};
```

### 8.4 Storybook 集成

```javascript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|ts)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/web-components',
};

// my-element.stories.js
export default {
  title: 'My Element',
  argTypes: {
    message: { control: 'text' },
    count: { control: 'number' },
  },
};

const Template = (args) => {
  const el = document.createElement('my-element');
  el.setAttribute('message', args.message);
  el.setAttribute('count', args.count);
  return el;
};

export const Default = Template.bind({});
Default.args = {
  message: 'Hello Storybook',
  count: 0,
};
```

### 8.5 CI/CD 发布

```yaml
# .github/workflows/release.yml
name: Release Web Components

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 9. 案例研究 | Case Studies

### 9.1 Ionic Framework（ionic.io）

Ionic Framework 是最著名的 Web Components 实践案例。Ionic 4+ 完全基于 Stencil 构建为 Web Components，可在 Vue、React、Angular 中复用。

**架构特点**：

1. **Stencil 编译**：将 TypeScript + JSX 编译为原生 Web Components。
2. **框架适配层**：为 Vue、React、Angular 提供独立的包装库（`@ionic/vue`、`@ionic/react`）。
3. **CSS 变量主题**：所有样式通过 CSS 变量定义，支持主题定制。
4. **懒加载**：组件按需加载，减少首屏体积。

**在 Vue 中使用**：

```typescript
import { IonicVue } from '@ionic/vue';
import '@ionic/vue/css/ionic.bundle.css';

const app = createApp(App).use(IonicVue);
```

### 9.2 SAP UI5 Web Components

SAP UI5 Web Components 是企业级 Web Components 库，提供符合 SAP Fiori 设计规范的组件。

**特点**：

1. **企业级规范**：严格遵循 SAP Fiori Design Guidelines。
2. **可访问性**：完整的 WAI-ARIA 支持。
3. **国际化**：内置 i18n 支持。
4. **主题切换**：通过 CSS 变量实现主题切换。

### 9.3 GitHub Web Components

GitHub 在其网站中大量使用 Web Components，包括 `<details-dialog>`、`<filter-input>`、`<clipboard-copy>` 等组件。

**特点**：

1. **原生优先**：尽可能使用原生 Web Components，减少框架依赖。
2. **轻量级**：每个组件独立打包，按需加载。
3. **可访问性**：完整的键盘导航与屏幕阅读器支持。

### 9.4 Adobe Spectrum Web Components

Adobe Spectrum Web Components 是 Adobe 设计系统的官方 Web Components 实现。

**特点**：

1. **设计系统驱动**：所有组件严格遵循 Spectrum Design System。
2. **TypeScript 优先**：完整的 TypeScript 类型定义。
3. **可主题化**：通过 CSS 变量实现深色模式、高对比度模式等。

### 9.5 VueUse Web Components

VueUse 部分工具可作为 Web Components 分发，提供跨框架的状态管理与工具函数。

**实践**：将 VueUse 的 `useMousePosition`、`useWindowSize` 等封装为 Web Components，在 React/Angular 中复用。

---

## 10. 习题 | Exercises

### 10.1 选择题

**题目 1**：Web Components 的四大核心规范不包括？

- A. Custom Elements
- B. Shadow DOM
- C. Virtual DOM
- D. HTML Templates

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：Web Components 的四大核心规范是 Custom Elements、Shadow DOM、HTML Templates、ES Modules。Virtual DOM 是 React 提出的概念，不属于 Web Components 规范。

</details>

**题目 2**：Vue 3 中将 Vue 组件转换为 Custom Element 的 API 是？

- A. `defineComponent`
- B. `defineCustomElement`
- C. `createApp`
- D. `customElements.define`

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：`defineCustomElement` 是 Vue 3 提供的 API，将 Vue 组件选项转换为 Custom Element 类。`customElements.define` 是浏览器原生 API，用于注册 Custom Element。

</details>

**题目 3**：Shadow DOM 的样式隔离机制阻断的是什么？

- A. JavaScript 作用域
- B. CSS 选择器穿透
- C. 事件传播
- D. DOM 查询

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：Shadow DOM 阻断的是 CSS 选择器穿透，外部 CSS 无法选择 Shadow DOM 内部元素。事件传播可以通过 `composed: true` 穿透。DOM 查询也被阻断，但样式隔离主要指 CSS。

</details>

**题目 4**：Custom Element 的标签名必须包含什么？

- A. 大写字母
- B. 连字符（-）
- C. 数字
- D. 下划线（_）

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：Custom Element 的标签名必须包含连字符（kebab-case），如 `<my-element>`。这是为了避免与未来 HTML 标准标签冲突。

</details>

**题目 5**：下列哪种方式可以穿透 Shadow Boundary？

- A. 外部 CSS 类选择器
- B. CSS 自定义属性（CSS Variables）
- C. querySelector 查询
- D. 外部 ID 选择器

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：CSS 自定义属性（如 `--color-primary`）通过继承机制穿透 Shadow Boundary。其他 CSS 选择器（类、ID）被 Shadow Boundary 阻断。querySelector 也无法穿透。

</details>

### 10.2 填空题

**题目 1**：Web Components 的四大核心规范是 Custom Elements、________、HTML Templates 和 ES Modules。

<details>
<summary>答案</summary>

Shadow DOM

</details>

**题目 2**：Vue 3 中通过 ________ API 将 Vue 组件转换为 Custom Element。

<details>
<summary>答案</summary>

`defineCustomElement`

</details>

**题目 3**：Custom Event 要穿透 Shadow Boundary，需设置 ________ 属性为 true。

<details>
<summary>答案</summary>

`composed`

</details>

**题目 4**：Vue SFC 文件名以 ________ 后缀结尾时，Vue 会将其编译为 Custom Element。

<details>
<summary>答案</summary>

`.ce.vue`

</details>

**题目 5**：在 Vite 配置中，通过 ________ 选项告诉 Vue 编译器识别自定义元素标签。

<details>
<summary>答案</summary>

`compilerOptions.isCustomElement`

</details>

### 10.3 编程题

**题目 1**：实现一个可跨框架复用的模态框 Web Component。

```javascript
// modal-element.js
import { defineCustomElement } from 'vue';

const ModalElement = defineCustomElement({
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    closeOnOverlay: { type: Boolean, default: true },
  },
  emits: ['close', 'open'],
  template: `
    <div v-if="open" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="close">×</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button @click="close">Close</button>
          </slot>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
    }
    .modal-body {
      padding: 16px;
    }
    .modal-footer {
      padding: 16px;
      border-top: 1px solid #eee;
      text-align: right;
    }
  `],
  setup(props, { emit }) {
    function close() {
      emit('close');
    }
    function handleOverlayClick() {
      if (props.closeOnOverlay) close();
    }
    return { close, handleOverlayClick };
  },
});

customElements.define('my-modal', ModalElement);
```

**题目 2**：在 React 应用中使用上述模态框。

```jsx
// ReactApp.jsx
import React, { useState } from 'react';
import 'modal-element';

function App() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Modal</button>
      <my-modal
        open={open}
        title="React + Web Component"
        onClose={() => setOpen(false)}
      >
        <p>This modal is built with Vue but used in React!</p>
      </my-modal>
    </div>
  );
}
```

### 10.4 思考题

**题目 1**：何时应该使用 Vue Web Components 而非 Vue SFC？请列出至少 3 个场景。

<details>
<summary>参考答案</summary>

1. **跨框架复用**：组件需要在 Vue、React、Angular 中使用，如企业设计系统。
2. **微前端架构**：不同子应用使用不同框架，需要共享组件。
3. **第三方分发**：组件作为独立库分发给未知技术栈的消费者。
4. **遗留系统集成**：将 Vue 组件集成到 jQuery 或原生 HTML 项目中。
5. **CMS 内容嵌入**：在 WordPress、Drupal 等 CMS 中嵌入交互式 Vue 组件。

</details>

**题目 2**：Shadow DOM 的样式隔离有哪些优点与缺点？

<details>
<summary>参考答案</summary>

**优点**：

1. 完全隔离，外部样式不会意外影响组件内部。
2. 内部样式不会泄漏到外部，避免全局污染。
3. 浏览器原生支持，无需编译时处理。
4. 组件可移植性高，不依赖外部 CSS 环境。

**缺点**：

1. 外部定制困难，需通过 CSS 变量或 `::part()` 显式开放。
2. 全局主题（如字体、颜色）需通过 CSS 变量传递。
3. 第三方 CSS 库（如 Tailwind）无法直接使用。
4. 调试时 Shadow DOM 内部较难检查。

</details>

**题目 3**：Vue Web Components 与原生 Vue SFC 在依赖注入（Provide/Inject）上的差异？如何解决？

<details>
<summary>参考答案</summary>

**差异**：

- Vue SFC：可以使用宿主应用的 Provide/Inject，访问全局状态。
- Vue Web Component：创建独立的 Vue 实例，无法访问宿主应用的 Provide/Inject。

**解决方案**：

1. **通过 Attribute/Property 传递**：将需要的数据作为属性传递给 Custom Element。
2. **全局状态**：使用 Pinia + localStorage 持久化，Custom Element 内部独立访问。
3. **事件通信**：通过 Custom Event 与宿主应用通信。
4. **共享 Vue 实例**：通过外部 Vue 全局 API 共享响应式状态（如 `reactive` 创建的全局对象）。

</details>

**题目 4**：如何实现一个支持 SSR 的 Vue Web Component？需要考虑哪些问题？

<details>
<summary>参考答案</summary>

**关键问题**：

1. **浏览器 API 访问**：SSR 时 `window`、`document` 不存在，需在 `onMounted` 中访问。
2. **Shadow DOM 服务端渲染**：传统 Shadow DOM 仅在客户端创建，需使用 Declarative Shadow DOM。
3. **Hydration**：服务端渲染的 HTML 需要在客户端正确水合。
4. **样式注入**：服务端渲染时需将样式作为 `<template>` 注入。

**实现方案**：

1. 使用 `@vue/server-renderer` 的 `renderToString` 渲染 Custom Element 内容。
2. 使用 Declarative Shadow DOM（`<template shadowrootmode="open">`）。
3. 客户端水合时检测已有 Shadow Root，避免重复创建。
4. Vue 3.3+ 提供实验性 Declarative Shadow DOM 支持。

</details>

**题目 5**：在企业设计系统中，应选择 Web Components 还是各框架原生组件？请分析权衡因素。

<details>
<summary>参考答案</summary>

**选择 Web Components 的场景**：

1. 需要支持多个框架（Vue + React + Angular）。
2. 团队有 Web Components 经验，能接受额外的学习成本。
3. 对包体积敏感，希望避免重复打包框架运行时。
4. 长期维护，技术栈可能变化。

**选择各框架原生组件的场景**：

1. 仅使用单一框架（如纯 Vue 项目）。
2. 需要深度集成框架特性（如 Vue 的 Provide/Inject、React 的 Context）。
3. 团队对 Web Components 不熟悉。
4. 性能要求极高，无法接受 Custom Element 的额外开销。

**混合方案**：

- 核心组件（按钮、输入框）使用 Web Components，跨框架复用。
- 复杂组件（表格、表单）使用各框架原生实现，深度集成。
- 通过设计令牌（Design Tokens）统一视觉规范。

</details>

---

## 11. 参考文献 | References

1. W3C. (2023). *Custom Elements Specification*. W3C. https://w3c.github.io/webcomponents/spec/custom/

2. W3C. (2023). *Shadow DOM Specification*. W3C. https://w3c.github.io/webcomponents/spec/shadow/

3. You, E. (2020). *Vue 3 Custom Element API*. Vue.js Documentation. https://vuejs.org/guide/extras/web-components.html

4. Russell, D. (2018). *Web Components: The Future of Web Development*. Google Developers. https://developers.google.com/web/fundamentals/web-components

5. Bukres, A. (2022). *Building Web Components with Lit*. O'Reilly Media. ISBN: 978-1098112894

6. Penna, M. (2023). *Stencil: Compiling Web Components*. Ionic Team. https://stenciljs.com/

7. Ionic Team. (2024). *Ionic Framework Documentation*. https://ionicframework.com/docs

8. SAP. (2024). *UI5 Web Components*. SAP. https://sap.github.io/ui5-webcomponents/

9. Adobe. (2024). *Spectrum Web Components*. Adobe. https://opensource.adobe.com/spectrum-web-components/

10. Open Web Components. (2024). *Open Web Components Guides*. https://open-wc.org/

11. Microsoft. (2023). *Fast Framework*. Microsoft. https://www.fast.design/

12. Google. (2024). *Lit Framework Documentation*. Google. https://lit.dev/

13. Vue.js Team. (2024). *Vue 3 Custom Element API Reference*. https://vuejs.org/api/custom-elements.html

14. ECMAScript. (2024). *ECMAScript Modules Specification*. ECMA International. https://tc39.es/ecma262/

15. WHATWG. (2024). *HTML Living Standard*. WHATWG. https://html.spec.whatwg.org/

16. Lea, V. (2022). *Web Components in Action*. Manning Publications. ISBN: 978-1617295110

17. Farrell, C. (2023). *Declarative Shadow DOM*. Chrome Developers. https://web.dev/declarative-shadow-dom/

18. Brown, E. (2023). *Cross-Framework Component Architecture*. Frontend Architecture Summit.

19. Wilson, S. (2024). *Design Systems with Web Components*. Smashing Magazine. https://www.smashingmagazine.com/

20. Polyfills Working Group. (2024). *Web Components Polyfills*. https://github.com/webcomponents/polyfills

---

## 12. 延伸阅读 | Further Reading

### 12.1 官方文档

- **Vue 3 Custom Elements**：https://vuejs.org/guide/extras/web-components.html
- **MDN Web Components**：https://developer.mozilla.org/en-US/docs/Web/API/Web_components
- **Google Web Components**：https://developers.google.com/web/fundamentals/web-components
- **web.dev Web Components**：https://web.dev/web-components-io/

### 12.2 进阶书籍

- **《Web Components in Action》**：Ben Farrell 著，Manning Publications，2022。
- **《Building Web Components with Lit》**：Andres Bukres 著，O'Reilly Media，2022。
- **《Component-Based Software Engineering》**：George T. Heineman 著，Springer，2023。

### 12.3 在线课程

- **Frontend Masters: Web Components**：https://frontendmasters.com/courses/web-components/
- **web.dev: Learn Web Components**：https://web.dev/learn-web-components/
- **Pluralsight: Web Components Fundamentals**：https://www.pluralsight.com/courses/web-components-fundamentals

### 12.4 工具与库

- **Lit**：https://lit.dev/
- **Stencil**：https://stenciljs.com/
- **Fast**：https://www.fast.design/
- **Open Web Components**：https://open-wc.org/
- **Custom Elements Manifest Analyzer**：https://custom-elements-manifest.open-wc.org/
- **Storybook for Web Components**：https://storybook.js.org/docs/web-components/get-started/introduction

### 12.5 设计系统案例

- **Ionic Framework**：https://ionicframework.com/
- **SAP UI5 Web Components**：https://sap.github.io/ui5-webcomponents/
- **Adobe Spectrum**：https://spectrum.adobe.io/
- **GitHub Primer**：https://primer.style/
- **Microsoft Fluent UI**：https://www.npmjs.com/package/@fluentui/web-components

### 12.6 社区与博客

- **Web Components Community**：https://webcomponents.community/
- **Custom Elements Everywhere**：https://custom-elements-everywhere.com/
- **Chrome Developers Blog**：https://developer.chrome.com/blog/
- **web.dev blog**：https://web.dev/blog/

### 12.7 相关规范

- **Custom Elements**：https://html.spec.whatwg.org/multipage/custom-elements.html
- **Shadow DOM**：https://dom.spec.whatwg.org/#shadow-trees
- **HTML Templates**：https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
- **CSS Scoping**：https://drafts.csswg.org/css-scoping/
- **CSS Shadow Parts**：https://drafts.csswg.org/css-shadow-parts/

### 12.8 学习路径建议

1. **入门阶段**：
   - 阅读 MDN Web Components 教程
   - 使用原生 API 创建简单 Custom Element
   - 理解 Shadow DOM 的样式隔离

2. **进阶阶段**：
   - 学习 Vue 3 `defineCustomElement` API
   - 实践 Vue SFC → Custom Element 转换
   - 在 Vue 应用中消费第三方 Web Components

3. **高级阶段**：
   - 构建企业设计系统
   - 实现跨框架组件库
   - 探索 SSR 兼容的 Custom Element

4. **专家阶段**：
   - 研究 Declarative Shadow DOM
   - 参与规范讨论与 Polyfill 开发
   - 技术布道与开源贡献

---

## 附录 A：Web Components 浏览器支持

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Custom Elements v1 | 67+ | 63+ | 10.1+ | 79+ |
| Shadow DOM v1 | 53+ | 63+ | 10+ | 79+ |
| HTML Templates | 26+ | 22+ | 8+ | 13+ |
| CSS Shadow Parts | 73+ | 72+ | 13.1+ | 79+ |
| Declarative Shadow DOM | 111+ | 123+ | 16.4+ | 111+ |

## 附录 B：Vue Web Components 检查清单

- [ ] 命名规范：标签名包含连字符，符合 kebab-case
- [ ] Props 声明：所有属性声明类型，便于自动转换
- [ ] Emits 声明：所有事件显式声明
- [ ] 样式隔离：使用 Shadow DOM 实现样式隔离
- [ ] CSS 变量：可定制样式通过 CSS 变量暴露
- [ ] `::part()` 暴露：需要深度定制的元素暴露 part
- [ ] 事件 composed：确保事件穿透 Shadow Boundary
- [ ] SSR 友好：避免在 setup 中访问浏览器 API
- [ ] Slot 设计：合理使用具名 Slot 与默认 Slot
- [ ] 可访问性：完整支持 WAI-ARIA
- [ ] 单元测试：覆盖属性、事件、Slot
- [ ] 文档完善：生成 custom-elements.json
- [ ] 包体积：共享 Vue 运行时，避免重复打包
- [ ] 版本管理：遵循 SemVer，向后兼容

---

> **文档版本**：v2.0（2026-06-14）
> **目标读者**：Vue 3 中高级开发者、前端架构师、设计系统工程师
> **配套版本**：Vue 3.4+、Vite 5+、Lit 3+、Stencil 4+
> **维护者**：FANDEX 团队
> **反馈渠道**：issues@fandex.dev

---

*本文档对标 MIT 6.170 Software Studio、Stanford CS142 Web Applications、CMU 17-437 Engineering of Web Applications 课程水准，旨在为 Vue 3 开发者提供系统化、工程化的 Web Components 互操作参考。*
