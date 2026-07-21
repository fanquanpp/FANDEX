# React TS 类型 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## ComponentProps 提取属性

**ComponentProps**
`type <Props> = React.ComponentProps<<ElementType>>;`
```tsx
type DivProps = React.ComponentProps<'div'>;
type BtnProps = React.ComponentProps<'button'>;
type CompProps = React.ComponentProps<typeof MyComponent>;
```

**ComponentPropsWithRef 含 ref**
`React.ComponentPropsWithRef<<ElementType>>`
```tsx
type InputProps = React.ComponentPropsWithRef<'input'>;
```

**ComponentPropsWithoutRef 排除 ref**
`React.ComponentPropsWithoutRef<<ElementType>>`
```tsx
type PureProps = React.ComponentPropsWithoutRef<'div'>;
```

---

## ReactNode 节点类型

**ReactNode 任意节点**
`type <V> = React.ReactNode;`
```tsx
type Props = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};
```

**ReactElement 单元素**
`React.ReactElement`
```tsx
const el: React.ReactElement = <div>hello</div>;
```

**ReactElement 带泛型**
`React.ReactElement<<T>>`
```tsx
const el: React.ReactElement<{ value: string }> = <Comp value="x" />;
```

---

## FC 函数组件类型

**FC 基础**
`const <Component>: React.FC<<Props>>`
```tsx
type Props = { title: string };
const Title: React.FC<Props> = ({ title }) => <h1>{title}</h1>;
```

**FC 含 children**
`React.FC<React.PropsWithChildren<<Props>>>`
```tsx
const Card: React.FC<React.PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => <section><h2>{title}</h2>{children}</section>;
```

**VFC 无 children**
```tsx
const Icon: React.FC<{ name: string }> = ({ name }) => <i className={name} />;
```

---

## ChangeEvent 事件类型

**ChangeEvent 表单**
`React.ChangeEvent<<Element>>`
```tsx
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

**MouseEvent 鼠标**
`React.MouseEvent<<Element>>`
```tsx
const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};
```

**KeyboardEvent 键盘**
`React.KeyboardEvent<<Element>>`
```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};
```

**FormEvent 表单提交**
`React.FormEvent<<FormElement>>`
```tsx
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```

**EventHandler 处理器类型**
```tsx
type Change = React.ChangeEventHandler<HTMLInputElement>;
type Click = React.MouseEventHandler<HTMLButtonElement>;
type KeyDown = React.KeyboardEventHandler<HTMLInputElement>;
```

---

## CSSProperties 样式类型

**CSSProperties 内联样式**
`React.CSSProperties`
```tsx
const style: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  color: '#333',
};
<div style={style} />;
```

**自定义 CSS 变量**
```tsx
const style = {
  '--brand': '#0066ff',
  width: '100%',
} as React.CSSProperties;
```

**PropertiesHyphen 长划线**
```tsx
const style: React.CSSProperties = {
  'background-color': 'red',
  'font-size': '14px',
};
```

---

## Ref 类型

**Ref 类型**
`React.Ref<<Element>>`
```tsx
const inputRef: React.Ref<HTMLInputElement> = useRef(null);
```

**RefObject**
`React.RefObject<<Element>>`
```tsx
const ref: React.RefObject<HTMLDivElement> = { current: null };
```

**MutableRefObject**
`React.MutableRefObject<<T>>`
```tsx
const counterRef: React.MutableRefObject<number> = useRef(0);
```

**RefCallback**
`React.RefCallback<<Element>>`
```tsx
const callback: React.RefCallback<HTMLDivElement> = (el) => {
  if (el) observe(el);
};
```

---

## 常用类型别名

**Dispatch 派发器**
`React.Dispatch<<Action>>`
```tsx
const dispatch: React.Dispatch<Action> = useDispatch();
```

**Reducer**
`React.Reducer<<State>, <Action>>`
```tsx
const reducer: React.Reducer<State, Action> = (state, action) => state;
```

**MutableRefObject / RefObject**
```tsx
const counter: React.MutableRefObject<number> = useRef(0);
const div: React.RefObject<HTMLDivElement> = useRef(null);
```

**Awaited 异步结果类型**
```tsx
type User = Awaited<ReturnType<typeof fetchUser>>;
```

---

## JSX 命名空间类型

**JSX.Element**
`JSX.Element`
```tsx
const heading: JSX.Element = <h1>Title</h1>;
```

**JSX.IntrinsicElements 内置元素**
`JSX.IntrinsicElements['<tag>']`
```tsx
const divProps: JSX.IntrinsicElements['div'] = { id: 'root', className: 'box' };
```

**ElementRef 提取元素类型**
`React.ElementRef<<ElementType>>`
```tsx
type InputEl = React.ElementRef<'input'>; // HTMLInputElement
```
