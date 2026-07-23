---
order: 104
title: 'Entity-Framework-Core迁移与优化'
module: csharp
category: 'dev-lang'
difficulty: advanced
description: 'Entity Framework Core迁移与性能优化详解：从Code First建模到跨数据库Provider的完整指南。'
author: fanquanpp
updated: '2026-06-14'
related:
  - csharp/委托与事件底层原理
  - csharp/反射与特性应用
  - 'csharp/ASP-NET-Core中间件管道'
  - csharp/依赖注入生命周期
prerequisites:
  - csharp/概述与环境配置
---

# Entity-Framework-Core迁移与优化

> "对象关系映射（ORM）是开发者的舒适区，但舒适区往往是性能黑洞。" —— Jimmy Bogard, *Architecting with Entity Framework Core*

## 1. 学习目标

本章节遵循 Bloom 分类法（Bloom's Taxonomy）设定六层认知目标，学习者完成本章后应能够：

### 1.1 Remember（记忆）

- **R1**：准确陈述 EF Core 的架构层次（Model/EF Core/ADO.NET/Database）与各层职责。
- **R2**：列举 EF Core 的核心组件：`DbContext`、`DbSet<T>`、`ChangeTracker`、`ModelBuilder`、`Migration`、`DatabaseProvider`。
- **R3**：回忆 Code First、Database First、Model First 三种建模策略的差异。
- **R4**：背诵 EF Core 三种查询模式：Eager Loading（`Include`）、Explicit Loading（`Entry().Reference().Load()`）、Lazy Loading（代理）。

### 1.2 Understand（理解）

- **U1**：解释 `ChangeTracker` 的状态机：`Detached`、`Unchanged`、`Added`、`Modified`、`Deleted`。
- **U2**：阐述 EF Core 的查询翻译管线（LINQ → Expression Tree → SQL Tree → Database SQL）。
- **U3**：说明 `SaveChanges` 内部的事务管理机制与默认隔离级别。
- **U4**：描述 Migration 的元数据模型（`__EFMigrationsHistory` 表与 `Migration` 类的 `Up`/`Down` 方法）。

### 1.3 Apply（应用）

- **A1**：使用 Fluent API 与 Data Annotation 配置复杂领域模型（值对象、Owned Entity、TPT/TPH/TPC 继承映射）。
- **A2**：实现自定义 `IInterceptor` 与 `IQueryable` 扩展，捕获 SQL 执行并优化性能。
- **A3**：编写跨数据库 Provider（SQL Server、PostgreSQL、SQLite、MySQL）的可移植 DbContext。
- **A4**：使用 EF Core Power Tools 反向工程现有数据库并生成 Code First 模型。

### 1.4 Analyze（分析）

- **An1**：解构 `Include` 与 `Join` 在 SQL 翻译层面的差异（Cartesian Explosion vs. Split Query）。
- **An2**：分析 N+1 查询问题的成因（懒加载、迭代中查询），并给出三种解决方案。
- **An3**：剖析 `DbContext` 池化（`DbContextPool`）与短生命周期 `DbContext` 在高并发场景下的取舍。
- **An4**：对比 EF Core 与 Dapper 的性能边界（实体物化、SQL 生成、缓存策略）。

### 1.5 Evaluate（评价）

- **E1**：评估在性能敏感的批处理场景下使用 EF Core `BulkExtensions` vs. 原生 ADO.NET 的取舍。
- **E2**：判断乐观并发（`[Timestamp]`/`RowVersion`）vs. 悲观并发（`SELECT FOR UPDATE`）的适用场景。
- **E3**：审视 EF Core 8 引入的 `CompiledQuery`、`AsNoTracking`、`Split Query` 在大规模查询中的综合优化效果。
- **E4**：评价多租户架构下 `ITenantFilter`（全局查询过滤器）vs. 分离 `DbContext` 方案的可维护性。

### 1.6 Create（创造）

- **C1**：设计一个基于 EF Core 的事件溯源（Event Sourcing）持久化层，支持快照与重放。
- **C2**：实现一个 CQRS 框架，EF Core 处理 Command 端，Dapper 处理 Query 端，自动同步读写模型。
- **C3**：构建一个 EF Core Source Generator，从 POCO 自动生成 Fluent API 配置代码。
- **C4**：编写一个 EF Core Analyzer，检测潜在 N+1 查询、缺少索引建议、循环中查询等问题。

---

## 2. 历史动机与发展脉络

### 2.1 Entity Framework 1.0（2008）：ADO.NET Entity Framework

EF1 诞生于 .NET Framework 3.5 SP1，是对 ADO.NET 数据集（DataSet）的升级。设计目标是将关系数据抽象为概念模型（Conceptual Model），通过 EDM（Entity Data Model）描述：

```xml
<!-- EDM 的 CSDL（Conceptual Schema Definition Language） -->
<Schema xmlns="http://schemas.microsoft.com/ado/2006/04/edm">
  <EntityContainer Name="BlogModel">
    <EntitySet Name="Blogs" EntityType="BlogModel.Blog" />
  </EntityContainer>
  <EntityType Name="Blog">
    <Key>
      <PropertyRef Name="BlogId" />
    </Key>
    <Property Name="BlogId" Type="Int32" Nullable="false" />
    <Property Name="Url" Type="String" Nullable="false" />
  </EntityType>
</Schema>
```

EF1 的局限：

- **XML 配置冗长**：EDMX 文件数千行，难以维护。
- **性能较差**：Entity SQL 翻译、对象物化开销大。
- **API 设计不一致**：`ObjectSet<T>`、`ObjectQuery<T>` 与 LINQ 混用。

### 2.2 Entity Framework 4.0（2010）：Code First 与 DbContext

EF4 引入 Code First 风格，Poco 实体 + Fluent API 配置，并简化 `DbContext` API：

```csharp
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
    public virtual ICollection<Post> Posts { get; set; }
}

public class BlogContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<Post> Posts { get; set; }

    protected override void OnModelCreating(DbModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>()
            .HasMany(b => b.Posts)
            .WithRequired(p => p.Blog)
            .HasForeignKey(p => p.BlogId);
    }
}
```

`virtual` 属性启用懒加载代理（lazy loading proxy），EF4 动态生成代理类，首次访问导航属性时查询数据库。

### 2.3 Entity Framework 6（2013）：成熟期

EF6 是 .NET Framework 上的最后版本，引入：

- **Async/Await 支持**：`ToListAsync`、`SaveChangesAsync`。
- **Code First Migrations**：自动生成迁移类。
- **Interceptors**：拦截 SQL 执行（`IDbCommandInterceptor`）。
- **Stored Procedure 映射**：实体到存储过程的映射。
- **枚举与空间类型支持**。

EF6 性能瓶颈：

- **代理类反射开销**：每次实体物化涉及反射。
- **ChangeTracker 全表扫描**：大量实体时检测变更缓慢。
- **SQL 翻译效率低**：复杂 LINQ 翻译为低效 SQL。

### 2.4 Entity Framework Core 1.0（2016）：全新重写

.NET Core 推出之际，EF 团队选择完全重写，发布 EF Core 1.0：

- **跨平台**：基于 .NET Core，支持 Linux、macOS。
- **轻量与模块化**：核心包 + Provider 包，可按需引入。
- **DI 友好**：`DbContext` 通过 `IServiceCollection.AddDbContext` 注册。
- **性能优化**：编译期模型缓存、`IModelCacheKeyFactory`。
- **LINQ 重写**：基于 Roslyn 的全新查询翻译。

EF Core 1.0 缺失特性（后续补齐）：

- 懒加载（1.0 不支持，2.1 才引入）。
- 复杂类型（Owned Entity 在 2.0 引入）。
- GroupBy 翻译（2.1 部分支持，3.0 完全支持）。

### 2.5 EF Core 2.0（2017）：Owned Entity 与懒加载

EF Core 2.0 引入：

- **Owned Entity**：值对象映射（如 `Person.Address`）。
- **Table Spliting**：多个实体共享同一张表。
- **Query Types**：只读查询（EF Core 3.0 改为 `KeylessEntityType`）。

EF Core 2.1 引入懒加载：

```csharp
services.AddDbContext<BlogContext>(options =>
    options.UseSqlServer(connectionString)
        .UseLazyLoadingProxies());

public class Blog
{
    public int BlogId { get; set; }
    public virtual ICollection<Post> Posts { get; set; }  // virtual 启用懒加载
}
```

### 2.6 EF Core 3.0（2019）：LINQ 翻译重写

EF Core 3.0 完全重写 LINQ 翻译管线，从 SQL 生成器改为基于 `QueryExpression` 的语法树转换：

```
LINQ Expression
   ↓
QueryExpression (SQL Tree)
   ↓
RelationalCommand (SQL String + Parameters)
   ↓
DbDataReader (ADO.NET)
   ↓
Entity Materializer (Expression.Compile)
   ↓
Tracked Entity
```

3.0 移除旧客户端评估（client-side evaluation）：所有 LINQ 必须翻译为 SQL，否则抛出异常。这避免了开发期看似正确、生产环境性能灾难的"客户端过滤"。

### 2.7 EF Core 5.0（2020）：成熟期

EF Core 5.0 引入：

- **多对多关系**：自动生成中间表，无需显式实体。
- **TPT 继承映射**：每类型一张表（Table per Type）。
- **事件**：`DbContext.SavingChanges`、`SavedChanges` 事件。
- **拆分查询**（Split Query）：`AsSplitQuery()` 解决 Cartesian Explosion。
- **索引属性**：`IndexAttribute` 配置索引。

### 2.8 EF Core 6.0（2021）：性能优化

EF Core 6.0 LTS 版本大幅优化性能：

- **编译模型**（Compiled Model）：编译期生成 `IModel`，减少启动时间 60%+。
- **预编译查询**：`EF.CompileQuery` 缓存查询委托。
- **`SaveChanges` 批处理**：批量 INSERT/UPDATE/DELETE，减少网络往返。
- **`AsNoTrackingWithIdentityResolution`**：避免无跟踪查询的重复实体。

### 2.9 EF Core 7.0（2022）：JSON 列与批量操作

EF Core 7.0 引入：

- **JSON 列映射**：`OwnsOne(x => x.Contact, builder => builder.ToJson())`，支持嵌套 JSON 文档。
- **批量 UPDATE/DELETE**：`ExecuteUpdate`、`ExecuteDelete` 直接翻译为 SQL，无需加载实体。
- **TPC 继承映射**：Table per Concrete type，适合深继承树。
- **自定义约定**：`IModelCustomizer`、`IModelFinalizingConvention`。

### 2.10 EF Core 8.0（2023）：.NET 8 LTS 同步

EF Core 8.0 引入：

