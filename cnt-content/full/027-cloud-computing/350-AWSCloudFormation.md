---
order: 400
title: AWS CloudFormation
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'CloudFormation：模板结构、栈生命周期、变更集安全发布、Drift 检测与排错。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/410-IaC'
  - 'cloud-computing/420-TerraformBasic'
prerequisites:
  - 'cloud-computing/410-IaC'
---

**概念 30 秒**：CloudFormation 是 AWS 原生 IaC：模板（YAML/JSON）声明
资源，**栈（Stack）**是模板的一次部署实例。栈是原子性的——创建失败自动
回滚已建资源，这是它相对手工点控制台的核心价值。选型：多云团队用
Terraform（见 `420-TerraformBasic`）；纯 AWS 且不想引入第三方工具链时
用 CloudFormation（或其封装 CDK/SAM）。

## 模板基础

**基本写法：YAML 模板结构**
```yaml
# CloudFormation 模板基本结构
AWSTemplateFormatVersion: '2010-09-09'
Description: My stack template
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: ami-0c55b159cbfafe1f0
```

---

**基本写法：定义参数**
```yaml
# 通过参数实现模板复用
Parameters:
  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues: [t3.micro, t2.small, t3.small]
```

---

**基本写法：定义输出**
```yaml
# 输出资源属性便于跨栈引用
Outputs:
  InstanceId:
    Value: !Ref MyInstance
    Export:
      Name: my-stack-instance-id
```

---

## 栈管理

**基本写法：创建栈**
`aws cloudformation create-stack --stack-name <栈名> --template-body file://<文件>`
```bash
# 从本地 YAML 文件创建栈
aws cloudformation create-stack --stack-name myStack --template-body file://template.yaml
```

---

**基本写法：从 S3 模板创建栈**
`aws cloudformation create-stack --stack-name <栈名> --template-url https://s3.amazonaws.com/<桶>/<键>`
```bash
# 从 S3 上的模板创建栈
aws cloudformation create-stack --stack-name myStack --template-url https://s3.amazonaws.com/my-bucket/template.yaml
```

---

**基本写法：更新栈**
`aws cloudformation update-stack --stack-name <栈名> --template-body file://<文件>`
```bash
# 应用模板变更更新栈
aws cloudformation update-stack --stack-name myStack --template-body file://template.yaml
```

---

**基本写法：删除栈**
`aws cloudformation delete-stack --stack-name <栈名>`
```bash
# 删除栈及所有资源
aws cloudformation delete-stack --stack-name myStack
```

---

**基本写法：列出所有栈**
`aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE`
```bash
# 列出已成功创建与更新的栈
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

---

**基本写法：查看栈详情**
`aws cloudformation describe-stacks --stack-name <栈名>`
```bash
# 查看栈状态与输出
aws cloudformation describe-stacks --stack-name myStack
```

---

## 变更集

**基本写法：创建变更集**
`aws cloudformation create-change-set --stack-name <栈名> --change-set-name <变更集名> --template-body file://<文件>`
```bash
# 预览变更生成变更集
aws cloudformation create-change-set --stack-name myStack --change-set-name my-change --template-body file://template.yaml
```

---

**基本写法：查看变更集**
`aws cloudformation describe-change-set --stack-name <栈名> --change-set-name <变更集名>`
```bash
# 查看变更集将要执行的操作
aws cloudformation describe-change-set --stack-name myStack --change-set-name my-change
```

---

**基本写法：执行变更集**
`aws cloudformation execute-change-set --stack-name <栈名> --change-set-name <变更集名>`
```bash
# 执行变更集中的操作
aws cloudformation execute-change-set --stack-name myStack --change-set-name my-change
```

---

## 事件与资源

**基本写法：查看栈事件**
`aws cloudformation describe-stack-events --stack-name <栈名>`
```bash
# 查看栈操作事件日志
aws cloudformation describe-stack-events --stack-name myStack
```

---

