---
order: 57
title: Lua与Love2D
module: lua
category: Lua
difficulty: intermediate
description: Love2D游戏开发
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua与C交互
  - lua/Lua即时编译器
  - lua/Lua与Neovim
  - lua/Lua与Redis脚本
prerequisites:
  - lua/概述与环境配置
---

## 概述

Love2D（简称 LÖVE）是一个使用 Lua 编写 2D 游戏的免费开源框架。它提供了图形渲染、音频播放、物理模拟、输入处理、窗口管理等游戏开发所需的核心功能，让开发者可以专注于游戏逻辑本身，而无需关心底层实现细节。Love2D 支持 Windows、macOS、Linux、Android 和 iOS 等多个平台。

Love2D 的设计哲学是简洁和灵活。它没有提供场景编辑器、组件系统或 ECS 架构等高级抽象，而是将底层能力直接暴露给开发者，由开发者自行决定如何组织代码。这种设计使得 Love2D 既适合制作简单的小游戏，也能胜任复杂的独立游戏项目。许多知名独立游戏如 Balatro、Move 78 等都使用 Love2D 开发。

Love2D 的核心是一个基于回调的游戏循环。开发者通过定义 love.load、love.update、love.draw 等函数来响应游戏的生命周期事件。Love2D 在每帧自动调用这些函数，驱动游戏的运行。

## 基本概念

**游戏循环**是 Love2D 的运行核心。Love2D 启动后会持续运行一个循环，每帧依次调用 love.update 和 love.draw 函数。love.update 负责更新游戏状态（如移动角色、检测碰撞），love.draw 负责将当前状态渲染到屏幕上。默认帧率为 60 FPS，可以通过 love.timer 和配置文件调整。

**回调函数**是 Love2D 与开发者代码交互的接口。除了核心的 load/update/draw 之外，Love2D 还提供了大量回调：love.keypressed 处理键盘按键，love.mousepressed 处理鼠标点击，love.joystickadded 处理手柄连接等。开发者只需定义需要的回调函数，Love2D 会在对应事件发生时自动调用。

**坐标系**方面，Love2D 使用屏幕左上角为原点 (0, 0)，x 轴向右为正方向，y 轴向下为正方向。这与数学中的笛卡尔坐标系不同（y 轴方向相反），在处理物理计算时需要注意坐标转换。

**资源管理**方面，Love2D 通过 love.graphics.newImage、love.audio.newSource 等函数加载资源。资源一旦加载就保存在内存中，直到被 Lua 垃圾回收或显式释放。对于大型游戏，需要注意资源的加载时机和内存占用。

## 快速开始

创建一个最简单的 Love2D 项目，只需要一个文件 `main.lua`：

```lua
-- 游戏初始化（仅在启动时调用一次）
function love.load()
    -- 设置窗口标题
    love.window.setTitle("我的第一个 Love2D 游戏")

    -- 初始化玩家
    player = {
        x = 400,
        y = 300,
        size = 30,
        speed = 200,
        color = {0.2, 0.6, 1.0},
    }
end

-- 游戏逻辑更新（每帧调用）
function love.update(dt)
    -- dt 是距离上一帧的时间差（秒），用于实现帧率无关的移动

    -- 键盘控制移动
    if love.keyboard.isDown("left") or love.keyboard.isDown("a") then
        player.x = player.x - player.speed * dt
    end
    if love.keyboard.isDown("right") or love.keyboard.isDown("d") then
        player.x = player.x + player.speed * dt
    end
    if love.keyboard.isDown("up") or love.keyboard.isDown("w") then
        player.y = player.y - player.speed * dt
    end
    if love.keyboard.isDown("down") or love.keyboard.isDown("s") then
        player.y = player.y + player.speed * dt
    end

    -- 限制玩家在窗口范围内
    player.x = math.max(0, math.min(player.x, love.graphics.getWidth() - player.size))
    player.y = math.max(0, math.min(player.y, love.graphics.getHeight() - player.size))
end

-- 游戏画面渲染（每帧调用）
function love.draw()
    -- 设置绘制颜色（RGB，0-1 范围）
    love.graphics.setColor(player.color)

    -- 绘制矩形玩家
    love.graphics.rectangle("fill", player.x, player.y, player.size, player.size)

    -- 绘制提示文字
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("使用方向键或 WASD 移动", 10, 10)
end
```

