---
order: 74
title: 'Python 与配置管理：从环境变量到云原生动态配置的工程实践'
module: python
category: Python
difficulty: intermediate
description: '系统阐述 Python 配置管理的形式化定义、配置源层级、十二因素应用方法论、Pydantic Settings/Dynaconf/python-dotenv 等主流方案、多环境配置、动态配置与特性开关、密钥管理、容器化与 Kubernetes 配置、配置测试与校验、生产级最佳实践。'
author: fanquanpp
updated: '2026-07-21'
tags:
  - python
  - configuration
  - env-vars
  - pydantic
  - dynaconf
  - twelve-factor
  - secrets
  - kubernetes
related:
  - python/Python与Docker
  - python/Python与日志
  - python/Python与加密
  - python/Python与消息队列
prerequisites:
  - python/语法速查
  - python/基础数据类型
  - python/类与对象
---

# Python 与配置管理：从环境变量到云原生动态配置的工程实践

> 配置管理是软件工程中看似简单、实则深奥的领域。同一份代码需要在开发、测试、预发、生产等多个环境中运行，而每个环境的数据库地址、API 密钥、特性开关都不相同。本文从形式化定义出发，系统阐述 Python 配置管理的核心模型——配置源、配置层级、配置优先级、配置生命周期，覆盖 `.env`、YAML、TOML、环境变量、命令行参数、远程配置中心等多种来源，深入分析 Pydantic Settings、Dynaconf、python-dotenv 等主流方案的实现原理，并通过十二因素应用方法论、密钥管理、Kubernetes ConfigMap/Secret、动态配置与特性开关等工程实践，帮助开发者构建可维护、可测试、安全的配置体系。

## 1. 学习目标

本文依据 Bloom's Taxonomy（布鲁姆认知目标分类学）的六个层次组织学习目标，确保从低阶认知到高阶创造的渐进式掌握。

### 1.1 记忆（Remembering）

- 列出配置管理的五种主要配置源：环境变量、配置文件、命令行参数、远程配置中心、默认值。
- 回忆十二因素应用方法论中关于配置的核心原则：配置应存储在环境变量中。
- 列出常见的配置文件格式：`.env`、YAML、TOML、JSON、INI、HOCON。
- 陈述配置优先级的典型顺序：命令行参数 > 环境变量 > `.env` 文件 > 配置文件 > 代码默认值。

### 1.2 理解（Understanding）

- 解释配置与代码分离的核心动机：同一份代码在不同环境中运行而无需修改。
- 描述 Pydantic Settings 的工作原理：基于类型注解自动从环境变量、`.env` 文件读取并验证配置。
- 区分静态配置（启动时加载）与动态配置（运行时更新）的差异。
- 解释密钥不应硬编码、不应提交到版本控制的安全原因。

### 1.3 应用（Applying）

- 使用 `os.getenv` 与 `python-dotenv` 读取环境变量与 `.env` 文件。
- 使用 Pydantic Settings 实现类型安全的配置管理。
- 使用 Dynaconf 实现多环境配置切换。
- 使用 argparse 结合环境变量实现配置优先级链。

### 1.4 分析（Analyzing）

- 分析 Pydantic Settings 与 Dynaconf 在架构、性能、可维护性上的差异。
- 解构 Kubernetes ConfigMap 与 Secret 的协作机制。
- 比较本地配置文件、环境变量、远程配置中心三种方案的优劣。
- 分析配置热更新对应用架构的影响（重启 vs 动态加载）。

### 1.5 评价（Evaluating）

- 评估 HashiCorp Vault、AWS Secrets Manager、Azure Key Vault 等密钥管理方案的适用场景。
- 评判"配置即代码"（Configuration as Code）相对于传统配置文件的优势与劣势。
- 评价特性开关（Feature Flag）在持续交付中的价值与风险。

### 1.6 创造（Creating）

- 设计一套支持多环境、多租户、动态更新的配置管理体系。
- 实现一个基于 Redis 与 WebSocket 的配置热更新中间件。
- 构建一个支持密钥轮转、审计日志的密钥管理抽象层。

## 2. 历史动机与背景

### 2.1 配置管理的起源

配置管理的历史几乎与软件工程本身一样悠久。在早期单机时代，配置通常以硬编码方式存在于代码中，或者以"配置文件"形式与可执行文件放在一起。这种模式在单机、单环境部署的场景下勉强可用，但随着软件系统变得复杂、部署环境增多，硬编码配置暴露出严重问题：

1. **环境耦合**：代码与特定环境绑定，无法迁移。
2. **安全风险**：敏感信息（密码、密钥）混入代码，易被泄漏。
3. **部署困难**：每次环境变更都需要重新编译、打包。
4. **审计缺失**：无法追溯配置变更历史。

### 2.2 十二因素应用方法论（2011）

2011 年，Heroku 联合创始人 Adam Wiggins 发布了《Twelve-Factor App》方法论，系统总结了 SaaS 应用开发的最佳实践。其中第三条原则专门阐述配置：

> **III. Config: Store config in the environment.**
>
> 配置应存储在环境变量中，而不是代码中。代码应在不同环境中保持完全一致，仅通过环境变量区分。

十二因素应用将"配置"定义为**环境特定的部分**，包括：

- 数据库、缓存、消息队列等后端服务的连接地址。
- 第三方 API 的凭证（Amazon S3、Twitter、Stripe）。
- 每个环境的部署标识（domain、host）。
- 不随部署变化的"应用配置"（如 Rails 的 `config/environment.rb`）不属于此范畴。

这一方法论深刻影响了后续的容器化（Docker）、云原生（Kubernetes）、Serverless 等技术范式，环境变量成为配置注入的首选方式。

### 2.3 配置文件格式的演进

配置文件格式经历了漫长的演进：

- **INI（1980s）**：Windows 时代的产物，section + key=value 结构简单但不支持嵌套。
- **XML（1996）**：Java 生态的配置主流，结构严谨但冗长。
- **JSON（2001）**：Web 时代的通用格式，但不支持注释，不适合人工编辑。
- **YAML（2001）**：人类友好的缩进式格式，支持复杂结构、注释、引用，但解析器实现复杂、易出现安全漏洞。
- **TOML（2013）**：Tom Preston-Werner（GitHub 联合创始人）设计，吸取 INI 的简洁与 YAML 的表达力，被 Python 社区采纳为 `pyproject.toml` 的标准格式（PEP 518/621）。
- **HOCON（2014）**：Typesafe（现 Lightbend）为 Akka 设计，JSON 超集，支持注释、引用、合并。

Python 社区在 3.11 版本（PEP 680）将 `tomllib` 内置到标准库，标志着 TOML 在 Python 生态的正式地位。

### 2.4 现代配置管理框架

随着云原生架构的兴起，配置管理从"读文件"演变为复杂的工程问题：

- **Pydantic Settings**（Pydantic v2+）：基于类型注解的配置验证，深度集成 FastAPI、Django 等框架。
- **Dynaconf**：多环境、多源、动态加载的配置管理库，支持 YAML/TOML/JSON/.env/Redis/Vault。
- **python-dotenv**：轻量级 `.env` 文件加载器，最早源自 Ruby 的 dotenv。
- **Starlette config**：FastAPI/Starlette 生态的配置方案，基于环境变量与 `.env`。
- **criceto / Evernote config**：分层配置、环境覆盖的方案。

在云原生领域，远程配置中心成为主流：

- **Spring Cloud Config**（Java）：基于 Git/Vault 的配置中心。
- **Apollo**（携程开源）：配置中心，支持多语言客户端。
- **Nacos**（阿里巴巴开源）：服务发现 + 配置管理。
- **Consul KV**（HashiCorp）：分布式 KV 存储，支持配置。
- **etcd**（CoreOS）：强一致 KV 存储，Kubernetes 底层依赖。

## 3. 形式化定义

### 3.1 配置系统形式化

配置系统可形式化为四元组：

$$
Config = \langle S, L, P, \Phi \rangle
$$

- $S$：配置源（Source）集合，$S = \{s_1, s_2, ..., s_n\}$，每个源 $s_i$ 提供键值对 $\{k: v\}$。
- $L$：配置层级（Layer）集合，$L = \{l_1, l_2, ..., l_m\}$，层级之间存在优先级关系。
- $P$：优先级函数（Priority），$P: L \to \mathbb{N}$，数值越大优先级越高。
- $\Phi$：合并函数（Merge），$\Phi: S^* \to Config$，将多个源的配置按优先级合并为最终配置。

### 3.2 配置项形式化

配置项 $c$ 是一个五元组：

$$
c = \langle k, v, t, \text{required}, \text{default} \rangle
$$

- $k$：键（Key），字符串，如 `"DATABASE_URL"`。
- $v$：值（Value），任意类型，可能为字符串、整数、布尔、嵌套结构。
- $t$：类型（Type），值的预期类型，如 `str`、`int`、`bool`、`List[str]`。
- $\text{required}$：是否必需，布尔值，必需项缺失时启动失败。
- $\text{default}$：默认值，未提供时的兜底值。

### 3.3 配置合并形式化

给定多个配置源 $s_1, s_2, ..., s_n$，按优先级 $P(s_1) < P(s_2) < ... < P(s_n)$，最终配置 $C^*$ 为：

$$
C^* = \Phi(s_1, s_2, ..., s_n) = s_1 \oplus s_2 \oplus ... \oplus s_n
$$

其中 $\oplus$ 为"覆盖合并"运算符：

$$
(A \oplus B)[k] = \begin{cases}
B[k] & \text{if } k \in B \\
A[k] & \text{otherwise}
\end{cases}
$$

即高优先级源的值覆盖低优先级源的值。

### 3.4 配置访问形式化

配置访问函数 $get(C, k)$：

$$
get(C, k) = \begin{cases}
C[k].v & \text{if } k \in C \land C[k].v \neq \text{None} \\
C[k].\text{default} & \text{if } k \in C \land C[k].v = \text{None} \land \text{default defined} \\
\text{raise ConfigError} & \text{if } k \in C \land C[k].\text{required} \land \text{no value} \\
\text{None} & \text{otherwise}
\end{cases}
$$

### 3.5 配置生命周期形式化

配置的生命周期可形式化为状态机：

$$
\sigma \in \{ \text{Declared}, \text{Loaded}, \text{Validated}, \text{Frozen}, \text{Reloaded}, \text{Deprecated} \}
$$

状态转换：

$$
\begin{aligned}
\text{Declared} &\xrightarrow{\text{read sources}} \text{Loaded} \\
\text{Loaded} &\xrightarrow{\text{type check + validators}} \text{Validated} \\
\text{Validated} &\xrightarrow{\text{freeze}} \text{Frozen} \\
\text{Frozen} &\xrightarrow{\text{reload signal}} \text{Reloaded} \\
\text{Reloaded} &\xrightarrow{\text{re-validate}} \text{Frozen} \\
\forall \sigma &\xrightarrow{\text{deprecate}} \text{Deprecated}
\end{aligned}
$$

## 4. 理论推导

### 4.1 配置优先级链的数学性质

**命题**：配置优先级链满足偏序关系（严格偏序）。

**证明**：

定义优先级关系 $\prec$：$s_i \prec s_j$ 表示源 $s_j$ 优先级高于 $s_i$。

- 反自反性：$\forall s_i: \neg(s_i \prec s_i)$（一个源不能比自己优先级高）。
- 反对称性：$s_i \prec s_j \implies \neg(s_j \prec s_i)$。
- 传递性：$s_i \prec s_j \land s_j \prec s_k \implies s_i \prec s_k$。

因此 $\prec$ 是严格偏序关系。典型的优先级链：

$$
\text{default} \prec \text{file} \prec \text{.env} \prec \text{env\_var} \prec \text{cli\_arg}
$$

### 4.2 类型转换的复杂性

环境变量始终是字符串类型，需要手动转换为 Python 类型。类型转换函数 $\tau$：

$$
\tau: (v_{\text{str}}, t) \to v_t
$$

常见转换：

- $\tau(\text{"true"}, \text{bool}) = \text{True}$
- $\tau(\text{"42"}, \text{int}) = 42$
- $\tau(\text{"3.14"}, \text{float}) = 3.14$
- $\tau(\text{"a,b,c"}, \text{List[str]}) = [\text{"a", "b", "c"}]$

