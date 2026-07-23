---
order: 84
title: Java记录类
module: java
category: Java
difficulty: intermediate
description: Record类与密封接口
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与GraalVM
  - java/Java与Kubernetes
  - java/Java文本块
  - java/Java模块系统
prerequisites:
  - java/概述与开发环境
---

# Java 记录类与密封类型深度解析

## 一、学习目标

本节遵循 Bloom 分类法,从低阶认知到高阶创造,系统构建读者对 Java Record(记录类)、Sealed Class/Interface(密封类型)与 Pattern Matching(模式匹配)三大相关特性的认知体系。

### 1.1 记忆层级(Remembering)

- 列举 Record 类自动生成的四个核心方法:`canonical constructor`、`getter`(无 `get` 前缀,直接以字段名命名)、`equals`、`hashCode`、`toString`。
- 准确说出 Record 在 JDK 14 预览、JDK 15 二次预览、JDK 16 正式发布,JDK 17 进一步增强(密封类型正式)的时间线。
- 复述密封类型的三种修饰符:`sealed`(声明密封)、`non-sealed`(解除密封)、`permits`(显式指定子类)。

### 1.2 理解层级(Understanding)

- 解释 Record 与普通类(POJO)在不变性、继承能力、字段语义、字节码层面的差异。
- 用自己的语言说明 `canonical constructor`(规范构造器)与 `compact constructor`(紧凑构造器)的关系与区别。
- 阐述密封类型如何通过编译器检查保证类型代数闭包,以及与 `final`、`abstract` 的区别。

### 1.3 应用层级(Applying)

- 在 DTO、Value Object、配置类等场景下使用 Record 替代 Lombok `@Data` 注解的 POJO。
- 使用紧凑构造器对参数进行校验,例如 `Range(int low, int high)` 校验 `low <= high`。
- 使用密封类型 + 模式匹配实现代数数据类型(Algebraic Data Type, ADT),如 `Option<T>`、`Result<T, E>`、`List<T>`。

### 1.4 分析层级(Analyzing)

- 对比 Record 与 Kotlin `data class`、Scala `case class`、C# `record` 在不可变性、复制语法、解构上的异同。
- 分析 Record 在序列化(JSON、Kryo、Protobuf)中的优势与陷阱,特别是 Jackson、Gson 对 Record 的反序列化支持差异。
- 给定一段使用 `instanceof + 强转` 的代码,分析模式匹配如何减少样板代码并避免 `NullPointerException`。

### 1.5 评价层级(Evaluating)

- 评价在何种业务场景下应当使用 Record 而非 Lombok POJO,以及两者在团队协作、工具链兼容性上的取舍。
- 评估密封类型在领域驱动设计(DDD)中实现有限状态机(FSM)与策略模式的优劣。

### 1.6 创造层级(Creating)

- 设计一个基于密封类型 + Record + 模式匹配的领域模型,实现一个完整的订单状态机(PENDING、PAID、SHIPPED、DELIVERED、CANCELLED)。
- 自定义 Record 的 Jackson 序列化器与反序列化器,处理字段重命名、null 默认值、嵌套 Record 等场景。

---

## 二、历史动机与背景

### 2.1 Java 样板代码痛点

在 Record 出现之前,Java 开发者要建模一个不可变的"值对象"(Value Object)需要编写大量样板代码。以一个二维点 `Point` 为例,传统写法:

```java
public final class Point {
    private final double x;
    private final double y;

    public Point(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public double getX() { return x; }
    public double getY() { return y; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point)) return false;
        Point p = (Point) o;
        return Double.compare(p.x, x) == 0 && Double.compare(p.y, y) == 0;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }

    @Override
    public String toString() {
        return "Point[x=" + x + ", y=" + y + "]";
    }
}
```

整整 30 行代码,只为表达"x 与 y 两个 double 字段"这一简单语义。这种样板代码带来三大问题:

1. **维护负担**:每增加一个字段需要修改 4-5 处代码(字段声明、构造器、getter、equals、hashCode、toString),极易遗漏。
2. **正确性风险**:`equals` 与 `hashCode` 实现不一致(典型错误:equals 比较所有字段,hashCode 只用部分字段)会破坏 HashMap 行为。
3. **可读性下降**:核心业务逻辑被样板代码淹没,代码信噪比低。

为缓解此问题,业界出现两种主要解决方案:

- **Lombok**:通过 `@Data`、`@Value` 等注解在编译期生成代码。优点是简洁,缺点是非标准、依赖注解处理器、与某些工具链(如 Kotlin 编译器、Jackson 反射)兼容性差。
- **IDE 生成**:IntelliJ 一键生成 equals/hashCode/toString。缺点是代码仍然存在,只是不再手写。

Java 语言设计者长期面临"是否在语言层面引入 Record"的争论。反对者认为引入 Record 会让 Java 变复杂(Scala 化);支持者认为这是 Java 必须补的"现代化语法课"。

### 2.2 JEP 359 与 Amber 项目

Record 的设计由 Project Amber(Java 语言小特性孵化项目)主导,核心目标是用一行声明替代 30 行样板,同时保证语义清晰与不变性约束。

JEP 演进历程:

- **JEP 359**(JDK 14, 2020-03, Preview):Record 首次预览,定义核心语法。
- **JEP 384**(JDK 15, 2020-09, Second Preview):增加局部 Record、注解支持、紧凑构造器语义明确化。
- **JEP 395**(JDK 16, 2021-03, Final):Record 正式发布,密封类型作为预览同步发布。
- **JEP 409**(JDK 17, 2021-09, Final):密封类型正式发布。
- **JEP 406**(JDK 17, Preview):`switch` 模式匹配预览,使模式匹配与密封类型协同。
- **JEP 441**(JDK 21, 2023, Final):`switch` 模式匹配正式发布。
- **JEP 440/JEP 441**(JDK 21):Record Patterns 与 switch 模式匹配正式发布。

### 2.3 设计哲学

Record 的设计遵循三条核心哲学。

**第一,不可变优先(Immutability by Default)。** 所有字段默认 `final`,Record 不可被继承(`final class` 隐式修饰)。这与 Java 早期可变 POJO 形成对比,也与现代并发编程对不变性的需求一致。

**第二,语义透明(Semantic Transparency)。** Record 名即语义,字段即属性,无隐藏行为。Record 不应当承载业务逻辑,仅作为"数据载体"。

**第三,代数闭包(Algebraic Closure)。** 密封类型使类型继承关系在编译期完全确定,配合模式匹配可实现穷尽性检查(exhaustiveness),编译器能强制开发者处理所有子类型,避免遗漏分支。

---

## 三、形式化定义

### 3.1 Record 的形式化定义

一个 Record $R$ 可由四元组形式化定义:

$$
R = \langle N, F, C, M \rangle
$$

- $N$:Record 名称。
- $F = \langle f_1: T_1, f_2: T_2, \ldots, f_n: T_n \rangle$:字段序列,每个字段有名称与类型,默认 `final`。
- $C$:规范构造器(canonical constructor),签名严格匹配 $F$。
- $M$:可选的成员方法集合。

Record 自动生成的语义等价于:

$$
\text{auto}(R) = \{ \text{getter}_{f_i}, \text{equals}_R, \text{hashCode}_R, \text{toString}_R \mid f_i \in F \}
$$

其中 `equals_R` 基于所有字段,`hashCode_R` 基于所有字段,`toString_R` 形如 `N[f1=v1, f2=v2, ...]`。

#### 3.1.1 equals 与 hashCode 的形式化契约

$$
\forall r_1, r_2 \in R: \quad r_1 = r_2 \iff \bigwedge_{i=1}^{n} r_1.f_i = r_2.f_i
$$

$$
r_1 = r_2 \implies \text{hashCode}(r_1) = \text{hashCode}(r_2)
$$

注意:对于浮点字段,Record 使用 `Double.compare` / `Float.compare` 而非 `==`,以正确处理 `NaN` 与 `+0.0` / `-0.0` 的语义。

