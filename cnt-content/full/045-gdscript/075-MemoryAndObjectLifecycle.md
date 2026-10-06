---
order: 80
title: 对象生命周期与内存管理
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: RefCounted 与 Node 两套释放规则、循环引用与 weakref、is_instance_valid 判活、静态缓存的泄漏防线
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：GDScript 对象生命周期与内存管理——引用计数与手动释放的边界、循环引用破环、悬空引用判活、静态缓存的防泄漏设计。
- 解决什么问题：对象什么时候死、谁负责让它死、手里留着的引用还活不活着；游戏长时运行下最常见的内存泄漏与"访问已释放对象"崩溃。
- 什么时候用到：写缓存（尤其 static var 缓存）、对象池、闭包捕获节点引用、给节点连接信号后延迟访问、排查"越玩越卡"与"偶发 Nil 崩溃"。
- 与《类与面向对象》的分工：那篇讲类怎么定义、继承与多态怎么组织；本篇讲对象从生到死的完整账本。本篇是《函数与 Callable》中"lambda 捕获"话题的深水区展开。

## 前置知识

- 《类与面向对象》三种基类的选择（Node/RefCounted/Resource）；
- 《函数与 Callable》lambda 与闭包一节；
- 《信号、await 与协程》信号连接的生命周期。

## 学习目标

- 说清 RefCounted 与 Node 两套释放规则的边界，以及 Resource 为什么不用手动 free；
- 理解循环引用为什么泄漏，会用 weakref() 破环与构建弱引用缓存；
- 会用 is_instance_valid() 判断"引用还活着吗"，并在闭包里先挡再访问；
- 掌握 static var 缓存的两条泄漏防线：weakref 存值、_exit_tree 判等清空。

## 0. 一句话理解

> 引用计数的对象（RefCounted/Resource）"没人用了就自动死"，Node"不死要你亲手杀"（free/queue_free）；所有事故都发生在两者交界处——你手里攥着一个"已经死了"的对象引用，或者两个对象互相攥着谁也死不了。破局三件套：weakref 破环、is_instance_valid 判活、静态缓存只存弱引用。

## 1. 两套释放规则：RefCounted 与 Node

引擎对象的内存分两套规则：

- **RefCounted（引用计数类）及其子类（包括 Resource）**：引用计数管理，最后一个引用消失时自动释放，不需要手动 free；
- **Node**：不会自动释放，必须手动调用 free()（立即删除）或 queue_free()（推迟到帧末删除，并递归删除所有子节点，更安全）。

```gdscript
var data := RefCounted.new()      # 计数 1
var alias := data                 # 计数 2
alias = null                      # 计数 1
data = null                       # 计数 0 -> 自动释放，此后 data 悬空

var enemy := Enemy.new()          # Node 子类：计数不管理生死
add_child(enemy)                  # 进树
enemy.queue_free()                # 必须显式杀：帧末删除并递归删子节点
```

**讲解：**

1. **变量赋值不复制对象**，只复制引用——`alias = data` 后两个变量指向同一个对象，这也是"改了 alias 的属性，data 也跟着变"的原因。引用计数数的正是"引用的数量"，不是"变量的数量之外的东西"。
2. queue_free 优先于 free：free 立即销毁，若此刻还有信号回调、await 或同帧其他代码要访问它，直接崩溃；queue_free 推迟到帧末，给本帧内其他访问者留了活口。经验法则：游戏逻辑里一律 queue_free，只有在工具脚本、无场景树环境下才考虑 free。
3. Resource（贴图、场景、.tres 数据）是 RefCounted 子类，全自动管理——**但引擎内部还有资源缓存**（同路径的 Resource 默认共享同一份实例），所以"资源不泄漏"不代表"资源可以无限加载"，缓存会替你留住它们。
4. 易错点：Node 被 `remove_child` 后不销毁，只是离开场景树——它还活着，引用计数不适用，没人 free 它就一直占着内存。"从树上摘下来"和"销毁"是两件事。

## 2. 循环引用与 weakref 破环

