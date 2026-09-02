# 智能指针

所有权规则解决"一个值归谁管"，但真实系统里总有规则之外的需求：数据太大想放堆上（`Box`）、一个值被多方共同持有（`Rc`/`Arc`）、共享的同时还要能修改（`RefCell`）。智能指针就是这些需求的"标准答案"——它们是实现了 `Deref` 与 `Drop` 的结构体，在所有权系统内扩展出堆分配、共享所有权与内部可变性三种能力。本篇以虚拟歌手音乐平台的歌单、粉丝团与曲目关系为背景，逐一讲透这四件工具。

## 前置知识

- [泛型与 Trait](/rust/010-RustGenericTrait)：trait 约束与 trait 对象的基础。
- [所有权与借用](/rust/005-RustOwnershipBorrowing)：所有权三规则与借用约束。

## 学习目标

1. 理解智能指针与普通引用的区别，以及 `Deref`、`Drop` 两个基石 trait 的作用。
2. 会用 `Box<T>` 处理大对象堆分配与递归类型。
3. 会用 `Rc<T>`/`Arc<T>` 表达多个所有者，理解引用计数的增减规则。
4. 会用 `Cell<T>`/`RefCell<T>` 在不可变前提下实现内部可变性。
5. 能识别 `Rc` 循环引用导致的内存泄漏，并用 `Weak<T>` 打破循环。

## 1. 智能指针是什么：引用之外的第三种选择

普通引用 `&T` 只是"借用"：不拥有数据，不能独立存活，也不负责释放。智能指针则是**拥有数据的结构体**：内部持有指向堆内存的指针，附带元数据（如引用计数），并通过两个 trait 获得近乎原生的使用体验——

- `Deref`：让 `Box<String>` 可以像 `String` 一样调用方法、像引用一样传参（解引用强制转换）。
- `Drop`：让数据在离开作用域时自动清理，无需手动释放。

标准库中最常用的四个：`Box<T>` 独占堆数据；`Rc<T>` 单线程共享；`Arc<T>` 多线程共享；`RefCell<T>` 运行时借用检查的内部可变性。它们常常组合使用，例如 `Rc<RefCell<T>>` 是单线程共享可变状态的经典搭配。选型的第一步永远是问：**这个值需要几个所有者？需要跨线程吗？需要在"不可变"外壳下修改吗？**

## 2. Box<T>：把数据放上堆

`Box` 最典型的两个用途：存放体积大、拷贝贵的对象；构造递归类型。递归类型（如曲目链表、文件树）如果直接嵌套自身，编译器无法算出类型大小——"类型的大小包含类型自身的大小"是死循环。`Box` 指针大小固定（8 字节），恰好能打断这个循环：

```rust
// 曲目链表：递归类型必须借助 Box 才能确定大小
enum TrackList {
    Empty,
    Node {
        song: String,         // 曲目名
        next: Box<TrackList>, // Box 指针大小固定，打断大小递归
    },
}

use TrackList::{Empty, Node};

// 递归统计歌单长度：逐层跟随 Box 指针向下走
fn playlist_len(list: &TrackList) -> u32 {
    match list {
        Empty => 0,
        Node { next, .. } => 1 + playlist_len(next),
    }
}

fn main() {
    let list = Node {
        song: String::from("星轨协奏曲"),
        next: Box::new(Node {
            song: String::from("晚安曲"),
            next: Box::new(Empty),
        }),
    };
    println!("歌单共 {} 首", playlist_len(&list)); // 歌单共 2 首
}
```

**解读**：`Box` 把下一节点的数据放上堆，栈上只留一个指针，每一层大小确定。除递归类型外，`Box` 还适合两类场景：一是超大数据（如整首歌的歌词全文）想在 `move` 时只拷贝指针不拷贝内容；二是需要 trait 对象 `Box<dyn Trait>` 把不同实现装进同一集合——例如把不同 P主 的"打分算法"都实现为 `Box<dyn Scorer>` 存进曲库配置。`Box` 是零运行时开销的：解引用一次指针跳转，没有计数、没有锁。

## 3. Rc<T>：多个所有者的单曲共享

