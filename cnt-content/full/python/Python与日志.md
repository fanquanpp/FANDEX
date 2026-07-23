---
order: 72
title: Python与日志
module: python
category: Python
difficulty: beginner
description: logging模块与日志配置
author: fanquanpp
updated: '2026-06-14'
related:
  - python/函数详解
  - python/Python与测试
  - python/Python与加密
  - python/Python与CLI
prerequisites:
  - python/语法速查
---

## 什么是日志

日志是程序运行时输出的记录信息。当程序出现问题时，日志是你排查错误的主要依据。没有日志的程序就像黑盒，出了问题完全无从下手。

Python 标准库中的 logging 模块提供了完整的日志功能，不需要安装第三方库。它支持多种日志级别、灵活的输出格式、文件轮转等特性，能满足从简单脚本到大型项目的各种需求。

## 基础概念

### 日志级别

日志级别从低到高分为五级，不同级别表示信息的重要程度不同：

- DEBUG：调试信息，最详细的日志，只在开发时使用
- INFO：普通信息，确认程序按预期运行
- WARNING：警告信息，表示有潜在问题，但程序仍能正常工作
- ERROR：错误信息，某些功能无法正常执行
- CRITICAL：严重错误，程序可能无法继续运行

设置日志级别后，只有等于或高于该级别的日志才会被输出。例如设置为 INFO，则 DEBUG 级别的日志不会显示。

### Logger、Handler 与 Formatter

- Logger：日志记录器，是代码中直接使用的接口。每个 Logger 有一个名称，通常用模块名命名
- Handler：日志处理器，决定日志输出到哪里（控制台、文件、网络等）
- Formatter：日志格式器，决定日志的输出格式

一个 Logger 可以有多个 Handler，每个 Handler 可以有自己的 Formatter。

## 快速上手

### 最简单的日志

```python
import logging

# 配置基本日志（只需一行）
logging.basicConfig(level=logging.INFO)

# 输出不同级别的日志
logging.debug("这是调试信息")      # 不会显示（级别低于 INFO）
logging.info("程序启动成功")       # 会显示
logging.warning("磁盘空间不足")    # 会显示
logging.error("文件读取失败")      # 会显示
logging.critical("数据库连接断开") # 会显示
```

### 自定义日志格式

```python
import logging

# 配置日志格式
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

logger.info("处理开始")
logger.error("出错了")
```

输出示例：

```
2026-01-15 10:30:00 [INFO] __main__: 处理开始
2026-01-15 10:30:01 [ERROR] __main__: 出错了
```

### 输出到文件

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    filename='app.log',      # 日志输出到文件
    filemode='a'             # 追加模式（默认），'w' 为覆盖模式
)

logging.info("这条日志会写入 app.log 文件")
```

## 详细用法

### 使用 Logger 对象

在大型项目中，应该为每个模块创建独立的 Logger，而不是直接使用 logging.info：

```python
import logging

# 为不同模块创建不同的 Logger
db_logger = logging.getLogger('app.database')
api_logger = logging.getLogger('app.api')

# 配置根 Logger
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

# 不同模块的日志会带上不同的 Logger 名称
db_logger.info("数据库连接成功")   # 显示 app.database
api_logger.info("API 请求处理中")  # 显示 app.api
db_logger.error("查询超时")       # 显示 app.database
```

### 同时输出到控制台和文件

```python
import logging

# 创建 Logger
logger = logging.getLogger('myapp')
logger.setLevel(logging.DEBUG)

# 创建控制台 Handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)  # 控制台只显示 INFO 及以上

# 创建文件 Handler
file_handler = logging.FileHandler('app.log', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)  # 文件记录所有级别

# 创建格式器
formatter = logging.Formatter(
    '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

# 给 Handler 设置格式
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

# 给 Logger 添加 Handler
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# 使用
logger.debug("这条只写入文件")     # 控制台不显示
logger.info("这条同时显示和写入")   # 控制台和文件都有
logger.error("错误信息")
```

### 日志文件轮转

长期运行的应用如果一直写入同一个日志文件，文件会越来越大。使用 RotatingFileHandler 可以按文件大小轮转：

```python
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger('myapp')
logger.setLevel(logging.INFO)

# 创建轮转文件 Handler
# maxBytes：单个文件最大字节数（这里设为 10MB）
# backupCount：保留的备份文件数量
handler = RotatingFileHandler(
    'app.log',
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)

handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(message)s'
))
logger.addHandler(handler)

