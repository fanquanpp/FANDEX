---
order: 90
title: 控制流：分支、循环与跳转
module: 'c'
category: 计算机科学
difficulty: beginner
description: 以成绩分档的三种写法（if 链、switch 分桶、表驱动）开题：悬空 else 配对规则、= 误作 == 的 -Wparentheses 实录、switch 穿透语义与 C23 [[fallthrough]]、case 整型常量限制与 1023 条下限、GNU 区间 case 扩展、for/while/do-while 心智模型与互化、goto 的两个可辩护用途（多层跳出与错误清理）、分号空语句与浮点累积误差调试实录，switch 状态机收尾。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/090-FunctionDetailed'
  - 'c/055-ScopeStorageLinkage'
  - 'c/110-EnumTypedef'
  - 'c/540-AttributeCompilerExtension'
prerequisites:
  - 'c/050-VariableConstant'
  - 'c/060-OperatorExpression'
---

## 前置知识

- 已完成 [变量与常量](/c/050-VariableConstant)：会声明变量、赋初值、用 printf 打印；
- 已完成 [运算符与表达式](/c/060-OperatorExpression)：认识 `>`、`>=`、`&&`、`||`——分支条件全由它们拼出来。

没读过 060 也能往下读，用到的运算符都会当场解释。

> 分工说明：本篇讲「程序怎么拐弯」。变量在哪个范围可见、能活多久，[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 负责；把控制流打包成函数、以及递归这种自己调用自己的控制流，见 [函数](/c/090-FunctionDetailed)。

## 学习目标

读完本文你将能够：

1. 用 if 链、switch、表驱动实现同一个分档逻辑，说出三者各自适用的场景；
2. 解释悬空 else 的配对规则与 switch 的穿透（fallthrough）语义，会用 C23 的 `[[fallthrough]]` 标注故意穿透；
3. 在 for、while、do-while 之间互相改写，按「次数已知、条件驱动、至少一次」选型；
4. 用 break、continue、goto、return 控制跳转，写出 goto 错误清理模式；
5. 当场识别并修复分号空语句、差一错误、浮点累积误差三类经典事故。

预计 60 到 80 分钟，含 6 组动手实验、2 道预测题与 1 道挑战题。

## 1. 问题引入：同一件事的三种写法

任务：百分制成绩分五档——90 及以上 Excellent，80 到 89 Very Good，60 到 79 Pass，其余 Fail。三种都能跑、输出一致的写法：

```c
/* grade.c：成绩分档——三种写法 */
#include <stdio.h>

int main(void) {
    int score = 85;
    /* 写法一：if 链，从高到低逐档排除 */
    if (score >= 90) {
        printf("Excellent\n");
    } else if (score >= 80) {
        printf("Very Good\n");
    } else if (score >= 60) {
        printf("Pass\n");
    } else {
        printf("Fail\n");
    }
    /* 写法二：switch。先算 score / 10，把区间变成离散值 */
    switch (score / 10) {
    case 10: case 9: printf("Excellent\n"); break;
    case 8:          printf("Very Good\n"); break;
    case 7: case 6:  printf("Pass\n");      break;
    default:         printf("Fail\n");
    }
    /* 写法三：表驱动。答案排进数组，用下标直接查 */
    static const char *rank[] = {
        "Fail", "Fail", "Fail", "Fail", "Fail", "Fail",
        "Pass", "Pass", "Very Good", "Excellent", "Excellent"
    };
    printf("%s\n", rank[score / 10]);
    return 0;
}
```

编译运行（`gcc -Wall -Wextra -g grade.c -o grade`），三个写法各打印一行 `Very Good`。三段代码引出三个问题：switch 为什么必须先算 `score / 10`（case 有硬性限制，3.4 节拆）；写法三一行分支都没有，分类逻辑藏到了哪（下标即判断）；以及一个地雷——score 不在 0 到 100 之间会怎样。修改实验一：把 score 改成 105 再跑，三个写法一致地打印 `Excellent`——不崩，但荒唐；再改成 150，if 链与 switch 照旧，表驱动版却去查 `rank[15]`——数组越界，是 [运算符与表达式](/c/060-OperatorExpression) 里见过的那类「标准不管」的未定义行为。分支写对只是第一步，边界查清才算完，这一课第 6 节还会再上。

## 2. 分支之一：if / else

### 2.1 心智模型：非零即真

if 括号里的判定规则只有一条：**0 为假，非 0 为真**（C23 起 `bool`/`true`/`false` 成为关键字，这条规则没变）。if 链的顺序本身就是语义——从高到低逐档排除后，`else if (score >= 80)` 不必再写 `&& score < 90`，能走到这里的都不到 90。嵌套同理：if 里再套 if，就是「先过外层条件，再查内层」。

### 2.2 悬空 else：配对看语法，不看缩进

```c
int a = -1, b = 5;
if (a > 0)
    if (b > 0)
        printf("both positive\n");
else
    printf("??? \n");        /* 缩进说它属于外层 if——缩进在撒谎 */
```

规则：**else 永远跟最近的、还没有伙伴的 if 配对**。这个 else 属于内层 `if (b > 0)`，于是 `a <= 0` 时什么都不打印，`a > 0 且 b <= 0` 时反而打印 `???`。修改实验二：给外层 if 加大括号，else 立刻换主。由此得出本文最重要的风格纪律：**哪怕分支只有一句也写大括号**——悬空 else 与 6.1 节的分号事故，根治都靠这一条。

### 2.3 = 误作 ==：一个等号的代价

```c
/* typo.c：想比较，写成了赋值 */
#include <stdio.h>
int main(void) {
    int has_key = 0;
    if (has_key = 1) {               /* 赋值表达式非 0：恒真 */
        printf("door opened\n");
    }
    printf("has_key = %d\n", has_key);   /* 已被顺手改成 1 */
    return 0;
}
```

运行打印两行 `door opened` 与 `has_key = 1`：条件恒真（赋值表达式的值就是被赋的值），且变量被顺手改写——双重大祸。编译实录，`-Wall` 里的 `-Wparentheses` 正是为此而生：

```text
$ gcc -Wall -Wextra -g typo.c -o typo
typo.c:5:9: warning: suggest parentheses around assignment used as truth value [-Wparentheses]
    5 |     if (has_key = 1) {
      |         ^~~~~~~
```

看到它先怀疑自己写错，别急着加括号糊弄过去。反过来，**故意**用赋值当条件时（如 `while ((c = getchar()) != EOF)`），把表达式括起来，等于告诉编译器和读者「我是故意的」。二选一**取值**另有极简形态 `int max = (a > b) ? a : b;`——三目运算符只能放一个表达式，分支里要多做事就老实用 if。还有一条安全铁律来自短路求值：`if (p != NULL && p->value == 5)` 顺序不能倒，左边为假时右边不算，倒了就是先解引用空指针；机理 060 已详述，此处只用不重讲。

## 3. 分支之二：switch

### 3.1 心智模型：跳到写着这个数的标签

switch 的语义：算出控制表达式的值，直接跳到写着这个值的 case 标签处接着执行——不是从上往下逐条比。谁都不匹配时进 `default:`（最多一个，习惯放末尾）；没有 default 就什么都不执行。它与 if 链的关键差异在**值的来源**：switch 只看一个表达式的离散取值，if 链可组合任意条件。

### 3.2 穿透（fallthrough）：忘了 break，就滑进下一档

case 只是标签，break 才是「离开 switch」的动作。漏写 break，本档执行完会**滑进下一档**：

```c
    char grade = 'A';
    switch (grade) {
    case 'A':
        printf("Great!\n");      /* 没有 break：滑进 case 'B' */
    case 'B':
        printf("Good!\n");
        break;
    default:
        printf("Unknown\n");
    }
```

grade 为 'A' 时打印 `Great!` 加 `Good!` 两行。修改实验三：把 grade 改成 'B' 再跑，只打 `Good!`——从中间进来的不会再往上滑。穿透也确有正当用途：**多个值共享同一档逻辑**，第 1 节的 `case 10: case 9:` 与月份天数都是：

```c
    switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12: days = 31; break;
    case 4: case 6: case 9: case 11:                          days = 30; break;
    case 2:                                                   days = 28; break;
    default:                                                  days = 0;
    }
```

### 3.3 C23 的 [[fallthrough]]：给故意穿透办通行证

编译器对「可疑的穿透」会发警告，故意的和手滑的混在一起难分真假。C23 给了标准答案：在滑落的位置放一条 `[[fallthrough]];`，宣告「我就是想滑下去」，警告即哑：

```c
    switch (level) {
    case 3:
        prepare_hard();
        [[fallthrough]];         /* C23：宣告故意穿透 */
    case 2:
        prepare_normal();
        break;
    }
```

两条规则：它是空声明，且下一项必须是本 switch 的 case 或 default 标签，否则程序本身不合法；它只表示意图，什么都不做。用上它需要 C23：GCC 15 起默认 `-std=gnu23` 直接可用，Clang 加 `-std=c23`，时间线见 [C23 与 C2y](/c/520-C23CoreFeatures)；老标准下的编译器扩展写法（如 `__attribute__((fallthrough))`）在 [编译器属性与扩展](/c/540-AttributeCompilerExtension) 承接。

### 3.4 case 的三条硬规矩

1. **整型常量**。控制表达式必须是整数类型（含 char 与枚举），case 必须是编译期算得出的**整型常量表达式**——`case score / 10:` 不合法，第 1 节那种「switch 里算好分桶值，case 写常量」才是标准姿势。浮点、字符串都不行，`switch` 一个 double 直接编译错。
2. **数量下限 1023**。C 标准的翻译限制一节（5.2.4.1）要求每个实现至少支持 1023 个 case 标签。日常到不了千级分支——真写出来大概率说明该查表了。
3. **区间写法是 GNU 扩展**。`case 1 ... 5:` 能圈一段值，但它是 GNU 扩展不是标准 C：GCC 认、Clang 兼容，MSVC 不认。要用的话省略号两边必须留空格——`case 1...5` 里的 `1...` 会被当成浮点字面量解析。跨编译器代码老实写 `case 1: case 2: ... case 5:`（GCC 手册：https://gcc.gnu.org/onlinedocs/gcc/Case-Ranges.html）。

### 3.5 switch 还是用 if 链：选型三条

- 值多、离散、来自同一个表达式（状态码、菜单项、枚举）：switch——分档清晰，还能被编译成跳转表，分支一多比逐条比较的 if 链整齐也往往更快；
- 条件是区间、多变量组合、浮点比较：if 链（switch 表达不了）；
- 分支就两三个：if/else 最省事。

## 4. 循环：for、while、do-while

### 4.1 三种循环，三种心智模型

三种循环能力等价（可互化），差别在**把什么写在显眼处**：

| 写法 | 抬头装什么 | 何时判断条件 | 最少执行几次 |
| --- | --- | --- | --- |
| for | 初始化、条件、步进三件套 | 每轮开头 | 0 |
| while | 只有条件 | 每轮开头 | 0 |
| do-while | 条件在尾部 | 每轮结尾 | 1 |

**for：数着次数做。** 次数已知时三件事收进抬头，循环体只剩正事：`for (int i = 0; i < 10; i++) { printf("%d ", i); }`。

**while：次数说不清就先问条件。** 典型如输入校验——不知道用户要错几次：

```c
    int age = -1;
    printf("请输入年龄 (0 到 120): ");
    if (scanf("%d", &age) != 1) return 1;    /* 读到的不是数字 */
    while (age < 0 || age > 120) {           /* 数字但越界：重问 */
        printf("超出范围，重输: ");
        if (scanf("%d", &age) != 1) return 1;
    }
    printf("age = %d\n", age);
```

**do-while：先干一次再说。** 菜单必须至少显示一次才谈得上选什么，尾部判断正好匹配（4.4 节）。

### 4.2 互化：同一件事的三种排版

`for (int i = 0; i < 10; i++) { work(i); }` 与「`int i = 0;` 在前、`while (i < 10) { work(i); i++; }`」完全等价——for 抬头就是 while 版的三段排版。for 的三段都可以空：`for (;;)` 就是死循环。选型口诀：**次数已知 for，条件驱动 while，至少一次 do-while**。嵌套是循环的常规组合：九九表只要两层 for（外层行 i 从 1 到 9，内层列 j 从 1 到 i，一行 printf 拼完再换行），动手写一个跑通再继续。

### 4.3 循环变量的作用域

`for (int i = 0; ...)` 的 i **只活在循环内**（C99 起允许在抬头声明），出循环就没了；结束后还要用 i，就提到外面声明。两个相邻循环各写一个 `int i` 互不干扰——这正是把名字圈在最小范围里的好处。完整规则在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)。

