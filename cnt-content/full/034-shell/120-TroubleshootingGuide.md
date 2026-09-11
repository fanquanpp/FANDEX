---
order: 120
title: 环境配置“我卡住了”指南
module: 'shell'
category: 工具链
difficulty: beginner
description: 常见环境配置错误的集中排查手册：命令找不到、权限拒绝、端口占用、代理、乱码等。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/100-EnvVarPath'
  - 'shell/110-EnvVerificationChecklist'
prerequisites:
  - 'shell/010-DevEnvSetup'
---

## 0. 使用说明

按症状找章节：**命令找不到 → 1**；**权限被拒 → 2**；**下载慢/失败 → 3**；**端口占用 → 4**；**中文乱码 → 5**；**WSL 相关 → 6**；**改了配置不生效 → 7**。

动手前的通用方法论（三步定位法）：

1. **看清报错原文**：终端报错的第一行/最后一行往往直接写着原因（`command not found`、`Permission denied`、`EADDRINUSE`），照着关键词搜比"我的电脑坏了"有效一万倍；
2. **区分"没装"还是"没找到"**：`--version` 都跑不起来多半是没装或 PATH 问题，能跑但行为异常是配置问题；
3. **一次只改一个变量**：改一处、验证一次，同时改三个地方出了问题就再也说不清是哪一步引入的。

## 1. 命令找不到（command not found / 不是内部或外部命令）

可能原因与对应解法：

1. **没安装**：先执行 `node -v` 对应的安装文档确认已安装；
2. **PATH 未包含目录**：把安装目录加入 PATH（见 `shell/100-EnvVarPath`）；
3. **没有重开终端**：PATH 修改只对新终端生效，**关掉重开**；
4. **安装时没勾选“添加到 PATH”**：重装或手动补 PATH；
5. **nvm 场景**：`nvm` 是 shell 函数，脚本（非交互）里不可用，先在交互终端安装并 `nvm use`。

## 2. 权限拒绝（Permission denied / EACCES）

```bash
# macOS/Linux：给脚本加执行权限
chmod +x setup-linux.sh
# 再用普通用户执行，避免 sudo 安装到系统目录
./setup-linux.sh
```

- Linux 安装 npm 全局包报 EACCES：改用 nvm 管理 Node，避免用 `sudo npm`；
- macOS 打开未知应用被 Gatekeeper 拦截：系统设置 → 隐私与安全性 → 仍要打开；或 `xattr -dr com.apple.quarantine 应用路径`；
- Windows 执行 ps1 脚本被策略拦截：以管理员身份运行 PowerShell 后执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`，再运行脚本。

## 3. 下载慢 / 超时 / 镜像失效

1. 确认镜像地址可访问（浏览器打开试试）；
2. npm 换源：`npm config set registry https://registry.npmmirror.com`；
3. pip 换源：`pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple`；
4. 公司/校园网需要代理时：配置 npm 代理 `npm config set proxy http://127.0.0.1:端口`，或设置系统代理后重试；
5. GitHub 克隆慢或失败：优先使用官方加速方案（如 `git clone` 时改用 SSH），或改用可信镜像；第三方 URL 改写代理会经手你的代码与凭据，仅在可信环境按需使用。

## 4. 端口占用（EADDRINUSE / 端口被占用）

```bash
# macOS/Linux 查找占用 3000 端口的进程
lsof -i :3000
kill -9 <PID>

# Windows PowerShell 查找与结束
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

也可以直接换端口启动（如 `npm run dev -- --port 3001`）。

## 5. 中文乱码

- Windows PowerShell 乱码：`chcp 65001` 切换到 UTF-8，或设置终端默认编码；
- 文件乱码：确认文件保存为 UTF-8（VS Code 右下角编码栏）；
- 终端显示乱码：改用 Windows Terminal，或安装中文字体（如 Cascadia Code + 微软雅黑）；
- Linux 终端中文变方块：安装中文字体（如 `sudo apt install fonts-noto-cjk`）。

## 6. WSL 相关（Windows）

- **虚拟化未开启**：任务管理器 → 性能 → CPU 查看“虚拟化”；BIOS 中开启 Intel VT-x / AMD SVM；
- **WSL 版本过低**：`wsl --update` 更新内核；`wsl --set-default-version 2`；
- **WSL 与 Windows 文件互访慢**：项目放在 WSL 内部文件系统（`~/`），不要放在 `/mnt/c/`；
- **Docker Desktop 检测不到 WSL2**：设置 → Resources → WSL Integration 勾选发行版；
- **安装报错 0x80070003 等**：先启用“适用于 Linux 的 Windows 子系统”与“虚拟机平台”两个功能，重启后再 `wsl --install`。

## 7. 改了配置不生效

1. **重开终端**（90% 的情况）；
2. 确认改的是”当前用户”而不是临时会话（如 PowerShell 里 `$env:Path=...` 只在当前窗口有效）；
3. 确认配置文件语法正确：`.zshrc`/`.bashrc` 里写错会静默失败，执行 `source ~/.zshrc` 看报错；
4. 用 `which`/`where` 确认实际解析到哪个路径。

```bash
# 验证 PATH 里到底有没有某个目录
echo “$PATH” | tr ':' '\n' | grep -n “node”   # 逐行列出含 node 的 PATH 条目

# 验证命令解析到哪个可执行文件（同名命令排查）
type -a node        # bash/zsh：列出所有同名命中，第一个优先生效
where.exe node      # Windows
```

## 8. 仍然解决不了

把以下信息整理好再求助（贴到搜索或社区提问）：

- 操作系统与版本；
- 完整报错信息（不要只贴结论）；
- 你执行过的命令；
- `node -v`、`git --version` 等验证输出；
- 已尝试过的解决方案。

> 一句话记住排查：先重开终端，再看 PATH，再看权限；报错全文比“不行”两个字有用得多。

## 扩展学习

- 环境变量：`shell/100-EnvVarPath`；
- 验证清单：`shell/110-EnvVerificationChecklist`；
- 平台配置：`shell/020-WindowsEnvConfigTutorial`、`shell/030-MacOSEnvConfigTutorial`、`shell/040-LinuxEnvConfigTutorial`。