引用计数有一个著名的漏洞：**循环引用**。两个 RefCounted 对象互相持有引用时，外部再也没人引用它们了，但两者的计数都停在 1，永远无法归零——内存泄漏。

```gdscript
# 泄漏现场
class Parent:
    var child
class Child:
    var parent          # 互相引用：环

var p = Parent.new()    # p 计数 1
var c = Child.new()     # c 计数 1
p.child = c             # c 计数 2
c.parent = p            # p 计数 2
p = null                # p 计数 1（c.parent 还攥着）
c = null                # c 计数 1（p.child 还攥着）
# 两个对象都再也访问不到了，但谁都死不了
```

官方提供的破环工具是 weakref() 弱引用——**弱引用不增加引用计数**：

```gdscript
var my_file_ref = weakref(my_file)     # 弱引用：不影响引用计数
var file_ref = my_file_ref.get_ref()   # 对象还活着则取回引用；已释放则得 null
if file_ref:
    file_ref.close()
```

**讲解：**

1. 破环的思路是"环里至少留一个弱引用"：parent 持 child 用强引用（parent 活着 child 就该活着），child 回指 parent 用弱引用（孩子死了不影响爹，爹死了孩子能查出来）。
2. `get_ref()` 返回的是强引用——取出的那一刻计数加一，用完即释放，所以"取出后立刻用"的窗口是安全的；先取出存很久，等于又造了个强引用。
3. 什么时候要警惕环：回调解注册器（对象把自己注册进全局管理器）、观察者列表、父子互指的数据结构。写这类代码时问一句"谁持有谁"——环不一定是 bug，但环里的每个成员都必须有明确的死亡路径。

## 3. is_instance_valid：判断"引用还活着吗"

手里留着已被释放的 Node 引用（变量还在，对象已亡）再访问，就是运行时崩溃"Previously freed instance"。

```gdscript
if is_instance_valid(enemy):
    enemy.queue_free()
```

**讲解：**

1. 三种"活着"要分清：变量非 null（引用还在）、对象未释放（is_instance_valid）、对象在场景树内（is_inside_tree）。最严的坑是三者不一致：queue_free 过的节点在帧末才死，这一帧内 is_instance_valid 仍为 true——"判活通过但下一行还是崩了"多发生在跨帧时序上，必要时配合 `if not enemy.is_queued_for_deletion()`。
2. 弱引用与判活是两个问题：weakref 防的是"我不该攥着别人"，is_instance_valid 防"我攥着的人可能先死"。缓存场景两个都要用（见第 4 节）。

## 4. static var 缓存的泄漏防线

静态成员属于类而非实例，天然适合做缓存——但 static var 的生命周期是**整个进程**，存进去的强引用会让对象永远死不掉。真实项目 speed-rouge 里有两套标准防线。

**防线一：静态工具类 + 幂等缓存（数据不可变时）。** `tile_atlas.gd` 是全静态的 utility 类（class_name + 静态函数），缓存的是从图集推导的 `PackedInt32Array`——纯值类型，不引用任何 Node：

```gdscript
# tile_atlas.gd（节选，34-48 行形态）
static var _variants: PackedInt32Array = []   # 47 变体代表集，推导一次终身使用

static func variants() -> PackedInt32Array:
    if _variants.is_empty():
        _variants = _derive_variants()        # 首次调用推导并缓存
    return _variants
```

它安全的原因：缓存值是值类型数组，不持有任何场景对象——**静态缓存存值不存对象**，泄漏就无从谈起。

**防线二：weakref 缓存 + 判活弃缓存（必须缓存对象时）。** `terrain_kit.gd` 需要按列缓存 TileMapLayer 的索引，层本身是 Node、会被销毁，所以缓存值用弱引用包一层：

