---
order: 410
title: Java 记录类
module: 'java'
category: 后端技术
difficulty: intermediate
description: 用一个真实接口场景学会 record：一行声明替代 30 行样板，紧凑构造器做校验，List.copyOf 防御可变字段，再看字节码与序列化层面的底层行为。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/800-JavaSealedClassesPatternMatching'
  - 'java/200-EqualsHashCodeContract'
  - 'java/850-SpringBootDataAccess'
  - 'java/460-JavaTextBlock'
prerequisites:
  - 'java/150-OOP'
  - 'java/200-EqualsHashCodeContract'
---

## 前置知识

- [面向对象编程](/java/150-OOP)：知道类、字段、构造器、方法怎么写，本文要在它基础上做减法；
- [equals 与 hashCode 契约](/java/200-EqualsHashCodeContract)：record 自动生成这两个方法，你得能判断"生成得对不对"。

## 学习目标

读完本文你将能够：

1. 用一行 `record` 声明替代手写的构造器、访问器、equals、hashCode、toString；
2. 说出 record 自动生成了什么、没生成什么，以及访问器为什么没有 `get` 前缀；
3. 用紧凑构造器做参数校验与规范化，说出它与普通构造器的分工；
4. 识别"字段是可变对象"的假不可变陷阱，并用 `List.copyOf` 修复；
5. 在 Spring Boot 接口里把请求/响应 DTO 换成 record，并处理 JSON 字段名不匹配；
6. 用 `javap` 看到 record 在字节码里的真实样子，解释为什么反序列化必须走规范构造器。

预计 60 到 80 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：一个接口要写 30 行样板

假设你在 FANDEX 这种三端 monorepo 里维护一个商品接口：客户端提交商品名和价格，服务端返回商品 ID。Java 里这个"请求体"得先是个类。按传统写法，一个只装两个字段的不可变值对象长这样：

```java
public final class CreateProductRequest {
    private final String name;
    private final long priceCents;

    public CreateProductRequest(String name, long priceCents) {
        this.name = name;
        this.priceCents = priceCents;
    }

    public String getName() { return name; }
    public long getPriceCents() { return priceCents; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CreateProductRequest that)) return false;
        return priceCents == that.priceCents && Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, priceCents);
    }

    @Override
    public String toString() {
        return "CreateProductRequest[name=" + name + ", priceCents=" + priceCents + "]";
    }
}
```

30 行，只为表达"两个字段、不可变、按值比较"。痛点不只是长：

1. **改一处要动五处**：新增一个字段，构造器、访问器、equals、hashCode、toString 全得跟着改，漏一处就是隐患；
2. **equals 和 hashCode 容易写歪**：equals 比了所有字段、hashCode 只用了部分字段，这种错误放进 HashMap 就是"存进去找不到"；
3. **信噪比低**：读代码的人要在 30 行样板里找业务含义。

Lombok 的 `@Data` 注解能生成这些代码，但它是编译期插件，不是语言：换 IDE 要装插件、升级 JDK 偶尔踩兼容、代码评审时"生成的方法"看不见。Java 16 正式的 record（JEP 395，14/15 预览）把这件事收进语言本身。

## 2. 动手做：一行声明替代 30 行

新建 `CreateProductRequest.java`，整份文件只写这一行：

```java
public record CreateProductRequest(String name, long priceCents) {}
```

写个 main 验证它真的"什么都会"：

```java
public class RecordDemo {
    public static void main(String[] args) {
        var req1 = new CreateProductRequest("手办", 8800);
        var req2 = new CreateProductRequest("手办", 8800);

        System.out.println(req1.name());        // 手办（注意：name()，不是 getName()）
        System.out.println(req1.priceCents());  // 8800
        System.out.println(req1.equals(req2));  // true（按字段值比较，不是按引用）
        System.out.println(req1.hashCode() == req2.hashCode()); // true
        System.out.println(req1);               // CreateProductRequest[name=手办, priceCents=8800]
    }
}
```

运行后逐行对答案，你会发现编译器替你写好了第 1 节那 30 行的全部内容。record 的声明读作："这是一个叫 CreateProductRequest 的透明数据载体，有两个组件 name 与 priceCents，仅此而已。"

实验一：试着给 `req1.name` 赋值，或者写一个 `class FakeRecord extends CreateProductRequest`。两个都会编译报错——record 隐式 final、组件隐式 final，这是语言层面写死的，不是约定。

### record 自动生成了什么

