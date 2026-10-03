---
order: 10
title: 从 JDBC 到 MyBatis：把体力活交出去，把 SQL 留在手里
description: 以「按状态、关键词、时间段任意组合查订单，裸 JDBC 要抄多少遍样板」引入：七项体力税清单、全自动 ORM 与半自动 MyBatis 两条进化路线对照、三层塔心智模型与选型决策表，附本模块四阶段学习地图。
module: 'mybatis'
category: 后端技术
difficulty: beginner
prerequisites:
  - 'java/720-JavaDatabaseConnection'
  - 'mysql/110-SQLDataOperationQuery'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'mybatis/020-QuickStartCrud'
  - 'mybatis/070-MybatisPlusCrud'
  - 'spring-boot/090-SpringDataJpa'
---

## 前置知识

- [Java 数据库连接](/java/720-JavaDatabaseConnection)：见过 Connection 与 PreparedStatement 就够——没读过也能跟，第 2 节会把整段样板完整摆出来；
- [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会写 SELECT 与 WHERE——没读过也能跟，把 SQL 当成「查表的句子」即可。

本篇是 MyBatis 模块的开山篇，与 [Spring Data JPA](/spring-boot/090-SpringDataJpa) 是两条并行的持久层路线：那边让框架生成 SQL，这边自己写 SQL、把其余体力活交给框架。学过那篇再来读，第 4 节的取舍会看得格外清楚；没学过也完全不影响本篇。

## 学习目标

读完本文你将能够：

1. 数出裸 JDBC 写一个组合查询的七项体力税，并说出每项对应的经典生产事故；
2. 说清全自动 ORM 与半自动映射框架各自消灭了什么、又各自藏起了什么；
3. 用「SQL 文本与方法签名的绑定」一句话向同事解释 MyBatis 是什么；
4. 画出 JDBC → MyBatis → MyBatis-Plus 三层塔，说清三层各管什么、出了问题查谁；
5. 拿到一个新项目时，按决策表给出持久层选型建议并说明理由。

预计 30 分钟，无需动手环境，读代码即可。

## 1. 你现在要解决什么问题

你在一个电商后台负责订单接口。产品经理提了个再普通不过的需求：订单列表页支持按状态、关键词、下单时间段任意组合筛选——三个条件都可以不传，传了哪个就按哪个过滤。你决定先用最朴素的 JDBC 实现（就是 [Java 数据库连接](/java/720-JavaDatabaseConnection) 教的那套）。写完一看：为了一个查询，写了一屏幕代码，其中真正表达业务意图的只有四个 if 和一条 SQL，剩下的全是体力活——而且每一项体力活背后都站着一个生产事故的经典款。本篇先把这份账单摊开，再看框架怎么替你买单；以及为什么在买单方案里，国内工程几乎一边倒地选中了 MyBatis。

## 2. 准备现场：一张订单表与一段裸 JDBC

建表脚本，MySQL 8：

```sql
CREATE DATABASE IF NOT EXISTS shop DEFAULT CHARSET utf8mb4;
USE shop;

CREATE TABLE orders (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no    VARCHAR(32)  NOT NULL,
  remark      VARCHAR(200) NOT NULL DEFAULT '',
  amount      DECIMAL(10,2) NOT NULL,
  status      TINYINT NOT NULL COMMENT '0 待支付 1 已支付 2 已取消',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (order_no, remark, amount, status) VALUES
  ('A001', '机械键盘一把', 329.00, 1),
  ('A002', '游戏鼠标两只', 398.00, 0);
```

工程依赖只需要一个 MySQL 驱动（`com.mysql:mysql-connector-j`，版本以官方文档为准）。下面是那个「任意组合查询」的完整实现——建议通读一遍，感受每一行在替谁打工：

```java
public class OrderJdbcDao {

    private static final String URL = "jdbc:mysql://localhost:3306/shop";
    private static final String USER = "root";
    private static final String PASSWORD = "yourpass";

    public List<Order> search(Integer status, String keyword,
                              LocalDate begin, LocalDate end) throws SQLException {
        StringBuilder sql = new StringBuilder(
            "SELECT id, order_no, remark, amount, status, created_at FROM orders WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (status != null) {
            sql.append(" AND status = ?");
            params.add(status);
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND remark LIKE ?");
            params.add("%" + keyword + "%");
        }
        if (begin != null) {
            sql.append(" AND created_at >= ?");
            params.add(begin.atStartOfDay());
        }
        if (end != null) {
            sql.append(" AND created_at < ?");
            params.add(end.plusDays(1).atStartOfDay());
        }

        List<Order> orders = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {   // 参数下标与 ? 顺序人肉对齐
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Order o = new Order();
                    o.setId(rs.getLong("id"));
                    o.setOrderNo(rs.getString("order_no"));
                    o.setRemark(rs.getString("remark"));
                    o.setAmount(rs.getBigDecimal("amount"));
                    o.setStatus(rs.getInt("status"));
                    o.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
                    orders.add(o);
                }
            }
        }
        return orders;
    }
}
```

四十多行里，骨架——SQL 前半句、try 壳、装配壳——一个字都不用变；业务只贡献了四个 if。把条件换成别的字段，这套壳原封不动再来一遍：第二个查询方法、第三个、第十个。这不是你写得差，这是 JDBC 的原生形态：它只提供「说一句话就办一件事」的底层能力，所有重复的组织工作都留给你。

## 3. 体力税清单：这段代码贵在哪

把上面的代码按动作拆开，每一项都是一笔按方法数量重复征收的税：

| 体力税项 | 对应代码 | 背后的经典事故 |
| --- | --- | --- |
| 获取连接 | DriverManager.getConnection | 每次查询新建连接、用完即弃，毫无池化；账号密码硬编码散落各处 |
| 资源生命周期 | 两层 try-with-resources | 手写 finally 的年代漏关一个 ResultSet，连接缓慢泄漏，池子被抽干 |
| 动态拼 where | StringBuilder 加四个 if | 漏一个空格就是语法错误；条件全空时 where 里只剩 1 = 1 这块祖传遮羞布 |
| 占位符绑定 | setObject 循环 | 下标与 ? 的顺序靠人肉对齐，错位不报编译错，运行期才炸 |
| 结果集装配 | 六行 rs.getXxx | 列名手抄错、类型取错；表加一个字段，全项目装配处跟着改 |
| 注入防线 | 全靠每次记得用 ? | 哪天图省事把条件拼成了字符串，注入大门洞开 |
| 事务边界 | 这段代码里根本没有 | 一个业务动作跨多条 SQL 时，谁来 BEGIN、谁来 COMMIT、回滚到哪 |

七项税里有六项与 SQL 本身毫无关系。这就是所有持久层框架的出发点：**把与 SQL 无关的体力税全部收走，让程序员只对 SQL 和映射负责。**但「收走多少」有两种答案，对应两条进化路线。

## 4. 两条进化路线：消灭 SQL，还是只消灭样板

**全自动路线（Hibernate / JPA 一系）。**把对象与表整体映射起来，SQL 由框架按对象关系自动生成，单表 CRUD 一个方法都不用写。爽点是真爽，但 SQL 被藏起来了，藏起来在三件事上出问题：第一，DBA 审核看不见 SQL——上线评审对着一堆 Java 类无从下口；第二，调优看不见 SQL——EXPLAIN 的前提是拿到 SQL 文本，而它要到运行期才被拼出来，列表页突然变慢时你甚至不知道是谁发的查询（学过 [Spring Data JPA](/spring-boot/090-SpringDataJpa) 的话，那篇复现的 N+1 就是典型现场）；第三，复杂查询写起来别扭——多表 join 加任意组合条件，用对象查询语言硬拗，最后往往退回原生 SQL，绕了一圈回到原地。在国内企业与 DBA 审核文化下，这三条条条致命。

**半自动路线（MyBatis）。**SQL 仍然由你写——写在 XML 或注解里，明摆着，可审核、可调优、可复核；框架只接管七项税里与 SQL 无关的那几项：连接、资源生命周期、占位符绑定、结果装配、事务衔接。「半自动」半在这里：**自动的是样板，手动的恰恰是价值。**SQL 是数据访问的核心资产，资产留在自己手里，出了性能问题优化对象就是一段看得见摸得着的 SQL 文本。

「看不见 SQL」不是抽象的抱怨，而是一个反复上演的现场：列表页上线第三天开始变慢，你打开日志，控制台刷出几十条你没写过的 SELECT，它们由框架在运行期拼出来——没人能一眼指出哪一条该优化，EXPLAIN 更是无从谈起，因为拿到文本之前你得先读懂生成它的规则。而 DBA 那边，评审流程要求「上线前提交所有将执行的 SQL」，你交不出去。同样的页面换成 MyBatis：控制台里每一条 SQL 都能在 XML 里找到原文，DBA 逐行过审，慢的那条直接拿来 EXPLAIN。

两条路线各有地盘，选型看场景而不是信仰：

| 你的处境 | 更适合 | 一句话理由 |
| --- | --- | --- |
| 报表、运营后台、多表 join 密集的复杂查询 | MyBatis | SQL 可审可调，EXPLAIN 原样可用 |
| 领域模型深、以对象图为中心的业务 | JPA 一系全自动 | 框架管对象关系正是它的强项 |
| 单表 CRUD 占八成、条件组合简单 | MyBatis-Plus | 单表免写 SQL，复杂处仍可退回手写 |
| 国内互联网企业与 DBA 审核文化 | MyBatis 系 | 上线前逐条过 SQL，是这个流程的默认配套 |
| 团队已深度投资 JPA 且运行良好 | 不必迁移 | 两套可共存于同一工程，按模块选择 |

## 5. MyBatis 的心智模型：把 SQL 文本绑到方法签名上

MyBatis 是什么？一句话：**把「SQL 文本」与「方法签名」绑定在一起的映射框架。**

你在接口上声明意图，在 XML 或注解里写 SQL，框架负责让两者发生关系：

```text
你负责写                          框架负责做
-----------                      ------------------------------
接口方法签名                       生成代理、登记语句、管理连接与事务衔接
XML 或注解里的 SQL 文本             参数安全绑定、驱动 JDBC 执行、异常翻译
列名与属性的对应关系                 逐行装配 ResultSet、自动关资源
```

调用方拿到的是一个普通的接口方法 `orderMapper.search(query)`——看不见 Connection，看不见 ResultSet，也看不见 try 块。写的人只对两样东西负责：SQL 写得对不对，映射对得上对不上。七项体力税里剩下的最后一项（事务边界）由 Spring 的事务体系接管，那是 [事务管理](/spring-boot/100-TransactionManagement) 的正题。

同一个「任意组合查订单」，MyBatis 版长这样——接口一行签名，XML 里一段明文 SQL：

```java
public interface OrderMapper {

    List<Order> search(OrderQuery query);
}
```

```xml
<select id="search" resultType="com.example.shop.entity.Order">
    SELECT id, order_no, remark, amount, status, created_at
    FROM orders
    <where>
        <if test="status != null">AND status = #{status}</if>
        <if test="keyword != null and keyword != ''">
            AND remark LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="begin != null">AND created_at &gt;= #{begin}</if>
        <if test="end != null">AND created_at &lt; #{end}</if>
    </where>
</select>
```

别急着抠每个标签的语法——动态 SQL 是 030 篇的正题。此刻只需要对比出三件事：与 SQL 无关的 Java 代码全部消失了；占位符从手写 `?` 换成了按名取值的 `#{}`；那些 if 从拼字符串变成了 XML 里的条件块。「接口没有实现类凭什么能调用」是下一篇的魔术，[动态 SQL](/mybatis/030-DynamicSql) 的标签语法则在第三篇展开。

## 6. 三层塔：JDBC、MyBatis、MyBatis-Plus

国内工程的持久层技术栈，通常是下面这座三层塔。先交代一段历史：MyBatis 起家于无框架时代，原生用法要手工构建 SqlSessionFactory——写一个 XML 全局配置、用 SqlSessionFactoryBuilder 读入、再开 SqlSession 执行语句，这套仪式如今只存在于历史项目与面试题里；Spring Boot 集成（mybatis-spring-boot-starter，Boot 3 对应 3.x 线）之后，构建过程被自动配置整个接管，你只需要写接口和 SQL。本模块主线走 Spring Boot 集成，这也是国内工程的真实形态。

```text
第三层  MyBatis-Plus   增强：BaseMapper 让单表 CRUD 免写 SQL，条件构造器拼 where
            （建立在第二层之上，不改变它的任何行为）
第二层  MyBatis        映射：SQL 文本与方法签名绑定，动态 SQL、结果映射、缓存
            （建立在第一层之上）
第一层  JDBC           底座：Connection、PreparedStatement、ResultSet
```

三层的关系用三句话说清。MyBatis 建立在 JDBC 之上——它最终发出去的就是 PreparedStatement，你在 JDBC 篇学的连接、预编译、事务一个都没白学。MyBatis-Plus（3.5.x 线，Spring Boot 3 对应 `mybatis-plus-spring-boot3-starter`，如 3.5.12）不是「另一个 MyBatis」，而是 MyBatis 的增强插件：你原有的 Mapper 接口与 XML 一行不改照常工作，它只是把单表 CRUD 的 SQL 替你生成好，所以本模块把它安排在主线学完之后。报错分流跟着塔走：连接失败、驱动类找不到，查第一层；查询结果与预期不符，查你自己写的 SQL 与映射——这正是半自动路线的红利，出问题的东西都是你亲手写的；「明明没写方法却调用了单表 CRUD」，查第三层。

## 7. 与 JPA 的取舍：不是淘汰赛，是分工

[Spring Data JPA](/spring-boot/090-SpringDataJpa) 与 MyBatis 不是谁淘汰谁的关系，而是两套哲学：

| 维度 | 全自动（JPA / Hibernate） | 半自动（MyBatis） |
| --- | --- | --- |
| SQL 谁来写 | 框架按对象关系生成 | 你自己写 |
| DBA 审核 | 难，SQL 藏在运行期 | 易，明文摆在 XML 里 |
| 复杂查询 | 拗对象查询语言，常退回原生 | 本职工作 |
| 换数据库 | 成本低，方言由框架适配 | 每条 SQL 都要重新过目 |
| 学习曲线 | 概念多（持久化上下文、脏检查、刷新时机） | 概念少，SQL 功底即生产力 |
| 性能调优 | 先学框架行为再谈优化 | 优化对象就是那段 SQL 文本 |

两条判断帮你收尾。第一，选型判据是「团队与场景」，不是「哪个更先进」：查询密集、DBA 强参与的团队，MyBatis 顺手；领域驱动、模型稳定的团队，JPA 省力。第二，两者可以在同一个工程里共存——订单主流程走 MyBatis，报表导出走 JPA，互不干扰；真正危险的是团队对所选的那一套一知半解，黑盒恐惧与手拼地狱都源于此。本模块接下来的十篇，就是把 MyBatis 这条路线从黑盒学成白盒。

还剩一个现实问题：中途换框架怎么办？答案是不换。持久层迁移的成本远高于学好现有框架的成本——实体、注解、查询全部要翻译一遍，翻译期间两套代码并存最易出数据事故。选型在项目起步时想清楚，之后把功夫花在「用好」而不是「换掉」上。

## 8. 学习地图：十篇四阶段

本模块的路线图，四个阶段层层递进：

| 阶段 | 篇目 | 你将拿到什么 |
| --- | --- | --- |
| 一、核心入门 | 010-030：本篇、快速上手、动态 SQL | 跑通映射主线：配置、Mapper 代理、CRUD、#{} 与 ${}、动态标签全家桶 |
| 二、机制深水区 | 040-060：结果映射、缓存、插件 | 看懂框架内部：对象图映射、缓存边界、拦截器链与分页插件原理 |
| 三、MyBatis-Plus | 070-080：入门与进阶 | 单表免写 SQL、条件构造器、分页、乐观锁、逻辑删除、代码生成 |
| 四、工程实践与实战 | 090-100：坑与性能、订单实战 | N+1 治理、批处理、大字段，收口一个完整订单持久层 |

顺序即依赖：020 的 #{} 与 ${} 是 030 动态 SQL 的地基，040 的 resultMap 依赖 020 的映射概念，060 的插件原理需要 040 的缓存知识垫底，090 的性能治理则是前三阶段的总演习。每篇的自检题都能遮住代码默答，才算真正过关。

## 官方文档

- MyBatis 中文文档（标签与配置的权威来源）：https://mybatis.org/mybatis-3/zh/index.html
- MyBatis-Plus 官方文档（第三层的增强清单）：https://baomidou.com/

## 自检

1. MyBatis 的「半自动」半在哪？七项体力税里它收走了哪几项，什么仍然留在你手里？
2. 全自动 ORM 在国内工程水土不服的三个理由分别是什么？「DBA 看不见 SQL」具体卡在哪两个动作上？
3. 遮住第 2 节的代码，说出 JDBC 组合查询至少四个易错点，以及各自对应的生产事故。
4. 用一句话向同事解释 MyBatis 是什么；再画出三层塔，说出每层报错该查谁。
5. MyBatis 与 MyBatis-Plus 是什么关系？为什么学了 MyBatis 还要学 MyBatis-Plus？
6. 一个新项目摆在你面前，按第 4 节决策表给出选型建议，并说出至少两条依据。
