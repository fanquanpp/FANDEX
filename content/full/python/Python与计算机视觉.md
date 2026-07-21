---
order: 68
title: Python与计算机视觉
module: python
category: Python
difficulty: intermediate
description: OpenCV与图像处理
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与深度学习
  - python/Python与NLP
  - python/Python与Web爬虫
  - python/Python与自动化
prerequisites:
  - python/语法速查
---

## 什么是计算机视觉

计算机视觉是让计算机"看懂"图像和视频的技术。人类可以轻松识别照片中的人脸、读取路牌上的文字、判断前方是否有障碍物，但对计算机来说，图像只是一堆数字。计算机视觉的目标就是让计算机从这些数字中提取出有意义的信息。

Python 是计算机视觉领域最流行的编程语言，拥有丰富的开源库。其中 OpenCV 是最基础也最重要的库，几乎所有计算机视觉项目都会用到它。

## 基础概念

### 图像在计算机中的表示

在计算机中，图像是一个三维数组。一张彩色图片由红、绿、蓝三个通道组成，每个通道是一个二维矩阵，矩阵中的每个值表示该位置该颜色的强度（0-255）。所以一张宽 W、高 H 的彩色图片，在计算机中是一个形状为 (H, W, 3) 的数组。

灰度图只有一个通道，形状为 (H, W)，每个值表示该位置的亮度。

### 像素

像素是图像的最小单位。一张 1920x1080 的图片有 1920 列和 1080 行像素，共约 207 万个像素点。每个像素的值越大，该位置越亮。

### 颜色空间

OpenCV 默认使用 BGR 颜色空间（注意不是 RGB），即蓝-绿-红顺序。这是因为 OpenCV 早期基于 Windows 的 BMP 格式，而 BMP 使用 BGR 顺序。在显示或与其他库交互时，通常需要转换成 RGB。

### 核与卷积

很多图像处理操作（如模糊、锐化、边缘检测）都基于卷积操作。卷积核是一个小矩阵，在图像上滑动，对每个位置的像素值进行加权求和，得到新的像素值。核的大小和权重决定了处理效果。

## 快速上手

### 安装 OpenCV

```bash
# 安装 OpenCV 主库
pip install opencv-python

# 如果需要额外的模块（如 SIFT、SURF 等专利算法）
pip install opencv-contrib-python

# 安装 numpy（OpenCV 依赖）
pip install numpy
```

### 读取和显示图片

```python
import cv2

# 读取图片（默认读取为彩色图）
img = cv2.imread('photo.jpg')

# 显示图片
cv2.imshow('My Photo', img)

# 等待按键后关闭窗口
cv2.waitKey(0)
cv2.destroyAllWindows()
```

### 读取和保存图片

```python
import cv2

# 读取彩色图片
img_color = cv2.imread('photo.jpg')

# 读取灰度图片（第二个参数指定读取模式）
img_gray = cv2.imread('photo.jpg', cv2.IMREAD_GRAYSCALE)

# 保存图片
cv2.imwrite('output.jpg', img_color)
cv2.imwrite('output_gray.jpg', img_gray)
```

### 查看图片基本信息

```python
import cv2

img = cv2.imread('photo.jpg')

# 图片的形状（高度、宽度、通道数）
print(f"形状: {img.shape}")

# 图片的数据类型
print(f"数据类型: {img.dtype}")

# 图片的像素总数
print(f"像素总数: {img.size}")
```

## 详细用法

### 颜色空间转换

```python
import cv2

img = cv2.imread('photo.jpg')

# BGR 转 RGB（用于 matplotlib 显示）
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# BGR 转灰度
img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# BGR 转 HSV（色相-饱和度-明度，常用于颜色检测）
img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
```

### 图像缩放与裁剪

```python
import cv2

img = cv2.imread('photo.jpg')
height, width = img.shape[:2]

# 缩放到指定大小
img_resized = cv2.resize(img, (800, 600))

# 按比例缩放（缩小到原来的一半）
img_half = cv2.resize(img, (width // 2, height // 2))

# 裁剪图片（NumPy 切片，先行后列）
# 裁剪出图片中间区域
img_cropped = img[100:400, 200:600]
```

### 图像模糊与平滑

模糊操作可以去除图像中的噪点，是很多处理流程的预处理步骤：

```python
import cv2

img = cv2.imread('photo.jpg')

# 均值模糊（核越大越模糊）
img_blur = cv2.blur(img, (15, 15))

# 高斯模糊（更自然，最常用）
img_gaussian = cv2.GaussianBlur(img, (15, 15), 0)

# 中值模糊（对椒盐噪点效果最好）
img_median = cv2.medianBlur(img, 15)
```

### 边缘检测

边缘检测用于找出图像中亮度变化剧烈的位置，也就是物体的轮廓：

