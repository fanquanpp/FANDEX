---
order: 440
title: C# LINQ 进阶操作
module: 'csharp'
category: 后端技术
difficulty: beginner
description: SelectMany、Join/GroupJoin、集合运算、ToLookup、Chunk 等进阶算子的速查手册，附完整示例与易错点解析。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/430-LinqAsync'
  - 'csharp/120-LINQDeep'
  - 'csharp/130-LINQDeferredImmediate'
prerequisites:
  - 'csharp/110-CSharpLINQFunctionalProgramming'
---

## 投影与展开

**基本写法：SelectMany 展平嵌套集合**
`<集合>.SelectMany(<子集合选择器>);`
```csharp
// 把每个用户的订单列表展开成一个订单序列
var allOrders = users.SelectMany(u => u.Orders);
```

---

**基本写法：Select 带索引投影**
`<集合>.Select((<元素>, <索引>) => <结果>);`
```csharp
// 带索引生成编号
var indexed = items.Select((item, i) => $"{i + 1}. {item}");
```

---

**基本写法：SelectMany 带结果收集器**
`<集合>.SelectMany(<子集合选择器>, (<外元素>, <内元素>) => <结果>);`
```csharp
// 笛卡尔积：用户与角色的组合
var pairs = users.SelectMany(u => roles, (u, r) => $"{u.Name}-{r.Name}");
```

---

## 连接操作

**基本写法：Join 内连接**
`<外集合>.Join(<内集合>, <外键>, <内键>, <结果选择器>);`
```csharp
// 按部门 Id 连接员工与部门
var result = employees.Join(
    departments,
    e => e.DepartmentId,
    d => d.Id,
    (e, d) => new { e.Name, d.Name });
```

---

**基本写法：GroupJoin 分组连接**
`<外集合>.GroupJoin(<内集合>, <外键>, <内键>, <结果选择器>);`
```csharp
// 每个部门及其下属员工列表（左连接风格）
var grouped = departments.GroupJoin(
    employees,
    d => d.Id,
    e => e.DepartmentId,
    (d, emps) => new { Department = d.Name, Employees = emps });
```

---

**基本写法：Zip 按位置合并**
`<集合1>.Zip(<集合2>, (<元素1>, <元素2>) => <结果>);`
```csharp
// 按下标配对姓名与分数
var pairs = names.Zip(scores, (n, s) => new { Name = n, Score = s });
```

---

## 集合运算

**基本写法：Concat 串联**
`<集合1>.Concat(<集合2>);`
```csharp
// 拼接两个序列（不去重）
var combined = list1.Concat(list2);
```

---

**基本写法：Union 并集去重**
`<集合1>.Union(<集合2>);`
```csharp
// 合并去重
var unique = list1.Union(list2);
```

---

**基本写法：Except 差集**
`<集合1>.Except(<集合2>);`
```csharp
// 返回在 list1 但不在 list2 的元素
var diff = list1.Except(list2);
```

---

**基本写法：Intersect 交集**
`<集合1>.Intersect(<集合2>);`
```csharp
// 返回两个序列共有的元素
var common = list1.Intersect(list2);
```

---

**基本写法：DistinctBy 按键去重**
`<集合>.DistinctBy(<键选择器>);`
```csharp
// .NET 6+ 按字段去重
var uniqueById = items.DistinctBy(x => x.Id);
```

---

**基本写法：SequenceEqual 序列相等**
`<集合1>.SequenceEqual(<集合2>);`
```csharp
// 逐元素比较是否完全相同
bool same = list1.SequenceEqual(list2);
```

---

## 分组与查找

**基本写法：GroupBy 多值投影**
`<集合>.GroupBy(<键选择器>, <元素选择器>);`
```csharp
// 按班级分组，只保留姓名
var groups = students.GroupBy(s => s.Class, s => s.Name);
```

---

**基本写法：GroupBy 带结果投影**
`<集合>.GroupBy(<键选择器>, (<键>, <组>) => <结果>);`
```csharp
// 按部门分组并统计人数
var stats = employees.GroupBy(e => e.Dept, (k, g) => new { Dept = k, Count = g.Count() });
```

---

**基本写法：ToLookup 一对多字典**
`<集合>.ToLookup(<键选择器>, [<值选择器>]);`
```csharp
// 创建可重复键的查找结构
var lookup = items.ToLookup(x => x.Category, x => x.Name);
var values = lookup["Books"]; // 该分类下所有名称
```

---

## 类型筛选与转换

**基本写法：OfType 类型过滤**
`<集合>.OfType<<目标类型>>();`
```csharp
// 只保留字符串类型的元素
var strings = mixed.OfType<string>();
```

---

**基本写法：Cast 类型转换**
`<集合>.Cast<<目标类型>>();`
```csharp
// 将 ArrayList 强转为 IEnumerable<string>
var list = arrayList.Cast<string>();
```

