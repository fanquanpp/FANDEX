---
order: 510
title: 构建系统：从 Makefile 到 CMake
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 8 个文件的项目手敲 gcc 到崩溃：从时间戳增量构建的原理学会 Make（四要素、tab 惨案、$@ $< $^、模式规则、.PHONY 失灵实录、-MMD 头文件依赖），再上 CMake（cmake_minimum_required 钉策略、target-based 现代写法、out-of-source 构建），链接顺序为何被 CMake 自动接管的机制回扣。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/320-DynamicStaticLibrary'
  - 'c/485-StaticAnalysisAndSanitizers'
  - 'c/410-CrossPlatformProgramming'
prerequisites:
  - 'c/310-MultiFileCompilation'
  - 'c/320-DynamicStaticLibrary'
---

## 前置知识

- 已完成 [多文件编译](/c/310-MultiFileCompilation)：会把 main.c 与 utils.c 分开 -c 再链接，理解 .o 是链接的原材料；
- 已完成 [动态库与静态库](/c/320-DynamicStaticLibrary)：会用 ar、gcc -L -l，见过链接顺序问题。本篇会把这些命令交给工具编排。

头文件守卫等细节记不全也能往下读，用到就带一句（详见 [预处理器与宏](/c/290-PreprocessorMacro)）。

> 分工说明：310 讲手工多文件编译与链接机制，320 讲库本身；本篇回答「文件多到手敲命令不现实了怎么办」——构建的编排交给 Make 与 CMake。两篇旧命令在这里全部变成可维护的脚本，且只讲编排机制本身：交叉编译工具链、依赖下载等展开在 [跨平台编程](/c/410-CrossPlatformProgramming)，与静态分析工具的集成在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。

## 学习目标

读完本文你将能够：

1. 说出构建系统要解决的五个问题，并解释增量构建「目标不存在或依赖比目标新就重建」的判定规则；
2. 手写含变量、自动变量、模式规则的 Makefile，解释 tab 缩进为什么是语法的一部分，并用 .PHONY 救活失灵的 clean；
3. 用 -MMD -MP 让 Make 自动追踪头文件依赖，复现「改了头文件却没重编」的惨案并修复；
4. 写出最低可用的 CMakeLists.txt，用 target_include_directories / target_link_libraries 的 PUBLIC/PRIVATE/INTERFACE 组织多目标工程，并说出 CMake 为什么替你处理了 320 篇的链接顺序问题；
5. 用 cmake -S . -B build 与 cmake --build 完成 out-of-source 构建，说出它为什么优于在源码树里直接 cmake。

预计 60 到 80 分钟，含 4 组动手实验与 2 道练习。

## 1. 问题引入：八条命令的黄昏

项目长到 8 个源文件，编译它要这样：

```bash
gcc -Wall -Wextra -g -Iinclude -c src/main.c   -o build/main.o
gcc -Wall -Wextra -g -Iinclude -c src/utils.c  -o build/utils.o
gcc -Wall -Wextra -g -Iinclude -c src/parser.c -o build/parser.o
gcc -Wall -Wextra -g -Iinclude -c src/log.c    -o build/log.o
gcc -Wall -Wextra -g -Iinclude -c src/str.c    -o build/str.o
gcc -Wall -Wextra -g -Iinclude -c src/config.c -o build/config.o
gcc -Wall -Wextra -g -Iinclude -c src/net.c    -o build/net.o
gcc -Wall -Wextra -g -Iinclude -c src/db.c     -o build/db.o
gcc build/*.o -o app
```

痛感分三层。第一层：命令模板重复九遍，改个警告选项要改九处。第二层，也是真正不可容忍的一层：改了 parser.h 的一行注释，你其实只需要重编 parser.c 和 include 它的 main.c，其余六个 .o 原封不动——但你没有工具替你算这笔账，最省心的动作是把 8 条全部重敲，全量重编。第三层：8 个 .c 互不依赖，本可以 8 核同时编，手敲只能一个一个来。

