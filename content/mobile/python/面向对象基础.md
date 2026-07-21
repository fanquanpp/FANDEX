# Python 面向对象基础

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 类定义

**基本写法：定义简单类**
`class <类名>: <类体>`

```python
# 定义简单类
class Dog:
    pass
```

---

**换行写法：定义带属性的类**
`class <类名>:`
`    def __init__(self, <参数>):`
`        self.<属性> = <值>`

```python
# 定义带初始化方法的类
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age
```

---

**基本写法：定义类属性**
`class <类名>: <类属性> = <值>`

```python
# 定义类属性
class Dog:
    species = "Canis lupus"
```

---

**基本写法：定义实例属性**
`self.<属性> = <值>`

```python
# 在 __init__ 中定义实例属性
class Dog:
    def __init__(self, name):
        self.name = name
```

---

## 实例化与访问

**基本写法：创建类实例**
`<对象> = <类名>(<参数>)`

```python
# 创建 Dog 类的实例
dog = Dog("Buddy", 3)
```

---

**基本写法：访问实例属性**
`<对象>.<属性>`

```python
# 访问实例属性
print(dog.name)
```

---

**基本写法：访问类属性**
`<类名>.<类属性>`

```python
# 访问类属性
print(Dog.species)
```

---

**基本写法：修改实例属性**
`<对象>.<属性> = <新值>`

```python
# 修改实例属性
dog.age = 4
```

---

## 实例方法

**基本写法：定义实例方法**
`def <方法名>(self, <参数>): <语句>`

```python
# 定义实例方法
class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        return f"{self.name} says Woof!"
```

---

**基本写法：调用实例方法**
`<对象>.<方法名>(<参数>)`

```python
# 调用实例方法
print(dog.bark())
```

---

**基本写法：定义带参数的实例方法**
`def <方法名>(self, <参数1>, <参数2>): <语句>`

```python
# 定义带参数的实例方法
class Dog:
    def fetch(self, item):
        return f"{self.name} fetches the {item}"
```

---

## 类方法

**基本写法：定义类方法**
`@classmethod`
`def <方法名>(cls, <参数>): <语句>`

```python
# 定义类方法
class Dog:
    count = 0

    @classmethod
    def get_count(cls):
        return cls.count
```

---

**基本写法：使用类方法作为工厂**
`@classmethod`
`def <方法名>(cls, <参数>): return cls(<参数>)`

```python
# 使用类方法作为工厂函数
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    @classmethod
    def from_string(cls, data_str):
        name, age = data_str.split(",")
        return cls(name, int(age))
```

---

## 静态方法

**基本写法：定义静态方法**
`@staticmethod`
`def <方法名>(<参数>): <语句>`

```python
# 定义静态方法
class MathHelper:
    @staticmethod
    def add(a, b):
        return a + b
```

---

**基本写法：调用静态方法**
`<类名>.<方法名>(<参数>)`

```python
# 调用静态方法
print(MathHelper.add(3, 5))
```

---

## 继承

**基本写法：单继承**
`class <子类>(<父类>): <类体>`

```python
# 单继承
class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    pass
```

---

**基本写法：多继承**
`class <子类>(<父类1>, <父类2>): <类体>`

```python
# 多继承
class Flyable:
    def fly(self):
        return "Flying"

class Swimmable:
    def swim(self):
        return "Swimming"

class Duck(Flyable, Swimmable):
    pass
```

---

**基本写法：调用父类方法**
`super().<方法名>(<参数>)`

```python
# 调用父类的 __init__ 方法
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)
        self.breed = breed
```

---

**基本写法：方法重写**
`def <父类方法名>(self, <参数>): <新语句>`

```python
# 重写父类方法
class Animal:
    def speak(self):
        return "Some sound"

class Dog(Animal):
    def speak(self):
        return "Woof!"
```

---

**基本写法：使用 super() 调用重写方法**
`super().<方法名>(<参数>)`

