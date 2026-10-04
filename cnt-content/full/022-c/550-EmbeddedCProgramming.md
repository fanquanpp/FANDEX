---
order: 550
title: 嵌入式 C 编程：在 64KB 里跑稳
module: 'c'
category: 计算机科学
difficulty: advanced
description: 从闪烁 LED 的裸机 main 出发串起嵌入式 C 主线：寄存器就是固定地址的内存、上电到 main 之间启动代码搬 .data 清 .bss、ISR 纪律与关中断临界区、看门狗与栈核算、交叉编译与 QEMU 仿真 mps2-an385，附 printf 重定向串口与三起调试实录。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/240-BitField'
  - 'c/070-BitwiseBitField'
  - 'c/340-SignalHandling'
  - 'c/250-FunctionCallStackFrame'
  - 'c/540-AttributeCompilerExtension'
prerequisites:
  - 'c/270-VolatileKeyword'
  - 'c/210-MemoryManagement'
---

## 前置知识

- 已完成 [volatile 关键字](/c/270-VolatileKeyword)：知道 volatile 的三经典场景，以及它「不原子、不排序、不当锁」的能力边界；
- 已完成 [内存深水区](/c/210-MemoryManagement)：能画出进程五段内存布局，知道「全局变量不写初值也是 0」靠的是 bss 段加载时统一清零。

> 分工说明：volatile 的完整语义（给什么保证、不给什么保证）在 [const 与 volatile 正交语义](/c/260-CVolatileAndConstDeepDive) 与 270，本篇只讲它在寄存器与中断里的用法；位域为什么不宜直接映射 MMIO 在 [位域](/c/240-BitField)；掩码四件套在 [位运算](/c/070-BitwiseBitField)；栈帧与 -fstack-usage 在 [函数调用栈帧](/c/250-FunctionCallStackFrame)；GCC 属性与自定义段在 [属性与编译器扩展](/c/540-AttributeCompilerExtension)，本篇让 section 属性在向量表上落地。本篇把这些工具带进「没有操作系统」的世界，串成一条裸机主线：寄存器、启动、中断、可靠性、工具链与仿真。RTOS 内核实现、WCET 与实时调度理论、厂商 SDK 全家桶（STM32 HAL、Arduino）超出本篇主线，只在风格对照里露一面。

## 学习目标

读完本文你将能够：

1. 说清裸机世界与桌面世界的差异，建立「每一字节、每一毫秒都有预算」的资源思维，用 -Os、size 与段裁剪把固件体积量出来、裁下来；
2. 用 volatile 与掩码四件套安全访问外设寄存器，说清读-改-写与原子置位/复位寄存器的差别；
3. 讲出从上电到 main 之间的完整链条：向量表装载栈顶与复位向量、启动代码搬 .data、清 .bss，并读懂最小链接脚本的 MEMORY 与 SECTIONS；
4. 写出守纪律的 ISR：短、volatile 标志、临界区保护共享数据，并说清为什么 malloc 与 printf 不能进 ISR；
5. 用看门狗兜住失控的固件，用 -fstack-usage 给栈定预算，在 QEMU 里跑起自己的第一个 Cortex-M 固件。

预计 60 到 80 分钟，包含 4 组动手实验与 3 道练习。

## 1. 问题引入：闪烁一盏 LED，为什么值得讲一整篇

在 PC 上，「让灯闪起来」是几行 printf 加一条系统调用的事——操作系统替你管着一切。而在单片机上，最小编程单元是这样的：

```c
/* blink.c：在一块虚构单片机上让 LED 闪起来 */
#include <stdint.h>

#define GPIO_OUT  (*(volatile uint32_t *)0x50000000)  /* 输出数据寄存器：固定地址 */
#define LED_BIT   (1u << 5)

static void delay(int n) {
    while (n-- > 0) {
        for (volatile int i = 0; i < 1000; i++) {  /* 忙等延时：粗略，但能跑 */
        }
    }
}

int main(void) {
    while (1) {
        GPIO_OUT |= LED_BIT;     /* 拉高：LED 亮 */
        delay(500);
        GPIO_OUT &= ~LED_BIT;    /* 拉低：LED 灭 */
        delay(500);
    }
}
```

