---
order: 730
title: Spring 声明式事务：传播行为、隔离级别与失效场景
module: 'java'
category: 后端技术
difficulty: beginner
description: '@Transactional 的代理实现原理（TransactionInterceptor）、七种传播行为的语义与选型、隔离级别与数据库的关系、事务失效六场景（自调用、private、final、异常被吞、checked 不回滚、多线程）；用转账 REQUIRES_NEW 日志、下单多表一致性、并发转账死锁三个场景落地。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/820-SpringIoCContainerBeansAndDI'
  - 'java/825-SpringAOP'
  - 'java/720-JavaDatabaseConnection'
  - 'mysql/460-TransactionLockMechanism'
prerequisites:
  - 'java/825-SpringAOP'
  - 'mysql/460-TransactionLockMechanism'
---

## 知识点地图

- **知识类别**：声明式事务管理——Spring Framework 官方文档 *Data Access* 卷的 Transaction Management 一章。
- **解决什么问题**：一次业务要写多张表（下单 = 扣库存 + 生成订单 + 记流水），任何一步失败都必须整体回滚；手写 commit/rollback 会把事务样板代码糊满业务层。`@Transactional` 用一个注解把事务边界交给代理管理。
- **什么时候用到**：多表写一致性场景（下单、转账、审批流）；需要部分操作独立提交（日志/通知）的传播行为设计；排查「数据不一致」「事务没回滚」「死锁」这类生产问题。

## 前置知识

- [Spring AOP](/java/825-SpringAOP)：`@Transactional` 就是 AOP 代理实现，自调用失效的根源在代理；本篇反复引用其 9.2 节；
- [MySQL 事务与锁机制](/mysql/460-TransactionLockMechanism)：隔离级别的数据库侧语义（脏读/不可重复读/幻读）；
- [JDBC 数据库连接](/java/720-JavaDatabaseConnection)：`Connection.setAutoCommit(false)` 是声明式事务在底层替你做的事。

## 学习目标

读完本文你将能够：

1. 解释 `@Transactional` 从注解到 `Connection` 提交/回滚的完整链路（TransactionInterceptor）；
2. 说出七种传播行为各自「有事务/无事务」时的表现，并给日志类操作选对 REQUIRES_NEW；
3. 说出隔离级别在 Spring 注解上怎么配、与 MySQL 默认级别的关系；
4. 背出事务失效六场景并给出修复，理解它们共同的代理根源；
5. 解释并发转账死锁的成因与「统一加锁顺序」修复。

预计 70 分钟，含 1 个找错环节与 2 道动手任务。本篇由原 Spring 基础篇拆分而来，事务主题内容全部收拢于此。

## 1. 声明式事务的实现原理：TransactionInterceptor

`@Transactional` 基于 AOP 代理实现。Spring 创建事务代理的核心是 `TransactionInterceptor`：

```java
// TransactionInterceptor 简化逻辑
public class TransactionInterceptor extends TransactionAspectSupport {
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // 1. 获取事务属性（@Transactional 配置）
        TransactionAttribute txAttr = getTransactionAttribute(invocation.getMethod(), targetClass);

        // 2. 获取事务管理器
        PlatformTransactionManager tm = determineTransactionManager(txAttr);

        // 3. 创建事务（根据传播行为决定是否新建）
        TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, methodIdentification);

        Object retVal;
        try {
            // 4. 执行目标方法
            retVal = invocation.proceed();
        } catch (Throwable ex) {
            // 5. 异常处理：根据 rollbackFor 判断是否回滚
            completeTransactionAfterThrowing(txInfo, ex);
            throw ex;
        } finally {
            cleanupTransactionInfo(txInfo);
        }

        // 6. 提交事务
        commitTransactionAfterReturning(txInfo);
        return retVal;
    }
}
```

**逐段讲解**：

