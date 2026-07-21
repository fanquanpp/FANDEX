---
order: 69
title: 计算机图形学
module: 'cs-fundamentals'
category: 'Computer Science'
difficulty: intermediate
description: 计算机图形学：图形变换、光栅化、光照模型、着色与渲染管线
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/多媒体技术'
  - 'cs-fundamentals/人工智能基础'
  - 'cs-fundamentals/设计模式'
  - 'cs-fundamentals/软件体系结构'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 图形学基础

### 1.1 坐标系统

| 坐标系   | 说明         |
| -------- | ------------ |
| 模型空间 | 物体局部坐标 |
| 世界空间 | 全局坐标     |
| 观察空间 | 相机坐标     |
| 裁剪空间 | 投影后坐标   |
| 屏幕空间 | 像素坐标     |

### 1.2 变换矩阵

**平移**：

$$T = \begin{pmatrix} 1 & 0 & 0 & t_x \\ 0 & 1 & 0 & t_y \\ 0 & 0 & 1 & t_z \\ 0 & 0 & 0 & 1 \end{pmatrix}$$

**缩放**：

$$S = \begin{pmatrix} s_x & 0 & 0 & 0 \\ 0 & s_y & 0 & 0 \\ 0 & 0 & s_z & 0 \\ 0 & 0 & 0 & 1 \end{pmatrix}$$

**旋转（绕 Z 轴）**：

$$R_z = \begin{pmatrix} \cos\theta & -\sin\theta & 0 & 0 \\ \sin\theta & \cos\theta & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{pmatrix}$$

### 1.3 MVP 变换

$$\mathbf{p}_{clip} = M_{projection} \times M_{view} \times M_{model} \times \mathbf{p}_{local}$$

## 2. 投影

### 2.1 透视投影

近大远小，符合人眼视觉：

$$M_{persp} = \begin{pmatrix} \frac{2n}{r-l} & 0 & \frac{r+l}{r-l} & 0 \\ 0 & \frac{2n}{t-b} & \frac{t+b}{t-b} & 0 \\ 0 & 0 & -\frac{f+n}{f-n} & -\frac{2fn}{f-n} \\ 0 & 0 & -1 & 0 \end{pmatrix}$$

其中 $n$ 为近裁剪面距离，$f$ 为远裁剪面距离。

### 2.2 正交投影

平行投影，无近大远小：

$$M_{ortho} = \begin{pmatrix} \frac{2}{r-l} & 0 & 0 & -\frac{r+l}{r-l} \\ 0 & \frac{2}{t-b} & 0 & -\frac{t+b}{t-b} \\ 0 & 0 & \frac{2}{n-f} & -\frac{n+f}{n-f} \\ 0 & 0 & 0 & 1 \end{pmatrix}$$

## 3. 光栅化

### 3.1 三角形光栅化

将三角形覆盖的像素标记为"内部"。

**判断点在三角形内**：

使用叉积判断：

$$\vec{v}_0 \times \vec{v}_1 > 0 \wedge \vec{v}_1 \times \vec{v}_2 > 0 \wedge \vec{v}_2 \times \vec{v}_0 > 0$$

### 3.2 重心坐标

三角形内任意点 $P$ 可表示为：

$$P = \alpha A + \beta B + \gamma C$$

$$\alpha + \beta + \gamma = 1, \quad \alpha, \beta, \gamma \geq 0$$

$$\alpha = \frac{S_{PBC}}{S_{ABC}}, \quad \beta = \frac{S_{PCA}}{S_{ABC}}, \quad \gamma = \frac{S_{PAB}}{S_{ABC}}$$

### 3.3 Z-Buffer 算法

维护深度缓冲区，解决遮挡问题：

```
for each triangle:
    for each pixel in triangle:
        if z < zbuffer[x][y]:
            zbuffer[x][y] = z
            framebuffer[x][y] = color
```

时间复杂度：$O(n)$（$n$ 为三角形数 × 每个三角形的像素数）

空间复杂度：$O(W \times H)$（帧缓冲 + 深度缓冲）

## 4. 光照模型

### 4.1 Phong 光照模型

