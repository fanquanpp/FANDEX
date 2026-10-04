---
order: 430
title: "描述符深水区：__set_name__、__delete__ 与完整查找顺序"
module: 'python'
category: 后端技术
difficulty: advanced
description: "拆开 570 立起的黑盒：__set_name__ 的类创建时机、__delete__ 与删除拦截、四层查找顺序（数据描述符 > 实例字典 > 非数据描述符 > 类属性）逐级实验、方法绑定的真相、cached_property 复刻与微型 ORM 字段施工，附 NoneType 与实例串扰调试实录。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/570-Descriptor'
  - 'python/500-Decorator'
  - 'python/560-DataClassFieldDefault'
  - 'python/590-Metaclass'
prerequisites:
  - 'python/570-Descriptor'
---

## 前置知识

- 已完成 [描述符：@property 背后是什么](/python/570-Descriptor)：亲手写过只有 `__get__`/`__set__` 的最小描述符，验证过「数据描述符赢过实例字典」；
- 记得 570 篇的三条术语：描述符协议、数据描述符、私有存储名。

> 分工说明：570 立模型，本篇拆机制——`__set_name__` 的调用时机、`__delete__`、四层查找顺序的逐级验证、`cached_property` 复刻与 ORM 字段施工法。570 篇的 `CelsiusField` 与 `property` 对照示例在这里不再出现，两篇示例互不重复。读单个属性时「会拦截的类属性」这个模型够用；读完本篇，你应当能徒手造出框架级零件。

## 学习目标

读完本文你将能够：

1. 说出 `__set_name__` 在类创建时被谁、按什么顺序调用，并用它消灭手写私有存储名；
2. 实现 `__delete__` 拦截 `del` 操作，并解释为什么它和 `__set__` 同属「数据描述符」判据；
3. 逐级验证完整查找顺序：数据描述符 > 实例字典 > 非数据描述符 > 类属性，并说出赋值与删除各自的规则；
4. 解释方法绑定的真相：函数是非数据描述符，`obj.method()` 是描述符协议在打工；
5. 复刻 `functools.cached_property` 的核心机制，并写出一个带字段登记的微型 ORM 字段。

预计 60 到 75 分钟，含 4 组实验与 2 道练习。

## 1. 问题引入：手写存储名的报应

570 篇的 `CelsiusField` 里有个「先混个眼熟」的 `__set_name__`。先看没有它的世界：描述符不知道自己叫什么，只能靠人肉传名。

```python
class Field:
    def __init__(self, storage_name):
        self.storage_name = storage_name     # 每个字段都要手写一遍

class Player:
    hp = Field("_hp")
    hpp = Field("_hp")                       # 手滑：本想写 _mp，复制粘贴惹祸
```

`hpp` 和 `hp` 存进同一个 `_hp` 键，两个「不同」字段从此共享一份值——这类 bug 没有报错，只有诡异。Python 3.6 的答案是 `__set_name__`：类创建时解释器主动告诉每个描述符「你叫什么」，人肉传名的出错环节直接消失。

## 2. __set_name__：类创建时的点名

```python
class Field:
    def __set_name__(self, owner, name):
        print(f"__set_name__ 触发: owner={owner.__name__}, name={name}")
        self.name = name
        self.private_name = "_" + name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name)

    def __set__(self, obj, value):
        setattr(obj, self.private_name, value)

print("开始定义类")
class Player:
    hp = Field()
    mp = Field()
print("类定义结束")

p = Player()
p.hp = 100
p.mp = 50
print(p.hp, p.mp)
print(p.__dict__)
```

预期输出：

```text
开始定义类
__set_name__ 触发: owner=Player, name=hp
__set_name__ 触发: owner=Player, name=mp
类定义结束
100 50
{'_hp': 100, '_mp': 50}
```

两个关键事实：调用发生在**类定义语句执行时**（两个「类定义结束」之间没有任何实例），按类体里属性的定义顺序逐个点名；`owner` 是宿主类本身。描述符也可以在这里「注册」——顺手把字段记进类级别的表，第 7 节会用到。

## 3. __delete__：读、写之外的第三个动作

属性操作有三个：读、写、删。`del obj.x` 也会走拦截，前提是描述符实现了 `__delete__`：