与桌面 C 相比，这个 main 有三处「不对劲」：没有操作系统，代码直接读写物理地址；没有 printf，出错了连一句报错都没有；main 永不返回——返回了也不知道该去哪。很多初学者的第一反应是恐慌：「连输出都没有，我怎么调试？」

本篇的回答贯穿全文：输出重定向到串口（第 8 节）、寄存器状态当证据（第 3 节）、看门狗兜底（第 7 节）、仿真器单步（第 8 节 QEMU）。恐慌来自「黑盒」，下面每一节都在把盒子拆开一条缝。

## 2. 裸机心智模型：每一字节都有预算

先把两个世界的账本并排放：

| 维度 | 桌面程序 | 裸机固件 |
| --- | --- | --- |
| 运行环境 | 操作系统加载、调度 | 上电直接跑 main，没有老板 |
| 内存量级 | GB 级，堆近乎无限 | 几 KB 到几百 KB RAM |
| 程序存储 | 文件系统里的可执行文件 | Flash 芯片，代码与数据同住 |
| 标准库 | stdio、malloc、文件全家桶 | 往往只有 string.h 级别的子集 |
| 出错后果 | 崩溃、core dump、重启进程 | 死机、变砖，可能炸了真实设备 |

资源预算是裸机的第一现实：64KB Flash、16KB RAM 是常见的入门配置。所以裸机 C 工程师的第一个习惯不是写代码，而是**量体积**。交叉工具链的 size 命令把固件按段拆给你看（交叉编译概念见第 8 节）：

```bash
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -Os blink.c -o blink.elf
arm-none-eabi-size blink.elf
```

一次典型输出：

```text
   text    data     bss     dec     hex filename
   1424       8      16    1448     5a8 blink.elf
```

三列对应 [内存深水区](/c/210-MemoryManagement) 的老朋友：text 是代码与常量，占 Flash；data 是初始化过的全局变量，初值存 Flash、运行在 RAM，**两边都占**；bss 是未初始化变量，只占 RAM。dec 列是 text + data + bss 总和——Flash 预算按 text + data 算，RAM 预算按 data + bss 加上堆栈算。`-Os` 告诉编译器「以体积为先」：牺牲一部分速度，换更短的指令序列。

修改实验一：给 blink.c 加两个「看起来会用到」的函数，再裁掉它们：

```c
static void debug_menu(void)  { /* 200 行的调试菜单，写了没用上 */ }
static long crc_table(void)   { /* 算一张 CRC 表，同样没人调用 */ }
```

不裁剪时 text 涨到约 1900 字节；加上段回收再编：

```bash
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -Os \
    -ffunction-sections -fdata-sections -Wl,--gc-sections \
    blink.c -o blink_gc.elf
arm-none-eabi-size blink_gc.elf
```

```text
   text    data     bss     dec     hex filename
   1428       8      16    1452     5ac blink_gc.elf
```

体积回到基线。原理分两半：`-ffunction-sections -fdata-sections` 让**每个函数、每个变量各占一个段**（GCC 手册原文：「Place each function or data item into its own section in the output file」）；`--gc-sections` 让链接器从入口出发做**垃圾回收**，未引用的段整段丢弃（GNU ld 手册原文：「Enable garbage collection of unused input sections」）。默认情况下所有函数挤在一个 text 段里，只要有一处引用就整段保留，死代码想扔也扔不掉。注意两个例外：函数指针表、中断向量这类「链接器看不见的引用」可能被误裁，用 [属性与编译器扩展](/c/540-AttributeCompilerExtension) 的 `used` 属性或链接脚本的 `KEEP` 保住它们。

堆策略一句：裸机的堆要么不存在（全部静态分配），要么启动时一次性分配、运行期不再 malloc/free——碎片在 16KB RAM 里没有第二次机会，malloc 的四件套纪律见 [动态内存](/c/200-DynamicMemoryManagement)。资源再往上一个档位是 RTOS（几 KB 到几十 KB 的内核开销，抢占式多任务），再往上就是嵌入式 Linux（完整内核与文件系统）——世界越接近桌面，桌面篇的纪律就越适用。

