---
order: 60
title: Dockerfile 多阶段构建
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Dockerfile 多阶段构建：减小镜像体积、分离构建与运行环境。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/420-NetworkSecurityAdvanced'
  - 'devops/410-DatabaseOps'
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/110-HelmChartApplicationPackage'
prerequisites:
  - 'devops/010-OverviewLinuxBasics'
---

## 0. 一句话理解

> 多阶段构建（multi-stage build）把"编译车间"和"展厅"分开：前面的阶段装满
> 编译器、依赖与源码，负责把产物造出来；最后一个阶段只复制产物 + 运行时，
> 让交付镜像小、快、攻击面小。

## 1. 为什么需要多阶段构建

单阶段构建的镜像 = 编译环境 + 运行环境。以 Go 为例，`golang:1.24` 镜像超过
800MB，而一个静态编译的 Go 程序运行只需要十几 MB——把整个工具链带上线，
除了拖慢拉取/部署、扩大漏洞面之外没有任何收益。

多阶段构建的规则只有一条：**Dockerfile 里可以有多个 FROM，最终镜像只由最后一个
FROM 决定**，前面的阶段仅在构建期存在，用 `COPY --from=<阶段>` 精准搬运产物。

```dockerfile
# 最小完整示例：Go 应用（约 800MB -> 约 15MB）
FROM golang:1.24 AS builder       # 阶段一：编译车间
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download               # 先依赖后源码，命中依赖缓存
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/app .

FROM gcr.io/distroless/static-debian12:nonroot  # 阶段二：无 shell 的极简运行时
COPY --from=builder /out/app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
```

关键行讲解：

1. `CGO_ENABLED=0`：纯静态编译，才能跑在 distroless/scratch 这类无 libc 镜像上。
2. `-ldflags="-s -w"`：去掉调试符号，二进制再小 30% 左右。
3. `distroless/static:nonroot`：没有 shell、没有包管理器，CVE 面积最小，
   且默认非 root（区别于带 shell 的 `distroless/base`）。

## 2. 按语言的三套常用模板

### 2.1 Node.js 前端/后端

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci                        # 只装依赖，独立成层提升缓存命中

FROM deps AS build                # 继承 deps，省一次 COPY
COPY . .
RUN npm run build

FROM nginx:1.28-alpine AS runtime # 前端静态站托管
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1
```

Node 后端（不进 nginx）把 runtime 换成 `node:22-alpine`，
`COPY --from=build /app --chown=node:node /app` 并 `USER node`。

### 2.2 Java（Spring Boot）

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline  # 依赖层与代码层分离
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine # 只带 JRE，不带 JDK
COPY --from=build /app/target/app.jar /app.jar
USER 1000
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

注意：`-jre` 而非 `-jdk` 运行；Spring Boot 3.3+ 也可以直接用官方 buildpack 或
分层 jar（`layertools extract`）让依赖层与应用层分开缓存。

### 2.3 Python

```dockerfile
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
COPY --from=build /install /usr/local
COPY . /app
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["python", "main.py"]
```

Python 的坑：依赖里常有按平台编译的 C 扩展，构建阶段与运行阶段必须用
**同一基础镜像与平台**，否则复制过来的 site-packages 不可用。

## 3. 层缓存：构建速度的核心

Docker 按层缓存：某层输入没变就直接复用。因此层顺序 = 变更频率从低到高：
基础镜像 → 系统依赖 → 语言依赖 → 源码。上面的模板都遵循
"先 COPY 清单文件、装依赖、再 COPY 源码"，就是为了让改代码不触发的依赖安装缓存。

BuildKit（Docker 23.0 起默认构建器）还提供**缓存挂载**，让下载物不进入镜像层：

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci            # npm 缓存
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt apt-get update \
    && apt-get install -y --no-install-recommends curl      # apt 缓存不残留
```

CI 中配合 `docker buildx build --cache-from/--cache-to type=gha` 把缓存跨任务复用。

## 4. 最佳实践清单

