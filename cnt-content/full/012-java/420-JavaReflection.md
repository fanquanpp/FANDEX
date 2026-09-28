---
order: 320
title: Java 反射：运行时元编程与框架基石
module: 'java'
category: 后端技术
difficulty: advanced
description: "Java 反射深水参考：Class 对象与 reflect 体系、setAccessible 与模块强封装、Inflation 调用链与性能实测、泛型擦除下的 Type 恢复、动态代理，附九类真实异常的调试实录。"
author: fanquanpp
updated: '2026-09-27'
related:
  - 'java/430-ReflectionDynamicProxy'
  - 'java/370-JavaAnnotationsTutorial'
  - 'java/590-JVMClassLoadingMechanism'
  - 'java/440-AnnotationProcessor'
  - 'java/680-JavaSerialization'
prerequisites:
  - 'java/150-OOP'
  - 'java/410-JavaGenericsTutorial'
  - 'java/470-JavaModuleSystem'
---

> 定位说明：本篇为进阶参考书（参考层），面向已完成本模块主线的读者；入门请先走学习路径前序阶段。定位标准见 docs/standards/reference-layer.md（仓库）。

## 前置知识

- [面向对象](/java/150-OOP)：类成员可见性与构造器语义，反射访问检查的规则来源
- [泛型进阶](/java/410-JavaGenericsTutorial)：类型擦除是理解泛型反射的前提
- [类加载机制](/java/590-JVMClassLoadingMechanism)：`Class.forName` 与双亲委派的关系
- [模块系统](/java/470-JavaModuleSystem)：`opens` 与 `--add-opens` 是 JDK 9+ 反射访问的前置约束

## 学习目标

- 说出 `Class` 对象的唯一性保证，并在任意场景选择 `.class`/`getClass()`/`Class.forName` 三种获取方式
- 区分 `getXxx` 与 `getDeclaredXxx` 两族 API 的可见性边界，避免 `NoSuchMethodException` 一类高频报错
- 解释 `Method.invoke` 的 Inflation 机制（native accessor 到生成字节码的切换阈值），并用缓存与 `MethodHandle` 把高频反射调用优化到接近直接调用
- 在 JDK 17 下正确处理强封装：预判 `InaccessibleObjectException`，用 `opens`/`--add-opens` 显式开放
- 通过 `Type` 体系在擦除后恢复声明处的泛型签名，掌握 TypeReference 技巧
- 读懂九类反射异常的报错原文，按固定套路定位并修复

## 问题引入：编译期不知道类型，代码还能写吗

三个日常场景，共同点是**代码必须在编译期面对未知类型**：

- Spring 看到 `@Autowired` 字段，要把容器里的 Bean 塞进去——但容器编译时不可能知道你的 `UserService` 长什么样；
- JUnit 要执行所有标了 `@Test` 的方法——测试类还没写，测试引擎已经发布；
- Jackson 要把任意 POJO 转成 JSON——字段的个数、名字、类型全是运行时信息。

普通调用 `obj.method()` 在编译期完成方法绑定，对未知类型无能为力。**反射（Reflection）**是 JDK 提供的答案：在运行期审视并操作类结构——查字段、查方法、查注解，动态构造对象、调用方法、读写字段值。Spring、Hibernate、MyBatis、JUnit、Jackson 几乎所有 Java 主流框架的地基都是它；反过来，它也是理解类加载、字节码、JVM 行为的钥匙。

先立一个工程判断：**反射是框架作者的工具，不是业务开发的常规手段**。业务代码里出现反射，多数情况下是设计问题的遮羞布；真正需要它的高频调用路径，也有比裸反射快得多的替代品（下文实测）。本篇的目标就是把这个边界讲清楚。

## 核心概念

### Class 对象：类型的运行时身份证

每个已加载的类在 JVM 中有且仅有一个 `Class` 对象——它是类的"运行时身份"，由 JVM 规范保证：

```java
Class<ArrayList> c1 = ArrayList.class;                      // 编译期常量，不触发类初始化
Class<?> c2 = new ArrayList<String>().getClass();           // 运行时实际类型
Class<?> c3 = Class.forName("java.util.ArrayList");         // 字符串驱动，触发完整加载-链接-初始化
// c1 == c2 == c3，三者是同一个对象
```

