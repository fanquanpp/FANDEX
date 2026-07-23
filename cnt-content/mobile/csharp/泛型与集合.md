# C# 泛型与集合

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型类与方法

**基本写法：泛型类定义**
`public class <类名><T> { ... }`
```csharp
// 定义类型参数化的泛型类
public class Repository<T>
{
    private readonly List<T> _items = [];
}
```

---

**基本写法：泛型类带约束**
`public class <类名><T> where T : <约束> { ... }`
```csharp
// 定义带约束的泛型类
public class Repository<T> where T : class
{
    public T? FindById(int id) => _items.FirstOrDefault();
}
```

---

**基本写法：泛型方法**
`public static <返回类型> <方法名><T>(<参数>)`
```csharp
// 方法定义类型参数
public static void Swap<T>(ref T a, ref T b)
{
    (a, b) = (b, a);
}
```

---

**基本写法：泛型方法带约束**
`public static <返回类型> <方法名><T>(<参数>) where T : <约束>`
```csharp
// 带约束的泛型方法
public static T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) >= 0 ? a : b;
}
```

---

**基本写法：多类型参数泛型方法**
`public static <返回类型> <方法名><T1, T2>(<参数>)`
```csharp
// 多类型参数的泛型方法
public static TResult Convert<TInput, TResult>(
    TInput input, Func<TInput, TResult> converter)
{
    return converter(input);
}
```

---

## 泛型约束

**基本写法：class 引用类型约束**
`where T : class`
```csharp
// 限制泛型参数为引用类型
public class Repository<T> where T : class { }
```

---

**基本写法：struct 值类型约束**
`where T : struct`
```csharp
// 限制泛型参数为值类型
public class NumberProcessor<T> where T : struct { }
```

---

**基本写法：new 无参构造约束**
`where T : new()`
```csharp
// 限制泛型参数有无参公共构造函数
public class Factory<T> where T : new()
{
    public T Create() => new T();
}
```

---

**基本写法：基类约束**
`where T : <基类>`
```csharp
// 限制泛型参数继承自指定基类
public class AnimalProcessor<T> where T : Animal { }
```

---

**基本写法：接口约束**
`where T : <接口>`
```csharp
// 限制泛型参数实现指定接口
public class Comparer<T> where T : IComparable<T> { }
```

---

**基本写法：unmanaged 约束**
`where T : unmanaged`
```csharp
// 限制泛型参数为非托管类型
public class NativeBuffer<T> where T : unmanaged { }
```

---

**单行写法：多约束**
`where <参数> : <约束1>, <约束2>`
```csharp
// 单行声明多个约束
public class Service<T> where T : class, ICloneable { }
```

---

**换行写法：多类型参数多约束**
`where <参数1> : <约束> where <参数2> : <约束>`
```csharp
// 换行声明多类型参数的约束
public class Service<TInput, TOutput>
    where TInput : class, ICloneable
    where TOutput : new()
{
    public TOutput Process(TInput input) => new TOutput();
}
```

---

## 协变与逆变

**基本写法：协变接口**
`interface <接口名><out T> { T <方法>(); }`
```csharp
// 协变接口允许子类型到父类型转换
public interface IProducer<out T>
{
    T Produce();
}
```

---

**基本写法：协变接口转换**
`<父接口> <变量> = <实现类>;`
```csharp
// 协变允许 string producer 转换为 object producer
IProducer<object> producer = new StringProducer();
```

---

**基本写法：IEnumerable 协变**
`IEnumerable<<父类型>> <变量> = <子类型集合>;`
```csharp
// 内置 IEnumerable<out T> 协变
IEnumerable<string> strings = new List<string> { "a", "b" };
IEnumerable<object> objects = strings;
```

---

**基本写法：逆变接口**
`interface <接口名><in T> { void <方法>(T <参数>); }`
```csharp
// 逆变接口允许父类型到子类型转换
public interface IConsumer<in T>
{
    void Consume(T item);
}
```

---

**基本写法：逆变接口转换**
`<子接口> <变量> = <实现类>;`
```csharp
// 逆变允许 object consumer 转换为 string consumer
IConsumer<string> consumer = new ObjectConsumer();
```

---

## List\<T\>

**基本写法：List 初始化**
`var <变量> = new List<<类型>> { <元素>, ... };`
```csharp
// 初始化列表
var list = new List<int> { 1, 2, 3, 4, 5 };
```

---

**基本写法：List 添加元素**
`<列表>.Add(<元素>);`
```csharp
// 向列表末尾添加元素
list.Add(6);
```

---

