---
order: 330
title: Optional 与 null 防御：可能没有的值怎么说清楚
module: 'java'
category: 后端技术
difficulty: beginner
description: Optional 的创建与安全取值、map/flatMap 链式取值、orElse 与 orElseGet 家族的求值差异、ifPresentOrElse 与 or（Java 9+）、什么时候该返回 Optional、什么时候是反模式；用用户查询、嵌套 DTO、遗留代码迁移三个场景落地。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'java/290-LambdaFunctionalProgramming'
  - 'java/300-StreamAPI'
  - 'java/330-JavaFunctionalProgramming'
  - 'java/180-ExceptionHandlingMechanism'
prerequisites:
  - 'java/290-LambdaFunctionalProgramming'
---

## 知识点地图

- **知识类别**：null 防御与显式可选值——`java.util.Optional`，Java SE 官方 API 文档中 java.util 包下的独立容器类（Java 8 引入，Java 9/10/11 持续补强）。
- **解决什么问题**：`null` 是「没有值」的隐式表达，方法签名上看不出会不会返回 null，调用方漏判就是 `NullPointerException`——它常年是生产环境第一大异常。Optional 把「可能没有」写进**类型**里，编译器与阅读者都看得见。
- **什么时候用到**：仓库/DAO 按主键查询（查无此行是常态不是异常）；多层嵌套对象的安全取值；Stream 归约结果（`findFirst`/`max` 等官方 API 本来就返回它）。

## 前置知识

- [Lambda 与函数式编程](/java/290-LambdaFunctionalProgramming)：方法引用与链式调用——第 7 节已给出 Optional 三条军规，本篇收拢深化；
- [Stream API](/java/300-StreamAPI)：`findFirst()`/`max()` 返回 Optional 的既有用法；
- [异常处理机制](/java/180-ExceptionHandlingMechanism)：「查无此物」该用返回值表达还是抛异常的边界。

## 学习目标

读完本文你将能够：

1. 用 `empty`/`of`/`ofNullable` 三种工厂正确创建 Optional，并说清 `of(null)` 会怎样；
2. 不写 if 判断，用 map/filter/flatMap 写出「有空值就整体为空」的取值链；
3. 区分 `orElse`/`orElseGet`/`orElseThrow` 三个「取默认值」方法的求值时机；
4. 判断一个 API 该不该返回 Optional，并识别「Optional 当字段、当参数」两种反模式；
5. 把一段层层 `!= null` 的遗留代码改写成 Optional 风格。

预计 60 分钟，含 1 个找错练习与 2 道动手任务。

## 1. null 的问题与 Optional 的心智模型

先看 null 在签名里有多沉默：

```java
// 签名完全没说 user 可能为 null
public User findUser(String name) { ... }

User user = findUser(input);
System.out.println(user.getAge());   // 查无此人时：NullPointerException
```

**Optional 的心智模型**：把「可能有、可能没有」从文档与口头约定升级为返回类型的一部分——`Optional<User>` 读作「一个可能缺席的 User」。调用方拿到它后，**不 get 就用不了里面的值**，空值被逼到明面上处理。

```java
public Optional<User> findUser(String name) { ... }

findUser(input).ifPresentOrElse(
    user -> System.out.println(user.getAge()),
    ()    -> System.out.println("查无此人")
);
```

**边界先划清**：Optional 的官方定位是**方法返回类型**，表达「可能没有结果」。它不打算取代所有 null——字段、方法参数、Map 的值（`map.get` 返回 null 是 Map 的既有契约）都不建议包 Optional，第 6 节详述理由。

## 2. 创建：三个工厂与一条军规

```java
Optional<String> a = Optional.empty();            // 明确为空
Optional<String> b = Optional.of("data");         // 确定非空
Optional<String> c = Optional.ofNullable(input);  // 可空可非空，运行时见分晓
Optional<String> d = Optional.of(null);           // 立刻抛 NullPointerException！
```

**逐行讲解**：

