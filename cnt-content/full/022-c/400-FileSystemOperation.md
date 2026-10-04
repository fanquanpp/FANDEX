---
order: 420
title: 文件系统操作：从 open 到 inode
module: 'c'
category: 计算机科学
difficulty: advanced
description: 从「同一个复制程序的两条路」下到 POSIX 系统调用层：open 的 flags 与 O_CREAT 缺 mode 的编译陷阱、read/write 部分读写契约与循环封装、lseek 与 1GB 空洞文件实验、stat 家族与 S_ISREG 宏族、目录递归遍历、硬链接与符号链接、unlink 的延迟释放与 rename 的原子替换。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/420-CPosixSystemCall'
  - 'c/390-SocketNetworkProgramming'
  - 'c/410-CrossPlatformProgramming'
prerequisites:
  - 'c/430-StdioFileIO'
  - 'c/330-ProcessAndPipe'
---

## 前置知识

- 已完成 [标准库文件 IO](/c/430-StdioFileIO)：会 fopen/fgets/fclose 全流程，知道「缓冲」这个词——本文一开场就拆它；
- 已完成 [进程与管道](/c/330-ProcessAndPipe)：见过 fork/exec 与 dup2 重定向——本文解释那套把戏为什么能成立。

没读过 330 也不影响主线，用到的地方会就地解释一句。

> 分工说明：本模块的「文件」主题分三层。430 讲标准库 stdio 的高层流——`FILE*`、缓冲、fopen 家族，日常首选、可移植；[POSIX 速查](/c/420-CPosixSystemCall) 是底层接口的表格化手册，读完本文后当索引用；本篇是教学主线，讲 POSIX 系统调用层的文件操作与文件系统元数据：open/read/write/lseek/close 四件套、stat 家族、目录遍历、链接与 inode、删除与重命名。本文语境是 Linux/macOS（Windows 差异统一在下一篇收口）。

## 学习目标

读完本文你将能够：

1. 用 open/read/write/close 写一个不依赖 stdio 的文件复制器，并用 strace 解释它与 stdio 版的 read 次数差在哪里；
2. 说出 O_CREAT 的第三参数 mode 不写会发生什么，并解释 umask 如何改写它；
3. 处理 read/write 的部分读写契约：写出循环读写的封装 read_n/write_n，区分「返回 0」与「返回 -1」；
4. 用 lseek 做随机访问，亲手造一个「ls 与 du 大小不同」的空洞文件，说清 O_APPEND 的原子追加为什么不能自己拼；
5. 用 stat 家族与 S_ISREG/S_ISDIR 宏族读出文件类型、大小、权限与时间，用 opendir/readdir 递归遍历目录树，说清硬链接、符号链接与 inode 的关系，以及 unlink 之后的文件为什么还能读。

预计 70 到 90 分钟，含 5 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：复制一个文件的两条路

任务小到无聊：把一个文件复制成另一份。430 篇教过用 stdio 写：

```c
/* cp_stdio.c：430 篇的写法，逐字节复制 */
#include <stdio.h>

int main(int argc, char *argv[]) {
    if (argc != 3) { fprintf(stderr, "usage: %s src dst\n", argv[0]); return 1; }
    FILE *in = fopen(argv[1], "rb");
    if (in == NULL) { perror(argv[1]); return 1; }
    FILE *out = fopen(argv[2], "wb");
    if (out == NULL) { perror(argv[2]); fclose(in); return 1; }
    int c;
    while ((c = fgetc(in)) != EOF) fputc(c, out);
    fclose(in);
    fclose(out);
    return 0;
}
```

同一件事，往下走一层也能做：不经过 `FILE*`，直接向内核要「文件描述符」。

```c
/* cp_sys.c：同一件事，系统调用层的写法 */
#include <fcntl.h>      /* open 与 O_xxx 旗帜 */
#include <unistd.h>     /* read/write/close */
#include <stdio.h>      /* perror */

int main(int argc, char *argv[]) {
    if (argc != 3) { fprintf(stderr, "usage: %s src dst\n", argv[0]); return 1; }
    int in = open(argv[1], O_RDONLY);
    if (in < 0) { perror(argv[1]); return 1; }
    int out = open(argv[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (out < 0) { perror(argv[2]); close(in); return 1; }
    char c;
    while (read(in, &c, 1) == 1) write(out, &c, 1);
    close(in);
    close(out);
    return 0;
}
```

两个程序功能完全一样。做一批 100000 字节的测试数据，用 strace 数一数它们各喊了多少次系统调用：

