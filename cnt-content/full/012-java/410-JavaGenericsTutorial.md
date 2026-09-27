---
order: 310
title: 泛型深水区：类型擦除与运行时真相
module: 'java'
category: 后端技术
difficulty: advanced
description: 390 讲怎么用，本篇讲运行时发生了什么：用 getClass 与 javap 实证类型擦除、有界类型参数改写擦除目标、new T() 与泛型数组禁令的真实报错、桥方法与通配符捕获惯用法。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'java/390-GenericDetailed'
  - 'java/210-CollectionFrameworkDetailed'
  - 'java/420-JavaReflection'
  - 'java/430-ReflectionDynamicProxy'
prerequisites:
  - 'java/390-GenericDetailed'
---

## 前置知识

- 已完成 [泛型入门](/java/390-GenericDetailed)。分工先说清：390 讲**怎么用**——类型参数、通配符与编译期拦截；本文讲**运行时发生了什么**——回答 390 刻意留下的所有「为什么不能」。
- 顺带用到 `Comparable` 接口（合同形状见 [抽象类与接口](/java/160-AbstractClassInterface)）；没读过也行，用到时给完整代码。
- 本文代码 JDK 21 及以上可直接运行；全部报错原文与程序输出为 JDK 25 实测。

## 学习目标

读完本文你将能够：

1. 用 `getClass()` 与 `javap` 各给出一条证据，证明 `List<String>` 与 `List<Integer>` 运行时是同一个类，并说出擦除规则（无界 T 擦成 Object，有界 T 擦成上界）；
2. 解释 `new T()`、泛型数组、`instanceof` 带类型实参三条禁令各自为何存在，并给出正规替代写法；
3. 写出 `<T extends Comparable<T>>` 的通用 max，说清边界如何同时改变编译期能力与擦除目标；
4. 在反射输出里认出桥方法（`isBridge()`），说出编译器为什么合成它；
5. 用「private 泛型辅助方法」惯用法解开 `List<?>` 的读写限制，解释通配符捕获。

预计 45 到 60 分钟，含 1 组修改实验与 2 道练习。

## 1. 你现在要解决什么问题

390 教会你用尖括号把类型安全焊死在编译期。但你可能已经攒了一肚子不服：为什么 `List<Integer>` 调不进 `List<Number>` 参数？为什么 `? extends` 不让写？为什么 `new T()` 直接被拒？

先看一个釜底抽薪的事实。运行下面的程序，先预测输出：

```java
// SameClass.java
import java.util.ArrayList;
import java.util.List;

public class SameClass {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        List<Integer> scores = new ArrayList<>();
        System.out.println(names.getClass() == scores.getClass());
    }
}
```

直觉说：一个是装字符串的列表、一个是装分数的列表，`getClass()` 怎么可能相等。运行结果是：

```text
true
```

编译器在编译期查得凶神恶煞，运行时却把「装的是什么」忘得一干二净——两份代码根本就是同一个类。这个「遗忘」叫**类型擦除**（type erasure），390 里你撞过的每一堵墙都由它而来。本文把它捅破。

## 2. 类型擦除：编译期检查官，运行时失忆

擦除的规则一句话：编译器检查完类型实参之后，把它们从字节码里抹掉——无界的 T 替换成 Object，有界的 T 替换成上界；`List<String>` 与 `List<Integer>` 都只剩 `List`。

证据用 JDK 自带的字节码查看器 `javap`（装了 JDK 就有）。先定义一个最普通的泛型类：

```java
// Cell.java
class Cell<T> {
    private T value;

    public void set(T value) { this.value = value; }
    public T get() { return value; }
}
```

编译后执行 `javap -p -s Cell.class`（`-s` 显示 JVM 实际执行时使用的方法描述符），节选如下：

```text
  public void set(T);
    descriptor: (Ljava/lang/Object;)V

  public T get();
    descriptor: ()Ljava/lang/Object;
```

关键在 descriptor 行：`set` 的形参就是 `Object`（javap 完整输出里，构造器与字段同样全是 Object）。类型参数只以一份名叫 Signature 的附加元数据留在 class 文件里（反射篇的伏笔），JVM 执行时只认 Object 版本。

第一块多米诺倒下了：既然运行时 `T` 就是 `Object`，那 `new T()` 时 JVM 该调谁的构造器？它无从知道。

## 3. 有界类型参数：给 T 上一道天花板

排行榜需要一个「取最高分」的通用方法。第一版顺手就写：

```java
// Rank.java  第一版：不设边界
import java.util.List;

public class Rank {
    public static <T> T max(List<T> scores) {
        T best = scores.get(0);
        for (T s : scores) {
            if (s.compareTo(best) > 0) best = s;
        }
        return best;
    }
}
```

