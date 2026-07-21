---
order: 73
title: C++测试框架
module: cpp
category: C++
difficulty: intermediate
description: Google Test、Catch2、doctest 等主流 C++ 测试框架的工程实践与对比
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/C++内存模型
  - cpp/C++工具链
  - cpp/C++与Python交互
  - cpp/C++性能优化
  - cpp/设计模式与C++
prerequisites:
  - cpp/概述与现代标准
  - cpp/智能指针详解
  - cpp/C++工具链
---

## 学习目标

本节按照 Bloom 分类法的认知层级组织学习目标,读者完成本章学习后应能够达到以下层级。

### 识记层 (Remembering)

- 列举 C++ 主流测试框架 Google Test、Catch2、doctest、Boost.Test、CppUTest 的名称与特点
- 说出 FIRST 原则 (Fast、Independent、Repeatable、Self-validating、Timely) 的含义
- 复述单元测试、集成测试、参数化测试、死亡测试、基准测试的定义
- 识别 Arrange-Act-Assert (AAA) 测试代码组织模式

### 理解层 (Understanding)

- 解释 TEST、TEST_F、TEST_P、TEST_SUITE 四种宏的区别与适用场景
- 阐述 EXPECT 与 ASSERT 断言的语义差异及失败处理策略
- 描述测试夹具 (Fixture) 的 SetUp/TearDown 生命周期
- 区分 Mock、Stub、Fake、Spy 四种测试替身的语义差异

### 应用层 (Applying)

- 使用 Google Test 编写参数化测试与类型化测试
- 应用 Google Mock 编写 Mock 类并设置 EXPECT_CALL 期望
- 使用 Catch2 的 SECTION、GENERATOR、MATCHERS 进行 BDD 风格测试
- 集成 CTest 与 gtest_discover_tests 实现自动化测试发现

### 分析层 (Analyzing)

- 分析测试覆盖率 (Line、Branch、MC/DC) 的优缺点与适用场景
- 解构 TDD (Red-Green-Refactor) 循环的每一步目标
- 对比 Google Test 与 Catch2 在编译速度、二进制大小、调试体验的差异

### 评价层 (Evaluating)

- 评估一个测试套件的健康度 (覆盖率、稳定性、执行速度)
- 判断测试代码是否过度依赖实现细节 (脆弱测试)
- 在 TDD 与事后测试之间做出工程权衡

### 创造层 (Creating)

- 设计一个支持多种测试框架的统一测试基础设施
- 构建一个面向嵌入式系统的硬件在环 (HIL) 测试框架
- 提出一种基于属性测试 (Property-based Testing) 的 C++ 验证方案

## 历史动机与背景

C++ 测试框架的发展反映了软件工程从"调试驱动"到"测试驱动"再到"行为驱动"的范式演进。

### 1990-2000:C++ 测试的原始时代

早期 C++ 几乎没有专门测试框架,开发者依赖 `assert` 宏与 `printf` 调试。1996 年 Kent Beck 与 Erich Gamma 发布 JUnit,Java 测试生态爆发。受此启发,C++ 社区开始移植与创造:

- **CppUnit** (2000):Michael Feathers 将 JUnit 移植到 C++,成为 C++ 第一个主流单元测试框架。但 CppUnit API 臃肿、编译缓慢、宏使用繁琐,逐渐被淘汰。

### 2000-2008:Google Test 的崛起

2008 年 Google 开源 Google Test (gtest),迅速成为行业标准。设计要点:

- 基于宏的 TEST/TEST_F/TEST_P 语法,降低使用门槛
- 强大的死亡测试 (Death Test),验证 `assert`、`abort`、`exit`
- Google Mock (gmock) 集成,支持复杂接口模拟
- 跨平台支持 Linux、macOS、Windows

gtest 由 Zhanyong Wan 等人设计,核心思想是"开发者友好"与"诊断信息丰富"。其先进的断言失败信息 (自动打印操作数) 与测试过滤机制 (`--gtest_filter`) 极大提升了调试效率。

### 2008-2017:Catch2 的轻量化革命

2010 年 Phil Nash 发布 Catch (C++ Automated Test Cases in Headers),后演进为 Catch2。核心理念:

- 单头文件分发 (header-only),无需编译库
- BDD 风格的 SECTION、SCENARIO、GIVEN-WHEN-THEN
- 编译期分解测试,运行时按 SECTION 树遍历
- 自然语言断言 `REQUIRE(x == 42)`,无需记忆 EXPECT_EQ 等宏

Catch2 在中小项目与教学场景中迅速流行,被 Martijn Hoogendoorn 等人引入荷兰高校教学。其编译速度比 gtest 快 2-5 倍 (因头文件包含少),但单次测试执行略慢 (因 SECTION 树遍历)。

### 2017 至今:doctest 与新一代框架

2016 年 Viktor Kirilov 发布 doctest,定位为"最快的 C++ 测试框架"。核心优化:

- 编译速度比 Catch2 快 3-10 倍 (更少模板实例化)
- 单头文件,支持作为测试与生产代码混编
- 与 IDE 集成友好 (Visual Studio、CLion)

同时期还有:

- **Boost.Test**:Boost 生态一部分,功能全面但 API 较老
- **CppUTest**:嵌入式系统首选,内存占用小
- **Unity**:纯 C 项目,极简
- **rapidcheck**:属性测试,受 QuickCheck 启发
- **snitch**:C++20 新生代,纯头文件、模块支持

### 2020 至今:现代 C++ 与测试演进

C++20 的协程、模块、concepts 给测试框架带来新挑战:

- **模块支持**:gtest 与 Catch2 在 C++20 模块下编译困难
- **协程测试**:异步代码的测试需要新断言模式
- **concepts 验证**:编译期测试的标准化 (static_assert 与 consteval)

Google 在 2022 年开源 GoogleTest 的继承者 GoogleTest v2,引入模块支持与 C++17 最低要求。Catch2 v3 也重新设计为非单头文件,改进编译速度。

### 核心动因总结

C++ 测试框架的演化动因:

- **编译速度**:C++ 编译慢,测试框架需最小化编译开销
- **诊断质量**:断言失败需精确指向问题,而非"segfault"
- **跨平台一致性**:Linux/macOS/Windows 行为一致
- **CI/CD 集成**:支持 JUnit XML 输出、CTest 集成
- **现代 C++ 适配**:概念、模块、协程支持

## 形式化定义

### 测试用例的数学模型

测试用例 $T$ 可形式化为五元组:

$$
T = (I, P, O, A, \tau)
$$

其中:
- $I$ 是输入集合 (Input)
- $P$ 是前置条件 (Precondition)
- $O$ 是期望输出集合 (Oracle)
- $A$ 是断言函数 (Assertion)
- $\tau$ 是执行轨迹 (Trace)

测试通过当且仅当 $P(I)$ 成立且 $A(\text{execute}(I), O) = \text{true}$。

### 测试覆盖率的形式化

给定被测代码 $C$ 与测试套件 $\mathcal{T}$,覆盖率定义为:

$$
\text{Coverage}(C, \mathcal{T}) = \frac{|\text{Covered}(C, \mathcal{T})|}{|C|}
$$

常见覆盖率指标:

- **Line Coverage**:$|\text{covered lines}| / |\text{total lines}|$
- **Branch Coverage**:$|\text{covered branches}| / |\text{total branches}|$
- **MC/DC** (Modified Condition/Decision Coverage):每个条件独立影响决策

### 测试替身 (Test Double) 分类

Martin Fowler 定义五种测试替身:

