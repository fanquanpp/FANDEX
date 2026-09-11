---
order: 650
title: Intl 国际化 API（ECMA-402）
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 内置国际化全家桶：Intl.NumberFormat、DateTimeFormat、Collator、Segmenter 等的正确用法与性能要点。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/610-TemporalJavaScriptAPI'
  - 'javascript/430-WebAPIBrowserInterface'
  - 'javascript/060-ControlFlow'
prerequisites:
  - 'javascript/040-VariableDataType'
  - 'javascript/070-ObjectArray'
---

## 0. 一句话理解

> Intl 是 JS 内置的国际化标准（ECMA-402）：货币/数字格式、日期时间、排序比较、复数规则、分词——浏览器与 Node 开箱即用，绝大多数场景不再需要 moment/numeral 这类第三方库。

## 1. 解决什么问题

手写格式化在不同语言环境下必然出错：

```javascript
(12345.6).toFixed(2);                       // "12345.65"，没有千分位，小数四舍五入规则存疑
new Date().toLocaleString();               // 依赖宿主系统区域，不同用户看到不同格式
['Zebra', 'apple', 'Ärger'].sort();        // 按 Unicode 码位排序，德语里 ä 排在 a 之后才对
```

Intl 的设计原则：**格式化规则来自 CLDR 数据库**（Unicode 联盟维护），由引擎内置，按 `语言标签`（如 `zh-CN`、`en-US`、`de-DE`）选择正确输出。

## 2. 语言标签（Locale）

```javascript
new Intl.NumberFormat('zh-CN');   // 简体中文（中国）
new Intl.NumberFormat('zh-Hant-TW');  // 繁体中文（台湾）
new Intl.NumberFormat(['de-DE', 'en']);  // 按序回退
new Intl.NumberFormat();          // 不传则用宿主环境默认区域
```

标签结构是 `语言-文字-地区`（BCP 47）；可以用 `Intl.Locale` 对象解析与扩展：

```javascript
new Intl.Locale('zh-CN', { numberingSystem: 'hanidec' }).toString();
// "zh-CN-u-nu-hanidec"，中文小写数字编号系统
```

**工程要点**：面向全球用户的站点应显式传入区域（来自用户设置或 URL），不要依赖宿主默认值——测试环境与用户环境的区域不一致是国际化 Bug 的头号来源。

## 3. Intl.NumberFormat：数字与货币

```javascript
const nf = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});
nf.format(12345.6);   // "¥12,345.60"

new Intl.NumberFormat('en-US', { notation: 'compact' })
  .format(1_500_000); // "1.5M"

new Intl.NumberFormat('zh-CN', {
  style: 'unit', unit: 'kilometer-per-hour', unitDisplay: 'short',
}).format(120);       // "120公里/小时"

new Intl.NumberFormat('zh-CN', { signDisplay: 'always' }).format(5);  // "+5"
```

常用选项：`style`（decimal/currency/percent/unit）、`currencyDisplay`（symbol/narrowSymbol/code/name）、`maximumFractionDigits`、`notation`（standard/scientific/compact）、`signDisplay`。`Intl.NumberFormat` 还支持区间格式化（`formatRange`）。

## 4. Intl.DateTimeFormat：日期时间

```javascript
const dtf = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Asia/Shanghai',
});
dtf.format(new Date());   // "2026年9月8日 GMT+8 下午2:30:05"

// 按部件取值（配合 Temporal 或手拆渲染）
dtf.formatToParts(new Date());
// [{ type: 'year', value: '2026' }, { type: 'literal', value: '年' }, ...]
```

注意两点：

1. `timeZone` 显式指定可让服务器与客户端输出一致；不指定则用运行环境时区；
2. 时区是**时间问题**，语言区域是**表达问题**：`new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai' })` 完全合法——用英文格式显示上海时间。

与 Temporal 的配合：Temporal 的类型自带 `toLocaleString`，底层同样走 Intl（见 `javascript/610-TemporalJavaScriptAPI`）。

## 5. Intl.Collator：正确的排序与比较

