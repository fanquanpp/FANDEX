---
order: 230
title: 错误处理策略选型：异常、std::expected 与错误码
difficulty: beginner
description: 同一个「文件解析 + 网络请求」场景写三版实现对照：什么时候抛异常、什么时候返回 expected、什么时候错误码加 optional。覆盖 noexcept 交互、构造函数不能返回错误的约束、三层错误的传播成本与选型决策树。
module: 'cpp'
category: 计算机科学
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：错误处理 - 策略选型（cppreference「错误处理」主题的决策视角）。
- **解决什么问题**：C++ 同时存在三套错误通道——异常、`std::expected`（C++23）/ `std::optional`、错误码。每一篇教程都只演示其中一种，但真实工程里每天要回答的问题是「**这个失败该走哪条通道**」。选错的代价很具体：该用 expected 的地方抛了异常，热路径多出 unwind 表与不可预测的控制流；该抛异常的地方返回错误码，调用方忘记检查就静默吞掉错误。
- **什么时候用到**：设计任何「可能失败」的 API 时——文件 IO、网络请求、解析器、数据库访问、第三方边界层。

分工声明：

- [异常安全](/cpp/190-ExceptionSecurity) 讲异常机制本体与安全保证等级，是「怎么用好异常」；
- [C++23 新特性](/cpp/730-Cpp23NewFeatures) 2.1/4.2 节讲 `std::expected` 的完整 API（`and_then/transform/or_else` 链式操作）；
- 本篇只回答一件事：**三选一的决策**，并用同一个场景写三版实现逐项对照。

预计 60 到 90 分钟。

## 1. 三条通道的本质差异

先建立心智模型。错误从发生点到处理点要走一段路，三条通道走法不同：

```text
异常：      错误对象沿调用栈「跳跃」传播，途经函数无需感知（除非声明 noexcept）
expected：  错误作为返回值的一部分「顺流而下」，每一层显式经手
错误码：    错误经由出参或返回 int 「顺流而下」，类型系统不强制检查
```

| 维度 | 异常 | std::expected | 错误码 + optional |
| :--- | :--- | :--- | :--- |
| 忘记处理的后果 | 直接 `std::terminate`（向上传播到 main 外） | 编译警告可查（`[[nodiscard]]` 内建） | **静默继续**，错误丢失 |
| 失败路径开销 | unwind 代价大（数量级高于正常返回） | 一次分支 + 一个枚举 | 最小 |
| 成功路径开销 | 零拷贝零返回值；表驱动实现下接近零 | 值与错误共用存储，多一层标签 | 零 |
| 构造函数可用 | 可以（抛出去） | **不行**（构造函数没有返回值） | 不行 |
| 二进制体积 | 需要 unwind 表、 personalities | 无额外 | 无额外 |
| `noexcept` 交互 | 冲突源（见第 6 节） | 无关 | 无关 |
| 中间层是否必须经手 | 不必 | 必须显式传递 | 应该但不强制 |

一句话记忆：**异常是「控制流的异常路径」，expected 是「类型化的返回值」，错误码是「约定俗成的整数」**。越往下越便宜、越容易被忽略；越往上越安全、越难在关键路径上使用。

## 2. 同一场景的三版实现

场景定为贯穿全篇的例子：加载一个 JSON 配置文件，可能失败于三种原因——文件打不开、内容非法、字段类型不对。再叠一层网络请求（配置可从远端拉取），因为「网络失败重试」是选型敏感点。

### 2.1 版本 A：抛异常

```cpp
#include <fstream>
#include <stdexcept>
#include <string>

class ConfigError : public std::runtime_error {
public:
    enum class Kind { FileNotFound, InvalidSyntax, BadFieldType };
    explicit ConfigError(Kind k, const std::string& detail)
        : std::runtime_error(to_message(k, detail)), kind_(k) {}
    Kind kind() const noexcept { return kind_; }
private:
    static std::string to_message(Kind k, const std::string& d);
    Kind kind_;
};

Config load_config(const std::string& path) {
    std::ifstream file(path);                        // 失败时不抛，靠状态位
    if (!file.is_open()) {
        throw ConfigError(ConfigError::Kind::FileNotFound, path);
    }
    std::string text{std::istreambuf_iterator<char>(file), {}};
    try {
        return parse_json(text);                     // parse_json 内部也可能抛
    } catch (const ParseError& e) {
        throw ConfigError(ConfigError::Kind::InvalidSyntax, e.what());  // 翻译重抛
    }
}
```

