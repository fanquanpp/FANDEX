---
order: 300
title: PowerShell 与批处理：Windows 方言实战
module: 'shell'
category: 工具链
difficulty: beginner
description: 用一个真实的 51 行 PowerShell 还原工具讲工程化脚本范式（param、严格模式、台账驱动、三态日志），用 4 行批处理的真实笔误讲大小写陷阱，附与 bash 的方言差异表。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'shell/140-CrossPlatformCommandLine'
  - 'shell/150-ShellBasics'
  - 'shell/190-ScriptDebugging'
prerequisites:
  - 'shell/130-CommandLineBasics'
---

## 知识点地图

- **知识类别**：Windows 两大脚本方言——PowerShell（面向对象、现代）与批处理 bat（命令堆叠、遗留），以及它们与 bash 的方言差异。
- **解决什么问题**：Windows 环境的自动化躲不开这两个方言：批处理无处不在（老系统、右键菜单、CI 老脚本）但陷阱密集；PowerShell 是正解但工程化写法资料少。本篇用一个真实生产级脚本拆出可复用的范式，用一段真实笔误案例建立防御心态。
- **什么时候用到**：要在 Windows 上写自动化脚本时；接到别人留下的 bat 想改又不敢改时；把 bash 习惯平移到 Windows 踩坑时。

前置：命令行基础（shell/130-CommandLineBasics）与跨平台对照（shell/140-CrossPlatformCommandLine 第 3.4 节）；bash 脚本基础（shell/150-ShellBasics）——本篇的方言对照表以此为参照系。

## 1. 心智模型：批处理是字符串命令，PowerShell 是对象管道

两代方言的本质差异一句话：**批处理把一切当字符串拼接，PowerShell 把命令输出当对象流转**。

```powershell
# PowerShell：Get-ChildItem 返回的是文件对象，后面接的是属性筛选
Get-ChildItem C:\logs | Where-Object { $_.Length -gt 1MB } | Select-Object Name, Length
```

```bat
:: 批处理：dir 输出的是文本，后面只能做文本切分
for /f "tokens=3" %%a in ('dir C:\logs ^| find "1"') do echo %%a
```

三条推论决定你的学习投入：排错时 PowerShell 能打印对象结构（`Format-List *`），批处理只能打印字符串猜；PowerShell 的错误处理是真异常（try/catch），批处理的 `errorlevel` 是约定俗成的整数协议；新写的脚本一律用 PowerShell，bat 只用于「读懂并安全改造存量」。cmd 本身在 Windows Terminal 时代已无存在必要（shell/140 第 1.2 节）。

## 2. PowerShell 工程范式：完整拆解一个真实还原工具

以下是一个真实使用过的 U 盘文件整理还原脚本（51 行，可独立运行）：按《移动台账.csv》把上千个被移动过的文件移回原位，原则是**绝不覆盖、绝不删除、全程留痕**。它覆盖了 PowerShell 工程化的大部分关键决策，逐段拆解。

### 2.1 参数块与相对路径定位

```powershell
# 05_rollback.ps1 — U盘（E:）一键还原脚本
# 作用：按《移动台账.csv》把文件移回整理前的位置。绝不覆盖、绝不删除。
# 用法（PowerShell）:
#   pwsh -ExecutionPolicy Bypass -File .\一键还原.ps1            # 全部还原
#   pwsh -ExecutionPolicy Bypass -File .\一键还原.ps1 -Sample 3  # 只还原3个试试
param(
  [int]$Sample = 0,
  [string]$LedgerCsv = (Join-Path $PSScriptRoot '移动台账.csv'),
  [string]$LogCsv    = (Join-Path $PSScriptRoot '还原日志.csv')
)
$ErrorActionPreference = 'Stop'
```

逐行讲为什么这样写：

