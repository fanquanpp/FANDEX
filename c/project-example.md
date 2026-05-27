# C 语言项目示例：学生成绩管理系统

## 项目概述

本项目实现一个基于 C 语言的学生成绩管理系统，综合运用结构体、文件 I/O、排序算法和动态内存管理等核心知识点。系统支持学生信息的录入、查询、修改、删除、排序和统计，数据持久化存储于二进制文件中。

### 功能清单

| 功能模块 | 描述 |
|---------|------|
| 录入学生 | 输入学号、姓名、多科成绩，自动计算总分和平均分 |
| 查询学生 | 按学号或姓名精确/模糊查询 |
| 修改学生 | 修改指定学号的学生信息 |
| 删除学生 | 按学号删除学生记录 |
| 成绩排序 | 按总分/平均分/单科成绩排序（支持升序/降序） |
| 统计分析 | 最高分、最低分、平均分、各分数段人数分布 |
| 文件存储 | 二进制文件读写，启动时加载、退出时保存 |
| 数据导出 | 导出为 CSV 格式文件 |

## 需求分析

### 数据需求

- 每个学生包含：学号（唯一标识）、姓名、5 门课程成绩、总分、平均分、排名
- 系统最多管理 500 名学生（可配置）
- 数据需持久化到文件，重启后可恢复

### 功能需求

- 菜单驱动的交互界面
- 输入合法性校验（学号不重复、成绩范围 0-100）
- 支持多种排序策略
- 支持模糊查询（姓名包含关键字）

### 非功能需求

- 单次操作响应时间 < 100ms
- 文件读写采用二进制格式以提高效率
- 内存占用可控，使用动态数组

## 技术选型

| 技术点 | 选型 | 理由 |
|-------|------|------|
| 数据结构 | 结构体数组 | 学生记录为异构数据，结构体最自然 |
| 内存管理 | 动态分配 realloc | 支持动态扩容，避免固定数组浪费 |
| 排序算法 | qsort（快速排序） | C 标准库，时间复杂度 O(n log n) |
| 文件存储 | 二进制读写 fread/fwrite | 比文本格式更快，直接映射内存结构 |
| 查询方式 | 线性扫描 | 数据量小，无需索引结构 |
| 字符串处理 | string.h 标准函数 | strstr 实现模糊查询 |

## 完整代码

### 头文件与常量定义

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_NAME_LEN 50
#define MAX_ID_LEN 20
#define COURSE_NUM 5
#define INIT_CAPACITY 50
#define SCORE_MIN 0
#define SCORE_MAX 100
#define DATA_FILE "students.dat"
#define CSV_FILE "students.csv"

static const char *course_names[COURSE_NUM] = {
    "Math", "English", "Physics", "Chemistry", "Computer"
};
```

### 核心数据结构

```c
typedef struct {
    char id[MAX_ID_LEN];
    char name[MAX_NAME_LEN];
    int scores[COURSE_NUM];
    int total;
    double average;
    int rank;
} Student;

typedef struct {
    Student *data;
    int count;
    int capacity;
} StudentList;
```

### 列表操作函数

```c
void list_init(StudentList *list) {
    list->capacity = INIT_CAPACITY;
    list->count = 0;
    list->data = (Student *)malloc(sizeof(Student) * list->capacity);
    if (!list->data) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }
}

void list_ensure_capacity(StudentList *list) {
    if (list->count >= list->capacity) {
        list->capacity *= 2;
        Student *new_data = (Student *)realloc(
            list->data, sizeof(Student) * list->capacity
        );
        if (!new_data) {
            fprintf(stderr, "Memory reallocation failed\n");
            exit(EXIT_FAILURE);
        }
        list->data = new_data;
    }
}

void list_free(StudentList *list) {
    free(list->data);
    list->data = NULL;
    list->count = 0;
    list->capacity = 0;
}
```

### 学生信息录入

```c
int find_by_id(StudentList *list, const char *id) {
    for (int i = 0; i < list->count; i++) {
        if (strcmp(list->data[i].id, id) == 0) {
            return i;
        }
    }
    return -1;
}

int input_score(int course_index) {
    int score;
    while (1) {
        printf("  Enter %s score (%d-%d): ",
               course_names[course_index], SCORE_MIN, SCORE_MAX);
        if (scanf("%d", &score) != 1) {
            while (getchar() != '\n');
            printf("  Invalid input, please enter a number.\n");
            continue;
        }
        if (score < SCORE_MIN || score > SCORE_MAX) {
            printf("  Score out of range, please re-enter.\n");
            continue;
        }
        return score;
    }
}

