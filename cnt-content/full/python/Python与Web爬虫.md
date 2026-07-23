---
order: 69
title: Python与Web爬虫
module: python
category: Python
difficulty: advanced
description: HTTP 客户端、HTML 解析、Scrapy 框架、动态渲染、反爬对抗、分布式爬虫与合规伦理的工程实践，覆盖 requests、httpx、BeautifulSoup、lxml、parsel、Scrapy、Playwright、Selenium、aiohttp 等核心工具链。
author: fanquanpp
updated: '2026-07-20'
related:
- python/Python与NLP
- python/Python与计算机视觉
- python/Python与自动化
- python/Python与异步编程
- python/函数详解
prerequisites:
- python/语法速查
- python/函数详解
- python/面向对象编程
- python/Python与异常处理
tags:
- python
- web-scraping
- crawler
- scrapy
- beautifulsoup
- playwright
- httpx
- async
- data-engineering
learningObjectives:
- '{''remember'': ''复述 Python 爬虫六大组件（调度器、下载器、解析器、存储器、中间件、监控）及代表工具链''}'
- '{''understand'': ''解释 Scrapy 引擎的异步数据流与 Twisted 事件循环工作原理''}'
- '{''apply'': ''使用 requests、httpx、aiohttp 编写生产级 HTTP 客户端，处理重试、超时、会话、代理''}'
- '{''apply'': ''使用 BeautifulSoup、lxml、parsel、selectolax 进行高性能 HTML 解析与数据抽取''}'
- '{''analyze'': ''对比静态爬取与动态渲染爬取的工程权衡，识别何时使用 Playwright/Selenium''}'
- '{''evaluate'': ''评估反爬策略（UA 轮换、代理池、验证码识别、指纹伪装）的法律合规与道德边界''}'
- '{''create'': ''设计一个分布式爬虫系统，覆盖调度、下载、解析、去重、存储、监控与告警''}'
exercises:
- id: ex-scraper-01
  type: fill-blank
  cognitiveLevel: remember
  question: Scrapy 框架的核心数据流由 ______ 驱动，它负责协调调度器、下载器、爬虫与管道之间的异步事件传递；默认基于 ______ 异步网络框架实现。
  hint: 参考 Scrapy 架构文档与 Twisted 事件循环。
  answer: '["Engine", "Twisted"]'
  blankCount: 2
  caseSensitive: false
  explanation: Scrapy Engine 是中枢神经，负责事件分发；底层网络层基于 Twisted 的 Deferred 与 @inlineCallbacks 实现，3.x 之后已开始逐步向 asyncio 过渡。
  difficulty: 2
  estimatedTime: 3
- id: ex-scraper-02
  type: choice
  cognitiveLevel: understand
  question: 关于 HTTP 客户端库的并发性能，以下描述哪个最准确？
  options:
  - requests 在并发场景下比 httpx 快 2-4 倍，因其在底层使用了 urllib3 连接池
  - httpx 在并发场景下通常比 requests 快 2-4 倍，因原生支持异步与 HTTP/2
  - aiohttp 仅在 Python 2.7 环境下可用，Python 3 中已被 httpx 取代
  - Scrapy 内置使用 requests 作为默认下载器，因此性能受 GIL 限制
  correctIndex: 1
  multiple: false
  explanation: requests 是同步库且不支持 HTTP/2，在并发 IO 场景受 GIL 限制明显；httpx 同时提供同步与异步 API，原生支持 HTTP/2，在并发场景下性能显著优于 requests。aiohttp 仅支持 Python 3.5+ 且需异步上下文。Scrapy 使用 Twisted 而非 requests。
  difficulty: 3
  estimatedTime: 4
  answer: B. requests 是同步库且不支持 HTTP/2，在并发 IO 场景受 GIL 限制明显；httpx 同时提供同步与异步 API，原生支持 HTTP/2，在并发场景下性能显著优于 requests。aiohttp 仅支持 Python 3.5+ 且需异步上下文。Scrapy 使用 Twisted 而...
- id: ex-scraper-03
  type: code-fix
  cognitiveLevel: apply
  question: 以下爬虫代码意图抓取 quotes.toscrape.com 的所有名言并翻页，但存在多处缺陷。请修正。
  buggyCode: "import requests\nfrom bs4 import BeautifulSoup\n\nurl = 'https://quotes.toscrape.com/page/1/'\nwhile url:\n    resp = requests.get(url)\n    soup = BeautifulSoup(resp.text)\n    for q in soup.find_all('div', class_='quote'):\n        print(q.find('span', class_='text').text)\n    next_btn = soup.find('li', class_='next')\n    url = next_btn.a['href']\n"
  fixedCode: "import requests\nfrom bs4 import BeautifulSoup\nfrom urllib.parse import urljoin\n\n# 缺陷 1: 未设置 User-Agent，易被 403 拒绝\n# 缺陷 2: 未处理请求异常与重试\n# 缺陷 3: 未使用 Session 复用连接，性能差\n# 缺陷 4: next_btn 为 None 时仍访问 .a['href'] 触发 AttributeError\n# 缺陷 5: 相对路径未转换为绝对 URL\n# 缺陷 6: 缺少延迟，可能触发反爬封禁\nimport time\n\nHEADERS = {\n    'User-Agent': 'Mozilla/5.0 (compatible; FANDEXBot/1.0; +https://fandex.example/bot)'\n}\n\ndef scrape_quotes(start_url: str) -> list[dict]:\n    \"\"\"抓取所有名言并返回结构化数据。\"\"\"\n    results: list[dict] = []\n    url = start_url\n    with requests.Session() as session:\n        session.headers.update(HEADERS)\n        while url:\n            try:\n                resp = session.get(url, timeout=10)\n                resp.raise_for_status()\n            except requests.RequestException as exc:\n                print(f'请求失败 {url}: {exc}')\n                break\n            soup = BeautifulSoup(resp.text, 'html.parser')\n            for q in soup.find_all('div', class_='quote'):\n                text_tag = q.find('span', class_='text')\n                author_tag = q.find('small', class_='author')\n                if text_tag and author_tag:\n                    results.append({\n                        'text': text_tag.text,\n                        'author': author_tag.text,\n                    })\n            next_btn = soup.find('li', class_='next')\n            if next_btn and next_btn.a:\n                url = urljoin(url, next_btn.a['href'])\n                time.sleep(1)  # 礼貌爬取，每页间隔 1 秒\n            else:\n                url = None\n    return results\n\nif __name__ == '__main__':\n    quotes = scrape_quotes('https://quotes.toscrape.com/page/1/')\n    print(f'共抓取 {len(quotes)} 条名言')\n"
  errorDescription: 未设置 User-Agent、未处理异常、未使用 Session、None 引用错误、相对路径未转换、缺少延迟。
  language: python
  explanation: 生产级爬虫必须包含请求头、异常处理、连接复用、空值检查、URL 拼接与速率限制，否则容易被反爬或运行时崩溃。
  difficulty: 3
  estimatedTime: 15
  answer: '未设置 User-Agent、未处理异常、未使用 Session、None 引用错误、相对路径未转换、缺少延迟。 关键修复：# 缺陷 1: 未设置 User-Agent，易被 403 拒绝 | # 缺陷 2: 未处理请求异常与重试 | # 缺陷 3: 未使用 Session 复用连接，性能差'
- id: ex-scraper-04
  type: open-ended
  cognitiveLevel: create
  question: 你需要为一个新闻聚合平台设计分布式爬虫系统，每日抓取 50+ 新闻站点共约 100 万篇文章，要求支持增量更新、失败重试、断点续爬、IP 轮换、去重存储、监控告警。请详细描述架构设计、技术选型、数据流、合规策略与容灾方案。
  keyPoints:
  - 架构分层：调度层（Scrapy Cloud / Airflow）+ 下载层（Scrapy + httpx）+ 解析层（parsel + pydantic）+ 存储层（PostgreSQL + ClickHouse）
  - 去重策略：URL 指纹（MD5/xxHash）+ Bloom Filter + 文章内容 simhash 近似去重
  - IP 轮换：代理池服务（Bright Data / 自建 squid + Luminati）+ 故障切换
  - 增量爬取：记录每站点 last_crawled_at + ETag/Last-Modified 协商缓存
  - 分布式调度：Scrapy + Redis 队列 + Scrapy-Redis 组件
  - 合规：遵守 robots.txt、限定 QPS（≤1 req/s）、识别 CC-BY 版权
  - 监控：Prometheus + Grafana + Sentry，告警规则（失败率 > 5%）
  - 容灾：幂等性设计、断点续爬、双机房热备
  - 数据治理：GDPR 合规、用户数据脱敏、审计日志
  - 性能指标：日抓取量、去重率、平均延迟、成功率
  minWords: 400
  difficulty: 5
  estimatedTime: 40
  answer: 架构分层：调度层（Scrapy Cloud / Airflow）+ 下载层（Scrapy + httpx）+ 解析层（parsel + pydantic）+ 存储层（PostgreSQL + ClickHouse）；去重策略：URL 指纹（MD5/xxHash）+ Bloom Filter + 文章内容 simhash 近似去重；IP 轮换：代理池服务（Bright Data / 自建 squid + Luminati）+ 故障切换；增量爬取：记录每站点 last_crawled_at + ETag/Last-Modified 协商缓存；分布式调度：Scrapy + Redis 队列 + Scrapy-Redis 组件；合规：遵守 robots.txt、限定 QPS（≤1 req/s）、识别 CC-BY 版权；监控：Prometheus + Grafana + Sentry，告警规则（失败率 > 5%）；容灾：幂等性设计、断点续爬、双机房热备；数据治理：GDPR 合规、用户数据脱敏、审计日志；性能指标：日抓取量、去重率、平均延迟、成功率
references:
- type: standard
  authors:
  - Scrapy Project
  year: 2026
  title: Scrapy 3.x Documentation
  venue: Scrapy.org
  url: https://docs.scrapy.org/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Karl Dubost
  - Martin Alvarez-Espinar
  year: 2022
  title: Robots Exclusion Protocol (RFC 9309)
  venue: Internet Engineering Task Force (IETF)
  url: https://www.rfc-editor.org/rfc/rfc9309
  doi: 10.17487/RFC9309
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Fielding, R.
  - Reschke, J.
  year: 2022
  title: 'Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content (RFC 7231, obsoleted by RFC 9110)'
  venue: Internet Engineering Task Force (IETF)
  url: https://www.rfc-editor.org/rfc/rfc9110
  doi: 10.17487/RFC9110
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Mozilla Developer Network
  year: 2026
  title: Web Scraping Ethics and Robots.txt
  venue: MDN Web Docs
  url: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Kenneth Reitz Foundation
  year: 2026
  title: 'Requests: HTTP for Humans'
  venue: Python Software Foundation
  url: https://docs.python-requests.org/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Encode
  year: 2026
  title: 'httpx: A next-generation HTTP client for Python'
  venue: Encode OSS
  url: https://www.python-httpx.org/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Leonard Richardson
  year: 2026
  title: Beautiful Soup Documentation
  venue: Crummy.com
  url: https://www.crummy.com/software/BeautifulSoup/bs4/doc/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Microsoft
  year: 2026
  title: Playwright for Python Documentation
  venue: Microsoft
  url: https://playwright.dev/python/
  accessedDate: '2026-07-20'
- type: conference
  authors:
  - Papavasileiou, S.
  - Plessas, H.
  - Alexiou, N.
  year: 2023
  title: Comparative evaluation of Python web scraping frameworks
  venue: Proceedings of the 28th Panhellenic Conference on Progress in Computing and Informatics (PCI)
  pages: 230-237
  doi: 10.1145/3615835.3615870
