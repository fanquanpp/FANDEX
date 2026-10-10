---
order: 80
title: 插件与拦截器：一处织入，全局生效
description: 以「200 个 Mapper 要统一加慢 SQL 日志、分页与执行监控」引入：四大对象的动态代理洋葱模型、@Signature 三元组、手写慢 SQL 计时插件、分页插件先 count 再改写 LIMIT 的两段式原理，附 PageHelper ThreadLocal 污染事故复盘与多插件顺序实验。
module: 'mybatis'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'mybatis/010-FromJdbcToMybatis'
  - 'mybatis/020-QuickStartCrud'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mybatis/080-MybatisPlusAdvanced'
  - 'mysql/340-SlowQueryLog'
---

## 知识点地图

- 知识类别：MyBatis 插件机制——四大拦截对象、责任链 + 动态代理原理、慢 SQL 计时器与分页插件两段式、PageHelper 的 ThreadLocal 污染。
- 解决什么问题：横切能力（计时、分页、审计、数据权限）不改业务代码地挂进 SQL 执行链；以及"用错插件"的典型事故如何从原理上理解。
- 什么时候用到：写或接入第一个插件、配分页插件、排查"分页参数串了"的灵异事故。

## 前置知识

- [从 JDBC 到 MyBatis](/mybatis/010-FromJdbcToMybatis)：知道一条 SQL 从 Mapper 接口到 JDBC 之间隔着 Executor、StatementHandler 这些中间层——没读过也能跟，第 3 节现场补齐这张地图；
- [快速上手 CRUD](/mybatis/020-QuickStartCrud)：跑通过一个最简 Mapper，知道工程里 SqlSessionFactory 由谁创建。

## 学习目标

读完本文你将能够：

1. 说出四大对象各能拦到什么，为「慢 SQL 日志、SQL 改写、参数加工、结果加工」选对拦截点；
2. 默写 @Intercepts 加 @Signature 的三元组写法，解释少任何一元为什么连编译都过不去；
3. 手写一个慢 SQL 计时插件，并在 Spring Boot 下用两条路注册生效；
4. 复述分页插件「先 count 再改写 LIMIT」的两段式原理，解释分页为什么必然是两次执行；
5. 复盘 PageHelper 的 ThreadLocal 污染事故，给出防复发纪律；
6. 说清多插件包裹的洋葱方向与官方的添加顺序建议。

预计 45 分钟。

## 1. 你现在要解决什么问题

技术负责人在周会上提了三件事：所有查询要能自动记慢 SQL 日志；列表接口要统一分页；要给 SQL 执行耗时建监控。项目里有 200 个 Mapper。最直接的想法是每个方法前后加代码——200 个接口、上千个方法，改到下个季度，而且第三个需求（监控）根本没法靠手工埋点覆盖。这时候你需要的是框架级的钩子：**在所有 SQL 执行的必经之路上装一道闸，一处织入，全局生效**。MyBatis 的答案叫插件（plugin），官方文档也称拦截器（interceptor），两词同义。上一篇的缓存是在 Executor 外面套装饰器，本篇的插件是更通用的那把刀——它是 MyBatis-Plus 一切黑科技（分页、乐观锁、防全表更新）的底座，也是面试高频区。本篇先立心智模型，再手写一个插件，最后用近半篇幅讲清最常用也最容易出事故的分页插件。

## 2. 准备现场

沿用 [快速上手 CRUD](/mybatis/020-QuickStartCrud) 的 Spring Boot 3.5.x + MyBatis 3.5.x + MySQL 8 工程，打开 SQL 日志（后面实验要靠它数 SQL）：

```yaml
mybatis:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

MyBatis 干活的骨架是四个对象，你写的每条 Mapper 方法最终都穿过它们：

| 对象 | 职责 | 典型插件用途 |
| --- | --- | --- |
| Executor | 执行器：调度一次增删改查，管理一级缓存与事务提交 | 分页改写、SQL 统计 |
| StatementHandler | 语句处理器：持有 SQL 与 JDBC Statement，负责执行 | 执行计时、SQL 改写、打印语句 |
| ParameterHandler | 参数处理器：把参数设进 PreparedStatement | 参数加密、敏感数据脱敏 |
| ResultSetHandler | 结果处理器：把 ResultSet 映射成对象 | 结果解密、列脱敏 |

这张表同时是拦截点的选择地图。一条查询的必经之路：

```text
Mapper 代理
  → Executor（调度与缓存）
    → StatementHandler（借连接、建 Statement、执行）
        ├ ParameterHandler（设参数）
        ├ JDBC 执行
        └ ResultSetHandler（映射结果）