javac 报错原文：

```text
Rank.java:8: error: cannot find symbol
            if (s.compareTo(best) > 0) best = s;
                 ^
  symbol:   method compareTo(T)
  location: variable s of type T
  where T is a type-variable:
    T extends Object declared in method <T>max(List<T>)
```

读报错三步：主句 `cannot find symbol`；`symbol` 行说缺的是 `compareTo(T)`；`location` 说在类型为 T 的变量上。原因正是第 2 节：无界 T 擦成 Object，而 Object 没有 `compareTo`。

给 T 上一道天花板——**有界类型参数**。修复只需把签名改为 `public static <T extends Comparable<T>> T max(List<T> scores)`，方法体一字不动，再补个 main 试跑：

```java
public static void main(String[] args) {
    System.out.println(max(List.of(1200, 3050, 2780)));
}
```

预期输出：

```text
3050
```

`<T extends Comparable<T>>` 读作：T 必须是「能跟自己比较的类型」。`Comparable` 是 JDK 的比较接口，String、Integer、LocalDate 都实现了它。边界一石二鸟：既让编译器放心放行 `compareTo`，还改写了擦除目标——T 不再擦成 Object 而是擦成上界，第 8 节实验一让你自己用 javap 验证。JDK 真实签名更进一步：`Collections.max` 声明为 `<T extends Comparable<? super T>>`，那个 `? super T` 按 390 的 PECS 口诀读——T 的父类型也可能实现了 Comparable。

## 4. 三条禁令与真实报错

**禁令一与二：`new T()`、创建泛型数组。**

```java
// Holder.java
import java.util.List;
import java.util.ArrayList;

class Holder<T> {
    private T value;

    public T create() { return new T(); }

    public List<String>[] make() { return new ArrayList<String>[10]; }
}
```

```text
Holder.java:8: error: unexpected type
    public T create() { return new T(); }
                                   ^
  required: class
  found:    type parameter T
  where T is a type-variable:
    T extends Object declared in class Holder
Holder.java:10: error: generic array creation
    public List<String>[] make() { return new ArrayList<String>[10]; }
                                          ^
2 errors
```

禁令一的报错直说：`new` 后面要一个运行时能找到的类名，而 T 运行时是 Object，JVM 不知道你想造什么。正规替代是把「造 T 的能力」当参数递进来——`Class<T>` 令牌或 `Supplier<T>`（第 10 节实战）。禁令二为什么连 new 都不许？第 5 节给你看数组干了什么好事。

**禁令三：`instanceof` 带类型实参。** 同理，`obj instanceof List<String>` 直接被拒，报错原文一行：`error: Object cannot be safely cast to List<String>`（JDK 25 实测）。合法写法是 `instanceof List<?>`（无界通配符）：「是不是某个列表」运行时答得上来，「是不是字符串列表」运行时无从谈起——所有 `List<X>` 都是同一个类。

## 5. 泛型与数组为何不共戴天

数组在 Java 里是另一套类型系统：**协变**，且**运行时记得自己的元素类型**。协变的意思是 `Object[] objs = new String[1]; objs[0] = 42;` 能通过编译，运行时才抛 `java.lang.ArrayStoreException: java.lang.Integer`——写入有运行时兜底检查，兜底能工作，正是因为数组记得「我是 String 数组」。

泛型恰好两头都反过来：**不变**（`List<Integer>` 与 `List<Number>` 互不相认，390 实测过）加**擦除**（运行时不记得元素类型）。假如允许 `new ArrayList<String>[10]`：数组协变的坑还在，运行时的兜底检查却没了元素类型可查——往里塞 `List<Integer>` 没有任何东西会拦，堆污染无人守门。所以编译器在 new 这一步直接禁掉。

`ArrayList` 内部其实就是一个 `Object[]`——「用集合代替数组」不是妥协，是正解：`List<List<String>>` 想怎么嵌都行。

## 6. 桥方法：编译器偷偷补的分派器

擦除还会逼出一种你看不见的代码：

```java
// BridgeDemo.java
import java.lang.reflect.Method;

class Pair<T> {
    public void setFirst(T first) { }
}

class NamedPair extends Pair<String> {
    @Override
    public void setFirst(String first) { }
}

public class BridgeDemo {
    public static void main(String[] args) {
        for (Method m : NamedPair.class.getDeclaredMethods()) {
            System.out.println(m + "  bridge=" + m.isBridge());
        }
    }
}
```

预期输出：

```text
public void NamedPair.setFirst(java.lang.String)  bridge=false
public void NamedPair.setFirst(java.lang.Object)  bridge=true
```

