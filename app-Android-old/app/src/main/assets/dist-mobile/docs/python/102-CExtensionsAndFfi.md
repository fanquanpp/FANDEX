# C 扩展与 FFI

剖析确认热点在纯 Python 循环、向量化与标准库都救不动时，"让原生代码接管热点"是最后一层优化：把毫秒级循环下沉到 C，通常有几十倍的差距。Python 调用原生代码有三条主要通道——零编译的 ctypes、兼顾便捷与性能的 cffi、以及性能极致但责任最重的 CPython C API 扩展。本篇以"音频响度计算"为贯穿示例，从"什么时候才需要"讲到"怎么构建打包"，并给出 Cython 等替代方案的选型坐标。

## 前置知识

- [多进程与多线程](/python/013-MultiprocessingMultithreading)：理解 GIL 的作用范围，C 扩展的线程行为与本篇直接相关。
- [性能剖析与优化](/python/100-ProfilingOptimization)：先有剖析结果再谈扩展，本篇第 1 节直接复用其方法论。
- [Python 性能优化](/python/038-PythonPerformance)：向量化与算法优化是 C 扩展之前的两道关卡。

## 学习目标

1. 能用剖析数据判断"是否真的需要 C 扩展"。
2. 会用 ctypes 声明签名并调用动态库，理解 argtypes/restype 的作用。
3. 能区分 cffi 的 ABI 模式与 API 模式并各自落地。
4. 会写一个最小的 CPython C 扩展，掌握引用计数的基本纪律。
5. 了解 wheel 打包流程与 Cython/PyO3 等替代方案。

## 1. 什么时候需要 C 扩展

C 扩展是优化阶梯的最后一阶，前两阶是"换算法/用内置函数"与"向量化"（numpy 一行往往顶一段 C）。只有剖析热点确实卡在纯 Python 循环、且无法用现成库表达时，才值得进入本篇。

```python
# decision.py —— 先确认热点在计算而不是等待
import cProfile
import pstats
import io

def mix_energy(samples: list[float]) -> float:
    """混音能量：纯 Python 版均方根，热点候选"""
    acc = 0.0
    for s in samples:
        acc += s * s
    return acc ** 0.5

profiler = cProfile.Profile()
profiler.enable()
mix_energy([i / 44100 for i in range(1_000_000)])
profiler.disable()

stream = io.StringIO()
pstats.Stats(profiler, stream=stream).sort_stats("tottime").print_stats(3)
print(stream.getvalue()[:400])   # mix_energy 占满 tottime => 值得下沉
```

**讲解：**

1. 判定标准：`tottime`（自身耗时）集中在一个纯 Python 函数上，且该函数无法用 numpy 表达或表达后仍不够快。
2. 三种需要下沉的真实场景：热点在数值循环、要把现成 C 库（解码器、加密库）接入 Python、对单次调用延迟有微秒级要求。
3. 跳过剖析直接写 C 扩展是本末倒置：热点若在 IO 或字典操作上，C 扩展帮不上忙。
4. 收益上限由热点占比决定：响度计算若只占请求耗时 5%，扩展写得再快整体也无感；占 70% 时几十倍的单点加速几乎等比例反映到整体。先看占比，再决定投入。

## 2. ctypes 调用动态库

ctypes 零编译依赖：只要有一个编译好的动态库（.so/.dll/.dylib），声明好函数签名即可调用。

```c
// volume.c —— 原生实现：计算采样均方根响度
#include <math.h>

double rms(const double *samples, int n) {
    double acc = 0.0;
    for (int i = 0; i < n; i++) {
        acc += samples[i] * samples[i];
    }
    return n > 0 ? sqrt(acc / n) : 0.0;
}
```

```bash
# 三平台编译命令
gcc -shared -fPIC -O2 volume.c -o volume.so          # Linux
gcc -shared -fPIC -O2 volume.c -o libvolume.dylib    # macOS
gcc -shared -O2 volume.c -o volume.dll               # Windows (MinGW)
```

