---
order: 180
title: 异步与定时任务：别让用户盯着转圈，也别让任务睡过头
description: 以「注册后同步串行 1.5 秒的短信与新人券、到点没人跑的凌晨任务」引入：@Async 的代理本质与线程池治理四参数、异常的两种去向、cron 六位表达式、fixedRate 与 fixedDelay 的背压分野，附默认单线程调度池的饿死实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/030-IoCDependencyInjection'
  - 'spring-boot/110-AspectOrientedProgramming'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/140-SpringAmqpRabbitmq'
  - 'spring-boot/160-ActuatorObservability'
---

## 前置知识

- 已完成 [IoC 容器与依赖注入](/spring-boot/030-IoCDependencyInjection)：知道 Bean 从容器注入——没读过也能跟，把框架动作都当成「容器替你安排好了」即可；
- 已完成 [面向切面编程](/spring-boot/110-AspectOrientedProgramming)：见过「调用先经过代理对象」这个事实——本篇 @Async 的失效问题全是它的变体。没读过也能跟，第 3 节会用两句话把代理概念补齐。

把「到点干活」换成「来活就干、由别人投递」，异步就长成了消息队列——那是 [Spring AMQP 与 RabbitMQ](/spring-boot/140-SpringAmqpRabbitmq) 的世界，本篇末尾会划清这条边界。

## 学习目标

读完本文你将能够：

1. 给耗时副作用加 @Async 让接口秒回，说出 @Async 生效的两个前提：开了总开关、调用走代理；
2. 判断默认线程池够不够，按业务含义调核心数、队列容量、最大线程、拒绝策略四个参数，并用 @Async("beanName") 给快慢任务分池；
3. 说清 void 与 CompletableFuture 两种返回值下异常各去了哪，选对感知失败的方式；
4. 写出六个字段的 cron 表达式，在 fixedRate、fixedDelay、initialDelay 之间按背压语义做选择；
5. 复现「默认单线程调度池被慢任务饿死」的现象，并给出两条治理手段；
6. 说清多实例部署下定时任务重复执行的问题意识与三条出路。

预计 45 分钟，需要一个能跑 Spring Boot 的工程与一个终端窗口。

## 1. 你现在要解决什么问题

注册接口刚上线就挨骂：用户点完提交，页面转圈一秒半才跳转。追进去看，注册本身只要 50 毫秒，剩下全耗在副作用上——发验证码短信 800 毫秒、送新人券 400 毫秒、写审计日志 300 毫秒，串行跑完才返回。这些副作用没有一件是用户要等的：短信晚十秒到不痛，注册转圈两秒很痛。这是第一类问题：**该异步的活被同步干了**。第二类问题在另一个世界：运营配了个凌晨两点的数据归档任务，第二天早上发现压根没跑——应用活着，任务却睡过头了。两类问题的答案就是本篇的两个注解：@Async 把不急的活从请求线程上摘下来交给池子，@Scheduled 让任务到点自己醒。但两者背后都是线程池，池子治理不好，异步只是把卡顿换成了积压——所以本篇的核心不是注解，是线程池。

## 2. 准备现场：一个同步串行的注册流程

先写三个副作用方法（故意用同步写法复现痛点）：

```java
@Service
public class RegisterService {

    private static final Logger log = LoggerFactory.getLogger(RegisterService.class);

    public void register(String username) {
        log.info("register {} done", username);      // 核心逻辑：50 毫秒
        sendSms(username);                           // 800 毫秒
        grantCoupon(username);                       // 400 毫秒
        writeAudit(username);                        // 300 毫秒
    }

    private void sendSms(String username) { sleep(800); log.info("sms sent to {}", username); }
    private void grantCoupon(String username) { sleep(400); log.info("coupon granted to {}", username); }
    private void writeAudit(String username) { sleep(300); log.info("audit written for {}", username); }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
```

控制器里打一笔计时：

```java
long start = System.currentTimeMillis();
registerService.register("ada");
log.info("total {} ms", System.currentTimeMillis() - start);
```

预期日志里 total 约 1550 毫秒——四段活串行，用户全程陪跑。下面每一步改造都拿这个数字对照。

## 3. @Async：把方法交给池子，调用方转身就走

### 3.1 心智模型与两个生效前提

