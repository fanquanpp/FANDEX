---
order: 100
title: 环境变量与 PATH
module: 'shell'
category: 工具链
difficulty: beginner
description: 环境变量概念、PATH机制、跨平台配置与常见问题排查。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/030-FunctionModular'
  - 'shell/050-IDEEditorSelection'
  - 'shell/070-PluginEcosystem'
prerequisites:
  - 'shell/010-DevEnvSetup'
---

## 1. 环境变量基础

### 1.1 什么是环境变量

环境变量是操作系统中用于存储配置信息的**键值对**，进程运行时可以读取这些变量来获取配置。每个进程都从其父进程继承环境变量，形成了一条从系统启动到当前进程的环境变量链。

```
KEY=VALUE
HOME=/home/user
PATH=/usr/local/bin:/usr/bin:/bin
LANG=en_US.UTF-8
```

环境变量的核心作用：

- **配置传递**：无需修改代码即可改变程序行为
- **路径声明**：告诉系统去哪里查找可执行文件
- **密钥管理**：存储 API Key 等敏感信息（不应硬编码）
- **行为控制**：控制程序的调试模式、日志级别等

### 1.2 环境变量的分类

| 类型         | 作用域          | 示例                 | 说明           |
| :----------- | :-------------- | :------------------- | :------------- |
| **系统级**   | 所有用户        | `PATH`、`SystemRoot` | 系统启动时加载 |
| **用户级**   | 当前用户        | `HOME`、`USER`       | 用户登录时加载 |
| **进程级**   | 当前进程        | `NODE_ENV`、`PORT`   | 进程运行时设置 |
| **Shell 级** | 当前 Shell 会话 | 临时变量             | 会话结束后消失 |

### 1.3 环境变量的生命周期

```
系统启动 → 加载系统级变量
    ↓
用户登录 → 加载用户级变量（~/.bashrc, ~/.zshrc 等）
    ↓
Shell 会话 → 加载 Shell 配置
    ↓
进程启动 → 继承父进程环境变量
    ↓
进程运行 → 可读取/修改自身环境变量
    ↓
进程结束 → 进程级变量消失
```

## 2. PATH 机制详解

### 2.1 PATH 的工作原理

`PATH` 是最重要的环境变量，它定义了系统查找可执行文件的**搜索路径列表**。当你在终端输入一个命令时，Shell 会按顺序在 PATH 中的每个目录里查找对应的可执行文件。

```bash
# 查看 PATH
echo $PATH
# 输出: /usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

# 查找命令的实际位置
which python3
# 输出: /usr/local/bin/python3

# 查找所有匹配的位置
where node    # Windows
which -a node # macOS/Linux
```

### 2.2 PATH 搜索流程

```
输入命令: python3
    ↓
检查是否为 Shell 内建命令？ → 是 → 执行内建命令
    ↓ 否
检查是否为别名（alias）？ → 是 → 展开别名
    ↓ 否
遍历 PATH 目录:
    /usr/local/bin/python3 → 存在？ → 执行
    /usr/bin/python3       → 存在？ → 执行
    /bin/python3           → 存在？ → 执行
    ...
    ↓ 全部不存在
报错: command not found
```

### 2.3 PATH 的安全考虑

- **顺序敏感**：PATH 中靠前的目录优先级更高，可能被恶意程序利用
- **避免包含当前目录**：不要将 `.` 加入 PATH，防止目录注入攻击
- **权限控制**：PATH 中的目录应具有适当的文件系统权限

```bash
# 危险！不要这样做
export PATH=.:$PATH

# 如果当前目录有名为 ls 的恶意脚本
# 执行 ls 时会优先运行恶意脚本而非系统 ls
```

## 3. 跨平台配置

### 3.1 Linux / macOS

**配置文件加载顺序**：

```
登录 Shell:
  /etc/profile → ~/.bash_profile → ~/.bashrc

非登录 Shell:
  ~/.bashrc

Zsh:
  /etc/zshenv → ~/.zshenv → ~/.zshrc → ~/.zlogin
```

**常用操作**：

```bash
# 查看所有环境变量
env
printenv

# 查看单个变量
echo $HOME
echo $JAVA_HOME

# 设置临时变量（仅当前会话有效）
export MY_VAR="hello"

# 追加到 PATH
export PATH="$HOME/.local/bin:$PATH"

# 永久生效：写入配置文件
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 删除变量
unset MY_VAR
```