```python
# via_ctypes.py —— ctypes 加载动态库并调用
import ctypes

lib = ctypes.CDLL("./volume.so")   # Windows 用 ./volume.dll，macOS 用 ./libvolume.dylib

# 声明签名：不声明时参数与返回值按 int 处理，double 会被截成垃圾值
lib.rms.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int]
lib.rms.restype = ctypes.c_double

samples = [i / 44100 for i in range(1_000_000)]   # 约 22 秒的采样
buf = (ctypes.c_double * len(samples))(*samples)  # 列表 -> C 数组（一次性开销）
print(f"响度 RMS = {lib.rms(buf, len(samples)):.6f}")
```

**讲解：**

1. `CDLL` 加载动态库，`argtypes`/`restype` 是必写项：没有签名声明时 ctypes 默认按 int 传递与返回，double 指针与返回值都会被错误解释。
2. 列表转 ctypes 数组是一次性成本：把数组提升到循环外、一次转换多次调用，才是 ctypes 的正确用法。
3. ctypes 的优势是"绑定任意现成库、零构建步骤"；代价是全部类型手工声明、错误只能在运行时暴露。
4. 错误处理靠约定：ctypes 传不回 C++ 异常，C 接口通常用返回值或出参错误码表达失败——声明接口时把错误码一起加进 argtypes/restype，Python 侧检查后转成异常抛出。
5. ctypes 同样具备结构体与指针能力（ctypes.Structure、byref）：绑定 C 库的复合类型时按头文件逐字段映射，字段对齐（pack）不一致是高频坑。
6. 找符号：Linux/macOS 用 `nm -g`、Windows 用 dumpbin 列出动态库导出的函数名——"找不到符号"类报错先查导出名再查声明拼写。

## 3. cffi 与 ABI/API 模式

cffi 提供 C 声明语法（cdef），比 ctypes 的 Python 风格签名更接近头文件。它有两种模式：ABI 模式运行时 dlopen，API 模式构建时把 C 源码一起编译。

```python
# via_cffi.py —— ABI 模式：与 ctypes 类似，零编译
from cffi import FFI

ffi = FFI()
ffi.cdef("double rms(const double *samples, int n);")   # 与头文件一致的声明
lib = ffi.dlopen("./volume.so")

samples = [i / 44100 for i in range(1_000_000)]
buf = ffi.new("double[]", samples)                       # 按 C 类型分配数组
print(f"ABI 模式 RMS = {lib.rms(buf, len(samples)):.6f}")
```

```python
# build_cffi.py —— API 模式：构建期编译 C 源码，签名错误在编译期暴露
from cffi import FFI

ffibuilder = FFI()
ffibuilder.cdef("double rms(const double *samples, int n);")
ffibuilder.set_source("_volume", r"""
#include <math.h>
double rms(const double *samples, int n) {
    double acc = 0.0;
    for (int i = 0; i < n; i++) acc += samples[i] * samples[i];
    return n > 0 ? sqrt(acc / n) : 0.0;
}
""")
ffibuilder.compile(verbose=True)   # 生成可 import 的 _volume 扩展模块
```

**讲解：**

1. ABI 模式适合快速验证与绑定系统库；API 模式把 C 源码编进扩展，类型错误在构建期而不是线上暴露，且调用更快，是发布到 PyPI 的推荐形态。
2. cdef 里写的就是 C 声明，可以直接从第三方库的头文件复制，比 ctypes 逐项写 POINTER(c_double) 不易出错。
3. cffi 不绑定 CPython C API 细节，对 PyPy 等替代解释器友好；生成模块 `python -c "import _volume; print(_volume.lib.rms(...))"` 即可验证。
4. API 模式可以与 setuptools 集成进 pyproject 构建流程，让 `python -m build` 直接产出扩展模块，无需单独执行 compile 脚本——与下一节的打包流程天然衔接。
5. 两种模式的选择口诀：本地快速验证用 ABI，进仓库、进 CI、上 PyPI 用 API——编译期校验省下的排查时间，远超写构建脚本的配置成本。
6. cffi 的内存托管：`ffi.new` 分配的 C 内存由 cffi 自动释放，不需要手工 free——这是它比 ctypes 省心的另一处，也少一类泄漏。
7. 选择前先想清楚调用面：只调用两三个函数选 ABI 快速起步；接口面大、参数复杂，就值得写 API 模式让编译器把关——接口越多，编译期校验的回报越高。