`NamedPair` 只写了一个 `setFirst(String)`，反射却多出一个 `setFirst(Object)` 且 `bridge=true`——这不是你写的，是编译器合成的**桥方法**。机制一句话：擦除后父类 Pair 的方法是 `setFirst(Object)`，子类覆写的是 `setFirst(String)`——按 JVM 的方法分派规则，两者签名不同、不构成覆写，多态会断链。编译器于是给子类补了一个 `setFirst(Object)` 桥方法，内部把 Object 强转回 String 再转发给你写的那个。你永远不需要写它，但会在反射、调试器、字节码工具里撞见，认出来即可。

## 7. 通配符捕获：private 泛型辅助方法惯用法

390 结尾你见过 `? extends` 不能写入。无界通配符也一样，直接交换 `List<?>` 的两个元素，编译都过不去：

```java
// SwapBad.java  直接写法（编不过）
import java.util.List;

class SwapBad {
    public static void broken(List<?> list, int i, int j) {
        Object tmp = list.get(i);
        list.set(j, tmp);
    }
}
```

```text
SwapBad.java:7: error: incompatible types: Object cannot be converted to CAP#1
        list.set(j, tmp);
                    ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Object from capture of ?
```

编译器不知道 `?` 到底是什么，禁止一切写入。可「交换」明明是安全的——读出来再放回去，放的还是原类型。惯用法是把活儿转交给一个 private 泛型方法：

```java
public static void swap(List<?> list, int i, int j) {
    swapHelper(list, i, j);
}

private static <T> void swapHelper(List<T> list, int i, int j) {
    T tmp = list.get(i);
    list.set(i, list.get(j));
    list.set(j, tmp);
}

List<String> ranking = new ArrayList<>(List.of("阿狸", "布隆"));
swap(ranking, 0, 1);
System.out.println(ranking);   // [布隆, 阿狸]
```

原理叫**通配符捕获**：`?` 一跨进泛型方法 `swapHelper` 的门槛，编译器就把它捕获成一个具体的临时类型变量 T——读写从此都对着同一个 T 进行，锁和钥匙配上了对。这是 Oracle 教程里的标准惯用法，链接见「官方文档」一节。

## 8. 修改实验

两组实验都先预测，再运行。

实验一：下面的类，`set` 方法被 javap 看到的 descriptor 是什么？先写答案再运行 `javap -p -s BoundedCell.class` 验证。

```java
// BoundedCell.java
class BoundedCell<T extends Number> {
    private T value;

    public void set(T value) { this.value = value; }
}
```

实验二：把 SwapBad 的 `list.set(j, tmp);` 换成 `list.set(j, list.get(i));`，编译能通过吗？

答案：实验一的 descriptor 是 `(Ljava/lang/Number;)V`——有界 T 擦成上界 Number 而非 Object，这就是「边界改写擦除目标」的实证。实验二不能——实测仍报 `Object cannot be converted to CAP#1`：每个 `list` 表达式都被单独捕获，两次捕获对不上号，写入依旧被拦，老老实实用 helper。

## 9. 常见错误与调试实录

错误一：静态成员使用类的类型参数。

```java
// Holder.java
class Holder<T> {
    static T shared;   // 想给所有盒子一个默认值
}
```

```text
Holder.java:3: error: non-static type variable T cannot be referenced from a static context
    static T shared;   // 想给所有盒子一个默认值
           ^
```

这不是编译器小气：运行时只有一份 Holder 类（回顾第 1 节的 SameClass），`Holder<String>` 与 `Holder<Integer>` 共享同一份静态存储，T 到底指谁无从谈起。修法：静态成员需要泛型就自己声明——JDK 的 `List.of`、`Collections.emptyList` 全是这个形状：

```java
public static <U> Holder<U> empty() {
    return new Holder<>();
}
```

静态泛型方法的 `<U>` 跟着调用点走，与类的 T 无关。

错误二：按类型实参重载泛型方法。

```java
// Printer.java
import java.util.List;

class Printer {
    public void print(List<String> list) { }
    public void print(List<Integer> list) { }
}
```

```text
Printer.java:6: error: name clash: print(List<Integer>) and print(List<String>) have the same erasure
    public void print(List<Integer> list) { }
                ^
```

擦除后两个 print 的签名都是 `(List)V`——JVM 分派只认擦除后的签名，两个方法在它眼里是同名同参。修法：改名，或多收一个 `Class<T>` 参数主动区分。

## 10. 实际项目中的使用场景