### 4.4 死循环与 do-while 的主场

`while (1)` 与 `for (;;)` 语义相同：`for (;;)` 直说「没有条件可判断」，`while (1)` 更直白，团队二选一保持一致。死循环不是错误——嵌入式固件的主循环就是程序的一生（见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)）——错的是**没有出口**：先想好 break、return 或外部信号在哪。

```c
    int choice;
    do {
        printf("\n1. 存款  2. 取款  3. 查询  0. 退出\n请选择: ");
        if (scanf("%d", &choice) != 1) return 1;    /* 坏输入简化处理 */
        switch (choice) {
        case 1: printf("deposit\n");  break;
        case 2: printf("withdraw\n"); break;
        case 3: printf("balance\n");  break;
        case 0: printf("bye\n");      break;
        default: printf("invalid choice\n");
        }
    } while (choice != 0);
```

输入 5 会打印 `invalid choice` 后重新显示菜单，输入 0 打印 `bye` 后退出。修改实验四：把 do-while 换成 while——菜单第一次就不显示了，除非在循环前复制一份显示代码。「先执行后判断」正是 do-while 存在的理由。这个例子还演示了 switch 套在循环里：case 里的 break 只离开 switch，循环由 `while (choice != 0)` 收放。还有一个隐形开销：`for (int i = 0; i < strlen(s); i++)` 每轮调一次 strlen——先把长度存进变量再比较，编译器未必能替你外提；至于循环展开这类微优化，交给 `-O2` 下的编译器，手写只会损害可读性。

