---
order: 64
title: SpringBoot数据访问
module: java
category: Java
difficulty: intermediate
description: Spring Data JPA、MyBatis、R2DBC、JdbcTemplate 与事务、缓存、连接池的系统性深度剖析
author: fanquanpp
updated: '2026-07-21'
related:
  - java/SpringBoot进阶
  - java/SpringBoot安全
  - java/Java设计模式
  - java/Java函数式编程
  - java/Java与响应式编程
  - java/Java并发编程基础
prerequisites:
  - java/概述与开发环境
  - java/Spring基础
  - java/集合框架详解
tags:
  - Java
  - SpringBoot
  - JPA
  - MyBatis
  - R2DBC
  - JdbcTemplate
  - Hibernate
  - Transaction
  - HikariCP
  - Redis
---

# Spring Boot 数据访问深度指南

> 数据访问是企业级应用的核心。Spring Boot 在数据访问层提供了从底层 JDBC 到高层 ORM 的完整栈：JdbcTemplate 简化原生 JDBC 编码；Spring Data JPA 通过方法名派生查询实现"零 SQL"开发；MyBatis 在保留 SQL 控制力的同时消除样板代码；R2DBC 与响应式栈适配高并发非阻塞场景；事务管理、连接池、缓存、多数据源等横切关注点被统一抽象。本文将以"数据访问的层次模型"为骨架，从 JDBC 起步，逐层向上剖析 JPA、MyBatis、R2DBC 的内部机制，覆盖事务传播、N+1 问题、批量优化、缓存一致性等工程关键问题，让读者既能编写高效的数据访问代码，也能理解主流框架的设计取舍。

---

## 1. 学习目标（基于 Bloom 分类法）

本节以 Bloom 教育目标分类法（Anderson 2001 修订版）为框架，对学习目标进行显式分级。

### 1.1 认知层级目标

| 层级（Level） | 行为动词 | 具体学习目标 |
|--------------|---------|-------------|
| 记忆（Remember） | 列举、识别、定义 | 列举 Spring Data 的核心抽象（Repository、CrudRepository、JpaRepository），识别 JPA 实体生命周期状态，定义事务的 ACID 性质 |
| 理解（Understand） | 解释、归纳、对比 | 解释 Hibernate 的脏检查机制，对比 JPA 与 MyBatis 的 SQL 控制粒度，归纳事务传播行为的 7 种类型 |
| 应用（Apply） | 实现、使用、演示 | 使用方法名派生查询实现 Repository，使用 @Transactional 控制事务边界，使用 Specification 实现动态查询 |
| 分析（Analyze） | 分解、辨别、推断 | 分解 Hibernate Session 的 flush 时机，推断 N+1 问题的触发条件，辨别 eager 与 lazy 加载的性能影响 |
| 评价（Evaluate） | 评判、论证、批判 | 评判 JPA 的"魔法"对可维护性的影响，论证 HikariCP 的连接池参数选择，批判过度使用 @OneToMany 导致的内存爆炸 |
| 创造（Create） | 设计、构建、重构 | 设计支持多租户的多数据源架构，构建 JPA + MyBatis 混合方案，重构遗留 JDBC 代码为 Spring Data 风格 |

### 1.2 学习成果自检清单

完成本章学习后，读者应能独立完成以下任务：

1. 在不查阅文档的前提下，画出 Spring Data 的 Repository 继承层次。
2. 用一句话向同事解释 Hibernate 的一级缓存与二级缓存的区别。
3. 在白板上写出 `@Transactional` 的传播行为与隔离级别枚举。
4. 实现一个支持动态查询、分页、排序的复杂 Repository。
5. 对比 JPA、MyBatis、JdbcTemplate、R2DBC 的性能、灵活性、可维护性。
6. 设计一个支持读写分离的多数据源架构，并解决事务跨库问题。

### 1.3 前置知识地图

```
Java 基础
    │
    ├── 面向对象（封装、继承、多态）
    ├── 集合框架（List、Map、Set）
    ├── 异常处理
    └── JDBC 基础（Connection、Statement、ResultSet）
            │
            ▼
Spring 基础（本章前置）
    │
    ├── IoC 容器（Bean、依赖注入）
    ├── AOP（切面、代理）
    ├── 配置（@Configuration、@Component）
    └── 事务抽象（PlatformTransactionManager）
            │
            ▼
Spring Boot 数据访问（本章）
    │
    ├── 底层：JDBC（JdbcTemplate、SimpleJdbcInsert）
    ├── ORM：JPA / Hibernate（实体、Repository、JPQL、Criteria）
    ├── SQL Mapper：MyBatis（@Mapper、XML、动态 SQL）
    ├── 响应式：R2DBC（Reactive Repository）
    ├── 横切：事务、连接池（HikariCP）、缓存（Redis）
    └── 工程实践：多数据源、读写分离、分库分表、批量优化
```

### 1.4 章节阅读建议

- **零基础读者**：建议按顺序阅读第 2-5 节，配合第 5 节代码示例上机实操，先理解 JDBC 再学习 JPA。
- **有 Spring 经验的工程师**：可跳过第 2 节基础部分，直接阅读第 3 节 JPA 内部机制、第 4 节事务、第 7 节反模式。
- **架构师**：重点关注第 6 节对比分析、第 8 节工程实践与第 9 节案例研究，特别是多数据源与读写分离设计。

---

## 2. 历史动机与演化

### 2.1 数据访问的演化史

Java 数据访问经历了从"裸 JDBC"到"声明式 ORM"的漫长演化：

**阶段 1：裸 JDBC 时代（1997-2005）**

- Java 1.1 引入 JDBC API，开发者直接操作 `Connection`、`Statement`、`ResultSet`。
- 痛点：样板代码多（打开/关闭、异常处理、结果集映射）、SQL 注入风险（字符串拼接）、可维护性差。
- 代表框架：Apache Commons DbUtils、Spring JdbcTemplate（2003）。

**阶段 2：重量级 ORM 时代（2005-2010）**

- Hibernate 1.0（2001）、EJB 2.x CMP（2002）、JDO（2003）。
- JPA 1.0（2006）作为 JSR-220 标准化 ORM 接口。
- 痛点：配置复杂（XML）、性能问题（N+1、过度加载）、学习曲线陡峭。

**阶段 3：SQL Mapper 与轻量级 ORM 并存（2010-2015）**

- MyBatis 3（2010）：保留 SQL 控制力，消除样板代码。
- Spring Data JPA（2011）：方法名派生查询，零 SQL 开发。
- Spring Boot（2014）：自动配置大幅简化数据访问起步。

**阶段 4：响应式与云原生（2015-至今）**

- R2DBC（2019）：响应式数据库连接规范。
- Spring Data R2DBC：响应式 Repository 抽象。
- 虚拟线程（Java 21, 2023）：JDBC + 虚拟线程重新成为高并发选项。

### 2.2 Spring Data 的设计哲学

Spring Data 项目的核心设计哲学：

1. **抽象分层**：从 `Repository` → `CrudRepository` → `JpaRepository` 逐层增强，开发者按需继承。
2. **约定优于配置**：方法名派生查询（`findByName`、`findByAgeGreaterThan`）自动生成 SQL。
3. **可扩展性**：自定义查询用 `@Query`、Specification、QueryDSL 等多种方式。
4. **多存储统一**：JPA、MongoDB、Redis、Elasticsearch 共享同一套 Repository 抽象。
5. **与 Spring 生态深度集成**：事务、缓存、AOP、配置中心无缝衔接。

### 2.3 关键版本时间线

| 版本/年份 | 关键变化 |
|----------|---------|
| JDBC 1.0（1997） | Java 1.1 引入 JDBC API |
| Hibernate 1.0（2001） | Gavin King 创建，开源 ORM 鼻祖 |
| JPA 1.0（2006） | JSR-220，标准化 ORM 接口 |
| Spring 2.0（2006） | 引入 `@Transactional` 注解 |
| Hibernate 3.x（2007） | JPA 1.0 实现，主流 ORM |
| Spring Data JPA 1.0（2011） | 方法名派生查询 |
| MyBatis 3.0（2010） | iBatis 改名 MyBatis |
| Spring Boot 1.x（2014） | 自动配置、Starter 依赖 |
| JPA 2.2（2017） | 支持 Java 8 Stream、CompletableFuture |
| R2DBC 0.8（2019） | 响应式数据库连接规范 |
| Spring Data R2DBC 1.0（2020） | 响应式 Repository |
| Spring Boot 2.4（2020） | R2DBC 支持、HikariCP 默认连接池 |
| Spring Boot 3.0（2022） | Jakarta EE 9+（javax → jakarta） |
| Spring Boot 3.2（2023） | 虚拟线程支持，JDBC 高并发回归 |
| Spring Boot 3.3（2024） | JPA Batch Size 改进、CRUD Repository 重构 |

### 2.4 设计哲学：抽象与控制的平衡

数据访问的核心矛盾是 **抽象程度** 与 **SQL 控制力** 的权衡：

```
高抽象          低控制          ← JPA、Spring Data JPA
  │                                    方法名查询、JPQL
  │                                    自动生成 SQL
  │
中抽象          中控制          ← Hibernate、MyBatis
  │                                    HQL、Criteria
  │                                    XML/注解 SQL
  │
低抽象          高控制          ← JdbcTemplate、JDBC
                                     原生 SQL
                                     手动映射
```

**选型原则**：

- **简单 CRUD + 快速开发**：Spring Data JPA（最高效）。
- **复杂 SQL + 性能优化**：MyBatis（最灵活）。
- **简单场景 + 脚本任务**：JdbcTemplate（最轻量）。
- **响应式栈**：Spring Data R2DBC（必选）。
- **混合**：JPA 主导 + MyBatis 处理复杂查询（常见实践）。

