---
order: 540
title: 属性与编译器扩展：让编译器当 reviewer
module: 'c'
category: 计算机科学
difficulty: advanced
description: 用 format 属性抓 printf 包装函数的事故开题，讲透 C23 五个标准属性的语法与语义，再进 GCC __attribute__ 实战（packed/aligned/constructor/always_inline），收口于跨编译器迁移表与可移植纪律。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/300-InlineFunctionMacro'
  - 'c/080-ControlFlow'
  - 'c/220-MemoryAlignmentDeepDive'
  - 'c/410-CrossPlatformProgramming'
  - 'c/520-C23C2y'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/290-PreprocessorMacro'
---

## 前置知识

- 已完成 [函数](/c/090-FunctionDetailed)：会写函数声明与原型，理解声明与定义的区别；
- 已完成 [预处理器与宏](/c/290-PreprocessorMacro)：知道条件编译怎么写（属性的可移植封装要用它）。

> 分工说明：内联的机制与「宏还是函数」的决策在 [内联函数与宏](/c/300-InlineFunctionMacro)（本篇只讲 `always_inline` 属性本身）；对齐的原理与填充规则在 [内存对齐](/c/220-MemoryAlignmentDeepDive) 与 [成员排序](/c/230-AlignmentMemoryLayout)（本篇只讲 `packed`/`aligned` 属性用法）；跨编译器的完整兼容层在 [跨平台编程](/c/410-CrossPlatformProgramming)；C23 语言特性的总览在 [C23 上手](/c/520-C23C2y)。

## 学习目标

读完本文你将能够：

1. 写出带 `format` 属性的 printf 包装函数，让编译器在编译期抓出格式串错误；
2. 说出 C23 五个常用标准属性（`[[deprecated]]` `[[nodiscard]]` `[[fallthrough]]` `[[maybe_unused]]` `[[noreturn]]`）各自管什么、警告长什么样；
3. 用 `packed`/`aligned` 控制结构体布局，并说出 `packed` 取成员地址的未对齐风险；
4. 用 `constructor`/`destructor` 实现自注册模式，用 `always_inline`/`noinline` 干预内联；
5. 给出一套「C23 标准属性优先、`__attribute__` 按需、条件编译隔离」的跨编译器纪律。

预计 40 到 60 分钟，含 2 组动手实验与 2 道练习。

## 1. 问题引入：包装 printf 的隐藏炸弹

项目里禁止直接用 `printf`，于是有了统一的日志函数：

```c
/* log.c */
#include <stdio.h>

void log_msg(const char *fmt, int level) {
    printf("[%d] ", level);
    printf(fmt);              /* 把用户格式串直接喂给 printf */
}

int main(void) {
    log_msg("user %s logged in from %s", 3);   /* 少了一个参数 */
    return 0;
}
```

`gcc -Wall -Wextra` 编译：**零警告**。运行时 `printf(fmt)` 拿到一个带 `%s` 却没有对应参数的格式串——读取随机的第二个参数，输出垃圾甚至崩溃。等价于把 format string 漏洞写进了自家日志。

问题不在 `printf`——直接调 `printf` 时编译器会检查格式串与实参的匹配。问题在**包装函数把这条检查链切断了**：编译器不知道 `log_msg` 的第一个参数是格式串、后面该跟什么。

修复只要一行——给声明加上 `format` 属性：

```c
void log_msg(const char *fmt, int level)
    __attribute__((format(printf, 1, 0)));
/*                            ^^^^^^  ^  ^
 *     用 printf 的检查规则 ┘      │  └ 可变参数从第 0 个开始
 *                        格式串在第 1 个参数
 */
```

再编译，编译器立刻开口：

```text
log.c: In function 'main':
log.c:10:5: warning: format '%s' expects a matching 'char*' argument [-Wformat=]
```

把「人肉 review 才能发现的纪律」变成「编译期自动检查」——这就是属性的用途。**属性（attribute）是对编译器的额外承诺或请求**：不改变语言语义，只让编译器多查错、多优化。

## 2. 语法：标准属性与 GCC 扩展

C 里的属性有两套写法：

```c
/* C23 标准属性：双方括号，可出现在声明多处 */
[[deprecated]] int old_api(void);
[[nodiscard]] int must_check(void);

/* GCC/Clang 扩展：__attribute__，挂在声明末尾（C23 起也可写 [[gnu::...]]） */
int fast_path(void) __attribute__((always_inline));
struct __attribute__((packed)) Frame { char a; int b; };
```

三条规定值一遍背：