```bash
gcc -Wall -Wextra -g cp_stdio.c -o cp_stdio
gcc -Wall -Wextra -g cp_sys.c -o cp_sys
head -c 100000 /dev/urandom > input.bin
strace -c ./cp_stdio input.bin out1.bin
strace -c ./cp_sys input.bin out2.bin
```

两次统计里的 read/write 行（数字每次略有差异，量级不会）：

```text
cp_stdio:  read 1 次，write 25 次左右
cp_sys:    read 100001 次，write 100000 次
```

悬念就在这：**逐字节复制的两个程序，怎么一个只喊了 25 次 write，另一个喊了 10 万次？** 答案是「缓冲」真正的位置——stdio 的 fputc 并不每次都去找内核，它把字节先攒在用户态缓冲区里，攒满 4096 字节才向内核喊一次；而 write 每喊一次就穿越一次用户态到内核态的边界。这正是 430 篇「流有缓冲」那句话的底牌。本篇把最底下两层建起来：fopen 底下是 open，缓冲区底下是文件偏移量，fclose 底下是 close——以及为什么 socket、管道在系统调用层长得和文件一模一样。

## 2. open/read/write/close：文件描述符四件套

1970 年代 Unix 确立了一条影响至今的原则：**一切皆文件**。普通文件、目录、设备、管道、套接字，统统通过同一个小整数操作——文件描述符（file descriptor，下称 fd）。四件套 open/read/write/close 因此能通吃几乎所有 I/O。

fd 的三条规则：

1. fd 是进程私有的小整数，本质是内核「打开文件表」的索引；
2. 每个进程启动时 0、1、2 已被占用——分别是标准输入、标准输出、标准错误（`<unistd.h>` 里的 `STDIN_FILENO`/`STDOUT_FILENO`/`STDERR_FILENO`）；
3. 新打开的文件**总是拿最小可用的 fd 编号**。

第 3 条看着不起眼，330 篇的重定向把戏全靠它：先 `close(1)` 再打开某个文件，新 fd 必然是 1——printf 从此写进这个文件。规则本身就是机制。

### 2.1 open 的 flags：想好你要怎么用这个文件

```c
int fd = open(path, flags);            /* 读已存在的文件 */
int fd = open(path, flags, mode);      /* 带 O_CREAT 时必须这样写 */
```

flags 由两部分组成：访问方式三选一，再加若干修饰位：

| 旗帜 | 含义 |
| --- | --- |
| O_RDONLY / O_WRONLY / O_RDWR | 只读 / 只写 / 读写，三选一（O_RDONLY 数值是 0） |
| O_CREAT | 文件不存在则创建为新文件 |
| O_TRUNC | 文件已存在则清空为 0 字节 |
| O_APPEND | 每次 write 前自动定位到文件末尾（第 3 节展开） |

典型组合：O_RDONLY 读；`O_WRONLY | O_CREAT | O_TRUNC, 0644` 就是「覆盖写」；`O_WRONLY | O_CREAT | O_APPEND` 是「追加写日志」。顺手认识一下 `creat(path, mode)`：它是 `open(path, O_WRONLY | O_CREAT | O_TRUNC, mode)` 的历史简写，名字少个 e 是当年的手误，如今很少有人单独用它。

### 2.2 编译陷阱：O_CREAT 必须配第三参数 mode

mode 只在 flags 含 O_CREAT 时有意义，它声明「新文件想要什么权限」（如 0644 表示属主可读写、其余只读）。坑在于：**open 是变参函数，漏传 mode 编译器不报任何错**：

```c
/* bad_mode.c：漏掉 mode 的 open */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    /* 编译通过，运行也「成功」：mode 是栈上的随机字节 */
    int fd = open("data.txt", O_WRONLY | O_CREAT);
    if (fd < 0) { perror("open"); return 1; }
    close(fd);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g bad_mode.c -o bad_mode   # 一条警告都没有
./bad_mode
ls -l data.txt
```

一次真实的现场：

```text
---x--x--T 1 user user 0 9月 29 10:00 data.txt
```

文件建出来了，权限却是一堆不可理喻的位——手册页的原话是：省略 mode 时，「栈上的某些任意字节会被当作文件权限」。变参函数的参数核对只有运行时才知道，编译器帮不了你。修法是把规矩焊死：**写 O_CREAT 就写全三个参数**，哪怕当前不需要。

还有一层：mode 表达的是愿望，真实权限 = mode & ~umask。默认 umask 通常是 022，会把组与其他用户的写位抹掉——你要 0666，落盘是 0644。这不是 bug 而是安全设计，细节速查在 [POSIX 速查](/c/420-CPosixSystemCall)。

### 2.3 出错报告：返回 -1 并设置 errno