> **历史轶事**：Gavin King 创建 Hibernate 的动机之一是"对 EJB 2.x CMP 的愤怒"。CMP 的配置极其繁琐（一个实体需要 5+ 个 XML 文件），King 用 Hibernate 证明了"POJO + 注解"足以实现 ORM。这一哲学深刻影响了 JPA 规范的设计，最终 EJB 3.0 几乎完全照搬了 Hibernate 的模型。

---

## 3. 形式化定义

### 3.1 实体生命周期状态机

JPA 实体有 4 种生命周期状态：

$$\text{EntityState} = \{\text{New}, \text{Managed}, \text{Detached}, \text{Removed}\}$$

状态转移：

$$\text{New} \xrightarrow{\text{persist}} \text{Managed} \xrightarrow{\text{remove}} \text{Removed}$$
$$\text{Managed} \xrightarrow{\text{detach/close}} \text{Detached} \xrightarrow{\text{merge}} \text{Managed}$$
$$\text{Removed} \xrightarrow{\text{flush}} \text{Deleted (from DB)}$$

**状态语义**：

1. **New（新实体）**：刚 new 出来，未与 PersistenceContext 关联。
2. **Managed（托管）**：与 PersistenceContext 关联，Hibernate 跟踪其变化（脏检查），自动同步到数据库。
3. **Detached（游离）**：曾是 Managed，但因 Session 关闭或 `detach()` 调用脱离管理。
4. **Removed（删除）**：调用 `remove()` 标记删除，flush 后从数据库删除。

**关键操作**：

- `persist(entity)`：New → Managed
- `merge(entity)`：Detached → Managed（返回新实例）
- `remove(entity)`：Managed → Removed
- `detach(entity)`：Managed → Detached
- `refresh(entity)`：用数据库值覆盖内存值（Managed 状态下）
- `flush()`：将脏检查的差异同步到数据库（不提交事务）

### 3.2 事务 ACID 性质的形式化定义

事务的 ACID 性质：

1. **原子性（Atomicity）**：事务内操作要么全成功，要么全失败。
   $$\text{Atomic}(T) = \forall op_i \in T: \text{commit}(T) \lor \text{rollback}(T)$$

2. **一致性（Consistency）**：事务前后数据库保持一致状态。
   $$\text{Consistent}(T) = \text{valid}(DB_{\text{before}}) \implies \text{valid}(DB_{\text{after}})$$

3. **隔离性（Isolation）**：并发事务互不干扰。
   $$\text{Isolated}(T_1, T_2) = \text{result}(T_1 \| T_2) = \text{result}(T_1; T_2) \lor \text{result}(T_2; T_1)$$

4. **持久性（Durability）**：事务提交后即使系统崩溃也不丢失。
   $$\text{Durable}(T) = \text{commit}(T) \implies \text{persisted}(T) \text{ even after crash}$$

### 3.3 事务传播行为的形式化定义

Spring 定义了 7 种事务传播行为：

| 传播行为 | 当前有事务 | 当前无事务 |
|---------|-----------|-----------|
| `REQUIRED`（默认） | 加入当前事务 | 新建事务 |
| `REQUIRES_NEW` | 挂起当前事务，新建事务 | 新建事务 |
| `NESTED` | 在当前事务内创建保存点 | 新建事务 |
| `SUPPORTS` | 加入当前事务 | 非事务执行 |
| `NOT_SUPPORTED` | 挂起当前事务 | 非事务执行 |
| `MANDATORY` | 加入当前事务 | 抛异常 |
| `NEVER` | 抛异常 | 非事务执行 |

形式化定义（设 $T_{cur}$ 为当前事务，$T_{new}$ 为新事务）：

$$\text{propagate}(\text{REQUIRED}, T_{cur}) = T_{cur} \text{ if exists else new } T_{new}$$
$$\text{propagate}(\text{REQUIRES\_NEW}, T_{cur}) = \text{suspend}(T_{cur}) + T_{new}$$
$$\text{propagate}(\text{NESTED}, T_{cur}) = T_{cur} + \text{savepoint}()$$

### 3.4 隔离级别的形式化定义

SQL 标准定义了 4 种隔离级别（由弱到强）：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|-----------|------|
| `READ_UNCOMMITTED` | 可能 | 可能 | 可能 |
| `READ_COMMITTED` | 不可能 | 可能 | 可能 |
| `REPEATABLE_READ` | 不可能 | 不可能 | 可能 |
| `SERIALIZABLE` | 不可能 | 不可能 | 不可能 |

**异常现象定义**：

1. **脏读（Dirty Read）**：事务 T1 读到 T2 未提交的数据。
   $$\text{DirtyRead}(T_1, T_2) = T_1 \text{ reads } x \text{ written by } T_2 \text{ before } T_2.\text{commit}$$

2. **不可重复读（Non-repeatable Read）**：T1 两次读同一行得到不同结果（T2 在中间修改并提交）。
   $$\text{NonRepeatableRead}(T_1, T_2) = T_1.\text{read}(x) \neq T_1.\text{read}(x) \text{ due to } T_2.\text{update}(x)$$

3. **幻读（Phantom Read）**：T1 两次范围查询得到不同行数（T2 在中间插入/删除）。
   $$\text{PhantomRead}(T_1, T_2) = |\text{range}(T_1.\text{read})| \neq |\text{range}(T_1.\text{read})| \text{ due to } T_2.\text{insert/delete}$$

### 3.5 JPA Proxy 的形式化语义

JPA 的 `@OneToMany` 默认 lazy 加载，返回的是代理对象。形式化地：

$$\text{LazyProxy}(E) = \begin{cases}
\text{initialized} & \text{if } E.\text{field accessed} \\
\text{uninitialized} & \text{otherwise}
\end{cases}$$

访问未初始化代理的字段会触发 SQL 查询（在 Session 关闭后则抛 `LazyInitializationException`）。

**懒加载的形式化触发条件**：

$$\text{trigger}(E.\text{field}) = \neg\text{initialized}(E) \land \text{access}(E.\text{field}) \implies \text{execute(SELECT ...)}$$

---

## 4. 理论推导：JPA 内部机制

### 4.1 PersistenceContext 与 Session

Hibernate 的 `Session`（JPA 的 `EntityManager`）维护一个 **PersistenceContext**，它是：

1. **一级缓存**：Managed 状态的实体缓存于此，避免重复查询。
2. **脏检查队列**：跟踪 Managed 实体的修改，flush 时生成 UPDATE。
3. **SQL 队列**：暂存待执行的 SQL（insert/update/delete），flush 时批量发送。

```java
EntityManager em = emf.createEntityManager();
em.getTransaction().begin();

User user = em.find(User.class, 1L);  // SELECT，存入 PersistenceContext
user.setName("New Name");              // 脏检查记录修改

em.getTransaction().commit();          // flush + commit
// flush 时：Hibernate 比较 user 的当前状态与快照，生成 UPDATE users SET name=? WHERE id=?
```

**关键性质**：

- **同一实体只查询一次**：第二次 `em.find(User.class, 1L)` 直接从缓存返回，不发 SQL。
- **修改自动同步**：无需调用 `update()`，flush 时自动生成 UPDATE。
- **持久化上下文生命周期**：默认与事务绑定（事务提交后清空），也可用 `EXTENDED` 跨事务。

### 4.2 脏检查机制

Hibernate 脏检查的核心算法：

1. **快照保存**：实体被加载时，Hibernate 保存一份"快照"（字段值的副本）。
2. **比较触发**：flush 时，Hibernate 遍历 PersistenceContext 中所有 Managed 实体，比较当前值与快照。
3. **生成 UPDATE**：若字段变化，生成对应的 UPDATE 语句。

```java
// 简化的脏检查伪代码
class PersistenceContext {
    Map<EntityKey, Object> entities;       // 当前实体
    Map<EntityKey, Object[]> snapshots;    // 快照

    void flush() {
        for (EntityKey key : entities.keySet()) {
            Object entity = entities.get(key);
            Object[] snapshot = snapshots.get(key);
            Object[] current = extractState(entity);
            if (!Arrays.equals(snapshot, current)) {
                generateUpdate(entity, snapshot, current);
            }
        }
    }
}
```

**性能优化**：

- `@DynamicUpdate`：只更新变化的字段（默认更新所有字段）。
- `@SelectBeforeUpdate`：仅在 select 后比较（用于 detached 实体 merge 时判断是否变化）。

### 4.3 flush 时机

Hibernate 在以下时机 flush：

1. **事务提交前**：`commit()` 自动 flush。
2. **查询前**：执行 JPQL/HQL/Criteria 查询前，确保内存修改与数据库一致。
3. **手动调用**：`em.flush()` 显式 flush。

**flush 模式**：

- `AUTO`（默认）：查询前 flush（保证查询结果反映内存修改）。
- `COMMIT`：仅在 commit 时 flush（查询可能读到旧值，性能更好但语义复杂）。

### 4.4 N+1 问题的根因

N+1 问题是 JPA 最经典的性能陷阱：

```java
List<Order> orders = orderRepository.findAll();  // 1 次查询：SELECT * FROM orders
for (Order order : orders) {
    System.out.println(order.getUser().getName());  // N 次查询：SELECT * FROM users WHERE id=?
}
// 总查询数：1 + N
```

**根因**：`@ManyToOne(fetch = LAZY)` 的 User 字段是代理，访问 `getName()` 时触发 SELECT。

**解决方案**：