@Async 的语义一句话：**调用这个方法时，方法体被提交给线程池异步执行，调用方立即拿到返回**。它不是「手动 new 线程」的花哨写法，而是 110 篇代理机制的直接应用——先用两句话补齐代理：容器注入给你的 RegisterService 其实是代理对象，调用先落在代理上，代理才有机会「截胡」：不执行方法体，而是把执行打包丢给线程池。由此推出 @Async 生效的两个前提，缺一即静默失效（方法照样跑，只是同步跑，最难受的是没有任何报错）。

前提一，开了总开关 @EnableAsync，通常放在配置类上：

```java
@Configuration
@EnableAsync
public class AsyncConfig {
}
```

前提二，调用必须经过代理：从容器注入后调用，且方法是 public。类内部 this.sendSms() 绕过代理直连方法体，异步变同步——这就是 110 篇「自调用失效」的又一次现身，一鱼两吃，解法（拆类、注入自身代理）那边已详，此处不展开。

改造：给三个副作用方法加 @Async，同时从 private 提为 public（代理要拦得到）：

```java
@Async
public void sendSms(String username) { sleep(800); log.info("sms sent to {}", username); }
```

### 3.2 实验：接口秒回，日志换了一种顺序

重启后再打注册接口：

```text
register ada done          （主线程打印，控制器继续往下走）
total 3 ms                 （接口立即返回，1550 变成个位数）
sms sent to ada            （约一秒内陆续出现，线程名 task-N）
coupon granted to ada
audit written for ada
```

total 从 1550 毫秒掉到个位数，副作用在别的线程（线程名 task- 开头，4.1 节交代出处）里慢慢补完。顺手立一条纪律：被异步的方法应该是「失败不影响主流程」的副作用——验证码发送失败要不要让用户知道，是业务决策；本篇先立机制，可靠性方案（重试、落库补偿）在 140 篇的消息队列里是另一条路。

## 4. 线程池治理：默认池的边界与四个参数

### 4.1 默认池长什么样，什么时候不够用

那些 task- 线程来自 Boot 自动配置的 applicationTaskExecutor（Boot 2.1 起提供，类型 ThreadPoolTaskExecutor）：核心线程 8，队列无界，线程名前缀 task-。无界队列能推出两个重要结论：

- maxPoolSize 配了也轮不到生效：JDK 线程池的扩容顺序是「核心满 → 先入队 → 队列满 → 才扩到 max → 再满才拒绝」，队列永远不满，max 永远不动；
- 任务堆积不报错：消化不完的任务静静排在队列里，延迟慢慢涨、内存慢慢涨，直到 OOM 或业务方投诉超时。

判断默认池够不够，就问两个问题：8 根线程的吞吐扛不扛得住任务量？不同任务要不要互相隔离？只要有一个答案是「不」，就自己建池。

### 4.2 四个参数的业务含义

```java
@Bean("mailExecutor")
public ThreadPoolTaskExecutor mailExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(8);
    executor.setQueueCapacity(200);
    executor.setThreadNamePrefix("mail-");
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    executor.initialize();
    return executor;
}
```

| 参数 | 业务含义 | 取值思路 |
| --- | --- | --- |
| corePoolSize | 常驻工人，有活立刻有人接 | CPU 密集约等于核数；IO 密集 2 倍核数起步 |
| queueCapacity | 排队缓冲，扛突发 | 突发量 × 能接受的排队时长 |
| maxPoolSize | 队列满之后的扩容上限 | 略高于 core；队列有界时它才有意义 |
| RejectedExecutionHandler | 全满后的最后一道闸 | 见下文 |

CPU 密集（压缩、加密、计算）的线程在满负荷干活，多开只会互相抢核，核数上下即可；IO 密集（发邮件、调外部接口）的线程大部分时间在等网络，等得越久越该多开，经验公式：线程数 ≈ 核数 ×（1 + 等待时间 ÷ 计算时间）。发一封邮件 800 毫秒里 790 毫秒在等网关，等待比极高，线程数理直气壮地开大。

拒绝策略是全满后的处置：AbortPolicy（默认）抛异常，把「池子满了」这个事实喊出来；CallerRunsPolicy 让提交任务的线程自己干——上游自动被拖慢，天然的背压。异步副作用场景常选后者：宁可注册接口慢一下，也不悄悄丢掉一封验证码。

