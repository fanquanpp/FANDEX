---
order: 60
title: .gitattributes 深入
module: 'git'
category: 工具链
difficulty: beginner
description: 属性规则体系——行尾标准化、binary 标记、diff/merge 驱动、导出与语言统计标注
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Git 属性规则（`.gitattributes`）——按路径给文件挂上行为属性的配置体系。
- **解决什么问题**：`.gitignore` 决定「哪些文件不进仓库」，`.gitattributes` 决定「进了仓库的文件按什么规则处理」：行尾怎么转换、算不算文本、diff 和 merge 用什么策略、打包导出时带不带、语言统计怎么算。`.gitignore` 篇（040）讲不进仓库的，本篇讲进了仓库的。
- **什么时候用到**：跨 Windows/macOS/Linux 协作统一行尾；锁文件（pnpm-lock 等）防被无意义合并；二进制文件防 diff 乱码；导出源码包时排除测试数据；修正 GitHub 仓库语言条形图。

## 1. 属性的语法骨架

`.gitattributes` 放在仓库根（也可放子目录，作用域限于该目录），也可以用 `git config core.attributesFile` 指全局文件。每行一条规则：

```text
<pattern> <attr1> <attr2> <attr3>...
```

pattern 语法与 `.gitignore` 相同（glob，`/` 开头锚定根，`**` 跨目录）。属性取值有四种形式：

| 写法          | 含义                       |
| ------------- | -------------------------- |
| `attr`        | 设为 true（Set）           |
| `-attr`       | 设为 false（Unset）        |
| `attr=value`  | 设为字符串值               |
| `!attr`       | 回退为未指定（Unspecified），交回默认行为 |

「未指定」与「false」是两回事，这是属性体系最容易混的地方：`-text` 明确说「这不是文本」（二进制，别碰行尾）；`!text` 说「Git 你自己看着办」（按内容探测）。规则按出现顺序后者覆盖前者，所以通配放前面、特例放后面。

## 2. 行尾：text/eol 与 core.autocrlf 的分工

### 2.1 事故现场

场景（真实团队事故）：Windows 同事用默认 `core.autocrlf=true` 提交，Mac 同事拉下来全是 `warning: CRLF will be replaced by LF` 告警，某次脚本还因为 `\r` 在 Linux 上跑挂。根因：行尾策略散落在每台机器的本地配置里，没有进仓库的强制约定。

### 2.2 两种机制怎么分工

`core.autocrlf` 是**每台机器的本地偏好**（不随仓库分发）；`.gitattributes` 的 `text`/`eol` 是**随仓库分发的团队约定**。两者同时存在时属性优先。Git 2.16 起官方文档明确推荐：仓库用 `.gitattributes` 定规范，不再依赖让每个人配对 autocrlf。

```bash
# 推荐的迁移路径：把行尾策略写进仓库，然后逐步废弃 autocrlf
git config --global core.autocrlf false   # 不再让本地配置插手
```

本仓库 FANDEX 的 `.gitattributes` 就是这条路线的实例：

```text
* text=auto eol=lf

*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf

*.png  -text
*.jpg  -text
...
```

逐行解释：`* text=auto eol=lf` 对所有文件——「按内容探测是不是文本（auto），是文本的话入库统一 LF，检出也 LF（eol=lf）」。`text=auto` 的探测很保守：文件里有 NUL 字节就当二进制。`*.bat text eol=crlf` 是必要特例——Windows 批处理解释器要求 CRLF，eol 属性只在 text 已设置时生效，所以这里显式 `text`。二进制清单用 `-text` 显式声明，不赌内容探测（探测失败的代价是二进制被改行尾直接损坏）。

**eol=lf 与 eol=crlf 与不写 eol 的区别**：`eol=lf` 检出也转 LF（编辑器在 Windows 打开也是 LF）；只写 `text` 不写 eol 时，入库统一 LF、检出按 autocrlf 决定。想要「入库统一、检出随本机」就用纯 `text`；想要「全仓库强一致」就 `eol=lf`。

### 2.3 改完规则后 renormalize

属性只影响之后的 add/checkout，已经入库的行尾不会自动变。迁移命令：

```bash
# 按新规则重新归一化所有已跟踪文件
git add --renormalize .
git commit -m "chore: normalize line endings via gitattributes"
```

**易错点**：renormalize 会产生一个大提交，团队成员必须全部重新拉取；与别人未完成的分支合并时可能出现整文件冲突——约好所有人同时切换。

## 3. binary 标记

`binary` 是宏，等价于 `-text -diff -merge`：不算文本、不产 diff、不做合并。手写 `*.png binary` 与 `-text` 的区别在于后者仍允许 diff（会把二进制当文本打印乱码）与合并（对二进制做文本合并等于损坏文件）。

```bash
# 查看某文件最终生效了哪些属性——调试属性规则的唯一正道
git check-attr text eol diff -- src/logo.png
```

**易错点**：pattern 写错（比如 `*.PNG` 没匹配小写）时 `git check-attr` 一跑便知，比肉眼逐行核对可靠得多。

## 4. diff 与 merge 驱动

### 4.1 merge=ours：锁文件保卫战

场景：`pnpm-lock.yaml` 被两个人同时改，Git 按行合并出的结果看似成功实则损坏（锁文件的结构不是逐行独立的）。社区常见做法是让它永不自动合并：

```bash
# 一次性注册驱动（本仓库需要每个协作者执行，或写进 setup 脚本）
git config merge.ours.driver true

# .gitattributes 中挂载
pnpm-lock.yaml merge=ours
```

