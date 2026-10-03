---
order: 70
title: MyBatis-Plus 单表 CRUD：免掉六成体力活，不动 SQL 主权
description: 以「每张表五套 XML 的单表体力税」引入：只做增强不做改变的定位、注解三件套与 IdType 选型表、BaseMapper 单表五连、LambdaQueryWrapper 的编译期列名检查与 condition 动态条件，附零 XML 跑通单表与动态条件 SQL 对照两个实验。
module: 'mybatis'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'mybatis/020-QuickStartCrud'
  - 'mybatis/030-DynamicSql'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'mybatis/040-ResultMapping'
  - 'mybatis/080-MybatisPlusAdvanced'
---

## 前置知识

- [快速上手 CRUD](/mybatis/020-QuickStartCrud)：写过至少一个 Mapper 接口与对应 XML——没读过也能跟，把它当成「会建一个最简 MyBatis 工程」即可；
- [动态 SQL](/mybatis/030-DynamicSql)：见过 if、where 这些动态标签——没读过也能跟，第 5 节有逐项对照表。

## 学习目标

读完本文你将能够：

1. 说清 MP「只做增强不做改变」的边界，判断一个需求该走 Wrapper 还是回 XML；
2. 完成 MP 接入，避开与官方启动器同引的静默冲突坑；
3. 用注解三件套完成实体映射，按场景给 @TableId 选对 IdType；
4. 用 BaseMapper 跑通单表增删改查，全程零 XML；
5. 用 LambdaQueryWrapper 写出带动态条件、编译期检查列名的查询，并说清 updateById 与显式置 null 的分野。

预计 40 分钟。

## 1. 你现在要解决什么问题

盘点持久层的代码构成你会发现：单表 CRUD 占了六成上下。每张表五套模板——insert、deleteById、updateById、selectById、按条件 selectList——逻辑雷同，字段却要一个一个对着 XML 敲，改一个字段要同步三处。这就是体力税：不产生思考、只产生 typo。MyBatis-Plus（下称 MP）的答案一句话：**单表不写 SQL，复杂 SQL 照旧写**。它不另起炉灶造 ORM，而是在你现有的 MyBatis 工程上叠一层：单表模板自动生成，条件拼装从 XML 搬进 Java，多表 JOIN、复杂子查询仍然回到 030 的 XML 手艺。本篇立住这个定位，跑通零 XML 的单表全流程，并把条件构造器——MP 的日常主力——练熟。

## 2. 准备现场：选对启动器，认全三注解

依赖选 mybatis-plus-spring-boot3-starter（Spring Boot 3 专用坐标，以 3.5.12 为例）：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
    <version>3.5.12</version>
</dependency>
```

第一个坑就在选坐标：**官方 mybatis-spring-boot-starter 与 MP 启动器不要同时引入**。两者都试图装配 SqlSessionFactory 一套 Bean，谁生效取决于装配顺序，另一方静默失效——不报错才是这类坑的可怕之处，症状往往是「MP 的方法找不到」或「配置不生效」这类薛定谔现场。

配置前缀换成 mybatis-plus:（不是 mybatis:），@MapperScan 照旧：

```yaml
mybatis-plus:
  mapper-locations: classpath*:mapper/**/*.xml      # 复杂 SQL 的 XML 照常放
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

实体注解三件套：

```java
@TableName("products")                    // 表名映射；类名驼峰转下划线一致时可省
public class Product {

    @TableId(type = IdType.AUTO)          // 主键；IdType 选型见下表
    private Long id;

    private String name;                  // 驼峰自动映射，user_name 同理
    private Integer stock;
    private BigDecimal price;
    private Integer status;
    private String remark;

    @TableField(exist = false)            // 非表字段：不参与任何 SQL 生成
    private String keyword;

    // getter/setter 略
}
```

@TableId 的 IdType 选型表：

| IdType | 谁生成 ID | 什么时候选 |
| --- | --- | --- |
| AUTO | 数据库自增列，插入后回填实体 | 单库单表，ID 顺序即插入顺序 |
| ASSIGN_ID | MP 内置雪花算法，应用侧生成 | 多实例部署、未来可能分库分表 |
| INPUT | 你手动赋值 | 业务号即主键的明确设计 |
| 不配置 | 跟随全局默认（ASSIGN_ID） | 拿不准就用默认 |

选型一句话：确定单库且要 ID 直观，AUTO；只要有一丝分库分表的可能，ASSIGN_ID 提前铺路——自增 ID 跨库合并是灾难现场，雪花 ID 天然全局唯一、不依赖数据库发号。

