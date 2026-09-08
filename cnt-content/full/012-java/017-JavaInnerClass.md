---
order: 170
title: Java 内部类详解
module: 'java'
category: 后端技术
difficulty: beginner
description: 成员内部类、静态内部类、局部内部类与匿名内部类的语法、典型场景与内存泄漏陷阱，零基础保姆级讲解。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/015-OOP'
  - 'java/016-AbstractClassInterface'
  - 'java/029-LambdaFunctionalProgramming'
prerequisites:
  - 'java/015-OOP'
---

## 0. 学习目标（可验证）

- [ ] 能说出 4 种内部类的写法与区别
- [ ] 能写出 `外部类名.this` 访问外部类成员
- [ ] 能写出一个匿名内部类，并用 Lambda 等价替换
- [ ] 能解释"静态内部类为什么不会泄漏外部类实例"

## 1. 一句话理解

> 内部类就是"长在类里面的类"。它最大的特权是**天然能访问外部类的私有成员**，最适合做辅助类：迭代器、回调、事件监听。

## 2. 为什么需要内部类

| 场景 | 不用内部类 | 用内部类 |
| --- | --- | --- |
| 回调函数（按钮点击、任务完成） | 要额外传外部对象，麻烦 | 直接访问外部类私有成员 |
| 集合迭代器（ArrayList 的 Itr） | 无法访问内部数组 | 内部类贴身访问 `elementData` |
| 辅助类（Builder、节点） | 污染包命名空间 | 逻辑归属清晰 |

**拆解讲解**：内部类的本质是"编译器帮你隐式保存了外部类对象的引用"，所以它才能访问外部类的私有成员——这也是后面内存泄漏问题的根源（第 8 节）。

## 3. 成员内部类（实例内部类）

```java
public class Outer {
    private int value = 10;

    // 成员内部类：定义在类体里，不带 static
    public class Inner {
        public void show() {
            System.out.println(value);      // 直接访问外部私有成员
            System.out.println(Outer.this.value); // 显式写法
        }
    }
}
```

创建成员内部类必须先有外部类对象：

```java
Outer outer = new Outer();
Outer.Inner inner = outer.new Inner();   // 语法：外部对象.new 内部类()
inner.show();                            // 输出 10
```

**拆解讲解**：

1. 成员内部类依赖外部类实例，所以创建语法是 `外部对象.new 内部类()`。
2. 当内部类和外部类有同名成员时，`Outer.this.成员` 显式指定外部类的成员。
3. 成员内部类**不能声明 static 成员**（Java 16 之前），因为它的生命周期绑定外部实例。
4. 编译后生成 `Outer$Inner.class` 文件，`$` 表示嵌套关系。

## 4. 静态内部类

```java
public class Outer {
    private static int staticValue = 1;
    private int instanceValue = 2;

    // 静态内部类：不依赖外部类实例
    public static class StaticInner {
        public void show() {
            System.out.println(staticValue);   // 可以访问外部静态成员
            // System.out.println(instanceValue); // 错误：没有外部实例
        }
    }
}

Outer.StaticInner si = new Outer.StaticInner();  // 不需要外部对象
```

| 对比项 | 成员内部类 | 静态内部类 |
| --- | --- | --- |
| 是否需要外部实例 | 需要 | 不需要 |
| 是否持有外部类引用 | 持有（隐藏字段） | 不持有 |
| 能否访问外部实例成员 | 能 | 不能 |
| 常见场景 | 迭代器、回调 | Builder、嵌套数据结构 |

**拆解讲解**：静态内部类不持有外部类引用，因此**不会导致外部类实例无法被回收**（内存安全），这是"能用静态内部类就不用成员内部类"这条工程规则的原因。

## 5. 局部内部类

```java
public class Outer {
    public void method() {
        int local = 5;   // 局部变量

        // 局部内部类：定义在方法内，作用域只在本方法
        class LocalInner {
            void show() {
                System.out.println(local);  // 捕获局部变量
            }
        }
        new LocalInner().show();
    }
}
```

**拆解讲解**：

1. 局部内部类只在所在方法内可见，方法结束即失效。
2. 它捕获的局部变量必须是 `final` 或"事实上 final"（赋值后不再修改），否则编译报错——这是 Java 8 起的规则。
3. 使用频率较低，主要在需要"方法内临时辅助逻辑"时使用。