## 5. 跳转：break、continue、goto、return

### 5.1 break 与 continue：只影响最近一层

break 立刻结束**最近的**一层循环或 switch——switch 里它的含义是「离开 switch」，循环里是「离开循环」，嵌套时各司其职（4.4 节的菜单正是如此）。continue 跳过本轮剩余语句直接进下一轮（for 还会先执行步进，6.4 节的主角）：

```c
    for (int i = 0; i < 10; i++) {
        if (i == 5) break;           /* 打到 4 为止 */
        if (i % 2 == 0) continue;    /* 偶数跳过 */
        printf("%d ", i);
    }
```

预期输出 `1 3 `。想一次过滤更多数据（比如跳过数组里的 0），把条件换成 `numbers[i] == 0` 即可，骨架不变。

### 5.2 goto 的两个可辩护用途

先说丑话：用 goto 当循环用、在函数里随便乱跳，是任何团队都会打回的坏味道，本文不教。C 社区至今保留 goto，因为有两个场景它确实最干净。

**用途一：从多层循环里一步跳出。** 逐层 break 要给每层加判断，标志变量又啰嗦：

```c
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (matrix[i][j] == 5) {
                printf("found at row %d, col %d\n", i, j);
                goto done;      /* 一次跳出两层 */
            }
        }
    }
    printf("not found\n");
done:
```

