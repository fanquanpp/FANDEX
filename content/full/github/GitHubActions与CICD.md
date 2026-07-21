---
order: 90
tags:
  - github
  - devops
difficulty: intermediate
title: 'GitHub Actions 与 CI/CD'
module: github
category: 'GitHub Advanced'
description: 'GitHub Actions workflow 语法、市场使用、CI/CD 示例（Node/Java/Python）。'
author: Anonymous
related:
  - github/PullRequest完整协作流程
  - github/GitHubPages多站点方案
  - github/Actions触发器
  - github/常见问题排查
prerequisites:
  - github/GitHub概述
---

## 1. 背景

**GitHub Actions** 是内置于仓库的 **CI/CD（持续集成/持续交付）** 引擎：用 **YAML** 描述 **workflow（工作流）**，在 **runner（运行器）** 上执行 **job（任务）**。**GitHub Marketplace** 提供可复用的 **Action（动作）** 封装常见步骤。
核心概念：**on** 触发条件、**jobs** 并行或依赖、**steps** 顺序执行、**${{ secrets.XXX }}** 读取密钥。

## 2. GitHub Actions 核心概念

### 2.1 工作流（Workflow）

工作流是一个可配置的自动化流程，由一个或多个任务（jobs）组成，定义在 `.github/workflows/` 目录下的 YAML 文件中。

### 2.2 任务（Job）

任务是工作流中的一个独立单元，包含一系列步骤（steps）。任务默认并行执行，但可以通过 `needs` 关键字定义依赖关系。

### 2.3 步骤（Step）

步骤是任务中的一个操作，可以是：

- 使用市场中的 Action（`uses`）
- 执行 shell 命令（`run`）

### 2.4 运行器（Runner）

运行器是执行工作流的服务器，可以是：

- GitHub 托管的运行器（如 `ubuntu-latest`、`windows-latest`、`macos-latest`）
- 自托管运行器（自己搭建的服务器）

### 2.5 动作（Action）

动作是可复用的代码单元，封装了常见的步骤，可在 GitHub Marketplace 中找到。

## 3. 工作流配置详解

### 3.1 触发条件（on）

```yaml
 # 基本触发条件
 on:
  push:
  branches: [main, develop]
  paths-ignore: ['README.md', 'docs/**']
  pull_request:
  branches: [main]
  # 定时触发
  schedule:
  - cron: '0 0 * * *' # 每天 UTC 时间 00:00 触发
  # 手动触发
  workflow_dispatch:
  inputs:
  environment:
  description: '环境'
  required:
  default: 'staging'
  # 其他工作流触发
  workflow_run:
  workflows: ['Build']
  types: [completed]
```

### 3.2 任务配置（jobs）

```yaml
 jobs:
  # 任务名称
  build:
  # 运行器环境
  runs-on: ubuntu-latest
  # 环境变量
  env:
  NODE_ENV: production
  # 矩阵策略
  strategy:
  matrix:
  node-version: [18.x, 20.x]
  os: [ubuntu-latest, windows-latest]
  # 快速失败
  fail-fast:
  # 任务依赖
  needs: [lint, test]
  # 步骤
  steps:
  - name: Checkout code
  uses: actions/checkout@v4
  with:
  fetch-depth: 0 # 完整克隆，包括标签
  - name: Setup Node.js
  uses: actions/setup-node@v4
  with:
  node-version: ${{ matrix.node-version }}
  cache: npm
  - name: Install dependencies
  run: npm ci
  - name: Build
  run: npm run build
```

### 3.3 步骤配置（steps）

```yaml
 steps:
  # 使用市场中的 Action
  - name: Checkout code
  uses: actions/checkout@v4
  # 带参数的 Action
  - name: Setup Python
  uses: actions/setup-python@v5
  with:
  python-version: '3.11'
  # 执行 shell 命令
  - name: Install dependencies
  run: |
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  # 条件执行
  - name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
  # 上传 artifact
  - name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
  name: build
  path: dist/
```

## 4. GitHub Marketplace 指南

### 4.1 查找 Action

