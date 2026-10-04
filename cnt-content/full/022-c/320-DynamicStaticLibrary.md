---
order: 340
title: 动态库与静态库：代码的打包与复用
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 把 310 篇的 utils.c 打包成能交付的库：ar 打包 .a 与链接顺序惨案、-fPIC 与 -shared 造 .so、soname 三件套命名与软链、ldd 与 readelf -d 看依赖、cannot open shared object file 经典现场的三种修复、dlopen 插件机制，静态与动态取舍一张表。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/470-BuildSystem'
  - 'c/310-MultiFileCompilation'
  - 'c/410-CrossPlatformProgramming'
prerequisites:
  - 'c/310-MultiFileCompilation'
---

## 前置知识

- 已完成 [多文件编译](/c/310-MultiFileCompilation)：会用 `-c` 分开编译再链接，看得懂 undefined reference，会用 nm 读符号表（T 与 U）。本篇的每个环节都长在那套符号机制上；
- 会用基本 bash：cd、ln -s、echo。

零基础回看 [C 语言零基础起步](/c/010-CZeroBasisStart)。符号表细节记不全也能往下读，用到就当场带一句。

> 分工说明：310、320、470 是一条线。310 讲单条链接命令里的符号配对；本篇把被链接对象换成库——.a 与 .so 怎么造、链接器怎么找它们、静态与动态各自的代价；[构建系统](/c/470-BuildSystem) 把本篇手敲的每条 ar、gcc 命令接手成自动化。Windows 的 .lib/.dll、加载路径差异在 [跨平台编程](/c/410-CrossPlatformProgramming) 展开，本篇只在必要处一句对照。

## 学习目标

读完本文你将能够：

1. 用 ar rcs 把 .o 打包成静态库 .a，用 -L 与 -l 链接它，并说出 lib 前缀与 -l 参数的命名规则；
2. 复现并修复静态库的链接顺序问题，说出链接器从左到右只扫一遍归档的机制；
3. 用 -fPIC 与 -shared 生成 .so，搭出 real name / soname / linker name 三件套与对应软链，用 readelf -d 与 ldd 验证依赖；
4. 独立诊断 cannot open shared object file，用 LD_LIBRARY_PATH、rpath、ldconfig 三种方式修复，说出各自适用场景；
5. 用 dlopen/dlsym 写出运行时加载插件的最小程序，对照表格为项目选出静态库或动态库。

预计 60 到 80 分钟，含 5 组动手实验与 2 道练习。

## 1. 问题引入：两个现场

现场一：你写完了 utils.c（310 篇里 sum_to 所在的那个文件），同事想要里面的求和功能。把 .c 发过去等于交出全部源码；只发编译好的 utils.o，他又没法把「一个孤立的目标文件」稳定地接进自己的工程——他缺一个可以链接的成品。

现场二：程序编译、链接一路绿灯，启动的瞬间却倒了：

```bash
./app
```

```text
./app: error while loading shared libraries: libutils.so.1: cannot open shared object file: No such file or directory
```

libutils.so.1 是什么？链接明明成功了，为什么运行时还有东西要找？

两个现场指向同一个答案：库（library）。静态库 .a 解决现场一——把 .o 捆成一册可交付的成品；动态库 .so 与它背后的运行时世界解释现场二——链接和运行是两回事。本篇把两种库都亲手造一遍，报错逐个复现。

## 2. 静态库：把 .o 捆成一册

### 2.1 ar：归档器造出 .a

「子程序库」的想法可以追到 1947 年的 EDSAC 项目：把通用函数预先写好存起来按需取用；Unix 在七十年代给它配了趁手的工具 ar（archiver），SunOS（1988）与 Windows NT（1993）后来又各自发展出共享库与 DLL。工具在变，动机从未变过：复用编译好的代码，同时选择交或不交源码。

造静态库只要两步。沿用 310 篇的 utils.c：

```bash
gcc -Wall -Wextra -g -c utils.c -o utils.o   # 第一步：正常编出 .o
ar rcs libutils.a utils.o                    # 第二步：打包成 .a
```