运行游戏：

```bash
# 在项目目录下运行
love .
```

## 详细用法

### 图形绘制

Love2D 提供了丰富的 2D 图形绘制 API：

```lua
function love.draw()
    -- 设置背景色（在 conf.lua 中也可以设置）
    love.graphics.setBackgroundColor(0.1, 0.1, 0.15)

    -- 绘制矩形
    love.graphics.setColor(1, 0, 0)  -- 红色
    love.graphics.rectangle("fill", 50, 50, 100, 80)  -- 填充矩形

    love.graphics.setColor(0, 1, 0)  -- 绿色
    love.graphics.rectangle("line", 200, 50, 100, 80)  -- 描边矩形

    -- 绘制圆形
    love.graphics.setColor(0, 0.5, 1)  -- 蓝色
    love.graphics.circle("fill", 400, 100, 40)  -- 填充圆形，半径 40

    -- 绘制线段
    love.graphics.setColor(1, 1, 0)  -- 黄色
    love.graphics.setLineWidth(3)  -- 线宽 3 像素
    love.graphics.line(50, 200, 300, 250, 500, 180)  -- 折线

    -- 绘制多边形
    love.graphics.setColor(1, 0, 1)  -- 紫色
    love.graphics.polygon("fill", 600, 50, 650, 150, 550, 150)  -- 三角形

    -- 绘制圆弧
    love.graphics.setColor(0, 1, 1)  -- 青色
    love.graphics.arc("line", "open", 100, 350, 50, 0, math.pi)  -- 半圆弧

    -- 绘制文字
    love.graphics.setColor(1, 1, 1)  -- 白色
    love.graphics.print("Hello Love2D!", 10, 400)

    -- 使用自定义字体
    local font = love.graphics.newFont(24)
    love.graphics.setFont(font)
    love.graphics.printf("居中文字", 0, 440, love.graphics.getWidth(), "center")
end
```

### 图片与动画

加载和绘制图片，实现简单的帧动画：

```lua
function love.load()
    -- 加载图片
    player_image = love.graphics.newImage("player.png")

    -- 获取图片尺寸
    local img_w = player_image:getWidth()
    local img_h = player_image:getHeight()

    -- 精灵表动画
    -- 假设精灵表包含 4 帧，水平排列
    sprite_sheet = love.graphics.newImage("player_walk.png")
    local sheet_w = sprite_sheet:getWidth()
    local sheet_h = sprite_sheet:getHeight()

    -- 创建四元组（Quads）用于切割精灵表
    frame_width = sheet_w / 4
    frame_height = sheet_h
    frames = {}
    for i = 0, 3 do
        frames[i + 1] = love.graphics.newQuad(
            i * frame_width, 0,  -- 起始位置
            frame_width, frame_height,  -- 尺寸
            sheet_w, sheet_h  -- 精灵表总尺寸
        )
    end

    -- 动画状态
    current_frame = 1
    frame_timer = 0
    frame_duration = 0.15  -- 每帧持续时间（秒）

    -- 玩家位置
    player_x = 400
    player_y = 300
    player_speed = 150
    facing_right = true
end

function love.update(dt)
    local moving = false

    if love.keyboard.isDown("left") then
        player_x = player_x - player_speed * dt
        facing_right = false
        moving = true
    end
    if love.keyboard.isDown("right") then
        player_x = player_x + player_speed * dt
        facing_right = true
        moving = true
    end

    -- 仅在移动时播放动画
    if moving then
        frame_timer = frame_timer + dt
        if frame_timer >= frame_duration then
            frame_timer = frame_timer - frame_duration
            current_frame = current_frame % 4 + 1  -- 循环 1-4
        end
    else
        current_frame = 1  -- 静止时显示第一帧
        frame_timer = 0
    end
end

function love.draw()
    -- 绘制当前帧
    love.graphics.draw(sprite_sheet, frames[current_frame], player_x, player_y,
        0,  -- 旋转角度
        facing_right and 1 or -1, 1,  -- 水平翻转
        frame_width / 2, frame_height / 2  -- 原点偏移
    )
end
```

