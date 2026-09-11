---
order: 360
title: React 与 Storybook
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 组件工作台 Storybook：CSF3 故事格式、args 与控件面板、文档自动生成、play 交互测试、a11y 与 MSW 插件、CI 集成与视觉回归。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/340-ReactCanvas'
  - 'react/350-ReactD3'
  - 'react/370-ReactCICD'
  - 'react/220-ReactTest'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

Storybook 是**组件的独立工作台**：把每个组件在"脱离应用"的状态下渲染出来，配上一组可调参数（props）的样例——即"故事"（story）。它解决三个真实痛点：UI 开发不用来回启动整个业务应用；设计评审有了真实可交互的对照物；组件回归测试有了明确靶子。类比：应用是"整车测试场"，Storybook 是"零件台架"——零件（组件）在台架上跑通，才装回整车。当前主流为 Storybook 8/9 + **CSF3** 故事格式 + Vite 构建，一条命令接入：

```bash
npx storybook@latest init
```

## 2. CSF3：一个故事长什么样

CSF（Component Story Format）就是普通的 ES 模块：默认导出是**组件级元信息**，命名导出是**一个个故事**：

```tsx
// src/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// meta：这个组件的"档案"
const meta: Meta<typeof Button> = {
  title: 'Components/Button',  // 侧边栏目录路径
  component: Button,
  tags: ['autodocs'],          // 自动生成文档页
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'ghost'] }, // 控件类型
  },
};
export default meta;

// 每个命名导出 = 一种使用场景；args 即初始 props
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: '主要操作' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: '不可点击' },
};

export const LongText: Story = {
  args: { variant: 'ghost', children: '超长文案要能完整展示不被截断的情况' },
};
```

运行 `npm run storybook` 打开工作台：左侧目录树、中间画布渲染组件、右侧 Controls 面板实时修改 props——`variant` 下拉切换、文本框即改即见。故事的价值在**覆盖状态空间**：默认、禁用、极限文案、空数据，一个组件该有的样子以故事清单的形式固定下来。

## 3. 装饰器与 Mock：让故事能跑

组件依赖 Provider（主题、路由、请求客户端）时用 `decorators` 包一层；依赖网络时用 MSW 插件拦截：

```tsx
import { Meta } from '@storybook/react';
import { MemoryRouter } from 'react-router';

const meta: Meta = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story /> {/* 每个故事都会被包裹 */}
      </MemoryRouter>
    ),
  ],
};

// msw-storybook-addon：按故事声明接口返回
// meta.parameters = { msw: { handlers: [userHandlers] } }
```

原则与单元测试一致（见[React 测试](/react/220-ReactTest)）：故事里的依赖要么显式注入（args 传回调），要么在装饰器层 mock，绝不连真实后端。

## 4. 交互测试：play 函数

CSF3 的 play 函数把"用户操作脚本"写进故事，配合 Storybook 的测试运行器可在 CI 中批量执行：

```tsx
import { expect, userEvent, within, fn } from '@storybook/test';

export const ClickSubmit: Story = {
  args: { variant: 'primary', children: '提交', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // 模拟点击并断言回调被调用——故事即测试
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
```

`npx test-storybook` 在真实浏览器中逐个执行所有带 play 的故事，失败的即 CI 红灯。交互测试与组件测试的分工：RTL 用例覆盖业务逻辑行为，play 覆盖"组件在隔离环境下可交互、可达成状态"。

## 5. 文档与设计协作

- `tags: ['autodocs']` 自动生成文档页：props 表格（来自 TypeScript 类型）、每个故事的预览与源码。
- 配合 `argTypes` 的 `description`/`control` 让 Controls 面板自解释。
- 视觉回归：Chromatic（Storybook 官方）或 `storybook test-runner` + 截图比对，故事集就是免费的截图矩阵——每个故事一个基线，props 改动导致的像素级回归在 PR 里直接标红。

## 6. CI 集成

典型流水线（配合[React 与 CI/CD](/react/370-ReactCICD)的通用框架）：

```yaml
- name: 构建 Storybook
  run: npm run build-storybook --quiet
- name: 交互与冒烟测试
  run: npx test-storybook --url file://$(pwd)/storybook-static # 本地静态产物
- name: 视觉回归（可选）
  run: npx chromatic --exit-zero-on-changes=false # 有像素差异则失败
```

## 7. 常见陷阱

- **故事与实现漂移**：组件加了必填 prop 后故事全部报错——这其实是 Storybook 的价值（强制暴露接口变化），别用 `any` 敷衍，及时补齐故事。
- **非确定性渲染**：故事里 `new Date()`、随机数、动态文案导致视觉回归天天误报；mock 时间（`@storybook/test` 的 mockDate 或固定 props）。
- **所有故事堆一个文件**：几百个故事混在 `stories.tsx`，加载与维护都崩溃；按组件拆文件、目录树按域分组（`Components/`、`Pages/`、`Patterns/`）。
- **把页面级故事当 E2E**：Storybook 缺真实路由/后端/状态衔接，页面故事只适合"布局快照"；端到端流程交给 Playwright。
- **装饰器层层堆叠不收敛**：全局（preview.tsx）放主题与查询客户端，故事级只放特例；公共装饰器集中管理。
- **忘记构建产物校验**：本地 OK、CI 里 `build-storybook` 因 MDX/类型错误失败；让构建进 CI 才算接入。

## 8. 小结

初学者要点：

- Storybook = 组件工作台；CSF3 格式：`Meta`（档案）+ 每个命名导出一个故事（args 即 props）。
- 依赖 Provider 用 `decorators`，依赖接口用 MSW mock；`tags: ['autodocs']` 自动出文档。
- 故事的价值在状态覆盖：默认/禁用/极限文案/空数据各一个故事。

进阶注意：

- play 函数 + `test-storybook` 让故事成为 CI 里可执行的交互测试；视觉回归把故事集变成截图矩阵。
- 确定性是视觉回归的前提：mock 时间与随机源。
- 分层使用：组件故事（绝大多数）、模式/组合故事（少量）、页面故事（布局快照）；E2E 交给 Playwright。

## 速查

**CSF3 骨架**

```tsx
const meta: Meta<typeof Button> = { title: 'Components/Button', component: Button, tags: ['autodocs'] };
export default meta;
export const Primary: StoryObj<typeof Button> = { args: { variant: 'primary', children: '提交' } };
```

**常用 meta 配置**

```tsx
{
  decorators: [(Story) => <Provider><Story /></Provider>], // 全局依赖
  argTypes: { variant: { control: 'radio', options: ['a', 'b'] } },
  parameters: { msw: { handlers: [...] } },                 // 接口 mock
}
```

**play 交互测试**

```tsx
play: async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button'));
  await expect(args.onClick).toHaveBeenCalled();
}
```

**常用命令**

```bash
npx storybook@latest init        # 接入
npm run storybook                # 本地工作台
npm run build-storybook          # 静态产物（部署文档站/CI 校验）
npx test-storybook               # 执行 play 测试
```
