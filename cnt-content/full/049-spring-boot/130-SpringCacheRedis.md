---
order: 130
title: Spring Cache 与 Redis：注解声明意图，缓存收进一处
description: 以「首页热门文章每次请求都打库、QPS 一高库先倒」引入：声明式缓存抽象与 CacheManager 心智模型、JSON 序列化的 RedisCacheManager 配置、四注解分工与 SpEL key、穿透击穿雪崩的注解层防御及其边界，附二次请求不打库实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/090-SpringDataJpa'
  - 'spring-boot/110-AspectOrientedProgramming'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'redis/110-CacheStrategyAdvancedFeature'
  - 'redis/120-CachePenetrationBreakdownAvalanche'
---

## 前置知识

- [Spring Data JPA](/spring-boot/090-SpringDataJpa)：有 repository 查询方法可以拿来缓存——没读过也能跟，把 repository.findById 当成「查库」即可；
- [面向切面编程](/spring-boot/110-AspectOrientedProgramming)：知道注解背后是代理拦截——没读过也能跟，第 2 节现场补；
- 见过 Redis 的 get 与 set（键值对存取）即可，不需要装过。

## 学习目标

读完本文你将能够：

1. 用「声明意图」解释 Spring Cache 与手写 RedisTemplate 的分野，说清 CacheManager 管哪三件事；
2. 配出 JSON 序列化的 RedisCacheManager，说出 JDK 序列化的三宗罪，并做全局与按 cacheName 的 TTL 差异化；
3. 用对四个注解与 SpEL key，画出 cacheName 与 key 的双层结构在 Redis 里的真实形态；
4. 在注解层给出穿透与击穿的防御，诚实说清雪崩为什么注解层防不住；
5. 判断什么时候该放弃注解、退回手写缓存。

预计 45 分钟。

## 1. 你现在要解决什么问题

首页的热门文章列表，每次请求都到数据库捞一遍。平时没事，活动一来 QPS 冲上几千，数据库先倒——明明十分钟内数据没变过，为什么一万个请求要查一万次库？你决定加 Redis 缓存。手写版长这样：每个查询方法里先 redisTemplate.get(key)，命中返回；未命中查库，再 set(key, value, 30, MINUTES)。写到第三个方法你就烦了：key 命名各凭手感，TTL 五花八门，忘了 set 的地方缓存形同虚设。样板代码遍布全站，而真正想表达的只有一句：「这个方法的返回值可以缓存 N 分钟」。Spring Cache 的答案：把这句话写成注解贴在方法上，存哪、怎么序列化、活多久全部收进一处配置。本篇讲清这套抽象的心智模型、四个注解的分工、三大缓存经典问题在注解层能防到什么程度——以及什么时候该承认抽象到头了。

## 2. 心智模型：注解声明意图，CacheManager 落地执行

两层分工。注解层声明**意图**：「这个方法的返回值可缓存」「更新后刷新」「删除后失效」——它们不知道也不关心数据存在哪。配置层落地**执行**：CacheManager 决定存哪（Redis 还是内存）、怎么序列化（JSON 还是 JDK 二进制）、活多久（TTL）。

与 AOP 同源：@Cacheable 标注的方法，第一次调用真实执行、结果进缓存；之后调用被代理直接用缓存值返回，**方法体根本不执行**——110 篇的五通知执行顺序原样适用，@Cacheable 本质是一个环绕通知。所以它也继承 AOP 的全部宿命：自调用绕过代理、非 public 织不进去、方法内部 this.xxx() 的缓存逻辑失效。

数据在 Redis 里的双层结构：

```text
@Cacheable(cacheNames = "bookDetail", key = "#id")
真实键 = cacheName + "::" + key          →   bookDetail::42
```

cacheName 是分区（一类业务一个区，整区可一键清空），key 是区内定位。Boot 默认用双冒号连接两者。

## 3. 集成落地：JSON 序列化的 RedisCacheManager

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

