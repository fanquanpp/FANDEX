---
order: 64
title: 安全编码原则
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '安全编码实践：OWASP Top 10、安全编码原则、威胁建模与代码审计详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/信息收集
  - cybersecurity/漏洞扫描
  - cybersecurity/输入验证
  - cybersecurity/认证与授权
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 安全编码基础

### 1.1 核心原则

| 原则       | 描述                         |
| ---------- | ---------------------------- |
| 最小权限   | 仅授予完成任务所需的最小权限 |
| 纵深防御   | 多层安全措施                 |
| 失败安全   | 失败时进入安全状态           |
| 默认拒绝   | 默认拒绝访问，显式允许       |
| 不信任输入 | 所有外部输入都不可信         |
| 关注点分离 | 功能与安全逻辑分离           |

### 1.2 安全开发生命周期（SDL）

| 阶段 | 安全活动           |
| ---- | ------------------ |
| 需求 | 安全需求、合规要求 |
| 设计 | 威胁建模、安全架构 |
| 开发 | 安全编码、代码审查 |
| 测试 | 安全测试、渗透测试 |
| 部署 | 安全配置、漏洞扫描 |
| 运维 | 监控、应急响应     |

## 2. OWASP Top 10

### 2.1 2021 版

| 编号 | 风险           | 防御                         |
| ---- | -------------- | ---------------------------- |
| A01  | 权限控制失效   | 最小权限、RBAC、访问控制检查 |
| A02  | 加密失败       | TLS、强加密、密钥管理        |
| A03  | 注入           | 参数化查询、输入验证         |
| A04  | 不安全设计     | 威胁建模、安全模式           |
| A05  | 安全配置错误   | 自动化配置、最小化           |
| A06  | 过时组件       | 依赖更新、SCA                |
| A07  | 认证失败       | MFA、强密码策略              |
| A08  | 数据完整性失败 | 签名验证、安全反序列化       |
| A09  | 日志监控不足   | 集中日志、告警               |
| A10  | SSRF           | URL 白名单、内网隔离         |

## 3. 输入处理

### 3.1 输入验证

```python
# 白名单验证
def validate_username(username):
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        raise ValueError("Invalid username")
    return username

# 范围验证
def validate_age(age):
    age = int(age)
    if not (0 < age < 150):
        raise ValueError("Invalid age")
    return age
```

### 3.2 输出编码

| 上下文     | 编码方式               |
| ---------- | ---------------------- |
| HTML       | `&lt;` `&gt;` `&amp;`  |
| JavaScript | Unicode 转义           |
| URL        | `encodeURIComponent()` |
| SQL        | 参数化查询             |
| OS 命令    | 避免拼接               |

### 3.3 文件操作

```python
# 路径遍历防御
import os

def safe_path(base_dir, filename):
    # 规范化路径
    filepath = os.path.normpath(os.path.join(base_dir, filename))
    # 确保在基目录内
    if not filepath.startswith(os.path.abspath(base_dir)):
        raise ValueError("Path traversal detected")
    return filepath
```

## 4. 认证与授权

### 4.1 密码存储

```python
import bcrypt

# 存储
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))

# 验证
bcrypt.checkpw(password.encode(), hashed)
```

### 4.2 会话管理

```python
# 安全 Session 配置
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,   # 防 XSS
    SESSION_COOKIE_SECURE=True,     # 仅 HTTPS
    SESSION_COOKIE_SAMESITE='Lax',  # 防 CSRF
    PERMANENT_SESSION_LIFETIME=3600, # 1 小时过期
)
```

### 4.3 访问控制

```python
# RBAC 实现
from functools import wraps

def require_role(role):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if current_user.role != role:
                abort(403)
            return f(*args, **kwargs)
        return wrapper
    return decorator

@app.route('/admin')
@require_role('admin')
def admin_panel():
    return "Admin Panel"
```

## 5. 错误处理与日志

### 5.1 安全错误处理

```python
# 生产环境不暴露堆栈
@app.errorhandler(Exception)
def handle_error(e):
    app.logger.error(f"Unhandled error: {e}", exc_info=True)
    return "Internal Server Error", 500

# 不泄露敏感信息
@app.errorhandler(404)
def not_found(e):
    return "Not Found", 404  # 不暴露路径结构
```

### 5.2 安全日志

```python
import logging

# 不记录敏感数据
def safe_log(message, **kwargs):
    # 过滤敏感字段
    sensitive = ['password', 'token', 'secret', 'credit_card']
    for key in sensitive:
        if key in kwargs:
            kwargs[key] = '***'
    logging.info(message, extra=kwargs)
```

## 6. 依赖安全

### 6.1 依赖管理

```bash
# 检查已知漏洞
npm audit          # Node.js
pip audit          # Python
snyk test          # 多语言
trivy fs .         # 容器/文件系统
```

### 6.2 锁定依赖

```json
// package-lock.json
// 确保可重复构建
"integrity": "sha512-..."
```

## 7. 代码审计

### 7.1 审计清单

| 类别     | 检查项             |
| -------- | ------------------ |
| 输入验证 | 所有输入是否验证   |
| 输出编码 | 是否正确编码       |
| 认证     | 密码存储、会话管理 |
| 授权     | 访问控制是否完整   |
| 加密     | 是否使用强加密     |
| 错误处理 | 是否泄露信息       |
| 日志     | 是否记录安全事件   |
| 依赖     | 是否有已知漏洞     |

### 7.2 自动化工具

| 工具      | 语言   | 类型 |
| --------- | ------ | ---- |
| SonarQube | 多语言 | SAST |
| Semgrep   | 多语言 | SAST |
| Bandit    | Python | SAST |
| Brakeman  | Ruby   | SAST |
| CodeQL    | 多语言 | SAST |
