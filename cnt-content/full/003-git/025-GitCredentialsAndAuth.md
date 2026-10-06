---
order: 30
title: Git 凭证与远程认证
module: 'git'
category: 工具链
difficulty: beginner
description: HTTPS token、credential helper、SSH 密钥生成验证与多账号 host 别名配置
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：远程仓库的凭证与认证——Git 如何向远端证明「你有权推这个仓库」。
- **解决什么问题**：`git push` 报 `Authentication failed`、每次推送都要输密码、公司 GitLab 和个人 GitHub 双账号互相串号。这些问题全部出在「凭证怎么存、用哪套身份」上，与 remote 命令本身无关（remote 操作见 150 篇，GitHub 平台侧的协议选择与账号接线见 004-github 模块 040-SSHHTTPS 篇）。
- **什么时候用到**：第一次向 GitHub 推送；把 HTTPS 远端换成 SSH 或反之；入职配公司 GitLab；一台机器上同时维护个人与工作仓库。

## 1. 两条认证路线总览

Git 远端地址的协议决定了认证方式：

| 远端 URL 形式                          | 认证方式                       | 典型场景           |
| -------------------------------------- | ------------------------------ | ------------------ |
| `https://github.com/user/repo.git`     | 用户名 + Personal Access Token（密码位） | 代理友好、CI 常用 |
| `git@github.com:user/repo.git`         | SSH 密钥对                     | 日常开发、免密推送 |
| `ssh://git@host:port/user/repo.git`    | SSH 密钥对（显式端口写法）     | 自建服务器非标端口 |

**为什么 GitHub 不再接受账号密码**：2021 年起 GitHub 对 Git 操作停用密码认证，HTTPS 推送必须用 PAT（Personal Access Token）。密码登录的是网页，token 才是「API 与 Git 的钥匙」——它可以限定权限范围（repo、workflow 等）、随时吊销、不暴露主密码。

## 2. HTTPS 路线：token 与 credential helper

### 2.1 第一次 push 被要求登录

场景：新机器 clone 完仓库，第一次 `git push`，终端弹出：

```text
Username for 'https://github.com': your-name
Password for 'https://your-name@github.com':
remote: Support for password authentication was removed on August 13, 2021.
```

这里 Password 位要填的是 PAT，不是 GitHub 密码。生成路径：GitHub 网页 Settings -> Developer settings -> Personal access tokens，勾选 `repo` 权限范围。GitLab 同理（Preferences -> Access Tokens，scope 选 `write_repository`）。

### 2.2 credential helper：凭证存哪里

每次推送都手填 token 不可忍受，Git 用 credential helper 决定凭证的存取：

```bash
# Git Credential Manager（Windows/macOS 安装包自带，推荐）
# 弹出浏览器 OAuth 授权，凭证存入系统凭据管理器
git config --global credential.helper manager

# 内存缓存：凭证在内存里保留 900 秒后丢弃（Linux 服务器常用）
git config --global credential.helper "cache --timeout=3600"

# 明文文件存储：最不安全，仅在临时环境用
git config --global credential.helper store
```

三种 helper 的存储位置与风险对照：

| helper   | 存储位置                        | 风险                                   |
| -------- | ------------------------------- | -------------------------------------- |
| manager  | 系统凭据管理器（Windows Credential Manager / macOS Keychain） | 最低；系统级加密 |
| cache    | 进程内存，超时销毁              | 低；重启即失效，适合一次性任务         |
| store    | `~/.git-credentials` 明文文件   | 高；任何能读你家目录的进程都能拿到 token |

**易错点**：`store` 写入的是 `https://user:token@github.com` 形式的明文行。把家目录同步到网盘、或误提交 dotfiles 仓库，token 就泄露了。泄露的处置：立刻到托管平台吊销 token——token 的好处正是可以单独吊销而不动主密码。

查看与清除已存凭证：

```bash
# 查询 helper 会为该主机返回什么（调试用）
git credential fill << EOF
protocol=https
host=github.com
EOF

# Windows 下清除系统凭据管理器里的 GitHub 条目
cmdkey /list | findstr git
cmdkey /delete:LegacyGeneric:target=git:https://github.com
```

换 token、换账号时先清旧凭证再操作，否则 Git 一直用缓存的旧凭证报 403，很多人在这里卡半天。

## 3. SSH 路线：密钥生成到验证