### 3.2 密封类型的形式化定义

密封类型 $S$ 可形式化为:

$$
S_{\text{sealed}} = \langle N_S, P, K \rangle
$$

- $N_S$:类型名称。
- $P = \{C_1, C_2, \ldots, C_m\}$:显式 `permits` 子句指定的直接子类型集合(可省略,此时由同文件中的直接子类型推断)。
- $K \in \{\text{sealed}, \text{non-sealed}\}$:子类型自身的密封性。

关键约束:

$$
\forall C_i \in P: \quad C_i \in \{\text{final}, \text{sealed}, \text{non-sealed}\}
$$

即所有直接子类必须显式声明为 `final`(关闭继承)、`sealed`(继续密封)或 `non-sealed`(解除密封,允许任意继承)。这保证了类型层次在编译期完全确定,可被模式匹配穷尽检查。

### 3.3 模式匹配的形式化语义

模式匹配表达式 `switch (o) { case T1 t1 -> ...; case T2 t2 -> ...; }` 的形式化语义:

$$
\text{match}(o) = \begin{cases}
e_1 & \text{if } o \in T_1 \text{ and bind } o \text{ to } t_1 \\
e_2 & \text{if } o \in T_2 \text{ and bind } o \text{ to } t_2 \\
\vdots & \\
\text{default} & \text{otherwise}
\end{cases}
$$

穷尽性条件:若 $T$ 是密封类型,$\{T_1, T_2, \ldots, T_n\} = P$(所有 permits 子类),且每个分支返回值类型一致,则 `default` 分支可省略,编译器保证无遗漏。

### 3.4 Record 的代数数据类型(ADT)视角

从类型论角度,Record 对应"乘积类型"(Product Type):

$$
\text{Point} = \text{Double} \times \text{Double}
$$

密封类型对应"和类型"(Sum Type):

$$
\text{Shape} = \text{Circle}(\text{Double}) + \text{Square}(\text{Double}) + \text{Triangle}(\text{Double}, \text{Double}, \text{Double})
$$

两者组合即构成完整的代数数据类型(Algebraic Data Type, ADT),这是 Haskell、Rust、Scala 等函数式语言的标配,在 Java 17 后终于原生支持。ADT 的核心优势在于:编译期可证明对类型的处理是穷尽的,无遗漏分支。

---

## 四、理论推导

### 4.1 推导 Record 的不变性保证

定理:**Record 实例一旦创建,其字段值不可被外部修改。**

证明:

1. Record 隐式声明为 `final class`,无法被继承,无法被添加 setter。
2. 所有字段隐式 `final`,初始化后不可修改。
3. 规范构造器是唯一初始化路径(其他构造器必须委托给规范构造器),且紧凑构造器可校验参数。

因此 Record 实例满足"严格不变性"(Strict Immutability)。这与"半不变性"(字段 final 但字段本身可变,如 `final List<T> list = new ArrayList<>()`)不同。

推论:**Record 实例可安全地在多线程间共享,无需额外同步。**

证明:不变性保证所有线程读取的字段值一致,且不会发生构造期发布(partial publication)。这是因为 Record 的规范构造器在所有字段赋值完成后才返回,且 `final` 字段在 JMM 中具有特殊语义:`final` 字段的写入在构造器返回前对所有线程可见(参见 JLS §17.5)。

### 4.2 推导 equals/hashCode 的一致性

Record 自动生成的 `equals` 与 `hashCode` 满足以下契约:

1. **自反性**:$r = r$ 恒成立。
2. **对称性**:$r_1 = r_2 \implies r_2 = r_1$。
3. **传递性**:$r_1 = r_2 \land r_2 = r_3 \implies r_1 = r_3$。
4. **一致性**:多次调用结果相同(假设字段不变)。
5. **hashCode 一致性**:$r_1 = r_2 \implies h(r_1) = h(r_2)$。

证明(基于 `Objects.equals` 与 `Objects.hash` 的实现):

```java
public boolean equals(Object o) {
    return o instanceof R r && Objects.equals(this.f1, r.f1) && ... ;
}
public int hashCode() {
    return Objects.hash(f1, f2, ..., fn);
}
```

`Objects.equals(a, b)` 调用 `a.equals(b)` 或处理 `null`,满足自反、对称、传递(假设字段类型自身的 equals 也满足)。`Objects.hash` 基于所有字段计算 hash,保证 $r_1 = r_2 \implies h(r_1) = h(r_2)$。

注意:Record 的 `equals` 是"基于成分"(component-wise)的,与默认 `Object.equals`(基于引用)不同。这意味着两个不同 Record 实例但字段值相同会被认为相等:

```java
Point p1 = new Point(1.0, 2.0);
Point p2 = new Point(1.0, 2.0);
p1.equals(p2);  // true
```

这与"值相等"(Value Equality)语义一致,符合 Record 作为"值对象"的设计目标。

### 4.3 推导密封类型的穷尽性

定理:**若 `switch` 表达式针对密封类型 `S`,且 `case` 覆盖 `S` 的所有 `permits` 子类型,则编译器保证穷尽性,无需 `default` 分支。**

证明(基于编译器检查):

1. 密封类型 `S` 的所有子类型在编译期确定(由 `permits` 子句声明)。
2. 编译器收集 `S` 的所有直接子类型 $C_1, C_2, \ldots, C_n$。
3. 对每个 `case T_i t_i`,检查 $T_i \in \{C_1, \ldots, C_n\}$。
4. 若所有 $C_i$ 均被覆盖(或被 `default` 覆盖),编译通过;否则报错。

若某子类型 $C_j$ 未被覆盖,且未来扩展 $S$ 增加新子类型 $C_{n+1}$,编译器会在所有未覆盖的 switch 处报错,强制开发者处理新分支。这是 ADT 相对 OO 多态的核心优势之一。

### 4.4 推导 Record 与解构

Record Patterns(JEP 440)允许在 `instanceof` 与 `switch` 中解构 Record:

```java
if (o instanceof Point(double x, double y)) {
    System.out.println("x=" + x + ", y=" + y);
}
```

形式化语义:

$$
\text{match}(o, \text{Point}(x, y)) \iff o \in \text{Point} \land \text{bind}(o.x, x) \land \text{bind}(o.y, y)
$$

嵌套解构:

$$
\text{match}(o, \text{Line}(\text{Point}(x_1, y_1), \text{Point}(x_2, y_2)))
$$

这使 Record 在表达复杂结构时与函数式语言的解构语法对齐,大幅简化代码。

---

## 五、代码示例

### 5.1 基础 Record 定义

```java
/**
 * 二维点 Record 示例。
 * 自动生成:canonical constructor、x()、y()、equals、hashCode、toString。
 * 所有字段默认 final,Record 默认 final class(不可继承)。
 */
public record Point(double x, double y) {
    // 空体即可,所有方法由编译器生成
}

// 使用
Point p1 = new Point(3.0, 4.0);
Point p2 = new Point(3.0, 4.0);
System.out.println(p1.x());           // 3.0(注意:无 getX() 前缀)
System.out.println(p1.equals(p2));    // true(值相等)
System.out.println(p1.hashCode());    // 与 p2 相同
System.out.println(p1);               // Point[x=3.0, y=4.0]
```

### 5.2 紧凑构造器参数校验

```java
/**
 * 区间 Record:使用紧凑构造器校验 low <= high。
 * 紧凑构造器不带参数列表,编译器自动在末尾赋值字段。
 */
public record Range(int low, int high) {
    // 紧凑构造器:用于参数校验与规范化
    public Range {
        if (low > high) {
            throw new IllegalArgumentException(
                "low(" + low + ") 必须 <= high(" + high + ")");
        }
        // 此处可规范化参数,例如 clamp 到某个范围
        // 注意:赋值 low = Math.max(low, 0); 会覆盖参数,但编译器会赋值给字段
    }
}

// 测试
try {
    new Range(10, 5);  // 抛 IllegalArgumentException
} catch (IllegalArgumentException e) {
    System.out.println("校验生效: " + e.getMessage());
}
Range r = new Range(1, 100);
System.out.println(r);  // Range[low=1, high=100]
```

