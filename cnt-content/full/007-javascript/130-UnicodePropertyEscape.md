---
order: 150
title: Unicode 属性转义
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 用 \p{...} 让正则认识中文、全角数字与 Emoji：属性三大类、u 标志、Emoji 陷阱与国际化校验实战。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/110-Regex'
  - 'javascript/120-ES2018RegExpNamedCaptureGroups'
  - 'javascript/640-RegexAssertions'
  - 'javascript/650-IntlApi'
prerequisites:
  - 'javascript/110-Regex'
  - 'javascript/120-ES2018RegExpNamedCaptureGroups'
---

> 前置：需先有正则基础，见[正则表达式](/javascript/110-Regex)；具名捕获组见[具名捕获组](/javascript/120-ES2018RegExpNamedCaptureGroups)。

# Unicode 属性转义

## 场景：一个只对英文用户生效的表单

你给社区产品做昵称校验，第一版这样写：

```javascript
const ok = /^[\w]{2,20}$/.test(nickname);
ok('alice');     // true
ok('小明');      // false —— 中文用户全部被拒
ok('niño');      // false —— 西语用户也被拒
```

`\w` 等价于 `[a-zA-Z0-9_]`，是纯 ASCII 视角。你试着补区间：`[\u4e00-\u9fa5]` 能盖住常用汉字，但生僻字（如扩展区的"𠮷"）不在里面，还漏了平假名、阿拉伯文。手工维护字符区间表是个无底洞。

ES2018 的 Unicode 属性转义（`\p{...}`）换个思路：不列举字符，直接按 Unicode 标准的属性查询——"它是字母吗""它属于汉字书写系统吗"。字符表的事交给 Unicode 数据库，你只写语义。

## 动手：五分钟认识 \p{...}

```javascript
// 必须带 u 标志，否则 SyntaxError
/\p{L}/u.test('中');   // true：L = Letter，任意语言的字母
/\p{L}/u.test('é');    // true
/\p{N}/u.test('１');   // true：N = Number，全角数字也算数字
/\p{N}/u.test('Ⅳ');   // true：罗马数字
/\p{Script=Han}/u.test('字'); // true：汉字书写系统
/\P{L}/u.test('7');    // true：大写 P 是取反，"不是字母"
```

语法三条：

- 小写 `\p{属性}`：匹配具有该属性的字符；大写 `\P{属性}`：取反。
- 必须配合 `u` 标志。没有 `u` 时 `\p` 不是合法转义，正则直接报错——这是好的失败方式，比悄悄失配强。
- 属性写法分两类：单值（`\p{L}`）与键值对（`\p{Script=Han}`）。

常用属性速记（够覆盖九成日常需求）：

| 写法 | 含义 | 例子 |
| ---- | ---- | ---- |
| `\p{L}` | 任意语言的字母 | a、中、あ、ñ |
| `\p{N}` | 任意数字 | 3、１、٥、Ⅷ |
| `\p{Lu}` / `\p{Ll}` | 大写 / 小写字母 | A / a |
| `\p{P}` | 标点 | ，。! |
| `\p{White_Space}` | 空白 | 空格、制表符 |
| `\p{Script=Han}` | 汉字 | 中、𠮷 |
| `\p{Script=Hiragana}` | 平假名 | あ |
| `\p{Alphabetic}` | 字母性字符（比 L 略宽） | 字母加部分字母性记号 |
| `\p{Extended_Pictographic}` | 图形 Emoji 主体 | 表情符号（不含纯数字） |

脚本属性必须写全 `Script=`：`\p{Han}` 在 JS 里是语法错误（Perl 允许的简写，JS 不支持）。

## 回到表单：国际化昵称校验

把校验逻辑按语义重写，中文、日文、阿拉伯文用户全部通过：

```javascript
function validateNickname(name) {
  const normalized = name.normalize('NFC'); // 先规范化，统一等价写法
  if (normalized.length < 2 || [...normalized].length > 20) {
    return { ok: false, reason: '长度需为 2-20 个字符' };
  }
  // 白名单：常见书写系统 + 数字 + 下划线/连字符/点
  const allowed = /^(?:[\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Greek}\p{N}_\-.]|\p{M})+$/u;
  if (!allowed.test(normalized)) {
    return { ok: false, reason: '包含不支持的字符' };
  }
  // 安全项：拒绝隐形控制字符与格式字符（零宽字符、双向控制符常被用于欺骗）
  if (/[\p{Cc}\p{Cf}]/u.test(normalized)) {
    return { ok: false, reason: '包含不可见的控制字符' };
  }
  return { ok: true, reason: 'OK' };
}

validateNickname('小明_A');        // { ok: true, reason: 'OK' }
validateNickname('やまだ');         // { ok: true, reason: 'OK' }
validateNickname('user\u200bname'); // { ok: false, reason: '包含不可见的控制字符' }
```

两个配套细节：

- `\p{M}` 是组合记号（如 `é` 拆成 `e` 加重音符号时的那个符号），白名单要放行它，否则规范化后带重音的名字会被误拒。
- `\p{Cf}` 格式字符里藏着零宽空格和双向排版控制符，输入框校验里几乎总是应该拒绝。

