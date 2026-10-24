---
order: 720
title: Spring AOP：动态代理原理与切面实战
module: 'java'
category: 后端技术
difficulty: beginner
description: AOP 的形式化模型、JDK 动态代理与 CGLIB 的原理与选择、织入时机与通知执行时序、execution 切点表达式、自调用失效的代理根源；用接口日志埋点、方法耗时监控、权限校验三个切面实战，附 Spring AOP 与 AspectJ 的选型对比与代理类型转换案例。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/820-SpringIoCContainerBeansAndDI'
  - 'java/827-SpringDeclarativeTransactions'
  - 'java/430-ReflectionDynamicProxy'
prerequisites:
  - 'java/430-ReflectionDynamicProxy'
  - 'java/820-SpringIoCContainerBeansAndDI'
---

## 知识点地图

- **知识类别**：面向切面编程（AOP）——Spring Framework 官方文档 *Core Technologies* 中与 IoC 容器并列的一章（AOP API / AspectJ Support）。
- **解决什么问题**：日志、耗时统计、权限校验、事务这些**横切关注点**散落在每个业务方法里，改一处要改一百处；AOP 把它们收进「切面」，业务类保持干净。
- **什么时候用到**：给 Service 层统一加日志埋点、给标注了自定义注解的方法加耗时监控、给管理端接口加权限校验；以及理解 `@Transactional`、`@Async`、`@Cacheable` 为什么「不生效」——它们全是 AOP 代理实现的。

## 前置知识

- [反射与动态代理](/java/430-ReflectionDynamicProxy)：JDK `Proxy`/`InvocationHandler` 是 Spring AOP 的物理基础，本篇不重复其语法；
- [Spring IoC 容器、Bean 与依赖注入](/java/820-SpringIoCContainerBeansAndDI)：切面类本身也是 Bean，`BeanPostProcessor` 织入时机在生命周期第 6 步；
- [Spring 声明式事务](/java/827-SpringDeclarativeTransactions)：`@Transactional` 是 AOP 最重要的话应用户，其失效场景是自调用问题的事务特例。

## 学习目标

读完本文你将能够：

1. 写出 AOP 的四元组模型（JoinPoint/Pointcut/Advice/Weaving）并对应到 Spring 的注解；
2. 说清 Spring 在什么时候用 JDK 代理、什么时候用 CGLIB，以及 `proxyTargetClass` 改了会怎样；
3. 读懂并手写 execution 切点表达式，区分通知五类型与它们的执行时序；
4. 解释「同类方法自调用切面失效」的代理根源并给出三种修复；
5. 实现日志埋点、耗时监控、权限校验三个可直接落地的切面。

预计 70 分钟，含 1 个找错环节与 2 道动手任务。本篇由原 Spring 基础篇拆分而来，AOP 主题内容全部收拢于此。

## 1. AOP 的形式化定义

AOP（Aspect-Oriented Programming）可形式化为四元组：

$$
AOP = \langle J, P, A, W \rangle
$$

- $J$：JoinPoint 集合，程序执行中的可切入点（方法调用、字段访问、异常抛出等）
- $P$：Pointcut，$P \subseteq J$，匹配特定 JoinPoint 的谓词
- $A$：Advice，在匹配的 JoinPoint 处执行的动作（Before、After、Around）
- $W$：Weaving，将 Aspect 织入目标对象的过程

Spring AOP 仅支持方法级 JoinPoint，使用动态代理（JDK Proxy 或 CGLIB）在运行时织入。想要字段级、构造器级切入点，需要 AspectJ（见第 8 节对比）。

把四元组翻译成 Spring 注解语言：`@Aspect` 声明切面类，`@Pointcut` 写谓词 $P$，`@Before`/`@Around` 等写动作 $A$，织入 $W$ 由 Spring 在 Bean 初始化后自动完成。

## 2. 动态代理原理：Spring 切面落地的物理形态

### 2.1 代理方式的选择

Spring AOP 支持两种代理方式：

- **JDK 动态代理**：基于接口，目标类必须实现至少一个接口。`Proxy.newProxyInstance` 生成代理类。
- **CGLIB 代理**：基于继承，生成目标类的子类。无法代理 final 类与 final 方法。