**陷阱**：布尔值转换存在歧义。`"false"`、`"no"`、`"0"`、`"off"` 应转换为 `False`，但 `bool("false")` 在 Python 中为 `True`（非空字符串为真）。必须显式定义映射表：

```python
TRUE_VALUES = {'true', '1', 'yes', 'on', 'y', 't'}
FALSE_VALUES = {'false', '0', 'no', 'off', 'n', 'f', ''}

def str_to_bool(value: str) -> bool:
    """字符串转布尔值（大小写不敏感）"""
    lower = value.lower()
    if lower in TRUE_VALUES:
        return True
    if lower in FALSE_VALUES:
        return False
    raise ValueError(f"无法将 '{value}' 转换为布尔值")
```

### 4.3 Pydantic Settings 的查找算法

Pydantic Settings 的配置查找可形式化为：

$$
\text{lookup}(k) = \begin{cases}
\text{env\_var}[k.\text{upper()}] & \text{if exists} \\
\text{env\_file}[k.\text{upper()}] & \text{if exists} \\
\text{field\_default}[k] & \text{if exists} \\
\text{raise ValidationError} & \text{if required} \\
\text{None} & \text{otherwise}
\end{cases}
$$

Pydantic v2 的 `BaseSettings` 使用 `pydantic-settings` 独立包实现，支持：

- `env_prefix`：环境变量前缀，如 `APP_` 前缀的 `APP_DATABASE_URL`。
- `env_nested_delimiter`：嵌套配置的分隔符，如 `__` 解析 `DATABASE__URL` 为 `{"DATABASE": {"URL": ...}}`。
- `env_file`：`.env` 文件路径，支持多文件。
- `case_sensitive`：是否大小写敏感。

### 4.4 配置热更新的复杂性

静态配置在启动时加载，运行时不可变。动态配置支持运行时更新，但引入复杂性：

$$
\text{HotReload} = \langle \text{Watch}, \text{Notify}, \text{Apply}, \text{Verify} \rangle
$$

- **Watch**：监听配置源变更（文件 inotify、Redis pubsub、轮询）。
- **Notify**：通知应用配置已变更。
- **Apply**：原子地替换配置实例。
- **Verify**：验证新配置生效，必要时回滚。

**线程安全**：配置热更新必须保证线程安全，否则可能出现部分线程使用旧配置、部分使用新配置的不一致状态。常见策略：

- **Copy-on-Write**：新配置创建为新对象，原子替换引用。
- **Read-Write Lock**：读多写少场景。
- **Immutable Config**：配置对象不可变，每次更新生成新对象。

### 4.5 密钥管理的威胁模型

密钥管理的威胁模型包括：

- **代码库泄漏**：密钥提交到 Git，即使后续删除仍可在历史中找到。
- **日志泄漏**：应用启动时打印配置，密钥进入日志。
- **容器镜像泄漏**：密钥写入 Dockerfile 或镜像层，推送到公开 registry。
- **运行时内存泄漏**：密钥在内存中明文存储，被 dump 后泄漏。
- **传输泄漏**：密钥通过网络明文传输。

**缓解措施**：

1. 使用 `.gitignore` 排除 `.env`、`secrets.*`。
2. 使用 `.env.example` 提供模板，不含真实值。
3. 使用 Vault、AWS Secrets Manager 等专业密钥管理服务。
4. 日志脱敏（masking）：将 `password=123456` 替换为 `password=***`。
5. 容器运行时通过环境变量或挂载卷注入密钥，不写入镜像。
6. 密钥轮转：定期更换密钥，减少泄漏窗口。

## 5. 代码示例

### 5.1 基础环境变量读取

```python
"""
基础环境变量读取示例

本模块演示：
1. 使用 os.getenv 读取环境变量
2. 处理环境变量默认值
3. 类型转换（字符串到 int/bool）
4. 必需变量缺失时的处理
"""
import os
import sys
from typing import Optional


# 布尔值转换映射表
TRUE_VALUES = {'true', '1', 'yes', 'on', 'y', 't'}
FALSE_VALUES = {'false', '0', 'no', 'off', 'n', 'f', ''}


def get_str(key: str, default: Optional[str] = None, required: bool = False) -> str:
    """
    读取字符串类型环境变量
    
    参数:
        key: 环境变量名
        default: 默认值，未设置时返回
        required: 是否必需，为 True 且未设置时抛出异常
    返回:
        环境变量值或默认值
    异常:
        ValueError: required 为 True 且变量未设置
    """
    value = os.getenv(key)
    if value is None:
        if required:
            raise ValueError(f"必需的环境变量 {key} 未设置")
        return default
    return value


def get_int(key: str, default: Optional[int] = None, required: bool = False) -> int:
    """
    读取整数类型环境变量
    
    参数:
        key: 环境变量名
        default: 默认值
        required: 是否必需
    返回:
        整数值
    异常:
        ValueError: 变量未设置或格式无效
    """
    value = os.getenv(key)
    if value is None:
        if required:
            raise ValueError(f"必需的环境变量 {key} 未设置")
        return default
    try:
        return int(value)
    except ValueError:
        raise ValueError(f"环境变量 {key}={value} 不是有效的整数")


def get_bool(key: str, default: Optional[bool] = None, required: bool = False) -> bool:
    """
    读取布尔类型环境变量
    
    支持的 true 值: true, 1, yes, on, y, t（大小写不敏感）
    支持的 false 值: false, 0, no, off, n, f, ''（大小写不敏感）
    
    参数:
        key: 环境变量名
        default: 默认值
        required: 是否必需
    返回:
        布尔值
    异常:
        ValueError: 变量未设置或格式无效
    """
    value = os.getenv(key)
    if value is None:
        if required:
            raise ValueError(f"必需的环境变量 {key} 未设置")
        return default
    lower = value.lower()
    if lower in TRUE_VALUES:
        return True
    if lower in FALSE_VALUES:
        return False
    raise ValueError(f"环境变量 {key}={value} 不是有效的布尔值")


def get_list(key: str, default: Optional[list] = None, separator: str = ',', required: bool = False) -> list:
    """
    读取列表类型环境变量（逗号分隔的字符串）
    
    参数:
        key: 环境变量名
        default: 默认值
        separator: 分隔符，默认为逗号
        required: 是否必需
    返回:
        字符串列表
    """
    value = os.getenv(key)
    if value is None:
        if required:
            raise ValueError(f"必需的环境变量 {key} 未设置")
        return default or []
    return [item.strip() for item in value.split(separator) if item.strip()]


# 应用启动时校验必需的环境变量
def validate_required_env_vars() -> None:
    """校验所有必需的环境变量是否已设置"""
    required_vars = ['DATABASE_URL', 'SECRET_KEY']
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        sys.exit(f"启动失败：缺少必需的环境变量: {', '.join(missing)}")


# 实际使用示例
if __name__ == '__main__':
    # 读取配置
    database_url = get_str('DATABASE_URL', default='sqlite:///default.db', required=True)
    port = get_int('PORT', default=8000)
    debug = get_bool('DEBUG', default=False)
    allowed_hosts = get_list('ALLOWED_HOSTS', default=['localhost'])
    
    print(f"数据库: {database_url}")
    print(f"端口: {port}")
    print(f"调试模式: {debug}")
    print(f"允许的主机: {allowed_hosts}")
```

### 5.2 使用 python-dotenv 加载 .env 文件

```python
"""
python-dotenv 加载 .env 文件示例

本模块演示：
1. 创建 .env 文件
2. 使用 load_dotenv 加载环境变量
3. 多环境 .env 文件切换
4. .env 文件覆盖优先级
"""
import os
from pathlib import Path
from dotenv import load_dotenv, dotenv_values


# 示例：创建 .env 文件内容
ENV_FILE_CONTENT = """\
# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
DATABASE_POOL_SIZE=10
DATABASE_ECHO=false

# 应用配置
APP_NAME=MyApp
APP_ENV=development
DEBUG=true
PORT=8000

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# 日志配置
LOG_LEVEL=DEBUG
LOG_FILE=app.log
"""


def create_env_file(path: str = '.env', content: str = ENV_FILE_CONTENT) -> None:
    """
    创建 .env 文件
    
    参数:
        path: 文件路径
        content: 文件内容
    """
    env_path = Path(path)
    env_path.write_text(content, encoding='utf-8')
    print(f"已创建 {path}")


def load_env_examples() -> None:
    """
    演示 python-dotenv 的多种用法
    """
    # 方式1：load_dotenv 加载到 os.environ（最常用）
    # override=False（默认）：不覆盖已存在的环境变量
    load_dotenv('.env', override=False)
    
    database_url = os.getenv('DATABASE_URL')
    debug = os.getenv('DEBUG')
    print(f"[load_dotenv] DATABASE_URL={database_url}")
    print(f"[load_dotenv] DEBUG={debug}")
    
    # 方式2：dotenv_values 仅返回字典，不修改 os.environ
    config = dotenv_values('.env')
    print(f"[dotenv_values] 配置项数: {len(config)}")
    print(f"[dotenv_values] APP_NAME={config.get('APP_NAME')}")
    
    # 方式3：override=True 强制覆盖环境变量
    os.environ['DEBUG'] = 'false'  # 模拟外部设置
    print(f"[覆盖前] DEBUG={os.getenv('DEBUG')}")  # false
    load_dotenv('.env', override=True)
    print(f"[覆盖后] DEBUG={os.getenv('DEBUG')}")  # true（来自 .env）


def multi_env_loading() -> None:
    """
    多环境 .env 文件加载策略
    
    典型场景：根据 APP_ENV 加载不同的 .env 文件
    优先级：.env.{env} > .env
    """
    # 获取当前环境
    app_env = os.getenv('APP_ENV', 'development')
    
    # 加载顺序：先加载基础 .env，再加载环境特定 .env（覆盖）
    env_files = ['.env', f'.env.{app_env}']
    
    for env_file in env_files:
        if Path(env_file).exists():
            load_dotenv(env_file, override=True)
            print(f"已加载 {env_file}")
        else:
            print(f"跳过（不存在）: {env_file}")
    
    print(f"当前环境: {app_env}")
    print(f"DATABASE_URL={os.getenv('DATABASE_URL')}")


if __name__ == '__main__':
    create_env_file()
    load_env_examples()
    multi_env_loading()
```

### 5.3 使用 Pydantic Settings 实现类型安全配置