四件套的成功返回各有含义（fd、字节数、0），失败则统一返回 -1 并设置全局变量 errno。perror 把「你给的前缀 + errno 对应的描述」打到 stderr：

```c
int fd = open("/etc/shadow", O_RDONLY);
if (fd < 0) { perror("open"); return 1; }   /* 打出: open: Permission denied */
```

注意 errno 只在「调用失败」时有意义；一个成功的调用不清理它。所以判错要用返回值，别用 errno 是否非零来猜。

### 2.4 read/write 的部分读写契约

这是本节最重要的一个事实：**read/write 返回的字节数可能小于你请求的字节数，而这不算错误**。手册页明说「该数小于请求数并不构成错误」。它何时发生：

- 读到文件尾：剩下的不够请求数，或已经到尾返回 0；
- 数据源是管道、终端、socket：当前只有这么多，read 不肯干等；
- 被信号打断（errno 为 EINTR，第 8 节再提）；
- Linux 上单次 read/write 最多传输约 2 GB（0x7ffff000 字节），再多自动截断。

所以返回值有三种身份，必须区分：

| 返回值 | 含义 |
| --- | --- |
| -1 | 出错，查 errno |
| 0 | 读端：EOF（文件读完/对端关闭） |
| 大于 0 | 本次实际传输的字节数，可能小于请求 |

把「读满/写满」封装成两个函数，业务代码就不用每次都操心契约：

```c
/* rw_n.c：部分读写契约的循环封装 */
#include <unistd.h>
#include <errno.h>

/* 读满 n 字节才返回 n；提前 EOF 返回实读字节数；出错返回 -1 */
ssize_t read_n(int fd, void *buf, size_t n) {
    char *p = buf;
    size_t left = n;
    while (left > 0) {
        ssize_t r = read(fd, p, left);
        if (r < 0) {
            if (errno == EINTR) continue;   /* 被信号打断：重来（340 篇） */
            return -1;
        }
        if (r == 0) break;                  /* EOF：只能读到这了 */
        p += r;
        left -= (size_t)r;
    }
    return (ssize_t)(n - left);
}

/* 写满 n 字节才返回 n；出错返回 -1 */
ssize_t write_n(int fd, const void *buf, size_t n) {
    const char *p = buf;
    size_t left = n;
    while (left > 0) {
        ssize_t w = write(fd, p, left);
        if (w < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        p += w;
        left -= (size_t)w;
    }
    return (ssize_t)n;
}
```

如果你写过 [Socket 网络编程](/c/390-SocketNetworkProgramming) 里的 recv_n，会觉得似曾相识——不是巧合：socket fd 与文件 fd 在系统调用层是同一种东西，部分读写契约也一样。网络那边循环封装是刚需，文件这边同样如此。

### 2.5 close：不关就是 fd 泄漏

close(fd) 释放 fd；进程退出时内核会兜底回收所有 fd，所以小程序忘 close 常常没后果。但长跑服务器不行：fd 数量有上限（常见默认 1024，可查 `ulimit -n`），一个不断打开却不关闭的循环迟早把额度耗光，此后所有 open 报 EMFILE「打开文件过多」。这与 [内存深水区](/c/210-MemoryManagement) 讲的 malloc 泄漏是同一族问题：**要了不还，资源耗尽**——只是这次「资源」是 fd 而不是内存。每个错误分支也要 close，第 7 节的 atomic_write 会示范全套纪律。

修改实验：把第 1 节 cp_sys.c 的缓冲从 1 字节改成 `char buf[4096]; read(in, buf, sizeof buf)`，再 strace 数一次。read/write 的次数应该掉到 25 上下——和 stdio 版一样了。这个实验顺手回答了「缓冲区开多大」：大缓冲减少系统调用次数，4096 或 65536 是常见选择。

## 3. lseek 与文件偏移：随机访问、O_APPEND 与空洞文件

stdio 的 fseek 底下就是 lseek。每个打开的文件都带一个**文件偏移量**（file offset）：read/write 从偏移处开始干活，干完把偏移推过去。`lseek(fd, offset, whence)` 显式搬动它：

| whence | 新偏移 |
| --- | --- |
| SEEK_SET | 距文件头 offset 字节 |
| SEEK_CUR | 当前偏移再加 offset（可负） |
| SEEK_END | 文件尾再加 offset（可负） |

常用惯用法：`lseek(fd, 0, SEEK_CUR)` 查询当前位置，`lseek(fd, 0, SEEK_SET)` 回到文件头。一个反直觉的事实：lseek 不产生任何磁盘 I/O，它只是改了内核里的一个数字——这就是「seek 很便宜」的由来。