## 3. 寄存器访问：外设寄存器就是固定地址的内存

第 1 节的 `GPIO_OUT` 揭示了裸机的核心事实：**外设寄存器就是被映射到固定地址的内存单元**，往那个地址写一个字，引脚电平就变；读一个字，拿到的就是外设当前状态。声明它通常写成三层限定（[const 与 volatile 正交语义](/c/260-CVolatileAndConstDeepDive) 的 2x2 表在这里全部落地）：

```c
/* 寄存器映射声明：三层限定各司其职 */
#define REG_STATUS  (*(const volatile uint32_t *)0x40011000)  /* 只读寄存器 */
#define REG_CTRL    (*(volatile uint32_t *)0x40011004)        /* 读写寄存器 */
```

- `volatile` 是主角：没有它，`while (!(REG_STATUS & READY))` 这类轮询在 -O2 下会被优化成读一次然后死循环——这个实验 270 篇已经完整跑过一遍（-O0 退出、-O2 死循环），在真机上它表现为「单步能过、全速跑挂」，因为调试器介入会强迫真实访存，恰好掩盖了被优化的读。语义细节（它给什么、不给什么）在 260 与 270，这里直接用结论：**凡是内容会绕过 CPU 改变的地址，都要 volatile**。
- `const` 只加在「硬件只写」或「硬件只读」的寄存器上：它对编译器是契约（260 篇），对硬件是防呆——固件误写只读寄存器，多数总线当场报错。

寄存器的位操作就是 [位运算](/c/070-BitwiseBitField) 掩码四件套的主场：`REG_CTRL |= TE;` 置位、`REG_CTRL &= ~TE;` 清零、`(REG_STATUS & FLAG) != 0` 测试、`REG_CTRL ^= LED;` 翻转。两条纪律：

1. **字面量带 U 后缀**：`24u * 1000u * 1000u / 1000u` 才是安全的频率换算，写成 `24 * 1000 * 1000` 可能在 16 位 int 平台上算到一半溢出——表达式溢出不看你赋值给什么类型，看参与运算的类型本身；
2. **知道 `|=` 不是原子的**：它是「读、改、写」三步，两拍之间中断或硬件可能改掉了同寄存器的其他位，你的写回会把别人的修改覆盖掉。因此厂商常提供「写 1 置位、写 1 复位」的**原子置位/复位寄存器**（CMSIS 风格的 BSRR：写一个字，置位与清零一条指令完成），需要原子位操作时用它，系统级的原子性与内存序全图见 [原子与内存模型](/c/380-AtomicAndMemoryModel)。

最后一个经典问题：「能不能定义一个位域结构体，直接铺在寄存器地址上？」[位域](/c/240-BitField) 已经给出答案：位的排列顺序与存储分配是实现定义的，换个编译器可能全盘错位，volatile 位域还叠着访问合并的争议。嵌入式界的主流做法是**驱动层用寄存器级掩码**（本节的写法），位域只在同一编译器、静态断言验证过布局的前提下作为可读性视图使用。

## 4. 启动流程：main 之前发生了什么

桌面程序在 main 之前有操作系统与 C 运行时兜底（210 篇：加载器铺好五段）。裸机固件上电的那一刻，RAM 里是随机垃圾，没有人替你做任何事——一切要自己来。以 ARM Cortex-M 为例，上电序列短得出奇：

1. 硬件从地址 0 处的**向量表**取出头两个字：第 0 个字装入主栈指针 MSP（栈顶地址），第 1 个字装入 PC——它就是**复位处理程序**的地址；
2. 从复位处理程序开始执行，此处已可以用栈。

Cortex-M 复位后运行在特权 Thread 模式、用 MSP；另有第二根栈指针 PSP，供 RTOS 把任务栈与内核栈分开（第 5 节的一句伏笔）。接下来复位处理程序（俗称**启动代码**）要替 C 运行时铺好地基，压缩版如下：

