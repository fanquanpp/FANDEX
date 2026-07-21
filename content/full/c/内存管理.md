---
order: 95
tags:
  - c
  - memory
difficulty: advanced
title: 内存管理
module: c
category: 'C Basics'
description: C语言动态内存分配、内存布局、常见内存错误与调试技术详解。
author: fanquanpp
updated: '2026-06-13'
related:
  - c/C23与C2y新标准
  - c/指针深度解析
  - c/内存对齐
  - c/结构体与联合体
prerequisites:
  - c/概述
---

## 1. C语言内存布局

### 1.1 进程内存模型

C程序的内存空间由以下几个区域组成：

```
高地址
┌──────────────────┐
│   栈区 (Stack)    │  ← 局部变量、函数调用信息，向下增长
├──────────────────┤
│                  │
│   (空闲区域)      │
│                  │
├──────────────────┤
│   堆区 (Heap)     │  ← 动态分配内存，向上增长
├──────────────────┤
│   BSS段           │  ← 未初始化的全局/静态变量（自动清零）
├──────────────────┤
│   数据段 (Data)   │  ← 已初始化的全局/静态变量
├──────────────────┤
│   代码段 (Text)   │  ← 可执行指令（只读）
└──────────────────┘
低地址
```

```c
#include <stdio.h>
#include <stdlib.h>

int global_init = 42;        // 数据段
int global_uninit;            // BSS段
const int global_const = 100; // 只读数据段
static int static_var = 10;   // 数据段

void memory_layout_demo(void) {
    int local_var = 5;                    // 栈区
    static int local_static = 20;         // 数据段
    int *heap_var = malloc(sizeof(int));  // 堆区
    *heap_var = 30;

    printf("代码段: %p\n", (void *)memory_layout_demo);
    printf("数据段(全局初始化): %p\n", (void *)&global_init);
    printf("BSS段(全局未初始化): %p\n", (void *)&global_uninit);
    printf("栈区(局部变量): %p\n", (void *)&local_var);
    printf("堆区(动态分配): %p\n", (void *)heap_var);

    free(heap_var);
}
```

### 1.2 栈与堆的对比

| 特性     | 栈 (Stack)         | 堆 (Heap)          |
| :------- | :----------------- | :----------------- |
| 分配方式 | 自动（编译器管理） | 手动（程序员控制） |
| 分配速度 | 非常快（移动指针） | 较慢（搜索空闲块） |
| 空间大小 | 较小（通常1-8MB）  | 较大（受系统限制） |
| 生命周期 | 函数返回自动释放   | 需手动释放         |
| 碎片问题 | 无                 | 可能产生碎片       |
| 访问方式 | LIFO               | 任意顺序           |

## 2. 动态内存分配

