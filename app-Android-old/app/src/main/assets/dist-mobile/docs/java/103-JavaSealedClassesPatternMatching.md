# 密封类与模式匹配

想象平台要给演唱会做一个"购票结果"接口：结果要么成功（附带订单号），要么票档售罄，要么限购拦截，要么网络风控失败。用传统继承表达，任何类都能偷偷 `extends` 你的接口，调用方 `switch` 或 `if instanceof` 之后永远不敢说"我处理全了"。Java 17 正式的密封类（sealed，JEP 409）与 Java 21 正式的 record 模式、switch 模式匹配（JEP 440、441）合起来，给出了"受控继承体系 + 编译期穷举检查"的现代解法，让 Java 第一次拥有了接近函数式语言代数数据类型（ADT）的表达能力。

## 前置知识

- [Record 类](/java/045-JavaRecordClass)：record 的不可变语义与自动生成成员，是模式匹配解构的载体。
- [枚举进阶](/java/038-JavaEnumAdvanced)：枚举是"固定实例集合"，密封类是"固定子类型集合"，两者互为对照。
- [抽象类与接口](/java/016-AbstractClassInterface)：理解继承的开放性，才能体会"封闭"的价值。

## 学习目标

- 会用 `sealed`、`permits` 声明密封类，并说明子类必须满足的三个条件；
- 理解 record 与密封类组合形成的代数数据类型建模方式；
- 掌握 switch 模式匹配的三种形态：类型模式、record 解构模式、`when` 守卫；
- 利用编译期穷举检查建模业务领域，做到"新增分支必报错"；
- 能对比密封类 + 模式匹配与经典 Visitor 模式的取舍。

## 1. sealed 类与许可子类：受控的继承体系

密封类的核心诉求是：**这个类型能有哪些子类，由我白纸黑字列出来**。声明时用 `sealed` 修饰父类型，用 `permits` 列出许可名单，每个许可子类还必须三选一地标明自己的开放程度：

```java
// 购票结果：密封接口，只允许列出的三种形态
public sealed interface PurchaseResult
        permits Success, SoldOut, RateLimited {}

// 成功：record 承载订单号（record 默认 final，天然满足密封要求）
public record Success(String orderId, int price) implements PurchaseResult {}

// 售罄：也用 record，携带票档名
public record SoldOut(String tier) implements PurchaseResult {}

// 风控限流：普通类时必须显式 final
public final class RateLimited implements PurchaseResult {
    private final int retryAfterSeconds;

    public RateLimited(int retryAfterSeconds) {
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public int retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
```

规则有三条：许可子类必须与密封类同属一个模块（未命名模块则必须在同一个包），并且直接继承它；子类必须标记为 `final`（不再允许扩展）、`sealed`（继续收窄名单）或 `non-sealed`（重新开放，任何人可继承）三者之一；`permits` 子句与继承声明必须形成闭环，少写一个许可子类都会编译失败。这套约束把"继承"从公地变成了私产，任何扩展都逃不过编译器。

与枚举对比着理解会更透彻：枚举是"固定实例集合"，每个值是全局单例；密封类是"固定类型集合"，每个子类可以有任意多个实例、携带不同字段。需要"取值固定"用枚举，需要"形态固定、数据不同"用密封类，两者还能组合——枚举充当某个 record 的字段，表达"这个结果属于哪个票档"，封闭体系就这样层层搭建。

## 2. record 解构：把对象拆成变量

record 自动生成访问器与 `equals`/`hashCode`，而 record 模式更进一步：在 switch 或局部声明中把 record 的组件直接解构成变量。平台里一个"演唱会座位"建模如下：

```java
// 座位：区名与排号
public record Seat(String zone, int row) {}

public class DeconstructDemo {
    public static void main(String[] args) {
        Seat seat = new Seat("内场A", 5);

        // record 解构模式：组件 zone、row 直接变成局部变量
        if (seat instanceof Seat(String zone, int row)) {
            System.out.println(zone + " 区第 " + row + " 排"); // 内场A 区第 5 排
        }

        // 嵌套解构：record 里套 record 也能一次拆开
        record Booking(Seat seat, String fan) {}
        Booking b = new Booking(seat, "初音推");

        if (b instanceof Booking(Seat(var zone, var row), var fan)) {
            System.out.println(fan + " 预订了 " + zone + "-" + row); // 初音推 预订了 内场A-5
        }
    }
}
```

