# 纯函数工具

## 职责

存放无副作用的纯函数工具，提供跨层复用的通用计算能力。本目录是项目级工具函数的统一入口，强调函数纯粹性与可测试性。

## 依赖规则

- 仅存放纯函数：相同输入必须产生相同输出，禁止产生副作用。
- 禁止访问 `window`、`document`、`localStorage`、`fetch` 等运行时对象。
- 禁止包含业务逻辑（业务逻辑属于 Service 层）。
- 禁止包含异步操作（异步属于 Service 或 Data 层）。
- 允许引用 `@types/*` 中的共享类型定义。
- 函数必须为可独立测试的单元，禁止依赖外部状态。

## 目录结构

按功能领域组织工具文件，例如：

- `format.ts` — 格式化工具（日期、数字、字符串格式化）。
- `validate.ts` — 校验工具（输入校验、类型守卫）。
- `convert.ts` — 转换工具（单位转换、数据结构转换）。
- `math.ts` — 数学计算工具（统计、百分比、舍入）。

## 示例

```typescript
// 正确：纯函数，无副作用
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
```

```typescript
// 错误：访问运行时对象
export function getViewportWidth(): number {
  return window.innerWidth; // 禁止
}

// 错误：包含业务逻辑
export function calculateModuleCompletion(module): number {
  return (module.completedDocs / module.totalDocs) * 100; // 禁止：业务逻辑属于 Service 层
}
```

## 迁移说明

本目录为 Phase 1.1 新建占位，现有 `src/lib/` 下的 `reading-time.ts`、`animations.ts` 中符合纯函数标准的部分将在 Phase 1.4 迁移至此。
