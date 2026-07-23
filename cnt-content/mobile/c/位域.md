# 位域

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 位域定义

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

**单字段写法：单字段位域**
`struct <Name> { <type> <member> : <bits>; };`
```c
// 单字段位域
struct SingleFlag {
    unsigned int flag : 1;
};
```

---

**多字段写法：多字段位域**
`struct <Name> { <type> <m1> : <bits>; <type> <m2> : <bits>; ... };`
```c
// 多字段位域
struct Status {
    unsigned int ready : 1;
    unsigned int error : 1;
    unsigned int busy : 1;
    unsigned int reserved : 5;
};
```

---

## 位域变量

**基本写法：声明位域变量**
`struct <Name> <var_name>;`
```c
// 声明位域变量
struct Flags flags;
```

---

**初始化写法：位域变量初始化**
`struct <Name> <var> = {<values>};`
```c
// 初始化位域变量
struct Flags flags = {1, 5, 10};
```

---

## 位域成员访问

**基本写法：访问位域成员**
`<var>.<member>`
```c
// 访问位域成员
struct Flags flags;
flags.a = 1;
```

---

**修改写法：修改位域成员值**
`<var>.<member> = <value>;`
```c
// 修改位域成员的值
struct Flags flags;
flags.b = 5;
```

---

**指针写法：通过指针访问位域成员**
`<ptr>-><member>`
```c
// 通过指针访问位域成员
struct Flags flags;
struct Flags *ptr = &flags;
ptr->a = 1;
```

---

## 位域与普通成员混合

**基本写法：位域与普通成员混合**
`struct <Name> { <type> <normal_member>; <type> <bit_member> : <bits>; ... };`
```c
// 位域与普通成员混合
struct Mixed {
    int id;
    unsigned int active : 1;
    unsigned int level : 3;
};
```

---

## 无名位域

**基本写法：无名位域用于填充**
`<type> : <bits>;`
```c
// 无名位域用于填充
struct Padded {
    unsigned int a : 4;
    unsigned int : 4;  // 填充 4 位
    unsigned int b : 8;
};
```

---

**对齐写法：无名位域用于对齐**
`<type> : 0;`
```c
// 无名位域宽度为 0，强制下一个成员从新存储单元开始
struct Aligned {
    unsigned int a : 4;
    unsigned int : 0;
    unsigned int b : 4;
};
```

---

## 位域大小

**基本写法：查看位域结构体大小**
`sizeof(struct <Name>)`
```c
// 查看位域结构体大小
struct Flags { unsigned int a : 1; unsigned int b : 3; };
printf("Size: %zu\n", sizeof(struct Flags));
```

---

## 位域应用

**硬件寄存器写法：使用位域映射硬件寄存器**
`struct <Name> { volatile <type> <member> : <bits>; ... };`
```c
// 使用位域映射硬件寄存器
struct UART_Reg {
    volatile unsigned int data : 8;
    volatile unsigned int parity : 1;
    volatile unsigned int stop : 1;
    volatile unsigned int enable : 1;
};
```

---

**标志位写法：使用位域管理标志**
`struct <Name> { <type> <flag1> : 1; <type> <flag2> : 1; ... };`
```c
// 使用位域管理多个标志
struct ProcessFlags {
    unsigned int running : 1;
    unsigned int paused : 1;
    unsigned int error : 1;
    unsigned int completed : 1;
};
```

---

## 位域与位运算对比

**位域写法：使用位域访问位**
`<var>.<member> = <value>;`
```c
// 使用位域访问位
struct Flags flags;
flags.a = 1;
```

---

**位运算写法：使用位运算访问位**
`<var> |= (1 << <bit>);`
```c
// 使用位运算设置位
unsigned int flags = 0;
flags |= (1 << 0);
```

---

**位运算写法：检查某一位**
`<var> & (1 << <bit>)`
```c
// 使用位运算检查位
unsigned int flags = 5;
if (flags & (1 << 0)) {
    printf("Bit 0 is set\n");
}
```

---

**位运算写法：清除某一位**
`<var> &= ~(1 << <bit>);`
```c
// 使用位运算清除位
unsigned int flags = 5;
flags &= ~(1 << 0);
```

---

## 位域限制

**跨平台写法：位域顺序与平台相关**
`struct <Name> { <type> <m1> : <bits>; <type> <m2> : <bits>; };`
```c
// 位域的内存布局与平台相关
struct CrossPlatform {
    unsigned int a : 1;
    unsigned int b : 7;
};
```
