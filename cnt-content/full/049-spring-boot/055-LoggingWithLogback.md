---
order: 60
title: 日志体系：门面、Logback 与 traceId 排障
description: Spring Boot 日志体系：SLF4J 门面与 Logback 实现的关系、日志级别与 logger group、输出格式定制与文件滚动、MDC 链路上下文按 traceId 串联跨层调用，附排障实验与 AOP 日志切面
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/030-IoCDependencyInjection'
  - 'spring-boot/050-ConfigurationManagement'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-boot/110-AspectOrientedProgramming'
  - 'spring-boot/160-ActuatorObservability'
  - 'spring-boot/180-PackagingDeployment'
---

## 前置知识

- [IoC 与依赖注入](/spring-boot/030-IoCDependencyInjection)：知道 Logger 是怎么被注入的即可，没读过也能跟；
- [配置管理](/spring-boot/050-ConfigurationManagement)：会编辑 application.yml——本篇日志配置全部走它。

## 学习目标

读完本文你将能够：

1. 说清 SLF4J 与 Logback 的门面/实现关系，解释为什么代码里 import 的是 slf4j 的 Logger；
2. 用 logging.level 按包与 logger group 调级，配合 [Actuator 的 loggers 端点](/spring-boot/160-ActuatorObservability)在线改级别；
3. 用 logging.pattern 定制输出格式，配置文件输出的滚动策略（按天 + 按大小）；
4. 用 MDC 把 traceId 串进一次请求的全部日志，学会 filter 写入、finally 清理的完整套路；
5. 判断哪些内容绝不能进日志（密码、手机号明文），知道异步 appender 的丢日志风险。

预计 40 分钟，需要一个能跑 Spring Boot 项目的终端。

## 1. 你现在要解决什么问题

凌晨两点，用户反馈「下单失败」。你登录生产服务器，面对几 GB 的日志文件：哪一行是这次请求的？控制器、Service、Repository 都打了日志，可三次请求的日志混在一起根本分不清谁是谁；找到一条 ERROR，旁边却没有上下文——它的请求参数、调用链在几百行之外。日志不是「打出来就行」的系统：**级别决定噪音量，格式决定可读性，MDC 决定能不能把一次调用串成一条线**。本篇把这三层立起来，让你排障时从「大海捞针」变成「按编号取件」。

## 2. 门面与实现：为什么 import 的是 SLF4J

Spring Boot 项目的日志代码长这样：

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public Order create(OrderCmd cmd) {
        log.info("创建订单 userId={}, skuId={}", cmd.userId(), cmd.skuId());
        // ...
    }
}
```

Logger 类型来自 **SLF4J**，但真正往控制台写日志的是 **Logback**。这是一套「门面 + 实现」的分工：

```mermaid
flowchart LR
    A["你的代码<br/>log.info(...)"] --> B["SLF4J 门面<br/>统一 API"]
    B --> C["Logback 实现<br/>真正格式化与输出"]
    C --> D["控制台 / 文件"]
```

为什么要隔一层门面：SLF4J 定义「日志长什么样」的接口（Logger、级别、占位符），Logback 是接口的一个实现。哪天团队决定换 Log4j2，业务代码一行不改，只换依赖与配置——门面挡住了实现的变动。Spring Boot 的默认装配（spring-boot-starter-web 传递引入 spring-boot-starter-logging）已经把 SLF4J + Logback 配好，开箱即用；「换实现」才需要排除默认 starter 再引入新的。

两个细节是 SLF4J 风格的必修课：

- **占位符 `{}` 而不是字符串拼接**：`log.info("订单 {}", id)` 优于 `log.info("订单 " + id)`——前者在日志级别被过滤时**不会执行拼接**，后者无论级别开不开都会先拼字符串。高频调用的 debug 日志尤其明显；
- **参数化异常**：`log.error("下单失败", e)` 把异常对象作为**最后一个独立参数**传入，Logback 会自动打印完整堆栈。写成 `"下单失败 " + e` 只有一行 toString，堆栈全丢——这是新手最高频的日志事故。

## 3. 日志级别与 logger group

### 3.1 级别：过滤的第一道闸

Logback 有五个常用级别，从重到轻：ERROR（出了故障，需要人介入）、WARN（异常但已兜底）、INFO（关键业务动作）、DEBUG（开发期细节）、TRACE（最细粒度）。**级别是下限**：根级别设为 INFO，意味着 INFO 及以上的日志输出，DEBUG/TRACE 被丢弃。

application.yml 里按包调级：

```yaml
logging:
  level:
    root: info                          # 全局底线
    com.fandex.order: debug             # 自己的包开到 debug
    org.springframework.web: info       # 框架保持 info
    org.hibernate.SQL: debug            # 看 SQL 时单独打开