顺带一提：把查找拆成独立函数后，return 就能替掉 goto——这招在下一篇兑现。

**用途二：错误路径共享同一段清理代码。** C 没有 try/finally；函数里先后拿到文件、内存，中途任何一步失败都要把已拿到的一步步还回去，每个失败点手抄一遍 free 加 fclose 很快失控。goto 向前跳到统一清理标签，是内核与库代码的标准姿势：

```c
/* cleanup.c：错误路径汇入同一段清理；0 成功，非 0 是失败码 */
#include <stdio.h>
#include <stdlib.h>

int read_four(const char *path, int **out) {
    int ret = 1;
    FILE *fp = fopen(path, "r");
    if (fp == NULL) return 1;   /* 还没拿到什么，直接走 */
    int *data = malloc(4 * sizeof *data);
    if (data == NULL) { ret = 2; goto close_file; }   /* 已开文件：至少要关 */
    for (int i = 0; i < 4; i++) {
        if (fscanf(fp, "%d", &data[i]) != 1) { ret = 3; goto free_data; }
    }
    *out = data;                /* 成功：所有权移交调用方 */
    ret = 0;
    goto close_file;
free_data:
    free(data);
close_file:
    fclose(fp);
    return ret;
}
int main(void) {
    int *values = NULL;
    int err = read_four("config.txt", &values);
    if (err == 0) {
        for (int i = 0; i < 4; i++) printf("%d ", values[i]);
        printf("\n");
        free(values);           /* 谁接手谁释放 */
    }
    return err;
}
```

