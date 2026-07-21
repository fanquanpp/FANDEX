# 核心 Hooks 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## useState 状态钩子

**useState**
`const [<state>, <setState>] = useState(<initialValue>);`
```tsx
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(prev => prev + 1);
```

**useState 泛型**
`const [<state>, <setState>] = useState<<T>>(<initialValue>);`
```tsx
const [user, setUser] = useState<User | null>(null);
```

---

## useEffect 副作用钩子

**useEffect 基础**
`useEffect(() => { [<cleanup>] }, [<deps>]);`
```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

**useEffect 依赖数组**
```tsx
useEffect(() => {
  fetchUser(id);
}, [id]);

useEffect(() => {
  syncToLocalStorage(data);
}, [data]);
```

---

## useRef 引用钩子

**useRef 可变引用**
`const <ref> = useRef<<T>>(<initialValue>);`
```tsx
const countRef = useRef(0);
countRef.current++;
```

**useRef DOM 引用**
`const <ref> = useRef<<Element>>(null);`
```tsx
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => inputRef.current?.focus(), []);
<input ref={inputRef} />;
```

---

## useMemo 计算缓存

**useMemo**
`const <value> = useMemo(() => <compute>, [<deps>]);`
```tsx
const sorted = useMemo(() => list.sort(), [list]);
const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
```

---

## useCallback 函数缓存

**useCallback**
`const <handler> = useCallback((<args>) => <fn>, [<deps>]);`
```tsx
const handleClick = useCallback((id: string) => {
  select(id);
}, [select]);
```

---

## useContext 上下文钩子

**useContext**
`const <value> = useContext<<T>>(<Context>);`
```tsx
const theme = useContext(ThemeContext);
const user = useContext(UserContext) as User;
```

---

## useReducer 复杂状态

**useReducer**
`const [<state>, <dispatch>] = useReducer(<reducer>, <initialState>, [<init>]);`
```tsx
type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' };

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'inc': return { count: state.count + 1 };
    case 'dec': return { count: state.count - 1 };
  }
};

const [state, dispatch] = useReducer(reducer, { count: 0 });
dispatch({ type: 'inc' });
```

**useReducer 惰性初始化**
`useReducer(<reducer>, <initialArgs>, <init>);`
```tsx
const [state, dispatch] = useReducer(reducer, { count: 0 }, (init) => ({
  count: init.count * 2,
}));
```

---

## useImperativeHandle 暴露方法

**useImperativeHandle**
`useImperativeHandle(<ref>, () => <handle>, [<deps>]);`
```tsx
const FancyInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { if (inputRef.current) inputRef.current.value = ''; },
  }), []);
  return <input ref={inputRef} />;
});
```

---

## useLayoutEffect 同步布局

**useLayoutEffect**
`useLayoutEffect(() => { [<cleanup>] }, [<deps>]);`
```tsx
useLayoutEffect(() => {
  const rect = el.getBoundingClientRect();
  setOffset(rect.top);
}, [el]);
```

---

## useTransition 过渡更新

**useTransition**
`const [<isPending>, <startTransition>] = useTransition();`
```tsx
const [isPending, startTransition] = useTransition();

const handleTab = (tab: string) => {
  startTransition(() => {
    setActiveTab(tab);
  });
};
```

---

## useDeferredValue 延迟值

**useDeferredValue**
`const <deferredValue> = useDeferredValue(<value>);`
```tsx
const deferredQuery = useDeferredValue(query);
const filtered = useMemo(() => filter(deferredQuery), [deferredQuery]);
```

---

## useId 唯一标识

**useId**
`const <id> = useId();`
```tsx
const id = useId();
<label htmlFor={id}>Email</label>
<input id={id} type="email" />
```

**useId 前缀**
```tsx
const id = useId();
const emailId = `${id}-email`;
const passwordId = `${id}-password`;
```
