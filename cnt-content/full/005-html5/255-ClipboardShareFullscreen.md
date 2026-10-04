---
order: 260
title: 专项：剪贴板、系统分享与全屏——手势驱动的浏览器交互 API
module: 'html5'
category: 前端技术
difficulty: beginner
description: 复制按钮、调起系统分享面板、视频全屏这三件高频交互背后的标准 API：Async Clipboard 的读写与权限模型、Web Share API 及其降级链、Fullscreen API 的手势要求与事件同步，配 execCommand 时代回退与 iOS 差异说明；核心心智模型是「用户激活」——这三个 API 都要求在手势上下文中调用。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'html5/250-DragAPI'
  - 'html5/240-HTML5OfflineStorageWebAPI'
  - 'html5/200-AudioVideo'
  - 'html5/300-ServiceWorkerPWA'
prerequisites:
  - 'html5/250-DragAPI'
---

## 0. 学习目标（可验证）

- [ ] 能用 Async Clipboard 写一个带回退的复制按钮，并说清什么情况下会失败
- [ ] 能用 Web Share API 调起系统分享面板，并写出三级降级链
- [ ] 能实现全屏切换并同步按钮状态，说出 Esc 退出时靠什么事件感知
- [ ] 能解释「用户激活（transient activation）」为什么是这三个 API 的共同前置

## 1. 一句话理解

> 这三个 API 的共同点是「把浏览器连到操作系统能力」：剪贴板连到系统粘贴板，Web Share 连到系统分享面板，全屏连到窗口显示模式。操作系统资源不可被网页静默操纵，所以三者都要求**用户手势触发**——这就是贯穿全篇的心智模型。

## 2. 剪贴板：Async Clipboard API

### 2.1 读写文本

```javascript
// 写入（复制）：安全上下文（HTTPS/localhost）+ 用户手势内调用
await navigator.clipboard.writeText('要复制的内容');

// 读取（粘贴）：需要 clipboard-read 权限，浏览器会弹授权框
const text = await navigator.clipboard.readText();
```

### 2.2 权限模型：为什么写宽松、读严格

剪贴板是**跨应用的共享资源**——用户可能刚复制了密码或银行卡号。所以权限设计不对称：

| 操作 | 权限 | 触发条件 | 体验 |
| --- | --- | --- | --- |
| `writeText` | `clipboard-write` | 页面获得写授权；在用户手势内通常自动授予 | 复制按钮即点即用 |
| `readText` | `clipboard-read` | 显式弹窗征求用户同意 | 首次读取有授权框 |

实现复制按钮的标准写法（含失败兜底）：

```javascript
async function copyButton(label, text) {
  try {
    await navigator.clipboard.writeText(text);
    showTip(label, '已复制');
  } catch {
    // 兜底：老浏览器或权限受限时走 execCommand 时代方案
    legacyCopy(text) ? showTip(label, '已复制') : showTip(label, '复制失败，请手动选择');
  }
}

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');   // 已废弃，仅作回退
  ta.remove();
  return ok;
}
```

`document.execCommand('copy')` 已从标准废弃，但作为**回退路径**保留是务实的：新 API 失败的场景（非安全上下文、老 WebView）恰好是它还能工作的场景。判断顺序永远是「新 API 优先、旧方案兜底」，不要反过来。

### 2.3 富内容与粘贴事件

写入图片或富文本用 `ClipboardItem`；接收用户的粘贴动作则监听 `paste` 事件——**监听 paste 不需要 readText 权限**（用户主动粘贴即代表授权），这是「读取剪贴板」需求的首选形态：

```javascript
// 接收粘贴（推荐）：在输入框上监听 paste
inputEl.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      handlePastedImage(file);          // 粘贴截图上传的常见实现路径
    }
  }
});
```

## 3. Web Share API：调起系统分享面板

`navigator.share()` 让网页直接调起操作系统原生的分享面板（可分享到聊天、邮件、系统内任意注册了分享目标的应用）：

```javascript
shareBtn.addEventListener('click', async () => {
  if (!navigator.share) return fallbackCopy();
  try {
    await navigator.share({
      title: document.title,
      text: '发现一篇好文章',
      url: location.href,
    });
  } catch (err) {
    if (err.name !== 'AbortError') fallbackCopy();  // 用户取消不算失败
  }
});
```

要点：

- **必须由用户手势触发**（按钮 click 事件处理器内直接调用），且页面需在安全上下文；
- 浏览器支持不对称：Safari（含 iOS）与 Chromium 系已支持，Firefox 长期未实现——**特性检测必须做**，降级链通常是「share → 复制链接 → 提示手动分享」；
- 分享文件需先用 `navigator.canShare({ files })` 探测（Web Share Level 2），不是所有平台都支持带附件分享。

