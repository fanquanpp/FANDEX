---
order: 570
title: "C++ 图形编程：亲手点亮第一个三角形"
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: "从一张像素图想在屏幕上显示的真实需求出发，搭好 GLFW + GLAD 环境、画出第一个三角形、贴上纹理、应用变换矩阵，并把渲染管线逐阶段对应到刚写的代码，附黑屏排查实录与自检清单。"
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cpp/550-CppGameDev'
  - 'cpp/640-CppToolchain'
  - 'cpp/610-CppPerformance'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 前置知识

- [C++ 基础语法](/cpp/030-CppBasicSyntax)：会写函数、编译运行一个 C++ 程序；
- [构建工具链](/cpp/640-CppToolchain)：知道 CMake 是干什么的即可，本文给出可直接复制的配置；
- 不需要任何图形学基础，也不需要会线性代数——本文只在用到矩阵的地方给足直觉。

## 学习目标

读完本文你将能够：

1. 用 vcpkg + CMake 搭起 GLFW + GLAD 的 OpenGL 开发环境，并跑通第一个窗口；
2. 亲手画出一个三角形，说清 VAO、VBO、着色器各自负责什么；
3. 把一张 PNG 像素图作为纹理贴到画面上，理解 UV 坐标；
4. 用 model / view / projection 三个矩阵让图形移动、旋转、产生近大远小；
5. 面对「黑屏」「三角形不显示」「纹理上下颠倒」这三类高频问题，有一套可执行的排查顺序。

预计 90 到 120 分钟（含环境搭建）。

## 1. 问题引入：一张像素图，为什么不能直接「显示」出来

假设你有一批像素画素材——比如 pixel-vault 项目里的那些 PNG 角色与道具图，现在想让它们出现在一个自己写的窗口里，甚至动起来。你很快会发现一个反直觉的事实：**操作系统没有提供任何「把这张图显示出来」的直接函数**。CPU 负责逻辑，画面却是由 GPU 画到屏幕上的，而 GPU 是一块只认「顶点」和「着色器」的硬件：它不认识 PNG，不认识「角色」，只认识一串浮点数坐标和一小段在显卡上运行的程序。

所以「显示一张图」在图形编程里要拆成一条流水线：把图的四个角作为**顶点**交给 GPU，把图的像素数据上传为**纹理**，再写两段小程序（**着色器**）告诉 GPU「这些顶点摆在哪里」「每个像素涂什么颜色」。OpenGL 就是 CPU 与 GPU 之间约定好的对话语言——跨平台、历史最久、资料最多，是学习图形编程的标准入口。Vulkan 是它的继任者，控制更细、样板更多，本文最后会讲什么时候才值得切过去。

另一个常见疑问：为什么不直接用 Unity 或 Godot？引擎确实封装了这些细节，但引擎的渲染出问题（材质发黑、深度冲突、性能骤降）时，能定位问题的人恰恰是懂管线的人。本文的目标就是让你成为那个人。

## 2. 先搭环境：GLFW 管窗口，GLAD 管函数指针

OpenGL 只是一份 API 规范，具体函数由显卡驱动提供。这带来一个鸡生蛋问题：函数指针要从驱动里运行时获取，可你调用「获取函数」的函数本身也得先获取。GLAD 就是解决这一环的加载器；GLFW 则负责跨平台地创建窗口、接收键盘鼠标事件——这两件事 OpenGL 本身不管。

用 vcpkg 安装（Windows 与 Linux 通用，CMake 集成方式见[构建工具链](/cpp/640-CppToolchain)）：

```bash
vcpkg install glfw3 glad
# Ubuntu 下也可以直接用系统包
sudo apt install libglfw3-dev
```

CMakeLists.txt：

```cmake
cmake_minimum_required(VERSION 3.20)
project(FirstTriangle)

find_package(glfw3 CONFIG REQUIRED)
find_package(glad CONFIG REQUIRED)

add_executable(tri main.cpp)
target_link_libraries(tri PRIVATE glfw glad::glad)
```

自检点：`find_package` 报错说找不到包，多半是 vcpkg 工具链文件没传给 CMake（`-DCMAKE_TOOLCHAIN_FILE=.../vcpkg.cmake`），这是新手第一个被卡住的地方。

## 3. 第一个里程碑：让窗口显示一块自己的颜色

不求画出任何东西，先求「打开一个深蓝色的窗口」。这段程序是后续一切的地基：

