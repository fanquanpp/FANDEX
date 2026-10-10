---
order: 220
title: catalog 依赖目录管理
module: 'vite'
category: 前端技术
difficulty: intermediate
description: '以 FANDEX 仓库 60 多个依赖的真实 catalog 为主线：pnpm-workspace.yaml 集中记账、catalog 协议与具名目录引用、catalogMode 三档策略、overrides 协同、发布时的协议替换，以及改版本不生效等高频问题对策。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vite/170-WorkspaceSetup'
  - 'vite/180-WorkspaceProtocol'
  - 'vite/210-ChangesetsRelease'
  - 'vite/220-MonorepoPractice'
prerequisites:
  - 'vite/170-WorkspaceSetup'
  - 'vite/160-PnpmCore'
---

## 学习目标

- [ ] 能读懂 FANDEX 根目录 `pnpm-workspace.yaml` 里的 catalog 结构，说出它与各包 `package.json` 的分工
- [ ] 能用 `catalog:` 与 `catalog:<名称>` 引用集中定义的版本，并解释发布时协议如何被替换
- [ ] 能说出 `catalogMode` 三档（manual / prefer / strict）各自的适用阶段
- [ ] 能处理「改了 catalog 版本但依赖没变」「发布产物残留 catalog:」两类高频故障
- [ ] 能按「内部包用 workspace:、外部依赖用 catalog:」的分工给一个 monorepo 定引用策略

## 一句话理解

> catalog 是 monorepo 的「统一采购清单」：所有包对同一个 npm 依赖的版本要求，集中写在 `pnpm-workspace.yaml` 一处，各包用 `catalog:` 协议引用。升级只改清单一行，全工作空间同步生效——版本漂移从机制上消失。

## 0. 真实场景：FANDEX 的依赖账本

FANDEX 是一个 pnpm 11 的 monorepo，五个包（web、desktop、desktop-portable、shared 三个子包）。astro、react、vite、typescript 这类框架级依赖，如果每个包各写各的版本，很快就出现「web 用 Vite 8、desktop 还在 Vite 6」的漂移——而这两端要共享同一批内容与组件。

FANDEX 的解法在根目录 `pnpm-workspace.yaml`（真实文件，节选）：

```yaml
packages:
  - 'app-web'
  - 'app-desktop'
  - 'app-desktop-portable'
  - 'shd-shared'
  - 'shd-shared/tokens'
  - 'shd-shared/utl-utils'
  - 'shd-shared/assets'

catalog:
  astro: ^7.3.3
  react: ^19.3.0
  vite: ^8.3.0
  typescript: ^6.0.3
  tailwindcss: ^4.3.3
  zod: ^4.6.5
  '@astrojs/react': ^6.0.6
  # ……共 60 余个条目，从框架到 @types/* 全部集中在此
```

对应地，`app-web/package.json` 里不出现任何具体版本号：

```json
{
  "name": "@fandex/web",
  "dependencies": {
    "astro": "catalog:",
    "react": "catalog:",
    "zod": "catalog:",
    "@fandex/shared-assets": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/react": "catalog:"
  }
}
```

注意最后一行 `workspace:*`——它和 `catalog:` 是分工不同的两个协议：**catalog 管外部 npm 依赖的版本，workspace 管内部兄弟包的引用**。本篇只讲前者，后者见 [180：workspace 协议](/vite/180-WorkspaceProtocol)。

## 1. 动手：把版本记账搬到 catalog

### 1.1 定义默认目录

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^19.0.0
  typescript: ^6.0.3
  vite: ^8.3.0
```

顶层 `catalog` 字段定义的是名为 `default` 的目录；版本范围写法与 package.json 完全等价。

### 1.2 引用：catalog: 是 catalog:default 的简写

```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

`catalog:` 协议可用于 dependencies、devDependencies、peerDependencies、optionalDependencies，以及 pnpm-workspace.yaml 的 overrides。执行 `pnpm install` 后，锁文件里记录的是解析后的真实版本，各包拿到的具体版本保持一致。

### 1.3 具名目录：迁移期的「双轨」

当不同包确实需要不同版本（典型是框架大版本迁移期），用复数 `catalogs` 定义具名目录：

```yaml
catalog:
  react: ^19.0.0

catalogs:
  react18:
    react: ^18.2.0
```

```json
{ "dependencies": { "react": "catalog:react18" } }
```

默认目录与具名目录共存；迁移完成后删除具名目录，把该包切回 `catalog:`，再全量安装收敛。

### 1.4 升级：只改一处，然后重新解析

把 FANDEX 的 vite 从 `^8.3.0` 升到 `^8.4.0` 的完整动作：

```bash
# 1. 改 pnpm-workspace.yaml 里的版本范围（唯一要改的文件）
# 2. 让全工作空间按新范围重新解析
pnpm install
# 或者显式刷新
pnpm -r update
# 3. 验证各包解析到同一版本
pnpm why vite
```

注意第 2 步不可省：catalog 只是「账本」，锁文件才是「实际执行记录」，账本改了不重新安装，依赖不会动——这正是第 4 节的第一条高频故障。

## 2. 讲为什么：catalogMode 与发布语义

### 2.1 catalogMode：往账本里记账的三种姿势

`catalogMode` 控制 `pnpm add` 时新依赖如何与默认目录互动，pnpm 11 中默认 `manual`：

| 模式 | 行为 | 适用场景 |
| --- | --- | --- |
| manual（默认） | `pnpm add` 正常写入版本范围，不自动维护 catalog | 起步阶段、手工维护账本 |
| prefer | 优先用 catalog 中已有版本；不在目录中时回退为普通写法 | 从零散版本向 catalog 迁移的过渡期 |
| strict | 只允许使用 catalog 中已定义的依赖，越界直接报错 | 团队强约束，杜绝绕过账本 |

