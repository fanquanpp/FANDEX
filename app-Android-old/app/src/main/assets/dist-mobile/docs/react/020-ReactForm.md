## 前置知识

- [React 错误边界](/react/019-ReactErrorBoundary)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

受控组件与非受控组件。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React表单处理。

## 基础概念

React表单处理涉及以下核心概念：

- **核心原理**：理解React表单处理的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React表单处理，何时选择其他方案

```jsx
// React表单处理的基本结构示例
function Example() {
  return <div>React表单处理示例</div>;
}
```

## 快速上手

### 安装与配置

```bash
# 安装相关依赖
npm install react react-dom
```

### 基本使用

```jsx
import { useState, useEffect } from 'react';

// React表单处理的最简示例
function BasicExample() {
  const [value, setValue] = useState('');
  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <p>当前值: {value}</p>
    </div>
  );
}
```

## 详细用法

### 核心功能

```jsx
// React表单处理的核心功能演示
function DetailedExample() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 数据获取
  useEffect(() => {
    setLoading(true);
    fetchData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>加载中...</div>;
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 配置选项

```jsx
// 常用配置选项
const config = {
  timeout: 5000, // 超时时间
  retries: 3, // 重试次数
  cache: true, // 启用缓存
  debug: false, // 调试模式
};
```

### 与其他功能集成

```jsx
// React表单处理与 React 生态集成
import { useQuery, useMutation } from '@tanstack/react-query';

function IntegratedExample() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  const mutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      /* 刷新数据 */
    },
  });

  if (isLoading) return <div>加载中...</div>;
  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## 常见场景

### 场景一：数据处理

```jsx
function DataProcessor() {
  const [items, setItems] = useState([]);

  // 过滤和排序
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <ul>
      {processedItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 场景二：表单处理

```jsx
function FormExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('提交:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <input name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">提交</button>
    </form>
  );
}
```

### 场景三：错误处理

```jsx
function ErrorHandlingExample() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div role="alert">
        <h2>出错了</h2>
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>重试</button>
      </div>
    );
  }

  return <Content onError={setError} />;
}
```

## 注意事项

- 使用React表单处理时需要注意性能影响，避免不必要的重渲染
- 在生产环境中应正确处理错误和异常情况
- 注意浏览器兼容性，必要时使用 polyfill
- 遵循 React 的最佳实践，保持组件的纯函数特性
- 注意内存泄漏，在 useEffect 的清理函数中取消订阅和定时器
- 大型列表应使用虚拟化方案（如 react-window）避免性能问题
- 服务端渲染场景需要确保代码在 Node.js 环境中可运行

## 进阶用法

### 性能优化

```jsx
import { memo, useMemo, useCallback } from 'react';

// 使用 memo 避免不必要的重渲染
const OptimizedComponent = memo(function OptimizedComponent({ data, onClick }) {
  return <div onClick={onClick}>{data.name}</div>;
});

