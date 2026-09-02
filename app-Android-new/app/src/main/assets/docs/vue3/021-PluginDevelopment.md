---
order: 210
title: 插件开发
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Vue3插件开发详解：插件结构、app.use注册、provide/inject、指令插件与全局组件注册。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'vue3/019-TypeScriptIntegration'
  - 'vue3/020-PiniaStateManagementDetailed'
  - 'vue3/022-ComputedCacheWatchTiming'
  - 'vue3/023-VueRouterDetailed'
prerequisites: []
---

## 前置知识

- [Pinia 状态管理详解](/vue3/020-PiniaStateManagementDetailed)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 插件基础」的核心机制、典型用法与常见陷阱
- 掌握「2. 插件开发实战」的核心机制、典型用法与常见陷阱
- 掌握「3. 插件配置与类型安全」的核心机制、典型用法与常见陷阱
- 掌握「4. 常见问题与解决方案」的核心机制、典型用法与常见陷阱
- 掌握「5. 总结与最佳实践」的核心机制、典型用法与常见陷阱


## 1. 插件基础

### 1.1 什么是 Vue 插件

Vue插件是自包含的代码，用于向Vue应用添加全局级功能。插件可以：

- 注册全局组件、指令、过渡等
- 通过 provide/inject 注入全局服务
- 添加全局属性或方法
- 注入组合式函数

### 1.2 插件基本结构

```typescript
// 方式1：对象式插件（带install方法）
import type { App, Plugin } from 'vue';

const myPlugin: Plugin = {
  install(app: App, options?: PluginOptions) {
    // 插件逻辑
  },
};

// 方式2：函数式插件
const myPlugin2: Plugin = (app: App, options?: PluginOptions) => {
  // 插件逻辑
};

// 使用插件
// app.use(myPlugin, { /* options */ })
```

## 2. 插件开发实战

### 2.1 全局属性插件

```typescript
// plugins/i18n/index.ts
import type { App, Plugin } from 'vue';
import { ref, computed } from 'vue';
import en from './locales/en';
import zh from './locales/zh';

type Messages = Record<string, Record<string, string>>;

const messages: Messages = { en, zh };

export function createI18n(options: { locale: string }) {
  const locale = ref(options.locale);

  function t(key: string): string {
    return messages[locale.value]?.[key] ?? key;
  }

  function setLocale(newLocale: string) {
    locale.value = newLocale;
  }

  return { locale, t, setLocale };
}

export type I18nInstance = ReturnType<typeof createI18n>;

const i18nPlugin: Plugin = {
  install(app: App, options: { locale: string }) {
    const i18n = createI18n(options);

    // 注入全局属性
    app.config.globalProperties.$t = i18n.t;
    app.config.globalProperties.$locale = i18n.locale;

    // 通过provide/inject提供（推荐方式）
    app.provide('i18n', i18n);

    // 注入响应式locale用于模板
    app.provide('locale', i18n.locale);
  },
};

export default i18nPlugin;

// composables/useI18n.ts
import { inject } from 'vue';
import type { I18nInstance } from '@/plugins/i18n';

export function useI18n(): I18nInstance {
  const i18n = inject<I18nInstance>('i18n');
  if (!i18n) {
    throw new Error('i18n plugin not installed');
  }
  return i18n;
}

// main.ts
// app.use(i18nPlugin, { locale: 'zh' })
```

### 2.2 全局组件注册插件

```typescript
// plugins/ui/index.ts
import type { App, Plugin } from 'vue';

// 自动导入组件
const components = import.meta.glob('../components/ui/*.vue', { eager: true });

const uiPlugin: Plugin = {
  install(app: App) {
    for (const path in components) {
      const component = components[path] as any;
      // 从文件路径提取组件名: ../components/ui/FButton.vue → FButton
      const name = path.split('/').pop()?.replace('.vue', '');
      if (name) {
        app.component(name, component.default || component);
      }
    }
  },
};

export default uiPlugin;

// main.ts
// app.use(uiPlugin)
// 现在所有ui组件都全局可用: <FButton>, <FInput>, <FModal> 等
```

### 2.3 指令插件

