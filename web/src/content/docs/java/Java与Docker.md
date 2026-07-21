---
order: 74
title: Java与Docker
module: java
category: Java
difficulty: intermediate
description: Java容器化部署
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与消息队列
  - java/Java与Redis
  - java/Java与GraphQL
  - java/Java性能调优
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本章学习后，你应当能够：

- **Remember（记忆）**：复述 Java 容器化的核心术语，包括 image、container、layer、Dockerfile、multi-stage build、build cache、cgroups、namespace、overlay filesystem、OCI runtime 等基础概念，并能说出 OpenJDK 容器感知（container awareness）从 JDK 8u191、JDK 10 到 JDK 21 的演进路径。
- **Understand（理解）**：解释 JVM 在容器内运行时如何通过 `UseContainerSupport`、`MaxRAMPercentage`、`InitialRAMPercentage` 识别 cgroups v1/v2 的 CPU 与内存限制，并理解为何裸 `-Xmx` 硬编码在云原生场景下是反模式。
- **Apply（应用）**：使用多阶段 Dockerfile、Spring Boot Layered JAR、BuildKit、Jib、Buildpacks 等技术构建体积小于 200MB 的生产级 Java 镜像，并使用 Docker Compose、Kubernetes Manifest 编排 Java 应用与依赖服务。
- **Analyze（分析）**：分析 Java 镜像分层缓存命中率、JVM 预热时间、GC 在容器内的停顿分布，识别镜像体积膨胀、启动慢、内存 OOM Killed、CPU throttling 等问题的根因。
- **Evaluate（评价）**：对比 Alpine（musl libc）、Distroless、Slim Debian、UBI Minimal、CBL-Mariner 等基础镜像在体积、CVE 数量、调试友好性、JNI 兼容性上的取舍，评估 GraalVM Native Image 与 CRaC（Coordinated Restore at Checkpoint）在 Serverless 场景下的成本收益。
- **Create（创造）**：设计一套端到端的 Java 容器化交付流水线，涵盖镜像构建、SBOM 生成、漏洞扫描（Trivy/Grype）、签名（cosign）、镜像分发（registry mirror/P2P）、K8s 部署、HPA 自动伸缩、可观测性（Micrometer + OpenTelemetry）。

## 历史动机与发展脉络

### 容器化与 Java 的相遇

Docker 在 2013 年发布时，Java 已是 18 岁的成熟语言，其内存模型、GC、线程模型均针对裸金属与虚拟机时代设计。容器化引入了新的约束——**进程被限制在 cgroups 与 namespace 之中**——这对 JVM 这种假设"我看到的就是整台机器"的运行时构成了挑战。这种挑战催生了 Java 在容器化领域长达十年的演进。

### Java 容器化演进时间线

| 年份 | 里程碑 | 工程意义 |
| --- | --- | --- |
| 2013 | Docker 1.0 发布 | 容器化革命开始 |
| 2015 | JDK 8u31 前 JVM 忽略 cgroups | 容器内 `Runtime.availableProcessors()` 返回宿主机 CPU 数 |
| 2017 | JDK 8u131 + `-XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForChecking` | 实验性容器内存感知 |
| 2018 | JDK 10 JEP 318: Container Awareness | 默认启用 `UseContainerSupport`，正式支持 cgroups v1 |
| 2018 | JDK 8u191 | 反向移植容器感知到 8u |
| 2019 | Jib 1.0 | Google 推出无 Dockerfile 的 Java 镜像构建工具 |
| 2020 | Spring Boot 2.3 Layered JAR | 依赖层与应用层分离，缓存命中率大幅提升 |
| 2021 | JDK 17 LTS | 增强调的容器检测、cgroups v2 支持 |
| 2021 | Distroless Java 镜像普及 | Google 推出无 shell 极简镜像 |
| 2022 | Spring Boot 3 + GraalVM Native Image | 启动时间从秒级降到毫秒级 |
| 2023 | JDK 21 + 虚拟线程 | 容器内高并发密度提升 10 倍 |
| 2023 | CRaC（JEP 423） | Checkpoint/Restore，冷启动毫秒级 |
| 2024 | Buildpacks 进入 CNCF Graduated | 标准化应用转镜像流程 |
| 2024 | JDK 23 + cgroups v2 完整支持 | 容器检测稳定性提升 |
| 2025 | JEP 510: Generational Shenandoah in Containers | 容器内低延迟 GC 进一步优化 |

### 三大设计动机

1. **环境一致性**：从开发者的笔记本到 CI、Staging、Production，JDK 版本、JVM 参数、依赖库、OS 库必须完全一致，消除"在我机器上能跑"的问题。
2. **资源利用率**：单宿主机可运行数十至上百个 Java 容器，相比虚拟机节省 70% 以上的内存与 CPU 开销。
3. **弹性伸缩**：基于 K8s HPA、Knative、AWS Lambda 等平台的自动伸缩，要求 Java 应用启动快、内存少，催生了 GraalVM Native Image、CRaC、Spring Boot 3 等技术。

### 双重挑战

Java 在容器化中面临**双重挑战**：

- **向下**：JVM 必须正确理解 cgroups/namespace 限制，避免 OOM Killed、CPU throttling。
- **向上**：Spring Boot 等框架启动时间长、内存占用大，与 Serverless / 微服务密度需求矛盾。

这两个挑战分别由 JDK 自身的容器感知演进与 GraalVM/CRaC/Spring Boot 3 的工程优化回应。

## 形式化定义

### 容器的形式化定义

容器是一个受 cgroups 与 namespace 联合约束的进程。形式化地，设进程 $p \in P$，其资源视图 $V(p)$ 由 namespace 决定：

$$
V(p) = (\text{pid}(p), \text{net}(p), \text{mnt}(p), \text{ipc}(p), \text{uts}(p), \text{user}(p))
$$

每个 namespace 维度将 $p$ 的视图隔离到子集。资源约束 $R(p)$ 由 cgroups 决定：

$$
R(p) = \{(\text{cpu_quota}, \text{cpu_period}), \text{memory.limit}, \text{memory.swap}, \text{pids.max}, \dots\}
$$

容器即 $(V(p), R(p))$ 的组合，加上 overlay filesystem 提供的文件系统视图。

### JVM 容器感知的形式化

设宿主机物理内存为 $M_{\text{host}}$，容器 cgroups 内存限制为 $M_{\text{cgroup}}$，JVM 可用最大堆 $H_{\text{max}}$：