### 输入处理

处理键盘、鼠标和手柄输入：

```lua
function love.load()
    player = { x = 400, y = 300, speed = 200 }
    mouse_pos = { x = 0, y = 0 }
    keys_pressed = {}  -- 记录本帧按下的键
end

-- 键盘按下事件（仅触发一次）
function love.keypressed(key)
    keys_pressed[key] = true

    -- 处理单次按键
    if key == "escape" then
        love.event.quit()
    elseif key == "space" then
        -- 跳跃
        print("跳跃！")
    elseif key == "r" then
        -- 重置位置
        player.x = 400
        player.y = 300
    end
end

-- 键盘释放事件
function love.keyreleased(key)
    keys_pressed[key] = false
end

-- 鼠标按下事件
function love.mousepressed(x, y, button)
    if button == 1 then  -- 左键
        print("左键点击: " .. x .. ", " .. y)
    elseif button == 2 then  -- 右键
        print("右键点击: " .. x .. ", " .. y)
    end
end

-- 鼠标移动事件
function love.mousemoved(x, y)
    mouse_pos.x = x
    mouse_pos.y = y
end

function love.update(dt)
    -- 持续按键检测
    if love.keyboard.isDown("left") then
        player.x = player.x - player.speed * dt
    end
    if love.keyboard.isDown("right") then
        player.x = player.x + player.speed * dt
    end
    if love.keyboard.isDown("up") then
        player.y = player.y - player.speed * dt
    end
    if love.keyboard.isDown("down") then
        player.y = player.y + player.speed * dt
    end
end

function love.draw()
    love.graphics.circle("fill", player.x, player.y, 20)

    -- 显示鼠标位置
    love.graphics.print("鼠标: " .. mouse_pos.x .. ", " .. mouse_pos.y, 10, 10)
end
```

### 碰撞检测

实现常见的碰撞检测算法：

```lua
-- 矩形碰撞检测（AABB）
local function check_aabb(a, b)
    return a.x < b.x + b.w and
           a.x + a.w > b.x and
           a.y < b.y + b.h and
           a.y + a.h > b.y
end

-- 圆形碰撞检测
local function check_circle(a, b)
    local dx = a.x - b.x
    local dy = a.y - b.y
    local dist = math.sqrt(dx * dx + dy * dy)
    return dist < a.radius + b.radius
end

-- 矩形与圆形碰撞检测
local function check_rect_circle(rect, circle)
    -- 找到矩形上离圆心最近的点
    local closest_x = math.max(rect.x, math.min(circle.x, rect.x + rect.w))
    local closest_y = math.max(rect.y, math.min(circle.y, rect.y + rect.h))

    local dx = circle.x - closest_x
    local dy = circle.y - closest_y

    return (dx * dx + dy * dy) < (circle.radius * circle.radius)
end

-- 使用示例
function love.load()
    player = { x = 100, y = 100, w = 40, h = 40, speed = 200 }
    obstacles = {
        { x = 300, y = 200, w = 80, h = 60, color = {1, 0.3, 0.3} },
        { x = 500, y = 150, w = 60, h = 100, color = {0.3, 1, 0.3} },
        { x = 200, y = 350, w = 120, h = 40, color = {0.3, 0.3, 1} },
    }
    collectibles = {
        { x = 400, y = 100, radius = 15, collected = false },
        { x = 250, y = 250, radius = 15, collected = false },
        { x = 550, y = 350, radius = 15, collected = false },
    }
    score = 0
end

function love.update(dt)
    -- 移动玩家
    local new_x, new_y = player.x, player.y
    if love.keyboard.isDown("left") then new_x = new_x - player.speed * dt end
    if love.keyboard.isDown("right") then new_x = new_x + player.speed * dt end
    if love.keyboard.isDown("up") then new_y = new_y - player.speed * dt end
    if love.keyboard.isDown("down") then new_y = new_y + player.speed * dt end

    -- 检测与障碍物的碰撞
    local test_player = { x = new_x, y = new_y, w = player.w, h = player.h }
    local can_move = true
    for _, obs in ipairs(obstacles) do
        if check_aabb(test_player, obs) then
            can_move = false
            break
        end
    end

    if can_move then
        player.x = new_x
        player.y = new_y
    end

    -- 检测与收集物的碰撞
    local player_center = {
        x = player.x + player.w / 2,
        y = player.y + player.h / 2,
        radius = player.w / 2,
    }
    for _, item in ipairs(collectibles) do
        if not item.collected and check_circle(player_center, item) then
            item.collected = true
            score = score + 10
        end
    end
end

function love.draw()
    -- 绘制障碍物
    for _, obs in ipairs(obstacles) do
        love.graphics.setColor(obs.color)
        love.graphics.rectangle("fill", obs.x, obs.y, obs.w, obs.h)
    end

    -- 绘制收集物
    for _, item in ipairs(collectibles) do
        if not item.collected then
            love.graphics.setColor(1, 0.8, 0)
            love.graphics.circle("fill", item.x, item.y, item.radius)
        end
    end

    -- 绘制玩家
    love.graphics.setColor(0.2, 0.6, 1)
    love.graphics.rectangle("fill", player.x, player.y, player.w, player.h)

    -- 显示分数
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("分数: " .. score, 10, 10)
end
```

