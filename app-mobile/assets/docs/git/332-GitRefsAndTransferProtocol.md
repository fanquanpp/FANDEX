---
order: 350
title: Git 引用与传输协议
module: 'git'
category: 工具链
difficulty: beginner
description: refs 命名空间、refspec 语义与本地/smart HTTP/SSH 三种传输协议的协商过程
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Git 的引用机制与传输协议——对象模型（240 篇讲了「数据怎么存」）之上的「地址怎么指、数据怎么传」。
- **解决什么问题**：为什么删远端分支要写 `git push origin :refs/heads/old` 这么长；`git fetch origin main` 拉回来的东西怎么到不了本地分支；浅克隆为什么快。这些命令行为的答案都在 refs 规则与打包协议里。
- **什么时候用到**：排查「fetch 了但分支没更新」；写 CI 里的精确 refspec；自建 Git 服务器选协议；理解 clone --depth/fetch --prune 的行为边界。

## 1. refs/：一切指针的家

240 篇讲过分支只是指向提交的文件。所有这类指针集中住在 `.git/refs/` 命名空间：

```text
refs/heads/    本地分支        refs/heads/main        -> 提交哈希
refs/remotes/  远程跟踪分支    refs/remotes/origin/main -> 提交哈希
refs/tags/     标签            refs/tags/v1.0.0       -> 提交或 tag 对象
refs/stash     stash 栈顶
```

```bash
# 列出所有引用及指向
git show-ref

# 手工读写引用（脚本里操作引用的正确方式，别直接 echo 覆盖文件）
git update-ref refs/heads/experiment <commit-hash>
git rev-parse refs/heads/main
```

**为什么用 update-ref 而不是 echo**：`update-ref` 会维护引用日志（reflog）、处理符号引用展开、保证原子写。直接 `echo xxx > .git/refs/heads/foo` 绕过了这些保障——reflog 缺一条记录，救援时（260 篇）就少一条线索。

### 符号引用

大部分「引用」其实不直接存哈希，而是指向另一个引用：`cat .git/HEAD` 输出 `ref: refs/heads/main`。HEAD、分支的远程跟踪层都是符号引用。`git symbolic-ref HEAD` 读写它；`git rev-parse HEAD` 则一路解引用到最终哈希。**detached HEAD** 就是 HEAD 从 `ref: ...` 变成了裸哈希——符号链断了，提交不再受分支保护。

## 2. refspec：引用的映射语法

refspec 描述「源引用到目标引用」的映射，push 与 fetch 共用这套语法：

```text
[+]<src>:<dst>
```

`+` 表示允许非快进更新（覆盖远端/本地历史），省略 src 写成 `:dst` 则表示删除目标引用。逐个解剖：

```bash
# 删除远端分支为什么写这么长——因为冒号语法里省略源就是删除
git push origin :refs/heads/old

# 等价易记形式（Git 对 branch 命名空间提供的语法糖）
git push origin --delete old

# 推送并建立显式映射：把本地 dev 推成远端的 experiment
git push origin dev:refs/heads/experiment

# fetch 指定 refspec 只拉一个分支，且落到正确的远程跟踪分支
git fetch origin main:refs/remotes/origin/main

# 通配：默认配置里 fetch 的全量映射长这样
#   fetch = +refs/heads/*:refs/remotes/origin/*
git fetch origin
```

关键细节三处：

1. **fetch 与 push 的默认差异**：`git fetch origin main` 只更新 `FETCH_HEAD`，不更新 `refs/remotes/origin/main`——因为你没写完整 refspec，Git 没有得到「该落到哪里」的目标。想拉且更新跟踪分支要写全 `main:refs/remotes/origin/main`，或直接依赖配置里的通配映射跑裸 `git fetch`。这就是「fetch 了但 origin/main 没动」的真相。
2. **通配里的加号**：配置中 `+refs/heads/*:refs/remotes/origin/*` 的 `+` 允许远端跟踪分支被强制更新——远端历史被改写后你 fetch 能跟上；本地分支的映射若加了 `+` 则危险得多（会覆盖自己的分支）。
3. **prune 的角色**：`fetch --prune` 删除「远端已不存在」的远程跟踪分支——refspec 只管映射方向，删除滞留引用靠 prune。

## 3. 三种传输协议

### 3.1 本地协议

`git clone /path/to/repo` 或 `file:///path`。直接读写文件系统里的对象库，无网络协商。`/path` 硬链接复用对象（快但共享存储），`file://` 走传输流程（慢一点但干净隔离）。CI 与本地实验场景。

### 3.2 SSH 协议

`git@host:user/repo.git`。本质是「远端起一个 `git-upload-pack`（fetch）/`git-receive-pack`（push）进程，stdin/stdout 当管道」。认证复用 SSH 全套机制（凭证与密钥细节见 025 篇）。自建服务器的事实标准。

### 3.3 smart HTTP 协议

`https://host/user/repo.git`。Git 1.6.6 之后的主流：同一个 URL，GET 时服务端以 `info/refs?service=git-upload-pack` 应答声明能力，POST 时走 `git-upload-pack` 的打包流。认证用 token/基础认证（025 篇），对防火墙最友好——只占 80/443。**哑协议（dumb HTTP）**是它的前身：服务端只当静态文件服务器吐 `.git` 目录，无协商，现代托管已不提供。

| 协议   | 认证             | 端口     | 典型场景             |
| ------ | ---------------- | -------- | -------------------- |
| 本地   | 文件系统权限     | -        | CI、本地实验         |
| SSH    | 密钥对           | 22       | 自建服务器、日常开发 |
| smart HTTP | token/凭证   | 80/443   | 托管平台、受限网络   |

