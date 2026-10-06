---
order: 140
title: 文件 IO 与数据持久化
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: FileAccess 与 DirAccess 的读写语义、ConfigFile 与 JSON 选型、user:// 与 res:// 之别
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：GDScript 的文件 IO 与数据持久化机制——FileAccess/DirAccess API、ConfigFile 与 JSON 两种载体、路径根（user:// 与 res://）的语义。
- 解决什么问题：脚本怎么读写文件、存什么格式、存到哪里；语言层 IO API 的每个函数语义与错误处理。
- 什么时候用到：导出关卡数据为 JSON、读写设置项、批量处理文本数据、任何需要落盘的脚本工具。
- **与 044-godot《存档系统与持久化》的分工声明（重叠切割）**：本篇定位**语言 IO 机制**——FileAccess/DirAccess/ConfigFile/JSON 的 API 语义、读写模式、错误码、路径根规则；**存档设计模式**——SAVE_VERSION 版本梯迁移、先写 .tmp 再 rename 的原子替换、损坏自愈三层容错链——让位给 044-125《SaveSystemAndPersistence》（已落地，其 §4/§5 即这两个主题），本篇只做一处提要并互链。两篇素材同源（speed-rouge 的 save_manager.gd），但 044-125 讲"存档系统怎么设计"，本篇讲"IO API 本身怎么用"，逐节不重复。

## 前置知识

- 《类与面向对象》的基类选择（FileAccess 是 RefCounted）；
- 《集合：数组与字典》（060 篇）——JSON 与 ConfigFile 的数据载体就是数组与字典。

## 学习目标

- 会用 FileAccess.open 的四种模式读写文本与二进制，会用返回 null + FileAccess.get_open_error() 的错误处理范式；
- 会用 DirAccess 列目录、建目录、改名与删除，理解 user:// 与 res:// 的读写边界；
- 能在 ConfigFile 与 JSON 之间按数据形态选型；
- 知道原子替换与版本迁移的存在位置（提要），需要时进 044-125 看完整设计。

## 1. 两条根路径：user:// 归玩家，res:// 大多只读

```gdscript
var user_path := "user://settings.cfg"     # user:// -> 用户的可写数据目录
var res_path  := "res://data/levels.json"  # res:// -> 项目/导出包内部
```

**讲解：**

1. `user://` 映射到操作系统级用户目录（Windows 在 %APPDATA%/Godot/app_userdata/项目名/），**永远可写**——玩家数据、设置、生成产物的家。`res://` 是工程目录（编辑器内）或 PCK 包内部（导出后），**导出后只读**。
2. 判断准则一句话：**导出后玩家要写的东西进 user://，随游戏分发的资源放 res://**。把可写数据写进 res:// 在编辑器里"能跑"，导出后直接失败——这是新手最经典的"本机好好的、玩家那边崩"。
3. 枚举用户目录内容用 DirAccess；判断文件存在用 `FileAccess.file_exists(path)`（静态方法，不打开文件）。

## 2. FileAccess：读写文件的四步范式

```gdscript
# 写文本
var f := FileAccess.open("user://export/level_1.json", FileAccess.WRITE)
if f == null:
    push_error("打开失败：%d" % FileAccess.get_open_error())
    return
f.store_string(JSON.stringify(level_data, "\t"))
f.close()   # RefCounted 会自动释放，但显式 close 确保缓冲刷盘时机可控

# 读文本
var r := FileAccess.open("user://export/level_1.json", FileAccess.READ)
if r == null:
    push_error("读取失败：%d" % FileAccess.get_open_error())
    return
var text := r.get_as_text()
```

**讲解：**

1. `open` 失败不抛异常，**返回 null**，错误码在静态的 `FileAccess.get_open_error()` 里（ERR_FILE_NOT_FOUND、ERR_FILE_CANT_WRITE 等）——判 null 是每一处 IO 的固定开头，漏判就是"读了个空对象"的运行时崩溃。
2. 四种模式按需选：WRITE（覆盖写）、READ、READ_WRITE、WRITE_READ（覆盖且可回读）。追加写没有直接模式——先读全文、改、覆盖写，或用 store_ 到末尾的定位（小文件场景直接覆盖写最简单）。
3. 二进制族：`store_32/store_float/store_var`（store_var 存任意 Variant，带类型标签）与 `get_32/get_float/get_var` 成对使用。**store_var 方便但绑死 GDScript**——数据要跨语言（C# 端）或跨工具读时，用定长编码（store_32）或 JSON/文本格式。PackedByteArray 手写二进制布局的完整案例（encode_u16/encode_s16 位编码）在 speed-rouge 的 tile_atlas.gd，属序列化专题，这里知道入口即可。
4. 易错点：`get_line()` 逐行读时最后一行可能不带换行符，`eof_reached()` 与 `get_position()` 组合判断比行数假设可靠；读大文件别一次 `get_as_text()`（整个文件进内存），逐行流式处理。

