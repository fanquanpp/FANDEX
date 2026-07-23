---
order: 87
title: Java与数据库连接
module: java
category: Java
difficulty: intermediate
description: 'JDBC 规范、连接池原理、事务管理、ORM 框架与高性能数据库访问最佳实践。'
author: fanquanpp
updated: '2026-07-21'
tags:
  - java
  - jdbc
  - database
  - connection-pool
  - transaction
related:
  - java/Java文本块
  - java/Java模块系统
  - java/Java新特性与生态
  - java/数组详解
  - java/Spring基础
prerequisites:
  - java/概述与开发环境
  - java/异常处理
---

# Java 与数据库连接：JDBC、连接池、事务与 ORM 全栈指南

> 本文系统阐述 Java 应用与关系型数据库交互的完整技术栈：从 JDBC 规范与 API、DriverManager 与 DataSource 演进、连接池原理（HikariCP、Druid、DBCP）、事务管理（JTA、声明式事务）、ORM 框架（JPA/Hibernate、MyBatis）到生产级最佳实践。内容涵盖形式化定义、性能建模、连接泄漏排查、慢查询优化与典型故障案例分析，旨在帮助开发者建立对 Java 数据访问层的完整认知与排障能力。

## 1. 学习目标

### 1.1 记忆（Remembering）

- 列出 JDBC 核心 API：`DriverManager`、`Connection`、`Statement`、`PreparedStatement`、`ResultSet`。
- 回忆 JDBC 事务的四个基本特性（ACID）。
- 列出 JDBC 类型映射表：Java 类型与 SQL 类型的对应关系。

### 1.2 理解（Understanding）

- 解释 `Statement`、`PreparedStatement`、`CallableStatement` 的差异与适用场景。
- 描述连接池的工作原理与核心参数（最小空闲、最大连接、超时、验证查询）。
- 区分 JDBC 的四种事务隔离级别：`NONE`、`READ_UNCOMMITTED`、`READ_COMMITTED`、`REPEATABLE_READ`、`SERIALIZABLE`。

### 1.3 应用（Applying）

- 使用 `PreparedStatement` 编写防 SQL 注入的查询。
- 配置 HikariCP 连接池并调优关键参数。
- 通过 `Connection#setAutoCommit(false)` 手动管理事务并处理回滚。

### 1.4 分析（Analyzing）

- 分析连接池耗尽故障的原因链：从代码未 close 到池配置不合理。
- 解构 ORM 框架的 N+1 查询问题并给出修复方案。
- 比较不同事务传播行为（PROPAGATION_REQUIRED、REQUIRES_NEW 等）的语义。

### 1.5 评价（Evaluating）

- 评估 JPA/Hibernate 与 MyBatis 在某项目中的选型合理性。
- 评判连接池参数配置是否匹配业务负载。
- 评价某次数据库故障的根因分析与修复方案。

### 1.6 创造（Creating）

- 设计支持读写分离与分库分表的数据访问层架构。
- 构建基于 ShardingSphere 的分布式数据库中间件方案。
- 实现一个支持多数据源动态切换的 Spring Boot Starter。

## 2. 历史动机与背景

### 2.1 JDBC 的诞生

1996 年 1 月，Sun Microsystems 发布 JDBC 1.0（JDK 1.1 内置），目的是为 Java 应用提供统一的数据库访问 API。在此之前，开发者需要为每种数据库（Oracle、Sybase、Informix）使用专有 API，移植成本高昂。

JDBC 的设计灵感部分来自 Microsoft 的 ODBC（Open Database Connectivity，1992），但 JDBC 是面向对象的纯 Java API，而 ODBC 是 C 语言接口。JDBC 通过 **驱动管理器 + 厂商驱动** 的模式实现可插拔：JDK 仅提供 API 规范，各数据库厂商提供具体驱动实现。

### 2.2 JDBC 规范的演进

| 版本 | 发布年份 | 主要特性 |
|------|----------|----------|
| JDBC 1.0 | 1997 | 基础 API：DriverManager、Statement、ResultSet |
| JDBC 2.0 | 1998 | 可滚动结果集、批量更新、连接池支持（Optional Package） |
| JDBC 3.0 | 2002 | Savepoint、PreparedStatement 池化、自动生成键 |
| JDBC 4.0 | 2006 (JDK 6) | 自动加载驱动（SPI）、SQLXML、IOException 友好 |
| JDBC 4.1 | 2011 (JDK 7) | try-with-resources、RowSet 1.1 |
| JDBC 4.2 | 2014 (JDK 8) | java.time 支持、REF CURSOR |
| JDBC 4.3 | 2017 (JDK 9) | 分片查询、Schema支持 |

### 2.3 连接池的兴起

早期 JDBC 通过 `DriverManager.getConnection()` 创建物理连接，每次请求新建与销毁 TCP 连接，开销巨大（一次 TCP 三次握手 + MySQL 认证约 5~20ms）。1999 年 Apache Jakarta 项目发布 **DBCP**（Database Connection Pool），引入连接复用机制，将获取连接开销降至微秒级。

随后的连接池演进：

- **C3P0**（2002）：Hibernate 早期默认池，但性能与稳定性问题多。
- **DBCP 2**（2014）：重写版本，性能仍偏弱。
- **BoneCP**（2010）：曾是最快池，后被 HikariCP 取代。
- **HikariCP**（2014，现 Spring Boot 默认）：使用 FastList、ConcurrentBag 等优化，业界最快。
- **Druid**（2012，阿里巴巴）：内置 SQL 监控、SQL 防火墙，国内广泛使用。
- **vibur**（2014）：通过 JCStress 测试保证并发正确性。

### 2.4 ORM 框架的演进

- **Entity EJB（2001）**：J2EE 早期标准，过度复杂。
- **Hibernate（2003）**：Gavin King 开发，全功能 ORM。
- **JPA（2006）**：JSR 220，标准化 ORM API，Hibernate 为参考实现。
- **MyBatis（2010，原 iBatis）**：半自动 ORM，保留 SQL 控制力。
- **Spring Data JPA（2011）**：基于 JPA 的 Repository 抽象，极大简化代码。
- **jOOQ（2012）**：类型安全 SQL 构建器，面向关系模型。
- **R2DBC（2018）**：响应式数据库访问，配合 WebFlux 使用。

## 3. 形式化定义

### 3.1 JDBC 接口体系形式化

JDBC API 可形式化为一组接口集合：

$$
JDBC = \langle Driver, DataSource, Connection, Statement, ResultSet, ResultSetMetaData \rangle
$$

其中关键关系：

$$
DataSource \xrightarrow{getConnection} Connection
$$

$$
Connection \xrightarrow{prepareStatement} PreparedStatement
$$

$$
PreparedStatement \xrightarrow{executeQuery} ResultSet
$$

### 3.2 连接池的形式化模型

连接池 $P$ 可形式化为五元组：

$$
P = \langle C, N, Q, T, V \rangle
$$

- $C$：活跃连接集合（已借出）
- $N$：空闲连接集合（可借出）
- $Q$：等待借出的请求队列
- $T$：连接的最大生命周期（maxLifetime）
- $V$：连接验证函数（validation query）

约束条件：

$$
|C| + |N| \leq maximumPoolSize
$$

$$
|N| \geq minimumIdle
$$

借出连接操作：

$$
borrow(P, timeout) = \begin{cases}
c \in N & \text{if } N \neq \emptyset \\
newConn() & \text{if } |C| + |N| < maximumPoolSize \\
wait(Q, timeout) & \text{otherwise}
\end{cases}
$$

### 3.3 事务 ACID 形式化

事务 $T$ 满足 ACID 性质：

