# 推导式与生成器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 列表推导式

**基本写法：基本列表推导式**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 基本列表推导式
squares = [x ** 2 for x in range(5)]
```

---

**基本写法：带条件的列表推导式**
`[<表达式> for <变量> in <可迭代对象> if <条件>]`

```python
# 带条件的列表推导式
evens = [x for x in range(10) if x % 2 == 0]
```

---

**基本写法：带 if-else 的列表推导式**
`[<表达式1> if <条件> else <表达式2> for <变量> in <可迭代对象>]`

```python
# 带 if-else 的列表推导式
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
```

---

## 嵌套列表推导式

**基本写法：嵌套 for 的列表推导式**
`[<表达式> for <变量1> in <可迭代对象1> for <变量2> in <可迭代对象2>]`

```python
# 嵌套 for 的列表推导式
pairs = [(x, y) for x in range(3) for y in range(3)]
```

---

**基本写法：带条件的嵌套推导式**
`[<表达式> for <变量1> in <可迭代对象1> for <变量2> in <可迭代对象2> if <条件>]`

```python
# 带条件的嵌套推导式
pairs = [(x, y) for x in range(3) for y in range(3) if x != y]
```

---

**换行写法：多行嵌套推导式**
`[<表达式>`
` for <变量1> in <可迭代对象1>`
` for <变量2> in <可迭代对象2>]`

```python
# 多行嵌套推导式
matrix = [
    [x * y for y in range(3)]
    for x in range(3)
]
```

---

## 字典推导式

**基本写法：基本字典推导式**
`{<键表达式>: <值表达式> for <变量> in <可迭代对象>}`

```python
# 基本字典推导式
squares = {x: x ** 2 for x in range(5)}
```

---

**基本写法：带条件的字典推导式**
`{<键表达式>: <值表达式> for <变量> in <可迭代对象> if <条件>}`

```python
# 带条件的字典推导式
even_squares = {x: x ** 2 for x in range(10) if x % 2 == 0}
```

---

**基本写法：反转字典键值**
`{<值>: <键> for <键>, <值> in <字典>.items()}`

```python
# 反转字典的键和值
original = {"a": 1, "b": 2, "c": 3}
reversed_dict = {v: k for k, v in original.items()}
```

---

## 集合推导式

**基本写法：基本集合推导式**
`{<表达式> for <变量> in <可迭代对象>}`

```python
# 基本集合推导式
squares = {x ** 2 for x in range(5)}
```

---

**基本写法：带条件的集合推导式**
`{<表达式> for <变量> in <可迭代对象> if <条件>}`

```python
# 带条件的集合推导式
even_squares = {x ** 2 for x in range(10) if x % 2 == 0}
```

---

## 生成器表达式

**基本写法：基本生成器表达式**
`(<表达式> for <变量> in <可迭代对象>)`

```python
# 基本生成器表达式
squares_gen = (x ** 2 for x in range(5))
print(next(squares_gen))
```

---

**基本写法：带条件的生成器表达式**
`(<表达式> for <变量> in <可迭代对象> if <条件>)`

```python
# 带条件的生成器表达式
evens_gen = (x for x in range(10) if x % 2 == 0)
print(list(evens_gen))
```

---

**基本写法：生成器表达式作为函数参数**
`<函数>(<表达式> for <变量> in <可迭代对象>)`

```python
# 生成器表达式作为函数参数
total = sum(x ** 2 for x in range(10))
```

---

## 生成器函数

**换行写法：定义生成器函数**
`def <函数名>(<参数>):`
`    yield <值>`

```python
# 定义生成器函数
def count_up_to(max_value):
    count = 0
    while count < max_value:
        yield count
        count += 1
```

---

**基本写法：使用生成器**
`for <变量> in <生成器>: <语句>`

```python
# 使用生成器
for num in count_up_to(5):
    print(num)
```

---

**基本写法：使用 next() 获取值**
`next(<生成器>)`

```python
# 使用 next() 获取生成器的下一个值
gen = count_up_to(3)
print(next(gen))
```

---

**基本写法：使用 list() 转换生成器**
`list(<生成器>)`

```python
# 将生成器转换为列表
gen = count_up_to(5)
print(list(gen))
```

---

## yield 语句

**基本写法：使用 yield 生成值**
`yield <值>`

```python
# 使用 yield 生成值
def simple_generator():
    yield 1
    yield 2
    yield 3