| 实践 | 原因 |
| :--- | :--- |
| 固定基础镜像版本标签（如 `node:22-alpine`） | latest 漂移导致构建不可复现 |
| 最终阶段用 slim/alpine/distroless | 更小体积 + 更小攻击面 |
| `USER` 非 root + `COPY --chown` | 容器逃逸的纵深防御 |
| `HEALTHCHECK`（自管 Docker 场景） | 编排器未接管时的健康判定 |
| 一个容器一个进程 | 信号处理与生命周期简单可靠 |
| `.dockerignore` 排除 `.git`、`node_modules`、构建产物 | 构建上下文更小、防敏感文件进镜像 |
| 用 `docker build --platform=linux/amd64,linux/arm64` 构建多架构 | ARM 服务器/苹果芯片一致性 |
| `docker scout cves` / `trivy image` 进 CI | 镜像漏洞门禁 |

注意：上 Kubernetes 后健康检查交给 `livenessProbe/readinessProbe`，
Dockerfile 里的 `HEALTHCHECK` 不再生效，两处不必重复维护。

## 5. 常见陷阱

1. **阶段被丢弃导致白构建**：`COPY --from=builder` 引用的名字拼错，BuildKit 会
   跳过该阶段构建（产物是旧的或缺失）——构建后用 `docker run --rm image --version`
   验证产物真实存在。
2. **在最后阶段再次 COPY 全量源码**：把 builder 阶段的功劳清零，最终镜像重新变大。
3. **alpine 的 musl 兼容性**：glibc 编译的动态二进制（如部分 Python 轮子、Oracle 客户端）
   在 alpine 上缺库，要么全程 musl 编译，要么用 slim 基础镜像。
4. **时区与 CA 证书缺失**：distroless/scratch 没有 `/etc/ssl/certs` 与 tzdata，
   需要从 builder 阶段 `COPY --from` 进来，否则 HTTPS 与时区立即出错。

## 6. 小结

**初学者要点**

1. 多个 FROM，最后一个说了算；中间阶段用 `COPY --from` 搬产物。
2. 层顺序决定缓存命中：依赖清单在前、源码在后。
3. 最终镜像只留运行时必需：小基础镜像 + 非 root + 固定版本标签。

**进阶注意**

1. BuildKit 缓存挂载（`--mount=type=cache`）比"合并 RUN 减层数"更优雅地解决缓存问题。
2. distroless/scratch 要主动补 CA 证书与时区；CGO 程序注意静态编译。
3. CI 侧用 buildx 的 `--cache-from/--cache-to` 与多平台构建，把本地优化放大到流水线。
## FROM 基础镜像

**基本写法：指定基础镜像**
`FROM <镜像>[:<标签>]`
```dockerfile
# 使用 nginx 作为基础镜像
FROM nginx:1.28
```

**基本写法：多阶段构建**
`FROM <镜像> AS <阶段名>`
```dockerfile
# 第一阶段构建
FROM golang:1.24 AS builder
WORKDIR /app
COPY . .
RUN go build -o myapp
```

---

## RUN 执行命令

**基本写法：执行 shell 命令**
`RUN <命令>`
```dockerfile
# 安装 nginx
RUN apt-get update && apt-get install -y nginx
```

**基本写法：exec 形式**
`RUN ["<可执行文件>", "<参数1>", "<参数2>"]`
```dockerfile
# 使用 exec 形式执行
RUN ["npm", "install", "--production"]
```

**基本写法：合并多条命令**
`RUN <命令1> && <命令2> && <命令3>`
```dockerfile
# 合并命令减少镜像层
RUN apt-get update \
    && apt-get install -y curl vim \
    && rm -rf /var/lib/apt/lists/*
```

---

## CMD 容器默认命令

**基本写法：shell 形式**
`CMD <命令>`
```dockerfile
# 默认启动 nginx
CMD nginx -g "daemon off;"
```

**基本写法：exec 形式（推荐）**
`CMD ["<可执行文件>", "<参数1>", "<参数2>"]`
```dockerfile
# exec 形式启动 nginx
CMD ["nginx", "-g", "daemon off;"]
```

**基本写法：作为 ENTRYPOINT 参数**
`CMD ["<参数1>", "<参数2>"]`
```dockerfile
# 给 ENTRYPOINT 提供默认参数
ENTRYPOINT ["python", "app.py"]
CMD ["--help"]
```

---

## ENTRYPOINT 入口点

**基本写法：固定执行命令**
`ENTRYPOINT ["<可执行文件>", "<参数>"]`
```dockerfile
# 固定入口点为 app.py
ENTRYPOINT ["python", "app.py"]
```

