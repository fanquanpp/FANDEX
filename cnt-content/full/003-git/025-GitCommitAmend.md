---
order: 250
title: git-commit-amend
module: 'git'
category: 工具链
difficulty: intermediate
description: git commit --amend详解：修改最近提交的消息、内容与安全注意事项。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/023-RemoteTrackingBranch'
  - 'git/024-GitFlowGitHubFlow'
prerequisites: []
---

## 1. amend 概述

### 1.1 什么是 amend

`git commit --amend` 用于**修改最近一次提交**，可以修改提交消息或追加文件变更。

### 1.2 amend 的本质

amend 并非"修改"提交，而是**创建新提交替换旧提交**：

```
修改前: A---B---C (HEAD)
修改后: A---B---C' (HEAD)  ← C' 是新提交，C 变为不可达
```

## 2. 基本用法

### 2.1 修改提交消息

```bash
git commit --amend -m "新的提交消息"
```

### 2.2 追加文件变更

```bash
# 忘记添加文件
git add forgotten-file.js
git commit --amend --no-edit    # 不修改消息，只追加文件
```

### 2.3 同时修改消息和内容

```bash
git add new-file.js
git commit --amend -m "feat: add auth with new file"
```

### 2.4 修改作者信息

```bash
# 修改作者
git commit --amend --author="New Name <new@email.com>"

# 修改日期
git commit --amend --date="2026-06-14T10:00:00"
```

## 3. 安全注意事项

### 3.1 黄金法则

**不要 amend 已推送到远程的提交！**

```bash
#  危险
git push
git commit --amend
git push --force    # 会覆盖远程历史

#  安全
git commit --amend  # amend 未推送的提交
git push            # 正常推送
```

### 3.2 恢复 amend 前的提交

```bash
# 通过 reflog 找到 amend 前的提交
git reflog
# abc1234 HEAD@{0}: commit (amend): new message
# def5678 HEAD@{1}: commit: old message  ← amend 前

# 恢复
git reset --soft def5678
```

## 4. 实际场景

### 4.1 修复拼写错误

```bash
git commit -m "feat: add authnetication"    # 拼写错误
git commit --amend -m "feat: add authentication"
```

### 4.2 追加遗漏文件

```bash
git commit -m "feat: add auth"
git add test/auth.test.js                   # 忘记的测试文件
git commit --amend --no-edit
```

### 4.3 修改敏感信息

```bash
# 不小心提交了密码
git add config.js
git commit -m "feat: add config"
# 发现 config.js 包含密码
# 修改文件移除密码
git add config.js
git commit --amend --no-edit
# 注意：旧提交仍存在于 reflog 中，需要 git gc 清理
```
## Conventional Commits 基础

**基本写法：标准提交格式**
`<类型>[可选作用域]: <描述>`
```bash
# 规范化提交信息基本结构
feat: 添加用户登录功能
```

---

**基本写法：带作用域的提交**
`<类型>(<作用域>): <描述>`
```bash
# 指定变更影响的模块
feat(auth): 添加 OAuth2 登录
```

---

**基本写法：带破坏性变更标记**
`<类型>!: <描述>`
```bash
# 用 ! 标记不兼容变更
refactor!: 重构用户模型接口
```

---

**基本写法：带作用域的破坏性变更**
`<类型>(<作用域>)!: <描述>`
```bash
# 指定作用域的破坏性变更
feat(api)!: 修改响应数据结构
```

---

## 提交类型

**基本写法：新功能**
`feat: <描述>`
```bash
# 新增功能特性
feat: 添加导出 PDF 功能
```

---

**基本写法：修复 bug**
`fix: <描述>`
```bash
# 修复缺陷
fix: 修正登录跳转错误
```

---

**基本写法：文档变更**
`docs: <描述>`
```bash
# 仅修改文档
docs: 更新 README 安装步骤
```

---

**基本写法：样式调整**
`style: <描述>`
```bash
# 不影响代码逻辑的格式调整
style: 统一缩进为 4 空格
```

---

**基本写法：重构**
`refactor: <描述>`
```bash
# 既不新增功能也不修复 bug 的代码重构
refactor: 抽离用户认证逻辑
```

---

**基本写法：性能优化**
`perf: <描述>`
```bash
# 提升性能的变更
perf: 优化列表查询缓存
```

---

**基本写法：测试相关**
`test: <描述>`
```bash
# 新增或修改测试
test: 补充用户模块单元测试
```

---

**基本写法：构建系统**
`build: <描述>`
```bash
# 修改构建系统或依赖
build: 升级 webpack 到 5.0
```

---

**基本写法：CI 配置**
`ci: <描述>`
```bash
# 修改持续集成配置
ci: 添加自动部署流水线
```

---

**基本写法：杂项**
`chore: <描述>`
```bash
# 其他不修改源码或测试的杂项
chore: 更新 .gitignore
```

---

**基本写法：代码回退**
`revert: <描述>`
```bash
# 回退某次提交
revert: feat: 添加用户登录功能
```

---

## 完整提交信息结构

**基本写法：带正文的提交**
`<类型>: <描述>\n\n<正文>`
```bash
# 标题后空一行再写正文
git commit -m "feat: 添加用户登录功能" -m "实现邮箱密码与 OAuth 两种方式"
```

