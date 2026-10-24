---
order: 160
title: 存档与持久化
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 FileAccess 与 JSON/ConfigFile 把数据写进硬盘，设计版本迁移与原子写，让存档在损坏时也能自愈
author: fanquanpp
updated: '2026-10-07'
related: ['godot/055-AutoloadAndSceneManagement', 'godot/060-InputEventsAndActions']
prerequisites: ['godot/055-AutoloadAndSceneManagement']
---

## 知识点地图

- **知识类别**：存档与持久化——游戏数据落盘，属"数据工程"类知识，官方文档 Saving games 教程只覆盖了其中最薄的一层。
- **解决什么问题**：游戏重启后进度还在（进持久化文件而不是内存）；存档文件随版本演进不能作废（版本迁移）；写存档写到一半断电不能把旧档毁掉（原子写）；文件损坏时玩家还能玩（降级读与自愈）。
- **什么时候用到**：任何"关掉游戏再打开，状态要回来"的需求——主线进度、设置项、改键配置、最高分、离线收益结算。060 篇埋过的伏笔在这里兑现：InputMap 的运行时改键不持久化，想保存玩家的键位配置必须自己写存档。

## 学习目标

- 在 user:// 与 res:// 之间做出正确选择，说出为什么存档绝不能写进 res://
- 掌握三条持久化路线（FileAccess + JSON、FileAccess + 二进制 store_var、ConfigFile）的分工
- 用 SAVE_VERSION 设计梯式迁移：新增键走缺省值，改结构才写迁移代码
- 实现 .tmp + rename 原子写与"损坏留证 + 降级读"的容错链

## 1. 两条根路径：res:// 是只读的，user:// 才归玩家

第一个要钉死的规则：**存档写 user://，永远不要写 res://**。

- res:// 是项目的资源根目录。从项目文件夹直接运行时它可写，但导出后它变成 PCK 包内部，对玩家机器是只读的——写进去要么报错要么静默丢失。
- user:// 映射到操作系统给应用分配的专属目录（Windows 下约在 `%APPDATA%/Godot/app_userdata/<项目名>/`，各平台位置见官方文档 Data paths 一节）。它随项目走、随卸载清理、不需要任何权限申请。

打印实际路径验证一下：

```gdscript
print(ProjectSettings.globalize_path("user://"))
```

真实工程里这同时也是反作弊的第一道门：user:// 下的文件玩家可以直接打开手改。挡不住执意作弊的人，但 JSON 明文至少要配合后面讲的迁移校验，别让改一个数字就跳到最终关。

## 2. 三条持久化路线

Godot 没有强制的存档格式，三条路线各有分工：

| 路线 | 写法 | 适合 | 不适合 |
| --- | --- | --- | --- |
| FileAccess + JSON | store_line(JSON.stringify(data)) | 完整存档、需要跨工具查看调试 | 大量数值数据（文本体积大、解析慢） |
| FileAccess + store_var | store_var(data) / get_var() | 二进制快照、性能敏感的批量数据 | 需要人类可读、需要跨引擎版本安全（格式与引擎版本相关） |
| ConfigFile | set_value(section, key, value) | 设置项（音量、分辨率、键位）——天然的节-键结构 | 复杂嵌套结构（它只存一层的节-键值） |

判断口诀：**完整进度用 JSON，纯设置用 ConfigFile，热数据用 store_var**。多数游戏前两条就够。

官方 Saving games 教程的 JSON 路线骨架：

```gdscript
const SAVE_PATH := "user://save.json"

func save_game(data: Dictionary) -> void:
    var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if file == null:
        push_error("存档打开失败：%s" % error_string(FileAccess.get_open_error()))
        return
    file.store_line(JSON.stringify(data, "\t"))   # 带缩进，diff 与手查都友好
    # FileAccess 超出作用域自动关闭，无需显式 close

func load_game() -> Dictionary:
    if not FileAccess.file_exists(SAVE_PATH):
        return {}                                  # 首次启动：空字典即"新游戏"
    var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
    if file == null:
        return {}
    var parsed = JSON.parse_string(file.get_as_text())
    if parsed is Dictionary:
        return parsed
    return {}                                      # 解析失败按空档处理，见第 4 节的容错
```

