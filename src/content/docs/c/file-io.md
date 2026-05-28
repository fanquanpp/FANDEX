---
order: 110
tags:
  - 'c'
difficulty: 'intermediate'
title: '文件 I/O 操作'
module: 'c'
category: 'C Basics'
description: '标准文件流操作、二进制文件及错误处理。'
author: 'Anonymous'
---

## 目录

1. [文件 I/O 的概念与重要性](#文件-i/o-的概念与重要性)
2. [文件指针与标准流](#文件指针与标准流)
3. [文件的打开与关闭](#文件的打开与关闭)
4. [文件读写操作](#文件读写操作)
5. [文件位置指针](#文件位置指针)
6. [错误处理](#错误处理)
7. [高级文件操作](#高级文件操作)
8. [完整应用示例](#完整应用示例)
9. [最佳实践](#最佳实践)
10. [常见错误与调试](#常见错误与调试)
11. [与其他语言的对比](#与其他语言的对比)
12. [总结](#总结)

---

## 1. 文件 I/O 的概念与重要性

### 1.1 什么是文件 I/O

- **文件 I/O**（Input/Output）是指程序与外部文件之间的数据交换操作。
- **作用**：
- 持久化存储数据
- 读取配置文件
- 处理大型数据集
- 日志记录
- 与其他程序交换数据

### 1.2 文件的类型

- **文本文件**：以字符形式存储，每行以换行符结束
- **二进制文件**：以二进制形式存储，直接保存数据的内存表示

## 2. 文件指针与标准流

### 2.1 文件指针

- **FILE 结构体**：C 语言使用 `FILE` 结构体来管理文件操作
- **文件指针**：`FILE *` 类型的指针，指向 FILE 结构体的实例

### 2.2 标准流

- **stdin**：标准输入流，通常对应键盘
- **stdout**：标准输出流，通常对应屏幕
- **stderr**：标准错误流，通常对应屏幕（用于错误信息）

```c
 // 标准流的使用
 printf("Hello, World!\n"); // 等价于 fprintf(stdout, "Hello, World!\n");
 fprintf(stderr, "Error: Something went wrong!\n");
```

## 3. 文件的打开与关闭

### 3.1 文件打开模式

| 模式 | 描述                                           |
| ---- | ---------------------------------------------- |
| r    | 只读模式，文件必须存在                         |
| w    | 只写模式，文件不存在则创建，存在则清空         |
| a    | 追加模式，文件不存在则创建，从文件末尾开始写入 |
| r+   | 读写模式，文件必须存在                         |
| w+   | 读写模式，文件不存在则创建，存在则清空         |
| a+   | 读写模式，文件不存在则创建，从文件末尾开始写入 |
| rb   | 二进制只读模式                                 |
| wb   | 二进制只写模式                                 |
| ab   | 二进制追加模式                                 |
| rb+  | 二进制读写模式                                 |
| wb+  | 二进制读写模式                                 |
| ab+  | 二进制读写模式                                 |

### 3.2 文件打开函数 `fopen`

```c
 FILE *fopen(const char *filename, const char *mode);
```

- **参数**：
- `filename`：文件名或路径
- `mode`：打开模式
- **返回值**：成功返回文件指针，失败返回 NULL

### 3.3 文件关闭函数 `fclose`

```c
 int fclose(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **返回值**：成功返回 0，失败返回 EOF

### 3.4 示例：打开和关闭文件

```c
 #include <stdio.h>
 int main() {
  FILE *fp = fopen("test.txt", "w");
  if (fp == NULL) {
  perror("Error opening file");
  return 1;
  }
  // 文件操作...
  if (fclose(fp) != 0) {
  perror("Error closing file");
  return 1;
  }
  return 0;
 True}
```

## 4. 文件读写操作

### 4.1 格式化读写

#### 4.1.1 格式化写入：`fprintf`

```c
 int fprintf(FILE *stream, const char *format, ...);
```

- **参数**：
- `stream`：文件指针
- `format`：格式化字符串
- `...`：可变参数列表
- **返回值**：成功返回写入的字符数，失败返回负值

#### 4.1.2 格式化读取：`fscanf`

```c
 int fscanf(FILE *stream, const char *format, ...);
```

- **参数**：
- `stream`：文件指针
- `format`：格式化字符串
- `...`：变量地址列表
- **返回值**：成功返回读取的项目数，失败或到达文件末尾返回 EOF

#### 4.1.3 示例：格式化读写

```c
 // 写入数据
 FILE *fp = fopen("data.txt", "w");
 if (fp != NULL) {
  fprintf(fp, "Name: %s\n", "Alice");
  fprintf(fp, "Age: %d\n", 25);
  fprintf(fp, "Score: %.2f\n", 95.5);
  fclose(fp);
 True}
 // 读取数据
 char name[50];
 int age;
 float score;
 fp = fopen("data.txt", "r");
 if (fp != NULL) {
  fscanf(fp, "Name: %s", name);
  fscanf(fp, "Age: %d", &age);
  fscanf(fp, "Score: %f", &score);
  printf("Name: %s, Age: %d, Score: %.2f\n", name, age, score);
  fclose(fp);
 True}
```

### 4.2 字符读写

#### 4.2.1 字符写入：`fputc`

```c
 int fputc(int c, FILE *stream);
```

- **参数**：
- `c`：要写入的字符（int 类型）
- `stream`：文件指针
- **返回值**：成功返回写入的字符，失败返回 EOF

#### 4.2.2 字符读取：`fgetc`

```c
 int fgetc(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **返回值**：成功返回读取的字符，失败或到达文件末尾返回 EOF

#### 4.2.3 示例：字符读写

```c
 // 写入字符
 FILE *fp = fopen("chars.txt", "w");
 if (fp != NULL) {
  char str[] = "Hello, File I/O!";
  for (int i = 0; str[i] != '\0'; i++) {
  fputc(str[i], fp);
  }
  fclose(fp);
 True}
 // 读取字符
 fp = fopen("chars.txt", "r");
 if (fp != NULL) {
  int c;
  while ((c = fgetc(fp)) != EOF) {
  putchar(c);
  }
  fclose(fp);
 True}
```

### 4.3 字符串读写

#### 4.3.1 字符串写入：`fputs`

```c
 int fputs(const char *s, FILE *stream);
```

- **参数**：
- `s`：要写入的字符串
- `stream`：文件指针
- **返回值**：成功返回非负值，失败返回 EOF

#### 4.3.2 字符串读取：`fgets`

```c
 char *fgets(char *s, int size, FILE *stream);
```

- **参数**：
- `s`：存储读取字符串的缓冲区
- `size`：缓冲区大小
- `stream`：文件指针
- **返回值**：成功返回缓冲区地址，失败或到达文件末尾返回 NULL

#### 4.3.3 示例：字符串读写

```c
 // 写入字符串
 FILE *fp = fopen("lines.txt", "w");
 if (fp != NULL) {
  fputs("First line\n", fp);
  fputs("Second line\n", fp);
  fputs("Third line\n", fp);
  fclose(fp);
 True}
 // 读取字符串
 fp = fopen("lines.txt", "r");
 if (fp != NULL) {
  char buffer[100];
  while (fgets(buffer, sizeof(buffer), fp) != NULL) {
  printf("%s", buffer);
  }
  fclose(fp);
 True}
```

### 4.4 二进制读写

#### 4.4.1 二进制写入：`fwrite`

```c
 size_t fwrite(const void *ptr, size_t size, size_t count, FILE *stream);
```

- **参数**：
- `ptr`：数据缓冲区指针
- `size`：每个数据项的大小
- `count`：数据项的数量
- `stream`：文件指针
- **返回值**：成功返回写入的数据项数量

#### 4.4.2 二进制读取：`fread`

```c
 size_t fread(void *ptr, size_t size, size_t count, FILE *stream);
```

- **参数**：
- `ptr`：数据缓冲区指针
- `size`：每个数据项的大小
- `count`：数据项的数量
- `stream`：文件指针
- **返回值**：成功返回读取的数据项数量

#### 4.4.3 示例：二进制读写

```c
 // 定义结构体
 typedef struct {
  char name[50];
  int age;
  float salary;
 True} Employee;
 // 写入结构体
 Employee emp = {"Alice", 25, 5000.0};
 FILE *fp = fopen("employee.dat", "wb");
 if (fp != NULL) {
  fwrite(&emp, sizeof(Employee), 1, fp);
  fclose(fp);
 True}
 // 读取结构体
 Employee read_emp;
 fp = fopen("employee.dat", "rb");
 if (fp != NULL) {
  fread(&read_emp, sizeof(Employee), 1, fp);
  printf("Name: %s, Age: %d, Salary: %.2f\n",
  read_emp.name, read_emp.age, read_emp.salary);
  fclose(fp);
 True}
```

## 5. 文件位置指针

### 5.1 获取当前位置：`ftell`

```c
 long ftell(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **返回值**：成功返回当前文件位置，失败返回 -1L

### 5.2 设置文件位置：`fseek`

```c
 int fseek(FILE *stream, long offset, int origin);
```

- **参数**：
- `stream`：文件指针
- `offset`：偏移量（字节）
- `origin`：起始位置
- `SEEK_SET`：文件开头
- `SEEK_CUR`：当前位置
- `SEEK_END`：文件末尾
- **返回值**：成功返回 0，失败返回非 0

### 5.3 重置到文件开头：`rewind`

```c
 void rewind(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **功能**：将文件位置指针重置到文件开头

### 5.4 示例：文件位置操作

```c
 FILE *fp = fopen("test.txt", "r");
 if (fp != NULL) {
  // 获取初始位置
  long pos = ftell(fp);
  printf("Initial position: %ld\n", pos);
  // 读取一些数据
  char buffer[100];
  fgets(buffer, sizeof(buffer), fp);
  // 获取新位置
  pos = ftell(fp);
  printf("Position after reading: %ld\n", pos);
  // 移动到文件开头
  rewind(fp);
  pos = ftell(fp);
  printf("Position after rewind: %ld\n", pos);
  // 移动到文件末尾
  fseek(fp, 0, SEEK_END);
  pos = ftell(fp);
  printf("Position at end: %ld\n", pos);
  fclose(fp);
 True}
```

## 6. 错误处理

### 6.1 检测文件结束：`feof`

```c
 int feof(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **返回值**：如果到达文件末尾返回非 0，否则返回 0

### 6.2 检测错误：`ferror`

```c
 int ferror(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **返回值**：如果发生错误返回非 0，否则返回 0

### 6.3 清除错误标志：`clearerr`

```c
 void clearerr(FILE *stream);
```

- **参数**：
- `stream`：文件指针
- **功能**：清除文件流的错误标志和文件结束标志

### 6.4 打印错误信息：`perror`

```c
 void perror(const char *s);
```

- **参数**：
- `s`：自定义错误消息
- **功能**：打印自定义消息和系统错误信息

### 6.5 示例：错误处理

```c
 FILE *fp = fopen("nonexistent.txt", "r");
 if (fp == NULL) {
  perror("Error opening file");
  return 1;
 True}
 char buffer[100];
 while (fgets(buffer, sizeof(buffer), fp) != NULL) {
  // 处理数据
 True}
 if (ferror(fp)) {
  perror("Error reading file");
 True} else if (feof(fp)) {
  printf("End of file reached\n");
 True}
 fclose(fp);
```

## 7. 高级文件操作

### 7.1 临时文件

- **`tmpfile`**：创建临时文件，关闭时自动删除

```c
 FILE *tmpfile(void);
```

### 7.2 文件重命名与删除

- **`rename`**：重命名文件
- **`remove`**：删除文件

```c
 int rename(const char *oldname, const char *newname);
 int remove(const char *filename);
```

### 7.3 文件缓冲区控制

- **`setbuf`**：设置缓冲区
- **`setvbuf`**：设置缓冲区和缓冲模式
- **`fflush`**：刷新缓冲区

```c
 void setbuf(FILE *stream, char *buf);
 int setvbuf(FILE *stream, char *buf, int mode, size_t size);
 int fflush(FILE *stream);
```

## 8. 完整应用示例

### 8.1 文本文件复制

```c
 #include <stdio.h>
 int main() {
  FILE *source, *dest;
  char ch;
  // 打开源文件
  source = fopen("source.txt", "r");
  if (source == NULL) {
  perror("Error opening source file");
  return 1;
  }
  // 打开目标文件
  dest = fopen("destination.txt", "w");
  if (dest == NULL) {
  perror("Error opening destination file");
  fclose(source);
  return 1;
  }
  // 复制内容
  while ((ch = fgetc(source)) != EOF) {
  fputc(ch, dest);
  }
  // 检查错误
  if (ferror(source)) {
  perror("Error reading source file");
  } else if (ferror(dest)) {
  perror("Error writing destination file");
  } else {
  printf("File copied successfully!\n");
  }
  // 关闭文件
  fclose(source);
  fclose(dest);
  return 0;
 True}
```

### 8.2 学生信息管理系统

```c
 #include <stdio.h>
 #include <string.h>
 #define MAX_STUDENTS 100
 // 学生结构体
 typedef struct {
  int id;
  char name[50];
  float score;
 True} Student;
 // 保存学生信息到文件
 void save_students(Student students[], int count, const char *filename) {
  FILE *fp = fopen(filename, "wb");
  if (fp != NULL) {
  fwrite(&count, sizeof(int), 1, fp);
  fwrite(students, sizeof(Student), count, fp);
  fclose(fp);
  printf("Students saved successfully!\n");
  } else {
  perror("Error saving students");
  }
 True}
 // 从文件加载学生信息
 int load_students(Student students[], const char *filename) {
  FILE *fp = fopen(filename, "rb");
  int count = 0;
  if (fp != NULL) {
  fread(&count, sizeof(int), 1, fp);
  if (count > MAX_STUDENTS) {
  count = MAX_STUDENTS;
  }
  fread(students, sizeof(Student), count, fp);
  fclose(fp);
  printf("Loaded %d students\n", count);
  } else {
  perror("Error loading students");
  }
  return count;
 True}
 // 添加学生
 int add_student(Student students[], int count) {
  if (count >= MAX_STUDENTS) {
  printf("Maximum number of students reached!\n");
  return count;
  }
  Student s;
  printf("Enter student ID: ");
  scanf("%d", &s.id);
  printf("Enter student name: ");
  scanf(" %[^"]", s.name); // 读取带空格的字符串
  printf("Enter student score: ");
  scanf("%f", &s.score);
  students[count] = s;
  return count + 1;
 True}
 // 显示学生信息
 void display_students(Student students[], int count) {
  printf("\nStudent List:\n");
  printf("ID\tName\t\tScore\n");
  printf("--------------------------------\n");
  for (int i = 0; i < count; i++) {
  printf("%d\t%s\t\t%.2f\n",
  students[i].id, students[i].name, students[i].score);
  }
  printf("\n");
 True}
 int main() {
  Student students[MAX_STUDENTS];
  int count = 0;
  int choice;
  // 加载现有学生信息
  count = load_students(students, "students.dat");
  do {
  printf("\nStudent Management System\n");
  printf("1. Add Student\n");
  printf("2. Display Students\n");
  printf("3. Save and Exit\n");
  printf("Enter your choice: ");
  scanf("%d", &choice);
  switch (choice) {
  case 1:
  count = add_student(students, count);
  break;
  case 2:
  display_students(students, count);
  break;
  case 3:
  save_students(students, count, "students.dat");
  printf("Exiting...\n");
  break;
  default:
  printf("Invalid choice!\n");
  }
  } while (choice != 3);
  return 0;
 True}
```

## 9. 最佳实践

### 9.1 文件操作最佳实践

- **始终检查文件操作的返回值**：确保文件成功打开、读写和关闭
- **使用适当的打开模式**：根据需要选择正确的文件打开模式
- **及时关闭文件**：避免资源泄漏
- **处理错误情况**：使用 `perror` 和 `ferror` 等函数处理错误
- **使用二进制模式处理二进制文件**：避免文本模式的自动转换
- **合理使用缓冲区**：对于大文件操作，考虑使用缓冲区提高效率
- **使用 `feof` 检测文件结束**：而不是依赖 `fgetc` 等函数的返回值
- **避免使用 `gets`**：使用 `fgets` 替代，更安全

### 9.2 性能优化

- **批量读写**：对于大量数据，使用 `fread` 和 `fwrite` 进行批量操作
- **适当的缓冲区大小**：根据文件大小和内存情况设置合适的缓冲区
- **减少文件操作次数**：合并多次小的读写操作
- **使用 `fseek` 定位**：避免不必要的顺序读写
- **关闭不需要的文件**：及时释放文件资源

## 10. 常见错误与调试

### 10.1 常见错误

- **文件路径错误**：使用相对路径时，当前工作目录可能不是预期的
- **权限问题**：没有读写文件的权限
- **文件不存在**：以只读模式打开不存在的文件
- **内存不足**：文件过大，内存无法容纳
- **缓冲区溢出**：使用 `fgets` 时缓冲区大小不够
- **忘记关闭文件**：导致资源泄漏
- **混用文本和二进制模式**：导致数据损坏
- **文件位置指针错误**：不正确的 `fseek` 操作

### 10.2 调试技巧

- **使用 `perror`**：打印详细的错误信息
- **检查文件权限**：确保有正确的文件访问权限
- **检查文件路径**：使用绝对路径或确认相对路径的正确性
- **使用 `printf`**：打印中间结果和文件位置
- **使用调试器**：如 GDB 单步执行文件操作
- **检查返回值**：验证所有文件操作函数的返回值
- **使用临时文件**：测试文件操作逻辑

## 11. 与其他语言的对比

### 11.1 C++ 的文件 I/O

- C++ 提供了 `fstream` 类，使用更面向对象的方式处理文件
- 支持运算符重载，如 `<<` 和 `>>` 进行读写
- 提供了更多的文件操作功能

### 11.2 Python 的文件 I/O

- Python 的文件操作更简洁，使用 `with` 语句自动处理文件关闭
- 支持上下文管理器，更安全
- 提供了更多高级文件操作功能

### 11.3 Java 的文件 I/O

- Java 提供了丰富的文件操作类，如 `File`, `FileReader`, `FileWriter` 等
- 支持字节流和字符流
- 异常处理更完善

## 12. 总结

文件 I/O 是 C 语言中非常重要的一部分，它允许程序与外部文件进行数据交换，实现数据的持久化存储。通过本文的学习，你应该掌握：

- 文件的打开、关闭和基本操作
- 不同类型的文件读写方法（文本和二进制）
- 文件位置指针的控制
- 错误处理和异常情况的处理
- 文件操作的最佳实践和性能优化
  合理使用文件 I/O 功能，可以使你的程序更加灵活和实用，能够处理各种复杂的数据存储和交换需求。

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化文件操作知识。
- 2026-04-05: 详细扩写内容，增加了文件IO的概念与重要性、标准流的详细介绍、文件打开模式的详细说明、各种读写操作的详细示例、二进制文件操作、文件位置指针的详细使用、错误处理的最佳实践、完整的应用示例、最佳实践和常见错误。
