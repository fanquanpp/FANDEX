---
order: 85
title: C++数学库
module: cpp
category: C++
difficulty: intermediate
description: 数值计算、标准数学库与高性能第三方数学库的工程实践
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/C++与WebAssembly
  - cpp/C++反射与元编程
  - cpp/智能指针
  - cpp/C++正则表达式
  - cpp/C++性能优化
prerequisites:
  - cpp/概述与现代标准
  - cpp/模板
---

## 学习目标

本节按照 Bloom 分类法的认知层级组织学习目标,读者完成本章学习后应能够达到以下层级:

### 识记层 (Remembering)

- 列举 C++ 标准库提供的主要数学头文件(`<cmath>`、`<complex>`、`<random>`、`<numeric>`、`<numbers>`、`<bit>`)
- 说出 IEEE 754 浮点数标准的基本格式(single/double/half/bfloat16)
- 复述 BLAS/LAPACK 的层级划分与典型函数命名约定
- 识别 Eigen、Armadillo、Blaze、xtensor 等主流第三方数学库

### 理解层 (Understanding)

- 解释浮点数精度损失与舍入误差的产生机制
- 阐述条件数(condition number)与数值稳定性的关系
- 描述 SIMD 指令在数学函数向量化中的应用
- 区分伪随机数生成器(PRNG)与真随机数生成器(TRNG)的差异

### 应用层 (Applying)

- 使用 `<random>` 头文件实现高质量随机数序列
- 使用 `std::complex` 实现复数运算与 FFT
- 使用 `<numeric>` 中的 `std::accumulate`、`std::reduce`、`std::inner_product` 等
- 应用 `std::numbers` 常量(pi、e、sqrt2 等)于数学公式实现

### 分析层 (Analyzing)

- 分析一个数值算法的稳定性,识别灾难性抵消(catastrophic cancellation)
- 解构 BLAS 库的分层结构,理解 Level 1/2/3 的性能差异根因
- 对比 Eigen 与 Armadillo 在表达式模板(expression template)设计上的差异

### 评价层 (Evaluating)

- 评估特定场景应使用标准库还是第三方库(精度、性能、依赖)
- 判断一段数值代码是否需要使用 Kahan 求和或更高精度补偿
- 在 CPU 与 GPU 数学库(CUBLAS、cuDNN)之间做出工程权衡

### 创造层 (Creating)

- 设计一个支持多精度(float/double/long double)的通用数值库
- 构建一个面向机器学习推理的向量化数学内核
- 提出一种基于异构计算(CPU+GPU)的混合数值方案

## 历史动机与背景

C++ 数学库的发展历史反映了数值计算从基础算术到高性能科学计算的演进过程。

### 1960-1980:FORTRAN 时代与基础数学库

科学计算的早期几乎全部使用 FORTRAN。IBM 在 1960 年代推出 SSP(Scientific Subroutine Package),奠定科学计算库基本范式:函数式接口、列主序矩阵、错误码返回。LINPACK(1974)、EISPACK(1970s)是这一时期的代表性项目,Jack Dongarra 等人基于它们创建了著名的 LAPACK(1992)。

### 1980-1990:C 时代的 `<math.h>`

C 语言标准化引入 `<math.h>` 头文件,提供 `sin`、`cos`、`exp`、`log` 等基本数学函数。这些函数直接映射到硬件浮点指令(如 x87 FPU),成为跨平台数学计算的最低公约数。然而,`<math.h>` 仅支持 `double` 类型,缺乏 `float` 与 `long double` 重载,且无向量类型支持。

### 1990-2000:C++ 早期与 `<cmath>`

C++98 标准化引入 `<cmath>`,在保留 C 接口的基础上,增加了 `float` 与 `long double` 的重载,并通过 `std::complex` 提供复数支持。这一阶段,C++ 数值计算仍以 C 风格为主,缺乏现代抽象。

### 2000-2010:表达式模板与第三方库崛起

Todd Veldhuizen 在 1995 年提出表达式模板(Expression Templates)技术,使 C++ 矩阵库可在不损失性能的前提下提供优雅的运算符重载接口。这一技术催生了:

- **Blitz++**(1999):早期表达式模板库
- **Eigen**(2006):法国 INRIA 团队开发,如今最流行的 C++ 线性代数库
- **Armadillo**(2008):澳大利亚 NICTA 开发,API 接近 MATLAB

同时,Boost 库引入 `boost::multiprecision`、`boost::numeric` 等模块,扩展了 C++ 数值计算能力。

### 2010-2020:C++11/17 与标准库扩展

C++11 引入 `<random>` 头文件,提供 20+ 种高质量随机数引擎与分布,彻底取代 `rand()`。C++17 进一步引入:

- `<cmath>` 中的特殊函数:`beta`、`riemann_zeta`、`ellint_1/2/3` 等
- `<execution>` 策略,可并行化 `<algorithm>` 与 `<numeric>`
- `std::lcm`、`std::gcd`(从 C++14 起)
- 类模板参数推导(CTAD)简化复数等对象构造

### 2020 至今:C++20/23/26 数学扩展

C++20 引入 `<numbers>` 头文件,提供 `pi`、`e`、`sqrt2`、`ln2` 等常量;`<bit>` 提供 `bit_cast`、`popcount` 等。C++23 引入 `<stdfloat>` 头文件,标准化 `float16`、`float32`、`float64`、`bfloat16` 等类型别名。C++26 计划引入 `std::linalg`(基于 BLAS 标准化)与 `std::simd`(跨平台向量计算)。

### 核心动因总结

C++ 数学库的发展动因可归纳为:

- **科学计算需求**:HPC、CAD、CAE、CFD 等领域对高性能数值计算有持续需求
- **机器学习崛起**:PyTorch、TensorFlow 等框架底层依赖 C++ 数学库
- **跨平台一致性**:不同硬件(x86/ARM/GPU)需统一数学 API
- **精度与性能平衡**:科学计算要求高精度,机器学习要求高吞吐

## 形式化定义

### IEEE 754 浮点数表示

IEEE 754 标准定义浮点数为三元组 $(s, e, m)$,其值为:

$$
x = (-1)^s \times m \times 2^{e - E_{bias}}
$$

其中 $s$ 为符号位,$e$ 为指数位,$m$ 为尾数(隐含前导 1),$E_{bias}$ 为指数偏移。常见格式:

| 类型        | 总位数 | 符号位 | 指数位 | 尾数位 | 偏移   | 范围(十进制)         |
| ----------- | ------ | ------ | ------ | ------ | ------ | --------------------- |
| half        | 16     | 1      | 5      | 10     | 15     | 6.10e-5 ~ 65504       |
| single      | 32     | 1      | 8      | 23     | 127    | 1.18e-38 ~ 3.40e38    |
| double      | 64     | 1      | 11     | 52     | 1023   | 2.23e-308 ~ 1.80e308  |
| quadruple   | 128    | 1      | 15     | 112    | 16383  | 3.36e-4932 ~ 1.19e4932|
| bfloat16    | 16     | 1      | 8      | 7      | 127    | 1.18e-38 ~ 3.40e38    |

### 机器精度与舍入误差

机器精度 $\epsilon_{mach}$ 定义为使 $1 + \epsilon_{mach} \neq 1$ 成立的最小正浮点数。对 IEEE 754:

$$
\epsilon_{mach} = 2^{-(p+1)}
$$

其中 $p$ 为尾数位数。例如,double 类型 $p=52$,$\epsilon_{mach} \approx 2.22 \times 10^{-16}$。

浮点运算的相对误差上界为:

$$
\text{fl}(x \text{ op } y) = (x \text{ op } y)(1 + \delta),\ |\delta| \leq \epsilon_{mach}
$$

其中 $\text{op} \in \{+, -, \times, /\}$。

### 条件数与稳定性

数值问题的条件数 $\kappa$ 刻画输入扰动对输出的放大程度:

$$
\kappa = \lim_{\delta \to 0} \frac{\|f(x + \delta) - f(x)\| / \|f(x)\|}{\|\delta\| / \|x\|}
$$

矩阵求逆的条件数为:

$$
\kappa(A) = \|A\| \cdot \|A^{-1}\|
$$

若 $\kappa(A) = 10^k$,则求逆结果约丢失 $k$ 位有效数字。

### BLAS 层级定义