```c
/* reset.c：上电后最先执行的代码（简化示意，非完整产品版） */
#include <stdint.h>

extern uint32_t _estack;                  /* 栈顶：链接脚本给出 */
extern uint32_t _sidata, _sdata, _edata;  /* .data 在 Flash 的源与在 RAM 的起终点 */
extern uint32_t _sbss, _ebss;             /* .bss 在 RAM 的起终点 */

int main(void);

void reset_handler(void) {
    uint32_t *src = &_sidata;
    uint32_t *dst = &_sdata;
    while (dst < &_edata) {               /* 搬 .data：初值从 Flash 拷进 RAM */
        *dst++ = *src++;
    }
    for (dst = &_sbss; dst < &_ebss; ) {  /* 清 .bss：不写初值也是 0 */
        *dst++ = 0;
    }
    (void)main();
    while (1) {                           /* main 不许返回：真机没有 exit 可去 */
    }
}

/* 向量表：第 0 字初始栈顶，第 1 字复位向量。
 * section 属性（540 篇）把它放进专用段，供链接脚本摆到地址 0 */
__attribute__((section(".isr_vector"), used))
void (* const vectors[])(void) = {
    (void (*)(void))(&_estack),
    reset_handler,
};
```

这三件事解释了两个桌面时代的老问题在嵌入式的新答案：为什么「全局变量不写初值也是 0」（bss 清零，210 篇的加载器职责现在归启动代码）；为什么「初始化过的全局变量」两边占地方（初值必须烧进 Flash 才能断电保存，运行时又必须在 RAM 里可写）。真实产品的启动代码还会先配时钟与 Flash 等待周期，中断处理函数名则用 540 篇的 `weak` 属性挂成默认死循环，应用层同名覆盖即可。

铺地基的图纸是**链接脚本**，最小骨架一瞥：

```ld
/* 最小链接脚本骨架（示意，非完整可用版本） */
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    .isr_vector : { KEEP(*(.isr_vector)) } > FLASH  /* KEEP：不许被 --gc-sections 收走 */
    .text       : { *(.text*) *(.rodata*) } > FLASH /* 代码与只读数据留在 Flash */
    .data       : { *(.data*) } > RAM AT > FLASH    /* 运行在 RAM，初值存 Flash */
    .bss        : { *(.bss*) *(COMMON) } > RAM
}
```

`> RAM AT > FLASH` 一行同时定义了两套地址：装载地址（Flash 里存的那份初值，启动代码的 `_sidata` 指向它）与运行地址（RAM 里的工作副本，`_sdata` 指向它）——启动代码的搬运用装载地址，日常读写用运行地址。540 篇的 `section(".mydata")` 自定义段、第 2 节的段裁剪，都在这张图纸上各就各位。链接脚本完整语法（符号、断言、调试段）超出本篇主线，以工具链手册为准。

## 5. HAL 与寄存器直写：两种风格

同一件事「开定时器」，两种写法：

```c
/* 风格一：寄存器直写（伪芯片，寄存器名即文档） */
REG_TIMER_CTRL |= TIMER_ENABLE;      /* 我在动 CTRL 的使能位 */
REG_TIMER_LOAD = 1000;               /* 重装值：数字出自数据手册 */

/* 风格二：HAL 封装（通用伪 API，不绑具体厂商） */
hal_timer_enable(HAL_TIMER_2, 1000); /* HAL 替我查表、配引脚、写寄存器 */
```

| 维度 | 寄存器直写 | HAL 库 |
| --- | --- | --- |
| 可读性 | 逐位对数据手册，行行见血 | 语义化 API，意图先行 |
| 可移植性 | 换芯片近乎重写 | 同家族芯片间移植成本低 |
| 体积 | 最小，用到哪写到哪 | 抽象层厚，常拖进整片初始化 |
| 适合 | 学习原理、极致裁剪、驱动作者 | 快速出活、跨型号产品线 |

本篇教直写，不是排斥 HAL：直写逼你读懂数据手册，读懂了再看 HAL 是「查表替你写寄存器的宏」，反而一眼看穿它在做什么。Arduino 一类框架是 HAL 的再上一层——把「闪个灯」压缩成三行，代价是你永远不知道第 4 节的启动流程曾经存在。初学用直写打地基，生产按团队规范选边。