- type: book
  authors:
  - Mitchell, R.
  year: 2018
  title: 'Web Scraping with Python: Collecting More Data from the Modern Web (2nd Edition)'
  venue: O'Reilly Media
  pages: 1-308
  isbn: 978-1491985571
- type: book
  authors:
  - Lawson, J.
  year: 2015
  title: Web Scraping with Python
  venue: Packt Publishing
  pages: 1-214
etymology:
- term: 爬虫
  english: Crawler / Spider
  origin: 源自 1993 年 Matthew Gray 开发的 World Wide Web Wanderer，是首个万维网爬虫，记录网站增长。
- term: 抓取
  english: Scraping
  origin: 英文 scrape 原意为刮取，引申为从网页表面"刮取"数据；与"挖掘 (mining)"类似，强调非结构化数据采集。
- term: 机器人
  english: Robot
  origin: 1920 年捷克作家 Čapek 在剧本《R.U.R.》中提出 robot 一词，源自捷克语 robota（劳役）。
- term: 选择器
  english: Selector
  origin: CSS 选择器源自 W3C CSS 1 (1996)，XPath 源自 XML Path Language 1.0 (1999)。
- term: 解析
  english: Parsing
  origin: 拉丁语 pars（部分），意为将整体分解为成分；计算机术语 1960 年代开始使用。
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 95
---

# Python 与 Web 爬虫

> 爬虫的本质是互联网的"自动化浏览器"，它以代码代替人眼读取网页，以结构化数据代替非结构化 HTML。Python 凭借 requests、BeautifulSoup、Scrapy、Playwright 等生态成为爬虫工程的事实标准语言。但爬虫也是法律与道德的灰色地带：抓什么、怎么抓、抓多快，都需要工程师作出审慎判断。

## 1. 学习目标与全景图

学习本章后，你应当能够：

1. **记住（Remember）** Python 爬虫的六大组件与代表工具链；
2. **理解（Understand）** Scrapy 引擎的异步数据流与 Twisted 事件循环；
3. **应用（Apply）** requests、httpx、aiohttp、BeautifulSoup、lxml、parsel 编写生产级爬虫；
4. **分析（Analyze）** 静态爬取与动态渲染爬取的工程权衡；
5. **评估（Evaluate）** 反爬策略的法律合规与道德边界；
6. **创造（Create）** 设计一个分布式爬虫系统，覆盖调度、下载、解析、去重、存储、监控。

```
                Python 爬虫生态
                      |
   +-----+-----+-----+-----+-----+-----+
   |     |     |     |     |     |     |
  HTTP   解析  框架  动态  反爬  分布式  存储
 requests BS4   Scrapy  Selenium UA池   Scrapy-Redis
 httpx   lxml   PySpider Playwright 代理池  PostgreSQL
 aiohttp  parsel Crawlee  Puppeteer  验证码  ClickHouse
 selectolax requests-html Splash  打码平台 Elasticsearch
```

## 2. 历史动机：从 W3-mirror 到 LLM 数据管道

### 2.1 早期互联网时代（1993 — 2000）

- **1993 年**：Matthew Gray 开发 *World Wide Web Wanderer*，首个万维网爬虫，用于统计网站数量；
- **1994 年**：Brian Pinkerton 发布 *WebCrawler*，首个全文搜索引擎；
- **1995 年**：MetaCrawler 引入元搜索；
- **1996 年**：Googlebot 雏形 BackRub 上线；
- **1998 年**：Google 发布 PageRank 算法，爬虫与索引分离。

### 2.2 Python 爬虫萌芽时代（2000 — 2010）

| 年份 | 事件 | 意义 |
| ---- | ---- | ---- |
| 2004 | urllib2 引入 Python 2 标准库 | 标准化 HTTP 客户端 |
| 2004 | Beautiful Soup 1.0 发布 | 简化 HTML 解析 |
| 2008 | Scrapy 0.7 发布 | 工业级爬虫框架诞生 |
| 2011 | Kenneth Reitz 发布 requests | "HTTP for Humans" |
| 2013 | lxml.html 成熟 | 高性能 XML/HTML 解析 |

### 2.3 现代爬虫时代（2010 — 2020）

- **2010 年**：Selenium 2.0 集成 WebDriver，动态渲染爬取成为主流；
- **2013 年**：Python 3.3 引入 `yield from`，简化协程；
- **2015 年**：aiohttp 1.0 发布，异步爬虫生态成熟；
- **2017 年**：Headless Chrome 稳定，Puppeteer 1.0 发布；
- **2018 年**：RFC 7231 标准化 HTTP/1.1 语义；
- **2020 年**：Playwright 1.0 发布，跨浏览器自动化新范式。

### 2.4 大模型时代（2020 — 至今）

| 年份 | 事件 | 意义 |
| ---- | ---- | ---- |
| 2020 | Common Crawl + GPT-3 数据集公开 | 爬虫数据成为 LLM 训练基石 |
| 2022 | RFC 9309 标准化 robots.txt | 爬虫合规国际标准 |
| 2023 | OpenAI OAI-SearchBot 发布 | LLM 时代爬虫协议 |
| 2024 | Anthropic ClaudeBot、CCBot 普及 | AI 爬虫生态形成 |
| 2025 | Scrapy 3.0 完全迁移到 asyncio | 摆脱 Twisted 历史包袱 |
| 2026 | Playwright 2.x 引入 AI 驱动的元素定位 | 爬虫自动化进入 LLM 时代 |

### 2.5 Python 爬虫生态演进

- **Python 2.x**：urllib2、httplib、BeautifulSoup 3；
- **Python 3.0 — 3.3**：urllib 合并、`io.StringIO` 统一；
- **Python 3.4**：pathlib、asyncio 引入；
- **Python 3.5**：`async/await` 语法，异步爬虫爆发；
- **Python 3.7**：`asyncio.run()` 标准化入口；
- **Python 3.11**：`asyncio.TaskGroup`、`ExceptionGroup`；
- **Python 3.12**：`asyncio` 性能优化、f-string 语法增强；
- **Python 3.13**：自由线程（PEP 703）解锁 GIL；
- **Python 3.14**：`asyncio` 进一步优化、JIT 实验性稳定。

## 3. 形式化定义

### 3.1 爬虫系统模型

定义爬虫系统为 $\mathcal{C} = \langle Q, D, P, S, M, \Sigma \rangle$，其中：

- $Q$ 为 URL 队列（Frontier）；
- $D$ 为下载器集合 $D = \{d_1, d_2, \dots, d_k\}$；
- $P$ 为解析器集合 $P = \{p_1, p_2, \dots, p_m\}$；
- $S$ 为存储后端（PostgreSQL / ClickHouse / S3）；
- $M$ 为监控指标集（成功率、QPS、延迟、去重率）；
- $\Sigma$ 为调度策略（FIFO、LIFO、优先级、礼貌策略）。

爬虫目标：在时间窗口 $T$ 内，最大化采集数据量 $|\text{Data}|$，同时满足约束：

1. **礼貌约束**：$\forall \text{site} \in \text{Sites}, \text{QPS}(\text{site}) \leq \text{QPS}_{\max}(\text{site})$；
2. **合规约束**：$\forall u \in Q, \text{robots}(u) \neq \text{Disallow}$；
3. **去重约束**：$|Q| \leq |Q_{\text{unique}}|$，URL 指纹唯一；
4. **资源约束**：$\sum_{i} \text{mem}(d_i) \leq M_{\max}$。

### 3.2 Frontier 调度策略

URL Frontier 的目标是在有限内存与带宽下，选择"最有价值"的 URL 优先抓取。常见策略：

| 策略 | 形式化 | 适用场景 |
| ---- | ---- | ---- |
| 广度优先 (BFS) | $F(u) = \text{depth}(u)$ | 全站抓取 |
| 深度优先 (DFS) | $F(u) = -\text{depth}(u)$ | 深度链接挖掘 |
| 优先级 | $F(u) = \text{PageRank}(u) + \alpha \cdot \text{freshness}(u)$ | 搜索引擎 |
| 礼貌策略 | $\Delta t(u, t) = \max(\Delta t_{\min}, \frac{1}{\text{QPS}_{\max}(u)})$ | 通用爬虫 |

### 3.3 URL 指纹与去重

URL 标准化为 $\text{canonical}(u) = \text{scheme} + \text{netloc} + \text{path} + \text{sorted(query)}$。

指纹函数 $h(u) = \text{xxHash64}(\text{canonical}(u))$，去重集合为 $\text{Seen} = \{h(u) : u \in Q_{\text{visited}}\}$。

Bloom Filter 误判率：

$$P_{\text{false}} = \left(1 - e^{-kn/m}\right)^k$$

其中 $k$ 为哈希函数数，$n$ 为元素数，$m$ 为位数组大小。当 $k = (m/n) \ln 2$ 时误判率最低。

### 3.4 礼貌爬取数学模型

爬虫的礼貌度量化为：$\text{politeness}(\text{site}) = \frac{1}{\text{QPS}(\text{site})} + \beta \cdot \text{backoff}(\text{error})$。

指数退避：$t_{\text{wait}} = t_0 \cdot 2^{\min(n, n_{\max})}$，其中 $n$ 为连续失败次数。

### 3.5 内容相似度去重

文章级去重使用 SimHash：

$$\text{SimHash}(s) = \bigoplus_{i=1}^{L} \left( \text{hash}(w_i) \cdot \text{sign}\left(\sum_{j} w_j \cdot \text{tf-idf}(w_j) \cdot \text{hash}(w_j)\right) \right)$$

其中 $w_i$ 为分词后的词，海明距离 $\leq 3$ 视为近似重复。

## 4. 理论推导

### 4.1 I/O 密集型任务的异步模型

爬虫典型场景：网络 IO 占 90%+，CPU 解析占 10%。在 CPython GIL 限制下：

- **同步阻塞**：$T = \sum_i t_{\text{io}, i} + t_{\text{parse}, i}$，串行执行；
- **多线程**：$T \approx \max_i t_{\text{io}, i} + \sum_i t_{\text{parse}, i}$，GIL 仅在 IO 时让出；
- **协程**：$T \approx \max_i t_{\text{io}, i} + \sum_i t_{\text{parse}, i}$，但无线程切换开销；
- **多进程**：$T \approx \frac{\max_i t_{\text{io}, i}}{N} + \frac{\sum_i t_{\text{parse}, i}}{N}$，但内存翻倍。

### 4.2 Scrapy 异步引擎

Scrapy 基于 Twisted 的 `Deferred` 与 `@inlineCallbacks`：

```python
"""
Scrapy 引擎简化模型：基于 asyncio 的核心循环。
"""
import asyncio
from typing import AsyncIterator


async def scrapy_engine_loop(spider, scheduler, downloader, pipeline):
    """Scrapy 3.x 引擎核心循环（基于 asyncio 简化版）。"""
    async for request in spider.start_requests():
        await scheduler.put(request)

    while not scheduler.empty():
        request = await scheduler.get()
        if should_skip(request):
            continue
        # 下载
        response = await downloader.fetch(request)
        # 解析
        async for item_or_request in spider.parse(response):
            if isinstance(item_or_request, dict):
                await pipeline.process(item_or_request)
            else:
                await scheduler.put(item_or_request)
```

### 4.3 Amdahl 定律在爬虫中的应用

加速比 $S(n) = \frac{1}{(1-p) + p/n}$。若 95% 时间在 IO 等待，则单机 $S(\infty) = 20$。

实际分布式爬虫扩展性受限于：调度器瓶颈、网络带宽、目标站点 QPS 限制。

### 4.4 Little 定律在队列中的应用

任务在系统中平均停留时间 $W = L / \lambda$，其中 $L$ 为队列长度，$\lambda$ 为吞吐量。

在 Scrapy-Redis 中，可通过 Redis 队列长度估算爬虫完成时间：

