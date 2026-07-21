# FANDEX 内容工程规范

## 1. 总则

本规范定义 FANDEX 项目中所有 Markdown 文档的内容质量基准与编写要求。所有文档 SHALL 满足本规范定义的 12 项质量基准，方可通过 CI 校验合并至主干。

### 1.1 目标

将 FANDEX 文档从"语法速查 + 片段示例"层级，跃迁至以下水准：

- **学术严谨性**：达到 MIT 6.001 / Stanford CS106L / CMU 15-410 等顶尖课程教材水平
- **教学有效性**：符合 Bloom 分类法认知层级，支持自主学习
- **工程可复现性**：代码示例可运行，引用可溯源
- **跨文化适配**：中文表述为主，关键术语保留英文原词与词源

### 1.2 适用范围

- `src/content/docs/**/*.md` 下的全部文档
- `src/content/docs/**/*.mdx` 下的全部文档
- 新增文档须在创建时即满足本规范
- 既有文档须在升级时按本规范补全

### 1.3 不适用范围

- `*.mdx` 速查表（`语法速查.mdx`）— 仅需满足语法正确性
- `docs/`、`README.md`、`CONTRIBUTING.md` 等工程文档 — 按各自专项规范

## 2. 12 项质量基准

### 2.1 学习目标（Learning Objectives）

**要求**：

- 使用 Bloom 分类法动词（理解、应用、分析、综合、评价），避免使用"了解"等模糊动词
- 3-5 条可量化、可验证的学习目标
- 每条目标对应文档中的一个具体章节或代码示例

**填写位置**：frontmatter 的 `learningObjectives` 字段（数组）

**示例**：

```yaml
learningObjectives:
  - 应用 RAII 模式管理 C++ 动态内存资源
  - 分析 unique_ptr、shared_ptr、weak_ptr 三种智能指针的所有权语义差异
  - 设计无循环引用的图结构数据模型，使用 weak_ptr 打破环
  - 评估不同智能指针在多线程环境下的性能开销
```

**反例**：

```yaml
learningObjectives:
  - 了解智能指针 # 过于模糊，无法验证
  - 学习 C++ # 范围过大，超出文档主题
```

### 2.2 历史动机（Historical Motivation）

**要求**：

- 描述技术/概念的出现背景（年代、人物、组织）
- 阐述其解决的核心问题与设计动机
- 简述演进脉络（关键版本、里程碑、设计决策）
- 引用权威来源（论文、规范、官方文档）

**章节标题**：`## 历史动机` 或 `## 起源与演进`

**示例**：

> C 语言的指针设计源于 1972 年 Dennis Ritchie 在贝尔实验室开发的 B 语言演进。B 语言基于字指针（word pointer），无法适应当时新兴的字节寻址 PDP-11 架构。Ritchie 在设计 C 时引入了带类型的指针，使指针算术与数据类型大小解耦，这一设计在 1978 年 K&R《The C Programming Language》中正式确立，并延续至 1989 年 ANSI C（X3.159-1989）与 2011 年 ISO/IEC 9899:2011。

### 2.3 形式化定义（Formal Definition）

**要求**：

- 使用数学符号、语法产生式（BNF/EBNF）、类型规则等形式化表述
- 数学公式使用 KaTeX 语法（`$...$` 行内、`$$...$$` 块级）
- 语法产生式使用代码块标注语言为 `bnf` 或 `ebnf`

**章节标题**：`## 形式化定义` 或 `## 定义`

**示例（指针算术）**：

对于类型为 `T*` 的指针 `p` 与整数 `n`：

$$p + n \triangleq \text{addr}(p) + n \times \text{sizeof}(T) \pmod{2^{W}}$$

其中 $W$ 为地址总线宽度，$\text{addr}(p)$ 为 $p$ 的数值地址。

### 2.4 理论推导（Theoretical Derivation）

**要求**：

- 核心定理、引理、命题须有完整证明或证明思路
- 复杂度分析须含时间、空间、状态数、转移数等多维度
- 正确性论证须基于不变式（invariant）或前/后置条件

**章节标题**：`## 理论推导` 或 `## 复杂度分析`

### 2.5 代码示例（Code Examples）

**要求**：

- 可运行：通过 `scripts/qa-check.mjs` 的可编译性校验
- 有注释：核心逻辑须有中文工程级注释
- 覆盖典型用例与边界用例
- 编译/运行结果以注释标注（如 `// 输出: 42`）

**示例**：

