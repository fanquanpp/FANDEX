---
order: 250
title: Web Storage
module: 'html5'
category: 前端技术
difficulty: beginner
description: localStorage/sessionStorage 边界、JSON 序列化陷阱、storage 事件跨标签页同步与存储方案决策指南。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/246-FetchApiAndErrorHandling'
  - 'html5/248-FileBlobAndObjectURL'
  - 'html5/284-ObserverAndPageLifecycleAPIs'
  - 'html5/300-ServiceWorkerPWA'
prerequisites: []
---

## 知识点地图

- **知识类别**：浏览器端数据持久化（Web Storage）——前端「存数据」的基础能力。
- **解决什么问题**：
  - 用户偏好、表单草稿、购物车暂存需要"关掉浏览器也不丢"（或"关掉标签页就清空"）；
  - 多个标签页打开同一站点时，状态要互相知道（storage 事件）。
- **什么时候用到**：任何需要记住用户状态的场景用 Storage；从服务器取数据见 [Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)；文件数据见 [File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL)。
- **前置要求**：JavaScript 基础（对象、Promise、async/await）。大数据量存储的完整方案见 `javascript/470-IndexedDBADatabaseInYourBrowser`；离线缓存的整体架构见 [300-ServiceWorkerPWA](/html5/300-ServiceWorkerPWA)；地理定位见 [260-Geolocation](/html5/260-Geolocation)；后台线程见 [290-WebWorkers](/html5/290-WebWorkers)。

## 与相邻篇章的分工

本文原为「Web Storage 与 Fetch API」，已按一文件一主题拆分：

- fetch 网络请求（错误处理、表单提交、取消与上传）拆至 [Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)；
- IntersectionObserver 等观察者家族拆至 [Observer 家族与页面生命周期](/html5/284-ObserverAndPageLifecycleAPIs)；
- File API 速查拆至并扩写为 [File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL)；
- Notification API 与 Service Worker 推送同属一个体系，见 [Service Worker 与 PWA](/html5/300-ServiceWorkerPWA)。

本篇专注存储：三节 API、三个工程例子、决策指南。

## 1. Web Storage：键值对持久化

### 1.1 localStorage 与 sessionStorage 的边界

两者 API 完全一致，唯一区别是**生命周期与作用域**：

| 特性 | localStorage | sessionStorage | Cookie（对照） |
| --- | --- | --- | --- |
| 存储容量 | 约 5MB | 约 5MB | 约 4KB |
| 存储时间 | 永久，手动清除才失效 | 会话期间，关标签页即失效 | 可设置过期时间 |
| 随请求发送 | 否 | 否 | 是（每次请求自动带） |
| 作用域 | 同源所有标签页共享 | 同一标签页独立 | 可设置路径与域 |
| API 复杂度 | 简单 | 简单 | 复杂 |

**判断口诀：要跨标签页、要长期保存 → localStorage；只属于当前标签页的临时态（如表单草稿） → sessionStorage；必须随请求发给服务器的（登录态） → Cookie 或 Authorization 头，不要用 Web Storage。**

基本操作：

```javascript
// 存
localStorage.setItem('name', 'Alice');
// 取（键不存在时返回 null，不是报错）
const name = localStorage.getItem('name');
// 删单个键
localStorage.removeItem('age');
// 清空全部（仅当前源）
localStorage.clear();

// 遍历所有键值对
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key + ': ' + localStorage.getItem(key));
}

// sessionStorage 用法完全一致
sessionStorage.setItem('token', 'abc123');
```

**讲解：**

- Web Storage 的值**只能是字符串**——存数字 `setItem('age', 30)` 实际存的是 `"30"`，取出做加法前要 `Number()` 转换；
- 超出容量（写入超过约 5MB）抛 `QuotaExceededError`，批量写入要 try/catch；
- 读写是**同步阻塞主线程**的，频繁读写大值会卡页面；大数据用 IndexedDB（异步）。

### 1.2 JSON 序列化陷阱

存对象必须先序列化，这是新手第一大坑：

```javascript
// 错误写法：对象被隐式转成 "[object Object]"
localStorage.setItem('user', { name: 'Bob', age: 25 });
const broken = localStorage.getItem('user');
console.log(broken); // "[object Object]"——数据已丢失

// 正确写法：写入前 stringify，读取后 parse
const user = { name: 'Bob', age: 25, email: 'bob@example.com' };
localStorage.setItem('user', JSON.stringify(user));

const storedUser = JSON.parse(localStorage.getItem('user'));
console.log(storedUser.name); // "Bob"
```

