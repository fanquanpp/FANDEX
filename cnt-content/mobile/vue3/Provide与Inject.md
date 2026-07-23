# provide + inject API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 基础用法

**provide 提供依赖**
`provide(<key>, <value>);`
```typescript
import { provide, ref } from 'vue';

// 字符串 key
provide('theme', 'dark');

// Symbol key(推荐)
provide(Symbol('user'), { name: 'Tom' });

// 注入响应式值
const count = ref(0);
provide('count', count);

// 提供方法
provide('increment', () => count.value++);
```

**inject 注入依赖**
`const <value> = inject(<key>, [defaultValue], [treatDefaultAsFactory]);`
```typescript
import { inject } from 'vue';

// 注入(可能为 undefined)
const theme = inject('theme');

// 注入带默认值
const theme = inject('theme', 'light');

// 注入工厂函数作为默认值
const config = inject('config', () => createDefaultConfig(), true);
```

---

## 响应式 provide/inject

**提供响应式状态**
```typescript
import { provide, ref, readonly } from 'vue';

const theme = ref('dark');
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
};

// 提供只读状态 + 修改方法(单向数据流)
provide('theme', readonly(theme));
provide('toggleTheme', toggleTheme);
```

**子组件使用**
```typescript
import { inject } from 'vue';

const theme = inject<Readonly<Ref<string>>>('theme');
const toggleTheme = inject<() => void>('toggleTheme');

// theme.value 是只读,只能通过 toggleTheme 修改
```

**完整 store 模式**
```typescript
import { provide, ref, readonly, computed } from 'vue';

function provideUserStore() {
  const user = ref<{ id: number; name: string } | null>(null);
  const isLoading = ref(false);
  const isLoggedIn = computed(() => !!user.value);

  async function login(name: string) {
    isLoading.value = true;
    user.value = await fetchUser(name);
    isLoading.value = false;
  }

  function logout() {
    user.value = null;
  }

  provide('userStore', {
    user: readonly(user),
    isLoading: readonly(isLoading),
    isLoggedIn,
    login,
    logout
  });
}
```

---

## 类型安全

**InjectionKey 类型化注入**
`const <key> = Symbol() as InjectionKey<Type>;`
```typescript
import type { InjectionKey, Ref } from 'vue';
import { provide, inject } from 'vue';

interface UserContext {
  user: Ref<{ id: number; name: string } | null>;
  login: (name: string) => Promise<void>;
  logout: () => void;
}

export const UserKey: InjectionKey<UserContext> = Symbol('UserContext');

// 父组件
provide(UserKey, {
  user: ref(null),
  login: async (name) => { /* ... */ },
  logout: () => { /* ... */ }
});

// 子组件(自动推断类型)
const userStore = inject(UserKey);
if (userStore) {
  userStore.login('Tom');  // 类型安全
}
```

**Symbol 共享 key**
```typescript
// keys.ts
import type { InjectionKey } from 'vue';
export const ThemeKey: InjectionKey<string> = Symbol('theme');
export const ApiKey: InjectionKey<{ base: string }> = Symbol('api');

// provider.vue
import { provide } from 'vue';
import { ThemeKey, ApiKey } from './keys';
provide(ThemeKey, 'dark');
provide(ApiKey, { base: '/api/v1' });

// consumer.vue
import { inject } from 'vue';
import { ThemeKey, ApiKey } from './keys';
const theme = inject(ThemeKey);  // string | undefined
const api = inject(ApiKey);      // { base: string } | undefined
```

---

## provide 应用级

**app.provide 全局提供**
`app.provide(<key>, <value>);`
```typescript
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.provide('apiBase', import.meta.env.VITE_API_BASE);
app.provide('appName', 'FANDEX');
app.mount('#app');
```

**全局 config 注入**
```typescript
app.provide('config', {
  apiBase: '/api',
  cdnBase: 'https://cdn.example.com',
  timeout: 30000
});

// 任意组件
const config = inject('config');
```

---

## 默认值与工厂

**静态默认值**
```typescript
const theme = inject('theme', 'light');
const timeout = inject('timeout', 3000);
```

**工厂函数默认值**
`inject(<key>, <factory>, true);`
```typescript
// 第三个参数 true 表示第二个参数是工厂函数
const store = inject('store', () => createStore(), true);
const config = inject('config', () => ({}), true);
```

---

## 注入的响应性

**保持响应性(提供 ref)**
```typescript
import { provide, ref, inject } from 'vue';

// 父
const count = ref(0);
provide('count', count);

// 子(任意层级)
const count = inject<Ref<number>>('count');
count.value++;  // 修改会反映到所有注入处
```

**保持响应性(提供 reactive)**
```typescript
import { provide, reactive, inject } from 'vue';

// 父
const state = reactive({ count: 0 });
provide('state', state);

// 子
const state = inject<typeof state>('state');
state.count++;
```

---

## provide/inject 调试

**getCurrentInstance 查看注入链**
```typescript
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const provides = instance?.provides;
console.log(provides);
```

**useContext 模式**
```typescript
import { inject, provide, type InjectionKey } from 'vue';

export function createContext<T>(name: string) {
  const key: InjectionKey<T> = Symbol(name);

  const provideContext = (value: T) => provide(key, value);
  const useContext = (defaultValue?: T) => inject(key, defaultValue);

  return { provideContext, useContext, key };
}

// 使用
const { provideContext, useContext } = createContext<{ user: string }>('User');
provideContext({ user: 'Tom' });
const ctx = useContext();
```

---

## 完整示例

**主题切换 Provider**
```typescript
import { provide, inject, ref, readonly, computed, type InjectionKey, type Ref } from 'vue';

interface ThemeContext {
  theme: Readonly<Ref<'dark' | 'light'>>;
  isDark: Ref<boolean>;
  toggleTheme: () => void;
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme');

export function useThemeProvider() {
  const theme = ref<'dark' | 'light'>('dark');
  const isDark = computed(() => theme.value === 'dark');

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  const context: ThemeContext = {
    theme: readonly(theme),
    isDark,
    toggleTheme
  };

  provide(ThemeKey, context);
  return context;
}

export function useTheme() {
  const ctx = inject(ThemeKey);
  if (!ctx) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用');
  }
  return ctx;
}
```

**子组件消费**
```typescript
import { useTheme } from './theme';

const { theme, isDark, toggleTheme } = useTheme();
console.log(theme.value);    // 'dark' 或 'light'
console.log(isDark.value);   // true / false
toggleTheme();
```