### 2.1 malloc、calloc、realloc、free

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void allocation_demo(void) {
    // malloc: 分配指定字节数，内容未初始化
    int *arr1 = (int *)malloc(5 * sizeof(int));
    if (arr1 == NULL) {
        fprintf(stderr, "malloc failed\n");
        exit(EXIT_FAILURE);
    }
    for (int i = 0; i < 5; i++) {
        arr1[i] = i * 10;
    }

    // calloc: 分配并初始化为零
    int *arr2 = (int *)calloc(5, sizeof(int));
    if (arr2 == NULL) {
        fprintf(stderr, "calloc failed\n");
        free(arr1);
        exit(EXIT_FAILURE);
    }
    // arr2 的所有元素已初始化为0

    // realloc: 调整已分配内存的大小
    int *arr3 = (int *)realloc(arr1, 10 * sizeof(int));
    if (arr3 == NULL) {
        fprintf(stderr, "realloc failed\n");
        free(arr1);
        free(arr2);
        exit(EXIT_FAILURE);
    }
    arr1 = arr3;  // realloc可能返回新地址
    // 新增的5个元素内容未初始化

    // free: 释放动态分配的内存
    free(arr1);
    free(arr2);

    // 释放后将指针置NULL，防止悬空指针
    arr1 = NULL;
    arr2 = NULL;
}
```

### 2.2 三种分配函数的对比

| 函数    | 原型                                    | 初始化     | 用途         |
| :------ | :-------------------------------------- | :--------- | :----------- |
| malloc  | `void *malloc(size_t size)`             | 不初始化   | 通用内存分配 |
| calloc  | `void *calloc(size_t n, size_t size)`   | 清零       | 数组分配     |
| realloc | `void *realloc(void *ptr, size_t size)` | 保留原数据 | 调整内存大小 |

### 2.3 realloc 的行为细节

```c
void realloc_details(void) {
    int *ptr = (int *)malloc(5 * sizeof(int));
    for (int i = 0; i < 5; i++) ptr[i] = i;

    // 情况1：原地扩展（后方有足够空间）
    // 返回原指针，数据不变

    // 情况2：重新分配（后方空间不足）
    // 分配新块，复制旧数据，释放旧块，返回新指针

    // 情况3：缩小大小
    // 可能原地缩小，返回原指针

    int *new_ptr = (int *)realloc(ptr, 10 * sizeof(int));
    if (new_ptr == NULL) {
        // realloc失败时，原内存ptr仍然有效！
        free(ptr);
        return;
    }
    ptr = new_ptr;  // 始终使用返回值更新指针

    // 特殊用法：realloc(NULL, size) 等价于 malloc(size)
    int *p = (int *)realloc(NULL, 5 * sizeof(int));

    // 特殊用法：realloc(ptr, 0) 等价于 free(ptr)（C99前）
    // 注意：C11中行为已变更，不建议使用

    free(ptr);
    free(new_ptr);
}
```

## 3. 动态数据结构

### 3.1 动态数组

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int *data;
    size_t size;
    size_t capacity;
} DynamicArray;

DynamicArray *da_create(size_t initial_capacity) {
    DynamicArray *da = malloc(sizeof(DynamicArray));
    if (!da) return NULL;

    da->data = malloc(initial_capacity * sizeof(int));
    if (!da->data) {
        free(da);
        return NULL;
    }

    da->size = 0;
    da->capacity = initial_capacity;
    return da;
}

void da_push(DynamicArray *da, int value) {
    if (da->size >= da->capacity) {
        // 扩容策略：2倍增长
        size_t new_capacity = da->capacity * 2;
        int *new_data = realloc(da->data, new_capacity * sizeof(int));
        if (!new_data) return;
        da->data = new_data;
        da->capacity = new_capacity;
    }
    da->data[da->size++] = value;
}

int da_get(DynamicArray *da, size_t index) {
    if (index >= da->size) {
        fprintf(stderr, "Index out of bounds\n");
        return -1;
    }
    return da->data[index];
}

void da_free(DynamicArray *da) {
    if (da) {
        free(da->data);
        free(da);
    }
}

int main(void) {
    DynamicArray *arr = da_create(4);
    for (int i = 0; i < 20; i++) {
        da_push(arr, i * 3);
    }
    for (size_t i = 0; i < arr->size; i++) {
        printf("%d ", da_get(arr, i));
    }
    printf("\nSize: %zu, Capacity: %zu\n", arr->size, arr->capacity);
    da_free(arr);
    return 0;
}
```

### 3.2 链表

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *node_create(int data) {
    Node *node = malloc(sizeof(Node));
    if (!node) return NULL;
    node->data = data;
    node->next = NULL;
    return node;
}

void list_append(Node **head, int data) {
    Node *new_node = node_create(data);
    if (!new_node) return;

    if (*head == NULL) {
        *head = new_node;
        return;
    }

    Node *current = *head;
    while (current->next) {
        current = current->next;
    }
    current->next = new_node;
}

void list_free(Node *head) {
    Node *current = head;
    while (current) {
        Node *next = current->next;
        free(current);
        current = next;
    }
}

void list_print(Node *head) {
    Node *current = head;
    while (current) {
        printf("%d -> ", current->data);
        current = current->next;
    }
    printf("NULL\n");
}
```

## 4. 常见内存错误

### 4.1 内存泄漏

```c
// 错误：忘记释放内存
void memory_leak_example(void) {
    int *ptr = malloc(100 * sizeof(int));
    // 使用ptr...
    // 函数结束但未free(ptr) → 内存泄漏！
}