1. 访问 [GitHub Marketplace](https://github.com/marketplace?type=actions)
2. 使用搜索功能找到需要的 Action
3. 查看 Action 的文档和使用示例

### 4.2 常用 Action

- **actions/checkout**：检出代码仓库
- **actions/setup-node**：设置 Node.js 环境
- **actions/setup-java**：设置 Java 环境
- **actions/setup-python**：设置 Python 环境
- **actions/upload-artifact**：上传构建产物
- **actions/download-artifact**：下载构建产物
- **actions/cache**：缓存依赖
- **peaceiris/actions-gh-pages**：部署到 GitHub Pages
- **docker/login-action**：登录 Docker 仓库
- **docker/build-push-action**：构建和推送 Docker 镜像

### 4.3 自定义 Action

可以创建自己的 Action：

1. 在仓库中创建 `action.yml` 文件
2. 定义 Action 的输入、输出和运行环境
3. 发布到 GitHub Marketplace

## 5. 完整 CI/CD 示例

### 5.1 Node.js 项目完整 CI/CD

```yaml
 name: Node.js CI/CD
 on:
  push:
  branches: [main, develop]
  pull_request:
  branches: [main, develop]
 jobs:
  lint:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  with:
  node-version: '20.x'
  cache: npm
  - run: npm ci
  - run: npm run lint
  test:
  runs-on: ubuntu-latest
  strategy:
  matrix:
  node-version: [18.x, 20.x]
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  with:
  node-version: ${{ matrix.node-version }}
  cache: npm
  - run: npm ci
  - run: npm test
  build:
  runs-on: ubuntu-latest
  needs: [lint, test]
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  with:
  node-version: '20.x'
  cache: npm
  - run: npm ci
  - run: npm run build
  - uses: actions/upload-artifact@v4
  with:
  name: build
  path: dist/
  deploy:
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/main'
  steps:
  - uses: actions/checkout@v4
  - uses: actions/download-artifact@v4
  with:
  name: build
  path: dist/
  - name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  publish_dir: ./dist
```

### 5.2 Java 项目完整 CI/CD

```yaml
 name: Java CI/CD
 on:
  push:
  branches: [main, develop]
  pull_request:
  branches: [main, develop]
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-java@v4
  with:
  distribution: temurin
  java-version: '17'
  cache: maven
  - name: Build with Maven
  run: mvn -B package --file pom.xml
  - uses: actions/upload-artifact@v4
  with:
  name: jar
  path: target/*.jar
  deploy:
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/main'
  steps:
  - uses: actions/download-artifact@v4
  with:
  name: jar
  path: target/
  - name: Deploy to server
  run: |
  # 部署脚本
  echo "Deploying to production server"
  # scp target/*.jar user@server:/path/to/deploy/
```

### 5.3 Python 项目完整 CI/CD

```yaml
 name: Python CI/CD
 on:
  push:
  branches: [main, develop]
  pull_request:
  branches: [main, develop]
 jobs:
  lint:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
  with:
  python-version: '3.11'
  - run: |
  python -m pip install --upgrade pip
  pip install flake8
  flake8 .
  test:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
  with:
  python-version: '3.11'
  - run: |
  python -m pip install --upgrade pip
  pip install pytest
  if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
  pytest
  deploy:
  runs-on: ubuntu-latest
  needs: [lint, test]
  if: github.ref == 'refs/heads/main'
  steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
  with:
  python-version: '3.11'
  - run: |
  python -m pip install --upgrade pip
  pip install setuptools wheel twine
  python setup.py sdist bdist_wheel
  twine upload --repository pypi dist/* -u ${{ secrets.PYPI_USERNAME }} -p ${{ secrets.PYPI_PASSWORD }}
```

## 6. 环境变量与密钥管理

### 6.1 环境变量

```yaml
# 工作流级环境变量
env:
  NODE_ENV: production
  API_URL: https://api.example.com
jobs:
  build:
  # 任务级环境变量
  env:
  BUILD_VERSION: 1.0.0
  steps:
    - name: Print environment variables
  run: |
  echo "NODE_ENV: $NODE_ENV"
  echo "API_URL: $API_URL"
  echo "BUILD_VERSION: $BUILD_VERSION"
  # 使用 GitHub 上下文
  echo "Repository: ${{ github.repository }}"
  echo "Branch: ${{ github.ref }}"
```

### 6.2 密钥管理

1. **Repository secrets**：在仓库的 **Settings → Secrets and variables → Actions** 中设置
2. **Environment secrets**：在环境的设置中设置，更安全
3. **使用密钥**：

```yaml
 steps:
  - name: Deploy
  run: ./deploy.sh
  env:
  API_KEY: ${{ secrets.API_KEY }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## 7. 常见问题与解决方案

### 7.1 构建失败

#### 7.1.1 依赖安装失败

- **问题**：依赖安装超时或失败
- **解决方案**：

1.  使用缓存减少依赖安装时间
2.  检查网络连接
3.  确认依赖源是否可用
4.  增加超时时间

#### 7.1.2 测试失败

- **问题**：测试用例失败
- **解决方案**：

1.  查看测试日志，了解失败原因
2.  修复代码中的问题
3.  确保测试环境与开发环境一致

### 7.2 性能问题

#### 7.2.1 构建时间过长

- **问题**：构建时间超过限制或影响开发效率
- **解决方案**：

1.  使用缓存
2.  并行执行任务
3.  优化构建脚本
4.  使用自托管运行器

#### 7.2.2 缓存失效

- **问题**：依赖变更后缓存未更新
- **解决方案**：

1.  使用动态缓存键
2.  定期清理缓存
3.  依赖变更时更新缓存键

### 7.3 权限问题

#### 7.3.1 密钥权限不足

- **问题**：构建过程中无法访问密钥
- **解决方案**：

1.  确认密钥已正确设置
2.  检查 workflow 权限设置
3.  确保密钥名称正确

#### 7.3.2 访问外部服务失败

- **问题**：无法访问外部 API 或服务
- **解决方案**：

1.  检查网络连接
2.  确认 API 密钥有效
3.  检查外部服务状态

## 8. 最佳实践

### 8.1 工作流设计

- **模块化**：将不同功能拆分为多个工作流
- **并行执行**：利用矩阵策略和并行任务提高效率
- **依赖管理**：使用 `needs` 明确任务依赖关系
- **条件执行**：使用 `if` 条件控制任务执行

### 8.2 安全性

- **密钥管理**：使用 Repository secrets 或 Environment secrets
- **权限控制**：最小化 workflow 权限
- **代码扫描**：集成 CodeQL 等代码扫描工具
- **安全依赖**：使用 Dependabot 自动更新依赖

### 8.3 可维护性

- **版本固定**：固定 Action 版本，避免意外变更
- **注释**：为复杂工作流添加注释
- **文档**：记录工作流的用途和维护指南
- **测试**：测试工作流的各个部分

### 8.4 性能优化

- **缓存**：缓存依赖和构建产物
- **并行**：并行执行测试和构建
- **最小化**：只执行必要的步骤
- **自托管运行器**：对于大型项目使用自托管运行器

## 9. 实际应用案例

### 9.1 开源项目案例

#### 9.1.1 案例描述

- **项目**：一个前端库
- **需求**：自动测试、构建和发布

#### 9.1.2 实现

1. **测试**：在 PR 时运行单元测试和集成测试
2. **构建**：合并到 main 分支时构建
3. **发布**：打标签时自动发布到 npm

### 9.2 企业项目案例

#### 9.2.1 案例描述

- **项目**：企业内部应用
- **需求**：自动测试、构建、部署到多环境

#### 9.2.2 实现

1. **测试**：PR 时运行测试
2. **构建**：合并到 develop 分支时构建
3. **部署**：

- 合并到 develop 分支：部署到开发环境
- 合并到 main 分支：部署到测试环境
- 打标签：部署到生产环境

## 10. GitHub Pages 部署

### 10.1 启用 GitHub Pages

1. 进入仓库 **Settings** > **Pages**
2. 选择源分支（通常是 `gh-pages` 或 `main`）
3. 选择目录（通常是 `/` 或 `/docs`）
4. 点击 **Save**

### 10.2 自动部署到 GitHub Pages

```yaml
 name: Deploy to GitHub Pages
 on:
  push:
  branches: [ main ]
 jobs:
  deploy:
  runs-on: ubuntu-latest
  permissions:
  contents: write
  steps:
  - uses: actions/checkout@v4
  - name: Set up Node.js
  uses: actions/setup-node@v4
  with:
  node-version: 20
  cache: 'npm'
  - name: Install dependencies
  run: npm install
  - name: Build
  run: npm run build
  - name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  publish_dir: ./dist
```

### 10.3 使用 GitHub Actions 官方 Pages 部署

```yaml
 name: Deploy Pages
 on:
  push:
  branches: [ main ]
 permissions:
  contents: read
  pages: write
  id-token: write
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v4
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v3
  with:
  path: ./dist
  deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
  steps:
  - uses: actions/deploy-pages@v4
  id: deployment
```

## 11. 与其他 CI/CD 工具对比

| 工具           | 优势                                   | 劣势                 |
| -------------- | -------------------------------------- | -------------------- |
| GitHub Actions | 与 GitHub 集成紧密、易于配置、市场丰富 | 私有仓库有分钟数限制 |
| Jenkins        | 高度可定制、插件丰富、无限制           | 搭建和维护成本高     |
| GitLab CI/CD   | 与 GitLab 集成紧密、功能强大           | 学习曲线较陡         |
| CircleCI       | 速度快、配置简单、支持 Docker          | 价格较高             |
| Travis CI      | 配置简单、历史悠久                     | 功能相对有限         |

## 11. 延伸阅读

- [Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions) <!-- nofollow -->
- [GitHub Actions documentation](https://docs.github.com/en/actions) <!-- nofollow -->
- [GitHub Marketplace](https://github.com/marketplace?type=actions) <!-- nofollow -->
- [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加 GitHub Actions 的核心概念和组件、工作流触发条件的详细配置、任务的高级配置、步骤的详细配置、市场中的 Actions 使用指南、更多的 CI/CD 示例、环境变量与密钥管理、常见问题的详细解决方案、最佳实践的更详细说明、实际应用案例和与其他 CI/CD 工具的对比。