1. 第 1 步从方法（或类）上读出 `@Transactional` 的全部配置——注解不是魔法，只是配置载体；真正干活的是这个拦截器。
2. 第 4 步 `proceed()` 执行的是你的业务方法；第 5 步捕获异常后**先按 rollbackFor 判断要不要标记回滚，再把异常原样抛出**——「异常被吞」之所以致命（第 5 节），就是因为这段 catch 收不到信号。
3. 第 6 步正常返回才提交。整个流程与 825 篇 2.2 节 JDK 代理的 try-catch-finally 模板一一对应——事务就是一种「前置开启、异常回滚、正常提交」的环绕通知。

## 2. 传播行为：嵌套事务方法的语义

### 2.1 形式化定义

事务传播行为定义了事务方法的嵌套语义：

$$
Propagation = \{ REQUIRED, REQUIRES\_NEW, NESTED, SUPPORTS, NOT\_SUPPORTED, NEVER, MANDATORY \}
$$

设外层事务为 $T_{outer}$，内层方法的事务为 $T_{inner}$：

- **REQUIRED**：$T_{inner} = T_{outer}$（若存在），否则新建。默认值。
- **REQUIRES_NEW**：$T_{inner}$ 始终新建，$T_{outer}$ 挂起。
- **NESTED**：$T_{inner}$ 在 $T_{outer}$ 中创建保存点，可独立回滚但不独立提交。
- **SUPPORTS**：$T_{inner} = T_{outer}$（若存在），否则无事务运行。
- **NOT_SUPPORTED**：$T_{inner}$ 无事务，$T_{outer}$ 挂起。
- **NEVER**：若 $T_{outer}$ 存在则抛异常。
- **MANDATORY**：若 $T_{outer}$ 不存在则抛异常。

### 2.2 实战代码：转账与独立日志

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Isolation;

/**
 * 转账服务
 * 演示声明式事务的使用与传播行为
 */
@Service
public class TransferService {

    private final AccountRepository accountRepository;
    private final LogService logService;

    public TransferService(AccountRepository accountRepository, LogService logService) {
        this.accountRepository = accountRepository;
        this.logService = logService;
    }

    /**
     * 转账主方法
     * @Transactional 参数说明：
     *   - propagation: 事务传播行为
     *   - isolation: 事务隔离级别
     *   - timeout: 事务超时时间（秒）
     *   - readOnly: 是否只读事务（优化提示）
     *   - rollbackFor: 触发回滚的异常类型
     *   - noRollbackFor: 不触发回滚的异常类型
     */
    @Transactional(
        propagation = Propagation.REQUIRED,
        isolation = Isolation.READ_COMMITTED,
        timeout = 30,
        rollbackFor = { BusinessException.class, RuntimeException.class }
    )
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new BusinessException("付款账户不存在"));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new BusinessException("收款账户不存在"));

        if (from.getBalance().compareTo(amount) < 0) {
            throw new BusinessException("余额不足");
        }

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepository.save(from);
        accountRepository.save(to);

        // 调用日志服务（REQUIRES_NEW 独立事务）
        logService.recordTransferLog(fromId, toId, amount);
    }
}

/**
 * 日志服务
 * 使用 REQUIRES_NEW 独立事务，即使主事务回滚，日志仍保存
 */
@Service
public class LogService {

    private final LogRepository logRepository;

    public LogService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordTransferLog(Long fromId, Long toId, BigDecimal amount) {
        TransferLog log = new TransferLog();
        log.setFromId(fromId);
        log.setToId(toId);
        log.setAmount(amount);
        log.setTimestamp(LocalDateTime.now());
        logRepository.save(log);
    }
}

/**
 * 自定义业务异常
 * 继承 RuntimeException，默认触发事务回滚
 */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
