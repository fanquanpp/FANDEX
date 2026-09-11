---
order: 110
title: 开发环境验证清单
module: 'shell'
category: 工具链
difficulty: beginner
description: 装完所有工具后逐项验证：命令、版本、路径、网络与版本管理是否一切正常。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/010-DevEnvSetup'
  - 'shell/100-EnvVarPath'
  - 'shell/120-TroubleshootingGuide'
prerequisites:
  - 'shell/020-WindowsEnvConfigTutorial'
  - 'javascript/520-NodeJsInstall'
  - 'git/020-GitInstallConfig'
---

## 0. 这份清单怎么用

打开终端（Windows 用 PowerShell 或 WSL，macOS/Linux 用自带终端），逐条执行下面的命令。每一条都有“预期结果”；如果输出与预期不符，跳到 `shell/120-TroubleshootingGuide` 找对应问题。

建议按顺序勾选：

- [ ] 1. 终端能打开并执行命令；
- [ ] 2. VS Code 安装并可启动；
- [ ] 3. Node.js 与 npm 可用；
- [ ] 4. Python 与 pip 可用；
- [ ] 5. Git 可用且已配置身份；
- [ ] 6. Docker 可用（可选）；
- [ ] 7. 包管理器镜像生效；
- [ ] 8. 版本管理工具（nvm/pyenv）可用（可选）；
- [ ] 9. PATH 配置在“新开的终端”中生效。

## 1. 基础命令

```bash
echo hello
pwd
```

**预期**：第一行输出 `hello`；第二行输出当前目录路径。如果 `echo` 都失败，说明终端本身有问题，先解决终端。

## 2. VS Code

```bash
code --version
```

**预期**：输出类似 `1.9x.x` 的版本号。如果提示 `code 不是内部或外部命令`（Windows）或 `command not found`（macOS/Linux），说明安装时没有勾选“添加到 PATH”，或在 macOS 上未运行“Shell Command: Install 'code' command in PATH”。

## 3. Node.js 与 npm

```bash
node -v
npm -v
```

**预期**：`node -v` 输出当前 LTS 线版本（如 `v22` 或 `v24`）；`npm -v` 输出 `10+`。若提示找不到命令，检查是否安装了 Node.js，或 PATH 是否包含 Node 目录（`shell/100-EnvVarPath`）。

## 4. Python 与 pip

Windows 下先试：

```powershell
python --version
py --version
```

macOS/Linux：

```bash
python3 --version
python3 -m pip --version
```

**预期**：输出 Python 3.x 版本号。Windows 上 `python` 与 `py` 至少有一个可用；若都没有，用 Microsoft Store 安装 Python 3。

## 5. Git 与身份配置

```bash
git --version
git config --global user.name
git config --global user.email
```

**预期**：第一条输出 git 版本；后两条输出你配置的姓名和邮箱（非空）。若后两条为空，执行：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

## 6. Docker（可选）

```bash
docker --version
docker info
```

**预期**：`docker --version` 有输出；`docker info` 不报连接错误（Windows 需先启动 Docker Desktop，并确认 WSL2 后端已启用）。

## 7. 镜像源验证

```bash
npm config get registry
pip config list
```

**预期**：npm 输出国内镜像地址（如 `https://registry.npmmirror.com`）或官方源；pip 输出镜像配置（如有）。npm 源配置见 `javascript/540-NpmManager`；Python 虚拟环境与 pip 源见 `python/040-PythonVirtualEnv`。

## 8. 版本管理工具（可选）

```bash
nvm -v        # nvm 用户
pyenv --version  # pyenv 用户
```

**预期**：输出对应版本号。注意 nvm 是 shell 函数，`nvm` 命令只在交互式 shell 中可用；如果“命令找不到”，先重开终端。

## 9. PATH 生效验证

修改 PATH 后，**必须新开一个终端窗口**再验证：

```bash
which node     # macOS/Linux
where.exe node # Windows PowerShell
```

**预期**：输出 node 的安装路径。如果仍是旧路径或找不到，说明 PATH 配置未保存或未重开终端。

## 10. 自动化验证脚本

逐条手敲适合第一次配置；换机器或带新人时，用一个脚本自动跑完整套检查：

```bash
#!/usr/bin/env bash
# check-env.sh - 开发环境体检脚本（bash 3+ 兼容，三平台通用）
set -u

pass=0
fail=0

# check <名称> <命令...>：命令成功记 PASS，失败记 FAIL
check() {
    local name="$1"; shift
    if "$@" > /dev/null 2>&1; then
        echo "PASS  $name"
        pass=$((pass + 1))
    else
        echo "FAIL  $name"
        fail=$((fail + 1))
    fi
}

check "终端可用"        echo hello
check "VS Code"         code --version
check "Node.js"         node -v
check "npm"             npm -v
check "Python"          python3 --version
check "pip"             python3 -m pip --version
check "Git"             git --version
check "Git 身份已配置"  git config --global user.name

echo "-----------------------------"
echo "结果: $pass 通过, $fail 未通过"
[ "$fail" -eq 0 ] && echo "环境就绪，可以开始学习" || echo "请按上方 FAIL 项排查"
exit "$fail"   # 退出码 = 失败数，可接入 CI
```

```text
预期输出：
PASS  终端可用
PASS  VS Code
PASS  Node.js
FAIL  Git 身份已配置
-----------------------------
结果: 3 通过, 1 未通过
请按上方 FAIL 项排查
```

脚本要点：`check` 函数把"跑命令 + 报结果"封装起来；`exit "$fail"` 让脚本可以接进 CI 或 Makefile；需要检查 Docker 等可选工具时按同一模式加一行即可。

## 11. 全部通过后

全部打勾后，你的开发环境已经可以开始学习写代码。建议把本清单收藏，换新电脑时按同一流程重建环境。

> 一句话记住验证：版本命令（`node -v` 等）是环境健康的体温计；命令找不到时，先重开终端，再查 PATH。

## 扩展学习

- 环境变量与 PATH：`shell/100-EnvVarPath`；
- 卡住排查：`shell/120-TroubleshootingGuide`；
- 平台配置：`shell/020-WindowsEnvConfigTutorial`、`shell/030-MacOSEnvConfigTutorial`、`shell/040-LinuxEnvConfigTutorial`。