ar 的三个字母各有含义：r（replace）插入并替换同名成员；c（create）创建归档、不打印「正在创建」的警告；s（symbol index）写入符号索引——手册原话：`ar s` 等价于跑一遍 ranlib。这个索引是「符号名 → 成员」的目录，链接器靠它快速定位符号住在哪个成员里。验证：

```bash
nm -s libutils.a
```

```text
Archive index:
sum_to in utils.o

utils.o:
0000000000000000 T sum_to
```

Archive index 是给链接器看的目录；下面的符号表是给 nm 看的清单。多文件的库就是 `ar rcs libutils.a a.o b.o c.o` 一次列全。

### 2.2 链接静态库：-L 与 -l 的真实含义

310 篇用 -I 给编译器指头文件的路；给链接器指库的路用的是另一对参数：

| 参数 | 作用 | 例子 |
| --- | --- | --- |
| -I | 编译期：头文件搜索目录 | -Iinclude |
| -L | 链接期：库文件搜索目录 | -L. （当前目录） |
| -l | 链接期：要哪个库 | -lutils |

-lutils 不是文件名，是缩写规则：链接器把它展开成 lib 前缀 + 名字 + 后缀——先找动态库 libutils.so，找不到再找静态库 libutils.a。所以打包时必须叫 libutils.a，命令里却写 -lutils。也可以跳过缩写直接给文件名：`gcc main.o libutils.a -o app`，两者等价。

```bash
gcc main.o -L. -lutils -o app
./app
```

```text
sum 1..10 = 55
```

### 2.3 实验 1：链接器从左到右，只扫归档一遍

把参数换个位置：

```bash
gcc -L. -lutils main.o -o app
```

```text
/usr/bin/ld: main.o: in function `main':
main.c:(.text+0x1f): undefined reference to `sum_to'
collect2: error: ld returned 1 exit status
```

310 篇的老朋友 undefined reference，但这次 utils 的库明明给了。原因在链接器的扫描方式：GNU ld 按命令行从左到右处理输入，扫到归档时**只拿当时手里已欠下的未决符号去查索引**，命中才把对应成员拷进来；归档每个位置只扫一次，之后新欠的债不再回头。扫到 -lutils 时 main.o 还没上场，手里没有欠条，整个归档被跳过；轮到 main.o 时欠下 sum_to，身后已没有归档——报错。

修法就是把库放到使用者右边：

```bash
gcc main.o -L. -lutils -o app    # 使用者在左，库在右
```

多个库相互依赖时同理：被依赖的放更右。循环依赖用 `-Wl,--start-group ... -Wl,--end-group` 让链接器反复扫描这组归档（有显著性能代价），或干脆把库重复列一遍。C 链接器这条「单遍从左到右」的规则是很多玄学报错的根源，记住它，玄学就变成了机制。

### 2.4 实验 2：按需拷贝——不用的成员不进程序

静态库的设计哲学是「按需拷贝」：只有解决了未决符号的成员才被拷进可执行文件。亲手验证。造一个没人调用的成员：

```c
/* utils_extra.c */
int magic_answer(void) {
    return 42;
}
```

```bash
gcc -Wall -Wextra -g -c utils_extra.c -o utils_extra.o
ar rcs libutils.a utils.o utils_extra.o
gcc main.o -L. -lutils -o app
nm app | grep magic_answer      # 查一查
```

```text
（没有任何输出）
```

magic_answer 没进 app：它的成员没被任何未决符号点名，ar 目录里躺着，可执行文件里没有。修改实验：在 main.c 里加一行 `printf("%d\n", magic_answer());`（记得在 utils_extra.h 里声明），重新链接后再 grep——它进来了，文件体积也随之变大。注意拷贝的**粒度是成员（.o）不是函数**：utils.o 里哪怕混着十个没人用的函数，只要 sum_to 被点名，整个成员一起进程序。想裁得细，就把能独立不用的功能拆成独立的 .c 再归档。

### 2.5 静态库的代价

按需拷贝加上链接期解析，静态库简单可靠，代价也明白：

