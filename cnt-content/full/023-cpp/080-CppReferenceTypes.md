---
order: 110
title: C++ 引用：必须存在的别名
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: 以「swap 终于能改到调用方的变量」引入，讲透左值引用、const 引用与临时对象延长、引用与指针的三点分工、悬空引用的成因与防线，附悬空引用调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/060-LambdaExpression'
  - 'cpp/070-LambdaCaptureDetailed'
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/120-CppPointers'
prerequisites:
  - 'cpp/040-CppTypeSystem'
---

## 前置知识

- 已完成 [类型系统](/cpp/040-CppTypeSystem)：知道类型的字节承诺与 auto 推导。

## 学习目标

读完本文你将能够：

1. 用「别名」模型解释引用的全部行为：必须初始化、不可换绑、无独立实体；
2. 为函数参数在值传递 / const 引用 / 传引用之间做出正确选择并说明理由；
3. 解释「const 引用可以绑临时对象」这条特权的价值与边界；
4. 识别悬空引用的两大成因，并知道 sanitizers 是定位手段。

预计 45 到 75 分钟。

## 1. 你现在要解决什么问题

值传递的 swap 改不动调用方的变量（每层都是副本）；指针能解决但语法重：`swap(&x, &y)` 里满屏 `*a` `*b`，调用点还要主动取地址。你想要一种「就是本尊的别名」——写起来像值、语义上是同一块内存。这就是引用（reference）：C++ 在指针之上提供的零成本抽象。

## 2. 最小可运行示例

```cpp
#include <iostream>
#include <string>

void swap(int& a, int& b) { int t = a; a = b; b = t; }
void shout(const std::string& msg) { std::cout << msg << '\n'; }

int main() {
    int x = 1, y = 2;
    int& alias = x;    // 初始化即绑定，终身是 x 的别名
    alias = 10;        // 改别名就是改本尊
    swap(x, y);        // 调用点与值传递写法一模一样
    std::cout << x << ' ' << y << '\n';   // 2 10
    shout("hi");       // 字面量（临时对象）也能绑 const 引用
}
```

预期输出：

```text
2 10
hi
```

三行各演示一条铁律：`alias = 10` 改到本尊；swap 的调用点无需取地址；`const std::string&` 接住了临时的 `"hi"`。

## 3. 发生了什么：别名模型

引用不是对象，是「已有对象您第二个名字」。三个行为全部由此推出：

1. **必须初始化**：名字总得先有主人；不存在「空引用」；
2. **不可换绑**：`alias = y` 不是让 alias 改指 y，而是把 y 的值赋给 x（别名写就是本尊写）；
3. **对引用取地址得到被指对象的地址**：引用自己没有独立实体。

底层的诚实说明：编译器通常用指针实现引用，但语言层面你不该这么想——引用就是别名，标准也不承诺它占内存（`sizeof` 一个引用得到的是被指类型的大小）。

## 4. 核心概念一：参数怎么选

| 传递方式 | 何时用 | 代价 |
| --- | --- | --- |
| 值传递 | 小对象（int/double/指针大小）、需要副本 | 拷贝 |
| `const T&` | 只读的大对象（string/vector/自定义类） | 一次地址传递 |
| `T&` | 需要修改调用方对象（出参、swap） | 同上 |

判断顺序：先问要不要改——不改优先 `const T&`；再问大不大——小对象直接传值（引用间接层反而更慢）。`const` 引用是函数签名里的礼貌：「我只看不动」——调用方才敢把重要数据交来（与 [指针](/cpp/120-CppPointers) 的 `const int*` 同一礼节）。

## 5. 核心概念二：const 引用与临时对象的特权

非 const 引用不能绑临时对象（`int& r = 5;` 编译报错），但 `const T&` 可以，且标准保证**临时对象的寿命延长到引用的寿命**：

```cpp
const std::string& s = std::string("temp");   // 合法：临时活到 s 离开作用域
```

这条特权是「`const T&` 收参数」能通吃左值与右值（字面量、表达式结果）的原因——参数设计的最大赢家。边界：延长只对「直接绑定」生效，若中途经过函数返回引用等转发，延长失效。

## 6. 调试实录：悬空引用

引用不会空，但**会悬**——被引用对象先死，别名成亡魂。两大成因：

