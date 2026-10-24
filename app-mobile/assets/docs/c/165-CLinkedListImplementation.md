---
order: 200
title: C 链表与节点式数据结构
module: 'c'
category: 计算机科学
difficulty: advanced
description: 用 struct Node 与 malloc 手写链表这一节点式数据结构：节点生命周期、头插尾插与按位删除、二级指针免特判改头、双指针反转、虚拟头节点取舍，附完整 slist 库、Linux 内核 list_head 与解释器符号表案例，通讯录、任务队列与 LRU 缓存三个实战场景。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/160-DoublePointerPointerArray'
  - 'c/200-DynamicMemoryManagement'
  - 'c/130-StructAndUnion'
  - 'c/170-FunctionPointerCallback'
  - 'c/595-CCapstoneProject'
prerequisites:
  - 'c/140-PointerDeep'
  - 'c/160-DoublePointerPointerArray'
  - 'c/200-DynamicMemoryManagement'
---

# C 链表与节点式数据结构

## 知识点地图

- **知识类别**：数据结构实现——用 `struct` + `malloc` + 指针亲手实现链表（linked list）这一**节点式**（node-based）数据结构，并把它推广到树、符号表等派生结构。
- **解决什么问题**：数组把「存储」和「寻址」焊死在一起——长度编译期定死、中间插入要整体搬家、删除留空洞。链表把每个元素装进独立分配的节点，用 `next` 指针串起来：插入删除只改两根指针，长度天然运行时可变。本篇讲清节点的生命周期、增删查反转的每一步内存变化，以及「为什么这些函数签名里到处是二级指针」。
- **什么时候用到**：
  - 元素个数运行时才知道，且中间要频繁插删（任务队列、撤销栈、LRU 缓存）；
  - 阅读内核与大型 C 项目（Linux 的 `list_head`、各种解释器的 AST）——链表是 C 世界出现频率最高的手写数据结构；
  - 学习更复杂结构的垫脚石：树、哈希桶、图邻接表全是「节点 + 指针」的变奏。
- **与相邻篇目的分工**：二级指针的语法、内存模型、陷阱与调试在 [二级指针与指针数组](/c/160-DoublePointerPointerArray)，本篇直接使用不重复推导；malloc/free 的纪律与堆事故现场在 [动态内存](/c/200-DynamicMemoryManagement) 与 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)；本篇把函数指针用回调的形态（`cmp`、`foreach`）用起来，语法细节见 [函数指针与回调](/c/170-FunctionPointerCallback)。

## 学习目标

- 掌握「1. 问题引入与节点生命周期」的核心机制、典型用法与常见陷阱
- 掌握「2. 头插、尾插与按位删除」的核心机制、典型用法与常见陷阱
- 掌握「3. 二级指针免特判改头」与「4. 反转」的核心机制、典型用法与常见陷阱
- 掌握「5. 虚拟头节点取舍」与「6. 完整 slist 库」的核心机制、典型用法与常见陷阱
- 掌握「7. Linux 内核 list_head」「8. N 叉树」「9. 解释器符号表」三个工程案例的核心机制
- 能独立完成通讯录、任务队列、LRU 缓存雏形三个场景实现

## 1. 问题引入：数组做不到的事，链表怎么做到

一个真实的场景：写一个通讯录，联系人个数未知，要支持「随时在任意位置插入、按名字删除」。用数组会遇到三堵墙：

1. **长度编译期定死**——`Contact contacts[100]` 写死了上限，第 101 个联系人进来就得改代码重编；
2. **中间插入要整体搬家**——在位置 2 插入一个人，位置 2 之后的所有人都要后移一格，O(n)；
3. **删除留空洞**——把中间一人抹掉，要么整体前移（又是 O(n)），要么留一个「空位」让后续逻辑处处判断。

链表的解法是把每个元素升级成**节点**：

```c
struct Node {
    int val;             /* 数据域：这里以 int 演示，换成 struct Contact 同理 */
    struct Node *next;   /* 指针域：指向下一个节点；最后一个节点指向 NULL */
};
```

节点散落在堆上，靠 `next` 指针手拉手。插入与删除只需要**改两根指针**，数据一个字节都不用搬：

```mermaid
flowchart LR
    H["head"] --> N1["节点1: val=1 next]"]
    N1 --> N2["节点2: val=2 next]"]
    N2 --> N3["节点3: val=3 next=NULL"]
```

先动手跑通第一个链表程序（内容承接自 [二级指针与指针数组](/c/160-DoublePointerPointerArray) 的模式二），感受「为什么头指针参数是二级的」：