于是需求清单自动浮出：把命令**模板化**（一份描述，处处复用）、把「哪些要重编」的账**自动化**（增量构建）、把无依赖的任务**并行**执行。这套需求在 1976 年催生了 Make；项目再长、平台再多，又在 2000 年催生了给构建系统写配置的 CMake。构建系统的全部工作就是：解析「目标—依赖—命令」的图，按时间戳决定谁要重建，把无依赖的活并行发出去。

## 2. Make：让时间戳替你记账

### 2.1 Makefile 四要素：目标、依赖、命令、tab

回到 310 篇的三文件小项目。main.c 用了 utils.h，utils.c 也用 utils.h，依赖图是：

```text
app ← main.o + utils.o
main.o ← main.c + utils.h
utils.o ← utils.c + utils.h
```

把它誊写成 Makefile：

```makefile
app: main.o utils.o
	gcc main.o utils.o -o app

main.o: main.c utils.h
	gcc -Wall -Wextra -g -c main.c

utils.o: utils.c utils.h
	gcc -Wall -Wextra -g -c utils.c
```

一条规则四个要素：**目标**（冒号左边）、**依赖**（冒号右边）、**命令**（下一行起，必须以 tab 开头）、以及 tab 本身——它不是缩进美化，是语法的一部分。执行：

```bash
make
```

```text
gcc -Wall -Wextra -g -c main.c
gcc -Wall -Wextra -g -c utils.c
gcc main.o utils.o -o app
```

make 不带参数构建第一个目标（app）。它的工作方式是递归核对：要把 app 造出来，先看 main.o 和 utils.o 在不在、旧不旧；要核对 main.o，又先核对它的依赖——一路递归到源文件这种「天然最新」的叶子。判定规则一句话：**目标文件不存在，或任一依赖的修改时间比目标新，就执行命令重建**；否则宣布无事可做。这就是增量构建的全部原理——编译器不改文件时间戳，所以「改了什么」被忠实记在文件系统里，make 只需比较时间戳。

再跑一次 make：

```text
make: 'app' is up to date.
```

什么都没变，一条命令都没执行。手敲九条命令的时代，这笔账是你用自己的注意力付的。

### 2.2 变量与自动变量：把模板写一遍

九处重复的命令模板收敛成变量。`:=` 是立即展开赋值（读到这行定死），`=` 是延迟展开（用到时才求值）——本篇统一用 `:=` 少踩坑：

```makefile
CC     := gcc
CFLAGS := -Wall -Wextra -g

app: main.o utils.o
	$(CC) main.o utils.o -o app

main.o: main.c utils.h
	$(CC) $(CFLAGS) -c main.c

utils.o: utils.c utils.h
	$(CC) $(CFLAGS) -c utils.c
```

规则体里的重复再用自动变量消掉——它们在命令执行时才替换：`$@` 是目标名，`$<` 是第一个依赖，`$^` 是全部依赖：

```makefile
app: main.o utils.o
	$(CC) $^ -o $@

main.o: main.c utils.h
	$(CC) $(CFLAGS) -c $<

utils.o: utils.c utils.h
	$(CC) $(CFLAGS) -c $<
```

现在编译选项、编译器名各只有一处定义。命令行还能临时覆盖：`make CC=clang CFLAGS="-O2"`，调试不同编译器不用改文件。

### 2.3 模式规则：一条规则管一片

三条规则里，两条 .o 规则除文件名外一模一样。模式规则用 `%` 当通配符，把「同类目标同一做法」写一次：

```makefile
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
```

`%.o: %.c` 读作：任何 x.o 都能从 x.c 造出来。310 篇结尾提过 make 的隐式规则——即使你一行不写，`make main.o` 也知道从 main.c 编——你亲手写的模式规则就是那个隐式规则的显式版。配上通配与替换函数，源文件列表可以自动展开：

```makefile
SRCS := $(wildcard src/*.c)     # 展开 src/ 下全部 .c
OBJS := $(SRCS:.c=.o)           # 后缀替换：src/x.c → src/x.o
```

### 2.4 实验 1：touch 一个头文件，看谁重编

