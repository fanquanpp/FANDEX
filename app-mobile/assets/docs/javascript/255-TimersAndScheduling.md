---
order: 300
title: 定时器与调度
module: 'javascript'
category: 前端技术
difficulty: beginner
description: setTimeout/setInterval 的返回值与清除、递归 setTimeout 与 setInterval 的差别（轮播为什么用前者）、时钟与倒计时的毫秒换算链、页面隐藏暂停，含轮播、时钟、倒计时三个微项目。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：定时器与任务调度——`setTimeout`、`setInterval`、`clearTimeout`、`clearInterval` 与 `requestAnimationFrame` 的取舍。
- **解决什么问题**：轮播图自动播放、时钟、活动倒计时、防抖节流、延迟重试，全都是"某段代码晚点执行、周期执行、可取消"。定时器是浏览器给 JavaScript 的第一批调度原语。
- **什么时候用到**：任何"延迟"或"周期"需求；以及反过来——发现页面切后台后时钟还在空转、轮播越切越快时，来查这里。
- **前置**：[异步编程入门](/javascript/250-AsyncProgramming)；[事件循环](/javascript/290-EventLoop)（本篇只讲"怎么用"，"为什么 0 毫秒不会立刻执行"在那篇展开）。

## 0. 一句话理解

> setTimeout 是"闹钟"（响一次），setInterval 是"每 N 毫秒响一次的电铃"。返回值是取消凭证，clear* 是取消按钮。它们都只是"把回调排进未来的队列"，不是精确计时器。

## 1. 返回值与清除

```javascript
const timerId = setTimeout(fn, 3000, 'arg1');  // 第三个参数起，会传给 fn
clearTimeout(timerId);                          // 取消：还没响就安静了

const tickId = setInterval(fn, 1000);
clearInterval(tickId);                          // 停止周期执行
```

三个必须知道的细节：

- 返回值在浏览器里是数字、在 Node 里是对象，**不要拿它做运算**，只当不透明凭证传递；
- `clearTimeout` 与 `clearInterval` 在浏览器实现里**可以互换**（同一张 id 表），但为了可读性请配对使用；
- 定时器回调里的 `this` 默认指向 `window`（非严格模式）——定时器只是普通函数调用，不是方法调用，this 话题详见 [this 深入](/javascript/100-ThisKeywordDeepDive)。

"0 毫秒"的最小延迟与嵌套层级 4 层后被钳到 4 毫秒以上的浏览器规则，属于事件循环的领域，见 [事件循环](/javascript/290-EventLoop) 第 4 节。

## 2. setInterval 的两个坑

**坑一：回调执行时间会堆积。** `setInterval(fn, 1000)` 只保证"每秒尝试触发"，不管上一次 fn 有没有跑完。fn 跑 3 秒时，队列里会积压回调，恢复正常后**连续快速执行多次**，看起来就是"轮播突然发疯连跳"。

**坑二：切后台不停止。** 页面不可见时多数浏览器把定时器降频到每秒一次以下，但**不会取消**——隐藏的标签页里时钟照样空转，倒计时与动画同理白烧资源。

两个坑共同指向同一个答案：**周期任务的首选写法是递归 setTimeout**——每次只在确认上一轮结束后，才预约下一轮，且可以随时检查"还有没有必要继续"。

```javascript
// setInterval 版：失控风险在框架之外
const id = setInterval(tick, 1000);

// 递归 setTimeout 版：每一轮都在掌控中
function loop() {
  tick();                          // 上一轮完全结束后才开始计时
  timerId = setTimeout(loop, 1000);
}
let timerId = setTimeout(loop, 1000);
// 停止：clearTimeout(timerId)，且不会有一次"正在飞行"的回调
```

## 3. 例子一（真实工程）：图片轮播

来自课程实战的经典需求：五张图循环播放，每 3 秒换一张，鼠标悬停暂停。这是递归 setTimeout 的标准应用：

```html
<img id="banner" src="img/1.gif" alt="轮播图" />
```