所有权规则要求"每个值一个所有者"，但现实是：同一首歌常常同时出现在夜听歌单、学习歌单、通勤歌单里，任何一份歌单销毁时歌都不该跟着消失。`Rc`（引用计数，Reference Counted）允许多个所有者共存，`Rc::clone` 只把计数加一，不发生深拷贝：

```rust
use std::rc::Rc;

struct Song {
    title: String, // 歌曲名
}

fn main() {
    // 一首歌被多个歌单共享
    let song = Rc::new(Song { title: String::from("霓虹漫舞") });
    let night_list = Rc::clone(&song); // 计数 1 -> 2，不拷贝数据
    let study_list = Rc::clone(&song); // 计数 2 -> 3

    println!("强引用计数 = {}", Rc::strong_count(&song)); // 3
    println!("夜听歌单：{}", night_list.title);
    println!("学习歌单：{}", study_list.title);
} // 每个变量离开作用域计数减一，归零时数据才真正释放
```

**解读**：`Rc` 把"释放时机"从"某一个所有者离开作用域"推迟到"最后一个所有者离开作用域"，计数归零才调用 `drop`。两个关键限制：其一，`Rc` 内的数据是**不可变**的——多个所有者同时写没有锁保护必然数据竞争，所以 `Rc` 只提供 `&T` 访问；其二，`Rc` 不是线程安全的（计数器是非原子的普通整数），跨线程请用下一节的 `Arc`。注意 `Rc::clone(&x)` 与 `x.clone()` 在 `Rc` 上等价，但前者明确表达"只加计数"，是社区惯例。

`Rc` 还有一些辅助 API 在图结构与调试中很常用：`Rc::get_mut(&mut rc)` 返回 `Option<&mut T>`——只有当强引用数为 1（没有其他共享者）时才能拿到可变访问，是"默认共享、独占时可优化"模式的实现基础；`Rc::strong_count` 与 `Rc::weak_count` 分别查询强、弱计数，除了调试，也是判断"我是不是最后一个持有者"的运行期手段。此外 `Rc::downgrade` 可以随时把强引用降级为弱引用，配合同一模块内 `RefCell` 使用，就能把第 6 节的循环引用问题在构造阶段就规避掉。

## 4. RefCell<T>：不可变外壳下的内部可变性

`Rc` 的数据不可变，但需求偏偏存在：多个播放器共享同一首歌，还要累计播放次数。`RefCell` 提供"内部可变性"——结构体外壳保持不可变，内部数据通过运行时借用检查来修改。它把借用检查从编译期搬到运行期：`borrow()` 等价于取 `&T`，`borrow_mut()` 等价于取 `&mut T`，违反互斥规则时**当场 panic**而不是编译报错：

```rust
use std::cell::RefCell;
use std::rc::Rc;

struct Song {
    title: String,
    plays: RefCell<u32>, // 内部可变：即便 Song 不可变也能改计数
}

fn main() {
    let song = Rc::new(Song {
        title: String::from("云端邮差"),
        plays: RefCell::new(0),
    });

    // 三个播放器共享同一首歌，各自累计一次播放
    for player in ["APP端", "网页端", "车载端"] {
        *song.plays.borrow_mut() += 1; // 借用随语句结束立即归还
        println!("{player} 完成一次播放");
    }
    println!("{} 共播放 {} 次", song.title, song.plays.borrow());
}
```

**解读**：`borrow_mut()` 返回的 `RefMut` 守卫离开语句作用域即归还，下一次 `borrow_mut` 才合法；若把守卫绑定到变量并长期持有，第二次 `borrow_mut` 会 panic——"编译期报错"变成"运行期崩溃"，安全边界没有消失，只是检查时机变了。规则是：**让借用守卫的生命尽量短**，取值、用完、立即丢弃。`Cell<T>` 是它的简化版（仅限 `Copy` 类型，直接 `get`/`set` 无需守卫）。`Rc<RefCell<T>>` 组合出的正是"多方共享 + 局部可写"，是单线程下图结构、缓存、计数器的惯用方案。