| 替身类型 | 形式化定义                                              |
| -------- | ------------------------------------------------------- |
| Dummy    | 不被使用,仅为满足参数列表                              |
| Stub     | 返回预设值,不参与断言                                  |
| Spy      | 记录调用,事后验证                                      |
| Mock     | 预设期望,验证交互                                      |
| Fake     | 简化实现,如内存数据库                                  |

### 断言的失败语义

EXPECT 与 ASSERT 的失败语义:

$$
\text{EXPECT}(c): \neg c \implies \text{record failure, continue}
$$
$$
\text{ASSERT}(c): \neg c \implies \text{record failure, abort current test}
$$

ASSERT 适用于后续代码依赖断言成功的场景 (如指针非空),EXPECT 适用于独立的多点检查。

### 测试夹具 (Fixture) 生命周期

测试夹具的 SetUp/TearDown 调用顺序:

$$
\forall T_i \in \mathcal{T}: \text{SetUp}() \xrightarrow{sb} T_i.\text{body}() \xrightarrow{sb} \text{TearDown}()
$$

即每个测试用例都独立执行一次 SetUp 与 TearDown,保证测试隔离性。Google Test 还提供 SetUpTestSuite/TearDownTestSuite 在整个测试套件前后执行一次。

### 参数化测试的组合数学

参数化测试将 $n$ 个测试用例与 $m$ 组参数组合,生成 $n \times m$ 次测试执行:

$$
\text{TEST\_P}(T, P) = \{T(p_1), T(p_2), \ldots, T(p_m)\}
$$

形式化:参数化测试是测试函数 $T$ 与参数集 $P$ 的笛卡尔积。

### 测试执行的全序关系

测试套件的执行需满足全序关系:

$$
\forall T_i, T_j: T_i \xrightarrow{\text{exec}} T_j \lor T_j \xrightarrow{\text{exec}} T_i \lor i = j
$$

且测试之间无依赖 (FIRST-I 独立性原则),允许任意顺序执行。ctest 默认并行执行,/gtest 默认串行 (可通过 `--gtest_filter` 与脚本并行)。

## 理论推导

### 测试有效性的缺陷检测概率

假设代码包含 $N$ 个缺陷,每个缺陷被测试 $T_i$ 检测到的概率为 $p_i$。测试套件 $\mathcal{T}$ 检测到至少一个缺陷的概率:

$$
P(\text{detect}|\mathcal{T}) = 1 - \prod_{i=1}^{N} (1 - p_i)
$$

若测试彼此独立且 $p_i = p$,则:

$$
P(\text{detect}) = 1 - (1-p)^N \approx 1 - e^{-Np}
$$

这是测试覆盖率与缺陷检测的非线性关系根因:覆盖率从 80% 提升到 90% 的价值,远大于从 60% 到 70%。

### MC/DC 覆盖率的必要性

考虑决策 $D = A \land (B \lor C)$,Line/Branch 覆盖可能只验证整体 true/false,但 MC/DC 要求每个条件独立影响决策:

- $A$ 独立影响:固定 $B, C$ 使 $B \lor C = \text{true}$,变化 $A$
- $B$ 独立影响:固定 $A = \text{true}, C = \text{false}$,变化 $B$
- $C$ 独立影响:固定 $A = \text{true}, B = \text{false}$,变化 $C$

MC/DC 是航空软件 (DO-178C Level A) 的强制要求,因为它能在可接受的测试成本下达到接近 100% 的缺陷检测率。

### 测试金字塔的经济性

Mike Cohn 的测试金字塔:

$$
\text{Unit} : \text{Integration} : \text{E2E} \approx 70 : 20 : 10
$$

经济分析:设单元测试成本 $c_u$,集成测试 $c_i = 5 c_u$,E2E $c_e = 50 c_u$。缺陷在单元阶段发现成本 $d_u$,集成阶段 $d_i = 10 d_u$,E2E $d_e = 100 d_u$。最优投资比例应使边际成本与边际收益相等,推导出金字塔比例。

### 死亡测试 (Death Test) 的实现原理

Google Test 死亡测试通过 fork 子进程执行被测代码:

```
1. fork()
2. 子进程:执行被测代码,捕获信号
3. 父进程:waitpid,检查退出码/信号
4. 验证 stderr 输出匹配正则
```

形式化:

$$
\text{EXPECT\_DEATH}(f, r) \iff \text{fork}(); \text{exec}(f); \text{exit\_status} \in \{\text{SIGABRT}, \text{SIGSEGV}\} \land \text{stderr} \sim r
$$

死亡测试不能在非 fork 平台 (如 Windows 默认) 使用,需切换为 `EXPECT_EXIT` 或线程模式 (不推荐,可能死锁)。

### 测试替身的 Liskov 替换原则

Mock 对象必须满足 Liskov 替换原则:

$$
\forall S \in \text{Subtypes}(I): \text{Mock}(S) \text{ 可替换 } I \text{ 的任何实例}
$$

否则被测代码可能依赖真实实现的副作用,导致 Mock 测试通过但生产环境失败。Google Mock 通过 `MOCK_METHOD` 强制实现所有虚函数,但非虚函数的 Mock 需模板注入,违反 LSP 时容易出错。

### Catch2 SECTION 的执行树

Catch2 SECTION 通过编译期构建测试树:

```
TEST_CASE("...") {
    SECTION("a") { ... }
    SECTION("b") {
        SECTION("b1") { ... }
        SECTION("b2") { ... }
    }
}
```

执行顺序:

1. 进入 TEST_CASE,执行 a 的代码
2. 退出,重新进入 TEST_CASE
3. 跳过 a,执行 b 与 b1
4. 退出,重新进入
5. 跳过 a 与 b1,执行 b 与 b2

即每次执行一条 root-to-leaf 路径。复杂度 $O(\text{leaves})$,但共享 SetUp/TearDown 代码。

## 代码示例

### 示例 1:Google Test 基础断言与夹具

```cpp
#include <gtest/gtest.h>
#include <string>
#include <vector>

// 被测函数
int add(int a, int b) { return a + b; }
std::string greet(const std::string& name) { return "Hello, " + name + "!"; }

// 1. 基本测试:TEST 宏定义独立测试用例
// 命名规范:TestSuiteName.TestName,便于 --gtest_filter 过滤
TEST(MathTest, AddPositiveNumbers) {
    EXPECT_EQ(add(1, 2), 3);       // 期望相等
    EXPECT_NE(add(1, 2), 4);       // 期望不等
    EXPECT_GT(add(5, 3), 0);       // 期望大于
    EXPECT_LT(add(-1, 0), 1);      // 期望小于
    EXPECT_LE(add(0, 0), 0);       // 期望小于等于
    EXPECT_GE(add(0, 0), 0);       // 期望大于等于
}

TEST(StringTest, Greet) {
    EXPECT_EQ(greet("World"), "Hello, World!");
    EXPECT_TRUE(greet("Cpp").starts_with("Hello"));
    EXPECT_FALSE(greet("").empty());
}

// 2. 测试夹具:复用 SetUp/TearDown 代码
// 继承 ::testing::Test,通过 TEST_F 使用
class VectorTestFixture : public ::testing::Test {
protected:
    void SetUp() override {
        // 每个测试前执行:初始化测试数据
        vec_ = {1, 2, 3, 4, 5};
        sum_ = 0;
        for (int x : vec_) sum_ += x;
    }

    void TearDown() override {
        // 每个测试后执行:清理资源
        vec_.clear();
    }

    std::vector<int> vec_;
    int sum_;
};

// 使用 TEST_F 访问夹具成员
TEST_F(VectorTestFixture, SizeIsFive) {
    EXPECT_EQ(vec_.size(), 5u);
}

TEST_F(VectorTestFixture, SumIsFifteen) {
    EXPECT_EQ(sum_, 15);
}

TEST_F(VectorTestFixture, PushBackIncreasesSize) {
    vec_.push_back(6);
    EXPECT_EQ(vec_.size(), 6u);
    EXPECT_EQ(vec_.back(), 6);
}
```

