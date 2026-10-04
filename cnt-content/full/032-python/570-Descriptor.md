---
order: 420
title: "描述符：@property 背后是什么"
module: 'python'
category: 后端技术
difficulty: intermediate
description: "以「温度类 celsius 不得低于 -273.15」的校验场景引入：先用 @property 解决，再亲手拆开它——描述符协议最小实现、数据与非数据描述符的查找优先级实验、把 property 写成描述符的对照，附 RecursionError 与 no setter 调试实录。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/460-OOP'
  - 'python/100-FunctionDetailed'
  - 'python/500-Decorator'
  - 'python/580-PythonDescriptorProtocol'
  - 'python/560-DataClassFieldDefault'
prerequisites:
  - 'python/460-OOP'
  - 'python/100-FunctionDetailed'
---

## 前置知识

- 已完成 [面向对象](/python/460-OOP)：会写类与 `__init__`，知道 `self` 与类属性；
- 已完成 [函数详解](/python/100-FunctionDetailed)：知道函数可以赋给变量、当参数传。

没学透也能跟，用到的只有这两条。

> 分工说明：570、580 两篇合讲描述符。本篇是主教学，立模型：从「@property 背后是什么」出发，写出描述符协议最小实现，并用实验确定「数据描述符赢过实例字典」这条关键规则；[描述符深水区](/python/580-PythonDescriptorProtocol) 拆机制：`__set_name__`、`__delete__`、完整查找顺序逐级验证、`cached_property` 复刻与 ORM 字段施工法。两篇示例互不重复，本篇是后一篇的地基。

## 学习目标

读完本文你将能够：

1. 解释 `t.celsius = -300` 为什么会走进一个函数，说清「描述符站在类属性的位置上拦截访问」；
2. 亲手写出只有 `__get__` 与 `__set__` 的最小描述符，让一条校验规则复用到多个字段；
3. 预测数据描述符、实例字典、非数据描述符、类属性谁赢，并用实验验证；
4. 修复「在 `__set__` 里 `setattr` 自己」导致的 `RecursionError`；
5. 判断手头的校验需求该用 `@property` 还是自定义描述符。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

气象数据录入程序里，温度是核心字段，物理规则必须守住：摄氏度不能低于 -273.15（绝对零度）。第一版很直接，在构造时检查：

```python
class Temperature:
    def __init__(self, celsius):
        if celsius < -273.15:
            raise ValueError("温度不能低于绝对零度")
        self.celsius = celsius

t = Temperature(25)      # 正常
t.celsius = -999         # 事后赋值，没人管
print(t.report())
```

```text
非法数据混进来了
当前温度 -999
```

构造时检查只拦住了出生那一瞬，对象的一生还长。给每个用到温度的地方都写一遍 `if`？那是灾难的第一步。Python 给出的官方答案是 `@property`。

## 2. 最小可运行示例：先用 @property 守住它

```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius          # 这里也会经过 setter

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("celsius 不能低于绝对零度 -273.15")
        self._celsius = value

t = Temperature(25)
print(t.celsius)
t.celsius = 100
print(t.celsius)
try:
    t.celsius = -300
except ValueError as e:
    print("拦截:", e)
```

预期输出：

```text
25
100
拦截: celsius 不能低于绝对零度 -273.15
```

读写都经过函数，绕不过去——连 `__init__` 里的 `self.celsius = celsius` 都自动接受了检查。但一个尖锐的问题出现了：**`t.celsius = 100` 是一条普通赋值语句，它怎么会走进函数？** 普通属性赋值不调用任何代码，所以 `celsius` 一定不是普通属性。`print(Temperature.celsius)` 的答案是 `<property object at 0x...>`：类里那个位置站着的不是值，是一个 property 对象。每次读写 `t.celsius`，解释器先发现「这个类属性有点特殊」，转手调用它内部的函数。这个「特殊类属性」的正式名字就是本篇主角：**描述符（descriptor）**。

## 3. 把 @property 拆开：描述符协议最小实现

`property` 没有魔法，它只是提前替你写好了一个模式。徒手写一遍——让「必须高于 -273.15」变成可复用零件：