$$T_{\text{ETA}} = \frac{|Q_{\text{redis}}|}{\text{QPS}_{\text{avg}} \cdot N_{\text{workers}}}$$

### 4.5 网络吞吐量与礼貌约束

若目标站点 QPS 限制为 $Q_{\max}$，则单机最大并发：

$$N_{\max} = \min\left(\frac{Q_{\max}}{1/T_{\text{io}}}, \frac{M_{\text{budget}}}{M_{\text{per\_req}}}\right)$$

即受 IO 等待时间与内存预算双重约束。

## 5. Python 爬虫库全景

### 5.1 HTTP 客户端

| 库 | 同步/异步 | HTTP/2 | 维护方 | License |
| --- | --- | --- | --- | --- |
| `requests` | 同步 | 否 | Kenneth Reitz | Apache-2.0 |
| `httpx` | 同步+异步 | 是 | Encode | BSD-3-Clause |
| `aiohttp` | 异步 | 否 | aio-libs | MIT |
| `urllib3` | 同步 | 否 | Andrey Petrov | MIT |
| `urllib` | 同步 | 否 | CPython | PSF |
| `niquests` | 同步+异步 | 是 | Ousret | MIT |
| `httpcore` | 异步 | 是 | Encode | BSD-3-Clause |

### 5.2 HTML/XML 解析器

| 库 | 后端 | 速度（相对） | 维护方 | License |
| --- | --- | --- | --- | --- |
| `BeautifulSoup` | html.parser | 1x | Leonard Richardson | MIT |
| `BeautifulSoup` | lxml | 10x | Leonard Richardson | MIT |
| `lxml` | libxml2 | 10x | Stefan Behnel | BSD-3-Clause |
| `parsel` | lxml | 10x | Scrapy Project | BSD-3-Clause |
| `selectolax` | Lexbor | 30x | Alexander Shishkov | MIT |
| `pyquery` | lxml | 10x | Olivier Lauzanne | BSD |
| `selenium` | 浏览器 | 0.5x | Selenium HQ | Apache-2.0 |

### 5.3 爬虫框架

| 框架 | 异步引擎 | 设计哲学 | 维护方 | License |
| --- | --- | --- | --- | --- |
| `Scrapy` | Twisted / asyncio | 完整工程框架 | Scrapy Project | BSD-3-Clause |
| `PySpider` | Tornado | Web UI 驱动 | binux | Apache-2.0 |
| `Crawlee` | asyncio | 现代 TypeScript 移植 | Apify | Apache-2.0 |
| `Cola` | 多进程 | 分布式爬虫框架 | lionheart | MIT |
| `feapder` | 协程 | 中文社区工业级 | Boris Code | Apache-2.0 |

### 5.4 动态渲染工具

| 工具 | 引擎 | 异步 | 维护方 | License |
| --- | --- | --- | --- | --- |
| `Selenium` | 多浏览器 | 否 | Selenium HQ | Apache-2.0 |
| `Playwright` | 多浏览器 | 是 | Microsoft | Apache-2.0 |
| `Puppeteer` | Chrome | Node.js | Google | Apache-2.0 |
| `Splash` | WebKit | 是 | Scrapy Project | BSD-3-Clause |
| `Pyppeteer` | Chrome | 是 | miyakogi | MIT |

### 5.5 反爬对抗

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `fake-useragent` | UA 池 | Victor Dorneanu | MIT |
| `playwright-stealth` | 浏览器指纹伪装 | Mattwmaster58 | MIT |
| `undetected-chromedriver` | 反检测 Chrome | ultrafunkamsterdam | MIT |
| `captcha-solver` | 验证码识别 | 2captcha | MIT |
| `tldextract` | 域名解析 | John Kurkowski | BSD-3-Clause |

### 5.6 分布式与存储

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `scrapy-redis` | Redis 调度器 | Dark Ze | MIT |
| `scrapy-cluster` | Kafka + Redis | istresearch | MIT |
| `bloom-filter2` | 布隆过滤器 | Andrew Plesha | MIT |
| `datasketch` | HyperLogLog + MinHash | Ekki | MIT |
| `simhash` | SimHash 去重 | Leo | MIT |

## 6. 代码示例

### 6.1 requests：基础 HTTP 客户端

```python
"""
requests 基础示例：会话管理、重试、超时、代理。

设计原则:
1. 使用 Session 复用 TCP 连接，性能提升 2-3 倍
2. 通过 HTTPAdapter 配置重试与连接池
3. 所有请求显式设置超时，禁止裸 get
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session(
    total_retries: int = 3,
    backoff_factor: float = 0.5,
    pool_connections: int = 10,
    pool_maxsize: int = 100,
) -> requests.Session:
    """构建带重试与连接池的 requests Session。"""
    session = requests.Session()
    retry = Retry(
        total=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=['GET', 'POST', 'PUT', 'DELETE'],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=pool_connections,
        pool_maxsize=pool_maxsize,
    )
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; FANDEXBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    })
    return session


def fetch_with_session(url: str, proxies: dict | None = None) -> str:
    """使用 Session 抓取页面，支持代理与超时。"""
    session = build_session()
    try:
        resp = session.get(
            url,
            timeout=(5, 30),  # (连接超时, 读取超时)
            proxies=proxies,
            verify=True,
        )
        resp.raise_for_status()
        # 自动处理编码
        resp.encoding = resp.apparent_encoding or 'utf-8'
        return resp.text
    except requests.RequestException as exc:
        print(f'请求失败 {url}: {exc}')
        return ''
    finally:
        session.close()


if __name__ == '__main__':
    html = fetch_with_session('https://example.com')
    print(f'获取 {len(html)} 字节')
```

### 6.2 httpx：现代异步 HTTP 客户端

```python
"""
httpx 异步示例：并发抓取、HTTP/2、连接池。

特性:
1. 同时支持同步与异步 API
2. 原生支持 HTTP/2，多路复用降低延迟
3. AsyncClient 自动管理连接池
4. 与 requests API 完全兼容，迁移成本低
"""
import asyncio
import httpx
from typing import Iterable


async def fetch_one(client: httpx.AsyncClient, url: str) -> str:
    """抓取单个 URL。"""
    try:
        resp = await client.get(url, timeout=30.0)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPError as exc:
        print(f'请求失败 {url}: {exc}')
        return ''


async def fetch_many(urls: Iterable[str], concurrency: int = 10) -> dict[str, str]:
    """并发抓取多个 URL，限制并发数。"""
    results: dict[str, str] = {}
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded_fetch(client: httpx.AsyncClient, url: str) -> None:
        async with semaphore:
            results[url] = await fetch_one(client, url)

    async with httpx.AsyncClient(
        http2=True,  # 启用 HTTP/2
        follow_redirects=True,
        timeout=httpx.Timeout(30.0, connect=5.0),
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        headers={'User-Agent': 'FANDEXBot/1.0 (+https://fandex.example/bot)'},
    ) as client:
        await asyncio.gather(*[bounded_fetch(client, url) for url in urls])
    return results


if __name__ == '__main__':
    urls = [
        'https://example.com',
        'https://httpbin.org/get',
        'https://httpbin.org/ip',
    ]
    data = asyncio.run(fetch_many(urls, concurrency=3))
    for url, body in data.items():
        print(f'{url}: {len(body)} bytes')
```

### 6.3 aiohttp：纯异步 HTTP

```python
"""
aiohttp 异步爬虫：与 httpx 类似但更轻量，性能略高。

适用场景:
1. 高并发纯异步爬虫（>500 并发）
2. 与原生 asyncio 配合，无需 HTTP/2
3. 内存占用比 httpx 更低
"""
import asyncio
import aiohttp


async def crawl(urls: list[str], max_concurrency: int = 100) -> list[str]:
    """使用 aiohttp 并发抓取。"""
    semaphore = asyncio.Semaphore(max_concurrency)
    connector = aiohttp.TCPConnector(
        limit=max_concurrency,
        limit_per_host=10,  # 每站点最多 10 并发，礼貌策略
        ttl_dns_cache=300,
        use_dns_cache=True,
    )
    timeout = aiohttp.ClientTimeout(total=30, connect=5)

    async def fetch(session: aiohttp.ClientSession, url: str) -> str:
        async with semaphore:
            try:
                async with session.get(url, timeout=timeout) as resp:
                    return await resp.text()
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                print(f'失败 {url}: {exc}')
                return ''

    async with aiohttp.ClientSession(
        connector=connector,
        headers={'User-Agent': 'FANDEXBot/1.0'},
    ) as session:
        return await asyncio.gather(*[fetch(session, url) for url in urls])


if __name__ == '__main__':
    urls = [f'https://example.com/page/{i}' for i in range(50)]
    results = asyncio.run(crawl(urls, max_concurrency=20))
    print(f'抓取 {sum(1 for r in results if r)} 个页面')
```

### 6.4 BeautifulSoup：HTML 解析

```python
"""
BeautifulSoup 解析示例：使用 lxml 后端提升 10 倍性能。

特性:
1. 容错性强，能处理畸形 HTML
2. 多后端：html.parser（内置）、lxml（快）、html5lib（最严格）
3. CSS 选择器与 find_all 双 API
"""
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def parse_quotes(html: str, base_url: str) -> list[dict]:
    """解析 quotes.toscrape.com 页面。"""
    soup = BeautifulSoup(html, 'lxml')  # lxml 比 html.parser 快 10 倍
    quotes: list[dict] = []
    for q in soup.select('div.quote'):
        text_tag = q.select_one('span.text')
        author_tag = q.select_one('small.author')
        tags = [t.get_text(strip=True) for t in q.select('a.tag')]
        if text_tag and author_tag:
            quotes.append({
                'text': text_tag.get_text(strip=True),
                'author': author_tag.get_text(strip=True),
                'tags': tags,
            })
    # 解析下一页
    next_link = soup.select_one('li.next > a')
    next_url = urljoin(base_url, next_link['href']) if next_link else None
    return quotes


def parse_table(html: str) -> list[dict]:
    """解析 HTML 表格为字典列表。"""
    soup = BeautifulSoup(html, 'lxml')
    table = soup.find('table')
    if not table:
        return []
    headers = [th.get_text(strip=True) for th in table.select('thead th')]
    rows: list[dict] = []
    for tr in table.select('tbody tr'):
        cells = [td.get_text(strip=True) for td in tr.find_all('td')]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))
    return rows
```

### 6.5 lxml + parsel：高性能解析

```python
"""
lxml 与 parsel 性能对比：lxml 直接 API，parsel 封装 CSS 选择器。

性能基准（相对 BeautifulSoup + html.parser）:
- BeautifulSoup + html.parser: 1x
- BeautifulSoup + lxml:        10x
- lxml.html 直接 API:           15x
- parsel (Scrapy 内核):         15x
- selectolax (Lexbor):         30x
"""
from lxml import html as lxml_html
from parsel import Selector


def parse_with_lxml(html_bytes: bytes) -> list[dict]:
    """使用 lxml 直接 API 解析。"""
    tree = lxml_html.fromstring(html_bytes)
    results = []
    for q in tree.cssselect('div.quote'):
        text_elem = q.cssselect('span.text')
        author_elem = q.cssselect('small.author')
        if text_elem and author_elem:
            results.append({
                'text': text_elem[0].text_content().strip(),
                'author': author_elem[0].text_content().strip(),
            })
    return results


def parse_with_parsel(html_text: str) -> list[dict]:
    """使用 parsel 解析（Scrapy 内置）。"""
    sel = Selector(text=html_text)
    results = []
    for q in sel.css('div.quote'):
        text = q.css('span.text::text').get()
        author = q.css('small.author::text').get()
        tags = q.css('a.tag::text').getall()
        if text and author:
            results.append({
                'text': text.strip(),
                'author': author.strip(),
                'tags': tags,
            })
    # 提取下一页链接
    next_url = sel.css('li.next > a::attr(href)').get()
    return results
```