### 3.1 O_APPEND：追加必须是内核里的一步

追加日志是高频需求，但它有一个隐藏的竞态。「定位到末尾再写入」如果自己拼：

```c
lseek(fd, 0, SEEK_END);   /* 第一步：定位 */
write(fd, log_line, n);   /* 第二步：写入 */
```

这是两次独立的系统调用。两个进程同时往同一个日志追加时，完全可能 A 刚定位完、B 也定位到同一个末尾并写入，然后 A 的 write 把 B 的数据覆盖掉。O_APPEND 把「定位 + 写入」合并成内核里的**一个原子步骤**：每次 write 前偏移自动移到末尾，中间插不进任何人。多进程追加日志，必须用 O_APPEND 打开，不许自己拼。

顺带一个细节：O_APPEND 打开后 lseek 只影响读位置，write 依然写到末尾——想中途改写文件就不要用 O_APPEND。

### 3.2 空洞文件实验：ls 与 du 说不通的时刻

lseek 允许把偏移搬到**越过文件尾**的位置，此时文件大小并不变；但接下来一次 write，就会在旧文件尾与写入点之间留下一段「洞」：洞没有分配磁盘块，读出来全是零字节（手册页的原话是返回 null 字节，直到有人真正写入这段空隙）。亲手造一个：

```c
/* hole.c：跳过 1GB 写 1 字节 */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    int fd = open("sparse.dat", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }
    lseek(fd, 1024L * 1024 * 1024, SEEK_SET);   /* 偏移跳到 1GB 处 */
    if (write(fd, "X", 1) != 1) { perror("write"); return 1; }
    if (close(fd) != 0) { perror("close"); return 1; }
    return 0;
}
```

```bash
gcc -Wall -Wextra -g hole.c -o hole && ./hole
ls -l sparse.dat
du -h sparse.dat
od -c sparse.dat | head -2
```

一次典型的现场（du 的具体数值与文件系统块大小有关）：

```text
-rw-r--r-- 1 user user 1073741825 9月 29 10:00 sparse.dat
8.0K    sparse.dat
\0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
```

`ls` 报告文件「逻辑大小」1073741825 字节（约 1 GB），`du` 报告实际磁盘占用只有 8 KB——差了五个数量级。这样的文件叫稀疏文件（sparse file），数据库与虚拟机磁盘镜像靠它省下海量空间。修改实验：用 `od -c sparse.dat | tail -2` 看文件末尾找到那个 X 字符；再把 lseek 那行删掉重跑，du 会立刻涨到约 1 GB——洞与不洞，一行代码的差别。

多线程共享同一个 fd 时，偏移量是共享的、互相踩踏，POSIX 提供带位置参数的 pread/pwrite（读写不碰偏移），速查见 [POSIX 速查](/c/420-CPosixSystemCall)。

## 4. 元数据：stat 家族与权限

文件不只有内容，还有一整套「关于文件的数据」：多大、谁拥有、什么权限、何时修改——统称元数据。它们住在 inode 里（第 6 节展开），stat 家族负责读取：

| 函数 | 特点 |
| --- | --- |
| stat(path, &st) | 按路径查询；遇到符号链接则**跟随**到目标 |
| fstat(fd, &st) | 按已打开的 fd 查询，不碰路径 |
| lstat(path, &st) | 按路径查询；遇到符号链接则**返回链接本身**的信息 |

结果填进 `struct stat`，常用字段：

| 字段 | 含义 |
| --- | --- |
| st_mode | 文件类型 + 权限位（16 位的位包） |
| st_size | 逻辑大小（字节） |
| st_mtime | 最后修改时间（time_t） |
| st_nlink | 硬链接数（有多少个名字指向它，第 6 节） |
| st_ino | inode 编号（文件在文件系统里的身份证号） |
| st_uid / st_gid | 属主 / 属组的用户与组 ID |

st_mode 的高位编码文件类型，低位编码 rwx 权限。手写位运算是自找麻烦，POSIX 备好了一族判断宏：

```c
S_ISREG(m)   /* 普通文件？ */
S_ISDIR(m)   /* 目录？    */
S_ISLNK(m)   /* 符号链接？（只有 lstat 的结果才可能成立） */
```

配上 S_ISCHR/S_ISBLK/S_ISFIFO/S_ISSOCK 可覆盖设备、管道与套接字。写一个 mini 版 ls -l：