1. **原子性（Atomicity）**：$\forall T: commit(T) \lor abort(T)$，事务要么全部提交，要么全部回滚。
2. **一致性（Consistency）**：$pre(T) \land invariant(D) \Rightarrow post(T) \land invariant(D)$，事务执行前后数据库满足完整性约束。
3. **隔离性（Isolation）**：$\forall T_1, T_2: T_1 \| T_2 \equiv T_1; T_2 \lor T_2; T_1$，并发执行结果等价于某种串行执行。
4. **持久性（Durability）**：$commit(T) \Rightarrow \forall t > t_{commit}: state(D, t) \models T$，已提交事务的修改永久保存。

### 3.4 隔离级别与现象

ANSI SQL-92 定义了四种隔离级别与三种并发现象：

| 隔离级别 | 脏读（Dirty Read） | 不可重复读（Non-repeatable Read） | 幻读（Phantom Read） |
|----------|------|------|------|
| READ_UNCOMMITTED | 可能 | 可能 | 可能 |
| READ_COMMITTED | 不可能 | 可能 | 可能 |
| REPEATABLE_READ | 不可能 | 不可能 | 可能 |
| SERIALIZABLE | 不可能 | 不可能 | 不可能 |

形式化：

- **脏读**：$T_1$ 读到 $T_2$ 未提交的修改，若 $T_2$ 回滚则 $T_1$ 读到的是无效数据。
- **不可重复读**：$T_1$ 两次读同一行得到不同值，因 $T_2$ 在中间提交了修改。
- **幻读**：$T_1$ 两次执行相同查询返回不同行集合，因 $T_2$ 插入/删除了匹配行。

### 3.5 事务传播行为

Spring 定义了七种事务传播行为：

$$
Propagation \in \{REQUIRED, REQUIRES\_NEW, NESTED, SUPPORTS, NOT\_SUPPORTED, NEVER, MANDATORY\}
$$

形式化定义（设当前事务为 $T_{cur}$，新事务为 $T_{new}$）：

- **REQUIRED**：若 $T_{cur}$ 存在则加入，否则新建。$T_{new} = T_{cur} \text{ if exists else new}$。
- **REQUIRES_NEW**：始终新建，挂起 $T_{cur}$。
- **NESTED**：在 $T_{cur}$ 中创建保存点，可独立回滚。

## 4. 理论推导

### 4.1 JDBC 驱动加载机制

#### 4.1.1 JDBC 4.0 前：Class.forName

```java
// JDBC 4.0 前必须显式加载驱动
Class.forName("com.mysql.cj.jdbc.Driver");
Connection conn = DriverManager.getConnection(url, user, pwd);
```

驱动类在 `static {}` 块中调用 `DriverManager.registerDriver(new Driver())` 完成注册。

#### 4.1.2 JDBC 4.0+：SPI 自动加载

JDBC 4.0 引入 Service Provider Interface（SPI）机制，驱动 jar 包内 `META-INF/services/java.sql.Driver` 文件列出驱动类全名，`DriverManager` 启动时通过 `ServiceLoader` 自动加载。

```java
// JDBC 4.0+ 无需 Class.forName
Connection conn = DriverManager.getConnection(url, user, pwd);
```

`DriverManager.getConnection` 内部遍历所有已注册驱动，调用 `driver.acceptsURL(url)` 判断是否匹配，匹配后调用 `driver.connect(url, info)` 建立连接。

### 4.2 PreparedStatement 的预编译机制

#### 4.2.1 工作流程

1. 客户端发送 SQL 模板（含 `?` 占位符）到服务端。
2. 服务端解析、编译 SQL，生成执行计划，返回 `stmt_id`。
3. 后续执行时，客户端发送 `stmt_id` + 参数值，服务端直接使用预编译计划。

#### 4.2.2 性能与安全收益

- **防 SQL 注入**：参数以二进制传输，不会作为 SQL 语法解析。
- **性能提升**：避免重复解析与编译，适合多次执行的 SQL。

性能模型：

$$
T_{prepare} = T_{parse} + T_{compile} + T_{optimize}
$$

$$
T_{execute}^{prepared} \approx T_{optimize}^{reuse}
$$

$$
T_{execute}^{statement} = T_{parse} + T_{compile} + T_{optimize}
$$

当同一 SQL 执行 $N$ 次：

$$
T_{total}^{prepared} = T_{prepare} + N \cdot T_{execute}^{prepared}
$$

$$
T_{total}^{statement} = N \cdot T_{execute}^{statement}
$$

当 $N > 1$ 时，预编译显著更快。

#### 4.2.3 服务端 vs 客户端预编译

- **服务端预编译**：MySQL 5.7+ 默认开启 `useServerPrepStmts`，由数据库缓存执行计划。
- **客户端预编译**：默认行为，驱动在客户端将 `?` 替换为字面值后发送完整 SQL。

注意：MySQL 默认情况下 `useServerPrepStmts=false`，即使用 `PreparedStatement` 也是客户端模拟预编译，仍能防注入但不享受服务端缓存。

### 4.3 连接池核心算法

#### 4.3.1 HikariCP 的 FastList

传统 `ArrayList` 的 `remove(Object)` 需要遍历查找，复杂度 $O(n)$。HikariCP 自定义 `FastList`：

- 删除时基于引用相等性（`==`）而非 `equals`，避免 `equals` 调用开销。
- 删除时利用连接归还顺序的 LIFO 特性，最近借出的连接最先归还，命中率最高。

```java
// HikariCP FastList 的 remove 优化
public boolean remove(Object element) {
    for (int i = size - 1; i >= 0; i--) {  // 从后往前找（LIFO 优化）
        if (element == array[i]) {  // 引用相等，不用 equals
            final int numMoved = size - i - 1;
            if (numMoved > 0) {
                System.arraycopy(array, i + 1, array, i, numMoved);
            }
            array[--size] = null;
            return true;
        }
    }
    return false;
}
```

#### 4.3.2 ConcurrentBag

HikariCP 的核心并发数据结构 `ConcurrentBag` 借鉴了 Caffeine 与 JCTools 的设计：

- **threadList**：线程本地 List，优先从此处获取（无锁）。
- **sharedList**：CopyOnWriteArrayList，存放所有连接。
- **handoffQueue**：SynchronousQueue，用于线程间交接。

借出流程：

1. 先查 `threadList`，找到则直接返回（最快路径，无锁）。
2. 否则遍历 `sharedList`，CAS 抢占 STATE 字段。
3. 都失败则阻塞在 `handoffQueue` 上，等待归还者交接。

这种设计避免了传统连接池的同步锁，吞吐量提升 2~3 倍。

#### 4.3.3 连接验证策略

为避免借出的连接已失效，连接池在借出前验证：

- **validityCheck**：执行 `SELECT 1` 或 JDBC 4 的 `Connection.isValid(timeout)`。
- **keepaliveCheck**：空闲连接定期发送心跳，防止被数据库关闭。

验证开销：MySQL `SELECT 1` 约 0.1~0.5ms，频繁验证会降低吞吐。HikariCP 仅在连接空闲超过 `idleTimeout` 时验证，平衡开销与可靠性。

### 4.4 事务隔离与锁机制

#### 4.4.1 MySQL InnoDB 的 MVCC

InnoDB 通过多版本并发控制（MVCC）实现 REPEATABLE_READ 且避免幻读：

- 每行有隐藏字段 `trx_id`（最后修改事务 ID）、`roll_ptr`（指向 undo log）。
- 事务开始时生成 ReadView，记录当前活跃事务列表。
- 读取时根据 `trx_id` 与 ReadView 判断版本可见性。

$$
visible(row, view) = \begin{cases}
true & \text{if } row.trx\_id < view.minTrxId \\
true & \text{if } row.trx\_id \in view.activeTrxIds \text{ (created by self)} \\
false & \text{otherwise}
\end{cases}
$$

#### 4.4.2 Next-Key Lock 防幻读

InnoDB 在 REPEATABLE_READ 下使用 Next-Key Lock（Record Lock + Gap Lock）：

- **Record Lock**：锁定索引记录本身。
- **Gap Lock**：锁定索引记录之间的间隙。
- **Next-Key Lock**：前两者组合，锁定记录 + 前方间隙。