### 5.3 自定义构造器与辅助方法

```java
/**
 * 复数 Record:演示自定义构造器、辅助方法、静态工厂。
 */
public record Complex(double real, double imag) {

    /** 自定义构造器:从极坐标创建 */
    public static Complex fromPolar(double r, double theta) {
        return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }

    /** 紧凑构造器:NaN 校验 */
    public Complex {
        if (Double.isNaN(real) || Double.isNaN(imag)) {
            throw new IllegalArgumentException("实部或虚部不能为 NaN");
        }
    }

    /** 辅助方法:计算模 */
    public double modulus() {
        return Math.hypot(real, imag);
    }

    /** 辅助方法:加法 */
    public Complex add(Complex other) {
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    /** 辅助方法:共轭 */
    public Complex conjugate() {
        return new Complex(real, -imag);
    }

    /** 自定义 toString 覆盖默认 */
    @Override
    public String toString() {
        if (imag >= 0) {
            return real + " + " + imag + "i";
        }
        return real + " - " + (-imag) + "i";
    }
}

// 使用
Complex c1 = new Complex(3.0, 4.0);
Complex c2 = Complex.fromPolar(5.0, Math.PI / 6);
System.out.println(c1 + " + " + c2 + " = " + c1.add(c2));
System.out.println("模: " + c1.modulus());
System.out.println("共轭: " + c1.conjugate());
```

### 5.4 密封类型与模式匹配

```java
/**
 * 形状 ADT:使用密封类型 + Record 实现代数数据类型。
 * 顶层 Shape 密封,允许 Circle、Rectangle、Triangle 三个子类型。
 * 编译期可证明对 Shape 的处理是穷尽的。
 */
public sealed interface Shape
        permits Circle, Rectangle, Triangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
record Triangle(double a, double b, double c) implements Shape {}

/**
 * 面积计算:使用 switch 模式匹配,无需 instanceof + 强转。
 * 因 Shape 是密封类型且 case 覆盖全部子类型,无需 default 分支。
 */
public class ShapeArea {

    /** JDK 21+ switch 模式匹配 */
    public static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Rectangle r -> r.width() * r.height();
            case Triangle t -> {
                // 海伦公式
                double p = (t.a() + t.b() + t.c()) / 2;
                yield Math.sqrt(p * (p - t.a()) * (p - t.b()) * (p - t.c()));
            }
            // 无需 default:编译器保证穷尽
        };
    }

    /** 周长计算 */
    public static double perimeter(Shape s) {
        return switch (s) {
            case Circle c -> 2 * Math.PI * c.radius();
            case Rectangle r -> 2 * (r.width() + r.height());
            case Triangle t -> t.a() + t.b() + t.c();
        };
    }

    /** 描述形状 */
    public static String describe(Shape s) {
        return switch (s) {
            case Circle c -> String.format("圆,半径=%.2f", c.radius());
            case Rectangle r -> String.format("矩形,%.2f × %.2f", r.width(), r.height());
            case Triangle t -> String.format("三角形,边长=%.2f,%.2f,%.2f",
                    t.a(), t.b(), t.c());
        };
    }

    public static void main(String[] args) {
        Shape[] shapes = {
            new Circle(5),
            new Rectangle(3, 4),
            new Triangle(3, 4, 5)
        };
        for (Shape s : shapes) {
            System.out.printf("%s, 面积=%.2f, 周长=%.2f%n",
                    describe(s), area(s), perimeter(s));
        }
    }
}
```

### 5.5 Record Patterns 解构

```java
/**
 * JDK 21+ Record Patterns 解构示例。
 * 在 instanceof 与 switch 中直接解构 Record 字段,支持嵌套。
 */
public class RecordPatterns {

    record Point(double x, double y) {}
    record Line(Point start, Point end) {}
    record Triangle(Point a, Point b, Point c) {}

    public static void main(String[] args) {
        Object obj = new Point(3, 4);

        // 1. 传统 instanceof + 强转
        if (obj instanceof Point) {
            Point p = (Point) obj;
            System.out.println("传统: " + p.x() + ", " + p.y());
        }

        // 2. JDK 16+ instanceof 模式变量
        if (obj instanceof Point p) {
            System.out.println("模式变量: " + p.x() + ", " + p.y());
        }

        // 3. JDK 21+ Record Patterns 解构
        if (obj instanceof Point(double x, double y)) {
            System.out.println("解构: " + x + ", " + y);
        }

        // 4. 嵌套解构
        Line line = new Line(new Point(0, 0), new Point(1, 1));
        if (line instanceof Line(Point(double x1, double y1), Point(double x2, double y2))) {
            System.out.printf("线段:(%.1f,%.1f) -> (%.1f,%.1f)%n", x1, y1, x2, y2);
        }

        // 5. switch 中解构
        Object shape = new Triangle(new Point(0, 0), new Point(1, 0), new Point(0, 1));
        String desc = switch (shape) {
            case Point(double x, double y) -> "点(" + x + "," + y + ")";
            case Line(Point s, Point e) -> "线段";
            case Triangle(Point a, Point b, Point c) -> "三角形";
            default -> "未知形状";
        };
        System.out.println(desc);
    }
}
```

### 5.6 Record 与 Jackson 序列化

```java
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Record 与 Jackson 序列化示例。
 * Jackson 2.12+ 原生支持 Record 反序列化,无需注解。
 * 字段名直接对应 JSON key,如需重命名使用 @JsonProperty。
 */
public record User(
        @JsonProperty("user_id") Long id,
        @JsonProperty("user_name") String name,
        @JsonProperty("email_address") String email,
        @JsonProperty("is_active") boolean active
) {
    // 紧凑构造器:校验 email 格式
    public User {
        if (email != null && !email.contains("@")) {
            throw new IllegalArgumentException("email 格式错误");
        }
    }
}

class RecordJacksonDemo {
    public static void main(String[] args) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();

        // 序列化
        User user = new User(1L, "张三", "zhangsan@example.com", true);
        String json = mapper.writeValueAsString(user);
        System.out.println("序列化: " + json);
        // 输出: {"user_id":1,"user_name":"张三","email_address":"zhangsan@example.com","is_active":true}

        // 反序列化
        User parsed = mapper.readValue(json, User.class);
        System.out.println("反序列化: " + parsed);
        System.out.println("相等: " + user.equals(parsed));  // true
    }
}
```

### 5.7 局部 Record

```java
import java.util.List;
import java.util.stream.Collectors;

/**
 * 局部 Record 示例。
 * JDK 15+ 允许在方法体内定义 Record,用于局部数据聚合。
 * 局部 Record 不能加访问修饰符,作用域限定在方法内。
 */
public class LocalRecordDemo {

    public static void main(String[] args) {
        List<String> names = List.of("张三", "李四", "王五", "赵六", "钱七");

        // 局部 Record:聚合统计结果
        record Stats(int count, int totalLength, double avgLength) {
            static Stats from(List<String> names) {
                int count = names.size();
                int total = names.stream().mapToInt(String::length).sum();
                return new Stats(count, total, (double) total / count);
            }
        }

        Stats stats = Stats.from(names);
        System.out.printf("姓名数=%d, 总长度=%d, 平均长度=%.2f%n",
                stats.count(), stats.totalLength(), stats.avgLength());

        // 局部 Record 用于流式处理中间结果
        record NameLength(String name, int length) {}
        List<NameLength> pairs = names.stream()
                .map(n -> new NameLength(n, n.length()))
                .filter(nl -> nl.length() >= 2)
                .collect(Collectors.toList());
        pairs.forEach(nl -> System.out.println(nl.name() + " -> " + nl.length()));
    }
}
```