```

排查思路永远是「root 收紧、目标包放宽」：全局开 debug 的项目日志噪音大到没人看，反而掩盖真正的 WARN。

### 3.2 logger group：给一组包起个名字

相关包常常需要一起调级（比如「下单相关的一组包」），逐个写很啰嗦，group 给它们起 collectively 的名字：

```yaml
logging:
  group:
    order-flow: com.fandex.order, com.fandex.payment, com.fandex.inventory
  level:
    order-flow: debug        # 一行调三个包
```

group 的真正威力在配合 [Actuator 的 loggers 端点](/spring-boot/160-ActuatorObservability)：线上事故时 `POST /actuator/loggers/order-flow` 把整组包调到 DEBUG，无需重启、无需发版，查完再调回来。名字起得好的 group 让「在线调级」成为可运维的操作而不是临时翻包名的苦役。

## 4. 输出格式与文件滚动

### 4.1 定制格式：为 grep 而设计

默认的控制台格式已经够用，但生产环境几乎都要定制——至少要把 traceId 塞进去（见第 5 节）。用 `logging.pattern` 调整：

```yaml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
```

逐个拆解占位符：

- `%d{...}`：时间戳，格式自定。生产机多机部署时建议精确到毫秒——按秒排序在并发下会乱；
- `[%thread]`：线程名。排「线程池打满」「哪个线程卡死」全靠它；
- `%-5level`：级别左对齐占 5 列，列对齐后肉眼扫日志的速度显著提升；
- `%logger{36}`：logger 名缩写到 36 字符以内（通常是类名），超长时按包逐级缩写；
- `%msg%n`：消息本体与换行。

格式设计的纪律：**日志是给机器 grep、给人扫的**——字段之间用空格与固定分隔，时间在前（sort 天然按时间），级别与类名固定列位，不要在格式里加对齐用的大型空白块。

### 4.2 文件输出与滚动策略

控制台日志随容器重启消失，生产必须落文件：

```yaml
logging:
  file:
    name: /var/log/order-service/app.log
  logback:
    rollingpolicy:
      file-name-pattern: /var/log/order-service/app.%d{yyyy-MM-dd}.%i.gz
      max-file-size: 100MB
      max-history: 14
      total-size-cap: 5GB
