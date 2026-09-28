---
order: 60
title: 容器与编排
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 从手跑一个容器到让集群托管应用：用 Docker 与 kind 实操理解编排为什么存在，掌握 Deployment、Service、HPA 最小组合。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'cloud-computing/070-DockerDeepAnalysis'
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/150-HelmPackageManagement'
  - 'cloud-computing/540-HarborRegistry'
prerequisites: []
---

前置知识：会用终端执行命令；装好 Docker Desktop（或 Linux 上的 Docker Engine）。
不需要任何 Kubernetes 基础——本文就是云计算模块里带你从零摸到集群的那篇。

读完本文你应当能够：说清容器和虚拟机的区别到底在哪；把一个本地服务打包成
镜像并跑起来；用 kind 在自己电脑上起一个单机 Kubernetes 集群并部署应用；
理解"编排"解决的三个问题分别对应哪些机制。

## 1. 场景：你写了个服务，想让它"一直活着"

假设你写了一个 Node 服务，在自己电脑上 `node main.js` 跑得好好的。
现在要让别人也能用，问题立刻一个接一个：

1. **"我这能跑"不算数**。你的机器有 Node 22、有依赖、有环境变量；
   别人的服务器一样都没有。环境不一致是部署事故的头号来源。
2. **进程挂了谁拉起来**。你下班了，服务崩了，谁负责重启？
3. **流量涨了怎么办**。一个进程扛 100 人在线没问题，1000 人呢？
   手动再起几个？端口怎么分？请求怎么分？

容器解决第 1 个问题；**编排器（orchestrator）解决后两个**。这条线就是
本文的地图：先容器，后编排。

## 2. 动手：把服务装进容器

### 2.1 镜像与容器：一张快照和一个进程

容器不是虚拟机。虚拟机虚拟出一整套硬件和操作系统；容器只是被 Linux
内核的隔离机制（命名空间 + 控制组）圈起来的**一组普通进程**，共享宿主机
内核。所以容器秒级启动、内存开销小，但里面"看到的世界"是精心裁剪过的。

**镜像**是只读的文件系统快照（应用 + 运行时 + 依赖全部打包），
**容器**是镜像跑起来的那个实例。类比：镜像是安装光盘，容器是装好后在跑的软件。

### 2.2 从 Dockerfile 到运行中的容器

最直接的动手方式：给上一节的服务写一个 Dockerfile。

```dockerfile
# 多阶段构建：第一阶段编译，第二阶段只带产物，镜像能小一半以上
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node                     # 不用 root 跑，出事时损失小
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

```bash
docker build -t myapp:v1 .          # 把当前目录构建成镜像 myapp:v1
docker run -d -p 3000:3000 myapp:v1 # 后台运行，宿主机 3000 端口映射进容器
docker ps                           # 看到你的容器在跑
docker logs -f <容器ID>              # 跟日志
docker exec -it <容器ID> sh         # 钻进容器里看
```

打开 `http://localhost:3000`——同一个服务，现在它装在快照里，任何装了
Docker 的机器都能一条命令跑出**完全相同**的环境。问题 1 解决。

Dockerfile 的层缓存、体积优化等进阶写法见《Docker 深入剖析》。

### 2.3 单机多容器：Compose

真实服务不止一个进程：应用、数据库、缓存各一个容器。手动 `docker run`
三条还要管启动顺序，用 Compose 一个文件声明清楚：

```yaml
# compose.yaml
services:
  app:
    build: .
    ports: ['3000:3000']
    environment:
      DB_HOST: postgres
    depends_on:
      postgres:
        condition: service_healthy   # 等数据库健康检查通过再起 app

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: devpass     # 本地开发可以硬编码，生产绝不行
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
```

```bash
docker compose up -d      # 一条命令起全部服务
docker compose down       # 一条命令全停
```

到这里，一台机器上的容器化已经齐了。**接下来是本文真正的主题：
机器不止一台时，谁来管？**