```

后半程三个对象由 StatementHandler 在构造时顺手创建——所以拦截 StatementHandler 等于站在「SQL 已定、尚未执行」的黄金位置，第 4 节的计时插件就选在这里。

## 3. 心智模型：插件是责任链加动态代理

Configuration 是四大对象的工厂：newExecutor、newStatementHandler、newParameterHandler、newResultSetHandler 四个方法长得都一样——先 new 出对象，再调 interceptorChain.pluginAll() 挨个裹一遍代理。所谓「配置一个插件」，就是往这条链里加一个实现 Interceptor 接口的类。

四大对象全是接口，所以 MyBatis 用 JDK 动态代理就够了，不需要 CGLIB。Plugin.wrap(target, this) 生成的代理只拦 @Signature 命中的方法，其余方法原样透传——这是插件不破坏原类的原因。

多个插件呢？pluginAll 的循环给出洋葱模型（3.5.x 源码骨架）：

```java
public Object pluginAll(Object target) {
    for (Interceptor interceptor : interceptors) {
        target = interceptor.plugin(target);    // 按注册顺序逐层包裹
    }
    return target;
}
```

```text
配置顺序：插件 A 先注册，插件 B 后注册
pluginAll 包裹：真实对象 → A.plugin() → A 的代理 → B.plugin() → B 的代理（最外层）

一次调用穿过：
调用方 → B.intercept（前半段）→ proceed → A.intercept（前半段）→ proceed → 真实方法
返回时：真实方法 → A 的后半段 → B 的后半段 → 调用方
```

结论两句：**先注册的裹在内层，后注册的裹在外层**；于是每个插件 intercept 的前半段按「后注册先执行」，proceed 之后的后半段按「先注册先执行」。这片洋葱方向极容易背反，记不住就写两个打印插件跑一次，用日志校准（第 8 节实验三）。

## 4. 手写第一个插件：慢 SQL 计时器

@Intercepts 声明「我是插件」，@Signature 声明「我拦谁」。签名是三元组：type（拦截哪个类）、method（拦哪个方法）、args（该方法哪个重载，用参数类型数组区分）。StatementHandler 创建 JDBC Statement 的入口是 prepare：

```java
@Intercepts({
    @Signature(type = StatementHandler.class, method = "prepare",
               args = {Connection.class, Integer.class})
})
public class SlowSqlPlugin implements Interceptor {

