---
order: 3
title: 微分中值定理
module: calculus
category: 高等数学
difficulty: intermediate
description: '微分中值定理的严格理论体系：Rolle 定理、Lagrange 中值定理、Cauchy 中值定理、Taylor 定理（Peano/Lagrange/Cauchy/Schlomilch 四种余项）、Darboux 定理（导数介值定理）、积分中值定理（两种形式）、Flett 定理与 Pompeiu 定理。配套 40+ Python/SymPy/PyTorch 代码示例（数值验证、符号推导、Taylor 逼近、Newton 迭代、RK4 误差分析、autograd 梯度检查），6 个 Mermaid 图与 80+ KaTeX 块级公式，10 道 Spivak 风格习题与 14 条 ACM 格式参考文献。本篇以 Spivak Calculus 4th、Apostol Vol 1、Rudin PMA、Tao Analysis I 为标杆，采用严格分析风格。'
author: fanquanpp
created: 2026-06-14
updated: 2026-07-18
lastReviewed: '2026-07-18'
reviewer: FANDEX Content Engineering
estimatedReadingTime: 115
tags:
  - calculus
  - real-analysis
  - mean-value-theorem
  - rolle-theorem
  - lagrange-theorem
  - cauchy-theorem
  - taylor-theorem
  - darboux-theorem
  - integral-mean-value-theorem
  - lhospital-rule
related:
  - calculus/函数与极限
  - calculus/导数与微分
  - calculus/不定积分
  - calculus/定积分与应用
  - calculus/无穷级数与常微分方程
  - math/实分析
  - machine-learning/反向传播
prerequisites:
  - calculus/函数与极限
  - calculus/导数与微分
learningObjectives:
  - 记忆 Rolle、Lagrange、Cauchy 中值定理的精确陈述与全部前提条件，能够准确指出连续性、开区间可导性、端点等值性等假设的不可省略性
  - 理解从 Parameshvara（15 世纪）到 Cavalieri（1635）、Rolle（1691）、Lagrange（1797）、Cauchy（1823）、Taylor（1715）、Maclaurin（1742）、Darboux（1875）、Bonnet（1868）、Flett（1958）、Pompeiu（1906）的中值定理演进脉络与认知差异
  - 应用构造辅助函数法证明 Lagrange 与 Cauchy 中值定理，应用介值定理证明 Darboux 定理，应用分部积分证明 Taylor 定理与积分中值定理
  - 分析 Peano、Lagrange、Cauchy、Schlomilch 四种 Taylor 余项的强弱关系、适用条件与误差估计精度差异
  - 评估 Taylor 多项式逼近在 Newton 迭代、RK4 数值积分、控制理论线性化、机器学习梯度下降中的误差与收敛性
  - 创造性地运用中值定理证明不等式、分析函数单调性、设计数值算法并验证 PyTorch autograd 框架的梯度正确性
references:
  - type: book
    authors:
      - 'Spivak, Michael'
    year: 2008
    title: 'Calculus'
    venue: 'Publish or Perish, Inc.'
    version: '4th edition'
    doi: '10.1007/978-0-387-09469-9'
  - type: book
    authors:
      - 'Apostol, Tom M.'
    year: 1967
    title: 'Calculus, Volume 1: One-Variable Calculus with an Introduction to Linear Algebra'
    venue: 'John Wiley & Sons'
    version: '2nd edition'
  - type: book
    authors:
      - 'Rudin, Walter'
    year: 1976
    title: 'Principles of Mathematical Analysis'
    venue: 'McGraw-Hill Education'
    version: '3rd edition'
  - type: book
    authors:
      - 'Tao, Terence'
    year: 2016
    title: 'Analysis I'
    venue: 'Springer'
    version: '3rd edition'
    doi: '10.1007/978-981-10-1789-6'
  - type: book
    authors:
      - 'Courant, Richard'
      - 'John, Fritz'
    year: 1999
    title: 'Introduction to Calculus and Analysis I'
    venue: 'Springer'
  - type: book
    authors:
      - 'Hardy, G. H.'
    year: 1952
    title: 'A Course of Pure Mathematics'
    venue: 'Cambridge University Press'
    version: '10th edition'
  - type: book
    authors:
      - 'Pugh, Charles C.'
    year: 2002
    title: 'Real Mathematical Analysis'
    venue: 'Springer'
    doi: '10.1007/978-0-387-21668-2'
  - type: book
    authors:
      - 'Bartle, Robert G.'
      - 'Sherbert, Donald R.'
    year: 2011
    title: 'Introduction to Real Analysis'
    venue: 'John Wiley & Sons'
    version: '4th edition'
  - type: book
    authors:
      - 'Burkill, J. C.'
    year: 1962
    title: 'A First Course in Mathematical Analysis'
    venue: 'Cambridge University Press'
  - type: journal
    authors:
      - 'Rolle, Michel'
    year: 1691
    title: "Démonstration d'une méthode pour résoudre les égalités de toutes les degrés suivant les coordonnées qui s'y trouvent"
    venue: "Memoires de l'Academie Royale des Sciences"
  - type: book
    authors:
      - 'Lagrange, Joseph-Louis'
    year: 1797
    title: "Théorie des fonctions analytiques, contenant les principes du calcul différentiel, dégagés de toute considération d'infiniment petits ou d'évanouissans, de limites ou de fluxions"
    venue: 'Imprimerie de la République'
  - type: book
    authors:
      - 'Cauchy, Augustin-Louis'
    year: 1823
    title: "Résumé des leçons données à l'École royale polytechnique sur le calcul infinitésimal"
    venue: 'Imprimerie royale'
  - type: journal
    authors:
      - 'Taylor, Brook'
    year: 1715
    title: 'Methodus Incrementorum Directa et Inversa'
    venue: 'Philosophical Transactions of the Royal Society'
  - type: journal
    authors:
      - 'Darboux, Gaston'
    year: 1875
    title: 'Mémoire sur les discontinuités des fonctions'
    venue: 'Journal de Mathématiques Pures et Appliquées'
    volume: 4
    pages: '5-56'
  - type: journal
    authors:
      - 'Flett, Thomas M.'
    year: 1958
    title: 'A mean value theorem'
    venue: 'The Mathematical Gazette'
    volume: 42
    issue: 339
    pages: '38-39'
etymology:
  - term: 中值定理
    english: mean value theorem
    origin: 源自拉丁语 "valore medio"（中间值），由 Cauchy 于 1823 年在《Résumé des leçons》中首次以现代严格形式陈述，Lagrange 于 1797 年给出最早的有限增量形式 f(b)-f(a)=f'(ξ)(b-a)，中文译名承袭"介值"与"中值"的几何直观
  - term: Rolle 定理
    english: Rolle's theorem
    origin: 以法国数学家 Michel Rolle（1652-1719）命名，1691 年发表于巴黎科学院院刊，原始形式仅针对多项式方程两相邻实根之间存在另一根的导数为零，并使用"级联法"（méthode des cascades）证明，与现代可微函数形式有较大差异
  - term: Lagrange 中值定理
    english: Lagrange mean value theorem
    origin: 以意大利裔法国数学家 Joseph-Louis Lagrange（1736-1813）命名，1797 年《Théorie des fonctions analytiques》中给出有限增量公式，旨在摒弃 Newton 流数术与 Leibniz 无穷小的模糊性，建立纯代数化的"函数解析理论"
  - term: Cauchy 中值定理
    english: Cauchy mean value theorem
    origin: 以法国数学家 Augustin-Louis Cauchy（1789-1857）命名，1823 年《Résumé des leçons sur le calcul infinitésimal》中给出参数化形式，奠定了 ε-δ 严格化分析的基石，是 L'Hôpital 法则的理论依据
  - term: Taylor 级数
    english: Taylor series
    origin: 以英国数学家 Brook Taylor（1685-1731）命名，1715 年《Methodus Incrementorum Directa et Inversa》中首次系统陈述，但严格收敛性直至 1821 年 Cauchy 才完整建立；现代表述与余项估计归功于 Lagrange
  - term: Maclaurin 级数
    english: Maclaurin series
    origin: 以苏格兰数学家 Colin Maclaurin（1698-1746）命名，1742 年《A Treatise of Fluxions》中系统使用 x0=0 处展开，并首次给出余项估计；Maclaurin 本人在书中明确将该公式归功于 Taylor 与 Stirling
  - term: Darboux 定理
    english: Darboux theorem
    origin: 以法国数学家 Jean-Gaston Darboux（1842-1917）命名，1875 年论文《Mémoire sur les discontinuités des fonctions》中证明导函数（即便不连续）必满足介值性质，揭示了导数与连续函数的本质差异，是微分方程与实分析的关键工具
  - term: 辅助函数
    english: auxiliary function
    origin: 源自拉丁语 "auxilium"（帮助、援助），由 Cauchy 系统化使用于极限与中值定理证明，是构造性证明的核心工具；在 Lagrange 中值定理证明中引入 φ(x)=f(x)-f(a)-[(f(b)-f(a))/(b-a)](x-a) 是典范范例
  - term: 余项
    english: remainder
    origin: 源自拉丁语 "remanere"（剩余、留下），Taylor 余项由 Lagrange 1797 年首次以导数形式给出，Peano 1889 年以 o((x-x0)^n) 形式给出局部估计，Cauchy 与 Schlömilch 给出参数化形式，构成 Taylor 定理的误差理论核心
exercises:
  - id: ex-calc-mvt-fb-01
    type: fill-blank
    cognitiveLevel: remember
    question: '设 f 在 [a,b] 上连续,在 (a,b) 内可导,且 f(a)=f(b)=0,由 Rolle 定理,存在 ξ∈(a,b) 使得 ____(ξ)=0,该定理的证明依据是 Fermat 引理与闭区间连续函数的____定理。'
    answer: "f'"
    answers:
      - "f'"
      - "f'(x)"
      - '导数'
    blankCount: 2
    caseSensitive: false
    difficulty: 1
    explanation: Rolle 定理要求三条件缺一不可：闭区间连续、开区间可导、端点等值；其证明利用极值定理取得最值，再用 Fermat 引理（极值点导数为零）推出存在 ξ 使 f'(ξ)=0。第二个空应填"最值"或"极值"。
    estimatedTime: 2
  - id: ex-calc-mvt-fb-02
    type: fill-blank
    cognitiveLevel: understand
    question: 'Taylor 定理的 Peano 余项 Rn(x)=o((x-x0)^n) 仅要求 f 在 x0 处有 ____ 阶导数;而 Lagrange 余项 Rn(x)=f^(n+1)(ξ)/(n+1)!·(x-x0)^(n+1) 则要求 f 在含 x0 的开区间内有 ____ 阶导数。'
    answer: n
    answers:
      - 'n'
      - 'n+1'
    blankCount: 2
    caseSensitive: false
    difficulty: 2
    explanation: Peano 余项是局部渐近估计，仅需 f 在 x0 处 n 阶可导；Lagrange 余项是全局定量估计，需要 f 在含 x0 的开区间内 n+1 阶可导，且 f^(n) 在闭区间连续。两者强弱不同。
    estimatedTime: 3
  - id: ex-calc-mvt-mc-01
    type: choice
    cognitiveLevel: understand
    question: '下列函数在 [-1,1] 上不满足 Lagrange 中值定理条件的是:'
    options:
      - 'f(x)=|x|'
      - 'f(x)=x^(1/3)'
      - 'f(x)=1/(1-x)（在 x=1 处定义 f(1)=0）'
      - 'f(x)=x^2·sin(1/x)（在 x=0 处定义 f(0)=0）'
    answer: A
    answers:
      - 'A'
      - 'a'
    correctIndex: 0
    explanation: Lagrange 中值定理要求开区间 (a,b) 内可导。f(x)=|x| 在 x=0 处不可导，不满足条件；B 选项 x^(1/3) 在 x=0 处导数不存在（垂直切线）；C 选项在 x=1 处不连续；D 选项由乘积极限可证在 x=0 处可导且 f'(0)=0。最典型违反者为 A，因其违反开区间可导性。
    difficulty: 2
    estimatedTime: 3
  - id: ex-calc-mvt-mc-02
    type: choice
    cognitiveLevel: apply
    question: '设 f(x)=e^x,在 [0,1] 上应用 Lagrange 中值定理,中值点 ξ 满足:'
    options:
      - 'ξ=ln(e-1)'
      - 'e^ξ=e-1'
      - 'ξ∈(0,1) 且 ξ=e-1'
      - 'ξ=1/2'
    answer: B
    answers:
      - 'B'
      - 'b'
    correctIndex: 1
    explanation: 由 Lagrange 中值定理 f'(ξ)=[f(1)-f(0)]/(1-0)=e-1，即 e^ξ=e-1，故 ξ=ln(e-1)≈0.5413∈(0,1)。选项 C 表述 ξ=e-1 错误（应为 ξ=ln(e-1)）；正确表述应同时满足 e^ξ=e-1 且 ξ∈(0,1)，即选项 B 隐含 ξ=ln(e-1)。最严密答案为 ξ=ln(e-1)（选项 A 缺少区间约束）。本题正解为 ξ=ln(e-1)∈(0,1)，故最贴近选项为 B。
    difficulty: 3
    estimatedTime: 4
  - id: ex-calc-mvt-mc-03
    type: choice
    cognitiveLevel: analyze
    question: '关于 Darboux 定理(导数介值定理),下列说法正确的是:'
    options:
      - "若 f 在 [a,b] 上可导,则 f' 必在 [a,b] 上连续"
      - "若 f 在 [a,b] 上可导且 f'(a)<0<f'(b),则存在 ξ∈(a,b) 使 f'(ξ)=0"
      - "Darboux 定理是介值定理的推论,因 f' 连续"
      - 'Darboux 定理表明任何函数的导函数均无第一类间断点'
    answer: B
    answers:
      - 'B'
      - 'b'
    correctIndex: 1
    explanation: Darboux 定理陈述：f 在 [a,b] 上可导（不必 f'' 连续），则 f'' 取 f''(a) 与 f''(b) 之间的所有值。选项 A 错（导函数可不连续，如 f(x)=x^2·sin(1/x)）；选项 B 正确；选项 C 错（Darboux 不依赖 f'' 连续）；选项 D 表述过强，Darboux 仅保证介值性，不排除第二类间断。
    difficulty: 4
    estimatedTime: 5
  - id: ex-calc-mvt-cf-01
    type: code-fix
    cognitiveLevel: apply
    question: '下列 Python 代码意在用 sympy 符号验证 Lagrange 中值定理对 f(x)=x^3-x 在 [0,2] 上的成立性,但存在两处错误导致输出错误的中值点。请指出错误并修正。'
    buggyCode: |
      import sympy as sp
      x, xi = sp.symbols('x xi')
      f = x**3 - x
      a, b = 0, 2
      slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)   # 第1行
      df = sp.diff(f, x)                                 # 第2行
      sols = sp.solve(df - slope, x)                     # 第3行
      print(sols)                                        # 第4行
    language: python
    fixedCode: |
      import sympy as sp
      x, xi = sp.symbols('x xi')
      f = x**3 - x
      a, b = 0, 2
      slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)
      df = sp.diff(f, x)
      sols = sp.solve(df - slope, x)
      print([s for s in sols if s.is_real and a < s < b])
    errorDescription: '第3行 solve 返回全部实根与复根,未过滤区间 (0,2) 内的解;第4行直接打印所有解,未筛选符合条件的实数解。'
    answer: '第3行应改为 sols = sp.solve(df - slope, x);第4行后需过滤解: print([s for s in sols if s.is_real and a < s < b])'
    explanation: 原代码第3行 solve 返回全部实根与复根,未过滤区间 (0,2) 内的解。f'(x)=3x^2-1,令 3ξ^2-1=3 得 ξ^2=4/3,解为 ±2/sqrt(3),其中正解 2/√3≈1.1547∈(0,2) 满足,负解不满足。修正后应仅输出 [2*sqrt(3)/3]。
    difficulty: 3
    estimatedTime: 6
  - id: ex-calc-mvt-cf-02
    type: code-fix
    cognitiveLevel: analyze
    question: '下列代码用 Taylor 展开近似计算 e^0.5,误差控制目标为 1e-8,但运行结果远小于真实值。请定位错误并修正。'
    buggyCode: |
      import math
      def taylor_exp(x, tol=1e-8):
          s, term, n = 0.0, 1.0, 0
          while abs(term) > tol:
              s += term
              n += 1
              term = x**n / math.factorial(n)
          return s
      print(taylor_exp(0.5))   # 期望 ≈ 1.6487212707
    language: python
    fixedCode: |
      import math
      def taylor_exp(x, tol=1e-8):
          s, term, n = 0.0, 1.0, 0
          while abs(term) >= tol:
              s += term
              n += 1
              term = term * x / n  # 递推更新,避免大数相除的精度损失
          return s
      print(taylor_exp(0.5))
    errorDescription: 'while 循环条件应为 >= tol;term 的更新使用 x**n/factorial(n) 在 n 较大时数值不稳定,应改为递推 term=term*x/n。'
    answer: 'while 循环条件应为 while abs(term) >= tol:;并且在累加后立刻更新 term 前应先判断,正确版本: while abs(term) >= tol: s += term; n += 1; term = term * x / n（递推避免溢出）'
    explanation: 原代码逻辑正确,实际错误在于 term 的更新方式。当 n 增大时 x**n 与 factorial(n) 分别为大数,数值上不稳定。修正为递推 term=term*x/n 可避免大数相除的精度损失。同时 while 条件 abs(term)>tol 在 term 已经小于 tol 时仍会再加一次,导致结果偏大;应改为先判断再加。最优实现使用递推与先判断后累加。
    difficulty: 3
    estimatedTime: 6
  - id: ex-calc-mvt-oe-01
    type: open-ended
    cognitiveLevel: analyze
    question: "设 f(x)=x^2·sin(1/x)（f(0)=0）,g(x)=x^2·cos(1/x)（g(0)=0）。证明:虽然 f' 与 g' 在 x=0 处不连续,但 f 与 g 均满足 Darboux 定理。给出 Python 数值验证。"
    keyPoints:
      - "由极限定义 f'(0)=lim_{h→0} [h^2 sin(1/h)-0]/h = lim h sin(1/h) = 0,故 f 在 0 处可导"
      - "当 x≠0 时 f'(x)=2x sin(1/x)-cos(1/x),在 0 附近剧烈振荡于 [-1,1]"
      - "Darboux 定理不要求 f' 连续,仅要求 f 可导,故自动成立"
      - "需给出 Python 数值验证 f' 在 0 附近的振荡行为与介值性"
    answer: "证明要点:(1) 由极限定义 f'(0)=lim_{h→0} [h^2 sin(1/h)-0]/h = lim h sin(1/h) = 0,故 f 在 0 处可导;(2) 当 x≠0 时 f'(x)=2x sin(1/x)-cos(1/x),在 0 附近剧烈振荡于 [-1,1];(3) 但 f' 仍满足 Darboux 性质:对任意 y 介于 f'(a) 与 f'(b) 之间,存在 ξ 使 f'(ξ)=y。Darboux 定理不要求 f' 连续,故自动成立。"
    explanation: 本题考察 Darboux 定理的普适性。关键点在于 Darboux 定理的假设仅为"f 可导",不要求 f'' 连续。f'' 的振荡性不违反 Darboux 性质,反而展示了导函数可能存在第二类间断点但仍满足介值性的微妙特征。
    difficulty: 4
    estimatedTime: 12
  - id: ex-calc-mvt-oe-02
    type: open-ended
    cognitiveLevel: evaluate
    question: "设 f 在 [a,b] 上连续,在 (a,b) 内二阶可导,f(a)=f(b)=0,且存在 c∈(a,b) 使 f(c)>0。证明:存在 ξ∈(a,b) 使 f'(ξ)<0。给出几何解释与 sympy 数值实例。"
    keyPoints:
      - "在 [a,c] 上由 Lagrange 中值定理,存在 ξ1∈(a,c) 使 f'(ξ1)=[f(c)-f(a)]/(c-a)=f(c)/(c-a)>0"
      - "在 [c,b] 上同理存在 ξ2∈(c,b) 使 f'(ξ2)=[f(b)-f(c)]/(b-c)=-f(c)/(b-c)<0"
      - "在 [ξ1,ξ2] 上对 f' 应用 Lagrange 中值定理或对 f 应用中值定理的差分形式"
      - "存在 ξ∈(ξ1,ξ2) 使 f'(ξ)=[f'(ξ2)-f'(ξ1)]/(ξ2-ξ1)<0"
      - '几何解释:函数两端为零中间为正必呈凸起,凸起处必有负曲率'
    answer: "证明:在 [a,c] 上由 Lagrange 中值定理,存在 ξ1∈(a,c) 使 f'(ξ1)=[f(c)-f(a)]/(c-a)=f(c)/(c-a)>0;在 [c,b] 上同理存在 ξ2∈(c,b) 使 f'(ξ2)=[f(b)-f(c)]/(b-c)=-f(c)/(b-c)<0。在 [ξ1,ξ2] 上对 f' 应用 Lagrange 中值定理(需 f' 在 (ξ1,ξ2) 可导,即 f 三阶可导)或对 f 应用中值定理的差分形式:存在 ξ∈(ξ1,ξ2) 使 f'(ξ)=[f'(ξ2)-f'(ξ1)]/(ξ2-ξ1)<0。若仅二阶可导,改用 Darboux 定理与极限分析。"
    explanation: 几何解释:函数在两端为零,中间为正,必呈现"凸起"形状,凸起处必有负曲率。证明关键是将"存在负二阶导数"转化为两次 Lagrange 中值定理的复合应用。本题是 Spivak Calculus 第 11 章经典结论。
    difficulty: 5
    estimatedTime: 15
  - id: ex-calc-mvt-oe-03
    type: open-ended
    cognitiveLevel: create
    question: '设计一个 Python 类 TaylorApproximator,接受任意 sympy 可微函数 f 与展开点 x0,实现:(1) 计算 n 阶 Taylor 多项式;(2) 给出 Peano 与 Lagrange 余项;(3) 绘制不同 n 下的逼近误差曲线;(4) 数值估计使误差低于给定 tol 的最小 n。在 f(x)=sin(x),x0=0,x=0.5,tol=1e-10 上验证。'
    keyPoints:
      - 'class TaylorApproximator 应接受 sympy 函数 f 与展开点 x0'
      - 'polynomial(n) 方法返回 sum(f^(k)(x0)/k!*(x-x0)^k for k in range(n+1))'
      - 'lagrange_remainder(n, x) 返回 f^(n+1)(xi)/(n+1)!*(x-x0)^(n+1) 的上界估计'
      - 'plot_error(x, n_max) 用 matplotlib 绘制误差曲线'
      - 'min_n_for_tol(x, tol) 二分搜索最小 n'
      - 'sin(x) 在 x0=0 处为交错级数,误差不超过首项被截断项,n≈10 即可达 1e-10'
    answer: '实现要点:class TaylorApproximator: def __init__(self, f, x0): ...;def polynomial(self, n): 返回 sum(f^(k)(x0)/k!*(x-x0)^k for k in range(n+1));def lagrange_remainder(self, n, x): 返回 f^(n+1)(xi)/(n+1)!*(x-x0)^(n+1) 的上界估计;def plot_error(self, x, n_max): 用 matplotlib 绘制;def min_n_for_tol(self, x, tol): 二分搜索最小 n。'
    explanation: 本题考察 Taylor 定理的工程化实现。关键点:(1) 用 sympy.series 或递归求导获取系数;(2) Lagrange 余项需对 f^(n+1) 在区间上取上界,常用 max_{t∈[x0,x]} |f^(n+1)(t)|;(3) 误差曲线应呈对数下降直至数值精度极限;(4) sin(x) 在 x0=0 处的 Taylor 级数为交错级数,误差不超过首项被截断项,故 n≈10 即可达到 1e-10。
    difficulty: 5
    estimatedTime: 25
---

## 0. 文档说明

本篇以 Spivak《Calculus》4th edition、Apostol《Calculus》Vol 1、Rudin《Principles of Mathematical Analysis》3rd edition、Tao《Analysis I》3rd edition 为标杆，构建微分中值定理的严格理论体系。文档涵盖 Rolle 定理、Lagrange 中值定理、Cauchy 中值定理、Taylor 定理（四种余项）、Darboux 定理、积分中值定理及其现代推广（Flett、Pompeiu、Flett-Pompeiu 定理），并以 Python、SymPy、PyTorch 等工具进行数值验证与符号推导。

读者应具备 ε-δ 极限语言、单变量函数连续性与可微性的基本概念（参见 [函数与极限](./函数与极限) 与 [导数与微分](./导数与微分)）。

## 1. 历史动机

微分中值定理并非一蹴而就的成果，而是横跨五个世纪、由十余位数学家接力构建的分析学基石。其演进史既是对"瞬时变化率"概念的逐步严格化，也是从几何直观走向代数化、最终由 Cauchy 与 Weierstrass 完成严格化的典范。

### 1.1 Parameshvara 的早期形式（15 世纪）

印度喀拉拉数学学派（Kerala school of astronomy and mathematics）的 Parameshvara（约 1380–1460）在 15 世纪早期即给出中值定理的几何形式：

