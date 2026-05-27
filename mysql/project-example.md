# MySQL 项目示例：电商数据库设计

## 项目概述

本项目设计一个完整的电商系统数据库，涵盖用户管理、商品管理、订单处理、支付、物流等核心模块。从 ER 图设计到建表 SQL、查询优化和索引策略，提供完整的数据库设计实践。

### 功能清单

| 功能模块 | 描述 |
|---------|------|
| 用户管理 | 注册、登录、地址管理、权限 |
| 商品管理 | SPU/SKU、分类、品牌、属性 |
| 购物车 | 加购、修改数量、删除 |
| 订单系统 | 下单、支付、发货、收货、退款 |
| 搜索 | 全文搜索、分类筛选、排序 |
| 统计报表 | 销售统计、用户分析、库存预警 |

## 需求分析

### ER 图设计

```
┌─────────┐     ┌──────────────┐     ┌──────────┐
│  users  │────<│   orders     │>────│ order_items│
└────┬────┘     └──────┬───────┘     └─────┬────┘
     │                 │                    │
     │            ┌────┴────┐              │
     │            │payments │              │
     │            └─────────┘              │
     │                                     │
┌────┴────┐     ┌──────────┐     ┌────────┴───┐
│addresses│     │ products │>────│  skus       │
└─────────┘     └────┬─────┘     └────────────┘
                     │
              ┌──────┼──────┐
              │      │      │
        ┌─────┴──┐ ┌─┴───┐ ┌┴────────┐
        │categories│ │brands│ │attributes│
        └─────────┘ └─────┘ └─────────┘
```

### 核心实体关系

- 用户 1:N 订单
- 订单 1:N 订单项
- 订单 1:1 支付
- 商品 1:N SKU
- 分类 1:N 商品（支持多级分类）
- SKU 1:N 订单项

## 完整建表 SQL

### 用户模块

```sql
CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username        VARCHAR(50)     NOT NULL,
    email           VARCHAR(100)    NOT NULL,
    phone           VARCHAR(20)     DEFAULT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    nickname        VARCHAR(50)     DEFAULT NULL,
    avatar_url      VARCHAR(500)    DEFAULT NULL,
    gender          TINYINT         DEFAULT 0 COMMENT '0-unknown, 1-male, 2-female',
    birthday        DATE            DEFAULT NULL,
    status          TINYINT         NOT NULL DEFAULT 1 COMMENT '0-disabled, 1-active, 2-banned',
    last_login_at   DATETIME        DEFAULT NULL,
    last_login_ip   VARCHAR(45)     DEFAULT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_phone (phone),
    KEY idx_status (status),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User accounts';

CREATE TABLE user_addresses (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    receiver_name   VARCHAR(50)     NOT NULL,
    receiver_phone  VARCHAR(20)     NOT NULL,
    province        VARCHAR(50)     NOT NULL,
    city            VARCHAR(50)     NOT NULL,
    district        VARCHAR(50)     NOT NULL,
    detail_address  VARCHAR(255)    NOT NULL,
    postal_code     VARCHAR(10)     DEFAULT NULL,
    is_default      TINYINT         NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User shipping addresses';
```

### 商品模块