// 正确：确保每个malloc都有对应的free
void no_leak_example(void) {
    int *ptr = malloc(100 * sizeof(int));
    if (!ptr) return;
    // 使用ptr...
    free(ptr);
    ptr = NULL;
}
```

### 4.2 悬空指针（Dangling Pointer）

```c
// 错误：使用已释放的内存
void dangling_pointer_example(void) {
    int *ptr = malloc(sizeof(int));
    *ptr = 42;
    free(ptr);
    // ptr现在是悬空指针
    printf("%d\n", *ptr);  // 未定义行为！
}

// 正确：释放后置NULL
void safe_pointer_example(void) {
    int *ptr = malloc(sizeof(int));
    if (!ptr) return;
    *ptr = 42;
    free(ptr);
    ptr = NULL;
    // 后续使用ptr前检查
    if (ptr) {
        printf("%d\n", *ptr);
    }
}
```

### 4.3 重复释放（Double Free）

```c
// 错误：对同一块内存释放两次
void double_free_example(void) {
    int *ptr = malloc(sizeof(int));
    free(ptr);
    free(ptr);  // 未定义行为！可能导致程序崩溃
}

// 正确：释放后置NULL，free(NULL)是安全的
void safe_free_example(void) {
    int *ptr = malloc(sizeof(int));
    free(ptr);
    ptr = NULL;
    free(ptr);  // free(NULL)是安全的，什么都不做
}
```

### 4.4 缓冲区溢出

```c
// 错误：写入超出分配范围
void buffer_overflow_example(void) {
    int *arr = malloc(5 * sizeof(int));
    for (int i = 0; i <= 5; i++) {  // i=5时越界！
        arr[i] = i;
    }
    free(arr);
}

// 正确：严格检查边界
void safe_buffer_example(void) {
    size_t size = 5;
    int *arr = malloc(size * sizeof(int));
    if (!arr) return;
    for (size_t i = 0; i < size; i++) {  // i < size
        arr[i] = (int)i;
    }
    free(arr);
}
```

### 4.5 使用未初始化的内存

```c
// 错误：使用malloc后未初始化
void uninit_memory_example(void) {
    int *arr = malloc(5 * sizeof(int));
    printf("%d\n", arr[0]);  // 值不确定！
    free(arr);
}

// 正确：使用calloc或手动初始化
void init_memory_example(void) {
    // 方式1：使用calloc（自动清零）
    int *arr1 = calloc(5, sizeof(int));

    // 方式2：使用memset
    int *arr2 = malloc(5 * sizeof(int));
    memset(arr2, 0, 5 * sizeof(int));

    free(arr1);
    free(arr2);
}
```

## 5. 内存调试技术

### 5.1 Valgrind 内存检测

```bash
# 编译时加 -g 保留调试信息
gcc -g -o program program.c

# 使用Valgrind检测内存错误
valgrind --leak-check=full --show-leak-kinds=all ./program

# 常见Valgrind输出
# ==12345== HEAP SUMMARY:
# ==12345==     in use at exit: 40 bytes in 1 blocks
# ==12345==   total heap usage: 2 allocs, 1 frees, 80 bytes allocated
# ==12345==
# ==12345== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
# ==12345==    at 0x4C29F73: malloc (vg_replace_malloc.c:309)
# ==12345==    by 0x4005A6: memory_leak_example (program.c:10)
```

### 5.2 AddressSanitizer

```bash
# GCC/Clang编译时启用ASan
gcc -fsanitize=address -g -o program program.c
./program

