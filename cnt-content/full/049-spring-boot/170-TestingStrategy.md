---
order: 200
title: 测试策略：把置信与时间花在刀刃上
description: 以「全员 @SpringBootTest、一轮 8 分钟没人愿意跑」引入：测试金字塔在 Spring Boot 的三层定价、Mockito 单元测试、@WebMvcTest 与 @DataJpaTest 切片三件套、Testcontainers 真库集成、回滚测试的局限与 TestConfiguration 覆盖，附同一逻辑三层实测对比。
module: 'spring-boot'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/030-IoCDependencyInjection'
  - 'java/890-JavaUnitTest'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/070-UnifiedResponseExceptionHandling'
  - 'spring-boot/090-SpringDataJpa'
---

## 前置知识

- 已完成 [单元测试](/java/890-JavaUnitTest)：写过 JUnit 5 的 @Test 与断言——没读过也能跟，把测试当成「会自动跑的检查代码」即可；
- 已完成 [IoC 容器与依赖注入](/spring-boot/030-IoCDependencyInjection)：会写构造器注入——本篇会兑现 030 篇留下的伏笔：构造器注入的第二个理由。

## 学习目标

读完本文你将能够：

1. 说出测试金字塔三层的速度量级与置信分工，解释「所有测试都 @SpringBootTest」为什么毁掉测试文化；
2. 用 Mockito 写出不起容器的 service 单元测试，说清构造器注入与可测试性的关系；
3. 用 @WebMvcTest 测试控制器与全局异常翻译，说出它不会装配什么、@MockitoBean 从何而来；
4. 用 @DataJpaTest 测试派生查询方法，说清内嵌库替换与自动回滚两个默认行为；
5. 用 Testcontainers 加 @ServiceConnection 起真 MySQL 跑集成测试，解释「真数据库」为什么比 H2 可信；
6. 说出事务回滚测试拦不住的两类脏数据场景，会用 @TestConfiguration 替换 Bean。

预计 60 分钟，需要一个能跑 Spring Boot 的环境；Testcontainers 一节需要 Docker。

## 1. 你现在要解决什么问题

接手一个「有测试文化」的项目：两千多个测试，全部 @SpringBootTest 起全容器。本地全量跑一轮 8 分钟，CI 排队再加 20 分钟。于是形成了默契：改代码前不跑测试（太慢），提交后 CI 红了再改（太晚），久而久之大家直接跳过红灯——测试套件还在，信任已经死了。问题不在「测试没用」，在**定价错了**：每个测试都花了集成测试的钱，买到的置信却未必比单元测试多。测试分层不是教条，是一张价目表：越靠近底层的测试越快、越便宜，越上层的测试越慢、越接近真实。本篇把这张价目表在 Spring Boot 里落到注解级：什么逻辑用什么层测，快与置信都要。

## 2. 金字塔在 Spring Boot 的落点：速度与置信的定价

三层落点一张表（耗时为本机示例量级，供建立直觉）：

| 层 | 起什么 | 速度量级 | 置信范围 |
| --- | --- | --- | --- |
| 单元测试 | 什么都不起，Mockito 造依赖 | 毫秒级每类 | 类内部的业务逻辑与分支 |
| 切片测试 | 只装配某一层（MVC 或 JPA） | 秒级每类 | 该层的装配、绑定、翻译是否正确 |
| 集成测试 | 全容器加真依赖 | 十秒级每类（首启更久） | 层与层拼起来之后的端到端契约 |

配比的经验法则：数量上单元最多、切片居中、集成最少——把慢测试留给「层与层的接缝」和「真依赖的行为」，别让它去验一个 if 分支。另一个省时间的关键机制是上下文缓存：配置相同的 @SpringBootTest 共享同一个容器，起一次后面全是复用——这也是「同类测试放一起跑更快」的原因。

## 3. 单元测试：不起容器，Mockito 上场

测 service 的业务逻辑，不需要 Spring 参与：手动 new，依赖用 Mockito 造假。

```java
@ExtendWith(MockitoExtension.class)
class ArticleServiceTest {

    @Mock
    ArticleRepository repository;

    @InjectMocks
    ArticleService service;

    @Test
    @DisplayName("发布文章：状态置为已发布并保存")
    void publishMarksArticlePublished() {
        Article draft = new Article("标题", "正文");
        when(repository.save(any(Article.class))).thenReturn(draft);

        service.publish(draft);

        assertThat(draft.getStatus()).isEqualTo(ArticleStatus.PUBLISHED);
        verify(repository).save(draft);
    }

    @Test
    @DisplayName("重复标题：抛业务异常且不落库")
    void duplicateTitleRejected() {
        when(repository.existsByTitle("重复")).thenReturn(true);

        assertThatThrownBy(() -> service.publish(new Article("重复", "x")))
                .isInstanceOf(BusinessException.class);

        verify(repository, never()).save(any());
    }
}
```

