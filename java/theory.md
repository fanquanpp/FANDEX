# Java 理论知识点

## JVM 类加载机制

### 类加载过程

JVM 将 `.class` 文件加载到内存并转化为运行时数据结构，经历五个阶段：

```
加载(Loading) -> 链接(Linking) -> 初始化(Initialization) -> 使用 -> 卸载
                    |
                    +-- 验证(Verification)
                    +-- 准备(Preparation)
                    +-- 解析(Resolution)
```

#### 加载（Loading）

通过类的全限定名获取二进制字节流，将字节流转化为方法区的运行时数据结构，在堆中生成对应的 `java.lang.Class` 对象。

字节流来源：
- 本地文件系统（.class 文件）
- JAR/WAR 包
- 网络下载
- 动态代理生成（`java.lang.reflect.Proxy`）
- JSP 编译生成

#### 链接（Linking）

- **验证** -- 确保 Class 文件格式正确、元数据合法、字节码指令合法、符号引用有效。包括文件格式验证、元数据验证、字节码验证和符号引用验证。
- **准备** -- 为静态变量分配内存并设置零值初始值（注意：`static final` 常量在此阶段直接赋值）。
- **解析** -- 将常量池中的符号引用替换为直接引用（内存地址或偏移量）。

#### 初始化（Initialization）

执行类的 `<clinit>()` 方法，即静态变量赋值和静态代码块的合并。JVM 保证 `<clinit>()` 在多线程环境下被正确同步。

```java
public class Example {
    static int a = 10;           // 准备阶段 a=0，初始化阶段 a=10
    static final int B = 20;     // 准备阶段 B=20（编译期常量）
    static final int C;          // 准备阶段 C=0，初始化阶段赋值
    static {
        C = 30;
    }
}
```

### 双亲委派模型

类加载器按照层级组织，子加载器先委托父加载器加载类：

```
Bootstrap ClassLoader (启动类加载器)
    |--- 加载 rt.jar, tools.jar 等 JDK 核心类库
    |
Extension ClassLoader (扩展类加载器)
    |--- 加载 ext 目录下的类库
    |
Application ClassLoader (应用程序类加载器)
    |--- 加载 classpath 下的类
    |
Custom ClassLoader (自定义类加载器)
```

双亲委派的工作流程：
1. 收到类加载请求时，先委托父加载器加载
2. 父加载器无法加载时，才由自己加载
3. 保证核心类库不会被用户类覆盖（安全性）

打破双亲委派的场景：
- **SPI 机制** -- JDBC 的 Driver 接口在 rt.jar，实现类在第三方 JAR。使用线程上下文类加载器（Thread Context ClassLoader）解决。
- **OSGi** -- 模块化框架使用网状类加载器结构
- **Tomcat** -- 每个 Web 应用独立的类加载器，优先加载应用自己的类
- **热部署** -- 自定义类加载器重新加载已修改的类

### 类加载时机

主动引用（必须初始化）：
- `new`、`getstatic`、`putstatic`、`invokestatic` 四条字节码指令
- 反射调用 `Class.forName()`
- 初始化子类时，父类先初始化
- JVM 启动时的主类
- MethodHandle/VarHandle 解析时

被动引用（不触发初始化）：
- 通过子类引用父类静态字段，只初始化父类
- 通过数组定义引用类：`MyClass[] arr = new MyClass[10]`
- 引用编译期常量：`System.out.println(MyClass.CONSTANT)`

---

## JIT 编译（Just-In-Time Compilation）

### 解释执行与编译执行

JVM 采用解释执行与编译执行混合的模式：

- **解释器（Interpreter）** -- 逐条解释字节码执行，启动快但运行慢
- **JIT 编译器** -- 将热点代码编译为本地机器码，启动慢但运行快

```
字节码 --> 解释器 --> 执行
              |
              +--> 方法调用计数器达到阈值 --> JIT 编译器 --> 本地机器码 --> 执行
```

