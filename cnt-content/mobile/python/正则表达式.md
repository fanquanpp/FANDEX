# 正则表达式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## re 模块导入

**基本写法：导入 re 模块**
`import re`

```python
# 导入正则表达式模块
import re
```

---

## 基本匹配

**基本写法：使用 re.match 从开头匹配**
`re.match(<模式>, <字符串>)`

```python
# 从字符串开头匹配
result = re.match(r"Hello", "Hello, World!")
```

---

**基本写法：使用 re.search 搜索**
`re.search(<模式>, <字符串>)`

```python
# 在字符串中搜索第一个匹配
result = re.search(r"World", "Hello, World!")
```

---

**基本写法：使用 re.findall 查找所有匹配**
`re.findall(<模式>, <字符串>)`

```python
# 查找所有匹配项
results = re.findall(r"\d+", "abc123def456")
```

---

**基本写法：使用 re.finditer 迭代匹配**
`re.finditer(<模式>, <字符串>)`

```python
# 迭代所有匹配项
for match in re.finditer(r"\d+", "abc123def456"):
    print(match.group())
```

---

## 匹配对象操作

**基本写法：获取匹配的字符串**
`<匹配对象>.group()`

```python
# 获取匹配的字符串
match = re.search(r"\d+", "abc123def")
print(match.group())
```

---

**基本写法：获取匹配的起始位置**
`<匹配对象>.start()`

```python
# 获取匹配的起始位置
match = re.search(r"\d+", "abc123def")
print(match.start())
```

---

**基本写法：获取匹配的结束位置**
`<匹配对象>.end()`

```python
# 获取匹配的结束位置
match = re.search(r"\d+", "abc123def")
print(match.end())
```

---

**基本写法：获取匹配的 span**
`<匹配对象>.span()`

```python
# 获取匹配的起止位置元组
match = re.search(r"\d+", "abc123def")
print(match.span())
```

---

## 字符类

**基本写法：匹配数字**
`\d`

```python
# 匹配数字
result = re.findall(r"\d+", "abc123def456")
```

---

**基本写法：匹配非数字**
`\D`

```python
# 匹配非数字字符
result = re.findall(r"\D+", "abc123def456")
```

---

**基本写法：匹配单词字符**
`\w`

```python
# 匹配字母、数字、下划线
result = re.findall(r"\w+", "hello_world 123!")
```

---

**基本写法：匹配非单词字符**
`\W`

```python
# 匹配非单词字符
result = re.findall(r"\W+", "hello_world 123!")
```

---

**基本写法：匹配空白字符**
`\s`

```python
# 匹配空白字符
result = re.findall(r"\s+", "hello world\ttab")
```

---

**基本写法：匹配非空白字符**
`\S`

```python
# 匹配非空白字符
result = re.findall(r"\S+", "hello world")
```

---

**基本写法：使用字符集合**
`[<字符集合>]`

```python
# 匹配方括号内的任意字符
result = re.findall(r"[aeiou]", "hello world")
```

---

**基本写法：使用字符范围**
`[<起始>-<结束>]`

```python
# 匹配 a 到 z 的小写字母
result = re.findall(r"[a-z]+", "Hello World 123")
```

---

**基本写法：使用否定字符集合**
`[^<字符集合>]`

```python
# 匹配不在方括号内的字符
result = re.findall(r"[^aeiou]", "hello world")
```

---

## 量词

**基本写法：匹配 0 次或多次**
`<字符>*`

```python
# 匹配 0 次或多次
result = re.findall(r"ab*", "a ab abb abbb")
```

---

**基本写法：匹配 1 次或多次**
`<字符>+`

```python
# 匹配 1 次或多次
result = re.findall(r"ab+", "a ab abb abbb")
```

---

**基本写法：匹配 0 次或 1 次**
`<字符>?`

```python
# 匹配 0 次或 1 次
result = re.findall(r"ab?", "a ab abb")
```

---

**基本写法：匹配指定次数**
`<字符>{<次数>}`

```python
# 匹配恰好 3 次
result = re.findall(r"\d{3}", "12 123 1234")
```

---

**基本写法：匹配至少 n 次**
`<字符>{<次数>,}`

```python
# 匹配至少 2 次
result = re.findall(r"\d{2,}", "1 12 123 1234")
```

---

**基本写法：匹配 n 到 m 次**
`<字符>{<n>,<m>}`

```python
# 匹配 2 到 4 次
result = re.findall(r"\d{2,4}", "1 12 123 1234 12345")
```

