---
order: 102
title: Actions缓存依赖
module: github
category: toolchain
difficulty: intermediate
description: 'GitHub Actions缓存机制详解：actions/cache使用、缓存策略与依赖加速最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/常见问题排查
  - github/Actions矩阵构建
  - github/Actions自托管运行器
  - github/Actions制品传递
prerequisites:
  - github/GitHub概述
---

## 1. 缓存机制原理

### 1.1 缓存工作流程

```
Job 开始
  │
  ├── 检查缓存是否存在（基于 key 匹配）
  │   ├── 命中 → 恢复缓存到指定路径
  │   └── 未命中 → 正常安装依赖
  │
  ├── 执行构建/测试
  │
  └── Post 阶段 → 保存新缓存（如果 key 不存在）
```

### 1.2 缓存限制

| 限制项       | 值                       |
| ------------ | ------------------------ |
| 单个缓存大小 | 最大 10 GB               |
| 仓库总缓存   | 最大 10 GB               |
| 缓存保留时间 | 7 天未访问自动删除       |
| 缓存范围     | 同一仓库的所有分支可共享 |

## 2. actions/cache 使用

### 2.1 基本用法

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

### 2.2 参数详解

| 参数                | 说明                                 |
| ------------------- | ------------------------------------ |
| `path`              | 要缓存/恢复的路径，支持多路径和 glob |
| `key`               | 缓存键，用于精确匹配                 |
| `restore-keys`      | 回退键前缀，用于部分匹配             |
| `upload-chunk-size` | 上传分块大小（默认 32MB）            |

### 2.3 缓存匹配逻辑

```
1. 精确匹配 key
   npm-linux-abc123  → 命中 → 恢复，跳过保存

2. 未精确匹配，按 restore-keys 顺序前缀匹配
   npm-linux-xyz789  → 命中 → 恢复，Post 阶段用新 key 保存

3. 都未命中
   → 不恢复，Post 阶段用新 key 保存
```

## 3. 各语言缓存配置

### 3.1 Node.js / npm

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-${{ runner.os }}-

- run: npm ci # npm ci 利用缓存加速安装
```

使用 `setup-node` 内置缓存：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm # 自动缓存 ~/.npm
```

### 3.2 Python / pip

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: pip-${{ runner.os }}-

- run: pip install -r requirements.txt
```

### 3.3 Go

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: go-${{ runner.os }}-${{ hashFiles('go.sum') }}
    restore-keys: go-${{ runner.os }}-

- run: go mod download
```

### 3.4 Java / Gradle

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: gradle-${{ runner.os }}-
```

### 3.5 Rust / Cargo

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: cargo-${{ runner.os }}-${{ hashFiles('**/Cargo.lock') }}
    restore-keys: cargo-${{ runner.os }}-
```

## 4. 缓存策略优化

### 4.1 缓存键设计

```yaml
# 精确缓存：依赖文件变化时失效
key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

# 粗粒度缓存：同一 OS 共享
key: npm-${{ runner.os }}-

# 多级回退
key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
restore-keys: |
  npm-${{ runner.os }}-
  npm-
```

### 4.2 分层缓存

```yaml
# 第一层：操作系统 + 语言版本
# 第二层：依赖文件哈希
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-node22-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-node22-
      npm-${{ runner.os }}-
```

### 4.3 条件缓存

```yaml
- uses: actions/cache@v4
  if: github.ref == 'refs/heads/main' # 仅 main 分支保存缓存
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

### 4.4 缓存命中判断

```yaml
- uses: actions/cache@v4
  id: cache-npm
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

- name: Install dependencies
  if: steps.cache-npm.outputs.cache-hit != 'true'
  run: npm ci

- name: Quick install (cache hit)
  if: steps.cache-npm.outputs.cache-hit == 'true'
  run: npm ci --prefer-offline
```

## 5. 缓存管理

### 5.1 手动清除缓存

```bash
# 使用 GitHub CLI 清除所有缓存
gh api repos/OWNER/REPO/actions/caches \
  --method GET \
  --jq '.actions_caches[].id' | \
  xargs -I {} gh api repos/OWNER/REPO/actions/caches/{} --method DELETE
```

### 5.2 按键前缀清除

```bash
gh api repos/OWNER/REPO/actions/caches?key=npm-linux- \
  --method GET \
  --jq '.actions_caches[].id' | \
  xargs -I {} gh api repos/OWNER/REPO/actions/caches/{} --method DELETE
```

### 5.3 缓存大小监控

```yaml
- name: Check cache size
  run: |
    du -sh ~/.npm || true
    du -sh ~/.cache/pip || true
    du -sh ~/go/pkg/mod || true
```

## 6. 常见问题

### 6.1 缓存未命中

```yaml
# 问题：缓存键过于精确
key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ github.sha }}
# 每次提交都不同，永远命中不了

# 解决：去掉不必要的变量
key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

### 6.2 缓存过大

```yaml
# 问题：缓存了不必要的文件
path: node_modules # 包含平台相关的二进制文件

# 解决：只缓存包管理器缓存目录
path: ~/.npm # 只缓存下载缓存
```

### 6.3 跨分支缓存

缓存默认在同一仓库的所有分支间共享，但 `key` 中的分支变量会限制匹配：

```yaml
# 问题：key 包含分支名，其他分支无法命中
key: npm-${{ github.ref }}-${{ hashFiles('package-lock.json') }}

# 解决：key 不包含分支名
key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```
