---
order: 370
title: Git LFS 大文件管理
module: 'git'
category: 工具链
difficulty: beginner
description: 用 Git LFS 管理二进制大文件——指针机制、track 与 .gitattributes、历史迁移、文件锁定
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

# Git LFS 大文件管理

## 知识点地图

- **知识类别**：Git 仓库的大文件扩展管理（Git Large File Storage，简称 Git LFS）。
- **解决什么问题**：Git 把每个版本的每个文件完整存进对象库。文本文件差量小，但一张 2048x2048 的贴图、一个 PSD 设计稿、一段宣传视频，改一次就是几十 MB 的新对象。团队仓库clone 几个 GB、push 卡在 100 MB 单文件上限（GitHub 的硬限制），都是二进制大文件直接进 Git 造成的。
- **什么时候用到**：游戏项目（贴图、模型、音频）、设计团队（PSD/AI 源文件）、视频与演示素材、数据集与模型权重。只要仓库里出现「几 MB 以上、且会不断替换」的二进制文件，就该考虑 LFS。

## 1. 心智模型：仓库里只存指针

普通 Git 仓库中，`git add logo.psd` 会把整个 PSD 塞进 blob 对象。启用 LFS 后，Git 的 smudge/clean 过滤器会在 add 与 checkout 之间拦截这个文件：

```text
clean（提交时）：logo.psd 的内容上传到 LFS 存储
                仓库里只剩一个几百字节的指针文件
smudge（检出时）：读到指针文件，从 LFS 存储下载真实内容写回工作区
```

指针文件长这样（可以直接 `cat` 看）：

```text
version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e6992
size 12453376
```

三行各管一件事：`version` 声明指针格式；`oid` 是真实内容在 LFS 存储里的 SHA-256 地址；`size` 是原始字节数。分支切换时 Git 只是在指针文件之间移动，真实内容按需下载——这就是「clone 不再被美术资源拖垮」的原理。

**为什么这样设计**：把「版本历史引用」与「文件内容」拆到两个存储里，Git 只负责轻量的指针历史。代价是 LFS 内容不再天然享受 Git 的完整去重与离线备份，LFS 服务器成了第二份必须管理的资产。

## 2. 安装与初始化

```bash
# Windows：从 https://git-lfs.github.com/ 下载安装包，或用 winget
# macOS
brew install git-lfs
# Linux（Debian/Ubuntu）
sudo apt install git-lfs

# 在当前用户范围启用 Git LFS（写入全局过滤器和钩子配置，只需做一次）
git lfs install

# 仅在当前仓库启用 LFS
git lfs install --local

# 输出当前 Git LFS 版本号，确认安装成功
git lfs version
```

`git lfs install` 做的事：把 `filter.lfs.clean`、`filter.lfs.smudge` 写入 git config，并在 `.git/hooks` 里装上 `post-checkout`、`post-commit`、`post-merge` 三个钩子，让 Git 在这些时机自动触发 LFS 的下载。**易错点**：装了 LFS 二进制但没跑 `git lfs install`，clone 时指针文件不会被替换，工作区里全是文本指针——表现为「打开图片失败，内容是一串 URL」。

## 3. 跟踪大文件：track 与 .gitattributes

```bash
# 跟踪所有 mp4 视频文件
git lfs track "*.mp4"

# 跟踪 assets 目录下所有文件
git lfs track "assets/**"

# 列出当前所有 LFS 跟踪规则
git lfs track

# 移除某类文件的 LFS 跟踪
git lfs untrack "*.mp4"

# 跟踪规则变更必须提交（规则写在 .gitattributes 里，属于仓库内容）
git add .gitattributes && git commit -m "chore: configure LFS tracking"
```

`git lfs track` 不碰任何大文件，它只是往 `.gitattributes` 里加一行：

```text
*.psd filter=lfs diff=lfs merge=lfs -text
```

这一行给四件事下指令：`filter=lfs` 走 clean/smudge 管道；`diff=lfs` 让 diff 只比较指针（比较内容太贵）；`merge=lfs` 禁止 Git 对二进制做文本合并；`-text` 关闭行尾转换，防止二进制被 autocrlf 改坏。

**易错点**：

1. track 规则只对**之后** add 的文件生效。已经作为普通 blob 提交过的文件，需要用 `git lfs migrate`（见第 6 节）改写历史。
2. `.gitattributes` 的 LFS 规则必须提交。同事 clone 下来没有这条规则，他 add 的同名文件还是会走普通 blob，仓库里出现「同一个扩展名两种存储」的分裂。
3. 通配模式是相对仓库根的 glob，`*.mp4` 不匹配 `assets/*.mp4` 之外再深一层的目录时写 `**`。

### 3.1 提交 LFS 文件的日常流程

```bash
# 添加大文件到 LFS 跟踪——流程与普通文件完全一样
git add video.mp4 && git commit -m "feat: add intro video"

# 列出仓库中所有 LFS 跟踪文件
git lfs ls-files

# 显示 LFS 文件的实际大小（默认显示的是指针大小）
git lfs ls-files --size
```