BLAS(Basic Linear Algebra Subprograms)分为三层:

- **Level 1**:向量-向量运算,$O(n)$ 数据,$O(n)$ 计算,算术强度约 1
- **Level 2**:矩阵-向量运算,$O(n^2)$ 数据,$O(n^2)$ 计算,算术强度约 1
- **Level 3**:矩阵-矩阵运算,$O(n^2)$ 数据,$O(n^3)$ 计算,算术强度约 $n$

Level 3 因算术强度高,可充分利用 SIMD 与多核,性能远超 Level 1/2。

### 复数运算的代数结构

复数集 $\mathbb{C}$ 是实数域上的代数闭域,可表示为 $z = a + bi$,其中 $i^2 = -1$。其乘法满足:

$$
z_1 \cdot z_2 = (a_1 a_2 - b_1 b_2) + (a_1 b_2 + a_2 b_1)i
$$

模长与共轭:

$$
|z| = \sqrt{a^2 + b^2},\quad \bar{z} = a - bi
$$

欧拉公式:

$$
e^{i\theta} = \cos\theta + i\sin\theta
$$

### 随机数生成的伪随机性

线性同余生成器(LCG)形式:

$$
X_{n+1} = (a X_n + c) \bmod m
$$

其中 $a$ 为乘子,$c$ 为增量,$m$ 为模数。LCG 的周期上界为 $m$,且低位可能有较短周期。Mersenne Twister(MT19937)基于有限域上的线性递推,周期长达 $2^{19937} - 1$,且通过严格统计检验。

### 表达式模板的代数基础

表达式模板将运算表达式 $A + B \times C$ 编码为类型:

$$
\text{MatAdd<Mat, MatMul<Mat, Mat>>}
$$

通过模板递归,在编译期构建抽象语法树(AST),并在赋值时一次性遍历,避免中间临时矩阵。这等价于将:

$$
T_i = A_i + B_i \times C_i,\ \forall i
$$

融合为单次循环,显著减少内存访问与缓存压力。

## 理论推导

### Kahan 求和的误差补偿推导

朴素求和 $S_n = \sum_{i=1}^n x_i$ 的累计误差上界为:

$$
|S_n - \hat{S}_n| \leq (n-1) \epsilon_{mach} \sum_{i=1}^n |x_i|
$$

当 $n$ 较大或数据量级差异大时,误差显著放大。

Kahan 求和算法维护补偿项 $c$,捕获被舍去的低位:

```
sum = 0; c = 0
for x_i:
  y = x_i - c
  t = sum + y
  c = (t - sum) - y
  sum = t
```

理论分析显示,Kahan 求和的误差上界为:

$$
|S_n - \hat{S}_n| \leq (2\epsilon_{mach} + O(n\epsilon_{mach}^2)) \sum_{i=1}^n |x_i|
$$

即误差与 $n$ 无关(在 $n\epsilon_{mach} < 1$ 时),显著优于朴素求和。

### SIMD 向量化数学函数

标量数学函数 $f(x)$ 的 SIMD 实现需考虑:

1. **多项式逼近**:大多数超越函数使用最小化最大误差的多项式逼近
2. **范围归约**:将输入归约到主值域(如 $\sin$ 归约到 $[0, \pi/4]$)
3. **系数表**:多项式系数预计算并存储在 L1 缓存
4. **SIMD 并行**:对 8/16 个输入同时计算

例如,$\sin(x)$ 在 $[-\pi, \pi]$ 上的 7 阶 Chebyshev 逼近:

$$
\sin(x) \approx x - \frac{x^3}{6} + \frac{x^5}{120} - \frac{x^7}{5040} + \epsilon,\ |\epsilon| < 10^{-7}
$$

Intel SVML(Short Vector Math Library)与 SLEEF 实现了 SIMD 版本,在 AVX2 上 8 个 double 同时计算 $\sin$,性能比标量版本快 4-6 倍。

### 矩阵乘法的分块算法复杂度

设 $n \times n$ 矩阵乘法,缓存容量 $C$,块大小 $b$。朴素算法缓存未命中数为:

$$
M_{naive} = O(n^3 / C)
$$

分块算法:

$$
M_{blocked} = O(n^3 / (b \cdot C) + n^2 \cdot b)
$$

对 $b$ 求导得最优:

$$
b^* \approx \sqrt{C}
$$

更精细分析考虑缓存层级(L1/L2/L3),采用递归分块(如 BLIS 的 Goto 算法),可达 90%+ 峰值性能。

### 复数 FFT 的蝶形运算复杂度

Cooley-Tukey FFT 算法将 $N$ 点 DFT 分解为两个 $N/2$ 点 DFT:

$$
X_k = E_k + \omega_N^k O_k,\quad X_{k+N/2} = E_k - \omega_N^k O_k
$$

其中 $E_k$ 为偶数子序列 DFT,$O_k$ 为奇数子序列 DFT,$\omega_N = e^{-2\pi i / N}$。

总乘法次数:

$$
T(N) = 2 T(N/2) + O(N) \Rightarrow T(N) = O(N \log N)
$$

相较于朴素 DFT 的 $O(N^2)$,FFT 提供约 $\frac{N}{\log N}$ 倍加速,在 $N = 10^6$ 时约 50000 倍。

### 随机数生成的均匀分布质量

均匀分布 $U(0, 1)$ 的理想性质:

1. **均匀性**:$P(x \in [a, b]) = b - a$
2. **独立性**:连续输出无统计相关性
3. **周期**:输出周期应远大于使用量
4. **效率**:每次生成开销小

Mersenne Twister MT19937 的状态空间为 $2^{19937} - 1$,远超任何实际使用量。但其状态占 2.5KB,对缓存不友好,在小批量生成场景不如 PCG、xoroshiro 等现代算法。

### 浮点比较的相对误差

浮点数 $a$ 与 $b$ 的比较应使用相对误差:

$$
|a - b| \leq \epsilon \cdot \max(|a|, |b|)
$$

或更严格的组合误差:

$$
|a - b| \leq \epsilon_{abs} + \epsilon_{rel} \cdot \max(|a|, |b|)
$$

其中 $\epsilon_{abs}$ 处理接近零的情况,$\epsilon_{rel}$ 处理大数值。Google Test 的 `EXPECT_NEAR` 与 Catch2 的 `Approx` 都采用类似策略。

## 代码示例

### 示例 1:浮点数精度演示

```cpp
// 文件: float_precision.cpp
// 演示浮点数舍入误差与 Kahan 求和
// 编译: g++ -O2 -std=c++17 float_precision.cpp -o float_precision
#include <iostream>
#include <numeric>
#include <vector>

// 朴素求和
// 直接累加,误差随 n 增长
double naiveSum(const std::vector<double>& data) {
  double sum = 0.0;
  for (auto x : data) sum += x;
  return sum;
}

// Kahan 求和
// 通过补偿项捕获舍入误差
// 适用于大量小数值累加场景
double kahanSum(const std::vector<double>& data) {
  double sum = 0.0;
  double c = 0.0;  // 补偿项
  for (auto x : data) {
    double y = x - c;          // 减去上次补偿
    double t = sum + y;        // 累加
    c = (t - sum) - y;         // 计算新的补偿
    sum = t;
  }
  return sum;
}

// Neumaier 求和(Kahan 改进版)
// 比 Kahan 更稳定,处理大数加小数场景
double neumaierSum(const std::vector<double>& data) {
  double sum = 0.0;
  double c = 0.0;
  for (auto x : data) {
    double t = sum + x;
    if (std::abs(sum) >= std::abs(x)) {
      c += (sum - t) + x;  // sum 较大,补偿为 (sum - t) + x
    } else {
      c += (x - t) + sum;  // x 较大,补偿为 (x - t) + sum
    }
    sum = t;
  }
  return sum + c;
}

int main() {
  // 一个大数加很多小数,演示精度损失
  std::vector<double> data;
  data.push_back(1.0e16);
  for (int i = 0; i < 10000; ++i) {
    data.push_back(1.0);
  }

  double exact = 1.0e16 + 10000.0;
  std::cout << std::setprecision(17);
  std::cout << "Exact:    " << exact << "\n";
  std::cout << "Naive:    " << naiveSum(data) << "\n";
  std::cout << "Kahan:    " << kahanSum(data) << "\n";
  std::cout << "Neumaier: " << neumaierSum(data) << "\n";

  return 0;
}
```

