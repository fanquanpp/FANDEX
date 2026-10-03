---
order: 90
title: Spring Data JPA：三层塔——规范、引擎与仓库抽象
description: 以「JDBC 四段式体力活与全自动 ORM 的黑盒恐惧」引入：JPA、Hibernate、Spring Data JPA 三层分工，实体映射与派生查询方法，@Query 与分页，N+1 复现与 JOIN FETCH、@EntityGraph 两种对策，附 H2 起步一键切 MySQL 实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'java/720-JavaDatabaseConnection'
  - 'mysql/110-SQLDataOperationQuery'
  - 'spring-boot/030-IoCDependencyInjection'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/100-TransactionManagement'
  - 'spring-boot/040-AutoConfigurationInternals'
---

## 前置知识

- [Java 数据库连接](/java/720-JavaDatabaseConnection)：见过 JDBC 的 Connection、PreparedStatement——没读过也能跟，第 1 节会把四段式体力活带一遍；
- [SQL 数据操作与查询](/mysql/110-SQLDataOperationQuery)：会写 SELECT 与 JOIN——没读过也能跟，把 SQL 当成「查表的句子」即可；
- [IoC 与依赖注入](/spring-boot/030-IoCDependencyInjection)：知道接口注入实现靠容器——没读过也能跟。

## 学习目标

读完本文你将能够：

1. 说清 JPA、Hibernate、Spring Data JPA 三层各管什么，遇到报错知道该查谁；
2. 写出满足 MySQL 自增主键的实体映射，并解释 @Enumerated 为什么必须用 STRING；
3. 用派生查询方法名表达简单条件，判断它什么时候表达不了、该退到 @Query；
4. 用 Pageable 一次拿回分页数据与总条数；
5. 复现 N+1 查询，说清成因，并用 JOIN FETCH 与 @EntityGraph 两种对策各自解决；
6. 把存储层从 H2 切换到 MySQL 而不改一行 Java 代码。

预计 50 分钟，需要一个能跑 Spring Boot 的环境。

## 1. 你现在要解决什么问题

JDBC 时代每个查询都是四段式体力活：拿连接、拼 SQL、遍历 ResultSet 逐列取值、关资源。写十个查询就是十遍这套动作，改一个字段名要全局搜索字符串拼 SQL。于是有人喊「上全自动 ORM」，上了之后又出现新的恐惧：列表页莫名变慢，控制台刷出几十条一模一样的 SQL，却没人知道是谁发的——ORM 成了黑盒。出路不是二选一站队，而是先看清楚这套体系其实是三层：谁定标准、谁生成 SQL、谁省模板代码。分清三层，你既能享受自动化的红利，也能在变慢时知道拧哪个螺丝。

## 2. 心智模型：三层塔

```text
第三层  Spring Data JPA   仓库抽象：JpaRepository 接口即实现，省掉模板代码
            ↑ 建立在其上
第二层  JPA（规范）        jakarta.persistence 包的注解与接口标准，只定契约
            ↑ 由谁实现
第一层  Hibernate          真正把实体操作翻译成 SQL 的引擎（Boot 3.5.x 搭 Hibernate 6.x）
```

- JPA 是规范：@Entity、@Id 这些注解和 EntityManager 这套接口属于它，是 Jakarta EE 的一部分。它不生成一行 SQL；
- Hibernate 是实现：规范说「实体该映射到表」，Hibernate 负责真的生成 INSERT、SELECT。你看到的每一条 SQL 都是它写的；
- Spring Data JPA 是仓库抽象：在规范之上再封装一层——你只声明接口，它生成实现，连「按主键查」这种模板方法都替你写好。

报错分流口诀：SQL 语法与映射生成的 SQL 不对，查 Hibernate；注解语义拿不准，查 JPA 规范；「接口没有实现类」「方法名解析不出来」，查 Spring Data JPA。

## 3. 准备现场：先用 H2 跑通

两个依赖，外加一个内存数据库 H2：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:demo
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: update        # 开发期让 Hibernate 建表；生产应为 none，表结构交给迁移工具
    show-sql: true            # 控制台打印 SQL
logging:
  level:
    org.hibernate.orm.jdbc.bind: trace   # Hibernate 6 里 SQL 的绑定参数日志在这里看