### 游戏状态管理

实现简单的游戏状态机：

```lua
-- 游戏状态
local states = {
    menu = {},
    playing = {},
    paused = {},
    gameover = {},
}

local current_state = nil

-- 切换状态
local function switch_state(name)
    if current_state and states[current_state].exit then
        states[current_state].exit()
    end
    current_state = name
    if states[current_state].enter then
        states[current_state].enter()
    end
end

-- 菜单状态
states.menu = {
    enter = function()
        print("进入菜单")
    end,
    update = function(dt)
        -- 菜单动画
    end,
    draw = function()
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf("我的游戏", 0, 150, love.graphics.getWidth(), "center")
        love.graphics.printf("按 Enter 开始游戏", 0, 250, love.graphics.getWidth(), "center")
        love.graphics.printf("按 Q 退出", 0, 300, love.graphics.getWidth(), "center")
    end,
    keypressed = function(key)
        if key == "return" then
            switch_state("playing")
        elseif key == "q" then
            love.event.quit()
        end
    end,
}

-- 游戏状态
states.playing = {
    enter = function()
        -- 初始化游戏
        player = { x = 400, y = 300, speed = 200 }
        score = 0
        game_time = 0
    end,
    update = function(dt)
        game_time = game_time + dt

        if love.keyboard.isDown("left") then player.x = player.x - player.speed * dt end
        if love.keyboard.isDown("right") then player.x = player.x + player.speed * dt end
        if love.keyboard.isDown("up") then player.y = player.y - player.speed * dt end
        if love.keyboard.isDown("down") then player.y = player.y + player.speed * dt end
    end,
    draw = function()
        love.graphics.setColor(0.2, 0.6, 1)
        love.graphics.circle("fill", player.x, player.y, 20)
        love.graphics.setColor(1, 1, 1)
        love.graphics.print("分数: " .. score, 10, 10)
        love.graphics.print("时间: " .. string.format("%.1f", game_time), 10, 30)
    end,
    keypressed = function(key)
        if key == "p" then
            switch_state("paused")
        elseif key == "escape" then
            switch_state("gameover")
        end
    end,
}

-- 暂停状态
states.paused = {
    draw = function()
        -- 先绘制游戏画面
        states.playing.draw()
        -- 覆盖半透明遮罩
        love.graphics.setColor(0, 0, 0, 0.5)
        love.graphics.rectangle("fill", 0, 0, love.graphics.getWidth(), love.graphics.getHeight())
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf("游戏暂停", 0, 250, love.graphics.getWidth(), "center")
        love.graphics.printf("按 P 继续", 0, 300, love.graphics.getWidth(), "center")
    end,
    keypressed = function(key)
        if key == "p" then
            switch_state("playing")
        end
    end,
}

-- 游戏结束状态
states.gameover = {
    draw = function()
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf("游戏结束", 0, 200, love.graphics.getWidth(), "center")
        love.graphics.printf("最终分数: " .. score, 0, 260, love.graphics.getWidth(), "center")
        love.graphics.printf("按 R 重新开始", 0, 320, love.graphics.getWidth(), "center")
        love.graphics.printf("按 M 返回菜单", 0, 360, love.graphics.getWidth(), "center")
    end,
    keypressed = function(key)
        if key == "r" then
            switch_state("playing")
        elseif key == "m" then
            switch_state("menu")
        end
    end,
}

-- Love2D 回调转发到当前状态
function love.load()
    switch_state("menu")
end

function love.update(dt)
    if states[current_state].update then
        states[current_state].update(dt)
    end
end

function love.draw()
    if states[current_state].draw then
        states[current_state].draw()
    end
end

function love.keypressed(key)
    if states[current_state].keypressed then
        states[current_state].keypressed(key)
    end
end
```

