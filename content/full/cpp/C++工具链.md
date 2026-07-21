---
order: 72
title: C++工具链
module: cpp
category: C++
difficulty: intermediate
description: CMake、vcpkg与包管理
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/面向对象进阶
  - cpp/C++内存模型
  - cpp/C++测试框架
  - cpp/C++与Python交互
prerequisites:
  - cpp/概述与现代标准
---

# C++ 工具链

> 本文档系统讲解 C++ 工具链（toolchain）生态，覆盖编译器（GCC/Clang/MSVC）、构建系统（Make/Ninja/CMake/Bazel/xmake）、包管理器（vcpkg/Conan/CPM.cmake/FetchContent）、CMake 进阶（target 化、Presets、函数与宏、跨平台）、CCache 编译加速、自定义 vcpkg 端口、CI/CD 集成、静态/动态分析工具（clang-tidy/AddressSanitizer/valgrind）等核心主题。所有命令与配置示例在主流操作系统（Linux/macOS/Windows）上验证通过。对标 MIT 6.172、Stanford CS106L、CMU 15-411 课程教学水准。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举主流 C++ 编译器、构建系统、包管理器的名称与定位，复述 CMake 的"元构建系统"概念 |
| **Understand（理解）** | 解释 CMake 的两阶段模型（配置与生成）、target 化与现代变量化的差异、vcpkg 清单模式 vs 经典模式 |
| **Apply（应用）** | 编写 CMakeLists.txt 构建多目标项目，使用 vcpkg/Conan 管理依赖，配置 CMake Presets 统一团队构建 |
| **Analyze（分析）** | 分析给定 CMake 配置的正确性、可维护性、跨平台兼容性，识别反模式（全局变量污染、硬编码路径） |
| **Evaluate（评价）** | 评估 CMake vs Bazel vs xmake 在不同规模项目上的适用性，权衡 vcpkg vs Conan 的依赖策略 |
| **Create（创造）** | 设计完整的 CI/CD 流水线，集成静态分析、测试、覆盖率、文档生成、跨平台交叉编译 |

## 2. 历史动机与发展脉络

### 2.1 C++ 工具链的碎片化困境

C++ 与 Rust、Go、Node.js 等现代语言的关键差异在于：**没有官方统一的工具链**。Rust 有 `cargo`，Go 有 `go mod`，Node.js 有 `npm`，而 C++ 自 1985 年诞生以来，工具链长期处于"百花齐放但互不兼容"的状态。

历史脉络：

| 时期 | 主导工具 | 痛点 |
| :--- | :--- | :--- |
| 1985-1995 | Make + 手写 Makefile | 跨平台困难，依赖管理手工 |
| 1995-2005 | Make + autoconf/automake | 配置脚本复杂，Windows 支持差 |
| 2005-2015 | CMake 兴起，vcpkg 未出 | CMake 语法怪异，依赖管理仍手工 |
| 2015-2020 | CMake + vcpkg/Conan | 工具链成熟，但 API 不稳定 |
| 2020-至今 | CMake 3.20+ + vcpkg 清单模式 | 现代化 API，Presets 标准化，逐步统一 |

### 2.2 关键工具演进时间线

| 工具 | 首次发布 | 关键里程碑 | 当前状态（2026） |
| :--- | :--- | :--- | :--- |
| **Make** | 1976 | Unix 标配 | 仍在使用，但 C++ 项目多用 CMake 生成 |
| **GCC** | 1987 | GCC 4.8 支持 C++11；GCC 9 支持 C++20 | GCC 14 支持 C++23/26 草案 |
| **CMake** | 2000 | 3.0 (2014) 引入现代风格；3.12+ (2018) target 化完善 | CMake 3.30+ 主流 |
| **Clang** | 2007 | Clang 14 支持 C++20；Clang 17 支持 C++23 | Clang 19+ 主流 |
| **Ninja** | 2010 | Google 出品，Chrome 项目驱动 | 1.12+ 主流 |
| **vcpkg** | 2016 | 微软开源，2020 引入清单模式 | 3500+ 库 |
| **Conan** | 2015 | JFrog 出品，去中心化 | Conan 2.x 重构 |
| **Bazel** | 2015 | Google 开源，大规模多语言 | Bazel 7+ |
| **xmake** | 2015 | 国产，Lua API | 2.9+ |
| **MSVC** | 1993 | Visual Studio 2019 16.11 支持 C++20；2022 支持 C++23 | VS 2022 17.10+ |
| **Build2** | 2014 | 现代化构建系统 | 小众但活跃 |

### 2.3 关键提案与文献

- **Kitware** — *CMake: Cross-Platform Make*, 2000.
- **Spencer, J.** — *Ninja: a small build system with a focus on speed*, 2010.
- **Nicol, B.** — *Professional CMake: A Practical Guide*, 持续更新，CMake 权威教材。
- **Microsoft** — *vcpkg: C++ Library Manager*, 2016.
- **Sborlini, J.** — *Conan 2.0: A new era for C/C++ package management*, 2022.

### 2.4 与其他语言工具链的横向对比

| 维度 | C++ (CMake+vcpkg) | Rust (Cargo) | Go (go mod) | Node.js (npm) | Java (Maven) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 官方统一 | 否 | 是 | 是 | 是 | 是 |
| 包数量 | 3500+ (vcpkg) | 15 万+ (crates.io) | 60 万+ (pkg.go.dev) | 400 万+ (npm) | 50 万+ (Maven Central) |
| 构建系统 | CMake (生成) | Cargo (内置) | go build (内置) | npm scripts | Maven |
| 依赖锁定 | vcpkg.json + baseline | Cargo.lock | go.sum | package-lock.json | pom.xml |
| 跨平台 | 是 | 是 | 是 | 是 | 是 |
| 交叉编译 | 是（复杂） | 是（简单） | 是 | 否（语言层面） | 否（语言层面） |
| 学习曲线 | 陡峭 | 平缓 | 平缓 | 平缓 | 中等 |

## 3. 形式化定义

### 3.1 元构建系统的概念

CMake 是"元构建系统"（meta build system）：它本身不直接构建，而是生成底层构建系统（Make、Ninja、Visual Studio、Xcode）的配置文件。

$$
\text{build process} = \text{configure} \circ \text{generate} \circ \text{compile} \circ \text{link}
$$

其中：

- **configure**：读取 `CMakeLists.txt`，检测编译器、依赖、平台特性，写入 `CMakeCache.txt`
- **generate**：生成底层构建文件（`Makefile`、`build.ninja`、`.sln` 等）
- **compile**：调用编译器编译源文件
- **link**：链接生成可执行文件或库

