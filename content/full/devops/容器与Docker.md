---
order: 3
title: '容器与 Docker'
module: devops
category: 运维
difficulty: intermediate
description: '容器原理、Docker 架构、镜像构建、多阶段构建、Docker Compose 与镜像优化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/概述与Linux基础
  - devops/网络与安全
  - devops/Kubernetes容器编排
  - 'devops/CI-CD流水线'
prerequisites: []
---

## 1. 容器原理

### 1.1 容器 vs 虚拟机

| 维度         | 虚拟机               | 容器        |
| :----------- | :------------------- | :---------- |
| **隔离级别** | 硬件级（Hypervisor） | 操作系统级  |
| **启动速度** | 分钟级               | 秒级        |
| **资源占用** | GB 级                | MB 级       |
| **镜像大小** | GB 级                | MB 级       |
| **性能**     | 有虚拟化开销         | 接近原生    |
| **密度**     | 几个/主机            | 数百个/主机 |

### 1.2 Linux 容器技术

| 技术          | 作用         | 说明                     |
| :------------ | :----------- | :----------------------- |
| **Namespace** | 资源隔离     | PID/NET/MNT/UTS/IPC/USER |
| **Cgroup**    | 资源限制     | CPU/内存/IO/网络         |
| **UnionFS**   | 镜像分层     | OverlayFS / AUFS         |
| **Seccomp**   | 系统调用过滤 | 限制可用 syscall         |

```bash
# Namespace 示例
unshare --pid --fork --mount-proc bash   # 创建新的 PID namespace
ls /proc                                  # 只能看到新 namespace 的进程

# Cgroup 示例
sudo cgcreate -g cpu,memory:/mycontainer
sudo cgset -r memory.limit_in_bytes=512M mycontainer
sudo cgset -r cpu.cfs_quota_us=50000 mycontainer  # 50% CPU
```

## 2. Docker 架构

### 2.1 核心概念

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │ →  │  Docker  │ →  │ Registry │
│ (docker) │    │  Daemon  │    │ (Hub/私有)│
└──────────┘    └──────────┘    └──────────┘
                     │
              ┌──────┼──────┐
              ↓      ↓      ↓
          ┌──────┐┌──────┐┌──────┐
          │Image ││Container││Network│
          └──────┘└──────┘└──────┘
```

| 概念          | 描述                             |
| :------------ | :------------------------------- |
| **Image**     | 只读模板，包含运行应用所需的一切 |
| **Container** | Image 的运行实例                 |
| **Volume**    | 数据持久化                       |
| **Network**   | 容器间通信                       |
| **Registry**  | 镜像仓库                         |

### 2.2 基础命令

```bash
# 镜像操作
docker pull nginx:1.25              # 拉取镜像
docker images                       # 列出镜像
docker rmi nginx:1.25               # 删除镜像
docker build -t myapp:v1 .          # 构建镜像
docker tag myapp:v1 registry/myapp:v1  # 打标签
docker push registry/myapp:v1       # 推送镜像

# 容器操作
docker run -d --name web -p 80:80 nginx:1.25    # 运行容器
docker ps                                       # 运行中的容器
docker ps -a                                    # 所有容器
docker stop web                                 # 停止
docker start web                                # 启动
docker restart web                              # 重启
docker rm web                                   # 删除
docker logs -f web                              # 查看日志
docker exec -it web bash                        # 进入容器
docker inspect web                               # 详细信息

# 清理
docker system prune -a              # 清理所有未使用资源
docker volume prune                 # 清理未使用卷
```

## 3. Dockerfile

### 3.1 指令详解

```dockerfile
# 基础镜像
FROM python:3.12-slim

# 元数据
LABEL maintainer="dev@example.com"
LABEL version="1.0"
LABEL description="Python Web Application"

# 设置工作目录
WORKDIR /app

# 环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# 复制依赖文件并安装（利用缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 非root用户
RUN useradd -m appuser
USER appuser

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.2 多阶段构建

