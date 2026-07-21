# FANDEX-Web Phase 0.2 现状基线审计报告索引

> 生成时间：2026-07-18  
> 审计阶段：Phase 0.2 现状基线  
> 项目：FANDEX-Web v1.1.0  
> Astro 版本：5.18.2

## 一、本目录文件清单

| 文件                 | 类型          | 用途                                                             |
| -------------------- | ------------- | ---------------------------------------------------------------- |
| `README.md`          | Markdown 索引 | 本说明文件，列出所有基线报告及其用途                             |
| `content-audit.txt`  | 原始日志      | `node scripts/content-audit.mjs` 的完整 stdout/stderr 输出       |
| `content-audit.json` | 结构化数据    | 内容质量审计的结构化指标（文档总数、模块数、问题分类等）         |
| `content-audit.md`   | 可读报告      | 内容质量审计的人读报告（含表格、关键发现、改进建议）             |
| `build-log.txt`      | 原始日志      | `npm run build` 的完整输出（含 prebuild、astro build、pagefind） |
| `build-metrics.json` | 结构化数据    | 构建指标（耗时、产物体积、HTML/JS/CSS 体积、警告）               |
| `tests.json`         | 结构化数据    | 测试结果（测试套件数、用例数、通过率、耗时）                     |
| `tests-raw.txt`      | 原始日志      | `npm run test` 的完整 vitest 输出                                |
| `lighthouse.json`    | 结构化数据    | Lighthouse 基线占位（已降级，待 Phase 3.7 集成）                 |

## 二、基线核心指标

| 维度     | 指标           | 基线值            |
| -------- | -------------- | ----------------- |
| 内容规模 | 文档总数       | 2013              |
| 内容规模 | 模块总数       | 52                |
| 内容规模 | 全文字符总量   | 13,373,319        |
| 内容规模 | 平均每篇字符数 | 6,643.48          |
| 内容质量 | 审计问题总数   | 1566              |
| 内容质量 | HIGH 严重度    | 0                 |
| 内容质量 | MEDIUM 严重度  | 643               |
| 内容质量 | LOW 严重度     | 923               |
| 构建性能 | 构建总耗时     | 152.86 秒         |
| 构建性能 | 产物总体积     | 435.06 MB         |
| 构建性能 | HTML 文件数    | 3782              |
| 构建性能 | JS 文件总体积  | 139.78 MB         |
| 构建性能 | CSS 文件总体积 | 0.19 MB           |
| 构建质量 | 警告数         | 8                 |
| 构建质量 | 错误数         | 19（非阻断）      |
| 测试     | 测试套件数     | 5                 |
| 测试     | 测试用例数     | 99                |
| 测试     | 通过数         | 99                |
| 测试     | 通过率         | 100.00%           |
| 测试     | 总耗时         | 604 ms            |
| 性能     | Lighthouse     | 待 Phase 3.7 集成 |

## 三、关键发现摘要

### 3.1 内容质量

- 无 HIGH 级阻断问题，CI 流水线可正常放行。
- `order` 字段缺失 466 篇（约 23%），是最大短板，影响模块内文档排序稳定性。
- `difficulty` 字段缺失 67 篇（约 3.3%）。
- 110 条 WIKILINK 警告中存在数学矩阵语法 `[[x, y]]` 误判，需优化审计脚本正则。
- 603 条 INTERNAL_LINK 警告中存在代码片段函数签名误判，需增强代码块识别。
- 320 篇长文档（>10000 字符）缺少『前置知识/学习目标』章节。

### 3.2 构建性能

- 构建总耗时 152.86 秒，与预期 147 秒基本一致。
- 8 个 csharp 模块文档因文件名包含 `#` 号被 glob-loader 误解析为路径分隔符，导致读取失败（ENOENT）。需修复文件名或调整 loader 配置。
- Pagefind 中文 stemming 不支持，但搜索功能仍可正常工作。
- 产物总体积 435 MB 偏大，JS 占 139.78 MB，需在后续阶段评估代码分割与按需加载。

### 3.3 测试

- 5 个测试套件、99 个用例全部通过，通过率 100%。
- 测试覆盖核心库（modules、code-runner、progress）与构建脚本（glossary-index、search-index）。
- 测试总耗时 604 ms，效率良好。

### 3.4 性能（Lighthouse）

- 已降级处理，待 Phase 3.7 集成 Lighthouse CI 后补全基线数据。
- 后续将通过 Playwright 或手动 Chrome DevTools 测量 Performance、Accessibility、Best Practices、SEO 四维度。

## 四、后续阶段对比基线

本目录所有报告作为 Phase 4 改进效果对比的基线。后续阶段变更须对照本基线衡量改进幅度：

- **Phase 1–3**：每阶段完成后，重新运行本基线审计流程，对比指标变化。
- **Phase 4**：最终验证阶段，对照本基线生成改进效果报告，量化改进幅度。

## 五、复现方式

如需复现本基线审计，执行以下命令序列：

```powershell
# 1. 内容审计
node scripts/content-audit.mjs

# 2. 构建审计
npm run build

# 3. 测试审计
npm run test

# 4. Lighthouse（待 Phase 3.7）
# npx lighthouse http://localhost:4321 --output=json --output-path=reports/baseline/lighthouse.json --chrome-flags="--headless"
```

## 六、附注

- 本基线审计未修改任何源代码或配置文件。
- 所有命令在 Windows PowerShell 环境下执行。
- 原始日志文件保留在同目录，便于后续追溯与深度分析。
- Lighthouse 基线测量待 Phase 3.7 集成。