```python
class CelsiusField:
    """数据描述符：同时实现 __get__ 与 __set__"""

    def __set_name__(self, owner, name):
        # 类创建时由解释器调用，name 是字段名（先混个眼熟，580 篇讲透）
        self.public_name = name
        self.private_name = "_" + name

    def __get__(self, obj, objtype=None):
        if obj is None:          # 通过类访问（Temperature.celsius）时 obj 为 None
            return self
        return getattr(obj, self.private_name)

    def __set__(self, obj, value):
        if value < -273.15:
            raise ValueError(f"{self.public_name} 不能低于绝对零度 -273.15")
        setattr(obj, self.private_name, value)

class Temperature:
    celsius = CelsiusField()     # 描述符必须放在类的层级

    def __init__(self, celsius):
        self.celsius = celsius   # 这一行触发 __set__

t = Temperature(25)
print(t.celsius)
t.celsius = 100
print(t.celsius)
try:
    t.celsius = -300
except ValueError as e:
    print("拦截:", e)
print(t.__dict__)
```

预期输出（最后一行是实例字典的真实内容）：

```text
25
100
拦截: celsius 不能低于绝对零度 -273.15
{'_celsius': 100}
```

三个方法各司其职：读 `t.celsius` 触发 `__get__`；写触发 `__set__`，校验就在这里；`__set_name__` 在类创建时被解释器主动告知「你叫什么名字」，省去手写私有名。最后一行暴露了全部机关：真值一直存在实例字典的 `_celsius` 键下，`celsius` 只是带拦截功能的「门口」。

## 4. 核心概念：协议、数据与非数据

**定义**：一个对象是描述符，当且仅当它的类实现了 `__get__`、`__set__`、`__delete__` 至少一个方法，并且它作为**类属性**存在。这三个方法合称描述符协议。

按有没有 `__set__`（或 `__delete__`）分两类，这一刀切出最重要的行为差异：

| 类别 | 判定 | 优先级 | 你已经见过的代表 |
| --- | --- | --- | --- |
| 数据描述符 | 定义了 `__set__` 或 `__delete__` | 赢过实例字典 | `property`、ORM 字段 |
| 非数据描述符 | 只有 `__get__` | 输给实例字典 | 普通函数（方法）、`classmethod`、`staticmethod` |

注意 `__get__` 与分类无关：只写 `__get__` 是非数据描述符，只写 `__set__` 也是数据描述符。名字里带「数据」，是因为这类描述符真正接管了数据的读写权。

## 5. 决定性实验：查找优先级

如果实例字典和类属性上恰好有同名的东西，读 `c.x` 时谁说了算？做一遍实验比背结论有效：

```python
class DataDesc:
    def __get__(self, obj, objtype=None):
        return "数据描述符说了算"
    def __set__(self, obj, value):
        pass

class NonDataDesc:
    def __get__(self, obj, objtype=None):
        return "非数据描述符"

class C:
    data = DataDesc()
    nondata = NonDataDesc()
    plain = "普通类属性"

c = C()
c.__dict__["data"] = "实例字典里的值"   # 第 1 级：数据描述符 vs 实例字典
print(c.data)
c.__dict__["nondata"] = "实例字典赢了"  # 第 2 级：实例字典 vs 非数据描述符
print(c.nondata)
del c.__dict__["nondata"]              # 第 3 级：删掉遮蔽后非数据描述符回归
print(c.nondata)
```

预期输出：

```text
数据描述符说了算
实例字典赢了
非数据描述符
```

合起来是一条完整的链：**数据描述符 > 实例字典 > 非数据描述符 > 类属性**。

为什么必须这样排序？反推第 2 节：假如数据描述符输给实例字典，`t.celsius = -300` 会直接写进 `t.__dict__['celsius']`，下次读取实例字典抢先返回脏数据，setter 校验形同虚设。`property` 的全部价值都建立在「数据描述符赢过实例字典」上——这不是实现细节，是这个机制存在的理由。完整四层查找（含类属性兜底与赋值、删除时的差异）留到[描述符深水区](/python/580-PythonDescriptorProtocol)逐级验证。

## 6. 修改实验：__set__ 是校验的命门