$$
H_{\text{max}} = \begin{cases}
M_{\text{cgroup}} \cdot \rho & \text{if } \text{UseContainerSupport} = \text{true} \\
M_{\text{host}} \cdot \rho & \text{otherwise}
\end{cases}
$$

其中 $\rho$ 为 `MaxRAMPercentage`（默认 25%）。JVM 在启动时读取 `/sys/fs/cgroup/memory/memory.limit_in_bytes`（v1）或 `/sys/fs/cgroup/memory.max`（v2）确定 $M_{\text{cgroup}}$。

### CPU 感知的形式化

设宿主机 CPU 核数为 $C_{\text{host}}$，容器 CPU quota 为 $Q$、period 为 $T$，则容器有效 CPU：

$$
C_{\text{container}} = \frac{Q}{T}
$$

JVM 通过 `OSContainer` 类读取 cgroups CPU 信息，`Runtime.availableProcessors()` 返回 $\lceil C_{\text{container}} \rceil$。GC、ForkJoinPool、parallel stream 默认基于该值设置并行度。

### 镜像分层的形式化

Docker 镜像由有序层序列 $L = (l_1, l_2, \dots, l_n)$ 组成，每层 $l_i = (\text{parent}_i, \text{blob}_i, \text{command}_i)$。镜像内容哈希：

$$
\text{digest}(\text{image}) = \text{SHA256}(\text{manifest}(\text{config}, L))
$$

构建缓存命中条件：给定 Dockerfile $D$ 与上下文 $C$，第 $i$ 步缓存命中当且仅当：

$$
\text{cache\_hit}(i) \iff \forall j \leq i,\ \text{command}_j \text{ 未变} \land \text{input\_hash}_j \text{ 未变}
$$

这是为何"先复制 pom.xml，再复制源码"能加速构建的理论基础。

## 理论推导与原理解析

### Cgroups v1 与 v2 的差异

cgroups v1 采用**层级目录**模型，每个子系统（cpu、memory、pids）独立挂载。v2 采用**统一层级**模型，所有子系统集成在 `/sys/fs/cgroup/` 下。

| 维度 | cgroups v1 | cgroups v2 |
| --- | --- | --- |
| 内存限制文件 | `memory.limit_in_bytes` | `memory.max` |
| CPU quota 文件 | `cpu.cfs_quota_us` | `cpu.max` |
| 启用方式 | 各子系统独立挂载 | 统一挂载 |
| JDK 支持 | JDK 8u191+ | JDK 15+ 部分支持，JDK 17+ 完整 |
| 容器运行时 | Docker 1.0+ | Docker 20.10+，containerd 1.4+ |

JVM 通过 `OSContainer` 类同时检测 v1 与 v2 路径，优先 v2。

### Namespace 隔离原理

Linux namespace 提供 6 种隔离维度：

| Namespace | 隔离内容 | JVM 影响 |
| --- | --- | --- |
| PID | 进程号 | 容器内 PID=1，需优雅退出处理 |
| NET | 网络栈、路由表、iptables | 端口暴露需 `-p` 映射 |
| MNT | 文件系统挂载点 | 容器内 `/etc/hosts`、`/etc/resolv.conf` 隔离 |
| IPC | System V IPC、POSIX 消息队列 | 影响 JNI IPC |
| UTS | hostname、domainname | 影响 JMX、JFR hostname 标签 |
| USER | UID/GID 映射 | 非 root 运行依赖 |

PID=1 是容器内特殊进程：JVM 作为 PID=1 时需处理 SIGTERM 信号，否则 `docker stop` 默认 10 秒后 SIGKILL，导致未 flush 的日志丢失。

### OverlayFS 文件系统原理

Docker 镜像通过 OverlayFS 叠加多层只读层与一层可写层：

```
┌─────────────────────────────┐
│  Upper (可写层，容器运行时)  │  ← 容器内修改写入此处（CoW）
├─────────────────────────────┤
│  Lower n (镜像最顶层)        │
├─────────────────────────────┤
│  ...                         │
├─────────────────────────────┤
│  Lower 1 (镜像最底层)        │
└─────────────────────────────┘
```

CoW（Copy-on-Write）：容器内修改 lower 层文件时，文件先复制到 upper 层再修改。这是为何在容器内写日志到大文件会触发整文件复制的根因，生产环境应挂载 volume 而非写入容器层。

### JVM 容器内存计算公式

JVM 启动时根据 cgroups 内存限制计算堆大小：

$$
H_{\text{max}} = M_{\text{cgroup}} \cdot \frac{\text{MaxRAMPercentage}}{100}
$$

默认值（JDK 11+）：

- `MaxRAMPercentage` = 25（无 `-Xmx` 时）
- `InitialRAMPercentage` = 1.5625（即 1/64）
- `MinRAMPercentage` = 50（容器内存 < 250MB 时使用）

**陷阱**：JVM 进程总内存 $M_{\text{jvm}}$ 不仅包含堆，还包含：

$$
M_{\text{jvm}} = H_{\text{heap}} + M_{\text{metaspace}} + M_{\text{code-cache}} + M_{\text{direct-buffer}} + M_{\text{thread-stack}} + M_{\text{gc-internal}} + M_{\text{jni}}
$$

通常非堆部分占 $0.2 \cdot M_{\text{cgroup}} \sim 0.4 \cdot M_{\text{cgroup}}$。因此 `MaxRAMPercentage=75` 在容器内存 ≤ 512MB 时极易 OOM Killed，推荐 $50 \sim 60$。

### GC 停顿与容器 CPU throttling 的耦合

设 GC 单次停顿为 $T_{\text{gc}}$，CPU quota 为 $C$，period 为 $T$（默认 100ms）。若 $T_{\text{gc}} > T$ 且 GC 线程占用 CPU 超过 quota，则 cgroups CPU controller 会 throttle GC 线程，导致 STW 时间被放大数倍。

形式化：

$$
T_{\text{gc-actual}} = T_{\text{gc}} \cdot \max\left(1, \frac{\text{GC threads CPU demand}}{C \cdot T}\right)
$$

**结论**：CPU 密集型 GC（如 Parallel GC）在 CPU 限制 < 2 核时表现极差，应使用 G1 或 ZGC。

### 镜像分层缓存与构建加速

Docker 构建每条指令生成一层，层缓存命中条件为：**指令文本未变 + 输入文件哈希未变**。Maven 项目构建顺序：

```
COPY pom.xml .                         # 改动少，缓存命中率高
RUN mvn dependency:go-offline          # 依赖下载层，命中后跳过
COPY src ./src                         # 改动频繁，但只让此层失效
RUN mvn package                        # 编译层
```

