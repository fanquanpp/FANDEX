# 内置数据结构 (Built-in Data Structures)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: Python Basics
 False> @Description: 列表、元组、集合、字典的底层实现与常用操作。 | Detailed guide on List, Tuple, Set, and Dictionary.
 False
 False---
 False
 False## 目录
 False
 False1. [列表](#列表)
 False2. [元组](#元组)
 False3. [字典](#字典)
 False4. [集合](#集合)
 False5. [数据结构对比](#数据结构对比)
 False6. [数据结构的最佳实践](#数据结构的最佳实践)
 False7. [高级数据结构](#高级数据结构)
 False
 False---
 False
 False## 1. 列表 (List - `list`)
 False
 False列表是Python中最常用的数据结构之一，它是一个有序、可变的序列，允许存储重复元素。
 False
 False### 1.1 列表的创建
 False
```python
 True# 创建空列表
 Trueempty_list = []
 Trueempty_list = list()
 True
 True# 创建带有初始元素的列表
 Truenumbers = [1, 2, 3, 4, 5]
 Truefruits = ["apple", "banana", "cherry"]
 Truemixed = [1, "apple", True, 3.14]
 True
 True# 使用列表推导式创建列表
 Truesquares = [x ** 2 for x in range(10)]
 Trueprint(squares) # 输出: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
 True
 True# 使用range创建列表
 Truenumbers = list(range(1, 10, 2))
 Trueprint(numbers) # 输出: [1, 3, 5, 7, 9]
 True
 True# 复制列表
 Trueoriginal = [1, 2, 3]
 Truecopy1 = original.copy()
 Truecopy2 = list(original)
 Truecopy3 = original[:] # 切片复制
 True```

 False### 1.2 列表的访问
 False
```python
 Truefruits = ["apple", "banana", "cherry"]
 True
 True# 通过索引访问元素
 Trueprint(fruits[0]) # 输出: apple
 Trueprint(fruits[1]) # 输出: banana
 Trueprint(fruits[-1]) # 输出: cherry (负索引从末尾开始)
 True
 True# 切片操作
 Trueprint(fruits[1:3]) # 输出: ['banana', 'cherry'] (从索引1到2)
 Trueprint(fruits[:2]) # 输出: ['apple', 'banana'] (从开始到索引1)
 Trueprint(fruits[1:]) # 输出: ['banana', 'cherry'] (从索引1到结束)
 Trueprint(fruits[::-1]) # 输出: ['cherry', 'banana', 'apple'] (反转列表)
 True
 True# 检查元素是否存在
 Trueprint("apple" in fruits) # 输出: True
 Trueprint("orange" in fruits) # 输出: False
 True
 True# 获取列表长度
 Trueprint(len(fruits)) # 输出: 3
 True```

 False### 1.3 列表的修改
 False
```python
 Truefruits = ["apple", "banana", "cherry"]
 True
 True# 修改元素
 Truefruits[1] = "grape"
 Trueprint(fruits) # 输出: ['apple', 'grape', 'cherry']
 True
 True# 添加元素
 Truefruits.append("orange") # 在末尾添加
 Trueprint(fruits) # 输出: ['apple', 'grape', 'cherry', 'orange']
 True
 Truefruits.insert(1, "pear") # 在指定位置插入
 Trueprint(fruits) # 输出: ['apple', 'pear', 'grape', 'cherry', 'orange']
 True
 True# 扩展列表
 Truemore_fruits = ["mango", "kiwi"]
 Truefruits.extend(more_fruits) # 添加另一个列表的所有元素
 Trueprint(fruits) # 输出: ['apple', 'pear', 'grape', 'cherry', 'orange', 'mango', 'kiwi']
 True
 True# 删除元素
 Truefruits.remove("cherry") # 移除指定值的元素
 Trueprint(fruits) # 输出: ['apple', 'pear', 'grape', 'orange', 'mango', 'kiwi']
 True
 Truepopped = fruits.pop() # 移除并返回最后一个元素
 Trueprint(popped) # 输出: kiwi
 Trueprint(fruits) # 输出: ['apple', 'pear', 'grape', 'orange', 'mango']
 True
 Truepopped = fruits.pop(1) # 移除并返回指定位置的元素
 Trueprint(popped) # 输出: pear
 Trueprint(fruits) # 输出: ['apple', 'grape', 'orange', 'mango']
 True
 True# 清空列表
 Truefruits.clear()
 Trueprint(fruits) # 输出: []
 True```

 False### 1.4 列表的常用方法
 False
```python
 Truenumbers = [3, 1, 4, 1, 5, 9, 2, 6]
 True
 True# 排序
 Truenumbers.sort()
 Trueprint(numbers) # 输出: [1, 1, 2, 3, 4, 5, 6, 9]
 True
 True# 反向排序
 Truenumbers.sort(reverse=True)
 Trueprint(numbers) # 输出: [9, 6, 5, 4, 3, 2, 1, 1]
 True
 True# 反转列表
 Truenumbers.reverse()
 Trueprint(numbers) # 输出: [1, 1, 2, 3, 4, 5, 6, 9]
 True
 True# 统计元素出现次数
 Trueprint(numbers.count(1)) # 输出: 2
 True
 True# 查找元素索引
 Trueprint(numbers.index(5)) # 输出: 5
 True
 True# 列表拼接
 Truelist1 = [1, 2, 3]
 Truelist2 = [4, 5, 6]
 Truecombined = list1 + list2
 Trueprint(combined) # 输出: [1, 2, 3, 4, 5, 6]
 True
 True# 列表重复
 Truerepeated = [1, 2] * 3
 Trueprint(repeated) # 输出: [1, 2, 1, 2, 1, 2]
 True```

 False### 1.5 列表的性能特点
 False
 False- **实现**: 基于动态数组
 False- **访问**: O(1)（通过索引）
 False- **插入/删除**:
 False - 末尾: O(1)
 False - 中间: O(n)（需要移动元素）
 False- **查找**: O(n)（线性搜索）
 False
 False## 2. 元组 (Tuple - `tuple`)
 False
 False元组是一个有序、不可变的序列，允许存储重复元素。
 False
 False### 2.1 元组的创建
 False
```python
 True# 创建元组
 Trueempty_tuple = ()
 Trueempty_tuple = tuple()
 True
 True# 创建带有初始元素的元组
 Truenumbers = (1, 2, 3, 4, 5)
 Truefruits = ("apple", "banana", "cherry")
 Truemixed = (1, "apple", True, 3.14)
 True
 True# 注意: 单个元素的元组需要加逗号
 Truesingle_element = (1,)
 Trueprint(type(single_element)) # 输出: <class 'tuple'>
 True
 True# 不带括号的元组
 Trueimplicit_tuple = 1, 2, 3
 Trueprint(type(implicit_tuple)) # 输出: <class 'tuple'>
 True
 True# 从其他序列创建元组
 Truelist_to_tuple = tuple([1, 2, 3])
 Trueprint(list_to_tuple) # 输出: (1, 2, 3)
 True
 Truestring_to_tuple = tuple("hello")
 Trueprint(string_to_tuple) # 输出: ('h', 'e', 'l', 'l', 'o')
 True```

 False### 2.2 元组的访问
 False
```python
 Truefruits = ("apple", "banana", "cherry")
 True
 True# 通过索引访问元素
 Trueprint(fruits[0]) # 输出: apple
 Trueprint(fruits[1]) # 输出: banana
 Trueprint(fruits[-1]) # 输出: cherry
 True
 True# 切片操作
 Trueprint(fruits[1:3]) # 输出: ('banana', 'cherry')
 Trueprint(fruits[:2]) # 输出: ('apple', 'banana')
 Trueprint(fruits[1:]) # 输出: ('banana', 'cherry')
 Trueprint(fruits[::-1]) # 输出: ('cherry', 'banana', 'apple')
 True
 True# 检查元素是否存在
 Trueprint("apple" in fruits) # 输出: True
 True
 True# 获取元组长度
 Trueprint(len(fruits)) # 输出: 3
 True
 True# 元组的不可变性
 True# fruits[1] = "grape" # 错误: 'tuple' object does not support item assignment
 True```

 False### 2.3 元组的解包
 False
```python
 True# 基本解包
 Truecoordinates = (10, 20, 30)
 Truex, y, z = coordinates
 Trueprint(x, y, z) # 输出: 10 20 30
 True
 True# 部分解包
 Truenumbers = (1, 2, 3, 4, 5)
 Truefirst, *middle, last = numbers
 Trueprint(first) # 输出: 1
 Trueprint(middle) # 输出: [2, 3, 4]
 Trueprint(last) # 输出: 5
 True
 True# 交换变量
 Truea, b = 1, 2
 Truea, b = b, a
 Trueprint(a, b) # 输出: 2 1
 True
 True# 函数返回多个值
 Truedef get_user():
 True return "Alice", 30, "New York"
 True
 Truename, age, city = get_user()
 Trueprint(name, age, city) # 输出: Alice 30 New York
 True```

 False### 2.4 元组的常用方法
 False
```python
 Truenumbers = (3, 1, 4, 1, 5, 9)
 True
 True# 统计元素出现次数
 Trueprint(numbers.count(1)) # 输出: 2
 True
 True# 查找元素索引
 Trueprint(numbers.index(5)) # 输出: 4
 True
 True# 元组拼接
 Truetuple1 = (1, 2, 3)
 Truetuple2 = (4, 5, 6)
 Truecombined = tuple1 + tuple2
 Trueprint(combined) # 输出: (1, 2, 3, 4, 5, 6)
 True
 True# 元组重复
 Truerepeated = (1, 2) * 3
 Trueprint(repeated) # 输出: (1, 2, 1, 2, 1, 2)
 True```

 False### 2.5 元组的应用场景
 False
 False- **作为字典的键**（因为元组不可变）
 False- **函数返回多个值**
 False- **保护数据不被修改**
 False- **性能优化**（元组比列表更节省内存，访问速度更快）
 False
 False## 3. 字典 (Dictionary - `dict`)
 False
 False字典是一种映射类型，存储键值对，Python 3.7+ 保证插入顺序。
 False
 False### 3.1 字典的创建
 False
```python
 True# 创建空字典
 Trueempty_dict = {}
 Trueempty_dict = dict()
 True
 True# 创建带有初始键值对的字典
 Trueperson = {"name": "Alice", "age": 30, "city": "New York"}
 True
 True# 使用dict()构造函数
 Trueperson = dict(name="Alice", age=30, city="New York")
 True
 True# 从键值对列表创建
 Trueitems = [("name", "Alice"), ("age", 30), ("city", "New York")]
 Trueperson = dict(items)
 True
 True# 从两个列表创建（键和值）
 Truekeys = ["name", "age", "city"]
 Truevalues = ["Alice", 30, "New York"]
 Trueperson = dict(zip(keys, values))
 True
 True# 字典推导式
 Truesquares = {x: x**2 for x in range(5)}
 Trueprint(squares) # 输出: {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
 True```

 False### 3.2 字典的访问
 False
```python
 Trueperson = {"name": "Alice", "age": 30, "city": "New York"}
 True
 True# 通过键访问值
 Trueprint(person["name"]) # 输出: Alice
 Trueprint(person["age"]) # 输出: 30
 True
 True# 使用get()方法访问（更安全）
 Trueprint(person.get("name")) # 输出: Alice
 Trueprint(person.get("country", "Unknown")) # 输出: Unknown（键不存在时返回默认值）
 True
 True# 检查键是否存在
 Trueprint("name" in person) # 输出: True
 Trueprint("country" in person) # 输出: False
 True
 True# 获取所有键
 Trueprint(person.keys()) # 输出: dict_keys(['name', 'age', 'city'])
 True
 True# 获取所有值
 Trueprint(person.values()) # 输出: dict_values(['Alice', 30, 'New York'])
 True
 True# 获取所有键值对
 Trueprint(person.items()) # 输出: dict_items([('name', 'Alice'), ('age', 30), ('city', 'New York')])
 True```

 False### 3.3 字典的修改
 False
```python
 Trueperson = {"name": "Alice", "age": 30, "city": "New York"}
 True
 True# 添加或修改键值对
 Trueperson["country"] = "USA" # 添加新键值对
 Trueprint(person) # 输出: {'name': 'Alice', 'age': 30, 'city': 'New York', 'country': 'USA'}
 True
 Trueperson["age"] = 31 # 修改现有值
 Trueprint(person) # 输出: {'name': 'Alice', 'age': 31, 'city': 'New York', 'country': 'USA'}
 True
 True# 使用update()方法更新
 Trueperson.update({"city": "Boston", "job": "Engineer"})
 Trueprint(person) # 输出: {'name': 'Alice', 'age': 31, 'city': 'Boston', 'country': 'USA', 'job': 'Engineer'}
 True
 True# 删除键值对
 Trueremoved_value = person.pop("country") # 移除并返回值
 Trueprint(removed_value) # 输出: USA
 Trueprint(person) # 输出: {'name': 'Alice', 'age': 31, 'city': 'Boston', 'job': 'Engineer'}
 True
 True# 删除最后一个键值对（Python 3.7+）
 Truelast_item = person.popitem()
 Trueprint(last_item) # 输出: ('job', 'Engineer')
 Trueprint(person) # 输出: {'name': 'Alice', 'age': 31, 'city': 'Boston'}
 True
 True# 清空字典
 Trueperson.clear()
 Trueprint(person) # 输出: {}
 True```

 False### 3.4 字典的遍历
 False
```python
 Trueperson = {"name": "Alice", "age": 30, "city": "New York"}
 True
 True# 遍历键
 Truefor key in person:
 True print(key)
 True
 True# 遍历键（显式）
 Truefor key in person.keys():
 True print(key)
 True
 True# 遍历值
 Truefor value in person.values():
 True print(value)
 True
 True# 遍历键值对
 Truefor key, value in person.items():
 True print(f"{key}: {value}")
 True```

 False### 3.5 字典的性能特点
 False
 False- **实现**: 基于哈希表
 False- **访问**: O(1)（平均情况）
 False- **插入/删除**: O(1)（平均情况）
 False- **查找**: O(1)（平均情况）
 False- **键的要求**: 必须是不可变类型（如字符串、数字、元组）
 False
 False## 4. 集合 (Set - `set`)
 False
 False集合是一个无序、不重复的元素集合。
 False
 False### 4.1 集合的创建
 False
```python
 True# 创建空集合
 Trueempty_set = set() # 注意: {} 创建的是空字典
 True
 True# 创建带有初始元素的集合
 Truenumbers = {1, 2, 3, 4, 5}
 Truefruits = {"apple", "banana", "cherry"}
 True
 True# 从其他序列创建集合
 Truelist_to_set = set([1, 2, 3, 3, 4, 5])
 Trueprint(list_to_set) # 输出: {1, 2, 3, 4, 5}（自动去重）
 True
 Truestring_to_set = set("hello")
 Trueprint(string_to_set) # 输出: {'h', 'e', 'l', 'o'}（自动去重）
 True
 True# 集合推导式
 Truesquares = {x**2 for x in range(5)}
 Trueprint(squares) # 输出: {0, 1, 4, 9, 16}
 True```

 False### 4.2 集合的操作
 False
```python
 Truefruits = {"apple", "banana", "cherry"}
 True
 True# 添加元素
 Truefruits.add("orange")
 Trueprint(fruits) # 输出: {'apple', 'banana', 'cherry', 'orange'}
 True
 True# 添加多个元素
 Truefruits.update(["mango", "kiwi"])
 Trueprint(fruits) # 输出: {'apple', 'banana', 'cherry', 'orange', 'mango', 'kiwi'}
 True
 True# 删除元素
 Truefruits.remove("cherry") # 如果元素不存在会抛出错误
 Trueprint(fruits) # 输出: {'apple', 'banana', 'orange', 'mango', 'kiwi'}
 True
 Truefruits.discard("grape") # 如果元素不存在不会抛出错误
 Trueprint(fruits) # 输出: {'apple', 'banana', 'orange', 'mango', 'kiwi'}
 True
 True# 移除并返回任意元素
 Truepopped = fruits.pop()
 Trueprint(popped) # 输出: 任意元素，如 'apple'
 Trueprint(fruits) # 输出: 剩余元素
 True
 True# 清空集合
 Truefruits.clear()
 Trueprint(fruits) # 输出: set()
 True```

 False### 4.3 集合运算
 False
```python
 Trueset1 = {1, 2, 3, 4, 5}
 Trueset2 = {4, 5, 6, 7, 8}
 True
 True# 并集
 Trueunion = set1 | set2
 Trueprint(union) # 输出: {1, 2, 3, 4, 5, 6, 7, 8}
 Trueprint(set1.union(set2)) # 同上
 True
 True# 交集
 Trueintersection = set1 & set2
 Trueprint(intersection) # 输出: {4, 5}
 Trueprint(set1.intersection(set2)) # 同上
 True
 True# 差集
 Truedifference = set1 - set2
 Trueprint(difference) # 输出: {1, 2, 3}
 Trueprint(set1.difference(set2)) # 同上
 True
 True# 对称差集（并集减去交集）
 Truesymmetric_difference = set1 ^ set2
 Trueprint(symmetric_difference) # 输出: {1, 2, 3, 6, 7, 8}
 Trueprint(set1.symmetric_difference(set2)) # 同上
 True
 True# 子集检查
 Trueset3 = {1, 2, 3}
 Trueprint(set3.issubset(set1)) # 输出: True
 True
 True# 超集检查
 Trueprint(set1.issuperset(set3)) # 输出: True
 True
 True# 不相交检查
 Trueset4 = {6, 7, 8}
 Trueprint(set1.isdisjoint(set4)) # 输出: True
 True```

 False### 4.4 集合的性能特点
 False
 False- **实现**: 基于哈希表
 False- **查找**: O(1)（平均情况）
 False- **插入/删除**: O(1)（平均情况）
 False- **元素要求**: 必须是不可变类型
 False
 False## 5. 数据结构对比
 False
 False| 类型 | 有序 | 可变 | 重复 | 性能 (查找) | 适用场景 |
 False|---|---|---|---|---|---|
 False| `list` | Yes | Yes | Yes | $O(n)$ | 需要有序且可能修改的数据 |
 False| `tuple` | Yes | No | Yes | $O(n)$ | 需要有序且不可修改的数据，作为字典键 |
 False| `dict` | Yes* | Yes | No (Key) | $O(1)$ | 需要键值对映射，快速查找 |
 False| `set` | No | Yes | No | $O(1)$ | 需要去重，集合运算 |
 False
 False- Python 3.7+ 保证字典的插入顺序
 False
 False## 6. 数据结构的最佳实践
 False
 False### 6.1 列表的最佳实践
 False
 False- **使用列表推导式**：简洁高效地创建列表
 False- **避免频繁在列表开头插入**：这会导致 O(n) 的时间复杂度
 False- **使用 `append()` 而不是 `+`**：`append()` 是 O(1)，而 `+` 是 O(n)
 False- **使用 `in` 检查元素**：虽然是 O(n)，但对于小列表是可接受的
 False- **排序前考虑是否需要**：排序是 O(n log n) 操作
 False
 False### 6.2 元组的最佳实践
 False
 False- **使用元组存储相关数据**：如坐标、日期等
 False- **作为函数返回值**：方便多值返回
 False- **作为字典键**：因为元组不可变
 False- **使用拆包简化代码**：提高可读性
 False- **注意单元素元组的语法**：需要加逗号 `(1,)`
 False
 False### 6.3 字典的最佳实践
 False
 False- **使用 `get()` 方法**：避免键不存在的错误
 False- **使用字典推导式**：简洁高效地创建字典
 False- **遍历键值对使用 `items()`**：比分别遍历键和值更高效
 False- **使用 `defaultdict`**：处理不存在的键（来自 `collections` 模块）
 False- **使用 `OrderedDict`**：需要保持插入顺序的旧版本 Python（3.7+ 已不需要）
 False
 False### 6.4 集合的最佳实践
 False
 False- **用于去重**：快速去除重复元素
 False- **用于集合运算**：交集、并集、差集等
 False- **用于快速成员检查**：比列表的 `in` 操作更快
 False- **注意集合是无序的**：不要依赖元素顺序
 False- **元素必须是不可变的**：不能包含列表、字典等可变类型
 False
 False### 6.5 性能考虑
 False
 False- **小数据集**：选择最符合语义的数据结构
 False- **大数据集**：考虑查找、插入、删除的性能
 False- **内存使用**：元组比列表更节省内存
 False- **操作频率**：根据最频繁的操作选择合适的数据结构
 False
 False## 7. 高级数据结构
 False
 FalsePython 标准库中还提供了一些高级数据结构：
 False
 False### 7.1 有序字典 (`OrderedDict`)
 False
```python
 Truefrom collections import OrderedDict
 True
 True# 在 Python 3.7+ 中，普通字典已经保持插入顺序
 True# 但 OrderedDict 提供了额外的方法
 Trueod = OrderedDict()
 Trueod['a'] = 1
 Trueod['b'] = 2
 Trueod['c'] = 3
 True
 Trueprint(list(od.keys())) # 输出: ['a', 'b', 'c']
 True
 True# 移动元素到末尾
 Trueod.move_to_end('a')
 Trueprint(list(od.keys())) # 输出: ['b', 'c', 'a']
 True```

 False### 7.2 默认字典 (`defaultdict`)
 False
```python
 Truefrom collections import defaultdict
 True
 True# 自动为不存在的键提供默认值
 Trued = defaultdict(int) # 默认值为 0
 True
 Trued['a'] += 1
 Trued['b'] += 1
 Trueprint(d) # 输出: defaultdict(<class 'int'>, {'a': 1, 'b': 1})
 True
 True# 使用列表作为默认值
 Trued = defaultdict(list)
 Trued['a'].append(1)
 Trued['a'].append(2)
 Trued['b'].append(3)
 Trueprint(d) # 输出: defaultdict(<class 'list'>, {'a': [1, 2], 'b': [3]})
 True```

 False### 7.3 计数器 (`Counter`)
 False
```python
 Truefrom collections import Counter
 True
 True# 统计元素出现次数
 Truec = Counter(['a', 'b', 'a', 'c', 'b', 'a'])
 Trueprint(c) # 输出: Counter({'a': 3, 'b': 2, 'c': 1})
 True
 True# 访问次数
 Trueprint(c['a']) # 输出: 3
 True
 True# 获取最常见的元素
 Trueprint(c.most_common(2)) # 输出: [('a', 3), ('b', 2)]
 True```

 False### 7.4 双端队列 (`deque`)
 False
```python
 Truefrom collections import deque
 True
 True# 双端队列，支持高效的两端操作
 Truedq = deque([1, 2, 3])
 True
 True# 从右侧添加
 Truedq.append(4)
 Trueprint(dq) # 输出: deque([1, 2, 3, 4])
 True
 True# 从左侧添加
 Truedq.appendleft(0)
 Trueprint(dq) # 输出: deque([0, 1, 2, 3, 4])
 True
 True# 从右侧移除
 Trueprint(dq.pop()) # 输出: 4
 Trueprint(dq) # 输出: deque([0, 1, 2, 3])
 True
 True# 从左侧移除
 Trueprint(dq.popleft()) # 输出: 0
 Trueprint(dq) # 输出: deque([1, 2, 3])
 True```

 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 细化内置容器性能对比。
 False- 2026-04-05: 扩写内容，增加详细的列表、元组、字典、集合的创建、访问、修改、常用方法、性能特点和最佳实践等内容。

## 延伸阅读

- [[data-analysis/pandas|Pandas]]
 False