**逐行讲解：**

- `JSON.stringify(user)` 把对象转成 JSON 字符串；读取端 `JSON.parse` 还原。两步缺一不可；
- **parse 的容错**：键不存在时 `getItem` 返回 `null`，`JSON.parse(null)` 得到 `null` 不报错；但存过坏数据（手工改坏、旧版本格式）时 parse 会抛 `SyntaxError`——健壮的封装要 try/catch 并给出默认值：

```javascript
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    console.warn('存储数据损坏，使用默认值:', key);
    return fallback;
  }
}
```

- 其他隐性损失：`undefined`、函数、`Symbol` 序列化时被丢弃；`Date` 对象变成字符串；循环引用直接抛错。存"纯数据"没问题，存"带行为的对象"要先转成纯数据。

### 1.3 storage 事件：跨标签页同步

**其他标签页**修改 localStorage 时，当前标签页会收到 `storage` 事件——这是免费的跨标签页通信通道：

```javascript
// 标签页 B：监听别人的修改
window.addEventListener('storage', (event) => {
  console.log('变更的键:', event.key);        // null 表示 clear()
  console.log('旧值:', event.oldValue);       // null 表示新增
  console.log('新值:', event.newValue);       // null 表示删除
  console.log('来源页面:', event.url);
  console.log('存储区域:', event.storageArea);
});
```

**StorageEvent 属性表：**

| 属性 | 说明 |
| --- | --- |
| `key` | 变更的键（null 表示 clear） |
| `newValue` | 新值（null 表示删除） |
| `oldValue` | 旧值（null 表示新增） |
| `url` | 触发变更的页面 URL |
| `storageArea` | 受影响的存储对象 |

**重要细节：触发修改的那个标签页自己收不到该事件**——事件只发给同源的其他标签页。要"自己改了自己也知道"，需要手动派发自定义事件或在修改处直接调用同步逻辑。更结构化的跨标签页消息通道（BroadcastChannel）见 `javascript/417-BrowserObserversAndCrossTabMessaging`。

## 2. 三个真实工程例子

### 2.1 换肤偏好持久化（localStorage）

```html
<label><input type="checkbox" id="darkMode" /> 深色模式</label>
<script>
  const darkModeToggle = document.getElementById('darkMode');
  const body = document.body;

  // 页面加载：恢复上次的偏好
  if (localStorage.getItem('darkMode') === 'on') {
    body.classList.add('dark-theme');
    darkModeToggle.checked = true;
  }

  // 切换时立即保存
  darkModeToggle.addEventListener('change', function () {
    body.classList.toggle('dark-theme', this.checked);
    localStorage.setItem('darkMode', this.checked ? 'on' : 'off');
  });
</script>
```

**讲解：**

- 布尔偏好存成 `'on'/'off'` 字符串而不是空串，语义清晰且避免"空串是 falsy"的歧义；
- `classList.toggle(class, force)` 第二参指定强开/强关，一行替代 if-else；
- 主题切换最好在 `<head>` 里同步读取（内联小脚本），避免"先白后黑"的闪烁——那是进阶话题，原理相同。

### 2.2 表单草稿自动保存（sessionStorage）

多字段表单填写到一半误刷新是高频事故，用 sessionStorage 按标签页保存草稿：

```html
<form id="signup">
  <input name="title" placeholder="标题" />
  <textarea name="content" placeholder="正文"></textarea>
  <button type="submit">发布</button>
</form>
<script>
  const form = document.getElementById('signup');
  const DRAFT_KEY = 'draft:signup';

  // 输入时防抖保存（简单起见每 1 秒最多存一次）
  let timer = null;
  form.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const data = Object.fromEntries(new FormData(form));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }, 1000);
  });

  // 加载时恢复草稿
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    if (saved) {
      for (const [name, value] of Object.entries(saved)) {
        if (form.elements[name]) form.elements[name].value = value;
      }
    }
  } catch (e) { /* 草稿损坏则忽略 */ }

  // 提交成功后清掉草稿
  form.addEventListener('submit', () => {
    sessionStorage.removeItem(DRAFT_KEY);
  });
</script>
```

