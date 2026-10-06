---
order: 490
title: Go CLI 应用开发
module: 'go'
category: 后端技术
difficulty: beginner
description: 从 os.Args 到 flag 再到 cobra 的命令行演进、配置优先级合并、go:embed 打包静态资源——手写一个 frontmatter 校验 CLI（--check 与 --fix 子命令）的全过程
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：命令行应用开发。Go 的第一大应用形态就是 CLI
  （Docker、kubectl、hugo、terraform 都是 Go 写的），本模块此前
  只有零散提及，本篇系统化。
- **解决什么问题**：参数解析（位置参数/标志/子命令）、退出码约定、
  配置的优先级合并（命令行 > 环境变量 > 配置文件）、把模板与静态
  资源打进单个二进制分发。
- **什么时候用到**：给团队写运维与构建工具、把脚本从 shell/Node 迁到
  单文件二进制、发布跨平台工具（配合 115 的交叉编译）。

## 真实场景：给 FANDEX 写一个 frontmatter 校验 CLI

本仓库的内容管线（`app-web/scripts/content-audit.mjs`）只做一件事：
确认每篇文档能被管线解析——frontmatter 合法、title 存在。把它改造成
Go CLI 是绝佳练习，因为需求真实而边界清晰：

```text
fmx check ./cnt-content/full          # 校验全部文档，问题以非零码退出
fmx check --fix ./cnt-content/full    # 可修复项（缺 title 时用文件名兜底）直接修
fmx stats ./cnt-content/full          # 子命令：统计各模块文档数
fmx --version
```

三个需求的工程含义：`check` 与 `fix` 是**子命令**；`--fix` 是**布尔
标志**；退出码要区分「一切正常（0）」「有违规（1）」「自身崩溃（2）」
——CI 靠退出码做门禁，这正是本仓库 `audit:content` 脚本的契约。

## 1. 演进三段：os.Args、flag、cobra

### 1.1 os.Args：一切的原点

```go
func main() {
    // os.Args[0] 是程序自身路径，用户输入从 [1] 开始
    if len(os.Args) < 2 {
        fmt.Fprintln(os.Stderr, "usage: fmx <dir>")
        os.Exit(2) // 2 = 用法错误，与 1（业务失败）区分
    }
    dir := os.Args[1]
    fmt.Println("checking", dir)
}
```

**为什么这样写**：`os.Exit` 的参数就是进程退出码，`0` 是唯一表示
成功的值——shell 的 `$?`、CI 的 job 状态、`&&` 链全部读它。
错误输出走 `os.Stderr` 而不是 stdout：stdout 是给管道消费的
数据通道（`fmx check . | head`），错误混进 stdout 会污染下游。

### 1.2 flag：标准库解析

```go
func main() {
    fix := flag.Bool("fix", false, "自动修复可修复项")
    minTitle := flag.Int("min-title", 4, "title 最短长度")
    flag.Parse() // 之后 os.Args 里只剩位置参数

    dirs := flag.Args()
    if len(dirs) == 0 {
        dirs = []string{"."}
    }
    for _, d := range dirs {
        run(d, *fix, *minTitle)
    }
}
```

逐行讲解：`flag.Bool` 返回 `*bool`——包级函数注册 + 指针回读的风格
是标准库的历史设计；`flag.Parse()` 之后 `flag.Args()` 是剩下的位置
参数。`--fix=true`、`--fix`、`-fix` 三种写法都接受，Go 1.25 起连
`--fix=true` 与单破折号长选项都完全兼容 POSIX 风格。

**flag 的能力边界**：没有子命令分组（`fmx check --fix` 与
`fmx fix --check` 的 help 混在一起）、每个子命令要手动切换 flag 集——
参数超过 5 个或出现子命令时，就是升级 cobra 的时机。

### 1.3 cobra：子命令与帮助体系

```go
var fix bool

var rootCmd = &cobra.Command{
    Use:   "fmx",
    Short: "frontmatter 校验工具",
    Long:  "fmx 校验 cnt-content 文档的 frontmatter 合法性与 title 存在性。",
    Version: "0.3.0",
}

var checkCmd = &cobra.Command{
    Use:   "check [dirs...]",
    Short: "校验文档",
    Args:  cobra.MinimumNArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        return runCheck(args, fix)
    },
}

func init() {
    checkCmd.Flags().BoolVarP(&fix, "fix", "f", false, "自动修复可修复项")
    rootCmd.AddCommand(checkCmd)
}

func main() {
    if err := rootCmd.Execute(); err != nil {
        os.Exit(1) // cobra 已把错误打到 stderr
    }
}
```

**逐行讲解**：`RunE` 而不是 `Run`——返回 error 让「命令失败」统一走
返回值而不是在回调里自己 `os.Exit`（后者让单测无法覆盖命令逻辑）；
`Args: cobra.MinimumNArgs(1)` 把参数校验声明式化；`--version` 由
`Version` 字段自动支持。`init()` 里注册 flag 与子命令是 cobra 的
惯用组织法，注意 init 在包加载时执行、顺序不可依赖，因此闭包里
只做注册不做初始化副作用。

