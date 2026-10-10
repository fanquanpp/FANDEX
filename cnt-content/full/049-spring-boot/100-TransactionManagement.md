---
order: 120
title: 事务管理：@Transactional 的代理本质与七个失效现场
description: 以「扣库存成功、建订单抛异常却没回滚」的钱货两失事故引入：AOP 代理与事务边界的心智模型、传播机制七种细讲三种、隔离级别与 MVCC 的关系、受检异常默认提交的反直觉实验、七个失效场景逐个最小复现，附 TransactionTemplate 的适用场合。
module: 'spring-boot'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/090-SpringDataJpa'
  - 'spring-boot/030-IoCDependencyInjection'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'spring-boot/110-AspectOrientedProgramming'
  - 'mysql/430-MVCCPrinciple'
---

## 前置知识

- [Spring Data JPA](/spring-boot/090-SpringDataJpa)：会用 repository.save 写库——没读过也能跟，把 save 当成「往表里插一行」即可；
- [IoC 与依赖注入](/spring-boot/030-IoCDependencyInjection)：记得生命周期第 4 步「AOP 代理在后置处理生成」——没读过也能跟，第 3 节现场补心智模型。

## 学习目标

读完本文你将能够：

1. 说清声明式事务里 begin、commit、rollback 各由谁执行，画出一次代理调用的完整路线；
2. 用场景对号七种传播机制，说清 REQUIRES_NEW 与 NESTED 的本质差异；
3. 解释受检异常为什么默认提交，复述 rollbackFor = Exception.class 的工程惯例；
4. 对七个失效现场各给一句成因与一个最小复现，线上事故能按图索骥；
5. 判断什么时候该放弃注解、改用 TransactionTemplate 手动划界。

预计 55 分钟。

## 1. 你现在要解决什么问题

下单接口只有两步：扣库存、建订单。上线第三天，订单服务在「建订单」时因为字段超长抛了异常——运维查库发现库存已经扣了，订单却没有。钱货两失，靠人工对账补偿。你想起数据库本来就有事务：BEGIN 之后的几条 SQL 要么全成、要么全不算。于是你给方法贴上 @Transactional，问题真的消失了——直到某天另一个方法同样贴了注解却没回滚，事故重演。本篇干两件事：先把「这个注解到底是谁在替你提交、谁在替你回滚」的心智模型立起来，它是理解一切失效场景的钥匙；再把七个最容易踩的失效现场逐个复现一遍，让你在事故发生前就见过它们的脸。

## 2. 准备现场：一张扣库存，一张建订单

沿用 090 篇的 H2 + JPA 环境（依赖 spring-boot-starter-data-jpa 与 h2），配置：

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:tx
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
```

两个实体，故意不做 JPA 关联——本篇只关心事务边界，不关心对象关系；库存扣减用条件更新（库存不够时影响行数为 0），比「先查再改」少一个并发漏洞：

```java
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private Integer stock;
    protected Product() { }
    // getter/setter 略
}

@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String sku;
    private Integer quantity;
    protected Order() { }
    // getter/setter 略
}
```

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Modifying
    @Query("update Product p set p.stock = p.stock - :n where p.id = :id and p.stock >= :n")
    int deductStock(Long id, int n);
}

public interface OrderRepository extends JpaRepository<Order, Long> {
}
```

核心服务，两步包在 @Transactional 里：

```java
@Service
public class OrderService {
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public OrderService(ProductRepository productRepository, OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }
    @Transactional
    public Long placeOrder(Long productId, int quantity) {
        int updated = productRepository.deductStock(productId, quantity);
        if (updated == 0) {
            throw new IllegalStateException("库存不足");
        }
        Order order = new Order();
        order.setSku("P-" + productId);
        order.setQuantity(quantity);
        return orderRepository.save(order).getId();
    }
}
```

验证事务真的在工作：