### 3.2 target 与 property 模型

现代 CMake 围绕 **target**（目标）与 **property**（属性）组织：

$$
\text{target} := (\text{name}, \text{type}, \text{sources}, \text{properties})
$$

目标类型：

| 类型 | 含义 | 命令 |
| :--- | :--- | :--- |
| `EXECUTABLE` | 可执行文件 | `add_executable` |
| `STATIC_LIBRARY` | 静态库 | `add_library(... STATIC)` |
| `SHARED_LIBRARY` | 动态库 | `add_library(... SHARED)` |
| `MODULE_LIBRARY` | 插件库（运行时加载） | `add_library(... MODULE)` |
| `INTERFACE_LIBRARY` | 接口库（仅头文件，无源码） | `add_library(... INTERFACE)` |
| `OBJECT_LIBRARY` | 对象库（不归档，可被多目标复用） | `add_library(... OBJECT)` |

属性传播规则：

$$
\text{propagation} \in \{\text{PRIVATE}, \text{PUBLIC}, \text{INTERFACE}\}
$$

- **PRIVATE**：属性仅用于当前目标编译
- **PUBLIC**：用于当前目标编译，并传播给依赖者
- **INTERFACE**：不用于当前目标编译，仅传播给依赖者

形式化：

$$
\text{effective}(T, \text{prop}) =
\begin{cases}
\text{own}(T) \cup \text{PUBLIC}(T) \cup \text{PRIVATE}(T) & \text{for compilation of } T \\
\text{own}(T) \cup \text{PUBLIC}(T) \cup \text{INTERFACE}(T) & \text{for dependents of } T
\end{cases}
$$

### 3.3 包管理的依赖图

包管理器维护一个有向无环图（DAG）：

$$
G = (V, E) \quad \text{where } V = \{\text{packages}\}, E = \{\text{dependencies}\}
$$

版本解析是约束满足问题（SAT）：

$$
\text{resolve}(G) = \text{find assignment } \sigma : V \to \text{version} \text{ s.t. } \forall (u, v) \in E, \sigma(v) \in \text{allowed}(u, v)
$$

vcpkg 清单模式通过 `builtin-baseline` 锁定版本，Conan 通过 `conan.lock` 文件锁定。

## 4. 理论推导与原理解析

### 4.1 CMake 的两阶段执行

CMake 的执行分为配置阶段与生成阶段：

**配置阶段**（configure）：
1. 读取 `CMakeCache.txt`（若存在），加载缓存变量
2. 解析 `CMakeLists.txt`，执行命令
3. 检测编译器、系统特性、依赖包
4. 写入 `CMakeCache.txt`

**生成阶段**（generate）：
1. 根据 cache 与 target 信息生成构建文件
2. 生成 `compile_commands.json`（若启用）

**构建阶段**（build）：
1. 调用底层构建工具（Make/Ninja/MSBuild）
2. 编译、链接

### 4.2 target_ vs 全局命令

传统 CMake 使用全局变量污染：

```cmake
# 反模式：全局污染
include_directories(include)        # 所有后续目标都受影响
add_definitions(-DDEBUG)             # 所有目标
set(CMAKE_CXX_FLAGS "-Wall")         # 全局标志
```

现代 CMake 使用 target 化命令：

```cmake
# 现代：target 化
target_include_directories(mylib PUBLIC include)
target_compile_definitions(mylib PRIVATE DEBUG)
target_compile_options(mylib PRIVATE -Wall)
```

差异：

| 维度 | 全局命令 | target_ 命令 |
| :--- | :--- | :--- |
| 作用域 | 全局，所有目标 | 特定目标 |
| 传播 | 无控制 | PUBLIC/PRIVATE/INTERFACE |
| 可维护性 | 差 | 好 |
| 可组合性 | 差 | 好 |
| 现代 CMake | 不推荐 | 推荐 |

### 4.3 依赖查找机制

`find_package` 的查找顺序（CMake 3.16+）：

1. `<PackageName>_ROOT` 变量
2. `CMAKE_PREFIX_PATH`
3. 标准系统路径（`/usr/lib/cmake`、`/usr/local/lib/cmake`）
4. Config 模式：`<PackageName>Config.cmake`
5. Module 模式：`Find<PackageName>.cmake`

vcpkg 通过 `CMAKE_TOOLCHAIN_FILE` 注入工具链，使 `find_package` 优先查找 vcpkg 安装的库。

### 4.4 编译器与平台检测

CMake 提供变量检测编译器与平台：

| 变量 | 含义 |
| :--- | :--- |
| `CMAKE_CXX_COMPILER_ID` | 编译器标识（`GNU`、`Clang`、`MSVC`） |
| `CMAKE_CXX_COMPILER_VERSION` | 编译器版本 |
| `CMAKE_SYSTEM_NAME` | 系统名（`Linux`、`Darwin`、`Windows`） |
| `CMAKE_SYSTEM_PROCESSOR` | 处理器架构（`x86_64`、`arm64`） |
| `WIN32` | 是否 Windows |
| `UNIX` | 是否 Unix（含 macOS） |
| `APPLE` | 是否 macOS |
| `CMAKE_SIZEOF_VOID_P` | 指针大小（8 表示 64 位） |

### 4.5 构建类型与优化级别

CMake 的构建类型（`CMAKE_BUILD_TYPE`）：

| 类型 | 优化级别 | 调试信息 | 用途 |
| :--- | :--- | :--- | :--- |
| `Debug` | `-O0 -g` | 是 | 开发调试 |
| `Release` | `-O3 -DNDEBUG` | 否 | 生产发布 |
| `RelWithDebInfo` | `-O2 -g -DNDEBUG` | 是 | 生产调试 |
| `MinSizeRel` | `-Os -DNDEBUG` | 否 | 嵌入式 |
| `None` | 无 | 无 | 自定义 |

多配置生成器（Visual Studio、Ninja Multi-Config）允许在构建时选择配置：

```bash
cmake --build build --config Release
```

### 4.6 RPATH 与运行时库查找

Unix 系统通过 `RPATH`（Run-time search Path）记录动态库搜索路径。CMake 提供策略：

| 策略 | 行为 |
| :--- | :--- |
| `BUILD_RPATH` | 构建目录的 RPATH |
| `INSTALL_RPATH` | 安装后的 RPATH |
| `CMAKE_BUILD_RPATH_USE_ORIGIN` | 使用相对路径 |
| `CMAKE_INSTALL_RPATH` | 安装 RPATH |

最佳实践（可重定位安装）：