逐段解释：

- 继承 `std::runtime_error` 而不是裸 `std::exception`：`what()` 消息与 `catch (const std::exception&)` 的兜底捕获都免费获得；[异常安全](/cpp/190-ExceptionSecurity) 的标准异常层次有完整清单。
- **错误翻译重抛**（catch 后抛新类型）是异常体系的常用手法：底层 ParseError 是解析器的事，上层只该看见 ConfigError。丢失原始信息是反模式——用 `std::throw_with_nested` 或在消息里保留原因。
- `ifstream` 打不开不抛异常只置 failbit，所以必须显式检查——C++ 流库是「错误码风格」的历史遗留区，混用两套风格时最容易出现「以为抛了其实没抛」。

这个版本的调用方：

```cpp
Config c = load_config("app.json");   // 不写 try/catch，失败直接炸到 main
// 或者
try {
    Config c = load_config("app.json");
} catch (const ConfigError& e) {
    if (e.kind() == ConfigError::Kind::FileNotFound) use_default_config();
    else throw;                                        // 不认识的错误继续上抛
}
```

「什么都不写」是异常通道的舒适区：中间十层函数一行错误处理代码都不用，错误自动抵达关心它的人。

### 2.2 版本 B：返回 std::expected（C++23）

```cpp
#include <expected>
#include <fstream>
#include <string>

enum class ConfigErr { FileNotFound, InvalidSyntax, BadFieldType };

std::expected<Config, ConfigErr> load_config(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        return std::unexpected(ConfigErr::FileNotFound);
    }
    std::string text{std::istreambuf_iterator<char>(file), {}};
    if (!is_valid_json(text)) {
        return std::unexpected(ConfigErr::InvalidSyntax);
    }
    Config c = parse_json_lenient(text);
    if (!c.fields_all_valid()) {
        return std::unexpected(ConfigErr::BadFieldType);
    }
    return c;
}
```

调用方的两种姿势：

```cpp
// 姿势一：显式分支（底层代码、需要具体处理每种错误）
auto result = load_config("app.json");
if (result) {
    use(result.value());
} else {
    switch (result.error()) {
        case ConfigErr::FileNotFound:  use_default_config(); break;
        case ConfigErr::InvalidSyntax: report_and_exit();    break;
        case ConfigErr::BadFieldType:  repair_fields();      break;
    }
}

// 姿势二：monadic 链式（上层胶水代码，任何一步失败整体失败）
auto final_cfg = load_config(path)
    .or_else([](ConfigErr e) { log(e); return repair_config(path); })
    .and_then([](Config c) { return validate_remote_fields(c); });
```

逐段解释：

- 返回类型把「成功」与「失败」都装进值里，函数签名本身变成了文档——调用方**不可能不知道**这个函数会失败。
- `std::unexpected` 是给 expected 装「失败侧」的包装，直接 `return c;` 走成功侧。混着写编译器能查出来。
- `or_else` 在失败时续接一个「再给一次机会」的函数，`and_then` 在成功时续接下一个可能失败的函数——链式版把「重试后校验」写成一行数据流。[C++23 新特性](/cpp/730-Cpp23NewFeatures) 3.1 节从 monad 角度推导了这套组合子的合法性。

注意 `value()` 的行为：expected 为空时调 `value()` 会抛 `std::bad_expected_access`——也就是说 **expected 并不是「无异常」通道**，用错姿势照样会炸。纪律是先 `if (result)` 再用，或者直接用 `value_or(default)`。

### 2.3 版本 C：错误码 + optional

```cpp
#include <optional>
#include <string_view>

enum class ConfigErr : int { Ok = 0, FileNotFound = 1, InvalidSyntax = 2, BadFieldType = 3 };

// 风格一：出参错误码，返回 optional（POSIX/Windows API 常见变体）
std::optional<Config> load_config(const std::string& path, ConfigErr* err);

// 风格二：last_error 线程局部变量（C 运行库 errno 风格）
std::optional<Config> load_config(const std::string& path);
ConfigErr last_config_error();
```