### 6.6 Scrapy：工业级爬虫框架

```python
"""
Scrapy 完整项目示例：抓取 quotes.toscrape.com。

项目结构:
my_scraper/
├── scrapy.cfg
└── my_scraper/
    ├── __init__.py
    ├── items.py
    ├── middlewares.py
    ├── pipelines.py
    ├── settings.py
    └── spiders/
        ├── __init__.py
        └── quotes_spider.py
"""
# my_scraper/items.py
import scrapy


class QuoteItem(scrapy.Item):
    """名言数据模型。"""
    text = scrapy.Field()
    author = scrapy.Field()
    tags = scrapy.Field()
    url = scrapy.Field()
    crawled_at = scrapy.Field()


# my_scraper/spiders/quotes_spider.py
import scrapy
from datetime import datetime, timezone
from my_scraper.items import QuoteItem


class QuotesSpider(scrapy.Spider):
    """抓取 quotes.toscrape.com 全站名言。"""
    name = 'quotes'
    allowed_domains = ['quotes.toscrape.com']
    start_urls = ['https://quotes.toscrape.com/']
    custom_settings = {
        'DOWNLOAD_DELAY': 1.0,  # 礼貌延迟
        'CONCURRENT_REQUESTS_PER_DOMAIN': 4,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 2.0,
        'ROBOTSTXT_OBEY': True,
        'USER_AGENT': 'FANDEXBot/1.0 (+https://fandex.example/bot)',
    }

    def parse(self, response, **kwargs):
        """解析列表页，提取数据并跟随翻页。"""
        for quote in response.css('div.quote'):
            item = QuoteItem()
            item['text'] = quote.css('span.text::text').get().strip('\u201c\u201d')
            item['author'] = quote.css('small.author::text').get()
            item['tags'] = quote.css('a.tag::text').getall()
            item['url'] = response.url
            item['crawled_at'] = datetime.now(timezone.utc).isoformat()
            # 跟随作者详情页
            author_link = quote.css('span a::attr(href)').get()
            if author_link:
                request = response.follow(author_link, callback=self.parse_author)
                request.meta['item'] = item
                yield request
            else:
                yield item

        # 翻页
        next_page = response.css('li.next > a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_author(self, response):
        """解析作者详情页。"""
        item = response.meta['item']
        item['author_bio'] = response.css('div.author-description::text').get().strip()
        item['author_born'] = response.css(
            'span.author-born-date::text'
        ).get()
        item['author_born_location'] = response.css(
            'span.author-born-location::text'
        ).get()
        yield item


# my_scraper/pipelines.py
import hashlib
from itemadapter import ItemAdapter


class DuplicateFilterPipeline:
    """URL 指纹去重管道。"""

    def __init__(self) -> None:
        self.seen: set[str] = set()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        text = adapter.get('text', '')
        fingerprint = hashlib.md5(text.encode('utf-8')).hexdigest()
        if fingerprint in self.seen:
            spider.logger.info(f'重复项已过滤: {text[:30]}...')
            raise DropItem()
        self.seen.add(fingerprint)
        return item


class ValidationPipeline:
    """数据校验管道。"""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        text = adapter.get('text', '')
        if not text or len(text) < 10:
            raise DropItem(f'文本过短: {text}')
        return item


class JsonWriterPipeline:
    """JSON Lines 写入管道。"""

    def open_spider(self, spider):
        self.file = open('quotes.jsonl', 'w', encoding='utf-8')

    def close_spider(self, spider):
        self.file.close()

    def process_item(self, item, spider):
        import json
        line = json.dumps(dict(item), ensure_ascii=False) + '\n'
        self.file.write(line)
        return item


from scrapy.exceptions import DropItem  # noqa: E402
```

### 6.7 Scrapy 下载中间件：UA 轮换与代理

```python
"""
Scrapy 中间件示例：User-Agent 轮换与代理池。

settings.py 配置:
DOWNLOADER_MIDDLEWARES = {
    'my_scraper.middlewares.RandomUserAgentMiddleware': 400,
    'my_scraper.middlewares.ProxyMiddleware': 410,
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
}
"""
import random
import time
from typing import Any

import requests
from scrapy import signals
from scrapy.http import Request


USER_AGENTS = [
    # 桌面浏览器
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/126.0.0.0 Safari/537.36',
    # 移动设备
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]


class RandomUserAgentMiddleware:
    """随机 User-Agent 中间件。"""

    def __init__(self, user_agents: list[str]) -> None:
        self.user_agents = user_agents

    @classmethod
    def from_crawler(cls, crawler):
        return cls(user_agents=crawler.settings.getlist('USER_AGENT_LIST', USER_AGENTS))

    def process_request(self, request: Request, spider):
        request.headers['User-Agent'] = random.choice(self.user_agents)


class ProxyMiddleware:
    """代理池中间件，自动轮换与故障转移。"""

    def __init__(self, proxy_api: str, refresh_interval: int = 300) -> None:
        self.proxy_api = proxy_api
        self.refresh_interval = refresh_interval
        self.proxies: list[str] = []
        self.last_refresh: float = 0.0
        self.failed: set[str] = set()

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            proxy_api=crawler.settings.get('PROXY_API_URL', ''),
            refresh_interval=crawler.settings.getint('PROXY_REFRESH_INTERVAL', 300),
        )

    def _refresh_proxies(self) -> None:
        """从代理 API 拉取新代理列表。"""
        if not self.proxy_api:
            return
        try:
            resp = requests.get(self.proxy_api, timeout=10)
            self.proxies = [
                p for p in resp.text.strip().splitlines()
                if p and p not in self.failed
            ]
            self.last_refresh = time.time()
        except requests.RequestException as exc:
            # 失败时保留旧代理
            pass

    def _get_proxy(self) -> str | None:
        """轮询获取下一个可用代理。"""
        if not self.proxies or time.time() - self.last_refresh > self.refresh_interval:
            self._refresh_proxies()
        available = [p for p in self.proxies if p not in self.failed]
        if not available:
            return None
        return random.choice(available)

    def process_request(self, request: Request, spider):
        proxy = self._get_proxy()
        if proxy:
            request.meta['proxy'] = f'http://{proxy}'
            request.meta['proxy_str'] = proxy

    def process_exception(self, request, exception, spider):
        """异常时标记代理失败并重试。"""
        proxy = request.meta.get('proxy_str')
        if proxy:
            self.failed.add(proxy)
            spider.logger.warning(f'代理失败 {proxy}: {exception}')
        # 移除代理直接重试
        request.meta.pop('proxy', None)
        return request.copy()
```

### 6.8 Playwright：动态渲染爬取

```python
"""
Playwright Python 示例：抓取 JS 动态渲染页面。

适用场景:
1. 单页应用 (SPA) 抓取
2. 需要登录、点击、滚动的复杂交互
3. 反爬严格的站点（Cloudflare、reCAPTCHA）
4. 截图、PDF 生成

性能对比:
- requests + BS4:     1 个请求 ~0.3s
- httpx async:         1 个请求 ~0.3s，并发 100 个 ~1s
- Playwright headless: 1 个请求 ~2-5s，并发受浏览器进程限制
"""
from playwright.async_api import async_playwright, Browser, Page
import asyncio


async def scrape_spa(url: str) -> str:
    """抓取 SPA 页面的完整 HTML。"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
        )
        page = await context.new_page()
        await page.goto(url, wait_until='networkidle', timeout=30000)
        # 滚动到底部触发懒加载
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.wait_for_timeout(2000)
        html = await page.content()
        await browser.close()
        return html


async def scrape_with_login(login_url: str, target_url: str) -> str:
    """带登录的爬取：使用持久化存储。"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            storage_state='auth.json'  # 复用已保存的登录态
        )
        page = await context.new_page()
        await page.goto(target_url, wait_until='networkidle')
        content = await page.content()
        await browser.close()
        return content


async def scrape_with_stealth(url: str) -> str:
    """使用 playwright-stealth 反检测。"""
    from playwright_stealth import stealth_async

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        # 应用 stealth 隐藏自动化指纹
        await stealth_async(page)
        await page.goto(url, wait_until='domcontentloaded')
        # 模拟人类行为：随机鼠标移动
        await page.mouse.move(100, 200)
        await page.wait_for_timeout(500)
        await page.mouse.move(300, 400)
        html = await page.content()
        await browser.close()
        return html


async def concurrent_scrape(urls: list[str], max_concurrency: int = 5) -> list[str]:
    """并发抓取多个 URL，使用单浏览器多上下文。"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        semaphore = asyncio.Semaphore(max_concurrency)

        async def fetch_one(url: str) -> str:
            async with semaphore:
                context = await browser.new_context()
                page = await context.new_page()
                try:
                    await page.goto(url, wait_until='domcontentloaded', timeout=20000)
                    return await page.content()
                except Exception as exc:
                    print(f'失败 {url}: {exc}')
                    return ''
                finally:
                    await context.close()

        results = await asyncio.gather(*[fetch_one(url) for url in urls])
        await browser.close()
        return results


if __name__ == '__main__':
    html = asyncio.run(scrape_spa('https://quotes.toscrape.com/js/'))
    print(f'获取 {len(html)} 字节')
```

### 6.9 Selenium：传统动态渲染

```python
"""
Selenium 示例：兼容老项目，新项目优先选择 Playwright。

适用场景:
1. 与已有 Selenium 测试代码集成
2. 需要 Remote WebDriver（Sauce Labs、BrowserStack）
3. 老版本浏览器（IE、低版本 Chrome）
"""
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


def scrape_with_selenium(url: str) -> list[dict]:
    """使用 Selenium 抓取动态页面。"""
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    # 隐藏 webdriver 标识
    driver.execute_cdp_cmd(
        'Page.addScriptToEvaluateOnNewDocument',
        {'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'},
    )
    try:
        driver.get(url)
        # 显式等待关键元素加载
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'div.quote'))
        )
        results = []
        for q in driver.find_elements(By.CSS_SELECTOR, 'div.quote'):
            text = q.find_element(By.CSS_SELECTOR, 'span.text').text
            author = q.find_element(By.CSS_SELECTOR, 'small.author').text
            results.append({'text': text, 'author': author})
        return results
    finally:
        driver.quit()
```

### 6.10 aiohttp 异步爬虫框架

