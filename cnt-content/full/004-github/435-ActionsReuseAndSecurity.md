---
order: 440
title: Actions 复用与供应链安全：可复用工作流、组合动作与权限最小化
module: 'github'
category: 工具链
difficulty: beginner
description: 以「三个服务仓库各抄一份几乎相同的 CI」与「第三方 action 被投毒」两个真实痛点切入，动手抽取可复用工作流（workflow_call）与组合动作（composite action），并给工作流加上权限最小化、SHA 固定与 OIDC 三道保险，讲清复用机制的服务端展开原理与 fork PR 的攻击面。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'github/370-GitHubActionsCICD'
  - 'github/380-ActionsTrigger'
  - 'github/420-ActionsEnvironmentDeploy'
  - 'github/430-ActionsSelfHostedRunner'
  - 'github/280-Dependabot'
prerequisites:
  - 'github/370-GitHubActionsCICD'
  - 'github/380-ActionsTrigger'
---

## 前置知识

- 会写基本的 Actions 工作流：job、step、`uses` / `run`（见 [GitHub Actions 持续集成与部署](/github/370-GitHubActionsCICD)）；
- 知道 `push` / `pull_request` 触发器与 `pull_request_target` 的安全边界（见 [Actions 触发机制](/github/380-ActionsTrigger)）。

## 学习目标

读完本文你将能够：

1. 把一段被多个仓库复制的 CI 抽成**可复用工作流**（`workflow_call`），并用 `secrets: inherit`、inputs、outputs 完成参数化；
2. 把一组跨 job 重复的安装步骤抽成**组合动作**（composite action），说清它与可复用工作流的分工；
3. 给工作流加上三道安全保险：`permissions` 权限最小化、第三方 action 固定完整 SHA、云部署走 OIDC 短期凭据；
4. 解释「fork PR 为什么拿不到 secrets」「`pull_request_target` 为什么容易出安全事故」，并给出安全的 PR 工作流模板。

## 1. 问题：抄出来的 CI 与抄出来的风险

一个组织常见的两种真实景象：

- **复制粘贴的 CI**：`api`、`web`、`admin` 三个服务仓库各有一份几乎相同的 `ci.yml`。某天要在构建前加一步安全扫描，你要改三处，漏一处就是不一致。复制的成本会随仓库数量线性增长。
- **复制进来的风险**：为了省事，大家直接抄 Marketplace 上某个第三方 action 的写法 `uses: some-cool-action@v1`。`v1` 只是一个**可以被人移动的标签**——作者哪天把 `v1` 重新指向一个带恶意代码的提交，所有引用它的仓库在下次构建时就会执行那段代码，而工作流里挂着你的 secrets 和 GITHUB_TOKEN。

这两类问题的根源相同：**你依赖的东西没有被「钉死」，也没有「只给它刚够用的权力」**。本文先讲复用（把该收敛的收敛），再讲安全（把该钉死的钉死）。

## 2. 可复用工作流：workflow_call

可复用工作流（reusable workflow）是**以整条流水线为单位的复用**：一个工作流声明 `workflow_call` 触发器后，可以被其他工作流当作一个 job 来调用。与 370 里那段入门示例相比，这里补全参数化的完整写法。

### 2.1 被调方：定义可复用工作流

```yaml
# shared-ci/.github/workflows/node-ci.yml
name: Node CI（可复用）
on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node 版本'
        type: string
        default: '22'
      run-e2e:
        description: '是否跑 E2E'
        type: boolean
        default: false
    secrets:
      registry-token:
        description: '私有 npm 源 token'
        required: false
    outputs:
      version:
        description: '构建产物版本号'
        value: ${{ jobs.build.outputs.version }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci && npm run build
      - name: 记录版本号
        id: meta
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"
      - if: ${{ inputs.run-e2e }}
        run: npm run test:e2e
```

要点：

- `inputs` 支持三种类型：`boolean`、`number`、`string`，都可带 `default`；在步骤里用 `inputs.xxx` 读取（上下文是 `inputs`，不是 `github.event.inputs`）；
- `secrets` 里逐个声明的密钥才对被调方可见——**调用方的 secrets 默认不自动传入**（除非用 `secrets: inherit`）；
- `outputs` 是「被调 job 的 job 级 outputs」透传给调用方的桥梁。

