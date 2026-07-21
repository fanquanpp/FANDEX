---
order: 67
title: '微数据与JSON-LD'
module: html5
category: HTML5
difficulty: intermediate
description: 'Microdata与JSON-LD'
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/全双工通信
  - html5/实时通信
  - html5/自定义数据属性
  - html5/跨文档通信
prerequisites:
  - html5/概述与核心特性
---

## 1. 结构化数据概述

| 格式          | 嵌入方式        | 优点                    | 缺点       |
| ------------- | --------------- | ----------------------- | ---------- |
| **Microdata** | HTML 属性       | 与内容一体              | HTML 冗余  |
| **JSON-LD**   | `<script>` 标签 | 独立于内容，Google 推荐 | 需额外维护 |

## 2. Microdata

```html
<div itemscope itemtype="https://schema.org/Person">
  <span itemprop="name">张三</span>
  <span itemprop="jobTitle">软件工程师</span>
</div>
```

| 属性        | 说明                       |
| ----------- | -------------------------- |
| `itemscope` | 声明一个项目               |
| `itemtype`  | 项目类型（Schema.org URL） |
| `itemprop`  | 项目属性                   |

## 3. JSON-LD

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "深入理解 HTML5",
    "author": { "@type": "Person", "name": "张三" },
    "datePublished": "2026-06-14"
  }
</script>
```

### 常用类型

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "无线蓝牙耳机",
  "offers": { "@type": "Offer", "price": "299.00", "priceCurrency": "CNY" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.5" }
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "什么是 HTML5？",
      "acceptedAnswer": { "@type": "Answer", "text": "HTML5 是超文本标记语言的最新标准..." }
    }
  ]
}
```

## 4. 验证与测试

- [Google 富摘要测试](https://search.google.com/test/rich-results)
- [Schema.org 验证器](https://validator.schema.org/)
