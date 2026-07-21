# JavaScript 正则表达式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 正则创建

**基本写法：字面量创建**
`/<模式>/<标志>`
```javascript
// 使用字面量创建正则表达式
let pattern = /hello/gi;
```

---

**基本写法：构造函数创建**
`new RegExp("<模式>", "<标志>")`
```javascript
// 使用构造函数创建正则表达式
let pattern = new RegExp("hello", "gi");
```

---

**基本写法：动态模式**
`new RegExp(<变量>)`
```javascript
// 使用变量构建动态模式
let word = "hello";
let pattern = new RegExp(word, "g");
```

---

## 标志

**基本写法：全局标志 g**
`/<模式>/g`
```javascript
// 全局匹配所有结果
let pattern = /hello/g;
```

---

**基本写法：忽略大小写 i**
`/<模式>/i`
```javascript
// 忽略大小写匹配
let pattern = /hello/i;
```

---

**基本写法：多行标志 m**
`/<模式>/m`
```javascript
// 多行模式下 ^ 和 $ 匹配每行
let pattern = /^hello/m;
```

---

**基本写法：组合标志**
`/<模式>/<标志组合>`
```javascript
// 组合多个标志
let pattern = /hello/gim;
```

---

## 字符类

**基本写法：任意字符**
`/.`
```javascript
// 匹配除换行符外的任意字符
let pattern = /a.c/;
```

---

**基本写法：字符集**
`/[<字符>]/`
```javascript
// 匹配方括号内的任意字符
let pattern = /[aeiou]/;
```

---

**基本写法：范围字符集**
`/[<起始>-<结束>]/`
```javascript
// 匹配指定范围的字符
let pattern = /[a-z]/;
```

---

**基本写法：否定字符集**
`/[^<字符>]/`
```javascript
// 匹配不在方括号内的字符
let pattern = /[^0-9]/;
```

---

## 预定义类

**基本写法：数字 \d**
`/\d/`
```javascript
// 匹配数字等价于 [0-9]
let pattern = /\d+/;
```

---

**基本写法：非数字 \D**
`/\D/`
```javascript
// 匹配非数字等价于 [^0-9]
let pattern = /\D+/;
```

---

**基本写法：单词字符 \w**
`/\w/`
```javascript
// 匹配单词字符等价于 [a-zA-Z0-9_]
let pattern = /\w+/;
```

---

**基本写法：非单词字符 \W**
`/\W/`
```javascript
// 匹配非单词字符
let pattern = /\W+/;
```

---

**基本写法：空白 \s**
`/\s/`
```javascript
// 匹配空白字符
let pattern = /\s+/;
```

---

**基本写法：非空白 \S**
`/\S/`
```javascript
// 匹配非空白字符
let pattern = /\S+/;
```

---

## 量词

**基本写法：零次或多次**
`/<字符>*`
```javascript
// 匹配前一个字符零次或多次
let pattern = /ab*c/;
```

---

**基本写法：一次或多次**
`/<字符>+`
```javascript
// 匹配前一个字符一次或多次
let pattern = /ab+c/;
```

---

**基本写法：零次或一次**
`/<字符>?`
```javascript
// 匹配前一个字符零次或一次
let pattern = /ab?c/;
```

---

**基本写法：精确次数**
`/<字符>{<次数>}`
```javascript
// 匹配前一个字符指定次数
let pattern = /a{3}/;
```

---

**基本写法：范围次数**
`/<字符>{<最小>, <最大>}`
```javascript
// 匹配前一个字符指定范围次数
let pattern = /a{2,4}/;
```

---

**基本写法：至少次数**
`/<字符>{<次数>,}`
```javascript
// 匹配前一个字符至少指定次数
let pattern = /a{2,}/;
```

---

## 锚点

**基本写法：行首 ^**
`/^<模式>`
```javascript
// 匹配字符串开头
let pattern = /^Hello/;
```

---

**基本写法：行尾 $**
`/<模式>$/`
```javascript
// 匹配字符串结尾
let pattern = /World$/;
```

---

**基本写法：单词边界 \b**
`/\b<单词>\b/`
```javascript
// 匹配完整单词
let pattern = /\bhello\b/;
```

---

## 分组

**基本写法：捕获组**
`/(<模式>)/`
```javascript
// 捕获匹配的内容
let pattern = /(\d+)-(\d+)/;
```

---

