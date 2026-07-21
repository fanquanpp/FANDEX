# Context API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## createContext 创建上下文

**createContext**
`const <Context> = createContext<<T>>(<defaultValue>);`
```tsx
import { createContext } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<Theme>('light');
```

**带 undefined 的 Context**
`const <Context> = createContext<<T> | undefined>(undefined);`
```tsx
const UserContext = createContext<User | undefined>(undefined);
```

---

## Provider 提供者

**Provider**
`<Context.Provider value={<value>}>...</Context.Provider>`
```tsx
function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}
```

**嵌套 Provider**
```tsx
<ThemeContext.Provider value={theme}>
  <UserContext.Provider value={user}>
    <Router>
      <App />
    </Router>
  </UserContext.Provider>
</ThemeContext.Provider>
```

---

## Consumer 消费者

**Consumer**
`<Context.Consumer>{(<value>) => <node>}</Context.Consumer>`
```tsx
<ThemeContext.Consumer>
  {(theme) => <div className={theme}>...</div>}
</ThemeContext.Consumer>
```

---

## useContext 钩子

**useContext**
`const <value> = useContext<<T>>(<Context>);`
```tsx
import { useContext } from 'react';

function Header() {
  const theme = useContext(ThemeContext);
  return <header className={theme}>...</header>;
}
```

**带 undefined 校验**
`const <value> = useContext(<Context>); if (!value) throw <error>;`
```tsx
function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error('useUser must be used within UserProvider');
  return user;
}
```

---

## Context 类型签名

**Context 类型别名**
`type <Ctx> = React.Context<<T>>;`
```tsx
type ThemeCtx = React.Context<Theme>;
const ctx: ThemeCtx = ThemeContext;
```

**ProviderProps**
`React.ProviderProps<<T>>`
```tsx
function Provider({ value, children }: React.ProviderProps<Theme>) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

---

## useReducer + Context 模式

**Context + Reducer 组合**
```tsx
type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' };

const CountContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

function CountProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <CountContext.Provider value={{ state, dispatch }}>
      {children}
    </CountContext.Provider>
  );
}

function useCount() {
  const ctx = useContext(CountContext);
  if (!ctx) throw new Error('useCount must be inside CountProvider');
  return ctx;
}
```

---

## Context 默认值

**默认值**
`createContext(<defaultValue>);`
```tsx
const NotificationContext = createContext<{ show: (msg: string) => void }>({
  show: () => {},
});
```

---

## displayName 调试名

**displayName**
`<Context>.displayName = <name>;`
```tsx
const ThemeContext = createContext<Theme>('light');
ThemeContext.displayName = 'ThemeContext';
```
