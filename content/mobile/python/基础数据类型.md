# 基础数据类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 整数类型

**基本写法：十进制整数**
`<十进制> = 123`

```python
# 十进制整数
x = 123
```

---

**基本写法：二进制整数**
`<二进制> = 0b<二进制串>`

```python
# 二进制整数（以 0b 开头）
y = 0b1010
```

---

**基本写法：八进制整数**
`<八进制> = 0o<八进制串>`

```python
# 八进制整数（以 0o 开头）
z = 0o123
```

---

**基本写法：十六进制整数**
`<十六进制> = 0x<十六进制串>`

```python
# 十六进制整数（以 0x 开头）
p = 0x1A
```

---

## 整数运算

**基本写法：加法运算**
`<操作数1> + <操作数2>`

```python
# 整数加法
addition = 10 + 5
```

---

**基本写法：整除运算**
`<操作数1> // <操作数2>`

```python
# 整除（向下取整）
floor_division = 10 // 3
```

---

**基本写法：取模运算**
`<操作数1> % <操作数2>`

```python
# 取模（求余数）
modulo = 10 % 3
```

---

**基本写法：幂运算**
`<操作数1> ** <操作数2>`

```python
# 幂运算
power = 2 ** 3
```

---

**基本写法：复合赋值运算**
`<变量> <运算符>= <值>`

```python
# 复合赋值运算符
x = 10
x += 5
```

---

## 浮点数类型

**基本写法：普通浮点数**
`<浮点数> = <小数>`

```python
# 普通浮点数
pi = 3.14159
```

---

**基本写法：科学记数法**
`<科学记数法> = <尾数>e<指数>`

```python
# 科学记数法
avogadro = 6.022e23
```

---

## 复数类型

**基本写法：复数字面量**
`<复数> = <实部> + <虚部>j`

```python
# 复数定义
c1 = 3 + 4j
```

---

**基本写法：使用 complex() 函数**
`complex(<实部>, <虚部>)`

```python
# 使用 complex() 创建复数
c2 = complex(2, 5)
```

---

**基本写法：访问复数实部**
`<复数>.real`

```python
# 获取复数的实部
print(c1.real)
```

---

**基本写法：访问复数虚部**
`<复数>.imag`

```python
# 获取复数的虚部
print(c1.imag)
```

---

## 数学函数

**基本写法：导入 math 模块**
`import math`

```python
# 导入数学模块
import math
```

---

**基本写法：调用 math 函数**
`math.<函数>(<参数>)`

```python
# 计算平方根
print(math.sqrt(16))
```

---

**基本写法：向下取整**
`math.floor(<浮点数>)`

```python
# 向下取整
print(math.floor(3.9))
```

---

**基本写法：向上取整**
`math.ceil(<浮点数>)`

```python
# 向上取整
print(math.ceil(3.1))
```

---

## 字符串

**基本写法：单引号字符串**
`'<字符串>'`

```python
# 单引号字符串
s1 = 'Hello, World!'
```

---

**基本写法：双引号字符串**
`"<字符串>"`

```python
# 双引号字符串
s2 = "Hello, World!"
```

---

**换行写法：三引号多行字符串**
`'''<多行字符串>'''`

```python
# 三引号字符串（支持多行）
s3 = '''Hello,
World!'''
```

---

**基本写法：原始字符串**
`r'<字符串>'`

```python
# 原始字符串（不转义）
s4 = r'C:\path\to\file'
```

---

**基本写法：字节字符串**
`b'<字符串>'`

```python
# 字节字符串
s5 = b'Hello'
```

---

## 字符串拼接

**基本写法：使用 + 运算符拼接**
`<字符串1> + <字符串2>`

```python
# 使用 + 拼接字符串
full_name = "Alice" + " " + "Smith"
```

---

**基本写法：使用 * 运算符重复**
`<字符串> * <次数>`

```python
# 使用 * 重复字符串
print("Hello" * 3)
```

---

## 字符串切片

**基本写法：获取单个字符**
`<字符串>[<索引>]`

```python
# 获取指定位置的字符
print(s[0])
```

---

**基本写法：切片操作**
`<字符串>[<start>:<stop>:<step>]`

```python
# 切片获取子字符串
print(s[0:5])
```

---

**基本写法：反转字符串**
`<字符串>[::-1]`

```python
# 使用切片反转字符串
print(s[::-1])
```

---

## 字符串方法

**基本写法：转换为大写**
`<字符串>.upper()`

```python
# 转换为大写
print(s.upper())
```

---

**基本写法：查找子串位置**
`<字符串>.find(<子串>)`

```python
# 查找子串位置
print(s.find("World"))
```

---

**基本写法：替换子串**
`<字符串>.replace(<旧子串>, <新子串>)`

```python
# 替换字符串中的子串
print(s.replace("World", "Python"))
```

---

**基本写法：分割字符串**
`<字符串>.split(<分隔符>)`

```python
# 按分隔符分割字符串
print(s.split(", "))
```

---

**基本写法：连接字符串列表**
`<分隔符>.join(<字符串列表>)`

```python
# 使用分隔符连接字符串列表
print(", ".join(["Hello", "Python"]))
```

---

**基本写法：去除空白字符**
`<字符串>.strip()`

