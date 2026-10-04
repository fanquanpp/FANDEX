---
order: 80
title: MyBatis-Plus 进阶：分页、乐观锁、逻辑删除、自动填充四件套
description: 以「列表页分页、并发扣库存超卖、软删除、审计字段四大企业刚需」引入：MybatisPlusInterceptor 插件总线与官方添加顺序、PaginationInnerInterceptor 含自定义 XML 分页、@Version 乐观锁冲突与重试实验、@TableLogic 的唯一索引冲突三坑、MetaObjectHandler 审计填充，附 FastAutoGenerator 代码生成与四件套逐项验证实验。
module: 'mybatis'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'mybatis/070-MybatisPlusCrud'
  - 'spring-boot/100-TransactionManagement'
author: fanquanpp
updated: '2026-10-05'
related:
  - 'mysql/430-MVCCPrinciple'
  - 'mybatis/090-PitfallsPerformance'
---

## 前置知识

- [MyBatis-Plus 单表 CRUD](/mybatis/070-MybatisPlusCrud)：会 Wrapper、BaseMapper 与实体三注解——本篇四件套全部长在它们之上；
- [事务管理](/spring-boot/100-TransactionManagement)：记得 @Transactional 的代理本质与回滚规则——没读过也能跟，把 @Transactional 当成「方法级 BEGIN/COMMIT」即可，第 4 节补一句对照。

## 学习目标

读完本文你将能够：

1. 组装 MybatisPlusInterceptor，按官方建议给四件套排序并说清理由；
2. 用 PaginationInnerInterceptor 做单表与自定义 XML 分页，说清 Page 四个核心字段的来源；
3. 用 @Version 实现乐观锁，冲突时给出正确的业务响应（重试或放弃）；
4. 用 @TableLogic 实现逻辑删除，预判唯一索引冲突等三个工程坑并给出对策；
5. 用 MetaObjectHandler 自动填充审计字段，说清它与数据库默认值的分工；
6. 跑通 FastAutoGenerator 代码生成，知道生成后的三步验收。

预计 55 分钟。

## 1. 你现在要解决什么问题

企业系统对持久层有四个几乎必提的需求：列表页要分页，不能一口气捞十万行；库存、名额这类热点数据并发修改不能互相覆盖，超卖是事故；内容下架、用户注销要「软删除」——数据还在、界面上消失；还要能审计谁在什么时候改过什么。四件事 MP 都给了现成组件：分页插件、乐观锁插件、逻辑删除、自动填充。它们不是四个孤立功能，而是同一套机制（060 讲的拦截器）长出的四件套——分页与乐观锁住在 MybatisPlusInterceptor 里，逻辑删除与自动填充是实体层与注入器的配合。本篇逐个开启、逐个验证，重点不是 API 而是每个组件的「语义」：它替你改写了什么 SQL、哪些行为会被改变、哪个口子仍然敞着。

## 2. 准备现场：插件总线 MybatisPlusInterceptor 与添加顺序

四件套里两件是插件，先把总线装好。060 见过 MybatisPlusInterceptor 的组装，这里补全四件套：

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));   // 分页
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());         // 乐观锁
        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());              // 防全表更新
        return interceptor;
    }
}
```

这个类是 MP 的插件总线：一个 MyBatis 插件、一列 InnerInterceptor，query 走查询线、update 走更新线，把内部组件在合适的时机挨个调用。顺序不是随意的——060 引过官方建议：**会改写 SQL 的优先放入，只做检查的最后放入**。本篇四件套里分页与乐观锁各改各的语句（分页改 SELECT，乐观锁改 UPDATE），互不干扰可同档；防全表更新是纯检查，收尾。必须记死的硬约束只有一条：分页要排在多租户、动态表名这类会改写 SELECT 的插件之后——排错了，count 与 LIMIT 就基于错误形态的 SQL 计算。

## 3. 分页：Page 对象与自定义 XML 分页

单表分页 060 演过机制，这里补全 Page 四个字段的语义：

```java
Page<Product> page = productMapper.selectPage(
        new Page<>(2, 10),     // current=2, size=10
        Wrappers.<Product>lambdaQuery().eq(Product::getStatus, 1));

