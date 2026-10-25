---
order: 620
title: C 语言项目实战：学生成绩管理系统
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用一个可运行的菜单式项目把前 20 篇串起来：动态数组、qsort 回调、二进制持久化与安全输入，并亲手修掉初版代码里的四个经典 bug——比较器里读输入、信任文件里的 count、fread 不查返回值、realloc 直接赋值。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'c/200-DynamicMemoryManagement'
  - 'c/170-FunctionPointerCallback'
  - 'c/430-StdioFileIO'
  - 'c/450-SafeFunctionBoundsCheck'
prerequisites:
  - 'c/170-FunctionPointerCallback'
  - 'c/430-StdioFileIO'
---

## 前置知识

- 已完成 [函数指针与回调](/c/170-FunctionPointerCallback)：用过 `qsort` 和比较函数，知道减法溢出陷阱；
- 已完成 [文件 I/O](/c/430-StdioFileIO)：写过 `fopen`/`fwrite`/`fclose` 的完整闭环；
- 见过 [动态内存](/c/200-DynamicMemoryManagement) 的 malloc/realloc/free 四件套与「free 后置 NULL」纪律。

> 这是一篇贯穿项目篇：把 [结构体与联合](/c/130-StructAndUnion)、[数组](/c/120-ArrayDetailed)、动态内存、回调、文件与安全输入全部拼进一个能跑的程序。单篇知识点这里不再展开，缺哪块点哪块链接。毕业设计级别的更高强度项目在 [毕业项目](/c/595-CCapstoneProject)。

## 学习目标

读完本文你将能够：

1. 从需求出发设计「结构体 + 动态数组」的数据模型，并说出不用链表的理由；
2. 独立写出增删查改、qsort 多策略排序、二进制持久化与 CSV 导出的完整菜单程序；
3. 识别并修复四个真实存在的项目级 bug：比较器内做输入、信任文件长度字段、忽略 fread 返回值、realloc 直接赋值；
4. 说清二进制存档文件的两大可移植性陷阱（结构体填充与字段类型宽度）；
5. 把单文件项目拆成多文件并用构建系统管理（挑战题）。

预计 60 到 90 分钟，含 1 个贯穿项目、4 个修复实验与 2 道练习。

## 1. 需求与最终效果

要做的系统一句话说清：管理学生成绩——增删改查、按总分或单科排序、分数段统计、存盘重开不丢数据、可导出 CSV 给 Excel。

运行起来长这样：

```text
========================================
   Student Grade Management System
========================================
1. Add Student        2. Search by ID
3. Search by Name     4. Modify Student
5. Delete Student     6. Sort Students
7. Statistics         8. Display All
9. Export CSV         0. Save & Exit
========================================
Choice: 1
Enter student ID: 2026001
Enter student name: Alice
  Enter Math score (0-100): 92
  ...
Student added successfully. Total: 445, Average: 89.00
```

功能清单里没有一项超出已学范围——这正是它的价值：把散装知识拼成工程。

## 2. 数据模型：结构体加动态数组

每个学生是一组异构数据：学号、姓名、五门成绩、总分、均分、排名——结构体的本职工作。学生人数运行时才知道上限，用动态数组而不是定长数组：

```c
#define MAX_ID_LEN    20
#define MAX_NAME_LEN  50
#define COURSE_NUM    5
#define DATA_FILE     "students.dat"

typedef struct {
    char id[MAX_ID_LEN];
    char name[MAX_NAME_LEN];
    int  scores[COURSE_NUM];
    int  total;
    double average;
    int  rank;
} Student;

typedef struct {
    Student *data;      /* 指向堆上的数组 */
    int count;          /* 实际人数 */
    int capacity;       /* 已分配容量 */
} StudentList;

static const char *course_names[COURSE_NUM] = {
    "Math", "English", "Physics", "Chemistry", "Computer"
};
```

为什么不用链表？增删改查加排序，全部是「按下标随机访问」友好的操作：排序在数组上是一个 `qsort`，在链表上要么 O(n log n) 搬数据、要么换归并；删除虽然是 O(n) 搬移，但人数在几百量级时这不是瓶颈。链表版留给扩展方向（第 11 节）。

## 3. 骨架：动态数组三件套

