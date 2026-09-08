---
order: 230
title: GitHub Packages
module: 'github'
category: 工具链
difficulty: intermediate
description: 'GitHub Packages深度解析：从 npm/Docker 包管理原理讲起，把 GitHub Packages 讲成团队私有的"软件包超市"，覆盖认证、发布、安装与 CI/CD 集成。'
author: fanquanpp
updated: '2026-09-08'
related:
  - 'github/021-RESTGraphQLAPI'
prerequisites:
  - 'github/001-GitHubOverview'
---


## 0. 从一个原理说起：软件世界的"超市货架"

你写的每个项目都会"依赖"别的东西：一个日期处理库、一个 HTTP 框架、一个数据库驱动。这些可复用的软件片段叫做**包（Package）**。而"下载包"这件事，如果全靠人肉拷贝，很快就会乱套。

先看一个生活原理：**超市是怎么解决"每个人都要买东西"这个问题的？**

- 生产方（厂商）把商品统一打包、贴标签、定版本，送到超市上架；
- 需求方（顾客）走进超市，按货架找到商品，扫码结账拿走；
- 超市负责：统一存放、按名称检索、保证版本可追溯、防止买到假货。

软件世界完全复刻了这套逻辑：

| 超市概念 | 软件包世界 |
| :--- | :--- |
| 商品 | 包（Package），如 `lodash`、`requests` |
| 超市 | 包注册表（Registry），如 npmjs.com、Docker Hub |
| 货架编号 | 包名 + 版本号，如 `lodash@4.17.21` |
| 扫码结账 | 包管理器下载并记录依赖（`npm install`） |
| 生产方 | 发布者（你） |
| 顾客 | 使用方（开发者/项目） |

而 **GitHub Packages** 就是 GitHub 自己开的一家"超市"——它不生产商品，但允许你把包发布到上面，并且和你的代码仓库、权限体系深度绑定。本文先从原理讲起，再讲怎么用。

## 1. 原理篇：包管理器到底在做什么

### 1.1 先直观理解

你用 `npm install` 装依赖时，其实发生了三件事：

1. 查看项目里声明的依赖清单（`package.json`）；
2. 去注册表（默认 npmjs.com）查询这些包；
3. 下载到本地 `node_modules` 目录，并记录锁定版本。

### 1.2 再讲原理：Registry 是关键

注册表（Registry）是整个机制的枢纽。它维护了"包名 → 版本列表 → 下载地址"的索引。关键认知：

- **npm** 默认指向 `https://registry.npmjs.org`；
- **Docker** 默认指向 `https://hub.docker.com`（即 Docker Hub）；
- 注册表是**可配置的**——你可以告诉 npm "请去 GitHub 的超市买"。

这就是 GitHub Packages 的基础：**它实现了多种注册表的"兼容接口"，让 npm、Docker、Maven、NuGet 等工具指向它，就能把包发布/下载到 GitHub 上**。工具不变，只是"超市"换了。

### 1.3 最后看示例

```bash
# 默认：去 npmjs.com 买包
npm install lodash

# 配置后：去 GitHub Packages（npm.pkg.github.com）买包
npm install @your-org/private-lib
```

## 2. 为什么需要自己的"超市"：GitHub Packages 的定位

| 需求 | 公共超市（npmjs.com / Docker Hub） | GitHub Packages |
| :--- | :--- | :--- |
| 私有包 | 要付费 | 复用仓库权限，天然私有 |
| 与代码关联 | 无关联 | 包和仓库、PR、CI 深度集成 |
| 认证体系 | 独立账号 | 直接用 GitHub Token |
| 发布流程 | 手动或额外配置 | 可与 Actions 一键打通 |

一句话定位：**当你的团队需要"私有、和代码同权限、和 CI 打通"的软件包仓库时，GitHub Packages 是最顺手的答案**——它消灭了"代码在 GitHub、包在别处"的分裂状态。

### 2.1 支持的注册表一览

| 包类型 | 生态 | 地址格式 |
| :--- | :--- | :--- |
| **npm** | JavaScript/TypeScript | `npm.pkg.github.com`，包名 `@OWNER/PACKAGE` |
| **Docker（GHCR）** | 容器镜像 | `ghcr.io/OWNER/IMAGE` |
| **Maven / Gradle** | Java/Kotlin | `maven.pkg.github.com` |
| **NuGet** | .NET | `nuget.pkg.github.com` |
| **RubyGems** | Ruby | `rubygems.pkg.github.com` |

## 3. 认证原理：Token 是"超市会员卡"

### 3.1 先直观理解

去 GitHub 的超市拿私有商品，需要证明"你是谁、有没有权限"。GitHub 用 **Personal Access Token（PAT，个人访问令牌）** 充当会员卡。

### 3.2 再讲原理

| 场景 | 用什么认证 | 需要的最小权限 |
| :--- | :--- | :--- |
| 发布包 | PAT（classic，建议设过期时间） | `write:packages` + `repo`（私有仓库） |
| 下载私有包 | PAT 或 `GITHUB_TOKEN` | `read:packages` |
| GitHub Actions 发布本仓库包 | `GITHUB_TOKEN`（自动注入） | 工作流中声明 `permissions: packages: write` |

原则：**令牌权限最小化、设置过期时间、绝不提交到代码库**（放在本地环境变量或 GitHub Secrets 中）。