page.getRecords();   // 本页数据（列表 SQL 的产出）
page.getTotal();     // 总条数（count SQL 的产出）
page.getPages();     // 总页数（total 与 size 推算）
page.getCurrent();   // 回读当前页；page.getSize() 回读页大小
```

很多人不知道的特性：**自定义 XML 方法也能分页**。Mapper 方法第一个参数传 Page，其余参数照常，XML 里只写业务 SQL，分页插件照样拦截改写：

```java
Page<OrderVo> selectOrderPage(Page<OrderVo> page, @Param("status") Integer status);
```

```xml
<select id="selectOrderPage" resultType="com.example.shop.vo.OrderVo">
    SELECT id, order_no, total_amount, created_at
    FROM orders
    WHERE status = #{status}
    ORDER BY created_at DESC
</select>
```

XML 里没有 LIMIT——它是插件在运行时改写进去的。翻页翻到几万页之后越来越慢的「深分页」是另一个世界的问题，090 病历本专治。

## 4. 乐观锁：更新丢失与 @Version

场景：两人同时编辑同一行库存，各自读到 stock=10，都改成 8 提交——后提交的把先提交的覆盖掉，一次减员凭空消失。这叫更新丢失，是「先读后写」模式的固有漏洞。数据库事务防不住它（两个事务都合规提交），要靠并发控制策略。乐观锁是其一：读时记下版本号，写时带条件比对。

三步启用：实体加 @Version 字段、注册 OptimisticLockerInnerInterceptor（第 2 节已装）、更新前先查出实体（旧版本号来自实体）：

```java
@Version
private Integer version;
```

updateById 时 MP 自动把 SQL 改写成：

```sql
UPDATE products SET stock = ?, version = 2 WHERE id = ? AND version = 1
```

影响行数 1 = 独占成功；0 = 你读到的版本已被别人改走。这就是 CAS（Compare-And-Swap）思想的数据库形态。亲手复现一次冲突：

```java
@Test
@DisplayName("后提交者版本过期，影响行数为 0")
void optimisticLockConflict() {
    Product first = productMapper.selectById(1L);      // 两个「用户」同时读到 version=1
    Product second = productMapper.selectById(1L);

    first.setStock(first.getStock() - 1);
    assertThat(productMapper.updateById(first)).isEqualTo(1);    // 先提交成功，version 1 → 2

    second.setStock(second.getStock() - 1);
    assertThat(productMapper.updateById(second)).isEqualTo(0);   // 后提交 0 行：版本过期
}
```

影响行数为 0 不是异常，是被你吞掉的并发冲突——业务代码必须表态。标准响应是「重读重试、限次防活锁」：

```java
public void deduct(Long id, int n) {
    for (int i = 0; i < 3; i++) {
        Product p = productMapper.selectById(id);
        p.setStock(p.getStock() - n);
        if (productMapper.updateById(p) > 0) {
            return;
        }
    }
    throw new ConcurrentUpdateException("操作过于拥挤，请稍后重试");
}
```

两个边界。其一，**乐观锁不替代事务**——事务（spring-boot/100）保证一段 SQL 的原子提交与回滚，乐观锁防的是并发「更新丢失」，两者正交、工程上常常同时出现；它也不修改 MVCC 的快照规则（mysql/430），只是给 UPDATE 加了一个当前读的比对条件。其二，作用范围：乐观锁语义只对「带实体的更新」生效（updateById 与 update(entity, wrapper)）；update(null, wrapper) 这种纯 wrapper 路径不带版本条件——想绕过它很容易，团队要约好热点行只走实体路径。

## 5. 逻辑删除：@TableLogic 与三个工程坑

全局配置（在实体字段上标 @TableLogic 也行，二选一）：

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

语义两条：deleteById 不再是 DELETE 而是 UPDATE ... SET deleted = 1；MP 注入器的查询自动追加 AND deleted = 0。一跑便知：deleteById(1L) 后看控制台是 UPDATE，selectById(1L) 返回 null，但数据库里行还在。

便利背后三个工程坑，逐个对策。

坑一：唯一索引撞逻辑删除。username 唯一索引加逻辑删，张三注销（deleted=1）后行还占着 username，新张三注册直接 DuplicateKey。两个方案：

| 方案 | 做法 | 代价 |
| --- | --- | --- |
| 联合唯一 (username, deleted) | 唯一索引带上删除标记列 | 同名注销两次即自撞：两行 deleted 都是 1 |
| 标记差异化 | 删除时把标记列写成 id 或时间戳，再联合唯一 | 脱离 @TableLogic 的固定值语义，标记维护自己管 |

选型：删除频率低、同名回收需求真实，上方案二；一般业务方案一够用。

坑二：数据只增不减。逻辑删行永远躺在表里，页越滚越厚，连 deleted = 0 的查询也跟着变慢。对策：定期把老的历史删除行归档进历史表，主表保持体态。

坑三：物理删的口子仍然敞着。@TableLogic 只改写 MP 注入器管辖的方法；你自己写的 XML DELETE 原样物理删。对策是纪律：软删表禁写 DELETE 语句，新增删除语句进评审。

## 6. 自动填充：MetaObjectHandler 管审计字段

审计字段的诉求是「不许忘、不许错」，靠人手 set 注定漏。实现两件套——实体声明填充时机：

```java
@TableField(fill = FieldFill.INSERT)
private LocalDateTime createdAt;

