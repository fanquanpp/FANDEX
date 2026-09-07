---
order: 360
title: AWS CloudFormation
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 AWS CloudFormation 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

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
      InstanceType: t2.micro
      ImageId: ami-0c55b159cbfafe1f0
```

---

**基本写法：定义参数**
```yaml
# 通过参数实现模板复用
Parameters:
  InstanceType:
    Type: String
    Default: t2.micro
    AllowedValues: [t2.micro, t2.small, t3.micro]
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
