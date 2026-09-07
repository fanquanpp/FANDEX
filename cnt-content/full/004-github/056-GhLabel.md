---
order: 560
title: gh label 命令速查手册
module: 'github'
category: 工具链
difficulty: beginner
description: '清单驱动讲解 gh label 系列命令：按"查看现状-创建标签-编辑维护-删除清理-模板复用"的管理流程展开，配以原理讲解、错误对策。'
author: fanquanpp
updated: '2026-08-29'
related: []
prerequisites: []
---


## 开篇：把标签想成文件柜的彩色贴纸

整理文件柜时，你会给文件夹贴不同颜色的贴纸：红色代表"紧急"、绿色代表"已完成"、蓝色代表"财务"。有了这些贴纸，你一眼就能知道每个文件夹的状态，找文件不用一个个打开翻。

GitHub 仓库里的 **Issue 和 PR 就是文件夹，Label（标签）就是贴纸**。贴上 `bug`，表示"这是个缺陷"；贴上 `good first issue`，表示"适合新手"；贴上 `priority:high`，表示"很紧急"。标签让成百上千的 Issue 变得**可筛选、可统计、可自动处理**（比如 Actions 可以监听"带某个标签的 Issue 被创建"）。

`gh label` 系列命令，就是你的"贴纸管理工具"：不打开网页，就能查看、创建、修改、删除、批量复制标签。本文按"标签管理的完整流程"（清单式）展开：**看现状 → 建标签 → 改标签 → 删标签 → 复制模板**。

---

## 原理先讲清：标签的三要素

一个标签由三个属性组成：

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| 名称（name） | 唯一标识，会显示在 Issue 上 | `bug`、`type:bug`、`good first issue` |
| 颜色（color） | 6 位十六进制色值，用于视觉区分 | `d73a4a`（红）、`0e8a16`（绿） |
| 描述（description） | 一句话说明这个标签的用途 | "Something isn't working" |

关键规则：

- 颜色是**6 位十六进制**（如 `E99695`），不带 `#` 前缀；
- 创建时不给颜色，gh 会**随机生成**一个颜色（建议显式指定，保持仓库观感一致）；
- 新仓库自带一组默认标签（`bug`、`enhancement`、`documentation`、`good first issue`、`help wanted` 等）；
- 命令可以作用于任何仓库：在仓库目录内省略参数，或加 `-R owner/repo` 指定。

---

## 清单第 1 步：查看现状（gh label list）

动手改之前先"盘点"：仓库里现在有哪些标签？

```bash
# 列出当前仓库全部标签
gh label list

# 按名称模糊搜索（比如找所有含 bug 的标签）
gh label list --search bug

# 在别的仓库里看
gh label list -R owner/repo

# 只看某类标签（如 type: 前缀）
gh label list --search "type:"
```

典型输出：

```text
NAME              DESCRIPTION                      COLOR
bug               Something isn't working         d73a4a
documentation     Improvements or additions       0075ca
enhancement       New feature or request          0e8a16
good first issue  Good for newcomers              7057ff
```

通过这一步，你就能知道：哪些标签已经存在（避免重复创建）、哪些命名风格不统一（后续统一整理）。

---

## 清单第 2 步：创建标签（gh label create）

```bash
# 最简方式：只给名字（颜色随机，不推荐）
gh label create bug

# 标准方式：名称 + 描述 + 颜色
gh label create bug --description "Something isn't working" --color E99695

# 创建带命名空间的标签（团队常用"分类:名称"格式）
gh label create "type:bug" --color "D73A4A" --description "Bug 问题"

# 创建优先级类标签
gh label create "priority:high" --color "B60205" --description "高优先级"
gh label create "priority:low" --color "0E8A16" --description "低优先级"

# 在指定仓库创建
gh label create "needs-triage" --description "待分类" -R owner/repo
```

注意 `--color` 的写法：`--color "D73A4A"` 或 `--color D73A4A` 均可（不带 `#`）。

> 创建时如果标签已存在，默认会报错；想"存在就更新"可加 `--force`：
> ```bash
> gh label create bug --description "新的描述" --color d73a4a --force
> ```

---

## 清单第 3 步：编辑维护（gh label edit）

标签建好后，随着项目演进，常常需要改名、改色、改描述。

```bash
# 修改标签颜色
gh label edit bug --color "B60205"

# 修改标签描述
gh label edit bug --description "程序缺陷，需要修复"

# 重命名标签（--new-name；已打上旧标签的 issue 会自动改用新名字）
gh label edit bug --new-name "type:bug"

# 同时修改多个属性
gh label edit "priority:high" --color "D93F0B" --description "高优先级，尽快处理"
```

重命名是整理仓库标签的重要手段：比如把混乱的 `bug`、`Bug`、`bug!` 统一成 `type:bug`。

---

## 清单第 4 步：删除清理（gh label delete）

标签过时了、命名错了、分类体系调整了，就要清理。**注意：删除标签会让所有已打该标签的 Issue/PR 失去这个标签**（Issue 本身不受影响，只是筛选条件变了）。

```bash
# 删除标签（--yes 跳过确认）
gh label delete "type:bug" --yes

# 删除另一个仓库的标签
gh label delete "needs-triage" --yes -R owner/repo
```

删除前建议先用 `gh label list --search <关键词>` 确认名字没打错，因为该操作不可恢复（除非重新创建并手动重新打标）。