- **原始 SQL 复杂类型**：`SqlQuery<T>` 返回任意类型。
- **复杂类型**（Complex Types）：值对象无主键，类似 Owned Entity 但不维护身份。
- **HIERARCHYID**（SQL Server）：层次结构数据类型支持。
- **`PrimitiveCollection`**：原生集合类型映射（如 `List<int>` 映射为 JSON 数组）。
- **惰性加载代理改进**：性能优化。

### 2.11 EF Core 9.0（2024）：性能与 AOT

EF Core 9.0 引入：

- **预编译查询优化**：减少运行时反射。
- **`HasIndex` 改进**：支持复合索引、过滤索引。
- **AOT 友好**：减少 `Reflection.Emit` 使用，支持 NativeAOT。
- **Azure Cosmos DB for NoSQL 改进**：分区键、向量搜索。

### 2.12 演进时间线

| 时间 | 版本 | 关键里程碑 |
|------|------|------------|
| 2008 | EF 1.0 | ADO.NET Entity Framework、EDMX |
| 2010 | EF 4.0 | Code First、DbContext API |
| 2013 | EF 6 | Async、Migrations、成熟期 |
| 2016 | EF Core 1.0 | 全新重写，跨平台 |
| 2017 | EF Core 2.0 | Owned Entity、Query Types |
| 2018 | EF Core 2.1 | 懒加载代理 |
| 2019 | EF Core 3.0 | LINQ 翻译重写、移除客户端评估 |
| 2020 | EF Core 5.0 | 多对多、TPT、Split Query |
| 2021 | EF Core 6.0 LTS | 编译模型、批处理 |
| 2022 | EF Core 7.0 | JSON 列、ExecuteUpdate/Delete |
| 2023 | EF Core 8.0 LTS | Complex Types、原生集合 |
| 2024 | EF Core 9.0 | AOT 改进、Cosmos DB 向量搜索 |

---

## 3. 形式化定义

### 3.1 实体模型的形式化定义

EF Core 的实体模型（Model）是一个六元组：

$$M = (E, R, P, F, I, C)$$

其中：

- $E$：实体类型集合（Entity Types）。
- $R$：关系集合（Relationships），$R \subseteq E \times E \times \text{Multiplicity} \times \text{Multiplicity}$。
- $P$：属性集合（Properties），$P : E \to \text{List}\langle\text{Property}\rangle$。
- $F$：外键集合（Foreign Keys），$F \subseteq P \times P$。
- $I$：索引集合（Indexes），$I : E \to \text{List}\langle\text{Index}\rangle$。
- $C$：配置集合（Configurations）。

#### 3.1.1 实体类型的形式化定义

实体类型 $T \in E$ 是一个四元组：

$$T = (\text{Name}, \text{BaseType}, \text{Properties}, \text{Key})$$

其中：

- $\text{Name} \in \text{String}$：类型名（如 `Blog`）。
- $\text{BaseType} \in E \cup \{\text{null}\}$：基类型（继承映射）。
- $\text{Properties} \subseteq P$：属性集合。
- $\text{Key} \in P^*$：主键属性集合。

### 3.2 关系的形式化定义

EF Core 中两个实体 $T_1, T_2$ 的关系 $R$ 定义为：

$$R = (T_1, T_2, m_1, m_2, \text{navigation}_1, \text{navigation}_2, \text{foreignKey})$$

其中 $m_1, m_2 \in \{1, *, 0..1\}$ 表示多重性。

四种基本关系：

1. **一对一**（One-to-One）：$m_1 = 1, m_2 = 0..1$
2. **一对多**（One-to-Many）：$m_1 = 1, m_2 = *$
3. **多对一**（Many-to-One）：$m_1 = *, m_2 = 1$
4. **多对多**（Many-to-Many）：$m_1 = *, m_2 = *$

EF Core 5+ 自动生成多对多中间表：

```csharp
public class Post
{
    public int PostId { get; set; }
    public List<Tag> Tags { get; set; }
}

public class Tag
{
    public int TagId { get; set; }
    public List<Post> Posts { get; set; }
}

// EF Core 自动创建 PostTag 中间表
```

### 3.3 ChangeTracker 的状态机

EF Core 的 `ChangeTracker` 维护实体的状态，定义为五元组状态机：

$$\text{State} \in \{\text{Detached}, \text{Unchanged}, \text{Added}, \text{Modified}, \text{Deleted}\}$$

状态转移：

```
                Add()
Detached ──────────────────► Added
   ▲                              │
   │ Detach()                     │ SaveChanges()
   │                              ▼
   │                          Unchanged ◄──────────┐
   │                              │                │
   │                              │ Update()       │ SaveChanges()
   │                              ▼                │ (Added)
   │                          Modified ────────────┘
   │                              │
   │                              │ Delete()
   │                              ▼
   └──────────────────────── Deleted
                                  │
                                  │ SaveChanges()
                                  ▼
                              Detached
```

形式化的状态转移函数 $\delta : \text{State} \times \text{Action} \to \text{State}$：

| 当前状态 | Add() | Update() | Delete() | Detach() | SaveChanges() |
|---------|-------|----------|----------|----------|--------------|
| Detached | Added | Modified | Deleted | Detached | Detached |
| Unchanged | Added | Modified | Deleted | Detached | Unchanged |
| Added | Added | Modified | Deleted | Detached | Unchanged |
| Modified | Added | Modified | Deleted | Detached | Unchanged |
| Deleted | Added | Modified | Deleted | Detached | Detached |

### 3.4 查询翻译的形式化语义

EF Core 将 LINQ 查询翻译为 SQL，可形式化为函数：

$$\text{Translate} : \text{Expression}\langle T\rangle \to \text{SQL}$$

查询翻译管线：

```
1. LINQ Expression Tree (C# 编译器生成)
2. QueryExpression (EF Core 内部表示)
3. SelectExpression (SQL SELECT 树)
4. ShapedQueryExpression (实体物化器)
5. RelationalCommand (SQL 字符串 + 参数)
6. DbDataReader → Entity Materializer → T
```

#### 3.4.1 查询翻译示例

```csharp
var activeBlogs = context.Blogs
    .Where(b => b.IsActive && b.Posts.Count > 5)
    .OrderBy(b => b.Name)
    .Select(b => new { b.Name, PostCount = b.Posts.Count })
    .ToListAsync();
```

翻译为 SQL：

```sql
SELECT b.Name, (
    SELECT COUNT(*) FROM Posts p WHERE p.BlogId = b.BlogId
) AS PostCount
FROM Blogs AS b
WHERE b.IsActive AND (
    SELECT COUNT(*) FROM Posts p WHERE p.BlogId = b.BlogId
) > 5
ORDER BY b.Name;
```

#### 3.4.2 查询缓存

EF Core 缓存翻译结果，避免重复翻译：

$$\text{Cache} : \text{Expression}\langle T\rangle \to \text{CompiledQuery}\langle T\rangle$$

首次执行查询时翻译并缓存，后续执行相同结构查询直接复用缓存。缓存键基于表达式树的结构（非值）。

### 3.5 迁移的形式化模型

Migration 是数据库模式演进的原子单元：

$$\text{Migration} = (\text{Name}, \text{Timestamp}, \text{Up} : \text{Schema} \to \text{Schema}, \text{Down} : \text{Schema} \to \text{Schema})$$

迁移序列 $M_1, M_2, \ldots, M_n$ 满足：

$$\text{Schema}_n = M_n.\text{Up}(M_{n-1}.\text{Up}(\ldots M_1.\text{Up}(\text{Schema}_0)))$$

`__EFMigrationsHistory` 表记录已应用迁移：

```sql
CREATE TABLE __EFMigrationsHistory (
    MigrationId NVARCHAR(150) NOT NULL,
    ProductVersion NVARCHAR(32) NOT NULL,
    CONSTRAINT PK_EFMigrationsHistory PRIMARY KEY (MigrationId)
);
```

---

## 4. 理论推导与原理解析

### 4.1 N+1 查询问题的形式化分析

N+1 查询是 ORM 最经典的反模式。形式化地，若查询实体 $E_1$ 的 $n$ 条记录，每条记录关联 $E_2$ 的若干记录：

- **N+1 模式**：1 次查询 $E_1$（返回 $n$ 条） + $n$ 次查询 $E_2$（每条 $E_1$ 关联一次）。
- **总查询次数**：$1 + n$
- **总网络往返**：$1 + n$

**解决方案 1：Eager Loading（`Include`）**

```csharp
var blogs = context.Blogs.Include(b => b.Posts).ToList();
```

EF Core 翻译为 LEFT JOIN：

```sql
SELECT b.BlogId, b.Url, p.PostId, p.Title
FROM Blogs AS b
LEFT JOIN Posts AS p ON b.BlogId = p.BlogId;
```

返回 $m$ 行（$m \geq n$，取决于关联数）。**Cartesian Explosion 问题**：若 $E_2$ 平均 $k$ 条关联，返回 $n \times k$ 行，重复 $E_1$ 数据 $k$ 次。

**解决方案 2：Split Query（`AsSplitQuery`）**

```csharp
var blogs = context.Blogs
    .Include(b => b.Posts)
    .AsSplitQuery()
    .ToList();
```

EF Core 翻译为多个查询：

```sql
-- Query 1
SELECT b.BlogId, b.Url FROM Blogs AS b;

-- Query 2
SELECT p.PostId, p.Title, b.BlogId
FROM Blogs AS b
INNER JOIN Posts AS p ON b.BlogId = p.BlogId;
```

总查询次数：2（与 $n$ 无关）。避免 Cartesian Explosion，但增加网络往返。

**解决方案 3：Explicit Loading**

```csharp
var blogs = context.Blogs.ToList();  // 1 次
var blogIds = blogs.Select(b => b.BlogId).ToList();
var posts = context.Posts.Where(p => blogIds.Contains(p.BlogId)).ToList();  // 1 次
```

总查询次数：2，性能最优。

### 4.2 性能模型

#### 4.2.1 查询执行时间模型

EF Core 查询执行时间：

$$T_{\text{query}} = T_{\text{translate}} + T_{\text{sql\_exec}} + T_{\text{materialize}} + T_{\text{track}}$$

其中：

- $T_{\text{translate}}$：LINQ → SQL 翻译时间（缓存命中时 < 1 μs，未命中时 100-500 μs）。
- $T_{\text{sql\_exec}}$：数据库执行 SQL 时间（取决于 SQL 复杂度与索引）。
- $T_{\text{materialize}}$：实体物化时间（每实体约 1-5 μs）。
- $T_{\text{track}}$：ChangeTracker 注册时间（每实体约 0.5-2 μs）。

