---
order: 130
title: 面向切面编程：把 30 个接口的横切逻辑收进一个类
description: 以「给 30 个接口加耗时统计难道要手插 60 行代码」引入：横切关注点与运行期织入的心智模型、CGLIB 默认代理、五种通知确定执行顺序的打印实验、execution 与 @annotation 切点拆解、耗时监控/注解限流/异常打点三个完整实战，附「@Transactional 就是一个切面」的收束。
module: 'spring-boot'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/030-IoCDependencyInjection'
  - 'spring-boot/060-SpringMvcRestApi'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-boot/100-TransactionManagement'
  - 'spring-boot/130-SpringCacheRedis'
---

## 前置知识

- [IoC 与依赖注入](/spring-boot/030-IoCDependencyInjection)：记得生命周期第 4 步「AOP 代理在后置处理生成」——没读过也能跟，第 2 节现场补；
- [Spring MVC 与 REST API](/spring-boot/060-SpringMvcRestApi)：写过 @RestController 接口——没读过也能跟。

## 学习目标

读完本文你将能够：

1. 用「横切关注点」定义 AOP 要收编的逻辑，说清 Spring Boot 默认全用 CGLIB 代理的原因与代价；
2. 背出同一 @Aspect 内五种通知的确定执行顺序，用 finally 类比说清 @After 与 @AfterReturning、@AfterThrowing 的分野；
3. 逐段拆解 execution 切点表达式，写出 @annotation 自定义注解切点；
4. 独立写出接口耗时监控、注解限流、异常统一打点三个切面；
5. 识别自调用等四个经典坑，并说出 @Transactional 为什么就是一个现成切面。

预计 50 分钟。

## 1. 你现在要解决什么问题

产品要给全站 30 个接口加耗时日志，慢于 500 毫秒的还要告警。最本能的写法是打开每个 Controller：方法首行记下 System.currentTimeMillis()，return 前算差值打日志——30 个接口 60 行几乎相同的代码。下周要加「所有写操作记审计」，又是 30 处；下个月要把日志格式从毫秒改成微秒，再改 30 处。这些代码有三个特征：每个业务方法都要它、它不属于任何业务、改一次要动 N 处。它们叫**横切关注点**。AOP（Aspect-Oriented Programming，面向切面编程）的答案：把这类逻辑收进一个「切面」类写一次，运行期由框架自动包到所有匹配的方法外面。本篇讲清它靠什么包进去、五种通知按什么顺序执行、切点怎么写，再用三个完整实战把它落成能直接抄走的代码。

## 2. 心智模型：横切关注点收进切面，运行期织入

AOP 不修改你的源码。它在运行期把匹配的方法「包」起来，载体就是 030 篇讲过的动态代理：容器注入给你的不是原对象，是代理；调用先经过代理，代理在前后插入切面逻辑。

两种代理，一段历史。JDK 动态代理：要求目标实现接口，代理与目标平级、实现同一接口；CGLIB 子类代理：生成目标的子类，覆写方法来插逻辑。Spring Boot 默认 spring.aop.proxy-target-class=true，**全用 CGLIB**。原因：业务类大多不写接口，按类生成代理后按类型注入不会类型不符；代价是子类代理的命门——final 类无法被继承、final 方法无法被覆写，这些方法拦截不到，private 与 static 方法同样拦不到。

```text
调用方 ──调用──> 代理对象（CGLIB 子类）
                   │ 按切点匹配：不匹配 → 直接透传给目标
                   │ 匹配 → 依次执行通知链
                   ▼
              目标方法（你的业务代码）
```

「切点」决定包谁，「通知」决定插什么——下一节先认识通知。

## 3. 准备现场：一个会成功、会炸的订单服务

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

starter 引入 aspectjweaver，让 @Aspect 注解生效——但 @Aspect 类本身仍是普通 Bean，记得加 @Component（或用 @Bean 注册），否则写了也白写。现场用一个订单服务，既能正常返回也能抛异常：

```java
@Service
public class OrderService {

    public String create(String sku) {
        return "订单已创建：" + sku;
    }

    public String pay(String orderId) {
        throw new IllegalStateException("支付渠道超时");
    }
}
```

## 4. 五种通知与确定的执行顺序

五种通知回答「插在方法的什么位置」：

| 通知 | 时机 | finally 类比 |
| --- | --- | --- |
| @Around | 包住整个方法，手动放行 proceed() | 自己写 try-finally |
| @Before | 目标方法执行前 | try 块首行 |
| @AfterReturning | 正常返回后 | return 之后的收尾 |
| @AfterThrowing | 抛异常后 | catch 块 |
| @After | 无论成败都执行 | finally 块 |

同一个 @Aspect 内的顺序，Spring Framework 5.2.7 起固定为：

```text
@Around 前半 → @Before → 目标方法 → @Around 后半 → @After → @AfterReturning（或 @AfterThrowing）
```

