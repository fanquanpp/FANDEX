---
order: 50
title: 包管理与工作区
module: 'bun'
category: 后端技术
difficulty: beginner
description: bun install 为什么快：bun.lock、workspaces 与可复现安装。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'bun/002-BunQuickStart'
  - 'bun/004-AdvancedRoadmap'
prerequisites:
  - 'bun/002-BunQuickStart'
  - 'bun/004-AdvancedRoadmap'
---

# 包管理与工作区

`bun install` 是很多人接触 Bun 的第一个命令：同样的 package.json，比 npm 快一个数量级。速度只是表象，本篇要讲清楚三件更持久的事：锁文件如何保证"每个人、每次、每台机器装出同一份依赖"；workspaces 如何用最小配置搭起 monorepo，让平台前端、票务后端与共享类型同仓演进；以及 Bun 对生命周期脚本的默认拦截如何挡住一类供应链攻击。008 篇会对整个 bun 模块做收官总结，009 篇展开 SQLite 与 S3 等内置能力，本篇聚焦"依赖装得快、装得稳"这一站。

## 前置知识

- [Bun 快速入门：项目、依赖与测试](/bun/002-BunQuickStart)：已经用 `bun init` 建过项目、用 `bun add` 装过依赖。
- [Bun 概览](/bun/001-BunOverview)：理解 Bun"一体多面"的定位，包管理器只是内置能力之一。
- [进阶学习路线图](/bun/004-AdvancedRoadmap)：了解包管理与工作区在路线图中的位置。

## 学习目标

1. 能说出 bun install 快的三个来源，并与 npm/pnpm 的安装策略对比。
2. 会用 bun.lock 与 `--frozen-lockfile` 实现可复现安装。
3. 能用 workspaces 搭一个最小 monorepo，并用 `workspace:` 协议引用内部包。
4. 理解生命周期脚本默认拦截策略，会管理 trustedDependencies。
5. 掌握 bun pm 系列命令的日常用法。

## 1. 安装速度来源与 npm/pnpm 对比

```bash
bun install          # 安装全部依赖：并行解析 + 缓存硬链接
bun add zod          # 添加依赖并写入 package.json
bun remove lodash    # 移除依赖
bun update zod       # 更新到 semver 范围内最新
```

速度来自三件事的叠加：一是安装器用 Zig 写成、单进程内完成解析与下载的并行调度，没有 npm 那种多阶段串行流水线；二是全局缓存加硬链接——同一个包的同一版本在磁盘上只存一份，node_modules 里只是指向缓存的硬链接，重复项目几乎零拷贝；三是解析与下载重叠进行，边收边装。npm 把文件复制进每个项目的 node_modules，磁盘占用与安装时长都线性放大；pnpm 同样采用中央 store 加链接的思路，Bun 的差别在于把这一策略与运行时、测试器做进了同一个二进制，省去工具链之间的启动开销。

**讲解：**

1. 三家对比一句话：npm 稳但慢（复制式安装），pnpm 快且省磁盘（store + 符号链接），Bun 与 pnpm 同思路但更快（单二进制、更激进的并行）。
2. node_modules 的最终结构与 npm 兼容（可提升的包照常提升），绝大多数项目直接切换无感。
3. 速度差异在冷缓存与 CI 上最明显：缓存命中时 bun install 常常秒级完成。
4. 速度红利也依赖锁文件：缓存命中的依据是锁文件里的精确版本，锁文件稳定时重复安装几乎是纯本地链接操作，网络因素被完全排除在外。
5. 切换成本评估：package.json、semver 范围、node_modules 布局全部兼容，团队通常"直接换命令"就能工作；个别依赖的脚本行为差异按第 4 节的信任策略处理。

## 2. bun.lock 与可复现安装

package.json 里的 `^1.2.0` 只是一个范围，不同时间解析可能落到不同小版本。bun.lock 记录实际解析出的精确版本与完整性哈希，是"团队、CI、生产三处一致"的契约。