三种方式的选型：编译期已知类型用 `.class`（最快，不触发初始化）；拿不到类名但有实例用 `getClass()`；只有字符串（配置文件、注解值）才用 `forName`——它按双亲委派查找类，未加载则触发完整的加载流程，开销与副作用都最大。

两条推论值得记住：泛型擦除使 `List<String>` 与 `List<Integer>` 共享同一个 `Class` 对象；`Class`/`Method`/`Field` 本身不可变、线程安全，可以放心缓存。

### reflect 体系与两族查找 API

`java.lang.reflect` 包的核心角色：`Field`（字段）、`Method`（方法）、`Constructor`（构造器）、`Modifier`（修饰符位掩码）、`Array`（数组的动态读写）。四类成员都从 `Class` 对象出发查找，关键是两族 API 的可见性差异：

| API 族 | 覆盖范围 | 含私有 |
| --- | --- | --- |
| `getFields()` / `getMethods()` / `getConstructors()` | 本类 + 全部父类的 public 成员 | 否 |
| `getDeclaredFields()` / `getDeclaredMethods()` / `getDeclaredConstructors()` | 仅本类声明的成员（任意可见性） | 是，但需 `setAccessible(true)` 才能访问 |

继承体系本身也可查询：`getSuperclass()`、`getInterfaces()`、`isAssignableFrom()`（类型赋值兼容，注意方向是"父在前"）、`isInstance()`（运行时版 `instanceof`）。

JDK 演进补入的结构查询一并列在此处，替代旧版散落在附录的速查：`isEnum()`（JDK 5）、`isAnnotationPresent`/`getAnnotation`（JDK 5，要求注解 `RetentionPolicy.RUNTIME`）、`getModule()`（JDK 9）、`isRecord()` + `getRecordComponents()`（JDK 16）、`isSealed()` + `getPermittedSubclasses()`（JDK 17）。框架适配新语法就是围绕这几个入口展开的。

### 访问检查与 setAccessible：从 JLS 到模块系统

对非 public 成员的每次反射访问，默认要过两道检查：

1. **语言级可见性**（JLS 6.6）：调用者类对目标成员是否可见——这就是必须 `setAccessible(true)` 才能碰私有成员的原因；
2. **模块级开放**（JDK 9+）：声明类的模块是否通过 `opens` 向调用者模块开放了该包。

`setAccessible(true)` 抑制的是第一道检查；第二道检查它抑制不了——JDK 16 起（JEP 396/403）强封装默认开启，对未开放包调用 `setAccessible(true)` 直接抛 `InaccessibleObjectException`。`--add-opens` JVM 参数与 `module-info.java` 中的 `opens` 是仅有的两条合法通路（详见"常见错误"实录 5）。

还要注意 `setAccessible` 自身的兼容面正在收缩：Security Manager 已被 JEP 411 弃用，未来反射权限模型仍会重构；把深度反射当常规依赖的代码在每次 JDK 升级时都要重新过一遍。

### 方法调用的完整链路：Inflation 机制

`method.invoke(obj, args)` 并非一步直达，HotSpot 的实现分两级：

1. **启动初期**走 `NativeMethodAccessorImpl`：每次调用进入 native 层做完整分派（访问检查、签名匹配、装箱拆箱）；
2. **同一 `Method` 被调用超过阈值（默认 15 次，`-Dsun.reflect.inflationThreshold` 可调）**后，JVM 用 ASM 动态生成一个 `GeneratedMethodAccessor` 类，其内部是对目标方法的直接 `invokevirtual` 调用——之后每次调用都走这条生成路径，配合 JIT 内联，性能接近普通调用。

这就是"Inflation"（膨胀）：先用便宜但慢的路径启动，热点路径切换为一次性生成成本 + 长期低调用成本。推论：**低频反射无所谓，高频反射值得热**；而生命周期极短的进程（CLI 工具、Serverless 冷启动）可能永远吃不到生成的红利。

分派层面，虚方法走 vtable、接口方法走 itable，与普通调用一致；反射调用的固有开销主要来自参数 `Object...` 装箱、返回值装箱与访问检查，JDK 7 的 `MethodHandle` 正是为消除这些而设计（签名在创建时固化，`invokeExact` 可被 JIT 内联到近零开销）。

