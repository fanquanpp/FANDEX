# 技术时效性与准确性风险审计（outdated-content）

- 勘察日期：2026-09-27（关键事实经 WebSearch 核对 2026-09 官方状态）
- 对象：1803 篇 full 文档 + 抽查 3 篇 syntax 文档
- 总评：该库整体技术水位很新（React 19 / Next 16 / Tailwind 4 / Vite 8 / Astro 7 / Vue 3.5+Vapor 展望 / Python 3.14 / MySQL utf8mb4 铁律），**无系统性过时教材问题**；风险集中在两处版本口径滞后与三个安全教学缺口。

## 1. updated 字段已失真（流程性风险）

全库 1803 篇 `updated` 字段全部为 2026-09（约 1663 篇集中在 09-12/13 批量生成，约 140 篇为 09-18 后人工重写）。git 历史证实内容实际创作于 2026-07 至 2026-09 之间。

问题：字段是统一刷写的，**不能作为时效性信号**。随时间推移会系统性失真。建议：`updated` 改为取「手写值与 git 最后修改日期的较大者」（content-sync 已有该机制雏形，需确认重写时是否真实更新），并在 audit 中增加「超过 N 个月未验证的版本敏感文档」预警。

## 2. 版本敏感内容核对表

| 模块/文档 | 仓库声明 | 2026-09 实况 | 风险 |
| --- | --- | --- | --- |
| 010-react | 全面基于 React 19（ref 作 prop、use()、Actions、React Compiler） | 19.3.0（2026-09-09） | 低 |
| 040-nextjs | 基于 Next 16；纠正 15+ params 为 Promise、fetch 默认不缓存旧认知 | 与官方一致 | 低 |
| 038-tailwind | 全面 Tailwind 4（CSS-first、@plugin、@utility） | v4 当前主版本线 | 低 |
| 036-vite | Vite 8 = Rolldown/Oxc | Vite 8 已发布 | 低 |
| 035-astro | 覆盖 Astro 6 与 7（2026-06） | 与时间线一致 | 低 |
| 009-vue3 | 「3.5.x 稳定；3.6 已进入 RC（Vapor）」 | 2026 年 3.6/Vapor 已趋稳定并获生态采用 | 低-中（表述可能落后一步，观望策略方向正确） |
| **007-javascript/520-NodeJsInstall.md、041-nestjs/240-MicroservicesAndHealth.md** | 推荐 Node 22 LTS | **Node 24 为 Active LTS（2026-10 转 Maintenance），Node 22 已是 Maintenance LTS** | **中**：新手主线装的是上一代 LTS |
| **032-python/020-PythonOverviewEnvSetup.md（第 546 行附近）** | 「推荐使用 Python 3.10+」 | 3.10 将于 2026-10 EOL；同模块 010 篇口径为「3.12+、3.14」 | **中**：同模块内部口径冲突，疑似旧模板残留 |

## 3. 已废弃实践排查结果

| 排查项 | 结果 | 风险 |
| --- | --- | --- |
| Vue2 语法（$on/$off、filters） | 未作为教学；移除被正确说明并给 mitt/Pinia 替代 | 低 |
| React class 组件 | 仅用于 ErrorBoundary（官方仍要求的形态） | 低 |
| var 声明 | 教学正文讲 hoisting 陷阱属合理；但速查卡将 var 与 let/const 并列为「基本写法」且无弃用提示（`007-javascript/040-VariableDataType.md` 约 987 行、`syntax/008-javascript/001-VariableDataType.md` 约 27 行） | 低-中：对零基础读者有误导空间 |
| Python 2 | 仅历史对比，明确「直接学 Python 3」 | 低 |
| MySQL utf8mb3 | 教材立场正确（一律 utf8mb4），是亮点 | 无 |
| Node fs 旧回调风格 | 仅出现在异步迁移指南附录 | 无 |
| requests verify=False | 已标注「错误：不安全」并给 certifi 修复 | 无 |
| HTTP 明文示例 | 均为内网/本地示例；仅 `025-networking/130-CurlHTTPRequest.md` 约 280 行代理传 user:pass 未提示明文凭据风险 | 低 |

## 4. 安全红旗清单（本次审计最重要的发现）

1. **`017-mysql/760-SQLInjectionDefenseStrategy.md`（中-高）**：所有「safe_login」示例都是 `WHERE username = %s AND password = %s` 的明文密码比对，全篇未提密码必须哈希存储——教了「防注入」却默认了「明文密码库」。对照 `002-markdown/330-PRCollaboration.md` 反而正确示范了 bcrypt。
2. **`032-python/360-SslCrypto.md`（中）**：纯速查体；`check_hostname = False`、`verify_mode = ssl.CERT_NONE` 仅一句「（不推荐）」注释，无中间人攻击原理说明与警告框。
3. **`032-python/350-HashlibHmac.md`（中-低）**：PBKDF2/scrypt 教得正确，但未提 argon2id 这一当前首选（java/go/kotlin 模块有，Python 模块无）。
4. `017-mysql/750-SQLInjectionAttackTypePractice.md` 有授权测试声明（DVWA、sqli-labs），740 篇开头缺少同样声明。低-中。
5. `041-nestjs` 无专门认证/JWT 篇，仅 Guards 篇指向 @nestjs/passport+@nestjs/jwt。覆盖缺口。低。

未发现「明文密码入库当正确做法」的主线教学，未发现把 http:// 当生产做法的主线教学。

## 5. 联网核实记录

- Python：当前稳定版 3.14.x（3.13 已转 security-only）——仓库 010 篇正确、020 篇过时。
- Node.js：Node 24 为 Active LTS（EOL 2028-04），Node 22 为 Maintenance——仓库推荐落后一代。
- React 19.3.0（2026-09-09）——仓库正确。
- Tailwind v4 当前主版本线——仓库正确。
- Vue 3.6（Vapor）2026 年已趋稳定；Vite 8 已发布——仓库 Vite 声明准确，Vue 表述可能落后一步。

主要来源：react.dev/versions、github.com/react/react/releases、github.com/tailwindlabs/tailwindcss/releases。

## 6. 修复优先级

1. mysql/760 补密码哈希存储与 bcrypt/argon2 环节（安全教学主线缺口）；
2. python/020 的「3.10+」改为与 010 篇一致的 3.12+ 口径；
3. Node 安装篇与 nestjs 篇改为 Node 24 LTS（或至少注明 22 为 Maintenance）；
4. python/360 增加强警告框与 MITM 说明；
5. 速查卡 var 条目补「新代码用 let/const」一行弃用说明；
6. 建立版本敏感文档清单与季度复核机制（扩展 content-audit.mjs 的 OUTDATED_KEYWORDS）。
