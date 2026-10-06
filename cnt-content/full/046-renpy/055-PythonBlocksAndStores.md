---
order: 70
title: 剧本中的 Python 语句与 store
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 用 $ 语句 python 块与 init python 在剧本中嵌写 Python，理解 store 命名空间与常量 store
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Ren'Py 与 Python 的结合层——剧本中嵌写 Python 的全部方式，以及变量所在的 store 命名空间。
- **解决什么问题**：一行 $ 写不下复杂逻辑怎么办？什么时候代码该放进 python 块、什么时候必须放进 init python？多个系统的变量混在 store 里互相踩脚怎么办？本篇给出"代码放哪一层"的完整答案。
- **什么时候用到**：需要多行计算（伤害结算、日程推进）时用 python 块；需要定义函数、配置 config 时用 init python；做 MOD 兼容或大型项目分域时用命名 store。
- **前置知识**：先弄懂 define 与 default 的保存语义（见上一篇 [变量声明：define 与 default](/renpy/050-VariablesDefineAndDefault)），本篇反复用到"保存与回滚"这两个概念。

## 学习目标

- 会用 $ 写单行 Python，会用 python 块写多行逻辑，理解 hide 与 in 两个修饰符；
- 会用 init python 在初始化阶段定义函数与配置变量，理解 init 优先级的执行顺序；
- 分清 init python 与 define 的时序差异，知道 init 阶段哪些变量还不可用；
- 理解 store、命名 store 与常量 store 三个概念，会用命名 store 隔离一组变量。

## 单行 Python：$ 语句

以 $ 开头的行是一条单行 Python 语句，它始终在默认 store 中运行：

```renpy
$ flag = True
$ romance_points = 0
$ romance_points += 1
$ renpy.movie_cutscene("opening.ogv")
```

一个 $ 只能写一条语句，但语句本身可以是任意 Python 表达式——赋值、自增、调用函数都可以。上一篇用它改标志变量，这里最后一行还演示了调用引擎函数的用法。

易错点：$ 语句运行在剧本的运行期（runtime），此时 init 阶段的常量已经就绪，可以随便读；但反过来，init 阶段的代码访问不到运行期才诞生的变量（见下文 init python 一节的展开）。

## python 块：多行 Python

需要多行逻辑时使用 python 块：

```renpy
python:
    player_health = max(player_health - damage, 0)
    if enemy_vampire:
        enemy_health = min(enemy_health + damage, enemy_max_health)
```

这个官方示例展示了 python 块的价值：块内可以写 if 判断与多行计算，而不必拆成一长串 $ 语句。python 块有两个修饰符：

- hide：python hide: 在匿名作用域中运行，块内创建的变量是临时的，不会留在 store 里、不可保存。做"用完即弃"的工作（比如临时文件操作）时用它，避免临时变量污染游戏状态；
- in：python in 名字: 在指定的命名 store 中运行，详见后文。

为什么两个修饰符值得记住：hide 解决"临时变量污染"，in 解决"作用域隔离"，它们分别对应本篇的两个痛点。写伤害结算这类只读全局、只产临时值的逻辑时，python hide: 几乎总是更优——它让存档体积和命名空间都保持干净。

## init python：初始化阶段执行

init python 块在游戏载入前的初始化阶段运行，适合定义函数、初始化样式、设置 config 变量与 persistent 数据：

```renpy
init python:

    def auto_voice_function(ident):
        return "voice/" + ident + ".ogg"

    config.auto_voice = auto_voice_function

    if persistent.endings is None:
        persistent.endings = set()

init 1 python:

    # The bad ending is always unlocked.
    persistent.endings.add("bad_ending")
```

### init 优先级

init 与 python 之间可以写一个优先级数字（如 init 1 python:），不写时默认为 0。所有 init 块按优先级从低到高运行；优先级相同的，按文件路径的 Unicode 顺序执行。上例中 init 1 python 保证在默认优先级的 init python 之后运行，于是 persistent.endings 集合一定已被初始化，随后的 add 才不会出错。