把第 3 节的 `CelsiusField` 抄一遍，**删掉 `__set__` 方法**，然后跑：

```python
t = Temperature(25)
t.celsius = -300        # 预测：会抛 ValueError 吗？
print(t.celsius)
print(t.__dict__)
```

实测输出：

```text
-300
{'celsius': -300}
```

没有报错，-300 大摇大摆走了进去。删掉 `__set__` 后，`CelsiusField` 降级成非数据描述符：赋值不再被拦截，直接写进实例字典；实例字典又高于非数据描述符，之后连读取都不再经过 `__get__`。一个方法的去留，决定了整套校验是否存在。

## 7. 对照：把 property 当描述符用

`property` 本身就是用 C 写好的描述符类。不用装饰器语法，直接把它当类实例化，`@property` 的语法糖立刻透明：

```python
class Temperature:
    def __init__(self):
        self._celsius = 25

    def get_celsius(self):
        return self._celsius

    def set_celsius(self, value):
        if value < -273.15:
            raise ValueError("低于绝对零度")
        self._celsius = value

    celsius = property(get_celsius, set_celsius)   # @property 的函数式形态

t = Temperature()
print(t.celsius)
t.celsius = 100
print(t.celsius)
print(hasattr(Temperature.celsius, "__get__"), hasattr(Temperature.celsius, "__set__"))
```

预期输出：

```text
25
100
True True
```

`celsius = property(get, set)` 与第 2 节的装饰器写法完全等价；最后一行验证了它的身份——同时带 `__get__` 与 `__set__`，一个如假包换的数据描述符。`@property` 装饰器做的事，只是把 `def` 包进 `property()`；`@celsius.setter` 只是调用实例的 `setter` 方法生成带写插槽的新实例。语法糖化开，里面是第 3 节写过的东西。

## 8. 常见错误与调试实录

错误一：在 `__set__` 里 `setattr` 自己的名字。运行：

```python
class CelsiusField:
    def __get__(self, obj, objtype=None):
        return obj.celsius        # 错：又触发本描述符

    def __set__(self, obj, value):
        setattr(obj, "celsius", value)   # 错：又触发本描述符的 __set__

class Temperature:
    celsius = CelsiusField()

    def __init__(self, celsius):
        self.celsius = celsius

Temperature(25)
```

报错（真实文本，截取尾部）：

```text
  File "exp_recursion.py", line 6, in __set__
    setattr(obj, "celsius", value)   # 错：又触发本描述符的 __set__
  [Previous line repeated 995 more times]
RecursionError: maximum recursion depth exceeded
```

读报错三步：`RecursionError` 说明有函数无限调用自己；重复的行全部指向 `__set__` 里的 `setattr`；原因是 `celsius` 仍是数据描述符，`setattr` 又触发 `__set__`。规则：**描述符存值必须绕开公开名**——用 `__set_name__` 生成的私有名，或直接写 `obj.__dict__[私有名]`。

错误二：只写了 getter 就想赋值——`t.celsius = 100` 撞上只读 property，报错（真实文本）：

```text
AttributeError: property 'celsius' of 'Temperature' object has no setter
```

报错本身写得很明白：`has no setter`。看到它就去补 `@celsius.setter`，或者接受只读语义。

## 9. 实际场景：什么时候用，什么时候不用

应该用的场合：

- **规则要复用时选描述符**：同一套校验要贴到十个字段，写十个 `@property` 是体力劳动；写一个 `IntegerField` 描述符类，每个字段一行。Django/Pydantic 的字段体系就是这个思路——[SQLAlchemy](/python/830-PythonSQLAlchemy) 的 `Column` 拆开也是描述符；
- **一次性计算或只读属性选 @property**：`@property def total(self): return self.price * self.count` 这类单字段小逻辑，property 最顺手；
- **给旧字段悄悄加逻辑**：把裸属性换成 `@property` 加 setter，公开接口不变，调用方零改动。

不应该的场合：把简单属性包成描述符炫技（每次读写多一层调用）；在 `__set__` 里做耗时 IO（所有赋值语句都会变慢）；在描述符实例上存数据（所有实例共享同一个描述符对象，`self.value = x` 会让实例之间串数据，正确存法见第 3 节的私有名方案）。