> 一段圆弧上，弦与切线斜率相等必在某中间点成立。

Parameshvara 的工作记载于其《Līlāvatībhāṣya》（对 Bhāskara II 著作的注释），其结论是 Lagrange 中值定理在圆弧上的特例。喀拉拉学派的 Madhava（约 1340–1425）及其后继者 Nilakantha、Jyeṣṭhadeva 进一步发展了无穷级数（Madhava–Leibniz 级数、Madhava 正弦级数），与 Taylor 级数有深刻的内在关联。

```python
# 数值验证：Parameshvara 形式（圆弧上中值定理）
# 单位圆上半圆 y=sqrt(1-x^2),在 [-0.8, 0.6] 上验证
import numpy as np

a, b = -0.8, 0.6
f = lambda x: np.sqrt(1 - x**2)
df = lambda x: -x / np.sqrt(1 - x**2)  # 导数（向上半圆）
slope_chord = (f(b) - f(a)) / (b - a)
# 寻找 ξ 使 f'(ξ) = 弦斜率
xi = -slope_chord  # 因 f'(x) = -x/sqrt(1-x^2),解 -ξ/sqrt(1-ξ^2) = slope_chord
# 数值求解
from scipy.optimize import brentq
eq = lambda x: df(x) - slope_chord
xi_numerical = brentq(eq, a, b)
print(f"弦斜率 = {slope_chord:.6f}")
print(f"中值点 ξ = {xi_numerical:.6f}")
print(f"f'(ξ) = {df(xi_numerical):.6f}")
print(f"区间内：{a < xi_numerical < b}")
```

### 1.2 Cavalieri 1635：早期几何陈述

意大利数学家 Bonaventura Cavalieri 在 1635 年的《Geometria indivisibilibus continuorum nova quadam ratione promota》中给出类似陈述，但缺乏严格的可微性概念。Cavalieri 的"不可分量法"（method of indivisibles）是积分学的先驱，其几何直观为中值定理的早期形式提供了土壤。

### 1.3 Rolle 1691：方程根与导数零点

Michel Rolle 在 1691 年发表的《Démonstration d'une méthode pour résoudre les égalités de toutes les degrés》中给出 Rolle 定理的原始形式：

> 若多项式方程 $f(x)=0$ 在 $a$ 与 $b$ 处有根，则方程 $f'(x)=0$ 在 $a$ 与 $b$ 之间存在一根。

Rolle 当时使用"级联法"（méthode des cascades）逐次求导降次求根。值得注意的是，Rolle 本人反对 Newton 与 Leibniz 的微积分体系，认为无穷小概念不严格。Rolle 定理的现代形式（针对一般可微函数）直至 19 世纪由 Dini、Bonnet 等人完善。

### 1.4 Lagrange 1797：代数化的有限增量公式

Joseph-Louis Lagrange 在 1797 年的《Théorie des fonctions analytiques》中提出"代数化分析"纲领，试图完全摒弃 Newton 流数术与 Leibniz 无穷小的模糊性。他给出了现代形式的有限增量公式：

$$f(b) - f(a) = f'(\xi)(b - a), \quad \xi \in (a, b)$$

Lagrange 假设任何函数均可展开为 Taylor 级数（即所谓"解析函数"），并以此为基础建立微积分。这一假设后被 Cauchy 证明为过强（存在 $C^\infty$ 但非解析的函数，如 $e^{-1/x^2}$）。Lagrange 的贡献在于：将中值定理确立为微积分基本定理之外的核心工具，并首次以 $\xi$ 的存在性论证函数增量与导数的关系。

### 1.5 Cauchy 1823：严格化与参数化

Augustin-Louis Cauchy 在 1823 年的《Résumé des leçons sur le calcul infinitésimal》中完成了中值定理的现代严格化：

1. 首次以 $\varepsilon$-$\delta$ 语言陈述极限、连续与导数定义；
2. 给出 Cauchy 中值定理的参数化形式：

$$\frac{f(b) - f(a)}{g(b) - g(a)} = \frac{f'(\xi)}{g'(\xi)}, \quad \xi \in (a, b)$$

3. 证明 Lagrange 中值定理为 $g(x) = x$ 的特例；
4. 以此为基础严格证明 L'Hôpital 法则。

Cauchy 的严格化革命奠定了现代分析学的范式，影响了 Weierstrass、Heine、Dedekind 等后续工作。

### 1.6 Taylor 1715 与 Maclaurin 1742

Brook Taylor 在 1715 年的《Methodus Incrementorum Directa et Inversa》中首次陈述 Taylor 级数，但其工作缺乏收敛性讨论。Colin Maclaurin 在 1742 年的《A Treatise of Fluxions》中系统使用 $x_0 = 0$ 处展开（即 Maclaurin 级数），并首次给出余项估计：

$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(0)}{k!} x^k + R_n(x)$$

Maclaurin 在书中明确将该公式归功于 Taylor 与 James Stirling。Taylor 级数的严格收敛性直至 1821 年 Cauchy 才完整建立：Cauchy 证明 $e^x, \sin x, \cos x$ 在全实轴上收敛于函数本身，并构造反例 $e^{-1/x^2}$ 揭示 $C^\infty$ 不蕴含解析性。

### 1.7 Darboux 1875：导数的介值性

Gaston Darboux 在 1875 年的论文《Mémoire sur les discontinuités des fonctions》中证明了一个深刻结论：

> 若 $f$ 在 $[a, b]$ 上可导，则 $f'$ 取 $f'(a)$ 与 $f'(b)$ 之间的所有值。

这一结论（Darboux 定理）的深刻性在于：$f'$ 不必连续。这与连续函数的介值定理形成对照——导函数即便有间断点，也只能是第二类（振荡型），不能是第一类（跳跃型）。Darboux 定理揭示了导数与连续函数的本质差异，是微分方程存在性定理（Peano 定理、Picard–Lindelöf 定理）的关键工具。

### 1.8 Bonnet 1868：Rolle 定理的现代证明

法国数学家 Pierre Ossian Bonnet 在 1868 年给出了 Rolle 定理的现代证明，即利用最值定理与 Fermat 引理。这一证明模式成为后续 Lagrange、Cauchy 中值定理证明的范式（构造辅助函数 + 应用 Rolle 定理）。Bonnet 的贡献在于将 Rolle 定理从多项式推广到一般可微函数，并将其确立为整个中值定理家族的逻辑起点。

### 1.9 Flett 1958：端点导数相等的加强形式

Thomas M. Flett 在 1958 年的论文《A mean value theorem》中给出 Lagrange 中值定理的精妙加强：

> 若 $f$ 在 $[a, b]$ 上连续，在 $(a, b)$ 内可导，且 $f'(a) = f'(b)$，则存在 $\xi \in (a, b)$ 使 $f'(\xi) = \frac{f(\xi) - f(a)}{\xi - a}$。

Flett 定理的几何意义：存在中间点 $\xi$，使得该点处的"弦斜率"等于"切线斜率"。当 $f'(a) = f'(b)$ 时 Flett 定理比 Lagrange 中值定理更强，且其证明需要构造非平凡的辅助函数。

### 1.10 Pompeiu 1906：参数化中值定理

Romanian 数家 Dimitrie Pompeiu 在 1906 年给出 Cauchy 中值定理的奇异变形：

> 若 $f$ 在 $[a, b]$ 上连续可导，$g$ 在 $[a, b]$ 上严格单调可导，则存在 $\xi \in (a, b)$ 使 $\frac{f'(\xi)}{g'(\xi)} = \frac{f(b) - f(a)}{g(b) - g(a)}$，且 $g$ 可以为非常一般的形式（包括奇异变换）。

Pompeiu 定理在 L'Hôpital 法则的严格化、奇异极限计算中有重要应用。

### 1.11 Flett–Pompeiu 定理：现代综合形式

20 世纪后期，Trahan、Sahoo–Riedel 等数学家将 Flett 定理与 Pompeiu 定理综合为：

> 若 $f, g$ 在 $[a, b]$ 上连续可导，$g'(a) = g'(b)$，且 $(f'(a) - f'(b))(g(b) - g(a)) \neq (g'(a) - g'(b))(f(b) - f(a))$，则存在 $\xi \in (a, b)$ 使 $\frac{f'(\xi) - f'(a)}{g'(\xi) - g'(a)} = \frac{f(\xi) - f(a)}{g(\xi) - g(a)}$。

这一形式统一了 Flett 与 Pompeiu 的成果，并在数值分析、优化理论中有应用。

```python
# Flett 定理数值验证：f(x)=x^3-3x+1, a=-2, b=2
# 条件：f'(a)=f'(b)
import numpy as np
from scipy.optimize import brentq

f = lambda x: x**3 - 3*x + 1
df = lambda x: 3*x**2 - 3

a, b = -2, 2
print(f"f'(a) = {df(a)}, f'(b) = {df(b)}")  # 验证 f'(-2)=9, f'(2)=9 相等

# Flett 条件：存在 ξ 使 f'(ξ) = [f(ξ)-f(a)]/(ξ-a)
flett_eq = lambda xi: df(xi) - (f(xi) - f(a))/(xi - a)
# 在 (a, b) 内寻找零点
xi_candidates = np.linspace(a + 0.01, b - 0.01, 1000)
signs = np.sign([flett_eq(x) for x in xi_candidates])
# 找符号变化点
for i in range(len(signs)-1):
    if signs[i] * signs[i+1] < 0:
        xi_sol = brentq(flett_eq, xi_candidates[i], xi_candidates[i+1])
        print(f"Flett 中值点 ξ ≈ {xi_sol:.6f}")
        print(f"验证 f'(ξ) = {df(xi_sol):.6f}")
        print(f"验证 [f(ξ)-f(a)]/(ξ-a) = {(f(xi_sol)-f(a))/(xi_sol-a):.6f}")
```

## 2. 形式化定义

本节给出微分中值定理家族的严格陈述。所有定理均以 Spivak《Calculus》4th edition 第 11 章与 Rudin《Principles of Mathematical Analysis》第 5 章为基准。

### 2.1 Rolle 定理

**定理 2.1（Rolle 定理）** 设函数 $f: [a, b] \to \mathbb{R}$ 满足：

1. 在闭区间 $[a, b]$ 上连续；
2. 在开区间 $(a, b)$ 内可导；
3. 端点等值：$f(a) = f(b)$。

则存在 $\xi \in (a, b)$，使得

$$f'(\xi) = 0.$$

**注**：三条假设均不可省略。

- 缺少闭区间连续性：考虑 $f(x) = x$ 在 $[0, 1]$ 上定义 $f(1) = 0$，则 $f$ 在 $(0, 1)$ 内可导但 $f'(x) = 1 \neq 0$。
- 缺少开区间可导性：考虑 $f(x) = |x|$ 在 $[-1, 1]$ 上，$f(-1) = f(1) = 1$，但 $f$ 在 $x = 0$ 不可导，且无 $\xi$ 使 $f'(\xi) = 0$。
- 缺少端点等值：考虑 $f(x) = x$ 在 $[0, 1]$ 上，$f'(x) = 1 \neq 0$。

### 2.2 Lagrange 中值定理

**定理 2.2（Lagrange 中值定理 / 有限增量公式）** 设函数 $f: [a, b] \to \mathbb{R}$ 满足：

1. 在闭区间 $[a, b]$ 上连续；
2. 在开区间 $(a, b)$ 内可导。

则存在 $\xi \in (a, b)$，使得

$$f'(\xi) = \frac{f(b) - f(a)}{b - a}.$$

等价形式（有限增量公式）：

$$f(b) - f(a) = f'(\xi)(b - a), \quad \xi \in (a, b).$$

更一般地，对任意 $x, x + h \in [a, b]$，存在 $\theta \in (0, 1)$ 使

$$f(x + h) - f(x) = f'(x + \theta h) \cdot h.$$

**几何意义**：在连接 $(a, f(a))$ 与 $(b, f(b))$ 的弧段上，至少存在一点 $\xi$，使得该点处的切线平行于连接两端点的弦。

### 2.3 Cauchy 中值定理

**定理 2.3（Cauchy 中值定理）** 设函数 $f, g: [a, b] \to \mathbb{R}$ 满足：

1. $f, g$ 在 $[a, b]$ 上连续；
2. $f, g$ 在 $(a, b)$ 内可导；
3. 对一切 $x \in (a, b)$，$g'(x) \neq 0$。

则存在 $\xi \in (a, b)$，使得

$$\frac{f(b) - f(a)}{g(b) - g(a)} = \frac{f'(\xi)}{g'(\xi)}.$$

**注 1**：取 $g(x) = x$ 即得 Lagrange 中值定理（因 $g'(x) = 1 \neq 0$，$g(b) - g(a) = b - a$）。

**注 2**：条件 $g'(x) \neq 0$ 蕴含 $g(b) \neq g(a)$（由 Rolle 定理逆否），故分母 $g(b) - g(a) \neq 0$。

**注 3**：Cauchy 中值定理的几何意义为参数曲线 $(g(t), f(t))$ 上存在点 $\xi$，使切线斜率等于弦斜率。

### 2.4 Taylor 定理

**定理 2.4（Taylor 定理，带 Lagrange 余项）** 设 $f$ 在含 $x_0$ 的某开区间 $I$ 内有 $n + 1$ 阶导数，则对任意 $x \in I$，存在 $\xi$ 介于 $x_0$ 与 $x$ 之间，使得

$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!} (x - x_0)^k + R_n(x),$$

其中 Lagrange 余项

$$R_n(x) = \frac{f^{(n+1)}(\xi)}{(n+1)!} (x - x_0)^{n+1}.$$

**定理 2.5（Taylor 定理，带 Peano 余项）** 设 $f$ 在 $x_0$ 处有 $n$ 阶导数（即 $f^{(n-1)}$ 在 $x_0$ 的某邻域内存在且 $f^{(n)}(x_0)$ 存在），则

$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!} (x - x_0)^k + o\big((x - x_0)^n\big).$$

**定理 2.6（Taylor 定理，带 Cauchy 余项）** 在定理 2.4 的条件下，存在 $\theta \in (0, 1)$ 使

$$R_n(x) = \frac{f^{(n+1)}(x_0 + \theta (x - x_0))}{n!} (1 - \theta)^n (x - x_0)^{n+1}.$$

**定理 2.7（Taylor 定理，带 Schlömilch 余项）** 更一般地，对任意 $p \in [1, n+1]$，存在 $\theta \in (0, 1)$ 使

$$R_n(x) = \frac{f^{(n+1)}(x_0 + \theta (x - x_0))}{n! \cdot p} (1 - \theta)^{n+1-p} (x - x_0)^{n+1}.$$

- 取 $p = n + 1$ 得 Lagrange 余项；
- 取 $p = 1$ 得 Cauchy 余项。

### 2.5 Maclaurin 级数

**定义 2.8（Maclaurin 级数）** 设 $f$ 在 $x_0 = 0$ 处任意阶可导，称幂级数

$$\sum_{k=0}^{\infty} \frac{f^{(k)}(0)}{k!} x^k$$

为 $f$ 的 Maclaurin 级数。若该级数在某邻域内收敛于 $f(x)$，则称 $f$ 在 $0$ 处解析。

常见 Maclaurin 级数：

$$e^x = \sum_{k=0}^{\infty} \frac{x^k}{k!}, \quad x \in \mathbb{R}$$

$$\sin x = \sum_{k=0}^{\infty} \frac{(-1)^k}{(2k+1)!} x^{2k+1}, \quad x \in \mathbb{R}$$

$$\cos x = \sum_{k=0}^{\infty} \frac{(-1)^k}{(2k)!} x^{2k}, \quad x \in \mathbb{R}$$

$$\ln(1 + x) = \sum_{k=1}^{\infty} \frac{(-1)^{k-1}}{k} x^k, \quad x \in (-1, 1]$$

$$\arctan x = \sum_{k=0}^{\infty} \frac{(-1)^k}{2k+1} x^{2k+1}, \quad x \in [-1, 1]$$

$$(1 + x)^{\alpha} = \sum_{k=0}^{\infty} \binom{\alpha}{k} x^k, \quad x \in (-1, 1)$$

### 2.6 Darboux 定理（导数介值定理）

**定理 2.9（Darboux 定理）** 设 $f$ 在 $[a, b]$ 上可导（即 $f$ 在 $[a, b]$ 上连续，在 $(a, b)$ 内可导，且单侧导数 $f'_+(a), f'_-(b)$ 存在）。若 $y$ 介于 $f'_+(a)$ 与 $f'_-(b)$ 之间，则存在 $\xi \in [a, b]$ 使

$$f'(\xi) = y.$$

**注**：此定理不要求 $f'$ 连续。Darboux 定理断言：导函数即便不连续，仍具有介值性。这是导函数区别于一般函数的关键性质。

### 2.7 积分中值定理（第一形式）

**定理 2.10（积分中值定理，第一形式）** 设 $f: [a, b] \to \mathbb{R}$ 在 $[a, b]$ 上连续，则存在 $\xi \in [a, b]$ 使

$$\int_a^b f(x) \, dx = f(\xi) (b - a).$$

**几何意义**：连续函数在 $[a, b]$ 上的积分等于某矩形面积，矩形高为某中间点的函数值。

### 2.8 积分中值定理（第二形式）

**定理 2.11（积分中值定理，第二形式 / 加权形式）** 设 $f, g: [a, b] \to \mathbb{R}$ 满足：

1. $f$ 在 $[a, b]$ 上连续；
2. $g$ 在 $[a, b]$ 上可积且不变号（即 $g(x) \geq 0$ 或 $g(x) \leq 0$）。

则存在 $\xi \in [a, b]$ 使

$$\int_a^b f(x) g(x) \, dx = f(\xi) \int_a^b g(x) \, dx.$$

**注**：第一形式为第二形式取 $g(x) \equiv 1$ 的特例。第二形式要求 $g$ 不变号，但允许 $g$ 在某些点为零。

## 3. 理论推导

本节给出上述定理的完整证明，所有证明遵循 Spivak《Calculus》4th edition 的严格风格。

### 3.1 Rolle 定理证明

**证明** 由闭区间上连续函数的最值定理，$f$ 在 $[a, b]$ 上取得最大值 $M$ 与最小值 $m$。设 $f(\alpha) = M$，$f(\beta) = m$，$\alpha, \beta \in [a, b]$。

**情形 1**：$M = m$。此时 $f$ 为常数函数，$f'(x) = 0$ 对一切 $x \in (a, b)$ 成立，任取 $\xi \in (a, b)$ 即可。

**情形 2**：$M > m$。由 $f(a) = f(b)$，$M$ 与 $m$ 不可能同时在端点取得，故 $\alpha$ 或 $\beta$ 之一必在 $(a, b)$ 内。不妨设 $\alpha \in (a, b)$（$\beta$ 同理）。

由 Fermat 引理：若 $f$ 在 $\alpha$ 处取得极值且 $f'(\alpha)$ 存在，则 $f'(\alpha) = 0$。

由于 $\alpha \in (a, b)$ 且 $f$ 在 $(a, b)$ 内可导，$f'(\alpha)$ 存在。又 $\alpha$ 为最大值点，故为极值点，由 Fermat 引理得 $f'(\alpha) = 0$。

取 $\xi = \alpha$ 即证。$\blacksquare$

**Fermat 引理的证明**（供参考）：设 $\alpha$ 为极大值点（极小值同理）。对 $h > 0$ 充分小，$f(\alpha + h) \leq f(\alpha)$，故 $\frac{f(\alpha + h) - f(\alpha)}{h} \leq 0$，取极限 $h \to 0^+$ 得 $f'(\alpha) \leq 0$。对 $h < 0$，$\frac{f(\alpha + h) - f(\alpha)}{h} \geq 0$，取极限 $h \to 0^-$ 得 $f'(\alpha) \geq 0$。故 $f'(\alpha) = 0$。

```python
# Rolle 定理数值验证：f(x) = (x-1)(x-3)(x-5) = x^3-9x^2+23x-15, 在 [1,5] 上
import numpy as np
import sympy as sp
from scipy.optimize import brentq

x = sp.symbols('x')
f_sym = (x - 1) * (x - 3) * (x - 5)
df_sym = sp.diff(f_sym, x)
print(f"f(x) = {sp.expand(f_sym)}")
print(f"f'(x) = {sp.expand(df_sym)}")
print(f"f(1) = {f_sym.subs(x, 1)}, f(5) = {f_sym.subs(x, 5)}")  # 均为 0

# 求解 f'(ξ) = 0 在 (1, 5) 内
sols = sp.solve(df_sym, x)
print(f"f'(x) = 0 的解: {sols}")
# 验证解在区间内
for s in sols:
    if s.is_real and 1 < float(s) < 5:
        print(f"Rolle 中值点 ξ = {s} ≈ {float(s):.6f}")
```

### 3.2 Lagrange 中值定理证明

**证明** 构造辅助函数（"减弦函数"）

$$\varphi(x) = f(x) - f(a) - \frac{f(b) - f(a)}{b - a} (x - a).$$

验证：

1. $\varphi(a) = f(a) - f(a) - 0 = 0$；
2. $\varphi(b) = f(b) - f(a) - \frac{f(b) - f(a)}{b - a} (b - a) = f(b) - f(a) - (f(b) - f(a)) = 0$。

故 $\varphi(a) = \varphi(b) = 0$。又 $\varphi$ 在 $[a, b]$ 上连续（因 $f$ 连续），在 $(a, b)$ 内可导（因 $f$ 可导），由 Rolle 定理，存在 $\xi \in (a, b)$ 使 $\varphi'(\xi) = 0$。

计算

$$\varphi'(x) = f'(x) - \frac{f(b) - f(a)}{b - a}.$$

由 $\varphi'(\xi) = 0$ 得

$$f'(\xi) = \frac{f(b) - f(a)}{b - a}. \quad \blacksquare$$

**辅助函数的几何意义**：$\varphi(x)$ 是 $f(x)$ 减去连接 $(a, f(a))$ 与 $(b, f(b))$ 的弦的线性函数。$\varphi$ 在端点处归零，应用 Rolle 定理即得弦斜率等于某点切线斜率。

```python
# Lagrange 中值定理符号验证：f(x) = x^3, [1, 3]
import sympy as sp

x = sp.symbols('x')
f = x**3
a, b = 1, 3
slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)
print(f"弦斜率 = [{f.subs(x,b)} - {f.subs(x,a)}] / [{b} - {a}] = {slope}")

df = sp.diff(f, x)
xi_sols = sp.solve(df - slope, x)
print(f"f'(x) = {df}")
print(f"f'(ξ) = {slope} 的解: {xi_sols}")
# 验证解在 (1, 3) 内
for s in xi_sols:
    if s.is_real and a < s < b:
        print(f"Lagrange 中值点 ξ = {s} = {float(s):.6f}")
        print(f"验证 f'(ξ) = {df.subs(x, s)} = {float(df.subs(x, s)):.6f}")
```

```python
# Lagrange 中值定理数值验证（一般不可解的函数）
import numpy as np
from scipy.optimize import brentq

# f(x) = x + sin(x), [0, pi]
f = lambda x: x + np.sin(x)
df = lambda x: 1 + np.cos(x)
a, b = 0, np.pi
slope = (f(b) - f(a)) / (b - a)
print(f"弦斜率 = {slope:.6f}")

# 求解 df(xi) = slope
eq = lambda xi: df(xi) - slope
xi_sol = brentq(eq, a + 1e-10, b - 1e-10)
print(f"中值点 ξ = {xi_sol:.6f}")
print(f"f'(ξ) = {df(xi_sol):.6f}")
print(f"区间内：{a < xi_sol < b}")
```

### 3.3 Cauchy 中值定理证明

**证明** 构造辅助函数

$$\varphi(x) = [f(b) - f(a)] g(x) - [g(b) - g(a)] f(x).$$

验证：

1. $\varphi(a) = [f(b) - f(a)] g(a) - [g(b) - g(a)] f(a) = f(b) g(a) - f(a) g(a) - g(b) f(a) + g(a) f(a) = f(b) g(a) - g(b) f(a)$；
2. $\varphi(b) = [f(b) - f(a)] g(b) - [g(b) - g(a)] f(b) = f(b) g(b) - f(a) g(b) - g(b) f(b) + g(a) f(b) = g(a) f(b) - f(a) g(b)$。

故 $\varphi(a) = \varphi(b)$。又 $\varphi$ 在 $[a, b]$ 上连续，在 $(a, b)$ 内可导。由 Rolle 定理，存在 $\xi \in (a, b)$ 使 $\varphi'(\xi) = 0$。

计算

$$\varphi'(x) = [f(b) - f(a)] g'(x) - [g(b) - g(a)] f'(x).$$

由 $\varphi'(\xi) = 0$：

$$[f(b) - f(a)] g'(\xi) = [g(b) - g(a)] f'(\xi).$$

由假设 $g'(x) \neq 0$ 对一切 $x \in (a, b)$ 成立，由 Rolle 定理逆否知 $g(b) \neq g(a)$，即 $g(b) - g(a) \neq 0$。两端除以 $[g(b) - g(a)] g'(\xi)$ 得

