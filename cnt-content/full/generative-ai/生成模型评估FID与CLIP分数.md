---
title: '生成模型评估 -- FID与CLIP分数'
description: FID、CLIP分数、Inception分数等生成模型评估指标的原理与局限
module: 'generative-ai'
difficulty: intermediate
tags:
  - FID
  - CLIP分数
  - 评估指标
  - Inception分数
  - 生成质量
related:
  - 'generative-ai/潜扩散与Stable-Diffusion'
  - 'generative-ai/生成模型分类与历史'
  - 'generative-ai/视觉自回归模型VAR'
  - 'generative-ai/视频生成'
prerequisites:
  - 'generative-ai/3D生成'
---

# 生成模型评估 -- FID 与 CLIP 分数

> "我们的模型在 FID 上达到了 1.9！" 每篇论文都这么说。但 FID 测量的是 InceptionV1 特征空间中的分布距离——它不知道什么是手、什么是文本、什么是人脸。CLIP 分数测量文本-图像对齐但忽略多样性。两者都可以被博弈。如果你不知道每个指标的失效模式，你就无法评估生成模型。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 8 · 01 (分类), Phase 8 · 06 (DDPM)
**时间:** ~45 分钟

## 问题

生成模型产生样本。你需要回答：(1) 样本看起来真实吗？(2) 样本与提示/条件匹配吗？(3) 样本有多样性吗？(4) 样本与真实数据分布有多接近？

人类评估是金标准但昂贵且不可复现。自动化指标必须替代。2026 年最常用的三个指标是 FID（分布距离）、CLIP 分数（文本-图像对齐）和 Inception 分数（质量 × 多样性）。每个都有已知的失效模式。

## 核心概念

**FID (Fréchet Inception Distance)。** Heusel et al. (2017)。将真实图像和生成图像通过 InceptionV3（在 ImageNet 上训练），提取池化前的 2048 维特征。假设两个特征集都是高斯的，计算 Fréchet 距离：

```
FID² = ||μ_real - μ_fake||² + Tr(Σ_real + Σ_fake - 2(Σ_real Σ_fake)^(1/2))
```

越低越好。0 = 完美匹配。SDXL 在 MS-COCO 上约 5-7。人类照片约 1-3。

**失效模式：**

- 依赖 InceptionV3 特征，这些特征是为 ImageNet 分类训练的——不知道人脸质量、文本渲染或空间关系。
- 对样本数敏感。需要 ≥50k 样本才稳定。10k 样本的 FID 可能与 50k 差 2-3 点。
- 可以通过在训练集上评估来博弈（FID = 0 但没有泛化）。
- 不测量条件对齐——无条件模型可以有低 FID 但完全忽略提示。

**IS (Inception Score)。** Salimans et al. (2016)。将生成图像通过 InceptionV3，计算预测类标签的 KL 散度：

```
IS = exp(E_x[KL(p(y|x) || p(y))])
```

高 IS 意味着每个图像有明确的类别（质量），且类别分布均匀（多样性）。ImageNet 上的范围：1（随机噪声）到约 300（真实数据）。

**失效模式：**

- 只测量 ImageNet 类别的质量和多样性。不适用于非 ImageNet 域（人脸、医学图像、艺术）。
- 高 IS 不意味着视觉质量——对抗样本可以有高 IS。
- 不测量条件对齐。

**CLIP 分数。** Radford et al. (2021)。计算生成图像和文本提示之间的 CLIP 嵌入余弦相似度。越高 = 更好的文本-图像对齐。

**失效模式：**

- CLIP 有已知的盲点：计数、空间关系、文本渲染。
- 高 CLIP 分数不意味着视觉质量——图像可以与文本对齐但看起来模糊。
- 可以通过重复简单概念来博弈。
- 不同 CLIP 模型给出不同分数——始终报告使用哪个。

**LPIPS (Learned Perceptual Image Patch Similarity)。** Zhang et al. (2018)。测量两张图像之间的感知距离，使用 VGG/AlexNet 特征。用于重建和编辑任务。

**人类偏好。** 最终指标。通常通过 A/B 测试收集：给人类两幅图像，问哪个更好。人类偏好与 FID 的相关性约 0.5，与 CLIP 分数约 0.6。仍然是最可靠但最昂贵。

## 指标选择指南

| 评估目标         | 推荐指标                           | 注意事项                     |
| ---------------- | ---------------------------------- | ---------------------------- |
| 整体分布质量     | FID                                | 需要 ≥50k 样本，匹配评估协议 |
| 文本-图像对齐    | CLIP 分数                          | 报告 CLIP 模型版本           |
| 类别质量和多样性 | IS                                 | 仅适用于 ImageNet 类别       |
| 重建质量         | LPIPS + PSNR + SSIM                | LPIPS 感知，PSNR 像素级      |
| 编辑保真度       | LPIPS (变化区域) + CLIP (不变区域) | 双重检查                     |
| 人类偏好         | A/B 测试                           | 金标准但昂贵                 |
| 视频质量         | FVD (视频 FID)                     | 需要更多样本                 |
| 音频质量         | FD (Fréchet 距离) 在音频特征上     | 类似 FID 但在音频嵌入上      |

## 动手构建