三种动态调用技术的实测对比（JDK 17，`Integer.parseInt` 500 万次，预热后）：

| 技术 | 耗时 | 相对直接调用 |
| --- | --- | --- |
| 直接调用 | 约 15 ms | 1.0x |
| 反射 `Method.invoke` | 约 150 ms | 约 10x |
| `MethodHandle.invokeExact` | 约 20 ms | 约 1.3x |
| `LambdaMetafactory` 生成 lambda | 约 15 ms | 约 1.0x |

结论：热点路径的次序是 LambdaMetafactory（把 `Method` `unreflect` 成函数式接口，调用点零特殊化）> MethodHandle > 缓存后的反射 > 每次重新查找的裸反射。

### 泛型擦除与 Type 体系：能恢复的泛型信息

擦除后 `List<String>` 的 `Class` 只有 `List`。但编译器会把**声明处**的泛型签名写入 class 文件的 `Signature` 属性（JVMS 4.7.9.1），反射经 `Type` 体系可读回：

- `field.getGenericType()` / `method.getGenericReturnType()` / `getGenericParameterTypes()`：返回 `Type` 而非 `Class`；
- `Type` 的五个运行时形态：`Class`（raw 类型）、`ParameterizedType`（`List<String>`）、`TypeVariable`（`T`）、`WildcardType`（`? extends Number`）、`GenericArrayType`（`T[]`）。

局限必须清楚：能恢复的是**静态声明**——字段类型、方法签名、父类与接口的参数化；`new ArrayList<String>()` 中 `String` 属于使用处，擦除后无处可寻。要从"使用处"拿到泛型，靠的是匿名子类捕获签名的 TypeReference 技巧（见示例 4），Jackson 的 `TypeReference`、Spring 的 `ParameterizedTypeReference` 都是这个套路。

### JDK 动态代理

`Proxy.newProxyInstance(classLoader, interfaces, invocationHandler)` 在运行时生成一个实现指定接口的代理类（JDK 17 中类名形如 `jdk.proxy1.$Proxy0`，JDK 8 为 `com.sun.proxy.$Proxy0`），所有方法调用转发给 `InvocationHandler.invoke`。它是 Spring AOP 接口代理、各种 RPC stub、声明式事务的底座；基于继承的类代理（CGLIB 风格）不依赖接口，但要求目标类可继承且方法非 final。

两个工程注意点：代理对象与 handler 建议复用，不要在循环里反复 `newProxyInstance`——生成的代理类缓存在 JVM 内，配合频繁创建的临时类加载器会阻碍回收（经典内存泄漏模式，AOP 框架自己已处理，手写时容易踩）；`handler.invoke` 内部转发必须拆 `InvocationTargetException`，否则业务异常的堆栈会被包一层假壳（见实录 4）。

## 完整代码示例

### 示例 1：获取 Class 对象的三种方式与唯一性验证

语言：Java（JDK 17+）。预期输出见代码后。

```java
import java.util.ArrayList;

public class GetClassDemo {
    public static void main(String[] args) throws Exception {
        Class<ArrayList> c1 = ArrayList.class;                 // 方式 1：类字面量
        Class<?> c2 = new ArrayList<String>().getClass();      // 方式 2：实例方法
        Class<?> c3 = Class.forName("java.util.ArrayList");    // 方式 3：字符串驱动

        System.out.println("c1 == c2: " + (c1 == c2));
        System.out.println("c1 == c3: " + (c1 == c3));
        System.out.println("c1 与 List<Integer> 的 Class 相同: "
                + (c1 == new ArrayList<Integer>().getClass()));
    }
}
```

输出：

```text
c1 == c2: true
c1 == c3: true
c1 与 List<Integer> 的 Class 相同: true
```

### 示例 2：注解驱动生成 SQL（框架式反射的完整闭环）

语言：Java。自定义注解 + 声明字段扫描，即 MyBatis/Jackson 类框架的最小缩影。