### 相机系统

实现简单的 2D 相机：

```lua
-- 相机模块
local Camera = {}
Camera.__index = Camera

function Camera.new()
    local self = setmetatable({}, Camera)
    self.x = 0
    self.y = 0
    self.scale = 1
    self.rotation = 0
    return self
end

-- 设置相机位置（以目标为中心）
function Camera:setPosition(x, y)
    self.x = x - love.graphics.getWidth() / 2
    self.y = y - love.graphics.getHeight() / 2
end

-- 平滑跟随目标
function Camera:follow(target_x, target_y, dt, smoothness)
    smoothness = smoothness or 5
    local target_cam_x = target_x - love.graphics.getWidth() / 2
    local target_cam_y = target_y - love.graphics.getHeight() / 2
    self.x = self.x + (target_cam_x - self.x) * smoothness * dt
    self.y = self.y + (target_cam_y - self.y) * smoothness * dt
end

-- 应用相机变换
function Camera:apply()
    love.graphics.push()
    love.graphics.translate(-self.x, -self.y)
    love.graphics.scale(self.scale, self.scale)
    love.graphics.rotate(-self.rotation)
end

-- 恢复变换
function Camera:release()
    love.graphics.pop()
end

-- 将世界坐标转换为屏幕坐标
function Camera:worldToScreen(wx, wy)
    return (wx - self.x) * self.scale, (wy - self.y) * self.scale
end

-- 将屏幕坐标转换为世界坐标
function Camera:screenToWorld(sx, sy)
    return sx / self.scale + self.x, sy / self.scale + self.y
end

-- 缩放
function Camera:zoom(factor)
    self.scale = math.max(0.5, math.min(3, self.scale * factor))
end

return Camera
```

使用相机：

```lua
local Camera = require("camera")

function love.load()
    camera = Camera.new()
    player = { x = 400, y = 300, speed = 200 }
    -- 生成一些地面标记
    markers = {}
    for i = 1, 50 do
        markers[i] = {
            x = math.random(-500, 1500),
            y = math.random(-500, 1500),
            size = math.random(10, 30),
            color = {math.random(), math.random(), math.random()},
        }
    end
end

function love.update(dt)
    if love.keyboard.isDown("left") then player.x = player.x - player.speed * dt end
    if love.keyboard.isDown("right") then player.x = player.x + player.speed * dt end
    if love.keyboard.isDown("up") then player.y = player.y - player.speed * dt end
    if love.keyboard.isDown("down") then player.y = player.y + player.speed * dt end

    -- 相机跟随玩家
    camera:follow(player.x, player.y, dt, 3)
end

function love.draw()
    -- 应用相机变换
    camera:apply()

    -- 绘制世界内容
    for _, m in ipairs(markers) do
        love.graphics.setColor(m.color)
        love.graphics.rectangle("fill", m.x, m.y, m.size, m.size)
    end

    -- 绘制玩家
    love.graphics.setColor(1, 1, 1)
    love.graphics.circle("fill", player.x, player.y, 15)

    -- 恢复变换
    camera:release()

    -- 绘制 HUD（不受相机影响）
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("WASD 移动，鼠标滚轮缩放", 10, 10)
end

function love.wheelmoved(x, y)
    if y > 0 then
        camera:zoom(1.1)
    elseif y < 0 then
        camera:zoom(0.9)
    end
end
```