void add_student(StudentList *list) {
    list_ensure_capacity(list);
    Student *s = &list->data[list->count];

    printf("Enter student ID: ");
    scanf("%s", s->id);
    if (find_by_id(list, s->id) != -1) {
        printf("Student ID already exists!\n");
        return;
    }

    printf("Enter student name: ");
    scanf("%s", s->name);

    s->total = 0;
    for (int i = 0; i < COURSE_NUM; i++) {
        s->scores[i] = input_score(i);
        s->total += s->scores[i];
    }
    s->average = (double)s->total / COURSE_NUM;
    s->rank = 0;

    list->count++;
    printf("Student added successfully. Total: %d, Average: %.2f\n",
           s->total, s->average);
}
```

### 查询功能

```c
void search_by_id(StudentList *list) {
    char id[MAX_ID_LEN];
    printf("Enter student ID to search: ");
    scanf("%s", id);

    int idx = find_by_id(list, id);
    if (idx == -1) {
        printf("Student not found.\n");
        return;
    }
    print_student(&list->data[idx]);
}

void search_by_name(StudentList *list) {
    char keyword[MAX_NAME_LEN];
    printf("Enter name keyword to search: ");
    scanf("%s", keyword);

    int found = 0;
    for (int i = 0; i < list->count; i++) {
        if (strstr(list->data[i].name, keyword) != NULL) {
            print_student(&list->data[i]);
            found++;
        }
    }
    if (found == 0) {
        printf("No matching students found.\n");
    } else {
        printf("Found %d matching student(s).\n", found);
    }
}

void print_student(Student *s) {
    printf("------+-------------------+------\n");
    printf("ID    : %s\n", s->id);
    printf("Name  : %s\n", s->name);
    for (int i = 0; i < COURSE_NUM; i++) {
        printf("%-8s: %d\n", course_names[i], s->scores[i]);
    }
    printf("Total : %d\n", s->total);
    printf("Avg   : %.2f\n", s->average);
    if (s->rank > 0) {
        printf("Rank  : %d\n", s->rank);
    }
    printf("------+-------------------+------\n");
}
```

### 修改与删除

```c
void modify_student(StudentList *list) {
    char id[MAX_ID_LEN];
    printf("Enter student ID to modify: ");
    scanf("%s", id);

    int idx = find_by_id(list, id);
    if (idx == -1) {
        printf("Student not found.\n");
        return;
    }

    Student *s = &list->data[idx];
    printf("Current name: %s, enter new name (or '-' to keep): ");
    char input[MAX_NAME_LEN];
    scanf("%s", input);
    if (strcmp(input, "-") != 0) {
        strcpy(s->name, input);
    }

    printf("Re-enter scores for each course (enter -1 to keep current):\n");
    s->total = 0;
    for (int i = 0; i < COURSE_NUM; i++) {
        printf("  %s current: %d, new: ", course_names[i], s->scores[i]);
        int new_score;
        if (scanf("%d", &new_score) == 1 && new_score != -1) {
            if (new_score >= SCORE_MIN && new_score <= SCORE_MAX) {
                s->scores[i] = new_score;
            }
        }
        s->total += s->scores[i];
    }
    s->average = (double)s->total / COURSE_NUM;
    printf("Student updated. Total: %d, Average: %.2f\n", s->total, s->average);
}

void delete_student(StudentList *list) {
    char id[MAX_ID_LEN];
    printf("Enter student ID to delete: ");
    scanf("%s", id);

    int idx = find_by_id(list, id);
    if (idx == -1) {
        printf("Student not found.\n");
        return;
    }

    for (int i = idx; i < list->count - 1; i++) {
        list->data[i] = list->data[i + 1];
    }
    list->count--;
    printf("Student deleted successfully.\n");
}
```

### 排序功能

```c
int cmp_total_desc(const void *a, const void *b) {
    return ((Student *)b)->total - ((Student *)a)->total;
}

int cmp_total_asc(const void *a, const void *b) {
    return ((Student *)a)->total - ((Student *)b)->total;
}

int cmp_avg_desc(const void *a, const void *b) {
    double diff = ((Student *)b)->average - ((Student *)a)->average;
    return (diff > 0) ? 1 : ((diff < 0) ? -1 : 0);
}

int cmp_course_desc(const void *a, const void *b) {
    int course;
    printf("Select course (0-Math 1-English 2-Physics 3-Chemistry 4-Computer): ");
    scanf("%d", &course);
    if (course < 0 || course >= COURSE_NUM) course = 0;
    return ((Student *)b)->scores[course] - ((Student *)a)->scores[course];
}

