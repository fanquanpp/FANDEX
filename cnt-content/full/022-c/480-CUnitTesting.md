---
order: 520
title: C 单元测试与断言
module: 'c'
category: 计算机科学
difficulty: intermediate
description: C 程序测试：assert 的契约语义与 NDEBUG 陷阱、测试文件组织（每模块一 test.c）、三步手写最小断言框架、Unity/CMocka/libcheck 选型对比，并接入 Makefile 目标与 CI 警告门禁形成质量闭环。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/470-BuildSystem'
  - 'c/485-StaticAnalysisAndSanitizers'
  - 'c/595-CCapstoneProject'
  - 'c/580-CProjectExampleStudentGradeSystem'
  - 'c/450-SafeFunctionBoundsCheck'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/310-MultiFileCompilation'
  - 'c/470-BuildSystem'
---

# C 单元测试与断言

## 知识点地图

- **知识类别**：质量工程——C 程序的单元测试与断言（unit testing and assertions）。本篇在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 的「工具找 bug」之外补上「测试证明行为」这一层。
- **解决什么问题**：C 没有内置测试框架，很多项目于是「改完跑一下 main 看看没崩」就提交——崩溃要等用户先撞上，回归全靠人肉记忆。本篇给出零依赖的路线：用 `assert` 把「应该如此」写成代码、用 `test.c` 把验证固化、用三步搭一个 50 行的迷你断言框架，再对比三个主流框架决定什么时候升级，最后用 Makefile 目标与 CI 门禁把「忘了跑测试」这件事从纪律变成机制。
- **什么时候用到**：
  - 写工具函数时（字符串封装、数据结构、解析器）：每个函数配一组断言，改坏立刻红；
  - 修 bug 时：先写一个能复现 bug 的失败断言，修完它转绿——这个用例从此永久站岗，防止同一 bug 回归；
  - 交付项目时：[C 毕业项目](/c/595-CCapstoneProject) 明确要求「自写断言测试 + make test 一键跑」；
  - CI 里：警告当门禁、测试当门禁，红灯合不了代码。
- **素材说明**：本篇不含本机扫描素材；第 6 节三个框架的行为描述以各自官方文档为准（Unity MIT 许可、CMocka Apache-2.0 许可、libcheck LGPL-2.1+ 许可，均开放可引用，文末致谢）。本仓库自身的 CI 内容门禁（`node app-web/scripts/content-audit.mjs`，见 `.github/workflows/deploy.yml`）作为跨语言对照案例。

## 学习目标

- 掌握「1. assert」的契约语义、NDEBUG 陷阱与「该用错误码的场景」
- 掌握「2. 测试文件组织」与「3. 三步手写断言框架」
- 掌握「4. 三个实战：vector/哈希表、成绩系统边界、snprintf 封装回归」
- 掌握「5. 框架选型」与「6. Makefile + CI 质量闭环」

## 1. assert：把「应该如此」写成代码

### 1.1 契约语义

`assert(expr)` 来自 `<assert.h>`：表达式为真时什么都不发生；为假时向 stderr 打印「文件、行号、函数、表达式原文」，然后 `abort()` 当场终止程序：

```c
#include <assert.h>

void stack_push(Stack *s, int v) {
    assert(s != NULL);          /* 契约：调用方必须传有效栈 */
    assert(!stack_full(s));     /* 契约：栈未满时才能入栈 */
    /* ... 真正的实现 ... */
}
```

把它读成一句合同：**「到这里时，这个条件必须成立；不成立说明是我的调用方违约，程序没有继续跑下去的意义」**。这个「立即死、死在案发现场」的行为正是价值所在——bug 离产生地越近越好抓，`abort` 的 core dump 就是第一现场。

### 1.2 NDEBUG 陷阱：测试代码里的断言会静默消失

`assert` 受宏 `NDEBUG` 控制——**定义了它，所有 assert 变成空语句**，一行代码都不执行：

```bash
gcc -DNDEBUG test_vec.c -o test_vec
./test_vec
All tests passed          # 惊天谎言：什么都没测
```

这是 C 测试的头号陷阱：测试目标忘了它自己也是被 `-DNDEBUG` 编译的发布配置的一部分，「全绿」可能只是「全部跳过」。两条防线：