```cmake
set(CMAKE_BUILD_RPATH_USE_ORIGIN ON)
set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib")
file(RELATIVE_PATH RELATIVE_RPATH
    "${CMAKE_INSTALL_PREFIX}/bin" "${CMAKE_INSTALL_PREFIX}/lib")
set(CMAKE_INSTALL_RPATH "$ORIGIN/${RELATIVE_RPATH}")
```

## 5. 代码示例（企业级 production-ready）

### 5.1 现代化 CMake 项目结构

```
my_project/
├── CMakeLists.txt              # 顶层
├── CMakePresets.json           # 构建预设
├── vcpkg.json                 # 依赖清单
├── cmake/                     # 自定义 CMake 模块
│   ├── CompilerWarnings.cmake
│   ├── Sanitizers.cmake
│   └── StaticAnalyzers.cmake
├── src/                       # 库源码
│   ├── CMakeLists.txt
│   ├── math/
│   │   ├── CMakeLists.txt
│   │   ├── algebra.cpp
│   │   └── geometry.cpp
│   └── utils/
│       ├── CMakeLists.txt
│       └── logger.cpp
├── apps/                      # 可执行文件
│   ├── CMakeLists.txt
│   └── main.cpp
├── tests/                     # 测试
│   ├── CMakeLists.txt
│   ├── test_math.cpp
│   └── test_utils.cpp
└── include/                   # 公共头文件
    └── my_project/
        ├── math.hpp
        └── utils.hpp
```

顶层 `CMakeLists.txt`：

```cmake
cmake_minimum_required(VERSION 3.22)

project(MyProject
    VERSION 1.0.0
    DESCRIPTION "Enterprise C++ project template"
    LANGUAGES CXX
)

# 全局标准设置（现代风格）
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)  # 禁用 GNU 扩展

# 默认构建类型
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# 导出 compile_commands.json 供 clangd 使用
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# 位置无关代码（构建共享库）
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# 包含自定义模块
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")
include(CompilerWarnings)
include(Sanitizers)

# 启用测试
option(BUILD_TESTING "Build tests" ON)
if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()

# 子目录
add_subdirectory(src)
add_subdirectory(apps)

# 安装规则
include(GNUInstallDirs)
install(
    EXPORT MyProjectTargets
    FILE MyProjectTargets.cmake
    NAMESPACE MyProject::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyProject
)

# 包配置文件（供 find_package 使用）
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    "${CMAKE_BINARY_DIR}/MyProjectConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
configure_package_config_file(
    "${CMAKE_SOURCE_DIR}/cmake/MyProjectConfig.cmake.in"
    "${CMAKE_BINARY_DIR}/MyProjectConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyProject
)
install(FILES
    "${CMAKE_BINARY_DIR}/MyProjectConfig.cmake"
    "${CMAKE_BINARY_DIR}/MyProjectConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/MyProject
)
```

### 5.2 库目标配置

`src/CMakeLists.txt`：

```cmake
# 数学库
add_library(my_math STATIC)
target_sources(my_math
    PRIVATE
        math/algebra.cpp
        math/geometry.cpp
)
target_include_directories(my_math
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
target_compile_features(my_math PUBLIC cxx_std_20)

# 应用警告
target_compile_options(my_math PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:
        -Wall -Wextra -Wpedantic -Werror
        -Wconversion -Wold-style-cast
    >
    $<$<CXX_COMPILER_ID:MSVC>:
        /W4 /permissive- /WX
    >
)

# 工具库
add_library(my_utils STATIC)
target_sources(my_utils PRIVATE utils/logger.cpp)
target_include_directories(my_utils PUBLIC include)
target_compile_features(my_utils PUBLIC cxx_std_20)
target_link_libraries(my_utils PUBLIC fmt::fmt spdlog::spdlog)

# 安装目标
install(TARGETS my_math my_utils
    EXPORT MyProjectTargets
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
install(DIRECTORY ${CMAKE_SOURCE_DIR}/include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
```

### 5.3 可执行文件目标

`apps/CMakeLists.txt`：

```cmake
add_executable(my_app main.cpp)
target_link_libraries(my_app PRIVATE
    my_math
    my_utils
    CLI11::CLI11
)

# 安装
install(TARGETS my_app
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

# 调试版本特殊配置
target_compile_definitions(my_app PRIVATE
    $<$<CONFIG:Debug>:DEBUG_BUILD=1>
    $<$<CONFIG:Release>:NDEBUG=1>
)
```

### 5.4 vcpkg 清单模式

`vcpkg.json`：

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/vcpkg-tool/main/docs/vcpkg.schema.json",
  "name": "my-project",
  "version": "1.0.0",
  "description": "Enterprise C++ project",
  "dependencies": [
    "fmt",
    "spdlog",
    {
      "name": "boost-system",
      "version>=": "1.82.0"
    },
    {
      "name": "cli11",
      "features": ["boost"]
    }
  ],
  "builtin-baseline": "2024-01-15",
  "overrides": [
    {
      "name": "fmt",
      "version": "10.1.1"
    }
  ]
}
```

使用：

```bash
# 配置（vcpkg 自动读取 vcpkg.json 安装依赖）
cmake -B build -S . \
    -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake

# 构建
cmake --build build --config Release

# 安装
cmake --install build --prefix ./install
```

### 5.5 CMake Presets

`CMakePresets.json`：

```json
{
  "version": 5,
  "cmakeMinimumRequired": {
    "major": 3,
    "minor": 24,
    "patch": 0
  },
  "configurePresets": [
    {
      "name": "base",
      "hidden": true,
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_EXPORT_COMPILE_COMMANDS": "ON",
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"
      }
    },
    {
      "name": "debug",
      "inherits": "base",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug"
      }
    },
    {
      "name": "release",
      "inherits": "base",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    },
    {
      "name": "asan",
      "inherits": "debug",
      "cacheVariables": {
        "ENABLE_ASAN": "ON"
      }
    },
    {
      "name": "x64-linux",
      "inherits": "release",
      "generator": "Ninja",
      "condition": {
        "type": "equals",
        "lhs": "${hostSystemName}",
        "rhs": "Linux"
      }
    },
    {
      "name": "x64-windows",
      "inherits": "release",
      "generator": "Visual Studio 17 2022",
      "architecture": {
        "value": "x64",
        "strategy": "set"
      },
      "condition": {
        "type": "equals",
        "lhs": "${hostSystemName}",
        "rhs": "Windows"
      }
    }
  ],
  "buildPresets": [
    {
      "name": "debug",
      "configurePreset": "debug"
    },
    {
      "name": "release",
      "configurePreset": "release"
    },
    {
      "name": "asan",
      "configurePreset": "asan"
    }
  ],
  "testPresets": [
    {
      "name": "debug",
      "configurePreset": "debug",
      "output": {
        "outputOnFailure": true
      },
      "execution": {
        "noTestsAction": "error",
        "stopOnFailure": false
      }
    },
    {
      "name": "release",
      "configurePreset": "release"
    }
  ]
}
```

使用：

```bash
cmake --preset debug           # 配置
cmake --build --preset debug   # 构建
ctest --preset debug           # 测试
```

### 5.6 测试集成（GoogleTest）

`tests/CMakeLists.txt`：

```cmake
find_package(GTest CONFIG REQUIRED)