void sort_students(StudentList *list) {
    if (list->count == 0) {
        printf("No students to sort.\n");
        return;
    }

    printf("Sort by:\n");
    printf("1. Total (descending)\n");
    printf("2. Total (ascending)\n");
    printf("3. Average (descending)\n");
    printf("4. Single course (descending)\n");
    printf("Choice: ");

    int choice;
    scanf("%d", &choice);

    switch (choice) {
        case 1: qsort(list->data, list->count, sizeof(Student), cmp_total_desc); break;
        case 2: qsort(list->data, list->count, sizeof(Student), cmp_total_asc); break;
        case 3: qsort(list->data, list->count, sizeof(Student), cmp_avg_desc); break;
        case 4: qsort(list->data, list->count, sizeof(Student), cmp_course_desc); break;
        default: printf("Invalid choice.\n"); return;
    }

    for (int i = 0; i < list->count; i++) {
        list->data[i].rank = i + 1;
    }
    printf("Sorted and ranked successfully.\n");
}
```

### 统计分析

```c
void statistics(StudentList *list) {
    if (list->count == 0) {
        printf("No student data.\n");
        return;
    }

    printf("\n===== Statistics Report =====\n");
    printf("Total students: %d\n\n", list->count);

    for (int c = 0; c < COURSE_NUM; c++) {
        int max_s = SCORE_MIN, min_s = SCORE_MAX, sum = 0;
        int excellent = 0, good = 0, medium = 0, pass = 0, fail = 0;

        for (int i = 0; i < list->count; i++) {
            int s = list->data[i].scores[c];
            if (s > max_s) max_s = s;
            if (s < min_s) min_s = s;
            sum += s;
            if (s >= 90) excellent++;
            else if (s >= 80) good++;
            else if (s >= 70) medium++;
            else if (s >= 60) pass++;
            else fail++;
        }

        double avg = (double)sum / list->count;
        printf("--- %s ---\n", course_names[c]);
        printf("  Max: %d  Min: %d  Avg: %.2f\n", max_s, min_s, avg);
        printf("  Excellent(90-100): %d (%.1f%%)\n",
               excellent, 100.0 * excellent / list->count);
        printf("  Good(80-89):      %d (%.1f%%)\n",
               good, 100.0 * good / list->count);
        printf("  Medium(70-79):    %d (%.1f%%)\n",
               medium, 100.0 * medium / list->count);
        printf("  Pass(60-69):      %d (%.1f%%)\n",
               pass, 100.0 * pass / list->count);
        printf("  Fail(0-59):       %d (%.1f%%)\n\n",
               fail, 100.0 * fail / list->count);
    }
}
```

### 文件读写

```c
void save_to_file(StudentList *list) {
    FILE *fp = fopen(DATA_FILE, "wb");
    if (!fp) {
        perror("Failed to open data file for writing");
        return;
    }

    fwrite(&list->count, sizeof(int), 1, fp);
    fwrite(list->data, sizeof(Student), list->count, fp);
    fclose(fp);
    printf("Data saved to %s (%d records).\n", DATA_FILE, list->count);
}

void load_from_file(StudentList *list) {
    FILE *fp = fopen(DATA_FILE, "rb");
    if (!fp) {
        printf("No existing data file, starting fresh.\n");
        return;
    }

    fread(&list->count, sizeof(int), 1, fp);
    if (list->count > list->capacity) {
        list->capacity = list->count * 2;
        list->data = (Student *)realloc(
            list->data, sizeof(Student) * list->capacity
        );
    }
    fread(list->data, sizeof(Student), list->count, fp);
    fclose(fp);
    printf("Loaded %d records from %s.\n", list->count, DATA_FILE);
}

