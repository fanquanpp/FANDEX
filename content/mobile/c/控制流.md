# 控制流

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## if-else 条件判断

**基本写法：if 语句**
`if (<condition>) { ... }`
```c
// 单条件判断
int score = 85;
if (score >= 60) {
    printf("Pass\n");
}
```

---

**多分支写法：if-else if-else**
`if (<condition>) { ... } else if (<condition>) { ... } else { ... }`
```c
// 多条件分支判断
int score = 85;
if (score >= 90) {
    printf("Excellent\n");
} else if (score >= 80) {
    printf("Very Good\n");
} else {
    printf("Fail\n");
}
```

---

**嵌套写法：嵌套 if-else**
`if (<condition>) { if (<condition>) { ... } else { ... } } else { ... }`
```c
// 嵌套条件判断
int age = 18;
int has_license = 1;
if (age >= 18) {
    if (has_license) {
        printf("You can drive\n");
    } else {
        printf("Need a license\n");
    }
} else {
    printf("Too young\n");
}
```

---

## switch-case 多分支选择

**基本写法：switch-case**
`switch (<expr>) { case <val>: ... break; [default: ...] }`
```c
// 根据成绩等级输出
char grade = 'B';
switch (grade) {
    case 'A':
        printf("Great!\n");
        break;
    case 'B':
        printf("Good!\n");
        break;
    default:
        printf("Unknown\n");
}
```

---

**穿透写法：多 case 共享代码块**
`case <val1>: case <val2>: ... break;`
```c
// 多个 case 执行相同代码
int month = 2;
int days;
switch (month) {
    case 1: case 3: case 5: case 7:
        days = 31;
        break;
    case 4: case 6: case 9:
        days = 30;
        break;
    default:
        days = 28;
}
```

---

## for 循环

**基本写法：for 循环**
`for (<init>; <condition>; <update>) { ... }`
```c
// 打印 0 到 9
for (int i = 0; i < 10; i++) {
    printf("%d ", i);
}
```

---

**嵌套写法：嵌套 for 循环**
`for (...) { for (...) { ... } }`
```c
// 打印乘法表
for (int i = 1; i <= 9; i++) {
    for (int j = 1; j <= i; j++) {
        printf("%d*%d=%d\t", j, i, i*j);
    }
    printf("\n");
}
```

---

**多变量写法：多变量 for 循环**
`for (<init1>, <init2>; <cond>; <update1>, <update2>) { ... }`
```c
// 使用多个循环变量
for (int i = 0, j = 10; i < j; i++, j--) {
    printf("i=%d, j=%d\n", i, j);
}
```

---

**无限写法：无限 for 循环**
`for (;;) { ... }`
```c
// 无限循环
for (;;) {
    printf("Loop\n");
}
```

---

## while 循环

**基本写法：while 循环**
`while (<condition>) { ... }`
```c
// 当条件为真时循环
int i = 0;
while (i < 10) {
    printf("%d ", i);
    i++;
}
```

---

**无限写法：无限 while 循环**
`while (1) { ... if (<condition>) break; }`
```c
// 无限循环带退出条件
int count = 0;
while (1) {
    count++;
    if (count >= 5) {
        break;
    }
}
```

---

## do-while 循环

**基本写法：do-while 循环**
`do { ... } while (<condition>);`
```c
// 至少执行一次的循环
int i = 10;
do {
    printf("Execute once\n");
    i--;
} while (i < 5);
```

---

## 循环控制语句

**break 写法：跳出循环**
`break;`
```c
// 当 i 等于 5 时退出循环
for (int i = 0; i < 10; i++) {
    if (i == 5) {
        break;
    }
    printf("%d ", i);
}
```

---

**continue 写法：跳过本次循环**
`continue;`
```c
// 跳过偶数
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) {
        continue;
    }
    printf("%d ", i);
}
```

---

**goto 写法：无条件跳转**
`goto <label>; ... <label>:`
```c
// 跳转到标签处
int i = 0;
start:
printf("i = %d\n", i);
i++;
if (i < 5) {
    goto start;
}
```

---

**goto 写法：跳出多层循环**
`goto <label>;`
```c
// 跳出多层嵌套循环
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        if (i == 1 && j == 1) {
            goto end_of_loops;
        }
    }
}
end_of_loops:
printf("Exited\n");
```

---

## 状态机实现

**switch 写法：使用 switch 实现状态机**
`while (<state> != FINAL) { switch (<state>) { ... } }`
```c
// 状态机循环
enum State { STATE_START, STATE_READING, STATE_FINISHED };
enum State current_state = STATE_START;
while (current_state != STATE_FINISHED) {
    switch (current_state) {
        case STATE_START:
            current_state = STATE_READING;
            break;
        case STATE_READING:
            current_state = STATE_FINISHED;
            break;
    }
}
```