例如 `SELECT * FROM users WHERE age > 18 AND age < 30 FOR UPDATE` 会锁定 `(18, 30]` 范围，其他事务无法在此范围插入。

### 4.5 ORM 性能模型

#### 4.5.1 N+1 查询问题

JPA/Hibernate 默认懒加载关联关系：

```java
List<Order> orders = orderRepository.findAll();  // 1 次查询
for (Order order : orders) {
    User user = order.getUser();  // 每次循环触发 1 次查询
}
```

总查询次数：$1 + N$（$N$ 为订单数）。

修复方案：

1. **JOIN FETCH**：`SELECT o FROM Order o JOIN FETCH o.user`，1 次查询。
2. **@EntityGraph**：声明式指定关联图。
3. **BatchSize**：`@BatchSize(size=50)`，将 N 次合并为 $\lceil N/50 \rceil + 1$ 次。

#### 4.5.2 Hibernate 一级缓存

Session 级别缓存避免重复查询同一对象：

```java
User u1 = session.get(User.class, 1L);  // 查询数据库
User u2 = session.get(User.class, 1L);  // 命中缓存，不查库
```

但跨 Session 或多实例时缓存失效，二级缓存（如 Ehcache、Redis）可跨 Session 共享。

## 5. 代码示例

### 5.1 基础 JDBC 操作（try-with-resources）

```java
import java.sql.*;

/**
 * 基础 JDBC 操作示例
 * 演示查询、插入、更新、删除的标准写法
 * 使用 try-with-resources 自动关闭资源，避免泄漏
 */
public class JdbcBasicDemo {

    // 数据库连接配置
    private static final String URL = "jdbc:mysql://localhost:3306/test?useSSL=false&serverTimezone=Asia/Shanghai";
    private static final String USER = "root";
    private static final String PASSWORD = "123456";

    public static void main(String[] args) {
        queryUsers();
        insertUser("张三", 25);
        updateUserAge(1L, 26);
        deleteUser(2L);
    }

    /**
     * 查询所有用户
     */
    public static void queryUsers() {
        String sql = "SELECT id, name, age FROM users WHERE age > ?";
        // try-with-resources 自动关闭 Connection、PreparedStatement、ResultSet
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, 18);  // 设置参数，索引从 1 开始

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long id = rs.getLong("id");
                    String name = rs.getString("name");
                    int age = rs.getInt("age");
                    System.out.printf("ID=%d, Name=%s, Age=%d%n", id, name, age);
                }
            }
        } catch (SQLException e) {
            // 完整异常处理：打印 SQLState、ErrorCode、消息
            System.err.printf("查询失败: SQLState=%s, ErrorCode=%d, Msg=%s%n",
                    e.getSQLState(), e.getErrorCode(), e.getMessage());
        }
    }

    /**
     * 插入用户，获取自增主键
     */
    public static void insertUser(String name, int age) {
        String sql = "INSERT INTO users(name, age) VALUES(?, ?)";
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             // 第二个参数指定要返回生成的键
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, name);
            ps.setInt(2, age);

            int rows = ps.executeUpdate();
            System.out.println("插入行数: " + rows);

            // 获取自增主键
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    long id = keys.getLong(1);
                    System.out.println("生成的主键 ID: " + id);
                }
            }
        } catch (SQLException e) {
            System.err.println("插入失败: " + e.getMessage());
        }
    }

    /**
     * 更新用户年龄
     */
    public static void updateUserAge(long id, int age) {
        String sql = "UPDATE users SET age = ? WHERE id = ?";
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, age);
            ps.setLong(2, id);

            int rows = ps.executeUpdate();
            System.out.println("更新行数: " + rows);
        } catch (SQLException e) {
            System.err.println("更新失败: " + e.getMessage());
        }
    }

    /**
     * 删除用户
     */
    public static void deleteUser(long id) {
        String sql = "DELETE FROM users WHERE id = ?";
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, id);
            int rows = ps.executeUpdate();
            System.out.println("删除行数: " + rows);
        } catch (SQLException e) {
            System.err.println("删除失败: " + e.getMessage());
        }
    }
}
```

### 5.2 手动事务管理

```java
import java.sql.*;

/**
 * 手动事务管理示例
 * 演示转账场景的事务控制
 */
public class TransactionDemo {

    public static void transfer(Connection conn, long fromId, long toId, double amount) throws SQLException {
        // 保存原始 autoCommit 状态
        boolean originalAutoCommit = conn.getAutoCommit();
        try {
            // 关闭自动提交，开启事务
            conn.setAutoCommit(false);

            // 设置事务隔离级别（可选）
            conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

            // 扣款
            try (PreparedStatement ps = conn.prepareStatement("UPDATE account SET balance = balance - ? WHERE id = ? AND balance >= ?")) {
                ps.setDouble(1, amount);
                ps.setLong(2, fromId);
                ps.setDouble(3, amount);
                int rows = ps.executeUpdate();
                if (rows == 0) {
                    throw new SQLException("余额不足或账户不存在");
                }
            }

            // 加款
            try (PreparedStatement ps = conn.prepareStatement("UPDATE account SET balance = balance + ? WHERE id = ?")) {
                ps.setDouble(1, amount);
                ps.setLong(2, toId);
                int rows = ps.executeUpdate();
                if (rows == 0) {
                    throw new SQLException("收款账户不存在");
                }
            }

            // 提交事务
            conn.commit();
            System.out.println("转账成功");

        } catch (SQLException e) {
            // 异常时回滚
            try {
                conn.rollback();
                System.err.println("事务已回滚: " + e.getMessage());
            } catch (SQLException ex) {
                System.err.println("回滚失败: " + ex.getMessage());
            }
            throw e;
        } finally {
            // 恢复原始 autoCommit 状态
            try {
                conn.setAutoCommit(originalAutoCommit);
            } catch (SQLException ignored) {
            }
        }
    }
}
```

### 5.3 Savepoint 部分回滚

```java
import java.sql.*;

/**
 * Savepoint 示例：部分回滚事务
 * 场景：批量处理，部分失败时只回滚失败的部分
 */
public class SavepointDemo {

    public static void batchInsert(Connection conn, String[] names) throws SQLException {
        conn.setAutoCommit(false);
        Savepoint sp = null;
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO users(name) VALUES(?)")) {

            for (int i = 0; i < names.length; i++) {
                try {
                    // 每 10 条设置一个保存点
                    if (i % 10 == 0) {
                        sp = conn.setSavepoint("batch_" + i);
                    }
                    ps.setString(1, names[i]);
                    ps.executeUpdate();
                } catch (SQLException e) {
                    // 仅回滚到最近的保存点，不影响已成功的部分
                    if (sp != null) {
                        conn.rollback(sp);
                        System.err.println("第 " + i + " 条失败，已回滚到保存点: " + e.getMessage());
                    } else {
                        conn.rollback();
                        throw e;
                    }
                }
            }
            conn.commit();
        } finally {
            conn.setAutoCommit(true);
        }
    }
}
```

### 5.4 HikariCP 连接池配置

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

/**
 * HikariCP 连接池配置示例
 * 适合生产环境使用
 */
public class HikariCpConfig {

