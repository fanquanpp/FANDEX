---
order: 80
title: Map、Set 与弱引用集合
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 键控集合专题：Map 与对象的键类型/顺序/size 差异、Set 去重与集合运算、WeakMap/WeakSet 的弱引用与 GC 关系，含 SKU 去重、过期缓存与 DOM 元数据三个工程场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：键控集合（keyed collections）——`Map`、`Set`、`WeakMap`、`WeakSet` 四件套。
- **解决什么问题**：对象的键只能是字符串/Symbol、没有 `size`、遍历顺序要靠约定；"用任意值做键的字典"与"不重复的值集"这两类需求，对象写起来既笨拙又容易踩原型链的坑。
- **什么时候用到**：缓存与索引表（Map）、去重与标记（Set）、给不属于你的对象挂附属数据（WeakMap）。
- **前置**：[对象与数组](/javascript/070-ObjectArray)；[内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection)（WeakMap 一节与之互为表里）。ES2025 新增的 Set 集合运算方法速查在 [ES 新特性](/javascript/590-ES2023To2026NewFeatures)，本篇只讲基础四件。

## 0. 一句话理解

> 对象是"字符串键的字典"，Map 是"任意键的字典"，Set 是"只存键的字典"，WeakMap/WeakSet 是"不阻止垃圾回收的字典"。字典的四张面孔，按需取用。

## 1. Map 与对象的五个差异

```javascript
const map = new Map();
map.set({ id: 1 }, '对象也能当键');   // 键可以是任意值
map.set(NaN, 'NaN 也能当键');         // Map 内部用 SameValueZero 比较，NaN === NaN 成立
map.get(NaN);                         // 'NaN 也能当键'（对象作键时 NaN 属性读不出来）
map.size;                             // 2：内置 size，不用手数
```

对照对象写同样的东西，差异自然浮出来：

| 维度 | 对象 `{}` | `Map` |
| :--- | :--- | :--- |
| 键类型 | 字符串 / Symbol（数字键会被转成字符串） | 任意值（对象、函数、NaN 都行） |
| 原型链 | 有默认键（`"toString"` 等可能撞车） | 干净，只有你放进去的键 |
| 顺序 | 字符串键按插入序、整数型键按数值序（特殊规则） | 严格插入序 |
| 大小 | `Object.keys(obj).length` | `map.size` |
| 迭代 | 要先 `Object.entries()` | 直接 `for...of` |

为什么顺序差异值得单独记：对象的"整数型键按数值排序"是历史遗留规则，`obj = {}; obj['10']=1; obj['2']=2;` 遍历出 `2, 10` 而不是插入序；Map 永远按插入序，**做 LRU 这类依赖顺序的结构的唯一选择**。

## 2. 例子一（真实工程）：带过期与容量上限的缓存

缓存要求"命中检查 + 过期淘汰 + 容量淘汰"，Map 的有序性让 LRU 淘汰变成两行：

```javascript
class TtlCache {
  constructor(max = 100, ttlMs = 5 * 60 * 1000) {
    this.max = max;
    this.ttl = ttlMs;
    this.store = new Map(); // 插入序：最旧的在最先
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expireAt) {
      this.store.delete(key);       // 过期：先删再返回
      return undefined;
    }
    // 刷新"最近使用"：删掉重插，把条目挪到Map 尾部
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expireAt: Date.now() + this.ttl });
    if (this.store.size > this.max) {
      const oldest = this.store.keys().next().value; // 迭代器第一个 = 最旧
      this.store.delete(oldest);
    }
  }
}

const cache = new TtlCache(50, 60 * 1000);
cache.set('/api/docs', docs);
```

逐段看几个为什么：`this.store.keys().next().value` 是拿"第一个键"的迭代器写法——Map 保持插入序，删除又不会打乱剩余键的相对顺序，所以"删掉重插"就成了标准的 LRU 手法；`expireAt` 存的是绝对时间戳而不是"存入后再倒计时"，因为 get 时判断绝对时间才不怕系统休眠。用对象实现同一功能，你得一维护键数组来模拟顺序，还得小心数字键的排序特例。

## 3. Set：去重与集合运算

```javascript
// 去重：Set 的构造函数直接吃可迭代对象
const ids = ['a', 'b', 'a', 'c', 'b'];
const unique = [...new Set(ids)]; // ['a', 'b', 'c']

// 标记存在性：has 是 O(1)，数组的 includes 是 O(n)
const blacklist = new Set(['admin', 'root']);
if (blacklist.has(name)) { /* 拒绝 */ }
```

为什么"查存在"要用 Set 而不是数组：`includes` 线性扫描，名单一大每次查找都全数组过一遍；`Set.has` 是哈希查找，与成员数量基本无关。**"这个值在不在集合里"的问题，答案一律是 Set**。

按值去重的边界要知道：Set 的相等判断与 `===` 同源（SameValueZero），对象比较的是引用：

```javascript
new Set([{ id: 1 }, { id: 1 }]).size; // 2：两个不同的对象引用
```

### 3.1 例子二：商品 SKU 去重（真实工程场景）

列表页合并"搜索结果 + 推荐位"两个来源的 SKU 时，去重键通常是业务字段而不是对象引用：