```javascript
const names = ['张三', '李四', 'Aaron', 'älma'];

// 错误：按 Unicode 码位
[...names].sort();
// ["Aaron", "älma", "张三", "李四"]——张/李的顺序取决于码位，不符合拼音习惯

// 正确：按语言规则
new Intl.Collator('zh-CN').sort(names);       // 按拼音：Aaron, 李四, 张三, älma...（CLDR 规则）
new Intl.Collator('de').compare('ä', 'a');    // 1：德语中 ä 排在 a 之后
new Intl.Collator('sv').compare('ä', 'a');    // 瑞典语中 ä 是独立字母，排在 z 之后
```

`Collator` 的 `compare` 是标准比较函数签名，可直接传给 `sort()`；`sensitivity` 选项控制大小写/变音符号是否参与比较（搜索匹配常用 `sensitivity: 'base'`）。

## 6. 其余成员速览

```javascript
// 复数规则：数字 → "one/other/zero..." 类别（阿拉伯语有 zero/one/two/few/many）
new Intl.PluralRules('en-US').select(1);      // "one"
new Intl.PluralRules('en-US').select(2);      // "other"
// 用法：i18n 文件的复数模板按类别匹配

// 分词：中日文没有空格分词，Segmenter 按词边界切
const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
[...seg.segment('国际化的分词器')].map(s => s.segment);
// 词粒度切分，搜索高亮、字数统计的正确姿势

// 显示名：语言/货币/时区的本地化名称
new Intl.DisplayNames('zh-CN', { type: 'language' }).of('en-US');  // "美式英语"
new Intl.DisplayNames('zh-CN', { type: 'currency' }).of('JPY');    // "日元"

// 相对时间："3 天前"
new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
  .format(-3, 'day');   // "3 天前"

// 列表格式："A、B 与 C"
new Intl.ListFormat('zh-CN', { type: 'conjunction' })
  .format(['A', 'B', 'C']);   // "A、B和C"
```

## 7. 性能与缓存

1. **格式化器实例化很贵**（要加载 CLDR 数据），`new Intl.NumberFormat(...)` 每次调用新建会拖垮热路径：
   ```javascript
   // 反例：每次渲染新建
   items.map(i => new Intl.NumberFormat('zh-CN').format(i.price));

   // 正确：按 (区域+选项) 缓存实例
   const cache = new Map();
   function nf(locale, opts) {
     const key = locale + JSON.stringify(opts);
     if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale, opts));
     return cache.get(key);
   }
   ```
2. `formatToParts` 比 `format` + 正则解析可靠，UI 自定义渲染一律用它；
3. Node 环境注意发行版：`node` 全量构建内置完整 ICU，`node-small-icu`/精简镜像只有英语数据（`Intl.supportedValuesOf` 与运行时探测可检查）。

## 8. 常见陷阱

| 陷阱 | 说明 | 正确做法 |
| --- | --- | --- |
| 拼字符串做格式 | `"¥" + price` 忽略区域与精度 | NumberFormat + currency |
| `sort()` 直接排用户文本 | 码位序不符合语言直觉 | Collator |
| 时区与区域混为一谈 |以为 zh-CN 就是北京时间 | timeZone 与 locale 分开传 |
| 忽略复数类别 | 英文 "1 items" | PluralRules 选择模板 |
| 中日文字数统计用 length | 码元长度 ≠ 词数 | Segmenter |
| 忘缓存格式化器 | 列表页卡顿 | 按 key 缓存实例 |

## 9. 动手试试

1. 用 `NumberFormat` 实现一个多币种价格组件，切换区域时格式自动变化；
2. 用 `Collator`（`sensitivity: 'base'`）实现一个大小写与变音不敏感的搜索；
3. 用 `RelativeTimeFormat` + 时间差计算实现"3 分钟前"消息列表；
4. 用 `Segmenter` 统计一段中文的词数，对比 `str.length` 的结果差异。

## 10. 一句话记住

> Intl（ECMA-402）是内置的国际化标准库：NumberFormat 管数字货币、DateTimeFormat 管日期、Collator 管排序比较、PluralRules/Segmenter/DisplayNames 补齐长尾——格式化器按配置缓存，区域与时区是两个独立维度。