1. **测试代码永远不加 `-DNDEBUG`**（[C 毕业项目](/c/595-CCapstoneProject) 的提示区原话：「测试编译别加 -DNDEBUG，否则所有断言静默消失」）；
2. 自己的迷你框架（第 3 节）用自定义宏，不依赖 NDEBUG 开关——测试断言的生死不该由发布配置决定。

assert 与错误处理的分界线，是它最容易被问到的面试题：

| 场景 | 用 assert | 用错误码 |
| --- | --- | --- |
| 函数内部不变量（自己写错的概率） | 合适 | 不合适 |
| 调用方契约违约（传 NULL 给非空参数） | 开发期 assert + 文档 | 发布版返回错误码 |
| 用户输入非法（必然发生） | 不合适（不能拿用户输入炸生产） | 合适 |
| 资源分配失败（内存不足是常态） | 不合适 | 合适 |

口诀：**assert 管「不可能发生的事」（发生了说明程序有 bug），错误码管「可能发生的事」（发生了要给调用方活路）**。用户输入永远属于第二类。

## 2. 测试文件组织：每模块一个 test.c

C 项目不需要复杂的测试目录学，一个约定就够：**每个实现文件配一个同名 test 前缀的测试文件**，共享一个 `test_main` 入口：

```text
project/
  src/
    strutil.c        实现
    strutil.h        接口
    vec.c
    vec.h
  tests/
    test_strutil.c   只测 strutil
    test_vec.c       只测 vec
    test_main.c      汇总入口：依次调用各套件的 run 函数
  Makefile           make / make test 两个目标
```

三条组织纪律：

1. **测试包含被测头文件，不 include 实现 .c**——测的是公开契约而不是内部细节，重构实现不破测试；
2. **一个行为一条断言**：`test_push_then_pop_returns_same_value` 和 `test_pop_from_empty_returns_error` 是两个用例，别揉在一个函数里——揉在一起的后果是第一个 assert 失败后，后面的用例根本没跑，报告失真；
3. **测试代码也是代码**：`-Wall -Wextra` 照开，别让测试自己带着警告跑。

## 3. 三步手写最小断言框架

零依赖路线的核心资产是一个 50 行的头文件。第一步，写断言宏：

```c
/* tests/mini_test.h —— 第 1 步：断言宏 */
#ifndef MINI_TEST_H
#define MINI_TEST_H

#include <stdio.h>

static int mt_passed = 0;
static int mt_failed = 0;

#define MT_CHECK(cond)                                                     \
    do {                                                                   \
        if (cond) { mt_passed++; }                                         \
        else {                                                             \
            mt_failed++;                                                   \
            printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);         \
        }                                                                  \
    } while (0)

#define MT_CHECK_EQ_INT(actual, expected)                                  \
    do {                                                                   \
        long long a_ = (long long)(actual), e_ = (long long)(expected);    \
        if (a_ == e_) { mt_passed++; }                                     \
        else {                                                             \
            mt_failed++;                                                   \
            printf("FAIL %s:%d: %s == %lld, got %lld\n",                   \
                   __FILE__, __LINE__, #actual, e_, a_);                   \
        }                                                                  \
    } while (0)

#define MT_REPORT()                                                        \
    do {                                                                   \
        printf("%d passed, %d failed\n", mt_passed, mt_failed);            \
        return mt_failed > 0 ? 1 : 0;                                      \
    } while (0)

#endif
```

为什么这样写，逐个拆：

- **`MT_CHECK` 不 `abort` 而是计数**——与 `assert` 的关键差异：测试要跑完全部用例给出完整清单，而不是死在第一个失败上。失败的「诊断信息」（文件、行、表达式原文 `#cond`）从 assert 那里继承；
- **`do { } while (0)` 包裹**——让宏在任何 `if/else` 语境下都是单条语句，这是 C 宏的标准防身术；
- **`MT_CHECK_EQ_INT` 强转 `long long` 再比较**——直接在 printf 里传不同类型的两个表达式，格式符必错一个；统一抬到最宽整型，一个 `%lld` 通吃（这一招的本质是「先归一化再比较」，字符串版可以类似地包 `strcmp(...) == 0`）；
- **`MT_REPORT` 返回 1/0**——进程退出码就是「测试是否通过」，shell 和 CI 都认退出码，这就是「测试结果机器可读」的全部秘密。

第二步，每个模块一个测试文件，暴露一个入口函数：

