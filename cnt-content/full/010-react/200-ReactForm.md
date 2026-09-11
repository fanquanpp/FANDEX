---
order: 200
title: React 表单处理
module: 'react'
category: 前端技术
difficulty: beginner
description: React 表单完整指南：受控与非受控组件的取舍、校验策略、React 19 form action 与 useActionState/useFormStatus、复杂表单库选型与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/180-ReactPerformance'
  - 'react/190-ReactErrorBoundary'
  - 'react/210-ReactTypeScript'
  - 'react/220-ReactTest'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

React 表单的核心只有一个选择题：**值放在 React state 里（受控），还是放在 DOM 自己手里（非受控）**。受控组件像"秘书记账"——每一次输入都要先汇报给 React，再由 React 回写界面，数据流向完全可控；非受控组件像"员工自己记账"——DOM 自己管值，React 只在需要时（提交时）来查一次账。React 19 又给了第三条路：`<form action>` 表单动作，把提交变成声明式数据流。

## 2. 受控组件：单一数据源

受控组件的判定标准：输入框的 `value` 来自 state，且每次输入通过 `onChange` 把新值写回 state。值永远以 state 为准，DOM 只是它的投影。

```tsx
import { useState, type FormEvent } from 'react';

interface FormState {
  name: string;
  email: string;
}

export function SignupForm() {
  const [form, setForm] = useState<FormState>({ name: '', email: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // 通用字段更新：用 input 的 name 属性分发
  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // 边输入边清错：一旦该字段开始修改就移除旧错误提示
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = '姓名不能为空';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = '邮箱格式不正确';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault(); // 阻止浏览器整页刷新
    if (validate()) submitApi(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="name"
          value={form.name} // 值由 React 决定
          onChange={(e) => update('name', e.target.value)}
          placeholder="姓名"
        />
        {errors.name && <p role="alert">{errors.name}</p>}
      </div>
      <div>
        <input
          name="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="邮箱"
        />
        {errors.email && <p role="alert">{errors.email}</p>}
      </div>
      <button type="submit">注册</button>
    </form>
  );
}
```

预期渲染行为：键入时输入框实时回显、实时清除该字段的错误；姓名为空或邮箱格式错误时点击"注册"不会发请求，只显示红色提示；校验通过才调用提交函数。

受控的价值：即时校验、联动（A 字段变化改 B 的选项）、禁用提交按钮、把表单状态接到 Redux/Zustand 等外部 store——这些全都依赖"React 知道每个字符"。代价是**每个字符一次重渲染**，小表单无感，几百个字段的大表单会卡。

## 3. 非受控组件：交给 DOM

不传 `value`，用 `defaultValue` 给初值，需要时用 ref（或 `new FormData(form)`）读取。React 不参与每次输入：

```tsx
import { useRef, type FormEvent } from 'react';

export function SearchBox() {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    // FormData 一次拿到全部字段，省去为每个字段建 state
    const data = Object.fromEntries(new FormData(formRef.current));
    searchApi(data.keyword as string); // name 属性即 key
  }

  return (
    <form ref={formRef} onSubmit={handleSearch}>
      {/* defaultValue：只在首次挂载生效，后续浏览器自管 */}
      <input name="keyword" defaultValue="" placeholder="搜索" />
      <button type="submit">搜索</button>
    </form>
  );
}
```

必须非受控的场景：文件输入（`<input type="file">` 的 `value` 是只读的 FileList，只能通过 ref 或 FormData 拿）；性能敏感的超大表单；把第三方 DOM 组件（如旧版 jQuery 插件）接进 React。选择口诀：**需要每个字符都用受控，只需要提交那一刻的值用非受控**。

## 4. React 19 表单动作：`action` + `useActionState`

React 19 把"提交"变成了声明式 API。给 `<form>` 传 `action` 函数，浏览器提交时 React 自动阻止默认行为、把 `FormData` 传给你，配合 `useActionState` 还能拿到返回值与 pending 状态：

```tsx
import { useActionState } from 'react';

// action 函数签名固定：(上一轮结果, FormData) => 新结果；支持 async
async function signupAction(prev: { ok: boolean; msg: string } | null, fd: FormData) {
  'use server'; // Next.js Server Actions 场景；纯客户端项目省略此行
  const email = String(fd.get('email') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: '邮箱格式不正确' };
  await createAccount(email);
  return { ok: true, msg: '注册成功' };
}

export function Signup() {
  // [本轮结果, 提交动作, 是否提交中]
  const [state, formAction, isPending] = useActionState(signupAction, null);

  return (
    <form action={formAction}> {/* 不需要 onSubmit + preventDefault */}
      <input name="email" type="email" required />
      <button disabled={isPending}>{isPending ? '提交中...' : '注册'}</button>
      {state && <p role="alert">{state.msg}</p>}
    </form>
  );
}
```

预期渲染行为：点击提交后按钮变为"提交中..."并禁用；校验失败显示"邮箱格式不正确"且输入框内容保留（FormData 方式天然不丢输入）；成功显示"注册成功"。

