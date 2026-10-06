---
order: 50
title: 结果映射与关联查询：一行拆成两个对象，多行合成一个对象
description: 以「驼峰开关救得了字段名，救不了订单与下单用户的结构变换」引入：resultMap 的 id 去重原理、association 与 collection 的嵌套结果与嵌套查询对照、延迟加载与 session 生命周期，附 N+1 数 SQL 实验与分页 join 明细错乱的独家拆解。
module: 'mybatis'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'mybatis/020-QuickStartCrud'
  - 'mybatis/030-DynamicSql'
  - 'spring-boot/100-TransactionManagement'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'mybatis/050-CacheMechanism'
  - 'mybatis/060-PluginInterceptor'
  - 'mybatis/090-PitfallsPerformance'
---

## 知识点地图

- 知识类别：结果映射——resultMap 的 id/result 布局、association 一对一、collection 一对多、延迟加载、N+1 与分页陷阱。
- 解决什么问题：查询结果怎么变成对象（尤其对象套对象的关联结构）；以及关联映射的三个代价（N+1、内存、分页错乱）什么时候值得付。
- 什么时候用到：字段名对不上的表、一对一/一对多关联查询、排查"10 条数据发 11 条 SQL"。

## 前置知识

- [快速上手](/mybatis/020-QuickStartCrud)：知道 resultType 与驼峰开关的分工——没读过也能跟，第 3 节会从头交代映射机制；
- [动态 SQL](/mybatis/030-DynamicSql)：会写 foreach，第 8 节的出路二要用它；
- [事务管理](/spring-boot/100-TransactionManagement)：知道 @Transactional 圈出的边界——没读过也能跟，第 6 节只借用「事务内是同一个数据库会话」这一条。

## 学习目标

读完本文你将能够：

1. 写出基础 resultMap，说清 id 与 result 标签的本质区别及其牵连的合并行为；
2. 用 association 的两种写法映射一对一，按对照表为场景选型；
3. 用 collection 映射一对多，解释合并靠什么判定「同一父对象」，诊断漏选父主键的经典错乱；
4. 配置延迟加载，说出触发时机，以及为什么必须在事务边界内摸 lazy 属性；
5. 亲手数出嵌套查询在列表页上的 1 + N 条 SQL；
6. 解释「一页 10 条实际只剩 3 个订单」的成因，并给出三条出路；
7. 按设计指导表决定列表页与详情页各自的查询形态。

预计 50 分钟，需要一个能跑的 MyBatis 工程与控制台日志。

## 1. 你现在要解决什么问题

020 篇的 map-underscore-to-camel-case 解决的是**名字**问题：product_name 与 productName 是同一个值的两种拼法，翻译一下就对上了。但有两类需求它根本无能为力。第一类是**一行数据要拆成两个对象**：订单详情页通常同时展示订单与下单用户——一行 join 出来的数据里，一半列属于订单，一半列属于用户，你得把它装配成一个 Order 对象，里面还嵌着一个 User 对象。第二类是**多行数据要合成一个对象**：用户中心页展示「张三和他的全部订单」——用户信息一行，订单若干行，目标是装配成一个 User 对象，里面挂着 List<Order>。

这两种「结构变换」resultType 都做不到——它只会把列往一个对象的属性上平铺。MyBatis 给出的答案是 resultMap：一张显式的「列与对象结构」的映射说明书。本篇围绕它展开，并顺路拆掉两个高频事故：嵌套查询引发的 N+1，以及分页与一对多 join 相遇时的幽灵错单。

## 2. 准备现场：用户与订单

```sql
USE shop;

CREATE TABLE users (
  id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE orders (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no   VARCHAR(32) NOT NULL,
  user_id    BIGINT NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (name) VALUES ('张三'), ('李四');
INSERT INTO orders (order_no, user_id, amount, created_at) VALUES
  ('A001', 1, 329.00, '2026-09-01 10:00:00'),
  ('A002', 1, 199.00, '2026-09-02 11:00:00'),
  ('A003', 2, 899.00, '2026-09-03 12:00:00');
```

两个 POJO——注意彼此嵌套的形状，这正是 resultMap 要表达的「结构」：

```java
public class Order {
    private Long id;
    private String orderNo;
    private BigDecimal amount;
    private LocalDateTime createdAt;
    private User buyer;              // 一行订单拆出的第二个对象（一对一）
    // getter/setter 略
}

public class User {
    private Long id;
    private String name;
    private List<Order> orders;      // 多行订单合成的列表（一对多）
    // getter/setter 略
}
```

## 3. resultMap 基础：id 是行的身份证

resultType 处理不了的「列名与属性名对不上」，其实已经可以先用 resultMap 解决——这是它的第一层用途，显式声明对应关系：