```gdscript
# terrain_kit.gd（节选，12-13 行形态）
static var _col_cache := {}          # { layer_instance_id: weakref(layer) -> 列索引 }

static func columns_for(layer: TileMapLayer) -> Dictionary:
    var entry = _col_cache.get(layer.get_instance_id())
    if entry != null:
        var layer_ref: TileMapLayer = entry.get_ref()   # 判活：层还活着吗
        if layer_ref != null:
            return entry["cols"]
        _col_cache.erase(layer.get_instance_id())       # 层已释放：弃缓存
    var cols := _build_columns(layer)
    _col_cache[layer.get_instance_id()] = {
        "ref": weakref(layer), "cols": cols,
    }
    return cols
```

键与值双保险：键是 `get_instance_id()`（纯 int，不持对象），值里 layer 只以 weakref 出现——层被 queue_free 后引用计数照常归零，下次查询 `get_ref()` 得 null，缓存条目被丢弃。**static var 缓存的泄漏防线一句话：键用 id 或弱引用可取回的形态，值用 weakref，查询时判活并清理。**

第三条常见写法是 **autoload 的静态句柄在 _exit_tree 判等清空**：save_manager.gd 的模式——`_init` 里把实例赋给静态变量 I，`_exit_tree` 里 `if I == self: I = null` 判等再清——判等是防"新实例已经顶上、旧实例退出时把新句柄抹掉"的时序事故。静态句柄从"永不清理"改成"退出时自证清空"，进程内反复进出场景（重启对局、回主菜单）就不会悬挂旧实例。

## 5. 闭包捕获 freed：lambda 的头号坑

lambda 会捕获外部变量（闭包）。捕获的是**引用**——如果捕获的节点先于 lambda 死亡，lambda 一执行就是"访问已释放对象"。speed-rouge 的 adaptive.gd 留了实录（66-70 行形态，注释原话「捕获变 null 须先挡」）：

```gdscript
# 反例：闭包捕获的 card 可能先死
card.tree_exited.connect(func():
    cards.erase(card)          # card 已 freed -> 这里崩
)

# 正解：执行时先判活
card.tree_exited.connect(func():
    if not is_instance_valid(card):
        return                  # 捕获的对象先亡：直接让路
    cards.erase(card)
)
```

**讲解：**

1. 这个坑与信号自动断连的规则纠缠：信号连接随发送方销毁而断开，但 lambda 挂在 card 自己身上时，**接收方是 card 自己**，发射时对象已死，判活是唯一防线。
2. CHANGELOG 实录：focus_check 功能曾实证"freed 捕获踩空"崩溃，修复就是捕获变量统一 `is_instance_valid` 先挡。判断准则：**lambda 里只要出现"捕获的 Node/对象引用"，第一行先判活**，把它写成肌肉记忆。
3. 与《函数与 Callable》的衔接：那边讲"lambda 捕获的是引用不是快照"；这边补上代价——引用有生命周期，捕获即承诺"使用前验活"。

## 6. 真实场景三则

**场景一：弱引用列缓存（真实工程 terrain_kit.gd）。** 横版竞速关卡的地形查询需要"按列桶索引"加速：查询从"逐层全格扫描"优化为"按列直取"。索引缓存挂在静态字典里，而 TileMapLayer 会被关卡切换销毁——若缓存强引用，切 100 关就泄漏 100 个层的全部瓦片数据。weakref 缓存 + 判活弃缓存的组合让层死则缓存自动蒸发。配套的还有脏标记：层内容变更置脏、帧末一次性重建（process_frame + CONNECT_ONE_SHOT），缓存的有效性管理同样属于生命周期设计。

**场景二：闭包捕获 freed 崩溃（真实工程 adaptive.gd）。** 自适应 UI 的卡片超窗收缩用 Tween 回调处理迟到布局，回调 lambda 捕获了 card。玩家快速退出界面时 card 先死、Tween 的回调晚到——`Previously freed instance` 崩溃报告。修复即第 5 节的先挡写法；CHANGELOG 里这次修复的教训被固化为团队规范：**凡 lambda 捕获节点，首行判活**。

**场景三：静态工具类缓存（真实工程 tile_atlas.gd）。** 47 变体图集的"邻域掩码到代表瓦片"推导要扫 256 种邻域编码，属于一次推导终身受益的计算。实现成全静态 utility 类：static var 存推导结果（PackedInt32Array 值类型），静态函数幂等推导。它与第 4 节防线二的差别是判断题：**缓存的东西是值（安全直存）还是对象（必须 weakref）**——两套防线选哪套，先回答这一句。

