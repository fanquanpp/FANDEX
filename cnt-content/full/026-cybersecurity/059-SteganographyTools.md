---
order: 590
title: 隐写术工具命令
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity 隐写术工具命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## Steghide 隐写工具

**基本写法:嵌入数据到图像**
`steghide embed -cf <载体文件> -ef <隐藏文件>`
```bash
# 将 secret.txt 嵌入到图片中
steghide embed -cf image.jpg -ef secret.txt
```

**基本写法:使用密码嵌入**
`steghide embed -cf <载体文件> -ef <隐藏文件> -p <密码>`
```bash
# 使用指定密码嵌入数据
steghide embed -cf image.jpg -ef secret.txt -p mypassword
```

**基本写法:提取隐藏数据**
`steghide extract -sf <载体文件>`
```bash
# 从图片中提取隐藏数据
steghide extract -sf image.jpg
```

**基本写法:使用密码提取**
`steghide extract -sf <载体文件> -p <密码>`
```bash
# 使用密码提取隐藏数据
steghide extract -sf image.jpg -p mypassword
```

**基本写法:查看隐藏信息**
`steghide info <载体文件>`
```bash
# 查看载体文件是否包含隐藏数据
steghide info image.jpg
```

**基本写法:嵌入时压缩数据**
`steghide embed -cf <载体文件> -ef <隐藏文件> -z <级别>`
```bash
# 使用最高压缩级别嵌入数据
steghide embed -cf image.jpg -ef secret.txt -z 9
```

---

## stegseek 爆破工具

**基本写法:使用字典爆破**
`stegseek --seed <载体文件> <字典文件>`
```bash
# 使用字典爆破 steghide 密码
stegseek --seed image.jpg rockyou.txt
```

**基本写法:爆破并提取**
`stegseek --seed <载体文件> <字典文件> -xf <输出文件>`
```bash
# 爆破成功后提取到指定文件
stegseek --seed image.jpg rockyou.txt -xf extracted.txt
```

**基本写法:无字典暴力破解**
`stegseek --seed <载体文件> --crack`
```bash
# 不使用字典直接暴力破解
stegseek --seed image.jpg --crack
```

**基本写法:指定线程数**
`stegseek --seed <载体文件> <字典文件> -t <线程数>`
```bash
# 使用 8 线程加速爆破
stegseek --seed image.jpg rockyou.txt -t 8
```

**基本写法:查看爆破进度**
`stegseek --seed <载体文件> <字典文件> -v`
```bash
# 显示详细爆破进度
stegseek --seed image.jpg rockyou.txt -v
```

---

## zsteg PNG/BMP 分析

**基本写法:分析 PNG 隐写**
`zsteg <PNG文件>`
```bash
# 自动分析 PNG 文件中的隐藏数据
zsteg image.png
```

**基本写法:分析指定通道**
`zsteg -a <PNG文件>`
```bash
# 分析所有通道的隐藏数据
zsteg -a image.png
```

**基本写法:提取 LSB 数据**
`zsteg -e "b1,rgb,lsb,xy" <PNG文件>`
```bash
# 提取 LSB 编码的隐藏数据
zsteg -e "b1,rgb,lsb,xy" image.png
```

**基本写法:仅检查特定通道**
`zsteg -c "rgb" <PNG文件>`
```bash
# 仅检查 RGB 通道
zsteg -c "rgb" image.png
```

**基本写法:输出原始数据**
`zsteg -E "b1,rgb,lsb,xy" <PNG文件> > <输出文件>`
```bash
# 提取隐藏数据并保存到文件
zsteg -E "b1,rgb,lsb,xy" image.png > extracted.bin
```

---

## binwalk 固件分析

**基本写法:扫描文件中的嵌入数据**
`binwalk <文件>`
```bash
# 扫描文件中嵌入的文件签名
binwalk firmware.bin
```

**基本写法:提取嵌入文件**
`binwalk -e <文件>`
```bash
# 自动提取文件中的嵌入数据
binwalk -e firmware.bin
```