## 常见场景

### 平台跳跃游戏

实现基本的平台跳跃物理：

```lua
function love.load()
    -- 重力加速度
    gravity = 800

    player = {
        x = 100,
        y = 300,
        w = 30,
        h = 40,
        vx = 0,  -- 水平速度
        vy = 0,  -- 垂直速度
        speed = 250,
        jump_force = -400,
        on_ground = false,
        facing = 1,  -- 1=右, -1=左
    }

    -- 平台列表
    platforms = {
        { x = 0, y = 500, w = 800, h = 40 },     -- 地面
        { x = 150, y = 400, w = 120, h = 20 },
        { x = 350, y = 320, w = 100, h = 20 },
        { x = 550, y = 250, w = 150, h = 20 },
        { x = 200, y = 200, w = 80, h = 20 },
    }
end

function love.update(dt)
    -- 水平移动
    player.vx = 0
    if love.keyboard.isDown("left") or love.keyboard.isDown("a") then
        player.vx = -player.speed
        player.facing = -1
    end
    if love.keyboard.isDown("right") or love.keyboard.isDown("d") then
        player.vx = player.speed
        player.facing = 1
    end

    -- 应用重力
    player.vy = player.vy + gravity * dt

    -- 更新位置
    player.x = player.x + player.vx * dt
    player.y = player.y + player.vy * dt

    -- 碰撞检测
    player.on_ground = false
    for _, plat in ipairs(platforms) do
        -- 检查玩家是否落在平台上
        if player.x + player.w > plat.x and player.x < plat.x + plat.w then
            -- 从上方落下
            if player.vy >= 0 and
               player.y + player.h > plat.y and
               player.y + player.h < plat.y + plat.h + player.vy * dt + 5 then
                player.y = plat.y - player.h
                player.vy = 0
                player.on_ground = true
            end
        end
    end

    -- 防止掉出屏幕
    if player.y > 600 then
        player.x = 100
        player.y = 300
        player.vy = 0
    end
end

function love.keypressed(key)
    -- 跳跃（仅在地面时）
    if (key == "space" or key == "w" or key == "up") and player.on_ground then
        player.vy = player.jump_force
        player.on_ground = false
    end
end

function love.draw()
    -- 绘制平台
    love.graphics.setColor(0.4, 0.3, 0.2)
    for _, plat in ipairs(platforms) do
        love.graphics.rectangle("fill", plat.x, plat.y, plat.w, plat.h)
    end

    -- 绘制玩家
    love.graphics.setColor(0.2, 0.6, 1)
    love.graphics.rectangle("fill", player.x, player.y, player.w, player.h)

    -- 眼睛（表示朝向）
    love.graphics.setColor(1, 1, 1)
    local eye_x = player.facing == 1 and player.x + 18 or player.x + 8
    love.graphics.circle("fill", eye_x, player.y + 12, 4)

    -- 提示
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("方向键移动，空格跳跃", 10, 10)
end
```

### 粒子系统

实现自定义粒子效果：

```lua
function love.load()
    particles = {}
    emitter_x = 400
    emitter_y = 300
end

-- 创建粒子
local function create_particle(x, y)
    local angle = math.random() * math.pi * 2
    local speed = math.random(50, 200)
    return {
        x = x,
        y = y,
        vx = math.cos(angle) * speed,
        vy = math.sin(angle) * speed,
        life = 1.0,  -- 生命值 0-1
        decay = math.random(0.5, 1.5),  -- 衰减速度
        size = math.random(2, 6),
        color = {
            math.random(0.8, 1.0),
            math.random(0.2, 0.6),
            math.random(0.0, 0.2),
        },
    }
end

function love.update(dt)
    -- 鼠标左键持续发射粒子
    if love.mouse.isDown(1) then
        local mx, my = love.mouse.getPosition()
        for i = 1, 5 do
            particles[#particles + 1] = create_particle(mx, my)
        end
    end

    -- 更新粒子
    local alive = {}
    for _, p in ipairs(particles) do
        p.x = p.x + p.vx * dt
        p.y = p.y + p.vy * dt
        p.vy = p.vy + 100 * dt  -- 重力
        p.life = p.life - p.decay * dt

        if p.life > 0 then
            alive[#alive + 1] = p
        end
    end
    particles = alive
end

function love.draw()
    -- 绘制粒子
    for _, p in ipairs(particles) do
        love.graphics.setColor(p.color[1], p.color[2], p.color[3], p.life)
        love.graphics.circle("fill", p.x, p.y, p.size * p.life)
    end

    -- 提示
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("按住鼠标左键发射粒子", 10, 10)
    love.graphics.print("粒子数量: " .. #particles, 10, 30)
end
```