function Parent() {
  const [items, setItems] = useState([]);

  // 使用 useCallback 缓存回调
  const handleClick = useCallback((id) => {
    console.log('点击:', id);
  }, []);

  // 使用 useMemo 缓存计算结果
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active);
  }, [items]);

  return (
    <div>
      {processedItems.map((item) => (
        <OptimizedComponent key={item.id} data={item} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
}
```

### 自定义 Hook 封装

```jsx
function useCustomHook(initialValue) {
  const [state, setState] = useState(initialValue);
  const [error, setError] = useState(null);

  const update = useCallback(async (value) => {
    try {
      setError(null);
      setState(value);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState(initialValue);
    setError(null);
  }, [initialValue]);

  return { state, error, update, reset };
}
```

### 测试策略

```jsx
import { render, screen, fireEvent } from '@testing-library/react';

// 组件测试
test('示例组件正常渲染', () => {
  render(<ExampleComponent />);
  expect(screen.getByText('示例')).toBeInTheDocument();
});

// 交互测试
test('点击按钮触发回调', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>点击</Button>);
  fireEvent.click(screen.getByText('点击'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```
## 受控组件 (Controlled)

**input 受控**
`<input value={<value>} onChange={<handler>} />`
```tsx
function Input() {
  const [value, setValue] = useState('');
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

**textarea 受控**
`<textarea value={<value>} onChange={<handler>} />`
```tsx
<textarea value={text} onChange={(e) => setText(e.target.value)} />
```

**select 受控**
`<select value={<value>} onChange={<handler>}>...</select>`
```tsx
<select value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**多选 select**
```tsx
<select multiple value={tags} onChange={(e) => {
  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
  setTags(selected);
}}>
  <option value="x">X</option>
  <option value="y">Y</option>
</select>
```

**checkbox 受控**
`<input type="checkbox" checked={<bool>} onChange={<handler>} />`
```tsx
<input
  type="checkbox"
  checked={agree}
  onChange={(e) => setAgree(e.target.checked)}
/>
```

**radio 受控**
`<input type="radio" value=<v> checked={<bool>} onChange={<handler>} />`
```tsx
<input
  type="radio"
  name="gender"
  value="male"
  checked={gender === 'male'}
  onChange={(e) => setGender(e.target.value)}
/>
```

---

## 非受控组件 (Uncontrolled)

**useRef 非受控**
`const <ref> = useRef<<Element>>(null);`
```tsx
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSubmit = () => console.log(inputRef.current?.value);
  return (
    <>
      <input ref={inputRef} defaultValue="初始值" />
      <button onClick={onSubmit}>提交</button>
    </>
  );
}
```

**defaultValue 默认值**
```tsx
<input defaultValue="hello" />
<textarea defaultValue="long text" />
<select defaultValue="b"><option value="a" /><option value="b" /></select>
```

**defaultChecked checkbox/radio**
```tsx
<input type="checkbox" defaultChecked />
<input type="radio" defaultChecked />
```

---

## FormData 表单数据

**FormData 提交**
`const <fd> = new FormData(<form>);`
```tsx
function Form() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    console.log(data);
  };
  return <form onSubmit={onSubmit}>...</form>;
}
```

**FormData 读取**
```tsx
formData.get('name');              // 单值
formData.getAll('tags');           // 多值数组
formData.has('email');             // 是否存在
formData.set('key', 'value');
formData.append('tags', 'a');
formData.delete('key');
```

**FormData 类型化**
```tsx
function parseForm<T>(fd: FormData): T {
  return Object.fromEntries(fd) as T;
}

const data = parseForm<{ name: string; age: string }>(formData);
```

---

## useFormStatus 表单状态

**useFormStatus**
`const { pending, data, method, action } = useFormStatus();`
```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  );
}
```

---

## useActionState 表单动作

**useActionState**
`const [<state>, <action>] = useActionState(<fn>, <initial>);`
```tsx
import { useActionState } from 'react';

async function submit(prev: State | null, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name) return { error: '名称必填' };
  await api.post({ name });
  return { success: true };
}

function Form() {
  const [state, action] = useActionState(submit, null);
  return (
    <form action={action}>
      <input name="name" />
      <button>提交</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

---

## 表单提交事件

**onSubmit**
`(e: React.FormEvent<HTMLFormElement>) => void`
```tsx
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // e.currentTarget: 表单元素
  // e.target: 触发元素
};
```

---

## 验证 API

**HTML5 原生验证**
`<input required pattern=<regex> minLength=<n> maxLength=<n> />`
```tsx
<input
  type="email"
  required
  pattern="[^@]+@[^@]+\.[^@]+"
  minLength={5}
  maxLength={50}
/>
```

**ValidityState 校验状态**
`<input>.validity`
```tsx
const onInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
  const validity = e.target.validity;
  // validity.valueMissing     必填未填
  // validity.typeMismatch     类型不匹配
  // validity.patternMismatch  正则不匹配
  // validity.tooShort         过短
  // validity.tooLong          过长
  // validity.valid            是否合法
};
<input onInvalid={onInvalid} />;
```

**checkValidity 校验**
```tsx
const formRef = useRef<HTMLFormElement>(null);
const onClick = () => {
  if (formRef.current?.checkValidity()) {
    submit();
  }
};
```

---

## 字段数组管理

**动态字段列表**
```tsx
const [fields, setFields] = useState<string[]>(['']);

const add = () => setFields([...fields, '']);
const remove = (i: number) => fields.filter((_, idx) => idx !== i);
const update = (i: number, v: string) => fields.map((f, idx) => idx === i ? v : f);
```

---

## 字段绑定工具

**自定义受控字段 Hook**
```tsx
function useField<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue(e.target.value as T);
  return { value, onChange, setValue };
}

const nameField = useField('');
<input {...nameField} />;
```