典型输出:

```
Exact:    1.000000000000001e+16
Naive:    1e+16
Kahan:    1.000000000000001e+16
Neumaier: 1.000000000000001e+16
```

朴素求和丢失了小数部分,Kahan 与 Neumaier 正确补偿。

### 示例 2:复数与 FFT

```cpp
// 文件: complex_fft.cpp
// 演示 std::complex 与递归 FFT 实现
// 编译: g++ -O2 -std=c++17 complex_fft.cpp -o complex_fft
#include <complex>
#include <iostream>
#include <numbers>
#include <vector>

using Complex = std::complex<double>;
using ComplexVec = std::vector<Complex>;

// 递归 FFT 实现
// 输入:复数序列(长度必须为 2 的幂)
// 输出:DFT 结果
// 时间复杂度 O(n log n)
ComplexVec fft(const ComplexVec& a) {
  size_t n = a.size();
  if (n == 1) return a;

  // 分治:偶数与奇数子序列
  ComplexVec even(n / 2), odd(n / 2);
  for (size_t i = 0; i < n / 2; ++i) {
    even[i] = a[2 * i];
    odd[i] = a[2 * i + 1];
  }

  ComplexVec even_fft = fft(even);
  ComplexVec odd_fft = fft(odd);

  // 合并:应用蝶形运算
  ComplexVec result(n);
  for (size_t k = 0; k < n / 2; ++k) {
    // 主 N 次单位根:omega = exp(-2*pi*i*k/N)
    Complex omega = std::polar(1.0, -2.0 * std::numbers::pi * k / n);
    result[k] = even_fft[k] + omega * odd_fft[k];
    result[k + n / 2] = even_fft[k] - omega * odd_fft[k];
  }
  return result;
}

int main() {
  // 测试:对 [1, 1, 1, 1, 0, 0, 0, 0] 做 FFT
  ComplexVec input = {1, 1, 1, 1, 0, 0, 0, 0};
  ComplexVec output = fft(input);

  std::cout << "FFT result:\n";
  for (size_t i = 0; i < output.size(); ++i) {
    std::cout << "X[" << i << "] = " << output[i] << "\n";
  }

  // 演示复数运算
  Complex z1(3, 4);  // 3 + 4i,模长 5
  Complex z2(1, -1); // 1 - i
  std::cout << "\nz1 = " << z1 << ", |z1| = " << std::abs(z1) << "\n";
  std::cout << "z2 = " << z2 << ", arg(z2) = " << std::arg(z2) << "\n";
  std::cout << "z1 * z2 = " << z1 * z2 << "\n";
  std::cout << "conj(z1) = " << std::conj(z1) << "\n";

  return 0;
}
```

### 示例 3:高质量随机数生成

```cpp
// 文件: random_demo.cpp
// 演示 C++ <random> 头文件的现代用法
// 编译: g++ -O2 -std=c++17 random_demo.cpp -o random_demo
#include <iostream>
#include <random>
#include <iomanip>

int main() {
  // 创建随机设备作为种子源
  // random_device 使用硬件熵源(如 /dev/urandom)
  std::random_device rd;

  // Mersenne Twister 引擎
  // 状态 2.5KB,周期 2^19937-1,质量优秀但缓存不友好
  std::mt19937_64 mt(rd());

  // 均匀分布 [0, 100]
  std::uniform_int_distribution<int> uniform_dist(0, 100);
  std::cout << "Uniform [0, 100]: ";
  for (int i = 0; i < 10; ++i) {
    std::cout << uniform_dist(mt) << " ";
  }
  std::cout << "\n";

  // 正态分布 N(0, 1)
  std::normal_distribution<double> normal_dist(0.0, 1.0);
  std::cout << "Normal N(0, 1): ";
  for (int i = 0; i < 10; ++i) {
    std::cout << std::fixed << std::setprecision(3) << normal_dist(mt) << " ";
  }
  std::cout << "\n";

  // 指数分布 lambda=1
  std::exponential_distribution<double> exp_dist(1.0);
  std::cout << "Exponential(1): ";
  for (int i = 0; i < 10; ++i) {
    std::cout << std::fixed << std::setprecision(3) << exp_dist(mt) << " ";
  }
  std::cout << "\n";

  // 伯努利分布 p=0.3
  std::bernoulli_distribution bernoulli_dist(0.3);
  std::cout << "Bernoulli(0.3): ";
  for (int i = 0; i < 20; ++i) {
    std::cout << bernoulli_dist(mt) << " ";
  }
  std::cout << "\n";

  // 蒙特卡洛估算 pi
  // 在单位正方形内随机投点,落在单位圆内的概率为 pi/4
  std::uniform_real_distribution<double> unit_dist(-1.0, 1.0);
  long long inside = 0;
  const long long N = 1000000;
  for (long long i = 0; i < N; ++i) {
    double x = unit_dist(mt);
    double y = unit_dist(mt);
    if (x * x + y * y <= 1.0) ++inside;
  }
  double pi_estimate = 4.0 * inside / N;
  std::cout << "\nMonte Carlo pi estimate: " << pi_estimate << "\n";
  std::cout << "Actual pi:               " << std::numbers::pi << "\n";

  return 0;
}
```

### 示例 4:数值算法的使用

```cpp
// 文件: numeric_algorithms.cpp
// 演示 <numeric> 头文件中的算法
// 编译: g++ -O2 -std=c++17 -ltbb numeric_algorithms.cpp -o numeric_algorithms
#include <execution>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
  std::vector<int> data(1000000);
  std::iota(data.begin(), data.end(), 1);  // 填充 1, 2, 3, ...

  // 1. 累加:顺序与并行对比
  auto seq_sum = std::accumulate(data.begin(), data.end(), 0LL);
  auto par_sum = std::reduce(std::execution::par, data.begin(), data.end(), 0LL);
  std::cout << "Sum: " << seq_sum << " (seq) == " << par_sum << " (par)\n";

  // 2. 内积:计算 a[0]*b[0] + a[1]*b[1] + ...
  std::vector<int> a = {1, 2, 3, 4};
  std::vector<int> b = {5, 6, 7, 8};
  auto dot = std::inner_product(a.begin(), a.end(), b.begin(), 0);
  std::cout << "Dot product: " << dot << "\n";  // 1*5+2*6+3*7+4*8 = 70

  // 3. 部分和:prefix sum
  std::vector<int> partial(10);
  std::vector<int> input = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
  std::partial_sum(input.begin(), input.end(), partial.begin());
  std::cout << "Partial sum: ";
  for (auto x : partial) std::cout << x << " ";
  std::cout << "\n";  // 1 3 6 10 15 21 28 36 45 55

  // 4. 相邻差分
  std::vector<int> diff(10);
  std::adjacent_difference(input.begin(), input.end(), diff.begin());
  std::cout << "Adjacent diff: ";
  for (auto x : diff) std::cout << x << " ";
  std::cout << "\n";  // 1 1 1 1 1 1 1 1 1 1

  // 5. GCD 与 LCM
  std::cout << "gcd(12, 18) = " << std::gcd(12, 18) << "\n";  // 6
  std::cout << "lcm(12, 18) = " << std::lcm(12, 18) << "\n";  // 36

  // 6. 中位数与统计(需自行实现)
  std::vector<double> values = {1.5, 2.3, 0.7, 4.1, 3.2};
  std::sort(values.begin(), values.end());
  double median = values[values.size() / 2];
  double mean = std::accumulate(values.begin(), values.end(), 0.0) / values.size();
  std::cout << "Mean: " << mean << ", Median: " << median << "\n";

  return 0;
}
```

### 示例 5:使用 Eigen 进行线性代数运算