```json
// package.json —— 团队约定：CI 一律冻结安装
{
  "name": "vfinder",
  "scripts": {
    "ci:install": "bun install --frozen-lockfile"
  }
}
```

```bash
bun install --save-text-lockfile --frozen-lockfile   # 锁文件优先，禁止静默更新
bun install                                           # 日常开发：锁文件缺失或过期时重建
bun pm ls                                             # 对照锁文件查看实际依赖树
```

**讲解：**

1. bun.lock 是文本格式（JSONC 风格），可读、可 diff、可评审——PR 里能直接看出"这次升级改了哪个包"。
2. Bun 也读取 .npmrc 的 registry 与令牌配置，私有源团队可以无缝切换；安装行为与 npm 生态的习惯保持一致。
3. 锁文件必须提交进仓库。日常开发用 `bun install`，它会按 package.json 的范围解析并把结果写回锁文件；CI 用 `--frozen-lockfile`，范围与锁文件不一致时直接失败而不是悄悄解析新版。
4. 可复现安装的判定标准：删掉 node_modules 重装后，`bun pm ls` 输出与锁文件逐行一致。
5. 锁文件冲突与代码冲突一样在评审里解决：保留两边有意义的版本提升，拿不准时按 package.json 的范围重新解析一次并复核 diff，不要简单选"用我的"。
6. 锁文件里的完整性哈希还有安全作用：安装时逐包校验内容，被篡改的依赖会在校验环节直接失败，而不是带着恶意代码进入 node_modules。

## 3. workspaces 最小 monorepo

平台拆成三块：web 前端、api 票务后端、shared 共享类型。workspaces 让它们同仓、同锁文件、一次安装。

```text
vfinder/
├─ package.json          # 根：声明 workspaces 与公共脚本
├─ bun.lock              # 全仓唯一锁文件
├─ apps/
│  ├─ web/               # 前端：歌姬页与演唱会页
│  └─ api/               # 后端：Bun.serve 票务接口
└─ packages/
   └─ shared/            # 共享类型：歌曲、订单、应援色
```

```json
// 根 package.json —— 声明工作区范围
{
  "name": "vfinder",
  "workspaces": ["apps/*", "packages/*"]
}
```

```json
// packages/shared/package.json —— 共享包直接以 TS 源码导出
{
  "name": "@vfinder/shared",
  "exports": { ".": "./src/index.ts" }
}
```

```typescript
// packages/shared/src/index.ts —— 平台通用类型与常量
export interface Song { id: string; title: string; producerId: string }
export interface TicketOrder { id: string; concertId: string; seat: string }

// 应援色集中管理：前端渲染与后端日志共用同一份
export const THEME_COLORS: Record<string, string> = {
  miku: "#39c5bb",
  teto: "#eba9ee",
}
```

```json
// apps/api/package.json —— 用 workspace: 协议引用内部包
{
  "name": "@vfinder/api",
  "dependencies": {
    "@vfinder/shared": "workspace:*"
  }
}
```

```typescript
// apps/api/src/order.ts —— 后端导入共享类型，改动即时生效
import type { TicketOrder } from "@vfinder/shared"

export function createOrder(id: string, concertId: string, seat: string): TicketOrder {
  return { id, concertId, seat }
}
```

```bash
bun install                        # 根目录一次安装，全部工作区依赖提升处理
bun run --filter '@vfinder/api' dev  # 按包名运行某个工作区的脚本
```

**讲解：**

1. 根 package.json 的 `workspaces` 声明子包位置，Bun 一次安装处理全部依赖，node_modules 提升到根目录共享。
2. `workspace:*` 表示"永远解析到本地工作区包"：修改 shared 的类型，web 与 api 立即看到，不需要发 npm 包、不需要 link 命令。
3. exports 直接指向 `.ts` 源码在 Bun 下可运行、可打包，内部包省去构建步骤；若要发布到 npm 再改为编译产物。
4. 留意"幽灵依赖"：依赖提升让子包能直接 import 根 node_modules 里的包，即使它不在自己的 dependencies 里。Bun 与 npm 行为一致，但工程上仍建议在使用它的子包里显式声明，避免未来提升策略变化时集体报错。