**前置还是尾追**：把新目录放在 `$PATH` **前面**（`export PATH="$HOME/bin:$PATH"`）时，新目录里的同名命令优先命中——想用自己装的版本覆盖系统默认时用前置；放在**后面**（`export PATH="$PATH:$HOME/bin"`）时系统自带命令优先，适合只做补充、不改变默认行为的目录。两者都必须包含原值 `$PATH`，否则就是覆盖式写法（见第 6 节警示）。

### 3.2 Windows

**配置方式**：

1. **系统设置**：设置 → 系统 → 关于 → 高级系统设置 → 环境变量
2. **命令行**：

```powershell
# 查看所有环境变量
Get-ChildItem Env:

# 查看单个变量
$env:PATH
$env:JAVA_HOME

# 设置临时变量（仅当前会话）
$env:MY_VAR = "hello"

# 追加到 PATH
$env:PATH += ";C:\MyTools\bin"

# 永久设置（用户级）
[Environment]::SetEnvironmentVariable("MY_VAR", "hello", "User")

# 永久设置（系统级，需管理员权限）
[Environment]::SetEnvironmentVariable("MY_VAR", "hello", "Machine")

# 永久追加 PATH
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", "$currentPath;C:\MyTools\bin", "User")
```

### 3.3 跨平台环境变量管理

在 Node.js 项目中，推荐使用 `.env` 文件管理环境变量：

```bash
# .env 文件
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=sk-xxxxx
NODE_ENV=development
```

```javascript
// 使用 dotenv 加载
require('dotenv').config();

console.log(process.env.DATABASE_URL);
console.log(process.env.NODE_ENV);
```

**安全规则**：

- `.env` 文件必须加入 `.gitignore`，绝不提交到版本控制
- 提供 `.env.example` 作为模板，列出所需变量但不包含真实值
- 生产环境使用 CI/CD 的密钥管理功能，而非 `.env` 文件

## 4. 常见开发工具的环境变量

### 4.1 编程语言相关

| 工具        | 变量         | 作用                 |
| :---------- | :----------- | :------------------- |
| **Java**    | `JAVA_HOME`  | JDK 安装路径         |
| **Python**  | `PYTHONPATH` | Python 模块搜索路径  |
| **Node.js** | `NODE_PATH`  | Node.js 模块搜索路径 |
| **Go**      | `GOPATH`     | Go 工作空间路径      |
| **Go**      | `GOROOT`     | Go 安装路径          |
| **Rust**    | `CARGO_HOME` | Cargo 包管理器路径   |

### 4.2 代理与网络

```bash
# HTTP 代理
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1,.example.com

# npm 代理
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

## 5. 问题排查

### 5.1 常见问题

| 问题                   | 原因                   | 解决方案                    |
| :--------------------- | :--------------------- | :-------------------------- |
| `command not found`    | 可执行文件不在 PATH 中 | 将其所在目录加入 PATH       |
| `permission denied`    | 文件无执行权限         | `chmod +x filename`         |
| 变量设置后不生效       | 未 source 配置文件     | `source ~/.bashrc`          |
| Windows 路径分隔符错误 | 使用了 `/` 而非 `;`    | Windows 用 `;`，Unix 用 `:` |

### 5.2 调试技巧

```bash
# 检查命令的实际路径
type -a python3    # 显示所有匹配位置
command -v node    # 显示第一个匹配位置

# 检查环境变量是否已设置
[ -z "$JAVA_HOME" ] && echo "未设置" || echo "已设置: $JAVA_HOME"

