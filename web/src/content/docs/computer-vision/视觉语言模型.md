---
title: 视觉语言模型
description: '视觉编码器将图像转换为token。MLP投影器将这些token映射到LLM的嵌入空间。语言模型完成其余工作。这个模式——ViT-MLP-LLM——就是2026年每个生产VLM。'
module: 'computer-vision'
difficulty: advanced
tags:
  - VLM
  - 视觉语言模型
  - 'Qwen3-VL'
  - LLaVA
  - 多模态
related:
  - 'computer-vision/世界模型与视频扩散'
  - 'computer-vision/视觉管线项目'
  - 'computer-vision/视觉Transformer'
  - 'computer-vision/视频理解'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 视觉语言模型

> 视觉编码器将图像转换为token。MLP投影器将这些token映射到LLM的嵌入空间。语言模型完成其余工作。这个模式——ViT-MLP-LLM——就是2026年每个生产VLM。

**类型:** 学习+使用
**语言:** Python
**前置知识:** Phase 4 Lesson 14 (ViT), Phase 4 Lesson 18 (CLIP)
**时间:** 约75分钟

## 学习目标

- 陈述ViT-MLP-LLM架构并解释三个组件各自的贡献
- 比较Qwen3-VL、InternVL3.5、LLaVA-Next和GLM-4.6V的参数量、上下文长度和基准性能
- 解释DeepStack：为什么多层ViT特征比单层最后层特征更好地收紧视觉-语言对齐
- 用跨模态错误率（CMER）衡量生产VLM幻觉并据此行动

## 问题所在

CLIP给你图像和文本的共享嵌入空间，足以做零样本分类和检索。它不能回答"这张图像中有多少辆红色汽车？"因为CLIP不生成文本——它只评分相似度。

视觉语言模型（VLM）——Qwen3-VL、InternVL3.5、LLaVA-Next、GLM-4.6V——将CLIP系列图像编码器连接到完整语言模型。模型看到图像加问题并生成答案。2026年开源VLM在多模态基准（MMMU、MMBench、DocVQA、ChartQA、MathVista、OSWorld）上匹敌或超越GPT-5和Gemini-2.5-Pro。

三件套（ViT、投影器、LLM）是标准。模型之间的差异在于哪个ViT、哪个投影器、哪个LLM、训练数据和对齐配方。一旦你理解了模式，替换任何组件都是机械的。

## 核心概念

### ViT-MLP-LLM架构

1. **视觉编码器** — 预训练ViT（CLIP-L/14、SigLIP、DINOv3或微调变体）。产生patch token。
2. **投影器** — 小模块（2-4层MLP或Q-former）将视觉token映射到LLM嵌入维度。大部分微调发生在这里。
3. **LLM** — 解码器语言模型（Qwen3、Llama、Mistral、GLM、InternLM）。按序列读取视觉+文本token，生成文本。

三个部分原则上都可训练。实践中，视觉编码器和LLM大部分保持冻结，而投影器训练——几十亿参数的信号，成本很低。

### DeepStack

普通投影只使用最后ViT层。DeepStack（Qwen3-VL）从多个ViT深度采样特征并堆叠。更深层携带高级语义；更浅层携带细粒度空间和纹理信息。将两者都输入LLM缩小了"图像包含什么"（语义）和"确切在哪里"（空间定位）之间的差距。

### 三个训练阶段

1. **对齐** — 冻结ViT和LLM。仅在图像-字幕对上训练投影器。教投影器将视觉空间映射到语言空间。
2. **预训练** — 解冻一切。在大规模交错图像-文本数据（5亿+对）上训练。构建模型的视觉知识。
3. **指令微调** — 在精选的（图像、问题、答案）三元组上微调。教对话行为和任务格式。

大多数LoRA微调针对阶段3，使用小型标注数据集。

### 模型家族比较

| 模型            | 参数 | 视觉编码器   | LLM     | 上下文 |
| --------------- | ---- | ------------ | ------- | ------ |
| Qwen3-VL-8B     | 8B   | 自定义ViT    | Qwen3   | 128K   |
| InternVL3.5-38B | 38B  | InternViT-6B | Qwen3   | 128K   |
| LLaVA-Next 72B  | 72B  | SigLIP       | Llama-3 | 32K    |
| GLM-4.6V        | ~70B | 自定义       | GLM     | 64K    |

### 对齐问题

爬取数据集中12%的图像-文本对包含不完全基于图像的描述。在此训练的VLM静默学会幻觉——编造物体、误读数字、发明关系。生产中这是主要失败模式。

跨模态错误率（CMER）追踪它：

