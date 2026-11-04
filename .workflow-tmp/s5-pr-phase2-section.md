---

# 第 2 期：构建期「内容后端 → 站点前端」分离（数据层 + 性能批次）

本 PR 在第 1 期「仪器面板」之上叠加第 2 期四个功能提交与本轮收尾（提交
e8db0872 → 188137cc，另含本轮 S5 收尾改动）。分步明细：

## S1 数据产物层与增量缓存（e8db0872）

- 新建 `app-web/scripts/lib/data-cache.mjs` 缓存基座：仓库根
  `node_modules/.cache/fandex-data/` 为产物唯一真源（内容哈希键 + manifest
  版本化），发布通道写入按内容字节跳写（writeIfChanged），生产者统一
  `--check`（零写入报待算项）与 `--rebuild`（全量）CLI 约定。
- content-sync：git 日期统计改 `headAtBuild..HEAD` 区间增量（merge-base
  祖先校验失败即回退全量；区间结果与缓存按 max 合并，防 merge 送入早日期
  提交把文档「更新于」降级）。
- build-stats：doc-index / doc-stats 共享键 `sha256({totals, sortedRecords})`
  （totals 与记录数组必须同键防漏失效），移除 generatedAt 时间戳字段，
  新增 `public/data/doc-index/{module}.json` 每模块分块。
- build-syntax：按语言分块缓存，键含该语言全部 md 全文 + modules.json 完整
  切片 + categoryColors + shiki 版本 + PRODUCER_VERSION。
- 新脚本 `build-learning-path.mjs`：学习路径解析产物 base 中立（不烘 href，
  web / 桌面 DESKTOP_BUILD 双构建共享缓存），SSR 侧仅做 docRef → href 拼接。
- 派生产物全部移出 git 索引（git rm --cached + `app-web/.gitignore` 三条
  精确模式，禁用递归 glob 防 src/data/ 下被跟踪源码误伤）；deploy.yml 在
  typecheck 前补 build-syntax / build-learning-path 显式步（fresh checkout
  缺产物 TS2307 防线）。

## S2 web 消费接线（d5831c08）

- `src/lib/learning-path.ts` 由 48 张地图 + 全量 doc-index 的静态 import
  改读单份产物，调用点签名与岛 props 契约零变更。
- SidebarModules 岛去全量索引内联：SSR counts props 判定「有文档」，展开
  模块时才 fetch 该模块分块，失败显示重试行；「全部模块」面板首开不再
  拉约 70KB gz 的全量索引。

## S3 代码块 SSR 化与 Shiki transformers（8c1b344d，第 1 期规格 2.6 遗留）

- 新增 `rehype-wrap-code-blocks` 插件：figure.code-block 框架 + meta title
  头栏 + copy 按钮 SSR 直出（关 JS 可复制语义保留为按钮存在）；shikiConfig
  挂 transformerMetaHighlight / diff / focus 与自定义 title transformer；
  删除 layout-interactions 的客户端 DOM 改写段（客户端 JS 净减），保留
  事件委托与 copied 反馈。

## S4 运行时批次（188137cc）

- ThemeToggle / WebVitalsTracker 由 React 岛改 vanilla 模块（theme-toggle.ts
  +157 / web-vitals.ts +85，两个 .tsx 岛删除）：island 挂载点 6 → 4，文档页
  首屏静态 JS 图不再携带 react-dom 调度器。
- IBM Plex Sans 补 size-adjust metric fallback（fonts.css +50）。

## S5 CI 缓存持久化 + 门禁增补收尾（本轮）

- deploy.yml 与 lighthouse.yml 各加 actions/cache@v4 持久化 mermaid-dual
  渲染缓存（path=`node_modules/.cache/mermaid-dual`，key=`mermaid-<sha>`，
  restore-keys=`mermaid-` 前缀回退，restore 步插在依赖安装后；数据前置链步
  保持 S1 落位不动）。部署构建对 1033 张图 x2 主题不再全量重渲，只有新增/
  变更图真正渲染；lighthouse 工作流不装 Chromium，靠缓存直读，不再量到
  客户端渲染退化页。
- qa-check.mjs 新增「Dimension 7: Data Pipeline Freshness」产物新鲜度门禁：
  以零写入子进程运行 content-sync / build-stats / build-syntax /
  build-learning-path 四个生产者的 `--check`，任一非零退出（待算项 > 0）
  即 fail 并附「先跑 pnpm dev 或数据前置链」指引；qa 侧不重新推导缓存键，
  键逻辑保持生产者单份。
- README「数据产物层」架构说明与维护要点兜底条目、CHANGELOG 第 2 期
  变更/性能段落。

## 第 2 期实测记录（S5 收尾会话执行）

- 四生产者 `--check` 热缓存全 0 待算：content-sync 1499ms / build-stats
  818ms / build-syntax 724ms / build-learning-path 182ms；数据前置链热态
  content-sync 537ms + build-syntax 108ms（其余命中跳写）。
- qa 新门禁正反验证：删发布通道 `src/data/doc-stats.json` → qa exit 1
  （build-stats 待重建 + 指引行）；人为改一篇 frontmatter order → qa exit 1
  （content-sync 报 1 处补全 + build-stats inputsHash 失效）；重跑数据前置链
  后两次均恢复 exit 0。
- mermaid 缓存恢复模拟（actions/cache 语义）：热缓存 `render-mermaid --check`
  待渲染 0/0 → 移除缓存目录后 1033/1033 → 还原后 0/0（2066 个 SVG 完整），
  即缓存命中后的 CI 目标态。
- 两个 workflow YAML parse 校验通过（cache 步位置与参数断言在档）；
  eslint 定向 qa-check.mjs 0 错。

## 第 2 期边界与遗留

- CI 侧「restore size > 0 且 render-mermaid 段待渲染近 0」以 Actions 日志为
  验收口径，本轮会话不推送、未跑 CI，留合并后首跑核对。
- 分支仍跟踪 `.workflow-tmp` 1552 个与 app-web 下 235 个临时文件（第 1 期
  遗留项，本会话实测 `git ls-files` 计数，合并前需移出并补 gitignore）。
- 客户端运行时依赖净增 0（@shikijs/transformers 为 devDependency）；TS /
  mermaid 大版本未动；astro.config.ts output 配置行与 mermaid 钉死项未动。
