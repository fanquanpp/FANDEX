---
order: 230
title: JSON 序列化与解析
module: 'javascript'
category: 前端技术
difficulty: beginner
description: JSON.stringify/parse 的参数全景：replacer/reviver/space、toJSON 钩子、循环引用与 Date/RegExp/undefined 的序列化规则、与 structuredClone 的分工，含草稿存取、日志脱敏与待办导入导出三个场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：JSON 序列化与解析——`JSON.stringify` 与 `JSON.parse` 的行为边界与参数体系。
- **解决什么问题**：把 JS 值变成可存储/可传输的文本，再无损地变回来。两者之间的"损耗清单"（函数消失、undefined 消失、Date 变字符串、循环引用直接抛错）是无数数据丢失事故的根源。
- **什么时候用到**：localStorage 存取、接口请求体、配置文件、调试打印、导出导入功能。
- **前置**：[深浅拷贝](/javascript/200-DeepShallowCopy)（structuredClone 与 JSON 拷贝的分工）；[Web 存储](/javascript/460-StorageForTheWeb)（本篇例子的落点）。

## 0. 一句话理解

> JSON 是 JS 的一个子集投影：只有"能安全跨进程的数据"能完整通过 `stringify → parse` 这条隧道，其余的都会被静默改形或当场报错。用 JSON 之前先问：我的数据过得了隧道吗？

## 1. stringify 的三个参数

```javascript
JSON.stringify(value, replacer, space)
//                值        过滤/变换    缩进
```

第二个参数 `replacer` 两种形态：数组是**白名单**，函数是**变换器**：

```javascript
const user = { id: 1, name: 'Alice', password: 'secret', email: 'a@b.c' };

// 白名单：只保留列出的键
JSON.stringify(user, ['id', 'name']); // '{"id":1,"name":"Alice"}'

// 函数：每个键值对都会经过它，返回 undefined 表示丢弃
JSON.stringify(user, (key, value) => (key === 'password' ? undefined : value));
```

第三个参数 `space` 控制缩进，调试与人读文件时传 2：

```javascript
console.log(JSON.stringify(user, null, 2));
// {
//   "id": 1,
//   "name": "Alice"
// }
```

易错点：replacer 函数**第一次调用时 key 是空字符串、value 是整个对象**，别在这一层就把根对象丢了：

```javascript
JSON.stringify(user, (k, v) => (typeof v === 'string' ? v.trim() : v));
// 根调用 k === ''，typeof 根对象是 object，安全通过
```

## 2. 序列化损耗清单（背下来）

| 值 | stringify 之后 |
| :--- | :--- |
| `undefined`、函数、Symbol | 对象属性中：**整个键消失**；数组中：变成 `null`；顶层：返回 `undefined` |
| `NaN`、`Infinity` | `null` |
| `new Date()` | ISO 字符串（`"2026-10-07T00:00:00.000Z"`），parse 后**不会变回 Date** |
| `RegExp`、`Error`、`Map`、`Set` | `{}`（空对象） |
| 循环引用 | 直接抛 `TypeError: Converting circular structure to JSON` |
| BigInt | 抛 `TypeError` |

```javascript
JSON.stringify({ a: undefined, b() {}, c: NaN });
// '{"c":null}' —— a 和 b 整个键没了，NaN 变 null

const cycle = { name: 'a' };
cycle.self = cycle;
JSON.stringify(cycle); // TypeError：环直接报错，不静默
```

这清单解释了一个高频 bug：**用 localStorage 存了 `Date` 对象，读回来变成字符串**，之前能调的 `.getFullYear()` 现在报错。修法有二：存时间戳（数字）而不是 Date；或在 reviver 里把已知的时间字段还原成 Date（见下一节）。

`toJSON` 是对象的自救通道：stringify 遇到它会优先调用：

