---
order: 210
title: 2D 光照与氛围
module: 'godot'
category: 游戏开发
difficulty: intermediate
description: PointLight2D/DirectionalLight2D/CanvasModulate/LightOccluder2D 四节点、阴影与纹理光照、昼夜循环与火把氛围实战
author: fanquanpp
updated: '2026-10-07'
related: ['godot/145-ShaderAndVisualEffects', 'godot/070-TwoDGameObjects', 'godot/090-TilemapsAndLevelDesign']
prerequisites:
  - 'godot/020-NodesScenesAndInstancing'
---

## 知识点地图

- **知识类别**：2D 光照与氛围——`PointLight2D` / `DirectionalLight2D` / `CanvasModulate` / `LightOccluder2D` 四节点与混合模式，对应 Godot 官方文档「2D lights and shadows」。
- **解决什么问题**：2D 画面默认是「平面贴图拼接」，没有明暗就没有时间感与空间纵深。光照系统给 2D 加上「哪里亮、哪里暗、影子往哪倒」的能力：昼夜循环、火把光晕、地牢阴影、霓虹夜景都靠它。
- **什么时候用到**：农场/经营类的昼夜循环；地牢与恐怖氛围；夜晚窗灯、萤火虫等氛围点缀；横版游戏的定向阳光与窗格阴影。
- **与着色器篇的分工**：[145 着色器篇](/godot/145-ShaderAndVisualEffects)讲**逐像素的程序化效果**（水面扭曲、溶解过渡）；本篇讲**引擎节点的光照体系**——用现成节点组合出氛围，不写一行 shader。先查本篇能否用节点解决，解决不了再下沉到 shader。
- **本篇不讲**：3D 光照（模块定位 2D）、Light2D 的 range_layer 视觉分层的全部细节、CanvasGroup 后期效果。

预计 30 到 45 分钟。

## 学习目标

1. 用 CanvasModulate 全屏压暗 + PointLight2D 局部点亮，搭出「夜晚的灯下光圈」最小组合；
2. 解释 blend_mode 的 add 与 mix 各自的视觉语义，并选对场景；
3. 用 LightOccluder2D 让灯光投出影子，说清遮挡体与碰撞体的区别；
4. 落地一个完整的昼夜循环：时间驱动的色温变化 + 灯光自动启停。

## 1. 心智模型：先染黑，再点亮

2D 光照的正确姿势不是「加一盏灯」，而是两步：

1. **CanvasModulate 把整个画布染上基调色**——黄昏染橙、深夜染深蓝。它是一个节点，颜色作用于同一 canvas 的所有默认混合元素；
2. **光源把光圈内的区域「加亮回来」**——PointLight2D 的默认混合模式是 add（叠加），光圈内的像素变亮，视觉上「灯照亮了一片」。

先做第一个实验（30 秒见效）：

```text
场景树：
Main
  CanvasModulate      color = #2a3550（深夜蓝）
  Sprite2D            任意场景贴图
  PointLight2D        texture = 默认白圆，position = 灯的位置
```

不挂 CanvasModulate 时灯几乎看不出效果（画面本来就亮）；挂上后灯光立刻成为画面的视觉中心。**「没有暗就没有亮」是 2D 光照的第一原则**——只加灯不压暗，是新手做出「看不见光照」的最常见原因。

## 2. 四节点逐个讲透

### 2.1 PointLight2D：一切局部光的起点

| 属性 | 作用 | 易错点 |
| --- | --- | --- |
| `texture` | 光斑形状（默认白圆） | 用径向渐变 PNG 换出柔边光晕；硬圆边缘像「手电筒切割」 |
| `energy` | 强度倍率 | 昼夜循环里主要动画它，而不是动 color |
| `color` | 光色 | 火把橙 #ff9a3c、月光冷蓝 #9db4ff 起步 |
| `blend_mode` | add 叠加亮 / mix 显示原色 / sub 相减 / mask 遮罩 | 见 2.4 节专讲 |
| `shadow_enabled` | 开启投影 | 配合 LightOccluder2D；移动端慎开、灯多了更慎 |

