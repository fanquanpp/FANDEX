---
order: 103
title: 'Code-Review流程与最佳实践'
module: git
category: toolchain
difficulty: intermediate
description: 'Code Review流程设计、审查要点、工具选型与团队最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/交互式rebase
  - 'git/git-revert与reset对比'
prerequisites:
  - git/语法速查
---

## 1. Code Review 的价值

### 1.1 核心目标

Code Review 不仅是找 Bug，更是团队知识共享和质量保障的核心环节：

| 目标     | 说明                                   |
| -------- | -------------------------------------- |
| 质量保障 | 尽早发现逻辑错误、安全漏洞、性能问题   |
| 知识传播 | 评审者了解代码变更，降低"巴士因子"风险 |
| 编码规范 | 统一代码风格，确保团队一致性           |
| 设计改进 | 发现架构问题，推动更好的设计方案       |
| 导师作用 | 高级工程师通过 Review 指导初级工程师   |

### 1.2 数据支撑

根据 Google 的研究数据：

- Code Review 平均可发现 **60-90%** 的缺陷
- 每小时代入 Review 的时间可节省 **33** 小时的维护成本
- Review 效率在 **200-400 行**变更时最高

## 2. Review 流程设计

### 2.1 标准流程

```
开发者                    审查者                    仓库
  │                         │                        │
  │── 创建 PR ──────────────│──────────────────────→ │
  │                         │                        │
  │                         │── 自动化检查 ─────────→ │
  │                         │   (CI/Lint/测试)       │
  │                         │                        │
  │                         │── 代码审查 ──→          │
  │                         │   评论/建议             │
  │                         │                        │
  │── 修改代码 ─────────────│                        │
  │                         │── 重新审查 ──→          │
  │                         │                        │
  │                         │── Approve ────────────→ │
  │                         │                        │
  │                         │                  合并 PR │
```

### 2.2 PR 准入条件

```yaml
# GitHub Branch Protection Rules
required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

required_status_checks:
  strict: true
  contexts:
    - ci/lint
    - ci/test
    - ci/build
```

### 2.3 角色与职责

| 角色      | 职责                               |
| --------- | ---------------------------------- |
| PR 作者   | 编写清晰的 PR 描述、自检、响应评论 |
| 审查者    | 逐行审查、提出建设性意见、确认修改 |
| CODEOWNER | 关键模块的强制审查者               |
| 维护者    | 最终合并决策、解决审查分歧         |

## 3. 审查维度

### 3.1 审查清单

**功能正确性**：

- [ ] 代码是否实现了 PR 描述中的需求
- [ ] 边界条件是否处理
- [ ] 错误路径是否覆盖
- [ ] 并发场景是否安全

**代码质量**：

- [ ] 命名是否清晰、一致
- [ ] 函数是否过长（建议 < 50 行）
- [ ] 是否有重复代码可提取
- [ ] 复杂度是否合理（圈复杂度 < 10）

**安全性**：

- [ ] 输入是否验证和清理
- [ ] 是否有 SQL 注入 / XSS 风险
- [ ] 敏感信息是否硬编码
- [ ] 权限检查是否完整

**性能**：

- [ ] 是否有不必要的循环或递归
- [ ] 数据库查询是否优化（N+1 问题）
- [ ] 是否有内存泄漏风险
- [ ] 大数据量场景是否考虑

**可维护性**：

- [ ] 是否有必要的注释（解释"为什么"而非"做什么"）
- [ ] 是否有对应的测试
- [ ] 是否影响现有 API 兼容性
- [ ] 文档是否更新

### 3.2 审查优先级

```
P0 - 阻塞合并：安全漏洞、逻辑错误、数据丢失风险
P1 - 强烈建议：性能问题、可维护性差、缺少测试
P2 - 建议改进：命名优化、代码风格、注释补充
P3 - 可选讨论：设计偏好、替代方案讨论
```

### 3.3 审查效率

```bash
# 单次 Review 的最佳参数
PR 变更行数: 200-400 行
Review 时间: 30-60 分钟
审查深度:   逐行审查（< 200 行），重点审查（200-400 行），架构审查（> 400 行）
```

## 4. Review 评论规范

### 4.1 评论分类标记

```
[nit]     - 细微问题，不影响合并
[quest]   - 疑问，需要解释
[suggest] - 建议，非必须修改
[must]    - 必须修改，阻塞合并
[praise]  - 赞赏，值得学习的代码
```

### 4.2 建设性评论示例

**不好的评论**：

```
这段代码写得不好。
```

**好的评论**：

````
[must] 这里直接拼接 SQL 有注入风险，建议使用参数化查询：

```python
# 当前代码
query = f"SELECT * FROM users WHERE id = {user_id}"

# 建议改为
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
````

````

### 4.3 评论礼仪

1. **对事不对人**：评论代码，不评论人
2. **提供方案**：不只指出问题，还给出建议
3. **解释原因**：说明为什么这样改更好
4. **正面反馈**：对好的代码给予肯定

## 5. 工具与自动化

### 5.1 自动化检查集成

```yaml
# .github/workflows/pr-check.yml
name: PR Check
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
````

### 5.2 CODEOWNERS 配置

```
# .github/CODEOWNERS

# 全局审查者
* @team-lead

# 核心模块需要架构师审查
/src/core/ @architect

# 安全相关需要安全团队审查
/src/auth/ @security-team

# 数据库变更需要 DBA 审查
/src/models/ @dba-team
```

### 5.3 PR 模板

```markdown
## 变更描述

<!-- 简要描述本次变更 -->

## 变更类型

- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 性能优化
- [ ] 文档更新

## 测试方法

<!-- 描述如何测试 -->

## 检查清单

- [ ] 自测通过
- [ ] 添加了测试用例
- [ ] 更新了文档
- [ ] 无安全风险
```

## 6. 团队最佳实践

### 6.1 PR 粒度控制

```
理想 PR: 200-400 行变更
可接受:  400-800 行（需说明原因）
需拆分:  > 800 行

拆分策略:
1. 按功能模块拆分
2. 先基础设施，后业务逻辑
3. 先数据层，后 UI 层
```

### 6.2 Review 时效

| PR 优先级 | 期望 Review 时间 |
| --------- | ---------------- |
| 紧急修复  | < 1 小时         |
| 普通功能  | < 4 小时         |
| 重构优化  | < 1 个工作日     |

### 6.3 避免 Review 瓶颈

1. **多审查者**：每个模块至少 2-3 人可审查
2. **轮转机制**：避免审查任务集中在个别人
3. **Review 时间块**：每天固定时间集中 Review
4. **自动化前置**：CI 不通过的 PR 不进入 Review 队列

### 6.4 常见反模式

| 反模式          | 问题                 | 解决方案                     |
| --------------- | -------------------- | ---------------------------- |
| 橡皮图章 Review | 审查流于形式         | 要求逐行评论                 |
| Review 拖延     | PR 长时间无人审查    | 设置 SLA，超时自动提醒       |
| 大 PR 恐惧      | 审查者回避大 PR      | 强制拆分，限制 PR 大小       |
| 无休止的讨论    | 在 PR 中争论设计决策 | 设计讨论应在 PR 之前完成     |
| 只审查新代码    | 忽略上下文           | 审查者需理解变更的完整上下文 |
