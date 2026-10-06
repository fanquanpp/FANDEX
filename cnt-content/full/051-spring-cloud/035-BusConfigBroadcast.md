---
order: 40
title: Spring Cloud Bus 与配置广播
module: 'spring-cloud'
category: 后端技术
difficulty: beginner
description: Bus 的事件广播模型、busrefresh 全实例刷新与单实例 refresh 的对照、binder 配置与灰度刷新
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Spring Cloud Bus——基于消息代理（RabbitMQ/Kafka）的配置与事件广播。
- 解决什么问题：《配置中心》篇的动态刷新只作用于"你 curl 的那一个实例"；生产上有 20 台实例时，逐台刷既累又漏。Bus 把一次刷新广播给全部订阅实例。
- 什么时候用到：多实例部署下改配置不重启生效、配置变更驱动缓存重建、给全集群发一次轻量控制事件。
- 前置：《配置中心》第 6 节（@RefreshScope 与动态刷新）必须先掌握——本篇解决的是"刷新怎么覆盖全部实例"，不重复讲刷新注解本身。

## 前置知识

- Spring Boot Actuator 端点的暴露配置（management.endpoints.web.exposure.include）；
- Spring AMQP 或 Spring Kafka 的基本概念（交换机/主题、队列、消费者组）；
- 《配置中心》整篇。

## 学习目标

- 理解 Bus 的事件广播模型：本机事件如何经消息代理扩散为集群事件；
- 会用 `/actuator/busrefresh` 一次刷新全部实例，并说清它与单实例 `/actuator/refresh` 的差别；
- 知道 @RefreshScope 在广播下的行为（每个实例各自销毁重建）；
- 能配置 binder、排查"刷新静默只生效一台"的典型事故。

## 1. 你现在要解决什么问题

《配置中心》篇的实验在单实例上成立：控制台改配置，curl 那台机器的 `/actuator/refresh`，值就变了。生产现场是另一回事：

```text
order-service 部署了 4 台（k8s 副本数 4）
控制台改了 order-service.yml 的超时阈值并发布
     |
     +-- 实例 A：重启了（碰巧在发布窗口滚动重建）-> 新值
     +-- 实例 B：没人记得刷 -> 旧值
     +-- 实例 C：有人 curl 刷了 -> 新值
     +-- 实例 D：没人记得刷 -> 旧值
结果：同一个配置，四台机器两种行为，问题复现概率随流量随机分布
```

配置漂移比没有配置中心更危险：它制造的是"偶发、难复现"的故障。Bus 的答案是把"刷新"从"单点动作"升级为"集群广播"。

## 2. 心智模型：一次刷新的广播旅程

```text
你 POST http://order-a:9001/actuator/busrefresh   （只打其中一台）
        |
        v
实例 A 发出 RefreshRemoteApplicationEvent 到消息代理
        |
        v
   RabbitMQ（spring-cloud-bus 交换机）
        |
        +---> 实例 A 收到 -> 销毁 @RefreshScope Bean -> 重新绑定配置
        +---> 实例 B 收到 -> 同上
        +---> 实例 C 收到 -> 同上
        +---> 实例 D 收到 -> 同上
```

关键认知有三条。第一，**你只请求了一台**，Bus 在本地处理完后把事件发到代理，其他实例作为消费者各自处理——"打一台、全生效"不是代理转发 HTTP，是事件广播。第二，`@RefreshScope` 的销毁重建发生在**每个实例各自**的上下文里：下次访问该 Bean 时重建、重新从配置中心拉值，各实例拉到的是同一份新配置，所以行为一致。第三，Bus 是通用事件管道，刷新只是内置事件之一（还有 busenv 等）；自定义远程事件也走这条管道，但那是进阶用法，生产上九成场景只用刷新广播。

## 3. 准备现场：单机 MQ + 双实例

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-bus-amqp</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  rabbitmq:
    host: localhost
    port: 5672
management:
  endpoints:
    web:
      exposure:
        include: health, busrefresh   # busrefresh 必须显式暴露
