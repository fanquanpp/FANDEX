---
order: 60
title: 'C#与EF Core'
module: csharp
category: 'C#'
difficulty: intermediate
description: 'Entity Framework Core ORM 框架：DbContext、实体映射、查询、迁移、并发控制、性能优化、架构模式与生产实践'
author: fanquanpp
updated: '2026-07-21'
related:
  - 'csharp/CSharp与Blazor'
  - 'csharp/CSharp与MAUI'
  - 'csharp/CSharp与依赖注入'
  - 'csharp/CSharp与最小API'
  - 'csharp/LINQ与函数式编程'
prerequisites:
  - csharp/概述与环境配置
  - csharp/面向对象编程
  - csharp/泛型与集合
  - csharp/异步编程
---

## 学习目标

完成本章学习后，读者应当能够达到以下认知层级（参照 Bloom 分类法）：

- **记忆（Remembering）**：复述 EF Core 的核心概念（DbContext、DbSet、实体、迁移、变更追踪），列举主要数据库提供程序（SQL Server、SQLite、PostgreSQL、MySQL、Cosmos DB）。
- **理解（Understanding）**：解释 EF Core 的工作机制（LINQ 表达式树翻译为 SQL、变更追踪器、导航属性修复、N+1 问题成因）；阐述 Code-First 与 Database-First 的差异；说明乐观并发与悲观并发的实现原理。
- **应用（Applying）**：使用 Fluent API 与数据注解配置实体映射；编写复杂的 LINQ 查询（Include、分组、连接、分页）；管理迁移生命周期；在 ASP.NET Core 中通过 DI 注册 DbContext。
- **分析（Analyzing）**：解构生成的 SQL 执行计划，识别性能瓶颈（N+1、笛卡尔积、缺少索引、过度加载）；对比不同加载策略（Eager、Explicit、Lazy）的适用场景与代价。
- **评价（Evaluating）**：评估 DbContext 生命周期选择（Scoped、Transient、Singleton）的合理性；评价仓储模式与直接使用 DbContext 的工程权衡；审计生产代码中的并发安全与事务边界。
- **创造（Creating）**：基于 DDD 战术模式设计聚合根与值对象的 EF Core 映射；构建多租户数据隔离架构；实现事件溯源与 CQRS 模式；为高并发场景设计乐观锁重试策略与最终一致性方案。

## 历史动机与背景

对象关系映射（Object-Relational Mapping, ORM）的诞生源于"对象模型"与"关系模型"之间的范式不匹配（Impedance Mismatch）。对象模型基于封装、继承、多态，支持任意对象图；关系模型基于 Codd 的关系代数，以表格、行、外键组织数据。两者差异主要体现在：

1. **继承**：对象有继承层次，关系模型无原生支持
2. **标识**：对象用引用标识，关系用主键标识
3. **关联**：对象用引用或集合，关系用外键
4. **数据类型**：对象有枚举、值对象、复杂类型，关系类型有限
5. **遍历**：对象图可双向遍历，关系通过 JOIN 单向查询

早期 .NET 数据访问依赖 ADO.NET（DataSet、DataReader、SqlCommand），开发者需手写大量样板代码进行对象与记录的转换。2008 年微软发布 Entity Framework（EF）1.0，试图通过 EDM（Entity Data Model）、EDMX 设计器、XML 映射解决 ORM 问题，但初版架构臃肿、性能低下、API 复杂，社区口碑不佳。

EF 4-6（2010-2013）逐步改进，引入 Code First（2011）、Fluent API、迁移、DbContext 简化 API，成为主流 ORM。但 EF6 基于 .NET Framework，无法跨平台，且内部架构为支持 EDMX 等遗留模式背负技术债务。

**EF Core 的诞生**：2014 年微软启动 EF7（后改名 EF Core）项目，从零重写 ORM 框架。设计目标：

- 跨平台（基于 .NET Core，支持 Linux、macOS、Docker）
- 模块化（数据库提供程序可插拔）
- 高性能（减少分配、优化查询翻译）
- 简洁 API（去掉 EDMX、DbContext only）
- 测试友好（内存数据库、SQLite 共享模式）

EF Core 1.0（2016）发布时功能不完整，但奠定了新架构。后续版本快速演进：

- **1.0（2016）**：基础 ORM、Code First、迁移
- **2.0（2017）**：表拆分、 Owned 实体、全局查询过滤器
- **2.1（2018）**：视图映射、延迟加载、F# 支持
- **3.0（2019）**：重大重构、去掉惰性求值的客户端求值、LINQ 翻译增强
- **3.1（2019）**：LTS 版本、Cosmos DB 提供
- **5.0（2020）**：多对多无需中间实体、TPT 继承映射、索引属性、保存变更事件
- **6.0（2021）**：LTS 版本、编译模型、TPC 继承映射、临时表、
- **7.0（2022）**：JSON 列映射、批量更新（ExecuteUpdate/ExecuteDelete）、自定义约定
- **8.0（2023）**：LTS 版本、复杂类型、原始 SQL 改进、原始集合类型、HierarchyId
- **9.0（2024）**：AOT 改进、增强的复杂类型、Azure Cosmos DB for NoSQL 改进

EF Core 的演进反映了软件工程实践的成熟：从"自动化一切"到"提供可控抽象"，从"对开发者友好"到"对生产可观测"，从"通用框架"到"模块化生态"。

## 形式化定义

### ORM 的形式化模型

ORM 可形式化为四元组 $\mathcal{M} = (\mathcal{E}, \mathcal{R}, \mathcal{F}, \mathcal{S})$，其中：

- $\mathcal{E}$ 是实体类型的集合（C# 类）
- $\mathcal{R}$ 是关系表的集合（数据库表）
- $\mathcal{F} : \mathcal{E} \to \mathcal{R}$ 是实体到表的映射函数
- $\mathcal{S} : \mathcal{Q}_{\text{LINQ}} \to \mathcal{Q}_{\text{SQL}}$ 是 LINQ 查询到 SQL 查询的翻译函数

**映射函数** $\mathcal{F}$ 由以下子映射组成：

$$
\mathcal{F} = \langle \mathcal{F}_{\text{type}}, \mathcal{F}_{\text{prop}}, \mathcal{F}_{\text{rel}}, \mathcal{F}_{\text{inh}} \rangle
$$

- $\mathcal{F}_{\text{type}} : \text{EntityType} \to \text{Table}$：实体类型映射到表
- $\mathcal{F}_{\text{prop}} : \text{Property} \to \text{Column}$：属性映射到列
- $\mathcal{F}_{\text{rel}} : \text{Relationship} \to \text{ForeignKey}$：关系映射到外键
- $\mathcal{F}_{\text{inh}} : \text{Hierarchy} \to \text{Strategy}$：继承层次映射到策略（TPH/TPT/TPC）

### LINQ 翻译的语义

EF Core 将 LINQ 查询表达式树翻译为 SQL，翻译过程保持语义等价：

$$
\forall q \in \mathcal{Q}_{\text{LINQ}}, \exists s \in \mathcal{Q}_{\text{SQL}} : \text{Eval}(q) \equiv \text{Eval}(\text{Execute}(s))
$$

翻译器基于访问者模式（Visitor Pattern）遍历表达式树，对每个节点应用规则：

- `Where` → `WHERE` 子句
- `Select` → `SELECT` 列表
- `OrderBy` → `ORDER BY` 子句
- `Join` → `INNER JOIN`
- `GroupBy` → `GROUP BY`
- `Include` → LEFT JOIN 或单独查询

**不可翻译表达式**：当遇到数据库不支持的运算（如自定义 C# 方法调用、复杂对象构造），EF Core 3.0+ 抛出异常而非回退到客户端求值（避免性能陷阱）。

### 变更追踪的状态机

DbContext 内部维护变更追踪器（Change Tracker），每个被追踪实体处于以下状态之一：

$$
\text{State} \in \{\text{Detached}, \text{Unchanged}, \text{Added}, \text{Modified}, \text{Deleted}\}
$$

状态转换由实体操作触发：

- `Add` → `Added`
- `Update` → `Modified`
- `Remove` → `Deleted`
- `Attach` → `Unchanged`
- `SaveChanges` → 根据 `Added/Modified/Deleted` 执行 INSERT/UPDATE/DELETE，最终转为 `Unchanged`

`SaveChanges` 在事务中原子地应用所有变更，复杂度 $O(n)$，其中 $n$ 为变更实体数。

### 乐观并发的数学模型

使用并发令牌（Concurrency Token）的乐观并发控制可形式化为：

设实体 $E$ 有版本字段 $v \in \mathbb{N}$，初始 $v_0$。事务 $T_i$ 读取 $E$ 时获取 $v_i$，写入时执行：

$$
\text{UPDATE } E \text{ SET } \ldots, v = v + 1 \text{ WHERE id } = \text{id} \text{ AND } v = v_i
$$

若返回影响行数为 0，则发生冲突，抛出 `DbUpdateConcurrencyException`。冲突概率：

$$
P_{\text{conflict}} = 1 - \prod_{i=1}^{k} (1 - \lambda_i \cdot \Delta t_i)
$$

其中 $\lambda_i$ 是事务 $i$ 的到达率，$\Delta t_i$ 是事务持续时间。短事务、低并发场景下冲突率极低，乐观并发是高性能选择。

## 理论推导

### 查询性能模型

EF Core 查询的端到端耗时由五部分组成：

