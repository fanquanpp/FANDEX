---
order: 20
title: 服务注册与发现：IP 会漂的服务，怎么找到彼此
description: 以「库存 3 个实例还自动扩缩、写死 IP 的配置地狱」引入：电话簿四动词心智模型、临时与持久实例的健康检查分野、命名空间隔离与 AP 优先的格局，附 kill 实例观察剔除与调用方报错的实验。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-cloud/010-FromMonolithToMicroservices'
  - 'spring-boot/060-SpringMvcRestApi'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-cloud/030-ConfigCenter'
  - 'spring-cloud/040-OpenfeignDeclarativeCalls'
  - 'spring-cloud/070-ResilienceSentinel'
---

## 前置知识

- 已读 [从单体到微服务](/spring-cloud/010-FromMonolithToMicroservices)：知道本模块为什么拆、按什么原则拆，没读过也能跟；
- 会用 [Spring MVC REST API](/spring-boot/060-SpringMvcRestApi) 写一个简单的 GET 接口：本篇两个服务各带一个接口，没写过也能照抄。

## 学习目标

读完本文你将能够：

1. 说出写死 IP 在「多实例 + 自动扩缩」下翻车的四种方式；
2. 用电话簿的四个动词（登记、报平安、查号、销号）对应注册中心的四个机制；
3. 分清客户端发现与服务端发现，说出 Spring Cloud 主流站在哪边、挑选实例的责任交给了谁；
4. 说出临时实例与持久实例在探活与剔除上的差别，并给出选型；
5. 本地用 Docker 起一个 Nacos，注册两个服务，亲手制造一次「实例消失、调用报错」。

预计 40 分钟，需要 Docker 与多个终端。

## 1. 你现在要解决什么问题

订单服务要调库存服务。库存 1.0 时代只有一个实例，订单的配置文件里写死一行 http://10.0.0.12:9002，天下太平。1.1 时代为了扛大促，库存扩到 3 个实例并接入了自动扩缩容：流量高峰自动加实例，低谷自动回收，容器的 IP 每次重启都会漂。于是写死 IP 变成了配置地狱，四种翻车方式轮番上演：某台实例下线了，写死它的调用方持续报连接失败，直到有人手动改配置再重启一轮；扩容出来的新实例干瞪眼——没有任何调用方知道它存在；IP 清单在几个服务里各存一份，谁都不敢先改，改漏一行故障随缘出现。缺的东西是一本**自动更新的电话簿**：服务上线自动登记，失联自动销号，调用方随时查到最新名单。这就是注册中心（Registry Center）的全部动机。

## 2. 准备现场：本地起一个注册中心

Docker 单机模式起步（镜像 tag 以官方仓库为准，Nacos 2.x/3.x 均可）：

```bash
docker run -d --name nacos-standalone \
  -e MODE=standalone \
  -p 8848:8848 -p 9848:9848 \
  nacos/nacos-server:v2.4.3
```

三个要点：

- 8848 是主端口：控制台与 HTTP API；
- 9848 是 gRPC 端口（主端口加 1000）：2.x 起客户端走 gRPC 长连接，这个端口不通服务永远注册不上——防火墙漏放行 9848 是 Nacos 排错榜第一名；
- 控制台地址 http://localhost:8848/nacos（3.x 起控制台默认改用独立端口，以官方文档为准；默认账号密码 nacos/nacos，以你部署版本的配置为准）。

两个最小 Boot 服务，各自只要 web 与 discovery 两个依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

版本号不写，交给 spring-cloud-alibaba-dependencies 的 BOM 统一管理；它与 Spring Cloud 2025.0.x 的版本对应关系，见官方 wiki 版本说明。库存服务带一个最简单的接口：

```java
package com.example.stock.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StockController {

    @Value("${server.port}")
    private int port;   // 用端口区分实例，本篇实验全靠它认人

    @GetMapping("/api/stock/{skuId}")
    public String detail(@PathVariable("skuId") Long skuId) {
        return "stock ok, instance port=" + port;
    }
}
```

## 3. 心智模型：一本会自动更新的电话簿

### 3.1 四个动词

注册中心的全部机制，用人事电话簿的四个动作就能讲完：