```python
"""
aiohttp 异步爬虫框架：完整的爬虫流程，包含调度、解析、存储。

特点:
1. 基于 asyncio，性能高
2. 单进程即可处理 1000+ 并发
3. 适合 IO 密集型场景
"""
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import AsyncIterator
from urllib.parse import urljoin

import aiohttp
from aiohttp import ClientSession
from bs4 import BeautifulSoup


class AsyncCrawler:
    """异步爬虫框架。"""

    def __init__(
        self,
        max_concurrency: int = 100,
        per_host_limit: int = 10,
        download_delay: float = 0.5,
    ) -> None:
        self.max_concurrency = max_concurrency
        self.per_host_limit = per_host_limit
        self.download_delay = download_delay
        self.seen: set[str] = set()
        self.logger = logging.getLogger(self.__class__.__name__)

    def _fingerprint(self, url: str) -> str:
        """URL 指纹去重。"""
        return hashlib.md5(url.encode('utf-8')).hexdigest()

    async def fetch(self, session: ClientSession, url: str) -> str:
        """抓取单个 URL。"""
        try:
            async with session.get(url) as resp:
                resp.raise_for_status()
                return await resp.text()
        except Exception as exc:
            self.logger.error(f'失败 {url}: {exc}')
            return ''

    async def parse(self, html: str, base_url: str) -> dict:
        """解析页面，返回数据与新 URL。"""
        soup = BeautifulSoup(html, 'lxml')
        title = soup.find('title')
        return {
            'url': base_url,
            'title': title.text.strip() if title else '',
            'crawled_at': datetime.now(timezone.utc).isoformat(),
        }

    async def crawl(self, start_urls: list[str], max_pages: int = 1000) -> list[dict]:
        """从起始 URL 开始爬取。"""
        results: list[dict] = []
        queue: asyncio.Queue = asyncio.Queue()
        for url in start_urls:
            await queue.put(url)

        connector = aiohttp.TCPConnector(
            limit=self.max_concurrency,
            limit_per_host=self.per_host_limit,
            ttl_dns_cache=300,
        )
        timeout = aiohttp.ClientTimeout(total=30, connect=5)

        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={'User-Agent': 'FANDEXBot/1.0'},
        ) as session:
            processed = 0
            while not queue.empty() and processed < max_pages:
                tasks: list[asyncio.Task] = []
                batch_size = min(self.max_concurrency, queue.qsize())
                for _ in range(batch_size):
                    url = await queue.get()
                    fp = self._fingerprint(url)
                    if fp in self.seen:
                        continue
                    self.seen.add(fp)
                    tasks.append(asyncio.create_task(self._process(session, url, queue)))

                batch_results = await asyncio.gather(*tasks)
                for r in batch_results:
                    if r:
                        results.append(r)
                        processed += 1
                        if processed >= max_pages:
                            break

                if self.download_delay:
                    await asyncio.sleep(self.download_delay)

        return results

    async def _process(
        self,
        session: ClientSession,
        url: str,
        queue: asyncio.Queue,
    ) -> dict | None:
        """处理单个 URL。"""
        html = await self.fetch(session, url)
        if not html:
            return None
        result = await self.parse(html, url)
        # 提取新链接
        soup = BeautifulSoup(html, 'lxml')
        for a in soup.find_all('a', href=True):
            new_url = urljoin(url, a['href'])
            if new_url.startswith('http') and self._fingerprint(new_url) not in self.seen:
                await queue.put(new_url)
        return result


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    crawler = AsyncCrawler(max_concurrency=20, per_host_limit=5, download_delay=1.0)
    results = asyncio.run(crawler.crawl(['https://example.com'], max_pages=10))
    print(f'抓取 {len(results)} 个页面')
    print(json.dumps(results[:3], ensure_ascii=False, indent=2))
```

### 6.11 Scrapy-Redis：分布式爬虫

```python
"""
Scrapy-Redis 分布式爬虫：Redis 作为共享调度器。

架构:
        +-----------------+
        |  Redis Scheduler |
        +---------+-------+
                  |
   +--------------+--------------+
   |              |              |
+--+--+        +--+--+        +--+--+
|Worker|       |Worker|       |Worker|
|  1  |        |  2  |        |  3  |
+--+--+        +--+--+        +--+--+
   |              |              |
   v              v              v
+----------+ +----------+ +----------+
|Pipeline  | |Pipeline  | |Pipeline  |
|Postgres  | |Postgres  | |Postgres  |
+----------+ +----------+ +----------+

安装: pip install scrapy-redis
"""
import scrapy
from scrapy_redis.spiders import RedisSpider
from scrapy_redis.utils import bytes_to_str


class DistributedQuotesSpider(RedisSpider):
    """基于 Redis 队列的分布式爬虫。"""
    name = 'distributed_quotes'
    redis_key = 'quotes:start_urls'  # Redis 队列键名

    custom_settings = {
        'SCHEDULER': 'scrapy_redis.scheduler.Scheduler',
        'DUPEFILTER_CLASS': 'scrapy_redis.dupefilter.RFPDupeFilter',
        'SCHEDULER_PERSIST': True,  # 断点续爬
        'SCHEDULER_FLUSH_ON_START': False,
        'REDIS_URL': 'redis://localhost:6379/0',
        'ITEM_PIPELINES': {
            'scrapy_redis.pipelines.RedisPipeline': 300,  # 持久化到 Redis
            'my_scraper.pipelines.JsonWriterPipeline': 400,
        },
        'DOWNLOAD_DELAY': 1.0,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 动态指定 domain
        self.allowed_domains = ['quotes.toscrape.com']

    def parse(self, response, **kwargs):
        for quote in response.css('div.quote'):
            yield {
                'text': quote.css('span.text::text').get(),
                'author': quote.css('small.author::text').get(),
                'tags': quote.css('a.tag::text').getall(),
                'url': response.url,
            }
        next_page = response.css('li.next > a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def make_request_from_data(self, data):
        """从 Redis 队列读取 URL 构造请求。"""
        url = bytes_to_str(data)
        return self.make_requests_from_url(url)


# 启动多个 worker:
# redis-cli lpush quotes:start_urls https://quotes.toscrape.com/
# scrapy crawl distributed_quotes  # 在多台机器上执行
```

### 6.12 数据存储：PostgreSQL + ClickHouse

```python
"""
爬虫数据存储：PostgreSQL 存原始数据，ClickHouse 存聚合分析。

设计原则:
1. PostgreSQL：强一致性、事务支持，存储原文与元数据
2. ClickHouse：列式存储，适合 OLAP 查询，存储清洗后的结构化数据
3. Elasticsearch：全文检索，支持中文分词
"""
import json
from datetime import datetime, timezone
from typing import Iterable

import psycopg2
from psycopg2.extras import execute_values
from clickhouse_driver import Client as ClickHouseClient


class PostgresStorage:
    """PostgreSQL 存储层。"""

    def __init__(self, dsn: str) -> None:
        self.conn = psycopg2.connect(dsn)
        self._init_schema()

    def _init_schema(self) -> None:
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id BIGSERIAL PRIMARY KEY,
                    url TEXT NOT NULL UNIQUE,
                    url_hash CHAR(32) NOT NULL,
                    title TEXT,
                    content TEXT,
                    author TEXT,
                    published_at TIMESTAMPTZ,
                    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    site TEXT NOT NULL,
                    metadata JSONB,
                    content_hash CHAR(32)
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_articles_url_hash
                ON articles(url_hash);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_articles_site_crawled
                ON articles(site, crawled_at DESC);
            """)
        self.conn.commit()

    def upsert(self, items: Iterable[dict]) -> int:
        """批量 upsert 文章。"""
        import hashlib
        rows = []
        for item in items:
            url = item['url']
            content = item.get('content', '')
            rows.append((
                url,
                hashlib.md5(url.encode()).hexdigest(),
                item.get('title'),
                content,
                item.get('author'),
                item.get('published_at'),
                datetime.now(timezone.utc),
                item.get('site'),
                json.dumps(item.get('metadata', {}), ensure_ascii=False),
                hashlib.md5(content.encode()).hexdigest(),
            ))
        with self.conn.cursor() as cur:
            execute_values(cur, """
                INSERT INTO articles
                    (url, url_hash, title, content, author, published_at,
                     crawled_at, site, metadata, content_hash)
                VALUES %s
                ON CONFLICT (url) DO UPDATE SET
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    crawled_at = EXCLUDED.crawled_at,
                    metadata = EXCLUDED.metadata
            """, rows)
        self.conn.commit()
        return len(rows)


class ClickHouseStorage:
    """ClickHouse 列式存储，用于聚合分析。"""

    def __init__(self, dsn: str) -> None:
        self.client = ClickHouseClient.from_url(dsn)
        self._init_schema()

    def _init_schema(self) -> None:
        self.client.execute("""
            CREATE TABLE IF NOT EXISTS article_stats (
                site String,
                url String,
                title String,
                content_length UInt32,
                crawled_at DateTime,
                published_at Nullable(DateTime),
                author String,
                tags Array(String)
            ) ENGINE = ReplacingMergeTree(crawled_at)
            ORDER BY (site, url)
            PARTITION BY toYYYYMM(crawled_at)
        """)

    def insert(self, items: list[dict]) -> None:
        rows = [
            (
                item.get('site', ''),
                item['url'],
                item.get('title', ''),
                len(item.get('content', '')),
                datetime.now(timezone.utc),
                item.get('published_at'),
                item.get('author', ''),
                item.get('tags', []),
            )
            for item in items
        ]
        self.client.execute(
            'INSERT INTO article_stats VALUES',
            rows,
        )

    def query_top_sites(self, days: int = 7) -> list[dict]:
        """查询最近 N 天 Top 站点。"""
        result = self.client.execute("""
            SELECT site, count() AS cnt, avg(content_length) AS avg_len
            FROM article_stats
            WHERE crawled_at > now() - INTERVAL %(days)s DAY
            GROUP BY site
            ORDER BY cnt DESC
            LIMIT 20
        """, {'days': days})
        return [{'site': r[0], 'count': r[1], 'avg_length': r[2]} for r in result]
```

### 6.13 robots.txt 合规检查

```python
"""
robots.txt 合规检查器：实现 RFC 9309。

RFC 9309 (2022) 关键点:
1. 仅支持 User-agent, Allow, Disallow, Crawl-delay 字段
2. 最具体规则优先：路径越长越优先
3. 大小写敏感：路径区分大小写
4. * 通配符：匹配任意字符序列
5. $ 锚定：匹配路径末尾
"""
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import requests


class RobotsChecker:
    """robots.txt 检查器。"""

    def __init__(self, user_agent: str = '*') -> None:
        self.user_agent = user_agent
        self._cache: dict[str, RobotFileParser] = {}

    def can_fetch(self, url: str) -> bool:
        """检查 URL 是否允许抓取。"""
        parsed = urlparse(url)
        base = f'{parsed.scheme}://{parsed.netloc}'
        if base not in self._cache:
            self._cache[base] = self._load_robots(base)
        return self._cache[base].can_fetch(self.user_agent, url)

    def crawl_delay(self, url: str) -> float | None:
        """获取建议的爬取间隔（秒）。"""
        parsed = urlparse(url)
        base = f'{parsed.scheme}://{parsed.netloc}'
        if base not in self._cache:
            self._cache[base] = self._load_robots(base)
        delay = self._cache[base].crawl_delay(self.user_agent)
        return float(delay) if delay else None

    def _load_robots(self, base_url: str) -> RobotFileParser:
        """加载并解析 robots.txt。"""
        rp = RobotFileParser()
        robots_url = f'{base_url}/robots.txt'
        try:
            resp = requests.get(
                robots_url,
                timeout=10,
                headers={'User-Agent': self.user_agent},
            )
            if resp.status_code == 200:
                rp.parse(resp.text.splitlines())
            else:
                # 404 或其他状态码：允许抓取
                rp.parse([])
        except requests.RequestException:
            # 网络错误：保守策略，禁止抓取
            rp.parse(['User-agent: *', 'Disallow: /'])
        return rp


if __name__ == '__main__':
    checker = RobotsChecker(user_agent='FANDEXBot')
    url = 'https://example.com/some/page'
    if checker.can_fetch(url):
        delay = checker.crawl_delay(url)
        print(f'允许抓取 {url}, 建议 delay={delay}s')
    else:
        print(f'robots.txt 禁止抓取 {url}')
```

### 6.14 Bloom Filter URL 去重

