---
order: 60
title: 文本：插值、标签与 NVL 模式
module: 'renpy'
category: 游戏开发
difficulty: beginner
description: 在台词中插入变量值与格式化输出，用文本标签控制排版节奏，并启用多行同屏的 NVL 模式
author: fanquanpp
updated: '2026-09-22'
related:
  - 'renpy/020-FirstScriptSayAndCharacters'
  - 'renpy/030-ImagesSceneShowAndTransitions'
  - 'renpy/080-ScreensAndScreenLanguage'
prerequisites:
  - 'renpy/020-FirstScriptSayAndCharacters'
---

台词是视觉小说的主体。Ren'Py 的文本系统远不止"把字符串画上屏幕"：它可以在台词中插入变量的值、按数字格式化输出、用文本标签（text tag）控制粗体颜色与节奏，还提供了多行同屏的 NVL 模式。本篇把这套系统从转义规则讲到插值、标签，最后落到 Monologue 与 NVL 两种进阶文本组织方式。

先记住一条主线：Ren'Py 处理一段文本的顺序是——先翻译，再插值，然后套用样式与文本标签，接着排版，最后绘制。本篇讲的插值与标签正是这条流水线的中间环节。

## 学习目标

- 会正确转义引号、换行、百分号、方括号与花括号；
- 会用 [表达式] 做插值，会用 PEP 3101 风格的格式化与转换旗标；
- 会用常用文本标签排版，重点掌握 {w}、{p}、{nw}、{fast}、{done} 等对话控制标签；
- 会用 Monologue 模式把三引号长段拆成多条台词；
- 会启用 NVL 模式，配置 NVL 菜单与窗口管理；
- 掌握 Character 的进阶用法：image 参数、extend、动态角色名与窗口管理。

## 转义速查表

