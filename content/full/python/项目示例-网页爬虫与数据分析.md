---
order: 140
tags:
  - python
  - project
difficulty: intermediate
title: 'Python 项目示例：网页爬虫与数据分析'
module: python
category: 'Python Practice'
description: '综合运用 requests、BeautifulSoup 与 pandas 的爬虫项目。'
related:
  - python/异常处理
  - python/文件IO与上下文管理器
  - python/理论知识点
prerequisites:
  - python/语法速查
---

| HTML 解析  | 使用 BeautifulSoup 提取结构化数据        |
| ---------- | ---------------------------------------- |
| 反爬处理   | 请求头伪装、延时策略、重试机制           |
| 数据清洗   | 使用 pandas 处理缺失值、异常值、重复数据 |
| 数据分析   | 统计描述、分组聚合、相关性分析           |
| 数据可视化 | 使用 matplotlib 生成图表                 |
| 数据导出   | 导出为 CSV/Excel/JSON 格式               |

## 需求分析

### 数据需求

- 目标：抓取图书信息（书名、作者、价格、评分、分类）
- 数据量：约 1000 条记录
- 数据格式：结构化表格数据

### 功能需求

- 支持多页抓取，自动翻页
- 网络异常自动重试（最多 3 次）
- 增量抓取：已抓取的数据不重复抓取
- 数据清洗：处理缺失值、类型转换、去重
- 生成分析报告和可视化图表

### 非功能需求

- 遵守 robots.txt 协议
- 请求间隔不低于 1 秒
- 内存占用可控，大数据集使用分块处理

## 技术选型

| 技术点    | 选型          | 理由                               |
| --------- | ------------- | ---------------------------------- |
| HTTP 请求 | requests      | 最流行的 HTTP 库，API 简洁         |
| HTML 解析 | BeautifulSoup | 容错性强，支持多种解析器           |
| 数据处理  | pandas        | 高性能数据分析，DataFrame 操作直观 |
| 可视化    | matplotlib    | 基础绑图库，灵活度高               |
| 数据存储  | CSV/JSON      | 通用格式，便于交换                 |
| 异常处理  | tenacity      | 声明式重试库，支持指数退避         |

## 完整代码

### 项目配置与工具模块

```python
import requests
from bs4 import BeautifulSoup
import pandas as pd
import matplotlib.pyplot as plt
import json
import time
import random
import os
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BASE_URL = "https://books.toscrape.com"
OUTPUT_DIR = "output"
REQUEST_DELAY = (1, 3)
MAX_RETRIES = 3
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)
```

### HTTP 请求模块

```python
class HttpClient:
    def __init__(self, headers=None, max_retries=3, delay_range=(1, 3)):
        self.session = requests.Session()
        if headers:
            self.session.headers.update(headers)
        self.max_retries = max_retries
        self.delay_range = delay_range

    def get(self, url, **kwargs):
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"GET {url} (attempt {attempt})")
                response = self.session.get(url, timeout=10, **kwargs)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Request failed: {e}")
                if attempt == self.max_retries:
                    logger.error(f"Max retries reached for {url}")
                    raise
                wait = self.delay_range[0] + random.random() * (
                    self.delay_range[1] - self.delay_range[0]
                )
                logger.info(f"Waiting {wait:.1f}s before retry...")
                time.sleep(wait)

    def close(self):
        self.session.close()
```

### 数据抓取模块

```python
class BookScraper:
    def __init__(self, http_client):
        self.client = http_client
        self.books = []

    def parse_book_article(self, article):
        title = article.h3.a["title"]
        price_str = article.select_one(".price_color").text
        price = float(price_str.replace("\u00a3", "").replace(",", ""))
        rating_class = article.select_one(".star-rating")["class"]
        rating_map = {
            "One": 1, "Two": 2, "Three": 3,
            "Four": 4, "Five": 5
        }
        rating = rating_map.get(rating_class[-1], 0)
        availability = article.select_one(".availability").text.strip()
        in_stock = "In stock" in availability

        return {
            "title": title,
            "price": price,
            "rating": rating,
            "in_stock": in_stock,
        }

    def scrape_page(self, url):
        response = self.client.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        articles = soup.select("article.product_pod")

        page_books = []
        for article in articles:
            try:
                book = self.parse_book_article(article)
                page_books.append(book)
            except Exception as e:
                logger.warning(f"Failed to parse article: {e}")

        return page_books

    def scrape_category(self, category_url, max_pages=None):
        all_books = []
        page_url = category_url
        page_count = 0

        while page_url:
            page_count += 1
            if max_pages and page_count > max_pages:
                break

            books = self.scrape_page(page_url)
            all_books.extend(books)
            logger.info(f"Page {page_count}: scraped {len(books)} books")

            response = self.client.get(page_url)
            soup = BeautifulSoup(response.text, "html.parser")
            next_btn = soup.select_one("li.next a")
            if next_btn:
                next_href = next_btn["href"]
                if next_href.startswith("http"):
                    page_url = next_href
                else:
                    base = page_url.rsplit("/", 1)[0]
                    page_url = base + "/" + next_href
            else:
                page_url = None

            delay = REQUEST_DELAY[0] + random.random() * (
                REQUEST_DELAY[1] - REQUEST_DELAY[0]
            )
            time.sleep(delay)

        self.books.extend(all_books)
        logger.info(f"Total books scraped: {len(all_books)}")
        return all_books

    def scrape_all_categories(self):
        response = self.client.get(BASE_URL)
        soup = BeautifulSoup(response.text, "html.parser")
        category_links = soup.select(".side_categories ul li ul li a")

        categories = {}
        for link in category_links:
            name = link.text.strip()
            url = BASE_URL + "/" + link["href"]
            categories[name] = url

        logger.info(f"Found {len(categories)} categories")

        all_books = []
        for name, url in categories.items():
            logger.info(f"Scraping category: {name}")
            books = self.scrape_category(url)
            for book in books:
                book["category"] = name
            all_books.extend(books)

        self.books = all_books
        return all_books
```

