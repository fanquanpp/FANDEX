---
order: 240
title: 通知与订阅管理
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub 通知与订阅管理：watching/订阅/忽略三态模型、仓库与 discussion 级订阅粒度、邮件与 Web 通知路由配置、watching 清单治理、CI 失败与安全告警的通知链路，附多仓库分流与组织默认策略治理方案。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'github/010-GitHubOverview'
  - 'github/210-IssuesTemplateTagMilestone'
  - 'github/240-Discussions'
  - 'github/280-Dependabot'
  - 'github/370-GitHubActionsCICD'
prerequisites:
  - 'github/010-GitHubOverview'
---

# 通知与订阅管理

## 知识点地图

- **知识类别**：平台个人效率——通知（notifications）与订阅（watching/subscriptions）体系。它不产生代码，却决定「你是否还在用 GitHub」：通知失控是很多人弃用 GitHub 的第一原因，通知配置得当则是多仓库维护者的操作系统。
- **解决什么问题**：GitHub 的通知由两个正交的开关叠加控制——**仓库级**（Watching/Participants/Custom/Ignoring 四档）决定「这个仓库的事件要不要进入我的通知流」，**线程级**（订阅/取消订阅）决定「这一条讨论要不要单独跟」。不懂这两层模型的人只会两招：全开（被邮件淹没）或全关（错过 review 请求）。本篇把模型讲透，再给路由配置、清单治理与告警链路的落地方案。
- **什么时候用到**：
  - 第一次被某个热门仓库的 Issue 淹没时；
  - 同时维护多个仓库，需要「关键仓库强提醒、其他仓库按需查」的分流；
  - 组织管理员要定默认 watching 策略（all → 参与制）；
  - 依赖 CI 失败与 Dependabot 安全告警必须第一时间看到的人。
- **与相邻篇目的分工**：Issue/Discussion 等通知的「内容」管理在 [Issues](/github/210-IssuesTemplateTagMilestone) 与 [Discussions](/github/240-Discussions)；通知只是它们的「送达层」。CI 失败本身的处置在 [GitHub Actions](/github/370-GitHubActionsCICD)，本篇只讲「失败怎么找到你」。

## 1. 三态模型：watching、订阅与忽略

GitHub 通知的核心是**两层正交开关**，理解这张表就理解了全部：

**第一层：仓库级 watching（你对该仓库的默认姿态）**

| 档位 | 含义 | 典型使用者 |
| --- | --- | --- |
| Participating and @mentions（默认） | 只收「我参与/被 @」的线程 | 多数人：既不淹没也不失联 |
| All Activity（watching） | 仓库全部活动都进通知流 | 核心维护者：自己的关键项目 |
| Custom | 自选事件类型（仅 Releases、仅 Security alerts...） | 只要发布提醒的贡献者 |
| Ignore | 完全静音（被 @ 也收不到） | 确定永不参与的吵闹仓库 |

**第二层：线程级 subscription（对单条 Issue/PR/Discussion）**

| 动作 | 含义 |
| --- | --- |
| 订阅（默认发生在你评论/被 @ 时） | 该线程的后续更新单独推送 |
| Unsubscribe | 从这条线程退出，仓库级设置接管 |
| 「收件箱里的 Done」 | 处理完即关闭线程订阅——收件箱归零的关键动作 |

两层的关系：**仓库级决定「默认收什么」，线程级是「个别线程的覆盖」**。你评论任何线程都会自动订阅它——这就是为什么「我只是顺手回了一句」一周后被 200 封邮件淹没。管理入口：仓库首页右上角 Watch 下拉（仓库级），收件箱里每条通知右侧的 Unsubscribe（线程级）。

## 2. 收件箱与路由：把通知分流

通知中心（github.com/notifications）不是唯一的出口，配置在 Settings → Notifications：

- **邮件路由**：勾选 Participating / Watching / All 三类事件是否发邮件；再配 **自定义邮件路由**（Custom routing）——把特定仓库的通知发到指定邮箱（如工作邮箱只收公司仓库、个人邮箱收开源仓库）；
- **Web 与移动**：Notification inbox 的 Filters（Saved filters 可存「未读的 review 请求」这类常用视图）+ 手机 App 的推送只留给 Participating——推送是侵入性最强的通道，只给真正需要秒回的事件；
- **优先级直觉**：@mentions 与 review 请求 > 指派的 Issue > watching 的普通动态。路由配置要让这三档的「打扰成本」依次递减。

收件箱的日常纪律：**Inbox 零不是目标，「Done 一条是一条」才是**——看完一条就 Done（取消订阅）或 Save（保线程订阅、清出收件箱）。收件箱堆积的根源几乎总是「线程级订阅从未被主动关闭」。

## 3. 场景一：多仓库维护者的分流方案

同时维护个人项目、公司项目、参与的开源仓库三摊事：

```text
分类治理（把 watching 清单翻一遍）：
  github.com/watching 页面列出你 watching 的全部仓库

  核心仓库（你负责的项目，5 个以内）
    → All Activity：发布、安全告警、CI 失败一个不漏

  参与仓库（社区项目、同事项目）
    → 默认 Participating and @mentions：被点名才响

  沉默仓库（三年没看过却还在 watching 的）
    → Unwatch 全部：用列表页批量处理，或 Ignore 常年刷屏的
```

配套两条：**邮件自定义路由**把「核心仓库」指到常用邮箱，其余不进邮件只留在 Web 收件箱；**每季度重审一次 watching 列表**——它会随兴趣自然膨胀，与第 4 节的组织策略同构。

## 4. 场景二：组织仓库的默认策略治理

组织管理员面临的问题：成员加进组织后，仓库自动变 All（老默认行为）还是按参与制？治理方案：

