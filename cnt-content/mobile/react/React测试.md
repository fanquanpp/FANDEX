# 测试 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## render 渲染组件

**render 基础**
`render(<node>, [<options>])`
```tsx
import { render } from '@testing-library/react';

test('renders hello', () => {
  render(<App />);
});
```

**render 返回值**
`const { container, getByText, ... } = render(<node>);`
```tsx
const { container, getByText, queryByText, rerender, unmount } = render(<App />);

expect(container.firstChild).toHaveClass('app');
expect(getByText('Hello')).toBeInTheDocument();
```

**render options**
`render(<node>, { container, hydrate, wrapper, ... })`
```tsx
const { container } = render(<App />, {
  container: document.createElement('div'),
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});
```

**rerender 重新渲染**
`<result>.rerender(<node>)`
```tsx
const { rerender } = render(<Counter count={0} />);
rerender(<Counter count={1} />);
```

**unmount 卸载**
`<result>.unmount()`
```tsx
const { unmount } = render(<App />);
unmount();
```

**cleanup 清理**
`cleanup();`
```tsx
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

---

## screen 屏幕查询

**screen 通过全局**
`import { screen } from '@testing-library/react';`
```tsx
import { screen } from '@testing-library/react';

render(<App />);
expect(screen.getByText('Hello')).toBeInTheDocument();
```

**getByText 文本查询**
`screen.getByText(<text>)`
```tsx
screen.getByText('Hello');
screen.getByText(/hello/i);
screen.getByText((content, element) => content.includes('Hello'));
```

**getByRole 角色**
`screen.getByRole(<role>, [<options>])`
```tsx
screen.getByRole('button');
screen.getByRole('button', { name: '提交' });
screen.getByRole('button', { name: /submit/i, hidden: true });
```

**getByPlaceholderText**
```tsx
screen.getByPlaceholderText('请输入用户名');
```

**getByLabelText**
```tsx
screen.getByLabelText('邮箱');
screen.getByLabelText(/email/i);
```

**getByDisplayValue**
```tsx
screen.getByDisplayValue('hello');
```

**getByAltText**
```tsx
screen.getByAltText('logo');
```

**getByTitle**
```tsx
screen.getByTitle('提示');
```

**getByTestId**
`screen.getByTestId(<id>)`
```tsx
screen.getByTestId('submit-button');
```

---

## queryBy* 不抛异常查询

**queryByText**
`screen.queryByText(<text>)`
```tsx
const el = screen.queryByText('不存在');
expect(el).not.toBeInTheDocument();
```

**queryByTestId**
`screen.queryByTestId(<id>)`
```tsx
const btn = screen.queryByTestId('optional');
expect(btn).toBeNull();
```

**getAllByText 多匹配**
`screen.getAllByText(<text>)`
```tsx
const items = screen.getAllByText(/item/);
expect(items).toHaveLength(3);
```

**findAllBy 异步查询**
`await screen.findAllByText(<text>)`
```tsx
test('async list', async () => {
  render(<App />);
  const items = await screen.findAllByText(/item/);
  expect(items).toHaveLength(5);
});
```

**findBy 异步查询**
`await screen.findByRole(<role>)`
```tsx
test('loads user', async () => {
  render(<App />);
  const user = await screen.findByRole('heading', { name: /张三/ });
  expect(user).toBeInTheDocument();
});
```

---

## userEvent 用户事件

**userEvent.setup**
`const <user> = userEvent.setup();`
```tsx
import userEvent from '@testing-library/user-event';