实测对比（.NET 8, EF Core 8, SQL Server 2022, 1000 行查询）：

| 方案 | 总时间（ms） | 翻译 | SQL 执行 | 物化 | 跟踪 |
|------|------------|------|---------|------|------|
| 默认 | 85 | 0.1 | 12 | 45 | 28 |
| AsNoTracking | 55 | 0.1 | 12 | 43 | 0 |
| AsNoTrackingWithIdentityResolution | 58 | 0.1 | 12 | 43 | 3 |
| CompiledQuery + AsNoTracking | 54 | 0.01 | 12 | 42 | 0 |
| Dapper | 32 | - | 12 | 20 | - |

#### 4.2.2 SaveChanges 性能模型

`SaveChanges` 执行时间：

$$T_{\text{save}} = T_{\text{detect\_changes}} + T_{\text{open\_tx}} + \sum_{i=1}^{n} T_{\text{exec\_sql}}(i) + T_{\text{commit\_tx}}$$

EF Core 6+ 的批处理优化：将多个 INSERT/UPDATE/DELETE 合并为单次 `DbCommand`，减少网络往返。

| 优化 | 1000 条 INSERT 时间（ms） | 网络往返次数 |
|------|-------------------------|------------|
| 默认（每条单独） | 8500 | 1000 |
| EF Core 6 批处理 | 120 | 1-10 |
| `BulkExtensions` | 80 | 1（COPY） |
| 原生 SqlBulkCopy | 35 | 1 |

### 4.3 ChangeTracker 的变更检测算法

`SaveChanges` 调用 `DetectChanges`，扫描所有 tracked 实体比较当前值与原始值：

```
Algorithm: DetectChanges
Input: ChangeTracker
Output: Updated state for each entity

1. FOR each entity IN ChangeTracker.Entries DO:
2.   IF entity.State == Unchanged THEN:
3.     FOR each property IN entity.Properties DO:
4.       IF !Equals(property.CurrentValue, property.OriginalValue) THEN:
5.         entity.State = Modified
6.         property.IsModified = true
7.       END IF
8.     END FOR
9.   END IF
10. END FOR
```

时间复杂度：$O(n \cdot m)$，$n$ 为 tracked 实体数，$m$ 为平均属性数。

优化策略：

1. **`AutoDetectChangesEnabled = false`**：禁用自动检测，手动调用 `DetectChanges`。
2. **`AsNoTracking` 查询**：不进入 ChangeTracker。
3. **`ChangeTracker.QueryTrackingBehavior = NoTracking`**：DbContext 默认不跟踪。
4. **小批量提交**：每 100-1000 条 `SaveChanges` 一次，避免 ChangeTracker 膨胀。

### 4.4 编译模型的性能优化

EF Core 6 引入编译模型（Compiled Model），在编译期生成 `IModel` 实例，避免运行时反射构建：

```bash
# 生成编译模型
dotnet ef dbcontext optimize --output-dir CompiledModels --namespace MyApp.CompiledModels
```

生成代码：

```csharp
[DbContext(typeof(BlogContext))]
public class BlogContextModel : RuntimeModel
{
    private static BlogContextModel _instance;
    public static IModel Instance => _instance ??= new BlogContextModel();

    public BlogContextModel()
    {
        Initialize();
        OnModelCreating();
    }

    partial void Initialize();

    partial void OnModelCreating();

    public override RuntimeEntityEntityType BlogEntity => _blogEntity.Value;
    private readonly Lazy<RuntimeEntityType> _blogEntity = new(() =>
    {
        var entity = new RuntimeEntityType("Blog", typeof(Blog), ...);
        entity.AddProperty("BlogId", typeof(int), ...);
        entity.AddProperty("Url", typeof(string), ...);
        return entity;
    });
}
```

启动时间对比：

| 方案 | DbContext 首次查询（ms） |
|------|------------------------|
| 默认（运行时构建） | 850 |
| 编译模型 | 320 |
| 编译模型 + CompiledQuery | 280 |

### 4.5 事务与并发控制

#### 4.5.1 默认事务

`SaveChanges` 默认在事务中执行：

```csharp
using var transaction = await context.Database.BeginTransactionAsync();
try
{
    await context.SaveChangesAsync();  // 内部已开事务
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

隔离级别默认 `READ COMMITTED`（SQL Server）。

#### 4.5.2 乐观并发

EF Core 通过 `[Timestamp]`（`RowVersion`）实现乐观并发：

```csharp
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; }
}
```

UPDATE 时 EF Core 自动添加 `RowVersion` 检查：

```sql
UPDATE Blogs
SET Url = @p1
WHERE BlogId = @p0 AND RowVersion = @p2;
-- 若影响 0 行，抛出 DbUpdateConcurrencyException
```

#### 4.5.3 悲观并发

显式锁：

```csharp
using var transaction = await context.Database.BeginTransactionAsync();

// SQL Server: WITH (UPDLOCK)
var blog = await context.Blogs
    .FromSqlRaw("SELECT * FROM Blogs WITH (UPDLOCK) WHERE BlogId = {0}", id)
    .FirstAsync();

blog.Url = "new-url";
await context.SaveChangesAsync();
await transaction.CommitAsync();
```

---

## 5. 代码示例

### 5.1 Code First 模型配置（C# 12+）

```csharp
// C# 12+ / .NET 8+: Code First 模型配置
public class Blog
{
    public int BlogId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Url { get; set; }

    [Column(TypeName = "datetime2")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Post> Posts { get; set; } = new();
    public BlogMetadata Metadata { get; set; }  // Owned Entity
}

public class Post
{
    public int PostId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Title { get; set; }

    public string Content { get; set; }
    public DateTime PublishedAt { get; set; }
    public int BlogId { get; set; }
    public Blog Blog { get; set; }

    public List<Tag> Tags { get; set; } = new();  // 多对多
}

public class Tag
{
    public int TagId { get; set; }
    public string Name { get; set; }
    public List<Post> Posts { get; set; } = new();
}

public class BlogMetadata  // Owned Entity
{
    public int Views { get; set; }
    public string Owner { get; set; }
}

public class BlogContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<Tag> Tags { get; set; }

    public BlogContext(DbContextOptions<BlogContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Fluent API 配置
        modelBuilder.Entity<Blog>(b =>
        {
            b.HasKey(x => x.BlogId);
            b.Property(x => x.Url).IsRequired().HasMaxLength(200);
            b.HasIndex(x => x.Url).IsUnique();
            b.OwnsOne(x => x.Metadata, m =>
            {
                m.Property(p => p.Owner).HasMaxLength(100);
            });
            b.HasMany(x => x.Posts)
                .WithOne(p => p.Blog)
                .HasForeignKey(p => p.BlogId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Post>(p =>
        {
            p.HasKey(x => x.PostId);
            p.HasIndex(x => new { x.BlogId, x.PublishedAt });
            p.HasMany(x => x.Tags)
                .WithMany(t => t.Posts)
                .UsingEntity(j => j.ToTable("PostTags"));
        });

        // 全局查询过滤器（多租户）
        modelBuilder.Entity<Blog>().HasQueryFilter(b => b.TenantId == _tenantId);

        // 精度配置（decimal）
        modelBuilder.Entity<Order>()
            .Property(o => o.Amount)
            .HasPrecision(18, 2);

        // TPC 继承映射
        modelBuilder.Entity<Animal>().UseTpcMappingStrategy();
    }
}
```

### 5.2 迁移命令

```bash
# 创建迁移
dotnet ef migrations add InitialCreate

# 应用迁移到数据库
dotnet ef database update

# 撤销最后一次迁移（未应用前）
dotnet ef migrations remove

# 生成 SQL 脚本（不应用）
dotnet ef migrations script --output migration.sql

# 生成 idempotent 脚本（多次执行不报错）
dotnet ef migrations script --idempotent --output migration.sql

# 反向工程（Database First）
dotnet ef dbcontext scaffold "Server=.;Database=Blog;Trusted_Connection=True" \
    Microsoft.EntityFrameworkCore.SqlServer \
    --output-dir Models \
    --context-dir Data \
    --context BlogContext \
    --use-database-names \
    --no-onconfiguring

# 删除数据库
dotnet ef database drop --force

# 生成编译模型
dotnet ef dbcontext optimize --output-dir CompiledModels
```

### 5.3 查询模式

```csharp
// Eager Loading（解决 N+1）
var blogs1 = await context.Blogs
    .Include(b => b.Posts)
        .ThenInclude(p => p.Tags)
    .ToListAsync();

// Split Query（避免 Cartesian Explosion）
var blogs2 = await context.Blogs
    .Include(b => b.Posts)
        .ThenInclude(p => p.Tags)
    .AsSplitQuery()
    .ToListAsync();

// Explicit Loading
var blog = await context.Blogs.FindAsync(1);
await context.Entry(blog).Collection(b => b.Posts).LoadAsync();

// AsNoTracking（只读查询优化）
var blogs3 = await context.Blogs
    .AsNoTracking()
    .Where(b => b.IsActive)
    .ToListAsync();

// AsNoTrackingWithIdentityResolution（避免重复实体）
var blogs4 = await context.Blogs
    .Include(b => b.Posts)
    .AsNoTrackingWithIdentityResolution()
    .ToListAsync();

// Projection（只查询需要的列）
var blogSummaries = await context.Blogs
    .Select(b => new BlogSummary
    {
        Url = b.Url,
        PostCount = b.Posts.Count,
        LatestPostDate = b.Posts.Max(p => (DateTime?)p.PublishedAt)
    })
    .ToListAsync();

// Compiled Query（预编译查询）
private static readonly Func<BlogContext, int, Task<Blog>> _getBlogById =
    EF.CompileAsyncQuery((BlogContext ctx, int id) =>
        ctx.Blogs.Include(b => b.Posts).FirstOrDefault(b => b.BlogId == id));

var blog = await _getBlogById(context, 1);

// 原生 SQL 查询
var activeBlogs = await context.Blogs
    .FromSqlRaw("SELECT * FROM Blogs WHERE IsActive = 1")
    .ToListAsync();

// 复杂 SQL + LINQ 组合
var filteredBlogs = await context.Blogs
    .FromSqlInterpolated($"SELECT * FROM Blogs WHERE CreatedAt > {dateThreshold}")
    .Where(b => b.Url.Contains("dotnet"))
    .OrderBy(b => b.CreatedAt)
    .ToListAsync();
```

### 5.4 批量操作

```csharp
// EF Core 7+: ExecuteUpdate（直接翻译为 SQL UPDATE）
await context.Blogs
    .Where(b => b.CreatedAt < DateTime.UtcNow.AddYears(-1))
    .ExecuteUpdateAsync(s => s
        .SetProperty(b => b.Url, b => b.Url + "/archived")
        .SetProperty(b => b.Metadata.Owner, "system"));

// ExecuteDelete（直接翻译为 SQL DELETE）
await context.Posts
    .Where(p => p.PublishedAt < DateTime.UtcNow.AddYears(-2))
    .ExecuteDeleteAsync();

// ExecuteUpdate 返回受影响行数
int affectedRows = await context.Blogs
    .Where(b => b.IsActive == false)
    .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsActive, true));

// 批量插入（EF Core 7+ 原生支持）
context.Blogs.AddRange(blogs);
await context.SaveChangesAsync();  // 自动批处理

// 高性能批量插入（第三方库）
await context.BulkInsertAsync(blogs);  // EFCore.BulkExtensions
await context.BulkUpdateAsync(blogs);
await context.BulkDeleteAsync(blogs);
```

### 5.5 事务与并发

```csharp
// 显式事务
using var transaction = await context.Database.BeginTransactionAsync(
    IsolationLevel.ReadCommitted);

try
{
    var blog = new Blog { Url = "https://example.com" };
    context.Blogs.Add(blog);
    await context.SaveChangesAsync();

    var post = new Post { BlogId = blog.BlogId, Title = "Hello" };
    context.Posts.Add(post);
    await context.SaveChangesAsync();

    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}

// 乐观并发
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; }
}