```javascript
function mergeSkus(searchHits, recommends) {
  const seen = new Set();
  const out = [];
  for (const sku of [...searchHits, ...recommends]) {
    if (seen.has(sku.skuId)) continue; // 业务键去重，与对象引用无关
    seen.add(sku.skuId);
    out.push(sku);
  }
  return out;
}
```

这里故意不用 `[...new Set(allSkus)]`：引用去重对"内容相同的两个对象"无能为力，**去重键必须来自业务语义**。若需要复合键（如 `规格+店铺`），用模板字符串拼键或直接上 Map（键为数组时 Map 才是正确工具——数组作 Set 成员同样按引用比较）。

对象键去重的标准解法也顺带给出：

```javascript
const dedup = new Map(skus.map((s) => [s.skuId, s]));
const merged = [...dedup.values()]; // 同键后写覆盖先写，天然保序
```

## 4. WeakMap 与 WeakSet：不阻止垃圾回收

弱引用集合的规则一句话：**键（WeakMap）或成员（WeakSet）只持弱引用，对象在其他地方都不可达时，条目自动消失**。

```javascript
const meta = new WeakMap();
const btn = document.querySelector('#submit');
meta.set(btn, { clickCount: 0 });   // 给 DOM 节点挂附属数据
meta.get(btn);                       // { clickCount: 0 }
// btn 被从页面移除且无其他引用后，这条元数据随之被回收，无需手动 delete
```

对比强引用方案的内存故事：`const meta = new Map(); meta.set(btn, {...})` 里 Map 持有 btn 的强引用——DOM 节点从页面移除后，只要 meta 活着，btn 与它的整棵子树都无法回收，这是内存泄漏的经典成因（排查手法见 [内存泄漏排查](/javascript/370-MemoryLeakTroubleshoot)）。

WeakMap 的限制全部源于"弱"：键只能是对象（原始值没有"可回收"的生命周期）；**不可迭代**（垃圾回收随时发生，列条目没有稳定答案）；没有 `size`、没有 `clear`。拿 WeakMap 期待"可遍历的缓存"是方向性错误——那要用上面的 TtlCache。

### 4.1 例子三：给不属于你的对象挂数据（真实工程场景）

给第三方组件实例挂调试标记，不能改它的类，又不想污染它：

```javascript
const mountInfo = new WeakMap();

function trackMount(instance, where) {
  mountInfo.set(instance, { mountedAt: Date.now(), where });
}
function whyAlive(instance) {
  return mountInfo.get(instance); // 组件销毁后查询自动得到 undefined
}
```

用 WeakMap 的三个理由：不修改第三方对象（不触发 setter、不进序列化）；组件销毁后标记自动清理；并发场景下同一实例的标记只有一份。WeakSet 的对应用法是"标记一组对象"：`const visited = new WeakSet(); visited.add(node);` 做图遍历防环——遍历结束后标记自动消失，连清理代码都不用写。

## 5. 四件套选型速查

| 需求 | 用什么 | 一句话理由 |
| :--- | :--- | :--- |
| 字符串键的静态配置 | 对象 | 字面量最直观，可序列化 |
| 运行期动态索引、任意键、要求有序 | Map | 键类型自由 + 严格插入序 + size |
| 存在性判断、去重 | Set | O(1) 的 has |
| 给对象挂附属数据、防环标记 | WeakMap / WeakSet | 随宿主回收，零清理成本 |

## 6. 动手实践

任务（先写，写完再展开参考实现）：

1. 用 Map 实现 `wordCount(text)`：返回每个单词出现次数（按空格分词即可）。
2. 给第 1 题加"只保留出现两次以上的词"，用 Set 表达"要保留的词"。
3. 写 `deepDedupBy(list, keyFn)`：按 `keyFn(item)` 的返回值去重，保持首次出现顺序。
4. 思考：第 1 题用对象做计数器行不行？`Object.create(null)` 与普通对象、Map 三者在此场景的差异是什么？

提示：第 1 题的核心是 `map.get(w) ?? 0` 再加一；第 4 题从"键会不会撞上原型属性"与"要不要遍历顺序"两个角度想。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```javascript
// 1
function wordCount(text) {
  const counts = new Map();
  for (const w of text.split(/\s+/).filter(Boolean)) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return counts;
}

// 2
function hotWords(text) {
  const counts = wordCount(text);
  const keep = new Set([...counts].filter(([, n]) => n >= 2).map(([w]) => w));
  return [...counts].filter(([w]) => keep.has(w));
}

// 3
function deepDedupBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

// 4：对象能做计数器，但有两个坑——
//   普通对象会撞原型键：counts.set 等价于 counts["constructor"]，
//   计数 "constructor" 这个词会读到函数而不是数字；
//   Object.create(null) 解决撞键，但键会被转成字符串且顺序有整数键特例；
//   Map 键类型自由、严格插入序、直接 size，是计数场景的规范答案。
```

</details>

## 7. 下一步

- [ES2023-2026 新特性](/javascript/590-ES2023To2026NewFeatures)：Set 的交集/并集/差集方法速查；
- [内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection)：弱引用的回收时机；
- [深浅拷贝](/javascript/200-DeepShallowCopy)：`structuredClone` 能克隆 Map/Set 的细节。

## 参考与致谢

- MDN Web Docs：Keyed collections、Map、Set、WeakMap、WeakSet（CC-BY-SA 2.5），https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections
- 本篇例子与代码讲解均为原创。
