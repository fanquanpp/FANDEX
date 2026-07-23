# JavaScript 数据类型与运算符

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 算术运算符

**基本写法：加法运算**
`<操作数1> + <操作数2>`
```javascript
// 两个数字相加
let sum = 10 + 3;
```

---

**基本写法：减法运算**
`<操作数1> - <操作数2>`
```javascript
// 两个数字相减
let diff = 10 - 3;
```

---

**基本写法：乘法运算**
`<操作数1> * <操作数2>`
```javascript
// 两个数字相乘
let product = 10 * 3;
```

---

**基本写法：除法运算**
`<操作数1> / <操作数2>`
```javascript
// 两个数字相除
let quotient = 10 / 3;
```

---

**基本写法：取模运算**
`<操作数1> % <操作数2>`
```javascript
// 取余数
let remainder = 10 % 3;
```

---

**基本写法：幂运算**
`<底数> ** <指数>`
```javascript
// 计算幂
let power = 2 ** 10;
```

---

## 自增自减

**基本写法：后置自增**
`<变量>++`
```javascript
// 先使用后加 1
let a = 5;
let b = a++;
```

---

**基本写法：前置自增**
`++<变量>`
```javascript
// 先加 1 后使用
let a = 5;
let b = ++a;
```

---

**基本写法：后置自减**
`<变量>--`
```javascript
// 先使用后减 1
let a = 5;
let b = a--;
```

---

**基本写法：前置自减**
`--<变量>`
```javascript
// 先减 1 后使用
let a = 5;
let b = --a;
```

---

## 赋值运算符

**基本写法：简单赋值**
`<变量> = <值>`
```javascript
// 给变量赋值
let a = 10;
```

---

**基本写法：加法复合赋值**
`<变量> += <值>`
```javascript
// 等价于 a = a + 5
let a = 10;
a += 5;
```

---

**基本写法：减法复合赋值**
`<变量> -= <值>`
```javascript
// 等价于 a = a - 3
let a = 10;
a -= 3;
```

---

**基本写法：乘法复合赋值**
`<变量> *= <值>`
```javascript
// 等价于 a = a * 2
let a = 10;
a *= 2;
```

---

**基本写法：除法复合赋值**
`<变量> /= <值>`
```javascript
// 等价于 a = a / 4
let a = 10;
a /= 4;
```

---

**基本写法：取模复合赋值**
`<变量> %= <值>`
```javascript
// 等价于 a = a % 3
let a = 10;
a %= 3;
```

---

**基本写法：幂运算复合赋值**
`<变量> **= <值>`
```javascript
// 等价于 a = a ** 2
let a = 10;
a **= 2;
```

---

## 比较运算符

**基本写法：抽象等于**
`<操作数1> == <操作数2>`
```javascript
// 比较值不比较类型会类型转换
let result = (10 == "10");
```

---

**基本写法：抽象不等于**
`<操作数1> != <操作数2>`
```javascript
// 比较值不比较类型
let result = (10 != "10");
```

---

**基本写法：严格等于**
`<操作数1> === <操作数2>`
```javascript
// 比较值和类型都不转换
let result = (10 === 10);
```

---

**基本写法：严格不等于**
`<操作数1> !== <操作数2>`
```javascript
// 比较值和类型是否不全等
let result = (10 !== "10");
```

---

**基本写法：大于比较**
`<操作数1> > <操作数2>`
```javascript
// 比较左边是否大于右边
let result = (10 > 3);
```

---

**基本写法：小于比较**
`<操作数1> < <操作数2>`
```javascript
// 比较左边是否小于右边
let result = (10 < 3);
```

---

**基本写法：大于等于比较**
`<操作数1> >= <操作数2>`
```javascript
// 比较左边是否大于等于右边
let result = (10 >= 3);
```

---

**基本写法：小于等于比较**
`<操作数1> <= <操作数2>`
```javascript
// 比较左边是否小于等于右边
let result = (10 <= 3);
```

---

## 逻辑运算符

**基本写法：逻辑与**
`<布尔表达式1> && <布尔表达式2>`
```javascript
// 两个条件都为真才为真
let result = (x > 0) && (x < 100);
```

---

**基本写法：逻辑或**
`<布尔表达式1> || <布尔表达式2>`
```javascript
// 任一条件为真即为真
let result = (x < 0) || (x > 100);
```

---

**基本写法：逻辑非**
`!<布尔表达式>`
```javascript
// 对布尔值取反
let result = !flag;
```

---