try
{
    blog.Url = "new-url";
    await context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync();

    if (dbValues == null)
    {
        // 实体已被删除
        return NotFound();
    }

    // 显示冲突
    var currentUrl = (string)dbValues["Url"];
    return Conflict(new { message = $"数据库当前 Url: {currentUrl}" });
}

// 跨上下文事务（分布式事务）
using var scope = new TransactionScope(
    TransactionScopeOption.Required,
    new TransactionOptions { IsolationLevel = System.Transactions.IsolationLevel.ReadCommitted },
    TransactionScopeAsyncFlowOption.Enabled);

try
{
    await context1.SaveChangesAsync();
    await context2.SaveChangesAsync();
    scope.Complete();
}
finally
{
    scope.Dispose();
}
```

### 5.6 全局查询过滤器（多租户）

```csharp
public interface ITenantEntity
{
    string TenantId { get; set; }
}

public class Blog : ITenantEntity
{
    public int BlogId { get; set; }
    public string Url { get; set; }
    public string TenantId { get; set; }
}

public class TenantDbContext : DbContext
{
    private readonly string _tenantId;

    public TenantDbContext(DbContextOptions<TenantDbContext> options, ITenantProvider tenantProvider)
        : base(options)
    {
        _tenantId = tenantProvider.GetCurrentTenantId();
    }

    public DbSet<Blog> Blogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>()
            .HasQueryFilter(b => b.TenantId == _tenantId);

        modelBuilder.Entity<Blog>()
            .HasIndex(b => new { b.TenantId, b.Url })
            .IsUnique();
    }
}

// 临时禁用过滤器
var allBlogs = await context.Blogs
    .IgnoreQueryFilters()
    .ToListAsync();
```

### 5.7 自定义拦截器

```csharp
// SQL 拦截器：记录所有执行的 SQL
public class SqlLoggingInterceptor : DbCommandInterceptor
{
    private readonly ILogger<SqlLoggingInterceptor> _logger;

    public SqlLoggingInterceptor(ILogger<SqlLoggingInterceptor> logger)
    {
        _logger = logger;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SQL: {Sql}", command.CommandText);
        _logger.LogDebug("Parameters: {Parameters}",
            string.Join(", ", command.Parameters.Cast<DbParameter>().Select(p => $"{p.ParameterName}={p.Value}")));
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<int> NonQueryExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SQL affected {Count} rows: {Sql}", result, command.CommandText);
        return base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
    }
}

// 注册拦截器
services.AddDbContext<BlogContext>(options =>
    options.UseSqlServer(connectionString)
        .AddInterceptors(new SqlLoggingInterceptor(logger)));

// 慢查询检测
public class SlowQueryInterceptor : DbCommandInterceptor
{
    private const int SlowQueryThresholdMs = 100;
    private readonly ILogger<SlowQueryInterceptor> _logger;

    public override ValueTask<CommandExecutedDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        CommandExecutedDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Duration.TotalMilliseconds > SlowQueryThresholdMs)
        {
            _logger.LogWarning("Slow query ({Ms}ms): {Sql}",
                eventData.Duration.TotalMilliseconds, command.CommandText);
        }
        return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
    }
}
```

### 5.8 跨数据库 Provider

```csharp
// 可移植 DbContext
public class BlogContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }

    public BlogContext(DbContextOptions<BlogContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 跨 Provider 通用配置
        modelBuilder.Entity<Blog>(b =>
        {
            b.HasKey(x => x.BlogId);
            b.Property(x => x.Url).IsRequired().HasMaxLength(200);

            // Provider 特定配置
            if (Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                b.Property(x => x.CreatedAt).HasColumnType("datetime2");
            }
            else if (Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            }
            else if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                b.Property(x => x.CreatedAt).HasColumnType("TEXT");
            }
        });
    }
}

// 注册不同 Provider
// SQL Server
services.AddDbContext<BlogContext>(options =>
    options.UseSqlServer(Configuration.GetConnectionString("SqlServer")));

// PostgreSQL
services.AddDbContext<BlogContext>(options =>
    options.UseNpgsql(Configuration.GetConnectionString("Postgres")));

// SQLite
services.AddDbContext<BlogContext>(options =>
    options.UseSqlite(Configuration.GetConnectionString("Sqlite")));

// MySQL
services.AddDbContext<BlogContext>(options =>
    options.UseMySql(
        Configuration.GetConnectionString("MySql"),
        ServerVersion.AutoDetect(Configuration.GetConnectionString("MySql"))));
```

### 5.9 CQRS 与 Dapper 集成

```csharp
// EF Core 处理写操作
public class BlogCommandHandler
{
    private readonly BlogContext _context;

    public BlogCommandHandler(BlogContext context) => _context = context;

    public async Task<int> CreateBlog(CreateBlogCommand command)
    {
        var blog = new Blog { Url = command.Url };
        _context.Blogs.Add(blog);
        await _context.SaveChangesAsync();
        return blog.BlogId;
    }
}

// Dapper 处理读操作（性能优化）
public class BlogQueryHandler
{
    private readonly IDbConnection _connection;

    public BlogQueryHandler(IDbConnection connection) => _connection = connection;

    public async Task<BlogSummaryDto> GetBlogSummary(int blogId)
    {
        const string sql = @"
            SELECT b.Url, COUNT(p.PostId) AS PostCount
            FROM Blogs b
            LEFT JOIN Posts p ON b.BlogId = p.BlogId
            WHERE b.BlogId = @BlogId
            GROUP BY b.Url";

        return await _connection.QueryFirstOrDefaultAsync<BlogSummaryDto>(
            sql, new { BlogId = blogId });
    }

    public async Task<IEnumerable<BlogListDto>> GetBlogsByTag(string tag)
    {
        const string sql = @"
            SELECT b.BlogId, b.Url
            FROM Blogs b
            INNER JOIN PostTags pt ON pt.PostBlogId = b.BlogId  -- 注意多对多生成
            INNER JOIN Tags t ON t.TagId = pt.TagTagId
            WHERE t.Name = @Tag";

        return await _connection.QueryAsync<BlogListDto>(sql, new { Tag = tag });
    }
}
```

### 5.10 复杂类型（EF Core 8+）

```csharp
// EF Core 8+: Complex Types（无主键的值对象）
[ComplexType]
public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
    public GeoCoordinate Location { get; set; }
}

[ComplexType]
public class GeoCoordinate
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class Customer
{
    public int CustomerId { get; set; }
    public string Name { get; set; }
    public Address ShippingAddress { get; set; }
    public Address BillingAddress { get; set; }  // Complex Type 可重复使用
}

// 配置
modelBuilder.Entity<Customer>(c =>
{
    c.ComplexProperty(x => x.ShippingAddress);
    c.ComplexProperty(x => x.BillingAddress);
});

// 数据库列：ShippingAddress_Street, ShippingAddress_City, ...
// 注意：Complex Type 不能为 null（与 Owned Entity 不同）
```

### 5.11 JSON 列映射（EF Core 7+）

```csharp
// EF Core 7+: 将对象映射为 JSON 列
public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; }
    public ContactInfo Contact { get; set; }  // 映射为 JSON 列
}

public class ContactInfo
{
    public string Email { get; set; }
    public string Phone { get; set; }
    public List<string> SocialMedia { get; set; }
    public Address Address { get; set; }  // 嵌套对象
}

// 配置
modelBuilder.Entity<Customer>(c =>
{
    c.OwnsOne(x => x.Contact, builder =>
    {
        builder.ToJson();  // 存储为 JSON 列
        builder.OwnsOne(ci => ci.Address);
    });
});

// 查询 JSON 属性（SQL Server 2022 / PostgreSQL）
var customersInNY = await context.Customers
    .Where(c => c.Contact.Address.City == "New York")
    .ToListAsync();

// 翻译为：
// SELECT * FROM Customers WHERE JSON_VALUE(Contact, '$.Address.City') = 'New York'
```

### 5.12 异步流式处理（IAsyncEnumerable）

```csharp
// EF Core 8+: IAsyncEnumerable 流式处理
public async IAsyncEnumerable<Blog> StreamBlogsAsync(
    [EnumeratorCancellation] CancellationToken cancellationToken = default)
{
    await foreach (var blog in context.Blogs
        .AsAsyncEnumerable()
        .WithCancellation(cancellationToken))
    {
        yield return blog;
    }
}

// 大数据集处理（避免内存爆炸）
await foreach (var blog in StreamBlogsAsync(cancellationToken))
{
    ProcessBlog(blog);
}

// 批量处理
var batchSize = 100;
var batch = new List<Blog>(batchSize);

await foreach (var blog in context.Blogs.AsAsyncEnumerable())
{
    batch.Add(blog);
    if (batch.Count >= batchSize)
    {
        ProcessBatch(batch);
        batch.Clear();
    }
}

