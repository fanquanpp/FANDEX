---
order: 830
title: 配置管理：让同一份代码跑在不同环境
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「语音玩具后台从家里搬到云上」为线索实战配置管理：环境变量与 12 因素、.env 与 python-dotenv、.env.example 纪律、pydantic-settings 类型化配置与启动即校验、SecretStr 防泄漏，附「密钥进 Git」「字符串布尔」等高频事故与四类练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/550-DataClassPydantic'
  - 'python/790-PythonDocker'
  - 'python/905-ConfigPatternsReference'
  - 'python/780-PythonCICD'
prerequisites:
  - 'python/070-BasicDataType'
  - 'python/550-DataClassPydantic'
---

## 前置知识

- [基本数据类型](/python/070-BasicDataType)：知道类型转换的基本脾气；
- [数据类与 Pydantic](/python/550-DataClassPydantic)：会写 Pydantic 模型——本文的主角 pydantic-settings 就是它的配置特化版；
- [模块、包与工程化](/python/720-ModulePackageEngineering) 与 Git 基础：知道 .gitignore 干什么。

> 定位说明：本篇讲「单服务如何管好配置」这条主线：环境变量、.env、pydantic-settings、密钥纪律。多环境分层（Dynaconf）、特性开关、K8s ConfigMap、配置测试这些进阶模式收进 [配置进阶模式参考](/python/905-ConfigPatternsReference)。

## 学习目标

读完本文你将能够：

1. 说清配置与代码分离的原因，并用环境变量 + `os.environ` 完成最基本的注入；
2. 用 python-dotenv 管理 `.env` 文件，并严格执行 `.env` 不进 Git、`.env.example` 进 Git 的纪律；
3. 用 pydantic-settings 写出类型化配置：启动即校验、缺配置直接报错、`SecretStr` 防日志泄漏；
4. 讲清配置的优先级链（调用参数 > 环境变量 > .env > 默认值）并预测一次覆盖结果；
5. 识别四类配置事故：密钥进仓库、字符串布尔、「false」为真、import 时读配置。

预计 45 到 60 分钟，含 2 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你给语音玩具写了个后台服务（把「问玩具天气」转发给大模型 API）。在自己电脑上一切正常，你准备部署到云服务器，立刻遇到三件事：

- 模型 API 的**密钥**：总不能写死在代码里——代码要推 Git，密钥一进仓库就是公开的（自动扫描机器人几分钟内就会捡走它去刷你的额度，这不是吓唬人，是每分钟都在发生的事）；
- **环境差异**：家里连局域网的测试模型，云上连正式模型；日志在家要 DEBUG、在云上要 WARNING；
- **行为开关**：新功能「语音唤醒词」想只在家里开着试。

三件事的共同本质：**代码一样，环境不同**。把这些「随环境变的量」从代码里抽出来、按环境注入，就是配置管理。业界把它总结成一条原则（出自 2011 年的十二因素应用方法论，至今是云时代配置的地基）：**配置存于环境，代码只有一份**。

## 2. 最基本的一层：环境变量

环境变量是操作系统级的「随身便签」：每个进程启动时都带着一组键值对。Python 用标准库读取：

```python
import os

api_key = os.environ["TOY_API_KEY"]        # 没有 -> 直接 KeyError（ fail fast）
log_level = os.getenv("TOY_LOG_LEVEL", "INFO")   # 没有 -> 用默认值
```

先在终端亲手感受注入过程：

```bash
# PowerShell
$env:TOY_API_KEY = "sk-test-123"
python -c "import os; print(os.environ['TOY_API_KEY'])"

# bash / zsh
TOY_API_KEY=sk-test-123 python -c "import os; print(os.environ['TOY_API_KEY'])"
```

两种读法的取舍：`os.environ[...]` 缺失即炸——对「没有它服务跑不了」的配置（密钥）是优点，程序在第一行就死给你看；`os.getenv` 静默回默认——适合有合理默认的（日志级别）。它们共同的局限马上会暴露：**值全是字符串**。

```python
>>> os.getenv("DEBUG", "false")
'false'
>>> bool("false")          # 想转布尔？非空字符串全为真！
True
```

「false」是四个字符，非空即真——这是配置领域最经典的逻辑炸弹之一，第 6 节给系统性修法。

## 3. .env 文件：把便签写进文件，但不进 Git

每次开终端手动 export 太苦，开发者约定俗成地把环境变量写进项目根目录的 `.env` 文件：

```text
# .env —— 本机开发环境专用，绝不提交 Git
TOY_API_KEY=sk-local-dev-xxx
TOY_LOG_LEVEL=DEBUG
TOY_WAKE_WORD=on
TOY_MODEL_ENDPOINT=http://192.168.1.8:8000/v1
```

`.env` 本身不是魔法，需要 python-dotenv 把它装进环境：