### 示例 2:Google Test 参数化测试

```cpp
#include <gtest/gtest.h>
#include <tuple>

int add(int a, int b) { return a + b; }

// 1. 参数化测试夹具:继承 TestWithParam<T>
// T 可以是简单类型或 tuple (多参数)
class AddParameterizedTest :
    public ::testing::TestWithParam<std::tuple<int, int, int>> {};

// 2. TEST_P:用 GetParam() 获取参数
TEST_P(AddParameterizedTest, ReturnsCorrectSum) {
    auto [a, b, expected] = GetParam();
    EXPECT_EQ(add(a, b), expected)
        << "a=" << a << " b=" << b << " expected=" << expected;
}

// 3. INSTANTIATE_TEST_SUITE_P:定义参数集
INSTANTIATE_TEST_SUITE_P(
    BasicAddTests,                       // 实例名 (用于过滤)
    AddParameterizedTest,                // 测试夹具类
    ::testing::Values(
        std::make_tuple(1, 2, 3),
        std::make_tuple(-1, 1, 0),
        std::make_tuple(0, 0, 0),
        std::make_tuple(100, 200, 300),
        std::make_tuple(INT_MAX - 1, 1, INT_MAX)  // 边界值
    ),
    ::testing::PrintToStringParamName()  // 生成可读的测试名
);

// 4. 类型化测试:对多种类型运行相同测试
template <typename T>
class NumericTypeTest : public ::testing::Test {
protected:
    T zero_ = T{};
    T one_ = T{1};
};

using NumericTypes = ::testing::Types<int, long, float, double>;
TYPED_TEST_SUITE(NumericTypeTest, NumericTypes);

TYPED_TEST(NumericTypeTest, ZeroPlusOneEqualsOne) {
    EXPECT_EQ(this->zero_ + this->one_, this->one_);
}
```

### 示例 3:Google Mock 接口模拟

```cpp
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <memory>
#include <string>

// 1. 定义抽象接口 (生产代码依赖此接口)
class Database {
public:
    virtual ~Database() = default;
    virtual bool connect(const std::string& host) = 0;
    virtual std::string query(const std::string& sql) = 0;
    virtual void disconnect() = 0;
    virtual int executeBatch(const std::vector<std::string>& sqls) = 0;
};

// 2. 被测类:依赖 Database 接口
class UserService {
    Database& db_;
public:
    explicit UserService(Database& db) : db_(db) {}

    std::string getUserName(int id) {
        if (!db_.connect("primary")) return "";
        std::string sql = "SELECT name FROM users WHERE id=" + std::to_string(id);
        std::string result = db_.query(sql);
        db_.disconnect();
        return result;
    }
};

// 3. 创建 Mock 类:MOCK_METHOD 宏实现所有虚函数
class MockDatabase : public Database {
public:
    MOCK_METHOD(bool, connect, (const std::string& host), (override));
    MOCK_METHOD(std::string, query, (const std::string& sql), (override));
    MOCK_METHOD(void, disconnect, (), (override));
    MOCK_METHOD(int, executeBatch, (const std::vector<std::string>& sqls), (override));
};

// 4. 使用 Mock 进行测试
using ::testing::_;
using ::testing::Return;
using ::testing::StrEq;
using ::testing::InSequence;

TEST(UserServiceTest, GetUserNameReturnsQueryResult) {
    MockDatabase db;

    // 设置期望:按顺序调用 connect -> query -> disconnect
    InSequence seq;
    EXPECT_CALL(db, connect(StrEq("primary")))
        .Times(1)
        .WillOnce(Return(true));
    EXPECT_CALL(db, query(StrEq("SELECT name FROM users WHERE id=42")))
        .Times(1)
        .WillOnce(Return("Alice"));
    EXPECT_CALL(db, disconnect())
        .Times(1);

    UserService service(db);
    EXPECT_EQ(service.getUserName(42), "Alice");
}

// 5. 验证未预期的调用会失败
TEST(UserServiceTest, ConnectFailureReturnsEmpty) {
    MockDatabase db;
    EXPECT_CALL(db, connect(_))
        .WillOnce(Return(false));  // 模拟连接失败

    // 注意:此时 query 与 disconnect 不应被调用
    // 若被调用,Google Mock 报告 "uninteresting mock function call"

    UserService service(db);
    EXPECT_EQ(service.getUserName(1), "");
}
```

### 示例 4:Catch2 BDD 风格与 SECTION

```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_string.hpp>
#include <catch2/matchers/catch_matchers_vector.hpp>
#include <vector>
#include <string>

int add(int a, int b) { return a + b; }

// 1. 基本测试:TEST_CASE + REQUIRE/CHECK
TEST_CASE("Addition works", "[math]") {
    REQUIRE(add(1, 2) == 3);   // REQUIRE:失败后停止当前测试
    CHECK(add(-1, 1) == 0);    // CHECK:失败后继续

    // 2. SECTION:共享 SetUp,独立执行
    SECTION("positive numbers") {
        REQUIRE(add(2, 3) == 5);
        REQUIRE(add(10, 20) == 30);
    }

    SECTION("negative numbers") {
        REQUIRE(add(-2, -3) == -5);
    }

    SECTION("mixed sign") {
        REQUIRE(add(-5, 10) == 5);
    }
}

// 3. BDD 风格:SCENARIO/GIVEN/WHEN/THEN
class Stack {
    std::vector<int> data_;
public:
    void push(int x) { data_.push_back(x); }
    int pop() {
        if (data_.empty()) throw std::runtime_error("empty");
        int x = data_.back();
        data_.pop_back();
        return x;
    }
    bool empty() const { return data_.empty(); }
    size_t size() const { return data_.size(); }
};

SCENARIO("Stack operations", "[stack]") {
    GIVEN("an empty stack") {
        Stack s;
        REQUIRE(s.empty());

        WHEN("pushing one element") {
            s.push(42);

            THEN("size is 1") {
                REQUIRE(s.size() == 1);
                REQUIRE_FALSE(s.empty());
            }

            THEN("popping returns the element") {
                REQUIRE(s.pop() == 42);
                REQUIRE(s.empty());
            }
        }

        WHEN("pushing multiple elements") {
            s.push(1);
            s.push(2);
            s.push(3);

            THEN("pop returns LIFO order") {
                REQUIRE(s.pop() == 3);
                REQUIRE(s.pop() == 2);
                REQUIRE(s.pop() == 1);
                REQUIRE(s.empty());
            }
        }
    }
}

// 4. 匹配器 (Matchers)
TEST_CASE("Matchers demo", "[matchers]") {
    std::string str = "Hello, World!";
    using namespace Catch::Matchers;

    REQUIRE_THAT(str, ContainsSubstring("World"));
    REQUIRE_THAT(str, StartsWith("Hello"));
    REQUIRE_THAT(str, EndsWith("!"));
    REQUIRE_THAT(str, Equals("Hello, World!"));

    std::vector<int> vec = {1, 2, 3, 4, 5};
    REQUIRE_THAT(vec, Contains(3));
    REQUIRE_THAT(vec, SizeIs(5));
    REQUIRE_THAT(vec, VectorContains(2));
}
```

### 示例 5:Catch2 生成器 (Generator)

