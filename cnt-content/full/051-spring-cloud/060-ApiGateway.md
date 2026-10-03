---
order: 60
title: API 网关：把八个服务的横切逻辑收编成一扇门
description: 以「八个微服务各写一遍鉴权、限流、审计，改一次规则发八版，前端还得记八个域名」引入：门卫心智模型、WebFlux 响应式基座纪律、Route/Predicate/Filter 三概念主线、lb:// 与 StripPrefix 路由落地、GlobalFilter 网关层 JWT 校验，附 curl 路由实验与 404 排错。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/120-SpringSecurityJwt'
  - 'java/880-SpringCloudMicroserviceDevelopment'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-cloud/070-ResilienceSentinel'
  - 'spring-boot/120-SpringSecurityJwt'
---

## 前置知识

- [Spring Security 与 JWT](/spring-boot/120-SpringSecurityJwt)：知道「验签、从 token 里解析出用户身份」这回事——没读过也能跟，第 7 节现场补最小上下文；
- [Spring Cloud 微服务开发](/java/880-SpringCloudMicroserviceDevelopment)：知道单体为什么拆成多个服务——没读过也能跟，把每个服务当成「一个独立进程的 Spring Boot 应用」即可。

本模块 020 篇讲注册发现：第 5 节的 lb:// 路由要靠它把服务名翻译成地址——没读过也能跟，把注册中心想成「服务电话簿」即可。

## 学习目标

读完本文你将能够：

1. 列出网关收编的横切逻辑清单，并划出它的边界：什么该进网关，什么进网关就是腐烂的开始；
2. 解释网关为什么长在 WebFlux 响应式栈上，以及为什么引了 spring-boot-starter-web 的网关当场起不来；
3. 用 Route、Predicate、Filter 三概念读写一份路由配置，说清三者各自决策什么；
4. 配出 lb:// 服务名路由与 StripPrefix 去前缀，画出请求路径从网关到下游的变换；
5. 写一个 GlobalFilter 在网关层校验 JWT 并透传 X-User-Id，说出「下游只信网关」成立的安全前提。

预计 55 分钟。

## 1. 你现在要解决什么问题

订单、库存、账户、积分……八个服务上线了，然后你发现同一批横切逻辑在每个服务里各写了一遍：鉴权要引 jjwt、复制同一段过滤器代码；限流各配一份；CORS 八处配置、格式还各不相同；审计日志八份代码八种格式。更难受的是维护：鉴权规则改一个字段，八个服务各改一遍、各发一版，漏发一个就是线上事故。前端也不好过——八个服务八个域名，页面里散落八个 baseURL，跨域配置四处开花。病根是横切逻辑与业务逻辑长在了一起：**每个服务都要做、又与业务无关的事，不该由每个服务自己做**。解法是在所有服务前面立一道统一的门——API 网关：对外只暴露一个域名，横切逻辑在门上做一次，请求过了门再被指路（路由转发）到对应服务。本篇把这道门立起来。

## 2. 准备现场：一个订单服务与一个空网关

订单服务（8081 端口），一个最普通的接口，注意它预留了一个请求头参数，后面要用：

```java
@RestController
public class OrderController {

    @GetMapping("/order/{id}")
    public String getOrder(@PathVariable Long id,
                           @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return "订单 " + id + "，操作人：" + (userId == null ? "匿名" : userId);
    }
}
```

网关是另一个独立的 Spring Boot 模块，依赖只要一个 starter：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>
</dependency>
```

版本线索一句话：2025.0.x 起拆成 server-webflux 与 server-webmvc 两个 starter，本模块主线是前者（响应式）；旧的 spring-cloud-starter-gateway 名字保留兼容，旧教程见到不用慌。

顺手做个反面实验：此刻往网关模块加一个 spring-boot-starter-web（习惯性手滑，几乎人人中过），启动直接失败——

```text
***************************
APPLICATION FAILED TO START
***************************

Description:
Spring MVC found on classpath, which is incompatible with Spring Cloud Gateway.

