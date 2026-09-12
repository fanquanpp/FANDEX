---
order: 350
title: 微数据与 JSON-LD
module: 'html5'
category: 前端技术
difficulty: intermediate
description: Microdata与JSON-LD
author: fanquanpp
updated: '2026-09-13'
related:
  - 'html5/340-CustomDataAttribute'
  - 'html5/280-CrossDocumentCommunication'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)

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
## 结构化数据格式对比

**Microdata 与 JSON-LD 对比表**

| 格式          | 嵌入方式           | 优点                    | 缺点       |
| ------------- | ------------------ | ----------------------- | ---------- |
| **Microdata** | HTML 属性          | 与内容一体,无需额外标签 | HTML 冗余  |
| **JSON-LD**   | `<script>` 标签    | 独立于内容,Google 推荐  | 需额外维护 |
| **RDFa**      | HTML 属性          | 表达力强                | 语法复杂   |

---

## Microdata 微数据

**基本语法**
`<div itemscope itemtype="<schema-url>"> <span itemprop="<property>">值</span> </div>`

```html
<!-- 描述一个 Person 类型对象 -->
<div itemscope itemtype="https://schema.org/Person">
  <span itemprop="name">张三</span>
  <span itemprop="jobTitle">软件工程师</span>
  <span itemprop="email">mailto:zhangsan@example.com</span>
</div>
```

**Microdata 属性表**

| 属性          | 说明                              |
| ------------- | --------------------------------- |
| `itemscope`   | 声明一个项目(对象)               |
| `itemtype`    | 项目类型(Schema.org URL)         |
| `itemprop`    | 项目属性名                        |
| `itemid`      | 项目全局标识符(如 URL)           |
| `itemref`     | 引用其他元素作为项目属性          |
| `itemlist`    | 列表容器                          |

**嵌套对象**
`<div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">`

```html
<!-- 嵌套对象:Person 包含 PostalAddress -->
<div itemscope itemtype="https://schema.org/Person">
  <span itemprop="name">张三</span>
  <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
    <span itemprop="addressLocality">北京</span>
    <span itemprop="postalCode">100000</span>
  </div>
</div>
```

**多值属性**
`<span itemprop="keyword">关键词1</span> <span itemprop="keyword">关键词2</span>`

```html
<!-- 同一属性出现多次表示多值 -->
<div itemscope itemtype="https://schema.org/Article">
  <span itemprop="headline">HTML5 微数据指南</span>
  <span itemprop="keywords">HTML5</span>
  <span itemprop="keywords">Microdata</span>
  <span itemprop="keywords">SEO</span>
</div>
```

---

## JSON-LD 嵌入

**基础语法**
`<script type="application/ld+json"> { ... } </script>`

```html
<!-- 使用 script 标签嵌入 JSON-LD 结构化数据 -->
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "深入理解 HTML5",
    "author": {
      "@type": "Person",
      "name": "张三"
    },
    "datePublished": "2026-06-14",
    "image": "https://example.com/cover.jpg",
    "publisher": {
      "@type": "Organization",
      "name": "示例出版社"
    }
  }
</script>
```

**@graph 多对象嵌入**
`{ "@context": "...", "@graph": [ {obj1}, {obj2} ] }`

```html
<!-- 一次嵌入多个相关对象 -->
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://example.com",
        "name": "示例网站",
        "url": "https://example.com"
      },
      {
        "@type": "Organization",
        "@id": "https://example.com/org",
        "name": "示例公司",
        "logo": "https://example.com/logo.png"
      }
    ]
  }
</script>
```

---

## 常用 Schema.org 类型

**Product 产品类型**
`{ "@type": "Product", "name", "offers", "aggregateRating" }`

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "无线蓝牙耳机",
    "image": "https://example.com/earbuds.jpg",
    "description": "降噪蓝牙耳机,续航 24 小时",
    "sku": "SKU-001",
    "brand": {
      "@type": "Brand",
      "name": "ExampleBrand"
    },
    "offers": {
      "@type": "Offer",
      "url": "https://example.com/buy",
      "price": "299.00",
      "priceCurrency": "CNY",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "128"
    }
  }
</script>
```

**FAQPage 常见问题类型**
`{ "@type": "FAQPage", "mainEntity": [ { "@type": "Question" } ] }`

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "什么是 HTML5?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "HTML5 是超文本标记语言的最新标准,于 2014 年正式发布。"
        }
      },
      {
        "@type": "Question",
        "name": "什么是 Service Worker?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Service Worker 是一种在浏览器后台运行的脚本,可用于实现离线缓存和推送通知。"
        }
      }
    ]
  }
</script>
```

**BreadcrumbList 面包屑导航**
`{ "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position" } ] }`

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "首页",
        "item": "https://example.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "产品",
        "item": "https://example.com/products"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "无线耳机"
      }
    ]
  }
