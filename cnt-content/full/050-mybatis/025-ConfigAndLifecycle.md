---
order: 30
title: 核心配置与运行时生命周期
module: 'mybatis'
category: 后端技术
difficulty: beginner
description: mybatis-config.xml 关键配置、与 Spring Boot 配置的对应关系、SqlSessionFactory/SqlSession/Mapper 的生命周期与线程安全
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：MyBatis 核心配置（mybatis-config.xml）与运行时对象生命周期（SqlSessionFactory/SqlSession/Mapper）。
- 解决什么问题：MyBatis 的行为开关（驼峰映射、日志、缓存）在哪里配、老工程与 Spring Boot 工程配置怎么互相换算；三大核心对象各自活多久、谁能单例谁不能。
- 什么时候用到：接入 MyBatis 的第一天、老工程配置迁移、排查"字段没映射上"、"日志看不到 SQL"、"连接池参数调优"。
- 衔接：《快速上手 CRUD》第 7 节的三步执行链是运行时行为，本篇把它的每一环落到配置源头上；《慢查询病历》的排查从日志开关开始——那也在这里配。

## 前置知识

- 《从 JDBC 到 MyBatis》的三层塔心智模型；
- Spring Boot 配置文件的基本用法（本模块所有服务都是 Boot 应用）。

## 学习目标

- 读懂 mybatis-config.xml 的骨架：settings 高频项、typeAliases、environments、mappers；
- 能在 Spring Boot 的 application.yml 里找到每个 XML 配置的对应项，完成老工程配置迁移；
- 说清 SqlSessionFactoryBuilder / SqlSessionFactory / SqlSession / Mapper 四个对象的作用域与线程安全边界；
- 解释"为什么 Mapper 是单例而 SqlSession 不是"。

## 1. 心智模型：配置决定行为，生命周期决定并发安全

MyBatis 的世界由两层构成：

```text
配置层（启动时读一次，决定行为）：
  mybatis-config.xml（或 Spring Boot 的 yml 配置）-> SqlSessionFactory
运行时层（每次操作都在创建与回收）：
  SqlSessionFactory -> SqlSession -> Mapper 代理 -> 执行 SQL
```

行为看不懂，查配置层；并发出问题（连接泄漏、数据串了），查运行时层。两层的问题混在一起查，是新手排查慢的根源。

## 2. mybatis-config.xml 骨架与高频 settings

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
  <settings>
    <!-- 数据库列名 user_name -> 实体属性 userName，自动驼峰转换 -->
    <setting name="mapUnderscoreToCamelCase" value="true"/>
    <!-- 运行 SQL 的日志实现，开发期排查必备 -->
    <setting name="logImpl" value="STDOUT_LOGGING"/>
    <!-- 二级缓存总开关（缓存专题详述） -->
    <setting name="cacheEnabled" value="true"/>
    <!-- 延迟加载总开关 -->
    <setting name="lazyLoadingEnabled" value="false"/>
    <!-- 参数为 null 时的 JDBC 类型，Oracle 必须配 NULL -->
    <setting name="jdbcTypeForNull" value="NULL"/>
  </settings>

  <typeAliases>
    <package name="com.example.order.entity"/>
  </typeAliases>

  <environments default="dev">
    <environment id="dev">
      <transactionManager type="JDBC"/>
      <dataSource type="POOLED">
        <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
        <property name="url" value="jdbc:mysql://localhost:3306/shop"/>
        <property name="username" value="root"/>
        <property name="password" value="dev-pass"/>
      </dataSource>
    </environment>
  </environments>

  <mappers>
    <mapper resource="mapper/OrderMapper.xml"/>
    <package name="com.example.order.mapper"/>
  </mappers>
</configuration>
```

**讲解：**

1. **settings 是 MyBatis 的行为总开关**，高频五项就够日常用：`mapUnderscoreToCamelCase` 是国内工程必开项（数据库蛇形命名与 Java 驼峰的换算），不开它查出来的 userName 全是 null——"字段没映射上"事故的七成是这个开关没开；`logImpl` 决定你能不能在控制台看到 SQL 与参数（《慢查询病历》的排查第一课）。
2. `typeAliases` 的包扫描让 XML 里可以写 `resultType="Order"` 而不是全限定类名；别名只影响书写，不影响行为。
3. `environments` 只在**裸用 MyBatis**（没有 Spring）时才有意义：transactionManager 选 JDBC（自己 commit）或 MANAGED（容器托管），dataSource 的 POOLED 是自带简易连接池。Spring 环境下这两个全被 Spring 的事务与数据源接管，这段配置整个作废——老工程迁移时最容易纠结的其实就是这段"不需要迁移"的部分。
4. `mappers` 四种注册写法：`resource`（按 XML 路径）、`class`（按接口类名，要求 XML 与接口同名同包或注解 SQL）、`url`（绝对路径，基本不用）、`package`（包扫描，最常用）。规则记一条：**接口与 XML 必须能被配对**——同名同包最省心，配不上对启动时报 Invalid bound statement。

## 3. Spring Boot 下的等价配置

```yaml
# application.yml —— 与上节 XML 逐项对应
mybatis:
  config-location: classpath:mybatis-config.xml   # 方式 A：继续用整个 XML 文件
  # 方式 B：不用 XML，直接在 yml 里写常用项
  mapper-locations: classpath*:mapper/**/*.xml    # 对应 <mappers><mapper resource>
  type-aliases-package: com.example.order.entity  # 对应 <typeAliases><package>
  configuration:
    map-underscore-to-camel-case: true            # 对应 settings 各项
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