- `param()` 块放在注释之后、一切执行代码之前——参数是脚本的「命令行接口」，默认值让脚本零参数可跑、参数让它可定制；**换成在脚本中间写死路径的写法会发生什么**：换一台机器、换一个盘符就要改代码，脚本失去了分发价值；
- `Join-Path $PSScriptRoot '移动台账.csv'`：`$PSScriptRoot` 是脚本所在目录，用它拼路径让整个工具「跟着文件夹走」——U 盘插到任何电脑上相对关系不变。写死 `E:\00-整理台账\...` 的版本只在你机器上能跑；
- `$ErrorActionPreference = 'Stop'` 是 PowerShell 的 `set -e`（shell/190 篇的严格模式思想同源）：默认值 `Continue` 下，cmdlet 出错只打印红字继续跑——还原工具半途出错继续跑就是灾难，Stop 把第一个错误变成终止。**易错点**：它只管 cmdlet 的非终止错误，.NET 方法调用（如 `[System.IO.File]::ReadAllText`）抛的是终止错误不受此设置影响——两种调用混用时 try/catch 才是完整防线。

### 2.2 台账驱动：数据与逻辑分离

```powershell
if (-not (Test-Path -LiteralPath $LedgerCsv)) { throw "找不到移动台账: $LedgerCsv" }
$moves = @(Import-Csv -LiteralPath $LedgerCsv | Where-Object { $_.status -eq 'moved' })
$lastByOrig = @{}
foreach ($m in $moves) { $lastByOrig[$m.original_path] = $m }
$targets = @($lastByOrig.Values | Sort-Object { [int]$_.seq } -Descending)
if ($Sample -gt 0) { $targets = @($targets | Select-Object -First $Sample) }
```

这七行是一个完整的「数据管道」，每行都有讲究：

- `throw` 前置检查：台账不存在直接报错退出，比跑到一半发现文件缺失好得多（fail fast）；
- `Import-Csv` 把 CSV 变成对象数组（每行一个对象，列名即属性）——**这是 PowerShell 与 bat 的分水岭时刻**：bat 处理 CSV 要手写字符串切分，这里一行完成且类型安全；
- `@(...)` 强制数组化：`Import-Csv` 结果可能因 CSV 只有一行而退化成单对象，后续按数组处理会炸——`@()` 是 PowerShell 数组语义的标准化写法，宁多勿少；
- `Where-Object { $_.status -eq 'moved' }`：`$_` 是管道当前元素，`-eq` 是比较运算符（不是 `==`，赋值和比较在 PowerShell 里不会混）；
- `$lastByOrig[$m.original_path] = $m`：按原始路径去重、保留最后一条记录——同一文件被移动过两次时，以最后一次移动的记录为准（哈希表天然「后写覆盖」）；
- `Sort-Object { [int]$_.seq } -Descending`：按序号**降序**还原不是随手写的——逆序回滚是「撤销类操作」的通用纪律（最后做的事最先撤销），还原过程遇到中途状态也自洽；
- `-Sample` 截取前 N 条：小样本试运行的设计（2.4 节展开）。

### 2.3 幂等与「绝不覆盖」：写循环与三态日志

```powershell
if (-not (Test-Path -LiteralPath $LogCsv)) {
  'original_path,from_path,action,result,detail,timestamp' | Set-Content -LiteralPath $LogCsv -Encoding utf8BOM
}

$ok = 0; $skip = 0; $fail = 0
foreach ($m in $targets) {
  $dst = $m.target_path
  $src = $m.original_path
  try {
    if (-not (Test-Path -LiteralPath $dst -PathType Leaf)) { throw "待还原文件不在预期位置: $dst" }
    if (Test-Path -LiteralPath $src) { throw "原位置已被占用，跳过（绝不覆盖）: $src" }
    $srcDir = Split-Path -Parent $src
    if (-not (Test-Path -LiteralPath $srcDir)) { [void][System.IO.Directory]::CreateDirectory($srcDir) }
    Move-Item -LiteralPath $dst -Destination $src -ErrorAction Stop
    $back = Get-Item -LiteralPath $src -Force
    if ($back.Length -ne [long]$m.size_bytes) { throw "还原后大小不一致" }
    Add-Content -LiteralPath $LogCsv -Encoding utf8 -Value ('{0},{1},"restore","ok",,{2}' -f (Esc $src),(Esc $dst),(Esc (Now)))
    $ok++
  } catch {
    if ($_.Exception.Message -like '原位置已被占用*') {
      Add-Content -LiteralPath $LogCsv -Encoding utf8 -Value ('{0},{1},"restore","skipped",{2},{3}' -f (Esc $src),(Esc $dst),(Esc $_.Exception.Message),(Esc (Now)))
      $skip++
    } else {
      Add-Content -LiteralPath $LogCsv -Encoding utf8 -Value ('{0},{1},"restore","failed",{2},{3}' -f (Esc $src),(Esc $dst),(Esc $_.Exception.Message),(Esc (Now)))
      $fail++
    }
  }
}
"还原完成：成功 $ok |跳过 $skip |失败 $fail |详情见 还原日志.csv"
```

