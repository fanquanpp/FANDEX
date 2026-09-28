---
order: 530
title: Pulumi IaC 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'Pulumi 学习笔记：用熟悉的编程语言写基础设施——项目与栈、预览部署、密钥、导入存量资源与 CI 集成的完整路径。'
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cloud-computing/420-TerraformBasic'
  - 'cloud-computing/430-TerraformStateModule'
  - 'cloud-computing/410-IaC'
prerequisites:
  - 'cloud-computing/410-IaC'
  - 'cloud-computing/420-TerraformBasic'
---

## 场景

你已经用 Terraform 管过一轮基础设施（见 [Terraform 基础](/cloud-computing/420-TerraformBasic)），但团队里写业务的是 TypeScript/Python 工程师，HCL 对他们是第二门语言；而且你想要的东西 Terraform 给得别扭——循环里写条件逻辑、把基础设施抽象成可复用类、单元测试。Pulumi 就是"用通用编程语言写 IaC"的答案：概念与 Terraform 同源（声明式、状态文件、plan/apply），语言换成你天天写的那种。

本篇按"建项目 → 分栈 → 写代码 → 部署 → 接管存量 → 进 CI"的顺序走。

## 第零步：安装与后端选择

```bash
# Linux/macOS 安装
curl -fsSL https://get.pulumi.com | sh
# Windows
winget install pulumi.pulumi

pulumi version
```

第一个要想清楚的决定：**状态放哪**。Pulumi 的状态（state）记录"我管理着哪些资源"，和 Terraform state 一回事，丢了或坏了都很痛：

```bash
# 默认：Pulumi 官方云服务托管状态（免费档够个人与中小团队用）
pulumi login

# 本地文件后端：个人实验用，注意换机器状态就没了
pulumi login file://~/.pulumi

# 自托管后端：企业内网把状态存到 S3/Azure Blob 或自建服务
pulumi login https://pulumi.example.com
```

决策依据：练手用本地；正式项目至少官方云或对象存储后端，并且**把后端当作受保护资产**（有备份、有权限控制）。

## 第一步：创建项目

```bash
# 交互式创建 AWS + TypeScript 项目（语言按团队选：aws-python/gcp-typescript/azure-typescript...）
pulumi new aws-typescript --name my-app --description "My AWS App"

# 从示例仓库直接起步
pulumi new https://github.com/pulumi/examples/tree/master/aws-py-eks

# 看看还有哪些模板
pulumi new --list-templates
```

生成的目录里最关键的是 `Pulumi.yaml`（项目元数据）和 `index.ts`（基础设施代码入口）。写一段最简单的代码感受差异——这就是普通 TypeScript，循环、函数、类型全部可用：

```typescript
// index.ts
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("my-bucket");
const table = new aws.dynamodb.Table("my-table", {
  attributes: [{ name: "id", type: "S" }],
  hashKey: "id",
  billingMode: "PAY_PER_REQUEST",
});

export const bucketName = bucket.id;
export const tableName = table.id;
```

## 第二步：栈——同一个代码，多个环境

Pulumi 的"栈"（stack）= 一份独立的状态 + 一套独立的配置，对应 dev/staging/prod 环境。这是它的核心工作单元：

```bash
pulumi stack init dev          # 创建开发栈
pulumi stack init production   # 创建生产栈
pulumi stack ls                # 列出项目所有栈
pulumi stack                   # 当前在哪个栈
pulumi stack select dev        # 切换栈
pulumi stack rm staging        # 删除栈（要先清空其中的资源）
```

每个栈的配置存在 `Pulumi.<stack>.yaml` 里，配置读写：

```bash
# 设置区域配置（带云前缀的键是 provider 的配置）
pulumi config set aws:region us-east-1

# 敏感配置必须 --secret：值会加密后才落盘
pulumi config set dbPassword "MyPass123!" --secret

pulumi config                     # 列出全部配置（密钥显示为密文）
pulumi config --show-secrets      # 明文查看（谨慎，别在录屏/共享终端用）
pulumi config get aws:region      # 取单个
pulumi config rm dbPassword       # 删除
```