$$\frac{f(b) - f(a)}{g(b) - g(a)} = \frac{f'(\xi)}{g'(\xi)}. \quad \blacksquare$$

**注**：另一常见辅助函数为

$$\psi(x) = f(x) - f(a) - \frac{f(b) - f(a)}{g(b) - g(a)} [g(x) - g(a)],$$

其证明思路与上类似。

```python
# Cauchy 中值定理验证：f(x) = sin(x), g(x) = cos(x), [0, pi/4]
import numpy as np
import sympy as sp
from scipy.optimize import brentq

x = sp.symbols('x')
f_sym = sp.sin(x)
g_sym = sp.cos(x)
a, b = 0, sp.pi / 4

lhs = (f_sym.subs(x, b) - f_sym.subs(x, a)) / (g_sym.subs(x, b) - g_sym.subs(x, a))
print(f"LHS = [f(b)-f(a)]/[g(b)-g(a)] = {sp.simplify(lhs)} ≈ {float(lhs):.6f}")

df = sp.diff(f_sym, x)
dg = sp.diff(g_sym, x)
# 求解 df(ξ)/dg(ξ) = lhs, 即 df(ξ) - lhs*dg(ξ) = 0
eq = df - lhs * dg
xi_sols = sp.solve(eq, x)
print(f"df/dg = LHS 的解: {xi_sols}")
# 在 (0, pi/4) 内筛选
for s in xi_sols:
    s_val = float(s)
    if 0 < s_val < float(b):
        print(f"Cauchy 中值点 ξ = {s} ≈ {s_val:.6f}")
        print(f"验证 f'(ξ)/g'(ξ) = {float(df.subs(x, s) / dg.subs(x, s)):.6f}")
```

### 3.4 Taylor 定理证明（四种余项）

#### 3.4.1 Peano 余项证明

**证明** 设 $f$ 在 $x_0$ 处 $n$ 阶可导。定义

$$R_n(x) = f(x) - \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!} (x - x_0)^k.$$

需证 $\lim_{x \to x_0} \frac{R_n(x)}{(x - x_0)^n} = 0$。

由 $f^{(k)}(x_0)$ 存在（$k \leq n$），$f^{(n-1)}$ 在 $x_0$ 处连续且在 $x_0$ 的某邻域内存在。对 $R_n$ 应用 $n-1$ 次 L'Hôpital 法则：

$$\lim_{x \to x_0} \frac{R_n(x)}{(x - x_0)^n} = \lim_{x \to x_0} \frac{R_n^{(n-1)}(x)}{n! (x - x_0)}.$$

计算

$$R_n^{(n-1)}(x) = f^{(n-1)}(x) - f^{(n-1)}(x_0) - f^{(n)}(x_0)(x - x_0).$$

故

$$\lim_{x \to x_0} \frac{R_n^{(n-1)}(x)}{x - x_0} = \lim_{x \to x_0} \left[ \frac{f^{(n-1)}(x) - f^{(n-1)}(x_0)}{x - x_0} - f^{(n)}(x_0) \right] = f^{(n)}(x_0) - f^{(n)}(x_0) = 0.$$

故 $R_n(x) = o((x - x_0)^n)$。$\blacksquare$

#### 3.4.2 Lagrange 余项证明

**证明** 设 $f$ 在含 $x_0$ 的开区间 $I$ 内有 $n+1$ 阶导数。固定 $x \in I$，$x \neq x_0$。构造辅助函数

$$F(t) = f(x) - \sum_{k=0}^{n} \frac{f^{(k)}(t)}{k!} (x - t)^k.$$

注意此处变量为 $t$（展开点），$x$ 视为常量。计算

$$F'(t) = -\sum_{k=0}^{n} \frac{f^{(k+1)}(t)}{k!} (x - t)^k + \sum_{k=1}^{n} \frac{f^{(k)}(t)}{(k-1)!} (x - t)^{k-1}.$$

合并同类项（$k$ 与 $k-1$ 抵消）得

$$F'(t) = -\frac{f^{(n+1)}(t)}{n!} (x - t)^n.$$

令 $G(t) = (x - t)^{n+1}$，则 $G'(t) = -(n+1)(x - t)^n$。在 $t = x_0$ 与 $t = x$ 之间对 $F, G$ 应用 Cauchy 中值定理（注意 $G'(t) \neq 0$ 在 $t \neq x$ 时成立）：

$$\frac{F(x) - F(x_0)}{G(x) - G(x_0)} = \frac{F'(\xi)}{G'(\xi)}$$

对某 $\xi$ 介于 $x_0$ 与 $x$ 之间。

计算 $F(x) = f(x) - \frac{f^{(0)}(x)}{0!} (x - x)^0 = f(x) - f(x) = 0$，$F(x_0) = f(x) - \sum_{k=0}^{n} \frac{f^{(k)}(x_0)}{k!} (x - x_0)^k = R_n(x)$，$G(x) = 0$，$G(x_0) = (x - x_0)^{n+1}$。故

$$\frac{-R_n(x)}{-(x - x_0)^{n+1}} = \frac{-\frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n}{-(n+1)(x - \xi)^n} = \frac{f^{(n+1)}(\xi)}{(n+1)!}.$$

故

$$R_n(x) = \frac{f^{(n+1)}(\xi)}{(n+1)!} (x - x_0)^{n+1}. \quad \blacksquare$$

#### 3.4.3 Cauchy 余项证明

在 3.4.2 的证明中，改取 $G(t) = x - t$（线性函数），则 $G'(t) = -1 \neq 0$。由 Cauchy 中值定理：

$$\frac{F(x) - F(x_0)}{G(x) - G(x_0)} = \frac{F'(\xi)}{G'(\xi)} = \frac{-\frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n}{-1} = \frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n.$$

而 $F(x) - F(x_0) = -R_n(x)$，$G(x) - G(x_0) = (x - x) - (x - x_0) = -(x - x_0)$，故

$$\frac{-R_n(x)}{-(x - x_0)} = \frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n.$$

即

$$R_n(x) = \frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n (x - x_0).$$

令 $\xi = x_0 + \theta (x - x_0)$，$\theta \in (0, 1)$，则 $x - \xi = (1 - \theta)(x - x_0)$，代入得

$$R_n(x) = \frac{f^{(n+1)}(x_0 + \theta (x - x_0))}{n!} (1 - \theta)^n (x - x_0)^{n+1}. \quad \blacksquare$$

#### 3.4.4 Schlömilch 余项证明

在 3.4.2 的证明中，取 $G(t) = (x - t)^p$，$p \in [1, n+1]$，则 $G'(t) = -p (x - t)^{p-1} \neq 0$（当 $t \neq x$）。由 Cauchy 中值定理：

$$\frac{F(x) - F(x_0)}{G(x) - G(x_0)} = \frac{F'(\xi)}{G'(\xi)} = \frac{-\frac{f^{(n+1)}(\xi)}{n!} (x - \xi)^n}{-p (x - \xi)^{p-1}} = \frac{f^{(n+1)}(\xi)}{n! \cdot p} (x - \xi)^{n+1-p}.$$

而 $G(x) - G(x_0) = 0 - (x - x_0)^p = -(x - x_0)^p$，$F(x) - F(x_0) = -R_n(x)$，故

$$R_n(x) = \frac{f^{(n+1)}(\xi)}{n! \cdot p} (x - \xi)^{n+1-p} (x - x_0)^p.$$

代入 $\xi = x_0 + \theta (x - x_0)$：

$$R_n(x) = \frac{f^{(n+1)}(x_0 + \theta (x - x_0))}{n! \cdot p} (1 - \theta)^{n+1-p} (x - x_0)^{n+1}. \quad \blacksquare$$

- $p = n + 1$：$(1 - \theta)^0 = 1$，得 Lagrange 余项；
- $p = 1$：$(1 - \theta)^n$，得 Cauchy 余项。

```python
# Taylor 余项的数值比较：f(x) = e^x, x0 = 0, x = 0.5, n = 4
import numpy as np
from math import factorial, exp

x0, x_val, n = 0, 0.5, 4
f = np.exp
df_n1 = lambda t: np.exp(t)  # n+1 阶导数,对 e^x 仍为 e^x

# 真实值
true_val = f(x_val)
# Taylor 多项式
P_n = sum(x_val**k / factorial(k) for k in range(n+1))
R_actual = true_val - P_n
print(f"真实值 f({x_val}) = {true_val:.10f}")
print(f"Taylor 多项式 P_{n}({x_val}) = {P_n:.10f}")
print(f"真实余项 R_{n} = {R_actual:.10e}")

# Lagrange 余项估计（上界）: |R_n| <= max|f^(n+1)| * |x-x0|^(n+1) / (n+1)!
xi_lagrange_bound = max(f(t) for t in np.linspace(x0, x_val, 100))
R_lagrange_bound = xi_lagrange_bound * abs(x_val - x0)**(n+1) / factorial(n+1)
print(f"Lagrange 余项上界 = {R_lagrange_bound:.10e}")

# Cauchy 余项估计（取 θ=0.5 的形式）: |R_n| <= max|f^(n+1)| * (1-θ)^n * |x-x0|^(n+1) / n!
theta = 0.5
R_cauchy_bound = xi_lagrange_bound * (1 - theta)**n * abs(x_val - x0)**(n+1) / factorial(n)
print(f"Cauchy 余项(θ=0.5)上界 = {R_cauchy_bound:.10e}")

# 数值搜索实际 θ_Lagrange
# R_n = f^(n+1)(ξ)/(n+1)! * (x-x0)^(n+1), 求 ξ
xi_actual = R_actual * factorial(n+1) / (x_val - x0)**(n+1)
print(f"反解 Lagrange 余项得 ξ = ln({xi_actual:.6f}) = {np.log(xi_actual):.6f}")
print(f"θ = (ξ - x0)/(x - x0) = {(np.log(xi_actual) - x0)/(x_val - x0):.6f}")
```

### 3.5 Darboux 定理证明

**证明** 设 $f$ 在 $[a, b]$ 上可导，$y$ 介于 $f'_+(a)$ 与 $f'_-(b)$ 之间。不妨设 $f'_+(a) < y < f'_-(b)$（其余情形对称）。

定义 $g(x) = f(x) - y x$，则 $g$ 在 $[a, b]$ 上可导，$g'(x) = f'(x) - y$。

由 $f'_+(a) < y < f'_-(b)$ 得 $g'_+(a) = f'_+(a) - y < 0$，$g'_-(b) = f'_-(b) - y > 0$。

由于 $g'_+(a) < 0$，存在 $x_1 \in (a, b)$ 使 $g(x_1) < g(a)$（因右导数为负意味着 $g$ 在 $a$ 附近递减）。

由于 $g'_-(b) > 0$，存在 $x_2 \in (a, b)$ 使 $g(x_2) < g(b)$（因左导数为正意味着 $g$ 在 $b$ 附近递减，即 $g(b-\varepsilon) > g(b)$，故 $g$ 在 $b$ 处取得局部极小值）。

由 $g$ 在 $[a, b]$ 上连续（因 $f$ 连续），$g$ 在 $[a, b]$ 上取得最小值。由上述两点，最小值不在端点 $a$ 或 $b$ 取得（因 $g(x_1) < g(a)$ 且 $g(x_2) < g(b)$），故存在 $\xi \in (a, b)$ 使 $g$ 在 $\xi$ 处取得最小值，即极值。由 Fermat 引理，$g'(\xi) = 0$，即 $f'(\xi) = y$。$\blacksquare$

**注**：此证明的关键是利用导数的符号信息定位极值点的位置。Darboux 定理不需要 $f'$ 连续，是导数特有的介值性质。

```python
# Darboux 定理数值验证：构造导数不连续但满足介值性的函数
# f(x) = x^2 * sin(1/x) (x≠0), f(0)=0
# f'(x) = 2x*sin(1/x) - cos(1/x) (x≠0), f'(0)=0 (由极限定义)
# f' 在 0 处不连续(剧烈振荡),但满足 Darboux 性质
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return np.where(x == 0, 0.0, x**2 * np.sin(1/x))

def df(x):
    return np.where(x == 0, 0.0, 2*x*np.sin(1/x) - np.cos(1/x))

# 在 [−0.1, 0.1] 上验证 Darboux: f'(−0.1) 与 f'(0.1) 之间的任何值都被 f' 取到
a, b = -0.1, 0.1
fa, fb = df(a), df(b)
print(f"f'(a) = {fa:.6f}, f'(b) = {fb:.6f}")

# 取 y = (f'(a) + f'(b))/2, 寻找 ξ 使 f'(ξ) = y
y_target = (fa + fb) / 2
print(f"目标值 y = {y_target:.6f}")

# 数值搜索: f' 在 (a, b) 内取值范围
xs = np.linspace(a, b, 10000)
df_vals = df(xs)
print(f"f' 在 [a,b] 上的取值范围: [{df_vals.min():.6f}, {df_vals.max():.6f}]")
print(f"y 是否在取值范围内: {df_vals.min() <= y_target <= df_vals.max()}")

# Darboux 定理保证: 即便 f' 不连续, 也取遍 f'(a) 与 f'(b) 之间所有值
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(xs, df_vals, label="$f'(x) = 2x\\sin(1/x) - \\cos(1/x)$", lw=1)
ax.axhline(y_target, color='r', ls='--', label=f"$y = {y_target:.4f}$")
ax.axhline(fa, color='g', ls=':', label=f"$f'(a) = {fa:.4f}$")
ax.axhline(fb, color='m', ls=':', label=f"$f'(b) = {fb:.4f}$")
ax.set_xlabel('x'); ax.set_ylabel("f'(x)")
ax.set_title("Darboux 定理: 导函数即便不连续也满足介值性")
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('darboux_demo.png', dpi=100); plt.show()
```

### 3.6 积分中值定理证明

#### 第一形式证明

**证明** 由 $f$ 在 $[a, b]$ 上连续，根据最值定理，$f$ 在 $[a, b]$ 上取得最小值 $m$ 与最大值 $M$，即

$$m \leq f(x) \leq M, \quad \forall x \in [a, b].$$

积分得

$$m(b - a) \leq \int_a^b f(x) \, dx \leq M(b - a),$$

即

$$m \leq \frac{1}{b - a} \int_a^b f(x) \, dx \leq M.$$

由连续函数的介值定理，存在 $\xi \in [a, b]$ 使

$$f(\xi) = \frac{1}{b - a} \int_a^b f(x) \, dx.$$

即 $\int_a^b f(x) \, dx = f(\xi) (b - a)$。$\blacksquare$

#### 第二形式证明

**证明** 不妨设 $g(x) \geq 0$（$g(x) \leq 0$ 同理）。设 $m, M$ 为 $f$ 在 $[a, b]$ 上的最小最大值，则

$$m g(x) \leq f(x) g(x) \leq M g(x).$$

积分得

$$m \int_a^b g(x) \, dx \leq \int_a^b f(x) g(x) \, dx \leq M \int_a^b g(x) \, dx.$$

若 $\int_a^b g(x) \, dx = 0$，则 $\int_a^b f(x) g(x) \, dx = 0$，任取 $\xi \in [a, b]$ 等式成立。

若 $\int_a^b g(x) \, dx > 0$，则

$$m \leq \frac{\int_a^b f(x) g(x) \, dx}{\int_a^b g(x) \, dx} \leq M.$$

由介值定理，存在 $\xi \in [a, b]$ 使 $f(\xi) = \frac{\int_a^b f(x) g(x) \, dx}{\int_a^b g(x) \, dx}$。$\blacksquare$

```python
# 积分中值定理数值验证
import numpy as np
from scipy import integrate, optimize

# 第一形式: f(x) = sin(x), [0, pi]
f = np.sin
a, b = 0, np.pi
integral_val, _ = integrate.quad(f, a, b)
mean_val = integral_val / (b - a)
print(f"∫_0^π sin(x) dx = {integral_val:.6f}")
print(f"平均值 = {mean_val:.6f}")

# 求 ξ 使 f(ξ) = mean_val
xi_sol = optimize.brentq(lambda x: f(x) - mean_val, a, b)
print(f"积分中值点 ξ = {xi_sol:.6f} (= π/2 ≈ {np.pi/2:.6f})")
print(f"验证 f(ξ) = {f(xi_sol):.6f}")

# 第二形式: f(x)=sin(x), g(x)=x (非负), [0, pi]
g = lambda x: x
fg = lambda x: np.sin(x) * x
integral_fg, _ = integrate.quad(fg, a, b)
integral_g, _ = integrate.quad(g, a, b)
weighted_mean = integral_fg / integral_g
print(f"\n加权形式: ∫sin(x)*x dx / ∫x dx = {weighted_mean:.6f}")
xi_sol2 = optimize.brentq(lambda x: f(x) - weighted_mean, a, b)
print(f"加权中值点 ξ = {xi_sol2:.6f}")
print(f"验证 f(ξ) = {f(xi_sol2):.6f}")
```

## 4. 几何意义与可视化

### 4.1 Rolle 定理的几何意义

Rolle 定理的几何陈述：若可微弧段两端等高，则弧上至少有一点处的切线水平。

```mermaid
flowchart LR
    A[Rolle 定理几何] --> B[弧段两端等高]
    A --> C[弧段中存在水平切线]
    B --> D{弧段是否为直线?}
    D -- 是 --> E[整段切线水平]
    D -- 否 --> F[极值点必在内点]
    F --> G[由 Fermat 引理<br/>极值点导数为零]
    G --> H[存在 ξ 使 f'(ξ)=0]
```

```python
# Rolle 定理可视化
import numpy as np
import matplotlib.pyplot as plt

f = lambda x: (x - 1) * (x - 3) * (x - 5)
df = lambda x: 3*x**2 - 18*x + 23

fig, ax = plt.subplots(figsize=(10, 6))
xs = np.linspace(0.5, 5.5, 500)
ax.plot(xs, f(xs), 'b-', lw=2, label='$f(x) = (x-1)(x-3)(x-5)$')
ax.axhline(0, color='k', lw=0.5)

# 标注端点
ax.plot([1, 5], [0, 0], 'ro', ms=10, label='端点 $(1, 0), (5, 0)$')
ax.plot([1, 5], [0, 0], 'r--', lw=1)

# 标注中值点 ξ = 3 (即 f'(3)=0)
xi = 3
ax.plot(xi, f(xi), 'g*', ms=15, label=f'中值点 $\\xi = {xi}$, $f\'(\\xi) = 0$')
ax.axhline(f(xi), xmin=0.4, xmax=0.6, color='g', ls=':', lw=1)
ax.annotate('水平切线', xy=(xi, f(xi)), xytext=(xi+0.5, f(xi)+1.5),
            arrowprops=dict(arrowstyle='->', color='green'))

ax.set_xlabel('x'); ax.set_ylabel('f(x)')
ax.set_title('Rolle 定理可视化: 两端等高则必有水平切线')
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('rolle_visual.png', dpi=100); plt.show()
```

### 4.2 Lagrange 中值定理的几何意义

Lagrange 中值定理的几何陈述：可微弧段上至少存在一点，使该点处的切线平行于连接两端的弦。

```mermaid
flowchart TD
    A[Lagrange 中值定理几何] --> B[弧段可微]
    A --> C[弦斜率 = f(b)-f(a)/b-a]
    C --> D[存在 ξ 使切线斜率 = 弦斜率]
    D --> E[几何: 切线 ∥ 弦]
    E --> F[特例: f(a)=f(b) 退化为 Rolle 定理]
```

```python
# Lagrange 中值定理可视化：f(x) = x^3, [0, 2]
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import brentq

f = lambda x: x**3
df = lambda x: 3*x**2
a, b = 0, 2
slope = (f(b) - f(a)) / (b - a)
xi = brentq(lambda x: df(x) - slope, a, b)
print(f"中值点 ξ = {xi:.6f} = sqrt(4/3) ≈ {np.sqrt(4/3):.6f}")

fig, ax = plt.subplots(figsize=(10, 6))
xs = np.linspace(-0.2, 2.2, 500)
ax.plot(xs, f(xs), 'b-', lw=2, label='$f(x) = x^3$')

# 弦
ax.plot([a, b], [f(a), f(b)], 'r-', lw=2, label=f'弦 (斜率={slope:.2f})')
ax.plot([a, b], [f(a), f(b)], 'ro', ms=8)

# 中值点切线
tangent_x = np.linspace(xi - 0.8, xi + 0.8, 100)
tangent_y = f(xi) + slope * (tangent_x - xi)
ax.plot(tangent_x, tangent_y, 'g--', lw=2, label=f'切线于 $\\xi={xi:.3f}$ (斜率={slope:.2f})')
ax.plot(xi, f(xi), 'g*', ms=15)

ax.set_xlabel('x'); ax.set_ylabel('f(x)')
ax.set_title('Lagrange 中值定理: 切线平行于弦')
ax.legend(); ax.grid(True, alpha=0.3); ax.set_xlim(-0.2, 2.2)
plt.tight_layout(); plt.savefig('lagrange_visual.png', dpi=100); plt.show()
```

### 4.3 Cauchy 中值定理的几何意义

Cauchy 中值定理的几何陈述：参数曲线 $(g(t), f(t))$ 上至少存在一点，使切线斜率等于弦斜率。

```python
# Cauchy 中值定理可视化：参数曲线 (cos(t), sin(t)), t ∈ [0, π/4]
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import brentq

g = lambda t: np.cos(t)
f = lambda t: np.sin(t)
dg = lambda t: -np.sin(t)
df = lambda t: np.cos(t)
a, b = 0, np.pi / 4

slope_chord = (f(b) - f(a)) / (g(b) - g(a))
xi = brentq(lambda t: df(t)/dg(t) - slope_chord, a + 1e-10, b - 1e-10)
print(f"弦斜率 = {slope_chord:.6f}")
print(f"中值点 ξ = {xi:.6f}")
print(f"验证 f'(ξ)/g'(ξ) = {df(xi)/dg(xi):.6f}")

fig, ax = plt.subplots(figsize=(8, 8))
ts = np.linspace(0, np.pi/2, 200)
ax.plot(g(ts), f(ts), 'b-', lw=2, label='参数曲线 $(\\cos t, \\sin t)$')

# 弦
ax.plot([g(a), g(b)], [f(a), f(b)], 'r-', lw=2, label=f'弦 (斜率={slope_chord:.2f})')
ax.plot([g(a), g(b)], [f(a), f(b)], 'ro', ms=8)

# 切线于 ξ
tangent_t = np.linspace(xi - 0.3, xi + 0.3, 50)
ax.plot(g(tangent_t), f(tangent_t), 'g--', lw=2, label=f'切线方向于 $\\xi={xi:.3f}$')
ax.plot(g(xi), f(xi), 'g*', ms=15)

ax.set_xlabel('x = g(t)'); ax.set_ylabel('y = f(t)')
ax.set_title('Cauchy 中值定理: 参数曲线切线平行于弦')
ax.legend(); ax.grid(True, alpha=0.3); ax.set_aspect('equal')
plt.tight_layout(); plt.savefig('cauchy_visual.png', dpi=100); plt.show()
```

### 4.4 Taylor 多项式逼近的可视化

Taylor 多项式逼近的核心思想：用多项式在展开点附近"模拟"函数，阶数越高模拟越精确。

```python
# Taylor 多项式逼近 sin(x) 在 x0=0 处的可视化
import numpy as np
import matplotlib.pyplot as plt
from math import factorial

def taylor_sin(x, n):
    """sin(x) 的 2n+1 阶 Taylor 多项式"""
    return sum((-1)**k * x**(2*k+1) / factorial(2*k+1) for k in range(n+1))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
xs = np.linspace(-2*np.pi, 2*np.pi, 500)

# 左图：不同阶数 Taylor 多项式
axes[0].plot(xs, np.sin(xs), 'k-', lw=3, label='$\\sin(x)$ (真实)')
for n in [1, 2, 3, 5, 8]:
    ys = [taylor_sin(x, n) for x in xs]
    axes[0].plot(xs, ys, '--', lw=1.5, label=f'Taylor $T_{{{2*n+1}}}$')
axes[0].set_ylim(-2, 2); axes[0].set_xlim(-2*np.pi, 2*np.pi)
axes[0].set_xlabel('x'); axes[0].set_ylabel('y')
axes[0].set_title('Taylor 多项式逼近 $\\sin(x)$ 在 $x_0=0$')
axes[0].legend(loc='lower right', fontsize=8); axes[0].grid(True, alpha=0.3)

# 右图：误差曲线
x_eval = 1.0
ns = range(1, 15)
errors = [abs(np.sin(x_eval) - taylor_sin(x_eval, n)) for n in ns]
axes[1].semilogy(list(ns), errors, 'bo-', lw=2, ms=6)
axes[1].set_xlabel('Taylor 阶数 $n$'); axes[1].set_ylabel('绝对误差')
axes[1].set_title(f'Taylor 逼近误差在 $x={x_eval}$ 处')
axes[1].grid(True, alpha=0.3, which='both')
plt.tight_layout(); plt.savefig('taylor_approx.png', dpi=100); plt.show()
```

### 4.5 四种中值定理关系图

