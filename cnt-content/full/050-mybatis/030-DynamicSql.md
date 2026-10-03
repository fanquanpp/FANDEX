---
order: 30
title: 动态 SQL：让 SQL 随条件生长，而不是被字符串拼接
description: 以「商品列表 8 个筛选项任意组合，手拼 SQL 的三宗罪」引入：if、where、choose、set、foreach、sql 与 trim 逐个拆解，0 值被吞与空集合 IN () 两大经典坑，附 6 条件开合实验与打印 SQL 对照。
module: 'mybatis'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'mybatis/020-QuickStartCrud'
  - 'mysql/110-SQLDataOperationQuery'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'mybatis/040-ResultMapping'
  - 'mybatis/090-PitfallsPerformance'
---

## 前置知识

- [快速上手](/mybatis/020-QuickStartCrud)：会搭 MyBatis 工程、知道 XML 靠 namespace 加 id 对上接口方法、记得 #{ } 与 ${ } 的分水岭——没读过也能跟，用到时会现场指路；
- [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会写带 WHERE、ORDER BY、IN 的查询。

## 学习目标

读完本文你将能够：

1. 说清手拼 SQL 的三宗罪，以及 where 1 = 1 这句祖传代码的历史成因；
2. 用 if 表达可选条件，避开字符串双判、数字 0 值、XML 转义三个坑；
3. 用 where、set 两个标签替代手剥首尾连接符，说出它们各自的剥离规则；
4. 用 choose 写互斥分支，并用它给 ${} 做白名单；
5. 用 foreach 写 IN 查询与批量插入，防御空集合的 IN () 语法错误；
6. 用 sql 与 include 复用片段，理解 where 与 set 都是 trim 的预制模板；
7. 对任意组合条件，预测打印出来的 SQL 长什么样。

预计 45 分钟，需要一个能跑的 MyBatis 工程与控制台日志。

## 1. 你现在要解决什么问题

商品列表页的需求总会长成这样：关键词、分类、品牌、价格区间、状态……八个筛选项，任意组合，任意留空。上一模块的 JDBC 写法你已经领教过：StringBuilder 起手 `WHERE 1 = 1`，然后每个条件一段 if，手剥每个条件开头的 AND。这套手艺有三宗罪。其一，**「第一个条件」问题**：WHERE 后面第一个 AND 是语法错误，于是前辈们发明了恒真垫底 `1 = 1`——它不改变查询语义，却让每个条件都能理直气壮地以 AND 开头。这句祖传代码从纯 JDBC 时代活到今天，活下来的原因不是性能（现代优化器会消除它），而是省掉了「我是不是第一个条件」的判断。其二，**空值判断靠人肉**：哪个判 null、哪个还要判空串，全凭记忆，漏一个分支就是 `LIKE '%%'` 的全表模糊。其三，**IN 列表的逗号与括号**：手写循环拼 `id IN (?, ?, ?)`，多一个少一个逗号都是运行期才炸的语法错误。

动态 SQL 标签的任务，就是把这三宗罪的判断逻辑从你的手里收走。你的 XML 里写的不再是「拼好的 SQL」，而是「SQL 的生长规则」——条件在，子句就在；条件不在，子句干净消失。

## 2. 准备现场：一张带维度的商品表

在 020 篇的 shop 库里换成带筛选维度的表，日志开关沿用 StdOutImpl：

```sql
USE shop;
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_name VARCHAR(100)  NOT NULL,
  category     VARCHAR(30)   NOT NULL,
  brand        VARCHAR(30)   NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  status       TINYINT NOT NULL COMMENT '0 下架 1 在售',
  stock        INT NOT NULL DEFAULT 0
);

INSERT INTO products (product_name, category, brand, price, status, stock) VALUES
  ('机械键盘 K870', '外设', 'Keychron', 329.00, 1, 50),
  ('游戏鼠标 G502', '外设', '罗技',     199.00, 1, 120),
  ('27 寸显示器',   '显示', 'AOC',      899.00, 1, 30),
  ('机械键盘 K380', '外设', '罗技',     149.00, 0, 0);
```

查询对象把八个筛选项收拢成一个类型（这就是 020 篇说「POJO 优于 Map」的那个查询对象）：

```java
public class ProductQuery {
    private String keyword;        // 商品名模糊
    private String category;
    private String brand;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Integer status;
    private String orderBy;        // 排序三选一：priceAsc / priceDesc / 留空
    // getter/setter 略
}
```

接口只留一个签名，SQL 全部住在 XML 里（mapper-locations 指到 classpath*:mapper/*.xml）：

```java
@Mapper
public interface ProductMapper {

    List<Product> search(ProductQuery query);
}
```

## 3. if：条件在，子句在

XML 文件 `src/main/resources/mapper/ProductMapper.xml` 的骨架与 DOCTYPE 头按 020 篇的 namespace 规则写。先把查询的主体摆出来，六个可选条件各配一个 if：

```xml
<select id="search" resultType="com.example.shop.entity.Product">
    SELECT id, product_name, category, brand, price, status, stock
    FROM products
    <where>
        <if test="keyword != null and keyword != ''">
            AND product_name LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="category != null and category != ''">
            AND category = #{category}
        </if>
        <if test="brand != null and brand != ''">
            AND brand = #{brand}
        </if>
        <if test="minPrice != null">
            AND price &gt;= #{minPrice}
        </if>
        <if test="maxPrice != null">
            AND price &lt;= #{maxPrice}
        </if>
        <if test="status != null">
            AND status = #{status}
        </if>
    </where>
</select>
```

test 属性里是一个 OGNL 表达式——可以直接引用入参对象的属性，支持比较与逻辑运算。三个必懂的坑藏在里面。

**坑一：字符串要双判。**null 是「没传」，空串是「传了但为空」，两个世界。只判 null，前端传个空字符串过来，条件照常拼上去，`LIKE '%%'` 匹配所有行——全表模糊。所以字符串类型写全 `!= null and != ''`。

**坑二：非字符串只判 null，别学字符串。**有初学者顺手给 Integer status 也补上 `status != ''`，然后「筛选下架商品」永远查空——status 为 0 时条件神秘消失。成因：比较数字与字符串时，OGNL 会把空串折算成数值参与比较，0 与空串判等的旧历史让 0 被当成「空值」吞掉。这一行为与 OGNL 版本有关，新版已调整，但海量存量旧项目仍踩在这个坑里。纪律与版本无关：**字符串双判，非字符串只判 null。**

**坑三：XML 里的比较符要转义。**`>=` 写成 `&gt;=`、`<=` 写成 `&lt;=`，因为 XML 里裸写 `<` 会把后面的文本当标签解析。嫌转义难看，可以整段包进 `<![CDATA[ ]]>`，两种写法等效。

## 4. where：自动剥头，空条件不出现

上面 SQL 里的 <where> 标签干了两件事：内容非空时，插入 WHERE 关键字，并把**开头**多余的 AND 或 OR 剥掉；所有条件都缺席时，连 WHERE 一起消失——生成的是不带任何过滤的全表查询。对照第 1 节：1 = 1 解决的「第一个条件」问题，被「自动剥头」干净接管；而 1 = 1 的额外副作用（无条件时 WHERE 依然存在）也被顺手治好。

注意剥离规则的边界：<where> 只剥**开头**的 AND/OR，条件中间的 AND 它一个不碰——所以每个 if 内部都以 AND 开头是纪律，不是可选项。

## 5. choose、when、otherwise：互斥分支，兼做白名单

if 是「都满足就都拼」，还有一类需求是**多选一**：排序方式三选一，永远只生效一个。用 <choose>：

```xml
<choose>
    <when test="orderBy == 'priceAsc'">ORDER BY price ASC</when>
    <when test="orderBy == 'priceDesc'">ORDER BY price DESC</when>
    <otherwise>ORDER BY id DESC</otherwise>
</choose>
```

语义就是 switch-case：命中第一个成立的 when，跳过其余；全不命中走 otherwise。这个结构同时兑现了 020 篇的承诺——ORDER BY 字段属于只能用 ${} 的结构位，而结构位必须白名单：把合法值枚举进 when，其他一切输入都落进 otherwise 的默认排序，注入无从下手。

顺带钉一个 OGNL 的小坑：单引号包**单个字符**时（`test="type == 'A'"`），OGNL 把它当 char 而不是 String，与 String 属性比较永远为 false。多字符无此问题；单字符要么外层属性用单引号、内层换双引号（`test='type == "A"'`），要么拿不准就用多字符取值。

## 6. set：update 的动态列与「清不空」的边界

部分更新的需求与查询同理：前端改了哪个字段就更新哪个。手写 UPDATE 的问题在**尾部**——最后一个字段后面的逗号是语法错误。<set> 与 <where> 对称，剥的是尾部：

```xml
<update id="updateSelective">
    UPDATE products
    <set>
        <if test="productName != null and productName != ''">product_name = #{productName},</if>
        <if test="price != null">price = #{price},</if>
        <if test="stock != null">stock = #{stock},</if>
    </set>
    WHERE id = #{id}
</update>
```

<set> 的规则：内容非空时插入 SET 关键字、剥掉最后一个逗号。于是自然长出 **null 即不更新**的部分更新语义——传了 price 只改价格，其余字段原样保留。这是工程里「编辑表单只提交改动项」的标准实现。

但边界要自己心里有数：**这套写法永远没法把字段更新为 NULL**——null 被 if 挡在门外，「不传」与「清空」在协议上是同一个意思。真要支持清空，两条路：为该场景写一条显式全量更新；或在接口层区分「不传」与「传空哨兵」。另外全空入参（一个字段都没传）会生成 `UPDATE products WHERE id = ?` 的语法错误，<set> 不会替你兜底，调用侧要保证至少改动一个字段。

## 7. foreach：IN 查询与批量插入

集合型参数交给 <foreach>。先看最常用的 IN 查询：

```xml
<select id="selectByIds" resultType="com.example.shop.entity.Product">
    SELECT id, product_name, price FROM products
    WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</select>
```

六个属性各司其职：collection 指定数据源（参数名，靠 @Param 起的名字；不给参数加 @Param 时 List 的默认名规则以官方文档为准——工程纪律是**永远显式 @Param**，不赌默认名）；item 是每轮元素的变量名，供 #{} 取值；index 是下标（或 Map 的键）；open、close、separator 分别是首尾包裹符与元素分隔符。三宗罪之三「逗号与括号」就此收编。

**空集合是 foreach 的头号坑**：ids 传空列表，生成 `WHERE id IN ()`——数据库直接语法错误。防御两层：最优在调用方短路，空集合直接返回空结果，连 SQL 都不发；SQL 层用 if 包住整个条件（或空时给出恒假条件如 `AND 1 = 0`），保证语法永远合法。

<foreach> 的第二大用途是批量插入，注意 VALUES 写法的拼接位置（接口参数按纪律起显式名字：@Param("products")）：

```xml
<insert id="batchInsert" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO products (product_name, category, brand, price, status, stock) VALUES
    <foreach collection="products" item="p" separator=",">
        (#{p.productName}, #{p.category}, #{p.brand}, #{p.price}, #{p.status}, #{p.stock})
    </foreach>
</insert>
```

批量还有第二种写法——foreach 拼**多条以分号分隔的 INSERT**。它需要 JDBC URL 加 `allowMultiQueries=true`（驱动默认禁止一次发多条语句，安全考虑），一般不如多值 VALUES 干净。多值法也有天花板：SQL 文本长度受 MySQL 的 max_allowed_packet 约束，几万行要切段分批——批处理这条线的深挖归 090 篇，此处埋个路标。

## 8. sql 与 include：片段复用

列清单越长，越经不起每个查询抄一遍。<sql> 定义片段，<include> 引用：

```xml
<sql id="baseColumns">
    id, product_name, category, brand, price, status, stock
</sql>

<select id="search" resultType="com.example.shop.entity.Product">
    SELECT <include refid="baseColumns"/> FROM products
    ...
</select>
```

表加一列，改一处全局生效。<include> 还支持给片段传 <property>，片段内用占位符接收，可做「同一片段、不同表别名」的参数化复用——细节以官方文档为准，知道有这能力即可。

## 9. trim：where 与 set 都是它的预制模板

学到这里可以掀开底牌：<where> 与 <set> 并不神秘，它们是 <trim> 的两个特例：

```text
<where>  等价于  <trim prefix="WHERE" prefixOverrides="AND |OR ">
<set>    等价于  <trim prefix="SET"   suffixOverrides=",">
```

trim 的语法三件套：prefix 是内容非空时加在前面的关键字；prefixOverrides 是要剥掉的**开头**文本（注意 AND 后面那个空格是规则的一部分）；suffixOverrides 是要剥掉的**结尾**文本。<where> 剥头加 WHERE，<set> 剥尾加 SET——一个底座，两块预制模板。哪天你需要「给子查询加括号」「给条件加 EXISTS 前缀」这类自定义包装，直接手写 trim，不必等框架出 seventh 个标签。

## 10. 实验：六个条件逐个开合

写个入口，每次只动 ProductQuery 的字段，对照控制台的打印：

```java
ProductQuery q = new ProductQuery();
q.setKeyword("键盘");
q.setMinPrice(new BigDecimal("100"));
q.setOrderBy("priceAsc");
List<Product> list = productMapper.search(q);
```

```text
==>  Preparing: SELECT id, product_name, category, brand, price, status, stock
               FROM products WHERE product_name LIKE ? AND price >= ? ORDER BY price ASC
==> Parameters: %键盘%(String), 100(BigDecimal)
```

三组对照做完，本篇就通了。其一，清空所有字段再查：WHERE 与全部条件消失，只剩 `FROM products ORDER BY id DESC`——<where> 的空条件行为亲眼确认。其二，只传 status = 0：注意条件出现了、0 没有被吞——如果你顺手写过 `status != ''`，此刻它会消失，坑二当场复现。其三，把 orderBy 换成任意非法字符串：排序落进 otherwise 的默认值，白名单生效。做实验时盯住 Preparing 行，它是你写的「生长规则」最终长成的样子。

## 官方文档

- MyBatis 中文文档「动态 SQL」章节（全部标签的权威定义）：https://mybatis.org/mybatis-3/zh/index.html

## 自检

1. where 1 = 1 解决什么问题？<where> 又解决了什么？前者还剩什么副作用？
2. 字符串条件为什么要双判？数字类型为什么只判 null？说出 0 值被吞的成因。
3. <set> 靠什么规则剥逗号？它是哪个标签的特例？「想把字段清成 NULL」为什么做不到，出路是什么？
4. foreach 六件套各管什么？空集合会生成什么 SQL？两层防御分别是什么？
5. 批量插入两种写法各是什么？第二种为什么需要 allowMultiQueries？
6. ORDER BY 字段名为什么走 choose 白名单而不是 #{}？接 020 篇的结论说全。
7. XML 里写 `<=` 为什么必须转义？两种处理方式是什么？