## 3. 编排：把"一直活着"写成声明

### 3.1 为什么需要 Kubernetes

十台机器、五十个容器的时候，Compose 那套"声明在哪个文件、起在哪个
机器"就撑不住了。你需要一个系统持续回答三个问题：

| 问题                     | 编排器的机制                             |
| :----------------------- | :--------------------------------------- |
| 容器放哪台机器跑？       | 调度器按资源余量自动挑选节点             |
| 挂了怎么办？             | 控制器发现实际状态偏离期望，自动重建     |
| 流量来了怎么分？         | Service 把一组容器当一个稳定的访问入口   |

Kubernetes（下称 K8s）是当前事实标准的编排器。它最反直觉也最核心的
思想是**声明式**：你不写"启动容器 A，然后启动容器 B"这种命令，
而是写一份期望状态（"这个服务要 3 个副本"）提交给集群，集群里的控制器
不停地把实际状态**往期望状态掰**。容器崩了？控制器发现只剩 2 个，自动
补到 3。这个循环不需要人参与——问题 2 就此解决。

### 3.2 动手：本地起一个真集群

不用云、不用服务器，kind（Kubernetes in Docker）把整个集群塞进几个
容器里，是 2026 年本地学习 K8s 的标准做法：

```bash
kind create cluster --name learn     # 几十秒后有一个单节点集群
kubectl get nodes                    # 确认节点 Ready
```

现在部署应用。生产中不直接写 Pod，而是写 **Deployment**（管理 Pod 副本
的上层资源）：

```yaml
# deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3                        # 期望：永远保持 3 个副本
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:v1
          resources:
            requests:                # 申明需要多少：调度器按这个挑机器
              cpu: 250m              # 250m = 0.25 核
              memory: 256Mi
            limits:                  # 最多用多少：超限会被限制或杀掉
              cpu: 500m
              memory: 512Mi
```

```bash
kubectl apply -f deploy.yaml   # 提交期望状态
kubectl get pods               # 看到 3 个 myapp-xxxx 的 Pod
kubectl delete pod myapp-xxxx  # 手动杀一个，几秒后自动补齐——声明式的直观体验
```

亲手删一个 Pod 再看它自动重建，比读十遍文档更能理解"控制器循环"。

### 3.3 稳定入口：Service

Pod 会死会生，IP 随之漂移，不能直接当访问地址。**Service** 用标签选中
一组 Pod，提供一个稳定入口（问题 3 的答案）：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp            # 选中所有带这个标签的 Pod
  ports:
    - port: 80            # Service 端口
      targetPort: 3000    # 容器端口
  type: ClusterIP
```

| Service 类型     | 提供什么                       | 适用           |
| :--------------- | :----------------------------- | :------------- |
| **ClusterIP**    | 集群内部虚拟 IP（默认）        | 服务间调用     |
| **NodePort**     | 每个节点开一个高位端口         | 开发调试       |
| **LoadBalancer** | 向云商申请真实负载均衡器       | 生产对外暴露   |
| **ExternalName** | 返回一条 CNAME                 | 引用外部服务   |

集群外部访问 HTTP 服务，通常再加一层 **Ingress**（按域名/路径路由到不同
Service）；新一代替代品是 Gateway API（2023 年起 GA，2026 年新集群多已
默认采用）。这层的展开见《Kubernetes 网络》。

### 3.4 流量涨了：HPA 自动扩缩容

编排器还剩一件事没答：副本数"3"是写死的，谁来跟着流量改？答案还是
声明式——把"什么时候扩"也写成 YAML，交给 **HPA（HorizontalPodAutoscaler）**：

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70      # 平均 CPU 超 70% 开始扩
  behavior:                           # 扩要快，缩要慢——防止抖动
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100                  # 每分钟最多翻一倍
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300 # 缩容前观察 5 分钟
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

扩缩容的负载均衡与云商弹性方案对照见《负载均衡与自动伸缩》。

## 4. 打包与分发：Helm 与镜像仓库

清单文件一多，就出现"同一套 YAML，测试和生产的参数不同"的复制粘贴
地狱。**Helm** 把一组清单做成带参数的模板包（Chart），安装时传值：

```bash
helm install myapp ./myapp-chart -f values-prod.yaml -n production
helm upgrade myapp ./myapp-chart -f values-prod.yaml   # 升级即改参数重装
helm rollback myapp 1                                  # 回滚到第 1 个版本
```

Chart 结构、模板语法与 values 覆盖优先级见《Helm 包管理》，本文只需
记住它的定位：**K8s 应用的 apt/npm**。

另一个分发问题：`image: myapp:v1` 里的镜像从哪来？本机 build 的镜像
集群拉不到，需要推到**镜像仓库（Registry）**：

```bash
# 推到自建 Harbor 仓库（公有仓库 Docker Hub / GHCR 流程相同）
docker tag myapp:v1 harbor.example.com/proj/myapp:v1
docker login harbor.example.com
docker push harbor.example.com/proj/myapp:v1