---

## 清单第 5 步：模板复用（gh label clone）

新仓库逐个创建标签很累。如果你有一个"标签体系很完善"的模板仓库，一条命令就能**把它的全部标签复制过来**——这是团队标准化标签体系的利器。

```bash
# 把模板仓库的所有标签复制到当前仓库
gh label clone owner/template-repo

# 指定源仓库与目标仓库
gh label clone owner/template-repo -R my-org/my-new-repo
```

典型应用场景：

- 团队规定所有新项目统一使用一套标签（`type:*`、`priority:*`、`status:*`）；
- 你维护多个同类仓库，希望标签保持一致；
- 新仓库初始化时一键获得"完整标签体系"。

`clone` 是 gh 独有的贴心功能，网页端没有对应按钮。

---

## 标签体系设计建议（进阶）

一个健康的标签体系通常分几类，建议按"前缀命名空间"组织：

| 分类 | 示例标签 | 用途 |
| --- | --- | --- |
| 类型（type） | `type:bug`、`type:feature`、`type:docs` | 说明 Issue 的性质 |
| 优先级（priority） | `priority:high`、`priority:low` | 说明紧急程度 |
| 状态（status） | `status:blocked`、`status:in-progress` | 说明处理进度 |
| 协作（collab） | `good first issue`、`help wanted` | 引导社区贡献 |
| 特殊（special） | `needs-triage`、`won't fix`、`duplicate` | 流程性标记 |

命名空间的优点：`--search "type:"` 能一次筛出一整类标签，后续加标签不冲突、不混乱。

---

## 进阶应用：标签与自动化联动

标签不只是"给人看的"，还能驱动自动化：

### 联动 1：搜索与筛选

```bash
# 找出所有带 bug 标签的 open issue（配合 gh search，见《GhSearch》）
gh search issues --label=bug --state=open --repo=owner/repo

# 找出所有"待分类"的 issue
gh search issues --label="needs-triage" --repo=owner/repo
```

### 联动 2：批量打标（配合 gh api）

给多个 Issue 批量打标签，用 `gh api` 更高效：

```bash
# 给 issue 42 打上 bug 标签
gh api repos/{owner}/{repo}/issues/42 -X PATCH -F 'labels[]=bug'

# 用循环批量处理（bash 示例：给列表中的 issue 编号打标）
for n in 10 11 12; do
  gh api repos/{owner}/{repo}/issues/$n -X PATCH -F 'labels[]=needs-triage'
done
```

### 联动 3：Actions 自动打标

GitHub Actions 可以监听 Issue 事件自动打标签。例如"Issue 标题含 `[urgent]` 时自动打高优先级标签"，这类工作流可在 workflow 文件中用 `gh` 或社区 action 实现。标签名一旦定下，就要尽量避免删除改名，否则已配置的自动化逻辑全部要跟着改。

### 联动 4：统计报表

```bash
# 统计各类标签下有多少 open issue（配合 jq 汇总）
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | .labels[].name' | sort | uniq -c
```

标签体系是仓库的"分类语言"，**先设计、再落地、少变更**，才能让标签长期稳定地发挥作用。

---

## 完整流程串联：从 0 搭建一套标签体系

```bash
# 1. 盘点：看看默认标签长什么样
gh label list

# 2. 如果已有模板仓库，直接复制（跳过 3-5）
gh label clone owner/template-repo

# 3. 创建类型类标签
gh label create "type:bug" --color "D73A4A" --description "程序缺陷"
gh label create "type:feature" --color "0E8A16" --description "新功能请求"

# 4. 创建优先级与协作标签
gh label create "priority:high" --color "B60205" --description "高优先级"
gh label create "good first issue" --color "7057FF" --description "适合新手入门"

# 5. 清理与统一
gh label edit "enhancement" --new-name "type:feature"   # 合并默认标签
gh label delete "invalid" --yes                          # 删除不用的默认标签

# 6. 验收
gh label list --search "type:"
```

---

## 常见错误与对策

| 新手常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 颜色带了 # 前缀 | 报 `invalid color` | 颜色必须是 6 位十六进制，不带 # | 写成 `--color "D73A4A"` 或 `--color D73A4A` |
| 颜色不是 6 位 | 报 `color must be 6 characters` | 色值格式错误 | 使用如 `B60205` 的 6 位格式 |
| 创建已存在的标签 | 报 `label already exists` | 标签名重复 | 改名，或加 `--force` 更新已有标签 |
| 名称含空格/冒号未加引号 | 报 `unknown flag` 或行为异常 | 被 shell 拆成多个参数 | 用引号包裹：`gh label create "type:bug"` |
| 删错标签 | 大量 issue 的标签消失 | 删除不可恢复 | 删除前用 `list --search` 核对；重建后需重新给 issue 打标 |
| clone 来源写错 | 报 `repository not found` | 模板仓库路径错误 | 用 `owner/repo` 完整格式，确认仓库存在且有读取权限 |
| 在错误仓库操作 | 标签出现在奇怪的地方 | 忘了当前目录 | 加 `-R owner/repo` 显式指定目标仓库 |

---

## 一句话记忆

**Label 是 Issue 的"彩色贴纸"：`list` 盘点、`create` 贴新、`edit` 改色改名、`delete` 撕掉、`clone` 一键复制整套——命名用"分类:名称"格式，团队协作才不乱。**