```python
# 在重写方法中调用父类方法
class Dog(Animal):
    def speak(self):
        parent_sound = super().speak()
        return f"{parent_sound} - Woof!"
```

---

## 多重继承与 MRO

**基本写法：查看方法解析顺序**
`<类名>.mro()`

```python
# 查看方法解析顺序
print(Dog.mro())
```

---

**基本写法：查看方法解析顺序（__mro__）**
`<类名>.__mro__`

```python
# 查看 MRO 元组
print(Dog.__mro__)
```

---

## 属性装饰器

**基本写法：使用 @property 定义属性**
`@property`
`def <属性名>(self): <语句>`

```python
# 使用 @property 定义只读属性
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius
```

---

**基本写法：使用 @property 定义可写属性**
`@<属性名>.setter`
`def <属性名>(self, <值>): <语句>`

```python
# 使用 @property.setter 定义可写属性
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
```

---

**基本写法：使用 @property 定义删除器**
`@<属性名>.deleter`
`def <属性名>(self): <语句>`

```python
# 使用 @property.deleter 定义删除器
class Circle:
    @property
    def radius(self):
        return self._radius

    @radius.deleter
    def radius(self):
        del self._radius
```

---

## 特殊方法（魔术方法）

**基本写法：定义 __str__ 方法**
`def __str__(self): return <字符串>`

```python
# 定义 __str__ 方法（用户友好的字符串表示）
class Dog:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return f"Dog(name={self.name})"
```

---

**基本写法：定义 __repr__ 方法**
`def __repr__(self): return <字符串>`

```python
# 定义 __repr__ 方法（开发者友好的字符串表示）
class Dog:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"Dog(name={self.name!r})"
```

---

**基本写法：定义 __len__ 方法**
`def __len__(self): return <整数>`

```python
# 定义 __len__ 方法（支持 len() 函数）
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def __len__(self):
        return len(self.items)
```

---

**基本写法：定义 __eq__ 方法**
`def __eq__(self, other): return <布尔值>`

```python
# 定义 __eq__ 方法（支持 == 运算符）
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
```

---

**基本写法：定义 __lt__ 方法**
`def __lt__(self, other): return <布尔值>`

```python
# 定义 __lt__ 方法（支持 < 运算符）
class Student:
    def __init__(self, score):
        self.score = score

    def __lt__(self, other):
        return self.score < other.score
```

---

**基本写法：定义 __add__ 方法**
`def __add__(self, other): return <新对象>`

```python
# 定义 __add__ 方法（支持 + 运算符）
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)
```

---

**基本写法：定义 __getitem__ 方法**
`def __getitem__(self, <键>): return <值>`

```python
# 定义 __getitem__ 方法（支持 [] 访问）
class Matrix:
    def __init__(self, data):
        self.data = data

    def __getitem__(self, key):
        return self.data[key]
```

---

**基本写法：定义 __setitem__ 方法**
`def __setitem__(self, <键>, <值>): <语句>`

```python
# 定义 __setitem__ 方法（支持 [] 赋值）
class Matrix:
    def __setitem__(self, key, value):
        self.data[key] = value
```

---

**基本写法：定义 __iter__ 方法**
`def __iter__(self): return <迭代器>`

```python
# 定义 __iter__ 方法（支持迭代）
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

**基本写法：定义 __contains__ 方法**
`def __contains__(self, <元素>): return <布尔值>`

```python
# 定义 __contains__ 方法（支持 in 运算符）
class Matrix:
    def __contains__(self, item):
        return any(item in row for row in self.data)
```

---

**基本写法：定义 __call__ 方法**
`def __call__(self, <参数>): <语句>`

```python
# 定义 __call__ 方法（使实例可调用）
class Multiplier:
    def __init__(self, factor):
        self.factor = factor

    def __call__(self, x):
        return x * self.factor
```
