---
title: 'Python 标准库名词注释 (Standard Library Glossary)'
module: 'python'
category: 'Standard Library'
description: 'Python 标准库：os/sys/re/itertools/functools/collections 等 | Python standard library: os, sys, re, itertools, functools, collections'
author: 'fanquanpp'
updated: '2026-05-29'
---

## A

| 术语         | 英文     | 释义                                            |
| ------------ | -------- | ----------------------------------------------- |
| argparse     | argparse | 命令行参数解析模块，支持位置参数和选项参数      |
| array 模块   | array    | 高效存储单一类型数据的序列，类似列表但更省内存  |
| asyncio 模块 | asyncio  | 异步 I/O 编程模块，支持协程、事件循环、异步任务 |
| ast 模块     | ast      | Python 抽象语法树解析模块，用于代码分析和转换   |

## B

| 术语          | 英文     | 释义                                                        |
| ------------- | -------- | ----------------------------------------------------------- |
| base64 模块   | base64   | Base64 编码解码模块，用于二进制与文本转换                   |
| bisect 模块   | bisect   | 有序列表二分查找和插入模块                                  |
| builtins 模块 | builtins | Python 内置函数和异常的模块，如 `print`、`len`、`Exception` |
| bz2 模块      | bz2      | BZIP2 压缩解压模块                                          |

## C

| 术语                    | 英文               | 释义                                                              |
| ----------------------- | ------------------ | ----------------------------------------------------------------- |
| calendar 模块           | calendar           | 日历相关功能模块                                                  |
| cmath 模块              | cmath              | 复数数学运算模块                                                  |
| collections 模块        | collections        | 容器数据类型模块，提供 namedtuple、deque、Counter、OrderedDict 等 |
| collections.defaultdict | defaultdict        | 带默认值的字典，访问不存在的键时自动创建默认值                    |
| collections.Counter     | Counter            | 元素计数容器，用于统计可哈希对象出现次数                          |
| collections.deque       | deque              | 双端队列，支持两端高效插入删除                                    |
| collections.namedtuple  | namedtuple         | 创建带命名字段的元组子类的工厂函数                                |
| concurrent.futures 模块 | concurrent.futures | 异步并行执行模块，提供 ThreadPoolExecutor 和 ProcessPoolExecutor  |
| copy 模块               | copy               | 对象拷贝模块，`copy.copy()` 浅拷贝，`copy.deepcopy()` 深拷贝      |
| csv 模块                | csv                | CSV 文件读写模块                                                  |
| curses 模块             | curses             | 终端文本界面编程模块（Unix）                                      |

## D

| 术语             | 英文        | 释义                                                      |
| ---------------- | ----------- | --------------------------------------------------------- |
| dataclasses 模块 | dataclasses | Python 3.7+ 的数据类装饰器模块                            |
| datetime 模块    | datetime    | 日期时间处理模块，提供 date、time、datetime、timedelta 类 |
| dbm 模块         | dbm         | Unix 数据库模块，提供简单的键值存储                       |
| decimal 模块     | decimal     | 十进制精确运算模块，避免浮点数精度问题                    |
| difflib 模块     | difflib     | 序列差异计算模块，用于文本比较和合并                      |
| dis 模块         | dis         | Python 字节码反汇编模块                                   |

## E

| 术语           | 英文      | 释义                      |
| -------------- | --------- | ------------------------- |
| encodings 模块 | encodings | 字符编码转换模块          |
| enum 模块      | enum      | 枚举类型定义模块          |
| errno 模块     | errno     | 标准 errno 系统错误码模块 |

## F

