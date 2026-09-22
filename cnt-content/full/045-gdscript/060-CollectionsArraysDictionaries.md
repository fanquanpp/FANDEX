---
order: 60
title: 集合：数组与字典
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 掌握数组类型化数组紧缩数组与字典的语义差异，避开引用共享与遍历修改两大陷阱
author: fanquanpp
updated: '2026-09-22'
related: []
prerequisites: []
---

related:
  - 'gdscript/030-BasicDataTypesConversion'
  - 'gdscript/110-DesignPatternsInGDScript'
prerequisites:
  - 'gdscript/030-BasicDataTypesConversion'
---

数组与字典是 GDScript 最常用的两种容器，但它们各自有三种形态：无类型的普通 Array、限定元素类型的类型化数组、按元素类型紧密存放的紧缩数组（Packed）；字典同样有普通与类型化之分。形态不同，语义与性能特征差别很大。本篇把这些语义差异讲清楚，重点拆解两个新手最容易踩的陷阱——引用共享与遍历中修改容器——最后带你实现一个支持 for 循环的自定义迭代器。

## 学习目标

- 掌握数组索引、内容比较、拼接与引用语义，会用 duplicate() 正确复制；
- 理解类型化数组的规则：不能嵌套、跨类型赋值要用 assign()；
- 认识十种紧缩数组类型及其适用场景与自动转换行为；
- 掌握字典的顺序、键规则、Lua 风格初始化与点语法限制，会用类型化字典；
- 避开两大陷阱：迭代变量是副本、遍历中增删元素是未定义行为；
- 实现 _iter_init、_iter_next、_iter_get 三个方法，让自定义对象支持 for。

## 数组基础

```gdscript
var arr = ["a", "b", "c", "d"]
print(arr[0])      # a：索引从 0 开始
print(arr[-1])     # d：负索引从尾部计数
# print(arr[4])    # 越界：运行时报错
```

== 比较的是内容而不是引用——长度相同、每个位置上的值都相同，两个数组就相等：

```gdscript
print([1, 2, 3] == [1, 2, 3])    # true
print([1, 2, 3] == [3, 2, 1])    # false：顺序不同
```

用 + 和 += 拼接数组：

```gdscript
var a = [1, 2]
var b = a + [3]    # [1, 2, 3]，+ 生成新数组
b += [4]           # [1, 2, 3, 4]
```

## 引用语义与复制

数组是引用类型。把一个数组赋给另一个变量并不会复制数据，两个变量指向同一个数组：

```gdscript
var arr = [1, 2, 3]
var arr_2 = arr        # 没有复制，arr_2 与 arr 是同一个数组
arr_2.append(4)
print(arr)             # [1, 2, 3, 4]：修改连带
```

把数组作为参数传入函数同理——函数内通过参数修改数组，外部同样看得见（原因见函数与 Callable 篇：传的是引用的副本）。

需要真正的副本时用 duplicate()，它有深浅两档：

- duplicate() 浅拷贝：只复制最外层数组；如果元素本身还是数组或字典，这些内层容器仍与原数组共享，修改内层会连带；
- duplicate(true) 深拷贝：递归复制所有嵌套的数组与字典。

```gdscript
var nested = [[1, 2], [3, 4]]

var shallow = nested.duplicate()
shallow[0].append(99)
print(nested)          # [[1, 2, 99], [3, 4]]：浅拷贝的内层仍共享

var deep = nested.duplicate(true)
deep[1].append(88)
print(nested)          # [[1, 2, 99], [3, 4]]：深拷贝完全独立
```

## 类型化数组

声明时用 `Array[元素类型]` 限定元素类型。元素类型可以是 Variant、内置类型、自定义类或枚举：

```gdscript
var scores: Array[int] = [10, 20, 30]
var names: Array[String] = []
var nodes: Array[Node] = []
```

三条规则要记牢：

- 类型化数组不支持嵌套：`Array[Array[int]]` 非法；想要"数组的数组"，退回 `Array[Array]`；
- 普通无类型 Array 等价于 Array[Variant]；
- 两个不同类型的类型化数组不能直接赋值，即使元素类型是父子类关系也不行；要做转换，用 assign() 逐元素转换后赋值：

