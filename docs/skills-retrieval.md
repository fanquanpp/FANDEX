# Skills 检索规范

## 1. 总则

本规范定义 FANDEX 项目中 Skills 检索的强制流程与判定标准。所有 Sub-Agent 在执行任何细分任务前 SHALL 先完成本规范定义的检索动作，禁止跳过。

## 2. 检索时机（强制）

以下节点必须先执行 Skills 检索：

- 每个细分执行步骤启动前
- 每次文件修改、代码重构、调试排错前
- Plan / Coding / Debugging / Delivery 阶段切换前
- 引入新依赖、新组件、新工具前

## 3. 检索来源

### 3.1 本地 Skills

通过 `scripts/skills-search.mjs` 维护的本地 Skill 元数据列表检索，涵盖：

- **流程规范型**（强遵循类）：代码格式、目录结构、文档模板、提交规范、项目初始化流程、输出标准等标准化内容
- **技术实操型**（弱遵循类）：API 用法、命令参数、依赖版本、排错步骤、技术方案等与环境强相关的内容

检索命令：

```bash
node scripts/skills-search.mjs --query "<关键词>" --limit 5
node scripts/skills-search.mjs --list-local
```

### 3.2 远程 Skills（skillsmp.com）

通过 `https://skillsmp.com/zh` API 检索，凭证为环境变量 `SKILLSMP_API_KEY`（位于 `.env.local`，不入库）。

API 端点：`GET https://skillsmp.com/api/v1/skills/search?q=<query>&limit=<limit>`

认证方式：`Authorization: Bearer <SKILLSMP_API_KEY>`

检索结果缓存至 `docs/skills-cache/remote-<hash>.json`，有效期 24 小时，避免重复请求。

## 4. 技能分级执行策略

### 4.1 强遵循类（流程规范型 Skill）

**适用范围**：代码格式、目录结构、文档模板、提交规范、项目初始化流程、输出标准等。

**执行要求**：默认严格遵循 SKILL.md 定义的步骤与格式，保证输出一致性。

**可偏离场景**：仅当与项目已有硬性规范（如团队约定的 ESLint 规则、既有目录架构）直接冲突时，方可调整。

### 4.2 弱遵循类（技术实操型 Skill）

**适用范围**：API 用法、命令参数、依赖版本、排错步骤、技术方案等与环境强相关的内容。

**执行要求**：将 Skill 内容作为首选方案，但必须通过工具（终端、检索、文件读取）验证后再落地。

**冲突处理**：若 Skill 指引与实际环境不符、执行报错、验证不通过，立即停止硬套，改用经工具验证的正确方案，不得为了遵循 Skill 而强行执行错误操作。

## 5. 偏差报备机制

只要实际执行与 Skill 指引不一致，必须在 `docs/skill-deviations.log.md` 中记录以下信息：

- **时间**：ISO 8601 格式时间戳
- **步骤**：发生偏差的执行步骤名称
- **原 Skill 要求**：原 Skill 指引的具体内容
- **实际方案**：实际采用的方案
- **依据原因**：偏离的依据（如终端报错、文件实际结构不符、依赖版本不匹配）

**格式示例**：

```markdown
## 2026-07-18T10:30:00.000Z | 安装 Tailwind v4

- **原 Skill 要求**：使用 `npm install tailwindcss@latest` 安装最新版
- **实际方案**：使用 `npm install tailwindcss@^4.0.0` 固定主版本
- **依据原因**：项目 package.json 已锁定主版本范围，避免破坏性更新

---
```

**禁止行为**：

- 禁止无理由偏离
- 禁止静默绕过 Skill 直接按自己的逻辑执行

## 6. 工具优先与运行时约束

- **代码文件类**：必调用读取 / 搜索工具，禁止凭记忆推断当前状态
- **环境运行类**：必调用终端执行，禁止口头推演、假设成功
- **外部信息类**：必调用网络检索，禁止编造过期知识
- **状态锁定**：全程工具集、配置不裁剪、不卸载；核心工具失效立即硬阻断，不降级运行
- **审计追溯**：所有工具调用、Skill 检索、偏差记录全程留痕，可回溯

## 7. 未匹配时的处理

当检索后无匹配 Skill 时，必须显式标注：

```
【Skill 校验】已完成全量 Skills 检索，当前步骤未匹配到对应场景技能
```

方可继续执行。

## 8. 检索结果使用

- 检索结果中的 Skill 元数据（name、description、url）可被 Sub-Agent 直接使用
- 远程 Skill 的完整内容（SKILL.md）需通过 `WebFetch` 或 `curl` 下载至 `docs/skills-cache/` 后读取
- 已下载的 Skill 在 24 小时内优先使用缓存，超期自动重新检索

## 9. 维护与更新

- 本地 Skills 元数据列表由项目维护者定期更新（每月一次）
- 远程 Skills 检索结果实时获取，缓存 24 小时
- 偏差日志持续累积，每季度归档一次至 `docs/skill-deviations-archive/<year>-<quarter>.md`
