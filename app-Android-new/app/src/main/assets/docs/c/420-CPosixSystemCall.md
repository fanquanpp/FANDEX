---
order: 420
title: C POSIX 与系统调用速查手册
module: 'c'
category: 计算机科学
difficulty: intermediate
description: POSIX 系统调用速查：文件描述符、进程控制（fork/exec/wait）、管道、信号、内存映射与目录遍历，含返回值语义、完整示例与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'c/440-CStandardLibrary'
  - 'c/330-ProcessAndPipe'
  - 'c/400-FileSystemOperation'
  - 'c/340-SignalHandling'
prerequisites:
  - 'c/430-StdioFileIO'
---

## 前置知识

- [文件 I/O 操作](/c/430-StdioFileIO)：理解流（FILE*）与缓冲的概念
- 对进程、命令行有基本认识（本文示例面向 Linux/Unix）

## 学习目标

- 分清「库函数」与「系统调用」，理解文件描述符（fd）与 FILE* 的关系
- 掌握 POSIX 返回值约定：整数型失败返回 -1 并设置 errno，指针型失败返回特定哨兵
- 会写 read/write 的完整循环（处理部分读写与 EINTR）
- 掌握 fork + exec + wait 的标准三段式，理解为什么 exec 失败要 _exit
- 会用 pipe 建立父子进程通信，mmap 做文件内存映射，opendir/readdir 遍历目录

## 库函数与系统调用

**库函数**（如 `fopen`、`printf`）是 C 标准定义的接口，实现可以在用户态完成缓冲、格式化等工作；**系统调用**（如 `open`、`read`）是内核提供的入口，每次调用都会陷入内核态。两者关系：一个 `fwrite` 可能内部调用一次或多次 `write`。

- 标准库层（可移植到任何 C 平台）：`<stdio.h>` 的 fopen/fread/fclose
- POSIX 层（Unix/Linux/MacOS，Windows 需模拟层）：`<unistd.h>`、`<fcntl.h>`、`<sys/wait.h>` 等

需要细粒度控制（阻塞、非阻塞、文件锁、select/poll）、或操作"非文件的东西"（管道、套接字、终端）时，必须下到 POSIX 层。

## 错误处理的通用约定

POSIX 函数的失败约定几乎是统一的，先记住这一条能避免大多数错误：

```c
#include <errno.h>
#include <string.h>
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>

int fd = open("nofile.txt", O_RDONLY);
if (fd == -1) {                       // 整数型：失败返回 -1
    perror("open");                   // 打印 "open: No such file or directory"
    // 或等价：fprintf(stderr, "open: %s\n", strerror(errno));
    return 1;
}
close(fd);
```

| 返回类型          | 失败时               | 代表函数                       |
| :---------------- | :------------------- | :----------------------------- |
| `int`（fd/状态）  | -1                   | `open` `read` `write` `close`  |
| `pid_t`           | -1                   | `fork`                         |
| `void *`          | `MAP_FAILED` 或 NULL | `mmap`（注意不是 NULL！）       |
| `DIR *`           | NULL                 | `opendir`                      |

`errno` 只在**调用失败后**才有意义；失败后到读取 errno 之间不要插入其它可能修改 errno 的调用（尤其 printf）。

## 文件描述符

**fd 是什么**：一个非负整数，是进程"打开的东西"（文件、管道、套接字）的句柄。每个进程默认有 0=stdin、1=stdout、2=stderr。

```c
#include <fcntl.h>
#include <unistd.h>

// 打开/创建文件：O_CREAT 需要第三参给权限（受 umask 影响）
int fd = open("log.txt", O_WRONLY | O_CREAT | O_APPEND, 0644);
```

| 函数      | 签名要点                        | 说明                                     |
| :-------- | :------------------------------ | :--------------------------------------- |
| `open`    | `int open(const char*, int, ...)`| 标志按位或组合；成功返回最低未用 fd       |
| `read`    | `ssize_t read(int, void*, size_t)` | 返回**实际读到的字节数**，0 表 EOF，-1 表错误 |
| `write`   | `ssize_t write(int, const void*, size_t)` | 返回实际写入字节数，可能小于请求数 |
| `close`   | `int close(int)`                | 释放 fd；忘 close 会耗尽句柄             |
| `lseek`   | `off_t lseek(int, off_t, int)`  | SEEK_SET/CUR/END 三种基准                |

**read/write 的正确姿势**：短读短写是常态而非异常（信号中断返回 -1 且 errno==EINTR、网络与管道的缓冲限制），必须循环：

