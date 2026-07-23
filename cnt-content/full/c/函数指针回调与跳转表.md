---
order: 104
title: 函数指针回调与跳转表
module: c
category: 'dev-lang'
difficulty: advanced
description: C语言函数指针回调机制与跳转表实现。
author: fanquanpp
updated: '2026-06-14'
related:
  - c/指针与数组的区别
  - c/二级指针与指针数组
  - c/动态库与静态库
  - c/volatile关键字
prerequisites:
  - c/概述
---

## 概述

函数指针是C语言中最灵活的特性之一，它将函数的地址作为数据存储，使得函数可以像普通变量一样被传递、存储和调用。回调函数是函数指针的典型应用，允许调用者将自定义行为注入被调用者的执行流程中。跳转表则利用函数指针数组替代冗长的 switch-case 分支结构，实现 O(1) 的分发查找。三者共同构成了C语言中实现多态、事件驱动和策略模式的基础设施。

## 基础概念

### 函数指针的声明与初始化

函数指针是一个指向函数的指针变量，其类型由返回值和参数列表共同决定。声明语法为 `返回类型 (*指针名)(参数列表)`。

```c
/* 声明一个指向 int(int,int) 类型函数的指针 */
int (*fp)(int, int);

/* 定义一个匹配的函数 */
int add(int a, int b) { return a + b; }

/* 用函数名初始化，函数名即地址 */
fp = add;       /* 推荐写法 */
fp = &add;      /* 等价写法，& 可省略 */
```

### 函数指针的调用

通过函数指针调用函数有两种等价写法：

```c
int result1 = fp(3, 4);      /* 直接调用，推荐 */
int result2 = (*fp)(3, 4);   /* 显式解引用调用 */
/* 两种写法结果相同，均为 7 */
```

### typedef 简化函数指针类型

函数指针的声明语法较为冗长，使用 typedef 可以显著提高可读性：

```c
/* 定义函数指针类型 */
typedef int (*BinaryOp)(int, int);

/* 用类型名声明变量，清晰简洁 */
BinaryOp op = add;
op(10, 20);  /* 30 */
```

### 回调函数的本质

回调函数是通过函数指针传递给另一个函数的函数，被调用者在特定时机回过头来调用它。其本质是控制反转：调用者不再决定做什么，而是将"做什么"的决定权交给外部。

```c
/* 比较函数的回调原型 */
typedef int (*CompareFunc)(const void *, const void *);

/* qsort 使用回调来决定排序规则 */
void qsort(void *base, size_t nmemb, size_t size, CompareFunc compar);
```

### 跳转表的本质

跳转表是函数指针的数组，用索引直接定位并调用目标函数，避免了 switch-case 的逐条比较。它本质上是将分支逻辑转化为数据查找。

```c
/* 跳转表：用数组索引替代 switch-case */
double (*ops[])(double, double) = { add, sub, mul, divide };
/* ops[0] 即 add，ops[1] 即 sub，依此类推 */
```

## 快速上手

### 第一个函数指针程序

```c
#include <stdio.h>

/* 定义两个简单函数 */
int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

int main(void) {
    /* 声明函数指针并指向 add */
    int (*op)(int, int) = add;
    printf("3 + 4 = %d\n", op(3, 4));  /* 7 */

    /* 切换指向 multiply */
    op = multiply;
    printf("3 * 4 = %d\n", op(3, 4));  /* 12 */

    return 0;
}
```

### 第一个回调函数程序

```c
#include <stdio.h>

/* 回调函数类型 */
typedef void (*Callback)(int result);

/* 模拟异步操作，完成后调用回调 */
void asyncOperation(int input, Callback cb) {
    int result = input * 2;
    cb(result);  /* 操作完成，回调通知 */
}

/* 用户定义的回调处理函数 */
void onResult(int result) {
    printf("异步操作结果: %d\n", result);
}

int main(void) {
    asyncOperation(21, onResult);  /* 输出: 异步操作结果: 42 */
    return 0;
}
```