### 2.2 调用方：把整条流水线当一个 job 用

```yaml
# api/.github/workflows/ci.yml
name: api CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    uses: org-shared/shared-ci/.github/workflows/node-ci.yml@v1
    with:
      node-version: '22'
      run-e2e: true
    secrets:
      registry-token: ${{ secrets.NPM_TOKEN }}

  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh ${{ needs.ci.outputs.version }}
```

规则与语义：

- 调用写成 `uses: <owner>/<repo>/.github/workflows/<file>.yaml@<ref>`，**`@ref` 对跨仓库调用必填**（可以是分支、tag 或完整 SHA；生产上推荐 SHA，见第 5 节）；同仓库调用可用相对路径 `uses: ./.github/workflows/node-ci.yml`；
- 调用型 job **只能有 `uses`，不能写 `steps`**——一个 job 要么自己干活的步骤，要么整条调用别人的流水线，不能混着来；
- 读取被调方的输出用 `needs.<job-id>.outputs.<名字>`；
- 一次调用 = 调用方运行的一部分：**被调方的步骤直接在这次 workflow run 里展开执行**，UI 里能看到调用链，但不会产生新的 run；
- 事件不递归：被调工作流里即使有 `push` 触发器，这次以 `workflow_call` 进入的运行也不会再触发其他工作流（GITHUB_TOKEN 触发的事件本来就不递归触发）。

### 2.3 secrets: inherit 的便利与代价

```yaml
jobs:
  ci:
    uses: org-shared/shared-ci/.github/workflows/node-ci.yml@v1
    secrets: inherit    # 把调用方全部 secrets 透传给被调方
```

`inherit` 省掉了逐个声明的样板代码，但把「被调方需要什么」的契约抹掉了——被调工作流更新后可能静默拿到它不需要的新密钥，权限边界变模糊。**共享仓库这种强信任场景可以用；跨团队调用建议显式声明 secrets 清单**。

## 3. 组合动作：composite action

组合动作（composite action）是**以一组步骤为单位的复用**：把「装 Node + 装 pnpm + 配缓存」这类固定套路封装成一个 action，供同仓库或跨仓库的任何 job 的 `steps` 里调用。

### 3.1 定义 action.yml

```yaml
# .github/actions/pnpm-setup/action.yml
name: 'pnpm 环境准备'
description: '安装 pnpm、Node 与依赖（带缓存）'
inputs:
  node-version:
    description: 'Node 版本'
    default: '22'
outputs:
  pnpm-store:
    description: 'pnpm store 路径'
    value: ${{ steps.store.outputs.path }}
runs:
  using: 'composite'
  steps:
    - uses: pnpm/action-setup@v4
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'pnpm'
    - id: store
      run: echo "path=$(pnpm store path)" >> "$GITHUB_OUTPUT"
      shell: bash
    - run: pnpm install --frozen-lockfile
      shell: bash
```

### 3.2 调用

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/pnpm-setup     # 同仓库相对路径，无需 ref
      - run: pnpm build
      - run: echo "store=${{ steps.env.outputs.pnpm-store }}"   # 输出经 action 输出名读取
