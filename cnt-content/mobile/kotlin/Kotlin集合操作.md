# Kotlin 集合操作速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 集合创建

**基本写法：listOf 创建只读列表**
`listOf(<elements>)`
```kotlin
// 创建只读列表
val numbers = listOf(1, 2, 3, 4, 5);
```

**基本写法：mutableListOf 创建可变列表**
`mutableListOf(<elements>)`
```kotlin
// 创建可变列表
val mutableList = mutableListOf(1, 2, 3);
mutableList.add(4);
```

**基本写法：setOf 创建只读集合**
`setOf(<elements>)`
```kotlin
// 创建只读集合（去重）
val set = setOf(1, 2, 3, 3);  // {1, 2, 3}
```

**基本写法：mutableSetOf 创建可变集合**
`mutableSetOf(<elements>)`
```kotlin
// 创建可变集合
val mutableSet = mutableSetOf(1, 2, 3);
mutableSet.add(4);
```

**基本写法：mapOf 创建只读映射**
`mapOf(<key1> to <value1>, <key2> to <value2>)`
```kotlin
// 创建只读映射
val map = mapOf("a" to 1, "b" to 2);
```

**基本写法：mutableMapOf 创建可变映射**
`mutableMapOf(<key1> to <value1>)`
```kotlin
// 创建可变映射
val mutableMap = mutableMapOf("a" to 1);
mutableMap["b"] = 2;
```

**基本写法：emptyList 创建空列表**
`emptyList<<Type>>()`
```kotlin
// 创建空列表
val empty: List<String> = emptyList();
```

**基本写法：arrayListOf 创建 ArrayList**
`arrayListOf(<elements>)`
```kotlin
// 创建 ArrayList
val arrayList = arrayListOf(1, 2, 3);
```

**基本写法：linkedMapOf 创建 LinkedHashMap**
`linkedMapOf(<key1> to <value1>)`
```kotlin
// 创建 LinkedHashMap（保持插入顺序）
val linkedMap = linkedMapOf("a" to 1, "b" to 2);
```

---

## 集合基本操作

**基本写法：size 获取大小**
`<collection>.size`
```kotlin
// 获取集合大小
val size = numbers.size;
```

**基本写法：contains 检查包含**
`<collection>.contains(<element>)`
```kotlin
// 检查是否包含元素
numbers.contains(3);
```

**基本写法：in 检查包含**
`<element> in <collection>`
```kotlin
// 使用 in 检查包含
3 in numbers;
```

**基本写法：!in 检查不包含**
`<element> !in <collection>`
```kotlin
// 使用 !in 检查不包含
6 !in numbers;
```

**基本写法：isEmpty 检查空集合**
`<collection>.isEmpty()`
```kotlin
// 检查集合是否为空
numbers.isEmpty();
```

**基本写法：isNotEmpty 检查非空集合**
`<collection>.isNotEmpty()`
```kotlin
// 检查集合是否非空
numbers.isNotEmpty();
```

**基本写法：get 获取元素**
`<list>[<index>]`
```kotlin
// 通过索引获取元素
val first = numbers[0];
```

**基本写法：get 获取 Map 值**
`<map>[<key>]`
```kotlin
// 通过键获取值
val value = map["a"];
```

---

## 过滤操作

**基本写法：filter 过滤元素**
`<collection>.filter { <predicate> }`
```kotlin
// 过滤满足条件的元素
val evens = numbers.filter { it % 2 == 0 };
```

**基本写法：filterNot 反向过滤**
`<collection>.filterNot { <predicate> }`
```kotlin
// 过滤不满足条件的元素
val odds = numbers.filterNot { it % 2 == 0 };
```

**基本写法：filterNotNull 过滤 null**
`<collection>.filterNotNull()`
```kotlin
// 过滤 null 值
val list: List<String?> = listOf("a", null, "b");
val nonNull = list.filterNotNull();
```