1. **属性不参与类型**：`[[deprecated]]` 改变的是「用了会告警」，函数签名不变；
2. **未知属性被忽略**：老编译器遇到不认识的属性最多告警、不报错——这是向前兼容的基石，也是「拼错属性名静默失效」的根源（第 6 节实录三）；
3. **C23 标准属性带命名空间**：`[[gnu::always_inline]]` 里的 `gnu::` 表明这是 GCC 的扩展属性，标准未来可能收编同名属性而不冲突。

## 3. C23 标准属性：五个常用的

### 3.1 [[deprecated]]：给旧 API 立告别牌

```c
[[deprecated("use open_config_v2; v1 has no error reporting")]]
int open_config(const char *path);
```

任何调用 `open_config` 的地方都会收到警告，且消息原样带出——比口口相传「别用旧接口」可靠得多。库作者升级 API 的标准动作。注意传染性：在头文件里标了 deprecated，调用它的**内联函数**也会跟着告警，必要时对内层包装补 `[[maybe_unused]]` 或调整封装层级。

### 3.2 [[nodiscard]]：返回值不许扔

```c
[[nodiscard]] int write_config(const char *buf);
/* 丢弃返回值时：warning: ignoring return value of 'write_config' */
```

错误码必查的函数（I/O、内存分配类）加上它，等于把 code review 里「记得检查返回值」这条自动化。C23 前的 GCC 用户可用 `__attribute__((warn_unused_result))`，语义相同。

### 3.3 [[fallthrough]]：声明「我就是故意的」

C 的 switch 会贯穿（fallthrough），但绝大多数贯穿都是忘了 `break`。[控制流](/c/080-ControlFlow) 篇讲过：`-Wimplicit-fallthrough` 会告警。真正故意贯穿的分支，补上空语句属性的标记：

```c
switch (level) {
case LOG_DEBUG:
    if (!debug_enabled) break;      /* 这里的 break 是业务逻辑 */
    [[fallthrough]];                /* 明确告诉编译器：往下贯穿是设计 */
case LOG_INFO:
    print_prefix();
    break;
}
```

### 3.4 [[maybe_unused]]：优雅地压警告

参数或变量在部分构建配置下用不到（如去掉了日志的发布版），传统写法是丑陋的 `(void)x;`：

```c
void trace(const char *msg, [[maybe_unused]] int lineno) {
    /* 发布版里 lineno 用不到也不告警 */
    printf("%s\n", msg);
}
```

### 3.5 [[noreturn]]：不会返回的函数

`exit`、`abort`、无限循环的调度器主循环——调用点之后的代码不可达。标记后编译器能删掉「函数返回」路径的死代码，更重要的是：如果标了 `[[noreturn]]` 的函数**居然返回了**，行为未定义（编译器基于「不会返回」做了优化）——这是承诺不是建议，第 6 节实录二有事故。

## 4. GCC/Clang 扩展属性实战

### 4.1 format：本篇开头那颗炸弹的标准解

`__attribute__((format(printf, fmt_idx, vararg_idx)))` 把 printf 家族的格式串检查接到任意包装函数上。三个易错点：

- 参数序号从 **1** 数起（函数名不算）；无参包装（如 `log_msg(fmt)` 只接格式串）的可变参数位置写 **0**；
- 自己实现的迷你 printf（100 篇的 `my_printf`）不能用 `printf` 规则检查，但可以换其他检查模型，或至少保证声明里可变参数不可省略；
- `scanf` 家族有对应的 `format(scanf, ...)`。

### 4.2 packed 与 aligned：布局开关

```c
/* packed：取消成员间填充 */
struct __attribute__((packed)) WireHeader {
    uint8_t  version;
    uint32_t length;      /* 没有 packed 时前面会垫 3 字节 */
};

/* aligned：抬高（不能压低）对齐 */
struct __attribute__((aligned(64))) CacheLine {
    int counter;          /* 整个结构体 64 字节对齐：一整条缓存行 */
};
```

`packed` 常用于协议头、文件格式、硬件映射——按线上字节布局。代价必须清楚：`length` 现在落在非自然对齐的地址上，**在部分 ARM/MIPS 平台上直接解引用会崩溃或极慢**，安全读法是先拷到对齐的局部变量，或用逐字节组装（x86 的未对齐访问有硬件兜底，但同样不是零成本）。对齐的完整原理与 `offsetof` 实验在 220/230 两篇。另一个坑：`aligned` 只能**抬高**对齐，写 `aligned(1)` 不会让普通结构体变成 packed——「紧凑」只有 `packed` 能做。