## 4. push/pull 的协商与打包

fetch/push 不是「把整个仓库发过去」，而是一次三段式协商：

```text
1. 引用通告    服务端发来全部 refs + 各自哈希
2. 协商        客户端比对本地，报告「我有这些，我要哪些」
3. 打包传输    服务端算出缺失对象集合，生成 pack 文件流式发送
```

以 fetch 为例：服务端通告 `refs/heads/main -> abc123`；客户端发现自己没有 abc123，沿提交链回溯找出双方共同祖先（have/want 协商），请求 `want abc123 have def456`；服务端把 def456 之后的所有对象打成一个包（packfile，delta 压缩）发来；客户端解开入库，再按 refspec 更新引用。

push 方向相反：客户端算出服务端缺什么，自己打 pack 上传，服务端 unpack 后更新它那边的 refs——更新前跑服务器端钩子（340 篇的 pre-receive 就在这里）。

**浅克隆为什么快**：`clone --depth 1` 把协商改成「只要最新一棵快照，不要历史」，have/want 阶段直接截断，包体积从整个历史缩到一个提交。代价：没有历史可供 log/blame/bisect，后续 `fetch --unshallow` 补全。

**为什么这样设计**：协商把传输量从「全量」压到「增量」，且打包在流上进行——客户端不需要等服务端算完整个包就能开始接收。这也是为什么 Git 大仓库的 fetch 远快于同样内容的 zip 下载。

## 5. 不同场景下的例子

**例一：删远端分支的长命令（真实工程场景）**。清理仓库时执行 `git push origin :refs/heads/feature/old-login`。语法读法：refspec 冒号语法中 src 为空即「删除 dst」。写成 `--delete feature/old-login` 是等价糖。**易错点**：`git push origin :main` 会直接删掉远端 main——refspec 的威力与危险是同一件事，托管平台通常靠分支保护拦住它。

**例二：CI 只拉目标分支**。流水线为了省时间写 `git fetch origin main:refs/remotes/origin/main` 显式落到跟踪分支再 checkout，而不是裸 `git fetch origin main`（那样 FETCH_HEAD 里虽有了对象，`origin/main` 引用纹丝不动，后续依赖 `origin/main` 的脚本全部拿到旧值）。

**例三：镜像仓库与精确同步**。备份任务 `git fetch --prune origin "+refs/heads/*:refs/heads/*"` 把远端分支镜像成本地分支（覆盖式 `+` 在这里是刻意为之，因为本地分支只做镜像不做开发）；与此对照，日常仓库绝不能写这条映射，否则远端任何 force push 都会覆盖你的本地工作。

## 动手实践

**练习 1**：在一个测试仓库里 `git update-ref refs/heads/lab-branch HEAD` 创建分支（不经过 branch 命令），用 `git show-ref | grep lab` 验证，`git log --oneline lab-branch` 确认它与 HEAD 同源；再用 `git update-ref -d` 删除。

**提示**：refs 目录下会出现对应文件；Windows 上 `.git/refs` 是真实目录，可以直接 `ls .git/refs/heads` 对照。

**练习 2**：手动执行一次「不带通配的 fetch」：`git fetch origin main`（对任意有远端的仓库），然后对比 `cat .git/FETCH_HEAD` 与 `git rev-parse origin/main`，验证后者未变；再执行完整 refspec 的 fetch，观察 `origin/main` 更新。

**提示**：实验前记录 `git rev-parse origin/main` 的值作为基线。

**练习 3**：用 `git clone --depth 1` 浅克隆本仓库（或任一大仓库），尝试 `git log` 与 `git blame`，观察「历史缺失」的具体报错与行为，最后 `git fetch --unshallow` 补全。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1
git init ref-lab && cd ref-lab
echo hi > f.txt && git add f.txt && git commit -m "init"
git update-ref refs/heads/lab-branch HEAD
git show-ref | grep lab-branch
git log --oneline lab-branch
git update-ref -d refs/heads/lab-branch
git show-ref | grep lab-branch || echo "deleted"

# 练习 2（以任意有 origin 的仓库为例）
before=$(git rev-parse origin/main)
git fetch origin main                 # 无 dst 的 refspec
cat .git/FETCH_HEAD                   # 对象已取到
after_fetch=$(git rev-parse origin/main)
[ "$before" = "$after_fetch" ] && echo "origin/main unchanged"
git fetch origin main:refs/remotes/origin/main
after_full=$(git rev-parse origin/main)
echo "$before -> $after_full"         # 跟踪分支被更新

# 练习 3
git clone --depth 1 https://github.com/fanquanpp/FANDEX.git shallow-lab
cd shallow-lab
git log                               # 只有 1 个提交
git fetch --unshallow
git log --oneline | wc -l             # 历史补全
```

</details>

## 参考与致谢

- Pro Git（第 2 版）第 10 章「Git Internals - Refspec / Transfer Protocols / Maintenance」：<https://git-scm.com/book/zh/v2>（CC BY-NC-SA 3.0，本文协议协商与 update-ref 段落以该章为底改写）
- Git 官方文档 gitrepository-layout(5)、gitprotocol-pack(5)、gitprotocol-http(5)：<https://git-scm.com/docs>（GPLv2 文档许可）
- 本文承接 240-ObjectModel（对象）之后「引用与传输」环节；refs 日常操作另见 110-HEADPointerBranchEssence。
