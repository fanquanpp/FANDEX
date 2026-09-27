# 代码示例标准（code-example-standard）

## 1. 可运行性是底线

- 每个示例必须可以原样复制运行；禁止伪代码冒充可运行代码（教学示意必须标注「示意」）；
- 每个产出输出的示例必须写出预期输出（紧跟代码块，用 text 块或行内注释），格式对齐真实控制台/终端输出；
- 涉及版本的 API 写明适用版本（如 Node 24+、Python 3.12+），版本事实以 technical-verification-standard.md 的流程验证。

## 2. 示例来源分层

1. 首选**仓库作者的真实项目**（已获授权，可深链）：
   - FANDEX 本体（Astro 7 + React 19 + Tailwind 4 + pnpm monorepo + GitHub Actions）：git/TypeScript/React/Vite/DevOps 模块的工程化示例素材；
   - quaver（Godot 4.7 键盘弹奏编曲工具）、geometric-construct（Godot 速度肉鸽）：godot/gdscript 模块；
   - ZATO-CN-Patch（Ren'Py 汉化补丁）：renpy 模块；
   - FoloToy-calendar（ESP32-C3 固件）：c 模块嵌入式示例；
   - slide-forge（HTML 模板库）：html5 示例素材；
   - ThomasWasAlone-CN-Patch（PowerShell 一键安装脚本）：shell 模块。
2. 次选官方文档示例（改写为连续场景，注明出处）；
3. 允许改编的开放仓库（MIT/BSD/CC-BY，注明出处与许可）：freeCodeCamp、ossu/computer-science、EbookFoundation/free-programming-books、practical-tutorials/project-based-learning、TheAlgorithms/Python、mtdvio/every-programmer-should-know、charlax/professional-programming；
4. 禁止改编（NC/自定义许可与 MIT 冲突，只借鉴结构思想）：TheOdinProject/curriculum、missing-semester、javascript.info。

## 3. 案例现代化

- 主线案例库：游戏排行榜/存档/背包、命令行记账、猜数字、文件整理器、短链接、日志分析、API 数据抓取、Markdown 处理、CLI 工具、待办系统；
- 陈旧案例（九九乘法表、学生成绩、员工工资、圆面积、Person/Student 继承、银行账户）不得作为主案例；如确需最简示例，用数据/游戏场景替位；
- 案例逐级递进：同一模块内让案例从小（5 分钟）长到完整（半天），学生能看到「同一个程序越长越大」。

## 4. 错误示例规范

- 错误代码必须配「真实报错原文」（能贴出真实 traceback/error message，不凭记忆编造格式）；
- 每处错误示例给出「读报错三步」式的定位路径，而不是直接给答案；
- 涉及安全的不当写法（明文密码、关闭证书校验、SQL 拼接）必须配醒目警告与正确替代写法。

## 5. 代码风格

- 遵循各语言社区主流风格（Python PEP 8、JS 现代 ESM、SQL 大写关键字小写标识符皆可但全篇一致）；
- 变量命名见名知意，`a`/`tmp`/`foo` 只允许出现在讲命名本身的文档里；
- 单示例不超过约 30 行；超出的拆成多个递进示例。