```python
"""
Bloom Filter URL 去重：内存占用仅为 HashSet 的 1/10。

误判率分析:
- 1 亿 URL，HashSet 需要 ~3GB
- Bloom Filter (10 亿 bit, k=7) 需要 ~125MB，误判率 < 1%
"""
import math
import mmh3  # MurmurHash3
from bitarray import bitarray


class BloomFilter:
    """可持久化的布隆过滤器。"""

    def __init__(
        self,
        capacity: int = 100_000_000,
        error_rate: float = 0.001,
    ) -> None:
        """初始化布隆过滤器。

        Args:
            capacity: 预期元素数量
            error_rate: 可接受的误判率
        """
        self.capacity = capacity
        self.error_rate = error_rate
        # 计算最优 m 与 k
        self.size = self._optimal_size(capacity, error_rate)
        self.hash_count = self._optimal_hash_count(self.size, capacity)
        self.bit_array = bitarray(self.size)
        self.bit_array.setall(False)

    @staticmethod
    def _optimal_size(n: int, p: float) -> int:
        """计算位数组大小 m = -(n * ln p) / (ln 2)^2。"""
        return int(-n * math.log(p) / (math.log(2) ** 2))

    @staticmethod
    def _optimal_hash_count(m: int, n: int) -> int:
        """计算最优哈希函数数 k = (m/n) * ln 2。"""
        return int((m / n) * math.log(2))

    def add(self, item: str) -> None:
        """添加元素。"""
        for i in range(self.hash_count):
            idx = mmh3.hash(item, i) % self.size
            self.bit_array[idx] = True

    def __contains__(self, item: str) -> bool:
        """检查元素是否存在（可能误判）。"""
        for i in range(self.hash_count):
            idx = mmh3.hash(item, i) % self.size
            if not self.bit_array[idx]:
                return False
        return True

    def save(self, path: str) -> None:
        """持久化到磁盘。"""
        with open(path, 'wb') as f:
            # 写入元数据
            f.write(self.capacity.to_bytes(8, 'big'))
            f.write(self.error_rate.hex().encode())
            # 写入位数组
            self.bit_array.tofile(f)

    @classmethod
    def load(cls, path: str) -> 'BloomFilter':
        """从磁盘加载。"""
        with open(path, 'rb') as f:
            capacity = int.from_bytes(f.read(8), 'big')
            error_rate = float.fromhex(f.read(16).decode())
            bf = cls(capacity, error_rate)
            bf.bit_array = bitarray()
            bf.bit_array.fromfile(f)
            return bf


if __name__ == '__main__':
    bf = BloomFilter(capacity=10_000_000, error_rate=0.001)
    urls = [f'https://example.com/page/{i}' for i in range(1000)]
    for u in urls:
        bf.add(u)
    # 测试
    assert 'https://example.com/page/0' in bf
    assert 'https://example.com/page/999' in bf
    assert 'https://example.com/page/99999' not in bf  # 可能误判
```

### 6.15 代理池管理

```python
"""
代理池管理：自动检测、轮换、淘汰失效代理。

设计:
1. 启动时从多个来源加载代理
2. 定期验证代理可用性
3. 按响应时间排序，优先使用快的代理
4. 失败次数超过阈值自动剔除
"""
import asyncio
import random
import time
from typing import Optional

import httpx


class ProxyPool:
    """代理池管理器。"""

    def __init__(
        self,
        sources: list[str],
        max_failures: int = 3,
        check_interval: int = 300,
    ) -> None:
        self.sources = sources
        self.max_failures = max_failures
        self.check_interval = check_interval
        self.proxies: dict[str, dict] = {}  # proxy -> {failures, last_check, latency}
        self.lock = asyncio.Lock()

    async def initialize(self) -> None:
        """初始化代理池。"""
        tasks = [self._fetch_from_source(src) for src in self.sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                for proxy in r:
                    self.proxies[proxy] = {
                        'failures': 0,
                        'last_check': 0,
                        'latency': None,
                    }

    async def _fetch_from_source(self, source: str) -> list[str]:
        """从代理源拉取代理列表。"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(source)
                if resp.status_code == 200:
                    return [
                        line.strip()
                        for line in resp.text.splitlines()
                        if line.strip() and ':' in line
                    ]
        except Exception:
            return []
        return []

    async def get_proxy(self) -> Optional[str]:
        """获取最优代理。"""
        async with self.lock:
            available = [
                (p, info)
                for p, info in self.proxies.items()
                if info['failures'] < self.max_failures
            ]
            if not available:
                return None
            # 按 latency 排序，加入随机性避免羊群效应
            available.sort(key=lambda x: x[1]['latency'] or 9999)
            # 在前 10 名中随机选
            top = available[:min(10, len(available))]
            return random.choice(top)[0]

    async def mark_success(self, proxy: str, latency: float) -> None:
        """标记代理成功。"""
        async with self.lock:
            if proxy in self.proxies:
                self.proxies[proxy]['failures'] = 0
                self.proxies[proxy]['latency'] = latency
                self.proxies[proxy]['last_check'] = time.time()

    async def mark_failure(self, proxy: str) -> None:
        """标记代理失败。"""
        async with self.lock:
            if proxy in self.proxies:
                self.proxies[proxy]['failures'] += 1
                if self.proxies[proxy]['failures'] >= self.max_failures:
                    del self.proxies[proxy]

    async def health_check(self) -> None:
        """定期健康检查。"""
        while True:
            await asyncio.sleep(self.check_interval)
            tasks = [
                self._check_proxy(p)
                for p in list(self.proxies.keys())
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_proxy(self, proxy: str) -> None:
        """检查单个代理可用性。"""
        start = time.time()
        try:
            async with httpx.AsyncClient(
                proxy=f'http://{proxy}',
                timeout=10,
            ) as client:
                resp = await client.get('https://httpbin.org/ip')
                if resp.status_code == 200:
                    await self.mark_success(proxy, time.time() - start)
                else:
                    await self.mark_failure(proxy)
        except Exception:
            await self.mark_failure(proxy)


if __name__ == '__main__':
    pool = ProxyPool(
        sources=[
            'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list.txt',
        ],
    )
    asyncio.run(pool.initialize())
    print(f'加载 {len(pool.proxies)} 个代理')
```

### 6.16 监控与告警

```python
"""
爬虫监控：Prometheus 指标 + Grafana 告警 + Sentry 异常追踪。

监控指标:
1. scrapy_requests_total: 请求总数
2. scrapy_response_status: 各 HTTP 状态码计数
3. scrapy_duration_seconds: 请求耗时直方图
4. scrapy_items_scraped: 抓取数据量
5. scrapy_errors_total: 错误总数
6. scrapy_queue_size: 调度队列长度
"""
import time
from typing import Any

from prometheus_client import Counter, Histogram, Gauge, start_http_server
from sentry_sdk import capture_exception


# Prometheus 指标定义
REQUESTS_TOTAL = Counter(
    'scrapy_requests_total',
    'Total HTTP requests made',
    ['spider', 'domain', 'status'],
)
REQUEST_DURATION = Histogram(
    'scrapy_duration_seconds',
    'Request duration in seconds',
    ['spider', 'domain'],
    buckets=(0.1, 0.5, 1, 2, 5, 10, 30, 60, 120),
)
ITEMS_SCRAPED = Counter(
    'scrapy_items_scraped_total',
    'Total items scraped',
    ['spider', 'item_type'],
)
ERRORS_TOTAL = Counter(
    'scrapy_errors_total',
    'Total errors',
    ['spider', 'error_type'],
)
QUEUE_SIZE = Gauge(
    'scrapy_queue_size',
    'Current scheduler queue size',
    ['spider'],
)


class MonitoringMiddleware:
    """Scrapy 监控中间件。"""

    def __init__(self, spider_name: str = 'default') -> None:
        self.spider_name = spider_name

    @classmethod
    def from_crawler(cls, crawler):
        return cls(spider_name=crawler.settings.get('BOT_NAME', 'default'))

    def process_request(self, request, spider):
        request.meta['start_time'] = time.time()

    def process_response(self, request, response, spider):
        duration = time.time() - request.meta.get('start_time', time.time())
        domain = request.url.split('/')[2] if '://' in request.url else 'unknown'
        REQUESTS_TOTAL.labels(
            spider=self.spider_name,
            domain=domain,
            status=str(response.status),
        ).inc()
        REQUEST_DURATION.labels(
            spider=self.spider_name,
            domain=domain,
        ).observe(duration)
        return response

    def process_exception(self, request, exception, spider):
        ERRORS_TOTAL.labels(
            spider=self.spider_name,
            error_type=type(exception).__name__,
        ).inc()
        capture_exception(exception)
        return None


class AlertManager:
    """告警管理器。"""

    def __init__(self, slack_webhook: str | None = None) -> None:
        self.slack_webhook = slack_webhook

    def alert_high_error_rate(self, spider: str, error_rate: float) -> None:
        """错误率过高告警。"""
        if error_rate > 0.05:  # > 5%
            message = (
                f'[ALERT] Spider {spider} error rate {error_rate:.2%} > 5%'
            )
            self._send_slack(message)

    def alert_queue_stuck(self, spider: str, queue_size: int, threshold: int = 0) -> None:
        """队列停滞告警。"""
        if queue_size <= threshold:
            self._send_slack(
                f'[ALERT] Spider {spider} queue empty for too long'
            )

    def _send_slack(self, message: str) -> None:
        """发送 Slack 通知。"""
        if not self.slack_webhook:
            print(message)
            return
        try:
            import requests
            requests.post(
                self.slack_webhook,
                json={'text': message},
                timeout=10,
            )
        except Exception:
            pass


# 在 settings.py 中启用:
# start_http_server(8000)  # Prometheus metrics 端口
# EXTENSIONS = {
#     'my_scraper.extensions.MonitoringExtension': 500,
# }
```

### 6.17 单元测试与 Mock

```python
"""
爬虫单元测试：使用 responses 库 Mock HTTP，使用 vcrpy 录制回放。

测试策略:
1. 单元测试：Mock HTTP，验证解析逻辑
2. 集成测试：vcrpy 录制真实响应回放
3. 端到端测试：在测试环境真实抓取
"""
import json
import os
import unittest
from unittest.mock import MagicMock, patch

import responses
from bs4 import BeautifulSoup
from my_scraper.spiders.quotes_spider import QuotesSpider
from my_scraper.pipelines import DuplicateFilterPipeline, ValidationPipeline
from scrapy.exceptions import DropItem
from scrapy.http import HtmlResponse, Request


class TestQuotesSpider(unittest.TestCase):
    """QuotesSpider 测试用例。"""

    def setUp(self) -> None:
        self.spider = QuotesSpider()
        self.html = '''
        <html>
          <div class="quote">
            <span class="text">"Test quote"</span>
            <small class="author">Test Author</small>
            <a class="tag">test</a>
          </div>
          <li class="next"><a href="/page/2/">Next</a></li>
        </html>
        '''

    def test_parse_extracts_quotes(self):
        """测试解析提取数据。"""
        request = Request(url='https://quotes.toscrape.com/')
        response = HtmlResponse(
            url='https://quotes.toscrape.com/',
            body=self.html.encode(),
            encoding='utf-8',
            request=request,
        )
        results = list(self.spider.parse(response))
        # 第一个结果应该是 QuoteItem
        item = results[0]
        self.assertEqual(item['author'], 'Test Author')
        self.assertIn('Test quote', item['text'])
        self.assertEqual(item['tags'], ['test'])

    def test_parse_follows_next_page(self):
        """测试翻页链接。"""
        request = Request(url='https://quotes.toscrape.com/page/1/')
        response = HtmlResponse(
            url='https://quotes.toscrape.com/page/1/',
            body=self.html.encode(),
            encoding='utf-8',
            request=request,
        )
        requests = [r for r in self.spider.parse(response) if isinstance(r, Request)]
        self.assertEqual(len(requests), 1)
        self.assertEqual(
            requests[0].url,
            'https://quotes.toscrape.com/page/2/',
        )


class TestPipelines(unittest.TestCase):
    """Pipeline 测试。"""

    def test_duplicate_filter(self):
        """测试去重管道。"""
        pipeline = DuplicateFilterPipeline()
        item = {'text': 'duplicate test'}
        # 第一次通过
        result = pipeline.process_item(item, spider=MagicMock())
        self.assertEqual(result, item)
        # 第二次被过滤
        with self.assertRaises(DropItem):
            pipeline.process_item(item, spider=MagicMock())

    def test_validation_pipeline_rejects_short(self):
        """测试校验管道拒绝过短内容。"""
        pipeline = ValidationPipeline()
        with self.assertRaises(DropItem):
            pipeline.process_item({'text': 'short'}, spider=MagicMock())


class TestWithResponses(unittest.TestCase):
    """使用 responses 库 Mock HTTP。"""

    @responses.activate
    def test_fetch_with_mock(self):
        """Mock HTTP 响应。"""
        responses.add(
            responses.GET,
            'https://example.com/test',
            body='<html><body>Hello</body></html>',
            status=200,
        )
        import requests
        resp = requests.get('https://example.com/test')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Hello', resp.text)


if __name__ == '__main__':
    unittest.main()
```