清理顺序与获取顺序相反（后拿的先还），goto 只向前跳、标签只服务清理。malloc 判 NULL 与 free 的纪律来自 [动态内存](/c/200-DynamicMemoryManagement)。

### 5.3 return：跳转里的最常用款

return 立刻结束当前函数并带回返回值，「早返回」让主逻辑不必包进 else：

```c
int find_element(int arr[], int size, int target) {
    for (int i = 0; i < size; i++) {
        if (arr[i] == target) return i;   /* 找到：立刻离开 */
    }
    return -1;                            /* 找不到的约定值 */
}
```

main 里的 return 还有特殊身份——程序的退出码，实验在下一篇第 8 节。

## 6. 常见错误与调试实录

### 6.1 分号空语句吞掉循环体

```c
    int i;
    int sum = 0;
    for (i = 1; i <= 10; i++);      /* 循环体是这条空语句 */
    sum += i;                       /* 缩进在撒谎：这行不在循环里 */
    printf("sum = %d\n", sum);      /* 打印 11，不是 55 */
```

for 抬头自带分号，紧跟的 `;` 就成了整个循环体——空转十次；`sum += i;` 是循环外的下一条语句，执行一次时 i 已是 11。if 后多打分号同款：`if (score >= 60); printf("Pass\n");` 无论及不及格都打印。编译器能帮一半：`-Wextra` 里的 `-Wempty-body` 抓 if/else/do-while 后的空语句，for/while 抬头后的分号它管不到。根治靠 2.2 节的纪律：哪怕一句也写大括号。

### 6.2 差一错误：`<`、`<=` 与数组越界

```c
/* bounds.c：差一错误 */
#include <stdio.h>

int main(void) {
    int arr[5] = {1, 2, 3, 4, 5};
    for (int i = 0; i <= 5; i++) printf("%d ", arr[i]);   /* i == 5 时越界 */
    printf("\n");
    return 0;
}
```

一次典型输出（越界是未定义行为，每次可能不同）：`1 2 3 4 5 32765`——`arr[5]` 读出了垃圾。写成赋值还会悄悄改坏隔壁变量，也可能看起来一切「正常」。ASan 重跑当场点名（用 `-fsanitize=address` 编译）：

```text
==23105==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffd8a2b3f34 READ of size 4
    #0 0x5b2c... in main bounds.c:6
```

纪律：遍历一律 `i < n`，元素个数用 `sizeof arr / sizeof arr[0]` 现算。ASan 完整用法见 [动态内存](/c/200-DynamicMemoryManagement)。

### 6.3 浮点做循环条件：累积误差实验

```c
/* float_loop.c：0.1 加十次，到 1 了吗？ */
#include <stdio.h>

int main(void) {
    double x = 0.0;
    for (int i = 0; i <= 11; i++) {
        printf("i=%2d  x=%.17f  x != 1.0 ? %s\n", i, x, x != 1.0 ? "yes" : "no");
        x += 0.1;
    }
    return 0;
}
```

关键两行（每次运行一致）：`i=10  x=0.99999999999999989  x != 1.0 ? yes`，`i=11  x=1.09999999999999987  x != 1.0 ? yes`。x 永远精确踩不到 1.0：十进制 0.1 在二进制里是无限循环小数，每次累加都带进误差。于是 `while (x != 1.0) { x += 0.1; }` 是死循环。修法：浮点条件只用 `<` 或 `>`，等值判断永远回避；要精确计数就用整数计数器。0.1 为什么存不下，[数据类型详解](/c/040-DataTypeDetailed) 有完整交代。

