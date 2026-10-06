---
order: 170
title: 服务间 HTTP 调用：RestClient
description: Spring Boot 3.2+ RestClient 同步客户端：链式 API、超时与连接池配置、onStatus 错误统一转换、RestTemplate 迁移对照、MockRestServiceServer 测试，附支付查询、天气 API 重试、服务间查用户三例
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/060-SpringMvcRestApi'
  - 'spring-boot/070-UnifiedResponseExceptionHandling'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-boot/170-TestingStrategy'
  - 'spring-boot/190-CapstoneBlogApi'
---

## 前置知识

- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：知道一方是「被调」就够——本篇讲「调别人」；
- [统一响应与异常处理](/spring-boot/070-UnifiedResponseExceptionHandling)：全局异常 Advice 的写法，本篇的错误转换最终汇入它。

## 学习目标

读完本文你将能够：

1. 用 RestClient（Boot 3.2+ 推荐的同步客户端）完成 GET/POST 调用并把响应体反序列化成对象；
2. 配置连接与读超时，说清「默认无超时」如何演变成线程池占满的全服务雪崩；
3. 用 onStatus 把下游错误统一转成业务异常，汇入全局异常处理；
4. 把 RestTemplate 代码逐行对照迁移到 RestClient；
5. 用 MockRestServiceServer 在不起真实下游的情况下测试调用方逻辑。

预计 40 分钟。

## 1. 你现在要解决什么问题

博客项目做支付：用户点「查询支付结果」，后端要调第三方支付的接口。这一调引入了一整类新问题：第三方接口慢到 30 秒怎么办（你的 Tomcat 线程正被它吊着）？返回 500 时你的接口给用户什么响应？测试时总不能真调第三方？[Spring MVC](/spring-boot/060-SpringMvcRestApi) 篇讲的是「别人调你」，本篇讲「你调别人」——服务间与第三方 HTTP 调用是微服务的日常，也是雪崩链条的第一环。

## 2. RestClient：Boot 3.2+ 的同步客户端

RestClient 是 Spring Framework 6.1 / Spring Boot 3.2 引入的同步 HTTP 客户端，定位是「RestTemplate 的现代替代」：链式 API、复用 [Spring MVC](/spring-boot/060-SpringMvcRestApi) 篇的消息转换器做 JSON 互转、错误处理可声明。老项目大量存在的 RestTemplate 处于维护模式（不再新增功能），新代码一律用 RestClient。

```java
@Component
public class PayClient {

    private final RestClient rest;

    public PayClient(RestClient.Builder builder) {
        this.rest = builder
                .baseUrl("https://pay.example.com/api")
                .build();
    }

    public PayStatus query(String orderNo) {
        return rest.get()
                .uri("/orders/{no}/status", orderNo)     // 路径参数占位，自动 URL 编码
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()                              // 进入"取响应"阶段
                .body(PayStatus.class);                  // 消息转换器反序列化
    }
}
```

Boot 会自动装配一个配置好消息转换器的 `RestClient.Builder` Bean，注入它再补充 baseUrl 等个性化配置——与 [IoC](/spring-boot/030-IoCDependencyInjection) 篇的组装习惯一致。`body(PayStatus.class)` 底层就是 Jackson，第三方返回的 JSON 字段名与你的 record 对不上时，用 `@JsonProperty` 映射，不要为了迁就第三方命名污染自己的领域模型。

POST 调用同理，`body(obj)` 传请求体：

```java
public PayStatus createOrder(CreatePayCmd cmd) {
    return rest.post()
            .uri("/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .body(cmd)                                   // 序列化为 JSON 请求体
            .retrieve()
            .body(PayStatus.class);
}
```

## 3. 超时：默认值是事故

### 3.1 为什么默认无超时是生产事故高发点

RestClient 的底层工厂默认**连接与读超时均为无限**。推理一下事故链：第三方支付变慢（网络抖动，不罕见）→ 每个查询请求挂 60 秒不返回 → Tomcat 200 个工作线程全部被挂住的调用占满 → **你自己服务的所有接口**（包括与支付无关的）全部无线程可用 → 整站不可用。这就是「下游一点小病，上游全服躺平」的雪崩——起因只是一个没设的超时。