```c
/* first_list.c：最小的链表演示 */
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int val;
    struct Node *next;
} Node;

/* 头插法：O(1) */
void list_push_front(Node **head, int val) {
    Node *node = malloc(sizeof(Node));
    if (!node) return;
    node->val = val;
    node->next = *head;     /* 新节点指向原头节点 */
    *head = node;            /* 头指针指向新节点 */
}

/* 遍历打印 */
void list_print(Node *head) {
    while (head) {
        printf("%d -> ", head->val);
        head = head->next;
    }
    printf("NULL\n");
}

/* 释放整个链表，并将头指针置 NULL */
void list_free(Node **head) {
    Node *cur = *head;
    while (cur) {
        Node *next = cur->next;
        free(cur);
        cur = next;
    }
    *head = NULL;            /* 避免悬垂指针 */
}

int main(void) {
    Node *head = NULL;
    list_push_front(&head, 3);
    list_push_front(&head, 2);
    list_push_front(&head, 1);
    list_print(head);        /* 1 -> 2 -> 3 -> NULL */
    list_free(&head);
    return 0;
}
```

逐段拆解关键代码：

- `typedef struct Node { int val; struct Node *next; } Node;`——节点内部要存「同类型指针」，所以 `next` 必须写全称 `struct Node *`：此刻 `typedef` 名字 `Node` 还没生效，这是新手第一个编译错误来源。若写成 `Node *next` 会报「unknown type name」。
- `list_push_front(Node **head, ...)`——为什么不是 `Node *head`？C 是值传递：函数收到的是头指针的**副本**，改副本动不了调用方的 `head`。要修改一个 `Node *` 变量，参数就得是它的地址 `Node **`。这与 [指针：地址、解引用与指针算术](/c/140-PointerDeep) 里「swap 必须 `int *`」是同一条规则的升级版：要修改类型 T 的变量，参数类型必须是 `T *`。
- `list_free` 里 `Node *next = cur->next;` 在 `free(cur)` **之前**先存好下一跳——`free` 之后 `cur->next` 就是 use-after-free，读不得。顺序反了是链表代码最经典的崩溃。
- `*head = NULL;` 收尾置空：调用方的 `head` 不会变成悬空指针，误用会立刻崩在案发现场而不是悄悄踩内存。

## 2. 节点的 malloc 生命周期：每一次 malloc 都对应一次 free

节点的生老病死四步，每一步都有对应的错误形态：

```c
Node *n = malloc(sizeof(Node));   /* 生：堆上拿到一块节点大小的内存 */
if (!n) { /* 要不到内存：检查！ */ }
n->val = 42;                      /* 用：填充数据域与指针域 */
n->next = NULL;
/* ... 挂进链表，被引用 ... */
Node *victim = ...;               /* 判：先把它从链上摘下来（改前驱的 next） */
free(victim);                     /* 死：内存归还分配器 */
victim = NULL;                    /* 防悬垂：指针置空 */
```

三个必守纪律：

1. **`malloc(sizeof(Node))` 而不是 `malloc(sizeof(struct Node *))`**——前者是节点大小（数据 + 指针），后者只是指针大小，分配太小后面全是越界写。惯用保险写法 `malloc(sizeof *n)`：类型换了这行也不用改，且永不写错。
2. **判 NULL 再用**——`malloc` 失败返回 NULL，直接 `n->val = 42` 是解引用空指针（事故现场见 [指针：地址、解引用与指针算术](/c/140-PointerDeep) 第 8 节）。
3. **先摘链再 free**——`free` 一个还挂在链上的节点，它的邻居指针随之作废，后续遍历就是 use-after-free。删除操作的「摘链」与「释放」是两个动作，别合并。

用 ASan 跑一遍故意写错的版本，亲眼看到 use-after-free 的报告（工具用法详见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 第 6 章）：

```c
/* 故意先 free 再摘链的错误示范，编译：gcc -g -fsanitize=address */
free(cur);
cur->next = NULL;   /* heap-use-after-free */
```

## 3. 头插、尾插与按位删除

### 3.1 头插与尾插

```c
/* 头插：新节点成为第一个，O(1) —— 见第 1 节 list_push_front */

/* 尾插：新节点成为最后一个，O(n) */
void list_push_back(Node **head, int val) {
    Node *node = malloc(sizeof(Node));
    if (!node) return;
    node->val = val;
    node->next = NULL;

    if (*head == NULL) {          /* 空链表：新节点就是头 */
        *head = node;
        return;
    }
    Node *cur = *head;            /* 否则走到最后一个节点 */
    while (cur->next) cur = cur->next;
    cur->next = node;
}
```

易错点在空链表分支：`while (cur->next)` 在 `head == NULL` 时直接解引用空指针，必须先特判。下一节会看到二级指针游走如何把这个特判也消掉。

### 3.2 按值删除：传统写法要特判头节点

```c
/* 传统写法：需要特判头节点 */
void list_remove_traditional(Node **head, int val) {
    Node *cur = *head, *prev = NULL;
    while (cur && cur->val != val) {
        prev = cur;
        cur = cur->next;
    }
    if (!cur) return;               /* 未找到 */
    if (prev) prev->next = cur->next;
    else      *head = cur->next;    /* 特判：删除头节点 */
    free(cur);
}
```

为什么头节点要特判：删除中间节点时改的是**前驱的 `next`**，而头节点没有前驱，能接住它的只有 `head` 变量本身。传统写法为此付出了 4 个分支（未找到 / 删头 / 删中间 / 删尾）——每个分支都是一个测试死角。