```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/generators/catch_generators_range.hpp>

// 1. 基本 GENERATOR:对每个值运行整个 TEST_CASE
TEST_CASE("Fibonacci properties", "[fib]") {
    auto fib = [](int n) -> int {
        if (n <= 1) return n;
        int a = 0, b = 1;
        for (int i = 2; i <= n; ++i) {
            int t = a + b;
            a = b;
            b = t;
        }
        return b;
    };

    int n = GENERATE(0, 1, 2, 5, 10, 20);

    SECTION("fib(n) >= 0") {
        REQUIRE(fib(n) >= 0);
    }

    SECTION("fib is monotonic for n >= 1") {
        if (n >= 1) {
            REQUIRE(fib(n) >= fib(n - 1));
        }
    }
}

// 2. 范围生成器
TEST_CASE("Squares are non-negative", "[math]") {
    int x = GENERATE(range(-10, 11));  // -10 到 10
    REQUIRE(x * x >= 0);
}

// 3. 表驱动测试
TEST_CASE("String length", "[string]") {
    auto [input, expected] = GENERATE(
        std::make_pair(std::string(""), 0),
        std::make_pair(std::string("a"), 1),
        std::make_pair(std::string("hello"), 5),
        std::make_pair(std::string("你好"), 2)  // UTF-8 字节数为 6,字符数为 2
    );

    REQUIRE(input.length() == static_cast<size_t>(expected));
}
```

### 示例 6:doctest 极速测试

```cpp
#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

// 1. doctest 与 Catch2 语法相似,但编译更快
TEST_CASE("Basic arithmetic") {
    CHECK(1 + 1 == 2);
    CHECK_FALSE(1 == 2);
    CHECK_EQ(2 * 3, 6);   // 比 CHECK(2*3 == 6) 略快
    CHECK_NE(1, 2);
}

// 2. 子用例 (类似 Catch2 SECTION)
TEST_CASE("Vectors") {
    std::vector<int> v;

    SUBCASE("empty after creation") {
        CHECK(v.empty());
    }

    SUBCASE("size increases after push") {
        v.push_back(1);
        CHECK(v.size() == 1);
    }
}

// 3. 参数化测试
TEST_CASE_TEMPLATE("Zero is identity for addition", T, int, float, double) {
    T zero = T{};
    T one = T{1};
    CHECK(zero + one == one);
}
```

### 示例 7:Google Test 死亡测试

```cpp
#include <gtest/gtest.h>
#include <cassert>
#include <cstdlib>

// 1. 验证 assert 失败
void validateAge(int age) {
    assert(age >= 0 && age <= 150);
}

TEST(AgeValidationTest, InvalidAgeTriggersDeath) {
    // EXPECT_DEATH 验证程序因 assert/abort 终止
    // 第二个参数是 stderr 输出的正则匹配
    EXPECT_DEATH(validateAge(-1), "age >= 0");
    EXPECT_DEATH(validateAge(200), "age <= 150");
}

TEST(AgeValidationTest, ValidAgeDoesNotDie) {
    EXPECT_NO_FATAL_FAILURE(validateAge(25));
    EXPECT_NO_FATAL_FAILURE(validateAge(0));
    EXPECT_NO_FATAL_FAILURE(validateAge(150));
}

// 2. 验证 exit 调用
void exitIfError(int code) {
    if (code != 0) {
        std::exit(code);
    }
}

TEST(ExitTest, ExitsWithNonZeroCode) {
    EXPECT_EXIT(exitIfError(42),
                ::testing::ExitedWithCode(42),
                "");
}

// 3. 异常测试
double safeDivide(int a, int b) {
    if (b == 0) {
        throw std::invalid_argument("division by zero");
    }
    return static_cast<double>(a) / b;
}

TEST(DivideTest, ThrowsOnZeroDivisor) {
    EXPECT_THROW(safeDivide(10, 0), std::invalid_argument);
    EXPECT_ANY_THROW(safeDivide(10, 0));
    EXPECT_NO_THROW(safeDivide(10, 2));
}
```

### 示例 8:CMake + CTest + Google Test 集成

```cmake
# CMakeLists.txt 完整示例
cmake_minimum_required(VERSION 3.20)
project(MyProject CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 1. 启用测试
enable_testing()

# 2. 引入 Google Test (推荐 FetchContent)
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.tar.gz
)
# Windows: 强制共享库,避免运行时库不匹配
set(gtest_force_shared_rt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# 3. 被测库
add_library(mylib src/math.cpp src/string_utils.cpp)
target_include_directories(mylib PUBLIC include)

# 4. 测试可执行文件
add_executable(my_tests
    test/math_test.cpp
    test/string_test.cpp
    test/integration_test.cpp
)
target_link_libraries(my_tests PRIVATE mylib GTest::gtest_main)

# 5. 自动发现测试:每个 TEST 成为独立 ctest 用例
include(GoogleTest)
gtest_discover_tests(my_tests
    EXTRA_ARGS "--gtest_color=yes"
    PROPERTIES
        LABELS "unit"
        TIMEOUT 30
)

# 6. 集成测试 (慢,标记为 integration)
add_executable(integration_tests test/integration_test.cpp)
target_link_libraries(integration_tests PRIVATE mylib GTest::gtest_main)
gtest_discover_tests(integration_tests
    PROPERTIES LABELS "integration" TIMEOUT 300
)

# 7. 覆盖率编译选项 (需 gcov/lcov)
option(ENABLE_COVERAGE "Enable coverage" OFF)
if (ENABLE_COVERAGE)
    add_compile_options(--coverage -O0 -g)
    add_link_options(--coverage)
endif()
```

```bash
# 构建与运行
cmake -B build -DENABLE_COVERAGE=ON
cmake --build build

# 运行所有测试
ctest --test-dir build --output-on-failure

# 仅运行 unit 测试
ctest --test-dir build -L unit

# 并行运行 (8 个并行)
ctest --test-dir build -j 8

# 生成覆盖率报告
lcov --directory build --capture --output-file coverage.info
lcov --remove coverage.info '/usr/*' '*/test/*' --output-file coverage.filtered
genhtml coverage.filtered --output-directory coverage_report
```

## 对比分析

### 主流测试框架对比

| 框架         | 编译速度 | 单头文件 | Mock 支持 | 死亡测试 | C++20 模块 | 推荐场景           |
| ------------ | -------- | -------- | --------- | -------- | ---------- | ------------------ |
| Google Test  | 慢       | 否       | gmock     | 优秀     | 实验性     | 大型项目、企业     |
| Catch2 v3    | 中       | 否 (v3)  | 无内置    | 一般     | 实验性     | 中型项目、BDD      |
| doctest      | 极快     | 是       | 无内置    | 一般     | 实验性     | 中小项目、快速迭代 |
| Boost.Test   | 慢       | 否       | 无内置    | 一般     | 不支持     | Boost 生态项目     |
| CppUTest     | 中       | 否       | 简单      | 弱       | 不支持     | 嵌入式系统         |
| snitch       | 快       | 是       | 无内置    | 一般     | 支持       | C++20 新项目       |

### EXPECT vs ASSERT vs REQUIRE vs CHECK

| 框架      | 继续断言 | 终止测试 | 终止套件 |
| --------- | -------- | -------- | -------- |
| Google    | EXPECT   | ASSERT   | -        |
| Catch2    | CHECK    | REQUIRE  | -        |
| doctest   | CHECK    | REQUIRE  | -        |
| Boost     | CHECK    | REQUIRE  | -        |

### Mock 框架对比