---

## 锚点

**基本写法：匹配字符串开头**
`^<模式>`

```python
# 匹配字符串开头
result = re.match(r"^Hello", "Hello, World!")
```

---

**基本写法：匹配字符串结尾**
`<模式>$`

```python
# 匹配字符串结尾
result = re.search(r"World!$", "Hello, World!")
```

---

**基本写法：匹配单词边界**
`\b<模式>\b`

```python
# 匹配完整单词
result = re.findall(r"\bcat\b", "cat category cat")
```

---

## 分组与捕获

**基本写法：使用括号分组**
`(<模式>)`

```python
# 使用括号创建捕获组
match = re.search(r"(\d+)-(\d+)", "电话: 123-456")
print(match.group(1))
print(match.group(2))
```

---

**基本写法：获取所有分组**
`<匹配对象>.groups()`

```python
# 获取所有分组
match = re.search(r"(\d+)-(\d+)", "电话: 123-456")
print(match.groups())
```

---

**基本写法：命名分组**
`(?P<<名称><模式>)`

```python
# 使用命名分组
match = re.search(r"(?P<year>\d{4})-(?P<month>\d{2})", "日期: 2024-01")
print(match.group("year"))
print(match.group("month"))
```

---

**基本写法：非捕获分组**
`(?:<模式>)`

```python
# 使用非捕获分组
result = re.findall(r"(?:ab)+", "ababab ab")
```

---

**基本写法：引用分组**
`\<分组号>`

```python
# 引用前面的分组
result = re.findall(r"(\w+)\s+\1", "hello hello world world")
```

---

## 替换操作

**基本写法：使用 re.sub 替换**
`re.sub(<模式>, <替换>, <字符串>)`

```python
# 替换所有匹配项
result = re.sub(r"\d+", "N", "abc123def456")
```

---

**基本写法：限制替换次数**
`re.sub(<模式>, <替换>, <字符串>, count=<n>)`

```python
# 只替换前 1 个匹配项
result = re.sub(r"\d+", "N", "abc123def456", count=1)
```

---

**基本写法：使用函数替换**
`re.sub(<模式>, <函数>, <字符串>)`

```python
# 使用函数进行替换
def double(match):
    return str(int(match.group()) * 2)

result = re.sub(r"\d+", double, "abc123def456")
```

---

**基本写法：使用反向引用替换**
`re.sub(r"<模式>", r"<替换>", <字符串>)`

```python
# 使用反向引用进行替换
result = re.sub(r"(\w+),(\w+)", r"\2,\1", "hello,world")
```

---

## 分割操作

**基本写法：使用 re.split 分割**
`re.split(<模式>, <字符串>)`

```python
# 按模式分割字符串
result = re.split(r"\s+", "hello   world   python")
```

---

**基本写法：限制分割次数**
`re.split(<模式>, <字符串>, maxsplit=<n>)`

```python
# 限制分割次数
result = re.split(r"\s+", "hello world python", maxsplit=1)
```

---

## 编译正则表达式

**基本写法：编译正则表达式**
`re.compile(<模式>)`

```python
# 编译正则表达式
pattern = re.compile(r"\d+")
result = pattern.findall("abc123def456")
```

---

**基本写法：使用编译后的模式匹配**
`<模式>.match(<字符串>)`

```python
# 使用编译后的模式
pattern = re.compile(r"\d+")
match = pattern.match("123abc")
```

---

**基本写法：使用编译后的模式搜索**
`<模式>.search(<字符串>)`

```python
# 使用编译后的模式搜索
pattern = re.compile(r"\d+")
match = pattern.search("abc123def")
```

---

**基本写法：使用编译后的模式查找所有**
`<模式>.findall(<字符串>)`

```python
# 使用编译后的模式查找所有
pattern = re.compile(r"\d+")
results = pattern.findall("abc123def456")
```

---

**基本写法：使用编译后的模式替换**
`<模式>.sub(<替换>, <字符串>)`

```python
# 使用编译后的模式替换
pattern = re.compile(r"\d+")
result = pattern.sub("N", "abc123def456")
```

---

## 标志位

**基本写法：忽略大小写**
`re.IGNORECASE`

```python
# 忽略大小写匹配
result = re.findall(r"hello", "Hello HELLO hello", re.IGNORECASE)
```

---

**基本写法：多行模式**
`re.MULTILINE`

