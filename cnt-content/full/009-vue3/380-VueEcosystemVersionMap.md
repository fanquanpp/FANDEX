---
order: 380
title: Vue 3.5 生态版本对照
module: 'vue3'
category: 前端技术
difficulty: beginner
description: Vue 3.5 核心与周边生态的最新稳定版本、Node 要求与升级要点。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/010-OverviewEnv'
  - 'vue3/270-Vue3ViteBuildConfig'
  - 'vue3/360-Vue3NewFeatures3435'
prerequisites:
  - 'vue3/010-OverviewEnv'
---

## 概述

Vue 3 生态由核心（vue）、路由（vue-router）、状态管理（pinia）、构建（vite）、测试（vitest、@vue/test-utils）与工具链（create-vue、vue-tsc、Vue - Official）组成。它们各自独立发版，版本号并不对齐，因此在创建新项目或升级旧项目前，先核对一份"当前最新稳定版本"清单可以避免安装到过时主版本。本文以 2026-09 的 npm 稳定版为准，整理版本对照、Node 要求与升级顺序。

核心状态一句话：`vue` 稳定线是 3.5.x；3.6 处于 RC 阶段（核心变化是 Vapor 模式，已实现与虚拟 DOM 模式的功能对等），生产项目在稳定版发布前继续用 3.5.x。

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

## 周边生态地图

除核心工具链外，选型时常见的一圈生态（主版本线，具体以各项目发布页为准）：

| 生态位 | 项目 | 现状要点 |
| --- | --- | --- |
| 全栈元框架 | Nuxt | 4.x 已稳定（2025-07 发布 4.0，当前 4.4.x 线），Nuxt 5 开发中；Nuxt 3 已停止新特性开发 |
| 组件库 | Element Plus / Naive UI / Vuetify / PrimeVue / shadcn-vue | 均以 Vue 3 + 组合式 API 为基线，升级 Vue 大版本前先确认组件库兼容声明 |
| 请求/数据层 | TanStack Query (Vue) / Pinia Colada | 服务端状态管理成为新共识，取代手写"请求 + 缓存"组合函数 |
| 状态持久化 | pinia-plugin-persistedstate | 与 Pinia 3/4 保持同步发版 |
| 调试 | Vue DevTools | 浏览器扩展 + 独立应用双形态，跟随核心版本演进 |
| 编辑器支持 | Vue - Official（原 Volar） | VS Code 扩展 + vue-tsc 命令行，二者版本需配套升级 |

## Vue 3.6 与 Vapor：观望策略

3.6 的核心是 Vapor 模式——编译期直接生成 DOM 操作、跳过虚拟 DOM。对升级决策的影响：

1. **组件 API 不变**：`ref`、`<script setup>`、defineModel 等写法在两种模式下一致，存量代码几乎零改动。
2. **兼容性风险在底层依赖**：依赖 `getCurrentInstance` 等内部 API 的库在 Vapor 下可能不兼容，升级前核对组件库与工具库的兼容声明。
3. **渐进式启用**：3.6 支持两种编译模式共存，可先在非关键路径组件上试用。
4. **时间线**：以官方 Releases 页与博客公告为准，不要根据社区猜测排期。

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

交互勾选项与生态的对应关系，便于按需取舍：

| 勾选项 | 引入的依赖 | 建议 |
| --- | --- | --- |
| TypeScript | typescript + vue-tsc | 新项目默认勾选，类型即文档 |
| JSX | @vitejs/plugin-vue-jsx | 仅在确有 JSX 需求（如动态渲染库）时勾选 |
| Router | vue-router | 多页面应用必选 |
| Pinia | pinia | 跨组件共享状态时勾选 |
| Vitest | vitest + @vue/test-utils | 组件级单测 |
| E2E | Playwright / Cypress 二选一 | 核心链路的端到端保障 |
| ESLint / Prettier | 代码质量与格式 | 建议全选，保持团队一致 |

勾选 TypeScript、Vue Router、Pinia、Vitest 后，`package.json` 中即为当前稳定主版本。手动安装等价组合：

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

## 如何核实"当前版本"

本文的版本对照会过时，掌握核实方法比记住数字更重要：

```bash
# 查某个包的 latest 版本
npm view vue version
npm view vue-router version

# 查全部 dist-tag（区分 latest / next / beta / rc）
npm view vue dist-tags

# 列出项目里过时的依赖
npm outdated
```

原则：`latest` 标签 = 稳定版；`next`/`beta`/`rc` 标签是预发布，生产项目不追。核对版本 + 阅读 peer 要求 + 查迁移指南，三步走完再动手升级。

## 升级常见问题排查

| 症状 | 常见原因 | 处理 |
| --- | --- | --- |
| 安装时报 peer dependency 冲突 | 某依赖还没适配新主版本（如 Vite 大版本刚发布） | 等依赖跟进，或暂时锁旧版本并记录原因 |
| 升级后类型报错铺天盖地 | typescript / vue-tsc 与依赖的类型定义不配套 | 按本文顺序先升 typescript 与 vue-tsc，再重跑 `vue-tsc --noEmit` |
| DevTools 面板空白 | DevTools 与核心版本相差过大 | 更新浏览器扩展或独立应用到最新版 |
| 组件库行为异常 | 组件库对 Vue 小版本有 peer 上下限 | 查组件库更新日志，升级到适配当前 Vue 的版本 |
| 升级后构建产物行为不一致 | Vite/Rolldown 大版本带来的打包差异 | 先在 CI 里跑完整测试与 qa 检查，再本地合并 |

排查的通用原则：保留可复现的最小仓库或分支，升级问题按"Node -> 构建 -> 核心 -> 路由状态 -> 类型 -> 测试"的顺序二分定位。

## 小结

生态版本对照的核心是"先看 peer 要求，再定升级顺序"。Node 22/24 LTS、Vue 3.5、Router 5、Pinia 4、Vite 8 是当前稳定组合；创建项目用 create-vue，升级项目按"构建 -> 核心 -> 路由状态 -> 类型 -> 测试"的顺序逐层推进。