```cpp
// 文件: eigen_demo.cpp
// 演示 Eigen 矩阵运算
// 编译: g++ -O3 -std=c++17 -I/usr/include/eigen3 eigen_demo.cpp -o eigen_demo
#include <Eigen/Dense>
#include <iostream>

int main() {
  using namespace Eigen;

  // 矩阵定义与基本运算
  Matrix2d A;
  A << 1, 2,
       3, 4;
  std::cout << "A =\n" << A << "\n";

  Vector2d v(1, 2);
  std::cout << "v = " << v.transpose() << "\n";

  // 矩阵向量乘法
  Vector2d result = A * v;
  std::cout << "A * v = " << result.transpose() << "\n";

  // 矩阵求逆
  Matrix2d A_inv = A.inverse();
  std::cout << "A^-1 =\n" << A_inv << "\n";

  // 行列式与迹
  std::cout << "det(A) = " << A.determinant() << "\n";
  std::cout << "trace(A) = " << A.trace() << "\n";

  // 特征值分解
  EigenSolver<Matrix2d> es(A);
  std::cout << "Eigenvalues: " << es.eigenvalues().transpose() << "\n";

  // 大矩阵运算
  MatrixXd B = MatrixXd::Random(100, 100);
  MatrixXd C = MatrixXd::Random(100, 100);
  auto t1 = std::chrono::high_resolution_clock::now();
  MatrixXd D = B * C;  // 自动调用 BLAS Level 3
  auto t2 = std::chrono::high_resolution_clock::now();
  std::cout << "100x100 matmul: "
            << std::chrono::duration_cast<std::chrono::microseconds>(t2 - t1).count()
            << " us\n";

  // 解线性方程组 Ax = b
  Vector2d b(5, 11);
  Vector2d x = A.colPivHouseholderQr().solve(b);
  std::cout << "Solution x = " << x.transpose() << "\n";

  // 表达式模板:延迟求值,无临时矩阵
  MatrixXd X = MatrixXd::Random(1000, 1000);
  MatrixXd Y = MatrixXd::Random(1000, 1000);
  MatrixXd Z = MatrixXd::Random(1000, 1000);
  // 一次性计算 X + Y*Z,无中间临时矩阵
  MatrixXd W = X + Y * Z;

  return 0;
}
```

### 示例 6:特殊函数与 C++17 数学扩展

```cpp
// 文件: special_functions.cpp
// 演示 C++17 数学特殊函数
// 编译: g++ -O2 -std=c++17 special_functions.cpp -o special_functions
#include <cmath>
#include <iostream>
#include <numbers>

int main() {
  using namespace std::numbers;

  // 数学常量(C++20)
  std::cout << "pi = " << pi << "\n";
  std::cout << "e = " << e << "\n";
  std::cout << "sqrt2 = " << sqrt2 << "\n";
  std::cout << "ln2 = " << ln2 << "\n";
  std::cout << "phi (golden ratio) = " << phi << "\n";

  // 特殊函数(C++17 起)
  // Beta 函数:B(a, b) = Gamma(a)*Gamma(b)/Gamma(a+b)
  std::cout << "beta(1, 1) = " << std::beta(1.0, 1.0) << "\n";  // 1.0
  std::cout << "beta(2, 3) = " << std::beta(2.0, 3.0) << "\n";  // 1/12

  // 黎曼 zeta 函数:zeta(2) = pi^2/6
  std::cout << "riemann_zeta(2) = " << std::riemann_zeta(2.0) << "\n";
  std::cout << "pi^2/6 = " << pi * pi / 6 << "\n";

  // 椭圆积分
  std::cout << "ellint_1(0, 0.5) = " << std::ellint_1(0.0, 0.5) << "\n";
  std::cout << "ellint_2(0, 0.5) = " << std::ellint_2(0.0, 0.5) << "\n";

  // 指数积分
  std::cout << "expint(1) = " << std::expint(1.0) << "\n";  // 约 0.2194

  return 0;
}
```

### 示例 7:位运算与 `<bit>` 头文件

```cpp
// 文件: bit_operations.cpp
// 演示 C++20 <bit> 头文件
// 编译: g++ -O2 -std=c++20 bit_operations.cpp -o bit_operations
#include <bit>
#include <iostream>

int main() {
  unsigned int x = 0b10110010;

  // 统计 1 的个数(popcount)
  std::cout << "popcount(" << std::hex << x << ") = " << std::popcount(x) << "\n";

  // 前导零个数
  std::cout << "countl_zero(" << std::hex << x << ") = " << std::countl_zero(x) << "\n";

  // 尾随零个数
  std::cout << "countr_zero(" << std::hex << x << ") = " << std::countr_zero(x) << "\n";

  // 是否为 2 的幂
  std::cout << "has_single_bit(8) = " << std::has_single_bit(8u) << "\n";  // true
  std::cout << "has_single_bit(6) = " << std::has_single_bit(6u) << "\n";  // false

  // 向上取整到最近的 2 的幂
  std::cout << "bit_ceil(100) = " << std::bit_ceil(100u) << "\n";  // 128
  std::cout << "bit_floor(100) = " << std::bit_floor(100u) << "\n";  // 64

  // 位宽(表示 x 所需的最少位数)
  std::cout << "bit_width(100) = " << std::bit_width(100u) << "\n";  // 7

  // bit_cast:类型安全的位重新解释(C++20)
  float f = 1.0f;
  auto bits = std::bit_cast<unsigned int>(f);
  std::cout << "bit_cast<float, uint>(1.0f) = 0x" << std::hex << bits << "\n";

  return 0;
}
```

### 示例 8:自定义数值类型与运算符重载

```cpp
// 文件: custom_vector.cpp
// 演示自定义 SIMD 风格的 Vec3 类型
// 编译: g++ -O3 -std=c++17 custom_vector.cpp -o custom_vector
#include <cmath>
#include <iostream>
#include <numeric>

// 三维向量类型
// 使用 expression template 减少临时对象
struct Vec3 {
  float x, y, z;

  // 默认构造
  Vec3() : x(0), y(0), z(0) {}

  // 分量构造
  Vec3(float x, float y, float z) : x(x), y(y), z(z) {}

  // 加法运算符
  Vec3 operator+(const Vec3& rhs) const {
    return Vec3(x + rhs.x, y + rhs.y, z + rhs.z);
  }

  // 减法运算符
  Vec3 operator-(const Vec3& rhs) const {
    return Vec3(x - rhs.x, y - rhs.y, z - rhs.z);
  }

  // 标量乘法
  Vec3 operator*(float s) const {
    return Vec3(x * s, y * s, z * s);
  }

  // 点积
  float dot(const Vec3& rhs) const {
    return x * rhs.x + y * rhs.y + z * rhs.z;
  }

  // 叉积
  Vec3 cross(const Vec3& rhs) const {
    return Vec3(y * rhs.z - z * rhs.y,
                z * rhs.x - x * rhs.z,
                x * rhs.y - y * rhs.x);
  }

  // 模长
  float length() const {
    return std::sqrt(dot(*this));
  }

  // 归一化
  Vec3 normalized() const {
    float len = length();
    return len > 0 ? *this * (1.0f / len) : *this;
  }
};

// 重载输出运算符
std::ostream& operator<<(std::ostream& os, const Vec3& v) {
  return os << "(" << v.x << ", " << v.y << ", " << v.z << ")";
}

int main() {
  Vec3 a(1, 2, 3);
  Vec3 b(4, 5, 6);

  std::cout << "a = " << a << "\n";
  std::cout << "b = " << b << "\n";
  std::cout << "a + b = " << (a + b) << "\n";
  std::cout << "a - b = " << (a - b) << "\n";
  std::cout << "a * 2 = " << (a * 2) << "\n";
  std::cout << "a . b = " << a.dot(b) << "\n";
  std::cout << "a x b = " << a.cross(b) << "\n";
  std::cout << "|a| = " << a.length() << "\n";
  std::cout << "normalize(a) = " << a.normalized() << "\n";

  return 0;
}
```

## 对比分析

### 主流 C++ 数学库对比

| 库          | 类型        | 主要功能             | 性能   | 易用性 | 依赖       | 授权         |
| ----------- | ----------- | -------------------- | ------ | ------ | ---------- | ------------ |
| `<cmath>`   | 标准库      | 基础数学函数         | 中     | 高     | 无         | N/A          |
| `<random>`  | 标准库      | 随机数生成           | 中     | 高     | 无         | N/A          |
| `<complex>` | 标准库      | 复数运算             | 中     | 高     | 无         | N/A          |
| Eigen       | 第三方      | 线性代数             | 高     | 高     | 仅头文件   | MPL2         |
| Armadillo   | 第三方      | 线性代数,MATLAB 风格 | 高     | 高     | LAPACK     | Apache 2.0   |
| Blaze       | 第三方      | 线性代数             | 极高   | 中     | 仅头文件   | BSD          |
| xtensor     | 第三方      | 多维数组,NumPy 风格  | 中     | 高     | 仅头文件   | BSD          |
| Boost.Math  | 第三方      | 特殊函数             | 中     | 中     | Boost      | Boost        |
| GLM         | 第三方      | 图形学数学           | 高     | 高     | 仅头文件   | MIT          |
| FAISS       | 第三方      | 向量检索             | 极高   | 中     | 多依赖     | MIT          |