### 4.3 constructor / destructor：自注册模式

```c
__attribute__((constructor))
static void register_plugin(void) {
    puts("plugin loaded");        /* main 之前自动执行 */
}

__attribute__((destructor))
static void unload_plugin(void) {
    puts("plugin unloading");     /* main 返回（或 exit）之后执行 */
}
```

多个 constructor 都会在 `main` 前执行（同文件按声明顺序，跨文件按链接顺序，实践上不要依赖精确顺序）。测试注册、插件自注册（把模块信息写进全局注册表）、初始化全局互斥锁，都是它的地盘。注意它运行在 `main` 之前——此时不是所有运行时设施都就绪，别在里面做重活。

### 4.4 内联干预与冷热路径

```c
static inline uint16_t rd_reg(void)
    __attribute__((always_inline));       /* 强制内联（300 篇讲机制与膨胀代价） */

void slow_path(const char *why) __attribute__((cold));    /* 这条路很少走 */
void hot_loop_body(void)        __attribute__((hot));     /* 这条是热点 */
```

`cold` 的实际效果是把该函数的代码挪到远离热路径的位置、调用点少做优化准备，提升指令缓存命中。分支概率提示用 `__builtin_expect` 或 C23 的 `[[likely]]`/`[[unlikely]]`（写法如 `if (err) [[unlikely]] { ... }`；GCC 12、Clang 15 起支持，用前核实自家编译器）。自定义段（`section(".mydata")`）把变量放进取水器脚本自定义的段，是 [嵌入式 C 编程](/c/550-EmbeddedCProgramming) 的常规操作，这里知道存在即可。

## 5. C23 标准属性 vs GCC 扩展：迁移表

| 需求 | GCC/Clang 扩展写法 | C23 标准写法 |
| --- | --- | --- |
| 废弃 API | `__attribute__((deprecated))` | `[[deprecated]]` |
| 返回值必查 | `warn_unused_result` | `[[nodiscard]]` |
| 故意贯穿 | `__attribute__((fallthrough))` | `[[fallthrough]];` |
| 可能不用 | `__attribute__((unused))` | `[[maybe_unused]]` |
| 不返回 | `__attribute__((noreturn))` | `[[noreturn]]` |
| 强制内联 | `always_inline` | 暂无标准（可写 `[[gnu::always_inline]]`） |
| 压缩布局 | `packed` | 暂无标准 |

纪律三条：**能用标准属性就用标准属性**（向前可迁移、跨编译器都认识）；扩展属性优先写成 `[[gnu::...]]` 命名空间形式（C23 起合法、与标准属性并列）；必须支持不认识新语法的旧编译器时，用宏隔离——

```c
#if defined(__GNUC__)
#  define FANDEX_FORMAT(f, a) __attribute__((format(printf, f, a)))
#else
#  define FANDEX_FORMAT(f, a)
#endif

void log_msg(const char *fmt, int level) FANDEX_FORMAT(1, 0);
```

MSVC 的对应物是 `__declspec`（`__declspec(noinline)`、`__declspec(deprecated(...))` 等），能力面窄于 GCC 属性家族；完整的三家对照与抽象层组织在 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 6. 常见错误与调试实录

**实录一：format 参数序号写错。** `format(printf, 0, 1)`——序号从 1 起，0 是保留给「无实例参数」的可变参数位置。位置完全写错时 GCC 的报错很直白，但序号错位时只会静默查错位置：警告不出现，你以为安全了。自查法：写一个故意错的调用编译一遍，警告出现才算属性生效。

**实录二：noreturn 的函数返回了。** 给「出错统一退出」函数标了 `[[noreturn]]`，后来有人在末尾加了「返回错误码」分支。编译器已基于「不返回」删除了调用点的善后代码（寄存器状态、栈假设），函数返回后行为未定义——可能还能跑，可能在别处炸。修改这类函数时先摘属性再改逻辑。

**实录三：属性名拼错静默失效。** `__attribute__((formet(printf, 1, 2)))`——老编译器对未知属性只告警（`-Wattributes`），CI 若没把告警当错误，检查链就悄悄断了。对策：把「故意错误调用必须产生警告」写进测试（本篇第 1 节的自查法自动化）。

**实录四：packed 结构体成员取地址。** `&hdr->length` 拿到的是未对齐的 `uint32_t *`，解引用在 x86 上侥幸、在部分 ARM 上 SIGBUS。需要取值就 `memcpy` 到对齐变量，需要映射就把整个结构体按字节处理。

## 7. 实际项目中的使用场景