```

**逐段讲解**：

1. 主方法 `REQUIRED`（默认）：被调用时已有事务就加入，没有就新建——90% 的业务方法用默认值即可。
2. 日志服务用 `REQUIRES_NEW`：转账失败回滚时，**「谁尝试转账失败了」这条审计日志必须留下来**。若日志也用 REQUIRED，它会跟随主事务一起回滚，审计就哑了。
3. `REQUIRES_NEW` 的代价：主事务挂起、数据库多占一个连接。日志方法里再回去调主事务相关的表，容易与挂起的锁形成自等待——所以 REQUIRES_NEW 的方法要「短、独立、不碰主事务的数据」。
4. `rollbackFor` 显式列出了业务异常：即使它继承 RuntimeException（默认就回滚），写出来也是给阅读者的契约声明；真正必要的是 checked 异常场景（第 5.4 节）。

### 2.3 三个场景的传播行为选型

- **场景一（审计/通知类）**：主业务回滚也要留痕（转账日志、告警通知）——`REQUIRES_NEW`。
- **场景二（下单多表写一致性，真实工程）**：扣库存、建订单、清购物车三个方法都保持默认 REQUIRED，让它们并入 `createOrder` 的同一个事务；购物车清理失败不该单独提交，也绝不能影响订单主流程回滚——全 REQUIRED 同生共死。这里容易误用 REQUIRES_NEW：拆成独立事务后「订单回滚了购物车却清了」，数据反而不一致。
- **场景三（批量导入的分组提交）**：导入 10 万条数据按 1000 条一批提交，批次失败只回滚该批——每批一个新事务，用编程式事务（`TransactionTemplate`）比注解更合适（见第 4 节对比）。

## 3. 隔离级别与只读优化

`@Transactional` 的 `isolation` 参数把数据库隔离级别声明在方法上（可选值与语义详见 [MySQL 事务与锁机制](/mysql/460-TransactionLockMechanism)）：

| Spring 隔离级别 | 对应数据库级别 | 解决的问题 |
| --- | --- | --- |
| DEFAULT | 用数据库默认值（MySQL InnoDB 为 REPEATABLE READ） | 绝大多数场景 |
| READ_UNCOMMITTED | 读未提交 | 无，允许脏读 |
| READ_COMMITTED | 读已提交 | 脏读 |
| REPEATABLE_READ | 可重复读 | 脏读、不可重复读 |
| SERIALIZABLE | 串行化 | 全部，代价最高 |

**实践要点**：

1. 不配就是 `DEFAULT`，跟随数据库——多数系统什么都不用写；
2. 报表/对账查询配 `readOnly = true`：驱动能做只读优化（MySQL 下不发 binlog 相关设置、连接层省检查），Spring 也会提示 ORM 关闭脏检查；
3. Spring 的隔离级别声明依赖底层资源支持：切换数据库时注解上的级别含义跟着变，跨库部署要重查一遍。

## 4. 事务管理方式对比

| 特性 | 编程式事务 | 声明式事务 |
|------|-----------|-----------|
| 实现 | TransactionTemplate / PlatformTransactionManager | @Transactional 注解 |
| 灵活性 | 高（可精确控制范围） | 低（方法或类级别） |
| 侵入性 | 有（业务代码含事务 API） | 无（业务代码无感知） |
| 可读性 | 差 | 优 |
| 适用场景 | 细粒度控制、复杂事务边界 | 常规业务（90% 场景） |

**换写法会发生什么**：把「只有三行要事务」的大方法整体标 `@Transactional`，事务里裹进了远程调用或耗时计算——连接被长时间占用，连接池耗尽。这时该用编程式事务把边界缩到那三行，或把事务部分抽成独立方法。

## 5. 事务失效六场景：全部是「没走代理」

### 5.1 反模式：自调用导致事务失效

**问题**：

```java
@Service
public class OrderService {

    public void batchCreateOrders(List<OrderDTO> orders) {
        for (OrderDTO dto : orders) {
            this.createOrder(dto);  // 自调用，事务失效
        }
    }

    @Transactional
    public void createOrder(OrderDTO dto) {
        // 事务逻辑
    }
}
```

**原因**：`this.createOrder()` 中的 `this` 是目标对象（原始类实例），而非代理对象。事务由代理对象拦截方法调用触发，`this` 调用绕过代理，事务不生效。

**修复方案**：

```java
// 方案一：注入自身代理
@Service
public class OrderService {
    @Autowired
    private OrderService self;  // Spring 注入的是代理对象

    public void batchCreateOrders(List<OrderDTO> orders) {
        for (OrderDTO dto : orders) {
            self.createOrder(dto);  // 通过代理调用
        }
    }
}