**基本写法：列出栈资源**
`aws cloudformation list-stack-resources --stack-name <栈名>`
```bash
# 查看栈内所有资源物理 ID
aws cloudformation list-stack-resources --stack-name myStack
```

---

## 验证与检查

**基本写法：验证模板**
`aws cloudformation validate-template --template-body file://<文件>`
```bash
# 检查模板语法是否正确
aws cloudformation validate-template --template-body file://template.yaml
```

---

**基本写法：估算栈费用**
`aws cloudformation estimate-template-cost --template-body file://<文件>`
```bash
# 估算模板部署后费用
aws cloudformation estimate-template-cost --template-body file://template.yaml
```

---

## 嵌套栈

**基本写法：嵌套栈资源**
```yaml
# 在主栈中嵌套子栈
Resources:
  NestedStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-bucket/nested.yaml
      Parameters:
        Env: production
```

---

## Drift 检测

**基本写法：检测栈漂移**
`aws cloudformation detect-stack-drift --stack-name <栈名>`
```bash
# 检测栈是否被外部修改
aws cloudformation detect-stack-drift --stack-name myStack
```

---

**基本写法：查看漂移结果**
`aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id <检测ID>`
```bash
# 查看漂移检测进度与结果
aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id abc-123
```

---

## 教学自检

遮住上面的 YAML 与命令示例，先自己默写，再展开对照。答不出的回到对应小节重读：

1. 模板五段式是哪五段？栈与模板的关系类比什么？
2. 「栈是原子性的」体现在什么行为上？这相对手工点控制台的核心价值是什么？
3. 变更集（change set）三步流程是什么？为什么比直接 `update-stack` 稳？
4. 变更集里 Action 标注 Modify 与 Replace 的区别是什么？Replace 意味着什么后果？
5. 删除栈会发生什么？保护重要资源（数据库/桶）的属性是什么？
6. Drift 检测解决什么问题？什么操作会制造 Drift？
7. 模板提交前的两条「保险」命令是什么？

<details>
<summary>参考答案（先答再看）</summary>

1. AWSTemplateFormatVersion、Description、Parameters、Resources、Outputs。模板是蓝图，栈是一次部署实例（同构关系类似 Chart 与 Release）。
2. 创建或更新失败时自动回滚已建/已改资源，不留半成品。手工点控制台没有这种「要么全成、要么退回」的保证。
3. `create-change-set` 生成变更预览 → `describe-change-set` 审查每个资源的动作 → `execute-change-set` 确认执行。稳在「先看清单再动手」：能提前发现 Replace 类高危变更。
4. Modify 是原位修改（不重启/不重建）；Replace 触发资源替换（新资源替换旧资源，通常停机，IP/ID 变化）。Replace 意味着业务中断与下游引用失效，必须安排变更窗口。
5. 删除栈即删除栈内所有资源。给重要资源声明 `DeletionPolicy: Retain`，栈删除时保留该资源。
6. 发现「有人绕过 CloudFormation 直接在控制台改了资源」造成的配置漂移。手工改控制台、脚本直接调 API 都会制造 Drift。
7. `validate-template`（语法校验）与 `create-change-set`（变更预览）；上线前还可 `estimate-template-cost` 估费用。

</details>

## 小结

- 初学者要点：模板五段式（AWSTemplateFormatVersion/Description/
  Parameters/Resources/Outputs）；栈操作有原子回滚；改模板前先生成
  **变更集（changeset）**审一遍再执行，是控制台之外最稳的发布方式；
  模板语法先用 `validate-template` 过一遍。
- 进阶注意：`UPDATE` 属性触发替换（Replacement）意味着停机，变更集里
  会标注 Action 为 Modify/Replace，务必看清；Drift 检测用于发现「控制
  台手工改资源」造成的配置漂移；栈删除即删资源，重要资源（数据库桶）
  用 DeletionPolicy: Retain 保护；大规模工程考虑 CDK/SAM 或转向
  Terraform 多云工具链。