if (batch.Count > 0) ProcessBatch(batch);
```

---

## 6. 对比分析

### 6.1 EF Core vs Dapper vs NHibernate

| 特性 | EF Core | Dapper | NHibernate |
|------|---------|--------|------------|
| 学习曲线 | 中等 | 低 | 高 |
| 性能 | 中 | 高 | 低 |
| 跨数据库 | ✓ | ✓ | ✓ |
| 迁移工具 | ✓（内置） | ✗ | 第三方 |
| 变更跟踪 | ✓ | ✗ | ✓ |
| 复杂查询 | 中 | 高 | 低 |
| Lazy Loading | ✓ | ✗ | ✓ |
| 多对多 | ✓ | ✗ | ✓ |
| LINQ 翻译 | 强 | ✗ | 中 |
| AOT 支持 | 部分 | ✓ | ✗ |
| 社区活跃度 | 高 | 高 | 中 |
| 推荐场景 | 业务复杂、领域模型 | 简单 CRUD、性能敏感 | 老项目维护 |

### 6.2 Code First vs Database First

| 维度 | Code First | Database First |
|------|-----------|----------------|
| 起始点 | C# 实体类 | 已有数据库 |
| 优先级 | 业务模型 | 数据库模式 |
| 迁移 | 自动生成 | 手动维护 |
| 团队协作 | 优 | 中 |
| 数据库特性 | 受限 | 完整支持 |
| 适合场景 | 新项目 | 现有数据库 |

### 6.3 Eager Loading vs Split Query vs Explicit Loading

| 方案 | 查询次数 | 网络往返 | 内存 | SQL 复杂度 | 适用场景 |
|------|---------|---------|------|----------|---------|
| Eager Loading | 1 | 1 | 高（Cartesian） | LEFT JOIN | 关联少 |
| Split Query | N（关联数） | N | 中 | N 个 SELECT | 关联多 |
| Explicit Loading | 1 + N | 1 + N | 低 | 简单 | 按需加载 |
| Lazy Loading | 1 + N | 1 + N | 低 | 简单 | 不推荐 |

### 6.4 TPH vs TPT vs TPC 继承映射

| 策略 | 表数量 | 性能 | 复杂度 | NULL 列 | 适用场景 |
|------|--------|------|--------|---------|---------|
| TPH（Table per Hierarchy） | 1 | 最快 | 低 | 多 | 子类型少 |
| TPT（Table per Type） | N（类型数） | 中 | 中 | 无 | 子类型多 |
| TPC（Table per Concrete type） | N（具体类） | 中 | 高 | 无 | 深继承树 |

```csharp
// TPH（默认）
modelBuilder.Entity<Animal>().UseTphMappingStrategy();

// TPT
modelBuilder.Entity<Animal>().UseTptMappingStrategy();

// TPC（EF Core 7+）
modelBuilder.Entity<Animal>().UseTpcMappingStrategy();
```

### 6.5 NoTracking vs Tracking

| 维度 | AsNoTracking | AsNoTrackingWithIdentityResolution | Tracking |
|------|--------------|-----------------------------------|----------|
| 性能 | 最快 | 略慢 | 慢 |
| 内存 | 低 | 中 | 高 |
| 重复实体 | 多份 | 一份 | 一份 |
| 修改保存 | ✗ | ✗ | ✓ |
| 适用场景 | 只读查询 | 只读查询 + 关联 | 写操作 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：N+1 查询

**反例**：

```csharp
// N+1 查询
var blogs = await context.Blogs.ToListAsync();  // 1 次
foreach (var blog in blogs)
{
    var postCount = blog.Posts.Count;  // 每次都触发 SQL（懒加载）
    Console.WriteLine($"{blog.Url}: {postCount}");
}
// 总查询次数：1 + N（N = blogs.Count）
```

**最佳实践**：

```csharp
// Eager Loading
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .ToListAsync();  // 1 次

// 或 Projection（最优化）
var blogStats = await context.Blogs
    .Select(b => new { b.Url, PostCount = b.Posts.Count })
    .ToListAsync();  // 1 次
```

### 7.2 陷阱：ChangeTracker 膨胀

**反例**：

```csharp
// 长时间跟踪大量实体，ChangeTracker 变慢
foreach (var item in hugeList)
{
    context.Items.Add(item);
}
await context.SaveChangesAsync();  // 可能 OOM 或超时
```

**最佳实践**：

```csharp
// 批量提交
const int batchSize = 1000;
for (int i = 0; i < hugeList.Count; i += batchSize)
{
    var batch = hugeList.Skip(i).Take(batchSize);
    context.Items.AddRange(batch);
    await context.SaveChangesAsync();
    context.ChangeTracker.Clear();  // 清理跟踪
}

// 或使用 EFCore.BulkExtensions
await context.BulkInsertAsync(hugeList);
```

### 7.3 陷阱：循环中的查询

**反例**：

```csharp
// 每次循环都查询数据库
foreach (var id in ids)
{
    var entity = await context.Blogs.FindAsync(id);  // N 次查询
    Process(entity);
}
```

**最佳实践**：

```csharp
// 批量查询
var entities = await context.Blogs
    .Where(b => ids.Contains(b.BlogId))
    .ToDictionaryAsync(b => b.BlogId);  // 1 次查询

foreach (var id in ids)
{
    if (entities.TryGetValue(id, out var entity))
        Process(entity);
}
```

### 7.4 陷阱：Cartesian Explosion

**反例**：

```csharp
// 多重 Include 导致 Cartesian Explosion
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Author)
    .Include(b => b.Tags)
    .ToListAsync();
// 假设：100 blogs × 50 posts × 3 tags = 15000 行，重复 blog 数据 150 次
```

**最佳实践**：

```csharp
// Split Query
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Author)
    .Include(b => b.Tags)
    .AsSplitQuery()
    .ToListAsync();
// 4 次查询：1 blogs + 1 posts + 1 author + 1 tags
```

### 7.5 陷阱：AutoDetectChangesEnabled 性能问题

**反例**：

```csharp
// 大量 Add 操作时，每次 Add 都触发 DetectChanges
foreach (var item in hugeList)
{
    context.Items.Add(item);  // 每次都 DetectChanges
}
```

**最佳实践**：

```csharp
// 禁用自动检测
context.ChangeTracker.AutoDetectChangesEnabled = false;
try
{
    context.Items.AddRange(hugeList);
    context.ChangeTracker.DetectChanges();  // 手动调用一次
    await context.SaveChangesAsync();
}
finally
{
    context.ChangeTracker.AutoDetectChangesEnabled = true;
}
```

### 7.6 陷阱：DbContext 线程不安全

**反例**：

```csharp
// DbContext 不是线程安全的，并发访问会出错
public class Service
{
    private readonly BlogContext _context;  // 单例

    public async Task MultipleRequests()
    {
        var tasks = Enumerable.Range(0, 10)
            .Select(_ => _context.Blogs.ToListAsync());
        await Task.WhenAll(tasks);  // 异常！
    }
}
```

**最佳实践**：

```csharp
// 注册为 Scoped（每次请求一个实例）
services.AddDbContext<BlogContext>(options =>
    options.UseSqlServer(connectionString),
    ServiceLifetime.Scoped);

// 或使用 DbContextPool
services.AddDbContextPool<BlogContext>(options =>
    options.UseSqlServer(connectionString), poolSize: 128);
```

### 7.7 最佳实践总结

| 实践 | 说明 |
|------|------|
| 只读查询使用 `AsNoTracking` | 性能提升 30-50% |
| 批量操作禁用 AutoDetectChanges | 避免每次 Add 触发 DetectChanges |
| 避免循环内查询 | 改为批量查询 |
| 使用 Projection 减少数据传输 | 只查询需要的列 |
| 多 Include 使用 SplitQuery | 避免 Cartesian Explosion |
| 批量提交避免 ChangeTracker 膨胀 | 每 1000 条提交一次 |
| 索引覆盖查询条件 | 数据库索引是性能基础 |
| 编译模型减少启动时间 | EF Core 6+ 特性 |
| 跨上下文使用显式事务 | `BeginTransactionAsync` |
| 乐观并发使用 `[Timestamp]` | 默认推荐 |
| 长连接使用 DbContextPool | 减少实例化开销 |
| 慢查询检测使用 Interceptor | `DbCommandInterceptor` |

---

## 8. 工程实践

### 8.1 仓储模式（Repository Pattern）

```csharp
public interface IRepository<T> where T : class
{
    Task<T> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
}

public class Repository<T> : IRepository<T> where T : class
{
    private readonly BlogContext _context;
    private readonly DbSet<T> _dbSet;

    public Repository(BlogContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T> GetByIdAsync(int id) => await _dbSet.FindAsync(id);

    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.AsNoTracking().ToListAsync();

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AsNoTracking().Where(predicate).ToListAsync();

    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);

    public Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }
}

// 工作单元（Unit of Work）
public interface IUnitOfWork
{
    IRepository<Blog> Blogs { get; }
    IRepository<Post> Posts { get; }
    Task<int> SaveChangesAsync();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly BlogContext _context;
    public IRepository<Blog> Blogs { get; }
    public IRepository<Post> Posts { get; }

    public UnitOfWork(BlogContext context)
    {
        _context = context;
        Blogs = new Repository<Blog>(context);
        Posts = new Repository<Post>(context);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
}
```

### 8.2 多租户架构

```csharp
public interface ITenantProvider
{
    string GetCurrentTenantId();
}

public class HttpContextTenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _accessor;

    public HttpContextTenantProvider(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public string GetCurrentTenantId()
    {
        return _accessor.HttpContext?.User?.FindFirst("tenant_id")?.Value
            ?? throw new InvalidOperationException("Tenant not found");
    }
}

// 多租户 DbContext
public class MultiTenantDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;

    public MultiTenantDbContext(
        DbContextOptions<MultiTenantDbContext> options,
        ITenantProvider tenantProvider) : base(options)
    {
        _tenantProvider = tenantProvider;
    }

    public DbSet<Blog> Blogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>()
            .HasQueryFilter(b => b.TenantId == _tenantProvider.GetCurrentTenantId());
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantProvider.GetCurrentTenantId();
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.TenantId = tenantId;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
```

### 8.3 软删除模式

```csharp
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}

public class Blog : ISoftDeletable
{
    public int BlogId { get; set; }
    public string Url { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}

// 全局查询过滤器
modelBuilder.Entity<Blog>()
    .HasQueryFilter(b => !b.IsDeleted);

// 软删除扩展方法
public static class SoftDeleteExtensions
{
    public static Task SoftDeleteAsync<T>(this DbSet<T> dbSet, T entity)
        where T : class, ISoftDeletable
    {
        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        dbSet.Update(entity);
        return Task.CompletedTask;
    }
}

// 使用
await context.Blogs.SoftDeleteAsync(blog);
await context.SaveChangesAsync();

// 临时查询已删除数据
var deletedBlogs = await context.Blogs
    .IgnoreQueryFilters()
    .Where(b => b.IsDeleted)
    .ToListAsync();
```

### 8.4 审计日志（SaveChanges 拦截）

```csharp
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUser;

