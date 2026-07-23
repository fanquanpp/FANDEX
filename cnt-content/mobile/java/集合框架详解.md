# Java 集合框架详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## ArrayList

**基本写法：创建 ArrayList**
`List<<类型>> <变量> = new ArrayList<>();`
```java
// 创建字符串 ArrayList
List<String> list = new ArrayList<>();
```

---

**基本写法：添加元素**
`<list>.add(<元素>);`
```java
// 向列表末尾添加元素
list.add("Apple");
```

---

**基本写法：指定位置添加**
`<list>.add(<索引>, <元素>);`
```java
// 在指定位置插入元素
list.add(0, "Banana");
```

---

**基本写法：获取元素**
`<list>.get(<索引>);`
```java
// 获取指定位置的元素
String item = list.get(0);
```

---

**基本写法：修改元素**
`<list>.set(<索引>, <元素>);`
```java
// 替换指定位置的元素
list.set(0, "Cherry");
```

---

**基本写法：删除元素**
`<list>.remove(<索引>);`
```java
// 删除指定位置的元素
list.remove(0);
```

---

**基本写法：获取大小**
`<list>.size();`
```java
// 获取列表元素个数
int size = list.size();
```

---

**基本写法：判断包含**
`<list>.contains(<元素>);`
```java
// 判断列表是否包含元素
boolean has = list.contains("Apple");
```

---

**基本写法：清空列表**
`<list>.clear();`
```java
// 清空列表所有元素
list.clear();
```

---

**基本写法：遍历 ArrayList**
`for (<类型> <变量> : <list>) { }`
```java
// 增强 for 循环遍历
for (String item : list) {
}
```

---

## LinkedList

**基本写法：创建 LinkedList**
`LinkedList<<类型>> <变量> = new LinkedList<>();`
```java
// 创建 LinkedList
LinkedList<String> linked = new LinkedList<>();
```

---

**基本写法：头部添加**
`<list>.addFirst(<元素>);`
```java
// 在列表头部添加元素
linked.addFirst("First");
```

---

**基本写法：尾部添加**
`<list>.addLast(<元素>);`
```java
// 在列表尾部添加元素
linked.addLast("Last");
```

---

**基本写法：获取头部**
`<list>.getFirst();`
```java
// 获取列表头部元素
String first = linked.getFirst();
```

---

**基本写法：获取尾部**
`<list>.getLast();`
```java
// 获取列表尾部元素
String last = linked.getLast();
```

---

**基本写法：删除头部**
`<list>.removeFirst();`
```java
// 删除并返回头部元素
String removed = linked.removeFirst();
```

---

## HashMap

**基本写法：创建 HashMap**
`Map<<键类型>, <值类型>> <变量> = new HashMap<>();`
```java
// 创建 HashMap
Map<String, Integer> map = new HashMap<>();
```

---

**基本写法：添加键值对**
`<map>.put(<键>, <值>);`
```java
// 向 Map 添加键值对
map.put("Alice", 25);
```

---

**基本写法：获取值**
`<map>.get(<键>);`
```java
// 根据键获取值
Integer age = map.get("Alice");
```

---

**基本写法：删除键值对**
`<map>.remove(<键>);`
```java
// 根据键删除键值对
map.remove("Alice");
```

---

**基本写法：判断包含键**
`<map>.containsKey(<键>);`
```java
// 判断是否包含指定键
boolean has = map.containsKey("Alice");
```

---

**基本写法：判断包含值**
`<map>.containsValue(<值>);`
```java
// 判断是否包含指定值
boolean has = map.containsValue(25);
```

---

**基本写法：获取所有键**
`<map>.keySet();`
```java
// 获取所有键的集合
Set<String> keys = map.keySet();
```

---

**基本写法：获取所有值**
`<map>.values();`
```java
// 获取所有值的集合
Collection<Integer> values = map.values();
```

---

**基本写法：获取所有键值对**
`<map>.entrySet();`
```java
// 获取所有键值对集合
Set<Map.Entry<String, Integer>> entries = map.entrySet();
```

---

**基本写法：遍历 Map**
`for (Map.Entry<<键类型>, <值类型>> <变量> : <map>.entrySet()) { }`
```java
// 遍历 Map 的键值对
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    String key = entry.getKey();
    Integer value = entry.getValue();
}
```

---

## HashSet

**基本写法：创建 HashSet**
`Set<<类型>> <变量> = new HashSet<>();`
```java
// 创建 HashSet
Set<String> set = new HashSet<>();
```

---

**基本写法：添加元素**
`<set>.add(<元素>);`
```java
// 向 Set 添加元素
set.add("Apple");
```

---

**基本写法：删除元素**
`<set>.remove(<元素>);`
```java
// 从 Set 删除元素
set.remove("Apple");
```