$$I = I_a \cdot k_a + I_d \cdot k_d (\mathbf{N} \cdot \mathbf{L}) + I_s \cdot k_s (\mathbf{R} \cdot \mathbf{V})^n$$

| 分量                                              | 含义         | 说明       |
| ------------------------------------------------- | ------------ | ---------- |
| 环境光 $I_a k_a$                                  | 全局光照     | 常量       |
| 漫反射 $I_d k_d(\mathbf{N} \cdot \mathbf{L})$     | Lambert 反射 | 与视角无关 |
| 镜面反射 $I_s k_s(\mathbf{R} \cdot \mathbf{V})^n$ | 高光         | 与视角有关 |

**Blinn-Phong 改进**：用半程向量 $\mathbf{H} = \frac{\mathbf{L}+\mathbf{V}}{\|\mathbf{L}+\mathbf{V}\|}$ 替代 $\mathbf{R}$：

$$I_{specular} = k_s (\mathbf{N} \cdot \mathbf{H})^n$$

### 4.2 着色频率

| 着色方式     | 计算位置 | 效果     |
| ------------ | -------- | -------- |
| Flat 着色    | 每个面   | 面片感强 |
| Gouraud 着色 | 每个顶点 | 较平滑   |
| Phong 着色   | 每个像素 | 最平滑   |

## 5. 纹理映射

### 5.1 纹理坐标

将2D纹理映射到3D表面：

$$(u, v) \in [0, 1] \times [0, 1]$$

### 5.2 纹理过滤

| 方法   | 质量           | 性能 |
| ------ | -------------- | ---- |
| 最近邻 | 差（锯齿）     | 最快 |
| 双线性 | 好             | 中等 |
| 三线性 | 最好（Mipmap） | 较慢 |

**Mipmap**：预计算多级纹理，根据像素与纹理的距离选择级别：

$$\text{级别} = \log_2\left(\max\left(\frac{du}{dx}, \frac{dv}{dx}, \frac{du}{dy}, \frac{dv}{dy}\right)\right)$$

### 5.3 法线贴图

用纹理存储法线方向，模拟表面细节而不增加几何复杂度：

$$\mathbf{N}' = \text{normalize}(T \cdot \mathbf{n}_t)$$

其中 $T$ 为切线空间变换矩阵，$\mathbf{n}_t$ 为纹理中的法线。

## 6. 渲染管线

### 6.1 图形渲染管线

```
顶点数据 → 顶点着色器 → 图元装配 → 几何着色器 → 光栅化 → 片段着色器 → 混合 → 帧缓冲
```

| 阶段       | 可编程 | 功能           |
| ---------- | ------ | -------------- |
| 顶点着色器 | 是     | MVP 变换       |
| 图元装配   | 否     | 组装图元       |
| 几何着色器 | 是     | 生成/修改图元  |
| 光栅化     | 否     | 生成片段       |
| 片段着色器 | 是     | 着色、纹理     |
| 混合       | 否     | 深度测试、混合 |

### 6.2 光线追踪

从相机发射光线，与场景求交：

```
for each pixel:
    ray = generate_ray(pixel)
    hit = trace_ray(ray, scene)
    color = shade(hit)
```

**递归光线追踪**：在交点处继续发射反射/折射光线。

**加速结构**：

| 结构    | 构建时间     | 查询时间    |
| ------- | ------------ | ----------- |
| BVH     | $O(n\log n)$ | $O(\log n)$ |
| KD-Tree | $O(n\log n)$ | $O(\log n)$ |
| 八叉树  | $O(n)$       | $O(\log n)$ |

### 6.3 路径追踪

蒙特卡洛方法求解渲染方程：

$$L_o(p, \omega_o) = L_e(p, \omega_o) + \int_{\Omega^+} f_r(p, \omega_i, \omega_o) L_i(p, \omega_i) (\mathbf{n} \cdot \omega_i) d\omega_i$$

通过采样估计积分：

$$L_o \approx L_e + \frac{1}{N}\sum_{i=1}^{N}\frac{f_r L_i (\mathbf{n} \cdot \omega_i)}{p(\omega_i)}$$

收敛速度：$O(1/\sqrt{N})$
