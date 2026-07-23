# 内置数据结构

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 列表

**基本写法：创建列表**
`[<元素1>, <元素2>, <元素3>]`

```python
# 创建列表
fruits = ["apple", "banana", "cherry"]
```

---

**基本写法：创建空列表**
`[]`

```python
# 创建空列表
empty_list = []
```

---

**基本写法：使用 list() 创建列表**
`list(<可迭代对象>)`

```python
# 使用 list() 创建列表
numbers = list(range(5))
```

---

**基本写法：访问列表元素**
`<列表>[<索引>]`

```python
# 访问列表元素
print(fruits[0])
```

---

**基本写法：负索引访问**
`<列表>[-<索引>]`

```python
# 使用负索引访问（从末尾开始）
print(fruits[-1])
```

---

**基本写法：列表切片**
`<列表>[<start>:<stop>:<step>]`

```python
# 列表切片
print(fruits[0:2])
```

---

**基本写法：修改列表元素**
`<列表>[<索引>] = <新值>`

```python
# 修改列表元素
fruits[0] = "orange"
```

---

## 列表方法

**基本写法：追加元素**
`<列表>.append(<元素>)`

```python
# 追加元素到列表末尾
fruits.append("grape")
```

---

**基本写法：插入元素**
`<列表>.insert(<索引>, <元素>)`

```python
# 在指定位置插入元素
fruits.insert(1, "kiwi")
```

---

**基本写法：扩展列表**
`<列表>.extend(<可迭代对象>)`

```python
# 使用另一个列表扩展当前列表
fruits.extend(["mango", "pear"])
```

---

**基本写法：删除指定元素**
`<列表>.remove(<元素>)`

```python
# 删除列表中第一个匹配的元素
fruits.remove("banana")
```

---

**基本写法：弹出元素**
`<列表>.pop([<索引>])`

```python
# 弹出指定位置的元素（默认末尾）
last = fruits.pop()
```

---

**基本写法：清空列表**
`<列表>.clear()`

```python
# 清空列表
fruits.clear()
```

---

**基本写法：查找元素索引**
`<列表>.index(<元素>)`

```python
# 查找元素的索引位置
index = fruits.index("cherry")
```

---

**基本写法：统计元素出现次数**
`<列表>.count(<元素>)`

```python
# 统计元素出现次数
count = fruits.count("apple")
```

---

**基本写法：排序列表**
`<列表>.sort()`

```python
# 原地排序列表
fruits.sort()
```

---

**基本写法：指定排序规则**
`<列表>.sort(key=<函数>, reverse=<布尔值>)`

```python
# 按字符串长度排序
fruits.sort(key=len, reverse=True)
```

---

**基本写法：反转列表**
`<列表>.reverse()`

```python
# 原地反转列表
fruits.reverse()
```

---

**基本写法：复制列表**
`<列表>.copy()`

```python
# 复制列表
fruits_copy = fruits.copy()
```

---

## 元组

**基本写法：创建元组**
`(<元素1>, <元素2>, <元素3>)`

```python
# 创建元组
point = (3, 4)
```

---

**基本写法：创建单元素元组**
`(<元素>,)`

```python
# 创建单元素元组（注意逗号）
single = (42,)
```

---

**基本写法：创建空元组**
`()`

```python
# 创建空元组
empty_tuple = ()
```

---

**基本写法：使用 tuple() 创建元组**
`tuple(<可迭代对象>)`

```python
# 使用 tuple() 创建元组
numbers = tuple([1, 2, 3])
```

---

**基本写法：访问元组元素**
`<元组>[<索引>]`

```python
# 访问元组元素
print(point[0])
```

---

**基本写法：元组解包**
`<变量1>, <变量2> = <元组>`

```python
# 元组解包
x, y = point
```

---

**基本写法：使用星号解包**
`<变量1>, *<变量2> = <元组>`

