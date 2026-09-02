## 前置知识

- [组件与 Props](/react/002-ComponentProps)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. useState」的核心机制、典型用法与常见陷阱
- 掌握「2. useReducer」的核心机制、典型用法与常见陷阱
- 掌握「3. 事件处理」的核心机制、典型用法与常见陷阱
- 掌握「4. 表单处理」的核心机制、典型用法与常见陷阱
- 掌握「5. 状态提升」的核心机制、典型用法与常见陷阱


## 1. useState

`useState` 是最基础的 Hook，用于在函数组件中声明状态变量。

### 1.1 基本用法

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>当前计数：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
    </div>
  );
}
```

### 1.2 函数式更新

当新状态依赖前一个状态时，应使用函数式更新，避免闭包陷阱：

```tsx
//  错误：快速连续点击可能丢失更新
const increment = () => setCount(count + 1);

//  正确：使用函数式更新
const increment = () => setCount((prev) => prev + 1);

// 批量更新
const resetAndAdd = () => {
  setCount(0); // 重置为 0
  setCount((prev) => prev + 1); // 在 0 的基础上 +1，结果为 1
};
```

### 1.3 惰性初始化

当初始状态需要昂贵计算时，传入函数避免重复计算：

```tsx
//  每次渲染都会执行 createInitialState
const [state, setState] = useState(createInitialState());

//  只在首次渲染时执行
const [state, setState] = useState(() => createInitialState());

// 示例：从 localStorage 读取
const [theme, setTheme] = useState(() => {
  const saved = localStorage.getItem('theme');
  return saved ?? 'light';
});
```

### 1.4 对象状态更新

```tsx
interface UserState {
  name: string;
  age: number;
  email: string;
}

function UserProfile() {
  const [user, setUser] = useState<UserState>({
    name: '',
    age: 0,
    email: '',
  });

  // 必须展开旧状态，否则会丢失其他字段
  const updateName = (name: string) => {
    setUser((prev) => ({ ...prev, name }));
  };

  // 使用 Immer 简化不可变更新
  // npm install immer
  import { produce } from 'immer';
  const updateAge = (age: number) => {
    setUser(
      produce((draft) => {
        draft.age = age;
      })
    );
  };

  return <div>...</div>;
}
```

## 2. useReducer

`useReducer` 是 `useState` 的替代方案，适合管理复杂状态逻辑。

### 2.1 基本用法

```tsx
import { useReducer } from 'react';

interface State {
  count: number;
}

type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'reset'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: action.payload };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div>
      <p>计数：{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-1</button>
      <button onClick={() => dispatch({ type: 'reset', payload: 0 })}>重置</button>
    </div>
  );
}
```

### 2.2 复杂状态管理示例

```tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type TodoAction =
  | { type: 'add'; text: string }
  | { type: 'toggle'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'edit'; id: string; text: string };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add':
      return [...state, { id: crypto.randomUUID(), text: action.text, completed: false }];
    case 'toggle':
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, completed: !todo.completed } : todo
      );
    case 'delete':
      return state.filter((todo) => todo.id !== action.id);
    case 'edit':
      return state.map((todo) => (todo.id === action.id ? { ...todo, text: action.text } : todo));
    default:
      return state;
  }
}

function TodoApp() {
  const [todos, dispatch] = useReducer(todoReducer, []);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      dispatch({ type: 'add', text: input.trim() });
      setInput('');
    }
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleAdd}>添加</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span
              style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
              onClick={() => dispatch({ type: 'toggle', id: todo.id })}
            >
              {todo.text}
            </span>
            <button onClick={() => dispatch({ type: 'delete', id: todo.id })}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2.3 useState vs useReducer

| 场景                 | 推荐         | 原因                    |
| :------------------- | :----------- | :---------------------- |
| 简单独立状态         | `useState`   | 代码更简洁              |
| 多个关联状态         | `useReducer` | 逻辑集中，易于维护      |
| 下一个状态依赖前一个 | `useReducer` | 避免状态更新链          |
| 需要可预测的状态转换 | `useReducer` | 纯函数 reducer 易于测试 |

