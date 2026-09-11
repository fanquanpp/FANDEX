---
order: 240
title: React 国际化
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 国际化实战：i18next/react-i18next 完整接入、翻译键组织与插值复数、Intl API（Collator/NumberFormat/DateTimeFormat）、RTL 布局与语言切换持久化。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/220-ReactTest'
  - 'react/230-ReactRouteAdvanced'
  - 'react/250-ReactAnimation'
  - 'react/260-ReactSSR'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

国际化的本质是两件事：**把"写死的文案"换成"键 + 当前语言查表"**（i18n），以及**把日期、数字、排序、复数交给浏览器的 Intl API**（l10n）。库只解决第一件，且只占工作量的一半——大量翻车都出在"以为换文案就完了"，比如拼字符串、写死美元符号、英文复数规则。React 生态的事实标准是 **i18next + react-i18next**：核心库管翻译与语言状态，适配层提供 `useTranslation` Hook 与重渲染。

```bash
npm i i18next react-i18next
```

## 2. 最小可用接入：初始化与 useTranslation

```tsx
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 演示用内联资源；正式项目放独立 JSON 文件并按需加载
const resources = {
  en: { translation: { welcome: 'Welcome, {{name}}', cart: 'You have {{count}} item', cart_other: 'You have {{count}} items' } },
  zh: { translation: { welcome: '欢迎，{{name}}', cart: '购物车有 {{count}} 件商品' } },
};

i18n.use(initReactI18next).init({
  resources,
  lng: navigator.language.startsWith('zh') ? 'zh' : 'en', // 初始语言：跟随浏览器
  fallbackLng: 'en',  // 当前语言缺键时的回退语言
  interpolation: { escapeValue: false }, // React 已转义 XSS，无需二次转义
});

export default i18n;
```

```tsx
// App.tsx（入口处 import './i18n' 一次即可）
import { useTranslation } from 'react-i18next';

function Header() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('welcome', { name: '张三' })}</h1>
      {/* count 参数触发复数规则：en 下 1 件用 cart，2 件用 cart_other；中文无复数形态 */}
      <p>{t('cart', { count: 3 })}</p>
    </div>
  );
}
```

预期渲染行为：中文环境显示"欢迎，张三"与"购物车有 3 件商品"；切到 `en` 后同一组件自动重渲染为英文，`count: 1` 时输出 "You have 1 item"、`count: 3` 时输出 "You have 3 items"。`useTranslation` 订阅了语言状态，`i18n.changeLanguage('en')` 后所有使用它的组件自动更新——不需要手动刷新。

## 3. 语言切换与持久化

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function change(lng: string) {
    i18n.changeLanguage(lng);          // 触发全局重渲染
    localStorage.setItem('lang', lng); // 记住选择
    document.documentElement.lang = lng; // 告知浏览器/读屏当前语言
  }

  return (
    <select value={current} onChange={(e) => change(e.target.value)}>
      <option value="zh">中文</option>
      <option value="en">English</option>
    </select>
  );
}
```

初始语言的优先级建议：URL 参数 > 用户上次选择（localStorage）> `navigator.language` > `fallbackLng`。`lng` 配置只决定初始值，不要在 init 后反复改它。

## 4. 翻译键的组织与插值

- **按页面/功能命名空间**：`t('checkout:submit')`（命名空间 `checkout`）比全堆在 `translation` 里好维护，命名空间还能懒加载。
- **键表达语义，不表达文案**：`t('error.email.required')` 好，`t('pleaseInputYourEmail')` 坏——英文改版会毁掉所有键名。
- **不要拼接句子**：`t('greet') + '，' + name + t('welcomeSuffix')` 在德语等语序不同的语言里是乱序灾难；把变量做成插值占位符 `{{name}}`，让整句交由翻译。
- **插值格式化**：`{{count, number}}`、`{{date, datetime}}` 可在插值时直接走 Intl 格式化，不必在组件里先格式化再传入。

## 5. Intl API：不写库就有的本地化能力

i18next 管文案，**格式化尽量直接用浏览器内置 Intl**，零体积且最准确：

```tsx
const price = 1234567.891;

// 数字与货币
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(price);
// "¥1,234,567.89"
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
// "$1,234,567.89"

// 日期时间
new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' })
  .format(new Date('2026-09-10T08:30:00Z')); // "2026年9月10日 GMT+8 下午4:30"

// 相对时间
new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(-1, 'day'); // "昨天"

// 列表连接
new Intl.ListFormat('zh-CN').format(['苹果', '香蕉']); // "苹果和香蕉"

// 复数规则判断（与 i18next 的 count 复数底层同源）
new Intl.PluralRules('en-US').select(1); // 'one'
new Intl.PluralRules('en-US').select(3); // 'other'

// 排序：中文按拼音
['张三', '李四', '横批'].sort(new Intl.Collator('zh-Hans-CN').compare);

