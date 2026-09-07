---
order: 200
title: 相等契约救急锦囊： equals 与 hashCode
module: 'java'
category: 后端技术
difficulty: beginner
description: 为什么重写 equals 必须重写 hashCode，以及 Objects.hash 极简写法。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/021-CollectionFrameworkDetailed'
  - 'java/025-JavaObjectsUtility'
prerequisites:
  - 'java/015-OOP'
---

## 一句话定调

**HashSet/HashMap 找对象，先查"门牌号"（hashCode），再比"长相"（equals）**。两个对象相等，门牌号必须相同；门牌号不同，永远不可能相等。

## 极简代码（看懂这 20 行就够了）

```java
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class User {
    private final String id;
    private final String name;

    public User(String id, String name) {
        this.id = id;
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;              // 同一个对象
        if (!(o instanceof User u)) return false; // 类型不同直接 false
        return Objects.equals(id, u.id) && Objects.equals(name, u.name);
    }

    @Override
    public int hashCode() {
        // Objects.hash 按相同字段生成哈希，保证契约成立
        return Objects.hash(id, name);
    }
}

// 效果：new 出来的两个"内容相同"对象，也能在集合里互相找到
Set<User> users = new HashSet<>();
users.add(new User("S001", "张三"));
System.out.println(users.contains(new User("S001", "张三"))); // true
```

## 如果报这个错，看这里

**现象：`HashSet.contains()` / `HashMap.get()` 明明有数据却返回 false/null**

原因：只重写了 `equals` 没重写 `hashCode`，两个相等对象落在不同"门牌号"；或 `hashCode` 依赖了可变字段，对象放入集合后又改了字段。

对策：`equals` 与 `hashCode` 永远一起重写，且只用**不可变字段**参与计算；放入 HashSet/HashMap 后不要再修改参与计算的字段。

**现象：`hashCode` 相同但 `equals` 为 false（哈希碰撞）**

这是正常现象，不是 bug：`HashMap` 会在同门牌号下用 `equals` 逐个比较。只要契约正确，碰撞只影响性能不影响正确性。

## 记住

> 重写 `equals` 就必须重写 `hashCode`，字段保持一致；用 `Objects.equals` + `Objects.hash` 一行搞定。
