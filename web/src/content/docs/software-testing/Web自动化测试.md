---
order: 55
title: Selenium
module: 'software-testing'
category: 'eng-infra'
difficulty: intermediate
description: 'Selenium Web自动化测试：WebDriver、定位策略、框架设计与最佳实践详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/等价类划分'
  - 'software-testing/边界值分析'
  - 'software-testing/Python测试框架'
  - 'software-testing/Java单元测试'
prerequisites:
  - 'software-testing/测试基础与方法'
---

## 1. Selenium 概述

### 1.1 组件

| 组件      | 描述             |
| --------- | ---------------- |
| WebDriver | 浏览器自动化 API |
| IDE       | 录制回放插件     |
| Grid      | 分布式测试执行   |

### 1.2 WebDriver 架构

```
测试代码 → WebDriver API → Browser Driver → 浏览器
```

## 2. 环境搭建

### 2.1 Python + Selenium

```bash
pip install selenium
pip install pytest
```

### 2.2 基础示例

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://example.com")

# 查找元素
element = driver.find_element(By.ID, "username")
element.send_keys("admin")

# 点击
driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

# 断言
assert "Dashboard" in driver.title

driver.quit()
```

## 3. 元素定位

### 3.1 定位策略

| 策略    | By 常量              | 示例                                                 |
| ------- | -------------------- | ---------------------------------------------------- |
| ID      | By.ID                | `find_element(By.ID, "login-btn")`                   |
| Name    | By.NAME              | `find_element(By.NAME, "email")`                     |
| Class   | By.CLASS_NAME        | `find_element(By.CLASS_NAME, "btn-primary")`         |
| CSS     | By.CSS_SELECTOR      | `find_element(By.CSS_SELECTOR, "#login .btn")`       |
| XPath   | By.XPATH             | `find_element(By.XPATH, "//button[@type='submit']")` |
| Tag     | By.TAG_NAME          | `find_element(By.TAG_NAME, "input")`                 |
| Link    | By.LINK_TEXT         | `find_element(By.LINK_TEXT, "Login")`                |
| Partial | By.PARTIAL_LINK_TEXT | `find_element(By.PARTIAL_LINK_TEXT, "Log")`          |

### 3.2 推荐优先级

```
ID > CSS Selector > XPath > 其他
```

## 4. 等待机制

### 4.1 显式等待

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 等待元素可见
element = WebDriverWait(driver, 10).until(
    EC.visibility_of_element_located((By.ID, "result"))
)

# 等待元素可点击
element = WebDriverWait(driver, 10).until(
    EC.element_to_be_clickable((By.CSS_SELECTOR, ".submit-btn"))
)
```

### 4.2 常用 Expected Conditions

| 条件                            | 描述           |
| ------------------------------- | -------------- |
| `visibility_of_element_located` | 元素可见       |
| `element_to_be_clickable`       | 元素可点击     |
| `presence_of_element_located`   | 元素存在于 DOM |
| `text_to_be_present_in_element` | 文本出现       |
| `title_contains`                | 标题包含       |
| `url_contains`                  | URL 包含       |

### 4.3 隐式等待

```python
driver.implicitly_wait(10)  # 全局等待 10 秒
```

> 注意：不要混用显式和隐式等待。

## 5. Page Object 模式

### 5.1 页面对象

```python
# pages/login_page.py
from selenium.webdriver.common.by import By

class LoginPage:
    def __init__(self, driver):
        self.driver = driver
        self.username_input = (By.ID, "username")
        self.password_input = (By.ID, "password")
        self.login_button = (By.CSS_SELECTOR, "button[type='submit']")

    def login(self, username, password):
        self.driver.find_element(*self.username_input).send_keys(username)
        self.driver.find_element(*self.password_input).send_keys(password)
        self.driver.find_element(*self.login_button).click()
```

### 5.2 测试用例

```python
# tests/test_login.py
import pytest
from selenium import webdriver
from pages.login_page import LoginPage

class TestLogin:
    @pytest.fixture
    def driver(self):
        driver = webdriver.Chrome()
        driver.get("https://example.com/login")
        yield driver
        driver.quit()

    def test_successful_login(self, driver):
        login_page = LoginPage(driver)
        login_page.login("admin", "password123")
        assert "Dashboard" in driver.title

    def test_invalid_password(self, driver):
        login_page = LoginPage(driver)
        login_page.login("admin", "wrong")
        assert "Invalid credentials" in driver.page_source
```

## 6. 高级操作

### 6.1 多窗口

```python
# 切换到新窗口
driver.switch_to.window(driver.window_handles[-1])

# 切换回主窗口
driver.switch_to.window(driver.window_handles[0])
```

### 6.2 iframe

```python
driver.switch_to.frame("iframe-id")
# 操作 iframe 内元素
driver.switch_to.default_content()
```

### 6.3 下拉选择

```python
from selenium.webdriver.support.select import Select

select = Select(driver.find_element(By.ID, "country"))
select.select_by_visible_text("China")
select.select_by_value("CN")
select.select_by_index(0)
```

### 6.4 截图

```python
driver.save_screenshot("screenshot.png")
element.screenshot("element.png")
```

## 7. 最佳实践

| 实践        | 描述                 |
| ----------- | -------------------- |
| Page Object | 封装页面元素和操作   |
| 显式等待    | 避免硬编码 sleep     |
| 数据驱动    | 分离测试数据         |
| 截图失败    | 失败时自动截图       |
| 并行执行    | Grid/多线程          |
| CI 集成     | Headless 模式        |
| 优先 CSS    | CSS 选择器优于 XPath |
