## C 与 C++：同源而不同路

C 语言诞生于 1972 年，是 Unix 操作系统与无数基础设施的语言，特点是"贴近机器、一切自己管"；C++ 在 1983 年由 Bjarne Stroustrup 在 C 基础上扩展而来，加入了类、模板等高级抽象——**名字里的 ++ 意为"C 的增强版"**。

两者的分工今天依然清晰：操作系统内核、单片机程序多用 C；游戏引擎、浏览器、高频交易、大型桌面软件多用 C++。**C++ 是唯一同时做到"零运行时开销"与"高级抽象"的主流语言。**

## 能力版图

| 方向 | 说明 |
| --- | --- |
| 游戏引擎 | Unreal Engine、多数商业引擎核心 |
| 高性能服务 | 量化交易、音视频处理、搜索引擎 |
| 基础设施 | Chrome、MySQL、TensorFlow 底层 |
| 嵌入式与驱动 | 与 C 平分天下 |

## 与垃圾回收语言的本质差异

Java/Python 里"用完的东西"由垃圾回收器清理；**C++ 中对象的生命周期由你显式控制**——这是性能的来源，也是初学者的悬崖。好消息是现代 C++ 提供了智能指针等工具（本模块后半程详解），把手动管理降到最低：

```cpp
#include <iostream>
#include <string>

int main() {
    std::string name = "学习者";
    std::cout << "你好，" << name << "!" << std::endl;
    return 0;
}
```

`#include` 引入标准库；`std::string` 是字符串类型；`std::cout` 是标准输出流；`<<` 把内容依次送入输出流。与 C 语言的 `printf` 相比，`cout` 不需要记忆格式符，类型自动匹配。

## 动手环节：编译运行

C++ 是编译型语言，需要编译器（Windows 推荐 VS Code + MinGW，配置见 [C 语言零基础起步](/c/001-CZeroBasisStart) 的环境章节，两者共用工具链）。保存 `hello.cpp` 后：

```bash
g++ hello.cpp -o hello   # 编译
./hello                  # 运行（Windows 下 hello.exe）
```

再试一个现代特性循环：

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {10, 20, 30};
    int total = 0;
    for (int n : nums) {      // 范围 for 循环
        total += n;
    }
    std::cout << "合计: " << total << std::endl;   // 60
}
```

`vector` 是可自动扩容的数组——C++ 标准模板库（STL）最常用的容器。

## 常见困惑

**"先学 C 还是直接 C++？"**——本仓库建议：先学 C 模块的内存与指针基础（现代 C++ 仍建立在它们之上），再进 C++ 主线，抽象层会显得顺理成章。

**"C++ 很难是真的吗？"**——它是主流语言里规则最多的一门，但入门所需子集并不比 Java 大；"精通 C++"确实是行业公认的长期目标，不必与它一战成名。

## 下一步

进入 [C++ 概述与现代标准](/cpp/002-CppOverviewAndModernStandard) 开始主线；学到智能指针与 STL 章节时，你会真正体会到"现代 C++"与教科书上古老形象的巨大差异。