// 语言名本地化显示
new Intl.DisplayNames('zh-CN', { type: 'language' }).of('en'); // "英语"
```

## 6. RTL 与镜像布局

阿拉伯语、希伯来语从右向左（RTL），切换语言时要同步翻转布局方向：

```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function useDocumentDirection() {
  const { i18n } = useTranslation();
  const rtl = ['ar', 'he', 'fa', 'ur'].some((l) => i18n.language.startsWith(l));
  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [rtl]);
}

// 布局侧配合：CSS 逻辑属性自动镜像，不需要写两套样式
// .sidebar { margin-inline-start: 16px; }  // ltr 是左，rtl 自动变右
// text-align: start / end 而不是 left / right
```

要点：用 CSS 逻辑属性（`margin-inline-start`、`padding-inline-end`、`inset-inline-start`）替代物理方向；图标箭头类素材注意语义是否需要镜像（播放键不镜像，返回键镜像）。

## 7. 翻译资源按需加载

全量打包多语言 JSON 会让首屏 JS 膨胀。i18next 原生支持后端插件按命名空间懒加载：

```tsx
import HttpBackend from 'i18next-http-backend';

i18n.use(HttpBackend).use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'en',
  ns: ['common'],                       // 首屏只加载 common 命名空间
  defaultNS: 'common',
  backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' }, // /locales/zh/common.json
  partialBundledLanguages: true,
});
// 进入结算页时：i18n.loadLanguages('en') 或在组件里 useTranslation('checkout') 触发按需拉取
```

`useTranslation` 遇到未加载的命名空间时可用 `ready` 标志配合 Suspense/骨架屏处理。

## 8. 常见陷阱

- **拼接句子代替插值**：任何 `t('a') + xxx + t('b')` 都会在换语言时语序错乱；必须整句成键、变量插值。
- **忘记 `interpolation.escapeValue: false`**：默认开启的 HTML 转义在 React 里会把 `&` 变成 `&amp;` 双重转义。
- **硬编码日期/数字格式**：`toFixed(2)` + 手拼 `$` 在欧德语区（`1.234,56 €`）是错的；一律走 `Intl.NumberFormat`。
- **语言包键漂移**：开发期开启 `saveMissing: true` 收集缺失键（见速查）；CI 里做键集合 diff 检查，缺键上线比文案错更严重（直接显示键名）。
- **切换语言后 `document.lang` 不更新**：读屏软件的发音依赖 `lang` 属性，改语言必须同步改它。
- **测试里的语言不确定性**：组件测试固定 `i18n.language = 'en'` 或用测试专用资源，避免随 CI 机器 locale 漂移；断言尽量用键的语义名而不是某语言的具体文案。
- **SSR 双跑不一致**：服务端与客户端初始语言判定逻辑不同会导致水合告警；SSR 场景从请求头 `Accept-Language`/cookie 统一判定并注入，见[React 服务端渲染](/react/260-ReactSSR)。

## 9. 小结

初学者要点：

- i18next + react-i18next 三步：`init`（资源 + fallbackLng）→ `useTranslation()` → `t('key', { 变量 })`；切换语言 `i18n.changeLanguage` 自动重渲染。
- 文案进键、变量进插值，永不拼接；数字、日期、排序、复数用 Intl API。
- 初始语言按"URL > localStorage > 浏览器 > fallback"取，切换后同步 `document.documentElement.lang`。

进阶注意：

- 命名空间 + HTTP 后端插件实现按语言、按页面懒加载资源，控制首屏体积。
- 复数交给 `count` 与键后缀（`_one`/`_other`，由 Intl.PluralRules 规则驱动），不要手写 `if (n === 1)`。
- RTL 用 `dir` 属性 + CSS 逻辑属性解决，避免双套样式；SSR 注意语言判定的水合一致性。

## 速查

**初始化与使用**

```tsx
i18n.use(initReactI18next).init({ resources, lng: 'zh', fallbackLng: 'en', interpolation: { escapeValue: false } });
const { t, i18n } = useTranslation();
t('welcome', { name: '张三' });          // 插值
t('cart', { count: 3 });                 // 复数（键：cart / cart_other）
i18n.changeLanguage('en');               // 切换语言（全局重渲染）
```

**本地化字符串排序**

```tsx
// 中文拼音排序
['张三', '李四'].sort(new Intl.Collator('zh-Hans-CN').compare);
```

**单复数默认规则**

```ts
// 英文自动按 Intl.PluralRules 选择后缀
{ item_one: 'item', item_other: 'items' }
// t('item', { count: 3 }) -> 'items'
```

**测试与回退**

```ts
// 当前语言缺失时回退
i18n.init({ fallbackLng: 'en' });
// 开发期收集缺失翻译
i18n.init({ saveMissing: true, missingKeyHandler: (lng, ns, key) => console.warn(key) });
```

**常用 Intl 一览**

```tsx
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5);
new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date());
new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(-1, 'day');
new Intl.PluralRules('en-US').select(n);
```