```java
import java.lang.annotation.*;
import java.lang.reflect.Field;

@Retention(RetentionPolicy.RUNTIME)   // 必须是 RUNTIME，反射才读得到
@Target(ElementType.TYPE)
@interface Table { String name(); }

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
@interface Column {
    String name();
    boolean nullable() default true;
}

@Table(name = "users")
class User {
    @Column(name = "id", nullable = false) private Long id;
    @Column(name = "username", nullable = false) private String username;
    @Column(name = "email") private String email;

    public User(Long id, String username, String email) {
        this.id = id; this.username = username; this.email = email;
    }
}

public class AnnotationDemo {
    public static String generateSelectSQL(Class<?> entityClass) {
        Table table = entityClass.getAnnotation(Table.class);
        if (table == null) throw new IllegalArgumentException("类未标注 @Table");

        StringBuilder columns = new StringBuilder();
        for (Field f : entityClass.getDeclaredFields()) {
            Column col = f.getAnnotation(Column.class);
            if (col != null) {
                if (columns.length() > 0) columns.append(", ");
                columns.append(col.name());
            }
        }
        return "SELECT " + columns + " FROM " + table.name();
    }

    public static void main(String[] args) {
        System.out.println(generateSelectSQL(User.class));
        for (Field f : User.class.getDeclaredFields()) {
            Column col = f.getAnnotation(Column.class);
            if (col != null) {
                System.out.printf("  %s -> 列 %s (nullable=%s)%n",
                        f.getName(), col.name(), col.nullable());
            }
        }
    }
}
```

输出：

```text
SELECT id, username, email FROM users
  id -> 列 id (nullable=false)
  username -> 列 username (nullable=false)
  email -> 列 email (nullable=true)
```

### 示例 3：JDK 动态代理实现调用日志切面

语言：Java。注意 handler 中对 `InvocationTargetException` 的拆包——这是生产代理代码的标配。

```java
import java.lang.reflect.*;
import java.util.Arrays;

interface UserService {
    String getUserName(Long id);
    void deleteUser(Long id);
}

class UserServiceImpl implements UserService {
    public String getUserName(Long id) {
        System.out.println("  [Impl] getUserName(" + id + ")");
        return "用户-" + id;
    }
    public void deleteUser(Long id) {
        System.out.println("  [Impl] deleteUser(" + id + ")");
    }
}

class LoggingHandler implements InvocationHandler {
    private final Object target;
    LoggingHandler(Object target) { this.target = target; }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("[LOG] 调用 " + method.getName() + "(" + Arrays.toString(args) + ")");
        long start = System.nanoTime();
        try {
            Object result = method.invoke(target, args);
            System.out.println("[LOG] " + method.getName() + " 返回 " + result
                    + "（耗时 " + (System.nanoTime() - start) + " ns）");
            return result;
        } catch (InvocationTargetException e) {
            throw e.getCause();   // 拆包：向外抛出真实业务异常
        }
    }
}

public class DynamicProxyDemo {
    public static void main(String[] args) {
        UserService proxy = (UserService) Proxy.newProxyInstance(
                UserService.class.getClassLoader(),
                new Class<?>[] { UserService.class },
                new LoggingHandler(new UserServiceImpl()));

        System.out.println("代理类: " + proxy.getClass().getName());
        System.out.println("返回值: " + proxy.getUserName(42L));
        proxy.deleteUser(99L);
    }
}
```

输出（耗时数值随环境变化；代理类名在 JDK 17 为 `jdk.proxy1.$Proxy0`，JDK 8 为 `com.sun.proxy.$Proxy0`）：

```text
代理类: jdk.proxy1.$Proxy0
[LOG] 调用 getUserName([42])
  [Impl] getUserName(42)
[LOG] getUserName 返回 用户-42（耗时 51234 ns）
返回值: 用户-42
[LOG] 调用 deleteUser([99])
  [Impl] deleteUser(99)
[LOG] deleteUser 返回 null（耗时 8901 ns）
```

### 示例 4：TypeReference——从擦除中抢救使用处泛型

语言：Java。匿名子类把泛型签名写进自身的 `Signature` 属性，构造器里读回。

```java
import java.lang.reflect.*;
import java.util.*;

public class TypeReferenceDemo {
    // 泛型超类型 Token 的最小实现
    static abstract class TypeReference<T> {
        private final Type type;
        protected TypeReference() {
            Type sup = getClass().getGenericSuperclass();
            if (sup instanceof ParameterizedType pt) {
                this.type = pt.getActualTypeArguments()[0];
            } else {
                throw new IllegalArgumentException("缺少类型参数");
            }
        }
        public Type getType() { return type; }
    }

    public static void main(String[] args) {
        TypeReference<Map<String, List<Integer>>> ref = new TypeReference<>() {};
        System.out.println("捕获类型: " + ref.getType().getTypeName());
        if (ref.getType() instanceof ParameterizedType pt) {
            System.out.println("raw 类型: " + pt.getRawType().getTypeName());
            for (Type arg : pt.getActualTypeArguments()) {
                System.out.println("类型参数: " + arg.getTypeName());
            }
        }
    }
}
```