@TableField(fill = FieldFill.INSERT_UPDATE)
private LocalDateTime updatedAt;
```

处理器负责填值：

```java
@Component
public class AuditFillHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
```

strict 的含义：字段已有值不覆盖，调用方显式指定的优先。既然数据库有 DEFAULT CURRENT_TIMESTAMP，为什么还要应用层填？三个理由：DEFAULT 只在 INSERT 语句省略该列时生效，行为依赖「列有没有出现在列清单里」这类细节，换个框架换个插入策略就变；MySQL 的列要自动更新时间还得加 ON UPDATE CURRENT_TIMESTAMP 子句，跨库方言立刻不齐；真正兜不住的是业务审计字段——updatedBy（谁改的）数据库默认值给不出来。应用层统一规则，跨库一致、可测试。

## 7. 代码生成：FastAutoGenerator

表结构定了，entity、mapper、service、controller 的样板交给生成器（依赖 mybatis-plus-generator 加一个模板引擎，官方示例用 freemarker，以官方文档为准）：

```java
public class CodeGen {
    public static void main(String[] args) {
        FastAutoGenerator.create(
                "jdbc:mysql://localhost:3306/shop", "root", "password")
            .globalConfig(b -> b.author("fandex")
                    .outputDir("src/main/java")
                    .disableOpenDir())
            .packageConfig(b -> b.parent("com.example.shop").xml("mapper/xml"))
            .strategyConfig(b -> b.addInclude("products", "orders")
                    .entityBuilder().enableLombok()
                    .mapperBuilder().enableBaseResultMap()
                    .controllerBuilder().enableRestStyle())
            .execute();
    }
}
```

生成不是结束，三步验收：打开实体核对字段类型与表一致（decimal 对 BigDecimal、datetime 对 LocalDateTime，映射错类型是最常见的生成事故）；确认 XML 落在 mapper-locations 指向的目录、Mapper 接口在 @MapperScan 扫描范围内；写一条 CRUD 冒烟测试再合入——生成产物也要过测试这道门。

## 8. 实验：四件套逐个开启逐个验证

四件套别一口气全上，逐个加、逐个验证，出了问题才知道是谁。

- 分页：跑第 3 节 selectPage，断言 total 与 records.size()；StdOutImpl 里数出 COUNT 与 LIMIT 两条 SQL；
- 乐观锁：第 4 节冲突测试跑绿；故意删掉 @Version 注解重跑，second 的 updateById 变成 1 行——两个用户都「成功」，更新丢失当场复现；
- 逻辑删：deleteById 后控制台应是 UPDATE；selectById 返回 null；再用一条手写 XML 的 DELETE 对比，体会坑三的口子；
- 自动填充：insert 一行查库，created_at 与 updated_at 非空；update 一行，updated_at 刷新而 created_at 不动。

## 动手实践

**任务一：为 orders 表配齐四件套。** 假设新表 `orders`（id、order_no、amount、status、version、deleted、created_at、updated_at），从零写四样东西：MybatisPlusInterceptor 配置 Bean（含分页与乐观锁，顺序按官方建议）、带 @Version 与 @TableLogic 的实体、MetaObjectHandler 审计填充、一条自定义 XML 分页方法（按状态查订单，方法签名带 IPage）。提示：这个任务是把第 2 到 6 节的零件组装到一张新表上，验收标准是第 8 节实验的四条全部跑绿。

**任务二：乐观锁失败重试。** 给「扣减库存」写一个带有限重试的乐观锁更新：冲突（updateById 返回 0）时重读最新 version 再试，最多 3 次，全失败抛业务异常。提示：重读要在重试循环体内，重试外读到的永远是旧 version；返回 0 的分支别忘了先打日志再重试，方便观察冲突次数。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现（骨架自检版）</summary>

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
        return interceptor;
    }
}
```