## 3. 事件处理

### 3.1 基本事件

```tsx
function EventDemo() {
  // 点击事件
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('点击', e.currentTarget);
  };

  // 输入事件
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('输入值：', e.target.value);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('回车键');
    }
  };

  // 表单提交
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('表单提交');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} onKeyDown={handleKeyDown} />
      <button type="submit" onClick={handleClick}>
        提交
      </button>
    </form>
  );
}
```

### 3.2 传递参数

```tsx
function ItemList({ items }: { items: { id: string; name: string }[] }) {
  // 方式一：箭头函数包装
  const handleDelete = (id: string) => {
    console.log('删除：', id);
  };

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name}
          <button onClick={() => handleDelete(item.id)}>删除</button>
        </li>
      ))}
    </ul>
  );
}
```

### 3.3 事件委托

React 17+ 事件委托到根节点而非 document，避免了与第三方库的冲突。

## 4. 表单处理

### 4.1 受控组件

表单元素的值由 React 状态控制：

```tsx
function LoginForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交数据：', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="用户名"
      />
      <input
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="密码"
      />
      <label>
        <input
          name="remember"
          type="checkbox"
          checked={formData.remember}
          onChange={handleChange}
        />
        记住我
      </label>
      <button type="submit">登录</button>
    </form>
  );
}
```

### 4.2 非受控组件

使用 `ref` 直接访问 DOM 值：

```tsx
import { useRef } from 'react';

function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('输入值：', inputRef.current?.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="默认值" />
      <button type="submit">提交</button>
    </form>
  );
}
```

### 4.3 受控 vs 非受控

| 特性         | 受控组件     | 非受控组件         |
| :----------- | :----------- | :----------------- |
| 数据源       | React state  | DOM                |
| 实时验证     | 支持         | 不便               |
| 条件禁用提交 | 支持         | 不便               |
| 代码量       | 较多         | 较少               |
| 适用场景     | 需要即时反馈 | 简单表单、文件上传 |

## 5. 状态提升

当多个组件需要共享状态时，将状态提升到最近的共同父组件。

```tsx
function TemperatureInput({
  temperature,
  onTemperatureChange,
}: {
  temperature: string;
  onTemperatureChange: (value: string) => void;
}) {
  return <input value={temperature} onChange={(e) => onTemperatureChange(e.target.value)} />;
}

function Calculator() {
  const [celsius, setCelsius] = useState('');
  const [fahrenheit, setFahrenheit] = useState('');

  const handleCelsiusChange = (value: string) => {
    setCelsius(value);
    setFahrenheit(value ? ((parseFloat(value) * 9) / 5 + 32).toString() : '');
  };

  const handleFahrenheitChange = (value: string) => {
    setFahrenheit(value);
    setCelsius(value ? (((parseFloat(value) - 32) * 5) / 9).toString() : '');
  };

  return (
    <div>
      <label>摄氏度：</label>
      <TemperatureInput temperature={celsius} onTemperatureChange={handleCelsiusChange} />
      <label>华氏度：</label>
      <TemperatureInput temperature={fahrenheit} onTemperatureChange={handleFahrenheitChange} />
    </div>
  );
}
```

## 6. 状态管理模式

### 6.1 状态分类

| 类型           | 说明                 | 示例               |
| :------------- | :------------------- | :----------------- |
| **UI 状态**    | 组件内部展示状态     | 模态框开关、选中项 |
| **应用状态**   | 全局共享的业务数据   | 用户信息、购物车   |
| **服务端状态** | 来自后端的数据       | API 响应、缓存     |
| **URL 状态**   | 路由参数和查询字符串 | 页码、筛选条件     |

### 6.2 状态放置原则

1. **能放局部就不提升** — 仅组件内部使用的状态不要提升
2. **能放 URL 就不放状态** — 分页、筛选等适合放在 URL 中
3. **服务端状态用专门库管理** — React Query / SWR
4. **全局状态用状态管理库** — Zustand / Jotai / Redux Toolkit

### 6.3 React 19 中的 Actions

React 19 引入了 Actions 概念，简化了异步状态管理：