### 3.3 二级指针游走：Linus 风格，免特判改头

```c
/* 删除链表中第一个值为 val 的节点：无需特判头节点 */
void list_remove(Node **head, int val) {
    Node **indirect = head;
    while (*indirect && (*indirect)->val != val) {
        indirect = &(*indirect)->next;
    }
    if (*indirect) {
        Node *to_delete = *indirect;
        *indirect = to_delete->next;   /* 统一处理头节点和中间节点 */
        free(to_delete);
    }
}
```

原理分析：`indirect` 始终指向「指向当前节点的那个指针」。

- 初始时 `indirect = head`，即指向头指针变量本身；
- 若目标就是头节点，`*indirect` 是 `head`，赋值 `*indirect = to_delete->next` 改写的是**调用方的 `head`**；
- 若目标在中间，推进 `indirect = &(*indirect)->next` 后，`*indirect` 是前驱的 `next` 成员，同一行赋值改写的是**前驱的 next**。

头节点与中间节点从此走同一条代码路径：2 个分支替代 4 个。Linus Torvalds 在 2016 年的一次访谈中说，判断一个人是否真正理解指针，就看会不会用这个「二级指针游走」（pointer-to-pointer traversal）技巧——它在 Linux 内核 `include/linux/list.h`、SQLite、Redis 等大型项目中被广泛采用。

换写法会发生什么：有人会想「给链表加一个永久哨兵头节点是不是一样省事」——可以，但哨兵要占一个节点的内存、`slist` 对外要隐藏它、遍历要从 `head->next` 开始，每一条都是额外约定。二级指针方案零成本拿到同样效果，代价只是多想一层间接。

## 4. 链表反转：双指针法

使用二级指针改头，反转无需特判：

```c
void list_reverse(Node **head) {
    Node *prev = NULL;
    Node *cur = *head;
    while (cur) {
        Node *next = cur->next;   /* 先存下一跳：反转后 cur->next 要改指向 */
        cur->next = prev;         /* 掉头：当前节点指回前驱 */
        prev = cur;               /* prev 前移 */
        cur = next;               /* cur 前移 */
    }
    *head = prev;                 /* 循环结束时 prev 正是原尾节点，即新头 */
}
```

逐行解释：

- 三指针 `prev`/`cur`/`next` 各司其职：`next` 是「先摘后改」纪律的体现——不先存下来，`cur->next = prev` 一执行，原链的后半段就断了；
- `cur->next = prev` 是唯一「修改链」的语句，其余都是移动游标；
- 收尾 `*head = prev`：`cur` 已是 NULL，`prev` 停在原尾节点——新链的头。空链表（`*head == NULL`）与单节点都自然成立，无需特判，可以各跑一遍验证。

每步内存变化（以 `1 -> 2 -> 3` 为例）：

```text
初始:      prev=NULL  cur=1 -> 2 -> 3
第1轮后:   NULL <- 1  cur=2 -> 3        (prev=1)
第2轮后:   NULL <- 1 <- 2  cur=3        (prev=2)
第3轮后:   NULL <- 1 <- 2 <- 3  cur=NULL (prev=3)
收尾:      head = 3
```

## 5. 虚拟头节点（dummy head）取舍

除了二级指针，工程里还有一种消除特判的手段——在链表最前面挂一个**永不存数据**的哨兵节点：

```c
/* 带哨兵的插入：所有位置统一处理 */
void slist_insert_after_head(SList *list, void *data) {
    SListNode *node = malloc(sizeof(SListNode));
    node->data = data;
    node->next = list->head->next;
    list->head->next = node;    /* 空表与非空表走同一行代码 */
}
```

两种方案对照：

| 维度 | 二级指针游走 | 虚拟头节点 |
|------|--------------|------------|
| 额外内存 | 无 | 每链一个节点 |
| 遍历起点 | `head` 即首个真实节点 | 要从 `head->next` 开始，易忘 |
| 函数签名 | `Node **` 到处出现 | `SList *` 一个句柄，更整洁 |
| 删除/反转 | 一套代码通吃 | 同样省特判，但哨兵不可删 |
| 典型使用者 | Linux 内核 | 多数教科书、Java LinkedList |

选择建议：**对外 API 追求整洁、结构长期存在（如线程安全的队列）用哨兵；追求零开销、代码短小的工具函数用二级指针**。两者都值得会，读别人代码时能认出对方是哪一派。

## 6. 完整链表库：slist

下面是一个综合运用本文所有知识点的单链表库实现——接口头 + 实现 + 使用示例三文件形态，与 [C 毕业项目](/c/595-CCapstoneProject) 要求的交付形态一致：

