# 函数组件 + Props 类型 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 函数组件定义

**基本函数组件**
`function <Component>(<props>): <JSX.Element>`
```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}
```

**箭头函数组件**
`const <Component> = (<props>) => <JSX.Element>;`
```tsx
const Button = ({ label }: { label: string }) => (
  <button>{label}</button>
);
```

**FC 类型组件**
`const <Component>: React.FC<<Props>> = (<props>) => <JSX.Element>;`
```tsx
type ButtonProps = { label: string; onClick: () => void };

const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
);
```

---

## Props 类型定义

**基础 Props 类型**
`type <Props> = { <key>: <type> };`
```tsx
type UserCardProps = {
  name: string;
  age: number;
  isActive?: boolean;
};
```

**PropsWithChildren 含子节点**
`type <Props> = React.PropsWithChildren<{ <key>: <type> }>;`
```tsx
type CardProps = React.PropsWithChildren<{ title: string }>;

function Card({ title, children }: CardProps) {
  return <section><h2>{title}</h2>{children}</section>;
}
```

**ComponentProps 提取元素属性**
`type <Props> = React.ComponentProps<<Element>>;`
```tsx
type DivProps = React.ComponentProps<'div'>;
type ButtonElProps = React.ComponentProps<'button'>;
type WrappedBtnProps = React.ComponentProps<typeof Button>;
```

**ComponentPropsWithRef 含 ref**
`type <Props> = React.ComponentPropsWithRef<<ElementType>>;`
```tsx
type InputProps = React.ComponentPropsWithRef<'input'>;
```

---

## 可选与默认 Props

**可选 Props**
`<key>?: <type>`
```tsx
type ModalProps = { title: string; onClose?: () => void };
```

**默认值解构**
`function <C>({ <key> = <default> }: <Props>)`
```tsx
function Avatar({ size = 48 }: { size?: number }) {
  return <img width={size} height={size} />;
}
```

---

## 泛型组件

**泛型函数组件**
`function <Component><<T>>(<props>): <JSX.Element>`
```tsx
function List<T>({ items, render }: {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
}) {
  return <ul>{items.map((item, i) => <li key={i}>{render(item, i)}</li>)}</ul>;
}
```

**泛型箭头组件**
`const <Component> = <T,>(<props>) => <JSX.Element>;`
```tsx
const Select = <T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <select value={value} onChange={e => onChange(e.target.value as T)}>
    {options.map(o => <option key={String(o)} value={o}>{o}</option>)}
  </select>
);
```

---

## 事件 Props

**事件处理器 Props**
`<onChange>: React.ChangeEventHandler<<Element>>`
```tsx
type InputProps = {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};
```

---

## Children 类型

**ReactNode 任意节点**
`children: React.ReactNode`
```tsx
type Props = { children: React.ReactNode };
```

**ReactElement 单元素**
`children: React.ReactElement`
```tsx
type Props = { children: React.ReactElement };
```

**JSX.Element 类型**
`const <el>: JSX.Element = <node>;`
```tsx
const heading: JSX.Element = <h1>Title</h1>;
```

---

## Props 拆分与合并

**Omit 排除属性**
`type <Props> = Omit<<Base>, <keys>>;`
```tsx
type IconButtonProps = Omit<React.ComponentProps<'button'>, 'type'> & {
  variant?: 'primary' | 'ghost';
};
```

**Pick 选取属性**
`type <Props> = Pick<<Base>, <keys>>;`
```tsx
type CoreInputProps = Pick<React.ComponentProps<'input'>, 'value' | 'onChange' | 'placeholder'>;
```

**交叉类型合并**
`type <Props> = <A> & <B>;`
```tsx
type Props = React.ComponentProps<'button'> & { loading?: boolean };
```