官方约定：创作者应把自定义优先级控制在 -999 到 999 的范围内；低于 0 的优先级一般保留给库（library）与主题（theme）。

### init python 与 define 的时序差异

define 与 init python 都在 init 阶段执行，但有三个实际差异，选型时逐条对照：

- 记录与检查：define 记录赋值的文件与行号，可被 Lint 检查；init python 里的赋值两者皆无。所以"设一个变量"永远优先写 define，需要循环、条件、多语句时才退到 init python；
- 执行时机：define 等价于一个"自动安排优先级"的 init 块，而 init python 的默认优先级是 0。大多数情况下两者先于剧本运行完成，但在 init 优先级很低的块（如 -999）里，普通优先级的 define 尚未执行——在那种块里引用 define 变量会拿到未定义的名字；
- 语义清晰度：define 一眼能看出"这是个常量声明"；init python 里混着函数定义与赋值，可读性差一截。

易错点：init 阶段不可用运行期变量。init python 里只能访问同样在 init 阶段产出的东西（config、persistent、其他 init 产物），访问 default 变量或剧本运行期才有的状态（如 renpy.get_screen 的结果）要么拿不到值、要么直接抛异常。经验法则：init python 里写"游戏的结构"，运行期代码写"游戏的过程"。

真实工程场景：做一个"每章自动配音"的系统时，配音文件查找函数在 init python 里定义并挂到 config.auto_voice；而"玩家当前是否开着字幕"这类会随游戏变化的设置，函数内部在运行期读 persistent 或 store 变量即可——定义在 init、读取在运行期，两个阶段各司其职。

另一个场景：读取存档无关的配置。把关卡表、难度参数写成 Python 字典常量时放 init python（或直接 define），它们不进存档、每次启动重新生成；这样改配置表只需重启游戏，与玩家存档完全无关。

## store 与命名 store

所有变量的默认存储处叫 store。脚本里用 define、default、$ 直接操作的都是它。

除了默认 store，还可以创建命名 store（named store），把一组变量与主 store 隔离：

```renpy
init python in mystore:
    a = 1
```

要从命名 store 取出变量，使用 Python 的导入语法：

```renpy
from store.named import variable
```

注意：导入是重绑定（rebinding）而不是起别名——导入之后两边是各自独立的变量绑定，一边改动不会同步到另一边。这就是为什么"导入一次然后到处用"是坑：导入拿到的只是当时值的快照，命名 store 里后来的改动不会反映过来，反之亦然。

### 常量 store

在某个 store 中设置 _constant = True，可以把整个 store 声明为常量 store：其中的变量不参与保存，其中可达的对象也不参与回滚。Ren'Py 内置了若干常量 store，例如 audio（音频命名空间）、build（构建配置）、achievement、layeredimage 等，按需直接使用即可。

### 命名 store 隔离实战

命名 store 最有价值的场景是"不是我写的代码别踩我的变量"。举两个真实工程场景：

场景一：用 store 隔离 MOD 变量。假设你的游戏支持玩家改装 MOD，MOD 作者的脚本与本体共用 store 时，双方都定义 status、level 这类常见名字就会互相覆盖。规范做法是要求 MOD 全部写入自己的命名 store：

```renpy
init python in mod_weather:
    rain_level = 0
    def apply_rain(level):
        global rain_level
        rain_level = level

init python:
    def get_rain_level():
        import store.mod_weather
        return store.mod_weather.rain_level
```

MOD 的变量全部住在 store.mod_weather 里，本体通过模块路径读取，卸载 MOD 时清掉这个 store 即可，本体变量毫发无伤。

场景二：一套存档无关的运行配置。多人协作项目里，开发者自己的调试参数（无敌模式、跳过序章）不应进存档——用命名 store 声明为常量 store：

```renpy
init python in devconfig:
    _constant = True
    god_mode = False
    skip_intro = False
```

_constant = True 让整个 devconfig store 不参与保存与回滚，调试参数怎么改都不影响玩家存档结构。