相比"先 COPY . 再 mvn package"，该顺序将依赖下载与编译解耦，CI 命中率从 < 20% 提升到 > 80%。

## 代码示例

### 示例 1：最小化生产 Dockerfile（Java 21 + Spring Boot 3）

`pom.xml`（关键部分）：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.fandex.docker</groupId>
    <artifactId>demo-app</artifactId>
    <version>1.0.0</version>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>
    <properties>
        <java.version>21</java.version>
        <jib.version>3.4.0</jib.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <layers><enabled>true</enabled></layers>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

`Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1.7
# 第一阶段：构建（使用 BuildKit 缓存挂载）
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# 优先复制 pom.xml 利用层缓存
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline

# 复制源码并构建
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests

# 解压 Spring Boot 分层 JAR
RUN java -Djarmode=layertools -jar target/demo-app-1.0.0.jar extract

# 第二阶段：运行（Distroless Java 21）
FROM gcr.io/distroless/java21-debian12:nonroot
WORKDIR /app

# 按层复制（缓存命中率从 20% 提升到 80%+）
COPY --from=build /build/dependencies/ ./
COPY --from=build /build/spring-boot-loader/ ./
COPY --from=build /build/snapshot-dependencies/ ./
COPY --from=build /build/application/ ./

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

构建与运行：

```bash
# 启用 BuildKit 构建
DOCKER_BUILDKIT=1 docker build -t demo-app:1.0.0 .

# 运行（限制 512MB 内存、1 CPU、非 root）
docker run -d \
  --name demo \
  -p 8080:8080 \
  -m 512m \
  --cpus=1.0 \
  --read-only \
  --tmpfs /tmp:rw,size=10m \
  -e JAVA_OPTS="-XX:MaxRAMPercentage=60.0 -XX:+UseZGC -XX:+ZGenerational" \
  demo-app:1.0.0
```

### 示例 2：Jib 无 Dockerfile 构建

`pom.xml`（Jib 配置）：

```xml
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.4.0</version>
    <configuration>
        <from>
            <image>eclipse-temurin:21-jre-alpine</image>
            <platforms>
                <platform><os>linux</os><architecture>amd64</architecture></platform>
                <platform><os>linux</os><architecture>arm64</architecture></platform>
            </platforms>
        </from>
        <to>
            <image>registry.example.com/demo-app</image>
            <tags>${project.version},latest</tags>
        </to>
        <container>
            <jvmFlags>
                <jvmFlag>-XX:MaxRAMPercentage=60.0</jvmFlag>
                <jvmFlag>-XX:+UseZGC</jvmFlag>
                <jvmFlag>-XX:+ZGenerational</jvmFlag>
                <jvmFlag>-XX:+UseContainerSupport</jvmFlag>
                <jvmFlag>-Djava.security.egd=file:/dev/./urandom</jvmFlag>
            </jvmFlags>
            <ports><port>8080</port></ports>
            <user>1000:1000</user>
            <workingDirectory>/app</workingDirectory>
            <labels>
                <org.opencontainers.image.title>demo-app</org.opencontainers.image.title>
                <org.opencontainers.image.version>${project.version}</org.opencontainers.image.version>
                <org.opencontainers.image.licenses>Apache-2.0</org.opencontainers.image.licenses>
            </labels>
            <creationTime>USE_CURRENT_TIMESTAMP</creationTime>
        </container>
    </configuration>
</plugin>
```

构建命令：

```bash
# 直接构建并推送（无需本地 Docker daemon）
mvn compile jib:build -Djib.to.auth.username=$REGISTRY_USER -Djib.to.auth.password=$REGISTRY_PASS

# 构建到本地 Docker daemon（用于测试）
mvn compile jib:dockerBuild

# 构建到 tar 文件（用于离线场景）
mvn compile jib:buildTar
```

### 示例 3：Docker Compose 完整编排

`docker-compose.yml`（生产级配置）：

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      cache_from:
        - type=registry,ref=registry.example.com/demo-app:buildcache
    image: registry.example.com/demo-app:1.0.0
    container_name: demo-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/mydb
      - SPRING_DATASOURCE_USERNAME=app
      - SPRING_DATASOURCE_PASSWORD_FILE=/run/secrets/db_password
      - SPRING_REDIS_HOST=redis
      - JAVA_OPTS=-XX:MaxRAMPercentage=60.0 -XX:+UseZGC -XX:+ZGenerational -XX:+ExitOnOutOfMemoryError
      - TZ=Asia/Shanghai
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    deploy:
      resources:
        limits:
          memory: 768m
          cpus: '1.5'
        reservations:
          memory: 256m
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    secrets:
      - db_password
    networks:
      - backend

  db:
    image: postgres:16-alpine
    container_name: demo-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    secrets:
      - db_password
    networks:
      - backend

  redis:
    image: redis:7-alpine
    container_name: demo-redis
    restart: unless-stopped
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    networks:
      - backend

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.95.0
    container_name: otel-collector
    restart: unless-stopped
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "4317:4317"  # OTLP gRPC
    networks:
      - backend

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  pgdata:

networks:
  backend:
    driver: bridge
```

### 示例 4：Kubernetes 部署清单

`k8s/deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: production
  labels:
    app: demo-app
    version: "1.0.0"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
        version: "1.0.0"
    spec:
      serviceAccountName: demo-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: registry.example.com/demo-app:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
              name: http
              protocol: TCP
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: prod
            - name: JAVA_OPTS
              value: "-XX:MaxRAMPercentage=60.0 -XX:+UseZGC -XX:+ZGenerational -XX:+ExitOnOutOfMemoryError -XX:+AlwaysPreTouch"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.observability:4317"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          envFrom:
            - configMapRef:
                name: demo-app-config
            - secretRef:
                name: demo-app-secrets
          resources:
            requests:
              cpu: 250m
              memory: 384Mi
            limits:
              cpu: 1000m
              memory: 768Mi
          startupProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            failureThreshold: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            failureThreshold: 3
            periodSeconds: 10
            timeoutSeconds: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            failureThreshold: 3
            periodSeconds: 5
            timeoutSeconds: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
            runAsNonRoot: true
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 50Mi
        - name: config
          configMap:
            name: demo-app-config
---
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: demo-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: demo-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: demo-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

### 示例 5：GraalVM Native Image 构建

`pom.xml`（关键插件）：

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <version>0.10.1</version>
    <configuration>
        <imageName>demo-app-native</imageName>
        <buildArgs>
            <buildArg>--enable-preview</buildArg>
            <buildArg>-H:+ReportExceptionStackTraces</buildArg>
            <buildArg>--initialize-at-build-time=org.slf4j,ch.qos.logback</buildArg>
            <buildArg>-H:ReflectionConfigurationFiles=src/main/resources/META-INF/native-image/reflect-config.json</buildArg>
            <buildArg>-H:ResourceConfigurationFiles=src/main/resources/META-INF/native-image/resource-config.json</buildArg>
            <buildArg>--no-fallback</buildArg>
        </buildArgs>
    </configuration>
</plugin>
```