### 第一个跳转表程序

```c
#include <stdio.h>

double add(double a, double b) { return a + b; }
double sub(double a, double b) { return a - b; }
double mul(double a, double b) { return a * b; }
double divide(double a, double b) { return b != 0 ? a / b : 0; }

/* 跳转表 */
double (*ops[])(double, double) = { add, sub, mul, divide };

/* 通过索引调用 */
double calculate(int op, double a, double b) {
    if (op >= 0 && op < 4) return ops[op](a, b);
    return 0;
}

int main(void) {
    printf("10 + 3 = %.1f\n", calculate(0, 10, 3));  /* 13.0 */
    printf("10 - 3 = %.1f\n", calculate(1, 10, 3));  /* 7.0  */
    printf("10 * 3 = %.1f\n", calculate(2, 10, 3));  /* 30.0 */
    printf("10 / 3 = %.1f\n", calculate(3, 10, 3));  /* 3.3  */
    return 0;
}
```

## 详细用法

### 函数指针数组

当需要管理一组同签名的函数时，函数指针数组比散列的 switch-case 更清晰：

```c
#include <stdio.h>

/* 四则运算函数 */
double add(double a, double b) { return a + b; }
double sub(double a, double b) { return a - b; }
double mul(double a, double b) { return a * b; }
double divide(double a, double b) { return b != 0 ? a / b : 0; }

/* 函数指针数组 + 名称数组，配合使用 */
double (*ops[])(double, double) = { add, sub, mul, divide };
const char *op_names[] = { "加", "减", "乘", "除" };

int main(void) {
    double a = 20.0, b = 4.0;
    for (int i = 0; i < 4; i++) {
        printf("%.0f %s %.0f = %.2f\n", a, op_names[i], b, ops[i](a, b));
    }
    return 0;
}
```

### 返回函数指针的函数

函数可以作为工厂，根据条件返回不同的函数指针：

```c
#include <stdio.h>

typedef double (*MathOp)(double, double);

double add(double a, double b) { return a + b; }
double sub(double a, double b) { return a - b; }
double mul(double a, double b) { return a * b; }

/* 根据运算符返回对应的函数指针 */
MathOp getOperator(char op) {
    switch (op) {
        case '+': return add;
        case '-': return sub;
        case '*': return mul;
        default:  return NULL;  /* 未知运算符 */
    }
}

int main(void) {
    MathOp op = getOperator('+');
    if (op) {
        printf("5 + 3 = %.0f\n", op(5, 3));  /* 8 */
    }
    return 0;
}
```

### 带上下文的回调

在实际项目中，回调通常需要额外的上下文信息。C语言通过 void 指针传递上下文：

```c
#include <stdio.h>
#include <stdlib.h>

/* 回调类型：接收元素值和用户上下文 */
typedef void (*ForEachCallback)(int element, void *context);

/* 遍历数组并对每个元素调用回调 */
void forEach(int *arr, int len, ForEachCallback cb, void *context) {
    for (int i = 0; i < len; i++) {
        cb(arr[i], context);
    }
}

/* 回调：求和，上下文为累加器 */
void sumCallback(int element, void *context) {
    int *sum = (int *)context;
    *sum += element;
}

/* 回调：过滤并打印偶数，上下文为计数器 */
void evenCallback(int element, void *context) {
    int *count = (int *)context;
    if (element % 2 == 0) {
        printf("偶数: %d\n", element);
        (*count)++;
    }
}

int main(void) {
    int arr[] = { 1, 2, 3, 4, 5, 6 };
    int sum = 0;
    forEach(arr, 6, sumCallback, &sum);
    printf("总和: %d\n", sum);  /* 21 */

    int evenCount = 0;
    forEach(arr, 6, evenCallback, &evenCount);
    printf("偶数个数: %d\n", evenCount);  /* 3 */

    return 0;
}
```

### 使用 qsort 的比较回调

标准库的 qsort 函数是回调的经典应用：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char name[32];
    int score;
} Student;