- **体积重复**：每个使用它的程序各带一份代码拷贝，十个程序用 libutils.a，磁盘上就有十份 sum_to；
- **更新要重链**：库里修一个 bug，所有拿过它的程序都得重新链接一遍才能受益。发布一个 100 个程序的仓库，升级一次库就是 100 次重链。

这两条代价正是共享库要解决的。历史也的确按这个顺序走：先有 .a，被体积与更新逼出了 .so。

## 3. 共享库：一份代码，全家共用

### 3.1 -fPIC 与 -shared

共享库（shared library，.so）的思路：库代码留在库里，程序只记「我需要它」；运行时由动态链接器把库装进进程。前提是库代码放哪里都能跑——不能写死任何绝对地址。这就是 -fPIC（position independent code，位置无关代码）的活：代码对全局数据的引用绕道全局偏移表（GOT），对函数的调用绕道过程链接表（PLT），两张表都在数据段、加载时才填真地址，代码段里只剩相对偏移。同一份 .so 于是可以被多个进程映射到不同地址，物理内存只占一份——这是「共享」二字的实现。

```bash
gcc -Wall -Wextra -g -fPIC -c utils.c -o utils.o
gcc -shared -Wl,-soname,libutils.so.1 -o libutils.so.1.0.0 utils.o
```

-shared 告诉 gcc 产出共享对象而非可执行文件；-Wl,-soname,... 把逗号后的参数转交给链接器，在库的动态段里写入 SONAME 字段——它的用途下一节揭晓。GCC 对两个选项的原文口径：-fPIC 生成「适合动态链接的位置无关代码」，-shared 「产出一个共享对象，可与其它对象链接成可执行文件」，且链接时必须带着编译时的同一组选项（用了 -fPIC 编译，-shared 这一步就不能丢）。

### 3.2 soname 与三件套命名

版本化共享库通常同时挂三个名字：

| 名字 | 本例 | 谁用它 |
| --- | --- | --- |
| real name（真名） | libutils.so.1.0.0 | 实际文件本身：主版本.次版本.修订号 |
| soname（共享对象名） | libutils.so.1 | 运行时：动态链接器按它找库 |
| linker name（链接名） | libutils.so | 链接期：-lutils 展开后找它 |

用软链把它们串起来（真名是文件，另两个是链接）：

```bash
ln -s libutils.so.1.0.0 libutils.so.1   # soname → 真名
ln -s libutils.so.1 libutils.so         # 链接名 → soname
```

soname 的机制在链接器手册里写得直白：可执行文件链接了带 SONAME 的共享对象后，运行时加载器「尝试加载 SONAME 指定的共享对象，而不是链接时交给链接器的那个文件名」。也就是说，app 里记下的依赖是 libutils.so.1，不是 libutils.so，更不是带全版本号的真名。这套命名就是升级协议：修个 bug 发 1.0.1，soname 不动，老程序照跑；破坏兼容才升主版本、换 soname。

验证两个视角：

```bash
readelf -d libutils.so.1 | grep -i soname
readelf -d app | grep -i needed      # app 是接下来 3.4 节链接出的程序
```

```text
0x000000000000000e (SONAME)             Library soname: [libutils.so.1]
0x0000000000000001 (NEEDED)             Shared library: [libutils.so.1]
```

readelf -d 读的是 ELF 的动态段：SONAME 是库的自我介绍，NEEDED 是可执行文件的依赖清单——ldd 与加载器看的都是它。

### 3.3 链接与观察：ldd 看依赖

链接命令与静态版一模一样（目录里同时有 libutils.so 与 libutils.a 时，链接器优先选 .so）：

```bash
gcc main.o -L. -lutils -o app
ldd app | grep utils
```

```text
        libutils.so.1 => ./libutils.so.1 (0x00007f8a3c1e0000)
```

ldd 的手册定义：打印「每个程序或共享对象所需的共享对象」。它列出的正是 NEEDED 清单逐项去找的结果——地址栏说明此刻从当前目录找到了。一句安全提醒随手放这儿：对来路不明的可执行文件不要跑 ldd（部分实现靠实际执行目标程序来工作，可能执行任意代码），查依赖改用 `objdump -p app | grep NEEDED`，只读文件本身。

