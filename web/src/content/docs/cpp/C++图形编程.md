---
order: 71
title: C++图形编程
module: cpp
category: C++
difficulty: intermediate
description: OpenGL与Vulkan图形编程
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++23与C++26新特性
  - cpp/C++网络编程
  - cpp/C++序列化
  - cpp/C++与Rust对比
prerequisites:
  - cpp/概述与环境配置
---

## 概述

C++ 图形编程是利用 C++ 调用图形 API 在屏幕上绘制图像的技术。主要的图形 API 包括 OpenGL 和 Vulkan。OpenGL 是历史悠久的跨平台图形库，API 简单直观，适合入门学习；Vulkan 是新一代图形 API，提供更底层的控制，性能更高但学习曲线更陡。两者都通过着色器（Shader）在 GPU 上执行图形计算。

为什么需要图形编程？游戏引擎、CAD 软件、数据可视化、虚拟现实等应用都需要直接与 GPU 交互。虽然 Unity、Unreal 等引擎封装了底层细节，但理解图形 API 的工作原理能帮助你更好地优化性能和解决渲染问题。

## 基础概念

**渲染管线**：GPU 处理图形数据的流程。顶点数据经过顶点着色器、图元装配、光栅化、片段着色器等阶段，最终输出到屏幕上的像素。

**着色器**：运行在 GPU 上的小程序，用 GLSL（OpenGL）或 SPIR-V（Vulkan）编写。顶点着色器处理顶点位置，片段着色器处理像素颜色。

**顶点缓冲对象（VBO）**：在 GPU 显存中存储顶点数据的缓冲区，避免每帧从 CPU 传输数据。

**纹理**：贴在三维物体表面的二维图像，让物体看起来更真实。

**帧缓冲**：渲染的目标缓冲区，默认是屏幕，也可以是离屏缓冲区（用于后期处理等）。

## 快速上手

### OpenGL 环境搭建

使用 GLFW 创建窗口，GLAD 加载 OpenGL 函数：

```bash
# 安装依赖（Ubuntu）
sudo apt install libglfw3-dev libglad-dev

# 安装依赖（vcpkg）
vcpkg install glfw3 glad
```

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(OpenGLDemo)

find_package(glfw3 CONFIG REQUIRED)
find_package(glad CONFIG REQUIRED)

add_executable(demo main.cpp)
target_link_libraries(demo glfw glad)
```

### 最简单的 OpenGL 程序

```cpp
// main.cpp - 创建窗口并清屏
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

// 窗口大小变化时的回调
void framebuffer_size_callback(GLFWwindow* window, int width, int height) {
    glViewport(0, 0, width, height);
}

// 处理输入
void processInput(GLFWwindow* window) {
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
        glfwSetWindowShouldClose(window, true);
    }
}

int main() {
    // 初始化 GLFW
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    // 创建窗口
    GLFWwindow* window = glfwCreateWindow(800, 600, "OpenGL Demo", nullptr, nullptr);
    if (!window) {
        std::cerr << "创建窗口失败" << std::endl;
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    // 加载 OpenGL 函数
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "加载 OpenGL 函数失败" << std::endl;
        return -1;
    }

    // 设置视口和回调
    glViewport(0, 0, 800, 600);
    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

    // 渲染循环
    while (!glfwWindowShouldClose(window)) {
        processInput(window);

        // 清屏 - 使用深蓝色背景
        glClearColor(0.1f, 0.2f, 0.4f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}
```

## 详细用法

### 绘制三角形

```cpp
// 顶点着色器源码
const char* vertexShaderSource = R"(
    #version 330 core
    layout (location = 0) in vec3 aPos;  // 输入顶点位置
    void main() {
        gl_Position = vec4(aPos, 1.0);
    }
)";

// 片段着色器源码
const char* fragmentShaderSource = R"(
    #version 330 core
    out vec4 FragColor;  // 输出颜色
    void main() {
        FragColor = vec4(1.0, 0.5, 0.2, 1.0);  // 橙色
    }
)";