解构的本质是按位置调用 record 的访问器，因此组件名可以随意重命名，顺序与类型必须与 record 定义一致。相比先 `getter` 再取值的写法，解构让"数据形状"一目了然，也避免了中途 null 判断的样板代码。它也不只服务 switch：普通代码里 `if (x instanceof Seat(var zone, var row))` 一句就能完成"类型检查 + 取值"两件事，替代两行访问器调用；组件变量还可以在嵌套层继续下沉，深层结构一次拆到底。

## 3. switch 模式匹配与 when 守卫

Java 21 的 switch 接受任意对象，case 可以是类型模式、record 模式，还能用 `when` 追加条件守卫。把第 1 节的购票结果做一次完整分派：

```java
public class MatchDemo {
    public static String render(PurchaseResult result) {
        // 密封类型 + 全量覆盖：编译器能证明穷举，因此无需 default
        return switch (result) {
            // record 解构：直接取出 orderId 与 price
            case Success(String orderId, int price)
                -> "购票成功，订单号 " + orderId + "，实付 " + price + " 元";
            // record 模式 + when 守卫：对解构出的变量再做条件判断
            case SoldOut(String tier) when tier.equals("内场票")
                -> "内场票已售罄，可尝试 VIP 票";
            // 无守卫的同类型分支排在后面兜底
            case SoldOut(String tier)
                -> tier + " 已售罄";
            // 调用普通类的访问器
            case RateLimited r
                -> "操作过于频繁，" + r.retryAfterSeconds() + " 秒后重试";
        };
    }

    public static void main(String[] args) {
        System.out.println(render(new Success("M-2026-0001", 880)));
        System.out.println(render(new SoldOut("内场票")));
    }
}
```

三条要点：case 按书写顺序匹配，守卫不满足会继续向下尝试；对密封类型，只要覆盖了所有许可路径，switch 表达式即视为穷举，无需 `default`；一旦手滑加了 `default`，编译器反而失去"新增子类未处理"的报错能力，穷举红利随之消失。若结果类型不是密封的（例如 `Object`），编译器才要求必须有 `default` 或 `null` 分支。

分支顺序是另一门学问：把宽泛的类型分支放在前面，后面的分支永远不可达，编译器会直接报"已被覆盖"错误；把过窄的守卫放太靠前，又可能提前命中错过后面的特判。推荐的排法是从特殊到一般：带 `when` 守卫的具体条件在前，无守卫的兜底分支最后，让阅读顺序与匹配顺序保持一致。

## 4. 类型安全的领域建模：把非法状态挡在编译期

密封体系最大的工程价值在建模。对比两种写法：用布尔标志与可空字段表达"是否购票成功"，非法组合（`success=true` 却没有订单号）只能靠运行时校验；用密封类型表达，非法状态根本无法被构造出来。

```java
// 反面教材：一个类塞下所有可能，字段之间互相矛盾也拦不住
public class LegacyResult {
    boolean success;      // true 时 error 应为 null
    String error;         // false 时 orderId 应为 null
    String orderId;
    int price;            // 失败时也必须赋一个无意义的 0
}

// 正面教材：每种合法状态一个类型，字段与状态严格对齐
public sealed interface OrderState permits Draft, Paid, Refunded {}
public record Draft(String songId) implements OrderState {}
public record Paid(String songId, String orderId, int amount) implements OrderState {}
public record Refunded(String orderId, String reason) implements OrderState {}
```

订单从"草稿"到"已支付"再到"已退款"，每个状态只携带该状态下合法的字段；处理侧的 switch 由编译器保证分派完备。这正是"非法状态不可表示"（make illegal states unrepresentable）的落地方式，与枚举"固定实例集合"的思想一脉相承——枚举封闭的是实例，密封类封闭的是类型。