```python
# 使用星号收集剩余值
first, *rest = (1, 2, 3, 4, 5)
```

---

**基本写法：命名元组**
`namedtuple(<类名>, [<字段1>, <字段2>])`

```python
# 创建命名元组
from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p.y)
```

---

## 字典

**基本写法：创建字典**
`{<键1>: <值1>, <键2>: <值2>}`

```python
# 创建字典
person = {"name": "Alice", "age": 30}
```

---

**基本写法：创建空字典**
`{}`

```python
# 创建空字典
empty_dict = {}
```

---

**基本写法：使用 dict() 创建字典**
`dict(<键1>=<值1>, <键2>=<值2>)`

```python
# 使用 dict() 创建字典
person = dict(name="Alice", age=30)
```

---

**基本写法：使用键值对序列创建字典**
`dict([(<键>, <值>), (<键>, <值>)])`

```python
# 使用键值对序列创建字典
person = dict([("name", "Alice"), ("age", 30)])
```

---

**基本写法：访问字典值**
`<字典>[<键>]`

```python
# 通过键访问值
print(person["name"])
```

---

**基本写法：使用 get() 安全访问**
`<字典>.get(<键>, <默认值>)`

```python
# 使用 get() 安全访问，键不存在时返回默认值
print(person.get("email", "N/A"))
```

---

**基本写法：修改或添加键值对**
`<字典>[<键>] = <值>`

```python
# 修改或添加键值对
person["email"] = "alice@example.com"
```

---

**基本写法：删除键值对**
`del <字典>[<键>]`

```python
# 删除指定键值对
del person["age"]
```

---

## 字典方法

**基本写法：获取所有键**
`<字典>.keys()`

```python
# 获取字典的所有键
print(person.keys())
```

---

**基本写法：获取所有值**
`<字典>.values()`

```python
# 获取字典的所有值
print(person.values())
```

---

**基本写法：获取所有键值对**
`<字典>.items()`

```python
# 获取字典的所有键值对
print(person.items())
```

---

**基本写法：弹出键值对**
`<字典>.pop(<键>, <默认值>)`

```python
# 弹出指定键的值
age = person.pop("age", None)
```

---

**基本写法：弹出最后一个键值对**
`<字典>.popitem()`

```python
# 弹出最后一个键值对
key, value = person.popitem()
```

---

**基本写法：更新字典**
`<字典>.update(<其他字典>)`

```python
# 使用另一个字典更新当前字典
person.update({"age": 31, "city": "New York"})
```

---

**基本写法：设置默认值**
`<字典>.setdefault(<键>, <默认值>)`

```python
# 设置键的默认值（键不存在时设置）
person.setdefault("country", "USA")
```

---

**基本写法：清空字典**
`<字典>.clear()`

```python
# 清空字典
person.clear()
```

---

**基本写法：复制字典**
`<字典>.copy()`