这段主体浓缩了五个工程决策：

1. **先检查后动手，绝不覆盖**：`Test-Path $src` 为真（原位置已有东西）就 throw 跳过——还原工具的底线是「哪怕逻辑错了也不能毁数据」，覆盖是单向不可逆操作；
2. **Move 前补目录**：原始目录可能已被清理，`Split-Path -Parent` 取父目录、不存在就建——「先铺路再走路」；
3. **还原后校验**：`$back.Length -ne [long]$m.size_bytes` 用台账里记录的字节数核对移动结果——操作完成和操作正确是两回事；
4. **三态日志**：ok/skipped/failed 分类计数，`catch` 里按异常消息前缀分流（「原位置已被占用」是**预期内**的跳过，不是失败）——把「预期内的跳过」与「真正的失败」混在一个桶里，跑完 10000 条你不知道哪 3 条要人工处理；
5. **CSV 转义辅助函数**：`Esc` 函数（见下）把字段值里的双引号翻倍，保证日志自身是合法 CSV——日志文件自己的格式坏了，对账工具就废了。

```powershell
function Esc([string]$s) { '"' + ($s -replace '"','""') + '"' }
function Now() { (Get-Date).ToString('yyyy-MM-dd HH:mm:ss.fff') }
```

### 2.4 `-Sample 3`：危险操作的小样本试运行

`-Sample 3` 让脚本只还原 3 个文件。这个设计背后的纪律：**任何批量写操作的第一步是「跑一个能看清每一步的小样本」**——3 条日志肉眼可查（路径对不对、日志格式对不对、文件真的回去了吗），确认后再全量。对比直接全量：脚本 bug 在第 1 条就存在，但你发现时已经跑了 5000 条。

对应到 bash 世界的同类实践：`ls` 预演后去掉 `ls` 换 `mv`、`rm` 前先 `echo` 出要删的列表——本质都是「先看清楚再放大火力」（shell/250 实战脚本篇的同款思想）。

### 2.5 这个样本教会你的范式清单

| 决策点 | 样本中的做法 | 反面写法 |
| :--- | :--- | :--- |
| 路径 | `$PSScriptRoot` 相对定位 | 写死盘符 |
| 错误策略 | `Stop` + try/catch 三态 | 默认 Continue 红字刷屏继续跑 |
| 数据来源 | CSV 台账驱动 | 硬编码文件清单 |
| 安全底线 | 检查后动 + 绝不覆盖 | 直接 Move 盖过去 |
| 正确性 | 移动后校验字节数 | 移过去就算成功 |
| 试运行 | `-Sample 3` | 直接全量 |
| 可审计 | 全程 CSV 日志 | 靠回忆 |

这套清单与语言无关——把它平移到 bash（shell/250）或任何脚本语言都成立。

## 3. 批处理：4 行真实脚本与两处致命笔误

### 3.1 案例原文

```bat
@echo off
taskkill /f /im explorer.exe
CD /d %userprofile%\AppDate\Local
DEL lconCache.db /a
start explorer.exe
```

（一段真实使用过的「Windows 图标显示异常修复」脚本：结束资源管理器、删除图标缓存、重启资源管理器。）

### 3.2 两处笔误与它们为什么能存活

**第一处：`AppDate` 应为 `AppData`。** `%userprofile%\AppDate\Local` 这个目录不存在，`CD /d` 失败——但批处理**不会因此停下**：`CD` 失败只设置 errorlevel，下一行照常执行。于是 `DEL lconCache.db /a` 在错误的当前目录（上一个有效目录）里找一个不存在的文件，也静默失败。**整个脚本四行命令、两处失败、零报错、零效果**——这就是 bat 的「错误不阻断」特性养出来的坏脚本：它能「跑完」不等于它「做成了」。