```

规则与语义：

- `runs.using: composite` 时，每个 `run` 步骤**必须显式写 `shell`**（composite 没有默认 shell）；
- 输出在 action 顶层 `outputs` 里声明，值引用内部 `step` 的输出；调用方按 action 输出名读取；
- 组合动作的步骤**运行在调用方 job 的环境里**——没有隔离，也没有自己的容器；它只是「把一段 steps 注入进来」，环境变量、工作目录都是调用方 job 的上下文。

## 4. 复用怎么选：三层工具的分工

| 工具 | 复用单位 | 典型场景 | 特点 |
| :--- | :--- | :--- | :--- |
| Marketplace / 第三方 action | 单个动作 | checkout、setup-node 等通用能力 | 生态丰富；供应链风险主要来源，需固定 SHA |
| 组合动作 composite | 一组 steps | 仓库内多 job 共用的环境准备、发布封装 | 零编译、纯 shell + YAML；随仓库演进 |
| 可复用工作流 | 一整条流水线 | 组织级标准 CI/CD，一处定义多仓库调用 | 参数化能力最强；调用处只能整条引用 |

判断口诀：**借别人的力气用 action，攒自己的套路用 composite，立组织的规矩用 workflow_call**。

两个边界要知道：可复用工作流**不能**发布到 Marketplace（Marketplace 只收 action），所以跨组织分发标准流水线的常见形态是「一个专门的 shared-ci 仓库」；composite 动作跨仓库引用时路径写法是 `owner/repo/<路径>@<ref>`，例如 `uses: org-shared/shared-ci/.github/actions/pnpm-setup@v1`。

## 5. 供应链安全：三道保险

### 5.1 风险模型：一条 action 引用意味着什么

`uses: foo/bar@v1` 意味着：**在这次构建里，以你的环境执行一段随时可能被更换的代码**，而它拥有：

- job 的 `GITHUB_TOKEN`（默认有内容读权限，可能被放宽到写）；
- 你显式或 `inherit` 传入的全部 secrets；
- 运行器网络环境（公网出口，或自托管运行器的内网——见 [自托管运行器](/github/430-ActionsSelfHostedRunner)）。

`v1` 这类 tag 是**可移动引用**：仓库作者（或入侵了作者账号的人）可以把它重新指向恶意提交。标签不变，代码已经变了。

### 5.2 保险一：第三方 action 固定完整 SHA

```yaml
# 风险写法：tag 可被移动
- uses: actions/checkout@v4

# 安全写法：固定到完整提交 SHA，注释保留版本语义
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

- SHA 是不可变引用，指到哪个提交就永远执行那个提交的代码；
- 代价是「升级要手动改 SHA」，用 [Dependabot](/github/280-Dependabot) 补齐：`versioning-strategy` 配置里开启 GitHub Actions 更新后，Dependabot 会**连注释里的版本号一起更新**，PR 里能看到版本差异，人工确认后合并——不可变与可维护兼得；
- 自己团队的 action 与可复用工作流同理：调用方一律用 SHA 或受保护的 release tag。

### 5.3 保险二：GITHUB_TOKEN 权限最小化

GITHUB_TOKEN 是 Actions 为每个 job 自动签发的仓库令牌。默认权限过宽时，一个被入侵的第三方 action 就能以你的名义写仓库、发 release。最小化分三层：

```yaml
# 第一层：仓库/组织设置——Workflow permissions 默认改为 Read repository contents（新仓库已默认只读）

# 第二层：工作流级——整条工作流的兜底权限
permissions:
  contents: read

# 第三层：job 级——只给真正需要的那个 job 加权限
jobs:
  build:
    permissions:
      contents: read
    steps:
      - run: pnpm build
  release:
    needs: build
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: write      # 只有发版 job 能写
    steps:
      - run: gh release create "$VERSION" ./dist/*
```

语义要点：权限在「工作流级 → job 级」逐层**收紧**；调用可复用工作流时，被调方的权限只能**等于或低于**调用方传入的权限，无法自行升高——这是服务端强制的。

### 5.4 保险三：云部署走 OIDC，不存长期密钥

部署到 AWS / Azure / GCP 时，不要把长期 Access Key 放进 secrets，改用 OIDC 短期令牌：

```yaml
jobs:
  deploy:
    permissions:
      id-token: write    # 允许申请 OIDC 令牌
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@<固定 SHA> # v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-deploy
          aws-region: cn-north-1
      - run: aws s3 sync ./dist s3://my-bucket
```

工作流向 GitHub 的 OIDC 提供方换取短时令牌，再用它扮演云上预配置的 IAM 角色——云厂商侧可以用角色策略限定「只有 main 分支的这个仓库能扮演这个角色」。密钥不落库、会话几分钟过期。完整配置见 [Actions 环境与部署](/github/420-ActionsEnvironmentDeploy)。

### 5.5 fork PR：为什么拿不到 secrets，以及 pull_request_target 的陷阱

 fork PR 的安全模型是本文风险机制的集中体现：