Spring 默认策略：

- 目标类实现接口 → 使用 JDK 代理
- 目标类无接口 → 使用 CGLIB
- 显式 `proxyTargetClass=true` → 强制 CGLIB（Spring Boot 2.x 起默认）

**换成别的写法会发生什么**：Spring Boot 默认强制 CGLIB 后，同一个 Service 注入自身代理（解决自调用）才不会因「代理类型与目标类型不一致」而失败；若你把 `spring.aop.proxy-target-class` 关回 false 又大量依赖具体类注入，就会撞上第 9 节的 `ClassCastException`。两种代理的底层语法（`InvocationHandler` 与 `MethodInterceptor`）在 430 篇有逐行讲解，此处不再重复，只看它们在 Spring 里的职责边界。

### 2.2 JDK 动态代理示例

```java
// JDK 动态代理核心代码
public class JdkProxyFactory implements InvocationHandler {
    private final Object target;

    public JdkProxyFactory(Object target) {
        this.target = target;
    }

    public Object getProxy() {
        return Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            this
        );
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 前置通知
        System.out.println("[Before] 调用方法: " + method.getName());
        try {
            Object result = method.invoke(target, args);  // 执行目标方法
            // 返回通知
            System.out.println("[AfterReturning] 返回值: " + result);
            return result;
        } catch (Throwable e) {
            // 异常通知
            System.out.println("[AfterThrowing] 异常: " + e.getMessage());
            throw e;
        } finally {
            // 后置通知
            System.out.println("[After] 方法执行结束");
        }
    }
}
```

**逐段讲解**：

1. `invoke` 的 try-catch-finally 结构恰好对应四种通知的位置：catch 前是 `@Before` 语义、正常返回路径是 `@AfterReturning`、catch 块是 `@AfterThrowing`、finally 是 `@After`——**看懂这一段，第 4 节的通知时序就不用背了**。
2. `method.invoke(target, args)` 里的 `target` 是被代理的原始对象：若这里误传 `proxy` 会造成无限递归（代理调自己），这是手写 JDK 代理的最常见事故。

### 2.3 CGLIB 代理示例

```java
// CGLIB 代理核心代码
public class CglibProxyFactory implements MethodInterceptor {
    public Object getProxy(Class<?> clazz) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(clazz);
        enhancer.setCallback(this);
        return enhancer.create();
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args,
                             MethodProxy proxy) throws Throwable {
        System.out.println("[CGLIB Before] " + method.getName());
        Object result = proxy.invokeSuper(obj, args);  // 调用父类（原方法）
        System.out.println("[CGLIB After] " + method.getName());
        return result;
    }
}
```

**逐段讲解**：

1. `setSuperclass(clazz)` 点明 CGLIB 的继承本质：生成的代理类是目标类的**子类**，所以 final 类无法被代理（没有子类可造）、final 方法无法被增强（子类覆盖不了）。给切点命中的方法加了 `final`，切面静默失效——不报错，这是排查「切面怎么不生效」时的高频原因。
2. `invokeSuper` 与 JDK 代理的 `method.invoke(target)` 等价，都是「穿透代理层调用原始逻辑」。

## 3. 织入时机与通知执行时序

### 3.1 织入发生在 Bean 生命周期的哪一步

Spring AOP 在 `BeanPostProcessor#postProcessAfterInitialization` 阶段织入代理：

```java
// AbstractAutoProxyCreator 简化逻辑
public abstract class AbstractAutoProxyCreator extends ProxyProcessorSupport {
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (this.advisedBeans.containsKey(cacheKey)) {
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
        return bean;
    }

    protected Object wrapIfNecessary(Object bean, String beanName, String cacheKey) {
        // 1. 查找匹配的 Advisor
        Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, bean);
        if (specificInterceptors != DO_NOT_PROXY) {
            // 2. 创建代理
            Object proxy = createProxy(bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
            this.proxyTypes.put(cacheKey, proxy.getClass());
            return proxy;
        }
        return bean;
    }
}
```

**逐段讲解**：

