---
order: 570
title: 防抖与节流
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 搜索框每次按键都发请求、滚动条拖动页面卡顿：手写防抖与节流，理解 leading/trailing、取消与竞态处理。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/440-FetchApiAndAbortController'
  - 'javascript/290-EventLoop'
  - 'javascript/500-DebugPerformanceOptimization'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
---

# 防抖与节流

## 场景一：搜索框每敲一个字就发一次请求

你给演出票搜索框接了个接口，直接绑事件：

```javascript
searchInput.addEventListener('input', (e) => {
  fetch(`/api/search?q=${encodeURIComponent(e.target.value)}`);
});
```

用户输入 "jackson" 六个字母，实际打出 "j"、"ja"、"jac"……发出去六个请求，前五个的响应全是废数据，还把接口打疼了。我们想要的是：**等用户停下来再搜**。这就是防抖（debounce）：事件停止触发一段时间后才执行，期间每次新触发都重新计时。

```javascript
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);            // 取消上一次的"倒计时"
    timer = setTimeout(() => {
      fn.apply(this, args);         // 安静 delay 毫秒后才真正执行
      timer = null;
    }, delay);
  };
}

const onSearch = debounce((e) => {
  fetch(`/api/search?q=${encodeURIComponent(e.target.value)}`);
}, 300);

searchInput.addEventListener('input', onSearch);
```

闭包里的 `timer` 是关键：所有触发共享同一个定时器句柄，新触发干掉旧定时器。`function` 声明加 `apply(this, args)` 是为了让防抖后的函数保留原函数的 `this` 与参数——换成箭头函数就接不到外层 `this` 了。

## 场景二：滚动监听把页面拖卡

另一个极端：滚动时做"距离顶部超过 200px 显示返回顶部按钮"的判断。滚动事件一秒能触发上百次，判断本身很轻，但你把判断换成了"计算列表可视区"这样的重活，页面就开始掉帧。这时不该"等停下来"（滚动永远不会停），而该**限制频率**：无论触发多密，每 100ms 最多执行一次。这就是节流（throttle）。

```javascript
function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  backToTop.classList.toggle('show', window.scrollY > 200);
}, 100));
```

一句话分清两者：**防抖是"最后一次说了算"，节流是"按固定节奏来"**。搜索输入、自动保存、窗口 resize 重算布局用防抖；滚动、鼠标移动、拖拽这类持续高频事件用节流。

## 完整版：leading / trailing 与取消

真实工具函数（lodash 的 `debounce`）还要回答两个问题：

- **第一次触发要不要立即执行**（leading）？点"提交"按钮防重复点击，用户期望第一下就有反应，等 500ms 才响应反而奇怪。
- **停下来的那一下要不要执行**（trailing）？搜索场景必须执行，否则最后一个字母没被搜。

```javascript
function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;
    const callNow = leading && !timer; // 静默期内首次触发
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) {
        fn.apply(lastThis, lastArgs);
      }
      lastArgs = null;
    }, delay);
    if (callNow) fn.apply(this, args);
  };

  debounced.cancel = () => {           // 放弃未执行的调用
    clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  debounced.flush = () => {            // 立刻执行未完成的调用
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) fn.apply(lastThis, lastArgs);
      lastArgs = null;
    }
  };
  return debounced;
}
```

`cancel` 不是锦上添花。组件卸载后定时器仍会触发回调，轻则操作已销毁的 DOM 报错，重则闭包拖着大对象阻碍回收。React 里的标准姿势：

```javascript
useEffect(() => {
  const handler = debounce(doSearch, 300);
  input.addEventListener('input', handler);
  return () => {
    input.removeEventListener('input', handler);
    handler.cancel(); // 监听器与定时器一起清理
  };
}, []);
```

## 防抖的隐藏对手：竞态

防抖把请求频率降下来了，但最后一个请求发出后，用户又改了关键词再触发，两个请求可能乱序返回——旧结果覆盖新结果。防抖管不了这个，需要配合作废机制：

```javascript
let controller = null;
const onSearch = debounce(async (query) => {
  controller?.abort();                    // 作废上一次请求
  controller = new AbortController();
  try {
    const res = await fetch(`/api/search?q=${query}`, { signal: controller.signal });
    render(await res.json());
  } catch (e) {
    if (e.name !== 'AbortError') throw e; // 用户主动取消不算错误
  }
}, 300);
```

更彻底的方案是用请求序号：只有"最新一次发起"的响应才允许渲染。展开见[Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController)。

## rAF 节流：滚动场景更顺手的选项

与渲染相关的节流还有一个原生工具：`requestAnimationFrame`。它天然对齐帧率，一帧最多执行一次，不用手写计时：

```javascript
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateHeader();       // 下一帧渲染前执行
    ticking = false;
  });
});
```

选型口诀：操作和视觉渲染强相关（视差、进度条、高亮）用 rAF；与渲染无关但需要限频（打点上报、位置同步）用定时器节流；等"停下"才有意义（搜索、resize 收尾）用防抖。项目里没特殊理由就 `lodash.debounce/throttle`，别在生产代码里养自研轮子——但上面这些实现你必须能手写，面试与排查都绕不开。

## 坑点与自检

**坑 1：防抖包装丢 this 与参数**。回调里用 `fn(args)` 而不是 `fn.apply(this, args)`，方法形式的调用直接哑火。

**坑 2：React 组件里每次渲染新建防抖函数**。`onChange={debounce(fn, 300)}` 写在 JSX 里，每次渲染都是新实例，防抖完全失效。用 `useMemo`/`useRef` 固定实例，或收敛进 `useEffect`。

**坑 3：只删监听器不 cancel 定时器**。事件解绑了，定时器还挂着一次"幽灵执行"。

**坑 4：节流的边界抖动**。纯时间戳版节流在"最后一次触发"后不再补执行（trailing 缺失），如果业务需要"最后一下必须生效"（如拖拽对齐），要么用 lodash 版，要么叠加一个 trailing 定时器。

**坑 5：拿防抖当错误重试用**。防抖的计时起点是"最后一次触发"，不是"上次执行"，网络失败重试应该用指数退避，两者别混。

自检清单：防抖与节流各举两个场景；能默写基础防抖；知道 `cancel` 什么时候必须调；能说出防抖解决不了的请求竞态怎么处理。

## 练习

1. 给本篇的节流补上 trailing：停止触发后 interval 内的那次也要补执行一次。用 `setTimeout` 与 `last` 配合实现，并用连续触发验证首尾各执行一次。
2. 实现 `debounce` 的 `pending()` 方法：返回当前是否有等待中的调用。
3. 场景区分练习：窗口 resize 时重算瀑布流布局（防抖还是节流？为什么）；鼠标拖动滑块实时预览；输入停止 1 秒后自动保存草稿。给出选择与 delay 值。
4. 把搜索防抖接入 AbortController 后写测试：模拟快速输入两次，断言第一次请求被 abort、只渲染第二次结果。

## 下一步

- [Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController)：防抖之后，请求级作废的正确工具。
- [调试与性能优化](/javascript/500-DebugPerformanceOptimization)：用 Performance 面板确认你的节流真的把长任务压下去了。
- [事件循环](/javascript/290-EventLoop)：`setTimeout` 与 rAF 的执行时序差异的底层原因。