### 6.4 continue 在 for 与 while 里不等价

for 里的 continue 跳到**步进**，while 里的 continue 直接跳到**条件判断**。这条差异能造死循环：

```c
    int i = 0;
    while (i < 10) {
        if (i % 2 == 0) continue;   /* i 停在 0：i++ 永远轮不到 */
        printf("%d ", i);
        i++;
    }
```

第一轮 i 为 0 就命中 continue，`i++` 被跳过，条件永远成立——程序不再输出。同样的过滤用 for 写就安全（continue 落点是 `i++`，过滤偶数打印 `1 3 5 7 9 `）。在 while 里用 continue，先确认步进语句不在它的「跳过区」里。嵌套过深也是事故温床：读到第四层就记不住自己在哪，嵌套超过三层就把内层逻辑拆成独立函数（`is_even(n)`、`process_row(i)`），每层各回一层缩进——拆法正是下一篇的主题。

## 7. 应用：while + switch 写状态机

状态机把「程序现在处于什么阶段」存成变量，每轮按状态分发处理、决定去向。菜单的下一步取决于用户输入，状态机的下一步取决于**当前状态与数据**——协议解析、词法分析、游戏 AI 全是它的形状：

```c
/* state.c：while + switch = 状态机 */
#include <stdio.h>
int main(void) {
    enum state { START, READING, DONE };    /* enum 先混个眼熟，110 篇讲透 */
    enum state s = START;
    int processed = 0;
    while (s != DONE) {
        switch (s) {
        case START:  printf("start\n"); s = READING; break;
        case READING:
            printf("reading %d\n", processed);
            if (++processed >= 3) s = DONE;   /* 处理满 3 条收工 */
            break;
        default:
            break;
        }
    }
    printf("done\n");
    return 0;
}
```

依次打印 `start`、`reading 0` 到 `reading 2`、`done`。一处特别提醒：状态机对忘写 break 零容忍——case 忘 break 时状态会「串联转移」，且循环每轮都进 switch，症状比普通 switch 更隐蔽。给每个 case 配齐 break（或 `[[fallthrough]]`）是硬纪律。

## 8. 实际项目中的使用场景

- **输入校验与哨兵循环**：配置解析、CLI 交互，while 接住任意次错误输入，`-1` 之类哨兵值结束读取；
- **嵌入式主循环**：`for (;;)` 包住固件的一生，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- **错误清理 goto 链**：内核驱动、库函数里成对资源的标准收尾（5.2 节），「谁分配谁释放」的跨文件约定见 [多文件编译](/c/310-MultiFileCompilation)；
- **协议与文本解析状态机**：逐字节喂给 switch 状态机，比层层嵌套 if 可读一个量级；**表驱动配置**（按键映射、菜单项排进数组）加一项只改数据不改分支——第 1 节写法三的工程价值。

## 9. 小练习

预测题一（5 分钟，先写答案再运行）：

```c
int i, total = 0;
for (i = 0; i < 5; i++);
    total += 10;
printf("%d\n", total);
```

参考答案（先写再看）：打印 `10`——循环体是那条空语句，`total += 10;` 在循环结束后只执行一次。

预测题二（5 分钟）：

```c
int x = 2;
switch (x) {
case 1: printf("one ");
case 2: printf("two ");
case 3: printf("three "); break;
case 4: printf("four ");
}
```

参考答案（先写再看）：打印 `two three `——从 case 2 进，无 break 滑到 case 3，被 break 收住；case 1 与 case 4 根本不进。

挑战题（30 分钟，不看提示先动手）：把第 1 节的表驱动版升级成可反复输入：输入成绩打印档位，越界（小于 0 或大于 100）提示重输，输入 -1 退出。