strict 模式下，某个包 `pnpm add` 一个 catalog 里没有的依赖，安装直接失败——版本漂移从「靠 code review 发现」变成「工具当场拦截」。对应的纪律是：**新依赖先在 pnpm-workspace.yaml 登记版本，再到包里引用**：

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.0.0
  typescript: ^6.0.3

catalogMode: strict
```

FANDEX 保持默认 manual：仓库只有一位主要维护者，账本纪律靠习惯与内容审计脚本保障；多人协作、频繁装依赖的仓库才更需要 strict。

### 2.2 发布时的协议替换

与 `workspace:` 协议同款机制：`pnpm publish` / `pnpm pack` 时，`catalog:` 被替换为真实版本范围：

```json
// 发布前（仓库内）
"react": "catalog:react18"
// 发布后（registry 上的 tarball）
"react": "^18.2.0"
```

消费者从 registry 安装时拿到标准版本范围，与 npm/yarn 完全兼容；仓库内文件不变。**因此发布必须走 pnpm 自己的命令**（或 changesets 触发），手改后 `npm publish` 会把 `catalog:` 原样发出去，消费者安装直接报错。

### 2.3 与 overrides 协同：账本之外的「强制执行」

catalog 定义「我们想用什么」，overrides 强制「依赖树里实际解析成什么」，两者可以互相引用：

```yaml
# FANDEX pnpm-workspace.yaml 真实节选
overrides:
  brace-expansion: ^5.0.8
  'js-yaml@4': ^4.3.2
  'nanoid@3': ^3.3.18
```

这组 overrides 是安全驱动：传递依赖里的旧版本有已知漏洞，用 overrides 强制抬到修复版。写法上 `包名@主版本范围: 版本` 可以只针对特定大版本生效，避免「一刀切抬高」破坏不兼容的旧依赖。安全修复的版本号同样可以写成 `catalog:` 引用，保持单一来源。

## 3. 坑点与自检

| 现象 / 报错 | 常见原因 | 对策 |
| --- | --- | --- |
| 安装报「依赖未在 catalog 中定义」 | strict 模式下引用了账本外的依赖 | 先在 catalog 登记，再安装 |
| 改了 catalog 版本但依赖没变 | 锁文件未按新范围重新解析 | `pnpm install` 或 `pnpm -r update`，提交更新后的 lockfile |
| `catalog:react-18` 安装失败 | 具名目录名拼错（键不存在） | 核对 `catalogs` 下的键名，注意连字符 |
| 发布包里残留 `catalog:` | 用了 npm publish 等非 pnpm 发布方式 | 统一 `pnpm publish` / changesets |
| CI 里 `--frozen-lockfile` 失败 | 改了 catalog 忘了同步 lockfile | 账本与锁文件必须同一个 commit 提交 |

自检清单：

- [ ] 框架级依赖（astro/react/vite/typescript 及其 @types）是否全部在 catalog 中？
- [ ] 本地能装、CI 报 frozen-lockfile 错误？检查 lockfile 是否随 catalog 一起提交。
- [ ] 团队是否约定了 catalogMode？新依赖的「先记账后引用」流程是否写进了 CONTRIBUTING？
- [ ] 发布脚本是否全部经过 pnpm（或 changesets），没有裸 `npm publish`？

## 4. 常见误区

- **「catalog 会强制所有包用完全相同的版本」**——catalog 定义的是版本范围；同一范围通常解析出一致的具体版本，要「强制」语义请用 strict 模式或收窄范围。
- **「升级版本要改每个包」**——只改 pnpm-workspace.yaml 一处，然后重新安装/更新。
- **「catalog 只能管 dependencies」**——dependencies、devDependencies、peerDependencies、optionalDependencies、overrides 全都可以用。
- **「用了 catalog 就不需要 workspace 协议」**——分工不同：catalog 管外部 npm 包的版本，workspace 管内部包引用，配合才完整（FANDEX 的 `@fandex/*` 包全部走 `workspace:*`）。

## 5. 练习

1. 在 FANDEX 仓库执行 `pnpm why react`（不要真跑安装），从输出确认 web 与 desktop 解析到的 react 版本是否一致；再打开两个包的 package.json，验证它们都写的 `catalog:`。
2. 给 1.4 节的升级流程补一步「回滚」：如果 ^8.4.0 出现构建问题，描述把工作空间还原到 ^8.3.0 的最小操作序列。
3. 造一个双轨迁移场景：默认目录 `react: ^19.0.0`，具名目录 `legacy` 给 `^18.2.0`，让一个临时包用 `catalog:legacy`；写出验证两轨互不干扰的检查命令。
4. （挑错）下面这个 CI 流程有一个必然失败的环节，指出来并修正：

   ```yaml
   steps:
     - run: sed -i 's/vite: ^8.3.0/vite: ^8.4.0/' pnpm-workspace.yaml
     - run: pnpm install --frozen-lockfile
     - run: pnpm -r build
   ```

## 6. 下一步

- [180：workspace 协议](/vite/180-WorkspaceProtocol)：`workspace:*` 与 catalog 的分工详解；
- [210：Changesets 发布流程](/vite/210-ChangesetsRelease)：changesets 如何与 catalog/ workspace 协议协同发包；
- [220：Monorepo 实战](/vite/220-MonorepoPractice)：把本篇的账本放进完整的工程实践；
- 本仓库 `pnpm-workspace.yaml` 与根 `package.json`：`packageManager` 字段锁死 pnpm 11.15.1、`install:all` 脚本用 `--frozen-lockfile`——真实仓库里账本一致性的两道保险。
