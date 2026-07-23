# useState + 事件类型 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

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