```python
# 去除两端空白字符
print(" Hello ".strip())
```

---

## 字符串格式化

**基本写法：f-string 格式化**
`f"<文本>{<表达式>}"`

```python
# f-string 基本用法
name = "Alice"
age = 30
print(f"My name is {name} and I am {age} years old.")
```

---

**基本写法：f-string 格式化选项**
`f"<文本>{<表达式>:<格式说明>}"`

```python
# f-string 浮点数格式化
pi = 3.14159
print(f"Pi is approximately {pi:.2f}")
```

---

**基本写法：format() 方法**
`"<文本>{}".format(<参数>)`

```python
# 使用 format() 方法格式化
print("My name is {} and I am {} years old.".format("Alice", 30))
```

---

**基本写法：% 运算符格式化**
`"<格式>" % <值>`

```python
# C 风格 % 格式化
print("My name is %s and I am %d years old." % ("Alice", 30))
```

---

## 布尔类型

**基本写法：逻辑与运算**
`<表达式> and <表达式>`

```python
# 逻辑与运算
print(True and False)
```

---

**基本写法：逻辑或运算**
`<表达式> or <表达式>`

```python
# 逻辑或运算
print(True or False)
```

---

**基本写法：逻辑非运算**
`not <表达式>`

```python
# 逻辑非运算
print(not True)
```

---

**基本写法：布尔上下文判断**
`if <对象>: <语句>`

```python
# 在布尔上下文中判断对象真假
if "Hello":
    print("非空字符串为真")
```

---

## 空值 None

**基本写法：赋值为 None**
`<变量> = None`

```python
# 赋值为 None
x = None
```

---

**基本写法：使用 is 检查 None**
`<变量> is None`

```python
# 使用 is 运算符检查 None
x = None
print(x is None)
```

---

## 类型转换

**基本写法：转换为整数**
`int(<值>)`

```python
# 转换为整数
print(int("123"))
```

---

**基本写法：转换为浮点数**
`float(<值>)`

```python
# 转换为浮点数
print(float("3.14"))
```

---

**基本写法：转换为字符串**
`str(<值>)`

```python
# 转换为字符串
print(str(123))
```

---

**基本写法：转换为布尔值**
`bool(<值>)`

```python
# 转换为布尔值
print(bool(1))
```

---

**基本写法：转换为列表**
`list(<可迭代对象>)`

```python
# 转换为列表
print(list("Hello"))
```

---

**基本写法：转换为元组**
`tuple(<可迭代对象>)`

```python
# 转换为元组
print(tuple([1, 2, 3]))
```

---

**基本写法：转换为集合**
`set(<可迭代对象>)`

```python
# 转换为集合（去重）
print(set([1, 2, 3, 2, 1]))
```

---

**基本写法：转换为字典**
`dict(<键值对序列>)`

```python
# 转换为字典
print(dict([("a", 1), ("b", 2)]))
```

---

## 类型检查

**基本写法：获取对象类型**
`type(<对象>)`

```python
# 获取对象的类型
print(type(42))
```

---

**基本写法：检查对象是否为指定类型**
`isinstance(<对象>, <类型>)`

```python
# 检查对象是否为指定类型
print(isinstance(42, int))
```

---

**基本写法：检查是否为多种类型之一**
`isinstance(<对象>, (<类型1>, <类型2>))`

```python
# 检查对象是否为多种类型之一
print(isinstance(42, (int, float)))
```

---

## Python 3.13+ 新特性

**基本写法：type 参数支持复数形式**
`type(<对象>, complex)`

```python
# Python 3.13 type() 第三参数支持复数形式（用于复数类型判断）
x = 3 + 4j
print(type(x, complex))
```

---

**基本写法：Python 3.13 改进的错误消息**
`<表达式>  # 触发错误时高亮精确位置`

```python
# Python 3.13 改进的错误消息（更精确的错误定位）
# 字典键访问错误会精确高亮具体键名,而非整行
data = {"name": "Alice"}
# data["age"]  # 触发 KeyError 时错误消息高亮 "age" 字符串本身
```

---

**基本写法：Python 3.14 t-string 模板字符串**
`t"<文本>{<表达式>}"`

```python
# Python 3.14 t-string 模板字符串（返回 Template 对象,不立即求值）
name = "Alice"
template = t"Hello, {name}!"
```

---

**基本写法：Python 3.14 模板字符串渲染**
`<模板>.render(<上下文字典>)`

```python
# Python 3.14 模板字符串渲染（调用 render 方法执行求值）
template = t"Hello, {name}!"
result = template.render({"name": "Alice"})
print(result)
```

---

**基本写法：Python 3.13 自由线程模式**
`python -X gil=0 <脚本>`

```python
# Python 3.13 自由线程模式（禁用 GIL,允许多线程真正并行）
# 命令行执行：python -X gil=0 script.py
# 需使用启用 --disable-gil 编译选项的 Python 解释器
```

---

**基本写法：Python 3.13 实验性 JIT**
`python -X jit <脚本>`

```python
# Python 3.13 实验性 JIT 编译器（提升长运行任务性能）
# 命令行执行：python -X jit script.py
# 需使用启用 --enable-experimental-jit 编译选项的 Python 解释器
```