```c
/* slist.h - 单链表库头文件 */
#ifndef SLIST_H
#define SLIST_H

#include <stddef.h>

typedef struct SListNode {
    void *data;                     /* 泛型数据指针 */
    struct SListNode *next;
} SListNode;

typedef struct SList {
    SListNode *head;
    size_t size;
} SList;

/* 创建空链表 */
SList *slist_create(void);

/* 销毁链表，释放所有节点与数据（data_destructor 可为 NULL） */
void slist_free(SList **list, void (*data_destructor)(void *));

/* 头插法，O(1) */
int slist_push_front(SList *list, void *data);

/* 尾插法，O(n) */
int slist_push_back(SList *list, void *data);

/* 删除第一个匹配的节点（用 cmp 返回 0 表示匹配） */
int slist_remove(SList *list, const void *target, int (*cmp)(const void *, const void *));

/* 查找 */
void *slist_find(const SList *list, const void *target, int (*cmp)(const void *, const void *));

/* 反转 */
void slist_reverse(SList *list);

/* 遍历 */
void slist_foreach(const SList *list, void (*fn)(void *data, void *ctx), void *ctx);

/* 大小 */
size_t slist_size(const SList *list);

#endif /* SLIST_H */
```

```c
/* slist.c - 单链表库实现 */
#include "slist.h"
#include <stdlib.h>

SList *slist_create(void) {
    SList *list = malloc(sizeof(SList));
    if (!list) return NULL;
    list->head = NULL;
    list->size = 0;
    return list;
}

void slist_free(SList **list_ptr, void (*dtor)(void *)) {
    if (!list_ptr || !*list_ptr) return;
    SListNode *cur = (*list_ptr)->head;
    while (cur) {
        SListNode *next = cur->next;
        if (dtor) dtor(cur->data);
        free(cur);
        cur = next;
    }
    free(*list_ptr);
    *list_ptr = NULL;               /* 二级指针置空 */
}

int slist_push_front(SList *list, void *data) {
    if (!list) return -1;
    SListNode *node = malloc(sizeof(SListNode));
    if (!node) return -1;
    node->data = data;
    node->next = list->head;
    list->head = node;
    list->size++;
    return 0;
}

int slist_push_back(SList *list, void *data) {
    if (!list) return -1;
    SListNode *node = malloc(sizeof(SListNode));
    if (!node) return -1;
    node->data = data;
    node->next = NULL;
    if (!list->head) {
        list->head = node;
    } else {
        SListNode *cur = list->head;
        while (cur->next) cur = cur->next;
        cur->next = node;
    }
    list->size++;
    return 0;
}

int slist_remove(SList *list, const void *target, int (*cmp)(const void *, const void *)) {
    if (!list || !cmp) return -1;
    SListNode **indirect = &list->head;
    while (*indirect) {
        if (cmp((*indirect)->data, target) == 0) {
            SListNode *to_delete = *indirect;
            *indirect = to_delete->next;
            free(to_delete);
            list->size--;
            return 0;
        }
        indirect = &(*indirect)->next;
    }
    return -1;   /* 未找到 */
}

void *slist_find(const SList *list, const void *target, int (*cmp)(const void *, const void *)) {
    if (!list || !cmp) return NULL;
    SListNode *cur = list->head;
    while (cur) {
        if (cmp(cur->data, target) == 0) return cur->data;
        cur = cur->next;
    }
    return NULL;
}

void slist_reverse(SList *list) {
    if (!list) return;
    SListNode *prev = NULL, *cur = list->head;
    while (cur) {
        SListNode *next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    list->head = prev;
}

void slist_foreach(const SList *list, void (*fn)(void *, void *), void *ctx) {
    if (!list || !fn) return;
    SListNode *cur = list->head;
    while (cur) {
        fn(cur->data, ctx);
        cur = cur->next;
    }
}

size_t slist_size(const SList *list) {
    return list ? list->size : 0;
}
```

```c
/* main.c - 使用示例 */
#include "slist.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;
}

static void print_int(void *data, void *ctx) {
    (void)ctx;
    printf("%d -> ", *(int *)data);
}

int main(void) {
    SList *list = slist_create();
    if (!list) {
        fprintf(stderr, "create failed\n");
        return 1;
    }

    int values[] = {1, 2, 3, 4, 5};
    for (int i = 0; i < 5; i++) {
        slist_push_back(list, &values[i]);
    }

    printf("Initial: ");
    slist_foreach(list, print_int, NULL);
    printf("NULL\n");

    slist_push_front(list, &values[0]);
    printf("After push_front(1): ");
    slist_foreach(list, print_int, NULL);
    printf("NULL\n");

    int target = 3;
    slist_remove(list, &target, cmp_int);
    printf("After remove(3): ");
    slist_foreach(list, print_int, NULL);
    printf("NULL\n");

    slist_reverse(list);
    printf("After reverse: ");
    slist_foreach(list, print_int, NULL);
    printf("NULL\n");

    printf("Size: %zu\n", slist_size(list));

    slist_free(&list, NULL);   /* list 自动置 NULL */
    return 0;
}
```

设计要点逐条讲：