`texture` 的实践建议：默认圆形纹理边缘生硬，几乎所有正 经项目都会换成一张中心白、边缘透明的径向渐变图（16-64px 的 PNG 即可，Godot 会按 `texture_scale` 拉伸到光范围）。

### 2.2 DirectionalLight2D：全屏平行光

阳光、月光这类「方向一致、无衰减」的光。`rotation` 决定光线方向，`follow_viewport_enabled` 让光影跟随视口。昼夜循环里太阳落山 = 把它的 energy 渐变到 0，而不是删节点。

### 2.3 LightOccluder2D：影子从哪来

LightOccluder2D 本身不渲染，它持有**遮挡多边形**（polygon），光源开启 `shadow_enabled` 后按遮挡轮廓投影。三个必懂点：

- **遮挡体与碰撞体是两套数据**（与导航网格同理）：墙壁 Sprite 的碰撞形状不会自动产生影子，要单独挂 LightOccluder2D 描轮廓。TileSet 里可以直接给瓦片配置 occlusion layer，摆瓦片即摆遮挡（与 090 篇的导航层、085 篇的物理层同一套分层心智）；
- `sdf_collision`：2D 光影依赖屏幕空间 SDF（有向距离场）——项目设置里 2D SDF 默认开启，若影子整体消失先检查它；
- `shadow_filter`（PCF5/PCF13）与 `shadow_filter_smooth`：把锯齿影边缘柔化，代价是采样变多。氛围游戏建议 PCF13 + 适度 smooth。

### 2.4 blend_mode：光的语言

| 模式 | 视觉语义 | 典型用途 |
| --- | --- | --- |
| `add`（默认） | 光圈**叠加变亮**，越叠越白 | 火把、路灯、爆炸闪光 |
| `mix` | 光圈内显示**光的本色**（不叠亮，像刷上去的颜料） | 彩色夜视、染色区域、安全区高亮 |
| `sub` | 光圈**减暗** | 手动压暗某区域（负片光） |
| `mask` | 只影响遮挡（配合用） | 特殊管线场景 |

选型口诀：**想要「照亮」用 add，想要「染色」用 mix**。夜景里把窗灯调成 mix 模式的暖黄，灯下地面是「染色」而非「过曝」——这是氛围游戏的常用技巧。

## 3. 三个工程场景

### 场景一：农场昼夜循环（学习动机来自真实项目）

真实背景：花语花园（flower-card）的 README 已知限制清单里写着「昼夜仅表现」——天空贴图与色调会随时间切换，但农场里没有真正的光照：夜里的作物和白天一样亮堂（`.workflow-tmp/scan/c-projects.md` 044 节第 18 条素材）。把这条欠账当作学习任务：给农场做一个真光照的昼夜循环。

```gdscript
# day_night.gd —— 挂在场景根，子节点：CanvasModulate、DirectionalLight2D、若干 PointLight2D
extends Node2D

@onready var canvas_tint: CanvasModulate = $CanvasModulate
@onready var sun: DirectionalLight2D = $Sun

# 一天 120 秒；色调用「关键帧插值」而不是线性 RGB 插值
const DAY_LENGTH := 120.0
const PHASES := [
    { "t": 0.00, "color": Color(1.0, 0.98, 0.92), "sun": 1.0 },   # 正午：近白
    { "t": 0.40, "color": Color(1.0, 0.80, 0.55), "sun": 0.85 },  # 黄昏：暖橙
    { "t": 0.55, "color": Color(0.16, 0.20, 0.31), "sun": 0.0 },  # 入夜：深蓝黑
    { "t": 0.90, "color": Color(0.14, 0.18, 0.28), "sun": 0.0 },  # 深夜
    { "t": 1.00, "color": Color(1.0, 0.98, 0.92), "sun": 1.0 },   # 回到正午
]

var time_of_day := 0.0

func _process(delta: float) -> void:
    time_of_day = fmod(time_of_day + delta / DAY_LENGTH, 1.0)
    var c := _sample(time_of_day)
    canvas_tint.color = c["color"]
    sun.energy = c["sun"]
    # 夜间自动点亮场景里的灯（灯的开关挂同一个时间轴）
    for light in get_tree().get_nodes_in_group("lamps"):
        light.enabled = time_of_day > 0.45 and time_of_day < 0.95

func _sample(t: float) -> Dictionary:
    for i in range(PHASES.size() - 1):
        var a: Dictionary = PHASES[i]
        var b: Dictionary = PHASES[i + 1]
        if t >= a["t"] and t <= b["t"]:
            var w: float = (t - a["t"]) / (b["t"] - a["t"])
            return {
                "color": a["color"].lerp(b["color"], w),
                "sun": lerpf(a["sun"], b["sun"], w),
            }
    return PHASES[0]
```

