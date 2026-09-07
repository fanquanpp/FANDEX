---
order: 260
title: Jest 配置与快照
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 配置与快照 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## jest.config.js 配置

**换行写法：Jest 配置文件**
`module.exports = { <配置项> };`

```javascript
# Jest 配置文件示例
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js"],
  coverageDirectory: "coverage",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};
```

---

## testEnvironment 环境

**基本写法：设置测试环境**
`testEnvironment: "<node|jsdom>"`

```javascript
# Node 环境与浏览器环境
testEnvironment: "node";    # Node.js 环境
testEnvironment: "jsdom";   # 浏览器 DOM 环境
```

---

## preset 预设

**基本写法：使用预设配置**
`preset: "<预设名>"`

```javascript
# 使用 ts-jest 或其他预设
preset: "ts-jest";
preset: "@testing-library/react";
```

---

## moduleNameMapper 路径映射

**基本写法：模块路径别名**
`moduleNameMapper: { "<别名正则>": "<真实路径>" }`

```javascript
# 路径别名映射
moduleNameMapper: {
  "^@/(.*)$": "<rootDir>/src/$1",
  "\\.(css|less)$": "identity-obj-proxy",
};
```

---

## 命令行选项

**基本写法：常用 Jest 命令**
`jest [<测试路径>] [--watch] [--coverage] [--verbose]`

```bash
# Jest 常用命令
jest                          # 运行所有测试
jest path/to/test             # 运行指定测试
jest --watch                  # 监视模式
jest --coverage               # 生成覆盖率报告
jest --verbose                # 显示详细输出
jest --bail                   # 失败时停止
```

---

## toMatchSnapshot 快照测试

**基本写法：生成并对比快照**
`expect(<值>).toMatchSnapshot([<属性匹配>, [<提示>]])`

```javascript
# 快照测试序列化对象
expect({ id: 1, name: "Alice" }).toMatchSnapshot();
```

---

## toMatchInlineSnapshot 内联快照

**基本写法：内联快照存储在测试文件中**
`expect(<值>).toMatchInlineSnapshot([<属性匹配>,] "<快照>")`

```javascript
# 内联快照首次运行自动写入
expect(config).toMatchInlineSnapshot();
```

---

## 更新快照

**基本写法：更新过时快照**
`jest --updateSnapshot`

```bash
# 更新所有快照
jest --updateSnapshot
jest -u   # 简写
```

---

## toThrowErrorMatchingSnapshot

**基本写法：异常快照**
`expect(() => <调用>).toThrowErrorMatchingSnapshot()`

```javascript
# 异常信息快照
expect(() => riskyCall()).toThrowErrorMatchingSnapshot();
```

---

## setup 文件

**基本写法：全局设置文件**
`setupFiles: ["<路径>"]`
`setupFilesAfterEnv: ["<路径>"]`

```javascript
# 配置全局 setup 文件
setupFiles: ["<rootDir>/jest.setup.js"];
setupFilesAfterEnv: ["@testing-library/jest-dom"];
```

---

## coverageThreshold 覆盖率阈值

**换行写法：设置覆盖率阈值**
`coverageThreshold: { global: { branches: <n>, functions: <n>, lines: <n>, statements: <n> } }`

```javascript
# 强制覆盖率达标
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
};
```

---

## transform 转换

**基本写法：配置代码转换**
`transform: { "<文件正则>": "<转换器>" }`

```javascript
# 使用 babel 或 ts-jest 转换
transform: {
  "^.+\\.tsx?$": "ts-jest",
  "^.+\\.jsx?$": "babel-jest",
};
```

---

## 全局配置 setup 与 teardown

**换行写法：全局 setup/teardown**
`globalSetup: "<模块路径>"`
`globalTeardown: "<模块路径>"`

```javascript
# 全局 setup 与 teardown 模块
module.exports = {
  globalSetup: "<rootDir>/setup.js",
  globalTeardown: "<rootDir>/teardown.js",
};
```