### 3.4 经典现场：链接时找得到，运行时找不到

把 app 挪到一个没有 .so 的目录里再跑：

```bash
cd /tmp && /path/to/app
```

```text
/path/to/app: error while loading shared libraries: libutils.so.1: cannot open shared object file: No such file or directory
```

第 1 节的现场二完整复现。拆开这句话：前半是程序名；error while loading shared libraries 点明事故发生在加载期，动手的是动态链接器 ld.so；libutils.so.1 是 NEEDED 里记的名字；末句是 ld.so 的原话——按搜索顺序找了一圈，没有。链接期 ld 找的是链接名 libutils.so（当时在 -L. 的目录里）；运行期加载器找的是 soname libutils.so.1（当前目录根本不在搜索路径里）。链接与运行各查各的表，这是新手最困惑的一步。

动态链接器的搜索顺序（ld.so 手册口径）：

| 顺位 | 来源 | 说明 |
| --- | --- | --- |
| 1 | DT_RPATH | 老式内嵌路径，仅在未设 RUNPATH 时生效 |
| 2 | LD_LIBRARY_PATH | 环境变量，安全模式下被忽略 |
| 3 | DT_RUNPATH | 现代内嵌路径（rpath），只对直接依赖生效 |
| 4 | /etc/ld.so.cache | ldconfig 重建的缓存清单 |
| 5 | /lib、/usr/lib（64 位系统另有 lib64） | 默认目录 |

三种修复，对应三个顺位：

**修复一：LD_LIBRARY_PATH 临时救场。**

```bash
LD_LIBRARY_PATH=/path/to ./app
```

把目录插到顺位 2，立刻能跑。适合开发调试，不适合长期方案：它是进程级全局开关，写进 ~/.bashrc 后所有程序的库搜索都被搅动，版本冲突防不胜防——这是它出名的事故方式。

**修复二：rpath 内嵌路径。**

```bash
gcc main.o -L. -lutils -Wl,-rpath,/path/to -o app
```

-Wl,-rpath 把路径写进可执行文件的 DT_RUNPATH（顺位 3），这个程序从此自带答案，不依赖外部环境。适合「程序与随行库放一起」的部署（Windows 世界里DLL 与 exe 同目录就是默认姿势）。

**修复三：正式安装，ldconfig 入缓存。**

```bash
sudo cp libutils.so.1.0.0 /usr/local/lib/
sudo ldconfig                     # 重建缓存，顺手补建 soname 软链
ldconfig -p | grep utils          # 缓存里已登记
/path/to/app                      # 哪里都能跑
```

ldconfig 手册口径：扫描信任目录与 /etc/ld.so.conf 的配置，为找到的共享库「创建必要的链接与缓存」——包括自动补建 soname 软链（libutils.so.1），并生成顺位 4 的缓存 /etc/ld.so.cache。系统级库的安装仪式（拷文件、ldconfig）就是这一步；第三方库包装完后提一句「记得 ldconfig」，说的就是它。

三个顺位建议这样记：环境变量是临时便签，rpath 是写死在身份证上的住址，ldconfig 是户口本。

### 3.5 静态还是动态：一张取舍表

| 维度 | 静态库 .a | 动态库 .so |
| --- | --- | --- |
| 体积 | 每程序各带一份，偏大 | 磁盘一份共用，程序本体小 |
| 更新部署 | 修 bug 要重链所有程序 | 换 .so 即全体生效 |
| 内存共享 | 无，每进程独立拷贝 | 多进程映射同一份物理页 |
| 启动速度 | 无加载期开销，最快 | 加载器要找库、装库，略慢 |
| 安全性 | 依赖固化，不怕被偷换 | 面向加载路径，存在库被劫持的风险 |

两句话补充决策语境：没有动态链接器的环境（多数 RTOS 与裸机）只能静态，库以源码或 .a 形式进镜像，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；运行期才决定加载什么的需求（插件系统）只能动态。其余场景按表权衡，工程默认大多是动态链 libc、静态带小工具库的混合体。

