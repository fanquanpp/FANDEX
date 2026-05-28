---
title: 'Python 理论知识点'
module: 'python'
order: 160
tags:
  - 'python'
  - 'theory'
  - 'oop'
  - 'async'
  - 'design-patterns'
  - 'database'
  - 'functional'
  - 'memory'
  - 'concurrency'
difficulty: 'intermediate'
description: 'GIL 机制、内存管理、字节码与运行时模型。'
---

1. 线程获取 GIL
2. 执行一定数量的字节码（check interval，默认 100 条）或达到时间片（5ms）
3. 线程释放 GIL
4. 其他线程竞争获取 GIL
5. 原线程可能重新获取 GIL（非公平竞争）

```python
import sys
sys.getcheckinterval()  # 默认 100（字节码指令数）
sys.setcheckinterval(200)  # 设置检查间隔
```

### GIL 对多线程的影响

| 场景       | GIL 影响                          | 推荐方案                      |
| ---------- | --------------------------------- | ----------------------------- |
| CPU 密集型 | 多线程无法并行，甚至比单线程慢    | 多进程（multiprocessing）     |
| I/O 密集型 | GIL 在 I/O 等待时释放，多线程有效 | 多线程（threading）或 asyncio |
| C 扩展     | 可手动释放 GIL                    | ctypes/Cython 中释放 GIL      |
| 混合型     | 部分并行                          | 线程池 + 进程池组合           |

CPU 密集型多线程反而更慢的原因：线程切换本身有开销，加上 GIL 的获取/释放竞争，增加了额外的时间消耗。

### 绕过 GIL 的策略

1. **multiprocessing** -- 每个进程有独立的 GIL

   ```python
   from multiprocessing import Pool
   with Pool(4) as p:
       results = p.map(cpu_bound_func, data)
   ```

2. **C 扩展释放 GIL** -- 在 C 代码中手动释放

   ```c
   Py_BEGIN_ALLOW_THREADS
   // C 代码，不操作 Python 对象
   Py_END_ALLOW_THREADS
   ```

3. **concurrent.futures** -- 高层抽象

   ```python
   from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
   # CPU 密集用 ProcessPoolExecutor
   # I/O 密集用 ThreadPoolExecutor
   ```

4. **numpy/numba** -- 内部释放 GIL 的数值计算库

### GIL 的未来

PEP 703 提议在 CPython 3.13+ 中提供可选的 free-threaded 模式（nogil），通过以下方式实现：

- 将引用计数改为偏向引用计数（biased reference counting）
- 对共享对象使用原子引用计数
- 引入内存安全机制替代 GIL 的保护作用

---

## Python 字节码

### 字节码执行模型

Python 代码的执行过程：

```
源代码(.py) --> 编译器 --> 字节码(.pyc) --> 虚拟机 --> 执行结果
```

CPython 虚拟机是一个基于栈的虚拟机，通过操作数栈（evaluation stack）执行计算。

### 查看字节码

```python
import dis

def add(a, b):
    return a + b

dis.dis(add)
```

输出：

```
  2           0 LOAD_FAST                0 (a)
              2 LOAD_FAST                1 (b)
              4 BINARY_ADD
              6 RETURN_VALUE
```

### 常见字节码指令

| 指令              | 说明               | 栈效果                     |
| ----------------- | ------------------ | -------------------------- |
| LOAD_CONST        | 加载常量到栈顶     | push                       |
| LOAD_FAST         | 加载局部变量到栈顶 | push                       |
| STORE_FAST        | 将栈顶存入局部变量 | pop                        |
| LOAD_GLOBAL       | 加载全局变量到栈顶 | push                       |
| LOAD_ATTR         | 加载对象属性到栈顶 | pop, push                  |
| BINARY_ADD        | 栈顶两元素相加     | pop x2, push               |
| BINARY_SUBSCR     | 下标访问 a[b]      | pop x2, push               |
| CALL_FUNCTION     | 调用函数           | pop args+func, push result |
| RETURN_VALUE      | 返回栈顶元素       | pop                        |
| COMPARE_OP        | 比较操作           | pop x2, push               |
| POP_JUMP_IF_FALSE | 条件跳转           | pop                        |
| FOR_ITER          | for 循环迭代       | push                       |

### 字节码与性能

Python 每条字节码的执行涉及：

1. 解码指令
2. 分发到对应的处理函数
3. 操作数栈的 push/pop
4. GIL 检查

这些开销使得 Python 比 C 慢约 50-100 倍。JIT 编译器（如 PyPy）通过将热点字节码编译为机器码来消除这些开销。

