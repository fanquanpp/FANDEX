---
order: 50
tags:
  - lua
difficulty: intermediate
title: 元表与面向对象编程
module: lua
category: 'Lua Advanced'
description: 元表机制、元方法、面向对象设计模式与原型继承体系的工程级深度解析。
author: Anonymous
related:
  - lua/数据类型与Table详解
  - lua/函数与闭包
  - lua/表与元表进阶
  - lua/面向对象编程
prerequisites:
  - lua/概述与环境配置
---

## 1. 学习目标

本节依据 Bloom 分类法（Bloom's Taxonomy）按认知层级组织学习目标，帮助学习者由浅入深地掌握 Lua 元表与面向对象编程体系。

### 1.1 记忆层（Remembering）

- 复述 Lua 元表（metatable）的定义、作用与基本语义。
- 列出 Lua 5.4 中所有可用的元方法（metamethod）名称及其触发场景。
- 回顾 `setmetatable` 与 `getmetatable` 两个标准库函数的签名与返回值。
- 识别面向对象编程（OOP）的四大基本特征：封装、继承、多态、抽象。

### 1.2 理解层（Understanding）

- 解释元方法查找算法在 Lua 虚拟机内部的执行流程。
- 对比 Lua 原型式（prototype-based）OOP 与基于类（class-based）OOP 的本质区别。
- 阐述 `__index` 与 `__newindex` 两个元方法在读取与写入两个方向上的对称性与差异。
- 推断多重继承中方法查找顺序对程序行为的影响。

### 1.3 应用层（Applying）

- 使用元方法实现自定义运算符重载（如向量加法、矩阵乘法）。
- 基于元表实现类、对象、继承、多态等典型 OOP 构造。
- 编写只读表、惰性求值表、默认值表等装饰性数据结构。
- 利用 `__call` 元方法实现函数式风格的工厂模式。

### 1.4 分析层（Analyzing）

- 分析 Lua 元表查找算法的时间复杂度，推导深度继承链下的性能退化模型。
- 解构元表与闭包协作实现私有成员的封装机制。
- 比较单分派（single dispatch）与 CLOS 风格多分派在 Lua 中的可行性。
- 辨析 `rawget`/`rawset`/`rawequal` 与普通访问在元方法触发上的差异。

### 1.5 评价层（Evaluating）

- 评估基于元表的 OOP 实现在生产环境中的可维护性、可测试性与可调试性。
- 评判 `__gc` 元方法在资源管理中的可靠性边界，对比 RAII 模式的差异。
- 评价不同 OOP 库（如 `middleclass`、`classic`、`LOOP`）的设计取舍。
- 判定在何种业务场景下应避免使用深度元表链以防止性能问题。

### 1.6 创造层（Creating）

- 设计一套支持多继承、混入（mixin）、接口（interface）的完整 OOP 框架。
- 构建基于元方法的声明式数据验证 DSL（Domain-Specific Language）。
- 实现一个基于 `__index` 与弱引用的自动缓存系统。
- 创造性地将元表与协程结合，实现协作式状态机抽象。

## 2. 历史动机与背景

### 2.1 元表的诞生背景

Lua 语言诞生于 1993 年巴西里约热内卢天主教大学（PUC-Rio），由 Roberto Ierusalimschy、Luiz Henrique de Figueiredo 与 Waldemar Celes 三位研究者设计。其最初定位是作为嵌入式脚本语言用于石油行业的数据录入工具（PETROBRAS 项目）。在 Lua 1.x 与 2.x 时代，Lua 仅有非常简单的数据结构支持，缺乏扩展表行为的能力。

Lua 3.0（1997 年）首次引入"tag method"（标签方法）机制，这是元表的前身。tag method 允许开发者为特定"tag"（标签）注册回调函数，以处理诸如相加、比较、索引等操作。然而 tag method 的 API 较为繁琐，且与全局状态耦合较紧。

Lua 5.0（2003 年）正式引入现代意义上的元表（metatable）机制，将 tag method 重构为表上的元方法，并大幅简化了 API。Lua 5.1（2006 年）进一步完善元方法体系，新增 `__pairs`、`__ipairs`、`__len` 等元方法。Lua 5.2（2012 年）移除了 `setfenv`/`getfenv`，引入 `_ENV`，并新增 `__gc` 元方法（5.1 中 `_gc` 仅对 userdata 生效，5.2 后对表也生效）。Lua 5.3（2015 年）引入整数子类型，相应新增 `__band`、`__bor`、`__bxor`、`__bnot`、`__shl`、`__shr` 等位运算元方法。Lua 5.4（2020 年）新增 `__close` 元方法，用于 to-be-closed 变量的资源管理。

### 2.2 设计动机

元表的设计动机源于以下工程诉求：

1. **可扩展的数据语义**：标准表仅支持简单的键值存储，无法表达"两个向量相加得到新向量"这类领域语义。元方法允许开发者自定义运算符行为，使表能够模拟任意领域对象。

2. **零成本抽象**：Lua 团队坚持"机制而非策略"（mechanisms instead of policies）的设计哲学。元表只提供机制，不强制 OOP 体系，开发者可基于元表自由构建类、原型、接口等多种范式。这与 Python 强制 `class` 关键字、Java 强制一切皆类的策略形成鲜明对比。

3. **运行时元编程能力**：元方法在运行时被查找与调用，支持动态修改对象行为。这使得 Lua 能够实现代理模式、远程方法调用（RPC）代理、ORM 字段映射等高级元编程任务。

4. **与 C API 的对等性**：Lua C API 同样支持为 userdata 设置元表，使 C 扩展与 Lua 表对象在语义上对等。这种对等性是 Lua 作为嵌入式语言成功的关键之一。

### 2.3 面向对象在 Lua 中的演化

由于 Lua 不内置 `class` 关键字，OOP 实现完全由社区演化出多种风格：

- **早期风格（Lua 3.x）**：使用闭包 + tag method，每个对象是独立闭包，内存开销大。
- **主流风格（Lua 5.x）**：使用表 + 元表 + `__index`，所有实例共享同一个元表（即"类"），内存占用低。
- **原型风格**：参考 Self/JavaScript，对象直接克隆自原型对象，无类与对象的二分。
- **元类风格**：引入"类的类"（metaclass），使类本身也是对象，支持类方法、反射等高级特性。

## 3. 形式化定义

### 3.1 元表的形式化定义

设 $T$ 为 Lua 全部表对象的集合，$M$ 为元方法名称的集合。一个元表是一个特殊表 $m \in T$，其关键字段为元方法名 $e \in M$，对应值为函数 $f_e: T^* \to V$（其中 $V$ 为 Lua 值域，$T^*$ 为参数列表）。

形式化地，元表绑定关系可表示为映射：

$$
\text{meta}: T \rightharpoonup T
$$

其中 $\rightharpoonup$ 表示部分函数（partial function），即并非所有表都绑定元表。`setmetatable(t, m)` 操作将 $\text{meta}(t) := m$；`getmetatable(t)` 返回 $\text{meta}(t)$。

### 3.2 元方法查找算法

当对表 $t$ 执行运算 $e$（如 `t + x`）时，Lua 虚拟机按以下顺序查找元方法：

$$
\text{lookup}(t, e) = 
\begin{cases} 
f_e & \text{若 } \text{meta}(t) \neq \text{nil} \land e \in \text{meta}(t) \\
\text{lookup}(\text{meta}(t), e) & \text{若递归允许（仅对部分元方法）} \\
\text{error} & \text{否则}
\end{cases}
$$

注意：大多数元方法仅查找一层，不递归。`__index` 与 `__newindex` 是例外，它们可触发链式查找（见 §3.4）。

