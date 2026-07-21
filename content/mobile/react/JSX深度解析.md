# JSX 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 标签与元素

**自闭合标签**
`const <el> = <Component />;`
```tsx
const icon = <Logo />;
const br = <br />;
```

**Fragment 多根节点**
`<>...</> 或 <Fragment key=<key>>...</Fragment>`
```tsx
import { Fragment } from 'react';

const list = items.map(id => (
  <Fragment key={id}>
    <dt>{id}</dt>
    <dd>{label}</dd>
  </Fragment>
));
```

---

## 属性

**属性传递**
`<Component <prop>={<value>} />`
```tsx
<Button type="submit" disabled={isLoading}>
  保存
</Button>
```

**展开属性**
`<Component {...<props>} />`
```tsx
const inputProps = { type: 'text', maxLength: 20, required: true };
<input {...inputProps} />;
```

**className 合并**
`<div className={<string>} />`
```tsx
<div className={`base ${isActive ? 'active' : ''}`} />
```

**style 内联样式**
`<div style={<CSSProperties>} />`
```tsx
const boxStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  '--brand-color': '#0066ff',
} as React.CSSProperties;
<div style={boxStyle} />
```

---

## 表达式插值

**单值插值**
`{<expression>}`
```tsx
<h1>{title}</h1>
<span>{count + 1}</span>
<p>{user?.name ?? '匿名'}</p>
```

**条件表达式**
`{<cond> ? <a> : <b>}`
```tsx
{isLoading ? <Spinner /> : <Content />}
{isLogin && <Avatar />}
```

**IIFE 块级表达式**
`{(() => <node>)()}`
```tsx
{(() => {
  if (status === 'error') return <Error />;
  if (status === 'loading') return <Spinner />;
  return <Done />;
})()}
```

---

## 列表渲染

**map 渲染列表**
`{<array>.map(<item> => <node>)}`
```tsx
{users.map(user => (
  <li key={user.id}>{user.name}</li>
))}
```

**key 列表 key**
`<Component key={<key>} />`
```tsx
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}
```

**filter + map 组合**
`<array>.filter(<fn>).map(<fn>)`
```tsx
{users
  .filter(u => u.active)
  .map(u => <Row key={u.id} user={u} />)}
```

---

## 注释

**JSX 内注释**
`{/* <comment> */}`
```tsx
<div>
  {/* 仅在登录后展示 */}
  {isLogin && <Dashboard />}
</div>
```

**行内注释**
`// <comment>`
```tsx
{count // 当前数量
}
```

---

## 子节点

**children 嵌套**
`<Parent>...children...</Parent>`
```tsx
<Card>
  <Header />
  <Body />
</Card>
```

**条件 children**
`<Parent>{<cond> ? <a> : <b>}</Parent>`
```tsx
<Dialog>{isOpen ? <Content /> : null}</Dialog>
```

**数组 children**
`<Parent>{[<a>, <b>]}</Parent>`
```tsx
<List>{[<li key="1" />, <li key="2" />]}</List>
```

---

## 内置组件属性

**htmlFor**
`<label htmlFor={<id>}>...</label>`
```tsx
<label htmlFor="email">邮箱</label>
<input id="email" type="email" />
```

**ref 转发**
`<Component ref={<ref>} />`
```tsx
<input ref={inputRef} />
```

**dangerouslySetInnerHTML 原生 HTML**
`<div dangerouslySetInnerHTML={{ __html: <html> }} />`
```tsx
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```