1. **JOIN FETCH**：在查询时一次性 join 关联表。
   ```java
   @Query("SELECT o FROM Order o JOIN FETCH o.user")
   List<Order> findAllWithUser();
   ```

2. **@EntityGraph**：声明式指定关联图。
   ```java
   @EntityGraph(attributePaths = "user")
   @Query("SELECT o FROM Order o")
   List<Order> findAllWithUser();
   ```

3. **BatchSize**：批量加载代理（N 次变 N/batchSize 次）。
   ```java
   @BatchSize(size = 50)
   @ManyToOne(fetch = FetchType.LAZY)
   private User user;
   ```

4. **FetchType.EAGER**（不推荐）：永远 join，但每次查询都加载，可能过度加载。

### 4.5 二级缓存

JPA 的二级缓存（L2 Cache）跨 Session 共享，配置后可避免重复查询：

```java
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Entity
public class User {
    @Id private Long id;
    private String name;
}
```

**缓存层次**：

```
L1 Cache（Session 级，默认开启）
    │
    │ miss
    ▼
L2 Cache（SessionFactory 级，需配置）
    │
    │ miss
    ▼
Database
```

**缓存并发策略**：

- `READ_ONLY`：只读，性能最高（如配置表）。
- `READ_WRITE`：读写，用软锁保证一致性。
- `NONSTRICT_READ_WRITE`：读写，无锁（最终一致性）。
- `TRANSACTIONAL`：事务性（JTA 环境）。

### 4.6 HikariCP 连接池

Spring Boot 默认使用 HikariCP，关键参数：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20              # 最大连接数
      minimum-idle: 10                   # 最小空闲连接
      connection-timeout: 30000          # 连接获取超时（ms）
      idle-timeout: 600000               # 空闲连接超时（ms）
      max-lifetime: 1800000              # 连接最大生命周期（ms）
      leak-detection-threshold: 60000    # 连接泄漏检测阈值（ms）
```

**参数选择经验**：

- **maximum-pool-size**：公式 `connections = (core_count * 2) + effective_spindle_count`（PostgreSQL 官方建议）。实践中常设为 10-30。
- **minimum-idle**：建议等于 maximum-pool-size（避免动态创建连接的开销）。
- **max-lifetime**：建议比数据库的 `wait_timeout`（MySQL 默认 8 小时）短 30 秒，避免连接被数据库主动关闭。

**连接池过大反而更慢**：

> PostgreSQL 官方文档指出：连接数超过 `CPU 核心数 * 2 + 磁盘数` 后，性能反而下降（上下文切换开销超过并行收益）。HikariCP 作者同样建议小连接池。

### 4.7 事务管理器架构

Spring 的事务抽象：

```
PlatformTransactionManager（接口）
    │
    ├── DataSourceTransactionManager（JDBC/JPA/MyBatis）
    ├── JpaTransactionManager（JPA，扩展 DataSource 事务）
    ├── JtaTransactionManager（JTA，分布式事务）
    ├── R2dbcTransactionManager（R2DBC，响应式）
    └── ChainedTransactionManager（多事务管理器链）
```

`@Transactional` 的工作原理（AOP 代理）：

```java
@Service
public class UserService {
    @Transactional
    public void createUser(User user) {
        userRepository.save(user);
    }
}

// Spring 生成的代理类（简化）
class UserServiceProxy extends UserService {
    private PlatformTransactionManager txManager;

    @Override
    public void createUser(User user) {
        TransactionStatus tx = txManager.getTransaction(...);
        try {
            super.createUser(user);
            txManager.commit(tx);
        } catch (Throwable e) {
            txManager.rollback(tx);
            throw e;
        }
    }
}
```

**关键细节**：

1. **代理机制**：默认用 CGLIB 子类代理（无需接口）。
2. **自调用失效**：同类内部方法调用不经过代理，`@Transactional` 失效。
3. **rollbackFor**：默认仅 `RuntimeException` 与 `Error` 回滚，受检异常不回滚（需 `@Transactional(rollbackFor = Exception.class)`）。
4. **传播行为**：通过 `TransactionStatus` 与线程绑定（`TransactionSynchronizationManager`）。

### 4.8 MyBatis 的 SqlSession

MyBatis 的核心抽象是 `SqlSession`，它封装了 `Connection` 与执行器：

```
SqlSession
    │
    ├── Executor（执行器）
    │   ├── SimpleExecutor：每次都新建 PreparedStatement
    │   ├── ReuseExecutor：复用 PreparedStatement
    │   └── CachingExecutor：二级缓存装饰器
    │
    ├── StatementHandler：处理 JDBC Statement
    ├── ParameterHandler：设置参数
    └── ResultSetHandler：映射结果集
```

**MyBatis 的三层缓存**：

1. **一级缓存**：SqlSession 级（默认开启），同一 SqlSession 内相同查询返回缓存。
2. **二级缓存**：Mapper 级（需配置），跨 SqlSession 共享。
3. **应用级缓存**：通常用 Spring Cache + Redis 替代。

**一级缓存的陷阱**：在 Spring 集成中，每次 Mapper 调用通常新建 SqlSession（除非在 `@Transactional` 内），一级缓存几乎无效。这与 MyBatis 原生用法（一个 SqlSession 跨多次查询）不同。

### 4.9 R2DBC 的事务模型

R2DBC 的事务与 JDBC 截然不同（响应式 + 非阻塞）：

```java
// 显式事务
ConnectionFactory factory = ...;
Mono.from(factory.create())
    .flatMap(connection -> {
        return Mono.from(connection.beginTransaction())
            .then(Mono.from(connection.createStatement("UPDATE accounts SET balance = balance - 100 WHERE id = 1").execute()))
            .flatMap(Result::getRowsUpdated)
            .then(Mono.from(connection.createStatement("UPDATE accounts SET balance = balance + 100 WHERE id = 2").execute()))
            .flatMap(Result::getRowsUpdated)
            .then(Mono.from(connection.commitTransaction()))
            .onErrorResume(e -> Mono.from(connection.rollbackTransaction()).then(Mono.error(e)))
            .finally(() -> Mono.from(connection.close()).subscribe());
    });

// Spring Data R2DBC 的事务
@Transactional
public Mono<Void> transfer(Long from, Long to, BigDecimal amount) {
    return accountRepository.deduct(from, amount)
        .then(accountRepository.add(to, amount))
        .then();
}
```

**关键差异**：

- **无 ThreadLocal**：响应式栈不能用 ThreadLocal 传递 Connection，而用 Reactor Context。
- **事务边界**：`@Transactional` 用 AOP 包裹，但内部用 `TransactionalOperator` 而非 `PlatformTransactionManager`。
- **隔离级别**：同 JDBC，但实现依赖于具体驱动（PostgreSQL R2DBC 支持）。

---

## 5. 代码示例：从入门到进阶的完整实战

### 5.1 示例 1：JdbcTemplate 基础

```java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class UserDao {

    private final JdbcTemplate jdbcTemplate;
    private final SimpleJdbcInsert userInsert;

    public UserDao(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.userInsert = new SimpleJdbcInsert(jdbcTemplate)
            .withTableName("users")
            .usingGeneratedKeyColumns("id");
    }

    // 查询所有
    public List<User> findAll() {
        return jdbcTemplate.query("SELECT id, name, email FROM users", new UserRowMapper());
    }

    // 按 ID 查询
    public User findById(Long id) {
        return jdbcTemplate.queryForObject(
            "SELECT id, name, email FROM users WHERE id = ?",
            new UserRowMapper(),
            id
        );
    }

    // 插入（返回主键）
    public Long insert(User user) {
        Map<String, Object> params = new HashMap<>();
        params.put("name", user.getName());
        params.put("email", user.getEmail());
        Number key = userInsert.executeAndReturnKey(params);
        return key.longValue();
    }

    // 更新
    public int update(User user) {
        return jdbcTemplate.update(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            user.getName(), user.getEmail(), user.getId()
        );
    }

    // 删除
    public int delete(Long id) {
        return jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
    }

    // 批量插入
    public int[] batchInsert(List<User> users) {
        return jdbcTemplate.batchUpdate(
            "INSERT INTO users(name, email) VALUES(?, ?)",
            users,
            100,  // batch size
            (ps, user) -> {
                ps.setString(1, user.getName());
                ps.setString(2, user.getEmail());
            }
        );
    }

    // 自定义 RowMapper
    static class UserRowMapper implements RowMapper<User> {
        @Override
        public User mapRow(ResultSet rs, int rowNum) throws SQLException {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setName(rs.getString("name"));
            user.setEmail(rs.getString("email"));
            return user;
        }
    }
}
```

### 5.2 示例 2：Spring Data JPA 基础

```java
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// 实体类
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(unique = true, length = 100)
    private String email;

    private Integer age;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public User() {}

    public User(String name, String email, Integer age) {
        this.name = name;
        this.email = email;
        this.age = age;
    }

    // getter/setter 省略
}

