# 函数详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数定义

**基本写法：定义无参函数**
`def <函数名>(): <语句>`

```python
# 定义无参函数
def greet():
    print("Hello, World!")
```

---

**基本写法：定义带参函数**
`def <函数名>(<参数>): <语句>`

```python
# 定义带参函数
def greet(name):
    print(f"Hello, {name}!")
```

---

**单行写法：定义单行函数**
`def <函数名>(<参数>): return <表达式>`

```python
# 定义单行函数
def square(x): return x * x
```

---

**换行写法：定义多参数函数**
`def <函数名>(`
`    <参数1>,`
`    <参数2>,`
`    <参数3>,`
`): <语句>`

```python
# 定义多参数函数（换行书写）
def create_user(
    name,
    age,
    email,
):
    return {"name": name, "age": age, "email": email}
```

---

## 函数调用

**基本写法：调用无参函数**
`<函数名>()`

```python
# 调用无参函数
greet()
```

---

**基本写法：按位置传参调用**
`<函数名>(<参数1>, <参数2>)`

```python
# 按位置传参调用函数
greet("Alice")
```

---

**基本写法：按关键字传参调用**
`<函数名>(<参数名>=<值>)`

```python
# 按关键字传参调用函数
greet(name="Alice")
```

---

**换行写法：多参数函数调用**
`<函数名>(`
`    <参数1>=<值1>,`
`    <参数2>=<值2>,`
`)`

```python
# 多参数函数调用（换行书写）
create_user(
    name="Alice",
    age=30,
    email="alice@example.com",
)
```

---

## 返回值

**基本写法：返回单个值**
`return <值>`

```python
# 返回单个值
def add(a, b):
    return a + b
```

---

**单行写法：返回多个值（元组）**
`return <值1>, <值2>, <值3>`

```python
# 返回多个值（作为元组）
def get_user_info():
    return "Alice", 30, "alice@example.com"
```

---

**基本写法：无返回值（隐式返回 None）**
`def <函数名>(): <语句>`

```python
# 无返回值的函数（隐式返回 None）
def print_message(msg):
    print(msg)
```

---

**基本写法：显式返回 None**
`return None`

```python
# 显式返回 None
def process(data):
    if not data:
        return None
    return data
```

---

## 默认参数

**基本写法：定义带默认值的参数**
`def <函数名>(<参数>=<默认值>): <语句>`

```python
# 定义带默认值的参数
def greet(name="World"):
    print(f"Hello, {name}!")
```

---

**基本写法：混合必选和默认参数**
`def <函数名>(<必选参数>, <参数>=<默认值>): <语句>`

```python
# 混合必选参数和默认参数
def create_user(name, age=18, active=True):
    return {"name": name, "age": age, "active": active}
```

---

## 可变参数

**基本写法：使用 *args 收集位置参数**
`def <函数名>(*<args>): <语句>`

```python
# 使用 *args 收集位置参数
def sum_all(*args):
    return sum(args)
```

---

**基本写法：使用 **kwargs 收集关键字参数**
`def <函数名>(**<kwargs>): <语句>`

```python
# 使用 **kwargs 收集关键字参数
def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")
```

---

**换行写法：组合使用必选、默认、可变参数**
`def <函数名>(`
`    <必选参数>,`
`    <参数>=<默认值>,`
`    *<args>,`
`    **<kwargs>,`
`): <语句>`

```python
# 组合使用各类参数
def create_profile(
    name,
    age=18,
    *hobbies,
    **metadata,
):
    profile = {"name": name, "age": age, "hobbies": hobbies}
    profile.update(metadata)
    return profile
```

---

## 参数解包

**基本写法：使用 * 解包列表或元组**
`<函数名>(*<序列>)`

```python
# 使用 * 解包列表作为位置参数
def add(a, b, c):
    return a + b + c

numbers = [1, 2, 3]
print(add(*numbers))
```

---

**基本写法：使用 ** 解包字典**
`<函数名>(**<字典>)`