### .pyc 文件

Python 自动将编译后的字节码缓存到 `__pycache__` 目录下的 `.pyc` 文件中。缓存失效条件：

- 源文件的修改时间戳变化
- 源文件的大小变化
- Python 版本或魔法号（magic number）不匹配

---

## 描述符协议（Descriptor Protocol）

### 什么是描述符

描述符是实现了 `__get__`、`__set__` 或 `__delete__` 中任意一个方法的类。描述符允许自定义属性的访问、赋值和删除行为，是 Python 中最强大的特性之一。

### 描述符的分类

| 类型         | 实现方法              | 典型用途                        |
| ------------ | --------------------- | ------------------------------- |
| 数据描述符   | `__get__` + `__set__` | property、类属性验证            |
| 非数据描述符 | 仅 `__get__`          | 方法、classmethod、staticmethod |

### 描述符协议方法

```python
class Descriptor:
    def __get__(self, obj, objtype=None):
        # obj 为 None 时表示通过类访问
        # obj 不为 None 时表示通过实例访问
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        # 仅数据描述符需要实现
        obj.__dict__[self.name] = value

    def __delete__(self, obj):
        # 可选实现
        del obj.__dict__[self.name]

    def __set_name__(self, owner, name):
        # Python 3.6+，自动获取属性名
        self.name = name
```

### 属性查找优先级

Python 属性查找的优先级顺序：

1. **数据描述符** -- 类中定义了 `__get__` 和 `__set__` 的描述符
2. **实例属性** -- `obj.__dict__` 中的属性
3. **非数据描述符** -- 类中仅定义了 `__get__` 的描述符
4. **`__getattr__`** -- 以上都未找到时调用

```python
class DataDescriptor:
    def __get__(self, obj, objtype=None):
        return "from data descriptor"
    def __set__(self, obj, value):
        pass

class NonDataDescriptor:
    def __get__(self, obj, objtype=None):
        return "from non-data descriptor"

class Example:
    data_desc = DataDescriptor()
    non_data_desc = NonDataDescriptor()

    def __init__(self):
        self.data_desc = "instance value"   # 被数据描述符拦截
        self.non_data_desc = "instance value" # 实例属性优先

e = Example()
print(e.data_desc)      # "from data descriptor"（数据描述符优先）
print(e.non_data_desc)  # "instance value"（实例属性优先于非数据描述符）
```

### property 的本质

property 是数据描述符的语法糖：

```python
# 使用 property
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

# 等价的手动描述符
class RadiusDescriptor:
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj._radius

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError("Radius cannot be negative")
        obj._radius = value
```

### 描述符的实际应用

1. **类型验证** -- 在 `__set__` 中检查赋值类型
2. **延迟计算** -- 在 `__get__` 中按需计算并缓存
3. **ORM 字段** -- SQLAlchemy/ Django Model 的字段定义
4. **信号/事件** -- 属性变化时触发回调
5. **访问控制** -- 实现只读属性、受保护属性

---

## MRO（Method Resolution Order）

### 什么是 MRO

MRO 是 Python 在多重继承中确定方法查找顺序的算法。Python 使用 C3 线性化算法计算 MRO，保证：

- 子类优先于父类
- 多个父类按定义顺序查找
- 单调性：子类的 MRO 不违反父类的 MRO

### C3 线性化算法

C3 算法的递归定义：

```
L[C] = C + merge(L[B1], L[B2], ..., [B1, B2, ...])
```

merge 的规则：

1. 取第一个列表的头部（第一个元素）
2. 如果该头部不出现在任何其他列表的尾部，则将其加入结果，并从所有列表中移除
3. 否则，跳到下一个列表的头部，重复步骤 2
4. 如果所有列表都为空，则完成；如果无法选择任何头部，则报错（不一致的继承关系）

### 示例

```python
class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass

# MRO:
# L[A] = [A, object]
# L[B] = [B] + merge(L[A], [A]) = [B, A, object]
# L[C] = [C] + merge(L[A], [A]) = [C, A, object]
# L[D] = [D] + merge(L[B], L[C], [B, C])
#       = [D] + merge([B, A, object], [C, A, object], [B, C])
#       = [D, B] + merge([A, object], [C, A, object], [C])
#       = [D, B, C] + merge([A, object], [A, object])
#       = [D, B, C, A, object]

print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)
```

### 钻石继承问题

```
    object
      |
      A
     / \
    B   C
     \ /
      D
```