SSH 的思路完全不同：你本地持有一对密钥，私钥永不离开本机，公钥贴到托管平台。Git 连接时平台用公钥出题、你的私钥作答，全程不传秘密本身。

### 3.1 生成密钥

```bash
# 生成 ed25519 算法的 SSH 密钥（现代首选，密钥短、安全、快）
ssh-keygen -t ed25519 -C "your_email@example.com";

# 生成 RSA 算法的 SSH 密钥（老服务器不支持 ed25519 时的兜底）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com";
```

逐个参数讲：`-t` 选算法；`-b 4096` 是 RSA 的密钥位数——RSA 默认 3072 位安全性趋紧，4096 是社团讲稿与多数企业规范的最低线，而 ed25519 不需要也不接受 `-b`；`-C` 是注释，习惯放邮箱，仅用于识别，与认证无关——写成别的字符串完全不影响使用。回车后会问两件事：保存路径（默认 `~/.ssh/id_ed25519`，多账号时改名，见第 4 节）与 passphrase——**建议设**。私钥文件被拷走时，passphrase 是最后一道锁；配合 `ssh-agent` 只需开机输一次。

生成后 `~/.ssh/` 里出现两个文件：`id_ed25519`（私钥，绝不外传）与 `id_ed25519.pub`（公钥，随便贴）。

### 3.2 公钥贴到平台并验证

```bash
# 查看 ed25519 公钥
cat ~/.ssh/id_ed25519.pub;

# 查看 RSA 公钥
cat ~/.ssh/id_rsa.pub;
```

复制 `.pub` 全文（一行 `ssh-ed25519 AAAA...注释`），贴到 GitHub 的 Settings -> SSH and GPG keys -> New SSH key。然后验证：

```bash
# 测试 GitHub 连接
ssh -T git@github.com;

# 测试 GitLab 连接
ssh -T git@gitlab.com;
```

成功的输出是：

```text
Hi your-name! You've successfully authenticated, but GitHub does not
provide shell access.
```

这句「does not provide shell access」是正常的——`-T` 表示禁用伪终端分配，Git 托管服务器只提供 Git 服务不给 shell。**易错点**：第一次连接会问 `Are you sure you want to continue connecting (yes/no)?`，这里必须输入完整的 `yes` 而不是 `y`，否则会被当作拒绝；另外 `ssh -T` 验证通过不代表 Git 配好了——还要确认仓库远端 URL 用的是 `git@` 形式，`git remote -v` 检查，HTTPS 地址不会走 SSH。

验证失败排查顺序：`ssh -vT git@github.com` 开详细日志，看它尝试了哪些私钥文件（`Offering public key:` 行）；再看平台公钥是否贴全（复制时截断是高频事故）；最后查 `~/.ssh` 权限——私钥必须 600，目录 700，权限太开放 SSH 会直接拒用。

## 4. 多账号：host 别名

场景：个人 GitHub 与公司 GitLab 双账号在同一台机器。两个账号意味着两对密钥，而 SSH 默认只拿 `id_ed25519` 去敲所有主机——公司仓库就会用个人身份认证失败。解决方案是 `~/.ssh/config` 的 host 别名：

```text
# 个人 GitHub
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# 公司 GitLab（别名 work-gitlab）
Host work-gitlab
    HostName gitlab.company.com
    User git
    IdentityFile ~/.ssh/id_work_ed25519
    IdentitiesOnly yes
```

逐行解释：`Host` 是你给这套配置起的名字，之后的 `git@` 地址里写它就能命中；`HostName` 才是真实主机名；`User git` 固定为 git（Git 托管服务都以 git 用户接入，身份靠密钥区分）；`IdentityFile` 指定这对 host 用哪把私钥；`IdentitiesOnly yes` 禁止 ssh-agent 把其他密钥先递上去——不写它，agent 里的第一把密钥若被服务器接受（同名账号），配置形同虚设，这是多账号串号最隐蔽的成因。

使用时远端地址写别名：

```bash
# 个人仓库照旧
git clone git@github.com:me/personal.git

# 公司仓库用别名
git clone git@work-gitlab:team/secret-project.git
```

验证某一别名：`ssh -T git@work-gitlab`。**易错点**：别名只影响 SSH 路线；如果 clone 时用了 HTTPS 地址，`~/.ssh/config` 不会生效，要走 HTTPS 多账号得配 `credential.<url>.helper` 按 URL 分流或改用 SSH 地址。

