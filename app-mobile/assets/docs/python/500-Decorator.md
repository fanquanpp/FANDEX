---
order: 440
title: 装饰器：给函数穿外套
module: 'python'
category: 后端技术
difficulty: intermediate
description: 从十个接口函数复制十遍耗时统计讲起：函数是对象、@ 语法糖三步演进、functools.wraps 保住元信息、带参数装饰器初见，附计时/重试/权限三个最小件与 wrapper 名字污染调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'python/510-DecoratorAdvanced'
  - 'python/110-ArgsKwargsUnpacking'
  - 'python/460-OOP'
prerequisites:
  - 'python/100-FunctionDetailed'
  - 'python/130-ExceptionHandling'
---

## 前置知识

- 已完成 [函数详解](/python/100-FunctionDetailed)：知道函数是对象、参数进返回值出——100 篇说过「函数能当参数传」，本文把这句话真正用起来；
- 已完成 [异常处理](/python/130-ExceptionHandling)：会写 try/except、会 raise，第 4、5 节的重试与权限装饰器靠它上岗。

代码里会成对出现 `*args, **kwargs`，完整规则在 [110 篇](/python/110-ArgsKwargsUnpacking)。本文只用「收下一切调用参数并原样转发」这一个固定搭配，照抄即可。

## 学习目标

读完本文你将能够：

1. 把 `@装饰器` 还原成一行普通赋值 `func = decorator(func)`，说清两者完全等价；
2. 从零手写一个不修改原函数代码的计时装饰器，装饰任意签名的函数；
3. 用 `functools.wraps` 保住原函数的 `__name__` 与 `__doc__`，说出不加它的真实代价；
4. 读懂带参数装饰器的三层嵌套，形成「每层各吃一类东西」的直觉；
5. 见到「所有函数名都变成 wrapper」的日志时，三步定位到装饰器本身。

预计 60 分钟，含 1 组动手实验与 3 道练习，产出计时、重试、权限三个可复用的最小装饰器。

## 1. 你现在要解决什么问题

十个接口函数，领导要求每个都统计耗时：

```python
import time

def api_login():
    start = time.perf_counter()
    time.sleep(0.5)                 # 模拟网络请求
    cost = time.perf_counter() - start
    print(f"api_login 耗时 {cost:.2f} 秒")
    return "登录成功"

# api_order、api_pay……一共十个，每个都要塞这四行
```

四行统计代码复制十遍是四十行；明天要「秒改毫秒」，又得十处逐一改，漏一处排查半天。100 篇的规矩是「逻辑出现第三次必须封装」——但这段重复代码包着的是每个函数自己的身体，普通函数装不下「包裹一个函数」这件事。装饰器就是为它而生。

## 2. 三步演进：手写最小装饰器

### 步骤一：普通包装——函数传进去，包装版还回来

REPL 先验证地基（先预测再回车）：

```python
>>> def greet():
...     return "你好"
...
>>> hi = greet          # 没有括号：把函数本身赋给新名字
>>> hi()
'你好'
```
090 篇的绑定规则对函数同样成立。最直接的想法是把函数传进统计函数：`with_timing(api_login)` 在函数内部调用它并计时——统计代码确实只剩一份，但十个调用点全要改成这个形态。换思路：写一个 timed，**不调用函数，而是返回一个自带统计的新函数**，再把旧名字重新绑到它身上：

```python
import time

def timed(func):
    def wrapper():
        start = time.perf_counter()
        result = func()                 # wrapper 里留着 func 的引用
        cost = time.perf_counter() - start
        print(f"{func.__name__} 耗时 {cost:.2f} 秒")
        return result
    return wrapper                      # 把包装版交出去

def api_login():
    time.sleep(0.5)
    return "登录成功"

api_login = timed(api_login)            # 名字重新绑定到包装版

print(api_login())
```

预期输出：

```text
api_login 耗时 0.50 秒
登录成功
```

调用点一行没改。090 篇说过 `=` 只是换绑定：名字 `api_login` 现在贴在 wrapper 上，原函数被 wrapper 揣在怀里。剩下十个函数要写十行 `api_xxx = timed(api_xxx)`——还嫌烦。

### 步骤二：@ 语法糖

把那行重新绑定挪到 def 头上，就是 @：

```python
@timed
def api_login():
    time.sleep(0.5)
    return "登录成功"
```

`@timed` 与 `api_login = timed(api_login)` 完全等价，一个字不多一个字不少。所以装饰器没有任何魔法：它是**接收一个函数、返回一个新函数**的普通函数。这句等价展开是装饰器的全部本质，任何困惑都先写回这一行。

两个工程补丁。补丁一，任意签名：`api_login` 没参数，`settle(name, threshold=85)` 有参数，wrapper 写死空括号就废了。把 wrapper 的签名固定搭配成收发两用：

```python
def wrapper(*args, **kwargs):          # 收下一切调用参数
    result = func(*args, **kwargs)     # 原样转发
```