逐行说清为什么：`FileAccess.WRITE` 打开即截断旧文件——这就是"写一半断电毁档"的根源，第 4 节修它；`FileAccess` 是引用计数的资源，变量离开作用域自动关文件，官方文档明确说不需要 close()；`JSON.parse_string` 失败返回 null 而不是抛异常，所以必须判类型再收。

一个真实坑：JSON 解析出来的整数可能变成浮点数（`1` 读回来是 `1.0`）。用的时候统一 `int(data["level"])` 转换，或者存档时把关键数值包一层显式 int()。

## 3. ConfigFile：设置项的正解

设置项（音量、键位、窗口模式）的结构天然是"节-键"，ConfigFile 直接对上：

```gdscript
const SETTINGS_PATH := "user://settings.cfg"

func save_settings(settings: Dictionary) -> void:
    var cfg := ConfigFile.new()
    cfg.set_value("audio", "master_volume", settings["master_volume"])
    cfg.set_value("audio", "music_volume", settings["music_volume"])
    cfg.set_value("video", "fullscreen", settings["fullscreen"])
    for action in settings["keybinds"]:            # 060 篇伏笔在此兑现：
        cfg.set_value("keybinds", action,          # InputMap 运行时改键不持久化，
            settings["keybinds"][action])          # 想保存就必须自己写这段
    cfg.save(SETTINGS_PATH)

func load_settings() -> Dictionary:
    var cfg := ConfigFile.new()
    if cfg.load(SETTINGS_PATH) != OK:
        return default_settings()                  # 没有档：返回出厂默认
    return {
        "master_volume": cfg.get_value("audio", "master_volume", 1.0),   # 第三个参数是缺省值
        "music_volume": cfg.get_value("audio", "music_volume", 0.8),
        "fullscreen": cfg.get_value("video", "fullscreen", false),
        "keybinds": read_keybinds(cfg),
    }
```

注意 `get_value` 的第三个参数：缺省值本身就是"版本迁移的最轻形态"——新版本新增设置项后，旧文件没有这个键，读出来就是缺省值，**不需要写任何迁移代码**。这个思想下一节放大成完整方案。

## 4. 版本迁移：SAVE_VERSION 与梯式结构

存档会活过很多个版本：v2 加了新玩法要存新数据，v5 改了统计表结构，v8 重命名了键。没有版本号的存档在升级当天集体作废，玩家的进度一夜清零——这是商业事故级 bug。

方案是一个常量加一个梯式函数。几何构成（speed-rouge）项目的 save_manager.gd 就是按这个结构维护到第 11 版的（SAVE_VERSION = 11），教学版骨架如下：

```gdscript
const SAVE_VERSION := 11

func load_and_migrate() -> Dictionary:
    var data := _read_raw()
    var from_version: int = int(data.get("version", 1))   # 老档没有 version 键，视作 1
    if from_version < SAVE_VERSION:
        data = _migrate(data, from_version)
    return data

func _migrate(data: Dictionary, from_version: int) -> Dictionary:
    if from_version < 8:                                  # v8：统计表改名，结构变了，必须搬
        data["attempts"] = data.get("runs", {})
        data.erase("runs")
    if from_version < 9:                                  # v9：五张统计表统一重映射
        for table in ["deaths", "clears", "deaths_by", "clears_by", "playtime"]:
            if data.has(table):
                _remap_keys(data, table)
    if from_version < 10:
        data.erase("debug_flags")                         # v10：删掉废弃键
    if from_version < 11:
        data["tutorials_seen"] = {}                       # v11：纯新增键，零重排
        # 新增键也可以不写迁移：读档时 data.get("tutorials_seen", {}) 兜底即可
    data["version"] = SAVE_VERSION
    return data
```

迁移的宪法就一条，几何构成把这句话写在了 v11 的注释里：**新增键走缺省值、改结构才写迁移**。

- 纯新增（v11）：不写迁移分支。读档处用 `data.get("tutorials_seen", {})` 给缺省值，旧档天然兼容。
- 改结构（v8、v9）：写迁移。用 `if from_version < N` 梯式排布，一个版本一个关卡，旧档逐级爬梯子爬到当前版——v7 的档会依次执行 8、9、10、11 四个分支，v10 的档只执行最后一个。为什么用 `from_version < N` 而不是 `== N`：`==` 只能处理恰好隔一个版本的档，`<` 让任意远古版本都能一次爬完。
- 删除键（v10）：迁移里 erase，同时读档处配合 `data.get(key, default)`，两边都不炸。

