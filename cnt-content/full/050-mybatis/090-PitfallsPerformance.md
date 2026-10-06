---
order: 110
title: 慢查询病历本：N+1、批量写、select * 与深分页四大事故现场
description: 以「开发环境百条数据流畅、上线一周列表页 8 秒超时」引入：N+1 的两种来源与解法矩阵、foreach 巨型 SQL 与 ExecutorType.BATCH 的对决、select * 的三重隐税与列裁剪、深分页两招，附数 SQL 条数与批量写耗时对比两个实验，收束于先量再改的排查纪律。
module: 'mybatis'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'mybatis/040-ResultMapping'
  - 'mysql/110-SQLDataOperationQuery'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'mysql/340-SlowQueryLog'
  - 'mybatis/060-PluginInterceptor'
---

## 知识点地图

- 知识类别：MyBatis 性能病历——N+1、批量写错法、select * 隐税、深分页，以及排查工具链与两道健壮性保险丝。
- 解决什么问题："上线后越来越慢"的四类高频病灶的诊断与治疗；建立"先量再改"的排查纪律。
- 什么时候用到：接口性能告警、数据库 CPU 异常、大表上线前的自查；给团队做性能评审时当 checklist。

## 前置知识

- [结果映射](/mybatis/040-ResultMapping)：见过 association 与 collection 的嵌套查询写法——没读过也能跟，第 3 节现场补病灶上下文；
- [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会跑 SELECT 与 EXPLAIN——没读过也能跟，EXPLAIN 部分照抄命令即可。

## 学习目标

读完本文你将能够：

1. 复述 N+1 的两种来源，用数 SQL 条数的办法现场抓捕，并为场景选对解法；
2. 说清 foreach 巨型 SQL 的三种死法与 ExecutorType.BATCH 的正确姿势，解释 rewriteBatchedStatements 的关键作用；
3. 列出 select * 的三重隐税，用列裁剪给列表页瘦身；
4. 用游标法或子查询定位法处理深分页；
5. 搭起四层排查工具链，养成「先量再改」的纪律。

预计 50 分钟。

## 1. 你现在要解决什么问题

开发环境百条数据，接口怎么跑都是十几毫秒；上线一周，列表页 8 秒超时，告警群里 DBA 已经 @ 了你。这不是玄学，是数据量把一直存在的坏模式放大了——百条数据时每条坏 SQL 都快得看不出来，十万条后它们集体现形。本篇是一份「事故病历本」：MyBatis 工程最高发的四个性能事故，每个给复现方法、病因与处方。读它的正确姿势不是背结论，而是学会每个病例的「量法」——先量再改，所有优化动作之前先有数字。

四份病历的索引，方便按症状挂号：

| 病历号 | 事故 | 一句话病因 | 挂号症状 |
| --- | --- | --- | --- |
| 一 | N+1 查询 | SQL 条数随行数线性增长 | 接口耗时随数据量失控 |
| 二 | 批量写错法 | 巨型 SQL 或假批量 | 导入接口超时、连接被掐 |
| 三 | select * | 带宽、索引、大字段三重税 | 列表页无端慢 |
| 四 | 深分页 | 扫描丢弃 | 翻页越深越慢 |

## 2. 准备现场：把数据量拉到能现形的规模

病历要在「能现形」的数据量上复现。挑一张业务表，把数量拉到十万行级——用什么方式造都行，存储过程循环、脚本批量插皆可，关键是量：开发环境「百条看不出来」的坏模式，十万条才现形。

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32),
  user_id BIGINT,
  total_amount DECIMAL(10, 2),
  created_at DATETIME
);
```

观察窗两扇。第一扇，SQL 日志（020 装过）：

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

第二扇留给「量耗时」，p6spy 或 060 的计时插件任选其一。本篇实验以数 SQL 条数为主，耗时对比直接给示例量级，你有真环境就实测替换。

## 3. 事故一：N+1 查询

### 3.1 复现：数 SQL 条数

打开 StdOutImpl，跑一次「查订单列表并补用户」的组装：

```java
List<Order> orders = orderMapper.selectList(null);           // 1 条
for (Order o : orders) {
    o.setUser(userMapper.selectById(o.getUserId()));        // 每行再加 1 条
}
// 100 单 → 控制台 101 条 SQL
```

这是病灶二：循环里逐条查。病灶一更隐蔽，藏在 040 讲过的嵌套查询里：

```xml
<resultMap id="orderMap" type="Order">
    <association property="user" column="user_id"
                 select="com.example.mapper.UserMapper.selectById"/>