```sql
CREATE TABLE categories (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    parent_id       INT UNSIGNED    DEFAULT 0 COMMENT '0 means root category',
    name            VARCHAR(50)     NOT NULL,
    icon            VARCHAR(255)    DEFAULT NULL,
    sort_order      INT             NOT NULL DEFAULT 0,
    is_visible      TINYINT         NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id),
    KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Product categories (tree structure)';

CREATE TABLE brands (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)    NOT NULL,
    logo_url        VARCHAR(500)    DEFAULT NULL,
    description     TEXT            DEFAULT NULL,
    sort_order      INT             NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Product brands';

CREATE TABLE products (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id     INT UNSIGNED    NOT NULL,
    brand_id        INT UNSIGNED    DEFAULT NULL,
    name            VARCHAR(200)    NOT NULL,
    subtitle        VARCHAR(255)    DEFAULT NULL,
    main_image      VARCHAR(500)    DEFAULT NULL,
    sub_images      JSON            DEFAULT NULL COMMENT 'Array of image URLs',
    detail          TEXT            DEFAULT NULL COMMENT 'Product detail HTML',
    detail_html     MEDIUMTEXT      DEFAULT NULL,
    price_min       DECIMAL(10,2)   NOT NULL COMMENT 'Minimum SKU price',
    price_max       DECIMAL(10,2)   NOT NULL COMMENT 'Maximum SKU price',
    status          TINYINT         NOT NULL DEFAULT 0 COMMENT '0-draft, 1-on_sale, 2-off_sale, 3-deleted',
    sort_order      INT             NOT NULL DEFAULT 0,
    sales_count     INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_category_id (category_id),
    KEY idx_brand_id (brand_id),
    KEY idx_status_sort (status, sort_order),
    KEY idx_price_min (price_min),
    KEY idx_sales_count (sales_count),
    KEY idx_name (name),
    FULLTEXT KEY ft_name_subtitle (name, subtitle),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Product SPU';

CREATE TABLE product_skus (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id      BIGINT UNSIGNED NOT NULL,
    sku_code        VARCHAR(64)     NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    attributes      JSON            NOT NULL COMMENT 'SKU attributes, e.g. {"color":"red","size":"XL"}',
    price           DECIMAL(10,2)   NOT NULL,
    original_price  DECIMAL(10,2)   DEFAULT NULL,
    stock           INT UNSIGNED    NOT NULL DEFAULT 0,
    low_stock       INT UNSIGNED    NOT NULL DEFAULT 10 COMMENT 'Low stock threshold',
    sales           INT UNSIGNED    NOT NULL DEFAULT 0,
    image_url       VARCHAR(500)    DEFAULT NULL,
    status          TINYINT         NOT NULL DEFAULT 1 COMMENT '0-disabled, 1-enabled',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_sku_code (sku_code),
    KEY idx_product_id (product_id),
    KEY idx_price (price),
    KEY idx_stock (stock),
    CONSTRAINT fk_sku_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Product SKU';
```

### 购物车模块

```sql
CREATE TABLE cart_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    sku_id          BIGINT UNSIGNED NOT NULL,
    quantity        INT UNSIGNED    NOT NULL DEFAULT 1,
    checked         TINYINT         NOT NULL DEFAULT 1 COMMENT '0-unchecked, 1-checked',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_sku (user_id, sku_id),
    KEY idx_user_id (user_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_sku FOREIGN KEY (sku_id) REFERENCES product_skus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Shopping cart items';
```

### 订单模块

```sql
CREATE TABLE orders (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_no        VARCHAR(32)     NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    total_amount    DECIMAL(12,2)   NOT NULL,
    pay_amount      DECIMAL(12,2)   NOT NULL COMMENT 'Actual payment amount',
    freight_amount  DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    pay_type        TINYINT         DEFAULT NULL COMMENT '1-alipay, 2-wechat, 3-card',
    status          TINYINT         NOT NULL DEFAULT 0 COMMENT '0-pending, 1-paid, 2-shipped, 3-delivered, 4-cancelled, 5-refunding, 6-refunded',
    receiver_name   VARCHAR(50)     NOT NULL,
    receiver_phone  VARCHAR(20)     NOT NULL,
    receiver_address VARCHAR(500)   NOT NULL,
    remark          VARCHAR(500)    DEFAULT NULL,
    paid_at         DATETIME        DEFAULT NULL,
    shipped_at      DATETIME        DEFAULT NULL,
    delivered_at    DATETIME        DEFAULT NULL,
    cancelled_at    DATETIME        DEFAULT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_user_id (user_id),
    KEY idx_status (status),
    KEY idx_created_at (created_at),
    KEY idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Orders';

CREATE TABLE order_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    sku_id          BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    product_name    VARCHAR(200)    NOT NULL COMMENT 'Snapshot at order time',
    sku_name        VARCHAR(200)    NOT NULL,
    sku_attributes  JSON            DEFAULT NULL,
    product_image   VARCHAR(500)    DEFAULT NULL,
    price           DECIMAL(10,2)   NOT NULL COMMENT 'Unit price at order time',
    quantity        INT UNSIGNED    NOT NULL,
    subtotal        DECIMAL(12,2)   NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_product_id (product_id),
    KEY idx_sku_id (sku_id),
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_item_sku FOREIGN KEY (sku_id) REFERENCES product_skus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Order line items';

CREATE TABLE payments (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    transaction_no  VARCHAR(64)     DEFAULT NULL COMMENT 'Third-party payment transaction number',
    pay_type        TINYINT         NOT NULL COMMENT '1-alipay, 2-wechat, 3-card',
    amount          DECIMAL(12,2)   NOT NULL,
    status          TINYINT         NOT NULL DEFAULT 0 COMMENT '0-pending, 1-success, 2-failed, 3-refunded',
    paid_at         DATETIME        DEFAULT NULL,
    callback_data   JSON            DEFAULT NULL COMMENT 'Payment gateway callback data',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_id (order_id),
    KEY idx_transaction_no (transaction_no),
    KEY idx_status (status),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Payment records';
```

