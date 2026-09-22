---
order: 70
title: 类、面向对象与内存管理
module: 'gdscript'
category: 游戏开发
difficulty: beginner
description: 掌握三种类的定义方式继承与多态属性访问器，并理解引用计数与手动释放的内存规则
author: fanquanpp
updated: '2026-09-22'
related:
  - 'gdscript/020-VariablesConstantsEnums'
  - 'gdscript/050-FunctionsAndCallable'
  - 'gdscript/080-AnnotationsAndExportedProperties'
prerequisites:
  - 'gdscript/020-VariablesConstantsEnums'
  - 'gdscript/050-FunctionsAndCallable'
---

GDScript 是一门面向对象语言，而它的第一条"奇怪"规则是：每个 .gd 脚本文件本身就是一个类，你写的所有代码都活在类里。本篇系统讲清 GDScript 的面向对象体系：三种类的定义方式、对象实例化与构造析构、继承与多态、抽象类、属性访问器、静态成员；最后是内存管理——RefCounted 的引用计数与 Node 的手动释放，这是游戏开发中最容易出事故的知识点。

## 学习目标

- 会用三种方式定义类：无名类、class_name 全局类、内部类；
- 掌握 _init 构造、_static_init 静态构造与 NOTIFICATION_PREDELETE 清理；
- 理解 extends 的四种形式与继承限制，会用 super 与 is；
- 理解"所有方法默认可重写"的多态规则与 @abstract 抽象类；
- 会写内联与具名两种属性访问器，避开无限递归陷阱；
- 理解 RefCounted 与 Node 的内存规则，会用 weakref 与 is_instance_valid。

## 三种类形式

### 无名类：每个脚本文件就是一个类

每个 .gd 文件本身就是一个类。没有 class_name 时它没有全局名字，只能按文件路径引用：

```gdscript
# 方式一：按路径继承另一个脚本
extends "res://path/to/character.gd"

# 方式二：load 加载后实例化
var Character = load("res://path/to/character.gd")
var character = Character.new()
```

### 具名全局类：class_name

```gdscript
class_name Character
extends Node2D
```

- 类名用 PascalCase；注册进全局类表后，任何脚本都能直接用类名访问，不需要 load 或 preload；
- @icon("res://icon.png") 可以给类自定义图标，写在 class_name 之前；
- class_name 与 extends 可以写在同一行：class_name MyNode extends Node；
- 注意：以 Editor 开头的类名不会出现在编辑器的"新建节点"对话框中，起名时避开这个前缀。

### 内部类

用 class 关键字在脚本文件内部声明类：

```gdscript
class MyInnerClass:

    func hello() -> void:
        print("hello")

func _ready() -> void:
    var obj = MyInnerClass.new()   # 文件内直接 new
    obj.hello()
```

从外部访问要经过外部类名：MyClass.MyInnerClass.new()。内部类里还可以再嵌套内部类。

## 对象与实例化

用 `类名.new()` 创建实例，它会调用构造函数 _init。self 在方法内指向当前实例，有两个典型用途：一是区分同名局部变量与成员变量；二是链式调用——方法返回 self，调用方就能一路点下去：

```gdscript
func set_hp(value: int) -> Character:
    hp = value
    return self        # 返回自身，支持 player.set_hp(10).heal()
```

性能提示：成员属性的访问沿继承链向上查找，比数组、字典的键访问慢。热点代码里频繁读写的值，优先放进局部变量。

## 构造与析构

_init 是构造函数，可以带参数：

```gdscript
func _init(name: String, level: int = 1) -> void:
    self.name = name
    self.level = level
```

注意一个限制：如果 _init 定义了没有默认值的必填参数，这个类就只能通过代码传参实例化——PackedScene.instantiate()、duplicate() 这类由引擎完成的实例化都会失败，因为引擎提供不了这些参数。

_static_init 是静态构造函数，在类被加载时自动执行一次，适合初始化静态成员。

