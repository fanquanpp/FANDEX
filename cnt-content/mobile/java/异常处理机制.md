# Java 异常处理机制

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 异常体系

**基本写法：Throwable 体系**
`Throwable -> Error | Exception`
```java
// 异常体系根类
Throwable
```

---

**基本写法：Error 不可恢复**
`class <错误类> extends Error`
```java
// 严重错误程序无法处理
OutOfMemoryError
```

---

**基本写法：Exception 可恢复**
`class <异常类> extends Exception`
```java
// 可检查异常必须处理
IOException
```

---

**基本写法：RuntimeException 运行时异常**
`class <异常类> extends RuntimeException`
```java
// 运行时异常可不处理
NullPointerException
```

---

## try-catch

**基本写法：单 catch**
`try { } catch (<异常类型> <变量>) { }`
```java
// 捕获单个异常
try {
    int result = 10 / 0;
} catch (ArithmeticException e) {
}
```

---

**基本写法：多 catch**
`try { } catch (<异常1> <变量>) { } catch (<异常2> <变量>) { }`
```java
// 捕获多种异常分别处理
try {
} catch (ArithmeticException e) {
} catch (NullPointerException e) {
}
```

---

**基本写法：Java 7+ 多异常合并**
`try { } catch (<异常1> | <异常2> <变量>) { }`
```java
// 多种异常合并捕获
try {
} catch (IOException | SQLException e) {
}
```

---

**基本写法：try-catch-finally**
`try { } catch (<异常> <变量>) { } finally { }`
```java
// finally 块无论是否异常都执行
try {
} catch (Exception e) {
} finally {
}
```

---

**基本写法：try-finally**
`try { } finally { }`
```java
// 无 catch 仅 finally
try {
} finally {
}
```

---

## try-with-resources

**基本写法：自动资源管理**
`try (<资源声明>) { }`
```java
// 自动关闭实现 AutoCloseable 的资源
try (FileReader fr = new FileReader("file.txt")) {
}
```

---

**换行写法：多个资源**
`try (<资源1>; <资源2>) { }`
```java
// 管理多个资源按声明逆序关闭
try (
    FileReader fr = new FileReader("input.txt");
    FileWriter fw = new FileWriter("output.txt")
) {
}
```

---

**基本写法：try-with-resources 异常处理**
`try (<资源>) { } catch (<异常> <变量>) { }`
```java
// 自动关闭资源并捕获异常
try (FileReader fr = new FileReader("file.txt")) {
} catch (IOException e) {
}
```

---

## throw 抛出异常

**基本写法：抛出异常**
`throw new <异常类>("<消息>");`
```java
// 手动抛出异常
throw new IllegalArgumentException("Invalid parameter");
```

---

**基本写法：抛出已存在异常**
`throw <异常变量>;`
```java
// 重新抛出捕获的异常
throw e;
```

---

**基本写法：抛出带原因的异常**
`throw new <异常类>("<消息>", <原因>);`
```java
// 抛出异常并附带原因
throw new RuntimeException("Operation failed", cause);
```

---

## throws 声明异常

**基本写法：声明单个异常**
`<方法签名> throws <异常类型>`
```java
// 方法声明可能抛出的异常
public void readFile() throws IOException {
}
```

---

**单行写法：声明多个异常**
`<方法签名> throws <异常1>, <异常2>`
```java
// 方法声明抛出多种异常
public void process() throws IOException, SQLException {
}
```

---

**换行写法：声明多个异常**
`<方法签名> throws <异常1>, <异常2>, <异常3>`
```java
// 换行声明抛出多种异常
public void process()
        throws IOException,
        SQLException,
        ClassNotFoundException {
}
```

---

## 自定义异常

**基本写法：自定义检查异常**
`class <异常名> extends Exception { }`
```java
// 继承 Exception 定义检查异常
public class BusinessException extends Exception {
    public BusinessException(String message) {
        super(message);
    }
}
```

---

**基本写法：自定义运行时异常**
`class <异常名> extends RuntimeException { }`
```java
// 继承 RuntimeException 定义运行时异常
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

---

**换行写法：带属性的自定义异常**
`class <异常名> extends Exception { private <字段>; <构造方法> <getter> }`
```java
// 自定义异常带额外属性
public class BusinessException extends Exception {
    private int errorCode;

    public BusinessException(int errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public int getErrorCode() {
        return errorCode;
    }
}
```

---

## 异常链

**基本写法：保留原始异常**
`throw new <异常类>("<消息>", <原始异常>);`
```java
// 抛出新异常并保留原始异常
try {
} catch (IOException e) {
    throw new BusinessException("File operation failed", e);
}
```

---

**基本写法：initCause 设置原因**
`<异常>.initCause(<原因>)`
```java
// 使用 initCause 设置异常原因
BusinessException be = new BusinessException("Error");
be.initCause(originalException);
throw be;
```

---

**基本写法：获取原始异常**
`<异常>.getCause()`
```java
// 获取异常的根本原因
Throwable cause = e.getCause();
```

---

## 异常信息获取

**基本写法：获取消息**
`<异常>.getMessage()`
```java
// 获取异常的详细消息
String message = e.getMessage();
```

---

**基本写法：获取堆栈**
`<异常>.getStackTrace()`
```java
// 获取异常的堆栈跟踪数组
StackTraceElement[] stack = e.getStackTrace();
```

---

**基本写法：打印堆栈**
`<异常>.printStackTrace()`
```java
// 打印异常堆栈到标准错误流
e.printStackTrace();
```

---

**基本写法：获取所有异常**
`<异常>.getSuppressed()`
```java
// 获取 try-with-resources 中被抑制的异常
Throwable[] suppressed = e.getSuppressed();
```

---

## 异常处理最佳实践

**基本写法：捕获具体异常**
`catch (<具体异常类型> <变量>)`
```java
// 捕获具体的异常类型而非通用 Exception
try {
} catch (FileNotFoundException e) {
}
```

---

**基本写法：异常不忽略**
`catch (<异常> <变量>) { <处理逻辑> }`
```java
// catch 块中必须有处理逻辑
try {
} catch (Exception e) {
    log.error("Error occurred", e);
}
```

---

**基本写法：finally 不 return**
`finally { <清理逻辑> }`
```java
// finally 块只做资源清理不返回值
try {
} finally {
    resource.close();
}
```

---

## 常见运行时异常

**基本写法：空指针异常**
`throw new NullPointerException("<消息>");`
```java
// 抛出空指针异常
throw new NullPointerException("Object is null");
```

---

**基本写法：数组越界异常**
`throw new ArrayIndexOutOfBoundsException(<索引>);`
```java
// 抛出数组越界异常
throw new ArrayIndexOutOfBoundsException(10);
```

---

**基本写法：类型转换异常**
`throw new ClassCastException("<消息>");`
```java
// 抛出类型转换异常
throw new ClassCastException("Cannot cast to String");
```

---

**基本写法：非法参数异常**
`throw new IllegalArgumentException("<消息>");`
```java
// 抛出非法参数异常
throw new IllegalArgumentException("Age must be positive");
```

---

**基本写法：非法状态异常**
`throw new IllegalStateException("<消息>");`
```java
// 抛出非法状态异常
throw new IllegalStateException("Connection is closed");
```

---

**基本写法：不支持操作异常**
`throw new UnsupportedOperationException();`
```java
// 抛出不支持操作异常
throw new UnsupportedOperationException();
```
