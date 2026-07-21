---
order: 64
title: 图片CDN加速
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: Markdown图片CDN加速方案：图床选择、CDN配置、懒加载与性能优化。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/自动目录
  - markdown/锚点跳转
  - markdown/版本控制下的PR协作
  - markdown/代码块与语法高亮
prerequisites:
  - markdown/语法指南
---

## 1. 图片托管概述

### 1.1 为什么需要图床

Markdown 中的图片语法只引用 URL，不存储图片数据。因此需要一个**图床**来存储和分发图片：

```markdown
![描述](https://example.com/images/photo.png)
```

### 1.2 图片托管方案对比

| 方案         | 优点               | 缺点         | 适用场景 |
| :----------- | :----------------- | :----------- | :------- |
| **仓库内**   | 版本控制、离线可用 | 仓库体积膨胀 | 小型项目 |
| **GitHub**   | 免费、稳定         | 有带宽限制   | 开源项目 |
| **CDN 图床** | 快速、全球加速     | 可能有费用   | 生产环境 |
| **对象存储** | 可控、安全         | 需配置       | 企业项目 |
| **自建图床** | 完全可控           | 运维成本     | 技术团队 |

## 2. GitHub 作为图床

### 2.1 使用 Issue 上传

在 GitHub Issue 中拖拽图片，自动上传到 GitHub CDN：

```markdown
<!-- 上传后生成的链接 -->

![image](https://github.com/user/repo/assets/xxxxx/image.png)
```

### 2.2 使用仓库存储

```markdown
<!-- 项目内图片 -->

![架构图](./docs/images/architecture.png)

<!-- 绝对路径引用 -->

![Logo](https://raw.githubusercontent.com/user/repo/main/docs/images/logo.png)
```

### 2.3 GitHub CDN 限制

| 限制       | 说明                       |
| :--------- | :------------------------- |
| 单文件大小 | ≤ 100 MB                   |
| 仓库大小   | 建议 ≤ 1 GB                |
| 带宽       | 无明确限制，但滥用会被限速 |
| 私有仓库   | 图片链接需要认证           |

### 2.4 jsDelivr 加速

jsDelivr 提供免费的 GitHub 仓库 CDN 加速：

```markdown
<!-- 原始 GitHub 链接 -->

https://raw.githubusercontent.com/user/repo/main/images/photo.png

<!-- jsDelivr CDN 加速 -->

https://cdn.jsdelivr.net/gh/user/repo/images/photo.png

<!-- 指定版本/标签 -->

https://cdn.jsdelivr.net/gh/user/repo@v1.0/images/photo.png
```

## 3. 对象存储 + CDN

### 3.1 主流对象存储

| 服务              | 免费额度       | 特点         |
| :---------------- | :------------- | :----------- |
| **Cloudflare R2** | 10 GB/月       | 无出站流量费 |
| **AWS S3**        | 5 GB（12个月） | 全球部署     |
| **阿里云 OSS**    | 按量计费       | 国内速度快   |
| **腾讯云 COS**    | 50 GB（6个月） | 国内速度快   |
| **七牛云**        | 10 GB          | 国内老牌     |

### 3.2 Cloudflare R2 + CDN 配置

```bash
# 1. 创建 R2 存储桶
# 2. 上传图片
wrangler r2 object put my-bucket/images/photo.png --file ./photo.png

# 3. 配置自定义域名
# Cloudflare Dashboard → R2 → 存储桶 → 自定义域名

# 4. 使用 CDN 链接
![描述](https://cdn.mydomain.com/images/photo.png)
```

### 3.3 图片处理

CDN 通常提供图片处理功能：

```markdown
<!-- 缩放 -->

![缩略图](https://cdn.example.com/photo.png?w=300&h=200)

<!-- 格式转换（WebP） -->

![WebP](https://cdn.example.com/photo.png?format=webp)

<!-- 质量 -->

![压缩](https://cdn.example.com/photo.png?q=80)
```

## 4. 图片优化

### 4.1 格式选择

| 格式     | 压缩类型 | 透明度 | 动画 | 适用场景             |
| :------- | :------- | :----- | :--- | :------------------- |
| **PNG**  | 无损     |        |      | 图标、截图、需要透明 |
| **JPEG** | 有损     |        |      | 照片、渐变           |
| **WebP** | 两者     |        |      | 通用（推荐）         |
| **SVG**  | 矢量     |        |      | 图标、Logo、图表     |
| **AVIF** | 有损     |        |      | 下一代格式           |

### 4.2 图片压缩

```bash
# 使用 Sharp（Node.js）
npx sharp-cli -i input.png -o output.webp --format webp --quality 80

# 使用 ImageMagick
convert input.png -quality 85 output.webp

# 使用 Squoosh CLI
npx @nicolo-ribaudo/squoosh-cli --webp '{quality:80}' input.png
```

### 4.3 响应式图片

```html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="描述" loading="lazy" width="800" height="600" />
</picture>
```

## 5. 懒加载

### 5.1 原生懒加载

```html
<img src="photo.png" alt="描述" loading="lazy" />
```

### 5.2 Markdown 中的懒加载

部分渲染器支持在 Markdown 中添加 HTML 属性：

```markdown
<!-- Hugo -->

![描述](photo.png){loading=lazy}

<!-- VuePress -->

![描述](photo.png "title" =800x600)
```

### 5.3 全局懒加载

在网站中全局启用图片懒加载：

```javascript
// 为所有图片添加 loading="lazy"
document.querySelectorAll('img:not([loading])').forEach((img) => {
  img.setAttribute('loading', 'lazy');
});
```

## 6. 图床管理工具

### 6.1 常用工具

| 工具        | 平台   | 特点                   |
| :---------- | :----- | :--------------------- |
| **PicGo**   | 桌面端 | 支持多种图床，插件丰富 |
| **uPic**    | macOS  | 轻量，支持快捷键       |
| **PicList** | 桌面端 | PicGo 增强版           |
| **imgur**   | 在线   | 简单快捷               |

### 6.2 PicGo 配置

```json
// PicGo 配置示例（GitHub 图床）
{
  "picBed": {
    "current": "github",
    "github": {
      "repo": "user/image-hosting",
      "token": "ghp_xxxxx",
      "path": "images/",
      "branch": "main"
    }
  }
}
```

### 6.3 VS Code 集成

```bash
# 安装 PicGo 插件
# VS Code 扩展: PicGo

# 配置 settings.json
{
  "picgo.picBed.current": "github",
  "picgo.picBed.github.repo": "user/image-hosting",
  "picgo.picBed.github.token": "ghp_xxxxx"
}

# 使用：粘贴图片后自动上传并插入链接
```