## 4. 全屏：Fullscreen API

### 4.1 基本用法与状态同步

```javascript
const stage = document.querySelector('.player');

enterBtn.addEventListener('click', () => {
  stage.requestFullscreen().catch(() => showTip('全屏被拒绝'));
});
exitBtn.addEventListener('click', () => document.exitFullscreen());

// 关键：用户按 Esc 退出时不会走你的 exitBtn 逻辑，只能靠事件感知
document.addEventListener('fullscreenchange', () => {
  const isFull = document.fullscreenElement === stage;
  enterBtn.hidden = isFull;      // 同步按钮状态
  stage.classList.toggle('is-full', isFull);
});
```

### 4.2 平台差异与边界

| 边界 | 说明 |
| --- | --- |
| iOS Safari（iPhone） | 不支持任意元素 `requestFullscreen()`；`<video>` 有专有的 `webkitEnterFullscreen()` |
| iframe 内嵌页面 | 需要宿主页面给 iframe 加 `allow="fullscreen"`，否则静默失败 |
| CSS 配合 | `:fullscreen` 伪类给全屏态写样式；进入全屏的元素要自己铺满（`width/height: 100%`） |
| 退出路径 | Esc、系统手势、`exitFullscreen()` 都会触发 `fullscreenchange`——状态同步只监听这一个事件，不要在按钮点击里各自写 |

全屏后的**焦点管理**是可访问性考点：进入全屏应把焦点移入容器，退出后归还触发按钮，读屏用户才不会「被困」在原地（见[可访问性](/html5/180-Accessibility)）。

## 5. 画中画：一行 API 的视频伴侣

`<video>` 元素额外拥有画中画（Picture-in-Picture）能力——视频缩成悬浮小窗，离开页面继续播放：

```javascript
pipBtn.addEventListener('click', async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else if (video.requestPictureInPicture) {
    await video.requestPictureInPicture();
  }
});
```

与全屏的分工：全屏是「沉浸」，画中画是「边看边干别的」。两者都要求视频已加载元数据且在用户手势中调用。

## 6. 底层原理：用户激活（transient activation）

为什么这三个 API 都「必须点击才有效」？浏览器为敏感能力设了一道统一闸门——**用户激活**：

1. 用户与页面交互（点击、按键）时，浏览器发放一个**短时效激活令牌**（transient activation，Chrome 的窗口约为 5 秒，且一次性 API 消费后即失效）；
2. `navigator.share()`、`requestFullscreen()`、`clipboard.writeText()` 等在调用时检查令牌；
3. 令牌不存在（无手势、异步链太长令牌过期、setTimeout 里调用）就抛 `NotAllowedError`。

由此得出一条工程铁律：**手势处理函数里尽早调用受限 API**。常见翻车写法是「点击 → await 一个网络请求 → 再调 share()」，等响应回来令牌已过期。正确做法是在点击瞬间先调受限 API 或把令牌传下去（`navigator.userActivation.isActive` 可检测）。

权限方面，剪贴板读走显式权限弹窗（`clipboard-read`），而全屏与分享不进权限系统、只受用户激活约束——敏感度不同，闸门也不同。

## 7. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 复制按钮在 HTTP 站点上失效 | Async Clipboard 要求安全上下文 | 上 HTTPS；短期回退 `execCommand` |
| `navigator.share` 抛 NotAllowedError | 调用点距用户手势太远（await 之后） | 点击处理器内同步调用 |
| 全屏按钮状态错乱 | 用户按 Esc 退出未同步 | 只依赖 `fullscreenchange` 做状态同步 |
| iframe 里的全屏无效 | 宿主没给 iframe 放行 | `<iframe allow="fullscreen">` |
| iPhone 上元素全屏无效 | iOS Safari 不支持任意元素全屏 | 视频用 `webkitEnterFullscreen()`；其余场景换 CSS 布局方案 |
| 读取剪贴板被弹窗吓到用户 | `readText` 需要授权 | 优先监听 `paste` 事件替代主动读取 |
| 用 `execCommand` 写新代码 | 该 API 已废弃 | 仅作为老环境回退，入口永远是 Async Clipboard |

## 8. 与相邻知识的关系

