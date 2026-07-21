---
order: 40
tags:
  - github
difficulty: intermediate
title: 协作开发规范
module: github
category: 'GitHub Advanced'
description: '协作开发规范：Commit Message、PR 模板、代码审查清单、CLA/DCO 合规。'
author: Anonymous
related:
  - 'github/仓库创建-克隆-归档-删除'
  - github/SSH与HTTPS远程配置
  - github/README文件
  - github/分支模型与分支保护规则
prerequisites:
  - github/GitHub概述
---

## 1. 背景

规模化协作依赖 **可检索的提交历史**、**可执行的审查流程** 与 **法律层面的贡献授权**。**Conventional Commits（约定式提交）** 广泛用于生成 **CHANGELOG**；**PR 模板** 减少来回询问；**CLA（贡献者许可协议）** 与 **DCO（开发者来源证书）** 用于明确 **IP（知识产权）** 归属。

## 2. Commit Message 约定

### 2.1 标准格式

```
 <type>(<scope>): <subject>
 <body>
 <footer>
```

### 2.2 类型说明

| 类型     | 描述                               | 示例                                         |
| -------- | ---------------------------------- | -------------------------------------------- |
| feat     | 新功能                             | `feat(auth): add refresh token rotation`     |
| fix      | 修复 bug                           | `fix(api): handle 429 from upstream`         |
| docs     | 文档更新                           | `docs(readme): clarify install steps`        |
| style    | 代码风格（格式调整，不影响功能）   | `style: format code with prettier`           |
| refactor | 代码重构（不添加功能，不修复 bug） | `refactor: extract common utility functions` |
| test     | 测试相关                           | `test: add unit tests for auth module`       |
| chore    | 构建过程或辅助工具变动             | `chore: update dependencies`                 |
| perf     | 性能优化                           | `perf: optimize database query`              |
| revert   | 回滚更改                           | `revert: revert commit abc123`               |

### 2.3 作用域（Scope）

- 可选，用于指定变更的模块或组件
- 建议使用语义化的模块名称，如 `auth`、`api`、`ui` 等

### 2.4 主题（Subject）

- 简短描述变更内容（不超过 50 个字符）
- 使用祈使句（如 "add" 而非 "added"）
- 英文小写开头（团队可统一使用中文）
- 结尾不要加句号

### 2.5 正文（Body）

- 可选，详细描述变更内容
- 每行不超过 72 个字符
- 说明变更的原因和影响

### 2.6 页脚（Footer）

- 可选，包含以下信息：
- **Breaking Change**：使用 `BREAKING CHANGE:` 前缀说明破坏性变更
- **关联 Issue**：使用 `Closes #123` 或 `Resolves #123` 关联相关 Issue
- **DCO 签名**：使用 `Signed-off-by: Name <email@example.com>` 进行 DCO 签名

### 2.7 示例

```text
 feat(auth): add refresh token rotation
 Implement refresh token rotation to improve security.
 this change requires clients to handle token rotation properly.
 breakING CHANGE: Clients must now handle refresh token rotation.
 Closes #456
 Signed-off-by: John Doe <john@example.com>
```

### 2.8 工具支持

- **commitizen**：交互式提交信息生成工具
- **commitlint**：提交信息验证工具
- **standard-version**：基于提交信息生成 CHANGELOG

## 3. PR 模板配置

### 3.1 创建 PR 模板

在仓库根目录创建 `.github/pull_request_template.md` 文件：

```markdown
## 背景

简要描述本次 PR 的背景和目的。

## 关联 Issue

-
-

## 变更说明

-
-
-

## 实现细节

-
-
-

## 测试

-
-
-

1. 步骤 1
2. 步骤 2

## 检查清单

-
-
-
-
-

## 其他说明

如有其他需要说明的内容，请在此处补充。
```

### 3.2 分支命名规范

```
 <type>/<description>
```

- **type**：feat、fix、docs、refactor 等
- **description**：简短描述分支目的
  示例：
- `feat/add-login`
- `fix/api-error-handling`
- `docs/update-readme`

### 3.3 PR 标题规范

```
 <type>(<scope>): <subject>
```

