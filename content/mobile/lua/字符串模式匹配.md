# Lua 字符串模式匹配速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 字符串基础

**基本写法：字符串长度**
`#<string>`
```lua
-- 获取字符串长度
local len = #"Hello, Lua"
```

**基本写法：string.len 获取长度**
`string.len(<string>)`
```lua
-- string.len 获取长度
local len = string.len("Hello")
```

**基本写法：字符串连接**
`<str1> .. <str2>`
```lua
-- 字符串连接
local result = "Hello" .. ", " .. "Lua"
```

**基本写法：字符串重复**
`string.rep(<string>, <n>)`
```lua
-- 字符串重复
local repeated = string.rep("ab", 3)
```

---

## 大小写转换

**基本写法：转大写**
`string.upper(<string>)`
```lua
-- 转大写
local upper = string.upper("Hello")
```

**基本写法：转小写**
`string.lower(<string>)`
```lua
-- 转小写
local lower = string.lower("Hello")
```

**基本写法：方法调用转大写**
`<string>:upper()`
```lua
-- 方法调用转大写
local upper = ("Hello"):upper()
```

---

## 子字符串

**基本写法：string.sub 截取**
`string.sub(<string>, <start>, <end>)`
```lua
-- 截取子字符串
local sub = string.sub("Hello, Lua", 1, 5)
```

**基本写法：从末尾截取**
`string.sub(<string>, -<n>)`
```lua
-- 从末尾截取
local sub = string.sub("Hello, Lua", -3)
```

**基本写法：截取中间部分**
`string.sub(<string>, <start>, -<n>)`
```lua
-- 截取中间部分
local sub = string.sub("Hello, Lua", 2, -2)
```

---

## 查找与匹配

**基本写法：string.find 查找**
`string.find(<string>, <pattern>)`
```lua
-- 查找字符串
local start, endPos = string.find("Hello, Lua", "Lua")
```

**基本写法：string.find 带起始位置**
`string.find(<string>, <pattern>, <init>)`
```lua
-- 从指定位置开始查找
local start, endPos = string.find("Hello, Lua", "l", 4)
```

**基本写法：string.find 模式匹配**
`string.find(<string>, "<pattern>")`
```lua
-- 模式匹配查找
local start, endPos = string.find("Hello 123", "%d+")
```

**基本写法：string.find 捕获**
`string.find(<string>, "(<pattern>)")`
```lua
-- 捕获匹配内容
local start, endPos, capture = string.find("Hello, Lua", "(Lua)")
```

**基本写法：string.match 匹配**
`string.match(<string>, <pattern>)`
```lua
-- 匹配字符串
local result = string.match("Hello 123", "%d+")
```

**基本写法：string.match 捕获**
`string.match(<string>, "(<pattern>)")`
```lua
-- 捕获匹配内容
local result = string.match("Hello, Lua", "(%w+), (%w+)")
```

---

## 替换

**基本写法：string.gsub 替换**
`string.gsub(<string>, <pattern>, <replacement>)`
```lua
-- 替换字符串
local result, count = string.gsub("Hello, Lua", "Lua", "World")
```

**基本写法：string.gsub 限制替换次数**
`string.gsub(<string>, <pattern>, <replacement>, <n>)`
```lua
-- 限制替换次数
local result = string.gsub("aaa", "a", "b", 2)
```

**基本写法：string.gsub 捕获替换**
`string.gsub(<string>, "(<pattern>)", <replacement>)`
```lua
-- 使用捕获替换
local result = string.gsub("Hello, Lua", "(%w+)", "[%1]")
```

**基本写法：string.gsub 函数替换**
`string.gsub(<string>, <pattern>, <function>)`
```lua
-- 使用函数替换
local result = string.gsub("Hello 123", "%d+", function(s)
    return tonumber(s) * 2
end)
```

---

## 分割与拆分

**基本写法：字符串分割**
`local function <name>(<str>, <sep>) <body> end`
```lua
-- 字符串分割
local function split(str, sep)
    local result = {}
    for part in string.gmatch(str, "[^" .. sep .. "]+") do
        result[#result + 1] = part
    end
    return result
end
```

**基本写法：string.gmatch 遍历匹配**
`for <match> in string.gmatch(<string>, <pattern>) do <body> end`
```lua
-- gmatch 遍历所有匹配
for word in string.gmatch("Hello, World, Lua", "%w+") do
    print(word)
end
```

**基本写法：string.gmatch 捕获遍历**
`for <cap1>, <cap2> in string.gmatch(<string>, <pattern>) do <body> end`
```lua
-- gmatch 捕获遍历
for key, value in string.gmatch("a=1, b=2, c=3", "(%w+)=(%w+)") do
    print(key, value)
end
```

---

## 格式化

**基本写法：string.format 格式化**
`string.format(<format>, <args>)`
```lua
-- 字符串格式化
local result = string.format("Name: %s, Age: %d", "Alice", 25)
```

**基本写法：格式化数字**
`string.format("<format>", <number>)`
```lua
-- 格式化数字
local result = string.format("%.2f", 3.14159)
```

**基本写法：格式化补齐**
`string.format("<format>", <string>)`
```lua
-- 字符串补齐
local result = string.format("%10s", "Lua")
```

**基本写法：格式化十六进制**
`string.format("<format>", <number>)`
```lua
-- 格式化为十六进制
local result = string.format("%x", 255)
```

---

## 模式字符类

**基本写法：%a 字母**
`string.match(<string>, "%a+")`
```lua
-- 匹配字母
local result = string.match("Hello123", "%a+")
```