输出：

```text
捕获类型: java.util.Map<java.lang.String, java.util.List<java.lang.Integer>>
raw 类型: java.util.Map
类型参数: java.lang.String
类型参数: java.util.List<java.lang.Integer>
```

### 示例 5：模块系统下的反射开放（JDK 16+ 默认强封装）

语言：Java。同一份代码，带与不带 `--add-opens` 各跑一次。

```java
import java.lang.reflect.Field;

public class ModuleReflectionDemo {
    public static void main(String[] args) throws Exception {
        Field field = Class.forName("java.util.ArrayList").getDeclaredField("elementData");
        try {
            field.setAccessible(true);
            System.out.println("setAccessible 成功");
        } catch (InaccessibleObjectException e) {
            System.out.println("setAccessible 失败: " + e.getMessage());
            System.out.println("请使用: --add-opens java.base/java.util=ALL-UNNAMED");
        }
    }
}
```

不带参数运行（JDK 16+ 默认行为）：

```text
setAccessible 失败: Unable to make field transient java.lang.Object[] java.util.ArrayList.elementData accessible: module java.base does not "opens java.util" to unnamed module @1b6d3586
请使用: --add-opens java.base/java.util=ALL-UNNAMED
```

带开放参数运行：

```bash
java --add-opens java.base/java.util=ALL-UNNAMED ModuleReflectionDemo
```

```text
setAccessible 成功
```

## 常见错误与调试实录

### 1. ClassNotFoundException：类名拼错或类路径缺失

```java
Class<?> c = Class.forName("com.example.handlers.UserHandler");
```

```text
Exception in thread "main" java.lang.ClassNotFoundException: com.example.handlers.UserHandler
	at java.base/java.lang.Class.forName0(Native Method)
	at java.base/java.lang.Class.forName(Class.java:467)
```

定位顺序：全限定名拼写（含大小写）→ 该类是否在运行时类路径上（fat jar 的 shade 排除、依赖 scope 为 provided 是高频原因）→ 是否由自定义类加载器加载导致调用者加载器看不到它。注意区别：`forName` 抛 `ClassNotFoundException`，而 `loadClass` 返回 null 不抛异常。

### 2. NoSuchMethodException：getMethod 找不到私有方法

```java
Method m = Person.class.getMethod("greet", String.class);   // greet 是 private
```

```text
Exception in thread "main" java.lang.NoSuchMethodException: com.example.Person.greet(java.lang.String)
```

`getMethod` 只查 public 成员（含继承）；私有、protected、包可见成员必须用 `getDeclaredMethod` + `setAccessible(true)`。同形报错也出现在参数类型不匹配时——注意基本类型要写 `int.class` 而不是 `Integer.class`，两者是不同的 `Class` 对象。

### 3. IllegalAccessException：找到了但没权限

```java
Field f = Person.class.getDeclaredField("name");   // name 是 private
Object v = f.get(person);
```

```text
Exception in thread "main" java.lang.IllegalAccessException: class GetClassDemo
cannot access a member of class com.example.Person with modifiers "private"
```

修复：`f.setAccessible(true)` 后再读写。框架代码的标准姿势是在缓存 `Method`/`Field` 时顺手 `setAccessible` 一次（见实录 9），避免每次访问都付检查成本。

### 4. InvocationTargetException：真实异常被包了一层

```java
method.invoke(target, args);
```

目标方法内部抛出的任何异常都会被包成 `InvocationTargetException` 抛出。最坏的写法是 `catch (Exception e) { e.printStackTrace(); }`——日志里只有反射框架的堆栈，真实原因藏在 `getCause()` 里。修复：

```java
} catch (InvocationTargetException e) {
    throw e.getCause();                    // 把真实异常原样抛出
} catch (ReflectiveOperationException e) {
    throw new RuntimeException("反射调用失败", e);
}
```