文本里有一些字符被引擎征用：{ 开始文本标签，[ 开始插值。想让它们以本来面目显示，需要转义：

```text
\"        显示双引号
\'        显示单引号
\n        换行
\\        显示反斜杠
\% 或 %%  显示百分号
[[        显示 [
{{        显示 {
```

字符串定界符与内容中的引号冲突时用反斜杠转义，例如 "Sylvie" "Did you ever hear \"The problem...\"" 这类写法在第一篇已经见过。其余规则同理：想显示字面的 [ 就写 `[[`，想显示字面的 { 就写 `{{`，想显示百分号写 `%%` 或 `\%`。

## 插值：把变量织进台词

在台词中写 [表达式]，引擎求值后把结果填进去：

```renpy
g "Welcome to the Nekomimi Institute, [playername]!"
g "My first name is [player.names[0]]."
g "I like you [100.0 * points / max_points:.2] percent!"
```

- 第一行是最常见的变量插值；
- 第二行说明方括号里可以放任意 Python 表达式，包括取下标、方法调用；
- 第三行演示格式化：冒号后是格式说明，.2 表示保留两位有效数字。这是 PEP 3101 风格的格式化语法；之所以用 [ 而不是 Python 原生的 {，是因为 { 已被文本标签占用。

插值时变量的查找顺序是：screen 局部变量 -> interpolate 命名空间 -> 全局命名空间。日常剧本中，绝大多数名字都在全局命名空间（也就是 store）里命中。

### 转换旗标

在表达式与右方括号之间可以加转换旗标（conversion flag），改变插值的方式：

```text
!s / !r  调用 Python 的 str() / repr()
!q       给文本标签加引号，防止注入
!t       按当前语言翻译
!i       递归插值（插值结果中的插值再被处理）
!u / !l  转为全大写 / 全小写
!c       首字母大写
```

重点是 !q。玩家可以自定义角色名，如果名字里藏着文本标签或插值记号，就可能破坏画面：

```renpy
g "Don't pull a fast one on me, [playername!q]."
```

!q 会给插值结果中的标签加引号使其失效，凡是从玩家输入来的字符串都建议加 !q。旗标可以组合使用，例如 !cl，但书写顺序固定，按官方文档给出的次序排列即可。

## 文本标签：成对与自闭合

文本标签分两种：成对标签有开有闭，如 {b}...{/b}；自闭合标签单独出现，如 {w}。标签还可以带参数，如 {size=+20}。常用的排版标签逐个过一遍：

```renpy
e "{b}粗体{/b}、{i}斜体{/i}、{u}下划线{/u}、{s}删除线{/s}"
e "{color=#f00}红色文字{/color}"
e "{size=+10}大一号{/size}，{cps=20}限速显示的文字{/cps}"
e "{k=.5}加宽字距{/k}，{alpha=0.5}半透明文字{/alpha}"
e "{font=字体文件.ttf}切换字体{/font}"
e "台词里内嵌图标：{image=heart.png}"
e "访问 {a=https://www.renpy.org}Ren'Py 官网{/a} 获取帮助"
e "{rb}汉字{/rb}{rt}han4 zi4{/rt} 显示注音"
```

- {color} 用十六进制颜色；{size=+10} 相对当前字号放大；{cps} 控制每秒显示的字符数；
- {image=} 把一张图片内嵌进文字流，常用于表情符号式的小图标；
- {a=url} 生成可点击的超链接；
- {rt} 与 {rb} 配合实现 ruby 注音：{rt} 是上方的小注音，{rb} 是被注音的本体；
- 另有 {outlinecolor}（轮廓颜色）与 {#...}（注释，渲染为空）等，完整清单见官方 text 文档。

### 对话控制标签

这一组标签不改变外观，而是控制台词与玩家的交互节奏，是演出感的关键：

- {w} 等待玩家点击后继续；{w=1.0} 是计时版，等 1 秒自动继续；
- {p} 结束当前段落并等待点击，计时版为 {p=1.0}；
- {nw} 到达行末时该行自动消失，计时版为 {nw=2}；与 {fast} 配合可以做"打字机换词"效果——第一行逐字打出某个词，行末的 {nw} 让它整行消失，紧接着的下一行用 {fast} 把换好的词瞬间摆上、再继续逐字显示后半句，玩家看到的就是"打错的词被瞬间替换"。官方 text 文档中有这一技巧的完整示例，见参考链接；
- {done} 之后的文字不显示，且含 {done} 的整行不进入对话历史，适合防止文本跳动。

一条实用规则：如果某个标签几乎每行台词都要用，就不要再用标签，应该改用样式（style）或 Character 参数来表达，标签留给真正逐句变化的演出。

```mermaid
flowchart LR
    A["翻译"] --> B["插值 [expr]"]
    B --> C["样式与文本标签"]
    C --> D["排版"]
    D --> E["绘制"]
```

## Monologue 模式

大段独白逐句写 say 很啰嗦。Monologue 模式（独白模式）允许用一个三引号字符串装下多句台词，引擎按空行把它拆成多条 say：

```renpy
"""
This is the first line of narration.

This is the second line of narration.
"""
```

等价于两条独立的旁白。拆分以空行为界；如果希望块与块之间不留空行也照样拆分，在文件顶部写 rpy monologue single；想完全禁用 Monologue，写 rpy monologue none。

## NVL 模式

到目前为止的对白都是 ADV 模式（ADV mode）：一次显示一行，窗口贴在屏幕底部。NVL 模式（NVL mode，Novel 模式）则是多行同屏、占满全屏的窗口，文字像小说一样一段段堆叠，直到你主动清屏。

启用只需两步：给角色加 kind=nvl；在每页末尾用 nvl clear 清屏。官方示例完整照录：

```renpy
define s = Character('Sylvie', kind=nvl, color="#c8ffc8")
define m = Character('Me', kind=nvl, color="#c8c8ff")
define narrator = nvl_narrator

label start:
    "I'll ask her..."
    m "Um... will you..."
    m "Will you be my artist for a visual novel?"
    nvl clear
    "Silence."
    "She is shocked, and then..."
    s "Sure, but what is a \"visual novel?\""
    nvl clear
```

- define narrator = nvl_narrator 让旁白也走 NVL；
- 每组对白之后 nvl clear 结束一页，下一组从新页开始；
- NVL 菜单：全局写 define menu = nvl_menu 可让所有选项菜单改走 NVL；也可以只对单个菜单生效，写法是 menu (nvl=True):；
- 窗口管理：window show 与 window hide 控制窗口显示隐藏，NVL 专用的是 nvl show 与 nvl hide；
- Monologue 与 NVL 完全兼容，长段独白 + 多行同屏正是绝配；
- 小技巧：把 {clear} 标签单独写成一行，等价于 nvl clear。

## Character 进阶补充

结合本篇的主题，补充几个第一篇没展开的 Character 能力。

### image 参数与带属性的 say

```renpy
define e = Character("Eileen", image="eileen")
label start:
    show eileen concerned
    e "I'm a little upset at you."
    e happy "But it's just a passing thing."
```

image 参数把角色绑定到图像 tag。之后 say 时可以直接带图像属性：e happy 会自动 show 出 eileen 的 happy 表情，省去手写 show。-happy（负号）移除一个属性；@ 之后的属性是临时的，台词结束即还原：

```renpy
e happy @ vhappy "Really! That changes everything."
e @ right -concerned "My anger is temporarily suspended..."
```

### extend：续写上一句

extend 是一个预定义的特殊角色，它让上一个说话者继续说一行"上一句 + {fast} + 新内容"的台词，画面上像同一句话被中途改写：

```renpy
show eileen concerned
e "Sometimes, I feel sad."
show eileen happy
extend " But I usually quickly get over it!"
```

### 动态角色名

```renpy
define p = Character("player_name", dynamic=True)
```

dynamic=True 时，名字参数是含 Python 表达式的字符串，每行台词说出前重新求值——玩家改名后，对话框里的名字随之更新。

### 窗口管理

```renpy
window show
pause
window hide
pause
window auto True
"The window is automatically shown before this line of dialogue."
```

window show / window hide 手动控制对白窗口；window auto True 开启自动模式：say 之前自动显示窗口，scene、call screen 与无 caption 的 menu 之前自动隐藏，绝大多数项目保持默认自动模式即可。

## 小结

- 文本处理顺序：翻译、插值、样式与标签、排版、绘制；{ 与 [ 是被征用的字符，用 `{{` 与 `[[` 转义，引号用反斜杠，百分号写 `%%` 或 `\%`。
- 插值 [表达式] 支持任意 Python 表达式与 PEP 3101 风格格式化；查找顺序为 screen 局部变量、interpolate 命名空间、全局命名空间；转换旗标 !s/!r/!q/!t/!i/!u/!l/!c 可组合（如 !cl）且顺序固定，玩家输入务必加 !q。
- 文本标签有成对与自闭合两种；{b}{i}{u}{s}{color}{size}{font}{cps}{k}{alpha}{image}{a} 负责排版，{w}{p}{nw}{fast}{done} 负责节奏；每行都用的效果应改用样式表达。
- Monologue 把三引号字符串按空行拆成多条 say，rpy monologue single 与 rpy monologue none 调整拆分策略。
- NVL 模式多行同屏：Character 加 kind=nvl、页末 nvl clear；define menu = nvl_menu 或 menu (nvl=True): 启用 NVL 菜单；nvl show/hide 管窗口；{clear} 标签等价 nvl clear；与 Monologue 兼容。
- Character 进阶：image 参数配合 say 属性自动 show（-happy 移除、@ 临时），extend 续写上一句，dynamic=True 动态角色名，window auto 管理窗口显隐。

## 参考链接

- [文本（Text）](https://www.renpy.org/doc/html/text.html)
- [对白与角色（Dialogue and Characters）](https://www.renpy.org/doc/html/dialogue.html)
- [NVL 模式（NVL Mode）](https://www.renpy.org/doc/html/nvl_mode.html)
- [快速入门（Quick Start）](https://www.renpy.org/doc/html/quickstart.html)