1. `of(null)` 抛 NPE 是**故意的**：如果你确信值非空，就选 `of`——它把「我以为非空其实是空」这个 bug 提前在创建处炸掉，而不是等调用方取值时炸。换个写法用 `ofNullable`，这个 bug 会被静默吞掉、传播到更远的地方，更难查。
2. `ofNullable(input)` 用于「来源本身可能为 null」的场景：数据库查询、外部接口、Map 取值。它是三个工厂里最常用的一个。
3. **军规**：不要写 `new Optional<>(...)`（构造器私有），也不要 `return null` 一个 Optional——后者比不用 Optional 还糟：调用方得先判 Optional 自身为 null 再判值，套了两层空。

**易错点**：`Optional.of(repository.findByName(name))`——若 findByName 本身可能返回 null，这里就是 NPE 埋点。嵌套调用前先想清楚内层方法的 null 契约。

## 3. 取值：从 get 到 ifPresent 家族

| 方法 | 语义 | 风险 |
| --- | --- | --- |
| `get()` | 直接取值，空则抛 `NoSuchElementException` | 等于换个异常名的裸取值，不推荐 |
| `isPresent()` + `get()` | 先判再取 | 与 `!= null` 判空没本质区别，白包一层 |
| `ifPresent(consumer)` | 有值才执行消费，没有就什么都不做 | 安全，但不处理「没有」的分支 |
| `ifPresentOrElse(action, emptyAction)` | 有值走 action，没有走 emptyAction（Java 9+） | 两分支齐备，替代 isPresent+get |
| `orElse/orElseGet/orElseThrow` | 有值取值，没有取默认/抛异常 | 见第 4 节 |

```java
Optional<User> user = findUser(input);

// 反模式：Optional 用出了 null 的味道
if (user.isPresent()) {
    System.out.println(user.get().getAge());
}

// 推荐：类型驱动
user.map(User::getAge)
    .ifPresent(age -> System.out.println(age));

user.ifPresentOrElse(
    u -> sendWelcome(u),
    () -> log.info("用户不存在: {}", input)
);
```

**为什么反模式差**：`isPresent()+get()` 把 Optional 当成了「必须先检查的 nullable」，链式能力全部浪费；而且 `get()` 忘判就取的写法在 code review 里防不胜防——禁掉 `get()`、只留 `ifPresent`/`map`/`orElse` 家族，是把「可能为空」交给类型系统管的正路。

## 4. 默认值三兄弟：orElse 的参数永远会执行

```java
String name = findUser(input)
    .map(User::getName)
    .orElse(anonymousName());          // 无条件调用！

String name2 = findUser(input)
    .map(User::getName)
    .orElseGet(() -> anonymousName()); // 有值时不调用（惰性）
```

**逐段讲解**：

1. `orElse(T other)` 的参数是**按值传递的表达式**——`anonymousName()` 在这行代码执行时就求值了，不管 Optional 里有没有值。默认值是常量（`orElse("")`、`orElse(0)`）时用它没有任何代价。
2. `orElseGet(Supplier)` 只在需要时才调用 Supplier。默认值的构造有 I/O、有重计算、或有副作用（比如「查一次数据库兜底」「写一条审计日志」）时，**必须**用它。
3. 换成别的写法会发生什么：把带副作用的兜底写在 `orElse` 里，有值路径也会执行——真实案例是「每次查询都多发一次兜底 RPC」，QPS 一高就是把下游打挂。
4. `orElseThrow()`（无参，Java 10+）：空则抛 `NoSuchElementException`，比裸 `get()` 语义清楚；`orElseThrow(Supplier)` 可换成业务异常——`orElseThrow(() -> new UserNotFoundException(input))`，「查无此人走异常」的业务场景用它。

**判据表**：

| 需求 | 用哪个 |
| --- | --- |
| 默认值是常量/字面量 | `orElse(常量)` |
| 默认值要计算/有副作用 | `orElseGet(() -> ...)` |
| 没有就该当错误处理 | `orElseThrow(() -> 业务异常)` |

## 5. map / flatMap：链式安全取值

### 5.1 map：有值就转换，空就一路空下去

```java
Optional<String> city = findUser(input)
    .map(User::getAddress)      // Optional<Address>
    .map(Address::getCity);     // Optional<String>

System.out.println(city.orElse("未知城市"));
```

任何一个环节为空，结果就是空——**三层判空压缩成一条链**。等价的遗留写法是：

```java
User user = findUserOrNull(input);
if (user != null) {
    Address addr = user.getAddress();
    if (addr != null) {
        String city = addr.getCity();
        if (city != null) {          // 第三层
            System.out.println(city);
        }
    }
}
```

