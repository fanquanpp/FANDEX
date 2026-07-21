# Java 变量与常量

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量声明

**基本写法：声明变量**
`<类型> <变量名>;`
```java
// 声明一个整型变量
int age;
```

---

**基本写法：变量赋值**
`<变量名> = <值>;`
```java
// 给已声明的变量赋值
age = 18;
```

---

**基本写法：声明并初始化**
`<类型> <变量名> = <值>;`
```java
// 声明并初始化整型变量
int age = 18;
```

---

**单行写法：多变量声明**
`<类型> <变量名1>, <变量名2> = <值>, <变量名3>;`
```java
// 一次声明多个相同类型的变量
int x, y = 5, z;
```

---

## 局部变量

**基本写法：局部变量声明**
`<类型> <变量名> = <值>;`
```java
// 在方法内部声明局部变量
public void method() {
    int localVariable = 10;
}
```

---

**基本写法：代码块内局部变量**
`<类型> <变量名> = <值>;`
```java
// 在 if 块内声明局部变量
if (condition) {
    int ifVariable = 20;
}
```

---

## 成员变量

**基本写法：成员变量声明**
`<修饰符> <类型> <变量名>;`
```java
// 在类中定义成员变量
public class Person {
    private String name;
}
```

---

**换行写法：多成员变量声明**
`<修饰符> <类型> <变量名1>; <修饰符> <类型> <变量名2>;`
```java
// 在类中定义多个成员变量
public class Person {
    private String name;
    private int age;
    private boolean isAdult;
}
```

---

## 静态变量

**基本写法：静态变量声明**
`public static <类型> <变量名> = <值>;`
```java
// 定义静态变量
public class Counter {
    public static int count = 0;
}
```

---

**基本写法：访问静态变量**
`<类名>.<静态变量>`
```java
// 通过类名访问静态变量
int currentCount = Counter.count;
```

---

## final 常量

**基本写法：类级别 final 常量**
`public static final <类型> <常量名> = <值>;`
```java
// 定义不可修改的静态常量
public static final double PI = 3.1415926535;
```

---

**基本写法：实例级别 final 常量**
`public final <类型> <常量名>;`
```java
// 定义在构造方法中初始化的常量
public class Student {
    public final int ID;
}
```

---

**基本写法：局部 final 常量**
`final <类型> <常量名> = <值>;`
```java
// 在方法内定义不可变变量
public void method() {
    final int LOCAL_CONSTANT = 100;
}
```

---

## 枚举常量

**单行写法：枚举定义**
`public enum <枚举名> { <常量1>, <常量2> }`
```java
// 单行定义枚举
public enum Day { MONDAY, TUESDAY, WEDNESDAY }
```

---

**换行写法：枚举定义**
`public enum <枚举名> { <常量1>, <常量2>, ... }`
```java
// 换行定义枚举
public enum Day {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY
}
```

---

**基本写法：使用枚举常量**
`<枚举名>.<常量名>`
```java
// 引用枚举常量
Day today = Day.MONDAY;
```

---

## var 类型推断

**基本写法：var 声明基本类型**
`var <变量名> = <值>;`
```java
// 使用 var 推断整型
var count = 10;
```

---

**基本写法：var 声明字符串**
`var <变量名> = "<字符串>";`
```java
// 使用 var 推断字符串类型
var name = "Java";
```

---

**基本写法：var 声明集合**
`var <变量名> = new <集合类><>();`
```java
// 使用 var 推断集合类型
var list = new ArrayList<String>();
```

---

**基本写法：var 声明数组**
`var <变量名> = new <类型>[]{ <元素> };`
```java
// 使用 var 推断数组类型
var numbers = new int[]{1, 2, 3};
```