- 库的公开头文件：`[[deprecated]]` 管迁移、`[[nodiscard]]` 管错误码、`format` 管日志函数——三件套是 API 自我文档化的一部分；
- 硬件/协议层：`packed` 结构体映射寄存器与报文头（与 [位域](/c/240-BitField) 的可移植性取舍一节互为对照）；
- 框架层：`constructor` 自注册让插件「编译进去即生效」，Linux 内核的 `module_init` 是同一思想的工程化放大；
- 语言级基础设施：GCC 的 `__builtin_` 函数族（`__builtin_expect`、300 篇讲过的 `__builtin_constant_p`）与属性同属「编译器扩展」工具箱，用前查自家编译器文档。

## 8. 小练习

预测题（5 分钟）：下面的声明想让编译器检查 `warn(msg, code)` 的格式串，哪里写错了？

```c
void warn(const char *fmt, int code, ...) __attribute__((format(printf, 0, 2)));
```

参考答案（先写再看）：格式串位置写成了 0。参数序号从 1 数起，`fmt` 是第 1 个参数；第二个数 2 表示「可变参数从第 2 个参数之后开始」。正确写法 `format(printf, 1, 2)`。写 0 的是「只有格式串没有具名可变参数」的包装，比如 `void fatal(const char *fmt, ...) __attribute__((format(printf, 1, 0)))`。

修改题（10 分钟）：下面的「紧凑报文头」代码在 x86 上偶尔正常、在目标 ARM 板上崩溃，指出原因并给两种修法：

```c
struct __attribute__((packed)) Header { uint8_t type; uint32_t len; };
struct Header *h = (struct Header *)buffer;
printf("%u\n", h->len);
```

参考答案：`len` 在偏移 1 处，未对齐的 4 字节读取在部分 ARM/MIPS 上触发对齐异常。修法一：`uint32_t len; memcpy(&len, buffer + 1, sizeof len);` 拷到对齐变量再读；修法二：逐字节组装 `(uint32_t)buffer[1] | (uint32_t)buffer[2] << 8 | ...`（顺带把字节序也定死）。根本建议：跨机传输的报文一律按字节序列化，`packed` 结构体只做「本机视图」。

## 9. 与之前和之后的知识的关系

- 往前：函数声明与原型的规则（090 篇）决定属性挂在哪；`switch` 贯穿语义（080 篇）是 `[[fallthrough]]` 的前提；内联机制（300 篇）是 `always_inline` 的语境；
- 旁支：对齐与填充的原理在 [内存对齐](/c/220-MemoryAlignmentDeepDive)；三编译器差异的汇总在 [跨平台编程](/c/410-CrossPlatformProgramming)；C23 特性全景在 [C23 上手](/c/520-C23C2y)；
- 往后：属性在嵌入式里与寄存器、段、启动代码全面相遇，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)。

## 10. 官方文档

- cppreference C 属性（C23 标准属性全集与语法）：https://en.cppreference.com/w/c/language/attributes
- GCC 变量属性文档（packed/aligned 等）：https://gcc.gnu.org/onlinedocs/gcc/Common-Variable-Attributes.html
- GCC 函数属性（constructor/format/noreturn 等）：https://gcc.gnu.org/onlinedocs/gcc/Common-Function-Attributes.html

## 11. 自我检查

- 能写出带 `format` 属性的日志包装并让它抓出一个真实格式串错误；
- 能背出 C23 五个常用标准属性各自管什么，并知道扩展写法 `[[gnu::...]]` 的命名空间含义；
- 能说出 `packed` 的用途、代价（未对齐访问）与 `aligned` 「只抬不压」的规则；
- 能用宏隔离写出跨编译器的属性抽象，并说出「未知属性被忽略」带来的静默失效风险与自查法。

## 本章总结

属性是不改变语义的编译器注解：标准属性（C23 的双括号家族）负责查错与契约——`deprecated` 管迁移、`nodiscard` 管错误码、`fallthrough` 管贯穿声明、`noreturn` 是不可反悔的承诺；GCC 扩展属性负责布局与优化——`packed`/`aligned` 管内存布局（未对齐访问有平台级风险）、`constructor` 管 main 之前的自注册、`format` 把 printf 家族的检查链接到你的包装函数上。三条纪律收束全篇：标准属性优先；扩展属性用命名空间写法加宏隔离；每个属性都要用「故意错误的调用」验证它真的生效——未知属性会被静默忽略。

## 下一步

进入 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)：属性、volatile、位操作、栈核算在「64KB 内存、没有操作系统」的世界里全面相遇——看 C 如何在裸机上跑稳。
