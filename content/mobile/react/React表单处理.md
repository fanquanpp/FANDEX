# 表单 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

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
