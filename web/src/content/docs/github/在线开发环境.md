---
order: 66
title: Codespaces
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Codespaces详解：云端开发环境配置、预构建与使用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Web钩子
  - github/包管理服务
  - github/代码所有者
  - github/社区健康文件
prerequisites:
  - github/GitHub概述
---

## 1. Codespaces 概述

### 1.1 什么是 Codespaces

GitHub Codespaces 是**云端开发环境**，在浏览器或 VS Code 中提供完整的开发环境，无需本地配置。

### 1.2 优势

| 优势       | 说明             |
| :--------- | :--------------- |
| **零配置** | 一键启动开发环境 |
| **一致性** | 团队使用相同环境 |
| **可复现** | 环境定义在代码中 |
| **弹性**   | 按需使用计算资源 |

### 1.3 免费额度

| 账户类型 | 每月核心小时 | 存储空间 |
| :------- | :----------- | :------- |
| **Free** | 120 核心小时 | 15 GB    |
| **Pro**  | 180 核心小时 | 20 GB    |
| **Team** | 按需付费     | 按需付费 |

## 2. 配置开发环境

### 2.1 devcontainer.json

```json
// .devcontainer/devcontainer.json
{
  "name": "My Dev Environment",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "forwardPorts": [3000, 5173],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "vue.volar"],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

### 2.2 Dockerfile 方式

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:20

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y postgresql-client

COPY . /workspace
WORKDIR /workspace
RUN npm ci
```

```json
{
  "name": "Custom Environment",
  "build": {
    "dockerfile": "Dockerfile"
  }
}
```

### 2.3 docker-compose 方式

```yaml
# .devcontainer/docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace
    command: sleep infinity
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: devpassword
    ports:
      - '5432:5432'
```

## 3. 使用 Codespaces

### 3.1 创建 Codespace

```bash
# 通过 GitHub CLI
gh codespace create -r user/repo -b main

# 通过浏览器
# 仓库 → Code → Codespaces → Create codespace
```

### 3.2 管理 Codespaces

```bash
# 列出
gh codespace list

# 连接
gh codespace ssh

# 删除
gh codespace delete

# 查看端口
gh codespace ports
```

### 3.3 机器类型

| 类型        | 核心 | 内存  | 存储  |
| :---------- | :--- | :---- | :---- |
| **2-core**  | 2    | 4 GB  | 32 GB |
| **4-core**  | 4    | 8 GB  | 32 GB |
| **8-core**  | 8    | 16 GB | 32 GB |
| **16-core** | 16   | 32 GB | 32 GB |
| **32-core** | 32   | 64 GB | 32 GB |

## 4. 预构建

### 4.1 配置预构建

1. 仓库 Settings → Codespaces → Prebuilds
2. 选择分支和区域
3. 配置触发条件

### 4.2 预构建工作流

```yaml
# .github/workflows/codespace-prebuild.yml
name: Codespace Prebuild
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'

jobs:
  prebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codespaces-prebuild@v1
        with:
          regions: euWest2, usEast1
```

## 5. 最佳实践

- 使用 `.devcontainer` 定义环境
- 利用预构建加速启动
- 及时删除不用的 Codespaces
- 使用 dotfiles 统一个人配置
- 将敏感信息存储在 Codespace Secrets 中