### 3.6 dlopen：运行时才打开的库

链接期挂上 .so 的叫加载期动态链接；还有第三种时机——程序跑起来后，按需打开一个 .so。这就是插件机制的地基：

```c
/* plugin.c：运行时加载 libutils，取函数地址来调用 */
#include <dlfcn.h>
#include <stdio.h>

int main(void) {
    void *handle = dlopen("./libutils.so.1", RTLD_LAZY);
    if (handle == NULL) {                 /* 打不开：dlerror 给原因 */
        fprintf(stderr, "dlopen: %s\n", dlerror());
        return 1;
    }

    typedef int (*sum_fn)(int);           /* 函数指针类型先立好 */
    dlerror();                            /* 清空旧错误 */
    sum_fn sum_to = (sum_fn)dlsym(handle, "sum_to");
    char *err = dlerror();                /* dlsym 的成败要用 dlerror 查 */
    if (err != NULL) {
        fprintf(stderr, "dlsym: %s\n", err);
        dlclose(handle);
        return 1;
    }

    printf("sum 1..10 = %d\n", sum_to(10));
    dlclose(handle);                      /* 用完关闭 */
    return 0;
}
```

```bash
gcc -Wall -Wextra plugin.c -ldl -o plugin
./plugin
```

```text
sum 1..10 = 55
```

四个 API 的分工：dlopen 打开库得到句柄（RTLD_LAZY 允许函数符号延迟到首次调用才解析，RTLD_NOW 则打开时全部解析）；dlsym 按字符串名字取符号地址；dlerror 报告最近一次错误（dlsym 取到的地址合法时也可能是 NULL，成败必须用它判）；dlclose 关闭。编译时的 -ldl 是老 glibc 的写法，glibc 2.34 起这些函数已并入 libc，写上 -ldl 依旧兼容。

那句容易违和的强转 `(sum_fn)dlsym(...)` 有一句官方背书：ISO C 不定义对象指针与函数指针之间的转换，但 POSIX 明文要求这个转换在符合标准的实现上正确可用——POSIX 系统上放心写，跨到非 POSIX 平台再另想接口。插件侧还有两个常用件：`__attribute__((constructor))` 标记的函数会在 dlopen 时自动执行，适合插件的初始化（__attribute__ 的完整机制见 [属性与编译器扩展](/c/540-AttributeCompilerExtension)）；`-fvisibility=hidden` 配合在导出函数上标 `__attribute__((visibility("default")))`，能把库的符号表收紧到只露 API——插件的路口越少越安全。

Windows 一句对照：对应物是静态库 .lib 与动态库 DLL，导出声明用 __declspec(dllexport)，运行时按「应用程序目录、系统目录」等固定顺序搜索，没有 soname 与 ldconfig 机制；差异的展开在 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 常见错误与调试实录

### 现场 1：cannot open shared object file 逐行读

```text
./app: error while loading shared libraries: libutils.so.1: cannot open shared object file: No such file or directory
```

四段信息各答一问：./app 是谁出的错；error while loading shared libraries 说明出错的阶段是加载、执行者是 ld.so（还没轮到你的 main）；libutils.so.1 是它按 NEEDED 找的名字（对照 `readelf -d app`）；末句是搜索一圈落空后的原话。诊断与处置一条龙：`ldd app` 找 not found 的项，再按 3.4 节的三顺位选修复——调试期 LD_LIBRARY_PATH，随行部署 rpath，系统安装 ldconfig。

### 现场 2：undefined reference to `xxx@version` 与 GLIBC 版本

