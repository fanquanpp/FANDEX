---
order: 65
title: 输入验证
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: 输入验证与过滤：验证策略、数据净化、常见绕过与安全实践详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/漏洞扫描
  - cybersecurity/安全编码原则
  - cybersecurity/认证与授权
  - 'cybersecurity/OWASP-Top-10详解'
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 输入验证原则

### 1.1 核心原则

| 原则             | 描述                       |
| ---------------- | -------------------------- |
| 不信任任何输入   | 所有外部数据都不可信       |
| 白名单优于黑名单 | 定义允许的输入，而非禁止的 |
| 纵深验证         | 多层验证                   |
| 尽早验证         | 在数据入口处验证           |
| 一致验证         | 前后端使用相同规则         |

### 1.2 输入来源

| 来源     | 示例                        |
| -------- | --------------------------- |
| 表单数据 | 用户名、密码、搜索词        |
| URL 参数 | `?id=1&page=2`              |
| HTTP 头  | Cookie、User-Agent、Referer |
| 文件上传 | 文件名、文件内容            |
| API 请求 | JSON/XML 请求体             |
| 数据库   | 二次注入                    |
| 环境变量 | 配置注入                    |

## 2. 验证策略

### 2.1 白名单验证

```python
import re

# 用户名：仅允许字母数字下划线
def validate_username(value):
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', value):
        raise ValueError("Invalid username")
    return value

# 颜色值
def validate_color(value):
    if value not in ['red', 'green', 'blue', 'yellow']:
        raise ValueError("Invalid color")
    return value

# 枚举类型
def validate_status(value):
    valid = {'active', 'inactive', 'pending'}
    if value not in valid:
        raise ValueError("Invalid status")
    return value
```

### 2.2 数据类型验证

```python
# 整数验证
def validate_int(value, min_val=None, max_val=None):
    try:
        num = int(value)
    except (ValueError, TypeError):
        raise ValueError("Must be an integer")
    if min_val is not None and num < min_val:
        raise ValueError(f"Must be >= {min_val}")
    if max_val is not None and num > max_val:
        raise ValueError(f"Must be <= {max_val}")
    return num

# 邮箱验证
def validate_email(value):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, value):
        raise ValueError("Invalid email format")
    return value

# URL 验证
def validate_url(value):
    from urllib.parse import urlparse
    try:
        result = urlparse(value)
        if result.scheme not in ('http', 'https'):
            raise ValueError("Only HTTP/HTTPS allowed")
        if not result.hostname:
            raise ValueError("Invalid URL")
        return value
    except Exception:
        raise ValueError("Invalid URL format")
```

### 2.3 长度与范围验证

```python
def validate_string(value, min_len=0, max_len=255):
    if not isinstance(value, str):
        raise ValueError("Must be a string")
    if len(value) < min_len:
        raise ValueError(f"Too short (min {min_len})")
    if len(value) > max_len:
        raise ValueError(f"Too long (max {max_len})")
    return value
```

## 3. 数据净化

### 3.1 HTML 净化

```python
import bleach

# 允许安全标签
clean_html = bleach.clean(
    user_input,
    tags=['b', 'i', 'u', 'a', 'p', 'br'],
    attributes={'a': ['href', 'title']},
    protocols=['https']
)
```

### 3.2 SQL 净化

```python
#  正确：参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

#  错误：字符串拼接
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

### 3.3 OS 命令净化

```python
import shlex

# 安全引用
safe_arg = shlex.quote(user_input)
os.system(f"ping -c 3 {safe_arg}")
```

### 3.4 文件路径净化

```python
import os

def sanitize_path(base_dir, filename):
    # 移除路径遍历字符
    filename = os.path.basename(filename)
    # 规范化并验证
    full_path = os.path.normpath(os.path.join(base_dir, filename))
    if not full_path.startswith(os.path.abspath(base_dir)):
        raise ValueError("Invalid path")
    return full_path
```

## 4. 常见绕过技术

### 4.1 编码绕过

| 编码方式  | 示例                 | 绕过目标    |
| --------- | -------------------- | ----------- |
| URL 编码  | `%3Cscript%3E`       | `<script>`  |
| 双重编码  | `%253C`              | `%3C` → `<` |
| HTML 实体 | `&#60;script&#62;`   | `<script>`  |
| Unicode   | `\u003cscript\u003e` | `<script>`  |
| Base64    | `PHNjcmlwdD4=`       | `<script>`  |

### 4.2 大小写混合

```
<ScRiPt>alert(1)</ScRiPt>
SeLeCt * FrOm users
```

### 4.3 空字节注入

```
file.php%00.jpg   → 服务器截断为 file.php
<scr\x00ipt>      → 某些过滤器跳过空字节
```

### 4.4 换行注入

```
username=admin\nisAdmin=true
Header: value\r\nX-Injected: true
```

## 5. 框架级验证

### 5.1 Python（Pydantic）

```python
from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    age: int

    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError('Invalid username')
        return v

    @validator('age')
    def validate_age(cls, v):
        if not (0 < v < 150):
            raise ValueError('Invalid age')
        return v
```

### 5.2 JavaScript（Joi/Zod）

```javascript
import { z } from 'zod';

const UserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  age: z.number().int().min(1).max(149),
});
```

## 6. 验证最佳实践

| 实践        | 描述                 |
| ----------- | -------------------- |
| 前端验证    | 用户体验（不可依赖） |
| 后端验证    | 安全保障（必须）     |
| 数据库约束  | 最后一道防线         |
| 类型系统    | 编译时检查           |
| Schema 验证 | API 层统一验证       |
| 日志记录    | 记录验证失败事件     |