/* 按分数降序排列 */
int compareByScoreDesc(const void *a, const void *b) {
    const Student *sa = (const Student *)a;
    const Student *sb = (const Student *)b;
    return sb->score - sa->score;  /* 降序 */
}

/* 按姓名字典序排列 */
int compareByName(const void *a, const void *b) {
    const Student *sa = (const Student *)a;
    const Student *sb = (const Student *)b;
    return strcmp(sa->name, sb->name);
}

int main(void) {
    Student students[] = {
        { "张三", 85 },
        { "李四", 92 },
        { "王五", 78 },
    };
    int n = sizeof(students) / sizeof(students[0]);

    /* 按分数排序 */
    qsort(students, n, sizeof(Student), compareByScoreDesc);
    printf("按分数降序:\n");
    for (int i = 0; i < n; i++) {
        printf("  %s: %d\n", students[i].name, students[i].score);
    }

    /* 按姓名排序 */
    qsort(students, n, sizeof(Student), compareByName);
    printf("按姓名排序:\n");
    for (int i = 0; i < n; i++) {
        printf("  %s: %d\n", students[i].name, students[i].score);
    }

    return 0;
}
```

### 跳转表实现命令分发

跳转表在命令解析和协议处理中非常实用：

```c
#include <stdio.h>
#include <string.h>

/* 命令处理函数类型 */
typedef void (*CmdHandler)(const char *arg);

/* 各命令的处理函数 */
void cmdHelp(const char *arg) {
    printf("可用命令: help, list, add, remove, quit\n");
}

void cmdList(const char *arg) {
    printf("显示列表内容...\n");
}

void cmdAdd(const char *arg) {
    printf("添加: %s\n", arg ? arg : "(无参数)");
}

void cmdRemove(const char *arg) {
    printf("移除: %s\n", arg ? arg : "(无参数)");
}

void cmdQuit(const char *arg) {
    printf("退出程序\n");
}

/* 命令表项 */
typedef struct {
    const char *name;    /* 命令名 */
    CmdHandler handler;  /* 处理函数 */
} CmdEntry;

/* 命令跳转表 */
CmdEntry cmdTable[] = {
    { "help",   cmdHelp   },
    { "list",   cmdList   },
    { "add",    cmdAdd    },
    { "remove", cmdRemove },
    { "quit",   cmdQuit   },
};

#define CMD_COUNT (sizeof(cmdTable) / sizeof(cmdTable[0]))

/* 分发命令 */
void dispatch(const char *cmd, const char *arg) {
    for (int i = 0; i < (int)CMD_COUNT; i++) {
        if (strcmp(cmdTable[i].name, cmd) == 0) {
            cmdTable[i].handler(arg);
            return;
        }
    }
    printf("未知命令: %s\n", cmd);
}

int main(void) {
    dispatch("help", NULL);       /* 显示帮助 */
    dispatch("add", "item1");     /* 添加 item1 */
    dispatch("list", NULL);       /* 显示列表 */
    dispatch("unknown", NULL);    /* 未知命令 */
    return 0;
}
```

## 常见场景

### 事件驱动系统

图形界面和网络框架广泛使用回调来处理事件：

```c
#include <stdio.h>

/* 事件类型 */
typedef enum { EVENT_CLICK, EVENT_KEY, EVENT_TIMER } EventType;

/* 事件数据 */
typedef struct {
    EventType type;
    int x, y;       /* 坐标（点击事件） */
    int keycode;    /* 键码（键盘事件） */
} Event;

/* 事件回调类型 */
typedef void (*EventHandler)(const Event *e);

/* 事件处理器注册表 */
EventHandler handlers[3] = { NULL };

/* 注册事件处理器 */
void registerHandler(EventType type, EventHandler handler) {
    if (type >= 0 && type < 3) {
        handlers[type] = handler;
    }
}

/* 触发事件 */
void fireEvent(const Event *e) {
    if (e->type >= 0 && e->type < 3 && handlers[e->type]) {
        handlers[e->type](e);
    }
}