调用方必须写对三步：

```cpp
ConfigErr err;
auto cfg = load_config("app.json", &err);
if (!cfg) {                       // 第 1 步：检查 optional
    switch (err) {                // 第 2 步：检查错误码——忘了就只知道「失败」不知道「为什么」
        case ConfigErr::FileNotFound: use_default_config(); break;
        default: report_and_exit(); break;
    }
}
```

逐段解释与陷阱：

- optional 只回答「成功没有」，错误原因在另一个通道（出参指针或线程局部变量）。**两通道天然可以失联**：忘了传 `err` 指针、或者两个 API 调用之间忘了读 `last_error`，原因就丢了。
- 风格一里 `ConfigErr* err` 若不判空就解引用是又一个崩溃点；风格二的 `last_config_error` 在多线程下必须 thread_local，否则 A 线程的错误被 B 线程覆盖。
- 什么时候仍选它：C ABI 边界（异常无法穿越 `extern "C"`）、与 C 库对接的适配层、嵌入式无异常环境。**这是历史兼容选型，不是新代码的首选。**

## 3. 网络请求场景：选型敏感点演示

把场景换成「向远端拉配置」，三种策略的行为差异立刻分明：

```cpp
// 异常版：重试逻辑要靠 catch 包循环
Config fetch_config_ex(const std::string& url) {
    for (int attempt = 0; ; ++attempt) {
        try {
            return http_get_json(url);
        } catch (const NetTimeout&) {
            if (attempt == 2) throw;               // 三次失败后放弃，继续上抛
        }
    }
}

// expected 版：重试是纯值变换，无控制流跳转
std::expected<Config, NetErr> fetch_config_ex(const std::string& url) {
    std::expected<Config, NetErr> r = std::unexpected(NetErr::NotAttempted);
    for (int attempt = 0; attempt < 3; ++attempt) {
        r = http_get_json_ex(url);
        if (r) return r;                            // 成功立即短路
        if (r.error() != NetErr::Timeout) break;     // 非超时错误不重试
    }
    return r;
}
```

对照结论：**「错误是数据、重试是策略」的领域（网络、批处理）expected 更顺手**——错误像普通值一样被比较、聚合、记录；**「错误是罕见且应当中止」的领域（不变量违反、内存耗尽）异常更顺手**——它让正常路径干干净净，没有一层层的 `if (!ok) return`。

## 4. 构造函数：只有异常能出去的地方

这是三条通道里最硬的约束：构造函数没有返回值，所以「构造失败」只有两个出口——抛异常，或者设计成「两段式构造」（先构造空对象再 `init()`）。

```cpp
class TcpConnection {
public:
    TcpConnection(const std::string& host, std::uint16_t port) {
        fd_ = ::socket(AF_INET, SOCK_STREAM, 0);
        if (fd_ < 0) {
            throw std::system_error(errno, std::system_category(), "socket");
        }
        if (::connect(fd_, addr(host, port)) < 0) {
            ::close(fd_);                          // 易错点：抛之前必须手动清理已获资源
            throw std::system_error(errno, std::system_category(), "connect");
        }
    }
    ~TcpConnection() { if (fd_ >= 0) ::close(fd_); }
private:
    int fd_ = -1;
};
```

逐段解释：

- 构造函数抛出时，**对象视为从未构造成功**，析构函数不会被调用——所以抛出前要自己清理 `fd_`。这正是 [RAII 资源管理](/cpp/160-RAIIResourceManagement) 强调「成员用 RAII 类型管理」的原因：成员析构会自动执行，上述手工清理就不需要了。
- 两段式构造的代价：对象可能处于「半构造」状态，每个方法都要先检查是否已初始化——把一个编译期能消灭的错误类别换成运行期状态检查，通常是亏的。结论：**构造期失败默认选异常**；无异常环境才退到工厂函数返回 expected：

```cpp
static std::expected<TcpConnection, NetErr>
try_connect(const std::string& host, std::uint16_t port);   // 工厂函数绕开构造约束
```

工厂函数 + 私有构造函数是「expected 时代构造失败」的标准替代：构造改为私有、由静态工厂返回 expected，类型不变性依然成立。

## 5. 错误的三层分类：选型的第一问