```java
@Bean
CommandLineRunner demo(OrderService orderService, ProductRepository products, OrderRepository orders) {
    return args -> {
        Product p = new Product();
        p.setName("机械键盘");
        p.setStock(10);
        products.save(p);
        orderService.placeOrder(p.getId(), 2);            // 正常下单
        try {
            orderService.placeOrder(p.getId(), 99);       // 库存不足，抛异常
        } catch (Exception e) {
            System.out.println("捕获：" + e.getMessage());
        }
        System.out.println("剩余库存：" + products.findById(p.getId()).orElseThrow().getStock());
        System.out.println("订单条数：" + orders.count());
    };
}
```

```text
捕获：库存不足
剩余库存：8
订单条数：1
```

第二次调用的扣库存被回滚了——10 减 2 得 8，而不是 10 减 2 再减 99 的怪数。本篇要回答的问题是：**这个回滚是谁做的、在哪个时机做的**。

## 3. 心智模型：代理包住方法，事务管理器动手

@Transactional 标注的是「事务边界」，不是数据库行为。真正执行 begin、commit、rollback 的是事务管理器（JPA 场景自动配置的是 JpaTransactionManager），而决定「何时调用它」的是 AOP 代理。两条事实拼出完整模型。

事实一：你注入的 OrderService 不是原类实例，是 CGLIB 生成的子类代理（030 篇生命周期第 4 步的产物）。一行代码证明：打印 `orderService.getClass()`，输出 `class com.example.tx.OrderService$$SpringCGLIB$$0`。

事实二：代理在方法调用的前后插入了事务动作：

```text
调用方 ──调用 placeOrder──> 代理对象
   │ 1 begin：从连接池借连接，autoCommit = false
   ▼
目标对象（你的业务代码，全程用这条连接发 SQL）
   ├─ 正常返回 → 2 commit：connection.commit()
   └─ 抛出异常 → 2 rollback：connection.rollback()，随后归还连接
```

两个推论立刻可用。推论一：**show-sql 里永远看不到 BEGIN 与 COMMIT 语句**——它们不是 SQL，是连接对象的方法调用；初学者在控制台找 begin 找不到、怀疑事务没开，就是没建立这个模型。推论二：**事务与线程绑定**——TransactionSynchronizationManager 用 ThreadLocal 把连接资源挂在当前线程上，同一事务里的所有 SQL 走同一条连接；这个设计正是后面失效场景四（多线程）的病根。

## 4. 传播机制：已有事务时，新方法是加入还是另起炉灶

七种一览（REQUIRED 为默认）：

| 传播机制 | 已有事务时 | 当前无事务 | 一句话场景 |
| --- | --- | --- | --- |
| REQUIRED | 加入当前事务 | 新建事务 | 默认值，绝大多数业务方法 |
| REQUIRES_NEW | 挂起当前，另开独立事务 | 新建事务 | 操作日志流水，成败都要落库 |
| NESTED | 在当前事务内设保存点 | 新建事务 | 批处理中单条失败不拖垮整批 |
| SUPPORTS | 加入 | 以非事务方式执行 | 只读查询，有事务就共享其隔离性 |
| NOT_SUPPORTED | 挂起当前，非事务执行 | 非事务执行 | 大批量导出，不想占着长事务 |
| MANDATORY | 加入 | 抛异常 | 工具方法强制要求调用方带事务 |
| NEVER | 抛异常 | 非事务执行 | 明确禁止在事务里运行的方法 |

三个值得细讲的场景。REQUIRED——一荣俱荣，一损俱损：同一事务内任何一段抛异常，前面已执行的 SQL 全部回滚，第 2 节实验就是它，扣库存与建订单同生共死。

REQUIRES_NEW——日志流水场景。需求：不管下单成败，「谁在何时下过单」都要留痕。内层方法标注 REQUIRES_NEW 后，代理把外层连接挂起、从池里再借一条连接开新事务；跑完即见分晓——审计日志留下，扣库存回滚：

```java
@Transactional
public void placeOrder(Long productId, int quantity) {
    auditService.record("下单", productId);          // REQUIRES_NEW：独立提交，不随下单回滚
    productRepository.deductStock(productId, quantity);
    throw new IllegalStateException("下游故障");      // 外层回滚
}
```

代价与陷阱各记一条：挂起期间外层连接被占着，内层还要新连接，连接池紧张时可能互相等待形成死锁；外层回滚**不会**拖累已独立提交的内层——这既是特性，也是事故源。

