---
order: 50
title: "栈与队列：限制位置，反而更强大"
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: "以「代码检查器要配对括号」引入：用 list 当栈亲手解括号匹配，理解 LIFO 与调用栈、递归的关系；deque 与循环队列解决假溢出，调度场算法求值表达式，两个栈拼一个队列的均摊分析，单调栈与单调队列的 O(n) 魔法，以及五个高频坑。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
  - 'algorithm/050-SearchAlgorithm'
  - 'algorithm/060-LinkedList'
  - 'algorithm/090-HeapAndPriorityQueue'
  - 'algorithm/140-RecursionAndBacktracking'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)：会用大 O 描述代价；
- 了解数组的头尾操作代价（[数组与动态数组](/algorithm/020-ArrayAndDynamicArray)）。

## 学习目标

读完本文你将能够：

1. 用 Python 的 list 当栈，亲手解决括号匹配，并说清 LIFO 为什么天然适配「嵌套结构」；
2. 解释函数调用栈与递归的关系，以及为什么深度递归会栈溢出；
3. 用 deque 实现队列，实测并解释 `list.pop(0)` 慢在哪里，手写循环队列并处理「判空判满」歧义；
4. 用栈完成表达式求值（调度场算法 + 逆波兰求值），用两个栈模拟队列并做均摊分析；
5. 用单调栈解「每日温度」、用单调队列解「滑动窗口最大值」，并能论证它们为什么是 O(n)；
6. 识别栈与队列的五个高频坑（判空判满歧义、单调栈存值不存索引等）。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

你在写一个 mini 代码检查器，第一个功能是括号校验：`({[]})` 合法，`([)]` 不合法。规则看着简单，写起来却发现一个问题——遇到 `)` 时，你得知道**最近一个还没闭合的左括号是谁**。

「最近未完成的先完成」就是**栈**（stack）：只许在一端（栈顶）放入和取出，后进先出（LIFO）。它的孪生兄弟**队列**（queue）规则相反：一端进、另一端出，先进先出（FIFO）——排版打印任务、消息排队处理、搜索时「先发现的先探索」，靠的都是它。

两者都是**受限线性表**：数组随便哪个位置都能插删，栈与队列只留一个口。限制带来的回报是：操作全为 O(1)、语义清晰、正确性容易论证。1950 年代编译器求值表达式时，「延期最后的操作首先执行」（Bauer 与 Samelson 的叠加原理）让栈第一次成为核心数据结构；今天从你每一次函数调用，到 Go 语言的 channel，底层都是这两个结构。

## 2. 最小可运行实验：括号匹配

用 Python 的 list 当栈（`append` 即入栈，`pop` 即出栈），一遍扫描解决：

```python
def is_valid_parentheses(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in "([{":                  # 左括号：登记，等它闭合
            stack.append(ch)
        elif ch in pairs:                # 右括号：必须配对最近登记的
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack                     # 还有没闭合的，不合法

for case in ["({[]})", "([)]", "(((", ")(", ""]:
    print(case, "->", is_valid_parentheses(case))
```

预期输出：

```text
({[]}) -> True
([)] -> False
((( -> False
)( -> False
 -> True
```

逐步追踪 `([)]`：