## 4. CPython C 扩展最小实现

需要最极致性能与 CPython 深度集成（自定义类型、缓冲区协议）时，直接用 C API 写扩展。

```c
// _volume.c —— CPython C API 扩展：把 rms 暴露成 Python 函数
#include <Python.h>
#include <math.h>

static PyObject *py_rms(PyObject *self, PyObject *args) {
    PyObject *seq;
    if (!PyArg_ParseTuple(args, "O", &seq)) return NULL;  // 解析单个参数
    Py_ssize_t n = PySequence_Length(seq);
    double acc = 0.0;
    for (Py_ssize_t i = 0; i < n; i++) {
        PyObject *item = PySequence_GetItem(seq, i);  // 返回新引用
        double v = PyFloat_AsDouble(item);
        Py_DECREF(item);                              // 用完必须归还，否则泄漏
        acc += v * v;
    }
    return PyFloat_FromDouble(n > 0 ? sqrt(acc / n) : 0.0);
}

static PyMethodDef methods[] = {
    {"rms", py_rms, METH_VARARGS, "计算采样均方根响度"},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT, "_volume", "音频响度扩展", -1, methods
};

PyMODINIT_FUNC PyInit__volume(void) {  // 模块名决定初始化函数名
    return PyModule_Create(&module);
}
```

```bash
# 编译为扩展（Linux 示例），随后可直接 import
gcc -shared -fPIC -O2 $(python3-config --includes) _volume.c \
  -o _volume$(python3-config --extension-suffix)
python3 -c "import _volume; print(_volume.rms([0.1, 0.2, 0.3]))"
```

**讲解：**

1. 三段固定结构：方法表（PyMethodDef）、模块定义（PyModuleDef）、初始化函数（PyInit_模块名），函数名与模块名必须严格对应。
2. 引用计数是生死线：`PySequence_GetItem` 返回新引用，用完必须 `Py_DECREF`；漏掉就泄漏，重复减会崩溃。新引用/借用的区分是 C API 最大的坑。
3. `PyArg_ParseTuple` 的格式串 `"O"` 表示收一个任意对象，`"d"` 收 double、`"i"` 收 int，与 printf 风格类似；格式串不匹配会在调用时抛 `TypeError`，不会静默错位。
4. 实际项目建议改用缓冲区协议（`Py_buffer`）接收 numpy 数组，避免逐元素 GetItem 的开销——那是下一阶段的功课。
5. 调试扩展的第一句话是 `import faulthandler; faulthandler.enable()`：段错误时能把 Python 侧调用栈打出来；更深的排查再用 gdb/lldb 挂符号。
6. `PyArg_ParseTuple` 的格式串速查：`s` 字符串、`d` 浮点、`i` 整数、`O` 任意对象——与 sscanf 同风格，读第三方扩展源码时对照着看。

## 5. 构建打包与替代方案

```toml
# pyproject.toml —— 用 setuptools 把 C 扩展编进 wheel
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "vfinder-volume"
version = "0.1.0"

[tool.setuptools]
ext-modules = [{ name = "_volume", sources = ["_volume.c"] }]
```

```bash
pip install build
python -m build          # 产出含已编译 .so/.pyd 的 wheel，用户免编译安装
```

多平台 wheel 的分发用 cibuildwheel：CI 一份配置即可产出 Windows/macOS/Linux 各 Python 版本的安装包，是扩展库发布的社区标准方案。

**讲解：**