**基本写法:递归提取**
`binwalk -eM <文件>`
```bash
# 递归提取所有嵌套的嵌入文件
binwalk -eM firmware.bin
```

**基本写法:指定提取目录**
`binwalk -e -C <目录> <文件>`
```bash
# 指定提取输出目录
binwalk -e -C /tmp/extracted firmware.bin
```

**基本写法:搜索指定签名**
`binwalk -R "<签名>" <文件>`
```bash
# 搜索指定的文件签名
binwalk -R "PK" firmware.bin
```

**基本写法:显示熵分析**
`binwalk -E <文件>`
```bash
# 显示文件熵分析图(检测加密数据)
binwalk -E firmware.bin
```

---

## foremost 文件恢复

**基本写法:恢复删除的文件**
`foremost -i <输入文件> -o <输出目录>`
```bash
# 从镜像文件恢复已删除文件
foremost -i disk.img -o /tmp/recovered
```

**基本写法:指定文件类型**
`foremost -t <类型> -i <输入文件> -o <输出目录>`
```bash
# 仅恢复图片与文档文件
foremost -t jpg,png,pdf,doc -i disk.img -o /tmp/recovered
```

**基本写法:从设备恢复**
`foremost -i /dev/sda1 -o <输出目录>`
```bash
# 从分区设备恢复文件
sudo foremost -i /dev/sda1 -o /tmp/recovered
```

**基本写法:详细模式恢复**
`foremost -v -i <输入文件> -o <输出目录>`
```bash
# 详细模式显示恢复进度
foremost -v -i disk.img -o /tmp/recovered
```

**基本写法:指定配置文件**
`foremost -c <配置文件> -i <输入文件>`
```bash
# 使用自定义规则文件恢复
foremost -c /etc/foremost.conf -i disk.img
```

---

## exiftool 元数据分析

**基本写法:查看 EXIF 信息**
`exiftool <图片文件>`
```bash
# 查看图片所有 EXIF 元数据
exiftool image.jpg
```

**基本写法:提取 GPS 信息**
`exiftool -gps* <图片文件>`
```bash
# 提取图片中的 GPS 位置信息
exiftool -gps* image.jpg
```

**基本写法:删除所有元数据**
`exiftool -all= <图片文件>`
```bash
# 删除图片所有元数据保护隐私
exiftool -all= image.jpg
```

**基本写法:批量删除元数据**
`exiftool -all= -r <目录>`
```bash
# 递归删除目录下所有图片元数据
exiftool -all= -r /path/to/images/
```

**基本写法:查看注释字段**
`exiftool -comment -description <图片文件>`
```bash
# 查看图片注释字段是否含隐藏信息
exiftool -comment -description image.jpg
```

**基本写法:写入隐藏信息**
`exiftool -comment="<隐藏信息>" <图片文件>`
```bash
# 在 EXIF 注释字段写入信息
exiftool -comment="hidden message" image.jpg
```

---

##音频隐写分析

**基本写法:使用 sonic-visualiser 分析**
`sonic-visualiser <音频文件>`
```bash
# 使用 sonic-visualiser 分析音频频谱
sonic-visualise audio.wav
```

**基本写法:提取音频 LSB**
`python3 -c "import wave; w=wave.open('<文件>'); print(w.readframes(w.getnframes()))"`
```bash
# Python 提取音频数据用于分析
python3 -c "import wave; w=wave.open('audio.wav'); data=w.readframes(w.getnframes()); print(data[:100])"
```

**基本写法:使用 stegolsb 嵌入**
`python3 -m stegolsb -h`
```bash
# 使用 stegolsb 在音频中嵌入数据
python3 -m stegolsb LSBAudioSteg -i audio.wav -s secret.txt -o output.wav -n 2
```

**基本写法:频谱图分析**
`sox <音频文件> -n spectrogram`
```bash
# 生成音频频谱图分析隐藏信息
sox audio.wav -n spectrogram -o spectrogram.png
```

**基本写法:提取音频元数据**
`exiftool <音频文件>`
```bash
# 查看音频文件元数据
exiftool audio.mp3
```