```python
"""
Pydantic Settings 类型安全配置示例

本模块演示：
1. 使用 BaseSettings 定义配置类
2. 类型验证与字段约束
3. 嵌套配置
4. 自定义验证器
5. 配置导出与序列化
"""
from typing import Optional, List
from pydantic import Field, field_validator, model_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class DatabaseSettings(BaseSettings):
    """
    数据库配置（嵌套配置）
    
    通过 env_nested_delimiter='__' 解析嵌套环境变量：
    DATABASE__URL=... 对应 database.url
    """
    url: str = Field(default='sqlite:///default.db', alias='DATABASE_URL')
    pool_size: int = Field(default=10, ge=1, le=100)
    echo: bool = False
    connect_timeout: int = Field(default=10, ge=1, le=60)


class RedisSettings(BaseSettings):
    """Redis 配置"""
    url: str = Field(default='redis://localhost:6379/0', alias='REDIS_URL')
    max_connections: int = Field(default=20, ge=1, le=100)
    socket_timeout: float = Field(default=5.0, ge=0.1)


class LogSettings(BaseSettings):
    """日志配置"""
    level: str = Field(default='INFO')
    file: Optional[str] = None
    max_size_mb: int = Field(default=100, ge=1)
    backup_count: int = Field(default=7, ge=1)
    
    @field_validator('level')
    @classmethod
    def validate_level(cls, v: str) -> str:
        """验证日志级别"""
        valid_levels = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}
        upper = v.upper()
        if upper not in valid_levels:
            raise ValueError(f"日志级别必须是 {valid_levels} 之一")
        return upper


class Settings(BaseSettings):
    """
    应用主配置类
    
    特性：
    1. 自动从环境变量与 .env 文件加载
    2. 类型验证（int/bool/str/嵌套）
    3. 字段约束（范围、长度）
    4. 自定义验证器
    5. SecretStr 保护敏感信息
    """
    # 应用基本配置
    app_name: str = Field(default='MyApp')
    app_env: str = Field(default='development')
    debug: bool = Field(default=False)
    
    # 服务器配置
    host: str = Field(default='0.0.0.0')
    port: int = Field(default=8000, ge=1, le=65535)
    
    # 敏感信息（使用 SecretStr 避免意外打印）
    secret_key: SecretStr = Field(default='change-me-in-production')
    
    # 嵌套配置
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    log: LogSettings = Field(default_factory=LogSettings)
    
    # 列表配置（逗号分隔）
    allowed_hosts: List[str] = Field(default=['localhost'])
    cors_origins: List[str] = Field(default=['*'])
    
    # 模型配置
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        env_nested_delimiter='__',
        case_sensitive=False,
        extra='ignore',  # 忽略未定义的字段
    )
    
    @field_validator('app_env')
    @classmethod
    def validate_env(cls, v: str) -> str:
        """验证环境标识"""
        valid_envs = {'development', 'staging', 'production', 'test'}
        if v not in valid_envs:
            raise ValueError(f"APP_ENV 必须是 {valid_envs} 之一")
        return v
    
    @model_validator(mode='after')
    def validate_production_security(self) -> 'Settings':
        """
        模型级验证：生产环境的安全检查
        
        生产环境必须：
        1. 关闭 debug
        2. secret_key 不能为默认值
        """
        if self.app_env == 'production':
            if self.debug:
                raise ValueError("生产环境必须关闭 debug 模式")
            if self.secret_key.get_secret_value() == 'change-me-in-production':
                raise ValueError("生产环境必须设置非默认的 secret_key")
        return self
    
    def is_production(self) -> bool:
        """是否为生产环境"""
        return self.app_env == 'production'
    
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.app_env == 'development'


@lru_cache()
def get_settings() -> Settings:
    """
    获取全局配置实例（单例）
    
    使用 lru_cache 确保全局只创建一个实例：
    1. 避免重复读取环境变量与文件
    2. 保证配置一致性
    3. 便于测试时通过 cache_clear 重置
    """
    return Settings()


# 使用示例
if __name__ == '__main__':
    settings = get_settings()
    
    print(f"应用名称: {settings.app_name}")
    print(f"环境: {settings.app_env}")
    print(f"调试: {settings.debug}")
    print(f"数据库 URL: {settings.database.url}")
    print(f"数据库连接池: {settings.database.pool_size}")
    print(f"Redis URL: {settings.redis.url}")
    print(f"日志级别: {settings.log.level}")
    print(f"允许的主机: {settings.allowed_hosts}")
    
    # 注意：SecretStr 不会直接显示明文
    print(f"密钥: {settings.secret_key}")  # SecretStr('**********')
    print(f"密钥明文: {settings.secret_key.get_secret_value()}")  # 显式获取
    
    # 序列化为字典
    config_dict = settings.model_dump()
    print(f"配置字典: {config_dict}")
    
    # 序列化为 JSON
    config_json = settings.model_dump_json(indent=2)
    print(f"配置 JSON:\n{config_json}")
```

### 5.4 使用 Dynaconf 实现多环境配置

```python
"""
Dynaconf 多环境配置示例

本模块演示：
1. Dynaconf 的基本配置
2. 多环境切换
3. 多源加载（YAML/TOML/.env）
4. 动态配置更新
5. 配置覆盖优先级
"""
from dynaconf import Dynaconf
from dynaconf import validators


# 创建 Dynaconf 配置实例
settings = Dynaconf(
    # 配置文件（按顺序加载，后面的覆盖前面的）
    settings_files=['config/default.yaml', 'config/default.toml'],
    
    # 环境特定配置文件
    environments=True,
    env_switcher='APP_ENV',  # 通过 APP_ENV 环境变量切换
    load_dotenv=True,  # 加载 .env 文件
    envvar_prefix='APP',  # 环境变量前缀 APP_*
    
    # 额外配置文件（可选）
    includes=['config/local.yaml'],  # 本地覆盖配置
    
    # 环境变量覆盖
    environments=True,
    
    # 高级特性
    merge_enabled=True,  # 嵌套字典合并而非覆盖
    fresh_vars=['TOKEN'],  # 这些变量每次访问时重新读取
)


# 添加验证器（确保必需配置存在）
settings.validators.register(
    validators.Validator('DATABASE_URL', must_exist=True, is_type_of=str),
    validators.Validator('PORT', must_exist=True, is_type_of=int, gte=1, lte=65535),
    validators.Validator('SECRET_KEY', must_exist=True, is_type_of=str, ne='change-me'),
    validators.Validator('APP_ENV', must_exist=True, is_in=['dev', 'staging', 'prod']),
)


# 验证配置
try:
    settings.validators.validate()
    print("配置验证通过")
except validators.ValidationError as e:
    print(f"配置验证失败: {e}")


# 使用配置
print(f"当前环境: {settings.current_env}")
print(f"数据库 URL: {settings.DATABASE_URL}")
print(f"端口: {settings.PORT}")


# 切换环境
settings.setenv('prod')
print(f"切换后环境: {settings.current_env}")
print(f"生产数据库 URL: {settings.DATABASE_URL}")


# 动态更新配置
settings.set('NEW_FEATURE_ENABLED', True, loader_identifier='runtime')
print(f"新功能启用: {settings.NEW_FEATURE_ENABLED}")


# 示例 config/default.yaml 内容：
"""
default:
  DATABASE_URL: sqlite:///default.db
  PORT: 8000
  DEBUG: true
  LOG_LEVEL: INFO
  
development:
  DATABASE_URL: sqlite:///dev.db
  DEBUG: true
  
production:
  DATABASE_URL: postgresql://user:pass@db:5432/prod
  DEBUG: false
  LOG_LEVEL: WARNING
"""


# 示例 config/default.toml 内容：
"""
[default]
database_url = "sqlite:///default.db"
port = 8000
debug = true

[default.database]
pool_size = 10
echo = false

[production]
database_url = "postgresql://prod-db:5432/myapp"
debug = false

[production.database]
pool_size = 50
echo = false
"""
```

### 5.5 多源配置合并与优先级

```python
"""
多源配置合并与优先级示例

本模块演示：
1. 从多个配置源加载配置
2. 按优先级合并配置
3. 命令行参数、环境变量、配置文件、默认值的协作
4. 配置覆盖链的可追溯性
"""
import os
import argparse
import json
import tomllib
from pathlib import Path
from typing import Any, Dict, Optional, List
from dataclasses import dataclass, field, asdict
from functools import lru_cache


@dataclass
class ConfigSource:
    """配置来源记录，用于审计与调试"""
    name: str
    priority: int  # 数值越大优先级越高
    values: Dict[str, Any]
    
    
def load_default_config() -> Dict[str, Any]:
    """
    加载默认配置（最低优先级）
    
    返回:
        默认配置字典
    """
    return {
        'app_name': 'MyApp',
        'app_env': 'development',
        'debug': False,
        'host': '0.0.0.0',
        'port': 8000,
        'database_url': 'sqlite:///default.db',
        'log_level': 'INFO',
    }


def load_config_file(file_path: str) -> Dict[str, Any]:
    """
    加载配置文件（支持 JSON/TOML）
    
    参数:
        file_path: 配置文件路径
    返回:
        配置字典
    """
    path = Path(file_path)
    if not path.exists():
        return {}
    
    suffix = path.suffix.lower()
    if suffix == '.json':
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    elif suffix == '.toml':
        with open(path, 'rb') as f:
            return tomllib.load(f)
    else:
        raise ValueError(f"不支持的配置文件格式: {suffix}")


def load_env_vars(prefix: str = '') -> Dict[str, Any]:
    """
    从环境变量加载配置
    
    参数:
        prefix: 环境变量前缀，如 'APP_'
    返回:
        配置字典
    """
    config = {}
    for key, value in os.environ.items():
        if prefix and not key.startswith(prefix):
            continue
        # 去除前缀并转为小写
        config_key = key[len(prefix):].lower() if prefix else key.lower()
        config[config_key] = value
    return config


def parse_cli_args() -> Dict[str, Any]:
    """
    解析命令行参数（最高优先级）
    
    返回:
        命令行参数字典
    """
    parser = argparse.ArgumentParser(description='MyApp')
    parser.add_argument('--host', type=str, help='服务器主机')
    parser.add_argument('--port', type=int, help='服务器端口')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    parser.add_argument('--config', type=str, help='配置文件路径')
    
    args = parser.parse_args()
    
    # 过滤未设置的参数（值为 None）
    return {k: v for k, v in asdict(args).items() if v is not None and k != 'config'}


def merge_configs(sources: List[ConfigSource]) -> tuple[Dict[str, Any], List[ConfigSource]]:
    """
    按优先级合并多个配置源
    
    参数:
        sources: 配置源列表（按优先级升序）
    返回:
        tuple(最终配置, 配置来源审计记录)
    """
    merged = {}
    audit_trail = {}  # 记录每个配置项的来源
    
    # 按优先级升序排序（低优先级先加载，高优先级后覆盖）
    sorted_sources = sorted(sources, key=lambda s: s.priority)
    
    for source in sorted_sources:
        for key, value in source.values.items():
            if value is not None:
                merged[key] = value
                audit_trail[key] = source.name
    
    # 生成审计记录
    audit_sources = [
        ConfigSource(name=k, priority=0, values={'source': v})
        for k, v in audit_trail.items()
    ]
    
    return merged, audit_sources


@lru_cache()
def load_config(config_file: Optional[str] = None) -> Dict[str, Any]:
    """
    加载完整配置（按优先级合并）
    
    优先级（从低到高）：
    1. 代码中的默认值（priority=0）
    2. 配置文件（priority=10）
    3. .env 文件（priority=20，需 python-dotenv）
    4. 环境变量（priority=30）
    5. 命令行参数（priority=40）
    
    参数:
        config_file: 配置文件路径（可选）
    返回:
        合并后的配置字典
    """
    # 从命令行参数获取配置文件路径
    cli_args_full = parse_cli_args()
    if not config_file:
        config_file = cli_args_full.get('config_file')
    
    sources = [
        ConfigSource(name='default', priority=0, values=load_default_config()),
        ConfigSource(
            name='config_file',
            priority=10,
            values=load_config_file(config_file) if config_file else {}
        ),
        ConfigSource(name='env_vars', priority=30, values=load_env_vars()),
        ConfigSource(name='cli_args', priority=40, values=cli_args_full),
    ]
    
    merged_config, audit = merge_configs(sources)
    
    # 类型转换
    if 'port' in merged_config:
        merged_config['port'] = int(merged_config['port'])
    if 'debug' in merged_config:
        merged_config['debug'] = str(merged_config['debug']).lower() in ('true', '1', 'yes')
    
    return merged_config


# 使用示例
if __name__ == '__main__':
    config = load_config()
    
    print("最终配置:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    print("\n配置来源审计:")
    for source in audit:
        print(f"  {source.name}: {source.values}")
```

### 5.6 动态配置与特性开关

