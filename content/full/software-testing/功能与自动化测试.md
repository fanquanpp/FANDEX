---
order: 2
title: 功能与自动化测试
module: 'software-testing'
category: 软件测试
difficulty: intermediate
description: '功能测试执行、自动化测试脚本编写、Selenium 框架、Unittest/pytest 框架、测试数据管理与页面对象模式。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/测试基础与方法'
  - 'software-testing/性能与接口测试'
  - 'software-testing/安全与移动测试'
prerequisites: []
---

## 1. 功能测试执行

### 1.1 功能测试流程

```
需求分析 → 用例设计 → 用例评审 → 测试执行 → 缺陷提交 → 回归验证 → 测试报告
```

### 1.2 功能测试要点

| 要点         | 说明                           |
| :----------- | :----------------------------- |
| **正向验证** | 验证功能正常流程是否正确       |
| **逆向验证** | 验证异常输入是否正确处理       |
| **边界验证** | 验证边界值和临界条件           |
| **交互验证** | 验证功能间的联动和影响         |
| **数据验证** | 验证数据的增删改查和一致性     |
| **兼容验证** | 验证不同浏览器/设备/系统的表现 |

### 1.3 缺陷报告

```yaml
缺陷编号: BUG-2026-001
标题: 用户登录后页面跳转失败
严重程度: 严重
优先级: 高
复现步骤: 1. 打开登录页面
  2. 输入正确用户名和密码
  3. 点击登录按钮
预期结果: 跳转到首页
实际结果: 停留在登录页面，控制台报 500 错误
环境: Chrome 120 / Windows 11 / 测试环境
附件: screenshot.png
```

## 2. Selenium 测试框架

### 2.1 Selenium 体系

| 组件                   | 说明               |
| :--------------------- | :----------------- |
| **Selenium WebDriver** | 浏览器自动化驱动   |
| **Selenium IDE**       | 浏览器录制回放插件 |
| **Selenium Grid**      | 分布式并行测试     |

### 2.2 环境搭建

```bash
# 安装 Selenium
pip install selenium

# 下载浏览器驱动（或使用 webdriver-manager 自动管理）
pip install webdriver-manager
```

### 2.3 WebDriver 基础操作

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# 初始化浏览器
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

# 打开页面
driver.get("https://www.example.com/login")

# 获取页面信息
print(driver.title)
print(driver.current_url)

# 退出浏览器
driver.quit()
```

### 2.4 元素定位策略

```python
from selenium.webdriver.common.by import By

# ID 定位（推荐，最快）
element = driver.find_element(By.ID, "username")

# Name 定位
element = driver.find_element(By.NAME, "password")

# Class 定位
element = driver.find_element(By.CLASS_NAME, "btn-primary")

# CSS 选择器（推荐，灵活）
element = driver.find_element(By.CSS_SELECTOR, "#login-form input[type='text']")
element = driver.find_element(By.CSS_SELECTOR, "div.card > h2.title")

# XPath 定位（最强大）
element = driver.find_element(By.XPATH, "//input[@id='username']")
element = driver.find_element(By.XPATH, "//button[contains(text(), '登录')]")
element = driver.find_element(By.XPATH, "//form[@id='login']//input[1]")

# Link Text 定位
element = driver.find_element(By.LINK_TEXT, "忘记密码")
element = driver.find_element(By.PARTIAL_LINK_TEXT, "忘记")

# Tag Name 定位
elements = driver.find_elements(By.TAG_NAME, "input")
```

### 2.5 定位策略对比

| 策略      | 速度 | 可读性 | 稳定性 | 推荐场景       |
| :-------- | :--- | :----- | :----- | :------------- |
| **ID**    | 最快 | 高     | 高     | 有唯一 ID 时   |
| **CSS**   | 快   | 中     | 高     | 通用首选       |
| **XPath** | 较慢 | 低     | 中     | 复杂定位       |
| **Name**  | 快   | 高     | 中     | 表单元素       |
| **Class** | 快   | 中     | 低     | 不推荐单独使用 |

### 2.6 显式等待

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

# 显式等待（推荐）
wait = WebDriverWait(driver, timeout=10, poll_frequency=0.5)

# 等待元素可见
element = wait.until(EC.visibility_of_element_located((By.ID, "username")))

# 等待元素可点击
element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".btn-login")))

# 等待文本出现
wait.until(EC.text_to_be_present_in_element((By.ID, "message"), "登录成功"))

# 等待页面标题
wait.until(EC.title_contains("首页"))

# 自定义等待条件
wait.until(lambda d: d.find_element(By.ID, "status").get_attribute("data-loaded") == "true")
```

### 2.7 完整登录测试示例

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pytest