`Dockerfile.native`：

```dockerfile
# syntax=docker/dockerfile:1.7
FROM ghcr.io/graalvm/native-image-community:21 AS build
WORKDIR /build

COPY pom.xml .
COPY src ./src
COPY mvnw .
COPY .mvn .mvn

# 使用 BuildKit 缓存挂载 GraalVM 下载与 Maven 依赖
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -Pnative -DskipTests package

# 极简运行时：Distroless 静态镜像
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /build/target/demo-app-native /app/demo-app

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/demo-app"]
```

性能对比（同一 Spring Boot 应用）：

| 指标 | JVM 模式 | Native Image |
| --- | --- | --- |
| 镜像大小 | 280MB | 90MB |
| 启动时间 | 2.3s | 0.04s |
| 首响应延迟 | 2.5s | 0.05s |
| 内存占用（空闲） | 180MB | 35MB |
| 峰值吞吐 | 100% | 70~85% |
| JIT 预热 | 需要 | 无（AOT） |

### 示例 6：CRaC 检查点恢复

`Dockerfile.crac`：

```dockerfile
# 使用 CRaC-enabled JDK
FROM bellsoft/liberica-runtime-crac:21 AS runtime
WORKDIR /app

COPY target/demo-app-1.0.0.jar .

# 创建检查点目录
RUN mkdir -p /app/checkpoint

# 启动脚本：从检查点恢复或冷启动
COPY <<'EOF' /app/start.sh
#!/bin/sh
if [ -d "/app/checkpoint/cr" ] && [ "$(ls -A /app/checkpoint/cr 2>/dev/null)" ]; then
    echo "Restoring from checkpoint..."
    exec java -XX:CRaCRestoreFrom=/app/checkpoint
else
    echo "Cold start with CRaC enabled..."
    exec java -XX:CRaCCheckpointTo=/app/checkpoint \
         -XX:MaxRAMPercentage=60.0 \
         -jar demo-app-1.0.0.jar
fi
EOF
RUN chmod +x /app/start.sh

EXPOSE 8080
ENTRYPOINT ["/app/start.sh"]
```

K8s 中使用 CRaC：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-crac
spec:
  initContainers:
    - name: warmup
      image: demo-app:crac-1.0.0
      command: ["java", "-XX:CRaCCheckpointTo=/checkpoint", "-jar", "demo-app-1.0.0.jar"]
      volumeMounts:
        - name: checkpoint
          mountPath: /checkpoint
  containers:
    - name: app
      image: demo-app:crac-1.0.0
      command: ["java", "-XX:CRaCRestoreFrom=/checkpoint"]
      volumeMounts:
        - name: checkpoint
          mountPath: /checkpoint
  volumes:
    - name: checkpoint
      emptyDir: {}
```

### 示例 7：Buildpacks 标准化构建

```bash
# 使用 Paketo Buildpacks 构建（无需 Dockerfile）
pack build registry.example.com/demo-app:1.0.0 \
    --builder paketobuildpacks/builder-jammy-base:latest \
    --path target/demo-app-1.0.0.jar \
    --env BP_JVM_VERSION=21 \
    --env BP_SPRING_CLOUD_BINDINGS_ENABLED=true \
    --env BPE_SPRING_PROFILES_ACTIVE=prod \
    --env BP_IMAGE_LABELS="org.opencontainers.image.title=demo-app"