- `pull_request` 事件下，fork 贡献者的代码在**受限上下文**运行：读不到你的 secrets，拿到的 GITHUB_TOKEN 也只有只读权限——因为**代码是不可信的外部输入**；
- `pull_request_target` 反过来：以**目标分支**的代码与完整权限运行工作流，本是给「给贡献者回复评论」这类可信自动化准备的。危险在于：如果工作流里先 `checkout` 了 PR 的代码再执行构建/测试，等于**用高权限运行陌生人的代码**，secrets 与写权限全部暴露——这类事故被称为 pwn request，是 Actions 历史上最高频的安全事故类别；
- 防御三步：能不用 `pull_request_target` 就不用；必须用时只操作「目标分支代码 + PR 元数据」，绝不执行 PR 代码；确需构建 PR 代码时把「检出 + 执行」放进 `pull_request` 触发的无密钥工作流，两个工作流各司其职。actions/checkout v7 起默认禁止在 `pull_request_target` 中检出 fork PR 代码，就是把这一步从「约定」升级为「默认」（见 [Actions 触发机制](/github/380-ActionsTrigger)）。

## 6. 底层原理：展开机制与令牌生命周期

- **可复用工作流是服务端展开**：调用不产生新的 workflow run，被调方 jobs 挂进调用方的运行树；因此调用方的总时长计费包含被调方步骤，`needs` 图按调用关系串联。
- **composite 是客户端注入**：组合动作的 steps 在调用方 job 的步骤列表里原位展开，共享 job 的环境变量与工作目录，没有进程边界。
- **GITHUB_TOKEN 是按 job 签发的安装令牌**：每个 job 拿到的 token 有效期以该 job 为界（job 结束即失效），permissions 修改的是它的声明范围；这就是「最小权限」能真正限制爆炸半径的原因——即使泄露，作用域与寿命都有限。

## 7. 常见坑与排查

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| 调用型 job 报错 `invalid value job 'steps'` | 调用型 job 里混写了 `steps` | 调用型 job 只能有 `uses` + `with` / `secrets` |
| 被调方读不到 secret | secrets 默认不透传 | 显式声明或 `secrets: inherit` |
| `needs.ci.outputs.xxx` 为空 | 被调方没在 job 级 `outputs` 透传 | 检查被调方 job outputs 与顶层 outputs 两级映射 |
| composite 步骤报 shell 未指定 | composite 的 `run` 步骤必须写 `shell` | 每个步骤补 `shell: bash` |
| 跨仓库调用报 workflow 不存在或无权限 | 被调工作流不在 `@ref` 里，或调用方无读权限 | 核对 ref 指向；检查仓库可见性 |
| Dependabot 升级 PR 与注释版本号不一致 | action 行没带 `# vX.Y.Z` 注释 | 给 SHA 后补版本注释，Dependabot 会连注释一起更新 |
| fork PR 的构建行为与预期不同 | 误用了 `pull_request_target` | 改回 `pull_request`；确需 target 时绝不执行 PR 代码 |
| OIDC 报 `Not authorized to perform sts:AssumeRole` | 云侧角色信任策略未放行本仓库 | 在云厂商角色信任策略中限定仓库与分支 |

## 8. 与相邻知识的关系

- 之前：[Actions 持续集成与部署](/github/370-GitHubActionsCICD) 给出工作流的骨架，本文把「骨架」升级成「可分发、可加固的成品」；
- 并行：[Actions 触发机制](/github/380-ActionsTrigger) 定义「什么时候跑」，本文定义「跑的时候手里有什么权限」；[自托管运行器](/github/430-ActionsSelfHostedRunner) 的安全加固是同一思想在「机器层」的投影——最小权限、用完即焚；
- 之后：[Dependabot](/github/280-Dependabot) 负责让 SHA 固定可持续（自动升级 PR），[Secret scanning](/github/290-SecretScanning) 负责兜底「密钥真的被写进代码」的最后一道网。

## 9. 面试题思路

**「可复用工作流和 composite action 有什么区别，怎么选？」** 按复用单位答：前者复用整条流水线（服务端展开、跨仓库标准 CI），后者复用一组步骤（调用方环境内展开、仓库内套路封装）。加分点：提到 workflow_call 不能进 Marketplace、secrets 与权限的传递规则。

**「为什么第三方 Action 建议固定 SHA 而不是 tag？」** 先讲 tag 是可移动引用（攻击面），再讲 SHA 不可变（防护），最后讲配套：Dependabot 自动升级 + 版本注释保持可读性。能主动提到「固定 SHA 不是拒绝升级，而是把升级变成显式评审」是亮点。