@TableField 两个高频用途：value 指定列名（列名不符合驼峰转换规则时）；exist = false 标记非表字段（查询条件中转、组装展示字段）。忘了标 exist，MP 会把不存在的列拼进 SQL，然后报 Unknown column——报错位置离出错原因十万八千里，值得记住这条线索。

## 3. 心智模型：只做增强不做改变

MP 官方口号「只做增强，不做改变」值得逐字拆。不做改变：引入后，020 的 Mapper 接口与注解、030 的动态 SQL、040 的 resultMap 全部照常工作，存量 XML 一行不用动。只做增强：增量提供 BaseMapper（单表模板）、条件构造器（条件拼装），以及后两篇的分页、乐观锁等插件。与 Spring Data JPA 的取舍差异一句话：JPA 以对象图为中心、SQL 由框架推导，MP 保住 SQL 的掌控权——你仍然决定每条语句长什么样，只是单表那些不值得手写的语句不用再写。

实现上的真相让它显得不魔法：BaseMapper 的那些方法不是运行时字节码戏法，而是 MP 启动时按实体元数据动态注册成一条条 MappedStatement——020 讲的 statement 机制原封未动，只是「写 XML」这道工序被自动化了。理解了这一点，后面所有特性（注入的自定义方法、逻辑删除自动拼条件）都不会显得玄。所以第 2 节那套接入做完，你得到的是一个「MyBatis 加了挂件」的熟悉工程，而不是一个新框架。

## 4. BaseMapper 全家桶：单表五连零 XML

Mapper 只剩继承：

```java
@Mapper
public interface ProductMapper extends BaseMapper<Product> {
    // 单表方法一个都不用写；复杂 SQL 的方法照常加 @Select 或 XML
}
```

单表五连：

```java
Product p = new Product();
p.setName("机械键盘");
p.setStock(100);
p.setPrice(new BigDecimal("129.00"));
productMapper.insert(p);                        // AUTO 下自增 id 回填 p.getId()

productMapper.deleteById(1L);                   // 删

p.setStock(99);
productMapper.updateById(p);                    // 改：null 字段不进 SET（第 6 节细说）

Product loaded = productMapper.selectById(1L);  // 查单条

List<Product> onSale = productMapper.selectList(
        Wrappers.<Product>lambdaQuery().eq(Product::getStatus, 1));   // 查列表
```

updateById 的「null 不更新」在 SQL 里长这样，StdOutImpl 可以作证：

```text
UPDATE products SET stock = ? WHERE id = ?
-- remark 与 price 为 null，压根没进 SET 子句
```

还有两个值得点名的方法。selectCount 统计行数；selectMaps 返回 List 形式的 Map 集合——实体路线永远带全字段，列表页只要两列时用它配合 select 指定列，行更窄、传输更少（这个「列裁剪」的意识在 090 会变成事故复盘的主角）：

```java
List<Map<String, Object>> idAndName = productMapper.selectMaps(
        Wrappers.<Product>lambdaQuery()
                .select(Product::getId, Product::getName)
                .eq(Product::getStatus, 1));
```

## 5. 本篇核心：条件构造器，从字符串列名到 Lambda

单表查询真正的心智负担在「条件拼装」，这就是 Wrapper 的地盘。先看字符串版：

```java
QueryWrapper<Product> qw = new QueryWrapper<>();
qw.eq("stauts", 1);       // 列名手滑：编译器沉默，运行时 Unknown column 才爆
```

隐患两个字：列名是裸字符串，改名、手滑、拼写错误全靠运行时兜底。Lambda 版把列名锁进方法引用：

```java
LambdaQueryWrapper<Product> qw = Wrappers.<Product>lambdaQuery()
        .eq(Product::getStatus, 1);
```

MP 从实体的 getter 反推列名——收益两点：编译期检查（列不存在直接红）与重构安全（IDE 重命名跟随）。日常一律 Lambda 版。

常用条件方法速查，方法名即 SQL 关键词：

```text
eq / ne                    等于 / 不等于
gt / ge / lt / le          大于、大于等于、小于、小于等于
like / likeLeft / likeRight    模糊匹配（likeLeft 是前缀通配 %x，会废索引，慎用）
in / notIn                 集合成员判断
between                    闭区间
orderByAsc / orderByDesc   排序，可叠加多列
```

命名规则一句话：条件方法是「列引用、值」两参，condition 重载在最前面多一个布尔。

动态条件是 Wrapper 的杀手锏。030 里「参数为空就不拼条件」要写动态标签，这里是一个布尔参数：

