# Java 枚举与注解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 枚举定义

**单行写法：简单枚举**
`public enum <枚举名> { <常量1>, <常量2> }`
```java
// 单行定义简单枚举
public enum Day { MONDAY, TUESDAY, WEDNESDAY }
```

---

**换行写法：多常量枚举**
`public enum <枚举名> { <常量1>, <常量2>, ... }`
```java
// 换行定义多常量枚举
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

**基本写法：枚举使用**
`<枚举名> <变量> = <枚举名>.<常量>;`
```java
// 使用枚举常量
Day today = Day.MONDAY;
```

---

## 枚举带属性

**换行写法：带属性的枚举**
`public enum <枚举名> { <常量>(<值>); private <类型> <字段>; <构造方法> <getter> }`
```java
// 定义带属性的枚举
public enum Color {
    RED("#FF0000"),
    GREEN("#00FF00"),
    BLUE("#0000FF");

    private String hex;

    Color(String hex) {
        this.hex = hex;
    }

    public String getHex() {
        return hex;
    }
}
```

---

**基本写法：访问枚举属性**
`<枚举变量>.<getter方法>()`
```java
// 获取枚举常量的属性值
String hex = Color.RED.getHex();
```

---

## 枚举方法

**基本写法：枚举抽象方法**
`public enum <枚举名> { <常量> { @Override public <方法> { } }; abstract <方法签名>; }`
```java
// 每个枚举常量实现自己的逻辑
public enum Operation {
    ADD {
        @Override
        public int apply(int a, int b) {
            return a + b;
        }
    },
    SUBTRACT {
        @Override
        public int apply(int a, int b) {
            return a - b;
        }
    };

    public abstract int apply(int a, int b);
}
```

---

**基本写法：枚举实现接口**
`public enum <枚举名> implements <接口> { }`
```java
// 枚举实现接口
public enum Status implements Comparable<Status> {
}
```

---

## 枚举常用方法

**基本写法：获取所有常量**
`<枚举名>.values()`
```java
// 获取枚举所有常量数组
Day[] days = Day.values();
```

---

**基本写法：字符串转枚举**
`<枚举名>.valueOf(<字符串>)`
```java
// 将字符串转换为枚举常量
Day day = Day.valueOf("MONDAY");
```

---

**基本写法：获取枚举序号**
`<枚举变量>.ordinal()`
```java
// 获取枚举常量的序号从 0 开始
int index = Day.MONDAY.ordinal();
```

---

**基本写法：枚举比较**
`<枚举变量1>.compareTo(<枚举变量2>)`
```java
// 比较两个枚举常量的顺序
int result = Day.MONDAY.compareTo(Day.FRIDAY);
```

---

**基本写法：枚举 switch**
`switch (<枚举变量>) { case <常量>: }`
```java
// 在 switch 中使用枚举
switch (day) {
    case MONDAY:
        break;
    case FRIDAY:
        break;
    default:
}
```

---

## 枚举集合

**基本写法：EnumSet 创建**
`EnumSet.of(<枚举常量1>, <枚举常量2>)`
```java
// 创建包含指定枚举常量的集合
EnumSet<Day> weekend = EnumSet.of(Day.SATURDAY, Day.SUNDAY);
```

---

**基本写法：EnumSet 全部**
`EnumSet.allOf(<枚举类>.class)`
```java
// 创建包含所有枚举常量的集合
EnumSet<Day> allDays = EnumSet.allOf(Day.class);
```

---

**基本写法：EnumMap 创建**
`new EnumMap<>(<枚举类>.class)`
```java
// 创建以枚举为键的 Map
EnumMap<Day, String> schedule = new EnumMap<>(Day.class);
```

---

## 内置注解

**基本写法：@Override**
`@Override`
```java
// 标记方法重写父类方法
@Override
public String toString() {
    return "Custom";
}
```

---

**基本写法：@Deprecated**
`@Deprecated`
```java
// 标记方法已过时
@Deprecated
public void oldMethod() {
}
```

---

**基本写法：@SuppressWarnings**
`@SuppressWarnings("<警告类型>")`
```java
// 抑制指定类型的警告
@SuppressWarnings("unchecked")
List list = new ArrayList();
```

---

**基本写法：@FunctionalInterface**
`@FunctionalInterface`
```java
// 标记函数式接口
@FunctionalInterface
public interface MyFunction {
    void apply();
}
```

---

## 元注解

**基本写法：@Target**
`@Target(<元素类型>)`
```java
// 指定注解可用于类上
@Target(ElementType.TYPE)
```

---

**基本写法：@Retention**
`@Retention(<保留策略>)`
```java
// 指定注解运行时保留
@Retention(RetentionPolicy.RUNTIME)
```

---

**基本写法：@Documented**
`@Documented`
```java
// 标记注解包含在 Javadoc 中
@Documented
```

---

**基本写法：@Inherited**
`@Inherited`
```java
// 标记注解可被子类继承
@Inherited
```

---

## 自定义注解

**基本写法：自定义注解定义**
`@interface <注解名> { }`
```java
// 定义自定义注解
public @interface MyAnnotation {
}
```

---

**基本写法：注解成员**
`<类型> <成员名>() [default <默认值>];`
```java
// 定义带成员的注解
public @interface MyAnnotation {
    String value();
    int priority() default 0;
}
```

---

**基本写法：使用自定义注解**
`@<注解名>(<成员> = <值>)`
```java
// 使用自定义注解并指定成员值
@MyAnnotation(value = "test", priority = 1)
public void method() {
}
```

---

**基本写法：注解默认值**
`@<注解名>`
```java
// 使用注解的默认值
@MyAnnotation
public void method() {
}
```

---

**基本写法：注解单一成员 value 简写**
`@<注解名>("<值>")`
```java
// 单一成员 value 时可省略成员名
@MyAnnotation("test")
public void method() {
}
```

---

## 注解组合

**换行写法：多注解组合**
`@<注解1> @<注解2>`
```java
// 同时使用多个注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface MyAnnotation {
}
```

---

**基本写法：重复注解**
`@<注解名>(<值1>) @<注解名>(<值2>)`
```java
// Java 8+ 支持重复注解
@Schedule(day = "Monday")
@Schedule(day = "Wednesday")
public void task() {
}
```

---

## 注解处理

**基本写法：获取类注解**
`<类>.getAnnotation(<注解类>.class)`
```java
// 通过反射获取类上的注解
MyAnnotation ann = MyClass.class.getAnnotation(MyAnnotation.class);
```

---

**基本写法：判断注解存在**
`<类>.isAnnotationPresent(<注解类>.class)`
```java
// 检查类上是否存在指定注解
boolean hasAnnotation = MyClass.class.isAnnotationPresent(MyAnnotation.class);
```

---

**基本写法：获取方法注解**
`<方法>.getAnnotation(<注解类>.class)`
```java
// 通过反射获取方法上的注解
Method method = MyClass.class.getMethod("process");
MyAnnotation ann = method.getAnnotation(MyAnnotation.class);
```

---

**基本写法：获取注解成员值**
`<注解>.<成员名>()`
```java
// 获取注解成员的值
String value = ann.value();
```
