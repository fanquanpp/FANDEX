---
order: 100
title: Selenium
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: Selenium Web自动化测试：WebDriver、定位策略、框架设计与最佳实践详解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'software-testing/008-EquivalenceClassPartition'
  - 'software-testing/009-BoundaryValueAnalysis'
prerequisites:
  - 'software-testing/001-TestBasicsMethod'
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
## WebDriver 初始化

**换行写法：初始化浏览器驱动**
`from selenium import webdriver`
`driver = webdriver.<Browser>()`

```python
# 初始化各浏览器驱动
from selenium import webdriver

driver = webdriver.Chrome()         # Chrome 浏览器
driver = webdriver.Firefox()        # Firefox 浏览器
driver = webdriver.Edge()           # Edge 浏览器
driver.get("https://example.com")
driver.quit()
```

---

## Options 配置

**换行写法：配置浏览器选项**
`options = webdriver.<Browser>Options()`
`options.add_argument("<参数>")`
`driver = webdriver.<Browser>(options=options)`

```python
# 无头模式与窗口配置
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("--headless")
options.add_argument("--window-size=1920,1080")
options.add_argument("--disable-gpu")
driver = webdriver.Chrome(options=options)
```

---

## 元素定位

**基本写法：定位页面元素**
`driver.find_element(By.<方式>, "<值>")`
`driver.find_elements(By.<方式>, "<值>")`

```python
# Selenium 4 元素定位方式
from selenium.webdriver.common.by import By

driver.find_element(By.ID, "username")
driver.find_element(By.NAME, "password")
driver.find_element(By.CLASS_NAME, "btn-primary")
driver.find_element(By.TAG_NAME, "input")
driver.find_element(By.CSS_SELECTOR, "div.container > p")
driver.find_element(By.XPATH, "//div[@id='main']")
```

---

## 元素交互

**基本写法：与元素交互**
`<element>.send_keys(<文本>)`
`<element>.click()`
`<element>.clear()`

```python
# 输入文本、点击与清空
search = driver.find_element(By.NAME, "q")
search.clear()
search.send_keys("Selenium")
search.send_keys(Keys.RETURN)
driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
```

---

## Keys 键盘操作

**基本写法：模拟键盘按键**
`<element>.send_keys(Keys.<KEY>)`

```python
# 模拟键盘按键
from selenium.webdriver.common.keys import Keys

search.send_keys(Keys.ENTER)
search.send_keys(Keys.TAB)
search.send_keys(Keys.CONTROL, "a")
```

---

## ActionChains 鼠标操作

**换行写法：复杂鼠标交互**
`actions = ActionChains(driver)`
`actions.<操作>().perform()`

```python
# 鼠标悬停、右键、双击、拖拽
from selenium.webdriver.common.action_chains import ActionChains

actions = ActionChains(driver)
actions.move_to_element(menu).perform()         # 悬停
actions.context_click(element).perform()        # 右键
actions.double_click(element).perform()         # 双击
actions.drag_and_drop(src, dst).perform()       # 拖拽
```

---

## 等待机制

**换行写法：显式等待**
`from selenium.webdriver.support.ui import WebDriverWait`
`from selenium.webdriver.support import expected_conditions as EC`
`element = WebDriverWait(driver, <秒>).until(EC.<条件>((By.<方式>, "<值>")))`

```python
# 显式等待元素出现
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

element = WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.ID, "result"))
)
```

---

## expected_conditions 常用条件

**基本写法：常用等待条件**
`EC.presence_of_element_located(<定位器>)`
`EC.visibility_of_element_located(<定位器>)`
`EC.element_to_be_clickable(<定位器>)`
`EC.title_contains("<文本>")`

```python
# 常用 EC 条件
EC.presence_of_element_located((By.ID, "x"))
EC.visibility_of_element_located((By.ID, "x"))
EC.element_to_be_clickable((By.ID, "x"))
EC.title_contains("首页")
EC.text_to_be_present_in_element((By.ID, "x"), "hello")
```

---

## 隐式等待

**基本写法：全局隐式等待**
`driver.implicitly_wait(<秒>)`

```python
# 设置全局元素查找超时
driver.implicitly_wait(10)
```

---

## 页面信息

**基本写法：获取页面信息**
`driver.title`
`driver.current_url`
`driver.page_source`

```python
# 获取页面标题、URL、源码
assert "首页" in driver.title
assert driver.current_url.endswith("/home")
html = driver.page_source
```

---

## 元素属性

**基本写法：获取元素属性**
`<element>.text`
`<element>.get_attribute("<属性名>")`
`<element>.is_displayed()`
`<element>.is_enabled()`

```python
# 获取元素文本与属性
element = driver.find_element(By.ID, "msg")
text = element.text
href = element.get_attribute("href")
visible = element.is_displayed()
enabled = element.is_enabled()
```

---

## 窗口与标签页

**基本写法：管理浏览器窗口与标签页**
`driver.switch_to.window(<句柄>)`
`driver.window_handles`
`driver.switch_to.frame(<frame>)`

```python
# 切换窗口与 iframe
driver.switch_to.window(driver.window_handles[1])
driver.switch_to.default_content()
driver.switch_to.frame("frame-name")
driver.switch_to.parent_frame()
```

---

## Alert 弹窗处理

**基本写法：处理 JS 弹窗**
`alert = driver.switch_to.alert`
`alert.accept()` | `alert.dismiss()` | `alert.send_keys("<文本>")`

```python
# 接受、取消、输入 alert 弹窗
alert = driver.switch_to.alert
alert_text = alert.text
alert.send_keys("input")
alert.accept()
alert.dismiss()
```

---

## 截图

**基本写法：保存页面截图**
`driver.save_screenshot("<文件路径>")`
`<element>.screenshot("<文件路径>")`

```python
# 页面截图与元素截图
driver.save_screenshot("page.png")
element = driver.find_element(By.ID, "logo")
element.screenshot("logo.png")
```

---

## pytest 集成

**换行写法：pytest 与 Selenium 集成**
`@pytest.fixture`
`def driver():`
`    driver = webdriver.Chrome()`
`    yield driver`
`    driver.quit()`

```python
# 使用 fixture 管理 WebDriver 生命周期
import pytest
from selenium import webdriver

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    driver = webdriver.Chrome(options=options)
    yield driver
    driver.quit()

def test_title(driver):
    driver.get("https://example.com")
    assert "Example" in driver.title
```