```java
public List<Product> search(ProductQuery req) {
    return productMapper.selectList(
            Wrappers.<Product>lambdaQuery()
                    .like(StringUtils.hasText(req.getKeyword()), Product::getName, req.getKeyword())
                    .le(req.getMaxPrice() != null, Product::getPrice, req.getMaxPrice())
                    .in(!req.getIds().isEmpty(), Product::getId, req.getIds())
                    .orderByDesc(Product::getCreatedAt));
}
```

第一个布尔参数为 false，该条件整段不拼。与 030 的 XML 逐项对照：

| 需求 | XML 写法（030） | Wrapper 写法 |
| --- | --- | --- |
| 条件可选 | if 标签判空 | like(hasText(k), ...) |
| 多值 in | foreach 遍历 | in(Product::getId, ids) |
| 区间 | between 标签或手写 | between(Product::getPrice, min, max) |
| 排序 | ORDER BY 静态或动态拼接 | orderByDesc(Product::getCreatedAt) |
| 复杂嵌套分组 | where/or 自由组合 | and(w -> w.eq(...).or().eq(...))，可写但可读性下降 |

边界纪律一句话：单表、条件可枚举，Wrapper 赢；多表 JOIN、子查询、数据库方言函数满天飞，回 XML。同一工程两者共存是常态，不是妥协。

最后一颗雷：last 与 apply 是 Wrapper 里仅有的两个原样拼接口。

```java
qw.last("LIMIT 1");                        // 字符串原样拼在 SQL 末尾
qw.apply("date(created_at) = {0}", day);   // {0} 参数化，安全
```

用户输入直接进 last 就是 SQL 注入；apply 记得用 {0} 占位而不是字符串拼接。能用 eq、le、between 表达的条件，别碰这两个口子。

## 6. update 的两种姿势与 selectOne 的纪律

updateById 有一个默认语义要先说破：**实体里为 null 的字段不进 SET 子句**（默认更新策略 NOT_NULL）。「只想改 status」就 new 一个只带 id 和 status 的实体——正中下怀；「想把 remark 清空」却被同一语义挡住——SET 里根本没有 remark，永远清不掉。

显式置空走 UpdateWrapper：

```java
productMapper.update(null,
        Wrappers.<Product>lambdaUpdate()
                .set(Product::getRemark, null)      // 强制写进 SET
                .eq(Product::getId, 1L));
```

一张表收口：

| 意图 | 写法 | 依据 |
| --- | --- | --- |
| 部分更新，null 不动 | updateById（只带部分字段的实体） | null 不进 SET |
| 清空某列 | update 加 set(field, null) | 显式进 SET |
| 按条件批量更新 | update(null, lambdaUpdate().set(...).eq(...)) | 条件不在主键上 |

selectOne 的坑属于「以为唯一、实际不唯一」：手机号查用户，脏数据一来两条，接口直接抛 TooManyResultsException。防线三层：语义上想清楚唯一性，数据库唯一索引兜底；拿不准就 selectList 后取第一条；确要单条且怕脏数据，last("LIMIT 1")（记得上一节的注入警示）。

## 7. 实验

实验一：单表零 XML 跑通。建 products 表（id 自增主键、name、stock、price、status、remark、created_at），写实体与 BaseMapper，把第 4 节五连各跑一遍。验收三条：insert 后实体 id 被回填；updateById 后看 StdOutImpl 的 SQL，SET 子句里只有非 null 列：

```text
==>  Preparing: UPDATE products SET stock = ? WHERE id = ?
```

以及最重要的一条：全程没有创建任何 XML 文件。

实验二：动态条件看 SQL 现形。打开 log-impl，跑第 5 节的 search 两次：keyword 传 null 与传「键盘」各一次，对比控制台两条 SQL——第一条没有 LIKE 子句，第二条有且参数占位清晰可数。再把 keyword 换成含单引号的字符串跑一次，确认它是预编译参数传值而不是拼接，顺手体会 Wrapper 默认的注入安全面。

## 自检

遮住上文与代码，凭记忆回答；答不出的回到对应小节重读。

1. 「只做增强不做改变」体现在哪？BaseMapper 的方法在框架内部是什么机制、由谁注册？
2. 官方启动器与 MP 启动器同引会发生什么？为什么这类坑格外难排查？
3. IdType 的 AUTO 与 ASSIGN_ID 分野是什么？出现什么信号必须换后者？
4. LambdaQueryWrapper 比字符串版强在哪两点？它靠实体的什么信息反推列名？
5. condition 布尔参数解决的是哪个老问题？与 030 的动态标签是什么关系？
6. updateById 遇到实体里的 null 字段是什么行为？想清空一列用哪个 API？批量按条件更新呢？
7. selectOne 的风险与三道防线分别是什么？
8. last 与 apply 的注入风险差异在哪？安全的 apply 怎么写？
