---
order: 70
title: 包装类缓存陷阱：两个 127 相等，两个 128 却不等
module: 'java'
category: 后端技术
difficulty: beginner
description: 从一道著名面试题讲透 int 与 Integer：装箱拆箱就是编译器替你调 valueOf、-128 到 127 缓存池的机制与利弊、equals 的正确比较姿势、拆箱 null 的 NPE 真实报错与防御。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/050-DataTypeConversion'
  - 'java/070-VariableConstant'
  - 'java/080-OperatorExpression'
  - 'java/200-EqualsHashCodeContract'
prerequisites:
  - 'java/050-DataTypeConversion'
  - 'java/070-VariableConstant'
---

## 前置知识

- 已完成 [数据类型转换](/java/050-DataTypeConversion)：认识基本类型提升链，见过自动装箱与拆箱的写法、Integer.parseInt 与 Math.addExact；
- 会声明一个变量即可（[变量与常量](/java/070-VariableConstant) 编号排在本文之后，讲得更全，先混个眼熟，没读过也不影响跟完本文）。

## 学习目标

读完本文你将能够：

1. 说出 int 与 Integer 的三条核心区别，并解释为什么集合只认 Integer；
2. 用「装箱就是编译器帮你调 valueOf」现场预测 == 的比较结果；
3. 复述 Integer 缓存 -128 到 127 的机制，解释 127 == 127 为 true 而 128 == 128 为 false；
4. 包装类判等条件反射写出 equals，能说出 == 的三个安全区，并识别拆箱 null 引发的 NullPointerException；

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：一道著名的面试题

先看题，不许查资料：

```java
Integer a = 127;
Integer b = 127;
Integer c = 128;
Integer d = 128;
System.out.println(a == b);
System.out.println(c == d);
```

两行 println 长得一模一样，只是数字差 1。直觉说都该输出 true。真实输出：

```text
true
false
```

两个 127 相等，两个 128 却不等——Java 包装类里一个精心设计又经常坑人的机制。今天把它连根拔起。

## 2. int 与 Integer：同一个数字的两种形态

`int primitive = 100;` 存的是值本身；`Integer wrapped = 100;` 存的是一个对象——把 int 包了一层的类实例。打印两者都是 `100`，看不出区别，区别藏在类型系统里：

| | int | Integer |
| --- | --- | --- |
| 本质 | 基本类型，直接存值 | 类（对象），内存里的一块实体 |
| 能否为 null | 不能 | 能（表达「还没有值」） |
| 泛型集合 | 不收 | 只认它 |

第三行先混个眼熟：集合只能装对象，`Map<String, Integer>` 合法而 `Map<String, int>` 编译不过；数据库可空字段、JSON 缺字段也靠 null 表达。[集合框架详解](/java/210-CollectionFrameworkDetailed) 届时兑现预告。

## 3. 自动装箱与拆箱：编译器替你写了两行代码

050 里你见过装箱拆箱的语法，现在揭底。这两行：

```java
Integer boxed = 100;      // 自动装箱：编译器补上 Integer.valueOf(100)
int unboxed = boxed;      // 自动拆箱：编译器补上 boxed.intValue()
```

背下这句话，它是本文的钥匙：**装箱 = 编译器帮你调 valueOf，拆箱 = 编译器帮你调 intValue**。050 用过的 parseInt、MAX_VALUE 都住在 Integer 里——包装类同时是 int 的工具箱。而面试题的全部伏笔，就藏在 valueOf 里。

## 4. 缓存机制：valueOf 里的小仓库

看一眼 JDK 源码的核心逻辑（简化示意，原文在 JDK 的 java/lang/Integer.java）：

```java
// 示意：Integer.valueOf 的核心逻辑
public static Integer valueOf(int i) {
    if (i >= -128 && i <= 127) {
        return IntegerCache.cache[i + 128];   // 命中：返回池里现成的同一个对象
    }
    return new Integer(i);                     // 未命中：新建一个对象
}
```

JDK 在 Integer 类初始化时预先创建 -128 到 127 共 256 个对象放进静态数组（IntegerCache）：装箱落在这区间就复用池里现成的对象，超出就每次新建。回看面试题：

- a、b 装箱 127，都命中缓存，拿到**同一个对象**——`==` 为 true；
- c、d 装箱 128，区间外，各自新建**两个不同对象**——`==` 为 false。

窗户纸就此捅破：**== 从不问「数值相等吗」，只问「是不是同一个东西」**。对 int 它比数值，对对象它比引用（内存地址），完整规则在 [运算符与表达式](/java/080-OperatorExpression) 讲全。

各包装类的缓存范围一表看清：