    private long slowMs = 300;                       // 阈值，正式使用从配置读

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return invocation.proceed();             // 放行：真正去创建 Statement
        } finally {
            long cost = System.currentTimeMillis() - start;
            if (cost >= slowMs) {
                StatementHandler handler = (StatementHandler) invocation.getTarget();
                System.out.printf("[慢SQL] %d ms - %s%n",
                        cost, handler.getBoundSql().getSql());
            }
        }
    }
    // 3.5.x 中 plugin() 与 setProperties() 有默认实现，前者就是 Plugin.wrap(target, this)，可省
}
```

四个 API 各一句：invocation.getTarget() 拿被代理的原对象；getArgs() 拿方法实参（prepare 的 Connection 就在里面）；proceed() 放行并拿返回值；不命中签名的方法根本进不了 intercept。计时放 finally 里是为了连异常路径也算时间。getSql() 拿到的是带 ? 的 SQL——真实参数要另取 parameterObject，这件麻烦事 p6spy 已经做好了（090 见）。

Spring Boot 下注册有两条路。方式一，标 @Component——启动器的自动配置会收集容器里所有 Interceptor 类型的 Bean，逐个装进 Configuration，零配置生效，推荐：

```java
@Component
public class SlowSqlPlugin implements Interceptor { /* 上面那份代码 */ }
```

方式二，ConfigurationCustomizer Bean，适合按环境决定装不装的场合：

```java
@Bean
public ConfigurationCustomizer slowSqlCustomizer() {
    return configuration -> configuration.addInterceptor(new SlowSqlPlugin());
}
```

注意 mybatis 启动器与 MP 启动器各有一个同名 ConfigurationCustomizer 接口——import 错包编译照样通过、插件静默不装，排查先看 import。非 Boot 的传统工程还有第三条路：mybatis-config.xml 的 plugins 节点，本系列不展开。验证装没装上最简单的办法：把阈值临时调成 1，随便一条查询都该出日志。

## 5. 本篇核心：分页插件的两段式原理

MyBatis 本体没有物理分页能力——RowBounds 是内存分页（查出全部再 skip/limit，大表上是事故）。物理分页要靠改写 SQL 拼 LIMIT，这活最适合插件干。以 MP 的 PaginationInnerInterceptor 为主角（MP 从 070 起正式登场，本篇先看机制；PageHelper 是同原理的另一款流行实现，对照见第 6 节）。

两种分页一对照：

| | 内存分页（RowBounds） | 物理分页（改写 LIMIT） |
| --- | --- | --- |
| SQL 形态 | 原样执行，查全量 | 拼 LIMIT，只查本页 |
| 大表行为 | 全部拉回应用内存 | 数据库只回本页 |
| 结论 | 小结果集顺手用 | 列表页唯一正解 |

使用面先看一眼，机制随后展开：

```java
Page<Product> page = productMapper.selectPage(new Page<>(1, 10), null);   // 第一页，每页 10 条
```

组装方式：MP 的 MybatisPlusInterceptor 是一个普通 MyBatis 插件（拦 Executor 的 query、update 与 StatementHandler 的 prepare 三处），内部维护一列 InnerInterceptor，在合适时机挨个交给它们处理。分页是第一位住客：

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

一次分页查询的完整旅程：

```text
selectPage(new Page<>(1, 10), wrapper) 进入插件
  ↓ 1. 改写 count：无 group by 时先摘掉 order by，再包一层 SELECT COUNT(*)
  ↓ 2. 发 count SQL，拿 total
  ↓ 3. total 为 0 → 直接返回空页，列表 SQL 都不发（短路）
  ↓ 4. JSqlParser 解析原 SQL，按 DbType.MYSQL 拼 LIMIT offset, size
  ↓ 5. 发改写后的列表 SQL → 组装 records 与 total 返回
