# 响应式 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 基础响应式

**ref 响应式引用**
`const <state> = ref(<initialValue>);`
```typescript
import { ref } from 'vue';
const count = ref(0);
const user = ref({ name: 'Tom' });

count.value++;
user.value.name = 'Jerry';
```

**reactive 对象响应式**
`const <state> = reactive(<object>);`
```typescript
import { reactive } from 'vue';
const state = reactive({
  count: 0,
  list: [],
  user: { name: 'Tom' }
});
state.count++;
state.list.push('item');
```

---

## 浅层响应式

**shallowRef 浅响应式引用**
`const <state> = shallowRef(<initialValue>);`
```typescript
import { shallowRef } from 'vue';
const obj = shallowRef({ count: 0 });
obj.value.count++;        // 不触发
obj.value = { count: 1 }; // 触发:整体替换
```

**shallowReactive 浅响应式对象**
`const <state> = shallowReactive(<object>);`
```typescript
import { shallowReactive } from 'vue';
const state = shallowReactive({
  nested: { count: 0 }
});
state.nested.count = 1;  // 不触发,只追踪顶层属性
```

**shallowReadonly 浅只读**
`const <state> = shallowReadonly(<object>);`
```typescript
import { shallowReadonly } from 'vue';
const state = shallowReadonly({
  nested: { count: 0 }
});
state.nested.count = 1;  // 允许(只读不递归)
state.foo = 'bar';       // 警告
```

---

## 只读与转换

**readonly 深只读**
`const <readonly> = readonly(<source>);`
```typescript
import { reactive, readonly } from 'vue';
const original = reactive({ count: 0, nested: { value: 1 } });
const frozen = readonly(original);
frozen.count = 1;          // 警告
frozen.nested.value = 2;   // 警告(深只读)
```

**markRaw 永久标记非响应**
`const <obj> = markRaw(<object>);`
```typescript
import { reactive, markRaw } from 'vue';
const state = reactive({});
state.classInstance = markRaw(new MyClass());
state.thirdPartyObj = markRaw(largeObject);
```

**toRaw 获取原始对象**
`const <raw> = toRaw(<proxy>);`
```typescript
import { reactive, toRaw } from 'vue';
const proxy = reactive({ count: 0 });
const raw = toRaw(proxy);
console.log(raw === proxy);  // false
```

---

## Ref 转换

**toRef 转换 reactive 属性为 ref**
`const <ref> = toRef(<source>, <key>);`
```typescript
import { reactive, toRef } from 'vue';
const state = reactive({ count: 0 });
const countRef = toRef(state, 'count');
countRef.value++;  // state.count 同步变化
```

**toRef 从 getter 创建**
`const <ref> = toRef(() => <expression>);`
```typescript
import { toRef } from 'vue';
const state = reactive({ user: { name: 'Tom' } });
const nameRef = toRef(() => state.user.name);
```

**toRefs 解构响应式对象**
`const { <key>, ... } = toRefs(<reactive>);`
```typescript
import { reactive, toRefs } from 'vue';
const state = reactive({ count: 0, name: 'Tom' });
const { count, name } = toRefs(state);
count.value++;
```

**unref 取值**
`const <value> = unref(<maybeRef>);`
```typescript
import { ref, unref } from 'vue';
const count = ref(0);
unref(count);  // 0
unref(123);    // 123
unref(undefined);  // undefined
```

---

## 类型守卫

**isRef 判断 ref**
```typescript
import { ref, isRef } from 'vue';
isRef(ref(0));       // true
isRef(0);            // false
isRef(reactive({})); // false
```

**isReactive 判断 reactive**
```typescript
import { reactive, isReactive } from 'vue';
isReactive(reactive({}));  // true
isReactive(ref({}));       // false
isReactive({});            // false
```

**isReadonly 判断只读**
```typescript
import { readonly, isReadonly } from 'vue';
isReadonly(readonly({}));  // true
```

**isProxy 判断代理**
```typescript
import { reactive, readonly, isProxy } from 'vue';
isProxy(reactive({}));   // true
isProxy(readonly({}));   // true
isProxy({});             // false
```

---

## 高级响应式

**customRef 自定义 ref**
`const <state> = customRef(<track>, <trigger>);`
```typescript
import { customRef } from 'vue';

function debouncedRef(value, delay = 200) {
  let timer;
  return customRef((track, trigger) => ({
    get() {
      track();
      return value;
    },
    set(newValue) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        value = newValue;
        trigger();
      }, delay);
    }
  }));
}

const text = debouncedRef('hello', 500);
```

**triggerRef 手动触发 shallowRef**
`triggerRef(<shallowRef>);`
```typescript
import { shallowRef, triggerRef } from 'vue';
const obj = shallowRef({ count: 0 });
obj.value.count = 1;
triggerRef(obj);  // 强制触发依赖
```

**effectScope 副作用作用域**
`const <scope> = effectScope();`
```typescript
import { effectScope, watchEffect } from 'vue';

const scope = effectScope();
scope.run(() => {
  watchEffect(() => console.log('effect 1'));
  watchEffect(() => console.log('effect 2'));
});
scope.stop();  // 停止内部所有 effect
```

**getCurrentScope 获取当前作用域**
```typescript
import { getCurrentScope } from 'vue';
const scope = getCurrentScope();
if (scope) {
  scope.run(() => { /* ... */ });
}
```

**onScopeDispose 作用域销毁时回调**
```typescript
import { onScopeDispose } from 'vue';
onScopeDispose(() => {
  console.log('scope disposed');
  cleanup();
});
```

---

## 响应式工具组合

**响应式工具综合示例**
```typescript
import { ref, reactive, computed, toRefs, watch } from 'vue';

function useCounter(initial = 0) {
  const state = reactive({
    count: initial,
    double: computed(() => state.count * 2)
  });

  function increment() {
    state.count++;
  }

  watch(() => state.count, (newVal) => {
    console.log('count changed:', newVal);
  });

  return { ...toRefs(state), increment };
}
```

**响应式数组操作**
```typescript
import { reactive } from 'vue';
const list = reactive<number[]>([]);
list.push(1, 2, 3);   // 触发更新
list.splice(0, 1);    // 触发更新
list[0] = 99;         // Vue 3 中可触发
list.length = 0;      // 触发更新
```

**响应式 Map/Set**
```typescript
import { reactive } from 'vue';
const map = reactive(new Map<string, number>());
map.set('a', 1);      // 触发更新
map.delete('a');      // 触发更新

const set = reactive(new Set<number>());
set.add(1);           // 触发更新
set.has(1);           // true
```
