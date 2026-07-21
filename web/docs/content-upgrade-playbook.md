# FANDEX 内容升级标准操作流程（SOP）

本文件总结 Phase 2 试点（`cpp/指针.md` 升级）的实践经验，形成可复用的内容升级标准操作流程，作为后续 2013 篇文档批量升级的引用基线。

## 一、试点成果概览

| 维度            | 数据                           |
| :-------------- | :----------------------------- |
| 试点文档        | `src/content/docs/cpp/指针.md` |
| 升级前行数      | 约 113 行（含代码错误）        |
| 升级后行数      | 2219 行                        |
| 升级后字符数    | 53,479（约 53KB）              |
| 代码示例数      | 67 个（均标注预期输出）        |
| 习题数量        | 10 题（覆盖四类题型）          |
| Mermaid 图表    | 3 个                           |
| KaTeX 公式      | 34 个（5 块级 + 29 行内）      |
| 参考文献        | 8 条（ACM Reference Format）   |
| 12 项基准覆盖率 | 100%                           |
| type-check 结果 | 通过（0 errors）               |

## 二、12 项质量基准实施细节

### 基准 1：学习目标（learningObjectives）

- **位置**：frontmatter `learningObjectives` 字段 + 正文第 1 章
- **数量**：6 条，覆盖 Bloom 分类法的 6 个认知层级（remember/understand/apply/analyze/evaluate/create）
- **句式**：使用"能够 + 动词 + 宾语"格式，动词与 Bloom 层级匹配
- **示例**：
  - 记忆指针的内存模型与地址算术的代数性质（remember）
  - 创造性设计基于指针的抽象数据结构与内存管理策略（create）

### 基准 2：历史动机

- **位置**：正文第 2 章
- **内容**：按时间线梳理技术/概念的演进，包含关键人物、年份、动机
- **深度**：至少追溯到 1960s-1970s 的起源，延伸至最新标准
- **示例**：BCPL(1967) → B(1969) → C(1972, Dennis Ritchie) → C++(1985, Bjarne Stroustrup) → C++11(2011, smart pointers) → C++20(2019, concepts)

### 基准 3：形式化定义

- **位置**：正文第 3 章
- **工具**：KaTeX 数学公式（`$$...$$` 块级）
- **要求**：使用数学符号、集合论、代数结构等严格定义
- **示例**：
  - 设 $M$ 为内存空间，$A \subseteq M$ 为地址集合
  - 指针 $p$ 是有序对 $(a, T)$，其中 $a \in A$, $T$ 为类型
  - 解引用 $\text{deref}(p) = \text{interpret}(a, T)$

### 基准 4：理论推导

- **位置**：与形式化定义合并或独立章节
- **内容**：代数性质、定理陈述与证明、复杂度分析
- **示例**：指针算术的 Z-模性质、数组等价性推导、复杂度 $O(1)$ 的论证

### 基准 5：代码示例

- **位置**：贯穿全文
- **要求**：
  - 每段代码可编译运行（`g++ -std=c++20 -Wall -Wextra`）
  - 标注预期输出（以 `// 输出: ...` 注释）
  - 涉及 UB 的代码标注 `// UB: ...`
  - 长代码配逐行注释
  - 使用 `cpp` 语言标记
- **示例**：
  ```cpp
  #include <iostream>
  int main() {
      int x = 42;
      int* p = &x;
      std::cout << *p << "\n";  // 输出: 42
      return 0;
  }
  ```

### 基准 6：对比分析

- **位置**：独立章节（如第 9 章）
- **形式**：表格 + 详细说明
- **对比维度**：与同类技术/概念对比，至少 3-5 个对比项
- **示例**：指针 vs 引用、指针 vs 智能指针、C++ 指针 vs Rust 引用、C++ 指针 vs Java 引用、C++ 指针 vs Go 指针

### 基准 7：常见陷阱

