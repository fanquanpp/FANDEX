---
order: 400
title: Vue 3.5 生态版本对照
module: 'vue3'
category: 前端技术
difficulty: beginner
description: Vue 3.5 核心与周边生态的最新稳定版本、Node 要求与升级要点。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'vue3/001-OverviewEnv'
  - 'vue3/036-Vue3ViteBuildConfig'
  - 'vue3/037-Vue3NewFeatures3435'
prerequisites:
  - 'vue3/001-OverviewEnv'
---

## 概述

Vue 3 生态由核心（vue）、路由（vue-router）、状态管理（pinia）、构建（vite）、测试（vitest、@vue/test-utils）与工具链（create-vue、vue-tsc、Vue - Official）组成。它们各自独立发版，版本号并不对齐，因此在创建新项目或升级旧项目前，先核对一份"当前最新稳定版本"清单可以避免安装到过时主版本。本文以 2026-08 的 npm 稳定版为准，整理版本对照、Node 要求与升级顺序。

## 版本对照表

| 包 | 当前稳定版 | 作用 | 关键依赖要求 |
| --- | --- | --- | --- |
| `vue` | 3.5.x | 核心框架 | TypeScript 任意版本 |
| `create-vue` | 3.x | 官方脚手架 | Node `^22.18.0 || >=24.12.0` |
| `vue-router` | 5.x | 路由 | peer `vue ^3.5.34` 或 `^4` |
| `pinia` | 4.x | 状态管理 | peer `vue ^3.5.11`、TypeScript `>=5.6` |
| `vite` | 8.x | 构建工具 | Node `^20.19.0 || >=22.12.0` |
| `@vitejs/plugin-vue` | 6.x | Vue 单文件组件编译 | peer `vite ^5 ~ ^8`、`vue ^3.2.25` |
| `vitest` | 4.x | 单元测试 | Node `^20 || ^22 || >=24`，peer `vite ^6 ~ ^8` |
| `@vue/test-utils` | 2.4.x | 组件测试工具 | peer `vue 3.x` |
| `vue-tsc` | 3.x | SFC 类型检查 | peer `typescript >=5.0`（兼容 7.x） |
| `typescript` | 7.x | 类型系统与编译器 | Node `>=16.20` |

版本号以 npm registry 的 `latest` 标签为准；上表是"主版本 + 当前线"的对照，具体补丁版本以安装时 `npm view <包> version` 输出为准。

## Node.js 版本要求

不同工具对 Node 的要求不同，安装前先确认：

- create-vue：`^22.18.0 || >=24.12.0`
- Vite 8：`^20.19.0 || >=22.12.0`
- Vitest 4：`^20.0.0 || ^22.0.0 || >=24.0.0`

结论：统一使用 Node 22 LTS 或 24 LTS 即可同时满足全部要求；Node 18 已不在官方支持范围内。

## 新建项目

官方脚手架会自动安装匹配的版本组合：

```bash
npm create vue@latest
```

交互勾选 TypeScript、Vue Router、Pinia、Vitest 后，`package.json` 中即为当前稳定主版本。手动安装等价组合：

```bash
npm install vue@latest vue-router@latest pinia@latest
npm install -D vite@latest @vitejs/plugin-vue@latest typescript@latest vue-tsc@latest vitest@latest @vue/test-utils@latest
```

## 升级旧项目

升级顺序建议"自底向上"：

1. Node.js 升到 22 LTS 或 24 LTS。
2. 升级 `vite` 与 `@vitejs/plugin-vue`，确认构建通过。
3. 升级 `vue` 到 3.5.x，确认应用运行正常。
4. 升级 `vue-router` 与 `pinia`，按各自官方迁移指南处理破坏性变更。
5. 升级 `typescript` 与 `vue-tsc`，跑一遍 `vue-tsc --noEmit`。
6. 最后升级 `vitest` 与 `@vue/test-utils`，跑完整测试。

每一步都先提交再继续，出现问题时可以快速定位是哪个主版本引入的。主版本升级前，先读对应仓库的迁移指南（vuejs/router 与 vuejs/pinia 均在各自文档仓库维护迁移章节）。

## 版本选择原则

- 新项目直接使用 latest 稳定版，不要回退到旧主版本。
- 旧项目不要跨多个主版本一次性升级，逐个主版本过迁移指南。
- 锁定依赖使用 `package.json` 的精确版本或 lockfile，不要依赖"记忆中的版本号"。
- 关注 peerDependencies：例如 pinia 4 要求 `vue ^3.5.11`，如果项目还在 Vue 3.4，应先升级 Vue。

## 小结

生态版本对照的核心是"先看 peer 要求，再定升级顺序"。Node 22/24 LTS、Vue 3.5、Router 5、Pinia 4、Vite 8 是当前稳定组合；创建项目用 create-vue，升级项目按"构建 -> 核心 -> 路由状态 -> 类型 -> 测试"的顺序逐层推进。