## 7. 对比分析：Python vs 其他语言

### 7.1 爬虫生态对比

| 维度 | Python | JavaScript (Node.js) | Go | Java | Ruby |
| --- | --- | --- | --- | --- | --- |
| 主流框架 | Scrapy | Puppeteer / Playwright | Colly | Jsoup + crawler4j | Nokogiri |
| HTTP 客户端 | requests/httpx | axios/fetch | net/http | OkHttp | net/http |
| HTML 解析 | BS4/lxml | cheerio | goquery | Jsoup | Nokogiri |
| 异步模型 | asyncio | 原生事件循环 | goroutine | CompletableFuture | EventMachine |
| 性能 | 中（GIL 限制） | 高（V8） | 极高 | 中 | 低 |
| 生态丰富度 | 极高 | 高 | 中 | 中 | 低 |
| 学习曲线 | 低 | 中 | 中 | 高 | 低 |
| 开发效率 | 极高 | 高 | 中 | 中 | 高 |

### 7.2 Python vs JavaScript (Node.js)

```python
# Python httpx 异步爬虫
import asyncio
import httpx

async def crawl():
    async with httpx.AsyncClient() as client:
        resp = await client.get('https://example.com')
        return resp.text

# JavaScript 等价实现
"""
const axios = require('axios');
async function crawl() {
    const resp = await axios.get('https://example.com');
    return resp.data;
}
"""
```

**对比分析：**
- Python 优势：丰富的数据处理库（pandas、numpy）、机器学习集成（scikit-learn）、AI 爬虫
- JavaScript 优势：原生异步、与浏览器同语言、前端工程师友好
- 共同点：都有 Playwright、Puppeteer 等浏览器自动化工具

### 7.3 Python vs Go

```go
// Go 实现高并发爬虫
package main

import (
    "fmt"
    "net/http"
    "sync"
)

func crawl(url string, wg *sync.WaitGroup) {
    defer wg.Done()
    resp, err := http.Get(url)
    if err != nil {
        return
    }
    defer resp.Body.Close()
    fmt.Printf("%s: %d\n", url, resp.StatusCode)
}

func main() {
    urls := []string{"https://example.com", "https://httpbin.org/get"}
    var wg sync.WaitGroup
    for _, url := range urls {
        wg.Add(1)
        go crawl(url, &wg)
    }
    wg.Wait()
}
```

**对比分析：**
- Python 优势：开发效率高、生态丰富、易学
- Go 优势：goroutine 极轻量、单机可处理 100K+ 并发、内存占用低
- Python 在 GIL 限制下，单机 1K 并发已是上限，需要多进程扩展

### 7.4 Python vs Julia

```julia
# Julia 实现爬虫（使用 HTTP.jl）
using HTTP, Gumbo, Cascadia

function crawl(url)
    resp = HTTP.get(url)
    html = parsehtml(String(resp.body))
    titles = eachmatch(Selector("h2"), html.root)
    return [nodeText(t) for t in titles]
end
```

**对比分析：**
- Julia 优势：科学计算性能接近 C，适合数据科学爬虫
- Python 优势：生态成熟、社区庞大、爬虫框架齐全
- Julia 劣势：爬虫生态薄弱，缺乏 Scrapy 等成熟框架

## 8. 常见陷阱与修复

### 8.1 默认 User-Agent 被识别为爬虫

**问题**：requests 默认 UA 为 `python-requests/2.x.x`，被多数反爬识别。

```python
# 错误
import requests
resp = requests.get('https://example.com')  # UA: python-requests/2.31.0

# 修复
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
}
resp = requests.get('https://example.com', headers=HEADERS)
```

### 8.2 忘记设置超时导致无限等待

```python
# 错误：无限等待
resp = requests.get('https://slow-site.com')

# 修复：显式超时
resp = requests.get('https://slow-site.com', timeout=(5, 30))  # (connect, read)
```

### 8.3 未使用 Session 导致性能差

```python
# 错误：每次请求新建 TCP 连接
for url in urls:
    requests.get(url)  # 每次 3-way handshake

# 修复：复用 Session
with requests.Session() as s:
    s.headers.update({'User-Agent': 'FANDEXBot/1.0'})
    for url in urls:
        s.get(url)  # 复用 keep-alive 连接
```

### 8.4 解析器选择错误导致性能差

```python
# 慢：内置 html.parser
soup = BeautifulSoup(html, 'html.parser')  # 1x

# 快：使用 lxml 后端
soup = BeautifulSoup(html, 'lxml')  # 10x

# 最快：selectolax（基于 Lexbor C 库）
from selectolax.parser import HTMLParser
tree = HTMLParser(html)  # 30x
```

### 8.5 相对路径未转换

```python
# 错误：相对路径无法访问
next_url = soup.find('a')['href']  # 可能是 '/page/2/'
requests.get(next_url)  # 缺少 scheme://netloc

# 修复：使用 urljoin
from urllib.parse import urljoin
next_url = urljoin(base_url, soup.find('a')['href'])
```

### 8.6 编码处理错误导致乱码

```python
# 错误：强制 UTF-8
content = resp.text  # 可能乱码

# 修复：让 requests 自动检测
resp.encoding = resp.apparent_encoding
content = resp.text

# 或使用 content + chardet
import chardet
encoding = chardet.detect(resp.content)['encoding']
content = resp.content.decode(encoding or 'utf-8', errors='replace')
```

### 8.7 异步爬虫未限制并发

```python
# 错误：10000 个 URL 同时请求
tasks = [fetch(url) for url in urls]
await asyncio.gather(*tasks)  # 触发站点反爬

# 修复：信号量限流
semaphore = asyncio.Semaphore(100)
async def bounded_fetch(url):
    async with semaphore:
        return await fetch(url)
```

### 8.8 Playwright headless 被检测

```python
# 错误：默认 headless 模式易被检测
browser = await p.chromium.launch(headless=True)

# 修复：使用 stealth 模式
from playwright_stealth import stealth_async
browser = await p.chromium.launch(
    headless=True,
    args=['--disable-blink-features=AutomationControlled'],
)
context = await browser.new_context()
page = await context.new_page()
await stealth_async(page)
```

### 8.9 未遵守 robots.txt

```python
# 错误：忽略 robots.txt
resp = requests.get('https://example.com/private')

# 修复：检查 robots.txt
from urllib.robotparser import RobotFileParser
rp = RobotFileParser()
rp.set_url('https://example.com/robots.txt')
rp.read()
if rp.can_fetch('*', 'https://example.com/private'):
    resp = requests.get('https://example.com/private')
```

### 8.10 内存泄漏：未关闭资源

```python
# 错误：未关闭 Session / Browser
def crawl():
    resp = requests.get(url)
    return resp.text  # 连接未释放

# 修复：使用上下文管理器
def crawl():
    with requests.Session() as s:
        return s.get(url).text

# Playwright 同样
async def crawl():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page()
            return await page.content()
        finally:
            await browser.close()
```

### 8.11 分布式爬虫重复抓取

```python
# 错误：各 worker 各自去重，导致重复
class Spider:
    seen = set()  # 进程内，多机不共享

# 修复：使用 Redis 共享去重
import redis
r = redis.Redis()

class DistributedSpider:
    def is_seen(self, url):
        return not r.sadd('crawled:urls', url)  # 原子操作
```

### 8.12 SSL 证书验证失败

```python
# 错误：禁用证书验证（不安全）
resp = requests.get(url, verify=False)

# 修复：更新 CA 证书
import certifi
resp = requests.get(url, verify=certifi.where())

# 或针对自签名证书指定 CA
resp = requests.get(url, verify='/path/to/ca.pem')
```

## 9. 工程实践

### 9.1 项目结构

```
my_crawler/
├── scrapy.cfg
├── requirements.txt
├── pyproject.toml
├── README.md
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── my_crawler/
│   ├── __init__.py
│   ├── items.py
│   ├── middlewares.py
│   ├── pipelines.py
│   ├── settings.py
│   ├── extensions.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── url.py
│   │   ├── text.py
│   │   └── storage.py
│   └── spiders/
│       ├── __init__.py
│       ├── base.py           # 基类
│       ├── news_spider.py
│       └── ecommerce_spider.py
├── tests/
│   ├── __init__.py
│   ├── test_spiders.py
│   ├── test_pipelines.py
│   └── fixtures/
└── scripts/
    ├── run.sh
    └── deploy.sh
```

### 9.2 配置管理

```python
"""
使用 pydantic-settings 管理爬虫配置，支持环境变量与 .env 文件。
"""
from typing import Optional

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class CrawlerSettings(BaseSettings):
    """爬虫全局配置。"""
    model_config = SettingsConfigDict(
        env_file='.env',
        env_prefix='CRAWLER_',
        env_nested_delimiter='__',
    )

    # 数据库
    postgres_dsn: str = Field(
        default='postgresql://user:pass@localhost:5432/crawler',
        description='PostgreSQL DSN',
    )
    redis_url: str = Field(
        default='redis://localhost:6379/0',
        description='Redis URL',
    )

    # 爬虫
    user_agent: str = 'FANDEXBot/1.0 (+https://fandex.example/bot)'
    download_delay: float = Field(default=1.0, ge=0)
    concurrent_requests: int = Field(default=16, ge=1)
    concurrent_requests_per_domain: int = Field(default=4, ge=1)

    # 代理
    proxy_enabled: bool = False
    proxy_api_url: Optional[str] = None

    # 监控
    sentry_dsn: Optional[str] = None
    prometheus_port: int = 8000
    slack_webhook: Optional[SecretStr] = None

    # 合规
    obey_robots: bool = True
    max_depth: int = 3


settings = CrawlerSettings()
```

### 9.3 Docker 部署

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    libssl-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 应用代码
COPY . .

# 运行
CMD ["scrapy", "crawl", "quotes"]
```

```yaml
# docker-compose.yml
version: '3.9'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crawler
      POSTGRES_USER: crawler
      POSTGRES_PASSWORD: secret
    ports:
      - '5432:5432'
    volumes:
      - pg-data:/var/lib/postgresql/data

  worker:
    build: .
    depends_on:
      - redis
      - postgres
    environment:
      CRAWLER_REDIS_URL: redis://redis:6379/0
      CRAWLER_POSTGRES_DSN: postgresql://crawler:secret@postgres:5432/crawler
    deploy:
      replicas: 4  # 4 个 worker 实例
    restart: unless-stopped

  scheduler:
    build: .
    command: python scripts/feed_urls.py
    depends_on:
      - redis
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin

volumes:
  redis-data:
  pg-data:
```

### 9.4 Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crawler-worker
  labels:
    app: crawler
    component: worker
spec:
  replicas: 8
  selector:
    matchLabels:
      app: crawler
      component: worker
  template:
    metadata:
      labels:
        app: crawler
        component: worker
    spec:
      containers:
      - name: worker
        image: my-registry/crawler:1.0.0
        resources:
          requests:
            memory: '512Mi'
            cpu: '500m'
          limits:
            memory: '2Gi'
            cpu: '2'
        env:
        - name: CRAWLER_REDIS_URL
          value: 'redis://redis-service:6379/0'
        - name: CRAWLER_POSTGRES_DSN
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: dsn
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crawler-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crawler-worker
  minReplicas: 4
  maxReplicas: 32
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

### 9.5 日志与追踪

```python
"""
结构化日志与分布式追踪。
"""
import json
import logging
import sys
from datetime import datetime, timezone

