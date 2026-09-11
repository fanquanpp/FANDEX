---
order: 90
title: Selenium
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: Selenium Web自动化测试：WebDriver、定位策略、框架设计与最佳实践详解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/050-EquivalenceClassPartition'
  - 'software-testing/060-BoundaryValueAnalysis'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 1. Selenium 概述

Selenium 是历史最悠久的浏览器自动化框架，核心是 WebDriver 协议（W3C 标准）：
测试代码通过它驱动真实浏览器完成点击、输入、断言。适合遗留系统回归、
跨浏览器兼容验证；新建 Web 项目则建议优先评估 Playwright 或 Cypress
（见「自动化测试框架对比」一文）。

前置知识：HTML/CSS 基础（选择器）、Python 基础、pytest 基本用法。

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

每个浏览器由对应的 Driver 进程代理（ChromeDriver、GeckoDriver 等），
这也是 Selenium 比 Playwright 慢的原因之一——每次指令都走一次 HTTP 往返。

## 2. 环境搭建

### 2.1 Python + Selenium

```bash
pip install selenium pytest
```

Selenium 4.6 起内置 Selenium Manager，会自动下载并缓存匹配的浏览器驱动，
不再需要手工维护 chromedriver 或引入 webdriver-manager 这类第三方包。

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

### 6.5 Alert 弹窗处理

```python
# 原生 alert/confirm/prompt 必须先切换到弹窗才能操作
alert = driver.switch_to.alert
print(alert.text)      # 读取弹窗文本
alert.accept()         # 点击「确定」
# alert.dismiss()     # 点击「取消」
# alert.send_keys("输入内容")  # 针对 prompt
```

### 6.6 ActionChains 鼠标与键盘动作

```python
from selenium.webdriver.common.action_chains import ActionChains

menu = driver.find_element(By.ID, "menu")
submenu = driver.find_element(By.ID, "submenu")

actions = ActionChains(driver)
actions.move_to_element(menu)   # 悬停展开菜单
actions.click(submenu)          # 点击子项
actions.perform()               # 真正执行动作队列
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

## 小结

- 初学者要点：Selenium 的组件模型是「WebDriver 驱动浏览器、IDE 录制、
  Grid 并行」；定位优先 ID，其次 CSS 选择器；等待一律用显式等待
  （`WebDriverWait` + `expected_conditions`），`sleep` 是 flaky 的头号来源。
- 进阶注意：Page Object 只封装「定位与操作」，不要把断言埋进页面对象；
  Selenium Manager（4.6+）接管了驱动管理，不要再手工维护 chromedriver；
  每条指令一次 HTTP 往返的协议特性决定了它比 Playwright 慢——选型时用
  真实约束（遗留浏览器、团队语言）而非习惯做决定（对比详见「自动化测试
  框架对比」）。