- JSON 与 HTTP 反序列化必须传类型令牌：Jackson 的 `readValue(json, User.class)`。擦除之后，运行时唯一的类型证据是你亲手递进去的 Class 对象——这不是框架的设计怪癖，是擦除的必然；
- `new T()` 的正规替代：`clazz.getDeclaredConstructor().newInstance()`（Class 令牌），或构造器引用 `Game::new`（Supplier）；
- 框架的泛型魔法靠签名元数据：Spring 能从字段声明读出 `Map<String, List<Integer>>` 的实参并按它注入，读的正是擦除幸存的 Signature attribute；AOP 与字节码工具遍历方法时要过滤 `isBridge()`；
- 何时不用：业务代码不需要主动和擦除搏斗——先看懂 JDK 与框架的签名，等你写库再回来用这些武器。

## 11. 小练习

预测题（先写答案再运行，5 分钟；放进任意 main 里跑）：

```java
List<Integer> a = new ArrayList<>();
List<Double> b = new ArrayList<>();
System.out.println(a.getClass() == b.getClass());

Object x = new ArrayList<String>();
System.out.println(x instanceof List<?>);
```

挑战题（半小时，不给代码）：设计类型安全的配置读取器 `ConfigReader`：静态方法 `<T> T read(Map<String, Object> config, String key, Class<T> type)`。要求：key 不存在返回 null；存的值与 type 不符抛 ClassCastException；支持 String、Integer、Boolean；全程不许出现 `@SuppressWarnings`。用下面的代码自测：

```java
Map<String, Object> config = new HashMap<>();
config.put("port", 8080);
config.put("mode", "hardcore");

assert (int) read(config, "port", Integer.class) == 8080;
assert read(config, "mode", String.class).equals("hardcore");
// read(config, "mode", Integer.class) 应抛 ClassCastException
// read(config, "port", String.class) 也应抛——装的是 Integer，不是 String
```

提示：擦除之后，运行时唯一认识 T 的证人，是你递进去的那个 Class 对象。
展开：`Class.cast(Object)` 与 `Class.isInstance(Object)`。
（运行断言要给 java 加 `-ea` 参数——assert 默认关闭，这也是第一次用断言该知道的事。）

预测题答案（先答再看）：`true`、`true`。Integer 与 Double 的列表运行时同样是同一个 ArrayList 类；`x instanceof List<?>` 只问「是不是列表」，无界通配符在运行时答得上来。

## 12. 与之前和之后的知识的关系

- 往前：390 的每条「不能」在本文拿到了答案；[集合框架](/java/210-CollectionFrameworkDetailed) 签名里 `<T extends Comparable<? super T>>` 形状的边界，从此你能直接读懂；
- 往后：[Java 反射](/java/420-JavaReflection) 会讲透本文只点了一句的 Signature attribute；[反射与动态代理](/java/430-ReflectionDynamicProxy) 实战中你会亲手过滤桥方法；
- 更远：「不变性」与数组的正面冲突，第 5 节给出了设计动机。

## 13. 官方文档

- 类型擦除（Oracle 官方教程，第 2 与第 4 节的出处）：https://docs.oracle.com/javase/tutorial/java/generics/erasure.html
- 有界类型参数：https://docs.oracle.com/javase/tutorial/java/generics/bounded.html
- 通配符捕获与辅助方法（第 7 节惯用法出处）：https://docs.oracle.com/javase/tutorial/java/generics/capture.html
- JLS §4.6（类型擦除的规范定义）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html#jls-4.6

## 14. 自我检查

- 能用 `getClass()` 或 `javap` 各给出一条擦除证据，并说出规则（无界 T 擦成 Object、有界 T 擦成上界）；
- 对 `new T()`、泛型数组、`instanceof` 带实参，能各说出「为什么禁」与「用什么替代」；
- 能写出 `<T extends Comparable<T>>` 的 max，并解释边界如何改写擦除目标；
- 反射输出里见到 `bridge=true` 知道它是什么、谁写的；
- 能用 private 泛型 helper 惯用法解开 `List<?>` 的写入。

## 本章总结

泛型是编译期的检查官：检查完毕即擦除——无界 T 变 Object、有界 T 变上界，所有 `List<X>` 运行时是同一个类。`new T()`、泛型数组、`instanceof` 带实参三条禁令都是这句话的推论；数组「协变且运行时记得类型」与泛型「不变且擦除」正面冲突，所以 `new ArrayList<String>[10]` 被连根禁掉。有界参数既给编译器放行 `compareTo` 的理由，也改写擦除目标；桥方法与通配符捕获是编译器替你补齐的两块拼图。擦除并非全灭——Signature 元数据还在，那是反射篇的入口。

## 下一步

进入 [Java 反射](/java/420-JavaReflection)：把本文留在字节码里的泛型签名读回来，你会看到擦除「没擦干净」的那一部分，也让框架的泛型魔法现出原形。
