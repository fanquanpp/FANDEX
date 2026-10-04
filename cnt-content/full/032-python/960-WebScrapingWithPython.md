---
order: 790
title: Web 爬虫：从第一个页面到规模抓取
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「抓取 quotes.toscrape.com 做语料分析」为场景，写出第一个带超时、重试与限速的合规爬虫：requests 会话、BeautifulSoup 解析、翻页循环与 CSV 落盘；讲清 HTTP 客户端与解析器选型、robots.txt 礼仪、动态页面的 Playwright 出场时机与 Scrapy 的规模临界点。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/320-HttpClient'
  - 'python/970-PythonProjectExampleWebCrawlerDataAnalysis'
  - 'python/980-PythonAutomationCookbook'
prerequisites:
  - 'python/320-HttpClient'
  - 'python/130-ExceptionHandling'
---

## 前置知识

- [http.client](/python/320-HttpClient)：知道一次 HTTP 请求由哪些部分组成（手动挡体验过更好）；
- [异常处理](/python/130-ExceptionHandling)：会写 try/except。

## 你现在要解决什么问题

你想给 NLP 实验攒语料，目标选定 `quotes.toscrape.com`——一个专门供练习的名言站点（数据公开、允许抓取，学习期用它不踩任何红线）。需求很朴素：把每一页的名言、作者、标签抓下来存成 CSV。浏览器里翻页复制显然不行，写个程序替你翻——这就是爬虫的全部起点，剩下的都是工程化。

```bash
pip install requests beautifulsoup4 lxml
```

## 先动手：五十行的完整爬虫

一次写全：请求头、超时、状态检查、解析、翻页、落盘。

```python
import csv
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://quotes.toscrape.com"
HEADERS = {"User-Agent": "my-first-spider/0.1 (learning; contact: me@example.com)"}

def parse_page(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows = []
    for q in soup.select("div.quote"):
        rows.append({
            "text": q.select_one("span.text").get_text(strip=True),
            "author": q.select_one("small.author").get_text(strip=True),
            "tags": ",".join(t.get_text(strip=True) for t in q.select("a.tag")),
        })
    return rows

def crawl() -> list[dict]:
    results, url = [], BASE
    while url:
        resp = requests.get(url, headers=HEADERS, timeout=(5, 15))
        resp.raise_for_status()
        results.extend(parse_page(resp.text))
        next_link = BeautifulSoup(resp.text, "lxml").select_one("li.next > a")
        url = f"{BASE}{next_link['href']}" if next_link else None
        time.sleep(1)                 # 限速：对服务器最基本的礼貌
    return results

rows = crawl()
with open("quotes.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["text", "author", "tags"])
    writer.writeheader()
    writer.writerows(rows)
print(f"共 {len(rows)} 条名言")
```

```text
共 100 条名言
```

逐个点出这段代码里「新手版本不会写、但少了必出事」的零件：

- **`timeout=(5, 15)`**：连接与读取各自限时。不设超时的爬虫最大的死法是卡死在某个慢响应上，整夜挂起；
- **`raise_for_status()`**：4xx/5xx 不抛异常（requests 默认把 HTTP 错误当正常返回），不检查的话你会把错误页的 HTML 当数据解析，得到一堆空字段还不自知；
- **`User-Agent` 带联系方式**：默认的 `python-requests/2.x` 是被反爬系统优先盯防的标识，而一个含联系方式的 UA 是站方区分「恶意流量」与「可沟通的爬虫」的依据；
- **`time.sleep(1)`**：每页间隔一秒。抓多快是能力问题，抓多快是态度问题，后面细说。

## 选型：HTTP 客户端与解析器

写大一点之前，工具选型想清楚。HTTP 客户端主流三家：

| 库 | 同步/异步 | HTTP/2 | 一句话定位 |
| --- | --- | --- | --- |
| requests | 同步 | 否 | 最经典，教程最多，同步抓取默认选 |
| httpx | 双支持 | 是 | API 与 requests 几乎一致，要异步/HTTP2 时平滑升级 |
| aiohttp | 异步 | 否 | 纯异步老牌，高并发时更轻 |

判断标准一条：**抓几十页用 requests；要并发几百上千个请求再上 httpx 的异步模式**（协程基础见 [asyncio](/python/660-CoroutineAsyncio)）。会话级优化（连接复用、自动重试）在 requests 里靠 `Session` + `HTTPAdapter(max_retries=...)` 挂载，对 429/5xx 做指数退避——抓上千页之前值得配好。

解析器两问：HTML 畸形吗？要快吗？BeautifulSoup 容错最好、API 最顺手，配 lxml 后端速度也够用（`BeautifulSoup(html, "lxml")`），是默认答案；页面非常规整、追求吞吐时选 lxml 的 XPath 直用（Scrapy 的 parsel 同源）。`select()` 用 CSS 选择器、`find_all()` 用属性过滤，两套 API 按顺手的用。