```python
import cv2

img = cv2.imread('photo.jpg')

# 先转灰度（边缘检测通常在灰度图上进行）
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Canny 边缘检测
# 两个参数分别是低阈值和高阈值
edges = cv2.Canny(gray, 100, 200)

# 保存结果
cv2.imwrite('edges.jpg', edges)
```

### 阈值处理

阈值处理将灰度图转换为二值图（只有黑白两色），常用于分割前景和背景：

```python
import cv2

img = cv2.imread('photo.jpg')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 简单阈值：大于 127 的像素设为 255（白），否则设为 0（黑）
_, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

# 自适应阈值：根据局部区域自动计算阈值
adaptive = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY, 11, 2
)

# Otsu 自动阈值：自动找到最佳阈值
_, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

### 绘制图形和文字

在图像上绘制标注是调试和展示结果的常用操作：

```python
import cv2
import numpy as np

# 创建一张黑色图片（高度 480，宽度 640，3 通道）
img = np.zeros((480, 640, 3), dtype=np.uint8)

# 画一条线（图片，起点，终点，颜色BGR，线宽）
cv2.line(img, (0, 0), (640, 480), (255, 0, 0), 2)

# 画一个矩形（图片，左上角，右下角，颜色，线宽）
cv2.rectangle(img, (100, 100), (300, 300), (0, 255, 0), 3)

# 画一个圆（图片，圆心，半径，颜色，线宽，-1表示填充）
cv2.circle(img, (400, 300), 80, (0, 0, 255), -1)

# 添加文字（图片，文字内容，位置，字体，大小，颜色，粗细）
cv2.putText(img, 'Hello OpenCV', (50, 50),
            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

cv2.imwrite('drawings.jpg', img)
```

### 读取和处理视频

```python
import cv2

# 打开摄像头（0 表示默认摄像头）
cap = cv2.VideoCapture(0)

# 或者打开视频文件
# cap = cv2.VideoCapture('video.mp4')

while True:
    # 逐帧读取
    ret, frame = cap.read()
    if not ret:
        break

    # 对每一帧进行处理（例如转灰度）
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 显示处理后的帧
    cv2.imshow('Video', gray)

    # 按 q 键退出
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 释放资源
cap.release()
cv2.destroyAllWindows()
```

### 保存视频

```python
import cv2

cap = cv2.VideoCapture(0)

# 获取视频的宽高和帧率
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

# 创建视频写入对象
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('output.mp4', fourcc, fps, (width, height))

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # 可以对帧进行处理
    # frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 写入帧
    out.write(frame)

    cv2.imshow('Recording', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
out.release()
cv2.destroyAllWindows()
```

### 轮廓检测

轮廓检测用于找出图像中物体的边界：

```python
import cv2

img = cv2.imread('objects.jpg')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 先做阈值处理得到二值图
_, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

# 查找轮廓
contours, hierarchy = cv2.findContours(
    binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
)

# 在原图上绘制所有轮廓
cv2.drawContours(img, contours, -1, (0, 255, 0), 2)

# 遍历每个轮廓，获取其属性
for contour in contours:
    # 计算轮廓面积
    area = cv2.contourArea(contour)

    # 计算轮廓的边界矩形
    x, y, w, h = cv2.boundingRect(contour)

    # 在边界矩形上画框
    cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)

cv2.imwrite('contours.jpg', img)
```

## 常见场景

### 人脸检测

使用 OpenCV 内置的 Haar 级联分类器检测人脸：

```python
import cv2

# 加载预训练的人脸检测器
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

img = cv2.imread('group_photo.jpg')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 检测人脸
# 参数：图像，缩放因子，最小邻居数，最小尺寸
faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))

# 在检测到的人脸位置画矩形框
for (x, y, w, h) in faces:
    cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)

cv2.imwrite('faces_detected.jpg', img)
print(f"检测到 {len(faces)} 张人脸")
```

### 颜色追踪

追踪图像中特定颜色的物体：

```python
import cv2
import numpy as np

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 转换到 HSV 颜色空间
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    # 定义要追踪的颜色范围（以蓝色为例）
    lower_blue = np.array([100, 50, 50])
    upper_blue = np.array([130, 255, 255])

    # 创建颜色掩码
    mask = cv2.inRange(hsv, lower_blue, upper_blue)

    # 用掩码提取蓝色区域
    result = cv2.bitwise_and(frame, frame, mask=mask)

    cv2.imshow('Original', frame)
    cv2.imshow('Blue Only', result)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

### 图片拼接

将多张图片拼接成全景图：

