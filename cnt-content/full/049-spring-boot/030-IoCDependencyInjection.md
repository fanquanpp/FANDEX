---
order: 30
title: IoC 与依赖注入：把对象的组装权交给容器
description: 以「new 出来的支付服务换不了实现」引入：控制反转的心智模型、声明 Bean 的两条路、注入三式对比、生命周期七步主线、singleton 与 prototype 陷阱、三级缓存与循环依赖裁决，附创建顺序观察与循环依赖报错实录两个实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/020-FirstApplication'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/040-AutoConfigurationInternals'
  - 'spring-boot/110-AspectOrientedProgramming'
---

## 前置知识

- 已完成 [第一个应用](/spring-boot/020-FirstApplication)：能跑起工程，知道组件扫描的范围是主类所在包及子包；
- 见过依赖注入的写法即可（[Spring 基础](/java/820-SpringIoCContainerBeansAndDI) 读过最好，没读过也能跟，第 3 节现场补心智模型）。

## 学习目标

读完本文你将能够：

1. 用「组装权上移」解释控制反转到底反转了什么，说出容器内部那张「地图」的结构与查找规则；
2. 按「类是谁的」选择声明 Bean 的正确路径，并论证构造器注入为何是官方推荐；
3. 复述 Bean 生命周期七步，指出注入、@PostConstruct、AOP 代理各发生在哪一步；
4. 解释 singleton 依赖 prototype 的退化成因并给出出路；
5. 读懂循环依赖报错，说清三级缓存救得了谁救不了谁，并用重构正确修掉。

预计 55 分钟。

## 1. 你现在要解决什么问题

订单服务要调支付服务，最本能的写法是 `private PaymentService paymentService = new AliPayService();`。写死的代价马上到来：产品要切微信支付，你得改源码、重新编译发版，还要找出所有 new 过的地方；测试同事要单测 OrderService，new 出来的支付服务却会真的去调网关；运维要给支付客户端加超时配置，配置却散落在每个 new 的参数里。三件事指向同一个病根：**OrderService 既在干活，又在管组装**，组装知识散落在每个使用方手里。本篇把组装这份工作整体收走——交给 IoC 容器，并把容器的规则一次讲透：Bean 从哪来、依赖怎么进、生老病死怎么走、绕成环了怎么办。

## 2. 准备现场：先跑通一条自动接通的依赖链

新建最小工程（或沿用 020 的），依赖只需 spring-boot-starter，不需要 Web。三个文件，包名均为 com.example.ioc：

```java
public interface PaymentService {

    String pay(String orderId);
}
```

```java
import org.springframework.stereotype.Service;

@Service
public class AliPayService implements PaymentService {

    public AliPayService() {
        System.out.println("构造 AliPayService");
    }

    @Override
    public String pay(String orderId) {
        return "ali:" + orderId;
    }
}
```

```java
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final PaymentService paymentService;

    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
        System.out.println("构造 OrderService（依赖已注入：" + (paymentService != null) + "）");
    }

    public String createOrder(String orderId) {
        return paymentService.pay(orderId);
    }
}
```

启动，观察日志顺序：

```text
构造 AliPayService
构造 OrderService（依赖已注入：true）
```

两个事实一次到手。其一，你一行 new 都没写，OrderService 与 AliPayService 之间的依赖链已自动接通——这个「true」就是注入成功的证据。其二，**依赖先于使用方创建**：容器按依赖图拓扑排序，先造 AliPayService 才能把它塞进 OrderService；而且这一切发生在启动的 refresh 阶段（020 篇八步的第 8 步），不是等第一次使用。这套现场是后面所有小节的公共素材。

## 3. 心智模型：组装权上移，容器是一张地图

控制反转（IoC）用一句话说清：**把「找依赖、组装依赖」的职责，从每个类手里反转给容器**。类只负责干活与声明需求；怎么构造、用哪个实现、什么时候创建，全部上移统一裁决。容器内部可以想象成一张地图：

```text
容器启动后的地图（简化视角）
  "orderService"  (OrderService 类型)     → 一个 OrderService 实例
  "aliPayService" (PaymentService 类型)   → 一个 AliPayService 实例
查找规则
  按类型：PaymentService 只有一个 → 构造器参数直接匹配给你
  按名字：类型有多个时，先按类型缩小范围，再按参数名或限定符挑
```

破除一个神秘化想象：容器不是魔法，它是一张提前组装好的「名字与类型到实例」的注册表。所谓依赖注入，不过是你声明构造器参数，容器从地图里取出匹配的实例塞进去。日常的 ApplicationContext 就是这张地图的编程接口——取 Bean、发事件、感知容器都在它身上，020 篇第 4 步创建的正是它。

## 4. 声明 Bean 的两条路

让一个类进入地图只有两条路，按「类是谁的」来选。

第一条：**组件扫描**，用在自己写的类上。加 @Component 即可；@Service、@Repository、@Controller 是它的语义化别名，功能同源而语义不同——分层含义给两方看：给人看，一眼识别这层职责；给框架增强看，例如 @Repository 附带把数据库异常转译成统一的 DataAccessException。第 2 节两个类走的就是这条路。