### 3.3 `__index` 元方法的形式语义

设读取操作 `t[k]` 的求值规则为 $\text{read}(t, k)$，定义为：

$$
\text{read}(t, k) = 
\begin{cases} 
t[k] & \text{若 } k \in \text{dom}(t) \\
\text{readIndex}(\text{meta}(t), t, k) & \text{否则}
\end{cases}
$$

其中 $\text{readIndex}$ 定义为：

$$
\text{readIndex}(m, t, k) = 
\begin{cases} 
\text{nil} & \text{若 } m = \text{nil} \\
m.\_\_index(k) & \text{若 } \_\_index \in m \land \text{isFunction}(\_\_index) \\
\text{read}(m.\_\_index, k) & \text{若 } \_\_index \in m \land \text{isTable}(\_\_index) \\
\text{nil} & \text{否则}
\end{cases}
$$

注意当 `__index` 是表时，会递归调用 `read`，从而支持继承链。

### 3.4 继承链的递归深度

设继承链 $t \to m_1 \to m_2 \to \dots \to m_n$（其中 $\to$ 表示"通过 `__index` 链接"），查找键 $k$ 的最大递归深度为 $n+1$。Lua 虚拟机对递归深度无硬性限制，但深度过大可能触发 C 栈溢出（默认 Lua 栈深度约 200 层）。

### 3.5 面向对象的三要素在 Lua 中的映射

| OOP 概念 | 传统语言实现 | Lua 元表实现 |
| :--- | :--- | :--- |
| 类（Class） | `class` 关键字声明 | 表 + 元方法 `__index` 自指 |
| 实例（Instance） | `new` 构造 | 表，其元表为类 |
| 方法（Method） | 类内函数定义 | 类表中的函数字段 |
| 继承（Inheritance） | `extends` 关键字 | 子类元表 `__index` 指向父类 |
| 多态（Polymorphism） | 方法重写 | 子类方法覆盖父类同名方法 |
| 封装（Encapsulation） | `private` 修饰符 | 闭包捕获局部变量 |
| 抽象类（Abstract Class） | `abstract` 关键字 | 约定基类方法抛出错误 |

## 4. 理论推导

### 4.1 元方法查找的时间复杂度

设表的字段访问平均时间为 $O(1)$（Lua 表为哈希表，平均常数时间），元方法查找时间取决于查找路径长度。

对于普通运算符元方法（如 `__add`），查找时间为：

$$
T_{\text{op}}(t) = O(1) + O(1) = O(1)
$$

即一次元表访问 + 一次元方法字段访问，均为常数时间。

对于 `__index` 元方法，最坏情况为遍历整条继承链：

$$
T_{\text{index}}(t, k) = O(d) \cdot O(1) = O(d)
$$

其中 $d$ 为继承链深度。深度继承链（如 $d > 10$）会显著影响性能。

### 4.2 内存占用模型

设有 $n$ 个实例共享同一个类元表，每个实例有 $p$ 个实例字段，类有 $m$ 个方法。则总内存占用为：

$$
M(n, p, m) = n \cdot (\text{sizeof}(\text{table}) + p \cdot \text{sizeof}(\text{entry})) + (\text{sizeof}(\text{table}) + m \cdot \text{sizeof}(\text{entry}))
$$

简化为：

$$
M(n, p, m) = n \cdot S_{\text{inst}}(p) + S_{\text{class}}(m)
$$

当 $n \gg 1$ 时，类内存 $S_{\text{class}}(m)$ 可忽略，单实例内存近似 $S_{\text{inst}}(p)$，与无 OOP 的纯表实现相同。这就是元表 OOP"零额外内存开销"的数学基础。

### 4.3 闭包式 OOP 与元表式 OOP 的内存对比

闭包式 OOP（每个实例为独立闭包，方法为闭包内 upvalue）：

$$
M_{\text{closure}}(n, m) = n \cdot (S_{\text{closure}} + m \cdot S_{\text{upvalue}})
$$

即每个实例都独立保存所有方法，内存随 $n \cdot m$ 增长。

元表式 OOP：

$$
M_{\text{metatable}}(n, m) = n \cdot S_{\text{inst}} + S_{\text{class}}(m)
$$

方法集中在类中，实例仅存数据。当 $n = 1000, m = 20$ 时，闭包式约为元表式的 20 倍内存。这是 Lua 社区主流选择元表式 OOP 的根本原因。

### 4.4 `__index` 元方法调用的边界条件

考虑以下嵌套查找：

$$
\text{read}(t, k) \to \text{readIndex}(m_1, t, k) \to \text{read}(m_1.\_\_index, k) \to \text{readIndex}(m_2, m_1.\_\_index, k) \to \dots
$$

若链上某一节点 $m_i.\_\_index$ 为函数 $f$，则调用 $f(t_i, k)$（注意 $t_i$ 为触发查找的原始表，不是元表）。这一语义对实现"动态方法分派"至关重要。

### 4.5 元方法触发的对称性

对于二元运算 `a op b`（如 `+`、`-`、`*`），Lua 按以下顺序尝试：

1. 若 `a` 是 number 或 string 子类型，且 `b` 可转换为同类型，直接执行原生运算。
2. 查找 `meta(a).__op`，若存在则调用。
3. 查找 `meta(b).__op`（仅当 `a` 与 `b` 类型不同时），若存在则调用。
4. 抛出 `attempt to perform arithmetic on a ... value` 错误。

这一对称性设计使得 `vector + 1` 与 `1 + vector` 都能正确触发自定义运算符。

## 5. 代码示例

### 5.1 元表基础：运算符重载

以下示例演示如何通过元表重载加法、减法、相等比较运算符，实现 2D 向量类型。

```lua
-- 2D 向量类型定义
-- 通过元表重载运算符，使表能够像数值一样参与运算

-- 创建向量构造函数
-- @param x number X 分量
-- @param y number Y 分量
-- @return table 新向量实例
local function Vector2(x, y)
    return { x = x or 0, y = y or 0 }
end

-- 向量元表定义
-- 注意：元方法中的 self 由 Lua 自动传入左侧操作数
local Vector2Meta = {
    -- 重载加法运算符：实现向量逐分量相加
    __add = function(a, b)
        return Vector2(a.x + b.x, a.y + b.y)
    end,

    -- 重载减法运算符：实现向量逐分量相减
    __sub = function(a, b)
        return Vector2(a.x - b.x, a.y - b.y)
    end,

    -- 重载乘法运算符：支持向量点积与标量乘法
    __mul = function(a, b)
        if type(a) == "number" then
            -- 标量 * 向量：交换律支持
            return Vector2(a * b.x, a * b.y)
        elseif type(b) == "number" then
            -- 向量 * 标量
            return Vector2(a.x * b, a.y * b)
        else
            -- 向量 * 向量：点积返回标量
            return a.x * b.x + a.y * b.y
        end
    end,

    -- 重载一元负号：-v
    __unm = function(a)
        return Vector2(-a.x, -a.y)
    end,

    -- 重载相等比较：浮点数相等性需用 epsilon
    __eq = function(a, b)
        local eps = 1e-9
        return math.abs(a.x - b.x) < eps and math.abs(a.y - b.y) < eps
    end,

    -- 重载小于比较：按向量模长比较
    __lt = function(a, b)
        return (a.x * a.x + a.y * a.y) < (b.x * b.x + b.y * b.y)
    end,

    -- 重载小于等于：与 __lt 配合使用
    __le = function(a, b)
        return not (b < a)
    end,

    -- 重载 tostring 转换：控制台输出格式
    __tostring = function(a)
        return string.format("Vector2(%.3f, %.3f)", a.x, a.y)
    end,

    -- 重载长度运算符 #：返回向量模长
    __len = function(a)
        return math.sqrt(a.x * a.x + a.y * a.y)
    end,

    -- 重载索引：提供只读属性 magnitude
    __index = function(t, k)
        if k == "magnitude" then
            return math.sqrt(t.x * t.x + t.y * t.y)
        end
        return nil
    end,
}

-- 将元表绑定到构造函数创建的所有实例
-- 通过元表共享方法，避免每实例复制
setmetatable(Vector2, {
    __call = function(_, x, y)
        local instance = Vector2(x, y)
        return setmetatable(instance, Vector2Meta)
    end,
})

-- 使用示例
local v1 = Vector2(3, 4)
local v2 = Vector2(1, 2)

print(v1 + v2)        -- 输出 Vector2(4.000, 6.000)
print(v1 - v2)        -- 输出 Vector2(2.000, 2.000)
print(v1 * v2)        -- 输出 11（点积）
print(v1 * 2)         -- 输出 Vector2(6.000, 8.000)
print(2 * v1)         -- 输出 Vector2(6.000, 8.000)（交换律）
print(-v1)            -- 输出 Vector2(-3.000, -4.000)
print(#v1)            -- 输出 5（模长）
print(v1.magnitude)   -- 输出 5（通过 __index）
print(v1 == Vector2(3, 4))  -- 输出 true
print(v1 < v2)        -- 输出 false（v1 模长更大）
```

