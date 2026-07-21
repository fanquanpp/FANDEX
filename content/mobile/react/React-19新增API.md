# React 19 新 Hooks 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## useActionState 异步表单状态

**useActionState**
`const [<state>, <action>, [<isPending>]] = useActionState(<action>, <initialState>, [<permalink>]);`
```tsx
import { useActionState } from 'react';

async function increment(prev: number, formData: FormData) {
  return prev + Number(formData.get('step'));
}

function Counter() {
  const [count, action] = useActionState(increment, 0);
  return (
    <form action={action}>
      <input type="number" name="step" />
      <button>+</button>
      <span>{count}</span>
    </form>
  );
}
```

**带 pending 状态**
```tsx
const [state, action, isPending] = useActionState(submitAction, null);
```

---

## useFormStatus 表单提交状态

**useFormStatus**
`const { pending, data, method, action } = useFormStatus();`
```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  );
}
```

**完整字段**
```tsx
function DebugForm() {
  const { pending, data, method, action } = useFormStatus();
  // pending: boolean      是否提交中
  // data: FormData | null  表单数据
  // method: string        'post' | 'get'
  // action: Function      提交动作
  return <button disabled={pending}>Save</button>;
}
```

---

## useOptimistic 乐观更新

**useOptimistic**
`const [<optimisticState>, <addOptimistic>] = useOptimistic(<state>, <reducer>);`
```tsx
import { useOptimistic } from 'react';

function ThumbsUp({ likes }: { likes: number }) {
  const [optimisticLikes, addOptimistic] = useOptimistic(
    likes,
    (state, delta: number) => state + delta
  );

  const onClick = async () => {
    addOptimistic(1);
    await fetch('/api/like', { method: 'POST' });
  };

  return <button onClick={onClick}>{optimisticLikes}</button>;
}
```

**乐观消息列表**
```tsx
const [messages, addMessage] = useOptimistic(
  realMessages,
  (state, newMsg: Message) => [...state, { ...newMsg, status: 'pending' }]
);

async function send(text: string) {
  addMessage({ id: Date.now(), text });
  await api.post(text);
}
```

---

## use 读取资源

**use(promise)**
`const <value> = use(<promise>);`
```tsx
import { use } from 'react';

function User({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}
```

**use(context)**
`const <value> = use(<Context>);`
```tsx
import { use } from 'react';

function Header() {
  const theme = use(ThemeContext);
  return <header className={theme}>...</header>;
}
```

**use 在条件中**
```tsx
function Comments({ show, commentsPromise }: Props) {
  if (show) {
    const comments = use(commentsPromise);
    return <List comments={comments} />;
  }
  return null;
}
```

---

## ref 作为 props

**ref 直接传递**
`<Component ref={<ref>} />`
```tsx
function Input({ ref }: { ref: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} />;
}

const ref = useRef<HTMLInputElement>(null);
<Input ref={ref} />;
```

---

## forwardRef 兼容签名

**forwardRef 类型签名变化**
`const <Component> = forwardRef<<T>, <Props>>((<props>, <ref>) => <JSX.Element>);`
```tsx
const Input = forwardRef<HTMLInputElement, Props>(
  ({ placeholder }, ref) => <input ref={ref} placeholder={placeholder} />
);
```

---

## ref 回调清理函数

**ref 回调返回清理函数**
`ref={(<el>) => { return () => <cleanup>; }}`
```tsx
<div ref={(el) => {
  if (el) observe(el);
  return () => unobserve(el);
}} />
```

---

## Document Metadata

**原生 metadata 标签**
`<title>` / `<meta>` / `<link>`
```tsx
function Page() {
  return (
    <>
      <title>用户中心</title>
      <meta name="description" content="用户信息管理" />
      <link rel="canonical" href="/users" />
    </>
  );
}
```

---

## 资源加载 API

**preload 预加载**
`preload(<href>, <options>);`
```tsx
import { preload } from 'react-dom';
preload('/fonts/inter.woff2', { as: 'font' });
```

**preinit 预初始化**
`preinit(<href>, <options>);`
```tsx
import { preinit } from 'react-dom';
preinit('/css/style.css', { as: 'style' });
```

**preconnect 预连接**
`preconnect(<href>, <options>);`
```tsx
import { preconnect } from 'react-dom';
preconnect('https://cdn.example.com');
```