    public static DataSource createDataSource() {
        HikariConfig config = new HikariConfig();

        // 基础连接配置
        config.setJdbcUrl("jdbc:mysql://localhost:3306/test?useSSL=false&serverTimezone=Asia/Shanghai");
        config.setUsername("root");
        config.setPassword("123456");
        config.setDriverClassName("com.mysql.cj.jdbc.Driver");  // JDBC 4.0+ 可省略

        // 连接池大小配置
        config.setMaximumPoolSize(20);        // 最大连接数
        config.setMinimumIdle(5);              // 最小空闲连接
        // 建议公式：(core_count * 2) + effective_spindle_count

        // 超时配置
        config.setConnectionTimeout(30_000);  // 获取连接超时（ms）
        config.setIdleTimeout(600_000);        // 空闲连接超时（ms）
        config.setMaxLifetime(1_800_000);      // 连接最大生命周期（ms），需小于数据库的 wait_timeout
        config.setValidationTimeout(5_000);    // 连接验证超时（ms）

        // 连接验证
        config.setConnectionTestQuery("SELECT 1");  // JDBC 4+ 可用 isValid 替代

        // 性能优化
        config.setLeakDetectionThreshold(60_000);  // 连接泄漏检测阈值（ms）
        config.setPoolName("MyAppPool");             // 池名称，便于 JMX 监控

        // 性能调优参数（HikariCP 特有）
        config.addDataSourceProperty("cachePrepStmts", "true");       // 启用预编译缓存
        config.addDataSourceProperty("prepStmtCacheSize", "250");     // 缓存预编译语句数
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048"); // 缓存 SQL 最大长度
        config.addDataSourceProperty("useServerPrepStmts", "true");   // 使用服务端预编译
        config.addDataSourceProperty("useLocalSessionState", "true"); // 使用本地会话状态
        config.addDataSourceProperty("rewriteBatchedStatements", "true"); // 重写批量语句
        config.addDataSourceProperty("cacheResultSetMetadata", "true");
        config.addDataSourceProperty("cacheServerConfiguration", "true");
        config.addDataSourceProperty("elideSetAutoCommits", "true");
        config.addDataSourceProperty("maintainTimeStats", "false");

        return new HikariDataSource(config);
    }

    public static void main(String[] args) throws Exception {
        DataSource ds = createDataSource();

        // 使用连接池
        long start = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            try (Connection conn = ds.getConnection();
                 PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM users");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    System.out.println("用户数: " + rs.getInt(1));
                }
            }
        }
        long elapsed = System.currentTimeMillis() - start;
        System.out.println("100 次查询耗时: " + elapsed + "ms");

        // 关闭连接池
        ((HikariDataSource) ds).close();
    }
}
```

### 5.5 Spring Boot + Spring Data JPA

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.*;
import java.util.List;

/**
 * Spring Boot + Spring Data JPA 完整示例
 * 演示实体定义、Repository、Service、事务管理
 */
@SpringBootApplication
public class JpaApplication {
    public static void main(String[] args) {
        SpringApplication.run(JpaApplication.class, args);
    }
}

/**
 * 用户实体
 */
@Entity
@Table(name = "users")
class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer age;

    @Column(unique = true, length = 100)
    private String email;

    // 造函数、getter、setter 省略（实际使用 Lombok @Data @NoArgsConstructor @AllArgsConstructor）

    public User() {}
    public User(String name, Integer age, String email) {
        this.name = name;
        this.age = age;
        this.email = email;
    }
    // getters and setters...
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

/**
 * Repository 接口，Spring Data 自动实现
 */
@Repository
interface UserRepository extends JpaRepository<User, Long> {

    // 派生查询：根据方法名生成 SQL
    List<User> findByAgeGreaterThan(Integer age);

    List<User> findByNameContaining(String keyword);

    // 自定义查询
    @Query("SELECT u FROM User u WHERE u.age BETWEEN :min AND :max")
    List<User> findByAgeRange(Integer min, Integer max);

    // 原生 SQL
    @Query(value = "SELECT * FROM users WHERE email LIKE %:domain", nativeQuery = true)
    List<User> findByEmailDomain(String domain);
}

/**
 * Service 层，包含业务逻辑与事务
 */
@Service
class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 创建用户，事务保证原子性
     */
    @Transactional
    public User createUser(String name, Integer age, String email) {
        // 检查邮箱唯一性
        if (userRepository.findByEmailDomain(email.split("@")[1]).stream()
                .anyMatch(u -> email.equals(u.getEmail()))) {
            throw new IllegalArgumentException("邮箱已存在");
        }

        User user = new User(name, age, email);
        return userRepository.save(user);
    }

    /**
     * 批量更新年龄，REQUIRES_NEW 表示新事务
     */
    @Transactional
    public int bulkUpdateAge(Long[] ids, Integer newAge) {
        int count = 0;
        for (Long id : ids) {
            userRepository.findById(id).ifPresent(u -> {
                u.setAge(newAge);
                userRepository.save(u);
            });
            count++;
        }
        return count;
    }

    /**
     * 只读事务，优化性能（无脏检查）
     */
    @Transactional(readOnly = true)
    public List<User> findAdults() {
        return userRepository.findByAgeGreaterThan(18);
    }
}
```

### 5.6 MyBatis Mapper 示例

```java
import org.apache.ibatis.annotations.*;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import java.util.List;

/**
 * MyBatis Mapper 接口示例
 * 演示注解式 SQL 与动态 SQL
 */
public interface UserMapper {

    /**
     * 简单查询
     */
    @Select("SELECT * FROM users WHERE id = #{id}")
    User findById(Long id);

    /**
     * 带条件查询
     */
    @Select("SELECT * FROM users WHERE age > #{age} ORDER BY id DESC")
    List<User> findByAgeGreaterThan(Integer age);

    /**
     * 插入并返回主键
     */
    @Insert("INSERT INTO users(name, age, email) VALUES(#{name}, #{age}, #{email})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(User user);

    /**
     * 批量插入（使用 foreach）
     */
    @Insert({"<script>",
            "INSERT INTO users(name, age, email) VALUES",
            "<foreach collection='list' item='u' separator=','>",
            "(#{u.name}, #{u.age}, #{u.email})",
            "</foreach>",
            "</script>"})
    int batchInsert(List<User> users);

    /**
     * 动态更新（使用 if 判断）
     */
    @Update({"<script>",
            "UPDATE users",
            "<set>",
            "<if test='name != null'>name = #{name},</if>",
            "<if test='age != null'>age = #{age},</if>",
            "<if test='email != null'>email = #{email},</if>",
            "</set>",
            "WHERE id = #{id}",
            "</script>"})
    int updateSelective(User user);
}

/**
 * 使用示例
 */
class MyBatisUsage {
    public static void main(String[] args) {
        SqlSessionFactory factory = MyBatisConfig.buildFactory();
        try (SqlSession session = factory.openSession()) {
            UserMapper mapper = session.getMapper(UserMapper.class);

            // 查询
            User user = mapper.findById(1L);

            // 插入
            User newUser = new User();
            newUser.setName("张三");
            newUser.setAge(25);
            newUser.setEmail("zhangsan@example.com");
            mapper.insert(newUser);
            session.commit();  // MyBatis 默认手动提交

            // 批量插入
            List<User> batch = List.of(
                    new User("李四", 30, "lisi@example.com"),
                    new User("王五", 28, "wangwu@example.com")
            );
            mapper.batchInsert(batch);
            session.commit();
        }
    }
}
```

### 5.7 批量插入性能优化

