---
order: 560
title: AWS CloudFront CDN 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'CloudFront 命令实战：分发创建与配置、源站与 OAC、缓存失效刷新、TLS 证书与边缘函数。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---
## 学习目标

本文是「云计算」模块的第 56 篇，难度定位为入门。重点内容：CloudFront 命令实战：分发创建与配置、源站与 OAC、缓存失效刷新、TLS 证书与边缘函数。

主要章节：

- 分配创建
- 分配配置
- 源站配置
- 失效与缓存
- 源访问控制
- TLS/SSL 证书
- ……共 10 个章节

## 分配创建

**基本写法：创建分配最小配置**
`aws cloudfront create-distribution --distribution-config <JSON>`
```bash
# 创建最小可用的 CloudFront 分配
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "my-distribution-001",
  "Comment": "My CDN distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "my-origin",
      "DomainName": "my-bucket.s3.amazonaws.com",
      "S3OriginConfig": {"OriginAccessIdentity": ""}
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "my-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {"Enabled": false, "Quantity": 0},
    "ForwardedValues": {"QueryString": false, "Cookies": {"Forward": "none"}, "Headers": {"Quantity": 0}, "QueryStringCacheKeys": {"Quantity": 0}},
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  }
}'
```

---

**基本写法：使用文件配置创建**
`aws cloudfront create-distribution --distribution-config file://<文件>`
```bash
# 通过 JSON 文件创建分配
aws cloudfront create-distribution --distribution-config file://distribution.json
```

---

**基本写法：列出分配**
`aws cloudfront list-distributions`
```bash
# 列出账户下所有分配
aws cloudfront list-distributions
```

---

**基本写法：查看分配详情**
`aws cloudfront get-distribution --id <分配ID>`
```bash
# 查看指定分配详情
aws cloudfront get-distribution --id E1A2B3C4D5E6F7
```

---

**基本写法：删除分配**
`aws cloudfront delete-distribution --id <分配ID> --if-match <ETag>`
```bash
# 删除指定分配(必须先禁用)
aws cloudfront delete-distribution --id E1A2B3C4D5E6F7 --if-match E2QWERTYUIOP
```

---

## 分配配置

**基本写法：禁用分配**
`aws cloudfront update-distribution --distribution-config <JSON> --id <分配ID> --if-match <ETag>`
```bash
# 设置 Enabled 为 false 禁用分配
aws cloudfront update-distribution \
  --distribution-config file://disabled-config.json \
  --id E1A2B3C4D5E6F7 \
  --if-match E2QWERTYUIOP
```

---

**基本写法：启用分配**
`aws cloudfront update-distribution --id <分配ID> --if-match <ETag>`
```bash
# 修改配置启用已禁用的分配
aws cloudfront update-distribution \
  --distribution-config file://enabled-config.json \
  --id E1A2B3C4D5E6F7 \
  --if-match E2QWERTYUIOP
```

---

**基本写法：更新缓存行为**
```json
{
  "DefaultCacheBehavior": {
    "TargetOriginId": "my-origin",
    "ViewerProtocolPolicy": "https-only",
    "TrustedSigners": {"Enabled": false, "Quantity": 0},
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {"Forward": "all"},
      "Headers": {"Quantity": 2, "Items": ["Origin", "Access-Control-Request-Method"]},
      "QueryStringCacheKeys": {"Quantity": 0}
    },
    "MinTTL": 0,
    "DefaultTTL": 300,
    "MaxTTL": 3600,
    "AllowedMethods": {"Quantity": 7, "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]}
  }
}
```

---

**基本写法：配置自定义错误页面**
```json
{
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [{
      "ErrorCode": 404,
      "ResponsePagePath": "/404.html",
      "ResponseCode": "404",
      "ErrorCachingMinTTL": 300
    }]
  }
}
```

---

**基本写法：配置地理限制**
`aws cloudfront update-distribution --distribution-config <JSON> --id <分配ID>`
```json
{
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "whitelist",
      "Quantity": 2,
      "Items": ["CN", "US"]
    }
  }
}
```

---

## 源站配置

**基本写法：S3 源配置**
```json
{
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-origin",
      "DomainName": "my-bucket.s3.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": "origin-access-identity/cloudfront/E1A2B3C4D5E6F7"
      }
    }]
  }
}
```

---

**基本写法：自定义源配置**
```json
{
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "custom-origin",
      "DomainName": "www.example.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": {"Quantity": 2, "Items": ["TLSv1.2", "TLSv1.3"]}
      }
    }]
  }
}
```

---

**基本写法：创建源访问身份**
`aws cloudfront create-cloud-front-origin-access-identity --cloud-front-origin-access-identity-config <JSON>`
```bash
# 创建 OAI 用于 S3 源访问控制
aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
  '{"CallerReference":"my-oai","Comment":"OAI for my-bucket"}'
```