### 1.4 配置优先级：命令行 > 环境变量 > 配置文件

CLI 与服务的配置策略一致（390-GoConfigManagement 的优先级链在 CLI 的
变体）：

```go
// 优先级：flag 显式传入 > FMX_MIN_TITLE 环境变量 > 默认值
func resolveMinTitle(cmdFlag int) int {
    if cmdFlag != 0 { // flag 显式传了非零值
        return cmdFlag
    }
    if v := os.Getenv("FMX_MIN_TITLE"); v != "" {
        if n, err := strconv.Atoi(v); err == nil {
            return n
        }
    }
    return 4
}
```

**易错点**：布尔 flag 无法用「零值」判断「用户没传」——`--fix=false`
与「没传」无法区分。需要区分时用 `cmd.Flags().Changed("fix")`。

## 2. go:embed：把资源打进二进制

发布 CLI 的痛点是「二进制 + 一堆模板/静态文件」的目录依赖。
`go:embed` 在编译期把文件内容收进二进制：

```go
package main

import (
    "embed"
    "fmt"
)

//go:embed templates/*.tmpl NOTICE.txt
var assets embed.FS

func main() {
    // 路径相对于本 .go 源文件所在目录，必须以子目录开头（不能 . 或 ..）
    b, err := assets.ReadFile("templates/report.tmpl")
    if err != nil {
        panic(err)
    }
    fmt.Println(len(b))
}
```

**逐行讲解**：`//go:embed` 指令必须紧贴 `var assets` 声明（同 115
构建标签的「紧贴」规则）；`embed.FS` 实现了 `fs.FS` 接口，可直接喂给
`template.ParseFS`、`http.FileServer(http.FS(assets))`——模板引擎与
静态文件服务零改动接入。**约束**：不能 embed 空目录、不能 embed
`..` 上跳路径、`_` 与 `.` 开头的文件默认被排除（需要 `all:` 前缀）。

第二个场景：批量重命名工具读一套规则文件（`rename.rules`），
用 embed 打进二进制后，同事拿到的是单个 exe，不存在「规则文件没拷」
的支援成本。第三个场景：发布脚本把 CHANGELOG 头部（版本号 + 日期）
embed 进去，`--version` 输出带版本与构建时间（`-ldflags "-X main.version=..."` 注入）。

## 3. 完整示例：fmx 的核心校验循环

把前两节拼成能跑的最小实现（frontmatter 解析从简：`---` 边界 + 行级 key: value）：

```go
func runCheck(dirs []string, fix bool) error {
    issues := 0
    for _, dir := range dirs {
        err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
            if err != nil {
                return err // 目录不可达：向上抛，由 main 决定退出码
            }
            if d.IsDir() || (!strings.HasSuffix(path, ".md") && !strings.HasSuffix(path, ".mdx")) {
                return nil
            }
            n, err := checkFile(path, fix)
            if err != nil {
                return err
            }
            issues += n
            return nil
        })
        if err != nil {
            return err
        }
    }
    if issues > 0 {
        fmt.Fprintf(os.Stderr, "found %d issue(s)\n", issues)
        return errIssuesFound // 让 main 映射为退出码 1
    }
    return nil
}

func checkFile(path string, fix bool) (int, error) {
    raw, err := os.ReadFile(path)
    if err != nil {
        return 0, err
    }
    text, fm, ok := splitFrontmatter(string(raw))
    if !ok {
        fmt.Fprintf(os.Stderr, "%s: missing frontmatter\n", path)
        return 1, nil
    }
    if _, has := fm["title"]; has {
        return 0, nil
    }
    if !fix {
        fmt.Fprintf(os.Stderr, "%s: missing title\n", path)
        return 1, nil
    }
    // --fix：用文件名兜底 title，写回文件
    base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
    fixed := reTitle.ReplaceAllString(text, fmt.Sprintf("title: %s\n", base))
    if err := os.WriteFile(path, []byte(fixed), 0o644); err != nil {
        return 0, err
    }
    fmt.Fprintf(os.Stderr, "%s: title filled from filename\n", path)
    return 0, nil
}
```

**逐段讲解**：`filepath.WalkDir`（Go 1.16+）比 `Walk` 快且语义清晰，
回调返回 error 即中止遍历——「跳过错误继续走」就返回 nil，本实现
选择中止（校验工具应暴露 IO 异常而不是静默漏检）；`issues` 计数与
error 分离：**「文档有问题」是业务结果（退出码 1），「工具自己坏了」
是错误（退出码 2）**，两者混在一个 error 里 CI 就无法区分「代码有
问题」和「工具有 bug」；`--fix` 写文件前先完成全部解析——部分写入
失败会留下半截 frontmatter，生产工具应先写临时文件再 rename 原子替换。