/* 具体的事件处理函数 */
void onClick(const Event *e) {
    printf("鼠标点击: (%d, %d)\n", e->x, e->y);
}

void onKey(const Event *e) {
    printf("按键: %d\n", e->keycode);
}

int main(void) {
    /* 注册处理器 */
    registerHandler(EVENT_CLICK, onClick);
    registerHandler(EVENT_KEY, onKey);

    /* 模拟事件 */
    Event click = { EVENT_CLICK, 100, 200, 0 };
    Event key   = { EVENT_KEY, 0, 0, 65 };
    fireEvent(&click);  /* 鼠标点击: (100, 200) */
    fireEvent(&key);    /* 按键: 65 */

    return 0;
}
```

### 策略模式

通过函数指针实现运行时切换算法策略：

```c
#include <stdio.h>

/* 排序策略类型 */
typedef void (*SortStrategy)(int *arr, int n);

/* 冒泡排序 */
void bubbleSort(int *arr, int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (arr[j] > arr[j + 1]) {
                int tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
}

/* 选择排序 */
void selectionSort(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++)
            if (arr[j] < arr[min]) min = j;
        if (min != i) {
            int tmp = arr[i];
            arr[i] = arr[min];
            arr[min] = tmp;
        }
    }
}

/* 使用策略排序 */
void sortWith(int *arr, int n, SortStrategy strategy) {
    strategy(arr, n);
}

void printArr(int *arr, int n) {
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
}

int main(void) {
    int a[] = { 5, 3, 1, 4, 2 };
    int b[] = { 5, 3, 1, 4, 2 };

    /* 使用冒泡排序策略 */
    sortWith(a, 5, bubbleSort);
    printf("冒泡排序: "); printArr(a, 5);

    /* 使用选择排序策略 */
    sortWith(b, 5, selectionSort);
    printf("选择排序: "); printArr(b, 5);

    return 0;
}
```

### 插件架构

动态加载库中的函数指针实现插件机制：

```c
#include <stdio.h>
#include <dlfcn.h>

/* 插件接口定义 */
typedef const char *(*PluginGetNameFunc)(void);
typedef void (*PluginRunFunc)(const char *arg);

int main(void) {
    /* 动态加载插件库 */
    void *handle = dlopen("./plugin.so", RTLD_LAZY);
    if (!handle) {
        fprintf(stderr, "加载失败: %s\n", dlerror());
        return 1;
    }

    /* 获取插件函数 */
    PluginGetNameFunc getName = (PluginGetNameFunc)dlsym(handle, "pluginGetName");
    PluginRunFunc run = (PluginRunFunc)dlsym(handle, "pluginRun");

    if (getName && run) {
        printf("插件: %s\n", getName());
        run("hello");
    }

    dlclose(handle);
    return 0;
}
```

## 注意事项

### 函数指针的类型安全

函数指针的类型必须与目标函数的签名完全匹配，包括返回值类型和所有参数类型。不匹配的转换会导致未定义行为：

```c
int add(int a, int b) { return a + b; }
double (*fp)(double, double) = (double (*)(double, double))add;  /* 危险！ */
/* 调用 fp 会产生未定义行为，因为 int 和 double 的传参方式不同 */
```

### 空函数指针检查

调用空函数指针会导致程序崩溃，调用前必须检查：

```c
typedef void (*Callback)(void);

void safeCall(Callback cb) {
    if (cb != NULL) {  /* 必须检查 */
        cb();
    }
}
```

### 回调中的重入问题

回调函数可能在中断或递归场景中被重复调用，需要注意状态一致性：

```c
/* 不安全的回调：全局状态被回调修改 */
static int counter = 0;

void unsafeCallback(void) {
    counter++;
    /* 如果此处被中断并再次调用，counter 可能不一致 */
}

