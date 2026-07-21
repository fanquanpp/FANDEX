# 类型定义

## 职责

集中存放全站共享的 TypeScript 类型定义，作为各层之间的类型契约。本目录是领域模型的唯一权威来源，所有跨层数据传递必须使用此处定义的类型。

## 依赖规则

- 仅导出 `type` 与 `interface`，不包含任何运行时代码。
- 禁止 import 运行时模块（Service、Data、UI 层代码）。
- 允许在类型文件内部互相引用（如 `doc.ts` 引用 `module.ts`）。
- 禁止使用 `any`、`unknown` 类型。
- 所有类型必须配备中文 JSDoc 注释，说明用途与字段含义。

## 目录结构

- `module.ts` — 模块相关类型（Module、ModuleStats、Difficulty）。
- `doc.ts` — 文档相关类型（Doc、DocContent、OutlineItem）。
- `exercise.ts` — 习题相关类型（Exercise 及其变体、Quiz、ExerciseAttempt）。
- `reference.ts` — 参考文献类型（Reference、Citation）。
- `glossary.ts` — 术语表类型（GlossaryEntry）。
- `progress.ts` — 学习进度类型（DocProgress、ProgressSummary、ProgressExport）。
- `search.ts` — 搜索结果类型（SearchResult、SearchRequest、SearchResponse）。
- `index.ts` — 统一导出桶文件。

## 使用示例

```typescript
// 通过 @types/* 别名引入
import type { Doc, ModuleStats } from '@types/index';

// 或直接引入具体文件
import type { Doc } from '@types/doc';
```

## 迁移说明

本目录在 Phase 1.1 创建，包含全部共享类型定义。后续阶段新增类型时，必须在此目录下创建对应文件并更新 `index.ts` 导出。
