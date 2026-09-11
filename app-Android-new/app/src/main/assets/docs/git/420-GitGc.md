---
order: 420
title: git-gc 仓库垃圾回收
module: 'git'
category: 工具链
difficulty: intermediate
description: git gc 垃圾回收详解：不可达对象、打包压缩、自动维护与 git maintenance 新机制。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/240-ObjectModel'
  - 'git/260-GitReflog'
  - 'git/040-GitignoreDeepDive'
prerequisites:
  - 'git/240-ObjectModel'
---

## 前置知识与学习目标

**前置知识**：了解松散对象、packfile 与 reflog 的存在（见 [对象模型](git/240-ObjectModel)、[git reflog](git/260-GitReflog)）。

学完本文你应当能够：

1. 说出 gc 到底清理什么、保留什么（安全边界）；
2. 用 `count-objects -v` 诊断仓库状态，判断是否需要干预；
3. 处理「仓库太大」问题：定位大对象、清理历史、瘦身收尾；
4. 认识 Git 2.36+ 的 `git maintenance` 后台维护机制。

类比先行：对象库像**厨房**——新鲜食材随用随放（松散对象），gc 是定期整理：把散件装箱（打包）、把过期原料（不可达对象）清掉。整理有严格规矩：reflog 还在保质期内的「后悔药」一律不动。

## 1. gc 做什么

`git gc`（garbage collection，垃圾回收）执行三类整理：

1. **打包**：把 `.git/objects/??/` 下的松散对象合并进 packfile，并计算 delta 压缩；
2. **合并包文件**：多个小 pack 合并，减少文件描述符开销；
3. **清理不可达对象**：既不被引用、又过了 reflog/过期保护期的对象被真正删除。

安全边界（重要）：**可达对象永远不会被删**。被 reset/rebase 丢弃的提交受 reflog 保护（可达条目默认 90 天、不可达条目 30 天），过期后才符合回收条件。

## 2. 诊断仓库状态

```bash
git count-objects -v
# count: 37                 ← 松散对象数
# size: 96                  ← 松散对象占用（KB）
# in-pack: 1204             ← 已打包对象数
# packs: 2                  ← 包文件数
# size-pack: 286            ← 包文件占用（KB）
# prune-packable: 0         ← 冗余的松散副本
# garbage: 0                ← 杂物文件（非损坏对象，多为中断残留）

du -sh .git                 # 仓库整体体积
git fsck --unreachable      # 预览不可达对象（只看不动）
```

日常判断：`count` 长期上千、或 `size-pack` 异常膨胀，才需要人工介入；否则交给自动维护。

## 3. 手动 gc

```bash
git gc                      # 标准整理
git gc --auto               # 只在达到阈值时才真正干活（供脚本钩子调用）
git gc --no-prune           # 只打包，不删任何对象（最保守）
git gc --prune=now          # 立即删除不可达对象（跳过 2 周宽限期）
git gc --aggressive         # 重算 delta 压缩，慢但更省（见第 6 节忠告）
```

`--prune` 的默认值是 `2.weeks.ago`：即便对象已不可达且 reflog 过期，gc 还会再留两周宽限，防止并发操作误删；`--prune=now` 才是立即删。

「彻底销毁现场」的组合（例如清理敏感信息后）：

```bash
git reflog expire --expire=now --expire-unreachable=now --all
git gc --prune=now --aggressive
```

## 4. 自动维护

### 4.1 传统自动 gc

`commit`、`merge`、`rebase`、`fetch` 等命令结尾会触发 `git gc --auto`，达到阈值才实际运行：

```bash
git config --get gc.auto             # 默认约 6700：松散对象数阈值
git config --get gc.autoPackLimit    # 默认 50：pack 文件数阈值

git config --global gc.auto 0        # 关闭自动 gc（CI 大批量脚本场景）
```

### 4.2 新一代：git maintenance（Git 2.36+）

传统 gc 是「攒一票大的」，执行时有可感知的卡顿。新机制 `git maintenance` 把维护拆成增量小任务并放到后台按计划执行，大型仓库体验显著更平滑：