符号也可以带版本。glibc 的 printf 实际导出的是 printf@@GLIBC_2.2.5 这类带版本号的符号，老系统靠它同时伺候新旧程序。它有两副报错面孔：链接静态库时看到 undefined reference to `sum_to@UTILS_1`，是版本不匹配的符号没配对上；在老机器上跑新编译的程序报 version `GLIBC_2.34' not found，是目标机的 glibc 太老。诊断用 `objdump -T app | grep GLIBC` 看程序实际要求的版本，修法是在与目标一致的老环境重编，或容器化固定环境。

### 现场 3：忘了 ranlib 的老事故

老式 BSD 流程里建库是两步：ar r 打包，ranlib 单独补建符号索引；忘了第二步，链接器读不到索引，报 undefined reference（有的实现被迫全档扫描，慢得离谱）。GNU 工具链把两步并成一步：ar 手册原话「运行 ar s 等价于运行 ranlib」——这就是惯写 rcs 的原因；反过来用 S 抑制索引，手册明说这样的归档「不能被链接器使用」。今天你几乎不会踩到它，但读老项目脚本、翻老教程时知道这一层，就不必疑惑为什么有人写 ar rc 后面还跟着 ranlib。

### 排查速查

| 症状 | 一线原因 | 首选动作 |
| --- | --- | --- |
| cannot open shared object file | 运行时找不到 soname | ldd 找 not found；按三顺位修复 |
| 链接期 undefined reference | 顺序或库没给对 | -l 移到使用者右边；nm -s lib.a 查索引 |
| version `GLIBC_x.y' not found | 目标机 glibc 过旧 | objdump -T 查版本；老环境重编 |
| cannot find -lfoo | 链接期找不到库文件 | 查 -L 路径；核对 lib 前缀与后缀命名 |
| symbol lookup error（运行期） | 运行时符号缺失 | LD_DEBUG=symbols ./app 看查找过程 |
| 换了 .so 行为没变 | 老库还在缓存里 | ldconfig 重建；ldconfig -p 核对 |

LD_DEBUG 是加载器的自曝开关：`LD_DEBUG=libs ./app` 打印库搜索全过程，`LD_DEBUG=bindings` 打印每个符号最终绑定到哪个库——加载器不肯说的事，这两个开关都会说。

## 实际项目中的使用场景

- 看 ldd /bin/ls：系统里几乎每个程序都动态链着 libc.so.6——共享库不是高级特性，是 Linux 世界的默认地基；
- 插件系统：编辑器语法包、游戏 mod、日志后端切换，骨架都是本文的 dlopen/dlsym，区别只在接口约定（比如约定插件必须导出一个返回函数表的函数）；
- 跨语言复用：Python 的 ctypes `ctypes.CDLL("./libutils.so.1")` 加载后直接调 sum_to——C ABI 是语言之间的通用货币，同一份 .so 服务所有语言的调用方；
- 发布第三方库的仪式感：装头文件到 include/、库文件到 lib/、跑 ldconfig，再配上版本三件套——本文的内容就是这套仪式的分解动作；
- 想知道内核那边的「动态加载」长什么样：内核模块 .ko 用 insmod 加载进内核地址空间，思想同源，但运行在内核态、符号表是内核自己维护的，属于另一个世界。

## 小练习

预测题（5 分钟）：目录里同时有 libutils.so 与 libutils.a，执行 `gcc main.o -L. -lutils -o app`，链进去的是哪个？想强制用静态版，命令怎么写？

参考答案（先写再看）：链接器优先选动态版 libutils.so。强制静态可以临时挪走 .so，或直接给文件名 `gcc main.o libutils.a -o app`。顺带验证：链完后 `ldd app | grep utils`，动态版有输出、静态版没有——静态库在 NEEDED 里查无此人。

挑战题（40 分钟，不看答案先动手）：给 libutils 发布一个修复版 1.0.1（比如 sum_to 里加一行日志），要求：目录里新旧两个真名共存，之前编译的 app **不重新链接**就能用上修复。提示两级如下。

提示（思路方向）：soname 是运行时找库的唯一线索；修复版只要仍叫 libutils.so.1，旧程序认的地址就没变。

展开（关键命令）：`gcc -shared -Wl,-soname,libutils.so.1 -o libutils.so.1.0.1 utils.c -fPIC`；`ln -sf libutils.so.1.0.1 libutils.so.1`（软链指向新真名）；`LD_LIBRARY_PATH=. ./app` 直接跑。