## 5. 不同场景下的例子

**例一：第一次 push 到 GitHub（真实工程场景）**。新人 clone 后 push 弹登录框，填 GitHub 密码报 `Authentication failed`。正确路径：网页生成 PAT（勾 `repo`）-> Password 位填 token -> Git Credential Manager 自动保存，之后不再询问。若机器上有 GCM 但之前存了错误凭证，先 `cmdkey /delete` 清掉再推。

**例二：公司 GitLab 与个人 GitHub 双账号**。开发者在公司电脑上维护两个身份：`~/.ssh/config` 配 `github.com` 与 `work-gitlab` 两个 Host 块各指各的私钥；公司仓库 clone 地址用 `git@work-gitlab:...`。再配合仓库级 `git config user.email`（个人仓库用个人邮箱、公司仓库用公司邮箱）把提交署名也对上。

**例三：CI 流水线的只读凭证**。CI 机器拉私有仓库，不适合放人的 SSH 密钥：给流水线发一个只读 deploy key（平台侧以 Deploy keys 形式添加服务器公钥）或最小权限 PAT，`credential.helper` 用 `cache` 短超时，任务结束凭证即失效。

**例四：代理环境坚持 HTTPS**。公司网络封 22 端口，SSH 连 GitHub 超时。两条路：换 HTTPS + token（GCM 认证走浏览器，通常能过代理）；或用 SSH over HTTPS 端口——在 `~/.ssh/config` 给 `github.com` 加 `Port 443` 并 `HostName ssh.github.com`。

## 动手实践

**练习 1**：在测试环境生成一把带 passphrase 的 ed25519 密钥（用 `-f` 指定临时文件名，不要覆盖已有 `~/.ssh/id_ed25519`），用 `ssh-keygen -y -f <私钥>` 由私钥导出公钥，对比它与 `.pub` 文件内容一致。

**提示**：`ssh-keygen -y` 的输出就是公钥本体，验证「公私钥成对」不需要连任何服务器。

**练习 2**：在 `~/.ssh/config` 里为同一台 GitHub 写两个 Host 别名（同一把密钥即可），分别 `ssh -T` 验证都返回同一账号名；然后删掉 `IdentitiesOnly yes` 并往 agent 里加两把不同密钥（`ssh-add`），观察认证可能落到错误账号的现象。

**提示**：`ssh-add -l` 列 agent 中的密钥；实验后 `ssh-add -D` 清空。

**练习 3**：把一个本地仓库的远端在 HTTPS 与 SSH 两种地址间切换（`git remote set-url`），各推一次提交，观察两种认证路径分别在哪里被触发。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1
ssh-keygen -t ed25519 -C "lab-test" -f ~/.ssh/lab_test_key -N "lab123"
ssh-keygen -y -f ~/.ssh/lab_test_key   # 提示输 passphrase
# 输出应与 cat ~/.ssh/lab_test_key.pub 的主体一致（去掉类型与注释字段）

# 练习 2
cat >> ~/.ssh/config << 'EOF'
Host gh-a
    HostName github.com
    User git
    IdentityFile ~/.ssh/lab_test_key
    IdentitiesOnly yes
Host gh-b
    HostName github.com
    User git
    IdentityFile ~/.ssh/lab_test_key
    IdentitiesOnly yes
EOF
ssh -T git@gh-a
ssh -T git@gh-b     # 两者应返回同一 "Hi <账号>!"

# 练习 3
git remote set-url origin git@github.com:me/lab.git
git push origin main     # 走 SSH：不弹登录框，直接密钥认证
git remote set-url origin https://github.com/me/lab.git
git push origin main     # 走 HTTPS：GCM 弹窗或读已存 token
```

</details>

## 参考与致谢

- Git 官方文档 credential helper 与 gitcredentials(7)：<https://git-scm.com/docs/gitcredentials>（GPLv2 文档许可）
- GitHub Docs「Connecting to GitHub with SSH」与「Creating a personal access token」：<https://docs.github.com/en/authentication>（CC-BY 4.0）
- OpenSSH 手册 ssh-keygen(1)、ssh_config(5)：本机 `man ssh-keygen`
- 本文 SSH 密钥配置节素材整理自本仓库原 150 篇既有内容（仓库内部素材），其余按官方文档重写。