```xml
<resultMap id="orderMap" type="com.example.shop.entity.Order">
    <id property="id" column="id"/>
    <result property="orderNo" column="order_no"/>
    <result property="amount" column="amount"/>
    <result property="createdAt" column="created_at"/>
</resultMap>
```

id 与 result 长得一样，职责却有本质区别：**id 向 MyBatis 声明「这一列是这一行的身份证」**。查询单表时它影响不大；一旦进入第 4、5 节的嵌套映射，它就是合并行为的裁判——MyBatis 逐行装配时靠 id 列的值判断「这几行是否属于同一个对象」。写错或漏写 id，轻则重复对象，重则数据错乱，而且不报任何异常。很多「诡异现象」的病根都在这个标签上。

resultMap 还有第三件武器 <constructor>：让 MyBatis 走构造器注入属性而不是 setter，适合不可变对象，知道即可，日常少用。

## 4. association：一对一的两种写法

订单要带上下单人。查法有两条路，先看**嵌套结果**——一条 join SQL，结果一次映射：

```xml
<resultMap id="orderWithBuyerMap" type="com.example.shop.entity.Order">
    <id property="id" column="order_id"/>
    <result property="orderNo" column="order_no"/>
    <result property="amount" column="amount"/>
    <association property="buyer" javaType="com.example.shop.entity.User">
        <id property="id" column="buyer_id"/>
        <result property="name" column="buyer_name"/>
    </association>
</resultMap>

<select id="selectOrderWithBuyer" resultMap="orderWithBuyerMap">
    SELECT o.id AS order_id, o.order_no, o.amount,
           u.id AS buyer_id, u.name AS buyer_name
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE o.id = #{id}
</select>
```

association 标签声明「buyer 属性是个 User，接下来的列归它」。注意两个 id 各配各的列：order_id 是订单的身份证，buyer_id 是用户的身份证——将来合并时各管各的对象。

再看**嵌套查询**——主 SQL 只查订单，把 user_id 这一列的值转交给另一条语句，按需再查：

```xml
<resultMap id="orderWithBuyerLazyMap" type="com.example.shop.entity.Order">
    <id property="id" column="id"/>
    <result property="orderNo" column="order_no"/>
    <result property="amount" column="amount"/>
    <association property="buyer" column="user_id"
                 select="com.example.shop.mapper.UserMapper.selectById"
                 fetchType="lazy"/>
</resultMap>

<select id="selectOrderNested" resultMap="orderWithBuyerLazyMap">
    SELECT id, order_no, user_id, amount FROM orders WHERE id = #{id}
</select>
```

column 指定「拿哪一列的值当参数」传给 select 指向的语句，fetchType 声明这条子查询延迟到真正访问 buyer 时才发（第 6 节展开）。两种写法同场竞技：

| 维度 | 嵌套结果（join） | 嵌套查询（分步） |
| --- | --- | --- |
| SQL 条数 | 恒为 1 条 | 1 + N 条 |
| 一次往返 | 是 | 否，逐个再查 |
| 语句复用 | SQL 为该场景专用 | 复用既有的子查询语句 |
| 与分页插件 | 相互打架（第 8 节） | 主查询独立，分页无碍 |
| 典型场景 | 详情页一次拿全 | 列表页按需取用、延迟加载 |

## 5. collection：一对多与合并原理

用户要带上他的订单列表，结构换成 collection，ofType 声明列表元素类型：

```xml
<resultMap id="userWithOrdersMap" type="com.example.shop.entity.User">
    <id property="id" column="user_id"/>
    <result property="name" column="user_name"/>
    <collection property="orders" ofType="com.example.shop.entity.Order">
        <id property="id" column="order_id"/>
        <result property="orderNo" column="order_no"/>
        <result property="amount" column="amount"/>
    </collection>
</resultMap>

<select id="selectUserWithOrders" resultMap="userWithOrdersMap">
    SELECT u.id AS user_id, u.name AS user_name,
           o.id AS order_id, o.order_no, o.amount
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.id = #{id}
</select>
```

数据形态是关键：张三有两张订单，这条 LEFT JOIN 返回**两行**，user_id 与 user_name 在两行里重复出现，订单列各行不同。MyBatis 的合并原理就一句话：**逐行装配，id 列的值相同就认定是同一个父对象，把明细行追加进它的列表**。两行的 user_id 都是 1，于是两条订单进了同一个 User 的 List。