```python
# 使用 ** 解包字典作为关键字参数
def greet(name, greeting):
    print(f"{greeting}, {name}!")

params = {"name": "Alice", "greeting": "Hi"}
greet(**params)
```

---

## 仅关键字参数

**基本写法：使用 * 强制关键字参数**
`def <函数名>(*, <参数>): <语句>`

```python
# 使用 * 强制后面的参数为关键字参数
def connect(host, *, port, timeout):
    print(f"Connecting to {host}:{port}, timeout={timeout}")
```

---

**基本写法：在 *args 后定义关键字参数**
`def <函数名>(*<args>, <参数>=<默认值>): <语句>`

```python
# 在 *args 后定义仅关键字参数
def func(*args, debug=False):
    if debug:
        print(f"args: {args}")
    return sum(args)
```

---

## 仅位置参数

**基本写法：使用 / 强制位置参数**
`def <函数名>(<参数1>, <参数2>, /): <语句>`

```python
# 使用 / 强制前面的参数为位置参数
def divide(a, b, /):
    return a / b
```

---

**换行写法：组合位置参数和关键字参数**
`def <函数名>(`
`    <位置参数>, /,`
`    <普通参数>,`
`    *, <关键字参数>,`
`): <语句>`

```python
# 组合位置参数、普通参数和关键字参数
def process_data(
    data, /,
    transform=None,
    *,
    validate=False,
):
    if transform:
        data = transform(data)
    if validate:
        data = validate(data)
    return data
```

---

## Lambda 表达式

**单行写法：基本 lambda 表达式**
`lambda <参数>: <表达式>`

```python
# 基本 lambda 表达式
square = lambda x: x * x
print(square(5))
```

---

**单行写法：多参数 lambda 表达式**
`lambda <参数1>, <参数2>: <表达式>`

```python
# 多参数 lambda 表达式
add = lambda a, b: a + b
print(add(3, 5))
```

---

**单行写法：带默认值的 lambda 表达式**
`lambda <参数>=<默认值>: <表达式>`

```python
# 带默认值的 lambda 表达式
greet = lambda name="World": f"Hello, {name}!"
print(greet())
```

---

**基本写法：在 sorted() 中使用 lambda**
`sorted(<可迭代对象>, key=lambda <参数>: <表达式>)`

```python
# 在 sorted() 中使用 lambda 作为 key
students = [("Alice", 85), ("Bob", 92), ("Charlie", 78)]
sorted_students = sorted(students, key=lambda x: x[1])
```

---

**基本写法：在 map() 中使用 lambda**
`map(lambda <参数>: <表达式>, <可迭代对象>)`

```python
# 在 map() 中使用 lambda
numbers = [1, 2, 3, 4, 5]
squares = list(map(lambda x: x ** 2, numbers))
```

---

**基本写法：在 filter() 中使用 lambda**
`filter(lambda <参数>: <条件>, <可迭代对象>)`

```python
# 在 filter() 中使用 lambda
numbers = [1, 2, 3, 4, 5, 6]
evens = list(filter(lambda x: x % 2 == 0, numbers))
```

---

## 高阶函数

**基本写法：函数作为参数**
`def <函数名>(<函数参数>, <其他参数>): <语句>`

```python
# 函数作为参数传递
def apply(func, value):
    return func(value)

result = apply(lambda x: x * 2, 5)
```

---

**基本写法：函数作为返回值**
`def <函数名>(): return <函数>`

```python
# 函数作为返回值
def make_multiplier(factor):
    return lambda x: x * factor

double = make_multiplier(2)
print(double(5))
```

---

**基本写法：使用 map() 函数**
`map(<函数>, <可迭代对象>)`

```python
# 使用 map() 对可迭代对象应用函数
numbers = [1, 2, 3, 4, 5]
squares = list(map(lambda x: x ** 2, numbers))
```

---

**基本写法：使用 filter() 函数**
`filter(<函数>, <可迭代对象>)`

```python
# 使用 filter() 过滤可迭代对象
numbers = [1, 2, 3, 4, 5, 6]
evens = list(filter(lambda x: x % 2 == 0, numbers))
```

---