增量构建对不对，touch 一下就知道（touch 只更新时间戳，不改内容）。基于 2.1 的 Makefile：

```bash
make          # 全量构建
touch utils.h
make
```

```text
gcc -Wall -Wextra -g -c main.c
gcc -Wall -Wextra -g -c utils.c
gcc main.o utils.o -o app
```

两个 .o 都重编了，app 重链了——因为两个 .o 的依赖里都写着 utils.h。把账本反过来验一次：`touch utils.c` 再 make，只有 utils.o 重编（main.o 的依赖里没有它）。make 的「聪明」完全来自你写的依赖清单，它自己不会知道 main.c 里 include 了 utils.h。

这引出增量构建最经典的翻车现场：换成模式规则写法，规则 `%.o: %.c` 的依赖里没有 utils.h——

```bash
touch utils.h
make
```

```text
make: Nothing to be done for 'all'.
```

头文件变了，make 却认为一切最新：依赖图上根本没有 utils.h 这个节点，时间戳比较从未发生。修法不是把每个头文件手写进每条规则（迟早漏），而是让编译器替你生成依赖清单——gcc 的 -MMD -MP 会额外产出一个 .d 文件，内容是「main.o: main.c utils.h」这样的 make 语法依赖行，Makefile 再用 -include 把它们收进账本。完整的写法在第 3 节贯穿示例里。

### 2.5 实验 2：.PHONY——clean 为什么失灵

顺手清理的习惯动作：

```makefile
clean:
	rm -f *.o app
```

```bash
make clean     # 正常：删得干干净净
touch clean    # 灾难前奏：目录里出现了一个叫 clean 的文件
make clean
```

```text
make: Nothing to be done for 'clean'.
```

rm 根本没执行。原因还是那套时间戳判定：make 把 clean 当成普通目标文件核对，文件存在、又没有依赖（没有谁比它新），于是宣布最新——你的清理命令被一个同名文件劫持了。修法是伪目标声明：

```makefile
.PHONY: clean
clean:
	rm -f *.o app
```

.PHONY 告诉 make：clean 不对应任何文件，别做时间戳比较，命令直接执行。惯例上 all、clean、install、test 这些「动作型」目标一律声明 .PHONY——它们表达的是动作，不是产物。

### 2.6 常用实践

- `make -j4`：无依赖关系的目标并行执行，8 个 .c 在 8 核机器上同时编；-j 后不写数字则不限并发；
- `make -n`：干跑——只打印将执行的命令，不真执行，核对 Makefile 行为的利器；
- `make -C build`：先进 build 目录再执行 make，顶层脚本调度子目录时常用；
- `make -k`：某个目标失败后继续构建其余无依赖的目标，尽量多地暴露错误。

## 3. 贯穿示例：多目录项目的完整 Makefile

把第 1 节的 8 文件项目交给 Make。布局沿用 310 篇的惯例并加上独立构建目录：

```text
app/
├── include/
│   ├── utils.h
│   └── parser.h ...
└── src/
    ├── main.c
    └── ...
```

```makefile
CC      := gcc
CFLAGS  := -Wall -Wextra -g -Iinclude -MMD -MP
TARGET  := app
SRCS    := $(wildcard src/*.c)
OBJS    := $(patsubst src/%.c, build/%.o, $(SRCS))
DEPS    := $(OBJS:.o=.d)

.PHONY: all clean
all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $^ -o $@

build/%.o: src/%.c | build
	$(CC) $(CFLAGS) -c $< -o $@

build:
	mkdir -p build

clean:
	rm -rf build $(TARGET)

-include $(DEPS)
```

六个新面孔各司其职：

- `-MMD -MP` 写进 CFLAGS：每次编译顺带生成 build/x.d 依赖清单（.d 就是「这口锅该谁背」的记录），-MP 给每个头补一条空规则，防止删了头文件后 make 报「没有规则可造」；
- `patsubst` 把 src/x.c 改写成 build/x.o，产物全部进 build/，源码树不被 .o 污染；
- `build/%.o: src/%.c | build`：竖线右侧是**顺序依赖**——只要求 build 目录存在即可，目录时间戳变化不会触发重编（普通依赖会）；
- `-include $(DEPS)`：把生成的依赖文件收进账本；文件不存在也不报错（前导短横线）。第一次构建时还没有 .d，第二次起，「改了头文件」就自动变成正确的重编集合——2.4 节的惨案就此根治。

