---
order: 240
title: 移动应用测试
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: 'Appium 一套 API 打两端、XCUITest 原生路线、兼容性矩阵思维与 adb 性能功耗仪器，从真机冒烟到发布前基线检查。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'software-testing/030-TestLevels'
  - 'software-testing/220-E2ETest'
  - 'software-testing/230-CICDTest'
prerequisites:
  - 'software-testing/030-TestLevels'
---

## 知识点地图

- **知识类别**：移动应用专项测试（测试类型家族里的平台专项分支）。
- **解决什么问题**：功能用例在桌面浏览器跑绿了，不代表「那些破手机上能跑」——设备碎片化、生命周期打断、弱网、权限、耗电这些维度 UI 自动化盖不住，需要专门的测试对象与工具。
- **什么时候用到**：App 发版前的冒烟与兼容性回归；新机型/新系统版本上市后的适配验证；性能功耗不达标要定位时；把移动专项挂进每日定时任务时。
- **同族文档**：安全专项见《安全测试》；把专项挂进 CI 的编排见《CI/CD 测试门禁》；层级与金字塔的完整论述见《测试层级》。

前置知识：读过《从手工到自动化》（会用 pytest 组织用例）、会用模拟器或有一台安卓真机。不需要先学 Appium——本文从零装起。

## 一、移动测试与 Web 测试差在哪

同一个「登录功能」，在 Web 上是一条用例，在移动端要变成一组：

| 移动特有维度 | 会出什么问题 | 对应测试动作 |
| :--- | :--- | :--- |
| 设备碎片化 | 分辨率、厂商 ROM、系统版本组合爆炸 | 兼容性矩阵（第 3 节） |
| 生命周期 | 来电、切后台、杀进程后状态丢失 | 中断恢复用例 |
| 网络 | 地铁弱网、WiFi/蜂窝切换 | 弱网与网络切换用例 |
| 权限 | 相机/定位被拒后的降级路径 | 授权矩阵用例 |
| 性能功耗 | 冷启动慢、后台偷跑耗电 | adb 基线指标（第 4 节） |

三个场景说明这些维度为什么真实存在：

1. **真实工程场景（适配回归）**：某电商 App 在 Android 15 新机上市后差评激增，根因是目标 SDK 未适配新权限弹窗时序——「新系统版本上市后跑一轮适配回归」应成为例行项。
2. **中断恢复**：支付页切到后台接了个电话，回来点「确认支付」按钮没反应——生命周期用例专抓这类状态丢失。
3. **弱网降级**：电梯里图片无限转圈、超时提示不出现——弱网用例验证「慢」的路径而不是只验证「通」的路径。

## 二、Appium：一套 API 打两端

| 特性 | 说明 |
| :--- | :--- |
| **跨平台** | 一套 API 适配 iOS 和 Android |
| **多语言** | 支持 Python、Java、JS 等 |
| **原生支持** | 原生、混合、移动 Web 应用 |
| **无需修改** | 不需要修改应用源码 |

Appium 的架构值得先理解再动手：测试脚本走 HTTP 与 Appium Server 通信，Server 再驱动平台专属引擎（Android 是 UiAutomator2，iOS 是 XCUITest）。所以「装驱动」这一步不能省——Server 本身不认识任何设备。

环境搭建三步：

```bash
npm install -g appium
appium driver install uiautomator2   # Android 驱动
appium driver install xcuitest       # iOS 驱动（只能在 macOS 上装）
appium --address 127.0.0.1 --port 4723
```

易错点：端口 4723 起冲突时不要只改客户端地址，`--base-path` 老版本默认是 `/wd/hub`、新版本是 `/`，客户端 URL 与服务端配置不一致时连接直接被拒，报错却像网络问题。

### 2.1 动手：一个登录冒烟用例

```python
from appium import webdriver
from appium.options.android import UiAutomator2Options
import pytest

class TestAndroidApp:
    """Android 应用自动化测试"""

    def setup_method(self):
        options = UiAutomator2Options()
        options.platform_name = "Android"
        options.device_name = "emulator-5554"
        options.app = "/path/to/app.apk"
        options.app_package = "com.example.myapp"
        options.app_activity = ".MainActivity"
        options.automation_name = "UiAutomator2"
        options.no_reset = False

        self.driver = webdriver.Remote(
            "http://127.0.0.1:4723",
            options=options
        )

    def teardown_method(self):
        self.driver.quit()

    def test_login(self):
        """测试登录流程"""
        username = self.driver.find_element("id", "com.example.myapp:id/username")
        username.send_keys("admin")

        password = self.driver.find_element("id", "com.example.myapp:id/password")
        password.send_keys("123456")

        login_btn = self.driver.find_element("accessibility id", "登录")
        login_btn.click()

        welcome = self.driver.find_element("id", "com.example.myapp:id/welcome_text")
        assert "欢迎" in welcome.text

    def test_scroll_and_click(self):
        """滚动查找并点击"""
        self.driver.find_element(
            "android uiautomator",
            'new UiScrollable(new UiSelector().scrollable(true))'
            '.scrollIntoView(new UiSelector().text("设置"))'
        ).click()
```