```python
"""
动态配置与特性开关示例

本模块演示：
1. 基于 Redis 的动态配置存储
2. 特性开关（Feature Flag）实现
3. 配置热更新与订阅机制
4. 配置缓存与失效策略
"""
import json
import time
import threading
from typing import Any, Dict, Optional, Callable, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import redis


@dataclass
class FeatureFlag:
    """
    特性开关数据结构
    
    属性:
        name: 开关名称
        enabled: 是否启用
        description: 描述
        target_users: 目标用户列表（空列表表示对所有用户生效）
        percentage: 灰度百分比（0-100）
        expires_at: 过期时间（None 表示永不过期）
    """
    name: str
    enabled: bool = False
    description: str = ''
    target_users: List[str] = field(default_factory=list)
    percentage: int = 100
    expires_at: Optional[datetime] = None
    
    def is_enabled_for(self, user_id: str) -> bool:
        """
        判断特性是否对指定用户启用
        
        参数:
            user_id: 用户 ID
        返回:
            是否启用
        """
        # 全局关闭
        if not self.enabled:
            return False
        # 过期检查
        if self.expires_at and datetime.now() > self.expires_at:
            return False
        # 目标用户检查
        if self.target_users and user_id not in self.target_users:
            return False
        # 灰度百分比检查
        if self.percentage < 100:
            # 基于用户 ID 的哈希实现稳定灰度
            hash_value = hash(user_id) % 100
            return hash_value < self.percentage
        return True


class DynamicConfigManager:
    """
    动态配置管理器
    
    特性：
    1. 基于 Redis 存储配置，支持多实例共享
    2. 发布订阅机制实现配置热更新
    3. 本地缓存减少 Redis 访问
    4. 配置变更回调
    """
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0', cache_ttl: int = 60):
        """
        初始化动态配置管理器
        
        参数:
            redis_url: Redis 连接地址
            cache_ttl: 本地缓存 TTL（秒）
        """
        self.redis = redis.from_url(redis_url)
        self.cache_ttl = cache_ttl
        # 本地缓存：{key: (value, expire_at)}
        self._cache: Dict[str, tuple[Any, float]] = {}
        # 配置变更回调列表
        self._callbacks: List[Callable[[str, Any], None]] = []
        # 配置变更订阅线程
        self._pubsub_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
    
    def _make_key(self, key: str) -> str:
        """构建 Redis 键名"""
        return f'config:{key}'
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        获取配置值
        
        参数:
            key: 配置键
            default: 默认值
        返回:
            配置值
        """
        # 检查本地缓存
        if key in self._cache:
            value, expire_at = self._cache[key]
            if time.time() < expire_at:
                return value
            else:
                del self._cache[key]
        
        # 从 Redis 读取
        redis_value = self.redis.get(self._make_key(key))
        if redis_value is None:
            return default
        
        try:
            value = json.loads(redis_value)
        except json.JSONDecodeError:
            value = redis_value.decode('utf-8')
        
        # 更新本地缓存
        self._cache[key] = (value, time.time() + self.cache_ttl)
        return value
    
    def set(self, key: str, value: Any, publish: bool = True) -> None:
        """
        设置配置值
        
        参数:
            key: 配置键
            value: 配置值
            publish: 是否发布变更通知
        """
        # 序列化并存储到 Redis
        if isinstance(value, (str, int, float, bool, list, dict)):
            redis_value = json.dumps(value)
        else:
            redis_value = str(value)
        
        self.redis.set(self._make_key(key), redis_value)
        
        # 更新本地缓存
        self._cache[key] = (value, time.time() + self.cache_ttl)
        
        # 发布变更通知
        if publish:
            self.redis.publish('config_changes', json.dumps({'key': key, 'value': value}))
    
    def get_feature_flag(self, name: str) -> FeatureFlag:
        """
        获取特性开关
        
        参数:
            name: 开关名称
        返回:
            FeatureFlag 对象
        """
        data = self.get(f'feature:{name}')
        if data is None:
            return FeatureFlag(name=name, enabled=False)
        
        # 解析过期时间
        if 'expires_at' in data and data['expires_at']:
            data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        
        return FeatureFlag(**data)
    
    def set_feature_flag(self, flag: FeatureFlag) -> None:
        """
        设置特性开关
        
        参数:
            flag: 特性开关对象
        """
        data = {
            'name': flag.name,
            'enabled': flag.enabled,
            'description': flag.description,
            'target_users': flag.target_users,
            'percentage': flag.percentage,
        }
        if flag.expires_at:
            data['expires_at'] = flag.expires_at.isoformat()
        
        self.set(f'feature:{flag.name}', data)
    
    def on_change(self, callback: Callable[[str, Any], None]) -> None:
        """
        注册配置变更回调
        
        参数:
            callback: 回调函数，接收 (key, value) 参数
        """
        self._callbacks.append(callback)
    
    def start_listening(self) -> None:
        """启动配置变更订阅（后台线程）"""
        if self._pubsub_thread and self._pubsub_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._pubsub_thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._pubsub_thread.start()
    
    def _listen_loop(self) -> None:
        """订阅循环"""
        pubsub = self.redis.pubsub()
        pubsub.subscribe('config_changes')
        
        while not self._stop_event.is_set():
            message = pubsub.get_message(timeout=1.0)
            if message and message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    key = data['key']
                    value = data['value']
                    
                    # 更新本地缓存
                    self._cache[key] = (value, time.time() + self.cache_ttl)
                    
                    # 调用回调
                    for callback in self._callbacks:
                        try:
                            callback(key, value)
                        except Exception as e:
                            print(f"配置变更回调异常: {e}")
                except Exception as e:
                    print(f"处理配置变更消息异常: {e}")
    
    def stop_listening(self) -> None:
        """停止订阅"""
        self._stop_event.set()
        if self._pubsub_thread:
            self._pubsub_thread.join(timeout=5)


# 使用示例
if __name__ == '__main__':
    # 初始化动态配置管理器
    manager = DynamicConfigManager(redis_url='redis://localhost:6379/0')
    
    # 设置特性开关
    flag = FeatureFlag(
        name='new_dashboard',
        enabled=True,
        description='新版仪表盘',
        percentage=20,  # 20% 用户启用
    )
    manager.set_feature_flag(flag)
    
    # 检查特性是否对用户启用
    user_id = 'user_123'
    if manager.get_feature_flag('new_dashboard').is_enabled_for(user_id):
        print(f"用户 {user_id} 启用新版仪表盘")
    else:
        print(f"用户 {user_id} 使用旧版仪表盘")
    
    # 注册配置变更回调
    def on_config_change(key: str, value: Any) -> None:
        print(f"配置变更: {key} = {value}")
    
    manager.on_change(on_config_change)
    manager.start_listening()
    
    # 模拟配置更新
    manager.set('maintenance_mode', True)
    
    # 等待订阅通知
    time.sleep(2)
    
    manager.stop_listening()
```

### 5.7 Kubernetes ConfigMap 与 Secret 集成

```python
"""
Kubernetes ConfigMap 与 Secret 集成示例

本模块演示：
1. 从 Kubernetes ConfigMap 读取配置
2. 从 Kubernetes Secret 读取密钥
3. 挂载卷方式的配置加载
4. 配置热更新（基于挂载卷的自动刷新）
"""
import os
import json
from pathlib import Path
from typing import Any, Dict, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr


class K8sSettings(BaseSettings):
    """
    Kubernetes 部署的应用配置
    
    在 K8s 中，ConfigMap 和 Secret 通常以两种方式注入：
    1. 环境变量（通过 envFrom 或 env）
    2. 挂载卷（文件形式）
    
    本示例演示从挂载卷读取配置
    """
    # 挂载路径（K8s volumeMounts 配置）
    config_mount_path: str = '/etc/app/config'
    secret_mount_path: str = '/etc/app/secret'
    
    # 应用配置（从环境变量或 .env 加载）
    app_name: str = Field(default='MyApp')
    app_env: str = Field(default='development')
    
    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=False,
        extra='ignore',
    )
    
    def load_configmap(self) -> Dict[str, Any]:
        """
        从 ConfigMap 挂载卷读取配置
        
        ConfigMap 挂载后，每个 key 对应一个文件，
        文件名是 key，文件内容是 value。
        
        返回:
            配置字典
        """
        config = {}
        path = Path(self.config_mount_path)
        
        if not path.exists():
            return config
        
        for file_path in path.iterdir():
            if file_path.is_file():
                key = file_path.name.upper()
                value = file_path.read_text(encoding='utf-8').strip()
                config[key] = value
        
        return config
    
    def load_secret(self) -> Dict[str, str]:
        """
        从 Secret 挂载卷读取密钥
        
        Secret 挂载后，每个 key 对应一个文件，
        文件内容是 base64 解码后的明文。
        
        返回:
            密钥字典
        """
        secrets = {}
        path = Path(self.secret_mount_path)
        
        if not path.exists():
            return secrets
        
        for file_path in path.iterdir():
            if file_path.is_file():
                key = file_path.name.upper()
                value = file_path.read_text(encoding='utf-8').strip()
                secrets[key] = value
        
        return secrets


# K8s 部署 YAML 示例（configmap.yaml）
K8S_CONFIGMAP_YAML = """\
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  APP_NAME: "MyApp"
  APP_ENV: "production"
  DATABASE_URL: "postgresql://db:5432/myapp"
  REDIS_URL: "redis://redis:6379/0"
  LOG_LEVEL: "INFO"
"""

# K8s Secret YAML 示例（secret.yaml）
K8S_SECRET_YAML = """\
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
  namespace: default
type: Opaque
stringData:
  SECRET_KEY: "my-super-secret-key"
  DATABASE_PASSWORD: "db-password-123"
  API_KEY: "api-key-xyz"
"""

# K8s Deployment YAML 示例（deployment.yaml）
K8S_DEPLOYMENT_YAML = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secret
        volumeMounts:
        - name: config-volume
          mountPath: /etc/app/config
          readOnly: true
        - name: secret-volume
          mountPath: /etc/app/secret
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: app-config
      - name: secret-volume
        secret:
          secretName: app-secret
"""


def watch_configmap_changes(callback) -> None:
    """
    监听 ConfigMap 挂载卷的变更（基于 inotify）
    
    K8s 会自动更新挂载卷的内容（默认 60-90 秒），
    通过监听文件变更可以实现配置热更新。
    
    参数:
        callback: 配置变更回调函数
    """
    import inotify.adapters
    
    config_path = '/etc/app/config'
    
    i = inotify.adapters.Inotify()
    i.add_watch(config_path)
    
    for event in i.event_gen(yield_nones=False):
        (_, type_names, path, filename) = event
        if 'IN_MODIFY' in type_names or 'IN_CREATE' in type_names:
            print(f"配置文件变更: {filename}")
            callback(filename)


if __name__ == '__main__':
    settings = K8sSettings()
    
    # 加载 ConfigMap
    config = settings.load_configmap()
    print("ConfigMap 配置:")
    for k, v in config.items():
        print(f"  {k}: {v}")
    
    # 加载 Secret
    secrets = settings.load_secret()
    print("\nSecret 密钥（仅显示键名）:")
    for k in secrets:
        print(f"  {k}: ***")
```

### 5.8 密钥管理与日志脱敏