/* 安全做法：使用局部变量或原子操作 */
```

### 跳转表越界访问

跳转表通过索引访问，必须进行边界检查，否则可能调用到非法地址：

```c
double (*ops[])(double, double) = { add, sub, mul, divide };
#define OPS_COUNT (sizeof(ops) / sizeof(ops[0]))

double safeCalculate(int op, double a, double b) {
    if (op < 0 || op >= (int)OPS_COUNT) {
        fprintf(stderr, "无效操作码: %d\n", op);
        return 0;
    }
    return ops[op](a, b);
}
```

### 函数指针与 volatile

在中断服务程序或信号处理函数中使用的函数指针应声明为 volatile，防止编译器优化掉看似"多余"的读取：

```c
/* 中断中可能被修改的回调 */
volatile typedef void (*IsrCallback)(void);
volatile IsrCallback isrHandler = NULL;
```

### 平台相关的调用约定

不同平台和编译器可能有不同的调用约定（cdecl、stdcall、fastcall 等），跨平台代码需要明确指定：

```c
/* Windows API 回调使用 __stdcall 约定 */
#ifdef _WIN32
typedef void (__stdcall *WinCallback)(int);
#else
typedef void (*WinCallback)(int);
#endif
```

## 进阶用法

### 用函数指针模拟面向对象多态

C语言没有类和虚函数，但可以通过结构体 + 函数指针实现类似多态的效果：

```c
#include <stdio.h>
#include <stdlib.h>

/* "基类"：形状接口 */
typedef struct Shape Shape;

struct Shape {
    void (*draw)(const Shape *self);
    double (*area)(const Shape *self);
    void (*destroy)(Shape *self);
};

/* 圆形 */
typedef struct {
    Shape base;     /* 必须放在首位，保证指针可互换 */
    double radius;
} Circle;

void circleDraw(const Shape *self) {
    const Circle *c = (const Circle *)self;
    printf("绘制圆形，半径: %.1f\n", c->radius);
}

double circleArea(const Shape *self) {
    const Circle *c = (const Circle *)self;
    return 3.14159 * c->radius * c->radius;
}

void circleDestroy(Shape *self) {
    free(self);
}

Shape *createCircle(double radius) {
    Circle *c = (Circle *)malloc(sizeof(Circle));
    c->base.draw = circleDraw;
    c->base.area = circleArea;
    c->base.destroy = circleDestroy;
    c->radius = radius;
    return (Shape *)c;
}

/* 矩形 */
typedef struct {
    Shape base;
    double width, height;
} Rectangle;

void rectDraw(const Shape *self) {
    const Rectangle *r = (const Rectangle *)self;
    printf("绘制矩形，宽: %.1f 高: %.1f\n", r->width, r->height);
}

double rectArea(const Shape *self) {
    const Rectangle *r = (const Rectangle *)self;
    return r->width * r->height;
}

void rectDestroy(Shape *self) {
    free(self);
}

Shape *createRectangle(double w, double h) {
    Rectangle *r = (Rectangle *)malloc(sizeof(Rectangle));
    r->base.draw = rectDraw;
    r->base.area = rectArea;
    r->base.destroy = rectDestroy;
    r->width = w;
    r->height = h;
    return (Shape *)r;
}

/* 多态调用 */
void printShapeInfo(Shape *s) {
    s->draw(s);
    printf("面积: %.2f\n", s->area(s));
}

int main(void) {
    Shape *shapes[2];
    shapes[0] = createCircle(5.0);
    shapes[1] = createRectangle(4.0, 6.0);

    for (int i = 0; i < 2; i++) {
        printShapeInfo(shapes[i]);
    }

    for (int i = 0; i < 2; i++) {
        shapes[i]->destroy(shapes[i]);
    }

    return 0;
}
```

### 观察者模式

使用回调链实现一对多的通知机制：

```c
#include <stdio.h>

#define MAX_OBSERVERS 10

typedef void (*Observer)(const char *event, void *data);

/* 主题：管理观察者列表 */
typedef struct {
    Observer observers[MAX_OBSERVERS];
    int count;
} Subject;