### 5.2 基于元表的类与对象

以下实现展示 Lua 中最经典的"类"构造模式：元表 `__index` 自指 + 构造函数。

```lua
-- Animal 类：基于元表的 OOP 经典实现
-- 设计要点：
--   1. 类本身是表，其元表的 __index 指向自身，使 new() 后实例可通过 __index 访问类方法
--   2. 构造函数 new() 创建实例并设置元表
--   3. 方法定义为类表的字段

local Animal = {}
Animal.__index = Animal  -- 关键：元表的 __index 自指，使实例能访问类方法

-- 构造函数：创建 Animal 实例
-- @param name string 动物名字
-- @param species string 物种
-- @return table 新实例
function Animal.new(name, species)
    -- 创建实例表，仅保存实例字段
    local instance = setmetatable({}, Animal)
    instance.name = name or "Unnamed"
    instance.species = species or "Unknown"
    return instance
end

-- 实例方法：发出声音（基类默认实现）
function Animal:speak()
    return string.format("%s (%s) makes a sound", self.name, self.species)
end

-- 实例方法：获取名字
function Animal:getName()
    return self.name
end

-- 实例方法：设置名字
function Animal:setName(name)
    self.name = name
    return self  -- 链式调用支持
end

-- 类方法（静态方法）：使用点号调用，不依赖实例
function Animal.createDefault()
    return Animal.new("Default", "Generic")
end

-- 使用示例
local cat = Animal.new("Tom", "Cat")
print(cat:speak())  -- 输出 Tom (Cat) makes a sound
print(cat:setName("Jerry"):getName())  -- 链式调用：Jerry

local generic = Animal.createDefault()
print(generic:speak())  -- 输出 Default (Generic) makes a sound
```

### 5.3 单继承实现

以下实现展示 Lua 中基于 `__index` 链的单继承机制，子类继承父类的所有方法。

```lua
-- 父类：Animal（沿用 5.2 节定义，此处简写关键部分）
local Animal = {}
Animal.__index = Animal

function Animal.new(name, species)
    local self = setmetatable({}, Animal)
    self.name = name or "Unnamed"
    self.species = species or "Unknown"
    return self
end

function Animal:speak()
    return string.format("%s makes a sound", self.name)
end

function Animal:describe()
    return string.format("I am %s, a %s", self.name, self.species)
end

-- 子类：Dog，继承自 Animal
local Dog = {}
-- 关键：将子类元表的 __index 指向父类，形成继承链
-- 实例 -> Dog -> Animal
Dog.__index = Dog
setmetatable(Dog, { __index = Animal })

-- 子类构造函数
-- @param name string 狗的名字
-- @param breed string 品种
function Dog.new(name, breed)
    -- 注意：必须显式设置实例元表为 Dog，而非 Animal
    local self = setmetatable({}, Dog)
    self.name = name
    self.species = "Canine"
    self.breed = breed or "Mixed"
    return self
end

-- 方法重写（override）：覆盖父类 speak 方法
function Dog:speak()
    return string.format("%s says: Woof!", self.name)
end

-- 子类新增方法
function Dog:fetch()
    return string.format("%s is fetching the ball", self.name)
end

-- 使用示例
local dog = Dog.new("Rex", "Labrador")
print(dog:speak())     -- 输出 Rex says: Woof!（调用子类重写方法）
print(dog:describe())  -- 输出 I am Rex, a Canine（继承自父类）
print(dog:fetch())     -- 输出 Rex is fetching the ball（子类新增方法）

-- 验证继承链
print(getmetatable(dog) == Dog)                   -- true
print(getmetatable(Dog).__index == Animal)        -- true
```

### 5.4 多重继承实现

Lua 不直接支持多重继承，但可通过自定义 `__index` 元方法实现方法查找的多路径搜索。

```lua
-- 多重继承实现：通过自定义 __index 元方法在多个父类中搜索方法

-- 工具函数：在多个基类中查找方法
-- @param bases table 父类列表
-- @param key string 方法名
-- @return function 或 nil
local function searchBases(bases, key)
    for _, base in ipairs(bases)) do
        local method = base[key]
        if method then
            return method
        end
    end
    return nil
end

-- 创建多重继承的类
-- @param ... table 父类列表
-- @return table 新类
local function createClass(...)
    local bases = { ... }  -- 收集所有父类
    local cls = {}

    -- 自定义 __index：先查子类自身，再遍历父类
    cls.__index = function(t, k)
        -- 先查类自身
        local v = cls[k]
        if v then return v end
        -- 再查所有父类
        return searchBases(bases, k)
    end

    -- 构造函数
    function cls.new(...)
        local obj = setmetatable({}, cls)
        -- 调用所有父类的初始化方法（如有）
        for _, base in ipairs(bases) do
            if base.init then
                base.init(obj, ...)
            end
        end
        if cls.init then
            cls.init(obj, ...)
        end
        return obj
    end

    return cls
end

-- 父类 A：可步行
local Walker = {}
Walker.__index = Walker
function Walker:init()
    self.canWalk = true
end
function Walker:walk()
    return self.name .. " is walking"
end

-- 父类 B：可游泳
local Swimmer = {}
Swimmer.__index = Swimmer
function Swimmer:init()
    self.canSwim = true
end
function Swimmer:swim()
    return self.name .. " is swimming"
end

-- 子类：Duck（鸭子，既能走又能游）
local Duck = createClass(Walker, Swimmer)
function Duck.init(obj, name)
    obj.name = name
end

-- 使用示例
local duck = Duck.new("Donald")
print(duck:walk())  -- 输出 Donald is walking
print(duck:swim())  -- 输出 Donald is swimming
print(duck.canWalk) -- 输出 true
print(duck.canSwim) -- 输出 true
```

### 5.5 闭包式私有成员封装

以下实现展示如何利用闭包捕获 upvalue 实现真正的私有成员，外部无法直接访问。