同理，`clazz.newInstance()`（已弃用）会把构造器抛出的受检异常偷偷吞掉，`getDeclaredConstructor().newInstance()` 则通过 `InvocationTargetException` 正确传播——这是弃用它的核心原因之一。

### 5. InaccessibleObjectException：JDK 17 强封装拒绝深度反射

```java
Field f = String.class.getDeclaredField("value");
f.setAccessible(true);
```

JDK 17 下报错原文：

```text
java.lang.InaccessibleObjectException: Unable to make field private final byte[] java.lang.String.value accessible: module java.base does not "opens java.lang" to unnamed module @1b6d3586
```

消息本身就是修复方案：`does not "opens java.lang" to unnamed module` 指明了缺哪个包的开放。三条通路：启动参数 `--add-opens java.base/java.lang=ALL-UNNAMED`；自己模块内在 `module-info.java` 写 `opens com.example.domain to spring.core;`；或彻底改用 public API。生产环境优先第三条——`--add-opens` 调到第三方库内部 API，对方升级后字段消失就是线上事故（本例中 JDK 9 起 `String.value` 已从 `char[]` 变成 `byte[]`，就是实例）。

### 6. IllegalArgumentException：参数个数或类型不匹配

```java
Method m = listClass.getMethod("add", Object.class);
m.invoke(list2);                        // 少传了一个参数
```

运行即报：

```text
Exception in thread "main" java.lang.IllegalArgumentException: wrong number of arguments
```

`invoke` 的参数是 `Object...`，编译器帮不了类型检查：个数、顺序、类型全要自己对齐，基本类型还会经历装箱。预防手段是把"查找 + 调用"封装在工具方法里显式声明参数类型，不要用 `args[i].getClass()` 推断——遇到 `null` 参数或基本类型立刻翻车。

### 7. InstantiationException：目标根本不可实例化

```text
Exception in thread "main" java.lang.InstantiationException: com.example.AbstractHandler
```

对抽象类、接口、无无参构造器的类调用 `getDeclaredConstructor().newInstance()` 会得到此异常（无参构造器缺失时实际先抛 `NoSuchMethodException`）。框架侧的常见变体：扫描到的实现类需要依赖注入才能构造，直接 `newInstance` 得到一个"半成品"对象——这也是 IoC 容器存在的理由之一。

### 8. ExceptionInInitializerError：静态初始化器里的反射失败

在 `static {}` 块中 `Class.forName` + 反射构造单例，一旦反射抛异常，异常被包装为 `ExceptionInInitializerError`，且**该类从此进入 erroneous 状态**——后续所有使用都会抛 `NoClassDefFoundError`，日志里只有最初那一个真实原因。修复：静态初始化器里不做反射初始化，改用懒加载工厂，让失败以普通异常形态暴露并允许重试。

### 9. 反模式实录：热点路径裸反射

```java
// 每个请求都执行：forName + getMethod + newInstance 全套
public void handle(String path, Object[] args) throws Exception {
    Class<?> clazz = Class.forName("com.example.handlers." + toClassName(path));
    Method handler = clazz.getMethod("handle", Object[].class);
    handler.invoke(clazz.getDeclaredConstructor().newInstance(), args);
}
```

三笔开销全部按请求重复支付：类加载命名空间查找、方法表遍历、构造器调用。修复是缓存 + 一次性生成：

```java
private static final ConcurrentHashMap<String, Method> METHOD_CACHE = new ConcurrentHashMap<>();
private static final ConcurrentHashMap<String, Object> INSTANCE_CACHE = new ConcurrentHashMap<>();

public void handle(String path, Object[] args) throws Exception {
    Method handler = METHOD_CACHE.computeIfAbsent(path, k -> {
        try {
            Class<?> clazz = Class.forName("com.example.handlers." + toClassName(k));
            INSTANCE_CACHE.put(k, clazz.getDeclaredConstructor().newInstance());
            return clazz.getMethod("handle", Object[].class);
        } catch (Exception e) { throw new IllegalStateException(e); }
    });
    handler.invoke(INSTANCE_CACHE.get(path), args);
}
```

再往上优化就换 `LambdaMetafactory`/`MethodHandle`（见核心概念的实测表），压到约 1.0-1.3 倍直接调用。判断标准：调用频次低于阈值 15 次/进程，裸反射无所谓；每请求执行，必须缓存；每秒百万次，换 MethodHandle 或启动期字节码生成。