```bash
git maintenance start       # 注册后台维护（macOS launchd / Windows 计划任务 / systemd timer）
git maintenance stop        # 取消
git maintenance run --task=gc        # 手动执行单个任务
git config --get maintenance.strategy   # incremental 为推荐策略
```

配套的 Scalar（内置于 Git 的大型仓库工具集）会自动启用 maintenance、partial clone 等一组大仓优化。日常建议：个人机器装好 Git 后 `git maintenance start` 一次即可，之后忘掉 gc 的存在。

## 5. 仓库瘦身实战

### 5.1 定位大对象

```bash
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' |
  awk '/^blob/ {print $2, $3}' |
  sort -rn | head -20
# 输出：字节数 路径，按大小倒序
```

### 5.2 从历史中移除大文件并收尾

改写历史需全团队协调（见黄金法则，[git rebase](git/270-GitRebase)），推荐官方维护的 git-filter-repo：

```bash
pip install git-filter-repo
git filter-repo --path huge-assets.zip --invert-paths   # 从全部历史删除该路径

# 瘦身收尾：清 reflog + 回收
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 5.3 防止再次发生

历史清理是昂贵操作，重点在预防：大二进制走 Git LFS（见 [Git Hook 与 LFS](git/340-GitHookGitLFS)）或制品库；构建产物、日志在 `.gitignore` 中堵死（见 [.gitignore 深入](git/040-GitignoreDeepDive)）。

## 6. 陷阱与忠告

- **「gc 删了我的提交」**：可达对象不可删；丢失的提交都是「reflog 已过期 + 不可达」的。刚 reset 完就 gc --prune=now，等于亲手烧掉后悔药。
- **`--aggressive` 别当保健品**：它对全部对象重算 delta，大仓库动辄几十分钟且收益常为负（局部最优反而更差）。默认参数已足够好，个别对象用 `git repack -a -d -f --depth=50 --window=250` 定向调优。
- **`garbage` 计数不等于损坏**：它是 `.git/objects` 里的陌生文件（中断的临时文件等）；真损坏看 `git fsck` 的 corrupt/missing。
- **CI 里莫名卡顿**：大量一次性提交让松散对象暴增触发 gc；脚本开头 `git -c gc.auto=0 <cmd>` 关闭自动 gc，收尾统一跑一次。
- **清理历史后同事本地还有旧引用**：他们的 reflog/分支引用会让对象继续存在；仓库级瘦身要所有人重新 clone 才彻底。

## gc 相关配置速查

| 配置项                     | 默认值        | 说明                                       |
| :------------------------- | :------------ | :----------------------------------------- |
| `gc.auto`                  | 6700          | 松散对象数阈值，0 = 关闭自动 gc            |
| `gc.autoPackLimit`         | 50            | pack 文件数阈值                            |
| `gc.reflogExpire`          | 90.days       | 可达条目的 reflog 保留期                   |
| `gc.reflogExpireUnreachable` | 30.days     | 不可达条目的保留期                         |
| `gc.pruneExpire`           | 2.weeks.ago   | 不可达对象的宽限期（`--prune` 默认值）     |
| `gc.writeCommitGraph`      | true          | 维护 commit-graph 加速历史遍历             |
| `maintenance.strategy`     | （未设）      | 设为 incremental 启用增量后台维护          |

记忆主线：**两个阈值决定「何时自动跑」，两个时钟决定「敢不敢删」，一个开关决定「新式维护还是老式 gc」**。

## 小结

**初学者要点**

- gc = 打包松散对象 + 合并 pack + 清理「不可达且过期」的对象；可达内容永远安全。
- 平时不用管它，自动维护会触发；`count-objects -v` 是唯一需要认识的仪表。
- 「reflog expire + gc --prune=now」是彻底清理组合，使用前想清楚要不要后悔药。

**进阶注意**

- 瘦身的正路是 filter-repo 改历史 + LFS 预防，而不是反复 aggressive。
- Git 2.36+ 用 `git maintenance start` 替代「攒大了再 gc」的传统模式，大仓库首选。
- gc 阈值（gc.auto / gc.autoPackLimit）可在 CI 与个人机器上按负载分别调优。