```

选 H2 不是将就：内存库零安装、秒起，先把三层跑通；第 8 节只改配置就能切到 MySQL——顺便体会 [自动配置](/spring-boot/040-AutoConfigurationInternals) 的价值。

## 4. 实体映射：把类对到表

```java
@Entity
@Table(name = "t_task")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // 对应 MySQL 的 AUTO_INCREMENT
    private Long id;

    @Column(nullable = false, length = 50)
    private String title;

    @Enumerated(EnumType.STRING)                          // 存 "TODO"/"DONE"，不写这句是埋雷
    private TaskStatus status;

    private LocalDate createdAt;

    protected Task() {
    }                        // JPA 要求无参构造器（protected 即可），Hibernate 反射实例化用

    // getter/setter 略，可用 Lombok 的 @Getter @Setter
}

public enum TaskStatus { TODO, DOING, DONE }
```

三个要点。@GeneratedValue 用 IDENTITY 才与 MySQL 的自增列对上号，主键由数据库发号。@Enumerated 必须显式写 STRING：不写它默认 ORDINAL 存下标，哪天有人在枚举中间插一个新值，历史数据全体错位——下标是位置，字符串是身份，数据永远存身份。顺带一句 Lombok 的坑：@Data 生成的 hashCode/equals 会把所有字段算进去，与 JPA 的托管状态、延迟加载语义打架，实体上建议只用 @Getter/@Setter。

## 5. 仓库接口：继承即得 CRUD

```java
public interface TaskRepository extends JpaRepository<Task, Long> {
}
```

空接口，启动时 Spring Data JPA 生成实现并注册成 Bean，save、findById（返回 Optional）、findAll、deleteById、count 全部自带。注入即用：

```java
Task saved = repository.save(task);
Optional<Task> found = repository.findById(saved.getId());
```

## 6. 派生查询方法、@Query 与分页

Spring Data JPA 会解析方法名生成查询：findBy 加属性名加连接词与关键词。

```java
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByStatusAndCreatedAtAfter(TaskStatus status, LocalDate date);

    List<Task> findByTitleContaining(String keyword);
}
```

方法名能表达的是「属性的与或非与比较」（And、Or、After、Before、Containing、OrderBy 等关键词）。它的能力边界要心里有数：一旦需要 join 关联、聚合、子查询，方法名会拗成不可读的长句甚至表达不了——别硬拗，退到 @Query：

```java
@Query("select t from Task t where t.status = :status order by t.createdAt desc")
List<Task> findRecent(@Param("status") TaskStatus status);

@Query(value = "select * from t_task where status = :status", nativeQuery = true)
List<Task> findRaw(TaskStatus status);
```

第一条是 JPQL：面向实体与属性（Task、t.status），换数据库不用改；第二条 nativeQuery 面向表与列，能用数据库方言特有语法，代价是绑定具体数据库。默认首选 JPQL。

分页一把抓。方法加 Pageable 参数、返回 Page，总条数与当前页数据一次拿回：

```java
Page<Task> page = repository.findByStatus(TaskStatus.TODO, Pageable.ofSize(10).withPage(0));
long total = page.getTotalElements();
List<Task> records = page.getContent();
```

前端列表页从此不用再发第二条 count 请求。

## 7. 关系映射与 N+1：现象、复现、对策

给任务挂上主人：

```java
@Entity
@Table(name = "t_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    protected User() {
    }
    // getter/setter 略
}
```

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "owner_id")
private User owner;
```

先把事实钉准确：JPA 规范里 @ManyToOne 默认 EAGER（查任务顺带把 owner 查出来），@OneToMany 默认 LAZY。实践纪律是不管默认值、所有关联显式声明 LAZY——需要什么在查询里明说，而不是让数据库白查一通。

N+1 现场复现。show-sql 开着，跑这段：

```java
List<Task> tasks = taskRepository.findAll();        // 第 1 条 SQL
for (Task t : tasks) {
    System.out.println(t.getOwner().getName());     // 每个任务再各发 1 条，共 N 条
}
```

控制台里数出 1 + N 条 select。成因一句话：owner 是 LAZY，首次访问才发查询，而循环恰好逐个摸它。LAZY 本身不是罪——它防的是「不需要时不白查」；罪在「循环里逐个触发延迟加载」。

两种对策，各有适用：

```java
@Query("select t from Task t join fetch t.owner")
List<Task> findAllWithOwner();                     // JOIN FETCH：一条 SQL 连表取回

@EntityGraph(attributePaths = "owner")
List<Task> findAll();                              // 给既有方法补抓取路径，写法声明式
```