与 Commit Message 格式一致，便于自动生成 CHANGELOG。

### 3.4 PR 描述最佳实践

- 清晰描述变更内容和原因
- 提供测试步骤和预期结果
- 如有破坏性变更，明确说明
- 关联相关 Issue
- 如有需要，提供截图或演示链接

## 4. Code Review 流程

### 4.1 审查者职责

- 理解 PR 的目的和实现
- 检查代码质量和安全性
- 提供建设性反馈
- 确保测试覆盖充分
- 验证变更符合项目规范

### 4.2 审查清单

#### 4.2.1 正确性

- [ ] 代码逻辑正确
- [ ] 边界情况处理
- [ ] 错误处理完善
- [ ] 并发安全
- [ ] 事务一致性

#### 4.2.2 安全性

- [ ] 无注入漏洞
- [ ] 无路径遍历
- [ ] 无敏感信息泄露
- [ ] 依赖无安全漏洞（使用 Dependabot）
- [ ] 权限控制正确

#### 4.2.3 可维护性

- [ ] 代码风格一致
- [ ] 命名规范
- [ ] 注释充分
- [ ] 无重复代码
- [ ] 模块化设计

#### 4.2.4 性能

- [ ] 无性能瓶颈
- [ ] 无 N+1 查询
- [ ] 资源使用合理
- [ ] 缓存策略适当

#### 4.2.5 测试

- [ ] 单元测试覆盖
- [ ] 集成测试覆盖
- [ ] 测试用例合理

### 4.3 审查反馈类型

- **必须修改**：代码存在严重问题，必须修复
- **建议修改**：代码可以改进，建议优化
- **疑问**：对代码有疑问，需要作者解释
- **赞赏**：代码写得好，值得肯定

### 4.4 审查流程

1. **分配审查者**：使用 CODEOWNERS 自动分配或手动指定
2. **初步审查**：检查 PR 描述和变更范围
3. **代码审查**：逐行审查代码
4. **测试验证**：运行测试确保无回归
5. **反馈沟通**：提供反馈并等待作者修改
6. **最终批准**：确认所有问题已解决
7. **合并 PR**：选择合适的合并策略

## 5. CLA 与 DCO

### 5.1 CLA（贡献者许可协议）

#### 5.1.1 什么是 CLA

CLA 是贡献者与项目所有者之间的法律协议，明确贡献的知识产权归属，保护项目和贡献者双方的权益。

#### 5.1.2 类型

- **个人 CLA**：适用于个人贡献者
- **企业 CLA**：适用于企业员工代表公司贡献

#### 5.1.3 配置

1. **选择 CLA 工具**：

- **CLA Assistant**：GitHub App，自动管理 CLA 签署
- **CLA Hub**：另一个流行的 CLA 管理工具

2. **配置步骤**：

- 安装 CLA Assistant GitHub App
- 创建 CLA 文档
- 在仓库中配置 CLA 检查

### 5.2 DCO（开发者来源证书）

#### 5.2.1 什么是 DCO

DCO 是一种轻量级的贡献者协议，通过在提交信息中添加 `Signed-off-by` 行来确认贡献者有权提交代码。

#### 5.2.2 配置

1. **启用 DCO 检查**：

- 使用 `actions/dco` GitHub Action
- 在 `.github/workflows/dco.yml` 中配置

2. **DCO 工作流**：

- 贡献者使用 `git commit -s` 签署提交
- DCO Action 验证每个提交是否有签名
- 无签名的提交将导致 CI 失败

### 5.3 CLA 与 DCO 对比

| 特性       | CLA                | DCO                |
| ---------- | ------------------ | ------------------ |
| 复杂度     | 高                 | 低                 |
| 法律约束力 | 强                 | 中等               |
| 实施难度   | 中等               | 低                 |
| 适用场景   | 大型项目、企业项目 | 开源项目、小型项目 |

## 6. 团队协作规范

### 6.1 分支管理

