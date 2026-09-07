---
order: 250
title: 压缩解压命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: tar、gzip、zip、7z 等压缩归档命令的速查。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'shell/002-CommandLineBasics'
  - 'shell/022-TextProcessing'
  - 'shell/023-PipeRedirect'
prerequisites:
  - 'shell/002-CommandLineBasics'
---

## tar 归档

**基本用法:创建归档**
`tar [选项] <归档名> <文件>`

```bash
# 打包为 .tar
tar -cvf archive.tar src/

# 打包并 gzip 压缩(.tar.gz)
tar -czvf project.tar.gz dist/

# 打包并 bzip2 压缩(压缩率更高)
tar -cjvf project.tar.bz2 dist/

# 打包并 xz 压缩
tar -cJvf project.tar.xz dist/
```

---

**基本用法:查看归档内容**
`tar -tvf <归档名>`

```bash
# 列出 tar.gz 内容不解压
tar -tzvf project.tar.gz
```

---

**基本用法:解压归档**
`tar -xvf <归档名>`

```bash
# 解压到当前目录
tar -xzvf project.tar.gz

# 解压到指定目录
tar -xzvf project.tar.gz -C /opt/

# 仅解压指定文件
tar -xzvf project.tar.gz path/to/file
```

---

## gzip/bzip2 单文件压缩

**基本用法:gzip 压缩**
`gzip [选项] <文件>`

```bash
# 压缩(原文件被替换为 .gz)
gzip large.log

# 保留原文件压缩
gzip -k large.log

# 解压
gzip -d large.log.gz
```

---

**基本用法:bzip2 压缩**
`bzip2 <文件>`

```bash
# 压缩为 .bz2
bzip2 bigfile.dat

# 解压
bzip2 -d bigfile.dat.bz2
```

---

## zip/unzip

**基本用法:zip 压缩目录**
`zip [选项] <归档名> <路径>`

```bash
# 递归压缩目录
zip -r archive.zip src/

# 添加密码保护
zip -r -e secret.zip docs/

# 排除文件
zip -r app.zip . -x "*/node_modules/*"
```

---

**基本用法:unzip 解压**
`unzip [选项] <归档名>`

```bash
# 解压到当前目录
unzip archive.zip

# 解压到指定目录
unzip archive.zip -d /tmp/out

# 查看内容不解压
unzip -l archive.zip
```

---

## 7z 七格式

**基本用法:7z 压缩解压**
`7z <子命令> <归档名> <文件>`

```bash
# 压缩为 7z 格式
7z a archive.7z src/

# 解压
7z x archive.7z

# 列出内容
7z l archive.7z

# 自解压包
7z a -sfx archive.exe src/
```

---

## Windows 内置命令

**基本用法:PowerShell 压缩解压**
`Compress-Archive`

```powershell
# 压缩目录
Compress-Archive -Path src\* -DestinationPath app.zip

# 解压
Expand-Archive -Path app.zip -DestinationPath .\out
```

---

## 校验与分割

**基本用法:生成与校验哈希**
`sha256sum <文件>`

```bash
# 生成校验值
sha256sum image.iso > image.sha256

# 校验完整性
sha256sum -c image.sha256
```

---

**基本用法:大文件分割**
`split [选项] <文件>`

```bash
# 每 100MB 分割一个文件
split -b 100M big.tar.gz part_

# 合并
cat part_* > big.tar.gz
```