1. `AbstractAutoProxyCreator` 是一个 `BeanPostProcessor`：每个 Bean 初始化完成后，Spring 问一遍「这个 Bean 有没有切点命中？」命中就返回代理对象、未命中原样返回。容器里**你注入的其实是代理**，原始对象被代理持有。
2. 「代理在初始化后生成」这一时机是理解 IoC 容器三级缓存设计的前提（详见 820 篇 3.2 节），也是 `@Transactional`、`@Async` 失效类问题的共同根源。

### 3.2 通知五类型与执行时序

```java
// @Around 通知的执行模型
@Around("execution(* com.example.service.*.*(..))")
public Object aroundAdvice(ProceedingJoinPoint pjp) throws Throwable {
    // @Before 逻辑（在 proceed 前）
    System.out.println("Around - before");
    try {
        Object result = pjp.proceed();  // 执行目标方法
        // @AfterReturning 逻辑（在 proceed 后，正常返回时）
        System.out.println("Around - after returning");
        return result;
    } catch (Throwable e) {
        // @AfterThrowing 逻辑（异常时）
        System.out.println("Around - after throwing");
        throw e;
    } finally {
        // @After 逻辑（无论是否异常）
        System.out.println("Around - after");
    }
}
```

多个 Aspect 的执行顺序由 `@Order` 决定，数值小的先执行（外层）。

**易错点**：`@Around` 里忘记写 `pjp.proceed()`，目标方法根本不会执行——接口表现为「请求进来了、日志打了、业务没跑」。另一个是 `@After` 与 `@AfterReturning` 的混淆：`@After` 是 finally 语义（异常也执行），`@AfterReturning` 只在正常返回时执行。

## 4. 切点语法：execution 表达式逐段拆解

```java
@Pointcut("execution(* com.example.service..*.*(..))")
public void serviceLayerPointcut() {}
```

把表达式按星号逐段拆开：

| 片段 | 含义 |
| --- | --- |
| `execution(` | 匹配**方法执行**这个连接点类型（Spring 支持的主形态） |
| 第一个 `*` | 任意返回类型 |
| `com.example.service..` | 包前缀；`..` 表示**含子包**（一个点是精确包） |
| 第二个 `*` | 任意类名 |
| 第三个 `*` | 任意方法名 |
| `(..)` | 任意参数（个数与类型不限）；`()` 空参、`(*)` 恰一个参数 |

**常用的其他指示器**：

```java
@annotation(com.example.Monitored)              // 标注了 @Monitored 注解的方法
within(com.example.web..*)                      // 指定包内的所有连接点
bean(orderService)                              // 指定名称的 Bean
args(java.lang.String)                          // 首参（或参数）类型匹配
```

**组合与排除**：`&&`、`||`、`!` 可组合表达式，例如「service 包内但排除所有 getter/setter」：

```java
execution(* com.example.service..*(..)) &&
!execution(* com.example.service..*.get*(..)) &&
!execution(* com.example.service..*.set*(..))
```

**易错点**：`com.example.service.*` 与 `com.example.service..*` 差一个点，切面覆盖范围就少掉全部子包——测试环境只建了一层包发现不了，上线后业务分了子包，切面突然「失效」。写完切点先在测试里验证一次命中范围。

## 5. 实战一：日志埋点切面

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.JoinPoint;
import org.springframework.stereotype.Component;

/**
 * 日志切面
 * 记录 Service 层方法的调用与执行时间
 */
@Aspect
@Component
public class LoggingAspect {

    /**
     * 切点定义：匹配 com.example.service 包下所有类的所有方法
     */
    @Pointcut("execution(* com.example.service..*.*(..))")
    public void serviceLayerPointcut() {}

    /**
     * 前置通知：方法执行前
     */
    @Before("serviceLayerPointcut()")
    public void beforeAdvice(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        System.out.printf("[Before] 方法: %s, 参数: %s%n", methodName, java.util.Arrays.toString(args));
    }

    /**
     * 后置通知：方法正常返回后
     */
    @AfterReturning(pointcut = "serviceLayerPointcut()", returning = "result")
    public void afterReturningAdvice(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        System.out.printf("[AfterReturning] 方法: %s, 返回值: %s%n", methodName, result);
    }