</script>
```

**Event 事件类型**
`{ "@type": "Event", "name", "startDate", "location", "offers" }`

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "前端技术大会 2026",
    "startDate": "2026-09-15T09:00:00+08:00",
    "endDate": "2026-09-15T18:00:00+08:00",
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": "北京国际会议中心",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "北京",
        "streetAddress": "朝阳区北辰东路 8 号"
      }
    },
    "image": ["https://example.com/event.jpg"],
    "offers": {
      "@type": "Offer",
      "price": "199.00",
      "priceCurrency": "CNY",
      "availability": "https://schema.org/InStock"
    }
  }
</script>
```

---

## 常用 Schema 类型清单

**Schema.org 主要类型表**

| 类型             | 用途             | 关键属性                                   |
| ---------------- | ---------------- | ------------------------------------------ |
| `Article`        | 文章             | headline, author, datePublished            |
| `Product`        | 产品             | name, offers, brand, aggregateRating       |
| `Offer`          | 商品报价         | price, priceCurrency, availability         |
| `Organization`   | 组织/公司        | name, logo, url, contactPoint              |
| `Person`         | 个人             | name, jobTitle, email, address             |
| `Event`          | 事件             | name, startDate, endDate, location         |
| `FAQPage`        | 常见问题页       | mainEntity                                 |
| `Recipe`         | 食谱             | name, recipeIngredient, cookTime           |
| `Review`         | 评论             | reviewRating, author, itemReviewed         |
| `BreadcrumbList` | 面包屑导航       | itemListElement                            |
| `WebSite`        | 网站             | name, url, potentialAction                 |
| `VideoObject`    | 视频内容         | name, uploadDate, thumbnailUrl, contentUrl |
| `HowTo`          | 教程/操作指南    | step, totalTime, supply                    |

---

## 验证与测试

**官方验证工具**

| 工具                          | 用途                              |
| ----------------------------- | --------------------------------- |
| Google 富摘要测试             | 检测 Google 富摘要支持情况        |
| Schema.org 验证器             | 验证 Schema.org 标记语法          |
| Google Search Console         | 监控结构化数据错误与点击          |
| Bing Webmaster Tools          | Bing 结构化数据报告               |

**验证 URL**

- 富摘要测试: `https://search.google.com/test/rich-results`
- Schema.org 验证器: `https://validator.schema.org/`
- 结构化数据检测: `https://search.google.com/structured-data/testing-tool`

---

## 注意事项

- **JSON-LD 首选**:Google 官方推荐使用 JSON-LD,而非 Microdata
- **数据真实性**:结构化数据必须与页面可见内容一致,否则可能被判定为垃圾信息
- **@context 必填**:JSON-LD 必须包含 `@context: "https://schema.org"`
- **类型一致性**:`@type` 必须是 Schema.org 中定义的合法类型
- **富摘要审核**:部分类型(如 JobPosting、Event)需额外审核才能在搜索结果中显示

## 动手试试

1. 给一篇博客文章添加 JSON-LD 的 `Article` 数据（标题、作者、发布日期）；
2. 用 Google Rich Results Test 或 Schema Markup Validator 验证；
3. 给一个商品页添加 `Product` + `Offer` + `AggregateRating`，观察搜索结果能展示哪些增强信息；
4. 进阶挑战：对比 Microdata 与 JSON-LD 在同一个页面上的维护成本。

## 核心知识点

> 一句话记住结构化数据：`Schema.org` 定词汇，JSON-LD 最推荐；`@type` 说类型，属性描述内容，验证工具保正确。

- 结构化数据让搜索引擎理解页面实体（文章、商品、人、事件）；
- 两种主流格式：Microdata（HTML 属性）与 JSON-LD（script 标签）；
- JSON-LD 独立于内容、Google 推荐，是首选方案；
- `@context`/`@type`/属性字段构成 JSON-LD 基本结构；
- 上线前用 Rich Results Test 验证，错误数据会被忽略。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 数据与页面不符 | 被判定为作弊，降低信任 | 结构化数据必须与可见内容一致 |
| 滥用 `Review`/`Rating` | 自评星级违反政策 | 只标记真实评价 |
| 忘记 `@context` | 解析器无法识别词汇表 | 始终声明 `https://schema.org` |
| 只做一种格式 | 维护成本与兼容性 | 新项目直接用 JSON-LD |
| 不上线验证 | 语法错误被静默忽略 | 用 Rich Results Test 检查 |

## 扩展学习

- Schema.org 官方文档：完整类型与属性清单；
- SEO 实践：`css/660-HTMLSemanticSEO` 语义化与结构化数据的配合；
- 社交分享：`html5/060-MetadataCharacterEncoding` 中 Open Graph 与 JSON-LD 的差异；
- 验证工具：Google Rich Results Test、Schema Markup Validator。