# 查看进程的环境变量
cat /proc/$PID/environ | tr '\0' '\n'  # Linux
```

## 6. 跨平台操作速查表

前文按概念讲机制；这一节按「要做什么」集中列出三平台的对应命令，供回头翻查。看懂原理的读者把它当索引，没看懂的先回到第 1、2、3 节。

| 要做的事 | CMD | PowerShell | bash/zsh |
| :--- | :--- | :--- | :--- |
| 列出全部环境变量 | `set` | `Get-ChildItem Env:` | `env` 或 `printenv` |
| 查看单个变量 | `echo %PATH%` | `$env:PATH` | `echo "$PATH"` |
| 临时设置（仅当前会话） | `set MY_VAR=hello` | `$env:MY_VAR = "hello"` | `export MY_VAR=hello` |
| 永久设置用户变量 | `setx JAVA_HOME "C:\Program Files\Java\jdk-21"` | `[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Java\jdk-21", "User")` | `echo 'export JAVA_HOME=/usr/lib/jvm/java-21' >> ~/.bashrc` 后 `source` |
| 永久设置系统变量（管理员） | `setx JAVA_HOME "..." /M` | 同上，第三个参数改 `"Machine"` | 写入 `/etc/environment` 或 `/etc/profile.d/*.sh` |
| 追加 PATH（临时，尾部） | `set PATH=%PATH%;C:\my\tools` | `$env:PATH += ";C:\my\tools"` | `export PATH="$PATH:$HOME/bin"` |
| 追加 PATH（永久，尾部） | 见下方警示 | `$old = [Environment]::GetEnvironmentVariable("PATH", "User"); [Environment]::SetEnvironmentVariable("PATH", "$old;C:\my\tools", "User")` | `echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.bashrc` 后 `source` |
| 删除变量 | `reg delete "HKCU\Environment" /F /V MY_VAR`（写过的值） | `[Environment]::SetEnvironmentVariable("MY_VAR", $null, "User")` | `unset MY_VAR` |
| 重载配置生效 | 关闭重开终端 | 关闭重开终端 | `source ~/.bashrc` / `source ~/.zshrc` |

> [!warning] 两条高危操作
> 1. **别用 `setx PATH "%PATH%;C:\new" /M` 追加 PATH**：`%PATH%` 是「用户 PATH 与系统 PATH 拼接后的完整值」，写回系统变量会把用户目录项混入系统 PATH；反复执行还可能撞上 setx 约 1024 字符的截断上限，PATH 直接损坏。永久改 PATH 用图形界面（内部有拼接保护）或上面 PowerShell 读取原始值再写回的写法。
> 2. **覆盖式写 PATH（忘了拼旧值）**：`export PATH=/opt/bin` 或 `set PATH=C:\new` 会让系统连 `ls` 都找不到。任何平台追加 PATH 的写法都必须包含原值，覆盖式写法丢掉的不只是新目录，是整个命令查找链。

> 需要新目录优先级更高（覆盖同名命令）时，把新目录前置到 `$PATH` 前面，如 `export PATH="$HOME/bin:$PATH"`——前置与尾追的取舍见第 3 节要点。

## 7. 动手自检：遮住命令，说出每一步

先遮住参考答案与速查表，按题干自己写出命令，再对照。

1. 写出「在 bash 里查看 PATH、把 `~/.bin` 临时加到 PATH 最前面、再让它永久生效」的三条命令。
2. Windows 永久设置用户变量 JAVA_HOME 的两条命令（CMD 与 PowerShell 各一），并说出 `setx` 与 `$env:` 的本质区别。
3. 为什么临时变量能被子进程继承、却不能跨终端？「永久」到底改了哪里？
4. 遮住第 6 节警示，复述 setx 改 PATH 的两个坑。

<details>
<summary>参考答案</summary>

1. `echo "$PATH"`；`export PATH="$HOME/bin:$PATH"`（前置优先级更高，见第 3.1 节）；`echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc`——引号包裹防止当前 shell 先展开 `$PATH`。
2. CMD：`setx JAVA_HOME "C:\Program Files\Java\jdk-21"`；PowerShell：`[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Java\jdk-21", "User")`。`$env:JAVA_HOME = "..."` 只改当前进程环境块（关终端即失效）；setx 写注册表中的用户环境，新开的终端才能读到。
3. 临时变量在进程环境块里，fork 时整体复制给子进程（继承），但环境块属于进程、不属于用户——新终端是另一个进程树。所谓「永久」是把配置写进磁盘（注册表或 shell 配置文件），新进程启动时从磁盘重新加载（第 1.3 节生命周期图）。
4. 坑一：`%PATH%` 是用户+系统拼接值，写回系统变量会污染，反复执行还会撞 setx 约 1024 字符截断上限，PATH 损坏；坑二：任何覆盖式写法忘了带旧值，系统连 ls 都找不到。防御：图形界面或 PowerShell 读原值再写回。
</details>
