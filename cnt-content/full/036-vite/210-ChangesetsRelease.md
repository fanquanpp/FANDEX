---
order: 210
title: changesets 版本管理与发布
module: 'vite'
category: 前端技术
difficulty: intermediate
description: changesets 版本管理：变更记录、版本 bump、CHANGELOG 生成与 npm 发布流程
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/180-WorkspaceProtocol'
  - 'vite/190-CatalogManagement'
  - 'vite/220-MonorepoPractice'
prerequisites:
  - 'vite/170-WorkspaceSetup'
  - 'vite/180-WorkspaceProtocol'
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

它与 `workspace:` 协议发布转换（见《workspace 协议与内部依赖》）天然配合，形成从代码合并到 npm 上线的完整闭环。

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

按依赖拓扑顺序对"版本号高于 registry 中已有版本"的包执行 `pnpm publish`。发布时 pnpm 会把 `workspace:*` 转换为真实版本号（见《workspace 协议与内部依赖》），消费者可正常安装。

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

### 5.2 预发布模式（pre 模式）

大版本发布前通常要先放 `2.0.0-rc.0` 这类候选版本收集反馈。changesets 内置了"pre 模式"管理整个预发布周期：

```bash
pnpm changeset pre enter rc   # 进入预发布模式，模式名为 rc
pnpm changeset version        # 之后每次 version 都发 2.0.0-rc.N，并逐次递增
pnpm changeset pre exit       # 候选期结束，退出后下一个 version 直接发正式版
```

要点：进入 pre 模式后，所有被 changeset 标记的包按 `预发布` 规则提升版本（如 `2.0.0-rc.0` -> `2.0.0-rc.1`），期间积累的变更在退出时会自动"折叠"成正式版本号。整个进入/退出动作本身要产生一个 commit 入库，CI 上的发布流水线无需任何改动——它只认"有没有待处理的 changeset"。

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

## 9. 本篇小结

1. changesets 把发版拆成"开发期记录意图 + 发版期统一计算"两个环节：changeset 文件随 PR 入库，版本号与 CHANGELOG 由工具统一消费生成。
2. SemVer 级别选择是人的判断，版本号计算是机器的工作；`fixed` / `linked` 包组与 `pre` 预发布模式覆盖了多包联动的复杂场景。
3. `changesets/action` 把 version（开版本 PR）与 publish（npm 发布）串成标准流水线，版本变更与发布在 Git 历史中完全可追溯。
4. 发布后发现问题发修复版而不是撤回版本；每个 PR 带不带 changeset 是一次显式的发版决策。

## 10. 动手实践

1. **走通最小闭环**：在双包仓库中给 utils 记一个 minor changeset，合并后运行 `pnpm changeset version && pnpm changeset publish --dry-run`（或对私有包用 `pnpm pack` 替代真实发布），检查 CHANGELOG 与版本号变化。提示：`version` 之后先看 git diff 再决定是否继续。
2. **体验版本联动**：让 web 以 `workspace:*` 依赖 utils，给 utils 记 patch changeset 并 version，观察 web 的依赖声明是否被同步更新。提示：这正是 `updateInternalDependencies: patch` 的作用。
3. **演练 pre 模式**：进入 `pre enter next` 后连续 version 两次，观察 `-next.0` 到 `-next.1` 的递增；退出后再 version 一次，确认产出正式版本。提示：pre 期间的 changeset 会一直保留到退出时统一折叠。