```

---

**基本写法：使用 yield from 委托生成器**
`yield from <可迭代对象>`

```python
# 使用 yield from 委托给子生成器
def combined_generator():
    yield from [1, 2, 3]
    yield from [4, 5, 6]
```

---

**基本写法：yield from 委托给另一个生成器**
`yield from <生成器函数>()`

```python
# yield from 委托给另一个生成器
def sub_generator():
    yield "a"
    yield "b"

def main_generator():
    yield "start"
    yield from sub_generator()
    yield "end"
```

---

## 生成器方法

**基本写法：使用 send() 发送值**
`<生成器>.send(<值>)`

```python
# 使用 send() 向生成器发送值
def echo_generator():
    while True:
        received = yield
        print(f"收到: {received}")

gen = echo_generator()
next(gen)
gen.send("Hello")
```

---

**基本写法：使用 throw() 抛出异常**
`<生成器>.throw(<异常>)`

```python
# 使用 throw() 在生成器中抛出异常
def safe_generator():
    try:
        while True:
            yield "正常"
    except ValueError:
        yield "捕获到异常"

gen = safe_generator()
print(next(gen))
print(gen.throw(ValueError))
```

---

**基本写法：使用 close() 关闭生成器**
`<生成器>.close()`

```python
# 使用 close() 关闭生成器
gen = count_up_to(10)
print(next(gen))
gen.close()
```

---

## 无限生成器

**换行写法：定义无限生成器**
`def <函数名>():`
`    while True:`
`        yield <值>`

```python
# 定义无限生成器
def infinite_counter():
    count = 0
    while True:
        yield count
        count += 1
```

---

**基本写法：使用 itertools.islice 限制无限生成器**
`islice(<无限生成器>, <n>)`

```python
# 使用 islice 限制无限生成器的输出
from itertools import islice

gen = infinite_counter()
first_ten = list(islice(gen, 10))
```

---

## 生成器管道

**换行写法：生成器管道组合**
`gen1 = (<表达式> for <变量> in <可迭代对象>)`
`gen2 = (<表达式> for <变量> in gen1)`
`gen3 = (<表达式> for <变量> in gen2)`

```python
# 生成器管道组合
numbers = range(100)
squared = (x ** 2 for x in numbers)
evens = (x for x in squared if x % 2 == 0)
result = list(evens)
```

---

## itertools 模块

**基本写法：使用 itertools.chain 连接**
`chain(<可迭代对象1>, <可迭代对象2>)`

```python
# 使用 chain 连接多个可迭代对象
from itertools import chain
combined = chain([1, 2, 3], [4, 5, 6])
print(list(combined))
```

---

**基本写法：使用 itertools.chain.from_iterable 展平**
`chain.from_iterable(<嵌套可迭代对象>)`

```python
# 使用 chain.from_iterable 展平嵌套列表
from itertools import chain
nested = [[1, 2], [3, 4], [5, 6]]
flat = chain.from_iterable(nested)
print(list(flat))
```

---

**基本写法：使用 itertools.product 笛卡尔积**
`product(<可迭代对象1>, <可迭代对象2>)`

```python
# 使用 product 生成笛卡尔积
from itertools import product
colors = ["red", "blue"]
sizes = ["S", "M"]
combinations = list(product(colors, sizes))
```

---

**基本写法：使用 itertools.combinations 组合**
`combinations(<可迭代对象>, <r>)`

```python
# 使用 combinations 生成所有组合
from itertools import combinations
combos = list(combinations([1, 2, 3, 4], 2))
```

---

**基本写法：使用 itertools.permutations 排列**
`permutations(<可迭代对象>, <r>)`

```python
# 使用 permutations 生成所有排列
from itertools import permutations
perms = list(permutations([1, 2, 3], 2))
```

---

**基本写法：使用 itertools.cycle 循环**
`cycle(<可迭代对象>)`

```python
# 使用 cycle 无限循环可迭代对象
from itertools import cycle
cycler = cycle(["A", "B", "C"])
first_five = [next(cycler) for _ in range(5)]
```

---

**基本写法：使用 itertools.repeat 重复**
`repeat(<元素>, <次数>)`

```python
# 使用 repeat 重复元素
from itertools import repeat
repeated = list(repeat("Hello", 3))
```

---

**基本写法：使用 itertools.starmap 应用函数**
`starmap(<函数>, <可迭代对象>)`

```python
# 使用 starmap 将函数应用于解包的参数
from itertools import starmap
pairs = [(2, 3), (4, 5), (6, 7)]
results = list(starmap(lambda x, y: x + y, pairs))
```

---

**基本写法：使用 itertools.groupby 分组**
`groupby(<可迭代对象>, <键函数>)`

```python
# 使用 groupby 按键分组
from itertools import groupby
data = [("a", 1), ("a", 2), ("b", 3), ("b", 4)]
for key, group in groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
```

---

**基本写法：使用 itertools.accumulate 累积**
`accumulate(<可迭代对象>, <函数>)`

```python
# 使用 accumulate 累积计算
from itertools import accumulate
numbers = [1, 2, 3, 4, 5]
cumsum = list(accumulate(numbers))
```

---

## 生成器与协程

**换行写法：定义协程生成器**
`def <协程名>():`
`    while True:`
`        <值> = yield`
`        <处理>`

```python
# 定义协程生成器
def coroutine():
    print("启动协程")
    while True:
        value = yield
        print(f"处理: {value}")