| 动词 | 电话簿里的动作 | 注册中心的机制 |
| --- | --- | --- |
| 登记 | 新员工入职，把工位电话写进通讯录 | 服务启动时把「服务名 + IP + 端口」上报（注册） |
| 报平安 | 每天打卡，证明人还在 | 客户端与注册中心维持心跳或长连接（健康检查） |
| 查号 | 打电话前翻出最新号码 | 调用方按服务名拉取实例列表（服务发现） |
| 销号 | 员工离职，从通讯录划掉 | 失联实例被标记不健康直至剔除 |

两个细节值得停一下。其一，注册与发现都以**服务名**为键，调用方从头到尾不接触 IP——写死 IP 的配置地狱被「名字」这一个抽象整体消灭。其二，「报平安」的形式随版本演进：Nacos 1.x 靠客户端定时心跳（默认 5 秒一次，15 秒没收到标记不健康，30 秒剔除）；2.x 起客户端与服务端保持 gRPC 长连接，**连接断开服务端立刻感知**，剔除从 30 秒量级变成秒级。

### 3.2 客户端发现与服务端发现

「查号」发生在谁身上，是两种架构的分野：

- **服务端发现**：调用方打一个稳定的中间入口（Nginx、Kubernetes Service 这类），由它查列表并转发。调用方最省事，但多一跳网络，中间设备成了集中管控点；
- **客户端发现**：调用方自己拉实例列表、自己挑一个直连。少一跳，客户端还能按自己的策略挑（权重、同机房优先），代价是每个语言栈都要有一套客户端逻辑。

Spring Cloud 的主流是**客户端发现**。调用方拉到列表之后怎么「挑」，是 050 篇负载均衡的正题——这里先立住分工：**发现归注册中心，挑选归负载均衡器**。

## 4. 接入：两个服务搬进电话簿

各自在 application.yml 里声明名字与注册中心地址：

```yaml
# stock-service 的 application.yml
spring:
  application:
    name: stock-service          # 电话簿里的名字，调用方按它查号
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
server:
  port: 9002
```

order-service 同理，name 换成 order-service，端口 9001。老教程会让你在启动类加 @EnableDiscoveryClient——现在不加也生效（自动装配），加了也不报错，属于旧路标级别的仪式，知道即可。

启动两个服务后，控制台「服务管理 → 服务列表」能看到两个服务；点进 stock-service 的实例详情，IP、端口、健康状态一目了然。再起一个库存实例（端口 9003）验证多实例登记：

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=9003
```

订单侧用 Spring Cloud 通用的 DiscoveryClient 亲自「查号」：

```java
package com.example.order.web;

import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class LookupController {

    private final DiscoveryClient discoveryClient;

    public LookupController(DiscoveryClient discoveryClient) {
        this.discoveryClient = discoveryClient;
    }

    @GetMapping("/lookup/stock")
    public List<String> lookup() {
        return discoveryClient.getInstances("stock-service").stream()
                .map(ServiceInstance::getUri)
                .toList();
    }
}
```

```bash
curl http://localhost:9001/lookup/stock
["http://192.168.1.5:9002", "http://192.168.1.6:9003"]
```

返回里是两个健康实例的地址——调用方此刻已经握着「随时可查的最新名单」。至于怎么从名单里挑一个、怎么真正发起调用，归 050 与 040 两篇。

## 5. 心跳与健康检查：临时实例与持久实例

Nacos 把实例分成两类，探活方式完全不同：

| 维度 | 临时实例（默认） | 持久实例 |
| --- | --- | --- |
| 谁探活 | 客户端报平安：心跳或长连接保活 | 服务端主动探测（TCP/HTTP 探针） |
| 失联处理 | 断联即标记，秒级剔除（2.x 长连接） | 标记不健康但**不剔除**，恢复后自动转回 |
| 典型对象 | 应用服务：会启动、会宕机、会扩缩 | 数据库、第三方中间件这类「不会心跳的稳定存在」 |
| 一致性模型 | AP | CP |

选型一句话：**应用服务一律临时实例**——它死了就该从名单里消失；「不会主动报平安」的第三方才登记为持久实例（ephemeral 设为 false，通常经控制台或 API 登记，让服务端主动探测）。

还有一层保底思想：保护阈值（控制台里 0 到 1 的小数）。当健康实例比例跌破阈值（比如网络抖动导致大面积误判），Nacos 宁可把不健康实例也返回给调用方，也不让列表清空——打到半死的服务通常仍好过无处可打。这是自我保护思想，细节与调参以官方文档为准。

## 6. 环境隔离：命名空间与分组

两层隔离沿用电话簿的比喻：**命名空间**（namespace）是把整本电话簿复印成 dev、test、prod 几本物理隔离的册子；**分组**（group，默认 DEFAULT_GROUP）是同一本册子里按团队或产品线分的逻辑分区。配置都在 spring.cloud.nacos.discovery 下：

```yaml
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        namespace: dev        # 控制台里预先创建的命名空间 ID，不是名称
        group: TRADE_GROUP    # 不填走 DEFAULT_GROUP