四个件口诀：@Mock 造依赖替身，@InjectMocks 把替身塞进被测对象，when 规定替身行为，verify 核对与替身的交互。整个类毫秒级跑完，因为它只验纯逻辑：状态翻没翻、分支走没走、该不该落库。它抓不到的也明确——SQL 对不对、路由通不通，是上面两层的活。

这一节顺便兑现 030 篇的伏笔。构造器注入为什么被反复推荐？第一个理由是不可变；第二个理由现在揭晓：**它是可测试性的前提**。字段注入的类没法 new——依赖藏在字段里，单元测试没有容器替你塞；构造器注入让 new ArticleService(mockRepo) 一行成立，被测对象与容器彻底解耦。写类的时候想想「这个类将来怎么 new」，可测性就设计进去了。

## 4. 切片测试三件套：只装配一层

切片测试的口号：起容器，但只起与被测层相关的部分。三个常用注解各切一刀。

### 4.1 @WebMvcTest：只装配 MVC

```java
@WebMvcTest(ArticleController.class)
class ArticleControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ArticleService service;

    @Test
    @DisplayName("业务异常应被全局处理器翻译成 Result")
    void businessExceptionTranslated() throws Exception {
        when(service.getById(99L)).thenThrow(new BusinessException("1002", "文章不存在"));

        mockMvc.perform(get("/api/articles/99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("1002"));
    }
}
```

它只装配 MVC 一层的零件：指定控制器、@ControllerAdvice（070 篇的全局异常处理器因此能被测到）、过滤器、消息转换器——**你的 Service 不在其中**。service 的位置由 @MockitoBean 顶替：往容器放一个 Mockito 替身并注入给控制器。版本事实点名：Boot 3.4 起 @MockBean 弃用，替代者是 Spring Framework 6.2 的 @MockitoBean，用法相同、包不同，升级时全局替换即可。这个测试抓的正是单元测试够不到的层内问题：路由匹配、参数绑定、JSON 字段名、异常翻译后的报文形状——断言里的 code=1002，就是 070 篇那套契约在测试里的回声。

### 4.2 @DataJpaTest：只装配 JPA

```java
@DataJpaTest
class ArticleRepositoryTest {

    @Autowired
    ArticleRepository repository;

    @Test
    @DisplayName("派生查询：按状态与标题关键词过滤")
    void derivedQueryFiltersCorrectly() {
        repository.save(new Article("Spring 入门", ArticleStatus.PUBLISHED));
        repository.save(new Article("Redis 入门", ArticleStatus.DRAFT));

        List<Article> found =
                repository.findByStatusAndTitleContaining(ArticleStatus.PUBLISHED, "Spring");

        assertThat(found).hasSize(1);
    }
}
```

两个默认行为要知道。其一，classpath 上有 H2 时数据源自动换成内嵌库（要用真库见第 6 节，配 @AutoConfigureTestDatabase(replace = Replace.NONE) 关掉替换）；其二，每个测试方法包在事务里、结束自动回滚，测试之间天然隔离。它验证的是方法名到 SQL 的翻译与映射是否正确——090 篇派生查询的回归网。

### 4.3 @JsonTest 一句话

只装配 Jackson：验证序列化形状（字段名、忽略策略）是否符合前端契约，小而快，需要时再查官方文档。

## 5. 集成测试：@SpringBootTest 的模式与配置隔离

全容器测试的第一件事是选 webEnvironment：

| 模式 | 行为 | 配合的调用方式 |
| --- | --- | --- |
| MOCK（默认） | 起全容器，web 层走 Mock 环境 | @AutoConfigureMockMvc 加 MockMvc |
| RANDOM_PORT | 起真实内嵌服务器，随机端口 | 注入 TestRestTemplate |
| DEFINED_PORT | 用配置文件里的端口 | 同上（小心端口冲突） |
| NONE | 不起 web 层 | 纯 service 层的全容器测试 |

选择标准一句话：要测「HTTP 进来长什么样」用 MOCK 加 MockMvc（快，不占端口）；要测「真服务器、真序列化、真依赖」用 RANDOM_PORT 加 TestRestTemplate。测试专用配置用 profile 隔离：

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ArticleFlowIntegrationTest { }
```

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:test
logging:
  level:
    org.hibernate.SQL: debug
```

src/test/resources 下的 application-test.yml 只在测试类路径上，生产配置零污染。

## 6. Testcontainers：起一个真的 MySQL