### 热点探测

JIT 编译器只编译"热点代码"，判断标准：

1. **方法调用计数器** -- 方法被调用的次数超过阈值（默认 10000 次，Client 模式 1500 次）
2. **回边计数器** -- 循环体回边次数超过阈值

计数器会随时间衰减（半衰期机制），避免长期不用的热点代码占用编译缓存。

### 分层编译（Tiered Compilation）

从 Java 7 开始引入，Java 8 默认启用：

| 层级 | 编译器 | 优化级别 | 特点 |
|------|-------|---------|------|
| 0 | 解释器 | 无 | 收集 profiling 数据 |
| 1 | C1（Client Compiler） | 简单优化 | 编译快，优化少 |
| 2 | C1 | 较多优化 | 带 profiling |
| 3 | C1 | 完全优化 | 带 profiling |
| 4 | C2（Server Compiler） | 完全优化 | 编译慢，优化激进 |

典型路径：0 -> 3 -> 4（先 C1 快速编译，再 C2 深度优化）

### JIT 优化技术

1. **方法内联（Method Inlining）**
   将被调用方法的代码直接嵌入调用处，消除调用开销，并为后续优化创造条件。
   ```java
   // 内联前
   int result = add(3, 5);
   int add(int a, int b) { return a + b; }

   // 内联后
   int result = 3 + 5;  // 进一步优化为常量折叠
   int result = 8;
   ```

2. **逃逸分析（Escape Analysis）**
   分析对象的作用域是否逃出方法/线程，对未逃逸对象进行优化：
   - **栈上分配** -- 对象分配在栈上，方法结束自动回收，无需 GC
   - **标量替换** -- 将对象拆解为基本类型，直接使用局部变量
   - **锁消除** -- 对只在单线程使用的同步锁，消除锁操作

3. **循环优化**
   - **循环展开** -- 减少循环次数，增加每次迭代的工作量
   - **循环不变量外提** -- 将循环内不变的计算移到循环外
   - **数组边界检查消除** -- 通过分析消除不必要的边界检查

4. **分支预测优化**
   根据 profiling 数据优化分支代码布局，将大概率执行的路径放在前面。

### 逆优化（Deoptimization）

当 JIT 编译的假设不再成立时（如新的类加载导致内联失效），JVM 会丢弃编译后的机器码，回退到解释执行。这是保证正确性的安全机制。

---

## 内存屏障（Memory Barrier）

### 为什么需要内存屏障

现代 CPU 和编译器会对指令进行重排序以提升性能。内存屏障用于禁止特定类型的重排序，保证多线程程序的正确性。

### 重排序类型

| 重排序类型 | 说明 | 示例 |
|-----------|------|------|
| 编译器重排序 | 编译器优化改变指令顺序 | 交换无依赖的语句 |
| CPU 重排序 | CPU 乱序执行改变指令顺序 | StoreStore、LoadLoad、LoadStore、StoreLoad |
| 缓存重排序 | CPU 缓存导致可见性问题 | 写入缓冲区未刷新到主存 |

### 四种内存屏障

| 屏障类型 | 指令 | 作用 |
|---------|------|------|
| LoadLoad | Load1; LoadLoad; Load2 | Load1 必须在 Load2 之前完成读取 |
| StoreStore | Store1; StoreStore; Store2 | Store1 必须在 Store2 之前对其他处理器可见 |
| LoadStore | Load1; LoadStore; Store2 | Load1 必须在 Store2 之前完成读取 |
| StoreLoad | Store1; StoreLoad; Load2 | Store1 必须对其他处理器可见后才能执行 Load2 |

StoreLoad 是最昂贵的屏障，也是唯一能防止 Store-Load 重排序的屏障。

### Java 中的内存屏障

不同 volatile 操作插入的屏障：

| 操作 | 前置屏障 | 后置屏障 |
|------|---------|---------|
| volatile 读 | LoadLoad + LoadStore | 无 |
| volatile 写 | 无 | StoreStore + StoreLoad |