- **位置**：独立章节（如第 10 章）
- **数量**：至少 10 个陷阱
- **结构**：每个陷阱含「错误示例 + 原因分析 + 修正方案」三部分
- **示例**：野指针、悬空引用、内存泄漏、双重释放、严格别名违规等

### 基准 8：工程实践

- **位置**：独立章节（如第 11 章）
- **内容**：生产环境最佳实践、设计模式、性能优化、工具链
- **示例**：现代 C++ 准则（C++ Core Guidelines）、Pimpl 惯用法、自定义分配器、AddressSanitizer

### 基准 9：案例研究

- **位置**：独立章节（如第 12 章）
- **要求**：引用真实开源项目代码，至少 3-5 个案例
- **示例**：Linux 内核 `container_of`、SQLite B-tree、Chromium `scoped_ptr`、LLVM `SmallVector`、Redis SDS

### 基准 10：习题与解答

- **位置**：frontmatter `exercises` 字段 + 正文独立章节（如第 13 章）
- **数量**：至少 10 题
- **类型分布**：四类题型各至少 2 题
  - 填空题（fill-blank）：记忆与理解层级
  - 选择题（choice）：理解与分析层级
  - 代码修正（code-fix）：应用与评估层级
  - 开放性问题（open-ended）：评估与创造层级
- **元数据**：每题标注 `id`、`cognitiveLevel`（Bloom）、`difficulty`（1-5）、`estimatedTime`
- **解答**：每题附参考答案与详细解析

### 基准 11：参考文献

- **位置**：frontmatter `references` 字段 + 正文末尾章节
- **格式**：ACM Reference Format
- **数量**：至少 3 条权威来源（建议 5-8 条）
- **类型**：标准（standard）、书籍（book）、网站（website）等
- **示例**：ISO/IEC 14882:2023、Stroustrup TC++PL 4th、Meyers Effective C++ 3rd、cppreference

### 基准 12：延伸阅读

- **位置**：正文末尾章节
- **内容**：链接关联模块（相对路径）、进阶资料、相关模块
- **示例**：`cpp/引用`、`cpp/智能指针详解`、C++ Core Guidelines 官网

## 三、术语词源标注规范

- **位置**：frontmatter `etymology` 字段 + 正文首次出现时
- **结构**：`{ term: 中文, english: 英文, origin: 词源说明 }`
- **示例**：
  - 指针（pointer，源自拉丁语 "punctus"，意为"点"）
  - 解引用（dereference，"de-" 去除 + "reference" 引用）
  - 野指针（dangling pointer，"dangling" 悬挂、悬空）

## 四、可视化资源规范

### Mermaid 图表