```java
@Data
@TableName("orders")
public class Order {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private BigDecimal amount;
    private Integer status;
    @Version
    private Integer version;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

```java
@Component
public class AuditMetaObjectHandler implements MetaObjectHandler {
    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
```

```java
// 自定义 XML 分页：签名带 IPage，XML 里不写 LIMIT
IPage<Order> selectByStatus(IPage<Order> page, @Param("status") Integer status);
```

对照自检清单：分页在前乐观锁在后（顺序硬约束）；version 字段类型 Integer 且实体有 @Version；逻辑删字段 deleted 默认值要与全局配置 logic-not-delete-value 一致；XML 分页方法的第一个参数是 IPage——四条各错一处，对应的实验现象分别是「分页不生效」「更新丢失复现」「查询带出已删数据」「COUNT 不出现」。
</details>

<details>
<summary>任务二参考实现（乐观锁重试）</summary>

```java
public boolean deductStock(Long productId, int qty) {
    for (int attempt = 1; attempt <= 3; attempt++) {
        // 关键：每次重试都在循环体内重读，拿到最新 version
        Product current = productMapper.selectById(productId);
        if (current.getStock() < qty) {
            return false;   // 库存不足不是冲突，直接失败
        }
        current.setStock(current.getStock() - qty);
        int rows = productMapper.updateById(current);   // WHERE ... AND version = n
        if (rows == 1) {
            return true;
        }
        log.warn("乐观锁冲突，productId={}，第 {} 次重试", productId, attempt);
    }
    throw new BusinessException("扣减库存失败：并发冲突超过重试上限");
}
```

两个易漏点：其一，「重读在循环体内」是这段代码的正确性来源，提到循环外重试的就是拿旧 version 再撞一次墙；其二，区分「冲突重试」与「库存不足失败」——前者值得重试（别人刚改过，再看看），后者重试没有意义（数据本身不满足条件）。这也是面试里「乐观锁失败怎么办」的标准答案骨架：有限重试 + 冲突与业务失败分流。
</details>

## 自检

遮住上文与代码，凭记忆回答；答不出的回到对应小节重读。

1. MP 官方对 InnerInterceptor 添加顺序的建议是哪一句？四件套怎么排，哪条顺序是硬约束？
2. 自定义 XML 方法也能分页吗？方法签名要满足什么形态？XML 里要不要写 LIMIT？
3. Page 的 records、total、pages 各来自哪条 SQL 的产出？
4. 乐观锁影响行数为 0 说明什么？代码该怎么响应？@Version 靠什么 SQL 形态实现？
5. 乐观锁与事务、与 MVCC 分别是什么关系？纯 wrapper 路径为什么绕过了乐观锁？
6. 唯一索引撞逻辑删除的两个方案与各自代价是什么？
7. @TableLogic 改写哪些方法？哪个口子仍会物理删，纪律是什么？
8. strictInsertFill 的 strict 体现在哪？数据库 DEFAULT CURRENT_TIMESTAMP 兜不住哪些审计需求？