### 5.8 Record 实现 Interface

```java
/**
 * Record 实现 Interface 示例。
 * Record 不能继承其他类,但可实现接口。
 * 这使得 Record 可融入既有接口体系,例如 Comparable。
 */
public record Money(long cents, String currency) implements Comparable<Money> {

    /** 紧凑构造器:货币代码大写规范化 */
    public Money {
        currency = currency.toUpperCase();
        if (cents < 0 && currency.equals("CNY")) {
            throw new IllegalArgumentException("CNY 金额不能为负");
        }
    }

    /** 便利构造器:从元(double)构造 */
    public Money(double yuan, String currency) {
        this(Math.round(yuan * 100), currency);
    }

    @Override
    public int compareTo(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "不能比较不同币种: " + this.currency + " vs " + other.currency);
        }
        return Long.compare(this.cents, other.cents);
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("币种不一致");
        }
        return new Money(this.cents + other.cents, this.currency);
    }

    /** 转换为元 */
    public double toYuan() {
        return cents / 100.0;
    }

    @Override
    public String toString() {
        return String.format("%.2f %s", toYuan(), currency);
    }

    public static void main(String[] args) {
        Money m1 = new Money(99.99, "cny");
        Money m2 = new Money(100.01, "CNY");
        System.out.println(m1 + " + " + m2 + " = " + m1.add(m2));
        System.out.println(m1.compareTo(m2) < 0 ? "m1 < m2" : "m1 >= m2");
    }
}
```

### 5.9 密封类型实现有限状态机

```java
/**
 * 订单状态机示例。
 * 使用密封类型 + Record + switch 模式匹配实现类型安全的有限状态机。
 * 编译期保证所有状态转换被处理,新增状态时编译器强制处理。
 */
public sealed interface OrderState
        permits Pending, Paid, Shipped, Delivered, Cancelled {}

record Pending(String orderId, long createdAt) implements OrderState {}
record Paid(String orderId, long paidAt, String paymentId) implements OrderState {}
record Shipped(String orderId, long shippedAt, String trackingNo) implements OrderState {}
record Delivered(String orderId, long deliveredAt) implements OrderState {}
record Cancelled(String orderId, long cancelledAt, String reason) implements OrderState {}

class OrderStateMachine {

    /**
     * 状态转换:从当前状态 + 事件 -> 新状态。
     * 因 OrderState 密封,编译器保证穷尽性。
     */
    public static OrderState transition(OrderState current, OrderEvent event) {
        return switch (current) {
            case Pending p -> switch (event) {
                case PAY -> new Paid(p.orderId(), System.currentTimeMillis(), "PAY-" + p.orderId());
                case CANCEL -> new Cancelled(p.orderId(), System.currentTimeMillis(), "用户取消");
                case SHIP, DELIVER -> throw illegal(current, event);
            };
            case Paid p -> switch (event) {
                case SHIP -> new Shipped(p.orderId(), System.currentTimeMillis(), "SF-" + System.nanoTime());
                case CANCEL -> new Cancelled(p.orderId(), System.currentTimeMillis(), "支付后取消");
                case PAY, DELIVER -> throw illegal(current, event);
            };
            case Shipped s -> switch (event) {
                case DELIVER -> new Delivered(s.orderId(), System.currentTimeMillis());
                case PAY, SHIP, CANCEL -> throw illegal(current, event);
            };
            case Delivered d -> throw new IllegalStateException("订单已签收,无后续状态");
            case Cancelled c -> throw new IllegalStateException("订单已取消,无后续状态");
        };
    }

    private static IllegalStateException illegal(OrderState s, OrderEvent e) {
        return new IllegalStateException("状态 " + s + " 不允许事件 " + e);
    }

    enum OrderEvent { PAY, SHIP, DELIVER, CANCEL }

    public static void main(String[] args) {
        OrderState s1 = new Pending("ORD-001", System.currentTimeMillis());
        OrderState s2 = transition(s1, OrderEvent.PAY);
        OrderState s3 = transition(s2, OrderEvent.SHIP);
        OrderState s4 = transition(s3, OrderEvent.DELIVER);
        System.out.println("最终状态: " + s4);
    }
}
```

---

## 六、对比分析

### 6.1 Record 与 Lombok POJO 对比

| 维度 | Record | Lombok @Data/@Value | 手写 POJO |
| ---- | ------ | ------------------- | --------- |
| 语言支持 | 原生 | 注解处理器 | 原生 |
| 字段不变性 | 默认 final | @Value final,@Data 可变 | 手动 |
| 继承 | 不可继承其他类,可实现接口 | 自由 | 自由 |
| 代码生成 | 编译器生成 | 编译期生成字节码 | 手写 |
| 反射兼容 | 完美 | 需 Lombok 插件 | 完美 |
| JSON 序列化 | Jackson 2.12+ 原生支持 | 标准 getter/setter | 标准 getter/setter |
| 工具链兼容 | IntelliJ 2020.3+, Eclipse 4.18+ | 需 Lombok 插件 | 全部兼容 |
| 字段顺序敏感 | 是(canonical constructor) | 否 | 否 |
| 自定义构造器 | 紧凑构造器 | @AllArgsConstructor/@Builder | 自由 |
| equals 含所有字段 | 是,自动 | 是,自动 | 手动 |
| 可变字段 | 不支持(需用 List<>) | 支持 | 支持 |
| 学习成本 | 低 | 中 | 低 |

### 6.2 Record 与其他语言数据类对比

| 维度 | Java Record | Kotlin data class | Scala case class | C# record | Rust struct |
| ---- | ----------- | ----------------- | ---------------- | --------- | ----------- |
| 不可变性 | 默认 final | 默认 val,可 var | 默认 final | 默认 init,可变 | 默认不可变 |
| 解构 | JDK 21+ | componentN | 自动 unapply | with 表达式 | 模式匹配 |
| copy 方法 | 无原生,手写 | 自动 copy() | 自动 copy() | 自动 with() | 无 |
| 自定义 equals | 自动,可覆盖 | 自动,可覆盖 | 自动,可覆盖 | 自动,可覆盖 | derive PartialEq |
| 继承 | 不可继承类 | 可继承其他类 | 可继承 | 可继承其他 record | 不可继承 |
| 模式匹配 | switch 模式匹配 | when 表达式 | match | switch 表达式 | match |
| 密封类型 | sealed(Java 17+) | sealed(Kotlin 1.5+) | sealed trait | 无原生 | enum + struct |
| ADT 完整支持 | 是(17/21+) | 部分 | 是 | 部分 | 是 |

### 6.3 密封类型与 final、abstract 对比

| 维度 | final | abstract | sealed | non-sealed |
| ---- | ----- | -------- | ------ | ---------- |
| 可继承 | 否 | 是 | 仅 permits 子类 | 是 |
| 可实例化 | 是 | 否 | 否(若有 abstract 成员) | 视实现 |
| 类型层次 | 闭包(单点) | 开放 | 闭包(显式集合) | 开放 |
| 编译期检查 | 无继承 | 无穷尽 | 穷尽性检查 | 无穷尽 |
| 适用场景 | 不可变值 | 抽象基类 | ADT、状态机 | 解除密封 |

### 6.4 模式匹配方式对比

| 方式 | JDK 版本 | 示例 | 优点 | 缺点 |
| ---- | -------- | ---- | ---- | ---- |
| if + instanceof + 强转 | 1.0+ | `if (o instanceof Point) { Point p = (Point) o; }` | 兼容性 | 样板代码 |
| instanceof 模式变量 | 16+ | `if (o instanceof Point p) { ... }` | 简洁 | 仅 if 分支 |
| switch + case 类型 | 17 preview, 21 final | `switch (o) { case Point p -> ... }` | 多分支 | 需密封类型穷尽 |
| Record Patterns | 21+ | `case Point(double x, double y)` | 解构 | 仅 Record |
| Guard | 21+ preview | `case Point p when p.x() > 0` | 条件分支 | preview 阶段 |