`code/main.py` 在合成 1-D 数据上实现了玩具 FID 计算。

### 步骤 1：提取"特征"

```python
def extract_features(samples, n_bins=20):
    # Histogram as "features" (toy version of Inception features)
    hist, _ = np.histogram(samples, bins=n_bins, range=(-5, 5), density=True)
    return hist
```

### 步骤 2：计算高斯统计量

```python
def compute_gaussian_stats(features_list):
    features = np.array(features_list)
    mu = np.mean(features, axis=0)
    sigma = np.cov(features, rowvar=False)
    return mu, sigma
```

### 步骤 3：Fréchet 距离

```python
def frechet_distance(mu1, sigma1, mu2, sigma2):
    diff = mu1 - mu2
    covmean = scipy.linalg.sqrtm(sigma1 @ sigma2)
    if np.iscomplexobj(covmean):
        covmean = covmean.real
    return diff @ diff + np.trace(sigma1 + sigma2 - 2 * covmean)
```

### 步骤 4：评估生成质量

```python
def evaluate(real_samples, fake_samples):
    real_features = [extract_features(s) for s in real_samples]
    fake_features = [extract_features(s) for s in fake_samples]
    mu_r, sig_r = compute_gaussian_stats(real_features)
    mu_f, sig_f = compute_gaussian_stats(fake_features)
    return frechet_distance(mu_r, sig_r, mu_f, sig_f)
```

## 常见陷阱

- **FID 样本数不足。** <10k 样本的 FID 噪声大且不可比。始终报告样本数。
- **不同评估协议。** 不同的图像大小、裁剪方式、Inception 模型版本给出不同 FID。始终报告协议。
- **在训练集上评估。** FID = 0 但没有泛化。始终在保留集上评估。
- **CLIP 模型不匹配。** CLIP-ViT-L/14 和 CLIP-ViT-B/32 给出不同分数。始终报告模型。
- **忽略多样性。** 只优化 FID/CLIP 可以导致模式坍缩——少量高质量样本。始终检查覆盖率。
- **过度依赖单一指标。** 没有单一指标捕获所有质量维度。至少使用 FID + CLIP + 人工检查。

## 实际应用

2026 年标准评估协议：

| 任务           | 标准指标                     |
| -------------- | ---------------------------- |
| 无条件图像生成 | FID-50k (InceptionV3)        |
| 文本到图像     | CLIP 分数 + FID + 人类偏好   |
| 图像编辑       | LPIPS + CLIP + 人类评估      |
| 视频生成       | FVD + CLIP + 人类评估        |
| 音频生成       | FD + MOS (平均意见分)        |
| 3D 生成        | PSNR + SSIM + LPIPS (多视角) |

## 交付物

保存 `outputs/skill-gen-evaluator.md`。技能接收生成任务类型 + 输出样本，输出：推荐指标、评估协议、样本量要求和已知失效模式。

## 练习

1. **简单。** 运行 `code/main.py`，计算两组不同分布之间的 FID。确认 FID 随分布差异增大而增大。
2. **中等。** 实现 Inception Score：生成样本，通过分类器获得标签分布，计算 KL 散度。比较 IS 和 FID 对模式坍缩的敏感度。
3. **困难。** 实现简单的 CLIP 分数评估：用预训练 CLIP 模型计算文本-图像对齐分数。分析 CLIP 分数与人类判断不一致的案例。

## 关键术语

| 术语      | 人们怎么说       | 实际含义                                     |
| --------- | ---------------- | -------------------------------------------- |
| FID       | "Frechet 距离"   | Inception 特征空间中两个高斯分布之间的距离。 |
| IS        | "Inception 分数" | 生成图像的类别明确性和多样性。               |
| CLIP 分数 | "文本对齐分数"   | 图像和文本之间的 CLIP 嵌入相似度。           |
| LPIPS     | "感知距离"       | 两张图像之间的学习感知距离。                 |
| FVD       | "视频 FID"       | 视频特征的 Fréchet 距离。                    |
| MOS       | "平均意见分"     | 人类评分的平均值。                           |

## 生产笔记：评估即服务

在生产中，评估不是一次性实验——它是持续监控。部署的生成模型需要：

- **自动 FID 监控。** 定期从生产模型采样，与参考分布计算 FID。FID 漂移 = 模型退化或数据漂移。
- **CLIP 分数门控。** 在服务响应之前，计算 CLIP 分数。低于阈值 = 拒绝并重试。
- **人类反馈循环。** 收集用户"喜欢/不喜欢"信号，定期与自动指标校准。

## 延伸阅读

- [Heusel et al. (2017). GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium](https://arxiv.org/abs/1706.08500) — FID。
- [Salimans et al. (2016). Improved Techniques for Training GANs](https://arxiv.org/abs/1606.03498) — IS。
- [Radford et al. (2021). Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020) — CLIP。
- [Zhang et al. (2018). The Unreasonable Effectiveness of Deep Features as a Perceptual Metric](https://arxiv.org/abs/1801.03924) — LPIPS。
- [Parmar et al. (2023). On Aliased Resizing and Surprising Subtleties in GAN Evaluation](https://arxiv.org/abs/2104.11222) — FID 评估陷阱。
