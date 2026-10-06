---
order: 210
title: 打包与部署：把「我机器上是好的」变成镜像与参数
description: 以「开发机好好的、生产就翻车」引入：fat jar 嵌套结构与类加载器、Dockerfile 基线与分层镜像、容器内 JVM 内存上限、优雅停机的 SIGTERM 时序、外置配置纪律，附 systemd 与 K8s 两份部署清单与停机时序观测实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/050-ConfigurationManagement'
author: fanquanpp
updated: '2026-10-05'
related:
  - 'spring-boot/160-ActuatorObservability'
  - 'java/620-JVMTuning'
  - 'java/900-JavaLogSystem'
---

## 前置知识

- 已完成 [配置管理](/spring-boot/050-ConfigurationManagement)：知道配置的优先级分层——没读过也能跟，本篇只需要「外面的配置盖过里面的」这一句；
- [JVM 调优](/java/620-JVMTuning) 与 [日志系统](/java/900-JavaLogSystem) 是两处深挖互链，没读过也能跟，本篇只在 5、7 节各留一个接口。

## 学习目标

读完本文你将能够：

1. 解剖 fat jar，说清 Main-Class 与 Start-Class 的分工、嵌套 jar 靠什么类加载器跑起来；
2. 写出基线版与分层版两个 Dockerfile，解释 ENTRYPOINT 数组式与信号传递的关系；
3. 给容器内的 JVM 定内存上限，解释 MaxRAMPercentage 为什么是 75 不是 100；
4. 描述 SIGTERM 之后 Boot 的三步时序，配好优雅停机并让宽限期两头咬合；
5. 按生产纪律外置配置、激活 profile、把日志交给 stdout；
6. 在 systemd 与 Kubernetes 两种形态里各落地一份最小可用清单。

预计 50 分钟，需要一个可打包的工程；实验一节需要 Docker。

## 1. 你现在要解决什么问题

上线日的经典三连。第一连，测试环境起不来报「找不到类」——那台机器的 JDK 是 8，你的代码要用 21。第二连，生产容器刚启动就被杀——只给了 512M 内存，JVM 却按宿主机 64G 推算了堆。第三连，发布 kill 掉进程时，用户正在下单的请求被拦腰斩断。三个事故一个根源：**开发与生产的机器差异，全靠人肉记忆对齐**。打包部署的工程化答案是把这些差异固化成两样可版本化的东西：镜像——把 JDK、依赖、应用冻成一个不可变工件，到哪台机器都一个样；参数——内存、配置、停机策略显式声明，不靠默认推断。本篇沿着「jar 是什么 → 镜像怎么打 → JVM 在容器里怎么活 → 进程怎么死得体面 → 配置纪律与两份落地清单」走一遍。

## 2. fat jar 解剖：为什么 java -jar 能跑

mvn -q package 后看产物内部：

```bash
jar tf target/blog-api-0.0.1-SNAPSHOT.jar | head -12
```

```text
META-INF/MANIFEST.MF
BOOT-INF/
BOOT-INF/classes/                      ← 你的代码
BOOT-INF/classes/com/example/blog/
BOOT-INF/lib/                          ← 全部依赖（上百个 jar 嵌在里面）
BOOT-INF/lib/spring-boot-3.5.x.jar
BOOT-INF/lib/spring-webmvc-6.2.x.jar
org/springframework/boot/loader/       ← Boot 自带的加载器
```

MANIFEST.MF 里两行关键声明：

```text
Main-Class: org.springframework.boot.loader.launch.JarLauncher
Start-Class: com.example.blog.BlogApplication
```

java -jar 的真正入口不是你的主类，是 Boot 的 JarLauncher：它创建一个自定义类加载器（LaunchedURLClassLoader），认识「jar 里再套 jar」的嵌套结构（jar:file:app.jar!/BOOT-INF/lib/x.jar 这种双层叹号路径），把 BOOT-INF/classes 与 BOOT-INF/lib 挂上类路径，最后才反射调用 Start-Class。两个由此而来的推论值得背下来：

- 解压后不能直接跑：JVM 标准的 URLClassLoader 不认识嵌套 jar 路径；把 jar 拆开用 java -cp 指到根目录，你的类在 BOOT-INF/classes 里、根本不在类路径上——只有 Boot 的加载器认得这套结构；
- fat jar 不能被别的工程当普通依赖：你的类不在 jar 根，别的项目按 jar 根找类找不到。要对外提供依赖，给 spring-boot-maven-plugin 配置 classifier 另出一份普通 jar，或把公共代码拆成独立模块。