    /**
     * 异常通知：方法抛出异常后
     */
    @AfterThrowing(pointcut = "serviceLayerPointcut()", throwing = "ex")
    public void afterThrowingAdvice(JoinPoint joinPoint, Exception ex) {
        String methodName = joinPoint.getSignature().getName();
        System.err.printf("[AfterThrowing] 方法: %s, 异常: %s%n", methodName, ex.getMessage());
    }

    /**
     * 最终通知：方法执行后（无论是否异常）
     */
    @After("serviceLayerPointcut()")
    public void afterAdvice(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        System.out.printf("[After] 方法: %s 执行结束%n", methodName);
    }

    /**
     * 环绕通知：完全包裹方法执行，功能最强
     * 可控制是否执行目标方法、修改参数、修改返回值
     */
    @Around("serviceLayerPointcut()")
    public Object aroundAdvice(ProceedingJoinPoint pjp) throws Throwable {
        String methodName = pjp.getSignature().getName();
        long start = System.currentTimeMillis();
        try {
            System.out.printf("[Around-Before] %s 开始%n", methodName);
            Object result = pjp.proceed();  // 执行目标方法
            long elapsed = System.currentTimeMillis() - start;
            System.out.printf("[Around-After] %s 完成, 耗时 %dms%n", methodName, elapsed);
            return result;
        } catch (Throwable e) {
            long elapsed = System.currentTimeMillis() - start;
            System.err.printf("[Around-Throw] %s 异常, 耗时 %dms: %s%n", methodName, elapsed, e.getMessage());
            throw e;
        }
    }
}
```

**逐段讲解**：

1. 五种通知在同一个切面里全量演示了一遍——生产中通常**只选一两种**：埋点要拿参数与结果，`@Around` 一个顶四个；只记入参用 `@Before` 就够。
2. `returning = "result"` 与方法参数 `Object result` 按名字绑定，`throwing = "ex"` 同理——两个名字必须一致，否则启动报错。
3. `@AfterThrowing` **不会**把异常吞掉：它在异常向上传播的路径上旁听，切面方法正常返回即可，业务异常继续抛。想「捕获异常改走降级」必须用 `@Around` 自己 try-catch。

## 6. 实战二：方法耗时监控切面

```java
/**
 * 性能监控切面
 * 使用 @Order 控制多个切面的执行顺序
 */
@Aspect
@Component
@Order(1)  // 数值小的先执行（外层）
public class PerformanceAspect {

    @Around("@annotation(Monitored)")
    public Object monitor(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed();
        } finally {
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            if (elapsed > 100) {
                System.err.printf("慢方法: %s 耗时 %dms%n", pjp.getSignature().getName(), elapsed);
            }
        }
    }
}