顺带两句伏笔。其一，前面提到 Cortex-M 有 MSP 与 PSP 两根栈指针：复位后一切跑在 MSP 上；RTOS 启动后让任务跑 PSP、内核与中断留在 MSP，上下文切换正是靠「换 PSP 指针」完成的——这是裸机与 RTOS 在硬件上的分水岭。其二，高频数据流（摄像头、音频、高速采样）不靠 CPU 逐字节搬运，而是配好 DMA（直接内存访问）控制器一次搬一串，CPU 只在完成中断里收货。

## 6. 中断服务程序：在别人的打断下工作

外设不会等你轮询，它会主动「举手」：硬件事件触发**中断**，CPU 存好现场、跳进你注册的**中断服务程序**（ISR），执行完从断点继续。[信号处理](/c/340-SignalHandling) 开头那句「信号是发给进程的软件中断」在这里兑现成硬件版——同样异步到达，同样时机不由你，340 篇的两条处理器纪律原封不动搬过来。

**纪律一：ISR 要短，只立标志，逻辑回主循环。** 做法是共享一个标志位或缓冲区，主循环轮询处理：

```c
/* isr.c：UART 收包的中断侧与主循环侧 */
#include <stdint.h>

#define BUF_SIZE 64

static volatile uint8_t  rx_buf[BUF_SIZE];
static volatile uint16_t rx_head;    /* 只有 ISR 写 */
static volatile uint16_t rx_tail;    /* 只有主循环写 */

void uart_isr(void) {                /* UART 收到一字节时被硬件调用 */
    uint8_t b = uart_read_byte();    /* 读数据同时清标志（假设的驱动函数） */
    uint16_t next = (uint16_t)((rx_head + 1u) % BUF_SIZE);
    if (next != rx_tail) {           /* 缓冲区没满才写，满则丢弃 */
        rx_buf[rx_head] = b;         /* 宁可丢字节，也不让 ISR 变长 */
    }
    rx_head = next;
}

int uart_read_byte(void) {           /* 主循环调用 */
    if (rx_head == rx_tail) {
        return -1;                   /* 无数据 */
    }
    uint8_t b = rx_buf[rx_tail];
    rx_tail = (uint16_t)((rx_tail + 1u) % BUF_SIZE);
    return b;
}
```

单生产者（ISR）单消费者（主循环）各写各的下标，天然无锁——volatile 保证两边都从内存读最新值。这套「处理器只立标志」与 340 篇的结论逐字同构。

**纪律二：多字节或多步共享，必须临界区。** 标志无害，但「读-改-写」三步的共享变量会被中断插队：

```c
volatile uint32_t g_ticks;           /* SysTick 中断里 ++ 的全局计数 */

uint32_t ticks_get(void) {           /* 在 16 位 MCU 上：32 位读是两条指令 */
    uint32_t snapshot;
    __disable_irq();                 /* 进临界区：CMSIS 内置，其他工具链有等价物 */
    snapshot = g_ticks;              /* 32 位机上对齐的 32 位读本身原子，可省 */
    __enable_irq();
    return snapshot;
}
```

关中断临界区是裸机版的「锁」：代价是关中断期间任何中断都进不来，所以**临界区必须短到几条指令**（实时性优化清单里「临界区最小化」一条的意思）。它只解决单核场景；多核与跨核共享是硬件原子指令的领地（[原子与内存模型](/c/380-AtomicAndMemoryModel) 与 560 篇）。

**纪律三：ISR 里禁止调用不可重入的库函数。** malloc/free 操作的全局堆链表可能正被主循环改到一半；printf 依赖全局缓冲与锁。ISR 插进来再用它们，堆或缓冲区立刻进入「改了一半」的状态——这类事故的排查见第 9 节实录二。ISR 里能做的只有：读写寄存器、操作自己的缓冲区、置 volatile 标志。

## 7. 可靠性工程：看门狗、栈核算与 MISRA C

**看门狗**是一个独立递减的计数器：减到零就复位整个系统；程序必须周期性地「喂狗」把它重置回初值。它防的是第 1 节那个恐慌问题的极端形态——**固件死了，但没人知道**：主循环卡在等一个永远不会置位的标志，指示灯停在半亮，设备看起来还在运转。看门狗把「无声死机」变成「自动重启」，这是很多远程设备唯一能自己采取的急救措施。