```c
#include <unistd.h>
#include <errno.h>

/* 把 fd_in 的内容复制到 fd_out，返回 0 成功 / -1 出错 */
int copy_all(int fd_in, int fd_out) {
    char buf[4096];
    ssize_t n;
    while ((n = read(fd_in, buf, sizeof(buf))) != 0) {
        if (n == -1) {
            if (errno == EINTR) continue;   // 被信号打断，重试
            return -1;
        }
        ssize_t done = 0;
        while (done < n) {                  // 处理"写了一半"的情况
            ssize_t w = write(fd_out, buf + done, (size_t)(n - done));
            if (w == -1) {
                if (errno == EINTR) continue;
                return -1;
            }
            done += w;
        }
    }
    return 0;
}
```

fd 与 FILE* 可以互转：`fileno(fp)` 取流背后的 fd，`fdopen(fd, "r")` 把 fd 包成流。但同一对象别混用两套接口读写而不刷新缓冲，容易乱序。

## 进程控制

### fork + exec + wait 三段式

`fork()` 把当前进程复制一份：**一次调用、两次返回**——父进程拿到子进程 pid，子进程拿到 0，出错返回 -1。

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int main(void) {
    pid_t pid = fork();
    if (pid == -1) {
        perror("fork");
        return 1;
    }
    if (pid == 0) {
        /* 子进程：替换成 ls 程序（exec 成功则不返回） */
        execlp("ls", "ls", "-l", (char *)NULL);
        perror("exec");       // 只有 exec 失败才会走到这里
        _exit(127);           // 必须用 _exit：不能让子进程刷新/复制父进程的 stdio 缓冲
    }
    /* 父进程：等待子进程并读取退出状态 */
    int status;
    if (waitpid(pid, &status, 0) == -1) {
        perror("waitpid");
        return 1;
    }
    if (WIFEXITED(status)) {
        printf("子进程正常退出，code=%d\n", WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("子进程被信号 %d 杀死\n", WTERMSIG(status));
    }
    return 0;
}
```

要点：

- `exec` 家族 POSIX 定义 5 个变体：`execl/execlp/execle/execv/execvp`，l=参数列表逐个写、v=参数数组、p=按 PATH 搜索、e=自带环境变量（`execvpe` 是 GNU 扩展，不属 POSIX）。
- 子进程 exec 失败后必须 `_exit`，绝不能 `exit`/`return`——后者会刷新 stdio 缓冲，使日志/提示重复输出两份。
- 忘记 `wait` 会留下僵尸进程；`waitpid(-1, NULL, WNOHANG)` 循环可异步收割。

### 常用进程 API

| 函数       | 说明                                       |
| :--------- | :----------------------------------------- |
| `getpid` / `getppid` | 当前/父进程 ID                   |
| `exit` / `_exit`     | 正常退出（刷新缓冲）/ 立即终止    |
| `system("cmd")`      | 等价 fork+exec /bin/sh；返回值需按 wait 状态解读 |
| `kill(pid, sig)`     | 发送信号；`raise(sig)` 发给自己   |

## 管道与 IPC

```c
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    int fds[2];
    if (pipe(fds) == -1) { perror("pipe"); return 1; }
    // fds[0] 读端, fds[1] 写端

    pid_t pid = fork();
    if (pid == 0) {
        close(fds[1]);                       // 子进程只读：先关写端
        char buf[64];
        ssize_t n;
        while ((n = read(fds[0], buf, sizeof(buf) - 1)) > 0) {
            buf[n] = '\0';
            printf("child got: %s", buf);
        }
        close(fds[0]);
        return 0;
    }
    close(fds[0]);                           // 父进程只写：先关读端
    write(fds[1], "hello pipe\n", 11);
    close(fds[1]);                           // 关闭写端后，子进程 read 返回 0 结束
    return 0;
}
```

输出：

```text
child got: hello pipe
```

要点：管道是**单向**的，双向通信要建两根；用完及时 close，否则对端永远等不到 EOF。命名管道 `mkfifo("path", 0644)` 则以文件路径存在，无亲缘关系的进程也能打开它。

## 信号（速查）

```c
#include <signal.h>
#include <unistd.h>

volatile sig_atomic_t got = 0;            // 处理函数内只允许这样的"受控写入"

void on_sigint(int sig) { (void)sig; got = 1; }

