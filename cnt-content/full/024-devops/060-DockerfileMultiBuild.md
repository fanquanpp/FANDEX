---
order: 70
title: Dockerfile 多阶段构建
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Dockerfile 多阶段构建：减小镜像体积、分离构建与运行环境。
author: fanquanpp
updated: '2026-11-17'
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

## 6. 指令速查（把 14 个指令各讲一句）

| 指令 | 写法 | 要点 |
| :--- | :--- | :--- |
| FROM | `FROM nginx:1.28` / `FROM golang:1.24 AS builder` | 一切的地基；AS 命名阶段供 `COPY --from` 引用 |
| RUN | `RUN apt-get update && apt-get install -y curl` | 每条 RUN 一层；合并命令 + 清缓存（`rm -rf /var/lib/apt/lists/*`） |
| CMD | `CMD ["nginx", "-g", "daemon off;"]` | 容器默认命令，`docker run` 的参数可整体覆盖；exec 形式优先 |
| ENTRYPOINT | `ENTRYPOINT ["python", "app.py"]` | 固定入口；与 CMD 搭配时 CMD 变成它的默认参数 |
| COPY | `COPY package.json /app/` | 主力复制指令；支持 `--from=<阶段>` 与 `--chown` |
| ADD | `ADD app.tar.gz /opt/` | 能自动解 tar、能拉 URL——能力多但不透明，规范建议默认用 COPY |
| WORKDIR | `WORKDIR /app` | 设定后续指令的工作目录（别用 `RUN cd`，那不跨层） |
| ENV | `ENV NODE_ENV=production` | 镜像内置环境变量，运行时也在 |
| ARG | `ARG VERSION=latest` | 仅构建期有效的变量（`docker build --build-arg`） |
| EXPOSE | `EXPOSE 80 443` | 只是声明/文档作用，不发布端口；发布靠 `docker run -p` |
| VOLUME | `VOLUME ["/data", "/logs"]` | 声明匿名卷，防运行时数据写进镜像层 |
| USER | `USER 1000:1000` | 切换后续指令与容器启动的运行身份 |
| LABEL | `LABEL version="1.0" author="dev-team"` | 键值元数据（镜像作者、来源、版本） |
| HEALTHCHECK | `HEALTHCHECK --interval=30s CMD curl -f http://localhost/` | 自管 Docker 的健康判定；`HEALTHCHECK NONE` 关闭继承 |

CMD 与 ENTRYPOINT 的区别值得多说一句：ENTRYPOINT 定"这个容器天生就是干这个的"，CMD 给"默认参数"——`ENTRYPOINT ["python", "app.py"]` + `CMD ["--help"]` 时，`docker run image` 跑 `python app.py --help`，`docker run image --port 8080` 则把 `--help` 换成 `--port 8080`。只在 CMD 里写死程序名的话，任何 `docker run image 参数` 都会把程序整个顶掉，这是新手"容器起来就退"的常见根源。

## 7. 小结

**初学者要点**

1. 多个 FROM，最后一个说了算；中间阶段用 `COPY --from` 搬产物。
2. 层顺序决定缓存命中：依赖清单在前、源码在后。
3. 最终镜像只留运行时必需：小基础镜像 + 非 root + 固定版本标签。

**进阶注意**

1. BuildKit 缓存挂载（`--mount=type=cache`）比"合并 RUN 减层数"更优雅地解决缓存问题。
2. distroless/scratch 要主动补 CA 证书与时区；CGO 程序注意静态编译。
3. CI 侧用 buildx 的 `--cache-from/--cache-to` 与多平台构建，把本地优化放大到流水线。

## 自检

- 遮住第 1 节的示例，默写一个两阶段 Dockerfile 骨架：builder 阶段编译静态 Go 二进制要用哪两个环境开关，最终阶段为什么选 distroless？
- 口算缓存：把 `COPY . .` 挪到 `COPY requirements.txt` 之前，改一行代码后哪些层缓存失效？解释"层顺序 = 变更频率从低到高"。
- CMD 与 ENTRYPOINT：`ENTRYPOINT ["python", "app.py"]` + `CMD ["--help"]` 时，`docker run image --port 8080` 实际执行什么命令？
- 说出至少四个"最终镜像不该有"的东西：编译器、源码之外还有什么？（提示：看第 1 节的规则与第 5 节的陷阱）
- distroless/scratch 上 HTTPS 报证书错误，缺的是什么、从哪来？