注意 `git add` 之后可以先看一眼暂存的指针：`git show :video.mp4`（读暂存区版本）。如果输出是指针文本而不是乱码二进制，说明 LFS 生效了；如果还是二进制，说明 track 规则没匹配上。

## 4. 拉取与推送

```bash
# 克隆时自动拉取 LFS 文件（默认行为）
git clone https://github.com/org/repo.git

# 仅克隆指针文件不下载大文件内容——CI、服务器部署、只想看代码时用
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/org/repo.git

# 拉取所有 LFS 跟踪文件内容
git lfs pull

# 仅拉取指定目录下的 LFS 文件
git lfs pull --include="assets/videos/*"

# 推送时自动上传 LFS 文件（git push 会先传 LFS 再传 Git 对象）
git push origin main

# 单独推送 LFS 文件到远程
git lfs push origin main

# 推送全部历史 LFS 对象（迁移后或换远端时用）
git lfs push --all origin main
```

`GIT_LFS_SKIP_SMUDGE=1` 是最常用的省流量开关：先拿到完整代码与指针，缺哪个素材再 `git lfs pull --include="..."` 补哪个。**易错点**：`git lfs push` 只推 LFS 内容不推 Git 提交，两者是两次独立传输；CI 上报 `lfs upload failed` 时通常是 LFS 服务器配额满了或凭证过期，而不是 `git push` 本身的问题。

## 5. 检出与状态

```bash
# 用 LFS 内容替换工作区指针文件
git lfs checkout

# 仅检出 assets 目录的 LFS 内容
git lfs checkout --include="assets/*"

# 切换分支后重新检出 LFS 文件
git checkout feature && git lfs checkout

# 显示工作区 LFS 文件状态
git lfs status

# 校验 LFS 对象完整性（本地缓存与指针哈希是否一致）
git lfs fsck

# 查看最近一次 LFS 操作日志——下载失败时第一件事就是看它
git lfs logs last

# 列出所有历史中的 LFS 文件
git lfs ls-files --all
```

## 6. 历史迁移：把已经进仓库的大文件转成 LFS

前面说过，track 规则管不了历史。仓库已经积累了几百 MB 的 PSD 时，用 migrate 改写历史：

```bash
# 将历史中的 mp4 文件迁移到 LFS
git lfs migrate import --include="*.mp4"

# 仅迁移 main 分支的历史文件
git lfs migrate import --include="*.mp4" --include-ref=main

# 迁移所有分支的历史文件
git lfs migrate import --include="*.mp4" --include-ref=refs/heads/*

# 取消 LFS 跟踪并还原文件为普通对象
git lfs migrate export --include="*.mp4"
```

**易错点**：`migrate import` 是**重写历史**，效果等同 rebase——所有受影响提交的哈希全部改变，团队所有人都要重新 clone，已开的 PR 需要重新指向。默认只改当前分支，想清掉全仓库体积必须 `--include-ref=refs/heads/*`。执行前打 tag 或备份裸仓库。远端旧对象不会自动清空，GitHub 需要联系 support 或用 `git lfs push --all` 后重整仓库。

## 7. 锁定文件：二进制的并发编辑防线

文本冲突可以 merge，两个美术同时改一张 PSD 无法合并——后 push 的人直接覆盖前一个人。LFS 提供文件锁：

```bash
# 锁定二进制文件防止并发编辑
git lfs lock assets/logo.psd

# 列出所有已锁定文件
git lfs locks

# 释放自己持有的锁
git lfs unlock assets/logo.psd

# 强制解锁他人持有的锁（管理员场景，慎用）
git lfs unlock assets/logo.psd --force
```

锁记录存在 LFS 服务器上，push 已被他人锁定的文件会被拒绝。把「改 PSD 前先 lock」写进团队规范，比事后争论谁覆盖了谁便宜得多。

## 8. 远程配置与清理

```bash
# 查看 LFS 相关配置（端点地址、凭证）
git config -l | grep lfs

# 配置自定义 LFS 服务器地址（自建 LFS 时写入仓库级 .lfsconfig）
git config -f .lfsconfig lfs.url https://lfs.example.com/org/repo

# 关闭自动下载 LFS 内容（等效于每个 clone 都带 SKIP_SMUDGE）
git config --local lfs.smudge false

# 清理本地未引用的 LFS 对象
git lfs prune

# 预览将被清理的对象
git lfs prune --dry-run

# 拉取最近使用的 LFS 对象（按新近度保留热数据）
git lfs fetch --recent
```

## 9. 不同场景下的例子

**例一：游戏项目贴图（真实工程场景）**。一个 Godot 项目里 `assets/textures/` 塞满 4K 贴图，每轮迭代美术替换一轮，两个月后裸 clone 达 3 GB。做法：`git lfs track "assets/textures/**/*.png"` 与 `track "*.webp"`，CI 上 `GIT_LFS_SKIP_SMUDGE=1` 加速构建，只有打包机全量拉取。替换旧贴图时旧版本对象仍在 LFS 历史里，可随时回退。