| 成员 | 生成规则 | 说明 |
| ---- | -------- | ---- |
| 规范构造器 | `new CreateProductRequest(name, priceCents)` | 参数与组件一一对应 |
| 访问器 | `name()`、`priceCents()` | 与组件同名，无 `get` 前缀 |
| equals / hashCode | 逐组件比较、逐组件计算 | 正确处理 null；浮点组件用 `Double.compare`（NaN 等于 NaN） |
| toString | `类名[组件=值, ...]` | 调试打印友好 |

没生成的：setter（不可变，本来也不该有）、无参构造器、Builder。record 也 **不能 extends 任何类**（隐式 final），但可以实现接口；可以有 static 字段、static 方法和实例方法。

`get` 前缀缺失是有意的：record 的组件是"值"而不是"属性"，`point.x()` 读作"取 x 这个值"。要注意的唯一场合是框架反射：部分老库按 JavaBean 规范找 `getXxx`，找不到就会静默跳过字段，遇到时换新版本库或加注解。

## 3. 为什么这么设计：透明载体与值语义

record 对应 Java 官方说法是"透明载体"（transparent carrier）：名字即语义、组件即数据、不藏行为。三条设计约束值得记住：

1. **不可变优先**：组件隐式 final，类隐式 final。不可变对象天然线程安全（JMM 对 final 字段有可见性保证，JLS 17.5），在 2026 年虚拟线程大行其道的并发代码里，这是最便宜的 defensive 手段；
2. **值语义**：两个字段全等的 record 就是相等的。这让它能安全地做 Map 的 key、放进 Set 去重——`equals`/`hashCode` 由编译器统一生成，不会出现手写时的"比了 A 忘了 B"；
3. **构造路径唯一**：所有构造器最终都要委托到规范构造器，字段只在这一个地方被赋值。

从类型论角度看，record 是"乘积类型"：`Point = double x double`。与密封类型（"和类型"）组合就是完整的代数数据类型，那是下一篇 [密封类与模式匹配](/java/800-JavaSealedClassesPatternMatching) 的主角，本文不展开。

## 4. 紧凑构造器：校验和规范化的唯一入口

光有数据不够，真实请求需要校验。给 record 加一个"紧凑构造器"——不写参数列表、方法体执行完编译器自动补上字段赋值：

```java
public record CreateProductRequest(String name, long priceCents) {
    public CreateProductRequest {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("商品名不能为空");
        }
        if (priceCents < 0) {
            throw new IllegalArgumentException("价格不能为负: " + priceCents);
        }
        name = name.trim();  // 规范化：重新给参数赋值即可，编译器负责赋给字段
    }
}
```

两个细节容易懵：

- **紧凑构造器里给 `name` 赋值，赋的是参数不是字段**。方法体跑完，编译器把（可能已被你改过的）参数值写入字段。所以 `name = name.trim()` 是合法且常用的规范化写法；
- **自定义辅助构造器必须第一行委托**，要么 `this(...)` 调另一个构造器，最终汇入规范构造器：

```java
public record Money(long cents, String currency) implements Comparable<Money> {
    public Money {
        currency = currency.toUpperCase();       // 规范化：cny -> CNY
        if (cents < 0) throw new IllegalArgumentException("金额不能为负");
    }

    // 辅助构造器：从元构造，必须委托
    public Money(double yuan, String currency) {
        this(Math.round(yuan * 100), currency);
    }

    @Override
    public int compareTo(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("不能比较不同币种");
        }
        return Long.compare(cents, other.cents);
    }

    public Money add(Money other) {              // 不可变风格：返回新对象
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("币种不一致");
        return new Money(cents + other.cents, currency);
    }
}
```

实验二：把 `Money(double yuan, String currency)` 里的 `this(...)` 那行删掉直接编译，看真实报错（`constructor is not canonical`一类），体会"构造路径唯一"是编译器强制的。

## 5. 第一个大坑：record 不可变是"引用不可变"

record 保证的是组件引用不变，不保证引用指向的对象不变：

```java
// 假不可变：外面随时能改它的"内心"
public record TaggedProduct(String name, List<String> tags) {}

var p = new TaggedProduct("手办", new ArrayList<>(List.of("新品")));
p.tags().add("热门");       // 改的不是 record，是它引用的 ArrayList
System.out.println(p);      // TaggedProduct[name=手办, tags=[新品, 热门]]——已经被改了
```

这直接破坏值语义：两个"相等"的 record 放进 HashSet 后一个被改了内容，集合行为就乱了。修复在紧凑构造器里做防御性拷贝：

