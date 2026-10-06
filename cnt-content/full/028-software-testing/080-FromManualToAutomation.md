---
order: 120
title: 从手工到自动化
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: 从手工功能测试走到自动化：用一次真实回归理解用例与缺陷报告，再看真实仓库的冒烟测试长什么样，会选自动化边界。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'software-testing/010-TestBasicsMethod'
  - 'software-testing/090-Selenium'
  - 'software-testing/100-Pytest'
  - 'software-testing/220-E2ETest'
prerequisites: []
---

前置知识：知道"测试用例"是什么即可，不需要编程基础——本文从纯手工操作
开始，逐步走到代码。

读完本文你应当能够：独立完成一轮手工功能回归并写出合格的缺陷报告；
判断一个功能值不值得自动化；读懂一个真实仓库的自动化冒烟测试在验证什么。

## 1. 场景：入职第一天，手工回归登录功能

假设你刚进团队，测试负责人说："发布前把登录功能回归一遍。"你手上
只有需求文档和测试环境地址。怎么做？

### 1.1 先列用例，再动手点

不列用例直接乱点，测完说不清"我测过什么"。登录功能的最小用例集：

| 用例       | 输入                     | 预期                   |
| :--------- | :----------------------- | :--------------------- |
| 正向       | 正确用户名 + 正确密码    | 跳转首页               |
| 逆向       | 正确用户名 + 错误密码    | 提示错误，不跳转       |
| 空值边界   | 用户名为空               | 提示"请输入用户名"     |
| 超长边界   | 输入 1000 个字符的用户名 | 不崩溃，给出友好提示   |
| SQL 注入串 | `' OR 1=1--`             | 当普通失败处理，不放行 |

规律就三个词：**正向、逆向、边界**。手工测试的大部分遗漏，都是只测了
正向。边界值与等价类怎么系统化地找，见《等价类划分》《边界值分析》。

### 1.2 发现问题：写一份合格的缺陷报告

假设逆向用例失败了：点了登录按钮页面卡住。你需要提交缺陷报告。
一份让开发不反感的报告长这样：

```yaml
标题: 登录失败后页面无响应，控制台报 500
严重程度: 严重        # 崩溃/主流程阻断；优先级由项目排期定，两者不是一回事
复现步骤:
  - 打开 /login
  - 输入正确用户名与错误密码
  - 点击"登录"按钮
预期结果: 表单下方提示"用户名或密码错误"
实际结果: 页面无任何提示，浏览器控制台显示 POST /api/login 返回 500
环境: Chrome 126 / Windows 11 / 测试环境（2026-09-28 构建）
附件: screenshot.png、console.log
```

三要素缺一不可：**复现步骤**（别人照着能再次触发）、**预期 vs 实际**
（差在哪）、**环境**（换台机器可能不复现）。"登录不了"五个字的缺陷
报告，来回沟通的成本比写报告高十倍。

### 1.3 修完之后：回归的痛苦

开发修好了，你把六条用例再点一遍——十分钟后你意识到：下个迭代还会
改登录，下下个迭代也是。**每一轮回归都在重复完全相同的操作**。这就是
功能测试走向自动化的全部动机：把"人肉重复"变成"机器重复"。

## 2. 动手：看一个真实项目的自动化测试

自动化测试不是抽象概念，看真实仓库最快。FANDEX（就是你正在读的这个
文档站）的 `app-web/tests/smoke.spec.ts` 是一组 Playwright 冒烟测试，
在每次构建后验证站点"还活着"：

```typescript
import { expect, test, type Page } from '@playwright/test';

function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

test('首页渲染：标题、入口按钮与模块卡片', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/');
  await expect(page).toHaveTitle(/FANDEX/i);
  await expect(page.locator('a.entry-btn').first()).toBeVisible();
  expect(errors, '首页不应有未捕获异常').toEqual([]);
});
```

逐行读这段"陌生代码"，会发现它就是手工测试的翻版：

| 手工动作                       | 自动化对应                                       |
| :----------------------------- | :----------------------------------------------- |
| 打开浏览器输入网址             | `page.goto('/FANDEX/')`                          |
| 看一眼标题对不对               | `expect(page).toHaveTitle(...)`                  |
| 找到入口按钮在哪               | `page.locator('a.entry-btn')`                    |
| 打开 F12 看控制台有没有红色报错 | `page.on('pageerror')` 收集后断言为空            |
| 下次发版再点一遍               | 每次构建自动跑一遍                               |

想在本机复现：装好 Node 依赖后执行 `pnpm test:smoke`（内部就是
`playwright test`），浏览器窗口自动打开、自动点击、自动断言。
这个真实例子还藏着一层进阶信息：它**没有**验证任何像素级的视觉效果，
只验证"标题在、按钮在、页面没炸"——这是冒烟测试的定位。什么该自动
化、自动化到什么程度，见下一节。

## 3. 为什么：自动化边界的判断标准

不是所有测试都值得自动化。判断标准一条：**这个检查要不要反复执行，
以及失败时机器能不能自己判断对错**。

- 值得自动化：登录/下单等核心路径回归、API 契约、纯函数逻辑、
  构建产物完整性（如 FANDEX 验证搜索索引生成）。
- 不值得自动化：一次性验证、探索性测试（你根本不知道要点什么）、
  需要人眼判断的视觉美感、频繁改版导致脚本天天重写的页面。