配置方式（显式指定工厂与超时，版本间最稳的写法）：

```java
@Bean
RestClient payRestClient(RestClient.Builder builder) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(2000);   // 建连超时 2s
    factory.setReadTimeout(5000);      // 等响应超时 5s
    return builder
            .baseUrl("https://pay.example.com/api")
            .requestFactory(factory)
            .build();
}
```

两个数字的含义：connectTimeout 是「TCP 握手要多久」（对方不可达时快速失败），readTimeout 是「发出请求后等多久数据」（对方慢时快速失败）。取值经验：内网服务间调用各 1 到 3 秒；第三方接口按其 SLA 的 P99 上浮 50%。超时的正确姿势是**宁可快速失败再走重试/降级，也不要无限等**——用户等 30 秒与等 2 秒后看到「稍后再试」，是两种产品体验。

### 3.2 连接池：高并发下的第二道配置

SimpleClientHttpRequestFactory 每次请求新建连接，并发高时握手开销显著。生产高并发场景换用带连接池的工厂（classpath 引入 Apache HttpClient 5 后，Boot 默认就会选用它）：

```java
var pool = PoolingHttpClientConnectionManagerBuilder.create()
        .setMaxConnTotal(100)          // 总连接上限
        .setMaxConnPerRoute(50)        // 单个主机上限（防止单一下游占满）
        .build();
var factory = ApacheHttpComponentsClientHttpRequestFactory.forHttpClient(
        HttpClients.custom().setConnectionManager(pool).build());
```

「连接池被单一下游占满」是排障冷知识：服务同时调支付与短信两个下游，不给 per-route 上限时，短信接口变慢会把 100 个连接全部占住，支付调用排队——配置上 MaxConnPerRoute 才有故障隔离。

## 4. 错误处理：onStatus 与统一转换

`retrieve()` 默认对 4xx/5xx 抛异常（HttpClientErrorException/HttpServerErrorException），不接就是 500。第三方「订单不存在」返回 404 是**预期内业务分支**，把它转成业务异常再交给[全局异常处理](/spring-boot/070-UnifiedResponseExceptionHandling)：

```java
public PayStatus query(String orderNo) {
    return rest.get()
            .uri("/orders/{no}/status", orderNo)
            .retrieve()
            .onStatus(status -> status.value() == 404, (req, res) -> {
                throw new PayOrderNotFoundException(orderNo);
            })
            .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                throw new PayServiceUnavailableException();
            })
            .body(PayStatus.class);
}
```

onStatus 的第二个参数是响应处理器——可以抛异常（推荐，统一走 Advice），也可以读响应体提取第三方错误码后抛带上下文的异常。需要完全接管（读流、记原始报文、自定义反序列化）时用 `exchange()` 替代 `retrieve()`：它把 HttpClientResponse 交给你，但**必须自己关闭响应流**——retrieve 帮你管理资源，exchange 给你自由与责任，一般错误处理用不到它。

## 5. RestTemplate 迁移对照

老代码的 RestTemplate 可以按表逐行迁移：

| RestTemplate | RestClient |
| --- | --- |
| `restTemplate.getForObject(url, PayStatus.class)` | `rest.get().uri(url).retrieve().body(PayStatus.class)` |
| `restTemplate.postForObject(url, cmd, PayStatus.class)` | `rest.post().uri(url).body(cmd).retrieve().body(PayStatus.class)` |
| `restTemplate.exchange(url, GET, entity, PayStatus.class)` | `rest.get().uri(url).headers(h -> h.addAll(entity.getHeaders())).retrieve().body(PayStatus.class)` |
| 默认抛 RestClientException 系列 | 默认抛同名子类（HttpClientErrorException 等），catch 兼容 |
| 无链式、错误处理要靠拦截器 | onStatus 声明式错误分支 |

