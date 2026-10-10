---
order: 360
title: 泛型入门：把爆炸从运行时搬到编译期
module: 'java'
category: 后端技术
difficulty: intermediate
description: 从 Object 盒子塞进 Integer 运行时才炸讲起：泛型类、接口、方法三件套，菱形与类型推断，通配符 extends/super 的生产者-消费者读法，Raw Type 警示与 incompatible types 报错实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/410-JavaGenericsTutorial'
  - 'java/210-CollectionFrameworkDetailed'
  - 'java/290-LambdaFunctionalProgramming'
  - 'java/180-ExceptionHandlingMechanism'
prerequisites:
  - 'java/100-MethodDetailed'
  - 'java/160-AbstractClassInterface'
---

## 前置知识

- 已完成 [方法详解](/java/100-MethodDetailed)：会定义与调用方法——泛型方法的语法就长在方法声明上；
- 已完成 [抽象类与接口](/java/160-AbstractClassInterface)：知道 interface 是「能力合同」，泛型接口只是给合同加个占位类型。

没学过接口也没关系，用到时本文给完整代码。另外你大概率早用过泛型——`List<String>`、`Map<String, Integer>` 里的尖括号就是本文的主角。本文代码 JDK 17 及以上可直接运行。

## 学习目标

读完本文你将能够：

1. 演示 Object 版盒子「塞进 Integer、取的人运行时才炸」与泛型版「塞的当场报编译错」的差别；
2. 独立写出泛型类、泛型接口、泛型方法三件套，并解释 `new Box<>()` 菱形里省掉的类型是谁推出来的；
3. 给方法参数选对通配符：只读用 `? extends`，只写用 `? super`（生产者-消费者口诀）；
4. 识别 Raw Type 写法，说出 unchecked 警告的真实代价；
5. 拿到 `incompatible types` 报错时按三步定位到尖括号里的类型。

预计 50 到 60 分钟，含 1 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

游戏背包需要一个「格子」，先只装武器名：

```java
public class ItemBox {
    private Object data;

    public void set(Object data) { this.data = data; }

    public String get() {
        return (String) data;   // 取出来强转回 String
    }
}
```

```java
ItemBox box = new ItemBox();
box.set("木剑");
System.out.println(box.get());   // 木剑

box.set(42);                     // 谁也没拦住这一行
System.out.println(box.get());   // 炸的是这一行
```

运行结果：

```text
木剑
Exception in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String (java.lang.Integer and java.lang.String are in module java.base of loader 'bootstrap')
```

注意爆炸的位置：塞进 42 的那行编译通过了，炸的是**另一处、另一个时间点**取数据的人——团队项目里两者常常不在同一个文件、甚至不在同一个月。泛型要做的事只有一件：让 `box.set(42)` 这种错误**当场**在编译期报出来。

## 2. 泛型类：给编译器递上守门规则

把「装什么」挪到类名后的尖括号里，就是泛型类：

```java
public class Box<T> {
    private T data;

    public void set(T data) { this.data = data; }
    public T get() { return data; }
}
```

`T` 是**类型参数**：使用时才填的占位符，约定用单个大写字母（T=Type、E=Element、K/V=Key/Value）。使用时填上具体类型（**类型实参**）：

```java
Box<String> itemBox = new Box<>();   // 菱形 <>：省略的类型由编译器推断
itemBox.set("木剑");
String item = itemBox.get();         // 取出来直接是 String，不用强转

Box<Integer> coinBox = new Box<>();
coinBox.set(42);
int coins = coinBox.get();           // Integer 自动拆箱为 int
```

现在再犯第 1 节的错误，编译器当场拦下：

```java
Box<String> itemBox = new Box<>();
itemBox.set(42);
```

javac 报错原文（JDK 25 实测，下同）：

```text
Game.java:6: error: incompatible types: int cannot be converted to String
        itemBox.set(42);
                    ^
1 error
```

读报错三步：先读主句——实参 `int` 与形参 `String` 对不上；再看行号与插入符，指向 `42`；最后对照尖括号——`Box<String>` 的 `set` 只收 String。爆炸从运行时搬到编译期，这就是标题那句话的全部含义。一个类可以开多个类型参数（如 `Map` 的 `K`、`V`），规则相同。

## 3. 泛型接口与泛型方法

**泛型接口**：给合同加占位类型。各种战利品来源都有「发一个奖品」的能力：

```java
public interface RewardSource<T> {
    T next();
}

public class CoinSource implements RewardSource<Integer> {
    @Override
    public Integer next() { return 10 + (int) (Math.random() * 90); }
}
```

实现类把 `T` 填成 `Integer`，`next()` 的返回类型随之确定——`new CoinSource().next()` 得到 10 到 99 的随机数，全程无强转。

**泛型方法**：类型参数写在返回值之前。从奖池随机抽一个，抽到什么类型取决于池子里装什么：

```java
public static <T> T draw(List<T> pool) {
    return pool.get((int) (Math.random() * pool.size()));
}

List<String> names = List.of("木剑", "皮甲", "红药水");
String prize = draw(names);          // 编译器推断 T 为 String，无需强转
```