Python 的 C3 线性化保证 D 的 MRO 为 D -> B -> C -> A -> object，避免了经典 MRO 中 A 被优先于 C 访问的问题。

### 不合法的继承

```python
class X: pass
class Y(X): pass

class A(X, Y): pass  # TypeError: Cannot create a consistent MRO
# 因为 X 必须在 Y 之前（X 是 Y 的父类），但 A 的定义中 X 在 Y 之前
# 这违反了 Y 的 MRO 中 X 在 Y 之后的约束
```

---

## 元类（Metaclass）

### 什么是元类

元类是创建类的类。正如实例由类创建，类由元类创建。默认元类是 `type`。

```python
class MyClass:
    pass

# 等价于
MyClass = type("MyClass", (), {})
```

### type 的三参数形式

```python
type(name, bases, dict)
# name: 类名
# bases: 基类元组
# dict: 类属性字典

MyClass = type(
    "MyClass",
    (BaseClass,),
    {"x": 10, "method": lambda self: self.x}
)
```

### 自定义元类

```python
class Meta(type):
    def __new__(mcs, name, bases, namespace):
        # 在类创建之前修改类定义
        print(f"Creating class {name}")
        namespace["class_id"] = id(mcs)
        cls = super().__new__(mcs, name, bases, namespace)
        return cls

    def __init__(cls, name, bases, namespace):
        # 在类创建之后初始化
        super().__init__(name, bases, namespace)

    def __call__(cls, *args, **kwargs):
        # 控制实例创建过程（类似单例模式）
        print(f"Creating instance of {cls.__name__}")
        return super().__call__(*args, **kwargs)

class MyClass(metaclass=Meta):
    def __init__(self):
        self.value = 42
```

### 元类的执行顺序

当 Python 遇到 `class MyClass(metaclass=Meta):` 时：

1. 收集基类和类属性到 namespace
2. 调用 `Meta.__prepare__()` 创建 namespace（可选，返回自定义映射）
3. 调用 `Meta.__new__(mcs, name, bases, namespace)` 创建类对象
4. 调用 `Meta.__init__(cls, name, bases, namespace)` 初始化类对象
5. 类创建完成

### 元类的实际应用

1. **单例模式**

   ```python
   class SingletonMeta(type):
       _instances = {}
       def __call__(cls, *args, **kwargs):
           if cls not in cls._instances:
               cls._instances[cls] = super().__call__(*args, **kwargs)
           return cls._instances[cls]

   class Database(metaclass=SingletonMeta):
       pass
   ```

2. **注册模式** -- 自动注册子类

   ```python
   class PluginMeta(type):
       registry = {}
       def __init__(cls, name, bases, namespace):
           super().__init__(name, bases, namespace)
           if name != "Plugin":
               PluginMeta.registry[name] = cls

   class Plugin(metaclass=PluginMeta):
       pass
   ```

3. **接口验证** -- 检查子类是否实现了所有抽象方法
4. **ORM 映射** -- Django Model 的元类将字段定义转换为数据库映射
5. **API 框架** -- 自动收集路由和视图函数

### 元类 vs 类装饰器

| 特性     | 元类             | 类装饰器         |
| -------- | ---------------- | ---------------- |
| 作用时机 | 类创建时         | 类创建后         |
| 继承性   | 子类自动继承元类 | 子类不继承装饰器 |
| 复杂度   | 高               | 低               |
| 适用场景 | 框架级抽象       | 简单的类修改     |

优先使用类装饰器，仅在需要继承行为时使用元类。

---

## 理论速查表

| 概念     | 核心要点                                     | 关键细节                              |
| -------- | -------------------------------------------- | ------------------------------------- |
| GIL      | 全局解释器锁，同一时刻只有一个线程执行字节码 | CPU 密集用多进程，I/O 密集用多线程    |
| 字节码   | CPython 基于栈的虚拟机指令                   | `dis.dis()` 查看，`.pyc` 缓存         |
| 描述符   | `__get__`/`__set__`/`__delete__` 协议        | 数据描述符优先于实例属性              |
| MRO      | C3 线性化算法确定方法查找顺序                | `ClassName.__mro__` 查看              |
| 元类     | 创建类的类，默认为 `type`                    | `__new__` -> `__init__` -> `__call__` |
| 引用计数 | CPython 的主要 GC 机制                       | 循环引用由分代 GC 处理                |
| 名称修饰 | `__attr` 变为 `_ClassName__attr`             | 仅双下划线前缀触发，防止子类覆盖      |
| 协程     | async/await 基于生成器实现                   | 事件循环调度，非抢占式                |
