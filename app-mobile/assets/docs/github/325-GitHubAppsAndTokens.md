---
order: 360
title: 访问令牌与 GitHub Apps：一张类型图分清谁能替你操作仓库
module: 'github'
category: 工具链
difficulty: beginner
description: classic PAT 与 fine-grained PAT 的差异与迁移、Actions 的 GITHUB_TOKEN、GitHub App 与 OAuth App 的选型边界，配「CI 用哪种令牌」与「第三方 App 该批多少权限」两个决策场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：GitHub 的凭证与应用体系——访问令牌（PAT、GITHUB_TOKEN、App 安装令牌）与应用类型（GitHub App、OAuth App）的完整类型图。
- **解决什么问题**：GitHub 上每一个自动化动作（CI 推包、机器人评论、第三方工具读你的仓库）都要回答两个问题：「以什么身份」与「能做多少事」。凭证类型选错，轻则权限不够反复折腾，重则一枚过宽的令牌泄露后整个账户失守。
- **什么时候用到**：给 CI 配令牌时；安装第三方 App 前 review 它要什么权限时；接手别人项目发现 CI 里躺着一枚十年老 PAT 时。`gh` 命令行的认证视角（token 怎么填进 gh）在[GitHub CLI 认证配置](/github/450-GhCliAuth)第 3 节，本文展开的是令牌体系全景本身；REST API 的调用方式见[REST 与 GraphQL API](/github/320-RESTGraphQLAPI)。

## 0. 场景：CI 里该用 GITHUB_TOKEN 还是 PAT

一个真实决策题：你的工作流要在合并后给 PR 自动打 `released` 标签，还要推一个构建产物到另一个私有仓库。第一版配置里有人图省事，在仓库 Secrets 里放了一枚**classic PAT**（scope 勾了整个 `repo`），全工作流都用它。这能用，但属于埋雷：

- 这枚 PAT 属于某个**个人账户**，此人离职/退出组织那天，CI 全线瘫痪；
- `repo` scope 覆盖该用户**所有**仓库的读写，泄露一枚等于交出全部；
- GitHub 平台无法区分「这次操作是 CI 做的」还是「此人本人做的」，审计失真。

正确姿势分两层：本仓库内操作用工作流自带的 **GITHUB_TOKEN**（平台自动签发、随 workflow 结束作废、权限由 `permissions:` 块声明）；跨仓库操作若 GITHUB_TOKEN 不够，也不要用长期 PAT，而是给这台「CI 机器人」配一个 **GitHub App**，按需生成短期安装令牌。选型决策放到第 3 节，先把全景图铺开。

## 1. 凭证类型全景图

| 凭证/应用 | 归属 | 生命周期 | 权限粒度 | 典型用途 |
| :--- | :--- | :--- | :--- | :--- |
| Classic PAT | 个人账户 | 手工设置，可永不过期 | 按 scope（`repo`、`workflow` 等），作用于该用户全部仓库 | 临时脚本、旧工具兼容 |
| Fine-grained PAT | 个人账户 | 必须设过期时间（最长一年，可更短） | 按选定仓库 + 按操作类（Contents/Issues/... 各自读写） | 个人自动化、替代 classic 的新选择 |
| GITHUB_TOKEN | 平台代发 | 单次 workflow 运行内有效 | 由 workflow `permissions:` 块声明，默认逐步收紧 | CI 内对本仓库的操作 |
| GitHub App 安装令牌 | 安装了该 App 的组织/仓库 | 短期（默认 1 小时） | 按 App 声明的权限，细到仓库 | 生产级机器人、企业自动化 |
| OAuth App 令牌 | 授权它的用户 | 长期有效直到用户撤销 | 按 App 申请的 scope，作用于用户账户 | 用户授权类工具（如第三方客户端） |