箭头形代码每层都是「先判再进」，漏一层就是 NPE；map 链把「判空」从每层手写变成类型规则，漏不掉。

### 5.2 flatMap：链上的方法本身返回 Optional 时防套娃

```java
// map 的结果类型：Optional<Optional<String>> —— 套娃
Optional<Optional<String>> nested = findUser(input)
    .map(u -> u.getNickname());      // 假设 getNickname 返回 Optional<String>

// flatMap 拍平：Optional<String>
Optional<String> flat = findUser(input)
    .flatMap(User::getNickname);
```

**规则一句话**：链上每个方法的返回值是普通类型用 `map`，是 `Optional<...>` 就用 `flatMap`。与 Stream 的 `flatMap`、290 篇第 7 节的口诀完全同构。

### 5.3 filter：链上加条件

```java
boolean hasAdult = findUser(input)
    .map(User::getAge)
    .filter(age -> age >= 18)
    .isPresent();                    // 有值且满足条件才为 true
```

`map → filter → orElse` 的三段式是可选值处理的最常见组合：取出来、筛一道、给个默认。

### 5.4 三个场景

- **场景一（用户中心，真实工程）**：个人主页展示昵称，用户没设置昵称时回退显示手机号掩码——`findUser(id).flatMap(User::getNickname).orElseGet(() -> maskPhone(user.getPhone()))`，把「昵称可选」这个业务事实直接写进了链。
- **场景二（配置中心降级）**：读配置项，读不到走默认配置并打警告——`configService.get("rate.limit").map(Integer::parseInt).filter(v -> v > 0).orElseGet(() -> { log.warn("配置缺失，使用默认限流"); return DEFAULT_LIMIT; })`。
- **场景三（Stream 收尾）**：从订单列表找「金额最大的待支付单」——`orders.stream().filter(Order::isPending).max(comparing(Order::getAmount))` 返回 `Optional<Order>`，用 `ifPresentOrElse` 区分「有待支付单、该催付」与「没有待支付单」两条业务分支。Stream 的归约端点（findFirst/findAny/min/max/reduce）天然返回 Optional，这是它最常见的来源。

## 6. 什么时候不该用 Optional

290 篇第 7 节的三条军规在此展开成完整的边界表：

| 位置 | 该不该用 | 理由 |
| --- | --- | --- |
| 方法返回值 | 该（官方定位） | 把「可能没有」写进类型 |
| 字段 | 不该 | Optional 不可序列化（JPA/Jackson 都有坑）、字段本身还可能为 null，两层空 |
| 方法参数 | 不该 | 调用方多一层包装负担；重载两个方法更清楚 |
| Map 的 key/value | 不该 | `map.get` 返回 null 是 Map 既有契约；想要 Optional 语义用 `getOrDefault` |
| 构造器参数 | 不该 | 同参数 |
| 集合的返回值 | 视情况 | 返回空集合（`List.of()`）优于 Optional<List>，「没有」用空集合表达更顺 |

**字段反模式的现场**：

```java
// 反模式：Optional 字段
public class User {
    private Optional<Address> address;   // address 本身可能为 null！
}

// 修复：字段保持原类型，null 语义收敛在访问器
public class User {
    private Address address;             // 可为 null

    public Optional<Address> getAddress() {
        return Optional.ofNullable(address);   // 出口处包装
    }
}
```

字段不包、出口包——「内部承认 null 存在，对外只发布 Optional」，这样 JPA/JSON 序列化不受影响，调用方又拿到了类型化的空值信号。

## 7. 遗留代码迁移实操

拿一段典型遗留代码走一遍迁移：

```java
// 迁移前：三层判空 + 默认值散落
public String getDisplayCity(Long userId) {
    User user = userDao.findById(userId);
    if (user == null) {
        return "未知城市";
    }
    Address addr = user.getAddress();
    if (addr == null || addr.getCity() == null) {
        return "未知城市";
    }
    return addr.getCity();
}
```

```java
// 迁移后：一层链 + 默认值只写一次
public String getDisplayCity(Long userId) {
    return userDao.findById(userId)      // 让 DAO 直接返回 Optional<User>
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("未知城市");
}
```

**迁移要点逐条**：