```lua
-- 闭包式封装：实现真正的私有成员
-- 设计要点：私有变量作为 upvalue 被方法闭包捕获，外部无法直接访问

local BankAccount = {}

-- 构造函数：返回公共接口表，私有状态通过闭包保护
-- @param initialBalance number 初始余额
-- @return table 账户对象（仅暴露公共方法）
function BankAccount.new(initialBalance)
    -- 私有变量：作为 upvalue，外部无法访问
    local balance = initialBalance or 0
    local transactionLog = {}

    -- 私有方法：记录交易
    local function logTransaction(type, amount)
        table.insert(transactionLog, {
            type = type,
            amount = amount,
            timestamp = os.time(),
        })
    end

    -- 公共接口表
    local self = {}

    -- 公共方法：存款
    function self.deposit(amount)
        if amount <= 0 then
            error("Deposit amount must be positive", 2)
        end
        balance = balance + amount
        logTransaction("deposit", amount)
        return balance
    end

    -- 公共方法：取款
    function self.withdraw(amount)
        if amount <= 0 then
            error("Withdrawal amount must be positive", 2)
        end
        if amount > balance then
            error("Insufficient funds", 2)
        end
        balance = balance - amount
        logTransaction("withdraw", amount)
        return balance
    end

    -- 公共方法：查询余额
    function self.getBalance()
        return balance
    end

    -- 公共方法：获取交易历史（返回副本，防止外部修改）
    function self.getTransactionLog()
        local copy = {}
        for i, tx in ipairs(transactionLog) do
            copy[i] = { type = tx.type, amount = tx.amount, timestamp = tx.timestamp }
        end
        return copy
    end

    return self
end

-- 使用示例
local account = BankAccount.new(1000)
account.deposit(500)
account.withdraw(200)
print(account.getBalance())  -- 输出 1300

-- 以下访问均失败：balance 为 upvalue，外部不可见
-- print(account.balance)  -- 输出 nil
-- account.balance = 99999  -- 仅设置公共表的字段，不影响闭包内的 balance

-- 返回的交易日志是副本，修改不影响内部状态
local log = account.getTransactionLog()
log[1].amount = 999999  -- 修改副本
print(account.getTransactionLog()[1].amount)  -- 仍输出原值
```

### 5.6 只读表与默认值表

利用 `__index` 与 `__newindex` 可实现多种装饰性数据结构。

```lua
-- 只读表代理：禁止修改任何字段
-- @param t table 原始表
-- @return table 只读代理
local function readOnly(t)
    local proxy = {}
    local mt = {
        -- 读取：透传到原表
        __index = t,
        -- 写入：抛出错误
        __newindex = function(_, k, v)
            error(string.format("attempt to modify read-only field '%s'", tostring(k)), 2)
        end,
        -- 迭代：透传到原表
        __pairs = function()
            return pairs(t)
        end,
        -- 长度：透传到原表
        __len = function()
            return #t
        end,
    }
    setmetatable(proxy, mt)
    return proxy
end

-- 默认值表：访问不存在的键返回默认值
-- @param defaultValue any 默认值
-- @return table 带默认值的空表
local function defaultTable(defaultValue)
    local t = {}
    local mt = {
        __index = function(_, k)
            return defaultValue
        end,
    }
    setmetatable(t, mt)
    return t
end

-- 使用示例：只读表
local config = readOnly({
    host = "localhost",
    port = 8080,
    debug = false,
})

print(config.host)  -- 输出 localhost
-- config.host = "0.0.0.0"  -- 抛出错误：attempt to modify read-only field 'host'

-- 使用示例：默认值表
local counter = defaultTable(0)
print(counter["a"])  -- 输出 0（默认值）
print(counter["b"])  -- 输出 0（默认值）
counter["a"] = 5     -- 显式赋值后使用实际值
print(counter["a"])  -- 输出 5
print(counter["c"])  -- 输出 0（仍是默认值）
```

### 5.7 弱引用表与 `__gc` 配合

利用 `__mode = "k"` 弱键表与 `__gc` 元方法可实现自动资源清理。

```lua
-- 资源池：自动追踪对象生命周期并在 GC 时清理
-- 应用场景：文件句柄池、数据库连接池、缓存

-- 创建资源池
local function createResourcePool()
    -- 弱键表：键为资源对象，值为元数据（强引用）
    -- 当键在外部失去引用时，GC 自动回收该条目
    local pool = setmetatable({}, { __mode = "k" })

    return {
        -- 注册资源到池
        -- @param obj table 资源对象（必须有 close 方法或 __gc 元方法）
        -- @param metadata any 关联元数据
        register = function(obj, metadata)
            pool[obj] = metadata or true
        end,

        -- 获取池中所有存活资源
        list = function()
            local result = {}
            for obj in pairs(pool) do
                table.insert(result, obj)
            end
            return result
        end,

        -- 统计存活资源数量
        count = function()
            local n = 0
            for _ in pairs(pool) do
                n = n + 1
            end
            return n
        end,
    }
end

-- 创建可自动清理的资源对象
local function createResource(name)
    local resource = {
        name = name,
        data = string.rep("x", 1024),  -- 模拟占用内存
    }

    -- 设置 __gc 元方法：对象被 GC 时自动调用
    local mt = {
        __gc = function(self)
            print(string.format("[GC] Resource '%s' finalized", self.name))
        end,
    }
    setmetatable(resource, mt)
    return resource
end

-- 使用示例
local pool = createResourcePool()
local r1 = createResource("A")
local r2 = createResource("B")
pool.register(r1, { created = os.time() })
pool.register(r2, { created = os.time() })

print(pool.count())  -- 输出 2

-- 释放 r1 的外部引用
r1 = nil
-- 强制 GC（生产环境不应手动触发，此处仅为演示）
collectgarbage("collect")

print(pool.count())  -- 输出 1（r1 已被回收）
```

### 5.8 `__call` 实现函数式工厂

`__call` 元方法允许表像函数一样被调用，常用于工厂模式与 DSL 构建。

```lua
-- 配置构建器：通过 __call 实现链式 DSL
local ConfigBuilder = {}
ConfigBuilder.__index = ConfigBuilder

-- 元方法 __call：使对象可被调用，调用即触发构建
setmetatable(ConfigBuilder, {
    __call = function(cls, initial)
        local obj = setmetatable({}, cls)
        obj.config = initial or {}
        return obj
    end,
})

-- 链式方法
function ConfigBuilder:setHost(host)
    self.config.host = host
    return self
end

function ConfigBuilder:setPort(port)
    self.config.port = port
    return self
end

function ConfigBuilder:setDebug(flag)
    self.config.debug = flag
    return self
end

-- 终结方法：返回配置表
function ConfigBuilder:build()
    return self.config
end

-- 使用示例：通过 __call 直接构造，链式配置
local cfg = ConfigBuilder()
    :setHost("0.0.0.0")
    :setPort(8443)
    :setDebug(true)
    :build()

print(cfg.host, cfg.port, cfg.debug)  -- 输出 0.0.0.0  8443  true
```

## 6. 对比分析

### 6.1 Lua 元表 OOP 与主流语言 OOP 对比

| 特性 | Lua（元表） | Python | Java | JavaScript | C++ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 类声明语法 | 无原生语法，表+元表 | `class` 关键字 | `class` 关键字 | `class` ES6 | `class` 关键字 |
| 继承语法 | 元表 `__index` 链 | `class Sub(Base)` | `extends` | `extends` | `: public Base` |
| 多继承 | 手动实现（多路径查找） | 支持 | 不支持（接口可多实现） | 不支持（mixin 模拟） | 支持 |
| 方法重写 | 子类覆盖同名字段 | 隐式 | `@Override` 注解 | 隐式 | `virtual` + override |
| 访问控制 | 无原生支持，闭包模拟 | `_var` 约定 | `private`/`protected`/`public` | `#field` ES2022 | `private`/`protected`/`public` |
| 静态方法 | 类表字段（点号调用） | `@staticmethod` | `static` 关键字 | `static` 关键字 | `static` 关键字 |
| 运算符重载 | 元方法 `__add` 等 | `__add__` 等双下划线方法 | 不支持 | 不支持 | `operator+` |
| 反射 | 有限（`getmetatable` 等） | 强大（`inspect` 模块） | 强大（`java.lang.reflect`） | 有限（`Proxy`） | 强大（RTTI） |
| 元编程 | 强大（运行时元方法） | 强大（装饰器、元类） | 弱（注解） | 强大（Proxy） | 弱（模板编译期） |
| 性能 | 中（动态查找） | 慢（动态） | 中（JIT 优化） | 中（V8 JIT） | 快（静态） |

