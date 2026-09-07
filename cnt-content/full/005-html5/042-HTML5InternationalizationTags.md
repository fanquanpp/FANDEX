---
order: 420
title: 专项：东亚文字与国际化标签
module: 'html5'
category: 前端技术
difficulty: beginner
description: ruby 注音、bdi/bdo 双向文本隔离、lang/dir 属性深化：处理日文注音、中文拼音、阿拉伯文 RTL 排版的最后一公里。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'html5/016-MetadataCharacterEncoding'
  - 'html5/017-TextSemantic'
prerequisites:
  - 'html5/017-TextSemantic'
---

## 0. 学习目标（可验证）

- [ ] 能用 `ruby`/`rt`/`rp` 给汉字加拼音、给日文加假名
- [ ] 能说出 `bdi` 与 `bdo` 的区别，并各写一个例子
- [ ] 能解释 `lang` 和 `dir` 对翻译、拼写检查、排版方向的影响

## 1. 一句话理解

> 国际化标签解决"语言不同导致的排版问题"：汉字/日文要注音用 ruby，阿拉伯文/希伯来文要从右往左用 dir/bdi，混合文本要隔离方向用 bdi。

## 2. ruby：东亚注音

`<ruby>` 是注音容器，`<rt>` 放注音文字，`<rp>` 是给不支持 ruby 的浏览器看的括号兜底：

```html
<ruby>
  汉<rt>hàn</rt>
  字<rt>zì</rt>
</ruby>

<ruby>
  日本語<rt>にほんご</rt>
</ruby>
```

**讲解：**

- `<ruby>` 包裹"正文 + 注音"整体，`<rt>` 紧跟对应字符，浏览器把注音显示在文字上方（竖排时在右侧）；
- `<rp>` 写法：`<ruby>汉<rp>(</rp><rt>hàn</rt><rp>)</rp></ruby>`——老浏览器会显示"汉(hàn)"，新浏览器忽略括号；
- 多音字场景：给每个字单独一个 ruby 组，便于对齐。

## 3. bdi 与 bdo：双向文本

### 3.1 bdi：隔离未知方向的文本

`<bdi>`（Bi-Directional Isolation）把一段方向未知的文本"隔离"起来，防止它污染周围文本的排版：

```html
<p>用户 <bdi>أحمد</bdi> 刚刚上线（阿拉伯文用户名）。</p>
<p>用户 <bdi>alice_123</bdi> 刚刚上线（普通用户名）。</p>
```

没有 bdi 时，阿拉伯文用户名会把相邻的标点、符号"拉"到奇怪的位置；bdi 让每个用户名按自己的方向排版，互不干扰。

### 3.2 bdo：强制指定方向

`<bdo>`（Bi-Directional Override）强制覆盖文本方向，`dir` 必填：

```html
<p><bdo dir="rtl">从右往左显示</bdo></p>
```

**bdi 与 bdo 的区别：**

| 标签 | 作用 | 典型场景 |
| --- | --- | --- |
| `bdi` | 隔离，文本按自身方向排 | 用户生成内容（用户名、评论） |
| `bdo` | 强制覆盖方向 | 明确要求某段文字必须从右往左/从左往右 |

## 4. lang 与 dir：全局属性的国际化用法

```html
<html lang="zh-CN">
<p lang="en">This is English.</p>
<p dir="rtl">هذا نص عربي</p>
```

- `lang` 影响：拼写检查、翻译工具、读屏发音、`::first-letter` 等样式规则；
- `dir` 影响：文本方向与对齐基线，`rtl` 页面需要配合 CSS 逻辑属性（`margin-inline-start` 等）；
- 混排原则：**能局部标注就局部标注**，整页声明 `lang`，异语言片段单独加 `lang`。

## 5. 动手试试

### 入门版

1. 用 ruby 给"你好世界"四个字加拼音，并写一组带 `rp` 兜底的版本；
2. 在页面里插入阿拉伯文用户名，对比加不加 `bdi` 的显示差异；
3. 把整个 `<html>` 的 `dir` 改成 `rtl`，观察页面排版方向变化。

### 进阶版

1. 做一个中英混排页面：中文段落 `lang="zh-CN"`、英文引用 `lang="en"`，用浏览器朗读功能体验发音差异；
2. 结合 CSS 逻辑属性（`padding-inline-start` 等），让同一个样式在 LTR/RTL 下都正确。

## 6. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 中文拼音对不齐 | 一个 ruby 包了整句 | 逐字分组：每个字一个 ruby |
| 阿拉伯文标点乱跳 | 未知方向文本污染了上下文 | 用 `bdi` 隔离用户内容 |
| 只声明 lang 不声明 dir | 双向语言仍需方向信息 | RTL 内容单独加 `dir="rtl"` |
| 用 bdo 到处强制方向 | 覆盖是最后手段 | 优先 bdi 隔离，bdo 只用于明确强制场景 |

## 7. 下一步

国际化的文字处理已经闭环。最后一篇专项 `041-HTML5ImageMapArea` 是冷门但关键时刻能救场的图像热区。