### 数据清洗模块

```python
class DataCleaner:
    def __init__(self, df):
        self.df = df.copy()
        self.report = {}

    def check_data_quality(self):
        self.report["total_rows"] = len(self.df)
        self.report["missing_values"] = self.df.isnull().sum().to_dict()
        self.report["duplicates"] = self.df.duplicated().sum()
        self.report["dtypes"] = self.df.dtypes.astype(str).to_dict()
        logger.info(f"Data quality report: {json.dumps(self.report, indent=2)}")
        return self.report

    def remove_duplicates(self):
        before = len(self.df)
        self.df = self.df.drop_duplicates(subset=["title"], keep="first")
        after = len(self.df)
        logger.info(f"Removed {before - after} duplicate rows")
        return self

    def handle_missing_values(self):
        numeric_cols = self.df.select_dtypes(include=["number"]).columns
        for col in numeric_cols:
            missing = self.df[col].isnull().sum()
            if missing > 0:
                median = self.df[col].median()
                self.df[col].fillna(median, inplace=True)
                logger.info(f"Filled {missing} missing values in {col} with median {median}")

        text_cols = self.df.select_dtypes(include=["object"]).columns
        for col in text_cols:
            missing = self.df[col].isnull().sum()
            if missing > 0:
                self.df[col].fillna("Unknown", inplace=True)
                logger.info(f"Filled {missing} missing values in {col} with 'Unknown'")
        return self

    def remove_outliers(self, column, method="iqr", threshold=1.5):
        if method == "iqr":
            q1 = self.df[column].quantile(0.25)
            q3 = self.df[column].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - threshold * iqr
            upper = q3 + threshold * iqr
            before = len(self.df)
            self.df = self.df[
                (self.df[column] >= lower) & (self.df[column] <= upper)
            ]
            after = len(self.df)
            logger.info(f"Removed {before - after} outliers from {column} using IQR")
        return self

    def convert_types(self):
        self.df["price"] = pd.to_numeric(self.df["price"], errors="coerce")
        self.df["rating"] = pd.to_numeric(self.df["rating"], errors="coerce").astype("Int64")
        self.df["in_stock"] = self.df["in_stock"].astype(bool)
        self.df["category"] = self.df["category"].astype("category")
        return self

    def get_cleaned_data(self):
        return self.df
```

### 数据分析模块

```python
class DataAnalyzer:
    def __init__(self, df):
        self.df = df

    def basic_statistics(self):
        stats = self.df.describe()
        logger.info("Basic statistics:\n" + stats.to_string())
        return stats

    def price_by_category(self):
        result = self.df.groupby("category", observed=True)["price"].agg(
            ["mean", "median", "std", "min", "max", "count"]
        ).sort_values("mean", ascending=False)
        logger.info("Price by category:\n" + result.to_string())
        return result

    def rating_distribution(self):
        dist = self.df["rating"].value_counts().sort_index()
        logger.info("Rating distribution:\n" + dist.to_string())
        return dist

    def price_rating_correlation(self):
        corr = self.df["price", "rating"]("price", "rating").corr()
        logger.info(f"Price-Rating correlation: {corr.loc['price', 'rating']:.4f}")
        return corr

    def stock_availability(self):
        stock = self.df.groupby("category", observed=True)["in_stock"].agg(
            ["sum", "count"]
        )
        stock["percentage"] = (stock["sum"] / stock["count"] * 100).round(2)
        stock.columns = ["in_stock", "total", "percentage"]
        return stock.sort_values("percentage", ascending=False)

    def top_books(self, n=10, by="rating"):
        return self.df.nlargest(n, by)["title", "price", "rating", "category"]("title", "price", "rating", "category")

    def price_ranges(self):
        bins = [0, 10, 20, 30, 40, 50, 100]
        labels = ["0-10", "10-20", "20-30", "30-40", "40-50", "50+"]
        self.df["price_range"] = pd.cut(
            self.df["price"], bins=bins, labels=labels
        )
        return self.df["price_range"].value_counts().sort_index()
```

