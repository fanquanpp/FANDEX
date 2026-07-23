# Kotlin 集合进阶

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 聚合操作

**基本写法：sum 求和**
`<collection>.sum()`
```kotlin
// 求和
val sum = numbers.sum();
```

**基本写法：sumBy 条件求和**
`<collection>.sumOf { <selector> }`
```kotlin
// 按条件求和
val totalAge = people.sumOf { it.age };
```

**基本写法：maxOrNull 最大值**
`<collection>.maxOrNull()`
```kotlin
// 获取最大值（空集合返回 null）
val max = numbers.maxOrNull();
```

**基本写法：maxByOrNull 条件最大值**
`<collection>.maxByOrNull { <selector> }`
```kotlin
// 按条件获取最大元素
val oldest = people.maxByOrNull { it.age };
```

**基本写法：minOrNull 最小值**
`<collection>.minOrNull()`
```kotlin
// 获取最小值（空集合返回 null）
val min = numbers.minOrNull();
```

**基本写法：minByOrNull 条件最小值**
`<collection>.minByOrNull { <selector> }`
```kotlin
// 按条件获取最小元素
val youngest = people.minByOrNull { it.age };
```

**基本写法：average 平均值**
`<collection>.average()`
```kotlin
// 计算平均值
val avg = numbers.average();
```

**基本写法：count 计数**
`<collection>.count()`
```kotlin
// 计算元素数量
val count = numbers.count();
```

**基本写法：count 条件计数**
`<collection>.count { <predicate> }`
```kotlin
// 计算满足条件的元素数量
val count = numbers.count { it > 3 };
```

**基本写法：fold 累积**
`<collection>.fold(<initial>) { <acc>, <item> -> <body> }`
```kotlin
// 从左到右累积
val sum = numbers.fold(0) { acc, num -> acc + num };
```

**基本写法：reduce 累积**
`<collection>.reduce { <acc>, <item> -> <body> }`
```kotlin
// 从左到右累积（无初始值）
val sum = numbers.reduce { acc, num -> acc + num };
```

**基本写法：reduceOrNull 安全累积**
`<collection>.reduceOrNull { <acc>, <item> -> <body> }`
```kotlin
// 安全累积（空集合返回 null）
val sum = numbers.reduceOrNull { acc, num -> acc + num };
```

**基本写法：joinToString 连接字符串**
`<collection>.joinToString(<separator>)`
```kotlin
// 连接为字符串
val str = numbers.joinToString(", ");
```

**换行写法：joinToString 带前缀后缀**
`<collection>.joinToString(<separator>, <prefix>, <postfix>)`
```kotlin
// 连接为字符串带前缀后缀
val str = numbers.joinToString(
    separator = ", ",
    prefix = "[",
    postfix = "]"
);
```

---

## 判断操作

**基本写法：any 判断是否有元素**
`<collection>.any()`
```kotlin
// 判断集合是否有元素
val hasElements = numbers.any();
```

**基本写法：any 条件判断**
`<collection>.any { <predicate> }`
```kotlin
// 判断是否有满足条件的元素
val hasEven = numbers.any { it % 2 == 0 };
```

**基本写法：all 全部满足**
`<collection>.all { <predicate> }`
```kotlin
// 判断是否全部满足条件
val allPositive = numbers.all { it > 0 };
```

**基本写法：none 全不满足**
`<collection>.none { <predicate> }`
```kotlin
// 判断是否全不满足条件
val noneNegative = numbers.none { it < 0 };
```

**基本写法：contains 检查包含**
`<collection>.contains(<element>)`
```kotlin
// 检查是否包含元素
numbers.contains(5);
```

---

## 序列（Sequence）

**基本写法：asSequence 转换为序列**
`<collection>.asSequence()`
```kotlin
// 转换为序列（惰性求值）
val sequence = numbers.asSequence();
```

**基本写法：sequenceOf 创建序列**
`sequenceOf(<elements>)`
```kotlin
// 创建序列
val seq = sequenceOf(1, 2, 3);
```

**换行写法：generateSequence 生成序列**
`generateSequence(<seed>) { <next> }`
```kotlin
// 生成序列
val naturals = generateSequence(1) { it + 1 };
```

**换行写法：yield 构建序列**
`sequence { yield(<value>); yieldAll(<collection>) }`
```kotlin
// 使用 yield 构建序列
val seq = sequence {
    yield(1);
    yield(2);
    yieldAll(listOf(3, 4, 5));
}
```