## 10. 小练习

预测题（预计 5 分钟；不运行，先写答案）：

```python
class Loud:
    def __get__(self, obj, objtype=None):
        print("__get__ 被调用")
        return 42
    def __set__(self, obj, value):
        print("__set__ 被调用，收到", value)

class C:
    x = Loud()

c = C()
print(c.x)
c.x = 7
print(c.__dict__)
```

这四行执行各输出什么？（答案：`__get__ 被调用`、`42`、`__set__ 被调用，收到 7`、`{}`——赋值被 `__set__` 拦截，值从未进入实例字典。）

修改题（预计 10 分钟）：给第 3 节的 `CelsiusField` 加构造参数 `max_value`，越上界也抛 `ValueError`，并验证 100 到 200 合法、-999 与 999 都被拦截。

修 Bug 题（预计 10 分钟）：第 8 节错误一的代码在你手里。按「读报错三步」定位后修复——提示：让真值住进 `__set_name__` 生成的私有名，`__get__` 同步修改，修完读写与校验都应正常。

挑战题（预计半小时；不给代码）：实现 `BoundedValue(min_value, max_value)` 描述符，越界赋值抛 `ValueError`，用下面的断言自测：

```python
class Player:
    hp = BoundedValue(0, 100)

p = Player()
p.hp = 80
assert p.hp == 80
try:
    p.hp = 120
    assert False, "应当拦截"
except ValueError:
    pass
```

提示：`__init__` 存边界，`__set__` 做校验；再想一层——同一份代码能不能同时管住 `hp` 与 `mp`？答案在 `__set_name__`。

## 11. 与之前和之后的知识的关系

- 往前：[面向对象](/python/460-OOP) 的类属性在本文升级成「会拦截的类属性」；[函数详解](/python/100-FunctionDetailed) 讲过函数是对象——正因为普通函数是非数据描述符，`obj.method()` 才会自动绑定 `obj`，绑定机关在 580 篇展开；`@property` 这个写法本身是 [装饰器](/python/500-Decorator) 语法；
- 往后：[描述符深水区](/python/580-PythonDescriptorProtocol) 补全 `__set_name__`、`__delete__`、四层查找顺序实验、`cached_property` 复刻与 ORM 字段实战；
- 更远：[数据类与 Pydantic](/python/550-DataClassPydantic) 的字段校验、[FastAPI](/python/880-PythonFastAPI) 的参数声明，底层都是本篇这套协议。

## 12. 官方文档

- 描述符指南（官方 HowTo，讲清 property 与方法绑定的实现）：https://docs.python.org/zh-cn/3/howto/descriptor.html
- 内置函数 `property`：https://docs.python.org/zh-cn/3/library/functions.html#property
- 数据模型之「实现描述符」（优先级规则的权威出处）：https://docs.python.org/zh-cn/3/reference/datamodel.html#invoking-descriptors

## 13. 自我检查

- 能不看资料写出只有 `__get__`/`__set__` 的最小描述符，并说出私有存储名的作用；
- 能背出并动手验证「数据描述符 > 实例字典 > 非数据描述符 > 类属性」；
- 看到 `RecursionError` 与 `has no setter` 两类报错，能在三步内定位原因；
- 拿到一个新校验需求，能说出选 `@property` 还是自定义描述符的理由。

## 本章总结

`@property` 不是语法魔法，是描述符协议的一个现成实现：类属性位置上站一个对象，读写 `t.x` 被转手交给它的 `__get__`/`__set__`。有 `__set__` 的叫数据描述符，优先级高于实例字典——这条规则保住了校验不被绕过；只有 `__get__` 的叫非数据描述符，会被实例字典遮蔽。描述符的真正威力在于复用：一份校验逻辑写成类，就能管住任意多个字段。机制还剩三块没拆——`__set_name__` 的调用时机、`__delete__`、四层查找的完整实验。

## 下一步

进入 [描述符深水区](/python/580-PythonDescriptorProtocol)：把本篇立起的模型拆到能造出 `cached_property` 和微型 ORM 字段的程度。
