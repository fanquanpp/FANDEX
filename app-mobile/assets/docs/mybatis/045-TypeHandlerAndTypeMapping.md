---
order: 60
title: TypeHandler 与类型转换
module: 'mybatis'
category: 后端技术
difficulty: beginner
description: 内置 TypeHandler 映射、自定义枚举/JSON/时间 handler、注册方式与 resultMap 配合
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：MyBatis 的 TypeHandler 体系——Java 类型与 JDBC 类型的双向转换层，内置映射、自定义 handler 与注册方式。
- 解决什么问题：枚举存 code 而不是 name、对象存 JSON 列、时间字段的时区与精度——这些"数据库列类型与 Java 类型不一致"的转换，全部收口在 TypeHandler 一个扩展点里。
- 什么时候用到：订单状态枚举落库、用户地址存 JSON 列、多时区报表系统的时间字段、任何"入库出库要变形"的字段。
- 衔接：《结果映射》（040 篇）的 resultMap 是行到对象的布局，TypeHandler 是列到字段的类型转换——两者在 `<result>` 标签上会合。

## 前置知识

- 《快速上手 CRUD》：三步执行链与注解映射；
- 《结果映射》：resultMap 的 id/result 标签；
- 《核心配置与运行时生命周期》（025 篇）：configuration 的 settings 层。

## 学习目标

- 理解 TypeHandler 的接口契约（setParameter/getResult）与内置映射表的覆盖范围；
- 会写三类高频自定义 handler：枚举存 code、对象存 JSON 列、时间字段带时区；
- 会用 @MappedTypes/@MappedJdbcTypes 注册 handler，并知道 Spring Boot 下的包扫描注册；
- 知道全局注册与 resultMap 局部指定的差别与副作用边界。

## 1. 心智模型：参数出去、结果回来，各过一次转换

```text
Java 对象 --setParameter()--> JDBC 参数（PreparedStatement）--> 数据库列
数据库列 --getRow/ getResult()--> Java 字段（结果集映射）
```

TypeHandler 就是这两条通道上的翻译官：写的时候把 Java 类型翻译成 JDBC 类型，读的时候反向翻译。**所有没配 handler 的类型都走内置映射表**（String-VARCHAR、Integer-INTEGER、LocalDateTime-TIMESTAMP、Date-TIMESTAMP 等，官方 Type Handlers 章节有全表）；内置表没覆盖或行为不合意时，才写自定义 handler。

## 2. 场景一：枚举存 code 而不是 name

订单状态枚举，数据库存数字 code（1=待支付，2=已支付）：

```java
public enum OrderStatus {
    PENDING(1), PAID(2), SHIPPED(3), CLOSED(9);

    private final int code;
    OrderStatus(int code) { this.code = code; }
    public int getCode() { return code; }
}
```

先看默认行为的坑：MyBatis 默认用 `EnumTypeHandler`，把枚举存成 **name 字符串**（"PENDING"）——DBA 与历史数据约定的是数字 code，写入直接错位。换 `EnumOrdinalTypeHandler` 存序号（0,1,2...）也不行：枚举值一调整顺序，历史数据全错位。正解是自定义 handler：

```java
@MappedTypes(OrderStatus.class)
public class OrderStatusHandler extends BaseTypeHandler<OrderStatus> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i,
                                    OrderStatus parameter, JdbcType jdbcType) throws SQLException {
        ps.setInt(i, parameter.getCode());          // 写：code 入库
    }

    @Override
    public OrderStatus getNullableResult(ResultSet rs, String columnName) throws SQLException {
        int code = rs.getInt(columnName);
        return rs.wasNull() ? null : OrderStatus.of(code);   // 读：code 还原
    }

    @Override
    public OrderStatus getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        int code = rs.getInt(columnIndex);
        return rs.wasNull() ? null : OrderStatus.of(code);
    }

    @Override
    public OrderStatus getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        int code = cs.getInt(columnIndex);
        return cs.wasNull() ? null : OrderStatus.of(code);
    }
}
```

**讲解：**

