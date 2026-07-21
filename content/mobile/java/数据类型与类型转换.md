# Java 数据类型与类型转换

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 整数类型

**基本写法：byte 类型**
`byte <变量名> = <值>;`
```java
// 声明 1 字节整数
byte b = 100;
```

---

**基本写法：short 类型**
`short <变量名> = <值>;`
```java
// 声明 2 字节整数
short s = 1000;
```

---

**基本写法：int 类型**
`int <变量名> = <值>;`
```java
// 声明 4 字节整数（默认）
int i = 100000;
```

---

**基本写法：long 类型**
`long <变量名> = <值>L;`
```java
// 声明 8 字节整数必须加 L 后缀
long l = 10000000000L;
```

---

## 浮点数类型

**基本写法：float 类型**
`float <变量名> = <值>F;`
```java
// 声明单精度浮点数必须加 F 后缀
float f = 3.14f;
```

---

**基本写法：double 类型**
`double <变量名> = <值>;`
```java
// 声明双精度浮点数（默认）
double d = 3.1415926535;
```

---

## 字符类型

**基本写法：字符字面量**
`char <变量名> = '<字符>';`
```java
// 使用字符字面量声明
char c1 = 'A';
```

---

**基本写法：ASCII 码赋值**
`char <变量名> = <ASCII码>;`
```java
// 使用 ASCII 码赋值
char c2 = 65;
```

---

**基本写法：Unicode 编码赋值**
`char <变量名> = '\u<编码>';`
```java
// 使用 Unicode 编码赋值
char c3 = '\u0041';
```

---

## 布尔类型

**基本写法：布尔类型**
`boolean <变量名> = <true|false>;`
```java
// 声明布尔类型变量
boolean flag = true;
```

---

## 引用数据类型

**基本写法：类类型声明**
`<类名> <变量名> = new <类名>();`
```java
// 声明集合对象
ArrayList<String> list = new ArrayList<>();
```

---

**基本写法：字符串声明**
`String <变量名> = "<字符串>";`
```java
// 声明字符串对象
String str = "Hello, Java!";
```

---

**基本写法：数组类型声明**
`<类型>[] <变量名> = { <元素> };`
```java
// 声明并初始化数组
int[] numbers = {1, 2, 3, 4, 5};
```

---

## 自动类型转换

**基本写法：小类型转大类型**
`<大类型> <变量名> = <小类型变量>;`
```java
// byte 自动转换为 short
byte b = 100;
short s = b;
```

---

**基本写法：int 转 long**
`long <变量名> = <int变量>;`
```java
// int 自动转换为 long
int i = 100;
long l = i;
```

---

**基本写法：char 转 int**
`int <变量名> = <char变量>;`
```java
// char 自动转换为 int
char c = 'A';
int i = c;
```

---

## 强制类型转换

**基本写法：强制类型转换**
`(<目标类型>) <表达式>`
```java
// double 强制转换为 int
double pi = 3.14159;
int num = (int) pi;
```

---

**基本写法：int 转 byte**
`byte <变量名> = (byte) <int变量>;`
```java
// int 强制转换为 byte
int i = 100;
byte b = (byte) i;
```

---

## 装箱与拆箱

**基本写法：手动装箱**
`<包装类> <变量名> = <包装类>.valueOf(<基本类型>);`
```java
// int 手动装箱为 Integer
int i = 100;
Integer iObj = Integer.valueOf(i);
```

---

**基本写法：自动装箱**
`<包装类> <变量名> = <基本类型>;`
```java
// int 自动装箱为 Integer
Integer iObj = 100;
```

---

**基本写法：手动拆箱**
`<基本类型> <变量名> = <包装类变量>.<xxxValue>();`
```java
// Integer 手动拆箱为 int
Integer iObj = 100;
int i = iObj.intValue();
```

---

**基本写法：自动拆箱**
`<基本类型> <变量名> = <包装类变量>;`
```java
// Integer 自动拆箱为 int
Integer iObj = 100;
int i = iObj;
```

---

## 字符串与基本类型转换

**基本写法：基本类型转字符串**
`String <变量名> = String.valueOf(<基本类型>);`
```java
// int 转换为字符串
int i = 100;
String s = String.valueOf(i);
```

---

**基本写法：字符串转 int**
`int <变量名> = Integer.parseInt(<字符串>);`
```java
// 字符串转换为 int
String s = "100";
int i = Integer.parseInt(s);
```

---

**基本写法：字符串转 double**
`double <变量名> = Double.parseDouble(<字符串>);`
```java
// 字符串转换为 double
String s = "3.14";
double d = Double.parseDouble(s);
```

---

**基本写法：字符串转 boolean**
`boolean <变量名> = Boolean.parseBoolean(<字符串>);`
```java
// 字符串转换为 boolean
String s = "true";
boolean b = Boolean.parseBoolean(s);
```

---

## 运算中的类型提升

**基本写法：byte 运算提升为 int**
`int <变量名> = <byte变量1> + <byte变量2>;`
```java
// 两个 byte 相加结果为 int
byte b1 = 10;
byte b2 = 20;
int i = b1 + b2;
```

---

**基本写法：int 与 double 运算**
`double <变量名> = <int变量> + <double变量>;`
```java
// int 与 double 运算结果为 double
int i = 100;
double d = 3.14;
double result = i + d;
```

---

## 字符串拼接

**基本写法：字符串与数字拼接**
`String <变量名> = <字符串> + <数字>;`
```java
// 字符串与数字拼接
String s = "Result: " + 42;
```

---

**基本写法：括号优先拼接**
`String <变量名> = <字符串> + (<表达式>);`
```java
// 使用括号先计算再拼接
String s = "Result: " + (10 + 20);
```

---

## BigDecimal 精确计算

**基本写法：创建 BigDecimal**
`BigDecimal <变量名> = new BigDecimal("<数值>");`
```java
// 使用字符串创建 BigDecimal
BigDecimal bd = new BigDecimal("0.1");
```

---

**基本写法：BigDecimal 加法**
`BigDecimal <结果> = <bd1>.add(<bd2>);`
```java
// 两个 BigDecimal 相加
BigDecimal bd1 = new BigDecimal("0.1");
BigDecimal bd2 = new BigDecimal("0.2");
BigDecimal sum = bd1.add(bd2);
```