```javascript
const meeting = {
  title: '评审会',
  start: new Date('2026-10-07T09:00:00'),
  toJSON() {
    return { title: this.title, startAt: this.start.toISOString() };
  },
};
JSON.stringify(meeting); // '{"title":"评审会","startAt":"2026-10-07T09:00:00.000Z"}'
// toJSON 的返回值才是真正被序列化的东西
```

## 3. parse 的 reviver：读回来时修复形状

`JSON.parse(text, reviver)` 的 reviver 与 replacer 同构，方向相反——**从最内层往外**逐键调用，适合把字符串还原成真对象：

```javascript
const raw = localStorage.getItem('draft');
const draft = JSON.parse(raw ?? '{}', (key, value) => {
  if (key.endsWith('At') && typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d; // 猜不出的原样放行
  }
  return value;
});
draft.updatedAt.getFullYear(); // 又是 Date 了
```

为什么 reviver 从内向外：先让叶子节点（updatedAt 的字符串）有机会变成 Date，父层再拿到的已经是修好的对象——顺序反了就没法修嵌套结构。

## 4. 例子一（真实工程）：localStorage 草稿的存取封装

把上面的规则装进一个小而完整的读写层（[Web 存储](/javascript/460-StorageForTheWeb)的 localStorage 只存字符串，JSON 是它的标准搭档）：

```javascript
const KEY = 'editor:draft';

function saveDraft(draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      ...draft,
      savedAt: Date.now(),          // 时间戳而非 Date：绕开 Date 还原问题
    }));
  } catch (e) {
    // 配额满（QuotaExceededError）是唯一可预期的存储异常
    console.warn('草稿保存失败：存储空间不足', e);
  }
}

function loadDraft() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;            // 没存过不是错误
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(KEY);   // 损坏数据直接丢弃，别让它每次都炸
    return null;
  }
}
```

逐段看为什么：**保存 try/catch** 是因为 localStorage 写入会因配额或隐私模式抛错，未捕获的异常会打断用户的保存流程；**读取单独 try/catch** 是因为手动改过/跨版本改过格式的数据可能不是合法 JSON——读到垃圾就清掉并返回 null，把"坏数据"降级成"没数据"。

## 5. 例子二：接口日志脱敏（replacer 的生产用法）

把请求参数打进日志前，必须抹掉敏感字段——replacer 函数就是干这个的：

```javascript
const SENSITIVE = /^(password|token|authorization|idcard|phone)$/i;

function safeLog(label, payload) {
  const text = JSON.stringify(payload, (key, value) => {
    if (SENSITIVE.test(key)) return '[REDACTED]';
    if (typeof value === 'string' && /^1\d{10}$/.test(value)) {
      return value.slice(0, 3) + '****' + value.slice(-2); // 值形态的手机号打码
    }
    return value;
  });
  console.log(`[${label}]`, text);
}

safeLog('login-req', { user: 'a', phone: '13812345678', password: 'x' });
// [login-req] {"user":"a","phone":"138****78","password":"[REDACTED]"}
```

两层防御的用意：键名匹配是**声明的**敏感字段，正则匹配值是**漏网的实际手机号**——只做前一层，万一字段叫 `mobile` 就漏了。注意 replacer 里不能返回被序列化对象的引用副本之外的东西（比如正则），否则会走第 2 节的损耗清单。

## 6. 例子三：待办应用的导入导出

[待办应用示例](/javascript/700-JavaScriptProjectExampleTodoApp) 常见的进阶需求是"把数据导出成文件、再从文件导入"。导出用 stringify + Blob，导入用 parse + 校验：

```javascript
// 导出：生成 .json 文件下载
function exportTodos(todos) {
  const payload = JSON.stringify(
    { version: 1, exportedAt: Date.now(), todos },
    null, 2, // 人也可能直接打开这个文件看，给缩进
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `todos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url); // 用完立刻释放
}