```typescript
// plugins/directives/index.ts
import type { App, Plugin, Directive, DirectiveBinding } from 'vue';

// v-loading: 加载指令
const vLoading: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      addLoading(el);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      addLoading(el);
    } else {
      removeLoading(el);
    }
  },
};

function addLoading(el: HTMLElement) {
  el.style.position = 'relative';
  const mask = document.createElement('div');
  mask.className = 'v-loading-mask';
  mask.innerHTML = '<div class="v-loading-spinner"></div>';
  el.appendChild(mask);
}

function removeLoading(el: HTMLElement) {
  const mask = el.querySelector('.v-loading-mask');
  if (mask) {
    el.removeChild(mask);
  }
}

// v-debounce: 防抖点击指令
const vDebounce: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value: handler, arg: delay = '300' } = binding;
    let timer: ReturnType<typeof setTimeout>;

    el.addEventListener('click', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handler();
      }, Number(delay));
    });
  },
};

// v-permission: 权限指令
const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string[]>) {
    const userPermissions = getUserPermissions(); // 获取当前用户权限
    const requiredPermissions = binding.value;

    if (!requiredPermissions.some((p) => userPermissions.includes(p))) {
      el.parentNode?.removeChild(el);
    }
  },
};

function getUserPermissions(): string[] {
  // 从store或token中获取
  return ['read', 'write'];
}

const directivesPlugin: Plugin = {
  install(app: App) {
    app.directive('loading', vLoading);
    app.directive('debounce', vDebounce);
    app.directive('permission', vPermission);
  },
};

export default directivesPlugin;

// 使用
// <button v-debounce:500="handleSave">保存</button>
// <div v-loading="isLoading">内容</div>
// <button v-permission="['admin']">删除</button>
```

### 2.4 通知/Toast 插件

```typescript
// plugins/toast/index.ts
import type { App, Plugin } from 'vue';
import { createApp, h, ref } from 'vue';
import ToastContainer from './ToastContainer.vue';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const toasts = ref<Array<{ id: number } & ToastOptions>>([]);
let nextId = 0;

function addToast(options: ToastOptions) {
  const id = nextId++;
  toasts.value.push({ id, type: 'info', duration: 3000, ...options });

  setTimeout(() => {
    removeToast(id);
  }, options.duration ?? 3000);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

const toast = {
  success: (message: string, duration?: number) => addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => addToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) => addToast({ message, type: 'warning', duration }),
  info: (message: string, duration?: number) => addToast({ message, type: 'info', duration }),
};

const toastPlugin: Plugin = {
  install(app: App) {
    // 全局属性
    app.config.globalProperties.$toast = toast;

    // provide/inject
    app.provide('toast', toast);

    // 挂载Toast容器
    const container = document.createElement('div');
    document.body.appendChild(container);

    const toastApp = createApp({
      render() {
        return h(ToastContainer, { toasts: toasts.value, onClose: removeToast });
      },
    });

    toastApp.mount(container);
  },
};

export default toastPlugin;
export { toast };

// composables/useToast.ts
import { inject } from 'vue';

export function useToast() {
  const toast = inject<typeof toast>('toast');
  if (!toast) {
    throw new Error('Toast plugin not installed');
  }
  return toast;
}

// 使用
// const { success, error } = useToast()
// success('操作成功！')
```

## 3. 插件配置与类型安全

### 3.1 类型安全的插件配置

```typescript
// plugins/myPlugin/types.ts
export interface MyPluginOptions {
  prefix?: string;
  debug?: boolean;
  theme?: 'light' | 'dark';
}

// plugins/myPlugin/index.ts
import type { App, Plugin } from 'vue';
import type { MyPluginOptions } from './types';

const defaultOptions: Required<MyPluginOptions> = {
  prefix: 'my',
  debug: false,
  theme: 'light',
};

const myPlugin: Plugin = {
  install(app: App, userOptions: MyPluginOptions = {}) {
    const options = { ...defaultOptions, ...userOptions };

    if (options.debug) {
      console.log('[MyPlugin] Installing with options:', options);
    }

    app.provide('myPluginOptions', options);
  },
};

export default myPlugin;

// 扩展ComponentCustomProperties
declare module 'vue' {
  interface ComponentCustomProperties {
    $myPlugin: {
      options: Required<MyPluginOptions>;
    };
  }
}
```

### 3.2 插件组合

```typescript
// plugins/index.ts
import type { App } from 'vue';
import i18nPlugin from './i18n';
import uiPlugin from './ui';
import directivesPlugin from './directives';
import toastPlugin from './toast';

export function installPlugins(app: App) {
  app.use(i18nPlugin, { locale: 'zh' });
  app.use(uiPlugin);
  app.use(directivesPlugin);
  app.use(toastPlugin);
}

// main.ts
import { installPlugins } from './plugins';

const app = createApp(App);
installPlugins(app);
app.mount('#app');
```

