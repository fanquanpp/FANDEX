---
order: 850
title: Python 字符串格式化与方法
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 字符串格式化与方法 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## f-string 格式化

**基本写法：基础 f-string**
`f"<前缀>{<表达式>}<后缀>"`
```python
# 变量直接嵌入字符串
name = "Tom"
age = 18
print(f"姓名: {name}, 年龄: {age}")
```

**基本写法：表达式与运算**
`f"{<表达式计算>}"`
```python
# 大括号内支持任意表达式
print(f"总价: {10 * 2.5:.2f}")
print(f"长度: {len(name)}")
```

**基本写法：浮点精度**
`f"{<值>:.<小数位>f}"`
```python
# 控制小数位数
pi = 3.14159
print(f"{pi:.2f}")  # 3.14
```

**基本写法：宽度与对齐**
`f"{<值>:<填充><对齐><宽度>}"`
```python
# < 左对齐 | > 右对齐 | ^ 居中
print(f"{name:>10}")   # 右对齐宽 10
print(f"{name:<10}")   # 左对齐
print(f"{name:^10}")   # 居中
print(f"{name:0>10}")  # 用 0 填充
```

**基本写法：千分位分隔**
`f"{<值>:,}"`
```python
# 数字千分位逗号
print(f"{1000000:,}")    # 1,000,000
print(f"{1000000:,.2f}") # 1,000,000.00
```

**基本写法：百分比与科学计数**
`f"{<值>:%} / f"{<值>:e}"`
```python
# 百分比与科学计数法
ratio = 0.85
print(f"{ratio:.1%}")   # 85.0%
print(f"{1234567:.2e}") # 1.23e+06
```

**基本写法：进制转换**
`f"{<值>:b/o/x/X}"`
```python
# 二进制 八进制 十六进制
n = 255
print(f"{n:b}")  # 11111111
print(f"{n:o}")  # 377
print(f"{n:x}")  # ff
print(f"{n:#x}") # 0xff（带前缀）
```

**基本写法：调试输出**
`f"{<变量>=}"`
```python
# Python 3.8+ 自动显示变量名与值
x = 42
print(f"{x=}")        # x=42
print(f"{x=:>10}")    # x=        42
```

**基本写法：转换标志**
`f"{<值>!r/!s/!a}"`
```python
# 强制使用 repr / str / ascii
s = "中文"
print(f"{s!r}")  # '中文'
print(f"{s!s}")  # 中文
```

**基本写法：日期格式化**
`f"{<日期>:%Y-%m-%d}"`
```python
# 直接用 strftime 格式说明符
from datetime import datetime
now = datetime.now()
print(f"{now:%Y-%m-%d %H:%M:%S}")
```

---

## format 方法

**基本写法：位置参数**
`"<{}>".format(<值>)`
```python
# 按位置填充占位符
print("{}, {}".format("a", "b"))
print("{0} - {1}".format("a", "b"))
```

**基本写法：命名参数**
`"{<名称>}".format(<名称>=<值>)`
```python
# 按名称填充
print("{name} {age}".format(name="Tom", age=18))
```

**基本写法：format_map**
`"<{name}>".format_map(<字典>)`
```python
# 直接从字典读取键值
data = {"name": "Tom", "age": 18}
print("{name}-{age}".format_map(data))
```

---

## % 旧式格式化

**基本写法：% 格式化**
`"<格式串>" % (<值1>, <值2>)`
```python
# 旧式百分号格式化
print("name=%s, age=%d" % ("Tom", 18))
print("pi=%.2f" % 3.14159)
```

---

## Template 模板字符串

**基本写法：Template 替换**
`Template("<$名称>").substitute(<字典>)`
```python
# 安全的字符串模板替换
from string import Template
t = Template("$name 的成绩是 $score")
print(t.substitute(name="Tom", score=90))
print(t.safe_substitute({"name": "Tom"}))  # 缺失键保留原样
```

---

## 字符串拆分与拼接

**基本写法：split 拆分**
`<字符串>.split([<分隔符>[, <最大次数>]])`
```python
# 按分隔符拆分为列表
print("a,b,c".split(","))      # ['a', 'b', 'c']
print("a-b-c".split("-", 1))   # ['a', 'b-c']
```

**基本写法：rsplit 从右拆分**
`<字符串>.rsplit([<分隔符>[, <最大次数>]])`
```python
# 从右侧开始拆分
print("a.b.c".rsplit(".", 1))  # ['a.b', 'c']
```