```python
"""
密钥管理与日志脱敏示例

本模块演示：
1. 敏感字段的标记与识别
2. 日志输出的自动脱敏
3. 配置打印的安全模式
4. 密钥轮转支持
"""
import re
import logging
from typing import Any, Dict, List, Set, Optional
from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings


# 敏感字段名模式（大小写不敏感）
SENSITIVE_PATTERNS = [
    r'password',
    r'secret',
    r'api[_-]?key',
    r'token',
    r'credential',
    r'private[_-]?key',
    r'access[_-]?key',
    r'secret[_-]?key',
    r'auth',
]

# 编译正则
SENSITIVE_REGEX = re.compile('|'.join(SENSITIVE_PATTERNS), re.IGNORECASE)


def is_sensitive_key(key: str) -> bool:
    """
    判断键名是否敏感
    
    参数:
        key: 键名
    返回:
        是否敏感
    """
    return bool(SENSITIVE_REGEX.search(key))


def mask_value(value: Any, mask_char: str = '*', visible_chars: int = 4) -> str:
    """
    脱敏处理
    
    参数:
        value: 原始值
        mask_char: 脱敏字符
        visible_chars: 保留可见字符数（从尾部）
    返回:
        脱敏后的字符串
    """
    if value is None:
        return 'None'
    s = str(value)
    if len(s) <= visible_chars:
        return mask_char * len(s)
    return mask_char * (len(s) - visible_chars) + s[-visible_chars:]


def safe_dump_config(config: Dict[str, Any], sensitive_keys: Optional[Set[str]] = None) -> Dict[str, Any]:
    """
    安全导出配置（敏感字段脱敏）
    
    参数:
        config: 原始配置字典
        sensitive_keys: 显式指定的敏感键集合
    返回:
        脱敏后的配置字典
    """
    sensitive_keys = sensitive_keys or set()
    safe = {}
    
    for key, value in config.items():
        if is_sensitive_key(key) or key in sensitive_keys:
            safe[key] = mask_value(value)
        elif isinstance(value, dict):
            safe[key] = safe_dump_config(value, sensitive_keys)
        else:
            safe[key] = value
    
    return safe


class SensitiveFilter(logging.Filter):
    """
    日志过滤器：自动脱敏敏感信息
    
    用法：
        logging.getLogger().addFilter(SensitiveFilter())
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """过滤日志记录，脱敏敏感信息"""
        if isinstance(record.msg, str):
            # 替换形如 key=value 的敏感字段
            record.msg = re.sub(
                r'(\w+(?:password|secret|key|token|credential)\w*)=(\S+)',
                lambda m: f"{m.group(1)}={mask_value(m.group(2))}",
                record.msg,
                flags=re.IGNORECASE
            )
        return True


class SecureSettings(BaseSettings):
    """
    安全配置类
    
    特性：
    1. 使用 SecretStr 保护敏感字段
    2. 提供 safe_dump 方法输出脱敏配置
    3. 集成日志过滤器
    """
    
    # 普通字段
    app_name: str = Field(default='MyApp')
    app_env: str = Field(default='development')
    debug: bool = Field(default=False)
    
    # 敏感字段（使用 SecretStr）
    secret_key: SecretStr = Field(default='change-me')
    database_password: SecretStr = Field(default='')
    api_key: SecretStr = Field(default='')
    jwt_secret: SecretStr = Field(default='')
    
    # 数据库 URL（包含密码，需要脱敏）
    database_url: str = Field(default='sqlite:///default.db')
    
    model_config = {'env_file': '.env', 'case_sensitive': False}
    
    def safe_dump(self) -> Dict[str, Any]:
        """
        安全导出配置（敏感字段脱敏）
        
        返回:
            脱敏后的配置字典
        """
        config = self.model_dump()
        safe = {}
        
        for key, value in config.items():
            # SecretStr 类型的字段直接脱敏
            if isinstance(value, SecretStr):
                safe[key] = mask_value(value.get_secret_value())
            # database_url 包含密码，需要脱敏
            elif key == 'database_url' and '://' in str(value):
                safe[key] = re.sub(
                    r'://([^:]+):([^@]+)@',
                    lambda m: f"://{m.group(1)}:{mask_value(m.group(2))}@",
                    str(value)
                )
            else:
                safe[key] = value
        
        return safe


# 使用示例
if __name__ == '__main__':
    # 配置日志脱敏
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.addFilter(SensitiveFilter())
    
    # 创建配置
    settings = SecureSettings(
        secret_key='super-secret-key-123',
        database_password='my-db-password',
        api_key='sk-1234567890',
        database_url='postgresql://user:password123@db:5432/myapp'
    )
    
    # 安全打印配置
    print("安全配置输出:")
    for k, v in settings.safe_dump().items():
        print(f"  {k}: {v}")
    
    # 日志中的敏感信息会被自动脱敏
    logger.info(f"连接数据库: database_url=postgresql://user:password123@db:5432/myapp")
    logger.info(f"使用 API Key: api_key=sk-1234567890")
```

## 6. 对比分析

### 6.1 配置管理库对比

| 特性 | python-dotenv | Pydantic Settings | Dynaconf | configparser | os.getenv |
|------|---------------|-------------------|----------|--------------|-----------|
| 类型验证 | 无 | 强（基于类型注解） | 弱（手动转换） | 无 | 无 |
| 配置文件 | .env | .env + 多格式 | YAML/TOML/JSON/.env | INI | 无 |
| 多环境支持 | 无 | 通过多 .env 文件 | 原生支持 | 无 | 无 |
| 动态配置 | 无 | 无 | 部分支持 | 无 | 无 |
| 嵌套配置 | 无 | 支持 | 支持 | 无 | 无 |
| 密钥保护 | 无 | SecretStr | 无 | 无 | 无 |
| 学习成本 | 极低 | 低 | 中等 | 低 | 极低 |
| 与框架集成 | 通用 | FastAPI/Starlette 原生 | 通用 | 通用 | 通用 |
| Python 版本 | 3.6+ | 3.8+（Pydantic v2） | 3.6+ | 内置 | 内置 |
| 适用场景 | 简单 .env 加载 | 现代 Web 应用 | 复杂多环境 | 传统 INI 配置 | 极简场景 |

### 6.2 配置文件格式对比

| 格式 | 注释 | 嵌套 | 类型 | 引用 | Python 内置 | 人类友好 | 适用场景 |
|------|------|------|------|------|-------------|----------|----------|
| .env | 是（#） | 否 | 字符串 | 否 | 否（需 python-dotenv） | 高 | 环境变量 |
| INI | 是（;） | 部分（section） | 字符串 | 否 | configparser | 中 | 简单配置 |
| JSON | 否 | 是 | 丰富 | 否 | json | 低 | API/数据交换 |
| YAML | 是（#） | 是 | 丰富 | 是 | 否（需 PyYAML） | 高 | 复杂配置 |
| TOML | 是（#） | 是 | 丰富 | 否 | tomllib（3.11+） | 高 | Python 项目配置 |
| HOCON | 是（#） | 是 | 丰富 | 是 | 否 | 高 | Akka/Play |

### 6.3 配置源方案对比

| 方案 | 部署复杂度 | 运维成本 | 性能 | 一致性 | 热更新 | 适用场景 |
|------|------------|----------|------|--------|--------|----------|
| 本地配置文件 | 低 | 低 | 极高 | 强 | 需重启 | 单机应用 |
| 环境变量 | 低 | 低 | 极高 | 强 | 需重启 | 容器化应用 |
| .env 文件 | 低 | 低 | 极高 | 强 | 需重启 | 开发环境 |
| Kubernetes ConfigMap | 中 | 中 | 高 | 强 | 自动（60s） | K8s 集群 |
| Redis 配置中心 | 中 | 中 | 高 | 中 | 实时 | 中小规模分布式 |
| Apollo/Nacos | 高 | 高 | 高 | 强 | 实时 | 大规模微服务 |
| etcd/Consul | 高 | 高 | 高 | 强 | 实时 | 云原生基础设施 |
| AWS Parameter Store | 低 | 低 | 中 | 强 | 实时 | AWS 生态 |
| HashiCorp Vault | 高 | 高 | 中 | 强 | 实时 | 密钥管理 |

### 6.4 Pydantic Settings vs Dynaconf 架构对比

| 维度 | Pydantic Settings | Dynaconf |
|------|-------------------|----------|
| 设计哲学 | 类型驱动、声明式 | 多源驱动、命令式 |
| 类型系统 | Pydantic 强类型 | 字符串为主，需手动转换 |
| 验证机制 | Pydantic 验证器 | Validator 类 |
| 多环境 | 通过多 .env 文件 | 原生 `env_switcher` |
| 动态加载 | 不支持 | 部分支持 |
| 远程配置 | 不支持 | 支持 Redis/Vault |
| 学习曲线 | 低（Pydantic 用户） | 中等 |
| 社区活跃度 | 高（FastAPI 生态） | 中等 |
| 文档质量 | 高 | 中等 |
| 性能 | 高（编译期校验） | 中等（运行时查找） |

## 7. 常见陷阱与反模式

### 7.1 反模式：硬编码敏感信息

**问题描述**：将数据库密码、API 密钥等敏感信息直接硬编码在代码中。

**错误示例**：

```python
# 反模式：硬编码密码
DATABASE_URL = "postgresql://user:password123@localhost:5432/mydb"
API_KEY = "sk-1234567890abcdef"
SECRET_KEY = "my-super-secret-key"
```

**生产事故案例**：2023 年某公司员工将包含 AWS Access Key 的代码提交到 GitHub 公开仓库，攻击者在一夜之间创建了数千个 EC2 实例挖矿，造成数十万美元损失。

**正确做法**：

```python
import os
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    database_url: str  # 必须从环境变量读取
    api_key: SecretStr  # 敏感字段使用 SecretStr
    secret_key: SecretStr
    
    model_config = {'env_file': '.env'}

settings = Settings()
```

同时在 `.gitignore` 中排除 `.env`：

```
.env
.env.*
!.env.example
```

### 7.2 反模式：.env 文件提交到版本控制

**问题描述**：将包含真实密钥的 `.env` 文件提交到 Git。

**生产事故案例**：2022 年某创业公司将 `.env` 文件提交到 Git 仓库，包含 Stripe Secret Key、Twilio Auth Token、数据库密码等。仓库公开后，攻击者使用这些凭证发起支付欺诈，公司损失 50 万美元。

**正确做法**：

- 使用 `.gitignore` 排除 `.env`。
- 提供 `.env.example` 作为模板（仅含变量名，不含真实值）。
- 使用 `git-secrets` 或 `truffleHog` 等工具在提交前扫描密钥。
- 如果已经提交，立即轮转所有密钥，并使用 `git filter-branch` 或 BFG Repo-Cleaner 清理历史。

### 7.3 反模式：环境变量类型混淆

**问题描述**：环境变量始终是字符串类型，直接使用而不转换可能导致逻辑错误。

**错误示例**：

```python
# 反模式：直接使用环境变量字符串
port = os.getenv('PORT')  # 返回字符串 "8000"
if port > 8000:  # 字符串与整数比较，Python 3 抛出 TypeError
    ...
    
debug = os.getenv('DEBUG')  # 返回字符串 "true"
if debug:  # 任何非空字符串都为 True，包括 "false"
    ...
```

**正确做法**：

```python
# 显式类型转换
port = int(os.getenv('PORT', '8000'))

# 布尔值需要特殊处理
debug_str = os.getenv('DEBUG', 'false').lower()
debug = debug_str in ('true', '1', 'yes', 'on')

# 或使用 Pydantic Settings 自动转换
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    port: int = 8000
    debug: bool = False
```

### 7.4 反模式：配置优先级混乱

**问题描述**：多个配置源优先级不明确，导致实际加载的配置与预期不符。

**错误示例**：

```python
# 反模式：优先级不明确
load_dotenv(override=True)  # .env 覆盖环境变量
port = os.getenv('PORT', '8000')  # 但环境变量已被 .env 覆盖
```

**生产事故案例**：某团队在 `.env` 文件中设置 `DEBUG=true`，`load_dotenv(override=True)` 覆盖了生产环境通过环境变量设置的 `DEBUG=false`，导致生产环境开启调试模式，泄漏了敏感错误信息。

**正确做法**：

```python
# 明确优先级：环境变量 > .env 文件 > 默认值
load_dotenv(override=False)  # 不覆盖已存在的环境变量
port = int(os.getenv('PORT', '8000'))
```

### 7.5 反模式：配置加载时副作用

**问题描述**：在配置加载过程中执行副作用操作（如连接数据库、发送请求），导致测试困难与启动缓慢。

**错误示例**：

```python
# 反模式：配置加载时连接数据库
class Settings(BaseSettings):
    database_url: str
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 配置加载时立即连接数据库（反模式）
        self.db = psycopg2.connect(self.database_url)

settings = Settings()  # 导入模块时就会连接数据库
```

**正确做法**：

```python
# 配置加载与资源初始化分离
class Settings(BaseSettings):
    database_url: str

# 全局配置实例（不包含资源）
settings = Settings()

# 在应用启动时初始化资源
def get_db():
    """获取数据库连接（依赖注入）"""
    return psycopg2.connect(settings.database_url)
```

### 7.6 反模式：全局可变配置

**问题描述**：使用全局可变对象存储配置，运行时被意外修改导致不一致。

**错误示例**：

```python
# 反模式：全局可变配置
config = {}

def load_config():
    config['debug'] = True
    config['port'] = 8000

# 某处代码意外修改了配置
config['debug'] = False  # 全局被修改，其他模块受影响
```

**正确做法**：

```python
from dataclasses import dataclass
from functools import lru_cache

@dataclass(frozen=True)  # 不可变配置
class Settings:
    debug: bool
    port: int

@lru_cache()
def get_settings() -> Settings:
    """全局只读配置（frozen dataclass 不可修改）"""
    return Settings(
        debug=os.getenv('DEBUG', 'false').lower() == 'true',
        port=int(os.getenv('PORT', '8000'))
    )

# 试图修改会抛出 FrozenInstanceError
# settings.debug = False  # 异常
```

### 7.7 反模式：配置未校验

**问题描述**：从环境变量读取配置后直接使用，未校验合法性，导致运行时错误。

**错误示例**：

```python
# 反模式：未校验配置
port = int(os.getenv('PORT', '8000'))  # 可能是 -1、0、99999
log_level = os.getenv('LOG_LEVEL', 'INFO')  # 可能是 'VERBOSE'
```

**生产事故案例**：某应用从环境变量读取 `MAX_CONNECTIONS=1000000`，未校验范围，导致数据库连接池耗尽，整个数据库服务崩溃。

**正确做法**：