// 编译着色器的辅助函数
GLuint compileShader(GLenum type, const char* source) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);

    // 检查编译错误
    GLint success;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (!success) {
        char infoLog[512];
        glGetShaderInfoLog(shader, 512, nullptr, infoLog);
        std::cerr << "着色器编译失败: " << infoLog << std::endl;
    }
    return shader;
}

// 创建着色器程序
GLuint createShaderProgram() {
    GLuint vertexShader = compileShader(GL_VERTEX_SHADER, vertexShaderSource);
    GLuint fragmentShader = compileShader(GL_FRAGMENT_SHADER, fragmentShaderSource);

    GLuint program = glCreateProgram();
    glAttachShader(program, vertexShader);
    glAttachShader(program, fragmentShader);
    glLinkProgram(program);

    // 着色器已链接到程序，可以删除
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    return program;
}

// 绘制三角形的完整流程
void drawTriangle() {
    // 三角形的三个顶点
    float vertices[] = {
        -0.5f, -0.5f, 0.0f,  // 左下
         0.5f, -0.5f, 0.0f,  // 右下
         0.0f,  0.5f, 0.0f   // 顶部
    };

    // 创建顶点缓冲对象和顶点数组对象
    GLuint VAO, VBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);

    // 绑定 VAO（记录后续的顶点属性配置）
    glBindVertexArray(VAO);

    // 绑定 VBO 并复制数据
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    // 设置顶点属性指针
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);

    // 解绑
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    glBindVertexArray(0);

    // 创建着色器程序
    GLuint shaderProgram = createShaderProgram();

    // 在渲染循环中绘制
    glUseProgram(shaderProgram);
    glBindVertexArray(VAO);
    glDrawArrays(GL_TRIANGLES, 0, 3);
}
```

### 纹理映射

```cpp
// 带纹理坐标的顶点数据
float texturedVertices[] = {
    // 位置              // 纹理坐标
    -0.5f, -0.5f, 0.0f,  0.0f, 0.0f,  // 左下
     0.5f, -0.5f, 0.0f,  1.0f, 0.0f,  // 右下
     0.5f,  0.5f, 0.0f,  1.0f, 1.0f,  // 右上
    -0.5f,  0.5f, 0.0f,  0.0f, 1.0f   // 左上
};

// 索引数据（两个三角形组成一个矩形）
unsigned int indices[] = {
    0, 1, 2,  // 第一个三角形
    2, 3, 0   // 第二个三角形
};

// 加载纹理
GLuint loadTexture(const char* imagePath) {
    GLuint texture;
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);

    // 设置纹理参数
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

    // 加载图片数据（这里使用 stb_image 库）
    int width, height, nrChannels;
    unsigned char* data = stbi_load(imagePath, &width, &height, &nrChannels, 0);
    if (data) {
        GLenum format = (nrChannels == 4) ? GL_RGBA : GL_RGB;
        glTexImage2D(GL_TEXTURE_2D, 0, format, width, height, 0, format, GL_UNSIGNED_BYTE, data);
        glGenerateMipmap(GL_TEXTURE_2D);
    } else {
        std::cerr << "纹理加载失败: " << imagePath << std::endl;
    }
    stbi_image_free(data);

    return texture;
}
```

### 变换矩阵

```cpp
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

// 在渲染循环中应用变换
void renderWithTransform(GLuint shaderProgram) {
    // 模型矩阵：旋转物体
    glm::mat4 model = glm::rotate(glm::mat4(1.0f),
        glm::radians(45.0f), glm::vec3(0.0f, 0.0f, 1.0f));

    // 视图矩阵：移动相机
    glm::mat4 view = glm::translate(glm::mat4(1.0f), glm::vec3(0.0f, 0.0f, -3.0f));

    // 投影矩阵：透视投影
    glm::mat4 projection = glm::perspective(glm::radians(45.0f),
        800.0f / 600.0f, 0.1f, 100.0f);

    // 传递矩阵到着色器
    glUseProgram(shaderProgram);
    glUniformMatrix4fv(glGetUniformLocation(shaderProgram, "model"), 1, GL_FALSE, glm::value_ptr(model));
    glUniformMatrix4fv(glGetUniformLocation(shaderProgram, "view"), 1, GL_FALSE, glm::value_ptr(view));
    glUniformMatrix4fv(glGetUniformLocation(shaderProgram, "projection"), 1, GL_FALSE, glm::value_ptr(projection));
}
```

### Vulkan 简介

Vulkan 比 OpenGL 更底层，需要手动管理更多细节：

```cpp
// Vulkan 的初始化流程（简化版）
#include <vulkan/vulkan.h>