# 当 app.log 达到 10MB 时，会自动重命名为 app.log.1
# 然后创建新的 app.log 继续写入
# 最多保留 5 个备份文件（app.log.1 到 app.log.5）
```

### 按时间轮转日志

```python
import logging
from logging.handlers import TimedRotatingFileHandler

logger = logging.getLogger('myapp')
logger.setLevel(logging.INFO)

# 创建按时间轮转的 Handler
handler = TimedRotatingFileHandler(
    'app.log',
    when='midnight',    # 每天午夜轮转
    interval=1,         # 间隔
    backupCount=30,     # 保留 30 天的日志
    encoding='utf-8'
)

# when 参数可选值：
# 'S' - 秒, 'M' - 分, 'H' - 小时, 'D' - 天
# 'midnight' - 每天午夜, 'W0'-'W6' - 每周几（W0=周一）

handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(message)s'
))
logger.addHandler(handler)
```

### 记录异常信息

当捕获异常时，使用 exc_info=True 可以把完整的堆栈跟踪写入日志：

```python
import logging

logging.basicConfig(
    level=logging.ERROR,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

try:
    result = 1 / 0
except ZeroDivisionError:
    # exc_info=True 会记录完整的异常堆栈
    logging.error("计算出错", exc_info=True)

# 也可以用 logging.exception()，它自动设置 exc_info=True
try:
    result = 1 / 0
except ZeroDivisionError:
    logging.exception("计算出错")
```

### 使用字典配置

对于复杂项目，可以使用字典来配置日志，比代码配置更清晰：

```python
import logging
import logging.config

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
        'detailed': {
            'format': '%(asctime)s [%(levelname)s] %(name)s %(funcName)s:%(lineno)d: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'standard',
            'stream': 'ext://sys.stdout',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'DEBUG',
            'formatter': 'detailed',
            'filename': 'app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'encoding': 'utf-8',
        },
    },
    'loggers': {
        'myapp': {
            'level': 'DEBUG',
            'handlers': ['console', 'file'],
        },
        'myapp.database': {
            'level': 'INFO',
            'handlers': ['file'],
            'propagate': False,  # 不向父 Logger 传播
        },
    },
    'root': {
        'level': 'WARNING',
        'handlers': ['console'],
    },
}

# 应用配置
logging.config.dictConfig(LOGGING_CONFIG)

# 使用
logger = logging.getLogger('myapp')
logger.info("应用启动")
```

### 结构化日志（JSON 格式）

在微服务和日志分析平台（如 ELK）中，JSON 格式的日志更容易被机器解析：

```python
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """自定义 JSON 格式化器"""
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'line': record.lineno,
        }
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)

# 使用 JSON 格式化器
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())

logger = logging.getLogger('myapp')
logger.setLevel(logging.INFO)
logger.addHandler(handler)

logger.info("用户登录", extra={'user_id': 123})
```

## 常见场景

### FastAPI 项目中的日志配置

```python
import logging
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, Request
import time

app = FastAPI()

# 配置日志
logger = logging.getLogger('api')
logger.setLevel(logging.INFO)

handler = RotatingFileHandler(
    'api.log', maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname)s] %(message)s'
))
logger.addHandler(handler)

# 请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} duration={duration:.3f}s"
    )
    return response

@app.get("/users")
async def get_users():
    logger.info("获取用户列表")
    return {"users": []}
```

### 在类中使用日志

```python
import logging

class UserService:
    """在类中使用日志的推荐方式"""
    def __init__(self):
        # 用类名作为 Logger 名称
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_user(self, user_id: int):
        self.logger.info(f"查询用户: user_id={user_id}")
        try:
            user = self._fetch_user(user_id)
            self.logger.debug(f"查询成功: {user}")
            return user
        except Exception as e:
            self.logger.error(f"查询失败: user_id={user_id}", exc_info=True)
            raise

    def _fetch_user(self, user_id):
        # 模拟数据库查询
        return {"id": user_id, "name": "张三"}