</resultMap>
```

主查询每回一行，子查询就发一条——组装便利的代价被懒加载藏到了第一次访问属性的那一刻。验收动作统一是数控制台的 SQL 条数：条数随行数线性增长，就是 N+1。

两种病灶的区分法：病灶一藏在 XML 映射里，调用代码干净得看不出问题，必须进控制台数 SQL 才现形；病灶二一眼可见，但要靠代码评审拦。共同点是「该一次拿的数据分了 N 次拿」，处方也共享，见下。

### 3.2 处方矩阵

| 解法 | 做法 | 适用 | 成本 |
| --- | --- | --- | --- |
| JOIN 一次查 | 主表 JOIN 子表，resultMap 组装 | 详情页、关联少且必要 | 写一条 JOIN 与映射 |
| 批量 IN 二次查询 | 先查主表收集 id，IN 批量查子表，内存组装 | 列表页（1+N 变 2 次） | 手写组装循环 |
| 冗余或缓存 | 列表页冗余常用字段，详情走缓存 | 读多改少 | 一致性维护成本 |

JOIN 版给个最小样例——SQL 带 join，映射把 association 的 select 换成列组装（040 的手艺）：

```sql
SELECT o.id, o.order_no, u.id AS user_id, u.name AS user_name
FROM orders o LEFT JOIN users u ON u.id = o.user_id
```

```xml
<resultMap id="orderMap" type="Order">
    <id property="id" column="id"/>
    <result property="orderNo" column="order_no"/>
    <association property="user" javaType="User">
        <id property="id" column="user_id"/>
        <result property="name" column="user_name"/>
    </association>
</resultMap>
```

一条 SQL、一次映射，N+1 归零；代价是列表行变宽、SQL 可读性下降。三条处方按场景换，没有免费的那种。

批量 IN 是列表页的主力处方：

```java
List<Order> orders = orderMapper.selectList(null);
List<Long> userIds = orders.stream().map(Order::getUserId).distinct().toList();
Map<Long, User> users = userMapper.selectBatchIds(userIds).stream()
        .collect(Collectors.toMap(User::getId, Function.identity()));
