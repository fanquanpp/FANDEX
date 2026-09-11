---
order: 190
title: catalog 依赖目录管理
module: 'vite'
category: 前端技术
difficulty: intermediate
description: catalog 协议：pnpm-workspace.yaml 目录配置、catalogMode 与依赖版本统一
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/170-WorkspaceSetup'
  - 'vite/180-WorkspaceProtocol'
  - 'vite/210-ChangesetsRelease'
prerequisites:
  - 'vite/170-WorkspaceSetup'
  - 'vite/160-PnpmCore'
---


## 1. 从"公司统一采购"说起

### 1.1 版本漂移的烦恼

想象一家公司有多个部门（多个包），每个部门自己采购办公用品（依赖）。

**没有统一采购时**：A 部门买了"Windows 10"的电脑、B 部门买了"Windows 11"、C 部门还在用"Windows 7"。运维（你）想统一系统，得一个个部门去沟通、升级——而且升级了 A 部门，B 部门可能不兼容。

**这就是版本漂移**：Monorepo 中多个包使用同一依赖时，若各自手写版本，容易出现一个包用 `react@^18.3.0`、另一个用 `react@^19.0.0` 的局面。

### 1.2 catalog 的解法

**catalog（依赖目录）是 pnpm 的工作空间特性**：把常用依赖的版本范围**集中定义**在 `pnpm-workspace.yaml` 中，各包通过 `catalog:` 协议引用。它是依赖版本的"**单一事实来源**"。

- 所有包指向同一份版本定义
- 升级时只需改一处（pnpm-workspace.yaml）
- 全工作空间同步生效

## 2. catalog 的配置与引用

### 2.1 定义默认 catalog

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^19.0.0
  typescript: ^5.7.0
  vite: ^8.0.0