**基本写法：非捕获组**
`/(?:<模式>)/`
```javascript
// 非捕获分组不保存匹配
let pattern = /(?:\d+)-(\d+)/;
```

---

**基本写法：命名捕获组**
`/(?<<名称><模式>)/`
```javascript
// 命名捕获组
let pattern = /(?<year>\d{4})-(?<month>\d{2})/;
```

---

## 选择与引用

**基本写法：选择符**
`/<模式1>|<模式2>/`
```javascript
// 匹配多个模式之一
let pattern = /cat|dog/;
```

---

**基本写法：反向引用**
`/<字符>\1`
```javascript
// 引用第一个捕获组
let pattern = /(\w)\1/;
```

---

## 方法

**基本写法：test 测试**
`<正则>.test(<字符串>)`
```javascript
// 测试字符串是否匹配
let result = /hello/.test("hello world");
```

---

**基本写法：exec 执行**
`<正则>.exec(<字符串>)`
```javascript
// 执行匹配返回结果数组
let result = /(\d+)/.exec("abc123");
```

---

**基本写法：match 方法**
`<字符串>.match(<正则>)`
```javascript
// 字符串匹配正则
let result = "hello".match(/l/g);
```

---

**基本写法：matchAll 方法**
`<字符串>.matchAll(<正则>)`
```javascript
// 返回所有匹配的迭代器
let results = "a1b2c3".matchAll(/\d/g);
```

---

**基本写法：replace 替换**
`<字符串>.replace(<正则>, <替换>)`
```javascript
// 替换匹配的内容
let result = "hello".replace(/l/g, "L");
```

---

**基本写法：replace 回调**
`<字符串>.replace(<正则>, <回调>)`
```javascript
// 使用回调函数替换
let result = "hello".replace(/l/g, match => match.toUpperCase());
```

---

**基本写法：search 查找**
`<字符串>.search(<正则>)`
```javascript
// 查找匹配的索引
let index = "hello".search(/l/);
```

---

**基本写法：split 分割**
`<字符串>.split(<正则>)`
```javascript
// 使用正则分割字符串
let parts = "a,b;c".split(/[,;]/);
```

---

## 断言

**基本写法：正向先行断言**
`/<模式>(?=<断言>)`
```javascript
// 匹配后面跟着指定内容的位置
let pattern = /\d+(?=元)/;
```

---

**基本写法：负向先行断言**
`/<模式>(?!<断言>)`
```javascript
// 匹配后面不跟指定内容的位置
let pattern = /\d+(?!元)/;
```

---

**基本写法：正向后行断言**
`/(?<=<断言>)<模式>/`
```javascript
// 匹配前面是指定内容的位置
let pattern = /(?<=￥)\d+/;
```

---

**基本写法：负向后行断言**
`/(?<!<断言>)<模式>/`
```javascript
// 匹配前面不是指定内容的位置
let pattern = /(?<!\$)\d+/;
```

---

## 常用模式

**基本写法：邮箱匹配**
`/^[<字符>]+@[<字符>]+\.[<字符>]+$/`
```javascript
// 简单邮箱格式匹配
let pattern = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/;
```

---

**基本写法：手机号匹配**
`/^1[3-9]\d{9}$/`
```javascript
// 中国手机号格式匹配
let pattern = /^1[3-9]\d{9}$/;
```

---

**基本写法：URL 匹配**
`/^https?:\/\/<域名>/`
```javascript
// HTTP URL 格式匹配
let pattern = /^https?:\/\/[^\s]+/;
```

---

**基本写法：IP 地址匹配**
`/^(\d{1,3}\.){3}\d{1,3}$/`
```javascript
// IPv4 地址格式匹配
let pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
```

---

## ES2024+ 正则新特性

**基本写法：RegExp v 标志与集合操作**
`/<模式>/v`
```javascript
// v 标志支持集合操作交集 && 差集 -- 与 Unicode 属性
let pattern = /[\p{Letter}&&\p{ASCII}]/v;
```

---

**基本写法：String.prototype.isWellFormed 检查**
`<字符串>.isWellFormed()`
```javascript
// 检查字符串是否为合法 Unicode 无单独代理项
let ok = "hello".isWellFormed();
```

---

**基本写法：RegExp.escape 转义**
`RegExp.escape(<字符串>)`
```javascript
// 转义字符串中的正则特殊字符用于安全构建正则
let escaped = RegExp.escape("a.b*c");
```
