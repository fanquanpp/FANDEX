---
order: 360
title: git-bisect
module: 'git'
category: 工具链
difficulty: intermediate
description: git bisect 详解：二分定位首坏提交、自动化 bisect run 与实战脚本。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/180-GitLogDetailed'
  - 'git/190-GitBlame'
  - 'git/330-GitPrincipleObjectModel'
prerequisites:
  - 'git/110-HEADPointerBranchEssence'
---

## 前置知识与学习目标

**前置知识**：理解提交历史与「检出某个提交」（分离 HEAD）的含义；会用测试命令验证程序行为。

学完本文你应当能够：

1. 用手动二分在成百上千个提交中定位「引入 Bug 的第一个提交」（首坏提交）；
2. 编写测试脚本，交给 `git bisect run` 全自动定位；
3. 处理无法构建的中间提交、不稳定测试等现实障碍。

类比先行：二分定位就是**查字典**——知道词在字典里（Bug 已存在于当前版本），也确定不在前几页（旧版本正常），于是每次翻到中间看一眼，淘汰一半范围。1000 个可疑提交只需约 10 次判断。

## 1. bisect 是什么

`git bisect` 在「一个已知正常的历史提交」与「一个已知异常的当前提交」之间做二分查找。它反复把中间提交检出到工作区，等你（或脚本）判定好坏，再收缩范围，最终锁定**首坏提交**（first bad commit）——即第一个让程序变坏的提交。

```text
已知: v1.0 正常(good)，当前 HEAD 有 Bug(bad)
历史: A---B---C---D---E---F---G---H (HEAD, bad)

第 1 轮: 检出 E → 有 Bug → 坏提交在 A..D 之间
第 2 轮: 检出 C → 正常   → 坏提交在 D..E 之间
第 3 轮: 检出 D → 有 Bug → 锁定 D
输出: D is the first bad commit
```

前提是「坏」这个属性在历史上**单调**：一旦出现，之后每个提交都坏。对真正的 Bug 回归通常成立；对偶发问题则要先稳定复现手段。

## 2. 手动二分

```bash
# 1) 启动：声明坏的一端（当前）与好的一端（v1.0.0）
git bisect start
git bisect bad
git bisect good v1.0.0
# Bisecting: 37 revisions left to test after this (roughly 6 steps)
# [5e6f7a8] refactor: extract http client

# 2) 测试当前工作区（构建、运行、验证）
#    好就 git bisect good；坏就 git bisect bad

# 3) 重复直到 Git 宣布结果
# 5e6f7a8 is the first bad commit
# （Git 会自动打印该提交的元数据与 diff 摘要）

# 4) 结束：回到启动前的分支（这步不能忘）
git bisect reset
```

`git bisect start HEAD v1.0.0` 是「启动 + 声明好坏」的一步式写法，坏提交在前。

### 2.1 有用的过程命令

```bash
git bisect status      # 查看当前进度与剩余范围
git bisect log         # 打印判定历史（.git/BISECT_LOG）
git bisect skip        # 当前提交无法构建/无法判定，先跳过
git bisect visualize   # 用 log --graph 展示剩余可疑范围
```

判定历史可以存档与重放：`git bisect log > bisect.log` 之后 `git bisect replay bisect.log`，适合把同事协助判定的过程原样复现。

## 3. 自动二分：bisect run

把「判定」写成脚本，Git 就能自己走完全程：

```bash
git bisect start HEAD v1.0.0
git bisect run npm test
# running 'npm test' for each step...
# 5e6f7a8 is the first bad commit
git bisect reset
```

**退出码约定**（这是 `run` 的全部接口）：

| 退出码        | 含义                     |
| :------------ | :----------------------- |
| `0`           | 好（good）               |
| `125`         | 跳过（该提交不可测试）  |
| `1-124、126-127` | 坏（bad）            |
| `128 及以上`  | 中止整个 bisect          |

### 3.1 一个健壮的测试脚本模板