## 4. 常见问题与解决方案

### 4.1 插件中的响应式数据

```typescript
// 问题：全局属性不是响应式的
// 错误
app.config.globalProperties.$theme = 'light'; // 非响应式

// 正确：使用ref/reactive
import { ref } from 'vue';

const theme = ref('light');
app.provide('theme', theme);

// 在组件中
const theme = inject<Ref<string>>('theme');
```

### 4.2 插件类型声明

```typescript
// env.d.ts 或 shims-vue.d.ts
declare module 'vue' {
  interface ComponentCustomProperties {
    $toast: {
      success: (message: string, duration?: number) => void;
      error: (message: string, duration?: number) => void;
      warning: (message: string, duration?: number) => void;
      info: (message: string, duration?: number) => void;
    };
    $t: (key: string) => string;
  }
}
```

### 4.3 插件顺序

```typescript
// 插件安装顺序很重要
// 依赖其他插件功能的插件应后安装
app.use(i18nPlugin); // 先安装i18n
app.use(formPlugin); // form插件可能依赖i18n
```

## 5. 总结与最佳实践

### 5.1 插件设计原则

1. **单一职责**：一个插件做一件事
2. **可配置**：通过options参数允许自定义
3. **类型安全**：提供完整的TypeScript类型
4. **provide/inject优先**：比globalProperties更灵活
5. **可测试**：导出核心逻辑，便于单元测试

### 5.2 最佳实践

1. **使用 provide/inject**：替代 globalProperties，更利于类型推导
2. **导出 composable**：提供 `useXxx` 函数供组件使用
3. **自动注册组件**：使用 `import.meta.glob` 批量注册
4. **清理副作用**：插件创建的全局监听器需提供清理方法
5. **文档化**：说明插件的配置选项和使用方式
## 插件结构

**插件对象形式**
```typescript
import type { App } from 'vue';

interface MyPluginOptions {
  apiBase: string;
  timeout?: number;
}

const MyPlugin = {
  install(app: App, options?: MyPluginOptions) {
    // 插件逻辑
    const finalOptions = { apiBase: '/api', ...options };
    app.provide('apiBase', finalOptions.apiBase);
  }
};

export default MyPlugin;
```

**插件函数形式**
```typescript
import type { App } from 'vue';

export default function MyPlugin(app: App, options?: PluginOptions) {
  app.provide('config', options);
  app.config.globalProperties.$api = createApi(options);
}
```

---

## 插件安装

**app.use 安装插件**
`app.use(<plugin>, [options]);`
```typescript
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import MyPlugin from './plugins/my-plugin';

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.use(MyPlugin, { apiBase: '/api', timeout: 3000 });
app.mount('#app');
```

**链式安装**
```typescript
createApp(App)
  .use(router)
  .use(createPinia())
  .use(MyPlugin, { apiBase: '/api' })
  .mount('#app');
```

---

## 插件能力

**注册全局组件**
```typescript
import type { App } from 'vue';
import MyButton from './MyButton.vue';
import MyInput from './MyInput.vue';

export default {
  install(app: App) {
    app.component('MyButton', MyButton);
    app.component('MyInput', MyInput);
  }
};
```

**注册全局指令**
```typescript
import type { App } from 'vue';

export default {
  install(app: App) {
    app.directive('focus', {
      mounted(el) { el.focus(); }
    });
    app.directive('permission', {
      mounted(el, binding) {
        if (!hasPermission(binding.value)) {
          el.parentNode?.removeChild(el);
        }
      }
    });
  }
};
```

**provide 全局依赖**
```typescript
import type { App } from 'vue';
import { ref } from 'vue';

export default {
  install(app: App, options: { apiBase: string }) {
    app.provide('apiBase', options.apiBase);
    app.provide('user', ref(null));
    app.provide(Symbol('config'), options);
  }
};
```

**扩展 globalProperties**
```typescript
import type { App } from 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    $apiBase: string;
    $format: (value: number, digits?: number) => string;
    $toast: (message: string, type?: 'info' | 'success' | 'error') => void;
  }
}

export default {
  install(app: App, options: { apiBase: string }) {
    app.config.globalProperties.$apiBase = options.apiBase;
    app.config.globalProperties.$format = (value: number, digits = 2) =>
      value.toFixed(digits);
    app.config.globalProperties.$toast = (message, type = 'info') => {
      console.log(`[${type}] ${message}`);
    };
  }
};
```