---

**基本写法：带脚注的提交**
`<类型>: <描述>\n\n<脚注>`
```bash
# 用脚注标记 issue 或破坏性变更
git commit -m "fix: 修正登录超时" -m "Closes #123"
```

---

**基本写法：破坏性变更脚注**
`<类型>: <描述>\n\nBREAKING CHANGE: <说明>`
```bash
# 用脚注详细说明不兼容变更
git commit -m "feat!: 重构 API" -m "BREAKING CHANGE: 返回结构改为统一信封格式"
```

---

**基本写法：关联 issue**
`<类型>: <描述>\n\nCloses #<编号>`
```bash
# 提交时关闭指定 issue
git commit -m "fix: 修正订单计算" -m "Closes #456"
```

---

## 多行提交信息

**基本写法：使用多个 -m 参数**
`git commit -m "<标题>" -m "<正文>"`
```bash
# 多个 -m 自动以空行分隔
git commit -m "feat: 添加导出功能" -m "支持导出为 CSV 与 JSON 格式"
```

---

**基本写法：使用 HEREDOC**
`git commit -F - <<'EOF'`
```bash
# 通过 HEREDOC 传入复杂提交信息
git commit -F - <<'EOF'
feat: 添加导出功能

支持导出为 CSV 与 JSON 格式
Closes #789
EOF
```

---

**基本写法：从文件读取提交信息**
`git commit -F <文件>`
```bash
# 从文件读取完整提交信息
git commit -F commit-msg.txt
```

---

**基本写法：用编辑器撰写**
`git commit`
```bash
# 不带 -m 时打开编辑器撰写
git commit
```

---

## 修改提交信息

**基本写法：修改最近一次提交信息**
`git commit --amend -m "<新消息>"`
```bash
# 修改最近一次提交的描述
git commit --amend -m "feat: 添加导出功能"
```

---

**基本写法：保留原提交信息修改**
`git commit --amend --no-edit`
```bash
# 仅追加文件不变更信息
git commit --amend --no-edit
```

---

**基本写法：修改历史提交信息**
`git rebase -i <提交>^`
```bash
# 交互式 rebase 改写历史
git rebase -i HEAD~3
```

---

## commitizen 工具

**基本写法：安装 commitizen**
`npm install -g commitizen`
```bash
# 全局安装交互式提交工具
npm install -g commitizen
```

---

**基本写法：初始化 conventional 适配器**
`commitizen init cz-conventional-changelog --save-dev`
```bash
# 项目内配置 conventional 适配器
commitizen init cz-conventional-changelog --save-dev
```

---

**基本写法：用 git cz 代替 git commit**
`git cz`
```bash
# 启动交互式提交表单
git cz
```

---

## commitlint 校验

**基本写法：安装 commitlint**
`npm install --save-dev @commitlint/cli @commitlint/config-conventional`
```bash
# 安装 commitlint 与 conventional 配置
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

---

**基本写法：配置 commitlint**
`echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js`
```bash
# 创建 commitlint 配置文件
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js
```

---

**基本写法：校验提交信息**
`echo "<消息>" | commitlint`
```bash
# 校验单条提交信息格式
echo "feat: 添加登录" | commitlint
```

---

**基本写法：从最近提交校验**
`commitlint --from=<提交> --to=<提交>`
```bash
# 校验范围内的所有提交
commitlint --from=HEAD~5 --to=HEAD
```

---

## 自动生成变更日志

**基本写法：安装 standard-version**
`npm install --save-dev standard-version`
```bash
# 安装自动版本与日志工具
npm install --save-dev standard-version
```

---

**基本写法：生成版本与日志**
`npx standard-version`
```bash
# 根据 conventional 提交生成 CHANGELOG
npx standard-version
```

---

**基本写法：指定发布类型**
`npx standard-version --release-as <类型>`
```bash
# 强制发布为主版本/次版本/修订版
npx standard-version --release-as major
```

---

**基本写法：使用 conventional-changelog**
`npx conventional-changelog -p angular -i CHANGELOG.md -s`
```bash
# 按 angular 预设生成变更日志
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

---

## 配套钩子校验

**基本写法：在 commit-msg 钩子中校验**
`.husky/commit-msg`
```bash
# 用 husky 钩子调用 commitlint
npx --no-install commitlint --edit "$1"
```

---

**基本写法：跳过钩子校验**
`git commit --no-verify -m "<消息>"`
```bash
# 紧急情况跳过校验（不推荐）
git commit --no-verify -m "fix: 紧急修复"
```

---

## Angular 提交规范

**基本写法：Angular 类型**
`<type>(<scope>): <subject>`
```bash
# Angular 规范要求主题全小写且不超过 72 字符
feat(auth): add oauth2 login
```

---

**基本写法：主题用祈使句**
`<类型>: <动词原形> <宾语>`
```bash
# 主题用祈使句现在时
feat: add export feature
```

---

**基本写法：正文换行控制**
`<每行不超过 72 字符>`
```bash
# 正文每行限制 72 字符便于阅读
git commit -m "feat: add export" -m "支持 CSV 与 JSON 两种格式导出"
```