class TestLogin:
    """登录功能测试"""

    def setup_method(self):
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.get("https://www.example.com/login")
        self.driver.maximize_window()

    def teardown_method(self):
        self.driver.quit()

    def test_login_success(self):
        """正常登录"""
        # 输入用户名
        username = self.wait.until(EC.visibility_of_element_located((By.ID, "username")))
        username.send_keys("admin")

        # 输入密码
        password = self.driver.find_element(By.ID, "password")
        password.send_keys("123456")

        # 点击登录
        login_btn = self.driver.find_element(By.CSS_SELECTOR, ".btn-login")
        login_btn.click()

        # 验证跳转
        self.wait.until(EC.title_contains("首页"))
        assert "首页" in self.driver.title

    def test_login_wrong_password(self):
        """错误密码登录"""
        username = self.wait.until(EC.visibility_of_element_located((By.ID, "username")))
        username.send_keys("admin")

        password = self.driver.find_element(By.ID, "password")
        password.send_keys("wrong_password")

        login_btn = self.driver.find_element(By.CSS_SELECTOR, ".btn-login")
        login_btn.click()

        # 验证错误提示
        error_msg = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".error-message"))
        )
        assert "用户名或密码错误" in error_msg.text

    def test_login_empty_fields(self):
        """空字段登录"""
        login_btn = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".btn-login"))
        )
        login_btn.click()

        # 验证必填提示
        username_error = self.driver.find_element(By.CSS_SELECTOR, "#username-error")
        assert "请输入用户名" in username_error.text
```

## 3. Unittest 测试框架

### 3.1 基础结构

```python
import unittest


class Calculator:
    """被测类"""
    def add(self, a, b):
        return a + b

    def divide(self, a, b):
        if b == 0:
            raise ValueError("除数不能为零")
        return a / b


class TestCalculator(unittest.TestCase):
    """计算器测试"""

    def setUp(self):
        """每个测试方法前执行"""
        self.calc = Calculator()

    def tearDown(self):
        """每个测试方法后执行"""
        pass

    @classmethod
    def setUpClass(cls):
        """所有测试前执行一次"""
        print("测试开始")

    @classmethod
    def tearDownClass(cls):
        """所有测试后执行一次"""
        print("测试结束")

    def test_add(self):
        self.assertEqual(self.calc.add(2, 3), 5)
        self.assertEqual(self.calc.add(-1, 1), 0)
        self.assertEqual(self.calc.add(0, 0), 0)

    def test_divide(self):
        self.assertEqual(self.calc.divide(6, 3), 2.0)
        self.assertAlmostEqual(self.calc.divide(1, 3), 0.333, places=2)

    def test_divide_by_zero(self):
        with self.assertRaises(ValueError):
            self.calc.divide(1, 0)


if __name__ == '__main__':
    unittest.main()
```

### 3.2 常用断言

| 断言方法                          | 说明       |
| :-------------------------------- | :--------- |
| `assertEqual(a, b)`               | 相等       |
| `assertNotEqual(a, b)`            | 不相等     |
| `assertTrue(x)`                   | 为真       |
| `assertFalse(x)`                  | 为假       |
| `assertIs(a, b)`                  | 是同一对象 |
| `assertIsNone(x)`                 | 为 None    |
| `assertIn(a, b)`                  | a 在 b 中  |
| `assertRaises(Exception)`         | 抛出异常   |
| `assertAlmostEqual(a, b, places)` | 近似相等   |

## 4. pytest 测试框架

### 4.1 基础用法

```python
import pytest

# 简单测试函数
def test_addition():
    assert 1 + 1 == 2

def test_string_upper():
    assert "hello".upper() == "HELLO"

# 参数化测试
@pytest.mark.parametrize("input_val, expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (0, 0),
    (-1, -2),
])
def test_double(input_val, expected):
    assert input_val * 2 == expected
```

### 4.2 Fixture 机制

```python
import pytest

@pytest.fixture
def sample_data():
    """提供测试数据"""
    return {"name": "张三", "age": 25, "email": "zhangsan@example.com"}

@pytest.fixture
def db_connection():
    """模拟数据库连接"""
    conn = {"connected": True, "data": []}
    yield conn  # yield 之前的代码是 setup
    conn["connected"] = False  # yield 之后的代码是 teardown

def test_user_name(sample_data):
    assert sample_data["name"] == "张三"

def test_db_connection(db_connection):
    assert db_connection["connected"] is True
    db_connection["data"].append("record1")
    assert len(db_connection["data"]) == 1
```

### 4.3 Fixture 作用域

| 作用域       | 说明                         |
| :----------- | :--------------------------- |
| **function** | 每个测试函数执行一次（默认） |
| **class**    | 每个测试类执行一次           |
| **module**   | 每个模块执行一次             |
| **session**  | 整个测试会话执行一次         |

```python
@pytest.fixture(scope="session")
def app_client():
    """整个测试会话只初始化一次"""
    client = create_test_client()
    yield client
    client.close()

@pytest.fixture(scope="module")
def test_db():
    """每个模块初始化一次"""
    db = init_test_db()
    yield db
    db.cleanup()
```

### 4.4 标记（Mark）

```python
import pytest

@pytest.mark.slow
def test_large_dataset():
    """慢速测试"""
    pass

