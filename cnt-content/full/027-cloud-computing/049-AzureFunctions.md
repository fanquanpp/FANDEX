---
order: 490
title: Azure Functions 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: Azure Functions 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 核心工具安装

**基本写法：安装 Azure Functions Core Tools**
`npm install -g azure-functions-core-tools@<版本>`
```bash
# 安装 Azure Functions Core Tools v4
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

---

**基本写法：查看版本**
`func --version`
```bash
# 查看 Core Tools 版本
func --version
```

---

**基本写法：查看帮助**
`func --help`
```bash
# 查看所有可用命令
func --help
```

---

**基本写法：登录 Azure**
`az login`
```bash
# 通过浏览器交互登录 Azure
az login
```

---

**基本写法：设置默认订阅**
`az account set --subscription <订阅ID>`
```bash
# 切换到指定订阅
az account set --subscription 00000000-0000-0000-0000-000000000000
```

---

## 项目创建

**基本写法：创建项目**
`func init <项目名> [--worker-runtime <运行时>]`
```bash
# 创建 Node.js v18 项目
func init my-functions --worker-runtime node --language javascript
```

---

**基本写法：创建 Python 项目**
`func init <项目名> --worker-runtime python --model V2`
```bash
# 创建 Python V2 编程模型项目
func init my-py-funcs --worker-runtime python --model V2
```

---

**基本写法：创建 .NET 项目**
`func init <项目名> --worker-runtime dotnet`
```bash
# 创建 .NET 隔离工作进程项目
func init my-dotnet-funcs --worker-runtime dotnet-isolated
```

---

**基本写法：创建 Docker 项目**
`func init <项目名> --docker`
```bash
# 创建带 Dockerfile 的项目
func init my-docker-funcs --worker-runtime node --docker
```

---

## 函数创建

**基本写法：创建函数**
`func new --name <函数名> --template <模板>`
```bash
# 创建 HTTP 触发函数
func new --name HttpExample --template "HTTP trigger"
```

---

**基本写法：创建定时函数**
`func new --name <函数名> --template "Timer trigger"`
```bash
# 创建定时触发函数
func new --name DailyJob --template "Timer trigger"
```

---

**基本写法：创建队列触发函数**
`func new --name <函数名> --template "Azure Queue Storage trigger"`
```bash
# 创建队列触发函数
func new --name QueueHandler --template "Azure Queue Storage trigger"
```

---

**基本写法：创建 Cosmos DB 触发函数**
`func new --name <函数名> --template "Azure Cosmos DB trigger"`
```bash
# 创建 Cosmos DB 变更触发函数
func new --name CosmosTrigger --template "Azure Cosmos DB trigger"
```

---

**基本写法：查看可用模板**
`func templates list`
```bash
# 列出所有可用函数模板
func templates list
```

---

## 本地运行

**基本写法：本地运行项目**
`func start [--port <端口>]`
```bash
# 在 7071 端口启动本地运行时
func start --port 7071
```

---

**基本写法：指定运行时**
`func start --runtime <运行时>`
```bash
# 强制使用 node 运行时启动
func start --runtime node
```

---

**基本写法：使用本地设置文件**
`func start --functions <函数名>`
```bash
# 仅启动指定函数
func start --functions HttpExample
```

---

**基本写法：连接本地存储模拟器**
`func start`
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

---

## 部署到 Azure

**基本写法：部署函数应用**
`func azure functionapp publish <应用名>`
```bash
# 部署到已有函数应用
func azure functionapp publish my-func-app
```

---

**基本写法：发布并显示部署脚本**
`func azure functionapp publish <应用名> --publish-local-settings`
```bash
# 同时部署本地设置
func azure functionapp publish my-func-app --publish-local-settings
```

---

**基本写法：使用 zip 部署**
`az functionapp deployment source config-zip --name <应用名> --resource-group <组> --src <zip>`
```bash
# 通过 zip 包部署
az functionapp deployment source config-zip \
  --name my-func-app \
  --resource-group my-rg \
  --src deploy.zip
```

---

**基本写法：从 Git 部署**
`az functionapp deployment source config --name <应用名> --resource-group <组> --repo-url <URL> --branch <分支>`
```bash
# 从 GitHub 持续部署
az functionapp deployment source config \
  --name my-func-app \
  --resource-group my-rg \
  --repo-url https://github.com/myorg/myrepo \
  --branch main \
  --manual-integration