```python
class Field:
    def __set_name__(self, owner, name):
        self.name = name
        self.private_name = "_" + name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name, None)

    def __set__(self, obj, value):
        setattr(obj, self.private_name, value)

    def __delete__(self, obj):
        print(f"__delete__ 拦截了对 {self.name} 的 del")
        if not hasattr(obj, self.private_name):
            raise AttributeError(f"{self.name} 还没有值，不能删")
        delattr(obj, self.private_name)

class Session:
    token = Field()

s = Session()
s.token = "abc123"
print(s.token)
del s.token
print(s.token)
try:
    del s.token
except AttributeError as e:
    print("拦截:", e)
```

预期输出：

```text
abc123
__delete__ 拦截了对 token 的 del
None
__delete__ 拦截了对 token 的 del
拦截: token 还没有值，不能删
```

这也补全了 570 篇留下的判据：**只要实现了 `__set__` 或 `__delete__` 之一，就是数据描述符**——两者都代表「写路径被接管」，读路径才有被保护的价值。

## 4. 核心实验：四层查找顺序逐级验证

570 篇验证了前两层。现在用一段可运行的代码把完整链条钉死：

```python
class DataDesc:
    def __get__(self, obj, objtype=None):
        return "第 1 层：数据描述符"
    def __set__(self, obj, value):
        print("数据描述符拦截了赋值")

class NonDataDesc:
    def __get__(self, obj, objtype=None):
        return "第 3 层：非数据描述符"

class C:
    x = DataDesc()
    y = NonDataDesc()
    z = "第 4 层：普通类属性"

c = C()

c.__dict__["x"] = "实例字典"
print(c.x)              # 数据描述符赢过实例字典

c.__dict__["y"] = "实例字典"
print(c.y)              # 实例字典赢过非数据描述符

del c.__dict__["y"]
print(c.y)              # 遮蔽移除后非数据描述符回归
print(c.z)              # 普通类属性兜底

c.x = 1                 # 赋值只问数据描述符
print(c.__dict__)
```

预期输出：

```text
第 1 层：数据描述符
实例字典
第 3 层：非数据描述符
第 4 层：普通类属性
数据描述符拦截了赋值
{'x': '实例字典'}
```

三条规则合体：

- **读**：数据描述符 > 实例字典 > 非数据描述符 > 类属性；
- **写**：只检查数据描述符，命中即交给 `__set__`，根本不看实例字典（最后两行输出：`c.x = 1` 被拦截，`__dict__` 里的旧值原封不动）；
- **删**：同样只问带 `__delete__` 的数据描述符。

## 5. 方法绑定的真相：函数是非数据描述符

570 篇埋过一句话：「普通函数是非数据描述符，`obj.method()` 才会自动绑定 `obj`」。现在兑现。`def` 写在类体里产生的是 function 对象，它带 `__get__`：

```python
class Dog:
    def __init__(self, name):
        self.name = name
    def bark(self):
        return f"{self.name} 汪汪"

d = Dog("阿黄")
bound = Dog.__dict__["bark"].__get__(d, Dog)   # 手动走一遍描述符协议
print(bound())
print(d.bark())
print(type(Dog.__dict__["bark"]).__name__)
```

预期输出：

```text
阿黄 汪汪
阿黄 汪汪
function
```

`d.bark()` 的全部机关：解释器在类上找到 `bark` 这个 function，它是非数据描述符，于是调用 `bark.__get__(d, Dog)` 得到绑定了 `d` 的方法，再调用它。`self` 不是语法魔法，是描述符协议递进去的第一个参数。顺带回答一个老问题：为什么实例属性可以覆盖方法？因为实例字典赢过非数据描述符——正是这套优先级的安排。

## 6. 复刻 functools.cached_property

非数据描述符「输给实例字典」这个「缺点」，换个方向就是缓存利器：首次访问算出结果塞进实例字典，之后实例字典抢先命中，`__get__` 再也不会被调用。

```python
class CachedProperty:
    """复刻 functools.cached_property 的核心思路"""

    def __init__(self, func):
        self.func = func
        self.name = func.__name__

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = self.func(obj)
        obj.__dict__[self.name] = value      # 写进实例字典
        return value

class Leaderboard:
    def __init__(self, scores):
        self.scores = scores

    @CachedProperty
    def top10(self):
        print("  [计算] 排序 + 截取前 10")
        return sorted(self.scores, reverse=True)[:10]

board = Leaderboard([88, 95, 70, 99, 60])
print("第一次访问：")
print(board.top10)
print("第二次访问：")
print(board.top10)
print("实例字典:", board.__dict__)
```