```python
import cv2

# 读取两张有重叠区域的图片
img1 = cv2.imread('left.jpg')
img2 = cv2.imread('right.jpg')

# 创建拼接器
stitcher = cv2.Stitcher_create()

# 执行拼接
status, pano = stitcher.stitch([img1, img2])

if status == cv2.Stitcher_OK:
    cv2.imwrite('panorama.jpg', pano)
    print("拼接成功")
else:
    print(f"拼接失败，错误码: {status}")
```

## 注意事项与常见错误

### BGR 与 RGB 顺序

OpenCV 使用 BGR 顺序，而 matplotlib、PIL 等库使用 RGB 顺序。如果用 matplotlib 显示 OpenCV 读取的图片，颜色会不对：

```python
import cv2
import matplotlib.pyplot as plt

img = cv2.imread('photo.jpg')

# 错误：直接显示，颜色不对
# plt.imshow(img)

# 正确：先转换颜色空间
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
plt.imshow(img_rgb)
plt.show()
```

### 图片路径中的中文

OpenCV 的 imread 不支持中文路径。解决方法是先用 NumPy 读取文件，再由 OpenCV 解码：

```python
import cv2
import numpy as np

# 正确读取中文路径的图片
def imread_chinese(filename):
    # 用 NumPy 读取文件字节
    data = np.fromfile(filename, dtype=np.uint8)
    # 用 OpenCV 解码
    return cv2.imdecode(data, cv2.IMREAD_COLOR)

img = imread_chinese('照片.jpg')
```

### imshow 窗口无响应

调用 imshow 后必须调用 waitKey，否则窗口不会刷新显示。waitKey 的参数是等待时间（毫秒），0 表示无限等待：

```python
cv2.imshow('Image', img)
cv2.waitKey(0)  # 必须调用，否则窗口无响应
cv2.destroyAllWindows()
```

### 图片为 None

如果图片路径不存在或格式不支持，imread 不会报错，而是返回 None。务必检查返回值：

```python
img = cv2.imread('photo.jpg')
if img is None:
    print("图片读取失败，请检查路径")
else:
    # 正常处理
    pass
```

### 坐标系

OpenCV 中图像的坐标系是：原点在左上角，x 轴向右（列），y 轴向下（行）。在 NumPy 切片中，先是行（y）后是列（x），这和直觉可能相反：

```python
# 裁剪区域：y1:y2, x1:x2
roi = img[y1:y2, x1:x2]
```

## 进阶用法

### 特征匹配

使用 ORB 特征检测器匹配两张图片中的相同特征：

```python
import cv2

# 读取两张图片
img1 = cv2.imread('template.jpg', cv2.IMREAD_GRAYSCALE)
img2 = cv2.imread('scene.jpg', cv2.IMREAD_GRAYSCALE)

# 创建 ORB 特征检测器
orb = cv2.ORB_create()

# 检测关键点和描述符
kp1, des1 = orb.detectAndCompute(img1, None)
kp2, des2 = orb.detectAndCompute(img2, None)

# 创建 BFMatcher（暴力匹配器）
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

# 匹配特征
matches = bf.match(des1, des2)

# 按距离排序，取最好的 20 个匹配
matches = sorted(matches, key=lambda x: x.distance)[:20]

# 绘制匹配结果
result = cv2.drawMatches(img1, kp1, img2, kp2, matches, None)
cv2.imwrite('matches.jpg', result)
```

### 模板匹配

在一张大图中查找小图的位置：

```python
import cv2
import numpy as np

# 读取大图和模板小图
img = cv2.imread('scene.jpg')
template = cv2.imread('template.jpg')

# 执行模板匹配
result = cv2.matchTemplate(img, template, cv2.TM_CCOEFF_NORMED)

# 找到最佳匹配位置
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

# 获取模板的宽高
h, w = template.shape[:2]

# 在匹配位置画矩形
top_left = max_loc
bottom_right = (top_left[0] + w, top_left[1] + h)
cv2.rectangle(img, top_left, bottom_right, (0, 255, 0), 2)

cv2.imwrite('template_matched.jpg', img)
```

### 使用 NumPy 进行像素级操作

OpenCV 图像本质是 NumPy 数组，可以直接用 NumPy 操作：

```python
import cv2
import numpy as np

img = cv2.imread('photo.jpg')

# 获取某个像素的 BGR 值
pixel = img[100, 200]
print(f"BGR 值: {pixel}")

# 修改某个像素的颜色
img[100, 200] = [255, 255, 255]  # 设为白色

# 获取某个区域的像素
roi = img[50:150, 100:300]

# 将某个区域替换为另一个区域
img[200:300, 100:300] = roi

# 创建渐变图
gradient = np.zeros((256, 256), dtype=np.uint8)
for i in range(256):
    gradient[i, :] = i  # 每行一个灰度值

cv2.imwrite('gradient.jpg', gradient)
```
