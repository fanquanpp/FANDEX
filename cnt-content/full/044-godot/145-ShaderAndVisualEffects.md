---
order: 200
title: 着色器与视觉特效入门
module: 'godot'
category: 游戏开发
difficulty: beginner
description: 用 canvas_item 着色器做受击白闪与水波，用 GPUParticles2D 做命中火花与拖尾，建立视觉表现的最小工具箱
author: fanquanpp
updated: '2026-10-07'
related: ['godot/070-TwoDGameObjects', 'godot/110-AnimationAndTween', 'godot/130-ExportingProjects']
prerequisites: ['godot/070-TwoDGameObjects']
---

## 知识点地图

- **知识类别**：着色器（Shader）与粒子特效——GPU 侧的表现层技术，属"视觉表现"类知识。模块此前没有任何着色器专篇（唯一的提及在 010 篇的编辑器界面介绍里），本篇补上这块拼图。
- **解决什么问题**：有些视觉效果靠节点与动画做不出来或做出来很贵——全屏水波、受击瞬间全身泛白、一秒钟三百颗的火星。这类"逐像素"或"海量实例"的计算必须搬到 GPU 上，着色器与粒子系统就是给 GPU 派活的两个接口。
- **什么时候用到**：受击反馈、状态提示（中毒变绿）、环境氛围（水面波动、篝火光晕）、打击感（命中火花、冲刺拖尾）、UI 微动效。

> 学习方法提示：本篇是"最小可用体系"而非图形学教程——目标是看懂并改写常见 2D 着色器、配出常见粒子效果。想深入手写光照与后处理，官方文档的 Shading 语言与着色器参考是下一站。

## 学习目标

- 认出 .gdshader 文件的三段结构：shader_type 声明、uniform 参数区、处理函数
- 会用 canvas_item 着色器的关键内置量：TEXTURE、UV、COLOR、TIME
- 独立实现受击白闪与顶点水波两个最小实例，并从 GDScript 侧驱动参数
- 配置 GPUParticles2D 做命中火花（one_shot 爆发）与移动拖尾

## 1. 着色器是什么：交给 GPU 的逐像素小程序

着色器（shader）是一段运行在显卡上的小程序。它解决两类 CPU 不擅长的问题：

- **逐像素计算**：屏幕上一颗 512x512 的精灵有 26 万像素，GDScript 循环改一遍就是灾难；GPU 上几千个核心同时各算各的，一帧内完成。
- **海量实例**：300 颗火星每颗都有独立的位置、速度、寿命，CPU 模拟就是每帧几万次函数调用；GPU 把粒子当数据流一次算完。

Godot 中着色器是 .gdshader 文本文件，挂在节点的 ShaderMaterial 上。2D 最常用的是 canvas_item 类型。创建路径：文件系统停靠栏右键 -> 新建资源 -> 搜索 Shader；或选中节点，Inspector 里 Material -> 新建 ShaderMaterial，再在 Shader 属性处新建着色器文件。

## 2. .gdshader 文件结构：三段式

```glsl
shader_type canvas_item;          // 第一段：声明这是给 2D 画布项用的着色器

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);   // 第二段：参数区
uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;

void fragment() {                 // 第三段：处理函数（还有 vertex()）
    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(tex, flash_color, flash_amount);
}
```

逐段拆解：

- **shader_type**：决定着色器的"方言"。canvas_item 用于一切 2D 节点（Sprite2D、TextureRect、TileMapLayer……），选错了引擎直接拒绝编译。
- **uniform（统一变量）**：从 GDScript 传进 GPU 的参数，方向单向（GPU 里改了不会传回来）。每个 uniform 可以带默认值与提示（hint）：`source_color` 让颜色选择器按颜色而不是四个滑条显示；`hint_range(0.0, 1.0)` 在 Inspector 里变成滑条。uniform 的价值在于**一个着色器服务无数场景**：白闪着色器不用为每种颜色写一份，改 uniform 就行。
- **fragment()（片元函数）**：对精灵覆盖到的每个像素执行一次，输出写进内置变量 COLOR。与之并列的 vertex() 对每个顶点执行（2D 里就是四个角），适合做整体形变。
- **内置量**：TEXTURE 是节点当前贴图，UV 是当前像素的贴图坐标（0 到 1），COLOR 进来时是"贴图颜色乘节点 modulate"的初始值，TIME 是自场景启动起累计的秒数——一切自动动画的时钟。

`texture(TEXTURE, UV)` 是逐像素读贴图的标准写法，得到当前像素的原始颜色；把它变换后再写入 COLOR，就是"对画面做手脚"的全部秘密。

## 3. 最小实例一：受击白闪

需求：角色被击中的一瞬间整体泛白，0.2 秒内淡回原样。着色器只负责"按参数混合"，时序交给 GDScript：

```glsl
shader_type canvas_item;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(tex, flash_color, flash_amount);
}
```