```cpp
// main.cpp —— 第一版：窗口 + 清屏
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

int main() {
    glfwInit();
    // 明确告诉驱动：我们要 OpenGL 3.3 核心 Profile（现代写法，废弃了旧即时模式）
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "first triangle", nullptr, nullptr);
    if (!window) {
        std::cerr << "create window failed\n";
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    // 窗口建好后才能向驱动要函数指针
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "load glad failed\n";
        return -1;
    }
    glViewport(0, 0, 800, 600);

    // 渲染循环：只要窗口没被关闭，就不停地 画 -> 交换 -> 处理事件
    while (!glfwWindowShouldClose(window)) {
        glClearColor(0.1f, 0.2f, 0.4f, 1.0f);  // 设定清屏色：深蓝
        glClear(GL_COLOR_BUFFER_BIT);          // 用清屏色涂满整个画布

        glfwSwapBuffers(window);  // 把后台画好的帧翻到前台（双缓冲）
        glfwPollEvents();         // 收键盘鼠标消息，否则窗口会「未响应」
    }
    glfwTerminate();
    return 0;
}
```

编译运行，预期结果：一个 800x600 的深蓝色窗口出现，关掉后程序退出。

这里的「双缓冲」值得停一下：GPU 直接画到屏幕会造成「画一半就被看见」的撕裂，所以图形库都画在后台缓冲区，画完一帧后整体交换。`glClearColor` + `glClear` 则是每帧的第一步——先把画布擦干净，因为上一帧的内容还留在缓冲区里。

修改实验：把 `glClearColor` 的前三个参数改成 `(0.9f, 0.3f, 0.2f)` 再跑一次。颜色变红说明环境完全通了——这一步验证的不是图形学知识，而是工具链，必须先绿再走。

## 4. 画出第一个三角形：管线一次走通

三角形是图形学的「hello world」，因为任何复杂模型最终都被拆成三角形。要把三个顶点变成屏幕上的颜色，GPU 需要你提供两样东西：**顶点数据**和**着色器程序**。

### 4.1 两段着色器：GPU 上运行的小程序

```cpp
// 顶点着色器：每个顶点执行一次，决定它落在屏幕哪个位置
const char* vertexShaderSource = R"(
    #version 330 core
    layout (location = 0) in vec3 aPos;   // 从第 0 号槽位读入顶点坐标
    void main() {
        gl_Position = vec4(aPos, 1.0);
    }
)";

// 片段着色器：每个可能被画出的像素执行一次，决定它的颜色
const char* fragmentShaderSource = R"(
    #version 330 core
    out vec4 FragColor;                   // 输出 RGBA 颜色
    void main() {
        FragColor = vec4(1.0, 0.5, 0.2, 1.0);  // 橙色
    }
)";
```

注意这是 GLSL（OpenGL Shading Language），不是 C++，只是长得像。`aPos` 的取值范围是 -1 到 1（NDC，标准化设备坐标），原点在屏幕正中心——这不是像素坐标，后面配投影矩阵后才进入「世界尺度」。

编译并链接着色器的辅助函数（错误检查是重点，着色器写错是新手最高频事故）：

```cpp
#include <string>

GLuint compileShader(GLenum type, const char* source) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);

    GLint success = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (!success) {
        char infoLog[512];
        glGetShaderInfoLog(shader, 512, nullptr, infoLog);
        std::cerr << "shader compile failed: " << infoLog << "\n";
    }
    return shader;
}

GLuint createShaderProgram() {
    GLuint vs = compileShader(GL_VERTEX_SHADER, vertexShaderSource);
    GLuint fs = compileShader(GL_FRAGMENT_SHADER, fragmentShaderSource);
    GLuint program = glCreateProgram();
    glAttachShader(program, vs);
    glAttachShader(program, fs);
    glLinkProgram(program);
    glDeleteShader(vs);  // 已链入程序，单独的着色器对象可以删了
    glDeleteShader(fs);
    return program;
}
```

### 4.2 顶点数据上传：VBO 与 VAO

```cpp
float vertices[] = {
    -0.5f, -0.5f, 0.0f,   // 左下
     0.5f, -0.5f, 0.0f,   // 右下
     0.0f,  0.5f, 0.0f    // 顶部
};

GLuint VAO, VBO;
glGenVertexArrays(1, &VAO);
glGenBuffers(1, &VBO);

glBindVertexArray(VAO);                       // VAO 开始「录音」
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);  // 数据上传显存

// 告诉 OpenGL：每 3 个 float 为一个顶点，从缓冲区第 0 字节开始，对应 location = 0
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);

glBindVertexArray(0);                         // 停止「录音」
```