**基本写法：List 批量添加**
`<列表>.AddRange(<集合>);`
```csharp
// 批量添加元素到列表
list.AddRange([7, 8, 9]);
```

---

**基本写法：List 指定位置插入**
`<列表>.Insert(<索引>, <元素>);`
```csharp
// 在指定索引位置插入元素
list.Insert(0, 0);
```

---

**基本写法：List 索引访问**
`<类型> <变量> = <列表>[<索引>];`
```csharp
// 通过索引访问列表元素
int first = list[0];
```

---

**基本写法：List 末尾访问**
`<类型> <变量> = <列表>[^1];`
```csharp
// 从末尾访问列表元素
int last = list[^1];
```

---

**基本写法：List Contains 检查**
`bool <结果> = <列表>.Contains(<元素>);`
```csharp
// 检查列表是否包含指定元素
bool has = list.Contains(3);
```

---

**基本写法：List IndexOf 定位**
`int <结果> = <列表>.IndexOf(<元素>);`
```csharp
// 获取元素首次出现的索引
int index = list.IndexOf(3);
```

---

**基本写法：List Find 查找**
`<类型> <结果> = <列表>.Find(<谓词>);`
```csharp
// 查找第一个匹配条件的元素
int found = list.Find(x => x > 5);
```

---

**基本写法：List FindAll 查找全部**
`List<<类型>> <结果> = <列表>.FindAll(<谓词>);`
```csharp
// 查找所有匹配条件的元素
List<int> allFound = list.FindAll(x => x > 3);
```

---

**基本写法：List Remove 删除**
`<列表>.Remove(<元素>);`
```csharp
// 删除第一个匹配元素
list.Remove(3);
```

---

**基本写法：List RemoveAt 索引删除**
`<列表>.RemoveAt(<索引>);`
```csharp
// 删除指定索引的元素
list.RemoveAt(0);
```

---

**基本写法：List RemoveAll 条件删除**
`<列表>.RemoveAll(<谓词>);`
```csharp
// 删除所有匹配条件的元素
list.RemoveAll(x => x > 5);
```

---

**基本写法：List 默认排序**
`<列表>.Sort();`
```csharp
// 使用默认比较器排序
list.Sort();
```

---

**基本写法：List 自定义排序**
`<列表>.Sort(<比较器>);`
```csharp
// 使用自定义比较器降序排序
list.Sort((a, b) => b.CompareTo(a));
```

---

**基本写法：List ForEach 遍历**
`<列表>.ForEach(<动作>);`
```csharp
// 对每个元素执行指定动作
list.ForEach(item => Console.WriteLine(item));
```

---

## Dictionary\<TKey, TValue\>

**基本写法：Dictionary 初始化**
`var <变量> = new Dictionary<<TKey>, <TValue>> { [<键>] = <值>, ... };`
```csharp
// 初始化字典
var dict = new Dictionary<string, int>
{
    ["apple"] = 5,
    ["banana"] = 3
};
```

---

**基本写法：Dictionary Add 添加**
`<字典>.Add(<键>, <值>);`
```csharp
// 添加键值对（键不存在时）
dict.Add("grape", 4);
```

---

**基本写法：Dictionary 索引赋值**
`<字典>[<键>] = <值>;`
```csharp
// 添加或更新键值对
dict["mango"] = 6;
```

---

**基本写法：Dictionary TryAdd 尝试添加**
`bool <结果> = <字典>.TryAdd(<键>, <值>);`
```csharp
// 尝试添加键值对
dict.TryAdd("pear", 2);
```

---

**基本写法：Dictionary 索引访问**
`<值类型> <变量> = <字典>[<键>];`
```csharp
// 通过键获取值（键不存在抛异常）
int count = dict["apple"];
```

---

**基本写法：Dictionary TryGetValue 安全访问**
`bool <结果> = <字典>.TryGetValue(<键>, out <输出变量>);`
```csharp
// 安全获取值，返回是否成功
if (dict.TryGetValue("banana", out int value))
{
    Console.WriteLine($"banana: {value}");
}
```

---

**基本写法：Dictionary 默认值访问**
`<值类型> <变量> = <字典>.GetValueOrDefault(<键>, <默认值>);`
```csharp
// 获取值或默认值
int safe = dict.GetValueOrDefault("kiwi", 0);
```

---

**基本写法：Dictionary 遍历**
`foreach (var (<键>, <值>) in <字典>)`
```csharp
// 遍历字典的键值对
foreach (var (key, val) in dict)
{
    Console.WriteLine($"{key}: {val}");
}
```

---

