# 结构体与联合体

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 结构体定义

**基本写法：结构体定义**
`struct <Name> { <type> <member>; ... };`
```c
// 定义 Point 结构体
struct Point {
    int x;
    int y;
};
```

---

**typedef 写法：结构体别名**
`typedef struct { <members> } <Name>;`
```c
// 定义 Employee 结构体类型
typedef struct {
    int id;
    char name[50];
    float salary;
} Employee;
```

---

**typedef 写法：为已定义结构体创建别名**
`typedef struct <Name> <Alias>;`
```c
// 为结构体创建别名
struct Point { int x; int y; };
typedef struct Point Point;
```

---

## 结构体变量

**基本写法：声明结构体变量**
`struct <Name> <var_name>;`
```c
// 声明结构体变量
struct Point p1;
```

---

**typedef 写法：使用别名声明**
`<TypeName> <var_name>;`
```c
// 使用类型别名声明
Employee emp;
```

---

**初始化写法：声明并初始化**
`struct <Name> <var> = {<values>};`
```c
// 初始化结构体变量
struct Point p = {10, 20};
```

---

**指定初始化写法：按成员名初始化**
`struct <Name> <var> = {.<member> = <value>, ...};`
```c
// 按成员名初始化
struct Point p = {.x = 10, .y = 20};
```

---

**赋值写法：结构体变量赋值**
`<var1> = <var2>;`
```c
// 结构体变量直接赋值
struct Point p1 = {10, 20};
struct Point p2;
p2 = p1;
```

---

## 结构体成员访问

**基本写法：访问成员**
`<var>.<member>`
```c
// 使用点运算符访问成员
struct Point p = {10, 20};
printf("x: %d\n", p.x);
```

---

**修改写法：修改成员值**
`<var>.<member> = <value>;`
```c
// 修改结构体成员的值
struct Point p = {10, 20};
p.x = 30;
```

---

**指针写法：通过指针访问成员**
`<ptr>-><member>`
```c
// 使用箭头运算符访问成员
struct Point p = {10, 20};
struct Point *ptr = &p;
printf("x: %d\n", ptr->x);
```

---

## 嵌套结构体

**基本写法：结构体嵌套**
`struct <Outer> { struct <Inner> <member>; ... };`
```c
// 嵌套结构体定义
struct Date { int year; int month; int day; };
struct Person {
    char name[50];
    struct Date birthday;
};
```

---

**访问写法：访问嵌套成员**
`<var>.<inner>.<member>`
```c
// 访问嵌套结构体成员
struct Person person;
person.birthday.year = 1990;
```

---

## 结构体数组

**基本写法：结构体数组声明**
`struct <Name> <array_name>[<size>];`
```c
// 声明结构体数组
struct Point points[10];
```

---

**初始化写法：结构体数组初始化**
`struct <Name> <array_name>[<size>] = { {<values>}, ... };`
```c
// 初始化结构体数组
struct Point pts[3] = {{1, 2}, {3, 4}, {5, 6}};
```

---

**遍历写法：遍历结构体数组**
`for (int i = 0; i < <size>; i++) { ... <array>[i].<member> ... }`
```c
// 遍历结构体数组
struct Point pts[3] = {{1, 2}, {3, 4}, {5, 6}};
for (int i = 0; i < 3; i++) {
    printf("(%d, %d)\n", pts[i].x, pts[i].y);
}
```

---

## 结构体与函数

**传值写法：结构体作为函数参数**
`<return_type> <func>(struct <Name> <param>) { ... }`
```c
// 传递结构体副本
void print_point(struct Point p) {
    printf("(%d, %d)\n", p.x, p.y);
}
```

---

**传址写法：结构体指针作为函数参数**
`<return_type> <func>(struct <Name> *<param>) { ... }`
```c
// 传递结构体指针
void move_point(struct Point *p, int dx, int dy) {
    p->x += dx;
    p->y += dy;
}
```

---

**返回写法：函数返回结构体**
`struct <Name> <func>(<params>) { ... return <struct_var>; }`
```c
// 返回结构体
struct Point create_point(int x, int y) {
    struct Point p = {x, y};
    return p;
}
```

---

## 位域

**基本写法：位域定义**
`struct <Name> { <type> <member> : <bits>; ... };`
```c
// 定义位域结构体
struct Flags {
    unsigned int a : 1;
    unsigned int b : 3;
    unsigned int c : 4;
};
```

---

**访问写法：访问位域成员**
`<var>.<member>`
```c
// 访问位域成员
struct Flags f;
f.a = 1;
f.b = 5;
```

---

## 联合体

**基本写法：联合体定义**
`union <Name> { <type> <member>; ... };`
```c
// 定义联合体
union Data {
    int i;
    float f;
    char str[20];
};
```

---

**基本写法：联合体变量声明与初始化**
`union <Name> <var>;`
```c
// 声明联合体变量
union Data data;
```

---

**访问写法：访问联合体成员**
`<var>.<member>`
```c
// 访问联合体成员
union Data data;
data.i = 10;
printf("%d\n", data.i);
```

---

**指针写法：通过指针访问联合体成员**
`<ptr>-><member>`
```c
// 通过指针访问联合体成员
union Data data;
union Data *ptr = &data;
ptr->f = 3.14f;
```

---

## 结构体与联合体混合

**基本写法：结构体包含联合体**
`struct <Name> { <type> <tag>; union <UnionName> <member>; };`
```c
// 结构体包含联合体
struct Value {
    int type;
    union {
        int i;
        float f;
    } data;
};
```

---

**访问写法：访问结构体中的联合体成员**
`<var>.<union_member>.<member>`
```c
// 访问结构体中的联合体成员
struct Value v;
v.type = 0;
v.data.i = 100;
```

---

## 结构体内存对齐

**基本写法：查看结构体大小**
`sizeof(struct <Name>)`
```c
// 查看结构体大小
struct Point { int x; int y; };
printf("Size: %zu\n", sizeof(struct Point));
```

---

**对齐控制写法：指定对齐方式**
`#pragma pack(<n>)`
```c
// 设置 1 字节对齐
#pragma pack(1)
struct Packed {
    char c;
    int i;
};
#pragma pack()
```

---

**对齐属性写法：使用 __attribute__**
`struct __attribute__((aligned(<n>))) <Name> { ... };`
```c
// 指定结构体对齐为 16 字节
struct __attribute__((aligned(16))) AlignedStruct {
    int x;
};
```
