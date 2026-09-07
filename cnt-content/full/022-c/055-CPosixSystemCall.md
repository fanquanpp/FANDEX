---
order: 550
title: C POSIX 与系统调用语法速查手册
module: 'c'
category: 计算机科学
difficulty: beginner
description: C POSIX 与系统调用速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 文件描述符

**基本写法：open 打开文件**
`open("<路径>", <标志> [, <权限>]);`
```c
// 打开文件读写
int fd = open("file.txt", O_RDWR | O_CREAT, 0644);
```

---

**基本写法：read 读取**
`read(<文件描述符>, <缓冲区>, <字节数>);`
```c
// 读取最多 100 字节
char buf[100];
ssize_t n = read(fd, buf, sizeof(buf));
```

---

**基本写法：write 写入**
`write(<文件描述符>, <缓冲区>, <字节数>);`
```c
// 写入字符串
write(fd, "Hello", 5);
```

---

**基本写法：close 关闭**
`close(<文件描述符>);`
```c
// 关闭文件描述符
close(fd);
```

---

**基本写法：lseek 移动指针**
`lseek(<文件描述符>, <偏移>, <起点>);`
```c
// 移动到文件开头
lseek(fd, 0, SEEK_SET);
// 跳过 10 字节
lseek(fd, 10, SEEK_CUR);
```

---

## 进程控制

**基本写法：fork 创建进程**
`fork();`
```c
// 创建子进程
pid_t pid = fork();
if (pid == 0) {
    // 子进程
} else {
    // 父进程
}
```

---

**基本写法：exec 执行程序**
`execlp("<程序>", "<参数0>", ..., NULL);`
```c
// 执行 ls 命令
execlp("ls", "ls", "-l", NULL);
```

---

**基本写法：wait 等待子进程**
`wait(<状态指针>);`
```c
// 等待子进程结束
int status;
wait(&status);
```

---

**基本写法：exit 退出进程**
`exit(<状态码>);`
```c
// 正常退出
exit(0);
```

---

## 进程信息

**基本写法：getpid 获取进程 ID**
`getpid();`
```c
// 获取当前进程 ID
pid_t pid = getpid();
```

---

**基本写法：getppid 获取父进程 ID**
`getppid();`
```c
// 获取父进程 ID
pid_t ppid = getppid();
```

---

## 信号处理

**基本写法：signal 注册信号**
`signal(<信号>, <处理函数>);`
```c
// 捕获 Ctrl+C
void handler(int sig) { /* 处理信号 */ }
signal(SIGINT, handler);
```

---

**基本写法：kill 发送信号**
`kill(<进程ID>, <信号>);`
```c
// 发送终止信号
kill(1234, SIGTERM);
```

---

**基本写法：raise 自发送信号**
`raise(<信号>);`
```c
// 给自己发送信号
raise(SIGTERM);
```

---

## 进程间通信

**基本写法：pipe 管道**
`pipe(<描述符数组>);`
```c
// 创建管道
int fds[2];
pipe(fds);
// fds[0] 读端, fds[1] 写端
```

---

**基本写法：mkfifo 命名管道**
`mkfifo("<路径>", <权限>);`
```c
// 创建命名管道
mkfifo("/tmp/myfifo", 0644);
```

---

## 内存映射

**基本写法：mmap 内存映射**
`mmap(NULL, <长度>, <保护>, <标志>, <文件描述符>, <偏移>);`
```c
// 映射文件到内存
void* ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                 MAP_SHARED, fd, 0);
```

---

**基本写法：munmap 解除映射**
`munmap(<指针>, <长度>);`
```c
// 解除内存映射
munmap(ptr, 4096);
```

---

## 系统信息

**基本写法：getenv 获取环境变量**
`getenv("<变量名>");`
```c
// 读取 PATH 环境变量
char* path = getenv("PATH");
```

---

**基本写法：system 执行命令**
`system("<命令>");`
```c
// 执行 shell 命令
system("ls -l");
```

---

## 目录操作

**基本写法：opendir 打开目录**
`opendir("<路径>");`
```c
// 打开当前目录
DIR* dir = opendir(".");
```

---

**基本写法：readdir 读取目录**
`readdir(<目录指针>);`
```c
// 遍历目录
struct dirent* entry;
while ((entry = readdir(dir)) != NULL) {
    printf("%s\n", entry->d_name);
}
```

---

**基本写法：mkdir 创建目录**
`mkdir("<路径>", <权限>);`
```c
// 创建目录
mkdir("newdir", 0755);
```

---

## 错误处理

**基本写法：errno 错误码**
`errno;`
```c
// 检查错误码
if (fd == -1) {
    printf("Error: %s\n", strerror(errno));
}
```

---

**基本写法：perror 错误输出**
`perror("<前缀>");`
```c
// 输出错误信息
perror("open failed");
```