默认的 RedisCacheManager 用 JDK 序列化存值，三宗罪：实体必须实现 Serializable，忘了实现运行期才炸；二进制体积是 JSON 的数倍，Redis 内存与网络跟着涨；存进去的东西人读不了、其他语言的服务读不了。自定义 CacheManager 换 JSON：

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> perCache = Map.of(
                "bookDetail", defaults.entryTtl(Duration.ofHours(2)),
                "hotList", defaults.entryTtl(Duration.ofMinutes(5)));

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(perCache)
                .build();
    }
}
```

四件事一次配齐。全局 TTL 30 分钟。GenericJackson2JsonRedisSerializer 替换值序列化——它会在 JSON 里多写一个 @class 字段记录类型，取回时还原成具体类，代价是值里多了类型元数据。按 cacheName 差异化 TTL——详情区 2 小时、热点列表区 5 分钟，同一管理器里共存。cacheDefaults 兜底没显式配置的分区。

## 4. 四注解分工与 SpEL key

| 注解 | 语义 | 典型场景 |
| --- | --- | --- |
| @Cacheable | 先查缓存，命中直接返回（方法不执行），未命中才执行并写入 | 详情、列表查询 |
| @CachePut | 无论如何执行方法，返回值写入缓存 | 更新后刷新缓存 |
| @CacheEvict | 清缓存；allEntries = true 清整个分区 | 删除、更新后失效 |
| @Caching | 组合上面多个 | 一次写操作触发多处失效 |

key 支持 SpEL：#id 按参数名取、#result 取返回值、#p0 按位置取；字符串拼接时静态部分自己加引号。要给键加业务前缀，写 `key = "'book:' + #id"`，真实键随之变成 `bookDetail::book:1`——前缀属于 key 层，cacheName 与 key 两层各自独立、互不吞并。

```java
public interface BookRepository extends JpaRepository<Book, Long> {

    List<Book> findByOrderByViewsDesc(Pageable pageable);
}
```

```java
@Service
public class BookService {

    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    @Cacheable(cacheNames = "bookDetail", key = "#id")
    public Book getBook(Long id) {
        return bookRepository.findById(id).orElseThrow();
    }

    @Cacheable(cacheNames = "hotList", key = "'top' + #n")     // 键：hotList::top10
    public List<Book> topBooks(int n) {
        return bookRepository.findByOrderByViewsDesc(PageRequest.of(0, n));
    }

