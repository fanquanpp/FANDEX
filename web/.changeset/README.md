# Changesets 流程说明

本目录由 `@changesets/cli` 自动生成，用于管理 FANDEX-web 仓库的版本变更与发布追踪。

## 工作流概览

Changesets 采用「先声明、后合并」的发布模型：每次有意义的变更须在 PR 中附带一个 changeset 文件，描述变更类型与摘要；合并至 `main` 后由 `changeset version` 统一消费这些声明，更新 `package.json` 与 `docs/CHANGELOG.md`。

## 添加 Changeset

在本地工作区执行：

```bash
npm run changeset
```

CLI 会交互式询问：

1. **变更类型**（影响版本号）
   - `patch`：错误修复、文档勘误（`1.1.0` → `1.1.1`）
   - `minor`：向后兼容的新功能、新文档模块（`1.1.0` → `1.2.0`）
   - `major`：破坏性变更（`1.x.x` → `2.0.0`）
2. **变更摘要**：用简体中文一句话描述本次变更，将写入 CHANGELOG

执行完毕后会在 `.changeset/` 下生成形如 `random-words.md` 的 changeset 文件，将其与业务代码一同提交至 PR。

## Changeset 文件格式

```markdown
---
'fandex': minor
---

新增 SVG 模块，归入 dev-lang 分类，前置依赖 html5。
```

- 顶层 frontmatter 声明包名与变更级别
- 正文为变更摘要，将原样写入 `docs/CHANGELOG.md`

## 合并与发布

- PR 合并至 `main` 后，维护者执行 `npm run changeset:version`
- 该命令消费所有 changeset 文件，自动更新 `package.json#version` 与 `docs/CHANGELOG.md`
- changeset 文件在版本号更新后被自动删除

## 与项目版本规则的对齐

本项目在 `README.md` 中定义了三档版本规则：

| 级别       | 版本号变化         | Changesets 对应 | 适用场景                            |
| :--------- | :----------------- | :-------------- | :---------------------------------- |
| 大版本更新 | `1.x.x` -> `2.x.x` | `major`         | 新模块、新功能、新页面增加及重构    |
| 小更新     | `1.0.x` -> `1.1.x` | `minor`         | 小 BUG 修复、文档纠错、按钮位置调整 |
| 补丁修复   | `1.x.0` -> `1.x.1` | `patch`         | 同一问题或其所属范围内的多次修复    |

## 配置参考

- 配置文件：`.changeset/config.json`
- Changelog 生成器：`@changesets/changelog-github`（自动关联 GitHub PR 与作者）
- 基础分支：`main`
- 访问级别：`public`（开源仓库）

完整文档参见 [changesets 官方仓库](https://github.com/changesets/changesets)。