- **`void *data` 泛型化**——库里不关心元素类型，类型知识留在调用方（`cmp_int`、`print_int` 里强转回来）。代价是丢掉类型检查、多一层间接；换来的是一份实现服务所有类型。另一条路是宏生成代码（类型安全的代价是编译期展开），`khash.h` 等头文件库走这条路。
- **`slist_remove` 用二级指针游走**（第 3.3 节同款）——注意它操作的是 `&list->head`，即「句柄内部头指针」的地址，签名保持 `SList *` 整洁的同时拿到了免特判。
- **`slist_free(SList **list, ...)` 接收析构回调**——若 `data` 是 `malloc` 出来的，仅 free 节点会泄漏数据；调用方传入匹配的 `dtor` 才能一条链清干净。`NULL` 表示数据是栈上/静态的、无需释放。
- **返回 `int` 错误码而不是指针**——分配失败要能区分「失败」与「成功但空」，纯返回值做不到，这是 C 接口设计惯例（见 [二级指针与指针数组](/c/160-DoublePointerPointerArray) 模式一）。

## 7. 工程案例：Linux 内核 list_head

Linux 内核的 `struct list_head` 是双向链表的经典实现，采用**侵入式**（intrusive）设计——链表节点嵌进数据结构里，而不是数据装进链表节点：

```c
/* include/linux/list.h（简化版） */
struct list_head {
    struct list_head *next, *prev;
};

#define LIST_HEAD_INIT(name) { &(name), &(name) }
#define LIST_HEAD(name) \
    struct list_head name = LIST_HEAD_INIT(name)

static inline void INIT_LIST_HEAD(struct list_head *list) {
    list->next = list;
    list->prev = list;
}

/* 在 head 后插入 new 节点 */
static inline void list_add(struct list_head *new, struct list_head *head) {
    new->next = head->next;
    new->prev = head;
    head->next->prev = new;
    head->next = new;
}

/* 删除 entry */
static inline void list_del(struct list_head *entry) {
    entry->next->prev = entry->prev;
    entry->prev->next = entry->next;
    entry->next = NULL;
    entry->prev = NULL;
}

/* 通过成员指针获取包含结构体指针 */
#define container_of(ptr, type, member) \
    ((type *)((char *)(ptr) - offsetof(type, member)))

#define list_entry(ptr, type, member) \
    container_of(ptr, type, member)
```

使用方式：

```c
struct task {
    int id;
    struct list_head list;   /* 侵入式链表节点 */
};

struct task task1 = { .id = 1 };
struct task task2 = { .id = 2 };

LIST_HEAD(task_list);
list_add(&task1.list, &task_list);
list_add(&task2.list, &task_list);

/* 遍历 */
struct list_head *pos;
list_for_each(pos, &task_list) {
    struct task *t = list_entry(pos, struct task, list);
    printf("task id = %d\n", t->id);
}
```

为什么内核选侵入式而不是 `void *data`：一个 `task` 可以同时挂在多条链上（就绪队列一条、定时器一条），每条链只需在结构体里多嵌一个 `list_head` 成员；且节点分配与业务对象分配合一，没有二次 malloc。`container_of` 宏是它的钥匙——已知成员 `list` 的地址与它在结构体里的偏移 `offsetof`，减一下就得到宿主结构体的地址。这层「从成员反推容器」的指针算术，物理基础是 [结构体与联合体](/c/130-StructAndUnion) 讲的成员布局。

## 8. 节点式结构推广：N 叉树

链表的「节点 + 指针」思路稍加变形就是树。N 叉树常用「子节点 + 兄弟节点」表示（left-child right-sibling）：

```c
typedef struct TreeNode {
    int val;
    struct TreeNode *first_child;   /* 第一个子节点 */
    struct TreeNode *next_sibling;  /* 下一个兄弟节点 */
} TreeNode;

/* 在树中查找值为 target 的节点，返回指向"指向该节点的指针"的指针 */
TreeNode **tree_find(TreeNode **root, int target) {
    TreeNode **indirect = root;
    while (*indirect) {
        if ((*indirect)->val == target) return indirect;
        /* 先在子节点中找 */
        TreeNode **child = tree_find(&(*indirect)->first_child, target);
        if (*child) return child;
        /* 再在兄弟节点中找 */
        indirect = &(*indirect)->next_sibling;
    }
    return root;   /* 未找到，返回空位置 */
}
```

返回「指向指针的指针」是这个设计的精妙处：拿到的不是节点，而是**挂载点**——往 `*child` 写入新节点就完成了插入，找到的位置天然可写。同样的思路用在哈希表的桶数组上：桶里存的就是「指向第一个节点的指针」。

## 9. 解释器与 AST：符号表里的指针数组

C 语言编写的解释器（如 Lua、Python 早期版本）广泛使用节点式结构组织作用域与符号：

```c
typedef struct Symbol {
    char *name;
    int type;
} Symbol;

typedef struct Scope {
    Symbol **symbols;       /* 指针数组：当前作用域的符号 */
    int count;
    int capacity;
    struct Scope *parent;
} Scope;

/* 在作用域中查找符号 */
Symbol *scope_lookup(Scope *scope, const char *name) {
    while (scope) {
        for (int i = 0; i < scope->count; i++) {
            if (strcmp(scope->symbols[i]->name, name) == 0) {
                return scope->symbols[i];
            }
        }
        scope = scope->parent;
    }
    return NULL;
}
```