$$
T_{\text{total}} = T_{\text{translate}} + T_{\text{network}} + T_{\text{db-exec}} + T_{\text{materialize}} + T_{\text{fixup}}
$$

- $T_{\text{translate}}$：LINQ 表达式树翻译为 SQL（首次翻译，后续缓存）
- $T_{\text{network}}$：往返数据库的网络延迟
- $T_{\text{db-exec}}$：数据库执行 SQL 的时间
- $T_{\text{materialize}}$：从 DataReader 构造实体对象
- $T_{\text{fixup}}$：导航属性修复（建立对象图关联）

**翻译缓存**：EF Core 缓存已翻译的查询，相同结构的 LINQ 查询只翻译一次，$T_{\text{translate}}$ 摊销后接近 0。

**N+1 查询问题**：加载 N 个实体的关联数据时，若使用延迟加载，会触发 N 次额外查询：

$$
T_{\text{N+1}} = T_1 + N \cdot T_{\text{related}}
$$

其中 $T_1$ 是主查询，$T_{\text{related}}$ 是单次关联查询。改用 `Include` 后：

$$
T_{\text{Include}} = T_1' \approx T_1 \cdot (1 + \alpha)
$$

$\alpha$ 是 JOIN 操作的额外开销（通常 < 0.5）。当 $N > 5$ 时，Include 远优于延迟加载。

### 内存占用模型

DbContext 的内存占用主要由变更追踪器持有：

$$
M_{\text{context}} = \sum_{i=1}^{n} \text{size}(E_i) \cdot (1 + \beta)
$$

其中 $n$ 是被追踪实体数，$\beta$ 是追踪开销系数（存储原始值、快照等，约 1-2）。查询 10,000 个实体时，内存占用可能是实体本身的 2-3 倍。

**优化策略**：使用 `AsNoTracking()` 查询只读数据，将 $\beta$ 降至 0；使用 `AsNoTrackingWithIdentityResolution()` 在需要引用一致性但不需要变更追踪时使用，$\beta \approx 0.1$。

### 事务隔离级别的影响

EF Core 默认使用数据库的隔离级别（SQL Server 默认 READ COMMITTED）。不同隔离级别对一致性与性能的权衡：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
| :--- | :--- | :--- | :--- | :--- |
| Read Uncommitted | 可能 | 可能 | 可能 | 最高 |
| Read Committed | 不可能 | 可能 | 可能 | 高 |
| Repeatable Read | 不可能 | 不可能 | 可能 | 中 |
| Serializable | 不可能 | 不可能 | 不可能 | 低 |
| Snapshot | 不可能 | 不可能 | 不可能 | 中（需版本存储） |

并发控制复杂度：

- **悲观锁**：`SELECT ... FOR UPDATE`，持锁期间阻塞其他事务，吞吐量随并发线性下降
- **乐观锁**：冲突检测在写入时，吞吐量在低冲突场景接近无锁

## 代码示例

### 示例 1：基础 CRUD 与 DbContext 配置

```csharp
using Microsoft.EntityFrameworkCore;

// 实体定义
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public int Age { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // 导航属性
    public List<Order> Orders { get; set; } = new();
}

public class Order
{
    public int Id { get; set; }
    public string ProductName { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime OrderDate { get; set; }

    // 外键
    public int UserId { get; set; }

    // 导航属性
    public User User { get; set; } = null!;
}

// DbContext：数据库会话
public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 配置 User 实体
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasIndex(u => u.Email).IsUnique();

            entity.HasMany(u => u.Orders)
                .WithOne(o => o.User)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 全局查询过滤器：软删除
            entity.HasQueryFilter(u => !EF.Property<bool>(u, "IsDeleted"));
        });

        // 配置 Order 实体
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasKey(o => o.Id);

            entity.Property(o => o.ProductName).IsRequired().HasMaxLength(200);
            entity.Property(o => o.Amount).HasPrecision(18, 2);

            entity.HasIndex(o => new { o.UserId, o.OrderDate });
        });
    }
}

// 基础 CRUD
public class UserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<int> CreateUserAsync(string name, string email, int age)
    {
        var user = new User { Name = name, Email = email, Age = age };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user.Id;
    }

    public async Task<User?> GetUserAsync(int id)
    {
        // FindAsync 利用一级缓存，比 FirstAsync 更高效
        return await _db.Users.FindAsync(id);
    }

    public async Task<List<User>> SearchUsersAsync(string? nameFilter, int? minAge)
    {
        var query = _db.Users.AsQueryable();

        if (nameFilter is not null)
            query = query.Where(u => u.Name.Contains(nameFilter));

        if (minAge is not null)
            query = query.Where(u => u.Age >= minAge);

        return await query
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    public async Task<bool> UpdateUserAsync(int id, string newName, int newAge)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;

        user.Name = newName;
        user.Age = newAge;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        // 使用 ExecuteDelete 避免 SELECT + DELETE 两次往返
        var affected = await _db.Users
            .Where(u => u.Id == id)
            .ExecuteDeleteAsync();
        return affected > 0;
    }
}
```

### 示例 2：复杂查询与加载策略

```csharp
public class OrderQueryService
{
    private readonly AppDbContext _db;

    public OrderQueryService(AppDbContext db) => _db = db;

    // Eager Loading：预加载关联数据
    public async Task<List<User>> GetUsersWithOrdersAsync()
    {
        return await _db.Users
            .Include(u => u.Orders)               // 加载所有订单
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    // 多级 Include
    public async Task<List<User>> GetUsersWithFullDetailsAsync()
    {
        return await _db.Users
            .Include(u => u.Orders.Where(o => o.Amount > 100))
                .ThenInclude(o => o.User)          // 反向引用（通常不需要）
            .AsSplitQuery()                         // 拆分查询，避免笛卡尔积
            .ToListAsync();
    }

    // 投影查询：只取需要的字段，避免过度加载
    public async Task<List<UserSummary>> GetUserSummariesAsync()
    {
        return await _db.Users
            .Select(u => new UserSummary
            {
                UserId = u.Id,
                Name = u.Name,
                OrderCount = u.Orders.Count,
                TotalAmount = u.Orders.Sum(o => o.Amount)
            })
            .OrderByDescending(s => s.TotalAmount)
            .ToListAsync();
    }

    // 分页查询
    public async Task<PagedResult<User>> GetPagedUsersAsync(int page, int pageSize)
    {
        var query = _db.Users.OrderBy(u => u.Id);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<User>(items, total, page, pageSize);
    }

    // 分组聚合
    public async Task<List<UserOrderStat>> GetOrderStatsByUserAsync()
    {
        return await _db.Users
            .GroupBy(u => new { u.Id, u.Name })
            .Select(g => new UserOrderStat
            {
                UserId = g.Key.Id,
                UserName = g.Key.Name,
                OrderCount = g.SelectMany(u => u.Orders).Count(),
                TotalAmount = g.SelectMany(u => u.Orders).Sum(o => o.Amount),
                AvgAmount = g.SelectMany(u => u.Orders).Average(o => o.Amount)
            })
            .ToListAsync();
    }

    // 原始 SQL 查询（带参数化）
    public async Task<List<User>> GetRecentActiveUsersAsync(DateTime since)
    {
        return await _db.Users
            .FromSqlInterpolated($@"
                SELECT u.* FROM Users u
                WHERE u.Id IN (
                    SELECT DISTINCT o.UserId FROM Orders o
                    WHERE o.OrderDate >= {since}
                )")
            .ToListAsync();
    }

    // Explicit Loading：按需加载
    public async Task LoadUserOrdersExplicitlyAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return;

        await _db.Entry(user)
            .Collection(u => u.Orders)
            .LoadAsync();
    }

    // 条件加载
    public async Task LoadHighValueOrdersAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return;

        await _db.Entry(user)
            .Collection(u => u.Orders)
            .Query()
            .Where(o => o.Amount > 1000)
            .LoadAsync();
    }
}

public record UserSummary(int UserId, string Name, int OrderCount, decimal TotalAmount);
public record UserOrderStat(int UserId, string UserName, int OrderCount, decimal TotalAmount, decimal AvgAmount);
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);
```

### 示例 3：实体配置与关系映射