**基本写法：filterIndexed 带索引过滤**
`<collection>.filterIndexed { <index>, <item> -> <predicate> }`
```kotlin
// 带索引过滤
val filtered = numbers.filterIndexed { index, _ -> index % 2 == 0 };
```

**基本写法：filterIsInstance 过滤类型**
`<collection>.filterIsInstance<<Type>>()`
```kotlin
// 过滤指定类型
val mixed: List<Any> = listOf(1, "a", 2, "b");
val strings = mixed.filterIsInstance<String>();
```

**基本写法：take 获取前 n 个**
`<collection>.take(<n>)`
```kotlin
// 获取前 n 个元素
val first3 = numbers.take(3);
```

**基本写法：takeLast 获取后 n 个**
`<collection>.takeLast(<n>)`
```kotlin
// 获取后 n 个元素
val last3 = numbers.takeLast(3);
```

**基本写法：drop 丢弃前 n 个**
`<collection>.drop(<n>)`
```kotlin
// 丢弃前 n 个元素
val remaining = numbers.drop(2);
```

**基本写法：dropLast 丢弃后 n 个**
`<collection>.dropLast(<n>)`
```kotlin
// 丢弃后 n 个元素
val remaining = numbers.dropLast(2);
```

**基本写法：takeWhile 条件获取**
`<collection>.takeWhile { <predicate> }`
```kotlin
// 满足条件时获取，遇到不满足时停止
val result = numbers.takeWhile { it < 4 };
```

**基本写法：dropWhile 条件丢弃**
`<collection>.dropWhile { <predicate> }`
```kotlin
// 满足条件时丢弃，遇到不满足时停止
val result = numbers.dropWhile { it < 4 };
```

**基本写法：distinct 去重**
`<collection>.distinct()`
```kotlin
// 去重
val unique = listOf(1, 2, 2, 3, 3).distinct();
```

**基本写法：distinctBy 按条件去重**
`<collection>.distinctBy { <selector> }`
```kotlin
// 按条件去重
val people = listOf(Person("Alice", 25), Person("Bob", 25));
val uniqueAges = people.distinctBy { it.age };
```

---

## 映射操作

**基本写法：map 映射元素**
`<collection>.map { <transform> }`
```kotlin
// 映射元素
val doubled = numbers.map { it * 2 };
```

**基本写法：mapIndexed 带索引映射**
`<collection>.mapIndexed { <index>, <item> -> <transform> }`
```kotlin
// 带索引映射
val indexed = numbers.mapIndexed { index, value -> "$index: $value" };
```

**基本写法：mapNotNull 映射并过滤 null**
`<collection>.mapNotNull { <transform> }`
```kotlin
// 映射并过滤 null
val lengths = listOf("a", null, "bb").mapNotNull { it?.length };
```

**基本写法：flatMap 扁平映射**
`<collection>.flatMap { <transform> }`
```kotlin
// 扁平映射
val nested = listOf(listOf(1, 2), listOf(3, 4));
val flat = nested.flatMap { it };
```

**基本写法：flatten 扁平化**
`<collection>.flatten()`
```kotlin
// 扁平化嵌套集合
val flat = nested.flatten();
```

**基本写法：groupBy 分组**
`<collection>.groupBy { <keySelector> }`
```kotlin
// 按条件分组
val grouped = numbers.groupBy { if (it % 2 == 0) "even" else "odd" };
```

**基本写法：groupBy 带值转换**
`<collection>.groupBy({ <keySelector> }, { <valueTransform> })`
```kotlin
// 分组并转换值
val grouped = people.groupBy({ it.age }, { it.name });
```

**基本写法：chunked 分块**
`<collection>.chunked(<size>)`
```kotlin
// 分块处理
val chunks = numbers.chunked(2);
```

**基本写法：windowed 滑动窗口**
`<collection>.windowed(<size>, <step>, <partialWindows>)`
```kotlin
// 滑动窗口
val windows = numbers.windowed(3, 1, false);
```

**基本写法：zip 合并集合**
`<list1>.zip(<list2>)`
```kotlin
// 合并两个集合
val names = listOf("Alice", "Bob");
val ages = listOf(25, 30);
val pairs = names.zip(ages);
```