纸上得来终觉浅。一个切面装全五种，跑一遍看输出：

```java
@Aspect
@Component
public class AllAdviceAspect {

    private static final String PC = "execution(* com.example.aop.OrderService.*(..))";

    @Around(PC)
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println("1 @Around 前半");
        try {
            Object result = pjp.proceed();               // 放行到目标方法
            System.out.println("4 @Around 后半");
            return result;
        } catch (Throwable t) {
            System.out.println("4 @Around 后半（异常路径）");
            throw t;
        }
    }

    @Before(PC)
    public void before() {
        System.out.println("2 @Before");
    }

    @After(PC)
    public void after() {
        System.out.println("5 @After");
    }

    @AfterReturning(PC)
    public void afterReturning() {
        System.out.println("6 @AfterReturning");
    }

    @AfterThrowing(PC)
    public void afterThrowing() {
        System.out.println("6 @AfterThrowing");
    }
}
```

调用 create，正常路径：

```text
1 @Around 前半
2 @Before
（目标方法执行）
4 @Around 后半
5 @After
6 @AfterReturning
```

调用 pay，异常路径：

```text
1 @Around 前半
2 @Before
（目标方法抛出异常）
4 @Around 后半（异常路径）
5 @After
6 @AfterThrowing
```

两个观察。其一，@After 永远倒数第二、两种结果通知二选一——「无论成败都要做」（清理资源）写 @After，「只在成功后做」（发奖励）写 @AfterReturning，「只在失败后做」（留证据）写 @AfterThrowing。其二，注意 @Around 的后半排在 @After **之前**——5.2.7 之前顺序不同，网上旧文章的说法以你这台机器的输出为准，本篇顺序在 3.5.x 下可复现。多个切面之间用 @Order 排队，值越小越靠外（@Around 的外层先执行前半、最后执行后半）。

## 5. 切点表达式：execution 逐段拆解与 @annotation

execution 括号内三段：返回类型、类路径、方法与参数。

```text
execution(* com.example.aop.OrderService.*( .. ))
          │  │                    │   │
          │  │                    │   └─ 参数：.. 表示任意个任意类型
          │  │                    └─ 方法名：* 匹配所有方法，find* 匹配 find 开头
          │  └─ 全限定类名：包内 .. 表示本包及子包，* 表示任意类
          └─ 返回类型：* 任意，String 精确匹配
```

三个高频形态：

```java
execution(* com.example.service..*.*(..))              // service 包及子包所有类所有方法
execution(* com.example.service.*.find*(String))       // find 开头且首参为 String
execution(public * com.example..*.*(..))               // 显式限定 public，一般省略
```

工程里最常用的其实是另一种：**@annotation 切点**——自定义注解当开关，注解打在哪，切面就织到哪：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)          // 必须保留到运行期，反射才读得到
public @interface Monitor {

    String value() default "";
}
```

```java
@Around("@annotation(monitor)")              // 通知方法的注解形参名与占位符对上，完成绑定
public Object around(ProceedingJoinPoint pjp, Monitor monitor) throws Throwable {
    // monitor.value() 能直接读到注解上的配置
    return pjp.proceed();
}
```

两者分工：execution 适合「按位置批量圈」（整个包），@annotation 适合「按意图精确点」（谁需要谁标注）。下面的实战以 @annotation 为主。

## 6. 实战一：@Around 接口耗时与慢接口告警

把 060 篇风格的任意 Controller 放进 com.example.aop.controller 包，一个切面全站生效：

```java
@Aspect
@Component
public class ApiTimingAspect {

    private static final Logger log = LoggerFactory.getLogger(ApiTimingAspect.class);
    private static final long SLOW_MS = 500;

    @Around("execution(* com.example.aop.controller..*(..))")
    public Object time(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();                  // nanoTime 单调，不受系统对时影响
        try {
            return pjp.proceed();
        } finally {
            long costMs = (System.nanoTime() - start) / 1_000_000;
            String sig = pjp.getSignature().toShortString();
            if (costMs >= SLOW_MS) {
                log.warn("慢接口 {} 耗时 {} ms", sig, costMs);
            } else {
                log.info("{} 耗时 {} ms", sig, costMs);
            }
        }
    }
}
```

三个工程细节。计时用 System.nanoTime() 而非 currentTimeMillis——后者会被 NTP 对时拨动，可能算出负耗时。统计放 finally，异常路径也要算耗时——慢请求往往正是会抛异常的请求。切点只圈 controller 包，service 层的内部调用不打日志，避免一次 HTTP 请求刷出调用链每层的重复耗时。

## 7. 实战二：@RateLimit 注解加固定窗口限流

需求：短信发送、登录尝试这类接口要限流保护。先定义注解：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    int limit();                       // 窗口内最大次数

    long windowMs() default 1000;      // 窗口长度
}
```

切面实现固定窗口计数：