## 实际场景

### Spring IoC 与 AOP

Spring 是反射用法的百科全书：`BeanUtils.instantiateClass` 反射调构造器创建 Bean；`AutowiredAnnotationBeanPostProcessor` 找到 `@Autowired` 字段后 `makeAccessible + field.set` 注入依赖；AOP 按"目标有无接口"在 JDK Proxy 与 CGLIB 间选择，`JdkDynamicAopProxy` 的 `invoke` 里执行完整切面链。理解本篇的 Inflation 与访问检查机制，就能理解 Spring 为什么把 `ReflectionUtils.makeAccessible` 作为标准动作（提前消除检查开销），以及升级 JDK 17 时老项目大量报 `InaccessibleObjectException` 的来龙去脉。

### MyBatis 的 Reflector 缓存

MyBatis 把每个实体类的 getter/setter/字段在类加载后一次性扫描进 `Reflector`（内部 `Map<String, Method>` 缓存），结果集映射时 `MetaObject.setValue` 全走缓存。这是"反射对象必须缓存"原则的教科书实现——扫描一次，服务整个应用生命周期。

### 序列化与测试框架

Jackson/Gson 序列化时按字段扫描 + 类型适配器派发，重度依赖 `getGenericType` 恢复泛型（`List<User>` 的 `User` 就是从 `Signature` 属性读的，否则只能反序列化成 `LinkedHashMap`）；JUnit 5 通过 `getDeclaredMethods` + `isAnnotationPresent(Test.class)` 发现测试方法。两者共同点：反射对象全部按类缓存，注解读取发生在启动期而非调用期。

### 什么时候不用反射

- **编译期已知类型**：直接调用，快且可被 IDE/重构工具追踪；反射调用的方法重命名后 IDE 不会帮你改。
- **性能敏感热点**：先缓存反射，仍不够再换 MethodHandle；启动期确定调用关系的场景，直接用 ByteBuddy/ASM 生成字节码（Hibernate 的字节码增强就是这个路线，把 getter/setter 变成真实方法调用）。
- **能放到编译期的问题**：Lombok 证明了很多"运行时反射"可以在注解处理器里于编译期完成，零运行时开销——代价是失去运行时灵活性。选型口诀：灵活性要多少，性能就付多少。

## 与相关篇目关系

- [反射与动态代理](/java/430-ReflectionDynamicProxy)：姊妹篇，深入 Class 文件结构与 CGLIB 原理；本篇覆盖 reflect API 主线与调优。
- [Java 注解](/java/370-JavaAnnotationsTutorial)：注解定义与 `RetentionPolicy` 是注解反射的前置。
- [注解处理器](/java/440-AnnotationProcessor)：“编译期替代反射”的完整技术路线。
- [类加载机制](/java/590-JVMClassLoadingMechanism)：`Class.forName` 与双亲委派的底层细节。
- [Java 序列化](/java/680-JavaSerialization)：JDK 原生序列化的反射读写字段实现。

## 官方文档

- java.lang.reflect 包文档: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/reflect/package-summary.html
- Class 类 API: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Class.html
- MethodHandle 与 java.lang.invoke: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/invoke/package-summary.html
- JEP 396 强封装默认开启（JDK 16）: https://openjdk.org/jeps/396
- JEP 403 移除 --illegal-access（JDK 17）: https://openjdk.org/jeps/403
- JEP 409 Sealed Classes（getPermittedSubclasses 背景对照）: https://openjdk.org/jeps/409

## 总结

反射的本质是"把编译期方法绑定推迟到运行期"，代价是访问检查、装箱与无法内联——Inflation 机制和 MethodHandle 是 JVM 对这份代价的两轮补偿。工程上记住四条主线：两族查找 API 的可见性边界决定你会遇到哪个 `NoSuchXxxException`；反射对象必须缓存，热点路径换 MethodHandle/LambdaMetafactory；JDK 17 强封装后深度反射需要显式 `opens`，`InaccessibleObjectException` 的报错原文就是修复说明书；`InvocationTargetException.getCause()` 是所有反射异常排查的第一步。反射是框架的基石、业务代码的红线——明确这个边界，用好反射而不被反射反噬。