// 方案二：拆分到两个类
@Service
public class OrderBatchService {
    @Autowired
    private OrderService orderService;

    public void batchCreate(List<OrderDTO> orders) {
        for (OrderDTO dto : orders) {
            orderService.createOrder(dto);
        }
    }
}
```

### 5.2 反模式：@Transactional 标注在 private 方法

**问题**：

```java
@Service
public class UserService {
    @Transactional
    private void createUser(User user) {  // private 方法，事务失效
        userRepository.save(user);
    }
}
```

**原因**：Spring AOP 基于动态代理，JDK 代理仅能代理接口方法（public），CGLIB 通过生成子类覆盖方法（无法覆盖 private / final）。

**修复**：将方法改为 `public`，或抽取到单独的 Service 类。

### 5.3 反模式：异常被吞导致事务不回滚

**问题**：

```java
@Service
public class TransferService {
    @Transactional
    public void transfer(Long from, Long to, BigDecimal amount) {
        try {
            accountRepository.deduct(from, amount);
            accountRepository.add(to, amount);
        } catch (Exception e) {
            log.error("转账失败", e);
            // 异常被吞，事务管理器收不到异常，不回滚
        }
    }
}
```

**修复**：

```java
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) {
    try {
        accountRepository.deduct(from, amount);
        accountRepository.add(to, amount);
    } catch (Exception e) {
        log.error("转账失败", e);
        throw new BusinessException("转账失败", e);  // 重新抛出，触发回滚
    }
}
```

### 5.4 反模式：checked 异常不回滚

**问题**：

```java
@Transactional
public void importUsers(File file) throws IOException {
    // IOException 是 checked 异常，默认不触发回滚
    try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
        // ... 解析并保存
        throw new IOException("文件读取中断");  // 不回滚！
    }
}
```

**原因**：Spring 默认仅对 `RuntimeException` 与 `Error` 回滚，checked 异常需显式指定 `rollbackFor`。

**修复**：

```java
@Transactional(rollbackFor = IOException.class)
public void importUsers(File file) throws IOException {
    // ...
}
```

### 5.5 失效根因小结

事务失效的根本原因都是「未通过代理对象调用」或「事务管理器收不到回滚信号」：

1. **自调用**：`this.method()` 而非 `proxy.method()`，`this` 是目标对象而非代理。
2. **非 public 方法**：Spring AOP 默认仅代理 public 方法。
3. **final / static 方法**：无法被 CGLIB 覆盖或 JDK 代理。
4. **异常被吞**：try-catch 吞掉异常，事务管理器收不到异常信号。
5. **异常类型不匹配**：默认仅回滚 `RuntimeException` 与 `Error`，checked 异常需 `rollbackFor` 指定。
6. **多线程**：事务基于 ThreadLocal，子线程无法继承事务上下文。

排查口诀：**「注解不生效，先查代理路」**——从调用入口到注解方法，中间任何一步从 `this` 发起、或换了线程，事务就断了。

## 6. 案例：事务传播导致死锁

**场景**：某银行转账系统高峰期出现死锁，数据库报 `Deadlock found when trying to get lock; try restarting transaction`。

**根因**：

```java
@Service
public class TransferService {
    @Transactional
    public void transfer(Long from, Long to, BigDecimal amount) {
        // 反向转账也使用相同顺序：from -> to
        accountRepository.lock(from);  // 加行锁
        accountRepository.lock(to);
        // ... 转账逻辑
    }
}
```

两个并发请求：A 转 B，B 转 A。请求 1 锁定 A 后等待 B，请求 2 锁定 B 后等待 A，形成死锁。

**修复**：统一加锁顺序（按账户 ID 升序）。

```java
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) {
    // 保证加锁顺序一致
    Long first = Math.min(from, to);
    Long second = Math.max(from, to);
    accountRepository.lock(first);
    accountRepository.lock(second);

    if (from < to) {
        // from 是 first，已加锁
        deduct(from, amount);
        add(to, amount);
    } else {
        // to 是 first，已加锁
        add(to, amount);
        deduct(from, amount);
    }
}
```

**延伸**：本例的锁顺序问题在数据库层（行锁），但事务边界越长（`@Transactional` 方法越大、里面裹的表越多），死锁窗口越大。控制事务「短而窄」是死锁治理的第一原则；传播行为误用（REQUIRES_NEW 里再碰主事务的行）会人为制造同一事务内的自等待，是第二常见来源。

## 7. 习题

### 7.1 进阶题：@Transactional 事务失效的常见场景及修复方案

**参考答案要点**：

1. 自调用：通过代理对象调用（注入自身或拆分类）。
2. 非 public 方法：改为 public。
3. final / static 方法：改为实例方法并去掉 final。
4. 异常被吞：重新抛出异常。
5. checked 异常：`@Transactional(rollbackFor = Exception.class)`。
6. 多线程：使用编程式事务或事务同步器传播上下文。

## 8. 动手实践

### 任务一：给下单流程补事务（热身）

写 `OrderService.createOrder`：依次调用 `stockService.deduct(itemId, n)` 与 `orderRepository.save(order)`，并在末尾调用 `notifyService.push(orderId)`（短信通知，要求订单回滚时短信绝不能发出去）。给三个方法标注正确的传播行为。

提示：想清楚「通知随主事务回滚」与「通知必须独立」分别是哪种需求，本题要的是哪一种。

### 任务二：找错——这个事务为什么不回滚（实战）

下面的代码在 `deduct` 抛出异常后，`add` 的写入依然生效了。找出所有原因：

```java
@Service
public class TransferService {

