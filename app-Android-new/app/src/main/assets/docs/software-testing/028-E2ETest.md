---
order: 280
title: E2E 端到端测试
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: E2E 端到端测试 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## Cypress 基础

**基本写法：Cypress 测试结构**
`describe("<名称>", () => { cy.<命令>(); })`

```javascript
# Cypress 端到端测试
describe("登录流程", () => {
  it("应成功登录", () => {
    cy.visit("/login");
    cy.get("#username").type("admin");
    cy.get("#password").type("password");
    cy.get("button[type=submit]").click();
    cy.url().should("include", "/dashboard");
  });
});
```

---

## Cypress 元素操作

**基本写法：Cypress 元素定位与交互**
`cy.get("<选择器>").<操作>()`

```javascript
# Cypress 元素操作
cy.get("#input").type("hello");
cy.get("button").click();
cy.get(".item").first().click();
cy.get(".item").eq(2).click();
cy.get("select").select("选项");
```

---

## Cypress 断言

**基本写法：Cypress 链式断言**
`cy.get("<选择器>").should("<断言>", <值>)`

```javascript
# Cypress should 断言
cy.get("#title").should("have.text", "首页");
cy.get("#count").should("have.value", "10");
cy.get(".item").should("have.length", 5);
cy.get("#msg").should("be.visible");
cy.url().should("include", "/home");
```

---

## Cypress fixture 测试数据

**换行写法：使用 fixture 加载测试数据**
`cy.fixture("<文件>").then((<数据>) => { <操作> })`

```javascript
# 从 cypress/fixtures 加载 JSON 数据
cy.fixture("user").then((user) => {
  cy.get("#username").type(user.name);
  cy.get("#password").type(user.password);
});
```

---

## Cypress 自定义命令

**换行写法：定义自定义命令**
`Cypress.Commands.add("<命令名>", (<参数>) => { <操作> })`

```javascript
# 在 cypress/support/commands.js 定义
Cypress.Commands.add("login", (username, password) => {
  cy.session([username, password], () => {
    cy.visit("/login");
    cy.get("#username").type(username);
    cy.get("#password").type(password);
    cy.get("button").click();
  });
});

# 使用
cy.login("admin", "pass");
```

---

## Playwright 基础

**换行写法：Playwright 测试结构**
`test("<名称>", async ({ page }) => { await page.<操作>(); })`

```javascript
# Playwright 端到端测试
import { test, expect } from "@playwright/test";

test("首页加载", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page).toHaveTitle(/Example/);
});
```

---

## Playwright 定位器

**基本写法：Playwright 推荐定位器**
`page.locator("<选择器>")`
`page.getByRole("<角色>", { name: "<名称>" })`
`page.getByText("<文本>")`

```javascript
# Playwright 语义化定位器
await page.getByRole("button", { name: "提交" }).click();
await page.getByLabel("用户名").fill("admin");
await page.getByPlaceholder("请输入").fill("hello");
await page.getByText("欢迎").click();
await page.locator(".item").first().click();
```

---

## Playwright 交互

**基本写法：页面交互方法**
`await page.<方法>(<参数>)`

```javascript
# Playwright 常用交互
await page.goto("https://example.com");
await page.fill("#input", "text");
await page.click("button");
await page.selectOption("select", "value");
await page.check("#checkbox");
await page.press("#input", "Enter");
```

---

## Playwright 自动等待

**基本写法：Playwright 自动等待机制**
`await expect(<locator>).<条件>()`

```javascript
# Playwright 自动重试断言
await expect(page.locator("#msg")).toBeVisible();
await expect(page.locator("#count")).toHaveText("10");
await expect(page).toHaveURL(/dashboard/);
await page.waitForLoadState("networkidle");
```

---

## Playwright 多浏览器

**换行写法：配置多浏览器测试**
`projects: [`
`    { name: "chromium", use: { ...devices["Desktop Chrome"] } },`
`]`

```javascript
# playwright.config.js 配置多浏览器
module.exports = {
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
};
```

---

## Playwright 截图与录像

**基本写法：截图与录屏**
`await page.screenshot({ path: "<文件>" })`
`recordVideo: { dir: "<目录>" }`

```javascript
# 截图与录像配置
await page.screenshot({ path: "screenshot.png", fullPage: true });

# playwright.config.js 录像配置
use: {
  video: "on-first-retry",
  screenshot: "only-on-failure",
}
```

---

## Playwright fixture

**换行写法：自定义 fixture**
`test("<名称>", async ({ page, <自定义fixture> }) => { <操作> })`

```javascript
# 自定义 fixture 扩展测试能力
import { test as base } from "@playwright/test";

const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.fill("#user", "admin");
    await use(page);
  },
});

test("登录后访问", async ({ loggedInPage }) => {
  await loggedInPage.goto("/dashboard");
});
```

---

## Playwright API 测试

**换行写法：API 接口测试**
`test("<名称>", async ({ request }) => { const res = await request.<方法>(<url>); })`

```javascript
# Playwright API 测试
import { test, expect } from "@playwright/test";

test("创建用户 API", async ({ request }) => {
  const response = await request.post("/api/users", {
    data: { name: "Alice", age: 30 },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.name).toBe("Alice");
});
```

---

## Playwright 命令

**基本写法：Playwright CLI 命令**
`npx playwright test [<选项>]`

```bash
# Playwright 常用命令
npx playwright test                    # 运行所有测试
npx playwright test tests/login.spec.ts # 运行指定文件
npx playwright test --project=chromium  # 指定浏览器
npx playwright test --headed            # 显示浏览器窗口
npx playwright test --ui                 # UI 模式
npx playwright codegen https://example.com  # 录制测试
```