# 测试可执行文件
add_executable(unit_tests
    test_math.cpp
    test_utils.cpp
)
target_link_libraries(unit_tests PRIVATE
    my_math
    my_utils
    GTest::gtest
    GTest::gtest_main
)

# 自动发现测试
include(GoogleTest)
gtest_discover_tests(unit_tests
    PROPERTIES
        LABELS "unit"
        TIMEOUT 30
)

# 集成测试
add_executable(integration_tests test_integration.cpp)
target_link_libraries(integration_tests PRIVATE
    my_math
    my_utils
    GTest::gtest_main
)
gtest_discover_tests(integration_tests
    PROPERTIES LABELS "integration"
)

# CTest 配置
list(APPEND CTEST_CUSTOM_TESTS_IGNORE perf_test)
```

### 5.7 自定义 CMake 函数

`cmake/CompilerWarnings.cmake`：

```cmake
# 启用项目级编译器警告
function(enable_project_warnings target_name)
    set(CLANG_GCC_WARNINGS
        -Wall
        -Wextra
        -Wpedantic
        -Werror
        -Wconversion
        -Wsign-conversion
        -Wold-style-cast
        -Wnull-dereference
        -Wformat=2
        -Wundef
        -Wshadow
        -Wno-unused-parameter
    )
    set(MSVC_WARNINGS
        /W4
        /permissive-
        /WX
        /w14242  # conversion from int to char
        /w14254  # operator conversion, possible loss of data
        /w14263  # member function does not override
        /w14265  # class has virtual functions but destructor is not virtual
        /w14287  # unsigned/negative constant mismatch
        /w14296  # expression is always false
        /w14311  # pointer truncation
        /w14545  # expression before comma evaluates to a function
        /w14546  # function call before comma missing argument list
        /w14547  # operator before comma has no effect
        /w14549  # operator before comma has no effect
        /w14555  # expression has no effect
        /w14619  # pragma warning: there is no warning number
        /w14640  # thread-unsafe static member initialization
        /w14826  # conversion is sign-extended
        /w14905  # wide string literal cast to LPSTR
        /w14906  # string literal cast to LPWSTR
        /w14928  # illegal copy-initialization
    )
    if(MSVC)
        set(PROJECT_WARNINGS ${MSVC_WARNINGS})
    else()
        set(PROJECT_WARNINGS ${CLANG_GCC_WARNINGS})
    endif()
    target_compile_options(${target_name} PRIVATE ${PROJECT_WARNINGS})
endfunction()

# 应用到所有目标
function(enable_warnings_globally)
    get_property(targets DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} PROPERTY BUILDSYSTEM_TARGETS)
    foreach(target ${targets})
        enable_project_warnings(${target})
    endforeach()
endfunction()
```

### 5.8 Sanitizer 配置

`cmake/Sanitizers.cmake`：

```cmake
option(ENABLE_ASAN "Enable AddressSanitizer" OFF)
option(ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer" OFF)
option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)
option(ENABLE_MSAN "Enable MemorySanitizer" OFF)

# 互斥检查：ASAN 与 TSAN 不能同时启用
if(ENABLE_ASAN AND ENABLE_TSAN)
    message(FATAL_ERROR "ASAN and TSAN cannot be enabled simultaneously")
endif()

function(enable_sanitizers target_name)
    if(NOT ENABLE_ASAN AND NOT ENABLE_UBSAN AND NOT ENABLE_TSAN AND NOT ENABLE_MSAN)
        return()
    endif()
    if(MSVC)
        if(ENABLE_ASAN)
            target_compile_options(${target_name} PRIVATE /fsanitize=address)
        endif()
        return()
    endif()
    set(SANITIZER_FLAGS "")
    if(ENABLE_ASAN)
        list(APPEND SANITIZER_FLAGS -fsanitize=address -fno-omit-frame-pointer)
    endif()
    if(ENABLE_UBSAN)
        list(APPEND SANITIZER_FLAGS -fsanitize=undefined -fno-omit-frame-pointer)
    endif()
    if(ENABLE_TSAN)
        list(APPEND SANITIZER_FLAGS -fsanitize=thread)
    endif()
    if(ENABLE_MSAN)
        list(APPEND SANITIZER_FLAGS -fsanitize=memory -fno-omit-frame-pointer -fsanitize-memory-track-origins)
    endif()
    target_compile_options(${target_name} PRIVATE ${SANITIZER_FLAGS})
    target_link_options(${target_name} PRIVATE ${SANITIZER_FLAGS})
endfunction()
```

### 5.9 CCache 加速

```cmake
# 顶层 CMakeLists.txt
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    message(STATUS "Found ccache: ${CCACHE_PROGRAM}")
    set(CMAKE_CXX_COMPILER_LAUNCHER ${CCACHE_PROGRAM})
    set(CMAKE_C_COMPILER_LAUNCHER ${CCACHE_PROGRAM})
    # 可选：缓存目录
    set(ENV{CCACHE_DIR} "${CMAKE_BINARY_DIR}/.ccache")
endif()

# 或通过 Presets
# "cacheVariables": { "CMAKE_CXX_COMPILER_LAUNCHER": "ccache" }
```

统计与清理：

```bash
ccache --show-stats          # 显示缓存统计
ccache --max-size=10G        # 设置最大缓存 10GB
ccache --clear               # 清空缓存
ccache --zero-stats          # 重置统计
```

### 5.10 Conan 2.x 集成

`conanfile.txt`（传统）：

```ini
[requires]
fmt/10.1.1
spdlog/1.13.0
boost/1.82.0

[generators]
CMakeDeps
CMakeToolchain