### 简单地图系统

使用二维数组实现瓦片地图：

```lua
function love.load()
    -- 瓦片大小
    tile_size = 32

    -- 地图数据（0=空, 1=地面, 2=砖块, 3=草地）
    map = {
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0},
        {0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
        {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},
        {3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3},
    }

    -- 瓦片颜色
    tile_colors = {
        [0] = {0.1, 0.1, 0.15},  -- 空
        [1] = {0.4, 0.3, 0.2},   -- 地面
        [2] = {0.6, 0.4, 0.2},   -- 砖块
        [3] = {0.2, 0.5, 0.2},   -- 草地
    }

    player = {
        x = 2 * tile_size,
        y = 7 * tile_size,
        w = 24,
        h = 28,
        speed = 150,
        vy = 0,
        on_ground = false,
    }
    gravity = 600
end

function love.draw()
    -- 绘制地图
    for row, tiles in ipairs(map) do
        for col, tile in ipairs(tiles) do
            if tile > 0 then
                local color = tile_colors[tile]
                love.graphics.setColor(color)
                love.graphics.rectangle("fill",
                    (col - 1) * tile_size, (row - 1) * tile_size,
                    tile_size, tile_size)

                -- 添加边框效果
                love.graphics.setColor(color[1] * 0.7, color[2] * 0.7, color[3] * 0.7)
                love.graphics.rectangle("line",
                    (col - 1) * tile_size, (row - 1) * tile_size,
                    tile_size, tile_size)
            end
        end
    end

    -- 绘制玩家
    love.graphics.setColor(0.2, 0.6, 1)
    love.graphics.rectangle("fill", player.x, player.y, player.w, player.h)
end
```

## 注意事项与常见错误

**使用 dt 实现帧率无关的移动**。所有移动和动画都应乘以 dt 参数，确保在不同帧率下游戏速度一致。不要假设游戏始终以 60 FPS 运行，在性能较差的设备上帧率可能大幅下降。

**图片资源路径区分大小写**。Love2D 在 Windows 上可能不区分文件名大小写，但在 Linux 和 macOS 上严格区分。如果图片文件名为 "Player.png" 但代码中写 "player.png"，在 Windows 上能运行但在其他平台上会报错。建议统一使用小写文件名。

**love.graphics.setColor 使用 0-1 范围**。Love2D 11.0+ 将颜色值范围从 0-255 改为 0-1。如果从旧教程中复制代码，颜色值可能需要转换：将旧值除以 255 即可。

**避免在 love.update 或 love.draw 中创建对象**。每帧创建大量临时对象（如表、字符串）会增加垃圾回收压力，导致游戏卡顿。应尽量复用对象，或在 love.load 中预创建。

**love.draw 中不要进行逻辑计算**。love.draw 只应负责渲染，所有游戏逻辑应放在 love.update 中。在 love.draw 中修改游戏状态会导致不可预测的行为，因为 draw 函数的调用次数不一定等于 update 的调用次数。

## 高级用法

### 使用 Love2D 内置物理引擎

Love2D 集成了 Box2D 物理引擎：