```csharp
// 复杂实体模型
public class Blog
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime PublishedAt { get; set; }
    public BlogStatus Status { get; set; }

    // 一对多
    public List<Post> Posts { get; set; } = new();

    // 多对一
    public int AuthorId { get; set; }
    public Author Author { get; set; } = null!;

    // Owned 类型（值对象）
    public BlogMetadata Metadata { get; set; } = new();
}

public class Post
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public int BlogId { get; set; }
    public Blog Blog { get; set; } = null!;

    // 多对多
    public List<Tag> Tags { get; set; } = new();
}

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<Post> Posts { get; set; } = new();
}

public class Author
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public List<Blog> Blogs { get; set; } = new();
}

// Owned 类型：与所有者同表存储
public class BlogMetadata
{
    public int Views { get; set; }
    public int Likes { get; set; }
    public string? FeaturedImage { get; set; }
}

public enum BlogStatus { Draft, Published, Archived }

public class BlogDbContext : DbContext
{
    public DbSet<Blog> Blogs => Set<Blog>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Author> Authors => Set<Author>();

    public BlogDbContext(DbContextOptions<BlogDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Blog 配置
        modelBuilder.Entity<Blog>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.Content).IsRequired();

            b.HasOne(x => x.Author)
                .WithMany(a => a.Blogs)
                .HasForeignKey(x => x.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasMany(x => x.Posts)
                .WithOne(p => p.Blog)
                .HasForeignKey(p => p.BlogId)
                .OnDelete(DeleteBehavior.Cascade);

            // Owned 类型配置
            b.OwnsOne(x => x.Metadata, m =>
            {
                m.Property(p => p.Views).HasDefaultValue(0);
                m.Property(p => p.Likes).HasDefaultValue(0);
                m.Property(p => p.FeaturedImage).HasMaxLength(500);
            });

            // 枚举转换为字符串
            b.Property(x => x.Status).HasConversion<string>();

            b.HasIndex(x => x.Status);
            b.HasIndex(x => new { x.Status, x.PublishedAt });
        });

        // Post 配置
        modelBuilder.Entity<Post>(p =>
        {
            p.HasKey(x => x.Id);
            p.Property(x => x.Title).IsRequired().HasMaxLength(300);
            p.Property(x => x.Body).IsRequired();

            // 多对多：EF Core 5.0+ 自动创建中间表
            p.HasMany(x => x.Tags)
                .WithMany(t => t.Posts)
                .UsingEntity(j =>
                {
                    j.ToTable("PostTags");
                    j.HasOne(typeof(Post)).WithMany().HasForeignKey("PostId");
                    j.HasOne(typeof(Tag)).WithMany().HasForeignKey("TagId");
                    j.Property<DateTime>("CreatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
                });
        });

        // Tag 配置
        modelBuilder.Entity<Tag>(t =>
        {
            t.HasKey(x => x.Id);
            t.Property(x => x.Name).IsRequired().HasMaxLength(50);
            t.HasIndex(x => x.Name).IsUnique();
        });

        // Author 配置
        modelBuilder.Entity<Author>(a =>
        {
            a.HasKey(x => x.Id);
            a.Property(x => x.Name).IsRequired().HasMaxLength(100);
            a.Property(x => x.Email).IsRequired().HasMaxLength(200);
            a.HasIndex(x => x.Email).IsUnique();
        });
    }
}
```

### 示例 4：继承映射策略

```csharp
// 继承层次
public abstract class Payment
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Currency { get; set; } = "CNY";
}

public class CreditCardPayment : Payment
{
    public string CardNumber { get; set; } = "";
    public string CardHolder { get; set; } = "";
    public DateTime ExpiryDate { get; set; }
    public string? TransactionId { get; set; }
}

public class PayPalPayment : Payment
{
    public string PayPalAccount { get; set; } = "";
    public string? PayerId { get; set; }
}

public class BankTransferPayment : Payment
{
    public string BankAccount { get; set; } = "";
    public string BankCode { get; set; } = "";
    public string? ReferenceNumber { get; set; }
}

public class PaymentDbContext : DbContext
{
    public DbSet<Payment> Payments => Set<Payment>();

    public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 策略 1：TPH (Table-Per-Hierarchy) - 默认，所有子类存一表
        // 使用 Discriminator 列区分子类型
        modelBuilder.Entity<Payment>(p =>
        {
            p.ToTable("Payments");
            p.HasDiscriminator<string>("PaymentType")
                .HasValue<CreditCardPayment>("CreditCard")
                .HasValue<PayPalPayment>("PayPal")
                .HasValue<BankTransferPayment>("BankTransfer");

            p.Property<decimal>("Amount").HasPrecision(18, 2);
        });

        // 策略 2：TPT (Table-Per-Type) - 每个类型一表，JOIN 查询
        // modelBuilder.Entity<Payment>().ToTable("Payments");
        // modelBuilder.Entity<CreditCardPayment>().ToTable("CreditCardPayments");
        // modelBuilder.Entity<PayPalPayment>().ToTable("PayPalPayments");
        // modelBuilder.Entity<BankTransferPayment>().ToTable("BankTransferPayments");

        // 策略 3：TPC (Table-Per-Concrete-Type) - 每个具体类型一表，无 JOIN
        // EF Core 7+ 支持
        // modelBuilder.Entity<Payment>().UseTpcMappingStrategy();
    }
}

// 多态查询：返回所有支付
public async Task<List<Payment>> GetAllPaymentsAsync(PaymentDbContext db)
{
    return await db.Payments.OrderByDescending(p => p.CreatedAt).ToListAsync();
}

// 类型过滤查询
public async Task<List<CreditCardPayment>> GetCreditCardPaymentsAsync(PaymentDbContext db)
{
    return await db.Payments.OfType<CreditCardPayment>().ToListAsync();
}
```

### 示例 5：迁移管理

```csharp
// 迁移是 C# 代码，可手动修改
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(maxLength: 100, nullable: false),
                Email = table.Column<string>(maxLength: 200, nullable: false),
                Age = table.Column<int>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false),
                UpdatedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Orders",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                ProductName = table.Column<string>(maxLength: 200, nullable: false),
                Amount = table.Column<decimal>(type: "DECIMAL(18,2)", nullable: false),
                OrderDate = table.Column<DateTime>(nullable: false),
                UserId = table.Column<int>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Orders", x => x.Id);
                table.ForeignKey(
                    name: "FK_Orders_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Users_Email",
            table: "Users",
            column: "Email",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Orders_UserId_OrderDate",
            table: "Orders",
            columns: new[] { "UserId", "OrderDate" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Orders");
        migrationBuilder.DropTable(name: "Users");
    }
}

// 数据迁移：在 schema 变更时填充数据
public partial class AddIsDeletedColumn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsDeleted",
            table: "Users",
            nullable: false,
            defaultValue: false);

        // 为现有数据填充默认值
        migrationBuilder.Sql("UPDATE Users SET IsDeleted = 0");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "IsDeleted", table: "Users");
    }
}

// 自定义迁移操作：创建索引（CONCURRENTLY 避免锁表）
public partial class AddEmailIndexConcurrently : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // PostgreSQL 特有：并发创建索引不阻塞写入
        migrationBuilder.Sql("CREATE INDEX CONCURRENTLY IX_Users_Email ON Users (Email)");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP INDEX CONCURRENTLY IX_Users_Email");
    }
}
```

### 示例 6：并发控制与冲突处理

```csharp
// 乐观并发：使用 RowVersion
public class Document
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime UpdatedAt { get; set; }

    // 并发令牌：每次 UPDATE 自动 +1
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}

// 仓储：处理并发冲突
public class DocumentRepository
{
    private readonly AppDbContext _db;

    public DocumentRepository(AppDbContext db) => _db = db;

    public async Task<bool> UpdateWithRetryAsync(int id, string newContent, int maxRetries = 3)
    {
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                var doc = await _db.Documents.FindAsync(id);
                if (doc is null) return false;

                doc.Content = newContent;
                doc.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                // 并发冲突：从异常中获取数据库中的当前值
                var entry = ex.Entries.Single();
                var dbValues = await entry.GetDatabaseValuesAsync();

                if (dbValues is null)
                {
                    // 记录已被删除
                    return false;
                }

                // 刷新原始值，重试
                entry.OriginalValues.SetValues(dbValues);
            }
        }
        return false; // 重试次数用尽
    }

    // 自定义合并策略
    public async Task<UpdateResult> UpdateWithMergeAsync(int id, string newContent, string editorName)
    {
        try
        {
            var doc = await _db.Documents.FindAsync(id);
            if (doc is null) return UpdateResult.NotFound;

            doc.Content = newContent;
            doc.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return UpdateResult.Success;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            var entry = ex.Entries.Single();
            var dbValues = await entry.GetDatabaseValuesAsync();
            if (dbValues is null) return UpdateResult.NotFound;

            var currentDbContent = (string)dbValues["Content"];
            var proposedContent = (string)entry.CurrentValues["Content"];

            // 三方合并：基于原始版本与两个修改版本
            var originalContent = (string)entry.OriginalValues["Content"];
            var merged = MergeContent(originalContent, currentDbContent, proposedContent);

            entry.CurrentValues["Content"] = merged;
            entry.OriginalValues.SetValues(dbValues);

            await _db.SaveChangesAsync();
            return UpdateResult.Merged;
        }
    }

    private string MergeContent(string original, string current, string proposed)
    {
        // 简化的合并逻辑：实际应使用 diff 算法
        if (current == proposed) return current;
        return $"{current}\n--- 由 {DateTime.UtcNow} 合并 ---\n{proposed}";
    }
}

public enum UpdateResult { Success, NotFound, Merged, Conflict }

// 悲观并发：显式事务与锁
public async Task UpdateWithPessimisticLockAsync(int id, string newContent)
{
    using var transaction = await _db.Database.BeginTransactionAsync();

    try
    {
        // SQL Server: UPDLOCK 锁定行直到事务结束
        var doc = await _db.Documents
            .FromSqlRaw("SELECT * FROM Documents WITH (UPDLOCK) WHERE Id = {0}", id)
            .SingleAsync();

        doc.Content = newContent;
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### 示例 7：性能优化技巧

```csharp
public class OptimizedQueryService
{
    private readonly AppDbContext _db;

    public OptimizedQueryService(AppDbContext db) => _db = db;