**讲解：**

1. 两种方式二选一：`config-location` 指向完整 XML，或者 `configuration.*` 直接写设置项——**两者同时配置启动报错**（mybatis 会拒绝歧义配置）。Spring Boot 工程的主流是方式 B：mapper-locations + configuration 两项配齐。
2. 老工程迁移（xml 向 Spring Boot）的映射表：settings 逐项搬进 `mybatis.configuration.*`；mappers 搬进 `mapper-locations`（注意 `classpath*:` 前缀扫多 jar 包）；typeAliases 搬进 `type-aliases-package`；environments/dataSource **不搬**——交给 Spring 的 `spring.datasource.*` 与连接池。
3. 连接池参数是 Spring 侧的事：`spring.datasource.hikari.maximum-pool-size`、`connection-timeout`——这些与 MyBatis 无关但与《慢查询病历》强相关：池小了慢查询排队，表现为"SQL 本身很快但接口慢"。排查时先分清"MyBatis 慢"还是"等连接慢"。
4. MyBatis-Plus 的配置前缀换成 `mybatis-plus.*`，项名基本一致——迁移到 MP 时只改前缀与 starter。

## 4. 三层对象的生命周期与线程安全

```text
SqlSessionFactoryBuilder   方法级   用完即弃（建完 factory 就没用了）
SqlSessionFactory          应用级   全局单例，进程活它就活，线程安全
SqlSession                 请求级   每次操作/每个请求一个，非线程安全，用完关闭
Mapper 接口代理            请求级   从 SqlSession 取出，随 session 生死
```

**讲解：**

1. **SqlSessionFactory 是单例**：它持有配置元数据与连接池，构建成本高（解析全部 XML），全应用共享一个。重复构建 factory 是新手事故——每建一个都新开一套连接池，连接数爆涨。
2. **SqlSession 不是线程安全**：它内部有第一级缓存与连接状态，两个线程共享一个 session 会互相污染（拿到对方的缓存、抢同一个连接）。所以它的生命周期 = 一个请求/一个方法。
3. **为什么 Mapper 是单例而 SqlSession 不是**：Spring 集成下 Mapper 是动态代理（MapperProxy），代理对象本身无状态、线程安全，可以单例注入；每次方法调用时代理从 Spring 事务管理器**借一个 SqlSession**（SqlSessionTemplate 的机制），方法结束归还。也就是说：**单例的 Mapper 内部，每次调用都在换 session**——这就是"Mapper 单例"与"session 请求级"不打架的原因。裸用 MyBatis 时（无 Spring），Mapper 从 session 里 getMapper 取出，随 session 一起用完即弃。
4. 易错点：裸用 MyBatis 的老代码里 `sqlSession.close()` 忘写就是连接泄漏（池耗尽，接口全部卡死）；Spring 集成下事务方法结束时自动归还，不用（也不该）手动 close。看到手写 close 的代码，先问一句"这是裸用还是 Spring 托管"。

## 5. 把《快速上手》的三步执行链落回配置源

020 篇的三步执行链（接口方法 -> Mapper 定位 SQL -> 执行返回映射）的每一环都有配置源头：

| 执行链环节 | 配置源头 | 配错的表现 |
| --- | --- | --- |
| 接口方法能找到 XML | mapper-locations / package 扫描 | Invalid bound statement |
| SQL 结果映射到属性 | mapUnderscoreToCamelCase / resultMap | 属性全 null 或部分 null |
| 看到执行的 SQL | log-impl（STDOUT/SlF4J） | 控制台无 SQL，排查全靠猜 |
| 类型安全转换 | 内置 TypeHandler（见第 40 篇） | 枚举/时间字段转换异常 |
| 连接的借还 | Spring 事务管理器 + 连接池 | 池耗尽 / 连接泄漏 |

**讲解：** 这张表是排查路线图：症状定位到环，环再定位到配置项。比如"列表页字段全是 null"，第一反应不是查 SQL 写没写对，而是查驼峰开关——因为 SQL 在控制台里明明执行成功了。

## 6. 三个真实场景

**场景一：老工程 xml 配置向 Spring Boot 迁移。** 五年老工程从 Servlet + 裸 MyBatis 升级到 Spring Boot。迁移清单按第 3 节映射表执行，踩到两个坑：a) 原工程的多个 environment（dev/test/prod 切数据源）在 Boot 里改用 profile + 多数据源配置，environments 段整体废弃；b) 原 xml 里的 `<settings>` 有一项 `defaultExecutorType=BATCH`（批量导入优化），迁移时漏了——批量导入性能从千条/秒掉到百条/秒，按第 5 节执行链表反查才找回。教训：迁移不是复制粘贴，是逐项核对执行链。