坑点：不用 `--secret` 存的密码就是明文躺在 YAML 里进 Git——这个错误一旦提交，换密码也只是"新密码安全了"，历史里旧的还在。

## 第三步：预览与部署

Pulumi 的部署循环和 Terraform 的 plan/apply 同构：

```bash
# 预览：算出将要发生什么（不实际动手）
pulumi preview

# 部署：展示同样的计划，确认后执行
pulumi up

# 显示更详细的字段级 diff
pulumi up --diff

# 指定栈 + 免交互确认（CI 里用）
pulumi up --stack production --yes
```

`pulumi up` 输出里每个资源会标 `+`（新建）、`~`（原地更新）、`-`（删除）或 `+-`（替换）。**替换（replace）是危险操作**：数据库实例被替换意味着数据没了——看到 replace 计划先停手查 `--diff`。

```bash
# 部署完成后读取输出值
pulumi stack output
pulumi stack output instanceId
pulumi stack output --json

# 销毁当前栈的全部资源
pulumi destroy
```

跨栈引用（比如网络栈给应用栈提供 VPC ID）在代码里做：

```typescript
import * as pulumi from "@pulumi/pulumi";

const infraStack = new pulumi.StackReference("myorg/infra/prod");
const vpcId = infraStack.getOutput("vpcId");
```

## 第四步：接管存量资源

迁移的经典难题：东西已经在云上跑着，怎么纳入管理？答案是 `pulumi import`——把云端资源的登记进状态，不改不删：

```bash
# 手工导入一个已有 EC2 实例
pulumi import aws:ec2/instance:Instance my-instance i-1234567890abcdef0

# 更实用：导入的同时生成对应代码，贴回项目即可
pulumi import aws:ec2/instance:Instance my-instance i-1234567890abcdef0 --out imported

# 查看状态里登记了哪些资源（URN + 云端 ID）
pulumi stack --show-ids
```

导入后先跑 `pulumi preview`：理想输出是"无变更"（代码与云端一致）；有 diff 就调整代码直到一致，才算接管完成。

## 第五步：状态急救——知道但少用

状态操作是"急诊科"工具：只在状态与云端不一致（手工删了资源、更新卡死）时使用：

```bash
# 从状态移除资源登记（云端资源不动，Pulumi 从此不管它）
pulumi state delete "urn:pulumi:dev::my-app::aws:ec2/instance:Instance::my-instance"

# 取消卡住的进行中更新（更新进程崩了状态会锁定）
pulumi cancel

# 导出/导入状态文件做手工修复（改之前务必备份）
pulumi stack export --file state.json
```

规矩：动 state 前先 export 备份；`state delete` 后云端资源成了"孤儿"，要么手工删掉要么重新 import。

## 第六步：用代码能力做工程化

### 策略即代码（Policy Pack）

把"禁止裸公网 EC2"这类合规规则写成代码，preview/up 时自动检查：

```typescript
// policies/index.ts
import { PolicyPack } from "@pulumi/policy";

new PolicyPack("my-policy-pack", {
  policies: [
    {
      name: "no-public-ec2",
      description: "禁止 EC2 实例直接关联公网 IP",
      enforcementLevel: "mandatory",
      validateResource: (args, reportViolation) => {
        if (args.type === "aws:ec2/instance:Instance") {
          if (args.props.associatePublicIpAddress) {
            reportViolation("EC2 不应直接关联公网 IP");
          }
        }
      },
    },
  ],
});
```

```bash
# 预览时检查违规
pulumi preview --policy-pack ./policies

# 部署时强制（mandatory 违规直接阻断）
pulumi up --policy-pack ./policies --policy-pack-enforcement-level mandatory
```

### 组件资源：基础设施的"函数"

