# createApp 应用入口 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 应用创建

**createApp 创建应用实例**
`const <app> = createApp(<rootComponent>);`
```typescript
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
```

**根组件直接对象定义**
`createApp({ setup() | data() | template | render })`
```typescript
const app = createApp({
  data() {
    return { msg: 'Hello' };
  },
  template: '<div>{{ msg }}</div>'
});
```

---

## 应用配置

**app.use 安装插件**
`app.use(<plugin>, [options]);`
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(myPlugin, { optionKey: 'value' });
```

**app.component 全局组件注册**
`app.component(<name>, <component>);`
```typescript
app.component('MyButton', {
  template: '<button><slot/></button>'
});
app.component('MyComp', () => import('./MyComp.vue'));
```

**app.directive 全局指令注册**
`app.directive(<name>, <directive>);`
```typescript
app.directive('focus', {
  mounted(el) {
    el.focus();
  }
});
```

**app.mixin 全局混入(不推荐)**
`app.mixin(<mixin>);`
```typescript
app.mixin({
  created() {
    console.log('global mixin created');
  }
});
```

**app.provide 全局依赖注入**
`app.provide(<key>, <value>);`
```typescript
app.provide('theme', 'dark');
app.provide(Symbol('config'), { apiBase: '/api' });
```

---

## 应用挂载

**app.mount 挂载应用**
`app.mount(<container>);`
```typescript
app.mount('#app');
app.mount(document.getElementById('app'));
```

**app.unmount 卸载应用**
`app.unmount();`
```typescript
const app = createApp(App);
app.mount('#app');
setTimeout(() => app.unmount(), 5000);
```

---

## 应用上下文

**app.config 全局配置**
`app.config.<key> = <value>;`
```typescript
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err, info);
};
app.config.warnHandler = (msg, instance, trace) => {
  console.warn(msg);
};
app.config.globalProperties.$format = (v) => v.toFixed(2);
app.config.performance = true;
app.config.silent = false;
```

**app.version 获取 Vue 版本**
```typescript
console.log(app.version);
```

**app.runWithContext 在应用上下文中执行**
`const <result> = app.runWithContext(<callback>);`
```typescript
const result = app.runWithContext(() => {
  return inject('theme');
});
```

---

## 应用链式调用

**链式注册与挂载**
```typescript
createApp(App)
  .use(createPinia())
  .use(router)
  .directive('focus', { mounted: (el) => el.focus() })
  .provide('apiBase', '/api')
  .mount('#app');
```