1. 直接分发 .c 源码意味着用户机器必须有编译器；正确做法是构建各平台的 wheel（`.so`/`.pyd` 已编好），发布流程见 [包发布](/python/059-PackagePublish) 与 [打包演进](/python/044-PythonPackagingEvolution)。
2. 替代方案坐标：**Cython**——给 Python 代码加类型注解后编译成 C，渐进优化，最常用；**mypyc**——类型注解直接编译，适合类型完备的代码库；**pybind11/nanobind**——C++ 侧绑定，工程化程度高；**PyO3**——用 Rust 写扩展，内存安全优势明显。
3. 选型原则：只有 Python 代码要加速选 Cython/mypyc；绑定现成 C++ 库选 pybind11；新写高性能模块可评估 Rust + PyO3；快速验证仍然 cffi ABI 最快。
4. 落地前把第 1 节的热点占比再算一遍：扩展只能加速被下沉的函数，算法层面的慢（不必要的循环、重复计算）换任何原生方案都救不了。
5. 发布前评估 abi3：限定到稳定 ABI 的 wheel 一个包即可兼容多个 CPython 版本，牺牲少量 API 换发布成本大降，扩展库值得优先考虑。
6. wheel 解包核对：包内应是 `.so`/`.pyd` 加纯 Python 垫片，源码 .c 不该出现——包内容是发布前的最后一道检查。

## 6. Rust 与 PyO3 方向

替代方案里最值得单独展开的是 PyO3：用 Rust 写 Python 扩展。它把上一节 C API 里最容易出错的部分——引用计数——交给编译器与 RAII 自动处理，是"新写高性能模块"时的有力候选。

```rust
// src/lib.rs —— PyO3：把 rms 暴露给 Python，无需手写引用计数
use pyo3::prelude::*;

#[pyfunction]
fn rms(samples: Vec<f64>) -> f64 {
    // Python list 自动转换成 Vec<f64>，返回值自动转回 float
    let n = samples.len() as f64;
    let acc: f64 = samples.iter().map(|s| s * s).sum();
    if n > 0.0 { (acc / n).sqrt() } else { 0.0 }
}

#[pymodule]
fn vfinder_volume(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(rms, m)?)?;
    Ok(())
}
```

```bash
pip install maturin          # PyO3 官方构建工具
maturin develop              # 编译并安装到当前虚拟环境
python -c "import vfinder_volume; print(vfinder_volume.rms([0.1, 0.2, 0.3]))"
```

**讲解：**

1. `Vec<f64>` 参数自动完成"Python list -> Rust 向量"的转换，返回值自动装箱回 Python float——对比第 4 节手写的 PySequence_GetItem/Py_DECREF，整个扩展没有一处显式内存管理。
2. `maturin develop` 用于开发迭代，`maturin build` 产出可发布的 wheel（含各平台编译产物），打包流程与第 5 节的 setuptools 版本完全对齐。
3. 选型回顾：绑定现成 C/C++ 库仍以 ctypes/cffi/pybind11 优先；渐进优化既有 Python 代码选 Cython；从零新写、追求内存安全与工程化时，PyO3 是当前社区最活跃的方向。
4. Rust 侧同样要顾 GIL：PyO3 默认持有 GIL 执行与 Python 的交互，纯计算段用 `py.allow_threads(...)` 包裹，多线程调用才有意义。
5. 工程细节在 Rust 侧：Cargo.toml 声明 pyo3 依赖与 crate 类型，maturin 读取后自动完成扩展配置——完整成熟的工具链是 PyO3 工程化优势的一部分。
6. 异常桥接：Rust 侧返回 `PyResult`，错误自动转成 Python 异常——两条语言的错误体系在边界上握手，Python 侧照常用 try/except 处理；跨语言异常只在该边界转换一次，进入 Rust 侧后用 Result 层层传递。

## 易错点与最佳实践

1. **ctypes 不声明签名**：默认按 int 传递与返回，double 结果被截断成整数垃圾。加载后第一件事写 argtypes/restype：