验证闭环：make 全量构建 → touch include/utils.h → make，这次所有用到它的 .o 精确重编，没用的纹丝不动。把第 1 节的九条命令和这个 Makefile 对比：命令模板只写了一遍，账本自动记，`make -j8` 还白送并行。

## 4. CMake：生成构建系统的构建系统

### 4.1 为什么 Make 之上还需要一层

上面的 Makefile 写得再规范，也是 Unix 专属：gcc 的名字、.o 与 .a 的后缀、320 篇那套 lib 前缀约定，换到 Windows 的 MSVC 工具链全部失效，重写一遍？CMake 的定位是元构建系统：你写一份 CMakeLists.txt 描述「有哪些目标、谁依赖谁」，CMake 按你选的**生成器**（Unix Makefiles、Ninja、Visual Studio 工程……）生成对应平台的具体构建文件，再用统一的 `cmake --build` 驱动执行。工作流分配置与生成两阶段：配置阶段读脚本、建目标图、结果缓存进 build/CMakeCache.txt；生成阶段把目标图翻译成构建文件。一次配置，多平台产物。

### 4.2 最低可用的 CMakeLists

三行起步：

```cmake
cmake_minimum_required(VERSION 3.16)
project(app C)
add_executable(app src/main.c src/utils.c)
```

- `cmake_minimum_required` 不是可有可无的仪式：它同时钉死了这个项目采用的**策略版本**——CMake 的命令行为随版本演进（同名命令、同一变量，新旧版本语义有差异，每个差异编号一个 CMP 策略），声明 3.16 就是宣布「按 3.16 的规则解释我」；CMake 4.0 起对声明 3.5 以下的项目直接报错拒绝，3.27 与 3.31 起则分别对老版本声明发弃用警告。写清最低版本，项目在十年后的 CMake 上行为依旧可预期；
- `project` 声明项目名与语言；
- `add_executable` 从源文件列表造一个可执行目标。

构建与运行：

```bash
cmake -S . -B build
cmake --build build
./build/app
```

`-S` 指源码目录、`-B` 指构建目录，CMake 自己挑选平台上合适的生成器；`cmake --build` 是跨生成器的统一构建入口（底下可能是 make 也可能是 ninja，你不用关心）。想显式换引擎：`cmake -G Ninja -S . -B build`。

### 4.3 target-based 现代写法：属性挂在目标上

给项目加上 320 篇的 utils 库，顺便用上现代写法的核心——一切属性（头文件路径、链接关系、编译选项）都挂在**目标**上，并用三个关键字声明可见范围：

```cmake
cmake_minimum_required(VERSION 3.16)
project(app C)

add_library(utils STATIC src/utils.c)
target_include_directories(utils PUBLIC include)
target_compile_options(utils PRIVATE -Wall -Wextra)

add_executable(app src/main.c)
target_link_libraries(app PRIVATE utils)
```

三个关键字的语义是本节的承重墙：

| 关键字 | 自己编译时 | 自己链接时 | 传给链接我的人 |
| --- | --- | --- | --- |
| PUBLIC | 用 | 用 | 传 |
| PRIVATE | 用 | 用 | 不传 |
| INTERFACE | 不用 | 不用 | 传 |

于是 `target_include_directories(utils PUBLIC include)` 的完整含义是：utils 自己编译要用 include/，任何 target_link_libraries 链接 utils 的目标也自动获得这个路径——app 的 CMakeLists 里因此**不需要**出现任何 include 路径，依赖关系自己长出来。链接库同理：utils 若还需第三方库，写成 `target_link_libraries(utils PRIVATE crypto)`，消费者不用知道也不会误用。