| 框架             | 实现方式        | 虚函数要求 | 编译速度 | 适用场景             |
| ---------------- | --------------- | ---------- | -------- | -------------------- |
| Google Mock      | MOCK_METHOD 宏  | 必须       | 慢       | 通用                 |
| Trompeloeil      | 模板            | 必须       | 中       | 严格类型检查         |
| FakeIt           | 模板            | 必须       | 快       | 轻量                 |
| HippoMocks       | 模板            | 不强制     | 中       | 简单场景             |
| 手写 Fake        | 直接继承        | 视情况     | 极快     | 简单接口、性能敏感   |

### 测试覆盖率工具对比

| 工具       | 编译器       | 输出格式       | 分支覆盖 | MC/DC | 推荐场景       |
| ---------- | ------------ | -------------- | -------- | ----- | -------------- |
| gcov       | GCC          | .gcov          | 是       | 否    | GCC 项目       |
| llvm-cov   | Clang        | .profraw       | 是       | 否    | Clang 项目     |
| LCOV       | gcov 前端    | HTML           | 是       | 否    | 可视化         |
| Bullseye   | 商业         | HTML           | 是       | 是    | 航空、医疗     |
| Klocwork   | 商业         | IDE            | 是       | 是    | 企业级         |

### 测试金字塔与执行时间

| 测试类型   | 单次执行   | 并行度 | 反馈周期 | 维护成本 |
| ---------- | ---------- | ------ | -------- | -------- |
| Unit       | <100ms     | 高     | 秒级     | 低       |
| Integration| 100ms-1s   | 中     | 分钟级   | 中       |
| E2E        | >10s       | 低     | 分钟级   | 高       |
| Manual     | 不定       | 无     | 天级     | 极高     |

### TDD vs BDD vs AAA

| 模式 | 关注点         | 流程                  | 适用场景         |
| ---- | -------------- | --------------------- | ---------------- |
| TDD  | 实现正确性     | Red-Green-Refactor    | 库、内核开发     |
| BDD  | 业务行为       | Given-When-Then       | 业务系统、验收   |
| AAA  | 代码组织       | Arrange-Act-Assert    | 通用             |

## 常见陷阱与反模式

### 反模式 1:测试依赖测试执行顺序

```cpp
// 错误:testB 依赖 testA 的副作用
TEST_F(SingletonTest, testA) {
    Singleton::instance().set("hello");
}

TEST_F(SingletonTest, testB) {
    // 假设 testA 已执行,依赖 set 的副作用
    EXPECT_EQ(Singleton::instance().get(), "hello");  // 不可靠!
}
```

**生产事故**:某项目测试在 CI 上随机失败,因 ctest 并行执行,testB 在 testA 前运行。修复:每个测试在 SetUp 中显式初始化。

### 反模式 2:测试断言过少或过多

```cpp
// 错误 1:测试无断言 (假测试)
TEST(UserTest, CreateUser) {
    User u("alice");
    // 没有 EXPECT,即使代码错误也通过
}

// 错误 2:单个测试包含 50+ 断言 (难以定位失败)
TEST(BigTest, Everything) {
    EXPECT_EQ(...);  // 50 个断言
}
```

**正确做法**:每个测试聚焦一个行为,3-5 个断言。失败信息能精确定位。

### 反模式 3:Mock 真实系统副作用

```cpp
// 错误:Mock 文件系统 API,但被测代码使用 fopen 而非接口
TEST(FileTest, Read) {
    MockFileSystem fs;
    EXPECT_CALL(fs, open("test.txt"))
        .WillOnce(Return(file_handle));
    // 但被测代码直接调用 fopen,Mock 无效!
    read_file("test.txt");
}
```

**修复**:重构被测代码,通过接口访问外部资源 (依赖注入)。

### 反模式 4:脆弱测试依赖实现细节

```cpp
// 错误:测试私有方法 (通过 #define private public hack)
#define private public
#include "user_manager.h"
TEST(UserManagerTest, HashPassword) {
    UserManager mgr;
    EXPECT_EQ(mgr.hashPassword("abc"), "900150983cd24fb0d6963f7d28e17f72");
}

// 问题:hashPassword 是私有实现,改算法测试就失败
// 正确:测试公共 API 的行为
TEST(UserManagerTest, AuthenticateWithCorrectPassword) {
    UserManager mgr;
    mgr.createUser("alice", "password123");
    EXPECT_TRUE(mgr.authenticate("alice", "password123"));
}
```

### 反模式 5:测试中的硬编码路径

```cpp
// 错误:硬编码绝对路径
TEST(ConfigTest, Load) {
    Config c;
    c.load("/home/alice/project/config.json");  // 换机器就失败
}

// 正确:使用相对路径或测试夹具生成临时文件
class ConfigTest : public ::testing::Test {
protected:
    std::filesystem::path tmp_dir_;
    void SetUp() override {
        tmp_dir_ = std::filesystem::temp_directory_path() / "config_test";
        std::filesystem::create_directories(tmp_dir_);
        std::ofstream(tmp_dir_ / "config.json") << R"({"key":"value"})";
    }
    void TearDown() override {
        std::filesystem::remove_all(tmp_dir_);
    }
};

TEST_F(ConfigTest, Load) {
    Config c;
    EXPECT_TRUE(c.load(tmp_dir_ / "config.json"));
}
```

### 反模式 6:断言浮点数相等

```cpp
// 错误:浮点数精确相等
TEST(MathTest, Sqrt) {
    EXPECT_EQ(std::sqrt(2.0) * std::sqrt(2.0), 2.0);  // 可能失败!
}

// 正确:使用 EXPECT_NEAR 或 DoubleEq matcher
TEST(MathTest, Sqrt) {
    EXPECT_NEAR(std::sqrt(2.0) * std::sqrt(2.0), 2.0, 1e-10);
    EXPECT_THAT(std::sqrt(2.0) * std::sqrt(2.0),
                ::testing::DoubleEq(2.0));
}
```

### 反模式 7:测试代码与生产代码重复

```cpp
// 错误:测试重新实现算法 (一改两处都改)
TEST(SortTest, Ascending) {
    std::vector<int> input = {5, 2, 8, 1};
    std::vector<int> expected = {1, 2, 5, 8};
    // 测试中重新排序,等价于复制实现
    std::sort(input.begin(), input.end());
    EXPECT_EQ(input, expected);
}

// 正确:使用预计算的固定期望值
TEST(SortTest, Ascending) {
    std::vector<int> input = {5, 2, 8, 1};
    my_sort(input);  // 调用被测函数
    EXPECT_EQ(input, (std::vector<int>{1, 2, 5, 8}));  // 固定期望
}
```

### 反模式 8:过度 Mock 导致测试无效

```cpp
// 错误:Mock 所有依赖,测试变成"测试 Mock 本身"
TEST(OrderTest, Process) {
    MockDb db;
    MockLogger logger;
    MockNotifier notifier;
    MockValidator validator;
    MockPricer pricer;

    EXPECT_CALL(db, ...);
    EXPECT_CALL(logger, ...);
    EXPECT_CALL(notifier, ...);
    EXPECT_CALL(validator, ...).WillOnce(Return(true));
    EXPECT_CALL(pricer, ...).WillOnce(Return(100));

    OrderProcessor op(db, logger, notifier, validator, pricer);
    EXPECT_TRUE(op.process(order));  // 仅验证调用流程,不验证业务逻辑
}
```

**正确做法**:优先使用真实 Fake (如内存数据库),仅 Mock 外部不可控依赖 (网络、时间)。

### 反模式 9:睡眠等待测试