```javascript
const TOTAL = 5;
let num = 1;
let timerId = null;

function next() {
  num++;                       // 先自增
  if (num > TOTAL) num = 1;    // 越界归一：5 张图循环 1..5
  document.getElementById('banner').src = `img/${num}.gif`;
  timerId = setTimeout(next, 3000); // 在本轮末尾预约下一轮
}

function start() {
  if (timerId === null) {              // 防重复启动：没有凭证才启动
    timerId = setTimeout(next, 3000);
  }
}

function stop() {
  clearTimeout(timerId);
  timerId = null;                      // 归 null 与"启动判断"配对
}

document.getElementById('banner').addEventListener('mouseenter', stop);
document.getElementById('banner').addEventListener('mouseleave', start);
start();
```

逐段看为什么这样写：`num++` 放在展示之前、`> TOTAL` 归一，保证 src 里的编号永远合法；**timerId 同时承担"凭证"与"运行状态"两个角色**——null 表示没在跑，这是悬停暂停的正确性前提；如果不判 null，鼠标快速划过图片五次就叠出五个定时链，轮播加速五倍（可以亲手去掉 if 试试，这是本篇最值得复现的 bug）。

对比 setInterval 版本要补的东西：切回标签页时"追帧"问题消失了（递归版永远最多有一个待执行回调）；暂停时也不必担心"取消后还有一个在飞行中"。

## 4. 例子二：实时时钟

课程素材的原始版本是 `setInterval` + `window.onload` 拼字符串；这里给出"递归 + 对齐到下一秒"的工程版，并解释素材里为什么每秒跑却不准：

```javascript
const clockEl = document.getElementById('clock');

function renderClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}:${ss}`;

  // 对齐下一秒：拿"距下一个整秒的毫秒数"做延迟
  const delay = 1000 - (Date.now() % 1000);
  setTimeout(renderClock, delay);
}
renderClock();
```

`setInterval(fn, 1000)` 的时钟为什么不准：定时器是"从调度时刻起 1000ms"，而 fn 本身执行要花零点几毫秒，误差逐秒累积，几分钟就能慢出一秒。**先算"离下一个整秒还有几毫秒"再延迟**，每轮都重新对齐，长期误差就没了。`padStart(2, '0')` 是"9 秒显示成 09"的标准写法，素材里用字符串拼接 + 三元补零的原始版，逻辑等价但啰嗦。

## 5. 例子三（真实工程）：活动倒计时

倒计时的核心是一条**毫秒换算链**，课程素材把它拆成了四步，值得逐层背下来：

```text
差值总毫秒 diff
├─ 时 = Math.floor(diff / (1000 * 60 * 60))          每小时 3600000 毫秒
├─ 分 = Math.floor(diff / (1000 * 60)) % 60           总分钟里去掉整点的小时余数
└─ 秒 = Math.floor(diff / 1000) % 60                  总秒数里去掉整分的余数
```

```javascript
const deadline = new Date('2026-06-19T00:00:00'); // 活动截止时刻

function renderCountdown() {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) {
    show('00:00:00');
    return;                      // 到点即停：不预约下一轮
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  show(`${pad(h)}:${pad(m)}:${pad(s)}`);
  setTimeout(renderCountdown, 1000 - (Date.now() % 1000));
}