/**
 * 自定义注解：标记需要监控的方法
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Monitored {}
```

**逐段讲解**：

1. `@annotation(Monitored)` 切点把「监控哪些方法」的决定权交给业务开发者——想监控就标 `@Monitored`，粒度精确到方法。这是「注解驱动切面」模式，比按包名切割更容易精确控制。
2. 计时放 `finally`：方法抛异常也要记录耗时，否则慢查询全藏在异常路径里。
3. `@Order(1)` 决定它与日志切面的嵌套顺序：数值小者在外层。若耗时监控在内层，测到的时间就包含不了外层切面的开销——**监控切面应当在外层**。

## 7. 实战三：权限校验切面

权限校验是 AOP 的第三类典型应用（前两类：日志、监控）：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    String[] value();          // 允许访问的角色
}

@Aspect
@Component
@Order(0)                    // 权限要在日志、监控之前（最外层）
public class AuthAspect {

    private final CurrentUserHolder holder;

    public AuthAspect(CurrentUserHolder holder) {
        this.holder = holder;
    }

    @Before("@annotation(com.example.auth.RequireRole)")
    public void check(JoinPoint jp) {
        // 通过 MethodSignature 还原 Method，再读方法上的注解
        RequireRole anno = ((MethodSignature) jp.getSignature()).getMethod()
                              .getAnnotation(RequireRole.class);
        String role = holder.currentUserRole();
        boolean ok = false;
        for (String r : anno.value()) {
            if (r.equals(role)) { ok = true; break; }
        }
        if (!ok) {
            throw new AccessDeniedException("需要角色: " + Arrays.toString(anno.value()));
        }
    }
}

// 业务侧：一行注解完成授权声明
@RequireRole({"ADMIN", "OPS"})
public void refund(Long orderId) { ... }
```

**逐段讲解**：

1. 前置通知拿注解需要把 `JoinPoint.getSignature()` 强转为 `MethodSignature` 再取 `getMethod()`——因为运行期的「签名」要还原成反射的 Method 才能读注解（430 篇反射知识的直接应用）。
2. 校验失败**抛异常**而不是返回 false：`@Before` 没有返回值，异常是它拒绝放行的唯一通道；异常在进入目标方法之前抛出，业务零感知。
3. `@Order(0)` 让权限切面在日志切面外层：无权限的请求不应该产生业务日志。三类切面的推荐外内顺序：鉴权 → 日志/审计 → 耗时监控。

## 8. Spring AOP 与 AspectJ、JDK 与 CGLIB 的选型对比

### 8.1 AOP 实现对比

| 特性 | Spring AOP | AspectJ |
|------|-----------|---------|
| 织入时机 | 运行时（动态代理） | 编译时 / 类加载时 |
| JoinPoint | 仅方法 | 方法、字段、构造器、静态初始化 |
| 性能 | 略有代理开销 | 无运行时开销 |
| 配置 | 简单 | 需 ajc 编译器或 LTW |
| 适用场景 | 企业应用（事务、日志） | 性能敏感、细粒度切面 |

### 8.2 代理方式对比

| 特性 | JDK 动态代理 | CGLIB 代理 |
|------|-------------|-----------|
| 原理 | 接口 + Proxy | 继承 + 字节码生成 |
| 目标要求 | 必须实现接口 | 任意类（final 除外） |
| 性能 | 创建快、调用稍慢 | 创建慢、调用稍快 |
| Spring 默认 | 接口存在时使用 | 无接口或强制时使用 |
| Spring Boot 2.x | 默认 CGLIB | 默认 CGLIB |

**选型口诀**：企业应用的横切关注点（事务、日志、安全）Spring AOP 完全够用；只有需要字段/构造器切入点、或切面本身性能敏感时才引入 AspectJ。

## 9. 反模式与典型案例

### 9.1 反模式：AOP 切面过于宽泛导致性能下降

**问题**：

```java
@Aspect
@Component
public class LoggingAspect {
    // 所有方法都切入，包括简单的 getter/setter
    @Around("execution(* com.example..*.*(..))")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        // ... 日志逻辑
    }
}
```

**危害**：每次方法调用都增加额外开销（代理对象创建、反射、日志 I/O），简单 getter 的性能损失可达 10 倍。

**修复**：精确指定切点范围。

```java
@Around("execution(* com.example.service..*(..)) && " +
        "!execution(* com.example.service..*.get*(..)) && " +
        "!execution(* com.example.service..*.set*(..))")
public Object log(ProceedingJoinPoint pjp) throws Throwable {
    // ...
}
```

### 9.2 自调用：一切「切面失效」的代理根源

先看一段日志切面失效的代码（事务版的同款问题在 827 篇 6.2 节）：

```java
@Service
public class OrderService {
    public void batchProcess(List<Order> orders) {
        for (Order o : orders) {
            this.process(o);        // 自调用：日志切面不生效！
        }
    }

    @Monitored
    public void process(Order o) { /* 业务 */ }
}
```

**根因**：`this.process()` 中的 `this` 是**原始对象**，不是容器注入给你的那个代理。切面逻辑长在代理上，绕过代理等于绕过切面。

**修复三选一**：

1. **注入自身代理**：`@Autowired private OrderService self;` 后调用 `self.process(o)`（Spring Boot 默认 CGLIB 下注入的代理与自身类型兼容）；
2. **拆分类**：把被增强方法挪到另一个 Bean，通过注入调用；
3. **AopContext**：`@EnableAspectJAutoProxy(exposeProxy = true)` 后 `((OrderService) AopContext.currentProxy()).process(o)`——侵入性强，作为最后手段。

**通用判据**：任何「注解写了却不生效」的问题（`@Transactional`、`@Async`、`@Cacheable`、自定义切面），第一步都是查调用路径上有没有被代理截住——从同类内部发起的调用都不会。

### 9.3 案例：AOP 代理导致类型转换异常

**场景**：某项目将 `@Service` 标注的类强制转换为具体类型时报 `ClassCastException`。

```java
@Service
public class UserServiceImpl implements UserService {
    // ...
}