喂狗点的选择比喂狗本身重要：把喂狗塞进定时器中断里无脑喂，主循环死机了看门狗照样被喂——看门狗被架空。正确姿势是在主循环里**确证自己活着的地方**喂：比如「收到了传感器新数据且校验通过」之后。进阶形态是窗口看门狗：喂得太晚复位，喂得太早也复位——程序跑飞的一种形态不是卡死，而是「跑太快」（循环条件被破坏提前通过），窗口把这条路也堵上。具体计数周期由独立低速时钟驱动，与主时钟独立，主时钟挂了它照样工作。

**栈核算**是第二道保险。桌面程序栈溢出会得到保护页与清晰的崩溃报告；裸机栈只有几 KB，溢出后写坏的是相邻的全局变量——这是比崩溃更危险的结果（实录三）。工具是 250 篇的 `-fstack-usage`：编译时给每个函数的栈帧量尺寸，配合 `-Wstack-usage=N` 把超支函数变成编译告警。预算公式的心智版：最深调用链各帧之和，加上最深处被打断时 ISR 的压栈开销，再乘 1.5 到 2 的余量。裸机界还有一条硬规矩：**不用递归**——递归深度不可静态预算（递归的桌面级分析在 250 篇），解析嵌套数据改用显式栈或循环。

**MISRA C** 一句概览：它是汽车、医疗、航空等安全关键行业广泛采用的 C 编码规范，规则如「禁止递归」「限制动态内存」「不依赖未定义行为」——精神是把语言的自由裁剪成「可静态分析、可审查」的子集。知道它存在、理解它的动机，就足够本篇了；完整规则集与合规流程超出主线，静态分析工具怎么落地这些规则见 [静态分析与调试](/c/490-StaticAnalysisDebug)。

## 8. 工具链与仿真：交叉编译与 QEMU

**交叉编译**：在 x86 电脑（host）上编译出 ARM 单片机（target）的代码。前缀就是说明书——`arm-none-eabi-gcc` 的三段：`arm` 目标架构、`none` 裸机（没有操作系统，因此没有依赖操作系统的 C 库）、`eabi` 嵌入式二进制接口约定。第 2 节的 size 命令同属这套交叉工具链（binutils）。

没有开发板也能起步——**QEMU 仿真**。QEMU 内置了若干「机器」模型，其中 `mps2-an385` 复刻了 Arm 应用笔记 AN385 里的 FPGA 图像，CPU 是 Cortex-M3（QEMU 文档还提供 an386 的 M4、an500 的 M7 等）。把第 8 节之前编好的固件喂给它：

```bash
qemu-system-arm -machine mps2-an385 -kernel blink.elf -nographic -serial stdio
```

板上的 UART 被接到宿主终端，固件的串口输出直接打印在你的命令行里。最小可观测实验：给 blink.c 加上第 8 节末尾的串口输出，每 500 毫秒打一行 `led on` / `led off`——灯在仿真里看不见，日志看得见。具体的外设地址、UART 实例与命令行参数以所用 QEMU 版本的文档为准，官方在线示例见 FreeRTOS 的 MPS2 AN385 演示（可下载后用一条 qemu 命令直接跑通）。

**printf 重定向（retarget）**：裸机没有屏幕，标准库的 printf 终点的实现留空，C 库留出「写一个字符」的出口让你自己接。以 newlib 为例，重写 `fputc` 接到串口驱动：

```c
/* retarget.c：把标准库的字符输出接到串口 */
#include <stdio.h>

extern void uart_putc(char c);       /* 第 6 节式轮询发送，由你的驱动实现 */

int fputc(int ch, FILE *f) {
    (void)f;
    if (ch == '\n') {
        uart_putc('\r');             /* 终端习惯 CRLF，顺手补上 */
    }
    uart_putc((char)ch);
    return (unsigned char)ch;
}
```

此后库内所有打印都汇聚到这一个函数。注意挂点因 C 库而异（newlib 是 `fputc`，其他库可能是 `_write` 或厂商宏），以所用库的手册为准；生产固件对 printf 要克制——它体积大、慢，还不可进 ISR（第 6 节纪律三）。

## 9. 常见错误与调试实录