```lua
function love.load()
    -- 创建物理世界（重力 y 方向向下）
    world = love.physics.newWorld(0, 500, true)

    -- 创建地面
    local ground_body = love.physics.newBody(world, 400, 550, "static")
    local ground_shape = love.physics.newRectangleShape(800, 40)
    local ground_fixture = love.physics.newFixture(ground_body, ground_shape)

    -- 创建动态物体
    objects = {}
    for i = 1, 10 do
        local body = love.physics.newBody(world,
            200 + math.random(400), 100 + math.random(200), "dynamic")
        local shape
        if math.random() > 0.5 then
            shape = love.physics.newRectangleShape(20 + math.random(30), 20 + math.random(30))
        else
            shape = love.physics.newCircleShape(10 + math.random(15))
        end
        local fixture = love.physics.newFixture(body, shape, 1)
        fixture:setRestitution(0.5)  -- 弹性系数

        objects[i] = {
            body = body,
            shape = shape,
            is_circle = shape:typeOf("CircleShape"),
            color = {math.random() * 0.5 + 0.5, math.random() * 0.5 + 0.5, math.random() * 0.5 + 0.5},
        }
    end
end

function love.update(dt)
    world:update(dt)
end

function love.draw()
    -- 绘制地面
    love.graphics.setColor(0.3, 0.5, 0.3)
    love.graphics.rectangle("fill", 0, 530, 800, 40)

    -- 绘制物体
    for _, obj in ipairs(objects) do
        love.graphics.setColor(obj.color)
        if obj.is_circle then
            love.graphics.circle("fill", obj.body:getX(), obj.body:getY(), obj.shape:getRadius())
        else
            love.graphics.polygon("fill", obj.body:getWorldPoints(obj.shape:getPoints()))
        end
    end

    love.graphics.setColor(1, 1, 1)
    love.graphics.print("物理引擎演示", 10, 10)
end

function love.mousepressed(x, y)
    -- 点击添加新物体
    local body = love.physics.newBody(world, x, y, "dynamic")
    local shape = love.physics.newCircleShape(15)
    local fixture = love.physics.newFixture(body, shape, 1)
    fixture:setRestitution(0.7)

    objects[#objects + 1] = {
        body = body,
        shape = shape,
        is_circle = true,
        color = {1, 0.5, 0.2},
    }
end
```

### 音频系统

实现带音效管理的音频系统：

```lua
function love.load()
    -- 音量控制
    master_volume = 0.5
    music_volume = 0.3
    sfx_volume = 0.7

    -- 加载背景音乐
    -- bgm = love.audio.newSource("background.mp3", "stream")
    -- bgm:setVolume(music_volume * master_volume)
    -- bgm:setLooping(true)
    -- bgm:play()

    -- 加载音效
    sfx_cache = {}
    -- sfx_cache["jump"] = love.audio.newSource("jump.wav", "static")
    -- sfx_cache["coin"] = love.audio.newSource("coin.wav", "static")

    -- 音效播放函数
    play_sfx = function(name)
        if sfx_cache[name] then
            local clone = sfx_cache[name]:clone()
            clone:setVolume(sfx_volume * master_volume)
            clone:play()
        end
    end
end

function love.keypressed(key)
    if key == "m" then
        -- 静音切换
        master_volume = master_volume > 0 and 0 or 0.5
        -- bgm:setVolume(music_volume * master_volume)
    elseif key == "up" then
        master_volume = math.min(1, master_volume + 0.1)
    elseif key == "down" then
        master_volume = math.max(0, master_volume - 0.1)
    end
end
```

### 配置文件

使用 conf.lua 自定义 Love2D 的行为：

```lua
-- conf.lua（与 main.lua 同目录）
function love.conf(t)
    t.title = "我的 Love2D 游戏"        -- 窗口标题
    t.version = "11.5"                   -- Love2D 版本
    t.window.width = 800                 -- 窗口宽度
    t.window.height = 600                -- 窗口高度
    t.window.fullscreen = false          -- 是否全屏
    t.window.resizable = true            -- 是否可调整大小
    t.window.vsync = 1                   -- 垂直同步
    t.window.display = 1                 -- 显示器编号

    -- 禁用不需要的模块以减少加载时间和内存
    t.modules.joystick = false
    t.modules.physics = false

    -- 控制台输出（仅 Windows）
    t.console = false
end
```