| 类型 | 缓存范围 |
| --- | --- |
| Boolean | true 与 false |
| Byte | 全部（-128 到 127） |
| Short / Integer / Long | -128 到 127 |
| Character | 0 到 127 |
| Float / Double | 无缓存 |

**利**：等级、状态码这类高频小数值从「每次分配对象」变成「查表复用」，省内存省 GC。**弊**：让 == 看起来「有时能用」，诱导你写出测试全绿、上线就炸的代码——测试数据恰好全落在缓存里。缓存上界可用 JVM 参数 -XX:AutoBoxCacheMax 调大，但那是调优参数不是语义保证，别把正确性押在缓存范围上。

## 5. 正确比较姿势：equals 一把梭

三种比较各写一行验证：

```java
Integer c = 128;
Integer d = 128;
System.out.println(c.equals(d));   // true：包装类之间用 equals，比内容

Integer a = 127;
int rank = 127;
System.out.println(a == rank);     // true：== 触发拆箱，按数值比

int x = 128, y = 128;
System.out.println(x == y);        // true：基本类型之间随便用
```

（三行输出全是 true——注意第三组用的基本类型，与第 1 节的 Integer 对比。）

决策表三行：基本类型之间用 ==（比数值）；包装类之间用 equals（比内容，永远正确）；包装类与基本类型之间 == 可以（拆箱后按数值比），前提是包装类那侧非 null。口诀：**一边是对象就别用 ==，除非另一边是基本类型**。

## 6. 拆箱 NPE：null 引爆的隐形炸弹

拆箱是 intValue，那对 null 调用 intValue 会怎样？亲手触发一次：

```java
public class UnboxDemo {
    public static void main(String[] args) {
        Integer stock = null;    // 语义：还没录入库存
        int need = stock;        // 自动拆箱 → stock.intValue() → 轰
        System.out.println(need);
    }
}
```

javac 零报错——语法完全正确。运行：

```text
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because "stock" is null
        at UnboxDemo.main(UnboxDemo.java:4)
```

这就是拆箱 NPE：对 null 调用方法必然抛 NullPointerException。读法照 030：异常类型加原因（Cannot invoke intValue，因为 stock 是 null），at 链指认现场。（JDK 15 起默认给出这么详细的提示，老版本只有一行 NullPointerException。）

什么时候会是 null：数据库字段没填、Map 的 get 未命中返回 null、JSON 缺字段。防御三板斧：

```java
if (stock != null) { ... }                        // 拆箱前判空
int safe = Objects.requireNonNullElse(stock, 0);  // null 归一为默认值（Java 9+）
int def = map.getOrDefault(key, 0);               // 集合取值直接给默认
```

Objects 是标准库的判空工具类，getOrDefault 见 [集合框架详解](/java/210-CollectionFrameworkDetailed)。核心纪律：**拆箱之前，先确认不是 null**。

## 7. 修改实验

实验一（5 分钟）：把面试题里的数字改成 100 与 200、-128 与 -129，四组 == 各预测一次再验证。（-129 超出下界同样 false——下界固定 -128，不可调。）

实验二（10 分钟）：换成 Long 重跑：`Long l1 = 127L; Long l2 = 127L;`，结果与 Integer 一致（学一个等于学会 Short 和 Long）。换 Double：`Double d1 = 1.5; Double d2 = 1.5;`，== 是 false——查第 4 节的表，Float 与 Double 无缓存。

实验三（10 分钟）：亲手制造一次拆箱 NPE（第 6 节的 UnboxDemo），完整读一遍报错原文；然后用 Objects.requireNonNullElse 修复，让程序输出 0。

## 8. 常见错误与调试实录

错误一：用 == 比较两个包装类（面试题的工程版）：

```java
// 等级 100 在缓存内，测试全绿；上线出现等级 200，判断悄悄失效
if (userLevel == requiredLevel) { grantBadge(); }

// 修正
if (userLevel.equals(requiredLevel)) { grantBadge(); }
```

最阴险之处：测试数据恰好都在 -128 到 127。代码评审遇到包装类用 ==，一律打回——背题是表，防 bug 是里。

错误二：new Integer(...) 已废弃（Java 9 起）。new 永远新建对象，与缓存机制对着干。修正：`Integer.valueOf(100)` 或直接自动装箱。

错误三：循环里的装箱风暴：

```java
Long sum = 0L;
for (int i = 0; i < 1000000; i++) {
    sum += i;    // 每圈一次拆箱 + 一次装箱
}
```

`sum += i` 实际是拆箱、加完再装箱——一百万圈就是一百万个短命对象，白白给 GC 添堵，慢一个量级。修正：计算用基本类型 long，只在存进集合的时刻装箱。（for 循环 [控制流](/java/090-ControlFlow) 细讲，这里照抄即可。）

## 9. 实际项目中的使用场景