function pad(n) { return String(n).padStart(2, '0'); }
```

三个工程要点：**倒计时显示的是"差值"而不是"剩余次数"**——递归 setTimeout 每轮重算差值，系统休眠、标签页降频都不会让显示说谎（setInterval 数次数的版本，切后台回来会少算很多秒）；素材里 `new Date("2026/06/19/00:00:00")` 这种斜杠格式能用但不可移植，ISO 格式 `2026-06-19T00:00:00` 是跨浏览器的规范写法；`diff <= 0` 的提前 return 让"预约下一轮"自然终止——这就是递归写法"停止条件写在调度之前"的好处。

### 页面隐藏时暂停

倒计时不依赖轮次所以切后台也能恢复正确，但**渲染**不必在后台进行。可见性 API 是标准搭档：

```javascript
let running = false;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;             // 只翻标志位；正在飞行的一轮跑完即自然停止
  } else if (!running) {
    running = true;
    renderCountdown();
  }
});
```

`visibilitychange` 在标签页切换、最小化时触发，`document.hidden` 为 true 表示不可见。配合递归写法，停止逻辑只是"不再预约"，没有"清理一个不知道在不在的定时器"的纠结。

## 6. 动画用定时器吗？

不。视觉效果一律 `requestAnimationFrame`：它与屏幕刷新同步（通常 60 次/秒）、页面隐藏时自动暂停、不用手算 16 毫秒。定时器留给"业务节拍"（轮播 3 秒一张、倒计时每秒一格），`rAF` 留给"逐帧画面"。两者的关系与 rAF 的完整用法见 [Core Web Vitals 与性能指标](/javascript/510-CoreWebVitalsAndPerformanceMetrics) 的动画章节。一个实用分界：**用户关心"到了几点"用定时器，关心"动得顺不顺"用 rAF**。

## 7. 动手实践

任务（先写，写完再展开参考实现）：

1. 写 `every(ms, fn)`：返回一个含 `stop()` 的对象，内部用递归 setTimeout（不许用 setInterval），并保证 stop 之后不会再执行任何一轮。
2. 实现一个"3、2、1、开始"的倒计时器：每秒数字减一，减到 0 显示"开始"并自动停止。注意提供 `cancel()`。
3. 给第 3 节的轮播补一个"页面不可见时暂停、可见时恢复"的逻辑，并思考为什么 `if (timerId === null)` 的判空在这种"暂停-恢复"模式下依然必要。

提示：第 1 题的 stop 只需"翻标志 + clearTimeout 当前凭证"两件事；第 2 题把"到点"当作递归的停止条件；第 3 题从"启动路径有两条（初始化、恢复）"入手。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```javascript
// 1
function every(ms, fn) {
  let stopped = false;
  let id = null;
  function loop() {
    if (stopped) return;     // 飞行中的一轮发现已停，直接断链
    fn();
    id = setTimeout(loop, ms);
  }
  id = setTimeout(loop, ms);
  return {
    stop() {
      stopped = true;        // 标志位防"clear 后仍有在飞回调"
      clearTimeout(id);
    },
  };
}
// 用法：const t = every(1000, tick); t.stop();

// 2
function countdown(start, onTick, onDone) {
  let left = start;
  let id = null;
  function step() {
    onTick(left);
    if (left === 0) { onDone(); return; }  // 到点：停止条件在调度之前
    left -= 1;
    id = setTimeout(step, 1000);
  }
  step();
  return { cancel() { clearTimeout(id); } };
}
countdown(3, (n) => console.log(n), () => console.log('开始'));

// 3：恢复路径也会调用 start()，而暂停路径把 timerId 置 null，
// 两条路径共用同一个判空，才能保证任意顺序的 hide/show 交错后
// 定时链最多一条。去掉判空的话，"隐藏-显示-隐藏-显示"四连就会
// 叠出两条链，轮播速度翻倍。
```

</details>

## 8. 下一步

- [事件循环](/javascript/290-EventLoop)：为什么 `setTimeout(fn, 0)` 不会立刻执行；
- [防抖与节流](/javascript/490-DebounceThrottle)：定时器的两大经典应用模式；
- [显式资源管理](/javascript/620-ExplicitResourceManagement)：`using` 与定时器清理的组合。

## 参考与致谢

- MDN Web Docs：`setTimeout`、`setInterval`、`Window: visibilitychange`（CC-BY-SA 2.5），https://developer.mozilla.org/en-US/docs/Web/API/setTimeout
- HTML Living Standard：timers 与 timer nesting clamping 规则，https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html
- 本篇轮播、时钟、倒计时三例的教学蓝本来自课程实战素材（图片轮播递归、时钟换算链、倒计时毫秒拆解），代码为重写并扩充工程要点。