**基本写法：序列操作链**
`<sequence>.filter { <predicate> }.map { <transform> }.toList()`
```kotlin
// 序列操作链（惰性求值）
val result = numbers.asSequence()
    .filter { it > 2 }
    .map { it * 2 }
    .toList();
```

**基本写法：take 限制序列**
`<sequence>.take(<n>)`
```kotlin
// 限制序列元素数量
val first5 = naturals.take(5).toList();
```

---

## 集合转换

**基本写法：toSet 转换为 Set**
`<collection>.toSet()`
```kotlin
// 转换为 Set（去重）
val set = numbers.toSet();
```

**基本写法：toList 转换为 List**
`<collection>.toList()`
```kotlin
// 转换为 List
val list = set.toList();
```

**基本写法：toMap 转换为 Map**
`<list>.toMap()`
```kotlin
// Pair 列表转换为 Map
val map = listOf("a" to 1, "b" to 2).toMap();
```

**基本写法：toMutableList 转换为可变列表**
`<collection>.toMutableList()`
```kotlin
// 转换为可变列表
val mutable = numbers.toMutableList();
```

**基本写法：associate 转换为 Map**
`<collection>.associate { <transform> }`
```kotlin
// 转换为 Map
val map = people.associate { it.name to it.age };
```

**基本写法：associateBy 按 key 转换**
`<collection>.associateBy { <keySelector> }`
```kotlin
// 按 key 转换为 Map
val map = people.associateBy { it.name };
```

**基本写法：associateWith 按 value 转换**
`<collection>.associateWith { <valueSelector> }`
```kotlin
// 按 value 转换为 Map
val map = numbers.associateWith { it * 2 };
```

---

## 集合遍历

**基本写法：forEach 遍历**
`<collection>.forEach { <body> }`
```kotlin
// 遍历集合
numbers.forEach { println(it); }
```

**基本写法：forEachIndexed 带索引遍历**
`<collection>.forEachIndexed { <index>, <item> -> <body> }`
```kotlin
// 带索引遍历
numbers.forEachIndexed { index, value ->
    println("$index: $value");
}
```

**基本写法：for-in 遍历**
`for (<item> in <collection>) { <body> }`
```kotlin
// for-in 遍历
for (item in numbers) {
    println(item);
}
```

**基本写法：遍历 Map**
`for ((<key>, <value>) in <map>) { <body> }`
```kotlin
// 遍历 Map 键值对
for ((key, value) in map) {
    println("$key = $value");
}
```

**基本写法：遍历 List 索引**
`for (<index> in <list>.indices) { <body> }`
```kotlin
// 遍历 List 索引
for (i in numbers.indices) {
    println("Index $i: ${numbers[i]}");
}
```

**基本写法：iterator 迭代器**
`val <iterator> = <collection>.iterator(); while (<iterator>.hasNext()) { <body> }`
```kotlin
// 使用迭代器遍历
val iterator = numbers.iterator();
while (iterator.hasNext()) {
    println(iterator.next());
}
```

---

## 集合修改

**基本写法：add 添加元素**
`<mutableList>.add(<element>)`
```kotlin
// 添加元素到末尾
mutableList.add(4);
```

**基本写法：add 指定位置添加**
`<mutableList>.add(<index>, <element>)`
```kotlin
// 在指定位置添加元素
mutableList.add(0, 0);
```

**基本写法：addAll 添加多个元素**
`<mutableList>.addAll(<collection>)`
```kotlin
// 添加多个元素
mutableList.addAll(listOf(5, 6, 7));
```

**基本写法：remove 移除元素**
`<mutableList>.remove(<element>)`
```kotlin
// 移除指定元素
mutableList.remove(3);
```

**基本写法：removeAt 移除指定位置**
`<mutableList>.removeAt(<index>)`
```kotlin
// 移除指定位置的元素
mutableList.removeAt(0);
```

**基本写法：clear 清空集合**
`<mutableList>.clear()`
```kotlin
// 清空集合
mutableList.clear();
```

**基本写法：set 修改元素**
`<mutableList>[<index>] = <value>`
```kotlin
// 修改指定位置的元素
mutableList[0] = 10;
```

**基本写法：Map 修改**
`<mutableMap>[<key>] = <value>`
```kotlin
// 修改 Map 值
mutableMap["a"] = 10;
```

**基本写法：putIfAbsent 条件添加**
`<mutableMap>.putIfAbsent(<key>, <value>)`
```kotlin
// 键不存在时添加
mutableMap.putIfAbsent("c", 3);
```

**基本写法：remove 移除 Map 条目**
`<mutableMap>.remove(<key>)`
```kotlin
// 移除 Map 条目
mutableMap.remove("a");
```