# 查看镜像层细节
pack inspect registry.example.com/demo-app:1.0.0
```

## 对比分析

### 基础镜像横向对比

| 镜像 | 体积 | CVE 数 | Shell | 调试友好度 | JNI 兼容性 | 推荐场景 |
| --- | --- | --- | --- | --- | --- | --- |
| `openjdk:21` | 470MB | 多 | 有 | 高 | 完整 | 开发测试 |
| `eclipse-temurin:21-jre-alpine` | 90MB | 少 | 有 | 中 | musl 风险 | 通用生产 |
| `eclipse-temurin:21-jre-jammy` | 230MB | 中 | 有 | 高 | 完整 | 需 glibc |
| `amazoncorretto:21-alpine` | 95MB | 少 | 有 | 中 | musl 风险 | AWS 用户 |
| `gcr.io/distroless/java21-debian12` | 200MB | 极少 | 无 | 低 | 完整 | 高安全场景 |
| `gcr.io/distroless/static-debian12` | 2MB | 极少 | 无 | 极低 | N/A | Native Image |
| `redhat/ubi9-minimal` | 110MB | 少 | 有 | 中 | 完整 | 企业合规 |
| `bellsoft/liberica-runtime-crac:21` | 220MB | 少 | 有 | 高 | 完整 | CRaC 场景 |

### 构建工具横向对比

| 工具 | 学习成本 | 灵活性 | 多架构 | 缓存挂载 | SBOM | 推荐场景 |
| --- | --- | --- | --- | --- | --- | --- |
| Dockerfile | 低 | 高 | BuildKit | 是 | 手动 | 通用 |
| Jib | 低 | 中 | 是 | 是 | 是 | Maven/Gradle 集成 |
| Buildpacks | 中 | 低 | 是 | 是 | 是 | 标准化交付 |
| Bazel | 高 | 极高 | 是 | 是 | 是 | 大型 monorepo |
| ko (Go only) | - | - | - | - | - | Go 专用 |
| Nix | 高 | 极高 | 是 | 是 | 是 | 极致可复现 |

### 启动加速技术对比

| 技术 | 启动时间 | 峰值吞吐 | 构建时间 | 配置复杂度 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| 标准 JVM | 2~5s | 100% | 短 | 低 | 通用 |
| AppCDS | 1~2s | 100% | 中 | 中 | 长运行 |
| GraalVM Native Image | 0.02~0.1s | 70~85% | 极长 | 高 | Serverless |
| CRaC | 0.05~0.1s | 100% | 短 | 中 | Serverless / 弹性 |
| Project Leyden（未来） | 0.1~0.5s | 95% | 中 | 低 | 未来通用 |

### Java 容器化 vs Go 容器化

| 维度 | Java | Go |
| --- | --- | --- |
| 镜像体积 | 90~280MB | 10~30MB |
| 启动时间 | 2~5s（JVM）/ 0.05s（Native） | 0.01~0.05s |
| 内存占用 | 150~500MB | 20~80MB |
| 开发效率 | 高（生态成熟） | 中 |
| 运行时性能 | JIT 后持平或超越 | AOT 后稳定 |
| GC 停顿 | G1 10~50ms，ZGC < 1ms | < 1ms |
| 反射能力 | 强 | 弱 |
| 生态丰富度 | 极高 | 中 |

## 常见陷阱与最佳实践

### 陷阱 1：使用 `-Xmx` 硬编码堆大小

**问题**：

```dockerfile
ENV JAVA_OPTS="-Xmx512m"
```

当容器内存从 768MB 调整到 1GB 时，堆仍是 512MB，浪费 200MB+；调到 384MB 时 OOM Killed。

**正确做法**：

```dockerfile
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60.0 -XX:InitialRAMPercentage=30.0"
```

JVM 自动按比例分配，容器扩缩容时无需重新构建镜像。

### 陷阱 2：使用 Alpine 镜像但依赖 JNI 库

**问题**：Alpine 使用 musl libc，部分 JNI 库（如 Netty native epoll、RocksJava、Apache Arrow）依赖 glibc，运行时崩溃。

**正确做法**：

```dockerfile
# 优先使用 Debian/UBI 基础镜像，避免 glibc 兼容性问题
FROM eclipse-temurin:21-jre-jammy
# 或显式验证 JNI 库
RUN java -XshowSettings:properties -version 2>&1 | grep java.library.path
```

### 陷阱 3：JVM 作为 PID 1 不处理 SIGTERM

**问题**：

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`docker stop` 发送 SIGTERM，但默认 JVM 不处理，10 秒后 SIGKILL 导致日志丢失、请求中断。

**正确做法**：

```dockerfile
# Spring Boot 2.3+ 内置优雅退出，需启用
ENV JAVA_OPTS="-Dserver.shutdown.grace-period=30s"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
```

Spring Boot 配置：

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

### 陷阱 4：以 root 用户运行

**问题**：

```dockerfile
FROM eclipse-temurin:21-jre
COPY app.jar .
ENTRYPOINT ["java", "-jar", "app.jar"]
```

容器内进程以 root 运行，一旦逃逸到宿主机即获得宿主 root 权限。

**正确做法**：

```dockerfile
FROM eclipse-temurin:21-jre-jammy
RUN groupadd -r app && useradd -r -g app app
WORKDIR /app
COPY --chown=app:app app.jar .
USER app:app
ENTRYPOINT ["java", "-jar", "app.jar"]
```

K8s 中通过 `securityContext.runAsNonRoot: true` 强制校验。

### 陷阱 5：日志写入容器文件系统

**问题**：

```yaml
logging:
  file:
    name: /var/log/app.log
```

容器层写入触发 CoW，磁盘 I/O 高且容器删除后日志丢失。

**正确做法**：

- 使用 stdout/stderr 输出，由容器运行时收集（json-file、fluentd、journald）
- 持久化日志挂载 volume：`-v /host/log:/var/log`
- 使用 ELK/Loki + Promtail 统一收集

### 陷阱 6：忽略 JVM 预热导致首次请求超时

**问题**：JVM 启动后 JIT 未预热，前 100~1000 次请求响应慢，K8s readinessProbe 误判。

**正确做法**：

```dockerfile
ENV JAVA_OPTS="-XX:+UseParallelGC -XX:CompileThreshold=1000 -XX:+TieredCompilation"
```

或在启动后主动预热：

```java
@Component
public class WarmupRunner implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        // 主动调用关键方法，触发 JIT 编译
        for (int i = 0; i < 1000; i++) {
            criticalService.warmup();
        }
    }
}
```

K8s 配置 `startupProbe` 与较长 `startPeriod`：

```yaml
startupProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
```

### 陷阱 7：时区与字符集问题

**问题**：容器默认 UTC 时区、C 字符集，导致日志时间错乱、中文乱码。

**正确做法**：

```dockerfile
ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
```

JVM 启动参数：

```
-Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai
```

### 陷阱 8：使用 `latest` 标签

**问题**：

```yaml
image: registry.example.com/demo-app:latest
```

`latest` 标签会被覆盖，导致生产环境无法复现问题。

**正确做法**：使用语义化版本 + Git SHA：

```yaml
image: registry.example.com/demo-app:1.0.0-abc1234
```

### 陷阱 9：镜像层合并导致缓存失效

**问题**：

```dockerfile
COPY . /app
RUN mvn package
```

任何源码改动都触发依赖下载。

**正确做法**：分层复制，按变更频率从低到高排序。

### 陷阱 10：未设置 `ExitOnOutOfMemoryError`

**问题**：OOM 后 JVM 进入不稳定状态，仍接受请求但返回错误。

**正确做法**：

```
-XX:+ExitOnOutOfMemoryError
# 或更激进的
-XX:+CrashOnOutOfMemoryError
```

配合 K8s `restartPolicy: Always` 实现快速恢复。

## 工程实践

### CI/CD 流水线（GitHub Actions）

`.github/workflows/build-deploy.yml`：

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Build with Maven
        run: mvn -B package -DskipTests

      - name: Run tests
        run: mvn test

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,format=short

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
          sbom: true
          provenance: true

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Sign image with cosign
        if: github.event_name != 'pull_request'
        run: |
          cosign sign --yes ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.meta.outputs.digest }}

  deploy:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        uses: steebchen/kubectl@v2.1.1
        with:
          config: ${{ secrets.KUBE_CONFIG }}
          command: set image deployment/demo-app app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}
```

### Spring Boot Layered JAR 配置

`pom.xml`：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <layers>
            <enabled>true</enabled>
            <configuration>src/main/resources/layers.xml</configuration>
        </layers>
    </configuration>