    @CachePut(cacheNames = "bookDetail", key = "#book.id")
    public Book update(Book book) {
        return bookRepository.save(book);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "bookDetail", key = "#id"),
            @CacheEvict(cacheNames = "hotList", allEntries = true)
    })
    public void delete(Long id) {
        bookRepository.deleteById(id);
    }
}
```

更新场景选 @CachePut 还是 @CacheEvict？纪律：**失效优于刷新**。缓存单个对象、且更新方法返回的就是完整新值时，@CachePut 才安全；一旦涉及聚合计算、列表页、跨表字段，刷新很容易刷出不一致的旧账——宁可 @CacheEvict 清掉让下次请求回源，多一次查询买一个「绝不脏」。

## 5. 三大经典问题：注解层能防到哪

穿透：查询一个不存在的 id，缓存永远没有，每次都打库——攻击者拿随机 id 扫你。注解层防御：**缓存空值**。RedisCacheConfiguration 默认就允许缓存 null——查到 null 也写入，下次同样的 id 命中，库安宁了；要禁用才需要调 disableCachingNullValues()。边界：null 项也占内存，恶意海量随机 id 会让 null 缓存撑爆 Redis；布隆过滤器把「一定不存在」挡在缓存之前，深水区见 [缓存穿透与雪崩](/redis/120-CachePenetrationBreakdownAvalanche)。

击穿：一个热点 key 过期的瞬间，成百并发同时未命中，全部打库。注解层防御：@Cacheable(sync = true)——同一 key 的并发未命中只有一个线程真实执行方法，其余阻塞等待、共享它写回的结果。限制记两条：sync 与 @Caching 组合、unless 等高级特性不兼容（以官方文档为准）；单飞只对「同一个 key」有效。

雪崩：大量 key 设了相同 TTL，同一秒集体过期，库被齐射打穿。思想很清楚：**把过期时间点打散**，比如 base + random(0, base / 10)。但注解层要诚实交代：entryTtl 只有 cacheName 粒度的固定值，没有「每次写入随机抖动」的口子——这是抽象的边界。要随机 TTL 就退回 RedisTemplate 手写，或自定义缓存写入器。完整的多级防线（过期分层、多级缓存、熔断降级）见 [缓存策略与高级特性](/redis/110-CacheStrategyAdvancedFeature)。

## 6. 注解缓存的边界：何时退回手写

三条判断线。其一，键粒度的差异化 TTL：热门文章 5 分钟、冷门 2 小时——注解做不到，TTL 只到 cacheName 粒度。其二，方法内的精细控制：一个方法里前半段想走缓存、后半段必须实时，或者一次调用要读写多个缓存键——注解的边界是「方法级」，颗粒度下不去。其三，复杂失效链：改一个分类要清文章列表、首页推荐、站内搜索三个区——@CacheEvict 写成烟花，半年后没人敢动。判断标准一句话：**注解适合读多写少、键结构简单、失效规则与数据一一对应的场景；一旦失效规则本身成了业务逻辑，就该手写**。手写不丢人——Spring Cache 是替你省样板代码的，不是给你套枷锁的。

## 7. 实验：二次请求不打库、TTL 到期回源、清缓存刷新

沿用 090 篇的 show-sql 配置，Book 实体只有三个字段，专为观察缓存而生：

```java
@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private Integer views;
    protected Book() { }
    // getter/setter 略
}
```

存一条数据再连查两次：

```java
@Bean
CommandLineRunner demo(BookService bookService, BookRepository books) {
    return args -> {
        Book b = new Book();
        b.setTitle("深入浅出 Spring Boot");
        b.setViews(999);
        books.save(b);

        System.out.println("第一次：" + bookService.getBook(b.getId()).getTitle());  // 打库，控制台出 SQL
        System.out.println("第二次：" + bookService.getBook(b.getId()).getTitle());  // 无 SQL，缓存命中
    };
}
```

```text
Hibernate: select ... from book where id=?
第一次：深入浅出 Spring Boot
第二次：深入浅出 Spring Boot            （这一行前面没有任何 SQL）
```

到 Redis 里亲眼看一眼双层结构与差异化 TTL：

```bash
redis-cli KEYS 'bookDetail::*'
# 1) "bookDetail::1"
redis-cli GET "bookDetail::1"
# "{\"@class\":\"com.example.cache.Book\",\"id\":1,\"title\":\"深入浅出 Spring Boot\",...}"
redis-cli TTL "hotList::top10"
# 300        （列表区 5 分钟，来自按 cacheName 的差异化配置；详情区则是 7200）
```

再验穿透：写一个不带 orElseThrow 的空值查询连查两次，第二次连 SQL 都没有——空值缓存已经替库挡下了重复的「查无此人」：

```java
public Optional<Book> findNullable(Long id) {          // 与 getBook 的差别：不 orElseThrow
    return bookRepository.findById(id);
}

// findNullable(9999L); 第一次：打库，结果为空，null 写入缓存
// findNullable(9999L); 第二次：命中空值缓存，不打库——穿透被注解层挡住
```

最后验证失效：调 bookService.delete(b.getId()) 后第三次 getBook(b.getId())——用 try-catch 包住（记录已删会抛查无此书），观察点是 **SQL 重新出现**：bookDetail 与 hotList 两区已被清空，回源重建。

## 8. 官方参考

- Spring 框架缓存抽象：https://docs.spring.io/spring-framework/reference/integration/cache.html
- Spring Boot 的 Redis 支持：https://docs.spring.io/spring-boot/reference/data/redis.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. Spring Cache 与手写 RedisTemplate 的分野一句话？CacheManager 决定哪三件事？@Cacheable 方法第二次调用时方法体执行吗？
2. @Cacheable 与 @CachePut 的语义差异一句话？为什么「失效优于刷新」？
3. JDK 序列化三宗罪？GenericJackson2JsonRedisSerializer 在 JSON 里多写了什么、换来了什么？
4. cacheName 与 key 的双层结构在 Redis 里长什么样（真实键格式）？整区清空靠哪个属性？
5. 穿透的注解层防御是什么？默认行为是缓存 null 还是不缓存？什么情况反而要 disableCachingNullValues？
6. sync = true 防的是什么？它单飞的范围是同一 key 还是同一方法？它不兼容什么？
7. 雪崩为什么注解层防不住？思想是什么、工程上退到哪条路？
8. 三条「该放弃注解改手写」的判断线是什么？