| 读到 | 动作 | 栈（右端为栈顶） | 结果 |
| --- | --- | --- | --- |
| ( | 入栈 | ( | - |
| [ | 入栈 | ( [ | - |
| ) | 弹出 [ ，期望 ( ，实际是 [ | ( [ | 返回 False |

三个返回 False 的用例各踩一种失败模式：`([)]` 是顺序错，`(((` 是收尾时栈非空，`)(` 是弹出时栈已空。代码里恰好三处分别处理它们——`stack.pop() != pairs[ch]`、结尾的 `not stack`、弹出前的 `not stack` 判断。**每一条分支都对应一种真实故障**，这是栈类题目的典型写法。

## 3. 发生了什么：栈是「最近未完成的事先完成」

括号匹配能成立，是因为括号结构是**嵌套**的：后打开的括号必先关闭。所有嵌套结构都长这个样子——

- **函数调用**：调用 f 时压入一个栈帧（返回地址、参数、局部变量），f 返回时弹出。递归就是调用栈不断加深：`fib(n-1)` 没算完之前，`fib(n)` 的栈帧一直压在栈顶。所以说**递归天然是栈**，迭代化递归就是自己管理一个显式栈；
- **撤销操作**：编辑器的 undo 弹出的总是「最近一次操作」；
- **浏览器后退**：弹出的总是「上一个访问的页面」。

复杂度一览：栈与队列的进出都是 O(1)（动态数组底层偶发一次扩容搬家，均摊仍 O(1)）。唯一要小心的代价藏在**用错内置结构**上——立刻实验。

## 4. 核心概念一：队列、deque 与循环队列

### 4.1 先看一个反例：list.pop(0) 有多慢

Python 的 list 一端（尾部）增删是 O(1)，但 `pop(0)` 要把后面所有元素整体前移一格，是 O(n)：

```python
import timeit
from collections import deque

n = 20000
lst = list(range(n))
dq = deque(range(n))

t_list = timeit.timeit(lambda: lst.pop(0), number=n)
t_dq = timeit.timeit(lambda: dq.popleft(), number=n)
print(f"list.pop(0)   x{n}: {t_list:.3f}s")
print(f"deque.popleft x{n}: {t_dq:.3f}s")
```

预期输出（数值因机器而异）：

```text
list.pop(0)   x20000: 0.384s
deque.popleft x20000: 0.002s
```

两百倍的差距，只因为选错了出队的一端。**Python 里队列一律用 `collections.deque`**：`append` 入队尾、`popleft` 出队首，两端都 O(1)。它同时是栈和队列的超集（双端队列），C++ 的对应物是 `std::deque`，Java 是 `ArrayDeque`（官方明确不推荐继承自 Vector 的老 `Stack` 类——所有方法带锁，性能差）。

### 4.2 假溢出与循环队列

如果坚持用定长数组手工实现队列，会遇到经典陷阱：`front` 和 `rear` 两个指针都只往前走，出队后前方的空位永远用不上，`rear` 撞到数组末尾时明明前面有空，却报「队列已满」——这叫**假溢出**。

解法是把数组首尾相连：指针前进后对容量取模 `rear = (rear + 1) % capacity`，空位即可循环复用，这就是**循环队列**：

```python
class CircularQueue:
    def __init__(self, k: int):
        self.data = [None] * k
        self.front = 0            # 队首下标
        self.rear = 0             # 下一个待插入位置
        self.size = 0             # 当前元素个数
        self.cap = k

    def enqueue(self, value) -> bool:
        if self.size == self.cap:
            return False          # 真满
        self.data[self.rear] = value
        self.rear = (self.rear + 1) % self.cap
        self.size += 1
        return True

    def dequeue(self) -> bool:
        if self.size == 0:
            return False
        self.front = (self.front + 1) % self.cap
        self.size -= 1
        return True

q = CircularQueue(3)
for v in [7, 1, 3]:
    q.enqueue(v)
q.dequeue(); q.dequeue()          # 出队两个，前方空出两位
print(q.enqueue(9), q.enqueue(8)) # True False：只容得下一个
```

初始化容量 3，入 7、1、3 后已满；出队两个再入 9、8——第二个 `enqueue` 返回 False，说明「空出的位置确实被复用了，但总量没变」。这里藏着一个必考细节：`front == rear` 既可能是**空**也可能是**满**（指针转了一整圈又重叠）。三种消歧方案：

1. **维护 size 变量**（本文做法，推荐）：`size == 0` 判空、`size == cap` 判满，直观无歧义；
2. **牺牲一个槽位**：`(rear + 1) % cap == front` 判满，容量少 1；
3. **标志位**：记下最近一次是入队还是出队，配合 `front == rear` 判断。

手写循环队列的意义不在生产（语言内置的 deque 更好），而在于让你亲手处理「环形下标」与「状态歧义」——这两个肌肉记忆在写环形缓冲区、滑动窗口日志时全用得上。

## 5. 核心概念二：表达式求值——调度场与逆波兰

栈诞生于编译器求值表达式的需求，值得亲手走一遍。人类写中缀 `3 + 4 * 2`，机器好算后缀（逆波兰）`3 4 2 * +`——后缀连优先级和括号都不需要：操作数入栈，遇运算符弹出两个数计算再压回。

**第一步，中缀转后缀（调度场算法）**：操作数直接输出；运算符先压栈，但入栈前把栈顶「优先级不低于自己」的运算符全部弹出输出；左括号入栈，右括号则一路弹到左括号：

```python
def infix_to_postfix(expr: str) -> str:
    precedence = {'+': 1, '-': 1, '*': 2, '/': 2}
    output, stack = [], []
    i = 0
    while i < len(expr):
        c = expr[i]
        if c.isdigit():                       # 多位数整体读入
            j = i
            while j < len(expr) and expr[j].isdigit():
                j += 1
            output.append(expr[i:j])
            i = j
            continue
        if c == '(':
            stack.append(c)
        elif c == ')':
            while stack and stack[-1] != '(':
                output.append(stack.pop())
            stack.pop()                       # 丢弃左括号
        elif c in precedence:
            while (stack and stack[-1] != '('
                   and precedence[stack[-1]] >= precedence[c]):
                output.append(stack.pop())
            stack.append(c)
        i += 1
    while stack:                              # 倒出剩余运算符
        output.append(stack.pop())
    return ' '.join(output)

print(infix_to_postfix("3 + 4 * 2 / (1 - 5)"))   # 3 4 2 * 1 5 - / +
```

**第二步，后缀求值**：

```python
def eval_rpn(tokens: list[str]) -> int:
    stack = []
    for token in tokens:
        if token in '+-*/':
            b = stack.pop()          # 注意：先弹的是右操作数
            a = stack.pop()
            stack.append(int(a / b) if token == '/'
                         else a + b if token == '+'
                         else a - b if token == '-'
                         else a * b)
        else:
            stack.append(int(token))
    return stack[0]

print(eval_rpn(["3", "4", "2", "*", "1", "5", "-", "/", "+"]))
# 3 4 2* = 8；1 5- = -4；8 / -4 = -2；3 + -2 = 1
```

两段合起来，就是计算器与编译器处理表达式的基本骨架。追踪一次 `4 * 2` 的转移：转后缀时 `*` 想入栈，发现栈顶 `+` 优先级低，`*` 直接进栈；读到末尾倒栈，`*` 排在 `+` 前输出——优先级就这样被「压栈时机」隐式编码了。

## 6. 核心概念三：两个栈拼一个队列

限定器（LC-232）：只用栈实现队列。思路：入队压入栈 in；出队时把 in 整体**倒进**栈 out——倒手一次，顺序就反了回来：

```python
class MyQueue:
    def __init__(self):
        self._in, self._out = [], []

    def push(self, x):
        self._in.append(x)                    # O(1)

    def _ensure_out(self):
        if not self._out:                     # out 空才倒，一次倒光
            while self._in:
                self._out.append(self._in.pop())

    def pop(self) -> int:
        self._ensure_out()
        return self._out.pop()

    def peek(self) -> int:
        self._ensure_out()
        return self._out[-1]

    def empty(self) -> bool:
        return not self._in and not self._out

q = MyQueue()
q.push(1); q.push(2); q.push(3)
print(q.pop(), q.pop())    # 1 2：FIFO 成立
q.push(4)
print(q.pop())             # 3
```

追踪：push 1,2,3 后 in = [1,2,3]；第一次 pop 触发倒栈，out = [3,2,1]，弹出 1；push 4 进 in；再 pop 弹出 out 顶的 2。**正确顺序，且出队不必每次都倒**。

关键在均摊分析：每个元素一生只经历四次动作（进 in、出 in、进 out、出 out），n 次操作总代价 O(n)，单次均摊 O(1)。第一眼看像 O(n) 的「倒栈」操作，平摊到每个元素头上不足一次——这与数组篇「倍增扩容均摊 O(1)」是同一套分析方法。反过来「两个队列拼一个栈」也可行，但 push 要 O(n)，实用价值低，理解对称性即可。

## 7. 核心技巧：单调栈与单调队列

### 7.1 单调栈：给每个元素找「下一个更大」

问题（LC-739 每日温度）：`[73,74,75,71,69,72,76,73]`，对每天求「再等几天升温」。暴力两层循环 O(n²)，单调栈一遍扫平：

```python
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n
    stack = []                        # 存下标，对应温度从栈底到栈顶递减
    for i in range(n):
        while stack and temperatures[i] > temperatures[stack[-1]]:
            prev = stack.pop()        # i 就是 prev 的「下一个更高温度」
            answer[prev] = i - prev
        stack.append(i)
    return answer

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
# [1, 1, 4, 2, 1, 1, 0, 0]
```

思想：栈里存的是「还在等升温的日子」，它们的温度从底到顶递减。新的一天更暖，就把所有等到了的日子逐一弹出发答案；没等到的一天留栈。逐步看 71, 69, 72 三天：71、69 依次入栈（都比 75 凉）；72 到来时弹出 69（等 1 天）、弹出 71（等 2 天），72 自己入栈继续等。

**为什么是 O(n)**：看内层 while 有点慌，但换个角度——每个下标至多入栈一次、出栈一次，总动作数不超过 2n。这是**聚合分析**：不看单次操作最坏情形，看 n 次操作的总账。

同族题 LC-84（柱状图中最大矩形）多一个技巧——**末尾加高度 0 的哨兵**，强制扫尾时把栈清空，避免漏算以早期柱子为高的矩形：

```python
def largest_rectangle_area(heights: list[int]) -> int:
    stack, max_area = [], 0
    for i, h in enumerate(heights + [0]):     # 哨兵 0 收尾
        while stack and h < heights[stack[-1]]:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area

print(largest_rectangle_area([2, 1, 5, 6, 2, 3]))   # 10
```

### 7.2 单调队列：滑动窗口最大值

问题（LC-239）：数组与窗口 k，求每个窗口的最大值。暴力每窗扫 k 次是 O(nk)，单调队列 O(n)：

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq = deque()                  # 存下标，对应值从队首到队尾递减
    result = []
    for i, num in enumerate(nums):
        while dq and dq[0] <= i - k:          # 队首已滑出窗口，过期作废
            dq.popleft()
        while dq and nums[dq[-1]] < num:      # 比新来的小的，永无出头之日
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])        # 队首即窗口最大值
    return result

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))
# [3, 3, 5, 5, 6, 7]
```

直觉：新元素入队时，把队列里所有比它小的元素**从队尾淘汰**——它们比新元素先过期、又比它小，绝无可能再当最大值。于是队首永远是当前窗口最大。仍是「每个下标至多进出各一次」的聚合分析，O(n)。

单调栈与单调队列是同一种思想在两个容器上的落点：**按单调性提前淘汰注定无用的候选**。记住触发信号——题目问「下一个更大 / 更小」「窗口内最值」，先想单调结构。

## 8. 调试实录：五个高频坑

坑 1：**循环队列判空判满歧义**。只用 `front == rear` 同时判空与判满，两种状态不可分。用 size 变量或牺牲一个槽位（见 4.2 节）。

坑 2：**单调栈存值不存下标**。每日温度要算「等几天」，弹出的元素必须知道自己的位置——栈里存下标，值随用随取。存值版写到算距离时必然卡住。

坑 3：**单调队列忘记清过期队首**。漏掉 `dq[0] <= i - k` 的判断，窗口滑走后队首仍是「过期最大值」。两个 while 的顺序固定：先清队首过期，再清队尾较小。

坑 4：**扩容时忘了拷贝旧数据**。手写顺序栈扩容直接 `self._data = [None] * (cap * 2)`，原数据全丢。先建新数组、搬旧数据、再替换——和数组篇的扩容三步一样。

坑 5：**深度递归打爆调用栈**。Python 默认递归上限约 1000 层，`RecursionError` 是保护而非 bug；十万层的需求改成迭代（显式栈）或分段处理。这也是 060 篇「递归反转链表」栈深坑的同一根源。

## 9. 工程现场：这些结构在哪干活

- **函数调用栈**：栈深有上限（Linux 默认线程栈 8MB，Windows 默认 1MB，Python 再叠加 1000 层的解释器限制），递归深度是真实资源；
- **浏览器前进后退**：两个栈，后退栈顶是当前页；访问新页清空前进栈，后退时把当前页压进前进栈，前进反之——与编辑器 undo/redo 完全同构，一个模式两个应用；
- **操作系统调度**：就绪队列、等待队列管理进程；轮转调度（Round-Robin）就是循环队列——时间片用完放回队尾；
- **消息队列**：Kafka、RabbitMQ 的本质是分布式 FIFO，生产者入队、消费者出队，把「快慢不一致」的两段系统解耦；
- **Go channel**：语言级的有锁环形缓冲队列，"share memory by communicating"——用队列传递数据所有权，替代共享变量加锁；
- **性能口径**：百万次操作，Python 的 list 当栈约 0.1 秒、deque 相当，手写链式栈慢 5 到 8 倍，加锁的 `queue.Queue` 慢一个数量级——**生产代码用内置实现，手写是为了理解**。

## 10. 修改实验

1. 把括号匹配扩展成「返回第一个出错位置」：错误分三种（不期望的右括号、左括号多余、右括号多余），返回各自的下标；
2. 给 `MyQueue` 补一个 `pop` 后的复用测试：交替 push/pop 一万次，验证 out 非空时 push 不会触发倒栈（在 `_ensure_out` 里加计数器统计倒栈次数，应远小于操作次数）；
3. 把循环队列从「定长返回 False」改成「满了自动扩容为原来的 2 倍」（提示：扩容时按 front 起的顺序搬到新数组，重置 front 与 rear），对比内置 deque 验证行为一致；
4. 把 `daily_temperatures` 改成求「前一个更大元素」（向左看），只改动遍历方向与答案下标，用 `[73,74,75,71,69,72,76,73]` 对称验证。

## 11. 小练习

预测题（先算再验证）：入栈序列为 `a, b, c, d, e`，出栈序列为 `c, e, d, b, a`，过程中栈的容量至少是几？（提示：手动模拟，记下任意时刻栈内最多的元素个数；答案见本节末。）

修改题：给栈加一个 `get_min`（LC-155 最小栈）：push/pop/get_min 全部 O(1)。提示：配一个辅助栈，与主栈同步进出，栈顶永远存「当前最小值」；用 `[5, 3, 7, 2, 8]` 依次入栈，验证各时刻 get_min 为 5, 3, 3, 2, 2。

修 Bug 题：同事手写的循环队列偶发「满了还能入队」，代码判满是 `self.rear == self.cap - 1`——指出错误（rear 是取模环形下标，可能停在任意位置），改用 size 判断，并构造一个「绕圈后」的用例复现原 bug。

挑战题（不看提示）：字符串解码（LC-394）：`"3[a2[c]]"` 解码为 `"accaccacc"`。用两个栈：一个存数字、一个存当时已构建的字符串，遇 `]` 时弹栈重组；先手动追踪这个例子再写代码。

（预测题答案：4。模拟 push a,b,c 后弹 c，再 push d,e——此刻栈内 a,b,d,e 共 4 个。）

## 12. 什么时候应该 / 不应该用栈与队列

应该：嵌套配对与撤销语义（栈）、先来先服务的公平排队（队列）、只需要两端操作（deque）、括号与表达式求值、BFS 的探索顺序（队列，050 篇展开）、下一个更大与窗口最值（单调结构）。

不应该：需要按下标随机访问（数组）；按优先级出队而非按先后（堆与优先队列，090 篇）；需要在中间插删（链表，060 篇）。选型口诀：**访问模式决定结构**——后进先出找栈，先进先出找队列，两端进出找 deque，按重要性出队找堆。

## 13. 与之前和之后的知识的关系

- 往前：数组篇的「头插 O(n)」实测解释了 `list.pop(0)为什么慢`；链表篇的头插头删 O(1) 是链式栈队列的原理（工程上仍首选内置 deque，缓存更友好）；
- 往后：[搜索算法](/algorithm/050-SearchAlgorithm) 中 BFS 靠队列保证按层扩展、DFS 靠栈（或递归调用栈）一条路走到底；[递归与回溯](/algorithm/140-RecursionAndBacktracking) 把「显式栈化递归」变成系统方法；[堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 是「按优先级出队」的队列升级版；
- 更远：操作系统篇的进程就绪队列与等待队列、网络篇的报文排队，都是本文循环队列思想的工业级放大。

## 14. 官方文档与延伸资源

- collections.deque（Python 双端队列）：https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
- queue.Queue（线程安全队列，生产者消费者）：https://docs.python.org/zh-cn/3/library/queue.html
- USF 数据结构可视化（栈与队列动画）：https://www.cs.usfca.edu/~galles/visualization/StackArray.html
- 本站[算法题图鉴](/algorithms)收有本篇配套经典题：20 有效的括号、155 最小栈、232 用栈实现队列、739 每日温度、503 下一个更大元素 II、84 柱状图中最大的矩形、394 字符串解码、239 滑动窗口最大值、42 接雨水，均带思路与参考实现。

## 15. 自我检查

- 能白板写出括号匹配并说出三条失败分支各对应什么输入；
- 能解释递归与调用栈的关系，以及 RecursionError 从哪来；
- 能手写循环队列并讲清判空判满的三种消歧方案；
- 能用均摊分析论证两个栈拼队列、单调栈、单调队列都是 O(n)；
- 看到题目能识别「下一个更大」「窗口最值」的单调结构信号。

## 本章总结

栈与队列把线性表限制到一个口，换来 O(1) 操作与清晰语义：栈管「最近未完成」，队列管「先来先服务」。括号匹配、表达式求值、两个栈拼队列是栈的三板斧；单调栈与单调队列用「提前淘汰候选」把 O(n²) 压到 O(n)；循环队列教你处理环形下标与状态歧义。访问模式决定结构，这是选型的第一性原理。

## 下一步

进入 [搜索算法](/algorithm/050-SearchAlgorithm)：把栈与队列当作探索顺序的两个开关——DFS 用栈一条路走到底，BFS 用队列层层推进，本文的两个结构将在图与树上大显身手。