```c
/* mini_stat.c：读出类型、权限、大小与修改时间 */
#include <stdio.h>
#include <sys/stat.h>
#include <time.h>

int main(int argc, char *argv[]) {
    if (argc != 2) { fprintf(stderr, "usage: %s path\n", argv[0]); return 1; }
    struct stat st;
    if (stat(argv[1], &st) != 0) { perror("stat"); return 1; }
    char type = S_ISDIR(st.st_mode) ? 'd' : '-';
    char mtime[20];
    strftime(mtime, sizeof mtime, "%Y-%m-%d %H:%M:%S", localtime(&st.st_mtime));
    printf("%c perm=%04o size=%ld nlink=%lu mtime=%s\n",
           type, (unsigned)(st.st_mode & 0777), (long)st.st_size,
           (unsigned long)st.st_nlink, mtime);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g mini_stat.c -o mini_stat
./mini_stat mini_stat.c
```

```text
- perm=0644 size=923 nlink=1 mtime=2026-09-29 10:00:00
```

`st_mode & 0777` 取出九个权限位，八进制打印正好是 chmod 命令熟悉的 0644。修改实验：对目录跑一遍（type 应变 d）；再想想为什么对符号链接跑 mini_stat 永远显示链接目标的属性——把 stat 换成 lstat 就能看到链接自己。权限位如何被 umask 修剪、chmod/chown 怎么改写它们，第 2 节提过一句，完整速查在 [POSIX 速查](/c/420-CPosixSystemCall)；st_mtime 是 time_t，格式化交给 strftime（先混个眼熟即可）。

## 5. 目录遍历：opendir/readdir/closedir

目录在 Unix 里也是文件，但内容是一张「名字 → inode」的表。POSIX 不建议直接 read 它，而是给了一套目录流接口：opendir 打开目录拿到 `DIR*`，readdir 逐项取目录项，closedir 关闭。目录项 `struct dirent` 里最常用的是 d_name——这一项的名字（不含路径）。

先记住三条规矩：

1. **`.` 与 `..` 也是目录项**，readdir 会把它们交给你，递归遍历必须跳过，否则永远在原地打转；
2. **readdir 返回 NULL 有两种含义**：遍历结束（errno 不变）或出错（设置 errno）。POSIX 规定的区分法是循环前 `errno = 0`，NULL 返回后 errno 仍为零才是正常结束——严谨的代码要留这一手；
3. **条目顺序没有任何保证**，别指望字母序，要排序自己 qsort。

完整示例——递归列出目录树：

```c
/* tree.c：递归遍历目录树 */
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <dirent.h>
#include <sys/stat.h>
#include <limits.h>

static void walk(const char *path, int depth) {
    DIR *dir = opendir(path);
    if (dir == NULL) {
        fprintf(stderr, "opendir(%s): %s\n", path, strerror(errno));
        return;
    }
    struct dirent *entry;
    while ((entry = readdir(dir)) != NULL) {
        if (strcmp(entry->d_name, ".") == 0 ||
            strcmp(entry->d_name, "..") == 0) continue;   /* 不跳过就死循环 */

        /* 拼出完整路径：检查截断，别拿 sprintf 赌运气 */
        char full[PATH_MAX];
        int n = snprintf(full, sizeof full, "%s/%s", path, entry->d_name);
        if (n < 0 || n >= (int)sizeof full) continue;     /* 拼接被截断 */
        /* lstat 而非 stat：不跟随符号链接，防止目录环 */
        struct stat st;
        if (lstat(full, &st) != 0) {
            fprintf(stderr, "lstat(%s): %s\n", full, strerror(errno));
            continue;
        }

        for (int i = 0; i < depth; i++) putchar(' ');
        printf("%s", entry->d_name);
        if (S_ISDIR(st.st_mode)) {
            printf("/\n");
            walk(full, depth + 2);
        } else {
            printf("  (%ld bytes)\n", (long)st.st_size);
        }
    }
    closedir(dir);                         /* 不关就是 fd 泄漏 */
}

int main(int argc, char *argv[]) {
    walk(argc > 1 ? argv[1] : ".", 0);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g tree.c -o tree
./tree .
```

```text
tree.c  (2601 bytes)
mini_stat.c  (923 bytes)
hole.c  (485 bytes)
cp_sys.c  (722 bytes)
sparse.dat  (1073741825 bytes)
```

示例里埋着三个工程细节：**lstat 防「目录环」**——有人会把符号链接指回祖先目录，stat 会跟随进去无限递归，lstat 返回链接本身，S_ISDIR 不成立，递归自然止步；**路径拼接要防截断**——固定 256 的缓冲加 sprintf 是溢出温床，PATH_MAX 缓冲加 snprintf 返回值检查是标准姿势；**readdir 返回的指针归 opendir 所有**——下一次 readdir 可能令其失效，需要保存名字就自己 strcpy。

