---
order: 420
title: sparse-checkout 稀疏检出
module: 'git'
category: 工具链
difficulty: advanced
description: git sparse-checkout详解：部分克隆与稀疏检出，优化大型仓库工作流。
author: fanquanpp
updated: '2026-11-16'
related: []
prerequisites: []
---

## 1. sparse-checkout 概述

### 1.1 什么是 sparse-checkout

sparse-checkout 允许只检出仓库的**部分目录**，而非整个仓库。适用于大型 monorepo 场景。

### 1.2 适用场景

- **Monorepo**：只检出自己负责的模块
- **大型仓库**：减少磁盘占用和克隆时间
- **CI/CD**：只检出构建所需的文件

## 2. 基本用法

### 2.1 cone 模式（默认，推荐）

```bash
# 初始化
git clone --filter=blob:none --sparse https://github.com/user/monorepo.git
cd monorepo

# cone 是默认模式：一条 set 完成启用与路径设定
git sparse-checkout set apps/web packages/ui

# 添加更多目录
git sparse-checkout add apps/api

# 查看当前配置
git sparse-checkout list
```

注意：老教程里的 `git sparse-checkout init --cone` 仍能跑，但 `init` 已被官方标记为**废弃**（行为等价于不带路径的 `set`），新代码一律直接 `set`。

### 2.2 完整流程

```bash
# 从零开始
git clone --filter=blob:none --sparse https://github.com/user/monorepo.git
cd monorepo
git sparse-checkout set apps/web

# 只会检出 apps/web 目录
ls
# apps/

# 需要其他目录时
git sparse-checkout add packages/shared
```

### 2.3 禁用与重新启用 sparse-checkout

```bash
# 检出所有文件
git sparse-checkout disable

# 重新启用：不存在 enable 子命令，用 set 重新给出路径（规则保留在 .git/info/sparse-checkout 时）
git sparse-checkout set apps/web
```

## 3. 模式对比

### 3.1 cone 模式（默认）

```bash
git sparse-checkout set apps/web packages/ui
```

只检出指定目录及其内容，性能最优。

### 3.2 非 cone 模式（已废弃）

```bash
git sparse-checkout set --no-cone <<EOF
apps/web/*
!apps/web/tests/*
packages/ui/src/*
EOF
```

支持 glob 模式，但官方文档已明确将其标记为**废弃**（性能差、维护成本高），仅在维护旧仓库的遗留规则时认识它即可。

## 4. 与 shallow clone 配合

```bash
# 浅克隆 + 稀疏检出
git clone --depth=1 --filter=blob:none --sparse \
  https://github.com/user/monorepo.git

# 效果：
# - 只下载最近1次提交
# - 不下载文件内容（按需获取）
# - 只检出指定目录
```

## 5. 性能对比

| 操作         | 完整克隆 | sparse-checkout |
| :----------- | :------- | :-------------- |
| **克隆时间** | 长       | 短              |
| **磁盘占用** | 全部     | 仅指定目录      |
| **网络传输** | 全部     | 按需            |
| **Git 操作** | 正常     | 正常            |
| **切换目录** | 无需     | 需要配置        |

## 6. 注意事项

- 需要服务端支持（GitHub、GitLab 已支持）
- cone 模式下目录名不支持 glob
- 切换分支时可能需要更新 sparse-checkout
- CI/CD 中可利用 sparse-checkout 加速构建
- Git 2.52 新增 `git sparse-checkout clean`：清理检出范围外残留的未跟踪文件

## 练习与自检

遮码自检：先遮住答案栏，自己写出命令或结论，再展开对照。

1. `git clone --filter=blob:none --sparse` 之后，本地只有哪些东西？如果此时直接 `git log -p` 某个未检出目录里的文件会发生什么？
2. 老教程写 `git sparse-checkout init --cone` 再 `set`，为什么现在一条 `set` 就够？`init` 目前的官方状态是什么？
3. 实操：把已有仓库的检出范围追加一个目录，并预检某个路径会不会被检出。

<details>
<summary>参考答案（先自己写再看）</summary>