初始化、按需扩容、释放——200 篇的知识直接落地：

```c
void list_init(StudentList *list) {
    list->capacity = 50;
    list->count = 0;
    list->data = malloc(sizeof(Student) * (size_t)list->capacity);
    if (list->data == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }
}

void list_ensure_capacity(StudentList *list) {
    if (list->count < list->capacity) return;
    list->capacity *= 2;
    Student *grown = realloc(list->data, sizeof(Student) * (size_t)list->capacity);
    if (grown == NULL) {              /* 失败时旧块还在，list->data 仍有效 */
        fprintf(stderr, "Memory reallocation failed\n");
        return;
    }
    list->data = grown;
}

void list_free(StudentList *list) {
    free(list->data);
    list->data = NULL;
    list->count = list->capacity = 0;
}
```

注意扩容用的是临时指针 `grown` 接 `realloc` 返回值——失败时返回 NULL 且**旧内存完好**，直接 `list->data = realloc(list->data, ...)` 会把唯一知道旧地址的变量覆盖掉（210 篇的事故一）。这个函数式写法本篇后面还会被「违反」一次，见第 7 节的修复实验。

## 4. 输入：第一处要修的 bug

初版录入代码长这样：

```c
printf("Enter student ID: ");
scanf("%s", s->id);                   /* bug 1：无宽度的 %s */
```

`scanf("%s")` 不限制读入长度——用户（或重定向进来的文件）输入 100 个字符，`s->id` 那块 20 字节的数组立刻溢出。这正是 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck) 危险函数地图的第一行。修复：给每个转换说明符加宽度。

```c
if (scanf("%19s", s->id) != 1) {      /* 最多 19 字符 + '\0' */
    while (getchar() != '\n');        /* 清掉坏输入行 */
    return;
}
```

成绩录入要「非法输入打回重输」，把校验写成循环：

```c
int input_score(int course_index) {
    int score;
    for (;;) {
        printf("  Enter %s score (%d-100): ", course_names[course_index]);
        if (scanf("%d", &score) != 1) {
            while (getchar() != '\n');
            printf("  Invalid input, please enter a number.\n");
            continue;
        }
        if (score < 0 || score > 100) {
            printf("  Score out of range, please re-enter.\n");
            continue;
        }
        return score;
    }
}
```

新增学生的完整流程：查重（学号唯一）、逐科录入、顺手算总分均分：

```c
int find_by_id(const StudentList *list, const char *id) {
    for (int i = 0; i < list->count; i++) {
        if (strcmp(list->data[i].id, id) == 0) return i;
    }
    return -1;
}

void add_student(StudentList *list) {
    list_ensure_capacity(list);
    Student *s = &list->data[list->count];

    printf("Enter student ID: ");
    if (scanf("%19s", s->id) != 1) return;
    if (find_by_id(list, s->id) != -1) {
        printf("Student ID already exists!\n");
        return;
    }

    printf("Enter student name: ");
    if (scanf("%49s", s->name) != 1) return;

    s->total = 0;
    for (int i = 0; i < COURSE_NUM; i++) {
        s->scores[i] = input_score(i);
        s->total += s->scores[i];
    }
    s->average = (double)s->total / COURSE_NUM;
    s->rank = 0;
    list->count++;
    printf("Student added. Total: %d, Average: %.2f\n", s->total, s->average);
}
```

查询与删除围绕 `find_by_id` 组装：按学号精确查、按姓名 `strstr` 模糊查；删除用「后续元素整体前移」保持顺序：

```c
void delete_student(StudentList *list, const char *id) {
    int idx = find_by_id(list, id);
    if (idx == -1) { printf("Student not found.\n"); return; }
    for (int i = idx; i < list->count - 1; i++) {
        list->data[i] = list->data[i + 1];   /* 结构体整体赋值：逐成员拷贝 */
    }
    list->count--;
}
```

结构体赋值是逐成员拷贝（含数组成员），一行完成搬移——130 篇的赋值语义在这里兑现。

## 5. 排序：第二处要修的 bug

按总分降序的 `qsort` 一气呵成（比较函数写法与减法溢出陷阱见 170 篇，总分上限 500 不会溢出，但习惯按规范写）：