test('click', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button'));
});
```

**user.click 点击**
`await <user>.click(<element>)`
```tsx
await user.click(screen.getByText('提交'));
await user.click(screen.getByRole('button', { name: '删除' }));
```

**user.type 输入**
`await <user>.type(<element>, <text>)`
```tsx
await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
await user.type(screen.getByPlaceholderText('密码'), 'p@ssw0rd{Enter}');
```

**user.clear 清空**
`await <user>.clear(<element>)`
```tsx
await user.clear(screen.getByLabelText('姓名'));
```

**user.selectOptions 选择**
`await <user>.selectOptions(<element>, <value>)`
```tsx
await user.selectOptions(screen.getByRole('listbox'), 'option1');
await user.selectOptions(screen.getByRole('listbox'), ['a', 'b']);
```

**user.upload 上传**
`await <user>.upload(<input>, <file>)`
```tsx
const file = new File(['content'], 'test.png', { type: 'image/png' });
await user.upload(screen.getByLabelText('头像'), file);
```

**user.keyboard 键盘**
`await <user>.keyboard(<text>)`
```tsx
await user.keyboard('hello');
await user.keyboard('{Shift}{ArrowLeft>4}{/Shift}');
```

**user.tab 切换焦点**
`await <user>.tab()`
```tsx
await user.tab();
expect(screen.getByRole('button')).toHaveFocus();
```

**user.hover / unhover**
```tsx
await user.hover(screen.getByText('菜单'));
await user.unhover(screen.getByText('菜单'));
```

**user.paste 粘贴**
```tsx
await user.paste(screen.getByRole('textbox'), 'pasted text');
```

---

## fireEvent 原生事件

**fireEvent 触发**
`fireEvent.<event>(<element>, [<eventInit>])`
```tsx
import { fireEvent } from '@testing-library/react';

fireEvent.click(screen.getByText('提交'));
fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
fireEvent.submit(screen.getByRole('form'));
fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
```

---

## waitFor 异步等待

**waitFor**
`await waitFor(() => <expect>)`
```tsx
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('已加载')).toBeInTheDocument();
});
```

**waitFor 选项**
`await waitFor(<fn>, { timeout, interval })`
```tsx
await waitFor(() => expect(screen.queryByText('loaded')).toBeInTheDocument(), {
  timeout: 5000,
  interval: 100,
});
```

**waitForElementToBeRemoved**
`await waitForElementToBeRemoved(<fn>)`
```tsx
import { waitForElementToBeRemoved } from '@testing-library/react';

await waitForElementToBeRemoved(() => screen.queryByText('加载中'));
```

---

## act 同步行为

**act 包装**
`act(() => <fn>)`
```tsx
import { act } from 'react';

act(() => {
  render(<App />);
});
```

**async act**
`await act(async () => <fn>)`
```tsx
await act(async () => {
  await user.click(button);
});
```

---

## within 容器内查询

**within 范围查询**
`within(<container>).getByText(<text>)`
```tsx
import { within } from '@testing-library/react';

const { container } = render(<App />);
const section = container.querySelector('section')!;
const title = within(section).getByText('标题');
```

---

## 常用断言

**toBeInTheDocument**
`expect(<el>).toBeInTheDocument()`
```tsx
expect(screen.getByText('hello')).toBeInTheDocument();
```

**toHaveTextContent**
`expect(<el>).toHaveTextContent(<text>)`
```tsx
expect(screen.getByRole('heading')).toHaveTextContent('Hello, World');
```

**toHaveAttribute**
`expect(<el>).toHaveAttribute(<name>, [<value>])`
```tsx
expect(screen.getByRole('button')).toHaveAttribute('disabled');
expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
```

**toHaveClass**
`expect(<el>).toHaveClass(<className>)`
```tsx
expect(screen.getByRole('button')).toHaveClass('active');
```

**toBeDisabled / toBeEnabled**
```tsx
expect(screen.getByRole('button')).toBeDisabled();
expect(screen.getByRole('button')).toBeEnabled();
```

**toBeVisible**
`expect(<el>).toBeVisible()`
```tsx
expect(screen.getByText('visible')).toBeVisible();
```

---

## Mock 工具

**jest.mock**
`jest.mock('<module>', <factory>)`
```tsx
jest.mock('@/api/user', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: '张三' }),
}));
```

**jest.spyOn**
`jest.spyOn(<obj>, '<method>')`
```tsx
const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => spy.mockRestore());
```

**mockImplementation**
`<mock>.mockImplementation(<fn>)`
```tsx
const mockFn = jest.fn();
mockFn.mockImplementation((id: string) => ({ id }));
mockFn.mockResolvedValue({ ok: true });
mockFn.mockRejectedValue(new Error('fail'));
```