## 3. DirAccess：目录操作与改名

```gdscript
var dir := DirAccess.open("user://")
if dir == null:
    push_error("user:// 不可访问")
    return

dir.make_dir_recursive("export/levels")    # 递归建目录（已存在不报错）
dir.rename("export/levels/tmp.json", "export/levels/level_1.json")  # 改名即"移动"
dir.remove("export/levels/old.json")       # 删除文件（目录要空）

dir.list_dir_begin()
var name := dir.get_next()
while name != "":
    if not dir.current_is_dir():
        print(name)                          # 逐项列出文件
    name = dir.get_next()
dir.list_dir_end()
```

**讲解：**

1. `DirAccess.open` 与 FileAccess 同款错误范式：null 判断先行。
2. `rename` 就是移动（跨目录也可）；"先写临时文件再 rename 替换正式文件"的**原子写模式**由它承载——为什么这能防"写一半断电"，完整机制与三层容错链在 044-125 §5，此处只需要知道 rename 是那个模式的地基操作。
3. 遍历目录的三件套（list_dir_begin/get_next/list_dir_end）记得 `current_is_dir()` 分流——`.` 与 `..` 也会出现在 get_next 结果里，按需跳过。
4. 绝对路径操作用静态 `DirAccess.rename_absolute` 等方法；工具脚本处理项目外路径（如导出目录）时用。

## 4. ConfigFile 与 JSON：两种载体选型

```gdscript
# ConfigFile：分节键值，适合"设置项"
var cfg := ConfigFile.new()
cfg.load("user://settings.cfg")                       # 文件不存在返回错误码，不致命
cfg.set_value("audio", "volume", 0.8)
cfg.set_value("video", "fullscreen", true)
cfg.save("user://settings.cfg")

var volume: float = cfg.get_value("audio", "volume", 0.5)   # 第三个参数是缺省值
```

```gdscript
# JSON：层级数据，适合"结构化文档/数据交换"
var data: Variant = JSON.parse_string(text)
if data == null:
    push_error("JSON 解析失败")          # parse_string 失败返回 null
var text_out := JSON.stringify(data, "\t")   # 第二参数是缩进串
```

**讲解：**

1. 选型判断：**扁平的、按节组织的、要缺省值的 -> ConfigFile**（设置、键位映射）；**层级深的、要跨语言/跨工具交换的、结构会演化的 -> JSON**（关卡数据、导出文档、与外部工具通信）。两者都能存数组与字典，差别在组织形态与读写的方便程度。
2. ConfigFile.load 的返回值是 Error 码：`ERR_FILE_NOT_FOUND` 时按"首次运行"处理（全部用缺省值），这是设置文件的标准冷启动语义——不要把"没有设置文件"当错误弹窗。
3. JSON 的易错点：`parse_string` 失败返回 null 而不是抛错，判 null 才能继续；JSON 只有 string/number/bool/null/array/object——**GDScript 的 Vector2、Color 存进 JSON 会失败或变形**，复杂类型先手工转数组/字典（如 `[x, y]`）。整数与浮点在 JSON 往返后可能变型，读回后按需显式转型。
4. 数据量与可读性：JSON.stringify 带缩进参数生成人类可读文本，便于手工检查与 diff；正式发布的数据可以用无缩进紧凑态省体积。

## 5. 存档设计模式提要（详见 044-125）

语言层 IO 之上，存档系统还有三个设计主题，本篇只立路标：

- **版本梯迁移**：SAVE_VERSION 常量 + 逐级 if 迁移函数，旧档逐版本爬梯到当前结构——044-125 §4；
- **原子替换**：写 `.tmp` 再 rename 覆盖正式文件，杜绝"写一半断电留半个档"——044-125 §5；
- **损坏自愈**：读档失败时把坏档改名留证（.corrupt-时间戳）再降级读备份——044-125 §5。

这三个模式全部构建在本篇的 FileAccess + DirAccess.rename 原语之上——先掌握原语，再看设计。

## 6. 三个真实场景

**场景一：关卡数据导出 JSON（工程工具链形态）。** speed-rouge 的程序化关卡生成器把生成的关卡落盘为 JSON：`FileAccess.open(out_path, WRITE)` + `JSON.stringify(level_dict, "\t")`。选 JSON 而非二进制的理由：关卡要进 git 做版本管理与 diff、要能被生成器与编辑器两侧工具链读写。配套的是"生成即自检"：落盘前跑准入规则，失败不写文件——IO 与工具约定的组合见 118 篇。

**场景二：设置项读写（ConfigFile 标准形态）。** 游戏的音量/全屏/键位存 `user://settings.cfg`：冷启动 `load` 返回 ERR_FILE_NOT_FOUND 时全走缺省值（首次运行体验），玩家改设置即 `set_value` + `save`。选 ConfigFile 而非 JSON 的理由：分节天然映射"音频/视频/操作"三组设置，get_value 的缺省值参数让"新增设置项不破坏旧配置文件"零成本——旧文件里没有的键自动落缺省。

