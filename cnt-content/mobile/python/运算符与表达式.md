# 运算符与表达式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 算术运算符

**基本写法：加法运算**
`<操作数1> + <操作数2>`

```python
# 加法运算
result = 10 + 5
```

---

**基本写法：减法运算**
`<操作数1> - <操作数2>`

```python
# 减法运算
result = 10 - 5
```

---

**基本写法：乘法运算**
`<操作数1> * <操作数2>`

```python
# 乘法运算
result = 10 * 5
```

---

**基本写法：除法运算**
`<操作数1> / <操作数2>`

```python
# 除法运算（返回浮点数）
result = 10 / 3
```

---

**基本写法：整除运算**
`<操作数1> // <操作数2>`

```python
# 整除运算（向下取整）
result = 10 // 3
```

---

**基本写法：取模运算**
`<操作数1> % <操作数2>`

```python
# 取模运算（求余数）
result = 10 % 3
```

---

**基本写法：幂运算**
`<操作数1> ** <操作数2>`

```python
# 幂运算
result = 2 ** 3
```

---

**基本写法：负号运算**
`-<操作数>`

```python
# 负号运算
result = -10
```

---

**基本写法：正号运算**
`+<操作数>`

```python
# 正号运算
result = +10
```

---

## 复合赋值运算符

**基本写法：加法赋值**
`<变量> += <值>`

```python
# 加法赋值运算
x = 10
x += 5
```

---

**基本写法：减法赋值**
`<变量> -= <值>`

```python
# 减法赋值运算
x = 10
x -= 5
```

---

**基本写法：乘法赋值**
`<变量> *= <值>`

```python
# 乘法赋值运算
x = 10
x *= 5
```

---

**基本写法：除法赋值**
`<变量> /= <值>`

```python
# 除法赋值运算
x = 10
x /= 5
```

---

**基本写法：整除赋值**
`<变量> //= <值>`

```python
# 整除赋值运算
x = 10
x //= 3
```

---

**基本写法：取模赋值**
`<变量> %= <值>`

```python
# 取模赋值运算
x = 10
x %= 3
```

---

**基本写法：幂运算赋值**
`<变量> **= <值>`

```python
# 幂运算赋值
x = 2
x **= 3
```

---

## 比较运算符

**基本写法：等于比较**
`<操作数1> == <操作数2>`

```python
# 等于比较
result = (5 == 5)
```

---

**基本写法：不等于比较**
`<操作数1> != <操作数2>`

```python
# 不等于比较
result = (5 != 3)
```

---

**基本写法：大于比较**
`<操作数1> > <操作数2>`

```python
# 大于比较
result = (5 > 3)
```

---

**基本写法：小于比较**
`<操作数1> < <操作数2>`

```python
# 小于比较
result = (5 < 10)
```

---

**基本写法：大于等于比较**
`<操作数1> >= <操作数2>`

```python
# 大于等于比较
result = (5 >= 5)
```

---

**基本写法：小于等于比较**
`<操作数1> <= <操作数2>`

```python
# 小于等于比较
result = (5 <= 10)
```

---

## 链式比较

**基本写法：链式比较运算**
`<值1> < <值2> < <值3>`

```python
# 链式比较（等价于 1 < 2 and 2 < 3）
result = 1 < 2 < 3
```

---

## 逻辑运算符

**基本写法：逻辑与运算**
`<表达式1> and <表达式2>`

```python
# 逻辑与运算
result = True and False
```

---

**基本写法：逻辑或运算**
`<表达式1> or <表达式2>`

```python
# 逻辑或运算
result = True or False
```

---

**基本写法：逻辑非运算**
`not <表达式>`

```python
# 逻辑非运算
result = not True
```

---

## 短路求值

**基本写法：and 短路返回**
`<表达式1> and <表达式2>`

```python
# and 短路求值，第一个为 False 时返回第一个值
result = False and expensive_operation()
```

---

**基本写法：or 短路返回**
`<表达式1> or <表达式2>`

```python
# or 短路求值，第一个为 True 时返回第一个值
result = True or expensive_operation()
```

---

## 身份运算符

**基本写法：is 身份比较**
`<对象1> is <对象2>`

```python
# is 身份比较（判断是否为同一对象）
a = [1, 2, 3]
b = a
result = (a is b)
```

---

**基本写法：is not 身份比较**
`<对象1> is not <对象2>`

```python
# is not 身份比较
a = [1, 2, 3]
b = [1, 2, 3]
result = (a is not b)
```

---