NESTED——保存点，不是新事务。它在当前物理事务里打一个 JDBC Savepoint，类似游戏存档：内层回滚只退回存档点，外层继续跑；外层回滚则连同存档一起回滚。与 REQUIRES_NEW 的本质差异一句话：**外层回滚时，NESTED 的成果跟着消失，REQUIRES_NEW 的成果独立存活**。注意它依赖底层资源支持保存点（JDBC 的 Savepoint），部分资源或场景不支持，用前以官方文档为准。

最后一颗雷埋在同一类里：自调用让传播机制整体失灵。

```java
@Transactional
public void outer() {
    this.inner();                     // this 是目标对象，不是代理——传播逻辑长在代理身上
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void inner() { }
```

inner 实际与 outer 同处一个事务，REQUIRES_NEW 形同虚设。修法三条：拆到另一个类（推荐）、注入自身代理、AopContext 暴露代理（需开开关，不推荐）。失效场景清单还会再遇到它。

## 5. 隔离级别：跟随数据库，别轻易越权

@Transactional(isolation = Isolation.READ_COMMITTED)。四个级别与各自防不住的问题：

| 级别 | 防住 | 防不住 |
| --- | --- | --- |
| READ_UNCOMMITTED | 无 | 脏读、不可重复读、幻读 |
| READ_COMMITTED | 脏读 | 不可重复读、幻读 |
| REPEATABLE_READ | 脏读、不可重复读 | 幻读（标准 SQL 层面） |
| SERIALIZABLE | 三者全防 | 并发性能 |

Isolation.DEFAULT 跟随数据库默认——MySQL InnoDB 是 REPEATABLE_READ，且靠 MVCC 与间隙锁把 RR 下的幻读也基本防住，这是 MySQL 对标准的一处超越。RR 凭什么做到读写互不阻塞、间隙锁长什么样，是 [MVCC 原理](/mysql/430-MVCCPrinciple) 的正题，本篇不重复。工程纪律：默认级别覆盖绝大多数场景；改隔离级别之前，先证明你真的遇到了它防不住的那个并发问题。纯查询方法另配 readOnly = true——给框架与驱动一个「不会写」的承诺，能换来内部优化。

## 6. rollbackFor：受检异常默认提交的反直觉

默认回滚范围：RuntimeException 与 Error。受检异常（IOException、SQLException 这类）**默认提交**。亲手验证一次：

```java
@Transactional
public void checkedBombs() throws Exception {
    orderRepository.save(new Order());
    throw new Exception("受检异常");            // 直觉说该回滚，实际提交了
}

// 任意入口调用并接住异常，随后查库：
try {
    s.checkedBombs();
} catch (Exception e) {
    System.out.println("捕获：" + e.getMessage());
}
System.out.println(orders.count());            // 1：订单留下了
```

成因是设计意图：这套默认沿袭 EJB 时代的约定——受检异常被当作「调用方应当预期并处理的业务状况」（比如余额不足、审核不通过），未受检异常被当作「系统级故障」。你可以不同意这个划分，但团队里必须统一。工程惯例：所有写事务统一写 @Transactional(rollbackFor = Exception.class)，把这个哲学问题变成一行模板，杜绝「这个异常算业务还是算故障」的逐案争论。反方向的 noRollbackFor 存在但极少用——想让某个异常不回滚是罕见的明确设计，写时必须留注释。

## 7. 失效场景清单：七个现场，每个一句成因

成因全部指向第 3 节的同一个模型：代理没被经过，或代理没看到异常，或压根没有事务可回滚。

现场一：自调用。第 4 节已复现——this.inner() 绕过代理，事务注解与传播机制一起失效。成因：代理是容器注入的那个对象，this 拿到的是原对象。

现场二：方法非 public。接口代理只增强 public 方法；Spring Framework 6.0 起 CGLIB 代理也支持 protected 与包级可见，但 private 永远不行、接口代理仍要求 public。工程惯例依旧统一 public，不为版本差异埋雷。

现场三：异常被 try-catch 吞掉。

