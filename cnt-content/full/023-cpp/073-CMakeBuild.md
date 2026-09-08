---
order: 730
title: C++ CMake 构建命令
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ CMake 构建命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## CMake 基础

**基本写法：最小 CMakeLists.txt**
`cmake_minimum_required(VERSION <版本>)`
```cmake
# CMake 项目配置文件
cmake_minimum_required(VERSION 3.15)
project(MyApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(app main.cpp)
```

---

**基本写法：命令行生成构建**
`cmake -S <源目录> -B <构建目录>`
```bash
# 配置生成构建文件
cmake -S . -B build
# -S 源目录（含 CMakeLists.txt）
# -B 构建目录（生成文件位置）
```

---

**基本写法：指定生成器**
`cmake -G <生成器> -S . -B build`
```bash
# 指定构建系统
cmake -G "Unix Makefiles" -S . -B build   # Linux/macOS make
cmake -G Ninja -S . -B build              # Ninja（更快）
cmake -G "Visual Studio 17 2022" -S . -B build # MSVC
```

---

**基本写法：编译构建**
`cmake --build <构建目录>`
```bash
# 执行编译
cmake --build build
# 指定并行数
cmake --build build -j 8
# 指定配置（Debug/Release）
cmake --build build --config Release
```

---

## 目标与源文件

**基本写法：添加可执行文件**
`add_executable(<名称> <源文件>...)`
```cmake
# 定义可执行目标
add_executable(app main.cpp utils.cpp io.cpp)
```

---

**基本写法：添加静态库**
`add_library(<名称> STATIC <源文件>...)`
```cmake
# 静态库
add_library(mylib STATIC utils.cpp io.cpp)
```

---

**基本写法：添加动态库**
`add_library(<名称> SHARED <源文件>...)`
```cmake
# 动态库
add_library(mylib SHARED utils.cpp io.cpp)
# 头文件库（interface）
add_library(mylib INTERFACE)
```

---

**基本写法：链接库**
`target_link_libraries(<目标> <库>...)`
```cmake
# 链接依赖库
target_link_libraries(app PRIVATE mylib)
target_link_libraries(app PRIVATE pthread)
# PRIVATE   仅当前目标使用
# PUBLIC    当前目标及依赖者使用
# INTERFACE 仅依赖者使用
```

---

**基本写法：包含目录**
`target_include_directories(<目标> <可见性> <路径>...)`
```cmake
# 头文件搜索路径
target_include_directories(app PRIVATE include)
target_include_directories(app PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)
```

---

## 编译选项

**基本写法：设置编译选项**
`target_compile_options(<目标> <可见性> <选项>...)`
```cmake
# 添加编译选项
target_compile_options(app PRIVATE -Wall -Wextra -Werror)
# 条件添加
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(app PRIVATE -O2 -pipe)
endif()
```

---

**基本写法：设置 C++ 标准**
`set(CMAKE_CXX_STANDARD <版本>)`
```cmake
# 全局设置标准
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF) # 禁用编译器扩展
# 或针对单个目标
set_property(TARGET app PROPERTY CXX_STANDARD 20)
```

---

**基本写法：编译定义**
`target_compile_definitions(<目标> <可见性> <定义>...)`
```cmake
# 预处理宏定义
target_compile_definitions(app PRIVATE DEBUG=1)
target_compile_definitions(app PUBLIC VERSION="1.0.0")
```

---

## 构建类型

**基本写法：构建类型**
`set(CMAKE_BUILD_TYPE <类型>)`
```cmake
# 构建类型：Debug/Release/RelWithDebInfo/MinSizeRel
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()
# 命令行指定
# cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
```

---

**基本写法：类型专属选项**
`set(CMAKE_CXX_FLAGS_<类型> <选项>)`
```cmake
# 各类型编译选项
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -DDEBUG")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O2 -g")
```

---

## 查找与使用依赖

**基本写法：find_package 查找包**
`find_package(<包名> [版本] [REQUIRED])`
```cmake
# 查找已安装的包
find_package(Threads REQUIRED)
find_package(OpenCV 4.5 REQUIRED)
find_package(fmt CONFIG REQUIRED)
```

---

**基本写法：使用 find_package 结果**
`<包>::<目标>`
```cmake
# 链接找到的库目标
target_link_libraries(app PRIVATE Threads::Threads)
target_link_libraries(app PRIVATE fmt::fmt)
target_link_libraries(app PRIVATE ${OpenCV_LIBS})
```

---

**基本写法：查找系统库**
`find_library(<变量> <库名>)`
```cmake
# 查找系统库
find_library(MATH_LIB m)
target_link_libraries(app PRIVATE ${MATH_LIB})
```

---

## 子目录与安装

**基本写法：添加子目录**
`add_subdirectory(<目录>)`
```cmake
# 包含子项目的 CMakeLists.txt
add_subdirectory(src)
add_subdirectory(lib/mylib)
```

---

**基本写法：安装规则**
`install(TARGETS <目标> DESTINATION <目录>)`
```cmake
# 安装目标
install(TARGETS app DESTINATION bin)
install(TARGETS mylib DESTINATION lib)
install(DIRECTORY include/ DESTINATION include)
```

---

## 变量与条件

**基本写法：设置变量**
`set(<变量> <值>)`
```cmake
# 变量赋值
set(SOURCES main.cpp utils.cpp)
set(MY_VERSION 1.0.0)
# 使用变量
add_executable(app ${SOURCES})
```

---

**基本写法：条件判断**
`if(<条件>) ... elseif() ... else() ... endif()`
```cmake
# 条件分支
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(app PRIVATE DEBUG=1)
elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_definitions(app PRIVATE NDEBUG=1)
endif()
```

---

## 实用命令

**基本写法：打印消息**
`message(<模式> <消息>)`
```cmake
# 输出消息
message(STATUS "配置开始")
message(WARNING "自定义警告")
message(FATAL_ERROR "致命错误，停止配置")
```

---

**基本写法：列出源文件**
`file(GLOB <变量> <模式>)`
```cmake
# 通配符收集源文件
file(GLOB SOURCES src/*.cpp)
file(GLOB_RECURSE SOURCES src/*.cpp) # 递归
add_executable(app ${SOURCES})
```