### 浮点类型对比

| 类型      | 位数 | 精度(十进制位) | 范围                    | 性能(相对) | 适用场景              |
| --------- | ---- | ---------------- | ----------------------- | ----------- | --------------------- |
| half      | 16   | 3.3              | 6.1e-5 ~ 6.5e4          | 慢          | 深度学习存储          |
| bfloat16  | 16   | 2.4              | 1.2e-38 ~ 3.4e38        | 中          | 深度学习计算          |
| float     | 32   | 7.2              | 1.2e-38 ~ 3.4e38        | 快          | 图形学、ML 计算       |
| double    | 64   | 15.9             | 2.2e-308 ~ 1.8e308      | 中          | 科学计算              |
| long double | 80-128 | 18-34          | 视平台                  | 慢          | 高精度计算            |
| __float128 | 128  | 34               | 3.4e-4932 ~ 1.2e4932    | 慢          | 极高精度              |

### 随机数引擎对比

| 引擎                  | 状态大小   | 周期             | 速度   | 质量   | 适用场景           |
| --------------------- | ---------- | ---------------- | ------ | ------ | ------------------ |
| `std::minstd_rand0`   | 4 字节     | $2^{31}-2$       | 极快   | 低     | 教学、低质量需求   |
| `std::mt19937`        | 2.5 KB     | $2^{19937}-1$    | 快     | 高     | 通用               |
| `std::mt19937_64`     | 2.5 KB     | $2^{19937}-1$    | 快     | 高     | 64 位平台通用      |
| `std::ranlux24`       | 100 字节   | $10^{171}$       | 中     | 极高   | 物理模拟           |
| `std::knuth_b`        | 8 字节     | $10^{13}$        | 中     | 中     | 文献示例           |
| xoroshiro128+         | 16 字节    | $2^{128}-1$      | 极快   | 高     | 性能敏感场景       |
| PCG32                 | 16 字节    | $2^{64}$         | 极快   | 高     | 现代替代品         |
| `std::random_device`  | N/A        | N/A              | 慢     | 真随机 | 仅用于种子         |

### 矩阵存储布局对比

| 布局          | 描述                 | BLAS 偏好 | Eigen 默认 | Fortran 默认 | 适用场景         |
| ------------- | -------------------- | --------- | ---------- | ------------ | ---------------- |
| Row-major     | 行连续存储           | 否        | 是         | 否           | C/C++ 风格       |
| Column-major  | 列连续存储           | 是        | 否(可配) | 是           | LAPACK、FORTRAN  |
| Tiles         | 分块存储             | 部分      | 否         | 否           | GPU、深度学习    |
| Hybrid        | 混合(如 ELLPACK)    | 否        | 否         | 否           | 稀疏矩阵         |

### 求和算法对比

| 算法             | 误差上界                                | 复杂度   | 适用场景       |
| ---------------- | --------------------------------------- | -------- | -------------- |
| 朴素求和         | $n \epsilon$                            | $O(n)$   | 一般场景       |
| Kahan 求和       | $2 \epsilon + O(n\epsilon^2)$           | $O(n)$   | 高精度需求     |
| Neumaier 求和    | $2 \epsilon + O(n\epsilon^2)$           | $O(n)$   | 大小数混合     |
| 成对求和         | $O(\epsilon \log n)$                    | $O(n)$   | 分治场景       |
| 任意精度求和     | 任意(取决于精度)                      | $O(n \log n)$ | 极端精度需求 |
| 并行归约求和     | $O(\epsilon \log n)$                    | $O(n/p)$ | 并行场景       |

## 常见陷阱与反模式

### 反模式 1:直接比较浮点数

**事故案例**:某金融系统直接用 `if (a == b)` 比较金额,因舍入误差导致判断失败,引发对账错误。

**根因分析**:浮点数运算引入微小误差,使数学上相等的值在计算机中不相等。例如:

```cpp
double a = 0.1 + 0.2;  // 0.30000000000000004
double b = 0.3;
bool eq = (a == b);    // false
```

**正确做法**:使用相对误差比较:

```cpp
bool approxEqual(double a, double b, double eps = 1e-9) {
  return std::abs(a - b) <= eps * std::max({1.0, std::abs(a), std::abs(b)});
}
```

### 反模式 2:使用 `rand()` 与 `srand()`

**事故案例**:某游戏使用 `rand()` 生成关键随机数,被玩家逆向种子预测,破坏游戏公平性。

**根因分析**:

1. `rand()` 实现质量差,低位常有短周期
2. `srand(time(NULL))` 种子空间小(约 $2^{32}$),可暴力枚举
3. `rand()` 全局状态,多线程不安全

**正确做法**:使用 `<random>` 头文件:

```cpp
std::random_device rd;
std::mt19937_64 gen(rd());
std::uniform_int_distribution<int> dist(0, 100);
int x = dist(gen);
```

### 反模式 3:矩阵乘法的临时对象

**事故案例**:某工程师手写矩阵乘法 `C = A * B`,中间产生 100 个临时矩阵,性能比 Eigen 慢 20 倍。

**根因分析**:朴素运算符重载 `Matrix operator*(const Matrix&, const Matrix&)` 会创建临时对象,且无法融合复杂表达式。

**正确做法**:

1. 使用 Eigen/Blaze 等基于表达式模板的库
2. 自实现时使用 CRTP 或表达式模板
3. 使用惰性求值,在赋值时才计算

### 反模式 4:错误使用 `auto` 与表达式模板

**事故案例**:某工程师用 Eigen 写:

```cpp
auto x = m1 * m2 + m3;  // x 类型为表达式类型,引用临时对象
```

后续访问 `x` 时出现悬空引用。

**根因分析**:Eigen 表达式模板返回的是引用表达式的临时类型,赋值给 `auto` 不会触发求值,临时对象析构后引用失效。

**正确做法**:用具体类型或显式求值:

```cpp
VectorXd x = m1 * m2 + m3;  // 显式类型触发求值
```

### 反模式 5:忽略数值稳定性

**事故案例**:某物理模拟用朴素二次方程求根公式,在判别式接近零时结果严重失真。

**根因分析**:二次方程 $ax^2 + bx + c = 0$ 的标准公式:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

当 $b^2 \gg 4ac$ 时,$-b + \sqrt{b^2 - 4ac}$ 出现灾难性抵消,丢失有效数字。

**正确做法**:使用数值稳定的求根公式:

```cpp
double q = -0.5 * (b + std::copysign(std::sqrt(b * b - 4 * a * c), b));
double x1 = q / a;
double x2 = c / q;
```

### 反模式 6:混淆整数除法与浮点除法

**事故案例**:某计算 `1 / 2` 期望得到 0.5,实际得到 0(整数除法)。

**根因分析**:C++ 中 `1 / 2` 是整数除法,结果截断为整数。

**正确做法**:

```cpp
double x = 1.0 / 2.0;    // 0.5
double y = static_cast<double>(1) / 2;
```

### 反模式 7:使用 `pow(x, 2)` 替代 `x * x`

**事故案例**:某代码用 `pow(x, 2)` 计算平方,性能比 `x * x` 慢 50 倍。

**根因分析**:`pow` 是通用幂函数,内部使用对数与指数运算,远比直接乘法慢。

**正确做法**:

- 平方、立方使用 `x * x`、`x * x * x`
- 小整数幂使用模板递归
- 使用 `std::pow` 仅在指数为非整数时

### 反模式 8:忽略矩阵存储顺序

**事故案例**:某团队从 MATLAB 移植算法到 Eigen,矩阵存储顺序不一致导致结果错误。

**根因分析**:MATLAB 与 LAPACK 默认列主序,Eigen 默认行主序,索引方式不同。

**正确做法**:

```cpp
Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::ColMajor> A;
// 或使用 MatrixXd 默认列主序(Eigen 3.4+ 可配置)
```

### 反模式 9:误用 `std::abs` 与 `fabs`