GDScript 没有析构函数。需要在对象销毁前做清理，用 _notification 监听 NOTIFICATION_PREDELETE：

```gdscript
func _notification(what: int) -> void:
    if what == NOTIFICATION_PREDELETE:
        # 对象即将销毁，在这里做手动清理
        pass
```

## 继承

extends 有四种形式：

```gdscript
extends CharacterBody2D                        # 全局类名
extends "res://path/to/character.gd"           # 文件路径
extends "res://path/to/other.gd".MyInnerClass  # 其他文件里的内部类
class_name Player extends CharacterBody2D      # 与 class_name 同行
```

继承的核心规则：

- 不允许多重继承；不写 extends 时默认继承 RefCounted；
- 子类不能声明与父类同名但参数不同的方法（GDScript 不支持方法重载），构造函数 _init 例外；也不能声明与父类同名的属性；
- super(x) 调用父类的同名方法（最常用于在 _init 里向父类转发参数）；super.method() 显式调用父类的指定方法：

```gdscript
func _init(x: int) -> void:
    super(x)              # 调用父类 _init

func attack() -> void:
    super.attack()        # 先执行父类逻辑，再做子类扩展
```

- 父类 _init 有必填参数时，子类必须定义自己的 _init，并向 super 传参；
- is 检查继承关系：if player is Character:。

## 多态与抽象类

GDScript 没有 virtual、override 关键字——所有方法默认都可以被子类重写，子类声明同名同参方法即完成重写。约定是：只应该重写下划线开头的引擎内置方法（_ready、_process 等）；自己写的、希望被子类重写的方法，也建议加 _ 前缀，表明这是留给子类覆写的。

Godot 4.5 起支持 @abstract 抽象类。先定义抽象基类：

```gdscript
# animal.gd
@abstract class_name Animal

@abstract func eat() -> void
```

再写具体子类实现它：

```gdscript
# cat.gd
class_name Cat
extends Animal

func eat() -> void:
    print("cat eating")
```

规则：

- @abstract 写在 class_name/extends 之前；
- 抽象类不能实例化，Animal.new() 会报错；
- 具体子类必须实现全部抽象方法，否则报错；
- 抽象类可以没有任何抽象方法——只用它表达"这是一个不许直接实例化的基类"；
- 内部类也可以声明为抽象类。

## 属性访问器

属性可以定义 get/set 访问器，把读写过程接管下来。第一个例子：内部用毫秒存储，对外以秒读写：

```gdscript
var milliseconds: int = 0
var seconds: int:
    get:
        return milliseconds / 1000
    set(value):
        milliseconds = value * 1000
```

第二个例子是游戏开发中的惯用法——限制取值范围并发射信号：

```gdscript
signal hp_changed(old_value: int, new_value: int)

var max_health := 100
var health: int = 100:
    get:
        return health
    set(value):
        if value == health:
            return
        if value > max_health:
            value = max_health
        elif value < 0:
            value = 0
        var old_val = health
        health = value
        hp_changed.emit(old_val, health)
```

访问器也可以写成具名函数的形式：

```gdscript
var my_prop: get = get_my_prop, set = set_my_prop
```

四条要点：

- 内联语法与具名函数语法不能混用；
- set/get 总是被调用，包括类内部自己访问这个属性时；
- 声明时的初始值直接写入，不经过 setter——所以上例 health = 100 不会触发 hp_changed；
- 访问器内部直接用变量名读写不会无限递归（语言层面做了处理）；但如果访问器调用了别的函数，而那个函数里又访问这个属性，就会再次触发访问器，形成无限递归——这是最常见的翻车点。

## 静态成员

static var 属于类而非实例，所有实例共享同一份。经典用法是实例计数：

```gdscript
class_name Student

static var class_size: int = 0
var name: String
var id: int

func _init(name: String) -> void:
    self.name = name     # self 区分成员与同名参数
    class_size += 1      # 所有实例共享同一个计数
    id = class_size      # 自动编号：第一个学生 1，第二个 2
```