**基本写法：%d 数字**
`string.match(<string>, "%d+")`
```lua
-- 匹配数字
local result = string.match("Hello123", "%d+")
```

**基本写法：%w 字母数字**
`string.match(<string>, "%w+")`
```lua
-- 匹配字母数字
local result = string.match("Hello_123", "%w+")
```

**基本写法：%s 空白**
`string.match(<string>, "%s+")`
```lua
-- 匹配空白字符
local result = string.match("Hello World", "%s+")
```

**基本写法：%p 标点**
`string.match(<string>, "%p")`
```lua
-- 匹配标点符号
local result = string.match("Hello, World", "%p")
```

**基本写法：%l 小写字母**
`string.match(<string>, "%l+")`
```lua
-- 匹配小写字母
local result = string.match("HelloWorld", "%l+")
```

**基本写法：%u 大写字母**
`string.match(<string>, "%u+")`
```lua
-- 匹配大写字母
local result = string.match("HelloWorld", "%u+")
```

**基本写法：大写字符类取反**
`string.match(<string>, "%D+")`
```lua
-- %D 匹配非数字
local result = string.match("abc123", "%D+")
```

---

## 模式锚点

**基本写法：^ 开头锚定**
`string.match(<string>, "^<pattern>")`
```lua
-- 匹配字符串开头
local result = string.match("Hello World", "^%w+")
```

**基本写法：$ 结尾锚定**
`string.match(<string>, "<pattern>$")`
```lua
-- 匹配字符串结尾
local result = string.match("Hello World", "%w+$")
```

---

## 模式量词

**基本写法：* 零次或多次**
`string.match(<string>, "<pattern>*")`
```lua
-- 匹配零次或多次
local result = string.match("aaa", "a*")
```

**基本写法：+ 一次或多次**
`string.match(<string>, "<pattern>+")`
```lua
-- 匹配一次或多次
local result = string.match("aaa", "a+")
```

**基本写法：- 零次或多次（最小匹配）**
`string.match(<string>, "<pattern>-")`
```lua
-- 最小匹配
local result = string.match("<a><b>", "<.->")
```

**基本写法：? 零次或一次**
`string.match(<string>, "<pattern>?")`
```lua
-- 匹配零次或一次
local result = string.match("color", "colou?r")
```

---

## 字符集

**基本写法：字符集**
`string.match(<string>, "[<chars>]")`
```lua
-- 匹配字符集中的任意字符
local result = string.match("Hello", "[aeiou]")
```

**基本写法：字符范围**
`string.match(<string>, "[<start>-<end>]")`
```lua
-- 匹配字符范围
local result = string.match("Hello", "[a-z]")
```

**基本写法：取反字符集**
`string.match(<string>, "[^<chars>]")`
```lua
-- 匹配不在字符集中的字符
local result = string.match("Hello", "[^aeiou]")
```

---

## 捕获

**基本写法：基本捕获**
`string.match(<string>, "(<pattern>)")`
```lua
-- 捕获匹配内容
local result = string.match("Hello, Lua", "(%w+)")
```

**基本写法：多捕获**
`string.match(<string>, "(<p1>) (<p2>)")`
```lua
-- 多个捕获
local a, b = string.match("key=value", "(%w+)=(%w+)")
```

**基本写法：捕获引用**
`string.gsub(<string>, "(<pattern>)", "%<n>")`
```lua
-- 引用捕获内容
local result = string.gsub("Hello, Lua", "(%w+)", "[%1]")
```

**基本写法：位置捕获**
`string.find(<string>, "()<pattern>()")`
```lua
-- 捕获位置
local start, _, pos = string.find("Hello", "()l")
```

---

## 字符编码

**基本写法：string.byte 获取字节**
`string.byte(<string>, <pos>)`
```lua
-- 获取字符的字节值
local code = string.byte("A")
```

**基本写法：string.char 转字符**
`string.char(<code>)`
```lua
-- 字节值转字符
local char = string.char(65)
```

**基本写法：多字节转换**
`string.char(<code1>, <code2>)`
```lua
-- 多个字节值转字符串
local str = string.char(72, 105)
```

---

## 实用函数

**基本写法：trim 去除空白**
`local function <name>(<str>) <body> end`
```lua
-- 去除首尾空白
local function trim(s)
    return s:match("^%s*(.-)%s*$")
end
```

**基本写法：startsWith 检查前缀**
`string.sub(<str>, 1, #<prefix>) == <prefix>`
```lua
-- 检查字符串前缀
local function startsWith(str, prefix)
    return string.sub(str, 1, #prefix) == prefix
end
```

**基本写法：endsWith 检查后缀**
`string.sub(<str>, -#<suffix>) == <suffix>`
```lua
-- 检查字符串后缀
local function endsWith(str, suffix)
    return string.sub(str, -#suffix) == suffix
end
```

**基本写法：contains 检查包含**
`string.find(<str>, <substr>, 1, true) ~= nil`
```lua
-- 检查字符串包含（纯文本查找）
local function contains(str, substr)
    return string.find(str, substr, 1, true) ~= nil
end
```

**基本写法：reverse 反转字符串**
`string.reverse(<string>)`
```lua
-- 反转字符串
local reversed = string.reverse("Hello")
```

**基本写法：padLeft 左补齐**
`string.rep(<pad>, <n>) .. <str>`
```lua
-- 左侧补齐
local function padLeft(str, len, pad)
    pad = pad or " "
    local padding = string.rep(pad, len - #str)
    return padding .. str
end
```