逐段讲解：

- **关键帧相位表而不是两帧 lerp**：昼夜不是「白天色 -> 夜色」的直线——黄昏的暖橙是独立色调，直接从白插到深蓝会全程灰蒙蒙。相位表让美术同学能直接改表调色，代码零改动；
- **energy 与 color 分工**：CanvasModulate.color 管「世界基调」，sun.energy 管「阳光强度」，灯光 enabled 管「人工照明启停」——三者挂在同一时间轴上才自然。**只动 CanvasModulate 不动 sun** 的常见症状：入夜后画面整体压蓝但仍有「平行光扫过」的亮带；
- `fmod` 保证时间回卷；灯的启停走 `group("lamps")` 批量处理（040 篇的分组查询），加新灯只需把它加进组——昼夜脚本不知道每盏灯的存在；
- 花 20 分钟把这套节点接进 flower-card，「昼夜仅表现」这条已知限制就可以从 README 划掉——这就是「读真实项目的欠账清单找练习题」的实践方式。

### 场景二：地牢火把与投影（add + occluder）

```text
场景树：
Dungeon
  CanvasModulate        color = #14141c
  Player（CharacterBody2D）
    Torch（PointLight2D）
      texture: 径向渐变光斑
      color: #ff9a3c
      energy: 1.2
      shadow_enabled: true
      shadow_filter: PCF13
  Wall (StaticBody2D)
    Sprite2D
    Occluder（LightOccluder2D）  polygon: 沿墙轮廓
```

要点：

- 火把挂在玩家身上随人移动，墙上的 LightOccluder2D 让火光在墙后投出影子——**影子是「空间感」的最大来源**，同样的深蓝画布，加了投影立刻从「平面贴图」变「立体走廊」；
- 遮挡多边形用「描边成面」沿墙画，不需要精确到像素（影子边缘有 PCF 柔化）；TileMap 关卡在 TileSet 的 occlusion 层给墙瓦片画一次矩形，全图生效；
- 火把「呼吸感」：`_process` 里 `energy = 1.2 + sin(Time.get_ticks_msec() * 0.004) * 0.08`——微小幅度的高频抖动比大摆动更真实；
- 性能红线：**同屏 PointLight2D（含投影）建议控制在个位数**。2D 光照按「光 x 受影响像素」计费，移动端 20 盏投影灯是必然掉帧的配置（Monitors 曲线可实证，见 [调试与性能剖析](/godot/127-DebuggingAndProfiling)）。

### 场景三：自发光元素——不被夜色吞掉的萤火虫

问题：CanvasModulate 压暗全画布后，想保持亮的元素（萤火虫、霓虹招牌、魔法粒子）也被压暗了。解法是**混合模式而不是光照**：

```gdscript
# 萤火虫精灵用 CanvasItemMaterial 的 add 混合
var mat := CanvasItemMaterial.new()
mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
firefly.material = mat
```

原理：add 混合的像素是「叠加」进画面的——即使 CanvasModulate 已经把底色压到接近黑，叠加的亮色依然可见（0 + 亮 = 亮）。这与 PointLight2D 的默认混合是同一个数学：**灯光节点照亮别人，add 材质点亮自己**。