**第二处：`lconCache` 应为 `IconCache`。** 大写 `I` 与小写 `l` 在等宽字体里几乎不可区分（`lconCache` vs `IconCache`），这是从网页/聊天记录抄命令时的高发笔误。配上第一处的目录错误，这个文件永远找不到——两处错误互相掩护，脚本看起来「正常执行完毕」。

### 3.3 正确写法与防御改造

```bat
@echo off
taskkill /f /im explorer.exe
CD /d %userprofile%\AppData\Local || goto :fail
if not exist IconCache.db goto :done
DEL /a IconCache.db || goto :fail
:done
start explorer.exe
echo 图标缓存已清理
exit /b 0
:fail
start explorer.exe
echo 清理失败，请检查路径
exit /b 1
```

三处防御升级：`CD ... || goto :fail`（cmd 也有关键步骤失败阻断的写法，`||` 是 errorlevel 的语法糖）——目录切不对就不该继续；`if not exist` 显式处理「文件不在」的分支；`exit /b 1` 返回非零退出码，让调用方（计划任务、CI）能感知失败——bat 脚本的 errorlevel 协议是它唯一的「异常通道」，吃掉退出码等于关闭报错。

**教训抽象**：拿到任何存量 bat，先找「路径拼写」与「关键步骤的 errorlevel 检查」两件事；自己写 bat 的铁律是**关键路径每步带 `|| exit /b 1`**，与 shell/190 篇的 `set -e` 是同一个思想在不同方言里的形态。

## 4. 与 bash 的方言对照表

（bash 侧语法详见 shell/150-ShellBasics 与 shell/180-FunctionsArguments，此处只列「平移会踩坑」的差异。）

| 维度 | bash | PowerShell | 批处理 |
| :--- | :--- | :--- | :--- |
| 变量赋值 | `NAME="value"`（等号两边无空格） | `$Name = "value"`（等号两边有空格） | `set NAME=value`（= 两边不能有空格） |
| 变量引用 | `"$NAME"` | `"$Name"` 或 `"$($Obj.Prop)"` | `%NAME%` |
| 管道传递 | 文本行 | **对象** | 文本（几乎不用管道） |
| 比较运算 | `-eq`/`-lt`（`==` 只在 `[[ ]]`） | `-eq`/`-lt`（数字），`==` 是通配匹配 | `EQU`/`LSS`（`if %a%==1` 是字符串比较） |
| 错误处理 | `set -e`、`||`、trap | `try/catch` + `$ErrorActionPreference` | `errorlevel` + `\|\|` |
| 函数 | `func() { ... }` | `function Func { param() }` | `:label` + `call :label`（goto 语义） |
| 注释 | `#` | `#` | `::` 或 `REM` |
| 路径分隔 | `/`（Git Bash 兼容 `C:\`） | `\` 与 `/` 多数 cmdlet 都接受 | `\`（`/` 会被当参数开关） |
| 后台/并行 | `&`、`wait` | `Start-Job` | `start`（无等待机制，`start /wait` 除外） |

三条最容易踩的坑标注：

1. **PowerShell 的等号空格**：`$Name="x"` 会报错（bash 习惯直接平移的第一次翻车），`if ($a==1)` 是通配匹配不是相等比较；
2. **bat 的 `if %a%==1` 做字符串比较**：`if 5==05` 为假（字符串不相等），数值比较要用 `if %a% EQU 05`——数字被当字符串是 bat 逻辑 bug 的稳定来源；
3. **路径里的空格**：三个方言都要求引号包裹，但 bat 的引号规则最脆弱（`"%userprofile%\my docs\file.txt"` 的引号边界要手工保证），PowerShell 的 `-LiteralPath` 参数（样本 2.3 节全程使用）专治「路径含特殊字符」。

## 5. 动手实践

**任务一：读懂并改造。** 通读 2.1-2.3 节的还原脚本，回答三个问题：a) 为什么还原要按 seq 降序？b) `Where-Object { $_.status -eq 'moved' }` 过滤掉了台账里的哪些行、为什么要过滤？c) 如果把 `$ErrorActionPreference = 'Stop'` 删掉，`throw` 还会让脚本停止吗？

<details>
<summary>任务一参考答案</summary>

a) 撤销类操作逆序回滚：最后做的移动最先撤销，中途状态自洽（2.2 节）。b) 过滤掉 status 不是 moved 的行（比如已还原过、或仅计划未执行的记录）——台账是累积的流水，还原工具只该处理「移动过且未还原」的记录；不过滤就会把已还原的再动一遍。c) 会——`throw` 抛的是终止错误，`Stop` 管的是 cmdlet 非终止错误（如 Move-Item 失败）；删掉 Stop 后 `throw` 仍生效，但 cmdlet 层的失败（如目录权限不足）会变成红字加继续跑。这题的考点是 PowerShell 两类错误的分界（2.1 节易错点）。
</details>

**任务二：给还原脚本加一个「演练模式」。** 要求：加 `-DryRun` 开关参数，开启后执行全部检查逻辑但不真的 Move，日志照写（result 列写 dryrun）。提示：改哪几处？`Move-Item` 那一行怎么改最小？

<details>
<summary>任务二参考实现</summary>

```powershell
param(
  [int]$Sample = 0,
  [switch]$DryRun,                                  # 开关型参数，出现即 $true
  [string]$LedgerCsv = (Join-Path $PSScriptRoot '移动台账.csv'),
  [string]$LogCsv    = (Join-Path $PSScriptRoot '还原日志.csv')
)
# ... 检查逻辑不变 ...
    if ($DryRun) {
      Add-Content -LiteralPath $LogCsv -Encoding utf8 -Value ('{0},{1},"restore","dryrun",,{2}' -f (Esc $src),(Esc $dst),(Esc (Now)))
      $ok++
      continue                                      # 跳过真实移动
    }
    Move-Item -LiteralPath $dst -Destination $src -ErrorAction Stop