第二条：**@Configuration 加 @Bean**，用在第三方类上。别人的类改不了源码、加不了注解，就在配置类里手写工厂方法：

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ThirdPartyConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();   // 方法名即 Bean 名，返回值进地图，参数同样享受注入
    }
}
```

分工判断一句话：业务类走第一条路；框架与第三方组件（连接池、客户端、模板引擎配置对象）走第二条路。040 篇的自动配置，本质就是框架替你预写好的一大堆第二条路。

## 5. 注入三式：构造器为什么是官方推荐

构造器注入已在第 2 节见过。同一个依赖的另外两种姿势：

```java
@Service
public class ReportService {
    private PdfGenerator pdfGenerator;

    @Autowired(required = false)   // setter 注入：真可选依赖；没有也不报错，值为 null
    public void setPdfGenerator(PdfGenerator pdfGenerator) {
        this.pdfGenerator = pdfGenerator;
    }
}

// 字段注入：被劝退，仅老代码常见
@Autowired
private PaymentService paymentService;
```

| 维度 | 构造器注入 | setter 注入 | 字段注入 |
| --- | --- | --- | --- |
| 可声明 final | 可以 | 不可以 | 不可以 |
| 依赖显式度 | 构造器签名即依赖清单 | 分散在各 setter | 藏在类体里 |
| 脱容器单测 | new 传假实现即测 | set 之后可测 | 必须反射注值 |
| 依赖缺失暴露 | 启动即失败，最早 | 运行到才炸或静默 null | 启动即失败 |
| 强制依赖表达 | 天然（参数必填） | 弱 | 弱 |

推荐理由就是第一列到第四列：不可变、显式、易测、缺依赖在启动期炸而不是运行期埋雷；Spring 4.3 起单构造器免写 @Autowired，等于官方用语法糖站了队。工程守则：强制依赖用构造器，真可选依赖用 setter，字段注入留给历史代码。

多实现冲突是迟早的事：容器里出现两个 PaymentService 时按类型注入直接报错，两个注解二选一化解。

```java
@Service
@Primary                      // 全项目默认：不指定时用它
public class AliPayService implements PaymentService {
    @Override
    public String pay(String orderId) { return "ali:" + orderId; }
}

@Service("wechatPay")         // Bean 名字：指名道姓时用它
public class WechatPayService implements PaymentService {
    @Override
    public String pay(String orderId) { return "wechat:" + orderId; }
}

// 使用处二选一
public OrderService(@Qualifier("wechatPay") PaymentService paymentService) { }
```

## 6. Bean 生命周期主线：七步

```text
1 实例化        调构造器，对象只是半成品，依赖尚未注入
2 属性填充      按类型或名字注入依赖，@Autowired 的注值发生在这里
3 Aware 回调    BeanNameAware、ApplicationContextAware 等，把框架内部组件递给你
4 前后处理      BeanPostProcessor 前后处理：前置后走初始化，AOP 代理在后置生成
5 初始化        @PostConstruct 方法 → afterPropertiesSet → @Bean(initMethod=...) 依序执行
6 就绪          放入一级缓存，全应用共用
7 销毁          容器关闭时：@PreDestroy → destroy() → @Bean(destroyMethod=...) 依序执行
```

探针类验证关键节点（此处故意用字段注入，只为演示第 2 步；工程代码仍用构造器）：

```java
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LifecycleProbe {
    @Autowired
    private PaymentService paymentService;

    public LifecycleProbe() {
        System.out.println("1 构造器：paymentService = " + paymentService);
    }

    @PostConstruct
    public void ready() {
        System.out.println("5 初始化：paymentService = " + paymentService);
    }
    @PreDestroy
    public void bye() {
        System.out.println("7 销毁：容器关闭时触发");
    }
}
```

```text
1 构造器：paymentService = null
5 初始化：paymentService = com.example.ioc.AliPayService@4f241060
7 销毁：容器关闭时触发
```

第 1 步输出 null 是最有价值的证据：构造器执行时依赖还没来——所以「在构造器里做依赖相关初始化」是错的，该做的事放 @PostConstruct。第 4 步的 BeanPostProcessor 是框架级扩展点：@Autowired 的注值发生在前置处理，AOP 代理在后置生成（110 篇的 AOP 就在这里），应用层知道存在即可。第 7 步有一条边界必须记住：**销毁回调只对 singleton 生效**——prototype Bean 创建后容器不再追踪，@PreDestroy 不会有人调用，清理要自己负责。

## 7. 作用域：singleton 默认与 prototype 陷阱

默认作用域 singleton：每个 Bean 名字在容器里只有一份实例。另一个常用作用域 prototype：类上加 @Scope("prototype")，此后每次向容器要，都造新的。

陷阱：**singleton 注入 prototype，prototype 变相退化为 singleton**。

```java
@Service
public class ReportFactory {
    private final Report report;      // 注入发生在 ReportFactory 创建那一刻

    public ReportFactory(Report report) {
        this.report = report;         // 从此永远持有同一个 Report
    }