这种建模还有一张隐藏的牌：密封接口可以携带公共方法（默认方法），让所有状态共享行为，比如给 `OrderState` 定义 `isFinal()` 返回 `this instanceof Refunded`，调用方无需关心具体类型就能拿到统一答案。公共逻辑进接口，差异逻辑进 switch，职责就分干净了。

建模时还有一个实用技巧：先在纸面上穷举"这个结果有几种可能、每种可能要携带什么数据"，再决定每种形态用 record 还是普通类；一旦发现某个"状态"需要靠一个额外的布尔字段才能解释清楚，就说明它该被拆成两个状态。穷举清晰了，密封类型的翻译几乎是水到渠成的。

## 5. 与 Visitor 模式的对比

在模式匹配出现之前，"对固定类型集合分派处理"的标准答案是访问者模式（Visitor）：用双重分派把类型判断转交给元素自身，再回调访问者的对应重载。它能解决问题，但代价明显：

```java
// Visitor 风格（节选）：接口、accept、visit 三层样板
public interface TicketVisitor {
    String visitSingle(SingleTicket t);
    String visitVip(VipTicket t);
}
public sealed interface Ticket permits SingleTicket, VipTicket {
    String accept(TicketVisitor v);          // 每个子类都要实现 accept
}
public record SingleTicket(String seat) implements Ticket {
    public String accept(TicketVisitor v) { return v.visitSingle(this); }
}

// 使用：先造访问者，再逐个重写
String s = ticket.accept(new TicketVisitor() {
    public String visitSingle(SingleTicket t) { return "普通座 " + t.seat(); }
    public String visitVip(VipTicket t) { return "VIP 座 " + t.seat(); }
});
```

同样的分派用模式匹配只需一个 switch，类型、解构、处理逻辑聚在一处，可读性与维护性都更好：

```java
// 模式匹配风格：一处写完，无需 accept 与访问者接口
String s = switch (ticket) {
    case SingleTicket(var seat) -> "普通座 " + seat;
    case VipTicket(var seat, var gift) -> "VIP 座 " + seat + "，赠品：" + gift;
};
```

取舍建议：新增类型远多于新增操作时（业务形态经常扩展），Visitor 的"操作独立成类"仍有组织价值；反之，操作频繁演进、类型集合稳定（绝大多数业务建模属于此类）时，密封类 + switch 模式匹配是更轻的正解。此外，Visitor 依赖方法重载在编译期绑定，泛型与跨模块场景常有坑，模式匹配则没有这些问题。

还剩一条工程判断：如果系统里已经存在一个稳定的 Visitor 体系（比如编译器 AST、大型规则引擎），不必为了追新而迁移，改造成本大于收益；反过来，新代码几乎没有理由再引入 Visitor——密封类加模式匹配在编译期安全性相同的前提下，少一层接口、少一次方法调用、少一份样板文件。

## 6. 版本要求与迁移路径

密封类在 Java 17 转正，switch 模式匹配（含 record 解构）在 Java 21 转正，`case null` 与 `when` 守卫同属 21。落地前先确认项目的 `--release` 或工具链版本：17 只能享受 sealed 与 `instanceof` 类型模式，21 才能体验完整的 switch 解构分派；Android 工程要看 AGP 与脱糖支持情况，老环境可以先用"有限集合 + 工厂方法"的编码习惯过渡。

迁移存量代码有一条低成本路径：把 `if-else instanceof` 链逐段替换为 switch 类型模式，行为零变化；再把"一个类 + 状态标志"拆成密封接口的多个 record。两条路都可以小步进行，每一步都有编译器兜底。

```java
public class MigrationDemo {
    // 迁移示例：旧写法 -> 新写法，行为等价
    // 旧：if (r instanceof Success) {...} else if (r instanceof SoldOut) {...} else {...}
    static String render(PurchaseResult r) {
        return switch (r) {
            case Success(String id, int p) -> "成功 " + id + "，" + p + " 元";
            case SoldOut(String tier)      -> "售罄 " + tier;
            case RateLimited rl            -> "限流 " + rl.retryAfterSeconds() + " 秒";
        };
    }

    public static void main(String[] args) {
        System.out.println(render(new RateLimited(5)));
    }
}
```