```

排错现场：dev 环境的订单查不到库存。按三步走——第一步核对 namespace 是否一致，最常见的坑是拿「命名空间名称」当 ID 填了，控制台里 ID 要单独复制；第二步核对 group，一边默认组一边自建组等于住进不同分区；第三步核对服务名拼写。控制台对应命名空间里的服务列表是最终事实：列表里没有，任何调用方式都救不了。

## 7. 实验：kill 掉一个实例，看电话簿的反应

三个终端：Nacos 已起，库存 9002、9003 双实例，订单 9001。

```bash
# 第一步：确认名单
curl http://localhost:9001/lookup/stock
# ["http://...:9002", "http://...:9003"]

# 第二步：直接 kill 9003 的进程（模拟宕机，不是优雅停机）
# Linux/macOS: kill -9 <pid>；Windows: taskkill /F /PID <pid>

# 第三步：几秒后再查
curl http://localhost:9001/lookup/stock
# ["http://...:9002"]
```

预期：控制台里 9003 的实例几秒内消失（2.x 长连接断开即感知），订单侧列表同步缩短。此刻若真按旧列表向 9003 发起调用，会得到连接被拒绝——**调用方缓存的旧列表与实例突然死亡之间存在时间差，这就是线上「部分请求失败」的经典来源**；怎么让失败不外溢，是 070 篇容错的引子，这里先留下这个坑。

顺带一句优雅上下线：kill 是最粗暴的下线方式，正确思路是下线前先摘流——把实例从列表标记下线或权重置零，等在途请求跑完再停进程。完整姿势归部署运维话题，先记住「先摘流、后停进程」六个字。

## 8. CAP 一句话：注册中心为什么选 AP

分布式理论里的 CAP 告诉我们：网络分区发生时，一致性与可用性不可兼得。注册中心的正确取舍是 **AP（可用性优先）**：分区发生时，宁可返回一份可能过时的实例列表，也不能让整本电话簿拒绝服务——列表旧一秒，最多让个别请求打到死实例；电话簿整体不可用，所有服务互相找不到，全站瘫痪。过时列表的残余风险，还有调用方本地缓存与 070 篇的容错兜底。

| 注册中心 | 取舍 | 一句话 |
| --- | --- | --- |
| Eureka | AP | 对等复制加自我保护；2.x 官宣不再开源，1.x 维护中 |
| ZooKeeper | CP | 分区时少数派拒绝服务换一致性 |
| Nacos | 双模 | 临时实例 AP（Distro 协议），持久实例 CP（Raft），与第 5 节分野呼应 |

旧路标一句话收束：Eureka 2.x 开源停更后，国内新项目的主流注册中心已换成 Nacos；老教程里配合发现的 Ribbon（客户端负载均衡）已退役，继任者是 Spring Cloud LoadBalancer，050 篇展开。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 写死 IP 的四种翻车方式，分别被电话簿四个动词里的哪一个解决？
2. 四个动词各对应什么机制？Nacos 1.x 与 2.x 在「报平安」上的机制差异，对剔除速度的影响量级是多少？
3. 客户端发现与服务端发现的分野是什么？Spring Cloud 站在哪边，「挑实例」的责任交给了谁、归哪一篇？
4. 临时实例与持久实例在「失联之后做什么」上有什么本质区别？为什么应用服务不该配成持久实例？
5. 保护阈值防的是哪种事故？它的取舍用一句话说是什么？
6. 配错 namespace 时为什么「启动不报错但就是查不到」？三步排查的顺序是什么，namespace 填 ID 还是名称？
7. 注册中心为什么选 AP？「返回过时列表」的残余风险由哪两层机制兜底？