**注入组合式 API**
```typescript
import type { App } from 'vue';
import { ref, inject } from 'vue';

const ToastKey = Symbol('toast');

export default {
  install(app: App) {
    const toasts = ref<{ id: number; message: string; type: string }[]>([]);

    function show(message: string, type: string = 'info') {
      const id = Date.now();
      toasts.value.push({ id, message, type });
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
      }, 3000);
    }

    app.provide(ToastKey, { toasts, show });
  }
};

// 在组件中使用
export function useToast() {
  const toast = inject(ToastKey);
  if (!toast) throw new Error('useToast 必须在 ToastPlugin 之后使用');
  return toast;
}
```

---

## 插件配置

**默认配置合并**
```typescript
import type { App } from 'vue';

interface PluginOptions {
  apiBase?: string;
  timeout?: number;
  retry?: number;
}

const DEFAULT_OPTIONS: Required<PluginOptions> = {
  apiBase: '/api',
  timeout: 30000,
  retry: 3
};

export default {
  install(app: App, options: PluginOptions = {}) {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    app.provide('config', finalOptions);
  }
};
```

**多环境配置**
```typescript
export default {
  install(app: App) {
    const env = import.meta.env.MODE;
    const config = {
      development: { apiBase: 'http://localhost:3000', debug: true },
      production: { apiBase: 'https://api.example.com', debug: false }
    }[env];

    app.provide('envConfig', config);
  }
};
```

---

## Pinia 插件

**Pinia 插件结构**
```typescript
import type { PiniaPluginContext } from 'pinia';

export function myPiniaPlugin(context: PiniaPluginContext) {
  // context.store: 当前 store 实例
  // context.options: defineStore 选项

  // 添加持久化
  const saved = localStorage.getItem(context.store.$id);
  if (saved) {
    context.store.$patch(JSON.parse(saved));
  }

  context.store.$subscribe((mutation, state) => {
    localStorage.setItem(context.store.$id, JSON.stringify(state));
  });

  // 给所有 store 添加通用方法
  return {
    reset() {
      context.store.$reset();
    }
  };
}

// 使用
const pinia = createPinia();
pinia.use(myPiniaPlugin);
app.use(pinia);
```

---

## Router 插件

**Router 拦截插件**
```typescript
import type { App } from 'vue';
import type { Router } from 'vue-router';

export function createAuthPlugin(router: Router) {
  return {
    install(app: App) {
      router.beforeEach((to, from) => {
        const token = localStorage.getItem('token');
        if (to.meta.requiresAuth && !token) {
          return { name: 'login', query: { redirect: to.fullPath } };
        }
      });

      app.provide('auth', {
        login(token: string) {
          localStorage.setItem('token', token);
        },
        logout() {
          localStorage.removeItem('token');
          router.push('/login');
        }
      });
    }
  };
}

// 使用
import router from './router';
app.use(createAuthPlugin(router));
```

---

## 完整插件示例

**Toast 插件**
```typescript
// plugins/toast.ts
import type { App, Plugin } from 'vue';
import { ref, inject, type Ref } from 'vue';

export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface ToastAPI {
  toasts: Ref<ToastItem[]>;
  show(message: string, type?: ToastItem['type']): void;
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
  remove(id: number): void;
}

const ToastKey = Symbol('toast');

export const ToastPlugin: Plugin = {
  install(app: App) {
    const toasts = ref<ToastItem[]>([]);

    function remove(id: number) {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }

    function show(message: string, type: ToastItem['type'] = 'info') {
      const id = Date.now() + Math.random();
      toasts.value.push({ id, message, type });
      setTimeout(() => remove(id), 3000);
    }

    const api: ToastAPI = {
      toasts,
      show,
      success: (msg) => show(msg, 'success'),
      error: (msg) => show(msg, 'error'),
      info: (msg) => show(msg, 'info'),
      remove
    };

    app.provide(ToastKey, api);
    app.config.globalProperties.$toast = api;
  }
};

export function useToast(): ToastAPI {
  const api = inject<ToastAPI>(ToastKey);
  if (!api) throw new Error('useToast 必须在 ToastPlugin 之后使用');
  return api;
}
```

**main.ts**
```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { ToastPlugin } from './plugins/toast';

const app = createApp(App);
app.use(ToastPlugin);
app.mount('#app');
```

**组件中使用**
```typescript
import { useToast } from './plugins/toast';

const toast = useToast();
toast.success('保存成功');
toast.error('网络错误');
toast.show('自定义', 'warning');
```