**事故案例**:某代码对 `int` 使用 `std::abs`,在 `INT_MIN` 时溢出。

**根因分析**:`std::abs(INT_MIN)` 的结果 `INT_MAX + 1` 无法表示,导致未定义行为。

**正确做法**:使用更大类型或手动处理:

```cpp
int safe_abs(int x) {
  if (x == INT_MIN) return INT_MAX;  // 或返回 long long
  return std::abs(x);
}
```

### 反模式 10:忽略 SIMD 对齐

**事故案例**:某 SIMD 代码未对齐数据,导致段错误或性能下降。

**根因分析**:AVX2 的 `_mm256_load_ps` 要求 32 字节对齐,未对齐访问触发段错误;使用 `_mm256_loadu_ps` 虽不报错但性能下降。

**正确做法**:

```cpp
alignas(32) float data[1024];  // 显式对齐
// 或使用对齐分配器
std::vector<float, Eigen::aligned_allocator<float>> vec;
```

## 工程实践

### 数学库选型决策树

```
是否需要矩阵运算?
├── 否 → 标准库 <cmath>/<complex>/<random>
└── 是
    ├── 是否需要 NumPy 风格? → xtensor
    ├── 是否需要 MATLAB 风格? → Armadillo
    ├── 是否需要极致性能? → Blaze 或 Eigen (编译期优化)
    └── 是否需要 GPU 加速? → cuBLAS / cuDNN / MAGMA
```

### 高性能数值代码的最佳实践

1. **选择合适精度**:能用 `float` 不用 `double`,能用 `bfloat16` 不用 `float`
2. **避免分支**:SIMD 内核中分支预测失败代价高
3. **数据对齐**:SIMD 数据需对齐到向量宽度
4. **减少内存分配**:预分配缓冲区,避免热路径 `new`/`delete`
5. **使用表达式模板**:Eigen 等库的延迟求值可避免临时对象
6. **批处理**:多个小操作合并为大操作,提升 BLAS Level 3 占比
7. **使用 BLAS 调用**:不要手写矩阵乘法,调用成熟 BLAS
8. **避免混用 SIMD 标量**:SIMD 与标量交替会引入频繁的 unpack/pack

### 随机数生成最佳实践

```cpp
// 1. 使用现代引擎
std::mt19937_64 gen(std::random_device{}());

// 2. 每个线程独立引擎,避免争用
thread_local std::mt19937_64 tl_gen(std::random_device{}());

// 3. 分布对象可复用
std::normal_distribution<double> normal(0.0, 1.0);

// 4. 跨平台种子:用 seed_seq 而非单值
std::seed_seq seq{rd(), rd(), rd(), rd(), rd()};
std::mt19937_64 gen(seq);

// 5. 并行随机数:使用跳跃或独立引擎
class ParallelRNG {
  std::mt19937_64 gen;
 public:
  ParallelRNG(size_t thread_id, size_t seed) {
    std::seed_seq seq{seed, static_cast<uint64_t>(thread_id)};
    gen.seed(seq);
  }
  uint64_t next() { return gen(); }
};
```

### 浮点数比较的工程模式

```cpp
// 通用近似比较
bool approxEqual(double a, double b, double abs_eps = 1e-9, double rel_eps = 1e-6) {
  double diff = std::abs(a - b);
  if (diff <= abs_eps) return true;
  return diff <= rel_eps * std::max(std::abs(a), std::abs(b));
}

// ULP (Unit in the Last Place) 比较
// 适用于对精度有严格要求的场景
bool almostEqualULP(double a, double b, int max_ulps = 4) {
  if (a == b) return true;
  int64_t ia, ib;
  std::memcpy(&ia, &a, sizeof(ia));
  std::memcpy(&ib, &b, sizeof(ib));
  if ((ia < 0) != (ib < 0)) return false;  // 符号不同
  return std::abs(ia - ib) <= max_ulps;
}
```

### 自定义数值类型的最佳实践

```cpp
// 1. 提供 operator overloading 而非方法
// 2. 使用 constexpr 支持编译期计算
// 3. 提供 noexcept 异常规格
// 4. 显式构造避免隐式转换
// 5. 提供 == 与 != 用于比较
// 6. 提供输出运算符 << 用于调试

struct FixedPoint {
  int32_t value;  // 16.16 定点数
  static constexpr int FRAC_BITS = 16;

  constexpr FixedPoint(int integer, int fraction = 0)
      : value((integer << FRAC_BITS) | (fraction & 0xFFFF)) {}

  constexpr FixedPoint operator+(FixedPoint rhs) const noexcept {
    return FixedPoint{value + rhs.value, true};
  }

  // 内部构造
  constexpr FixedPoint(int32_t v, bool) : value(v) {}

  constexpr bool operator==(FixedPoint rhs) const noexcept {
    return value == rhs.value;
  }
};
```

### GPU 加速数学运算

```cpp
// 使用 CUDA 加速矩阵乘法(伪代码)
__global__ void matmul_kernel(const float* A, const float* B, float* C, int N) {
  int row = blockIdx.y * blockDim.y + threadIdx.y;
  int col = blockIdx.x * blockDim.x + threadIdx.x;
  if (row < N && col < N) {
    float sum = 0.0f;
    for (int k = 0; k < N; ++k) {
      sum += A[row * N + k] * B[k * N + col];
    }
    C[row * N + col] = sum;
  }
}

// 主机端调用
void matmul_cuda(const float* A, const float* B, float* C, int N) {
  dim3 block(16, 16);
  dim3 grid((N + 15) / 16, (N + 15) / 16);
  matmul_kernel<<<grid, block>>>(A, B, C, N);
  cudaDeviceSynchronize();
}

// 更高级:使用 cuBLAS
#include <cublas_v2.h>
void matmul_cublas(cublasHandle_t handle, const float* A, const float* B,
                   float* C, int N) {
  const float alpha = 1.0f, beta = 0.0f;
  cublasSgemm(handle, CUBLAS_OP_N, CUBLAS_OP_N,
              N, N, N, &alpha, A, N, B, N, &beta, C, N);
}
```

### 数值稳定性测试

```cpp
// 单元测试应包含数值稳定性测试
TEST(NumericStability, QuadraticRoot) {
  // 标准公式失败的场景
  double a = 1.0, b = 1e8, c = 1.0;

  auto [x1, x2] = stableQuadraticRoot(a, b, c);
  EXPECT_NEAR(x1 + x2, -b / a, 1e-6);
  EXPECT_NEAR(x1 * x2, c / a, 1e-6);
}

TEST(NumericStability, SumAccuracy) {
  std::vector<double> data(1'000'000, 1e-10);
  data[0] = 1.0;

  double exact = 1.0 + 999999 * 1e-10;
  double kahan = kahanSum(data);
  double naive = naiveSum(data);

  EXPECT_NEAR(kahan, exact, 1e-15);
  // 朴素求和可能显著偏离
}
```

## 案例研究

### 案例 1:Google 的 `gemmlowp` 低精度矩阵乘法

Google 为 TensorFlow 开发 `gemmlowp` 库,针对 8 位整数矩阵乘法优化:

- **背景**:深度学习推理可使用 8 位量化,但传统 BLAS 仅优化浮点
- **关键创新**:
  - 内核针对 8 位 SIMD 优化,一次处理 32 个 8 位乘加
  - 基于 AVX2 / NEON 的内联汇编内核
  - 缓存友好的分块策略
- **性能**:在 Intel Haswell 上达到峰值 80% 性能,比 FP32 快 3-4 倍
- **影响**:使移动端深度学习推理成为可能

### 案例 2:Meta 的 Vectorized 数学库

Meta(原 Facebook)开发 Folly 库,其中包含向量化数学函数:

- **背景**:深度学习与传统数值计算需要 SIMD 加速的 `exp`、`log`、`sin` 等
- **实现**:
  - 基于 SLEEF 库的 SIMD 数学函数
  - 优化后的多项式逼近
  - 范围归约减少主值域外计算
- **性能**:AVX2 上 8 个 double 同时计算,比标量快 4-6 倍
- **应用**:Facebook 推荐、广告系统

### 案例 3:Eigen 在 TensorFlow 中的使用

Google TensorFlow 早期版本使用 Eigen 作为 CPU 后端:

- **优势**:
  - 仅头文件,无依赖
  - 表达式模板自动融合操作
  - 跨平台 SIMD 优化
