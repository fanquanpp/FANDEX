## 基本运行

**基本写法：运行内存检测**
`valgrind [<选项>] <程序> [<参数>]`
```bash
# 默认使用 memcheck 工具运行程序
valgrind ./app
```

**基本写法：带程序参数**
`valgrind <程序> <参数>...`
```bash
# 直接跟程序参数运行
valgrind ./app -c config.txt
```

**基本写法：指定工具**
`valgrind --tool=<工具> <程序>`
```bash
# 可选工具：memcheck cachegrind callgrind massif helgrind drd
valgrind --tool=memcheck ./app
```

**基本写法：输出到文件**
`valgrind --log-file=<文件> <程序>`
```bash
# 将诊断信息写入指定文件
valgrind --log-file=val.log ./app
```

---

## Memcheck 内存检测

**基本写法：完整内存检测**
`valgrind --leak-check=full <程序>`
```bash
# 详细检查内存泄漏并分类报告
valgrind --leak-check=full ./app
```

**基本写法：显示可达内存**
`valgrind --show-reachable=yes <程序>`
```bash
# 显示仍可达但未释放的内存
valgrind --leak-check=full --show-reachable=yes ./app
```

**基本写法：泄漏检测级别**
`valgrind --leak-check=<级别> <程序>`
```bash
# no 不检查 summary 概要 full 详细
valgrind --leak-check=summary ./app
```

**基本写法：未初始化值追踪**
`valgrind --track-origins=yes <程序>`
```bash
# 追踪未初始化值的来源
valgrind --track-origins=yes ./app
```

**基本写法：错误汇总**
`valgrind --error-exitcode=<码> <程序>`
```bash
# 发现错误时以指定退出码退出，便于 CI 检测
valgrind --error-exitcode=1 ./app
```

**基本写法：限制错误数**
`valgrind --errors-for-leak-kinds=<类型> <程序>`
```bash
# 指定计入错误的泄漏类型
# definite possible reachable
valgrind --errors-for-leak-kinds=definite ./app
```

---

## 调试符号与源码

**基本写法：带调试信息运行**
`gcc -g -O0 <源> && valgrind <程序>`
```bash
# 编译时加 -g 才能在报告中显示源码位置
gcc -g -O0 main.c -o app
valgrind --leak-check=full ./app
```

**基本写法：显示源码行**
`valgrind --num-callers=<深度> <程序>`
```bash
# 设置调用栈回溯深度
valgrind --num-callers=30 ./app
```

**基本写法：符号还原**
`valgrind --demangle=yes <程序>`
```bash
# 还原 C++ 符号名，C 程序默认即可
valgrind --demangle=yes ./app
```

---

## 缓存分析 Cachegrind

**基本写法：缓存命中分析**
`valgrind --tool=cachegrind <程序>`
```bash
# 分析 CPU 缓存命中率与缺失次数
valgrind --tool=cachegrind ./app
```

**基本写法：输出分析文件**
`valgrind --tool=cachegrind --cachegrind-out-file=<文件> <程序>`
```bash
# 生成 cgout 文件供 cg_annotate 分析
valgrind --tool=cachegrind --cachegrind-out-file=cg.out ./app
```

**基本写法：查看缓存报告**
`cg_annotate <文件>`
```bash
# 解析 cachegrind 输出文件
cg_annotate cg.out
```

---

## 调用分析 Callgrind

**基本写法：函数调用分析**
`valgrind --tool=callgrind <程序>`
```bash
# 收集函数调用次数与开销
valgrind --tool=callgrind ./app
```

**基本写法：收集缓存事件**
`valgrind --tool=callgrind --cache-sim=yes <程序>`
```bash
# 同时收集 I/D 缓存模拟数据
valgrind --tool=callgrind --cache-sim=yes ./app
```

**基本写法：查看调用报告**
`callgrind_annotate <文件>`
```bash
# 解析 callgrind 输出
callgrind_annotate callgrind.out.1234
```

**基本写法：图形化查看**
`kcachegrind <文件>`
```bash
# 用 GUI 工具浏览调用图
kcachegrind callgrind.out.1234
```

---