把一套固定组合（安全组 + 实例）抽象成类，像业务代码一样复用：

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class WebServer extends pulumi.ComponentResource {
  public readonly instanceId: pulumi.Output<string>;

  constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
    super("my:module:WebServer", name, {}, opts);

    const sg = new aws.ec2.SecurityGroup(`${name}-sg`, {
      ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
    }, { parent: this });

    const instance = new aws.ec2.Instance(`${name}-instance`, {
      instanceType: "t3.micro",
      ami: "ami-0c55b159cbfafe1f0",
      vpcSecurityGroupIds: [sg.id],
    }, { parent: this });

    this.instanceId = instance.id;
    this.registerOutputs({ instanceId: this.instanceId });
  }
}
```

```typescript
import { WebServer } from "./webserver";

const web1 = new WebServer("web1");
const web2 = new WebServer("web2");
export const web1Id = web1.instanceId;
```

### 重命名与重构：aliases

状态按资源的"名字"识别资源。直接改代码里的资源名，Pulumi 会当成"删旧建新"；用 `aliases` 声明"这资源以前叫什么"，就能原地改名：

```typescript
const bucket = new aws.s3.Bucket("new-name", {
  // 其他属性
}, {
  aliases: [{ name: "old-name" }],
});

// 类型迁移、换父资源同理
const child = new SomeResource("child", { /* ... */ }, {
  parent: newParent,
  aliases: [{ parent: oldParent }],
});
```

这是 Pulumi/Terraform 共有的痛点，规则一句话：**改名字必须配别名，否则就是删库级事故**。

## 第七步：进 CI/CD

以 GitHub Actions 为例。密钥型方式最直观：

```yaml
# .github/workflows/pulumi.yml
name: Pulumi
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

更好的方式是 OIDC 免密钥：GitHub Actions 通过身份令牌换取云角色，仓库里不存任何 AWS 密钥。本仓库（FANDEX）的 GitHub Pages 部署工作流就在 `permissions` 里声明了 `id-token: write` 走的正是这条路——同样的模式接到 AWS：

```yaml
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: us-east-1
      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
```

CI 侧的命令行注意点：`pulumi login --token pul-xxx` 非交互登录；部署命令用 `pulumi up --yes --non-interactive` 保证不卡在确认提示上。

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 密钥没加 `--secret` | 明文进 Git 历史 | 敏感值一律 `--secret`；泄漏后轮换密码 |
| 改资源名不加 alias | preview 显示删旧建新 | 重命名必配 aliases，preview 确认无 replace |
| 状态后端只有本地 | 换机/磁盘故障状态丢失 | 用云后端并备份 |
| `state delete` 当删除命令用 | 云端资源变孤儿继续计费 | 删资源用 `pulumi destroy` 或删代码后 up |
| 看到 replace 计划直接回车 | 有状态资源被重建 | `--diff` 查原因，确认可重建再继续 |
| CI 里忘加 `--yes` | 流水线卡在确认提示 | `up --yes --non-interactive` |
| provider 配置散落各处 | 区域不一致创建出跨区资源 | 区域等全局配置进 `pulumi config` |

## 自检

1. `pulumi preview` 显示某数据库将 `+-`（替换），你的处理流程是什么？
2. dev 和 production 栈的代码是同一份吗？差异存在哪里？
3. 团队有人绕过 Pulumi 手工改了安全组，下次 `pulumi up` 会发生什么？

## 练习

1. 创建项目与 dev/prod 两个栈，给两个栈设不同区域配置，各部署一个 S3 桶，用 `stack output` 分别取桶名。
2. 在控制台手工创建一个 EC2 实例，用 `pulumi import --out` 接管它，调整代码直到 preview 显示无变更。
3. 写一个 Policy Pack 禁止 S3 桶公开，构造一个公开桶验证 mandatory 级别确实阻断部署。

## 下一步

- 与 Terraform 对照选型：见 [Terraform 基础](/cloud-computing/420-TerraformBasic) 与 [Terraform 状态与模块](/cloud-computing/430-TerraformStateModule)。
- IaC 的整体方法论（声明式、幂等、漂移管理）见 [基础设施即代码](/cloud-computing/410-IaC)。
- 把部署串联进完整交付流水线：见 [CI/CD 流水线](/devops/140-CICDPipeline)。
