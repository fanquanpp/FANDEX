---
order: 230
title: JavaScript Map/Set/WeakMap/WeakSet 语法速查手册
module: 'javascript'
category: 前端技术
difficulty: beginner
description: JavaScript Map/Set/WeakMap/WeakSet 语法速查 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 前置知识

- 对象与数组的基本用法（见 `javascript/007-ObjectArray`）。

## 学习目标

- 知道 Map、Set 相比"对象 + 数组"分别解决什么问题；
- 记住 WeakMap/WeakSet 的弱引用语义与典型用途；
- 会用 ES2025 原生集合运算方法替代手写交集差集。

## Map：为什么不用对象存键值对

Object 的键只能是字符串（Symbol 除外）：拿一个 DOM 节点或一个对象当键，会被强制转成字符串 `"[object Object]"`，所有对象键都撞到同一个槽里。Map 补上了这个能力——**键可以是任意类型**，并且按插入顺序遍历、`size` 直接可查、增删场景下性能更稳。

类比你可把 Object 当"通讯录"（键是姓名字符串），把 Map 当"储物柜"（柜子可以是任何东西本身）。

## Set：为什么不用数组去重后存

数组查"是否包含某元素"是 `includes` 的线性扫描，数据量大时慢；Set 的 `has` 接近常数时间。凡是"只关心有没有、不关心顺序重复"的场景（已访问 ID、权限标签、待去重数据），Set 都是更贴切的结构。


## Map 基础

**基本写法：创建与增删改查**
`new Map([[<k>, <v>], ...])`
```javascript
// Map 保留插入顺序，键可为任意类型
const m = new Map([["a", 1]]);
m.set("b", 2);     // 添加
m.get("a");        // 1
m.has("b");        // true
m.size;            // 2
m.delete("a");     // 删除
m.clear();         // 清空
```

---

## Map 遍历

**基本写法：遍历键值对**
`<map>.forEach((<v>, <k>) => {})`
```javascript
// 按插入顺序遍历
const m = new Map([["a", 1], ["b", 2]]);
m.forEach((v, k) => console.log(k, v));
```

---

**基本写法：entries / keys / values**
`<map>.entries()`
```javascript
// 返回迭代器
for (const [k, v] of m.entries()) {}
for (const k of m.keys()) {}
for (const v of m.values()) {}
```

---

## Map 与对象互转

**基本写法：对象转 Map**
`new Map(Object.entries(<对象>))`
```javascript
// 对象转 Map
const obj = { a: 1, b: 2 };
const m = new Map(Object.entries(obj));
```

---

**基本写法：Map 转对象**
`Object.fromEntries(<map>)`
```javascript
// Map 转对象，键须为字符串
const obj = Object.fromEntries(m);
```

---

## Set 基础

**基本写法：创建与增删查**
`new Set([<可迭代>])`
```javascript
// Set 值唯一，自动去重
const s = new Set([1, 2, 2, 3]);
s.add(4);          // 添加
s.has(3);          // true
s.size;            // 4
s.delete(2);       // 删除
s.clear();         // 清空
```

---

## Set 去重与运算

**基本写法：数组去重**
`[...new Set(<数组>)]`
```javascript
// 利用 Set 唯一性去重
const uniq = [...new Set([1, 1, 2, 3, 3])]; // [1, 2, 3]
```

---

**基本写法：交集差集（ES2025 前）**
`new Set([...a].filter(x => b.has(x)))`
```javascript
// 兼容写法
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
const inter = new Set([...a].filter(x => b.has(x))); // {2,3}
const diff = new Set([...a].filter(x => !b.has(x))); // {1}
```

---

**基本写法：Set 集合运算（ES2025 原生方法）**
`<set>.union(<other>)` 等
```javascript
// ES2025 起直接内置七个集合运算方法，全部返回新 Set、不改原集合
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b);               // Set(4) {1,2,3,4}   并集
a.intersection(b);        // Set(2) {2,3}       交集
a.difference(b);          // Set(1) {1}         差集（a 有 b 无）
a.symmetricDifference(b); // Set(2) {1,4}       对称差（仅一方有）
a.isSubsetOf(b);          // false              a 是否为 b 的子集
a.isSupersetOf(b);        // false              a 是否为 b 的超集
a.isDisjointFrom(b);      // false              是否无交集（有公共元素 2,3）

// 参数接受任何 Set-like（有 has/size 即可），比手写 filter+includes 的 O(n*m) 快
a.intersection(new Set([3]));  // Set(1) {3}
```

---

## Set 遍历