### 4.3 隔离：快慢任务分池，用池名点名

使用方用池名指定：

```java
@Async("mailExecutor")
public void sendSms(String username) { sleep(800); }
```

为什么必须点名，有个一提就懂的坑：你一声明自己的 Executor Bean，默认的 applicationTaskExecutor 就按自动配置的条件注解退位（040 篇的机制）。之后不带名字的 @Async 会找「唯一的 TaskExecutor」——只建一个池时它静默绑定那一个；一旦建了两个池，找不到唯一执行器，就退化为每任务起新线程的 SimpleAsyncTaskExecutor，无上限地造线程。纪律因此很简单：**工程里出现第二个执行器起，所有 @Async 一律显式指定池名**。

隔离的最终目的是保护 Web 请求。Tomcat 处理 HTTP 用自己的线程池（server.tomcat.threads.max，默认 200），@Async 用的是这里的执行器，两者天然分离；分池是把隔离再做到任务之间——慢邮件池堵死，也不占用通知池的一根线程。反面教材是把 2 秒的邮件同步写在请求线程里：高峰期 200 根 Tomcat 线程全在等短信网关，新请求无人接，整个站瘫掉——第 1 节的事故升级版。

## 5. 异常的两种去向：被吞与被装进 Future

异步方法抛了异常，调用方早就返回了，异常往哪去？答案按返回值分两条路。实验先行：

```java
@Async
public void brokenVoid() {
    throw new IllegalStateException("void 里的异常");
}

@Async
public CompletableFuture<String> brokenFuture() {
    throw new IllegalStateException("future 里的异常");
}
```

```java
brokenVoid();                                    // 控制台出现一条 ERROR 日志，主流程毫无感觉
CompletableFuture<String> f = brokenFuture();    // 主流程同样无感
f.exceptionally(ex -> { log.warn("got {}", ex.getMessage()); return "fallback"; });
                                                 // 在这里才第一次感知到失败
```

两条路的规则一张表：

| 返回值 | 异常去向 | 感知方式 |
| --- | --- | --- |
| void | 交给 AsyncUncaughtExceptionHandler，默认行为是记一条 ERROR 日志 | 只能靠日志告警兜底，调用方无从知晓 |
| CompletableFuture | 被捕获装进 Future，不算未捕获异常 | 调用方用 exceptionally、whenComplete 或 join 处理 |

结论：需要感知成败的任务返回 CompletableFuture；只管发射不管结果的任务用 void，但必须给异步日志配告警——默认处理器只是「记下来」，不会通知任何人。

## 6. 虚拟线程瞭望

Boot 3.2 起，一行配置把主要线程资源切到虚拟线程：

```yaml
spring:
  threads:
    virtual:
      enabled: true    # Tomcat 请求处理、@Async 默认执行器、@Scheduled 调度统一切虚拟线程
```

虚拟线程廉价到可以「每任务一根」，IO 密集高并发场景收益明显；CPU 密集没有收益。也要清醒：线程不稀缺不等于资源不稀缺——数据库连接这类真资源依旧有限，第 4 节的隔离思想照旧成立。开启后的行为差异以官方文档为准。

## 7. @Scheduled：让任务到点自己醒

异步解决「来了活怎么不挡路」，定时解决「没活的时候到点自己找活」。先开开关再上注解：

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
```

```java
@Scheduled(cron = "0 0 2 * * *")
public void archive() { /* 凌晨两点归档 */ }
```

### 7.1 cron 六位表达式

Spring 的 cron 是六位（比 Linux crontab 多一个秒位）：秒 分 时 日 月 周。五个常用例子背下来，覆盖日常八成场景：

| 表达式 | 含义 |
| --- | --- |
| 0 0 2 * * * | 每天凌晨 2 点整 |
| 0 */10 * * * * | 每 10 分钟 |
| 0 0 8 * * MON-FRI | 工作日早 8 点 |
| 0 30 9 1 * * | 每月 1 号 9 点 30 |
| 0 0 22 * * FRI | 每周五晚 10 点 |

日期与星期两个字段互斥使用：指定了星期，日期位就放 *。另注意 @Scheduled 方法无参，返回值没有意义。

### 7.2 fixedRate 与 fixedDelay：差在从哪个时刻起算

不背 cron 还有两个简单兄弟，分野一句话：**fixedRate 从上次开始时刻起算，fixedDelay 从上次结束时刻起算**。

```java
@Scheduled(fixedRate = 60000)                        // 上次开始后 1 分钟触发下一轮
public void syncOrders() { /* 拉单同步 */ }