**实录一：忘写 volatile，固件「单步能过、全速跑挂」。** 症状：轮询一个由 DMA 或外设置位的标志，全速运行永不退出；挂上调试器单步，又能跑过去。原因在 270 篇拆过：优化器看见循环体没人改这个变量，把「每次都读内存」优化成「读一次」，单步时调试器强迫真实访存，恰好掩盖了病灶。修复：给寄存器地址与 ISR/DMA 共享变量补 volatile。这是嵌入式代码评审的第一条检查项。

**实录二：ISR 里调 printf，故障「每天一次，毫无规律」。** 症状：设备数小时后输出乱码随后死机，崩溃点每次不同。排查思路：崩溃点不可复现，说明真凶在别处——把注意力移到「所有异步执行流」上，发现串口接收 ISR 里有一行调试残留的 `printf("rx: %c\n", ...)`。主循环的 printf 正在格式化到一半，ISR 插进来又 printf，两个执行流交错踩同一个全局缓冲。修复即第 6 节纪律三：ISR 里只写环形缓冲区。这个案例也是「偶现故障先怀疑共享状态」的标本：静默的交错才会偶现，把它变必现靠评审而不是靠运气。

**实录三：栈溢出踩坏毫不相干的全局变量。** 症状：某个从不被写入的统计变量偶尔变成随机值；无崩溃报告，一切看似正常。排查：4KB 栈预算，新加的 JSON 解析用了递归，深层嵌套数据一来，栈越过界线向下生长，写进了紧邻栈底的 bss 区。修复三件套：`-fstack-usage` 量出解析器帧深，递归改迭代，预算内预留余量。教训：裸机的栈溢出不是崩溃，是**数据被悄悄改写**——比崩溃更难查，因为受害者与凶手相隔十万八千里。

## 10. 实际项目中的使用场景

- 家电、传感节点、电机控制：本篇主线的标准战场——裸机加中断，主循环一个状态机，看门狗兜底；
- 中端设备上 RTOS：FreeRTOS、Zephyr 用任务与队列代替手写状态机，但 ISR 纪律、栈核算、volatile 规则一条不少——本篇是它们的地基而非替代品；
- 单人也能维护的真实固件：开源项目 FoloToy-calendar 在 ESP32-C3（8MB Flash、无 PSRAM、单核 RISC-V）上实现日历玩法固件。它把本章知识点全用上了：月历网格用像素位图而非图片资源、数据按字节精打细算，是第 2 节的资源预算思维；固件、字体点阵与配置区在 8MB Flash 里的分区规划，是第 4 节段布局思想的放大版；配网与校时是典型的事件驱动状态机。嵌入式 C 的门槛不在芯片多贵——一块几十元的开发板即可完整复现这条学习路径。

## 11. 小练习

预测题（5 分钟）：把第 1 节 delay 函数内层循环的 `volatile int i` 改成普通 `int i`，先写答案再编译（用 -O2）：

```c
static void delay(int n) {
    while (n-- > 0) {
        for (int i = 0; i < 1000; i++) {  /* 改动在这里 */
        }
    }
}
```

参考答案（先写再看）：内层循环体是空的，优化器认出「循环一千米什么都没做」，整段删掉；外层的 while 若也被认定无事可做则一起蒸发，delay 退化成两次直通调用——LED 以肉眼跟不上的频率狂闪，或干脆看起来常亮。把变量标成 volatile 是「我就是要这段循环存在」的声明。

修改题（15 分钟）：给 blink.c 装上看门狗（通用伪 API：`wdg_init(ms)` 启动，`wdg_feed()` 喂狗）。要求：主循环每圈喂狗；然后故意加一段「等一个永远不会置位的标志」的死循环，观察现象。验收：设备周期性复位（加一个开机计数打印就能看到）。这个实验就是「忘记喂狗的现场」的受控复现。

挑战题（半小时，不看答案先动手）：把第 6 节的环形缓冲区补完并加固。提示两级如下。

提示（思路方向）：`uart_read_byte` 返回 -1 已处理空缓冲；想象再补一个「主循环清空缓冲区」的场景，tail 与 head 的修改就会出现在两个执行流里。

