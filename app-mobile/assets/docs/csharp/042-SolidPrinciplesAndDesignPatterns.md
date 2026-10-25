---
order: 50
title: SOLID 原则与设计模式
module: 'csharp'
category: 后端技术
difficulty: beginner
description: 五大原则的反例与正解、继承 vs 组合的决策表、脆弱基类问题，以及 C# 轻量设计模式：事件总线、依赖倒置装配、无状态状态机。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/040-CSharpOOP'
  - 'csharp/260-CSharpDependencyInjection'
  - 'csharp/200-DelegateEventUnderlying'
prerequisites: []
---

## 知识点地图

- **知识类别**：设计原则与模式（SOLID + C# 惯用轻量模式）。
- **解决什么问题**：OOP 语法（类、接口、继承）人人会写，但「怎么组织才不会越长越乱」需要原则判据与经过验证的模式。SOLID 给出五条可操作的评审标准；本文再配三个 C# 一等样本：事件总线契约、分层依赖倒置的静态装配、无状态状态机——全部来自真实项目 flower-card。
- **什么时候用到**：新类该有哪些依赖时；评审「这个继承树合理吗」时；系统间解耦（事件 vs 直接调用）决策时；给游戏对象写状态流转时。

本文承接 [C# 面向对象](/csharp/040-CSharpOOP) 的 SOLID 实践示例与「继承 vs 组合」讨论并扩为专篇；依赖注入容器侧的完整机制见 [C# 依赖注入](/csharp/260-CSharpDependencyInjection)，委托与事件的语言层细节见 [委托与事件底层](/csharp/200-DelegateEventUnderlying)。

## 1. SOLID：五条原则的 C# 判例

### 1.1 单一职责（SRP）：一个类只有一个变化的理由

```csharp
// 反例：一个类承担多种职责
public class BadUserService
{
    public void CreateUser(string name, string email) { /* ... */ }
    public void SendWelcomeEmail(string email) { /* SMTP 逻辑 */ }
    public void LogToDatabase(string message) { /* 日志逻辑 */ }
    public void ExportToCsv(User user) { /* 导出逻辑 */ }
}

// 正例：职责分离
public interface IUserRepository { Task<User> CreateAsync(string name, string email); }
public interface IEmailService { Task SendWelcomeAsync(string email); }
public interface ILogger { void Log(string message); }
public interface IUserExporter { string Export(User user); }

public sealed class UserService
{
    private readonly IUserRepository _repo;
    private readonly IEmailService _email;
    private readonly ILogger _logger;

    public UserService(IUserRepository repo, IEmailService email, ILogger logger)
    {
        _repo = repo; _email = email; _logger = logger;
    }

    public async Task<User> RegisterAsync(string name, string email)
    {
        _logger.Log($"注册用户: {name}");
        var user = await _repo.CreateAsync(name, email);
        await _email.SendWelcomeAsync(email);
        return user;
    }
}
```

- 判据不是「方法少」而是「**变化的理由**」：邮件模板改版要动这个类吗？导出格式变化要动它吗？——要动就说明职责混了；
- `sealed` 是 C# 专属加分项：除非显式设计为可继承，默认封印，评审时继承树天然清晰（继承的代价见 §3）。

### 1.2 开闭（OCP）：加类不改类

```csharp
public interface IDiscountStrategy
{
    decimal Apply(decimal originalPrice);
}

public sealed class NoDiscount : IDiscountStrategy
{
    public decimal Apply(decimal originalPrice) => originalPrice;
}

public sealed class PercentageDiscount(decimal percentage) : IDiscountStrategy
{
    public decimal Apply(decimal originalPrice) => originalPrice * (1 - percentage);
}

// 新增策略 = 新增一个类，现有代码零修改
public sealed class TieredDiscount : IDiscountStrategy
{
    public decimal Apply(decimal originalPrice) => originalPrice switch
    {
        < 100 => originalPrice,
        < 500 => originalPrice * 0.95m,
        < 1000 => originalPrice * 0.90m,
        _ => originalPrice * 0.85m
    };
}
```

- `switch` 表达式（C# 8+）与主构造函数（C# 12）让策略类薄到只剩语义本身——模式的成本被语言进步逐年降低；
- OCP 的对立面是「每个新需求都去改同一个 if-else 山」：改老类意味着已上线的折扣逻辑要重新回归测试；
- 注意边界：需求稳定的小枚举（如四季）直接 switch 反而更诚实，为两个分支建接口是过度设计。

### 1.3 里氏替换（LSP）：子类可无缝替换基类

```csharp
public abstract class Bird
{
    public abstract string Describe();
}

// 能力抽象为接口，而不是塞进基类
public interface IFlyable { void Fly(); }
public interface ISwimmable { void Swim(); }

public sealed class Sparrow : Bird, IFlyable
{
    public override string Describe() => "麻雀";
    public void Fly() => Console.WriteLine("飞翔");
}

public sealed class Penguin : Bird, ISwimmable
{
    public override string Describe() => "企鹅不会飞，但会游泳";
}
```

- 反例教材是「基类 `Bird.Fly()` + 企鹅抛 NotSupportedException」：调用方拿着 `Bird` 合理假设「都能飞」，被替换后的子类打破假设——LSP 违约；
- 经典变体 Rectangle/Square（正方形重写宽高 setter 制造副作用）在 [C# 面向对象](/csharp/040-CSharpOOP) 的陷阱节有完整代码；
- 修复方向恒定：**能力下放到接口，父类只留真正全体共享的契约**。

### 1.4 接口隔离（ISP）：胖接口拆细

```csharp
// 反例：胖接口——机器人被迫「实现」吃饭睡觉
public interface IWorker
{
    void Work();
    void Eat();
    void Sleep();
}

// 正例：细粒度接口
public interface IWorkable { void Work(); }
public interface IEatable { void Eat(); }
public interface ISleepable { void Sleep(); }

public sealed class HumanWorker : IWorkable, IEatable, ISleepable
{
    public void Work() => Console.WriteLine("工作");
    public void Eat() => Console.WriteLine("吃饭");
    public void Sleep() => Console.WriteLine("睡觉");
}

public sealed class RobotWorker : IWorkable
{
    public void Work() => Console.WriteLine("24 小时工作"); // 不需要的能力不强制实现
}
```

- 判断信号：实现类里出现 `throw new NotSupportedException()` 或空方法体——这是「被迫实现」的实锤，接口该拆了；
- 与 1.3 呼应：ISP 是 LSP 的预防针，胖接口是 LSP 违约的温床。

### 1.5 依赖倒置（DIP）：依赖抽象而非实现

```csharp
public sealed class OrderProcessor
{
    private readonly IPaymentGateway _payment;
    private readonly INotificationService _notification;

    // 依赖注入：依赖抽象而非具体实现
    public OrderProcessor(IPaymentGateway payment, INotificationService notification)
    {
        _payment = payment;
        _notification = notification;
    }

    public async Task ProcessAsync(Order order)
    {
        await _payment.ChargeAsync(order.TotalAmount);
        await _notification.NotifyAsync(order.Customer.Email, "订单已支付");
    }
}

public interface IPaymentGateway { Task ChargeAsync(decimal amount); }
public interface INotificationService { Task NotifyAsync(string to, string message); }
```

- 「倒置」的含义：高层业务（订单处理）不 import 低层细节（某支付 SDK），两者都面向接口——支付厂商换掉时 `OrderProcessor` 一行不动；
- 构造函数注入是最小形态；容器托管（`IServiceCollection`）是规模化解法，见 [C# 依赖注入](/csharp/260-CSharpDependencyInjection)；没有容器的场景（游戏引擎脚本）的装配手法见 §2.2。

## 2. 继承 vs 组合：决策表与脆弱基类

### 2.1 决策表（承接自面向对象篇）

| 维度 | 继承（IS-A） | 组合（HAS-A） |
| :--- | :--- | :--- |
| **耦合度** | 强耦合（编译期固定） | 弱耦合（运行时可替换） |
| **灵活性** | 低（单继承限制） | 高（可组合多对象） |
| **复用粒度** | 整个类（含状态与行为） | 单个职责对象 |
| **运行时切换** | 不支持 | 支持（依赖注入） |
| **测试隔离** | 难（基类副作用传导） | 易（mock 依赖） |
| **典型模式** | 模板方法、策略基类 | 策略、装饰器、适配器 |

**"组合优于继承"原则的边界**：

- **适合继承**：家族层次清晰、共享大量状态与实现、子类是基类的真正特化（如 `Circle` 是 `Shape`）
- **适合组合**：行为可插拔、运行时需切换、跨不相关类型共享能力（如日志能力、缓存能力）

### 2.2 脆弱基类问题（承接自面向对象篇陷阱节）

**问题描述**：基类实现细节被依赖，修改基类破坏子类。

```csharp
// 反例
public class BaseList<T>
{
    public virtual void Add(T item) { /* 添加逻辑 */ }
    public virtual void AddRange(IEnumerable<T> items)
    {
        foreach (var item in items) Add(item); // 依赖 Add 的实现
    }
}

public class LoggingList<T> : BaseList<T>
{
    public override void Add(T item)
    {
        Console.WriteLine($"添加: {item}");
        base.Add(item);
    }

    public override void AddRange(IEnumerable<T> items)
    {
        Console.WriteLine($"批量添加");
        base.AddRange(items); // 会重复日志：每个 Add 都打日志
    }
}

// 正解：使用组合 + 接口
public sealed class LoggingList<T> : IList<T>
{
    private readonly IList<T> _inner;
    public LoggingList(IList<T> inner) => _inner = inner;

    public void Add(T item)
    {
        Console.WriteLine($"添加: {item}");
        _inner.Add(item);
    }
    // 委托给内部实现，避免基类耦合
}
```

- 脆弱点在于 `AddRange` **内部调用了虚方法 `Add`**：子类重写 `Add` 后，基类的 `AddRange` 行为被隐式改变——基类作者改一行内部实现，所有子类的行为跟着变；
- .NET 标准库自己的回答就是组合：`ReadOnlyCollection<T>` 包一层 `IList<T>` 而不是继承 `List<T>`；
- 评审判据：**继承树超过两层、且子类重写的虚方法被基类其他方法调用**，就该考虑换组合。

## 3. 三个真实项目的轻量模式（flower-card 案例）

框架内（如游戏引擎）没有 DI 容器，SOLID 落地为更轻的手法。以下三个模式全部来自真实项目 flower-card 的 C# 脚本层。

### 3.1 事件总线契约：委托字段 + 订阅纪律

`Scripts/Core/EventBus.cs`（68 行内 30+ 事件）是 C# 委托事件总线的一等教学样本：

```csharp
// flower-card/Scripts/Core/EventBus.cs（节选与示意）
public static class EventBus
{
    // public Action 字段而非 event 关键字：允许任何系统 ?.Invoke 发射与直接订阅
    public static Action<int>? FlowerStressChanged; // 玩法v2 §2.4 预警表现唯一驱动源；逻辑层无 UI 引用
    public static Action? DayStarted;               // 生命周期组
    public static Action<string>? WeatherChanged;   // 天气组

    // 订阅纪律（注释明写）：_Ready 订阅、_ExitTree 退订；
    // 退订要求「委托存字段，禁止 lambda 直接订阅」——lambda 无法精确退订
}
```

- **为什么用 `Action` 字段而不用 `event` 关键字**：`event` 限制只有声明类能 Invoke，而游戏内任何系统（天气、经济、弹珠）都要能广播；字段形态换来灵活性，代价是「谁都能清空」（`= null`），靠纪律而非编译器约束——这是一次明确的取舍而非疏忽；
- **注释即文档**：每个事件标注签名语义与唯一消费方（如 FlowerStressChanged 标明「逻辑层无 UI 引用」），30+ 事件按生命周期/经济/花园/天气/威胁/弹珠/构筑/场景分组——事件膨胀的治理靠分组与锚点，不靠记性；
- **订阅纪律为什么禁止 lambda 订阅**：`x => handler(x)` 每次是新的委托实例，退订时 `-=` 匹配不到；存字段再订退是唯一可靠姿势（详见 [委托与事件底层](/csharp/200-DelegateEventUnderlying) 的委托相等性语义）。

### 3.2 分层依赖倒置与静态队列装配顺序

`Scripts/Core/SaveManager.cs:14-39` 展示了没有 DI 容器时 DIP 的落地手法：

```csharp
// flower-card/Scripts/Core/SaveManager.cs（节选示意）
public static class SaveManager
{
    // Core 层不反向依赖玩法层：导出/导入回调由各管理器注册进来
    private static Func<Dictionary<string, object>>? _exporter;
    private static Action<Dictionary<string, object>>? _importer;

    // 静态队列处理 autoload 装配顺序：
    // 单例未进树时回调先入队，_EnterTree 时再消费
    private static readonly Queue<Action> _pendingExports = new();
    private static readonly Queue<Action> _pendingImports = new();

    public static void Bind(
        Func<Dictionary<string, object>> exporter,
        Action<Dictionary<string, object>> importer)
    {
        if (_ready)
        {
            _exporter = exporter;
            _importer = importer;
        }
        else
        {
            _pendingExports.Enqueue(() => _exporter = exporter);  // 缓存装配指令
            _pendingImports.Enqueue(() => _importer = importer);
        }
    }
    // _EnterTree 里消费两个队列——「顺序不可控」被显式建模而不是祈祷加载顺序
}
```

- DIP 在这里的具体形态：**Core 只定义「可导出/可导入」的形状（委托签名），不认识任何具体管理器**——新增存档系统只需注册回调，`SaveManager` 零修改；
- 「静态队列」解决的是引擎场景的装配顺序问题：脚本的 `_EnterTree` 顺序由场景树决定，`Bind` 被调用时目标可能尚未就绪——把「早到的调用」排队而不是失败，README 里留档的 H1 装配顺序修复正源于此；
- 同文件 47-51 行的 `OfflineHoursCapProvider`（`Func<int>?`）是依赖注入的最小实现：Main 装配时注入技能树的离线上限，注释写明「经委托桥解耦，null=基础 8h」——**一个可空委托就是一个可缺省的依赖**。

### 3.3 无状态状态机：Flyweight 式的状态单例

`Scripts/Garden/FlowerGrowthMachine.cs:13-58` 是 C# 状态机的轻量实现对照：

```csharp
// flower-card/Scripts/Garden/FlowerGrowthMachine.cs（节选示意）
public enum GrowthStage { Seed, Sprout, Bud, Bloom, Withered, Soul }
// Withered=瞬态（事件后立即转 Soul）；Soul=花魂态占格禁种——生死态与成长态同枚举，注释写明语义

public abstract class FlowerState
{
    // Tick 返回 null 表示停留在当前状态；返回值表示迁移目标
    public abstract GrowthStage? Tick(FlowerPlant plant, float delta);
}

public sealed class SeedState : FlowerState
{
    // 每个状态全体花复用同一实例：状态无自身字段，Flyweight 化
    public static readonly SeedState S = new();
    private SeedState() { }

    public override GrowthStage? Tick(FlowerPlant plant, float delta)
    {
        // 阶段进入时设产能：发芽 30% / 花苞 60% / 开花 100%（锚定设计文档 §0）
        return plant.Growth >= plant.SproutThreshold ? GrowthStage.Sprout : null;
    }
}
```

- **无状态是可复用的前提**：状态对象没有自身字段，`Tick` 的一切输入来自 `plant` 参数——全体花共享 `SeedState.S` 单例，千株花零额外分配；
- 「`Tick` 返回 `GrowthStage?`，null=停留」把迁移决策做成纯函数：不藏副作用、可单测、可在暂停/加速（时间缩放）下正确工作；
- 对比重量级状态机库（Stateless 等）：对象少、层次浅的场景手写更诚实；当状态数上两位数或需要层次状态/守卫条件时再上库——**模式轻重的选择本身是一次架构决策**；
- 枚举语义膨胀（Withered 瞬态、Soul 占格）用注释治理，配套的持久化语义见 [JSON 序列化](/csharp/460-JsonSerialization) 与存档跨轮分层的真实做法（`SaveManager.StartNewGame` 保留 Profile 的案例在 [异常处理与健壮性](/csharp/062-ExceptionHandling) §5 与本节可对照阅读）。

## 4. 动手实践

练习任务：把下面这个「上帝类」重构为 SOLID 形态：

```csharp
public class PlayerService
{
    public void Login(string user, string pass) { /* 校验 + 写 session + 发通知 + 记日志 */ }
    public void Logout(string user) { /* 清 session + 发通知 + 记日志 */ }
    public string ExportPlayersCsv() { /* 查询 + 拼 CSV */ }
}
```

要求：

1. 按职责拆出至少三个接口，写明每个接口的「变化理由」；
2. `PlayerService` 只保留业务编排，依赖全部构造注入；
3. CSV 导出若需求变成「按登录时间过滤」，确认修改只落在一个新类里（OCP 验收）；
4. 思考题：通知与日志属于「同一个变化理由」吗？说明你的拆分粒度判断。

提示：通知渠道（邮件/短信）与日志后端（文件/数据库）是两条独立的变化轴。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
public interface ISessionStore          // 变化理由：会话存储方式（内存/Redis）
{
    void Open(string user);
    void Close(string user);
}

public interface INotificationService   // 变化理由：通知渠道（邮件/短信/IM）
{
    Task NotifyAsync(string to, string message);
}

public interface IAuditLog              // 变化理由：日志后端（文件/数据库）
{
    void Write(string message);
}

public sealed class PlayerService(ISessionStore sessions, INotificationService notify, IAuditLog log)
{
    public async Task LoginAsync(string user, string pass)
    {
        // 校验省略；只做编排：开 session -> 通知 -> 记日志
        sessions.Open(user);
        await notify.NotifyAsync(user, "登录成功");
        log.Write($"login:{user}");
    }

    public void Logout(string user)
    {
        sessions.Close(user);
        log.Write($"logout:{user}");
    }
}

// 导出是独立的职责（独立的变化轴），独立成类
public sealed class PlayerCsvExporter(IPlayerRepository repo)
{
    public string Export() => string.Join("\n", repo.QueryAll().Select(p => $"{p.Id},{p.Name}"));
}

// OCP 验收：按时间过滤 = 新增方法参数或新增装饰类，CsvExporter 的既有路径不动
public sealed class FilteredPlayerCsvExporter(IPlayerRepository repo, TimeWindow window)
    : PlayerCsvExporter(repo)
{
    public string ExportRecent() =>
        string.Join("\n", repo.QuerySince(window.Start).Select(p => $"{p.Id},{p.Name}"));
}
```

思考题答案：通知与日志不是同一变化理由——通知渠道换 SMS 不影响日志后端换文件；但「是否值得各占一个接口」看第二个实现出现的概率，单人小项目可以先用具体类 + sealed，出现第二个实现再抽接口（与两层晋升规则同源）。

</details>

## 5. 常见陷阱速查

- **为「可能的变化」提前抽象**：只有两个分支就上策略接口是投机性复杂度；等第二个真实实现出现再抽象。
- **基类虚方法被基类自身调用**：脆弱基类温床；要么基类只调私有非虚方法，要么整体改组合。
- **`event` 改 public 字段后谁都能置 null**：灵活性的代价；至少提供一个 `Reset()` 语义方法并写明纪律。
- **静态队列只进不出**：装配后忘消费队列，注册静默丢失；消费逻辑要覆盖「队列为空」的正常路径。
- **状态对象带了自身字段还做单例**：多实例共享脏状态；Flyweight 前提是无状态，要字段就一实体一状态实例。
- **LSP 违约的兜底写法**（子类抛 NotSupportedException）：说明契约放错了层，接口该拆。

## 6. 小结

初学者要点：SOLID 五条各自回答一个问题（职责归属、扩展方式、替换安全、接口粒度、依赖方向）；默认组合、谨慎继承；脆弱基类的信号是「基类调用可被重写的虚方法」。进阶注意：C# 的主构造函数与 switch 表达式降低模式成本；无容器环境用委托桥 + 静态队列显式建模装配顺序；轻量状态机的前提是无状态。

## 参考与致谢

- Microsoft Learn：*C# 编程指南 - 面向对象编程* 与 *delegate/event 语义*（CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/csharp/programming-guide/
- Robert C. Martin *Design Principles and Design Patterns*（SOLID 原始表述，概念参考后重写）
- GoF *Design Patterns*（策略/装饰器/模板方法的分类框架，概念参考）
- 工程案例：flower-card（真实项目）`Scripts/Core/EventBus.cs`、`Scripts/Core/SaveManager.cs`、`Scripts/Garden/FlowerGrowthMachine.cs` 代码结构描述经重写与泛化，非原文照录
