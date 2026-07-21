# Java 方法详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 方法定义

**基本写法：有返回值方法**
`<修饰符> <返回值类型> <方法名>(<参数列表>) { return <返回值>; }`
```java
// 定义返回 int 的方法
public int add(int a, int b) {
    return a + b;
}
```

---

**基本写法：无返回值方法**
`<修饰符> void <方法名>(<参数列表>) { }`
```java
// 定义无返回值的方法
public void printMessage(String message) {
}
```

---

## 方法调用

**基本写法：非静态方法调用**
`<对象>.<方法名>(<参数>);`
```java
// 通过对象实例调用方法
MyClass obj = new MyClass();
int result = obj.add(1, 2);
```

---

**基本写法：静态方法调用**
`<类名>.<方法名>(<参数>);`
```java
// 通过类名直接调用静态方法
int result = Math.abs(-10);
```

---

## 参数传递

**基本写法：基本类型参数**
`<方法名>(<基本类型> <参数名>)`
```java
// 传递基本类型的副本
public void modify(int x) {
    x = 10;
}
```

---

**基本写法：引用类型参数**
`<方法名>(<引用类型>[] <参数名>)`
```java
// 传递引用地址的副本
public void modifyArray(int[] arr) {
    arr[0] = 100;
}
```

---

## 方法重载

**基本写法：参数数量不同重载**
`<修饰符> <返回类型> <方法名>(<参数列表1>) { }`
```java
// 同名方法参数数量不同
public int add(int a, int b) {
    return a + b;
}
```

---

**基本写法：参数类型不同重载**
`<修饰符> <返回类型> <方法名>(<参数类型2>) { }`
```java
// 同名方法参数类型不同
public double add(double a, double b) {
    return a + b;
}
```

---

## 递归

**基本写法：递归结构**
`<返回类型> <方法名>(<参数>) { if (<基准条件>) return <基准值>; return <方法名>(<修改参数>); }`
```java
// 递归方法基本结构
public int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

---

**基本写法：斐波那契递归**
`<返回类型> fibonacci(<参数>)`
```java
// 斐波那契数列递归实现
public int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

---

**基本写法：二分查找递归**
`<返回类型> binarySearch(<参数>)`
```java
// 二分查找递归实现
public int binarySearch(int[] arr, int target, int low, int high) {
    if (low > high) return -1;
    int mid = (low + high) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] > target) {
        return binarySearch(arr, target, low, mid - 1);
    }
    return binarySearch(arr, target, mid + 1, high);
}
```

---

## 可变参数

**基本写法：可变参数定义**
`<修饰符> <返回类型> <方法名>(<参数类型>... <参数名>) { }`
```java
// 接受任意数量的参数
public int sum(int... numbers) {
    int total = 0;
    for (int num : numbers) {
        total += num;
    }
    return total;
}
```

---

**基本写法：可变参数调用**
`<方法名>(<元素1>, <元素2>, ...)`
```java
// 传入多个参数调用可变参数方法
int result = sum(1, 2, 3, 4, 5);
```

---

## 静态泛型方法

**基本写法：静态泛型方法**
`public static <T> void <方法名>(T <参数>) { }`
```java
// 定义静态泛型方法
public static <T> void staticGenericMethod(T value) {
}
```

---

**基本写法：泛型方法类型推断**
`public <T> T <方法名>(List<T> <参数>)`
```java
// 编译器自动推断类型
public <T> T getFirstElement(List<T> list) {
    return list.isEmpty() ? null : list.get(0);
}
```