mix(a, b, t) 是线性插值：t 为 0 输出原图、t 为 1 输出纯白、中间是过渡。换一种写法（在 fragment 里手写 `tex.rgb + flash_color.rgb * flash_amount`）会过曝成死白且丢掉半透明边缘，mix 按比例混合则保留 alpha 结构——受击反馈要的是"闪一下"而不是"糊成一团"。

GDScript 驱动（挂在角色上）：

```gdscript
func flash() -> void:
    var mat := sprite.material as ShaderMaterial
    mat.set_shader_parameter("flash_amount", 1.0)     # 参数名必须与 uniform 同名
    var tw := create_tween()
    tw.tween_method(
        func(v: float): mat.set_shader_parameter("flash_amount", v),
        1.0, 0.0, 0.2
    )
```

易错点：`set_shader_parameter` 的名字是字符串，拼错不报错、只是没效果——这是着色器联调最高频的"灵异问题"；先确认 uniform 名与字符串逐字符一致。另一个坑：改的是材质实例——多个敌人共用同一份 ShaderMaterial 时，闪一个等于全闪。给每个可被击中的对象在 Inspector 里把 Material 的 Resource 属性右键 Make Unique（或代码里 `material = material.duplicate()`），回到 050 篇讲的共享缓存问题——着色器材质也是资源。

## 4. 最小实例二：顶点水波

需求：水面或旗帜缓慢起伏。这个效果动顶点而不是像素：

```glsl
shader_type canvas_item;

uniform float wave_strength = 2.0;    // 波幅（像素）
uniform float wave_speed = 3.0;       // 频率

void vertex() {
    VERTEX.y += sin(TIME * wave_speed + VERTEX.x * 0.05) * wave_strength;
}
```

vertex() 里 VERTEX 是当前顶点（局部坐标，2D 下四个角）——只有四个顶点意味着只能做"整体倾斜/拉伸"级别的形变，sin 按 x 错开相位后，贴图四角上下起伏带动整张图波动，视觉上就是柔和的水面。想逐像素波动（波纹沿表面流动）就换 fragment 里偏移 UV：

```glsl
void fragment() {
    vec2 uv = UV;
    uv.y += sin(uv.x * 20.0 + TIME * wave_speed) * 0.005;   // 采样坐标轻微晃动
    COLOR = texture(TEXTURE, uv);
}
```

两种实现的取舍：顶点版免费但有四个采样点上限（四边形就四个角）；UV 版逐像素细腻但边缘会"漏底"（偏移后图像边缘露出透明区），给源贴图留出余量或接受轻微裁切。TIME 乘系数做速度、坐标乘系数做波长——调这两个数字的过程，就是着色器调参的日常。

## 5. GPUParticles2D：把粒子交给 GPU

粒子系统解决"很多小东西同时动"。GPUParticles2D 的分工是：节点管"发射策略"（频率、数量、一次性还是持续），ParticleProcessMaterial 管"每颗粒子的行为"（初速度、重力、缩放、颜色曲线）。

命中火花的配置（点击攻击落点爆发一次）：

```text
GPUParticles2D
  one_shot = true           # 爆发型：触发一次就停
  explosiveness = 1.0       # 全部粒子在第一瞬间射出，而不是按 lifetime 均匀发射
  amount = 24               # 火花数量
  lifetime = 0.4            # 0.4 秒消散
  emitting = false          # 初始不发，等代码触发
  texture = spark.png       # 每颗粒子画什么（也可以不设，画默认方块）
```

ParticleProcessMaterial 里配行为：direction 设 (0, -1)（向上喷射）、spread 45（扩散角）、initial_velocity 100 到 250（区间内随机）、gravity (0, 600)（火星受重力下坠）、scale_min/max 0.5 到 1.0（大小随机）、color_ramp 挂一条由黄到红到透明的 Gradient——火星从亮到暗的自然衰减全靠这条 ramp。

代码触发：

```gdscript
func spawn_hit_sparks(at: Vector2) -> void:
    var fx := HitSparks.instantiate()      # 火花做成独立场景，一处定义处处复用
    fx.global_position = at
    get_tree().current_scene.add_child(fx)
    fx.emitting = true
    # one_shot 场景播完即结束，可用 timer 回收或挂 finished 信号（Godot 4.2+）自动 queue_free
    fx.finished.connect(fx.queue_free)
```

拖尾是另一类：给持续移动的对象（冲刺的角色、飞行道具）挂一个常开 GPUParticles2D，`trail_enabled = true` 且把 trail_lifetime 拉到 0.3 秒左右，粒子引擎会沿运动轨迹串出残影；把粒子 texture 设成角色剪影、颜色 ramp 递减透明度，就是最省美术成本的冲刺特效。

