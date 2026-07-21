---
title: 数据管理
description: '使用 Hugging Face datasets 加载和流式处理数据集，在 CSV/JSON/Parquet/Arrow 格式间转换，创建可复现的数据分割，管理大文件'
module: 'ai-engineering'
difficulty: beginner
tags:
  - 数据管理
  - 'Hugging Face'
  - 数据集
  - Parquet
  - 'Git LFS'
  - DVC
related:
  - 'ai-engineering/实时语音助手ASR到LLM到TTS'
  - 'ai-engineering/视频理解管线场景与QA与搜索'
  - 'ai-engineering/数值稳定性'
  - 'ai-engineering/说话人识别与验证'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 数据管理

> 数据是燃料。你管理它的方式决定了你的速度。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 0，第 01 课
**预计时间：** ~45 分钟

## 学习目标

- 使用 Hugging Face `datasets` 库加载、流式处理和缓存数据集
- 在 CSV、JSON、Parquet 和 Arrow 格式之间转换并解释它们的取舍
- 使用固定随机种子创建可复现的训练/验证/测试分割
- 使用 `.gitignore`、Git LFS 或 DVC 管理大型模型和数据集文件

## 问题所在

每个 AI 项目都从数据开始。你需要找到数据集、下载它们、在格式之间转换、为训练和评估做分割、进行版本控制以使实验可复现。每次手动做这些既慢又容易出错。你需要一个可重复的工作流。

## 核心概念

```mermaid
graph TD
    A["Hugging Face Hub"] --> B["datasets 库"]
    B --> C["加载 / 流式处理"]
    C --> D["本地缓存<br/>~/.cache/huggingface/"]
    B --> E["格式转换<br/>CSV, JSON, Parquet, Arrow"]
    E --> F["数据分割<br/>train / val / test"]
    F --> G["你的训练流水线"]
```

Hugging Face `datasets` 库是 AI 工作中加载数据的标准方式。它开箱即用地处理下载、缓存、格式转换和流式处理。

## 动手构建

### 第 1 步：安装 datasets 库

```bash
pip install datasets huggingface_hub
```

### 第 2 步：加载数据集

```python
from datasets import load_dataset

dataset = load_dataset("imdb")
print(dataset)
print(dataset["train"][0])
```

这会下载 IMDB 电影评论数据集。首次下载后，它会从 `~/.cache/huggingface/datasets/` 的缓存加载。

### 第 3 步：流式处理大型数据集

有些数据集太大，无法放入磁盘。流式处理逐行加载数据，无需下载完整数据集。

```python
dataset = load_dataset("wikimedia/wikipedia", "20220301.en", split="train", streaming=True)

for i, example in enumerate(dataset):
    print(example["title"])
    if i >= 4:
        break
```

流式处理给你一个 `IterableDataset`。你按行处理数据。无论数据集多大，内存使用保持恒定。

### 第 4 步：数据集格式

`datasets` 库底层使用 Apache Arrow。你可以根据流水线的需要转换为其他格式。

```python
dataset = load_dataset("imdb", split="train")

dataset.to_csv("imdb_train.csv")
dataset.to_json("imdb_train.json")
dataset.to_parquet("imdb_train.parquet")
```

格式比较：

| 格式    | 大小 | 读取速度 | 适用于                          |
| ------- | ---- | -------- | ------------------------------- |
| CSV     | 大   | 慢       | 人类可读，电子表格              |
| JSON    | 大   | 慢       | API，嵌套数据                   |
| Parquet | 小   | 快       | 分析，列式查询                  |
| Arrow   | 小   | 最快     | 内存处理（`datasets` 内部使用） |

对于 AI 工作，Parquet 是最佳存储格式。Arrow 是你在内存中使用的格式。CSV 和 JSON 用于数据交换。

### 第 5 步：数据分割

每个 ML 项目需要三个分割：

- **训练集**：模型从中学习（通常 80%）
- **验证集**：训练过程中检查进度（通常 10%）
- **测试集**：训练完成后的最终评估（通常 10%）

有些数据集预先分好了。如果没有，自己分割：

```python
dataset = load_dataset("imdb", split="train")

split = dataset.train_test_split(test_size=0.2, seed=42)
train_val = split["train"].train_test_split(test_size=0.125, seed=42)

train_ds = train_val["train"]
val_ds = train_val["test"]
test_ds = split["test"]

print(f"Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")
```

始终设置种子以确保可复现性。相同的种子每次产生相同的分割。

### 第 6 步：下载和缓存模型

模型是大文件。`huggingface_hub` 库处理下载和缓存。