**基本写法：使用 is 检查 None**
`<变量> is None`

```python
# 使用 is 检查 None
x = None
result = (x is None)
```

---

## 成员运算符

**基本写法：in 成员判断**
`<元素> in <容器>`

```python
# in 成员判断
result = 3 in [1, 2, 3]
```

---

**基本写法：not in 成员判断**
`<元素> not in <容器>`

```python
# not in 成员判断
result = 4 not in [1, 2, 3]
```

---

**基本写法：字符串成员判断**
`<子串> in <字符串>`

```python
# 字符串子串判断
result = "World" in "Hello, World!"
```

---

**基本写法：字典键成员判断**
`<键> in <字典>`

```python
# 字典键成员判断
result = "name" in {"name": "Alice", "age": 30}
```

---

## 位运算符

**基本写法：按位与运算**
`<操作数1> & <操作数2>`

```python
# 按位与运算
result = 5 & 3
```

---

**基本写法：按位或运算**
`<操作数1> | <操作数2>`

```python
# 按位或运算
result = 5 | 3
```

---

**基本写法：按位异或运算**
`<操作数1> ^ <操作数2>`

```python
# 按位异或运算
result = 5 ^ 3
```

---

**基本写法：按位取反运算**
`~<操作数>`

```python
# 按位取反运算
result = ~5
```

---

**基本写法：左移运算**
`<操作数> << <位数>`

```python
# 左移运算
result = 5 << 2
```

---

**基本写法：右移运算**
`<操作数> >> <位数>`

```python
# 右移运算
result = 20 >> 2
```

---

## 三元条件运算符

**单行写法：三元条件表达式**
`<值1> if <条件> else <值2>`

```python
# 三元条件表达式
age = 20
status = "Adult" if age >= 18 else "Minor"
```

---

**单行写法：嵌套三元表达式**
`<值1> if <条件1> else (<值2> if <条件2> else <值3>)`

```python
# 嵌套三元表达式
score = 85
grade = "A" if score >= 90 else ("B" if score >= 80 else "C")
```

---

## 运算符优先级

**基本写法：使用括号改变优先级**
`(<表达式>)`

```python
# 使用括号明确运算优先级
result = (2 + 3) * 4
```

---

## 海象运算符

**基本写法：赋值表达式**
`(<变量> := <值>)`

```python
# 海象运算符（赋值表达式）
if (n := len([1, 2, 3])) > 2:
    print(f"List has {n} elements")
```

---

**基本写法：在 while 循环中使用海象运算符**
`while (<变量> := <表达式>): <语句>`

```python
# 在 while 循环中使用海象运算符
while (line := input()) != "quit":
    print(line)
```

---

**基本写法：在列表推导式中使用海象运算符**
`[<变量> for <元素> in <可迭代对象> if (<变量> := <表达式>)]`

```python
# 在列表推导式中使用海象运算符
data = [1, 2, 3, 4, 5]
results = [y for x in data if (y := x * 2) > 4]
```

---

## 表达式求值

**基本写法：使用 eval() 求值**
`eval(<字符串表达式>)`

```python
# 使用 eval() 求值字符串表达式
result = eval("2 + 3 * 4")
```

---

## 运算符重载

**换行写法：通过魔术方法重载运算符**
`class <类名>:`
`    def __<运算符方法>__(self, <参数>): <语句>`

```python
# 通过 __add__ 方法重载加法运算符
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)
```

---

**基本写法：重载等于运算符**
`def __eq__(self, other): <语句>`

```python
# 通过 __eq__ 方法重载等于运算符
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
```

---

**基本写法：重载小于运算符**
`def __lt__(self, other): <语句>`

```python
# 通过 __lt__ 方法重载小于运算符
class Student:
    def __init__(self, score):
        self.score = score

    def __lt__(self, other):
        return self.score < other.score
```

---

**基本写法：重载字符串表示**
`def __repr__(self): <语句>`

```python
# 通过 __repr__ 方法重载字符串表示
class Person:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"Person(name={self.name!r})"
```

---

**基本写法：重载长度运算**
`def __len__(self): <语句>`

```python
# 通过 __len__ 方法重载 len() 函数
class Stack:
    def __init__(self):
        self.items = []

    def __len__(self):
        return len(self.items)
```

---

**基本写法：重载成员判断**
`def __contains__(self, item): <语句>`

```python
# 通过 __contains__ 方法重载 in 运算符
class Matrix:
    def __init__(self, data):
        self.data = data

    def __contains__(self, item):
        return any(item in row for row in self.data)