另一个常见误区是"自动化 = UI 自动化"。测试金字塔里 UI 层只占小头，
越往下越快越稳。FANDEX 那条"页面不应有未捕获异常"的断言之所以放在
UI 层，是因为它验证的正是"整页组装"这个层级的问题。层级的完整论述
见《测试层级》。

## 4. 工具链：Python 侧的对应物

上面例子是 TypeScript + Playwright。同样的思路在 Python 世界对应
Selenium（驱动浏览器）+ pytest（组织用例）。本模块有两篇专文：
《Selenium》与《Pytest》，这里只给最小对照，帮你把两边概念接上：

| 概念         | Playwright (TS)         | Selenium + pytest (Python)            |
| :----------- | :---------------------- | :------------------------------------ |
| 打开页面     | `page.goto(url)`        | `driver.get(url)`                     |
| 找元素       | `page.locator(sel)`     | `driver.find_element(By.ID, ...)`     |
| 等待元素     | 内置自动等待            | `WebDriverWait` + 显式等待条件        |
| 组织用例     | `test()` 函数           | `def test_xxx()` 函数                 |
| 用例前置     | `test.beforeEach`       | `@pytest.fixture`                     |

环境注意：Selenium 4.6 起内置 Selenium Manager 自动下载匹配的浏览器
驱动，直接 `webdriver.Chrome()` 即可；老教程里的 `webdriver-manager`
第三方包已不需要。

### 4.1 unittest 与 pytest 怎么选

Python 自带 unittest，无需安装；pytest 是当前社区默认选择。同一件事
两边写法对比，一眼看出 pytest 胜在简洁：

```python
# unittest 写法（标准库自带）
import unittest

class TestCalculator(unittest.TestCase):
    def setUp(self):
        self.calc = Calculator()

    def test_add(self):
        self.assertEqual(self.calc.add(2, 3), 5)

    def test_divide_by_zero(self):
        with self.assertRaises(ValueError):
            self.calc.divide(1, 0)
```

```python
# pytest 写法：普通函数 + 裸 assert，失败时自动给出详细差异
def test_add():
    assert Calculator().add(2, 3) == 5

def test_divide_by_zero():
    with pytest.raises(ValueError):
        Calculator().divide(1, 0)
```

新项目直接 pytest；接手遗留的 unittest 用例不必迁移，pytest 能直接
运行 unittest 风格的测试。

### 4.2 数据驱动：用例与数据分离

第 1 节登录用例表里的五行数据，适合做成数据文件而不是五行复制粘贴
的代码：

```json
[
  { "username": "admin", "password": "123456", "expected": "success" },
  { "username": "admin", "password": "wrong", "expected": "wrong_password" },
  { "username": "", "password": "123456", "expected": "empty_username" },
  { "username": "admin' OR 1=1--", "password": "x", "expected": "invalid_input" }
]
```

```python
import json, pytest

cases = json.load(open("test_data/login.json", encoding="utf-8"))

@pytest.mark.parametrize("case", cases)
def test_login(case):
    assert login(case["username"], case["password"]) == case["expected"]
```

加一条用例只改 JSON 不改代码，非程序员也能补充数据。这就是"数据驱动"。

## 5. 坑点与自检

1. **等待写死**。`time.sleep(3)` 等页面加载是 UI 自动化第一大坑：网快了
   白等，网慢了照样挂。用显式等待（条件满足立刻继续）代替固定睡眠。
2. **定位器脆**。用 `div:nth-child(3) > span` 这种结构定位，页面一改版
   全崩。优先语义化定位：ID、`data-testid` 属性、可访问性角色。
3. **自动化脚本自己坏了没人管**。失败被归因为"脚本又挂了"进而习惯性
   忽略，真 bug 被淹没。脚本失败要当天处理，要么修要么删。
4. **用例之间不独立**。用例 B 依赖用例 A 留下的登录状态，单独跑 B 就挂。
   每条用例自己准备数据、自己清理。
5. **缺陷报告缺环境信息**。"我这里好的"与"我这里坏的"争论半天，最后
   发现是浏览器版本不同。环境写进报告，争论省掉。

自检清单：

- [ ] 手工回归覆盖了正向、逆向、边界三类用例
- [ ] 缺陷报告含复现步骤、预期/实际、环境三要素
- [ ] 自动化等待全部是条件等待，没有固定 sleep
- [ ] 每条用例可以单独运行并通过
- [ ] 新写的测试放进了每次构建都会执行的套件

## 6. 练习

1. 找一个你常用的网站（或本地起一个项目），手工设计登录或搜索功能的
   用例集，覆盖正向/逆向/边界，并实际执行一轮。
2. 故意造一个 bug（比如把前端某处改崩），按第 1.2 节模板写一份缺陷
   报告，让朋友照着复现，检验步骤是否够精确。
3. 克隆 FANDEX 仓库，运行 `pnpm install` 与 `pnpm test:smoke`，观察
   冒烟测试的输出；再在 `smoke.spec.ts` 里加一条自己的断言（例如首页
   某个具体文案可见）。
4. 把第 1 题的用例表改写成第 4.2 节的 JSON 数据文件格式。

## 7. 下一步

- Selenium 定位、等待与 Page Object 的完整展开：见《Selenium》。
- pytest fixture、参数化、配置文件：见《Pytest》。
- 浏览器自动化选型与 flaky 治理：见《E2E 端到端测试》。
- 用例设计方法学（等价类、边界值、判定表）：见《等价类划分》《边界值分析》。