- **劣势**:
  - 编译时间长(模板展开)
  - 调试困难(模板错误信息)
- **演进**:TensorFlow 2.x 转向 OneDNN(原 MKL-DNN)获取更好性能

### 案例 4:PyTorch 的 ATen 库

PyTorch 的 ATen(A Tensor Library)是 C++ 后端:

- **设计**:
  - 支持 CPU/CUDA/TPU 后端
  - 动态分发(运行时选择后端)
  - 自动微分集成
- **性能**:
  - 调用 cuBLAS/MKL 实现核心运算
  - 自定义 CUDA 内核处理特殊操作
  - 张量融合减少内存访问
- **影响**:使 PyTorch 既有 Python 易用性,又有 C++ 性能

### 案例 5:NAG 数值库的工程实践

Numerical Algorithms Group(NAG)提供高质量数值库:

- **特点**:
  - 经过严格数值稳定性测试
  - 文档详尽,标注算法来源与适用条件
  - 跨平台支持,从超算到嵌入式
- **价值**:在金融、制药、航空航天等领域,数值可靠性高于性能
- **对比**:开源库(Eigen、LAPACK)更注重性能与通用性,NAG 注重可信度

### 案例 6:Blaze 在量化金融中的应用

某量化基金使用 Blaze 库构建因子计算框架:

- **需求**:每秒处理 100 万笔交易,实时计算 200+ 因子
- **设计**:
  - Blaze 表达式模板融合因子表达式
  - 缓存友好的列主序存储
  - SIMD 与多线程自动并行
- **结果**:比原 NumPy + Pandas 方案快 15 倍,延迟从 50ms 降至 3ms

## 习题

### 基础题

**题 1**: 解释 IEEE 754 双精度浮点数的 64 位结构,并指出机器精度。

**参考答案要点**:

- 1 位符号 + 11 位指数 + 52 位尾数
- 偏移 $E_{bias} = 1023$
- 机器精度 $\epsilon_{mach} = 2^{-53} \approx 2.22 \times 10^{-16}$

**题 2**: 列举 3 种 C++ 标准库提供的数学头文件。

**参考答案要点**:

- `<cmath>`:基础数学函数
- `<complex>`:复数运算
- `<random>`:随机数生成
- `<numeric>`:数值算法
- `<numbers>`:数学常量(C++20)
- `<bit>`:位运算(C++20)

**题 3**: 解释条件数的概念及其对数值稳定性的影响。

**参考答案要点**:

- 条件数 $\kappa$ 刻画输入扰动对输出的放大程度
- 高条件数($\kappa \gg 1$)问题为"病态",结果不可靠
- 若 $\kappa = 10^k$,则结果约丢失 $k$ 位有效数字

### 进阶题

**题 4**: 阅读以下代码,分析其问题并修正。

```cpp
double sum = 0;
for (int i = 0; i < 1000000; ++i) {
  sum += 0.1;
}
// 期望 sum == 100000,实际?
```

**参考答案要点**:

- 问题:`0.1` 在二进制浮点中无法精确表示,累加 100 万次误差放大
- 修正 1:使用 Kahan 求和
- 修正 2:使用整数累加后除:`sum = (i + 1) / 10.0`
- 修正 3:使用 `std::decimal`(C++23 提案)或第三方十进制库

**题 5**: 比较 Mersenne Twister 与 PCG32 的优缺点。

**参考答案要点**:

- MT19937:
  - 优点:周期长($2^{19937}-1$),质量高,标准化
  - 缺点:状态大(2.5KB),缓存不友好,种子空间小
- PCG32:
  - 优点:状态小(16 字节),速度快,质量优秀
  - 缺点:周期短($2^{64}$),相对较新

**题 6**: 解释表达式模板如何避免矩阵运算的临时对象。

**参考答案要点**:

- 表达式模板将 `A + B * C` 编码为类型 `MatAdd<Mat, MatMul<Mat, Mat>>`
- 编译期构建 AST,不立即求值
- 赋值时一次性遍历,计算 `result[i,j] = A[i,j] + B[i,k] * C[k,j]`
- 避免中间 `B*C` 临时矩阵的分配与内存访问
- 副作用:编译时间长,错误信息复杂

### 挑战题

**题 7**: 设计一个支持 `float`、`double`、`bfloat16` 三种精度的通用矩阵类。

**参考答案要点**:

```cpp
template <typename T>
concept Numeric = std::floating_point<T> || std::integral<T>;

template <Numeric T, int Rows, int Cols>
class Matrix {
  std::array<T, Rows * Cols> data_;

 public:
  constexpr T& operator()(int i, int j) { return data_[i * Cols + j]; }
  constexpr T operator()(int i, int j) const { return data_[i * Cols + j]; }

  template <Numeric U>
  auto operator+(const Matrix<U, Rows, Cols>& rhs) const {
    Matrix<std::common_type_t<T, U>, Rows, Cols> result;
    for (int i = 0; i < Rows * Cols; ++i) {
      result.data_[i] = data_[i] + rhs.data_[i];
    }
    return result;
  }
};

// 类型别名
using MatrixF = Matrix<float, 3, 3>;
using MatrixD = Matrix<double, 3, 3>;
```

关键点:

- 用 concept 约束模板参数
- `std::common_type_t` 处理混合精度
- 提供 `constexpr` 支持编译期计算

**题 8**: 实现一个并行蒙特卡洛积分,计算 $\int_0^1 f(x) dx$,要求使用多线程并保证结果可重现。

**参考答案要点**:

```cpp
double parallelMonteCarlo(std::function<double(double)> f, double a, double b,
                          size_t samples, size_t num_threads) {
  double total = 0.0;
  std::vector<std::thread> threads;
  std::vector<double> partials(num_threads, 0.0);

  auto worker = [&](size_t tid) {
    // 每线程独立随机数引擎,种子可重现
    std::mt19937_64 gen(tid * 12345 + 42);
    std::uniform_real_distribution<double> dist(a, b);

    double sum = 0.0;
    size_t per_thread = samples / num_threads;
    for (size_t i = 0; i < per_thread; ++i) {
      sum += f(dist(gen));
    }
    partials[tid] = sum;
  };

  for (size_t t = 0; t < num_threads; ++t) {
    threads.emplace_back(worker, t);
  }
  for (auto& th : threads) th.join();

  for (auto p : partials) total += p;
  return (b - a) * total / samples;
}
```

**题 9**: 论述在以下场景中,你会选择何种数学库,并说明理由。

- 场景 A:嵌入式设备的姿态解算(IMU)
- 场景 B:云服务器的推荐系统训练
- 场景 C:工作站上的物理仿真软件

**参考答案要点**:

- A:GLM 或自实现,体积小、无依赖、定点运算支持
- B:cuBLAS + cuDNN,GPU 加速、批量处理
- C:Eigen + LAPACK,CPU 多核优化、丰富功能、稳定可靠

**题 10**: 阅读以下矩阵乘法代码,识别性能问题并优化。

```cpp
Matrix multiply(const Matrix& A, const Matrix& B) {
  Matrix C(A.rows(), B.cols());
  for (int i = 0; i < A.rows(); ++i) {
    for (int j = 0; j < B.cols(); ++j) {
      for (int k = 0; k < A.cols(); ++k) {
        C(i, j) += A(i, k) * B(k, j);  // 频繁缓存未命中
      }
    }
  }
  return C;
}
```

**参考答案要点**:

问题:

1. 内层循环 `k` 访问 `B(k, j)` 跨行跳跃,缓存不友好
2. 返回值可能触发拷贝(虽然 RVO 通常优化)

优化方案:

1. **交换循环顺序**:i-k-j,使 `B(k, j)` 在 k 维连续
2. **分块**:按 BLOCK_SIZE 分块,提升缓存命中率
3. **SIMD**:对内层循环向量化
4. **使用 BLAS**:调用 `cblas_dgemm` 替代手写