```tsx
import { useActionState } from 'react';

async function submitForm(prevState: string, formData: FormData) {
  const name = formData.get('name') as string;
  // 模拟异步操作
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!name.trim()) {
    return '请输入姓名';
  }
  return '提交成功！';
}

function Form() {
  const [message, submitAction, isPending] = useActionState(submitForm, '');

  return (
    <form action={submitAction}>
      <input name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```
## useState 状态钩子

**useState 基础用法**
`const [<state>, <setState>] = useState(<initialValue>);`
```tsx
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(prev => prev + 1);
```

**useState 类型推断**
`const [<state>, <setState>] = useState<<T>>(<initialValue>);`
```tsx
const [user, setUser] = useState<User | null>(null);
const [tags, setTags] = useState<string[]>([]);
```

**useState 函数式初始化**
`useState(() => <initialValue>);`
```tsx
const [data] = useState(() => loadFromLocalStorage());
```

---

## 事件类型

**ChangeEvent 表单变更事件**
`(e: React.ChangeEvent<<Element>>) => void`
```tsx
function Input() {
  const [value, setValue] = useState('');
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };
  return <input value={value} onChange={onChange} />;
}
```

**ChangeEvent<HTMLTextAreaElement>**
```tsx
const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setText(e.target.value);
};
```

**ChangeEvent<HTMLSelectElement>**
```tsx
const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setSelect(e.target.value);
};
```

**MouseEvent 鼠标事件**
`(e: React.MouseEvent<<Element>>) => void`
```tsx
function Btn() {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log(e.currentTarget);
  };
  return <button onClick={onClick}>Click</button>;
}
```

**MouseEvent 元素类型**
```tsx
const onDivClick: React.MouseEventHandler<HTMLDivElement> = (e) => {};
const onSpanClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {};
```

**KeyboardEvent 键盘事件**
`(e: React.KeyboardEvent<<Element>>) => void`
```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};
```

**FocusEvent 焦点事件**
`(e: React.FocusEvent<<Element>>) => void`
```tsx
const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  console.log(e.target);
};
```

**SubmitEvent 表单提交(原生)**
`(e: React.FormEvent<<FormElement>>) => void`
```tsx
function Form() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    console.log(Object.fromEntries(formData));
  };
  return <form onSubmit={onSubmit}>...</form>;
}
```

---

## 事件处理器类型

**EventHandler 类型别名**
`type <Handler> = React.ChangeEventHandler<<Element>>;`
```tsx
type InputChange = React.ChangeEventHandler<HTMLInputElement>;
const handle: InputChange = (e) => setValue(e.target.value);
```

**事件泛型**
`React.SyntheticEvent<<Element>>`
```tsx
function handle(e: React.SyntheticEvent<HTMLFormElement>) {
  e.preventDefault();
}
```

**ClipboardEvent 剪贴板事件**
```tsx
const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  const text = e.clipboardData.getData('text');
};
```

**DragEvent 拖拽事件**
```tsx
const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
  const files = e.dataTransfer.files;
};
```

**WheelEvent 滚轮事件**
```tsx
const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
  if (e.deltaY > 0) scrollDown();
};
```

---

## 事件对象属性

**target vs currentTarget**
`e.target` / `e.currentTarget`
```tsx
const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.target;        // 触发事件的元素(可能是子元素)
  e.currentTarget; // 绑定事件的元素
};
```

**鼠标坐标**
`e.clientX` / `e.clientY` / `e.pageX` / `e.pageY`
```tsx
const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const { clientX, clientY } = e;
};
```

**按键信息**
`e.key` / `e.code` / `e.altKey` / `e.ctrlKey`
```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Escape') close();
  if (e.ctrlKey && e.key === 's') save();
};
```

---

## 内联事件处理器

**内联箭头函数**
`<button onClick={() => <fn>(<arg>)}>`
```tsx
<button onClick={() => deleteItem(id)}>删除</button>
```

**useCallback 包装**
`const <handler> = useCallback((<e>) => <fn>, [<deps>]);`
```tsx
const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  onClick(id);
}, [id, onClick]);
```
