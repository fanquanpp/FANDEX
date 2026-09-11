---
order: 220
title: Python datetime 与 time
module: 'python'
category: 后端技术
difficulty: beginner
description: Python datetime 与 time 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## datetime 基本创建

**基本写法：创建日期**
`datetime.date(<年>, <月>, <日>)`
```python
# 创建日期对象
from datetime import date
d = date(2024, 7, 31)
print(d)  # 2024-07-31
```

**基本写法：创建时间**
`datetime.time(<时>, <分>, [秒], [微秒])`
```python
# 创建时间对象
from datetime import time
t = time(14, 30, 0)
print(t)  # 14:30:00
```

**基本写法：创建日期时间**
`datetime.datetime(<年>, <月>, <日>, <时>, <分>, <秒>)`
```python
# 创建日期时间对象
from datetime import datetime
dt = datetime(2024, 7, 31, 14, 30, 0)
```

**基本写法：获取当前日期时间**
`datetime.now()`
```python
# 获取本地当前日期时间
now = datetime.now()
```

**基本写法：获取当前日期**
`date.today()`
```python
# 获取当前日期
today = date.today()
```

**基本写法：获取 UTC 当前时间**
`datetime.now(tz=timezone.utc)`
```python
# 获取 UTC 时区当前时间
from datetime import timezone
utc_now = datetime.now(tz=timezone.utc)
```

---

## datetime 从字符串解析

**基本写法：解析日期时间字符串**
`datetime.strptime(<字符串>, <格式>)`
```python
# 按格式解析字符串
from datetime import datetime
dt = datetime.strptime("2024-07-31 14:30", "%Y-%m-%d %H:%M")
```

**基本写法：格式化输出**
`<日期>.strftime(<格式>)`
```python
# 格式化为字符串
now = datetime.now()
s = now.strftime("%Y年%m月%d日 %H:%M:%S")
```

**常用格式化代码**
`%Y %m %d %H %M %S`
```python
# 常用格式化占位符
# %Y 年(4位)  %m 月(01-12)  %d 日(01-31)
# %H 时(00-23)  %M 分(00-59)  %S 秒(00-59)
# %A 星期名  %B 月名  %j 年内天数
```

**基本写法：ISO 格式解析**
`datetime.fromisoformat(<字符串>)`
```python
# 解析 ISO 8601 格式字符串
from datetime import datetime
dt = datetime.fromisoformat("2024-07-31T14:30:00")
```

**基本写法：输出 ISO 格式**
`<日期>.isoformat()`
```python
# 输出 ISO 8601 格式字符串
now = datetime.now()
print(now.isoformat())  # 2024-07-31T14:30:00
```

---

## timedelta 时间差

**基本写法：创建时间差**
`datetime.timedelta([days], [seconds], [microseconds])`
```python
# 创建时间间隔
from datetime import timedelta, date
delta = timedelta(days=7)
```

**基本写法：日期加减**
`<日期> + <时间差>`
```python
# 日期加减时间差
from datetime import date, timedelta
today = date.today()
next_week = today + timedelta(days=7)
```

**基本写法：两个日期相减**
`<日期1> - <日期2>`
```python
# 计算日期差
from datetime import date
d1 = date(2024, 12, 31)
d2 = date(2024, 1, 1)
diff = d1 - d2
print(diff.days)  # 365
```

**基本写法：时间差属性**
`<时间差>.days / .seconds / .total_seconds()`
```python
# 访问时间差的各部分
delta = timedelta(days=1, hours=2)
print(delta.days)             # 1
print(delta.seconds)          # 7200
print(delta.total_seconds())  # 93600.0
```

---

## 时区处理

**基本写法：设置时区**
`datetime.now(tz=<时区>)`
```python
# 获取带时区的当前时间
from datetime import datetime, timezone
utc_now = datetime.now(tz=timezone.utc)
```

