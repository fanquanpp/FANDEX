# 文件IO操作

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 文件打开与关闭

**基本写法：打开文件**
`FILE *<fp> = fopen("<filename>", "<mode>");`
```c
#include <stdio.h>
// 以只读方式打开文件
FILE *fp = fopen("data.txt", "r");
```

---

**基本写法：关闭文件**
`fclose(<fp>);`
```c
// 关闭文件
fclose(fp);
```

---

**错误检查写法：检查文件是否打开成功**
`if (<fp> == NULL) { ... }`
```c
// 检查文件是否成功打开
FILE *fp = fopen("data.txt", "r");
if (fp == NULL) {
    perror("Failed to open file");
    return 1;
}
```

---

## 文件打开模式

**只读写法：以只读方式打开**
`fopen("<filename>", "r")`
```c
// 只读模式打开文本文件
FILE *fp = fopen("data.txt", "r");
```

---

**只写写法：以只写方式打开**
`fopen("<filename>", "w")`
```c
// 只写模式打开文件（覆盖）
FILE *fp = fopen("output.txt", "w");
```

---

**追加写法：以追加方式打开**
`fopen("<filename>", "a")`
```c
// 追加模式打开文件
FILE *fp = fopen("log.txt", "a");
```

---

**读写写法：以读写方式打开**
`fopen("<filename>", "r+")`
```c
// 读写模式打开文件
FILE *fp = fopen("data.txt", "r+");
```

---

**二进制写法：以二进制方式打开**
`fopen("<filename>", "rb")`
```c
// 二进制只读模式打开
FILE *fp = fopen("data.bin", "rb");
```

---

## 字符读写

**基本写法：读取单个字符**
`int <ch> = fgetc(<fp>);`
```c
// 从文件读取单个字符
int ch = fgetc(fp);
```

---

**基本写法：写入单个字符**
`fputc(<ch>, <fp>);`
```c
// 向文件写入单个字符
fputc('A', fp);
```

---

**EOF 写法：检测文件结束**
`while ((<ch> = fgetc(<fp>)) != EOF) { ... }`
```c
// 循环读取直到文件结束
int ch;
while ((ch = fgetc(fp)) != EOF) {
    putchar(ch);
}
```

---

## 字符串读写

**基本写法：读取字符串**
`char *<result> = fgets(<buffer>, <size>, <fp>);`
```c
// 从文件读取一行字符串
char buffer[100];
fgets(buffer, sizeof(buffer), fp);
```

---

**基本写法：写入字符串**
`fputs("<string>", <fp>);`
```c
// 向文件写入字符串
fputs("Hello World", fp);
```

---

## 格式化读写

**基本写法：格式化读取**
`fscanf(<fp>, "<format>", &<var>);`
```c
// 从文件按格式读取
int age;
fscanf(fp, "%d", &age);
```

---

**基本写法：格式化写入**
`fprintf(<fp>, "<format>", <values>);`
```c
// 向文件按格式写入
fprintf(fp, "Name: %s, Age: %d\n", "John", 30);
```

---

## 块读写

**基本写法：读取数据块**
`size_t <count> = fread(<buffer>, <size>, <count>, <fp>);`
```c
// 从文件读取数据块
int data[10];
fread(data, sizeof(int), 10, fp);
```

---

**基本写法：写入数据块**
`size_t <count> = fwrite(<buffer>, <size>, <count>, <fp>);`
```c
// 向文件写入数据块
int data[5] = {1, 2, 3, 4, 5};
fwrite(data, sizeof(int), 5, fp);
```

---

## 文件定位

**基本写法：获取当前位置**
`long <pos> = ftell(<fp>);`
```c
// 获取当前文件位置
long pos = ftell(fp);
```

---

**基本写法：设置文件位置**
`fseek(<fp>, <offset>, <origin>);`
```c
// 从文件开头偏移 10 字节
fseek(fp, 10, SEEK_SET);
```

---

**基本写法：回到文件开头**
`rewind(<fp>);`
```c
// 将文件指针重置到开头
rewind(fp);
```

---

**末尾写法：定位到文件末尾**
`fseek(<fp>, 0, SEEK_END);`
```c
// 定位到文件末尾
fseek(fp, 0, SEEK_END);
```

---

**fgetpos 写法：获取文件位置**
`fgetpos(<fp>, &<pos>);`
```c
// 获取文件位置
fpos_t pos;
fgetpos(fp, &pos);
```

---

**fsetpos 写法：设置文件位置**
`fsetpos(<fp>, &<pos>);`
```c
// 设置文件位置
fpos_t pos;
fsetpos(fp, &pos);
```

---

## 文件状态检查

**基本写法：检查文件结束**
`feof(<fp>)`
```c
// 检查是否到达文件末尾
if (feof(fp)) {
    printf("End of file\n");
}
```

---

**基本写法：检查文件错误**
`ferror(<fp>)`
```c
// 检查文件读写错误
if (ferror(fp)) {
    printf("File error\n");
}
```

---

**基本写法：清除文件错误标志**
`clearerr(<fp>);`
```c
// 清除文件错误标志
clearerr(fp);
```

---

## 标准流

**基本写法：使用标准输入**
`stdin`
```c
// 从标准输入读取
char buffer[100];
fgets(buffer, sizeof(buffer), stdin);
```

---

**基本写法：使用标准输出**
`stdout`
```c
// 向标准输出写入
fputs("Hello\n", stdout);
```

---

**基本写法：使用标准错误**
`stderr`
```c
// 向标准错误输出
fprintf(stderr, "Error message\n");
```

---

## 文件删除与重命名

**基本写法：删除文件**
`remove("<filename>");`
```c
// 删除文件
remove("temp.txt");
```

---

**基本写法：重命名文件**
`rename("<old_name>", "<new_name>");`
```c
// 重命名文件
rename("old.txt", "new.txt");
```

---

## 临时文件

**基本写法：创建临时文件**
`FILE *<fp> = tmpfile();`
```c
// 创建临时文件（关闭后自动删除）
FILE *tmp = tmpfile();
```

---

**基本写法：生成临时文件名**
`char *<name> = tmpnam(<buffer>);`
```c
// 生成临时文件名
char name[L_tmpnam];
tmpnam(name);
```

---

## 文件缓冲

**基本写法：设置缓冲区**
`setvbuf(<fp>, <buffer>, <mode>, <size>);`
```c
// 设置全缓冲
char buffer[1024];
setvbuf(fp, buffer, _IOFBF, sizeof(buffer));
```

---

**基本写法：刷新缓冲区**
`fflush(<fp>);`
```c
// 刷新文件缓冲区
fflush(fp);
```

---

## 获取文件大小

**基本写法：通过 fseek 和 ftell 获取文件大小**
`fseek(<fp>, 0, SEEK_END); long <size> = ftell(<fp>);`
```c
// 获取文件大小
fseek(fp, 0, SEEK_END);
long file_size = ftell(fp);
rewind(fp);
```

---

## 二进制文件读写

**结构体写法：写入结构体到二进制文件**
`fwrite(&<struct_var>, sizeof(<StructType>), 1, <fp>);`
```c
// 将结构体写入二进制文件
typedef struct { int id; char name[50]; } Record;
Record r = {1, "John"};
fwrite(&r, sizeof(Record), 1, fp);
```

---

**结构体读取写法：从二进制文件读取结构体**
`fread(&<struct_var>, sizeof(<StructType>), 1, <fp>);`
```c
// 从二进制文件读取结构体
Record r;
fread(&r, sizeof(Record), 1, fp);
```
