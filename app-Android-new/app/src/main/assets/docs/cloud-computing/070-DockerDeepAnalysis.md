---
order: 70
title: Docker 深度解析
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 'Docker 进阶：BuildKit 构建优化、多阶段构建、网络与存储、Compose 与安全实践。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/060-ContainerOrchestration'
  - 'cloud-computing/050-VirtualizationTech'
  - 'cloud-computing/080-CloudNativeApp'
  - 'cloud-computing/540-HarborRegistry'
prerequisites:
  - 'cloud-computing/060-ContainerOrchestration'
---

## 前置知识与学习目标

本文假设你已会用 `docker build/run`（基础见 `060-ContainerOrchestration`），
这里解决四个进阶问题：**镜像怎么变小变快**（构建优化）、**容器怎么
组网**（网络）、**数据怎么放**（存储）、**怎么不放跑安全性**（安全）。

版本基线（2026）：Docker Engine 自 23.0 起 BuildKit 是默认构建器，旧的
legacy builder 已移除，`docker build` 与 `docker buildx build` 等价；
Compose v2（`docker compose` 子命令）取代独立安装的 v1，配置文件中的
`version:` 字段已废弃（写了会被忽略并告警）。

## 1. 镜像优化

### 1.1 多阶段构建：把「工地」和「成品」分开

```dockerfile
# 构建阶段：带全套编译工具链，体积大无所谓
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                     # 依赖清单先拷，独立成层吃缓存
COPY . .
RUN npm run build

# 运行阶段：只拷构建产物，不含 devDependencies
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node                      # 官方镜像自带的非 root 用户
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

一条命令两个阶段，最终镜像只有 runner 阶段的内容——编译器、测试框架、
源码全部留在 builder 里。这是镜像优化的第一杠杆，通常一个阶段就能
减掉 60-90% 体积。

### 1.2 BuildKit 时代的三个新武器

```dockerfile
# 1. 缓存挂载：包管理器缓存跨构建持久化，改一行代码也不用重下依赖
RUN --mount=type=cache,target=/root/.npm npm ci

# 2. 构建秘密：密码/令牌不进镜像层（对比 ARG/ENV 会永远留在层里）
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm publish --dry-run
# 构建时：docker build --secret id=npm_token,src=.npmrc .

# 3. 多平台构建：一条命令出 amd64/arm64 双架构镜像
# docker buildx build --platform linux/amd64,linux/arm64 -t myapp:1.0 --push .
```

配套产物能力：`docker buildx build --sbom=true --provenance=true` 可同时
生成软件物料清单（SBOM）与构建来源证明，是供应链安全（对应 054 的
Harbor 验签链路）的基础数据。

### 1.3 层缓存原理与排序

构建按层缓存，**某一层失效则其后所有层失效**——所以指令排序原则是
「变化频率从低到高」：

```dockerfile
# 正确：依赖清单（低频变化）在前，源码（高频变化）在后
COPY package*.json ./
RUN npm ci
COPY . .