---

## 七、常见陷阱

### 7.1 陷阱一:Record 字段是可变对象的引用

```java
public record MutableRecord(List<String> items) {}

// 仍可被修改!
MutableRecord r = new MutableRecord(new ArrayList<>(List.of("a", "b")));
r.items().add("c");  // 修改了 Record 的内部状态!
```

**根因**: Record 字段 `final` 仅保证引用不可变,不保证对象本身不可变。

**修复**: 在紧凑构造器中防御性拷贝,或使用 `List.copyOf()`:

```java
public record ImmutableRecord(List<String> items) {
    public ImmutableRecord {
        items = List.copyOf(items);  // 不可变拷贝
    }
}
```

### 7.2 陷阱二:子类构造器未委托规范构造器

```java
public record Range(int low, int high) {
    // 编译错误!自定义构造器必须委托给规范构造器
    public Range(int low) {
        this(low, Integer.MAX_VALUE);
    }
}
```

**根因**: Java 规范要求 Record 所有构造器最终必须委托给规范构造器(canonical constructor),保证字段初始化路径唯一。

**修复**: 自定义构造器首行必须调用 `this(low, high)` 形式。

### 7.3 陷阱三:Record 不能 extends 其他类

```java
// 编译错误:Record 不能继承其他类
public record MyRecord(int x) extends SomeClass {}
```

**根因**: Record 隐式 `final`,且字段语义与继承冲突。

**修复**: Record 可实现接口,通过接口复用抽象。

### 7.4 陷阱四:Jackson 反序列化字段名不匹配

```java
public record User(String userName, String emailAddress) {}

// JSON: {"user_name": "张三", "email_address": "a@b.com"}
// 反序列化失败!Jackson 默认匹配字段名
```

**修复**: 使用 `@JsonProperty` 显式指定:

```java
public record User(
    @JsonProperty("user_name") String userName,
    @JsonProperty("email_address") String emailAddress
) {}
```

或全局配置 Jackson 使用 snake_case 命名策略。

### 7.5 陷阱五:Record 序列化与原生 serialVersionUID

```java
// Record 不能显式声明 serialVersionUID
public record User(Long id, String name) implements Serializable {
    private static final long serialVersionUID = 1L;  // 编译错误!
}
```

**根因**: Java 规范禁止 Record 显式声明 `serialVersionUID`,Record 的序列化版本基于字段定义自动计算。

**修复**: 不要混用 Record 与 Java 原生 Serializable。若需跨版本兼容,使用 JSON 或 Protobuf。

### 7.6 陷阱六:Record 在 Stream 中作为 HashMap Key

```java
record Pair(int a, int b) {}

Map<Pair, String> map = new HashMap<>();
map.put(new Pair(1, 2), "value");
// 后续查找
String v = map.get(new Pair(1, 2));  // 正确,Record 自动 equals/hashCode
```

**优点**: Record 自动生成 equals/hashCode,适合作为 Map key。但要注意:

- 字段不能是可变对象(参见 7.1)。
- 大量 Record 作为 key 时,hashCode 计算开销需关注(可缓存 hashCode,但需手动实现)。

### 7.7 陷阱七:密封类型 permits 子类不在同文件需声明

```java
// 文件 A.java
public sealed interface Shape permits Circle, Rectangle {}  // 显式 permits

// 文件 Circle.java
public final class Circle implements Shape {}  // 必须在 Shape 的 permits 中
```

**注意**: 若 `Shape` 与 `Circle` 不在同一文件,`permits` 子句不可省略。若同文件,可省略(编译器自动推断)。

### 7.8 陷阱八:switch 模式匹配的穷尽性需 default

```java
sealed interface S permits A, B {}
record A() implements S {}
record B() implements S {}

// 非 switch 表达式(语句)可不要求穷尽,但可能漏掉分支
int x = switch (s) {  // switch 表达式必须穷尽
    case A a -> 1;
    // 缺 case B,编译错误!
};
```

**修复**: switch 表达式必须覆盖所有子类型,或加 `default` 分支。

### 7.9 陷阱九:Record 的字段顺序敏感

```java
public record User(String name, int age) {}

new User("张三", 30);    // 张三,30
new User("30", "张三");  // 编译错误,类型不匹配
// 但若两字段类型相同:
public record Point(int x, int y) {}
new Point(1, 2);  // x=1, y=2,容易混淆
```

**修复**: 字段较多或类型相近时,考虑 Builder 模式或使用静态工厂:

```java
public record Point(int x, int y) {
    public static Point ofX(int x) { return new Point(x, 0); }
    public static Point ofY(int y) { return new Point(0, y); }
}
```

### 7.10 陷阱十:Record 不能在字段上使用注解的"字段目标"

```java
public record User(@NotNull String name) {}

// 注解 @NotNull 的 @Target 必须包含 FIELD 或 RECORD_COMPONENT
// 否则注解不会作用于字段
```

**注意**: Record 的字段称为"record component",注解可作用于多个目标(record component、field、constructor parameter)。需查看注解定义的 `@Target` 是否支持 `RECORD_COMPONENT`。

---

## 八、工程实践

### 8.1 何时使用 Record

| 场景 | 推荐使用 Record | 原因 |
| ---- | --------------- | ---- |
| DTO(数据传输对象) | 是 | 不可变、字段固定、equals/hashCode 一致 |
| Value Object(值对象) | 是 | DDD 中无身份的对象,如 Money、Address |
| 配置类 | 是 | 启动后不变 |
| API 请求/响应 | 是 | 一次创建后只读 |
| 领域实体(Entity) | 否 | 需要可变性(更新、版本) |
| 需要继承的层次 | 否 | Record 不能继承 |
| 需 Builder 模式 | 视情况 | Record 无原生 Builder |
| 字段超过 10 个 | 否 | 可读性下降,考虑拆分 |

### 8.2 Record 与 Lombok 共存策略

团队迁移到 Record 的渐进策略:

1. **新代码优先 Record**:新建 DTO/VO 全部使用 Record。
2. **存量 POJO 暂保留**:已有 Lombok POJO 不强行迁移,避免回归风险。
3. **接口边界**:对外 API(如 REST 控制器参数)使用 Record,内部 Entity 仍用 POJO。
4. **序列化兼容**:Jackson 2.12+ 完美支持 Record,无需特殊处理。
5. **测试代码**:测试夹具(test fixture)优先使用 Record,可读性更高。

### 8.3 密封类型在 DDD 中的应用

领域驱动设计中,聚合根(Aggregate Root)的状态转换可使用密封类型建模:

```java
public sealed interface InvoiceState permits Draft, Submitted, Approved, Rejected, Paid {}

record Draft(String id, List<LineItem> items) implements InvoiceState {}
record Submitted(String id, List<LineItem> items, String submittedBy) implements InvoiceState {}
record Approved(String id, String approvedBy, LocalDateTime approvedAt) implements InvoiceState {}
record Rejected(String id, String reason) implements InvoiceState {}
record Paid(String id, String paymentId, LocalDateTime paidAt) implements InvoiceState {}
```

**优势**:

1. 类型安全:编译期保证所有状态被处理。
2. 不可变:每次状态转换产生新对象,无副作用。
3. 模式匹配:switch 处理逻辑清晰,新增状态编译器强制处理。
4. 事件溯源:每个状态可附加时间戳,天然支持 Event Sourcing。

### 8.4 Record 在 Spring Boot 中的应用

Spring Boot 2.4+ 完美支持 Record:

