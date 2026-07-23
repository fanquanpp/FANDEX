# createApp/root API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 应用入口 API

**createRoot 创建根容器**
`const <root> = createRoot(<container>, [<options>]);`
```tsx
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

**root.render 渲染节点**
`root.render(<node>);`
```tsx
root.render(<App />);
root.render(null); // 卸载等价
```

**root.unmount 卸载根**
`root.unmount();`
```tsx
root.unmount();
```

---

## 水合 API

**hydrateRoot 服务端 HTML 水合**
`const <root> = hydrateRoot(<container>, <initialChildren>, [<options>]);`
```tsx
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

hydrateRoot(document.getElementById('root')!, <App />);
```

**hydrateOptions 水合选项**
`{ onRecoverableError?: <errorHandler>, identifierPrefix?: <string> }`
```tsx
hydrateRoot(container, <App />, {
  onRecoverableError: (error) => console.error(error),
  identifierPrefix: 'app-',
});
```

---

## 严格模式

**StrictMode 严格模式组件**
`<StrictMode>...</StrictMode>`
```tsx
import { StrictMode } from 'react';

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## createRoot 选项

**createRoot options**
`{ onRecoverableError?: <handler>, identifierPrefix?: <string>, onCaughtError?: <handler>, onUncaughtError?: <handler> }`
```tsx
createRoot(container, {
  onCaughtError: (error, info) => console.warn(error, info.componentStack),
  onUncaughtError: (error) => console.error(error),
  identifierPrefix: 'fandex-',
});
```

---

## flushSync 同步刷新

**flushSync 强制同步刷新**
`flushSync(<callback>);`
```tsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);
});
```
