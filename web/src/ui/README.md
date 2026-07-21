# UI 层

## 职责

UI 层负责界面交互与展示，是用户与应用交互的直接入口。本层组织 Vue 3 组件与 Astro 组件，采用 shadcn-vue 风格的组织方式，强调组件可组合性与样式一致性。

## 依赖规则

- 允许调用 Service 层暴露的领域 API 获取业务数据。
- 允许引用 `@types/*` 中的共享类型定义。
- 允许引用 `@utils/*` 中的纯函数工具。
- 允许引用 `@/styles` 中的 Design Tokens 与全局样式。
- 禁止直接发起 API 请求（fetch、axios 等）。
- 禁止直接访问 localStorage、IndexedDB 等持久化存储。
- 禁止包含业务逻辑（数据转换、状态计算、业务校验等）。
- 禁止直接引用 `@data/*` 层，必须通过 Service 层中转。

## 目录结构

- `components/` — 基础组件库（按钮、输入框、对话框等原子组件）。
- `composables/` — Vue composables，封装可复用的响应式逻辑。

## 示例

```typescript
// 正确：通过 Service 层获取数据
import { fetchModuleStats } from '@services/progress';
import type { ModuleStats } from '@types/progress';

const stats = await fetchModuleStats('cpp');
```

```typescript
// 错误：UI 层直接访问持久化存储
import { localStorage } from '@data/storage'; // 禁止
localStorage.getItem('progress'); // 禁止
```

## 迁移说明

本目录为 Phase 1.1 新建占位，现有 `src/components/` 下的 Astro 组件将在 Phase 1.4 迁移至本层或保留为页面级组件。