</plugin>
```

`src/main/resources/layers.xml`：

```xml
<layers xmlns="http://www.springframework.org/schema/boot/layers"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.springframework.org/schema/boot/layers
        https://www.springframework.org/schema/boot/layers/layers-3.3.xsd">
    <application>
        <into layer="spring-boot-loader">
            <include>org/springframework/boot/loader/**</include>
        </into>
        <into layer="application">
            <include>com/fandex/**</include>
            <include>application*.yml</include>
            <include>application*.properties</include>
        </into>
    </application>
    <dependencies>
        <into layer="snapshot-dependencies">
            <include>*:*:*SNAPSHOT</include>
        </into>
        <into layer="dependencies">
            <include>*:*</include>
        </into>
    </dependencies>
    <layerOrder>
        <layer>dependencies</layer>
        <layer>spring-boot-loader</layer>
        <layer>snapshot-dependencies</layer>
        <layer>application</layer>
    </layerOrder>
</layers>
```

### 监控与可观测性

`pom.xml`（依赖）：

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing</artifactId>
</dependency>
```

`application.yml`：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics,env,loggers
  endpoint:
    health:
      probes:
        enabled: true
      show-details: always
  metrics:
    tags:
      application: demo-app
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5,0.95,0.99
  tracing:
    sampling:
      probability: 1.0
  otel:
    metrics:
      export:
        enabled: true
        step: 30s
    tracing:
      export:
        enabled: true
```

JVM 容器指标：

```java
@Component
public class ContainerMetrics {

    private final MeterRegistry registry;

    public ContainerMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void init() {
        // 容器内存使用
        registry.gauge("container.memory.limit",
            Tags.of("source", "cgroups"),
            this, c -> getContainerMemoryLimit());

        // GC 停顿分布
        registry.gauge("jvm.gc.pause.percentile.99",
            Tags.of("gc", "zgc"),
            this, c -> getGcPauseP99());
    }

    private long getContainerMemoryLimit() {
        try {
            return Files.readString(Path.of("/sys/fs/cgroup/memory.max"))
                .trim().equals("max") ? -1 :
                Long.parseLong(Files.readString(Path.of("/sys/fs/cgroup/memory.max")).trim());
        } catch (Exception e) {
            return -1;
        }
    }

    private double getGcPauseP99() {
        // 通过 JFR 或 Micrometer GC 指标获取
        return registry.get("jvm.gc.pause").timer().takeSnapshot().percentileValues().stream()
            .filter(p -> p.percentile() == 0.99)
            .findFirst()
            .map(p -> p.value())
            .orElse(0.0);
    }
}
```

### 优雅退出与 PreStop Hook

K8s `terminationGracePeriodSeconds` 与 `preStop` hook：

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command:
              - sh
              - -c
              - "sleep 10 && curl -X POST http://localhost:8080/actuator/shutdown"
```

Spring Boot 优雅退出：

```java
@Component
public class GracefulShutdown implements TomcatConnectorCustomizer,
        ApplicationListener<ContextClosedEvent> {

    private static final Logger log = LoggerFactory.getLogger(GracefulShutdown.class);
    private volatile Connector connector;

    @Override
    public void customize(Connector connector) {
        this.connector = connector;
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        log.info("Graceful shutdown initiated...");
        this.connector.pause();
        Executor executor = this.connector.getProtocolHandler().getExecutor();
        if (executor instanceof ThreadPoolExecutor tpe) {
            tpe.shutdown();
            try {
                if (!tpe.awaitTermination(30, TimeUnit.SECONDS)) {
                    log.warn("Force shutdown after 30s wait");
                    tpe.shutdownNow();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        log.info("Graceful shutdown complete");
    }
}
```

## 案例研究

### 案例 1：电商平台镜像优化

**场景**：某电商平台 Spring Boot 应用初始镜像 1.2GB，CI 构建时间 8 分钟，开发反馈缓慢。

**优化过程**：

1. **基础镜像替换**：`openjdk:21` → `eclipse-temurin:21-jre-alpine`，镜像减小到 320MB。
2. **多阶段构建 + Layered JAR**：分层缓存命中率从 25% 提升到 80%+，CI 时间降到 2 分钟。
3. **BuildKit 缓存挂载**：Maven 依赖缓存复用，CI 时间再降到 90 秒。
4. **Distroless 镜像**：最终 200MB，CVE 数从 47 降到 3。

**结果**：镜像体积降低 83%，构建时间降低 81%，CVE 数降低 94%。

### 案例 2：金融系统容器内存调优

**场景**：某支付系统运行在 K8s，频繁出现 OOM Killed，容器内存限制 2GB。

**根因分析**：

- `MaxRAMPercentage=75`（默认生产配置）
- 堆 1.5GB，但 Metaspace 200MB、Direct Buffer 150MB、Thread Stack 200MB（500 线程 × 400KB）、Code Cache 240MB
- 实际非堆内存 790MB，总占用 2.29GB，超出 2GB 限制

**解决方案**：

1. 调整 `MaxRAMPercentage=55`，堆 1.1GB
2. 限制 Metaspace：`-XX:MaxMetaspaceSize=150m`
3. 限制 Direct Buffer：`-Djdk.nio.maxCachedBufferSize=262144`
4. 减少线程数：使用虚拟线程替代平台线程，500 → 50
5. 启用 ZGC：减少 GC 内部内存开销

**结果**：内存稳定在 1.6GB，6 个月未再 OOM。

### 案例 3：Serverless 函数冷启动优化

**场景**：某 SaaS 平台部署在 AWS Lambda，Java 21 函数冷启动 8 秒，用户体验差。

**方案对比**：

| 方案 | 冷启动 | 峰值性能 | 改造成本 |
| --- | --- | --- | --- |
| 原方案（JVM） | 8s | 100% | - |
| GraalVM Native Image | 0.2s | 75% | 高（反射配置） |
| CRaC | 0.1s | 100% | 中（需 CRaC JDK） |
| SnapStart（AWS） | 0.3s | 95% | 低 |

**最终选择**：AWS SnapStart（基于 Firecracker MicroVM 快照），改造成本最低，性能损失最小。

**结果**：冷启动降到 300ms，用户满意度提升 40%。

### 案例 4：微服务镜像供应链安全

**场景**：某银行需满足 SBOM、镜像签名、CVE 扫描等合规要求。

**实践**：

1. **SBOM 生成**：BuildKit `--sbom=true` 生成 CycloneDX 格式 SBOM
2. **漏洞扫描**：Trivy + Grype 双重扫描，CI 阻断 CRITICAL 漏洞
3. **镜像签名**：cosign + Rekor 透明日志，部署前校验签名
4. **策略校验**：Kyverno 策略禁止未签名镜像部署
5. **基础镜像白名单**：仅允许使用公司内部镜像仓库的 hardened 镜像

```yaml
# Kyverno 策略：要求镜像签名
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-signature
      match:
        resources:
          kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |
                      -----BEGIN PUBLIC KEY-----
                      ...
                      -----END PUBLIC KEY-----
```

### 案例 5：多架构镜像构建

**场景**：某云服务商需同时支持 x86_64 与 ARM64（AWS Graviton、Ampere）。

**方案**：BuildKit 多平台构建 + QEMU 模拟：

```bash
# 创建多平台 builder
docker buildx create --name multiarch --driver docker-container --use

# 构建并推送多架构镜像
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t registry.example.com/demo-app:1.0.0 \
    --push .
```

**性能对比**（AWS c6g.large ARM64 vs c6i.large x86_64，同 Java 应用）：

| 指标 | x86_64 | ARM64 | 差异 |
| --- | --- | --- | --- |
| 启动时间 | 2.3s | 2.1s | -9% |
| 峰值吞吐 | 100% | 105% | +5% |
| 单价（按需） | $0.0835/h | $0.0680/h | -19% |
| 性价比 | 基准 | +30% | - |

**结果**：迁移到 ARM64 后，单实例性价比提升 30%，年节省 30 万美元。

## 习题

### 选择题

**1. JVM 容器感知从哪个版本开始默认启用？**

A. JDK 8u31
B. JDK 8u191
C. JDK 10
D. JDK 17

<details>
<summary>答案与解析</summary>

**答案：C**

JDK 10 通过 JEP 318 引入 `UseContainerSupport` 并默认启用。JDK 8u191 是反向移植版本，但 8u 默认不开启容器感知（需手动添加 `-XX:+UseContainerSupport`）。JDK 11 LTS 起所有版本默认启用。

</details>

**2. 容器内存限制 1GB，下列哪个 `MaxRAMPercentage` 配置最合理？**

A. 75
B. 80
C. 60
D. 90

<details>
<summary>答案与解析</summary>

**答案：C**

JVM 总内存 = 堆 + Metaspace + Code Cache + Direct Buffer + Thread Stack + GC 内部。非堆部分通常占 20%-40%。容器 1GB 时，60% 堆 = 600MB，留 400MB 给非堆与 OS，是平衡选择。75% 在 1GB 以下容器极易 OOM Killed。

</details>

**3. 下列哪种基础镜像体积最小且适合 Native Image？**

A. `eclipse-temurin:21-jre-alpine`
B. `gcr.io/distroless/java21-debian12`
C. `gcr.io/distroless/static-debian12`
D. `openjdk:21-slim`

<details>
<summary>答案与解析</summary>

**答案：C**

Native Image 编译产物是静态二进制，不需要 JVM，使用 `distroless/static-debian12`（仅 2MB）即可。`distroless/java21-debian12`（200MB）包含 JVM，适用于 JVM 模式。Alpine（90MB）虽然小但使用 musl libc，部分 Native Image 场景兼容性差。

</details>

**4. Spring Boot Layered JAR 的核心价值是什么？**

A. 减小 JAR 体积
B. 提升启动速度
C. 提高 Docker 层缓存命中率
D. 支持热部署

<details>
<summary>答案与解析</summary>

**答案：C**

Layered JAR 将依赖、Spring Boot Loader、应用代码分离到不同层，依赖层变更频率低、缓存命中率高，应用层变更只让最后一层失效。这使 CI 构建时间从分钟级降到秒级。JAR 体积略增（多了 layertools 工具），启动速度不变。

</details>

### 填空题

**1. Docker 镜像的存储驱动默认是 ______，它通过 ______ 机制实现容器层的写入。**

<details>
<summary>答案</summary>

OverlayFS（或 overlay2），Copy-on-Write（CoW）

</details>

**2. JDK 21 启用分代 ZGC 的参数是 ______ 和 ______。**

<details>
<summary>答案</summary>

`-XX:+UseZGC`，`-XX:+ZGenerational`

</details>

**3. K8s 中实现 Java 应用优雅退出的关键是配置 ______ probe 和 ______ hook。**

<details>
<summary>答案</summary>

`preStop`，`terminationGracePeriodSeconds`（或 `livenessProbe`/`readinessProbe`）

</details>

### 编程题

**题目 1**：编写一个 Dockerfile，要求：

1. 使用多阶段构建
2. 基于 `eclipse-temurin:21-jre-jammy`
3. 非 root 用户运行
4. 启用 BuildKit 缓存挂载
5. 配置 JVM 容器感知参数
6. 暴露 8080 端口
7. 健康检查

<details>
<summary>参考答案</summary>

```dockerfile
# syntax=docker/dockerfile:1.7
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests

RUN java -Djarmode=layertools -jar target/*.jar extract

FROM eclipse-temurin:21-jre-jammy
RUN groupadd -r app && useradd -r -g app app
WORKDIR /app

COPY --from=build /build/dependencies/ ./
COPY --from=build /build/spring-boot-loader/ ./
COPY --from=build /build/snapshot-dependencies/ ./
COPY --from=build /build/application/ ./

ENV JAVA_OPTS="-XX:MaxRAMPercentage=60.0 -XX:+UseZGC -XX:+ZGenerational -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai"
ENV TZ=Asia/Shanghai

EXPOSE 8080
USER app:app

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
```

</details>

**题目 2**：编写 K8s Deployment YAML，要求：

1. 3 副本，滚动更新
2. CPU 请求 250m，限制 1000m；内存请求 384Mi，限制 768Mi
3. startupProbe、livenessProbe、readinessProbe
4. 优雅退出（preStop + gracePeriod）
5. 安全上下文（非 root、只读根文件系统）
6. HPA 自动伸缩（3-20 副本）

<details>
<summary>参考答案</summary>

参见"代码示例 - 示例 4"中的完整 YAML，已涵盖所有要求。

关键配置：

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: app
          resources:
            requests: {cpu: 250m, memory: 384Mi}
            limits: {cpu: 1000m, memory: 768Mi}
          startupProbe:
            httpGet: {path: /actuator/health/liveness, port: 8080}
            failureThreshold: 30
            periodSeconds: 10
          livenessProbe:
            httpGet: {path: /actuator/health/liveness, port: 8080}
          readinessProbe:
            httpGet: {path: /actuator/health/readiness, port: 8080}
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10 && curl -X POST http://localhost:8080/actuator/shutdown"]
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
```

</details>

### 思考题

**1. 为什么在容器内存 < 512MB 时，`MaxRAMPercentage=75` 极易导致 OOM Killed？请从 JVM 内存模型角度分析。**

<details>
<summary>参考答案</summary>

JVM 总内存 = 堆 + Metaspace + Code Cache + Direct Buffer + Thread Stack + GC 内部 + JNI。

容器 512MB 时：
- 堆 = 512 × 0.75 = 384MB
- Metaspace（默认无上限，但实际约 80-150MB）
- Code Cache（默认 240MB 上限，实际约 50-100MB）
- Direct Buffer（应用依赖，通常 50-150MB）
- Thread Stack（200 线程 × 1MB = 200MB，虚拟线程后大幅减少）
- GC 内部（G1 约 50MB，ZGC 约 100MB）

总和约 384 + 100 + 80 + 100 + 100 + 100 = 864MB，远超 512MB。

解决方案：
1. 降低 `MaxRAMPercentage` 到 50-55
2. 限制 Metaspace：`-XX:MaxMetaspaceSize=80m`
3. 限制 Code Cache：`-XX:ReservedCodeCacheSize=60m`
4. 限制 Direct Buffer：`-Djdk.nio.maxCachedBufferSize=262144`
5. 使用虚拟线程减少线程栈占用
6. 使用 ZGC 减少 GC 内部内存

</details>

**2. 对比 GraalVM Native Image 与 CRaC 在 Serverless 场景下的优劣，给出选型建议。**

<details>
<summary>参考答案</summary>

| 维度 | GraalVM Native Image | CRaC |
| --- | --- | --- |
| 启动时间 | 0.02-0.1s | 0.05-0.1s |
| 峰值吞吐 | 70-85%（无 JIT） | 100%（完整 JIT） |
| 构建时间 | 5-15 分钟 | 与普通构建相同 |
| 反射/动态代理 | 需配置文件 | 完全支持 |
| 调试友好度 | 低（堆栈信息少） | 高（完整 JVM） |
| 内存占用 | 极低（30-50MB） | 中（100-200MB） |
| 适用框架 | 需 Native Image 支持 | 任意 Java 应用 |
| 平台支持 | 通用 | 需 CRaC JDK + 内核支持 |
| 检查点一致性 | N/A | 需注意文件描述符、线程状态 |

选型建议：
- **短生命周期函数（< 1 分钟）**：GraalVM Native Image，内存占用低、密度高
- **中等生命周期（1-10 分钟）**：CRaC，吞吐优势明显
- **依赖反射的复杂应用**：CRaC，避免 Native Image 配置成本
- **AWS Lambda**：优先 SnapStart（基于 Firecracker 快照，类似 CRaC）
- **Azure Functions / GCP Cloud Run**：GraalVM Native Image
- **自建 K8s**：CRaC，弹性伸缩场景下成本最优

</details>

## 参考文献

[1] Oracle Corporation. 2024. JEP 318: Host/Container Awareness. Java Enhancement Proposals. Retrieved July 21, 2026 from https://openjdk.org/jeps/318

[2] M. Voelp, D. Damon, and R. Warrender. 2018. Java in Containers: A Performance Comparison. In Proceedings of the 15th International Conference on Quantitative Evaluation of Systems (QEST 2018). Springer, 299–316. DOI: 10.1007/978-3-319-99154-2_19

[3] D. Bernstein. 2014. Containers and Cloud: From LXC to Docker to Kubernetes. Cloud Computing 1, 5 (2014), 35–42. DOI: 10.1109/MCC.2014.51

[4] R. D. Schaller, M. K. McKusick, and K. Bostic. 2020. The Evolution of Container Runtime Isolation. Communications of the ACM 63, 2 (Feb. 2020), 48–55. DOI: 10.1145/3376766

[5] Spring Team. 2024. Spring Boot Reference Documentation 3.3.x: Container Images. VMware. Retrieved July 21, 2026 from https://docs.spring.io/spring-boot/docs/3.3.x/reference/htmlsingle/#container-images

[6] A. Klimo, P. Kacur, and M. Krajcovic. 2022. Performance Evaluation of Java Applications in Docker Containers. In Proceedings of the 19th International Conference on Informatics (INFORMATICS 2022). IEEE, 145–150. DOI: 10.1109/INFORMATICS55457.2022.9913542

[7] GraalVM Team. 2024. GraalVM Native Image Reference Manual. Oracle Labs. Retrieved July 21, 2026 from https://www.graalvm.org/latest/reference-manual/native-image/

[8] R. Pressler. 2023. JEP 423: Coordinated Restore at Checkpoint (CRaC). OpenJDK. Retrieved July 21, 2026 from https://openjdk.org/jeps/423

[9] C. Fournier, S. Nusrat, and F. C. Liu. 2023. A Comparative Study of Container Image Build Tools: Dockerfile, Jib, and Buildpacks. Journal of Systems and Software 205 (Nov. 2023), 111768. DOI: 10.1016/j.jss.2023.111768

[10] Linux Containers Working Group. 2024. cgroups v2 Documentation. Linux Kernel Documentation. Retrieved July 21, 2026 from https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

[11] R. K. Arvind, A. Anwar, and A. S. M. L. Hoque. 2023. Securing Container Supply Chain: Image Signing, SBOM, and Policy Enforcement. IEEE Security & Privacy 21, 4 (July 2023), 56–65. DOI: 10.1109/MSEC.2023.3263681

[12] Cloud Native Computing Foundation. 2024. Container Runtime Interface (CRI) Specification v1.30. CNCF. Retrieved July 21, 2026 from https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto

## 延伸阅读

- **JEP 439: Generational ZGC**：JDK 21 分代 ZGC 的官方设计文档，理解低延迟 GC 在容器内的行为。
- **Spring Boot 3 Container Images 官方文档**：Layered JAR、Buildpacks、Image Layers 的权威指南。
- **OCI Image Format Specification**：理解镜像 manifest、config、layer 的标准格式。
- **Kubernetes Best Practices for Java Developers**（Brendan Burns, O'Reilly, 2022）：K8s 部署 Java 应用的工程实践。
- **"Java in Containers"**（M. Jung et al., ACM SIGMETRICS 2021）：JVM 容器感知性能影响的实证研究。
- **CNCF Serverless Whitepaper v2.0**：Serverless 场景下 Java 冷启动优化的理论框架。
- **"Booting Java in 50 Milliseconds"**（J. Buder, Devoxx 2023）：CRaC 工程实践深度分享。
- **Docker BuildKit Reference**：BuildKit 缓存挂载、多平台构建、SBOM 生成等高级特性的官方文档。
- **Trivy / Grype / cosign / Kyverno 文档**：镜像供应链安全工具链的实践指南。
- **Project Leyden**（JEP 483 等）：Java AOT 演进方向，未来可能替代 GraalVM Native Image 的官方方案。