```java
@Aspect
@Component
public class RateLimitAspect {

    private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();
    // long[0] 窗口起点毫秒，long[1] 计数

    @Around("@annotation(rateLimit)")
    public Object limit(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        String key = pjp.getSignature().toShortString();
        long[] window = windows.computeIfAbsent(key, k -> new long[]{System.currentTimeMillis(), 0});
        long now = System.currentTimeMillis();
        synchronized (window) {
            if (now - window[0] >= rateLimit.windowMs()) {
                window[0] = now;                       // 旧窗口过期，开新窗口
                window[1] = 0;
            }
            if (++window[1] > rateLimit.limit()) {
                throw new IllegalStateException("请求过于频繁，请稍后再试");
            }
        }
        return pjp.proceed();
    }
}
```

使用处一行：

```java
@PostMapping("/api/sms/send")
@RateLimit(limit = 5, windowMs = 60_000)
public String send(@RequestParam String phone) {
    return "已发送";
}
```

边界说清楚：这是**单机**限流——计数在应用内存里，重启清零，多实例部署时各自计数等于总限额乘以实例数。分布式限流要把计数挪到 Redis 并用 Lua 脚本保证原子，是另一篇深水区。固定窗口还有临界突刺问题（两个窗口交界处可能放过接近两倍的流量），滑动窗口与令牌桶是升级路线，方向都是「把计数与时间的关系做得更平滑」。

## 8. 实战三：@AfterThrowing 统一异常打点

需求：service 层抛出的所有异常都要上报监控，但不想改业务代码：

```java
@Aspect
@Component
public class ErrorAuditAspect {

    @AfterThrowing(pointcut = "execution(* com.example.aop.service..*(..))", throwing = "ex")
    public void audit(JoinPoint jp, Throwable ex) {
        // 真实项目里这里是推送到监控平台、写异常表
        System.out.println("异常打点：" + jp.getSignature().toShortString()
                + " -> " + ex.getClass().getSimpleName());
    }
}
```

关键认知：**打点不等于处理**。@AfterThrowing 拿到异常看了一眼，异常继续往调用方飞——它没有「吃掉」异常的能力。要把异常转换成统一响应、不让堆栈漏给前端，那是 @RestControllerAdvice 的地盘（070 篇）。两者各司其职：AOP 对内留证据，全局异常处理器对外给体面。

## 9. 与事务的关系：@Transactional 就是一个现成切面

回头看上一篇（[事务管理](/spring-boot/100-TransactionManagement)）的心智模型：代理在方法边界执行 begin、commit、rollback——那正是一个 @Around 语义的通知，Spring 内部叫 TransactionInterceptor。@Transactional、@Async、@Cacheable 是同一个模式的三次复用：**注解声明意图，代理在边界干活**。这也解释了三件事的共同失效方式：自调用绕过代理，三者一起失灵；方法非 public，三者一起失效。学完本篇，这几个注解对你不再是几个独立的魔法，而是同一套织入机制上的不同业务通知。

## 10. 坑清单

- 自调用不触发切面：this.method() 走的是目标对象，切面逻辑消失——与 100 篇事务失效同源同修法（拆类，或注入自身代理）；
- @Around 不调 proceed：目标方法根本不执行，调用方拿到的返回值就是你给的（忘给就是 null）——降级开关正是这么实现的，但忘写 proceed 是事故；
- 切面改不了调用方的参数：@Before 里 jp.getArgs()[0] = 新值 改的是数组副本，调用方实参不动；要改参数必须 @Around 里 proceed(新参数数组)；
- private、static、final 方法与构造器拦不到：CGLIB 靠子类覆写，前三者覆写不了或不可覆写，构造器执行时代理还没出生；
- 切点圈太宽：execution(* com.example..*(..)) 会把不相干的组件一起圈进来，日志刷屏、性能受损——按包分层圈，或优先 @annotation。

## 11. 官方参考

- AOP 章节（切点语言与通知类型的权威定义）：https://docs.spring.io/spring-framework/reference/core/aop.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 横切关注点的三个特征是什么？AOP 在什么时机、靠什么机制把逻辑包进方法？
2. Spring Boot 为什么默认全用 CGLIB？这个默认拦不住哪几类方法？
3. 背出五种通知在正常与异常两条路径上的确定执行顺序，并用 finally 类比 @After、@AfterReturning、@AfterThrowing。
4. execution(* com.example.service..*.find*(String)) 逐段说匹配什么？
5. @annotation 切点的完整写法？注解实例怎么绑定进通知方法？@Retention 少了 RUNTIME 会怎样？
6. @AfterThrowing 拿到异常后，异常还会飞给调用方吗？对外统一响应该找哪个机制？
7. @Around 不调 proceed 会发生什么？想改调用方参数必须怎么做？
8. 为什么说 @Transactional 就是一个切面？它和 @Async、@Cacheable 的共同失效方式是什么？