```python
# 错误：无签名声明，返回值按 int 解释
# lib = ctypes.CDLL("./volume.so"); lib.rms(buf, n)
# 正确：显式声明签名
lib.rms.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int]
lib.rms.restype = ctypes.c_double
```

2. **C 扩展引用计数错误**：GetItem/创建的新引用漏 DECREF 就是内存泄漏，长驻进程逐渐吃光内存：

```python
# 错误（C 侧）：item 是新引用却从不归还
# PyObject *item = PySequence_GetItem(seq, i);
# acc += PyFloat_AsDouble(item);
# 正确：用完立即 DECREF
PyObject *item = PySequence_GetItem(seq, i);
double v = PyFloat_AsDouble(item);
Py_DECREF(item);
```

3. **C 扩展长时间持有 GIL**：纯计算段不释放 GIL，多线程调用的收益归零（见 [GIL 与自由线程](/python/101-GILAndFreeThreading)）。计算前后用 `Py_BEGIN_ALLOW_THREADS`/`Py_END_ALLOW_THREADS` 包住不触碰 Python 对象的段落。

4. **循环内反复转换数据**：每次调用都把列表转成 C 数组，转换成本反超计算收益。数组提升到循环外，一次转换多次调用：

```python
# 错误：每轮循环都重建 C 数组
# for chunk in chunks: lib.rms((c_double * len(chunk))(*chunk), len(chunk))
# 正确：一次性转换，分块传指针
buf = (ctypes.c_double * total)(*samples)
for off in range(0, total, 44100):
    lib.rms(buf[off:] and ctypes.cast(ctypes.byref(buf[off]), ctypes.POINTER(ctypes.c_double)), 44100)
```

5. **只发源码包不发 wheel**：用户环境没有编译器时安装直接失败。CI 里为各平台构建 wheel，或在文档中明确声明编译依赖；验证时用 `pip install --no-build-isolation` 模拟裸环境。

## 本篇小结

1. C 扩展是优化阶梯的最后一阶：剖析确认热点在纯 Python 循环、向量化救不动时才进入，热点在 IO 时扩展无益。
2. ctypes 零编译绑定动态库，argtypes/restype 必须显式声明；cffi 的 cdef 语法更接近头文件，API 模式把签名校验提前到构建期，是发布推荐——两种模式共享声明，先验证后迁移几乎零成本。
3. CPython C API 扩展性能与集成度最高，代价是引用计数纪律：新引用必须 DECREF，模块名与 PyInit_ 函数名严格对应。
4. 分发靠 wheel 而不是源码；替代方案按需选：Cython 渐进加速 Python 代码，pybind11/nanobind 绑 C++，PyO3 用 Rust 写新模块。
5. GIL 与扩展的交互是隐藏考点：长计算段用 Py_BEGIN/END_ALLOW_THREADS 释放 GIL，多线程调用才有意义。

## 动手实践

1. **ctypes 版响度库**：把 volume.c 编译成三平台可用的动态库（至少本机一种），用 ctypes 声明签名调用，并与纯 Python 版、`math.fsum` 版各跑一次 100 万采样的基准。提示：转换 C 数组的时间单独立项计时，看清"转换成本 vs 计算收益"的构成。
2. **cffi API 模式构建**：把同一份 C 函数用 build_cffi.py 的 API 模式编译成 _volume 模块，对比 ABI 模式与 API 模式的调用耗时与错误暴露时机。提示：故意在 cdef 里把 int 写成 long，观察 API 模式在构建期的报错。
3. **wheel 发布演练**：为 _volume 扩展配置 pyproject.toml，`python -m build` 产出 wheel 并在另一个虚拟环境安装验证，确认无需编译器即可使用。提示：`pip install dist/*.whl` 后在全新目录 `python -c "import _volume"` 测试。再用包管理器查看 wheel 的文件清单，确认编译产物确实随包分发。