```
CMER = 文本置信度高但图像-文本相似度（通过CLIP系列检查器）低的输出比例
```

高CMER意味着模型在自信地说不在图像中基于的东西。监控CMER并将其视为生产KPI，在部署中减少了约35%的幻觉率。

## 构建它

### 步骤1：投影器

```python
import torch
import torch.nn as nn

class Projector(nn.Module):
    def __init__(self, vit_dim=768, llm_dim=4096, hidden=4096):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(vit_dim, hidden), nn.GELU(), nn.Linear(hidden, llm_dim),
        )

    def forward(self, x):
        return self.net(x)
```

### 步骤2：组装ViT-MLP-LLM

```python
class MinimalVLM(nn.Module):
    def __init__(self, vit, projector, llm, image_token_id):
        super().__init__()
        self.vit = vit
        self.projector = projector
        self.llm = llm
        self.image_token_id = image_token_id

    def forward(self, image, input_ids, attention_mask):
        vision_tokens = self.vit(image)
        vision_embeds = self.projector(vision_tokens)
        text_embeds = self.llm.get_input_embeddings()(input_ids)
        merged = self._merge(text_embeds, vision_embeds, input_ids)
        return self.llm(inputs_embeds=merged, attention_mask=attention_mask)

    def _merge(self, text_embeds, vision_embeds, input_ids):
        out = text_embeds.clone()
        expected = vision_embeds.size(1)
        for b in range(input_ids.size(0)):
            positions = (input_ids[b] == self.image_token_id).nonzero(as_tuple=True)[0]
            out[b, positions] = vision_embeds[b]
        return out
```

### 步骤3：CMER计算

```python
import torch.nn.functional as F

def cross_modal_error_rate(image_emb, text_emb, text_confidence, sim_threshold=0.25, conf_threshold=0.8):
    image_emb = F.normalize(image_emb, dim=-1)
    text_emb = F.normalize(text_emb, dim=-1)
    sim = (image_emb * text_emb).sum(dim=-1)
    high_conf_low_sim = (text_confidence > conf_threshold) & (sim < sim_threshold)
    return high_conf_low_sim.float().mean().item()
```

## 使用它

```python
from transformers import AutoProcessor, AutoModelForVision2Seq
import torch
from PIL import Image

model_id = "Qwen/Qwen3-VL-8B-Instruct"
processor = AutoProcessor.from_pretrained(model_id)
model = AutoModelForVision2Seq.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")

messages = [{"role": "user", "content": [
    {"type": "image", "image": Image.open("plot.png")},
    {"type": "text", "text": "What does this chart show?"},
]}]
inputs = processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt").to("cuda")
generated = model.generate(**inputs, max_new_tokens=256)
answer = processor.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
```

## 发布它

本课产出：

- `outputs/prompt-vlm-selector.md` — 根据准确率、延迟、上下文长度和预算选择VLM。
- `outputs/skill-cmer-monitor.md` — 生成代码用跨模态错误率监控生产VLM端点。

## 练习

1. **(简单)** 用三个提示通过任何开放VLM在五张图像上运行。手工评分每个答案。计算类CMER率。
2. **(中等)** 用LoRA在500张目标领域图像上微调Qwen2.5-VL-3B。比较零样本和微调准确率。
3. **(困难)** 用DINOv3替换VLM的图像编码器。仅重新训练投影器。测量密集预测任务是否改善。

## 关键术语

| 术语        | 人们怎么说         | 实际含义                                          |
| ----------- | ------------------ | ------------------------------------------------- |
| ViT-MLP-LLM | "VLM模式"          | 视觉编码器+投影器+语言模型；每个2026 VLM          |
| 投影器      | "桥梁"             | 将视觉token映射到LLM嵌入空间的2-4层MLP            |
| DeepStack   | "Qwen3-VL特征技巧" | 堆叠多层ViT特征而非仅最后层                       |
| 图像token   | "<image>占位符"    | 文本流中被投影视觉嵌入替换的特殊token             |
| CMER        | "幻觉KPI"          | 跨模态错误率；文本置信度高但图像-文本相似度低时高 |
| 视觉代理    | "点击的VLM"        | 用工具调用操作GUI的VLM                            |

## 延伸阅读

- [Qwen3-VL Technical Report (arXiv 2511.21631)](https://arxiv.org/abs/2511.21631)
- [InternVL3.5 (arXiv 2508.18265)](https://arxiv.org/html/2508.18265v1)
- [LLaVA-Next series](https://llava-vl.github.io/blog/2024-05-10-llava-next-stronger-llms/)