`merge.ours.driver true` 的意思是：合并时以「shell 命令 true」当驱动——命令什么都不做、退出码 0，效果是合并结果保留当前分支版本。**必须理解的坑**：`merge=ours` + driver 只解决合并方向，不解决内容正确性——两个人的依赖变更，合并后只剩一个人的。正确工作流是合并后手动重跑 `pnpm install` 再提交一次锁文件。所以这个方案的完整表述是「防止 Git 静默产出坏锁文件，合并后强制人工重生成」。

**换成别的写法会怎样**：用 `merge=union` 会把两边的行都保留（文本追加式合并），对 CHANGELOG 合适、对锁文件致命——同一包出现两个版本条目。

### 4.2 diff 驱动与自定义

diff 驱动可以改变「怎么比较文件」。内置常用的有：

```text
*.md diff=markdown          # 按标题分块的逐块比较，diff 粒度更合理
package-lock.json -diff     # 干脆不显示 diff，审查时强制人工介入
*.min.js -diff              # 压缩产物不看 diff
```

## 5. export-ignore：导出瘦身

`git archive` 导出源码包（以及部分托管平台的自动导出）时排除某些路径：

```text
/.github export-ignore
/tests export-ignore
/docs export-ignore
```

场景：给客户发的源码交付包不需要 CI 配置和测试夹具。`export-ignore` 只影响 archive，不影响 clone——仓库本身内容不变。

## 6. linguist：修正 GitHub 语言统计

GitHub 用开源的 linguist 库统计仓库语言。它会误判：把 vendored 代码、生成产物、编辑器配置算进去。属性标注：

```text
docs/generated/* linguist-generated=true
static/vendor/*   linguist-vendored=true
*.iss             linguist-language=InnoSetup
app-web/public/*  linguist-docs
```

本仓库这类「文档为主 + 多端应用代码」的项目尤其常见误判（比如把构建产物目录的 JS 算成主语言），按目录标注 generated 后语言条形图才反映真实构成。

## 7. 不同场景下的例子

**例一：跨平台团队统一行尾（真实工程场景，即 FANDEX 本身）**。仓库根 `* text=auto eol=lf` 加 `*.ps1 eol=crlf` 特例，`git config core.autocrlf false` 一次性关掉本地干预。所有成员 renormalize 一次后，「Windows 改完 Mac 报 CRLF 告警」这类事故归零。

**例二：游戏仓库的美术资源管理**。贴图、模型、音频交给 Git LFS（见 345 篇），LFS 的 track 命令本质上就是往 `.gitattributes` 写 `*.psd filter=lfs diff=lfs merge=lfs -text`——行尾、diff、merge 三个属性同时挂上，是属性体系最重度的真实用户。

**例三：Monorepo 的导出与统计治理**。几十个子包的仓库，`scripts/`、`.husky/` export-ignore 让 `git archive` 的交付包干净；`**/dist/** linguist-generated=true` 让语言统计不被构建产物污染；`*.lockb merge=binary`（bun 的二进制锁文件）直接按二进制处理。

## 动手实践

**练习 1**：在测试仓库建一个 `a.txt`（LF 行尾）并提交，然后加规则 `*.txt text eol=crlf`，执行 renormalize，观察 diff 显示整个文件被改写；再 `git check-attr text eol -- a.txt` 验证属性生效。

**提示**：renormalize 前先用 `git config core.autocrlf` 确认本地配置，理解「属性优先于配置」的叠加结果。

**练习 2**：给一个 JSON 文件配 `merge=ours`（记得先 `git config merge.ours.driver true`），开两个分支各改同一行，合并验证「保留当前分支、另一分支修改被丢弃」；然后思考并用 `pnpm install`（或手动编辑）把丢失的修改补回。

**提示**：合并后 `git diff HEAD MERGE_HEAD -- 文件名` 能看到被丢弃一侧的内容。

**练习 3**：写规则让仓库里某个目录被 linguist 视为生成代码，然后 `git check-attr linguist-generated -- 目录/文件` 验证（本地无法直接看 GitHub 条形图，属性生效即可）。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1
git init attr-lab && cd attr-lab
printf 'line1\nline2\n' > a.txt
git add a.txt && git commit -m "add a.txt"
echo '*.txt text eol=crlf' > .gitattributes
git add --renormalize .
git diff --cached --stat     # a.txt 整文件变更（LF 全部替换为 CRLF）
git commit -m "chore: crlf for txt"
git check-attr text eol -- a.txt
# 期望输出: a.txt: text: set / a.txt: eol: crlf

# 练习 2
git config merge.ours.driver true
echo '{"name": "x", "version": "1.0.0"}' > pkg.json
echo 'pkg.json merge=ours' >> .gitattributes
git add . && git commit -m "setup ours-merge"
git checkout -b feat-a && sed -i 's/1.0.0/2.0.0/' pkg.json
git commit -am "bump to 2.0.0"
git checkout main && git checkout -b feat-b
sed -i 's/1.0.0/1.5.0/' pkg.json
git commit -am "bump to 1.5.0"
git merge feat-a --no-edit
cat pkg.json        # 停在 1.5.0：feat-a 的 2.0.0 被 ours 策略丢弃
# 治理：合并后按需重生成或手工合入正确版本
```

</details>

## 参考与致谢

- Git 官方文档 gitattributes(5)：<https://git-scm.com/docs/gitattributes>（GPLv2 文档许可，本文属性语法与语义以该文档为底）
- Pro Git（第 2 版）第 7 章「Git Tools - Rewriting History / 8.x Customizing」关于属性的章节，git-scm.com/book，CC BY-NC-SA 3.0
- GitHub linguist 文档：<https://github.com/github-linguist/linguist/blob/main/docs/overrides.md>（MIT）
- 本仓库 `.gitattributes` 实例作为真实工程案例引用。