| 术语                | 英文      | 释义                                                  |
| ------------------- | --------- | ----------------------------------------------------- |
| fcntl 模块          | fcntl     | Unix 文件控制模块，用于文件描述符操作                 |
| filecmp 模块        | filecmp   | 文件和目录比较模块                                    |
| fnmatch 模块        | fnmatch   | Unix 文件名模式匹配模块                               |
| fractions 模块      | fractions | 有理数运算模块                                        |
| functools 模块      | functools | 函数式编程工具模块，提供 lru_cache、partial、wraps 等 |
| functools.lru_cache | lru_cache | Least Recently Used 缓存装饰器，缓存函数调用结果      |
| functools.partial   | partial   | 函数柯里化工具，创建带预设参数的函数副本              |
| functools.reduce    | reduce    | 函数式规约操作，将序列元素累积为单个值                |

## G

| 术语         | 英文    | 释义                        |
| ------------ | ------- | --------------------------- |
| gc 模块      | gc      | Python 垃圾回收器接口模块   |
| gdbm 模块    | gdbm    | GNU dbm 数据库接口模块      |
| getopt 模块  | getopt  | Unix 风格命令行选项解析模块 |
| getpass 模块 | getpass | 安全密码输入模块            |
| glob 模块    | glob    | Unix 风格路径名模式匹配模块 |

## H

| 术语         | 英文    | 释义                                              |
| ------------ | ------- | ------------------------------------------------- |
| hashlib 模块 | hashlib | 安全哈希和消息摘要模块，支持 md5、sha1、sha256 等 |
| heapq 模块   | heapq   | 堆队列算法模块，实现最小堆                        |
| history      | history | 命令行历史记录                                    |

## I

| 术语                   | 英文         | 释义                                         |
| ---------------------- | ------------ | -------------------------------------------- |
| inspect 模块           | inspect      | 运行时检查对象源码、签名、类型的模块         |
| io 模块                | io           | I/O 流处理模块，提供 StringIO、BytesIO 等    |
| itertools 模块         | itertools    | 迭代器工具模块，提供无限迭代器、组合迭代器等 |
| itertools.chain        | chain        | 将多个迭代器连接成单一迭代器                 |
| itertools.groupby      | groupby      | 按键分组迭代器元素的函数                     |
| itertools.islice       | islice       | 迭代器切片工具                               |
| itertools.permutations | permutations | 生成序列的全排列                             |
| itertools.product      | product      | 生成多个序列的笛卡尔积                       |
| itertools.repeat       | repeat       | 无限重复值迭代器                             |
| itertools.combinations | combinations | 生成序列的组合                               |

## J

| 术语      | 英文      | 释义               |
| --------- | --------- | ------------------ |
| json 模块 | json      | JSON 编码解码模块  |
| zipimport | zipimport | ZIP 压缩包导入模块 |

## L

| 术语         | 英文    | 释义                               |
| ------------ | ------- | ---------------------------------- |
| locale 模块  | locale  | 区域设置和格式化模块               |
| logging 模块 | logging | 日志记录模块，支持多级别、多处理器 |
| lzma 模块    | lzma    | LZMA 压缩解压模块                  |

## M

| 术语                 | 英文            | 释义                                          |
| -------------------- | --------------- | --------------------------------------------- |
| mailbox 模块         | mailbox         | 邮件格式读写模块                              |
| math 模块            | math            | 数学运算模块，提供 sin、cos、sqrt、log 等函数 |
| mimetypes 模块       | mimetypes       | MIME 类型猜测模块                             |
| mmap 模块            | mmap            | 内存映射文件模块                              |
| multiprocessing 模块 | multiprocessing | 多进程并行处理模块                            |
| multiprocessing.Pool | Pool            | 多进程工作池，简化并行任务分发                |

## N

| 术语         | 英文    | 释义                    |
| ------------ | ------- | ----------------------- |
| netrc 模块   | netrc   | .netrc 配置文件解析模块 |
| numbers 模块 | numbers | 数字抽象基类模块        |

## O

| 术语          | 英文     | 释义                                                       |
| ------------- | -------- | ---------------------------------------------------------- |
| operator 模块 | operator | 运算符函数化模块，如 `operator.add`、`operator.itemgetter` |
| optparse 模块 | optparse | 命令行选项解析模块（旧版）                                 |
| os 模块       | os       | 操作系统接口模块，提供文件、目录、进程操作                 |
| os.path 模块  | os.path  | 路径操作模块，提供 join、split、exists 等函数              |
| os.environ    | environ  | 操作系统环境变量字典                                       |
| zipfile       | zipfile  | ZIP 压缩包读写模块                                         |

