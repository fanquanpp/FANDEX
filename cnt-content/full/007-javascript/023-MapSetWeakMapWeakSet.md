---
order: 230
title: JavaScript Map/Set/WeakMap/WeakSet 语法速查手册
module: 'javascript'
category: 前端技术
difficulty: beginner
description: JavaScript Map/Set/WeakMap/WeakSet 语法速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

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

## 扩展学习

- 对象：`javascript/020-ObjectStaticMethods`；
- 内存：`javascript/036-MemoryManagementAndGarbageCollection`；
- 数组：`javascript/006-ObjectArray`。