版本红线之外还要留意团队协作约定：密封类型是"对外契约"，`permits` 名单一旦发布，删除或收紧子类都是破坏性变更；扩展名单则是新增分支，所有下游 switch 都会编译报错——这个"报错"是特性而非缺陷，它把升级成本显式化了，调用方改完就能安全升级。

## 易错点与最佳实践

**错误一：许可子类与密封类不同包/不同模块。**

```java
// 错误：未命名模块下，permits 引用了别的包里的类，编译报错
public sealed interface PurchaseResult permits Other.Result {}

// 修正：未命名模块中把密封类型与全部许可子类放在同一个包内；
// 使用命名模块（module-info.java）时放宽为同一模块
```

**错误二：许可子类忘记标记 final / sealed / non-sealed。**

```java
// 错误：子类既不 final 也不 sealed，密封契约断裂
public record SoldOut(String tier) implements PurchaseResult {} // record 默认 final，可以
public class RateLimited implements PurchaseResult {}           // 编译报错

// 修正：普通类必须三选一
public final class RateLimited implements PurchaseResult {}
```

**错误三：switch 多写了一个 default，穷举检查失效。**

```java
// 错误：有了 default，将来新增许可子类，这里不再报错，静默走进兜底逻辑
return switch (result) {
    case Success s -> "...";
    case SoldOut s -> "...";
    case RateLimited r -> "...";
    default -> "未知结果";
};

// 修正：删除 default，让编译器替你盯住所有分支
```

**错误四：在非密封类型上硬用模式匹配却漏写 null 分支。**

```java
// 错误：result 类型开放（不是密封接口），且可能为 null，编译器要求兜底
// 修正：补上 default 或 null case
return switch (result) {
    case Success(String id, int p) -> "...";
    case null, default -> "结果为空或类型未知"; // Java 21 支持 case null
};
```

**错误五：误以为 non-sealed 子类的子类也在白名单里。**

```java
// non-sealed 重新开放：任何人都能继承它，白名单对它的子类无效
public non-sealed class RateLimited implements PurchaseResult {}
class RiskyRateLimited extends RateLimited {} // 合法：已脱离密封管控

// 修正：若想"名单内继续细分"，用 sealed 而不是 non-sealed
public sealed class RateLimited2 implements PurchaseResult
        permits IpLimited, DeviceLimited {}
```

`non-sealed` 是逃生门不是递归封闭，审慎使用；绝大多数业务分支应该停在 `final`，或继续用 `sealed` 收窄下一层名单。

## 本篇小结

- `sealed + permits` 把继承体系封闭成白名单，子类必须同模块（或同包）直接继承，且三选一标记 `final`/`sealed`/`non-sealed`。
- record 模式（含嵌套解构）把 record 组件直接拆成局部变量，与密封类型组合即构成 Java 的代数数据类型。
- switch 模式匹配按顺序匹配类型与解构，`when` 守卫追加条件；密封类型全量覆盖即穷举，不要多写 `default`。
- 领域建模用"每种合法状态一个 record"替代"一个类 + 布尔标志"，让非法状态无法被构造。
- Visitor 模式适合"类型稳定、操作独立扩展"的场景；多数业务建模下，密封类 + 模式匹配的样板更少、可读性更高。

## 动手实践

1. **购票结果分派器**：按第 1 节建模 `PurchaseResult`，再写一个 `render` 方法覆盖全部许可子类，其中 `RateLimited` 需按剩余秒数输出不同文案。思路：先写 record 解构版，再给其中一个分支加 `when` 守卫，最后试着注释掉一个 case 观察编译错误。
2. **订单状态机**：实现第 4 节的 `OrderState`，编写 `next(OrderState state)` 返回下一状态（`Draft -> Paid` 需要订单号参数时可让方法签名携带 `String orderId`）。思路：switch 中对 `Refunded` 返回自身即可，注意穷举不要加 default。
3. **Visitor 迁移**：手写第 5 节的票类 Visitor 版本，再改写为模式匹配版本，统计两者的代码行数与"新增一种票时要改动的文件数"。思路：Visitor 要改接口与两个实现，模式匹配只改一个 switch，体会封闭体系下的维护成本差异。
