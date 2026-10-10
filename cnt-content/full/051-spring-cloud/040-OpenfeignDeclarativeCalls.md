---
order: 50
title: OpenFeign 声明式调用：把远程调用写成一行接口
description: 以「RestTemplate 五段式样板在 30 个调用点重复」引入：@FeignClient 接口与动态代理的心智模型、name 与 url 两条寻址路、NEVER_RETRY 背后的幂等纪律、fallback 兜底与 FULL 日志调试，附调通、超时与日志实验。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-cloud/020-ServiceRegistrationDiscovery'
  - 'spring-boot/060-SpringMvcRestApi'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-cloud/050-LoadBalancingRetry'
  - 'spring-cloud/060-ApiGateway'
  - 'spring-cloud/070-ResilienceSentinel'
---

## 前置知识

- 已完成 [服务注册与发现](/spring-cloud/020-ServiceRegistrationDiscovery)：Nacos 里有两个注册好的服务，本篇直接复用 020 的 order-service 与 stock-service；
- 会用 [Spring MVC REST API](/spring-boot/060-SpringMvcRestApi) 写带路径变量与请求体的接口——Feign 的注解与它同形。

## 学习目标

读完本文你将能够：

1. 说出 RestTemplate 手工调用的五段式样板分别是什么，Feign 各用什么机制吃掉它们；
2. 用「写接口，框架生成实现」解释 @FeignClient 的工作方式，说清它与 Spring AOP 代理的同源性；
3. 分清 @FeignClient 的 name 与 url 各走哪条寻址路；
4. 背出超时两级配置与「默认不重试」的设计意图，说出重试与幂等为什么必须成对讨论；
5. 开 FULL 日志定位一次真实的请求细节，并完成一次超时实验与一次 404 排查。

预计 40 分钟，需要两个服务与 Docker 里的 Nacos。

## 1. 你现在要解决什么问题

订单服务要调库存服务的扣减接口。没有趁手工具时，用 RestTemplate 手工发起远程调用长这样：

```java
public DeductResult deduct(DeductRequest request) throws Exception {
    // 第一段：拼 URL——服务地址硬编码，注册中心形同虚设
    String url = "http://10.0.0.12:9002/api/stock/deduct";
    // 第二段：序列化——把请求对象变成 JSON
    String body = objectMapper.writeValueAsString(request);
    // 第三段：发请求
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> resp = restTemplate.postForEntity(
            url, new HttpEntity<>(body, headers), String.class);
    // 第四段：判状态码
    if (resp.getStatusCode().is2xxSuccessful()) {
        // 第五段：反序列化——把 JSON 变回结果对象
        return objectMapper.readValue(resp.getBody(), DeductResult.class);
    }
    throw new IllegalStateException("库存服务返回 " + resp.getStatusCode());
}
```

五段式样板本身还能忍，真正的灾难是规模：项目里有 30 个这样的调用点，每处自己拼 URL、自己判状态码、自己处理异常，风格五花八门；更要命的是第一段的硬编码——020 篇刚用服务名消灭掉的写死 IP，又从后门溜了回来。OpenFeign 的答案：把这五段整体吃掉，把「调远程」降维成「调一个接口」。

## 2. 心智模型：写接口，框架生成实现

声明式调用的全部含义就一句话：**你只写接口和它上面的注解，运行期框架生成实现**。

```java
package com.example.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "stock-service")   // name 是 020 篇电话簿里的服务名
public interface StockClient {

    @PostMapping("/api/stock/deduct")              // 与提供方 Controller 同形
    DeductResult deduct(@RequestBody DeductRequest request);

    @GetMapping("/api/stock/{skuId}")
    String detail(@PathVariable("skuId") Long skuId);
}
```

调用方注入 StockClient 直接调 deduct(...)——一个没有实现类的接口，怎么可能被调用？答案是**动态代理**：Spring 在容器里为这个接口造了一个代理对象，方法调用被拦截后翻译成 HTTP 请求——从接口注解读出方法与路径，把参数装配成 body 或 query，按 name 去注册中心解析出真实地址（挑哪个实例归 050 篇），发出去，再把响应解码成返回值类型。

这套机制你已经见过两次：Java 基础篇的反射与动态代理是第一层；Spring 用代理织入事务与日志（AOP）是第二层；Feign 用代理把方法调用变成远程调用是第三层。**同一个原理贯穿框架三层**——机制只学一次，应用处处认得，这是学 Spring 系最大的复利。

## 3. 准备现场与起步全流程

依赖只有一项，Spring Cloud LoadBalancer 随行而来（050 篇的主角）：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

启动类打开扫描：