1. `BaseTypeHandler` 已经处理了 null 入库（setParameter 里判 null 后 setNull），子类只需要实现 `setNonNullParameter` 与三个 `getNullableResult`——**读侧的 null 判断要自己做**：`rs.getInt` 拿不到 null（返回 0），必须 `rs.wasNull()` 区分"真的是 0"与"是 NULL"。这是泛型 handler 最经典的 null 陷阱。
2. `OrderStatus.of(code)` 要对未知 code 有明确策略：抛异常（快速暴露脏数据）还是返回 null（静默容忍）——**建议抛**，非法状态码在读取时暴露好过在业务逻辑深处 NPE。
3. 更工程化的写法是让 handler 泛型化：定义 `interface CodeEnum { int getCode(); }`，写一个 `CodeEnumTypeHandler<E extends CodeEnum>` 通吃所有 code 枚举，每个枚举再单独注册——注册处把枚举类与 handler 绑定即可，逻辑只写一遍。
4. MyBatis-Plus 用户注意：MP 对枚举有自己的通道（`@EnumValue` 注解直接标 code 字段，自动扫描），效果与本节 handler 等价——用 MP 的项目优先 @EnumValue，原理仍是 TypeHandler。

## 3. 场景二：对象存 JSON 列

用户收货地址是复杂对象，数据库列是 JSON 字符串（MySQL 的 json 列或 text）：

```java
@MappedTypes(Address.class)
@MappedJdbcTypes(JdbcType.VARCHAR)
public class AddressJsonHandler extends BaseTypeHandler<Address> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i,
                                    Address parameter, JdbcType jdbcType) throws SQLException {
        try {
            ps.setString(i, MAPPER.writeValueAsString(parameter));   // 对象 -> JSON 字符串
        } catch (JsonProcessingException e) {
            throw new SQLException("Address 序列化失败", e);
        }
    }

    @Override
    public Address getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return parse(rs.getString(columnName));
    }
    // 另两个 getNullableResult 同构，略

    private Address parse(String json) throws SQLException {
        if (json == null || json.isBlank()) return null;
        try {
            return MAPPER.readValue(json, Address.class);
        } catch (JsonProcessingException e) {
            throw new SQLException("Address 反序列化失败：" + json, e);
        }
    }
}
```

**讲解：**

1. 写侧把对象序列化成 JSON 字符串再 setString，读侧反向 parse——本质是"借 String 通道运送复杂对象"。
2. 序列化失败的异常策略与枚举不同：脏 JSON 数据在读取时**抛 SQLException 包一层**，让上层明确看到"数据坏了"，而不是返回半残对象。
3. 静态共享 ObjectMapper：反序列化器线程安全、构建昂贵，做成 handler 内 static 单例；每请求 new ObjectMapper 是性能事故。
4. 适用边界：**查询时不需要按 JSON 内部字段过滤**的附属数据（收货地址快照、扩展配置）适合 JSON 列；需要按地址查询（如按省统计），就该拍平成列或关联表——JSON 列上建函数索引是补丁不是设计（050 建模篇的原则在此同样成立）。

## 4. 场景三：时间字段与时区

多时区报表系统：库里存 UTC，Java 层用带时区语义的时间对象展示。

```java
@MappedTypes(OffsetDateTime.class)
public class UtcOffsetDateTimeHandler extends BaseTypeHandler<OffsetDateTime> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i,
                                    OffsetDateTime parameter, JdbcType jdbcType) throws SQLException {
        // 统一转 UTC 入库（数据库连接时区漂移也挡得住）
        ps.setTimestamp(i, Timestamp.from(parameter.toInstant()));
    }

    @Override
    public OffsetDateTime getNullableResult(ResultSet rs, String columnName) throws SQLException {
        Timestamp ts = rs.getTimestamp(columnName);
        return ts == null ? null : ts.toInstant().atOffset(ZoneOffset.UTC);   // 读出按 UTC 解释
    }
    // 另两个 getNullableResult 同构，略
}
```

**讲解：**