H2 有个身份问题：它不是 MySQL。上一节看似「绿了」的集成测试，跑在 H2 的方言上，生产跑在 MySQL 的方言上。翻车剧本俯拾皆是：建表语句用了 MySQL 的特性（如 ON UPDATE CURRENT_TIMESTAMP、FULLTEXT 索引），H2 的兼容模式并不逐条复刻，测试全绿、上线第一次执行就炸；排序规则与大小写行为不同，同一查询两边结果不同。这类「测试绿但生产错」叫假绿，是测试可信度的天敌。Testcontainers 的答案是让测试跑在真的 MySQL 上——用 Docker 起一个一次性容器：

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class ArticleFlowIntegrationTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @Autowired
    TestRestTemplate rest;

    @Test
    @DisplayName("发文后列表页可见：端到端一条龙")
    void publishThenVisibleInList() {
        rest.postForEntity("/api/articles",
                new ArticleRequest("集成测试标题", "正文"), Void.class);

        ResponseEntity<String> page = rest.getForEntity("/api/articles", String.class);

        assertThat(page.getBody()).contains("集成测试标题");
    }
}
```

依赖 org.testcontainers:junit-jupiter 与 org.testcontainers:mysql（test scope）。三个注解分工：@Testcontainers 开启容器生命周期管理；@Container 声明容器随测试类启动销毁；@ServiceConnection（Boot 3.1 起）让 Boot 从容器自动推导连接参数——没有它，你得手写动态属性把 url、用户名、密码灌进测试环境。代价也说清楚：首次要拉镜像、起容器多花十几秒，所以真库集成测试要少而准，专测方言与端到端契约，剩下的还是交给上面两层。

## 7. 测试数据与边界：回滚测试的局限与 Bean 覆盖

### 7.1 事务回滚测试的两个盲区

回滚测试（@DataJpaTest 自带，或测试方法标 @Transactional）是便利，但两条缝会漏脏数据：

- 自开事务拦不住：被测代码里 REQUIRES_NEW 新开的事务（100 篇的传播行为）独立提交，主测试回滚管不到它，脏数据漏进下一个测试；
- 异步代码拦不住：@Async 与定时任务跑在别的线程、别的连接上（150 篇），测试主线程的事务对它们完全不可见——要么等它真实提交，要么这类逻辑别用回滚测试。

此外，回滚意味着「真实提交之后的行为」（唯一约束冲突、自增主键分配）从没被验证过——这一类交给第 6 节的真库集成测试。

### 7.2 @TestConfiguration 替换 Bean

测试要换掉某个 Bean（发邮件、支付网关这类外部依赖），不必动生产代码：

```java
@SpringBootTest
@ActiveProfiles("test")
class RegisterServiceTest {

    @TestConfiguration
    static class FakeMailConfig {

        @Bean
        MailSender mailSender() {
            return body -> { };        // 测试替身：什么都不发
        }
    }
}
```

嵌套的 @TestConfiguration 类只作用于当前测试类——比全局 profile 配置更局部，比 Mockito 手动注入更适合「第三方 Bean 整体替换」。

## 8. 实验：同一处逻辑的三层定价

把「发文校验 + 落库 + 异常翻译」这一个用例，分别用三层各写一遍，记录耗时与能抓到的 bug（本机示例量级，建议跑出自己的数字）：

| 层 | 写法 | 单类耗时 | 抓到的 bug 示例 |
| --- | --- | --- | --- |
| 单元 | Mockito（第 3 节） | 约 30 毫秒 | 重复标题没拦住、状态没翻转 |
| 切片 | @WebMvcTest（第 4 节） | 约 2 秒 | 路由写错、code 字段拼错、异常没被翻译 |
| 集成 | Testcontainers（第 6 节） | 约 20 秒 | 建表方言错误、事务没生效、端到端报文对不上 |

观察两个事实：三层耗时差三个数量级；每层抓的 bug 几乎不重叠。这就是分层的本质——不是哪层更好，是它们在保险柜的不同格子里各管一摊。把这张定价表带回第 1 节的失败项目：两千个全容器测试，按表重排后大约只有两三百个真的需要起容器。

## 9. 升级瞭望（Boot 4.0）

Boot 4.0（2025-11-20 GA，基于 Spring Framework 7）随主版本整体上移了测试基线：JUnit、Mockito 等依赖升到新的大版本，少量过时的测试工具被移除。本篇的分层定价与注解用法在 3.x 与 4.x 之间是连续的，迁移清单以官方迁移指南为准。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 三层的速度量级与置信各是什么？「全部 @SpringBootTest」毁掉的是什么？
2. @WebMvcTest 会不会装配你的 Service？service 依赖怎么处理、从哪个版本起用什么注解替代谁？
3. @DataJpaTest 的两个默认行为是什么？想让它用真库要改哪个配置？
4. Testcontainers 为什么比 H2 可信？举一个会假绿的方言差异场景。
5. @ServiceConnection 免掉了哪段样板代码？
6. 事务回滚测试在哪两种情况下拦不住脏数据？为什么说回滚让你漏验了一类行为？
7. 构造器注入与可测试性是什么关系？（030 篇的第二个理由）
8. @TestConfiguration 与 @ActiveProfiles 各适合什么场景？