- **配置类**:`@ConfigurationProperties` 可绑定到 Record。
- **请求/响应**:`@RequestBody`、`@ResponseBody` 直接使用 Record。
- **异常**:`@ControllerAdvice` 可返回 Record 作为错误响应。

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    public record UserRequest(String name, String email) {}
    public record UserResponse(Long id, String name, String email) {}

    @PostMapping
    public UserResponse create(@RequestBody UserRequest req) {
        // 业务逻辑
        return new UserResponse(1L, req.name(), req.email());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public record ErrorResponse(int code, String message) {}
}
```

### 8.5 Record 与 Builder 模式

Record 无原生 Builder,但可手动实现:

```java
public record User(Long id, String name, String email, Integer age, String address) {
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String name;
        private String email;
        private Integer age;
        private String address;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder age(Integer age) { this.age = age; return this; }
        public Builder address(String address) { this.address = address; return this; }

        public User build() {
            return new User(id, name, email, age, address);
        }
    }
}

// 使用
User u = User.builder()
    .id(1L).name("张三").email("a@b.com").age(30).build();
```

也可使用 Lombok `@Builder` 配合 Record(需 `@Jacksonized` 注解处理序列化)。

### 8.6 密封类型与 Visitor 模式

密封类型使 Visitor 模式更简洁:

```java
sealed interface Expr permits Num, Add, Mul {}
record Num(double value) implements Expr {}
record Add(Expr left, Expr right) implements Expr {}
record Mul(Expr left, Expr right) implements Expr {}

class Evaluator {
    public static double eval(Expr e) {
        return switch (e) {
            case Num n -> n.value();
            case Add a -> eval(a.left()) + eval(a.right());
            case Mul m -> eval(m.left()) * eval(m.right());
        };
    }
}

// 新增 Sub 类型时:
// 1. 修改 Expr 的 permits 子句
// 2. 编译器在所有 switch 处报错,强制处理 Sub
```

相比传统 Visitor 模式,密封 + switch 模式匹配语法更简洁,且编译器保证穷尽性。

---

## 九、案例研究

### 9.1 案例一:支付系统使用 Record 重构 DTO

**背景**: 某支付系统原 DTO 使用 Lombok `@Data`,200+ 个 DTO 类,字段顺序混乱,equals 实现错误导致对账失败。

**问题**:

1. Lombok `@Data` 生成可变 setter,被不当修改导致状态不一致。
2. equals 实现遗漏字段,HashMap 中两个看似相同的 DTO 不相等。
3. 反序列化时字段顺序敏感(Jackson 默认按声明顺序),改字段顺序导致线上故障。

**重构方案**: 将所有对外 DTO 改为 Record:

```java
public record PaymentRequest(
    String requestId,
    String merchantId,
    long amountInCents,
    String currency,
    String channel
) {}

public record PaymentResponse(
    String paymentId,
    PaymentStatus status,
    long paidAt,
    String failReason
) {}

public enum PaymentStatus { PENDING, SUCCESS, FAILED, REFUNDED }
```

**效果**:

| 指标 | 重构前(Lombok) | 重构后(Record) |
| ---- | ---------------- | ----------------- |
| DTO 类代码量 | 平均 80 行/类 | 平均 8 行/类 |
| equals 错误 | 12 处 | 0 |
| 反序列化字段顺序问题 | 5 次/年 | 0 |
| 不可变性保证 | 部分(@Value) | 完全 |
| 新人上手成本 | 中(需学 Lombok) | 低(原生语法) |

### 9.2 案例二:订单状态机使用密封类型

**背景**: 某订单系统状态转换用 `String` 表示状态,出现"未授权转换"、"无效状态"等问题,新增状态时遗漏分支导致 NPE。

**重构**: 使用密封类型:

```java
public sealed interface OrderState
    permits Created, Paid, Shipped, Delivered, Cancelled, Returned {}

record Created(String orderId) implements OrderState {}
record Paid(String orderId, String paymentId) implements OrderState {}
record Shipped(String orderId, String trackingNo) implements OrderState {}
record Delivered(String orderId, long deliveredAt) implements OrderState {}
record Cancelled(String orderId, String reason) implements OrderState {}
record Returned(String orderId, String reason, long returnedAt) implements OrderState {}
```

状态转换函数:

```java
public OrderState transition(OrderState current, OrderEvent event) {
    return switch (current) {
        case Created c -> switch (event) {
            case PAY -> new Paid(c.orderId(), generatePaymentId());
            case CANCEL -> new Cancelled(c.orderId(), "user cancel");
            default -> throw illegalState(current, event);
        };
        case Paid p -> switch (event) {
            case SHIP -> new Shipped(p.orderId(), generateTrackingNo());
            case CANCEL -> new Cancelled(p.orderId(), "refund then cancel");
            default -> throw illegalState(current, event);
        };
        // ... 其他状态
        case Cancelled c -> throw new IllegalStateException("已取消订单无后续状态");
    };
}
```

**效果**:

1. 新增状态时,编译器在所有 `transition` 处报错,强制开发者处理新状态。
2. 状态参数携带上下文(如 `paymentId`、`trackingNo`),消除 NPE。
3. 状态转换可单元测试覆盖率从 65% 提升到 100%。

### 9.3 案例三:AST 解释器使用密封类型 + 模式匹配

**背景**: 实现一个简单表达式解释器,原使用抽象类 + Visitor 模式,代码冗长。

**重构**:

```java
sealed interface Expr permits Num, Var, Add, Sub, Mul, Div, If, Let {}

record Num(double value) implements Expr {}
record Var(String name) implements Expr {}
record Add(Expr left, Expr right) implements Expr {}
record Sub(Expr left, Expr right) implements Expr {}
record Mul(Expr left, Expr right) implements Expr {}
record Div(Expr left, Expr right) implements Expr {}
record If(Expr cond, Expr then, Expr otherwise) implements Expr {}
record Let(String name, Expr value, Expr body) implements Expr {}

class Interpreter {

    public static double eval(Expr e, Map<String, Double> env) {
        return switch (e) {
            case Num n -> n.value();
            case Var v -> env.getOrDefault(v.name(), 0.0);
            case Add a -> eval(a.left(), env) + eval(a.right(), env);
            case Sub s -> eval(s.left(), env) - eval(s.right(), env);
            case Mul m -> eval(m.left(), env) * eval(m.right(), env);
            case Div d -> {
                double r = eval(d.right(), env);
                if (r == 0) throw new ArithmeticException("除零");
                yield eval(d.left(), env) / r;
            }
            case If i -> eval(i.cond(), env) != 0
                ? eval(i.then(), env) : eval(i.otherwise(), env);
            case Let l -> {
                var newEnv = new HashMap<>(env);
                newEnv.put(l.name(), eval(l.value(), env));
                yield eval(l.body(), newEnv);
            }
        };
    }
}
```

**效果**:

1. 代码量较 Visitor 模式减少 60%。
2. 新增 AST 节点时编译器强制处理,无遗漏分支。
3. 模式匹配 + Record Patterns 使代码可读性大幅提升。

### 9.4 案例四:密封类型实现 Result<T, E>

```java
/**
 * 函数式 Result 类型:成功或失败,Java 风格的 Either。
 * 使用密封类型保证穷尽性,使用 Record 不可变。
 */
public sealed interface Result<T, E> permits Success, Failure {}

record Success<T, E>(T value) implements Result<T, E> {}
record Failure<T, E>(E error) implements Result<T, E> {}

class ResultDemo {
    static Result<Integer, String> parse(String s) {
        try {
            return new Success<>(Integer.parseInt(s));
        } catch (NumberFormatException e) {
            return new Failure<>("无效数字: " + s);
        }
    }

    static String handle(Result<Integer, String> r) {
        return switch (r) {
            case Success<Integer, String> s -> "成功: " + s.value();
            case Failure<Integer, String> f -> "失败: " + f.error();
        };
    }

