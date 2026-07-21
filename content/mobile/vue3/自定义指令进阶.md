# 自定义指令 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 指令对象定义

**完整钩子对象**
```typescript
import type { Directive } from 'vue';

const vMyDirective: Directive<HTMLElement, string> = {
  // 在绑定元素的 attribute 或事件监听器被应用之前调用
  created(el, binding, vnode, prevVnode) {},

  // 在元素被插入到 DOM 前调用
  beforeMount(el, binding, vnode, prevVnode) {},

  // 在绑定元素的父组件及其所有子节点都挂载完成后调用
  mounted(el, binding, vnode, prevVnode) {},

  // 父组件更新前调用
  beforeUpdate(el, binding, vnode, prevVnode) {},

  // 在绑定元素的父组件及其所有子节点都更新完成后调用
  updated(el, binding, vnode, prevVnode) {},

  // 卸载绑定元素的父组件前调用
  beforeUnmount(el, binding, vnode, prevVnode) {},

  // 卸载绑定元素的父组件后调用
  unmounted(el, binding, vnode, prevVnode) {}
};
```

**简写形式**
```typescript
const vFocus: Directive = (el, binding) => {
  // mounted 和 updated 时都触发
  if (binding.value) {
    el.focus();
  }
};
```

---

## 指令钩子参数

**binding 对象**
```typescript
interface DirectiveBinding<V> {
  value: V;            // 指令绑定的值
  oldValue: V | null;  // 前一个值(仅在 beforeUpdate/updated 中可用)
  arg: string;         // 指令参数 v-my:foo -> 'foo'
  modifiers: Record<string, boolean>;  // 修饰符 v-my.foo.bar -> { foo: true, bar: true }
  instance: any;       // 使用该指令的组件实例
  dir: Object;         // 指令定义对象本身
}

function mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
  console.log(binding.value);       // 'hello'
  console.log(binding.arg);         // 'color'
  console.log(binding.modifiers);   // { delay: true }
  console.log(binding.instance);    // 组件实例
}
```

**vnode 与 prevVnode**
```typescript
import type { VNode } from 'vue';

function mounted(el, binding, vnode: VNode, prevVnode: VNode | null) {
  // vnode: 当前虚拟节点
  // prevVnode: 前一个虚拟节点(更新钩子中)
}
```

---

## 注册指令

**局部注册**
```vue
<script setup>
import type { Directive } from 'vue';

const vFocus: Directive<HTMLElement> = {
  mounted(el) {
    el.focus();
  }
};
// 直接以 v 开头的变量会自动注册为指令 v-focus
</script>

<template>
  <input v-focus />
</template>
```

**全局注册**
```typescript
import { createApp } from 'vue';

const app = createApp(App);

app.directive('focus', {
  mounted(el) {
    el.focus();
  }
});

app.directive('color', (el, binding) => {
  el.style.color = binding.value;
});
```

**注册到组件**
```typescript
defineOptions({
  directives: {
    focus: {
      mounted(el: HTMLElement) {
        el.focus();
      }
    }
  }
});
```

---

## 指令参数与修饰符

**指令参数 arg**
```vue
<template>
  <div v-my:color="'red'"></div>
  <div v-my:background="'blue'"></div>
</template>

<script setup>
const vMy: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    if (binding.arg === 'color') {
      el.style.color = binding.value;
    } else if (binding.arg === 'background') {
      el.style.background = binding.value;
    }
  }
};
</script>
```

**指令修饰符 modifiers**
```vue
<template>
  <div v-my.red.bold="text"></div>
</template>

<script setup>
const vMy: Directive = {
  mounted(el, binding) {
    if (binding.modifiers.red) el.style.color = 'red';
    if (binding.modifiers.bold) el.style.fontWeight = 'bold';
    el.textContent = binding.value;
  }
};
</script>
```

**动态参数**
```vue
<template>
  <div v-my:[direction]="'red'"></div>
</template>

<script setup>
import { ref } from 'vue';
const direction = ref('color');
</script>
```

---

## 实用指令示例

**v-focus 自动聚焦**
```typescript
import type { Directive } from 'vue';

const vFocus: Directive<HTMLElement> = {
  mounted(el) {
    el.focus();
  }
};
```

**v-permission 权限控制**
```typescript
import type { Directive } from 'vue';

const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const userRoles = getUserRoles();
    const required = binding.value;
    const roles = Array.isArray(required) ? required : [required];

    const hasPermission = roles.some(r => userRoles.includes(r));
    if (!hasPermission) {
      el.parentNode?.removeChild(el);
    }
  }
};
```
```vue
<button v-permission="'admin'">删除</button>
<div v-permission="['admin', 'editor']">管理面板</div>
```

**v-debounce 防抖**
```typescript
import type { Directive } from 'vue';

const vDebounce: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    let timer: number | undefined;
    el.addEventListener('click', () => {
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        binding.value();
      }, 500);
    });
  }
};
```

**v-loading 加载指令**
```typescript
import type { Directive } from 'vue';

const vLoading: Directive<HTMLElement, boolean> = {
  mounted(el, binding) {
    el.style.position = 'relative';
    if (binding.value) createMask(el);
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      binding.value ? createMask(el) : removeMask(el);
    }
  }
};

function createMask(el: HTMLElement) {
  const mask = document.createElement('div');
  mask.className = 'loading-mask';
  mask.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.5);';
  mask.dataset.role = 'loading';
  el.appendChild(mask);
}

function removeMask(el: HTMLElement) {
  el.querySelector('[data-role="loading"]')?.remove();
}
```

**v-longpress 长按**
```typescript
import type { Directive } from 'vue';

const vLongpress: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    let timer: number | undefined;

    const start = () => {
      timer = window.setTimeout(() => binding.value(), 800);
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('touchstart', start);
    el.addEventListener('touchend', cancel);

    el._cleanup = () => {
      el.removeEventListener('mousedown', start);
      el.removeEventListener('mouseup', cancel);
      el.removeEventListener('mouseleave', cancel);
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', cancel);
    };
  },
  unmounted(el) {
    el._cleanup?.();
  }
};
```

---

## 在 TS 中扩展

**自定义指令类型扩展**
```typescript
declare module 'vue' {
  interface ComponentCustomProperties {
    vPermission: Directive<HTMLElement, string | string[]>;
    vDebounce: Directive<HTMLElement, () => void>;
  }
}
```

---

## TypeScript 完整示例

```typescript
import { createApp, type Directive, type DirectiveBinding } from 'vue';

interface RippleOptions {
  color?: string;
  duration?: number;
}

const vRipple: Directive<HTMLElement, RippleOptions | undefined> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RippleOptions | undefined>) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';

    el.addEventListener('click', (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${binding.value?.color || 'rgba(255,255,255,0.5)'};
        border-radius: 50%;
        transform: scale(0);
        animation: ripple ${binding.value?.duration || 600}ms ease-out;
        pointer-events: none;
      `;
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), binding.value?.duration || 600);
    });
  }
};

const app = createApp(App);
app.directive('ripple', vRipple);
```