```java
@SpringBootApplication
@EnableFeignClients(basePackages = "com.example.order.client")
public class OrderApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

订单侧注入并调用，五段式样板全部消失：

```java
package com.example.order.service;

import com.example.order.client.DeductRequest;
import com.example.order.client.DeductResult;
import com.example.order.client.StockClient;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final StockClient stockClient;

    public OrderService(StockClient stockClient) {
        this.stockClient = stockClient;
    }

    public DeductResult createOrder(DeductRequest request) {
        return stockClient.deduct(request);   // 远程调用看起来就是一次本地方法调用
    }
}
```

```bash
curl -X POST http://localhost:9001/order -H "Content-Type: application/json" \
  -d '{"skuId": 1, "count": 2}'
# stock deducted, instance port=9002
```

## 4. name 与 url：两条寻址路

@FeignClient 的属性决定调用走哪条路：

- **name = "stock-service"**：走注册中心。按服务名从 Nacos 拉实例列表，交给负载均衡器挑一个直连——生产路径，020 与 050 两篇在这条路里会合；
- **url = "http://localhost:9002"**：直连模式，完全绕过注册中心与负载均衡。它的价值在调试：提供方还没注册上去，或要对着本地起的服务反复打点时，写 url 最省事。

```java
// 仅调试用：生产代码里出现 url 属性，一律追问
@FeignClient(name = "stock-service", url = "http://localhost:9002")
```

纪律：url 直连的代码**不许提交到主干**——它绕过了注册中心的全部保护，留在生产就是写死 IP 旧病复发。code review 见到 url 属性，先问什么时候删。

## 5. 参数注解的语义与坑

Feign 的参数注解与 Spring MVC 同形，但有三处语义必须钉死：

1. **@PathVariable 必须显式写 value**：`@PathVariable("skuId") Long skuId`。原因是 javac 默认不把参数名编进 class 文件，运行期只剩 arg0、arg1——URL 模板里的 {skuId} 找不到实参，替换无从发生。你会问：Boot 的官方 parent 不是默认开了 -parameters 编译参数吗？是，所以「有时不写也能跑」，但这份运气依赖构建环境，换个工具链就翻车。显式写 value 是零成本的免死金牌。
2. **@RequestParam 对应 query string，@RequestBody 对应请求体**：前者拼成 ?count=2 这样的查询串；后者把整个对象序列化进 body，一次调用只能有一个，且配 POST/PUT 这类允许 body 的方法。
3. **GET 带 body 是反模式**：HTTP 规范没定义 GET 的 body 语义，中间的代理、缓存、重试组件可能丢弃或拒绝它，部分客户端实现直接抛异常。批量查询的两条正路：query 参数拼接（/api/stock/batch?skuIds=1,2,3），或老实改 POST。别赌某个客户端「恰好支持」。

## 6. 超时与重试：NEVER_RETRY 的设计意图

先背超时。Feign 的超时是两级结构：全局默认给所有客户端兜底，按客户端（key 是服务名）单独覆盖：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:                  # 全局默认
            connect-timeout: 2000    # 建立连接的等待上限（毫秒）
            read-timeout: 5000       # 连上之后等响应的上限（毫秒）
          stock-service:            # 只对 stock-service 生效，覆盖全局
            read-timeout: 3000
```

connectTimeout 与 readTimeout 的语义分野：前者管「握上手要多久」（网络不通、对方没监听），后者管「握上手之后等它回话要多久」（它收到了、在处理、就是慢）。是谁在拖垮你，看哪个超时先触发——详细推演与放大效应是 050 篇的核心，这里先把两个旋钮认全。

再谈重试。OpenFeign 的默认重试策略是 **NEVER_RETRY**——一次都不重试。这不是偷懒，是明确的设计立场：**远程调用默认可能不幂等**。想象扣减库存接口收到请求、执行了一半、响应超时丢失；调用方以为失败而重试——第二笔扣减落库，重复扣款。重试的收益（扛过瞬时抖动）与风险（非幂等操作的重复执行）必须成对讨论，这是本模块 110 幂等篇要立的第一纪律。此处先记住边界：**只读接口（查询类）可以放心配重试；写接口在幂等保障落地之前一律不配**。

```java
@Bean
public Retryer retryer() {
    // 100ms 起步，最长间隔 1s，最多 3 次尝试（含首次）——只配在确定只读的客户端上
    return new Retryer.Default(100, 1000, 3);
}
```

注意这个 Bean 一旦声明就是全局的，会覆盖默认的 NEVER_RETRY；只想对个别客户端生效，改用 @FeignClient 的 configuration 属性指定，并且该配置类不要标 @Configuration（否则仍然全局生效）。

## 7. 降级：fallback 备胎