配套纪律：迁移函数写完后，旧档样本要留下来当回归测试用例——每次 SAVE_VERSION 递增，把上一版真实存档跑一遍新迁移，输出符合预期才发版。

## 5. 原子写与损坏自愈：三层容错链

第 2 节留了一个雷：`FileAccess.WRITE` 打开即清空旧文件。玩家按下保存的瞬间断电、崩溃、杀进程，旧档没了、新档没写完——档彻底报废。解决方案是把"写"与"替换"拆成两步：

```gdscript
func save_atomically(data: Dictionary) -> void:
    var tmp_path := SAVE_PATH + ".tmp"
    var file := FileAccess.open(tmp_path, FileAccess.WRITE)
    if file == null:
        push_error("临时档打开失败")
        return
    file.store_line(JSON.stringify(data, "\t"))
    # file 离开作用域自动关闭，内容落盘完成后才允许替换
    var dir := DirAccess.open("user://")
    if dir.rename(SAVE_PATH + ".tmp", SAVE_PATH) != OK:
        push_error("存档替换失败")
```

原理：`.tmp` 文件写坏就写坏了，正式档动都没动；`rename` 在同文件系统内是近乎原子的操作——改名瞬间完成，不存在"一半旧一半新"的中间态。几何构成按这个模式写 `.tmp` 再 `dir.rename` 原子替换。

光有原子写还不够——文件系统本身可能损坏、磁盘可能坏块、玩家可能用手改档改坏 JSON。读档失败时正确反应不是"弹个错误回家"，而是几何构成的三层容错链：

```gdscript
func _read_raw() -> Dictionary:
    if not FileAccess.file_exists(SAVE_PATH):
        return _read_raw(LEGACY_PATH)              # 第 1 层：新档不存在，降级读旧路径
    var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
    var parsed = JSON.parse_string(file.get_as_text()) if file else null
    if parsed is Dictionary and int(parsed.get("version", 1)) <= SAVE_VERSION:
        return parsed
    if FileAccess.file_exists(SAVE_PATH):
        var stamp := Time.get_datetime_string_from_system().replace(":", "").replace("-", "").replace(" ", "")
        DirAccess.rename_absolute(SAVE_PATH, "%s.corrupt-%s" % [SAVE_PATH, stamp])  # 第 2 层：损坏档改名留证
        push_warning("存档损坏，已留证为 %s.corrupt-%s，尝试降级读" % [SAVE_PATH, stamp])
        return _read_raw(LEGACY_PATH)              # 第 3 层：降级读旧档路径
    return {}
```

三层各管一种事故：新档缺席读旧路径（版本升级换路径的兼容）；读出来不是合法字典就**先改名留证再降级**——留证的意义是玩家找客服时证据还在，客服能手工恢复，直接删掉就永久失去这批数据；降级再失败返回空字典，游戏以"新游戏"起步而不是崩溃。时间戳后缀（.corrupt-20261006123000）保证多次损坏不会互相覆盖。

这套三层链在真实项目里被验证过：几何构成的 save_manager.gd 按同样的顺序组织读档流程，配合第 4 节的版本梯，至今没有清档事故记录。

## 6. 对照案例：C# 项目的 JSON 落盘与 AOT 警示

花语花园（flower-card）是 C# 项目，它没有用 FileAccess，而是走 .NET 生态的 System.Text.Json：

```csharp
// Scripts/Core/SaveManager.cs（节选，教学化重写）
public static void SaveNow(SaveData data)
{
    var options = new JsonSerializerOptions { WriteIndented = false };  // 单行落盘，体积最小
    File.WriteAllText(SavePath, JsonSerializer.Serialize(data, options));
}
```

值得搬进所有 C# Godot 项目的是它注释里的警告：**导出到 iOS/Android（AOT 编译）时，反射式序列化需要改为源生成器（JsonSerializerContext）或改用 Godot.Json**——AOT 平台不允许运行时生成序列化代码，反射版在桌面跑得好好的，上手机直接抛异常。这是"桌面测试全绿、移动端上线才炸"的典型案例，写 C# 存档时第一天就要选对路线。