```cpp
#include <memory>
#include <iostream>

// Widget 示例类，用于演示 RAII 资源管理
class Widget {
public:
    Widget()  { std::cout << "构造\n"; }
    ~Widget() { std::cout << "析构\n"; }
    void use() { std::cout << "使用\n"; }
};

int main() {
    // make_unique 异常安全：避免裸 new 与潜在内存泄漏
    auto p = std::make_unique<Widget>();
    p->use();
    // 离开作用域时 p 自动销毁 Widget，输出：
    // 构造
    // 使用
    // 析构
    return 0;
}
```

### 2.6 对比分析（Comparative Analysis）

**要求**：

- 与同类技术/概念对比（至少 2 个对比对象）
- 列出优劣、适用场景、性能差异
- 使用表格清晰呈现

**章节标题**：`## 对比分析`

**示例**：

| 特性     | C++ 指针 | Rust 引用    | Java 引用类型 |
| -------- | -------- | ------------ | ------------- |
| 所有权   | 手动     | 借用检查器   | GC 管理       |
| 空值     | 支持     | `Option<&T>` | 支持 `null`   |
| 算术运算 | 支持     | 不支持       | 不支持        |
| 内存安全 | 不保证   | 编译期保证   | 运行期保证    |
| 适用场景 | 系统编程 | 安全系统编程 | 业务应用      |

### 2.7 常见陷阱（Common Pitfalls）

**要求**：

- 至少 3 个常见陷阱
- 每个陷阱含：错误示例 + 错误原因 + 修正方案
- 错误示例使用 `:::danger` 提示块标注

**章节标题**：`## 常见陷阱`

### 2.8 工程实践（Engineering Practices）

**要求**：

- 生产环境最佳实践（性能、可维护性、安全性）
- 至少 3 条具体可执行的建议
- 配套代码片段或配置示例

**章节标题**：`## 工程实践`

### 2.9 案例研究（Case Study）

**要求**：

- 引用真实项目片段或开源项目代码
- 描述设计决策与权衡
- 至少 1 个完整案例

**章节标题**：`## 案例研究`

### 2.10 习题与解答（Exercises & Solutions）

**要求**：

- 覆盖四类题型：
  - 填空（fill-blank）：2 题以上
  - 选择（choice）：2 题以上
  - 代码修正（code-fix）：2 题以上
  - 开放性论述（open-ended）：2 题以上
- 每题标注难度（easy / medium / hard）
- 附完整参考答案
- 习题数据同时写入 frontmatter 的 `exercises` 字段

**章节标题**：`## 习题` 与 `## 参考答案`

**frontmatter 示例**：

````yaml
exercises:
  - type: choice
    question: |
      下列关于 std::unique_ptr 的描述，哪项是正确的？
      A. unique_ptr 可以被复制
      B. unique_ptr 只能被移动
      C. unique_ptr 共享所有权
      D. unique_ptr 使用引用计数
    answer: B
    difficulty: easy
  - type: code-fix
    question: |
      以下代码存在内存泄漏，请修正：
      ```cpp
      int* p = new int(42);
      std::cout << *p;
      ```
    answer: |
      ```cpp
      auto p = std::make_unique<int>(42);
      std::cout << *p;
      ```
    difficulty: medium
````

### 2.11 参考文献（References）

**要求**：

- 至少 3 条权威来源
- 类型涵盖：论文（paper）、RFC（rfc）、ISO 标准（iso）、官方文档（doc）、书籍（book）、网站（website）
- 格式遵循 ACM Reference Format
- 同时写入 frontmatter 的 `references` 字段

**章节标题**：`## 参考文献`

**frontmatter 示例**：

```yaml
references:
  - type: iso
    citation: 'ISO/IEC 14882:2023. Information technology — Programming languages — C++. Geneva: ISO. §7.2.2.'
  - type: book
    citation: 'Stroustrup, B. 2013. The C++ Programming Language (4th ed.). Addison-Wesley. ISBN 978-0321563842. Chapter 5.'
    url: https://www.stroustrup.com/4th.html
  - type: paper
    citation: 'Sutter, H. and Alexandrescu, A. 2004. C++ Coding Standards. Addison-Wesley. Item 13.'
```

### 2.12 延伸阅读（Further Reading）

**要求**：

- 链接关联模块（内部链接）
- 推荐进阶资料（书籍、论文、课程）
- 社区资源（标准委员会、开源项目、论坛）

**章节标题**：`## 延伸阅读`

## 3. frontmatter Schema 扩展

完整字段定义见 `src/content/config.ts`，关键字段：