**基本写法：空值合并运算符**
`<值1> ?? <值2>`
```javascript
// 左侧为 null 或 undefined 时返回右侧
let value = a ?? b;
```

---

**基本写法：可选链操作符**
`<对象>?.<属性>`
```javascript
// 安全访问嵌套属性
let name = user?.name;
```

---

## 位运算符

**基本写法：按位与**
`<操作数1> & <操作数2>`
```javascript
// 二进制位与运算
let result = 6 & 3;
```

---

**基本写法：按位或**
`<操作数1> | <操作数2>`
```javascript
// 二进制位或运算
let result = 6 | 3;
```

---

**基本写法：按位异或**
`<操作数1> ^ <操作数2>`
```javascript
// 二进制位异或运算
let result = 6 ^ 3;
```

---

**基本写法：按位取反**
`~<操作数>`
```javascript
// 二进制位取反
let result = ~6;
```

---

**基本写法：左移**
`<操作数> << <位数>`
```javascript
// 二进制位左移
let result = 6 << 1;
```

---

**基本写法：右移**
`<操作数> >> <位数>`
```javascript
// 有符号右移
let result = 6 >> 1;
```

---

**基本写法：无符号右移**
`<操作数> >>> <位数>`
```javascript
// 无符号右移高位补 0
let result = -6 >>> 1;
```

---

## 字符串运算符

**基本写法：字符串拼接**
`<字符串1> + <字符串2>`
```javascript
// 拼接两个字符串
let result = "Hello" + " " + "World";
```

---

**基本写法：字符串复合赋值**
`<变量> += <字符串>`
```javascript
// 追加字符串到变量
let str = "Hello";
str += " World";
```

---

## 三元运算符

**基本写法：三元条件运算符**
`<条件> ? <表达式1> : <表达式2>`
```javascript
// 根据条件选择值
let max = (a > b) ? a : b;
```

---

**基本写法：嵌套三元运算符**
`<条件1> ? <值1> : (<条件2> ? <值2> : <值3>)`
```javascript
// 嵌套三元运算符
let grade = (score >= 90) ? "A" : (score >= 60) ? "B" : "C";
```

---

## 类型运算符

**基本写法：typeof**
`typeof <操作数>`
```javascript
// 获取操作数类型
let type = typeof "hello";
```

---

**基本写法：instanceof**
`<对象> instanceof <构造函数>`
```javascript
// 检查对象是否为某类型实例
let result = arr instanceof Array;
```

---

**基本写法：delete**
`delete <对象>.<属性>`
```javascript
// 删除对象属性
delete obj.name;
```

---

**基本写法：in**
`"<属性>" in <对象>`
```javascript
// 检查属性是否存在于对象中
let has = "name" in obj;
```

---

## 运算符优先级

**基本写法：使用括号明确顺序**
`(<表达式>)`
```javascript
// 使用括号改变运算顺序
let result = (a + b) * (c - d);
```

---

## 数值处理

**基本写法：Math.max**
`Math.max(<值1>, <值2>)`
```javascript
// 获取最大值
let max = Math.max(10, 20);
```

---

**基本写法：Math.min**
`Math.min(<值1>, <值2>)`
```javascript
// 获取最小值
let min = Math.min(10, 20);
```

---

**基本写法：Math.round**
`Math.round(<数字>)`
```javascript
// 四舍五入
let rounded = Math.round(3.7);
```

---

**基本写法：Math.floor**
`Math.floor(<数字>)`
```javascript
// 向下取整
let floored = Math.floor(3.7);
```

---

**基本写法：Math.ceil**
`Math.ceil(<数字>)`
```javascript
// 向上取整
let ceiled = Math.ceil(3.2);
```

---

**基本写法：Math.abs**
`Math.abs(<数字>)`
```javascript
// 取绝对值
let abs = Math.abs(-10);
```

---

**基本写法：Math.random**
`Math.random()`
```javascript
// 生成 0 到 1 之间的随机数
let random = Math.random();
```

---

**基本写法：Number.isInteger**
`Number.isInteger(<值>)`
```javascript
// 判断是否为整数
let isInt = Number.isInteger(42);
```

---

**基本写法：Number.isNaN**
`Number.isNaN(<值>)`
```javascript
// 判断是否为 NaN
let isNan = Number.isNaN(value);
```

---

**基本写法：toFixed**
`<数字>.toFixed(<小数位数>)`
```javascript
// 保留指定小数位
let fixed = (3.14159).toFixed(2);
```