```

---

**基本写法：启用部署槽**
`az functionapp deployment slot create --name <应用名> --resource-group <组> --slot <槽名>`
```bash
# 创建 staging 部署槽
az functionapp deployment slot create \
  --name my-func-app \
  --resource-group my-rg \
  --slot staging
```

---

## 应用服务计划

**基本写法：创建消费计划**
`az functionapp plan create --name <计划名> --resource-group <组> --location <区域> --sku <SKU>`
```bash
# 创建消费计划(按需计费)
az functionapp plan create \
  --name my-plan \
  --resource-group my-rg \
  --location eastus \
  --sku Y1 \
  --is-linux
```

---

**基本写法：创建高级计划**
`az functionapp plan create --name <计划名> --sku EP1`
```bash
# 创建 EP1 高级计划(预置实例)
az functionapp plan create \
  --name my-premium-plan \
  --resource-group my-rg \
  --location eastus \
  --sku EP1 \
  --is-linux
```

---

**基本写法：创建函数应用**
`az functionapp create --name <应用名> --storage-account <存储> --plan <计划> --resource-group <组> --runtime <运行时>`
```bash
# 创建 Node.js 函数应用
az functionapp create \
  --name my-func-app \
  --storage-account mystorage123 \
  --plan my-plan \
  --resource-group my-rg \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4
```

---

**基本写法：查看函数应用**
`az functionapp list --resource-group <组>`
```bash
# 列出资源组下所有函数应用
az functionapp list --resource-group my-rg --output table
```

---

**基本写法：删除函数应用**
`az functionapp delete --name <应用名> --resource-group <组>`
```bash
# 删除函数应用
az functionapp delete --name my-func-app --resource-group my-rg
```

---

## 配置与连接

**基本写法：设置应用设置**
`az functionapp config appsettings set --name <应用名> --resource-group <组> --settings <键=值>`
```bash
# 设置数据库连接字符串
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group my-rg \
  --settings DB_CONNECTION="Server=...;Database=..."
```

---

**基本写法：查看应用设置**
`az functionapp config appsettings list --name <应用名> --resource-group <组>`
```bash
# 列出所有应用设置
az functionapp config appsettings list \
  --name my-func-app \
  --resource-group my-rg
```

---

**基本写法：删除应用设置**
`az functionapp config appsettings delete --name <应用名> --resource-group <组> --setting-names <键>`
```bash
# 删除指定配置项
az functionapp config appsettings delete \
  --name my-func-app \
  --resource-group my-rg \
  --setting-names OLD_KEY
```

---

**基本写法：绑定存储账户**
`az functionapp config appsettings set --name <应用名> --settings AzureWebJobsStorage=<连接串>`
```bash
# 设置运行时所需的存储连接
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group my-rg \
  --settings AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=..."
```

---

## 触发器与绑定配置

**基本写法：HTTP 触发器配置**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

---

**基本写法：定时触发器配置**
```json
{
  "bindings": [
    {
      "type": "timerTrigger",
      "direction": "in",
      "name": "myTimer",
      "schedule": "0 0 * * * *"
    }
  ]
}
```

---

**基本写法：队列输出绑定**
```json
{
  "bindings": [
    {
      "type": "queue",
      "direction": "out",
      "name": "outputQueueItem",
      "queueName": "myqueue",
      "connection": "AzureWebJobsStorage"
    }
  ]
}
```

---

**基本写法：Python V2 模型触发器**
```python
# Python V2 编程模型的装饰器触发器
import azure.functions as func
import logging

app = func.FunctionApp()