## 4. 生命周期脚本安全策略

依赖包的 install/postinstall 脚本拥有任意执行能力，是供应链攻击的经典入口。Bun 的默认策略是"不执行，先申报"。

```bash
bun add better-sqlite3   # 带编译脚本的包
bun pm untrusted         # 列出脚本被拦截的包
bun pm trust better-sqlite3   # 审查源码后，逐个信任
```

```json
// package.json —— 信任名单入库，团队共享同一份决策
{
  "trustedDependencies": ["better-sqlite3", "esbuild"]
}
```

**讲解：**

1. 默认拦截所有依赖的 preinstall/postinstall 脚本，安装日志会提示哪些包的脚本被跳过——依赖投毒最常见的"下载后执行"路径被从默认行为上切断。
2. 真正需要编译原生模块的包（better-sqlite3 等）用 `bun pm trust <pkg>` 放行，决策记录进 trustedDependencies 并随仓库提交，评审可见。
3. 每次新增依赖后跑一遍 `bun pm untrusted`：功能缺失（比如原生模块没编译）多半是"脚本被拦了忘了信任"，而不是包坏了。
4. trustedDependencies 的名字容易误导：它不是"可信的包"名单，而是"允许执行其安装脚本"的精确名单——语义是放行脚本，不是信任代码。
5. trust 是一次性决策但要定期复核：升级大版本时重看脚本内容——供应链攻击往往潜伏在"看起来一直没变"的包的某次小更新里。

## 5. bun pm 常用命令

```bash
bun pm ls            # 列出依赖树（--all 展开间接依赖）
bun pm why zod       # 查看某包为何被安装：完整依赖来源链
bun pm bin           # 输出 node_modules/.bin 路径，脚本里定位可执行文件
bun pm cache rm      # 清空全局缓存，排查"缓存导致的诡异问题"
bun pm pack          # 打包当前包为 tarball，发布前自检包内容
```

**讲解：**

1. `bun pm why` 是排查"这个包谁引进来的"的最快路径，输出从直接依赖到当前包的完整链条。
2. `bun pm pack` 产出的 tarball 可用 `npm view` 或本地安装验证，避免发布后发现漏了文件；包内容清单也是评审的对照材料。
3. 缓存异常的症状是"换个网络/换台机器就好了"：先 `bun pm cache rm` 再重装，能排除一整类环境问题。
4. `bun run` 优先执行 package.json 的 scripts，找不到脚本时回退执行 node_modules/.bin 下的可执行文件；由于启动开销极低，可以放心用它替代 npx 做临时执行。
5. 缓存目录会持续增长：定期 `bun pm cache` 看一眼占用，磁盘紧张时清空缓存没有副作用，下次安装自动重建。

## 6. 缓存与离线安装

第 1 节说速度来自"全局缓存加硬链接"，本节把缓存当成显式工具来用：看清它在哪、怎么预热、CI 怎么复用。

```bash
bun install --dry-run            # 预演安装：只解析依赖，不落盘
bun install --cache-dir ./.bun-cache   # 自定义缓存目录（特殊环境用）
bun pm cache                     # 查看全局缓存位置与占用
bun pm cache rm                  # 清空缓存：怀疑缓存损坏时的第一步
```

```yaml
# .github/workflows/ci.yml（缓存片段）—— CI 复用全局缓存加速安装
- uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache   # Bun 默认全局缓存目录
    key: bun-${{ hashFiles('bun.lock') }}
```

**讲解：**