```java
// volatile 写
StoreStore屏障    // 保证之前的写操作已完成
value = 1;        // volatile 写
StoreLoad屏障     // 保证写操作对后续读可见

// volatile 读
LoadLoad屏障      // 保证之后的读操作不会重排到前面
int v = value;    // volatile 读
LoadStore屏障     // 保证之后的写操作不会重排到前面
```

### final 字段的内存语义

在构造函数中设置 final 字段后，构造函数返回时插入 StoreStore 屏障，保证其他线程看到对象引用时，final 字段已正确初始化：

```java
public class SafePublication {
    final int x;
    public SafePublication() {
        x = 42;
        // StoreStore 屏障隐式插入
    }
}
```

---

## happens-before 关系

### 定义

happens-before 是 Java 内存模型（JMM）定义的偏序关系，用于判断一个操作的结果对另一个操作是否可见。如果 A happens-before B，则 A 的操作结果对 B 可见（但 A 不一定在 B 之前执行）。

### 八条 happens-before 规则

1. **程序顺序规则** -- 同一线程中，按代码顺序前面的操作 happens-before 后面的操作
2. **监视器锁规则** -- unlock 操作 happens-before 后续对同一锁的 lock 操作
3. **volatile 规则** -- volatile 写操作 happens-before 后续对同一变量的 volatile 读操作
4. **线程启动规则** -- Thread.start() happens-before 该线程的所有操作
5. **线程终止规则** -- 线程的所有操作 happens-before Thread.join() 返回
6. **线程中断规则** -- interrupt() 调用 happens-before 被中断线程检测到中断
7. **对象初始化规则** -- 构造函数执行结束 happens-before finalize() 调用
8. **传递性** -- 如果 A happens-before B，B happens-before C，则 A happens-before C

### happens-before 与时间先后

happens-before 不等于时间上的先后。一个操作 happens-before 另一个操作，只意味着前者的结果对后者可见，但实际执行顺序可能不同（只要不影响结果）。

```java
// 线程 1
int a = 1;      // A
volatile int b = 1;  // B (volatile 写)

// 线程 2
int x = b;      // C (volatile 读)
int y = a;      // D

// B happens-before C (volatile 规则)
// A happens-before B (程序顺序)
// A happens-before C (传递性)
// 所以线程 2 读取 x=1 时，y 也一定为 1
```

### 安全发布模式

利用 happens-before 规则确保对象正确发布：

1. **静态初始化** -- 类初始化时由 JVM 保证线程安全
   ```java
   public static final Singleton INSTANCE = new Singleton();
   ```

2. **volatile 引用** -- volatile 写 happens-before 后续读
   ```java
   private volatile Singleton instance;
   ```

3. **final 字段** -- 构造函数结束时的 StoreStore 屏障保证
   ```java
   public class SafeHolder { final int value; }
   ```

4. **同步容器** -- 锁的 happens-before 保证
   ```java
   Collections.synchronizedMap(new HashMap<>());
   ```

5. **ConcurrentHashMap** -- 内部使用 volatile 和 CAS 保证可见性

---

## 理论速查表

| 概念 | 核心要点 | 关键细节 |
|------|---------|---------|
| 类加载 | 加载 -> 链接 -> 初始化 | 双亲委派保证核心类安全 |
| JIT 编译 | 热点代码编译为机器码 | C1 快速编译，C2 深度优化 |
| 逃逸分析 | 分析对象作用域 | 栈上分配、标量替换、锁消除 |
| 内存屏障 | 禁止指令重排序 | StoreLoad 最昂贵 |
| happens-before | 操作可见性保证 | 8 条规则，传递性 |
| volatile | 轻量级同步 | 保证可见性，不保证原子性 |
| final 语义 | 初始化安全 | 构造函数结束时的 StoreStore 屏障 |
| 逆优化 | JIT 假设失效时回退 | 保证正确性 |