orders.forEach(o -> o.setUser(users.get(o.getUserId())));   // 1 + 1 = 2 条 SQL
```

### 3.3 IN 分批，为什么是几百一条

IN 列表越长，SQL 文本越长、解析越慢，优化器处理等值范围的代价越高。MySQL 有个参数叫 eq_range_index_dive_limit，默认 200：IN 的等值范围超过它，优化器放弃精确的 range 分析、退回索引统计估算，执行计划可能悄悄劣化。所以「几百一条、分批循环」是工程折中——SQL 长度可接受、批次数不爆炸——不是魔法数，依据就是这个参数与解析成本。

## 4. 事故二：批量写错法

### 4.1 foreach 巨型 SQL 的三种死法

```xml
<insert id="insertAll">
    INSERT INTO products (name, stock, price) VALUES
    <foreach collection="list" item="p" separator=",">
        (#{p.name}, #{p.stock}, #{p.price})
    </foreach>
</insert>
```

一万条 values 拼一条巨型 SQL，三种死法：其一，超过 max_allowed_packet（MySQL 8 默认 64MB 量级，以你的实例为准）服务端直接掐断连接；其二，没超也得过一遍 SQL 解析器，几 MB 的文本解析以秒计；其三，参数对象与解析树同时吃内存。先看自家门槛：

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

foreach 不是不能用——千条以内的中小批，一条 SQL 省掉往返也很快——是别拿它当万条级方案。

### 4.2 ExecutorType.BATCH：攒参数，不发网络

```java
try (SqlSession batch = sqlSessionFactory.openSession(ExecutorType.BATCH)) {
    ProductMapper mapper = batch.getMapper(ProductMapper.class);
    for (Product p : tenThousand) {
        mapper.insert(p);          // 只攒进批缓冲，不发网络
    }
    batch.commit();                // 此刻统一冲刷
}
```

Spring 里把 SqlSessionTemplate 用 ExecutorType.BATCH 构造成一个专用 Bean，事务内自动复用同一批会话。两个工程细节：批不是越大越好，攒几万条再冲刷内存同样疼，循环里每千条左右手动调一次 flushStatements 是常见折中；BATCH 会话里穿插查询要小心，冲刷之前查到的还是旧值。

但还有个隐藏开关——MySQL 驱动的 rewriteBatchedStatements：不开，驱动层把 executeBatch 拆成一条条发送（batch 只是攒的姿势，网络没省）；开了，驱动把同构 INSERT 合并成多值语句发。JDBC URL 加参数：

```text
jdbc:mysql://localhost:3306/shop?rewriteBatchedStatements=true
```

### 4.3 耗时对比（本地 MySQL 8、一万行 insert，示例量级，以实测为准）

| 写法 | 耗时量级 |
| --- | --- |
| foreach 巨型 SQL（未超 packet 上限时） | 数秒，行数越倍增恶化越快 |
| BATCH + rewriteBatchedStatements=false | 数十秒 |
| BATCH + rewriteBatchedStatements=true | 1 秒上下 |

结论：万条级批量写选 BATCH 加改写参数；foreach 巨型 SQL 封顶千条级并盯住 packet。

## 5. 事故三：select * 的三重隐税

第一重带宽税：SELECT * 拖回所有列，列表页其实只要三列，网络与内存白付。第二重索引税：若查询的列恰好都在某个二级索引里，InnoDB 可以不回表直接返回（覆盖索引），SELECT * 亲手废掉这条路（索引与回表的原理见 [聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）。第三重大字段税：TEXT、JSON、富文本列混在星号里，列表页为用不上的内容付出十倍带宽与内存。

处方是列裁剪。列表页只要几列时，selectMaps 或 Wrapper 的 select 都行：

```java
List<Map<String, Object>> briefs = orderMapper.selectMaps(
        Wrappers.<Order>lambdaQuery()
                .select(Order::getId, Order::getOrderNo, Order::getTotalAmount)
                .orderByDesc(Order::getCreatedAt)
                .last("LIMIT 20"));
```

分治纪律一句话：**列表不查大字段，详情页再按主键单独取**。列表是高频路径，窄行是它的本能；详情是低频路径，宽一点无妨。验收有个小技巧：EXPLAIN 的 Extra 列出现 Using index，说明查询吃到了覆盖索引；SELECT * 永远吃不到——这就是三重税里第二重的可观测形态。

## 6. 事故四：深分页（简）

LIMIT 100000, 20 越翻越慢，慢在扫描丢弃——MySQL 老老实实读出前十万行再扔掉。两招处方：

```sql
-- 游标法：记住上一页最后一个 id，前提是排序键有序且可回放
SELECT id, order_no FROM orders WHERE id > #{lastId} ORDER BY id LIMIT 20;

-- 子查询定位法：先算出目标页起点的 id，再从那里取 20 行
SELECT id, order_no FROM orders
WHERE id >= (SELECT id FROM orders ORDER BY id LIMIT 100000, 1)
ORDER BY id LIMIT 20;
```

游标法是「下一页」语义（无限滚动）的最优解；子查询定位法保住「跳页」语义但治标。量级感受（示例数据，同表同索引的实测趋势）：

| 写法 | 耗时量级 |
| --- | --- |
| LIMIT 20 | 毫秒级 |
| LIMIT 100000, 20 | 数百毫秒起步，随偏移线性恶化 |
| WHERE id > lastId LIMIT 20 | 恒定毫秒级，与页深无关 |

中小系统翻页深度有限——老规矩，先量，真出现慢的深翻页再治。

## 7. 排查工具链与「先量再改」

四层工具链，各回答一个问题：

- StdOutImpl（020 装的）：回答「发了几条 SQL、长什么样」——N+1 与动态 SQL 拼错现场第一站；
- p6spy：一句话——代理 JDBC 驱动，把 ? 直接替换成真实参数并记执行耗时，不想自己写 060 的计时插件就用它；
- MySQL 慢日志：跨应用的权威账本，谁在拖垮数据库它说了算，配置与读法见 [慢查询日志](/mysql/340-SlowQueryLog)；
- EXPLAIN：确认执行计划走没走索引、扫了多少行，命令在 mysql/110 基础篇，怎么读是索引篇的功课。

工具链落成三步排查剧本：第一步数 SQL 条数（StdOutImpl，抓 N+1）；第二步捞最慢的那几条（p6spy 或慢日志）；第三步 EXPLAIN 看扫描行数与索引命中。三步走完，「慢」就从一个感受变成了三个数字，处方自然浮出来。

「量」指三个数字：SQL 条数（是否 N+1）、单条耗时（慢在哪一条）、EXPLAIN 扫描行数（为什么慢）。先量再改——凭感觉优化是事故之源，本文每个病例的第一现场都是一张数字截图。

## 8. 健壮性保险丝：两道防线

性能事故防不完，保险丝至少两道。其一，BlockAttackInnerInterceptor（080 装过）：全表 UPDATE 与 DELETE 直接抛异常，把「忘写 WHERE」这类毁灭级手滑挡在执行前——纯检查，不误伤正常语句。其二，语句超时兜底：

```yaml
mybatis-plus:
  configuration:
    default-statement-timeout: 5      # 全局兜底，单位秒
```

超时的 SQL 被强制中断，防一条烂 SQL 长期占着连接拖垮连接池。语句级精确控制用 @Options(timeout = ...) 或映射器配置（以官方文档为准）。兜底不是替代治理——超时只是止血，病根回到第 7 节的工具链去查。

## 动手实践

**任务一：N+1 抓捕演练。** 搭一个 20 订单 x 每单 3 商品的数据集，先写"列表查订单 + 循环查商品"的朴素实现（故意制造 N+1），用 log-impl 数出 SQL 条数；再用 040 篇的"先圈父 id、再批量装填"改写，复数条数并对比总耗时。提示：耗时对比要在 1000 订单量级做才有区分度，20 条时两者都在毫秒级看不出差距。

**任务二：批量写三连对比。** 同一批 1 万条插入，分别用 a) 循环单条 insert、b) foreach 巨型 SQL、c) ExecutorType.BATCH + rewriteBatchedStatements，记录三种的耗时与 SQL 日志条数。提示：a 最慢且日志 1 万条刷屏、b 在千列限制处可能直接报错（把批量大小调成 1000 试探）、c 的日志只有一次 prepare 但多批 execute——三种形态看一眼日志就能认出来。

**任务三：select * 瘦身实测。** 把一个含大 TEXT 列的表的列表查询从 select * 改成列裁剪，对比传输字节量（驱动侧或抓包工具）与耗时。提示：TEXT 列造大一点（几百 KB/行）差距才明显；这个实验同时演示了"宽表列表页"这一最容易被忽视的流量税。

先自己操作，再对照参考实现：

<details>
<summary>任务二参考实现（BATCH 正确姿势）</summary>

```java
// 1. 独立的 BATCH 会话（不能与普通 SqlSession 混用）
try (SqlSession batchSession = sqlSessionFactory.openSession(ExecutorType.BATCH)) {
    ProductMapper mapper = batchSession.getMapper(ProductMapper.class);
    for (int i = 0; i < 10_000; i++) {
        mapper.insert(new Product("p-" + i, i * 1.0));
        if (i % 1000 == 999) {
            batchSession.flushStatements();   // 每 1000 条刷一次，控制 JDBC 批包大小
        }
    }
    batchSession.commit();
}

// 2. MySQL 侧必须开启重写，否则 BATCH 只是攒语句不合并网络往返
// spring.datasource.url=jdbc:mysql://...&rewriteBatchedStatements=true
```

要点：a) flushStatements 的间隔（1000）是吞吐与内存的平衡点，太大会占内存、太小网络往返变多；b) `rewriteBatchedStatements` 是 MySQL 驱动参数，不开它 BATCH 的收益几乎归零——这是"配了 BATCH 还是慢"的头号原因；c) 三种写法的耗时量级参考（本机 H2/MySQL 会有差异）：循环单条分钟级、foreach 十秒级、BATCH+重写秒级——量级差而不是百分比差。
</details>

## 自检

遮住上文与代码，凭记忆回答；答不出的回到对应小节重读。

1. N+1 的两种来源分别是什么？各怎么在控制台数出来？
2. JOIN、批量 IN、缓存三个解法各自的适用与成本？批量 IN 为什么几百一条，说出那个 MySQL 参数与默认值。
3. foreach 巨型 SQL 的三种死法是什么？它什么时候仍然可用？
4. BATCH 批处理的正确姿势是什么？Spring 里怎么接入？
5. rewriteBatchedStatements 不开会怎样？为什么说「batch 只是攒的姿势，网络没省」？
6. select * 的三重隐税是什么？覆盖索引是怎么被它废掉的？
7. 深分页两招的前提各是什么？分别保住哪种翻页语义？
8. 排查工具链四层各回答什么问题？「先量再改」的量指哪三个数字？两道保险丝各防什么？
