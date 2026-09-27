# 技术事实验证标准（technical-verification-standard）

## 1. 必须联网验证的事实清单

写入文档前必须核对官方来源的事实：版本号与版本状态（Active LTS / Maintenance / EOL）、API 签名与弃用状态、默认行为变更、安全建议（密码哈希算法、TLS 配置）、性能数字、兼容性矩阵。训练数据里的记忆一律视为待验证假设。

## 2. 来源优先级

1. 官方文档与标准（python.org、MDN、nodejs.org、react.dev、dev.mysql.com、ECMA/WHATWG/W3C、RFC）；
2. 官方 GitHub（release notes、issues、migration guides）；
3. 权威开放课程与工程实践仓库（许可合规名单见 code-example-standard.md）；
4. 社区资料（Stack Overflow 等）只用于发现真实问题与常见坑，不得作为事实出处。

禁止来源：SEO 内容农场、营销博客、过时采集站。禁止参照中国教材体系内容（用户约束）。

## 3. 验证记录

- 关键版本事实在变更报告（docs/audit/change-report-*.md）中登记：结论、来源 URL、验证日期；
- 文档内联标注方式：版本敏感处直接写「截至 2026-09，Node 24 为 Active LTS」式陈述，让读者知道时效边界；
- 每季度复核一次「版本敏感文档清单」（react/nextjs/vue3/tailwind/vite/astro/node/python/mysql），入口在本文档维护。

## 4. updated 字段纪律

`updated` 由 content-sync 依据 git 提交日期自动维护（取较大值），手写不生效。时效性判断不要依赖该字段，依赖文档内的「截至 YYYY-MM」陈述与本标准的季度复核。

## 5. 弃用表达规范

涉及弃用技术时区分四档并明确写出：

- Deprecated（官方弃用，给替代）；
- Legacy（仍在维护但不推荐新项目）；
- Maintenance LTS（仅存量项目使用，如 Node 22 之于 2026-09）；
- 仅历史对比（明确标注「仅用于理解演进」）。

速查卡（cnt-content/syntax/）中被弃用的语法条目必须在代码注释里带一行弃用提示（如 var 条目）。