逐段拆解这段代码里最值得注意的取舍：

- `setup_method` 里的 `no_reset = False`：每条用例把应用数据清零，保证用例独立。换成 `True` 可以复用登录态跑长链路，但用例之间就互相污染——先独立、确有性能压力再局部开。
- `find_element("accessibility id", "登录")`：定位策略的选择顺序是 **accessibility id > id > android uiautomator 兜底**。accessibility id 同时提升无障碍质量；`id` 依赖研发给资源命名规范；写死 XPath 绝对路径的用例活不过一个 UI 迭代。
- `test_scroll_and_click` 的 UiScrollable：滚动查找是移动端特有的等待问题——目标元素不在视口内时 `find_element` 会直接超时失败。换成别的写法（如循环 swipe + find）代码量翻倍且引入滑动节奏 flaky；UiScrollable 把「滚到看见」交给引擎原生实现。

第二个场景例子（混合应用）：App 内嵌 H5 活动页时，先 `driver.switch_to.context("WEBVIEW_xxx")` 切上下文再定位，测完切回 `NATIVE_APP`——忘记切回是混合应用自动化的高频翻车点。

第三个场景例子（真实工程场景）：把冒烟用例跑在云真机平台的矩阵上——本地只跑冒烟， nightly 由云真机在 10 台真机上并行执行同一套脚本，失败自动截图归档（第 3 节展开）。

## 三、iOS 侧：XCUITest 与云真机矩阵

### 3.1 两条路线怎么选

| 路线 | 语言 | 优势 | 局限 |
| :--- | :--- | :--- | :--- |
| Appium + XCUITest 驱动 | Python/Java 等 | 与 Android 脚本同构，团队一套技能 | 多一层转发，定位偶发不稳定 |
| XCUITest 原生 | Swift/ObjC | 苹果官方、跑在进程内、速度快最稳 | 团队需 Swift 技能，与 Android 无法复用 |

经验法则：脚本主要给测试工程师写、两端用例要一一对应，选 Appium；性能敏感或频繁踩 Appium 稳定性问题，iOS 侧单独下沉到原生 XCUITest。

### 3.2 XCUITest 最小示例

```swift
import XCTest

class LoginSmokeTests: XCTestCase {
    func testLoginShowsWelcome() {
        let app = XCUIApplication()
        app.launch()

        let nameField = app.textFields["username"]
        nameField.tap()
        nameField.typeText("admin")

        let pwdField = app.secureTextFields["password"]
        pwdField.tap()
        pwdField.typeText("123456")

        app.buttons["登录"].tap()

        // 断言欢迎文案出现，超时 5 秒内轮询
        let welcome = app.staticTexts["welcome_text"]
        XCTAssertTrue(welcome.waitForExistence(timeout: 5))
    }
}
```

要点：`waitForExistence(timeout:)` 是 iOS 侧的条件等待，对应 Android 侧的显式等待——两端都不要写死 `sleep`。`app.textFields["username"]` 的标识符来自 `accessibilityIdentifier`，这正是「定位优先无障碍属性」在苹果生态的形态。

### 3.3 云真机矩阵：长尾交给平台

兼容性先按维度列全，再决定谁进必测集：

| 维度 | 测试内容 | 策略 |
| :--- | :--- | :--- |
| **屏幕尺寸** | 不同分辨率和屏幕密度 | 主流设备覆盖 |
| **系统版本** | 最低支持版本到最新版本 | 最低版本+最新版本+主流在用版本（如近 3-4 个大版本，按产品用户分布确定） |
| **网络环境** | WiFi/4G/5G/弱网/断网 | 模拟网络切换 |
| **内存压力** | 低内存设备运行 | 模拟内存限制 |
| **权限管理** | 授权/拒绝/部分授权 | 全组合测试 |
| **安装升级** | 全新安装/覆盖安装/降级安装 | 版本矩阵 |

自建真机柜只养得住 top 设备，长尾（厂商定制 ROM、低配机型、老系统版本）交给云真机平台：

```text
必测集（自建/本地模拟器）：
  - 用户分布 top 10 机型 x 近 3-4 个大版本
  - 最低支持版本 + 最新系统版本
长尾集（云真机，nightly）：
  - top 50 机型矩阵 + 厂商定制系统（MIUI/HarmonyOS/ColorOS 等）
  - 每台跑冒烟 + 核心路径，失败截图与 logcat 归档
```

