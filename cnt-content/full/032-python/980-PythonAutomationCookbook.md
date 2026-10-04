---
order: 820
title: 自动化手册：把杂活变成可靠脚本
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「每周手动的固件备份整理」为场景，把一件杂活做成可长期运行的可靠脚本：pathlib 批量整理、subprocess 安全调用外部工具、APScheduler 定时，再补上幂等、重试、日志与失败通知四件生产装备；给出从脚本升级到工作流引擎（Airflow/Prefect）与 Celery 的时机判断。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/300-FileIOContextManager'
  - 'python/380-Subprocess'
  - 'python/860-PythonCeleryDistributedTaskQueue'
prerequisites:
  - 'python/300-FileIOContextManager'
  - 'python/130-ExceptionHandling'
---

## 前置知识

- [文件 IO 与上下文管理器](/python/300-FileIOContextManager)：会读写文件、用 `with`；
- [异常处理](/python/130-ExceptionHandling)：会写 try/except/finally。

## 你现在要解决什么问题

你每周都在重复同一套动作：把 FoloToy 设备的固件备份包（一堆 `firmware-v2.3.1-20260921.bin` 散落在下载目录）按设备型号分拣到备份盘，跑一遍厂商的校验命令行工具，然后清掉超过 90 天的旧包。手工做一次十分钟，问题是会忘、会手滑删错。目标：写成脚本，进定时任务，人只看结果通知。这篇按「能跑、能定时、能长期可靠运行」三步把它做扎实。

## 第一步：文件批量整理（pathlib 与 shutil）

```python
import re
import shutil
from pathlib import Path

DOWNLOADS = Path.home() / "Downloads"
ARCHIVE = Path("D:/backup/firmware")        # Windows 示例；Linux/macOS 换路径

def organize() -> list[Path]:
    moved = []
    for pkg in DOWNLOADS.glob("firmware-v*.bin"):
        m = re.match(r"firmware-v[\d.]+-(\d{8})\.bin", pkg.name)
        if not m:                            # 不认识的命名，跳过并记录
            print(f"跳过：{pkg.name}")
            continue
        date = m.group(1)
        target_dir = ARCHIVE / date[:4]      # 按年归档
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / pkg.name
        if target.exists():                  # 幂等关键：目标已存在就跳过
            continue
        shutil.move(pkg, target)
        moved.append(target)
    return moved

for p in organize():
    print(f"已归档 {p}")
```

三个点让这段代码区别于「能跑就行」的版本：

- **`pathlib` 全程对象化**：`glob` 按模式遍历、`mkdir(parents=True, exist_ok=True)` 一步建目录不报已存在错，跨平台路径不用拼字符串（对比 `os.path` 的理由见 ruff 的 PTH 规则，[代码质量](/python/770-PythonCodeQuality)）；
- **幂等（idempotent）**：脚本跑两次的结果与一次相同——已归档的跳过、目录存在不报错。这是所有定时脚本的第一设计原则，因为定时任务必然重跑、人必然手抖重复执行；
- **对不认识的输入显式跳过**：静默忽略与直接崩溃之间，选择「记录后继续」，批量任务才不会被一个脏文件打死。

## 第二步：调用外部程序（subprocess）

厂商的校验工具是个命令行程序，Python 里用 `subprocess` 调它：

```python
import subprocess

def verify(pkg: Path) -> bool:
    result = subprocess.run(
        ["fwtool", "verify", str(pkg)],     # 参数列表，而不是拼一个字符串
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        print(f"校验失败 {pkg.name}: {result.stderr.strip()}")
        return False
    return True
```

规则要点：参数写成**列表**让 subprocess 直接逐个传递，不经过 shell 解释；`check=True`（或手动看 `returncode`）确保失败被看见；`timeout` 防止外部工具挂死拖垮整个任务。反面教材是拼接字符串加 `shell=True`：

```python
# 危险：filename 里带 ; rm -rf ~ 就是注入
subprocess.run(f"fwtool verify {filename}", shell=True)
```

文件名来自下载目录，内容不完全受你控制——`shell=True` 拼接用户可控输入是脚本注入的标准事故。凡是能用列表参数的场合，禁用 `shell=True`（subprocess 专篇见 [Subprocess](/python/380-Subprocess)）。

## 第三步：定时执行

两条路线，按环境选：

**系统 cron / 任务计划程序**（已有人在管机器上的定时事项时）：`crontab -e` 加一行，Python 脚本当普通程序跑：

```bash
0 3 * * 1  /opt/backup/venv/bin/python /opt/backup/organize.py >> /var/log/backup.log 2>&1
```

**APScheduler**（逻辑想留在 Python 里、要更复杂的触发规则时）：

```python
from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()
scheduler.add_job(organize_and_verify, "cron", day_of_week="mon", hour=3)
scheduler.add_job(cleanup_old, "cron", day=1, hour=4)
scheduler.start()
```

