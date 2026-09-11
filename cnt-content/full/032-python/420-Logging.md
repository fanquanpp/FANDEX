---
order: 420
title: Python logging 日志配置
module: 'python'
category: 后端技术
difficulty: beginner
description: Python logging 日志配置 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 基础配置

**基本写法：快速配置**
`logging.basicConfig(level=<级别>)`
```python
# 一行配置根 logger 输出级别
import logging
logging.basicConfig(level=logging.DEBUG)
logging.info("启动服务")
```

**基本写法：带格式与文件**
`logging.basicConfig(filename=<文件>, format=<格式>, level=<级别>)`
```python
# 输出到文件并定义格式
logging.basicConfig(
    filename="app.log",
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
```

**基本写法：获取命名 logger**
`logging.getLogger(<名称>)`
```python
# 每个模块使用独立 logger 便于追踪
logger = logging.getLogger(__name__)
logger.warning("模块警告")
```

---

## 日志级别

**基本写法：各级别日志**
`logger.<级别>(<消息>)`
```python
# 从低到高五个级别
logger.debug("调试详情")
logger.info("一般信息")
logger.warning("警告")
logger.error("错误")
logger.critical("严重错误")
```

**基本写法：自定义级别**
`logging.addLevelName(<数值>, <名称>)`
```python
# 注册自定义日志级别
TRACE = 5
logging.addLevelName(TRACE, "TRACE")
logger.log(TRACE, "追踪信息")
```

**基本写法：按级别输出**
`logger.log(<级别>, <消息>)`
```python
# 动态指定级别
logger.log(logging.ERROR, "动态级别错误")
```

---

## Handler 输出目标

**基本写法：控制台输出**
`logging.StreamHandler()`
```python
# 添加控制台处理器
import sys
console = logging.StreamHandler(sys.stdout)
console.setLevel(logging.INFO)
logger.addHandler(console)
```

**基本写法：文件输出**
`logging.FileHandler(<文件>)`
```python
# 日志写入指定文件
fh = logging.FileHandler("app.log", encoding="utf-8")
fh.setLevel(logging.INFO)
logger.addHandler(fh)
```

**基本写法：按大小滚动**
`logging.handlers.RotatingFileHandler(<文件>, maxBytes=<字节>, backupCount=<份数>)`
```python
# 单文件超限后自动轮转
from logging.handlers import RotatingFileHandler
rh = RotatingFileHandler("app.log", maxBytes=10 * 1024 * 1024, backupCount=5)
logger.addHandler(rh)
```

**基本写法：按时间滚动**
`logging.handlers.TimedRotatingFileHandler(<文件>, when=<周期>, backupCount=<份数>)`
```python
# 按时间周期切割日志
from logging.handlers import TimedRotatingFileHandler
th = TimedRotatingFileHandler("app.log", when="midnight", backupCount=7)
logger.addHandler(th)
```

---

## Formatter 格式化

**基本写法：定义格式器**
`logging.Formatter(<格式字符串>)`
```python
# 设置日志显示格式
fmt = logging.Formatter("%(asctime)s %(levelname)-8s %(message)s")
fh.setFormatter(fmt)
logger.addHandler(fh)
```

**基本写法：常用字段**
`%(asctime)s %(name)s %(levelname)s %(message)s`
```python
# 常用格式字段说明
# asctime 时间 | name logger 名 | levelname 级别
# filename 文件名 | lineno 行号 | funcName 函数名
fmt = logging.Formatter("%(filename)s:%(lineno)d %(message)s")
```

---

## 异常日志

**基本写法：记录异常堆栈**
`logger.exception(<消息>)`
```python
# 在 except 中输出完整堆栈
try:
    1 / 0
except ZeroDivisionError:
    logger.exception("除零异常")
```

**基本写法：exc_info 参数**
`logger.error(<消息>, exc_info=True)`
```python
# 任意级别附加异常信息
try:
    open("missing.txt")
except FileNotFoundError:
    logger.error("文件不存在", exc_info=True)
```

---

## dictConfig 字典配置

**换行写法：字典配置**
`logging.config.dictConfig(<配置字典>)`
```python
# 集中化配置多 handler 与 logger
import logging.config
config = {
    "version": 1,
    "formatters": {"simple": {"format": "%(asctime)s %(message)s"}},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
logging.config.dictConfig(config)
```

---

## 禁用与过滤

**基本写法：禁用日志**
`logging.disable(<级别>)`
```python
# 禁用指定级别及以下日志
logging.disable(logging.DEBUG)  # 关闭 DEBUG
```

**基本写法：按级别过滤**
`logging.Filter`
```python
# 自定义过滤器
class LevelFilter(logging.Filter):
    def filter(self, record):
        return record.levelno >= logging.WARNING

logger.addFilter(LevelFilter())
```

---

## 模块化 logger 最佳实践

**基本写法：模块级 logger**
`logger = logging.getLogger(__name__)`
```python
# 每个 Python 文件顶部声明 logger
# mymodule.py
import logging
logger = logging.getLogger(__name__)

def do_work():
    logger.info("开始处理")
```

**基本写法：设置第三方库日志级别**
`logging.getLogger(<库名>).setLevel(<级别>)`
```python
# 抑制第三方库的过多日志
logging.getLogger("urllib3").setLevel(logging.WARNING)
```

**基本写法：禁止传播**
`logger.propagate = False`
```python
# 防止日志向父 logger 重复输出
logger.propagate = False
```