`Scope` 用 `parent` 指针串成「作用域链」——本质是一条链表；`symbols` 是 `Symbol **` 指针数组，装当前作用域的符号。查找沿链表向外层爬，逐层扫描数组：这就是块级作用域变量解析的原始形态。生产解释器会把数组换成哈希表，但链式作用域的骨架不变。

## 10. 三个实战场景

### 场景一：通讯录增删查

把 `int` 数据域换成业务结构体，链表立刻投入生产：

```c
/* contacts.c：通讯录——链表版增删查 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Contact {
    char name[32];
    char phone[16];
    struct Contact *next;
} Contact;

/* 按姓名插入到表头（新的联系人排最前） */
Contact **contact_find_slot(Contact **head, const char *name) {
    Contact **indirect = head;
    while (*indirect && strcmp((*indirect)->name, name) != 0)
        indirect = &(*indirect)->next;
    return indirect;           /* 命中返回节点挂载点，未命中返回表尾空位 */
}

int contact_add(Contact **head, const char *name, const char *phone) {
    Contact **slot = contact_find_slot(head, name);
    if (*slot) return -1;                      /* 同名已存在 */
    Contact *c = malloc(sizeof(Contact));
    if (!c) return -1;
    snprintf(c->name, sizeof c->name, "%s", name);   /* snprintf 截断保安全 */
    snprintf(c->phone, sizeof c->phone, "%s", phone);
    c->next = *slot;
    *slot = c;                                  /* 挂载点写入即插入 */
    return 0;
}

int contact_remove(Contact **head, const char *name) {
    Contact **slot = contact_find_slot(head, name);
    if (!*slot) return -1;
    Contact *victim = *slot;
    *slot = victim->next;
    free(victim);
    return 0;
}

const char *contact_phone(Contact **head, const char *name) {
    Contact **slot = contact_find_slot(head, name);
    return *slot ? (*slot)->phone : NULL;
}

int main(void) {
    Contact *book = NULL;
    contact_add(&book, "张三", "13800000001");
    contact_add(&book, "李四", "13800000002");
    contact_add(&book, "王五", "13800000003");

    const char *p = contact_phone(&book, "李四");
    printf("李四: %s\n", p ? p : "(未找到)");

    contact_remove(&book, "张三");
    printf("张三: %s\n", contact_phone(&book, "张三") ? "还在" : "已删除");

    while (book) {                 /* 清场：逐个摘链释放 */
        Contact *next = book->next;
        free(book);
        book = next;
    }
    return 0;
}
```

讲解：三个操作共用一个 `contact_find_slot`——返回挂载点而非节点本身，「查」返回 `*slot`，「删」在挂载点摘链，「增」往空挂载点写入。一份遍历逻辑服务三种操作，正是二级指针游走的工程红利。

### 场景二：任务队列

头插尾取（或尾插头取）就是队列：

```c
/* taskq.c：打印任务队列——尾插头取 */
typedef struct Task { int job_id; struct Task *next; } Task;

static Task *q_head = NULL, *q_tail = NULL;

void taskq_push(int id) {
    Task *t = malloc(sizeof(Task));
    if (!t) return;
    t->job_id = id;
    t->next = NULL;
    if (q_tail) q_tail->next = t;    /* 挂到队尾 */
    else        q_head = t;          /* 空队列：头尾都是它 */
    q_tail = t;
}

int taskq_pop(void) {                 /* 返回 job_id，队列空返回 -1 */
    if (!q_head) return -1;
    Task *t = q_head;
    int id = t->job_id;
    q_head = t->next;
    if (!q_head) q_tail = NULL;       /* 取空了：tail 也要复位，否则悬空 */
    free(t);
    return id;
}
```

易错点：`taskq_pop` 取出最后一个节点后必须把 `q_tail` 也置 NULL——否则 `q_tail` 悬空指向已 free 的节点，下一次 `taskq_push` 执行 `q_tail->next = t` 就是 use-after-free。维护头尾双指针的队列，每处修改都要同步两者，这是链表实现队列的头号 bug 源。

### 场景三：LRU 缓存雏形

LRU（最近最少使用）淘汰「最久没被访问」的条目。用链表维护访问顺序：头部是最新，尾部是最旧；命中就摘下搬到头部，超容量删尾部：

