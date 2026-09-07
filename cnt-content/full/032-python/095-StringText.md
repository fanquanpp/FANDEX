---
order: 950
title: Python 字符串与文本处理
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 字符串与文本处理 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## string 模块

**基本写法：常量字符串**
`string.ascii_letters` | `string.digits`
```python
# 字符常量
import string

print(string.ascii_letters)  # a-zA-Z
print(string.ascii_lowercase)
print(string.ascii_uppercase)
print(string.digits)         # 0-9
print(string.punctuation)    # 标点符号
```

**基本写法：Template 模板替换**
`string.Template(<模板>)`
```python
# 使用 $ 占位符的模板
from string import Template

t = Template("Hello, $name! You are $age.")
print(t.substitute(name="Alice", age=18))
```

**基本写法：safe_substitute 安全替换**
`t.safe_substitute(<字典>)`
```python
# 缺少占位符不报错
print(t.safe_substitute(name="Alice"))  # age 占位符保留
```

**基本写法：自定义分隔符**
`Template(<模板>, delimiter=<字符>)`
```python
# 自定义分隔符（如用 #）
class HashTemplate(Template):
    delimiter = "#"

t = HashTemplate("Hello, #name!")
print(t.substitute(name="Alice"))
```

---

## textwrap 文本换行

**基本写法：wrap 换行**
`textwrap.wrap(<文本>, width=<宽度>)`
```python
# 按指定宽度换行返回列表
import textwrap

lines = textwrap.wrap("Hello, World! This is a long text.", width=10)
print(lines)
```

**基本写法：fill 填充换行**
`textwrap.fill(<文本>, width=<宽度>)`
```python
# 返回换行后的字符串
print(textwrap.fill("Hello World!", width=5))
```

**基本写法：shorten 截断**
`textwrap.shorten(<文本>, width=<宽度>, placeholder=<占位>)`
```python
# 截断文本并添加占位符
print(textwrap.shorten("Hello World Hello Python", width=15, placeholder="..."))
```

**基本写法：dedent 去除缩进**
`textwrap.dedent(<文本>)`
```python
# 去除多行文本的公共缩进
text = """
    first
    second
    """
print(textwrap.dedent(text))
```

**基本写法：indent 添加缩进**
`textwrap.indent(<文本>, <前缀>)`
```python
# 给每行添加前缀
print(textwrap.indent("a\nb", "    "))
```

**基本写法：TextWrapper 对象**
`textwrap.TextWrapper(width=<宽度>)`
```python
# 复用配置
wrapper = textwrap.TextWrapper(width=70, initial_indent="> ", subsequent_indent="  ")
print(wrapper.fill("long text..."))
```

---

## unicodedata Unicode 数据

**基本写法：字符名称**
`unicodedata.name(<字符>)`
```python
# 获取 Unicode 字符名
import unicodedata

print(unicodedata.name("A"))  # LATIN CAPITAL LETTER A
print(unicodedata.name("中"))  # CJK UNIFIED IDEOGRAPH-4E2D
```

**基本写法：按名称查找字符**
`unicodedata.lookup(<名称>)`
```python
# 按名称查找字符
print(unicodedata.lookup("HEAVY BLACK HEART"))  # 心
```

**基本写法：分类**
`unicodedata.category(<字符>)`
```python
# 获取 Unicode 分类
print(unicodedata.category("A"))  # Lu（大写字母）
print(unicodedata.category("1"))  # Nd（数字）
```

**基本写法：数值**
`unicodedata.decimal(<字符>)` | `unicodedata.numeric(<字符>)`
```python
# 获取字符数值
print(unicodedata.decimal("5"))  # 5
print(unicodedata.numeric("½"))  # 0.5
```

**基本写法：标准化**
`unicodedata.normalize(<形式>, <字符串>)`
```python
# Unicode 标准化
s = "café"
print(unicodedata.normalize("NFC", s))  # 组合形式
print(unicodedata.normalize("NFD", s))  # 分解形式
```

**基本写法：字符镜像**
`unicodedata.mirrored(<字符>)`
```python
# 是否为镜像字符
print(unicodedata.mirrored("("))  # 1
```

---

## codecs 编解码

**基本写法：获取编码器**
`codecs.lookup(<编码>)`
```python
# 查询编码信息
import codecs

enc = codecs.lookup("utf-8")
print(enc.name)
```

**基本写法：open 编码打开**
`codecs.open(<文件>, <模式>, <编码>)`
```python
# 指定编码打开文件
with codecs.open("file.txt", "r", "utf-8") as f:
    print(f.read())
```

**基本写法：编码与解码**
`codecs.encode(<字符串>, <编码>)` | `codecs.decode(<字节>, <编码>)`
```python
# 编码转换
b = codecs.encode("hello", "utf-8")
s = codecs.decode(b, "utf-8")
```

**基本写法：转码**
`codecs.encode(<字符串>, "rot_13")`
```python
# 特殊编码如 rot13
print(codecs.encode("hello", "rot_13"))
```

---

## 字符串方法扩展

**基本写法：str.translate 翻译表**
`str.maketrans(<字典>)`
```python
# 批量字符替换/删除
table = str.maketrans("aeiou", "12345")
print("hello".translate(table))  # h2ll4

# 删除字符
del_table = str.maketrans("", "", "aeiou")
print("hello".translate(del_table))  # hll
```

**基本写法：str.partition 分区**
`<字符串>.partition(<分隔符>)`
```python
# 三元组返回
print("a=b".partition("="))  # ("a", "=", "b")
```

**基本写法：str.format_map**
`<字符串>.format_map(<字典>)`
```python
# 用字典格式化
d = {"name": "Alice", "age": 18}
print("{name} is {age}".format_map(d))
```

---

## binascii 二进制文本

**基本写法：base64 编码**
`base64.b64encode(<字节>)`
```python
# Base64 编解码
import base64

print(base64.b64encode(b"hello"))
print(base64.b64decode(b"aGVsbG8="))
```

**基本写法：hex 编码**
`<字节>.hex()` | `bytes.fromhex(<字符串>)`
```python
# 十六进制编解码
print(b"hello".hex())
print(bytes.fromhex("68656c6c6f"))
```

**基本写法：URL 安全 base64**
`base64.urlsafe_b64encode(<字节>)`
```python
# URL 安全的 base64
print(base64.urlsafe_b64encode(b"ab?cd"))
```