```python
# 复制字典
person_copy = person.copy()
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

## 集合

**基本写法：创建集合**
`{<元素1>, <元素2>, <元素3>}`

```python
# 创建集合
fruits = {"apple", "banana", "cherry"}
```

---

**基本写法：创建空集合**
`set()`

```python
# 创建空集合（注意：{} 创建的是空字典）
empty_set = set()
```

---

**基本写法：使用 set() 创建集合**
`set(<可迭代对象>)`

```python
# 使用 set() 从列表创建集合
numbers = set([1, 2, 3, 2, 1])
```

---

## 集合方法

**基本写法：添加元素**
`<集合>.add(<元素>)`

```python
# 添加元素到集合
fruits.add("orange")
```

---

**基本写法：删除元素**
`<集合>.remove(<元素>)`

```python
# 删除元素（元素不存在时抛出异常）
fruits.remove("banana")
```

---

**基本写法：安全删除元素**
`<集合>.discard(<元素>)`

```python
# 安全删除元素（元素不存在时不抛出异常）
fruits.discard("banana")
```

---

**基本写法：弹出元素**
`<集合>.pop()`

```python
# 弹出集合中的任意元素
element = fruits.pop()
```

---

**基本写法：清空集合**
`<集合>.clear()`

```python
# 清空集合
fruits.clear()
```

---

## 集合运算

**基本写法：并集运算**
`<集合1> | <集合2>`

```python
# 集合并集
set1 = {1, 2, 3}
set2 = {3, 4, 5}
union = set1 | set2
```

---

**基本写法：交集运算**
`<集合1> & <集合2>`

```python
# 集合交集
intersection = set1 & set2
```

---

**基本写法：差集运算**
`<集合1> - <集合2>`

```python
# 集合差集
difference = set1 - set2
```

---

**基本写法：对称差集运算**
`<集合1> ^ <集合2>`

```python
# 集合对称差集
symmetric_diff = set1 ^ set2
```

---

**基本写法：使用 union() 方法**
`<集合>.union(<其他集合>)`

```python
# 使用 union() 方法求并集
union = set1.union(set2)
```

---

**基本写法：使用 intersection() 方法**
`<集合>.intersection(<其他集合>)`

```python
# 使用 intersection() 方法求交集
intersection = set1.intersection(set2)
```

---

**基本写法：使用 difference() 方法**
`<集合>.difference(<其他集合>)`

```python
# 使用 difference() 方法求差集
difference = set1.difference(set2)
```

---

**基本写法：子集判断**
`<集合1>.issubset(<集合2>)`

```python
# 判断是否为子集
is_subset = {1, 2}.issubset({1, 2, 3})
```

---

**基本写法：超集判断**
`<集合1>.issuperset(<集合2>)`

```python
# 判断是否为超集
is_superset = {1, 2, 3}.issuperset({1, 2})
```

---

**基本写法：不相交判断**
`<集合1>.isdisjoint(<集合2>)`

```python
# 判断两个集合是否不相交
is_disjoint = {1, 2}.isdisjoint({3, 4})
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

## collections 模块

**基本写法：使用 Counter 计数**
`Counter(<可迭代对象>)`

```python
# 使用 Counter 统计元素出现次数
from collections import Counter
word_count = Counter("hello world")
```

---

**基本写法：使用 defaultdict**
`defaultdict(<默认工厂>)`

```python
# 使用 defaultdict 设置默认值
from collections import defaultdict
word_list = defaultdict(list)
word_list["fruits"].append("apple")
```

---

**基本写法：使用 OrderedDict**
`OrderedDict([(<键>, <值>), (<键>, <值>)])`

```python
# 使用 OrderedDict 保持插入顺序
from collections import OrderedDict
ordered = OrderedDict([("a", 1), ("b", 2)])
```

---

**基本写法：使用 deque 双端队列**
`deque(<可迭代对象>)`

```python
# 使用 deque 创建双端队列
from collections import deque
queue = deque([1, 2, 3])
queue.appendleft(0)
queue.append(4)
```

---

**基本写法：deque 弹出左侧元素**
`<deque>.popleft()`

```python
# 从左侧弹出元素
first = queue.popleft()
```

---

## 冻结集合

**基本写法：创建冻结集合**
`frozenset(<可迭代对象>)`

```python
# 创建不可变的冻结集合
frozen = frozenset([1, 2, 3])
```

---

## 数据结构嵌套

**换行写法：嵌套字典列表**
`[`
`    {<键1>: <值1>, <键2>: <值2>},`
`    {<键1>: <值1>, <键2>: <值2>},`
`]`

```python
# 嵌套字典列表
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25},
]
```

---

**换行写法：嵌套字典字典**
`{`
`    <键1>: {<子键1>: <值1>},`
`    <键2>: {<子键2>: <值2>},`
`}`

```python
# 嵌套字典字典
matrix = {
    "row1": {"col1": 1, "col2": 2},
    "row2": {"col1": 3, "col2": 4},
}