**例二：设计稿 PSD 协作**。设计团队把源稿入库，两人同时改 `homepage.psd`。不加锁时后提交者静默覆盖前者工作。做法：改前 `git lfs lock homepage.psd`，LFS 拒绝覆盖他人锁定的文件，PR 阶段才发现冲突的问题提前到了编辑开始前。

**例三：课程演示视频**。教学仓库每章附一段 200 MB 录屏，学生 clone 一次半小时。做法：视频进 LFS，学生按 `git lfs pull --include="videos/chapter-3/*"` 只拉当前章节；讲师整包推 `git lfs push --all`。仓库的 Git 体积保持几十 MB。

**反例（什么时候不该用 LFS）**：几 MB 级别、总量可控的图标集直接进 Git 更简单——LFS 引入了额外服务器依赖与配额（GitHub 免费档 1 GB 存储/月带宽），为几十张小图标上 LFS 是运维负担倒挂。

## 10. 最佳实践清单

1. **合理选择跟踪文件**：只跟踪真正的大文件（经验阈值：超过 1 MB 且会更新版本的二进制）；文本、代码、小图标不要进 LFS。
2. **尽早 track，先 track 后 add**：规则先提交，团队成员拉到规则后再开始提交大文件。
3. **定期清理**：`git lfs prune` 清理过期文件，CI 机器尤其需要（否则缓存无限膨胀）。
4. **备份 LFS 存储**：Git 裸仓库备份不含 LFS 内容，自建服务器要单独备份对象存储。
5. **监控存储与带宽**：托管平台的 LFS 配额按存储与月流量计，超限的团队整个仓库都推不上去。

## 11. 常见问题

**问：`git lfs pull` 报下载失败怎么办？**
先看 `git lfs logs last` 的具体错误；通常是网络（公司代理拦了 LFS 端点）或凭证过期。手动 `git lfs pull` 重试，必要时给 git 单独配代理。

**问：LFS 提示存储不足 / 推不上去？**
先 `git lfs prune` 清本地；远端配额不足则清理历史（migrate 后重推）或升级托管配额。`git lfs ls-files --all --size` 可以先算清大头在哪类文件。

**问：clone 下来图片打不开，内容是 `version https://git-lfs...`？**
指针没有被 smudge。检查 `git lfs install` 是否执行过、`.gitattributes` 是否在仓库里、`git lfs env` 里过滤器是否注册，然后 `git lfs checkout` 补拉内容。

## 动手实践

**练习 1**：在一个测试仓库里 `git lfs track "*.bin"` 并提交规则，然后生成一个 10 MB 文件（`dd if=/dev/urandom of=big.bin bs=1M count=10`）提交。用 `git show :big.bin` 验证暂存区里存的是指针；用 `git lfs ls-files --size` 看真实大小。

**提示**：如果 `git show :big.bin` 输出二进制乱码，先检查 `git lfs track` 列表里有没有 `*.bin`、`.gitattributes` 是否已提交。

**练习 2**：把练习 1 的仓库 clone 一份（本地路径即可），验证第二份仓库里 big.bin 内容完整；再删掉第一份仓库的 `.git/lfs` 缓存目录后 `git lfs pull`，观察内容从 LFS 对象存储（这里即第一份仓库）重新出现。

**练习 3**：用 `git lfs migrate import --include="*.bin" --include-ref=refs/heads/*` 把练习 1 里先提交后 track 的历史改写干净（先故意提交一个普通 blob 的 .bin 再迁移），对比迁移前后 `git log --stat` 里同一文件的表现。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1
git init lfs-lab && cd lfs-lab
git lfs install --local
git lfs track "*.bin"
git add .gitattributes && git commit -m "chore: track .bin with LFS"
dd if=/dev/urandom of=big.bin bs=1M count=10
git add big.bin && git commit -m "feat: add big binary"
git show :big.bin        # 应输出 version https://git-lfs.github.com/spec/v1 ... 指针
git lfs ls-files --size  # 应显示 big.bin 约 10 MB

# 练习 2
git clone ./lfs-lab lfs-lab-2
cd lfs-lab-2 && git lfs fsck   # 校验内容完整
# 回到 lfs-lab 删除缓存后重拉
cd ../lfs-lab && rm -rf .git/lfs && git lfs pull && git lfs fsck

# 练习 3（模拟"先提交后 track"的历史）
echo not-lfs > old.bin
git add old.bin && git commit -m "accident: plain blob"
git lfs migrate import --include="*.bin" --include-ref=refs/heads/*
git log --stat           # old.bin 的历史条目不再携带大对象
git lfs ls-files --all   # old.bin 出现在 LFS 清单里
```

</details>

## 参考与致谢

- Git LFS 官方文档与命令参考：<https://git-lfs.github.com/>（MIT 许可的官网文档）
- GitHub Docs「Managing large files」：<https://docs.github.com/en/repositories/working-with-files/using-large-files>（CC-BY 4.0）
- 本文 LFS 命令速查段落整理自本仓库原 340 篇既有内容（仓库内部素材），其余章节按官方文档重写。