1. 时区问题的根源是"时间值 + 解释时区"分离：同一列被不同时区的连接读出不同结果。handler 的价值是**把解释权固定在代码里**（入库转 UTC、读出按 UTC），不依赖 JDBC 连接串的 serverTimezone 配置漂移。
2. 内置的 LocalDateTime-TIMESTAMP 映射对"无时区语义"场景够用（单一时区的国内业务）；只有多时区、跨机房、对账精确到毫秒的系统才值得自定义时间 handler——不要为不存在的需求引入复杂度。
3. 一个容易被忽略的精度坑：MySQL DATETIME 精确到秒、TIMESTAMP(3) 到毫秒——列精度低于 Java 类型时数据静默截断，报表对账时"差 500 毫秒"的怪案多源于此。

## 5. 注册：全局生效与局部指定

```yaml
# Spring Boot 方式一：包扫描（handler 类上要带 @MappedTypes）
mybatis:
  type-handlers-package: com.example.order.typehandler
```

```xml
<!-- 方式二：mybatis-config.xml 逐个注册 -->
<typeHandlers>
  <typeHandler handler="com.example.order.typehandler.OrderStatusHandler"/>
</typeHandlers>
```

```xml
<!-- 方式三：resultMap 局部指定（不经全局注册） -->
<resultMap id="orderMap" type="Order">
  <result column="status" property="status"
          typeHandler="com.example.order.typehandler.OrderStatusHandler"/>
  <result column="ship_addr" property="address"
          typeHandler="com.example.order.typehandler.AddressJsonHandler"/>
</resultMap>
```

**讲解：**

1. **全局注册的副作用要想清楚**：注册后，所有命中 `@MappedTypes` 的字段读写都走这个 handler——包括你没预料到的语句。地址 JSON handler 全局注册后，任何 resultMap 里的 Address 字段都自动走 JSON 转换，这对"约定统一的场景"是便利，对"同名类型不同语义"的场景（同为 String，一列存 JSON 一列存普通文本——用 @MappedJdbcTypes 区分）是暗雷。
2. 判断准则：**类型与存储形态一一对应（枚举存 code）用全局；同名类型多形态（String 当 JSON 用）用 resultMap 局部指定**。全局注册前 grep 一遍该类型的所有 mapper 语句，确认没有例外。
3. 包扫描生效的前提是 handler 类上有 @MappedTypes（声明它管什么 Java 类型）；漏了注解时扫描注册静默不生效，症状是"行为像没注册一样"——排查先查注解。
4. XML 里写 handler 的全限定类名没有编译期检查，类挪包后启动即报错——这是显式注册的代价，也是它的好处（错误在最早期暴露）。

## 6. 三个真实场景

**场景一：订单状态枚举落库（真实工程形态）。** 电商订单表的 status 列 smallint，全链路（下单、支付回调、发货）都传枚举。CodeEnum 接口 + 泛型 handler 一处实现，五个枚举（订单状态、支付方式、售后类型...）各自一行注册。踩过的坑：早期用 EnumOrdinalTypeHandler，某次重构在枚举中间插了一个状态值，全表历史数据语义错位——事故复盘的结论就是"code 显式指定，序号隐式靠位次"这条铁律。

**场景二：用户地址对象存 JSON 列（快照语义）。** 订单表的收货地址是下单时刻的快照（用户后来改地址不影响历史订单），拍平成列会让订单表宽到没法维护，选择 JSON 列 + handler。读取侧配合 040 篇的 resultMap 一次性还原对象；报表侧偶发的"按省统计订单量"走 JSON 函数索引 + 聚合——慢但频次低，可接受。这个场景的边界判断（什么进 JSON、什么拍平）就是 050 建模篇的活教材。

**场景三：多时区报表系统的时间字段。** 跨国报表系统：采集端在东八区写入本地时间字符串、分析端在 UTC 对账，历史数据两种口径混存。治理方案：新数据统一 OffsetDateTime + UTC handler 入库（连接串的 serverTimezone 只做兜底），存量数据写迁移脚本按口径转换。handler 在这里的角色是"把时区纪律固化进持久层"，让业务代码再也碰不到裸 Timestamp。

## 7. 动手实践

