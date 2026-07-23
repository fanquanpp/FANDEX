# Lua 元表与元方法详解速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 元表基础

**基本写法：setmetatable 设置元表**
`setmetatable(<table>, <metatable>)`
```lua
-- 设置元表
local t = {}
local mt = {}
setmetatable(t, mt)
```

**基本写法：getmetatable 获取元表**
`getmetatable(<table>)`
```lua
-- 获取元表
local mt = getmetatable(t)
```

**基本写法：链式设置元表**
`local <table> = setmetatable({}, <metatable>)`
```lua
-- 创建表并设置元表
local obj = setmetatable({}, {
    __index = function(t, k)
        return "default"
    end
})
```

---

## 算术元方法

**基本写法：__add 加法**
`<metatable>.__add = function(<a>, <b>) <body> end`
```lua
-- 自定义加法运算
local mt = {}
mt.__add = function(a, b)
    return {value = a.value + b.value}
end
local v1 = setmetatable({value = 10}, mt)
local v2 = setmetatable({value = 20}, mt)
local result = v1 + v2
```

**基本写法：__sub 减法**
`<metatable>.__sub = function(<a>, <b>) <body> end`
```lua
-- 自定义减法运算
mt.__sub = function(a, b)
    return {value = a.value - b.value}
end
```

**基本写法：__mul 乘法**
`<metatable>.__mul = function(<a>, <b>) <body> end`
```lua
-- 自定义乘法运算
mt.__mul = function(a, b)
    return {value = a.value * b.value}
end
```

**基本写法：__div 除法**
`<metatable>.__div = function(<a>, <b>) <body> end`
```lua
-- 自定义除法运算
mt.__div = function(a, b)
    return {value = a.value / b.value}
end
```

**基本写法：__mod 取模**
`<metatable>.__mod = function(<a>, <b>) <body> end`
```lua
-- 自定义取模运算
mt.__mod = function(a, b)
    return {value = a.value % b.value}
end
```

**基本写法：__pow 幂运算**
`<metatable>.__pow = function(<a>, <b>) <body> end`
```lua
-- 自定义幂运算
mt.__pow = function(a, b)
    return {value = a.value ^ b.value}
end
```

**基本写法：__unm 一元负号**
`<metatable>.__unm = function(<a>) <body> end`
```lua
-- 自定义一元负号
mt.__unm = function(a)
    return {value = -a.value}
end
```

---

## 关系元方法

**基本写法：__eq 相等**
`<metatable>.__eq = function(<a>, <b>) <body> end`
```lua
-- 自定义相等比较
mt.__eq = function(a, b)
    return a.value == b.value
end
```

**基本写法：__lt 小于**
`<metatable>.__lt = function(<a>, <b>) <body> end`
```lua
-- 自定义小于比较
mt.__lt = function(a, b)
    return a.value < b.value
end
```

**基本写法：__le 小于等于**
`<metatable>.__le = function(<a>, <b>) <body> end`
```lua
-- 自定义小于等于比较
mt.__le = function(a, b)
    return a.value <= b.value
end
```

---

## 字符串元方法

**基本写法：__concat 连接**
`<metatable>.__concat = function(<a>, <b>) <body> end`
```lua
-- 自定义字符串连接
mt.__concat = function(a, b)
    return tostring(a.value) .. tostring(b.value)
end
```

**基本写法：__tostring 转字符串**
`<metatable>.__tostring = function(<a>) <body> end`
```lua
-- 自定义转字符串
mt.__tostring = function(a)
    return "Value(" .. a.value .. ")"
end
```

---

## 索引元方法

**基本写法：__index 表查找**
`<metatable>.__index = <table>`
```lua
-- __index 为表（继承）
local base = {greet = function() return "Hello" end}
local mt = {__index = base}
local obj = setmetatable({}, mt)
print(obj.greet())
```

**基本写法：__index 函数查找**
`<metatable>.__index = function(<table>, <key>) <body> end`
```lua
-- __index 为函数
local mt = {
    __index = function(t, key)
        return "Key not found: " .. key
    end
}
local obj = setmetatable({}, mt)
print(obj.missing)
```

**基本写法：__newindex 新索引**
`<metatable>.__newindex = <table>`
```lua
-- __newindex 为表（重定向）
local storage = {}
local mt = {__newindex = storage}
local obj = setmetatable({}, mt)
obj.x = 10
print(storage.x)
```

**基本写法：__newindex 函数拦截**
`<metatable>.__newindex = function(<table>, <key>, <value>) <body> end`
```lua
-- __newindex 为函数（拦截赋值）
local mt = {
    __newindex = function(t, key, value)
        if type(value) == "number" then
            rawset(t, key, value)
        end
    end
}
local obj = setmetatable({}, mt)
obj.x = 10
obj.y = "hello"
```

**基本写法：rawget 绕过元方法**
`rawget(<table>, <key>)`
```lua
-- rawget 绕过 __index
local obj = setmetatable({}, {__index = function() return "default" end})
print(rawget(obj, "x"))
```