---

## 文本隐写工具

**基本写法:零宽字符隐写**
`python3 -c "print('text' + chr(0x200b) + 'hidden')"`
```bash
# 使用零宽字符隐藏信息
python3 -c "print('正常文本' + chr(0x200b) + chr(0x200c) + '隐藏信息')"
```

**基本写法:Snow 空格隐写**
`snow -C -m "<消息>" -p <密码> <输入文件> <输出文件>`
```bash
# 使用 snow 在文本末尾空格中隐藏信息
snow -C -m "secret message" input.txt output.txt
```

**基本写法:Snow 提取信息**
`snow -C -p <密码> <文件>`
```bash
# 从文本中提取 snow 隐藏的信息
snow -C -p password output.txt
```

**基本写法:Base64 隐藏**
`echo "<消息>" | base64`
```bash
# 使用 Base64 编码隐藏文本信息
echo "hidden message" | base64
```

**基本写法:Unicode 转义隐藏**
`python3 -c "print('\\u4f60\\u597d')"`
```bash
# 使用 Unicode 转义隐藏文本
python3 -c "print('显示文本\\u200b隐藏文本')"
```

---

## 隐写检测工具

**基本写法:使用 stegdetect 检测**
`stegdetect <图片文件>`
```bash
# 检测 JPEG 文件中的隐写
stegdetect image.jpg
```

**基本写法:指定敏感度**
`stegdetect -t <级别> <图片文件>`
```bash
# 设置检测敏感度(1-3)
stegdetect -t 3 image.jpg
```

**基本写法:批量检测**
`stegdetect *.jpg`
```bash
# 批量检测目录中的所有 JPEG 文件
stegdetect *.jpg
```

**基本写法:使用 stegexpose 检测**
`python3 stegexpose.py <图片>`
```bash
# 使用 stegexpose 检测图片隐写
python3 stegexpose.py image.png
```

**基本写法:文件熵分析**
`python3 -c "import math; data=open('<文件>','rb').read(); print(-sum(data.count(b)/len(data)*math.log2(data.count(b)/len(data)) for b in set(data) if data.count(b)))"`
```bash
# 计算文件熵值检测是否含加密数据
python3 -c "import math; data=open('image.jpg','rb').read(); ent=-sum(data.count(bytes([b]))/len(data)*math.log2(data.count(bytes([b]))/len(data)) for b in range(256) if data.count(bytes([b]))); print(f'熵值: {ent:.2f}')"
```

---

## 文件指纹与对比

**基本写法:计算图片哈希**
`md5sum <图片文件>`
```bash
# 计算 MD5 哈希用于对比
md5sum image.jpg
```

**基本写法:对比原图与隐写图**
`diff <原图哈希> <新图哈希>`
```bash
# 对比文件大小与哈希
ls -la original.jpg stego.jpg
md5sum original.jpg stego.jpg
```

**基本写法:查看文件大小差异**
`stat -c "%s %n" <文件1> <文件2>`
```bash
# 对比两个文件大小
stat -c "%s %n" original.jpg stego.jpg
```

**基本写法:十六进制对比**
`xxd <文件1> > /tmp/hex1; xxd <文件2> > /tmp/hex2; diff /tmp/hex1 /tmp/hex2`
```bash
# 十六进制对比两个文件差异
xxd original.jpg > /tmp/hex1.txt
xxd stego.jpg > /tmp/hex2.txt
diff /tmp/hex1.txt /tmp/hex2.txt | head
```

**基本写法:像素差异分析**
`python3 -c "from PIL import Image; img1=Image.open('<文件1>'); img2=Image.open('<文件2>'); print(img1.size, img2.size)"`
```bash
# Python 对比图片像素差异
python3 -c "
from PIL import Image
img1=Image.open('original.jpg')
img2=Image.open('stego.jpg')
diff=sum(1 for p1,p2 in zip(img1.getdata(),img2.getdata()) if p1!=p2)
print(f'差异像素数: {diff}')
"
```