```c
/* tests/test_vec.c —— 第 2 步：被测模块的用例集 */
#include "mini_test.h"
#include "vec.h"

void test_vec_push_pop(void) {
    Vec v;
    vec_init(&v);
    vec_push(&v, 42);
    int out = 0;
    MT_CHECK_EQ_INT(vec_pop(&v, &out), 0);   /* 返回错误码：成功 */
    MT_CHECK_EQ_INT(out, 42);                /* 弹出的值正确 */
    vec_free(&v);
}

void test_vec_pop_empty_fails(void) {
    Vec v;
    vec_init(&v);
    int out = 0;
    MT_CHECK_EQ_INT(vec_pop(&v, &out), -1);  /* 空栈弹出：返回错误 */
    vec_free(&v);
}

/* 供汇总入口调用的套件入口 */
void test_vec_all(void) {
    test_vec_push_pop();
    test_vec_pop_empty_fails();
}
```

第三步，汇总入口与编译运行：

```c
/* tests/test_main.c —— 第 3 步：汇总入口 */
void test_vec_all(void);
void test_strutil_all(void);

int main(void) {
    test_vec_all();
    test_strutil_all();
    /* MT_REPORT 由各套件尾部的宏完成，或在此统一汇总 */
    extern int mt_passed, mt_failed;
    printf("%d passed, %d failed\n", mt_passed, mt_failed);
    return mt_failed > 0 ? 1 : 0;
}
```

```bash
gcc -Wall -Wextra -g -fsanitize=address -Isrc src/*.c tests/test_main.c tests/test_*.c -o build/test
./build/test
# 8 passed, 0 failed
```

第 1 与第 3 步的二选一细节：`MT_REPORT` 放在各套件尾部则每个套件独立退出、首败即停；放在汇总入口则跑完全部再统一报数。持续集成要完整清单，选后者；本地快速迭代想早停，选前者。带 ASan 编译测试（如上命令）是免费加成——内存错误当场现形，与测试断言互补（工具层详解见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 第 6 章）。

## 4. 三个实战

### 实战一：给 vector/哈希表补测试（毕业项目形态）

以 [C 毕业项目](/c/595-CCapstoneProject) 的 vector 为例，测试要覆盖的四类契约：

```c
void test_vec_all_cases(void) {
    Vec v;
    vec_init(&v);

    /* 契约一：空容器行为——不崩，返回明确错误 */
    MT_CHECK_EQ_INT(vec_size(&v), 0);
    MT_CHECK(vec_is_empty(&v));

    /* 契约二：正常路径——放进去的能原样拿出来 */
    for (int i = 0; i < 1000; i++) vec_push(&v, i);
    MT_CHECK_EQ_INT(vec_size(&v), 1000);
    int out = 0;
    MT_CHECK_EQ_INT(vec_get(&v, 999, &out), 0);
    MT_CHECK_EQ_INT(out, 999);

    /* 契约三：边界——最后一个、越界的 */
    MT_CHECK_EQ_INT(vec_get(&v, 1000, &out), -1);   /* 刚好越界一格 */

    /* 契约四：状态一致性——删完真的空了 */
    while (vec_pop(&v, &out) == 0) { }
    MT_CHECK(vec_is_empty(&v));
    vec_free(&v);
}
```

「契约一/三/四」这类边界用例是新手测试的最短木板：**bug 最爱住在边界上**（空、一、满、越界一格、最大值）。毕业项目的加分项「用计数钩子把扩容策略变成可断言的事实」是同一思想的进阶——把内部行为（搬家次数）变成外部可观察的计数器，就能对「策略」本身下断言。

### 实战二：给学生成绩系统的边界输入写测试

[C 项目实战：学生成绩系统](/c/580-CProjectExampleStudentGradeSystem) 的 `add_student(score)` 这类入口，测试重点从「函数逻辑」转向「脏输入防御」：

```c
void test_grade_boundary_inputs(void) {
    /* 合法边界：0 与 100 都该收 */
    MT_CHECK_EQ_INT(add_student("alice", 0),   0);
    MT_CHECK_EQ_INT(add_student("bob",   100), 0);

    /* 非法输入：必须被拒绝而不是静默接受 */
    MT_CHECK(add_student("carol", -1)  != 0);   /* 负分 */
    MT_CHECK(add_student("dave",  101) != 0);   /* 超满分 */
    MT_CHECK(add_student("",       80) != 0);   /* 空名字 */
    MT_CHECK(add_student(NULL,     80) != 0);   /* 空指针 */

    /* 拒绝之后，状态没有被污染 */
    MT_CHECK_EQ_INT(student_count(), 2);        /* 只有 alice 与 bob */
}
```