1. DAO 层改为返回 `Optional<User>`（Spring Data JPA 的 `findById` 本来就是），null 契约从接口上消失；
2. 重复的默认值「未知城市」从三处收敛为 `orElse` 一处——漏改默认文案的 bug 类别直接消失；
3. 中间层判空（addr 是否为 null）交给 map 的空传播，代码行数减半；
4. 若「查无此人」与「没填地址」业务上要区别对待，就不能全串一条链——拆两段，各自 `orElse`/`orElseThrow`，不要为省行数把不同的「没有」混成一个。

**什么时候不要迁移**：局部变量之间的判空、私有方法内部逻辑明确的短路检查，改写收益低；Optional 服务于**跨方法的边界契约**，不是全局代码风格运动。

## 8. 动手实践

### 任务一：改写查值链（热身）

给定 `Optional<Order> order`，安全取到「收货人手机号」（Order → Address → phone），没有则返回空串。只许用 map/flatMap/orElse，不许出现 if 和 null。

提示：判断链上哪个方法返回的是 Optional，决定用 map 还是 flatMap。

### 任务二：默认值找错（实战）

下面的代码有一处隐患、一处语义错误。先别运行，找出来：

```java
public class NicknameService {
    private final UserDao userDao;

    public String displayName(Long userId) {
        return userDao.findById(userId)              // Optional<User>
            .map(u -> u.getNickname())               // 返回 Optional<String>
            .orElse(fallbackNickname());             // 本地文件读取昵称兜底
    }

    private boolean isVip(Long userId) {
        return userDao.findById(userId)
            .map(u -> u.getVipLevel())               // Integer，可为 null
            .orElse(0) > 0;
    }
}
```

提示一：`getNickname()` 的返回类型与 map 的结果类型匹配吗？提示二：`fallbackNickname()` 做了什么、多久执行一次？提示三：`getVipLevel()` 返回 null 时，`orElse(0)` 真的会兜住吗？

**参考实现（先自己写完再展开对照）**：

```java
public String displayName(Long userId) {
    return userDao.findById(userId)
        .flatMap(User::getNickname)               // 修正一：getNickname 返回 Optional，用 flatMap 防套娃
        .orElseGet(this::fallbackNickname);       // 修正二：文件 I/O 有代价，惰性求值
}

private boolean isVip(Long userId) {
    return userDao.findById(userId)
        .map(u -> u.getVipLevel())                // Optional<Integer>，getVipLevel 为 null 时整条链为空
        .orElse(0) > 0;                           // 修正三：null 会被 map 吞成空，orElse(0) 恰好兜住——
}                                                  // 语义成立但依赖隐式行为，更稳的写法是
                                                   // .map(v -> v != null && v > 0).orElse(false)
```

三处对应：`map` 接到返回 Optional 的方法会得到 `Optional<Optional<String>>`，后面 `orElse("")` 的类型都对不上（编译期就可能暴露）；`orElse(fallbackNickname())` 无论用户在不在都会读一次本地文件，查询热点上是无谓 I/O；`getVipLevel()` 返回 null 的场景里 `map` 直接产出空 Optional，`orElse(0)` 才生效——结果碰巧正确，但这是「靠 map 吞 null」的隐式契约，显式写明才算把语义钉死。

### 任务三：遗留代码改造

自己写一个三层嵌套的遗留类（School → ClassRoom → HeadTeacher → name，每层都可能为 null），提供 `getHeadTeacherName(long schoolId)`：找到返回名字，任一层缺失返回「待分配」。要求提供两版：判空版与 Optional 链版，互相验证输出一致。

提示：链版先想清楚「哪一层是 Optional 来源」（DAO 出口），其余层都是 map；比较两版行数与漏判风险。

## 参考与致谢

- Oracle, *Java SE API Specification*：`java.util.Optional` 类文档（https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html ），含 Java 9 新增 `ifPresentOrElse`/`or`/`stream` 与 Java 10 新增 `orElseThrow()` 的官方语义；
- JDK 源码注释（Brian Goetz 对 Optional 设计定位的说明：仅为返回类型设计，非字段/参数用途）；
- 模块内 290-LambdaFunctionalProgramming 第 7 节、300-StreamAPI、330-JavaFunctionalProgramming 第 4.7 节的既有 Optional 片段，本篇为其独立成篇的收拢与深化。