```

四个属性的语义：按**天 + 序号**切分文件（`%d` 日期、`%i` 当天第几个文件），单文件超过 **100MB** 就切，保留 **14 天**历史，所有归档总量超过 **5GB** 时从最旧开始清理。`.gz` 后缀触发自动压缩——日志压缩比通常在 10:1 以上，这条几乎白拿。这组参数的取舍点：max-history 与 total-size-cap 是「磁盘预算」的两道闸，只设前者在日志暴涨时仍会撑爆磁盘（14 天 x 每天 20GB 的场景），两道闸一起上才是完整护栏。

需要更细的控制（按级别分文件、异步写、自定义 Layout）时，把 Boot 的 yml 配置换成 classpath 下的 `logback-spring.xml`——Boot 的 yml 覆盖了 90% 场景，XML 是那 10% 的逃生门，两者不要混着配同一件事。

## 5. MDC：按 traceId 串起一次调用

MDC（Mapped Diagnostic Context）是「日志的请求级上下文」：往 MDC 放一个键值对，**当前线程**后续打的每条日志都自动带上它。

真实排障场景：一次下单请求经过 Controller → OrderService → PaymentClient，三层各打了日志。没有 MDC 时三段日志之间隔着其他用户的几十条日志；有了 traceId，`grep "t=8f3a2c"` 一条命令把这次调用的完整链路捞出来。

第一步，把 traceId 加进日志格式：

```yaml
logging:
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level [t=%X{traceId}] %logger{36} - %msg%n"
```

`%X{traceId}` 读取 MDC 里名为 traceId 的值。第二步，用一个 Filter 在请求入口生成并写入：

```java
@Component
public class TraceIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String traceId = Optional
                .ofNullable(request.getHeader("X-Trace-Id"))   // 上游带了就沿用（跨服务串联）
                .orElseGet(() -> UUID.randomUUID().toString().substring(0, 8));
        MDC.put("traceId", traceId);
        response.setHeader("X-Trace-Id", traceId);             // 回传给调用方，报障时能对上
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();                                       // 线程复用，用完必须清
        }
    }
}
```

逐段拆解：

- **优先沿用上游的 `X-Trace-Id`**：跨服务调用时同一笔业务走多个服务，各服务各生成各的 traceId 就失去了串联意义——网关或上游服务生成、下游沿用的「贯穿式 traceId」是排障链条的关键；
- **`finally` 里 `MDC.clear()` 是硬纪律**：Tomcat 的线程是复用的，不清 MDC，上一个请求的 traceId 会「漏」给下一个请求——排障时会出现「这个 traceId 的日志里混着两笔订单」的灵异现场；
- 自测 HTTP 客户端在发起下游调用时**手动带上 `X-Trace-Id` 头**（从当前 MDC 取出塞进请求头），串联才能跨过服务边界。跨服务全链路追踪的专业方案是 Micrometer Tracing（[打包部署与可观测](/spring-boot/160-ActuatorObservability)篇的延伸阅读），MDC 是理解它的地基——事实上 tracing 框架的 traceId 正是通过 MDC 进入日志格式的。

日志验证：连续打两个请求，控制台应看到两段日志分别带不同的 `t=xxxx`，同一次调用的 Controller/Service 日志共享同一个 `t=xxxx`。

## 6. 复用：AOP 日志切面

第 2 节的 `log.info` 散落在每个方法里，重复且容易漏。入口/出口/耗时的打点适合收拢进一个切面，套用 [AOP](/spring-boot/110-AspectOrientedProgramming) 的知识：

```java
@Aspect
@Component
public class ApiLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(ApiLoggingAspect.class);

    @Around("execution(* com.fandex..controller..*(..))")
    public Object logApi(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        log.info("API 进入 {} args={}", pjp.getSignature().toShortString(), Arrays.toString(pjp.getArgs()));
        try {
            return pjp.proceed();
        } finally {
            log.info("API 离开 {} cost={}ms", pjp.getSignature().toShortString(),
                     System.currentTimeMillis() - start);
        }
    }
}
```

切面打的是「结构化的事件流」（进出与耗时），业务日志打的是「发生了什么」——两层分工而不是互相替代。**切面里的 args 打印就是敏感信息泄漏的重灾区**：登录接口的参数里有密码，实名接口的参数里有身份证号，全量打印等于把明文写进日志文件。生产切面要么只打方法名不打参数，要么对参数做脱敏（正则替换手机号中间四位、密码直接替换为 `***`）。

## 7. 纪律与易错点

1. **敏感信息不进日志**：密码、完整手机号、身份证、token。参数脱敏是日志模块的出厂设置而不是事后补丁——泄漏后的补救（删日志、通知用户）成本是脱敏成本的一百倍；
2. **`log.error` 滥用**：把「业务上预期内的失败」（用户输错密码）打成 ERROR，告警群每天被无效 ERROR 刷屏，真故障反而被淹没。ERROR 的语义是「需要人介入」，预期内失败用 WARN/INFO；
3. **e 的 toString 替代堆栈**：`"失败: " + e.getMessage()` 丢失堆栈。异常对象作为最后一个参数传入；
4. **异步 appender 的丢日志风险**：高吞吐项目常用 AsyncAppender 提升性能，但队列满时默认**丢弃日志**（可配 discardingThreshold 与 neverBlock）——排障时发现「出事那一刻的日志恰好没有」，先查异步队列配置。交易类关键日志宁可用同步 appender；
5. **循环里打 INFO**：批处理循环里每条记录打一行 INFO，一晚能写爆磁盘。循环内打 DEBUG 或聚合后打一行汇总；
6. **MDC 只对当前线程生效**：把任务丢进线程池（@Async、CompletableFuture）后，新线程读不到 MDC——需要任务装饰器（TaskDecorator）把上下文复制过去。发现「异步方法的日志没有 traceId」，就是这个原因。

## 8. 动手实践

**任务一：traceId 串联实验。** 给一个三层接口（Controller → Service → Repository 模拟）装上 TraceIdFilter 与 traceId 格式，连续发三个请求，用 grep 验证每个请求的日志能按 traceId 完整捞出。提示：验证命令 `grep "t=8f3a2c" app.log`；故意在 Service 里 throw 一个异常，确认 ERROR 行与它前面同一 traceId 的 INFO 行能串成完整链路。

**任务二：loggers 端点在线调级。** 启用 [Actuator 的 loggers 端点](/spring-boot/160-ActuatorObservability)，把一个 DEBUG 日志的包从 INFO 在线调到 DEBUG、再调回，全程不重启。提示：`curl -X POST localhost:8080/actuator/loggers/com.fandex.order -H "Content-Type: application/json" -d '{"configuredLevel":"DEBUG"}'`；先 GET 该端点看当前生效级别。

**任务三：滚动策略压测。** 配置 1MB 切分 + 保留 3 个文件的滚动策略，写一个循环发 2000 个请求的脚本，观察 app.log、归档文件与磁盘占用。提示：验证「第 4 个归档出现时最旧的被删除」；把 max-history 与 total-size-cap 分别删掉再压一遍，观察两种配置下磁盘曲线的差异。

先自己写，再对照参考实现（任务一）：

<details>
<summary>任务一参考实现（traceId 串联）</summary>

```yaml
# application.yml
logging:
  level:
    com.fandex.order: debug
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [t=%X{traceId}] %logger{20} - %msg%n"
```

```java
// 三层各打一行
@RestController
public class OrderController {
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    private final OrderService service;

