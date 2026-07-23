---
order: 65
title: 'GitHub-Packages'
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Packages详解：包注册表、发布与使用私有包。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'github/REST与GraphQL-API'
  - github/Web钩子
  - github/在线开发环境
  - github/代码所有者
prerequisites:
  - github/GitHub概述
---

## 1. Packages 概述

### 1.1 什么是 GitHub Packages

GitHub Packages 是内置的**包托管服务**，可以将包直接发布到 GitHub 仓库旁边。

### 1.2 支持的包类型

| 注册表       | 格式        | 前缀                  |
| :----------- | :---------- | :-------------------- |
| **npm**      | JavaScript  | `@OWNER/PACKAGE`      |
| **Maven**    | Java        | `com.owner:package`   |
| **Gradle**   | Java/Kotlin | 同 Maven              |
| **Docker**   | 容器镜像    | `ghcr.io/OWNER/IMAGE` |
| **NuGet**    | .NET        | 标准 NuGet            |
| **RubyGems** | Ruby        | 标准 Gem              |
| **PyPI**     | Python      | 标准 PyPI             |

## 2. npm 包发布

### 2.1 配置 .npmrc

```
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
@myorg:registry=https://npm.pkg.github.com
```

### 2.2 配置 package.json

```json
{
  "name": "@myorg/my-package",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/my-package.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 2.3 发布

```bash
# 使用 GITHUB_TOKEN
npm publish
```

### 2.4 安装

```bash
npm install @myorg/my-package
```

## 3. Docker 镜像

### 3.1 登录

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 3.2 推送镜像

```bash
docker build -t ghcr.io/myorg/my-app:v1.0.0 .
docker push ghcr.io/myorg/my-app:v1.0.0
```

### 3.3 拉取镜像

```bash
docker pull ghcr.io/myorg/my-app:v1.0.0
```

## 4. CI/CD 集成

```yaml
# .github/workflows/publish.yml
name: Publish Package
on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 5. 包权限

| 权限             | 说明                 |
| :--------------- | :------------------- |
| **继承仓库权限** | 包权限与关联仓库一致 |
| **公开包**       | 所有人可下载         |
| **私有包**       | 仅授权用户可下载     |
