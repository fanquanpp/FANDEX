---
order: 52
title: Docker深度解析
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: Docker进阶：镜像构建优化、多阶段构建、网络模式、存储驱动与安全实践。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/云架构设计'
  - 'cloud-computing/公有云与私有云与混合云'
  - 'cloud-computing/云原生应用'
  - 'cloud-computing/Kubernetes架构'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. Docker 镜像优化

### 1.1 多阶段构建

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 1.2 镜像瘦身策略

| 策略                 | 效果           |
| -------------------- | -------------- |
| 使用 Alpine 基础镜像 | 减少 80%+ 体积 |
| 多阶段构建           | 去除构建依赖   |
| 合并 RUN 指令        | 减少镜像层数   |
| .dockerignore        | 排除不必要文件 |
| distroless 镜像      | 最小运行时     |

### 1.3 缓存优化

```dockerfile
#  先复制依赖文件，利用缓存
COPY package*.json ./
RUN npm ci
COPY . .

#  先复制全部，每次代码变更都重新安装依赖
COPY . .
RUN npm ci
```

## 2. Docker 网络

### 2.1 网络模式

| 模式    | 描述           | 用途         |
| ------- | -------------- | ------------ |
| bridge  | 默认桥接网络   | 单机容器通信 |
| host    | 共享宿主机网络 | 高性能场景   |
| none    | 无网络         | 安全隔离     |
| overlay | 跨主机网络     | Swarm/集群   |
| macvlan | 容器独立 MAC   | 网络设备集成 |

### 2.2 自定义网络

```bash
# 创建自定义网络
docker network create --driver bridge --subnet 172.20.0.0/16 mynet

# 容器加入网络
docker run --network mynet --name app nginx

# 容器间通过名称通信
docker run --network mynet --name api my-api
# app 容器可通过 http://api:8080 访问
```

### 2.3 DNS 解析

- 自定义网络：内置 DNS，支持容器名解析
- 默认 bridge：无 DNS，需 `--link`（已废弃）

## 3. Docker 存储

### 3.1 存储类型

| 类型       | 描述           | 生命周期       |
| ---------- | -------------- | -------------- |
| Volume     | Docker 管理    | 独立于容器     |
| Bind Mount | 宿主机目录挂载 | 独立于容器     |
| tmpfs      | 内存存储       | 容器停止即消失 |

### 3.2 Volume 操作

```bash
# 创建
docker volume create mydata

# 使用
docker run -v mydata:/data nginx

# 指定驱动
docker volume create --driver local --opt type=nfs mydata

# 备份
docker run --rm -v mydata:/data -v $(pwd):/backup alpine tar czf /backup/data.tar.gz /data
```

### 3.3 存储驱动

| 驱动         | 文件系统     | 适用场景    |
| ------------ | ------------ | ----------- |
| overlay2     | overlayfs    | 默认推荐    |
| devicemapper | devicemapper | CentOS 旧版 |
| btrfs        | btrfs        | 大量写入    |
| zfs          | zfs          | 数据完整性  |

## 4. Docker Compose

### 4.1 完整示例

```yaml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 5. Docker 安全

### 5.1 镜像安全

| 措施         | 描述                              |
| ------------ | --------------------------------- |
| 非 root 运行 | `USER app`                        |
| 最小基础镜像 | Alpine/distroless                 |
| 镜像扫描     | Trivy/Snyk                        |
| 签名验证     | Docker Content Trust              |
| 固定版本     | `node:18.17.0` 而非 `node:latest` |

### 5.2 运行时安全

```dockerfile
# 安全 Dockerfile
FROM node:18-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
WORKDIR /app
COPY --chown=app:app . .
USER app
EXPOSE 3000
CMD ["node", "server.js"]
```

### 5.3 资源限制

```bash
# CPU 和内存限制
docker run --cpus=0.5 --memory=512m nginx

# 只读文件系统
docker run --read-only --tmpfs /tmp nginx
```

## 6. Docker 最佳实践

| 实践             | 描述             |
| ---------------- | ---------------- |
| 一个容器一个进程 | 单一职责         |
| 无状态设计       | 数据存 Volume    |
| 健康检查         | HEALTHCHECK 指令 |
| 优雅关闭         | 处理 SIGTERM     |
| 日志管理         | stdout/stderr    |
| 环境变量配置     | 不硬编码         |