    // 1. AsNoTracking：只读查询跳过变更追踪
    public async Task<List<User>> GetUsersReadOnlyAsync()
    {
        return await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    // 2. AsNoTrackingWithIdentityResolution：需要引用一致但不变更
    public async Task<List<User>> GetUsersWithIdentityAsync()
    {
        return await _db.Users
            .Include(u => u.Orders)
            .AsNoTrackingWithIdentityResolution()
            .ToListAsync();
    }

    // 3. 投影查询：只取必要字段
    public async Task<List<UserEmail>> GetUserEmailsAsync()
    {
        return await _db.Users
            .Select(u => new UserEmail(u.Id, u.Email))
            .ToListAsync();
    }

    // 4. 批量操作：ExecuteUpdate / ExecuteDelete（EF Core 7+）
    public async Task<int> BulkUpdateUserAgeAsync(int minAge, int newAge)
    {
        return await _db.Users
            .Where(u => u.Age >= minAge)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Age, newAge)
                .SetProperty(u => u.UpdatedAt, DateTime.UtcNow));
    }

    public async Task<int> BulkDeleteInactiveUsersAsync(DateTime cutoff)
    {
        return await _db.Users
            .Where(u => u.CreatedAt < cutoff && !u.Orders.Any())
            .ExecuteDeleteAsync();
    }

    // 5. 编译查询：缓存翻译结果，减少首次翻译开销
    private static readonly Func<AppDbContext, int, Task<User?>> _getUserById =
        EF.CompileAsyncQuery((AppDbContext db, int id) =>
            db.Users.FirstOrDefault(u => u.Id == id));

    public Task<User?> GetUserByIdCompiledAsync(int id) => _getUserById(_db, id);

    // 6. 拆分查询：避免笛卡尔积
    public async Task<List<User>> GetUsersWithOrdersSplitAsync()
    {
        return await _db.Users
            .Include(u => u.Orders)
            .AsSplitQuery()
            .ToListAsync();
    }

    // 7. 分批处理：避免内存爆炸
    public async Task ProcessAllUsersInBatchesAsync(int batchSize, Func<User, Task> processor)
    {
        await foreach (var batch in _db.Users
            .OrderBy(u => u.Id)
            .AsNoTracking()
            .AsAsyncEnumerable()
            .Chunk(batchSize)
            .Select(chunk => chunk.ToListAsync()))
        {
            foreach (var user in batch)
            {
                await processor(user);
            }
        }
    }

    // 8. 上下文池化：减少 DbContext 创建开销
    // 注册：services.AddDbContextPool<AppDbContext>(opt => opt.UseSqlite(...));
    // 池化的 DbContext 在释放时重置状态，避免重复分配

    // 9. 临时表与 CTE
    public async Task<List<OrderStats>> GetStatsWithCTEAsync(DateTime startDate)
    {
        var query = $@"
            WITH RecentOrders AS (
                SELECT UserId, COUNT(*) AS OrderCount, SUM(Amount) AS Total
                FROM Orders
                WHERE OrderDate >= {{0}}
                GROUP BY UserId
            )
            SELECT u.Id AS UserId, u.Name, ro.OrderCount, ro.Total
            FROM Users u
            INNER JOIN RecentOrders ro ON u.Id = ro.UserId
            WHERE ro.OrderCount > 0";

        return await _db.Database.SqlQueryRaw<OrderStats>(query, startDate).ToListAsync();
    }
}

public record UserEmail(int Id, string Email);
public record OrderStats(int UserId, string Name, int OrderCount, decimal Total);
```

### 示例 8：事务与多上下文协作

```csharp
public class OrderService
{
    private readonly AppDbContext _db;
    private readonly ILogger<OrderService> _logger;

    public OrderService(AppDbContext db, ILogger<OrderService> logger)
    {
        _db = db; _logger = logger;
    }

    // 单上下文事务：SaveChanges 已是事务
    public async Task<int> PlaceOrderAsync(int userId, List<OrderItem> items)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var user = await _db.Users.FindAsync(userId)
                ?? throw new InvalidOperationException("用户不存在");

            foreach (var item in items)
            {
                var order = new Order
                {
                    UserId = userId,
                    ProductName = item.ProductName,
                    Amount = item.Amount,
                    OrderDate = DateTime.UtcNow
                };
                _db.Orders.Add(order);
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return items.Count;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "下单失败");
            throw;
        }
    }

    // 跨上下文事务：使用 TransactionScope 或共享 DbConnection
    public async Task TransferDataAsync(InventoryDbContext inventoryDb, AppDbContext appDb)
    {
        using var transaction = new TransactionScope(
            TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = System.Transactions.IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled);

        try
        {
            // 操作两个数据库
            var inventory = await inventoryDb.Items.FirstAsync();
            inventory.Quantity -= 1;
            await inventoryDb.SaveChangesAsync();

            var order = new Order { ProductName = inventory.Name, Amount = inventory.Price };
            appDb.Orders.Add(order);
            await appDb.SaveChangesAsync();

            transaction.Complete();
        }
        catch
        {
            // 自动回滚
            throw;
        }
    }

    // 幂等操作：基于唯一约束防止重复
    public async Task<bool> IdempotentPlaceOrderAsync(string requestId, int userId, List<OrderItem> items)
    {
        // 检查是否已处理
        var existing = await _db.Set<ProcessedRequest>()
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (existing is not null)
            return false; // 已处理

        _db.Set<ProcessedRequest>().Add(new ProcessedRequest
        {
            RequestId = requestId,
            ProcessedAt = DateTime.UtcNow
        });

        // 真实业务逻辑...
        return true;
    }
}

public class ProcessedRequest
{
    public int Id { get; set; }
    public string RequestId { get; set; } = "";
    public DateTime ProcessedAt { get; set; }
}

public record OrderItem(string ProductName, decimal Amount);
```

### 示例 9：DDD 聚合根映射

```csharp
// 领域模型：不依赖 EF Core
public sealed class OrderAggregate
{
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    private readonly List<OrderLine> _lines = new();
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();
    public OrderStatus Status { get; private set; }
    public Money TotalAmount => Money.Sum(_lines.Select(l => l.Subtotal));
    public TrackingNumber? Tracking { get; private set; }

    private OrderAggregate(OrderId id, CustomerId customerId, OrderStatus status)
    {
        Id = id; CustomerId = customerId; Status = status;
    }

    public static OrderAggregate Place(CustomerId customerId, IEnumerable<OrderLine> lines)
    {
        var lineList = lines.ToList();
        if (lineList.Count == 0)
            throw new DomainException("订单至少包含一行");

        var order = new OrderAggregate(OrderId.New(), customerId, OrderStatus.Pending);
        order._lines.AddRange(lineList);
        return order;
    }

    public void Pay()
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("仅待支付订单可支付");
        Status = OrderStatus.Paid;
    }

    public void Ship(TrackingNumber tracking)
    {
        if (Status != OrderStatus.Paid)
            throw new DomainException("仅已支付订单可发货");
        Tracking = tracking;
        Status = OrderStatus.Shipped;
    }
}

// 值对象
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
}

public readonly record struct CustomerId(Guid Value);
public readonly record struct TrackingNumber(string Value)
{
    public TrackingNumber
    {
        if (string.IsNullOrWhiteSpace(Value))
            throw new ArgumentException("追踪号不能为空");
    }
}

public sealed class OrderLine
{
    public OrderLineId Id { get; } = OrderLineId.New();
    public string ProductName { get; } = "";
    public int Quantity { get; }
    public Money UnitPrice { get; }
    public Money Subtotal => new(Quantity * UnitPrice.Amount, UnitPrice.Currency);

    public OrderLine(string productName, int quantity, Money unitPrice)
    {
        if (quantity <= 0) throw new ArgumentException("数量必须为正");
        ProductName = productName;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }
}

public readonly record struct OrderLineId(Guid Value)
{
    public static OrderLineId New() => new(Guid.NewGuid());
}

public sealed record Money(decimal Amount, string Currency)
{
    public static Money Sum(IEnumerable<Money> source)
    {
        var list = source.ToList();
        if (list.Count == 0) return new Money(0, "CNY");
        var currency = list.First().Currency;
        if (list.Any(m => m.Currency != currency))
            throw new InvalidOperationException("货币不一致");
        return new Money(list.Sum(m => m.Amount), currency);
    }
}

public enum OrderStatus { Pending, Paid, Shipped, Delivered, Cancelled }
public class DomainException : Exception { public DomainException(string msg) : base(msg) { } }

// EF Core 映射配置
public class OrderAggregateConfiguration : IEntityTypeConfiguration<OrderAggregate>
{
    public void Configure(EntityTypeBuilder<OrderAggregate> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(o => o.Id);

        // 强类型 ID 转换
        builder.Property(o => o.Id)
            .HasConversion(id => id.Value, v => new OrderId(v));

        builder.Property(o => o.CustomerId)
            .HasConversion(id => id.Value, v => new CustomerId(v));

        builder.Property(o => o.Status).HasConversion<string>();

        // 值对象映射
        builder.Property(o => o.Tracking)
            .HasConversion(
                t => t != null ? t.Value : null,
                v => v != null ? new TrackingNumber(v) : null);

        // 私有集合映射
        builder.Metadata.FindNavigation(nameof(OrderAggregate.Lines))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.OwnsMany(o => o.Lines, lb =>
        {
            lb.ToTable("OrderLines");
            lb.WithOwner().HasForeignKey("OrderId");
            lb.HasKey(l => l.Id);
            lb.Property(l => l.Id)
                .HasConversion(id => id.Value, v => new OrderLineId(v));
            lb.Property(l => l.ProductName).IsRequired().HasMaxLength(200);
            lb.OwnsOne(l => l.UnitPrice, up =>
            {
                up.Property(p => p.Amount).HasColumnName("UnitPriceAmount");
                up.Property(p => p.Currency).HasColumnName("UnitPriceCurrency").HasMaxLength(3);
            });
            lb.Ignore(l => l.Subtotal); // 计算属性不映射
        });

        builder.Ignore(o => o.TotalAmount); // 计算属性不映射
    }
}
```

### 示例 10：多租户与软删除

```csharp
// 多租户：通过全局查询过滤器实现
public interface ITenantEntity
{
    int TenantId { get; set; }
}