```python
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    port: int = Field(default=8000, ge=1, le=65535)
    max_connections: int = Field(default=10, ge=1, le=100)
    log_level: str = Field(default='INFO')
    
    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}
        if v.upper() not in valid:
            raise ValueError(f"log_level 必须是 {valid} 之一")
        return v.upper()
```

### 7.8 反模式：密钥打印到日志

**问题描述**：应用启动时打印配置，密钥进入日志文件。

**错误示例**：

```python
# 反模式：打印所有配置（包含密钥）
import logging
logger = logging.getLogger(__name__)

logger.info(f"启动配置: {settings.model_dump()}")
# 日志中会包含 secret_key、database_password 等敏感信息
```

**正确做法**：

```python
# 使用安全导出方法（脱敏）
logger.info(f"启动配置: {settings.safe_dump()}")

# 或只打印非敏感字段
logger.info(f"应用环境: {settings.app_env}")
logger.info(f"端口: {settings.port}")
logger.info(f"调试模式: {settings.debug}")
```

## 8. 工程实践

### 8.1 配置分层架构

生产级应用的配置架构通常分为以下层次：

```python
"""
配置分层架构示例

分层原则：
1. 默认层（default）：代码中定义的合理默认值
2. 文件层（file）：环境特定的配置文件
3. 环境变量层（env）：容器化部署时注入
4. 命令行层（cli）：临时覆盖
"""
from typing import Dict, Any
from dataclasses import dataclass, field
from functools import lru_cache
import os
import json
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    """应用配置（不可变，线程安全）"""
    # 应用元信息
    app_name: str = 'MyApp'
    app_version: str = '1.0.0'
    app_env: str = 'development'
    
    # 服务器配置
    host: str = '0.0.0.0'
    port: int = 8000
    workers: int = 4
    
    # 数据库配置
    database_url: str = 'sqlite:///default.db'
    database_pool_size: int = 10
    database_echo: bool = False
    
    # Redis 配置
    redis_url: str = 'redis://localhost:6379/0'
    
    # 日志配置
    log_level: str = 'INFO'
    log_file: str = ''
    
    # 安全配置
    secret_key: str = 'change-me'
    jwt_algorithm: str = 'HS256'
    jwt_expire_minutes: int = 30


def load_layered_config() -> AppConfig:
    """
    分层加载配置
    
    优先级（从低到高）：
    1. AppConfig 默认值
    2. config/{env}.json 配置文件
    3. 环境变量（APP_ 前缀）
    4. 命令行参数
    """
    config_dict = {}
    
    # 层 1：默认值（由 dataclass 提供）
    
    # 层 2：配置文件
    env = os.getenv('APP_ENV', 'development')
    config_file = Path(f'config/{env}.json')
    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            config_dict.update(json.load(f))
    
    # 层 3：环境变量（APP_ 前缀）
    for key, value in os.environ.items():
        if key.startswith('APP_'):
            config_key = key[4:].lower()  # APP_PORT -> port
            config_dict[config_key] = value
    
    # 层 4：命令行参数（简化示例）
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int)
    parser.add_argument('--workers', type=int)
    args = parser.parse_args()
    if args.port:
        config_dict['port'] = args.port
    if args.workers:
        config_dict['workers'] = args.workers
    
    # 类型转换与构造
    return AppConfig(
        app_name=config_dict.get('app_name', 'MyApp'),
        app_env=config_dict.get('app_env', 'development'),
        host=config_dict.get('host', '0.0.0.0'),
        port=int(config_dict.get('port', 8000)),
        workers=int(config_dict.get('workers', 4)),
        database_url=config_dict.get('database_url', 'sqlite:///default.db'),
        database_pool_size=int(config_dict.get('database_pool_size', 10)),
        database_echo=str(config_dict.get('database_echo', 'false')).lower() == 'true',
        redis_url=config_dict.get('redis_url', 'redis://localhost:6379/0'),
        log_level=config_dict.get('log_level', 'INFO'),
        log_file=config_dict.get('log_file', ''),
        secret_key=config_dict.get('secret_key', 'change-me'),
        jwt_algorithm=config_dict.get('jwt_algorithm', 'HS256'),
        jwt_expire_minutes=int(config_dict.get('jwt_expire_minutes', 30)),
    )


@lru_cache()
def get_config() -> AppConfig:
    """获取全局配置实例（单例）"""
    return load_layered_config()
```

### 8.2 配置测试策略

```python
"""
配置测试策略示例

测试要点：
1. 默认值测试
2. 环境变量覆盖测试
3. 类型验证测试
4. 必需字段缺失测试
5. 边界值测试
"""
import pytest
import os
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class TestSettings(BaseSettings):
    """测试用配置类"""
    app_name: str = 'TestApp'
    port: int = 8000
    debug: bool = False
    database_url: str = 'sqlite:///test.db'
    
    model_config = SettingsConfigDict(env_prefix='TEST_', case_sensitive=False)


class TestConfigDefaults:
    """默认值测试"""
    
    def test_default_values(self, monkeypatch):
        """测试默认值"""
        # 清除所有 TEST_ 前缀的环境变量
        for key in list(os.environ.keys()):
            if key.startswith('TEST_'):
                monkeypatch.delenv(key)
        
        settings = TestSettings()
        assert settings.app_name == 'TestApp'
        assert settings.port == 8000
        assert settings.debug is False
        assert settings.database_url == 'sqlite:///test.db'


class TestConfigEnvOverride:
    """环境变量覆盖测试"""
    
    def test_env_override(self, monkeypatch):
        """测试环境变量覆盖默认值"""
        monkeypatch.setenv('TEST_APP_NAME', 'ProductionApp')
        monkeypatch.setenv('TEST_PORT', '9000')
        monkeypatch.setenv('TEST_DEBUG', 'true')
        
        settings = TestSettings()
        assert settings.app_name == 'ProductionApp'
        assert settings.port == 9000
        assert settings.debug is True
    
    def test_env_type_conversion(self, monkeypatch):
        """测试环境变量类型转换"""
        monkeypatch.setenv('TEST_PORT', '12345')
        settings = TestSettings()
        assert settings.port == 12345
        assert isinstance(settings.port, int)
    
    def test_env_bool_conversion(self, monkeypatch):
        """测试布尔值转换"""
        for true_value in ['true', '1', 'yes', 'on']:
            monkeypatch.setenv('TEST_DEBUG', true_value)
            assert TestSettings().debug is True
        
        for false_value in ['false', '0', 'no', 'off']:
            monkeypatch.setenv('TEST_DEBUG', false_value)
            assert TestSettings().debug is False


class TestConfigValidation:
    """配置验证测试"""
    
    def test_invalid_port_type(self, monkeypatch):
        """测试无效端口类型"""
        monkeypatch.setenv('TEST_PORT', 'not-a-number')
        with pytest.raises(ValidationError):
            TestSettings()
    
    def test_invalid_bool_value(self, monkeypatch):
        """测试无效布尔值"""
        monkeypatch.setenv('TEST_DEBUG', 'maybe')
        with pytest.raises(ValidationError):
            TestSettings()


# pytest fixture：配置测试环境
@pytest.fixture
def clean_env(monkeypatch):
    """清除所有测试环境变量"""
    for key in list(os.environ.keys()):
        if key.startswith('TEST_'):
            monkeypatch.delenv(key)
    return monkeypatch


@pytest.fixture
def prod_env(monkeypatch):
    """设置生产环境变量"""
    monkeypatch.setenv('TEST_APP_NAME', 'ProdApp')
    monkeypatch.setenv('TEST_PORT', '80')
    monkeypatch.setenv('TEST_DEBUG', 'false')
    return monkeypatch
```

### 8.3 配置文档与 .env.example

```python
"""
配置文档与 .env.example 生成示例

最佳实践：
1. 提供 .env.example 作为配置模板
2. 每个配置项包含注释说明
3. 标注必需/可选、默认值、取值范围
4. 敏感字段使用占位符
"""

# .env.example 文件内容示例
ENV_EXAMPLE = """\
# ===========================================
# MyApp 配置文件模板
# ===========================================
# 复制此文件为 .env 并填写实际值
# 命令: cp .env.example .env

# -------------------------------------------
# 应用基本配置
# -------------------------------------------
# 应用名称（可选，默认: MyApp）
APP_NAME=MyApp

# 运行环境（必需，可选值: development, staging, production, test）
APP_ENV=development

# 调试模式（可选，默认: false，生产环境必须为 false）
DEBUG=false

# -------------------------------------------
# 服务器配置
# -------------------------------------------
# 监听主机（可选，默认: 0.0.0.0）
HOST=0.0.0.0

# 监听端口（可选，默认: 8000，范围: 1-65535）
PORT=8000

# Worker 进程数（可选，默认: 4）
WORKERS=4

# -------------------------------------------
# 数据库配置
# -------------------------------------------
# 数据库连接 URL（必需）
# 格式: postgresql://user:password@host:port/dbname
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# 连接池大小（可选，默认: 10，范围: 1-100）
DATABASE_POOL_SIZE=10

# SQL 日志（可选，默认: false）
DATABASE_ECHO=false

# -------------------------------------------
# Redis 配置
# -------------------------------------------
# Redis 连接 URL（可选，默认: redis://localhost:6379/0）
REDIS_URL=redis://localhost:6379/0

# -------------------------------------------
# 日志配置
# -------------------------------------------
# 日志级别（可选，默认: INFO，可选值: DEBUG, INFO, WARNING, ERROR, CRITICAL）
LOG_LEVEL=INFO

# 日志文件路径（可选，默认: 空，即只输出到控制台）
LOG_FILE=

# -------------------------------------------
# 安全配置（生产环境必需）
# -------------------------------------------
# 应用密钥（必需，生产环境必须设置非默认值）
# 生成命令: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=change-me-in-production

# JWT 算法（可选，默认: HS256）
JWT_ALGORITHM=HS256

# JWT 过期时间（分钟，可选，默认: 30）
JWT_EXPIRE_MINUTES=30

# -------------------------------------------
# 第三方服务配置
# -------------------------------------------
# Stripe API Key（可选，仅支付功能需要）
STRIPE_API_KEY=sk_test_xxxxxxxxxxxxx

# SendGrid API Key（可选，仅邮件功能需要）
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# -------------------------------------------
# 监控配置
# -------------------------------------------
# Sentry DSN（可选，用于错误监控）
SENTRY_DSN=

# Prometheus 指标端口（可选，默认: 9090）
METRICS_PORT=9090
"""


def generate_env_example(settings_class) -> str:
    """
    根据 Pydantic Settings 类生成 .env.example
    
    参数:
        settings_class: Pydantic Settings 类
    返回:
        .env.example 文件内容
    """
    lines = ["# 自动生成的配置模板", ""]
    
    for field_name, field_info in settings_class.model_fields.items():
        # 跳过嵌套配置
        if hasattr(field_info, 'default_factory') and field_info.default_factory:
            continue
        
        # 字段描述
        description = field_info.description or "无描述"
        default = field_info.default if field_info.default is not None else "必填"
        
        lines.append(f"# {description}")
        lines.append(f"# 默认值: {default}")
        lines.append(f"{field_name.upper()}={default if default != '必填' else ''}")
        lines.append("")
    
    return "\n".join(lines)


if __name__ == '__main__':
    # 生成 .env.example
    print(ENV_EXAMPLE)
```

### 8.4 性能优化：配置缓存

```python
"""
配置缓存性能优化示例

优化策略：
1. 使用 lru_cache 缓存配置实例
2. 避免频繁的属性访问
3. 批量读取配置项
"""
import time
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = 'sqlite:///default.db'
    redis_url: str = 'redis://localhost:6379/0'
    # ... 更多配置


# 反模式：每次调用都创建新实例
def get_config_bad():
    """每次都创建新实例（性能差）"""
    return Settings()


# 正确模式：使用 lru_cache 缓存
@lru_cache(maxsize=1)
def get_config_good():
    """全局单例（性能好）"""
    return Settings()


# 性能对比
def benchmark():
    """性能基准测试"""
    n = 10000
    
    # 不缓存
    start = time.time()
    for _ in range(n):
        get_config_bad()
    bad_time = time.time() - start
    
    # 缓存
    start = time.time()
    for _ in range(n):
        get_config_good()
    good_time = time.time() - start
    
    print(f"不缓存: {bad_time:.3f}s ({n} 次创建)")
    print(f"缓存: {good_time:.3f}s ({n} 次访问)")
    print(f"性能提升: {bad_time / good_time:.1f}x")


if __name__ == '__main__':
    benchmark()
```