Action:
Please remove spring-boot-starter-web dependency.
```

（报错为示意，不同小版本措辞略有出入，关键词是 Spring MVC found on classpath。）为什么两套栈不能共存，下一节讲透。

## 3. 门卫心智模型：网关做什么，更重要的它不做什么

小区门卫的五件事，逐条对应网关的职责：

| 门卫 | 网关职责 | 本篇位置 |
| --- | --- | --- |
| 统一入口 | 对外一个域名，八个服务藏在门内 | 第 1 节 |
| 身份核验 | 鉴权收口：验一次 token，全站有效 | 第 7 节 |
| 访客登记 | 审计日志：谁、何时、访问了什么 | 第 9 节实验 |
| 人流管控 | 限流：超出容量的请求挡在门外 | 070 篇 |
| 指路 | 路由转发：按规则送到对应服务 | 第 5、6 节 |

比「做什么」更重要的是「不做什么」：**网关只做横切与路由，不写业务**。判断标准一句话——「这个逻辑是不是每个进门请求都要走一遍、且与具体业务无关？」是，进网关；否，留在业务服务。把「满 100 减 20 的叠加规则」写进网关过滤器，网关就要跟着促销活动一起发版、一起背故障，八进八出的统一入口反过来成了全站的单点变更源——业务逻辑进网关，是架构腐烂的开始。门卫可以查证件，但不能替住户签字。

## 4. 基座事实：网关长在 WebFlux 上，事件循环线程一条都不能堵

为什么偏偏是响应式？看网关一天的工作量：收请求、查路由表、转发、回传响应——几乎没有计算，全是 I/O 等待（等下游返回）。Servlet 栈一请求占一线程，Tomcat 默认 200 线程；网关是全站流量入口，它的并发等于所有服务并发之和，用「一请求一线程」去接，高峰期 200 线程连自己都撑不住。

WebFlux 的底座是 Netty 事件循环：线程数约等于 CPU 核数（4 核机约 4 条），每条线程靠多路复用轮转处理成千上万个连接——等待下游时线程不空转也不占着，I/O 就绪才回来继续处理。吞吐极高，代价是一条铁律：**事件循环线程绝不允许被阻塞**。

推演一遍违规的后果。假设有人在网关过滤器里写了一个普通 JDBC 查询（阻塞约 100 毫秒）：4 条事件循环线程很快全部趴在等数据库返回上，后续所有请求在队列里排队——注意不是「变慢」，是整个网关瘫痪，八个服务全站不可达。一个 100 毫秒的同步 I/O，故障面积比它留在自己服务里大一百倍。所以网关代码的纪律是：要调外部就用 WebClient 等响应式客户端；绝不在过滤器链里写同步 I/O（JDBC、Thread.sleep、同步 HTTP）。

## 5. 三概念主线：Route、Predicate、Filter

网关的配置就三个词。Route（路由）是一条转发规则，由三部分组成：predicate 决定「什么请求走这条规则」，uri 决定「命中后转给谁」，filter 决定「路上怎么加工」。一份完整配置：

```yaml
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      server:
        webflux:                        # 2025.0.x 的配置命名空间
          routes:
            - id: order-route
              uri: lb://order-service
              predicates:
                - Path=/api/order/**
              filters:
                - StripPrefix=1
```

（旧命名空间 spring.cloud.gateway.routes 在 4.3.x 仍可用但已标记过时，以所用小版本官方文档为准。）

三个概念各自的决策，钉死：

- Predicate：这道请求归不归这条路由管——不匹配看下一条路由，全不匹配回 404；
- uri：命中之后转发到哪；
- Filter：转发前后做点什么加工（去前缀、加头、重试……第 8 节速览）。

先说 uri 的两种写法。写死 `uri: http://localhost:8081` 能跑，但多实例时永远只打一台。`lb://order-service` 的 lb 是 load balance：网关把服务名交给负载均衡器——050 篇的主角，同一套 Spring Cloud LoadBalancer——从注册中心查出实例列表、按策略挑一台。多实例自动分摊，服务上下线不用改网关一行配置。

再看 StripPrefix 的路径变换，这是网关接入最经典的场景：

```text
浏览器请求       GET /api/order/1001
StripPrefix=1   去掉第一段 /api
转发到           GET /order/1001    →  order-service
```

前端统一带 /api 前缀便于区分与鉴权，服务自己不想带这个前缀——中间这一刀由网关来切，双方各自保持舒服的形态。

路由还有第三种来源：代码式路由——声明 RouteLocator Bean 用 Java DSL 构建规则，适合规则本身需要程序计算的场合，知道即可，本篇主线是配置式。另一种「动态路由」更值得说清默认行为：开启注册中心的路由发现（spring.cloud.gateway.server.webflux.discovery.locator.enabled=true）后，网关按注册中心里的服务名自动生成路由，默认请求路径为 /服务名/**，新服务上线零配置即可被路由。代价是路径被服务名绑架、精细匹配无从谈起，生产上更常见仍是「显式配置 + lb://」，把自动发现当作本地开发的便利开关。

## 6. Predicate：这道请求归不归这条路由管

常用断言一表看完：

| Predicate | 示例 | 语义 |
| --- | --- | --- |
| Path | Path=/api/order/** | 路径通配匹配，最常用 |
| Method | Method=GET,POST | 限定 HTTP 方法 |
| Header | Header=X-Channel, mobile | 请求头存在且值匹配正则 |
| Query | Query=channel, vip | 参数存在且值匹配正则 |
| After / Before / Between | After=2026-11-11T00:00:00+08:00[Asia/Shanghai] | 时间开关：大促零点才开的通道 |

多条路由按配置顺序从上到下取第一条命中的——顺序就是优先级，精细规则放前面、兜底的放后面。断言怎么影响行为，第 9 节实验亲手制造一次 404。

## 7. Filter 两级与 GlobalFilter 实战：把鉴权收口到门上

过滤器分两级：路由级 filters（yml 里 routes 的 filters 列表）只作用于本条路由；GlobalFilter 作用于所有请求，没有匹配条件、全部必经。鉴权、审计这类横切逻辑，天然属于后者。

实战：把 120 篇里每个服务都要抄一遍的 JWT 过滤器，收编成网关上的一个 GlobalFilter（同一套 jjwt，签名一致才能验过）：

```java
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    private static final SecretKey KEY = Keys.hmacShaKeyFor(
            "this-is-a-demo-secret-key-32bytes-ok!".getBytes(StandardCharsets.UTF_8));

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        if (path.startsWith("/auth/")) {
            return chain.filter(exchange);                    // 登录接口本身放行
        }
        String auth = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }
        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(KEY).build()
                    .parseSignedClaims(auth.substring(7)).getPayload();
        } catch (JwtException e) {
            return unauthorized(exchange);                    // 过期、篡改、密钥不符
        }
        ServerHttpRequest downstream = exchange.getRequest().mutate()
                .header("X-User-Id", claims.getSubject())     // 身份透传给下游
                .build();
        return chain.filter(exchange.mutate().request(downstream).build());
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -10;        // 数值越小越先执行：鉴权要赶在业务过滤器前面
    }
}
```

下游从此不再引 jjwt，只读网关塞好的头（第 2 节的 X-User-Id 参数终于派上用场）：

```java
@RequestHeader("X-User-Id") String userId
```

这就是「鉴权收口」：验签逻辑一处维护，八个服务的鉴权代码整体删除。两个边界要钉死。第一，网关只收口「是不是登录用户」这类通用身份；「这个用户能不能操作这张订单」的资源级授权留在下游——只有业务服务自己知道资源归属。第二，「下游只信 X-User-Id 头」成立的前提是**网络隔离**：服务端口只对内网开放、且只有网关能访问（安全组、K8s NetworkPolicy），否则任何人绕过网关直连服务、伪造这个头，防线就整体失守。服务间互信的深水区归本模块 120 篇（统一认证）。

## 8. 内置过滤器速览

常用的就这几个，会查会用即可，不必背：

| 过滤器 | 干什么 | 典型场景 |
| --- | --- | --- |
| StripPrefix=N | 去掉路径前 N 段 | 统一 /api 前缀接进来 |
| PrefixPath=/xxx | 补统一前缀 | 上游路径干净、下游有前缀 |
| AddRequestHeader | 给下游加请求头 | 标注流量来源、灰度标记 |
| AddResponseHeader | 给响应加头 | 调试标记、自定义响应头 |
| Retry | 下游失败时按配置重试 | 网关重试同样要幂等纪律 |

Retry 那一格值得加粗读三遍：非幂等请求被网关重试一次，就是多发一个订单；而网关位于全站入口，它的重试放大效应也全站最大——幂等纪律（110 篇深挖）是启用重试的前提。

## 9. 实验：一条路由从 404 到打通

网关配 server.port: 9000，先配上第 5 节的路由但 uri 用写死的直连版 `http://localhost:8081`。保持订单服务运行，三连打出去：

```bash
curl http://localhost:8081/order/1001
curl http://localhost:9000/api/order/1001
curl -H "Authorization: Bearer <粘贴一个 120 篇签发的 token>" \
     http://localhost:9000/api/order/1001
```

```text
# 第一条（直连，绕过门卫）
订单 1001，操作人：匿名
# 第二条（走网关、不带 token）——HTTP 401，无证访客被拦在门外
# 第三条（走网关、带 token）
订单 1001，操作人：1001          （以你 token 的 subject 为准）
```

第二条与第三条的差别就是「身份核验收口」：订单服务自己没验任何东西，身份由门卫核实后递了进来。

改 predicate 制造 404：把 Path=/api/order/** 改成 Path=/api/orders/**（复数），再请求：

```text
{"timestamp":"...","path":"/api/order/1001","status":404,"error":"Not Found"}
```

网关找不到命中的路由直接回 404——排障口诀：先查请求路径拼写，再查路由配置顺序。

最后补上「访客登记」。加一个记录型全局过滤器：

```java
@Component
public class AccessLogGlobalFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long start = System.currentTimeMillis();
        return chain.filter(exchange).then(Mono.fromRunnable(() ->
                System.out.println(exchange.getRequest().getMethod() + " "
                        + exchange.getRequest().getPath().value() + " -> "
                        + exchange.getResponse().getStatusCode()
                        + " (" + (System.currentTimeMillis() - start) + " ms)")));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;    // 最后执行，才有完整状态码可记
    }
}
```

每条请求过门都留一行登记：方法、路径、结果、耗时。把 uri 换回 lb://order-service 并起注册中心（020 篇的环境），多起一个订单实例，观察请求交替落到两台——门卫指路，指的从来不是固定某一户。

## 10. 旧路标与官方参考

- 旧教程路标：Netflix Zuul 1.x 是 Servlet 阻塞 I/O 模型（一请求一线程），已被基于响应式的 Spring Cloud Gateway 取代——旧资料见到 Zuul，一律换算成 Gateway 概念再读；
- Spring Cloud Gateway 官方文档：https://docs.spring.io/spring-cloud-gateway/reference/
- 路由断言与过滤器的完整清单、配置键的命名空间迁移，以所用小版本官方文档为准。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 网关模块为什么不能引 spring-boot-starter-web？违规的后果是启动失败还是运行变慢？
2. 门卫五件事各对应网关什么职责？「满减规则该不该写进网关过滤器」用哪条判断标准裁决？
3. 有人在网关过滤器里写了一个同步 JDBC 查询，为什么可能拖垮整个网关？推演一遍事件循环线程被占满的过程。
4. Route 的三要素各自决策什么？三条路由都匹配同一个请求时听谁的？
5. lb://order-service 里的 lb 让网关多做了一步什么？对比写死 http://localhost:8081 换来了什么？
6. /api/order/1001 经 StripPrefix=1 后下游收到的路径是什么？PrefixPath 与它是镜像关系吗？
7. 网关校验 JWT 后为什么透传 X-User-Id 而不是让下游各自再解析？这个头可以被伪造吗，靠什么堵住？
8. 网关层 Retry 过滤器启用前必须先落实什么纪律？为什么网关重试比服务内部重试更危险？