// 某处代码
UserServiceImpl impl = (UserServiceImpl) context.getBean(UserService.class);
// ClassCastException: com.sun.proxy.$Proxy123 cannot be cast to UserServiceImpl
```

**根因**：`UserServiceImpl` 实现了 `UserService` 接口，Spring 默认使用 JDK 代理，生成的代理类是 `UserService` 的实现，而非 `UserServiceImpl` 的子类，无法转换为 `UserServiceImpl`。

**修复**：

- 方案一：面向接口编程，使用 `UserService` 而非 `UserServiceImpl`。
- 方案二：强制使用 CGLIB 代理 `@EnableAspectJAutoProxy(proxyTargetClass = true)`。

## 10. 习题

### 10.1 进阶题：Spring AOP 与 AspectJ 的区别

**参考答案要点**：

- Spring AOP：运行时织入，基于动态代理，仅支持方法级 JoinPoint，性能略有开销，配置简单。
- AspectJ：编译时 / 类加载时织入，支持方法、字段、构造器 JoinPoint，无运行时开销，需 ajc 编译器。
- Spring AOP 适用于企业应用的横切关注点（事务、日志、安全）。
- AspectJ 适用于性能敏感、细粒度切面的场景。

### 10.2 挑战题：多数据源动态切换 Starter

设计一个支持多数据源动态切换的 Spring Boot Starter，要求：

- 通过注解 `@DS("slave")` 标注使用的数据源。
- 支持读写分离（默认 master，查询方法自动用 slave）。
- 切换在方法级生效，不跨线程。

**参考答案要点**：

1. 基于 `AbstractRoutingDataSource` 实现动态数据源。
2. 用 ThreadLocal 保存当前数据源 key。
3. 用 AOP 切面拦截 `@DS` 注解，设置 ThreadLocal。
4. 在 `determineCurrentLookupKey` 中读取 ThreadLocal。
5. finally 块清理 ThreadLocal，避免内存泄漏与线程池污染。
6. 读写分离可结合 `@Transactional(readOnly = true)` 自动路由到 slave。

### 10.3 挑战题：注解级性能监控代理

实现一个自定义的 `BeanPostProcessor`，为所有标注 `@Monitored` 的方法自动添加性能监控，要求：

- 方法执行超过 100ms 时打印告警日志。
- 支持配置告警阈值。
- 不影响原方法的异常传播与返回值。

**参考答案要点**：

1. 在 `postProcessAfterInitialization` 中判断 Bean 是否有 `@Monitored` 方法。
2. 创建代理对象（CGLIB 或 JDK 代理）。
3. 在 `Interceptor` 中记录开始时间，执行 `proceed()`，计算耗时。
4. 超过阈值时记录日志，无论是否异常都要打印耗时。
5. 异常正常抛出，返回值正常返回。
6. 通过 `@ConfigurationProperties` 注入阈值配置。

## 11. 动手实践

### 任务一：给用户服务加耗时监控（热身）

写一个 `UserService`（接口 + 实现类），实现类中 `getUser` 人为 sleep 150ms；用 `@Monitored` 注解 + 第 6 节监控切面让它在 100ms 阈值下打印慢方法告警。

提示：确认切面类有 `@Aspect` 与 `@Component` 双注解；确认调用发生在代理上（从容器 getBean 拿 UserService 再调用，而不是 new）。

### 任务二：找错——为什么切面没生效（实战）

下面的代码想给 `importUsers` 加审计日志，运行后发现日志一次都没打。找出原因并给两种修复：

```java
@Service
public class UserBatchService {