验收清单：ls 里 libutils.so.1.0.0 与 libutils.so.1.0.1 共存；libutils.so.1 指向新文件；app 不重链而输出新行为；把软链改回旧真名，app 立刻变回旧行为。做完这道，soname 三件套就从知识变成了手感。

## 与之前和之后的知识的关系

- 往前：[多文件编译](/c/310-MultiFileCompilation) 的符号配对在本篇升级成批发市场——nm 的 T 与 U 还是那套账，只是供给方从散装 .o 变成了带索引的 .a 和加载时才到的 .so；-I 与 -L 的分工（编译器的路与链接器的路）也在 310 埋了伏笔；
- 旁支：Windows 的 .lib/.dll、加载路径差异与导出宏在 [跨平台编程](/c/410-CrossPlatformProgramming)；__attribute__ 语法在 [属性与编译器扩展](/c/540-AttributeCompilerExtension)；
- 往后：库加载完毕，程序才真正开始运行——进程、环境变量与管道在 [进程与管道](/c/330-ProcessAndPipe)；本篇手敲的每条 ar、gcc 命令，在 [构建系统](/c/470-BuildSystem) 里被 Makefile 与 CMake 接管。

## 官方文档

- ar 手册页（r/c/s 与索引、`ar s` 等价 ranlib 的原文）：https://man7.org/linux/man-pages/man1/ar.1.html
- GNU ld 手册：归档的单遍扫描与 --start-group、-soname 与 DT_SONAME：https://sourceware.org/binutils/docs/ld/Options.html
- GCC 链接选项（-shared 的定义）：https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html
- GCC 代码生成选项（-fPIC 的定义）：https://gcc.gnu.org/onlinedocs/gcc/Code-Gen-Options.html
- ld.so 手册页（搜索顺序、LD_DEBUG、LD_PRELOAD）：https://man7.org/linux/man-pages/man8/ld.so.8.html
- ldconfig 手册页（链接与缓存的创建）：https://man7.org/linux/man-pages/man8/ldconfig.8.html
- ldd 手册页（定义与不可用于不可信程序的警告）：https://man7.org/linux/man-pages/man1/ldd.1.html
- POSIX dlsym 规范（void* 与函数指针转换的保证）：https://pubs.opengroup.org/onlinepubs/9799919799/functions/dlsym.html

## 自我检查

- 能不看资料写出「-c 编译、ar rcs 打包、-L 加 -l 链接」三步，并说出 -lutils 会展开成什么名字；
- 能解释 gcc -L. -lutils main.o 为什么报 undefined reference，以及 --start-group 或重复列库为什么能救；
- 能搭出 libx.so.1.0.0 / libx.so.1 / libx.so 三件套，并用 readelf -d 与 ldd 指出 SONAME、NEEDED 分别在哪；
- 拿到 cannot open shared object file，能按三顺位说出三种修法各自的适用场景，并说出 ldd 与 readelf -d 的分工。

## 本章总结

- 静态库是归档：ar rcs 打包 .o 并建符号索引（s 等价 ranlib），链接器按索引按需拷贝成员，粒度是 .o 不是函数；
- 链接器从左到右只扫归档一遍：库必须放在使用者的右边，循环依赖靠 --start-group 或重复列库；
- 共享库三件套：真名是文件，soname 是运行时找库的依据（NEEDED 记录的是它），链接名是 -l 的目标；-fPIC 让代码不写死地址，-shared 负责产出；
- 链接与运行各查各的表：链接期找链接名，运行期按 NEEDED 的 soname 走「RPATH → LD_LIBRARY_PATH → RUNPATH → ldconfig 缓存 → 默认目录」五级搜索，cannot open shared object file 就是这条路上全线落空；
- 插件机制的地基是 dlopen/dlsym/dlerror/dlclose，POSIX 为那个 void* 强转背书；静态与动态没有万能答案，按体积、更新、内存、启动、安全五维权衡。

## 下一步

进入 [进程与管道](/c/330-ProcessAndPipe)：库加载好了、程序跑起来了——下一篇看程序如何作为进程行事：fork 出子进程、用管道把两个程序的输入输出接在一起。
