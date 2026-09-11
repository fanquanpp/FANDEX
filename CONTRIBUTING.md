# 贡献指南（Contributing）

感谢你考虑为 FANDEX 做出贡献。本文档是完整的协作教程：从环境准备、内容写作、
本地校验到提交、合并与发版。内容开发的逐步实操手册（含常见问题排查）见
[CONTENT-GUIDE.md](CONTENT-GUIDE.md)；工程细节与 frontmatter 字段约束以
[AGENTS.md](AGENTS.md) 为准；本仓库的差异只有「写内容」与「改应用」两类，
教程对两者都适用。

## 仓库概览

FANDEX 是单一 Git 仓库（monorepo）：

- `cnt-content/full` 是**全部学习内容的唯一来源**——改内容就是改这里的 markdown，
  网页（app-web）、Windows 桌面端（app-desktop）、Android 双端共享同一内容管线，
  不要直接修改任何应用内的生成产物（`assets/` 目录）；
- `app-*` 各目录是三端应用本体；`shd-shared` 是共享元数据与设计令牌；
- 全部元数据（frontmatter 托管字段、modules.json、学习路径索引）由
  `app-web/scripts/content-sync.mjs` 在构建前自动补全，**提交符合约定的 md 文件
  即完成全部工作**。

## 分支模型

| 分支 | 用途 | 规则 |
| --- | --- | --- |
| `main` | 唯一发布主线：网页部署、Release、版本 tag 均以它为基准 | 受保护，只接受 Pull Request |
| `dev` | 协作集成分支：累积待发版的变更 | 开放推送，协作者日常工作的落点 |

- **协作者（有仓库写权限）**：小改动可直接推送到 `dev`；较大改动建议按下方
  特性分支流程走 PR，便于 CI 校验与回溯；
- **外部贡献者**：Fork 本仓库后向 `dev` 分支提交 Pull Request；
- **发版（维护者）**：将 `dev` 以 PR 合入 `main`，再在 `main` 上执行
  `pnpm release`（见文末「发版流程」）；
- **依赖升级**：Dependabot 每周自动向 `main` 提 PR，由维护者审查合并。

## 环境准备

- 必需：Node.js >= 22 与 pnpm >= 10（版本以根 `package.json` 的
  `packageManager` 字段为准）；
- 仅构建 Android 时需要：JDK 21 与 Android SDK（compileSdk 37）；
- 仅构建 Windows 桌面端时需要：Rust stable 与 MSVC 工具链；
- 纯内容贡献不需要任何额外环境，上述工具只用于本地校验。

```bash
git clone https://github.com/fanquanpp/FANDEX.git
cd FANDEX
pnpm install --frozen-lockfile    # 在仓库根执行
```

> 纯改 markdown 的外部贡献者可以跳过本地安装，直接在 GitHub 网页端编辑并
> 提 PR——内容校验会由 CI 完成。但熟悉命令行后本地校验效率高得多。

## 协作流程（七步）

### 1. 同步最新代码

```bash
git switch dev
git pull origin dev
```

### 2. 建立工作分支（推荐）

分支命名遵循前缀 + 小写中划线：`feat/<描述>`、`fix/<描述>`、`docs/<描述>`、
`content/<描述>`、`refactor/<描述>` 等。示例：

```bash
git switch -c content/docker-networking
```

### 3. 修改内容

**新增一篇文档**：把 `NNN-EnglishName.md` 放进对应模块文件夹
`cnt-content/full/<NNN-模块id>/`，文件名编号即学习顺序（10 起步长 10 生成
`order` 字段）。frontmatter 推荐手写 `title` 与 `description`，其余字段
（`order` / `module` / `category` / `author` / `updated`）由 sync 自动生成，
手写无效；`related` / `prerequisites` 引用格式为 `模块id/文件名`（不带扩展名），
死链会被自动删除。

**新增模块**：在 `cnt-content/full/` 下建模块文件夹（可省略编号，自动分配），
并写入 `module.json`（`title` 必填，`icon` / `description` / `categories` /
`prerequisites` / `officialDocs` 可选，schema 见 AGENTS.md），然后在其中
正常添加文档。

**调整顺序**：重命名文件编号即可，不要手改 `order` 字段。

**删除模块/文档**：直接删除文件或文件夹，派生数据会在下一次 sync 时自动回收。

**修改应用代码**：进入对应 `app-*` 目录开发。网站 `pnpm dev:web`；
Android 双端先在仓库根执行内容生成脚本再 `./gradlew` 构建（命令见根
README「快速开始」）。

### 4. 本地校验