```

## 注意事项与常见错误

### 不要用 print 代替 logging

print 输出的信息无法控制级别、无法关闭、无法写入文件、无法添加时间戳。在正式项目中，始终使用 logging 而不是 print。

### 日志中的敏感信息

不要在日志中记录密码、Token、身份证号等敏感信息。如果必须记录，应该脱敏处理：

```python
# 错误：记录了明文密码
# logger.info(f"用户登录: password={password}")

# 正确：脱敏处理
logger.info(f"用户登录: password=***")
```

### 避免在日志中使用 f-string 的性能陷阱

当日志级别被过滤时，f-string 仍然会被求值。使用 % 格式化或延迟格式化可以避免这个问题：

```python
# 不推荐：即使 DEBUG 级别被过滤，f-string 仍然会执行
# logger.debug(f"处理数据: {expensive_function()}")

# 推荐：使用 % 格式化，只在日志实际输出时才求值
logger.debug("处理数据: %s", expensive_function)

# 或者用 logger.isEnabledFor 检查
if logger.isEnabledFor(logging.DEBUG):
    logger.debug(f"处理数据: {expensive_function()}")
```

### Logger 的传播机制

默认情况下，子 Logger 的日志会向上传播给父 Logger。如果你给子 Logger 添加了 Handler，又没有设置 propagate=False，日志可能会被重复输出：

```python
# 设置不向父 Logger 传播
child_logger = logging.getLogger('myapp.child')
child_logger.propagate = False  # 防止日志重复输出
```

### basicConfig 只在第一次调用时生效

logging.basicConfig() 只在第一次调用时生效。如果之前已经调用过（或者其他库已经配置过日志），再次调用不会有效果。建议在程序入口处尽早调用 basicConfig。

## 进阶用法

### 自定义 Handler 发送日志到远程服务

```python
import logging
import json
import urllib.request

class WebhookHandler(logging.Handler):
    """将日志发送到 Webhook（如飞书、钉钉、Slack）"""

    def __init__(self, webhook_url: str):
        super().__init__()
        self.webhook_url = webhook_url

    def emit(self, record):
        try:
            # 只发送 ERROR 及以上级别的日志
            if record.levelno < logging.ERROR:
                return

            log_entry = {
                'level': record.levelname,
                'message': record.getMessage(),
                'logger': record.name,
                'timestamp': record.created,
            }

            data = json.dumps(log_entry).encode('utf-8')
            req = urllib.request.Request(
                self.webhook_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            urllib.request.urlopen(req)
        except Exception:
            # 日志发送失败不应该影响程序运行
            self.handleError(record)

# 使用
logger = logging.getLogger('myapp')
logger.addHandler(WebhookHandler('https://your-webhook-url'))
```

### 使用 structlog 库

structlog 是一个更现代的日志库，提供更好的结构化日志支持：

```bash
pip install structlog
```

```python
import structlog

# 配置 structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),  # 开发环境用彩色控制台输出
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

logger = structlog.get_logger()

# 使用关键字参数记录结构化日志
logger.info("用户登录", user_id=123, ip="192.168.1.1")
logger.error("支付失败", order_id="ORD-001", reason="余额不足")
```

### 使用 loguru 库

loguru 是一个更简洁的日志库，开箱即用，不需要复杂配置：

```bash
pip install loguru
```

```python
from loguru import logger

# 默认输出到控制台，带颜色
logger.info("程序启动")

# 添加文件输出
logger.add("app.log", rotation="10 MB", retention="30 days", encoding="utf-8")

# 不同级别
logger.debug("调试信息")
logger.info("普通信息")
logger.warning("警告信息")
logger.error("错误信息")

# 记录异常
try:
    1 / 0
except ZeroDivisionError:
    logger.exception("计算出错")

# 结构化日志
logger.info("用户登录", user_id=123, ip="192.168.1.1")
```