```cpp
// 错误:固定睡眠等待异步结果
TEST(AsyncTest, Result) {
    auto future = compute_async();
    std::this_thread::sleep_for(std::chrono::seconds(2));  // 慢且不可靠
    EXPECT_TRUE(future.is_ready());
}

// 正确:使用 future::wait_for 或条件变量
TEST(AsyncTest, Result) {
    auto future = compute_async();
    EXPECT_EQ(future.wait_for(std::chrono::seconds(5)),
              std::future_status::ready);
    EXPECT_EQ(future.get(), expected);
}
```

### 反模式 10:测试代码缺乏可读性

```cpp
// 错误:命名不清晰、参数无意义
TEST(T, t1) {
    auto x = f(1, 2, 3);
    EXPECT_EQ(x, 6);
}

// 正确:BDD 风格命名 + Arrange-Act-Assert
TEST(CalculatorTest, SumOfThreePositiveNumbersReturnsCorrectTotal) {
    // Arrange
    Calculator calc;
    int a = 1, b = 2, c = 3;

    // Act
    int result = calc.sum({a, b, c});

    // Assert
    EXPECT_EQ(result, 6);
}
```

## 工程实践

### 实践 1:测试目录结构

```
project/
├── CMakeLists.txt
├── include/                    # 公共头文件
├── src/                        # 生产代码
├── test/                       # 测试代码
│   ├── CMakeLists.txt
│   ├── unit/                   # 单元测试
│   │   ├── math_test.cpp
│   │   └── string_test.cpp
│   ├── integration/            # 集成测试
│   └── e2e/                    # 端到端测试
├── third_party/                # 第三方依赖
└── tools/
    └── run_tests.sh            # 测试脚本
```

### 实践 2:CI/CD 流水线集成

```yaml
# GitHub Actions 示例
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        compiler: [gcc, clang]
        build_type: [Debug, Release]
    steps:
      - uses: actions/checkout@v3
      - name: Configure
        run: cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.build_type }}
      - name: Build
        run: cmake --build build -j $(nproc)
      - name: Test
        run: ctest --test-dir build --output-on-failure --parallel 4
      - name: Upload coverage
        if: matrix.compiler == 'gcc' && matrix.build_type == 'Debug'
        run: |
          lcov --directory build --capture --output-file coverage.info
          bash <(curl -s https://codecov.io/bash) -f coverage.info
```

### 实践 3:测试命名规范

```cpp
// 命名约定:被测方法_场景_期望结果
TEST(UserManagerTest, CreateUser_WithValidInput_ReturnsTrue) {}
TEST(UserManagerTest, CreateUser_WithDuplicateName_ThrowsException) {}
TEST(UserManagerTest, CreateUser_WithEmptyName_ThrowsException) {}

// 或 BDD 风格:Should_期望_When_场景
TEST(UserManagerTest, Should_ReturnTrue_When_CreatingUserWithValidInput) {}
```

### 实践 4:测试数据管理

```cpp
// 使用 Builder 模式构建复杂测试数据
class OrderBuilder {
    Order order_;
public:
    OrderBuilder& withId(int id) { order_.id = id; return *this; }
    OrderBuilder& withCustomer(const std::string& name) {
        order_.customer = name;
        return *this;
    }
    OrderBuilder& withItem(const Item& item) {
        order_.items.push_back(item);
        return *this;
    }
    Order build() { return std::move(order_); }
};

TEST(OrderProcessorTest, ProcessOrder) {
    auto order = OrderBuilder()
        .withId(1)
        .withCustomer("Alice")
        .withItem({"apple", 5})
        .withItem({"banana", 3})
        .build();
    // ...
}
```

### 实践 5:测试时间相关代码

```cpp
// 抽象时间接口,测试中可控
class Clock {
public:
    virtual ~Clock() = default;
    virtual std::chrono::system_clock::time_point now() = 0;
};

class SystemClock : public Clock {
public:
    std::chrono::system_clock::time_point now() override {
        return std::chrono::system_clock::now();
    }
};

class MockClock : public Clock {
    std::chrono::system_clock::time_point current_;
public:
    void setNow(std::chrono::system_clock::time_point t) { current_ = t; }
    void advance(std::chrono::seconds s) { current_ += s; }
    std::chrono::system_clock::time_point now() override { return current_; }
};

TEST(TokenTest, ExpiresAfterOneHour) {
    MockClock clock;
    clock.setNow(std::chrono::system_clock::time_point{});

    Token token(clock.now(), std::chrono::hours(1));
    EXPECT_FALSE(token.isExpired(clock.now()));

    clock.advance(std::chrono::minutes(59));
    EXPECT_FALSE(token.isExpired(clock.now()));

    clock.advance(std::chrono::minutes(2));
    EXPECT_TRUE(token.isExpired(clock.now()));
}
```

### 实践 6:并发代码测试

```cpp
#include <gtest/gtest.h>
#include <thread>
#include <atomic>
#include <vector>

TEST(ConcurrencyTest, AtomicCounter) {
    std::atomic<int> counter{0};
    constexpr int kThreads = 8;
    constexpr int kIters = 10000;

    std::vector<std::thread> threads;
    for (int i = 0; i < kThreads; ++i) {
        threads.emplace_back([&counter]() {
            for (int j = 0; j < kIters; ++j) {
                counter.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    for (auto& t : threads) t.join();
    EXPECT_EQ(counter.load(), kThreads * kIters);
}

// 使用 ThreadSanitizer 检测数据竞争
// 编译:g++ -fsanitize=thread -g -O1 test.cpp -o test
TEST(ConcurrencyTest, DetectDataRace) {
    int data = 0;  // 非原子!

    std::thread t1([&]() { data++; });
    std::thread t2([&]() { data++; });

    t1.join();
    t2.join();
    // TSan 会报告 data race
}
```

### 实践 7:基准测试集成

```cpp
#include <benchmark/benchmark.h>

// Google Benchmark 用于性能测试
static void BM_VectorPushBack(benchmark::State& state) {
    for (auto _ : state) {
        std::vector<int> v;
        for (int i = 0; i < state.range(0); ++i) {
            v.push_back(i);
        }
    }
    state.SetItemsProcessed(state.range(0));
}

BENCHMARK(BM_VectorPushBack)->Range(8, 8192);
BENCHMARK(BM_VectorPushBack)->Range(8, 8192)->Threads(4);

BENCHMARK_MAIN();
```

## 案例研究

### 案例 1:Google Chrome 的测试体系

Chrome 浏览器有约 100 万个测试用例,涵盖:

- **单元测试**:gtest,每个类独立测试
- **集成测试**:跨模块交互 (如渲染 + 网络)
- **浏览器测试**:BrowserTest 框架,启动完整浏览器
- **Web 平台测试**:WPT (Web Platform Tests),与 W3C 标准对齐
- **Fuzz 测试**:libFuzzer,自动发现崩溃

Chrome 测试关键实践:

1. **测试分布在全球 CI**:每个 commit 触发 10+ 平台测试
2. **Try Job**:提交前在沙箱验证,避免阻塞主干
3. **Gardener 轮值**:专人修复主干测试失败
4. **Test Expectations**:已知失败标记,不阻塞开发

### 案例 2:LLVM/Clang 的测试策略

LLVM 项目测试分多层:

- **单元测试**:gtest,测试 LLVM IR 与 pass
- **FileCheck 测试**:基于 `// CHECK:` 注释验证 IR 输出
- **LIT (LLVM Integrated Tester)**:Python 脚本驱动端到端测试
- **编译测试**:在 100+ 源文件上验证编译器行为

```python
# LIT 测试示例
# RUN: %clang -O2 %s -o %t
# RUN: %t | FileCheck %s

#include <stdio.h>
int main() {
    printf("hello\n");
    return 0;
}
// CHECK: hello
```