交互式程序（scanf 读入）的测试难点在输入源——把「读输入」抽象成 `read_line(FILE *in)` 接口，测试就能喂 `fmemopen` 的内存流而不用人肉敲键盘。这个「把 I/O 推到边上、核心逻辑变成纯函数」的手法，让任何 C 程序变得可测。

### 实战三：给 snprintf 封装写回归测试

[安全函数与边界检查](/c/450-SafeFunctionBoundsCheck) 中常见的封装——「带截断保证的字符串拼接」——是最值得写回归测试的一类函数，因为它的契约全部藏在边界里：

```c
/* 被测函数：把两段拼进固定缓冲区，保证终止 */
int join_path(char *dst, size_t cap, const char *a, const char *b);

void test_join_path_contract(void) {
    char buf[8];

    /* 契约一：正常拼接 */
    MT_CHECK_EQ_INT(join_path(buf, sizeof buf, "a", "b"), 0);
    MT_CHECK(strcmp(buf, "a/b") == 0);

    /* 契约二：装不下时截断但仍终止（读不算 UB） */
    MT_CHECK_EQ_INT(join_path(buf, sizeof buf, "very_long_dir", "file.txt"), 0);
    MT_CHECK_EQ_INT(strlen(buf), sizeof buf - 1);   /* 恰好占满 */
    /* 终止性由 ASan 背书：若没终止，strcmp/strlen 当场越界报警 */

    /* 契约三：参数非法时的行为要有明确定义并被测试钉住 */
    MT_CHECK(join_path(NULL, 8, "a", "b") != 0);
    MT_CHECK_EQ_INT(join_path(buf, 0, "a", "b"), -1);
}
```

「回归」的含义在此显现：这套断言写一次，今后任何人改动 `join_path` 的实现（换算法、换错误码风格），跑一遍测试就知道契约是否仍然成立。没有它，「重构」与「赌博」同义。

## 5. 框架选型：什么时候从手写升级

手写框架到几十个用例就会渴望：自动发现用例、每个用例独立运行互不拖累、断言失败后继续、浮点近似比较、fixture（公共初始化）。三个主流框架对照（行为描述以各自官方文档为准）：

| 维度 | Unity | CMocka | libcheck |
| --- | --- | --- | --- |
| 许可 | MIT | Apache-2.0 | LGPL-2.1+ |
| 形态 | 纯头文件 + 两个源文件，极简 | 动态链接库，带 mock 支持 | 独立进程跑用例，fork 隔离 |
| 上手成本 | 最低：`#include "unity.h"` 即用 | 中：需理解 mock/expect 概念 | 中：有自己的用例注册宏 |
| 杀手锏 | 嵌入式首选，资源占用极小 | 断言崩溃不拖垮整个测试（异常安全） | 用例进程隔离，一个段错误不连坐 |
| 典型用户 | 嵌入式/物联网固件项目 | 需要 mock 依赖（文件、网络层）的项目 | 传统 Linux 桌面/服务项目 |

选型口诀：**裸函数与数据结构测试，Unity 最省事；要 mock 掉文件系统或网络，CMocka；测试里可能真的段错误（解析不可信输入），libcheck 的进程隔离救命**。判断标准不是「哪个最流行」，而是「测试单元的失败方式」：全是干净断言，手写或 Unity 足够；有崩溃风险，就要隔离。

升级路径照旧从手写开始：先用第 3 节的 50 行框架理解「断言、用例、套件、退出码」四个概念，再换框架——概念不变，只是宏换了名字。

## 6. 质量闭环：Makefile 目标与 CI 门禁

测试写了没人跑等于没写。闭环的两环：

**第一环，Makefile 目标**（Makefile 语法详见 [构建系统](/c/470-BuildSystem)）：

```makefile
CC      := gcc
CFLAGS  := -std=c11 -Wall -Wextra -Werror -g
ASAN    := -fsanitize=address,undefined
BUILD   := build
TESTS   := tests/test_main.c tests/test_vec.c tests/test_strutil.c

.PHONY: all test clean

all: $(BUILD)/app

$(BUILD)/app: src/*.c
	$(CC) $(CFLAGS) src/*.c -o $@

test: $(BUILD)/test
	./$(BUILD)/test

$(BUILD)/test: src/*.c $(TESTS) tests/mini_test.h
	$(CC) $(CFLAGS) $(ASAN) -Isrc src/*.c $(TESTS) -o $@
	@echo "test binary built with ASan+UBSan"

clean:
	rm -rf $(BUILD)
```