```java
import java.sql.*;
import javax.sql.DataSource;

/**
 * 批量插入性能优化示例
 * 对比不同批量插入方式的性能
 */
public class BatchInsertDemo {

    /**
     * 方式一：单条插入（最慢）
     */
    public static long insertOneByOne(DataSource ds, List<String> names) throws SQLException {
        long start = System.currentTimeMillis();
        String sql = "INSERT INTO users(name) VALUES(?)";

        try (Connection conn = ds.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            for (String name : names) {
                ps.setString(1, name);
                ps.executeUpdate();  // 每条都执行一次
            }
        }
        return System.currentTimeMillis() - start;
    }

    /**
     * 方式二：JDBC 批量（addBatch + executeBatch）
     */
    public static long insertBatch(DataSource ds, List<String> names) throws SQLException {
        long start = System.currentTimeMillis();
        String sql = "INSERT INTO users(name) VALUES(?)";

        try (Connection conn = ds.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            conn.setAutoCommit(false);  // 关闭自动提交

            for (int i = 0; i < names.size(); i++) {
                ps.setString(1, names.get(i));
                ps.addBatch();

                // 每 1000 条执行一次，避免内存溢出
                if ((i + 1) % 1000 == 0) {
                    ps.executeBatch();
                    ps.clearBatch();
                }
            }
            ps.executeBatch();  // 执行剩余的
            conn.commit();
        }
        return System.currentTimeMillis() - start;
    }

    /**
     * 方式三：rewriteBatchedStatements（MySQL 最快）
     * 需要 URL 加 rewriteBatchedStatements=true
     * 将多条 INSERT 合并为: INSERT INTO users(name) VALUES(?),(?),(?)
     */
    public static long insertRewrittenBatch(DataSource ds, List<String> names) throws SQLException {
        long start = System.currentTimeMillis();
        String sql = "INSERT INTO users(name) VALUES(?)";

        try (Connection conn = ds.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            conn.setAutoCommit(false);

            for (String name : names) {
                ps.setString(1, name);
                ps.addBatch();
            }
            ps.executeBatch();
            conn.commit();
        }
        return System.currentTimeMillis() - start;
    }

    /**
     * 性能对比
     */
    public static void main(String[] args) throws SQLException {
        DataSource ds = HikariCpConfig.createDataSource();
        List<String> names = new java.util.ArrayList<>();
        for (int i = 0; i < 10000; i++) {
            names.add("user_" + i);
        }

        // 清空表
        try (Connection conn = ds.getConnection(); Statement st = conn.createStatement()) {
            st.execute("TRUNCATE TABLE users");
        }

        System.out.println("单条插入: " + insertOneByOne(ds, names) + "ms");

        try (Connection conn = ds.getConnection(); Statement st = conn.createStatement()) {
            st.execute("TRUNCATE TABLE users");
        }
        System.out.println("JDBC 批量: " + insertBatch(ds, names) + "ms");

        try (Connection conn = ds.getConnection(); Statement st = conn.createStatement()) {
            st.execute("TRUNCATE TABLE users");
        }
        System.out.println("rewriteBatchedStatements: " + insertRewrittenBatch(ds, names) + "ms");
        // 典型结果：单条 ~10s | JDBC 批量 ~3s | rewriteBatched ~500ms
    }
}
```

### 5.8 读写分离实现

```java
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * 读写分离数据源
 * 通过 Spring 的 AbstractRoutingDataSource 实现动态切换
 */
public class ReadWriteSplitDataSource extends AbstractRoutingDataSource {

    public static final String MASTER = "master";
    public static final String SLAVE = "slave";

    @Override
    protected Object determineCurrentLookupKey() {
        // 事务中且非只读 -> 用主库
        // 否则用从库
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && !TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
            return MASTER;
        }
        return SLAVE;
    }

    public static DataSource create(DataSource master, DataSource slave) {
        ReadWriteSplitDataSource ds = new ReadWriteSplitDataSource();
        Map<Object, Object> targets = new HashMap<>();
        targets.put(MASTER, master);
        targets.put(SLAVE, slave);
        ds.setTargetDataSources(targets);
        ds.setDefaultTargetDataSource(master);
        return ds;
    }
}

/**
 * 使用示例
 * 写操作 @Transactional（自动走主库）
 * 读操作 @Transactional(readOnly = true)（自动走从库）
 */
@Service
class OrderService {
    @Transactional
    public void createOrder(Order order) {
        orderRepository.save(order);  // 走主库
    }

    @Transactional(readOnly = true)
    public Order findById(Long id) {
        return orderRepository.findById(id).orElse(null);  // 走从库
    }
}
```

## 6. 对比分析

### 6.1 主流连接池对比

| 维度 | HikariCP | Druid | DBCP 2 | C3P0 | Tomcat JDBC |
|------|----------|-------|--------|------|-------------|
| 性能 | **最快** | 高 | 中 | 低 | 中 |
| 稳定性 | 高 | **极高** | 中 | 低 | 高 |
| 监控 | 基础 JMX | **SQL 监控、防火墙** | 基础 | 基础 | 中等 |
| 配置复杂度 | **简单** | 中 | 中 | 复杂 | 中 |
| Spring Boot 默认 | **是** | 否 | 否 | 否 | 否 |
| 文档质量 | 高 | 中（中文多） | 中 | 低 | 中 |
| 国内使用率 | 高 | **极高** | 低 | 低 | 中 |
| 推荐场景 | 通用、Spring Boot | 需 SQL 监控 | 遗留系统 | 不推荐 | Tomcat 应用 |

### 6.2 ORM 框架对比

| 维度 | JPA/Hibernate | MyBatis | jOOQ | Spring JDBC |
|------|---------------|---------|------|-------------|
| 抽象层级 | **高**（OOP） | 中（SQL + 对象映射） | 低（类型安全 SQL） | **最低**（手写 SQL） |
| 学习成本 | 高 | 中 | 中 | 低 |
| SQL 控制力 | 弱 | **强** | **极强** | **极强** |
| 开发效率 | **高** | 中高 | 中 | 低 |
| 数据库可移植性 | **强** | 中（依赖 SQL 方言） | 强 | 弱 |
| 性能 | 中（开销大） | 高 | 高 | **最高** |
| 推荐场景 | 业务模型清晰、CRUD 为主 | 复杂查询、性能敏感 | 类型安全需求 | 简单应用、极致性能 |

### 6.3 数据库连接方式对比

| 方式 | 同步/异步 | API 风格 | 适用场景 |
|------|-----------|----------|----------|
| JDBC | 同步阻塞 | 命令式 | 传统应用 |
| Spring Data JPA | 同步阻塞 | 声明式 | 业务应用 |
| R2DBC | **异步非阻塞** | 响应式 | WebFlux 响应式应用 |
| Quarkus Panache | 同步/反应式 | 活跃记录模式 | 云原生 Quarkus |
|Exposed (Kotlin)|同步|DSL|Kotlin 应用|

### 6.4 事务管理方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| JDBC 手动事务 | 控制精细 | 代码冗长 | 简单应用 |
| Spring 编程式（TransactionTemplate） | 灵活 | 代码耦合 | 复杂业务逻辑 |
| Spring 声明式（@Transactional） | **零侵入** | 仅方法级别 | **通用** |
| JTA 分布式事务 | 支持多资源 | 性能开销大 | 跨库事务 |
| Saga 模式 | 最终一致 | 实现复杂 | 微服务架构 |

## 7. 常见陷阱与反模式

### 7.1 反模式：使用 Statement 拼接 SQL

**问题代码**：

```java
public User findUser(String name) throws SQLException {
    String sql = "SELECT * FROM users WHERE name = '" + name + "'";
    Statement stmt = conn.createStatement();
    ResultSet rs = stmt.executeQuery(sql);
    // ...
}
```

**事故案例**：某论坛系统因使用 Statement 拼接，攻击者输入 `' OR '1'='1` 绕过认证，导致全部用户数据泄露，公司股价单日下跌 15%。

**根因**：字符串拼接的 SQL 会被数据库完整解析为语法，用户输入中的特殊字符（`'`、`;`、`--`）会改变 SQL 语义。

**修复方案**：使用 `PreparedStatement`：

```java
public User findUser(String name) throws SQLException {
    String sql = "SELECT * FROM users WHERE name = ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setString(1, name);
        try (ResultSet rs = ps.executeQuery()) {
            // ...
        }
    }
}
```

### 7.2 反模式：Connection 未关闭

**问题代码**：

```java
public User getUser(long id) throws SQLException {
    Connection conn = dataSource.getConnection();  // 借出
    PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
    ps.setLong(1, id);
    ResultSet rs = ps.executeQuery();
    if (rs.next()) {
        return mapUser(rs);
    }
    return null;
    // 漏掉 conn.close()，连接泄漏！
}
```

**事故案例**：某电商系统因 ResultSet 异常导致 `conn.close()` 未执行，连接池 100 连接 30 分钟耗尽，服务 503。