**逐段讲解：**

- `new FormData(form)` 收集全部字段，`Object.fromEntries` 转成普通对象——比逐个取 input 干净，新增字段自动覆盖；表单的 Ajax 提交形态见 [Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)；
- 防抖（1000ms 内多次输入只存最后一次）减少同步写 Storage 的次数；
- 恢复前检查 `form.elements[name]` 存在，防止表单字段改名后写入报错；
- 用 sessionStorage 而非 localStorage：草稿属于"这个标签页的未完成工作"，关标签页就该消失，跨标签页恢复反而奇怪。

### 2.3 购物车离线暂存（localStorage + storage 事件）

弱网环境下把购物车先存本地，网络恢复再提交；多个标签页同时打开店铺页时用 storage 事件同步数量：

```javascript
const CART_KEY = 'cart:items';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((it) => it.sku === item.sku);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ sku: item.sku, name: item.name, qty: 1 });
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    // 容量满：提示用户而不是静默丢失
    alert('本地存储已满，请先结算部分商品');
  }
}

// 另一个标签页加了商品，本页角标实时更新
window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) updateCartBadge(getCart().length);
});
```

**讲解：**

- 购物车按 sku 去重合并数量，是"读-改-写"模式；注意同一标签页内连续点击不会触发 storage 事件（只发给别的标签页），角标更新要自己调用；
- 写入失败要用户可见——静默吞掉 `QuotaExceededError` 会让用户以为加购成功；
- 这是"本地暂存"层，真正的下单仍要走 fetch 提交到服务器（见 [Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)），本地数据只是缓冲。

## 3. 存储方案决策指南

| 场景 | 推荐方案 | 原因 |
| --- | --- | --- |
| 记住用户名、主题色、少量偏好 | localStorage | 键值对足够，API 最简单 |
| 登录态、临时会话 | sessionStorage | 关标签页自动清理 |
| 几千条需要查询的业务数据 | IndexedDB | 支持事务、索引、游标，容量远大于 5MB |
| 必须同步到服务器 | 后端数据库 + fetch | 浏览器存储只是缓存，不能替代服务端 |
| 离线优先的 PWA | IndexedDB + Service Worker | 数据本地落盘，断网可读 |

一句话判断：**存"几 KB 的设置"用 localStorage；存"几千条需要查询的业务数据"用 IndexedDB。** 完整教程见 `javascript/470-IndexedDBADatabaseInYourBrowser`。

## 4. 动手实践

### 任务

1. 实现主题切换器：localStorage 保存深/浅色偏好，刷新不丢，且开两个标签页切换时另一个同步变色；
2. 实现评论框草稿：sessionStorage 自动保存输入内容，刷新恢复，提交后清除；
3. 把第 2 节的购物车扩展出「移除商品」与「数量清零自动移除」，并保证两个标签页的角标一致。

### 提示

- 标签页同步用 `window.addEventListener('storage', ...)`；记住触发方自己收不到；
- 草稿恢复要 try/catch 包住 `JSON.parse`；
- 任务 3 的「数量清零自动移除」建议收进一个 `setQty(sku, qty)` 函数，别在按钮回调里写判断。

<details>
<summary>参考实现（先自己写，写完再展开对照）</summary>

```html
<!-- 任务 1：主题切换 + 跨标签页同步 -->
<label><input type="checkbox" id="dark" /> 深色模式</label>
<script>
  const dark = document.getElementById('dark');
  const apply = (on) => document.body.classList.toggle('dark-theme', on);

  apply(localStorage.getItem('theme') === 'dark');
  dark.checked = localStorage.getItem('theme') === 'dark';

  dark.addEventListener('change', () => {
    localStorage.setItem('theme', dark.checked ? 'dark' : 'light');
    apply(dark.checked);
  });

  // 其他标签页切换时本页跟随
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      const isDark = e.newValue === 'dark';
      dark.checked = isDark;
      apply(isDark);
    }
  });
</script>
```

```javascript
// 任务 2：草稿
const ta = document.querySelector('textarea');
ta.value = sessionStorage.getItem('draft') || '';
ta.addEventListener('input', () => sessionStorage.setItem('draft', ta.value));
document.querySelector('form').addEventListener('submit', () => {
  sessionStorage.removeItem('draft');
});

// 任务 3：数量管理与自动移除
function setQty(sku, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((it) => it.sku !== sku); // 清零即移除，规则只写这一遍
  } else {
    cart = cart.map((it) => (it.sku === sku ? { ...it, qty } : it));
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge(cart.length); // 本页自己更新；别的标签页由 storage 事件驱动
}
```