```java
public record TaggedProduct(String name, List<String> tags) {
    public TaggedProduct {
        tags = List.copyOf(tags);   // 不可变拷贝，null 元素与 null 集合都会抛异常
    }
}

var p = new TaggedProduct("手办", List.of("新品"));
p.tags().add("热门");   // 运行时 UnsupportedOperationException，改不动了
```

自查清单：你的 record 里有 `List`、`Map`、`Date`、数组或自定义可变对象组件吗？有的话，紧凑构造器里拷贝了吗？

## 6. 实战：放进 Spring Boot 接口

2026 年的 Spring Boot 3.x 项目里，record 是接口层 DTO 的默认选择，框架支持已经是"开箱即用"：

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {

    public record ProductResponse(long id, String name, long priceCents) {}

    @PostMapping
    public ProductResponse create(@RequestBody CreateProductRequest req) {
        long id = productService.create(req.name(), req.priceCents());
        return new ProductResponse(id, req.name(), req.priceCents());
    }
}
```

Jackson 从 2.12 起原生支持 record：序列化调用访问器，反序列化调用规范构造器，不依赖 setter，也不需要 `@JsonCreator` 之类的手工接线。唯一常见问题是字段名：

```java
// 对端 JSON 用蛇形命名：{"product_name": "手办", "price_cents": 8800}
public record CreateProductRequest(
        @JsonProperty("product_name") String name,
        @JsonProperty("price_cents") long priceCents) {
    public CreateProductRequest {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("商品名不能为空");
    }
}
```

同名团队工程也可以全局配 `PropertyNamingStrategies.SNAKE_CASE`，二选一即可。顺带一提，`@ConfigurationProperties` 配置类同样支持 record 绑定，启动后天然只读。

### 局部 record：方法内的临时数据袋

流程中间需要一个"装两个值"的临时结构时，不必新开文件，方法体内直接声明（Java 16+）：

```java
// 统计每个标签出现的商品数：先把 (商品, 标签) 拍平，再分组
record ProductTag(String product, String tag) {}
Map<String, Long> countByTag = products.stream()
        .flatMap(p -> p.tags().stream().map(t -> new ProductTag(p.name(), t)))
        .collect(Collectors.groupingBy(ProductTag::tag, Collectors.counting()));
```

局部 record 不能加访问修饰符，作用域只在方法内。它替代的是当年"内部类装临时结果"的十行样板。

## 7. 底层速览：字节码与序列化里发生了什么

不用背，但建议亲手看一次，面试和排查序列化问题时都用得上。

```java
record Point(int x, int y) {}
// 编译后执行：javap -v Point.class
```

关键字节码事实：

1. 类标志位带 `ACC_FINAL`，同时带一个专门的 `ACC_RECORD` 标志；
2. 类文件里多了一个 `Record` 属性，记录组件的名字与类型，反射 API（`Class::getRecordComponents`）据此工作；
3. equals/hashCode/toString 的实现在 `java.lang.runtime.ObjectMethods` 里，通过 invokedynamic（`ObjectMethods.bootstrap`）惰性生成，不是编译期展开成一大段字节码。

序列化方面有一条硬规定：record 不能声明 `serialVersionUID`（编译错误），版本由组件签名自动推导；更重要的是 **原生反序列化走规范构造器而不是反射绕过构造器赋值**——这反而让 record 比普通类更安全（非法状态在反序列化时就会被紧凑构造器拦下）。生产上原生序列化本就该换成 JSON/Protobuf，record 与 Jackson、Protobuf、Kryo 5+ 的配合都已成熟。GraalVM Native Image 对 record 无需额外反射配置（除非框架显式走反射，Jackson 那条老规矩依旧）。

至于性能：record 与手写 POJO 同量级，invokedynamic 惰性生成还会让"从未被调用的 toString"零成本。选 record 的理由是正确性和可读性，性能既不加分也不减分。

## 8. 什么时候不要用 record

| 场景 | 用 record 吗 | 原因 |
| ---- | ------------ | ---- |
| API 请求/响应 DTO、配置类、值对象（Money、坐标点） | 用 | 不可变 + 值语义正好匹配 |
| 局部多值返回、流处理中间结果 | 用 | 局部 record 几乎零成本 |
| JPA/Hibernate 实体 | 不用 | 实体需要可变与代理继承，仍是 POJO |
| 需要继承层次的可变领域对象 | 不用 | record 不能继承、不能变 |
| 组件超过七八个且类型雷同 | 慎用 | `new User("张三", 30, ...)` 位置参数换错不报错，考虑拆小或补 Builder |

组件多又怕传错位时，退路是静态工厂或手写 Builder（record 与 Builder 不冲突，build() 里 `new User(...)` 即可），或者干脆把大 record 拆成几个小 record 组合——大多数"字段太多"其实是建模问题。

## 易错点与最佳实践

**错误一：把可变 List 塞进组件还以为不可变。**
见第 5 节，紧凑构造器 `List.copyOf` 是标准修复。

**错误二：以为访问器叫 `getName()`。**
record 生成 `name()`。接到按 JavaBean 规范反射的旧库（部分老版本 BeanUtils、EL 表达式）时字段会"消失"，升级库或改用普通类。

**错误三：给 record 声明 `serialVersionUID`。**
编译错误。record 的序列化版本由组件自动推导，跨版本兼容请走 JSON/Protobuf。

**错误四：在辅助构造器里做校验。**

```java
public record Age(int value) {
    // 反例：校验写在辅助构造器里，绕过它直接 new Age(-1) 就漏网了
    public Age(String text) {
        this(Integer.parseInt(text));
        if (value < 0) throw new IllegalArgumentException(); // 此时字段已赋值，太晚
    }
}