```java
@Transactional
public void swallowed() {
    try {
        orderRepository.save(new Order());
        throw new IllegalStateException("炸了");
    } catch (Exception e) {
        System.out.println("只记日志，不往外抛");
    }
}
// 代理只看「方法有没有往外抛异常」——看到的是正常返回，于是提交
```

修法不是「不许 catch」，而是 catch 之后把异常重抛，或调用 setRollbackOnly 手动表态。

现场四：多线程。事务绑 ThreadLocal，新线程拿不到那条连接：

```java
@Transactional
public void asyncSave() {
    new Thread(() -> orderRepository.save(new Order())).start();   // 另一条连接，自动提交
    throw new IllegalStateException("主线程回滚");                  // 主线程立即回滚
}
// 结果：订单留下了——它从头到尾就没进过这个事务
```

在事务方法里开线程做库操作，写进的不是本事务，也无法被本事务回滚。

现场五：传播用错。给需要事务保护的方法标了 NOT_SUPPORTED（脱离事务执行），异常发生时无事务可回滚；或误以为外层回滚会拖累 REQUIRES_NEW 的内层（第 4 节：不会）。成因：把传播机制当装饰，没对场景。

现场六：类不受 Spring 管理。

```java
public class ReportExporter {              // 没有 @Service，也没被注入
    @Transactional
    public void export() { /* ... */ }
}
// 某处：new ReportExporter().export();     注解只是注释，没有 Bean 就没有代理
```

成因：@Transactional 的全部魔力都建立在「调用必须经过代理」上，new 出来的对象天然没经过。

现场七：存储引擎不支持事务。MySQL 里表引擎是 MyISAM 时，SQL 执行成功即落盘，注解再正确也无事可回滚。成因：事务是数据库的能力，Spring 只是调度它。排查命令 SHOW TABLE STATUS 看引擎列。

排查心法收束成一句：**先确认调用经过了代理（谁注入的、有没有 this），再确认异常飞出了方法边界，最后确认底下的引擎真的支持事务**——三层检查覆盖绝大多数「注解不生效」工单。

## 8. TransactionTemplate：注解表达不了的边界

两个场景注解无能为力。其一，事务范围小于方法范围：方法前半段是文件解析，不该占着数据库事务。其二，部分提交：导入一千条数据，每两百条提交一次，失败只回滚当前批。编程式事务把边界写在代码里：

```java
@Service
public class ImportService {

    private final TransactionTemplate tx;             // Boot 自动配置了该 Bean
    private final ProductRepository products;

    public ImportService(TransactionTemplate tx, ProductRepository products) {
        this.tx = tx;
        this.products = products;
    }

    public int importProducts(List<Product> all) {
        int committed = 0;
        for (int i = 0; i < all.size(); i += 200) {
            List<Product> batch = all.subList(i, Math.min(i + 200, all.size()));
            tx.executeWithoutResult(status -> products.saveAll(batch));   // 每批一个独立事务
            committed += batch.size();
        }
        return committed;
    }
}
```

需要「受检异常也回滚」时，在回调里手动表态：status.setRollbackOnly()。判断标准一句话：**边界跟方法重合用注解，边界跟方法错开用模板**。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. @Transactional 标注的是什么？begin、commit、rollback 分别由谁执行？为什么 show-sql 里看不到 BEGIN 与 COMMIT 语句？
2. 一次代理调用从进入到返回经过哪几步？注入的 OrderService 是目标对象还是代理？怎么用一行代码证明？
3. 外层回滚时 REQUIRED、REQUIRES_NEW、NESTED 各发生什么？内层回滚时呢？NESTED 依赖底层资源的什么能力？
4. 受检异常为什么默认提交？这个默认沿袭了谁的约定？团队惯例怎么把它变成非议题？
5. 同类内 this.inner() 为什么让传播机制失灵？三条修法里工程上推荐哪条？
6. 七个失效现场各用一句话说成因：自调用、非 public、吞异常、多线程、传播用错、类不受管、引擎不支持。
7. 「注解不生效」工单的三层排查心法是什么？
8. 事务边界与方法边界错开时用什么？部分提交怎么写？受检异常想回滚怎么手动表态？
