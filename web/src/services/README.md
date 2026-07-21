# Service 层

## 职责

Service 层承载全部业务逻辑，是应用的核心层。对 UI 层暴露领域 API，对内调用 Data 层完成数据存取与外部交互。Service 层是业务规则的唯一权威来源。

## 依赖规则

- 允许调用 `@data/*` 层提供的数据访问能力。
- 允许引用 `@types/*` 中的共享类型定义。
- 允许引用 `@utils/*` 中的纯函数工具。
- 禁止包含 JSX、模板或任何视图代码。
- 禁止直接操作 DOM（document、window 等浏览器 API）。
- 禁止被 UI 层绕过直接访问 Data 层。
- 模块间禁止循环依赖，跨域调用通过显式 import 实现。

## 目录结构

- `search/` — 搜索服务：文档检索、结果排序、过滤器应用。
- `progress/` — 学习进度服务：阅读状态、笔记管理、统计汇总。
- `glossary/` — 术语表服务：术语查询、词源检索、关联推荐。
- `code-runner/` — 代码运行服务：在线代码执行、结果回传。
- `navigation/` — 导航服务：文档关系图、面包屑、上下篇导航。

## 示例

```typescript
// 正确：Service 层组合 Data 层能力，返回领域模型
import { storage } from '@data/storage';
import type { DocProgress } from '@types/progress';

export async function getDocProgress(slug: string): Promise<DocProgress> {
  const raw = await storage.read<DocProgress>(`doc:${slug}`);
  return raw ?? createDefaultProgress(slug);
}
```

```typescript
// 错误：Service 层包含 JSX 模板
export function renderProgress() {
  return <div>{stats.completedDocs}</div>; // 禁止
}
```

## 迁移说明

本目录为 Phase 1.1 新建占位，现有 `src/lib/` 下的 `progress.ts`、`code-runner.ts`、`modules.ts` 等业务模块将在 Phase 1.4 拆分迁移至对应子目录。