## P

| 术语            | 英文       | 释义                                      |
| --------------- | ---------- | ----------------------------------------- |
| pathlib 模块    | pathlib    | 面向对象路径操作模块，Python 3.4+         |
| pickle 模块     | pickle     | Python 对象序列化模块，将对象转换为字节流 |
| pipes 模块      | pipes      | Shell 管道接口模块                        |
| platform 模块   | platform   | 平台信息查询模块                          |
| plistlib 模块   | plistlib   | Apple plist 文件读写模块                  |
| pprint 模块     | pprint     | 格式化打印模块，美化输出                  |
| profile 模块    | profile    | 代码性能分析模块                          |
| pstats 模块     | pstats     | 性能统计结果格式模块                      |
| pty 模块        | pty        | 伪终端编程模块（Unix）                    |
| pwd 模块        | pwd        | Unix 用户密码数据库模块                   |
| py_compile 模块 | py_compile | Python 源码编译模块                       |
| pyclbr 模块     | pyclbr     | Python 类浏览器信息模块                   |

## Q

| 术语        | 英文   | 释义                               |
| ----------- | ------ | ---------------------------------- |
| queue 模块  | queue  | 线程安全队列模块                   |
| quopri 模块 | quopri | MIME Quoted-Printable 编码解码模块 |

## R

| 术语             | 英文        | 释义                         |
| ---------------- | ----------- | ---------------------------- |
| random 模块      | random      | 伪随机数生成模块             |
| re 模块          | re          | 正则表达式匹配和处理模块     |
| re.match         | match       | 从字符串开头匹配模式         |
| re.search        | search      | 在字符串任意位置搜索模式     |
| re.findall       | findall     | 返回所有匹配的非重叠子串     |
| re.sub           | sub         | 替换匹配的模式               |
| re.compile       | compile     | 预编译正则表达式模式         |
| readline 模块    | readline    | GNU readline 接口模块        |
| resource 模块    | resource    | 系统资源使用查询模块（Unix） |
| rlcompleter 模块 | rlcompleter | 命令行自动补全模块           |
| runpy 模块       | runpy       | 模块定位和执行模块           |

## S

| 术语              | 英文         | 释义                                         |
| ----------------- | ------------ | -------------------------------------------- |
| sched 模块        | sched        | 事件调度模块                                 |
| secrets 模块      | secrets      | 密码学安全随机数模块，生成安全令牌           |
| select 模块       | select       | I/O 多路复用模块（Unix）                     |
| selectors 模块    | selectors    | 高级 I/O 多路复用模块                        |
| shlex 模块        | shlex        | Shell 词法分析模块                           |
| shutil 模块       | shutil       | 高级文件操作模块，提供复制、移动、删除等功能 |
| signal 模块       | signal       | Unix 信号处理模块                            |
| smtpd 模块        | smtpd        | SMTP 邮件服务器模块                          |
| smtplib 模块      | smtplib      | SMTP 邮件发送模块                            |
| sndhdr 模块       | sndhdr       | 声音文件类型检测模块                         |
| socket 模块       | socket       | 网络套接字编程模块                           |
| socketserver 模块 | socketserver | 网络服务器框架模块                           |
| spwd 模块         | spwd         | Unix shadow 密码数据库模块                   |
| sqlite3 模块      | sqlite3      | SQLite 数据库接口模块                        |
| ssl 模块          | ssl          | SSL/TLS 加密套接字模块                       |
| stat 模块         | stat         | 文件状态解析模块                             |
| statistics 模块   | statistics   | 统计数学模块                                 |
| string 模块       | string       | 字符串常量和工具模块                         |
| struct 模块       | struct       | 二进制数据结构打包解包模块                   |
| subprocess 模块   | subprocess   | 子进程创建和管理模块                         |
| sunau 模块        | sunau        | Sun AU 音频文件模块                          |
| symbol 模块       | symbol       | Python 语法符号常量模块                      |
| sys 模块          | sys          | Python 解释器系统接口模块                    |
| sys.argv          | argv         | 命令行参数列表                               |
| sys.path          | path         | 模块搜索路径列表                             |
| sys.modules       | modules      | 已导入模块缓存字典                           |
| sys.exit          | exit         | 退出解释器函数                               |