    OrderController(OrderService service) { this.service = service; }

    @PostMapping("/api/orders")
    public Map<String, Object> create(@RequestBody OrderCmd cmd) {
        log.info("收到下单请求 skuId={}", cmd.skuId());
        Order order = service.create(cmd);
        return Map.of("id", order.id());
    }
}

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public Order create(OrderCmd cmd) {
        log.debug("校验库存 skuId={}", cmd.skuId());
        if (cmd.skuId() == null) {
            log.error("下单失败 skuId 为空", new IllegalArgumentException("skuId required"));
            throw new IllegalArgumentException("skuId required");
        }
        return new Order(1L, cmd.skuId());
    }
}
```

```
# 发两个请求后的控制台（示意）
14:02:11.101 INFO  [t=8f3a2c] OrderController  - 收到下单请求 skuId=5
14:02:11.102 DEBUG [t=8f3a2c] OrderService    - 校验库存 skuId=5
14:02:11.102 ERROR [t=8f3a2c] OrderService    - 下单失败 skuId 为空
java.lang.IllegalArgumentException: skuId required
    at com.fandex.order.OrderService.create(OrderService.java:14)
14:02:15.330 INFO  [t=91b7d0] OrderController  - 收到下单请求 skuId=3
```

验收点：两个请求的 traceId 不同（Filter 各自生成）；同一请求的三行共享 traceId 且 ERROR 带完整堆栈（异常作为最后一个独立参数）；故意在另一个线程（如 @Async 方法）里打一行日志，观察 `t=` 变成空——这正是第 7 节第 6 条的现场，跨线程传递 MDC 是课后进阶。
</details>

## 9. 小结

- SLF4J 是门面、Logback 是实现，Boot 默认装配开箱即用；占位符 `{}` 与「异常作最后一个参数」是两条写法纪律；
- 级别按「root 收紧、目标包放宽」调；logger group 把一组包命名，配合 loggers 端点在线调级；
- 格式为 grep 设计：时间、线程、级别、logger 定位列，`%X{traceId}` 接入 MDC；
- 文件滚动四参数（切分模式、单文件上限、保留天数、总量上限）是磁盘预算的两道闸；
- MDC 三步：格式加 %X、Filter 入口写入、finally 清理；跨服务靠 X-Trace-Id 头贯穿，跨线程要任务装饰器；
- 敏感信息不进日志、预期内失败不打 ERROR、异步 appender 有丢日志风险。

## 10. 相关阅读

- loggers 端点在线调级的操作手册：[Actuator 可观测性](/spring-boot/160-ActuatorObservability)
- 切面的切入点表达式与通知类型：[AOP 面向切面编程](/spring-boot/110-AspectOrientedProgramming)
- 容器里日志文件的挂载与采集：[打包部署](/spring-boot/180-PackagingDeployment)
- 分布式全链路追踪（traceId 的体系化方案）：[Spring Cloud 分布式追踪](/spring-cloud/080-DistributedTracing)