```bash
uv add python-dotenv
```

```python
from dotenv import load_dotenv
import os

load_dotenv()                  # 读 .env，写入 os.environ（已存在的变量不覆盖）
print(os.environ["TOY_MODEL_ENDPOINT"])
```

「不覆盖」这个细节是优先级链的第一环：真实环境变量永远压过 .env 文件——容器与 CI 里注入的值不会被你本地的 .env 悄悄改掉。

然后是本篇最重要的一条纪律：**`.env` 进 .gitignore，`.env.example` 进 Git**。

```text
# .gitignore
.env
```

```text
# .env.example —— 提交进仓库的「字段说明书」，值全部是占位
TOY_API_KEY=sk-xxxx
TOY_LOG_LEVEL=INFO
TOY_WAKE_WORD=off
TOY_MODEL_ENDPOINT=http://localhost:8000/v1
```

新人克隆仓库看 `.env.example` 复制一份改值，十秒上手；密钥永远只在每个人自己的 `.env` 里。检查你过去是否已经泄漏：把项目目录交给 `git log -p` 搜一搜密钥片段——如果已经进了历史，光删文件不够（历史还在），要去平台作废重发密钥。

## 4. pydantic-settings：让配置自带类型与体检

变量散落在 `os.getenv` 里，问题会越攒越多：类型随手转、字段没清单、错了要到用的时候才炸。pydantic-settings 把 550 篇的 Pydantic 模型直接对准配置：

```bash
uv add pydantic-settings
```

```python
# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TOY_", env_file=".env")

    api_key: SecretStr
    model_endpoint: str = "http://localhost:8000/v1"
    log_level: str = "INFO"
    wake_word: bool = False

def get_settings() -> Settings:
    return Settings()          # import 时不执行，首次调用时加载并校验
```

使用端：

```python
from config import get_settings

settings = get_settings()
settings.api_key                # SecretStr('**********')，repr 不泄漏
settings.api_key.get_secret_value()   # 真正要用时显式取
settings.wake_word              # 已经是真 bool，不用手动转
```

它一次解决了第 2 节攒下的三个问题：

- **类型自动转**：`TOY_WAKE_WORD=false` 进来就是 False（1/0、yes/no、true/false 都认）；
- **启动即校验**：缺 `TOY_API_KEY`，进程启动瞬间抛出 `ValidationError`，把缺什么、要什么打印得清清楚楚——而不是请求打到一半才 KeyError；
- **SecretStr 防泄漏**：打印 settings、写日志、进异常消息时它都是 `**********`，明文必须显式 `get_secret_value()` 才能取——把「不小心把密钥打进日志」从事故变成语法错误。

优先级链（背下来）：**调用时传参 > 环境变量 > .env 文件 > 代码默认值**。修改实验一：在 `.env` 写 `TOY_LOG_LEVEL=DEBUG`，终端里 `TOY_LOG_LEVEL=WARNING` 再启动，打印 `settings.log_level` 验证谁赢；再删掉环境变量跑一次，观察回退到 .env。

## 5. 多环境：一份 Settings，不同注入

「家里一套、云上一套」不需要两套代码。思路是**同一份 Settings 类，靠不同环境的注入值产生不同配置**：

```python
import logging
from config import get_settings

def setup() -> logging.Logger:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level)
    log = logging.getLogger("toy")
    if settings.wake_word:
        log.info("唤醒词功能已开启（仅本机）")
    return log
```

云服务器不建 `.env`，用真实环境变量注入（`systemd` 的 `EnvironmentFile`、Docker 的 `-e`、CI 的 secrets——分别在部署与 CI 篇展开）；开发机用 `.env`。同一份代码，两副面孔，谁是哪副全看环境说话。需要更重的多环境分层（`settings.toml` 的 `[dev]`/`[prod]` 段、密钥单独托付）时，升级到 Dynaconf，见 [配置进阶模式参考](/python/905-ConfigPatternsReference)。

## 6. 事故清单：四种最常见的翻车

事故一：**密钥进 Git**。症状：GitHub 收到密钥泄漏邮件、API 账单暴涨。预防：`.env` 永远在 .gitignore；代码里搜 `sk-`、`AKIA`、`password =` 应该一无所获。应急：作废重发是唯一正解，从 Git 历史里删文件不算数。

事故二：**手动 bool 转换**。`bool(os.getenv("FLAG", "false"))` 恒为 True（第 2 节演示过）。修法：pydantic-settings 的 bool 字段，或显式 `os.getenv("FLAG", "false").lower() == "true"`。

事故三：**import 时读配置**。`config.py` 顶层直接 `Settings()`，导致「还没运行任何业务逻辑就要求环境齐备」：import 这个模块的测试、工具脚本、文档构建全部被连坐炸掉。修法：包在 `get_settings()` 函数里，首次调用才加载（第 4 节的写法）；测试想换配置，用依赖注入传参。