```c
/* lru.c：容量为 CAP 的 int->int LRU 缓存雏形 */
#define CAP 3

typedef struct Entry {
    int key, value;
    struct Entry *prev, *next;      /* 双向：O(1) 摘除任意节点 */
} Entry;

static Entry *lru_head = NULL, *lru_tail = NULL;
static int lru_len = 0;

static void detach(Entry *e) {                  /* 从链上摘下（不动内存） */
    if (e->prev) e->prev->next = e->next; else lru_head = e->next;
    if (e->next) e->next->prev = e->prev; else lru_tail = e->prev;
    e->prev = e->next = NULL;
}

static void push_front(Entry *e) {              /* 头部插入（标记为最新） */
    e->next = lru_head; e->prev = NULL;
    if (lru_head) lru_head->prev = e; else lru_tail = e;
    lru_head = e;
    lru_len++;
}

static void evict_tail(void) {                  /* 淘汰最旧（尾部） */
    Entry *old = lru_tail;
    detach(old);
    lru_len--;
    free(old);
}

int lru_get(int key, int *out) {                /* 命中返回 1 并搬到头部 */
    for (Entry *e = lru_head; e; e = e->next) {
        if (e->key == key) {
            detach(e); lru_len--; push_front(e);
            *out = e->value;
            return 1;
        }
    }
    return 0;
}

void lru_put(int key, int value) {
    for (Entry *e = lru_head; e; e = e->next) {  /* 已存在则更新并前移 */
        if (e->key == key) {
            e->value = value;
            detach(e); lru_len--; push_front(e);
            return;
        }
    }
    if (lru_len == CAP) evict_tail();            /* 满了先淘汰最旧 */
    Entry *e = malloc(sizeof(Entry));
    if (!e) return;
    e->key = key; e->value = value;
    push_front(e);
}
```

讲解：这里被迫用了**双向链表**——单向链表摘除一个节点要先找前驱（O(n)），双向节点自带 `prev` 才配得上 LRU 的 O(1) 承诺。生产实现（如 Redis）会在链表外再配一张哈希表把 `lru_get` 的 O(n) 扫描也降为 O(1)，链表只负责「顺序」，这正是本篇雏形与工业实现的差距所在。

## 11. free 纪律与内存安全清单

1. **先存 `next` 再 `free`**——free 之后原节点的任何成员都不可读；
2. **摘链与释放是两个动作**——删除 = 改前驱指针 + free 节点，顺序不能乱；
3. **销毁函数收二级指针并置空**——`slist_free(&list, dtor)` 之后调用方的 `list` 保证为 NULL；
4. **双向链表删节点要同时维护邻居的 prev/next**——漏一侧就留下悬空指针；
5. **头尾双指针结构，两端状态同步改**——队列取空复位 tail，是高频翻车点；
6. **数据域的所有权要写进接口文档**——`slist` 的 `data` 归调用方管，配 `dtor` 参数的就是库代管；含糊的所有权 = 泄漏或 double free；
7. **开发期全程挂 ASan**——`gcc -g -fsanitize=address`，链表类错误（use-after-free、泄漏）它能当场点名（用法见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)）。

## 12. 动手实践

### 练习一：给 slist 补「按位置取元素」

任务：实现 `void *slist_get(const SList *list, size_t index);`，越界返回 NULL。
提示：从 `head` 出发走 `index` 步；每走一步前先判 `cur != NULL`——把「判空」写进循环条件而不是循环体，`index` 用 `size_t` 就不会遇到负数。

参考实现（先自己写，写完再对照）：

```c
void *slist_get(const SList *list, size_t index) {
    if (!list) return NULL;
    const SListNode *cur = list->head;
    while (cur && index > 0) { cur = cur->next; index--; }
    return cur ? cur->data : NULL;
}
```

### 练习二：递归反转 对比 迭代反转

任务：写出链表反转的递归版本，与第 4 节迭代版对照，说明各自栈/内存开销。
提示：递归基准是 `head == NULL || head->next == NULL`；反转后原头节点要接到新尾部。

参考实现（先自己写，写完再对照）：

```c
Node *list_reverse_rec(Node *head) {
    if (!head || !head->next) return head;
    Node *new_head = list_reverse_rec(head->next);
    head->next->next = head;    /* 后继回指自己 */
    head->next = NULL;          /* 自己成为新尾部 */
    return new_head;
}
```

长链表上递归版每节点一层栈帧，O(n) 栈深有溢出风险（栈帧细节见 [函数调用栈帧](/c/250-FunctionCallStackFrame)）；迭代版 O(1) 空间，工程首选。

### 练习三（工程场景）：给链表库写自写断言测试

任务：仿照 [C 毕业项目](/c/595-CCapstoneProject) 的自写断言风格，为第 6 节 slist 写 `test_slist.c`：至少覆盖「空表 remove/find 返回失败、头节点删除不特判也正确、reverse 后 size 不变、free 后指针为 NULL」四条断言，用 `make test` 一键跑。
提示：断言行为本身而不是「没崩」——`assert(list == NULL)` 检查 free 的置空承诺；每条断言前用注释写清「验证什么契约」。

参考实现（先自己写，写完再对照）：

```c
/* test_slist.c（节选）：与 595 相同的 assert 风格 */
#include <assert.h>
#include "slist.h"

static int cmp_int(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;
}

static void check_seq(void *data, void *ctx) {
    int *cursor = ctx;
    int expect[3] = {2, 3, -1};      /* 删头后应剩 2、3 */
    assert(*(int *)data == expect[(*cursor)++]);  /* 逐节点验证内容契约 */
}

void test_remove_head_without_special_case(void) {
    SList *l = slist_create();
    int v[] = {1, 2, 3};
    slist_push_back(l, &v[0]); slist_push_back(l, &v[1]); slist_push_back(l, &v[2]);
    assert(slist_remove(l, &v[0], cmp_int) == 0);   /* 删头节点 */
    int i = 0;
    slist_foreach(l, check_seq, &i);
    assert(i == 2);                                  /* 恰好遍历两个节点 */
    assert(slist_size(l) == 2);
    slist_free(&l, NULL);
    assert(l == NULL);                               /* 置空契约 */
}
```