| 字段                   | 类型        | 必填 | 说明                        |
| ---------------------- | ----------- | ---- | --------------------------- |
| `learningObjectives`   | string[]    | 是   | 3-7 条 Bloom 分类法学习目标 |
| `exercises`            | Exercise[]  | 否   | 习题数组（升级时补全）      |
| `references`           | Reference[] | 是   | 参考文献数组（至少 1 条）   |
| `etymology`            | string      | 否   | 文档主题术语的词源          |
| `estimatedReadingTime` | number      | 否   | 预计阅读时长（分钟）        |
| `lastReviewed`         | string      | 否   | 最后审阅时间（ISO 8601）    |
| `reviewer`             | string      | 否   | 审阅者（默认 Anonymous）    |

## 4. 参考文献格式（ACM Reference Format）

### 4.1 论文

```
Author, A. A., Author, B. B., and Author, C. C. Year. Article title. Journal Name volume, issue (Month), Article No., Pages. DOI.
```

**示例**：

> Bellman, R. 1952. On the Theory of Dynamic Programming. Proceedings of the National Academy of Sciences 38, 8 (Aug.), 716–719. DOI: 10.1073/pnas.38.8.716.

### 4.2 书籍

```
Author, A. A. Year. Book Title (Edition ed.). Publisher. ISBN.
```

**示例**：

> Stroustrup, B. 2013. The C++ Programming Language (4th ed.). Addison-Wesley. ISBN 978-0321563842.

### 4.3 ISO 标准

```
ISO/IEC. Year. Standard Number. Title. Geneva: ISO. Section.
```

**示例**：

> ISO/IEC. 2023. ISO/IEC 14882:2023. Information technology — Programming languages — C++. Geneva: ISO. §7.2.2.

### 4.4 RFC

```
Author, A. A. Year. RFC Number: Title. RFC Editor. DOI.
```

**示例**：

> Fielding, R. and Reschke, J. 2014. RFC 7231: Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content. RFC Editor. DOI: 10.17487/RFC7231.

### 4.5 官方文档

```
Organization. Year. Document Title. URL (accessed Date).
```

**示例**：

> Mozilla Developer Network. 2026. JavaScript Reference. https://developer.mozilla.org/en-US/docs/Web/JavaScript (accessed July 18, 2026).

## 5. 术语表格式（JSON Schema）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FANDEX Glossary Entry",
  "type": "object",
  "required": ["term", "english", "definition", "module"],
  "properties": {
    "term": { "type": "string", "description": "中文术语" },
    "english": { "type": "string", "description": "英文原词" },
    "etymology": { "type": "string", "description": "词源（可选）" },
    "definition": { "type": "string", "description": "权威定义" },
    "module": { "type": "string", "description": "所属模块" },
    "references": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "citation": { "type": "string" },
          "url": { "type": "string", "format": "uri" }
        }
      }
    }
  }
}
```

**示例条目**：

```json
{
  "term": "指针",
  "english": "pointer",
  "etymology": "源自拉丁语 pungere（刺、点），1964 年首次在 CPL 语言中以 pointer 形式出现",
  "definition": "一种数据类型，其值指向另一个值存储的内存地址",
  "module": "cpp",
  "references": [
    {
      "type": "iso",
      "citation": "ISO/IEC 14882:2023 §7.2.2",
      "url": "https://www.iso.org/standard/83626.html"
    }
  ]
}
```

## 6. 升级流程

### 6.1 单篇文档升级步骤

1. 检索 Skills（本地 + 远程 skillsmp.com）
2. 阅读现有文档，识别质量问题
3. 检索权威参考资料（论文、规范、官方文档）
4. 按 12 项基准重写文档
5. 更新 frontmatter 字段
6. 运行 `node scripts/qa-check.mjs --doc <path>` 校验
7. 由另一 Sub-Agent 交叉抽检
8. 提交 commit（遵循 Conventional Commits 规范）

### 6.2 模块批量升级流程

1. 模块下全部文档按 6.1 步骤升级
2. 每完成一篇即运行 QA 校验
3. 全部完成后生成模块级报告 `reports/qa/<module>/`
4. 抽检 10% 文档，确认学术严谨性与教学有效性

## 7. 校验与执行

- `scripts/qa-check.mjs` 执行 12 项基准自动化校验
- `scripts/content-audit.mjs` 执行全站内容审计
- CI（GitHub Actions）阻断未通过校验的 PR
- 报告输出至 `reports/qa/<module>/<doc>.json`

## 8. 维护

- 本规范由项目维护者定期更新（每季度一次）
- 重大变更须经评审后合并
- 历史版本归档至 `docs/specs/history/`
