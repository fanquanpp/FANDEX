# Git 远程仓库操作

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 添加远程仓库

**基本写法：添加远程仓库**
`git remote add <远程仓库名> <仓库地址>`
```bash
# 添加名为 origin 的远程仓库
git remote add origin https://github.com/username/repository.git;
```

---

## 查看远程仓库信息

**基本写法：查看远程仓库列表**
`git remote -v`
```bash
# 列出所有远程仓库
git remote -v;
```

**基本写法：查看远程仓库详情**
`git remote show <远程仓库名>`
```bash
# 查看 origin 的详细信息
git remote show origin;
```

---

## 重命名远程仓库

**基本写法：重命名远程仓库**
`git remote rename <旧远程仓库名> <新远程仓库名>`
```bash
# 将 origin 重命名为 upstream
git remote rename origin upstream;
```

---

## 删除远程仓库

**基本写法：删除远程仓库**
`git remote remove <远程仓库名>`
```bash
# 删除名为 origin 的远程仓库
git remote remove origin;
```

---

## 更新远程仓库 URL

**基本写法：更新远程仓库 URL**
`git remote set-url <远程仓库名> <新仓库地址>`
```bash
# 更新 origin 的 URL
git remote set-url origin https://github.com/username/new-repository.git;
```

---

## 首次推送

**基本写法：首次推送并设置上游**
`git push -u <远程仓库名> <本地分支名>:<远程分支名>`
```bash
# 首次推送到 origin 的 main 分支并设置上游
git push -u origin main;
```

---

## 后续推送

**基本写法：简化推送**
`git push`
```bash
# 推送到默认上游分支
git push;
```

**基本写法：推送指定分支**
`git push <远程仓库名> <本地分支名>:<远程分支名>`
```bash
# 推送本地 feature 到远程 feature
git push origin feature:feature;
```

**基本写法：推送所有分支**
`git push --all <远程仓库名>`
```bash
# 推送所有分支到 origin
git push --all origin;
```

**基本写法：强制推送**
`git push -f <远程仓库名> <分支名>`
```bash
# 强制推送 main 分支
git push -f origin main;
```

---

## 拉取远程更改

**基本写法：拉取并合并**
`git pull`
```bash
# 拉取默认上游分支并合并
git pull;
```

**基本写法：拉取指定分支**
`git pull <远程仓库名> <远程分支名>:<本地分支名>`
```bash
# 拉取 origin 的 main 分支到本地 main
git pull origin main:main;
```

**基本写法：允许合并不相关历史**
`git pull --allow-unrelated-histories`
```bash
# 拉取并合并不相关历史
git pull --allow-unrelated-histories;
```

---

## 获取远程更改

**基本写法：获取所有更新**
`git fetch <远程仓库名>`
```bash
# 获取 origin 的所有更新
git fetch origin;
```

**基本写法：获取所有远程仓库更新**
`git fetch --all`
```bash
# 获取所有远程仓库的更新
git fetch --all;
```

**基本写法：查看获取的远程分支**
`git branch -r`
```bash
# 列出所有远程分支
git branch -r;
```

---

## 远程分支管理

**基本写法：从远程分支创建本地分支**
`git checkout -b <本地分支名> <远程仓库名>/<远程分支名>`
```bash
# 基于 origin/feature 创建本地 feature 分支
git checkout -b feature origin/feature;
```

**基本写法：跟踪远程分支**
`git branch --set-upstream-to=<远程仓库名>/<远程分支名> <本地分支名>`
```bash
# 将本地 main 跟踪 origin/main
git branch --set-upstream-to=origin/main main;
```

**基本写法：删除远程分支**
`git push <远程仓库名> --delete <分支名>`
```bash
# 删除 origin 上的 feature 分支
git push origin --delete feature;
```

---

## SSH 密钥配置

**基本写法：生成 ed25519 SSH 密钥**
`ssh-keygen -t <算法> -C "<注释>"`
```bash
# 生成 ed25519 算法的 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com";
```

**基本写法：生成 RSA SSH 密钥**
`ssh-keygen -t <算法> -b <位数> -C "<注释>"`
```bash
# 生成 RSA 算法的 SSH 密钥
ssh-keygen -t rsa -b 4096 -C "your_email@example.com";
```

**基本写法：查看 ed25519 SSH 公钥**
`cat ~/.ssh/<密钥文件>.pub`
```bash
# 查看 ed25519 公钥
cat ~/.ssh/id_ed25519.pub;
```

**基本写法：查看 RSA SSH 公钥**
`cat ~/.ssh/<密钥文件>.pub`
```bash
# 查看 RSA 公钥
cat ~/.ssh/id_rsa.pub;
```

**基本写法：测试 GitHub SSH 连接**
`ssh -T git@<域名>`
```bash
# 测试 GitHub 连接
ssh -T git@github.com;
```

**基本写法：测试 GitLab SSH 连接**
`ssh -T git@<域名>`
```bash
# 测试 GitLab 连接
ssh -T git@gitlab.com;
```

---

## 高级远程操作

**基本写法：推送特定提交**
`git push <远程仓库名> <提交哈希>:<远程分支名>`
```bash
# 将 abc1234 提交推送到 origin 的 main 分支
git push origin abc1234:main;
```

**基本写法：推送所有标签**
`git push --tags <远程仓库名>`
```bash
# 推送所有标签到 origin
git push --tags origin;
```

**基本写法：推送特定标签**
`git push <远程仓库名> <标签名>`
```bash
# 推送 v1.0.0 标签到 origin
git push origin v1.0.0;
```

**基本写法：同步远程分支（清理）**
`git fetch --prune <远程仓库名>`
```bash
# 同步 origin 并清理已删除的远程分支
git fetch --prune origin;
```

**基本写法：同步所有远程仓库并清理**
`git fetch --all --prune`
```bash
# 同步所有远程仓库并清理
git fetch --all --prune;
```

---

## 多远程仓库管理

**基本写法：添加主仓库**
`git remote add <名称> <地址>`
```bash
# 添加主仓库 origin
git remote add origin https://github.com/username/repository.git;
```

**基本写法：添加备份仓库**
`git remote add <名称> <地址>`
```bash
# 添加备份仓库 backup
git remote add backup https://gitee.com/username/repository.git;
```

**基本写法：推送到主仓库**
`git push <远程仓库名> <分支名>`
```bash
# 推送到主仓库 origin
git push origin main;
```

**基本写法：推送到备份仓库**
`git push <远程仓库名> <分支名>`
```bash
# 推送到备份仓库 backup
git push backup main;
```

**基本写法：从特定远程拉取**
`git pull <远程仓库名> <分支名>`
```bash
# 从备份仓库拉取 main 分支
git pull backup main;
```