调用失败不能总是把异常原样抛给用户。Feign 提供最朴素的兜底——fallback 类实现同一个接口，失败时返回写死的降级值：

```java
@FeignClient(name = "stock-service", fallback = StockClientFallback.class)
public interface StockClient { ... }
```

```java
package com.example.order.client;

import org.springframework.stereotype.Component;

@Component
public class StockClientFallback implements StockClient {

    @Override
    public DeductResult deduct(DeductRequest request) {
        return DeductResult.fail("库存服务暂时不可用，请稍后重试");
    }

    @Override
    public String detail(Long skuId) {
        return "stock degraded";
    }
}
```

启用它需要断路器在位：classpath 加 resilience4j 断路器 starter，并打开开关 spring.cloud.openfeign.circuitbreaker.enabled=true（坐标与开关名以官方文档为准）。分清与 070 篇 Sentinel 的分工：**fallback 是写死的备胎**——失败就换上，每次都触发，没有规则；**Sentinel 是带规则的熔断**——统计错误率、按规则自动断开与恢复、还能限流。先学会备胎保住体验，再学规则管住故障。

## 8. 调试三件：日志、URL、404

**第一件：FULL 日志**。Feign 有四档日志：NONE（默认，不打）、BASIC（方法、URL、状态码、耗时）、HEADERS（加请求响应头）、FULL（再加请求响应体）。两步打开：

```java
@Configuration
public class FeignConfig {

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.FULL;
    }
}
```

```yaml
logging:
  level:
    com.example.order.client.StockClient: debug   # Feign 用 DEBUG 级别输出，这行不开永远看不到
```

**第二件：看实际发出的请求**。FULL 日志里能看到 Feign 真正拼出的 URL、请求头与 body，是排查「参数没带上」「content-type 不对」的唯一利器：

```text
[StockClient#deduct] ---> POST http://192.168.1.5:9002/api/stock/deduct HTTP/1.1
[StockClient#deduct] Content-Type: application/json
[StockClient#deduct] {"skuId":1,"count":2}
[StockClient#deduct] <--- HTTP/1.1 200 (45ms)
```

**第三件：404 排错**。提供方接口明明存在，调用却 404，按序三查：提供方配了 server.servlet.context-path 而 Feign 的路径没带上它；HTTP 方法不匹配（Feign 按注解声明发请求，手测时却按 GET 打了 POST 接口）；未来上了网关还有第四种——网关路由的 StripPrefix 把路径截错了，060 篇展开。

## 9. 实验：调通、超时、看明细

基于 020 篇现场（Nacos、order 9001、stock 9002）。

第一步：按第 3 节接好 Feign，调通扣减接口，FULL 日志能看到完整请求与响应。

第二步：把库存 detail 接口里加一行 Thread.sleep(3000) 模拟慢响应，把 stock-service 的 read-timeout 设为 1000，调 detail——预期订单侧在 1 秒左右拿到超时异常（ReadTimeout），而不是干等 3 秒：超时旋钮在调用方手里，这是后面所有稳定性话题的地基。

第三步：read-timeout 改成 5000 再调——约 3 秒后拿到正常返回。确认「多久算慢」是调用方定义的。

第三步其实埋了个问题：库存有 3 个实例，只有一台慢，调用方该怎么办？每次都等超时再换一台吗？这就是 050 篇负载均衡与重试的开场问题。

旧路标一句话：Netflix Feign 与 OpenFeign 是同一个库前后两任维护者，依赖坐标从 spring-cloud-starter-feign 换成了 spring-cloud-starter-openfeign；老教程里 Feign 内建 Hystrix fallback 的写法已随 Hystrix 退役，如今 fallback 走断路器抽象，Sentinel 与 Resilience4j 都是它的实现。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. RestTemplate 五段式样板是哪五段？Feign 分别用什么机制吃掉了它们？
2. 「接口没有实现类为什么能被调用」——用动态代理讲清 @FeignClient 的工作方式，再说出它在框架里的另外两次登场。
3. name 与 url 各走哪条寻址路？为什么 url 直连的代码不许提交到主干？
4. @PathVariable 为什么必须显式写 value？「有时不写也能跑」依赖的是什么条件？
5. connectTimeout 与 readTimeout 分别管什么？「连接秒通但一直等不到响应」触发的是哪个？
6. 默认 NEVER_RETRY 的设计意图是什么？「只读接口才可开重试」这条边界背后的幂等问题是什么？
7. fallback 备胎与 070 篇的 Sentinel 熔断分工差异是什么？启用 fallback 需要哪两样东西？
8. FULL 日志开了却看不到输出，除了 Logger.Level 还缺哪行配置？404 排错的三查是什么？