选型提醒：GPUParticles2D 跑在 GPU 上，低端设备或 Web 导出（Compatibility 渲染器，见 130 篇）下历史上兼容性弱于 CPU 版；数量极少（几十颗以内）或目标平台老旧时，CPUParticles2D 是稳妥替代——属性几乎同名，代码可平移。另外，别人怎么写也值得看：几何构成（speed-rouge）仓库里实际维护着 2 个 .gdshader 文件，配合它的 tools/ 脚本使用，拿来对照"真实项目把着色器放在什么位置、配什么 uniform"很有参考价值。

## 6. 三个不同场景的用法速览

- **动作游戏打击反馈**：白闪 shader（第 3 节）+ 命中火花（第 5 节）+ 080 篇的击退冲量，三件套一次配齐——受击可读性是动作手感的下限。
- **关卡氛围**：UV 水波贴在水面 TileMapLayer 上（TileMapLayer 同样接受 ShaderMaterial，全层瓦片一起波动）；篝火、传送门用常开粒子 + color_ramp 循环。
- **UI 微动效**：TextureRect 挂白闪着色器，关卡切换时 flash_amount 从 1 渐到 0 当过场闪光；按钮悬停用轻微顶点缩放（vertex 里 `VERTEX *= 1.03`）替代换图——着色器在 UI 上同样成立，因为一切 2D 都是 canvas_item。

## 7. 动手实践

练习一（受击白闪完整链）。任务：复现第 3 节效果，并把 flash_color 做成可配置——中毒闪绿、冰冻闪蓝。自检：同一角色先后两次受击分别是白色与绿色，两次之间无残留闪烁。提示：中毒与受击共用同一个着色器，只换 uniform；确保上一次 Tween 结束再开始下一次（080/110 篇都讲过 Tween 先 kill 的纪律）。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```gdscript
@onready var sprite: Sprite2D = $Sprite2D
var flash_tween: Tween

func flash(color: Color = Color.WHITE) -> void:
    var mat := sprite.material as ShaderMaterial
    if flash_tween:
        flash_tween.kill()                        # 连续受击：先收掉上一段动画
    mat.set_shader_parameter("flash_color", color)
    flash_tween = create_tween()
    flash_tween.tween_method(
        func(v: float): mat.set_shader_parameter("flash_amount", v),
        1.0, 0.0, 0.2
    )

# 调用：flash() 受击；flash(Color(0.3, 0.9, 0.4)) 中毒
```

对照要点：kill 旧 Tween 防止两段 tween_method 互相抢同一个 uniform 参数（后启动的覆盖先启动的，但先启动的还在跑，表现为"闪烁抖动"）；默认参数 Color.WHITE 让受击调用零参数——API 的默认值设计直接决定调用方的整洁度。

</details>

练习二（水波场景装饰）。任务：给一条水面（任意贴图）加上下起伏，要求波幅与频率暴露成 uniform 且在 Inspector 里可调；再试出"波幅超过多少会露边"。提示：先用第 4 节顶点版，露边问题验证"贴图留余量"的结论——把源图上下各多画几像素。

练习三（可复用的命中火花场景）。任务：把第 5 节的火花做成 HitSparks.tscn（含 one_shot 配置与 finished 自动销毁），在三个不同场合调用：子弹命中、敌人死亡、宝箱开启——三个场合只允许改 amount 与 color_ramp，不允许复制场景。提示：发射前在代码里 `fx.amount = n` 与换 material 的 color_ramp，体会"参数化复用"与"复制粘贴"的区别。

## 小结

着色器是把逐像素与海量计算交给 GPU 的小程序；canvas_item 类型的 .gdshader 由 shader_type、uniform 参数区与 fragment/vertex 函数构成，TEXTURE/UV/COLOR/TIME 是最常用的内置量。受击白闪用 mix 按比例混合（保持 alpha），水波动顶点或偏移 UV，TIME 是一切自动动画的时钟。GPUParticles2D 的分工：节点管发射策略（one_shot + explosiveness 做爆发），ProcessMaterial 管粒子行为（初速、重力、color_ramp 做衰减），火花做成场景参数化复用。记住三条联调纪律：set_shader_parameter 的名字逐字符对、材质要 Make Unique 防共享、Web/低端设备留意 CPU 粒子替代。

## 参考与致谢

- 本篇知识点体系（着色器结构、uniform 与内置量、canvas_item 与粒子系统）参照 Godot 官方文档 Shading 语言、Your first 2D shader 与 Particle systems 章节整理改写；Godot 官方文档以 Creative Commons Attribution 3.0（CC-BY 3.0）许可发布：https://docs.godotengine.org/en/stable/tutorials/shaders/index.html
- [GPUParticles2D 类文档](https://docs.godotengine.org/en/stable/classes/class_gpuparticles2d.html)
- [ParticleProcessMaterial 类文档](https://docs.godotengine.org/en/stable/classes/class_particleprocessmaterial.html)
- 动作游戏几何构成 speed-rouge（仓库内含 2 个 .gdshader 实例可对照）：https://github.com/fanquanpp/geometric-construct