成因一，返回局部变量的引用（与指针篇同款事故）：

```cpp
const std::string& greet() {
    std::string local = "hi";
    return local;
}
// 警告：reference to local variable 'local' returned [-Wreturn-local-addr]
```

成因二，容器扩容后继续用旧引用：

```cpp
std::vector<std::string> v{"a"};
const std::string& first = v[0];
v.push_back("b");                 // 扩容搬迁，旧内存释放
std::cout << first << '\n';       // 未定义行为
```

定位手段：`-Wall` 捕捉前者；后者用 `-fsanitize=address` 报 `heap-use-after-free` 并给出释放点调用栈。修法统一为「别在结构变更后持有引用」：重新取引用、按值收下、或改用迭代器失效规则明确的容器操作。

## 7. 修改实验

1. 把 060 篇的排序比较器从按值捕获字符串改为 `const std::string&` 参数版本，构造 10 万元素排序对比耗时；
2. 故意写出成因二的事故并用 ASan 捕获，读报告里的「freed by thread」栈；
3. 写 `void normalize(std::string& s)`（转小写并去首尾空格），再写一个 const 版 `std::string normalized(const std::string& s)`，比较两版调用点的手感与适用场景。

## 8. 小练习

预测题（先写答案再运行）：

```cpp
int a = 1, b = 2;
int& r = a;
r = b;
r = 9;
std::cout << a << ' ' << b << '\n';
```

（考点：`r = b` 是赋值不是换绑。）

修改题：下列函数对 100MB 的 string 逐字节统计，改签名让调用零拷贝且保证只读：

```cpp
std::string countSpaces(std::string s) { /* ... */ }
```

修 Bug 题：下面的类把内部成员以引用暴露，调用方在 push_back 后读取崩溃，给出两种修复（返回值 / 迭代器失效说明）并说明取舍：

```cpp
class Feed {
    std::vector<std::string> items;
public:
    const std::string& head() { return items[0]; }
    void append(std::string s) { items.push_back(std::move(s)); }
};
```

挑战题（不看提示）：实现 `void minmax(const int* arr, size_t n, int& lo, int& hi)`，一次遍历同时求最小与最大；空数组时两引用不得被写入——想想「引用必须绑定」与「无结果可写」如何共存（先设计调用约定，再动手）。

## 9. 什么时候应该 / 不应该用引用

应该：函数的只读大对象参数（const 引用）；需要修改调用方对象的出参；范围 for 与结构化绑定。

不应该：需要「可能为空」语义（那是指针或 optional）；需要中途换指；把引用存进容器或类成员而生命周期无法保证（那是悬空的温床）。

## 10. 与之前和之后的知识的关系

- 往前：060 的 Lambda 按引用捕获就是本文的「别名」装进闭包；050 的链接与别名无冲突（别名无实体）；
- 往后：[移动语义](/cpp/090-RvalueReferenceMoveSemantics) 的右值引用是本文左值引用的镜像兄弟——「即将消亡的对象的别名」，090/110 两篇把这套语义展开；[智能指针](/cpp/130-SmartPointerDeepDive) 解决「悬空」的工程化终局；
- 更远：范围、视图、算法库的签名全是 const 引用与值传递的排布艺术。

## 11. 官方文档

- cppreference 引用声明：https://en.cppreference.com/w/cpp/language/reference
- 引用初始化与临时对象延长：https://en.cppreference.com/w/cpp/language/reference_initialization

## 12. 自我检查

- 能用别名模型推出引用的三铁律并演示；
- 能按「改不改、大不大」两问为参数选对传递方式；
- 能说出 const 引用绑临时的特权与失效边界；
- 能复述悬空引用两大成因并用 ASan 定位。

## 本章总结

引用是必须绑定、不可换绑的别名：写起来像值、语义上是本尊。参数选择的两问是「改不改、大不大」，const 引用凭「可绑临时」成为只读参数的默认答案。它不为空但会悬——生命周期是唯一的防线，sanitizers 是最后的哨兵。下一站，右值引用登场：别名思想正式接入移动语义。

## 下一步

进入 [移动语义](/cpp/090-RvalueReferenceMoveSemantics)：左值与右值之分、拷贝与移动之别，是 C++ 资源管理的核心大戏。