五个位置共同遵循一条主线：**归属越「机构化」、生命周期越短、粒度越细，越安全也越工程化**。PAT 归个人、OAuth App 绑用户、GitHub App 挂在组织/仓库上由机构管理——越往下越适合无人值守的生产自动化。

## 2. PAT：classic 与 fine-grained

### 2.1 差异在哪里

Classic PAT 是「一批勾选的 scope，作用于你账户下的所有仓库」；fine-grained PAT 是「先选仓库（或组织内全部仓库），再逐项勾权限（如只给选定仓库的 Contents 读 + Pull requests 读写）」。两者像门禁卡的两代产品：classic 是「这栋楼万能卡」，fine-grained 是「只开 3 楼机房、只进不出的时段卡」。

用 `gh api` 实际感受权限差异（这是一段可以逐行跑的验证）：

```bash
# classic PAT 常见的 scope 字段（查看自己令牌能干什么）
gh api user --jq '.login'
# 令牌的 scope 不在响应体里，而在响应头里，需要 -i 看头部：
gh api -i user | grep -i x-oauth-scopes
# 输出类似：x-oauth-scopes: repo, workflow —— classic PAT 的作用域全景
```

- 为什么 scope 要看响应头：classic PAT 的 scope 是「令牌元数据」，API 把它放在 `X-OAuth-Scopes` 响应头而不是返回 JSON 里——这个位置差异让很多人误以为 classic PAT 没法查权限；
- fine-grained PAT 则没有这个响应头，它的权限在创建时就被钉死在「仓库 + 操作」矩阵上。

### 2.2 迁移：从 classic 到 fine-grained

迁移不复杂，难在盘点：先列出你所有 classic PAT 在哪里被使用（CI Secrets、本机环境变量、第三方工具），再逐个用 fine-grained 重建。一个务实的迁移清单：

1. `gh auth status` 看本机登录用的是哪种令牌；
2. 网页 `Settings -> Developer settings` 里列出所有 PAT，每枚问一句「它在替谁干活」；
3. 在用的逐枚迁移：fine-grained 版只勾目标仓库与最小操作，旧 classic 立即 revoke；
4. 无主人认领的直接 revoke——令牌不会自己过期是 classic 最大的风险面（现在创建 classic PAT 也被强烈建议设置过期时间）。

「最少 3 个场景」体会选型：

1. **临时导数据脚本**：跑一次就扔，fine-grained PAT 设 7 天过期，事毕自动作废；
2. **工程场景：团队 CI 跨仓库发布**：不用 PAT，用 GitHub App（下一节）——令牌归属组织而非个人；
3. **老工具只认 classic scope**：先确认工具是否支持 fine-grained（部分旧工具解析不了新版头），不支持时给 classic 设最短可行过期时间并写进轮换日历，而不是默认它永不过期。

## 3. GITHUB_TOKEN：Actions 内置令牌

每个 workflow 运行开始时，GitHub 自动生成一枚 GITHUB_TOKEN 注入运行环境，运行结束即销毁。它解决了 PAT 在 CI 里的两大问题：**不归属任何个人**（跟着仓库走）与**天然短命**（单次运行）。

权限不是「有什么算什么」，而是由 `permissions:` 块显式声明——这正是[Actions 复用与供应链安全](/github/435-ActionsReuseAndSecurity)里权限最小化的落点：

```yaml
# .github/workflows/label.yml（节选，逐段解释）
jobs:
  label:
    runs-on: ubuntu-latest
    permissions:            # 本 job 拿到的令牌能力清单
      contents: read        # 读代码与元数据——大多数 job 只需要这一条
      issues: write         # 本 job 要操作 Issue，才多给这一条
      pull-requests: write  # 要给 PR 打标签、写评论
    steps:
      - uses: actions/checkout@v4
      - run: gh pr edit "$NUMBER" --add-label released
        env:
          GH_TOKEN: ${{ github.token }}   # 平台生成的 GITHUB_TOKEN
          NUMBER: ${{ github.event.pull_request.number }}
```