**基本写法：splitlines 按行拆分**
`<字符串>.splitlines([keepends=<布尔>])`
```python
# 按换行符拆分为行列表
print("a\nb\nc".splitlines())
print("a\nb".splitlines(keepends=True))  # ['a\n', 'b']
```

**基本写法：join 拼接**
`<分隔符>.join(<可迭代>)`
```python
# 将可迭代对象拼接为字符串
print(",".join(["a", "b", "c"]))  # a,b,c
print("-".join(str(i) for i in range(5)))
```

**基本写法：partition 分段**
`<字符串>.partition(<分隔符>)`
```python
# 分成三段元组（前、分隔符、后）
print("a=b=c".partition("="))  # ('a', '=', 'b=c')
print("a=b".rpartition("="))   # ('a', '=', 'b')
```

---

## 字符串查找与替换

**基本写法：find 查找位置**
`<字符串>.find(<子串>[, <起>[, <止>]])`
```python
# 返回首次出现位置，找不到返回 -1
print("hello".find("l"))     # 2
print("hello".find("x"))     # -1
```

**基本写法：index 查找**
`<字符串>.index(<子串>)`
```python
# 与 find 类似，找不到抛 ValueError
print("hello".index("l"))
```

**基本写法：count 计数**
`<字符串>.count(<子串>)`
```python
# 统计子串出现次数
print("banana".count("a"))  # 3
```

**基本写法：replace 替换**
`<字符串>.replace(<旧>, <新>[, <次数>])`
```python
# 替换子串，可限制次数
print("a-b-c".replace("-", "+"))      # a+b+c
print("a-b-c".replace("-", "+", 1))   # a+b-c
```

**基本写法：前后缀判断**
`<字符串>.startswith(<前缀>) / .endswith(<后缀>)`
```python
# 判断开头或结尾
print("abc.py".endswith(".py"))   # True
print("abc".startswith("a"))      # True
```

---

## 字符串修剪与对齐

**基本写法：strip 去空白**
`<字符串>.strip([<字符集>])`
```python
# 去除两端空白或指定字符
print("  hi  ".strip())   # hi
print("##hi##".strip("#")) # hi
```

**基本写法：单侧去除**
`lstrip / rstrip`
```python
# 仅去除左侧或右侧
print("  hi  ".lstrip())  # "hi  "
print("  hi  ".rstrip())  # "  hi"
```

**基本写法：对齐填充**
`ljust / rjust / center`
```python
# 指定宽度对齐并填充
print("ab".ljust(5, "-"))   # ab---
print("ab".rjust(5, "-"))   # ---ab
print("ab".center(5, "-"))  # -ab--
```

**基本写法：补零**
`<字符串>.zfill(<宽度>)`
```python
# 左侧补零到指定宽度
print("42".zfill(5))  # 00042
```

---

## 大小写转换

**基本写法：大小写转换**
`upper / lower / title / swapcase`
```python
# 各类大小写转换
print("Hello".upper())      # HELLO
print("Hello".lower())      # hello
print("hello world".title()) # Hello World
print("aBc".swapcase())     # AbC
```

**基本写法：casefold 强制折叠**
`<字符串>.casefold()`
```python
# 更激进的小写转换，适合国际化比较
print("STRASSE".casefold())  # strasse
```

**基本写法：首字母大写**
`<字符串>.capitalize()`
```python
# 仅首字符大写其余小写
print("hELLO".capitalize())  # Hello
```

---

## 字符串判断

**基本写法：字符类型判断**
`isalpha / isdigit / isalnum / isspace`
```python
# 判断字符串组成类型
print("abc".isalpha())    # True
print("123".isdigit())    # True
print("  ".isspace())     # True
print("a1".isalnum())     # True
```

---

## 字符串转换

**基本写法：编码与解码**
`<字符串>.encode(<编码>) / <字节>.decode(<编码>)`
```python
# 字符串与字节互转
b = "中文".encode("utf-8")
print(b)                    # b'\xe4\xb8\xad...'
print(b.decode("utf-8"))    # 中文
```

**基本写法：translate 映射**
`<字符串>.translate(<映射表>)`
```python
# 按映射表批量替换字符
table = str.maketrans("aeiou", "12345")
print("hello".translate(table))  # h2ll4
```

**基本写法：删除指定字符**
`str.maketrans("", "", <要删除字符>)`
```python
# 第三参数指定要删除的字符
table = str.maketrans("", "", "0123456789")
print("a1b2c".translate(table))  # abc
```