```c
static int cmp_total_desc(const void *a, const void *b) {
    const Student *sa = a, *sb = b;
    return (sa->total > sb->total) - (sa->total < sb->total);
}
```

初版还提供「按单科排序」，但它把选课做进了比较函数里：

```c
/* bug 2：比较函数里 scanf */
int cmp_course_desc(const void *a, const void *b) {
    int course;
    printf("Select course: ");
    scanf("%d", &course);                 /* qsort 会调用它成千上万次！ */
    return ((Student *)b)->scores[course] - ((Student *)a)->scores[course];
}
```

这是对回调契约的根本违反：**比较函数必须是无副作用的纯函数**——`qsort` 不保证调用次数与顺序（n 个元素要调用 O(n log n) 次），把交互塞进去，程序会疯狂刷提示、数据被反复改写，排序结果也不可预期。170 篇的「类型必须精确匹配、只读不写」在这里变成了看得见的事故。

修复：把「选哪科」移到 `qsort` 之前，用每科一个比较函数（或者一个全局的当前科目变量配单个比较函数——后者牺牲了线程安全，本项目单线程可接受，但要注释说明）：

```c
static int g_course;   /* 单线程项目的务实写法：注释声明约定 */

static int cmp_course_desc(const void *a, const void *b) {
    const Student *sa = a, *sb = b;
    return (sa->scores[g_course] < sb->scores[g_course]) -
           (sa->scores[g_course] > sb->scores[g_course]);
}

void sort_students(StudentList *list) {
    /* 菜单选策略；选单科时先读 g_course，再进 qsort */
    qsort(list->data, (size_t)list->count, sizeof(Student), cmp_total_desc);
    for (int i = 0; i < list->count; i++) {
        list->data[i].rank = i + 1;       /* 排完顺手写排名 */
    }
}
```

## 6. 持久化：第三、四处要修的 bug

二进制存档的思路：先写人数，再写整个数组。

```c
void save_to_file(const StudentList *list) {
    FILE *fp = fopen(DATA_FILE, "wb");
    if (fp == NULL) { perror("save"); return; }
    fwrite(&list->count, sizeof(int), 1, fp);
    fwrite(list->data, sizeof(Student), (size_t)list->count, fp);
    fclose(fp);
}
```

读档的初版代码藏着两个洞：

```c
/* bug 3 与 bug 4：读档不设防 */
void load_from_file(StudentList *list) {
    FILE *fp = fopen(DATA_FILE, "rb");
    if (fp == NULL) return;
    fread(&list->count, sizeof(int), 1, fp);          /* bug 3：返回值不查 */
    if (list->count > list->capacity) {
        list->capacity = list->count * 2;
        list->data = realloc(list->data,              /* bug 4：直接赋值 */
                             sizeof(Student) * (size_t)list->capacity);
    }
    fread(list->data, sizeof(Student), (size_t)list->count, fp);
    fclose(fp);
}
```

**bug 3：文件里的 count 不可信。** 存档被截断、被改坏、或是别的程序写的——`count` 可能是 20 亿。拿着它去 `realloc` 和 `fread`，轻则分配失败，重则把磁盘上任意 20 亿字节读进内存。Heartbleed 的教训（信任外部长度字段）在本地文件上同样成立。修复：先验范围，`fread` 全部查返回值。

**bug 4：realloc 直接赋值。** 第 3 节刚立好「临时指针」的规矩，这里就犯了——失败时 `list->data` 变 NULL，原有数据（此时还没读档，但 `count` 已被污染）全部失控。

修复版：

```c
#define MAX_STUDENTS 100000

bool load_from_file(StudentList *list) {
    FILE *fp = fopen(DATA_FILE, "rb");
    if (fp == NULL) return true;              /* 没有存档：空库启动，不算错 */

    int saved_count = 0;
    if (fread(&saved_count, sizeof saved_count, 1, fp) != 1) {
        fprintf(stderr, "Corrupt data file (count)\n");
        fclose(fp);
        return false;                          /* bug 3 修复：查返回值 */
    }
    if (saved_count < 0 || saved_count > MAX_STUDENTS) {   /* 长度字段先验范围 */
        fprintf(stderr, "Unreasonable count %d in data file\n", saved_count);
        fclose(fp);
        return false;
    }

    list->capacity = saved_count < 50 ? 50 : saved_count;
    Student *grown = realloc(list->data, sizeof(Student) * (size_t)list->capacity);
    if (grown == NULL) { fclose(fp); return false; }       /* bug 4 修复 */
    list->data = grown;

    if (fread(list->data, sizeof(Student), (size_t)saved_count, fp)
            != (size_t)saved_count) {
        fprintf(stderr, "Corrupt data file (records)\n");
        list->count = 0;
        fclose(fp);
        return false;
    }
    list->count = saved_count;
    fclose(fp);
    return true;
}
```