三个缩写的分工，用快递类比：**VBO** 是装货的箱子（顶点数据躺在显存里）；`glVertexAttribPointer` 是箱子上的「装箱说明」（每件货多大、从哪开始读）；**VAO** 是记录这些说明的快递单——下次绘制前只需把快递单递给 GPU，全套配置一键恢复。

### 4.3 在渲染循环里绘制

```cpp
GLuint shaderProgram = createShaderProgram();  // 循环外做一次

while (!glfwWindowShouldClose(window)) {
    glClearColor(0.1f, 0.2f, 0.4f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    glUseProgram(shaderProgram);   // 启用着色器
    glBindVertexArray(VAO);        // 递上「快递单」
    glDrawArrays(GL_TRIANGLES, 0, 3);  // 从第 0 个顶点起，画 3 个

    glfwSwapBuffers(window);
    glfwPollEvents();
}
```

预期结果：深蓝背景正中一个实心橙色三角形。

修改实验（对着色器报错脱敏）：把片段着色器里的 `FragColor` 改名成 `frag` 再编译。你会看到 `shader compile failed: ... 'frag' : undeclared identifier` 这样的驱动日志——着色器的语法错误不会让 C++ 编译失败，只会在运行期从这条日志里吐出来，所以 `glGetShaderInfoLog` 那段检查代码一行都不能省。

## 5. 回头看：刚才的代码如何流过渲染管线

现在把管线图和代码对上号，这一步做完，「画三角形」就从咒语变成了理解：

```text
顶点数据(VBO/VAO) -> 顶点着色器 -> 图元装配(连成三角形) -> 光栅化(切成像素)
      -> 片段着色器(算颜色) -> 逐片段测试(深度/模板) -> 帧缓冲(屏幕)
```

- 顶点着色器：`gl_Position` 就在这里产生，每个顶点跑一次；
- 光栅化：GPU 把三角形覆盖的每个像素切成「片段」，这一步完全自动，无法编程；
- 片段着色器：`FragColor` 在这里产生，每个片段跑一次——一帧内它可能被执行数百万次，所以着色器性能就是渲染性能的大头（优化话题见[性能剖析](/cpp/610-CppPerformance)）；
- 深度测试：本文最后启用，用于让近处的面遮挡远处的面。

一句话总结分工：**你写的 C++ 负责「准备与提交」，GPU 按管线自动流转，你只能通过着色器控制两个可编程阶段**。

## 6. 贴上纹理：让像素图真正出现在窗口里

回到开头的需求：显示 pixel-vault 的那张像素图。纹理（texture）就是上传到显存的一张图，片段着色器按 UV 坐标（0 到 1 的归一化图内坐标）去采样它。

先给每个顶点补上 UV（前 3 个数是位置，后 2 个数是图内坐标），并用索引让 4 个顶点画出 2 个三角形拼成矩形：

```cpp
float quad[] = {
    // 位置(x,y,z)        UV(u,v)
    -0.5f, -0.5f, 0.0f,   0.0f, 0.0f,   // 左下
     0.5f, -0.5f, 0.0f,   1.0f, 0.0f,   // 右下
     0.5f,  0.5f, 0.0f,   1.0f, 1.0f,   // 右上
    -0.5f,  0.5f, 0.0f,   0.0f, 1.0f    // 左上
};
unsigned int indices[] = { 0, 1, 2,  2, 3, 0 };  // 两个三角形
// 用 glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0) 配合 EBO 索引缓冲绘制
```

用轻量的 stb_image 读 PNG（单头文件库，`#define STB_IMAGE_IMPLEMENTATION` 后 include 即可用）：

```cpp
GLuint loadTexture(const char* path) {
    GLuint tex;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);

    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

    int w, h, channels;
    unsigned char* data = stbi_load(path, &w, &h, &channels, 0);
    if (data) {
        GLenum format = (channels == 4) ? GL_RGBA : GL_RGB;
        glTexImage2D(GL_TEXTURE_2D, 0, format, w, h, 0, format, GL_UNSIGNED_BYTE, data);
        glGenerateMipmap(GL_TEXTURE_2D);   // 生成缩小版链条，远处采样用
    } else {
        std::cerr << "texture load failed: " << path << "\n";
    }
    stbi_image_free(data);   // CPU 侧数据上传完即释放，显存里的才长期持有
    return tex;
}
```