@Scheduled(fixedDelay = 60000, initialDelay = 10000) // 上次结束后 1 分钟；启动后先等 10 秒
public void cleanup() { /* 清理过期数据 */ }
```

差别在任务变慢时才显出分量，本质是背压语义的选择：fixedDelay 天然背压——任务跑 40 秒、间隔配 60 秒，实际周期自动拉长到 100 秒，系统降速，不会越欠越多；fixedRate 节拍固定，任务慢了下一轮被压缩、跑完立即补上（同一任务不会并发跑两份），任务持续慢于周期时就一轮接一轮连轴转。要「每个整分钟一个采样点」选 rate，要「上一轮干完歇会儿再干下一轮」选 delay。initialDelay 解决「应用启动瞬间别开火」：等连接池、缓存都热了再干活。

## 8. 实验：默认调度池只有一根线程

一个几乎人人会踩的坑先复现。@Scheduled 的调度器默认只有一根线程（spring.task.scheduling.pool.size 默认 1）。放两个任务：

```java
@Scheduled(fixedDelay = 10000)
public void heavyJob() throws InterruptedException {
    log.info("heavy start");
    Thread.sleep(8000);                 // 模拟跑了 8 秒的重任务
    log.info("heavy end");
}

@Scheduled(fixedRate = 1000)
public void heartbeat() {
    log.info("tick");
}
```

预期日志：tick 每秒一条，节奏正常；heavy start 出现后，tick **消失整整 8 秒**，heavy end 后才恢复跳动。解释：两个任务排队在同一条调度线程上，heavy 把线程占满，heartbeat 到点了也只能在队列里等。任务一多、任何一个变慢，所有定时任务集体睡过头——第 1 节「凌晨任务没跑」的最常见真相，就是被白天某个慢任务堵了道。

治理两步。第一，把池调大，让任务能并行排队：

```yaml
spring:
  task:
    scheduling:
      pool:
        size: 4
```

改完重启，heavy 期间 tick 照常跳动。第二，用 7.2 的语义兜底：重任务尽量配 fixedDelay 天然限流；同一池内避免放「时长不可控」的任务，避不开就按 4.3 的思路给重任务单独安排。

## 9. 多实例之下：同一个任务跑了三遍

应用从单机扩到三副本的第一周，运营发现归档数据出现三份重复、用户收到三条短信。原因直白：三台机器的 @Scheduled 各自到点各跑一遍，注解对集群没有感知。这是分布式定时任务的第一性问题：**怎么让任务在集群里只跑一份**。三条出路各记一句话：

- 分布式锁：任务开头先抢 Redis 或数据库的锁，抢到的执行、没抢到的直接返回。改动最小，适合任务不多的小系统；
- 外部队列：把「到点执行」改造成「到点往队列投一条消息」，投递收敛在一处（或用锁选出投递者），消费端多实例无状态竞争——正好接上 140 篇的 RabbitMQ；
- 调度平台：XXL-JOB 这类平台统一管理任务编排、失败重试与执行历史，控制台可查可手补，中大型系统的标配。

选主、锁的续期与误删、幂等消费这些深挖，留在 spring-cloud 模块（051-spring-cloud/110）展开。本篇把问题钉住即可：**单机写法上集群之前，先问一句「这任务会不会跑多份」**。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. @Async 生效的两个前提是什么？自调用为什么失效？解法去哪一篇找？
2. 默认的 applicationTaskExecutor 核心几根线程？为什么说它的 maxPoolSize 永远轮不到生效？
3. 线程池四个参数各管什么？「把 max 调大就能更快」为什么是错觉？
4. CallerRunsPolicy 的语义是什么？为什么异步副作用场景常选它？
5. void 与 CompletableFuture 两种 @Async 方法的异常各去了哪？想感知失败该怎么写？
6. fixedRate 与 fixedDelay 对慢任务的行为差异是什么？哪个自带背压？
7. 默认调度池几根线程？一个任务跑 10 分钟的后果是什么？两个治理手段是什么？
8. 应用从 1 台扩到 3 台，定时任务出了什么新问题？三条出路分别是什么？