### 案例 3:Tesla Autopilot 的 HIL 测试

Tesla 自动驾驶采用硬件在环 (Hardware-in-the-Loop) 测试:

- 真实 ECU 连接仿真传感器
- 回放真实驾驶日志 (200 万+ 英里)
- 模拟极端场景 (雨夜、施工区)
- 每晚运行 10 万+ 场景测试

关键工具:dSPACE、NI VeriStand、Carla (开源)。

### 案例 4:Folly 的测试基础设施

Facebook Folly 库的测试实践:

- 使用 Google Test + Google Mock
- 自研 `folly::test::TestUtil` 提供临时文件、环境变量 mock
- 集成 Valgrind、TSan、ASan、UBSan
- Benchmarks 与单元测试分离,独立 CI 任务

```cpp
// Folly 风格的临时目录工具
class TempDir {
    std::filesystem::path path_;
public:
    TempDir() {
        path_ = std::filesystem::temp_directory_path() /
                ("folly_test_" + std::to_string(getpid()));
        std::filesystem::create_directories(path_);
    }
    ~TempDir() { std::filesystem::remove_all(path_); }
    const std::filesystem::path& path() const { return path_; }
};
```

### 案例 5:某金融系统的事务测试

某银行核心系统使用属性测试验证事务正确性:

```cpp
#include <rapidcheck/rapidcheck.h>
#include <gtest/gtest.h>

// 属性:任意账户的转账操作后,总余额不变
RC_GTEST_PROP(TransferTest, TotalBalanceUnchanged,
              (int from, int to, int amount)) {
    Bank bank;
    bank.createAccount(from, 1000);
    bank.createAccount(to, 1000);

    int total_before = bank.getTotalBalance();
    bank.transfer(from, to, amount);
    int total_after = bank.getTotalBalance();

    RC_ASSERT(total_before == total_after);
}
```

属性测试自动生成 100+ 随机输入,发现手动测试遗漏的边界 bug。

### 案例 6:开源项目 Catch2 的自我测试

Catch2 自身用 Catch2 测试 Catch2,关键挑战:

- 递归测试可能死锁 (Catch2 捕获自身异常)
- 子用例嵌套的边界条件
- 编译器兼容性矩阵

Catch2 团队通过分层测试解决:

1. **核心层**:用最小测试子集验证基本断言
2. **中间层**:测试 SECTION、GENERATOR 等高级特性
3. **集成层**:测试与 CMake、CTest 集成

## 习题

### 基础题

**1.** 解释 FIRST 原则,并说明为什么"快速 (Fast)"对单元测试至关重要。

**参考答案要点**:Fast (毫秒级)、Independent (无依赖)、Repeatable (任意环境一致)、Self-validating (无需人工判断)、Timely (与生产代码同步)。快速测试保证开发者频繁运行,提供即时反馈;慢测试被跳过,失去价值。

**2.** 何时使用 EXPECT,何时使用 ASSERT?给出具体例子。

**参考答案要点**:
- EXPECT:多个独立检查,失败后继续收集其他失败
- ASSERT:后续代码依赖断言成功 (如指针非空、容器非空),失败后必须终止

```cpp
TEST(Example, Demo) {
    auto* ptr = getPtr();
    ASSERT_NE(ptr, nullptr);  // 后续解引用,必须非空
    EXPECT_EQ(ptr->value, 42);  // 独立检查
    EXPECT_EQ(ptr->count, 1);
}
```

**3.** 比较 TEST、TEST_F、TEST_P 的使用场景。

**参考答案要点**:
- TEST:简单独立测试
- TEST_F:需要 SetUp/TearDown 的夹具测试
- TEST_P:参数化测试,用多组输入验证同一逻辑

### 进阶题

**4.** 设计一个 MockFileSystem 类,验证如下代码:

```cpp
std::string readConfig(const std::string& path);  // 失败返回 ""
```

**参考答案要点**:

```cpp
class FileSystem {
public:
    virtual ~FileSystem() = default;
    virtual bool exists(const std::string& path) = 0;
    virtual std::string read(const std::string& path) = 0;
};

class MockFileSystem : public FileSystem {
public:
    MOCK_METHOD(bool, exists, (const std::string& path), (override));
    MOCK_METHOD(std::string, read, (const std::string& path), (override));
};

std::string readConfig(FileSystem& fs, const std::string& path) {
    if (!fs.exists(path)) return "";
    return fs.read(path);
}

TEST(ConfigTest, ReturnsEmptyWhenFileMissing) {
    MockFileSystem fs;
    EXPECT_CALL(fs, exists("missing.json"))
        .WillOnce(Return(false));
    EXPECT_EQ(readConfig(fs, "missing.json"), "");
}

TEST(ConfigTest, ReturnsContentWhenFileExists) {
    MockFileSystem fs;
    EXPECT_CALL(fs, exists("config.json"))
        .WillOnce(Return(true));
    EXPECT_CALL(fs, read("config.json"))
        .WillOnce Return(R"({"key":"value"})"));
    EXPECT_EQ(readConfig(fs, "config.json"), R"({"key":"value"})");
}
```

**5.** 分析以下测试为何脆弱,并重构:

```cpp
TEST(OrderTest, Total) {
    Order o;
    o.add(Item{"apple", 1.5, 3});  // 价格、数量
    o.add(Item{"banana", 2.0, 2});
    double total = o.total();
    EXPECT_DOUBLE_EQ(total, 8.5);  // 1.5*3 + 2.0*2
}
```

**参考答案要点**:脆弱原因——若价格、数量改变,期望值需手动同步;浮点累加顺序可能影响结果。重构:

```cpp
TEST(OrderTest, TotalEqualsSumOfItemSubtotals) {
    Order o;
    Item apple{"apple", 1.5, 3};
    Item banana{"banana", 2.0, 2};
    o.add(apple);
    o.add(banana);

    double expected = apple.price * apple.qty + banana.price * banana.qty;
    EXPECT_DOUBLE_EQ(o.total(), expected);
}
```

**6.** 用 Catch2 实现 BDD 风格测试,验证一个 ATM 取款流程。

**参考答案要点**:

```cpp
SCENARIO("ATM withdrawal", "[atm]") {
    GIVEN("an ATM with $1000 and a card with $500 balance") {
        ATM atm(1000);
        Card card(500);

        WHEN("withdrawing $200") {
            atm.insert(card);
            atm.withdraw(200);

            THEN("card balance is $300") {
                REQUIRE(card.balance() == 300);
            }
            THEN("ATM cash is $800") {
                REQUIRE(atm.cash() == 800);
            }
        }

        WHEN("withdrawing more than balance") {
            atm.insert(card);
            THEN("transaction is rejected") {
                REQUIRE_THROWS_AS(atm.withdraw(600), InsufficientFunds);
            }
        }
    }
}
```

### 挑战题

**7.** 设计一个测试框架,支持以下功能:

- 编译期测试 (consteval)
- 运行期测试
- 性能基准
- 属性测试
- Mock

给出架构设计与核心 API。

**参考答案要点**:
- 分层架构:核心断言 (compile + runtime) + 高级特性 (property + benchmark) + 工具 (Mock)
- 核心宏:`STATIC_TEST` (consteval)、`TEST_CASE` (runtime)
- 属性测试:`RC_PROPERTY` 配合 `rapidcheck`
- Mock:基于 concepts 的 `MOCK_INTERFACE`
- 集成:CMake 函数 `add_test_suite` 自动注册