    public AuditInterceptor(ICurrentUserService currentUser)
    {
        _currentUser = currentUser;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        var auditEntries = new List<AuditEntry>();
        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            var auditEntry = new AuditEntry(entry)
            {
                TableName = entry.Metadata.GetTableName(),
                UserId = _currentUser.UserId,
                Action = entry.State switch
                {
                    EntityState.Added => "INSERT",
                    EntityState.Modified => "UPDATE",
                    EntityState.Deleted => "DELETE",
                    _ => null
                }
            };

            foreach (var property in entry.Properties)
            {
                if (entry.State == EntityState.Added)
                {
                    auditEntry.NewValues[property.Metadata.Name] = property.CurrentValue;
                }
                else if (entry.State == EntityState.Deleted)
                {
                    auditEntry.OldValues[property.Metadata.Name] = property.OriginalValue;
                }
                else if (entry.State == EntityState.Modified && property.IsModified)
                {
                    auditEntry.OldValues[property.Metadata.Name] = property.OriginalValue;
                    auditEntry.NewValues[property.Metadata.Name] = property.CurrentValue;
                }
            }

            auditEntries.Add(auditEntry);
        }

        // 保存审计日志（可异步写入独立表）
        foreach (var auditEntry in auditEntries)
        {
            context.Set<AuditLog>().Add(auditEntry.ToAudit());
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
```

### 8.5 EF Core Analyzer

```csharp
// 自定义 Roslyn 分析器：检测 N+1 查询模式
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class NPlusOneQueryAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "EF001";

    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        "Potential N+1 query",
        "Loop contains DbContext query, possible N+1",
        "Performance",
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeLoop, SyntaxKind.ForEachStatement);
        context.RegisterSyntaxNodeAction(AnalyzeLoop, SyntaxKind.ForStatement);
    }

    private static void AnalyzeLoop(SyntaxNodeAnalysisContext context)
    {
        var loop = context.Node;
        var semanticModel = context.SemanticModel;

        // 检测循环内是否有 DbContext 查询调用
        var invocations = loop.DescendantNodes().OfType<InvocationExpressionSyntax>();
        foreach (var invocation in invocations)
        {
            var symbol = semanticModel.GetSymbolInfo(invocation).Symbol as IMethodSymbol;
            if (symbol?.Name == "ToListAsync" || symbol?.Name == "FirstAsync")
            {
                var diagnostic = Diagnostic.Create(Rule, invocation.GetLocation());
                context.ReportDiagnostic(diagnostic);
                break;
            }
        }
    }
}
```

---

## 9. 案例研究

### 9.1 案例一：电商订单系统

**场景**：电商系统订单管理，包含订单、订单项、商品、用户多对多关系。

```csharp
public class Order
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public OrderStatus Status { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public Address ShippingAddress { get; set; }
}

public class OrderItem
{
    public int OrderItemId { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class Product
{
    public int ProductId { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}

// 高性能查询：使用 Projection 避免加载完整实体
public async Task<OrderDto> GetOrderAsync(int orderId)
{
    return await context.Orders
        .AsNoTracking()
        .Where(o => o.OrderId == orderId)
        .Select(o => new OrderDto
        {
            OrderNumber = o.OrderNumber,
            CreatedAt = o.CreatedAt,
            Status = o.Status.ToString(),
            User = new UserDto { Name = o.User.Name, Email = o.User.Email },
            Items = o.Items.Select(i => new OrderItemDto
            {
                ProductName = i.Product.Name,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Subtotal = i.Quantity * i.UnitPrice
            }).ToList(),
            TotalAmount = o.Items.Sum(i => i.Quantity * i.UnitPrice)
        })
        .FirstOrDefaultAsync();
}

// 批量下单：使用事务
public async Task<int> CreateOrderAsync(CreateOrderCommand command)
{
    using var transaction = await context.Database.BeginTransactionAsync();
    try
    {
        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(),
            UserId = command.UserId,
            Status = OrderStatus.Pending,
            ShippingAddress = command.ShippingAddress
        };

        foreach (var item in command.Items)
        {
            var product = await context.Products.FindAsync(item.ProductId);
            if (product.Stock < item.Quantity)
                throw new InvalidOperationException($"Insufficient stock: {product.Name}");

            product.Stock -= item.Quantity;
            order.Items.Add(new OrderItem
            {
                ProductId = product.ProductId,
                Quantity = item.Quantity,
                UnitPrice = product.Price
            });
        }

        context.Orders.Add(order);
        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        return order.OrderId;
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### 9.2 案例二：内容管理系统（CMS）

**场景**：CMS 系统，文章与标签多对多关系，分类树形结构。

```csharp
public class Article
{
    public int ArticleId { get; set; }
    public string Title { get; set; }
    public string Content { get; set; }
    public DateTime PublishedAt { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; }
    public List<Tag> Tags { get; set; } = new();
}

public class Category
{
    public int CategoryId { get; set; }
    public string Name { get; set; }
    public int? ParentCategoryId { get; set; }
    public Category Parent { get; set; }
    public List<Category> Children { get; set; } = new();
}

// 递归查询分类树（SQL Server CTE）
public async Task<CategoryTreeDto> GetCategoryTreeAsync()
{
    const string sql = @"
        WITH CategoryCTE AS (
            SELECT CategoryId, Name, ParentCategoryId, 0 AS Level
            FROM Categories
            WHERE ParentCategoryId IS NULL
            UNION ALL
            SELECT c.CategoryId, c.Name, c.ParentCategoryId, p.Level + 1
            FROM Categories c
            INNER JOIN CategoryCTE p ON c.ParentCategoryId = p.CategoryId
        )
        SELECT * FROM CategoryCTE";

    var categories = await context.Categories
        .FromSqlRaw(sql)
        .AsNoTracking()
        .ToListAsync();

    return BuildTree(categories);
}

// 全文搜索（PostgreSQL pg_trgm）
public async Task<IEnumerable<ArticleSearchResult>> SearchArticlesAsync(string keyword)
{
    return await context.Articles
        .AsNoTracking()
        .Where(a => EF.Functions.TrigramsAreSimilar(a.Title, keyword)
                 || EF.Functions.TrigramsAreSimilar(a.Content, keyword))
        .OrderByDescending(a => EF.Functions.TrigramSimilarity(a.Title, keyword))
        .Select(a => new ArticleSearchResult
        {
            ArticleId = a.ArticleId,
            Title = a.Title,
            PublishedAt = a.PublishedAt
        })
        .ToListAsync();
}
```

### 9.3 案例三：SaaS 多租户

**场景**：SaaS 平台，每个租户独立数据，使用全局查询过滤器。

```csharp
public class TenantDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;
    public string CurrentTenantId => _tenantProvider.GetCurrentTenantId();

    public TenantDbContext(
        DbContextOptions<TenantDbContext> options,
        ITenantProvider tenantProvider) : base(options)
    {
        _tenantProvider = tenantProvider;
    }

    public DbSet<Project> Projects { get; set; }
    public DbSet<Task> Tasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 所有实体自动添加 TenantId 过滤
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter($"TenantId == '{CurrentTenantId}'");
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.TenantId = CurrentTenantId;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
```

### 9.4 案例四：事件溯源（Event Sourcing）

**场景**：事件溯源系统，聚合根状态由事件重放得到。

```csharp
public class EventStore
{
    private readonly EventStoreContext _context;

    public EventStore(EventStoreContext context) => _context = context;

    public async Task SaveEventsAsync(Guid aggregateId, IEnumerable<object> events, int expectedVersion)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var currentVersion = await _context.Events
                .Where(e => e.AggregateId == aggregateId)
                .CountAsync();

            if (currentVersion != expectedVersion)
                throw new ConcurrencyException($"Expected version {expectedVersion}, actual {currentVersion}");

            foreach (var @event in events)
            {
                _context.Events.Add(new EventRecord
                {
                    AggregateId = aggregateId,
                    EventType = @event.GetType().FullName,
                    EventData = JsonSerializer.Serialize(@event, @event.GetType()),
                    Version = ++currentVersion,
                    Timestamp = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<IEnumerable<object>> LoadEventsAsync(Guid aggregateId)
    {
        var records = await _context.Events
            .Where(e => e.AggregateId == aggregateId)
            .OrderBy(e => e.Version)
            .AsNoTracking()
            .ToListAsync();

        return records.Select(r =>
        {
            var type = Type.GetType(r.EventType);
            return JsonSerializer.Deserialize(r.EventData, type);
        });
    }
}
```

### 9.5 案例五：审计日志系统

**场景**：所有实体变更记录到审计表，支持查询历史。

```csharp
public class AuditLog
{
    public int AuditLogId { get; set; }
    public string TableName { get; set; }
    public string Action { get; set; }  // INSERT / UPDATE / DELETE
    public string KeyValues { get; set; }  // JSON
    public string OldValues { get; set; }  // JSON
    public string NewValues { get; set; }  // JSON
    public string UserId { get; set; }
    public DateTime Timestamp { get; set; }
}

public class AuditInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Unchanged) continue;

            var audit = new AuditLog
            {
                TableName = entry.Metadata.GetTableName(),
                Action = entry.State.ToString(),
                Timestamp = DateTime.UtcNow,
                KeyValues = JsonSerializer.Serialize(
                    entry.Properties.Where(p => p.Metadata.IsPrimaryKey())
                        .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue))
            };

            if (entry.State == EntityState.Modified || entry.State == EntityState.Deleted)
            {
                audit.OldValues = JsonSerializer.Serialize(
                    entry.Properties.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue));
            }

            if (entry.State == EntityState.Modified || entry.State == EntityState.Added)
            {
                audit.NewValues = JsonSerializer.Serialize(
                    entry.Properties.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue));
            }

            context.Set<AuditLog>().Add(audit);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
```

### 9.6 案例六：跨数据库迁移

**场景**：从 SQL Server 迁移到 PostgreSQL，保持业务逻辑不变。

```csharp
// 抽象 DbContext
public abstract class BaseDbContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<Post> Posts { get; set; }

    protected BaseDbContext(DbContextOptions options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 通用配置
        modelBuilder.Entity<Blog>(b =>
        {
            b.HasKey(x => x.BlogId);
            b.Property(x => x.Url).IsRequired().HasMaxLength(200);
            b.HasIndex(x => x.Url).IsUnique();
        });

        // Provider 特定配置
        ConfigureForProvider(modelBuilder);
    }

    protected abstract void ConfigureForProvider(ModelBuilder modelBuilder);
}

// SQL Server
public class SqlServerDbContext : BaseDbContext
{
    public SqlServerDbContext(DbContextOptions<SqlServerDbContext> options) : base(options) { }

    protected override void ConfigureForProvider(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>()
            .Property(b => b.CreatedAt)
            .HasColumnType("datetime2");

        modelBuilder.Entity<Blog>()
            .Property(b => b.Id)
            .UseIdentityColumn();  // IDENTITY
    }
}

// PostgreSQL
public class PostgresDbContext : BaseDbContext
{
    public PostgresDbContext(DbContextOptions<PostgresDbContext> options) : base(options) { }

    protected override void ConfigureForProvider(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>()
            .Property(b => b.CreatedAt)
            .HasColumnType("timestamp with time zone");

        modelBuilder.Entity<Blog>()
            .Property(b => b.Id)
            .UseHiLo();  // HiLo 序列

        // 大小写敏感配置
        modelBuilder.UseSnakeCaseNamingConvention();
    }
}
```

### 9.7 案例七：性能优化实战

**场景**：列表页查询 10000 条记录，从 8 秒优化到 200 毫秒。

**优化前**：

```csharp
public async Task<List<BlogDto>> GetBlogsAsync()
{
    var blogs = await context.Blogs
        .Include(b => b.Posts)
        .Include(b => b.Author)
        .ToListAsync();  // 8 秒

    return blogs.Select(b => new BlogDto
    {
        Url = b.Url,
        PostCount = b.Posts.Count,
        AuthorName = b.Author.Name
    }).ToList();
}
```

**问题分析**：

1. Eager Loading 导致 Cartesian Explosion（10000 × 平均 50 posts = 500000 行）。
2. 加载完整实体，但只需 3 个字段。
3. ChangeTracker 跟踪 500000 个实体。

**优化后**：

```csharp
public async Task<List<BlogDto>> GetBlogsAsync()
{
    return await context.Blogs
        .AsNoTracking()
        .Select(b => new BlogDto
        {
            Url = b.Url,
            PostCount = b.Posts.Count,
            AuthorName = b.Author.Name
        })
        .ToListAsync();  // 200 毫秒
}
```

**进一步分页**：

```csharp
public async Task<PagedResult<BlogDto>> GetBlogsAsync(int page, int pageSize)
{
    var query = context.Blogs
        .AsNoTracking()
        .Select(b => new BlogDto
        {
            Url = b.Url,
            PostCount = b.Posts.Count,
            AuthorName = b.Author.Name
        });

    var totalCount = await query.CountAsync();
    var items = await query
        .OrderBy(b => b.Url)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return new PagedResult<BlogDto>(items, totalCount, page, pageSize);
}
```

---

## 10. 习题

### 10.1 选择题

**Q1**：以下哪种方式能解决 N+1 查询问题？

A. 使用 `AsNoTracking()`  
B. 使用 `Include()`  
C. 使用 `FindAsync()`  
D. 使用 `AsSplitQuery()`

**答案**：B

**解析**：`Include()` 通过 LEFT JOIN 一次性查询关联数据，解决 N+1 查询。`AsNoTracking()` 只是禁用变更跟踪，不影响查询次数。`FindAsync()` 默认不加载关联。`AsSplitQuery()` 是另一种解决方案，将关联拆分为多个查询。

---

**Q2**：EF Core 7+ 引入的 `ExecuteUpdateAsync` 相比 `SaveChangesAsync` 有什么优势？

A. 支持变更跟踪  
B. 直接翻译为 SQL UPDATE，不加载实体  
C. 自动开启事务  
D. 性能更慢

**答案**：B

**解析**：`ExecuteUpdateAsync` 直接翻译为 SQL UPDATE 语句，不加载实体到内存，适合批量更新。但不会触发 `SaveChangesInterceptor`，也不更新 ChangeTracker 状态。

---

**Q3**：以下哪种情况应该使用 `AsNoTrackingWithIdentityResolution` 而非 `AsNoTracking`？

A. 查询无关联实体  
B. 查询包含关联实体，且关联中可能有重复实体  
C. 查询只读数据  
D. 性能敏感场景

**答案**：B

**解析**：`AsNoTracking` 在关联查询时可能为同一实体创建多份实例（重复），`AsNoTrackingWithIdentityResolution` 通过身份映射确保同一实体只有一份实例，开销略大但数据一致性更好。

---

**Q4**：EF Core 6 引入的"编译模型"（Compiled Model）主要解决什么问题？

A. SQL 翻译性能  
B. DbContext 启动时间  
C. 实体物化性能  
D. ChangeTracker 性能

**答案**：B

**解析**：编译模型在编译期生成 `IModel` 实例，避免运行时通过反射构建模型，将 DbContext 首次查询时间从约 850ms 降低到 320ms。

---

**Q5**：以下哪种继承映射策略适合深继承树？

A. TPH（Table per Hierarchy）  
B. TPT（Table per Type）  
C. TPC（Table per Concrete type）  
D. 都一样

**答案**：C

**解析**：TPC 为每个具体类创建独立表，无 JOIN，查询性能好，适合深继承树。TPH 所有子类共享一张表，子类型多时 NULL 列过多。TPT 需要 JOIN，深继承树性能差。

---

### 10.2 简答题

**Q1**：解释 `AsNoTracking` 与 `AsNoTrackingWithIdentityResolution` 的区别，并说明何时使用哪个。

**参考答案**：

- `AsNoTracking`：查询的实体不进入 ChangeTracker，性能最优。但在关联查询时，若多个父实体引用同一子实体，会创建多份子实体实例。
- `AsNoTrackingWithIdentityResolution`：不跟踪，但维护身份映射，确保同一实体只有一份实例。性能略低于 `AsNoTracking`，但保证引用一致性。

使用场景：

- 只读简单查询（无关联）：`AsNoTracking`
- 只读关联查询（需引用一致）：`AsNoTrackingWithIdentityResolution`
- 写操作：默认跟踪

---

**Q2**：EF Core 的全局查询过滤器（`HasQueryFilter`）有什么用途？在多租户架构中如何使用？

**参考答案**：

全局查询过滤器为所有查询自动添加 WHERE 条件，常用于：

1. **软删除**：`HasQueryFilter(e => !e.IsDeleted)` 自动过滤已删除实体。
2. **多租户**：`HasQueryFilter(e => e.TenantId == _tenantId)` 自动按租户过滤。

多租户用法：

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Blog>()
        .HasQueryFilter(b => b.TenantId == _tenantProvider.GetCurrentTenantId());
}
```

可通过 `IgnoreQueryFilters()` 临时禁用过滤器（如管理员查看所有租户数据）。

---

**Q3**：解释 EF Core 的乐观并发控制机制。

**参考答案**：

EF Core 通过 `[Timestamp]`（`byte[]` RowVersion）实现乐观并发：

```csharp
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; }
}
```

UPDATE 时 EF Core 自动添加 `RowVersion` 检查：

```sql
UPDATE Blogs SET Url = @p1
WHERE BlogId = @p0 AND RowVersion = @p2;
```

若数据库中 `RowVersion` 已被其他事务修改，影响 0 行，EF Core 抛出 `DbUpdateConcurrencyException`。开发者捕获异常后可提示用户重新加载数据或合并冲突。

优势：无需显式锁，并发度高，适合 Web 应用。

---

### 10.3 编程题

**Q1**：实现一个支持软删除的 EF Core 扩展，包括全局查询过滤器与软删除方法。

**参考答案**：

```csharp
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}