推论与易错点：

- 自发光元素**不需要**也不应该再挂光源：给每只萤火虫配一盏 PointLight2D 是新手最贵的错误（20 只萤火虫 = 20 盏灯）；
- 霓虹招牌同理：贴图 add 混合 + 周围一盏真灯照亮墙面，两层配合出「灯箱」质感；
- `mix` 模式做不到这一点（它是染色不是叠加），选错模式的表现是「萤火虫在夜里更暗了」。

## 4. 动手实践

任务：搭一个含昼夜与灯光的农场夜景小场景。

1. 复刻场景一的昼夜脚本（相位表可自定），验证：黄昏有暖橙、深夜全场景压蓝、灯组在夜间自动点亮、日出回正午；
2. 给农场小屋的窗户加「自发光」：窗贴图 add 混合 + 屋内一盏 mix 模式暖光灯，对照「只有 add 贴图」与「add 贴图 + 真灯」两种效果；
3. 画一面带 LightOccluder2D 的围墙，开投影后观察火把光被墙挡出的影子；把 shadow_filter 从关闭切到 PCF13，对比影边缘；
4. 制造事故：删掉 CanvasModulate 只留灯，记录「看不出光照」的现象；再把灯数复制到 15 盏开投影，用 Monitors 的 FPS 曲线记录性能代价。

<details>
<summary>参考现象与解释（先自己试，再展开对照）</summary>

第 2 题：只有 add 贴图时窗子亮但「悬浮」——亮斑不照亮周围墙面；补一盏 mix 暖光后墙面被染上暖色，光有了「来源感」。两层组合（自发光贴图 + 一盏真灯）是氛围光性价比最高的手法。

第 3 题：无 filter 时影子边缘锯齿明显（1-bit 硬边）；PCF13 的边缘呈柔和过渡。注意 filter 是采样开销，大量灯时先降 filter 再降灯数。

第 4 题：没有 CanvasModulate 时画面全亮，add 光叠加后「只是更白」而非「照亮局部」——验证第一原则「先染黑再点亮」。15 盏投影灯下 FPS 通常显著下滑且阴影渲染耗时在 Profiler 可见；结论：灯光预算按「盏数 x 投影开关」双重控制。

</details>

## 5. 常见错误与对策

| 现象 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 加了灯看不出效果 | 没有 CanvasModulate 压暗 | 先染黑再点亮（第 1 节第一原则） |
| 入夜画面发灰不「蓝」 | 白天色到夜色做了两帧线性插值 | 用相位关键帧表（黄昏是独立色相） |
| 影子完全不出现 | 2D SDF 未开启 / 遮挡体没挂 / 灯没开 shadow_enabled | 按序排查三处 |
| 影子边缘锯齿 | shadow_filter 关闭 | PCF5/PCF13 + shadow_filter_smooth |
| 萤火虫夜里被压暗 | 用了默认混合 / 错用 mix | CanvasItemMaterial 的 add 混合（场景三） |
| 灯下区域过曝发白 | add 模式多灯叠加 | 换 mix（染色语义）或降 energy |
| 加灯后掉帧 | 灯数过多或全开投影 | 个位数灯预算；装饰性「光」用 add 贴图代替灯节点 |

## 6. 与之前和之后的知识的关系

- 往前：CanvasModulate 的全画布作用域就是 020 篇 canvas 概念的直接应用；灯光节点的开关批量控制用了 040 的分组与信号思想；
- 往后：145 着色器篇在你需要「光照规则之外的效果」（如溶解、扭曲）时接棒；127 调试篇的 Monitors/Profiler 是灯光性能预算的验证工具；真实项目侧，flower-card 的「昼夜仅表现」欠账（本篇场景一）是现成的落地练习题。

## 参考与致谢

本文四节点职责、blend_mode 语义、SDF 与阴影滤镜机制参考 Godot 官方文档「2D lights and shadows」，按 CC-BY 4.0 许可（https://creativecommons.org/licenses/by/4.0/）使用并重新组织改写。来源：https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html