提示（思路方向）：「至少问一次、之后按输入决定是否继续」——do-while 或 while 加 continue 都行；下标计算前先做 0 到 100 范围检查。展开（关键点）：`scanf` 返回成功读取的项数，读到字母要处理（简化起见直接退出也算过关，否则坏输入留在输入流里会死循环）；-1 是哨兵值，判断顺序要在范围检查之前；进表前已保证 `score / 10` 落在 0 到 10，rank 表 11 个元素刚好。验收清单：输入 85 打印 `Very Good`；输入 105 提示重输；输入 -1 退出且不打印档位；输入字母不死循环。

### 练习库：分支专题五题（课堂节奏：先 if/else 版，再优化版）

以下五题来自分支教学的经典题组，每题都练「分段怎么切、边界归谁」这一件事。

题一（运费分段，10 分钟）：运输公司按重量计费：不超过 10 公斤每公斤 5 元；超过 10 公斤的部分每公斤 3 元。输入重量，输出运费。
提示（思路方向）：两段式的写法是「底价 + 超出部分」：`fee = 10 * 5 + (w > 10 ? (w - 10) * 3 : 0)`——先判断要不要分段，再算超出量。易错点是写成两段互相覆盖的 `if (w <= 10) fee = w*5; if (w > 10) fee = w*3;`——第二段漏加底价。

参考实现（先自己写，写完再对照）：

```c
double freight(double kg) {
    if (kg <= 10) return kg * 5;
    return 10 * 5 + (kg - 10) * 3;   /* 底价 + 超出部分：边界 10 只算一次 */
}
```

题二（个人所得税，15 分钟）：月收入分段税率——不超过 3000 元 3%；3000 到 12000 元部分 10%；超过 12000 元部分 20%。输入收入输出税额。
提示（思路方向）：分段累进的关键是「每段只对本段内的部分征税」：先扣满低段、再算中段、最后算高段，三个 if 依次判断「够不够得着这一段」。

参考实现（先自己写，写完再对照）：

```c
double tax(double income) {
    double t = 0;
    if (income > 12000) { t += (income - 12000) * 0.20; income = 12000; }
    if (income > 3000)  { t += (income - 3000) * 0.10;  income = 3000; }
    t += income * 0.03;                    /* 剩余部分全按最低档 */
    return t;
}
```

读法：**从高往低削**——每档把超出部分收走后，把收入「封顶」到本档上限，下一档继续。这套「封顶递推」写法没有嵌套，边界（恰好 3000、恰好 12000）各自只属于一档，是分段计费的标准形态。

题三（模拟计算器，if 与 switch 双解，20 分钟）：输入两个数与一个运算符（+ - * /），输出结果；除数为 0 要有提示。
提示（思路方向）：if 版用 `if (op == '+') ...` 链；switch 版 `switch (op)` 每个分支算完 break——两版写完对照，「default 兜非法运算符」两边都不能少。易错点：switch 的 case 后写 `case '+':` 是字符常量（单引号），写成 `"+"` 编译不过。

参考实现（先自己写，写完再对照，以 switch 版为例）：

```c
double calc(double a, double b, char op, int *ok) {
    *ok = 1;
    switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/':
        if (b == 0) { *ok = 0; return 0; }   /* 除零是运行期数据问题，用标志位而非 assert */
        return a / b;
    default:  *ok = 0; return 0;              /* 非法运算符 */
    }
}
```

题四（闰年判断，10 分钟）：输入年份，输出是否闰年。规则：能被 4 整除但不能被 100 整除，或能被 400 整除。
提示（思路方向）：把中文规则直译成逻辑表达式 `(y % 4 == 0 && y % 100 != 0) || y % 400 == 0`——注意「或」的两侧优先级，`&&` 高于 `||` 所以两边不用加括号但加上更易读。验收：2000 闰、1900 平、2024 闰、2023 平，四个数一起测。

题五（每月天数，三解法对照，20 分钟）：输入年月，输出该月天数。解法一：if-else 链按月枚举 31/30 天，2 月单独判闰年；解法二：把天数表存进数组 `{31,28,31,...}`，下标访问后修正 2 月；解法三：switch 按 30 天的月份分组 fallthrough。三种解法都写出来，对比哪一种改起来最不容易错。
提示（思路方向）：解法二是「数据代替控制流」——新增需求（如格里高利历前的差异）只改表不改逻辑；解法三故意利用 fallthrough（`case 4: case 6: case 9: case 11:` 共享 30 天），是穿透语法的正当用途——与第 3.2 节「漏 break 事故」互为正反面。