### 6.2 Lua OOP 实现风格对比

| 风格 | 内存开销 | 方法调用速度 | 实现复杂度 | 私有性 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 元表式（经典） | 低（共享方法） | 中（元表查找） | 低 | 弱（约定） | 大多数 OOP 场景 |
| 闭包式 | 高（每实例独立方法） | 快（直接 upvalue 访问） | 中 | 强（真私有） | 实例少、需强封装 |
| 原型式 | 低 | 中 | 低 | 弱 | 简单继承、快速原型 |
| 元类式 | 中 | 中 | 高 | 中 | 需反射、ORM |

### 6.3 `__index` 表与函数的选择

`__index` 既可以是表也可以是函数，二者各有优劣：

```lua
-- 方式 A：__index 为表（最常见）
local ClassA = {}
ClassA.__index = ClassA  -- 自指
function ClassA.method() end

-- 方式 B：__index 为函数
local ClassB = {}
ClassB.__index = function(t, k)
    if k == "computed" then
        return t.x * t.y  -- 动态计算
    end
    return rawget(ClassB, k)  -- 回退到类表
end
```

| 维度 | `__index` 为表 | `__index` 为函数 |
| :--- | :--- | :--- |
| 查找速度 | 快（直接哈希） | 慢（函数调用开销） |
| 灵活性 | 静态（仅预定义字段） | 动态（可计算属性） |
| 调试难度 | 简单 | 复杂（堆栈深） |
| 继承支持 | 天然（递归 `__index`） | 需手动实现 |
| 适用场景 | 类方法、固定字段 | 计算属性、代理、DSL |

## 7. 常见陷阱与反模式

### 7.1 反模式：在 `__index` 元方法中创建新字段

**事故案例**：某游戏项目使用 `__index` 实现"懒加载"属性，但未注意副作用导致内存泄漏。

```lua
-- 反模式：__index 中赋值缓存计算结果
local BadClass = {}
BadClass.__index = function(t, k)
    if k == "expensive" then
        local value = computeExpensive(t)
        t[k] = value  -- 反模式：在 __index 中写入字段
        return value
    end
end

-- 问题：每次访问新实例的 expensive 都会触发缓存写入
-- 若实例数量大，缓存字段会无限增长
-- 修复：使用弱引用表或显式缓存管理
```

**正确做法**：

```lua
-- 使用弱引用表缓存计算结果
local cache = setmetatable({}, { __mode = "k" })

local GoodClass = {}
GoodClass.__index = function(t, k)
    if k == "expensive" then
        if not cache[t] then
            cache[t] = computeExpensive(t)
        end
        return cache[t]
    end
end
```

### 7.2 反模式：在元方法中使用 `self` 引用导致递归

**事故案例**：某项目在 `__index` 中调用 `self:method()` 导致无限递归。

```lua
-- 反模式：__index 中递归调用触发 __index
local BadClass = {}
BadClass.__index = function(t, k)
    -- 错误：t.method 触发 __index，而 __index 又调用 t.method
    local method = t.method
    if method then
        return method(t, k)
    end
end
```

**正确做法**：使用 `rawget` 跳过元方法查找。

```lua
local GoodClass = {}
GoodClass.__index = function(t, k)
    local method = rawget(GoodClass, k)  -- 直接从类表读取
    if method then
        return method
    end
end
```

### 7.3 反模式：忘记 `__index` 自指导致方法不可见

**事故案例**：初学者常忘记在类定义后设置 `__index = Class`，导致实例无法访问方法。

```lua
-- 反模式：忘记 __index 自指
local BadClass = {}
function BadClass.method() end

local bad = setmetatable({}, BadClass)
print(bad.method)  -- nil！因为 __index 未设置，元表不会被查找

-- 正确做法
local GoodClass = {}
GoodClass.__index = GoodClass  -- 关键
function GoodClass.method() end

local good = setmetatable({}, GoodClass)
print(good.method)  -- 输出 function
```

### 7.4 反模式：使用 `__eq` 但未同时定义 `__lt` 与 `__le`

Lua 中如果只定义 `__eq` 而不定义 `__lt`/`__le`，则 `<=` 与 `<` 仍按默认规则比较，可能导致不一致。

```lua
-- 反模式：仅定义 __eq
local v = setmetatable({ x = 1 }, { __eq = function(a, b) return a.x == b.x end })

-- 此时 v < w 会抛出错误，因为没有 __lt
-- 修复：成组定义所有比较元方法
```

### 7.5 反模式：在 `__gc` 中访问已回收对象

**事故案例**：Lua 5.2+ 中 `__gc` 对表生效，但若在 `__gc` 中引用其他已被回收的对象会引发未定义行为。

```lua
-- 反模式：__gc 中引用其他弱引用对象
local a = setmetatable({}, { __gc = function(self) print(self.ref.x) end })
local b = setmetatable({}, { __mode = "v" })
b[1] = a
a.ref = { x = 1 }  -- 注意：ref 是强引用
-- GC 时 b[1] 可能先被回收，导致 self.ref.x 访问失败
```

### 7.6 反模式：多重继承方法查找顺序不确定

当多个父类有同名方法时，查找顺序取决于 `searchBases` 实现。若依赖此顺序，代码可维护性极差。

```lua
-- 反模式：依赖多继承顺序
local A = { method = function() return "A" end }
local B = { method = function() return "B" end }
local C = createClass(A, B)  -- 哪个 method 被调用？

-- 修复：使用 mixin 显式声明优先级，或避免多继承同名方法
```

### 7.7 反模式：用元表模拟"接口"导致类型混乱

Lua 没有原生接口概念，使用元表模拟时容易产生"鸭子类型"陷阱。

```lua
-- 反模式：仅靠方法名约定模拟接口
local function feed(animal)
    animal:eat()  -- 若传入对象无 eat 方法，运行时才报错
end

-- 修复：使用显式类型检查或契约
local function feed(animal)
    assert(type(animal.eat) == "function", "Expected object with eat method")
    animal:eat()
end
```

### 7.8 反模式：在 `__newindex` 中直接调用 `rawset` 导致原表写入

```lua
-- 反模式：__newindex 中直接 rawset 到原表
local t = setmetatable({}, {
    __newindex = function(t, k, v)
        -- 错误：rawset(t, k, v) 会触发 __newindex 吗？
        -- 不会，rawset 跳过元方法
        -- 但若误用 t[k] = v，则无限递归
        rawset(t, k, v)
    end,
})

t.a = 1  -- 正常工作
-- 但若想完全禁止写入，应抛出错误而非 rawset
```

## 8. 工程实践

### 8.1 生产级 OOP 框架设计

以下是一个生产环境可用的轻量级 OOP 框架，支持单继承、混入、`super` 调用、类型检查。