```python
from huggingface_hub import hf_hub_download, snapshot_download

model_path = hf_hub_download(
    repo_id="sentence-transformers/all-MiniLM-L6-v2",
    filename="config.json"
)
print(f"Cached at: {model_path}")

model_dir = snapshot_download("sentence-transformers/all-MiniLM-L6-v2")
print(f"Full model at: {model_dir}")
```

模型缓存到 `~/.cache/huggingface/hub/`。下载后，后续运行会即时加载。

### 第 7 步：处理大文件

模型权重和大型数据集不应该放进 git。三个选项：

**选项 A：.gitignore（最简单）**

```
*.bin
*.safetensors
*.pt
*.onnx
data/*.parquet
data/*.csv
models/
```

**选项 B：Git LFS（在 git 中追踪大文件）**

```bash
git lfs install
git lfs track "*.bin"
git lfs track "*.safetensors"
git add .gitattributes
```

Git LFS 在你的仓库中存储指针，实际文件存储在单独的服务器上。GitHub 提供 1 GB 免费空间。

**选项 C：DVC（数据版本控制）**

```bash
pip install dvc
dvc init
dvc add data/training_set.parquet
git add data/training_set.parquet.dvc data/.gitignore
git commit -m "Track training data with DVC"
```

DVC 创建指向你数据的小型 `.dvc` 文件。数据本身存储在 S3、GCS 或其他远程存储后端。

| 方案       | 复杂度 | 适用于                           |
| ---------- | ------ | -------------------------------- |
| .gitignore | 低     | 个人项目，可以重新获取的下载数据 |
| Git LFS    | 中     | 通过 git 共享模型权重的团队      |
| DVC        | 高     | 可复现实验，大数据集，团队       |

对于本课程，`.gitignore` 就够了。当你需要跨机器复现精确实验时使用 DVC。

### 第 8 步：存储模式

**本地存储**适用于 10 GB 以下的数据集。HF 缓存自动处理。

**云存储**用于更大的数据集或跨机器共享：

```python
import os

local_path = os.path.expanduser("~/.cache/huggingface/datasets/")

# s3_path = "s3://my-bucket/datasets/"
# gcs_path = "gs://my-bucket/datasets/"
```

DVC 直接与 S3 和 GCS 集成：

```bash
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc push
```

对于本课程，本地存储足够了。当你在远程 GPU 实例上微调时，云存储才变得相关。

## 本课程使用的数据集

| 数据集               | 课程       | 大小   | 教学内容        |
| -------------------- | ---------- | ------ | --------------- |
| IMDB                 | 分词，分类 | 84 MB  | 文本分类基础    |
| WikiText             | 语言建模   | 181 MB | 下一 token 预测 |
| SQuAD                | QA 系统    | 35 MB  | 问答，区间选择  |
| Common Crawl（子集） | 嵌入       | 不定   | 大规模文本处理  |
| MNIST                | 视觉基础   | 21 MB  | 图像分类基础    |
| COCO（子集）         | 多模态     | 不定   | 图像-文本对     |

你不需要现在下载所有这些。每节课会说明需要什么。

## 实际应用

运行工具脚本验证一切正常：

```bash
python code/data_utils.py
```

这会下载一个小数据集，转换格式，分割数据，并打印摘要。

## 交付成果

本课程产出：

- `code/data_utils.py` - 可复用的数据加载和缓存工具
- `outputs/prompt-data-helper.md` - 为任务找到合适数据集的提示词

## 练习

1. 加载 `glue` 数据集的 `mrpc` 配置，检查前 5 个样本
2. 流式处理 `c4` 数据集，计算 10 秒内能处理多少样本
3. 将数据集转换为 Parquet，比较文件大小与 CSV 的差异
4. 用固定种子创建 70/15/15 的训练/验证/测试分割，验证各部分大小

## 关键术语

| 术语          | 通俗说法         | 实际含义                                                  |
| ------------- | ---------------- | --------------------------------------------------------- |
| Dataset split | "训练数据"       | ML 生命周期不同阶段使用的命名子集（训练/验证/测试）       |
| Streaming     | "懒加载"         | 从远程源逐行处理数据，无需下载完整数据集                  |
| Parquet       | "压缩 CSV"       | 为分析查询和存储效率优化的列式文件格式                    |
| Arrow         | "快速 DataFrame" | datasets 库内部用于零拷贝读取的内存列式格式               |
| Git LFS       | "大文件的 Git"   | 将大文件存储在 git 仓库外，同时在版本控制中保留指针的扩展 |
| DVC           | "数据的 Git"     | 与云存储集成的数据集和模型版本控制系统                    |
| Cache         | "已下载"         | 之前获取数据的本地副本，默认存储在 ~/.cache/huggingface/  |