**修复方案**：使用 try-with-resources：

```java
public User getUser(long id) throws SQLException {
    try (Connection conn = dataSource.getConnection();
         PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
        ps.setLong(1, id);
        try (ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                return mapUser(rs);
            }
        }
    }
    return null;
}
```

### 7.3 反模式：长事务

**问题代码**：

```java
@Transactional
public void importUsers(File file) {
    List<User> users = parseExcel(file);  // 耗时 30 秒
    users.forEach(userRepository::save);  // 耗时 60 秒
    sendNotificationEmails(users);         // 耗时 60 秒（外部调用）
}
```

**事故案例**：某批量导入功能事务时长 2.5 分钟，期间锁定 10 万行记录，其他用户查询超时，主库负载飙升。

**根因**：事务持有锁时间过长，阻塞其他操作；外部调用（HTTP、邮件）不应在事务内。

**修复方案**：

1. **拆分事务**：每批数据单独事务。
2. **外部调用移出事务**：先在事务内保存数据，提交后再发邮件。

```java
public void importUsers(File file) {
    List<User> users = parseExcel(file);
    // 分批保存，每批 100 条，每批独立事务
    Lists.partition(users, 100).forEach(this::saveBatch);
    // 事务外发送邮件
    sendNotificationEmails(users);
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveBatch(List<User> batch) {
    userRepository.saveAll(batch);
}
```

### 7.4 反模式：N+1 查询

**问题代码**：

```java
List<Order> orders = orderRepository.findAll();  // 1 次
for (Order order : orders) {
    System.out.println(order.getUser().getName());  // 每次循环 1 次
}
```

**事故案例**：某列表页加载 1000 条订单，触发 1001 次查询，响应时间从 100ms 飙升至 5 秒。

**修复方案**：

1. **JOIN FETCH**：

```java
@Query("SELECT o FROM Order o JOIN FETCH o.user")
List<Order> findAllWithUser();
```

2. **@EntityGraph**：

```java
@EntityGraph(attributePaths = {"user"})
List<Order> findAll();
```

3. **BatchSize**：

```java
@ManyToOne
@BatchSize(size = 50)
private User user;
```

### 7.5 反模式：忽略隔离级别

**问题代码**：

```java
@Transactional  // 默认 isolation = DEFAULT，使用数据库默认
public void transfer(long from, long to, double amount) {
    // 未显式设置隔离级别，可能脏读
}
```

**事故案例**：某支付系统在 MySQL 默认 REPEATABLE_READ 下，转账与对账并发，对账读到转账中间状态，资金报表偏差 10 万元。

**修复方案**：

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void transfer(long from, long to, double amount) {
    // 显式声明隔离级别
}
```

### 7.6 反模式：连接池配置不合理

**问题配置**：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 200  # 过大
      minimum-idle: 100       # 过大
```

**事故案例**：某应用配置 200 连接，但数据库 max_connections=150，导致连接被拒绝；同时数据库被打满，影响其他服务。

**根因**：连接池大小应匹配数据库容量与业务并发量。HikariCP 官方建议公式：

$$
poolSize = \frac{t_{conn} \times (1 + \frac{t_{sql}}{t_{conn}})}{1} \times threads
$$

简化经验公式：`poolSize = (core_count * 2) + effective_spindle_count`。

**修复方案**：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20   # 4 核数据库建议 10~20
      minimum-idle: 5
```

### 7.7 反模式：DDL 操作在事务内

**问题代码**：

```java
@Transactional
public void migrate() {
    jdbcTemplate.execute("ALTER TABLE users ADD COLUMN status INT");
    jdbcTemplate.execute("UPDATE users SET status = 1");
}
```

**事故案例**：某系统在事务内执行 `ALTER TABLE`，MySQL 的 DDL 会隐式提交事务，导致后续 UPDATE 不在同一事务中，部分数据未更新但 DDL 已生效。

**根因**：MySQL 的 DDL 是隐式提交的，无法回滚。

**修复方案**：DDL 操作移出事务，单独执行。

### 7.8 反模式：跨库事务无补偿

**问题代码**：

```java
@Transactional
public void createOrder(Order order) {
    orderRepo.save(order);       // 本地数据库
    inventoryService.deduct(order);  // 远程 HTTP 调用，独立数据库
}
```

**事故案例**：订单保存成功但库存扣减失败（HTTP 超时），订单事务已提交，库存未扣减，超卖。

**根因**：跨库/跨服务无法用本地事务保证一致性。

**修复方案**：

1. **Saga 模式**：每个步骤有补偿动作。

```java
public void createOrder(Order order) {
    orderRepo.save(order);
    try {
        inventoryService.deduct(order);
    } catch (Exception e) {
        orderRepo.delete(order);  // 补偿
        throw e;
    }
}
```

2. **本地消息表 + 最终一致**：本地事务 + 消息队列异步通知。
3. **Seata**：分布式事务中间件。

## 8. 工程实践

### 8.1 连接池监控

#### 8.1.1 HikariCP 监控指标

| 指标 | 含义 | 健康范围 |
|------|------|----------|
| activeConnections | 活跃连接数 | < maxPoolSize |
| idleConnections | 空闲连接数 | > 0 |
| totalConnections | 总连接数 | 接近 maxPoolSize 时告警 |
| threadsAwaitingConnection | 等待连接的线程数 | **> 0 即告警** |
| leakDetectionThreshold | 泄漏检测时长 | 触发告警 |

通过 JMX 或 Micrometer 暴露：

```java
// Spring Boot Actuator 已自动暴露
// /actuator/metrics/hikaricp.connections.active
```

#### 8.1.2 慢查询监控

```java
// 使用 P6Spy 拦截 SQL，记录慢查询
// pom.xml: com.p6spy:p6spy:3.9.1
// application.yml:
spring:
  datasource:
    driver-class-name: com.p6spy.engine.spy.P6SpyDriver
    url: jdbc:p6spy:mysql://localhost:3306/test

// spy.properties:
module.log=com.p6spy.engine.logging.P6LogFactory
excludecategories=info,debug,result,batch
filter=true
exclude=SELECT 1
```

### 8.2 事务最佳实践

1. **事务尽量短**：避免在事务内做 HTTP、RPC 调用。
2. **事务粒度合适**：避免大事务（影响吞吐与并发）。
3. **只读事务标注**：`@Transactional(readOnly = true)` 优化性能。
4. **避免事务嵌套**：明确传播行为。
5. **检查异常回滚**：默认只对 RuntimeException 回滚，需 `rollbackFor = Exception.class`。

```java
@Transactional(rollbackFor = Exception.class)  // 显式声明
public void doBusiness() throws Exception {
    // ...
}
```

### 8.3 SQL 性能优化

#### 8.3.1 索引使用原则

- 查询条件字段建索引。
- 联合索引遵循最左前缀。
- 避免索引失效：`!=`、`LIKE '%xxx'`、函数操作、隐式类型转换。

```sql
-- 索引失效示例
SELECT * FROM users WHERE DATE(create_time) = '2026-07-21';  -- 失效
SELECT * FROM users WHERE create_time >= '2026-07-21' AND create_time < '2026-07-22';  -- 命中
```

#### 8.3.2 分页优化

```sql
-- 传统分页（深分页慢）
SELECT * FROM orders ORDER BY id LIMIT 100000, 10;  -- 扫描 100010 行

-- 游标分页（快）
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 10;  -- 扫描 10 行
```

### 8.4 多数据源配置

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.*;

@Configuration
public class MultiDataSourceConfig {

    @Primary
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }

    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }
}
```

### 8.5 数据库连接泄漏排查

#### 8.5.1 HikariCP 泄漏检测

```yaml
spring:
  datasource:
    hikari:
      leak-detection-threshold: 60000  # 60 秒未归还即报告泄漏
```

日志输出示例：