**场景三：批量文本处理（DirAccess 遍历形态）。** 本地化批次检查：遍历 `res://localization/` 下全部 .csv，逐文件 `get_as_text` 后校验键齐性，缺键清单输出到 `user://missing_keys.txt`。这里三条 IO 原语齐上：DirAccess 列目录、FileAccess 逐个读、FileAccess 写报告。任务三会让你完整写一遍。

## 7. 动手实践

**任务一：错误范式肌肉记忆。** 对一个不存在的路径分别做 FileAccess.open 与 ConfigFile.load，打印两者的"失败形态"（null + get_open_error() vs Error 返回码），并把 ConfigFile 的 ERR_FILE_NOT_FOUND 分支写成"按首次运行处理"。提示：两个 API 的失败表达方式不同——FileAccess 靠返回 null，ConfigFile 靠返回值是 Error 枚举。

**任务二：JSON 往返的类型陷阱。** 构造一个含 Vector2、Color、int、float、嵌套数组的字典，直接 JSON.stringify 观察报错或变形；写一个 to_jsonable/ from_jsonable 转换对，让往返后数据可用。提示：Vector2 转 `[x, y]` 数组、Color 转十六进制字符串或 `[r,g,b,a]`；读回时按约定形态还原。

**任务三：目录扫描工具。** 写一个无头脚本：遍历指定目录下全部 .json 文件，`parse_string` 校验合法性，把损坏文件清单写入 user://report.txt。提示：DirAccess 三件套遍历 + JSON.parse_string 判 null；这个工具与 118 篇的 CLI 范式只差"退出码"一步，写完可以顺手接过去。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现</summary>

```gdscript
# res://tools/scan_json.gd
extends SceneTree

func _initialize() -> void:
    var dir := DirAccess.open("res://data")
    if dir == null:
        push_error("目录不可访问")
        quit(1)
        return

    var broken: Array[String] = []
    var checked := 0

    dir.list_dir_begin()
    var name := dir.get_next()
    while name != "":
        if not dir.current_is_dir() and name.ends_with(".json"):
            checked += 1
            var f := FileAccess.open("res://data/" + name, FileAccess.READ)
            if f == null:
                broken.append("%s: 打不开（错误码 %d）" % [name, FileAccess.get_open_error()])
            else:
                var parsed: Variant = JSON.parse_string(f.get_as_text())
                if parsed == null:
                    broken.append("%s: JSON 解析失败" % name)
        name = dir.get_next()
    dir.list_dir_end()

    var report := FileAccess.open("user://report.txt", FileAccess.WRITE)
    if report != null:
        report.store_line("checked=%d broken=%d" % [checked, broken.size()])
        for line in broken:
            report.store_line(line)
        report.close()

    if broken.is_empty():
        print("SCAN PASS: %d files ok" % checked)
        quit(0)
    else:
        print("SCAN FAIL: %d broken" % broken.size())
        quit(1)
```

要点：a) 每层 IO 都有 null 判断——目录、文件、JSON 三处各自失败形态不同（null+错误码 / null / null），统一处理成"记入清单不中断"，工具要的是完整报告；b) 退出码承接成败（118 篇的主题），报告文件承载细节，两层分离；c) `ends_with(".json")` 是最小的文件过滤，正式工具里换 DirAccess.get_files_at 或加上目录递归。
</details>

## 8. 小结

- user:// 永远可写（玩家数据），res:// 导出后只读（分发资源）；可写数据进 user:// 是铁律。
- FileAccess.open 失败返回 null + get_open_error()，判 null 是每处 IO 的固定开头；二进制族 store_32/store_var 与 get_ 成对，store_var 绑死 GDScript。
- DirAccess：make_dir_recursive 建目录、rename 即移动（原子写的地基）、三件套遍历记得 current_is_dir。
- ConfigFile 适合分节设置（get_value 缺省值实现冷启动），JSON 适合层级数据交换（parse_string 判 null、复杂类型手工转换）。
- 版本梯/原子写/损坏自愈三个存档设计模式在 044-godot 的存档篇，本篇的 IO 原语是它们的地基。

## 参考链接

- [Godot 官方文档：FileAccess（CC BY 3.0）](https://docs.godotengine.org/en/stable/classes/class_fileaccess.html)
- [Godot 官方文档：DirAccess（CC BY 3.0）](https://docs.godotengine.org/en/stable/classes/class_diraccess.html)
- [Godot 官方文档：数据路径（Data paths，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html)
- [Godot 官方文档：保存游戏（Saving games，CC BY 3.0）](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html)
- speed-rouge 项目素材：scripts/core/save_manager.gd、tools/progen_level.gd