# ASan会检测：
# - 堆缓冲区溢出
# - 栈缓冲区溢出
# - 使用已释放内存
# - 内存泄漏
# - 重复释放
```

### 5.3 自定义内存分配器（调试用）

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 调试用内存追踪
typedef struct MemRecord {
    void *ptr;
    size_t size;
    const char *file;
    int line;
    struct MemRecord *next;
} MemRecord;

static MemRecord *mem_list = NULL;
static size_t total_allocated = 0;

// 包装malloc
void *debug_malloc(size_t size, const char *file, int line) {
    void *ptr = malloc(size);
    if (ptr) {
        MemRecord *record = malloc(sizeof(MemRecord));
        record->ptr = ptr;
        record->size = size;
        record->file = file;
        record->line = line;
        record->next = mem_list;
        mem_list = record;
        total_allocated += size;
    }
    return ptr;
}

// 包装free
void debug_free(void *ptr, const char *file, int line) {
    if (!ptr) return;

    MemRecord **pp = &mem_list;
    while (*pp) {
        if ((*pp)->ptr == ptr) {
            MemRecord *found = *pp;
            total_allocated -= found->size;
            *pp = found->next;
            free(found);
            break;
        }
        pp = &(*pp)->next;
    }
    free(ptr);
}

// 报告未释放的内存
void debug_report(void) {
    if (mem_list) {
        fprintf(stderr, "\n=== Memory Leak Report ===\n");
        MemRecord *current = mem_list;
        while (current) {
            fprintf(stderr, "Leak: %zu bytes at %p, allocated at %s:%d\n",
                    current->size, current->ptr, current->file, current->line);
            current = current->next;
        }
    }
    fprintf(stderr, "Total allocated: %zu bytes\n", total_allocated);
}

// 宏定义简化调用
#define MALLOC(size) debug_malloc(size, __FILE__, __LINE__)
#define FREE(ptr) debug_free(ptr, __FILE__, __LINE__)
```

## 6. 常见问题与解决方案

### 6.1 malloc 返回值未检查

**问题**：内存分配可能失败，不检查返回值导致空指针解引用

```c
// 错误
int *ptr = malloc(1000 * sizeof(int));
ptr[0] = 42;  // 如果malloc失败，解引用NULL

// 正确
int *ptr = malloc(1000 * sizeof(int));
if (ptr == NULL) {
    fprintf(stderr, "Memory allocation failed\n");
    exit(EXIT_FAILURE);
}
ptr[0] = 42;
```

### 6.2 栈溢出

**问题**：在栈上分配过大数组

```c
// 错误：栈空间有限，大数组应使用堆
void stack_overflow(void) {
    int huge_array[10000000];  // 可能导致栈溢出
}

// 正确：使用动态分配
void heap_allocation(void) {
    int *huge_array = malloc(10000000 * sizeof(int));
    if (!huge_array) return;
    // 使用...
    free(huge_array);
}
```

### 6.3 realloc 后原指针失效

**问题**：realloc可能返回新地址，旧指针可能无效

```c
// 错误：直接用原指针接收realloc返回值
int *ptr = malloc(100 * sizeof(int));
ptr = realloc(ptr, 200 * sizeof(int));  // 如果失败，ptr变为NULL，原内存泄漏

// 正确：用临时变量接收
int *temp = realloc(ptr, 200 * sizeof(int));
if (temp) {
    ptr = temp;
} else {
    // realloc失败，ptr仍然有效
    free(ptr);
    exit(EXIT_FAILURE);
}
```

## 7. 总结与最佳实践

### 7.1 内存管理原则

1. **谁分配，谁释放**：明确内存所有权
2. **配对使用**：每个 malloc 必须有对应的 free
3. **及时释放**：不再使用时立即释放
4. **释放后置 NULL**：防止悬空指针和重复释放
5. **检查返回值**：malloc/calloc/realloc 可能失败

### 7.2 内存分配策略

- 小对象、确定大小：使用栈分配
- 大对象、运行时确定大小：使用堆分配
- 需要清零：使用 calloc
- 需要调整大小：使用 realloc（2倍扩容策略）
- 高频分配：考虑内存池

### 7.3 调试建议

- 开发阶段始终使用 Valgrind 或 ASan 检测内存问题
- 使用自定义内存分配器追踪分配/释放
- 代码审查重点关注内存管理逻辑
- 编写单元测试覆盖边界条件