```bash
#!/bin/bash
# scripts/bisect-test.sh —— 自动二分判定脚本
set -u

# 依赖未提交在 package-lock 变更时需要重装，避免「旧代码配新依赖」的假阳性
npm ci --silent || exit 125          # 装不上依赖：视为不可测试

npm test > /tmp/test-out.log 2>&1
code=$?

# 已知不稳定的测试导致的失败按「跳过」处理，避免误判
if grep -q "FLAKY" /tmp/test-out.log; then
  exit 125
fi

exit $code                           # 0 = good，非 0 = bad
```

```bash
git bisect start HEAD v1.2.0
git bisect run bash scripts/bisect-test.sh
```

## 4. 实战场景

### 4.1 定位性能回归

「坏」不必是崩溃，任何可脚本化判定都行：

```bash
#!/bin/bash
# 基准耗时超过阈值即视为坏
elapsed=$(./bench.sh | awk '/Total time/ {print $3}')
awk -v t="$elapsed" 'BEGIN { exit (t > 5.0) ? 1 : 0 }'
```

### 4.2 定位「从哪个提交开始通过测试」

属性单调反转时（以前一直失败、某提交后开始成功），用 `new`/`old` 术语保持语义自然，结论就是「首个修复提交」：

```bash
git bisect start HEAD v1.0.0
git bisect new          # 当前是新行为（测试通过的那类）
git bisect old v1.0.0   # v1.0.0 是旧行为
# 或直接：git bisect start --term-new=pass --term-old=fail HEAD v1.0.0
```

### 4.3 限定搜索范围提速

只怀疑某条子目录的改动时，用路径参数把提交集合砍掉一大半：

```bash
git bisect start HEAD v1.0.0 -- src/auth/
git bisect run npm test
```

## 5. 陷阱与调试

- **忘记 `git bisect reset`**：HEAD 会一直停在历史提交（分离状态），后续提交全都进不了分支；结束必做 reset。
- **测试不稳定（flaky）**：随机失败的测试会把二分引向错误提交；复现条件必须稳定，或按 125 跳过已知不稳定用例。
- **中间提交构建失败**：依赖声明变了要先重装（脚本里 `npm ci`）；实在构建不了的提交用 `skip`，Git 会在剩余提交中继续逼近。
- **合并提交掩盖真凶**：Bug 在功能分支上引入、后来整体合并，二分可能停在「合并提交」这一步——检查该提交是否为 merge，必要时用 `git bisect start --first-parent` 沿主干二分，再进入对应分支细分。
- **好端声明得太近**：good 提交本身必须真的正常；若不确定，先用更早的发布标签。
- **CI 里跑 bisect**：注意检出旧提交后 `.env`、数据库 schema 等外部状态也要能回退，否则判定失真。

## 状态存储与中断恢复

二分进行中，全部现场保存在 `.git/BISECT_*` 系列文件里（BISECT_START 记起点、BISECT_TERMS 记好/坏术语、BISECT_LOG 记判定史、BISECT_EXPECTED_ROOT 等），因此：

- 中途可以随意 `git log`、构建、甚至重启终端，二分状态不受影响；
- 误判了一步，用 `git bisect log` 导出、手工删掉该行判定、再 `git bisect replay` 修正；
- `git bisect reset` 清空全部 BISECT_* 现场并回到起点分支。

| 命令                     | 作用                                       |
| :----------------------- | :----------------------------------------- |
| `git bisect log`         | 导出判定历史（可编辑后 replay 复现/修正）  |
| `git bisect replay 文件` | 按记录重放二分（协作移交现场）             |
| `git bisect run ...`     | 全自动判定循环                             |
| `git bisect terms`       | 查看/自定义 good/bad 的术语别名            |

## 小结

**初学者要点**

- 流程四步：`start` → 声明 good/bad → 反复判定 → `reset`。
- 目标产物是「首坏提交」+ 它的 diff，通常一眼就能看出病根。
- 有测试脚本就用 `git bisect run`，退出码 0 好 / 非 0 坏 / 125 跳过。

**进阶注意**

- 「坏」必须单调可复现；不稳定测试用 skip（125）隔离。
- 路径参数与 `--first-parent` 是两个重要的降维手段。
- `git bisect log` / `replay` 让二分过程可存档、可协作、可复现。