两个工程进阶各留一句：同一 `DIR*` 被多线程并发 readdir 不是线程安全的，需要外部加锁；要避免「先 stat 再 open」的路径竞态（TOCTOU）或想高效遍历巨型目录树，POSIX 2008 的 `*at` 函数族（openat/fstatat）与 nftw 是正规解法——速查见 [POSIX 速查](/c/420-CPosixSystemCall)，GNU find 的核心就是这套遍历。

## 6. 链接与 inode：一个文件的多个名字

前面反复说「元数据住在 inode 里」，现在把它说透。文件系统里每个文件有一个 inode（index node）：编号、大小、权限、时间戳、数据块位置全在里面。**目录项只是「名字 → inode 编号」的映射**。这意味着「文件」与「文件名」不是一回事——一个 inode 可以有多个名字，每个名字叫一个硬链接。stat 里的 st_ino 是编号，st_nlink 是名字个数。

```bash
echo hello > a.txt
link a.txt b.txt        # 等价命令：ln a.txt b.txt
ls -li a.txt b.txt
```

```text
1183455 -rw-r--r-- 2 user user 6 9月 29 10:00 a.txt
1183455 -rw-r--r-- 2 user user 6 9月 29 10:00 b.txt
```

两行 inode 编号相同、st_nlink 都是 2——它们不是两个文件，是同一份数据的两个名字。删掉任何一个名字，另一个照常可用，数据在 st_nlink 归零之前不会消失。硬链接的两条限制都源于 inode 是「文件系统本地」的：不能跨文件系统（不同文件系统各有各的 inode 编号空间），不能给目录建（会让树出现环，POSIX 直接禁止）。

符号链接（软链接）是另一种思路：`symlink(target, linkpath)` 创建一个**独立的小文件**，内容就是 target 这个路径字符串。它没有上述两条限制，但目标删除后就「悬空」：

```bash
ln -s a.txt s.txt       # symlink("a.txt", "s.txt")
rm a.txt
cat s.txt               # cat: s.txt: No such file or directory
```

读出链接内容用 readlink（lstat + S_ISLNK 判断之后即可取目标路径）。stat 与 lstat 在这里的分工再强调一遍：stat 沿链接走到终点（所以对符号链接 stat 永远报不出「l」），lstat 只看链接自己；遍历目录树时用 lstat 是纪律。

## 7. 删除与重命名：unlink 的延迟释放与 rename 的原子替换

### 7.1 unlink：删的是名字，不是数据

现在你能读懂 unlink 的真实语义了：它删除**一个目录项**，让 st_nlink 减一。数据真正释放的条件，手册页写得很精确：「若这是文件的最后一条链接且没有进程打开着它，文件被删除，空间交还复用」；只要还有已打开的 fd，**文件会一直存在，直到最后一个引用它的 fd 关闭**。验证一下：

```c
/* ghost.c：unlink 之后，打开中的文件还活着 */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    int fd = open("ghost.txt", O_RDWR | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }
    write(fd, "still here", 10);
    unlink("ghost.txt");        /* 名字消失，但 fd 还攥着数据 */
    char buf[11] = {0};
    lseek(fd, 0, SEEK_SET);
    read(fd, buf, 10);          /* 已打开的 fd 照常读写 */
    printf("fd 读到: %s\n", buf);
    close(fd);                  /* 最后一个 fd 关闭，空间此刻才释放 */
    return 0;
}
```

运行期间另开一个终端 `ls`：ghost.txt 已经不在；但程序自己仍能从 fd 读出 still here。这就是「临时文件」的经典写法：先 open 再立刻 unlink，数据只在进程手里活着——进程崩溃也不会在磁盘留垃圾。想更正规就用 mkstemp：给模板 `/tmp/appXXXXXX`，它以独占方式创建权限安全的临时文件并返回 fd，配合立即 unlink 即可；标准库里 430 篇见过的 `tmpfile()` 则连模板都替你省了。

### 7.2 rename：要么没发生，要么全发生

rename(old, new) 改名字（也可以连同目录一起「移动」）。它的珍贵之处在于原子性：手册页明确「若 new 已存在，将被**原子地**替换，不存在任何中间状态让其他进程看到文件缺失」。配置文件的更新因此有了标准模式——**写临时文件、落盘、原子顶替**：

```c
/* atomic_write.c：绝不留下写了一半的配置 */
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int write_config(const char *path, const char *text) {
    char tmp[4096];
    snprintf(tmp, sizeof tmp, "%s.tmp", path);
    int fd = open(tmp, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open tmp"); return -1; }
    if (write_n(fd, text, strlen(text)) < 0) {   /* 第 2 节的 write_n */
        perror("write"); close(fd); unlink(tmp); return -1;
    }
    fsync(fd);              /* 先逼内容落到磁盘 */
    close(fd);
    if (rename(tmp, path) != 0) {                /* 原子顶替 */
        perror("rename"); unlink(tmp); return -1;
    }
    return 0;
}
```