```bash
pnpm sync          # 内容自动同步（补全元数据、注册模块、清理死链）
pnpm build:web     # 完整 web 构建（含 Content Collections 构建期校验与搜索索引）
pnpm typecheck     # 全仓类型检查
```

三项全部通过即与 CI 门槛等价。`pnpm sync` 是幂等的，重复执行无副作用。

### 5. 提交

提交信息遵循 Conventional Commits：

```
<type>(<scope>): <描述>

<正文：说明动机与影响，可选>

<footer: 关联 Issue 等，可选>
```

- `type`：feat / fix / docs / content / refactor / chore / ci / perf / test；
- 描述使用中文、动词开头、结尾不加句号；
- 示例：`fix(content): 修正 go 模块并发章节的代码示例错误`。

### 6. 发起 Pull Request

推送分支并向 `dev` 发起 PR（外部贡献者为 fork 分支 → `dev`；维护者可直接
向 `main` 发 PR）。PR 描述请说明变更目的、范围与自测结果。CI 会自动运行：

| 工作流 | 触发 | 内容 |
| --- | --- | --- |
| android-build.yml | push 与 PR | 双端 Android APK 并行构建校验 |
| desktop-build.yml | push 与 PR | Windows 桌面端构建 + 前端实验室剔除校验 |
| deploy.yml | push 到 main 与指向 main 的 PR | 构建 + 类型检查 + 内容审计 + QA 门禁；仅 push 到 main 时发布 GitHub Pages |
| android-release.yml | push `v*` 标签 | 构建三端安装包并发布 GitHub Release |

所有构建前会自动运行 `content-sync.mjs`；deploy 工作流中的 `content-audit.mjs`
门禁会在出现 HIGH 级内容质量问题时阻断构建。

### 7. 合并

维护者审查通过后合并。合并方式与仓库历史保持一致，使用 merge commit；
PR 合并后可删除特性分支。

## 内容文档规范（重点）

内容维护遵循「作者只写内容，元数据自动补全」：构建与 CI 会先运行
`content-sync.mjs` 自动补全 frontmatter 托管字段、注册新模块、清理死链。
作者只需遵守：

1. **文件命名**：文档 `NNN-EnglishName.md` 放入 `<NNN-模块id>/` 文件夹，
   文件名编号即学习顺序；新增模块文件夹时可省略编号（自动分配）；
2. **frontmatter**：推荐手写 `title` 与 `description`，其余字段可省略
   （`order` / `module` / `category` / `author` / `updated` 由 sync 自动
   生成，勿手写）；仅允许 AGENTS.md 规定的 10 个标准字段；
3. **引用格式**：`related` 与 `prerequisites` 写 `module/文件名`（不带
   扩展名），死链会被自动删除；
4. **新增模块**：模块文件夹内写 `module.json` 声明模块信息（schema 见
   AGENTS.md），缺失时 sync 会生成骨架，请补写完善；
5. **禁止 emoji**；图形需求使用 Mermaid 或 SVG；代码块必须标注语言；
6. **单一来源**：内容只写入 `cnt-content/full`，不修改三端应用内的生成产物
   （assets 目录），构建时由管线自动同步。

## 自检清单

提交 PR 前请确认：

- [ ] 文档放入正确的模块文件夹，文件名编号符合学习顺序；
- [ ] `title` / `description` 已填写（其余字段可不写）；
- [ ] 代码示例语法正确、已标注语言；
- [ ] 本地跑过 `pnpm sync` 无报错（web 构建验证由 CI 覆盖，本地无需 `pnpm build:web`）；
- [ ] 无 emoji、无构建产物入库；
- [ ] 提交信息符合 Conventional Commits；
- [ ] PR 目标分支：协作者与外部贡献者为 `dev`，维护者可直接发 `main`
      （Dependabot 的依赖 PR 指向 `main`）。

## 发版流程（维护者）

在 `main` 分支上（dev 变更已合入）执行：

```bash
pnpm release            # patch +1，例如 4.3.1 -> 4.3.2
pnpm release 4.5.0      # 指定版本号（4.5、5 等缩写自动补全）
pnpm release --no-push  # 只改文件与提交，不推送（用于演练）
```

脚本自动完成：五处版本文件同步（根/app-web package.json、tauri.conf.json、
app-desktop-portable/package.json、Android versionName）、versionCode +1、
CHANGELOG「未发布」段迁移、commit + tag + push；push 后 Release 工作流自动
构建三端安装包并发布 GitHub Release。

## 行为准则

保持友善与建设性：讨论针对内容与技术本身，尊重不同背景的学习者。恶意行为将被
移除并限制参与。
