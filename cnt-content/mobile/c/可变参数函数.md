# 可变参数函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 可变参数函数定义

**基本写法：可变参数函数声明**
`<return_type> <func_name>(<fixed_params>, ...);`
```c
// 声明可变参数函数
int sum(int count, ...);
```

---

**基本写法：可变参数函数定义**
`<return_type> <func_name>(<fixed_params>, ...) { ... }`
```c
#include <stdarg.h>
// 定义可变参数函数
int sum(int count, ...) {
    va_list valist;
    va_start(valist, count);
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += va_arg(valist, int);
    }
    va_end(valist);
    return total;
}
```

---

## va_list 相关宏

**基本写法：声明 va_list 变量**
`va_list <valist>;`
```c
#include <stdarg.h>
// 声明参数列表变量
va_list valist;
```

---

**基本写法：初始化 va_list**
`va_start(<valist>, <last_named_param>);`
```c
#include <stdarg.h>
// 初始化参数列表，count 为最后一个命名参数
va_start(valist, count);
```

---

**基本写法：获取下一个参数**
`<type> <val> = va_arg(<valist>, <type>);`
```c
#include <stdarg.h>
// 获取下一个 int 类型的参数
int num = va_arg(valist, int);
```

---

**基本写法：清理 va_list**
`va_end(<valist>);`
```c
#include <stdarg.h>
// 清理参数列表
va_end(valist);
```

---

**拷贝写法：复制 va_list**
`va_copy(<dest>, <src>);`
```c
#include <stdarg.h>
// 复制参数列表
va_list dest;
va_copy(dest, src);
```

---

## 可变参数函数示例

**求和写法：计算多个整数的和**
`int <func>(int <count>, ...) { ... }`
```c
#include <stdarg.h>
// 计算多个整数的和
int sum(int count, ...) {
    va_list valist;
    va_start(valist, count);
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += va_arg(valist, int);
    }
    va_end(valist);
    return total;
}
```

---

**最大值写法：找出多个整数的最大值**
`int <func>(int <count>, ...) { ... }`
```c
#include <stdarg.h>
// 找出多个整数的最大值
int max(int count, ...) {
    va_list valist;
    va_start(valist, count);
    int max_val = va_arg(valist, int);
    for (int i = 1; i < count; i++) {
        int num = va_arg(valist, int);
        if (num > max_val) {
            max_val = num;
        }
    }
    va_end(valist);
    return max_val;
}
```

---

**打印写法：自定义打印函数**
`void <func>(const char *<format>, ...) { ... }`
```c
#include <stdarg.h>
#include <stdio.h>
// 自定义打印函数
void log_message(const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    vprintf(format, valist);
    va_end(valist);
}
```

---

## vprintf 系列函数

**vprintf 写法：使用 vprintf 输出**
`vprintf(<format>, <valist>);`
```c
#include <stdarg.h>
#include <stdio.h>
// 使用 vprintf 输出可变参数
void log_message(const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    vprintf(format, valist);
    va_end(valist);
}
```

---

**vfprintf 写法：使用 vfprintf 输出到文件**
`vfprintf(<fp>, <format>, <valist>);`
```c
#include <stdarg.h>
#include <stdio.h>
// 使用 vfprintf 输出到文件
void log_to_file(FILE *fp, const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    vfprintf(fp, format, valist);
    va_end(valist);
}
```

---

**vsprintf 写法：使用 vsprintf 写入字符串**
`vsprintf(<buffer>, <format>, <valist>);`
```c
#include <stdarg.h>
#include <stdio.h>
// 使用 vsprintf 写入字符串
void format_string(char *buffer, const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    vsprintf(buffer, format, valist);
    va_end(valist);
}
```

---

**vsnprintf 写法：使用 vsnprintf 安全写入字符串**
`vsnprintf(<buffer>, <size>, <format>, <valist>);`
```c
#include <stdarg.h>
#include <stdio.h>
// 使用 vsnprintf 安全写入字符串（限制长度）
void format_string_safe(char *buffer, size_t size, const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    vsnprintf(buffer, size, format, valist);
    va_end(valist);
}
```

---

## 可变参数函数调用

**基本写法：调用可变参数函数**
`<func_name>(<fixed_args>, <var1>, <var2>, ...);`
```c
// 调用可变参数函数
int result = sum(5, 10, 20, 30, 40, 50);
```

---

**混合类型写法：调用混合类型可变参数函数**
`<func_name>(<format>, <arg1>, <arg2>, ...);`
```c
// 调用 printf 函数
printf("Name: %s, Age: %d\n", "John", 30);
```

---

## 可变参数宏

**基本写法：可变参数宏定义**
`#define <NAME>(<fixed>, ...) <expr>(__VA_ARGS__)`
```c
// 可变参数宏
#define LOG(fmt, ...) printf(fmt, __VA_ARGS__)
```

---

**使用写法：调用可变参数宏**
`<NAME>(<fixed_args>, <var_args>);`
```c
// 调用可变参数宏
LOG("Value: %d\n", 100);
```

---

## 可变参数函数注意事项

**哨兵值写法：使用哨兵值标记结束**
`<func>(<value1>, <value2>, ..., <sentinel>);`
```c
// 使用哨兵值标记参数结束
int sum_sentinel(int first, ...) {
    va_list valist;
    va_start(valist, first);
    int total = first;
    int num;
    while ((num = va_arg(valist, int)) != -1) {
        total += num;
    }
    va_end(valist);
    return total;
}
```

---

**类型安全写法：使用格式字符串指定类型**
`<func>(const char *<format>, ...)`
```c
// 通过格式字符串指定参数类型
void print_values(const char *format, ...) {
    va_list valist;
    va_start(valist, format);
    const char *p = format;
    while (*p) {
        if (*p == 'd') {
            printf("%d ", va_arg(valist, int));
        } else if (*p == 'f') {
            printf("%f ", va_arg(valist, double));
        }
        p++;
    }
    va_end(valist);
}
```
