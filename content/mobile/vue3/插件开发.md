# 插件 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

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