void subjectInit(Subject *s) {
    s->count = 0;
}

void subjectAttach(Subject *s, Observer obs) {
    if (s->count < MAX_OBSERVERS) {
        s->observers[s->count++] = obs;
    }
}

void subjectNotify(Subject *s, const char *event, void *data) {
    for (int i = 0; i < s->count; i++) {
        s->observers[i](event, data);
    }
}

/* 具体观察者 */
void loggerObserver(const char *event, void *data) {
    printf("[日志] 事件: %s\n", event);
}

void alertObserver(const char *event, void *data) {
    printf("[警报] 收到通知: %s\n", event);
}

int main(void) {
    Subject subject;
    subjectInit(&subject);

    /* 注册观察者 */
    subjectAttach(&subject, loggerObserver);
    subjectAttach(&subject, alertObserver);

    /* 触发事件，所有观察者收到通知 */
    subjectNotify(&subject, "温度过高", NULL);

    return 0;
}
```

### 基于跳转表的状态机

跳转表可以高效实现有限状态机，每个状态对应一个处理函数：

```c
#include <stdio.h>

/* 状态枚举 */
typedef enum { STATE_IDLE, STATE_RUNNING, STATE_PAUSED, STATE_COUNT } State;

/* 事件枚举 */
typedef enum { EVT_START, EVT_PAUSE, EVT_RESUME, EVT_STOP } Event;

/* 状态处理函数类型 */
typedef State (*StateHandler)(Event evt);

/* 各状态的处理逻辑 */
State handleIdle(Event evt) {
    if (evt == EVT_START) {
        printf("启动...\n");
        return STATE_RUNNING;
    }
    printf("空闲状态忽略事件 %d\n", evt);
    return STATE_IDLE;
}

State handleRunning(Event evt) {
    switch (evt) {
        case EVT_PAUSE:
            printf("暂停...\n");
            return STATE_PAUSED;
        case EVT_STOP:
            printf("停止...\n");
            return STATE_IDLE;
        default:
            printf("运行状态忽略事件 %d\n", evt);
            return STATE_RUNNING;
    }
}

State handlePaused(Event evt) {
    switch (evt) {
        case EVT_RESUME:
            printf("恢复...\n");
            return STATE_RUNNING;
        case EVT_STOP:
            printf("停止...\n");
            return STATE_IDLE;
        default:
            printf("暂停状态忽略事件 %d\n", evt);
            return STATE_PAUSED;
    }
}

/* 状态跳转表 */
StateHandler stateTable[STATE_COUNT] = {
    handleIdle,     /* STATE_IDLE    */
    handleRunning,  /* STATE_RUNNING */
    handlePaused,   /* STATE_PAUSED  */
};

int main(void) {
    State current = STATE_IDLE;

    /* 模拟事件序列 */
    Event events[] = { EVT_START, EVT_PAUSE, EVT_RESUME, EVT_STOP };
    int n = sizeof(events) / sizeof(events[0]);

    for (int i = 0; i < n; i++) {
        current = stateTable[current](events[i]);
    }

    return 0;
}
```

### C11 泛型结合函数指针

C11 的 `_Generic` 可以与函数指针配合，实现类型安全的泛型分发：

```c
#include <stdio.h>

/* 各类型的打印函数 */
void printInt(void *p)    { printf("int: %d\n", *(int *)p); }
void printDouble(void *p) { printf("double: %.2f\n", *(double *)p); }
void printChar(void *p)   { printf("char: %c\n", *(char *)p); }

/* 根据类型选择打印函数 */
#define PRINT(x) _Generic((x), \
    int:    printInt,           \
    double: printDouble,        \
    char:   printChar           \
)(&(x))

int main(void) {
    int a = 42;
    double b = 3.14;
    char c = 'X';

    PRINT(a);  /* int: 42 */
    PRINT(b);  /* double: 3.14 */
    PRINT(c);  /* char: X */

    return 0;
}
```