**基本写法：遍历 Set**
`for (const <v> of <set>) {}`
```javascript
// Set 默认遍历 values
for (const v of s) {}
s.forEach(v => {});
```

---

## WeakMap 基础

**基本写法：创建与操作**
`new WeakMap([[<对象键>, <值>]])`
```javascript
// 键必须为对象，键被回收后自动清除该项
const wm = new WeakMap();
const key = {};
wm.set(key, "data");
wm.get(key);   // "data"
wm.has(key);   // true
wm.delete(key);
```

---

**基本写法：私有属性模拟**
`const wm = new WeakMap()` | `wm.set(this, <私有>)`
```javascript
// 利用 WeakMap 模拟私有字段
const priv = new WeakMap();
class Counter {
  constructor() { priv.set(this, 0); }
  inc() { priv.set(this, priv.get(this) + 1); }
  get val() { return priv.get(this); }
}
```

---

## WeakSet 基础

**基本写法：创建与操作**
`new WeakSet([<可迭代对象>])`
```javascript
// 只能存对象，弱引用
const ws = new WeakSet();
const o = {};
ws.add(o);
ws.has(o);   // true
ws.delete(o);
```

---

## WeakRef 与 FinalizationRegistry

**基本写法：弱引用对象**
`new WeakRef(<对象>)`
```javascript
// 不阻止垃圾回收
let obj = { data: 1 };
const ref = new WeakRef(obj);
ref.deref(); // 取值，被回收后返回 undefined
```

---

**基本写法：垃圾回收回调**
`new FinalizationRegistry(<回调>)`
```javascript
// 对象被回收时触发清理
const registry = new FinalizationRegistry(held => {
  console.log("释放", held);
});
registry.register(obj, "标记值");
```

---

## Map 与 Object 区别

**基本写法：键类型与顺序**
`<map>.set(<任意键>, <值>)`
```javascript
// Map 键可为对象函数，Object 键转字符串
const m = new Map();
const key = {};
m.set(key, 1); // 对象作键
// Object 作键会被转成 "[object Object]"
```

---

## 性能与选择

**基本写法：频繁增删用 Map**
`<map>.set(<k>, <v>)`
```javascript
// Map 频繁增删性能优于 Object
// 大数据量查找 Map 接近 O(1)
// 需要键为非字符串时必须用 Map
```

## 核心知识点

> 一句话记住集合：Map 任意键的字典、Set 唯一值集合；WeakMap/WeakSet 键弱引用、可被回收，适合对象关联数据。

- Map：任意类型键、保留插入顺序、`get/set/has/delete/size`；
- Set：值唯一、自动去重、`add/has/delete`；
- Map ↔ 对象互转：`Object.entries` / `Object.fromEntries`；
- Set 集合运算（ES2025）：`union/intersection/difference/symmetricDifference/isSubsetOf/isSupersetOf/isDisjointFrom`；
- WeakMap：键必须是对象、不可遍历、无引用时回收；
- WeakSet：值必须是对象、不可遍历；
- 遍历：`forEach`/`keys()`/`values()`/`entries()`。

## 动手试试

1. 用 Map 实现“用户 ID → 用户对象”的缓存；
2. 用 Set 对数组去重；
3. 用 WeakMap 给 DOM 节点关联元数据；
4. 进阶挑战：用 Map 实现 LRU 缓存。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用对象当 Map | 键只能是字符串 | 使用 Map |
| WeakMap 期望遍历 | 不可遍历 | 改用 Map（注意强引用） |
| Set 存对象去重 | 引用去重非值去重 | 按需序列化键 |

## 常见陷阱

| 陷阱 | 说明 | 改进方案 |
| --- | --- | --- |
| Set 存对象后 `has` 判 false | 引用去重：内容相同的两个对象仍是两个引用 | 存不可变值/序列化键，或复用同一引用 |
| `Object.fromEntries(map)` 丢对象键 | 对象的键必须是字符串 | 需保留对象键就用 Map 本身，别转对象 |
| WeakMap 想 `size`/遍历 | 弱引用集合不可枚举（否则干扰 GC 时机） | 需要遍历就换 Map（注意强引用） |
| NaN 作键 | NaN !== NaN，但 Map/Set 用 SameValueZero 比较，NaN 可作键且只占一位 | 了解即可，行为符合直觉 |

## 扩展学习

- 对象：`javascript/021-ObjectStaticMethods`；
- 内存：`javascript/037-MemoryManagementAndGarbageCollection`；
- 数组：`javascript/007-ObjectArray`。