// Repository 接口（无需实现类）
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    // 方法名派生查询
    List<User> findByName(String name);
    List<User> findByNameAndAge(String name, Integer age);
    List<User> findByAgeGreaterThan(Integer age);
    List<User> findByEmailContaining(String domain);
    Optional<User> findByEmail(String email);
    List<User> findByCreatedAtAfter(LocalDateTime date);

    // 排序
    List<User> findByAgeGreaterThanOrderByIdDesc(Integer age);

    // 分页
    Page<User> findByAgeGreaterThan(Integer age, Pageable pageable);

    // 去重
    List<User> findDistinctByName(String name);

    // Top/Limit
    List<User> findTop10ByOrderByCreatedAtDesc();

    // 自定义 JPQL
    @Query("SELECT u FROM User u WHERE u.email LIKE %:domain")
    List<User> findByEmailDomain(@Param("domain") String domain);

    // 原生 SQL
    @Query(value = "SELECT * FROM users WHERE age > :age", nativeQuery = true)
    List<User> findByAgeNative(@Param("age") Integer age);

    // 更新
    @Modifying
    @Query("UPDATE User u SET u.name = :name WHERE u.id = :id")
    int updateName(@Param("id") Long id, @Param("name") String name);

    // 删除
    @Modifying
    @Query("DELETE FROM User u WHERE u.age < :age")
    int deleteByAgeLessThan(@Param("age") Integer age);
}
```

### 5.3 示例 3：JPA 实体关联

```java
import javax.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // 一对多（双向）
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Order> orders = new ArrayList<>();

    // 便捷方法
    public void addOrder(Order order) {
        orders.add(order);
        order.setUser(this);
    }

    public void removeOrder(Order order) {
        orders.remove(order);
        order.setUser(null);
    }
}

@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal totalAmount;

    // 多对一（默认 EAGER，建议改为 LAZY）
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // 一对多
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    // 多对多
    @ManyToMany
    @JoinTable(
        name = "order_tags",
        joinColumns = @JoinColumn(name = "order_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private List<Tag> tags = new ArrayList<>();
}

@Entity
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String productName;
    private BigDecimal price;
    private Integer quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;
}

@Entity
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToMany(mappedBy = "tags")
    private List<Order> orders = new ArrayList<>();
}
```

### 5.4 示例 4：Specification 动态查询

```java
import org.springframework.data.jpa.domain.Specification;
import javax.persistence.criteria.*;
import java.util.ArrayList;
import java.util.List;

public class UserSpecs {

    public static Specification<User> hasName(String name) {
        return (root, query, cb) ->
            name == null ? null : cb.equal(root.get("name"), name);
    }

    public static Specification<User> ageBetween(Integer min, Integer max) {
        return (root, query, cb) -> {
            if (min == null && max == null) return null;
            if (min == null) return cb.lessThanOrEqualTo(root.get("age"), max);
            if (max == null) return cb.greaterThanOrEqualTo(root.get("age"), min);
            return cb.between(root.get("age"), min, max);
        };
    }

    public static Specification<User> emailContains(String keyword) {
        return (root, query, cb) ->
            keyword == null ? null : cb.like(root.get("email"), "%" + keyword + "%");
    }

    public static Specification<User> hasOrder() {
        return (root, query, cb) -> {
            query.distinct(true);
            Join<User, Order> orderJoin = root.join("orders", JoinType.INNER);
            return cb.isNotNull(orderJoin.get("id"));
        };
    }
}

// 使用
@Service
public class UserService {
    private final UserRepository userRepository;

    public List<User> search(String name, Integer minAge, Integer maxAge, String emailKeyword) {
        Specification<User> spec = Specification
            .where(UserSpecs.hasName(name))
            .and(UserSpecs.ageBetween(minAge, maxAge))
            .and(UserSpecs.emailContains(emailKeyword));
        return userRepository.findAll(spec);
    }
}
```

### 5.5 示例 5：MyBatis 注解与 XML

```java
import org.apache.ibatis.annotations.*;
import org.apache.ibatis.session.RowBounds;
import java.util.List;

@Mapper
public interface UserMapper {

    @Select("SELECT id, name, email, age FROM users WHERE id = #{id}")
    User findById(@Param("id") Long id);

    @Insert("INSERT INTO users(name, email, age) VALUES(#{name}, #{email}, #{age})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(User user);

    @Update("UPDATE users SET name = #{name}, email = #{email}, age = #{age} WHERE id = #{id}")
    int update(User user);

    @Delete("DELETE FROM users WHERE id = #{id}")
    int delete(Long id);

    // 复杂查询走 XML
    List<User> searchUsers(UserQuery query);

    // 关联查询（XML resultMap）
    User findByIdWithOrders(Long id);

    // 批量插入（XML）
    int batchInsert(@Param("users") List<User> users);
}
```

`UserMapper.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">

    <!-- 简单结果映射 -->
    <resultMap id="userMap" type="com.example.entity.User">
        <id property="id" column="id"/>
        <result property="name" column="name"/>
        <result property="email" column="email"/>
        <result property="age" column="age"/>
    </resultMap>

    <!-- 复杂结果映射（一对多） -->
    <resultMap id="userWithOrdersMap" type="com.example.entity.User">
        <id property="id" column="user_id"/>
        <result property="name" column="user_name"/>
        <result property="email" column="user_email"/>
        <collection property="orders" ofType="com.example.entity.Order">
            <id property="id" column="order_id"/>
            <result property="totalAmount" column="total_amount"/>
            <collection property="items" ofType="com.example.entity.OrderItem">
                <id property="id" column="item_id"/>
                <result property="productName" column="product_name"/>
                <result property="price" column="price"/>
                <result property="quantity" column="quantity"/>
            </collection>
        </collection>
    </resultMap>