```

**要点**：

- 顶层 `catalog` 字段定义的是名为 `default` 的目录
- 版本范围使用语义化版本写法，与 package.json 中直接书写完全等价

### 2.2 通过 catalog: 协议引用

```json
// packages/web/package.json
{
  "name": "@fandex/web",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**要点**：

- `catalog:` 是 `catalog:default` 的简写，pnpm 解析时等价于写上 `^19.0.0`
- `catalog:` 协议可用于 dependencies、devDependencies、peerDependencies、optionalDependencies 以及 pnpm-workspace.yaml 的 overrides

### 2.3 具名 catalog（catalogs）

当不同包需要不同版本的同一依赖（如迁移期共存）时，可用复数 `catalogs` 定义具名目录：

```yaml
catalog:
  react: ^16.14.0

catalogs:
  react17:
    react: ^17.0.2
  react18:
    react: ^18.2.0
```

```json
{
  "dependencies": {
    "react": "catalog:react18"
  }
}
```

**要点**：`catalog:react18` 显式指定使用名为 react18 的目录。默认目录与具名目录可以共存；迁移完成后再逐步收敛到单一版本。

## 3. catalogMode：严格模式

`catalogMode` 控制执行 `pnpm add` 时依赖如何写入默认目录，pnpm 11 中默认值为 `manual`：

| 模式 | 行为 | 适用场景 |
| ---- | ---- | ---- |
| manual（默认） | pnpm add 正常写入版本范围，不自动维护 catalog | 起步阶段、习惯手写 catalog |
| strict | 只允许使用 catalog 中已定义的依赖版本，超出范围直接报错 | 强约束团队统一版本 |
| prefer | 优先使用 catalog 中版本；不存在时回退为普通版本范围 | 渐进迁移 |

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.0.0
  typescript: ^5.7.0

catalogMode: strict
```

**strict 模式的价值**：如果某个包 `pnpm add` 了 catalog 中不存在的依赖（或不在目录版本范围内），安装直接失败——**从工具层面杜绝版本漂移**。`prefer` 适合从零散版本向 catalog 迁移的过渡期。

### 3.1 手动添加目录条目

strict 模式下添加新依赖时，先手动在 catalog 中登记版本，再在各包中用 `catalog:` 引用：

```bash
# 给指定包添加 catalog 中已存在的依赖
pnpm add react --filter @fandex/web
# 全部更新到 catalog 定义的最新范围
pnpm -r update
```

**要点**：`pnpm update` 会按 catalog 中的范围更新 lockfile；版本范围的变更只需改 pnpm-workspace.yaml 一处，再执行一次 update 即可让整个工作空间同步。

## 4. 在 overrides 中使用 catalog

```yaml
# pnpm-workspace.yaml
overrides:
  lodash: catalog:
  react: catalog:react18
```

**要点**：overrides 强制统一依赖树中某包的解析版本，常用于修复安全漏洞或处理依赖冲突；catalog 协议让 overrides 与包声明保持同一版本来源。

## 5. 发布时的版本转换

与 `workspace:` 协议类似，`pnpm publish` 或 `pnpm pack` 时，`catalog:` 协议会被替换为 catalog 中定义的版本范围：

```json
// 发布前
"react": "catalog:react18"
// 发布后
"react": "^18.2.0"
```

**要点**：转换保证消费者从 registry 安装时拿到的是标准版本范围，与其他包管理器完全兼容。仓库内文件不受影响。

## 6. 最佳实践

**第一**，框架级依赖（react、vue、typescript、vite）优先进默认 catalog，确保全工作空间一致。

**第二**，严格模式下新依赖先进 catalog 再引用，避免绕过统一版本管理。

**第三**，迁移旧项目时用 `prefer` 模式过渡，逐步收敛，再切回 `manual` 或 `strict`。

**第四**，catalog 与 workspace 协议搭配使用，分工明确：

| 引用对象 | 用什么协议 |
| :--- | :--- |
| 内部包引用（兄弟包） | `workspace:*` |
| 外部依赖版本（npm 包） | `catalog:` |

## 7. 常见误区

**误区一：catalog 会强制所有包用完全相同的版本。** → catalog 定义的是"版本范围"（如 `^19.0.0`），同一范围解析出的具体版本一致；需要强制锁定时用 strict 模式。

**误区二：升级版本要改每个包。** → 只需改 `pnpm-workspace.yaml` 中的 catalog 一处，然后 `pnpm -r update`。

**误区三：catalog 只能放 dependencies。** → 它可以用于 dependencies、devDependencies、peerDependencies、overrides 等所有依赖位置。

**误区四：用了 catalog 就不需要 workspace 协议了。** → 两者分工不同：catalog 管"外部依赖版本"，workspace 管"内部包引用"，配合使用才完整。

## 8. 常见报错与对策

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| `catalog: 反应不到对应条目`（安装时报某依赖未在 catalog 中定义） | strict 模式下引用了 catalog 不存在的依赖 | 先在 pnpm-workspace.yaml 的 catalog 里登记该依赖，再执行安装 |
| 改了 catalog 版本但依赖没变 | lockfile 已按旧范围解析，且范围内版本未强制刷新 | 执行 `pnpm -r update` 让全工作空间按新范围重新解析 |
| 具名目录拼错：`catalog:react-18` 安装失败 | `catalogs` 下没有这个名字 | 核对 pnpm-workspace.yaml 中 `catalogs` 的键名，注意连字符 |
| 发布的包里还残留 `catalog:` 协议 | 用了非 pnpm 的发布方式（如手改后 `npm publish`） | 统一用 `pnpm publish`（或 changesets 触发），由它在打包时完成协议替换 |
| 只想升级某一个包的某依赖 | 全局 update 波及面大 | 用 `pnpm -F <包名> update <依赖>` 定向更新 |

## 9. 本篇小结

1. catalog 是"外部依赖版本的单一事实来源"：定义集中在一处 pnpm-workspace.yaml，引用用 `catalog:`（默认目录）或 `catalog:<名称>`（具名目录）。
2. `catalogMode` 三档各有定位：`manual` 手工维护、`prefer` 渐进迁移、`strict` 工具强制统一；strict 是防版本漂移的终极手段。
3. catalog 管"外部 npm 依赖"，`workspace:` 协议管"内部包引用"，两者分工互补、配合使用。
4. 发布时 pnpm 自动把 `catalog:` 替换为真实版本范围，仓库内文件不变，消费者无感知。

## 10. 动手实践

1. **搭建统一版本目录**：把一个多包仓库的 react、typescript、vite 全部迁到 catalog，运行 `pnpm -r update` 后用 `pnpm why react` 验证各包解析到同一版本。提示：迁移前先 grep 各包 package.json，找出全部版本写法。
2. **体验 strict 的拦截**：开启 `catalogMode: strict` 后，故意在某个包里 `pnpm add` 一个 catalog 外的新依赖，观察报错；再把依赖登记进 catalog 重试。提示：报错信息会明确指出"未在 catalog 中定义"。
3. **具名目录演练**：为旧版本迁移造一个 `catalogs: { legacy: { react: ^17.0.2 } }`，让一个待迁移包临时用 `catalog:legacy`，验证默认目录与具名目录互不干扰。提示：迁移完成后删除具名目录并重新 update 收敛。
