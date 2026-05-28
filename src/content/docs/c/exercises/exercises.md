---
order: 150
tags:
  - 'c'
  - 'exercises'
  - 'memory'
difficulty: 'intermediate'
title: 'C 语言练习题'
module: 'c'
description: 'C 语言核心知识点配套练习，涵盖指针、内存、控制流等。'
---

A. 5
B. 6
C. 编译错误
D. 未定义行为

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `*p` 解引用得到 `a` 的值 5，`*p + 1` 等价于 `5 + 1 = 6`。注意 `*p + 1` 与 `*(p + 1)` 不同，后者才是指针偏移。
</details>
### 2. 关于 `int arr[5]`，以下说法正确的是？
A. `arr` 和 `&arr` 类型相同
B. `arr + 1` 偏移 `sizeof(int)` 字节
C. `&arr + 1` 偏移 `sizeof(int)` 字节
D. `arr` 可以重新赋值指向其他地址
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `arr` 在大多数表达式中退化为 `int*`，`arr + 1` 偏移一个 `int` 的大小。而 `&arr` 的类型是 `int (*)[5]`，`&arr + 1` 偏移整个数组的大小（`5 * sizeof(int)`）。数组名不可赋值。
</details>
### 3. 以下结构体在 64 位系统上（默认对齐）的大小是多少？
```c
 struct S {
  char c;
  int i;
  double d;
 True};
 ```

A. 13 字节
B. 16 字节
C. 24 字节
D. 8 字节

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: 内存对齐规则：`char c` 占 1 字节（偏移 0），填充 3 字节后 `int i` 在偏移 4（对齐到 4），占 4 字节；`double d` 在偏移 8（对齐到 8），占 8 字节。总大小需为最大对齐数 8 的倍数，16 已满足。
</details>
### 4. 使用 `fopen` 以 `"ab"` 模式打开文件，以下描述正确的是？
A. 以只读方式打开二进制文件
B. 以追加方式打开文本文件
C. 以追加方式打开二进制文件，写入时在文件末尾添加
D. 以读写方式打开二进制文件
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: `"a"` 表示追加（append），`"b"` 表示二进制模式（binary）。`"ab"` 组合即为以二进制追加模式打开文件，所有写入操作都在文件末尾进行。
</details>
### 5. 以下代码存在什么问题？
```c
 int *p = (int *)malloc(sizeof(int) * 10);
 p[0] = 42;
 free(p);
 printf("%d", p[0]);
 ```

A. 没有问题
B. 编译错误
C. 使用已释放的内存（悬空指针）
D. 内存泄漏

<details>
<summary>查看答案</summary>
**答案**: C
**解析**: `free(p)` 后 `p` 成为悬空指针（dangling pointer），访问已释放内存是未定义行为。正确做法是 `free` 后将指针置为 `NULL`：`free(p); p = NULL;`。
</details>
## 编程题
### 1. 反转字符串
编写函数 `void reverse_string(char *str)`，原地反转以 `\0` 结尾的字符串。
**输入**: `char str[] = "hello"`
**输出**: `str` 变为 `"olleh"`
<details>
<summary>查看参考答案</summary>
```c
 void reverse_string(char *str) {
  if (str == NULL) return;
  char *left = str;
  char *right = str + strlen(str) - 1;
  while (left < right) {
  char tmp = *left;
  *left = *right;
  *right = tmp;
  left++;
  right--;
  }
 True}
 ```
</details>
### 2. 动态数组实现
实现一个简单的动态整数数组，支持 `push_back` 操作。当容量不足时，将容量翻倍。
**输入**: 依次添加 1, 2, 3, 4, 5
**输出**: 数组内容为 [1, 2, 3, 4, 5]
<details>
<summary>查看参考答案</summary>
```c
 #include <stdio.h>
 #include <stdlib.h>
 #include <string.h>
 typedef struct {
  int *data;
  size_t size;
  size_t capacity;
 True} DynArray;
 DynArray *dyn_array_create(size_t initial_cap) {
  DynArray *arr = (DynArray *)malloc(sizeof(DynArray));
  arr->data = (int *)malloc(sizeof(int) * initial_cap);
  arr->size = 0;
  arr->capacity = initial_cap;
  return arr;
 True}
 void dyn_array_push(DynArray *arr, int value) {
  if (arr->size == arr->capacity) {
  arr->capacity *= 2;
  arr->data = (int *)realloc(arr->data, sizeof(int) * arr->capacity);
  }
  arr->data[arr->size++] = value;
 True}
 void dyn_array_free(DynArray *arr) {
  free(arr->data);
  free(arr);
 True}
 int main(void) {
  DynArray *arr = dyn_array_create(2);
  for (int i = 1; i <= 5; i++) {
  dyn_array_push(arr, i);
  }
  for (size_t i = 0; i < arr->size; i++) {
  printf("%d ", arr->data[i]);
  }
  dyn_array_free(arr);
  return 0;
 True}
 ```
</details>
### 3. 文件行计数器
编写程序，读取文本文件并统计总行数、非空行数和包含特定关键字的行数。
**输入**: 文件路径和关键字字符串
**输出**: 总行数、非空行数、含关键字的行数
<details>
<summary>查看参考答案</summary>
```c
 #include <stdio.h>
 #include <string.h>
 #include <ctype.h>
 typedef struct {
  int total;
  int non_empty;
  int keyword_matches;
 True} LineCount;
 int is_empty_line(const char *line) {
  while (*line) {
  if (!isspace((unsigned char)*line)) return 0;
  line++;
  }
  return 1;
 True}
 LineCount count_lines(const char *filepath, const char *keyword) {
  LineCount cnt = {0, 0, 0};
  FILE *fp = fopen(filepath, "r");
  if (!fp) {
  perror("fopen failed");
  return cnt;
  }
  char buf[1024];
  while (fgets(buf, sizeof(buf), fp)) {
  cnt.total++;
  if (!is_empty_line(buf)) {
  cnt.non_empty++;
  }
  if (keyword && strstr(buf, keyword)) {
  cnt.keyword_matches++;
  }
  }
  fclose(fp);
  return cnt;
 True}
 int main(int argc, char *argv[]) {
  if (argc < 2) {
  fprintf(stderr, "Usage: %s <file> [keyword]\n", argv[0]);
  return 1;
  }
  const char *kw = (argc >= 3) ? argv[2] : NULL;
  LineCount c = count_lines(argv[1], kw);
  printf("Total: %d\nNon-empty: %d\nKeyword matches: %d\n",
  c.total, c.non_empty, c.keyword_matches);
  return 0;
 True}
 ```
</details>