读者在任何时刻打开配置文件，看到的要么是旧版、要么是完整新版，绝不会是半新半旧。一个必须知道的限制：rename 不能跨文件系统——old 与 new 在不同挂载点上会直接失败（EXDEV），那时只能退回「复制再删」的非原子方案。Redis 持久化、git 更新引用，底层都是这一招。

目录的创建与删除（mkdir/rmdir）与进程工作目录（chdir/getcwd）同属这一层的日常操作，接口一目了然，速查表在 [POSIX 速查](/c/420-CPosixSystemCall)。

## 8. 常见错误与调试实录

### 8.1 O_CREAT 缺 mode：编译无声，权限乱码

第 2 节的 bad_mode.c 是最阴险的一类错误：编译零警告、运行零报错，只有某天 `ls -l` 扫到 `---x--x--T` 才案发。变参函数的坑 + umask 的二次改写，让「权限不对」的案件几乎都先查这两处。预防只有纪律：O_CREAT 与 mode 永远成对出现在同一行，code review 见到单飞的 O_CREAT 直接打回。

### 8.2 把 read 的返回 0 当错误

```c
ssize_t n = read(fd, buf, sizeof buf);
if (n <= 0) {
    fprintf(stderr, "read failed!\n");   /* 空文件被误报为读失败 */
    return 1;
}
```

对一个空文件执行这段代码，read 返回 0——EOF，不是错误——却被与 -1 一起打成「失败」。反过来更危险：`while (read(fd, buf, n) != 0)` 这类只判 0 的循环会把 -1（如 EINTR）当成「继续读」的证据，轻则空转、重则死循环烧 CPU。修法就是第 2 节的三分表：-1 查 errno，0 是 EOF，其余是字节数。

### 8.3 目录流未 closedir：递归越深，fd 越少

tree.c 若把 closedir 那行删掉，每递归一层就漏一个目录 fd。目录树深几十层、目录数上千的仓库跑一次，`ulimit -n` 的 1024 额度就见了底，此后 opendir/open 全报 EMFILE「打开文件过多」，`strace -c ./tree .` 里 openat 与 close 的次数对不上账就是实锤。与 [内存深水区](/c/210-MemoryManagement) 的 malloc 泄漏同一药方：**每个成功路径与每个错误路径都要有收尾**，第 7 节 atomic_write 的全套 close/unlink 就是样板。

### 8.4 EINTR：慢系统调用被信号打断

进程装有信号处理器时（[信号处理](/c/340-SignalHandling)），read/write 这类慢系统调用可能在干活途中被打断，返回 -1 且 errno 为 EINTR，一行数据都没传输——它不是故障，是「请重来」的礼貌通知。所以第 2 节的 read_n/write_n 里都有 `if (errno == EINTR) continue;`。裸写 read 循环而漏掉 EINTR，程序在有信号的环境（尤其是接管了 SIGCHLD 的服务进程）里会莫名「偶发读失败」，这是服务器日志里的一类经典悬案。

## 9. 实际项目中的使用场景

- **日志系统**：多进程写同一份日志，必须 O_APPEND 打开；要「崩溃前最后几行也在」还得在关键行后 fflush 加 fsync——前者是 stdio 缓冲（[标准库文件 IO](/c/430-StdioFileIO)），后者是把内核页缓存压到磁盘；
- **配置与状态文件**：第 7 节的「临时文件 + fsync + rename」三段式，数据库、编辑器、包管理器全部这么干；
- **工具类程序**：cp/find/du 的核心分别是本文第 1、5、4 节的三段代码，你已经写过它们的骨架；临时文件的 mkstemp + unlink「进程死文件亡」写法适合缓存与下载中间态；
- **两条深水区的路标**：大文件随机访问可以走内存映射 mmap（把文件当内存数组，速查见 [POSIX 速查](/c/420-CPosixSystemCall)，跨进程共享内存的近亲在 [共享内存与信号量](/c/350-SharedMemorySemaphore)）；Linux 特有的 inotify 能订阅「目录里谁被创建/修改/删除」的事件（非 POSIX，可移植方案见下一篇）；并发写文件的正规军还有 flock/fcntl 文件锁，本篇点到为止。

## 10. 小练习

预测题（5 分钟）：不运行，先写出每次循环打印的值（a.txt 内容 100 字节）：

