# Java 泛型详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型类

**基本写法：泛型类定义**
`class <类名><T> { }`
```java
// 定义单类型参数的泛型类
public class Box<T> {
    private T item;
}
```

---

**换行写法：多类型参数泛型类**
`class <类名><T1, T2, T3> { }`
```java
// 定义多类型参数的泛型类
public class Pair<K, V> {
    private K key;
    private V value;
}
```

---

**基本写法：使用泛型类**
`<类名><<类型>> <变量> = new <类名><>();`
```java
// 使用泛型类指定具体类型
Box<String> box = new Box<>();
```

---

**基本写法：泛型类方法**
`public <返回类型> <方法名>(T <参数>) { }`
```java
// 泛型类中使用类型参数的方法
public void setItem(T item) {
    this.item = item;
}
```

---

**基本写法：泛型类返回类型**
`public T <方法名>() { }`
```java
// 方法返回类型为类型参数
public T getItem() {
    return item;
}
```

---

## 泛型接口

**基本写法：泛型接口定义**
`interface <接口名><T> { }`
```java
// 定义泛型接口
public interface Repository<T> {
}
```

---

**基本写法：实现泛型接口指定类型**
`class <类名> implements <接口><<具体类型>> { }`
```java
// 实现泛型接口并指定具体类型
public class UserRepository implements Repository<User> {
}
```

---

**基本写法：实现泛型接口保留泛型**
`class <类名><T> implements <接口><T> { }`
```java
// 实现泛型接口保留泛型参数
public class GenericRepository<T> implements Repository<T> {
}
```

---

## 泛型方法

**基本写法：泛型方法定义**
`public <T> <返回类型> <方法名>(T <参数>) { }`
```java
// 定义泛型方法
public <T> void printItem(T item) {
}
```

---

**基本写法：泛型方法有返回值**
`public <T> T <方法名>(T <参数>) { }`
```java
// 泛型方法返回类型参数
public <T> T process(T input) {
    return input;
}
```

---

**换行写法：多类型参数泛型方法**
`public <T, U> <返回类型> <方法名>(T <参数1>, U <参数2>) { }`
```java
// 泛型方法接受多个类型参数
public <T, U> String combine(T first, U second) {
    return first.toString() + second.toString();
}
```

---

**基本写法：静态泛型方法**
`public static <T> <返回类型> <方法名>(T <参数>) { }`
```java
// 定义静态泛型方法
public static <T> T getFirst(List<T> list) {
    return list.get(0);
}
```

---

## 类型通配符

**基本写法：无界通配符**
`<?>`
```java
// 接受任意类型的泛型
List<?> list = new ArrayList<String>();
```

---

**基本写法：上界通配符**
`<? extends <类型>>`
```java
// 接受指定类型及其子类
List<? extends Number> list = new ArrayList<Integer>();
```

---

**基本写法：下界通配符**
`<? super <类型>>`
```java
// 接受指定类型及其父类
List<? super Integer> list = new ArrayList<Number>();
```

---

## 类型约束

**基本写法：泛型上界约束**
`<T extends <类型>>`
```java
// 限制类型参数必须是指定类型或子类
public class NumberBox<T extends Number> {
}
```

---

**换行写法：多边界约束**
`<T extends <类型1> & <接口2>>`
```java
// 类型参数必须同时满足多个边界
public class Container<T extends Number & Comparable<T>> {
}
```

---

**基本写法：泛型方法上界约束**
`public <T extends <类型>> <方法名>(T <参数>)`
```java
// 泛型方法限制类型上界
public <T extends Number> double sum(T num) {
    return num.doubleValue();
}
```

---

## 类型擦除

**基本写法：运行时类型检查**
`<对象> instanceof <原始类型>`
```java
// 泛型在运行时被擦除只能检查原始类型
List<String> list = new ArrayList<>();
boolean isList = list instanceof List;
```

---

**基本写法：无法实例化类型参数**
`new T()`
```java
// 泛型类型参数无法直接实例化编译错误
// T item = new T();
```

---

**基本写法：无法创建泛型数组**
`new T[<长度>]`
```java
// 无法创建泛型类型数组编译错误
// T[] array = new T[10];
```

---

## 泛型集合

**基本写法：泛型 List**
`List<<类型>> <变量> = new ArrayList<>();`
```java
// 创建泛型 List
List<String> names = new ArrayList<>();
```

---

**基本写法：泛型 Map**
`Map<<键类型>, <值类型>> <变量> = new HashMap<>();`
```java
// 创建泛型 Map
Map<String, Integer> ages = new HashMap<>();
```

---

**基本写法：泛型 Set**
`Set<<类型>> <变量> = new HashSet<>();`
```java
// 创建泛型 Set
Set<Integer> numbers = new HashSet<>();
```

---

## PECS 原则

**基本写法：生产者使用 extends**
`List<? extends <类型>> <变量>`
```java
// 从集合读取数据使用上界通配符
List<? extends Number> producer = new ArrayList<Integer>();
Number n = producer.get(0);
```

---

**基本写法：消费者使用 super**
`List<? super <类型>> <变量>`
```java
// 向集合写入数据使用下界通配符
List<? super Integer> consumer = new ArrayList<Number>();
consumer.add(1);
```

---

## 泛型工具方法

**基本写法：泛型数组创建**
`@SuppressWarnings("unchecked") T[] <变量> = (T[]) new Object[<长度>];`
```java
// 通过 Object 数组创建泛型数组
@SuppressWarnings("unchecked")
T[] array = (T[]) new Object[10];
```

---

**基本写法：泛型类型转换**
`(<类型>) <对象>`
```java
// 泛型类型转换需要强制
Object obj = "Hello";
String str = (String) obj;
```

---

**基本写法：Class 类型参数**
`Class<<类型>> <变量> = <类型>.class;`
```java
// 获取泛型 Class 对象
Class<String> clazz = String.class;
```

---

**基本写法：泛型方法实例化**
`<类型>.newInstance()`
```java
// 通过 Class 创建实例
T instance = clazz.newInstance();
```