**参考实现讲解：** 任务 1 的 apply 函数把"改类 + 改勾选"收敛到一处，storage 事件回调里复用；任务 3 把「改数量」收敛为一个入口函数，写完存储后本页立即更新角标——本页不会收到自己的 storage 事件，这行补的是「触发方自己收不到」的缺口。

</details>

## 5. 核心要点回顾

- localStorage 永久且跨标签页共享，sessionStorage 会话级且标签页独立，Cookie 才会随请求发送；
- 只能存字符串：写入 `JSON.stringify`，读取 `JSON.parse` 且要容错；直接存对象得到 `"[object Object]"`；
- `storage` 事件是跨标签页同步通道，但触发方自己收不到；
- 大数据与结构化查询交给 IndexedDB，Web Storage 只放轻量数据；敏感数据（token、密码）不放 Web Storage——任何页面脚本都能读。

## 6. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记序列化 | 存对象得到 `"[object Object]"` | 写入 stringify、读取 parse 并容错 |
| 敏感数据放 localStorage | XSS 后可被窃取 | Token 放 HttpOnly Cookie，本地只放非敏感偏好 |
| 同步存大对象 | setItem 阻塞主线程 | 大文件用 IndexedDB |
| 无版本化的缓存键 | 数据结构变更后旧数据读出错 | 键名带版本如 `cart:v2` |
| 滥用 watchPosition | 持续定位耗电 | 单次获取见 [260-Geolocation](/html5/260-Geolocation) |

## 7. 扩展学习

- 网络请求：[Fetch API 与网络请求](/html5/246-FetchApiAndErrorHandling)（本模块拆分出的姊妹篇）；
- 存储全景：`javascript/460-StorageForTheWeb` 对比 Cookie/Web Storage/IndexedDB；
- 离线架构：[300-ServiceWorkerPWA](/html5/300-ServiceWorkerPWA) 的 Service Worker 生命周期与缓存策略；
- 后台计算：[290-WebWorkers](/html5/290-WebWorkers) 把重计算移出主线程；
- 实时通道：[320-WebSocket](/html5/320-WebSocket) 与 fetch 的长连接差异。

<!-- 恢复自 cnt-content/full/005-html5/240-HTML5OfflineStorageWebAPI.md（实施前 HEAD 62c90663 版本）；拆分时该小节未随迁，2026-10-07 内容保全复核恢复 -->

## Web Storage 最佳实践


- **数据类型**：localStorage 和 sessionStorage 只能存储字符串，存储对象时需要使用 JSON.stringify() 和 JSON.parse()
- **存储容量**：不要存储过大的数据，避免超出存储限制
- **敏感数据**：不要存储敏感数据（如密码），这些数据应该存储在服务器端
- **性能**：频繁读写 localStorage 可能影响性能，建议批量操作
- **兼容性**：虽然现代浏览器都支持 Web Storage，但仍需考虑旧浏览器的兼容性


<!-- 恢复自 cnt-content/full/005-html5/240-HTML5OfflineStorageWebAPI.md（实施前 HEAD 62c90663 版本）；拆分时该小节未随迁，2026-10-07 内容保全复核恢复 -->

## 通用最佳实践


- **特性检测**：在使用 Web API 前进行特性检测，确保浏览器支持
- **性能优化**：注意 API 的性能影响，避免过度使用
- **安全性**：遵循安全最佳实践，避免 XSS、CSRF 等攻击
- **可访问性**：确保应用对所有用户可访问，包括使用辅助技术的用户
- **测试**：在不同浏览器和设备上测试应用，确保兼容性

---


## 参考与致谢

- MDN Web Docs：Web Storage API、StorageEvent 文档（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Storage_API
- WHATWG HTML Living Standard：Web storage 章节，https://html.spec.whatwg.org/multipage/webstorage.html
- 本篇主体内容承接仓库 `240-HTML5OfflineStorageWebAPI` 拆分前的 Web Storage 章节素材并重写扩充；原「Fetch API」「周边速查」内容已分别迁往 246/248/284 三篇。