    public Report newReport() {
        return report;                // 方法名叫 newReport，返回的却是同一个实例
    }
}
```

成因是生命周期时序：ReportFactory 是 singleton，只在启动时创建一次，属性填充（第 2 步）也只发生一次，prototype 的「每次都要新的」根本没有执行机会。出路两条、思路一致——把「找容器」延迟到每次使用时：

```java
@Service
public class ReportFactory {
    private final ObjectProvider<Report> reports;   // 持有的是取件码，不是货

    public ReportFactory(ObjectProvider<Report> reports) {
        this.reports = reports;
    }
    public Report newReport() {
        return reports.getObject();     // 每次调用才真正找容器要，拿到崭新的 prototype
    }
}
```

另一条是 @Lookup：在方法上声明，容器重写该方法返回新实例，效果相同。补一个易混点：singleton 是**容器级**单例，不是 JVM 级——测试里手动 new 两个 ApplicationContext，同名 Bean 会是两个不同实例。

## 8. 循环依赖：三级缓存救得了谁

把两个类绕成环——OrderService 依赖 NotificationService，反过来也是：

```java
@Service
public class OrderService {
    private final NotificationService notificationService;
    public OrderService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }
}
@Service
public class NotificationService {
    private final OrderService orderService;
    public NotificationService(OrderService orderService) {
        this.orderService = orderService;
    }
}
```

启动即失败，报错值得逐行读（排版细节随版本略有差异）：

```text
***************************
APPLICATION FAILED TO START
***************************

Description:

The dependencies of some of the beans in the application context form a cycle:

┌─────┐
|  orderService
↑     ↓
|  notificationService
└─────┘

Action:

Relying upon circular references is discouraged and they are prohibited by default.
As a last resort, it may be possible to break the cycle automatically by setting
spring.main.allow-circular-references to true.
```

Spring Boot 自 2.6 起**默认拒绝循环依赖**，这段报错就是默认行为。环有时能活有时不能，钥匙在内部的三级缓存：

| 缓存 | 存什么 | 何时登场 |
| --- | --- | --- |
| 一级 singletonObjects | 完全初始化好的成品 Bean | 平时取 Bean 都从这里拿 |
| 二级 earlySingletonObjects | 提前曝光的半成品（可能已是代理） | 循环依赖中对方来要引用时 |
| 三级 singletonFactories | 能生产早期引用的 ObjectFactory | 实例化完成后、属性填充前放入 |

假设把环改成 setter 注入、并临时打开 allow-circular-references，容器这样解环：

```text
getBean(orderService)：一级没有，orderService 进入「创建中」名单
  实例化（构造器跑完，得到半成品），「能拿到它早期引用」的工厂放入三级缓存
  属性填充：需要 notificationService → getBean(notificationService)
    同样实例化、工厂入三级缓存；它的属性填充需要 orderService
      orderService 在创建中名单里 → 三级缓存的工厂出马给出早期引用
      （需要 AOP 时顺手生成代理），引用升入二级缓存，三级工厂删除
    notificationService 完成初始化进一级缓存，orderService 随后拿到成品——环解开
```

三级缓存存工厂而不是直接存对象，是为了提前曝光那一刻有机会先做 AOP 代理。而**构造器注入的环无解**：往三级缓存放工厂的前提是对象已完成实例化，可构造器正是实例化那一步——要造 A 的构造参数得先有 B，造 B 又得先有 A，连半成品都不存在，没有任何东西可以提前曝光。所以构造器循环依赖连开关都救不了，开了 allow-circular-references 照样失败。

正确的修法是重构，不是开开关：环说明两个类纠缠了同一份职责，拆出第三个类让依赖变直线，或用事件解耦。@Lazy 标在注入点可以临时止血——注入的是代理，首次调用才真正解析——但那是绷带不是治疗。Action 里「最后手段」四个字读清楚：框架作者和你站同一边，劝你拆环。

## 9. 官方参考

- Spring Framework IoC 容器章节：https://docs.spring.io/spring-framework/reference/core/beans.html
- Spring Boot 官方文档：https://docs.spring.io/spring-boot/index.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 控制反转反转的到底是什么？容器地图的键与值各是什么？按类型与按名字的查找规则分别是什么？
2. 声明 Bean 的两条路各适合什么类？@Service 与 @Component 的差别在什么层面，@Repository 多出的框架增强是什么？
3. 构造器注入被推荐的四个理由？字段注入被劝退的核心原因？
4. 生命周期七步里，@Autowired 注值在哪步、@PostConstruct 在哪步、AOP 代理生成在哪步？为什么构造器里做依赖相关初始化是错的？
5. singleton 是谁的 singleton？两个 ApplicationContext 里的同名 Bean 是同一份吗？prototype 的 @PreDestroy 会有人调吗？
6. singleton 注入 prototype 为什么退化？两条出路各自靠什么机制？
7. 三级缓存各自存什么？为什么存工厂而不直接存对象？构造器注入的环为什么连开关都救不了？
8. Spring Boot 2.6 起对循环依赖的默认行为是什么？正确的修法是什么，@Lazy 属于哪一类手段？