```

三个为什么。**为什么拦 Executor.query 而不是 StatementHandler**——count 是一条独立 SQL，LIMIT 改写必须赶在 Statement 创建之前，都在 Executor 层动手最干净。**为什么必然两次执行**——一条 SQL 要么返回行、要么返回总数，MySQL 给不了两者，而页面要同时渲染「本页数据」与「共 N 条」。**count 的小优化是什么**——没有 group by 时排序不影响计数，把 order by 摘掉再计数，行数大时省一次排序；带分组等复杂 SQL 的计数交给自定义 count 语句（Page 的 countId，以官方文档为准）。

顺带一个很多人不知道的特性：自定义 XML 方法也能分页——Mapper 方法第一个参数传 Page，MP 照样拦截改写，完整示例在 080 篇。

## 6. 高频事故：PageHelper 的 ThreadLocal 污染

PageHelper 的用法长这样：

```java
PageHelper.startPage(2, 10);                          // 分页参数放进当前线程的 ThreadLocal
List<Product> list = productMapper.findByStatus(1);   // 紧邻的下一条查询消费它并清除
PageInfo<Product> page = new PageInfo<>(list);
```

startPage 与查询语句之间没有任何参数传递——分页参数靠 ThreadLocal 隐式搭桥。省了两行代码，埋了一类事故：

```java
public List<Product> listProducts(Integer pageNum) {
    PageHelper.startPage(pageNum, 10);
    List<Category> categories = categoryMapper.selectAll();   // 插队的查询：把分页吃掉了
    return productMapper.findByStatus(1);                     // 真正想分页的：反而没分页
}
```

现象是列表页翻页无效、上游接口莫名只回 10 条。成因一句话：**startPage 与查询之间是 ThreadLocal 的隐式耦合，任何插进来的查询都会抢先消费分页参数**。还有一种更隐蔽的形态：startPage 之后、查询之前抛了异常，ThreadLocal 残留在工作线程上；线程池复用这条线程跑下一条无辜查询，迟到的分页参数突然生效，又是一条「莫名只回 10 条」。

纪律两条：startPage 与查询语句之间不许有任何代码——紧邻到中间插不进一行的程度；或者换成 MP 的显式传参（分页参数进方法签名，编译器替你盯），070 起的主线就是这么走的：

```java
productMapper.selectPage(new Page<>(pageNum, 10), wrapper);   // 分页参数长在签名里，插不了队
```

面试被问「PageHelper 原理」，答出 ThreadLocal、再答出「所以有什么风险」，才算完整。

## 7. 多插件顺序与冲突

插件多了，两套顺序要分清。第一套是多个 MyBatis 插件之间的洋葱顺序（第 3 节：后注册在外层、先执行）。第二套是 MP 体系内的：官方对 InnerInterceptor 的添加顺序给出明确建议——**会改写 SQL 的优先放入，只做检查的最后放入**，顺序表为多租户、动态表名在前，分页、乐观锁居中，sql 性能规范、防全表更新与删除收尾。流行说法「分页插件要放最后」，准确含义是「排在多租户这类会改写 SELECT 的插件之后」——顺序错了，count 与 LIMIT 就基于错误形态的 SQL 计算。完整建议以 MP 官方文档为准；本模块四件套的实战排法在 080 篇落地。

冲突排查的入手点一句话：同一对象被多层代理时，invocation.getTarget() 拿到的可能还是别家插件的代理——想拆属性，先想清楚自己裹在第几层，必要时用 MetaObject 拆壳。

## 8. 实验

实验一：插件装没装上一眼验证。把 SlowSqlPlugin 的阈值临时调成 1，启动工程随便跑一条查询，控制台应同时出现 StdOutImpl 的 SQL 预览与你的「[慢SQL]」行：

```text
==>  Preparing: SELECT id, name FROM products WHERE status = ?
==> Parameters: 1(Integer)
[慢SQL] 3 ms - SELECT id, name FROM products WHERE status = ?
```

把 @Component 注释掉重启，「[慢SQL]」行消失——注册链路的边界就此看清。

实验二：数一数一次分页几条 SQL。装上 MP 分页插件（Page 对象的细节 070、080 展开），执行一次 selectPage，StdOutImpl 里应数出两条 SQL：

```text
==>  Preparing: SELECT COUNT(*) FROM products WHERE status = ?
==>  Preparing: SELECT ... FROM products WHERE status = ? LIMIT 10
```

再让查询条件命中零行（比如 status = -1），观察第二条 SQL 是否还发——count 短路优化就在那里现形。

实验三：校准洋葱方向。写两个打印插件（intercept 首尾各打一行「A 进」「A 出」），按 A、B 顺序注册，跑一条查询。预期日志：B 进、A 进、A 出、B 出——后注册的在外层先执行。跟第 3 节的推演对一遍。

## 自检

遮住上文与代码，凭记忆回答；答不出的回到对应小节重读。

1. 四大对象各能拦到什么？慢 SQL 日志、SQL 改写、参数加密、结果脱敏，各应选哪个拦截点？
2. @Signature 三元组是哪三元？少任何一元会发生什么？为什么同名重载必须靠 args 区分？
3. pluginAll 的包裹方向：先注册的在内层还是外层？一个插件 intercept 的前半段与 proceed 之后的代码，执行顺序各是什么？
4. 盖住代码，默写拦截 StatementHandler.prepare 的完整 @Intercepts 写法。
5. 分页插件为什么必然发两条 SQL？count 的默认小优化是什么？count 为 0 时发生了什么？
6. MP 分页为什么拦 Executor.query 而不是 StatementHandler？
7. PageHelper 污染事故的成因一句话；「插队查询」与「残留污染」两种形态分别怎么发生；两条防复发纪律是什么？
8. MP 官方对 InnerInterceptor 顺序的建议是哪一句？「分页放最后」的准确含义是什么？