@app.route(route="hello")
def hello(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse("Hello, World!")
```

---

## 监控与诊断

**基本写法：查看函数日志**
`az functionapp log tail --name <应用名> --resource-group <组>`
```bash
# 实时查看应用日志流
az functionapp log tail \
  --name my-func-app \
  --resource-group my-rg
```

---

**基本写法：启用 Application Insights**
`az monitor app-insights component create --app <名称> --location <区域> --resource-group <组>`
```bash
# 创建 Application Insights 资源
az monitor app-insights component create \
  --app my-ai \
  --location eastus \
  --resource-group my-rg
```

---

**基本写法：关联 Application Insights**
`az functionapp config appsettings set --name <应用名> --settings APPINSIGHTS_INSTRUMENTATIONKEY=<键>`
```bash
# 将 Application Insights 连接到函数应用
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group my-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=00000000-0000-0000-0000-000000000000
```

---

**基本写法：执行函数**
`az functionapp function invoke --name <应用名> --resource-group <组> --function-name <函数>`
```bash
# 通过 Azure CLI 远程调用函数
az functionapp function invoke \
  --name my-func-app \
  --resource-group my-rg \
  --function-name HttpExample
```

---

## 持久化函数

**基本写法：安装 Durable Functions 扩展**
`func extensions install --package Microsoft.Azure.WebJobs.Extensions.DurableTask --version <版本>`
```bash
# 安装 Durable Functions 扩展
func extensions install \
  --package Microsoft.Azure.WebJobs.Extensions.DurableTask \
  --version 2.13.0
```

---

**基本写法：存储提供者配置**
```json
{
  "extensions": {
    "durableTask": {
      "storageProvider": {
        "type": "AzureStorage",
        "connectionStringName": "AzureWebJobsStorage"
      },
      "hubName": "MyTaskHub"
    }
  }
}
```

---

**基本写法：Netherite 存储提供者**
```json
{
  "extensions": {
    "durableTask": {
      "storageProvider": {
        "type": "Netherite",
        "storageConnectionName": "AzureWebJobsStorage",
        "eventHubName": "durable-event-hub"
      }
    }
  }
}
```

---

## 部署槽与 CI/CD

**基本写法：交换部署槽**
`az functionapp deployment slot swap --name <应用名> --resource-group <组> --slot <槽名> --target-slot production`
```bash
# 将 staging 槽交换到生产
az functionapp deployment slot swap \
  --name my-func-app \
  --resource-group my-rg \
  --slot staging \
  --target-slot production
```

---

**基本写法：列出部署槽**
`az functionapp deployment slot list --name <应用名> --resource-group <组>`
```bash
# 查看应用所有部署槽
az functionapp deployment slot list \
  --name my-func-app \
  --resource-group my-rg
```

---

**基本写法：删除部署槽**
`az functionapp deployment slot delete --name <应用名> --resource-group <组> --slot <槽名>`
```bash
# 删除指定部署槽
az functionapp deployment slot delete \
  --name my-func-app \
  --resource-group my-rg \
  --slot staging
```

---

**基本写法：配置 GitHub Actions 部署**
`az functionapp deployment github-actions add --repo <仓库> --resource-group <组> --name <应用名> --branch <分支>`
```bash
# 为函数应用配置 GitHub Actions CI
az functionapp deployment github-actions add \
  --repo myorg/myrepo \
  --resource-group my-rg \
  --name my-func-app \
  --branch main
```

---

## 密钥管理

**基本写法：列出函数密钥**
`az functionapp function keys list --name <应用名> --resource-group <组> --function-name <函数>`
```bash
# 查看 HttpExample 函数的密钥
az functionapp function keys list \
  --name my-func-app \
  --resource-group my-rg \
  --function-name HttpExample
```

---

**基本写法：设置函数密钥**
`az functionapp function keys set --name <应用名> --resource-group <组> --function-name <函数> --key-name <键名> --key-value <值>`
```bash
# 设置自定义函数密钥
az functionapp function keys set \
  --name my-func-app \
  --resource-group my-rg \
  --function-name HttpExample \
  --key-name MyKey \
  --key-value MySecretValue123
```

---

**基本写法：设置主机密钥**
`az functionapp keys set --name <应用名> --resource-group <组> --key-name <键名> --key-value <值> --key-type masterKey`
```bash
# 设置主机密钥(所有函数共用)
az functionapp keys set \
  --name my-func-app \
  --resource-group my-rg \
  --key-name MyHostKey \
  --key-value MyHostKeyValue123 \
  --key-type masterKey
```

---

**基本写法：使用函数密钥调用**
```bash
# 通过 URL 查询参数传递密钥调用 HTTP 函数
curl "https://my-func-app.azurewebsites.net/api/HttpExample?code=MySecretValue123"
```