int main() {
    // 1. 创建 Vulkan 实例
    VkInstance instance;
    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    vkCreateInstance(&createInfo, nullptr, &instance);

    // 2. 选择物理设备（GPU）
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());

    // 3. 创建逻辑设备
    VkDevice device;
    // ... 需要配置队列族、扩展等

    // 4. 创建交换链
    // 5. 创建渲染通道
    // 6. 创建帧缓冲
    // 7. 创建命令缓冲
    // 8. 渲染循环中提交命令

    // 清理
    vkDestroyInstance(instance, nullptr);
    return 0;
}
```

Vulkan 的代码量远大于 OpenGL，通常建议使用辅助库如 Vulkan-Hpp 或框架如 bgfx 来简化开发。

## 常见场景

### 3D 立方体渲染

```cpp
// 立方体的顶点数据（6个面，每面2个三角形）
float cubeVertices[] = {
    // 前面
    -0.5f, -0.5f,  0.5f,  0.0f, 0.0f,
     0.5f, -0.5f,  0.5f,  1.0f, 0.0f,
     0.5f,  0.5f,  0.5f,  1.0f, 1.0f,
    -0.5f,  0.5f,  0.5f,  0.0f, 1.0f,
    // 后面
    -0.5f, -0.5f, -0.5f,  0.0f, 0.0f,
     0.5f, -0.5f, -0.5f,  1.0f, 0.0f,
     0.5f,  0.5f, -0.5f,  1.0f, 1.0f,
    -0.5f,  0.5f, -0.5f,  0.0f, 1.0f,
    // ... 其余4个面
};

// 在渲染循环中旋转立方体
glm::mat4 model = glm::rotate(glm::mat4(1.0f),
    (float)glfwGetTime() * glm::radians(50.0f),
    glm::vec3(0.5f, 1.0f, 0.0f));

// 启用深度测试，确保前面的面遮挡后面的面
glEnable(GL_DEPTH_TEST);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
```

## 注意事项

**OpenGL 与 Vulkan 的选择**：学习图形编程建议从 OpenGL 开始，概念更简单。需要更高性能和更细粒度控制时再转向 Vulkan。

**着色器调试困难**：着色器运行在 GPU 上，无法像 CPU 代码那样断点调试。使用 `glGetShaderInfoLog` 获取编译错误信息，使用 RenderDoc 等工具分析渲染过程。

**坐标系差异**：OpenGL 使用右手坐标系，Vulkan 使用左手坐标系。纹理坐标的 Y 轴方向也不同。

**驱动兼容性**：不同 GPU 厂商的驱动行为可能不同。在 NVIDIA 上正常的代码在 AMD 或 Intel 上可能有问题，需要多平台测试。

**内存管理**：GPU 资源（缓冲区、纹理）需要手动管理。忘记释放会导致显存泄漏。

## 进阶用法

### 使用 bgfx 跨平台图形库

```cpp
#include <bgfx/bgfx.h>
#include <bgfx/platform.h>

// bgfx 封装了 OpenGL、Vulkan、DirectX 等后端
// 用同一套代码在不同平台上运行

// 初始化
bgfx::Init init;
init.type = bgfx::RendererType::Count;  // 自动选择
init.resolution.width = 800;
init.resolution.height = 600;
init.resolution.reset = BGFX_RESET_VSYNC;
bgfx::init(init);

// 创建顶点缓冲
bgfx::VertexLayout layout;
layout.begin()
    .add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float)
    .add(bgfx::Attrib::TexCoord0, 2, bgfx::AttribType::Float)
.end();

bgfx::VertexBufferHandle vbh = bgfx::createVertexBuffer(
    bgfx::makeRef(vertices, sizeof(vertices)), layout);

// 提交绘制命令
bgfx::submit(0, programHandle);
bgfx::frame();
```