**基本写法：rawset 绕过元方法**
`rawset(<table>, <key>, <value>)`
```lua
-- rawset 绕过 __newindex
local obj = setmetatable({}, {__newindex = function() end})
rawset(obj, "x", 10)
```

---

## 调用元方法

**基本写法：__call 可调用对象**
`<metatable>.__call = function(<self>, <params>) <body> end`
```lua
-- __call 使表可像函数一样调用
local mt = {
    __call = function(self, x)
        return x * self.factor
    end
}
local multiplier = setmetatable({factor = 2}, mt)
print(multiplier(5))
```

---

## 长度元方法

**基本写法：__len 长度**
`<metatable>.__len = function(<self>) <body> end`
```lua
-- __len 自定义长度运算
local mt = {
    __len = function(self)
        local count = 0
        for _ in pairs(self.data) do
            count = count + 1
        end
        return count
    end
}
local obj = setmetatable({data = {a = 1, b = 2}}, mt)
print(#obj)
```

---

## 迭代元方法

**基本写法：__pairs 自定义遍历**
`<metatable>.__pairs = function(<self>) <body> end`
```lua
-- __pairs 自定义 pairs 遍历
local mt = {
    __pairs = function(self)
        return coroutine.wrap(function()
            for k, v in pairs(self.data) do
                coroutine.yield(k, v)
            end
        end)
    end
}
local obj = setmetatable({data = {a = 1, b = 2}}, mt)
for k, v in pairs(obj) do
    print(k, v)
end
```

**基本写法：__ipairs 自定义数组遍历**
`<metatable>.__ipairs = function(<self>) <body> end`
```lua
-- __ipairs 自定义 ipairs 遍历
local mt = {
    __ipairs = function(self)
        return coroutine.wrap(function()
            for i, v in ipairs(self.items) do
                coroutine.yield(i, v)
            end
        end)
    end
}
local obj = setmetatable({items = {10, 20, 30}}, mt)
for i, v in ipairs(obj) do
    print(i, v)
end
```

---

## 类型元方法

**基本写法：__type 类型判断**
`<metatable>.__type = "<type>"`
```lua
-- __type 自定义类型（需要库支持）
local mt = {__type = "Vector"}
local v = setmetatable({x = 1, y = 2}, mt)
```

---

## 元表保护

**基本写法：__metatable 保护元表**
`<metatable>.__metatable = "<value>"`
```lua
-- __metatable 保护元表不被修改
local mt = {__index = {}, __metatable = "protected"}
local obj = setmetatable({}, mt)
print(getmetatable(obj))
```

---

## 元表组合

**换行写法：多元方法元表**
`local <mt> = { __index = <...>, __newindex = <...>, __add = <...>, __tostring = <...> }`
```lua
-- 组合多个元方法
local mt = {
    __index = function(t, k) return nil end,
    __newindex = function(t, k, v) rawset(t, k, v) end,
    __add = function(a, b) return setmetatable({}, getmetatable(a)) end,
    __tostring = function(a) return "Object" end
}
local obj = setmetatable({}, mt)
```

---

## 元表继承

**基本写法：元表链式继承**
`setmetatable(<child>, {__index = <parent>})`
```lua
-- 元表链式继承
local animal = {sound = "Some sound"}
local dog = setmetatable({}, {__index = animal})
print(dog.sound)
```

**基本写法：多级继承**
`setmetatable(<child>, {__index = <parent>}); setmetatable(<parent>, {__index = <grandparent>})`
```lua
-- 多级继承
local creature = {alive = true}
local animal = setmetatable({sound = "Some sound"}, {__index = creature})
local dog = setmetatable({breed = "Lab"}, {__index = animal})
print(dog.alive)
print(dog.sound)
```

---

## 元表实战

**基本写法：向量运算**
`local <mt> = { __add = <...>, __sub = <...>, __tostring = <...> }`
```lua
-- 向量运算元表
local Vector = {}
Vector.__index = Vector
Vector.__add = function(a, b)
    return Vector.new(a.x + b.x, a.y + b.y)
end
Vector.__tostring = function(v)
    return "(" .. v.x .. ", " .. v.y .. ")"
end
function Vector.new(x, y)
    return setmetatable({x = x, y = y}, Vector)
end
```

**基本写法：只读表**
`local <mt> = { __index = <table>, __newindex = function() error("...") end }`
```lua
-- 只读表实现
local function readOnly(t)
    local mt = {
        __index = t,
        __newindex = function(t, k, v)
            error("attempt to update a read-only table", 2)
        end
    }
    return setmetatable({}, mt)
end
```

**基本写法：默认值表**
`local <mt> = { __index = function() return <default> end }`
```lua
-- 默认值表
local function defaultTable(default)
    return setmetatable({}, {
        __index = function(t, k)
            return default
        end
    })
end
```
