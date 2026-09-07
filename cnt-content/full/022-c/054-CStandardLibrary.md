---
order: 540
title: C 标准库函数语法速查手册
module: 'c'
category: 计算机科学
difficulty: beginner
description: C 标准库函数速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 输入输出

**基本写法：printf 格式输出**
`printf("<格式串>"[, <参数>...]);`
```c
// 格式化输出
printf("Value: %d, Name: %s\n", 42, "Alice");
```

---

**基本写法：scanf 格式输入**
`scanf("<格式串>", &<变量>[, &<变量>...]);`
```c
// 读取整数
int x;
scanf("%d", &x);
```

---

**基本写法：fprintf 文件输出**
`fprintf(<FILE*>, "<格式串>"[, <参数>...]);`
```c
// 输出到文件
FILE* fp = fopen("out.txt", "w");
fprintf(fp, "Count: %d\n", 10);
```

---

**基本写法：fopen 打开文件**
`fopen("<路径>", "<模式>");`
```c
// 打开文件读取
FILE* fp = fopen("data.txt", "r");
// 模式: r 读, w 写, a 追加, rb/wb 二进制
```

---

**基本写法：fclose 关闭文件**
`fclose(<FILE*>);`
```c
// 关闭文件
fclose(fp);
```

---

## 字符串操作

**基本写法：strcpy 复制**
`strcpy(<目标>, <源>);`
```c
// 复制字符串
char dest[100];
strcpy(dest, "Hello");
```

---

**基本写法：strncpy 安全复制**
`strncpy(<目标>, <源>, <长度>);`
```c
// 限制长度复制
char dest[10];
strncpy(dest, "Hello", sizeof(dest) - 1);
dest[sizeof(dest) - 1] = '\0';
```

---

**基本写法：strcat 拼接**
`strcat(<目标>, <源>);`
```c
// 拼接字符串
char s[100] = "Hello, ";
strcat(s, "World!");
```

---

**基本写法：strlen 长度**
`strlen(<字符串>);`
```c
// 获取字符串长度
size_t len = strlen("Hello");
```

---

**基本写法：strcmp 比较**
`strcmp(<字符串1>, <字符串2>);`
```c
// 比较字符串
int result = strcmp("abc", "def");
// 返回 0 表示相等
```

---

## 内存操作

**基本写法：malloc 分配**
`malloc(<字节数>);`
```c
// 动态分配内存
int* arr = (int*)malloc(10 * sizeof(int));
```

---

**基本写法：calloc 清零分配**
`calloc(<数量>, <单个大小>);`
```c
// 分配并清零
int* arr = (int*)calloc(10, sizeof(int));
```

---

**基本写法：realloc 重分配**
`realloc(<指针>, <新大小>);`
```c
// 重新调整内存大小
arr = (int*)realloc(arr, 20 * sizeof(int));
```

---

**基本写法：free 释放**
`free(<指针>);`
```c
// 释放动态分配的内存
free(arr);
arr = NULL;
```

---

**基本写法：memcpy 内存复制**
`memcpy(<目标>, <源>, <字节数>);`
```c
// 复制内存块
int src[5] = {1, 2, 3, 4, 5};
int dest[5];
memcpy(dest, src, 5 * sizeof(int));
```

---

**基本写法：memset 内存填充**
`memset(<指针>, <值>, <字节数>);`
```c
// 内存清零
memset(arr, 0, 10 * sizeof(int));
```

---

## 数学函数

**基本写法：abs 绝对值**
`abs(<整数>);`
```c
// 整数绝对值
int x = abs(-10);
```

---

**基本写法：sqrt 平方根**
`sqrt(<浮点数>);`
```c
// 求平方根
double r = sqrt(16.0);
```

---

**基本写法：pow 幂运算**
`pow(<底数>, <指数>);`
```c
// 计算 2 的 10 次方
double r = pow(2.0, 10.0);
```

---

**基本写法：floor/ceil 取整**
`floor(<浮点数>);` `<br>`ceil(<浮点数>);`
```c
// 向下取整
double f = floor(3.7);
// 向上取整
double c = ceil(3.2);
```

---

## 时间函数

**基本写法：time 获取时间**
`time(<time_t*>);`
```c
// 获取当前时间戳
time_t now = time(NULL);
```

---

**基本写法：clock 计时**
`clock();`
```c
// 测量执行时间
clock_t start = clock();
// ... 代码 ...
clock_t end = clock();
double elapsed = (double)(end - start) / CLOCKS_PER_SEC;
```

---

## 字符分类

**基本写法：isdigit 数字判断**
`isdigit(<字符>);`
```c
// 判断是否为数字
if (isdigit('5')) { /* 是数字 */ }
```

---

**基本写法：isalpha 字母判断**
`isalpha(<字符>);`
```c
// 判断是否为字母
if (isalpha('A')) { /* 是字母 */ }
```

---

**基本写法：tolower 转小写**
`tolower(<字符>);`
```c
// 转换为小写
char lower = tolower('A');
```

---

**基本写法：toupper 转大写**
`toupper(<字符>);`
```c
// 转换为大写
char upper = toupper('a');
```