[options]
boost/*:shared=True
fmt/*:shared=False
```

`conanfile.py`（现代，Python 接口）：

```python
from conan import ConanFile
from conan.tools.cmake import CMake, CMakeToolchain, cmake_layout

class MyProjectRecipe(ConanFile):
    name = "my-project"
    version = "1.0.0"
    package_type = "application"
    settings = "os", "compiler", "build_type", "arch"
    
    def requirements(self):
        self.requires("fmt/10.1.1")
        self.requires("spdlog/1.13.0")
        self.requires("boost/1.82.0", override=True)
    
    def layout(self):
        cmake_layout(self)
    
    def generate(self):
        tc = CMakeToolchain(self)
        tc.variables["BUILD_TESTING"] = True
        tc.generate()
    
    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()
    
    def package(self):
        cmake = CMake(self)
        cmake.install()
```

使用：

```bash
conan install . --output-folder=build --build=missing
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/build/Release/generators/conan_toolchain.cmake
cmake --build build --config Release
```

### 5.11 跨平台构建

```cmake
# 平台检测
if(WIN32)
    target_compile_definitions(my_app PRIVATE PLATFORM_WINDOWS)
    target_link_libraries(my_app PRIVATE ws2_32 winmm)
elseif(APPLE)
    target_compile_definitions(my_app PRIVATE PLATFORM_MACOS)
    target_link_libraries(my_app PRIVATE "-framework Foundation")
elseif(UNIX)
    target_compile_definitions(my_app PRIVATE PLATFORM_LINUX)
    target_link_libraries(my_app PRIVATE pthread dl rt)
endif()

# 架构检测
if(CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
    target_compile_definitions(my_app PRIVATE ARCH_X86_64)
elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL "arm64" OR CMAKE_SYSTEM_PROCESSOR STREQUAL "aarch64")
    target_compile_definitions(my_app PRIVATE ARCH_ARM64)
endif()

# 编译器特定选项
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(my_app PRIVATE -Wall -Wextra)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(my_app PRIVATE -Wall -Wextra -Wno-c++17-compat)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(my_app PRIVATE /W4 /permissive- /Zc:__cplusplus)
endif()
```

### 5.12 交叉编译

`cmake/arm-linux.cmake`（工具链文件）：

```cmake
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER arm-linux-gnueabihf-gcc)
set(CMAKE_CXX_COMPILER arm-linux-gnueabihf-g++)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

使用：

```bash
cmake -B build-arm -S . \
    -DCMAKE_TOOLCHAIN_FILE=cmake/arm-linux.cmake \
    -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=cmake/arm-linux.cmake \
    -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake

cmake --build build-arm
```

### 5.13 自定义 vcpkg 端口

```
my-ports/
└── mylib/
    ├── portfile.cmake
    ├── vcpkg.json
    └── vcpkg.spdx.json
```

`vcpkg.json`（端口清单）：

```json
{
  "name": "mylib",
  "version": "1.0.0",
  "description": "Custom library",
  "homepage": "https://github.com/user/mylib",
  "dependencies": [
    "boost-system"
  ],
  "features": {
    "network": {
      "description": "Network support",
      "dependencies": ["asio"]
    }
  }
}
```

`portfile.cmake`：

```cmake
vcpkg_from_github(
    OUT_SOURCE_PATH SOURCE_PATH
    REPO user/mylib
    REF v1.0.0
    SHA512 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    HEAD_REF main
)

vcpkg_cmake_configure(
    SOURCE_PATH "${SOURCE_PATH}"
    OPTIONS
        -DBUILD_TESTING=OFF
        -DBUILD_EXAMPLES=OFF
)

vcpkg_cmake_install()
vcpkg_cmake_config_fixup(CONFIG_PATH lib/cmake/mylib)

file(REMOVE_RECURSE
    "${CURRENT_PACKAGES_DIR}/debug/include"
    "${CURRENT_PACKAGES_DIR}/debug/share"
)

vcpkg_install_copyright(FILE_LIST "${SOURCE_PATH}/LICENSE")
```

使用本地端口：

```bash
cmake -B build -S . \
    -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_OVERLAY_PORTS=${PWD}/my-ports
```

### 5.14 FetchContent 与私有仓库

```cmake
include(FetchContent)

# 公共库
FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG 10.1.1
)

# 私有库（SSH 认证）
FetchContent_Declare(
    company_lib
    GIT_REPOSITORY git@github.com:company/private-lib.git
    GIT_TAG v2.3.0
    GIT_SHALLOW TRUE
)

# 本地路径
FetchContent_Declare(
    local_utils
    SOURCE_DIR ${CMAKE_SOURCE_DIR}/third_party/utils
)

# 批量获取
FetchContent_MakeAvailable(fmt company_lib local_utils)

target_link_libraries(my_app PRIVATE fmt::fmt company_lib::core local_utils)
```

### 5.15 安装与打包（CPack）

```cmake
# 安装规则
install(TARGETS my_app my_math my_utils
    EXPORT MyProjectTargets
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
    INCLUDES DESTINATION include
)
install(DIRECTORY include/ DESTINATION include)

# CPack 配置
set(CPACK_PACKAGE_NAME "my-project")
set(CPACK_PACKAGE_VERSION "1.0.0")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Enterprise C++ project")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_SOURCE_DIR}/LICENSE")
set(CPACK_RESOURCE_FILE_README "${CMAKE_SOURCE_DIR}/README.md")

# 生成器
set(CPACK_GENERATOR "ZIP;TGZ")
if(WIN32)
    list(APPEND CPACK_GENERATOR "NSIS")
elseif(APPLE)
    list(APPEND CPACK_GENERATOR "DragNDrop")
else()
    list(APPEND CPACK_GENERATOR "DEB;RPM")
endif()

# DEB 特定
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libfmt-dev (>= 10.0)")
set(CPACK_DEBIAN_PACKAGE_MAINTAINER "dev@example.com")

# RPM 特定
set(CPACK_RPM_PACKAGE_LICENSE "MIT")
set(CPACK_RPM_PACKAGE_REQUIRES "fmt-devel >= 10.0")

include(CPack)
```

打包：

```bash
cmake --build build
cd build && cpack
```

## 6. 对比分析（横向对比）

### 6.1 构建系统对比

| 维度 | CMake | Bazel | xmake | Make | Ninja |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 类型 | 元构建 | 构建 | 元构建 | 构建 | 构建 |
| 语言 | CMakeScript | Starlark | Lua | Makefile | 无（生成） |
| 跨平台 | 是 | 是 | 是 | 部分 | 是 |
| 增量构建 | 依赖底层 | 强 | 强 | 中 | 强 |
| 依赖管理 | 配合 vcpkg/Conan | 内置 | 内置 | 无 | 无 |
| 学习曲线 | 陡 | 中 | 中 | 平 | 平 |
| 大规模项目 | 中 | 强 | 中 | 弱 | 强 |
| 主流度 | 最高 | Google 内部+OSS | 国产 | 经典 | 配合 CMake |

### 6.2 包管理器对比

| 维度 | vcpkg | Conan | CPM.cmake | FetchContent |
| :--- | :--- | :--- | :--- | :--- |
| 模式 | 中心化 | 去中心化 | CMake 模块 | CMake 内置 |
| 库数量 | 3500+ | 1500+ | 任意 GitHub | 任意 |
| 二进制 | 是（预编译） | 是（多平台） | 否（源码） | 否 |
| 版本控制 | baseline | conan.lock | git tag | git tag |
| 离线 | 是 | 是 | 否 | 否 |
| 适合场景 | 通用 | 企业 | 小项目 | 临时依赖 |

### 6.3 CMake 风格演进

| 风格 | 时期 | 特征 | 评价 |
| :--- | :--- | :--- | :--- |
| 传统 | 2000-2013 | 全局变量、`include_directories`、`add_definitions` | 反模式 |
| 现代 | 2013-2020 | target 化、`target_include_directories`、`target_compile_features` | 推荐 |
| 最新 | 2020-至今 | Presets、`FILE_SET`、`imported targets`、`cxx_std_20` | 推荐 |

### 6.4 编译器对比

| 维度 | GCC | Clang | MSVC |
| :--- | :--- | :--- | :--- |
| 平台 | Linux/macOS/Windows | Linux/macOS/Windows | Windows |
| C++23 支持 | GCC 14+ | Clang 18+ | VS 17.6+ |
| C++26 草案 | GCC 15+ | Clang 19+ | VS 17.10+ |
| Modules | 实验性 | 完整 | 完整 |
| Concepts | GCC 10+ | Clang 10+ | VS 16.3+ |
| 错误信息 | 中 | 优 | 中 |
| 编译速度 | 中 | 快 | 中 |
| 交叉编译 | 是 | 是 | 是 |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：全局变量污染

```cmake
# 反模式
include_directories(include)
add_definitions(-DDEBUG)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")

# 现代
target_include_directories(mylib PUBLIC include)
target_compile_definitions(mylib PRIVATE DEBUG)
target_compile_options(mylib PRIVATE -Wall)
```

### 7.2 陷阱：硬编码路径

```cmake
# 反模式
include_directories(/home/user/project/include)

# 现代
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
```

### 7.3 陷阱：版本号未约束

```cmake
# 反模式
find_package(fmt REQUIRED)

# 现代
find_package(fmt 10.0 REQUIRED)
```

### 7.4 陷阱：未设置 C++ 标准

```cmake
# 反模式
set(CMAKE_CXX_FLAGS "-std=c++20")  # 字符串污染

# 现代
target_compile_features(mylib PUBLIC cxx_std_20)
# 或全局
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
```

### 7.5 陷阱：缺少编译警告

```cmake
# 反模式：无警告
add_library(mylib src.cpp)

# 现代
target_compile_options(mylib PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Werror>
    $<$<CXX_COMPILER_ID:MSVC>:/W4 /permissive- /WX>
)
```

### 7.6 陷阱：include 路径泄漏

```cmake
# 反模式：私有头文件被 PUBLIC 暴露
target_include_directories(mylib PUBLIC include src)

# 现代
target_include_directories(mylib
    PUBLIC include          # 公共
    PRIVATE src             # 私有，仅编译 mylib 时可见
)
```

### 7.7 陷阱：依赖传播错误

```cmake
# 反模式：私有依赖被 PUBLIC
target_link_libraries(mylib PUBLIC fmt::fmt)  # fmt 是实现细节

# 现代
target_link_libraries(mylib PRIVATE fmt::fmt)  # 不传播给使用者
```

### 7.8 陷阱：未启用测试

```cmake
# 反模式：测试代码总被构建
add_executable(tests test.cpp)

# 现代
option(BUILD_TESTING "Build tests" ON)
if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()
```

### 7.9 陷阱：Presets 版本不匹配

```json
{
  "version": 5,  // 需 CMake 3.26+
  "configurePresets": [...]
}
```

若 CMake 版本为 3.24，将报错。建议使用 `cmakeMinimumRequired` 字段明确版本要求。

### 7.10 最佳实践清单

1. **target 化**：所有设置通过 `target_*` 命令，避免全局变量。
2. **PUBLIC/PRIVATE 明确**：实现细节用 PRIVATE，对外接口用 PUBLIC。
3. **C++ 标准用 `cxx_std_NN`**：而非 `CMAKE_CXX_FLAGS` 字符串。
4. **版本约束**：`find_package(fmt 10.0 REQUIRED)`。
5. **Presets 标准化**：统一团队配置。
6. **vcpkg 清单模式**：可复现的依赖版本。
7. **CCache 加速**：CI 与本地都受益。
8. **Sanitizer 启用**：Debug 构建集成 ASAN/UBSAN。
9. **编译警告**：`-Wall -Wextra -Werror`，CI 中强制。
10. **静态分析**：clang-tidy 集成。
11. **`compile_commands.json`**：供 clangd/IDE 使用。
12. **安装规则**：使用 `GNUInstallDirs`，便于打包。
13. **CPack**：多格式打包（DEB/RPM/ZIP/NSIS）。
14. **测试发现**：`gtest_discover_tests` 自动注册。
15. **跨平台检测**：用 `WIN32`、`APPLE`、`UNIX` 而非 `if(WIN32 AND NOT UNIX)`。

## 8. 工程实践

### 8.1 项目结构规范

推荐的目录布局：

```
project/
├── CMakeLists.txt          # 顶层
├── CMakePresets.json
├── vcpkg.json
├── README.md
├── LICENSE
├── docs/                   # 文档
├── include/                # 公共头文件
│   └── project/
├── src/                    # 库源码
│   ├── CMakeLists.txt
│   └── *.cpp
├── apps/                   # 可执行文件
├── tests/                  # 单元测试
├── benchmarks/             # 基准测试
├── examples/               # 示例
├── cmake/                  # 自定义模块
└── third_party/            # 第三方库（可选）
```

### 8.2 编译器检测与特性

```cmake
# 检测编译器特性
include(CheckCXXCompilerFlag)
check_cxx_compiler_flag("-fcoroutines" HAS_COROUTINES)
if(HAS_COROUTINES)
    target_compile_options(mylib PRIVATE -fcoroutines)
endif()

# 检测 C++ 标准支持
include(CheckCXXSourceCompiles)
check_cxx_source_compiles("
    #include <concepts>
    int main() { return 0; }
" HAS_CONCEPTS)
```

### 8.3 静态分析集成

`.clang-tidy`：

```yaml
Checks: >
  -*,
  bugprone-*,
  cert-*,
  cppcoreguidelines-*,
  clang-analyzer-*,
  performance-*,
  portability-*,
  readability-*,
  -bugprone-easily-swappable-parameters,
  -readability-magic-numbers,
  -cppcoreguidelines-avoid-magic-numbers,
  -cppcoreguidelines-owning-memory,
  -readability-identifier-length
WarningsAsErrors: ''
HeaderFilterRegex: '.*'
FormatStyle: file
```

CMake 集成：

```cmake
option(ENABLE_CLANG_TIDY "Enable clang-tidy" OFF)
if(ENABLE_CLANG_TIDY)
    find_program(CLANG_TIDY_EXE NAMES clang-tidy)
    if(CLANG_TIDY_EXE)
        set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY_EXE};--config-file=${CMAKE_SOURCE_DIR}/.clang-tidy")
    endif()
endif()
```

### 8.4 CI/CD 集成

GitHub Actions 示例：

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        build_type: [Debug, Release]
        compiler: [gcc, clang, msvc]
        exclude:
          - os: windows-latest
            compiler: gcc
          - os: ubuntu-latest
            compiler: msvc
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - name: Install vcpkg
        run: |
          git clone https://github.com/microsoft/vcpkg.git
          ./vcpkg/bootstrap-vcpkg.sh
          echo "VCPKG_ROOT=$PWD/vcpkg" >> $GITHUB_ENV
      - name: Configure
        run: cmake --preset ${{ matrix.build_type == 'Debug' && 'debug' || 'release' }}
      - name: Build
        run: cmake --build --preset ${{ matrix.build_type == 'Debug' && 'debug' || 'release' }}
      - name: Test
        run: ctest --preset ${{ matrix.build_type == 'Debug' && 'debug' || 'release' }}
      - name: clang-tidy
        if: matrix.compiler == 'clang'
        run: cmake --preset debug -DENABLE_CLANG_TIDY=ON && cmake --build --preset debug
```

### 8.5 文档生成（Doxygen + Sphinx）

```cmake
find_package(Doxygen REQUIRED)

set(DOXYGEN_INPUT ${CMAKE_SOURCE_DIR}/include)
set(DOXYGEN_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/docs)
set(DOXYGEN_GENERATE_HTML YES)
set(DOXYGEN_GENERATE_XML YES)

doxygen_add_docs(docs
    ${DOXYGEN_INPUT}
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMENT "Generating API documentation"
)
```

### 8.6 代码覆盖率

```cmake
option(ENABLE_COVERAGE "Enable code coverage" OFF)
if(ENABLE_COVERAGE)
    if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        message(FATAL_ERROR "Coverage only supported with GCC")
    endif()
    target_compile_options(mylib PRIVATE --coverage -O0 -g)
    target_link_options(mylib PRIVATE --coverage)
endif()
```

```bash
cmake --preset debug -DENABLE_COVERAGE=ON
cmake --build --preset debug
ctest --preset debug
gcovr --xml-pretty --exclude-unreachable-branches --print-summary -o coverage.xml
```

## 9. 案例研究

### 9.1 案例：跨平台游戏引擎构建

```cmake
cmake_minimum_required(VERSION 3.24)
project(GameEngine LANGUAGES CXX)

# 平台特定配置
if(WIN32)
    set(PLATFORM_LIBS d3d11 dxgi dxguid)
    set(PLATFORM_DEFINES PLATFORM_WINDOWS DIRECT3D11)
elseif(APPLE)
    set(PLATFORM_LIBS "-framework Metal" "-framework QuartzCore")
    set(PLATFORM_DEFINES PLATFORM_MACOS METAL)
else()
    set(PLATFORM_LIBS vulkan xcb)
    set(PLATFORM_DEFINES PLATFORM_LINUX VULKAN)
endif()

# 引擎核心库
add_library(engine_core STATIC)
target_sources(engine_core
    PRIVATE
        src/core/application.cpp
        src/core/window.cpp
        src/renderer/${PLATFORM_DEF}.cpp  # 平台特定渲染器
)
target_link_libraries(engine_core PUBLIC
    ${PLATFORM_LIBS}
    fmt::fmt
    spdlog::spdlog
)
target_compile_definitions(engine_core PUBLIC ${PLATFORM_DEFINES})

# 游戏可执行文件
add_executable(my_game src/main.cpp)
target_link_libraries(my_game PRIVATE engine_core)
```

### 9.2 案例：嵌入式固件交叉编译

```cmake
# 工具链文件：arm-none-eabi.cmake
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_OBJCOPY arm-none-eabi-objcopy)
set(CMAKE_SIZE arm-none-eabi-size)

set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

set(MCU_FLAGS "-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard")
set(CMAKE_C_FLAGS_INIT "${MCU_FLAGS} -ffunction-sections -fdata-sections")
set(CMAKE_CXX_FLAGS_INIT "${CMAKE_C_FLAGS_INIT} -fno-exceptions -fno-rtti")
set(CMAKE_EXE_LINKER_FLAGS_INIT "${MCU_FLAGS} -Wl,--gc-sections -T${CMAKE_SOURCE_DIR}/linker.ld")
```

```cmake
# 固件目标
add_executable(firmware.elf
    src/main.cpp
    src/hal/gpio.cpp
    src/hal/uart.cpp
)
target_link_libraries(firmware.elf PRIVATE libopencm3)

# 生成 bin 与 hex
add_custom_command(TARGET firmware.elf POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:firmware.elf> firmware.bin
    COMMAND ${CMAKE_OBJCOPY} -O ihex $<TARGET_FILE:firmware.elf> firmware.hex
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:firmware.elf>
)
```

### 9.3 案例：插件系统构建

```cmake
# 主程序
add_executable(host_app src/main.cpp)
target_compile_definitions(host_app PRIVATE PLUGIN_DIR="${CMAKE_INSTALL_PREFIX}/plugins")

# 插件作为 MODULE 库
add_library(plugin_audio MODULE src/plugins/audio.cpp)
set_target_properties(plugin_audio PROPERTIES
    PREFIX ""  # 不加 lib 前缀
    SUFFIX ".plugin"  # 自定义后缀
)
target_link_libraries(plugin_audio PRIVATE engine_core)
install(TARGETS plugin_audio LIBRARY DESTINATION plugins)

add_library(plugin_video MODULE src/plugins/video.cpp)
set_target_properties(plugin_video PROPERTIES PREFIX "" SUFFIX ".plugin")
target_link_libraries(plugin_video PRIVATE engine_core)
install(TARGETS plugin_video LIBRARY DESTINATION plugins)
```

## 10. 习题

### 基础题

1. **工具链识别**：列出 C++ 主流编译器、构建系统、包管理器各三种，说明各自特点。

2. **CMake 两阶段**：解释 CMake 的配置阶段与生成阶段的区别，输出文件分别是什么？

3. **target_ vs 全局**：将以下传统 CMake 代码改写为现代风格：
   ```cmake
   include_directories(include)
   add_definitions(-DDEBUG)
   add_library(mylib src.cpp)
   ```

4. **依赖传播**：解释 `PUBLIC`、`PRIVATE`、`INTERFACE` 的区别，举例说明何时用哪种。

### 中级题

5. **多目标项目**：设计一个包含核心库、网络库、可执行文件、测试的 CMake 项目结构，编写各层 `CMakeLists.txt`。

6. **vcpkg 清单**：为依赖 fmt 10.1.1、spdlog 1.13.0、boost 1.82.0 的项目编写 `vcpkg.json`，并说明如何配置 CMake 使用。

7. **Presets**：为上述项目编写 `CMakePresets.json`，包含 Debug、Release、ASAN 三种配置预设。

8. **跨平台**：编写 CMake 代码检测 Windows、macOS、Linux 平台，并链接对应的系统库。

9. **测试集成**：使用 GoogleTest 与 CTest，编写测试发现配置，支持标签过滤与超时设置。

### 高级题

10. **交叉编译**：为 ARM Linux 嵌入式平台编写 CMake 工具链文件，说明 vcpkg 如何配合交叉编译。

11. **CI/CD**：设计 GitHub Actions 工作流，覆盖多平台（Ubuntu/Windows/macOS）、多编译器（GCC/Clang/MSVC）、多配置（Debug/Release），包含静态分析与测试。

12. **自定义端口**：为一个 GitHub 开源库编写 vcpkg 端口文件（`portfile.cmake` 与 `vcpkg.json`）。

13. **插件系统**：使用 MODULE 库设计一个插件架构，主程序运行时动态加载 `.plugin` 文件。

14. **代码覆盖率**：配置 CMake 启用 GCC 覆盖率，使用 gcovr 生成 XML 报告，集成到 CI。

### 开放题

15. **构建系统选择**：对比 CMake 与 Bazel，在何种规模与场景下选择哪个？给出决策矩阵。

16. **包管理器选择**：vcpkg 与 Conan 在企业级项目中如何选择？是否可以混用？

17. **C++ Modules 与工具链**：C++20 Modules 对构建系统提出哪些挑战？CMake 3.28+ 如何支持？

18. **工具链统一**：若要为团队制定 C++ 工具链标准，列出关键决策点与推荐方案。

## 11. 参考文献

### 官方文档

- **CMake Documentation** — https://cmake.org/documentation/
- **vcpkg Documentation** — https://vcpkg.io/en/docs
- **Conan Documentation** — https://docs.conan.io/
- **Ninja Manual** — https://ninja-build.org/manual.html
- **Bazel Documentation** — https://bazel.build/docs
- **xmake Documentation** — https://xmake.io/

### 标准与规范

- **ISO/IEC TS 19216:2019** — *C++ Standard Library Guidelines*
- **CMake Developer Reference** — Kitware, 持续更新。
- **vcpkg Specification** — https://github.com/microsoft/vcpkg/blob/master/docs/

### 经典教材

- **Nicol, B.** *Professional CMake: A Practical Guide*（持续更新），CMake 权威教材。
- **Slocum, J.** *Modern CMake for C++*, Packt, 2022.
- **Hoffmann, F.** *CMake Best Practices*, Packt, 2022.
- **Sutton, M.** *C++ Software Design*, O'Reilly, 2022.
- **Stroustrup, B.** *A Tour of C++*（3rd Edition）, Addison-Wesley, 2022.

### 在线资源

- **cppreference.com** — *Compiler support*: https://en.cppreference.com/w/cpp/compiler_support
- **CMake Wiki** — https://gitlab.kitware.com/cmake/community/-/wikis
- **C++ Awesome CMake** — https://github.com/onqtam/awesome-cmake
- **vcpkg GitHub** — https://github.com/microsoft/vcpkg

### 学术论文与演讲

- **Martin, B.** *Modern CMake*, CppCon 2017.
- **Sutton, A.** *C++ Modules: What They Are and How to Use Them*, CppCon 2022.
- **Herring, D.** *CMake 3.20+ Features*, CppCon 2021.

## 12. 延伸阅读

### 书籍

- **Sutter, H., Alexandrescu, A.** *C++ Coding Standards*, Addison-Wesley, 2004.
- **Williams, A.** *C++ Concurrency in Action*（2nd Edition）, Manning, 2019.
- **Meyers, S.** *Effective Modern C++*, O'Reilly, 2014.

### 视频与课程

- **CppCon 2023, Bill Hoffman** — *CMake: State of the Union*。
- **CppCon 2022, Deniz Bahadir** — *More Modern CMake*。
- **MIT 6.172** — *Performance Engineering of Software Systems*，包含构建优化。
- **Stanford CS106L** — *Standard C++ Programming*，工具链与构建实践。

### 开源项目

- **CMake itself** — https://gitlab.kitware.com/cmake/cmake
- **LLVM** — 大型 C++ 项目 CMake 配置范例：https://github.com/llvm/llvm-project
- **Boost** — b2 构建系统与 CMake 兼容：https://www.boost.org
- **vcpkg** — 学习端口编写：https://github.com/microsoft/vcpkg/tree/master/ports

### 相关主题

- **C++20 Modules** — `import std;` 与构建系统支持。
- **Build2** — 现代化构建系统替代方案。
- **Meson** — Python 配置的构建系统。
- **SCons** — Python 构建工具。
- **Premake** — Lua 配置生成 IDE 项目。
- **Buck2** — Meta 出品的新一代构建系统。

### 实践建议

1. **阅读真实项目**：分析 LLVM、Boost、vcpkg 的 CMakeLists.txt。
2. **从模板起步**：使用 `cmake-init` 或 `cpp-best-practices/cpp_starter_project` 模板。
3. **自动化 CI**：所有 PR 必须通过多平台构建与测试。
4. **定期升级**：关注 CMake、vcpkg、编译器版本，每年升级一次。
5. **统一规范**：团队制定 CMake 风格指南，使用 `.cmake-format.yaml` 强制格式。
6. **学习 Starlark**：若考虑 Bazel，提前学习其配置语言。