这个原理直接推出两个结论。第一，**SELECT 列表必须包含父对象主键**：漏选 u.id，MyBatis 失去判断「同一父对象」的依据，每行都被当成新 User——查一个用户想拿 2 条订单，回来的是 2 个 User 对象、每人揣着 1 条订单。列表丢失、数据翻倍、分页总数对不上，八成病根在此。第二，LEFT JOIN 碰上没有订单的用户：明细列全为 null，子对象的 id 列是 null，MyBatis 不会为它创建订单对象——orders 是空列表，行为正确。

## 6. 延迟加载：配置、触发与 session 边界

第 4 节的 fetchType="lazy" 背后是延迟加载体系。全局开关一个：

```yaml
mybatis:
  configuration:
    lazy-loading-enabled: true   # 全局默认延迟；单个 association 可用 fetchType 覆盖
```

触发时机精确到属性：主查询执行完，buyer 位置上放的是一个代理占位；**第一次调用 getBuyer() 时**才真正发出那条子查询，之后复用。用处很直接——查订单列表展示金额即可，十个订单用不到买家信息，就省下十次查询。

但延迟加载有一条铁律：**子查询需要一个活着的数据库会话来执行**。在 Spring 集成下，会话生命周期不归你管：无事务时，SqlSessionTemplate 每次 mapper 调用拿一个新 SqlSession、用完即关；只有 @Transactional 圈出的范围内，同一个会话贯穿始终。于是在事务外摸 lazy 属性，子查询要么触发兜底逻辑新开一条连接（你多付出一条没列入计划的 SQL），要么直接抛异常——具体形态随集成配置而变。JPA 世界给这类事故起了个响亮的名字 LazyInitializationException，[Spring Data JPA](/spring-boot/090-SpringDataJpa) 里的 open-in-view 警告说的就是同一件事。纪律一句话：**延迟属性的访问必须留在事务边界内，或者干脆用 join 一条 SQL 拿全。**

## 7. N+1 初现身：把 SQL 条数亲手数出来

延迟加载遇上列表循环，就是 JPA 那边见过的 N+1 的 MyBatis 版。开着 StdOutImpl 跑：

```java
List<Order> orders = orderMapper.selectByStatus(1);   // 1 条主查询，返回 20 个订单
for (Order o : orders) {
    System.out.println(o.getBuyer().getName());       // 首次访问 buyer，每个发 1 条子查询
}
```

数控制台的 Preparing 行：1 条主查询加 20 条子查询，共 21 条。成因同样一句话：**列表一次查出，关联逐个触发**。单条订单的详情页用嵌套查询毫无问题（就是 2 条 SQL）；列表页用它，SQL 条数随行数线性膨胀。解法方向有二——改用 join 嵌套结果一条拿全；或先收齐主列表的 user_id 再批量 IN 查询、内存组装。第二条的完整姿势与治理框架归 090 篇，这里先把病因数清楚。

## 8. 分页 × 一对多：一页 10 条只剩 3 个订单

本篇的独家重点，一个join 明细之后几乎必然撞上的坑。场景：订单列表页要展示每单的商品明细，你写了订单 join 明细的嵌套结果查询，再挂上分页插件（PageHelper 一类，原理 060 篇讲）按每页 10 条分页。诡异的事情发生了：总数显示 100，一页却只有 3 个订单；翻页时某些订单还会整单消失。

成因在于**两者数的东西不是一回事**。分页插件的工作是「数行、截行」：先发一条 count 数出总行数，再给主 SQL 拼 LIMIT 10。它眼里的单位是 join 之后的**行**；而 resultMap 眼里的单位是**订单对象**——join 明细后每个订单撑成 3 行（一单 3 种商品），LIMIT 10 截下 10 行，合并完只剩 3 个订单，另外 7 行配额被明细吃掉了。count 数的也是行，100 行除以 3 才是真实订单数。分页对象是行，映射对象是实体，粒度错位，错单必然。

三条出路，代价各有不同：

| 出路 | 做法 | 代价与适用 |
| --- | --- | --- |
| 派生表分页 | 内层子查询先定「这一页的订单 id」，外层再 join 明细 | 一条 SQL，但嵌套层数多、SQL 复杂度陡增 |
| 两段查询 | 第一条 SQL 查主表一页订单；第二条 foreach IN 按订单 id 批量查明细；内存组装 | 两条常规 SQL，条数可控、分页精准，工程首选 |
| 内存分页 | 不加 LIMIT，全部行查回、映射后再切页 | 数据量小时最省事；量大则流量与内存双输 |

派生表分页的 SQL 骨架长这样（MySQL 中派生表内使用 LIMIT 合法，直接 IN 子查询带 LIMIT 则不被支持，以官方文档为准）：

```sql
SELECT o.id, o.order_no, o.amount, i.product_name
FROM (SELECT id FROM orders ORDER BY created_at DESC LIMIT 10) page
JOIN orders o  ON o.id = page.id
JOIN order_items i ON i.order_id = o.id;
```