## 常用查询

### 商品搜索与筛选

```sql
SELECT p.id, p.name, p.subtitle, p.main_image, p.price_min, p.price_max,
       p.sales_count, c.name AS category_name, b.name AS brand_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.status = 1
  AND p.category_id = 5
  AND p.price_min BETWEEN 100 AND 500
ORDER BY p.sales_count DESC
LIMIT 20 OFFSET 0;
```

### 用户订单查询

```sql
SELECT o.order_no, o.total_amount, o.status, o.created_at,
       oi.product_name, oi.sku_name, oi.price, oi.quantity, oi.subtotal
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 1001
ORDER BY o.created_at DESC
LIMIT 10;
```

### 销售统计

```sql
SELECT DATE(o.created_at) AS order_date,
       COUNT(DISTINCT o.id) AS order_count,
       SUM(o.pay_amount) AS total_revenue,
       AVG(o.pay_amount) AS avg_order_value
FROM orders o
WHERE o.status IN (1, 2, 3)
  AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;
```

### 热销商品排行

```sql
SELECT p.id, p.name, p.main_image,
       SUM(oi.quantity) AS total_sold,
       SUM(oi.subtotal) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status IN (1, 2, 3)
  AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY p.id, p.name, p.main_image
ORDER BY total_sold DESC
LIMIT 20;
```

### 库存预警

```sql
SELECT s.id, s.sku_code, s.name, s.stock, s.low_stock,
       p.name AS product_name
FROM product_skus s
JOIN products p ON s.product_id = p.id
WHERE s.stock <= s.low_stock
  AND s.status = 1
  AND p.status = 1
ORDER BY s.stock ASC;
```

## 索引优化策略

### 索引设计原则

1. **选择性高的列优先** -- 区分度高的列建索引效果更好
2. **覆盖索引** -- 查询的列都在索引中，无需回表
3. **最左前缀** -- 联合索引遵循最左前缀匹配
4. **避免冗余索引** -- (a,b) 包含 (a)，不需要单独建 (a)
5. **控制索引数量** -- 每个索引增加写入开销

### 典型优化案例

```sql
-- 优化前：全表扫描
SELECT * FROM orders WHERE user_id = 1001 AND status = 1;

-- 优化后：使用联合索引
ALTER TABLE orders ADD INDEX idx_user_status (user_id, status);

-- 覆盖索引优化
SELECT order_no, total_amount, created_at
FROM orders
WHERE user_id = 1001 AND status = 1;
-- 联合索引 idx_user_status (user_id, status, created_at, total_amount) 可覆盖
```

## 扩展方向

1. **分库分表** -- 订单表按用户 ID 分片
2. **读写分离** -- 主从复制，读走从库
3. **缓存层** -- Redis 缓存热点商品和库存
4. **ES 搜索** -- Elasticsearch 替代 MySQL 全文搜索
5. **数据仓库** -- 订单数据同步到 ClickHouse 做分析
6. **消息队列** -- 订单创建发送 MQ 异步处理库存扣减

---

## 关键代码速查

### 建表模板

```sql
CREATE TABLE table_name (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- columns
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_col (col)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 联合索引

```sql
ALTER TABLE orders ADD INDEX idx_user_status_created (user_id, status, created_at);
-- 查询 WHERE user_id = ? AND status = ? 可使用前两列
-- 查询 WHERE user_id = ? 可使用第一列
-- 查询 WHERE status = ? 无法使用此索引
```

### EXPLAIN 分析

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 1001;
-- 关注：type（ref/range 优于 ALL），key（使用了哪个索引），rows（预估扫描行数）
```

### 事务处理

```sql
START TRANSACTION;
UPDATE product_skus SET stock = stock - 1 WHERE id = 100 AND stock >= 1;
INSERT INTO orders (...) VALUES (...);
COMMIT;
```