1. 缓存命中判定的依据是"包名 + 精确版本 + 完整性哈希"，三者都来自锁文件——锁文件不变，第二次安装几乎全部命中缓存，只做链接不下载。
2. `--dry-run` 在改依赖前预演解析结果，配合第 2 节的 `--frozen-lockfile` 可以在不动仓库的情况下验证"这次升级会带来什么"。
3. CI 缓存目录与锁文件哈希绑定作 key：锁文件变了缓存失效重下，没变则直接命中——这是"锁文件必须入库"在性能上的另一重回报。
4. 排障顺序固定：安装诡异失败时先 `bun pm cache rm` 重装，再怀疑网络与版本范围，最后才看包本身。

## 易错点与最佳实践

1. **忘记提交 bun.lock**：锁文件被 .gitignore 排除后，团队与 CI 各自解析版本，出现"我这台是好的"。锁文件必须入库，CI 冻结安装：

```bash
# 错误：把锁文件排除出版本控制
# echo bun.lock >> .gitignore
# 正确：锁文件入库 + CI 冻结安装
bun install --frozen-lockfile
```

2. **内部包写成 npm 版本号**：`"@vfinder/shared": "^0.1.0"` 会真的去 npm 找同名包（或解析失败）。内部引用一律用 `workspace:*`：

```json
// 错误：指向 npm 上的同名旧包
// "@vfinder/shared": "^0.1.0"
// 正确：永远解析到本地工作区
{ "@vfinder/shared": "workspace:*" }
```

3. **需要编译的包忘记 trust**：安装成功但运行时报"找不到二进制/模块未编译"。先 `bun pm untrusted` 查看被拦截名单，确认安全后 `bun pm trust` 并把包写进 trustedDependencies。

4. **依赖加错位置**：把业务依赖 `bun add` 到了根 package.json，子包之间产生隐式耦合。原则：只有全仓共用的工具（typescript、biome）放根，业务依赖加在对应子包（`cd apps/api && bun add zod`）。

5. **CI 不用冻结模式**：普通 `bun install` 在 CI 上可能解析出比本地更新的版本，构建结果不可复现。CI 一律 `--frozen-lockfile`，本地才允许更新锁文件。

6. **用全局安装顶替项目依赖**：`bun add -g typescript` 后，全局版本与项目锁文件各自漂移，构建结果因机器而异。命令行工具型依赖可以全局装，参与构建与运行的一律进项目 dependencies。

## 本篇小结

1. bun install 快在"单二进制并行调度 + 全局缓存硬链接 + 解析下载重叠"，最终 node_modules 结构与 npm 兼容，切换成本低。
2. bun.lock 是精确版本的契约：日常 `bun install` 更新它，CI 用 `--frozen-lockfile` 禁止漂移，锁文件必须提交。
3. workspaces 只需根 package.json 一行声明；内部包用 `workspace:*` 协议引用，共享类型改一次全仓生效，配合 exports 直出 TS 源码可省构建。
4. 生命周期脚本默认拦截是供应链防线：`bun pm untrusted` 查看拦截名单，审查后 `bun pm trust`，决策落在 trustedDependencies 入库。
5. `bun pm` 系列是日常工具箱：`ls` 看树、`why` 溯源、`cache rm` 清缓存、`pack` 发布前自检。

## 动手实践

1. **monorepo 改造**：把现有的"前端页面 + 票务接口"两个目录并入一个仓库，配置 workspaces，并把两边重复的类型定义抽到 packages/shared。提示：改完后在任一子包里改一个类型，验证另一子包立即获得新类型。
2. **锁文件演练**：删除 bun.lock 后运行 `bun install --frozen-lockfile` 观察报错；重新生成锁文件并故意把某依赖的版本范围改成不可能满足的值，理解 CI 拦截的意义。提示：对比 `bun install` 与冻结模式在锁文件缺失时的不同行为。
3. **脚本安全审计**：新建一个空项目安装两三个带 postinstall 的流行包，用 `bun pm untrusted` 查看拦截结果，阅读脚本内容后决定是否 trust，并把决策写进 trustedDependencies。提示：重点看脚本做了什么（下载二进制？编译？），培养审查直觉。把审查结论整理成一段团队守则，写进仓库的贡献指南让决策可复用。