参考实现（先自己写，写完再对照，以解法二为例）：

```c
int days_in_month(int year, int month, int *ok) {
    static const int d[] = {31,28,31,30,31,30,31,31,30,31,30,31};
    if (month < 1 || month > 12) { *ok = 0; return 0; }
    *ok = 1;
    int leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    return d[month - 1] + (month == 2 && leap ? 1 : 0);
}
```

### 课件易错点复盘：分支的三类高频翻车

这五题的教学价值一半在题面，一半在它们共同踩过的三类坑，对照自查：

1. **switch 漏 break**：题三是重灾区——每个 case 是「入口标签」不是「独立区间」，算完不 break 就滑进下一档（第 3.2 节的穿透机制）。防法：每写完一个 case 立刻补 break 或显式 `[[fallthrough]]`（第 3.3 节）；
2. **else 配对看语法不看缩进**：嵌套 if 里 `else` 永远跟最近的、未配对的 `if` 结合——缩进是写给人看的，编译器不认。防法：嵌套超过一层就加花括号，或按第 2.2 节的「提前返回」拍平；
3. **嵌套过深**：if 套 switch 套 if 的三层结构，每层都要人脑记一个隐含条件。防法：把「非法输入先挡掉」的卫语句放最前面，主逻辑保持单层——题三的 `*ok = 0` 提前返回就是这一手。

## 10. 与之前和之后的知识的关系

- 往前：[变量与常量](/c/050-VariableConstant) 提供条件里的变量；[运算符与表达式](/c/060-OperatorExpression) 的比较、逻辑运算符与短路求值是条件的原料；
- 旁支：循环变量为什么出循环就消失，[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 讲透；状态机的 `enum state` 在 [枚举与 typedef](/c/110-EnumTypedef) 展开；`[[fallthrough]]` 之外的编译器属性在 [编译器属性与扩展](/c/540-AttributeCompilerExtension)；
- 往后：把循环体拆成函数、用 return 替掉多层 goto，在 [函数](/c/090-FunctionDetailed)；递归是「自己调用自己」的另一种循环形态，同篇开讲。

## 11. 官方文档

- switch 语句（cppreference C）：https://en.cppreference.com/w/c/language/switch
- [[fallthrough]] 属性（cppreference C）：https://en.cppreference.com/w/c/language/attributes/fallthrough
- GCC Case Ranges（区间 case 的 GNU 扩展说明）：https://gcc.gnu.org/onlinedocs/gcc/Case-Ranges.html
- GCC 警告选项（-Wparentheses、-Wempty-body 等）：https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

## 12. 自我检查

- 能默写三种分档写法，并讲清 switch 与 if 链的选型依据；
- 能解释悬空 else 配对规则、switch 穿透语义，知道 `[[fallthrough]]` 放在哪一行；
- 能把一段嵌套循环在 for/while/do-while 之间互化，说出 continue 在两者里的不同落点；
- 看到 `if (x = 5)`、`for (...);`、`while (x != 1.0) x += 0.1;` 能立刻指出病灶与修法。

## 本章总结

分支两条路：if/else 管任意条件（非零即真、else 跟最近的 if、常写大括号），switch 管单个表达式的离散取值（case 必须整型常量、忘 break 会穿透、故意穿透用 C23 的 `[[fallthrough]]`、千级分支该查表）。循环三个形：次数已知用 for，条件驱动用 while，至少一次用 do-while，三者可互化，死循环先想好出口。跳转四件套：break 只出最近一层；continue 在 for 落到步进、在 while 落到条件；goto 只有多层跳出与错误清理两个可辩护用途；return 是最常用的出口。事故三巨头——分号空语句、差一错误、浮点累积误差——靠「一律写大括号、遍历用 `<`、浮点不做等值判断」三条纪律预防。

## 下一步

进入 [函数](/c/090-FunctionDetailed)：本章反复说的「把这段循环拆出去」马上兑现——main 为什么不该长到 300 行、传值为什么让 swap 失败、main 的 return 到底交给了谁。