```cpp
void multiplyOptimized(const Matrix& A, const Matrix& B, Matrix& C) {
  constexpr int BLOCK = 64;
  int M = A.rows(), N = B.cols(), K = A.cols();

  for (int ii = 0; ii < M; ii += BLOCK) {
    for (int kk = 0; kk < K; kk += BLOCK) {
      for (int jj = 0; jj < N; jj += BLOCK) {
        // 子块乘法,i-k-j 顺序
        for (int i = ii; i < std::min(ii + BLOCK, M); ++i) {
          for (int k = kk; k < std::min(kk + BLOCK, K); ++k) {
            double aik = A(i, k);
            for (int j = jj; j < std::min(jj + BLOCK, N); ++j) {
              C(i, j) += aik * B(k, j);
            }
          }
        }
      }
    }
  }
}
```

## 参考文献

[1] Overton, M. L. 2001. Numerical Computing with IEEE Floating Point Arithmetic. Society for Industrial and Applied Mathematics. ISBN: 978-0898715715. DOI: https://doi.org/10.1137/1.9780898718072

[2] Higham, N. J. 2002. Accuracy and Stability of Numerical Algorithms, 2nd edition. Society for Industrial and Applied Mathematics. ISBN: 978-0898715217. DOI: https://doi.org/10.1137/1.9780898718027

[3] Golub, G. H. and Van Loan, C. F. 2013. Matrix Computations, 4th edition. Johns Hopkins University Press. ISBN: 978-1421407944.

[4] Dongarra, J. J., Croz, J. D., Hammarling, S., and Duff, I. S. 1990. A set of level 3 basic linear algebra subprograms. ACM Transactions on Mathematical Software (TOMS), 16(1), 1-17. DOI: https://doi.org/10.1145/77626.79170

[5] Lawson, C. L., Hanson, R. J., Kincaid, D. R., and Krogh, F. T. 1979. Basic linear algebra subprograms for Fortran usage. ACM Transactions on Mathematical Software (TOMS), 5(3), 308-323. DOI: https://doi.org/10.1145/355841.355847

[6] Anderson, E., Bai, Z., Bischof, C., Blackford, S., Demmel, J., Dongarra, J., Du Croz, J., Greenbaum, A., Hammarling, S., McKenney, A., and Sorensen, D. 1999. LAPACK Users' Guide, 3rd edition. Society for Industrial and Applied Mathematics. ISBN: 978-0898714470. DOI: https://doi.org/10.1137/1.9780898719604

[7] Guennebaud, G., Jacob, B., et al. 2010. Eigen v3. Available: http://eigen.tuxfamily.org

[8] Veldhuizen, T. 1998. Arrays in Blitz++. In Proceedings of the 2nd International Scientific Computing in Object-Oriented Parallel Environments (ISCOPE '98), 223-230. Springer. DOI: https://doi.org/10.1007/3-540-49372-7_24

[9] Matsumoto, M. and Nishimura, T. 1998. Mersenne twister: a 623-dimensionally equidistributed uniform pseudo-random number generator. ACM Transactions on Modeling and Computer Simulation (TOMACS), 8(1), 3-30. DOI: https://doi.org/10.1145/272991.272995

[10] O'Neill, M. E. 2014. PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation. Harvey Mudd College. Available: https://www.pcg-random.org/pdf/hmc-cs-2014-0905.pdf

[11] Hennessy, J. L. and Patterson, D. A. 2017. Computer Architecture: A Quantitative Approach, 6th edition. Morgan Kaufmann. ISBN: 978-0128119051.

[12] Cooley, J. W. and Tukey, J. W. 1965. An algorithm for the machine calculation of complex Fourier series. Mathematics of Computation, 19(90), 297-301. DOI: https://doi.org/10.1090/S0025-5718-1965-0178586-1

[13] Kahan, W. 1965. Pracniques: further remarks on reducing truncation errors. Communications of the ACM, 8(1), 40. DOI: https://doi.org/10.1145/363707.363723

[14] Neumaier, A. 1974. Rundungsfehleranalyse einiger Verfahren zur Summation endlicher Summen. Zeitschrift für Angewandte Mathematik und Mechanik, 54(1), 39-51. DOI: https://doi.org/10.1002/zamm.19740540106

[15] IEEE Computer Society. 2019. IEEE Standard for Floating-Point Arithmetic. IEEE Std 754-2019. DOI: https://doi.org/10.1109/IEEESTD.2019.8766229

[16] ISO/IEC 14882:2023. Information technology — Programming languages — C++. International Organization for Standardization. Available: https://www.iso.org/standard/83626.html

[17] Demmel, J. and Nguyen, H. D. 2015. Parallel reproducible accumulation. IEEE Transactions on Computers, 64(7), 2060-2073. DOI: https://doi.org/10.1109/TC.2014.2345613

[18] Iglberger, K., Hager, G., Treibig, J., and Rüde, U. 2012. Expression templates revisited: A performance analysis of current methodologies. SIAM Journal on Scientific Computing, 34(2), C42-C69. DOI: https://doi.org/10.1137/110830125

[19] Goto, K. and van de Geijn, R. 2008. Anatomy of high-performance matrix multiplication. ACM Transactions on Mathematical Software (TOMS), 34(3), 1-25. DOI: https://doi.org/10.1145/1356052.1356053

[20] Hennessy, J. L. and Patterson, D. A. 2019. A New Golden Age for Computer Architecture. Communications of the ACM, 62(2), 48-60. DOI: https://doi.org/10.1145/3282307

## 延伸阅读

### 官方文档

- C++ Reference `<cmath>`: https://en.cppreference.com/w/cpp/header/cmath
- C++ Reference `<random>`: https://en.cppreference.com/w/cpp/header/random
- C++ Reference `<numeric>`: https://en.cppreference.com/w/cpp/header/numeric
- C++ Reference `<numbers>`: https://en.cppreference.com/w/cpp/header/numbers
- Eigen Documentation: https://eigen.tuxfamily.org/dox/
- Armadillo Documentation: http://arma.sourceforge.net/docs.html
- Blaze Documentation: https://bitbucket.org/blaze-lib/blaze/wiki/Home
- cuBLAS Documentation: https://docs.nvidia.com/cuda/cublas/
- Intel oneAPI Math Kernel Library: https://www.intel.com/content/www/us/en/developer/tools/oneapi/onemkl.html

### 经典教材

- 《Numerical Recipes: The Art of Scientific Computing》,William H. Press 等
- 《Accuracy and Stability of Numerical Algorithms》,Nicholas J. Higham
- 《Matrix Computations》,Gene H. Golub, Charles F. Van Loan
- 《IEEE Floating Point Arithmetic》,Michael L. Overton
- 《Numerical Linear Algebra》,Lloyd N. Trefethen, David Bau
- 《Applied Numerical Linear Algebra》,James W. Demmel
- 《Introduction to Numerical Analysis》,J. Stoer, R. Bulirsch

### 前沿论文与演讲

- Todd Veldhuizen, "Expression Templates", C++ Report, 1995
- Todd Veldhuizen, "Techniques for Scientific C++", Indiana University, 2012
- Kenneth Iglberger et al., "Expression Templates Revisited", SIAM SISC, 2012
- Matsumoto & Nishimura, "Mersenne Twister", TOMACS, 1998
- Melissa O'Neill, "PCG Random Number Generator", HMC, 2014
- James Demmel, "Reproducible Floating-Point Computation", IEEE TC, 2015

### 开源项目源码

- Eigen: https://gitlab.com/libeigen/eigen
- Armadillo: https://gitlab.com/conradsnicta/armadillo-code
- Blaze: https://bitbucket.org/blaze-lib/blaze
- xtensor: https://github.com/xtensor-stack/xtensor
- glm: https://github.com/g-truc/glm
- Fastor: https://github.com/romeric/Fastor
- SLEEF: https://github.com/shibatch/sleef
- xsimd: https://github.com/xtensor-stack/xsimd

### 数值计算社区资源

- Netlib Repository: https://www.netlib.org/
- ACM Transactions on Mathematical Software: https://tomacm.acm.org/
- SIAM Journal on Scientific Computing: https://www.siam.org/journals/sisc.php
- Boost.Math: https://www.boost.org/doc/libs/release/libs/math/
- GSL (GNU Scientific Library): https://www.gnu.org/software/gsl/
- NAG Library: https://www.nag.com/

### 在线课程

- MIT 18.330 Introduction to Numerical Analysis: https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/
- Stanford CME 108: https://web.stanford.edu/class/cme108/
- Coursera: Matrix Methods in Data Analysis, Signal Processing, and Machine Learning (Gilbert Strang)
- edX: Numerical Methods for Engineers