```bash
# 1) clone --filter=blob:none --sparse 拿到：全部提交与 tree（提交历史完整）
#    但只下载检出路径需要的 blob，且只检出根目录文件 + 指定目录。
#    查看/触碰未检出路径的 blob 时 Git 通过 promisor 远程按需补取，
#    所以 git log -p 能工作，只是会现场发起网络下载（离线时报 missing object 类错误）。

# 2) cone 是默认模式，set 自带「启用配置 + 写规则 + 更新工作区」三件事；
#    init 的历史职责（初始化配置）已被 set 覆盖，官方文档标注 deprecated，
#    行为等价于不带路径的 set，未来版本可能移除。

# 3)
git sparse-checkout add apps/api            # 追加目录并立即更新工作区
echo src/api/users.ts | git sparse-checkout check-rules
# 有输出（回显路径本身）即会被检出；无输出则不会。
# 注意 check-rules 只从 stdin 读路径：把路径当位置参数传会被静默忽略，
# 按空输入处理（无输出、退出码 0）
```

</details>

## 命令速查

### sparse-checkout 启用

**基本写法：一条 set 完成启用与路径设定（推荐）**
`git sparse-checkout set <路径1> <路径2>`
```bash
# cone 是默认模式：启用配置、写规则、更新工作区一次完成
git sparse-checkout set src docs
```

---

**基本写法：init（已废弃，仅认识旧教程）**
`git sparse-checkout init`
```bash
# 行为等价于不带路径的 set；官方文档标注 deprecated，未来可能移除
git sparse-checkout init
```

---

**基本写法：非 cone 模式（已废弃）**
`git sparse-checkout set --no-cone`
```bash
# 完整模式匹配（支持通配符），官方已标记废弃，仅维护旧仓库时认识
git sparse-checkout set --no-cone
```

---

### 设置检出路径

**基本写法：设置需要检出的目录**
`git sparse-checkout set <路径1> <路径2>`
```bash
# 仅检出 src 与 docs 目录
git sparse-checkout set src docs
```

---

**基本写法：从标准输入读取路径**
`git sparse-checkout set --stdin < <文件>`
```bash
# 从文件读取路径列表
git sparse-checkout set --stdin < paths.txt
```

---

**基本写法：追加检出目录**
`git sparse-checkout add <路径>`
```bash
# 在已有基础上添加 tests 目录
git sparse-checkout add tests
```

---

**基本写法：重新应用稀疏规则**
`git sparse-checkout reapply`
```bash
# 修改规则后重新应用
git sparse-checkout reapply
```

---

### 查看与管理

**基本写法：查看当前检出规则**
`git sparse-checkout list`
```bash
# 列出当前所有稀疏检出路径
git sparse-checkout list
```

---

**基本写法：检查路径是否匹配**
`git sparse-checkout check-rules <路径>`
```bash
# 检查某路径是否会被检出
git sparse-checkout check-rules src/api/users.ts
```

---

**基本写法：禁用稀疏检出**
`git sparse-checkout disable`
```bash
# 关闭稀疏检出恢复完整工作区
git sparse-checkout disable
```

---

### cone 模式规则

**基本写法：添加根目录文件**
`git sparse-checkout set "/*"`
```bash
# 锥形模式下检出所有根目录文件
git sparse-checkout set "/*"
```

---

**基本写法：递归检出子目录**
`git sparse-checkout set src/`
```bash
# 检出 src 目录及其全部子目录
git sparse-checkout set src/
```

---

**基本写法：多层目录匹配**
`git sparse-checkout set src/api src/shared`
```bash
# 同时检出多个顶层子目录
git sparse-checkout set src/api src/shared
```

---

### 非 cone 模式规则（已废弃，仅认识即可）

**基本写法：使用通配符匹配**
`git sparse-checkout set "/*.md"`
```bash
# 仅检出根目录 markdown 文件
git sparse-checkout set "/*.md"
```

---

**基本写法：排除某些路径**
`git sparse-checkout set "src/*" "!src/legacy/*"`
```bash
# 检出 src 但排除 legacy 子目录
git sparse-checkout set "src/*" "!src/legacy/*"
```