补丁二是保住元信息——先看一桩事故。另外注意执行时机：在 timed 函数体（wrapper 之外）加一行 `print(f"包住 {func.__name__}")`，运行整个文件会发现它在**所有业务输出之前**出现——@ 语句在 def 执行时就调用了 timed 并完成换绑，不是等到调用那一刻。

## 3. 调试实录：函数名集体变成 wrapper

排行榜函数库加了装饰器后，同事跑测试打印函数名：

```python
print(settle.__name__)    # 以为输出 settle，实际输出 wrapper
print(settle.__doc__)     # 以为输出 docstring，实际输出 None
```

原因就是步骤二的等价展开：`settle = timed(settle)` 之后，名字 settle 贴在 wrapper 上，`__name__`、`__doc__` 自然是 wrapper 自己的——绑定规则没有例外。后果不止难看：日志与监控常按 `__name__` 聚合，十个被装饰函数在报表里全叫 wrapper；`help()` 读不到文档，签名检查也只剩 `(*args, **kwargs)`。

修复只需一行，`functools.wraps` 把原函数的元信息复制到 wrapper 头上：

```python
from functools import wraps

def timed(func):
    @wraps(func)                      # 就差这一行
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@timed
def settle(name, threshold=85):
    """结算一名玩家"""
    return f"{name}: 平均 85.7"

print(settle.__name__, "|", settle.__doc__)
```

预期输出：

```text
settle | 结算一名玩家
```

纪律：**写装饰器永远加 `@wraps(func)`**。想拿回最初那个函数，wraps 顺手设置了 `__wrapped__` 属性。

## 4. 带参数的装饰器初见：三层嵌套

重试次数不该写死在装饰器里，得让使用方传——`@retry(times=3)` 比 `@retry` 多了个括号，多出来的就是「装饰器工厂」这一层。用一个永远失败的网络请求，顺便看「最后一次也失败」的行为：

```python
from functools import wraps

def retry(times):                        # 第一层：吃装饰器参数
    def decorator(func):                 # 第二层：吃被装饰函数
        @wraps(func)
        def wrapper(*args, **kwargs):    # 第三层：吃调用参数
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except ConnectionError:
                    if attempt == times - 1:
                        raise            # 最后一次也失败：原样抛出
                    print(f"第 {attempt + 1} 次失败，自动重试")
        return wrapper
    return decorator

@retry(times=3)
def fetch_data():
    raise ConnectionError("网络超时")     # 永远失败

try:
    fetch_data()
except ConnectionError:
    print("重试 3 次后放弃，原样抛出")
```

预期输出：

```text
第 1 次失败，自动重试
第 2 次失败，自动重试
重试 3 次后放弃，原样抛出
```

现场感：`@retry(times=3)` 的等价展开是 `fetch_data = retry(times=3)(fetch_data)`——先调用 `retry(times=3)` 拿到真正的装饰器 decorator，再用它装饰函数。三层各吃一类东西：**最外层吃配置，中间层吃函数，最内层吃调用参数**。为什么必须三层、带不带括号的边界在哪，[装饰器深水区](/python/510-DecoratorAdvanced) 逐层拆给你看。

## 5. 实际场景：权限检查

```python
from functools import wraps

def require_login(func):
    @wraps(func)
    def wrapper(user, *args, **kwargs):
        if not user["logged_in"]:
            raise PermissionError("请先登录")     # 130 篇的异常上岗
        return func(user, *args, **kwargs)
    return wrapper

@require_login
def delete_save(user, slot):
    return f"已删除 {user['name']} 的存档 {slot}"

admin = {"name": "小明", "logged_in": True}
guest = {"name": "游客", "logged_in": False}

print(delete_save(admin, 3))
try:
    delete_save(guest, 3)
except PermissionError as e:
    print(f"拦截: {e}")
```

预期输出：

```text
已删除 小明 的存档 3
拦截: 请先登录
```

`delete_save` 的函数体没有一个字提到登录——检查逻辑住在 wrapper 里，想给另外二十个函数加上，每个头上加一行即可。计时、重试、权限这类「与业务无关、又处处要用」的逻辑叫横切关注点，装饰器是它们的标准住址。至此三个最小件备齐：计时（第 2 节）、重试（第 4 节）、权限（本节）。

## 6. 修改实验

基于以上代码，每个先预测再运行：

1. 把第 2 节说的 `print(f"包住 {func.__name__}")` 真的加进 timed 函数体——它在所有业务输出之前出现几次？被装饰几个函数就出现几次；
2. 给 wrapper 加前置日志 `print(f"调用 {func.__name__}")`，装饰一个带默认参数的函数并只传位置实参，确认转发后默认值依然生效；
3. 把 `@retry(times=3)` 改成 `@retry(times=1)`，fetch_data 还能成功吗？对照 `range(times)` 与「最后一次失败就 raise」想清楚再运行。

## 7. 常见错误与调试实录

实录一：装饰器忘了 `return wrapper`。