展开（关键 API 与检查）：凡主循环可能读改 head 或 ISR 之外写 tail 的路径，包一层 `__disable_irq()` / `__enable_irq()`；完成后 `grep -n` 自查 uart_isr 内除寄存器访问与缓冲区操作外没有任何函数调用。验收：ISR 体内无库函数调用；共享下标的每次写都有明确的唯一属主或临界区保护。

## 12. 与之前和之后的知识的关系

- 往前：volatile 的三场景（[const 与 volatile 正交语义](/c/260-CVolatileAndConstDeepDive)、[volatile 关键字](/c/270-VolatileKeyword)）在寄存器与中断共享变量上全部落地；掩码四件套（[位运算](/c/070-BitwiseBitField)）与位域争议（[位域](/c/240-BitField)）在驱动层合流；五段布局（[内存深水区](/c/210-MemoryManagement)）的嵌入式对应物是第 4 节的启动代码；栈核算（[函数调用栈帧](/c/250-FunctionCallStackFrame)）在这里从「性能问题」升级为「生存问题」；
- 旁支：[信号处理](/c/340-SignalHandling) 是中断的桌面镜像——两条处理器纪律完全同构；malloc 纪律（[动态内存](/c/200-DynamicMemoryManagement)）在裸机的答案是「尽量不 malloc」；
- 往后：当 C 不够用时——内联汇编、操作数约束、内存屏障与原子指令——见 [C 与汇编交互](/c/560-CAssemblyInteraction)；MISRA 式检查的工程化落地见 [静态分析与调试](/c/490-StaticAnalysisDebug)。

## 13. 官方文档

- QEMU Arm MPS2 与 MPS3 机型文档（mps2-an385 即 Arm AN385 的 Cortex-M3，另有 an386 的 M4、an500 的 M7）：https://www.qemu.org/docs/master/system/arm/mps2.html
- FreeRTOS 官方 QEMU MPS2 AN385 演示（Cortex-M3 固件 + qemu 命令直接运行）：https://freertos.org/freertos-on-qemu-mps2-an385-model.html
- GNU ld 手册（--gc-sections 垃圾回收未用输入段的权威定义）：https://sourceware.org/binutils/docs/ld/Options.html
- gcc(1) 手册页（-ffunction-sections/-fdata-sections 与 -Os 的官方文本）：https://man7.org/linux/man-pages/man1/gcc.1.html

## 14. 自我检查

- 能向同事讲清「64KB Flash、16KB RAM」的账怎么算：text/data/bss 各占哪边，-Os 与段回收各省哪一部分；
- 能写出三重限定的寄存器声明并逐层解释，说清 `|=` 为什么不原子、原子置位/复位寄存器好在哪；
- 能不看资料复述上电到 main 的链条：向量表头两字、搬 .data、清 .bss，并解释 `> RAM AT > FLASH` 的两套地址；
- 能说出 ISR 三条纪律，以及 printf 与 malloc 进 ISR 分别会踩坏什么；
- 能解释看门狗为什么不能在定时器中断里无脑喂，以及裸机栈溢出为什么表现为「不相干的变量被改」。

## 本章总结

裸机的第一现实是预算：size 量出 text/data/bss，-Os 与段回收把体积裁到只含活代码。外设寄存器是固定地址的内存，volatile 禁缓存、const 立契约、掩码四件套做位操作，读-改-写非原子所以有置位/复位寄存器。上电到 main 之间没有魔法：向量表头两字给出栈顶与复位向量，启动代码搬 .data、清 .bss，链接脚本是这一切的图纸。ISR 的世界规则三条：短、volatile 标志、临界区保护；malloc 与 printf 是禁区。看门狗把无声死机变成自动重启，栈预算把溢出从「悄悄改数据」提前到「编译告警」。printf 重定向到串口、QEMU 仿真免板起步——黑盒从第 1 节的恐慌，到本节已经拆到了可以随手检修的程度。

## 下一步

进入 [C 与汇编交互](/c/560-CAssemblyInteraction)：当编译器生成的代码不够快、或你需要裸机世界的最后一层控制——内联汇编与操作数约束、内存屏障与原子指令，看 C 与汇编如何在同一段固件里握手。