（`bool` 需要包含 `<stdbool.h>`，C23 起为关键字。）

## 7. 统计与导出

分数段统计是双重循环套计数器，没有新知识，直接给骨架：

```c
/* 对每一门课：max、min、sum 一遍扫完，分五档计 */
for (int c = 0; c < COURSE_NUM; c++) {
    int max_s = 0, min_s = 100, sum = 0, fail = 0, pass = 0;
    for (int i = 0; i < list->count; i++) {
        int sc = list->data[i].scores[c];
        if (sc > max_s) max_s = sc;
        if (sc < min_s) min_s = sc;
        sum += sc;
        if (sc < 60) fail++;
        else if (sc < 80) pass++;     /* 档位按需细分 */
    }
    printf("%-10s avg %.2f  min %d  max %d  pass %.1f%%\n",
           course_names[c], (double)sum / list->count, min_s, max_s,
           100.0 * (list->count - fail) / list->count);
}
```

CSV 导出是 `fprintf` 的格式化练习：表头一行、每生一行、逗号分隔。注意真实 CSV 的字段若可能含逗号/引号要加引号转义——本项目字段是 ID 与英文姓名，从简。

## 8. 菜单主循环：把一切串起来

```c
int main(void) {
    StudentList list;
    list_init(&list);
    if (!load_from_file(&list)) {
        fprintf(stderr, "Start with an empty database.\n");
    }

    for (;;) {
        show_menu();
        int choice;
        if (scanf("%d", &choice) != 1) {
            while (getchar() != '\n');
            continue;
        }
        switch (choice) {
            case 1: add_student(&list); break;
            case 2: case 3: do_search(&list, choice); break;
            case 4: modify_student(&list); break;
            case 5: do_delete(&list); break;
            case 6: sort_students(&list); break;
            case 7: statistics(&list); break;
            case 8: display_all(&list); break;
            case 9: export_csv(&list); break;
            case 0:
                save_to_file(&list);
                list_free(&list);
                return 0;
            default:
                printf("Invalid choice.\n");
        }
    }
}
```

完整程序约 400 行单文件，`gcc -Wall -Wextra -std=c11 -g students.c -o students` 零警告通过。菜单分支多了以后会开始难受——这正是下一章 [跳转表](/c/180-FunctionPointerCallbackJumpTable) 想解决的问题，重构留给小练习。

## 9. 二进制存档的两个可移植性坑

`fwrite(list->data, sizeof(Student), ...)` 直接把内存结构倒进文件，代价是存档与平台绑死：

1. **填充字节**：`Student` 里 `char[20]`、`int[5]`、`double`、`int` 混排，编译器会插填充，`sizeof(Student)` 在不同编译器上可能不同——同样的存档换个编译器读出来就错位（机制见 [内存对齐](/c/220-MemoryAlignmentDeepDive) 与 [成员排序](/c/230-AlignmentMemoryLayout)）；
2. **类型宽度与字节序**：`int` 是 4 字节但标准只保证至少 16 位；多字节整数的字节序在大小端机器上相反（见 [数据类型](/c/040-DataTypeDetailed)）。

工程结论：**随手存档用二进制没问题，跨机器交换的数据用文本格式**（本项目的 CSV 导出就是为这个）。真要跨平台的二进制格式，就按字节序列化（逐字段定宽 + 固定字节序），240 篇的位域可移植性讨论是同一主题。

调试现场：把 Linux 上生成的 `students.dat` 拷到 Windows/MSVC 构建的同款程序里打开，`count` 读出天文数字——不是巧合，是第 6 节那条「长度字段先验范围」在真实世界兑现，范围校验让它当场拒绝而不是崩溃。