---

**基本写法：判断包含**
`<set>.contains(<元素>);`
```java
// 判断 Set 是否包含元素
boolean has = set.contains("Apple");
```

---

**基本写法：遍历 Set**
`for (<类型> <变量> : <set>) { }`
```java
// 遍历 Set
for (String item : set) {
}
```

---

## TreeMap

**基本写法：创建 TreeMap**
`Map<<键类型>, <值类型>> <变量> = new TreeMap<>();`
```java
// 创建按键排序的 TreeMap
Map<String, Integer> treeMap = new TreeMap<>();
```

---

**基本写法：获取第一个键**
`((TreeMap<<K>, <V>>) <map>).firstKey();`
```java
// 获取最小的键
String first = ((TreeMap<String, Integer>) treeMap).firstKey();
```

---

**基本写法：获取最后一个键**
`((TreeMap<<K>, <V>>) <map>).lastKey();`
```java
// 获取最大的键
String last = ((TreeMap<String, Integer>) treeMap).lastKey();
```

---

## 集合工具

**基本写法：排序 List**
`Collections.sort(<list>);`
```java
// 对 List 进行升序排序
Collections.sort(list);
```

---

**基本写法：降序排序**
`Collections.sort(<list>, Collections.reverseOrder());`
```java
// 对 List 进行降序排序
Collections.sort(list, Collections.reverseOrder());
```

---

**基本写法：反转 List**
`Collections.reverse(<list>);`
```java
// 反转 List 中元素的顺序
Collections.reverse(list);
```

---

**基本写法：打乱顺序**
`Collections.shuffle(<list>);`
```java
// 随机打乱 List 中元素的顺序
Collections.shuffle(list);
```

---

**基本写法：查找最大值**
`Collections.max(<list>);`
```java
// 查找 List 中的最大值
String max = Collections.max(list);
```

---

**基本写法：查找最小值**
`Collections.min(<list>);`
```java
// 查找 List 中的最小值
String min = Collections.min(list);
```

---

**基本写法：填充 List**
`Collections.fill(<list>, <值>);`
```java
// 用指定值填充整个 List
Collections.fill(list, "Default");
```

---

**基本写法：不可变 List**
`List.of(<元素1>, <元素2>)`
```java
// Java 9+ 创建不可变 List
List<String> immutable = List.of("A", "B", "C");
```

---

**基本写法：不可变 Set**
`Set.of(<元素1>, <元素2>)`
```java
// Java 9+ 创建不可变 Set
Set<String> immutable = Set.of("A", "B", "C");
```

---

**基本写法：不可变 Map**
`Map.of(<键1>, <值1>, <键2>, <值2>)`
```java
// Java 9+ 创建不可变 Map
Map<String, Integer> immutable = Map.of("A", 1, "B", 2);
```

---

## 迭代器

**基本写法：获取迭代器**
`<集合>.iterator()`
```java
// 获取集合的迭代器
Iterator<String> it = list.iterator();
```

---

**基本写法：迭代器遍历**
`while (<迭代器>.hasNext()) { <迭代器>.next(); }`
```java
// 使用迭代器遍历
while (it.hasNext()) {
    String item = it.next();
}
```

---

**基本写法：迭代器删除**
`<迭代器>.remove();`
```java
// 使用迭代器安全删除元素
while (it.hasNext()) {
    String item = it.next();
    it.remove();
}
```

---

## 集合转换

**基本写法：List 转数组**
`<list>.toArray(new <类型>[0]);`
```java
// 将 List 转换为数组
String[] arr = list.toArray(new String[0]);
```

---

**基本写法：数组转 List**
`Arrays.asList(<数组>);`
```java
// 将数组转换为 List
String[] arr = {"A", "B"};
List<String> list = Arrays.asList(arr);
```

---

**基本写法：List 转 Set**
`new HashSet<>(<list>);`
```java
// 将 List 转换为 Set 去重
Set<String> set = new HashSet<>(list);
```

---

## 集合流操作

**基本写法：创建流**
`<集合>.stream()`
```java
// 从集合创建流
list.stream();
```

---

**基本写法：过滤**
`<stream>.filter(<条件>)`
```java
// 过滤满足条件的元素
list.stream().filter(s -> s.length() > 3);
```

---

**基本写法：映射**
`<stream>.map(<映射函数>)`
```java
// 将元素映射为新元素
list.stream().map(String::toUpperCase);
```

---

**基本写法：收集为 List**
`<stream>.collect(Collectors.toList())`
```java
// 将流收集为 List
List<String> result = list.stream().collect(Collectors.toList());
```

---

**基本写法：计数**
`<stream>.count()`
```java
// 统计流中元素个数
long count = list.stream().count();
```
