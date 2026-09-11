---
order: 30
title: Deno 权限模型与安全实践
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: 默认拒绝的权限体系、--allow 系列参数、权限集固化与供应链安全清单。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/010-DenoOverview'
  - 'nestjs/070-DenoWebFrameworkDeploy'
  - 'cybersecurity/010-SecurityBasicsDefense'
prerequisites:
  - 'nestjs/020-DenoQuickStart'
---

## 0. 一句话理解

> Deno 的默认状态是"什么都不能做"：读文件、写网络都要在运行命令里显式授权；权限最小化是 Deno 最重要的安全特性。

想象你雇了一个新员工（脚本）：Node 的做法是第一天就给他全公司门禁卡；Deno 的做法是给一张白卡，他要进机房、进档案室，得逐项申请、你逐项批——批了什么，他能去哪就一清二楚。

## 1. 权限报错体验

```typescript
// read_file.ts
const content = await Deno.readTextFile("secret.txt")
console.log(content)
```

```bash
deno run read_file.ts
```

```text
error: PermissionDenied: Requires read access to "secret.txt", run again with the --allow-read flag
    at file:///D:/demo/read_file.ts:1:24
```

**讲解：**

1. 直接运行会报错：报错信息同时告诉你"缺什么权限"和"加什么参数"，照抄即可。
2. 这是"默认拒绝"的设计：即使脚本被恶意第三方依赖控制，它也无法悄悄读取你的文件。
3. 相比 Node.js 默认全开，Deno 把"要不要给权限"变成了每次运行时的显式决定——权限清单本身就是一份安全审计文档。

## 2. 授权参数全景

```bash
# 只允许读当前目录
deno run --allow-read=. read_file.ts

# 只允许访问指定域名
deno run --allow-net=api.example.com fetch_data.ts

# 允许读写文件与网络（生产环境按需最小化，不要图省事用 --allow-all）
deno run --allow-read --allow-write --allow-net app.ts
```

| 参数 | 控制的能力 | 典型收紧写法 |
| --- | --- | --- |
| `--allow-read`（`-R`） | 读文件 | `--allow-read=./data` 只读数据目录 |
| `--allow-write`（`-W`） | 写文件 | `--allow-write=./output` 只写输出目录 |
| `--allow-net`（`-N`） | 网络访问 | `--allow-net=localhost:8000` 只听本地端口 |
| `--allow-env`（`-E`） | 环境变量 | `--allow-env=PORT,APP_ENV` 只放行白名单变量 |
| `--allow-run` | 启动子进程 | `--allow-run=git` 只允许 git |
| `--allow-sys`（`-S`） | 系统信息（内存、网卡等） | `--allow-sys=osInfo` 按需放行 |
| `--allow-import` | 从网络下载代码（依赖） | `--allow-import=jsr.io,npmjs.com` 限定源 |
| `-A` / `--allow-all` | 全部权限 | 本地临时调试专用，生产禁用 |

**讲解：**

1. `--allow-read=.` 的 `=.` 表示只读当前目录，比无参数的全盘读取安全得多；`--allow-net` 支持同时列多个"域名:端口"。
2. 括号里是缩写形式（如 `-R`、`-N`、`-A`），单独使用时命令更短；团队项目建议写全称——可读性优先，权限清单是给人审的。
3. `--allow-import` 值得单独强调：它管的是"允许从哪些地方下载代码"，把依赖来源限定到 jsr.io 与 npmjs.com，能挡住从陌生站点拉代码的供应链攻击。
4. 运行中遇到未授权操作时，Deno 会在终端弹交互式授权询问；CI 等非交互环境加 `--no-prompt`，未经授权直接失败而不是挂起等待。

## 3. 权限写进配置：权限集（Deno 2.5+）

权限参数敲久了又长又容易漏，Deno 2.5 起可以把权限固化进 deno.json：

```json
// deno.json —— 权限集集中管理，命令行只留一个任务名
{
  "permissions": {
    "read": ["./assets", "./data"],
    "net": ["localhost:8000", "api.example.com"],
    "env": ["PORT", "APP_ENV"]
  },
  "tasks": {
    "dev": "deno run --watch server.ts",
    "start": "deno run server.ts"
  }
}
```

**讲解：**

1. 顶层 `permissions` 字段对本项目所有 `deno run/task/test` 生效：`deno task start` 不带任何 `--allow` 参数，权限照样生效。
2. 收益有三层：命令行变短、权限清单进版本库可评审、改权限的提交在 code review 里一目了然。
3. 需要临时突破权限时，仍可在命令行叠加 `--allow-write=./tmp`——配置是默认值，命令行是覆盖项。

## 4. 敏感信息：密钥不进代码

```bash
# Windows PowerShell 设置环境变量
$env:DB_PASSWORD = "s3cr3t"

# 运行时显式授权读取环境变量
deno run --allow-env=DB_PASSWORD app.ts
```