**基本写法：zip 合并并转换**
`<list1>.zip(<list2>) { <a>, <b> -> <transform> }`
```kotlin
// 合并并转换
val combined = names.zip(ages) { name, age -> "$name: $age" };
```

**基本写法：unzip 拆分**
`<list>.unzip()`
```kotlin
// 拆分 Pair 列表
val pairs = listOf("a" to 1, "b" to 2);
val (keys, values) = pairs.unzip();
```

**基本写法：partition 分区**
`<collection>.partition { <predicate> }`
```kotlin
// 按条件分区为两个列表
val (evens, odds) = numbers.partition { it % 2 == 0 };
```

---

## 查找操作

**基本写法：find 查找第一个匹配**
`<collection>.find { <predicate> }`
```kotlin
// 查找第一个匹配元素
val first = numbers.find { it > 3 };
```

**基本写法：findLast 查找最后一个匹配**
`<collection>.findLast { <predicate> }`
```kotlin
// 查找最后一个匹配元素
val last = numbers.findLast { it > 3 };
```

**基本写法：firstOrNull 获取第一个元素**
`<collection>.firstOrNull()`
```kotlin
// 获取第一个元素，空列表返回 null
val first = numbers.firstOrNull();
```

**基本写法：firstOrNull 条件查找**
`<collection>.firstOrNull { <predicate> }`
```kotlin
// 查找第一个满足条件的元素
val first = numbers.firstOrNull { it > 3 };
```

**基本写法：lastOrNull 获取最后一个元素**
`<collection>.lastOrNull()`
```kotlin
// 获取最后一个元素，空列表返回 null
val last = numbers.lastOrNull();
```

**基本写法：lastOrNull 条件查找**
`<collection>.lastOrNull { <predicate> }`
```kotlin
// 查找最后一个满足条件的元素
val last = numbers.lastOrNull { it > 3 };
```

**基本写法：indexOf 查找索引**
`<list>.indexOf(<element>)`
```kotlin
// 查找元素索引
val index = numbers.indexOf(3);
```

**基本写法：binarySearch 二分查找**
`<list>.binarySearch(<element>)`
```kotlin
// 二分查找（列表需有序）
val index = sortedList.binarySearch(5);
```

**基本写法：elementAtOrNull 安全获取**
`<list>.elementAtOrNull(<index>)`
```kotlin
// 安全获取指定索引元素
val element = numbers.elementAtOrNull(10);
```

**基本写法：elementAtOrElse 条件获取**
`<list>.elementAtOrElse(<index>) { <default> }`
```kotlin
// 获取指定索引元素，越界返回默认值
val element = numbers.elementAtOrElse(10) { -1 };
```

---

## 排序操作

**基本写法：sorted 升序排序**
`<collection>.sorted()`
```kotlin
// 升序排序
val sorted = numbers.sorted();
```

**基本写法：sortedDescending 降序排序**
`<collection>.sortedDescending()`
```kotlin
// 降序排序
val sorted = numbers.sortedDescending();
```

**基本写法：sortedBy 按条件升序**
`<collection>.sortedBy { <selector> }`
```kotlin
// 按条件升序排序
val sorted = people.sortedBy { it.age };
```

**基本写法：sortedByDescending 按条件降序**
`<collection>.sortedByDescending { <selector> }`
```kotlin
// 按条件降序排序
val sorted = people.sortedByDescending { it.age };
```

**基本写法：sortedWith 自定义排序**
`<collection>.sortedWith(<comparator>)`
```kotlin
// 自定义比较器排序
val sorted = people.sortedWith(compareBy({ it.age }, { it.name }));
```

**基本写法：reversed 反转**
`<collection>.reversed()`
```kotlin
// 反转集合
val reversed = numbers.reversed();
```

**基本写法：shuffled 随机打乱**
`<collection>.shuffled()`
```kotlin
// 随机打乱集合
val shuffled = numbers.shuffled();
```