    @Transactional
    public void transfer(String from, String to, BigDecimal amount) {
        try {
            accountRepository.deduct(from, amount);
            accountRepository.add(to, amount);
        } catch (Exception e) {
            log.warn("转账失败，忽略：{}", e.getMessage());
        }
        auditService.record(from, to, amount);   // REQUIRES_NEW
    }
}
```

提示一：异常还能到达 TransactionInterceptor 吗？提示二：如果 catch 里改成 `throw new IOException("io")`（方法签名 throws IOException），回滚吗？

**参考实现（先自己写完再展开对照）**：

```java
@Transactional(rollbackFor = IOException.class)
public void transfer(String from, String to, BigDecimal amount) {
    try {
        accountRepository.deduct(from, amount);
        accountRepository.add(to, amount);
    } catch (Exception e) {
        log.warn("转账失败", e);
        throw new BusinessException("转账失败", e);   // 修正一：异常必须重新抛出，让代理收到信号
    }
    auditService.record(from, to, amount);
}
```

原代码异常被 catch 吞掉，第 1 节 TransactionInterceptor 的 catch 分支根本没有执行机会，事务照常提交——`deduct` 的修改和 `add` 一起生效，账就错了。若抛的是 checked 异常（IOException），即使到达代理，默认回滚规则也只认 RuntimeException/Error，必须补 `rollbackFor`。两处是两类独立的失效原因，同时存在时逐个排除。

### 任务三：传播行为验证器

写两个 Service：`OuterService.run()`（REQUIRED）内部调用 `InnerService.step()`。依次试验四种组合——step 为 REQUIRED / REQUIRES_NEW / NESTED / NEVER——每次让 step 内部抛异常，观察外层捕获后数据库里各留下什么。用 H2 或本地 MySQL 建一张测试表验证结论，把七种传播行为的表格补全成自己的实验报告。

提示：外层 try-catch 住内层异常才能观察「部分回滚」；NESTED 需要数据库支持保存点（H2/MySQL 都支持）。

## 参考与致谢

- Spring Framework 官方文档：*Transaction Management* 一章（https://docs.spring.io/spring-framework/reference/data-access/transaction.html ），传播行为七常量与默认回滚规则的官方语义以此为准（Apache 2.0 许可项目文档，本文仅参照其概念表述，代码为原创示例）；
- 原模块 Spring 基础篇拆分：本文承接其事务全部主题内容（传播行为形式化、TransactionInterceptor 原理、声明式事务实战、管理方式对比、失效反模式四连、死锁案例、相关习题）；
- 隔离级别的数据库侧语义见 [MySQL 事务与锁机制](/mysql/460-TransactionLockMechanism)。