---

**基本写法：配置源组故障转移**
```json
{
  "OriginGroups": {
    "Quantity": 1,
    "Items": [{
      "Id": "my-origin-group",
      "Members": {
        "Quantity": 2,
        "Items": [
          {"OriginId": "primary-origin"},
          {"OriginId": "secondary-origin"}
        ]
      },
      "FailoverCriteria": {
        "StatusCodes": {"Quantity": 3, "Items": [500, 502, 503]}
      }
    }]
  }
}
```

---

**基本写法：源路径模式路由**
```json
{
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [{
      "PathPattern": "/images/*",
      "TargetOriginId": "images-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {"Enabled": false, "Quantity": 0},
      "ForwardedValues": {"QueryString": false, "Cookies": {"Forward": "none"}, "Headers": {"Quantity": 0}, "QueryStringCacheKeys": {"Quantity": 0}},
      "MinTTL": 0
    }]
  }
}
```

---

## 失效与缓存

**基本写法：创建失效**
`aws cloudfront create-invalidation --distribution-id <分配ID> --paths <路径>`
```bash
# 失效指定路径的缓存
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/index.html" "/images/*"
```

---

**基本写法：失效所有文件**
`aws cloudfront create-invalidation --distribution-id <分配ID> --paths "/*"`
```bash
# 失效整个分配的缓存
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/*"
```

---

**基本写法：查看失效状态**
`aws cloudfront get-invalidation --distribution-id <分配ID> --id <失效ID>`
```bash
# 查询失效操作进度
aws cloudfront get-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --id I1A2B3C4D5E6F7
```

---

**基本写法：列出失效**
`aws cloudfront list-invalidations --distribution-id <分配ID>`
```bash
# 列出最近的失效记录
aws cloudfront list-invalidations \
  --distribution-id E1A2B3C4D5E6F7
```

---

**基本写法：配置缓存策略**
`aws cloudfront create-cache-policy --cache-policy-config <JSON>`
```bash
# 创建自定义缓存策略
aws cloudfront create-cache-policy --cache-policy-config '{
  "Name": "my-cache-policy",
  "Comment": "My custom cache policy",
  "DefaultTTL": 3600,
  "MaxTTL": 86400,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": {"HeaderBehavior": "none"},
    "CookiesConfig": {"CookieBehavior": "none"},
    "QueryStringsConfig": {"QueryStringBehavior": "none"}
  }
}'
```

---

## 源访问控制

**基本写法：创建源访问控制**
`aws cloudfront create-origin-access-control --origin-access-control-config <JSON>`
```bash
# 创建 OAC(推荐替代 OAI)
aws cloudfront create-origin-access-control --origin-access-control-config '{
  "Name": "my-oac",
  "Description": "OAC for S3 origin",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}'
```

---

**基本写法：列出源访问控制**
`aws cloudfront list-origin-access-controls`
```bash
# 列出所有 OAC
aws cloudfront list-origin-access-controls
```

---

**基本写法：删除源访问控制**
`aws cloudfront delete-origin-access-control --id <ID> --if-match <ETag>`
```bash
# 删除指定 OAC
aws cloudfront delete-origin-access-control \
  --id E1A2B3C4D5E6F7 \
  --if-match E2QWERTYUIOP
```

---

**基本写法：S3 桶策略授权 CloudFront**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
      }
    }
  }]
}
```

---

## TLS/SSL 证书

**基本写法：配置 SSL 证书**
```json
{
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc-def-ghi",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": "arn:aws:acm:us-east-1:123456789012:certificate/abc-def-ghi",
    "CertificateSource": "acm"
  }
}
```

---

**基本写法：ACM 申请证书**
`aws acm request-certificate --domain-name <域名> --validation-method DNS`
```bash
# 在 us-east-1 区域申请证书(CloudFront 必需)
aws acm request-certificate \
  --domain-name "*.example.com" \
  --validation-method DNS \
  --region us-east-1
```

---

**基本写法：查看证书**
`aws acm describe-certificate --certificate-arn <ARN>`
```bash
# 查看证书状态与验证信息
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-def-ghi \
  --region us-east-1
```

---

**基本写法：配置备用域名**
```json
{
  "Aliases": {
    "Quantity": 2,
    "Items": ["www.example.com", "cdn.example.com"]
  }
}
```

---

**基本写法：配置安全策略**
```json
{
  "ViewerCertificate": {
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "SSLSupportMethod": "sni-only"
  }
}
```

---

## 函数与 Lambda@Edge

**基本写法：创建 CloudFront 函数**
`aws cloudfront create-function --name <函数名> --function-code <代码> --function-config <配置>`
```bash
# 创建 CloudFront 函数
aws cloudfront create-function \
  --name my-function \
  --function-code fileb://function.js \
  --function-config '{"Comment":"My function","Runtime":"cloudfront-js-2.0"}'