int main(void) {
    signal(SIGINT, on_sigint);            // 捕获 Ctrl+C
    while (!got) pause();                 // 主循环检查标志
    write(1, "bye\n", 4);                 // write 是异步信号安全的，printf 不是
    return 0;
}
```

处理函数内只能调用异步信号安全函数（write 等），只设置 `volatile sig_atomic_t` 标志；系统讲解见 [信号处理](/c/340-SignalHandling)。

## 内存映射

```c
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    int fd = open("data.bin", O_RDWR);
    if (fd == -1) { perror("open"); return 1; }

    size_t len = 4096;
    void *p = mmap(NULL, len, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (p == MAP_FAILED) {                // 注意：失败是 MAP_FAILED，不是 NULL
        perror("mmap");
        return 1;
    }
    memcpy(p, "hi", 2);                   // 读写这块内存即读写文件（MAP_SHARED 回写）
    munmap(p, len);
    close(fd);
    return 0;
}
```

`MAP_PRIVATE`（写时复制，改动不落盘）、`MAP_ANONYMOUS`（无文件的纯内存区，常配合 fork 共享）是另外两个常用标志。

## 目录操作

```c
#include <dirent.h>
#include <stdio.h>

int main(void) {
    DIR *dir = opendir(".");
    if (!dir) { perror("opendir"); return 1; }

    struct dirent *ent;
    while ((ent = readdir(dir)) != NULL) {
        printf("%s\n", ent->d_name);      // 含 "." 与 ".."；d_type 平台相关
    }
    closedir(dir);
    return 0;
}
```

| 函数               | 说明                                     |
| :----------------- | :--------------------------------------- |
| `opendir`/`closedir`| 打开/关闭目录，失败返回 NULL             |
| `readdir`          | 逐项返回 struct dirent，读完返回 NULL    |
| `mkdir(path, 0755)`| 创建目录（头文件 `<sys/stat.h>`）        |
| `stat`/`fstat`     | 查询文件元信息（大小、权限、类型）       |

## 环境与杂项

| 函数        | 说明                                                   |
| :---------- | :----------------------------------------------------- |
| `getenv`    | 读环境变量；修改环境请用 `setenv`/`putenv`（非标准 C） |
| `uname`     | 内核信息（`<sys/utsname.h>`）                          |
| `sysconf`   | 查询系统限制，如 `_SC_NPROCESSORS_ONLN`（CPU 核数）    |
| `usleep`/`nanosleep` | 休眠；可移植性更好的是 POSIX `nanosleep`      |
| `getopt`    | 命令行参数解析（`<unistd.h>`）                         |

## 常见陷阱

- **read/write 不循环**：把"返回值 == 请求字节数"当作理所当然；正确做法是循环处理短读短写与 EINTR。
- **exec 失败后用 exit/return**：会刷新父进程的 stdio 缓冲造成输出重复，必须 `_exit`。
- **fork 后子进程忘关管道另一端**：EOF 永远不来，read 方挂死。
- **mmap 失败判 NULL**：失败返回 `MAP_FAILED`（即 `(void*)-1`），判 NULL 漏不掉错误只能等段错误。
- **errno 在失败后先 printf 再读**：printf 自己可能改写 errno，先保存或先用 perror/strerror。
- **open 带 O_CREAT 却不给权限**：`open(path, O_CREAT)` 两参形式是未定义用法，三参形式必须给 0644 之类的模式。
- **close 返回值不检查**：write 的数据可能还滞留在内核缓冲，close 失败意味着可能丢数据（尤其 NFS）。
- **把 POSIX 函数当可移植 C**：`fork`、`strtok_r`、`sem_init` 在 Windows 原生环境不存在，跨平台需条件编译或替代实现。

## 小结

**初学者记住这三点：**

1. POSIX 层操作的都是"整数句柄"：文件是 fd，进程是 pid，失败几乎都是返回 -1 并设置 errno。
2. `read`/`write` 必须用返回值循环，返回 0 就是 EOF，-1 就查 errno。
3. 建进程用 fork + exec + wait 三段式：子进程 exec 失败用 `_exit`，父进程必须 wait。

**进阶者还需注意：**

- fd 泄漏与僵尸进程是长驻服务的两大慢性病：打开必有关闭、子进程必有收割（wait 或 SIGCHLD/WNOHANG）。
- 信号与 fd 交互的经典组合是"自管道技巧"：信号处理函数只 write 一个字节，主循环统一消费。
- mmap 适合随机访问大文件与共享内存，但顺序读大文件时普通 read + 大缓冲往往更快，别为了"高级"而选型。
- 与标准库层的分界：纯算法、字符串、内存用 C 标准库即可移植；一旦涉及进程/信号/套接字就离开可移植区，见 [C 标准库速查手册](/c/440-CStandardLibrary)。