- 之前：[拖放 API](/html5/250-DragAPI) 与本篇同属「手势驱动的交互能力」，拖放还有数据传递职责，而本篇三件套更贴近系统能力桥接；
- 并行：[音频与视频](/html5/200-AudioVideo) 是全屏与画中画的主要载体；[离线存储与 Web API](/html5/240-HTML5OfflineStorageWebAPI) 汇总了本篇之外的其他浏览器 API 家族；
- 之后：[Service Worker 与 PWA](/html5/300-ServiceWorkerPWA) 把分享的另一端接起来——PWA 可注册为 Web Share Target 接收其他应用的分享，本篇的 share() 与它构成完整闭环。

## 9. 面试题思路

**「为什么 navigator.share 必须在用户点击时同步调用？」** 回答到「用户激活」这一层才算完整：浏览器给敏感 API 设了短时效手势令牌，await 网络请求后再调用会令牌失效。延伸到工程铁律「受限 API 在手势处理器内尽早调用」。

**「实现一个复制按钮要考虑什么？」** 分层作答：优先 `navigator.clipboard.writeText`（安全上下文 + 手势）；失败回退 `execCommand` 并说明其已废弃仅作兜底；成功与失败都要有 UI 反馈；HTTPS 是硬前提。能提「读取侧优先用 paste 事件避免权限弹窗」是加分项。

**「全屏 API 状态管理怎么做？」** 核心是单一事件源：无论用户怎么退出（Esc、系统手势、代码调用），`fullscreenchange` 都会触发，因此按钮状态只由该事件驱动，不与点击逻辑耦合。补充 iframe 放行与 iOS 差异说明覆盖面。

## 10. 动手试试

先看任务与提示，自己写完再看参考实现。

### 练习 1：三级降级的分享按钮（进阶）

任务：给文章页做一个「分享」按钮：优先调起系统分享面板；不支持的浏览器复制链接并提示；复制也失败时弹出手动选择提示。要求处理「用户取消分享」不算失败。

提示：`navigator.share` 的取消错误名是 `AbortError`；降级链里复用练习外的 `copyButton` 函数。

参考实现：

```javascript
async function shareArticle({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';  // 用户主动取消
      // 分享失败（如参数不支持）继续走降级
    }
  }
  return copyButton(shareBtn, url) ? 'copied' : 'manual';
}

shareBtn.addEventListener('click', async () => {
  const result = await shareArticle({
    title: document.title,
    text: '发现一篇好文章',
    url: location.href,
  });
  if (result === 'manual') alert('请手动复制地址栏链接分享');
});
```

自检：注意「await shareArticle(...)」发生在点击事件里，但 `navigator.share()` 是在函数体**第一行同步路径**上调用的吗？把 `navigator.share` 挪到 `await` 之后试一次，观察是否抛 `NotAllowedError`——这就是用户激活的实证。

### 练习 2：全屏视频播放器组件（挑战）

任务：实现一个视频容器组件：全屏/退出按钮、画中画按钮、Esc 退出自动同步按钮状态；进入全屏时把焦点移入容器，退出时归还给全屏按钮。

提示：`fullscreenchange` 驱动全部状态；焦点管理用 `focus()`；画中画入口要做特性检测。

参考实现：

```javascript
const player = document.querySelector('.player');
const video = player.querySelector('video');
const fsBtn = player.querySelector('.fs-btn');
const pipBtn = player.querySelector('.pip-btn');

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    player.requestFullscreen().then(() => player.focus());
  }
}

document.addEventListener('fullscreenchange', () => {
  const isFull = document.fullscreenElement === player;
  fsBtn.textContent = isFull ? '退出全屏' : '全屏';
  if (!isFull) fsBtn.focus();   // 焦点归还触发按钮
});

pipBtn.addEventListener('click', async () => {
  if (!video.requestPictureInPicture) return showTip('当前浏览器不支持画中画');
  document.pictureInPictureElement
    ? await document.exitPictureInPicture()
    : await video.requestPictureInPicture();
});

fsBtn.addEventListener('click', toggleFullscreen);
```

自检：按 Esc 退出全屏后，按钮文案变回「全屏」了吗？焦点在按钮上吗？再把 `player.focus()` 挪出 `then` 直接写在 `requestFullscreen()` 之后（不等待），体会为什么焦点转移要等全屏 promise 兑现。

## 11. 下一步

- 同属手势驱动交互的兄弟篇：[拖放 API](/html5/250-DragAPI)
- 视频与音频元素的完整属性体系：[音频与视频](/html5/200-AudioVideo)
- 分享闭环的另一端（PWA 接收分享）：[Service Worker 与 PWA](/html5/300-ServiceWorkerPWA)