## 6. 匿名内部类

匿名内部类 = "没有名字、只使用一次的内部类"，常用于接口或抽象类的临时实现：

```java
Runnable task = new Runnable() {       // Runnable 是接口
    @Override
    public void run() {
        System.out.println("任务执行");
    }
};
new Thread(task).start();
```

如果接口只有一个抽象方法（函数式接口），可以直接用 Lambda 等价替换：

```java
Runnable task = () -> System.out.println("任务执行");
```

**拆解讲解**：

1. 语法固定为 `new 接口名/类名() { 方法实现 }`，结尾的 `;` 不能丢。
2. 匿名内部类里 `this` 指向**匿名类自己**，不是外部类；要访问外部成员需写 `外部类名.this`。
3. 匿名类本质是"一次性实现"，Lambda 更简洁，但 Lambda 不能定义额外字段/方法，复杂逻辑仍用匿名类。

## 7. 编译产物与反射

```text
Outer.java
  -> Outer.class          外部类
  -> Outer$Inner.class    成员内部类
  -> Outer$StaticInner.class 静态内部类
  -> Outer$1Local.class   局部内部类（数字编号）
  -> Outer$1.class        匿名内部类（数字编号）
```

**拆解讲解**：用 `javap -p Outer\$Inner` 可以看到成员内部类里隐藏的外部类引用字段 `this$0`——这就是"内部类持有外部引用"的实物证据，也是理解内存泄漏的关键。

## 8. 内部类与内存泄漏

**问题**：成员内部类隐式持有外部类对象引用。如果内部类对象活得久（例如注册成全局监听器），外部类对象就永远无法被 GC 回收。

```java
public class Activity {
    private Handler handler = new Handler() {   // 匿名内部类持有 Activity
        @Override
        public void handleMessage(Message msg) {
            // 处理消息
        }
    };
}
```

**经典解法**：把内部类改成**静态内部类**，需要外部数据时通过弱引用（`WeakReference`）获取：

```java
public class Activity {
    private static class SafeHandler extends Handler {
        private final WeakReference<Activity> activityRef;
        SafeHandler(Activity activity) {
            activityRef = new WeakReference<>(activity);
        }
    }
}
```

**拆解讲解**：

1. `Handler` 被系统全局持有，而匿名内部类又持有 `Activity`，形成"外部无法回收"的引用链——这就是 Android 开发中著名的 Handler 内存泄漏。
2. 静态内部类不持有外部引用，`WeakReference` 允许 Activity 在需要时被回收。
3. 通用工程规则：**生命周期长的对象不要使用成员/匿名内部类**。

## 9. 常见陷阱

| 陷阱 | 现象 | 解决 |
| --- | --- | --- |
| 忘记外部实例 | `new Outer.Inner()` 编译报错 | 用 `outer.new Inner()` |
| 成员内部类写 static 成员 | 编译报错（Java 16 前） | 改静态内部类 |
| 匿名类里 this 指错对象 | 访问不到外部成员 | 用 `外部类名.this` |
| 局部内部类修改变量 | "variable is accessed from within inner class" | 变量声明为 final |
| 长生命周期持有外部引用 | 内存泄漏 | 静态内部类 + 弱引用 |
| 序列化内部类 | `NotSerializableException` | 内部类实现 Serializable 或改用顶层类 |

## 10. 动手试试

**入门版（必做）**：

1. 写一个 `Outer`：包含私有字段、一个成员内部类和一个静态内部类，分别访问外部类的私有字段，观察哪些能编译、哪些不能。
2. 用 `javap -p` 查看编译产物，找到 `this$0` 字段。

**进阶版（选做）**：

1. 用匿名内部类实现 `Comparator<String>`，再改写成 Lambda，对比两种写法。
2. 模拟 Handler 场景：写一个"全局注册表"持有某个类的匿名回调，观察 GC 日志（`-Xlog:gc`），验证静态内部类方案不会泄漏。

## 11. 一句话记住

> 内部类四种：成员、静态、局部、匿名；静态不持外部引用、匿名可换 Lambda、生命周期长要警惕内存泄漏。