- **使用场景**：内存布局、数据结构、状态流转、架构关系
- **语法**：使用 ` ```mermaid ` 代码块
- **示例**：虚拟地址空间布局图、shared_ptr 引用计数流转图

### KaTeX 公式

- **使用场景**：形式化定义、定理证明、复杂度分析
- **语法**：行内 `$...$`，块级 `$$...$$`
- **示例**：指针算术 $\text{deref}(p) = \text{interpret}(a, T)$

## 五、标准升级流程（SOP）

### 步骤 1：前置准备

1. 读取现有文档，识别问题（代码错误、内容简陋、缺失字段）
2. 检索相关 Skills（本地 + 远程 skillsmp.com）
3. 确定文档的学术领域与目标受众

### 步骤 2：Frontmatter 扩展

1. 补全 `learningObjectives`（6 条 Bloom 目标）
2. 补全 `references`（5-8 条 ACM 格式）
3. 补全 `etymology`（关键术语 3-5 个）
4. 补全 `lastReviewed`、`reviewer`
5. 更新 `updated` 为当前日期
6. 完善 `prerequisites`、`related`、`description`

### 步骤 3：正文重写

1. 学习目标与导论
2. 历史动机与演进
3. 形式化定义与内存模型/理论模型
4. 基础操作与代码示例
5. 类型系统/语法体系
6. 算术运算/核心机制
7. 与函数/其他特性的交互
8. 动态管理/进阶用法
9. 对比分析（表格 + 说明）
10. 常见陷阱（错误 + 原因 + 修正）
11. 工程实践与最佳实践
12. 案例研究（真实项目）
13. 习题与解答（10 题，四类题型）
14. 参考文献（ACM 格式）
15. 延伸阅读

### 步骤 4：习题编写

1. 在 frontmatter `exercises` 字段中定义结构化习题
2. 在正文第 13 章展示习题与解答
3. 确保四类题型各至少 2 题
4. 标注 `cognitiveLevel` 与 `difficulty`

### 步骤 5：可视化增强

1. 识别需要图示的复杂概念
2. 使用 Mermaid 绘制结构图、流程图、状态图
3. 使用 KaTeX 编写数学公式、定理证明
4. 确保图表有标题与说明

### 步骤 6：验证

1. 运行 `npm run type-check` 确认 frontmatter schema 校验通过
2. 检查 12 项基准是否全部覆盖
3. 检查代码示例是否可编译（如条件允许）
4. 检查术语词源标注
5. 检查 Mermaid 与 KaTeX 语法

### 步骤 7：交叉验证（可选）

1. 由另一 Sub-Agent 抽检文档
2. 验证学术严谨性（引用准确、定义正确）
3. 验证教学有效性（逻辑清晰、难度递进）

## 六、后续模块升级建议

### 并行执行策略

- 每个模块作为一个独立的 Sub-Agent 任务
- 三个试点模块（cpp、algorithm、calculus）可并行
- 剩余 48 模块按 5 个一组并行，每完成一组进行交叉抽检

### 优先级排序

1. **高优先级**（核心模块，文档数多）：cpp、algorithm、calculus、python、javascript、java
2. **中优先级**（重要模块）：c、go、rust、data-structure、discrete-math、linear-algebra
3. **低优先级**（辅助模块）：english、git、github、markdown、getting-started

### 模块特定注意事项

- **数学类模块**（calculus、linear-algebra、discrete-math）：重点强化 KaTeX 公式与定理证明
- **算法类模块**（algorithm、data-structure）：重点强化复杂度分析与 CLRS 风格习题
- **语言类模块**（cpp、python、java）：重点强化代码示例可运行性与语言规范引用
- **工具类模块**（git、github）：重点强化实际工作流与最佳实践

### 质量一致性保障

- 每个模块完成后运行 `scripts/qa-check.mjs`
- 定期（每 5 个模块）由独立 Sub-Agent 交叉抽检 10% 文档
- 所有模块完成后生成全站内容质量终态报告 `reports/final/content-quality.md`

## 七、试点经验教训

### 成功经验

1. **12 项基准全面覆盖**：确保文档达到论文级别专业度
2. **frontmatter schema 扩展**：结构化数据便于后续检索与展示
3. **Mermaid + KaTeX 组合**：复杂概念的可视化效果显著
4. **真实项目案例**：提升文档的工程可信度

### 改进方向

1. **代码示例自动验证**：当前依赖人工检查，后续可引入 esbuild dry-run 或 compiler explorer API
2. **习题自动评分**：当前 `exercises` 字段已结构化，后续可配合前端组件实现自动评分
3. **术语表自动生成**：从 `etymology` 字段聚合生成全站术语表
4. **参考文献 DOI 验证**：后续可引入 DOI 解析验证参考文献真实性

## 八、参考资源

- 《FANDEX 内容工程规范》：`docs/content-engineering-spec.md`
- Schema 定义：`src/content/config.ts`
- 字段补全脚本：`scripts/backfill-frontmatter.mjs`
- 内容审计脚本：`scripts/content-audit.mjs`
- 试点示范文档：`src/content/docs/cpp/指针.md`
