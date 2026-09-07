---
order: 30
title: Deno 权限模型与安全实践
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: 默认拒绝的权限体系、--allow 系列参数、敏感信息管理与生产环境安全清单。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/001-DenoOverview'
  - 'nestjs/007-DenoWebFrameworkDeploy'
  - 'cybersecurity/001-SecurityBasicsDefense'
prerequisites:
  - 'nestjs/002-DenoQuickStart'
---

## 0. 一句话理解

> Deno 的默认状态是"什么都不能做"：读文件、写网络都要在运行命令里显式授权；权限最小化是 Deno 最重要的安全特性。

## 1. 权限报错体验

```typescript
// read_file.ts
const content = await Deno.readTextFile("secret.txt")
console.log(content)
```

```bash
deno run read_file.ts
```

**讲解：**

1. 直接运行会报错：`PermissionDenied: Requires read access to "secret.txt"`。
2. 这是"默认拒绝"的设计：即使脚本被恶意第三方依赖控制，它也无法悄悄读取你的文件。
3. 相比 Node.js 默认全开，Deno 把"要不要给权限"变成了每次运行时的显式决定。

## 2. 授权参数

```bash
# 只允许读当前目录
deno run --allow-read=. read_file.ts

# 只允许访问指定域名
deno run --allow-net=api.example.com fetch_data.ts

# 允许读写文件与网络（生产环境按需最小化，不要图省事用 --allow-all）
deno run --allow-read --allow-write --allow-net app.ts
```

**讲解：**

1. `--allow-read=.` 的 `=.` 表示只读当前目录，比无参数的全盘读取安全得多。
2. `--allow-net=域名` 限制网络请求只到指定主机，防止脚本外联未知服务器。
3. 权限可以叠加；`-A`（`--allow-all`）适合本地临时调试，生产环境禁止使用。

## 3. 敏感信息：密钥不进代码

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

1. `Deno.env.get` 读取环境变量，密钥放在环境变量或密钥管理服务（如 Vercel/云厂商 Secret Manager）里，绝不写进代码与 git。
2. `--allow-env=DB_PASSWORD` 只放行这一个变量，其他环境变量脚本读不到。
3. `if (!password) throw` 是"fail fast"：缺少必需配置时立即失败，而不是带着空密码运行。

## 4. 依赖供应链安全

```bash
deno install
deno check --all
deno audit
```

**讲解：**

1. `deno install` 根据 import 生成锁文件（deno.lock），锁定每个依赖的精确版本与校验和，后续安装一致复现。
2. `deno check --all` 对全项目做类型检查，错误在 CI 里暴露而不是运行时。
3. `deno audit` 扫描依赖漏洞（Deno 2.1+ 提供），类似 `npm audit`，应纳入 CI 流程。

## 5. 生产环境安全清单

- 用最小权限运行：只给 `--allow-net=你的域名`、`--allow-env=必需变量`；
- 容器内以非 root 用户运行，避免容器逃逸后获得 root；
- 密钥放 Secret Manager，轮换机制 + 审计日志；
- 依赖锁文件提交 git，CI 里跑 `deno audit` 与 `deno check`；
- 不信任任何第三方模块的权限请求：权限永远由你的 `deno run` 命令决定。

## 6. 动手试试

1. 写一个脚本读取系统临时目录（`Deno.env.get("TEMP")`），分别用 `--allow-env` 与不带参数运行，观察差异。
2. 用 `--allow-net=example.com` 访问 `https://example.com` 成功、再访问 `https://httpbin.org` 失败。
3. 在项目里启用 deno.lock（`deno install`），查看锁文件内容。

## 7. 一句话记住

> 权限按需给：`--allow-read=.` 只读当前目录、`--allow-net=域名` 只连指定主机；密钥走环境变量，锁文件保供应链。