矩阵的圈定不是均匀取样：「最低支持版本」决定技术下限、「最新版本」暴露前瞻适配问题、「主流在用版本」覆盖绝大多数用户——三者之外的版本，出问题再补测。关键取舍：全量真机既买不起也跑不完，用「用户分布 top 设备 + 系统版本矩阵」圈定必测集，云真机兜长尾。

## 四、性能功耗：adb 就是仪器

不需要采购平台，adb 命令就能拿到发布前该看的核心指标：

```bash
# CPU 使用率
adb shell top -n 1 | grep com.example.myapp

# 内存使用
adb shell dumpsys meminfo com.example.myapp

# 电量消耗
adb shell dumpsys batterystats com.example.myapp

# 启动时间（关注 TotalTime）
adb shell am start -W com.example.myapp/.MainActivity

# FPS 帧率
adb shell dumpsys gfxinfo com.example.myapp
```

逐条解释这些数字怎么看：

- `am start -W` 的 `TotalTime` 是从 `am` 发令到首帧绘制的总时长，`WaitTime` 包含了 am 自身等待——**报冷启动用 TotalTime，别把 WaitTime 混进去**（易错点）。
- `dumpsys meminfo` 重点看 `TOTAL PSS` 与 `Objects` 里的 `Activities/Views` 数量：反复进出页面后 Activity 数量不回落，就是典型的泄漏信号。
- `dumpsys gfxinfo` 看 `Janky frames` 百分比与 `95th percentile` 帧耗时，比「感觉流畅」客观。

发布前给这些指标定基线：冷启动 < 2s、目标页面稳定 55fps 以上、后台待机零唤醒。超过基线就是 bug，不要靠「感觉流畅」验收。

三个场景例子：

1. **真实工程场景（发版检查单）**：把 adb 五连测写进发布检查单，每次 RC 构建跑一遍并记录数值——版本间悄悄劣化立刻现形，而不是等用户差评。
2. **耗电定位**：用户反馈「这 App 在口袋里发烫」，`batterystats` 显示后台每分钟唤醒 20 次——定位到某 SDK 的心跳间隔配置错误。
3. **内存回归**：新功能上线后 `TOTAL PSS` 从 180MB 涨到 420MB 且不回落，两次堆转储对比锁定未释放的图片缓存。

## 动手实践

**任务**：给你手机上（或模拟器里）任意一个真实 App 测冷启动时间，并给出是否达标的结论。

提示：
- 连接设备后先确认 `adb devices` 能看到设备；
- 冷启动前先 `adb shell am force-stop <包名>`，避免热启动冒充冷启动；
- 多次测量取中位数，单次数据会被系统调度噪声带偏；
- 用 `am start -W` 输出里的 `TotalTime` 字段。

参考实现（先自己写，再对照）：

```bash
# 1. 确认设备
adb devices

# 2. 杀掉目标应用，保证是冷启动
adb shell am force-stop com.example.myapp

# 3. 冷启动并读取计时（重复 5 次，每次之间 force-stop）
adb shell am start -W com.example.myapp/.MainActivity
#   输出示例：
#   Status: ok
#   TotalTime: 1456        <- 取这个字段
#   WaitTime: 1478

# 4. 五次结果排序取中位数，与基线（如 2000ms）比较，输出结论
```

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 移动兼容追求全量真机 | 成本失控、周期失控 | top 设备 + 版本矩阵 + 云真机兜尾 |
| 性能验收靠手感 | 版本间悄悄劣化 | adb 基线指标进发布检查单 |
| 用例写死 XPath 绝对路径 | 一次 UI 改版全线飘红 | 语义化定位：accessibility id 优先 |
| 忘记处理系统弹窗 | 用例在权限对话框前集体超时 | 用例前置安装权限或在 setup 里自动点掉 |

## 自检

1. 兼容性矩阵里「最低支持版本 + 最新 + 主流在用」为什么这样取，而不是均匀取样？
2. `am start -W` 输出里 `TotalTime` 和 `WaitTime` 的区别是什么？报冷启动应该用哪个？
3. 你的混合应用用例跑到 H5 页面就集体失败，最先应该检查什么？

## 练习

1. 用 adb 测一个真实 App 的冷启动时间，连续 5 次取中位数，和本文给的基线比一比，写成三行结论。
2. 把本文的 Appium 登录用例跑在一个模拟器上；故意把 `accessibility id` 定位改成 XPath 绝对路径，记录它在改动布局后失败的过程，体会定位策略的脆弱度差异。
3. 给你的用例集补一条中断恢复用例：登录成功后按 Home 键再返回，断言仍处于已登录状态。

## 下一步

- 把移动专项挂进每日定时任务与门禁：见《CI/CD 测试门禁》。
- E2E 分层与 flaky 治理（移动 UI 自动化同样适用）：见《E2E 端到端测试》。
- 性能测试的方法论（不只是移动端）：见《性能测试方法》。