从"编译期检查"退到"运行期检查"是 `RefCell` 的本质代价，也要善用它的温和版本：`try_borrow` 与 `try_borrow_mut` 返回 `Result` 而不是 panic，冲突时拿到 `Err`。在"冲突是正常业务"的场景（比如可重入的回调、缓存失效逻辑）里，`try_*` 版本能把崩溃变成可控分支。但要警惕依赖它掩盖设计问题：如果代码里频繁出现"借用冲突被 try 掉"的路径，多半说明所有权模型需要重新划分，而不是继续在运行期绕行。

## 5. Arc<T>：跨线程的共享所有权

`Rc` 的计数器不是原子的，两个线程同时 clone 会让计数错乱——这正是数据竞争。`Arc`（原子引用计数，Atomically Reference Counted）用 CPU 原子指令维护计数，可以安全地跨线程传递。它的典型搭档是 `Arc<Mutex<T>>`（可变共享）或单独的 `Arc<T>`（只读共享）：

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    // 多个检票线程共享同一份演唱会信息（只读）
    let concert = Arc::new(String::from("虚拟歌手跨年演唱会"));

    let handles: Vec<_> = (1..=3)
        .map(|gate| {
            let c = Arc::clone(&concert); // 原子计数 +1
            thread::spawn(move || {
                println!("检票口 {gate} 播报：{}", *c);
            })
        })
        .collect();
    for h in handles {
        h.join().unwrap();
    }
    println!("当前计数：{}", Arc::strong_count(&concert)); // 1：线程已结束
}
```

**解读**：`move` 闭包把 `Arc::clone` 出来的新计数搬进线程，每个线程持有一个"所有权份额"。线程结束后各自计数减一，最后只剩 `main` 中的原始份额。读写都有的共享状态应再包一层锁（`Arc<Mutex<T>>`），锁的细节在《并发编程》中展开——本节只需记住：**`Rc` 停留在单线程，`Arc` 才能过线程边界**，编译器会替你把关（`Rc` 不是 `Send`，传进线程直接报错）。

## 6. 循环引用与 Weak<T>：打破"谁也不放手"的死结

引用计数有个天然盲区：两个值互相持有 `Rc` 时，计数永不归零，内存泄漏。典型场景是 P主 与歌姬的互相关注——双方都持有对方的强引用，删掉任何一方，另一方还被对方引用着，谁也释放不了。`Weak` 是"不增加强计数的弱引用"：它观察数据但不阻止释放，使用前必须 `upgrade()` 尝试拿回临时的强引用：

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Producer {
    name: String,
    partner: RefCell<Weak<Singer>>, // 弱引用一侧，打破循环
}

struct Singer {
    name: String,
    partner: RefCell<Option<Rc<Producer>>>, // 强引用一侧
}

fn main() {
    let p = Rc::new(Producer {
        name: String::from("天蓝P"),
        partner: RefCell::new(Weak::new()),
    });
    let s = Rc::new(Singer {
        name: String::from("初霜"),
        partner: RefCell::new(Some(Rc::clone(&p))),
    });
    // P主 弱引用 歌姬：不增加强计数，循环链被打破
    *p.partner.borrow_mut() = Rc::downgrade(&s);

    // 通过 upgrade 临时取回强引用，用完即还
    if let Some(singer) = p.partner.borrow().upgrade() {
        println!("{} 的搭档是 {}", p.name, singer.name);
    }
    println!("歌姬强计数 = {}", Rc::strong_count(&s)); // 1：Weak 不计数
}
```

**解读**：经验法则是**"拥有"用 `Rc`，"知道"用 `Weak`**——歌姬确实拥有对 P主 的合作关系（强引用），P主 只是"知道"自己搭档是谁（弱引用），主从关系一目了然。`upgrade()` 返回 `Option<Rc<T>>`：数据还活着返回 `Some`，已被释放返回 `None`，这个 `Option` 正是弱引用必须面对"数据可能先消失"的诚实表达。树结构中的"子指向父"、缓存中的"回指"都应使用 `Weak`。

## 7. Deref 与 Drop：智能指针的两块基石

`Deref` 让自定义智能指针可以像普通引用一样使用，编译器会做"解引用强制转换"：`&Box<String>` 自动逐层转为 `&String` 再转为 `&str`，函数签名写最通用的 `&str` 即可。`Drop` 则定义了释放行为，离开作用域自动调用，是 RAII（资源获取即初始化）的载体：