```

---

**基本写法：发布函数**
`aws cloudfront publish-function --name <函数名> --if-match <ETag>`
```bash
# 发布函数使其可关联到分配
aws cloudfront publish-function \
  --name my-function \
  --if-match ETVERTYUIOPASDF
```

---

**基本写法：测试函数**
`aws cloudfront test-function --name <函数名> --if-match <ETag> --event-object <事件>`
```bash
# 测试函数处理指定事件
aws cloudfront test-function \
  --name my-function \
  --if-match ETVERTYUIOPASDF \
  --event-object fileb://event.json
```

---

**基本写法：关联函数到分配**
```json
{
  "DefaultCacheBehavior": {
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [{
        "FunctionARN": "arn:aws:cloudfront::123456789012:function/my-function",
        "EventType": "viewer-request"
      }]
    }
  }
}
```

---

**基本写法：列出函数**
`aws cloudfront list-functions`
```bash
# 列出所有 CloudFront 函数
aws cloudfront list-functions
```

---

## 实时日志与监控

**基本写法：创建实时日志配置**
`aws cloudfront create-realtime-log-config --end-points <端点> --fields <字段> --name <名称> --sampling-rate <比率>`
```bash
# 创建实时日志推送到 Kinesis
aws cloudfront create-realtime-log-config \
  --end-points '[{"StreamType":"Kinesis","Endpoint":{"Stream":{"Arn":"arn:aws:kinesis:us-east-1:123456789012:stream/my-stream","RoleArn":"arn:aws:iam::123456789012:role/cf-realtime"}}}]' \
  --fields '["timestamp","c-ip","time-to-first-byte","sc-status"]' \
  --name my-realtime-log \
  --sampling-rate 100
```

---

**基本写法：查看实时日志配置**
`aws cloudfront get-realtime-log-config --name <名称>`
```bash
# 查看指定实时日志配置
aws cloudfront get-realtime-log-config --name my-realtime-log
```

---

**基本写法：列出实时日志配置**
`aws cloudfront list-realtime-log-configs`
```bash
# 列出所有实时日志配置
aws cloudfront list-realtime-log-configs
```

---

**基本写法：删除实时日志配置**
`aws cloudfront delete-realtime-log-config --name <名称>`
```bash
# 删除指定实时日志配置
aws cloudfront delete-realtime-log-config --name my-realtime-log
```

---

**基本写法：监控分配指标**
`aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name Requests`
```bash
# 查看 CloudFront 请求量指标
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E1A2B3C4D5E6F7 \
  --start-time 2026-07-31T00:00:00Z \
  --end-time 2026-07-31T01:00:00Z \
  --period 300 \
  --statistics Sum
```

---

## 标签管理

**基本写法：添加标签**
`aws cloudfront tag-resource --resource <ARN> --tags <标签>`
```bash
# 为分配添加标签
aws cloudfront tag-resource \
  --resource arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7 \
  --tags 'Items=[{Key=Environment,Value=Production},{Key=Team,Value=DevOps}]'
```

---

**基本写法：查看标签**
`aws cloudfront list-tags-for-resource --resource <ARN>`
```bash
# 查看分配的所有标签
aws cloudfront list-tags-for-resource \
  --resource arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7
```

---

**基本写法：移除标签**
`aws cloudfront untag-resource --resource <ARN> --tag-keys <键列表>`
```bash
# 移除指定标签
aws cloudfront untag-resource \
  --resource arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7 \
  --tag-keys 'Items=[Environment]'
```

---

## 复制与迁移

**基本写法：复制分配配置**
```bash
# 通过脚本复制分配到新分配
ETAG=$(aws cloudfront get-distribution --id E1A2B3C4D5E6F7 --query 'ETag' --output text)
aws cloudfront get-distribution-config --id E1A2B3C4D5E6F7 --query 'DistributionConfig' > copy-config.json
# 修改 CallerReference 后使用 create-distribution 创建
```

---

**基本写法：跨账户迁移**
```bash
# 导出当前分配配置
aws cloudfront get-distribution-config --id E1A2B3C4D5E6F7 > export.json
# 在目标账户创建新分配
aws cloudfront create-distribution --distribution-config file://export.json --profile target-account
```

---

**基本写法：列出标签为某值的分配**
```bash
# 查询特定环境的所有分配
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Environment,Values=Production \
  --resource-type-filters cloudfront:distribution
```

---

**基本写法：查看分配标签**
```bash
# 列出分配的所有标签
for dist in $(aws cloudfront list-distributions --query 'DistributionList.Items[].Id' --output text); do
  echo "Distribution: $dist"
  aws cloudfront list-tags-for-resource \
    --resource arn:aws:cloudfront::123456789012:distribution/$dist
done
```