一句话总结：fat jar 是「自带加载器的自足工件」，这套特殊结构既成就了 java -jar，也决定了上面两条边界。

## 3. Docker 化主线：基线版 Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/blog-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

逐行过：FROM 选 JRE 不选 JDK——运行时不需要编译器，镜像小一半且攻击面更小；WORKDIR 定工作目录；COPY 把 jar 拷进去；EXPOSE 只是声明端口便于人读。ENTRYPOINT 用数组式（exec 形式）是全篇第一个必须记住的细节：数组式让 java 直接成为容器的 1 号进程，SIGTERM 信号直达 JVM；写成 shell 形式（ENTRYPOINT java -jar app.jar）时 java 被包在 sh 底下，信号被 shell 拦住不转发，docker stop 等 10 秒宽限后只能 SIGKILL 硬杀——优雅停机还没开始就死了。

docker build -t blog-api:1.4.0 . 一条命令出镜像，「我机器上是好的」从此变成「镜像在谁机器上都一样」。

## 4. 分层镜像：让每次构建只传差量

基线版有个浪费：代码改一行，唯一变化的只有那个 jar，但 Docker 只认「一层文件」——COPY 整个 jar 是一整层，代码一动整层重传，几十兆依赖跟着陪跑。解法是利用 fat jar 的内部结构把它拆成 Docker 层：

```dockerfile
FROM eclipse-temurin:21-jre AS extract
WORKDIR /build
COPY target/blog-api-0.0.1-SNAPSHOT.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=extract /build/dependencies/ ./
COPY --from=extract /build/spring-boot-loader/ ./
COPY --from=extract /build/snapshot-dependencies/ ./
COPY --from=extract /build/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

第一段用 layertools 模式把 jar 解成四层目录，第二段按「变与不变」排序拷贝：dependencies（第三方依赖，几乎从不变）、spring-boot-loader、snapshot-dependencies、application（你的类，每次必变）。Docker 对层做缓存与差量：代码天天改，实际重传的只有 application 那薄薄一层，依赖层命中缓存原样复用——构建更快，镜像仓库与发布带宽只传差量。不愿写 Dockerfile 还有个一句话备选：./mvnw spring-boot:build-image 用 Buildpacks 直接产镜像（Boot 2.3 起可用），约定优于配置，代价是镜像细节不归你管。

## 5. 容器内的 JVM：内存上限怎么定

容器给了 JVM 一个陌生环境：cgroup 说内存 1G，宿主机有 64G。现代 JVM 默认容器感知（UseContainerSupport，JDK 10 起默认开启）——堆的默认值按容器限额推算，而不是按宿主机内存。但生产纪律是显式声明，不留默认推断：

```dockerfile
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
```

为什么是 75 不是 100：JVM 进程不只有堆——元空间、每线程约 1MB 量级的线程栈、直接内存、GC 自身开销都吃容器限额。堆顶满，这些零头把进程挤爆，内核直接 OOMKilled，快得连堆栈都来不及打。留 25% 是给它们的安全垫。上限定多少（1G 还是 2G）看指标说话——160 篇的 JVM 内存指标就是依据；GC 选型与堆外排查是深水区，[JVM 调优](/java/620-JVMTuning) 专篇展开。

## 6. 优雅停机：SIGTERM 之后发生了什么

发布重启是日常，但「kill 的瞬间用户请求正在处理」每天都有。默认行为（server.shutdown=immediate）是立即关闸：在途请求被掐断，客户端收到连接重置。优雅停机把死法换掉：

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

配置后，收到 SIGTERM（docker stop、systemctl stop、K8s 删 Pod 发的都是它）的时序：

```text
SIGTERM 到达
  ↓
web 服务器停止接收新请求           ← 闸门关闭，新请求进不来
  ↓
等待在途请求处理完                 ← 最多等 timeout-per-shutdown-phase
  ↓