方法名前的 `<T>` 是**声明**，`List<T>` 里的 T 是**使用**。漏写声明，编译器把 T 当成不存在的类名去找，报 `cannot find symbol / symbol: class T`。

**类型实参推断**：你几乎从不需要写 `Main.<String>draw(names)` 这种显式形式——编译器从实参 `names` 的类型推出 `T = String`；菱形里省掉的类型也是从左边声明抄过去的。

## 4. 通配符：参数该开多宽

合计一组数值奖励，第一版参数写死 `List<Integer>`。问题立刻出现：掉落物价值是 `Double` 的同事调不进来：

```java
public static int sumOfRewards(List<Integer> rewards) { ... }

List<Double> drops = List.of(1.5, 2.5);
sumOfRewards(drops);
```

```text
Game.java:22: error: incompatible types: List<Double> cannot be converted to List<Integer>
        sumOfRewards(drops);
                     ^
```

注意：**泛型没有继承关系**。`Double` 是 `Number` 的子类，但 `List<Double>` 跟 `List<Integer>`、`List<Number>` 都不是亲戚（为什么这样设计，见下一篇）。要「更宽的参数」，用通配符：

```java
public static double sumOfRewards(List<? extends Number> rewards) {
    double sum = 0;
    for (Number r : rewards) {       // 读出来的都当 Number 用
        sum += r.doubleValue();
    }
    return sum;
}

System.out.println(sumOfRewards(List.of(1, 2)));      // 3.0
System.out.println(sumOfRewards(List.of(1.5, 2.5)));  // 4.0
```

`List<? extends Number>` 读作「某个未知类型的列表，该类型是 Number 或其子类」。只读不写时很好用；一旦想写入就撞墙——编译器报 `incompatible types: int cannot be converted to CAP#1`（完整报错见第 8 节修 Bug 题）。原因：编译器不知道运行时它到底是 `List<Integer>` 还是 `List<Double>`，往里放什么都可能放错，干脆禁止写入。反过来，往里写的场景用 `? super`：

```java
public static void grantRewards(List<? super Integer> rewards) {
    rewards.add(100);
    rewards.add(200);
}

List<Number> bank = new ArrayList<>();   // Number 是 Integer 的父类
grantRewards(bank);
System.out.println(bank);                // [100, 200]
```

选择规则两句口诀（PECS，生产者-消费者）：

| 参数角色 | 用法 | 记法 |
| --- | --- | --- |
| 生产者：你从它**读** | `? extends T` | Producer Extends |
| 消费者：你往它**写** | `? super T` | Consumer Super |
| 又读又写 | 写具体类型，不用通配符 | 读写都有就精确 |

## 5. 修改实验

三组实验都先预测，再运行。

实验一：把 `Box<String> itemBox = new Box<>();` 改成 `Box<Integer>` 但仍 `set("木剑")`，预测 javac 报什么。

实验二：把 `sumOfRewards` 的参数从 `List<? extends Number>` 改回 `List<Number>`（去掉通配符），再用 `List<Integer>` 调用，预测是否编译通过。

实验三：给 `grantRewards` 传 `List<Integer>`。`? super Integer` 的语义里「Integer 也算自己的父类」，预测合法与否，运行后打印验证。

答案：实验一报 `incompatible types: String cannot be converted to Integer`；实验二不通过——`List<Integer>` 不能转成 `List<Number>`，这正是通配符存在的理由；实验三合法，打印 `[100, 200]`。

## 6. 常见错误与调试实录

错误一：Raw Type——最危险的「能编译」。把第 2 节的 `Box` 去掉尖括号用：

```java
Box box = new Box();      // 尖括号没了：Raw Type（原始类型）
box.set("木剑");
box.set(42);              // 编译器只给警告，不拦
String item = (String) box.get();
```

普通编译只有两行不痛不痒的注释；加 `-Xlint:unchecked` 重编，警告全文：

```text
Note: Game.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Game.java:6: warning: [unchecked] unchecked call to set(T) as a member of the raw type Box
        box.set(42);
                   ^
```

Raw Type 等于亲手关掉第 2 节那道闸门：`set(T)` 退化为「什么都收」，错误重新变回「取数据的人运行时才炸」——第 1 节的 ClassCastException 就是这么来的。见到 unchecked 警告，正确动作是补上尖括号，而不是压掉警告。

错误二：以为泛型有继承。`List<Object> objects = new ArrayList<String>();` 报：

```text
Game.java:9: error: incompatible types: ArrayList<String> cannot be converted to List<Object>
        List<Object> objects = new ArrayList<String>();
                               ^
```

这不是编译器小气，是安全设计（论证在 410 篇）。真想「宽」就写 `List<? extends Object>`，只读场景可以直接写 `List<?>`。

错误三：基本类型进不了尖括号。`Box<int>` 会报 `unexpected type / required: reference, found: int`——尖括号里只能放引用类型，基本类型用包装类 `Box<Integer>`，代价是装箱，包装类的缓存陷阱见 [060 篇](/java/060-WrapperCacheTrap)。

## 7. 实际项目中的使用场景