---

**基本写法：Chunk 分块**
`<集合>.Chunk(<大小>);`
```csharp
// .NET 6+ 按每 3 个元素分块
var chunks = items.Chunk(3);
```

---

## 聚合与统计

**基本写法：Min/Max 极值**
`<集合>.Min([<选择器>]);`
```csharp
// 取最小年龄
int minAge = users.Min(u => u.Age);
// 取最大年龄
int maxAge = users.Max(u => u.Age);
```

---

**基本写法：Average 平均值**
`<集合>.Average([<选择器>]);`
```csharp
// 计算平均分
double avg = scores.Average();
double avgAge = users.Average(u => u.Age);
```

---

**基本写法：Aggregate 带种子聚合**
`<集合>.Aggregate(<种子>, (<累计>, <当前>) => <结果>, <结果选择器>);`
```csharp
// 计算总和并格式化
string result = nums.Aggregate(0, (acc, n) => acc + n, sum => $"Total: {sum}");
```

---

## 排序与分区

**基本写法：OrderByDescending 降序**
`<集合>.OrderByDescending(<键选择器>);`
```csharp
// 按分数降序排序
var sorted = students.OrderByDescending(s => s.Score);
```

---

**基本写法：Reverse 反转**
`<集合>.Reverse();`
```csharp
// 反转序列顺序
var reversed = list.Reverse();
```

---

**基本写法：TakeLast 取末尾**
`<集合>.TakeLast(<数量>);`
```csharp
// 取最后 3 个元素
var last3 = list.TakeLast(3);
```

---

**基本写法：SkipLast 跳过末尾**
`<集合>.SkipLast(<数量>);`
```csharp
// 跳过最后 2 个元素
var rest = list.SkipLast(2);
```

---

**基本写法：TakeWhile 条件取**
`<集合>.TakeWhile(<谓词>);`
```csharp
// 一直取直到不满足条件为止
var head = list.TakeWhile(x => x > 0);
```

---

**基本写法：SkipWhile 条件跳**
`<集合>.SkipWhile(<谓词>);`
```csharp
// 一直跳过直到不满足条件为止
var tail = list.SkipWhile(x => x < 0);
```

---

## 生成与空序列

**基本写法：Range 生成范围**
`Enumerable.Range(<起始>, <数量>);`
```csharp
// 生成 1 到 10
var nums = Enumerable.Range(1, 10);
```

---

**基本写法：Repeat 重复生成**
`Enumerable.Repeat(<值>, <次数>);`
```csharp
// 生成 5 个 0
var zeros = Enumerable.Repeat(0, 5);
```

---

**基本写法：Empty 空序列**
`Enumerable.Empty<<类型>>();`
```csharp
// 创建类型化的空序列
var empty = Enumerable.Empty<int>();
```

---

**基本写法：DefaultIfEmpty 默认值**
`<集合>.DefaultIfEmpty([<默认值>]);`
```csharp
// 序列为空时返回单个默认值
var safe = list.DefaultIfEmpty(0);
```

---

## 查询表达式语法

**基本写法：from-where-select 查询**
`from <变量> in <集合> where <条件> select <结果>`
```csharp
// 查询表达式风格
var result = from u in users
             where u.Age > 18
             select u.Name;
```

---

**基本写法：join-on-equals 查询连接**
`from <a> in <集合1> join <b> in <集合2> on <a键> equals <b键>`
```csharp
// 查询表达式风格的内连接
var result = from e in employees
             join d in departments on e.DeptId equals d.Id
             select new { e.Name, d.Name };
```

---

**基本写法：group-by 查询分组**
`group <元素> by <键> into <组>`
```csharp
// 查询表达式风格的分组
var result = from s in students
             group s by s.Class into g
             select new { Class = g.Key, Count = g.Count() };
```

---

## 立即执行与延迟执行

**基本写法：ToList 立即求值**
`<集合>.ToList();`
```csharp
// 立即执行查询并缓存结果
var list = query.ToList();
```

---

**基本写法：ToArray 转数组**
`<集合>.ToArray();`
```csharp
// 立即执行并返回数组
var arr = query.ToArray();
```

---

**基本写法：ToDictionary 转字典**
`<集合>.ToDictionary(<键选择器>);`
```csharp
// 立即转为字典（键不可重复）
var dict = items.ToDictionary(x => x.Id);
```

---

**基本写法：FirstOrDefault 带默认值**
`<集合>.FirstOrDefault(<谓词>, <默认值>);`
```csharp
// .NET 6+ 找不到时返回指定默认值
var item = list.FirstOrDefault(x => x.Id == 5, fallback);
```

---

## 完整示例：部门与员工的连接统计

以下程序可直接运行，串起 Join、GroupJoin、SelectMany 与聚合：