```rust
use std::ops::Deref;

// 自定义票务守卫：包一层 String，同时演示 Deref 与 Drop
struct TicketGuard(String);

impl Deref for TicketGuard {
    type Target = String; // 声明"穿透"到的目标类型
    fn deref(&self) -> &String {
        &self.0
    }
}

impl Drop for TicketGuard {
    fn drop(&mut self) {
        // 离开作用域自动执行：模拟检票口回收票据
        println!("票据 {} 已回收", self.0);
    }
}

fn play(seat: &str) {
    println!("正在检票：{seat}");
}

fn main() {
    let t = TicketGuard(String::from("A-07"));
    play(&t); // &TicketGuard 自动解引用为 &str
} // drop 在此自动调用，输出"票据 A-07 已回收"
```

**解读**：`Deref` 是"智能"的来源——外部使用者几乎感觉不到封装的存在；`Drop` 是"安全"的来源——资源释放与作用域绑定，忘不掉也错不了。注意 `Drop` 不能手动调用（会二次释放），需要提前释放用 `drop(value)` 标准库函数。这两块基石也解释了开头的分类：`Box`/`Rc`/`Arc` 的差异不在接口，而在**所有权语义与线程约束**。

## 易错点与最佳实践

1. **以为 `Rc::clone` 是深拷贝**。`Rc::clone` 只加计数，多个"副本"指向同一份数据；需要独立副本时应 `clone` 内部数据（如 `(*rc).clone()`）。用 `strong_count` 验证即可立刻识破。
2. **`RefCell` 双重可变借用 panic**。错误：`let a = cell.borrow_mut(); let b = cell.borrow_mut();` 运行时 panic。修正：让第一个守卫尽早离开作用域（用 `{}` 包住），或先取值再归还借用。
3. **把 `Rc` 传进线程**。错误：`thread::spawn(move || use_rc())` 报错 `Rc cannot be sent between threads`。修正：换 `Arc`；若还需修改，再包 `Mutex`。
4. **双向强引用导致泄漏**。错误：P主 与歌姬互持 `Rc`，两个计数永不归零。修正：从属一方改用 `Weak`，访问前 `upgrade()`。
5. **能用普通所有权就不上智能指针**。最佳实践：先尝试"函数参数借用 + 返回所有权"，解决不了再按需引入 `Box`（递归/大对象）、`Rc`（共享）、`RefCell`（内部可变）；每加一层智能指针，都应有明确的理由。

## 本篇小结

1. 智能指针是拥有数据的结构体，靠 `Deref` 获得"像引用一样用"的手感，靠 `Drop` 获得自动释放。
2. `Box` 独占堆数据：救递归类型、装大对象、做 trait 对象；零开销。
3. `Rc` 单线程共享所有权（计数归零才释放），`Arc` 是它的原子版本；共享的代价是内部不可变。
4. `RefCell` 把借用检查搬到运行期，与 `Rc` 组合成"共享 + 可写"；代价是违规从编译错误变成 panic。
5. `Rc` 循环引用会泄漏，"拥有"用 `Rc`、"知道"用 `Weak`；`upgrade()` 的 `Option` 诚实反映数据的生死。

> **一句话记忆**：几个所有者决定用哪种指针——独占 `Box`、单线程共享 `Rc`、跨线程共享 `Arc`、共享还要写就再包 `RefCell`/`Mutex`；有环必有泄漏，回指一律 `Weak`。

## 动手实践

1. 用 `Box` 实现一棵"演唱会座位树"：每个节点是一个区域名加若干子节点，写函数统计总座位数。思路：`Vec<Box<Node>>` 持有子节点，递归遍历。
2. 用 `Rc<RefCell<HashMap<String, u32>>>` 实现多个粉丝团共享的"应援棒库存"：任意粉丝团借出或归还时修改库存，最后打印总余量。体会共享可变状态的写法与借用守卫的作用域控制。
3. 构造一个 `Rc` 双向好友关系的内存泄漏（两人互持强引用），用 `Rc::strong_count` 观察计数不归零，然后改用 `Weak` 修复，验证数据随最后一个强引用消失。