coro = coroutine()
next(coro)
coro.send("数据")
```

---

## 生成器表达式与列表推导式对比

**基本写法：列表推导式（立即计算）**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 列表推导式（立即计算，占用内存）
squares_list = [x ** 2 for x in range(1000000)]
```

---

**基本写法：生成器表达式（惰性计算）**
`(<表达式> for <变量> in <可迭代对象>)`

```python
# 生成器表达式（惰性计算，节省内存）
squares_gen = (x ** 2 for x in range(1000000))
```

---

## 生成器与迭代器

**换行写法：自定义迭代器类**
`class <迭代器类>:`
`    def __iter__(self): return self`
`    def __next__(self): <语句>`

```python
# 自定义迭代器类
class CountDown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1
```

---

**换行写法：可迭代对象类**
`class <可迭代对象类>:`
`    def __iter__(self): yield <值>`

```python
# 可迭代对象类（使用 yield）
class NumberRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __iter__(self):
        current = self.start
        while current < self.end:
            yield current
            current += 1
```

---

## 生成器与内存优化

**基本写法：使用生成器处理大文件**
`def <函数名>(<文件路径>):`
`    with open(<文件路径>) as f:`
`        for line in f: yield <处理>`

```python
# 使用生成器逐行处理大文件
def read_large_file(file_path):
    with open(file_path, "r") as f:
        for line in f:
            yield line.strip()
```

---

**基本写法：使用生成器过滤数据**
`(<表达式> for <变量> in <可迭代对象> if <条件>)`

```python
# 使用生成器表达式过滤数据
data = range(1000000)
filtered = (x for x in data if x % 2 == 0)
result = sum(filtered)
```

---

## 生成器与 send() 双向通信

**换行写法：带 send() 的生成器**
`def <生成器名>():`
`    <初始化>`
`    while True:`
`        <输入> = yield <输出>`
`        <处理>`

```python
# 带 send() 的双向通信生成器
def accumulator():
    total = 0
    while True:
        value = yield total
        total += value

gen = accumulator()
next(gen)
print(gen.send(10))
print(gen.send(20))
```

---

## 生成器与 yield from

**换行写法：使用 yield from 委托**
`def <主生成器>():`
`    yield <值1>`
`    yield from <子生成器>()`
`    yield <值2>`

```python
# 使用 yield from 委托子生成器
def sub_generator():
    yield "sub1"
    yield "sub2"

def main_generator():
    yield "start"
    yield from sub_generator()
    yield "end"
```

---

**基本写法：yield from 返回值**
`result = yield from <生成器>`

```python
# yield from 获取子生成器的返回值
def sub_generator():
    yield 1
    yield 2
    return "完成"

def main_generator():
    result = yield from sub_generator()
    print(f"子生成器返回: {result}")
```