- **main/master**：主分支，保持稳定可发布状态
- **develop**：开发分支，集成新功能
- **feature/**：功能分支，开发新功能
- **fix/**：修复分支，修复 bug
- **release/**：发布分支，准备发布
- **hotfix/**：热修复分支，紧急修复生产问题

### 6.2 代码风格

- **统一代码风格**：使用 ESLint、Prettier 等工具
- **编码规范**：制定团队编码规范文档
- **代码审查**：确保代码符合风格要求

### 6.3 文档规范

- **README.md**：项目概述、安装、使用说明
- **CONTRIBUTING.md**：贡献指南
- **CODE_OF_CONDUCT.md**：行为准则
- **SECURITY.md**：安全漏洞上报流程
- **API 文档**：使用 JSDoc、Swagger 等工具生成

### 6.4 会议规范

- **站会**：每日 15 分钟，同步进度和问题
- **评审会**：定期代码评审会议
- **规划会**： Sprint 规划和回顾
- **技术分享**：定期技术分享会议

## 7. 常见问题与解决方案

### 7.1 Commit Message 问题

- **问题**：提交信息不规范
- **解决方案**：

1.  使用 commitizen 工具生成规范的提交信息
2.  配置 commitlint 进行提交信息验证
3.  定期代码审查时检查提交信息

### 7.2 PR 审核延迟

- **问题**：PR 审核不及时
- **解决方案**：

1.  明确审核责任和时间要求
2.  使用 CODEOWNERS 自动分配审核者
3.  建立审核优先级机制

### 7.3 DCO 签名缺失

- **问题**：提交缺少 DCO 签名导致 CI 失败
- **解决方案**：

1.  使用 `git commit -s` 重新提交
2.  对历史提交使用 `git rebase --signoff` 签名
3.  配置 Git 客户端默认使用 `-s` 选项

### 7.4 合并冲突

- **问题**：PR 合并时出现冲突
- **解决方案**：

1.  及时同步上游分支
2.  使用 `git rebase` 解决冲突
3.  小批量提交减少冲突概率

### 7.5 代码质量问题

- **问题**：代码质量不符合要求
- **解决方案**：

1.  建立代码质量标准
2.  使用静态代码分析工具
3.  加强代码审查力度

## 8. 实际应用案例

### 8.1 开源项目

- **Vue.js**：使用 Conventional Commits 和 DCO
- **React**：使用 PR 模板和 CODEOWNERS
- **Node.js**：使用 CLA 和严格的代码审查

### 8.2 企业项目

- **大型电商平台**：使用 Git Flow 分支管理和 CLA
- **SaaS 产品**：使用 GitHub Actions 自动化测试和部署
- **金融系统**：使用严格的代码审查和安全检查

## 9. 工具集成

### 9.1 GitHub 工具

- **GitHub Actions**：自动化测试、构建和部署
- **Dependabot**：自动更新依赖
- **Code Scanning**：代码安全扫描
- **Secret Scanning**：敏感信息扫描

### 9.2 第三方工具

- **SonarQube**：代码质量分析
- **Snyk**：依赖安全扫描
- **Jira**：项目管理和 Issue 跟踪
- **Slack**：团队沟通和通知

## 10. 最佳实践总结

- **统一规范**：制定并执行统一的协作规范
- **自动化**：使用工具自动化流程和检查
- **透明沟通**：保持团队沟通透明和及时
- **持续改进**：定期回顾和优化协作流程
- **尊重贡献者**：感谢和尊重每一位贡献者

## 11. 延伸阅读

- [Conventional Commits](https://www.conventionalcommits.org/) <!-- nofollow -->
- [GitHub 协作指南](https://docs.github.com/en/github/collaborating-with-pull-requests) <!-- nofollow -->
- [Code Review 最佳实践](https://google.github.io/eng-practices/review/) <!-- nofollow -->
- [CLA 与 DCO 比较](https://opensource.guide/legal/#contributor-license-agreements) <!-- nofollow -->
- [Git 分支管理策略](https://nvie.com/posts/a-successful-git-branching-model/) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加更详细的 Commit Message 约定、PR 模板的详细配置和使用指南、Code Review 的详细流程和最佳实践、CLA 和 DCO 的详细说明和配置、团队协作的其他规范、常见问题的详细解决方案、实际应用案例和与其他协作工具的集成。