```typescript
// app.ts
const password = Deno.env.get("DB_PASSWORD")
if (!password) {
  throw new Error("缺少 DB_PASSWORD 环境变量")
}
```

**讲解：**

1. `Deno.env.get` 读取环境变量，密钥放在环境变量或密钥管理服务（如云厂商 Secret Manager）里，绝不写进代码与 git。
2. `--allow-env=DB_PASSWORD` 只放行这一个变量，其他环境变量脚本读不到；权限系统让"环境变量"这个全局口袋也变成了白名单。
3. `if (!password) throw` 是"fail fast"：缺少必需配置时立即失败，而不是带着空密码运行。

## 5. 依赖供应链安全

```bash
deno install             # 按 deno.json/锁文件安装依赖并生成 deno.lock
deno check --all         # 全项目类型检查
deno audit               # 扫描依赖已知漏洞（Deno 2.6+，类似 npm audit）
deno audit fix           # 自动升级到修复版本（Deno 2.8+）
deno install --frozen    # 严格按锁文件安装，版本不一致直接报错（CI 用）
```

**讲解：**

1. `deno install` 根据 import 生成锁文件（deno.lock），锁定每个依赖的精确版本与校验和，后续安装一致复现。
2. `deno check --all` 对全项目做类型检查，错误在 CI 里暴露而不是运行时。
3. `deno audit` 自 Deno 2.6 提供，对照 GitHub CVE 数据库扫描依赖漏洞（可加 `--socket` 做更深度的供应链分析）；2.8 补充的 `audit fix` 能自动升级到修复版本。应纳入 CI 流程。
4. 锁文件必须提交进仓库；配合 `--frozen`，"团队、CI、生产三处依赖完全一致"才有制度保障。
5. 就算某个依赖被投毒，它依然受权限系统约束——读不到未授权的文件、连不了未授权的网络。权限模型是最后一道兜底防线。

## 6. 生产环境安全清单

- 用最小权限运行：只给 `--allow-net=你的域名`、`--allow-env=必需变量`，权限集写进 deno.json 固化；
- 容器内以非 root 用户运行，避免容器逃逸后获得 root；
- 密钥放 Secret Manager，轮换机制 + 审计日志；
- 依赖锁文件提交 git，CI 里跑 `deno audit` 与 `deno check`，安装用 `--frozen`；
- 不信任任何第三方模块的权限请求：权限永远由你的 `deno run` 命令决定，依赖自己"申请"不来。

## 7. 常见陷阱

1. **图省事 `-A` 上生产**：全权限让安全模型形同虚设，等于回到了 Node 的默认状态。正确姿势：本地调试可以 `-A`，生产命令按最小权限枚举并写进 tasks。
2. **权限粒度太粗**：`--allow-read` 不带值等于可读全盘；至少限定到目录，敏感目录（密钥、配置）绝不入列。
3. **CI 里权限弹窗挂死**：非交互环境忘记 `--no-prompt`，任务卡在等待授权。CI 的 deno 命令统一加 `--no-prompt`。
4. **锁文件冲突后删掉重来**：等价于一次全量依赖升级。正确做法是解决冲突后保留已有条目，只让新增依赖重新解析，再用 `deno install --frozen` 验证。
5. **以为 `--allow-env` 是"能读所有环境变量"才安全**：恰恰相反，环境变量里常混着云平台的临时凭证；白名单越短，脚本被攻破后的爆炸半径越小。

## 8. 动手试试

1. 写一个脚本读取 `TEMP`/`TMP` 环境变量，分别用 `--allow-env=TEMP` 与不带参数运行，观察差异。
2. 用 `--allow-net=example.com` 访问 `https://example.com` 成功、再访问 `https://httpbin.org` 失败，体会域名白名单的作用。
3. 在项目里启用 deno.lock（`deno install`），打开锁文件看看每个依赖记录了什么；再把权限改写成 deno.json 的 `permissions` 字段。
4. 跑一次 `deno audit`，确认当前依赖没有已知漏洞，把这个命令加进你的 CI 配置。

## 9. 本篇小结

**初学者要点：**

- 权限按需给：`--allow-read=.` 只读当前目录、`--allow-net=域名` 只连指定主机；密钥走环境变量，锁文件保供应链。
- 权限报错不是 bug：照报错提示补参数；非交互环境记得 `--no-prompt`。
- `-A` 是调试快捷键，不是生产配置。

**进阶注意：**

- Deno 2.5+ 的 `permissions` 配置让权限清单随代码演进、随版本评审，是团队项目固化的首选方式。
- 供应链三件套——锁文件入库、`deno install --frozen`、`deno audit`（2.6+）——构成依赖安全的最低配置，缺一环就少一层保障。
- 权限模型与依赖来源控制（`--allow-import`）联动，才能覆盖"代码怎么进来、数据怎么出去"两个方向。