## Emoji 为什么是重灾区：\p{Emoji} 的陷阱

这是本篇最值得记住的坑：`\p{Emoji}` 会匹配数字 0-9 和 `#`、`*`——因为 Unicode 给它们都标了 Emoji 属性（在变体选择符下可以显示成键盘样式）。

```javascript
'I have 5 apples'.match(/\p{Emoji}/gu);
// ['5'] —— 数字被当成了 Emoji

// 正确姿势：Extended_Pictographic 才是"图形符号"属性
'I have 5 apples \u{1F600}'.match(/\p{Extended_Pictographic}/gu);
// ['\u{1F600}'] —— 只匹配真正的图形 Emoji
```

更麻烦的是 Emoji 往往不是单个码点：一个"全家福"是多个图形符号用零宽连接符 U+200D 串起来的序列；国旗是两个区域指示符字母的组合。按单个属性删会删一半留一半：

```javascript
function stripEmoji(text) {
  // 图形符号 + 后随的 ZWJ 连接序列 + 修饰符/变体选择符；以及成对的区域指示符（国旗）
  return text.replace(
    /\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*[\u{1F3FB}-\u{1F3FF}\u{FE0F}]?|\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}][\uFE0F]?|[\u{1F1E6}-\u{1F1FF}]{2}/gu,
    ''
  );
}

stripEmoji('hi \u{1F600} and flag \u{1F1E8}\u{1F1F3}');
// 'hi  and flag ' —— 单个表情与国旗都被整块移除
```

正经的文本分段（把"用户看到的一个字符"当一个单位）应该用 `Intl.Segmenter`，见[Intl API](/javascript/650-IntlApi)；正则方案适合简单的过滤场景。

## 为什么引擎能"认识"这些属性

`\p{L}` 之所以知道"中"是字母，是因为各引擎内置了 Unicode 字符数据库的快照：每个属性被编译成码点区间表或位图，匹配时查表，代价与普通字符类相当。两个推论：

1. Unicode 是版本化标准，同一行正则在引擎版本不同时结果可能有细微差异（新字符被收录）。对绝大多数业务无感，但别把"某字符永远不匹配某属性"写死在测试里。
2. 属性查询是 O(1) 查表，不必为性能手工写 ASCII 区间——现代引擎里 `\p{L}` 与 `[a-zA-Z]` 同量级，先保证正确性。

## 坑点与自检

**坑 1：忘写 u 标志**。`/\p{L}/` 直接 SyntaxError。另一个相关坑：正则字面量里写 `\p` 却想匹配字面 `p`，记得转义。

**坑 2：用 `length` 和下标处理增补平面字符**。Emoji 与扩展区汉字占两个 UTF-16 码元：

```javascript
const s = '\u{20BB7}'; // 生僻字
s.length;        // 2 —— 码元数，不是字符数
[...s].length;   // 1 —— 码点数
```

正则侧的对应规则：涉及增补平面字符时用 `u` 标志（或 `v`），让引擎按码点而不是码元工作。

**坑 3：规范化不做，等价字符不认账**。`é` 可以是一个码点（U+00E9），也可以是 `e` 加组合重音符（两个码点）。用户输入不可控，正则处理文本前先 `normalize('NFC')` 是低成本高收益的习惯。

**坑 4：`\p{Alphabetic}` 与 `\p{L}` 混为一谈**。前者是二进制属性，范围比通用类别 L 略宽（含部分字母性记号）。日常校验用 `\p{L}` 就够，严格的语言学场景才需要 `Alphabetic`。

自检清单：

- `\p{Emoji}` 会不会匹配 `5`？该用哪个属性？
- 脚本属性的正确写法是 `\p{Han}` 还是 `\p{Script=Han}`？
- 用户昵称校验里为什么拒绝 `\p{Cf}`？
- `length` 数的是什么？要数"字符"用什么？

## 练习

1. 写一个 `countWords(text)`：能正确统计中英日混排文本的"词数"（汉字连续段算一个词，拉丁字母连续段算一个词）。提示：`\p{Script=Han}+` 与 `\p{L}+` 分别匹配。
2. 把本篇的昵称校验改成可配置：传入允许的脚本数组（如 `['Han', 'Latin']`），动态构造正则并缓存实例（提示：`new RegExp` 加 Map 缓存）。
3. 写 `maskPhone(text)`：把文本里的中国大陆手机号打码成 `138****1234`，但要保证中文语境（前后是汉字）也能正确匹配——想想 `\b` 在汉字旁为什么失效，用先行后行断言（见[正则断言](/javascript/640-RegexAssertions)）替代。
4. 抓一段真实弹幕/评论数据，统计其中 Emoji 的占比，验证 ZWJ 序列是否被 `stripEmoji` 整块移除。

## 下一步

- [正则断言](/javascript/640-RegexAssertions)：与属性转义配合做"零宽上下文"匹配。
- [Intl API](/javascript/650-IntlApi)：`Intl.Segmenter` 按字形簇切分，是 Emoji 与组合字符的正解。
- [具名捕获组](/javascript/120-ES2018RegExpNamedCaptureGroups)：属性转义匹配到的内容，用具名组取出来最清晰。