## 9. 案例研究

### 9.1 案例一：FastAPI 应用的配置管理

**场景描述**：一个使用 FastAPI 构建的 REST API 服务，需要支持开发、测试、预发、生产四个环境，每个环境的数据库、Redis、日志、安全配置不同。

**解决方案**：

```python
"""
FastAPI 应用配置管理案例

架构：
1. Pydantic Settings 定义强类型配置
2. 多环境 .env 文件切换
3. 依赖注入暴露配置
4. 启动时验证配置
"""
from typing import Optional
from functools import lru_cache
from pydantic import Field, SecretStr, validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastapi import FastAPI, Depends, HTTPException


class Settings(BaseSettings):
    """FastAPI 应用配置"""
    
    # 应用配置
    app_name: str = Field(default='FastAPI App')
    app_env: str = Field(default='development')
    debug: bool = Field(default=False)
    
    # 服务器配置
    host: str = Field(default='0.0.0.0')
    port: int = Field(default=8000, ge=1, le=65535)
    
    # 数据库配置
    database_url: str = Field(default='sqlite:///default.db')
    database_pool_size: int = Field(default=10, ge=1, le=100)
    
    # Redis 配置
    redis_url: str = Field(default='redis://localhost:6379/0')
    
    # 安全配置
    secret_key: SecretStr = Field(default='change-me')
    access_token_expire_minutes: int = Field(default=30, ge=1)
    
    # CORS 配置
    cors_origins: list[str] = Field(default=['*'])
    
    model_config = SettingsConfigDict(
        env_file=f'.env.{os.getenv("APP_ENV", "development")}',
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore',
    )
    
    @validator('app_env')
    def validate_env(cls, v):
        valid = {'development', 'staging', 'production', 'test'}
        if v not in valid:
            raise ValueError(f'app_env 必须是 {valid} 之一')
        return v
    
    @validator('secret_key')
    def validate_secret(cls, v, values):
        if values.get('app_env') == 'production':
            if v.get_secret_value() == 'change-me':
                raise ValueError('生产环境必须设置非默认 secret_key')
        return v


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例，通过依赖注入使用）"""
    return Settings()


# FastAPI 应用
app = FastAPI(
    title=get_settings().app_name,
    debug=get_settings().debug,
)


@app.get("/info")
async def info(settings: Settings = Depends(get_settings)):
    """获取应用信息（依赖注入配置）"""
    return {
        "app_name": settings.app_name,
        "app_env": settings.app_env,
        "debug": settings.debug,
    }


@app.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    """健康检查"""
    return {"status": "healthy", "env": settings.app_env}


# 启动时验证配置
@app.on_event("startup")
async def validate_config():
    """启动时验证配置"""
    settings = get_settings()
    if settings.app_env == 'production' and settings.debug:
        raise RuntimeError("生产环境不能开启 debug 模式")
    print(f"应用启动: {settings.app_name} ({settings.app_env})")
```

### 9.2 案例二：微服务的远程配置中心

**场景描述**：一个由 10 个微服务组成的电商系统，需要统一的配置管理，支持配置热更新、灰度发布、多环境隔离。

**解决方案**：

```python
"""
微服务远程配置中心案例

架构：
1. Apollo 配置中心作为统一配置源
2. 本地缓存兜底（配置中心不可用时使用）
3. 配置变更订阅与热更新
4. 灰度发布支持
"""
import os
import json
import time
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from pathlib import Path
import requests
from functools import lru_cache


@dataclass
class ApolloConfig:
    """Apollo 配置中心连接配置"""
    server_url: str = 'http://apollo-config:8080'
    app_id: str = 'ecommerce-service'
    cluster: str = 'default'
    namespace: str = 'application'
    polling_interval: int = 60  # 秒


class ApolloClient:
    """
    Apollo 配置中心客户端
    
    特性：
    1. 启动时拉取配置
    2. 定时轮询配置变更
    3. 本地缓存兜底
    4. 配置变更回调
    """
    
    def __init__(self, config: ApolloConfig):
        self.config = config
        self._cache: Dict[str, Any] = {}
        self._callbacks: Dict[str, list[Callable]] = {}
        self._release_key: str = ''
        self._stop_event = threading.Event()
        self._polling_thread: Optional[threading.Thread] = None
        self._local_cache_file = Path(f'/tmp/apollo_cache_{config.app_id}_{config.namespace}.json')
    
    def get_config(self, key: str, default: Any = None) -> Any:
        """获取配置值"""
        if key in self._cache:
            return self._cache[key]
        return default
    
    def start(self) -> None:
        """启动客户端：拉取配置并开始轮询"""
        # 先尝试从本地缓存加载（兜底）
        self._load_local_cache()
        
        # 从 Apollo 拉取最新配置
        self._fetch_config()
        
        # 启动轮询线程
        self._polling_thread = threading.Thread(target=self._polling_loop, daemon=True)
        self._polling_thread.start()
    
    def stop(self) -> None:
        """停止客户端"""
        self._stop_event.set()
        if self._polling_thread:
            self._polling_thread.join(timeout=5)
    
    def on_change(self, key: str, callback: Callable[[str, Any, Any], None]) -> None:
        """注册配置变更回调"""
        if key not in self._callbacks:
            self._callbacks[key] = []
        self._callbacks[key].append(callback)
    
    def _fetch_config(self) -> None:
        """从 Apollo 拉取配置"""
        try:
            url = f"{self.config.server_url}/configs/{self.config.app_id}/{self.config.cluster}/{self.config.namespace}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            new_release_key = data.get('releaseKey', '')
            if new_release_key == self._release_key:
                return  # 配置未变更
            
            old_config = self._cache.copy()
            new_config = data.get('configurations', {})
            
            # 检测变更并触发回调
            for key in set(list(old_config.keys()) + list(new_config.keys())):
                old_value = old_config.get(key)
                new_value = new_config.get(key)
                if old_value != new_value:
                    self._notify_change(key, old_value, new_value)
            
            self._cache = new_config
            self._release_key = new_release_key
            self._save_local_cache()
            
        except Exception as e:
            print(f"从 Apollo 拉取配置失败: {e}，使用本地缓存")
    
    def _polling_loop(self) -> None:
        """轮询配置变更"""
        while not self._stop_event.is_set():
            self._stop_event.wait(self.config.polling_interval)
            if self._stop_event.is_set():
                break
            self._fetch_config()
    
    def _notify_change(self, key: str, old_value: Any, new_value: Any) -> None:
        """通知配置变更"""
        for callback in self._callbacks.get(key, []):
            try:
                callback(key, old_value, new_value)
            except Exception as e:
                print(f"配置变更回调异常: {e}")
    
    def _save_local_cache(self) -> None:
        """保存配置到本地缓存文件"""
        try:
            cache_data = {
                'release_key': self._release_key,
                'config': self._cache,
                'timestamp': time.time(),
            }
            self._local_cache_file.write_text(json.dumps(cache_data), encoding='utf-8')
        except Exception as e:
            print(f"保存本地缓存失败: {e}")
    
    def _load_local_cache(self) -> None:
        """从本地缓存文件加载配置"""
        if self._local_cache_file.exists():
            try:
                cache_data = json.loads(self._local_cache_file.read_text(encoding='utf-8'))
                self._cache = cache_data.get('config', {})
                self._release_key = cache_data.get('release_key', '')
                print(f"从本地缓存加载配置（{len(self._cache)} 项）")
            except Exception as e:
                print(f"加载本地缓存失败: {e}")


# 使用示例
if __name__ == '__main__':
    apollo_config = ApolloConfig(
        server_url='http://apollo-config:8080',
        app_id='ecommerce-order-service',
        namespace='application',
    )
    
    client = ApolloClient(apollo_config)
    
    # 注册配置变更回调
    def on_max_orders_change(key, old_value, new_value):
        print(f"配置变更: {key} = {old_value} -> {new_value}")
        # 这里可以触发业务逻辑更新
    
    client.on_change('max_orders_per_minute', on_max_orders_change)
    
    # 启动客户端
    client.start()
    
    # 使用配置
    max_orders = client.get_config('max_orders_per_minute', 100)
    print(f"当前最大订单数: {max_orders}")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.stop()
```

### 9.3 案例三：特性开关驱动的灰度发布

**场景描述**：一个 SaaS 平台希望逐步推出新版仪表盘功能，先对内部员工开放，再对 5% 用户开放，最后全量发布。

**解决方案**：

```python
"""
特性开关驱动的灰度发布案例

架构：
1. Redis 存储特性开关状态
2. 基于用户 ID 的稳定灰度
3. 支持目标用户列表、百分比灰度、白名单
4. 支持特性开关的过期时间
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, List
from dataclasses import dataclass, field, asdict
import redis


@dataclass
class FeatureFlag:
    """特性开关"""
    name: str
    enabled: bool = False
    percentage: int = 0  # 0-100
    whitelist: List[str] = field(default_factory=list)  # 白名单用户 ID
    blacklist: List[str] = field(default_factory=list)  # 黑名单用户 ID
    expires_at: Optional[str] = None  # ISO 格式时间字符串
    
    def is_enabled_for(self, user_id: str) -> bool:
        """判断特性是否对指定用户启用"""
        # 黑名单优先
        if user_id in self.blacklist:
            return False
        # 白名单直接通过
        if user_id in self.whitelist:
            return True
        # 全局开关
        if not self.enabled:
            return False
        # 过期检查
        if self.expires_at:
            expires = datetime.fromisoformat(self.expires_at)
            if datetime.now() > expires:
                return False
        # 百分比灰度（基于用户 ID 哈希，保证稳定）
        if self.percentage >= 100:
            return True
        if self.percentage <= 0:
            return False
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16) % 100
        return hash_value < self.percentage


class FeatureFlagService:
    """特性开关服务"""
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        self.redis = redis.from_url(redis_url)
    
    def get_flag(self, name: str) -> FeatureFlag:
        """获取特性开关"""
        data = self.redis.get(f'feature_flag:{name}')
        if data is None:
            return FeatureFlag(name=name)
        return FeatureFlag(**json.loads(data))
    
    def set_flag(self, flag: FeatureFlag) -> None:
        """设置特性开关"""
        self.redis.set(f'feature_flag:{flag.name}', json.dumps(asdict(flag)))
    
    def is_enabled(self, flag_name: str, user_id: str) -> bool:
        """检查特性是否对用户启用"""
        flag = self.get_flag(flag_name)
        return flag.is_enabled_for(user_id)


# 灰度发布流程示例
def gradual_rollout_example():
    """灰度发布流程示例"""
    service = FeatureFlagService()
    
    # 阶段 1：内部测试（仅白名单）
    print("阶段 1：内部测试")
    flag = FeatureFlag(
        name='new_dashboard',
        enabled=True,
        whitelist=['employee_1', 'employee_2', 'employee_3'],
        percentage=0,
    )
    service.set_flag(flag)
    
    # 阶段 2：5% 灰度
    print("阶段 2：5% 灰度")
    flag.percentage = 5
    flag.whitelist = []  # 清空白名单，改为纯百分比
    service.set_flag(flag)
    
    # 阶段 3：50% 灰度
    print("阶段 3：50% 灰度")
    flag.percentage = 50
    service.set_flag(flag)
    
    # 阶段 4：全量发布
    print("阶段 4：全量发布")
    flag.percentage = 100
    service.set_flag(flag)
    
    # 验证：随机用户
    for user_id in ['user_1', 'user_2', 'user_3']:
        enabled = service.is_enabled('new_dashboard', user_id)
        print(f"  用户 {user_id}: {'启用' if enabled else '未启用'}")


if __name__ == '__main__':
    gradual_rollout_example()
```

### 9.4 案例四：Kubernetes 部署的配置管理

**场景描述**：一个部署在 Kubernetes 集群的 Python 应用，需要使用 ConfigMap 管理普通配置，Secret 管理密钥，并支持配置热更新。

**解决方案**：

