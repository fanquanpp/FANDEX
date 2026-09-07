# 贡献指南（Contributing）

感谢你考虑为 FANDEX 做出贡献。本文档说明提交流程与必须遵守的规范；工程细节与
文档 frontmatter 字段约束以 [AGENTS.md](AGENTS.md) 为准。

## 贡献方式

- **修正内容错误**：文档中的技术错误、代码示例问题、死链，欢迎直接提交修复；
- **补充知识点**：在现有模块内新增文档，或在现有文档中扩充内容；
- **报告问题**：不便于直接修复的问题，请提交 Issue 并附上复现方式或截图。

## 提交流程

1. Fork 本仓库（外部贡献者）或从最新 `main` 拉取；
2. 创建特性分支，命名遵循 `feat/<描述>`、`fix/<描述>`、`docs/<描述>`、
   `refactor/<描述>` 等前缀，全部小写中划线分隔；
3. 完成修改并自测（见下方自检清单）；
4. 提交 Pull Request 到 `main` 分支，描述中说明变更目的、范围与自测结果。

## 提交信息规范

遵循 Conventional Commits：

```
<type>(<scope>): <描述>

<正文：说明动机与影响，可选>

<footer: 关联 Issue 等，可选>
```

- `type`：feat / fix / docs / refactor / chore / ci / perf / test；
- 描述使用中文、动词开头、结尾不加句号；
- 示例：`fix(content): 修正 go 模块并发章节的代码示例错误`。

## 内容文档规范（重点）

内容维护遵循「作者只写内容，元数据自动补全」：构建与 CI 会先运行
`content-sync.mjs` 自动补全 frontmatter 托管字段、注册新模块、清理死链。
作者只需遵守：

1. **文件命名**：文档 `NNN-EnglishName.md` 放入 `<NNN-模块id>/` 文件夹，
   文件名编号即学习顺序；新增模块文件夹时可省略编号（自动分配）；
2. **frontmatter**：推荐手写 `title` 与 `description`，其余字段可省略
   （`order` / `module` / `category` / `author` / `updated` 由 sync 自动
   生成，勿手写）；仅允许 AGENTS.md 规定的 10 个标准字段；
3. **引用格式**：`related` 与 `prerequisites` 写 `module/文件名`（不带
   扩展名），死链会被自动删除；
4. **新增模块**：模块文件夹内写 `module.json` 声明模块信息（schema 见
   AGENTS.md），缺失时 sync 会生成骨架，请补写完善；
5. **禁止 emoji**；图形需求使用 Mermaid 或 SVG；代码块必须标注语言；
6. **单一来源**：内容只写入 `cnt-content/full`，不修改三端应用内的生成产物
   （assets 目录），构建时由管线自动同步。

## 自检清单

提交前请确认：

- [ ] 文档放入正确的模块文件夹，文件名编号符合学习顺序；
- [ ] `title` / `description` 已填写（其余字段可不写）；
- [ ] 代码示例语法正确、已标注语言；
- [ ] 本地跑过 `pnpm sync`（或直接 `pnpm build:web`）且无报错；
- [ ] 无 emoji、无构建产物入库；
- [ ] 提交信息符合 Conventional Commits。

## 行为准则

保持友善与建设性：讨论针对内容与技术本身，尊重不同背景的学习者。恶意行为将被
移除并限制参与。