预期输出：

```text
第一次访问：
  [计算] 排序 + 截取前 10
[99, 95, 88, 70, 60]
第二次访问：
[99, 95, 88, 70, 60]
实例字典: {'scores': [88, 95, 70, 99, 60], 'top10': [99, 95, 88, 70, 60]}
```

第二次访问没有打印「[计算]」——缓存命中时连 `__get__` 都不进。标准库的 [functools.cached_property](https://docs.python.org/zh-cn/3/library/functools.html#functools.cached_property) 就是这个思路加工程细节（锁、占位检测）；它还支持 `del board.top10` 清缓存强制重算，因为删除只是移走实例字典里的键，描述符毫发无损。

## 7. 真实用法：微型 ORM 字段

把本篇零件组装起来——`__set_name__` 自动登记字段，`__set__` 做校验，子类覆写 `validate` 扩展规则。Django Model、SQLAlchemy、Pydantic 的字段层就是这条路的工程化：

```python
class Field:
    def __init__(self, nullable=True):
        self.nullable = nullable

    def __set_name__(self, owner, name):
        self.name = name
        self.private_name = "_" + name
        if not hasattr(owner, "fields"):
            owner.fields = {}
        owner.fields[name] = self            # 自动登记字段表

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name, None)

    def __set__(self, obj, value):
        self.validate(value)
        setattr(obj, self.private_name, value)

    def validate(self, value):
        if value is None and not self.nullable:
            raise ValueError(f"字段 {self.name} 不允许为 None")

class CharField(Field):
    def __init__(self, max_length, nullable=True):
        super().__init__(nullable)
        self.max_length = max_length

    def validate(self, value):
        super().validate(value)
        if value is not None:
            if not isinstance(value, str):
                raise TypeError(f"{self.name} 需要 str，收到 {type(value).__name__}")
            if len(value) > self.max_length:
                raise ValueError(f"{self.name} 长度超过 {self.max_length}")

class IntegerField(Field):
    def validate(self, value):
        super().validate(value)
        if value is not None and not isinstance(value, int):
            raise TypeError(f"{self.name} 需要 int，收到 {type(value).__name__}")

class User:
    name = CharField(max_length=20, nullable=False)
    age = IntegerField()

u = User()
u.name = "小明"
u.age = 18
print(u.name, u.age, "| 字段表:", list(User.fields))
try:
    u.age = "十八"
except TypeError as e:
    print("拦截:", e)
try:
    u.name = None
except ValueError as e:
    print("拦截:", e)
```

预期输出：

```text
小明 18 | 字段表: ['name', 'age']
拦截: age 需要 int，收到 str
拦截: 字段 name 不允许为 None
```

注意 `User.fields` 这张表没有一行注册代码——`__set_name__` 在类创建时自动建好。有了字段表，`to_dict`、建表语句、API 文档都只是遍历它的事。

## 8. 常见错误与调试实录

错误一：`__get__` 忘了处理 `obj is None`。通过类访问（`Player.hp`）时 `obj` 是 `None`，直接用就会炸：

```text
Traceback (most recent call last):
  File "exp_none.py", line 10, in <module>
    print(Player.hp)
  File "exp_none.py", line 3, in __get__
    return obj.private_name
AttributeError: 'NoneType' object has no attribute 'private_name'
```

读报错三步：`'NoneType' object has no attribute` 说明对一个 `None` 取了属性；往上定位到 `__get__` 里的 `obj.private_name`；原因是通过类访问时 `obj` 为 `None`。规矩：`__get__` 第一行永远是 `if obj is None: return self`——类访问返回描述符自身，也是 REPL 里检查字段配置的入口。

错误二：把值存在描述符自己身上。描述符是类属性，全实例共享一个对象：

```python
class SharedField:
    def __get__(self, obj, objtype=None):
        return self.value
    def __set__(self, obj, value):
        self.value = value        # 错：存在描述符自己身上

class User:
    name = SharedField()

u1 = User()
u2 = User()
u1.name = "小明"
print(u2.name)                    # 谁也没给 u2 赋过值
```

实测输出：

```text
小明
```

没有报错，但 u2 被 u1 的数据污染。570 篇的私有存储名方案就是解药；实例不可哈希（如某些 `__slots__` 类）时改用 `weakref.WeakKeyDictionary`，见 [弱引用](/python/620-WeakReference)。

## 9. 小练习

预测题（预计 10 分钟；不运行，先写答案）：第 4 节实验的 `C` 类保持不变，只加一行 `c.__dict__["z"] = "实例字典"` 后执行 `print(c.z)`，输出什么？再执行 `del c.z` 会发生什么？（答案：输出 `实例字典`——普通类属性没有拦截权，实例字典想盖就盖；`del c.z` 抛 `AttributeError: z`——实例字典里没有 `z` 这个键，类属性删除要走 `del C.z`。）

挑战题（预计半小时；不给实现代码）：把第 6 节的 `CachedProperty` 升级成可失效版本 `ClearableCachedProperty`：实现 `__delete__`，使 `del board.top10` 清除缓存、下次访问重新计算。用下面的断言自测：

```python
board = Leaderboard([88, 95, 70, 99, 60])
first = board.top10
board.scores = [1, 2, 3]
del board.top10
assert board.top10 == [3, 2, 1]

fresh = Leaderboard([1])
try:
    del fresh.top10          # 从未访问过：抛 AttributeError 或安静跳过都算对
except (AttributeError, KeyError):
    pass
```

提示：`__delete__` 里用 `obj.__dict__.pop(self.name, None)`；想清楚升级后它算数据描述符还是非数据描述符——这个身份变化会不会让第二次访问也走 `__get__`？

## 10. 与之前和之后的知识的关系

- 往前：本篇全部立在 [描述符：@property 背后是什么](/python/570-Descriptor) 的模型上——协议三方法、数据与非数据之分、私有存储名在那篇立起；`property` 的 `setter`/`deleter` 与本篇的 `__set__`/`__delete__` 一一对应；
- 往后：`__set_name__` 能被自动调用，是因为类创建由 `type.__new__` 驱动，这条线的全景在 [元类](/python/590-Metaclass)；[数据类与 Pydantic](/python/560-DataClassFieldDefault) 展示了「不想手写描述符时」的现代替代；[装饰器进阶](/python/500-Decorator) 里 `functools.wraps` 与本篇 `CachedProperty.__name__` 的处理是同一个话题；
- 更远：第 7 节的字段表走向数据库，就是 [SQLAlchemy](/python/830-PythonSQLAlchemy) 模型定义的雏形。

## 11. 官方文档

- 描述符指南（官方 HowTo，本篇机制的唯一权威出处）：https://docs.python.org/zh-cn/3/howto/descriptor.html
- 数据模型之「实现描述符」：https://docs.python.org/zh-cn/3/reference/datamodel.html#invoking-descriptors
- `functools.cached_property`：https://docs.python.org/zh-cn/3/library/functools.html#functools.cached_property
- PEP 487（`__set_name__` 的引入动机与规范）：https://peps.python.org/pep-0487/

## 12. 自我检查

- 能说出 `__set_name__` 的调用时机（类定义时、按定义顺序）并现场演示；
- 能不看资料写出带 `__delete__` 的描述符，并说出它与 `__set__` 同属数据描述符判据的原因；
- 能白板推导读、写、删三条路径各自的查找规则；
- 能徒手复刻 `cached_property` 并解释「为什么缓存命中时 `__get__` 都不会执行」；
- 看到 `'NoneType' object has no attribute` 定位到 `__get__` 缺 `obj is None` 分支。

## 本章总结

`__set_name__` 在类定义时点名，让描述符天生知道自己的名字与私有存储名，还能顺手登记字段表；`__delete__` 补上删除拦截，与 `__set__` 一起构成数据描述符的判据。完整查找顺序——读：数据描述符 > 实例字典 > 非数据描述符 > 类属性；写与删：只问数据描述符——四层各有用武之地：property 靠第一层守校验，方法绑定靠第三层递 `self`，`cached_property` 靠第二层做缓存。微型 ORM 字段则是三者的合体：一套协议，撑起整个框架的字段层。

## 下一步

带着「类创建时发生了什么」的新疑问，进入 [元类](/python/590-Metaclass)：`__set_name__` 的自动点名、字段表的自动登记，都只是它的一角。