JOIN FETCH 写在 @Query 里，控制力强，适合查询本身复杂、要精确控制连接方式的场景；@EntityGraph 贴在仓库方法上，不写一句 JPQL 就能给 findAll 或派生方法追加关联抓取，适合「就差这一两个属性」的简单场景。另有一个帮凶要点名：Boot 默认开启 open-in-view（spring.jpa.open-in-view），数据库会话一直活到视图渲染结束，所以你在控制器里摸 LAZY 字段不报错——N+1 因此更隐蔽。启动日志里那条著名的 open-in-view 警告就是在提醒这件事，生产建议显式关闭。

## 8. 换 MySQL：只改配置

把 H2 依赖换成 MySQL 驱动：

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
    username: root
    password: yourpass
```

实体一行不改、仓库一行不改。方言由 Hibernate 连上数据库后自动探测，连建表语句都会跟着换成 MySQL 语法——第 2 节那座三层塔此刻兑现红利：换的是第一层之下的东西，上两层毫无感知。

## 9. 分工说明：MyBatis 与事务归谁讲

两句话划清边界。第一，本篇是 JPA 主线；国内工程大量使用的 MyBatis / MyBatis-Plus 是另一条路线（SQL 全部手写、映射自己做，与「自动生成 SQL」互为镜像），请进入 050-mybatis 模块系统学习，先精通一条再对照另一条。第二，本篇多次出现「托管状态、事务提交时 flush」的说法，@Transactional 的事务语义、传播行为、失效场景，是下一篇 [事务管理](/spring-boot/100-TransactionManagement) 的正题。

## 10. 实验：CRUD 五连加派生三例

```java
@Bean
CommandLineRunner demo(TaskRepository repo) {
    return args -> {
        Task t = new Task();
        t.setTitle("写周报");
        t.setStatus(TaskStatus.TODO);
        t.setCreatedAt(LocalDate.now());
        repo.save(t);                                          // INSERT

        Task loaded = repo.findById(t.getId()).orElseThrow();  // SELECT
        loaded.setTitle("写周报并提交");
        repo.save(loaded);                                     // 先 SELECT 比对，再 UPDATE

        repo.findByStatus(TaskStatus.TODO);                    // 派生查询一
        repo.findByStatusAndCreatedAtAfter(TaskStatus.TODO, LocalDate.now().minusDays(7));
        repo.findByTitleContaining("周报");                     // 派生查询三

        Page<Task> page = repo.findAll(PageRequest.of(0, 10)); // 分页：count 加 limit 两条
        System.out.println(page.getTotalElements() + " / " + page.getContent().size());

        repo.deleteById(t.getId());                            // DELETE
    };
}
```

控制台预期（列顺序以你的实体定义为准）：

```text
Hibernate: insert into t_task (created_at,status,title,id) values (?,?,?,?)
Hibernate: select t1_0.id,t1_0.created_at,t1_0.status,t1_0.title from t_task t1_0 where t1_0.id=?
Hibernate: select t1_0.id,t1_0.created_at,t1_0.status,t1_0.title from t_task t1_0 where t1_0.id=?
Hibernate: update t_task set created_at=?,status=?,title=? where id=?
Hibernate: select t1_0.id,t1_0.created_at,t1_0.status,t1_0.title from t_task t1_0 where t1_0.status=?
Hibernate: select count(t1_0.id) from t_task t1_0 where t1_0.status=?
Hibernate: select ... from t_task t1_0 where t1_0.status=? limit ?
```

两个值得盯住的细节。第一次：save 一个已带 id 的对象，控制台会先出 SELECT 再出 UPDATE——save 对带 id 的对象走 merge 语义，先查库比对再更新。第二次：findById 查不到返回 Optional.empty；它的兄弟 getReferenceById 不发 SQL，只还你一个延迟代理，等你真去访问字段才查库、查不到抛 EntityNotFoundException——适合「只为了拿去关联」的场景。跑完本节，回头做第 7 节的 N+1 复现，把 1 + N 亲手数出来。

## 自检

1. JPA、Hibernate、Spring Data JPA 各管什么？生成的 SQL 语法不对，该查哪一层？
2. 派生方法名表达不了的查询怎么办？JPQL 与 nativeQuery 怎么选，代价各是什么？
3. @Enumerated 不写会怎样？为什么 STRING 比 ORDINAL 安全？
4. N+1 的成因用一句话说清；JOIN FETCH 与 @EntityGraph 各自适合什么场景？
5. @ManyToOne 的 fetch 默认值是什么？@OneToMany 呢？实践纪律是什么？
6. findById 查不到返回什么？getReferenceById 查不到时什么时候才炸？
7. save 一个已带 id 的对象，控制台为什么先出现 SELECT 再出现 UPDATE？
8. 生产环境 ddl-auto 应该设成什么？为什么？
