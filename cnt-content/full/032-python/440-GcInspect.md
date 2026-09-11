---
order: 440
title: Python gc inspect dis
module: 'python'
category: 后端技术
difficulty: beginner
description: Python gc inspect dis 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## gc 垃圾回收

**基本写法：手动回收**
`gc.collect()`
```python
# 触发垃圾回收
import gc

print(gc.collect())  # 返回回收对象数
```

**基本写法：分代回收**
`gc.collect(<代>)`
```python
# 只回收指定代（0/1/2）
gc.collect(0)
```

**基本写法：获取对象引用**
`gc.get_referrers(<对象>)`
```python
# 获取引用指定对象的对象
class Obj: pass
o = Obj()
lst = [o]
print(gc.get_referrers(o))
```

**基本写法：获取引用对象**
`gc.get_referents(<对象>)`
```python
# 获取对象引用的对象
print(gc.get_referents(lst))
```

**基本写法：获取阈值**
`gc.get_threshold()`
```python
# 获取分代回收阈值
print(gc.get_threshold())  # (700, 10, 10)
```

**基本写法：设置阈值**
`gc.set_threshold(<阈值0>, <阈值1>, <阈值2>)`
```python
# 调整回收阈值
gc.set_threshold(1000, 15, 15)
```

**基本写法：禁用/启用**
`gc.disable()` | `gc.enable()`
```python
# 禁用自动 GC
gc.disable()
gc.enable()
```

**基本写法：调试标志**
`gc.set_debug(<标志>)`
```python
# 设置调试输出
gc.set_debug(gc.DEBUG_LEAK)
```

**基本写法：跟踪对象**
`gc.callbacks.append(<回调>)`
```python
# 注册 GC 回调
def on_gc(phase, info):
    print(phase, info)
gc.callbacks.append(on_gc)
```

**基本写法：循环引用检测**
`gc.garbage`
```python
# 有 __del__ 的循环引用对象列表
print(gc.garbage)
```

---

## inspect 检查

**基本写法：获取源码**
`inspect.getsource(<对象>)`
```python
# 获取函数/类的源代码
import inspect

def foo():
    pass

print(inspect.getsource(foo))
```

**基本写法：获取文件**
`inspect.getfile(<对象>)`
```python
# 获取对象定义所在文件
print(inspect.getfile(foo))
```

**基本写法：获取模块**
`inspect.getmodule(<对象>)`
```python
# 获取对象所属模块
print(inspect.getmodule(foo))
```

**基本写法：签名信息**
`inspect.signature(<函数>)`
```python
# 获取函数签名
def add(a, b=10):
    return a + b

sig = inspect.signature(add)
print(sig.parameters)
```

**基本写法：参数详情**
`inspect.Parameter`
```python
# 检查参数
for name, p in sig.parameters.items():
    print(name, p.kind, p.default)
```

**基本写法：是否为函数/类**
`inspect.isfunction(<对象>)` | `inspect.isclass(<对象>)`
```python
# 类型判断
print(inspect.isfunction(foo))
print(inspect.isclass(int))
```

**基本写法：成员列表**
`inspect.getmembers(<对象>, <谓词>)`
```python
# 获取对象成员
class A:
    def method(self): pass

for name, member in inspect.getmembers(A, inspect.isfunction):
    print(name)
```

**基本写法：获取类层级**
`inspect.getmro(<类>)`
```python
# 获取方法解析顺序
print(inspect.getmro(int))
```

**基本写法：获取调用栈**
`inspect.stack()`
```python
# 获取调用栈帧
def outer():
    inner()

def inner():
    for frame in inspect.stack():
        print(frame.function)

outer()
```

**基本写法：当前帧**
`inspect.currentframe()`
```python
# 获取当前帧
frame = inspect.currentframe()
print(frame.f_code.co_name)
```

---

## dis 字节码反汇编

**基本写法：反汇编函数**
`dis.dis(<函数>)`
```python
# 反汇编为字节码
import dis

def add(a, b):
    return a + b

dis.dis(add)
```

**基本写法：反汇编字符串代码**
`dis.dis(<代码字符串>)`
```python
# 反汇编代码字符串
dis.dis("a + b")
```

**基本写法：获取字节码**
`dis.Bytecode(<函数>)`
```python
# 获取 Bytecode 对象迭代
for instr in dis.Bytecode(add):
    print(instr.opname, instr.argval)
```

**基本写法：查看常量**
`dis.code_info(<函数>)`
```python
# 获取代码对象信息
print(dis.code_info(add))
```

**基本写法：show_code**
`dis.show_code(<函数>)`
```python
# 打印代码对象信息
dis.show_code(add)
```

---

## ast 抽象语法树

**基本写法：解析代码**
`ast.parse(<代码字符串>)`
```python
# 解析为 AST
import ast

tree = ast.parse("x = 1 + 2")
print(ast.dump(tree))
```

**基本写法：遍历节点**
`ast.walk(<树>)`
```python
# 遍历所有节点
for node in ast.walk(tree):
    print(type(node).__name__)
```

**基本写法：NodeVisitor 访问**
`class <类>(ast.NodeVisitor):\n    def visit_<节点>(self, node):`
```python
# 自定义访问器
class Counter(ast.NodeVisitor):
    def __init__(self):
        self.count = 0
    def visit_Call(self, node):
        self.count += 1
        self.generic_visit(node)

c = Counter()
c.visit(ast.parse("a(); b()"))
print(c.count)
```

**基本写法：NodeTransformer 修改**
`class <类>(ast.NodeTransformer):`
```python
# 修改 AST 节点
class Double(ast.NodeTransformer):
    def visit_Num(self, node):
        return ast.copy_location(ast.Num(n=node.n * 2), node)
```

**基本写法：unparse 反向生成**
`ast.unparse(<树>)`
```python
# AST 转回代码字符串（3.9+）
print(ast.unparse(tree))
```

**基本写法：literal_eval 安全求值**
`ast.literal_eval(<字符串>)`
```python
# 安全求值字面值
print(ast.literal_eval("[1, 2, 3]"))
print(ast.literal_eval("{'a': 1}"))
```

---

## sys.intern 字符串驻留

**基本写法：字符串驻留**
`sys.intern(<字符串>)`
```python
# 字符串驻留，节省内存
import sys

a = sys.intern("hello")
b = sys.intern("hello")
print(a is b)  # True
```

---

## sys.getsizeof 对象大小

**基本写法：获取对象大小**
`sys.getsizeof(<对象>)`
```python
# 获取对象字节大小
print(sys.getsizeof([1, 2, 3]))
print(sys.getsizeof("hello"))
```

**基本写法：递归大小**
`sys.getsizeof(<对象>, <默认>)`
```python
# 配合递归计算容器总大小
def total_size(obj):
    seen = set()
    def inner(o):
        if id(o) in seen:
            return 0
        seen.add(id(o))
        s = sys.getsizeof(o)
        if isinstance(o, (list, tuple, set)):
            s += sum(inner(i) for i in o)
        return s
    return inner(obj)
```
