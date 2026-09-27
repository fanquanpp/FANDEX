# 质量门禁（quality-gate）

## 1. 自动门禁（CI 阻断/告警）

| 检查 | 工具 | 级别 |
| --- | --- | --- |
| frontmatter 合法性、title 非空、THIN_BODY、非标准字段 | content-audit.mjs | HIGH 阻断 |
| 学习路径 schema、引用存在性、缺口清单、**路径孤儿（反向覆盖率）** | audit-learning-path.mjs | FAIL/WARN |
| content-sync 死链清洗、模块注册、托管字段补全 | content-sync.mjs | 构建前强制 |
| 设计令牌漂移 | check-tokens-drift.mjs | CI 门禁 |

## 2. 人工门禁（每批改动后逐项过）

写完一篇/一批文档后，回答这 20 个验收问题（全部通过才算完成）：

1. 零基础学生能读懂吗？2. 学生知道为什么学它吗？3. 知道它解决什么问题吗？4. 代码运行了吗？5. 代码被修改了吗？6. 有主动思考环节吗（预测题）？7. 会遇到错误吗？8. 学到调试方法了吗？9. 有练习吗？10. 有迁移场景吗？11. 看到真实开发应用了吗？12. 知道何时用吗？13. 知道何时不该用吗？14. 能顺着链接查官方文档吗？15. 能脱离示例自己实现吗？16. 与前后章建立联系了吗？17. 事实经过官方来源验证吗？18. 有过时技术吗？19. 与已有文档重复吗？20. 有凑字数内容吗（有则删）？

## 3. 批次流程

每批改动（一个模块或一组文档）：

1. `node app-web/scripts/content-sync.mjs --check` 预检；
2. `pnpm --filter @fandex/web audit:content` 确认无 HIGH；
3. `node app-web/scripts/audit-learning-path.mjs` 确认 0 孤儿、0 缺口；
4. `pnpm --filter @fandex/web typecheck` 与 `pnpm --filter @fandex/web test:smoke`；
5. 在 docs/audit/change-report-<日期>.md 追加本批变更记录；
6. 回写 document-migration-map.md 的处置状态。

## 4. 质量与数量的分离

- 文档字数、篇数不作为任何指标；KEEP 是合法且受鼓励的处置结果；
- 禁止为过门禁而写的仪式性内容（形式化定义、附录速查表、版本时间线）；
- 真正的指标只有一个：学生学完能否实际使用刚学到的东西。

## 5. 验收测试（Phase 7）

- **假学生测试**：沿 start → roadmap → 主线语言路径逐篇走查，验证零断层、可运行、有练习；
- **企业模拟测试**：拿一个陌生 GitHub 仓库（优先作者自有仓库），按 clone → 装依赖 → 运行 → 读 README → 改功能 → 跑测试 → 提交流程对照课程覆盖；
- **脱离教程测试**：每模块出口项目必须含无提示挑战题。