@pytest.mark.smoke
def test_basic_function():
    """冒烟测试"""
    pass

@pytest.mark.skip(reason="功能未实现")
def test_future_feature():
    pass

@pytest.mark.xfail(reason="已知缺陷 BUG-001")
def test_known_bug():
    assert 1 == 2

# 运行指定标记
# pytest -m smoke        只运行冒烟测试
# pytest -m "not slow"   排除慢速测试
```

### 4.5 pytest 配置文件

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
markers =
    smoke: 冒烟测试
    slow: 慢速测试
    regression: 回归测试
```

## 5. 测试数据管理

### 5.1 数据驱动测试

```python
import pytest
import csv
import json

# CSV 数据驱动
def load_test_data_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

# JSON 数据驱动
def load_test_data_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# 使用数据驱动
@pytest.mark.parametrize("data", load_test_data_json("test_data/login.json"))
def test_login_data_driven(data):
    assert login(data["username"], data["password"]) == data["expected"]
```

### 5.2 测试数据文件

```json
// test_data/login.json
[
  { "username": "admin", "password": "123456", "expected": "success" },
  { "username": "admin", "password": "wrong", "expected": "wrong_password" },
  { "username": "", "password": "123456", "expected": "empty_username" },
  { "username": "admin", "password": "", "expected": "empty_password" },
  { "username": "hack' OR 1=1--", "password": "any", "expected": "invalid_input" }
]
```

## 6. 页面对象模式（POM）

### 6.1 POM 架构

```
project/
├── pages/              # 页面对象层
│   ├── base_page.py    # 基础页面
│   ├── login_page.py   # 登录页面
│   └── home_page.py    # 首页
├── tests/              # 测试层
│   ├── test_login.py
│   └── test_home.py
└── test_data/          # 数据层
    └── login.json
```

### 6.2 基础页面封装

```python
# pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class BasePage:
    """页面基类，封装通用操作"""

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def find_element(self, locator):
        """查找元素（显式等待）"""
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator):
        """点击元素"""
        element = self.wait.until(EC.element_to_be_clickable(locator))
        element.click()

    def type_text(self, locator, text):
        """输入文本"""
        element = self.find_element(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator):
        """获取文本"""
        return self.find_element(locator).text

    def is_visible(self, locator):
        """元素是否可见"""
        try:
            self.find_element(locator)
            return True
        except Exception:
            return False

    def wait_for_url_contains(self, text):
        """等待 URL 包含指定文本"""
        self.wait.until(EC.url_contains(text))
```

### 6.3 登录页面对象

```python
# pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LoginPage(BasePage):
    """登录页面对象"""

    # 元素定位器
    USERNAME_INPUT = (By.ID, "username")
    PASSWORD_INPUT = (By.ID, "password")
    LOGIN_BUTTON = (By.CSS_SELECTOR, ".btn-login")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error-message")
    REMEMBER_CHECKBOX = (By.ID, "remember")

    # 页面 URL
    URL = "/login"

    def open(self):
        self.driver.get(f"{self.base_url}{self.URL}")
        return self

    def login(self, username: str, password: str):
        """执行登录操作"""
        self.type_text(self.USERNAME_INPUT, username)
        self.type_text(self.PASSWORD_INPUT, password)
        self.click(self.LOGIN_BUTTON)
        return self

    def get_error_message(self) -> str:
        """获取错误提示"""
        return self.get_text(self.ERROR_MESSAGE)

    def is_login_button_enabled(self) -> bool:
        """登录按钮是否可用"""
        return self.find_element(self.LOGIN_BUTTON).is_enabled()
```

### 6.4 使用 POM 的测试

```python
# tests/test_login.py
import pytest
from pages.login_page import LoginPage


class TestLogin:
    """登录测试 - 使用 POM 模式"""

    def test_login_success(self, driver):
        login_page = LoginPage(driver)
        login_page.open()
        login_page.login("admin", "123456")

        # 验证跳转到首页
        assert "首页" in driver.title

    def test_login_wrong_password(self, driver):
        login_page = LoginPage(driver)
        login_page.open()
        login_page.login("admin", "wrong")

        # 验证错误提示
        assert "用户名或密码错误" in login_page.get_error_message()

    @pytest.mark.parametrize("username,password,expected_msg", [
        ("", "123456", "请输入用户名"),
        ("admin", "", "请输入密码"),
        ("admin", "wrong", "用户名或密码错误"),
    ])
    def test_login_invalid(self, driver, username, password, expected_msg):
        login_page = LoginPage(driver)
        login_page.open()
        login_page.login(username, password)
        assert expected_msg in login_page.get_error_message()
```

### 6.5 POM 优势

| 优势         | 说明                                    |
| :----------- | :-------------------------------------- |
| **可维护性** | UI 变更只需修改页面对象，不影响测试用例 |
| **可复用性** | 页面操作方法可在多个测试中复用          |
| **可读性**   | 测试代码更接近业务语言                  |
| **团队协作** | 页面对象与测试用例可并行开发            |