三个细节各有深意：

- `test` 依赖 `$(BUILD)/test`，编译规则里挂 ASan——跑 `make test` 自动获得内存检查，不用记第二套命令；
- `test` 写进 `.PHONY`——目录里没有叫 `test` 的文件时 Make 靠它避免「目标已最新」假象（`.PHONY` 机制见 [构建系统](/c/470-BuildSystem) 2.5 节）；
- 主程序与测试二进制的 `CFLAGS` 一致，差异只在 ASan 与测试源文件——测试环境离生产越近，测出来的问题越真。

**第二环，CI 门禁**：把「跑测试 + 零警告」设为合并的前置条件。本仓库（FANDEX）自己就是这么干的——`.github/workflows/deploy.yml` 第 75 行起，构建前强制执行 `node scripts/content-audit.mjs`，内容质量门禁不过，部署直接失败。把它翻译到 C 项目就是一条 workflow job：

```yaml
# .github/workflows/c.yml（节选）
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make CFLAGS="-std=c11 -Wall -Wextra -Werror -g" test
      - run: ./build/test          # 退出码非 0 即红灯
```

`-Werror` 把警告升格为错误，是 CI 环境的常用手法：本地开发可以宽容，**合并进主干的代码必须零警告**。警告门禁的工具梯度（警告 → cppcheck → clang-tidy → sanitizer 矩阵）在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 第 8 章有完整方案，本篇的测试 job 与它拼成完整质量闭环：**静态分析抓「写错的代码」，测试抓「写对意图的代码」，CI 保证两道关都过了才许进主干**。

## 7. 动手实践

### 练习一：把手写框架补上字符串断言

任务：给第 3 步的 `mini_test.h` 增加 `MT_CHECK_EQ_STR(actual, expected)`，失败时打印两个字符串的内容与长度。
提示：内部用 `strcmp(...) == 0` 判等；打印用 `%s` 前先处理 NULL——对 `NULL` 用 `%s` 本身就是 UB，测试框架自己先要守规矩。

参考实现（先自己写，写完再对照）：

```c
#define MT_CHECK_EQ_STR(actual, expected)                                  \
    do {                                                                   \
        const char *a_ = (actual), *e_ = (expected);                       \
        int ok_ = (a_ && e_) ? (strcmp(a_, e_) == 0) : (a_ == e_);         \
        if (ok_) { mt_passed++; }                                          \
        else {                                                             \
            mt_failed++;                                                   \
            printf("FAIL %s:%d: %s == \"%s\", got \"%s\"\n",               \
                   __FILE__, __LINE__, #actual, e_ ? e_ : "(null)",        \
                   a_ ? a_ : "(null)");                                    \
        }                                                                  \
    } while (0)
```

（需要 `#include <string.h>`。）

### 练习二：给本文的 strutil 写一套用例

任务：实现 `size_t str_trim(char *s);`（就地去除首尾空白，返回新长度），并写出至少 6 条断言：无空白、首空白、尾空白、全空白、空串、NULL。
提示：全空白与空串是「边界住着 bug」的典型；NULL 该返回什么先在注释里定义契约，再用断言钉住。

参考实现（先自己写，写完再对照）：

```c
#include <ctype.h>
#include <string.h>

size_t str_trim(char *s) {
    if (!s) return 0;
    char *start = s;                       /* 先记住入口：前移后还要用 */
    while (isspace((unsigned char)*s)) s++;
    size_t len = strlen(s);
    while (len > 0 && isspace((unsigned char)s[len - 1])) len--;
    if (s != start) {
        memmove(start, s, len + 1);        /* 连 '\0' 一起搬回头部 */
    } else {
        start[len] = '\0';                 /* 没有首空白：原地截尾即可 */
    }
    return len;
}
```

最容易漏的是「无首空白但需截尾」分支里那句 `start[len] = '\0'`——没有它，`str_trim("ab  ")` 返回 2 但缓冲区末尾还是空格，后续 `strlen` 报 4。给这个分支补一条断言（`MT_CHECK_EQ_STR(b, "ab")` 且 `strlen(b) == 2`），正是「测试逼出设计漏洞」的现场。

### 练习三（工程场景）：把 bug 修成测试

