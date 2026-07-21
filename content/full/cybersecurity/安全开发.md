---
order: 58
title: 安全开发
module: cybersecurity
category: 网络安全
difficulty: intermediate
description: 安全开发：SDL、威胁建模、安全编码、SAST/DAST与安全测试
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/非对称加密
  - cybersecurity/哈希算法
  - cybersecurity/合规与审计
  - cybersecurity/数字证书
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 安全开发生命周期（SDL）

### 1.1 SDL 阶段

| 阶段 | 安全活动           |
| ---- | ------------------ |
| 需求 | 安全需求、合规要求 |
| 设计 | 威胁建模           |
| 实现 | 安全编码、代码审查 |
| 测试 | SAST/DAST/渗透测试 |
| 发布 | 安全评估、签名     |
| 运维 | 漏洞响应、监控     |

### 1.2 安全左移

将安全活动前移到开发早期，降低修复成本：

$$\text{修复成本}：\text{需求阶段} \times 1 < \text{编码阶段} \times 10 < \text{测试阶段} \times 100 < \text{生产阶段} \times 1000$$

## 2. 威胁建模

### 2.1 STRIDE 模型

| 威胁              | 安全属性 | 示例     |
| ----------------- | -------- | -------- |
| Spoofing          | 认证     | 身份冒充 |
| Tampering         | 完整性   | 数据篡改 |
| Repudiation       | 不可否认 | 否认操作 |
| Info Disclosure   | 机密性   | 信息泄露 |
| Denial of Service | 可用性   | 服务拒绝 |
| Elevation         | 授权     | 权限提升 |

### 2.2 威胁建模流程

```
1. 绘制系统架构图
2. 识别信任边界
3. 应用STRIDE识别威胁
4. 评估风险等级
5. 制定缓解措施
```

## 3. 安全编码

### 3.1 输入验证

```python
# 白名单验证
import re
if not re.match(r'^[a-zA-Z0-9_]{1,50}$', username):
    raise ValueError("Invalid username")

# 参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

### 3.2 输出编码

```python
from markupsafe import escape
html = f"<p>Hello, {escape(name)}</p>"
```

### 3.3 安全配置

```python
# Cookie安全
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# 安全头
@app.after_request
def set_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response
```

## 4. 安全测试

### 4.1 SAST

静态应用安全测试，扫描源代码：

| 工具      | 语言   |
| --------- | ------ |
| Semgrep   | 多语言 |
| SonarQube | 多语言 |
| CodeQL    | 多语言 |
| Bandit    | Python |
| Brakeman  | Ruby   |

### 4.2 DAST

动态应用安全测试，测试运行中的应用：

| 工具       | 特点      |
| ---------- | --------- |
| OWASP ZAP  | 开源      |
| Burp Suite | 专业      |
| Nikto      | Web服务器 |

### 4.3 SCA

软件成分分析，检查依赖漏洞：

| 工具                   | 说明       |
| ---------------------- | ---------- |
| Dependabot             | GitHub集成 |
| Snyk                   | 商业       |
| Trivy                  | 开源       |
| OWASP Dependency-Check | 开源       |

## 5. 安全代码审查

### 5.1 审查清单

| 类别 | 检查项             |
| ---- | ------------------ |
| 认证 | 密码存储、会话管理 |
| 授权 | 访问控制、权限检查 |
| 输入 | 验证、过滤、编码   |
| 输出 | 编码、CSP          |
| 加密 | 算法选择、密钥管理 |
| 日志 | 敏感信息脱敏       |
| 错误 | 不暴露堆栈信息     |

### 5.2 常见安全缺陷

| 缺陷           | CWE     | 严重度 |
| -------------- | ------- | ------ |
| SQL注入        | CWE-89  | 高     |
| XSS            | CWE-79  | 高     |
| 硬编码密码     | CWE-259 | 高     |
| 不安全反序列化 | CWE-502 | 高     |
| 路径遍历       | CWE-22  | 高     |
| 不安全随机数   | CWE-330 | 中     |