注意：static var 不能使用 @export 或 @onready；局部变量也不能声明为 static。

## 内存管理

引擎对象的内存分两套规则：

- RefCounted（引用计数类）及其子类（包括 Resource）：引用计数管理，最后一个引用消失时自动释放，不需要手动 free；
- Node：不会自动释放，必须手动调用 free()（立即删除）或 queue_free()（推迟到帧末删除，并递归删除所有子节点，更安全）。

引用计数有一个著名的漏洞：循环引用。两个 RefCounted 对象互相持有引用时，计数永远无法归零，内存就泄漏了。官方提供的破环工具是 weakref() 弱引用——弱引用不增加引用计数：

```gdscript
var my_file_ref = weakref(my_file)     # 弱引用：不影响引用计数
var file_ref = my_file_ref.get_ref()   # 对象还活着则取回引用；已释放则得 null
if file_ref:
    file_ref.close()
```

判断一个对象是否已被释放（比如手里还留着已被 queue_free 的节点引用），用 is_instance_valid()：

```gdscript
if is_instance_valid(enemy):
    enemy.queue_free()
```

实践建议：纯数据对象、逻辑对象继承 RefCounted 或 Resource，把生命周期交给引擎托管；Node 交给场景树管理，删除时优先用 queue_free。

## 选基类建议

- 需要进入场景树、生命周期回调（_ready、_process）、信号机制，选 Node 系（Node2D、Node3D、Control 等）；
- 纯数据与纯逻辑、不进场景树，选 RefCounted；
- 需要序列化存盘、在检查器中编辑，选 Resource；
- 要完全自控内存（不走引用计数、手动 free），选 Object——高级用法且危险，慎用。

## 小结

- 三种类形式：无名类按路径 extends 或 load 后 .new()；class_name 全局注册（PascalCase，@icon 自定义图标，可与 extends 同行，Editor 开头的名字不进新建节点对话框）；内部类 class 声明，外部用 MyClass.MyInnerClass.new()，可嵌套。
- new() 调用 _init 构造；self 用于区分同名变量与链式调用；成员访问沿继承链向上，比数组字典慢。
- _init 有必填参数的类只能代码实例化（PackedScene.instantiate、duplicate 会失败）；_static_init 类加载时执行一次；无析构函数，用 _notification 监听 NOTIFICATION_PREDELETE 清理。
- extends 四形式：全局类、文件路径、其他文件的内部类、与 class_name 同行；不允许多重继承，默认继承 RefCounted；子类不能声明与父类同名不同参的方法（_init 除外）与同名属性；super(x) 与 super.method() 调父类；is 检查继承关系。
- 所有方法默认可重写（无 virtual/override）；只应重写下划线开头的内置方法，自定义可重写方法也建议 _ 前缀；@abstract（4.5+）抽象类不能实例化、具体子类必须实现全部抽象方法、可以没有抽象方法、内部类也可抽象。
- 属性访问器分内联与具名函数两种，不能混用；set/get 总是被调用；初始值不经过 setter；访问器内直接用变量名读写不会无限递归，但经其他函数再访问会。
- static var 属于类，所有实例共享；不能用 @export/@onready。
- RefCounted/Resource 引用计数自动释放；Node 必须手动 free()/queue_free()；循环引用会泄漏，用 weakref() 弱引用破环；is_instance_valid 检查对象是否已释放。
- 选基类：场景树与信号选 Node 系；纯数据逻辑选 RefCounted；需存盘选 Resource；完全自控内存选 Object（危险）。

## 参考链接

- [GDScript 教程：类（中文，代码 MIT 开源）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：继承（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 教程：多态与抽象类（中文）](https://godothub.com/oss/gdscript-tutorial/)
- [GDScript 基础（官方文档）](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