import structlog


def configure_logging(level: str = 'INFO') -> None:
    """配置结构化日志。"""
    logging.basicConfig(
        format='%(message)s',
        stream=sys.stdout,
        level=getattr(logging, level.upper()),
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt='iso'),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(ensure_ascii=False),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper())
        ),
        cache_logger_on_first_use=True,
    )


# 使用示例
logger = structlog.get_logger()


def crawl(url: str) -> dict:
    """带结构化日志的爬取。"""
    logger.info('crawl.start', url=url)
    try:
        # ... 抓取逻辑 ...
        logger.info('crawl.success', url=url, status=200, items=10)
        return {'url': url, 'status': 200}
    except Exception as exc:
        logger.error('crawl.failed', url=url, error=str(exc))
        raise
```

### 9.6 性能调优

```python
"""
爬虫性能调优技巧。

1. 使用连接池复用 TCP 连接
2. 启用 HTTP/2 多路复用
3. DNS 缓存
4. 压缩传输 (gzip/brotli)
5. 异步并发
6. 解析器选择
7. 内存优化：流式处理大响应
"""
import asyncio
import httpx
import aiohttp
from aiohttp.resolver import AsyncResolver


# 1. HTTP/2 多路复用
async def http2_client():
    async with httpx.AsyncClient(http2=True) as client:
        urls = [f'https://httpbin.org/get?i={i}' for i in range(100)]
        # HTTP/2 单连接多路复用，比 HTTP/1.1 快 2-3 倍
        return await asyncio.gather(*[client.get(u) for u in urls])


# 2. DNS 缓存
async def dns_cached():
    resolver = AsyncResolver(nameservers=['8.8.8.8', '1.1.1.1'])
    connector = aiohttp.TCPConnector(
        limit=100,
        limit_per_host=10,
        use_dns_cache=True,
        ttl_dns_cache=300,
        resolver=resolver,
    )
    async with aiohttp.ClientSession(connector=connector) as session:
        # 后续请求复用 DNS 缓存
        pass


# 3. 压缩
HEADERS = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,*/*',
}


# 4. 内存优化：流式读取大响应
async def stream_download(url: str, path: str) -> None:
    """流式下载大文件，避免内存爆炸。"""
    async with httpx.AsyncClient() as client:
        async with client.stream('GET', url) as resp:
            with open(path, 'wb') as f:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    f.write(chunk)


# 5. 性能基准
"""
性能基准（同 4 核 8GB 机器，1000 个 URL）:

方案                         耗时      内存     备注
requests 同步循环            300s     200MB   串行
requests + ThreadPoolExecutor 30s     500MB   100 线程
httpx sync + connection pool  60s     300MB   串行但连接复用
httpx async                   8s      400MB   单进程 asyncio
aiohttp                       6s      350MB   单进程 asyncio
Scrapy (Twisted)              12s     500MB   含解析
Scrapy (asyncio, 3.0+)        10s     450MB   原生 asyncio
Go (goroutine)                3s      100MB   10K goroutine
"""
```

## 10. 案例研究

### 10.1 Googlebot：搜索引擎爬虫

**架构**：
- 分布式爬虫集群，覆盖万亿级 URL；
- URL 优先级基于 PageRank 与新鲜度；
- 礼貌策略：每站点 QPS 自适应；
- 增量爬取：基于 ETag/Last-Modified；
- 渲染：使用 Web Rendering Service（WRS）处理 JS。

**借鉴**：
- URL Frontier 优先级队列设计；
- 自适应礼貌策略；
- 增量爬取与 ETag 协商缓存。

### 10.2 Common Crawl：开源网页数据集

**架构**：
- AWS EC2 集群，每月抓取 30+ 亿页面；
- 存储 S3 + Parquet 格式；
- 数据公开免费，是 LLM 训练的重要数据源；
- GPT-3、LLaMA 等大模型均使用 Common Crawl 数据。

**借鉴**：
- 大规模分布式爬虫架构；
- 列式存储（Parquet）优化分析；
- 数据开放与 LLM 训练管道。

### 10.3 Scrapy Cloud (Zyte)

**架构**：
- 托管式 Scrapy 服务；
- 自动调度、部署、监控；
- 内置代理轮换与 CAPTCHA 解决；
- 提供 API 供下游消费。

**借鉴**：
- 爬虫即服务 (CaaS) 模式；
- 自动化运维与扩缩容；
- 反爬对抗即服务。

### 10.4 Apify：爬虫与数据采集平台

**架构**：
- 基于 Playwright/Puppeteer 的爬虫平台；
- Actor 模型：每个爬虫为独立微服务；
- 支持 Docker 自定义爬虫；
- 内置代理、存储、调度。

**借鉴**：
- 无服务器爬虫架构；
- Actor 模型实现爬虫隔离；
- 一站式数据采集平台。

### 10.5 Diffbot：AI 驱动的网页解析

**架构**：
- 使用计算机视觉识别页面结构；
- 自动抽取文章、产品、评论等结构化数据；
- 无需为每个站点编写规则；
- 适合长尾数据采集。

**借鉴**：
- AI 驱动的零配置解析；
- 自动化结构化数据提取；
- 通用爬虫与垂直爬虫结合。

### 10.6 12306 票务监控爬虫

**场景**：定时监控余票，余票出现立即通知。

**挑战**：
- 高强度反爬（IP 封禁、UA 检测、行为分析）；
- 实时性要求（秒级响应）；
- 数据准确性（避免误报）。

**架构**：
- 多机房 IP 轮换 + 4G 代理池；
- 滑块验证码识别（深度学习模型）；
- WebSocket 实时推送；
- Redis Stream 缓存最新车次。

**借鉴**：
- 反爬对抗工程化；
- 实时性优化（连接复用、缓存预热）；
- 多渠道通知（邮件、短信、微信）。

## 11. 习题

见 frontmatter 中的 `exercises` 字段，共 4 道，覆盖 Bloom 六个认知层次：

1. `ex-scraper-01`（remember）：Scrapy 引擎与 Twisted 框架；
2. `ex-scraper-02`（understand）：HTTP 客户端并发性能；
3. `ex-scraper-03`（apply）：修复爬虫代码缺陷；
4. `ex-scraper-04`（create）：设计分布式新闻聚合爬虫系统。

## 12. 延伸阅读

### 12.1 书籍

- Mitchell, R. (2018). *Web Scraping with Python* (2nd ed.). O'Reilly Media.
- Lawson, J. (2015). *Web Scraping with Python*. Packt Publishing.
- Broucke, S. (2020). *Python Web Scraping Cookbook*. Packt Publishing.
-子林, 林志强 (2021). 《Python3 网络爬虫开发实战》（第二版）. 人民邮电出版社.

### 12.2 论文

- Cho, J., & Garcia-Molina, H. (2002). *The Evolution of the Web and Implications for an Incremental Crawler*. VLDB.
- Heydon, A., Najork, M. (1999). *Mercator: A Scalable, Extensible Web Crawler*. World Wide Web.
- Olston, C., & Najork, M. (2010). *Web Crawling*. Foundations and Trends in Information Retrieval.

### 12.3 开源项目

- [Scrapy](https://github.com/scrapy/scrapy) - 工业级爬虫框架
- [Playwright](https://github.com/microsoft/playwright) - 浏览器自动化
- [Colly](https://github.com/gocolly/colly) - Go 爬虫框架
- [Crawlee](https://github.com/apify/crawlee-python) - Python 现代爬虫框架
- [feapder](https://github.com/Boris-code/feapder) - 中文爬虫框架
- [scrapy-redis](https://github.com/rmax/scrapy-redis) - 分布式爬虫
- [playwright-stealth](https://github.com/Mattwmaster58/pw-stealth) - Playwright 反检测

### 12.4 在线课程

- Scrapy Official Documentation: https://docs.scrapy.org/
- Playwright Python Docs: https://playwright.dev/python/
- Real Python Web Scraping Tutorial: https://realpython.com/beautiful-soup-web-scraper-python/
- MDN HTTP: https://developer.mozilla.org/en-US/docs/Web/HTTP

### 12.5 标准与规范

- RFC 9309: Robots Exclusion Protocol (2022)
- RFC 9110: HTTP Semantics (2022)
- RFC 9112: HTTP/1.1 (2022)
- RFC 9113: HTTP/2 (2022)
- RFC 9204: HPACK (2022)
- robots.txt 说明：https://www.rfc-editor.org/rfc/rfc9309

### 12.6 合规与伦理资源

- [Google Webmaster Guidelines](https://developers.google.com/search/docs/essentials)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [W3C Content Selection Working Group](https://www.w3.org/community/otsi/)
- [GDPR Compliance for Scraping](https://gdpr.eu/)
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa)

## 13. 总结

### 13.1 核心要点

1. **工具选型**：静态页面用 `requests/httpx + BeautifulSoup/lxml`，动态页面用 `Playwright`，大规模用 `Scrapy`，分布式用 `Scrapy-Redis`；
2. **性能优化**：HTTP/2 多路复用、连接池、DNS 缓存、异步并发、解析器选择；
3. **合规边界**：严格遵守 `robots.txt`、礼貌爬取、尊重版权、保护用户隐私；
4. **工程化**：配置管理、监控告警、容器化部署、断点续爬、容灾备份；
5. **反爬对抗**：UA 轮换、代理池、指纹伪装、行为模拟。

### 13.2 未来趋势

| 趋势 | 描述 | 影响 |
| ---- | ---- | ---- |
| LLM 驱动的爬虫 | GPT/Claude 自动解析零配置网页 | 减少规则编写工作量 |
| 浏览器引擎集成 | CDP 协议成为标准 | 替代 Selenium WebDriver |
| WASM 渲染 | Rust + WASM 实现高性能解析器 | 性能 5-10 倍提升 |
| Serverless 爬虫 | Lambda / Cloud Functions 部署 | 按需扩缩容，降低成本 |
| AI 爬虫协议 | GPTBot、CCBot、ClaudeBot | 新的 robots.txt 标准 |
| 后量子加密 | TLS 1.3 + ML-KEM | 影响所有 HTTPS 爬虫 |
| Web3 数据爬取 | 链上数据 + IPFS | 新的数据源与协议 |
| 边缘计算爬虫 | Cloudflare Workers / V8 Isolates | 就近抓取，降低延迟 |

### 13.3 扩展点

- **多模态爬虫**：图像、视频、音频抓取与处理；
- **实时爬虫**：WebSocket、SSE 协议爬取；
- **LLM 数据管道**：爬虫 → 清洗 → 标注 → 训练数据集；
- **暗网爬虫**：Tor 网络爬取，需特别注意法律合规；
- **IoT 数据采集**：MQTT、CoAP 协议爬取。

### 13.4 学习路径建议

1. **入门**：requests + BeautifulSoup 抓取简单静态页面；
2. **进阶**：httpx 异步 + lxml/parsel 高性能解析；
3. **框架**：Scrapy 完整工程化项目；
4. **动态**：Playwright 处理 JS 渲染页面；
5. **分布式**：Scrapy-Redis + Kafka 实现大规模爬取；
6. **反爬**：UA 池、代理池、指纹伪装综合实战；
7. **合规**：深入研究 RFC 9309、GDPR、CCPA 等法规；
8. **AI 集成**：LLM 自动解析、零样本爬虫、智能调度。

完成本章学习后，你应当能够独立设计、实现、部署一个生产级分布式爬虫系统，覆盖从单机脚本到多机房集群的全链路工程实践。