## T

| 术语             | 英文        | 释义                      |
| ---------------- | ----------- | ------------------------- |
| tarfile 模块     | tarfile     | TAR 压缩包读写模块        |
| telnetlib 模块   | telnetlib   | Telnet 协议客户端模块     |
| tempfile 模块    | tempfile    | 临时文件和目录创建模块    |
| textwrap 模块    | textwrap    | 文本包装和填充模块        |
| threading 模块   | threading   | 多线程编程模块            |
| threading.Lock   | Lock        | 线程同步互斥锁            |
| threading.RLock  | RLock       | 可重入互斥锁              |
| time 模块        | time        | 时间访问和转换模块        |
| timeit 模块      | timeit      | 代码片段执行时间测量模块  |
| tkinter 模块     | tkinter     | Tcl/Tk GUI 图形界面模块   |
| tokenize 模块    | tokenize    | Python 源代码词法分析模块 |
| traceback 模块   | traceback   | 异常栈回溯模块            |
| tracemalloc 模块 | tracemalloc | 内存分配追踪模块          |
| tty 模块         | tty         | 终端控制模块（Unix）      |
| turtle 模块      | turtle      | 海龟绘图模块，适合教学    |

## U

| 术语                    | 英文               | 释义                    |
| ----------------------- | ------------------ | ----------------------- |
| unittest 模块           | unittest           | 单元测试框架模块        |
| urllib 模块             | urllib             | URL 处理模块            |
| urllib.parse 模块       | urllib.parse       | URL 解析和构造模块      |
| urllib.request 模块     | urllib.request     | URL 请求模块            |
| urllib.robotparser 模块 | urllib.robotparser | robots.txt 解析模块     |
| uselect 模块            | uselect            | 非阻塞 I/O 多路复用模块 |
| uu 模块                 | uu                 | UU 编码解码模块         |

## V

| 术语            | 英文       | 释义             |
| --------------- | ---------- | ---------------- |
| venv 模块       | venv       | 虚拟环境创建模块 |
| venv/virtualenv | virtualenv | 虚拟环境隔离工具 |

## W

| 术语            | 英文       | 释义                             |
| --------------- | ---------- | -------------------------------- |
| wave 模块       | wave       | WAV 音频文件读写模块             |
| weakref 模块    | weakref    | 弱引用模块，不阻止对象被垃圾回收 |
| webbrowser 模块 | webbrowser | 系统默认浏览器控制模块           |
| winsound 模块   | winsound   | Windows 声音播放模块             |

## X

| 术语                  | 英文        | 释义                                |
| --------------------- | ----------- | ----------------------------------- |
| xml 模块              | xml         | XML 处理模块总称                    |
| xml.etree.ElementTree | ElementTree | XML 元素树解析模块，轻量级 XML 处理 |
| xml.dom 模块          | xml.dom     | DOM 风格 XML 处理模块               |
| xml.sax 模块          | xml.sax     | SAX 风格流式 XML 解析模块           |
| xxdiff 模块           | xxdiff      | 文件差异比较模块                    |

## Y

| 术语      | 英文 | 释义                                 |
| --------- | ---- | ------------------------------------ |
| yaml 模块 | yaml | YAML 数据序列化模块（需安装 pyyaml） |

## Z

| 术语        | 英文   | 释义                |
| ----------- | ------ | ------------------- |
| zipapp 模块 | zipapp | Python 应用打包模块 |
| zlib 模块   | zlib   | zlib 压缩解压模块   |