任务：找一个自己写过的 C 小程序（或第 6 节 `join_path`），回想一个修过的 bug；先写一个**当前会失败**的断言复现它，再修代码让它转绿。
提示：顺序是「先红后绿」——如果断言一上来就绿，说明它没抓住那个 bug，重写；修完把用例留着，它就是回归防线。

参考思路（先自己想，再看）：假设 bug 是 `str_trim("   ")` 返回 0 但没写终止符，后续 `printf` 打印垃圾。复现断言：`char b[4] = "   "; str_trim(b); MT_CHECK_EQ_INT(b[0], '\0');`——先跑确认红，补上 `s[len] = '\0';` 后转绿。

## 8. 实际项目中的使用场景

- **开源 C 库**：curl、git、Redis 各有庞大的自写/框架测试套件，合并 PR 的前提是全套通过；
- **嵌入式**：Unity + 主机端模拟测试（逻辑在 PC 上跑，硬件相关层 mock 掉）是行业标配；
- **本仓库自身**：内容即代码——`content-audit.mjs` 在 CI 里当门禁（见 `.github/workflows/deploy.yml`），与本篇「测试 + CI」是同一思想在不同语言的实例。

## 9. 与之前和之后的知识的关系

- 往前：[函数详解](/c/090-FunctionDetailed) 的「单一职责」让函数可测——一个函数做一件事，断言才写得简短；[多文件编译](/c/310-MultiFileCompilation) 的头文件与链接是测试文件组织的基础；[构建系统](/c/470-BuildSystem) 的 Makefile 是 `make test` 的载体；
- 旁支：[静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 与本篇构成质量双保险（工具找 bug、测试证行为）；[安全函数与边界检查](/c/450-SafeFunctionBoundsCheck) 的边界封装是回归测试的最佳素材；
- 往后：[C 毕业项目](/c/595-CCapstoneProject) 把本篇全部要求落地为验收标准（自写断言 + make test + ASan 零报告）。

## 10. 官方文档

- `<assert.h>` 与 assert 语义（cppreference C，CC-BY-SA）：https://en.cppreference.com/w/c/error/assert
- Unity 测试框架（MIT 许可）：https://github.com/ThrowTheSwitch/Unity
- CMocka 文档（Apache-2.0 许可）：https://cmocka.org/
- libcheck 文档（LGPL-2.1+ 许可）：https://libcheck.github.io/check/

## 11. 自我检查

- 能说出 assert 与错误码的分界线，并举出一个「不该用 assert」的场景（用户输入、资源失败）；
- 能解释 `-DNDEBUG` 陷阱的成因与两条防线；
- 能不看资料默写 `MT_CHECK` 宏，并解释 `do { } while (0)` 与 `#cond` 的作用；
- 能为一个「带边界检查的字符串函数」列出至少五条契约断言；
- 能说出手写框架升级到 Unity/CMocka/libcheck 的三个触发条件。

## 本章总结

C 测试的骨架是四样东西：**断言宏**（把契约写成代码，失败打印现场且进程返回非 0）、**每模块一个 test.c**（测公开契约而非内部细节）、**一个 make test 目标**（把「跑测试」变成一个词）、**CI 门禁**（把「必须跑」从纪律变成机制）。`assert` 管不可能发生的事、错误码管可能发生的事；`-DNDEBUG` 会让断言集体蒸发，测试编译永远别开它。手写 50 行迷你框架的价值不在省一个依赖，而在亲手理解「断言、用例、套件、退出码」四个概念——之后无论换 Unity（嵌入式首选）、CMocka（要 mock）还是 libcheck（要进程隔离），都只是换宏名。边界用例（空、一、满、越界一格、NULL）是测试的最短木板，也是 bug 的常住地址；修 bug 先写失败断言再修，让每个 bug 都留下一条永久的回归防线。

## 参考与致谢

- Unity 框架的能力描述参考其官方仓库 README（ThrowTheSwitch/Unity，MIT 许可）；
- CMocka 的 mock 能力描述参考 cmocka.org 官方文档（Apache-2.0 许可）；
- libcheck 的进程隔离特性参考 libcheck.github.io 官方文档（LGPL-2.1+ 许可）；
- 「-DNDEBUG 陷阱」的表述参考本仓库既有文档 [C 毕业项目](/c/595-CCapstoneProject) 提示区；
- 本篇为本批次新增，无本机扫描素材来源；其余内容为原创教学文本。