**基本写法：时区转换**
`<时间>.astimezone(<目标时区>)`
```python
# UTC 转本地时区
from datetime import datetime, timezone
utc_dt = datetime.now(tz=timezone.utc)
local_dt = utc_dt.astimezone()
```

**基本写法：Python 3.9+ zoneinfo 时区**
`ZoneInfo("<时区名>")`
```python
# Python 3.9+ 使用 IANA 时区数据库
from zoneinfo import ZoneInfo
from datetime import datetime
tz_shanghai = ZoneInfo("Asia/Shanghai")
dt = datetime(2024, 7, 31, 14, 0, tzinfo=tz_shanghai)
```

**基本写法：时区转换**
`<时间>.astimezone(ZoneInfo("<时区>"))`
```python
# 上海时间转纽约时间
from zoneinfo import ZoneInfo
shanghai_time = datetime.now(tz=ZoneInfo("Asia/Shanghai"))
ny_time = shanghai_time.astimezone(ZoneInfo("America/New_York"))
```

**基本写法：Python 3.12+ fromisoformat 解析时区**
`datetime.fromisoformat(<带时区字符串>)`
```python
# Python 3.11+ 支持解析带时区的 ISO 字符串
dt = datetime.fromisoformat("2024-07-31T14:30:00+08:00")
```

---

## time 模块

**基本写法：获取时间戳**
`time.time()`
```python
# 返回当前时间的 Unix 时间戳（秒）
import time
ts = time.time()
```

**基本写法：时间戳转结构化时间**
`time.localtime([<时间戳>])`
```python
# 转为本地时间 struct_time
t = time.localtime()
print(t.tm_year, t.tm_mon, t.tm_mday)
```

**基本写法：格式化时间**
`time.strftime(<格式>, <结构化时间>)`
```python
# 按格式输出字符串
import time
s = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
```

**基本写法：解析时间字符串**
`time.strptime(<字符串>, <格式>)`
```python
# 解析字符串为 struct_time
t = time.strptime("2024-07-31", "%Y-%m-%d")
```

**基本写法：程序休眠**
`time.sleep(<秒>)`
```python
# 阻塞当前线程指定秒数
time.sleep(1.5)
```

**基本写法：计时**
`time.perf_counter()`
```python
# 高精度计时器
start = time.perf_counter()
do_work()
elapsed = time.perf_counter() - start
```

**基本写法：单调时钟**
`time.monotonic()`
```python
# 不受系统时间调整影响的单调时钟
start = time.monotonic()
time.sleep(1)
print(time.monotonic() - start)
```

**基本写法：Python 3.11+ monotonic_ns**
`time.monotonic_ns()`
```python
# 纳秒精度单调时钟
ns = time.monotonic_ns()
```

---

## time 性能计时

**基本写法：测量代码执行时间**
`time.perf_counter()`
```python
# 使用 perf_counter 测量耗时
import time
start = time.perf_counter()
result = sum(range(10**6))
elapsed = time.perf_counter() - start
print(f"耗时: {elapsed:.4f} 秒")
```

**基本写法：纳秒精度时间戳**
`time.time_ns()`
```python
# 返回纳秒精度时间戳
ns = time.time_ns()
```

**基本写法：process_time 进程时间**
`time.process_time()`
```python
# 返回进程实际 CPU 时间（不含休眠）
start = time.process_time()
do_work()
cpu_time = time.process_time() - start
```

---

## calendar 日历

**基本写法：获取月历**
`calendar.month(<年>, <月>)`
```python
# 输出文本格式月历
import calendar
print(calendar.month(2024, 7))
```

**基本写法：判断闰年**
`calendar.isleap(<年>)`
```python
# 判断是否为闰年
import calendar
print(calendar.isleap(2024))  # True
```

**基本写法：获取某月天数**
`calendar.monthrange(<年>, <月>)`
```python
# 返回 (该月首日星期几, 该月天数)
import calendar
print(calendar.monthrange(2024, 2))  # (3, 29)
```
