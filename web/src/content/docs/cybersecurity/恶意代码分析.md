---
order: 55
title: 恶意代码分析
module: cybersecurity
category: 网络安全
difficulty: advanced
description: 恶意代码分析：静态分析、动态分析、沙箱、逆向工程与恶意软件分类
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/文件上传漏洞
  - cybersecurity/SSRF攻击
  - cybersecurity/云安全
  - cybersecurity/对称加密
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 恶意软件分类

### 1.1 按行为分类

| 类型     | 行为         | 示例         |
| -------- | ------------ | ------------ |
| 病毒     | 感染宿主文件 | CIH          |
| 蠕虫     | 自我传播     | WannaCry     |
| 木马     | 伪装合法软件 | Emotet       |
| 勒索软件 | 加密勒索     | Ryuk         |
| Rootkit  | 隐藏自身     | Sony Rootkit |
| RAT      | 远程控制     | Gh0st        |

### 1.2 按目标分类

| 类型     | 目标     | 示例    |
| -------- | -------- | ------- |
| 银行木马 | 网银     | Zeus    |
| 勒索软件 | 数据     | LockBit |
| 间谍软件 | 信息     | Pegasus |
| 僵尸网络 | 控制     | Mirai   |
| APT      | 持续渗透 | Stuxnet |

## 2. 静态分析

### 2.1 文件特征

```bash
# 文件类型
file malware.exe

# 哈希
sha256sum malware.exe

# 字符串提取
strings malware.exe | grep -i "http\|password\|key"

# PE头分析
python pefile.py malware.exe
```

### 2.2 反汇编

| 工具         | 说明       |
| ------------ | ---------- |
| IDA Pro      | 专业反汇编 |
| Ghidra       | NSA开源    |
| Radare2      | 命令行     |
| Binary Ninja | 现代       |

### 2.3 签名检测

```bash
# YARA 规则
rule Malware_Detector {
    meta:
        description = "Detects known malware"
    strings:
        $s1 = "cmd.exe /c" ascii
        $s2 = { 6A 40 68 00 30 00 00 }
    condition:
        any of them
}
```

## 3. 动态分析

### 3.1 沙箱分析

| 沙箱            | 特点   |
| --------------- | ------ |
| Cuckoo Sandbox  | 开源   |
| Joe Sandbox     | 商业   |
| ANY.RUN         | 交互式 |
| Hybrid Analysis | 在线   |

### 3.2 行为监控

```bash
# 进程监控
Process Monitor (ProcMon)

# 网络监控
Wireshark / tcpdump

# 注册表监控
Regshot

# API 调用追踪
API Monitor
```

### 3.3 网络行为分析

- DNS 请求
- HTTP/HTTPS 通信
- C2 通信模式
- 数据外传

## 4. 逆向工程

### 4.1 脱壳

| 壳        | 工具     |
| --------- | -------- |
| UPX       | upx -d   |
| Themida   | 手动脱壳 |
| VMProtect | 困难     |
| ASPack    | 脱壳工具 |

### 4.2 调试

```bash
# x64dbg 调试
1. 设置断点
2. 单步执行
3. 查看寄存器和内存
4. 分析算法逻辑
```

### 4.3 反混淆

- 字符串解密
- 控制流还原
- API 调用恢复

## 5. 勒索软件分析

### 5.1 常见勒索软件家族

| 家族     | 加密算法    | 特点            |
| -------- | ----------- | --------------- |
| WannaCry | AES+RSA     | 利用EternalBlue |
| Ryuk     | AES-256     | 针对性攻击      |
| LockBit  | AES+RSA     | RaaS模式        |
| Conti    | ChaCha8+RSA | 双重勒索        |

### 5.2 分析要点

- 加密算法和密钥管理
- 文件扩展名修改
- 勒索信内容
- C2 通信方式
- 是否可解密

## 6. 威胁情报生产

### 6.1 IOC 提取

| IOC类型  | 示例     |
| -------- | -------- |
| 文件哈希 | SHA256   |
| IP地址   | C2服务器 |
| 域名     | DGA域名  |
| URL      | 下载地址 |
| 互斥量   | 运行标识 |
| 注册表键 | 持久化   |

### 6.2 情报共享

- STIX/TAXII 标准
- MISP 平台
- OpenIOC 格式