    public void importAll(List<User> users) {
        for (User u : users) {
            this.importOne(u);      // 期望触发 auditImport 切面
        }
    }

    @Audited                        // 切点：@annotation(Audited)
    private void importOne(User u) {
        userRepository.save(u);
    }
}
```

提示一：调用发生在哪个对象上？提示二：切点命中的方法可见性是什么？

**参考实现（先自己写完再展开对照）**：

```java
@Service
public class UserBatchService {

    @Autowired
    private UserBatchService self;   // 修复一：注入的是代理，经代理调用切面才生效

    public void importAll(List<User> users) {
        for (User u : users) {
            self.importOne(u);
        }
    }

    @Audited
    public void importOne(User u) {  // 修复二：private 改 public，动态代理只能增强可见的公开方法
        userRepository.save(u);
    }
}
```

本例同时踩了两颗雷：`this.importOne` 自调用绕过代理；`private` 方法无法被 JDK/CGLIB 增强（JDK 代理只有接口公开方法，CGLIB 子类覆盖不了 private）。两个都修，缺一仍不生效。

### 任务三：权限切面落地

实现第 7 节的 `RequireRole` + `AuthAspect`：用 ThreadLocal 模拟当前用户角色，给一个 `refund` 方法加 `@RequireRole({"ADMIN"})`，分别以 ADMIN 与 USER 角色调用，观察放行与 `AccessDeniedException`；再把 `@Order` 去掉、与日志切面共存，观察两个切面的执行顺序变化。

提示：`@Order` 注解可加在切面类上；观察顺序时在两类通知的入口各打一行日志即可。

## 12. 语法速查：AOP 切面

**基本写法：@Aspect 声明切面**
`@Aspect`
```java
// 声明切面类
@Aspect
@Component
public class LogAspect { }
```

---

**基本写法：@Pointcut 切入点**
`@Pointcut("<切入点表达式>")`
```java
// 定义切入点
@Pointcut("execution(* com.example.service.*.*(..))")
public void serviceMethods() { }
```

---

**基本写法：@Before 前置通知**
`@Before("<切入点>")`
```java
// 方法执行前执行
@Before("serviceMethods()")
public void beforeLog(JoinPoint jp) {
    System.out.println("Before: " + jp.getSignature());
}
```

---

**基本写法：@After 后置通知**
`@After("<切入点>")`
```java
// 方法执行后执行（无论是否异常）
@After("serviceMethods()")
public void afterLog() { }
```

---

**基本写法：@AfterReturning 返回通知**
`@AfterReturning(pointcut = "<切入点>", returning = "<结果变量>")`
```java
// 方法成功返回后执行
@AfterReturning(pointcut = "serviceMethods()", returning = "result")
public void afterReturning(Object result) { }
```

---

**基本写法：@AfterThrowing 异常通知**
`@AfterThrowing(pointcut = "<切入点>", throwing = "<异常变量>")`
```java
// 方法抛出异常后执行
@AfterThrowing(pointcut = "serviceMethods()", throwing = "ex")
public void afterThrowing(Exception ex) { }
```

---

**基本写法：@Around 环绕通知**
`@Around("<切入点>")`
```java
// 环绕通知（最强大）
@Around("serviceMethods()")
public Object around(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.currentTimeMillis();
    Object result = pjp.proceed();
    System.out.println("Cost: " + (System.currentTimeMillis() - start));
    return result;
}
```

## 参考与致谢

- Spring Framework 官方文档：*AOP* 一章（https://docs.spring.io/spring-framework/reference/core/aop.html ），代理策略（JDK/CGLIB）、通知类型与 AspectJ 支持的官方语义以此为准（Apache 2.0 许可项目文档，本文仅参照其概念表述，代码为原创示例）；
- 原模块 Spring 基础篇拆分：本文承接其 AOP 全部主题内容（形式化定义、代理原理、切面实战、对比分析、反模式与案例、相关习题与速查）；
- [反射与动态代理](/java/430-ReflectionDynamicProxy)：JDK Proxy 与 CGLIB 的底层语法。