public class TenantDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;

    public TenantDbContext(DbContextOptions<TenantDbContext> options, ITenantProvider tenantProvider)
        : base(options) => _tenantProvider = tenantProvider;

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 为所有实现 ITenantEntity 的实体添加租户过滤器
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();

                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(e => EF.Property<int>(e, "TenantId") == tenantId);
            }
        }
    }

    public override int SaveChanges()
    {
        // 自动设置租户 ID
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.TenantId = _tenantProvider.GetCurrentTenantId();
        }
        return base.SaveChanges();
    }
}

public interface ITenantProvider
{
    int GetCurrentTenantId();
}

public class Product : ITenantEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int TenantId { get; set; }

    // 软删除字段
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}

// 软删除：通过全局过滤器与扩展方法
public static class SoftDeleteExtensions
{
    public static IQueryable<T> WhereNotDeleted<T>(this IQueryable<T> query) where T : class
    {
        return query.Where(e => !EF.Property<bool>(e, "IsDeleted"));
    }
}

// 在 DbContext 中应用软删除过滤器
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        // 查找 IsDeleted 属性
        var isDeletedProp = entityType.FindProperty("IsDeleted");
        if (isDeletedProp is not null && isDeletedProp.ClrType == typeof(bool))
        {
            modelBuilder.Entity(entityType.ClrType)
                .HasQueryFilter(e => !EF.Property<bool>(e, "IsDeleted"));
        }
    }
}

// 软删除操作（不实际从数据库移除）
public async Task SoftDeleteAsync<T>(int id) where T : class
{
    var entity = await _db.Set<T>().FindAsync(id);
    if (entity is null) return;

    // 设置软删除标记
    _db.Entry(entity).Property("IsDeleted").CurrentValue = true;
    _db.Entry(entity).Property("DeletedAt").CurrentValue = DateTime.UtcNow;

    await _db.SaveChangesAsync();
}

// 跨租户查询：绕过全局过滤器
public async Task<List<Product>> GetAllProductsAcrossTenantsAsync()
{
    return await _db.Products
        .IgnoreQueryFilters()
        .ToListAsync();
}
```

## 对比分析

### EF Core vs Dapper vs 原生 ADO.NET

| 维度 | EF Core | Dapper | 原生 ADO.NET |
| :--- | :--- | :--- | :--- |
| **抽象层级** | 高（对象与 SQL 完全分离） | 中（轻量对象映射） | 低（手动处理 DataReader） |
| **学习曲线** | 中等（需理解变更追踪、迁移等） | 低（SQL + 扩展方法） | 低（基础 API） |
| **开发效率** | 高（CRUD 几乎零代码） | 中（需写 SQL） | 低（最多样板代码） |
| **查询性能** | 中等（翻译开销、变更追踪） | 高（接近原生） | 最高 |
| **写入性能** | 中等（变更追踪开销） | 高（直接执行 SQL） | 最高 |
| **SQL 控制力** | 低（自动生成，可被覆盖） | 高（手写 SQL） | 完全控制 |
| **迁移管理** | 内置（强大） | 无（需第三方工具） | 无 |
| **领域模型支持** | 强（继承、值对象、导航属性） | 弱（仅平面映射） | 无 |
| **适合场景** | 中等复杂度业务、领域驱动 | 复杂查询、性能敏感场景 | 极致性能、特殊 SQL |

**决策建议**：

- 启动期 / MVP：EF Core 加速开发
- 业务核心：EF Core + 仓储模式封装，复杂查询用 Dapper
- 报表 / 大数据量：Dapper 或原生 ADO.NET
- 微服务：每个服务根据复杂度独立选择

### 加载策略对比

| 策略 | 实现方式 | SQL 次数 | 适用场景 | 风险 |
| :--- | :--- | :--- | :--- | :--- |
| **Eager Loading** | `Include` + `ThenInclude` | 1-2（JOIN 或拆分） | 已知需要关联数据 | 笛卡尔积爆炸 |
| **Explicit Loading** | `Entry().Collection().LoadAsync()` | N+1（按需触发） | 条件性加载 | 循环中触发 N+1 |
| **Lazy Loading** | 导航属性访问时自动查询 | N+1（隐式触发） | 关联数据偶尔访问 | 隐藏性能陷阱 |
| **Projection** | `Select` 投影到 DTO | 1 | 只读、特定字段 | 需手写 DTO |

**经验法则**：

- 优先使用投影查询，只取所需字段
- 列表页用 `Include`，详情页用 `Include` + `ThenInclude`
- 避免启用延迟加载（特别是循环中）
- 使用 `AsSplitQuery` 避免 JOIN 笛卡尔积

### 继承映射策略对比

| 策略 | 表数量 | 查询 SQL | 写入 SQL | 存储冗余 | 索引效率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TPH** | 1 | 简单（无 JOIN） | 1 INSERT | 高（NULL 列多） | 中（共享索引） |
| **TPT** | N（每个类型一表） | 复杂（多 JOIN） | N INSERT | 低 | 高（每表独立索引） |
| **TPC** | N（具体类型一表） | UNION ALL | 1 INSERT | 中（共享列重复） | 高 |

**选择**：

- 子类字段差异小、查询为主：TPH（默认）
- 子类字段差异大、需独立索引：TPT
- 子类互不相交、查询按类型：TPC（EF Core 7+）

### DbContext 生命周期选择

| 生命周期 | 注册方式 | 适用场景 | 风险 |
| :--- | :--- | :--- | :--- |
| **Scoped** | `AddDbContext` | Web 应用每请求一上下文 | 默认推荐 |
| **Transient** | `AddDbContext<T>(transient: true)` | 后台任务、长生命周期服务 | 频繁创建开销 |
| **Singleton** | 不推荐 | 全局共享状态 | 并发冲突、内存泄漏 |
| **Pooled** | `AddDbContextPool` | 高吞吐 Web API | 重置开销 vs 创建开销 |

**经验**：Web 应用用 Scoped + 池化；后台服务用 Transient 或工厂模式（`AddDbContextFactory`）；避免 Singleton。

## 常见陷阱与反模式

### 陷阱 1：N+1 查询问题

```csharp
// 反例：循环中访问导航属性触发 N+1
var users = await _db.Users.ToListAsync();  // 1 次查询
foreach (var user in users)
{
    Console.WriteLine($"{user.Name}: {user.Orders.Count} 个订单");
    // user.Orders.Count 触发 1 次查询，N 个用户共 N 次
}

// 正解 1：Include 预加载
var users = await _db.Users.Include(u => u.Orders).ToListAsync();  // 1-2 次查询

// 正解 2：投影查询
var stats = await _db.Users
    .Select(u => new { u.Name, OrderCount = u.Orders.Count })
    .ToListAsync();  // 1 次查询

// 检测方法：开启 EF Core 日志，观察 SQL 数量
optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information);
```

### 陷阱 2：笛卡尔积爆炸

```csharp
// 反例：多级 Include 导致笛卡尔积
var blogs = await _db.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Author)
    .ToListAsync();
// 若 Blog 有 10 篇 Post + 1 个 Author，则返回 10 行（重复 Blog 数据）

// 更严重：多集合 Include
var data = await _db.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Tags)
    .ToListAsync();
// Posts * Tags 行数爆炸

// 正解 1：拆分查询
var data = await _db.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Tags)
    .AsSplitQuery()
    .ToListAsync();

// 正解 2：分批加载
var blogs = await _db.Blogs.ToListAsync();
foreach (var blog in blogs)
{
    await _db.Entry(blog).Collection(b => b.Posts).LoadAsync();
}
```

### 陷阱 3：变更追踪导致内存泄漏

```csharp
// 反例：在长生命周期服务中查询大量数据
public class LongRunningService
{
    private readonly AppDbContext _db;

    public async Task ProcessMillionRecordsAsync()
    {
        var users = await _db.Users.ToListAsync(); // 100 万用户加载到内存
        // ChangeTracker 持有所有实体的引用，无法释放
        foreach (var user in users) { /* 处理 */ }
    }
}

// 正解 1：AsNoTracking
var users = await _db.Users.AsNoTracking().ToListAsync();

// 正解 2：分批处理
await foreach (var batch in _db.Users.AsNoTracking().AsAsyncEnumerable().Chunk(1000))
{
    foreach (var user in batch) { /* 处理 */ }
    _db.ChangeTracker.Clear();
}

// 正解 3：使用 DbContext 池化
```

### 陷阱 4：客户端求值导致性能问题

```csharp
// 反例：无法翻译的方法导致客户端求值（EF Core 3.0+ 抛异常）
var users = await _db.Users
    .Where(u => CustomValidation(u.Name))  // 自定义方法无法翻译
    .ToListAsync();

// EF Core 3.0+ 会抛异常，避免性能陷阱
// 旧版本会在客户端求值，将全表加载到内存

// 正解 1：使用可翻译的表达式
var users = await _db.Users
    .Where(u => u.Name.StartsWith("张") && u.Name.Length > 2)
    .ToListAsync();

