# 列表推导式进阶

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本列表推导式

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

## 嵌套循环推导式

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

## 复杂表达式

**基本写法：函数调用在推导式中**
`[<函数>(<参数>) for <变量> in <可迭代对象>]`

```python
# 函数调用在推导式中
words = ["hello", "world"]
upper_words = [word.upper() for word in words]
```

---

**基本写法：方法调用在推导式中**
`[<对象>.<方法>() for <对象> in <可迭代对象>]`

```python
# 方法调用在推导式中
strings = ["  hello  ", "  world  "]
cleaned = [s.strip() for s in strings]
```

---

**基本写法：条件表达式在推导式中**
`[<表达式1> if <条件> else <表达式2> for <变量> in <可迭代对象>]`

```python
# 条件表达式在推导式中
numbers = [1, -2, 3, -4, 5]
abs_values = [x if x >= 0 else -x for x in numbers]
```

---

## 使用 enumerate()

**基本写法：使用 enumerate() 获取索引**
`[(<索引>, <值>) for <索引>, <值> in enumerate(<可迭代对象>)]`

```python
# 使用 enumerate() 获取索引
fruits = ["apple", "banana", "cherry"]
indexed = [(i, fruit) for i, fruit in enumerate(fruits)]
```

---

**基本写法：enumerate() 指定起始索引**
`[(<索引>, <值>) for <索引>, <值> in enumerate(<可迭代对象>, start=<n>)]`

```python
# enumerate() 指定起始索引
indexed = [(i, fruit) for i, fruit in enumerate(fruits, start=1)]
```

---

## 使用 zip()

**基本写法：使用 zip() 并行遍历**
`[(<值1>, <值2>) for <值1>, <值2> in zip(<可迭代对象1>, <可迭代对象2>)]`

```python
# 使用 zip() 并行遍历
names = ["Alice", "Bob"]
ages = [25, 30]
pairs = [(name, age) for name, age in zip(names, ages)]
```

---

## 字符串处理

**基本写法：字符串分割与处理**
`[<表达式> for <变量> in <字符串>.split(<分隔符>)]`

```python
# 字符串分割与处理
sentence = "hello world python"
words = [word.upper() for word in sentence.split()]
```

---

**基本写法：过滤字符串列表**
`[<字符串> for <字符串> in <列表> if <条件>]`

```python
# 过滤字符串列表
words = ["apple", "banana", "cherry", "date"]
long_words = [word for word in words if len(word) > 5]
```

---

## 数学运算

**基本写法：数学运算在推导式中**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 数学运算在推导式中
numbers = [1, 2, 3, 4, 5]
doubled = [x * 2 for x in numbers]
```

---

**基本写法：使用数学函数**
`[<函数>(<参数>) for <变量> in <可迭代对象>]`

```python
# 使用数学函数
import math
numbers = [1, 4, 9, 16, 25]
roots = [math.sqrt(x) for x in numbers]
```

---

## 文件处理

**基本写法：读取文件行并处理**
`[<表达式> for <行> in <文件>]`

```python
# 读取文件行并处理
with open("file.txt", "r") as f:
    lines = [line.strip() for line in f]
```

---

**基本写法：过滤文件行**
`[<行> for <行> in <文件> if <条件>]`

```python
# 过滤文件中的非空行
with open("file.txt", "r") as f:
    non_empty = [line.strip() for line in f if line.strip()]
```

---

## 嵌套列表展平

**基本写法：展平嵌套列表**
`[<元素> for <子列表> in <嵌套列表> for <元素> in <子列表>]`

```python
# 展平嵌套列表
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [num for row in matrix for num in row]
```

---

**基本写法：带条件的展平**
`[<元素> for <子列表> in <嵌套列表> for <元素> in <子列表> if <条件>]`

```python
# 带条件的展平
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
evens = [num for row in matrix for num in row if num % 2 == 0]
```

---

## 使用 itertools

**基本写法：使用 itertools.chain 展平**
`list(chain.from_iterable(<嵌套列表>))`

```python
# 使用 itertools.chain 展平嵌套列表
from itertools import chain
matrix = [[1, 2, 3], [4, 5, 6]]
flat = list(chain.from_iterable(matrix))
```

---

**基本写法：使用 itertools.product 生成笛卡尔积**
`[<表达式> for <变量1>, <变量2> in product(<可迭代对象1>, <可迭代对象2>)]`

```python
# 使用 itertools.product 生成笛卡尔积
from itertools import product
colors = ["red", "blue"]
sizes = ["S", "M", "L"]
combinations = [(c, s) for c, s in product(colors, sizes)]
```

---

## 性能对比

**基本写法：列表推导式 vs for 循环**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 列表推导式（比 for 循环更快）
squares = [x ** 2 for x in range(1000)]
```

---

**基本写法：使用 sum() 配合生成器**
`sum(<表达式> for <变量> in <可迭代对象>)`

```python
# 使用 sum() 配合生成器表达式
total = sum(x ** 2 for x in range(100))
```

---

## 多变量推导式

**基本写法：多变量列表推导式**
`[<表达式> for <变量1>, <变量2> in <可迭代对象>]`

```python
# 多变量列表推导式
pairs = [(a, b) for a, b in [(1, 2), (3, 4), (5, 6)]]
```

---

**基本写法：多变量带条件推导式**
`[<表达式> for <变量1>, <变量2> in <可迭代对象> if <条件>]`

```python
# 多变量带条件推导式
sums = [a + b for a, b in [(1, 2), (3, 4), (5, 6)] if a + b > 5]
```

---

## 字典转换为列表

**基本写法：字典键转换为列表**
`[<键> for <键> in <字典>]`

```python
# 字典键转换为列表
person = {"name": "Alice", "age": 30}
keys = [key for key in person]
```

---

**基本写法：字典值转换为列表**
`[<值> for <值> in <字典>.values()]`

```python
# 字典值转换为列表
values = [value for value in person.values()]
```

---

**基本写法：字典键值对转换为列表**
`[(<键>, <值>) for <键>, <值> in <字典>.items()]`

```python
# 字典键值对转换为列表
items = [(k, v) for k, v in person.items()]
```

---

**基本写法：带条件的字典过滤**
`[(<键>, <值>) for <键>, <值> in <字典>.items() if <条件>]`

```python
# 带条件的字典过滤
filtered = [(k, v) for k, v in person.items() if isinstance(v, str)]