事故四：**全局可变配置**。运行中随手 `settings.log_level = "DEBUG"`，等于把隐藏状态撒进整个进程——读它的行为随时间变化，测试无法复现。原则：**配置在启动时定型，运行期只读**；真需要运行时改（特性开关），把它做成显式的独立机制（见 905 篇），而不是篡改全局对象。

修改实验二：把第 4 节 config.py 的 `api_key: SecretStr` 临时改成 `api_key: str`，写一行 `print(settings)` 运行，观察密钥明文出现在输出里——这就是 SecretStr 挡住的事故现场。改回去，再 print 验证。

## 7. 什么时候应该 / 不应该

应该：任何会跑在第二个环境上的代码，从第一天就用环境变量注入；团队项目立刻建立 `.env.example`；服务用 pydantic-settings 收拢配置并启动即校验；密钥一律 SecretStr（或外部密钥管理器）。

不应该：配置写死在代码里；`.env` 进仓库；运行期改全局配置；为单个脚本引入重型配置框架（os.getenv 一行就够）；把「临时调试开关」留在正式配置里。

## 8. 与之前和之后的知识的关系

- 往前：[数据类与 Pydantic](/python/550-DataClassPydantic) 提供校验引擎，本文把它指向「环境」这个特殊数据源；[模块与工程化](/python/720-ModulePackageEngineering) 的 .gitignore 纪律在本文升级为密钥纪律；
- 往后：[Docker](/python/790-PythonDocker) 里 `-e` 与 env_file 是本文注入方式的容器形态；[CI/CD](/python/780-PythonCICD) 的 secrets 功能接手「云上密钥从哪来」；多环境分层、特性开关、K8s ConfigMap 在 [配置进阶模式参考](/python/905-ConfigPatternsReference)；[毕业项目](/python/975-PythonCapstoneProject) 的 ledger 工具要求存储路径与日志级别全部走环境变量——本文是它的直接准备。

## 9. 官方文档

- pydantic-settings：https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- python-dotenv：https://saurabh-kumar.com/python-dotenv/
- 十二因素应用（配置一条）：https://12factor.net/zh_cn/config

## 10. 自我检查

- 能复述「配置存于环境，代码只有一份」并举出本文的三类环境差异；
- 能讲清 os.environ 与 os.getenv 的取舍，及「值全是字符串」的陷阱；
- 能默写优先级链并预测一次覆盖结果；
- 能说出 .env 与 .env.example 的分工，以及密钥已泄漏后的正确应急；
- 能列出 pydantic-settings 解决的三个问题（类型、启动校验、SecretStr）；
- 能解释为什么配置加载不能放在 import 时。

## 练习

预测题：`.env` 里 `TOY_WAKE_WORD=off`，`Settings` 中 `wake_word: bool = True`，不做任何其他注入——`settings.wake_word` 是 True 还是 False？手动 `bool(os.getenv("TOY_WAKE_WORD", "false"))` 呢？

修改题：给 ledger（毕业项目预告版）加配置：`LEDGER_DB_PATH`（默认 `ledger.json`）与 `LEDGER_LOG_LEVEL`（默认 `WARNING`），用 pydantic-settings 实现，并补 `.env.example`。

排错题：同事的服务在 CI 挂了，报 `ValidationError: TOY_API_KEY - Field required`，但本地明明有 `.env`。列出两个最可能的原因（CI 不会带你的本地 .env，密钥该走 CI secrets；或 .env 被误提交被 .gitignore 挡下根本没进仓库）。

挑战题：给 Settings 加「启动自检」：`model_config` 之外写一个方法 `report()`，逐项打印配置（SecretStr 项只显示前 3 后 2 位），并在 log_level 不在合法枚举时抛自定义异常。写两条 pytest：合法配置通过、非法 log_level 启动即炸。

## 本章总结

配置管理解决「代码一份、环境多样」：环境变量是最低层注入，os.environ 快失败、getenv 有默认、但值全是字符串；.env 把变量落盘、python-dotenv 负责装载且不覆盖真实环境变量；.env 永不进 Git、.env.example 进 Git 是团队纪律的红线；pydantic-settings 用一份模型同时拿到类型转换、启动即校验与 SecretStr 防泄漏，优先级链「传参 > 环境 > .env > 默认值」要能默写；四大事故——密钥进仓库、手动 bool、import 读配置、运行期改全局——每一种都有本文给出的对应修法。

## 下一步

配置的注入端在哪里生根？进入 [Python 与 Docker](/python/790-PythonDocker)：把服务连同它的运行环境打包成镜像，用 -e 与 env_file 完成配置注入的最后一公里；多环境分层与特性开关等进阶模式随时可跳读 [配置进阶模式参考](/python/905-ConfigPatternsReference)。