**基本写法：Dictionary ContainsKey 检查**
`bool <结果> = <字典>.ContainsKey(<键>);`
```csharp
// 检查字典是否包含指定键
bool hasKey = dict.ContainsKey("apple");
```

---

**基本写法：Dictionary Remove 删除**
`<字典>.Remove(<键>);`
```csharp
// 删除指定键的键值对
dict.Remove("apple");
```

---

## HashSet\<T\> 与其他集合

**基本写法：HashSet 交集**
`<集合1>.IntersectWith(<集合2>);`
```csharp
// 计算两个集合的交集
var set1 = new HashSet<int> { 1, 2, 3, 4, 5 };
var set2 = new HashSet<int> { 4, 5, 6, 7, 8 };
set1.IntersectWith(set2);
```

---

**基本写法：HashSet 并集**
`<集合1>.UnionWith(<集合2>);`
```csharp
// 计算两个集合的并集
set1.UnionWith(set2);
```

---

**基本写法：HashSet 差集**
`<集合1>.ExceptWith(<集合2>);`
```csharp
// 计算两个集合的差集
set1.ExceptWith(set2);
```

---

**基本写法：Queue 入队**
`<队列>.Enqueue(<元素>);`
```csharp
// 向队列末尾添加元素
var queue = new Queue<string>();
queue.Enqueue("第一个");
```

---

**基本写法：Queue 出队**
`<类型> <变量> = <队列>.Dequeue();`
```csharp
// 从队列头部移除并返回元素
string dequeued = queue.Dequeue();
```

---

**基本写法：Stack 压栈**
`<栈>.Push(<元素>);`
```csharp
// 向栈顶压入元素
var stack = new Stack<int>();
stack.Push(1);
```

---

**基本写法：Stack 出栈**
`<类型> <变量> = <栈>.Pop();`
```csharp
// 从栈顶弹出元素
int popped = stack.Pop();
```

---

**基本写法：PriorityQueue 入队**
`<队列>.Enqueue(<元素>, <优先级>);`
```csharp
// 按优先级入队
var pq = new PriorityQueue<string, int>();
pq.Enqueue("高优先级", 1);
```

---

**基本写法：PriorityQueue 出队**
`<类型> <变量> = <队列>.Dequeue();`
```csharp
// 取出优先级最高的元素
string highest = pq.Dequeue();
```

---

**基本写法：LinkedList 尾部添加**
`<链表>.AddLast(<元素>);`
```csharp
// 在链表末尾添加节点
var linked = new LinkedList<int>();
linked.AddLast(1);
```

---

**基本写法：LinkedList 头部添加**
`<链表>.AddFirst(<元素>);`
```csharp
// 在链表头部添加节点
linked.AddFirst(0);
```

---

## 不可变集合

**基本写法：ImmutableList 创建**
`var <变量> = ImmutableList.Create(<元素>, ...);`
```csharp
// 创建不可变列表
var list = ImmutableList.Create(1, 2, 3);
```

---

**基本写法：ImmutableList 添加**
`var <新列表> = <列表>.Add(<元素>);`
```csharp
// 添加元素返回新列表，原列表不变
var newList = list.Add(4);
```

---

**基本写法：Frozen 字典创建**
`var <变量> = <字典>.ToFrozenDictionary();`
```csharp
// 创建后不可修改，查询性能极快
var frozen = new Dictionary<string, int>
{
    ["a"] = 1, ["b"] = 2
}.ToFrozenDictionary();
```

---

## LINQ to Objects

**基本写法：Where 筛选**
`var <结果> = <集合>.Where(<谓词>);`
```csharp
// 筛选满足条件的元素
var expensive = products.Where(p => p.Price > 1000);
```

---

**基本写法：Select 投影**
`var <结果> = <集合>.Select(<选择器>);`
```csharp
// 将元素投影为新形式
var names = products.Select(p => p.Name);
```

---

**基本写法：Select 匿名类型投影**
`var <结果> = <集合>.Select(<选择器>);`
```csharp
// 投影为匿名类型
var projections = products.Select(p => new { p.Name, p.Price });
```

---

**基本写法：OrderBy 排序**
`var <结果> = <集合>.OrderBy(<键选择器>);`
```csharp
// 按指定键升序排序
var sorted = products.OrderBy(p => p.Price);
```

---

**基本写法：OrderByDescending 降序排序**
`var <结果> = <集合>.OrderByDescending(<键选择器>);`
```csharp
// 按指定键降序排序
var sortedDesc = products.OrderByDescending(p => p.Price);
```

---

**基本写法：ThenBy 多级排序**
`var <结果> = <集合>.OrderBy(<键1>).ThenBy(<键2>);`
```csharp
// 多级排序
var multiSort = products.OrderBy(p => p.Category).ThenBy(p => p.Price);
```