- 选型口诀：**可空语义选包装类，纯计算选基本类型**。实体类字段（数据库映射、JSON 收发）用 Integer 表达「尚未设置」；局部变量、计数器、累加器用 int；
- 集合与泛型：Map<String, Integer> 计数、List<Integer> 排行榜——泛型只认对象；集合框架内部已正确使用 equals 与 hashCode，你只需守住自己写的比较与拆箱；
- 面试表达分三层：现象（127 相等、128 不等）→ 机制（装箱走 valueOf，-128 到 127 命中缓存）→ 规范（判等一律 equals）。

## 10. 小练习

预测题（5 分钟）：三行输出各是什么？先写答案再运行：

```java
Integer m = 127;
Integer n = 127;
Integer p = 128;
System.out.println(m == n);
System.out.println(m == 127);
System.out.println(p == 128);
```

（验证：true / true / false。第二行右边是基本类型，触发拆箱按数值比——第 5 节规则二。）

修改题（10 分钟）：把第 5 节的比较代码改成 Long 版本，用 equals 验证 128L 相等；再故意把其中一行改回 ==，运行并记录结果，在那行上方写一行注释说明为什么是 false。

修 Bug 题（15 分钟）：下面程序想输出 100，运行却崩溃。按三步定位，用两种方式修复（判空走默认 0 / requireNonNullElse），要求修复后输出 100：

```java
public class StockBug {
    public static void main(String[] args) {
        Integer quota = null;          // 暂未配置配额
        int limit = quota + 100;       // 这一行崩溃
        System.out.println(limit);
    }
}
```

```text
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because "quota" is null
        at StockBug.main(StockBug.java:4)
```

挑战题（半小时）：写一个 CacheProbe 类验证缓存边界：i 从 125 循环到 130，每轮输出一行「数字 -> 比较结果」，比较用 `Integer.valueOf(i) == Integer.valueOf(i)`。预期六行：前三行 true，后三行 false。提示（思路）：照抄 `for (int i = 125; i <= 130; i++)`，循环体一行 println（循环语法 [控制流](/java/090-ControlFlow) 才细讲，先混个眼熟）；展开（关键 API）：Integer.valueOf 与 ==。附加题：写成 `new Integer(i) == Integer.valueOf(i)` 为什么六行全是 false？（new 永不命中缓存。）

## 11. 与之前和之后的知识的关系

- 往前：[数据类型转换](/java/050-DataTypeConversion) 的装箱语法今天揭底；[快速上手](/java/030-QuickStart) 里当道具用的 parseInt 也归了位——它本来就是包装类工具箱的一员；
- 往后：[变量与常量](/java/070-VariableConstant) 把变量声明与 final 常量讲透，是 040（语句与结构）→ 050（类型转换）→ 060（本文包装类）→ 070（变量常量）这条入门主线的收尾；[运算符与表达式](/java/080-OperatorExpression) 把 == 的完整规则讲全；[equals 与 hashCode 契约](/java/200-EqualsHashCodeContract) 深挖 equals 契约；[集合框架详解](/java/210-CollectionFrameworkDetailed) 兑现「泛型只认对象」的预告。

## 12. 官方文档

- Integer 类 Javadoc（valueOf 的缓存行为写在方法说明里）：https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html
- Oracle Java Tutorials「Autoboxing and Unboxing」：https://docs.oracle.com/javase/tutorial/java/data/autoboxing.html
- Java 语言规范 JLS 5.1.7「Boxing Conversion」（装箱转换的权威定义）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.7

## 13. 自我检查

- 能不看资料写出面试题代码，并说出 true / false 各自的原因；
- 能用「编译器帮你调 valueOf」一句话解释装箱，并据此推出 == 的行为；
- 包装类判等能条件反射写 equals；拿到拆箱 NPE 报错，能指出是哪次拆箱引爆并给出两种修法；
- 能说出「可空语义选包装类，纯计算选基本类型」的口诀并举例。

## 本章总结

int 是值，Integer 是对象；装箱是编译器替你调 valueOf，拆箱是 intValue。Integer 缓存 -128 到 127（Character 0 到 127，Float 与 Double 无缓存），池内 == 同地址、池外各新建，这就是 127 相等而 128 不等的全部真相。== 只问「是不是同一个东西」，包装类判等一律 equals。拆箱 null 必抛 NPE，报错原文会直接告诉你 Cannot invoke intValue 的是哪个变量；防御三板斧：判空、requireNonNullElse、getOrDefault。缓存是性能优化不是语义保证，可空选包装类、计算选基本类型。

## 下一步

进入 [变量与常量](/java/070-VariableConstant)：入门四部曲的收尾——变量声明的完整姿势、作用域的再一次深化，以及 final 常量。带着「名字绑定值」的直觉过去，你会发现大半内容似曾相识。