片段着色器相应改为采样：`FragColor = texture(ourTexture, vUV);`（配合顶点着色器把 UV 用 `out`/`in` 传递）。

高频坑：**像素图显示出来是上下颠倒的**。图像文件第 0 行通常在顶部，而 UV 的 v=0 在底部，坐标系约定相反。像素画项目里最省事的两招：上传前 `stbi_set_flip_vertically_on_load(true)` 一行翻转；或在顶点数据里把 UV 的 v 值全部写成 `1.0 - v`。

## 7. 变换矩阵：让图动起来、产生远近

三角形定死在屏幕上，是因为顶点着色器把坐标原样输出。给它乘一个矩阵，图形就会移动、旋转、缩放——这就是 glm 库的用武之地：

```cpp
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

glm::mat4 model      = glm::rotate(glm::mat4(1.0f), (float)glfwGetTime(),
                                   glm::vec3(0.0f, 0.0f, 1.0f));   // 物体随时间自转
glm::mat4 view       = glm::translate(glm::mat4(1.0f), glm::vec3(0, 0, -3.0f)); // 相机后退 3 米
glm::mat4 projection = glm::perspective(glm::radians(45.0f), 800.0f / 600.0f,
                                        0.1f, 100.0f);             // 透视：近大远小

GLuint loc = glGetUniformLocation(shaderProgram, "uMVP");
glUniformMatrix4fv(loc, 1, GL_FALSE, glm::value_ptr(projection * view * model));
```

三个矩阵各管一段，顺序固定为 **projection \* view \* model**：

- model：物体自己的姿态（转多少度、挪到哪）；
- view：相机在哪、朝哪看（本质是「把整个世界反向移动」）；
- projection：把三维世界压到二维屏幕，透视投影带来近大远小。

不需要手推矩阵数学，先建立「每帧算一次 model（因为它随时间变）、view 和 projection 不变时只算一次」的性能直觉即可。

再启用深度测试，就能画不透明的立方体而不会里外穿帮：

```cpp
glEnable(GL_DEPTH_TEST);                       // 初始化时开一次
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);  // 每帧同时清颜色与深度
```

## 8. OpenGL 还是 Vulkan：一个务实的判断

Vulkan 把驱动的「魔法」全部显式化：内存分配、同步、命令提交都由你手动管理。画同一个三角形，OpenGL 约 300 行，Vulkan 轻松上千行——换来的是多线程提交、极低驱动开销与可预测的帧时间。判断标准很朴素：

| 你的情况 | 选择 |
| --- | --- |
| 学图形学概念、做工具、课程项目、2D 像素游戏 | OpenGL 3.3 足够 |
| 目标是商业引擎底层的图形工程师岗 | OpenGL 打基础后必须上 Vulkan |
| 只想「画出来就行」，跨平台后端无所谓 | 直接用抽象库 |

用抽象库是第三条路：bgfx、sokol 这类库把 OpenGL / Vulkan / DirectX / Metal 收敛成一套 API：

```cpp
// bgfx：同一份代码在 Windows 用 D3D11、Linux 用 Vulkan 渲染
bgfx::Init init;
init.type = bgfx::RendererType::Count;   // 自动选后端
init.resolution.width  = 800;
init.resolution.height = 600;
init.resolution.reset  = BGFX_RESET_VSYNC;
bgfx::init(init);
```

本文其余内容（管线、着色器、UV、MVP）在所有后端里概念完全一致——先在 OpenGL 上把这些学透，切任何后端都是换语法。

## 9. 常见错误与调试实录

**黑屏（窗口正常但什么都不显示）**。按顺序查：

1. 窗口提示没设 3.3 core profile，驱动给了兼容上下文，部分函数行为异常——对照第 3 节的三个 `glfwWindowHint`；
2. `gladLoadGLLoader` 失败被忽略，后续调用全是空指针——它返回值必须检查；
3. `glViewport` 尺寸和窗口不一致，图形画在了不可见区域；
4. 忘记 `glUseProgram` 或 `glBindVertexArray`，绘制调用静默无效。

**三角形不显示但无报错**。九成是顶点顺序问题：OpenGL 默认逆时针为正面，你按顺时针给了三个顶点又开启了背面剔除；或者 NDC 坐标写出了 -1 到 1 的范围，三角形整个落在屏幕外。