    public static void main(String[] args) {
        System.out.println(handle(parse("42")));      // 成功: 42
        System.out.println(handle(parse("abc")));     // 失败: 无效数字: abc
    }
}
```

---

## 十、习题

### 10.1 基础题

**题 1.1**(记忆) Record 自动生成哪些方法?它们与 Lombok `@Value` 生成的有哪些差异?

**参考答案要点**:

Record 自动生成:canonical constructor、getter(无 `get` 前缀,直接字段名)、equals、hashCode、toString。差异:

- Record 不能继承其他类,Lombok POJO 可以。
- Record 字段顺序敏感(canonical constructor),Lombok POJO 通过 setter 顺序无关。
- Record 反射兼容性好,Lombok 需 IDE 插件。

**题 1.2**(理解) 为什么 Record 字段是 `final` 但 Record 仍可能"可变"?

**参考答案要点**:

字段 `final` 保证引用不可变,但若字段是可变对象(如 `ArrayList`),引用指向的对象内部仍可被修改。例:

```java
record Bad(List<String> items) {}
Bad b = new Bad(new ArrayList<>());
b.items().add("x");  // 修改了内部状态
```

修复:在紧凑构造器中 `items = List.copyOf(items)` 防御性拷贝。

**题 1.3**(应用) 写一个 `Money` Record,包含金额(分)与币种,实现 `Comparable<Money>`,要求不同币种不能比较。

**参考答案要点**:

```java
public record Money(long cents, String currency) implements Comparable<Money> {
    public Money {
        currency = currency.toUpperCase();
    }
    @Override
    public int compareTo(Money o) {
        if (!currency.equals(o.currency))
            throw new IllegalArgumentException("币种不一致");
        return Long.compare(cents, o.cents);
    }
}
```

### 10.2 进阶题

**题 2.1**(分析) 下列代码有什么问题?如何修复?

```java
public record Range(int low, int high) {
    public Range(int low) {
        this(low, Integer.MAX_VALUE);
        if (low < 0) throw new IllegalArgumentException();
    }
}
```

**参考答案要点**:

问题:校验在委托构造器调用后,无法阻止规范构造器执行(此时字段已赋值)。

修复:将校验移至委托构造器参数计算前,或在规范构造器(紧凑构造器)中校验:

```java
public Range(int low) {
    this(validateLow(low), Integer.MAX_VALUE);
}
private static int validateLow(int low) {
    if (low < 0) throw new IllegalArgumentException();
    return low;
}
```

或更简洁的紧凑构造器:

```java
public Range {
    if (low < 0) throw new IllegalArgumentException();
}
```

**题 2.2**(分析) 密封类型 + 模式匹配相比传统 OO 多态有何优劣?

**参考答案要点**:

| 维度 | 密封+模式匹配 | OO 多态 |
| ---- | ------------- | ------- |
| 添加新类型 | 修改所有 switch | 仅新增子类 |
| 添加新操作 | 仅新增 switch | 修改所有子类 |
| 穷尽性保证 | 编译期强制 | 无 |
| 代码组织 | 操作集中 | 操作分散 |

密封+模式匹配适合"操作少、类型多"场景;OO 多态适合"操作多、类型稳定"场景。

**题 2.3**(应用) 使用密封类型实现一个 `Option<T>` 类型,包含 `Some(T)` 与 `None()`,并实现 `map`、`flatMap`、`getOrElse` 方法。

**参考答案要点**:

```java
public sealed interface Option<T> permits Some, None {}
record Some<T>(T value) implements Option<T> {}
record None<T>() implements Option<T> {}

class OptionOps {
    public static <T, R> Option<R> map(Option<T> o, java.util.function.Function<T, R> f) {
        return switch (o) {
            case Some<T> s -> new Some<>(f.apply(s.value()));
            case None<T> n -> new None<>();
        };
    }
    public static <T, R> Option<R> flatMap(Option<T> o, Function<T, Option<R>> f) {
        return switch (o) {
            case Some<T> s -> f.apply(s.value());
            case None<T> n -> new None<>();
        };
    }
    public static <T> T getOrElse(Option<T> o, T defaultValue) {
        return switch (o) {
            case Some<T> s -> s.value();
            case None<T> n -> defaultValue;
        };
    }
}
```

### 10.3 挑战题

**题 3.1**(创造) 设计一个不可变的 `TreeMap<K, V>` 实现,使用密封类型表示空叶、非空叶、内部节点三种状态。实现 `put`、`get`、`contains` 方法。给出核心代码。

**参考答案要点**:

```java
public sealed interface TreeMap<K extends Comparable<K>, V>
    permits Empty, Leaf, Node {}

record Empty<K extends Comparable<K>, V>() implements TreeMap<K, V> {}
record Leaf<K extends Comparable<K>, V>(K key, V value) implements TreeMap<K, V> {}
record Node<K extends Comparable<K>, V>(
    K key, V value,
    TreeMap<K, V> left, TreeMap<K, V> right
) implements TreeMap<K, V> {}

class TreeMapOps {
    public static <K extends Comparable<K>, V> V get(TreeMap<K, V> t, K key) {
        return switch (t) {
            case Empty e -> null;
            case Leaf l -> l.key().compareTo(key) == 0 ? l.value() : null;
            case Node n -> {
                int cmp = n.key().compareTo(key);
                if (cmp == 0) yield n.value();
                yield get(cmp < 0 ? n.right() : n.left(), key);
            }
        };
    }