```c
int fd = open("a.txt", O_RDONLY);
char buf[40];
ssize_t n1 = read(fd, buf, 40), n2 = read(fd, buf, 40), n3 = read(fd, buf, 40);
printf("%zd %zd %zd\n", n1, n2, n3);
```

参考答案（先写再看）：`40 40 20`——偏移量随每次 read 前进，第三次只剩 20 字节（部分读写），第四次才会是 0。把缓冲与请求都改成 100 字节再跑：`100 0`——第一次读空全文件，第二次就是 EOF。

挑战题（45 分钟，不看答案先动手）：给 tree.c 加上「文件类型标记 + 总大小统计」，做出 mini 版 du：目录后缀 `/`、符号链接后缀 `@`，结束时打印文件总数与总字节数。

提示（思路方向）：在 walk 里加两个 static 计数器；符号链接判断复用 lstat 的 S_ISLNK，成立时打印 `@` 并跳过递归。

展开（关键 API）：目录递归前把 st_size 也累加进去，得到的是「逻辑大小」——想算磁盘占用得看 stat 的 st_blocks 字段。

验收清单：对本文源码目录运行，文件数与 `ls -l | wc -l` 一致；对 sparse.dat 所在目录运行，总字节数应比 du 大好几个数量级，并能解释为什么。

## 11. 与之前和之后的知识的关系

- 往前：[标准库文件 IO](/c/430-StdioFileIO) 的缓冲之谜在第 1 节揭晓——stdio 是系统调用之上的攒批发货层；[进程与管道](/c/330-ProcessAndPipe) 里 dup2 重定向的原理是「最小可用 fd」规则；[内存深水区](/c/210-MemoryManagement) 的泄漏家族添了新成员 fd 泄漏；
- 旁支：[Socket 网络编程](/c/390-SocketNetworkProgramming) 的 socket fd 与本文的文件 fd 同族，recv/send 与 read/write 同受部分读写契约管辖；
- 往后：[跨平台编程](/c/410-CrossPlatformProgramming) 收口本文所有 API 在 Windows 上的名字与语义差异；[POSIX 速查](/c/420-CPosixSystemCall) 是本文四件套与目录遍历的表格化手册，读完后当案头索引。

## 12. 官方文档

- open 手册页（flags、mode 与 umask 的完整语义）：https://man7.org/linux/man-pages/man2/open.2.html
- read / write 手册页（部分读写契约的原文）：https://man7.org/linux/man-pages/man2/read.2.html
- lseek 手册页（SEEK 取值与空洞文件说明）：https://man7.org/linux/man-pages/man2/lseek.2.html
- stat 手册页（struct stat 字段与 lstat 差异）：https://man7.org/linux/man-pages/man2/stat.2.html
- unlink 手册页（延迟释放的条件原文）：https://man7.org/linux/man-pages/man2/unlink.2.html
- rename 手册页（原子替换与 EXDEV）：https://man7.org/linux/man-pages/man2/rename.2.html
- readdir 的 POSIX 规范（errno 惯用法）：https://pubs.opengroup.org/onlinepubs/9699919799/functions/readdir.html

## 13. 自我检查

- 能不查资料写出 cp_sys.c 的完整骨架，并用 strace 解释 stdio 版与它 read 次数的差距；
- 能默写 read_n 的循环结构，说出 read 返回值三种身份的处理方式与 EINTR 分支的作用；
- 能解释 sparse.dat 为什么 ls 与 du 说不通，O_APPEND 为什么不能自己用 lseek 拼；
- 能向同事讲清硬链接与符号链接的差别，以及「unlink 之后程序还能读出数据」的机制。

## 本章总结

系统调用层的世界由文件描述符统一：open 用 flags 表达意图（O_CREAT 必须配 mode，还要过 umask 这道闸），read/write 遵守部分读写契约（-1 出错、0 到尾、正数是实传字节），close 不补就是 fd 泄漏。文件偏移量被 lseek 搬动、被 O_APPEND 原子地钉在末尾，越过文件尾的写入造出稀疏文件。元数据住在 inode：stat 家族配合 S_ISREG/S_ISDIR 宏族读取，目录流 opendir/readdir 逐项发放名字，硬链接与符号链接是「一个 inode 多个名字」与「存路径的小文件」两种思路。unlink 删名字不删数据，rename 原子顶替——二者共同支撑起「临时文件」与「安全替换」两个经典工程模式。

## 下一步

进入 [跨平台编程](/c/410-CrossPlatformProgramming)：本文的 open/read/write 在 Windows 上叫什么？\r\n 从哪来、CREATE FILE 为什么是个句柄？把 POSIX 与 Windows 之间的沟壑一次画成地图。