## 堆分析 Massif

**基本写法：堆内存快照**
`valgrind --tool=massif <程序>`
```bash
# 记录堆内存随时间变化
valgrind --tool=massif ./app
```

**基本写法：包含栈内存**
`valgrind --tool=massif --stacks=yes <程序>`
```bash
# 同时统计栈内存使用
valgrind --tool=massif --stacks=yes ./app
```

**基本写法：查看堆报告**
`ms_print <文件>`
```bash
# 解析 massif 输出为文本图表
ms_print massif.out.1234
```

---

## 线程检测 Helgrind/DRD

**基本写法：竞态检测**
`valgrind --tool=helgrind <程序>`
```bash
# 检测多线程数据竞争
valgrind --tool=helgrind ./app
```

**基本写法：锁顺序分析**
`valgrind --tool=helgrind --track-lockorders=yes <程序>`
```bash
# 检测潜在死锁
valgrind --tool=helgrind ./app
```

**基本写法：DRD 替代工具**
`valgrind --tool=drd <程序>`
```bash
# 另一个线程错误检测器，开销较低
valgrind --tool=drd ./app
```

**基本写法：检测原子操作**
`valgrind --tool=drd --check-stack-var=yes <程序>`
```bash
# 检查栈变量上的线程错误
valgrind --tool=drd --check-stack-var=yes ./app
```

---

## 抑制误报

**基本写法：使用抑制文件**
`valgrind --suppressions=<文件> <程序>`
```bash
# 加载抑制规则屏蔽已知误报
valgrind --suppressions=lib.supp ./app
```

**基本写法：自动生成抑制规则**
`valgrind --gen-suppressions=all <程序>`
```bash
# 输出每个错误的抑制规则模板
valgrind --gen-suppressions=all ./app
```

**基本写法：抑制文件格式**
`{ <名称>, <工具>, <模式> ... }`
```text
# 抑制规则示例
{
   libfoo_false_positive
   Memcheck:Cond
   fun:foo_internal
}
```

---

## 性能与控制

**基本写法：统计子进程**
`valgrind --trace-children=yes <程序>`
```bash
# 跟踪 fork/exec 产生的子进程
valgrind --trace-children=yes ./app
```

**基本写法：运行超时**
`valgrind --time-stamp=yes <程序>`
```bash
# 在每条信息前加时间戳
valgrind --time-stamp=yes ./app
```

**基本写法： quieter 模式**
`valgrind -q <程序>`
```bash
# 静默模式，仅打印错误摘要
valgrind -q ./app
```

**基本写法：详细级别**
`valgrind --verbose <程序>`
```bash
# 输出更详细的执行信息
valgrind -v ./app
```

---

## 报告解读

**基本写法：错误类型**
`Invalid read/write / Use of uninitialised value`
```bash
# Invalid read   越界读
# Invalid write  越界写
# Uninit value   使用未初始化值
# Invalid free   重复释放或释放非法指针
# definitely lost 确定泄漏
```

**基本写法：泄漏分类**
`definitely / indirectly / possibly / still reachable`
```bash
# definitely lost   确定泄漏，无指针指向
# indirectly lost   间接泄漏，仅被泄漏内存引用
# possibly lost     可能泄漏，指针指向中间
# still reachable   程序退出时仍可达，通常无害
```

---

## 与 gcc sanitizer 对比

**基本写法：编译期地址检测**
`gcc -fsanitize=address -g <源>`
```bash
# AddressSanitizer 速度更快，作为 valgrind 替代
gcc -fsanitize=address -g main.c -o app
./app
```

**基本写法：运行时检测泄漏**
`ASAN_OPTIONS=detect_leaks=1 ./<程序>`
```bash
# ASan 配合 LeakSanitizer 检测泄漏
ASAN_OPTIONS=detect_leaks=1 ./app
```

**基本写法：选型建议**
`valgrind 用于完整检测，ASan 用于高频测试`
```bash
# valgrind 无需重编译，覆盖全面但慢 10-30 倍
# ASan 需重新编译，速度快但仅检测地址越界
# 建议开发用 ASan，发布前用 valgrind 复核
```