```
WARN  com.zaxxer.hikari.LeakTask - Apparent connection leak detected
```

#### 8.5.2 排查步骤

1. 启用泄漏检测。
2. 在日志中找到泄漏堆栈。
3. 定位代码，确认 try-with-resources 是否完整。
4. 检查异常路径是否跳过 close。

### 8.6 数据库连接故障恢复

```java
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.annotation.Backoff;

/**
 * 重试机制：应对瞬时数据库故障
 */
@Service
public class ResilientUserService {

    private final DataSource dataSource;

    public ResilientUserService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Retryable(
        value = { SQLException.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public User findUser(long id) throws SQLException {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapUser(rs);
                }
            }
        }
        return null;
    }
}
```

## 9. 案例研究

### 9.1 案例一：连接池耗尽导致服务雪崩

**背景**：某电商订单系统在促销期间，QPS 从 1000 升至 5000，HikariCP 连接池配置 maxPoolSize=50，30 分钟内连接池全部耗尽，服务 503。

**诊断过程**：

1. HikariCP 监控显示 `threadsAwaitingConnection` 持续 > 0。
2. `jstack` 显示 200 个业务线程阻塞在 `getConnection`。
3. 检查代码，发现一个慢 SQL（10 秒）在促销期间被高频调用，连接被长时间占用。

**根因**：单条慢 SQL 占用连接 10 秒，50 连接 × 6 次/分钟 = 300 次/分钟，远超系统吞吐。

**解决方案**：

1. **优化慢 SQL**：添加复合索引，查询时间从 10s 降至 50ms。
2. **连接池隔离**：核心交易与查询使用独立连接池，避免相互影响。
3. **熔断保护**：Hystrix/Sentinel 对慢 SQL 调用熔断。
4. **连接超时缩短**：`connectionTimeout` 从 30s 降至 5s，快速失败。

**效果**：QPS 5000 时连接池占用 < 30，P99 延迟从 30s 降至 100ms。

### 9.2 案例二：JPA N+1 查询性能优化

**背景**：某 SaaS 平台用户列表页加载 100 条用户数据耗时 8 秒，用户体验极差。

**诊断过程**：

1. 启用 P6Spy 记录 SQL，发现一次列表查询触发 101 次 SQL（1 次用户列表 + 100 次关联部门查询）。
2. 检查代码，User 实体的 `department` 字段为 `@ManyToOne(fetch = FetchType.LAZY)`，循环访问时触发懒加载。

**根因**：典型的 N+1 查询问题。

**解决方案**：

1. **JOIN FETCH**：

```java
@Query("SELECT u FROM User u JOIN FETCH u.department")
List<User> findAllWithDepartment();
```

2. **@EntityGraph**：

```java
@EntityGraph(attributePaths = "department")
List<User> findAll();
```

3. **@BatchSize**：

```java
@ManyToOne(fetch = FetchType.LAZY)
@BatchSize(size = 50)
private Department department;
```

**效果**：SQL 次数从 101 降至 3（JOIN FETCH）或 3（BatchSize=50），响应时间从 8s 降至 200ms。

### 9.3 案例三：分布式事务一致性故障

**背景**：某支付系统采用微服务架构，订单服务与账户服务独立数据库，使用本地事务。某次故障中订单创建成功但账户扣款失败，导致超卖 200 单，损失 50 万元。

**诊断过程**：

1. 查看订单服务日志，订单保存成功。
2. 查看账户服务日志，扣款接口超时失败（HTTP 5s 超时）。
3. 订单事务已提交，账户未扣减。

**根因**：跨服务调用无法用本地事务保证原子性。

**解决方案**：

1. **TCC 模式**：Try-Confirm-Cancel，每个服务实现三个接口。

```java
// 订单服务 Try：创建待支付订单
// 账户服务 Try：冻结金额
// 订单服务 Confirm：订单状态改为已支付
// 账户服务 Confirm：扣除冻结金额
// 任一 Try 失败 -> 全部 Cancel
```

2. **Seata AT 模式**：自动生成 undo log，自动回滚。

```java
@GlobalTransactional
public void pay(Order order) {
    orderService.update(order);  // 本地事务
    accountService.deduct(order);  // RPC 调用，本地事务
    // 任一失败，Seata 自动回滚两个本地事务
}
```

3. **本地消息表**：订单本地事务 + 消息表，异步通知账户服务。

**效果**：故障率从 0.1% 降至 0.001%，年损失控制在 5000 元以内。

### 9.4 案例四：MySQL 死锁分析

**背景**：某库存系统在高并发下偶发死锁，MySQL 日志显示 `Deadlock found when trying to get lock; try restarting transaction`。

**诊断过程**：

1. `SHOW ENGINE INNODB STATUS` 查看死锁信息：

```
*** (1) TRANSACTION:
UPDATE stock SET qty = qty - 1 WHERE sku = 'A' AND warehouse = 'W1';
*** (2) TRANSACTION:
UPDATE stock SET qty = qty - 1 WHERE sku = 'B' AND warehouse = 'W1';
*** (2) HOLDS THE LOCK(S):
*** (1) HOLDS THE LOCK(S):
```

2. 分析：事务 1 先锁 A 再锁 B，事务 2 先锁 B 再锁 A，形成循环等待。

**根因**：并发更新不同 SKU 但锁顺序不一致。

**解决方案**：

1. **统一锁顺序**：按 SKU 排序后加锁。

```java
@Transactional
public void deduct(List<String> skus) {
    skus.stream().sorted().forEach(sku -> {
        stockRepo.deduct(sku);
    });
}
```

2. **乐观锁**：使用 version 字段。

```java
@Version
private Long version;

// UPDATE stock SET qty = qty - 1, version = version + 1
// WHERE sku = ? AND version = ?
```

3. **缩短事务**：减少锁持有时间。

**效果**：死锁发生率从每日 50 次降至 0。

## 10. 习题

### 10.1 基础题

**习题 1**：简述 JDBC 中 `Statement`、`PreparedStatement`、`CallableStatement` 的区别。

参考要点：
- `Statement`：执行静态 SQL，无参数，有 SQL 注入风险。
- `PreparedStatement`：预编译 SQL，支持参数，防注入，性能更好。
- `CallableStatement`：调用存储过程，支持 IN/OUT/INOUT 参数。

**习题 2**：解释 JDBC 事务的 ACID 特性。

参考要点：
- 原子性：事务内操作全部成功或全部回滚。
- 一致性：事务前后数据库满足完整性约束。
- 隔离性：并发事务互不干扰。
- 持久性：已提交事务永久保存。

**习题 3**：写出使用 try-with-resources 执行查询的代码。

参考要点：

```java
try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setLong(1, id);
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            // 处理结果
        }
    }
}
```

### 10.2 进阶题

**习题 4**：HikariCP 的 `maximumPoolSize` 应如何设置？过大或过小有什么问题？

参考要点：
- 公式：`poolSize = (core_count * 2) + effective_spindle_count`。
- 过大：消耗数据库连接，影响其他服务；锁竞争增加。
- 过小：连接不足，请求排队，吞吐下降。
- 经验值：4 核数据库建议 10~20，应用服务器核心数 × 2 + 1。
- 实际需压测验证。

**习题 5**：什么是 N+1 查询问题？如何检测和解决？

参考要点：
- 问题：1 次主查询 + N 次关联查询。
- 检测：P6Spy、Hibernate 统计、慢查询日志。
- 解决：JOIN FETCH、@EntityGraph、@BatchSize、DTO 投影。

**习题 6**：解释 Spring 的 `@Transactional` 的 `propagation` 属性各值的语义。

参考要点：
- REQUIRED（默认）：有事务加入，无则新建。
- REQUIRES_NEW：始终新建，挂起当前事务。
- NESTED：嵌套事务，基于 Savepoint。
- SUPPORTS：有事务加入，无则非事务执行。
- NOT_SUPPORTED：非事务执行，挂起当前事务。
- NEVER：非事务执行，有事务则抛异常。
- MANDATORY：必须在事务中，无则抛异常。