```python
# 多行模式下 ^ 和 $ 匹配每行
result = re.findall(r"^\w+", "line1\nline2\nline3", re.MULTILINE)
```

---

**基本写法：点号匹配所有**
`re.DOTALL`

```python
# 点号匹配包括换行符
result = re.findall(r".+", "line1\nline2", re.DOTALL)
```

---

**基本写法：组合多个标志位**
`re.IGNORECASE | re.MULTILINE`

```python
# 组合多个标志位
result = re.findall(r"^hello", "Hello\nhello\nHELLO", re.IGNORECASE | re.MULTILINE)
```

---

**基本写法：使用内联标志**
`(?<标志><模式>)`

```python
# 使用内联标志
result = re.findall(r"(?i)hello", "Hello HELLO hello")
```

---

## 贪婪与非贪婪

**基本写法：贪婪匹配**
`<字符>*`

```python
# 贪婪匹配（尽可能多匹配）
result = re.findall(r"<.*>", "<a><b><c>")
```

---

**基本写法：非贪婪匹配**
`<字符>*?`

```python
# 非贪婪匹配（尽可能少匹配）
result = re.findall(r"<.*?>", "<a><b><c>")
```

---

**基本写法：非贪婪加号**
`<字符>+?`

```python
# 非贪婪加号
result = re.findall(r"\d+?", "12345")
```

---

## 前瞻与后顾

**基本写法：正向前瞻**
`<模式>(?=<前瞻模式>)`

```python
# 正向前瞻（匹配后面跟着的）
result = re.findall(r"\d+(?= dollars)", "100 dollars 200 euros")
```

---

**基本写法：负向前瞻**
`<模式>(?!<前瞻模式>)`

```python
# 负向前瞻（匹配后面不跟着的）
result = re.findall(r"\d+(?! dollars)", "100 dollars 200 euros")
```

---

**基本写法：正向后顾**
`(?<=<后顾模式>)<模式>`

```python
# 正向后顾（匹配前面是...的）
result = re.findall(r"(?<=\$)\d+", "$100 and $200")
```

---

**基本写法：负向后顾**
`(?<!<后顾模式>)<模式>`

```python
# 负向后顾（匹配前面不是...的）
result = re.findall(r"(?<!\$)\d+", "$100 and 200")
```

---

## 常用正则模式

**基本写法：匹配邮箱**
`r"[\w.+-]+@[\w-]+\.[\w.]+"`

```python
# 匹配邮箱地址
emails = re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", "联系: alice@example.com")
```

---

**基本写法：匹配 URL**
`r"https?://[\w./-]+"`

```python
# 匹配 URL
urls = re.findall(r"https?://[\w./-]+", "访问 https://example.com 或 http://test.org")
```

---

**基本写法：匹配手机号**
`r"1[3-9]\d{9}"`

```python
# 匹配中国大陆手机号
phones = re.findall(r"1[3-9]\d{9}", "电话: 13812345678")
```

---

**基本写法：匹配 IP 地址**
`r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"`

```python
# 匹配 IP 地址
ips = re.findall(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", "IP: 192.168.1.1")
```

---

**基本写法：匹配日期**
`r"\d{4}-\d{2}-\d{2}"`

```python
# 匹配日期
dates = re.findall(r"\d{4}-\d{2}-\d{2}", "日期: 2024-01-15")
```

---

## 字符串方法与正则对比

**基本写法：使用字符串方法替换**
`<字符串>.replace(<旧>, <新>)`

```python
# 使用字符串方法替换
result = "hello world".replace("world", "python")
```

---

**基本写法：使用正则替换**
`re.sub(<模式>, <替换>, <字符串>)`

```python
# 使用正则替换
result = re.sub(r"\s+", "_", "hello   world")
```

---

## 验证与提取

**基本写法：验证邮箱格式**
`re.match(<模式>, <字符串>)`

```python
# 验证邮箱格式
def is_valid_email(email):
    pattern = r"^[\w.+-]+@[\w-]+\.[\w.]+$"
    return bool(re.match(pattern, email))
```

---

**基本写法：提取数字**
`re.findall(r"\d+", <字符串>)`

```python
# 从字符串中提取所有数字
numbers = re.findall(r"\d+", "价格: 100元，数量: 5个")
```

---

**基本写法：提取 URL**
`re.findall(r"https?://[\w./-]+", <字符串>)`

```python
# 从文本中提取 URL
text = "访问 https://example.com 了解更多"
urls = re.findall(r"https?://[\w./-]+", text)
```