迁移的收益不在「能跑」而在结构：链式 API 让 URI、头、体、错误分支各归各位，超时配置集中在 builder——RestTemplate 时代散在各调用点的 setConnectTimeout 迁移后收拢成一处。

## 6. 测试：MockRestServiceServer

调用方逻辑的测试不应该依赖真实下游。Spring Boot 的 `@RestClientTest` 切出「只测这个客户端」的切片，并自动装配 MockRestServiceServer：

```java
@RestClientTest(PayClient.class)
class PayClientTest {

    @Autowired
    PayClient payClient;

    @Autowired
    MockRestServiceServer server;

    @Test
    void 查询返回已支付() {
        server.expect(requestTo("https://pay.example.com/api/orders/A001/status"))
              .andRespond(withSuccess("""
                      {"orderNo":"A001","status":"PAID"}
                      """, MediaType.APPLICATION_JSON));

        PayStatus status = payClient.query("A001");

        assertThat(status.status()).isEqualTo("PAID");
        server.verify();   // 断言预期的请求确实发出
    }

    @Test
    void 下游404转业务异常() {
        server.expect(requestTo("https://pay.example.com/api/orders/X/status"))
              .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> payClient.query("X"))
                .isInstanceOf(PayOrderNotFoundException.class);
    }
}
```

两个用例各测一条分支：正常反序列化（JSON 字符串块直接当响应体）与 onStatus 的异常转换。`server.verify()` 确认「发过的请求与预期一致」——URL、方法不匹配会直接失败，把「调用方到底发了什么」钉死在测试里。测试策略的完整分层（单元/切片/集成）见[测试策略](/spring-boot/170-TestingStrategy)篇，@RestClientTest 是其中的切片测试成员。

## 7. 重试策略：何时敢重试

第三方接口偶发超时，盲目重试与从不重试都不对。判断标准一句话：**只有幂等操作才敢自动重试**。

- 支付结果**查询**（GET）：天然幂等，可重试 2 到 3 次，间隔递增（如 200ms、1s）；
- 短信发送、天气查询：可重试（最坏情况多发一条短信/多查一次）；
- 支付**下单**（POST）：不幂等，盲目重试可能创建两笔订单——重试的前提是先给协议加幂等键（客户端生成 requestNo，服务端去重），没有幂等键就只降级不重试。

```java
public PayStatus queryWithRetry(String orderNo) {
    RuntimeException last = null;
    for (int attempt = 1; attempt <= 3; attempt++) {
        try {
            return payClient.query(orderNo);
        } catch (ResourceAccessException e) {        // 超时与连接异常
            last = e;
            try {
                Thread.sleep(200L * attempt * attempt);   // 200ms、800ms、1800ms 递增
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new PayServiceUnavailableException();
            }
        }
    }
    throw new PayServiceUnavailableException();
}
```

手写循环适合一两个调用点；调用点一多换 Spring Retry 的 @Retryable 注解集中管理。注意区分两类异常的语义：超时（ResourceAccessException）时**请求可能已被对方处理**，重试前先想幂等；明确的连接拒绝（对方没收到）重试则无此顾虑。

## 8. 动手实践

**任务一：支付查询客户端。** 实现 PayClient：查询接口 + 404 转业务异常 + 2s/5s 超时 + MockRestServiceServer 两个用例。提示：record PayStatus(String orderNo, String status)；把超时配置放进 @Bean 的 builder，让测试也走同一配置。

**任务二：天气 API 重试。** 调一个天气接口（可 mock），要求：网络异常时最多重试 2 次、间隔递增，仍失败返回缓存的「上一次成功天气」。提示：重试逻辑与「取缓存」是两个决策——重试耗尽后才看缓存；缓存用一个带时间戳的字段即可，不必引入 Redis（缓存体系见 130 篇）。