---

**基本写法：GroupBy 分组**
`var <结果> = <集合>.GroupBy(<键选择器>);`
```csharp
// 按指定键分组
var grouped = products.GroupBy(p => p.Category);
```

---

**基本写法：Sum 求和**
`<类型> <结果> = <集合>.Sum(<选择器>);`
```csharp
// 计算指定属性的总和
decimal total = products.Sum(p => p.Price);
```

---

**基本写法：Average 平均值**
`<类型> <结果> = <集合>.Average(<选择器>);`
```csharp
// 计算指定属性的平均值
decimal avg = products.Average(p => p.Price);
```

---

**基本写法：Count 条件计数**
`int <结果> = <集合>.Count(<谓词>);`
```csharp
// 统计满足条件的元素数量
int count = products.Count(p => p.Price > 500);
```

---

**基本写法：Skip Take 分页**
`var <结果> = <集合>.Skip(<数量>).Take(<数量>);`
```csharp
// 跳过指定数量后取指定数量
var page = products.OrderBy(p => p.Price).Skip(10).Take(5);
```

---

**基本写法：Distinct 去重**
`var <结果> = <集合>.Select(<选择器>).Distinct();`
```csharp
// 对指定属性去重
var categories = products.Select(p => p.Category).Distinct();
```

---

**基本写法：Intersect 交集**
`var <结果> = <集合1>.Intersect(<集合2>);`
```csharp
// 计算两个集合的交集
var intersect = allNames.Intersect(someNames);
```

---

**基本写法：Union 并集**
`var <结果> = <集合1>.Union(<集合2>);`
```csharp
// 计算两个集合的并集
var union = allNames.Union(someNames);
```

---

**基本写法：Except 差集**
`var <结果> = <集合1>.Except(<集合2>);`
```csharp
// 计算两个集合的差集
var except = allNames.Except(someNames);
```

---

**单行写法：查询语法**
`from <变量> in <集合> where <条件> select <结果>`
```csharp
// 单行 SQL 风格查询表达式
var query = from p in products where p.Price > 500 select p;
```

---

**换行写法：查询语法**
`from <变量> in <集合> where <条件> orderby <排序> select <结果>`
```csharp
// 换行 SQL 风格查询表达式
var query = from p in products
            where p.Price > 500
            orderby p.Price descending
            select new { p.Name, p.Price };
```

---

**基本写法：Join 连接查询**
`from <变量1> in <集合1> join <变量2> in <集合2> on <键1> equals <键2> select <结果>`
```csharp
// 连接两个集合查询
var result = from p in products
             join o in orders on p.Name equals o.ProductName
             select new { p.Name, o.Quantity };
```

---

## 迭代器 (yield)

**基本写法：yield return 惰性生成**
`yield return <值>;`
```csharp
// 惰性生成斐波那契数列
public static IEnumerable<int> Fibonacci(int count)
{
    int a = 0, b = 1;
    for (int i = 0; i < count; i++)
    {
        yield return a;
        (a, b) = (b, a + b);
    }
}
```

---

**基本写法：yield break 提前退出**
`yield break;`
```csharp
// 遇到负数时停止生成
public static IEnumerable<int> GetPositive(int[] numbers)
{
    foreach (var n in numbers)
    {
        if (n < 0) yield break;
        if (n > 0) yield return n;
    }
}
```

---

**基本写法：惰性读取文件**
`yield return <行>;`
```csharp
// 逐行惰性读取文件
public static IEnumerable<string> ReadLinesLazy(string path)
{
    using var reader = new StreamReader(path);
    while (reader.ReadLine() is string line)
    {
        yield return line;
    }
}
```

---

## 集合表达式 (C# 12)

**基本写法：数组集合表达式**
`<类型>[] <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化数组
int[] array = [1, 2, 3];
```

---

**基本写法：List 集合表达式**
`List<<类型>> <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化列表
List<string> list = ["a", "b", "c"];
```

---

**基本写法：Span 集合表达式**
`Span<<类型>> <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化 Span
Span<int> span = [1, 2, 3];
```

---

**基本写法：HashSet 集合表达式**
`HashSet<<类型>> <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化 HashSet
HashSet<string> set = ["x", "y", "z"];
```

---

**基本写法：展开运算符合并**
`<类型>[] <变量> = [..<集合1>, ..<集合2>, <元素>];`
```csharp
// 使用展开运算符合并多个集合
int[] a = [1, 2, 3];
int[] b = [4, 5, 6];
int[] combined = [..a, ..b, 7, 8];
```