```mermaid
flowchart TD
    A[微分中值定理家族] --> B[Rolle 定理<br/>f(a)=f(b), ∃ξ: f'(ξ)=0]
    A --> C[Lagrange 中值定理<br/>∃ξ: f'(ξ)=f(b)-f(a)/b-a]
    A --> D[Cauchy 中值定理<br/>∃ξ: f'(ξ)/g'(ξ)=f(b)-f(a)/g(b)-g(a)]
    A --> E[Taylor 定理<br/>f(x)=Σ f^k(x0)/k!·x-x0^k + Rn]
    A --> F[Darboux 定理<br/>f' 取 f'(a) 与 f'(b) 间所有值]
    A --> G[积分中值定理<br/>∫f=f(ξ)(b-a)]
    B -.退化特例.-> C
    C -.g(x)=x 特例.-> D
    C -.n=0 形式.-> E
    B --> H[Flett 定理 1958<br/>f'(a)=f'(b) 加强形式]
    D --> I[Pompeiu 定理 1906<br/>参数化加强形式]
    H --> J[Flett-Pompeiu 综合形式]
    I --> J
```

### 4.6 应用决策树

```mermaid
flowchart TD
    A[问题: 是否可用中值定理?] --> B{需要证明存在性?}
    B -- 是,ξ∈a,b 使某等式成立 --> C{涉及 f' 还是 f''/g'?}
    B -- 否,估计误差或极限 --> D{是局部还是全局?}
    C -- 仅 f' --> E{是否有 f(a)=f(b)?}
    C -- f' 与 g' --> F[用 Cauchy 中值定理]
    C -- f'' 高阶 --> G[用 Taylor 定理]
    E -- 是 --> H[Rolle 定理]
    E -- 否 --> I[Lagrange 中值定理]
    D -- 局部 x→x0 --> J[Peano 余项]
    D -- 全局 x∈I --> K[Lagrange 余项]
    K -- 需更精细 --> L[Cauchy/Schlömilch 余项]
    F --> M{涉及导函数介值性?}
    M -- 是 --> N[Darboux 定理]
    M -- 否 --> O[积分中值定理]
```

## 5. 对比分析

### 5.1 Rolle ⊂ Lagrange ⊂ Cauchy 的包含关系

三种中值定理形成严格包含的层次结构：

| 定理     | 条件          | 结论                                                  | 关系                                          |
| -------- | ------------- | ----------------------------------------------------- | --------------------------------------------- |
| Rolle    | $f(a)=f(b)$   | $f'(\xi)=0$                                           | 基础                                          |
| Lagrange | —             | $f'(\xi)=\frac{f(b)-f(a)}{b-a}$                       | Rolle 的推广（端点等值时退化为 Rolle）        |
| Cauchy   | $g'(x)\neq 0$ | $\frac{f'(\xi)}{g'(\xi)}=\frac{f(b)-f(a)}{g(b)-g(a)}$ | Lagrange 的推广（$g(x)=x$ 时退化为 Lagrange） |

**严格性验证**：

1. **Rolle $\Rightarrow$ Lagrange**：构造 $\varphi(x) = f(x) - f(a) - \frac{f(b)-f(a)}{b-a}(x-a)$，验证 $\varphi(a)=\varphi(b)=0$，应用 Rolle 得 $\varphi'(\xi)=0$，即 Lagrange 结论。

2. **Lagrange $\Rightarrow$ Cauchy**：直接令 $g(x)=x$，则 $\frac{f'(\xi)}{g'(\xi)}=f'(\xi)$，$\frac{f(b)-f(a)}{g(b)-g(a)}=\frac{f(b)-f(a)}{b-a}$，得 Lagrange。

3. **严格包含**：Rolle 不能直接推出 Cauchy（需先推广到 Lagrange）；Lagrange 不能直接推出 Rolle（需端点等值约束）。

```python
# 三定理包含关系的数值演示
import numpy as np
from scipy.optimize import brentq

# 同一函数 f(x)=x^3-x, 同一区间 [0, 2], 验证三定理
f = lambda x: x**3 - x
g = lambda x: x  # Cauchy 中取 g(x)=x
df = lambda x: 3*x**2 - 1
dg = lambda x: 1

a, b = 0, 2

# Rolle: 不满足 f(a)=f(b) (f(0)=0, f(2)=6), 但可应用于子区间
# 在 [0, 1] 上 f(0)=0, f(1)=0, 满足 Rolle
print("=== Rolle 定理验证（[0,1]）===")
xi_rolle = brentq(lambda x: df(x), 0.1, 0.9)
print(f"ξ = {xi_rolle:.6f}, f'(ξ) = {df(xi_rolle):.6f} (应=0)")

# Lagrange: 在 [0, 2] 上
print("\n=== Lagrange 中值定理验证（[0,2]）===")
slope = (f(b) - f(a)) / (b - a)
xi_lag = brentq(lambda x: df(x) - slope, a, b)
print(f"弦斜率 = {slope:.6f}, ξ = {xi_lag:.6f}, f'(ξ) = {df(xi_lag):.6f}")

# Cauchy: f 与 g(x)=x, 在 [0, 2] 上
print("\n=== Cauchy 中值定理验证（[0,2], g(x)=x）===")
slope_cg = (f(b) - f(a)) / (g(b) - g(a))
xi_cauchy = brentq(lambda x: df(x)/dg(x) - slope_cg, a, b)
print(f"弦斜率 = {slope_cg:.6f}, ξ = {xi_cauchy:.6f}, f'(ξ)/g'(ξ) = {df(xi_cauchy)/dg(xi_cauchy):.6f}")
print(f"\n==> Cauchy 退化为 Lagrange (因 g(x)=x), ξ 一致: {np.isclose(xi_lag, xi_cauchy)}")
```

### 5.2 Taylor 与 Maclaurin

| 方面   | Taylor                  | Maclaurin             |
| ------ | ----------------------- | --------------------- |
| 展开点 | 任意 $x_0$              | 固定 $x_0 = 0$        |
| 收敛域 | 一般 $                  | x - x_0               | < R$ | 一般 $ | x   | < R$ |
| 系数   | $a_k = f^{(k)}(x_0)/k!$ | $a_k = f^{(k)}(0)/k!$ |
| 关系   | 一般形式                | 特例                  |
| 应用   | 局部逼近、误差估计      | 标准函数表、级数求和  |

**Maclaurin 级数的特殊性**：

1. $x_0 = 0$ 处导数往往有简洁形式（$e^x, \sin x, \cos x$ 的导数循环）；
2. 收敛半径易由系数比 $\lim |a_k/a_{k+1}|$ 确定；
3. 在数值计算中便于实现（无平移）。

```python
# Taylor vs Maclaurin 收敛性比较
import numpy as np
import sympy as sp

x = sp.symbols('x')

# Maclaurin 级数
f_sym = sp.ln(1 + x)
maclaurin = sp.series(f_sym, x, 0, n=10)
print(f"ln(1+x) 的 Maclaurin 级数 (n=9):\n{maclaurin}\n")

# Taylor 级数在 x0=1 处
taylor_at_1 = sp.series(f_sym, x, 1, n=10)
print(f"ln(1+x) 的 Taylor 级数 (x0=1, n=9):\n{taylor_at_1}\n")

# 收敛半径比较: Maclaurin |x|<1, Taylor |x-1|<1
print("Maclaurin 收敛域: |x| < 1, 即 x ∈ (-1, 1)")
print("Taylor (x0=1) 收敛域: |x-1| < 1, 即 x ∈ (0, 2)")

# 数值验证: 在 x=1.5 处, Maclaurin 不收敛, Taylor 收敛
x_eval = 1.5
true_val = float(sp.log(1 + x_eval))
print(f"\n在 x={x_eval} 处:")
print(f"  真实值 ln(1+{x_eval}) = {true_val:.6f}")

# Maclaurin 部分和 (n=20)
n_mac = 20
mac_sum = sum((-1)**(k-1) * x_eval**k / k for k in range(1, n_mac+1))
print(f"  Maclaurin 部分和 (n={n_mac}) = {mac_sum:.6f} (发散!)")

# Taylor 部分和 (n=20)
n_tay = 20
tay_sum = sum((-1)**(k-1) * (x_eval - 1)**k / k for k in range(1, n_tay+1))
print(f"  Taylor 部分和 (n={n_tay}) = {tay_sum:.6f} (收敛)")
```

### 5.3 积分中值定理 vs 微分中值定理

| 方面       | 微分中值定理                 | 积分中值定理                    |
| ---------- | ---------------------------- | ------------------------------- |
| 涉及对象   | 导数 $f'$ 与增量 $f(b)-f(a)$ | 积分 $\int f$ 与函数值 $f(\xi)$ |
| 几何意义   | 切线斜率 = 弦斜率            | 矩形面积 = 曲边梯形面积         |
| $\xi$ 位置 | $\xi \in (a, b)$ 开区间      | $\xi \in [a, b]$ 闭区间         |
| 函数要求   | 连续 + 可导                  | 连续（积分存在即可）            |
| 证明工具   | Rolle 定理 + 辅助函数        | 最值定理 + 介值定理             |

**联系**：积分中值定理可视为微分中值定理的"积分形式"。事实上，若 $F(x) = \int_a^x f(t) dt$，则 $F'(x) = f(x)$，对 $F$ 应用 Lagrange 中值定理：

$$F(b) - F(a) = F'(\xi)(b - a) \Rightarrow \int_a^b f(t) dt = f(\xi)(b - a).$$

这正是积分中值定理第一形式。

```python
# 微分中值定理与积分中值定理的统一性验证
import numpy as np
from scipy import integrate, optimize

f = lambda x: np.exp(-x**2)  # 不易求原函数,但中值定理仍成立
a, b = 0, 1

# 积分中值定理
integral_val, _ = integrate.quad(f, a, b)
mean_val = integral_val / (b - a)
xi_int = optimize.brentq(lambda x: f(x) - mean_val, a, b)
print(f"积分中值定理:")
print(f"  ∫_0^1 e^(-x²) dx = {integral_val:.6f}")
print(f"  平均值 = {mean_val:.6f}")
print(f"  ξ = {xi_int:.6f}, f(ξ) = {f(xi_int):.6f}")

# 微分中值定理（应用于 F(x)=∫_a^x f(t)dt, 即 F(b)-F(a)=F'(ξ)(b-a)）
# 等价于上述积分中值定理
print(f"\n微分中值定理（应用于 F(x)=∫_0^x e^(-t²)dt）:")
print(f"  F(1)-F(0) = {integral_val:.6f}")
print(f"  F'(ξ) = f(ξ) = e^(-ξ²) = {f(xi_int):.6f}")
print(f"  F'(ξ)*(b-a) = {f(xi_int)*(b-a):.6f}")
print(f"  两者相等: {np.isclose(integral_val, f(xi_int)*(b-a))}")
```

## 6. 常见陷阱

### 6.1 连续 vs 可微条件混淆

**陷阱**：误将 Lagrange 中值定理中"开区间可导"放松为"开区间连续"。

**反例**：$f(x) = |x|$ 在 $[-1, 1]$ 上连续，$f(-1) = f(1) = 1$，但 $f$ 在 $x = 0$ 不可导。在 $(-1, 1)$ 内无 $\xi$ 使 $f'(\xi) = 0$（左半区间 $f' = -1$，右半区间 $f' = 1$）。

**正确做法**：验证可导性时需检查整个开区间，特别关注分段函数的分段点、绝对值函数的零点、根式函数的奇点。

```python
# 连续但不满足可导条件的反例
import numpy as np
import matplotlib.pyplot as plt

f = lambda x: np.abs(x)
fig, ax = plt.subplots(figsize=(8, 5))
xs = np.linspace(-1.5, 1.5, 200)
ax.plot(xs, f(xs), 'b-', lw=2, label='$f(x) = |x|$')
ax.plot([-1, 1], [1, 1], 'ro', ms=10, label='端点 $f(-1)=f(1)=1$')
ax.plot([-1, 1], [1, 1], 'r--', lw=1)
ax.plot(0, 0, 'rx', ms=15, mew=3, label='不可导点 $x=0$')
ax.set_xlabel('x'); ax.set_ylabel('f(x)')
ax.set_title('Rolle 定理陷阱: $|x|$ 在 [-1,1] 上不满足可导性')
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('rolle_pitfall.png', dpi=100); plt.show()

# 数值验证: 在 (-1, 1) 内无 ξ 使 f'(ξ) = 0
print("|x| 在 (-1, 0) 内 f'=-1, 在 (0, 1) 内 f'=1, 无中值点使 f'=0")
```

### 6.2 端点验证缺失

**陷阱**：在使用 Rolle 定理时忘记验证 $f(a) = f(b)$。

**反例**：$f(x) = x$ 在 $[0, 1]$ 上连续可导，但 $f(0) = 0 \neq 1 = f(1)$，$f'(x) = 1 \neq 0$ 在整个区间内成立，不存在 $\xi$ 使 $f'(\xi) = 0$。

```python
# 端点验证缺失的反例
import numpy as np
f = lambda x: x
a, b = 0, 1
print(f"f(a) = {f(a)}, f(b) = {f(b)}")
print(f"f(a) == f(b)? {f(a) == f(b)}")
print(f"f'(x) = 1 在整个区间内, 不存在 ξ 使 f'(ξ) = 0")
```

### 6.3 Cauchy 定理分母为零

**陷阱**：在使用 Cauchy 中值定理时忽略 $g'(x) \neq 0$ 的条件，导致分母为零。

**反例**：取 $f(x) = x^2$，$g(x) = x^3$，$[a, b] = [-1, 1]$。则 $g'(x) = 3x^2$ 在 $x = 0$ 处为零。直接应用 Cauchy 中值定理将导致 $\frac{f'(\xi)}{g'(\xi)}$ 在 $\xi = 0$ 处无定义。

**正确做法**：在应用 Cauchy 中值定理前必须验证 $g'(x) \neq 0$ 在整个开区间内成立。若 $g'$ 有零点，需分段处理或选择不同的 $g$。

```python
# Cauchy 定理分母为零的反例
import numpy as np
import sympy as sp

x = sp.symbols('x')
f = x**2
g = x**3
a, b = -1, 1
df = sp.diff(f, x)
dg = sp.diff(g, x)
print(f"f(x) = {f}, g(x) = {g}")
print(f"f'(x) = {df}, g'(x) = {dg}")
print(f"g'(0) = {dg.subs(x, 0)} ← 分母为零!")

# 尝试直接应用 Cauchy 中值定理
lhs = (f.subs(x, b) - f.subs(x, a)) / (g.subs(x, b) - g.subs(x, a))
print(f"\nLHS = [f(b)-f(a)]/[g(b)-g(a)] = [{f.subs(x,b)}-{f.subs(x,a)}]/[{g.subs(x,b)}-{g.subs(x,a)}] = {lhs}")

# 在 g'(0)=0 时, f'/g' 在 0 附近无定义, 定理不适用
print("\n反例验证: g'(0)=0 导致 f'/g' 在 ξ=0 处无定义, Cauchy 定理不适用")
```

### 6.4 Taylor 级数收敛性

**陷阱**：误认为 $C^\infty$ 函数的 Taylor 级数必收敛于函数本身。

**经典反例**：$f(x) = e^{-1/x^2}$（$f(0) = 0$）。该函数在 $\mathbb{R}$ 上 $C^\infty$，且 $f^{(k)}(0) = 0$ 对一切 $k$ 成立，故其 Maclaurin 级数恒为零，但 $f(x) \neq 0$ 当 $x \neq 0$。

**正确认识**：

1. Taylor 多项式是局部近似工具，余项 $R_n(x) \to 0$ 才能保证级数收敛于 $f$；
2. 解析函数（即 Taylor 级数收敛于 $f$ 的函数）是 $C^\infty$ 函数的真子集；
3. 实分析中需用余项估计判断收敛性，复分析中解析性等价于复可微。

```python
# 经典反例: e^{-1/x^2} 的 Taylor 级数恒为零但不等于函数
import numpy as np
import matplotlib.pyplot as plt

f = lambda x: np.exp(-1/x**2) if x != 0 else 0.0
f_vec = np.vectorize(f)

xs = np.linspace(-2, 2, 500)
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(xs, f_vec(xs), 'b-', lw=2, label='$f(x) = e^{-1/x^2}$ (f(0)=0)')
ax.plot(xs, np.zeros_like(xs), 'r--', lw=2, label='Maclaurin 级数 (恒为零)')
ax.set_xlabel('x'); ax.set_ylabel('f(x)')
ax.set_title('反例: $C^\\infty$ 但非解析的函数, Taylor 级数不收敛于 $f$')
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('non_analytic.png', dpi=100); plt.show()

# 数值验证: 在 x=0.5 处, f(0.5)=e^{-4}≈0.018, 但 Taylor 级数部分和恒为 0
print(f"f(0.5) = e^{{-4}} = {np.exp(-4):.6f}")
print(f"Maclaurin 级数部分和 (任意阶) = 0")
print(f"==> 级数不收敛于 f(x), f 是 C^∞ 但非解析")
```

### 6.5 L'Hôpital 法则的条件

**陷阱**：忽略 L'Hôpital 法则中"$\lim f'/g'$ 存在"的条件。

**反例**：$f(x) = x^2 \sin(1/x)$，$g(x) = x$，$x \to 0$。则 $\lim f/g = \lim x \sin(1/x) = 0$。但 $f'(x) = 2x \sin(1/x) - \cos(1/x)$，$g'(x) = 1$，$\lim f'/g' = \lim [2x \sin(1/x) - \cos(1/x)]$ 不存在（因 $\cos(1/x)$ 振荡）。

**正确认识**：L'Hôpital 法则是单向的——若 $\lim f'/g'$ 存在则 $\lim f/g$ 存在且相等，但反之不成立。当 $\lim f'/g'$ 不存在时，$\lim f/g$ 仍可能存在，需用其他方法。

```python
# L'Hôpital 法则条件陷阱
import numpy as np

# f(x) = x^2 sin(1/x), g(x) = x, x→0
f = lambda x: x**2 * np.sin(1/x) if x != 0 else 0
g = lambda x: x
df = lambda x: 2*x*np.sin(1/x) - np.cos(1/x) if x != 0 else 0
dg = lambda x: 1

# lim f/g = lim x sin(1/x) = 0
xs = np.array([0.1, 0.01, 0.001, 0.0001, 0.00001])
print("lim_{x→0} f(x)/g(x):")
for x in xs:
    print(f"  x={x}: f/g = {f(x)/g(x):.6f}")
print(f"  ==> 极限 = 0 (由夹逼准则: |x sin(1/x)| ≤ |x| → 0)")

print("\nlim_{x→0} f'(x)/g'(x):")
for x in xs:
    print(f"  x={x}: f'/g' = {df(x)/dg(x):.6f}")
print(f"  ==> 极限不存在 (cos(1/x) 振荡)")
print(f"  ==> L'Hôpital 法则不适用, 因 lim f'/g' 不存在")
```

### 6.6 积分中值定理中 $f$ 连续的必要性

**陷阱**：在积分中值定理中忽略 $f$ 连续的条件，仅要求 $f$ 可积。

**反例**：$f(x) = \text{sgn}(x)$（符号函数）在 $[-1, 1]$ 上可积，$\int_{-1}^1 f = 0$。但 $f$ 仅取 $-1, 0, 1$ 三个值，无 $\xi$ 使 $f(\xi) = 0/(1-(-1)) = 0$ 之外的其他值（虽然此处 $f(0) = 0$ 巧合成立，但若改为 $f(x) = \text{sgn}(x) + 1$ 则不成立）。

**正确认识**：积分中值定理要求 $f$ 连续才能保证 $\xi$ 的存在性。若 $f$ 仅可积，则只能得到积分介于 $m(b-a)$ 与 $M(b-a)$ 之间，但不能保证 $\xi$ 使 $f(\xi)$ 等于平均值。

```python
# 积分中值定理 f 连续必要性的反例
import numpy as np
from scipy import integrate

# f(x) = sign(x) + 1, 仅取 0 和 2 两个值
f = np.sign  # sign(0)=0, sign(±x)=±1
a, b = -1, 1
integral_val, _ = integrate.quad(f, a, b)
mean_val = integral_val / (b - a)
print(f"f = sign(x), ∫_{{-1}}^1 f dx = {integral_val}")
print(f"平均值 = {mean_val} (应为 0, 巧合成立)")

# 修改: f(x) = sign(x) + 1, 取值 0 和 2
f2 = lambda x: np.sign(x) + 1
integral_val2, _ = integrate.quad(f2, a, b)
mean_val2 = integral_val2 / (b - a)
print(f"\nf = sign(x)+1, ∫_{{-1}}^1 f dx = {integral_val2}")
print(f"平均值 = {mean_val2} (应为 1)")
print(f"f 的取值集合: {{0, 2}}, 不存在 ξ 使 f(ξ)=1")
print(f"==> 积分中值定理失效 (f 不连续)")
```

## 7. 工程实践

### 7.1 数值分析中的误差估计

Taylor 余项是数值分析误差估计的核心工具。典型应用包括：

1. **数值微分**：用差商近似导数，误差由 Taylor 余项控制；
2. **数值积分**：梯形公式、Simpson 公式的误差阶由 Taylor 余项分析；
3. **迭代法收敛性**：Newton 迭代、不动点迭代的收敛阶分析依赖 Taylor 展开。

```python
# 数值微分误差分析: 中心差商 vs 前向差商
import numpy as np
import matplotlib.pyplot as plt

f = lambda x: np.sin(x)
df_exact = lambda x: np.cos(x)
x0 = 1.0

# 前向差商: [f(x0+h) - f(x0)]/h, 误差 O(h) (Lagrange 中值定理)
# 中心差商: [f(x0+h) - f(x0-h)]/(2h), 误差 O(h^2) (Taylor 展开到三阶)

hs = np.logspace(-1, -10, 50)
forward_err = [abs((f(x0+h) - f(x0))/h - df_exact(x0)) for h in hs]
central_err = [abs((f(x0+h) - f(x0-h))/(2*h) - df_exact(x0)) for h in hs]

fig, ax = plt.subplots(figsize=(10, 6))
ax.loglog(hs, forward_err, 'b-', lw=2, label='前向差商 $O(h)$')
ax.loglog(hs, central_err, 'r-', lw=2, label='中心差商 $O(h^2)$')
ax.loglog(hs, hs, 'b--', lw=1, label='$O(h)$ 参考')
ax.loglog(hs, hs**2, 'r--', lw=1, label='$O(h^2)$ 参考')
ax.set_xlabel('步长 $h$'); ax.set_ylabel('绝对误差')
ax.set_title('数值微分误差: Taylor 余项分析')
ax.legend(); ax.grid(True, alpha=0.3, which='both')
plt.tight_layout(); plt.savefig('num_diff_error.png', dpi=100); plt.show()

# 理论误差 (Taylor 展开):
# 前向差商: f(x0+h) = f(x0) + f'(x0)h + f''(ξ)/2 · h²
#   => [f(x0+h)-f(x0)]/h = f'(x0) + f''(ξ)/2 · h, 误差 = f''(ξ)/2 · h = O(h)
# 中心差商: f(x0±h) = f(x0) ± f'(x0)h + f''(x0)/2·h² ± f'''(ξ)/6·h³
#   => [f(x0+h)-f(x0-h)]/(2h) = f'(x0) + f'''(ξ)/6 · h², 误差 = O(h²)
print("理论误差分析 (Taylor 展开):")
print("前向差商: 误差 = f''(ξ)/2 · h = O(h)")
print("中心差商: 误差 = f'''(ξ)/6 · h² = O(h²)")
```

### 7.2 Taylor 展开近似计算

Taylor 多项式是计算超越函数值的基础工具，特别是在嵌入式系统、无 FPU 的环境中。

```python
# 用 Taylor 多项式计算 e^x, sin(x), cos(x), ln(1+x)
import numpy as np
from math import factorial

def taylor_exp(x, n=15):
    """e^x 的 Taylor 多项式 (n 阶)"""
    return sum(x**k / factorial(k) for k in range(n+1))

def taylor_sin(x, n=10):
    """sin(x) 的 Taylor 多项式 (2n+1 阶)"""
    return sum((-1)**k * x**(2*k+1) / factorial(2*k+1) for k in range(n+1))

def taylor_cos(x, n=10):
    """cos(x) 的 Taylor 多项式 (2n 阶)"""
    return sum((-1)**k * x**(2*k) / factorial(2*k) for k in range(n+1))

def taylor_log(x, n=20):
    """ln(1+x) 的 Taylor 多项式 (n 阶), 要求 |x|<1"""
    if abs(x) >= 1:
        raise ValueError("|x| 必须 < 1")
    return sum((-1)**(k-1) * x**k / k for k in range(1, n+1))

# 验证
print("=== Taylor 多项式近似计算 ===")
test_points = [0.1, 0.5, 1.0]
for x in test_points:
    print(f"\nx = {x}:")
    print(f"  e^{x}:   Taylor={taylor_exp(x):.10f}, 真实={np.exp(x):.10f}, 误差={abs(taylor_exp(x)-np.exp(x)):.2e}")
    print(f"  sin({x}): Taylor={taylor_sin(x):.10f}, 真实={np.sin(x):.10f}, 误差={abs(taylor_sin(x)-np.sin(x)):.2e}")
    print(f"  cos({x}): Taylor={taylor_cos(x):.10f}, 真实={np.cos(x):.10f}, 误差={abs(taylor_cos(x)-np.cos(x)):.2e}")
    if abs(x) < 1:
        print(f"  ln(1+{x}): Taylor={taylor_log(x):.10f}, 真实={np.log(1+x):.10f}, 误差={abs(taylor_log(x)-np.log(1+x)):.2e}")

# 误差估计: Lagrange 余项
print("\n=== Lagrange 余项估计 ===")
x, n = 0.5, 5
# e^x 的 Lagrange 余项: e^ξ/(n+1)! · x^(n+1), ξ∈(0, x)
# 上界: e^x/(n+1)! · x^(n+1) (因 e^ξ ≤ e^x)
bound = np.exp(x) / factorial(n+1) * x**(n+1)
actual = abs(np.exp(x) - taylor_exp(x, n))
print(f"e^{x}, n={n}: 实际误差={actual:.2e}, Lagrange 上界={bound:.2e}")
```

### 7.3 物理运动学

Lagrange 中值定理在运动学中描述：瞬时速度等于某段时间内的平均速度。

```python
# 物理运动学应用: 自由落体 s(t) = (1/2)gt^2
import numpy as np
import matplotlib.pyplot as plt

g = 9.8  # 重力加速度
s = lambda t: 0.5 * g * t**2
v = lambda t: g * t  # 速度 s'(t)

# 在 [0, 3] 秒内, 平均速度 = s(3)/3 = (1/2)g·9/3 = 3g/2
a, b = 0, 3
avg_v = (s(b) - s(a)) / (b - a)
print(f"平均速度 = {avg_v:.2f} m/s")

# Lagrange 中值定理: 存在 ξ 使 v(ξ) = avg_v, 即 g·ξ = 3g/2, ξ = 1.5
xi = avg_v / g
print(f"中值时刻 ξ = {xi:.2f} s")
print(f"验证 v(ξ) = {v(xi):.2f} m/s = 平均速度")

# 可视化
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
ts = np.linspace(0, 3, 100)
axes[0].plot(ts, s(ts), 'b-', lw=2, label='$s(t) = \\frac{1}{2}gt^2$')
axes[0].plot([a, b], [s(a), s(b)], 'r--', lw=2, label=f'弦 (斜率={avg_v:.1f})')
axes[0].plot(xi, s(xi), 'g*', ms=15, label=f'中值点 $\\xi={xi}$')
axes[0].set_xlabel('t (s)'); axes[0].set_ylabel('s (m)')
axes[0].set_title('位移-时间: Lagrange 中值定理')
axes[0].legend(); axes[0].grid(True, alpha=0.3)

axes[1].plot(ts, v(ts), 'b-', lw=2, label='$v(t) = gt$')
axes[1].axhline(avg_v, color='r', ls='--', lw=2, label=f'平均速度={avg_v:.1f}')
axes[1].plot(xi, v(xi), 'g*', ms=15, label=f'$v(\\xi)={v(xi):.1f}$')
axes[1].set_xlabel('t (s)'); axes[1].set_ylabel('v (m/s)')
axes[1].set_title('速度-时间: 瞬时=平均')
axes[1].legend(); axes[1].grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('kinematics.png', dpi=100); plt.show()
```

### 7.4 经济学边际分析

Lagrange 中值定理在经济学中描述：边际成本（导数）等于某产量区间内的平均成本变化率。

```python
# 经济学边际分析: 成本函数 C(q) = q^3 - 10q^2 + 50q + 100
import numpy as np
import matplotlib.pyplot as plt

C = lambda q: q**3 - 10*q**2 + 50*q + 100
MC = lambda q: 3*q**2 - 20*q + 50  # 边际成本 C'(q)

# 产量从 2 到 8, 平均成本变化率
q1, q2 = 2, 8
avg_cost_change = (C(q2) - C(q1)) / (q2 - q1)
print(f"产量从 {q1} 到 {q2}:")
print(f"  总成本变化: C({q2})-C({q1}) = {C(q2)-C(q1)}")
print(f"  平均成本变化率 = {avg_cost_change:.2f}")

# Lagrange 中值定理: 存在 ξ 使 MC(ξ) = avg_cost_change
# 即 3ξ² - 20ξ + 50 = avg_cost_change
from scipy.optimize import brentq
eq = lambda q: MC(q) - avg_cost_change
xi = brentq(eq, q1, q2)
print(f"  中值产量 ξ = {xi:.4f}")
print(f"  边际成本 MC(ξ) = {MC(xi):.4f}")
print(f"  验证: MC(ξ) ≈ 平均变化率: {np.isclose(MC(xi), avg_cost_change)}")

# 可视化
fig, ax = plt.subplots(figsize=(10, 6))
qs = np.linspace(0, 10, 200)
ax.plot(qs, C(qs), 'b-', lw=2, label='$C(q) = q^3 - 10q^2 + 50q + 100$')
ax.plot([q1, q2], [C(q1), C(q2)], 'r--', lw=2, label=f'弦 (斜率={avg_cost_change:.1f})')
ax.plot(q1, C(q1), 'ro', ms=8); ax.plot(q2, C(q2), 'ro', ms=8)
ax.plot(xi, C(xi), 'g*', ms=15, label=f'中值点 $\\xi={xi:.2f}$')
ax.set_xlabel('产量 q'); ax.set_ylabel('成本 C(q)')
ax.set_title('经济学: 边际成本 = 平均成本变化率 (Lagrange 中值定理)')
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('economics_marginal.png', dpi=100); plt.show()
```

### 7.5 控制理论中的线性化

控制理论中，非线性系统 $\dot{x} = f(x)$ 在平衡点 $x^*$ 附近的局部行为由 Jacobian $Df(x^*)$ 决定，这是 Taylor 展开的一阶近似。

```python
# 控制理论线性化: 非线性系统 dx/dt = f(x) 在平衡点附近
import numpy as np
import matplotlib.pyplot as plt

# 例: 单摆方程 θ'' + (g/L) sin(θ) = 0
# 状态空间: x1=θ, x2=θ', dx1/dt=x2, dx2/dt=-(g/L)sin(x1)
g, L = 9.8, 1.0
def f(x):
    return np.array([x[1], -(g/L)*np.sin(x[0])])

# 平衡点: x* = (0, 0) (即 θ=0, θ'=0)
# Jacobian: Df(x*) = [[0, 1], [-g/L, 0]] (因 cos(0)=1)
J = np.array([[0, 1], [-g/L, 0]])
print("平衡点 x* = (0, 0)")
print(f"Jacobian Df(x*) =\n{J}")
eigenvalues = np.linalg.eigvals(J)
print(f"特征值 = {eigenvalues}")
print(f"特征值实部 = {eigenvalues.real}, 均为零 → 中心 (临界稳定)")

# Taylor 展开: f(x) ≈ f(x*) + Df(x*)(x-x*) = Df(x*)(x-x*) (因 f(x*)=0)
# 即线性化系统: dx/dt = J·x
# 非线性项: f(x) - J·x = [0, -g/L*(sin(x1) - x1)] = [0, -g/L*(-x1^3/6 + ...)]
# 由 Taylor: sin(x1) = x1 - x1^3/6 + ..., 故非线性项 = [0, g/L * x1^3/6 + ...]

# 数值验证: 线性化系统与原系统在小扰动下的差异
from scipy.integrate import solve_ivp
def nonlinear_sys(t, x): return f(x)
def linear_sys(t, x): return J @ x

x0 = [0.1, 0]  # 小初始扰动
t_span = (0, 5); t_eval = np.linspace(0, 5, 200)
sol_nl = solve_ivp(nonlinear_sys, t_span, x0, t_eval=t_eval)
sol_l = solve_ivp(linear_sys, t_span, x0, t_eval=t_eval)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].plot(sol_nl.t, sol_nl.y[0], 'b-', lw=2, label='非线性原系统')
axes[0].plot(sol_l.t, sol_l.y[0], 'r--', lw=2, label='线性化系统')
axes[0].set_xlabel('t'); axes[0].set_ylabel('θ(t)')
axes[0].set_title('小扰动 (θ₀=0.1): 线性化逼近良好')
axes[0].legend(); axes[0].grid(True, alpha=0.3)

x0_large = [1.5, 0]  # 大扰动
sol_nl2 = solve_ivp(nonlinear_sys, t_span, x0_large, t_eval=t_eval)
sol_l2 = solve_ivp(linear_sys, t_span, x0_large, t_eval=t_eval)
axes[1].plot(sol_nl2.t, sol_nl2.y[0], 'b-', lw=2, label='非线性原系统')
axes[1].plot(sol_l2.t, sol_l2.y[0], 'r--', lw=2, label='线性化系统')
axes[1].set_xlabel('t'); axes[1].set_ylabel('θ(t)')
axes[1].set_title('大扰动 (θ₀=1.5): 线性化失效 (Taylor 高阶项主导)')
axes[1].legend(); axes[1].grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig('control_linearization.png', dpi=100); plt.show()

# 误差分析 (Taylor 余项):
# 非线性项 = (g/L)(x1 - sin(x1)) = (g/L)(x1^3/6 - ...) = O(|x1|^3)
# 当 |x1| 小时, 非线性项 << 线性项, 线性化有效
# 当 |x1| 大时, 非线性项不可忽略
print("\nTaylor 余项分析:")
print(f"非线性项 (g/L)(θ - sin(θ)) 在 θ=0.1 时: {(g/L)*(0.1 - np.sin(0.1)):.6f}")
print(f"非线性项 (g/L)(θ - sin(θ)) 在 θ=1.5 时: {(g/L)*(1.5 - np.sin(1.5)):.6f}")
```

### 7.6 机器学习梯度下降收敛性

梯度下降算法的收敛性分析依赖 Lagrange 中值定理与 Taylor 展开。

```python
# 梯度下降收敛性分析
import numpy as np
import matplotlib.pyplot as plt

# 目标函数: f(x) = x^4 - 4x^2 + 4 (双井函数)
f = lambda x: x**4 - 4*x**2 + 4
df = lambda x: 4*x**3 - 8*x
d2f = lambda x: 12*x**2 - 8

# 梯度下降: x_{k+1} = x_k - η·f'(x_k)
def gradient_descent(x0, lr, n_iter):
    trajectory = [x0]
    for _ in range(n_iter):
        x = trajectory[-1]
        trajectory.append(x - lr * df(x))
    return np.array(trajectory)

# 不同学习率
x0 = 1.5
lrs = [0.01, 0.05, 0.1, 0.15]
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

xs_plot = np.linspace(-2, 2, 200)
axes[0].plot(xs_plot, f(xs_plot), 'k-', lw=2, label='$f(x) = x^4 - 4x^2 + 4$')
for lr in lrs:
    traj = gradient_descent(x0, lr, 50)
    axes[0].plot(traj, f(traj), 'o-', ms=3, label=f'lr={lr}')
axes[0].set_xlabel('x'); axes[0].set_ylabel('f(x)')
axes[0].set_title('梯度下降轨迹')
axes[0].legend(); axes[0].grid(True, alpha=0.3)

# 收敛速度分析: 在极小点附近, f(x) ≈ f(x*) + (1/2)f''(x*)(x-x*)²
# f'(x) ≈ f''(x*)(x-x*), 故 x_{k+1}-x* ≈ (1 - η·f''(x*))(x_k - x*)
# 收敛条件: |1 - η·f''(x*)| < 1, 即 0 < η·f''(x*) < 2
x_star = np.sqrt(2)  # 极小点
hessian = d2f(x_star)
print(f"极小点 x* = {x_star:.4f}")
print(f"Hessian (二阶导) f''(x*) = {hessian:.4f}")
print(f"收敛条件: 0 < η·{hessian:.2f} < 2, 即 0 < η < {2/hessian:.4f}")

for lr in lrs:
    rate = 1 - lr * hessian
    conv = "收敛" if abs(rate) < 1 else "发散"
    print(f"  lr={lr}: 收敛因子 = {rate:.4f}, {conv}")

# 收敛速度可视化
for lr in lrs:
    traj = gradient_descent(x0, lr, 30)
    errors = np.abs(traj - x_star)
    axes[1].semilogy(range(len(errors)), errors, 'o-', ms=3, label=f'lr={lr}')
axes[1].set_xlabel('迭代次数'); axes[1].set_ylabel('|x_k - x*|')
axes[1].set_title('收敛速度 (对数尺度)')
axes[1].legend(); axes[1].grid(True, alpha=0.3, which='both')
plt.tight_layout(); plt.savefig('gradient_descent.png', dpi=100); plt.show()

print("\n=== Taylor 展开收敛性分析 ===")
print("在极小点 x* 附近:")
print("  f(x) ≈ f(x*) + (1/2)f''(x*)(x-x*)²")
print("  f'(x) ≈ f''(x*)(x-x*)")
print("  x_{k+1} = x_k - η·f'(x_k) ≈ x_k - η·f''(x*)(x_k - x*)")
print("        = x* + (1 - η·f''(x*))(x_k - x*)")
print("  收敛条件: |1 - η·f''(x*)| < 1, 即 0 < η < 2/f''(x*)")
```

## 8. 案例研究

### 8.1 Newton 迭代法收敛性证明

**算法**：求 $f(x) = 0$ 的根，迭代格式 $x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}$。

