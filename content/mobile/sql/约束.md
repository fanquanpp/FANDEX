# 约束

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## PRIMARY KEY 主键

**单行写法：列级主键约束**
`<列名> <类型> PRIMARY KEY`
```sql
-- 在列定义时直接指定主键
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
```

**换行写法：表级单列主键约束**
`CONSTRAINT <约束名> PRIMARY KEY (<列>)`
```sql
-- 在表级定义主键并命名
CREATE TABLE users (
  id INT,
  name VARCHAR(100),
  CONSTRAINT pk_users PRIMARY KEY (id)
);
```

**换行写法：表级复合主键约束**
`CONSTRAINT <约束名> PRIMARY KEY (<列 1>, <列 2>)`
```sql
-- 定义复合主键
CREATE TABLE order_items (
  order_id INT,
  product_id INT,
  quantity INT,
  CONSTRAINT pk_order_items PRIMARY KEY (order_id, product_id)
);
```

---

## FOREIGN KEY 外键

**换行写法：列级外键约束**
`<列名> <类型> REFERENCES <引用表>(<引用列>)`
```sql
-- 在列定义时直接指定外键
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount DECIMAL(10, 2)
);
```

**换行写法：表级外键约束**
`CONSTRAINT <约束名> FOREIGN KEY (<列>) REFERENCES <引用表>(<引用列>)`
```sql
-- 在表级定义外键并命名
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  amount DECIMAL(10, 2),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**换行写法：外键级联删除**
`FOREIGN KEY (<列>) REFERENCES <引用表>(<引用列>) ON DELETE CASCADE`
```sql
-- 父记录删除时级联删除子记录
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**换行写法：外键级联更新**
`FOREIGN KEY (<列>) REFERENCES <引用表>(<引用列>) ON UPDATE CASCADE`
```sql
-- 父记录主键更新时级联更新子记录外键
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
);
```

**换行写法：外键 SET NULL**
`FOREIGN KEY (<列>) REFERENCES <引用表>(<引用列>) ON DELETE SET NULL`
```sql
-- 父记录删除时子记录外键设为 NULL
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## UNIQUE 唯一约束

**单行写法：列级唯一约束**
`<列名> <类型> UNIQUE`
```sql
-- 在列定义时直接指定唯一约束
CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(255) UNIQUE);
```

**换行写法：表级唯一约束**
`CONSTRAINT <约束名> UNIQUE (<列>)`
```sql
-- 在表级定义唯一约束并命名
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(255),
  CONSTRAINT uk_users_email UNIQUE (email)
);
```

**换行写法：复合唯一约束**
`CONSTRAINT <约束名> UNIQUE (<列 1>, <列 2>)`
```sql
-- 定义复合唯一约束
CREATE TABLE user_roles (
  user_id INT,
  role_id INT,
  CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);
```

---

## NOT NULL 非空约束

**单行写法：列级非空约束**
`<列名> <类型> NOT NULL`
```sql
-- 在列定义时指定非空约束
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
```

---

## DEFAULT 默认值

**单行写法：列级默认值**
`<列名> <类型> DEFAULT <默认值>`
```sql
-- 在列定义时指定默认值
CREATE TABLE users (id INT PRIMARY KEY, status VARCHAR(20) DEFAULT 'active');
```

**单行写法：使用函数作为默认值**
`<列名> <类型> DEFAULT <函数>()`
```sql
-- 使用 CURRENT_TIMESTAMP 作为默认值
CREATE TABLE users (id INT PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
```

---

## CHECK 检查约束

**单行写法：列级 CHECK 约束**
`<列名> <类型> CHECK (<条件>)`
```sql
-- 在列定义时指定检查约束
CREATE TABLE products (id INT PRIMARY KEY, price DECIMAL(10, 2) CHECK (price >= 0));
```

**换行写法：表级 CHECK 约束**
`CONSTRAINT <约束名> CHECK (<条件>)`
```sql
-- 在表级定义检查约束并命名
CREATE TABLE employees (
  id INT PRIMARY KEY,
  salary DECIMAL(10, 2),
  CONSTRAINT chk_salary CHECK (salary > 0 AND salary < 1000000)
);
```

**换行写法：多列 CHECK 约束**
`CONSTRAINT <约束名> CHECK (<列 1> <运算符> <列 2>)`
```sql
-- 检查结束日期大于开始日期
CREATE TABLE events (
  id INT PRIMARY KEY,
  start_date DATE,
  end_date DATE,
  CONSTRAINT chk_dates CHECK (end_date > start_date)
);
```

---

## AUTO_INCREMENT 自增

**单行写法：MySQL 自增主键**
`<列名> INT AUTO_INCREMENT PRIMARY KEY`
```sql
-- MySQL 自增主键
CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
```

---

## 约束管理

**单行写法：添加约束**
`ALTER TABLE <表名> ADD CONSTRAINT <约束名> <约束定义>;`
```sql
-- 向现有表添加唯一约束
ALTER TABLE users ADD CONSTRAINT uk_email UNIQUE (email);
```

**单行写法：删除约束**
`ALTER TABLE <表名> DROP CONSTRAINT <约束名>;`
```sql
-- 删除表上的约束
ALTER TABLE users DROP CONSTRAINT uk_email;
```

**单行写法：MySQL 删除外键**
`ALTER TABLE <表名> DROP FOREIGN KEY <外键名>;`
```sql
-- MySQL 删除外键约束
ALTER TABLE orders DROP FOREIGN KEY fk_orders_user;
```

**单行写法：禁用约束**
`ALTER TABLE <表名> DISABLE CONSTRAINT <约束名>;`
```sql
-- 临时禁用约束（Oracle/PostgreSQL）
ALTER TABLE users DISABLE CONSTRAINT uk_email;
```

**单行写法：启用约束**
`ALTER TABLE <表名> ENABLE CONSTRAINT <约束名>;`
```sql
-- 重新启用约束
ALTER TABLE users ENABLE CONSTRAINT uk_email;
```