## 做个合格公民：合规与礼仪

爬虫的法律与道德边界，用四条 checklist 自查：

1. **robots.txt**：站点根目录下的 `https://目标/robots.txt` 声明了允许与禁止的路径。它没有强制力，但无视它=留下「恶意」证据；
2. **频率**：单站点并发保持个位数、请求间隔秒级。把对方小站打挂不仅缺德，DDoS 指控是真实的刑事风险；
3. **数据用途与隐私**：公开可访问不等于可任意使用——版权、服务条款、个人信息保护（姓名、头像、联系方式）都限制下游用途；涉及个人数据的抓取，合规要求另高一个量级；
4. **认证与付费墙**：绕过登录、破解接口加密、爬付费内容，从「灰色」直接跳到「违法」，不在本篇讨论范围。

工程上留一手：抓回来的原始 HTML 按站点+日期落盘缓存。好处是调试解析逻辑不用反复请求，对双方都友好。

## 动态页面：什么时候上浏览器

`requests` 拿到的 HTML 里没有数据、只有一段 `<script>` 启动器？说明页面靠 JavaScript 在浏览器里现场渲染，静态抓取拿不到。两条路按成本排序：

1. **先查接口**：打开浏览器开发者工具的 Network 面板，多数「动态页面」其实是页面调了一个返回 JSON 的 XHR 接口。直接请求那个接口，比渲染页面快一个数量级、稳两个数量级——这是最容易被忽略的一步；
2. **真需要执行 JS 时，用 Playwright**（Selenium 的现代继任者）：启动真实浏览器，等渲染完成再取 `page.content()`：

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com/dashboard", wait_until="networkidle")
    html = page.content()          # 渲染完成后的完整 HTML，交给 BeautifulSoup 解析
    browser.close()
```

代价是每页都要跑完整浏览器，慢且重。Playwright 也能拦截网络请求直接拿接口响应，多少能救回一些性能。

## 规模临界点：Scrapy 出场

单文件脚本到什么规模该换框架？经验线：**多站点、多级抽取、要断点续爬、要管道清洗入库**——这些 Scrapy 全部内置：Spider 声明「从哪进、怎么解析、往哪翻」，Item Pipeline 接清洗与存储，调度与去重自动处理，并发与限速是配置项。代价是框架心智与调试成本。作者的建议：第一个项目用本篇的 requests+BeautifulSoup 写完，第二个项目再上 Scrapy——先懂原理，框架才是助力而不是黑盒。

## 常见坑点

坑一：不设超时。已强调，再列一次因为它是线上爬虫事故第一名。所有请求一律带 `timeout`。

坑二：编码乱码。个别站点不声明编码，`resp.text` 猜错就是天书。修法：`resp.encoding = resp.apparent_encoding`（chardet 探测）后再取 text。

坑三：选择器太脆。`div.css-1q2w3e` 这类构建工具生成的随机 class 名，站点一改版就全挂。优先选语义稳定的属性：`data-*`、`id`、`itemprop`，退化到结构路径才用 class。

坑四：429 与封禁处理缺失。被限流时正确姿势是读 `Retry-After` 头、指数退避、必要时降并发；硬重试只会把自己送进黑名单。分布式的「换 IP 继续刚」是反爬对抗的末路，不是工程。

坑五：只抓不校验。落库前抽查：字段非空率、去重数、样本肉眼读一遍。解析选择器悄悄失效导致抓了三天空标签，是比报错更贵的静默失败。

## 自我检查

- 能默写带超时、UA、raise_for_status、限速四要素的单页抓取；
- 能说出 requests/httpx/aiohttp 的一句话选型与升级路径；
- 能复述合规四条 checklist；
- 遇到「requests 抓不到数据」能按「查 XHR 接口、再上 Playwright」的顺序排查；
- 知道什么规模信号该迁移到 Scrapy。

## 练习

1. 预测题：注释掉 `raise_for_status()` 后对一个 404 页面运行 `parse_page`，会抛异常还是产出垃圾数据？实测验证。
2. 修改题：给本篇爬虫加断点续爬——已抓过的 URL 记录在本地文件，重启后跳过；思考去重集合该放内存还是磁盘。
3. 实战题：用开发者工具找一个「动态渲染」网站的 XHR 数据接口（任意公开站点），直接 requests 请求它拿 JSON，对比渲染方案的成本。
4. 挑战题：给 crawl() 加全局限速令牌桶（每秒最多 N 个请求、跨线程安全），并用两个线程并发抓两个板块验证限速生效。

## 下一步

- 爬虫数据接上分析与报表的完整项目：[爬虫项目实战](/python/970-PythonProjectExampleWebCrawlerDataAnalysis)；
- HTTP 协议手动挡的底层细节回看：[http.client](/python/320-HttpClient)；
- 抓取任务的定时与调度：[自动化手册](/python/980-PythonAutomationCookbook)。