**着色器链接成功但 uniforms 全是 -1**。`glGetUniformLocation` 返回 -1 意味着驱动把这个 uniform 优化掉了（着色器里没实际使用它），不是查找函数坏了。

**换机器就花屏或崩溃**。GPU 驱动实现差异是图形编程的日常：NVIDIA 上正常的代码在 Intel 核显上可能出问题。重要项目至少在两家厂商的显卡上各跑一遍；分析一帧到底画了什么，用帧调试器 RenderDoc 逐 draw call 检查——它是图形调试的「断点调试器」。

**显存泄漏**。GPU 资源（`glGenTextures`、`glGenBuffers` 的产物）不会自动释放，退出前要 `glDelete*`；长期运行的程序里纹理反复加载不释放，显存会稳步上涨直到崩溃。

## 10. 实际项目中的使用场景

- 像素游戏与 2D 工具：OpenGL 3.3 + 批量渲染（把上千个精灵合并到少量 draw call），配合本文的纹理与 UV 知识已经够用；
- 数据可视化：把曲线、点云塞进 VBO，用片段着色器上色，性能远超 CPU 逐像素绘制；
- 引擎与商业项目：Vulkan / DirectX 12 的显式管线下，本文的管线阶段概念一一对应，只是控制粒度更细。

## 11. 小练习

1. 把三角形的三个顶点颜色改成红、绿、蓝，并在顶点着色器里把颜色作为 `out` 传给片段着色器——你会看到 GPU 自动在三个顶点之间做颜色插值；
2. 用索引缓冲（EBO）画一个由两个三角形组成的矩形，并贴上一张自己找的 PNG；
3. 让矩形以 60 FPS 匀速左右往返移动（提示：`sin(glfwGetTime())` 乘以位移写进 model 矩阵）；
4. 故意把 `glVertexAttribPointer` 的 stride 从 `3 * sizeof(float)` 改成 `2 * sizeof(float)`，观察并解释画面扭曲的原因；
5. （选做）安装 RenderDoc，捕获一帧，找到你的 draw call，查看它提交的顶点数据与绑定的纹理。

## 12. 与之前和之后的知识的关系

- 之前：环境与构建依赖 [构建工具链](/cpp/640-CppToolchain)；「每帧循环 + 双缓冲」的节奏会在游戏开发里反复出现；
- 之后：[C++ 游戏开发](/cpp/550-CppGameDev)把本文的单个三角形扩展成游戏循环、ECS 与资源管理；着色器写多了会发现它是另一门语言与另一个调试世界（RenderDoc + GPU 文档）；
- 旁支：多线程提交渲染命令涉及的内存模型话题见 [C++ 内存模型](/cpp/450-CppMemoryModel)。

## 官方文档

- OpenGL 规范与参考：<https://docs.gl/>（每个函数的可视化文档）
- Vulkan 官方主页：<https://www.vulkan.org/>
- learnopengl.com 中文版：<https://learnopengl-cn.github.io/>（本文路线图的最佳续篇）

## 自我检查

全部能答上来再进入下一篇：

1. VBO、VAO、EBO 各自存什么？为什么绘制前「绑定 VAO」就够了？
2. 顶点着色器和片段着色器各执行多少次？各自的输出是什么？
3. NDC 坐标范围是多少？它和窗口像素坐标的关系由哪一步建立？
4. 纹理为什么显示为上下颠倒？两种修法分别是什么？
5. model / view / projection 三个矩阵各管什么？乘法顺序是什么？
6. 什么信号说明着色器编译失败？从哪个函数拿到错误文本？

## 本章总结

图形编程的门槛集中在第一周：环境（GLFW 建窗口 + GLAD 加载函数）、第一个三角形（VBO 存数据、VAO 记配置、着色器定位置与颜色）、纹理（PNG 上传显存 + UV 采样）、变换（MVP 三个矩阵）。走通这条线后，渲染管线八个阶段里你已经亲手控制了两个可编程阶段，其余阶段的行为也都能对应到具体 API 调用。调试的两大抓手是着色器日志（`glGetShaderInfoLog`）与帧调试器（RenderDoc），黑屏排查按「context 版本 -> glad 加载 -> viewport -> 绑定状态」的顺序走。

## 下一步

下一篇 [C++ 游戏开发](/cpp/550-CppGameDev)：把「画一个三角形」升级为「每秒 60 次稳定更新一整个世界」——游戏循环、ECS 架构与资源管理。