配套的 `useFormStatus`（从 `react-dom` 导入）让**深层按钮**读取父级 `<form>` 的提交状态，不必层层传 props——提交中给按钮加 loading 就不再需要状态提升：

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus(); // 自动关联最近的父 <form>
  return <button disabled={pending}>{pending ? '保存中...' : '保存'}</button>;
}
```

## 5. 各类控件的处理差异

| 控件 | 受控写法 | 要点 |
| :--- | :--- | :--- |
| 文本/密码/textarea | `value` + `onChange` | textarea 在 React 中用 `value` 而非子节点 |
| select 单选 | `value` + `onChange` | React 用 `value` 代替 `<option selected>` |
| select 多选 | `value={array}` | `e.target.selectedOptions` 读取；或改用非受控 |
| checkbox | `checked` + `onChange` | 读 `e.target.checked`，不是 `value` |
| radio 组 | `checked={v === 'x'}` | 同 name 分组，受控比较而非 value |
| file | 非受控 + ref | 只能用 ref 或 FormData 读取 |

## 6. 校验策略：优先原生，JS 兜底

浏览器内置校验（`required`、`type="email"`、`pattern`、`min`/`max`）免费、无闪烁、移动端直接弹原生键盘。原则是**能用原生的先原生**，复杂联动规则才写 JS：

```tsx
const formRef = useRef<HTMLFormElement>(null);

// 原生校验：checkValidity 静默检查；reportValidity 弹出浏览器气泡提示
function beforeSubmit() {
  const form = formRef.current;
  if (!form) return;
  if (form.checkValidity()) {
    submit();
  } else {
    form.reportValidity(); // 浏览器自动聚焦第一个非法字段并提示
  }
}

// 自定义消息：监听 invalid 事件，用 setCustomValidity 覆盖提示文案
<input
  required
  onInvalid={(e) => e.currentTarget.setCustomValidity('请输入 11 位手机号')}
  pattern="\d{11}"
/>
```

局限也要知道：原生校验的提示样式不可控、跨字段联动（"结束日期必须晚于开始日期"）表达不了，这些场景回落到受控 + JS 校验，或表单库的 schema 校验（zod + react-hook-form）。

## 7. 表单库选型

- **react-hook-form**（当前默认推荐）：非受控为底、按需订阅字段，大表单不随键入重渲染；配 zod 做 schema 校验是社区主流组合。
- **Formik / Redux-Form**：Redux-Form 已废弃；Formik 维护明显放缓，新项目不再建议。
- **React 19 原生方案**：中小表单 + Next.js Server Actions 场景，`action` + `useActionState` 零依赖即可覆盖，优先评估再上库。

## 8. 常见陷阱

- **number 输入的值是字符串**：`e.target.value` 恒为 `string`，`type="number"` 只约束键盘与校验，入 state 前手动 `Number()` 并处理 `NaN`。
- **defaultValue 改了不生效**：非受控初值只在挂载时读取；外部数据异步到达后要重置表单，给容器加 `key={recordId}` 强制重建，而不是改 `defaultValue`。
- **`value={null}` 警告**：受控/非受控切换的报错来自"初值 undefined"；给 state 初始化为 `''`/`false` 等确定类型值。
- **表单里的一般按钮忘了 `type="button"`**：`<button>` 默认 `type="submit"`，放在 form 里会意外触发提交；工具按钮必须显式声明。
- **大表单全量受控导致键入卡顿**：几百字段时每次键入重渲染全表单；改用 react-hook-form（非受控底座），或把字段拆成独立 memo 组件。
- **受控输入加防抖**：直接给 `value` 更新加防抖会造成"输入框跟不上手指"；正确做法是本地 state 即时更新（受控），防抖只用于副作用（如搜索请求，参考[自定义 Hooks 复用逻辑](/react/450-CustomHooksReuseLogic)的 `useDebounce`）。
- **用 state 镜像 props 校验后又允许直接改**：`getDerivedStateFromProps` 式的同步极易失控；表单草稿与"已保存数据"分开建模，提交时 diff。

## 9. 小结

初学者要点：

- 受控 = `value` + `onChange` 单一数据源，适合需要校验/联动的场景；非受控 = `defaultValue` + ref/FormData，适合"只要提交值"的场景；文件输入必须非受控。
- 提交处理第一行永远是 `e.preventDefault()`（除非用 React 19 的 `form action`）。
- 校验优先原生属性，复杂规则才写 JS。

进阶注意：

- React 19 的 `action` + `useActionState` + `useFormStatus` 把提交状态与结果声明化，Server Actions 场景下表单可以完全运行在服务端。
- 性能问题（键入重渲染）的解法是换数据流（非受控库），不是给受控输入加防抖。
- 表单是组件测试的高频区：用 `getByRole('textbox', { name })` 与 `userEvent.type` 做行为断言，见[React 测试](/react/220-ReactTest)。

## 速查

**受控字段通用 Hook**

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

**原生校验**

```tsx
const formRef = useRef<HTMLFormElement>(null);
if (formRef.current?.checkValidity()) submit();          // 静默校验
else formRef.current?.reportValidity();                  // 浏览器气泡提示
```

**React 19 表单动作**

```tsx
const [state, formAction, isPending] = useActionState(async (prev, fd) => save(fd), null);
<form action={formAction}>
  <input name="email" required />
  <SubmitButton /> {/* 内部 useFormStatus().pending */}
</form>
```

**动态字段列表**

```tsx
const [fields, setFields] = useState<string[]>(['']);
const add = () => setFields([...fields, '']);
const remove = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
const update = (i: number, v: string) =>
  setFields(fields.map((f, idx) => (idx === i ? v : f)));
```

**FormData 一次性取值**

```tsx
const data = Object.fromEntries(new FormData(formRef.current)); // { name: '...' }
```