对照旧式写法看清淘汰原因：全局的 `include_directories(include)`、`link_libraries(...)` 作用在整个目录的所有目标与子目录上，任何目标都能看见一切头文件——表面省事，实际让「谁真正依赖谁」从工程里消失，改一处牵全身。target-based 的写法多打几个字，换来的是依赖图显式、可传递、可审计。

add_library 的 STATIC 换成 SHARED，就接上了 320 篇：SHARED 库 CMake 自动加 -fPIC（你手工敲的那个参数在这里是默认动作），配 `set_target_properties(utils PROPERTIES VERSION 1.0.0 SOVERSION 1)` 会自动生成 libutils.so.1.0.0 真名、SONAME 与两个软链——320 篇亲手搭的三件套，在这里是两个属性。第三方系统库用 find_package 一句接上：`find_package(ZLIB REQUIRED)` 加 `target_link_libraries(app PRIVATE ZLIB::ZLIB)`，找到即以 ZLIB::ZLIB 这样的目标形式提供，用法与自己的目标一致。

### 4.4 链接顺序去哪了

320 篇花了一整节讲链接顺序惨案，CMake 的代码里却看不到任何顺序安排——`target_link_libraries(app PRIVATE utils)` 只是一条「app 依赖 utils」的边。机制在生成阶段：CMake 攒着整张依赖图，翻译成底层命令时才把 -l 参数按「消费者在左、被依赖者在右」排好，循环依赖等 corner case 也由生成器代为处理。你在 CMake 层写的是**关系**，顺序这个底层细节由工具从关系推导——320 篇的手工惨案仍值得会诊，因为总有一天你会绕过这层保护直接写链接命令。

### 4.5 构建目录实践：out-of-source

上文所有命令都遵守一条纪律：构建产物绝不进源码树。在源码目录里直接 `cmake .` 的旧习惯会把 CMakeCache.txt、CMakeFiles/ 撒满源码树，git status 一片狼藉，删起来还要小心翼翼避开源文件。out-of-source 构建把一切都圈进 build/：

```bash
cmake -S . -B build && cmake --build build
```

好处三连：源码树永远干净（git status 一眼清白）；删掉 build/ 即得全新构建，排查「构建状态诡异」的标准动作；同一源码树可以并排开 build-debug 与 build-release 两套配置互不干扰——`cmake -DCMAKE_BUILD_TYPE=Debug -S . -B build-debug` 与 `-DCMAKE_BUILD_TYPE=Release`（默认编译选项分别是 -g 一路与 -O3 -DNDEBUG 一路）。

顺带一个源文件列表的坑：`file(GLOB SRCS src/*.c)` 在配置阶段扫一次目录，之后新增的 .c 文件不会触发重新配置，新文件静默地不被编译——增量构建的账本上根本没它。稳妥做法是显式列出源文件；嫌麻烦可用 `file(GLOB ... CONFIGURE_DEPENDS)`（CMake 3.12 起，每次构建重扫目录），代价是每次构建多一次扫描。

## 常见错误与调试实录

### 现场 1：missing separator——tab 惨案

```text
Makefile:3: *** missing separator.  Stop.
```

逐段读：Makefile:3 定位到文件第 3 行；missing separator 是 make 的原话——「规则里找不到分隔符」；Stop 表示就此打住。这几乎总是同一个事故：命令行开头是**空格**而不是 tab。多数编辑器默认把 tab 展开成空格，从网页复制的 Makefile 更是十有八九中招。修法：命令行必须以真实 tab 开头；编辑器里为 Makefile 关闭「tab 转空格」，或用 `cat -A Makefile | grep -n '\^I'` 检查哪几行真有 tab（^I 就是 tab 的显示形态）。这个报错每位 Make 用户都会遇到至少一次，遇到时别怀疑人生，先看第 3 行行首。

### 现场 2：CMake 版本声明缺失的警告

不写 cmake_minimum_required 直接 project()，新版 CMake 会拦下来：

```text
CMake Warning (dev) at CMakeLists.txt:1 (project):
  No cmake_minimum_required command is present.  No policy version was
  determined for this project.  ...
```

