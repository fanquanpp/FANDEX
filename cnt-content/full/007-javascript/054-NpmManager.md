---
order: 540
title: npm 包管理
module: 'javascript'
category: 前端技术
difficulty: beginner
description: npm 的项目初始化、包安装、脚本执行与镜像源配置。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'javascript/052-NodeJsInstall'
  - 'javascript/053-NvmVersionManage'
prerequisites:
  - 'shell/005-DevEnvSetup'
---

## 项目初始化

**基本写法：交互式创建 package.json**
`npm init`
```bash
# 通过问答方式初始化项目
npm init
```

---

**基本写法：快速创建默认 package.json**
`npm init -y`
```bash
# 跳过问答使用默认值
npm init -y
```

---

**基本写法：创建 package.json 并指定版本管理工具**
`npm create <模板名>@latest`
```bash
# 使用官方模板初始化项目
npm create vite@latest my-app
```

---

## 包安装

**基本写法：安装依赖（生产依赖）**
`npm install <包名>`
```bash
# 安装到 dependencies
npm install express
```

---

**基本写法：安装开发依赖**
`npm install <包名> --save-dev`
```bash
# 安装到 devDependencies
npm install eslint --save-dev
```

---

**基本写法：全局安装包**
`npm install -g <包名>`
```bash
# 全局安装命令行工具
npm install -g typescript
```

---

**基本写法：安装指定版本**
`npm install <包名>@<版本号>`
```bash
# 安装指定版本的包
npm install lodash@4.17.21
```

---

**基本写法：安装全部依赖**
`npm install`
```bash
# 根据 package.json 安装所有依赖
npm install
```

---

## 包管理

**基本写法：卸载包**
`npm uninstall <包名>`
```bash
# 移除项目中的包
npm uninstall express
```

---

**基本写法：更新包**
`npm update <包名>`
```bash
# 更新指定包到最新版本
npm update lodash
```

---

**基本写法：查看已安装包列表**
`npm list`
```bash
# 查看当前项目的依赖树
npm list
```

---

**基本写法：查看全局安装包**
`npm list -g --depth=0`
```bash
# 查看全局安装的包（不显示依赖）
npm list -g --depth=0
```

---

**基本写法：查看包信息**
`npm view <包名>`
```bash
# 查看包的详细信息
npm view react
```

---

## 脚本执行

**基本写法：运行 package.json 中的脚本**
`npm run <脚本名>`
```bash
# 执行 scripts 中定义的命令
npm run build
```

---

**基本写法：运行 start 脚本**
`npm start`
```bash
# start 是特殊脚本名可省略 run
npm start
```

---

**基本写法：运行 test 脚本**
`npm test`
```bash
# test 是特殊脚本名可省略 run
npm test
```

---

**基本写法：传递参数给脚本**
`npm run <脚本名> -- <参数>`
```bash
# 向脚本传递额外参数
npm run build -- --mode production
```

---

## 配置管理

**基本写法：设置 npm 镜像源**
`npm config set registry <镜像地址>`
```bash
# 切换为淘宝镜像加速下载
npm config set registry https://registry.npmmirror.com/
```

---

**基本写法：查看当前镜像源**
`npm config get registry`
```bash
# 查看当前使用的镜像源
npm config get registry
```

---

**基本写法：查看所有配置**
`npm config list`
```bash
# 查看所有 npm 配置项
npm config list
```

---

**基本写法：设置全局安装路径**
`npm config set prefix "<路径>"`
```bash
# 自定义全局包安装路径
npm config set prefix "D:\npm-global"
```