不是所有失败都值得同等待遇。把错误按「预期性」分层：

| 层级 | 例子 | 应对策略 | 通道 |
| :--- | :--- | :--- | :--- |
| 1. 可预期、可恢复 | 文件不存在、输入格式错、网络超时 | 调用方明确处理或重试 | expected / 错误码 |
| 2. 不可预期但可局部恢复 | 某个缓存写入失败 | 记日志、降级继续 | 异常（在边界 catch） |
| 3. 不变量被破坏、程序已不可信 | 数组越界、空指针解引用、资源耗尽 | 尽快终止或隔离 | 异常 + terminate，或 abort |

决策规则一句话：**错误是「调用方签名的一部分」就用 expected，是「程序状态的意外」就用异常，是「协议规定要传的字节」就用错误码（C 边界）**。判断标准：把错误写进函数文档时，它属于「这个函数的行为」（expected）还是「这个函数的前提被打破」（异常）？

## 6. noexcept 与三条通道的交互

`noexcept` 声明「函数不抛」，但异常从 noexcept 函数里逃逸时直接 `std::terminate`——没有 catch 的机会。三套策略下这条规则的表现：

```cpp
// 异常通道：noexcept 是性能承诺 + 终止承诺
void hot_path() noexcept {
    // 内部所有可能抛的调用必须就地消化，或保证不会抛
    // 易错点：noexcept 函数里调用非 noexcept 函数 = 埋雷
}

// expected 通道：天然友好——失败走返回值，函数可以大胆标 noexcept
std::expected<Config, ConfigErr> load() noexcept {
    // 所有失败都变成值返回，没有异常逃逸风险
}

// 移动构造为什么常标 noexcept：vector 扩容时只有 noexcept 移动构造
// 才敢用移动；否则退回拷贝保证强异常安全（详见 190 篇附录 C）
```

工程纪律：库代码给「确定不抛」的函数标 `noexcept`（移动构造、swap、析构）；业务代码在**线程边界与 main 附近**安排兜底 catch；跨过这两条线还到处写 try/catch 的，多半是选型错了。

## 7. 选型决策树

```text
这个失败是程序不变量被破坏吗（继续跑没意义）？
  是 --> 异常（或直接 terminate / assert）
  否 -->
    是构造函数 / 移动 / swap / 析构（无法用返回值的场合）？
      是 --> 异常（析构内严格禁止抛）
      否 -->
        会穿越 C ABI / extern "C" / 无异常编译（-fno-exceptions）？
          是 --> 错误码
          否 -->
            调用方大概率要区分多种错误并分别处理（重试/降级/提示用户）？
              是 --> std::expected
              否 --> 异常（让正常路径保持干净）
```

再叠加一条性能修正：该函数位于**每秒百万次**的热路径，且失败率不可忽略（>1%）时，异常通道的 unwind 开销会显现，倾向于 expected；失败率近乎为零时，表驱动异常的成功路径开销接近零，不必为此扭曲设计。

## 8. 常见陷阱清单

1. **用异常做常规控制流**（循环里 try/catch 当 break 用）：失败频繁时性能崩塌，且控制流不可读。失败率高的路径换 expected。
2. **expected 的 `value()` 忘了先检查**：空 expected 调 `value()` 抛 `bad_expected_access`，等于换了个地方继续炸。
3. **错误码忘了检查**：`load_config(path);` 丢掉 optional 直接用，编译器只有 `[[nodiscard]]` 警告可拦。团队规范里应把「忽略 optional 返回值」设为告警。
4. **catch 后吞掉不重新抛**：`catch (...) {}` 让错误无声消失。要么处理完不再上抛（记录 + 降级），要么 `throw;` 续传。
5. **析构函数抛异常**：栈展开中再抛 = `std::terminate`。析构里必须 try/catch 吃掉一切（详见 190 篇 2.6 节）。
6. **跨动态库边界抛异常**：两套运行时的异常类型、RTTI、堆互不相认，在 DLL 边界用错误码或 expected 传值。

## 9. 动手实践

### 练习一（必做）：三版等价改写

任务：取一个你熟悉的「可能失败」函数（读文件、调 HTTP、解析日期均可），按第 2 节三个版本各写一遍；对每版回答：调用链上有几层函数需要为错误「改动签名或加 try/catch」？忘写错误检查时，编译器报什么、运行时发生什么？