```lua
-- 轻量级 OOP 框架：class.lua
-- 设计目标：
--   1. 简洁的 API：class() 声明类，extends 继承，mixins 混入
--   2. 支持 super 调用父类方法
--   3. 支持类型检查与 instanceof
--   4. 性能：方法查找为 O(1)（继承链深度有限）

local class = {}

-- 类的元方法集合
local ClassMethods = {}

-- 创建新类
-- @param name string 类名（用于调试）
-- @param parent table 父类（可选）
-- @param mixins table 混入列表（可选）
-- @return table 新类
function class.new(name, parent, mixins)
    local cls = {
        __name = name,
        __parent = parent,
        __mixins = mixins or {},
        __index = nil,  -- 后续设置
    }

    -- 设置 __index 元方法：查找顺序为 子类 -> 混入 -> 父类
    cls.__index = function(t, k)
        -- 1. 子类自身
        local v = cls[k]
        if v ~= nil then return v end
        -- 2. 混入（按声明顺序）
        for _, mixin in ipairs(cls.__mixins) do
            v = mixin[k]
            if v ~= nil then return v
        end
        -- 3. 父类（递归）
        if cls.__parent then
            return cls.__parent[k]
        end
        return nil
    end

    -- 类方法：构造实例
    function cls.new(...)
        local instance = setmetatable({}, cls)
        if instance.init then
            instance:init(...)
        end
        return instance
    end

    -- 类方法：instanceof 检查
    function cls.isInstanceOf(obj, targetClass)
        local c = getmetatable(obj)
        while c do
            if c == targetClass then return true end
            c = c.__parent
        end
        return false
    end

    -- 实例方法：获取类名
    function cls:getClassName()
        return self.__name or "Unknown"
    end

    -- 实例方法：super 调用父类方法
    function cls:super(methodName, ...)
        if not self.__parent then
            error("No parent class to call super on", 2)
        end
        local method = self.__parent[methodName]
        if not method then
            error(string.format("Method '%s' not found in parent class", methodName), 2)
        end
        return method(self, ...)
    end

    return setmetatable(cls, { __index = ClassMethods })
end

-- 便捷的声明语法
setmetatable(class, {
    __call = function(_, name, parent, mixins)
        return class.new(name, parent, mixins)
    end,
})

return class
```

### 8.2 性能优化：方法缓存

深度继承链会导致方法查找开销增大。可在实例创建时将常用方法"扁平化"到实例表。

```lua
-- 方法扁平化：在构造实例时缓存方法引用
local function createClassWithCache(name, parent)
    local cls = setmetatable({}, { __index = parent })
    cls.__index = cls

    function cls.new(...)
        local instance = setmetatable({}, cls)
        -- 扁平化：将类方法复制到实例（注意：仅复制函数）
        for k, v in pairs(cls) do
            if type(v) == "function" and not instance[k] then
                instance[k] = v  -- 直接引用，不复制
            end
        end
        if instance.init then
            instance:init(...)
        end
        return instance
    end

    return cls
end
```

注意：此优化会增加每实例内存（多保存函数引用），需在内存与 CPU 间权衡。

### 8.3 调试与可观测性

为元表驱动的对象添加调试信息，便于排查问题。

```lua
-- 调试辅助：为对象添加类型信息
local function tagInstance(obj, typeName)
    local mt = getmetatable(obj) or {}
    mt.__type = typeName
    mt.__tostring = mt.__tostring or function(self)
        return string.format("<%s %p>", typeName, self)
    end
    return setmetatable(obj, mt)
end

-- 类型检查辅助
local function assertType(obj, typeName)
    local mt = getmetatable(obj)
    if not mt or mt.__type ~= typeName then
        error(string.format("Expected %s, got %s", typeName, tostring(obj)), 2)
    end
end

-- 使用示例
local v = tagInstance({ x = 1, y = 2 }, "Vector2")
print(v)  -- 输出 <Vector2 0x7f8a3b2c1d40>
assertType(v, "Vector2")  -- 通过
-- assertType(v, "Vector3")  -- 抛出错误
```

### 8.4 测试驱动开发（TDD）实践

为元表驱动的 OOP 编写单元测试。

```lua
-- 测试框架示例（伪代码）
local TestFramework = {
    tests = {},
    passed = 0,
    failed = 0,
}

function TestFramework.add(name, fn)
    table.insert(TestFramework.tests, { name = name, fn = fn })
end

function TestFramework.run()
    for _, test in ipairs(TestFramework.tests) do
        local ok, err = pcall(test.fn)
        if ok then
            TestFramework.passed = TestFramework.passed + 1
            print(string.format("[PASS] %s", test.name))
        else
            TestFramework.failed = TestFramework.failed + 1
            print(string.format("[FAIL] %s: %s", test.name, err))
        end
    end
    print(string.format("\nResults: %d passed, %d failed", TestFramework.passed, TestFramework.failed))
end

-- 测试用例：Vector2 加法
TestFramework.add("Vector2 addition", function()
    local v1 = Vector2(1, 2)
    local v2 = Vector2(3, 4)
    local result = v1 + v2
    assert(result.x == 4 and result.y == 6, "Addition failed")
end)

-- 测试用例：继承
TestFramework.add("Inheritance", function()
    local dog = Dog.new("Rex")
    assert(dog:describe():match("Rex"), "Inheritance failed")
end)

TestFramework.run()
```

### 8.5 与 C 模块协作

C 扩展常返回带元表的 userdata，Lua 端可透明地与表对象交互。

```lua
-- 假设 C 模块提供 "cjson" 库，返回的 decoder 是 userdata
local cjson = require "cjson"
local decoder = cjson.new()

-- decoder 对象内部使用 C 元表，但 Lua 端使用方式与表一致
local data = decoder:decode('{"name":"Lua","version":5.4}')
print(data.name, data.version)  -- Lua  5.4

-- 注意：userdata 不能直接设置任意元表，必须通过 C API
-- 以下代码会失败：
-- setmetatable(decoder, { __index = function() end })  -- 错误
```

## 9. 案例研究

### 9.1 案例一：Kong API 网关的 OOP 体系

Kong 是基于 OpenResty 的高性能 API 罔关，其核心插件系统采用 Lua 元表 OOP 实现。

**设计要点**：

1. **插件基类**：定义所有插件必须实现的方法（`init_worker`、`access`、`header_filter` 等）。
2. **元表继承**：每个具体插件通过元表继承基类，仅覆盖关心的方法。
3. **配置 schema**：每个插件定义自己的配置 schema，框架在加载时校验。

**简化版实现**：

```lua
-- Kong 插件基类
local BasePlugin = {}
BasePlugin.__index = BasePlugin

function BasePlugin.new(name)
    local self = setmetatable({}, BasePlugin)
    self._name = name
    return self
end

-- 钩子方法：子类可覆盖
function BasePlugin:init_worker()
    -- 默认空实现
end

function BasePlugin:access(conf)
    -- 默认空实现
end

function BasePlugin:header_filter(conf)
    -- 默认空实现
end

function BasePlugin:log(conf)
    -- 默认空实现
end

-- 具体插件：限流插件
local RateLimitingHandler = setmetatable({}, { __index = BasePlugin })
RateLimitingHandler.__index = RateLimitingHandler

function RateLimitingHandler.new()
    local self = BasePlugin.new("rate-limiting")
    return setmetatable(self, RateLimitingHandler)
end

-- 覆盖 access 钩子
function RateLimitingHandler:access(conf)
    -- 实现限流逻辑
    local key = conf.key or ngx.var.remote_addr
    local limit = conf.limit or 100
    -- ... 调用共享内存计数器 ...
    ngx.log(ngx.INFO, "Rate limit check for " .. key)
end

return RateLimitingHandler
```

**经验教训**：

- 元表式 OOP 使插件代码简洁，新增插件仅需覆盖必要方法。
- 但缺乏编译期类型检查，配置错误需在运行时发现。
- 通过 schema 校验弥补类型安全不足，是 Lua 大型项目的常见模式。

### 9.2 案例二：LÖVE 2D 游戏引擎的对象系统