**基本写法：使用 reduce() 函数**
`reduce(<函数>, <可迭代对象>)`

```python
# 使用 reduce() 累积计算
from functools import reduce
numbers = [1, 2, 3, 4, 5]
product = reduce(lambda x, y: x * y, numbers)
```

---

## 闭包

**换行写法：定义闭包**
`def <外部函数>(<参数>):`
`    def <内部函数>(<参数>): <语句>`
`    return <内部函数>`

```python
# 定义闭包
def make_counter():
    count = 0
    def counter():
        nonlocal count
        count += 1
        return count
    return counter
```

---

**基本写法：使用闭包**
`<变量> = <外部函数>()`

```python
# 使用闭包
counter = make_counter()
print(counter())
print(counter())
```

---

## 递归

**基本写法：递归函数**
`def <函数名>(<参数>): if <条件>: return <基线> else: return <递归调用>`

```python
# 递归计算阶乘
def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)
```

---

**基本写法：尾递归优化（Python 不支持，仅作示例）**
`def <函数名>(<参数>, <累加器>): if <条件>: return <累加器> else: return <递归调用>`

```python
# 尾递归形式的阶乘（Python 不优化）
def factorial_tail(n, acc=1):
    if n <= 1:
        return acc
    else:
        return factorial_tail(n - 1, n * acc)
```

---

## 函数注解

**基本写法：参数类型注解**
`def <函数名>(<参数>: <类型>): <语句>`

```python
# 参数类型注解
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

---

**基本写法：返回值类型注解**
`def <函数名>(<参数>) -> <返回类型>: <语句>`

```python
# 返回值类型注解
def add(a: int, b: int) -> int:
    return a + b
```

---

**基本写法：使用 Optional 类型注解**
`def <函数名>(<参数>: Optional[<类型>]) -> <类型>: <语句>`

```python
# 使用 Optional 类型注解
from typing import Optional

def find_user(user_id: int) -> Optional[dict]:
    if user_id == 1:
        return {"id": 1, "name": "Alice"}
    return None
```

---

**基本写法：使用 List 类型注解**
`def <函数名>(<参数>: List[<类型>]) -> <类型>: <语句>`

```python
# 使用 List 类型注解
from typing import List

def sum_numbers(numbers: List[int]) -> int:
    return sum(numbers)
```

---

**基本写法：使用 Dict 类型注解**
`def <函数名>(<参数>: Dict[<键类型>, <值类型>]) -> <类型>: <语句>`

```python
# 使用 Dict 类型注解
from typing import Dict

def get_value(data: Dict[str, int], key: str) -> int:
    return data.get(key, 0)
```

---

**基本写法：使用 Union 类型注解**
`def <函数名>(<参数>: Union[<类型1>, <类型2>]) -> <类型>: <语句>`

```python
# 使用 Union 类型注解
from typing import Union

def process(data: Union[str, bytes]) -> str:
    if isinstance(data, bytes):
        return data.decode()
    return data
```

---

## 函数属性

**基本写法：访问函数注解**
`<函数>.__annotations__`

```python
# 访问函数的注解信息
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet.__annotations__)
```

---

**基本写法：访问函数文档字符串**
`<函数>.__doc__`

```python
# 访问函数的文档字符串
def greet(name):
    """向用户打招呼"""
    return f"Hello, {name}!"

print(greet.__doc__)
```

---

**基本写法：访问函数名**
`<函数>.__name__`

```python
# 访问函数的名称
def my_function():
    pass

print(my_function.__name__)
```

---

## 偏函数

**基本写法：使用 partial 创建偏函数**
`partial(<函数>, <固定参数>)`

```python
# 使用 partial 创建偏函数
from functools import partial

def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
print(square(5))
```

---

## 函数缓存

**基本写法：使用 lru_cache 缓存函数结果**
`@lru_cache(maxsize=<n>)`

```python
# 使用 lru_cache 缓存函数结果
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

**基本写法：使用 cache 无限缓存**
`@cache`

```python
# 使用 cache 无限缓存
from functools import cache

@cache
def expensive_computation(n):
    return sum(i * i for i in range(n))