**场景二：连接池参数与慢查询排查的衔接。** 大促压测时接口 P99 飙高，SQL 日志里单条都很快。hikari 控制台指标显示活跃连接顶满、等待线程排队——池大小 10 扛不住并发，扩到 50 后恢复。这里的排查链正是第 3 节第 3 条讲的"MyBatis 快、等连接慢"：MyBatis 的 logImpl 只能看到 SQL 耗时，看不到排队耗时，中间那段时间要去连接池指标里找。

**场景三：把三步执行链讲给新同事。** 新人问"为什么接口方法没实现类也能跑 SQL"，用第 4 节的代理机制回答：Mapper 是动态代理单例，方法调用时从 SqlSessionTemplate 借 session、定位 XML 里的 statement、执行并映射、归还 session。接着打开 log-impl 让他亲眼看到 SQL 打印——配置层的知识（这篇章）到此完成从"背配置项"到"理解执行链"的跨越。

## 7. 动手实践

**任务一：配置映射翻译。** 给定一个只写了 `mybatis.config-location` 的 Boot 工程，把它改造成纯 yml 方式（删 XML，全部搬进 `mybatis.*`），验证驼峰映射与 SQL 日志行为不变。提示：`config-location` 与 `configuration.*` 互斥，改造时先删前者；XML 里每一项 settings 对照官方配置表逐项找 yml 名。

**任务二：三大开关的行为实证。** 在一个带 user_name 列的表上：a) 关掉驼峰映射，观察查询结果哪些字段变 null；b) 切换 log-impl 为 STDOUT_LOGGING，数出一次 selectPage 打了几条 SQL；c) 把 log-impl 删掉，体验"没有日志怎么排查"（然后用 P6Spy 或 MP 的 p6spy 集成找回）。提示：三个实验各自模拟一次真实事故，做完把"症状 -> 配置项"写进你的笔记。

**任务三：生命周期反证实验。** 裸 MyBatis 小工程里，把 SqlSessionFactory 的构建放进一个被调用十次的方法里（错误示范），观察 hikari/POOLED 的连接数指标变化；再改成静态单例对比。提示：裸用场景用 MyBatis 自带的 POOLED 数据源即可观察（日志打印连接借用）；这个实验在 Spring 集成下做不了——因为 Spring 已经强制了单例，这本身就是结论的一半。

先自己操作，再对照参考实现：

<details>
<summary>任务二参考操作（a/b 两项）</summary>

```yaml
# 实验 a：故意关掉驼峰映射
mybatis:
  configuration:
    map-underscore-to-camel-case: false   # 改完重启
```

```java
// 实体（字段 camelCase）
public class User {
    private Long id;
    private String userName;    // 数据库列 user_name
}
// 查询后 print：userName == null（其余正常）——因为 resultMap 没配、
// 自动映射按同名字段匹配，user_name 与 userName 名字对不上。
// 修回 true 后正常。这就是"属性全 null 先查驼峰开关"的实验依据。
```

```yaml
# 实验 b：STDOUT_LOGGING 下的一次分页（MP 分页插件）应数出两条
mybatis:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

```text
==>  Preparing: SELECT COUNT(*) FROM users WHERE status = ?
==>  Preparing: SELECT id,user_name FROM users WHERE status = ? LIMIT ?,?
# 一条 count、一条取页数据——070 篇的分页插件两段式在日志里现形
```

要点：a) 驼峰开关影响的是"无 resultMap 时的自动映射"，配了显式 resultMap 的语句不受它影响——两个机制要分清；b) log-impl 选 STDOUT_LOGGING（直接控制台）还是 SLF4J（进日志框架）取决于部署形态，容器环境一律 SLF4J；c) 三个实验的对照笔记建议画成"症状 -> 病根 -> 配置项"三列表，它就是你的 MyBatis 排查速查表。
</details>

## 8. 一句话记住

> 配置层决定行为（驼峰映射、日志、mapper 扫描三件套是 Boot 工程的起手配置），运行时层决定并发安全（factory 应用级单例、session 请求级即弃、Mapper 单例代理每次借新 session）；排查先分层——行为不对查配置，并发不对查生命周期。

## 官方文档

- MyBatis 官方文档 Getting Started / Configuration 章节：https://mybatis.org/mybatis-3/zh/configuration.html （CC 授权）
- MyBatis-Spring-Boot-Starter：https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/

## 自检

1. `mapUnderscoreToCamelCase` 没开时的典型症状是什么？它与 resultMap 的关系是什么？
2. 老工程迁移时 environments/dataSource 为什么不搬？连接池参数应该在哪个体系里配？
3. 四个核心对象各自的作用域与线程安全性？为什么 Spring 下 Mapper 可以单例？
4. 裸用 MyBatis 忘写 session.close() 会发生什么？Spring 集成下为什么不用写？
5. "接口很慢但 SQL 日志里单条很快"，下一步查什么？
