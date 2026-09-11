---
order: 140
title: Emoji 表情
module: 'markdown'
category: 工具链
difficulty: beginner
description: Markdown 中使用 Emoji 的两种方式：GitHub 短代码与 Unicode 字符，及其平台兼容性。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/110-GitHubFlavoredMarkdown'
  - 'markdown/130-AutoLink'
  - 'markdown/170-TaskList'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **认知导入（Layer 0 生存层）**
> 前置知识：无需前置。
> 边界说明：Emoji 不是 Markdown 语法，而是文本内容的扩展支持——短代码（`:smile:`）是 GitHub 等平台的渲染功能，Unicode 字符（直接粘贴的表情）则任何文本环境都能存储。
> 强制练习：在 GitHub 的 Issue 里分别输入 `:smile:` 和直接粘贴一个笑脸字符，对比两者在"未渲染源码"时的样子。

## 1. 两种使用方式

| 方式 | 语法 | 渲染前 | 渲染后 | 支持范围 |
| :--- | :--- | :--- | :--- | :--- |
| 短代码 | `:smile:` | 可读的英文单词 | Emoji 图形 | GitHub、GitLab 等平台 |
| Unicode 字符 | 直接输入表情 | 就是表情本身 | 表情本身 | 通用（与 Markdown 无关） |

短代码的本质是平台的字符串替换：渲染时把 `:smile:` 替换为对应 Unicode 表情。它的优势是**源码可读、跨键盘可输入**；劣势是只在支持的平台生效。Unicode 字符则"写进去是什么就是什么"，不依赖任何渲染器，但输入依赖输入法。

类比：短代码像餐厅菜单上的"招牌菜A"，端上桌才变成真菜；Unicode 是把菜直接端到你面前。

## 2. GitHub 短代码语法

### 2.1 基本用法

短代码以冒号包裹英文短名（gemoji 命名）：

```markdown
今天天气真好 :sunny: :smile:

:tada: 项目发布成功！

:warning: 注意：此 API 已废弃
```

在 GitHub 的 Issue、PR、评论、README 等位置输入 `:` 会弹出自动补全列表，可以边输边选。

### 2.2 常用短代码速查

以下短代码在 GitHub/GitLab 上均有效（渲染结果即对应表情）：

**状态与标记**

| 短代码 | 含义 | 典型用途 |
| :--- | :--- | :--- |
| `:white_check_mark:` | 白色对勾 | 完成、通过 |
| `:x:` | 叉号 | 失败、错误 |
| `:warning:` | 警告三角 | 警告提示 |
| `:bulb:` | 灯泡 | 提示、想法 |
| `:construction:` | 施工牌 | 建设中、未完成 |
| `:bookmark:` | 书签 | 标记 |

**技术场景（Gitmoji 常用）**

| 短代码 | 含义 | 典型用途 |
| :--- | :--- | :--- |
| `:tada:` | 礼花 | 初始提交 |
| `:sparkles:` | 闪光 | 新功能 |
| `:bug:` | 虫子 | 修复缺陷 |
| `:memo:` | 备忘录 | 文档更新 |
| `:recycle:` | 循环箭头 | 重构 |
| `:zap:` | 闪电 | 性能优化 |
| `:lock:` | 锁 | 安全修复 |
| `:arrow_up:` | 上箭头 | 依赖升级 |
| `:lipstick:` | 口红 | UI 与样式 |
| `:white_check_mark:` | 对勾 | 测试相关 |

完整列表见 GitHub 官方短代码页（gemoji 清单），或输入 `:` 时查看自动补全。

### 2.3 Gitmoji：用 Emoji 标注提交类型

Gitmoji 是社区约定的提交信息前缀方案，把表情当作提交类型的可视标签：

```bash
git commit -m ":sparkles: feat: add user authentication"
git commit -m ":bug: fix: resolve login redirect loop"
git commit -m ":memo: docs: update API reference"
```

注意与本仓库规范对照：FANDEX 采用 Conventional Commits（`feat(scope): 中文描述`），不使用 Gitmoji 前缀；两者选其一并在团队内统一即可。

## 3. Unicode 字符方式

### 3.1 直接输入

任何能输入 Unicode 的环境（输入法表情面板、系统 emoji 选择器——macOS 为 Ctrl+Cmd+空格、Windows 为 Win+句号）都可以直接插入表情字符。存入 `.md` 文件后与普通字符无异，**所有**渲染器都能显示。

### 3.2 编码与 HTML 实体

每个 Emoji 对应一个或多个 Unicode 码点，HTML 实体写法在支持 HTML 的 Markdown 中也能渲染：

| 字符描述 | 码点 | HTML 实体 |
| :--- | :--- | :--- |
| 微笑（U+1F604） | U+1F604 | `&#x1F604;` |
| 红心（U+2764） | U+2764 | `&#x2764;` |
| 火箭（U+1F680） | U+1F680 | `&#x1F680;` |
| 对勾（U+2705） | U+2705 | `&#x2705;` |

### 3.3 组合表情（ZWJ 序列）

多个表情可以用零宽连接符（ZWJ, U+200D）组成复合表情，例如"女性 + 电脑"组合出"女程序员"。直接复制组合字符即可使用，无需手写 ZWJ。

## 4. 平台支持对照

| 平台 | 短代码 | 说明 |
| :--- | :--- | :--- |
| GitHub | 支持 | gemoji 全集，输入自动补全 |
| GitLab | 支持 | 与 GitHub 命名大体兼容，个别短名不同 |
| Obsidian | 不转换短代码 | 直接输入 Unicode 字符；插件可扩展 |
| Typora | 部分支持 | 建议直接输入 Unicode |
| Hugo | 需配置 | 站点配置中设置 `enableEmoji = true` 后支持短代码 |
| CommonMark | 无此功能 | 短代码是平台渲染功能，不是语法规范 |

渲染风格差异也值得知道：同一码点在 Apple、Windows、Android 上字形不同（圆扁、配色差异），这是客户端字体决定的，Markdown 文档无法控制；极老环境可能显示为黑白轮廓甚至方框。

## 5. 最佳实践

1. **适度使用**：标题与列表中少量表情可以提升扫读效率，正文段落里大面积使用会降低专业感。
2. **优先短代码还是 Unicode**：内容只发布在 GitHub/GitLab 时短代码源码可读性更好；内容需要跨平台分发时用 Unicode 字符，保证"到哪里都能显示"。
3. **可访问性**：屏幕阅读器对表情的朗读质量参差，关键信息（状态、结论）必须有文字承载，表情只做辅助标记。
4. **遵守团队规范**：代码提交、正式技术文档是否允许 Emoji 以团队约定为准（本仓库约定代码与提交信息不使用表情）。

## 小结

- 初学者要点：两种方式——`短代码`（GitHub/GitLab 渲染）与直接输入 Unicode 字符（通用）；输入 `:` 利用 GitHub 自动补全找表情。
- 进阶注意：短代码是平台功能不是 Markdown 语法，Obsidian/Hugo（需开配置）等环境不转换；Unicode 表情跨平台显示但字形由客户端决定；组合表情由 ZWJ 连接；正式文档中表情只做辅助，不承载关键信息。