// 导入：永远不信任文件内容
function importTodos(file) {
  return file.text().then((text) => {
    const data = JSON.parse(text); // 格式错会抛，交给调用方提示
    if (data.version !== 1 || !Array.isArray(data.todos)) {
      throw new Error('不是合法的备份文件');
    }
    return data.todos;
  });
}
```

`version` 字段是导出格式的关键：一年后功能变了、字段加了，读取代码靠版本号决定走哪条迁移路径，而不是猜。`URL.revokeObjectURL` 不调用的话 blob 引用会留到页面刷新——导出功能是内存泄漏的低调来源。

## 7. 与 structuredClone 的分工

| 需求 | 用什么 |
| :--- | :--- |
| 内存内深拷贝，保留 Date/Map/Set/循环引用 | `structuredClone` |
| 存字符串 / 发请求 / 写文件 | `JSON.stringify` |
| 拷贝函数、原型、getter | 都不行：structuredClone 抛错，JSON 直接丢 |

JSON 早就被用来"顺便"深拷贝（`JSON.parse(JSON.stringify(x))`），但它按第 2 节的清单损耗数据；[深浅拷贝](/javascript/200-DeepShallowCopy) 篇的结论是内存拷贝一律 `structuredClone`。**JSON 只负责"变成文本"这一件事**，拷贝是它的兼职且干得不好。

## 8. 动手实践

任务（先写，写完再展开参考实现）：

1. 写 `preview(value)`：返回**带缩进**且**不抛错**的字符串——循环引用时返回 `"[Circular]"` 而不是崩（提示：try/catch 是兜底，不能用循环引用安全版的思路硬解时，先想想调试场景要不要区分）。
2. 实现一个支持 `// 注释` 的 JSON 解析器 `parseJsonc(text)`：把注释剥掉再交给 `JSON.parse`。提示：不能简单地按 `//` 切分——字符串内部的 `//` 是合法内容。
3. 给第 6 节的导出加 `reviver` 读取端：`exportedAt` 读回来是 Date。

提示：第 2 题的状态机思路——逐字符扫描，记录"当前是否在字符串内"，字符串外的 `//` 到行尾才算注释。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```javascript
// 1：调试预览版（简单可靠）
function preview(value) {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return '[无法序列化：可能是循环引用或 BigInt]';
  }
}
// 进阶思路：用 WeakSet 记录"正在序列化的祖先对象"，在自定义递归里
// 检测到重复祖先时输出 "[Circular]"——见深浅拷贝篇的递归克隆写法。

// 2：支持注释的解析（状态机剥注释）
function parseJsonc(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;   // \" 是字符串内容，不是边界
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === '/' && text[i + 1] === '/') {  // 行注释：吞到行尾
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {  // 块注释：吞到 */
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++; // 跳过结尾的 '/'
      continue;
    }
    out += ch;
  }
  return JSON.parse(out);
}

// 3
function readBackup(text) {
  const data = JSON.parse(text, (key, value) =>
    key === 'exportedAt' ? new Date(value) : value);
  return data;
}
```

第 2 题的三个易错点都埋在状态机里：`\\"` 转义让"字符串里的引号"不结束字符串；`//` 在字符串内是内容不是注释；块注释结束时 `i++` 只跳一个字符，外层 for 的 `i++` 补上另一半。

</details>

## 9. 下一步

- [深浅拷贝](/javascript/200-DeepShallowCopy)：structuredClone 的完整规则；
- [Web 存储](/javascript/460-StorageForTheWeb)：localStorage 的配额与同步 IO 特性；
- [Fetch 与 AbortController](/javascript/440-FetchApiAndAbortController)：JSON 在请求体与响应体两端的角色。

## 参考与致谢

- MDN Web Docs：Using the JSON object（CC-BY-SA 2.5），https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
- JSON 数据交换格式规范：RFC 8259，https://www.rfc-editor.org/rfc/rfc8259
- 本篇例子与代码讲解均为原创。
