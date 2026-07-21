# 撤销提交

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## revert 基本用法

**基本写法：撤销单个提交**
`git revert <提交哈希>`
```bash
# 撤销 abc1234 提交
git revert abc1234;
```

**基本写法：不自动提交**
`git revert -n <提交哈希>`
```bash
# 撤销 abc1234 但不自动提交
git revert -n abc1234;
```

**基本写法：撤销连续多个提交**
`git revert <起始哈希>..<结束哈希>`
```bash
# 撤销 abc1234 到 def5678 之间的提交
git revert abc1234..def5678;
```

**单行写法：撤销多个不连续提交**
`git revert <哈希1> <哈希2> <哈希3>`
```bash
# 撤销多个不连续的提交
git revert abc1234 def5678 ghi9012;
```

**换行写法：撤销多个不连续提交**
`git revert <哈希1> <哈希2> <哈希3>`
```bash
# 换行书写多个提交
git revert abc1234 \
          def5678 \
          ghi9012;
```

**基本写法：指定 revert 消息**
`git revert -m "<消息>" <提交哈希>`
```bash
# 撤销 abc1234 并指定消息
git revert -m "revert: 回退认证功能" abc1234;
```

---

## 合并提交的 revert

**基本写法：查看合并提交的父提交**
`git cat-file -p <合并提交哈希>`
```bash
# 查看 abc1234 合并提交的父提交
git cat-file -p abc1234;
```

**基本写法：revert 保留第一个父提交**
`git revert -m 1 <合并提交哈希>`
```bash
# 撤销合并提交，保留主分支的变更
git revert -m 1 abc1234;
```

**基本写法：revert 保留第二个父提交**
`git revert -m 2 <合并提交哈希>`
```bash
# 撤销合并提交，保留合并分支的变更
git revert -m 2 abc1234;
```

---

## 重新合并已撤销的分支

**基本写法：revert 之前的 revert**
`git revert <revert提交哈希>`
```bash
# 恢复被撤销的合并
git revert revert-commit;
```

**基本写法：重新合并分支**
`git merge <分支名>`
```bash
# revert revert 后重新合并 feature 分支
git merge feature;
```

---

## revert 冲突处理

**基本写法：触发 revert 冲突**
`git revert <提交哈希>`
```bash
# 触发 revert 冲突
git revert abc1234;
```

**基本写法：添加解决后的文件**
`git add .`
```bash
# 添加解决冲突后的文件
git add .;
```

**基本写法：继续 revert 流程**
`git revert --continue`
```bash
# 继续 revert 流程
git revert --continue;
```

**基本写法：放弃 revert**
`git revert --abort`
```bash
# 放弃当前 revert 操作
git revert --abort;
```

---

## reset 撤销提交

**基本写法：软回退**
`git reset --soft HEAD~<n>`
```bash
# 撤销最近一次提交，修改保留在暂存区
git reset --soft HEAD~1;
```

**基本写法：混合回退**
`git reset --mixed HEAD~<n>`
```bash
# 撤销最近一次提交，修改保留在工作区
git reset --mixed HEAD~1;
```

**基本写法：硬回退**
`git reset --hard HEAD~<n>`
```bash
# 撤销最近一次提交并丢弃修改
git reset --hard HEAD~1;
```

---

## 撤销工作区修改

**基本写法：撤销单个文件修改**
`git checkout -- <file>`
```bash
# 撤销 src/index.js 的工作区修改
git checkout -- src/index.js;
```

**基本写法：使用 restore 撤销**
`git restore <file>`
```bash
# 撤销指定文件修改（Git 2.23+）
git restore src/index.js;
```

---

## 撤销暂存

**基本写法：取消暂存（保留修改）**
`git reset HEAD <file>`
```bash
# 将 src/index.js 移出暂存区
git reset HEAD src/index.js;
```

**基本写法：使用 restore 撤销暂存**
`git restore --staged <file>`
```bash
# 取消暂存但保留工作区修改（Git 2.23+）
git restore --staged src/index.js;
```

---

## 实际场景

**基本写法：回退已推送的功能**
`git revert <提交哈希>`
```bash
# 撤销已推送的 abc1234 提交
git revert abc1234;
```

**基本写法：推送撤销结果**
`git push <远程仓库名> <分支名>`
```bash
# 推送撤销结果到远程
git push origin main;
```

**基本写法：回退整个发布**
`git revert <起始标签>..<结束标签>`
```bash
# 回退 v1.0.0 到 v1.1.0 之间的所有提交
git revert v1.0.0..v1.1.0;
```

**基本写法：安全撤销错误提交**
`git revert <错误提交哈希>`
```bash
# 撤销错误提交
git revert wrong-commit;
```

**基本写法：补充撤销原因说明**
`git commit -m "<消息>"`
```bash
# 提交撤销原因说明
git commit -m "revert: 回退错误提交，原因：...";
```