### 10.3 挑战题

**习题 7**：设计一个支持 10 万 QPS 的订单系统数据访问层，包括连接池、缓存、分库分表方案。

参考要点：

- **连接池**：HikariCP，maxPoolSize=50/实例，部署 20 实例，总 1000 连接。
- **缓存**：Redis 多级缓存，本地 Caffeine + 分布式 Redis，命中率 > 95%。
- **分库分表**：ShardingSphere，按 user_id 分 16 库 × 64 表 = 1024 表。
- **读写分离**：1 主 3 从，读走从库，写走主库。
- **批量优化**：rewriteBatchedStatements、Pipeline 写入。
- **降级**：Redis 故障降级到 DB，DB 故障降级到本地缓存。
- **监控**：HikariCP、慢查询、缓存命中率、分片均衡度。

**习题 8**：实现一个支持多数据源动态切换的 Spring Boot Starter，要求：
- 注解 `@DS("slave")` 指定数据源。
- 支持 `@Transactional` 事务。
- 支持读写分离。

参考要点：

```java
// 1. 定义注解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface DS {
    String value() default "master";
}

// 2. AOP 切面切换数据源
@Aspect
@Component
public class DsAspect {
    @Around("@annotation(ds)")
    public Object around(ProceedingJoinPoint pjp, DS ds) throws Throwable {
        DynamicDataSourceContextHolder.set(ds.value());
        try {
            return pjp.proceed();
        } finally {
            DynamicDataSourceContextHolder.clear();
        }
    }
}

// 3. 动态数据源
public class DynamicDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return DynamicDataSourceContextHolder.get();
    }
}

// 4. ThreadLocal 持有当前数据源
public class DynamicDataSourceContextHolder {
    private static final ThreadLocal<String> CTX = new ThreadLocal<>();
    public static void set(String ds) { CTX.set(ds); }
    public static String get() { return CTX.get(); }
    public static void clear() { CTX.remove(); }
}
```

**习题 9**：分析以下连接池耗尽故障，给出排查思路与修复方案。

```
Caused by: java.sql.SQLTransientConnectionException:
HikariPool-1 - Connection is not available, request timed out after 30000ms
```

参考要点：
- **直接原因**：30 秒内未获取到连接。
- **可能根因**：
  1. 慢 SQL 占用连接过久。
  2. 连接泄漏（未 close）。
  3. 池配置过小。
  4. 数据库连接数耗尽。
- **排查步骤**：
  1. 查看 HikariCP 监控，确认 `threadsAwaitingConnection`、`activeConnections`。
  2. 启用 `leakDetectionThreshold` 检测泄漏。
  3. 通过 `jstack` 查看阻塞线程堆栈。
  4. 检查数据库 `SHOW PROCESSLIST` 是否有大量 Sleep 连接。
  5. P6Spy 定位慢 SQL。
- **修复方案**：
  1. 优化慢 SQL。
  2. 修复泄漏代码（确保 try-with-resources）。
  3. 调整 `maximumPoolSize`。
  4. 增加数据库 `max_connections`。

## 11. 参考文献

[1] Ellis, J., Srivastava, N., and Halpern, M. 2017. JDBC 4.3 Specification. Oracle. Retrieved from https://docs.oracle.com/javase/9/docs/api/java/sql/package-summary.html

[2] Bresnahan, C., McAuliffe, T., and O'Brien, P. 2019. HikariCP: The "fastest" connection pool for Java. In Proceedings of the JVM Language Summit. Retrieved from https://github.com/brettwooldridge/HikariCP

[3] King, G. 2006. Hibernate in Action. Manning Publications. ISBN: 978-1932394153

[4] Bauer, C., and King, G. 2015. Java Persistence with Hibernate (2nd ed.). Manning Publications. ISBN: 978-1617290459

[5] Clinton Begin. 2010. iBatis/MyBatis Design. GitHub. Retrieved from https://github.com/mybatis/mybatis-3

[6] Kleppmann, M. 2017. Designing Data-Intensive Applications. O'Reilly Media. ISBN: 978-1449373320. Chapter 7: Transactions.

[7] Berenson, H., Bernstein, P., Gray, J., Melton, J., O'Neil, E., and O'Neil, P. 1995. A critique of ANSI SQL isolation levels. In Proceedings of the 1995 ACM SIGMOD International Conference on Management of Data (SIGMOD '95). ACM, 1–10. DOI: 10.1145/223784.223785

[8] Adya, A., Liskov, B., and O'Neil, P. 2000. Generalized isolation level definitions. In Proceedings of the 16th International Conference on Data Engineering (ICDE '00). IEEE, 439–447. DOI: 10.1109/ICDE.2000.839441

[9] Apache Software Foundation. 2014. DBCP 2.0 Documentation. Retrieved from https://commons.apache.org/proper/commons-dbcp/

[10] Alibaba Group. 2012. Druid: JDBC Connection Pool and SQL Parser. Retrieved from https://github.com/alibaba/druid

[11] Johnson, R., Hoeller, J., Donald, K., Sampaleanu, C., Harrop, R., Risberg, T., Arendsen, A., Davison, D., Kopylenko, N., Pollack, M., et al. 2005. The Spring Framework - Reference Documentation. Interface21. Retrieved from https://docs.spring.io/spring-framework/reference/

[12] Pritchard, J., and Risberg, T. 2003. Spring Data Access. In Spring Framework Documentation. SpringSource.

[13] Garcia-Molina, H., and Salem, K. 1987. Sagas. In Proceedings of the 1987 ACM SIGMOD International Conference on Management of Data (SIGMOD '87). ACM, 249–259. DOI: 10.1145/38714.38742

[14] Lamport, L. 1978. Time, clocks, and the ordering of events in a distributed system. Communications of the ACM 21, 7 (July 1978), 558–565. DOI: 10.1145/359545.359563

[15] Helland, P. 2007. Life beyond distributed transactions: an apostate's opinion. In Proceedings of the 3rd Biennial Conference on Innovative Data Systems Research (CIDR '07), 132–141.

## 12. 延伸阅读

### 12.1 官方文档

- **JDBC Specification**: https://docs.oracle.com/javase/8/docs/api/java/sql/package-summary.html
- **HikariCP Wiki**: https://github.com/brettwooldridge/HikariCP/wiki
- **Spring Data JPA Reference**: https://docs.spring.io/spring-data/jpa/reference/
- **Hibernate ORM Manual**: https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html
- **MyBatis Documentation**: https://mybatis.org/mybatis-3/

### 12.2 经典书籍

- **《高性能 MySQL》（第 4 版）**：数据库索引、查询优化、连接池原理。
- **《数据密集型应用系统设计》**：分布式事务、CAP 理论、一致性模型。
- **《Java Persistence with Hibernate》（第 2 版）**：Hibernate 权威指南。
- **《Spring 实战》（第 6 版）**：Spring Data 与事务管理。

### 12.3 前沿主题

- **R2DBC**：响应式数据库访问，配合 WebFlux。
- **Quarkus Panache**：简化 JPA，活跃记录模式。
- **Exposed (Kotlin)**：Kotlin 原生 ORM DSL。
- **ShardingSphere**：分库分表中间件。
- **Seata**：分布式事务解决方案。

### 12.4 开源工具

- **P6Spy**：SQL 拦截与日志。
- **Arthas**：Java 在线诊断工具。
- **Druid Monitor**：连接池监控与 SQL 防火墙。
- **SkyWalking**：APM，追踪数据库调用链。
- **Vlad Mihalcea's Hypersistence Optimizer**：JPA 性能优化工具。

---

### 更新日志

- 2026-07-21: 全面重写，按金标准扩充至 12 章节结构，涵盖 JDBC 规范、连接池原理、事务管理、ORM 框架、性能优化与故障案例。