提示：重点观察「中间层改动量」——异常版中间层零改动，expected 版每层签名都要改，这是两套策略最本质的维护成本差异。

<details>
<summary>参考实现（以「读取整数配置」为例）</summary>

```cpp
#include <expected>
#include <fstream>
#include <optional>
#include <stdexcept>
#include <string>

// 版本 A：异常
int read_port_ex(const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("open failed: " + path);
    std::string s{std::istreambuf_iterator<char>(f), {}};
    return std::stoi(s);                        // stoi 失败抛 invalid_argument
}

// 版本 B：expected
enum class CfgErr { OpenFailed, NotANumber };
std::expected<int, CfgErr> read_port_ex(const std::string& path) {
    std::ifstream f(path);
    if (!f) return std::unexpected(CfgErr::OpenFailed);
    std::string s{std::istreambuf_iterator<char>(f), {}};
    try {
        return std::stoi(s);
    } catch (...) {
        return std::unexpected(CfgErr::NotANumber);
    }
}

// 版本 C：错误码 + optional
std::optional<int> read_port_ex(const std::string& path, int* err /*0=ok*/) {
    std::ifstream f(path);
    if (!f) { *err = 1; return std::nullopt; }
    std::string s{std::istreambuf_iterator<char>(f), {}};
    try {
        return std::stoi(s);
    } catch (...) { *err = 2; return std::nullopt; }
}
```

自检：三版的中间层——假设 `read_port_ex` 被 `init_server` 调用、`init_server` 被 `main` 调用。A 版：两层都不用改；B 版：两层要么转发 expected 要么就地处理；C 版：两层都要传错误码指针。哪个版本「忘检查」的后果最隐蔽？答案：C 版，编译器完全沉默，程序带着未初始化端口继续跑。

</details>

### 练习二（选做）：构造失败改造

任务：写一个「打开必须是已存在文件」的 RAII 类，先用「构造函数抛异常」实现；再改造成「私有构造 + 静态工厂返回 `std::expected`」实现；对比两种实现下客户端代码能否用 `if` 一条链表达「打开失败就用默认配置」。

提示：工厂版记得把拷贝/移动语义一并想清楚——expected 里装着不可拷贝的类型（如 `unique_ptr<T>` 包装）时怎么办。

### 练习三（挑战，不给参考实现）

为你的项目绘制一份「错误通道地图」：列出 5 个真实失败点，按第 7 节决策树归类，标出当前实现用的通道，写出两处「选型不当」及其改法与预估改动量。自查：改动是否会撕裂接口边界（中间层签名连锁修改）？若是，评估用异常通道的迁移成本是否更低。

## 10. 与之前和之后的知识的关系

- 往前：[异常安全](/cpp/190-ExceptionSecurity) 提供异常通道的完整操作手册；[RAII 资源管理](/cpp/160-RAIIResourceManagement) 决定了「构造抛异常后已获资源自动释放」是否成立——没有 RAII，异常通道根本不可用。
- 往后：[C++23 新特性](/cpp/730-Cpp23NewFeatures) 4.2 节有 expected 链式操作的完整示例库；[C++26 静态反射](/cpp/405-Cpp26StaticReflection) 与本篇无关但同属「新标准能力」，选型时注意编译器支持差异；[性能优化](/cpp/610-CppPerformance) 提供验证「异常开销是否真是瓶颈」的测量方法。

## 11. 官方文档

- cppreference 错误处理主题：https://en.cppreference.com/w/cpp/error
- std::expected：https://en.cppreference.com/w/cpp/utility/expected
- noexcept 说明符：https://en.cppreference.com/w/cpp/language/noexcept_spec

## 参考与致谢

- 本文三条通道的语义差异（unwind 开销、`bad_expected_access` 行为、noexcept 逃逸即 terminate）依据 cppreference.com（CC-BY-SA 3.0 许可）对应条目转述与扩展：https://en.cppreference.com/w/cpp/error/exceptions 与 https://en.cppreference.com/w/cpp/utility/expected
- 决策树的「不变量破坏 vs 预期失败」分层思想来自 C++ 核心指南 E 系列（开放许可）：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
