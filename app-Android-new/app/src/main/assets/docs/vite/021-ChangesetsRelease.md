---
order: 210
title: changesets 版本管理与发布
module: 'vite'
category: 前端技术
difficulty: intermediate
description: changesets 版本管理：变更记录、版本 bump、CHANGELOG 生成与 npm 发布流程
author: fanquanpp
updated: '2026-08-02'
related:
  - 'vite/018-WorkspaceProtocol'
  - 'vite/019-CatalogManagement'
  - 'vite/022-MonorepoPractice'
prerequisites:
  - 'vite/017-WorkspaceSetup'
  - 'vite/018-WorkspaceProtocol'
---


## 1. 从"图书再版"说起

### 1.1 一个出版社的困境

想象一家出版社（Monorepo）出版多本图书（包）。每次再版（发版），编辑（你）都要手工做一堆事：

- 每本书的版本号要改（漏改一本，旧版就还在卖）
- 每本书的"改版说明"（CHANGELOG）要写（漏写读者就不知道改了什么）
- 书 A 的内容引用了书 B，B 改版后 A 的引用也要同步更新（漏改就引用了不存在的版本）

**手工管理多包版本号的三个痛点**：漏改某个依赖该包的版本引用、CHANGELOG 缺失、版本号冲突。

### 1.2 changesets 的解法

**changesets 是 Monorepo 版本管理与发布的社区标准方案**。它把"发版"拆成两个环节：

1. **开发期**：开发者在 PR 中记录变更意图（changeset）——"我改了哪个包、什么级别的变更"
2. **发版期**：统一计算各包的新版本并生成 CHANGELOG——自动、可追溯

它与 `workspace:` 协议发布转换（见 004 篇）天然配合，形成从代码合并到 npm 上线的完整闭环。

## 2. 安装与配置

```bash
pnpm add -D @changesets/cli -w
pnpm changeset init
```

`init` 生成 `.changeset/config.json` 与 README。config.json 是发布行为的唯一配置入口：

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**关键字段**：

| 字段 | 含义 |
| :--- | :--- |
| `access: "public"` | 发布公开包（私有 scope 包需配合 npm 组织账号） |
| `baseBranch` | 主分支名，用于计算变更范围 |
| `updateInternalDependencies` | 内部依赖的 workspace 引用随版本变更同步更新的级别 |
| `fixed` / `linked` | 必须同版本发布的包组配置（谨慎使用） |

## 3. 记录变更：changeset add

### 3.1 交互式创建

```bash
pnpm changeset
# 或
pnpm changeset add
```

进入交互式界面：选择本次变更涉及哪些包 → 选择 bump 级别（major/minor/patch）→ 填写变更说明。完成后在 `.changeset/` 目录生成一个随机命名的 markdown 文件。

### 3.2 changeset 文件结构

```markdown
---
'@fandex/utils': minor
'@fandex/web': patch
---

新增 ID 格式化工具函数，修复 web 端日期显示问题。
```

- **frontmatter**：`包名: 级别` 声明各包的版本提升类型
- **正文**：变更说明，会被写入 CHANGELOG
- **互不冲突**：多个 PR 各带一个 changeset 文件

### 3.3 bump 级别选择（SemVer）

| 级别 | 触发条件 | 版本变化 |
| ---- | ---- | ---- |
| major | 破坏性变更（API 不兼容） | 1.0.0 → 2.0.0 |
| minor | 新增功能，向后兼容 | 1.0.0 → 1.1.0 |
| patch | 修复 bug，向后兼容 | 1.0.0 → 1.0.1 |

**关键**：遵循语义化版本（SemVer）。不破坏兼容的新特性用 minor，bug 修复用 patch；**破坏性 API 变更必须 major**——这是对使用者的承诺。

## 4. 版本管理：changeset version

发版时执行：

```bash
pnpm changeset version
```

**它做什么**：

1. 消费所有待处理的 changeset 文件
2. 更新各包 package.json 版本号
3. 生成/追加 CHANGELOG.md
4. 移除已处理的 changeset 文件
5. 如果包 A 被包 B 以 `workspace:*` 引用，B 的依赖版本引用会同步更新

```bash
git add .
git commit -m "chore: version packages"
```

**注意**：version 只是修改版本元数据，**不会发布**；版本变更应作为一个独立 commit 提交，通常由 CI 自动完成。

## 5. 发布：changeset publish

```bash
pnpm changeset publish
```

按依赖拓扑顺序对"版本号高于 registry 中已有版本"的包执行 `pnpm publish`。发布时 pnpm 会把 `workspace:*` 转换为真实版本号（见 004 篇），消费者可正常安装。

### 5.1 发布前置条件

```json
// 各包 package.json 中补充发布元信息
{
  "name": "@fandex/utils",
  "version": "1.2.3",
  "publishConfig": {
    "access": "public"
  }
}
```

- 私有 scope（`@fandex/*`）发布到 npm 默认私有，需在 `publishConfig` 中声明 `access: "public"`
- 需确认登录状态：pnpm 11 已原生实现登录/发布流程，不再依赖 npm CLI

## 6. CI 自动化：完整发布流水线

标准的发布流水线分为两个 Job：

### 6.1 PR 检查

PR 中必须包含 changeset（或标记为 no-release）；合并后触发版本 Job：

```yaml
# .github/workflows/release.yml 片段
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**工作流**：changesets/action 检测 main 上存在待处理 changeset 时 → 先执行 version（创建"版本发布"PR 或直接提交）→ 随后执行 publish 发布到 npm → 自动创建 GitHub Release。

## 7. 最佳实践

**第一**，每个 PR 都应附带 changeset；不涉及发版的改动（如文档）可运行 `pnpm changeset add --empty` 生成空 changeset 跳过发布。

**第二**，`fixed` 与 `linked` 配置用于"必须同版本发布"的包组（fixed 强制同版本、linked 仅同步 bump），谨慎使用。

**第三**，发布 tag：`changeset version` 默认不打 Git tag，可在 CI 中 `pnpm changeset tag` 补打，便于回滚定位。

**第四**，把"是否需要发版"当成设计决策：每个 PR 合并前想清楚"这次变更影响哪些包、什么级别"——人的判断力花在级别上，版本号计算交给工具。

## 8. 常见误区

**误区一：changesets 是"发版工具"而已。** → 它更是"变更记录系统"——让每次变更的影响可追溯、可审计，这是 Monorepo 协作的根基。

**误区二：忘记加 changeset 没关系。** → 没加 changeset 的变更不会被发版，改的东西永远进不了 npm——CI 应当强制检查。

**误区三：patch 也能包含新功能。** → 语义化版本的核心承诺：patch 只修 bug。塞入新功能会破坏使用者的版本预期。

**误区四：发布后发现问题只能回滚版本。** → 正确做法是发一个**修复版本**（如 1.2.4），而不是撤回已发布的 1.2.3（npm 不允许同版本覆盖）。