void export_csv(StudentList *list) {
    FILE *fp = fopen(CSV_FILE, "w");
    if (!fp) {
        perror("Failed to open CSV file");
        return;
    }

    fprintf(fp, "ID,Name");
    for (int i = 0; i < COURSE_NUM; i++) {
        fprintf(fp, ",%s", course_names[i]);
    }
    fprintf(fp, ",Total,Average,Rank\n");

    for (int i = 0; i < list->count; i++) {
        Student *s = &list->data[i];
        fprintf(fp, "%s,%s", s->id, s->name);
        for (int j = 0; j < COURSE_NUM; j++) {
            fprintf(fp, ",%d", s->scores[j]);
        }
        fprintf(fp, ",%d,%.2f,%d\n", s->total, s->average, s->rank);
    }

    fclose(fp);
    printf("Exported %d records to %s.\n", list->count, CSV_FILE);
}
```

### 显示所有学生

```c
void display_all(StudentList *list) {
    if (list->count == 0) {
        printf("No student data.\n");
        return;
    }

    printf("\n%-12s %-15s", "ID", "Name");
    for (int i = 0; i < COURSE_NUM; i++) {
        printf(" %-8s", course_names[i]);
    }
    printf(" %-6s %-8s %-5s\n", "Total", "Average", "Rank");
    printf("-----------------------------------------------------------------\n");

    for (int i = 0; i < list->count; i++) {
        Student *s = &list->data[i];
        printf("%-12s %-15s", s->id, s->name);
        for (int j = 0; j < COURSE_NUM; j++) {
            printf(" %-8d", s->scores[j]);
        }
        printf(" %-6d %-8.2f %-5d\n", s->total, s->average, s->rank);
    }
}
```

### 主函数与菜单

```c
void show_menu() {
    printf("\n========================================\n");
    printf("   Student Grade Management System\n");
    printf("========================================\n");
    printf("1. Add Student\n");
    printf("2. Search by ID\n");
    printf("3. Search by Name\n");
    printf("4. Modify Student\n");
    printf("5. Delete Student\n");
    printf("6. Sort Students\n");
    printf("7. Statistics\n");
    printf("8. Display All\n");
    printf("9. Export CSV\n");
    printf("0. Save & Exit\n");
    printf("========================================\n");
    printf("Choice: ");
}

int main() {
    StudentList list;
    list_init(&list);
    load_from_file(&list);

    int choice;
    while (1) {
        show_menu();
        if (scanf("%d", &choice) != 1) {
            while (getchar() != '\n');
            continue;
        }

        switch (choice) {
            case 1: add_student(&list); break;
            case 2: search_by_id(&list); break;
            case 3: search_by_name(&list); break;
            case 4: modify_student(&list); break;
            case 5: delete_student(&list); break;
            case 6: sort_students(&list); break;
            case 7: statistics(&list); break;
            case 8: display_all(&list); break;
            case 9: export_csv(&list); break;
            case 0:
                save_to_file(&list);
                list_free(&list);
                printf("Goodbye!\n");
                return 0;
            default:
                printf("Invalid choice, please try again.\n");
        }
    }
    return 0;
}
```

## 运行说明

### 编译

```bash
gcc -Wall -Wextra -std=c11 -o student_manager main.c
```

### 运行

```bash
./student_manager
```

### 数据文件

- `students.dat` -- 二进制数据文件，程序自动创建和读取
- `students.csv` -- 导出的 CSV 文件，可用 Excel 打开

### 注意事项

- 二进制文件与平台相关，不同字节序的系统间不可直接迁移
- 结构体写入文件时需注意对齐和填充问题
- 学号和姓名长度受宏定义限制，超长输入会截断

## 扩展方向

1. **链表存储** -- 将动态数组替换为链表，支持 O(1) 插入删除
2. **哈希索引** -- 为学号建立哈希表索引，查询复杂度降为 O(1)
3. **多文件组织** -- 拆分为头文件和多个源文件，使用 Makefile 构建
4. **加密存储** -- 对敏感数据（姓名）进行简单异或加密
5. **图形界面** -- 使用 GTK 或 ncurses 替代控制台菜单
6. **网络通信** -- 使用 Socket 实现客户端/服务器架构
7. **日志系统** -- 记录所有操作到日志文件，支持审计追踪

---

## 关键代码速查

### 结构体定义模板

```c
typedef struct {
    char id[MAX_ID_LEN];
    char name[MAX_NAME_LEN];
    int scores[COURSE_NUM];
    int total;
    double average;
    int rank;
} Student;
```

### 动态数组扩容

```c
if (list->count >= list->capacity) {
    list->capacity *= 2;
    list->data = realloc(list->data, sizeof(Student) * list->capacity);
}
```

### qsort 比较函数

```c
int cmp_total_desc(const void *a, const void *b) {
    return ((Student *)b)->total - ((Student *)a)->total;
}
qsort(arr, n, sizeof(Student), cmp_total_desc);
```

### 二进制文件读写

```c
fwrite(&count, sizeof(int), 1, fp);
fwrite(data, sizeof(Student), count, fp);

fread(&count, sizeof(int), 1, fp);
fread(data, sizeof(Student), count, fp);
```

### 模糊查询

```c
if (strstr(student.name, keyword) != NULL) {
    // matched
}
```

### 分数段统计

```c
if (score >= 90) excellent++;
else if (score >= 80) good++;
else if (score >= 70) medium++;
else if (score >= 60) pass++;
else fail++;
```