它还有一处数据分层设计值得记：StartNewGame 重开新一轮时保留 Profile（碎片、图鉴、节点是肉鸽 meta 数据，不随轮清空），只清空本轮进度——存档结构设计的第一步不是"存什么"，而是**哪些数据属于哪个生命周期**（轮内/永久/会话），分层错了后面全是迁移噩梦。

## 7. 动手实践

练习一（给 080 篇的跳跃游戏加存档）。任务：记录最高分与累计金币，要求：JSON 路线、带 SAVE_VERSION、退出重进数据还在。提示：在游戏结束处调 save，主菜单 _ready 处调 load；分数用 int() 包一层防 JSON 浮点坑。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
# save_data.gd：Autoload 单例（055 篇）负责统一读写
extends Node

const PATH := "user://save.json"
const SAVE_VERSION := 2

var best_score := 0
var total_coins := 0

func save() -> void:
    var file := FileAccess.open(PATH + ".tmp", FileAccess.WRITE)
    if file == null:
        return
    file.store_line(JSON.stringify({"version": SAVE_VERSION, "best_score": best_score, "total_coins": total_coins}))
    DirAccess.open("user://").rename(PATH + ".tmp", PATH)

func load_or_default() -> void:
    if not FileAccess.file_exists(PATH):
        return
    var file := FileAccess.open(PATH, FileAccess.READ)
    var parsed = JSON.parse_string(file.get_as_text()) if file else null
    if parsed is Dictionary:
        best_score = int(parsed.get("best_score", 0))     # get + int：缺省值与类型转换一次到位
        total_coins = int(parsed.get("total_coins", 0))
```

对照要点：读写都走 Autoload，场景脚本只调 save_data.save()，不关心文件细节——存档逻辑散在各场景是后期迁移的最大阻力；`int(...)` 与 `get(key, default)` 组合同时处理了浮点坑与新增键兼容。

</details>

练习二（亲手制造一次损坏并观察自愈）。任务：在练习一基础上实现损坏留证：运行时手动把 save.json 改成非法文本（比如用记事本删一半），再启动游戏——验证游戏不崩溃、生成 .corrupt-时间戳文件、以缺省值继续。提示：核心判断是 `parsed is Dictionary` 不成立时走改名分支；改名用 DirAccess.rename_absolute。

练习三（升级版本做一次真迁移）。任务：给练习一的存档加第 3 版：把 `total_coins` 拆成 `coins_earned` 与 `coins_spent` 两键（结构变更，必须写迁移），并新增 `playtime` 键（纯新增，走缺省值）。自检标准：先存一份 v2 档，再运行 v3 代码——旧档升级后 coins_earned 应等于原 total_coins、coins_spent 为 0、playtime 走缺省值。提示：迁移分支用 `if from_version < 3`；写完把 v2 档样本留成测试用例。

## 小结

res:// 只读、user:// 归玩家，存档只进 user://。三条路线按结构选：完整进度用 FileAccess + JSON（注意整数浮点坑），纯设置用 ConfigFile（get_value 缺省值就是最轻的迁移），热数据用 store_var（格式绑定引擎版本）。版本迁移的宪法是"新增键走缺省值、改结构才写迁移"，梯式 `if from_version < N` 让任意老档一次爬到最新。原子写用 .tmp + rename 两步走，损坏自愈按"降级读、留证改名、再降级"三层组织——留证比删除珍贵，那是玩家唯一能找回数据的机会。C# 项目避开反射式 JSON 上 AOT 平台的坑，存档设计的第一步是给数据分生命周期层。

## 参考链接

- [Saving games 官方教程](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html)
- [FileAccess 类文档](https://docs.godotengine.org/en/stable/classes/class_fileaccess.html)
- [ConfigFile 类文档](https://docs.godotengine.org/en/stable/classes/class_configfile.html)
- [数据路径（Data paths）](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html)
- 动作游戏几何构成 speed-rouge（save_manager.gd 三层容错与版本梯出处）：https://github.com/fanquanpp/geometric-construct