**「pull_request 和 pull_request_target 的区别？为什么后者常出安全事故？」** 关键在「以哪份代码 + 哪份权限运行」：前者 PR 代码 + 受限权限，后者目标分支代码 + 完整权限。事故模式是「target 触发的工作流里又检出了 PR 代码执行」。答出「检出与执行分离」或提到 checkout v7 的默认禁止即为深入。

## 10. 动手与遮代码自检

以下练习都先看任务与提示，自己写完再对照参考实现。

### 练习 1：把三份重复的 CI 抽成一份可复用工作流（实践题）

任务：你有 `api` 与 `web` 两个仓库，各自的 `ci.yml` 都是「checkout、装 Node 22、`npm ci`、`npm run build`、`npm test`」。把它们抽到一个 `org-shared/shared-ci` 仓库，要求：Node 版本可配置、测试步骤可跳过、调用方能拿到构建版本号。

提示：被调方写 `workflow_call` 的 `inputs` 与 `outputs`；调用方 job 里只有 `uses`；输出要经「job outputs → 顶层 outputs」两级透传。

参考实现：

```yaml
# org-shared/shared-ci/.github/workflows/node-ci.yml
name: Node CI
on:
  workflow_call:
    inputs:
      node-version: { type: string, default: '22' }
      run-tests: { type: boolean, default: true }
    outputs:
      version:
        value: ${{ jobs.build.outputs.version }}
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@<完整提交 SHA> # SHA 从仓库 Releases 页查询（此处示意，写作时勿用 tag）
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci && npm run build
      - if: ${{ inputs.run-tests }}
        run: npm test
      - id: meta
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"
```

```yaml
# api/.github/workflows/ci.yml
name: api CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    uses: org-shared/shared-ci/.github/workflows/node-ci.yml@main
    with:
      run-tests: true
```

自检：`web` 仓库照抄调用段即可复用整条流水线；改 Node 版本只需要改 `with:` 一行。

### 练习 2：封装一个 pnpm-setup 组合动作（实践题）

任务：仓库里有三个 job（build、test、lint）都在重复「装 pnpm、装 Node、`pnpm install --frozen-lockfile`」。封装成 `.github/actions/pnpm-setup` 组合动作供三个 job 调用。

提示：`runs.using: composite`；`run` 步骤必须带 `shell`；inputs 用 `${{ inputs.xxx }}` 读取。

参考实现：见第 3.1 节的 `action.yml`，三个 job 的 steps 各写一行 `uses: ./.github/actions/pnpm-setup`。

自检：删掉其中一个 job 的重复安装步骤后 CI 是否照常通过？故意去掉 `shell` 能否在 push 前被 `act` 或校验工具发现？

### 练习 3：给现有工作流加三道保险（加固题）

任务：拿你仓库里现成的 `deploy.yml`，完成三件事：(1) 工作流级 `permissions` 收到只读；(2) 所有第三方 action 换成完整 SHA 并加版本注释；(3) 部署 job 改用 OIDC 角色。

提示：`permissions` 分层与「只能收紧不能升高」语义；OIDC 需要云侧先建好角色与信任策略，工作流侧只需 `id-token: write` + 云厂商登录 action。

参考实现：

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:            # 兜底：整条工作流只读
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # 仅部署 job 需要 OIDC
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: aws-actions/configure-aws-credentials@<完整提交 SHA> # v4，SHA 从仓库 Releases 页查询
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-deploy
          aws-region: cn-north-1
      - run: ./deploy.sh
```

自检：把部署 job 里的 `id-token: write` 删掉再跑，应该以权限报错失败——证明权限约束真实生效，而不是纸面配置。

## 11. 下一步

- 回看工作流全貌与可重用工作流的入门位置：[GitHub Actions 持续集成与部署](/github/370-GitHubActionsCICD)
- 把「什么时候跑」补齐：[Actions 触发机制](/github/380-ActionsTrigger)
- OIDC 与环境的完整部署实践：[Actions 环境与部署](/github/420-ActionsEnvironmentDeploy)
- 让 SHA 固定可持续：[Dependabot 依赖自动更新](/github/280-Dependabot)

### 官方文档

- Reusing workflows：https://docs.github.com/zh/actions/how-tos/reuse-automations/reuse-workflows
- Creating a composite action：https://docs.github.com/zh/actions/how-tos/write-workflows/create-composite-action
- Security hardening for GitHub Actions：https://docs.github.com/zh/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