```python
# deco.py
def timed(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    # 忘了把 wrapper 交出去

@timed
def hello():
    return "hi"

hello()
```

报错（Python 3.12 实录）：

```text
Traceback (most recent call last):
  File "deco.py", line 11, in <module>
    hello()
    ~~~~~^^
TypeError: 'NoneType' object is not callable
```

读报错三步：崩溃在 `hello()` 调用行；`'NoneType' object is not callable` 说明 hello 的值是 None；问题上移到 @timed——`timed(hello)` 返回了 None，因为函数体没有 return。def 时不报错、调用时才崩，这正是它难查的原因。它的近亲是 wrapper 里忘了 `return result`：不报错，但原函数的返回值悄悄变成 None，排查思路相同。

实录二：给不带参数的装饰器误加了括号——`@timed()` 是先调用 `timed()`，没给 func 参数，当场崩：

```text
TypeError: timed() missing 1 required positional argument: 'func'
```

@ 后面必须跟「能接收函数的东西」：裸装饰器直接给名字，带参数的装饰器给工厂调用。分界线在 510 篇讲透。

## 8. 小练习

预测题（5 分钟，先写全部输出与顺序，再运行对照）：

```python
def loud(func):
    print("定义时就响")
    def wrapper():
        return func().upper()
    return wrapper

@loud
def greet():
    return "hi"

print(greet())
```

参考答案（先算再看）：先输出 `定义时就响`，再输出 `HI`。@ 在 def 时执行 loud 一次，print(greet()) 时跑的只有 wrapper。

修改题（10 分钟）：把第 5 节的 require_login 升级为带参数的 `require_role(role)`：user["role"] 与传入角色不符时抛 `PermissionError(f"需要 {role} 权限")`。验收：`@require_role("admin")` 装饰 delete_save 后，admin 调用输出 `已删除 小明 的存档 3`，guest 调用输出 `拦截: 需要 admin 权限`。这是你第一次实弹三层结构。

挑战题（半小时，不给代码）：写装饰器 `log_calls`，调用前打印 `调用 <函数名>，参数: <args元组>`，调用后打印 `返回: <返回值>`，并保住原函数元信息。验收：

```python
@log_calls
def add(a, b):
    return a + b

assert add(2, 3) == 5
assert add.__name__ == "add"
```

运行时应输出：

```text
调用 add，参数: (2, 3)
返回: 5
```

提示：参数转发用 `*args, **kwargs`；展开：f-string 打印 args 时自动呈现元组形态 `(2, 3)`，不用手动拼括号。

## 9. 什么时候该用 / 不该用装饰器

该用：同一段逻辑要套在多个函数外面，且业务函数不该知道它的存在；改动方式是「包裹」而非「修改」函数本体。不该用：逻辑只服务一个函数——直接写在函数里更直白；需要改变函数签名或返回值结构——装饰器对调用方透明，透明也意味着难追踪，叠加超过两三层就该警惕。真实库里它们无处不在：FastAPI 的 `@app.get`、pytest 的 fixture、@dataclass，学完 510 篇你都能读懂机制。

## 10. 与之前和之后的知识的关系

- 往前：100 篇「函数是对象」在本文第一次当主角；090 篇的名字换绑定是 @ 的全部本质；130 篇的 try/except 支撑重试与权限；
- 往后：[装饰器深水区](/python/510-DecoratorAdvanced) 拆三层机制、类装饰器、叠加顺序与标准库装饰器；[110 篇](/python/110-ArgsKwargsUnpacking) 把 `*args`、`**kwargs` 讲透；[面向对象](/python/460-OOP) 的 `__call__` 是类装饰器的地基。

## 官方文档

- functools（wraps 的权威参考）：https://docs.python.org/zh-cn/3/library/functools.html
- PEP 318（装饰器语法的来源）：https://peps.python.org/pep-0318/

## 自我检查

- 能把 `@timed` 写回等价赋值语句，说清 wrapper 里必须有 func 调用与 result 返回；
- 能默写三层结构中「吃配置的层、吃函数的层、吃调用参数的层」各自的位置，并说出 @wraps 防的是什么；
- 拿到 `'NoneType' object is not callable` 能想到「装饰器忘了 return」这条路径。

## 本章总结

装饰器是「接收函数、返回新函数」的普通函数，@ 只是把 `func = decorator(func)` 挪到 def 头上，发生在定义时。wrapper 用 `*args, **kwargs` 原样转发调用参数并代交返回值；`@wraps(func)` 用一行保住 `__name__`、`__doc__` 与签名。带参数的装饰器多一层吃配置的工厂：`@retry(times=3)` 等价于 `retry(times=3)(fetch_data)`。计时、重试、权限三个最小件已进工具箱——机制层面的几笔账，下一篇算清。

## 下一步

进入 [装饰器深水区](/python/510-DecoratorAdvanced)：三层嵌套逐层追踪、叠加顺序推演、类装饰器与标准库三件套——500 篇建好的模型，在那里上强度。