// 正解 2：先查询，再在内存过滤
var allUsers = await _db.Users.AsNoTracking().ToListAsync();
var filtered = allUsers.Where(u => CustomValidation(u.Name));
```

### 陷阱 5：事务边界不清

```csharp
// 反例：多个 SaveChanges 不在同一事务
public async Task<bool> TransferAsync(int from, int to, decimal amount)
{
    var fromAccount = await _db.Accounts.FindAsync(from);
    var toAccount = await _db.Accounts.FindAsync(to);

    fromAccount.Balance -= amount;
    await _db.SaveChangesAsync();  // 提交

    toAccount.Balance += amount;
    await _db.SaveChangesAsync();  // 若此处失败，from 已扣款但 to 未到账

    return true;
}

// 正解：显式事务
public async Task<bool> TransferAsync(int from, int to, decimal amount)
{
    using var transaction = await _db.Database.BeginTransactionAsync();
    try
    {
        var fromAccount = await _db.Accounts.FindAsync(from);
        var toAccount = await _db.Accounts.FindAsync(to);

        fromAccount.Balance -= amount;
        toAccount.Balance += amount;

        await _db.SaveChangesAsync();  // 单次 SaveChanges 即可
        await transaction.CommitAsync();
        return true;
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### 陷阱 6：迁移在生产环境误操作

```csharp
// 反例：在生产环境直接调用 EnsureCreated 或 Migrate
public void Configure(IApplicationBuilder app)
{
    using var scope = app.ApplicationServices.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();  // 启动时自动迁移，危险！
}

// 问题：
// 1. 多实例同时启动可能并发迁移
// 2. 长时间迁移阻塞应用启动
// 3. 迁移失败导致应用无法启动
// 4. 无法审查迁移内容

// 正解：在部署流程中执行迁移
// 1. CI/CD 中生成迁移 SQL 脚本
// dotnet ef migrations script -o migrate.sql
// 2. DBA 审查后执行
// 3. 应用启动时不执行迁移
```

### 陷阱 7：导航属性循环引用

```csharp
// 反例：双向导航 + 序列化导致循环
public class User
{
    public int Id { get; set; }
    public List<Order> Orders { get; set; } = new();
}

public class Order
{
    public int Id { get; set; }
    public User User { get; set; } = null!;  // 反向引用
}

// 序列化 user 时会递归到 orders，再递归到 user，无限循环
var json = JsonSerializer.Serialize(user);  // StackOverflow 或超长 JSON

// 正解 1：DTO 投影，避免直接序列化实体
var dto = await _db.Users
    .Select(u => new UserDto
    {
        Id = u.Id,
        OrderIds = u.Orders.Select(o => o.Id).ToList()
    })
    .ToListAsync();

// 正解 2：JsonIgnore 跳过反向引用
public class Order
{
    public int Id { get; set; }
    [JsonIgnore]
    public User User { get; set; } = null!;
}
```

### 陷阱 8：异步上下文丢失

```csharp
// 反例：在异步方法中混用同步调用
public async Task<List<User>> GetUsersAsync()
{
    // 阻塞调用：可能导致线程池饥饿
    var users = _db.Users.ToList();  // 同步版本
    return users;
}

// 反例：使用 .Result 或 .Wait()
public List<User> GetUsers()
{
    return _db.Users.ToListAsync().Result;  // 死锁风险
}

// 正解：全异步
public async Task<List<User>> GetUsersAsync()
{
    return await _db.Users.ToListAsync();
}
```

## 工程实践

### 实践 1：仓储模式与工作单元

```csharp
// 仓储接口：领域层定义
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id);
    Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<List<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
}

// 仓储实现：基础设施层
public class EfRepository<T> : IRepository<T> where T : class
{
    private readonly AppDbContext _context;
    private readonly DbSet<T> _set;

    public EfRepository(AppDbContext context)
    {
        _context = context;
        _set = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(object id) => await _set.FindAsync(id);

    public async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate) =>
        await _set.Where(predicate).AsNoTracking().ToListAsync();

    public async Task<List<T>> GetAllAsync() =>
        await _set.AsNoTracking().ToListAsync();

    public async Task<T> AddAsync(T entity)
    {
        await _set.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _set.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(T entity)
    {
        _set.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null) =>
        predicate is null ? await _set.CountAsync() : await _set.CountAsync(predicate);
}

// 规约模式与仓储结合
public interface ISpecification<T>
{
    Expression<Func<T, bool>> ToExpression();
}

public async Task<List<T>> FindAsync(ISpecification<T> spec) =>
    await _set.Where(spec.ToExpression()).AsNoTracking().ToListAsync();
```

### 实践 2：CQRS 读写分离

```csharp
// 写模型：基于 EF Core
public class OrderCommandHandler
{
    private readonly AppDbContext _db;

    public OrderCommandHandler(AppDbContext db) => _db = db;

    public async Task<int> Handle(PlaceOrderCommand cmd)
    {
        var order = new Order { /* ... */ };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return order.Id;
    }
}

// 读模型：基于 Dapper，直接查询
public class OrderQueryHandler
{
    private readonly IDbConnection _connection;

    public OrderQueryHandler(IDbConnection connection) => _connection = connection;

    public async Task<OrderDetailDto> Handle(GetOrderQuery query)
    {
        const string sql = @"
            SELECT o.*, u.Name AS UserName, u.Email
            FROM Orders o
            INNER JOIN Users u ON o.UserId = u.Id
            WHERE o.Id = @Id";

        return await _connection.QuerySingleAsync<OrderDetailDto>(sql, new { query.Id });
    }
}

// 注册：分离的 DbContext
services.AddDbContext<WriteDbContext>(opt => opt.UseSqlServer(writeConn));
services.AddScoped<IDbConnection>(sp => new SqlConnection(readConn));
```

### 实践 3：领域事件与发布

```csharp
// 在 SaveChanges 前后发布事件
public class EventPublishingDbContext : DbContext
{
    private readonly IDomainEventDispatcher _dispatcher;
    private List<DomainEvent> _events = new();

    public EventPublishingDbContext(DbContextOptions options, IDomainEventDispatcher dispatcher)
        : base(options) => _dispatcher = dispatcher;

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // 收集事件
        _events = ChangeTracker.Entries<IHasDomainEvents>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        // 清空实体上的事件
        foreach (var entry in ChangeTracker.Entries<IHasDomainEvents>())
            entry.Entity.ClearDomainEvents();

        // 保存变更
        var result = await base.SaveChangesAsync(ct);

        // 保存成功后发布事件
        foreach (var @event in _events)
            await _dispatcher.PublishAsync(@event);

        return result;
    }
}

public interface IHasDomainEvents
{
    IReadOnlyList<DomainEvent> DomainEvents { get; }
    void ClearDomainEvents();
}
```

### 实践 4：单元测试与内存数据库

```csharp
// 使用 SQLite 内存模式或 EF Core InMemory 提供程序
public class UserServiceTests
{
    private async Task<AppDbContext> CreateContextAsync()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new AppDbContext(options);
        await context.Database.EnsureCreatedAsync();
        return context;
    }

    [Fact]
    public async Task CreateUser_Should_Persist_To_Database()
    {
        // Arrange
        await using var context = await CreateContextAsync();
        var service = new UserService(context);

        // Act
        var userId = await service.CreateUserAsync("张三", "zhang@example.com", 25);

        // Assert
        var user = await context.Users.FindAsync(userId);
        Assert.NotNull(user);
        Assert.Equal("张三", user.Name);
        Assert.Equal(25, user.Age);
    }

    [Fact]
    public async Task SearchUsers_Should_Filter_By_Name()
    {
        // Arrange
        await using var context = await CreateContextAsync();
        context.Users.AddRange(
            new User { Name = "张三", Email = "z1@b.com", Age = 20 },
            new User { Name = "李四", Email = "l1@b.com", Age = 30 },
            new User { Name = "张五", Email = "z2@b.com", Age = 40 }
        );
        await context.SaveChangesAsync();

        var service = new UserService(context);

        // Act
        var users = await service.SearchUsersAsync("张", null);

        // Assert
        Assert.Equal(2, users.Count);
        Assert.All(users, u => Assert.Contains("张", u.Name));
    }
}
```

### 实践 5：监控与诊断

```csharp
// 注册：开启数据库日志与敏感数据日志
services.AddDbContext<AppDbContext>((sp, opt) =>
{
    opt.UseSqlServer(connectionString)
       .LogTo(sp.GetRequiredService<ILogger<AppDbContext>>().Log,
              new[] { DbLoggerCategory.Database.Command.Name },
              LogLevel.Information)
       .EnableSensitiveDataLogging()  // 仅开发环境
       .EnableDetailedErrors();
});

// 使用 EF Core 诊断源监听 SQL 执行
public class EfCoreDiagnosticObserver : IObserver<DiagnosticListener>
{
    public void OnNext(DiagnosticListener value)
    {
        if (value.Name == "Microsoft.EntityFrameworkCore")
        {
            value.Subscribe(new EfCoreListener());
        }
    }
    public void OnCompleted() { }
    public void OnError(Exception error) { }
}

public class EfCoreListener : IObserver<KeyValuePair<string, object?>>
{
    public void OnNext(KeyValuePair<string, object?> value)
    {
        if (value.Key == "Microsoft.EntityFrameworkCore.Database.Command.CommandExecuting")
        {
            var command = (DbCommand)value.Value!;
            Console.WriteLine($"执行 SQL: {command.CommandText}");
        }
    }
    public void OnCompleted() { }
    public void OnError(Exception error) { }
}

// 应用启动时注册
DiagnosticListener.AllListeners.Subscribe(new EfCoreDiagnosticObserver());

// 性能监控：MiniProfiler
services.AddMiniProfiler(options =>
{
    options.RouteBasePath = "/profiler";
}).AddEntityFramework();
```

## 案例研究

### 案例 1：高并发电商订单系统

**背景**：某电商秒杀活动期间，QPS 达 10,000+，原有 EF Core 实现出现大量并发冲突与超时。

**问题分析**：

1. `SaveChanges` 时间从 5ms 增至 500ms（锁等待）
2. 库存超卖（并发读 - 修改 - 写入）
3. 大量 `DbUpdateConcurrencyException` 频繁重试失败

**解决方案**：

```csharp
// 1. 读写分离：写用 EF Core，读用 Redis 缓存
public class CachedProductService
{
    private readonly IDatabase _redis;
    private readonly AppDbContext _db;

    public async Task<Product?> GetAsync(int id)
    {
        // 缓存优先
        var cached = await _redis.StringGetAsync($"product:{id}");
        if (cached.HasValue)
            return JsonSerializer.Deserialize<Product>(cached!);

        // 缓存未命中查数据库
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (product is not null)
            await _redis.StringSetAsync($"product:{id}", JsonSerializer.Serialize(product),
                TimeSpan.FromMinutes(10));

        return product;
    }
}

// 2. 库存扣减使用乐观锁 + 原子操作
public async Task<bool> DeductStockAsync(int productId, int quantity)
{
    // 直接 SQL：UPDATE WHERE stock >= quantity
    var affected = await _db.Database.ExecuteSqlRawAsync(
        "UPDATE Products SET Stock = Stock - {0} WHERE Id = {1} AND Stock >= {0}",
        quantity, productId);
    return affected > 0;
}

// 3. 批量操作替代循环 SaveChanges
public async Task<int> BatchCreateOrdersAsync(IEnumerable<Order> orders)
{
    await _db.Orders.AddRangeAsync(orders);
    return await _db.SaveChangesAsync();  // 单次事务
}

// 4. 队列削峰
public class OrderQueueConsumer : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var cmd in _channel.Reader.ReadAllAsync(ct))
        {
            try
            {
                await _handler.HandleAsync(cmd);
            }
            catch (DbUpdateConcurrencyException)
            {
                // 重试或入死信队列
                await _deadLetterQueue.WriteAsync(cmd);
            }
        }
    }
}
```

**收益**：TPS 从 200 提升至 8,000，库存超卖率从 0.1% 降至 0。

### 案例 2：多租户 SaaS 数据隔离

**背景**：某 SaaS 平台服务 1,000+ 租户，需实现严格的数据隔离与按租户计费。

**实现**：

```csharp
// 1. 全局查询过滤器
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
        {
            modelBuilder.Entity(entityType.ClrType)
                .HasQueryFilter(e => EF.Property<int>(e, "TenantId") == _tenantProvider.TenantId);
        }
    }
}

// 2. 租户解析中间件
public class TenantMiddleware
{
    public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider, RequestDelegate next)
    {
        var tenantId = context.User.FindFirst("TenantId")?.Value;
        if (int.TryParse(tenantId, out var id))
        {
            tenantProvider.SetTenantId(id);
        }
        await next(context);
    }
}

// 3. 跨租户操作需显式绕过过滤器
public class AdminService
{
    public async Task<List<User>> GetAllUsersAcrossTenantsAsync()
    {
        return await _db.Users.IgnoreQueryFilters().ToListAsync();
    }
}

// 4. 自动填充租户 ID
public override int SaveChanges()
{
    foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
    {
        if (entry.State == EntityState.Added)
            entry.Entity.TenantId = _tenantProvider.TenantId;
    }
    return base.SaveChanges();
}

// 5. 按租户统计资源使用
public async Task<TenantUsage> GetTenantUsageAsync(int tenantId)
{
    return await _db.Users
        .IgnoreQueryFilters()
        .Where(u => u.TenantId == tenantId)
        .GroupBy(u => u.TenantId)
        .Select(g => new TenantUsage
        {
            TenantId = g.Key,
            UserCount = g.Count(),
            OrderCount = g.SelectMany(u => u.Orders).Count(),
            StorageUsed = g.SelectMany(u => u.Orders).Sum(o => o.Amount)
        })
        .FirstOrDefaultAsync();
}
```

### 案例 3：事件溯源与 CQRS

**背景**：某金融系统需要完整审计追溯，传统 CRUD 无法满足。

**实现**：

```csharp
// 事件存储：所有状态变更作为事件持久化
public class AccountAggregate
{
    public Guid Id { get; private set; }
    public decimal Balance { get; private set; }
    public int Version { get; private set; }

    private readonly List<DomainEvent> _uncommittedEvents = new();
    public IReadOnlyList<DomainEvent> UncommittedEvents => _uncommittedEvents;

    public static AccountAggregate Rehydrate(IEnumerable<DomainEvent> events)
    {
        var account = new AccountAggregate();
        foreach (var @event in events)
            account.Apply(@event);
        return account;
    }

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("金额必须为正");
        Raise(new AmountDeposited(Id, amount, ++Version));
    }

    public void Withdraw(decimal amount)
    {
        if (amount > Balance) throw new InvalidOperationException("余额不足");
        Raise(new AmountWithdrawn(Id, amount, ++Version));
    }

    private void Raise(DomainEvent @event)
    {
        _uncommittedEvents.Add(@event);
        Apply(@event);
    }

    private void Apply(DomainEvent @event)
    {
        switch (@event)
        {
            case AmountDeposited d:
                Balance += d.Amount;
                break;
            case AmountWithdrawn w:
                Balance -= w.Amount;
                break;
        }
    }
}

// 事件存储仓储
public class EventSourcedRepository<T> where T : class, IAggregate, new()
{
    private readonly AppDbContext _db;

    public EventSourcedRepository(AppDbContext db) => _db = db;

    public async Task<T?> GetByIdAsync(Guid id)
    {
        var events = await _db.Set<DomainEventEntity>()
            .Where(e => e.AggregateId == id)
            .OrderBy(e => e.Version)
            .ToListAsync();

        if (!events.Any()) return null;

        var aggregate = new T();
        aggregate.Rehydrate(events.Select(e => e.Deserialize()));
        return aggregate;
    }

    public async Task SaveAsync(T aggregate)
    {
        var events = aggregate.UncommittedEvents;
        foreach (var @event in events)
        {
            _db.Set<DomainEventEntity>().Add(new DomainEventEntity
            {
                AggregateId = aggregate.Id,
                Version = aggregate.Version,
                EventType = @event.GetType().Name,
                Data = JsonSerializer.Serialize(@event, @event.GetType()),
                Timestamp = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
    }
}

// 读模型投影：从事件流构建查询视图
public class AccountBalanceProjection
{
    public Guid AccountId { get; set; }
    public decimal Balance { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class AccountProjectionHandler
{
    public async Task HandleAsync(DomainEvent @event)
    {
        switch (@event)
        {
            case AmountDeposited d:
                await UpdateBalanceAsync(d.AccountId, d.Amount);
                break;
            case AmountWithdrawn w:
                await UpdateBalanceAsync(w.AccountId, -w.Amount);
                break;
        }
    }

    private async Task UpdateBalanceAsync(Guid accountId, decimal delta)
    {
        var projection = await _db.Set<AccountBalanceProjection>()
            .FindAsync(accountId);

        if (projection is null)
        {
            projection = new AccountBalanceProjection { AccountId = accountId };
            _db.Set<AccountBalanceProjection>().Add(projection);
        }

        projection.Balance += delta;
        projection.LastUpdated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
```

**收益**：完整审计追溯，任意时刻可重建状态；写入性能稳定（仅 INSERT）；读模型可针对查询优化。

## 习题

### 基础题

**习题 1**：解释以下概念的区别：

- DbContext 与 DbSet
- Code First 与 Database First
- Eager Loading 与 Lazy Loading
- Added、Modified、Deleted 状态

**参考答案要点**：

- DbContext 是数据库会话，DbSet 是表的强类型访问入口
- Code First 从代码生成数据库，Database First 从数据库生成代码
- Eager Loading 用 Include 预加载关联数据，Lazy Loading 在访问导航属性时延迟查询
- Added 表示新增待插入，Modified 表示已修改待更新，Deleted 表示已标记待删除

**习题 2**：编写一个查询，返回每个用户的订单数量、总金额、平均金额，按总金额降序排列。

**参考答案要点**：

```csharp
var stats = await _db.Users
    .Select(u => new
    {
        u.Name,
        OrderCount = u.Orders.Count,
        TotalAmount = u.Orders.Sum(o => o.Amount),
        AvgAmount = u.Orders.Any() ? u.Orders.Average(o => o.Amount) : 0
    })
    .OrderByDescending(s => s.TotalAmount)
    .ToListAsync();
```

### 进阶题

**习题 3**：实现一个支持乐观并发的账户转账操作，要求：

- 使用 `[Timestamp]` 实现并发令牌
- 处理 `DbUpdateConcurrencyException`
- 最多重试 3 次
- 记录冲突日志

**参考答案要点**：

```csharp
public async Task<bool> TransferAsync(int fromId, int toId, decimal amount)
{
    for (int attempt = 0; attempt < 3; attempt++)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var from = await _db.Accounts.FindAsync(fromId);
            var to = await _db.Accounts.FindAsync(toId);

            if (from.Balance < amount) return false;

            from.Balance -= amount;
            to.Balance += amount;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning("转账并发冲突，尝试 {Attempt}", attempt + 1);

            foreach (var entry in ex.Entries)
                await entry.ReloadAsync();
        }
    }
    return false;
}
```

**习题 4**：分析以下查询存在的性能问题，并给出优化方案：

```csharp
var orders = await _db.Orders
    .Include(o => o.User)
    .Include(o => o.Items)
    .Include(o => o.Coupons)
    .Where(o => o.OrderDate >= DateTime.UtcNow.AddDays(-30))
    .ToListAsync();

foreach (var order in orders)
{
    Console.WriteLine($"{order.Id}: {order.User.Name}, {order.Items.Count} items");
    foreach (var item in order.Items)
    {
        Console.WriteLine($"  {item.Product.Name}: {item.Quantity}");
    }
}
```

**参考答案要点**：

- 多个 `Include` 导致笛卡尔积爆炸（Items × Coupons）
- 循环中访问 `item.Product.Name` 触发延迟加载（N+1）
- 加载了不必要的 Coupons 数据

**优化方案**：

- 使用 `AsSplitQuery()` 拆分查询
- 使用 `ThenInclude(o => o.Items).ThenInclude(i => i.Product)` 预加载
- 投影到 DTO 只取必要字段

### 挑战题

**习题 5**：设计一个支持多租户的通用仓储模式，要求：

- 通过 `ITenantEntity` 接口标记租户实体
- 全局查询过滤器自动隔离
- 跨租户操作需显式标记
- 自动填充租户 ID

**参考答案要点**：

- 在 `OnModelCreating` 中遍历所有实体类型，为 `ITenantEntity` 添加 `HasQueryFilter`
- 在 `SaveChanges` 中重写，对 `EntityState.Added` 的实体自动设置 `TenantId`
- 提供 `IgnoreQueryFilters()` 用于管理员跨租户查询
- 通过 `ITenantProvider` 抽象租户上下文（如从 JWT 或 HTTP Header 提取）

**习题 6**：研究 EF Core 8 的复杂类型（Complex Types）与 Owned Types 的区别，并说明适用场景。

**参考答案要点**：

- **Owned Types**：与所有者同表，但有自己的标识，可空，支持集合
- **Complex Types**（EF Core 8+）：值对象语义，无标识，不可空，不可为 null，更符合 DDD 值对象概念
- **使用场景**：值对象（如 `Address`、`Money`）用 Complex Types；可空或可选的子实体用 Owned Types

**习题 7**：实现一个基于 EF Core 的乐观锁重试策略，要求：

- 使用 Polly 库实现指数退避
- 区分可重试与不可重试异常
- 记录每次重试的上下文
- 最多重试 5 次，总时长不超过 30 秒

**参考答案要点**：

```csharp
var retryPolicy = Policy
    .Handle<DbUpdateConcurrencyException>()
    .Or<SqlException>(ex => ex.Number == 1205)  // 死锁
    .WaitAndRetryAsync(
        retryCount: 5,
        sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
        onRetry: (exception, delay, attempt, context) =>
        {
            _logger.LogWarning(exception, "重试 {Attempt}, 延迟 {Delay}s", attempt, delay.TotalSeconds);
        });

await retryPolicy.ExecuteAsync(async () =>
{
    // 业务逻辑
    await _db.SaveChangesAsync();
});
```

**习题 8**：比较 EF Core 与 Dapper 在以下场景的选择策略：

- 高频简单查询（每秒 10,000 次）
- 复杂报表查询（多表 JOIN + 聚合）
- 领域模型持久化（聚合根 + 值对象）
- 批量数据导入（10 万条记录）

**参考答案要点**：

- 高频简单查询：Dapper（EF Core 翻译开销累积明显）
- 复杂报表：Dapper（直接控制 SQL，可利用数据库特性）
- 领域模型持久化：EF Core（导航属性、变更追踪、值对象映射）
- 批量导入：Dapper + 临时表，或 EF Core 的 `ExecuteUpdate` / `ExecuteDelete`（避免变更追踪开销）

## 参考文献

1. Lerman, J. and Miller, R. 2021. *Programming Entity Framework: DbContext* (2nd ed.). O'Reilly Media. DOI: 10.5555/2041731

2. Smith, S. and Latham, J. 2024. *Entity Framework Core in Action* (3rd ed.). Manning Publications. DOI: 10.5555/3456789

3. Microsoft. 2024. *EF Core Documentation*. Microsoft Learn. Available at: https://learn.microsoft.com/ef/core/

4. Codd, E. F. 1970. A relational model of data for large shared data banks. *Communications of the ACM* 13, 6 (June 1970), 377-387. DOI: 10.1145/362384.362685

5. Neward, T. 2006. The Vietnam of Computer Science. *The Vietnam of Computer Science Essay*. Available at: https://blogs.tedneward.com/post/the-vietnam-of-computer-science/

6. Ambler, S. W. and Sadalage, P. J. 2006. *Refactoring Databases: Evolutionary Database Design*. Addison-Wesley Professional. DOI: 10.5555/1198151

7. Fowler, M. 2002. *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional. DOI: 10.5555/573476

8. Evans, E. 2003. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley Professional. DOI: 10.5555/861504

9. Vernon, V. 2013. *Implementing Domain-Driven Design*. Addison-Wesley Professional. DOI: 10.5555/2541942

10. NBL, A. 2022. *Entity Framework Core 5 for Beginners*. Apress. DOI: 10.1007/978-1-4842-8087-0

11. Dykstra, J., Smith, S., Latham, J., and Anderson, J. 2024. *EF Core Performance Tuning*. Microsoft Learn. Available at: https://learn.microsoft.com/ef/core/performance/

12. Bauer, C. and King, G. 2006. *Java Persistence with Hibernate*. Manning Publications. DOI: 10.5555/1198152

13. Tate, B. and Gehtland, J. 2005. *Better, Faster, Lighter Java*. O'Reilly Media. DOI: 10.5555/1013291

## 延伸阅读

### 官方文档

- **EF Core 官方文档**：https://learn.microsoft.com/ef/core/ - 完整教程、API 参考、性能指南
- **EF Core 迁移指南**：https://learn.microsoft.com/ef/core/managing-schemas/migrations/ - 迁移创建、应用、回滚
- **EF Core 性能优化**：https://learn.microsoft.com/ef/core/performance/ - 索引、查询、上下文池化
- **EF Core 9.0 新特性**：https://learn.microsoft.com/ef/core/what-is-new/ef-core-9.0/plan - 最新版本规划

### 经典教材

- **《Entity Framework Core in Action》**：从入门到高级的完整指南
- **《Programming Entity Framework》**(Julia Lerman)：EF 经典教程，覆盖原理与实践
- **《Domain-Driven Design》**(Eric Evans)：聚合根、值对象、领域事件的源头
- **《Patterns of Enterprise Application Architecture》**(Martin Fowler)：仓储、工作单元等模式

### 开源项目

- **EF Core GitHub**：https://github.com/dotnet/efcore - 源码、问题、路线图
- **Ardalis.Specification**：https://github.com/ardalis/Specification - 规约模式实现
- **eShopOnContainers**：https://github.com/dotnet-architecture/eShopOnContainers - 微软微服务参考架构
- **CleanArchitecture**：https://github.com/jasontaylordev/CleanArchitecture - 分层架构模板

### 性能与诊断

- **MiniProfiler**：https://github.com/MiniProfiler/dotnet - 实时 SQL 查询监控
- **EFCore.Visualizer**：VS 扩展，可视化查询计划
- **SQL Server Profiler / Extended Events**：数据库端 SQL 跟踪
- **Application Insights**：云端 APM，含依赖追踪

## 小结

EF Core 作为 .NET 生态的主流 ORM 框架，通过对象与关系的自动化映射、LINQ 查询翻译、迁移管理、变更追踪等机制，大幅提升了数据访问层的开发效率。本章从历史动机、形式化定义、理论推导、代码实践到工程模式，系统呈现了 EF Core 的全貌：

1. **历史维度**：从 ADO.NET 到 EF6 到 EF Core，反映 ORM 范式的演进与成熟
2. **理论基础**：映射函数、查询翻译、变更追踪状态机、乐观并发模型等数学语义
3. **实践维度**：10 个完整代码示例覆盖 CRUD、查询、配置、迁移、并发、性能、事务、DDD、多租户
4. **陷阱识别**：N+1 查询、笛卡尔积爆炸、内存泄漏、客户端求值、事务边界、迁移误操作等典型反模式
5. **工程落地**：仓储模式、CQRS、领域事件、单元测试、监控诊断的完整方案
6. **真实案例**：高并发电商、多租户 SaaS、事件溯源 CQRS 三个场景的深度剖析

掌握 EF Core 的关键不在于记住 API，而在于理解其工作机制（翻译、追踪、并发、事务）与权衡取舍（开发效率 vs 性能、抽象 vs 控制、便捷 vs 安全）。现代 .NET 开发者应当在享受 ORM 便利的同时，保持对底层 SQL 的理解，在性能敏感场景果断切换到 Dapper 或原生 ADO.NET，构建既高效又可维护的数据访问层。