# 错误：任何源码改动都会触发 npm ci 重跑
COPY . .
RUN npm ci
```

| 策略                 | 效果                       |
| -------------------- | -------------------------- |
| 多阶段构建           | 去除构建工具链             |
| Alpine 基础镜像      | 基础层小（注意 musl 兼容性） |
| distroless/scratch   | 只有运行时，最小攻击面     |
| 合并相关 RUN         | 减少中间层残留（`&& rm -rf /var/cache/apk/*`） |
| .dockerignore        | 排除 node_modules/.git 等，加速上下文上传 |

> 陷阱：Alpine 用 musl libc，含原生依赖（如部分 Python wheel、glibc
> 专用 so）时会遇到诡异崩溃；此时改用 `debian-slim` 或 distroless 更稳。
> 「Alpine 万能」是过时经验。

## 2. Docker 网络

### 2.1 网络模式

| 模式    | 描述           | 用途           |
| ------- | -------------- | -------------- |
| bridge  | 默认桥接       | 单机容器通信   |
| host    | 共享宿主机网络 | 极致性能、无 NAT |
| none    | 无网络         | 安全隔离       |
| overlay | 跨主机隧道     | Swarm/集群     |
| macvlan | 容器独立 MAC/IP | 当作物理设备接入 |

### 2.2 自定义网络与内置 DNS

```bash
# 创建自定义网络（可指定网段）
docker network create --driver bridge --subnet 172.20.0.0/16 mynet

# 同一自定义网络内，容器名即可互访（内置 DNS）
docker run -d --network mynet --name api my-api
docker run -d --network mynet --name app nginx
# app 容器内直接：curl http://api:8080
```

默认 bridge 网络**没有容器名 DNS**（旧 `--link` 机制已废弃）——这是
「容器间连不通」的最常见原因。规则很简单：生产一律自定义网络，
别用默认 bridge。

## 3. Docker 存储

### 3.1 三种挂载

| 类型       | 描述             | 生命周期     | 典型用途           |
| ---------- | ---------------- | ------------ | ------------------ |
| Volume     | Docker 管理      | 独立于容器   | 数据库数据（首选） |
| Bind Mount | 宿主机目录直挂   | 跟随宿主文件 | 开发时代码热载     |
| tmpfs      | 内存盘           | 容器停止即失 | 敏感临时文件       |

```bash
# Volume 全套操作
docker volume create mydata
docker run -v mydata:/data nginx          # 具名卷挂载
docker volume inspect mydata              # 查看实际落在宿主机的位置

# 备份卷：借临时容器打包
docker run --rm -v mydata:/data -v $(pwd):/backup alpine \
  tar czf /backup/data.tar.gz /data
```

### 3.2 存储驱动：只需要知道 overlay2

容器可写层由存储驱动实现。当前事实标准是 **overlay2**（基于内核
overlayfs），Docker 在主流发行版上自动选择，无需配置；历史上的
devicemapper、btrfs、zfs、aufs 驱动均已废弃或移除，新资料再推荐它们
就是过时信号。rootless 模式使用 fuse-overlayfs，属于特例。

## 4. Docker Compose：本地编排

```yaml
# compose.yaml（v2 规范：不再需要 version 字段）
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      DB_HOST: db
      REDIS_HOST: redis
    depends_on:
      db:
        condition: service_healthy   # 等数据库真正可用
      redis:
        condition: service_started
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}   # 从 .env 读取，勿硬编码
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

```bash
docker compose up -d --build   # 构建并后台启动全家桶
docker compose logs -f web     # 跟某个服务日志
docker compose down            # 停止并删除（加 -v 连卷一起删，慎用）
```

`depends_on` + `condition: service_healthy` 解决「应用比数据库先启动」
的经典竞态；注意 Compose 是单机工具，多机编排属于 Kubernetes 的领域
（见 `120-KubernetesArchitecture`）。

## 5. Docker 安全

### 5.1 分层防御清单

| 措施         | 描述                              |
| ------------ | --------------------------------- |
| 非 root 运行 | Dockerfile `USER app` + `run --user` |
| 最小基础镜像 | distroless/slim，少组件少漏洞     |
| 镜像扫描     | Trivy/Grype/Docker Scout 进 CI    |
| 签名验证     | Sigstore/cosign 签名 + 仓库验签   |
| 固定版本     | 锁定 tag（最好锁定 digest）        |
| 只读根文件系统 | `--read-only --tmpfs /tmp`      |

> 事实更新：早期的 Docker Content Trust（Notary v1）已停止发展，镜像
> 签名的现行主流是 Sigstore/cosign 体系（签名 + 验证策略接入 CI/CD 与
> 仓库，见 `540-HarborRegistry`）。

### 5.2 安全基线 Dockerfile

```dockerfile
FROM node:22-slim
RUN groupadd -g 1001 app && useradd -u 1001 -g app -m app
WORKDIR /app
COPY --chown=app:app . .
USER 1001            # 数字 UID，K8s 的 runAsNonRoot 检查也认它
EXPOSE 3000
CMD ["node", "server.js"]
```

### 5.3 运行时限制

```bash
docker run --cpus=0.5 --memory=512m --pids-limit=100 nginx  # 资源上限
docker run --read-only --tmpfs /tmp --cap-drop=ALL nginx    # 只读+去能力
docker run --security-opt=no-new-privileges nginx           # 禁提权
```

默认的 root 容器拥有一批危险内核能力（CAP_SYS_ADMIN 级别的逃逸路径
多与它们相关），`--cap-drop=ALL` 后按需 `--cap-add` 是容器安全的
黄金法则。

## 6. 最佳实践

| 实践             | 描述             |
| ---------------- | ---------------- |
| 一个容器一个进程 | 单一职责，日志走 stdout/stderr |
| 无状态设计       | 数据存 Volume/外部存储 |
| 健康检查         | HEALTHCHECK 指令 + 语义化端点 |
| 优雅关闭         | 处理 SIGTERM，做完收尾再退出 |
| 配置外部化       | 环境变量注入，不烧进镜像 |
| 构建可复现       | 锁基础镜像 digest，用 BuildKit 缓存 |

## 小结

- 初学者要点：多阶段构建是镜像瘦身第一杠杆；指令按「变化频率从低到
  高」排序吃缓存；容器互通用自定义网络（默认 bridge 无 DNS）；持久
  数据用 Volume；生产镜像非 root + 锁定版本 tag。
- 进阶注意：BuildKit 时代优先用缓存挂载、构建秘密与 buildx 多平台/
  SBOM 能力；Alpine 的 musl 兼容性要验证，不确定就用 slim/distroless；
  存储驱动无需关心（overlay2 唯一主流），网上还在教 devicemapper 的
  资料已过时；Compose 的 `version:` 字段废弃、`depends_on` 要配
  healthcheck 条件；运行时给足限制（CPU/内存/pids）并 `--cap-drop=ALL`。
