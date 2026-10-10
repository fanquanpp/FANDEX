---
order: 380
title: Go 与测试：让上次的 bug 不再复发
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"修过的 bug 一个月后复发"为主线学 go test：表驱动测试、子测试与并行、基准测试 b.Loop、httptest 与接口 mock、覆盖率、Go 1.24 测试工具箱（t.Chdir/synctest），附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'go/360-UnitTestBenchmark'
  - 'go/370-GoFuzzing'
  - 'go/340-GoDatabase'
  - 'go/580-GoPerformanceAnalysis'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：同一个 bug，你修了两遍

上个月你修了一个日期解析的边界 bug，补了说明、发了版。今天测试又报了同一个问题——另一个入口走了同一段解析代码。你盯着两处几乎一样的调用想：如果当时修 bug 的同时写下一个"这个输入必须返回这个结果"的测试，CI 就会在同事合并代码的那一刻拦住它，而不是让用户当第一个发现者。

测试的本质就是**把"这个 bug 曾经发生过"固化成一条自动检查**。Go 在这一点上给得非常足：标准库 `testing` 加 `go test` 命令，单元测试、表驱动、基准、覆盖率、模糊测试全在工具链里，不需要引入任何框架。这一篇按"写得出、跑得快、量得准"三步走完。

## 动手第一步：写第一个测试，跑通命令

约定先行：测试文件以 `_test.go` 结尾、与被测代码同包；测试函数签名固定 `func TestXxx(t *testing.T)`：

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}
```

```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    got := Add(1, 2)
    if got != 3 {
        t.Errorf("Add(1, 2) = %d, want 3", got)
    }
}
```

```bash
go test ./...        # 跑当前模块所有测试
go test -v -run TestAdd ./...   # 详细输出，只跑指定测试
```

预期输出：

```text
ok      example.com/math    0.012s
```

`-run` 接正则，还支持路径式子测试定位（见下一步）。`t.Error` 报告失败后继续执行，`t.Fatal` 报告失败并立即终止当前测试——初始化失败、拿不到前置数据时用 Fatal，继续跑只会产生一堆连带的假错误。

## 动手第二步：表驱动测试——Go 测试的标准形态

同一个函数要验 N 组输入输出时，把用例组织成结构体切片：

```go
func TestToUpper(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"小写转大写", "hello", "HELLO"},
        {"空字符串", "", ""},
        {"混合大小写", "HeLLo", "HELLO"},
        {"带中文", "你好go", "你好GO"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := strings.ToUpper(tt.input)
            if got != tt.expected {
                t.Errorf("ToUpper(%q) = %q, want %q", tt.input, got, tt.expected)
            }
        })
    }
}
```

`t.Run` 给每个用例起了名字，失败输出会精确到"哪个用例错了"；子测试还能单独运行，排查边界用例不用全量跑：

```bash
go test -run 'TestToUpper/空字符串' -v
```

需要并行的子测试加一行 `t.Parallel()`：

```go
for _, tt := range tests {
    tt := tt // Go 1.22 之前必须复制循环变量，否则闭包拿到最后一个值
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // ...
    })
}
```

Go 1.22 起循环变量每次迭代都是新变量，`tt := tt` 不再必需——但仓库里混着老代码时保留无害。需要全局初始化/清理时写 `TestMain(m *testing.M)`：setup 之后 `os.Exit(m.Run())`，其余测试函数照常被自动发现。

## 动手第三步：基准测试——用 b.Loop 量出性能

函数签名 `func BenchmarkXxx(b *testing.B)`。Go 1.24 引入的 `b.Loop()` 取代了手写 `for i := 0; i < b.N; i++`：迭代次数自动管理，还默认报告内存分配：

```go
func BenchmarkAdd(b *testing.B) {
    for b.Loop() {
        Add(1, 2)
    }
}

func BenchmarkProcess(b *testing.B) {
    data := setupData()     // 准备工作不计时
    b.ResetTimer()
    for b.Loop() {
        process(data)
    }
    // 老写法里对应位置的清理配 b.StopTimer()
}

func BenchmarkAlloc(b *testing.B) {
    b.ReportAllocs() // 报告每次操作的分配次数与字节数
    for b.Loop() {
        _ = make([]int, 100)
    }
}
```

```bash
go test -bench=. -benchmem
```

预期输出：

```text
BenchmarkAdd-8        1000000000     0.2521 ns/op        0 B/op     0 allocs/op
BenchmarkProcess-8      2841237    421.3    ns/op      128 B/op     2 allocs/op
```

读法：第一列是每秒迭代次数（-8 是 GOMAXPROCS），ns/op 是单次耗时，allocs/op 是单次内存分配次数——**优化前先看 allocs/op**，Go 里大多数慢都是分配太多。给不同规模做对比用子基准 `b.Run(fmt.Sprintf("size_%d", size), ...)`，每个规模内部各自 ResetTimer。两个坑：循环里的结果要 `_ = result` 防止编译器把死代码优化掉；基准结果受机器状态影响大，对比两版代码要用 `benchstat` 之类的工具做统计而不是肉眼比一行数字。

## 动手第四步：HTTP handler 与依赖的测法

Handler 不需要起真服务器，httptest 直接构造请求与响应记录器：

```go
func TestListUsers(t *testing.T) {
    req := httptest.NewRequest("GET", "/api/users", nil)
    w := httptest.NewRecorder()

    handler := UserHandler{DB: testDB}
    handler.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Fatalf("状态码 = %d, want %d", w.Code, http.StatusOK)
    }
    var users []User
    if err := json.NewDecoder(w.Body).Decode(&users); err != nil {
        t.Fatal(err)
    }
    if len(users) == 0 {
        t.Error("返回用户列表为空")
    }
}
```

依赖外部世界的代码（数据库、HTTP 下游）靠接口注入替身，不需要 mock 框架：

```go
type UserRepository interface {
    GetByID(id int) (*User, error)
}