```

用 9001、9002 两个端口起同一应用的两个实例，都连上本地 RabbitMQ：

```bash
java -jar order-service.jar --server.port=9001
java -jar order-service.jar --server.port=9002
```

配置中心里放一个 `order.timeout: 100`，两个实例的接口各读一次确认旧值。然后**只对 9001** 执行：

```bash
curl -X POST http://localhost:9001/actuator/busrefresh
```

再查两个实例：都返回 300。这就是 Bus 的价值——一个请求，全集群生效。

**讲解：**

1. `spring-cloud-starter-bus-amqp` 是 binder 的实现选型：amqp 走 RabbitMQ，kafka 走 Kafka。binder 是可替换的传输层，业务代码与端点不变。
2. `busrefresh` 在 management 端点里默认不暴露，漏配时 curl 会得到 404——这是最容易踩的第一道坎（见第 6 节排错清单）。
3. 对照记忆：`/actuator/refresh` 刷新**本实例**（不广播）；`/actuator/busrefresh` 广播**全部实例**。二者名字相近、行为差一个数量级，写运维脚本时必须分清。

## 4. 与 030 单实例刷新的对照

| 维度 | `/actuator/refresh`（030 篇） | `/actuator/busrefresh`（本篇） |
| --- | --- | --- |
| 作用范围 | 收到请求的那个实例 | 订阅同一代理的全部实例 |
| 依赖 | 仅 Actuator | Actuator + 消息代理 + binder |
| 20 台实例改开关 | 循环 curl 20 次（或脚本） | curl 任意 1 次 |
| 失效模式 | 漏刷某台 -> 配置漂移 | 代理不可用 -> 广播中断（需监控） |
| 典型用途 | 本地调试、单机部署 | 生产多实例的标准姿势 |

两者不互斥：本地单实例开发用 refresh 足够；上了多实例，busrefresh 是底线。判断题"我该接 Bus 吗"——实例数大于 1 且配置会变，就该接。

## 5. 真实场景三则

**场景一：20 台实例的开关分批灰度刷新。** 营销系统要开一个新限流阈值，改动风险未知。直接全量 busrefresh 一旦阈值配置错了，20 台同时坏。工程做法：配置中心支持按实例标识（IP/实例名）下发不同配置分组时，先把 2 台标为灰度组改新值并单独 busrefresh；观察监控 30 分钟无异常，再对剩余实例广播。Bus 本身广播是全量的，"分批"靠**配置中心侧的分组**（Nacos 的 beta 配置或不同 dataId）实现——Bus 负责"一次动作全组生效"，分批粒度由配置分组决定。

**场景二：配置变更驱动本地缓存重建。** 商品服务把类目树缓存在本地（@RefreshScope 的 Bean 初始化时加载）。运营在控制台调整类目后，广播刷新让 8 台实例的类目缓存各自重建——不用写"清理缓存"接口，也不用重启。要点：缓存 Bean 必须真在 @RefreshScope 里，且重建逻辑幂等（广播事件可能重复投递，MQ 至少一次语义）。

**场景三：与监控配合观察刷新时延。** 广播发出后，各实例的重建完成时间不同（负载、GC 都会影响）。把"刷新事件到达"打点上报（Micrometer 计数器），在监控面板看各实例计数器跳变的时差——这就是《监控告警》篇说的"用指标验证运维动作"。某次演练发现实例 D 比其他台晚 40 秒，追查发现它连的是另一个 vhost——广播根本没到它那里，refresh 后它一直是旧值。没有这个打点，配置漂移要到故障才暴露。

## 6. 排错清单：刷新静默失效的三连现场

1. **curl 404**：busrefresh 端点没暴露。查 `management.endpoints.web.exposure.include` 是否含 busrefresh；k8s 环境还要确认 actuator 端口（management.server.port）没被网络策略拦。
2. **200 但只有本机生效**：binder 没配上——RabbitMQ 连不上时 Bus 会退化为本地处理，不报错、不广播。启动日志里找 `Application event RefreshRemoteApplicationEvent` 之外是否有连接告警；`spring.rabbitmq` 配置错 vhost/密码是高发区。**这就是"binder 依赖漏配导致刷新静默失效"**：curl 的那台变了，其他台永远不变，而接口返回 200。
3. **刷新了但 Bean 没变**：值消费方没用 @RefreshScope/@ConfigurationProperties。@Value 的局限在 030 第 6.1 节讲过——广播修不好注解用错。

## 7. 实验

在双实例现场完成闭环：

1. 制造漂移：改配置但只 curl 9001 的 `/actuator/refresh`，验证 9002 仍是旧值；
2. 修复漂移：改用 `/actuator/busrefresh`，验证 9002 生效；
3. 制造静默失效：把 `spring.rabbitmq.port` 改成 5673（连不上）重启，执行 busrefresh，观察"本机生效、广播丢失"且接口返回 200 的事故形态；
4. 恢复配置，确认广播恢复。

先自己操作，再对照参考流程：

<details>
<summary>实验参考流程</summary>

```bash
# 前置：本地 RabbitMQ 跑在 5672，两个实例 9001/9002，配置中心已有 order.timeout=100

# 1. 制造漂移：控制台改 order.timeout=300，只刷 9001 的单实例端点
curl -X POST http://localhost:9001/actuator/refresh
curl http://localhost:9001/timeout   # timeout=300
curl http://localhost:9002/timeout   # timeout=100  <- 漂移现场

# 2. 修复：改用广播端点（控制台先改回 300 之后的下一个值 500）
curl -X POST http://localhost:9001/actuator/busrefresh
curl http://localhost:9001/timeout   # timeout=500
curl http://localhost:9002/timeout   # timeout=500  <- 全实例一致

# 3. 静默失效：application.yml 临时改 spring.rabbitmq.port=5673，重启两实例
#    控制台改 order.timeout=600
curl -X POST http://localhost:9001/actuator/busrefresh   # HTTP 200
curl http://localhost:9001/timeout   # timeout=600（本机本地刷新）
curl http://localhost:9002/timeout   # timeout=500（广播丢失！）
#    启动日志可见 RabbitMQ 连接失败；busrefresh 返回 200 但事件没有出本机

# 4. 恢复 port=5673 -> 5672 重启，重做第 2 步验证恢复
```

观察点：第 3 步是本篇最重要的一次目击——"接口 200"与"全集群生效"之间没有必然联系，生产上必须靠第 5 节场景三的打点或 MQ 侧的消费者监控兜底。
</details>

## 8. 官方参考

- Spring Cloud Bus 官方文档：https://docs.spring.io/spring-cloud-bus/reference/ （快速启动、binder、端点说明）
- Spring Cloud Config 官方文档：https://docs.spring.io/spring-cloud-config/reference/

## 自检

1. `busrefresh` 与 `refresh` 的作用范围差别是什么？20 台实例各该在什么场景用哪个？
2. busrefresh 返回 200 但其他实例没生效，最可能的两个原因是什么？（提示：端点暴露、binder 连接）
3. @RefreshScope 的 Bean 在广播刷新后是"原地改值"还是"销毁重建"？这对缓存 Bean 意味着什么？
4. 为什么"分批灰度刷新"要靠配置中心的分组而不是 Bus 本身？