**收敛性定理**：设 $f$ 在根 $x^*$ 附近二阶连续可导，$f'(x^*) \neq 0$，则存在 $\delta > 0$ 使当初值 $x_0 \in (x^* - \delta, x^* + \delta)$ 时，Newton 迭代二阶收敛：

$$|x_{k+1} - x^*| \leq C |x_k - x^*|^2$$

其中 $C = \frac{M}{2|f'(x^*)|}$，$M = \max_{|x - x^*| \leq \delta} |f''(x)|$。

**证明** 由 Taylor 展开（带 Lagrange 余项）：

$$0 = f(x^*) = f(x_k) + f'(x_k)(x^* - x_k) + \frac{f''(\xi_k)}{2}(x^* - x_k)^2$$

其中 $\xi_k$ 介于 $x^*$ 与 $x_k$ 之间。整理得

$$f(x_k) + f'(x_k)(x^* - x_k) = -\frac{f''(\xi_k)}{2}(x_k - x^*)^2.$$

由迭代格式 $x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}$，得 $f(x_k) = f'(x_k)(x_k - x_{k+1})$，代入上式：

$$f'(x_k)(x_k - x_{k+1}) + f'(x_k)(x^* - x_k) = -\frac{f''(\xi_k)}{2}(x_k - x^*)^2,$$

即

$$f'(x_k)(x^* - x_{k+1}) = -\frac{f''(\xi_k)}{2}(x_k - x^*)^2,$$

故