易错点：命名 store 里的函数想修改本 store 的全局变量，要么用 global 声明（如上例 apply_rain），要么走 store.名字.变量 的模块路径访问；直接赋值会创建局部变量，静默失效且不报错，是命名 store 最常见的 bug。

## 动手实践

**任务一：把一串 $ 重构成 python 块（约 15 分钟）**

写出三行 $ 语句完成"回合结算"：扣血、判断死亡、叠加连击计数。然后把它们合并进一个 python 块，再改造成 python hide: 版本，用 Shift+O 控制台分别查看两种写法后 store 里的变量差异。

提示：python hide: 版本里结算产生的临时变量不会出现在 store。参考实现：

```renpy
python hide:
    damage = enemy_attack - defense
    player_health = max(player_health - damage, 0)
    combo += 1 if player_health > 0 else 0
```

对比要点：player_health 若是 default 声明的全局变量，hide 块里赋值会创建同名局部变量、全局值不变——这正是 hide 的语义陷阱，也是它适合"纯计算"而非"改状态"的原因。要改全局状态就用普通 python 块。

**任务二：init 优先级时序实验（约 15 分钟）**

写两个 init 块：init python 打印一个列表的内容，init 1 python 往该列表追加元素。先猜输出顺序，再跑游戏对照；然后把两个优先级都改成 5，观察同优先级时按文件路径顺序执行的效果。

提示：打印用 print，输出在 launcher 的 console 与日志里看。参考骨架：

```renpy
init python:
    print("A: list =", outfit_rules)

init 1 python:
    outfit_rules.append("formal")
```

低优先级块里 outfit_rules 还没有 append 过——这个实验验证的是"init 按优先级从低到高"这条规则，以及为什么跨 init 块共享初始化产物时要把优先级排清楚。

**任务三：给一个假想 MOD 写隔离 store（约 20 分钟）**

新建命名 store mod_hud，内含两个变量与一个函数；在剧本运行期通过 store.mod_hud.xxx 读取它们；再尝试 from store.mod_hud import x 的写法，修改命名 store 里的值，验证"导入是重绑定不是别名"。

提示：主 store 侧读命名 store 用模块路径（store.mod_hud.x）永远拿到最新值；import 进来的名字是快照。参考验证：

```renpy
init python in mod_hud:
    hint_count = 0

label start:
    $ store.mod_hud.hint_count = 3
    $ from store.mod_hud import hint_count
    $ renpy.log("snapshot=%d live=%d" % (hint_count, store.mod_hud.hint_count))
```

输出里 snapshot 是导入那一刻的 3，之后即使 mod_hud.hint_count 再变，hint_count 也停在旧值——这就是重绑定语义的实锤。

## 小结

- $ 是运行于默认 store 的单行 Python 语句；python 块写多行逻辑，hide 修饰符提供不可保存的匿名作用域（临时变量不进 store），in 修饰符把代码送进指定命名 store。
- init python 在初始化时运行，用于定义函数、初始化样式、config 与 persistent；优先级写在 init 与 python 之间，默认 0，从低到高执行、同优先级按文件路径 Unicode 顺序，创作者应使用 -999 到 999，低于 0 留给库与主题；其中赋值的变量不保存、不参与回滚。
- define 与 init python 的选型：单变量声明用 define（有行号记录与 Lint 检查），循环条件多语句才用 init python；init 阶段访问不到运行期变量，init python 写"游戏结构"，运行期代码写"游戏过程"。
- 变量默认住在 store；init python in 名字: 创建命名 store，访问它永远用 store.名字.变量 的模块路径（最新值），from store.名字 import 变量 得到的是快照（重绑定而非别名）；_constant = True 声明常量 store，其变量不保存、可达对象不回滚——命名 store 是 MOD 隔离与存档无关配置的标准工具。

## 参考链接

- [Python 语句与 store](https://www.renpy.org/doc/html/python.html)
- [存档、读档与回滚](https://www.renpy.org/doc/html/save_load_rollback.html)
- [持久化数据（Persistent）](https://www.renpy.org/doc/html/persistent.html)
- [标签与控制流（Labels and Control Flow）](https://www.renpy.org/doc/html/label.html)