```csharp
record Employee(string Name, int DeptId, decimal Salary);
record Department(int Id, string Name);

var depts = new List<Department>
{
    new(1, "研发"), new(2, "销售"), new(3, "行政"),   // 行政没有员工
};
var emps = new List<Employee>
{
    new("张三", 1, 20000m), new("李四", 1, 18000m), new("王五", 2, 12000m),
};

// 1) 内连接：员工 + 部门名
var joined = emps.Join(depts,
    e => e.DeptId, d => d.Id,
    (e, d) => $"{e.Name} @ {d.Name}");
Console.WriteLine(string.Join("\n", joined));

// 2) 分组连接：每个部门及其平均薪资（无员工则显示 0）
var avgSalary = depts.GroupJoin(emps,
    d => d.Id, e => e.DeptId,
    (d, group) => new { Dept = d.Name, Avg = group.Any() ? group.Average(e => e.Salary) : 0m });
foreach (var x in avgSalary)
{
    Console.WriteLine($"{x.Dept}: 平均 {x.Avg}");
}

// 3) 展平 + 索引编号
var roster = depts
    .OrderBy(d => d.Id)
    .SelectMany(d => emps.Where(e => e.DeptId == d.Id),
                 (d, e) => $"{d.Name}-{e.Name}")
    .Select((line, i) => $"{i + 1}. {line}");
Console.WriteLine(string.Join("\n", roster));

// 输出：
// 张三 @ 研发
// 李四 @ 研发
// 王五 @ 销售
// 研发: 平均 19000
// 销售: 平均 12000
// 行政: 平均 0
// 1. 研发-张三
// 2. 研发-李四
// 3. 销售-王五
```

## 常见陷阱

**集合运算用默认相等比较**。`Except`/`Union`/`Intersect`/`Distinct` 对自定义类默认按**引用**比较，两个"内容相同"的对象不会被视为重复。解决方式：把元素定义成 `record`（自动值相等）、实现 `IEquatable<T>`，或使用带 `IEqualityComparer<T>` 的重载（.NET 6+ 还可用 `DistinctBy`/`ExceptBy` 按键比较）。

**`GroupBy` 延迟而 `ToLookup` 立即**。`GroupBy` 返回的分组序列是延迟求值的：每次枚举都会重新分组；`ToLookup` 则立即把数据固化成一对多索引结构，之后可反复按键查询且不会重算。数据源会变化且只遍历一次用 `GroupBy`；只读数据需多次按键访问用 `ToLookup`。

**`Cast` 抛异常，`OfType` 会过滤**。`Cast<int>()` 遇到不能转换的元素直接抛 `InvalidCastException`；`OfType<int>()` 则静默跳过不兼容元素。处理非泛型旧集合（如 `ArrayList`）时，前者要求"必须全是"，后者表达"取出其中是"。

**空序列上的聚合会抛异常**。对空序列调用 `Min`/`Max`/`Average`/`Last` 会抛 `InvalidOperationException`（"Sequence contains no elements"），而 `Sum` 返回 0、`Count` 返回 0、`FirstOrDefault` 返回默认值。聚合前用 `Any()` 检查或改用 `DefaultIfEmpty` 兜底。

**`OrderBy` 是稳定排序**。相同键的元素保持原有相对顺序，因此"先按科室排、再按职级排"的正确写法是 `OrderBy(科室).ThenBy(职级)`，或先主后次地连续调用两次 `OrderBy`（后调用的为次键时必须用 `ThenBy`，第二次 `OrderBy` 会整个重排）。

**`Chunk` 末块不足按实际数量返回**。`Chunk(3)` 对 8 个元素产出 3、3、2 三块；分块内是数组快照，修改源集合不影响已产出的块。

## 与 .NET 10 的衔接

.NET 10 为 LINQ 新增了一等 `LeftJoin`/`RightJoin` 运算符，替代"`GroupJoin` + `SelectMany` + `DefaultIfEmpty`"的左外连接固定写法，EF Core 10 也能直接翻译成 SQL 的 `LEFT JOIN`：

```csharp
// .NET 10+：员工全量保留，没匹配到部门时 dept 为 null
var fullRoster = emps.LeftJoin(
    depts,
    e => e.DeptId, d => d.Id,
    (e, d) => $"{e.Name} @ {(d?.Name ?? "未分配")}");
```

## 分层小结

- **记住**：`SelectMany` 展平、`Join` 内连接、`GroupBy` 分组、`ToLookup` 一对多索引。
- **理解**：集合运算依赖相等语义；`GroupBy` 延迟与 `ToLookup` 固化的取舍；空序列聚合异常。
- **应用**：报表类需求（分组统计、左右连接、分块批量提交）优先组合本篇算子；查询语义复杂的场景再深入[表达式树与 IQueryable](/csharp/120-LINQDeep)。