```gdscript
var ints: Array[int] = [1, 2, 3]
var floats: Array[float] = []

# floats = ints        # 报错：不同类型化数组之间不能直接赋值
floats.assign(ints)    # 逐元素转换成 float 后写入
```

## 紧缩数组

Packed 紧缩数组家族共十种类型，按元素类型命名：

```text
PackedByteArray      PackedInt32Array     PackedInt64Array
PackedFloat32Array   PackedFloat64Array   PackedStringArray
PackedVector2Array   PackedVector3Array   PackedVector4Array
PackedColorArray
```

优势与代价：

- 大数据量下迭代更快、内存更省——同类型元素紧密连续存放；
- 提供的方法比 Array 少，没有 map、filter 这类高阶方法。

要注意：数组字面量 `[]` 生成的是普通 Array，想得到紧缩数组必须显式标注类型，或使用构造函数：

```gdscript
var a: PackedInt32Array = [1, 2, 3]
var b = PackedInt32Array([1, 2, 3])
```

给紧缩数组赋值时，每个元素会被自动尝试转换成目标类型；转换失败的元素取该类型的默认值：

```gdscript
var packed := PackedInt32Array([1, "2", 3, "", 5, Node.new()])
print(packed)   # [1, 2, 3, 0, 5, 0]
```

"2" 能转成 2；"" 与 Node.new() 转不成 int，各取默认值 0。这种"静默降级"既是便利也是隐患——类型错误不会报错，排查时要留意。

性能排序：紧缩数组 > 类型化数组 > 无类型数组。实践建议：像素数据、寻路网格、大量采样点这类"量大、类型单一"的数据选紧缩数组；一般业务数据用类型化数组即可，方法更全。

最后留意一个 Godot 4.7 的行为变更：设置紧缩数组的元素不再触发整个紧缩数组属性的 setter。此前修改单个元素会把绑定了 setter 的属性整个触发一遍，4.7 起不再如此，依赖旧行为的代码需要调整。

## 字典基础

字典（Dictionary）存储键值对：

```gdscript
var points_dict = {"White": 50, "Yellow": 75}
```

核心规则：

- 保持插入顺序，遍历时按插入先后输出；
- 键唯一，重复写入同一个键会覆盖旧值；
- 键和值都可以是任意类型；
- 访问不存在的键直接报错；
- == 比较内容且与顺序无关：

```gdscript
print({"a": 1, "b": 2} == {"b": 2, "a": 1})   # true
```

字典支持 Lua 风格初始化——键写成不带引号的标识符：

```gdscript
var d = {test22 = "value", some_key = 2}
```

点语法访问字典有两个限制：

- 只有"合法标识符"形式的字符串键才能点访问：points_dict.White 等价于 points_dict["White"]；
- 用点语法新增键时，键的类型是 StringName 而不是 String——d.new_key = 1 实际写入的键是 &"new_key"。混用字符串键与点语法读写时，留意键类型是否一致。

for 直接迭代字典时，拿到的是键而不是值：

```gdscript
var groceries = {"Apple": 5, "Banana": 3}
for fruit in groceries:
    print(fruit)               # Apple、Banana：迭代的是键
    print(groceries[fruit])    # 要值就用键去取
```

## 类型化字典

Godot 4.4 起支持类型化字典，用 `Dictionary[键类型, 值类型]` 声明：

```gdscript
var typed: Dictionary[String, int] = {"Apple": 10}
```

规则与类型化数组一致：不支持嵌套；不同键值类型的字典之间不能直接赋值，需要转换时用 assign() 逐对转换写入：

```gdscript
var untyped = {"Apple": "10"}
typed.assign(untyped)    # 值被转换成 int
```

## 遍历陷阱

陷阱一：for 的迭代变量是元素的副本。

对值类型元素，修改迭代变量不会影响容器；对引用类型元素，迭代变量是"引用地址的副本"——通过它修改属性会影响原对象，但给它赋新实例或 null 不影响原数组：

