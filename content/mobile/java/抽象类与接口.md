# Java 抽象类与接口

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 抽象类

**基本写法：抽象类定义**
`abstract class <类名> { }`
```java
// 定义抽象类
public abstract class Shape {
}
```

---

**基本写法：抽象方法**
`abstract <返回类型> <方法名>(<参数>);`
```java
// 定义抽象方法无方法体
public abstract double calculateArea();
```

---

**基本写法：抽象类继承**
`<修饰符> class <子类> extends <抽象类> { }`
```java
// 子类继承抽象类并实现抽象方法
public class Circle extends Shape {
    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
}
```

---

**基本写法：抽象类构造方法**
`protected <类名>(<参数>) { }`
```java
// 抽象类中定义受保护的构造方法
protected Shape(String name) {
    this.name = name;
}
```

---

**基本写法：抽象类包含具体方法**
`<修饰符> <返回类型> <方法名>(<参数>) { }`
```java
// 抽象类中定义具体方法
public String getName() {
    return name;
}
```

---

## 接口定义

**基本写法：接口定义**
`interface <接口名> { }`
```java
// 定义接口
public interface Drawable {
}
```

---

**基本写法：接口常量**
`<类型> <常量名> = <值>;`
```java
// 接口中定义常量默认 public static final
int MAX_SIZE = 100;
```

---

**基本写法：抽象方法**
`<返回类型> <方法名>(<参数>);`
```java
// 接口中定义抽象方法
void draw();
```

---

**基本写法：默认方法**
`default <返回类型> <方法名>(<参数>) { }`
```java
// 接口中定义默认方法带实现
default void printInfo() {
    System.out.println("Drawable");
}
```

---

**基本写法：静态方法**
`static <返回类型> <方法名>(<参数>) { }`
```java
// 接口中定义静态方法
static Drawable createDefault() {
    return new Circle();
}
```

---

**基本写法：私有方法**
`private <返回类型> <方法名>(<参数>) { }`
```java
// 接口中定义私有方法 Java 9+
private void validateInput(int value) {
}
```

---

## 接口实现

**基本写法：实现单个接口**
`<修饰符> class <类名> implements <接口> { }`
```java
// 类实现单个接口
public class Circle implements Drawable {
    @Override
    public void draw() {
    }
}
```

---

**单行写法：实现多个接口**
`<修饰符> class <类名> implements <接口1>, <接口2> { }`
```java
// 类实现多个接口
public class Circle implements Drawable, Comparable {
}
```

---

**换行写法：实现多个接口**
`<修饰符> class <类名> implements <接口1>, <接口2>, <接口3> { }`
```java
// 换行书写实现多个接口
public class Circle implements Drawable,
        Comparable,
        Serializable {
}
```

---

## 接口继承

**基本写法：接口继承单个接口**
`interface <子接口> extends <父接口> { }`
```java
// 接口继承单个父接口
public interface AdvancedDrawable extends Drawable {
}
```

---

**单行写法：接口继承多个接口**
`interface <子接口> extends <父接口1>, <父接口2> { }`
```java
// 接口继承多个父接口
public interface AdvancedList extends List, RandomAccess {
}
```

---

**换行写法：接口继承多个接口**
`interface <子接口> extends <父接口1>, <父接口2>, <父接口3> { }`
```java
// 换行书写接口继承多个父接口
public interface AdvancedList extends List,
        RandomAccess,
        Cloneable {
}
```

---

## 函数式接口

**基本写法：函数式接口定义**
`@FunctionalInterface interface <接口名> { <单抽象方法> }`
```java
// 定义函数式接口
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);
}
```

---

**基本写法：Lambda 实现**
`(<参数>) -> <表达式>`
```java
// 使用 Lambda 实现函数式接口
Calculator add = (a, b) -> a + b;
```

---

**基本写法：方法引用实现**
`<类名>::<方法名>`
```java
// 使用方法引用实现函数式接口
Calculator add = Integer::sum;
```

---

## 抽象类与接口结合

**基本写法：抽象类实现接口**
`abstract class <类名> implements <接口> { }`
```java
// 抽象类实现接口可部分实现
public abstract class AbstractShape implements Drawable {
    @Override
    public void draw() {
    }
}
```

---

**基本写法：抽象类实现部分接口**
`abstract class <类名> implements <接口> { <具体方法> <抽象方法> }`
```java
// 抽象类实现部分接口方法
public abstract class AbstractShape implements Drawable {
    @Override
    public void draw() {
    }

    public abstract double calculateArea();
}
```

---

## 默认方法冲突解决

**基本写法：重写冲突的默认方法**
`<修饰符> <返回类型> <方法名>(<参数>) { <接口>.super.<方法>(); }`
```java
// 解决多个接口默认方法冲突
public class MyClass implements InterfaceA, InterfaceB {
    @Override
    public void method() {
        InterfaceA.super.method();
    }
}
```
