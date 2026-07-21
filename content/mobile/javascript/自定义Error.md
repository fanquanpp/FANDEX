# JavaScript 自定义 Error

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Error 基础

**基本写法：创建 Error**
`new Error("<消息>")`
```javascript
// 创建错误对象
let error = new Error("Something went wrong");
```

---

**基本写法：省略 new**
`Error("<消息>")`
```javascript
// 省略 new 创建错误对象
let error = Error("Something went wrong");
```

---

**基本写法：throw Error**
`throw new Error("<消息>")`
```javascript
// 抛出错误
throw new Error("Invalid input");
```

---

**基本写法：Error message 属性**
`<error>.message`
```javascript
// 获取错误消息
let message = error.message;
```

---

**基本写法：Error name 属性**
`<error>.name`
```javascript
// 获取错误名称
let name = error.name;
```

---

**基本写法：Error stack 属性**
`<error>.stack`
```javascript
// 获取错误堆栈信息
let stack = error.stack;
```

---

## 内置 Error 类型

**基本写法：TypeError**
`new TypeError("<消息>")`
```javascript
// 创建类型错误
throw new TypeError("Expected a number");
```

---

**基本写法：RangeError**
`new RangeError("<消息>")`
```javascript
// 创建范围错误
throw new RangeError("Value must be positive");
```

---

**基本写法：SyntaxError**
`new SyntaxError("<消息>")`
```javascript
// 创建语法错误
throw new SyntaxError("Invalid syntax");
```

---

**基本写法：ReferenceError**
`new ReferenceError("<消息>")`
```javascript
// 创建引用错误
throw new ReferenceError("Variable is not defined");
```

---

**基本写法：URIError**
`new URIError("<消息>")`
```javascript
// 创建 URI 错误
throw new URIError("Malformed URI");
```

---

**基本写法：EvalError**
`new EvalError("<消息>")`
```javascript
// 创建 eval 错误
throw new EvalError("Eval failed");
```

---

## 自定义 Error 类

**基本写法：继承 Error**
`class <自定义错误> extends Error { }`
```javascript
// 继承 Error 创建自定义错误
class CustomError extends Error {
}
```

---

**换行写法：带构造方法的自定义错误**
`class <自定义错误> extends Error { constructor(<参数>) { super(<参数>); this.name = <名称>; } }`
```javascript
// 自定义错误带构造方法
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
```

---

**换行写法：带额外属性的自定义错误**
`class <自定义错误> extends Error { constructor(<参数1>, <参数2>) { super(<参数1>); this.<属性> = <参数2>; } }`
```javascript
// 自定义错误带额外属性
class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
```

---

**基本写法：使用自定义错误**
`throw new <自定义错误>("<消息>")`
```javascript
// 抛出自定义错误
throw new ValidationError("Email is required");
```

---

## 错误处理

**基本写法：try-catch**
`try { } catch (<错误>) { }`
```javascript
// 捕获错误
try {
    riskyOperation();
} catch (error) {
}
```

---

**基本写法：try-catch-finally**
`try { } catch (<错误>) { } finally { }`
```javascript
// finally 块无论是否异常都执行
try {
} catch (error) {
} finally {
}
```

---

**基本写法：catch 无参数**
`try { } catch { }`
```javascript
// ES2019+ catch 可省略参数
try {
} catch {
}
```

---

**基本写法：捕获特定错误类型**
`catch (<错误>) { if (<错误> instanceof <类型>) { } }`
```javascript
// 捕获特定类型的错误
try {
} catch (error) {
    if (error instanceof TypeError) {
    }
}
```

---

**基本写法：重新抛出错误**
`catch (<错误>) { throw <错误>; }`
```javascript
// 捕获后重新抛出错误
try {
} catch (error) {
    throw error;
}
```

---

**基本写法：抛出新错误**
`catch (<错误>) { throw new <错误类型>("<消息>", { cause: <错误> }); }`
```javascript
// 抛出新错误并保留原始错误
try {
} catch (error) {
    throw new Error("Operation failed", { cause: error });
}
```

---

## Error.cause

**基本写法：Error cause 选项**
`new Error("<消息>", { cause: <原因> })`
```javascript
// ES2022+ 创建带原因的错误
let error = new Error("Failed", { cause: originalError });
```

---

**基本写法：访问 cause**
`<error>.cause`
```javascript
// 获取错误的原始原因
let cause = error.cause;
```

---

## AggregateError

**基本写法：创建 AggregateError**
`new AggregateError([<错误1>, <错误2>], "<消息>")`
```javascript
// 创建聚合错误
let error = new AggregateError([err1, err2], "Multiple errors");
```

---

**基本写法：访问 errors**
`<error>.errors`
```javascript
// 获取聚合错误中的所有错误
let errors = aggregateError.errors;
```

---

**基本写法：Promise.any 触发 AggregateError**
`Promise.any([<promise1>, <promise2>]).catch(<回调>)`
```javascript
// Promise.any 全部失败时抛出 AggregateError
Promise.any([p1, p2]).catch(error => {
    if (error instanceof AggregateError) {
    }
});
```

---

## 错误断言

**基本写法：自定义断言函数**
`function <断言>(<条件>, "<消息>") { if (!<条件>) throw new Error("<消息>"); }`
```javascript
// 实现断言函数
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
```

---

**基本写法：console.assert**
`console.assert(<条件>, "<消息>")`
```javascript
// 条件为假时输出错误
console.assert(value > 0, "Value must be positive");
```

---

## 错误转换

**基本写法：错误转字符串**
`<error>.toString()`
```javascript
// 将错误转换为字符串
let str = error.toString();
```

---

**基本写法：JSON 序列化错误**
`JSON.stringify(<错误>, Object.getOwnPropertyNames(<错误>))`
```javascript
// 序列化错误对象包含所有属性
let json = JSON.stringify(error, Object.getOwnPropertyNames(error));
```

---

## 错误链

**基本写法：错误链模式**
`try { } catch (<错误>) { throw new <错误类型>("<消息>", { cause: <错误> }); }`
```javascript
// 错误链保留原始错误信息
try {
    operation();
} catch (error) {
    throw new AppError("Operation failed", { cause: error });
}
```

---

**基本写法：遍历错误链**
`let <当前> = <错误>; while (<当前>.cause) { <当前> = <当前>.cause; }`
```javascript
// 遍历错误链获取根本原因
let current = error;
while (current.cause) {
    current = current.cause;
}
```