- `permissions:` 写在 job 级别比写在 workflow 顶部更好——只给真正需要的 job，其他 job 天然拿不到；顶层写一个 `contents: read` 再逐 job 追加是更稳的整体结构；
- `github.token` 就是 GITHUB_TOKEN 的取值表达式；`gh` 识别 `GH_TOKEN` 环境变量，于是在 runner 上无需任何登录动作；
- 如果这个 job 什么都没声明，拿到的是仓库默认权限（可在 `Settings -> Actions -> General -> Workflow permissions` 里看到，新仓库默认趋于只读）。

换成别的写法会发生什么：把这里换成一枚 classic PAT，功能一样能跑（第 0 节已经分析过代价）。反过来，GITHUB_TOKEN 也有边界——它**默认只对本仓库有效**，推制品到另一个仓库、跨仓库触发下游 workflow 这类需求它满足不了，此时才轮到 App 令牌或（权衡后的）PAT。

## 4. GitHub App 与 OAuth App：机器人的两种「人格」

### 4.1 区别的本质

OAuth App 的令牌**以「用户」身份活动**：你授权了第三方客户端，它就顶着你的账号干活。GitHub App 则是一个**独立的机构化身份**：安装在哪些仓库、声明了什么权限，由组织/仓库管理者逐项批准；它发出的安装令牌（installation token）身份是「这个 App 的这次安装」，而不是任何一个人。

工程上的三个实际差异：

| 维度 | GitHub App | OAuth App |
| :--- | :--- | :--- |
| 权限审批 | 安装时按仓库/组织逐项批准，随时可改 | 用户按 scope 一次性授权，粒度更粗 |
| 速率限制 | 随安装规模放大（每安装独立额度） | 按用户统一额度 |
| 归属与审计 | 操作归因到 App + 安装，不归因个人 | 归因到授权用户本人 |

选型边界一句话：**做「替组织干活的机器人」用 GitHub App；做「替用户操作他们自己账号的工具」用 OAuth App**。自动回复 Issue 的仓库管家是前者；读取你个人通知的第三方客户端是后者。

### 4.2 场景：第三方 App 申请仓库读写权限时，该批多少

在网页上安装任何 GitHub App 时都会弹出权限清单，这是普通人最常忽略的一次安全 review。拿到一张申请单，按三步批：

1. **用途对齐**：App 宣称的功能是否需要这些权限？「代码统计插件」申请 Pull requests 写权限就不对劲——统计只需读。
2. **读写分层**：很多 App 读即可满足（统计、审计、看板类）；申请「写」的，确认它写什么（打标签是低风险写，改文件是高写）。
3. **范围收缩**：能选「Only select repositories」就不要 All repositories；先只装到测试仓库观察一周，再扩大安装范围。

三个具体判断：

1. **工程场景**：团队要装一个自动生成 changelog 的 App，它申请 Contents 读 + Pull requests 读写。审批结论：合理（读提交历史、在 PR 上留评论），但安装范围先限 `release-tools` 一个仓库。
2. **反例**：某「代码质量」App 申请 `administration: write`（等于能改仓库设置）。质量工具没有理由动设置——不装，找替代。
3. **你自己写机器人**：同理反过来用——把 App 的权限声明做得越窄，别人越敢装。这也解释了为什么大厂集成（如各 CI 厂商）近年在推 fine-grained 安装而非 OAuth。

## 5. 最小权限与密钥轮换

两条工程底线，把本文所有凭证类型串起来：

**最小权限**：每枚凭证只拿「完成当前任务所需的最小集合」。落到操作层面：fine-grained PAT 逐仓库逐操作勾选；workflow `permissions:` 只写用到的项；App 安装范围从单仓库起步。权限给了收不回来是常态——泄露的成本远大于配窄的麻烦。