```dockerfile
# 阶段1：构建
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段2：运行
FROM nginx:1.25-alpine

# 仅复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**多阶段构建优势**：

- 最终镜像只包含运行时所需文件
- 构建工具和源码不会留在最终镜像
- 镜像大小从 GB 级降到 MB 级

### 3.3 常用基础镜像大小

| 镜像                   | 大小   | 适用场景            |
| :--------------------- | :----- | :------------------ |
| `ubuntu:22.04`         | ~77MB  | 需要完整 Linux 环境 |
| `debian:bookworm-slim` | ~74MB  | 较完整的 Linux      |
| `alpine:3.19`          | ~7MB   | 极致轻量            |
| `python:3.12-slim`     | ~150MB | Python 应用         |
| `python:3.12-alpine`   | ~50MB  | Python 轻量         |
| `node:20-alpine`       | ~180MB | Node.js 应用        |
| `nginx:1.25-alpine`    | ~40MB  | Web 服务器          |

## 4. Docker Compose

### 4.1 完整示例

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Web 应用
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '8000:8000'
    environment:
      - DATABASE_URL=postgresql://app:secret@db:5432/appdb
      - REDIS_URL=redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    volumes:
      - ./app:/app # 开发时挂载代码
    networks:
      - frontend
      - backend
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
      interval: 30s
      timeout: 5s
      retries: 3

  # PostgreSQL 数据库
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app -d appdb']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  cache:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - backend
    volumes:
      - redisdata:/data

  # Nginx 反向代理
  nginx:
    image: nginx:1.25-alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    networks:
      - frontend
    restart: unless-stopped

volumes:
  pgdata:
    driver: local
  redisdata:
    driver: local

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # 不暴露到外部
```

### 4.2 Compose 命令

```bash
# 启动
docker compose up -d                    # 后台启动
docker compose up -d --build            # 重新构建并启动

# 管理
docker compose ps                       # 查看状态
docker compose logs -f web              # 查看日志
docker compose exec web bash            # 进入容器
docker compose restart web              # 重启服务

# 扩缩容
docker compose up -d --scale web=3      # 扩展到3个实例

# 停止与清理
docker compose down                     # 停止并删除容器
docker compose down -v                  # 同时删除卷
```

## 5. 镜像优化

### 5.1 优化策略

| 策略               | 效果        | 示例                 |
| :----------------- | :---------- | :------------------- |
| **选择小基础镜像** | 减少 50-80% | alpine 替代 ubuntu   |
| **多阶段构建**     | 减少 60-90% | 分离构建和运行       |
| **合并 RUN 指令**  | 减少层数    | `RUN cmd1 && cmd2`   |
| **清理缓存**       | 减少 20-40% | `--no-cache-dir`     |
| **.dockerignore**  | 减少上下文  | 排除 node_modules 等 |
| **利用缓存**       | 加速构建    | 先 COPY 依赖文件     |

### 5.2 .dockerignore

```dockerignore
# Git
.git
.gitignore

# 依赖
node_modules
__pycache__
*.pyc
.venv

# IDE
.vscode
.idea

# 文档
*.md
docs/

# 测试
tests/
.pytest_cache
.coverage

# Docker
Dockerfile
docker-compose*.yml

# 其他
.env
*.log
.DS_Store
```

### 5.3 优化前后对比

```dockerfile
#  优化前（~800MB）
FROM python:3.12
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "main.py"]

#  优化后（~150MB）
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
CMD ["python", "main.py"]
```

## 6. 私有仓库

### 6.1 部署 Registry

```yaml
# docker-compose.yml
services:
  registry:
    image: registry:2
    ports:
      - '5000:5000'
    environment:
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: 'Registry Realm'
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - ./data:/data
      - ./auth:/auth
    restart: always
```

```bash
# 创建认证文件
mkdir auth
docker run --rm -entrypoint htpasswd httpd:2 -Bbn admin password > auth/htpasswd

# 使用私有仓库
docker tag myapp:v1 localhost:5000/myapp:v1
docker push localhost:5000/myapp:v1
docker pull localhost:5000/myapp:v1
```

### 6.2 Harbor（企业级）

Harbor 提供更完善的私有仓库功能：RBAC、镜像扫描、镜像签名、复制策略。

```bash
# 安装 Harbor
wget https://github.com/goharbor/harbor/releases/download/v2.10.0/harbor-online-installer-v2.10.0.tgz
tar xvf harbor-online-installer-*.tgz
cd harbor
cp harbor.yml.tmpl harbor.yml
# 编辑 harbor.yml 配置
./install.sh --with-trivy  # 包含漏洞扫描
```

## 7. 小结

容器技术是现代运维的基石：

1. **容器原理**基于 Namespace（隔离）和 Cgroup（限制），理解原理有助于排查问题
2. **Dockerfile** 编写需遵循最佳实践：小基础镜像、多阶段构建、利用缓存
3. **Docker Compose** 是单机多容器编排的标准工具，适合开发和测试环境
4. **镜像优化**可大幅减小镜像体积，加速部署和降低存储成本
5. **私有仓库**是企业必需，小型团队用 Registry，大型组织用 Harbor
6. 生产环境建议使用 Kubernetes 进行容器编排