### 数据可视化模块

```python
class DataVisualizer:
    def __init__(self, df, output_dir="output"):
        self.df = df
        self.output_dir = output_dir
        plt.style.use("seaborn-v0_8-whitegrid")

    def save_fig(self, name):
        path = os.path.join(self.output_dir, name)
        plt.savefig(path, dpi=150, bbox_inches="tight")
        plt.close()
        logger.info(f"Saved figure: {path}")

    def plot_price_distribution(self):
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        axes[0].hist(self.df["price"], bins=30, edgecolor="black", alpha=0.7)
        axes[0].set_title("Price Distribution")
        axes[0].set_xlabel("Price")
        axes[0].set_ylabel("Frequency")

        axes[1].boxplot(self.df["price"].dropna(), vert=True)
        axes[1].set_title("Price Box Plot")
        axes[1].set_ylabel("Price")

        plt.tight_layout()
        self.save_fig("price_distribution.png")

    def plot_rating_distribution(self):
        fig, ax = plt.subplots(figsize=(8, 5))
        rating_counts = self.df["rating"].value_counts().sort_index()
        colors = ["#ff6b6b", "#ffa502", "#ffd93d", "#6bcb77", "#4d96ff"]
        bars = ax.bar(rating_counts.index, rating_counts.values, color=colors, edgecolor="black")

        for bar, count in zip(bars, rating_counts.values):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 5,
                str(count),
                ha="center", va="bottom", fontweight="bold"
            )

        ax.set_title("Rating Distribution")
        ax.set_xlabel("Rating (1-5)")
        ax.set_ylabel("Count")
        self.save_fig("rating_distribution.png")

    def plot_category_avg_price(self):
        fig, ax = plt.subplots(figsize=(12, 6))
        avg_price = self.df.groupby("category", observed=True)["price"].mean().sort_values()

        ax.barh(range(len(avg_price)), avg_price.values, edgecolor="black")
        ax.set_yticks(range(len(avg_price)))
        ax.set_yticklabels(avg_price.index, fontsize=8)
        ax.set_title("Average Price by Category")
        ax.set_xlabel("Average Price")

        plt.tight_layout()
        self.save_fig("category_avg_price.png")

    def plot_price_vs_rating(self):
        fig, ax = plt.subplots(figsize=(8, 6))
        sample = self.df.sample(min(500, len(self.df)), random_state=42)
        scatter = ax.scatter(
            sample["price"], sample["rating"],
            alpha=0.5, c=sample["rating"], cmap="RdYlGn",
            edgecolors="gray", s=50
        )
        plt.colorbar(scatter, label="Rating")
        ax.set_title("Price vs Rating")
        ax.set_xlabel("Price")
        ax.set_ylabel("Rating")
        self.save_fig("price_vs_rating.png")

    def plot_price_range_pie(self):
        fig, ax = plt.subplots(figsize=(8, 8))
        bins = [0, 10, 20, 30, 40, 50, 100]
        labels = ["0-10", "10-20", "20-30", "30-40", "40-50", "50+"]
        ranges = pd.cut(self.df["price"], bins=bins, labels=labels)
        counts = ranges.value_counts()

        ax.pie(
            counts.values, labels=counts.index, autopct="%1.1f%%",
            startangle=90, pctdistance=0.85
        )
        ax.set_title("Price Range Distribution")
        self.save_fig("price_range_pie.png")

    def generate_all_plots(self):
        self.plot_price_distribution()
        self.plot_rating_distribution()
        self.plot_category_avg_price()
        self.plot_price_vs_rating()
        self.plot_price_range_pie()
        logger.info("All plots generated successfully")
```

### 数据导出模块