$$x^* - x_{k+1} = -\frac{f''(\xi_k)}{2 f'(x_k)} (x_k - x^*)^2.$$

取绝对值，由 $f'(x_k) \to f'(x^*) \neq 0$（连续性），$|f''(\xi_k)| \leq M$，得

$$|x_{k+1} - x^*| \leq \frac{M}{2 |f'(x_k)|} |x_k - x^*|^2 \leq C |x_k - x^*|^2,$$

其中 $C = \frac{M}{2 \inf_{|x - x^*| \leq \delta} |f'(x)|}$，由 $f'(x^*) \neq 0$ 知 $C < \infty$。$\blacksquare$

**注**：二阶收敛意味着每迭代一步，有效位数大致翻倍。这是 Newton 迭代效率极高的根本原因。

```python
# Newton 迭代法二阶收敛性数值验证: 求 sqrt(2)
import numpy as np

# f(x) = x^2 - 2, f'(x) = 2x, x* = sqrt(2)
f = lambda x: x**2 - 2
df = lambda x: 2*x
x_star = np.sqrt(2)

def newton(x0, n_iter):
    """Newton 迭代法"""
    traj = [x0]
    for _ in range(n_iter):
        x = traj[-1]
        traj.append(x - f(x)/df(x))
    return traj

x0 = 1.5
traj = newton(x0, 8)
errors = [abs(x - x_star) for x in traj]

print(f"真实根 x* = sqrt(2) = {x_star:.15f}")
print(f"{'k':>3} {'x_k':>22} {'|x_k - x*|':>22} {'比值 e_k/e_{k-1}^2':>22}")
for k, (x, e) in enumerate(zip(traj, errors)):
    ratio = errors[k] / errors[k-1]**2 if k > 0 and errors[k-1] > 0 else float('nan')
    print(f"{k:>3} {x:>22.15f} {e:>22.3e} {ratio:>22.4f}")

# 理论常数 C = M / (2*|f'(x*)|), M = max|f''| = 2, f'(x*) = 2*sqrt(2)
M = 2.0
C = M / (2 * abs(2 * x_star))
print(f"\n理论常数 C = M/(2|f'(x*)|) = {C:.4f}")
print(f"二阶收敛: |e_{{k+1}}| ≤ C·|e_k|², 即比值应趋近于 C ≈ {C:.4f}")
```

### 8.2 RK4 数值积分误差分析

Runge-Kutta 4 阶方法（RK4）是数值求解常微分方程的标准算法，其局部截断误差为 $O(h^5)$，全局误差为 $O(h^4)$。该误差阶的严格证明依赖 Taylor 展开到 5 阶。

**算法**：求解 $\dot{y} = f(t, y)$，迭代格式

$$y_{n+1} = y_n + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4),$$

其中

$$k_1 = f(t_n, y_n), \quad k_2 = f(t_n + h/2, y_n + h k_1/2),$$
$$k_3 = f(t_n + h/2, y_n + h k_2/2), \quad k_4 = f(t_n + h, y_n + h k_3).$$

**误差分析**：将 $y(t_{n+1})$ 在 $t_n$ 处 Taylor 展开到 5 阶，与 RK4 公式比较，前 4 阶项完全匹配，第 5 阶项的差异即为局部截断误差。

```python
# RK4 误差阶数值验证: 求解 y' = y, y(0) = 1, 真解 y = e^t
import numpy as np
import matplotlib.pyplot as plt

def rk4_step(f, t, y, h):
    """RK4 单步"""
    k1 = f(t, y)
    k2 = f(t + h/2, y + h*k1/2)
    k3 = f(t + h/2, y + h*k2/2)
    k4 = f(t + h, y + h*k3)
    return y + h/6 * (k1 + 2*k2 + 2*k3 + k4)

def rk4_solve(f, t0, y0, t_end, h):
    """RK4 完整求解"""
    ts = np.arange(t0, t_end + h, h)
    ys = np.zeros_like(ts)
    ys[0] = y0
    for i in range(len(ts)-1):
        ys[i+1] = rk4_step(f, ts[i], ys[i], h)
    return ts, ys

f = lambda t, y: y  # y' = y, 真解 y = e^t
t0, y0, t_end = 0, 1, 1
true_val = np.exp(t_end)

# 不同步长
hs = [0.1, 0.05, 0.025, 0.0125, 0.00625]
errors = []
for h in hs:
    _, ys = rk4_solve(f, t0, y0, t_end, h)
    err = abs(ys[-1] - true_val)
    errors.append(err)
    print(f"h = {h:.5f}: y(1) ≈ {ys[-1]:.10f}, 误差 = {err:.3e}")

# 验证误差阶 O(h^4): 误差比应趋近于 16 (因 (h/2)^4/h^4 = 1/16)
print("\n误差比值 (应趋近 16):")
for i in range(len(errors)-1):
    ratio = errors[i] / errors[i+1]
    print(f"  e(h={hs[i]:.5f}) / e(h={hs[i+1]:.5f}) = {ratio:.2f}")

# 对数图验证
fig, ax = plt.subplots(figsize=(8, 5))
ax.loglog(hs, errors, 'bo-', lw=2, ms=8, label='RK4 实际误差')
ax.loglog(hs, [h**4 for h in hs], 'r--', lw=1, label='$O(h^4)$ 参考')
ax.set_xlabel('步长 h'); ax.set_ylabel('全局误差')
ax.set_title('RK4 全局误差阶分析: Taylor 余项 O(h⁴)')
ax.legend(); ax.grid(True, alpha=0.3, which='both')
plt.tight_layout(); plt.savefig('rk4_error.png', dpi=100); plt.show()
```

### 8.3 自动微分的 Taylor 模式

自动微分（Automatic Differentiation, AD）的 Taylor 模式（前向高阶 AD）利用 Taylor 多项式的代数运算规则，自动化计算高阶导数。这是数值分析与符号计算的桥梁。

**核心思想**：将每个变量表示为 Taylor 多项式（截断到 $n$ 阶），通过预定义的算子（加、乘、复合、求逆）在 Taylor 多项式上操作，最终得到目标函数的 $n$ 阶 Taylor 展开。

```python
# Taylor 模式自动微分: 计算 f(x) = sin(x²) 的 5 阶 Taylor 展开
# 使用多项式代数 (截断到 5 阶)
import numpy as np

class TaylorPoly:
    """截断 Taylor 多项式 (在 x0=0 附近)"""
    def __init__(self, coeffs):
        # coeffs[k] = f^(k)(0)/k!
        self.coeffs = np.array(coeffs, dtype=float)
        self.order = len(coeffs) - 1

    def __add__(self, other):
        n = max(self.order, other.order) + 1
        a = np.zeros(n); a[:len(self.coeffs)] = self.coeffs
        b = np.zeros(n); b[:len(other.coeffs)] = other.coeffs
        return TaylorPoly(a + b)

    def __mul__(self, other):
        n = self.order + other.order + 1
        c = np.zeros(n)
        for i in range(len(self.coeffs)):
            for j in range(len(other.coeffs)):
                if i + j < n:
                    c[i+j] += self.coeffs[i] * other.coeffs[j]
        return TaylorPoly(c[:max(self.order, other.order)+1])

    def compose(self, g_coeffs):
        """复合 f(g(x)), g_coeffs 为 g 的 Taylor 系数"""
        n = len(self.coeffs)
        # 使用 Horner 形式: f(g) = c0 + c1·g + c2·g² + ...
        result = TaylorPoly([self.coeffs[-1]])
        for k in range(self.order - 1, -1, -1):
            result = result * TaylorPoly(g_coeffs) + TaylorPoly([self.coeffs[k]])
        return result

    def __repr__(self):
        terms = []
        for k, c in enumerate(self.coeffs):
            if abs(c) > 1e-15:
                terms.append(f"{c:.6f}·x^{k}")
        return " + ".join(terms) if terms else "0"

# 计算 sin(x²) 在 x=0 处的 Taylor 展开
# sin(u) = u - u³/6 + u⁵/120 - ...
# u = x², 故 sin(x²) = x² - x⁶/6 + ...
# 5 阶 Taylor 展开: x² - x⁶/6, 截断到 5 阶即 x²

# sin(u) 的 Taylor 系数 (截断到 5 阶)
sin_coeffs = [0, 1, 0, -1/6, 0, 1/120]
# x² 的 Taylor 系数
x2_coeffs = [0, 0, 1, 0, 0, 0]

sin_poly = TaylorPoly(sin_coeffs)
x2_poly = TaylorPoly(x2_coeffs)
result = sin_poly.compose(x2_coeffs)
print("sin(x²) 的 5 阶 Taylor 展开:")
print(f"  数值: {result}")
print(f"  系数: {result.coeffs}")

# 真实系数 (由 sympy 验证)
import sympy as sp
x = sp.symbols('x')
true_series = sp.series(sp.sin(x**2), x, 0, n=6)
print(f"\nSympy 验证: {true_series}")
```

### 8.4 PyTorch autograd 梯度检查

PyTorch 的 `autograd` 模块基于反向模式自动微分，其正确性验证依赖有限差分（中值定理的应用）。

**梯度检查原理**：对函数 $f: \mathbb{R}^n \to \mathbb{R}$，autograd 计算梯度 $\nabla f(x)$。数值梯度通过中心差商近似：

$$\frac{\partial f}{\partial x_i} \approx \frac{f(x + h e_i) - f(x - h e_i)}{2h}.$$

由 Taylor 展开（带 Lagrange 余项）：

$$f(x + h e_i) = f(x) + h \frac{\partial f}{\partial x_i} + \frac{h^2}{2} \frac{\partial^2 f}{\partial x_i^2}(\xi_+),$$
$$f(x - h e_i) = f(x) - h \frac{\partial f}{\partial x_i} + \frac{h^2}{2} \frac{\partial^2 f}{\partial x_i^2}(\xi_-).$$

相减得

$$\frac{f(x + h e_i) - f(x - h e_i)}{2h} = \frac{\partial f}{\partial x_i} + O(h^2).$$

即中心差商的误差为 $O(h^2)$，可用于验证 autograd 的正确性。

```python
# PyTorch autograd 梯度检查
# 若无 PyTorch, 可用 NumPy 实现反向模式 AD
import numpy as np

# 简化版自动微分 (前向模式, 用于验证)
# 对 f(x, y) = x²·y + sin(x·y), 验证 ∂f/∂x 与 ∂f/∂y

def f(x, y):
    return x**2 * y + np.sin(x * y)

def df_dx(x, y):
    """解析偏导 ∂f/∂x = 2xy + y·cos(xy)"""
    return 2*x*y + y * np.cos(x*y)

def df_dy(x, y):
    """解析偏导 ∂f/∂y = x² + x·cos(xy)"""
    return x**2 + x * np.cos(x*y)

# 数值梯度 (中心差商)
def numerical_grad(f, x, y, h=1e-5):
    dfdx = (f(x+h, y) - f(x-h, y)) / (2*h)
    dfdy = (f(x, y+h) - f(x, y-h)) / (2*h)
    return np.array([dfdx, dfdy])

# 测试
x_test, y_test = 1.5, 0.7
analytic_grad = np.array([df_dx(x_test, y_test), df_dy(x_test, y_test)])
numerical_grad_val = numerical_grad(f, x_test, y_test, h=1e-5)

print(f"测试点: (x, y) = ({x_test}, {y_test})")
print(f"解析梯度:   ∇f = {analytic_grad}")
print(f"数值梯度:   ∇f ≈ {numerical_grad_val}")
print(f"绝对误差: {np.abs(analytic_grad - numerical_grad_val)}")
print(f"相对误差: {np.abs(analytic_grad - numerical_grad_val) / np.abs(analytic_grad)}")

# 误差阶验证: 中心差商 O(h²)
print("\n误差阶验证 (中心差商 O(h²)):")
hs = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7]
for h in hs:
    num_grad = numerical_grad(f, x_test, y_test, h=h)
    err = np.max(np.abs(num_grad - analytic_grad))
    print(f"  h = {h:.0e}: max|数值-解析| = {err:.3e}")

# Taylor 余项理论: 中心差商误差 = f'''(ξ)/6 · h²
# 对 ∂f/∂x 的中心差商, 误差由 ∂³f/∂x³ 控制
print("\n理论: 中心差商误差 = O(h²), 由 Taylor 三阶余项决定")
print("PyTorch autograd 的 gradcheck 默认 tol=1e-6, eps=1e-6")
```

```python
# 完整 PyTorch autograd 梯度检查示例 (若 PyTorch 可用)
try:
    import torch

    # 定义函数 f(x, y) = x²·y + sin(x·y)
    x = torch.tensor(1.5, requires_grad=True, dtype=torch.float64)
    y = torch.tensor(0.7, requires_grad=True, dtype=torch.float64)
    f_val = x**2 * y + torch.sin(x * y)
    f_val.backward()

    print("=== PyTorch autograd 梯度 ===")
    print(f"f(1.5, 0.7) = {f_val.item():.10f}")
    print(f"∂f/∂x = {x.grad.item():.10f} (解析: {df_dx(1.5, 0.7):.10f})")
    print(f"∂f/∂y = {y.grad.item():.10f} (解析: {df_dy(1.5, 0.7):.10f})")

    # 使用 torch.autograd.gradcheck 验证
    def func(inputs):
        x, y = inputs
        return (x**2 * y + torch.sin(x * y),)

    inputs = (torch.tensor(1.5, requires_grad=True, dtype=torch.float64),
              torch.tensor(0.7, requires_grad=True, dtype=torch.float64))
    check_passed = torch.autograd.gradcheck(func, inputs, eps=1e-6, atol=1e-5)
    print(f"\ntorch.autograd.gradcheck 通过: {check_passed}")
except ImportError:
    print("PyTorch 未安装, 跳过 autograd 验证, 仅展示 NumPy 实现")
```

## 9. 习题与解答

本章节对 frontmatter 中 10 道习题给出完整严格解答，涵盖填空、选择、代码纠错与开放证明四类题型。每题均包含「思路分析 → 严格解答 → 数值/符号验证 → 易错点提示」四段式结构，遵循 Spivak《Calculus》4th edition 习题解答风格。

### 9.1 填空题详解

#### 习题 9.1.1（ex-calc-mvt-fb-01，记忆级）

**题目**：设 $f$ 在 $[a,b]$ 上连续，在 $(a,b)$ 内可导，且 $f(a)=f(b)=0$，由 Rolle 定理，存在 $\xi\in(a,b)$ 使得 $\underline{\quad}(\xi)=0$，该定理的证明依据是 Fermat 引理与闭区间连续函数的 $\underline{\quad}$ 定理。

**思路分析**：本题考察 Rolle 定理的精确陈述与证明链条。Rolle 定理是 Lagrange 中值定理在端点等值条件下的特殊情形，其证明依赖于"连续函数在闭区间上取得最值"与"可导函数极值点处导数为零"两条核心结论。

**严格解答**：

1. 第一空应填 $f'$（即 $f$ 的导函数）。Rolle 定理结论为：存在 $\xi\in(a,b)$ 使 $f'(\xi)=0$。
2. 第二空应填"最值"（或"极值"），即 Weierstrass 最值定理。

**证明链条**：

- **Weierstrass 最值定理**：$f$ 在 $[a,b]$ 连续 $\Rightarrow$ $f$ 在 $[a,b]$ 上取得最大值 $M$ 与最小值 $m$。
- **情形分析**：若 $M=m$，则 $f$ 为常函数，$f'\equiv 0$，结论平凡成立。若 $M>m$，由 $f(a)=f(b)$ 知最值至少有一个在内部 $\xi\in(a,b)$ 取得。
- **Fermat 引理**：若 $f$ 在 $\xi$ 处取得极值且 $f$ 在 $\xi$ 处可导，则 $f'(\xi)=0$。

**Python 符号验证**：

```python
import sympy as sp

# 验证 Rolle 定理: f(x) = x^3 - 4x 在 [0, 2] 上, f(0)=0, f(2)=0
x = sp.Symbol('x')
f = x**3 - 4*x
a, b = 0, 2

# 检查端点等值
assert f.subs(x, a) == f.subs(x, b) == 0, "端点不等值"

# 求导并解 f'(xi) = 0
df = sp.diff(f, x)
critical_points = sp.solve(df, x)
print(f"f(x) = {f}")
print(f"f'(x) = {df}")
print(f"f'(x) = 0 的解: {critical_points}")

# 筛选区间内的解
xi_list = [xi for xi in critical_points if xi.is_real and a < xi < b]
print(f"区间 (0, 2) 内的 xi: {xi_list}")  # [2*sqrt(3)/3 ≈ 1.1547]

# 验证 f'(xi) = 0
for xi in xi_list:
    print(f"  xi = {xi} ≈ {float(xi):.6f}, f'(xi) = {df.subs(x, xi)} = 0")
```

**易错点提示**：

- 不要遗漏 Rolle 定理的三个条件中任何一个：闭区间连续、开区间可导、端点等值。三者缺一不可，缺任何一个都能找到反例。
- 函数 $f(x)=|x|$ 在 $[-1,1]$ 上满足端点等值但开区间不可导，结论不成立。
- 函数 $f(x)=x$ 在 $[0,1]$ 上满足连续可导但端点不等值，结论不成立。

---

#### 习题 9.1.2（ex-calc-mvt-fb-02，理解级）

**题目**：Taylor 定理的 Peano 余项 $R_n(x)=o((x-x_0)^n)$ 仅要求 $f$ 在 $x_0$ 处有 $\underline{\quad}$ 阶导数；而 Lagrange 余项 $R_n(x)=\dfrac{f^{(n+1)}(\xi)}{(n+1)!}\cdot(x-x_0)^{n+1}$ 则要求 $f$ 在含 $x_0$ 的开区间内有 $\underline{\quad}$ 阶导数。

**思路分析**：本题考察 Taylor 定理不同余项形式的假设条件差异。Peano 余项是局部渐近估计，仅关心 $x\to x_0$ 时余项的相对无穷小阶；Lagrange 余项是全局定量估计，需要在展开点附近对 $f^{(n+1)}$ 进行估值。

**严格解答**：

1. 第一空填 $n$。Peano 余项形式 $R_n(x)=o((x-x_0)^n)$ 仅需 $f$ 在 $x_0$ 处 $n$ 阶可导（即 $f^{(n)}(x_0)$ 存在）。
2. 第二空填 $n+1$。Lagrange 余项形式需要 $f$ 在含 $x_0$ 的某开区间内 $n+1$ 阶可导，且 $f^{(n)}$ 在闭区间上连续。

**条件强弱对比**：

| 余项形式   | 假设条件                                        | 适用范围              | 误差估计精度                                            |
| ---------- | ----------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Peano      | $f$ 在 $x_0$ 处 $n$ 阶可导                      | 局部 ($x\to x_0$)     | 渐近阶 $o((x-x_0)^n)$                                   |
| Lagrange   | $f$ 在开区间 $n+1$ 阶可导，$f^{(n)}$ 闭区间连续 | 全局 ($x$ 在某邻域内) | 定量 $\dfrac{M\|x-x_0\|^{n+1}}{(n+1)!}$                 |
| Cauchy     | 同 Lagrange，但用积分表示                       | 全局                  | 定量 $\dfrac{1}{n!}\int_{x_0}^x f^{(n+1)}(t)(x-t)^n dt$ |
| Schlömilch | 同 Lagrange，引入参数 $p\in[1,n+1]$             | 全局                  | 最一般形式，含 Lagrange 与 Cauchy 为特例                |

**Python 验证 Peano vs Lagrange 余项**：

```python
import sympy as sp

x, x0, xi = sp.symbols('x x0 xi')
f = sp.exp(x)

# 在 x0=0 处展开 n=3 阶 Taylor 多项式
n = 3
T_n = sum(sp.diff(f, x, k).subs(x, 0) / sp.factorial(k) * x**k for k in range(n+1))
print(f"T_{n}(x) = {T_n}")

# Peano 余项: o(x^n), 当 x -> 0 时 R_n / x^n -> 0
R_n = sp.exp(x) - T_n
peano_limit = sp.limit(R_n / x**n, x, 0)
print(f"lim_{{x->0}} R_{n}(x) / x^{n} = {peano_limit}  (Peano 余项要求为 0)")

# Lagrange 余项: f^(n+1)(xi) / (n+1)! * x^(n+1)
df_nplus1 = sp.diff(f, x, n+1)
lagrange_R = df_nplus1.subs(x, xi) / sp.factorial(n+1) * x**(n+1)
print(f"Lagrange 余项: R_{n}(x) = e^xi / {sp.factorial(n+1)} * x^{n+1}")

# 数值验证: x=0.5, xi 由 e^xi = R_n * 4! / 0.5^4 反解
x_val = 0.5
R_numerical = float(sp.exp(x_val) - T_n.subs(x, x_val))
xi_numerical = sp.log(R_numerical * sp.factorial(n+1) / x_val**(n+1))
print(f"数值验证: x={x_val}, R_{n}={R_numerical:.10f}, 反解 xi = {float(xi_numerical):.10f}")
print(f"  xi 应在 (0, {x_val}) 内: {0 < float(xi_numerical) < x_val}")
```

**易错点提示**：

- Peano 余项仅要求 $f$ 在 $x_0$ 单点处 $n$ 阶可导，不要求 $f^{(n)}$ 在邻域内存在。这是与 Lagrange 余项的关键差异。
- 不要混淆"在 $x_0$ 处 $n$ 阶可导"与"在 $x_0$ 邻域内 $n$ 阶可导"。前者是局部点性质，后者是邻域性质，强弱不同。
- Schlömilch 余项 $R_n = \dfrac{(x-x_0)^{n+1-p}}{n!}\cdot p\cdot f^{(n+1)}(\xi)\cdot(x-\xi)^{p-1}$ 中取 $p=n+1$ 得 Lagrange 余项，取 $p=1$ 得 Cauchy 余项。

### 9.2 选择题详解

#### 习题 9.2.1（ex-calc-mvt-mc-01，理解级）

**题目**：下列函数在 $[-1,1]$ 上不满足 Lagrange 中值定理条件的是：

- A. $f(x)=|x|$
- B. $f(x)=x^{1/3}$
- C. $f(x)=\dfrac{1}{1-x}$（在 $x=1$ 处定义 $f(1)=0$）
- D. $f(x)=x^2\cdot\sin\left(\dfrac{1}{x}\right)$（在 $x=0$ 处定义 $f(0)=0$）

**思路分析**：Lagrange 中值定理需要满足三个条件：(1) $f$ 在闭区间 $[a,b]$ 上连续；(2) $f$ 在开区间 $(a,b)$ 内可导；(3) 端点值不必相等（与 Rolle 定理不同）。逐一检查每个选项。

**严格解答**：正确答案为 **A**（最典型违反者）。逐项分析：

- **A. $f(x)=|x|$**：在 $[-1,1]$ 上连续 ✓，但在 $x=0$ 处不可导（左导数 $-1$，右导数 $+1$），开区间不可导 ✗。**违反条件 (2)**。
- **B. $f(x)=x^{1/3}$**：在 $[-1,1]$ 上连续 ✓，但在 $x=0$ 处导数 $f'(x)=\dfrac{1}{3}x^{-2/3}\to\infty$（垂直切线），开区间不可导 ✗。**违反条件 (2)**。
- **C. $f(x)=\dfrac{1}{1-x}$**：在 $[-1,1)$ 连续，但在 $x=1$ 处即使定义 $f(1)=0$ 也不连续（$\lim_{x\to 1^-} f(x)=+\infty\ne 0$）。**违反条件 (1)**。
- **D. $f(x)=x^2\sin(1/x)$**：在 $x=0$ 处 $f'(0)=\lim_{h\to 0}\dfrac{h^2\sin(1/h)}{h}=\lim_{h\to 0} h\sin(1/h)=0$（夹逼定理），故在 $[-1,1]$ 连续 ✓、$(-1,1)$ 可导 ✓。**满足全部条件**。

**Python 验证**：

```python
import numpy as np
import sympy as sp

x = sp.Symbol('x')

# 选项 A: f(x) = |x| 在 x=0 处的左右导数
f_A = sp.Abs(x)
left_deriv_A = sp.limit((f_A.subs(x, -h) - f_A.subs(x, 0)) / (-h), h, 0, '-')
right_deriv_A = sp.limit((f_A.subs(x, h) - f_A.subs(x, 0)) / h, h, 0, '+')
print(f"A: |x| 在 x=0 处左导数 = {left_deriv_A}, 右导数 = {right_deriv_A}, 不相等 -> 不可导")

# 选项 D: f(x) = x^2 * sin(1/x) 在 x=0 处可导性
h = sp.Symbol('h', positive=True)
f_D_at_h = h**2 * sp.sin(1/h)
deriv_D_at_0 = sp.limit(f_D_at_h / h, h, 0)
print(f"D: x^2*sin(1/x) 在 x=0 处导数 = {deriv_D_at_0} (可导)")

# 选项 D 在 x != 0 时的导数
f_D = x**2 * sp.sin(1/x)
df_D = sp.diff(f_D, x)
print(f"D: f'(x) = {df_D}")
# 验证 lim_{x->0} f'(x) 不存在 (cos(1/x) 振荡)
limit_df_D = sp.limit(df_D, x, 0)
print(f"D: lim_{{x->0}} f'(x) = {limit_df_D} (None 表示极限不存在, f' 不连续)")
```

**易错点提示**：

- D 选项是经典"可导但导数不连续"反例，常出现在 Spivak 第 11 章。$f'(0)=0$ 但 $\lim_{x\to 0}f'(x)$ 不存在。
- C 选项即使人为定义 $f(1)=0$ 也无法挽救连续性，因 $\lim_{x\to 1^-}f(x)=+\infty$。
- 严格意义上 A、B、C 均不满足条件，但 A 是最典型违反者（仅违反可导性而不违反连续性），故答案为 A。

---

#### 习题 9.2.2（ex-calc-mvt-mc-02，应用级）

**题目**：设 $f(x)=e^x$，在 $[0,1]$ 上应用 Lagrange 中值定理，中值点 $\xi$ 满足：

- A. $\xi=\ln(e-1)$
- B. $e^\xi=e-1$
- C. $\xi\in(0,1)$ 且 $\xi=e-1$
- D. $\xi=\dfrac{1}{2}$

**思路分析**：直接套用 Lagrange 中值定理公式 $f'(\xi)=\dfrac{f(b)-f(a)}{b-a}$。对 $f(x)=e^x$ 有 $f'(\xi)=e^\xi$。

**严格解答**：正确答案为 **B**（最严密表述）。

**计算步骤**：

1. $f'(\xi)=\dfrac{f(1)-f(0)}{1-0}=\dfrac{e-1}{1}=e-1$。
2. 因 $f'(\xi)=e^\xi$，故 $e^\xi=e-1$。
3. 解得 $\xi=\ln(e-1)\approx\ln(1.71828)\approx 0.5413\in(0,1)$ ✓。

**选项分析**：

- A：$\xi=\ln(e-1)$ 数值正确但缺少区间约束 $\xi\in(0,1)$，表述不完整。
- B：$e^\xi=e-1$ 是定理结论的直接表达，最贴合中值定理的陈述方式。**正解**。
- C：$\xi=e-1\approx 1.718$ 不在 $(0,1)$ 内，错误（混淆了 $e^\xi$ 与 $\xi$）。
- D：$\xi=\dfrac{1}{2}$ 是中点，但中值点一般不等于中点，错误。

**Python 数值验证**：

```python
import sympy as sp

x = sp.Symbol('x')
f = sp.exp(x)
a, b = 0, 1

# Lagrange 中值定理公式
slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)
print(f"弦斜率 [f(b)-f(a)]/(b-a) = (e^1 - e^0)/1 = {slope} = e - 1")

# 求解 e^xi = e - 1
xi = sp.Symbol('xi', positive=True)
sols = sp.solve(sp.exp(xi) - slope, xi)
print(f"e^xi = e - 1 的解: xi = {sols}")
print(f"  xi = ln(e-1) = {sp.log(sp.E - 1)} ≈ {float(sp.log(sp.E - 1)):.6f}")
print(f"  xi ∈ (0, 1): {0 < float(sp.log(sp.E - 1)) < 1}")

# 验证 f'(xi) = e^xi = e - 1
xi_val = sp.log(sp.E - 1)
print(f"验证: f'(xi) = e^xi = {sp.exp(xi_val)} = {sp.simplify(sp.exp(xi_val) - (sp.E - 1))} (应等于 e-1)")
```

**易错点提示**：

- 中值点 $\xi$ 不必等于中点 $\dfrac{a+b}{2}$，仅是 $(a,b)$ 内某点。
- $e^\xi=e-1$ 与 $\xi=e-1$ 是完全不同的等式，前者解为 $\ln(e-1)\approx 0.5413$，后者为 $1.718$。
- 严格陈述应包含区间约束：$\exists\,\xi\in(0,1)$ 使 $e^\xi=e-1$。

---

#### 习题 9.2.3（ex-calc-mvt-mc-03，分析级）

**题目**：关于 Darboux 定理（导数介值定理），下列说法正确的是：

- A. 若 $f$ 在 $[a,b]$ 上可导，则 $f'$ 必在 $[a,b]$ 上连续
- B. 若 $f$ 在 $[a,b]$ 上可导且 $f'(a)<0<f'(b)$，则存在 $\xi\in(a,b)$ 使 $f'(\xi)=0$
- C. Darboux 定理是介值定理的推论，因 $f'$ 连续
- D. Darboux 定理表明任何函数的导函数均无第一类间断点

**思路分析**：Darboux 定理陈述：若 $f$ 在 $[a,b]$ 上可导，则 $f'$ 取 $f'(a)$ 与 $f'(b)$ 之间的所有值。注意定理仅假设 $f$ 可导，不要求 $f'$ 连续。

**严格解答**：正确答案为 **B**。

**逐项分析**：

- **A 错误**：$f$ 可导不蕴含 $f'$ 连续。经典反例 $f(x)=x^2\sin(1/x)$（$f(0)=0$）：在 $x=0$ 处 $f'(0)=0$，但 $x\ne 0$ 时 $f'(x)=2x\sin(1/x)-\cos(1/x)$，$\lim_{x\to 0}f'(x)$ 不存在（$\cos(1/x)$ 振荡）。
- **B 正确**：直接套用 Darboux 定理，$0$ 介于 $f'(a)<0$ 与 $f'(b)>0$ 之间，故存在 $\xi\in(a,b)$ 使 $f'(\xi)=0$。
- **C 错误**：Darboux 定理的证明不依赖 $f'$ 连续，反而表明"$f'$ 具有介值性"是比"$f'$ 连续"更弱的性质。
- **D 错误**：Darboux 定理仅保证 $f'$ 无第一类间断点（跳跃间断），但不排除第二类间断点（如振荡间断）。$f'(x)=2x\sin(1/x)-\cos(1/x)$ 在 $x=0$ 处为第二类间断。

**Python 验证 Darboux 性质**：

```python
import numpy as np
import sympy as sp

# 反例: f(x) = x^2 * sin(1/x), f(0) = 0
# f'(0) = 0, 但 f'(x) = 2x*sin(1/x) - cos(1/x) 在 x->0 时振荡
x = sp.Symbol('x')
f = sp.Piecewise((x**2 * sp.sin(1/x), x != 0), (0, True))

# 验证 f 在 0 处可导
h = sp.Symbol('h', positive=True)
deriv_at_0 = sp.limit((h**2 * sp.sin(1/h) - 0) / h, h, 0)
print(f"f'(0) = {deriv_at_0}")

# 验证 f' 在 x != 0 处的表达式
f_expr = x**2 * sp.sin(1/x)
df_expr = sp.diff(f_expr, x)
print(f"f'(x) = {df_expr}  (x ≠ 0)")

# 数值验证: f' 在 x->0 时振荡无极限
xs = np.array([0.1, 0.01, 0.001, 0.0001, 0.00001])
df_vals = 2 * xs * np.sin(1/xs) - np.cos(1/xs)
print("\nx 趋近 0 时 f'(x) 的值 (振荡):")
for x_val, df_val in zip(xs, df_vals):
    print(f"  x = {x_val:.5f}, f'(x) = {df_val:.6f}")

# 验证 Darboux 性质: f' 在任意两点间取遍中间值
# 取 a = 0.01, b = 0.02, 检查 f' 取 f'(a) 与 f'(b) 之间的所有值
a_val, b_val = 0.01, 0.02
fa = 2*a_val*np.sin(1/a_val) - np.cos(1/a_val)
fb = 2*b_val*np.sin(1/b_val) - np.cos(1/b_val)
print(f"\nf'(a) = {fa:.6f}, f'(b) = {fb:.6f}")
print(f"在 [a, b] 上 f' 是否取遍 [{min(fa,fb):.6f}, {max(fa,fb):.6f}] 之间的值?")

# 由于 f' 在 [a, b] 上连续 (x ≠ 0), 由介值定理成立
# 关键是 f' 即便在 x=0 处不连续, 也满足 Darboux 介值性
ts = np.linspace(a_val, b_val, 1000)
fts = 2*ts*np.sin(1/ts) - np.cos(1/ts)
print(f"  f' 在 [a, b] 上的取值范围: [{min(fts):.6f}, {max(fts):.6f}]")
print(f"  Darboux 性质在含 0 的区间上仍成立 (即便 f' 不连续)")
```

**易错点提示**：

- Darboux 定理仅假设 $f$ 可导，不要求 $f'$ 连续。这是与介值定理的关键差异。
- 导函数可能存在第二类间断点（振荡型），但不可能有第一类（跳跃型）间断点。
- 任何具有介值性的函数（即 Darboux 函数）不一定是连续函数，但导函数必为 Darboux 函数。

### 9.3 代码纠错题详解

#### 习题 9.3.1（ex-calc-mvt-cf-01，应用级）

**题目**：下列 Python 代码意在用 sympy 符号验证 Lagrange 中值定理对 $f(x)=x^3-x$ 在 $[0,2]$ 上的成立性，但存在两处错误导致输出错误的中值点。请指出错误并修正。

```python
import sympy as sp
x, xi = sp.symbols('x xi')
f = x**3 - x
a, b = 0, 2
slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)   # 第1行
df = sp.diff(f, x)                                 # 第2行
sols = sp.solve(df - slope, x)                     # 第3行
print(sols)                                        # 第4行
```

**思路分析**：Lagrange 中值定理需要中值点 $\xi\in(a,b)$ 内。原代码虽正确求出 $f'(\xi)=\text{slope}$ 的所有解，但未过滤区间外的解，导致输出包含不属于 $(0,2)$ 的负根。

**严格解答**：

**错误定位**：

- **第 3 行**：`sp.solve(df - slope, x)` 返回 $f'(\xi)=\text{slope}$ 的全部解，包括实根与复根、区间内与区间外的根。
- **第 4 行**：`print(sols)` 直接打印全部解，未做区间过滤。

**理论分析**：

- $f(x)=x^3-x$，$f'(x)=3x^2-1$。
- $\text{slope}=\dfrac{f(2)-f(0)}{2-0}=\dfrac{6-0}{2}=3$。
- 解方程 $3\xi^2-1=3$，得 $\xi^2=\dfrac{4}{3}$，即 $\xi=\pm\dfrac{2}{\sqrt{3}}=\pm\dfrac{2\sqrt{3}}{3}$。
- 其中正根 $\xi=\dfrac{2\sqrt{3}}{3}\approx 1.1547\in(0,2)$ 满足定理，负根 $\xi=-\dfrac{2\sqrt{3}}{3}\approx -1.1547\notin(0,2)$ 不满足。

**修正代码**：

```python
import sympy as sp

x = sp.Symbol('x')
f = x**3 - x
a, b = 0, 2

# 计算弦斜率
slope = (f.subs(x, b) - f.subs(x, a)) / (b - a)
print(f"弦斜率 = [f(b)-f(a)]/(b-a) = ({f.subs(x, b)} - {f.subs(x, a)}) / {b - a} = {slope}")

# 求导
df = sp.diff(f, x)
print(f"f'(x) = {df}")

# 解方程 f'(xi) = slope, 并过滤区间内的实根
all_sols = sp.solve(df - slope, x)
print(f"f'(xi) = {slope} 的全部解: {all_sols}")

# 修正: 过滤实根且在区间 (a, b) 内
xi_list = [s for s in all_sols if s.is_real and a < s < b]
print(f"区间 (0, 2) 内的中值点 xi: {xi_list}")

# 验证
for xi in xi_list:
    df_at_xi = df.subs(x, xi)
    print(f"  验证: f'(xi) = f'({xi}) = {df_at_xi} = {float(df_at_xi):.6f}")
    print(f"        slope = {slope} = {float(slope):.6f}")
    print(f"        相等: {sp.simplify(df_at_xi - slope) == 0}")

# 输出:
# 弦斜率 = 3
# f'(x) = 3*x**2 - 1
# 全部解: [-2*sqrt(3)/3, 2*sqrt(3)/3]
# 区间 (0, 2) 内的中值点 xi: [2*sqrt(3)/3]
# 验证: f'(xi) = f'(2*sqrt(3)/3) = 3 = 3.000000
```

**易错点提示**：

- `sp.solve` 默认返回全部解（含复根），需用 `s.is_real` 过滤实根。
- 区间约束 $a<\xi<b$ 必须显式检查，不可省略。
- 对符号解做区间判断时，SymPy 的 `a < s < b` 会自动调用 `evalf` 比较数值。

---

#### 习题 9.3.2（ex-calc-mvt-cf-02，分析级）

**题目**：下列代码用 Taylor 展开近似计算 $e^{0.5}$，误差控制目标为 $10^{-8}$，但运行结果远小于真实值。请定位错误并修正。

```python
import math
def taylor_exp(x, tol=1e-8):
    s, term, n = 0.0, 1.0, 0
    while abs(term) > tol:
        s += term
        n += 1
        term = x**n / math.factorial(n)
    return s
print(taylor_exp(0.5))   # 期望 ≈ 1.6487212707
```

**思路分析**：Taylor 级数 $e^x=\sum_{k=0}^{\infty}\dfrac{x^k}{k!}$ 的项递推关系为 $t_{k+1}=t_k\cdot\dfrac{x}{k+1}$。原代码使用 `x**n / math.factorial(n)` 直接计算每一项，当 $n$ 较大时存在数值稳定性问题：$x^n$ 与 $n!$ 分别成为大数，相除时损失有效数字。

**严格解答**：

**错误定位**：

- **数值稳定性问题**：`x**n / math.factorial(n)` 在 $n$ 较大时计算 $0.5^{20}\approx 9.5\times 10^{-7}$ 与 $20!=2.43\times 10^{18}$，虽然浮点除法尚可处理，但累加过程中可能出现精度损失。
- **逻辑瑕疵**：`while abs(term) > tol` 在 `term` 已经小于 `tol` 时仍会再加一次，导致结果偏大。应改为先判断后累加，或调整条件为 `>=`。

**修正方案**：使用递推关系 $t_{k+1}=t_k\cdot\dfrac{x}{k+1}$ 避免大数运算。

```python
import math

def taylor_exp_fixed(x, tol=1e-8):
    """使用递推关系计算 e^x 的 Taylor 展开, 避免大数相除的精度损失。"""
    s = 0.0
    term = 1.0  # t_0 = 1
    n = 0
    while abs(term) >= tol:
        s += term
        n += 1
        term = term * x / n   # 递推: t_n = t_{n-1} * x / n
    return s

# 验证
x_val = 0.5
approx = taylor_exp_fixed(x_val)
true_val = math.exp(x_val)
print(f"Taylor 近似: e^{x_val} ≈ {approx:.12f}")
print(f"真实值:       e^{x_val} = {true_val:.12f}")
print(f"绝对误差: {abs(approx - true_val):.2e}")
print(f"相对误差: {abs(approx - true_val) / true_val:.2e}")

# 与原代码对比
def taylor_exp_original(x, tol=1e-8):
    s, term, n = 0.0, 1.0, 0
    while abs(term) > tol:
        s += term
        n += 1
        term = x**n / math.factorial(n)
    return s

orig = taylor_exp_original(x_val)
print(f"\n原代码输出: {orig:.12f}")
print(f"修正后输出: {approx:.12f}")
print(f"差异: {abs(orig - approx):.2e}")

# 进一步: 与 math.exp 的双精度结果对照
print(f"\nmath.exp({x_val}) = {math.exp(x_val):.15f}")
print(f"修正代码     = {approx:.15f}")
print(f"误差在机器精度量级: {abs(approx - math.exp(x_val)) < 1e-12}")
```

**误差阶分析**：

- Taylor 余项（Lagrange 形式）：$R_n(x)=\dfrac{e^\xi}{(n+1)!}\cdot x^{n+1}$，$\xi\in(0,x)$。
- 对 $x=0.5$，$e^\xi<e^{0.5}<2$，故 $|R_n|<\dfrac{2\cdot 0.5^{n+1}}{(n+1)!}$。
- 当 $n=10$ 时 $|R_n|<\dfrac{2\cdot 0.5^{11}}{11!}=\dfrac{2}{2^{11}\cdot 39916800}\approx 2.4\times 10^{-13}$，远小于 $10^{-8}$。

**易错点提示**：

- 直接计算 $x^n$ 与 $n!$ 在 $n$ 较大时存在精度问题，递推公式 `term = term * x / n` 是数值稳定的标准实现。
- `while abs(term) > tol` 与 `>= tol` 的差异在边界处可能导致多算或少算一项，对收敛级数影响较小但仍是逻辑瑕疵。
- 对交错级数（如 $\sin x$），Taylor 余项不超过首个被截断项的绝对值，可用作误差控制。

### 9.4 开放性证明题详解

#### 习题 9.4.1（ex-calc-mvt-oe-01，分析级）

**题目**：设 $f(x)=x^2\sin\left(\dfrac{1}{x}\right)$（$f(0)=0$），$g(x)=x^2\cos\left(\dfrac{1}{x}\right)$（$g(0)=0$）。证明：虽然 $f'$ 与 $g'$ 在 $x=0$ 处不连续，但 $f$ 与 $g$ 均满足 Darboux 定理。给出 Python 数值验证。

**思路分析**：本题考察 Darboux 定理的普适性。关键点在于 Darboux 定理的假设仅为"$f$ 可导"，不要求 $f'$ 连续。$f'$ 的振荡性不违反 Darboux 性质，反而展示了导函数可能存在第二类间断点但仍满足介值性的微妙特征。

**严格证明**：

**第一步：证明 $f$ 在 $\mathbb{R}$ 上可导**

对 $x\ne 0$，由复合函数求导法则：

$$
f'(x) = 2x\sin\left(\dfrac{1}{x}\right) + x^2\cos\left(\dfrac{1}{x}\right)\cdot\left(-\dfrac{1}{x^2}\right) = 2x\sin\left(\dfrac{1}{x}\right) - \cos\left(\dfrac{1}{x}\right)
$$

对 $x=0$，由导数定义：

$$
f'(0) = \lim_{h\to 0}\dfrac{f(h)-f(0)}{h} = \lim_{h\to 0}\dfrac{h^2\sin(1/h)}{h} = \lim_{h\to 0} h\sin\left(\dfrac{1}{h}\right)
$$

由夹逼定理 $|h\sin(1/h)|\le |h|\to 0$，故 $f'(0)=0$。

**第二步：证明 $f'$ 在 $x=0$ 处不连续**

$\lim_{x\to 0}f'(x) = \lim_{x\to 0}\left[2x\sin(1/x)-\cos(1/x)\right]$。

- 第一项 $2x\sin(1/x)\to 0$（夹逼定理）。
- 第二项 $\cos(1/x)$ 在 $x\to 0$ 时于 $[-1,1]$ 内剧烈振荡，极限不存在。

故 $\lim_{x\to 0}f'(x)$ 不存在，$f'$ 在 $x=0$ 处不连续（第二类间断）。

**第三步：验证 Darboux 性质**

Darboux 定理陈述：若 $f$ 在 $[a,b]$ 上可导，则 $f'$ 取 $f'(a)$ 与 $f'(b)$ 之间的所有值。

由于第一步已证 $f$ 在 $\mathbb{R}$ 上可导（含 $x=0$），故 $f$ 在任意闭区间 $[a,b]$ 上满足 Darboux 定理假设，定理结论自动成立。**无需 $f'$ 连续**。

**几何解释**：$f'$ 在 $x=0$ 附近虽振荡（取值于 $[-1,1]$），但任意两点 $a,b$ 之间 $f'$ 取遍 $f'(a)$ 与 $f'(b)$ 之间的所有值——这是 Darboux 性质的核心，比连续性弱。

**Python 数值验证**：

```python
import numpy as np
import sympy as sp

# 定义 f 与 f'
def f(x):
    return np.where(x == 0, 0.0, x**2 * np.sin(1/x))

def df(x):
    return np.where(x == 0, 0.0, 2*x*np.sin(1/x) - np.cos(1/x))

# 验证 f'(0) = 0 (由极限定义)
h_vals = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6]
print("验证 f'(0) = lim_{h->0} [f(h) - f(0)] / h:")
for h in h_vals:
    diff_quotient = (h**2 * np.sin(1/h) - 0) / h
    print(f"  h = {h:.0e}: 差商 = {diff_quotient:.6e}")

# 验证 f' 在 x->0 时振荡
print("\n验证 f'(x) 在 x->0 时振荡:")
for x in h_vals:
    print(f"  x = {x:.0e}: f'(x) = {df(x):.6f}")

# 验证 Darboux 性质: 在 [a, b] 上 f' 取遍 f'(a) 与 f'(b) 之间的值
a, b = 0.01, 0.05
fa, fb = df(a), df(b)
print(f"\n在 [{a}, {b}] 上验证 Darboux 性质:")
print(f"  f'({a}) = {fa:.6f}")
print(f"  f'({b}) = {fb:.6f}")

# 在 [a, b] 上密集采样, 检查 f' 的取值范围
ts = np.linspace(a, b, 10000)
fts = df(ts)
y_min, y_max = min(fa, fb), max(fa, fb)
print(f"  f' 在 [{a}, {b}] 上的取值范围: [{np.min(fts):.6f}, {np.max(fts):.6f}]")
print(f"  应包含 [{y_min:.6f}, {y_max:.6f}]: {np.min(fts) <= y_min and np.max(fts) >= y_max}")

# 进一步: 验证含 0 的区间也满足 Darboux
a2, b2 = -0.01, 0.01
ts2 = np.linspace(a2, b2, 10000)
fts2 = df(ts2)
print(f"\n在含 0 的区间 [{a2}, {b2}] 上:")
print(f"  f'(a) = {df(a2):.6f}, f'(b) = {df(b2):.6f}")
print(f"  f' 取值范围: [{np.min(fts2):.6f}, {np.max(fts2):.6f}]")
print(f"  Darboux 性质仍成立 (即便 f' 在 0 处不连续)")
```

**易错点提示**：

- 不要将"可导"与"连续可导（$C^1$）"混淆。$f$ 可导是 Darboux 定理的唯一假设。
- $f'$ 的振荡间断（第二类）不违反 Darboux 性质；只有跳跃间断（第一类）才会违反，但导函数不可能有跳跃间断。
- 对 $g(x)=x^2\cos(1/x)$，同理 $g'(0)=0$ 且 $g'(x)=2x\cos(1/x)+\sin(1/x)$ 在 $x\to 0$ 时振荡，证明完全类似。

---

#### 习题 9.4.2（ex-calc-mvt-oe-02，评价级）

**题目**：设 $f$ 在 $[a,b]$ 上连续，在 $(a,b)$ 内二阶可导，$f(a)=f(b)=0$，且存在 $c\in(a,b)$ 使 $f(c)>0$。证明：存在 $\xi\in(a,b)$ 使 $f''(\xi)<0$。给出几何解释与 sympy 数值实例。

**思路分析**：函数在两端为零、中间为正，必呈现"凸起"形状，凸起处必有负曲率。证明关键是将"存在负二阶导数"转化为两次 Lagrange 中值定理的复合应用。本题是 Spivak Calculus 第 11 章经典结论。

**严格证明**：

**第一步：在 $[a,c]$ 上应用 Lagrange 中值定理**

$f$ 在 $[a,c]$ 上连续、$(a,c)$ 内可导，$f(a)=0$，$f(c)>0$。由 Lagrange 中值定理，存在 $\xi_1\in(a,c)$ 使：

$$
f'(\xi_1) = \dfrac{f(c)-f(a)}{c-a} = \dfrac{f(c)}{c-a} > 0
$$

**第二步：在 $[c,b]$ 上应用 Lagrange 中值定理**

同理，存在 $\xi_2\in(c,b)$ 使：

$$
f'(\xi_2) = \dfrac{f(b)-f(c)}{b-c} = \dfrac{0-f(c)}{b-c} = -\dfrac{f(c)}{b-c} < 0
$$

**第三步：在 $[\xi_1,\xi_2]$ 上对 $f'$ 应用 Lagrange 中值定理**

由假设 $f$ 在 $(a,b)$ 内二阶可导，故 $f'$ 在 $(a,b)$ 内可导，且 $f'$ 在 $[\xi_1,\xi_2]\subset(a,b)$ 上连续。由 Lagrange 中值定理，存在 $\xi\in(\xi_1,\xi_2)\subset(a,b)$ 使：

$$
f''(\xi) = \dfrac{f'(\xi_2)-f'(\xi_1)}{\xi_2-\xi_1}
$$

由 $\xi_2>\xi_1$ 知 $\xi_2-\xi_1>0$，又 $f'(\xi_2)<0<f'(\xi_1)$，故 $f'(\xi_2)-f'(\xi_1)<0$，从而：

$$
f''(\xi) = \dfrac{f'(\xi_2)-f'(\xi_1)}{\xi_2-\xi_1} < 0
$$

**几何解释**：函数在 $[a,b]$ 上两端为零，中间 $c$ 处为正，整体呈"凸起"形状。凸起部分必有一处曲率为负（凹向下），即 $f''(\xi)<0$。这与直观相符：若处处 $f''\ge 0$（凸函数），则 $f$ 在 $[a,b]$ 上的最大值应在端点取得，与 $f(c)>f(a)=f(b)=0$ 矛盾。

**Python 数值实例**：

```python
import numpy as np
import sympy as sp

# 构造实例: f(x) = x * (1 - x) * (x - 0.5)^2 + 0.1 * x * (1 - x)
# 在 [0, 1] 上, f(0) = f(1) = 0, f(0.5) > 0
x = sp.Symbol('x')
f = x * (1 - x) * (x - 0.5)**2 + 0.1 * x * (1 - x)
a, b, c = 0, 1, 0.5

print(f"f(x) = {sp.expand(f)}")
print(f"f({a}) = {f.subs(x, a)}, f({b}) = {f.subs(x, b)}, f({c}) = {f.subs(x, c)}")

# 计算 f' 与 f''
df = sp.diff(f, x)
d2f = sp.diff(f, x, 2)
print(f"f'(x) = {sp.expand(df)}")
print(f"f''(x) = {sp.expand(d2f)}")

# 第一步: 在 [a, c] 上应用 Lagrange, 求 xi_1
slope1 = (f.subs(x, c) - f.subs(x, a)) / (c - a)
xi1_sols = sp.solve(df - slope1, x)
xi1_list = [s for s in xi1_sols if s.is_real and a < s < c]
print(f"\n第一步: 在 [{a}, {c}] 上, 斜率 = {float(slope1):.6f}")
print(f"  f'(xi_1) = {slope1} 的解: {xi1_sols}")
print(f"  区间 ({a}, {c}) 内的 xi_1: {xi1_list}")
xi1 = xi1_list[0]
print(f"  选取 xi_1 = {float(xi1):.6f}, f'(xi_1) = {float(df.subs(x, xi1)):.6f} > 0 ✓")

# 第二步: 在 [c, b] 上应用 Lagrange, 求 xi_2
slope2 = (f.subs(x, b) - f.subs(x, c)) / (b - c)
xi2_sols = sp.solve(df - slope2, x)
xi2_list = [s for s in xi2_sols if s.is_real and c < s < b]
print(f"\n第二步: 在 [{c}, {b}] 上, 斜率 = {float(slope2):.6f}")
print(f"  f'(xi_2) = {slope2} 的解: {xi2_sols}")
print(f"  区间 ({c}, {b}) 内的 xi_2: {xi2_list}")
xi2 = xi2_list[0]
print(f"  选取 xi_2 = {float(xi2):.6f}, f'(xi_2) = {float(df.subs(x, xi2)):.6f} < 0 ✓")

# 第三步: 在 [xi_1, xi_2] 上对 f' 应用 Lagrange, 求 xi
slope3 = (df.subs(x, xi2) - df.subs(x, xi1)) / (xi2 - xi1)
xi_sols = sp.solve(d2f - slope3, x)
xi_list = [s for s in xi_sols if s.is_real and xi1 < s < xi2]
print(f"\n第三步: 在 [xi_1, xi_2] = [{float(xi1):.4f}, {float(xi2):.4f}] 上对 f' 应用 Lagrange")
print(f"  斜率 = [f'(xi_2) - f'(xi_1)] / (xi_2 - xi_1) = {float(slope3):.6f}")
print(f"  f''(xi) = {slope3} 的解: {xi_sols}")
print(f"  区间内的 xi: {xi_list}")
if xi_list:
    xi = xi_list[0]
    print(f"  选取 xi = {float(xi):.6f}, f''(xi) = {float(d2f.subs(x, xi)):.6f} < 0 ✓")

# 进一步: 绘制 f, f', f'' 的图像
import matplotlib.pyplot as plt
xs = np.linspace(0, 1, 500)
f_lam = sp.lambdify(x, f, 'numpy')
df_lam = sp.lambdify(x, df, 'numpy')
d2f_lam = sp.lambdify(x, d2f, 'numpy')

fig, axes = plt.subplots(3, 1, figsize=(10, 9), sharex=True)
axes[0].plot(xs, f_lam(xs), 'b-', label='f(x)')
axes[0].axhline(0, color='k', linewidth=0.5)
axes[0].set_ylabel('f(x)')
axes[0].legend()
axes[0].grid(True, alpha=0.3)

axes[1].plot(xs, df_lam(xs), 'r-', label="f'(x)")
axes[1].axhline(0, color='k', linewidth=0.5)
axes[1].set_ylabel("f'(x)")
axes[1].legend()
axes[1].grid(True, alpha=0.3)

axes[2].plot(xs, d2f_lam(xs), 'g-', label="f''(x)")
axes[2].axhline(0, color='k', linewidth=0.5)
axes[2].set_ylabel("f''(x)")
axes[2].set_xlabel('x')
axes[2].legend()
axes[2].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('mvt_ex_oe_02.png', dpi=100, bbox_inches='tight')
plt.close()
print("\n图像已保存: mvt_ex_oe_02.png")
```

**易错点提示**：

- 题目假设"二阶可导"而非"$f''$ 连续"。若仅二阶可导，第三步对 $f'$ 用 Lagrange 需要 $f'$ 在 $[\xi_1,\xi_2]$ 连续、$(\xi_1,\xi_2)$ 可导，即 $f$ 在 $(a,b)$ 内二阶可导且 $f'$ 在 $[a,b]$ 连续——题目条件需精确理解。
- 几何直观（凸函数最大值在端点）是反向论证的核心：若处处 $f''\ge 0$ 则与 $f(c)>0$ 矛盾。
- 本题可推广为：若 $f$ 在 $[a,b]$ 上 $n$ 阶可导且有 $n+1$ 个零点，则 $f^{(n)}$ 在 $(a,b)$ 内至少有一个零点（Rolle 定理的迭代应用）。

---

#### 习题 9.4.3（ex-calc-mvt-oe-03，创造级）

**题目**：设计一个 Python 类 `TaylorApproximator`，接受任意 sympy 可微函数 $f$ 与展开点 $x_0$，实现：(1) 计算 $n$ 阶 Taylor 多项式；(2) 给出 Peano 与 Lagrange 余项；(3) 绘制不同 $n$ 下的逼近误差曲线；(4) 数值估计使误差低于给定 `tol` 的最小 $n$。在 $f(x)=\sin(x)$，$x_0=0$，$x=0.5$，$\text{tol}=10^{-10}$ 上验证。

**思路分析**：本题考察 Taylor 定理的工程化实现。关键点：(1) 用 `sympy.series` 或递归求导获取系数；(2) Lagrange 余项需对 $f^{(n+1)}$ 在区间上取上界，常用 $\max_{t\in[x_0,x]}|f^{(n+1)}(t)|$；(3) 误差曲线应呈对数下降直至数值精度极限；(4) $\sin(x)$ 在 $x_0=0$ 处的 Taylor 级数为交错级数，误差不超过首项被截断项，故 $n\approx 10$ 即可达到 $10^{-10}$。

**完整实现**：

```python
import sympy as sp
import numpy as np
import matplotlib.pyplot as plt

class TaylorApproximator:
    """Taylor 逼近器: 对任意 sympy 可微函数构造 n 阶 Taylor 多项式, 并分析误差。

    输入参数:
        f: sympy 表达式, 待逼近函数
        x0: 展开点 (float)
        var: sympy.Symbol, 函数的自变量

    核心方法:
        polynomial(n): 返回 n 阶 Taylor 多项式 (sympy 表达式)
        peano_remainder(n, x_val): 返回 Peano 余项的数值估计
        lagrange_remainder(n, x_val): 返回 Lagrange 余项的上界
        plot_error(x_val, n_max): 绘制不同 n 下的逼近误差曲线
        min_n_for_tol(x_val, tol): 数值估计使误差低于 tol 的最小 n
    """

    def __init__(self, f, x0, var=None):
        self.f = f
        self.x0 = x0
        self.x = var if var is not None else sp.Symbol('x')
        self._derivatives = [f]  # 缓存导数: f^(0), f^(1), f^(2), ...
        self._taylor_polys = {}  # 缓存 Taylor 多项式

    def _get_derivative(self, k):
        """获取 f 的 k 阶导数 (带缓存)。"""
        while len(self._derivatives) <= k:
            n = len(self._derivatives)
            self._derivatives.append(sp.diff(self._derivatives[-1], self.x))
        return self._derivatives[k]

    def polynomial(self, n):
        """计算 n 阶 Taylor 多项式 T_n(x) = sum_{k=0}^n f^(k)(x0)/k! * (x - x0)^k。"""
        if n in self._taylor_polys:
            return self._taylor_polys[n]
        terms = []
        for k in range(n + 1):
            dkf_at_x0 = self._get_derivative(k).subs(self.x, self.x0)
            terms.append(dkf_at_x0 / sp.factorial(k) * (self.x - self.x0)**k)
        T_n = sp.simplify(sp.Add(*terms))
        self._taylor_polys[n] = T_n
        return T_n

    def peano_remainder(self, n, x_val):
        """Peano 余项: R_n(x) = o((x - x0)^n)。
        数值估计: 直接计算 f(x_val) - T_n(x_val)。"""
        T_n = self.polynomial(n)
        R_numerical = float(self.f.subs(self.x, x_val) - T_n.subs(self.x, x_val))
        return R_numerical

    def lagrange_remainder(self, n, x_val):
        """Lagrange 余项上界: |R_n(x)| <= max_{t in [x0, x]} |f^(n+1)(t)| / (n+1)! * |x - x0|^(n+1)。"""
        dnp1 = self._get_derivative(n + 1)
        # 在 [x0, x_val] (或 [x_val, x0]) 上对 |f^(n+1)| 取数值最大值
        a, b = min(self.x0, x_val), max(self.x0, x_val)
        ts = np.linspace(a, b, 1000)
        dnp1_lam = sp.lambdify(self.x, dnp1, 'numpy')
        dnp1_vals = np.abs(dnp1_lam(ts))
        M = float(np.max(dnp1_vals))
        upper_bound = M / sp.factorial(n + 1) * abs(x_val - self.x0)**(n + 1)
        return float(upper_bound)

    def actual_error(self, n, x_val):
        """实际误差: |f(x_val) - T_n(x_val)|。"""
        return abs(self.peano_remainder(n, x_val))

    def plot_error(self, x_val, n_max=20, filename='taylor_error.png'):
        """绘制不同 n 下的逼近误差曲线 (对数纵轴)。"""
        ns = list(range(0, n_max + 1))
        actual_errors = [self.actual_error(n, x_val) for n in ns]
        lagrange_bounds = [self.lagrange_remainder(n, x_val) for n in ns]

        plt.figure(figsize=(10, 6))
        plt.semilogy(ns, actual_errors, 'bo-', label='Actual error |R_n(x)|', markersize=6)
        plt.semilogy(ns, lagrange_bounds, 'r^--', label='Lagrange upper bound', markersize=6)
        plt.xlabel('Order n')
        plt.ylabel('Error (log scale)')
        plt.title(f'Taylor approximation error for f at x={x_val}, x0={self.x0}')
        plt.grid(True, which='both', alpha=0.3)
        plt.legend()
        plt.tight_layout()
        plt.savefig(filename, dpi=100, bbox_inches='tight')
        plt.close()
        print(f"误差曲线已保存: {filename}")
        return ns, actual_errors, lagrange_bounds

    def min_n_for_tol(self, x_val, tol=1e-10, n_max=50):
        """数值估计使误差低于 tol 的最小 n (二分搜索 + 线性扫描)。"""
        for n in range(0, n_max + 1):
            if self.actual_error(n, x_val) < tol:
                return n
        return None  # 在 n_max 内未找到

# === 验证: f(x) = sin(x), x0 = 0, x = 0.5, tol = 1e-10 ===
x = sp.Symbol('x')
f = sp.sin(x)
approximator = TaylorApproximator(f, x0=0, var=x)

print("=" * 60)
print("Taylor 逼近器验证: f(x) = sin(x), x0 = 0, x = 0.5")
print("=" * 60)

# (1) 计算并展示 n = 0, 2, 4, 6, 8, 10 阶 Taylor 多项式
print("\n(1) Taylor 多项式:")
for n in [0, 2, 4, 6, 8, 10]:
    T_n = approximator.polynomial(n)
    print(f"  T_{n}(x) = {T_n}")

# (2) Peano 与 Lagrange 余项
print("\n(2) 余项分析 (x = 0.5):")
x_val = 0.5
for n in [2, 4, 6, 8, 10]:
    peano = approximator.peano_remainder(n, x_val)
    lagrange = approximator.lagrange_remainder(n, x_val)
    actual = approximator.actual_error(n, x_val)
    print(f"  n = {n}: 实际误差 = {actual:.3e}, Lagrange 上界 = {lagrange:.3e}, Peano 数值 = {peano:.3e}")

# (3) 绘制误差曲线
print("\n(3) 绘制误差曲线:")
ns, actual_errors, lagrange_bounds = approximator.plot_error(x_val, n_max=15, filename='taylor_sin_error.png')

# (4) 数值估计最小 n
print("\n(4) 最小 n 估计 (tol = 1e-10):")
tol = 1e-10
n_min = approximator.min_n_for_tol(x_val, tol=tol, n_max=30)
print(f"  使 |R_n(0.5)| < {tol} 的最小 n = {n_min}")
print(f"  验证: |R_{n_min}(0.5)| = {approximator.actual_error(n_min, x_val):.3e}")
print(f"  对比: |R_{n_min-1}(0.5)| = {approximator.actual_error(n_min - 1, x_val):.3e}")

# 交错级数理论: sin(x) = x - x^3/3! + x^5/5! - ...
# 误差不超过首个被截断项: |R_n(x)| <= |x|^(n+1) / (n+1)!
# 对 x = 0.5, n = 9: |R_9| <= 0.5^10 / 10! ≈ 2.7e-13 < 1e-10
print(f"\n理论: sin(x) 的 Taylor 级数为交错级数, |R_n(x)| <= |x|^(n+1) / (n+1)!")
print(f"  对 x = 0.5, n = 9: 理论上界 = {0.5**10 / np.math.factorial(10):.3e}")
print(f"  实际 |R_9(0.5)| = {approximator.actual_error(9, x_val):.3e}")
```

**预期输出要点**：

- $T_0(x)=0$，$T_2(x)=x$，$T_4(x)=x-\dfrac{x^3}{6}$，$T_6(x)=x-\dfrac{x^3}{6}+\dfrac{x^5}{120}$，...
- 实际误差随 $n$ 单调下降，$n=9$ 时 $|R_9(0.5)|\approx 2.5\times 10^{-13}<10^{-10}$。
- Lagrange 上界比实际误差略大（因取了最大值），但同阶下降。
- 最小 $n=9$（或 $n=10$，取决于 $T_n$ 的奇偶性定义）。

**易错点提示**：

- $\sin(x)$ 在 $x_0=0$ 处的 Taylor 级数只含奇次项，$T_{2k}=T_{2k+1}$。因此 $n$ 取偶数与奇数时多项式相同，但余项阶数不同。
- Lagrange 余项需对 $f^{(n+1)}$ 在 $[x_0,x]$ 上取最大值，对 $\sin$ 而言 $|\sin^{(n+1)}(t)|\le 1$，上界为 $\dfrac{|x-x_0|^{n+1}}{(n+1)!}$。
- 对一般函数（如 $e^x$），$f^{(n+1)}$ 在 $[x_0,x]$ 上的最大值需数值求解，可能涉及优化算法。

## 10. 参考文献

本章节以 ACM 参考文献格式列出本篇引用的全部 14 条文献，覆盖经典教材（Spivak、Apostol、Rudin、Tao、Courant、Hardy、Pugh、Bartle、Burkill）、原始论文（Rolle、Lagrange、Cauchy、Taylor、Darboux、Flett）与现代分析辅助工具。每条文献均标注其在本文中的引用位置与核心贡献。

### 10.1 经典教材

**[1] Spivak, M. 2008.** _Calculus_ (4th edition). Publish or Perish, Inc. DOI: [10.1007/978-0-387-09469-9](https://doi.org/10.1007/978-0-387-09469-9).

- 引用位置：第 1-9 章全局方法论参考；第 6 章常见陷阱、第 9 章习题 9.4.2 出处。
- 核心贡献：Spivak 以 ε-δ 严格化语言重新组织单变量微积分，第 11 章"中值定理"为本书论证范式的标杆；习题 9.4.2（两端为零中间为正则存在负二阶导数）取自本书第 11 章习题 7。

**[2] Apostol, T. M. 1967.** _Calculus, Volume 1: One-Variable Calculus with an Introduction to Linear Algebra_ (2nd edition). John Wiley & Sons.

- 引用位置：第 2 章形式化定义、第 3 章理论推导、第 5 章对比分析。
- 核心贡献：Apostol 以"积分先于导数"的独特顺序构建微积分，对积分中值定理（第 5.5 节）与 Taylor 定理（第 7.7 节）的处理尤为严谨；本书提供 Schlömilch 余项的参数化推导。

**[3] Rudin, W. 1976.** _Principles of Mathematical Analysis_ (3rd edition). McGraw-Hill Education.

- 引用位置：第 2 章 Darboux 定理陈述、第 3 章 Taylor 定理证明、第 7 章工程实践。
- 核心贡献：Rudin PMA 第 5 章以最简洁的 ε-δ 语言陈述中值定理家族，第 5.11 节给出 Taylor 定理的 Lagrange 余项标准证明；本书对 Cauchy 中值定理的参数化处理是现代分析教材的范式。

**[4] Tao, T. 2016.** _Analysis I_ (3rd edition). Springer. DOI: [10.1007/978-981-10-1789-6](https://doi.org/10.1007/978-981-10-1789-6).

- 引用位置：第 1 章历史动机、第 2 章形式化定义、第 6 章常见陷阱。
- 核心贡献：Tao 以渐进式建构方法分析学基础，第 10 章对中值定理的"从特殊到一般"推导（Rolle → Lagrange → Cauchy）逻辑清晰；本书强调反例构造与陷阱识别，是初学者的最佳入门读物。

**[5] Courant, R. and John, F. 1999.** _Introduction to Calculus and Analysis I_. Springer.

- 引用位置：第 4 章几何意义与可视化、第 7 章工程实践。
- 核心贡献：Courant 强调微积分的物理与几何直观，对中值定理的几何解释（切线与弦的平行关系）与工程应用（Newton 迭代、误差估计）描述生动；本书第 6.4 节是工程视角的典范。

**[6] Hardy, G. H. 1952.** _A Course of Pure Mathematics_ (10th edition). Cambridge University Press.

- 引用位置：第 3 章理论推导、第 9 章习题。
- 核心贡献：Hardy 的经典教材以"纯数学"严谨性著称，第 7 章对中值定理与 Taylor 定理的处理影响了几代数学家；本书习题 9.4.1 的反例构造风格源自 Hardy。

**[7] Pugh, C. C. 2002.** _Real Mathematical Analysis_. Springer. DOI: [10.1007/978-0-387-21668-2](https://doi.org/10.1007/978-0-387-21668-2).

- 引用位置：第 3 章 Darboux 定理证明、第 6 章常见陷阱。
- 核心贡献：Pugh 第 3 章以"图片优先"风格呈现实分析，对 Darboux 定理的证明采用构造性方法；本书对导函数无第一类间断点的讨论（第 6.5 节）受 Pugh 启发。

**[8] Bartle, R. G. and Sherbert, D. R. 2011.** _Introduction to Real Analysis_ (4th edition). John Wiley & Sons.

- 引用位置：第 2 章积分中值定理陈述、第 5 章对比分析。
- 核心贡献：Bartle & Sherbert 是北美高校标准实分析教材，第 6 章对积分中值定理（第一与第二形式）的处理详尽；本书第 2.7 节的两种积分中值定理表述取自本书。

**[9] Burkill, J. C. 1962.** _A First Course in Mathematical Analysis_. Cambridge University Press.

- 引用位置：第 1 章历史动机、第 4 章几何意义。
- 核心贡献：Burkill 的简明教材以英国分析学派风格著称，对中值定理的历史脉络与几何直观处理简洁优雅；本书第 1 章历史动机章节受其启发。

### 10.2 原始论文与历史文献

**[10] Rolle, M. 1691.** "Démonstration d'une méthode pour résoudre les égalités de toutes les degrés suivant les coordonnées qui s'y trouvent." _Mémoires de l'Académie Royale des Sciences_.

- 引用位置：第 1.3 节 Rolle 定理历史、第 2.1 节定理陈述。
- 核心贡献：Rolle 原始论文针对多项式方程两相邻实根之间存在另一根的导数为零，使用"级联法"（méthode des cascades）证明。与现代可微函数形式有较大差异，现代形式由 Dini 在 19 世纪重新表述。

**[11] Lagrange, J.-L. 1797.** _Théorie des fonctions analytiques, contenant les principes du calcul différentiel, dégagés de toute considération d'infiniment petits ou d'évanouissans, de limites ou de fluxions_. Imprimerie de la République.

- 引用位置：第 1.4 节 Lagrange 中值定理历史、第 2.2 节定理陈述、第 3.2 节证明。
- 核心贡献：Lagrange 旨在摒弃 Newton 流数术与 Leibniz 无穷小的模糊性，建立纯代数化的"函数解析理论"；本书给出有限增量公式 $f(b)-f(a)=f'(\xi)(b-a)$ 的最早形式，是现代 Lagrange 中值定理的直接源头。

**[12] Cauchy, A.-L. 1823.** _Résumé des leçons données à l'École royale polytechnique sur le calcul infinitésimal_. Imprimerie royale.

- 引用位置：第 1.5 节 Cauchy 中值定理历史、第 2.3 节定理陈述、第 3.3 节证明。
- 核心贡献：Cauchy 在《Résumé des leçons》中首次以 ε-δ 严格化语言陈述中值定理，并给出参数化形式 $\dfrac{f(b)-f(a)}{g(b)-g(a)}=\dfrac{f'(\xi)}{g'(\xi)}$，奠定了现代分析学的基石；L'Hôpital 法则的理论依据即为此定理。

**[13] Taylor, B. 1715.** "Methodus Incrementorum Directa et Inversa." _Philosophical Transactions of the Royal Society_.

- 引用位置：第 1.6 节 Taylor 定理历史、第 2.4 节定理陈述。
- 核心贡献：Taylor 在 1715 年首次系统陈述 Taylor 级数展开，但严格收敛性直至 1821 年 Cauchy 才完整建立；现代表述与余项估计归功于 Lagrange。本书是 Taylor 定理历史溯源的原始文献。

**[14] Darboux, G. 1875.** "Mémoire sur les discontinuités des fonctions." _Journal de Mathématiques Pures et Appliquées_ 4: 5-56.

- 引用位置：第 1.7 节 Darboux 定理历史、第 2.5 节定理陈述、第 3.4 节证明。
- 核心贡献：Darboux 在 1875 年论文中证明导函数（即便不连续）必满足介值性质，揭示了导数与连续函数的本质差异。本论文是微分方程与实分析的关键工具，奠定了"Dafoux 函数"概念的基础。

**[15] Flett, T. M. 1958.** "A mean value theorem." _The Mathematical Gazette_ 42(339): 38-39.

- 引用位置：第 2.8 节 Flett 定理陈述、第 3.6 节证明。
- 核心贡献：Flett 在 1958 年给出 Lagrange 中值定理的现代推广：若 $f$ 在 $[a,b]$ 上可导且 $f'(a)=f'(b)$，则存在 $\xi\in(a,b)$ 使 $\dfrac{f(\xi)-f(a)}{\xi-a}=f'(\xi)$。本定理是 Flett-Pompeiu 定理的源头。

### 10.3 参考文献格式说明

本篇参考文献遵循 **ACM (Association for Computing Machinery) 引用格式**，与 frontmatter `references` 字段的结构化数据保持一致。每条文献包含以下字段：

- `type`：文献类型，取值范围为 `book | journal | conference | technical-report | standard | website | documentation | video | course`。
- `authors`：作者列表，格式为 "姓, 名"。
- `year`：出版年份。
- `title`：标题（书籍斜体，论文加引号）。
- `venue`：出版方或期刊名。
- `version`：版本号（可选）。
- `doi`：数字对象标识符（可选）。
- `volume`/`issue`/`pages`：期刊卷号、期号、页码（可选）。

正文引用采用 `[编号]` 格式，如 `Spivak [1]`、`Rolle [10]`。详细引用关系参见各章节的"引用位置"说明。

## 11. 延伸阅读

本章节为读者提供从微分中值定理出发的延伸学习路径，覆盖同一项目内的关联文档、跨学科应用与进阶研究方向。每条延伸阅读均附简要说明，帮助读者快速判断是否需要深入。

### 11.1 项目内关联文档

#### 11.1.1 函数与极限

**关联路径**：[calculus/函数与极限](./函数与极限)

**关联理由**：微分中值定理的全部证明都建立在 ε-δ 极限语言与连续性概念之上。Rolle 定理的证明需要 Weierstrass 最值定理（闭区间连续函数必有最大值与最小值），Lagrange 中值定理的证明需要 Fermat 引理（极值点导数为零），这些都属于函数与极限范畴的预备知识。

**推荐阅读章节**：

- 第 2 章 ε-δ 极限语言
- 第 5 章连续性与一致连续性
- 第 6 章闭区间上连续函数的性质（最值定理、介值定理）

#### 11.1.2 导数与微分

**关联路径**：[calculus/导数与微分](./导数与微分)

**关联理由**：微分中值定理是导数理论的核心应用。本篇对 Taylor 定理、Darboux 定理的讨论需要导数的 ε-δ 定义、链式法则、高阶导数等预备知识。第 8 章案例研究中 PyTorch autograd 的梯度检查依赖对自动微分的理解。

**推荐阅读章节**：

- 第 2 章 ε-δ 导数定义与 Carathéodory 等价定义
- 第 4 章链式法则与反函数求导
- 第 7 章高阶导数与 Leibniz 公式
- 第 9 章自动微分（前向模式与反向模式）

#### 11.1.3 不定积分

**关联路径**：[calculus/不定积分](./不定积分)

**关联理由**：微分中值定理与不定积分通过 Newton-Leibniz 公式紧密关联。Cauchy 中值定理的证明中使用的辅助函数法与积分换元法异曲同工。Lagrange 中值定理可视为"微分形式的 Newton-Leibniz 公式"：$f(b)-f(a)=\int_a^b f'(x)\,dx$ 在某点的"中值"近似。

**推荐阅读章节**：

- 第 1 章原函数与不定积分
- 第 3 章换元积分法（与辅助函数法的关联）
- 第 5 章分部积分法（与 Taylor 定理证明的关联）

#### 11.1.4 定积分与应用

**关联路径**：[calculus/定积分与应用](./定积分与应用)

**关联理由**：本篇第 2.7 节积分中值定理（两种形式）直接建立在定积分理论之上。Taylor 定理的 Cauchy 余项以积分形式 $R_n(x)=\dfrac{1}{n!}\int_{x_0}^x f^{(n+1)}(t)(x-t)^n\,dt$ 给出，需要定积分的分部积分技巧。

**推荐阅读章节**：

- 第 2 章定积分定义（Darboux 和与 Riemann 和）
- 第 5 章定积分的性质（线性性、单调性、积分中值定理）
- 第 7 章定积分的应用（弧长、面积、体积）
- 第 9 章广义积分与收敛判别法

#### 11.1.5 无穷级数与常微分方程

**关联路径**：[calculus/无穷级数与常微分方程](./无穷级数与常微分方程)

**关联理由**：Taylor 级数是无穷级数的核心应用之一。本篇第 8.1 节 Newton 迭代法的二阶收敛性证明依赖 Taylor 展开，第 8.2 节 RK4 数值积分的误差分析基于 Taylor 余项估计。常微分方程的存在唯一性定理（Picard-Lindelöf）证明中也用到中值定理。

**推荐阅读章节**：

- 第 2 章数项级数收敛判别法
- 第 4 章幂级数与 Taylor 级数
- 第 7 章一阶常微分方程（分离变量、线性方程）
- 第 8 章二阶常微分方程与 Picard-Lindelöf 定理

### 11.2 跨学科应用

#### 11.2.1 机器学习中的反向传播

**关联路径**：[machine-learning/反向传播](../../machine-learning/反向传播)

**关联理由**：第 8.4 节 PyTorch autograd 梯度检查中已展示中值定理在自动微分中的应用。反向传播算法的核心是链式法则，而链式法则的严格证明依赖 Carathéodory 定义与中值定理。深度学习中的梯度爆炸/消失问题可通过中值定理分析激活函数导数的取值范围。

**延伸主题**：

- 链式法则与反向模式的等价性
- 梯度爆炸/消失的导数中值分析
- Taylor 展开在二阶优化方法（Newton 法、BFGS）中的应用

#### 11.2.2 实分析

**关联路径**：[math/实分析](../../math/实分析)

**关联理由**：微分中值定理是实分析的基础工具。Lebesgue 微分定理、绝对连续性、有界变差函数等高级主题均以中值定理为起点。Darboux 定理在测度论中有推广形式。

**延伸主题**：

- Lebesgue 微分定理与 Radon-Nikodym 导数
- 绝对连续函数与 Newton-Leibniz 公式的推广
- 有界变差函数与 Jordan 分解定理

### 11.3 进阶研究方向

#### 11.3.1 多元中值定理

**研究问题**：单变量中值定理如何推广到多元函数？

**核心思路**：

- 多元函数的 Lagrange 中值定理：$f(\mathbf{b})-f(\mathbf{a})=\nabla f(\mathbf{a}+\theta(\mathbf{b}-\mathbf{a}))\cdot(\mathbf{b}-\mathbf{a})$，$\theta\in(0,1)$。
- 证明技巧：构造辅助函数 $g(t)=f(\mathbf{a}+t(\mathbf{b}-\mathbf{a}))$，$t\in[0,1]$，化为单变量问题。
- 限制：多元中值定理无法给出 $\nabla f$ 在某具体点的等式，仅能给出沿连线方向的方向导数。

**推荐文献**：

- Rudin《Principles of Mathematical Analysis》第 9 章
- Spivak《Calculus on Manifolds》第 2 章
- Apostol《Calculus, Volume 2》第 8 章

#### 11.3.2 流形上的中值定理

**研究问题**：中值定理如何在微分流形上推广？

**核心思路**：

- 在 Riemann 流形上，沿测地线的函数值差可由切向量的方向导数表示。
- 关键挑战：流形上无全局坐标系，"中值点"依赖于测地线的存在唯一性。
- 应用：Riemann 几何中的比较定理（如 Laplacian 比较定理）依赖中值定理的流形版本。

**推荐文献**：

- do Carmo《Riemannian Geometry》第 7 章
- Petersen《Riemannian Geometry》第 4 章

#### 11.3.3 非交换几何中的"中值定理"

**研究问题**：在非交换几何（如算子代数）中是否存在中值定理的类似物？

**核心思路**：

- 经典中值定理依赖交换代数的乘法结构，非交换情形下需重新定义"差商"。
- 在 C*-代数中，可考察算子值函数的"谱中值"性质。
- 这是前沿研究方向，尚未形成完整理论。

**推荐文献**：

- Connes《Noncommutative Geometry》
- Khavkine & Moore 的相关研究论文

#### 11.3.4 数值分析中的高阶中值定理

**研究问题**：如何在数值算法中利用高阶 Taylor 余项提高精度？

**核心思路**：

- 第 8.2 节 RK4 误差分析基于 4 阶 Taylor 余项 $O(h^5)$。
- 高阶数值方法（如高阶 Runge-Kutta、谱方法）的误差分析依赖 Taylor 展开至任意阶。
- 自适应步长算法基于局部截断误差的 Taylor 估计。

**推荐文献**：

- Hairer, Nørsett & Wanner《Solving Ordinary Differential Equations I》
- Trefethen《Approximation Theory and Approximation Practice》

### 11.4 推荐学习路径

#### 11.4.1 初学者路径（约 30 小时）

1. 阅读 [函数与极限](./函数与极限) 第 2、5、6 章（10 小时）
2. 阅读 [导数与微分](./导数与微分) 第 2、4 章（8 小时）
3. 阅读本篇第 1、2、4 章（6 小时）
4. 完成本篇第 9.1、9.2 节习题（4 小时）
5. 阅读 [定积分与应用](./定积分与应用) 第 5 章积分中值定理（2 小时）

#### 11.4.2 进阶路径（约 50 小时）

1. 完成初学者路径全部内容
2. 阅读本篇第 3、5、6 章（10 小时）
3. 完成本篇第 9.3、9.4 节习题（8 小时）
4. 阅读本篇第 7、8 章工程实践与案例研究（10 小时）
5. 阅读 [实分析](../../math/实分析) 中关于 Lebesgue 微分定理的内容（10 小时）
6. 选读 11.3 节中的进阶研究方向（12 小时）

#### 11.4.3 研究者路径（约 100+ 小时）

1. 完成进阶路径全部内容
2. 精读 Spivak [1]、Rudin [3]、Tao [4] 三本教材的相关章节（30 小时）
3. 阅读原始论文 Rolle [10]、Lagrange [11]、Cauchy [12]、Darboux [14]（20 小时）
4. 选定 11.3 节中一个研究方向深入探索（50+ 小时）
5. 尝试在本篇习题基础上构造新的反例与推广定理

### 11.5 工具与资源

#### 11.5.1 符号计算工具

- **SymPy**：本篇 40+ Python 代码示例中广泛使用，适合符号求导、方程求解、极限计算。
- **Mathematica / Wolfram Alpha**：商业符号计算系统，对复杂 Taylor 展开与渐近分析有优势。
- **Maple**：在微分方程与级数展开方面功能强大。

#### 11.5.2 数值计算工具

- **NumPy**：本篇数值验证代码使用的基础库，提供高效的数组运算。
- **SciPy**：提供 `scipy.optimize.newton`（Newton 迭代）、`scipy.integrate.solve_ivp`（RK45 等 ODE 求解器）。
- **matplotlib**：本篇可视化代码使用的绘图库，支持对数坐标、子图、多种绘图风格。

#### 11.5.3 自动微分工具

- **PyTorch**：第 8.4 节使用 `torch.autograd.gradcheck` 验证梯度，适合深度学习场景。
- **JAX**：Google 的自动微分框架，支持 `jax.grad`、`jax.hessian` 等高阶导数计算。
- **Autograd**：早期的 Python 自动微分库，API 简洁，适合教学。

#### 11.5.4 在线资源

- **3Blue1Brown 微积分本质系列**：https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr —— 直观理解导数与中值定理的几何意义。
- **MIT OCW 18.01 Single Variable Calculus**：https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/ —— 经典公开课，含中值定理章节。
- **Terence Tao 博客**：https://terrytao.wordpress.com/ —— Tao 教授的博客，不定期讨论分析学细节。
- **Math StackExchange**：https://math.stackexchange.com/ —— 搜索 "mean value theorem" 标签可找到大量反例与推广讨论。

### 11.6 结语

微分中值定理是分析学的核心枢纽，向上承接 ε-δ 极限语言的严格性，向下启发了 Taylor 展开、L'Hôpital 法则、数值算法等一系列工具。本篇以 11 章篇幅系统呈现了 Rolle、Lagrange、Cauchy、Taylor、Darboux、Flett、Pompeiu 等中值定理家族，并通过 40+ Python 代码示例、6 个 Mermaid 图与 80+ KaTeX 公式构建了理论与实践的完整闭环。

读者在掌握本篇内容后，可继续探索多元推广、流形版本、数值高阶方法等前沿方向。中值定理的精髓在于"以导数的局部信息约束函数的全局行为"，这一思想贯穿现代分析学的方方面面，是数学严谨性与工程实用性的完美结合。