## 10. 小练习

预测题（5 分钟）：把 `students.dat` 用文本编辑器打开，手工把开头的 `count` 从 3 改成字符 `9` 的 ASCII（技术上是改了字节），再用程序加载。带第 6 节修复版与初版分别会发生什么？

参考答案（先写再看）：修复版被 `saved_count` 的范围校验或 `fread` 返回值检查拦下，打印 Corrupt data file 后拒绝加载；初版拿着错误的 count 去 realloc/fread，读入的字节当 Student 解释——大概率「正常」显示一堆乱码学生，数据损坏静默发生。

挑战题（一小时，不看答案先动手）：把这个单文件项目拆成 `student.h`、`student.c`、`main.c` 三个文件，并写一个 Makefile：`make` 编译、`make clean` 清理。提示两级如下。

提示（思路方向）：头文件放类型定义与函数声明（哪些函数该暴露、哪些该 `static` 藏进 .c，判断标准见 [多文件编译](/c/310-MultiFileCompilation)）；Makefile 三要素与 tab 纪律见 [构建系统](/c/470-BuildSystem)。

展开（验收清单）：`make` 增量编译（改 main.c 只重编 main.o）；`gcc -Wall -Wextra` 零警告；`make clean` 后无残留 .o；头文件有 include guard。

## 11. 扩展方向

- 存储升级：动态数组换链表（[结构体自引用](/c/130-StructAndUnion)）或为学号建哈希索引（[毕业项目](/c/595-CCapstoneProject) 的主题）；
- 工程化：多文件与构建系统（挑战题）、`--verbose` 之类命令行参数（[函数](/c/090-FunctionDetailed) 的 argc/argv 进阶）；
- 交互升级：ncurses 图形菜单、Socket 客户端/服务器化（[Socket 网络编程](/c/390-SocketNetworkProgramming)）；
- 健壮性：日志文件（[国际化](/c/460-I18nAndL10n) 若要双语日志则接 gettext）。

## 12. 与之前和之后的知识的关系

- 往前：本篇是 010 到 470 主线的验收场——结构体、动态内存、回调、文件 I/O、安全输入各自在这里有一道对应工序；
- 旁支：与 [毕业项目](/c/595-CCapstoneProject)（零依赖动态数组与哈希表）构成「跟随式项目」与「自主式项目」的两级台阶；
- 往后：[C 语言理论知识](/c/590-CLanguageTheory) 把项目里用到的语言机制做理论收束，然后是 [学习总结](/c/600-CLearningSummary)。

## 13. 官方文档

- qsort（cppreference C）：https://en.cppreference.com/w/c/algorithm/qsort
- fread/fwrite（cppreference C）：https://en.cppreference.com/w/c/io/fread
- scanf 宽度说明（cppreference C）：https://en.cppreference.com/w/c/io/scanf
- fscanf 系列的手册页（man7）：https://man7.org/linux/man-pages/man3/scanf.3.html

## 14. 自我检查

- 能从需求白板直接画出 Student/StudentList 的数据模型，说出不用链表的理由；
- 能复述本篇四个 bug 各自的机制：比较器副作用、信任文件长度、fread 不查返回值、realloc 直接赋值；
- 能说出二进制存档的两个可移植性坑，并给「随手存档」与「跨机交换」各选一种格式并说明理由；
- 能把本程序拆成三个文件并配一个增量编译的 Makefile。

## 本章总结

这个 400 行的菜单程序没有用到任何新语法——它的价值在于把结构体、动态数组、回调、文件 I/O、安全输入第一次拼进同一个工程，并暴露出四类「单篇学习时看不见」的项目级 bug：回调必须是纯函数，qsort 的调用方式不受你控制；任何来自外部的长度字段都不可信，先验范围再使用；fread/fwrite 的返回值就是数据完整性的哨兵；realloc 的返回值必须经临时指针接住。二进制存档顺手但绑平台，跨机交换用文本。菜单长到 switch 装不下时，下一步的重构方向也已经指好了。

## 下一步

进入 [C 语言理论知识](/c/590-CLanguageTheory)：项目做完了，把一路用到的机制——从类型系统到未定义行为——做一次理论收束，知其然也知其所以然。