```python
class DataExporter:
    def __init__(self, df, output_dir="output"):
        self.df = df
        self.output_dir = output_dir

    def to_csv(self, filename="books_data.csv"):
        path = os.path.join(self.output_dir, filename)
        self.df.to_csv(path, index=False, encoding="utf-8-sig")
        logger.info(f"Exported CSV: {path}")

    def to_json(self, filename="books_data.json"):
        path = os.path.join(self.output_dir, filename)
        self.df.to_json(path, orient="records", force_ascii=False, indent=2)
        logger.info(f"Exported JSON: {path}")

    def to_excel(self, filename="books_data.xlsx"):
        path = os.path.join(self.output_dir, filename)
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            self.df.to_excel(writer, sheet_name="Raw Data", index=False)

            summary = self.df.groupby("category", observed=True).agg(
                count=("price", "size"),
                avg_price=("price", "mean"),
                avg_rating=("rating", "mean"),
            ).round(2)
            summary.to_excel(writer, sheet_name="Summary")
        logger.info(f"Exported Excel: {path}")
```

### 主程序入口

```python
def main():
    logger.info("=== Book Scraper & Data Analysis Pipeline ===")

    client = HttpClient(headers=HEADERS, max_retries=MAX_RETRIES, delay_range=REQUEST_DELAY)
    scraper = BookScraper(client)

    logger.info("Step 1: Scraping data...")
    books = scraper.scrape_all_categories()
    logger.info(f"Scraped {len(books)} books total")

    df = pd.DataFrame(books)
    logger.info(f"DataFrame shape: {df.shape}")

    logger.info("Step 2: Cleaning data...")
    cleaner = DataCleaner(df)
    cleaner.check_data_quality()
    cleaner.remove_duplicates().handle_missing_values().convert_types()
    df_clean = cleaner.get_cleaned_data()
    logger.info(f"Cleaned DataFrame shape: {df_clean.shape}")

    logger.info("Step 3: Analyzing data...")
    analyzer = DataAnalyzer(df_clean)
    analyzer.basic_statistics()
    analyzer.price_by_category()
    analyzer.rating_distribution()
    analyzer.price_rating_correlation()

    logger.info("Step 4: Generating visualizations...")
    visualizer = DataVisualizer(df_clean, output_dir=OUTPUT_DIR)
    visualizer.generate_all_plots()

    logger.info("Step 5: Exporting data...")
    exporter = DataExporter(df_clean, output_dir=OUTPUT_DIR)
    exporter.to_csv()
    exporter.to_json()
    exporter.to_excel()

    client.close()
    logger.info("=== Pipeline completed ===")


if __name__ == "__main__":
    main()
```

## 运行说明

### 安装依赖

```bash
pip install requests beautifulsoup4 pandas matplotlib openpyxl
```

### 运行

```bash
python main.py
```

### 输出文件

- `output/books_data.csv` -- 原始数据 CSV
- `output/books_data.json` -- 原始数据 JSON
- `output/books_data.xlsx` -- 含汇总表的 Excel
- `output/price_distribution.png` -- 价格分布图
- `output/rating_distribution.png` -- 评分分布图
- `output/category_avg_price.png` -- 分类均价图
- `output/price_vs_rating.png` -- 价格与评分散点图
- `output/price_range_pie.png` -- 价格区间饼图

## 扩展方向

1. **异步抓取** -- 使用 aiohttp + asyncio 提升抓取速度
2. **数据库存储** -- 将数据存入 SQLite/MySQL，支持增量更新
3. **定时任务** -- 使用 APScheduler 定期抓取，跟踪价格变化
4. **机器学习** -- 基于特征预测图书评分或价格区间
5. **代理池** -- 集成代理池应对 IP 限制
6. **Dashboard** -- 使用 Streamlit 构建交互式数据看板
7. **日志监控** -- 接入 Sentry 或 ELK 进行异常监控

---

## 关键代码速查

### requests 基本用法

```python
import requests

response = requests.get(url, headers=headers, timeout=10)
response.raise_for_status()
html = response.text
```

### BeautifulSoup 解析

```python
soup = BeautifulSoup(html, "html.parser")
elements = soup.select("div.classname")
text = soup.select_one("h1.title").text.strip()
attr = element["href"]
```

### pandas 数据清洗

```python
df.drop_duplicates(subset=["col"], keep="first")
df["col"].fillna(df["col"].median(), inplace=True)
df["col"] = pd.to_numeric(df["col"], errors="coerce")
df["col"] = df["col"].astype("category")
```

### pandas 分组聚合

```python
df.groupby("category")["price"].agg(["mean", "median", "std", "count"])
df.nlargest(10, "rating")
pd.cut(df["price"], bins=[0, 10, 20, 50], labels=["low", "mid", "high"])
```

### matplotlib 绑图

```python
plt.hist(df["col"], bins=30)
plt.bar(x, y, color="steelblue")
plt.scatter(df["x"], df["y"], alpha=0.5)
plt.savefig("fig.png", dpi=150, bbox_inches="tight")
plt.close()
```

### 重试机制

```python
for attempt in range(1, max_retries + 1):
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        return response
    except requests.RequestException:
        if attempt == max_retries:
            raise
        time.sleep(delay * attempt)
```