销毁 Bean、释放连接池，进程退出     ← 超时未完成的请求被放弃
```

两个配合要点。其一，宽限期两头要咬合：docker stop 默认只等 10 秒就 SIGKILL，K8s 默认 30 秒（terminationGracePeriodSeconds 可调）——外层宽限必须大于内层 timeout，否则优雅停机没演完就被硬杀。其二，K8s 下还差一步：SIGTERM 发出后，负载均衡可能还在往这个 Pod 派单（就绪状态没来得及同步），常配 preStop 钩子先睡几秒，等 readiness 失效、端点从负载均衡摘除后，再让 Boot 开始关闸。

## 7. 生产参数纪律：配置外置、profile、日志

- 配置外置：jar 同级的 ./config/application.yml 会覆盖 jar 内配置（050 篇优先级链的一环），数据库密码这类环境相关项绝不打进镜像——镜像讲究不可变，配置讲究随环境变，两者分离；
- profile 激活：环境变量 SPRING_PROFILES_ACTIVE=prod 选定生产配置集，dev、test、prod 各归各的文件；
- 日志进 stdout：容器世界里日志不落本地文件（容器一销毁就没了，除非挂卷），打标准输出交给采集器收走——docker logs 能看，[日志系统](/java/900-JavaLogSystem) 的集中采集方案从这里接线；
- 宽限期写进清单核对：第 6 节「外层宽限大于内部 timeout」的咬合关系，要作为部署清单里的一行显式检查项，而不是口头约定——它漏掉的形态是偶发的、最难查的。

## 8. 两种落地形态：systemd 与 Kubernetes

不上容器也行，虚拟机加 systemd 是经典形态。unit 文件（/etc/systemd/system/blog-api.service）：

```ini
[Unit]
Description=blog-api
After=network.target

[Service]
User=app
WorkingDirectory=/opt/blog-api
ExecStart=/usr/bin/java -XX:MaxRAMPercentage=75.0 -jar blog-api.jar
Environment="SPRING_PROFILES_ACTIVE=prod"
Restart=always
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
```

三行值得点名：WorkingDirectory 决定外置配置 ./config/ 相对谁解析；Restart=always 崩了自动拉起；SuccessExitStatus=143 把「被 SIGTERM 终止」（128 + 15 = 143）计为正常退出，否则每次优雅停机都会被 systemd 当崩溃记一笔。

容器编排形态，K8s Deployment 最小清单（探针接的是 160 篇的健康分组）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blog-api
  template:
    metadata:
      labels:
        app: blog-api
    spec:
      containers:
        - name: blog-api
          image: registry.example.com/blog-api:1.4.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
          resources:
            limits:
              memory: 1Gi
```

镜像走内部 registry，探针决定摘流量与重启，resources.limits 与第 5 节的 MaxRAMPercentage 咬合。

## 9. 实验：构建、限内存、看停机时序

```bash
mvn -q package
jar tf target/blog-api-0.0.1-SNAPSHOT.jar | head    # 验证第 2 节的嵌套结构
docker build -t blog-api:1.4.0 .
docker run -d --name blog -m 1g -p 8080:8080 blog-api:1.4.0
```

验证容器内存感知（需要 160 篇的 actuator）：

```bash
curl "http://localhost:8080/actuator/metrics/jvm.memory.max?tag=area:heap"
```

max 约在 700 到 800 MiB 之间（1G 限额的 75% 上下，示例量级）——JVM 确实按容器限额在活。停机时序实验：先给应用加一个慢接口（内部 sleep 8 秒），curl 发起请求后立刻 docker stop blog，跟踪日志：

```text
Commencing graceful shutdown. Waiting for active requests to complete
（curl 的响应在几秒后正常返回，未被截断）
Graceful shutdown complete
```

再删掉 graceful 配置对照一次：同一操作下请求中途连接重置。一绿一红之间，第 6 节的时序图就长在日志里了。最后 docker history blog-api:1.4.0 看一眼分层体积分布——application 层最小，正是每次发布真正变化的部分。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. fat jar 的 Main-Class 与 Start-Class 各是谁？启动时 Boot 的类加载器做了什么标准类加载器做不到的事？
2. fat jar 为什么解压后跑不起来、又为什么不能被别的工程当依赖？
3. 分层镜像省在哪？四层里哪层几乎不变、哪层天天变？
4. ENTRYPOINT 为什么必须用数组式？shell 形式在 docker stop 时会发生什么？
5. MaxRAMPercentage 为什么是 75 而不是 100？OOMKilled 时为什么连堆栈都来不及打？
6. SIGTERM 之后 Boot 依次做哪三件事？docker stop 与 K8s 的默认宽限各是多久？
7. SuccessExitStatus=143 是什么意思？不配它 systemd 会怎样？
8. 生产日志为什么打 stdout 而不是写容器内文件？