type fakeRepo struct{ users map[int]*User }

func (f *fakeRepo) GetByID(id int) (*User, error) { return f.users[id], nil }

func TestGetUser(t *testing.T) {
    svc := NewUserService(&fakeRepo{users: map[int]*User{1: {Name: "Alice"}}})
    user, err := svc.GetUser(1)
    if err != nil {
        t.Fatal(err)
    }
    if user.Name != "Alice" {
        t.Errorf("got %s, want Alice", user.Name)
    }
}
```

依赖以接口形式从构造函数注入，测试就能完全离线运行、想造什么场景造什么场景。第三方断言库可选 testify：`assert.Equal(t, want, got)` 失败继续跑，`require.Equal` 失败立即停（与 t.Error/t.Fatal 的分工一致）。

## 讲为什么：覆盖率、辅助设施与 1.24 工具箱

覆盖率回答"我写下的分支有多少被测试走过"：

```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out    # 每个函数的覆盖率
go tool cover -html=coverage.out    # 浏览器里高亮未覆盖的行
```

别追 100%：覆盖率衡量"跑过"，不衡量"断言了"。正确的用法是改完 bug 看一眼覆盖报告——如果这次修复的分支根本没被任何测试经过，说明测试还没写到位。

测试辅助设施也由标准库承包：

```go
func TestFileWrite(t *testing.T) {
    dir := t.TempDir()                       // 自动创建、测试结束自动清理
    t.Cleanup(func() { /* LIFO 执行的清理 */ })

    t.Chdir(dir)                             // Go 1.24+：切换工作目录，结束自动恢复
    t.SetDeadline(time.Now().Add(30 * time.Second)) // Go 1.24+：单测试超时保护

    helper := func(t testing.TB, got, want int) { // testing.TB 兼容 T 与 B
        t.Helper()                           // 报错行号指向调用方而非这里
        if got != want {
            t.Errorf("got %d, want %d", got, want)
        }
    }
}
```

Go 1.24 还带来两件新工具：`go test -json` 让 CI 以结构化流消费测试结果（构建输出同样 JSON 化）；实验性的 `testing/synctest` 能在"气泡"里测试并发代码，时间虚拟化，不用真等 5 秒就能测超时逻辑（`synctest.Run(func() { ... })` + `synctest.Wait()`）。模糊测试（`FuzzXxx` + `go test -fuzz`）是发现解析器边角 bug 的利器，系统展开见 [Go 模糊测试](/go/370-GoFuzzing)。

两件工程上的收尾：集成测试用构建标签隔离——文件头写 `//go:build integration`，日常 `go test ./...` 自动跳过，CI 单独 `go test -tags=integration ./...` 跑；测试结果默认有缓存（输入未变直接显示 cached），要强制重跑用 `go test -count=1`，排查"测试是不是真的在跑"时常用。

## 坑点与自检

**坑 1：测试里用 init()。** 它在所有测试之前执行，顺序不可控、影响隔离。初始化交给 TestMain 或每个测试自己的 setup。

**坑 2：Fatal 用在 helper 里导致 goroutine 泄漏。** `t.Fatal` 只终止当前测试函数；在子 goroutine 里调用是未定义行为。goroutine 内的失败用 `t.Error` 加 channel 回传。

**坑 3：基准被编译器优化掉。** 循环体没有副作用时结果会被丢弃，记得 `_ = result` 或 `runtime.KeepAlive(result)`。

**坑 4：Example 的 Output 注释差一个空格。** `// Output:` 后的内容逐行精确比对，注释与实际输出不一致测试直接失败——这正是它"文档即测试"的机制：`func ExampleGreet()` 里的 `// Output: Hello, Alice` 既是 godoc 示例又是断言。

**坑 5：绕过接口直接连真库。** 单元测试连真实数据库慢、脆、依赖环境。真库验证放构建标签隔离的集成测试里，单元测试一律注入替身。

自检——能不看文档回答这些吗：

1. `_test.go`、TestXxx、BenchmarkXxx、ExampleXxx 各自的命名约定？
2. t.Error 与 t.Fatal 的行为差异？分别该用在什么时刻？
3. 表驱动测试为什么是 Go 的标准形态？t.Run 带来哪些能力？
4. b.Loop 相比 b.N 循环好在哪？allocs/op 为什么比 ns/op 更常作为第一优化信号？
5. 接口注入替身与 mock 框架相比，Go 风格为什么倾向前者？
6. 覆盖率 100% 意味着什么、不意味着什么？
7. 构建标签如何隔离集成测试？-count=1 解决什么问题？

## 练习

1. 给 `strings.Split` 写一个表驱动测试，覆盖正常分隔、无分隔符、连续分隔符、中文分隔符四组用例；用 `-run` 只跑"连续分隔符"一组，观察子测试定位是否生效。
2. 写 `strings.Builder.Write` 与 `+` 拼接 1000 段字符串的两个基准，用 `-benchmem` 对比 allocs/op，写一句结论。
3. 给第一步的场景收尾：复现"日期解析边界 bug"（比如 `2026-2-30`），先写一个会失败的测试，再写修复代码让它变绿——完整体验一次"测试先行"的修 bug 流程。

## 下一步

- 基准与单元测试的更多工程细节：[Go 单元测试与基准](/go/360-UnitTestBenchmark)；
- 用随机输入轰炸解析器：[Go 模糊测试](/go/370-GoFuzzing)；
- 优化方向从哪来：[Go 性能分析](/go/580-GoPerformanceAnalysis)；
- 基准背后的原理与调参：[GMP 调度模型](/go/170-GMPModel)。