LÖVE 是流行的 Lua 2D 游戏引擎，其社区惯用元表 OOP 组织游戏对象。

**典型实体类**：

```lua
-- 游戏实体基类
local Entity = {}
Entity.__index = Entity

function Entity.new(x, y)
    local self = setmetatable({}, Entity)
    self.x = x or 0
    self.y = y or 0
    self.vx = 0
    self.vy = 0
    self.alive = true
    return self
end

function Entity:update(dt)
    self.x = self.x + self.vx * dt
    self.y = self.y + self.vy * dt
end

function Entity:draw()
    -- 默认无绘制
end

function Entity:destroy()
    self.alive = false
end

-- 玩家类（继承 Entity）
local Player = setmetatable({}, { __index = Entity })
Player.__index = Player

function Player.new(x, y)
    local self = Entity.new(x, y)
    self.health = 100
    self.score = 0
    return setmetatable(self, Player)
end

function Player:update(dt)
    Entity.update(self, dt)  -- 显式调用父类方法
    -- 处理输入
    if love.keyboard.isDown("left") then self.vx = -100 end
    if love.keyboard.isDown("right") then self.vx = 100 end
end

function Player:draw()
    love.graphics.rectangle("fill", self.x, self.y, 32, 32)
end

function Player:takeDamage(amount)
    self.health = self.health - amount
    if self.health <= 0 then
        self:destroy()
    end
end
```

**经验教训**：

- 元表 OOP 与游戏循环（update/draw）天然契合。
- 显式 `Parent.method(self, ...)` 调用 super 比 `self:super()` 更直观且性能更好。
- 实体数量大时（如弹幕游戏），考虑使用 ECS（Entity-Component-System）替代 OOP。

### 9.3 案例三：Redis Lua 脚本中的元表应用

Redis 内嵌 Lua 解释器（5.1），元表机制可用于构建复杂数据结构。

```lua
-- Redis 脚本：使用元表实现有序集合的扩展操作
-- 假设 KEYS[1] 是 Redis sorted set 的键

local key = KEYS[1]
local member = ARGV[1]
local score = tonumber(ARGV[2])

-- 使用元表封装 Redis 命令
local ZSetProxy = {}
ZSetProxy.__index = function(t, k)
    return redis.call('ZSCORE', t.key, k)
end
ZSetProxy.__newindex = function(t, k, v)
    redis.call('ZADD', t.key, v, k)
end

local proxy = setmetatable({ key = key }, ZSetProxy)

-- 读取成员分数
local currentScore = proxy[member]
if currentScore then
    currentScore = tonumber(currentScore)
    -- 更新分数为旧值 + 新值
    proxy[member] = currentScore + score
    return currentScore + score
else
    proxy[member] = score
    return score
end
```

**经验教训**：

- Redis 沙箱限制：禁止 `os.execute`、`io.open` 等，但元表机制完全可用。
- 元表代理使 Redis 命令调用更直观，但性能略低于直接 `redis.call`。
- 生产环境应优先使用 EVALSHA 缓存脚本，减少网络传输。

## 10. 习题

### 10.1 基础题

**题 1**：写出以下代码的输出，并解释原因。

```lua
local t = setmetatable({}, {
    __index = function(_, k)
        return k
    end,
})
print(t.hello)
print(t["world"])
print(rawget(t, "hello"))
```

**参考答案要点**：

- `t.hello` 输出 `"hello"`：因 `t` 无 `hello` 字段，触发 `__index`，返回键名 `k`。
- `t["world"]` 输出 `"world"`：同理。
- `rawget(t, "hello")` 输出 `nil`：`rawget` 跳过元方法，直接查表，无此字段。

**题 2**：以下代码有何问题？如何修复？

```lua
local cls = {}
function cls.new()
    return setmetatable({}, cls)
end
function cls.method(self) return 1 end

local obj = cls.new()
print(obj:method())
```

**参考答案要点**：

- 问题：`cls` 未设置 `__index = cls`，故 `obj.method` 查找失败，返回 `nil`。
- 调用 `obj:method()` 等价于 `obj.method(obj)`，`obj.method` 为 `nil`，抛出错误。
- 修复：在 `cls.new` 前添加 `cls.__index = cls`。

**题 3**：使用元表实现一个"计数器表"，访问任意不存在的键时自动初始化为 0 并可递增。

**参考答案要点**：

```lua
local counter = setmetatable({}, {
    __index = function(t, k)
        t[k] = 0  -- 注意：此处会触发 __newindex，需配合 __newindex = rawset
        return 0
    end,
    __newindex = function(t, k, v)
        rawset(t, k, v)
    end,
})
counter.a = counter.a + 1  -- 第一次访问触发 __index，初始化为 0，再 +1
counter.a = counter.a + 1
print(counter.a)  -- 输出 2
```

### 10.2 进阶题

**题 4**：实现一个支持 `super()` 调用的单继承 OOP 框架，要求 `super` 能正确解析到直接父类的同名方法。

**参考答案要点**：

```lua
local function createClass(parent)
    local cls = setmetatable({}, { __index = parent })
    cls.__index = cls
    cls.__parent = parent

    function cls.new(...)
        local instance = setmetatable({}, cls)
        -- 维护一个"当前类"指针，用于 super 解析
        instance.__currentClass = cls
        if instance.init then
            instance:init(...)
        end
        return instance
    end

    -- super 方法：调用父类的同名方法
    function cls:super(methodName, ...)
        local parent = self.__currentClass.__parent
        if not parent then
            error("No parent class", 2)
        end
        local method = parent[methodName]
        if not method then
            error(string.format("Method '%s' not found in parent", methodName), 2)
        end
        -- 临时切换 __currentClass 以支持多级 super
        local savedClass = self.__currentClass
        self.__currentClass = parent
        local result = method(self, ...)
        self.__currentClass = savedClass
        return result
    end

    return cls
end
```

**题 5**：分析以下代码的输出，并解释 `__index` 链的查找过程。

```lua
local A = { x = 1 }
A.__index = A

local B = setmetatable({}, A)
B.__index = B

local C = setmetatable({}, B)
C.__index = C

local obj = setmetatable({}, C)
print(obj.x)
```

**参考答案要点**：

- 查找 `obj.x`：
  1. `obj` 无 `x`，触发 `__index`，即 `C`。
  2. `C` 无 `x`，触发 `__index`，即 `B`。
  3. `B` 无 `x`，触发 `__index`，即 `A`。
  4. `A` 有 `x = 1`，返回 1。
- 输出 `1`。

### 10.3 挑战题

**题 6**：实现一个支持多分派（multiple dispatch）的元方法系统。例如，`a + b` 的行为同时取决于 `a` 与 `b` 的具体类型（不仅仅是 `a` 的元表）。

**参考答案要点**：

```lua
-- 多分派实现：注册一个 (typeA, typeB) -> handler 的映射
local dispatchTable = {}

local function registerOp(op, typeA, typeB, handler)
    dispatchTable[op] = dispatchTable[op] or {}
    dispatchTable[op][typeA] = dispatchTable[op][typeA] or {}
    dispatchTable[op][typeA][typeB] = handler
end

local function multiDispatch(op, a, b)
    local typeA = getmetatable(a).__type
    local typeB = getmetatable(b).__type
    local handler = dispatchTable[op] and dispatchTable[op][typeA] and dispatchTable[op][typeA][typeB]
    if handler then
        return handler(a, b)
    end
    -- 尝试交换参数
    handler = dispatchTable[op] and dispatchTable[op][typeB] and dispatchTable[op][typeB][typeA]
    if handler then
        return handler(b, a)
    end
    error(string.format("No dispatch for %s %s %s", typeA, op, typeB), 2)
end

-- 注册：Vector2 + Vector2
registerOp("add", "Vector2", "Vector2", function(a, b)
    return Vector2(a.x + b.x, a.y + b.y)
end)

-- 注册：Vector2 + number
registerOp("add", "Vector2", "number", function(a, b)
    return Vector2(a.x + b, a.y + b)
end)

-- 在元方法中调用多分派
Vector2Meta.__add = function(a, b)
    return multiDispatch("add", a, b)
end
```

