---
order: 52
title: 自定义指令进阶
module: vue3
category: Vue3
difficulty: intermediate
description: 自定义指令高级用法
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/组合式API
  - vue3/Provide与Inject
  - vue3/Transition与动画
  - vue3/Vue3编译优化
prerequisites:
  - vue3/语法速查
---

## 1. 指令钩子

```javascript
const myDirective = {
  created(el, binding, vnode) {},
  beforeMount(el, binding) {},
  mounted(el, binding) {},
  beforeUpdate(el, binding) {},
  updated(el, binding) {},
  beforeUnmount(el, binding) {},
  unmounted(el, binding) {},
};
```

## 2. 钩子参数

```typescript
interface Binding {
  value: any; // 指令绑定的值
  oldValue: any; // 前一个值
  arg: string; // 指令参数 v-my:arg
  modifiers: Record<string, boolean>; // 修饰符 v-my.foo.bar
  instance: ComponentPublicInstance; // 组件实例
}
```

## 3. 实用指令示例

```javascript
// v-focus
const vFocus = {
  mounted(el) {
    el.focus();
  },
};

// v-permission
const vPermission = {
  mounted(el, binding) {
    const permissions = usePermissions();
    if (!permissions.has(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  },
};

// v-debounce
const vDebounce = {
  mounted(el, binding) {
    let timer;
    el.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => binding.value(), binding.arg ? parseInt(binding.arg) : 300);
    });
  },
};

// v-click-outside
const vClickOutside = {
  mounted(el, binding) {
    const handler = (e) => {
      if (!el.contains(e.target)) binding.value(e);
    };
    el._clickOutside = handler;
    document.addEventListener('click', handler);
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
  },
};

// v-lazy 图片懒加载
const vLazy = {
  mounted(el, binding) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.src = binding.value;
        observer.disconnect();
      }
    });
    observer.observe(el);
    el._observer = observer;
  },
  unmounted(el) {
    el._observer?.disconnect();
  },
};
```

## 4. 简写形式

```javascript
// 当 mounted 和 updated 行为相同时
const vColor = (el, binding) => {
  el.style.color = binding.value;
};
```