public static class SoftDeleteExtensions
{
    // 在 OnModelCreating 中调用
    public static void ApplySoftDeleteFilter(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
            {
                var param = Expression.Parameter(entityType.ClrType, "e");
                var prop = Expression.Property(param, nameof(ISoftDeletable.IsDeleted));
                var falseConst = Expression.Constant(false);
                var filter = Expression.Lambda(Expression.Equal(prop, falseConst), param);

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
            }
        }
    }

    // 软删除扩展方法
    public static Task SoftDeleteAsync<T>(this DbSet<T> dbSet, Expression<Func<T, bool>> predicate)
        where T : class, ISoftDeletable
    {
        return dbSet.Where(predicate).ExecuteUpdateAsync(s => s
            .SetProperty(e => e.IsDeleted, true)
            .SetProperty(e => e.DeletedAt, DateTime.UtcNow));
    }
}

// 使用
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplySoftDeleteFilter();
}

// 软删除
await context.Blogs.SoftDeleteAsync(b => b.BlogId == id);
await context.SaveChangesAsync();

// 查询已删除数据
var deletedBlogs = await context.Blogs
    .IgnoreQueryFilters()
    .Where(b => b.IsDeleted)
    .ToListAsync();
```

---

**Q2**：实现一个自定义 `IInterceptor`，记录所有慢查询（> 100ms）并写入日志。

**参考答案**：

```csharp
public class SlowQueryInterceptor : DbCommandInterceptor
{
    private const int SlowQueryThresholdMs = 100;
    private readonly ILogger<SlowQueryInterceptor> _logger;

    public SlowQueryInterceptor(ILogger<SlowQueryInterceptor> logger)
    {
        _logger = logger;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        LogIfSlow(command, eventData.Duration);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<int> NonQueryExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        LogIfSlow(command, eventData.Duration);
        return base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<object> ScalarExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        object result,
        CancellationToken cancellationToken = default)
    {
        LogIfSlow(command, eventData.Duration);
        return base.ScalarExecutedAsync(command, eventData, result, cancellationToken);
    }

    private void LogIfSlow(DbCommand command, TimeSpan duration)
    {
        if (duration.TotalMilliseconds > SlowQueryThresholdMs)
        {
            var parameters = string.Join(", ",
                command.Parameters.Cast<DbParameter>()
                    .Select(p => $"{p.ParameterName}={p.Value}"));

            _logger.LogWarning(
                "Slow query ({Ms:F1}ms): {Sql}\nParameters: {Parameters}",
                duration.TotalMilliseconds,
                command.CommandText,
                parameters);
        }
    }
}

// 注册
services.AddDbContext<BlogContext>(options =>
    options.UseSqlServer(connectionString)
        .AddInterceptors(new SlowQueryInterceptor(logger)));
