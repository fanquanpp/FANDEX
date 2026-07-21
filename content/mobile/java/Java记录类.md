# Java 记录类

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 记录类定义

**单行写法：简单记录类**
`public record <记录名>(<类型1> <字段1>, <类型2> <字段2>) { }`
```java
// 单行定义简单记录类
public record Point(int x, int y) { }
```

---

**换行写法：多字段记录类**
`public record <记录名>(<类型1> <字段1>, <类型2> <字段2>, <类型3> <字段3>) { }`
```java
// 换行定义多字段记录类
public record User(
        String name,
        int age,
        String email
) { }
```

---

**基本写法：使用记录类**
`<记录名> <变量> = new <记录名>(<值1>, <值2>);`
```java
// 创建记录类实例
Point p = new Point(10, 20);
```

---

## 访问器方法

**基本写法：访问字段**
`<记录变量>.<字段名>()`
```java
// 获取记录类字段值
int x = p.x();
```

---

**基本写法：访问多个字段**
`<记录变量>.<字段1>(); <记录变量>.<字段2>();`
```java
// 获取多个字段值
int x = p.x();
int y = p.y();
```

---

## 自动生成方法

**基本写法：toString**
`<记录变量>.toString()`
```java
// 自动生成的 toString 方法
String str = p.toString();
```

---

**基本写法：equals**
`<记录变量1>.equals(<记录变量2>)`
```java
// 自动生成的 equals 方法比较字段值
boolean same = p1.equals(p2);
```

---

**基本写法：hashCode**
`<记录变量>.hashCode()`
```java
// 自动生成的 hashCode 方法
int hash = p.hashCode();
```

---

## 紧凑构造方法

**基本写法：紧凑构造方法验证**
`public <记录名> { if (<条件>) throw new <异常>; }`
```java
// 紧凑构造方法进行参数验证
public record Age(int value) {
    public Age {
        if (value < 0) {
            throw new IllegalArgumentException("Age cannot be negative");
        }
    }
}
```

---

**基本写法：紧凑构造方法规范化**
`public <记录名> { <字段> = <规范化值>; }`
```java
// 紧凑构造方法规范化字段值
public record Name(String value) {
    public Name {
        value = value.trim();
    }
}
```

---

## 自定义构造方法

**基本写法：规范构造方法**
`public <记录名>(<类型1> <参数1>, <类型2> <参数2>) { this.<字段1> = <参数1>; }`
```java
// 显式定义规范构造方法
public record Point(int x, int y) {
    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }
}
```

---

**基本写法：自定义构造方法**
`public <记录名>(<参数>) { this(<默认值>, <默认值>); }`
```java
// 自定义辅助构造方法
public record Point(int x, int y) {
    public Point() {
        this(0, 0);
    }
}
```

---

## 添加成员方法

**基本写法：添加实例方法**
`public <返回类型> <方法名>() { }`
```java
// 记录类中添加实例方法
public record Point(int x, int y) {
    public double distanceFromOrigin() {
        return Math.sqrt(x * x + y * y);
    }
}
```

---

**基本写法：添加静态方法**
`public static <返回类型> <方法名>() { }`
```java
// 记录类中添加静态方法
public record Point(int x, int y) {
    public static Point origin() {
        return new Point(0, 0);
    }
}
```

---

## 实现接口

**基本写法：记录类实现接口**
`public record <记录名>(<字段>) implements <接口> { }`
```java
// 记录类实现接口
public record Point(int x, int y) implements Comparable<Point> {
    @Override
    public int compareTo(Point other) {
        return Integer.compare(this.x, other.x);
    }
}
```

---

## 局部记录类

**基本写法：方法内定义记录类**
`record <记录名>(<类型> <字段>) { }`
```java
// 在方法内部定义局部记录类
public void process() {
    record Pair(int a, int b) { }
    Pair pair = new Pair(1, 2);
}
```

---

## 记录类与模式匹配

**基本写法：instanceof 模式匹配**
`if (<对象> instanceof <记录类>(<变量1>, <变量2>)) { }`
```java
// 记录类与 instanceof 模式匹配
if (obj instanceof Point(int x, int y)) {
}
```

---

**基本写法：switch 模式匹配**
`switch (<对象>) { case <记录类>(<变量1>, <变量2>) -> <结果>; }`
```java
// 记录类与 switch 模式匹配
String desc = switch (shape) {
    case Point(int x, int y) -> "Point at " + x + "," + y;
    default -> "Unknown";
};
```