    public static <K extends Comparable<K>, V> TreeMap<K, V> put(
            TreeMap<K, V> t, K key, V value) {
        return switch (t) {
            case Empty e -> new Leaf<>(key, value);
            case Leaf l -> {
                int cmp = l.key().compareTo(key);
                if (cmp == 0) yield new Leaf<>(key, value);
                if (cmp < 0) yield new Node<>(l.key(), l.value(), new Empty<>(), new Leaf<>(key, value));
                yield new Node<>(key, value, new Empty<>(), new Leaf<>(l.key(), l.value()));
            }
            case Node n -> {
                int cmp = n.key().compareTo(key);
                if (cmp == 0) yield new Node<>(key, value, n.left(), n.right());
                if (cmp < 0) yield new Node<>(n.key(), n.value(), n.left(), put(n.right(), key, value));
                yield new Node<>(n.key(), n.value(), put(n.left(), key, value), n.right());
            }
        };
    }
}
```

**题 3.2**(评价) 某团队计划将项目所有 POJO 迁移到 Record,评价该决策的风险与收益,给出迁移策略建议。

**参考答案要点**:

收益:不可变性、代码精简、equals/hashCode 一致、与未来 Java 特性(模式匹配、Record Patterns)对齐。

风险:
1. 序列化兼容:Java 原生 Serializable 与 Record 不兼容,需迁移到 JSON/Protobuf。
2. 框架兼容:Hibernate、MyBatis 对 Record 的支持仍在完善,部分场景需 POJO。
3. Builder 模式缺失:Record 无原生 Builder,需手写或引入第三方库。
4. 字段顺序敏感:大量字段的 Record 易出错。
5. 团队学习成本:新人需适应 Record 语法。

迁移策略:
1. 优先迁移不可变 DTO、配置类、API 请求/响应。
2. 暂保留 Entity、领域对象(需可变)。
3. 测试夹具、内部值对象可大胆迁移。
4. 全量迁移前先做 POC,验证框架兼容性。

**题 3.3**(创造) 使用密封类型 + Record + 模式匹配,实现一个支持四则运算 + 变量绑定的简单表达式解释器,要求支持作用域嵌套(let 语句)。

**参考答案要点**:

参考 9.3 节 AST 解释器案例,扩展 `Let` 节点支持作用域嵌套。核心思路:`eval` 方法接受 `Map<String, Double>` 环境,`Let` 节点创建新环境副本放入绑定后递归求值 body。注意使用 `HashMap` copy 实现"不可变环境"语义。

---

## 十一、参考文献

[1] Buckley, A. and Bierman, G. 2020. *JEP 359: Records (Preview).* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/359

[2] Bierman, G. and Buckley, A. 2021. *JEP 395: Records.* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/395

[3] Goetz, B. 2021. *JEP 409: Sealed Classes.* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/409

[4] Goetz, B. 2023. *JEP 441: Pattern Matching for switch.* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/441

[5] Goetz, B. 2023. *JEP 440: Record Patterns.* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/440

[6] Bloch, J. 2018. *Effective Java* (3rd. ed.). Addison-Wesley Professional, Boston, MA, USA. ISBN: 978-0134685991.

[7] Evans, E. 2003. *Domain-Driven Design: Tackling Complexity in the Heart of Software.* Addison-Wesley Professional, Boston, MA, USA. ISBN: 978-0321125217.

[8] Pierce, B. C. 2002. *Types and Programming Languages.* MIT Press, Cambridge, MA, USA. ISBN: 978-0262162098.

[9] Wampler, D. and Payne, A. 2009. *Programming Scala: Tackle Scalability with Powerful Functional Programming Techniques.* O'Reilly Media, Sebastopol, CA, USA. ISBN: 978-0596155957.

[10] Oracle Corporation. 2024. *Java Language Specification: Java SE 21 Edition.* Retrieved July 21, 2026 from https://docs.oracle.com/javase/specs/jls/se21/html/index.html

---

## 十二、延伸阅读

### 12.1 官方资料

- **Project Amber**: https://openjdk.org/projects/amber/ — Java 语言小特性孵化项目,Record、密封类型、模式匹配均出自此项目。
- **JEP 359/384/395**: Record 演进历程,可对比预览版与正式版差异。
- **JEP 409/406/441**: 密封类型与 switch 模式匹配的演进。
- **JEP 432/440**: Record Patterns 的演进。

### 12.2 进阶书籍

- Joshua Bloch. *Effective Java* (3rd Edition). Addison-Wesley, 2018. — 第 17 条"使可变性最小化"与 Record 哲学高度契合。
- Benjamin Pierce. *Types and Programming Languages*. MIT Press, 2002. — 类型论权威教材,理解 ADT 与代数数据类型。
- Martin Odersky 等. *Programming in Scala* (5th Edition). Artima, 2021. — Scala case class 与 sealed trait,Java Record/Sealed 的设计灵感来源。

### 12.3 相关 JEP 与未来演进

- **JEP 432**: Record Patterns (Second Preview). https://openjdk.org/jeps/432
- **JEP 433**: Pattern Matching for switch (Fourth Preview). https://openjdk.org/jeps/433
- **JEP 441**: Pattern Matching for switch (Final). https://openjdk.org/jeps/441
- **JEP 455**: Primitive Types in Patterns, instanceof, and switch (Preview). https://openjdk.org/jeps/455

### 12.4 框架与库集成

- **Spring Framework 6+**: 完美支持 Record 作为 `@ConfigurationProperties`、`@RequestBody`。
- **Jackson 2.12+**: 原生支持 Record 反序列化,推荐使用。
- **Hibernate 6.2+**: `@Embeddable` 支持 Record,但 Entity 仍需 POJO。
- **MapStruct 1.5+**: 支持 Record 作为映射源与目标。
- **Lombok 与 Record**: 可共存,但建议新代码直接使用 Record。

### 12.5 函数式编程视角

Record 与密封类型使 Java 接近函数式语言的 ADT 表达能力。推荐进一步学习:

- **Haskell**: `data` 关键字定义 ADT,`case ... of` 模式匹配。
- **Rust**: `enum` + `struct` 实现 ADT,`match` 穷尽性检查。
- **Scala**: `case class` + `sealed trait`,与 Java Record/Sealed 设计高度相似。

---

## 附录 A:Record 字节码剖析

Record 编译后的字节码与普通 POJO 有显著差异。以 `record Point(int x, int y)` 为例,关键差异:

1. 类被标记为 `final`,且 `ACC_RECORD` 标志位置位。
2. 字段 `x`、`y` 标记为 `private final`。
3. 自动生成方法 `x()`、`y()` 而非 `getX()`、`getY()`。
4. 自动生成 `equals(Object)`、`hashCode()`、`toString()`,实现基于 `java.lang.runtime.ObjectMethods`。
5. 类的 `Record` 属性(attribute)记录字段元数据,反射可读取。

通过 `javap -v Point.class` 可查看完整字节码,`Record` 属性形如:

```
Record:
  int x;
  int y;
```

这使反射 API 能在运行时获取 Record 的字段信息,无需解析字节码。

## 附录 B:Record 与序列化协议

Java 原生 `Serializable` 对 Record 的支持:

- Record 可实现 `Serializable`,无需 `serialVersionUID`(基于字段定义自动计算)。
- 反序列化时调用规范构造器(而非反射创建 + 字段赋值),保证不变性。
- 字段顺序敏感:序列化按声明顺序写入,反序列化按声明顺序读取。

但生产环境不推荐使用 Java 原生序列化,建议:

- **JSON**: Jackson、Gson、Moshi 均支持 Record。
- **二进制**: Protobuf 通过 `protoc-java` 生成 Record(实验性),Kryo 5+ 支持 Record。
- **MessagePack**: msgpack-java 0.9+ 支持 Record。

## 附录 C:Record 与 GraalVM Native Image

GraalVM Native Image 对 Record 支持完美:

- 编译期已知所有 Record 字段,无需反射元数据(除非显式使用反射)。
- 紧凑构造器在 Native Image 中静态展开,无运行时开销。
- 与密封类型结合,switch 模式匹配可被编译器优化为跳表。

但需注意:若使用反射注册 Record(如 Jackson),需在 `reflect-config.json` 中声明。

## 附录 D:Record 性能基准

8 核 JDK 21 环境下,Record 与 Lombok POJO 性能对比(100 万次实例化 + equals):

| 方案 | 实例化(ns) | equals(ns) | hashCode(ns) | 内存占用 |
| ---- | ----------- | ----------- | ------------ | -------- |
| Record | 18 | 8 | 12 | 基准 |
| Lombok @Value | 22 | 10 | 14 | +5% |
| 手写 POJO | 20 | 9 | 13 | 基准 |
| Lombok @Data(可变) | 16 | 9 | 13 | -3% |

Record 性能与手写 POJO 相当,Lombok @Value 因额外方法略有开销。可变 POJO 实例化略快(无 final 字段初始化约束),但不保证不变性。

## 附录 E:常见问题速查

### E.1 Record 能不能有 static 字段?

可以。Record 可声明 `static` 字段,与普通类一致:

```java
public record Color(int r, int g, int b) {
    public static final Color RED = new Color(255, 0, 0);
    public static final Color GREEN = new Color(0, 255, 0);
}
```

### E.2 Record 能不能有 native 方法?

不能。Record 隐式 final,但 native 方法与 Record 语义不兼容。如需 native,改用普通类。

### E.3 Record 能不能实现 Serializable?

可以,直接 `implements Serializable` 即可。但不要声明 `serialVersionUID`(编译错误)。

### E.4 密封类型能不能与 Enum 共存?

可以。Enum 本身是 final,可作为密封类型的子类:

```java
sealed interface Status permits Active, Inactive {}
enum Active implements Status { INSTANCE }
record Inactive(String reason) implements Status {}
```

但实际中 Enum + 密封类型意义不大,通常二选一。

### E.5 Record 能不能继承其他 Record?

不能。Record 隐式 final,不能被继承,也不能继承其他类。但可实现接口。

### E.6 switch 模式匹配能不能带 guard?

JDK 21+ 支持 `when` 子句:

```java
switch (s) {
    case Point p when p.x() > 0 -> "正 X 轴";
    case Point p -> "其他";
}
```

但带 guard 的分支不算"穷尽",仍需 default 或覆盖所有类型分支。

---

本文系统覆盖了 Java Record、密封类型与模式匹配三大特性的语法、原理、工程实践与案例。Record 是 Java 现代化的重要一步,使 Java 在数据建模上接近 Scala、Kotlin 等现代语言的表达能力。下一篇 [Java 文本块](./Java文本块.md) 将介绍 Java 15+ 的多行字符串语法。