**任务一：看穿默认枚举行为。** 用默认配置写一条插入枚举字段的语句，查看数据库里实际存的值（应为 name 字符串）；换 EnumOrdinalTypeHandler 再插一条（应为序号）；最后写自定义 handler 存 code。三种形态各插一行，肉眼对比列值。提示：log-impl 打开，观察参数行 `Parameters: PENDING(String)` 与 `Parameters: 1(Integer)` 的差别。

**任务二：JSON handler 往返验证。** 实现 AddressJsonHandler，插入含地址的订单再查出，断言对象字段全等；然后手工把数据库里的 JSON 改坏（删个引号），再查，验证异常路径的报错信息可定位。提示：往返测试覆盖"写->读"即可，反序列化失败路径用脏数据构造，不必 mock。

**任务三：注册方式的边界实验。** 先用 resultMap 局部指定方式接上 OrderStatusHandler，确认仅该语句生效；再改成包扫描全局注册，检查其余含该枚举的注解 SQL（@Select）是否也自动生效；最后把 @MappedTypes 注解删掉观察全局注册静默失效的现象。提示：注解 SQL 同样走全局 handler——全局注册的影响面比 resultMap 大得多，这就是注册前 grep 语句的原因。

先自己操作，再对照参考实现：

<details>
<summary>任务一参考实现（泛型 code 枚举 handler）</summary>

```java
// 通吃接口：所有"存 code"的枚举实现它
public interface CodeEnum {
    int getCode();
}

// 泛型 handler：逻辑只写一遍
public class CodeEnumTypeHandler<E extends Enum<E> & CodeEnum>
        extends BaseTypeHandler<E> {

    private final Class<E> type;
    private final Map<Integer, E> byCode;

    public CodeEnumTypeHandler(Class<E> type) {
        this.type = type;
        this.byCode = new HashMap<>();
        for (E e : type.getEnumConstants()) {
            byCode.put(e.getCode(), e);        // 构建时校验 code 唯一，重复直接抛错
        }
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, E parameter,
                                    JdbcType jdbcType) throws SQLException {
        ps.setInt(i, parameter.getCode());
    }

    @Override
    public E getNullableResult(ResultSet rs, String columnName) throws SQLException {
        int code = rs.getInt(columnName);
        return rs.wasNull() ? null : require(code);
    }
    // 另两个 getNullableResult 同构，略

    private E require(int code) {
        E e = byCode.get(code);
        if (e == null) {
            throw new IllegalStateException(type.getSimpleName() + " 未知 code: " + code);
        }
        return e;
    }
}

// 注册：XML <typeHandler handler="...OrderStatusHandler"/> 指向
// 一个 OrderStatus 专用的薄子类，或在 mybatis-config 的 typeHandlers 里
// 用 <typeHandler javaType="OrderStatus" handler="..."/> 绑定。
```

要点：a) 泛型化后每个枚举只需"实现 CodeEnum + 一行注册"，逻辑零重复；b) 构建时校验 code 唯一性，把"两个枚举值同 code"的写法错误挡在启动期；c) 未知 code 抛 IllegalStateException 而不是返回 null——脏数据在读取点立即暴露，这条策略要与任务一的三种形态对比着理解。
</details>

## 8. 一句话记住

> TypeHandler 是"Java 类型 <-> JDBC 列"的翻译官：枚举存 code（别用序号，重构即灾难）、对象存 JSON（static ObjectMapper、脏数据抛异常）、时区纪律固化进 handler（入库转 UTC）；全局注册管"一一对应"，resultMap 局部指定管"同名多态"，泛型 handler 的 null 读侧必须 rs.wasNull()。

## 官方文档

- MyBatis 官方文档 Type Handlers 章节：https://mybatis.org/mybatis-3/zh/configuration.html#typeHandlers （CC 授权）

## 自检

1. 默认 EnumTypeHandler 存什么？为什么 EnumOrdinalTypeHandler 是"看似省事实则埋雷"？
2. BaseTypeHandler 的 null 策略：写侧与读侧分别由谁负责？rs.wasNull() 防的是什么？
3. 全局注册与 resultMap 局部指定的适用边界？"同名类型不同存储形态"该用哪种？
4. 包扫描注册静默失效最常见的原因是什么？
5. 什么样的字段适合 JSON 列 + handler？什么样的需求出现时应该回头拍平成列？