# 私有仓库需要凭证，K8s 里做成 Secret 挂给 Pod
kubectl create secret docker-registry harbor-secret \
  --docker-server=harbor.example.com \
  --docker-username=admin \
  --docker-password=Harbor12345
```

标签策略只有一条铁律：**别用 latest**。生产镜像用 Git SHA 或语义版本
（`sha-abc1234`、`v2.3.1`），保证"线上跑的镜像"能精确对应到某次提交。
 Harbor 的搭建与漏洞扫描见《Harbor 镜像仓库》。

## 5. 坑点与自检

1. **Secret 不是加密**。`kubectl get secret` 看到的 base64 一秒解码，
   它只是"不方便人眼读"。真正的保护靠 RBAC 权限和外部密钥管理系统
   （如 Vault、云 KMS）。
2. **requests/limits 不设或乱设**。不设 requests，调度器盲排，节点过载；
   limits 给太小，应用莫名被 OOMKill，日志里只有一行 `Killed`。
3. **把状态存进容器**。容器随时会被重建，写进容器文件系统的数据一重启
   就没。有状态数据必须挂 Volume 或用数据库。
4. **直接改 Pod**。`kubectl edit pod` 改的东西在下一次重建时全部蒸发，
   因为 Pod 的"主人"是 Deployment。改期望就去改 Deployment 的 YAML。
5. **本地 kind 通了，集群不通**。kind 里的镜像在本地，真实集群拉不到；
   记得走仓库推送流程，别把"本地能跑"当成部署成功。

自检清单：

- [ ] 能向别人解释镜像与容器、Pod 与 Deployment 的区别
- [ ] 本机能用 kind 起集群、部署、手动杀 Pod 看到自动重建
- [ ] 生产的镜像标签不是 latest
- [ ] Deployment 配置了 requests 与 limits
- [ ] 有状态数据不在容器文件系统里

## 6. 练习

1. 把任意一个自己写过的小服务容器化，用 `docker images` 对比多阶段
   构建前后的镜像体积。
2. 用 kind 起集群，把 `replicas` 改成 5 再 apply，观察滚动过程中
   `kubectl get pods` 的输出变化。
3. 故意把 Deployment 里的镜像名写错（不存在的 tag），apply 后用
   `kubectl describe pod` 找出失败原因（ImagePullBackOff）。
4. 给第 2 题的 Deployment 加一条 livenessProbe 指向一个不存在的路径，
   观察容器被反复重启（CrashLoopBackOff），体会探针的威力与误配代价。

## 7. 下一步

- Pod、ConfigMap、探针等核心资源的完整拆解：见《Kubernetes 核心资源》。
- 控制平面与节点的分工：见《Kubernetes 架构》。
- 从 YAML 到可复用安装包：见《Helm 包管理》。
- 镜像仓库自建与安全扫描：见《Harbor 镜像仓库》。