选型一句话：单机简单周期任务 cron 足够；需要错过触发后补跑（misfire）、任务间依赖、Web 界面时再引入调度库。注意 cron 的时区是机器时区，跨时区服务器要显式对表。

## 生产装备：让脚本能活过第一次事故

脚本从「给自己用」升级到「长期无人值守」，补四件装备：

**一，日志代替 print**。标准库 logging 配置一次，输出带时间戳与级别（配置细节见 [Python 日志](/python/430-PythonLog)）；任务开始、结束、处理数量各记一行，出事后你唯一的信息来源就是它。

**二，重试。** 网络与 IO 抖动是常态，瞬时失败不值得叫醒你。最简自研装饰器：

```python
import functools
import time

def retry(times=3, delay=2.0):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except OSError:
                    if attempt == times:
                        raise
                    time.sleep(delay * attempt)   # 指数退避
        return wrapper
    return decorator
```

**三，失败通知。** 定时任务失败而无人知晓，等于没有自动化。最低成本方案：任务收尾时检查失败清单，有则发一封邮件或一条 IM webhook（钉钉、Slack 均是 POST 一个 JSON）。「成功也通知」在初期值得保留——连着两周没收到消息，你才知道是任务挂了还是一切正常。

**四，可观测的退出码。** 脚本以非零退出码结束表示失败（`sys.exit(1)`），上层 cron、CI、监控才能感知。吞掉异常正常退出是最阴险的静默失败。

## 什么时候升级到工作流引擎

脚本长到这个样子时，说明该换工具了：任务之间出现依赖图（B 必须等 A、C 可以并行），需要网页上看历史运行与重跑按钮，需要多机分布。对应梯子：

| 需求 | 工具 | 一句话 |
| --- | --- | --- |
| 定时 + 依赖图 + 回填历史 | Airflow | 数据管道事实标准，重但全 |
| Python 原生写法的工作流 | Prefect / Dagster | 代码即工作流，开发体验好 |
| 把任务分发到多台机器异步执行 | Celery | 消息队列驱动的任务队列，见 [Celery](/python/860-PythonCeleryDistributedTaskQueue) |

作者的建议与爬虫篇一致：先用本篇的脚本把一件真事做完，感受到依赖图与监控的痛点，再上框架——否则你只是在学框架，不是在解决自己的问题。

## 常见坑点

坑一：`os.system` 与 `shell=True` 拼接。前者拿不到输出与退出码，后者有注入风险。一律 `subprocess.run` 列表参数。

坑二：静默失败。`try: ... except: pass` 在自动化里是定时炸弹——任务每天「成功」地什么都没干。至少 `logger.exception` 留现场。

坑三：时区。`datetime.now()` 用本地时间写文件名与日志，服务器一换时区顺序全乱。存档与日志用 `datetime.now(timezone.utc)`，展示层再转本地。

坑四：资源泄漏。打开的压缩包、SSH 连接、数据库游标忘了关，长驻的调度进程内存与句柄缓慢上涨。一律 `with`，第三方连接池配好生命周期。

坑五：无超时。任何外部调用（网络、子进程、数据库）都可能挂起，没有超时的无人值守脚本，最终状态是「卡了三周没人发现」。每个外部调用点都带 timeout。

## 自我检查

- 能写出幂等的文件整理函数并说出幂等为什么是定时脚本第一原则；
- 能说出 subprocess 列表参数防的是什么问题；
- 能配置一条 cron 并解释每个字段，或用 APScheduler 写等价的 Python 调度；
- 能复述生产四装备：日志、重试、通知、退出码；
- 知道升级到 Airflow/Celery 的信号分别是什么。

## 练习

1. 预测题：`organize()` 连跑两次，第二次的输出是什么？如果把 `if target.exists(): continue` 删掉再跑呢？
2. 修改题：给整理函数加「90 天以上旧包清理」，只清理备份盘、绝不碰下载目录；用 `datetime` 比较文件修改时间，并写断言验证边界（正好 90 天的删不删？）。
3. 实战题：挑一件你每周真的在重复的事（备份、截图整理、报表下载），用本篇模式做成脚本，配进 cron 或任务计划程序跑两周。
4. 挑战题：把 retry 装饰器升级为支持指定异常类型与最大总耗时（超过即放弃），并用一个必失败的函数验证重试次数与日志。

## 下一步

- 外部命令调用的完整细节（管道、环境变量、Windows 差异）：[Subprocess](/python/380-Subprocess)；
- 分布式任务队列（把活分给多台机器）：[Celery](/python/860-PythonCeleryDistributedTaskQueue)；
- 脚本长成命令行工具后的参数与打包：[Python CLI](/python/810-PythonCLI)。