验收：`gcc -Wall -Wextra -g -fsanitize=address slist.c test_slist.c -o test_slist && ./test_slist`，ASan 零报告、断言全过。

### 练习四（开放）：把 LRU 雏形升级

任务：给第 10 节的 LRU 加一个 `lru_hit_rate()` 统计命中率，并思考：把容量从 3 提到 100 万，哪一段代码先成为瓶颈？
提示：瓶颈不在链表操作，在 `lru_get`/`lru_put` 里的 O(n) 扫描——回忆第 9 节解释器案例，「链表管顺序、哈希管定位」的组合是怎么分工的。

参考思路（先自己想，再看）：计数器 `hits`/`misses` 两个静态变量即可算命中率；容量放大后把扫描换成哈希表定位（开放寻址哈希表的手写练习正是 [C 毕业项目](/c/595-CCapstoneProject) 的后半场）。

## 13. 实际项目中的使用场景

- **内核与驱动**：Linux 内核的进程、文件、设备几乎全挂在各种侵入式 `list_head` 链上（第 7 节）；
- **解释器与编译器**：符号表、AST 节点、常量池，Lua 与 CPython 的对象链（第 9 节）；
- **中间件**：Redis 的过期键字典附带 LRU 链、内存分配器的空闲块链表；
- **应用层**：消息队列、撤销/重做栈、播放列表——「顺序会变、长度未知」的地方都是链表主场。

## 14. 与之前和之后的知识的关系

- 往前：[指针：地址、解引用与指针算术](/c/140-PointerDeep) 的解引用与 NULL 是读链表的前提；[二级指针与指针数组](/c/160-DoublePointerPointerArray) 的输出参数与类型规则解释了本篇所有 `Node **` 签名；[动态内存](/c/200-DynamicMemoryManagement) 的 malloc/free 四件套是节点的生老病死；
- 旁支：[函数指针与回调](/c/170-FunctionPointerCallback) 解释 `cmp`/`foreach` 回调的语法；[结构体与联合体](/c/130-StructAndUnion) 的成员布局是 `container_of` 的物理基础；
- 往后：[C 毕业项目](/c/595-CCapstoneProject) 要求你亲手交付带自写断言测试的 vector 与哈希表——链表是它们的最小先行版。

## 15. 官方文档

- GNU Coreutils/内核侧参考：Linux kernel `include/linux/list.h`（GPL-2.0，可阅读源码）：https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/list.h
- 链表数据结构条目（cppreference 无链表页，Wikipedia Linked list 供概念对照）：https://en.wikipedia.org/wiki/Linked_list
- glibc malloc 手册（节点分配行为）：https://www.gnu.org/software/libc/manual/html_node/Malloc-Examples.html

## 16. 自我检查

- 能画出「头插三个节点」每一步的内存图，并解释 `list_push_front` 的参数为什么必须是 `Node **`；
- 能用二级指针游走写出免特判的按值删除，并说清 `indirect` 每一轮指向什么；
- 能对照传统写法与游走写法，数出两者的分支数量差，并解释为什么分支少 bug 就少；
- 能说出双向链表相对单向链表多出的成本，以及 LRU 为什么必须双向；
- 能列出 free 纪律清单中的全部七条，并解释「先存 next 再 free」违反时的 ASan 报告长什么样。

## 本章总结

链表把数组的「存储即寻址」拆开：节点散落堆上，`next` 指针串成序。头插 O(1)、尾插 O(n)（头尾双指针可到 O(1)）；删除的难点在「头节点没有前驱」，二级指针游走让 `indirect` 始终指向「指向当前节点的指针」，头与中间同一条代码路径，4 分支变 2 分支。反转靠 prev/cur/next 三指针逐节点掉头，收尾 `*head = prev`。哨兵头节点与二级指针是消除特判的两派，各有内存与整洁度的取舍。Linux 内核用侵入式 `list_head` 加 `container_of` 让一个对象挂多条链；解释器用「链式作用域 + 指针数组符号表」组织名字。free 纪律七条是底线：先存 next、摘链再释放、销毁收二级指针、双向两侧都要改、双指针两端同步、所有权写进文档、开发期挂 ASan。

## 参考与致谢

- 本文第 7 节 `list_head` 代码取自 Linux 内核源码 `include/linux/list.h` 的简化版（GPL-2.0 许可，来源：https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/list.h ），仅作教学引用；
- 第 9 节符号表示例的形态参考了公开教学材料中对 C 解释器作用域链的通行写法，由本文自行实现；
- 其余内容为原创教学文本。