- 集合 API 全是泛型：`List<Player>`、`Map<String, Integer>`，[集合框架](/java/210-CollectionFrameworkDetailed) 的每个类都长这样；
- 自写返回包装：`Result<T>`（成功装数据、失败装错误信息）、`Page<T>` 是最常见的自写泛型类；
- DAO 层：`interface Repository<T, ID> { T findById(ID id); }`，每个实体填自己的实参——Spring Data 的 `JpaRepository<T, ID>` 就是这个形状；
- 通配符多见于**库作者**的签名：JDK 的 `Collections.copy(List<? super T>, List<? extends T>)` 就是 PECS 双开。业务代码参数直接用具体类型，等你写库再回来补。

## 8. 小练习

预测题（先写答案再运行，5 分钟）：

```java
Box<String> a = new Box<>();
a.set("木剑");
Box<Integer> b = new Box<>();
b.set(42);
System.out.println(a.get().length() + b.get());
```

修改题（10 分钟）：写泛型方法 `public static <T> List<T> pickN(List<T> pool, int n)`，从奖池随机抽 n 个装进新列表返回。用 `List<String>` 与 `List<Integer>` 各调一次观察类型推断；自测断言：`pickN(names, 2).size() == 2` 且元素都来自原列表。

修 Bug 题（15 分钟）：下面代码想「先占个位再累加」，编译不过。按读报错三步定位后修好：

```java
public static int total(List<? extends Number> scores) {
    scores.add(0);        // 先占个位
    int sum = 0;
    for (Number s : scores) {
        sum += s.intValue();
    }
    return sum;
}
```

报错原文：

```text
Game.java:12: error: incompatible types: int cannot be converted to CAP#1
        scores.add(0);
                   ^
  where CAP#1 is a fresh type-variable:
    CAP#1 extends Number from capture of ? extends Number
```

（方向提示：`? extends` 只读，删掉占位行即可；若占位是刚需，参数改成 `List<Integer>` 这类可写的具体类型。）

挑战题（半小时，不给代码）：设计 `Result<T>`：装一个成功值或一条错误信息，提供静态工厂 `ok(T)`、`err(String)` 与 `isOk()`、`getData()`。用 `Result<String>` 与 `Result<Integer>` 各跑一遍；自测断言：`Result.ok("木剑").isOk()` 为 true，`Result.err("背包已满").getData()` 返回 null。泛型类声明与静态泛型方法本文都出现过，独立拼出这个最小件，就是你的第一个「库」。

预测题答案（先答再看）：输出 `44`——`"木剑".length()` 是 2（两个字符），加 42 得 44。

## 9. 什么时候应该 / 不应该这样用

应该：任何会被不同类型复用的类与方法（容器、工具、返回包装）都值得开类型参数；集合声明一律带实参，一个 Raw Type 都不留。

不应该：为一个只用一次的类型上泛型（过度设计）；尖括号里放基本类型；用 `@SuppressWarnings("unchecked")` 盖住本该补上的尖括号。

## 10. 与之前和之后的知识的关系

- 往前：100 篇的重载解决「参数类型换一批就重写一遍」，泛型用占位符一次写死所有变体；160 篇的接口在这里升级成参数化合同；
- 往后：[集合框架](/java/210-CollectionFrameworkDetailed) 的每个签名都带尖括号；[Lambda 与函数式编程](/java/290-LambdaFunctionalProgramming) 的 `Function<T, R>`、`Stream<T>` 是本文语法的延伸；
- 更远：`? extends` 为什么禁止写入、`List<Integer>` 为什么不算 `List<Number>` 的子类——在 [泛型深水区：类型擦除与运行时真相](/java/410-JavaGenericsTutorial) 给出：泛型是编译期的检查官，运行时它把类型信息擦掉了。

## 11. 官方文档

- Oracle 官方泛型教程（Generic Types / Generic Methods / Wildcards 等各节）：https://docs.oracle.com/javase/tutorial/java/generics/index.html
- 本文第 4 节通配符的原始出处（改写为游戏场景）：https://docs.oracle.com/javase/tutorial/java/generics/wildcards.html

## 12. 自我检查

- 能现场演示 Object 版与泛型版盒子的差别，并说清「爆炸位置」变化的意义；
- 能不看笔记写出泛型类与泛型方法，说清 `<T>` 的声明与推断各发生在哪；
- 给一个方法签名场景，能用「读还是写」决定 extends 还是 super；
- 看到 unchecked 警告知道含义，并选择补尖括号而不是压警告。

## 本章总结

泛型把「装什么」参数化：`Box<T>` 声明占位符，使用时填实参，编译器据此守住每一次读写；泛型方法把 `<T>` 写在返回值之前，实参类型通常自动推断；通配符按「读 extends、写 super、读写都有用具体类型」选择；Raw Type 是关掉闸门的旧写法，unchecked 警告必须当回事。下一篇把镜头转向运行时：被编译器拦下的那些写法，背后到底擦掉了什么。

## 下一步

进入 [泛型深水区：类型擦除与运行时真相](/java/410-JavaGenericsTutorial)：那里解释本文留下的所有「为什么不能」。