（大意如上：项目没声明最低版本，无法确定策略版本。）这不只是唠叨：没有策略版本，CMake 只能按一套内置的保守假设解释你的脚本，同一份文件在新旧 CMake 上可能行为分叉——4.1 节说过，命令语义是随版本演进的，CMP 策略就是演进差异的开关。补上 `cmake_minimum_required(VERSION 3.16)`，警告消失，行为钉死。时间线记两个数：CMake 3.27 起对声明 3.5 以下的项目发弃用警告，4.0 起对这类项目直接报错——那些「祖传 CMakeLists 在新机器上突然编译不过」的故事，多数终结于补一行版本声明。

### 现场 3：时间戳的边界

「依赖比目标新就重建」依赖三个假设：时钟单调、依赖图完整、编译确定。偶尔翻车也在这三条上：系统时间被回拨（时间戳倒挂，make 认为一切最新）、依赖清单漏项（2.4 节的惨案）、以及「源文件没变但构建产物被手动改过」。遇到增量构建行为诡异，先用 make -n 看它打算做什么，解释不通就删 build/ 全量重来——这也是 out-of-source 构建把「重来」做成一条 rm 的原因。

### 其余工具，一段概览

构建工具远不止两家：Ninja 是只为速度而生的执行器，自身配置极简，实践中多作为 CMake 的生成器（-G Ninja）在大项目里提速；Meson 是自带 DSL 的新一代配置系统，默认配 Ninja 后端；Autotools（./configure && make 三段式）是 Unix 老将，大量历史项目仍在用；Linux 内核的 Kbuild/Kconfig 则是 Make 面向内核场景的自家扩展；Bazel 面向超大仓库，主打可重现构建与远程缓存。它们的选型权衡不是本篇主线：本文的目标是让你吃透「依赖图 + 时间戳 + 编排」这套共同内核，内核懂了，任何新工具读十分钟文档就能上手。

## 实际项目中的使用场景

- 拿到任何开源 C 项目的第一件事是读它的 README 构建说明，通常是三种之一：有 Makefile 就 make；有 CMakeLists.txt 就 cmake -S . -B build 加 cmake --build build；有 configure 脚本走 ./configure && make。三种入口背后是同一套依赖图模型；
- 反面极端也真实存在：SQLite 把全部源码合并成单个 sqlite3.c 发布，使用者一条 gcc 命令即可编译（310 篇提过它的合并发布）——不需要构建系统的项目，恰恰说明构建系统解决的是规模问题；
- IDE 与工具的接入点：配置加一句 set(CMAKE_EXPORT_COMPILE_COMMANDS ON)，build/ 下会生成 compile_commands.json——clang-tidy、clangd 等工具靠它读懂工程，与 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 直接衔接；
- 团队协作的最低配置：仓库里提交一份带 .PHONY 与 -MMD 的 Makefile（小项目），或一份 target-based 的 CMakeLists（中大型项目），新同事 clone 下来一条命令出二进制——构建系统的隐性价值是「任何人、任何时候、一键可复现」。

## 小练习

预测题（5 分钟）：Makefile 里只有一条规则：

```makefile
report:
	echo building report
```

目录下不存在名为 report 的文件，make report 正常执行。现在 mkdir report 建一个同名目录，再跑 make report，会发生什么？加上 .PHONY: report 之后呢？

参考答案（先写再看）：没加 .PHONY 时，make 把 report 当文件核对：目标存在、无依赖、没有谁比它新，输出 Nothing to be done，echo 不会执行——2.5 节 clean 失灵的同款事故，只是这次由你亲手导演。加 .PHONY: report 后命令直接执行。伪目标声明表达的是「这是动作不是产物」。

挑战题（40 分钟，不看答案先动手）：改造第 3 节的贯穿 Makefile：把 utils.c 先归档成 build/libutils.a（320 篇的 ar rcs），app 从静态库链接而不是直接吃 .o。提示两级如下。