**8.** 分析 Google Test 死亡测试在 Windows 上的限制,并提出跨平台方案。

**参考答案要点**:
- Windows 无 fork,Google Test 默认用线程模拟,但 assert 在 release 模式下是 noop,且线程异常可能死锁
- 方案 1:子进程执行死亡测试,通过 IPC 通信
- 方案 2:使用 SEH (Structured Exception Handling) 捕获
- 方案 3:仅在 Debug 模式启用死亡测试,Release 用 EXPECT_ANY_THROW 替代

**9.** 证明:对纯函数 (无副作用),属性测试比单元测试更有效。

**参考答案要点**:
- 纯函数 $f: A \to B$,属性测试寻找不变式 $\forall x \in A: P(f, x)$
- 经典属性:幂等性 $f(f(x)) = f(x)$、交换律 $f(x, y) = f(y, x)$
- 单元测试仅验证离散点,属性测试验证全集
- 反例:`std::sort` 属性测试可发现 NaN 比较的边界 bug (单元测试难覆盖)
- 局限:非纯函数 (有副作用) 难以属性化

**10.** 设计一个支持时间旅行的测试框架,允许"回放"多线程执行。

**参考答案要点**:
- 记录所有线程调度点,生成执行轨迹
- 回放时按记录顺序执行,保证可复现
- 工具:rr (Mozilla)、ConcBug、CHESS
- 挑战:外部输入 (网络、时间) 需 mock
- 应用:调试罕见数据竞争

## 参考文献

以下参考文献遵循 ACM Reference Format。

1. Beck, K. 2002. *Test Driven Development: By Example*. Addison-Wesley Professional, Boston, MA.

2. Meszaros, G. 2007. *xUnit Test Patterns: Refactoring Test Code*. Addison-Wesley Professional, Boston, MA.

3. Fowler, M. 2006. Mocks aren't stubs. *martinfowler.com*. https://martinfowler.com/articles/mocksArentStubs.html

4. Cohn, M. 2009. *Succeeding with Agile: Software Development Using Scrum*. Addison-Wesley Professional, Boston, MA.

5. Beck, K., and Gamma, E. 1998. Test infected: Programmers love writing tests. *Java Report* 3, 7, 37-50.

6. Nash, P. 2010. Catch: A modern, C++-native, header-only test framework for unit-tests, TDD and BDD. *GitHub repository*. https://github.com/catchorg/Catch2

7. Kirilov, V. 2016. doctest: The fastest feature-rich C++11 single-header testing framework. *GitHub repository*. https://github.com/doctest/doctest

8. Google. 2008. GoogleTest documentation. *GoogleTest*. https://google.github.io/googletest/

9. RTCA. 2011. *DO-178C: Software Considerations in Airborne Systems and Equipment Certification*. RTCA, Washington, DC.

10. Claessen, K., and Hughes, J. 2000. QuickCheck: A lightweight tool for random testing of Haskell programs. In *Proceedings of the 5th ACM SIGPLAN International Conference on Functional Programming (ICFP '00)*. ACM, 268-279. DOI: https://doi.org/10.1145/351240.351266

11. Muslu, K., Sorrentino, F., and Tekinerdogan, B. 2014. From unit tests to property-based testing: A systematic mapping study. In *Proceedings of the 18th International Conference on Evaluation and Assessment in Software Engineering (EASE '14)*. ACM, Article 23, 1-12. DOI: https://doi.org/10.1145/2601248.2601284

12. Fraser, G., and Arcuri, A. 2011. EvoSuite: Automatic test suite generation for object-oriented software. In *Proceedings of the 19th ACM SIGSOFT Symposium and the 13th European Conference on Foundations of Software Engineering (ESEC/FSE '11)*. ACM, 416-419. DOI: https://doi.org/10.1145/2025113.2025179

13. Pacheco, C., Lahiri, S. K., Ernst, M. D., and Ball, T. 2007. Feedback-directed random test generation. In *Proceedings of the 29th International Conference on Software Engineering (ICSE '07)*. IEEE, 75-84. DOI: https://doi.org/10.1109/ICSE.2007.37

14. Christiansen, M., and Wasowski, A. 2015. Testing C++ template concepts with QuickCheck. In *Proceedings of the 2015 ACM SIGPLAN International Conference on Generative Programming: Concepts and Experiences (GPCE '15)*. ACM, 87-96. DOI: https://doi.org/10.1145/2814204.2814221

15. Orso, A., and Rothermel, G. 2004. Software testing: A research bibliography. *ACM SIGSOFT Software Engineering Notes* 29, 5, 1-7. DOI: https://doi.org/10.1145/1022494.1022510

16. Bertolino, A. 2007. Software testing research: Achievements, challenges, dreams. In *Future of Software Engineering (FOSE '07)*. IEEE, 85-103. DOI: https://doi.org/10.1109/FOSE.2007.25

17. Jorgensen, P. C. 2013. *Software Testing: A Craftsman's Approach* (4th ed.). Auerbach Publications, Boca Raton, FL.

18. Koskela, L. 2013. *Effective Unit Testing: A Guide for Java Developers*. Manning Publications, Shelter Island, NY.

19. Adzic, G. 2011. *Specification by Example: How Successful Teams Deliver the Right Software*. Manning Publications, Shelter Island, NY.

20. International Organization for Standardization. 2020. *Information technology — Programming languages — C++* (ISO/IEC 14882:2020), Clause 17: Library introduction. ISO, Geneva, Switzerland.

## 延伸阅读

### 官方文档

- GoogleTest User's Guide (https://google.github.io/googletest/)
- GoogleMock Documentation (https://google.github.io/googletest/gmock_cook_book.html)
- Catch2 Documentation (https://github.com/catchorg/Catch2/blob/devel/docs/Readme.md)
- doctest Documentation (https://github.com/doctest/doctest/blob/master/doc/markdown/readme.md)
- Google Benchmark (https://github.com/google/benchmark)

### 经典教材

- Kent Beck. *Test Driven Development: By Example*. Addison-Wesley, 2002.
- Gerard Meszaros. *xUnit Test Patterns*. Addison-Wesley, 2007.
- Lasse Koskela. *Effective Unit Testing*. Manning, 2013.
- Gojko Adzic. *Specification by Example*. Manning, 2011.

### 前沿论文

- Pacheco et al. "Feedback-Directed Random Test Generation" (ICSE 2007) - Randoop 工具
- Claessen & Hughes "QuickCheck" (ICFP 2000) - 属性测试奠基
- Fraser & Arcuri "EvoSuite" (ESEC/FSE 2011) - 自动测试生成

### 在线资源

- Martin Fowler's blog: 测试相关文章 (https://martinfowler.com/tags/testing.html)
- Andy Glew's blog: 硬件测试 (https://animateMotion.blogspot.com)
- RAII (Reddit r/cpp): C++ 测试讨论 (https://reddit.com/r/cpp)
- CppCon talks: 测试相关演讲 (https://youtube.com/user/CppCon)

### 相关课程

- MIT 6.005: Elements of Software Construction
- CMU 17-514: Software Engineering for ML Systems
- Stanford CS329: Software Testing
- Berkeley CS169: Software as a Service

### 实战项目

- 练习 1:为 STL 容器写单元测试,覆盖所有迭代器失效场景
- 练习 2:用属性测试验证一个排序算法的稳定性与正确性
- 练习 3:实现一个简单的 Mock 框架,支持 EXPECT_CALL 与 WillOnce
- 练习 4:为多生产者多消费者队列写并发测试,使用 TSan 验证
- 练习 5:集成 Google Benchmark,对比 `std::vector` 与 `std::list` 的性能