**任务三：博客的用户服务前瞻。** 假设把 [Capstone 博客 API](/spring-boot/190-CapstoneBlogApi) 的用户模块拆成独立服务，写 UserClient 供文章服务调用：`GET /api/users/{id}` 查作者昵称，带超时与 404 处理；文章列表接口要批量查 20 个作者的昵称，思考逐个调用与批量接口的取舍。提示：逐个调用 20 次的延迟是 20 倍——N+1 问题在服务间调用同样存在（数据访问层的 N+1 见 [Spring Data JPA](/spring-boot/090-SpringDataJpa) 篇），答案是给下游提供批量接口。

先自己写，再对照参考实现（任务一）：

<details>
<summary>任务一参考实现（PayClient 全套）</summary>

```java
// record 与业务异常
public record PayStatus(String orderNo, String status) {}
public class PayOrderNotFoundException extends RuntimeException {
    public PayOrderNotFoundException(String orderNo) { super("支付单不存在: " + orderNo); }
}
```

```java
@Configuration
public class PayClientConfig {

    @Bean
    RestClient payRestClient(RestClient.Builder builder) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        return builder.baseUrl("https://pay.example.com/api")
                      .requestFactory(factory)
                      .build();
    }
}

@Component
public class PayClient {

    private final RestClient rest;

    public PayClient(RestClient payRestClient) { this.rest = payRestClient; }

    public PayStatus query(String orderNo) {
        return rest.get()
                .uri("/orders/{no}/status", orderNo)
                .retrieve()
                .onStatus(s -> s.value() == 404, (req, res) -> {
                    throw new PayOrderNotFoundException(orderNo);
                })
                .body(PayStatus.class);
    }
}
```

```java
@RestClientTest(PayClient.class)
class PayClientTest {

    @Autowired PayClient payClient;
    @Autowired MockRestServiceServer server;

    @Test
    void 正常查询() {
        server.expect(requestTo("https://pay.example.com/api/orders/A001/status"))
              .andRespond(withSuccess("{\"orderNo\":\"A001\",\"status\":\"PAID\"}",
                                       MediaType.APPLICATION_JSON));
        assertThat(payClient.query("A001").status()).isEqualTo("PAID");
        server.verify();
    }

    @Test
    void 不存在转业务异常() {
        server.expect(requestTo("https://pay.example.com/api/orders/NOPE/status"))
              .andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> payClient.query("NOPE"))
                .isInstanceOf(PayOrderNotFoundException.class);
    }
}
```

验收点：测试类不需要起端口与 Spring 上下文全量（@RestClientTest 是切片）；@Autowired 注入的是 PayClient 本身而不是 Builder——切片替你完成了 builder 到实例的装配；把 baseUrl 改错一个字母，两个用例都会因 requestTo 不匹配而失败——server.verify 与 expect 的 URL 匹配把「客户端发出的真实请求」纳入了断言范围。
</details>

## 9. 小结

- RestClient 是 Boot 3.2+ 的同步调用标准，注入 RestClient.Builder 配 baseUrl，retrieve().body() 完成取响应与反序列化；
- 默认无超时是雪崩第一环：connectTimeout + readTimeout 必设，高并发加连接池与 per-route 上限做故障隔离；
- onStatus 把下游 4xx/5xx 转成业务异常汇入全局 Advice，exchange 是资源自管的全接管逃生门；
- RestTemplate 按「getForObject → get().uri().retrieve().body()」对照迁移，异常类名保持兼容；
- @RestClientTest + MockRestServiceServer 让调用方测试不依赖真实下游；
- 重试只给幂等操作：查询可试、下单先加幂等键，超时与连接拒绝的语义不同。

## 10. 相关阅读

- 错误最终汇入的统一响应体系：[统一响应与异常处理](/spring-boot/070-UnifiedResponseExceptionHandling)
- 切片测试在测试金字塔中的位置：[测试策略](/spring-boot/170-TestingStrategy)
- 服务间调用的声明式与治理版（负载均衡、熔断、追踪）：[OpenFeign 声明式调用](/spring-cloud/040-OpenfeignDeclarativeCalls)与[熔断限流](/spring-cloud/070-ResilienceSentinel)