## 常见陷阱与调试

- **坑 1：stdout 与 stderr 混用。** 结果数据走 stdout（可管道）、
  诊断与错误走 stderr（不污染管道）。`fmx stats . | sort` 排序的
  是数据还是日志，取决于这条纪律。
- **坑 2：在 `Run` 回调里 `os.Exit`。** 退出码被抽走后单测只能靠
  子进程黑盒测试；统一 `RunE` 返回 error，main 一处映射退出码。
- **坑 3：`flag.Args` 与 cobra 混用。** cobra 场景里位置参数是
  `args` 参数本身，再调 `flag.Args()` 拿到的是空集——两套解析器
  只能存在一套。
- **坑 4：embed 路径带 `./`。** `//go:embed ./templates` 编译报错
  （模式不允许相对前缀），写 `templates` 即可；目录用 `/` 结尾
  只匹配目录本身不递归，递归用 `templates/*`。
- **坑 5：交叉编译后 embed 内容「不对」。** embed 发生在编译期——
  改了模板忘重新编译，跑的是旧内容。发布流程里 embed 资源的变更
  必须触发重编（CI 天然满足，本地开发要记得）。

## 动手实践

**任务**：把第 3 节的 fmx 补完整——`stats` 子命令 + `--version` 注入 +
退出码三分法，然后在 FANDEX 仓库的 cnt-content/full 上真实跑一遍。

1. `stats` 子命令：输出每个模块目录下的 `.md` 文件数，按数量降序；
2. `--version`：用 `go build -ldflags "-X main.version=$(git describe --tags)"`
   注入版本，裸 `go build` 时显示 `dev`；
3. 退出码：正常 0；有违规 1；目录不存在等自身错误 2；
4. 在本仓库跑 `go run . check cnt-content/full`——FANDEX 每篇都有
   title，预期退出码 0。

**提示**：版本注入变量必须是包级 `var version = "dev"`（ldflags 的
`-X` 只能改包级变量）；统计目录用 `os.ReadDir` 足够（不需要递归），
排序用 `sort.Slice`；「退出码 2」的判定放在 main：error 类型断言为
`*fs.PathError` 或自定义 `errUsage` 时 `os.Exit(2)`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```go
package main

import (
    "errors"
    "fmt"
    "os"
    "path/filepath"
    "sort"

    "github.com/spf13/cobra"
)

var version = "dev" // -ldflags "-X main.version=..." 注入点

type usageErr struct{ msg string }

func (e *usageErr) Error() string { return e.msg }

var statsCmd = &cobra.Command{
    Use:   "stats [root]",
    Short: "统计各模块文档数",
    Args:  cobra.ExactArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        entries, err := os.ReadDir(args[0])
        if err != nil {
            return &usageErr{err.Error()} // 目录不存在 -> 退出码 2
        }
        type row struct {
            name  string
            count int
        }
        var rows []row
        for _, e := range entries {
            if !e.IsDir() {
                continue
            }
            subs, _ := os.ReadDir(filepath.Join(args[0], e.Name()))
            n := 0
            for _, s := range subs {
                if filepath.Ext(s.Name()) == ".md" {
                    n++
                }
            }
            rows = append(rows, row{e.Name(), n})
        }
        sort.Slice(rows, func(i, j int) bool { return rows[i].count > rows[j].count })
        for _, r := range rows {
            fmt.Printf("%4d  %s\n", r.count, r.name)
        }
        return nil
    },
}

func main() {
    rootCmd.Version = version
    rootCmd.AddCommand(checkCmd, statsCmd)
    if err := rootCmd.Execute(); err != nil {
        var ue *usageErr
        if errors.As(err, &ue) {
            os.Exit(2) // 用法/环境问题
        }
        os.Exit(1) // 业务失败（含 check 发现违规）
    }
}
```

**逐段讲解**：`version` 是包级 var 且有默认值 `dev`——ldflags 注入
的本质是链接期给变量赋值，没有默认值则裸构建编译失败；`statsCmd`
把「目录不可达」包装为 `usageErr` 类型，main 里 `errors.As` 区分
两类失败映射两个退出码（错误包装与判定模式同 090-ErrorHandlingAdvanced）；
`sort.Slice` 降序让最多的模块排最前，`fmt.Printf("%4d")` 右对齐数字
让终端输出成为伪表格。真实跑：FANDEX 的 cnt-content/full 下每个模块
目录都是纯文档，输出形如 `73  006-css`。

</details>

## 参考与致谢

- flag 包文档（https://pkg.go.dev/flag ，BSD 三条款许可）
- cobra 用户指南（https://github.com/spf13/cobra/blob/main/user_guide.md ，Apache-2.0 许可）
- go:embed 提案与文档（https://pkg.go.dev/embed ，BSD 三条款许可）
- 场景素材：本仓库 app-web/scripts/content-audit.mjs 与
  content-sync.mjs 的校验思路