## 9. 设计指导：什么时候才动用关联映射

把全篇收成一张表。核心判断是：**这个页面要的是「行数据」还是「对象图」**——列表页要的是行，详情页才是对象图：

| 页面形态 | 推荐姿势 | 理由 |
| --- | --- | --- |
| 列表页 | 平铺 DTO，单条 SQL，不映射对象图 | 列表页展示的是行，套对象图徒增 SQL 与错乱风险 |
| 详情页（一对一） | association 嵌套结果，一条 join | 数据量小，一次拿全，无分页冲突 |
| 主从结构（用户 + 订单列表） | 两段查询：先主后从按 id 批量 | 条数可控，分页无碍，天然规避合并坑 |
| 巨量从属列表 | 从属侧独立分页 | 订单列表本来就是独立页面，别塞进用户详情 |

association 与 collection 不是「用得越花越专业」的装饰——它们是为详情页的对象图服务的工具。列表页硬上关联映射，是本篇两个事故（N+1、分页错乱）的共同起点。

## 动手实践

**任务一：id 标签的合并实验。** 用第 5 节的一对多嵌套结果查询，先正常跑（collection 合并正确），再把 resultMap 里的 `<id>` 标签改成 `<result>` 复跑，观察订单条目是否翻倍或错乱。提示：id 参与的"同一父对象"判定被去掉后，MyBatis 退化为按整行判等——这个实验就是第 5 节合并原理的反证。

**任务二：亲手数 N+1。** 写一个 20 条订单的列表查询，每条嵌套查询取买家，开 log-impl 数 SQL 条数；然后用 join + 嵌套结果改写，再数一次。提示：21 条对 1 条的对比摆出来，比任何说教都有说服力；顺带记录两种写法的总耗时，数据量大时差距更夸张。

**任务三：分页 x 一对多的复现与修复。** 按第 8 节复现"一页 10 条只剩 3 个订单"（join 一对多 + LIMIT），然后实现修复：先分页查父表（子查询圈定 id 列表），再按 id in 查关联装填。提示：修复后数一下 SQL 条数（应为 2 条）并验证每页恰好 10 个订单——两个标准同时满足才算修好。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现（先分页后装填）</summary>

```xml
<!-- 第一步：只分页查父表（不 join，行数 = 订单数） -->
<select id="selectOrderPage" resultType="Order">
  SELECT id, order_no, amount
  FROM orders
  WHERE status = #{status}
  ORDER BY created_at DESC
  LIMIT #{size} OFFSET #{offset}
</select>

<!-- 第二步：按 id 列表一次性查关联 -->
<select id="selectItemsByOrderIds" resultType="OrderItem">
  SELECT oi.*, oi.order_id AS orderId
  FROM order_items oi
  WHERE oi.order_id IN
  <foreach collection="orderIds" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>
```

```java
// 装填（服务层两步）
List<Order> orders = orderMapper.selectOrderPage(status, size, offset);
if (!orders.isEmpty()) {
    List<Long> ids = orders.stream().map(Order::getId).toList();
    Map<Long, List<OrderItem>> byOrder = orderMapper
        .selectItemsByOrderIds(ids).stream()
        .collect(Collectors.groupingBy(OrderItem::getOrderId));
    orders.forEach(o -> o.setItems(byOrder.getOrDefault(o.getId(), List.of())));
}
```

要点：a) 两步各司其职——第一步 LIMIT 语义精确（一页 10 个订单），第二步 IN 一次取全关联；b) 空列表短路（isEmpty 判断）防止 IN () 语法错误；c) 该模式的通用形态就是"先圈父 id、再批量装填"，090 篇的 N+1 修复同样是它。
</details>

## 官方文档

- MyBatis 中文文档「mapper XML 文件」章节（resultMap 全部子标签的权威定义）：https://mybatis.org/mybatis-3/zh/index.html

## 自检

1. id 与 result 标签的区别是什么？id 参与了哪一类判断？漏写它会诱发什么现象？
2. 嵌套结果与嵌套查询各发几条 SQL？按第 4 节对照表说出各自适合的场景。
3. collection 合并靠什么判定「同一父对象」？SELECT 漏掉父主键，症状精确描述一遍。
4. 延迟加载在什么时机发 SQL？为什么事务外摸 lazy 属性危险？两条纪律是什么？
5. 20 个订单的列表页用嵌套查询取买家，共几条 SQL？成因一句话。
6. 「总数 100、一页 3 个订单」的成因是什么？三条出路各付出了什么代价？
7. 列表页为什么不建议映射对象图？详情页一对一该选哪种写法？