    <!-- 动态 SQL -->
    <select id="searchUsers" resultMap="userMap">
        SELECT id, name, email, age FROM users
        <where>
            <if test="name != null and name != ''">
                AND name LIKE CONCAT('%', #{name}, '%')
            </if>
            <if test="minAge != null">
                AND age &gt;= #{minAge}
            </if>
            <if test="maxAge != null">
                AND age &lt;= #{maxAge}
            </if>
            <if test="email != null and email != ''">
                AND email LIKE CONCAT('%', #{email}, '%')
            </if>
        </where>
        ORDER BY id
        <if test="limit != null">
            LIMIT #{limit}
        </if>
    </select>

    <!-- 关联查询 -->
    <select id="findByIdWithOrders" resultMap="userWithOrdersMap">
        SELECT
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            o.id as order_id,
            o.total_amount,
            oi.id as item_id,
            oi.product_name,
            oi.price,
            oi.quantity
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE u.id = #{id}
    </select>

    <!-- 批量插入 -->
    <insert id="batchInsert">
        INSERT INTO users(name, email, age) VALUES
        <foreach collection="users" item="user" separator=",">
            (#{user.name}, #{user.email}, #{user.age})
        </foreach>
    </insert>

    <!-- foreach 查询 -->
    <select id="findByIds" resultMap="userMap">
        SELECT id, name, email, age FROM users
        WHERE id IN
        <foreach collection="ids" item="id" open="(" separator="," close=")">
            #{id}
        </foreach>
    </select>
</mapper>
```

### 5.6 示例 6：事务管理

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;

@Service
public class TransferService {

    private final AccountRepository accountRepo;
    private final TransactionTemplate txTemplate;

    public TransferService(AccountRepository accountRepo, TransactionTemplate txTemplate) {
        this.accountRepo = accountRepo;
        this.txTemplate = txTemplate;
    }

    // 声明式事务（默认 REQUIRED）
    @Transactional
    public void transfer(Long from, Long to, BigDecimal amount) {
        Account fromAccount = accountRepo.findById(from)
            .orElseThrow(() -> new IllegalArgumentException("From account not found"));
        Account toAccount = accountRepo.findById(to)
            .orElseThrow(() -> new IllegalArgumentException("To account not found"));

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("Insufficient balance");
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        accountRepo.save(fromAccount);
        accountRepo.save(toAccount);
    }

    // REQUIRES_NEW：独立事务（即使外层有事务也挂起）
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logTransfer(Long from, Long to, BigDecimal amount) {
        // 即使主事务回滚，日志也保留
        transferLogRepo.save(new TransferLog(from, to, amount));
    }

    // 受检异常不回滚（默认）
    @Transactional(rollbackFor = Exception.class)  // 所有异常都回滚
    public void transferStrict(Long from, Long to, BigDecimal amount) throws Exception {
        // ...
    }

    // 编程式事务（更细粒度）
    public void transferProgrammatic(Long from, Long to, BigDecimal amount) {
        txTemplate.execute(status -> {
            try {
                Account fromAccount = accountRepo.findById(from).orElseThrow();
                Account toAccount = accountRepo.findById(to).orElseThrow();

                fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
                toAccount.setBalance(toAccount.getBalance().add(amount));

                accountRepo.save(fromAccount);
                accountRepo.save(toAccount);
                return null;
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }

    // 隔离级别
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Account getAccount(Long id) {
        return accountRepo.findById(id).orElseThrow();
    }

    // 超时
    @Transactional(timeout = 5)  // 5 秒超时
    public void slowOperation() {
        // ...
    }

    // 只读
    @Transactional(readOnly = true)
    public List<Account> getAllAccounts() {
        return accountRepo.findAll();
    }
}
```

### 5.7 示例 7：多数据源配置

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

// 主数据源配置
@Configuration
public class PrimaryDataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean primaryEntityManagerFactory() {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(primaryDataSource());
        em.setPackagesToScan("com.example.entity.primary");
        em.setPersistenceUnitName("primary");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.hbm2ddl.auto", "none");
        properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        em.setJpaPropertyMap(properties);

        return em;
    }

    @Bean
    @Primary
    public PlatformTransactionManager primaryTransactionManager() {
        JpaTransactionManager tm = new JpaTransactionManager();
        tm.setEntityManagerFactory(primaryEntityManagerFactory().getObject());
        return tm;
    }
}

// 从数据源配置
@Configuration
public class SecondaryDataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean secondaryEntityManagerFactory() {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(secondaryDataSource());
        em.setPackagesToScan("com.example.entity.secondary");
        em.setPersistenceUnitName("secondary");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.hbm2ddl.auto", "none");
        properties.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        em.setJpaPropertyMap(properties);

        return em;
    }

    @Bean
    public PlatformTransactionManager secondaryTransactionManager() {
        JpaTransactionManager tm = new JpaTransactionManager();
        tm.setEntityManagerFactory(secondaryEntityManagerFactory().getObject());
        return tm;
    }
}
```

### 5.8 示例 8：Spring Data R2DBC

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.r2dbc.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.math.BigDecimal;

@Table("accounts")
public class Account {
    @Id
    private Long id;
    private String owner;
    private BigDecimal balance;
    // getter/setter 省略
}

public interface AccountRepository extends R2dbcRepository<Account, Long> {
    @Query("SELECT * FROM accounts WHERE balance > :min")
    Flux<Account> findByBalanceGreaterThan(@Param("min") BigDecimal min);

    @Query("UPDATE accounts SET balance = balance - :amount WHERE id = :id")
    Mono<Integer> deduct(@Param("id") Long id, @Param("amount") BigDecimal amount);

    @Query("UPDATE accounts SET balance = balance + :amount WHERE id = :id")
    Mono<Integer> add(@Param("id") Long id, @Param("amount") BigDecimal amount);
}

@Service
public class ReactiveTransferService {
    private final AccountRepository accountRepo;
    private final DatabaseClient databaseClient;

    public Mono<Void> transfer(Long from, Long to, BigDecimal amount) {
        return databaseClient.sql("BEGIN").fetch().rowsUpdated()
            .then(accountRepo.deduct(from, amount))
            .flatMap(updated -> {
                if (updated == 0) {
                    return databaseClient.sql("ROLLBACK").fetch().rowsUpdated()
                        .then(Mono.error(new IllegalStateException("Deduct failed")));
                }
                return accountRepo.add(to, amount);
            })
            .flatMap(updated -> {
                if (updated == 0) {
                    return databaseClient.sql("ROLLBACK").fetch().rowsUpdated()
                        .then(Mono.error(new IllegalStateException("Add failed")));
                }
                return databaseClient.sql("COMMIT").fetch().rowsUpdated().then();
            })
            .onErrorResume(e ->
                databaseClient.sql("ROLLBACK").fetch().rowsUpdated()
                    .then(Mono.error(e)));
    }
}
```

### 5.9 示例 9：缓存集成

```java
import org.springframework.cache.annotation.*;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    // 本地缓存（开发环境）
    @Bean
    @Profile("dev")
    public ConcurrentMapCacheManager devCacheManager() {
        return new ConcurrentMapCacheManager("users", "orders");
    }

    // Redis 缓存（生产环境）
    @Bean
    @Profile("prod")
    public RedisCacheManager prodCacheManager(RedisConnectionFactory factory) {
        RedisCacheManager.RedisCacheManagerBuilder builder = RedisCacheManager.builder(factory);
        builder.withCacheConfiguration("users",
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)));
        builder.withCacheConfiguration("orders",
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10)));
        return builder.build();
    }
}

@Service
public class CachedUserService {

    private final UserRepository userRepository;

    @Cacheable(value = "users", key = "#id")
    public User getUserById(Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    @Cacheable(value = "users", key = "#name", unless = "#result == null")
    public User getUserByName(String name) {
        return userRepository.findByName(name).stream().findFirst().orElse(null);
    }

    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void clearAllUsers() {
        // 清空 users 缓存
    }
}
```

### 5.10 示例 10：批量优化

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.List;

@Service
public class BatchService {

    @PersistenceContext
    private EntityManager em;

    // 反模式：saveAll 逐条 INSERT
    public void badBatchInsert(List<User> users) {
        userRepository.saveAll(users);  // 每条一个 INSERT
    }

    // 正确：JPA 批量插入
    @Transactional
    public void batchInsert(List<User> users) {
        for (int i = 0; i < users.size(); i++) {
            em.persist(users.get(i));
            if (i % 100 == 0) {
                em.flush();  // 每 100 条 flush 一次
                em.clear();   // 清空 PersistenceContext，释放内存
            }
        }
    }

    // JDBC 批量插入（最快）
    public void jdbcBatchInsert(List<User> users) {
        jdbcTemplate.batchUpdate(
            "INSERT INTO users(name, email, age) VALUES(?, ?, ?)",
            users,
            1000,  // batch size
            (ps, user) -> {
                ps.setString(1, user.getName());
                ps.setString(2, user.getEmail());
                ps.setInt(3, user.getAge());
            }
        );
    }

    // 批量更新
    @Transactional
    public void batchUpdate(List<User> users) {
        for (int i = 0; i < users.size(); i++) {
            em.merge(users.get(i));
            if (i % 100 == 0) {
                em.flush();
                em.clear();
            }
        }
    }
}
```

`application.yml` 中的 Hibernate 批量配置：

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50              # 批量大小
          batch_versioned_data: true
        order_inserts: true           # 排序 inserts，提高批量命中
        order_updates: true
        batch_fetch_style: DYNAMIC    # 动态批量加载
```

---

## 6. 对比分析

### 6.1 JPA vs MyBatis vs JdbcTemplate vs R2DBC

| 维度 | JPA / Hibernate | MyBatis | JdbcTemplate | R2DBC |
|------|----------------|---------|--------------|-------|
| 抽象层次 | 高（对象模型） | 中（SQL Mapper） | 低（薄封装） | 中（响应式） |
| SQL 控制力 | 低（自动生成） | 高（手写 SQL） | 高（手写 SQL） | 中（自动+手写） |
| 开发效率 | 高 | 中 | 低 | 中 |
| 学习曲线 | 陡峭 | 平缓 | 平缓 | 陡峭 |
| 性能 | 中等（懒加载、脏检查开销） | 高 | 高 | 高 |
| 灵活性 | 低（复杂 SQL 难） | 高 | 极高 | 中 |
| 维护性 | 中（"魔法"多） | 高 | 中（样板代码） | 中 |
| 响应式支持 | 无 | 无 | 无 | 原生 |
| 复杂查询 | 难（JPQL/Criteria） | 易（XML/注解） | 易 | 中 |
| 跨数据库 | 易（Dialect） | 需手写方言 | 需手写 | 易 |
| 生态 | 极成熟 | 成熟 | 极成熟 | 成长中 |

**选型建议**：

- **快速 CRUD + 复杂领域模型**：JPA。
- **复杂 SQL + 性能优化**：MyBatis。
- **简单场景 + 脚本任务**：JdbcTemplate。
- **响应式栈（WebFlux）**：R2DBC。
- **混合**：JPA 主导 + MyBatis 处理复杂查询。

### 6.2 JPA vs Hibernate vs Spring Data JPA

这三者常被混淆，关键区别：

```
Spring Data JPA（Repository 抽象）
    │ 依赖
    ▼
JPA（规范，jakarta.persistence.*）
    │ 实现于
    ▼
Hibernate（JPA 实现，含 Hibernate 特有 API）
```

- **JPA**：规范（JSR-338），定义 `EntityManager`、`@Entity` 等接口与注解。
- **Hibernate**：JPA 实现，提供 `Session` 等 Hibernate 专有 API（建议用 JPA 标准 API）。
- **Spring Data JPA**：在 JPA 之上的 Repository 抽象，自动生成 SimpleJpaRepository 实现。

### 6.3 HikariCP vs Druid vs DBCP

| 维度 | HikariCP | Druid | DBCP 2 |
|------|----------|-------|--------|
| 性能 | 最高 | 高 | 中 |
| 代码量 | ~13KB | ~200KB | ~80KB |
| 功能 | 极简 | 丰富（监控、SQL 解析） | 中 |
| Spring Boot 默认 | 是 | 否 | 否 |
| 监控 | 弱（需 Micrometer） | 强（内置 Druid Monitor） | 弱 |
| SQL 注入防护 | 无 | 有（WallFilter） | 无 |
| 适用场景 | 极致性能 | 监控需求强 | 遗留系统 |

**选型**：

- 默认 HikariCP（Spring Boot 默认）。
- 需要强监控与 SQL 防护选 Druid。

### 6.4 EAGER vs LAZY 加载

| 维度 | EAGER | LAZY |
|------|-------|------|
| 加载时机 | 立即加载 | 首次访问时加载 |
| SQL 次数 | 总是 JOIN | 单独 SELECT |
| 内存占用 | 高 | 低 |
| N+1 风险 | 无（但有过度加载） | 有 |
| 适用场景 | 必然访问的关联 | 可能不访问的关联 |

**最佳实践**：默认 LAZY，仅在确需立即访问时用 `JOIN FETCH` 或 `@EntityGraph`。

### 6.5 一级缓存 vs 二级缓存

| 维度 | 一级缓存（L1） | 二级缓存（L2） |
|------|--------------|--------------|
| 作用域 | Session/事务 | SessionFactory/应用 |
| 默认开启 | 是 | 否（需配置） |
| 共享性 | 不共享 | 跨 Session 共享 |
| 失效时机 | Session 关闭 | 配置 TTL 或手动 evict |
| 适用场景 | 防止事务内重复查询 | 跨事务的只读数据缓存 |

---

## 7. 陷阱与反模式

### 7.1 反模式 1：N+1 查询问题

```java
// 反模式：默认 LAZY 导致 N+1
List<Order> orders = orderRepository.findAll();  // 1 次 SELECT
for (Order order : orders) {
    System.out.println(order.getUser().getName());  // N 次 SELECT
}

// 正确：JOIN FETCH 或 @EntityGraph
@Query("SELECT o FROM Order o JOIN FETCH o.user")
List<Order> findAllWithUser();
```

### 7.2 反模式 2：在 Controller 中直接用 Repository

```java
// 反模式：Controller 直接调 Repository
@RestController
public class UserController {
    private final UserRepository userRepository;
    @GetMapping
    public List<User> list() {
        return userRepository.findAll();  // 直接暴露实体，绕过业务层
    }
}

// 正确：通过 Service 层封装
@RestController
public class UserController {
    private final UserService userService;
    @GetMapping
    public List<UserDTO> list() {
        return userService.findAll().stream()
            .map(UserDTO::from)
            .collect(toList());
    }
}
```

### 7.3 反模式 3：自调用 @Transactional 失效

```java
// 反模式：同类内方法调用，AOP 代理失效
@Service
public class UserService {
    public void batchCreate(List<User> users) {
        for (User user : users) {
            createOne(user);  // 直接调用，未走代理，@Transactional 失效
        }
    }

    @Transactional
    public void createOne(User user) {
        userRepository.save(user);
    }
}

// 正确：通过注入自身代理
@Service
public class UserService {
    @Autowired
    private UserService self;  // 注入代理

    public void batchCreate(List<User> users) {
        for (User user : users) {
            self.createOne(user);  // 走代理，事务生效
        }
    }
}

// 或拆分到不同 Bean
@Service
public class UserBatchService {
    private final UserService userService;
    public void batchCreate(List<User> users) {
        for (User user : users) {
            userService.createOne(user);  // 走代理
        }
    }
}
```

### 7.4 反模式 4：受检异常不回滚

```java
// 反模式：受检异常不回滚，数据不一致
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) throws IOException {
    accountRepo.deduct(from, amount);
    accountRepo.add(to, amount);
    writeLog(from, to, amount);  // 抛 IOException
    // 即使写日志失败，转账已提交（默认不回滚受检异常）
}

// 正确：显式声明 rollbackFor
@Transactional(rollbackFor = Exception.class)
public void transfer(Long from, Long to, BigDecimal amount) throws IOException {
    // ...
}
```

### 7.5 反模式 5：过度使用 CascadeType.ALL

```java
// 反模式：CascadeType.ALL 在多对多中导致意外删除
@ManyToMany(cascade = CascadeType.ALL)
private List<Tag> tags = new ArrayList<>();
// 删除 Order 会删除所有关联的 Tag，影响其他 Order

// 正确：多对多不用 cascade
@ManyToMany
@JoinTable(...)
private List<Tag> tags = new ArrayList<>();

// 正确：一对多中谨慎选择
@OneToMany(mappedBy = "order", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
private List<OrderItem> items;  // 只级联保存与合并，不级联删除
```

### 7.6 反模式 6：saveAll 用于大批量插入

```java
// 反模式：saveAll 逐条 INSERT，性能极差
public void importUsers(List<User> users) {
    userRepository.saveAll(users);  // 10 万条 → 10 万次 INSERT
}

// 正确：JDBC 批量插入
public void importUsers(List<User> users) {
    jdbcTemplate.batchUpdate(
        "INSERT INTO users(name, email) VALUES(?, ?)",
        users, 1000,
        (ps, u) -> { ps.setString(1, u.getName()); ps.setString(2, u.getEmail()); }
    );
}

// 或 JPA 批量（配置 hibernate.jdbc.batch_size）
@Transactional
public void importUsersJpa(List<User> users) {
    for (int i = 0; i < users.size(); i++) {
        em.persist(users.get(i));
        if (i % 1000 == 0) { em.flush(); em.clear(); }
    }
}
```

### 7.7 反模式 7：在事务中调用远程服务

```java
// 反模式：事务内调用远程服务，长事务占用连接
@Transactional
public void processOrder(Long orderId) {
    Order order = orderRepo.findById(orderId).orElseThrow();
    order.setStatus("PROCESSING");
    orderRepo.save(order);

    // 远程调用（HTTP、RPC）耗时几秒，事务长时间持有连接
    paymentService.charge(order);  // 慢！

    order.setStatus("DONE");
    orderRepo.save(order);
}

// 正确：事务拆分，远程调用放事务外
public void processOrder(Long orderId) {
    Order order = getOrder(orderId);  // 事务1：读
    updateStatus(orderId, "PROCESSING");  // 事务2：更新

    paymentService.charge(order);  // 事务外：远程调用

    updateStatus(orderId, "DONE");  // 事务3：更新
}
```

### 7.8 反模式 8：忽略 readOnly 优化

```java
// 反模式：只读查询用默认事务，错过优化
@Transactional
public List<User> getAllUsers() {
    return userRepository.findAll();
}

// 正确：声明 readOnly
@Transactional(readOnly = true)
public List<User> getAllUsers() {
    return userRepository.findAll();
}
```

`readOnly = true` 的优化：

1. Hibernate 不进行脏检查。
2. FlushMode 设为 `MANUAL`。
3. 驱动层可优化（如 PostgreSQL 只读连接）。

### 7.9 反模式 9：MyBatis #{} 与 ${} 误用

```java
// 反模式：${} 拼接字符串，SQL 注入风险
@Select("SELECT * FROM users WHERE name = '${name}'")
User findByName(@Param("name") String name);
// 输入 "admin' OR '1'='1" → SELECT * FROM users WHERE name = 'admin' OR '1'='1'

// 正确：#{} 预编译参数
@Select("SELECT * FROM users WHERE name = #{name}")
User findByName(@Param("name") String name);
// 输入 "admin' OR '1'='1" → SELECT * FROM users WHERE name = ?（参数化）

// ${} 的合法用途：动态表名、列名（需白名单校验）
@Select("SELECT * FROM ${table} WHERE id = #{id}")
User findById(@Param("table") String table, @Param("id") Long id);
```

### 7.10 反模式 10：缓存不一致

```java
// 反模式：只读缓存未在更新时清空
@Cacheable("users")
public User getUser(Long id) { return userRepo.findById(id).orElseThrow(); }

public void updateName(Long id, String name) {
    userRepo.updateName(id, name);
    // 缓存未更新，getUser 仍返回旧值
}

// 正确：更新时清空或更新缓存
@CachePut(value = "users", key = "#user.id")
public User updateUser(User user) {
    return userRepo.save(user);
}

// 或：删除缓存，下次查询重建
@CacheEvict(value = "users", key = "#id")
public void updateUser(Long id, User user) {
    userRepo.save(user);
}
```

---

## 8. 工程实践

### 8.1 读写分离架构

```java
// 抽象数据源路由
public class ReadWriteDataSourceRouter extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
            ? "read"
            : "write";
    }
}

// 配置
@Configuration
public class ReadWriteDataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.write")
    public DataSource writeDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.read")
    public DataSource readDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @Primary
    public DataSource routingDataSource() {
        ReadWriteDataSourceRouter router = new ReadWriteDataSourceRouter();
        Map<Object, Object> targets = new HashMap<>();
        targets.put("write", writeDataSource());
        targets.put("read", readDataSource());
        router.setTargetDataSources(targets);
        router.setDefaultTargetDataSource(writeDataSource());
        return router;
    }
}

// 使用：通过 readOnly 标识
@Service
public class UserService {
    @Transactional(readOnly = true)  // 走从库
    public User getUser(Long id) { ... }

    @Transactional  // 走主库
    public void updateUser(User user) { ... }
}
```

### 8.2 分库分表（ShardingSphere）

```yaml
# application.yml
spring:
  shardingsphere:
    datasource:
      names: ds0,ds1
      ds0: { ... }
      ds1: { ... }
    rules:
      sharding:
        tables:
          orders:
            actual-data-nodes: ds${0..1}.orders${0..3}
            database-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: db-mod
            table-strategy:
              standard:
                sharding-column: order_id
                sharding-algorithm-name: table-mod
        sharding-algorithms:
          db-mod:
            type: MOD
            props: { sharding-count: 2 }
          table-mod:
            type: MOD
            props: { sharding-count: 4 }
```

### 8.3 数据库迁移（Flyway）

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    baseline-version: 0
    validate-on-migrate: true
```

`src/main/resources/db/migration/V1__create_users.sql`：

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 8.4 监控与可观测性

```yaml
# 开启 Hibernate 统计
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true
        session_events.log: true

# HikariCP 监控
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,statistic
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

```java
// 自定义指标
@Service
public class MonitoredUserService {
    private final MeterRegistry registry;
    private final UserRepository userRepo;

    public List<User> findAll() {
        Timer.Sample sample = Timer.start(registry);
        try {
            return userRepo.findAll();
        } finally {
            sample.stop(registry.timer("user.query", "method", "findAll"));
        }
    }
}
```

### 8.5 审计功能

```java
// 配置类
@Configuration
@EnableJpaAuditing
public class JpaConfig {
    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            return Optional.ofNullable(auth != null ? auth.getName() : "system");
        };
    }
}

// 基类
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String lastModifiedBy;

    @Version
    private Long version;  // 乐观锁
}
```

### 8.6 与虚拟线程集成

```yaml
# Spring Boot 3.2+
spring:
  threads:
    virtual:
      enabled: true
```

```java
// JDBC + 虚拟线程：每个请求一个虚拟线程，阻塞 I/O 自动卸载
@Service
public class VirtualThreadUserService {
    private final UserRepository userRepo;

    // 无需改代码，Spring Boot 自动用虚拟线程执行
    public List<User> findAll() {
        return userRepo.findAll();  // JDBC 阻塞，但虚拟线程不占用载体线程
    }
}

// 响应式 + 虚拟线程桥接
@Service
public class HybridService {
    private final UserRepository jdbcRepo;  // JDBC
    private final ReactiveRepository reactiveRepo;  // R2DBC

    public Mono<Result> hybridQuery(Long id) {
        return Mono.fromCallable(() -> jdbcRepo.findById(id).orElseThrow())
            .subscribeOn(Schedulers.fromExecutor(
                Executors.newVirtualThreadPerTaskExecutor()))  // 虚拟线程
            .flatMap(user -> reactiveRepo.findByUserId(user.getId()));
    }
}
```

---

## 9. 案例研究：主流框架实践

### 9.1 案例研究 1：Spring Boot 官方推荐的 JPA 实践

Spring Boot 官方文档推荐的标准 JPA 分层：

```java
// Entity
@Entity
@Table(name = "users")
public class User { ... }

// Repository
public interface UserRepository extends JpaRepository<User, Long> { ... }

// Service
@Service
@Transactional
public class UserService {
    private final UserRepository userRepository;
    public User createUser(User user) { return userRepository.save(user); }
    @Transactional(readOnly = true)
    public User getUser(Long id) { return userRepository.findById(id).orElseThrow(); }
}

// Controller
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    @PostMapping public User create(@RequestBody User user) { return userService.createUser(user); }
    @GetMapping("/{id}") public User get(@PathVariable Long id) { return userService.getUser(id); }
}
```

### 9.2 案例研究 2：MyBatis-Plus 增强

```java
import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import java.util.List;

@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String email;
    private Integer age;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableLogic
    private Integer deleted;  // 逻辑删除
}

@Mapper
public interface UserMapper extends BaseMapper<User> {
    // 自动拥有 selectById、insert、updateById、deleteById 等
}

@Service
public class UserService extends ServiceImpl<UserMapper, User> implements IService<User> {
    // 自动拥有 save、removeById、updateById、getById 等

    // Lambda 条件构造器（类型安全）
    public List<User> findActiveUsers(String name) {
        return lambdaQuery()
            .like(User::getName, name)
            .gt(User::getAge, 18)
            .eq(User::getStatus, 1)
            .orderByDesc(User::getCreatedAt)
            .list();
    }

    // 分页
    public Page<User> findPage(int current, int size) {
        return page(new Page<>(current, size),
            new QueryWrapper<User>().orderByDesc("created_at"));
    }
}
```

### 9.3 案例研究 3：JPA + MyBatis 混合方案

```java
// 简单 CRUD 用 JPA
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

// 复杂报表查询用 MyBatis
@Mapper
public interface UserReportMapper {
    List<UserStatsDTO> getUserStats(LocalDateTime start, LocalDateTime end);
    List<UserOrderDTO> getUserOrdersWithDetails(List<Long> userIds);
}

@Service
public class UserFacade {
    private final UserRepository userRepo;       // JPA
    private final UserReportMapper reportMapper; // MyBatis

    // CRUD
    public User createUser(User user) { return userRepo.save(user); }
    public Optional<User> findByEmail(String email) { return userRepo.findByEmail(email); }

    // 复杂查询
    public List<UserStatsDTO> getStats(LocalDateTime start, LocalDateTime end) {
        return reportMapper.getUserStats(start, end);
    }
}
```

### 9.4 案例研究 4：分布式事务（Seata）

```java
import io.seata.spring.annotation.GlobalTransactional;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final InventoryClient inventoryClient;
    private final AccountClient accountClient;

    @GlobalTransactional  // 分布式事务
    public void createOrder(OrderRequest req) {
        // 1. 创建订单（本地事务）
        Order order = new Order(req);
        orderRepo.save(order);

        // 2. 扣库存（远程服务）
        inventoryClient.deduct(req.getProducts());

        // 3. 扣余额（远程服务）
        accountClient.charge(req.getUserId(), req.getAmount());

        // 任一步骤失败，全局回滚
    }
}
```

### 9.5 案例研究 5：响应式数据访问栈

```java
// 完整响应式数据栈
@Configuration
public class ReactiveDataConfig {

    @Bean
    public ConnectionFactory connectionFactory() {
        return PostgresqlConnectionFactory.builder()
            .host("localhost").port(5432)
            .database("mydb").username("user").password("pass")
            .build();
    }

    @Bean
    public DatabaseClient databaseClient(ConnectionFactory factory) {
        return DatabaseClient.builder().connectionFactory(factory).build();
    }

    @Bean
    public ReactiveRedisTemplate<String, String> redisTemplate(
            ReactiveRedisConnectionFactory factory) {
        return new ReactiveRedisTemplate<>(factory,
            RedisSerializationContext.string());
    }
}

@Service
public class ReactiveUserService {
    private final UserRepository userRepo;          // R2DBC
    private final ReactiveRedisTemplate<String, User> redis;  // Redis
    private final WebClient webClient;              // HTTP

    public Mono<User> getUser(Long id) {
        return redis.opsForValue().get("user:" + id)
            .switchIfEmpty(userRepo.findById(id)
                .flatMap(u -> redis.opsForValue()
                    .set("user:" + id, u, Duration.ofMinutes(30))
                    .then(Mono.just(u))));
    }

    public Flux<Order> getUserOrders(Long userId) {
        return webClient.get()
            .uri("/api/orders?userId={id}", userId)
            .retrieve()
            .bodyToFlux(Order.class);
    }
}
```

---

## 10. 习题与思考题

### 10.1 基础题

1. 描述 JPA 实体的 4 种生命周期状态及状态转移。

2. 解释 Hibernate 一级缓存与二级缓存的区别，并说明何时该用二级缓存。

3. 实现一个 UserRepository，支持按 name 模糊查询、age 范围查询、按 createdAt 排序分页。

4. 描述 `@Transactional` 的 7 种传播行为，并各举一个适用场景。

5. 解释 N+1 问题的根因，并给出 3 种解决方案。

### 10.2 进阶题

6. 实现一个支持动态查询的 Specification，能根据传入的 UserQuery（含 name、minAge、maxAge、email 等可空字段）构建查询条件。

7. 设计一个读写分离架构：写操作走主库，读操作走从库，并解决主从延迟导致的"写后读不到"问题。

8. 实现一个批量导入服务，支持 10 万条数据的快速导入，要求内存占用 < 100MB。

9. 用 MyBatis 实现一个动态 SQL，根据条件查询用户列表（name、age、email 均可空）。

10. 解释 HikariCP 的 `maximum-pool-size` 该如何设置，并说明为什么过大的连接池反而会降低性能。

### 10.3 思考题

11. **JPA 的"魔法"**：JPA 通过方法名派生查询大幅提升开发效率，但这种"魔法"是否会带来可维护性问题？什么情况下应该放弃 JPA 改用 MyBatis？

12. **事务边界**：传统事务基于 ThreadLocal 传递 Connection，响应式栈如何实现事务传播？R2DBC 的事务模型与 JDBC 有何本质区别？

13. **缓存一致性**：Spring Cache + Redis 提供了声明式缓存，但如何保证缓存与数据库的一致性？双写、失效、TTL 各有什么优劣？

14. **虚拟线程 vs 响应式**：Java 21 虚拟线程让 JDBC 重新成为高并发选项，那么 R2DBC 还有存在的必要吗？请从性能、可维护性、生态三个维度论证。

15. **分库分表后的事务**：跨库事务是分布式系统的难题，Seata、XA、TCC、Saga 各有什么优劣？什么场景该用哪种？

### 10.4 实战题

16. 用 Spring Data JPA 实现一个博客系统，包含文章、评论、标签三类实体，要求：
    - 文章与评论一对多（LAZY 加载）
    - 文章与标签多对多
    - 用 JOIN FETCH 解决文章列表的 N+1 问题
    - 用 @Transactional(readOnly = true) 优化查询

17. 用 MyBatis 实现一个订单查询接口，支持：
    - 多条件动态查询（用户名、订单状态、时间范围、金额范围）
    - 分页与排序
    - 关联查询用户与订单项

18. 设计一个多数据源架构：主库（PostgreSQL）写、从库（MySQL）读，并解决以下问题：
    - 事务跨库（用 Seata 或最终一致性）
    - 主从延迟（强制读主或缓存）
    - 数据源动态切换

19. 实现一个缓存服务，要求：
    - 本地缓存（Caffeine）+ 分布式缓存（Redis）二级架构
    - 缓存穿透、缓存击穿、缓存雪崩防护
    - 缓存与数据库一致性保证

20. **性能对比实验**：实现同一个查询接口的两个版本——JPA + Hibernate 与 MyBatis，用 JMeter 压测，对比：
    - 启动时间
    - 单次查询延迟
    - 1000 QPS 下的 CPU/内存占用
    - 复杂查询（5 表 JOIN）的延迟差异
    分析差异原因，并给出选型建议。

---

## 11. 参考文献

1. **JSR 338: Java Persistence API 2.2**. Oracle, 2017. https://jcp.org/en/jsr/detail?id=338

2. **Hibernate Reference Documentation**. Red Hat. https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html

3. **Spring Data JPA Reference**. VMware. https://docs.spring.io/spring-data/jpa/reference/

4. **MyBatis 3 User Guide**. MyBatis. https://mybatis.org/mybatis-3/

5. **Spring Framework Transaction Management**. VMware. https://docs.spring.io/spring-framework/reference/data-access/transaction.html

6. **HikariCP Wiki**. Brett Wooldridge. https://github.com/brettwooldridge/HikariCP

7. **R2DBC Specification**. Pivotal. https://r2dbc.io/spec/0.9.1.RELEASE/

8. **Spring Data R2DBC Reference**. VMware. https://docs.spring.io/spring-data/r2dbc/reference/

9. **Gray, Jim et al.** "The Transaction Concept: Virtues and Limitations". 1981.（事务概念的奠基性论文）

10. **Berenson, Hal et al.** "A Critique of ANSI SQL Isolation Levels". SIGMOD 1995.（隔离级别的深入分析）

11. **Bailis, Peter et al.** "Eventual Consistency Today: Limitations, Extensions, and Beyond". ACM Queue, 2013.

12. **Vogels, Werner**. "Eventually Consistent". ACM Queue, 2008.

13. **ShardingSphere Documentation**. Apache. https://shardingsphere.apache.org/

14. **Seata Documentation**. Alibaba. https://seata.io/

15. **Flyway Documentation**. Red Gate. https://flywaydb.org/

---

## 12. 延伸阅读

### 12.1 书籍

- "Java Persistence with Hibernate". Christian Bauer, Gavin King, Gary Gregory. Manning, 2nd Edition, 2015.
- "Spring in Action". Craig Walls. Manning, 6th Edition, 2022.
- "High-Performance Java Persistence". Vlad Mihalcea. 2016.（JPA 性能权威）
- "MyBatis in Practice". Clinton Begin.（MyBatis 作者）
- "Database Internals". Alex Petrov. O'Reilly, 2019.（数据库底层原理）
- "Designing Data-Intensive Applications". Martin Kleppmann. O'Reilly, 2017.（分布式数据系统圣经）

### 12.2 在线资源

- Spring Data 官方文档：https://docs.spring.io/spring-data/jpa/reference/
- Hibernate 官方文档：https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html
- MyBatis 官方文档：https://mybatis.org/mybatis-3/
- R2DBC 规范：https://r2dbc.io/
- Vlad Mihalcea 博客（JPA/Hibernate 性能权威）：https://vladmihalcea.com/
- HikariCP GitHub Wiki：https://github.com/brettwooldridge/HikariCP

### 12.3 相关规范与论文

- JSR 220: EJB 3.0（含 JPA 1.0）
- JSR 317: JPA 2.0
- JSR 338: JPA 2.2
- "A Critique of ANSI SQL Isolation Levels"（隔离级别）
- "BASE: An ACID Alternative"（CAP 与 BASE）
- "Saga Pattern"（分布式事务）

### 12.4 社区与生态

- Spring Data JPA GitHub: https://github.com/spring-projects/spring-data-jpa
- Hibernate GitHub: https://github.com/hibernate/hibernate-orm
- MyBatis GitHub: https://github.com/mybatis/mybatis-3
- MyBatis-Plus: https://github.com/baomidou/mybatis-plus
- HikariCP: https://github.com/brettwooldridge/HikariCP
- R2DBC: https://github.com/r2dbc
- ShardingSphere: https://github.com/apache/shardingsphere
- Seata: https://github.com/apache/incubator-seata
- Flyway: https://github.com/flyway/flyway
- Liquibase: https://github.com/liquibase/liquibase

---

## 附录 A：JPA 注解速查表

### A.1 实体注解

| 注解 | 说明 |
|------|------|
| `@Entity` | 标记为 JPA 实体 |
| `@Table(name="...")` | 指定表名 |
| `@Id` | 主键 |
| `@GeneratedValue` | 主键生成策略 |
| `@Column` | 列映射 |
| `@Transient` | 不持久化的字段 |
| `@Version` | 乐观锁版本号 |
| `@Temporal` | 日期类型（旧版） |
| `@Lob` | 大对象 |
| `@Enumerated` | 枚举映射 |

### A.2 关联注解

| 注解 | 说明 |
|------|------|
| `@OneToOne` | 一对一 |
| `@OneToMany` | 一对多 |
| `@ManyToOne` | 多对一 |
| `@ManyToMany` | 多对多 |
| `@JoinColumn` | 外键列 |
| `@JoinTable` | 关联表（多对多） |
| `@MapedBy` | 双向关联的反端 |
| `@Cascade` | 级联操作 |

### A.3 缓存注解

| 注解 | 说明 |
|------|------|
| `@Cacheable` | 启用二级缓存 |
| `@Cache` | 缓存配置 |
| `@CacheConcurrencyStrategy` | 并发策略 |

### A.4 审计注解

| 注解 | 说明 |
|------|------|
| `@CreatedDate` | 创建时间 |
| `@LastModifiedDate` | 修改时间 |
| `@CreatedBy` | 创建人 |
| `@LastModifiedBy` | 修改人 |
| `@EntityListeners` | 实体监听器 |

---

## 附录 B：MyBatis 动态 SQL 标签

### B.1 条件标签

| 标签 | 说明 |
|------|------|
| `<if test="...">` | 条件包含 |
| `<choose>` | 类似 switch |
| `<when test="...">` | choose 的 case |
| `<otherwise>` | choose 的 default |
| `<where>` | 智能 WHERE（自动去掉首个 AND/OR） |
| `<set>` | 智能 SET（自动去掉末尾逗号） |
| `<trim>` | 通用修剪（自定义前缀后缀） |

### B.2 循环标签

| 标签 | 说明 |
|------|------|
| `<foreach>` | 遍历集合 |

属性：
- `collection`：集合名（list/array/参数名）
- `item`：元素变量名
- `index`：索引变量名
- `open`：开头字符串
- `close`：结尾字符串
- `separator`：分隔符

### B.3 其他标签

| 标签 | 说明 |
|------|------|
| `<sql>` | 可重用 SQL 片段 |
| `<include refid="...">` | 引用 SQL 片段 |
| `<bind>` | 绑定 OGNL 表达式结果到变量 |

---

## 附录 C：事务相关枚举速查

### C.1 Propagation（传播行为）

```java
public enum Propagation {
    REQUIRED,        // 默认：有则加入，无则新建
    SUPPORTS,        // 有则加入，无则非事务
    MANDATORY,       // 有则加入，无则抛异常
    REQUIRES_NEW,    // 挂起当前，新建独立事务
    NOT_SUPPORTED,   // 挂起当前，非事务执行
    NEVER,           // 有则抛异常，无则非事务
    NESTED           // 嵌套事务（保存点）
}
```

### C.2 Isolation（隔离级别）

```java
public enum Isolation {
    DEFAULT,               // 使用数据库默认
    READ_UNCOMMITTED,      // 读未提交
    READ_COMMITTED,        // 读已提交
    REPEATABLE_READ,       // 可重复读
    SERIALIZABLE           // 串行化
}
```

### C.3 CascadeType（级联类型）

```java
public enum CascadeType {
    ALL,           // 所有操作
    PERSIST,       // 持久化
    MERGE,         // 合并
    REMOVE,        // 删除
    REFRESH,       // 刷新
    DETACH         // 分离
}
```

### C.4 FetchType（加载策略）

```java
public enum FetchType {
    LAZY,    // 懒加载（首次访问时查询）
    EAGER    // 急加载（立即查询）
}
```

---

## 结语

Spring Boot 数据访问栈是 Java 企业级开发的核心能力。从底层的 JdbcTemplate 到高层的 Spring Data JPA，从同步的 Hibernate 到响应式的 R2DBC，从单库事务到分布式 Seata，每一层抽象都解决了特定问题，也带来了特定的复杂度。

数据访问的核心矛盾始终是 **抽象程度** 与 **控制力** 的权衡：

- **JPA** 用对象模型屏蔽 SQL，开发效率最高，但复杂查询难以表达，性能问题（N+1、懒加载、脏检查）需要深入理解。
- **MyBatis** 保留 SQL 控制力，灵活度最高，但样板代码多，跨数据库需手写方言。
- **JdbcTemplate** 最轻量，适合简单场景，但样板代码重。
- **R2DBC** 适配响应式栈，非阻塞 I/O，但生态仍在成长。

事务管理是数据访问的"灵魂"：理解 ACID、传播行为、隔离级别、并发异常是写出正确数据访问代码的前提。Spring 的声明式事务 `@Transactional` 极大地简化了事务管理，但其陷阱（自调用失效、受检异常不回滚、长事务占用连接）也需要警惕。

虚拟线程（Java 21）的出现重新洗牌了数据访问的选型：JDBC + 虚拟线程在保留命令式编程风格的同时获得了高并发能力，这可能使 R2DBC 的应用场景收窄。但响应式栈在流式处理、背压传播、复杂数据管道方面仍有不可替代的价值。

对于工程师而言，掌握 Spring Boot 数据访问的关键不在于"会用所有框架"，而在于：

1. **理解每层抽象的代价**：JPA 的便利性来自对 SQL 的封装，封装越深，性能问题越隐蔽。
2. **知道何时跳出抽象**：简单 CRUD 用 JPA，复杂查询用 MyBatis 或 JdbcTemplate，不要强行用一种工具解决所有问题。
3. **关注性能关键点**：N+1、批量操作、事务边界、连接池大小、缓存一致性，这些是数据访问性能的决定因素。
4. **跟随技术演进**：虚拟线程、GraalVM Native Image、R2DBC、Spring Boot 3.x 的演进正在改变数据访问的格局，持续学习是必要的。

数据访问是软件系统与物理世界交互的桥梁。一个优秀的数据访问层设计，能让系统在高并发、大数据量下保持稳定；而一个糟糕的设计，会让简单的查询变成性能瓶颈。希望本文能帮助读者建立对 Spring Boot 数据访问栈的系统认知，在面对实际问题时能做出合适的技术选型与工程决策。

---

> **学习路径建议**：
>
> 1. **入门**：先用 JdbcTemplate 理解 JDBC 原理，再学习 Spring Data JPA 的方法名查询。
> 2. **进阶**：研究 JPA 实体关联、事务传播、N+1 问题、批量优化。
> 3. **高级**：学习 MyBatis 动态 SQL、多数据源、读写分离、分库分表。
> 4. **架构**：理解响应式数据访问（R2DBC）、分布式事务、缓存架构。
> 5. **持续**：关注虚拟线程、GraalVM、Spring Boot 3.x 的演进，及时调整技术选型。