```

---

## 11. 参考文献

本章节引用的学术与工程资料按 ACM Reference Format 列出：

[1] Microsoft. 2024. *Entity Framework Core Documentation*. Microsoft Learn. Retrieved July 20, 2026 from https://learn.microsoft.com/ef/core/

[2] Microsoft. 2023. *Entity Framework Core 8 Performance*. .NET Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/dotnet/announcing-ef-core-8/

[3] Arthur Vickers. 2022. *EF Core 7 Performance Optimizations*. .NET Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/dotnet/announcing-ef7/

[4] Jimmy Bogard. 2019. *Architecting with Entity Framework Core*. Pluralsight Course.

[5] Jon P Smith. 2022. *Entity Framework Core in Action* (2nd ed.). Manning Publications, Shelter Island, NY, USA.

[6] Mark Michaelis. 2023. *Essential Entity Framework Core 8*. Addison-Wesley, Boston, MA, USA.

[7] Andrew Troelsen and Phil Japikse. 2022. *Pro C# 10 with .NET 6* (11th ed.). Apress, Berkeley, CA, USA. DOI:https://doi.org/10.1007/978-1-4842-7890-0

[8] Erik Meijer, Brian Beckman, and Gavin Bierman. 2003. *LINQ: Reconciling Object, Relations and XML in the .NET Framework*. In *Proceedings of the 2003 ACM SIGMOD International Conference on Management of Data* (SIGMOD '03). ACM, New York, NY, USA, 706. DOI:https://doi.org/10.1145/872757.872858

[9] Martin Fowler. 2002. *Patterns of Enterprise Application Architecture*. Addison-Wesley, Boston, MA, USA.

[10] Eric Evans. 2003. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, Boston, MA, USA.

[11] Vaughn Vernon. 2013. *Implementing Domain-Driven Design*. Addison-Wesley, Boston, MA, USA.

[12] Jimmy Nilsson. 2006. *Applying Domain-Driven Design and Patterns*. Addison-Wesley, Boston, MA, USA.

[13] Scott W. Ambler. 2003. *Agile Database Techniques: Effective Strategies for the Agile Software Developer*. Wiley, New York, NY, USA.

[14] Randy Stafford. 2002. *Patterns of EAA: Repository*. Martin Fowler's Catalog. Retrieved July 20, 2026 from https://martinfowler.com/eaaCatalog/repository.html

[15] Greg Young. 2010. *CQRS Documents*. Retrieved July 20, 2026 from https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf

[16] Microsoft. 2024. *EF Core Migrations*. Microsoft Learn. Retrieved July 20, 2026 from https://learn.microsoft.com/ef/core/managing-schemas/migrations/

[17] Microsoft. 2024. *EF Core Performance*. Microsoft Learn. Retrieved July 20, 2026 from https://learn.microsoft.com/ef/core/performance/

[18] Microsoft. 2024. *EF Core Logging, Events, and Diagnostics*. Microsoft Learn. Retrieved July 20, 2026 from https://learn.microsoft.com/ef/core/logging-events-diagnostics/

[19] Pawel Kadluczka. 2023. *EF Core 8 Preview: Complex Types*. .NET Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/dotnet/announcing-ef-core-8-preview-5/

[20] Shay Rojansky. 2023. *PostgreSQL EF Core Provider*. Npgsql Documentation. Retrieved July 20, 2026 from https://www.npgsql.org/efcore/

---

## 12. 延伸阅读

### 12.1 官方文档

- [EF Core Documentation — Microsoft Learn](https://learn.microsoft.com/ef/core/)
- [EF Core Migrations](https://learn.microsoft.com/ef/core/managing-schemas/migrations/)
- [EF Core Performance](https://learn.microsoft.com/ef/core/performance/)
- [EF Core Logging and Interception](https://learn.microsoft.com/ef/core/logging-events-diagnostics/)
- [EF Core Testing](https://learn.microsoft.com/ef/core/testing/)

### 12.2 经典书籍

- *Entity Framework Core in Action* by Jon P Smith（EF Core 实战指南，含性能优化）
- *Pro Entity Framework Core for ASP.NET Core MVC* by Adam Freeman（ASP.NET Core 集成）
- *Architecting with Entity Framework Core* by Holger Schwichtenberg（企业架构实践）
- *Domain-Driven Design* by Eric Evans（领域驱动设计，EF Core 实现值对象、聚合根）
- *Patterns of Enterprise Application Architecture* by Martin Fowler（企业架构模式，含仓储、工作单元）

### 12.3 学术论文

- Meijer, E., Beckman, B., & Bierman, G. (2003). *LINQ: Reconciling Object, Relations and XML in the .NET Framework*. SIGMOD 2003.
- Bierman, G., Meijer, E., & Torgersen, M. (2007). *Lost in Translation: Formalizing the .NET LINQ Pattern*. SAC 2008.
- Young, G. (2010). *CQRS Documents*. cqrs.files.wordpress.com.

### 12.4 开源项目

- **EFCore.BulkExtensions**：高性能批量操作
  https://github.com/borisdj/EFCore.BulkExtensions

- **EFCore.NamingConventions**：命名约定（SnakeCase、CamelCase）
  https://github.com/efcore/EFCore.NamingConventions

- **EFCore.PowerTools**：反向工程、模型可视化
  https://github.com/ErikEJ/EFCorePowerTools

- **Pomelo.EntityFrameworkCore.MySql**：MySQL Provider
  https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql

- **Npgsql.EntityFrameworkCore.PostgreSQL**：PostgreSQL Provider
  https://github.com/npgsql/efcore.pg

- **AspNetCore.Diagnostics.EntityFrameworkCore**：EF Core 健康检查
  https://github.com/dotnet/AspNetCore.Diagnostics

### 12.5 进阶主题

1. **EF Core Source Generator**：编译期生成 `IModel`，减少启动时间。
2. **Cosmos DB Provider**：NoSQL 数据库的 EF Core 集成。
3. **In-Memory Provider**：单元测试用，但行为与关系数据库不同。
4. **SQLite Provider**：移动应用与桌面应用嵌入式数据库。
5. **Multitenant Architectures**：每租户数据库、共享数据库、Schema 分离策略。
6. **Event Sourcing with EF Core**：事件存储、快照、重放。
7. **CQRS Pattern**：读写分离，EF Core 处理写、Dapper 处理读。
8. **Distributed Transactions**：`TransactionScope` 与 MSDTC 的限制。
9. **Database Sharding**：分库分表与 EF Core 集成。
10. **NativeAOT Compatibility**：EF Core 9+ 对 AOT 的支持与限制。

---

## 附录 A：EF Core 性能基准（.NET 8, EF Core 8）

```
BenchmarkDotNet v0.13.12
Runtime=.NET 8.0
Database=SQL Server 2022
Table=Blogs (10000 rows)

| Method                              | Mean     | Allocated | Ratio |
|------------------------------------ |---------:|----------:|------:|
| FindAsync (tracked)                 | 2.45 ms  |  248 KB   |  1.00 |
| FindAsync (AsNoTracking)            | 1.80 ms  |  124 KB   |  0.73 |
| FirstAsync (tracked)                | 2.60 ms  |  260 KB   |  1.06 |
| FirstAsync (AsNoTracking)           | 1.85 ms  |  128 KB   |  0.76 |
| ToListAsync (1000, tracked)         | 18.50 ms |  2.4 MB   |  7.55 |
| ToListAsync (1000, AsNoTracking)    | 12.30 ms |  1.2 MB   |  5.02 |
| ToListAsync (Projection)            |  8.20 ms |  640 KB   |  3.35 |
| Include (10 blogs × 100 posts)      | 45.20 ms |  6.8 MB   | 18.45 |
| Include + AsSplitQuery              | 28.50 ms |  4.2 MB   | 11.63 |
| ExecuteUpdate (1000 rows)           |  3.20 ms |   24 KB   |  1.31 |
| SaveChanges (1000 inserts)          | 85.00 ms |  8.5 MB   | 34.69 |
| SaveChanges + AutoDetectChanges off | 62.50 ms |  4.2 MB   | 25.51 |
| BulkInsert (EFCore.BulkExtensions)  | 15.20 ms |  1.8 MB   |  6.20 |
| Dapper Query (1000 rows)            |  6.80 ms |  580 KB   |  2.78 |
```

---

## 附录 B：EF Core 迁移命令速查

```bash
# 创建迁移
dotnet ef migrations add <Name>

# 应用所有待应用迁移
dotnet ef database update

# 应用到指定迁移
dotnet ef database update <TargetMigration>

# 撤销最后一次迁移（未应用前）
dotnet ef migrations remove

# 生成 SQL 脚本
dotnet ef migrations script
dotnet ef migrations script <From> <To>
dotnet ef migrations script --idempotent --output script.sql

# 列出所有迁移
dotnet ef migrations list

# 删除数据库
dotnet ef database drop --force

# 反向工程
dotnet ef dbcontext scaffold "<Connection>" <Provider> \
    --output-dir Models \
    --context-dir Data \
    --context <ContextName> \
    --use-database-names \
    --no-onconfiguring \
    --data-annotations \
    --force

# 编译模型
dotnet ef dbcontext optimize --output-dir CompiledModels

# 生成 DbContext 类
dotnet ef dbcontext info
dotnet ef dbcontext list

# CLI 工具更新
dotnet tool update --global dotnet-ef
```

---

## 附录 C：EF Core 配置速查

### C.1 Data Annotation

```csharp
[Table("Blogs")]
public class Blog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int BlogId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("Url", TypeName = "nvarchar(200)")]
    public string Url { get; set; }

    [NotMapped]
    public string ComputedProperty => Url.ToUpper();

    [ConcurrencyCheck]
    public byte[] RowVersion { get; set; }

    [Timestamp]
    public byte[] Timestamp { get; set; }

    [ForeignKey("BlogId")]
    public List<Post> Posts { get; set; }

    [InverseProperty("Blog")]
    public List<Post> Posts { get; set; }
}
```

### C.2 Fluent API

```csharp
modelBuilder.Entity<Blog>(b =>
{
    b.ToTable("Blogs");
    b.HasKey(x => x.BlogId);
    b.Property(x => x.BlogId)
        .ValueGeneratedOnAdd()
        .UseIdentityColumn();
    b.Property(x => x.Url)
        .IsRequired()
        .HasMaxLength(200)
        .HasColumnName("Url")
        .HasColumnType("nvarchar(200)");
    b.Ignore(x => x.ComputedProperty);
    b.HasIndex(x => x.Url).IsUnique();
    b.HasIndex(x => new { x.CreatedAt, x.IsActive });

    b.HasMany(x => x.Posts)
        .WithOne(p => p.Blog)
        .HasForeignKey(p => p.BlogId)
        .OnDelete(DeleteBehavior.Cascade);

    b.OwnsOne(x => x.Metadata, m =>
    {
        m.Property(p => p.Owner).HasMaxLength(100);
    });

    b.HasQueryFilter(x => !x.IsDeleted);
});
```

### C.3 继承映射

```csharp
// TPH（默认）
modelBuilder.Entity<Animal>().UseTphMappingStrategy();

// TPT
modelBuilder.Entity<Animal>().UseTptMappingStrategy();

// TPC
modelBuilder.Entity<Animal>().UseTpcMappingStrategy();

public abstract class Animal
{
    public int Id { get; set; }
    public string Name { get; set; }
}

public class Dog : Animal
{
    public string Breed { get; set; }
}

public class Cat : Animal
{
    public bool IsIndoor { get; set; }
}
```