### 2.3 最后看示例

```bash
# 发布 npm 包到 GitHub Packages
npm config set //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## 4. 操作示例：发布 npm 包到 GitHub Packages

### 4.1 配置 .npmrc（告诉 npm "去哪家超市"）

在项目根目录创建 `.npmrc`：

```ini
# 声明作用域包（@your-org/ 开头的包）走 GitHub 注册表
@your-org:registry=https://npm.pkg.github.com

# 认证令牌从环境变量读取（不要把真实令牌写进文件）
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 4.2 配置 package.json

```json
{
  "name": "@your-org/my-utils",
  "version": "1.0.0",
  "description": "团队内部通用工具函数库",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/my-utils.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

要点：包名必须带**组织作用域**（`@your-org/`），否则可能与其他来源冲突。

### 4.3 发布与安装

```bash
# 发布（需要 write:packages 权限）
npm publish

# 在另一个项目里安装（需要 read:packages 权限，且 .npmrc 同样指向 GitHub）
npm install @your-org/my-utils
```

## 5. 操作示例：发布 Docker 镜像（GHCR）

### 5.1 登录

```bash
# GHCR 支持匿名拉取公开镜像；发布/拉私有镜像需要登录
echo $GITHUB_TOKEN | docker login ghcr.io -u 你的用户名 --password-stdin
```

### 5.2 构建并推送

```bash
# 镜像名格式：ghcr.io/OWNER/镜像名:标签
docker build -t ghcr.io/your-org/my-app:v1.0.0 .
docker push ghcr.io/your-org/my-app:v1.0.0
```

### 5.3 拉取

```bash
docker pull ghcr.io/your-org/my-app:v1.0.0
```

## 6. CI/CD 集成：让 Actions 自动发布

包发布最好交给 GitHub Actions，人只需要打标签或发 Release。完整示例：

```yaml
# .github/workflows/publish.yml
name: Publish npm package
on:
  release:
    types: [created]          # 创建 Release 时自动触发
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write          # 关键：授予写入 packages 的权限
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # 自动注入的令牌
```

说明：`GITHUB_TOKEN` 由 GitHub 自动注入工作流，无需手动创建密钥；如果包与当前仓库关联，`GITHUB_TOKEN` 默认具备足够的 packages 权限。

## 7. 访问控制与可见性

### 7.1 可见性（谁能看见）

| 设置 | 说明 |
| :--- | :--- |
| **公开包（Public）** | 所有人可查看、下载；公开镜像在 GHCR 上甚至支持匿名拉取 |
| **私有包（Private）** | 仅授权用户/团队可见可下载 |

### 7.2 权限继承（官方机制）

- 支持细粒度权限的注册表（如 npm、Docker）中，**包默认继承关联仓库的访问权限**：有仓库读权限的人就有包的读权限；
- 关联仓库中的 GitHub Actions 工作流自动获得该包的访问权限；
- 包可以在设置页单独调整权限，或选择"不继承仓库权限"。

### 7.3 与仓库的关联方式

发布前先在包设置里关联仓库，或通过 Docker 标签（如 `org.opencontainers.image.source`）声明来源仓库——这样权限继承才生效。

## 8. 常见错误与对策表

| 常见错误 | 现象/报错 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 401 Unauthorized | `npm ERR! code E401 ... Unauthorized` | Token 缺失或权限不足 | 配置 `.npmrc` 认证；确认 token 含 `read:packages`/`write:packages` |
| 404 Package not found | 安装私有包报 404 | 未登录、或包未关联到你可见的仓库 | 用带 `read:packages` 的 token 认证；确认包权限 |
| 包名冲突 | `403 ... already exists` | 包名与已有包冲突 | 使用带作用域的唯一名称 `@your-org/xxx` |
| 发布到错误的注册表 | 包发布到了 npmjs.com | package.json 缺 `publishConfig.registry` | 在 package.json 声明 `publishConfig` 或 .npmrc 指定 registry |
| Actions 发布失败 | `Resource not accessible by integration` | 工作流缺 `packages: write` 权限 | 在 job 级声明 `permissions: packages: write` |
| Docker 拉私有镜像失败 | `denied: requested access to the resource is denied` | 未登录 GHCR 或无权 | `docker login ghcr.io`；确认 PAT 含 `read:packages` |
| 权限继承不生效 | 协作者读不了包 | 包未关联仓库 | 在包设置中关联仓库，或通过 Docker 标签声明来源 |
| 令牌泄露风险 | 发现 token 出现在代码里 | 把令牌写进了文件并提交 | 立即吊销 token，改用环境变量/Secrets |

## 10. 一句话记忆

**GitHub Packages 是 GitHub 自营的"软件包超市"：它兼容 npm、Docker、Maven 等常见工具，把"包"和你的仓库权限、CI 流程绑定在一起——认证靠 Token，发布用原生命令，私有包复用仓库权限，让团队不再需要把代码和包分开管理。**

### 延伸阅读（站内文档）

- 用 Actions 自动化发布流程，见 004-github 模块《GitHubActionsCICD》。
- 工作流权限与 Secrets 管理，见 004-github 模块《Actions环境部署》。
- 依赖安全与自动更新，见 004-github 模块《Dependabot》。
- 用 API 管理包版本，见 004-github 模块《REST与GraphQL-API》。
