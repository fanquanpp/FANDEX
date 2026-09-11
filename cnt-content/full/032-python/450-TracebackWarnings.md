---
order: 450
title: Python traceback 与 warnings
module: 'python'
category: 后端技术
difficulty: beginner
description: Python traceback 与 warnings 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## traceback 打印异常

**基本写法：打印当前异常**
`traceback.print_exc()`
```python
# 打印当前异常栈到 stderr
import traceback

try:
    1 / 0
except Exception:
    traceback.print_exc()
```

**基本写法：格式化异常字符串**
`traceback.format_exc()`
```python
# 获取异常栈字符串
try:
    1 / 0
except Exception:
    msg = traceback.format_exc()
    print(msg)
```

**基本写法：打印指定异常**
`traceback.print_exception(<异常>)`
```python
# 打印指定异常对象
try:
    raise ValueError("test")
except ValueError as e:
    traceback.print_exception(e)
```

**基本写法：格式化指定异常**
`traceback.format_exception(<异常>)`
```python
# 返回异常信息行列表
try:
    raise ValueError("test")
except ValueError as e:
    lines = traceback.format_exception(e)
    print("".join(lines))
```

---

## traceback 提取栈帧

**基本写法：提取当前栈**
`traceback.extract_stack()`
```python
# 获取当前调用栈帧列表
frames = traceback.extract_stack()
for f in frames:
    print(f.filename, f.lineno, f.name)
```

**基本写法：提取指定栈**
`traceback.extract_tb(<tb>)`
```python
# 从 traceback 对象提取帧
try:
    1 / 0
except ZeroDivisionError as e:
    frames = traceback.extract_tb(e.__traceback__)
    for f in frames:
        print(f.filename, f.lineno, f.name, f.line)
```

**基本写法：StackSummary 对象**
`traceback.StackSummary.extract(<帧>)`
```python
# 3.5+ StackSummary 对象
summary = traceback.StackSummary.extract(traceback.walk_stack(None))
print(summary.format())
```

**基本写法：format_list 格式化帧**
`traceback.format_list(<帧列表>)`
```python
# 格式化帧列表
frames = traceback.extract_stack()
print("".join(traceback.format_list(frames)))
```

---

## traceback 装饰器

**基本写法：异常装饰器**
`def <装饰器>(func):\n    @functools.wraps(func)\n    def wrapper(*a, **k):`
```python
# 捕获异常并记录完整 traceback
import functools
import traceback
import logging

def log_exceptions(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception:
            logging.error(traceback.format_exc())
            raise
    return wrapper
```

---

## warnings 警告控制

**基本写法：发出警告**
`warnings.warn(<消息>, <警告类>)`
```python
# 发出警告
import warnings

def deprecated_func():
    warnings.warn("该函数已弃用", DeprecationWarning)
    return "old"
```

**基本写法：警告类别**
`UserWarning` | `DeprecationWarning` | `RuntimeWarning`
```python
# 常用警告类别
warnings.warn("用户警告", UserWarning)
warnings.warn("弃用警告", DeprecationWarning)
warnings.warn("运行时警告", RuntimeWarning)
warnings.warn("资源警告", ResourceWarning)
```

**基本写法：过滤警告**
`warnings.filterwarnings(<动作>, <消息正则>, <类别>)`
```python
# 过滤警告
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("error", category=UserWarning)
```

**基本写法：simplefilter 简化过滤**
`warnings.simplefilter(<动作>, <类别>)`
```python
# 简化过滤
warnings.simplefilter("ignore")
warnings.simplefilter("always", UserWarning)
```

**基本写法：动作选项**
`"error"` | `"ignore"` | `"always"` | `"default"` | `"module"` | `"once"`
```python
# 警告动作
warnings.simplefilter("error")   # 警告转异常
warnings.simplefilter("ignore")  # 忽略
warnings.simplefilter("always")  # 总是显示
```

---

## warnings 上下文管理

**基本写法：catch_warnings 临时过滤**
`with warnings.catch_warnings():`
```python
# 临时修改警告过滤
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    deprecated_func()
```

**基本写法：捕获警告记录**
`with warnings.catch_warnings(record=True) as w:`
```python
# 捕获警告到列表
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    deprecated_func()
    for warning in w:
        print(warning.category.__name__, warning.message)
```

**基本写法：指定模块过滤**
`warnings.filterwarnings(<动作>, module=<模块正则>)`
```python
# 仅对特定模块过滤
warnings.filterwarnings("ignore", module="legacy_lib.*")
```

---

## warnings 子类化

**基本写法：自定义警告类**
`class <警告类>(Warning):`
```python
# 自定义警告类别
class ConfigWarning(UserWarning):
    pass

warnings.warn("配置问题", ConfigWarning)
```

**基本写法：deprecated 装饰器（3.13+）**
`@warnings.deprecated(<消息>)`
```python
# Python 3.13 内置弃用装饰器
@warnings.deprecated("使用 new_func 替代")
def old_func():
    pass
```

---

## 命令行控制警告

**基本写法：命令行参数**
`python -W <动作>:<消息>:<类别>:<模块>:<行号>`
```python
# 命令行控制警告
# python -W ignore::DeprecationWarning main.py
# python -W error::UserWarning main.py
```

**基本写法：环境变量**
`PYTHONWARNINGS=<过滤>`
```python
# 通过环境变量设置
# set PYTHONWARNINGS=ignore::DeprecationWarning
```

---

## sys 异常信息

**基本写法：sys.exc_info**
`sys.exc_info()`
```python
# 获取当前异常信息三元组
import sys

try:
    1 / 0
except ZeroDivisionError:
    exc_type, exc, tb = sys.exc_info()
    print(exc_type, exc)
```

**基本写法：异常链**
`raise <异常> from <原异常>`
```python
# 异常链
try:
    int("abc")
except ValueError as e:
    raise RuntimeError("处理失败") from e
```

**基本写法：suppress 上下文**
`raise <异常> from None`
```python
# 抑制异常上下文
raise RuntimeError("独立错误") from None
```

**基本写法：__cause__ 与 __context__**
`exc.__cause__` | `exc.__context__`
```python
# 访问异常链
try:
    try:
        1 / 0
    except ZeroDivisionError as e:
        raise RuntimeError("wrap") from e
except RuntimeError as e:
    print(e.__cause__)
```