## 7. 动手实践

**任务一：亲手造一个循环引用泄漏。** 用第 2 节的 Parent/Child 代码跑一个场景，打开编辑器监视器（Debugger -> Monitors）观察对象数与内存曲线；然后把 Child.parent 改成 weakref 修复，再观察曲线。提示：循环里多创建几万个对象才能在监视器上看出明显增长，写个循环批量制造。

**任务二：给静态缓存装上泄漏防线。** 写一个 `LevelIndex` 类：static var 字典缓存传入 Node 的索引数据；先实现强引用版本，用"反复创建销毁 1000 个层"验证泄漏；再改成 weakref + 判活弃缓存版本复测。提示：判活要用 `get_ref()` 返回值而不是字典键的存在性——键是 int，它不会死，死的是它指向的对象。

**任务三：修一个必崩的闭包。** 写一个按钮点击后 `await get_tree().create_timer(2.0).timeout` 再访问自身的 lambda，点击后立刻 free 按钮所在的场景，观察崩溃；用 is_instance_valid 先挡修复。提示：await 挂起期间场景树可能整个换掉，这就是"捕获变 null 须先挡"的典型现场；修复后思考另一个方案——改用 `tree_exiting` 信号取消回调是否更干净。

先自己操作，再对照参考实现：

<details>
<summary>任务二参考实现</summary>

```gdscript
class_name LevelIndex
## 静态缓存：值用弱引用，键用实例 id（int 不持对象）

static var _cache := {}   # { instance_id: { "ref": weakref, "data": Dictionary } }

static func index_for(node: Node2D) -> Dictionary:
    var id := node.get_instance_id()
    var entry = _cache.get(id)
    if entry != null:
        var alive = entry["ref"].get_ref()
        if alive != null:
            return entry["data"]          # 命中且活着
        _cache.erase(id)                  # 已释放：清掉再重建
    var data := _build_index(node)
    _cache[id] = { "ref": weakref(node), "data": data }
    return data

static func _build_index(node: Node2D) -> Dictionary:
    # 示例：按 x 坐标分桶
    var buckets := {}
    for child in node.get_children():
        var key := int(child.position.x / 256.0)
        if not buckets.has(key):
            buckets[key] = []
        buckets[key].append(child)
    return buckets
```

要点：a) 强引用版复测时会看到内存随轮次线性上涨——这就是泄漏的量化证据；b) weakref 版层被 queue_free 后引用计数照常归零，`get_ref()` 得 null 走弃缓存分支；c) 若业务还要求"层还活着但内容变了缓存要失效"，那是另一层问题（脏标记/版本号），与泄漏防线叠加使用。
</details>

## 8. 小结

- RefCounted/Resource 引用计数自动释放；Node 必须手动 free()/queue_free()；remove_child 不等于销毁；资源有引擎级缓存，不泄漏不等于可无限加载。
- 循环引用让计数永不归零；weakref() 弱引用不增计数，`get_ref()` 活则取回、死则 null；环里至少留一个弱引用。
- is_instance_valid 判断对象是否已释放；与"非 null"、"在树内"是三件事；queue_free 延迟生效，跨帧时序要配 is_queued_for_deletion。
- static var 缓存两套防线：缓存值类型直存（tile_atlas 形态）；缓存对象用 weakref + 判活弃缓存（terrain_kit 形态）；静态句柄用 _exit_tree 判等清空防悬挂。
- lambda 捕获的是引用，捕获对象可能先死——闭包内第一行 is_instance_valid 先挡。

## 参考链接

- [GDScript 基础（官方文档，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [Godot 官方文档：使用 SceneTree（对象生命周期，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/scripting/scene_tree.html)
- speed-rouge 项目素材：scripts/world/terrain_kit.gd、scripts/data/tile_atlas.gd、scripts/ui/adaptive.gd（本项目素材库实录）