---

**基本写法：母目录与子目录同时配置**
`git sparse-checkout set "src/" "src/legacy/file.ts"`
```bash
# 检出 src 目录但只保留 legacy 中一个文件
git sparse-checkout set "src/" "src/legacy/file.ts"
```

---

### partial clone 部分克隆

**基本写法：克隆时跳过所有 blob**
`git clone --filter=blob:none <仓库URL>`
```bash
# 仅克隆提交历史，blob 按需获取
git clone --filter=blob:none https://github.com/org/repo.git
```

---

**基本写法：按大小过滤 blob**
`git clone --filter=blob:limit=<大小> <仓库URL>`
```bash
# 跳过大于 1MB 的 blob
git clone --filter=blob:limit=1m https://github.com/org/repo.git
```

---

**基本写法：仅克隆目录树**
`git clone --filter=tree:0 <仓库URL>`
```bash
# 仅克隆提交与目录结构
git clone --filter=tree:0 https://github.com/org/repo.git
```

---

**基本写法：仅克隆指定分支**
`git clone --branch <分支> --single-branch <仓库URL>`
```bash
# 仅克隆 main 分支历史
git clone --branch main --single-branch https://github.com/org/repo.git
```

---

### 组合使用

**基本写法：稀疏检出加部分克隆**
`git clone --filter=blob:none --sparse <仓库URL>`
```bash
# 同时启用部分克隆与稀疏检出
git clone --filter=blob:none --sparse https://github.com/org/repo.git
```

---

**基本写法：克隆后配置稀疏检出**
`git sparse-checkout set <路径>`
```bash
# 进入仓库后设置检出路径
git sparse-checkout set src/api
```

---

**基本写法：将现有仓库转为部分克隆**
`git config remote.origin.partialclonefilter blob:none`
```bash
# 对已有仓库声明 blob:none 过滤（配合 promisor 标记，需远程与 Git 版本支持；
# 不如重新克隆干净，仅在无法重新克隆时使用）
git config remote.origin.promisor true
git config remote.origin.partialclonefilter blob:none
```

---

### 浅克隆对比

**基本写法：浅克隆指定深度**
`git clone --depth=<深度> <仓库URL>`
```bash
# 仅克隆最近 10 次提交
git clone --depth=10 https://github.com/org/repo.git
```

---

**基本写法：浅克隆指定时间**
`git clone --shallow-since=<日期> <仓库URL>`
```bash
# 仅克隆 2024 年以来的提交
git clone --shallow-since=2024-01-01 https://github.com/org/repo.git
```

---

**基本写法：解除浅克隆**
`git fetch --unshallow`
```bash
# 拉取全部历史转为完整仓库
git fetch --unshallow
```

---

### 按需获取对象

**基本写法：缺失 blob 由 Git 懒加载补取**
```bash
# partial clone 下，diff / checkout / log -p 触碰缺失 blob 时自动按需下载
git log -p HEAD -- src/api/users.ts
```

---

**基本写法：批量获取某目录**
`git sparse-checkout add <路径>`
```bash
# 添加目录触发对象获取
git sparse-checkout add src/shared
```

---

**基本写法：检查缺失对象**
`git fsck --connectivity-only`
```bash
# 检查仓库对象连通性
git fsck --connectivity-only
```

---

### 配置与优化

**基本写法：配置部分克隆过滤**
`git config remote.origin.partialclonefilter <过滤>`
```bash
# 设置远程仓库部分克隆过滤规则
git config remote.origin.partialclonefilter blob:none
```

---

**基本写法：启用按需获取**
`git config remote.origin.promisor true`
```bash
# 标记远程为 promisor 允许按需获取
git config remote.origin.promisor true
```

---

**基本写法：查看 sparse 配置**
`git config --get-all core.sparseCheckout`
```bash
# 查看稀疏检出是否启用
git config --get-all core.sparseCheckout
```

---

**基本写法：查看 sparseCheckoutCone**
`git config core.sparseCheckoutCone`
```bash
# 查看是否启用锥形模式
git config core.sparseCheckoutCone
```
