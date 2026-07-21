# Data 层

## 职责

Data 层负责数据存取与底层交互，包括持久化存储（localStorage、IndexedDB）、网络请求封装、外部 API 对接等。本层是应用与外部世界交互的唯一边界，对 Service 层提供原子化的数据访问能力。

## 依赖规则

- 允许引用 `@types/*` 中的共享类型定义。
- 允许引用 `@utils/*` 中的纯函数工具。
- 禁止包含业务逻辑（状态机、业务规则、数据转换等）。
- 禁止包含视图代码。
- 禁止直接被 UI 层调用，必须通过 Service 层中转。
- 所有网络请求必须统一封装，禁止分散裸调用 fetch。

## 目录结构

- `storage/` — 持久化存储：localStorage、IndexedDB 的封装与抽象。
- `api/` — 网络 API 封装：HTTP 客户端、请求拦截、错误处理。
- `glossary/` — 术语表数据源：术语索引构建与原始数据读取。

## 示例

```typescript
// 正确：Data 层提供原子化存储能力
import type { DocProgress } from '@types/progress';

export const storage = {
  async read<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async write<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
```

```typescript
// 错误：Data 层包含业务逻辑
export async function calculateProgress(slug: string): Promise<number> {
  const progress = await storage.read(`doc:${slug}`);
  return (progress.completedDocs / progress.totalDocs) * 100; // 禁止：业务计算
}
```

## 迁移说明

本目录为 Phase 1.1 新建占位，现有 `src/lib/store.ts`、`external-loader.ts` 等数据访问模块将在 Phase 1.4 迁移至此。