提示（思路方向）：库也是一个目标——先为它写一条规则（目标 build/libutils.a，依赖 utils.o，命令 ar rcs），再让 app 依赖它；模式和 3 节完全一致，只是图上多了一个节点。

展开（关键写法）：`UTIL := $(filter src/utils.c,$(SRCS))` 挑出库的源文件（或直接手写 utils.o 的规则）；`$(LIB): build/utils.o` 规则里用 `$(AR) rcs $@ $<`（make 内置 AR 变量即 ar）；链接规则改 `$(CC) $^ -o $@`，把 build/libutils.a 放进 app 的依赖列表。

验收清单：make 后 build/ 里有 libutils.a 与 app；make -n 确认链接命令用了库文件路径；touch src/utils.c 后重编顺序是 utils.o → libutils.a → app，且其他 .o 不动；ar t build/libutils.a 列出 utils.o。做完这道，320 篇的库与 470 篇的编排就合流了。

## 与之前和之后的知识的关系

- 往前：[多文件编译](/c/310-MultiFileCompilation) 的「分开 -c 再链接」是增量构建的地基——make 编排的正是那一步拆出来的 .o；[动态库与静态库](/c/320-DynamicStaticLibrary) 的每条命令在本篇变成规则，链接顺序惨案由 CMake 的依赖图代管；
- 旁支：头文件为什么产生依赖，根子在 #include 的文本插入机制（[预处理器与宏](/c/290-PreprocessorMacro)）；交叉编译的工具链文件与平台差异在 [跨平台编程](/c/410-CrossPlatformProgramming)；
- 往后：构建是质量工程的第一环——compile_commands.json 接上 clang-tidy 与 clangd，构建选项里开 ASan/UBSan 的姿势在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。

## 官方文档

- GNU Make 手册（规则语法、自动变量、模式规则、.PHONY 等特殊目标）：https://www.gnu.org/software/make/manual/make.html
- CMake 官方教程（从最小项目到库、安装、测试的逐步指南）：https://cmake.org/cmake/help/latest/guide/tutorial/index.html
- cmake_minimum_required 命令文档（策略版本与弃用时间线）：https://cmake.org/cmake/help/latest/command/cmake_minimum_required.html

## 自我检查

- 能默写「目标: 依赖 + tab 命令」的最小 Makefile，并说出 make 判定重建的那句话（目标不存在或依赖比目标新）；
- 能解释 -MMD -MP 与 -include $(DEPS) 联手解决什么问题，并复现「改头文件没重编」的完整现场；
- 能给一段 target_link_libraries 写出 PUBLIC/PRIVATE/INTERFACE 各自的传播后果，并说出 CMake 自动处理链接顺序的机制所在（生成阶段排 -l）；
- 拿到 missing separator 与 No cmake_minimum_required 两类报错，能各自在一分钟内定位原因并修复。

## 本章总结

- 构建系统解决五件事：命令模板化、增量构建、并行执行、平台适配、配置管理；增量构建的判定只有一句——目标不存在或任一依赖比目标新就重建，账本就是文件时间戳；
- Make 的四要素里 tab 是语法；自动变量 $@ $< $^ 与模式规则 %.o: %.c 消灭重复；.PHONY 声明动作型目标，否则同名文件劫持 clean；头文件依赖靠 -MMD -MP 生成 .d 再 -include 收编，手写迟早漏；
- CMake 是元构建系统：CMakeLists 描述目标与关系，生成器产出平台构建文件；cmake_minimum_required 钉死策略版本，是可预期行为的保险丝；
- 现代写法把属性挂在目标上：PUBLIC 传递、PRIVATE 自用、INTERFACE 纯传递；链接顺序这类底层细节由生成阶段的依赖图推导，320 篇的手工惨案在 CMake 层自动消化；
- out-of-source 构建把产物圈进 build/：源码树干净，删目录即重来，多配置并存。

## 下一步

进入 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)：项目能一键构建了，下一步是让它被系统性检查——clang-tidy 静态扫描、gdb 断点单步、以及构建开关里开着的 ASan/UBSan 如何把偶现 bug 变成必现现场。