```gdscript
for enemy in enemies:
    enemy.hp = 0       # 影响原对象：enemy 与数组元素指向同一个实例

for enemy in enemies:
    enemy = null       # 不影响原数组：只改了引用副本
```

要替换容器中的元素，用索引遍历：

```gdscript
for i in arr.size():
    arr[i] = arr[i] * 2    # 通过索引写回原数组
```

陷阱二：遍历过程中增删元素是未定义行为——可能跳过元素，也可能死循环。因为增删会改变容器的长度与元素位置，而迭代仍按旧位置推进。

确实需要边遍历边增删时，先 duplicate() 一份副本，遍历副本、修改原容器：

```gdscript
for item in my_array.duplicate():
    # 这里可以安全地对 my_array 增删
    pass
```

## 自定义迭代器

想让自定义对象支持 `for value in object`，实现三个方法即可：_iter_init、_iter_next、_iter_get。下面用 IntRange 类逐行讲解，它模拟 range() 的行为：

```gdscript
class IntRange:
    var start: int
    var stop: int

    func _init(start_value: int, stop_value: int) -> void:
        start = start_value
        stop = stop_value

    func _iter_init(iter: Array) -> bool:
        iter[0] = start
        return iter[0] <= stop

    func _iter_next(iter: Array) -> bool:
        iter[0] += 1
        return iter[0] <= stop

    func _iter_get(iter: Variant) -> Variant:
        return iter[0]

func _ready() -> void:
    for number in IntRange.new(2, 4):
        print(number)   # 2 3 4
```

for 循环的执行流程：

1. 开始时调用 _iter_init(iter)。iter 是本次循环专属的数组，用来存放迭代状态：这里把游标初始化为 start，返回 true 表示"有东西可迭代"，返回 false 则一次都不进入循环体；
2. 每轮结束前调用 _iter_next(iter)：游标加 1，返回 true 继续下一轮，返回 false 结束循环；
3. 每轮取值时调用 _iter_get：返回当前游标处的值，赋给循环变量 number。

注意一个设计细节：迭代状态（游标）存放在 for 传入的数组里，而不是对象的成员变量。如果把游标存在对象字段里，两个 for 同时迭代同一个对象就会共用同一个游标、互相覆盖；放进传入的数组，每次迭代各持一份状态，互不干扰。

## 小结

- 数组索引从 0 开始、负索引从尾部计数、越界报错；== 比较内容（长度、位置、值全同才相等）；+ 与 += 拼接。
- 数组是引用类型：赋值与传参都不复制，修改连带；duplicate() 浅拷贝只复制外层、内层嵌套仍共享，duplicate(true) 递归复制嵌套结构。
- 类型化数组支持 Variant、内置类型、自定义类与枚举；不能嵌套（Array[Array[int]] 非法，可用 Array[Array]）；跨类型赋值用 assign()；普通 Array 等价 Array[Variant]。
- 十种 Packed 紧缩数组大数据量下更快更省内存，但方法少（没有 map/filter）；声明须显式类型或构造函数；元素自动转换、失败取默认值；性能上紧缩数组 > 类型化数组 > 无类型数组；4.7 起设置元素不再触发整个属性 setter。
- 字典保持插入顺序、键唯一、键值任意类型、访问不存在的键报错、== 与顺序无关；Lua 风格初始化键不加引号；点语法仅限合法标识符字符串键，且点语法新增键是 StringName；for 迭代的是键；类型化字典 Dictionary[K, V]（4.4+）规则同类型化数组。
- 迭代变量是副本：改属性影响原对象，赋新实例或 null 不影响；要改元素用索引遍历；遍历中增删元素是未定义行为，需要时先 duplicate()。
- 自定义迭代器实现 _iter_init、_iter_next、_iter_get 即可支持 for；迭代状态存传入的数组，避免嵌套遍历互相覆盖。

## 参考链接

- [GDScript 教程：数组（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：紧缩数组（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：字典（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：迭代器接口（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GDScript 静态类型（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)
- [升级到 Godot 4.7（官方文档）](https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.7.html)