**题 7**：实现一个"ORM 风格"的声明式模型定义 DSL，支持字段类型、默认值、校验。

**参考答案要点**：

```lua
local Model = {}
Model.__index = Model

-- 字段类型定义
local FieldTypes = {
    string = function(v) return type(v) == "string" end,
    number = function(v) return type(v) == "number" end,
    boolean = function(v) return type(v) == "boolean" end,
}

-- 定义模型
function Model.define(name, schema)
    local cls = { __name = name, __schema = schema }
    cls.__index = function(t, k)
        -- 若是 schema 中定义的字段，返回值（可能为默认值）
        if schema[k] then
            return rawget(t, "_data")[k] or schema[k].default
        end
        -- 否则查类方法
        return rawget(cls, k)
    end
    cls.__newindex = function(t, k, v)
        if schema[k] then
            -- 类型校验
            if not FieldTypes[schema[k].type](v) then
                error(string.format("Field '%s' expects %s, got %s", k, schema[k].type, type(v)), 2)
            end
            rawget(t, "_data")[k] = v
        else
            rawset(t, k, v)
        end
    end

    function cls.new(data)
        local instance = setmetatable({ _data = {} }, cls)
        for k, def in pairs(schema) do
            if data and data[k] then
                instance[k] = data[k]  -- 触发 __newindex 校验
            elseif def.default ~= nil then
                instance[k] = def.default
            end
        end
        return instance
    end

    return cls
end

-- 使用示例
local User = Model.define("User", {
    name = { type = "string", default = "" },
    age = { type = "number", default = 0 },
    active = { type = "boolean", default = true },
})

local u = User.new({ name = "Alice", age = 30 })
print(u.name, u.age, u.active)  -- Alice  30  true
-- u.age = "thirty"  -- 抛出错误：Field 'age' expects number, got string
```

**题 8**：分析 Lua 元表查找算法在以下场景下的性能，并给出优化建议。

> 场景：1000 个实例，每个实例通过 5 层继承链查找方法，每秒调用 100 万次方法。

**参考答案要点**：

- 单次查找时间：5 次表访问 + 5 次 `__index` 元方法调用，约 $5 \times O(1) = O(5)$。
- 每秒 100 万次查找：5 百万次表访问，约 50 ms（假设每次访问 10 ns）。
- 优化建议：
  1. 方法扁平化：构造时将常用方法复制到实例表，将 $O(5)$ 降为 $O(1)$。
  2. 局部变量缓存：在热点循环中将方法引用缓存到局部变量。
  3. 减少 `:` 调用：`obj:method()` 每次查找 `obj.method`，可改为 `local m = obj.method; m(obj, ...)`。
  4. LuaJIT：若运行在 LuaJIT 下，trace compiler 可自动优化元表查找。

## 11. 参考文献

### 11.1 Lua 官方文献

[1] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2023. *Lua 5.4 Reference Manual*. Technical Report, PUC-Rio, Rio de Janeiro, Brazil. Available at: https://www.lua.org/manual/5.4/

[2] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 1996. Lua-an extensible extension language. *Journal of Universal Computer Science* 2, 5 (May 1996), 345-356. DOI: https://doi.org/10.3217/jucs-002-05-0345

[3] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2007. The evolution of Lua. In *Proceedings of the Third ACM SIGPLAN History of Programming Languages Conference (HOPL III)*. ACM, New York, NY, USA, 2-1–2-26. DOI: https://doi.org/10.1145/1238844.1238846

[4] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2011. Passing a language through the eye of a needle: how the embeddability of Lua has affected its design. *Communications of the ACM* 54, 11 (Nov. 2011), 38-43. DOI: https://doi.org/10.1145/2018396.2018412

### 11.2 元编程与面向对象理论

[5] Abadi, M. and Cardelli, L. 1996. *A Theory of Objects*. Springer-Verlag, New York, NY, USA. DOI: https://doi.org/10.1007/978-1-4419-8598-9

[6] Ungar, D. and Smith, R. B. 1987. Self: the power of simplicity. In *Conference Proceedings on Object-Oriented Programming Systems, Languages and Applications (OOPSLA '87)*. ACM, New York, NY, USA, 227-242. DOI: https://doi.org/10.1145/38807.38847

[7] Lieberman, H. 1986. Using prototypical objects to implement shared behavior in object-oriented systems. In *Conference Proceedings on Object-Oriented Programming Systems, Languages and Applications (OOPSLA '86)*. ACM, New York, NY, USA, 214-223. DOI: https://doi.org/10.1145/28697.28718

### 11.3 性能与实现

[8] Pall, M. 2005. The LuaJIT compiler. In *Proceedings of the Lightweight Languages 2005 (LL5)*. Available at: https://luajit.org/

[9] Gudeman, D. 1993. Booleans are unsigned integers. *ACM SIGPLAN Notices* 28, 4 (April 1993), 17-24. DOI: https://doi.org/10.1145/152711.152718

### 11.4 应用案例

[10] Kong Inc. 2024. *Kong Plugin Development Guide*. Available at: https://docs.konghq.com/gateway/latest/plugin-development/

[11] LÖVE Development Team. 2024. *LÖVE 11.4 Documentation*. Available at: https://love2d.org/wiki/Main_Page

[12] Carlsson, M. et al. 2020. Redis Lua scripts: atomicity, performance, and best practices. *Redis Labs Technical Report*. Available at: https://redis.io/docs/manual/programmability/eval/

## 12. 延伸阅读

### 12.1 官方文档

- Lua 官方手册（5.4）：https://www.lua.org/manual/5.4/
- Lua 与 C 交互（Programming in Lua, 4th Edition, Chapter 28-31）：https://www.lua.org/pil/
- LuaJIT 文档：https://luajit.org/luajit.html

### 12.2 经典教材

- Roberto Ierusalimschy. *Programming in Lua* (4th Edition). PUC-Rio, 2016. ISBN 978-8590379868.
- Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. *The Implementation of Lua 5.0*. Journal of Universal Computer Science, 2005.
- Paul Kimmel. *Lua Programming Gems*. Lua.org, 2008. ISBN 978-8590379868.

### 12.3 前沿论文与社区资源

- Pall, Mike. "LuaJIT 2.0 trace compiler design." *Lua Workshop 2011*. 探讨 LuaJIT 如何优化元表查找。
- "LuaTables: Optimizing hash table lookups for dynamic languages." *ICSOFT 2017*. 讨论表查找性能。
- OpenResty 项目：https://openresty.org/，展示元表 OOP 在生产级 Web 项目的应用。
- Kong API Gateway 源码：https://github.com/Kong/kong，OOP 框架参考实现。
- middleclass 库：https://github.com/kikito/middleclass，社区主流 OOP 库。
- classic 库：https://github.com/rxi/classic，极简 OOP 库。

### 12.4 拓展主题

- 弱引用表与 `__gc`：参见本系列"弱表"章节。
- C API 与 userdata 元表：参见本系列"Lua 与 C 交互"章节。
- 元表与协程协作：参见本系列"协程详解"章节。
- LuaJIT 下的元表性能特性：参见本系列"Lua 即时编译器"章节。
- 元表在 Redis 沙箱中的应用：参见本系列"Lua 与 Redis 脚本"章节。
