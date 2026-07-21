# Java 控制流

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## if-else 语句

**基本写法：if 语句**
`if (<条件>) { }`
```java
// 条件为真时执行
if (score >= 90) {
}
```

---

**基本写法：if-else 语句**
`if (<条件>) { } else { }`
```java
// 条件为真执行 if 块否则执行 else 块
if (score >= 60) {
} else {
}
```

---

**换行写法：if-else if-else 链**
`if (<条件>) { } else if (<条件>) { } else { }`
```java
// 多条件分支判断
if (score >= 90) {
} else if (score >= 80) {
} else if (score >= 60) {
} else {
}
```

---

**基本写法：嵌套 if**
`if (<条件>) { if (<条件>) { } else { } }`
```java
// if 语句内部嵌套 if
if (score >= 90) {
    if (score >= 95) {
    } else {
    }
}
```

---

**基本写法：卫语句提前返回**
`if (<条件>) { return; }`
```java
// 条件不满足时提前返回
if (order == null) {
    return;
}
```

---

## switch 语句

**基本写法：传统 switch**
`switch (<表达式>) { case <值>: break; default: }`
```java
// 传统 switch 多分支
switch (day) {
    case 1:
        break;
    case 2:
        break;
    default:
}
```

---

**基本写法：switch case 穿透**
`case <值1>: case <值2>: <语句>; break;`
```java
// 多个 case 共享同一处理
switch (day) {
    case 1:
    case 2:
    case 3:
        System.out.println("Weekday");
        break;
    default:
}
```

---

**基本写法：switch 表达式箭头语法**
`switch (<表达式>) { case <值> -> <结果>; default -> <结果>; }`
```java
// Java 12+ switch 表达式
String dayName = switch (day) {
    case 1 -> "Monday";
    case 2 -> "Tuesday";
    default -> "Invalid";
};
```

---

**基本写法：switch 表达式多值匹配**
`case <值1>, <值2> -> <结果>;`
```java
// 多个值匹配同一结果
String type = switch (day) {
    case 1, 2, 3, 4, 5 -> "Weekday";
    case 6, 7 -> "Weekend";
    default -> "Invalid";
};
```

---

**基本写法：switch 表达式 yield**
`switch (<表达式>) { case <值> -> { yield <结果>; } }`
```java
// 复杂逻辑使用 yield 返回
int result = switch (operation) {
    case "add" -> {
        yield a + b;
    }
    default -> {
        yield 0;
    }
};
```

---

## for 循环

**基本写法：标准 for 循环**
`for (<初始化>; <条件>; <更新>) { }`
```java
// 已知次数的循环
for (int i = 0; i < 10; i++) {
}
```

---

**基本写法：增强型 for 循环**
`for (<类型> <变量> : <可迭代对象>) { }`
```java
// 遍历数组
int[] numbers = {1, 2, 3};
for (int num : numbers) {
}
```

---

**基本写法：带标签的 for 循环**
`<标签>: for (...) { }`
```java
// 为外层循环添加标签
outer: for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
    }
}
```

---

## while 循环

**基本写法：while 循环**
`while (<条件>) { }`
```java
// 先判断后执行
int i = 0;
while (i < 10) {
    i++;
}
```

---

## do-while 循环

**基本写法：do-while 循环**
`do { } while (<条件>);`
```java
// 先执行后判断至少执行一次
int i = 0;
do {
    i++;
} while (i < 10);
```

---

## 循环控制

**基本写法：break 语句**
`break;`
```java
// 跳出当前循环
for (int i = 0; i < 10; i++) {
    if (i == 5) {
        break;
    }
}
```

---

**基本写法：带标签的 break**
`break <标签>;`
```java
// 跳出多层循环
outerLoop: for (int i = 0; i < 5; i++) {
    for (int j = 0; j < 5; j++) {
        if (i * j > 6) {
            break outerLoop;
        }
    }
}
```

---

**基本写法：continue 语句**
`continue;`
```java
// 跳过当前迭代
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) {
        continue;
    }
}
```

---

**基本写法：带标签的 continue**
`continue <标签>;`
```java
// 跳过外层循环的当前迭代
outer: for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        if (j == 1) {
            continue outer;
        }
    }
}
```

---

## return 语句

**基本写法：返回值**
`return <值>;`
```java
// 返回计算结果
public int add(int a, int b) {
    return a + b;
}
```

---

**基本写法：无返回值提前结束**
`return;`
```java
// 提前结束方法
public void validate(int value) {
    if (value < 0) {
        return;
    }
}
```