```

要点自查：`[switch]$DryRun` 是 PowerShell 的开关参数惯例（比 `-DryRun $true` 优雅）；`continue` 放在日志之后保证演练也留痕；演练模式跑完的 CSV 可以直接和真实跑的结果 diff——这就是「预演可对账」的设计。
</details>

**任务三：判误练习。** 找出下面 bat 的所有问题（它想统计当前目录 txt 文件数量并写入 count.txt）：

```bat
@echo off
set count=0
for %%f in (*.txt) do set count=%count%+1
echo %count% > count.txt
```

<details>
<summary>任务三参考答案</summary>

两个经典错误：一是 `set count=%count%+1` 里的 `%count%` 在**解析时**就展开——for 循环整块被解析成一条命令时 `%count%` 永远是初始值 0，结果是 `0+1` 反复赋值，最终 count 是字符串 `0+1` 而不是数字。修复用延迟展开：脚本头加 `setlocal enabledelayedexpansion`，循环内写 `set /a count+=1`（`set /a` 做算术）并引用 `!count!`。二是 `echo %count% > count.txt` 的 `%count% ` 后多了一个空格，空格会被写进文件（「0+1 」）。这题的教训：bat 的变量展开时机（解析期 vs 执行期）是它最深的一个坑，遇到「循环内变量不更新」一律先查这个。
</details>

## 6. 下一步与延伸阅读

- 《Shell 脚本编程基础》（shell/150-ShellBasics）：bash 方言的完整教学；
- 《脚本调试与严格模式》（shell/190-ScriptDebugging）：`set -euo pipefail` 与本篇 `$ErrorActionPreference` 的同构思想；
- 《跨平台命令行详解》（shell/140-CrossPlatformCommandLine）：日常命令层面的三平台对照；
- Microsoft 官方文档 about_* 主题（about_Parameters、about_Try_Catch_Finally、about_Preference_Variables）：PowerShell 语言的权威出处。

## 参考与致谢

- 一键还原.ps1 与图标修复_脚本.bat 来自本机真实工程素材（U 盘整理台账工程），已获授权作为教学样本；文中拆解为教学重写；
- PowerShell 语言语义参考 Microsoft Learn 官方文档 <https://learn.microsoft.com/powershell/scripting/overview>（CC 授权文档）；
- 批处理语义参考 cmd 内置命令的 Microsoft 官方命令行文档。