// 正解：校验收敛到紧凑构造器，所有构造路径都经过它
public record Age(int value) {
    public Age {
        if (value < 0) throw new IllegalArgumentException("年龄不能为负: " + value);
    }
}
```

**错误五：注解贴上去却没生效。**
record 组件上的注解会同时尝试作用于组件、字段、构造器参数等多个位置，但前提是注解的 `@Target` 包含对应位置。校验类注解（如 Bean Validation）要看它是否声明了 `PARAMETER` 或 `RECORD_COMPONENT`，不然 `@NotNull String name` 是摆设。

**最佳实践**：新项目 DTO、配置、值对象一律 record；存量 Lombok POJO 不强迁，新代码不再新增；实体类保持 POJO。

## 本篇小结

- `record 一行声明` = 构造器 + 同名访问器 + 逐组件 equals/hashCode + toString，类隐式 final、组件隐式 final；
- 紧凑构造器是校验与规范化的唯一收敛点，规范化直接给参数重新赋值；
- "不可变"只到引用这一层，可变组件要用 `List.copyOf` 防御性拷贝；
- Jackson 2.12+、Spring Boot 3.x 原生支持，接口层 DTO 的默认选项；
- 字节码层靠 `Record` 属性 + `ObjectMethods`（invokedynamic）实现，原生反序列化走规范构造器；
- 实体、可变领域对象、需要继承的层次不用 record。

## 动手实践

1. **商品接口改造**：把第 1 节的 `CreateProductRequest` 补上 `category` 与 `tags`（List）两个组件，要求：tags 做防御性拷贝、category 为空时默认 `"未分类"`。思路：都在紧凑构造器里做，注意空串用 `isBlank` 判断。
2. **几何值对象**：你在 geometric-construct 里建模过点与线段，用 Java 再来一次——`record Point(double x, double y)` 与 `record Segment(Point a, Point b)`，给 Segment 写 `length()` 并验证"相同端点的两个 Segment equals 为 true"。思路：`Math.hypot(a.x()-b.x(), a.y()-b.y())`；嵌套 record 的 equals 是自动递归的，不用手写。
3. **抓一次字节码**：编译第 7 节的 `Point`，运行 `javap -v Point.class`，找到 `Record:` 属性与 `ObjectMethods.bootstrap`，截图或抄录进笔记。思路：JDK 自带 javap，无需额外工具；看不懂没关系，能指出"final 标志、Record 属性、invokedynamic"三样即可。
4. **排错练习**：下面代码想表达"一个不可变的购物车快照"，找出三处问题并修复。

```java
public record CartSnapshot(String userId, List<String> itemIds, Date createdAt) {}
```

思路：List 未拷贝可变；`Date` 是可变对象（2026 年应该用 `LocalDateTime` 或存 `Instant`）；没有任何校验。答案见第 4、5 节。

## 下一步

- [密封类与模式匹配](/java/800-JavaSealedClassesPatternMatching)：record（乘积类型）+ sealed（和类型）+ switch 解构，Java 的代数数据类型全家桶；
- [equals 与 hashCode 契约](/java/200-EqualsHashCodeContract)：想知道自动生成的 equals 在 HashMap 里怎么工作的，读它；
- [Spring Boot 数据访问](/java/850-SpringBootDataAccess)：record 作为投影类配合 JDBC/JPA 的工程用法。