**轮换与吊销**：凭证的默认假设是「终将泄露」。因此：一切令牌设过期时间；存放在 Actions Secrets / 密钥管理服务，不进代码（仓库里已经提交过的密钥会被[Secret 扫描](/github/290-SecretScanning)召回，但那是兜底不是防线）；泄露后立即吊销重发，而不是「先观察一下」。轮换演练一次的成本，远低于真实泄露当天的混乱。

## 6. 坑点与自检

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| CI 里用个人 classic PAT 干跨仓库活 | 个人离职 CI 全断；审计归因失真 | 换 GitHub App 安装令牌；过渡期 PAT 设短过期并登记归属 |
| `permissions:` 不写 | 拿到仓库默认权限，宽窄不可控 | 每个 job 显式声明，workflow 顶层先收成 `contents: read` |
| classic PAT 永不过期 | 泄露面随年限放大 | 迁移 fine-grained；在用 classic 登记过期日 |
| App 安装时无脑 All repositories | 第三方拿到全组织仓库授权 | Only select repositories 起步，观察后再扩大 |
| 令牌贴进 issue/PR/截图 | 几分钟内被扫描机器人收集 | 立即吊销重发；已提交进历史的按泄露处理 |
| 以为 fine-grained PAT 支持 gh 的所有组织级功能 | 部分 enterprise/org 管理 API 不支持 | 组织级管理脚本优先 GitHub App 或评估后再选型 |

自检三问：

1. 我们 CI 里现在有多少枚长期凭证？各自属于谁？
2. 最近一次安装第三方 App，你是逐项看过权限清单，还是直接点了 Approve？
3. 若明天发现一枚 PAT 泄露，谁负责、多少分钟能吊销并替换？

## 动手实践

**任务**：给你的仓库做一次「凭证体检」并输出一张清单。三个动作：列出本机与 CI 在用的所有 GitHub 凭证；对每一枚标注类型、归属、过期时间、权限范围；对超期或过宽的给出迁移方案。然后把一张 `permissions:` 块加进你现有 workflow（若还没有）。

提示：
- 本机：`gh auth status` 看登录身份与令牌来源；
- 仓库侧：`Settings -> Secrets and variables -> Actions` 里列 Secrets，逐个问「谁还在用它」；
- classic PAT 的权限看响应头 `X-OAuth-Scopes`（第 2.1 节命令）；
- 迁移方案要具体到「新凭证类型 + 最小权限清单 + 旧凭证吊销日期」。

参考实现（先自己写，再对照）：

```text
凭证体检清单（示例格式）：

| 凭证 | 类型 | 归属 | 过期 | 范围 | 处置 |
| --- | --- | --- | --- | --- | --- |
| 本机 gh 登录 | OAuth (gh 内部) | 我 | gh 托管 | 本账户 | 保留 |
| CI_TOKEN (Actions Secret) | classic PAT | 前同事 | 永不过期 | repo 全域 | 危险：本月迁到 App 安装令牌，迁移日即吊销 |
| deploy_key | Deploy Key | 仓库级 | 随密钥 | 单仓库只读 | 保留（粒度已最小） |

workflow 补丁：job 级 permissions 加 contents: read + issues: write，
删除对 CI_TOKEN 的引用；顶层统一 contents: read。
```

对照要点：清单的价值在「归属」列——凭证管理失控几乎都始于「没人知道这枚令牌是谁的、在替什么流程工作」。每枚无主凭证都应当场吊销，而不是等想起来再处理。

## 参考与致谢

- 令牌类型、App 类型与权限模型依据 GitHub 官方文档 Authentication/Secure your automation/GitHub Apps 主题整理重写，来源：https://docs.github.com/authentication 、https://docs.github.com/apps （License: CC-BY 4.0）。
- 「CI 用 GITHUB_TOKEN 还是 PAT」与「第三方 App 该批多少权限」两个场景为本仓库既有 CI 安全实践（[Actions 复用与供应链安全](/github/435-ActionsReuseAndSecurity)）视角下的原创演绎。