```python
"""
Kubernetes 部署的配置管理案例

架构：
1. ConfigMap 存储普通配置（挂载为文件）
2. Secret 存储敏感配置（挂载为文件）
3. 环境变量注入（小量配置）
4. 挂载卷热更新（inotify 监听）
"""
import os
import json
from pathlib import Path
from typing import Any, Dict, Optional
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class K8sAppSettings(BaseSettings):
    """K8s 部署的应用配置"""
    
    # 通过环境变量注入
    app_name: str = Field(default='K8sApp')
    app_env: str = Field(default='production')
    
    # ConfigMap 挂载路径
    configmap_path: str = Field(default='/etc/app/config')
    
    # Secret 挂载路径
    secret_path: str = Field(default='/etc/app/secret')
    
    model_config = SettingsConfigDict(case_sensitive=False, extra='ignore')
    
    def load_configmap(self) -> Dict[str, str]:
        """从 ConfigMap 挂载卷加载配置"""
        path = Path(self.configmap_path)
        config = {}
        if path.exists():
            for file_path in path.iterdir():
                if file_path.is_file():
                    key = file_path.name.upper()
                    value = file_path.read_text(encoding='utf-8').strip()
                    config[key] = value
        return config
    
    def load_secret(self) -> Dict[str, str]:
        """从 Secret 挂载卷加载密钥"""
        path = Path(self.secret_path)
        secrets = {}
        if path.exists():
            for file_path in path.iterdir():
                if file_path.is_file():
                    key = file_path.name.upper()
                    value = file_path.read_text(encoding='utf-8').strip()
                    secrets[key] = value
        return secrets
    
    def get_database_url(self) -> str:
        """构建数据库 URL（组合 ConfigMap 与 Secret）"""
        config = self.load_configmap()
        secrets = self.load_secret()
        
        db_host = config.get('DATABASE_HOST', 'localhost')
        db_port = config.get('DATABASE_PORT', '5432')
        db_name = config.get('DATABASE_NAME', 'myapp')
        db_user = config.get('DATABASE_USER', 'postgres')
        db_password = secrets.get('DATABASE_PASSWORD', '')
        
        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


# K8s 部署文件示例
K8S_DEPLOYMENT_YAML = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        env:
        - name: APP_NAME
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: APP_NAME
        - name: APP_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: APP_ENV
        volumeMounts:
        - name: config-volume
          mountPath: /etc/app/config
          readOnly: true
        - name: secret-volume
          mountPath: /etc/app/secret
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: app-config
      - name: secret-volume
        secret:
          secretName: app-secret
"""


if __name__ == '__main__':
    settings = K8sAppSettings()
    
    print(f"应用: {settings.app_name}")
    print(f"环境: {settings.app_env}")
    
    config = settings.load_configmap()
    print(f"\nConfigMap 配置:")
    for k, v in config.items():
        print(f"  {k}: {v}")
    
    secrets = settings.load_secret()
    print(f"\nSecret 密钥（仅显示键名）:")
    for k in secrets:
        print(f"  {k}: ***")
    
    db_url = settings.get_database_url()
    print(f"\n数据库 URL: {db_url}")
```

## 10. 习题

### 10.1 基础题

**题目 1**：解释十二因素应用方法论中关于配置的核心原则，并说明为什么配置应该存储在环境变量中而不是代码中。

**参考答案要点**：
- 原则：配置应存储在环境变量中，代码在不同环境中保持完全一致。
- 原因：环境变量独立于代码、易于跨环境切换、不泄漏到版本控制、容器化友好、易于 CI/CD 注入。

**题目 2**：使用 `os.getenv` 读取环境变量 `PORT`（默认 8000）和 `DEBUG`（默认 false），并正确转换类型。

**参考答案要点**：
```python
import os

port = int(os.getenv('PORT', '8000'))
debug = os.getenv('DEBUG', 'false').lower() in ('true', '1', 'yes', 'on')
```

**题目 3**：列出配置优先级的典型顺序（从高到低）。

**参考答案要点**：
1. 命令行参数
2. 环境变量
3. `.env` 文件
4. 配置文件（YAML/TOML/JSON）
5. 代码默认值

### 10.2 进阶题

**题目 4**：使用 Pydantic Settings 实现一个配置类，包含 `database_url`（必需）、`port`（1-65535，默认 8000）、`debug`（默认 False），并添加一个验证器确保生产环境（`app_env='production'`）时 `debug` 必须为 False。

**参考答案要点**：
```python
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # 必需
    app_env: str = 'development'
    port: int = Field(default=8000, ge=1, le=65535)
    debug: bool = False
    
    @model_validator(mode='after')
    def validate_production(self) -> 'Settings':
        if self.app_env == 'production' and self.debug:
            raise ValueError('生产环境必须关闭 debug')
        return self
```

**题目 5**：解释 Pydantic 的 `SecretStr` 类型的作用，并说明为什么在处理密钥时应该使用它而不是普通的 `str`。

**参考答案要点**：
- `SecretStr` 在 `repr`、`str` 时显示为 `SecretStr('**********')`，避免意外泄漏。
- 必须显式调用 `get_secret_value()` 才能获取明文。
- 防止日志、调试输出、异常栈意外打印密钥。
- 序列化（`model_dump()`、`model_dump_json()`）时默认脱敏。

**题目 6**：设计一个支持多环境的配置加载方案，根据 `APP_ENV` 环境变量加载对应的 `.env.{env}` 文件，并确保环境变量优先级高于 `.env` 文件。

**参考答案要点**：
```python
import os
from dotenv import load_dotenv

def load_env():
    app_env = os.getenv('APP_ENV', 'development')
    env_file = f'.env.{app_env}'
    # override=False：环境变量优先级高于 .env 文件
    load_dotenv(env_file, override=False)

load_env()
```

### 10.3 挑战题

**题目 7**：实现一个基于 Redis 的动态配置管理器，支持配置热更新（通过 pubsub）、本地缓存（TTL 60 秒）、配置变更回调。要求线程安全，并提供 `get(key)`、`set(key, value)`、`on_change(callback)` 方法。

**参考答案要点**：
- 使用 Redis `GET`/`SET` 存储配置，`PUBLISH` 通知变更。
- 使用 `dict` 作为本地缓存，记录 `(value, expire_at)`。
- 使用后台线程订阅 `config_changes` 频道。
- 使用锁（`threading.Lock`）保护缓存与回调列表。
- 参考本文 5.6 节的完整实现。

**题目 8**：设计一个特性开关系统，支持白名单、黑名单、百分比灰度（基于用户 ID 哈希保证稳定）、过期时间。要求同一用户多次访问结果一致。

**参考答案要点**：
- 使用 `hashlib.md5(user_id).hexdigest()` 取模 100 实现稳定灰度。
- 检查顺序：黑名单 > 白名单 > 全局开关 > 过期时间 > 百分比灰度。
- 参考本文 9.3 节的完整实现。

**题目 9**：分析在 Kubernetes 环境中，使用 ConfigMap 挂载卷与使用环境变量注入配置的优劣，并说明何时应该选择哪种方式。

**参考答案要点**：
- 挂载卷优势：支持大配置、热更新（自动刷新）、结构化配置。
- 挂载卷劣势：需要文件 I/O、配置分散在多个文件。
- 环境变量优势：简单、启动即用、与应用代码解耦。
- 环境变量劣势：不适合大配置、不支持热更新、变量名冲突风险。
- 选择依据：少量简单配置用环境变量，大量或需要热更新的配置用挂载卷。

## 11. 参考文献

[1] Wiggins, A. (2011). *The Twelve-Factor App*. Heroku. Available at: https://12factor.net/config

[2] Pydantic Team. (2024). *Pydantic Settings Documentation*. Available at: https://docs.pydantic.dev/latest/concepts/pydantic_settings/

[3] Renne, B. (2024). *Dynaconf Documentation*. Available at: https://www.dynaconf.com/

[4] python-dotenv. (2024). *python-dotenv Documentation*. Available at: https://github.com/theskumar/python-dotenv

[5] Preston-Werner, T. (2013). *TOML: Tom's Obvious, Minimal Language*. Available at: https://toml.io/

[6] Python Software Foundation. (2024). *tomllib — Parse TOML files*. Python Documentation. Available at: https://docs.python.org/3/library/tomllib.html

[7] PEP 680 — tomllib: Support TOML parsing in the Standard Library. (2022). Python Enhancement Proposals. Available at: https://peps.python.org/pep-0680/

[8] PEP 518 — Specifying minimum build system requirements for Python projects. (2016). Python Enhancement Proposals. Available at: https://peps.python.org/pep-0518/

[9] HashiCorp. (2024). *HashiCorp Vault Documentation*. Available at: https://developer.hashicorp.com/vault

[10] Amazon Web Services. (2024). *AWS Secrets Manager Documentation*. Available at: https://docs.aws.amazon.com/secretsmanager/

[11] Ctrip. (2024). *Apollo: A reliable configuration management system*. Available at: https://www.apolloconfig.com/

[12] Alibaba. (2024). *Nacos: Dynamic Naming and Configuration Service*. Available at: https://nacos.io/

[13] Kubernetes. (2024). *ConfigMap and Secret*. Kubernetes Documentation. Available at: https://kubernetes.io/docs/concepts/configuration/

[14] Feingold, R. (2017). *Configuration Management in Microservices*. IEEE Software, 34(3), 88-93. DOI: 10.1109/MS.2017.66

[15] Newman, S. (2021). *Building Microservices: Designing Fine-Grained Systems* (2nd ed.). O'Reilly Media. ISBN: 978-1492034025

[16] Ford, N., Parsons, R., & Kua, P. (2017). *Building Evolutionary Architectures*. O'Reilly Media. ISBN: 978-1491986363

[17] Humble, J., & Farley, D. (2010). *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley. ISBN: 978-0321601919

## 12. 延伸阅读

### 12.1 官方文档

- **Pydantic Settings**: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- **Dynaconf**: https://www.dynaconf.com/
- **python-dotenv**: https://github.com/theskumar/python-dotenv
- **tomllib**: https://docs.python.org/3/library/tomllib.html
- **PyYAML**: https://docs.python.org/3/library/yaml.html
- **configparser**: https://docs.python.org/3/library/configparser.html

### 12.2 经典书籍

- **《Twelve Factor App》** Adam Wiggins — 配置管理的经典方法论。
- **《Building Microservices》** Sam Newman — 微服务架构下的配置管理。
- **《Continuous Delivery》** Jez Humble & David Farley — 持续交付中的配置管理。
- **《Building Evolutionary Architectures》** Neal Ford 等 — 演进式架构与特性开关。
- **《Site Reliability Engineering》** Google — SRE 实践中的配置管理。

### 12.3 云原生配置管理

- **Kubernetes ConfigMap**: https://kubernetes.io/docs/concepts/configuration/configmap/
- **Kubernetes Secret**: https://kubernetes.io/docs/concepts/configuration/secret/
- **Helm Values**: https://helm.sh/docs/chart_template_guide/values_files/
- **Kustomize**: https://kustomize.io/
- **Argo CD Config Management**: https://argo-cd.readthedocs.io/

### 12.4 密钥管理服务

- **HashiCorp Vault**: https://developer.hashicorp.com/vault
- **AWS Secrets Manager**: https://aws.amazon.com/secrets-manager/
- **Azure Key Vault**: https://azure.microsoft.com/services/key-vault/
- **Google Secret Manager**: https://cloud.google.com/secret-manager
- **Doppler**: https://www.doppler.com/
- **Infisical**: https://infisical.com/

### 12.5 配置中心开源项目

- **Apollo**: https://www.apolloconfig.com/
- **Nacos**: https://nacos.io/
- **Consul KV**: https://developer.hashicorp.com/consul/docs/dynamic-app-config/kv
- **etcd**: https://etcd.io/
- **Spring Cloud Config**: https://docs.spring.io/spring-cloud-config/docs/current/reference/html/
- **Disconf**（百度开源）: https://github.com/knightliao/disconf

### 12.6 前沿论文与博客

- **Configuration as Code**: 配置即代码的实践。
- **Feature Toggles (Pete Hodgson)**: https://martinfowler.com/articles/feature-toggles.html
- **Trunk-Based Development**: 主干开发与特性开关的协作。
- **Canary Release with Feature Flags**: 灰度发布与特性开关的最佳实践。
- **Dynamic Configuration in Microservices**: 微服务中的动态配置研究（IEEE Software）。