**基本写法：shell 形式**
`ENTRYPOINT <命令>`
```dockerfile
# shell 形式入口点
ENTRYPOINT python app.py
```

---

## COPY 复制文件

**基本写法：复制文件到镜像**
`COPY <源路径> <目标路径>`
```dockerfile
# 复制当前目录文件到镜像
COPY . /app
```

**基本写法：复制多个文件**
`COPY <文件1> <文件2> <目标目录>`
```dockerfile
# 复制多个配置文件
COPY package.json package-lock.json /app/
```

**基本写法：通配符匹配**
`COPY <通配符> <目标路径>`
```dockerfile
# 复制所有 .json 文件
COPY *.json /app/config/
```

---

## ADD 高级复制

**基本写法：复制并解压 tar 文件**
`ADD <文件> <目标路径>`
```dockerfile
# 自动解压 tar.gz 文件
ADD app.tar.gz /opt/
```

**基本写法：从 URL 下载文件**
`ADD <URL> <目标路径>`
```dockerfile
# 从 URL 下载文件
ADD https://example.com/file.zip /tmp/
```

---

## WORKDIR 工作目录

**基本写法：设置工作目录**
`WORKDIR <路径>`
```dockerfile
# 设置工作目录为 /app
WORKDIR /app
```

**基本写法：相对路径切换**
`WORKDIR <相对路径>`
```dockerfile
# 在已有工作目录下切换
WORKDIR /app
WORKDIR src
```

---

## ENV 环境变量

**基本写法：设置环境变量**
`ENV <键>=<值>`
```dockerfile
# 设置 NODE_ENV 环境变量
ENV NODE_ENV=production
```

**基本写法：设置多个环境变量**
`ENV <键1>=<值1> <键2>=<值2>`
```dockerfile
# 设置多个环境变量
ENV NODE_ENV=production PORT=3000
```

---

## ARG 构建参数

**基本写法：定义构建参数**
`ARG <参数名>[=<默认值>]`
```dockerfile
# 定义 VERSION 构建参数
ARG VERSION=latest
FROM node:$VERSION
```

**基本写法：使用构建参数**
`ARG <参数名>`
```dockerfile
# 在 RUN 中使用构建参数
ARG BUILD_DATE
RUN echo "Build date: $BUILD_DATE" > /build-date.txt
```

---

## EXPOSE 声明端口

**基本写法：声明容器端口**
`EXPOSE <端口>[/<协议>]`
```dockerfile
# 声明 80 端口
EXPOSE 80
```

**基本写法：声明多个端口**
`EXPOSE <端口1> <端口2>`
```dockerfile
# 声明 HTTP 和 HTTPS 端口
EXPOSE 80 443
```

**基本写法：声明 UDP 端口**
`EXPOSE <端口>/udp`
```dockerfile
# 声明 UDP 端口
EXPOSE 53/udp
```

---

## VOLUME 数据卷

**基本写法：声明匿名数据卷**
`VOLUME <路径>`
```dockerfile
# 声明数据卷
VOLUME /data
```

**基本写法：声明多个数据卷**
`VOLUME ["<路径1>", "<路径2>"]`
```dockerfile
# 声明多个数据卷
VOLUME ["/data", "/logs"]
```

---

## USER 切换用户

**基本写法：指定运行用户**
`USER <用户名>[:<组>]`
```dockerfile
# 切换到 node 用户运行
USER node
```

**基本写法：使用 UID**
`USER <UID>[:<GID>]`
```dockerfile
# 使用 UID 切换用户
USER 1000:1000
```

---

## LABEL 标签

**基本写法：添加镜像标签**
`LABEL <键>=<值>`
```dockerfile
# 添加维护者标签
LABEL maintainer="dev@example.com"
```

**基本写法：添加多个标签**
`LABEL <键1>=<值1> <键2>=<值2>`
```dockerfile
# 添加多个元数据标签
LABEL version="1.0" description="My App" author="dev-team"
```

---

## HEALTHCHECK 健康检查

**基本写法：设置健康检查**
`HEALTHCHECK [选项] CMD <命令>`
```dockerfile
# 每 30 秒检查一次健康状态
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/ || exit 1
```

**基本写法：禁用健康检查**
`HEALTHCHECK NONE`
```dockerfile
# 禁用基础镜像的健康检查
HEALTHCHECK NONE
```