```text
组织侧（Settings → Member privileges）：
  - 限制自动 watching：成员默认只收「参与的」，
    避免「加入组织 = 订阅全部仓库」的洪水
  
个人侧动员（写进组织上手文档）：
  - 关键仓库（基础设施、发布流水线）由 on-call 主动 All
  - 其他仓库默认 Participating
```

治理的判断标准：**通知跟随责任**——谁值班谁开 All，谁参与谁收 Participating；「组织默认全开」意味着每个人都替所有人的噪音付费。

## 5. CI 失败与安全告警的通知链路

有些通知不能靠「去收件箱看」，要主动接出来：

```yaml
# CI 失败推送到团队频道的最小 workflow（详见 Actions 系列）
- name: Notify on failure
  if: failure()
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    gh api repos/"$GITHUB_REPOSITORY"/issues/"${{ github.event.pull_request.number }}"/comments \
      -f body="CI 失败：${{ github.run_id }}（gh run view ${{ github.run_id }} --log-failed）"
```

三类高价值告警的链路设计：

1. **CI 失败**：失败通知进 PR（如上）或 webhook 推 IM——被动等邮件太慢，主动 webhook 才是 on-call 的节奏（Actions 通知的配置全貌见 [GitHub Actions CI/CD](/github/370-GitHubActionsCICD)）；
2. **Dependabot 安全告警**：仓库开启后默认按 Custom 档送达到有权限者；策略上「安全告警永远不静音」——它们与 [Dependabot](/github/280-Dependabot) 的修复流程联动，通知是闭环的第一环；
3. **Secret Scanning 告警**：与安全告警同通道但优先级更高（泄露的密钥按分钟计损失），见 [Secret Scanning](/github/290-SecretScanning)。

## 6. 动手实践

### 练习一：watching 清单大扫除

任务：打开 github.com/watching，把清单分成「核心/参与/沉默」三堆并完成治理；记录治理前后的仓库数与预期每日通知量。
提示：沉默堆的判断标准是「过去一个月没点开过它的任何通知」；Ignore 慎用——被 @ 也收不到，只留给确定永世的仓库。

### 练习二：配置一条邮件自定义路由

任务：选一个仓库，把它的通知路由到独立邮箱/邮箱文件夹，验证一封测试通知确实落进去了。
提示：Settings → Notifications → Custom routing；验证用「自己给自己仓库提一个测试 Issue」触发。

### 练习三（工程场景）：给 CI 失败建通知闭环

任务：在个人仓库加一个 failure 通知步骤（IM webhook 或 PR 评论），并写下「从失败发生到有人响应」的目标时限。
提示：先想清楚「失败通知应该到哪」（IM 快但吵、PR 评论静但需人在场），再动手；参考第 5 节的最小 workflow。

### 练习四（复盘）：Dependabot 告警到 issue 处置的闭环

任务：在自己的仓库开启 Dependabot alerts，模拟收到一条告警后走完「通知 → 生成修复 PR → 合并 → 告警消除」全链路，画出这张闭环图。
提示：通知链路见第 5 节；修复流程在 [Dependabot](/github/280-Dependabot)——本练习把「通知层」与「处置层」接起来。

## 7. 与之前和之后的知识的关系

- 往前：[GitHub 平台总览](/github/010-GitHubOverview) 的平台操作面里，通知是「个人设置」的核心件；
- 旁支：通知的「内容源」分别是 [Issues](/github/210-IssuesTemplateTagMilestone)、[Discussions](/github/240-Discussions)、[PR 流程](/github/180-PullRequestCompleteCollaborationFlow)；告警源是 [Dependabot](/github/280-Dependabot)、[Secret Scanning](/github/290-SecretScanning)、[Code Scanning](/github/300-CodeQLCodeScanning)；
- 往后：把通知升级为自动化集成（webhook → IM/工单）时，接力的底层机制在 [Webhooks](/github/330-Webhooks) 与 [REST/GraphQL API](/github/320-RESTGraphQLAPI)。

## 8. 官方文档

- Configuring notifications（docs.github.com，开放许可可致谢）：https://docs.github.com/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications
- Subscriptions 与 watching 管理：https://docs.github.com/account-and-profile/managing-subscriptions-and-notifications-on-github/managing-subscriptions-for-activity-on-github
- Triaging a single notification（收件箱操作）：https://docs.github.com/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/triaging-a-single-notification

## 9. 自我检查

- 能画出仓库级 watching 四档与线程级订阅的两层模型，并解释「评论即订阅」为什么是邮件洪水之源；
- 能为「核心/参与/沉默」三类仓库各指定正确的 watching 档位；
- 能说出组织治理的判断标准（通知跟随责任）与成员默认档位的建议；
- 能列出三类不可静音的告警（CI 失败、Dependabot 安全、Secret Scanning）与各自的主动链路；
- 能演示「Done/Save/Unsubscribe」三个收件箱动作分别清掉什么。

## 本章总结

通知体系 = 仓库级 watching 四档（All/Participating/Custom/Ignore）× 线程级订阅的叠加：仓库级定基调，线程级做覆盖，「评论即订阅」的默认行为要求你把「Done 一条是一条」当成收件箱纪律。治理的三板斧——个人 watching 清单分三堆、邮件自定义路由分流、组织按「通知跟随责任」定默认——把 GitHub 从邮件洪流变回精准信使；而 CI 失败、安全告警、密钥泄露三类高价值事件要主动接出（webhook/IM），永远不静音。

## 参考与致谢

- watching 档位、收件箱操作与通知路由的能力描述依据 GitHub 官方文档 Notifications 目录（docs.github.com，开放许可）：https://docs.github.com/account-and-profile/managing-subscriptions-and-notifications-on-github ；
- 本文为本批次新增，无本机扫描素材；其余内容为原创。
