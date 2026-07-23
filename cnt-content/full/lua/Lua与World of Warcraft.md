---
order: 63
title: 'Lua与World of Warcraft'
module: lua
category: Lua
difficulty: intermediate
description: WoW插件开发
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua错误处理
  - lua/Lua迭代器
  - lua/Lua性能优化
  - lua/Lua调试技巧
prerequisites:
  - lua/概述与环境配置
---

## 概述

World of Warcraft（魔兽世界，简称 WoW）是一款广泛使用 Lua 作为插件脚本语言的大型多人在线角色扮演游戏。WoW 的插件系统允许玩家使用 Lua 编写自定义界面和功能扩展，从简单的信息显示到复杂的团队管理工具，都可以通过 Lua 插件实现。WoW 的 UI 框架基于 XML 布局和 Lua 逻辑的结合，开发者使用 XML 定义界面结构，使用 Lua 编写交互逻辑。

WoW 插件生态非常活跃，CurseForge 等平台上托管了数以万计的插件。学习 WoW 插件开发不仅能够定制自己的游戏体验，也是 Lua 实际应用的一个极佳案例。WoW 中的 Lua 运行在受限沙箱环境中，去除了文件 I/O、网络访问等危险 API，但提供了丰富的游戏 API 用于获取游戏状态、创建界面元素、注册事件处理等。

## 基本概念

**TOC 文件**是插件的描述文件，全称为 Table of Contents。每个插件必须包含一个 .toc 文件，其中声明了插件的名称、版本、接口版本、依赖关系以及加载的文件列表。WoW 客户端通过读取 TOC 文件来加载和初始化插件。

**事件系统**是 WoW 插件的核心机制。游戏中的各种状态变化（如玩家进入世界、受到伤害、目标改变等）都会触发对应的事件。插件通过注册事件监听器来响应这些事件，从而实现动态的交互逻辑。

**框架（Frame）**是 WoW UI 系统的基础元素。所有可见的界面组件（按钮、文本、图标等）都基于 Frame 创建。Frame 可以注册事件、设置脚本处理函数、包含子框架，是构建插件界面的核心对象。

**SavedVariables** 是 WoW 提供的持久化存储机制。插件可以在 TOC 文件中声明需要持久化的变量，WoW 会在玩家退出游戏时自动将这些变量保存到磁盘，在下次登录时自动加载。这使得插件可以保存用户的配置和状态。

**Ace3 框架**是 WoW 插件开发中最流行的第三方库，提供了一套模块化的开发框架，包括事件处理、数据库管理、配置界面、命令行解析等常用功能。使用 Ace3 可以大幅简化插件开发流程。

## 快速开始

创建一个最简单的 WoW 插件，需要两个文件：TOC 描述文件和 Lua 脚本文件。

首先创建插件目录和 TOC 文件 `MyFirstAddon/MyFirstAddon.toc`：

```toc
## Title: My First Addon
## Notes: 我的第一个魔兽世界插件
## Author: MyName
## Interface: 100205
## Version: 1.0.0

MyFirstAddon.lua
```

其中 Interface 字段对应 WoW 的版本号，不同版本的客户端需要匹配对应的接口版本。

然后创建 Lua 脚本文件 `MyFirstAddon/MyFirstAddon.lua`：

```lua
-- 注册事件监听
local frame = CreateFrame("Frame")
frame:RegisterEvent("PLAYER_ENTERING_WORLD")

-- 设置事件处理函数
frame:SetScript("OnEvent", function(self, event, ...)
    print("欢迎使用 My First Addon！")
    print("当前角色: " .. UnitName("player"))
    print("当前等级: " .. UnitLevel("player"))
end)
```

将插件文件夹放入 WoW 的插件目录 `Interface/AddOns/` 下，重启游戏或输入 `/reload` 即可加载插件。登录后聊天窗口会显示欢迎信息。

## 详细用法

### 事件处理系统

事件是 WoW 插件与游戏交互的主要方式。以下示例展示了如何监听多种事件：

```lua
local frame = CreateFrame("Frame")

-- 注册多个事件
frame:RegisterEvent("PLAYER_ENTERING_WORLD")
frame:RegisterEvent("PLAYER_REGEN_DISABLED")  -- 进入战斗
frame:RegisterEvent("PLAYER_REGEN_ENABLED")   -- 离开战斗
frame:RegisterEvent("CHAT_MSG_WHISPER")        -- 收到密语
frame:RegisterEvent("UNIT_HEALTH")             -- 生命值变化

frame:SetScript("OnEvent", function(self, event, ...)
    if event == "PLAYER_ENTERING_WORLD" then
        local isLogin = ...
        if isLogin then
            print("欢迎回来，" .. UnitName("player") .. "！")
        end
    elseif event == "PLAYER_REGEN_DISABLED" then
        print("进入战斗！")
    elseif event == "PLAYER_REGEN_ENABLED" then
        print("离开战斗。")
    elseif event == "CHAT_MSG_WHISPER" then
        local msg, sender = ...
        print("收到 " .. sender .. " 的密语: " .. msg)
    elseif event == "UNIT_HEALTH" then
        local unit = ...
        if unit == "player" then
            local health = UnitHealth("player")
            local maxHealth = UnitHealthMax("player")
            local percent = (health / maxHealth) * 100
            if percent < 30 then
                print("警告：生命值低于 30%！")
            end
        end
    end
end)
```

### 创建界面元素

使用 WoW 的 UI API 创建各种界面组件：

```lua
-- 创建一个可拖动的提示框
local function create_info_frame()
    -- 创建主框架
    local frame = CreateFrame("Frame", "MyInfoFrame", UIParent, "BackdropTemplate")
    frame:SetSize(250, 120)
    frame:SetPoint("CENTER")
    frame:SetBackdrop({
        bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
        edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
        tile = true,
        tileSize = 32,
        edgeSize = 16,
        insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    frame:SetBackdropColor(0, 0, 0, 0.8)
    frame:SetMovable(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", frame.StartMoving)
    frame:SetScript("OnDragStop", frame.StopMovingOrSizing)

    -- 创建标题文本
    local title = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
    title:SetPoint("TOP", frame, "TOP", 0, -10)
    title:SetText("角色信息")

    -- 创建信息文本
    local info = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    info:SetPoint("TOP", title, "BOTTOM", 0, -8)
    info:SetWidth(220)

    -- 更新信息的函数
    local function update_info()
        local name = UnitName("player")
        local level = UnitLevel("player")
        local _, class = UnitClass("player")
        local health = UnitHealth("player")
        local maxHealth = UnitHealthMax("player")
        local power = UnitPower("player")
        local maxPower = UnitPowerMax("player")

        info:SetText(string.format(
            "姓名: %s\n等级: %d\n职业: %s\n生命: %d / %d\n能量: %d / %d",
            name, level, class, health, maxHealth, power, maxPower
        ))
    end

    -- 定时更新信息
    local timer = 0
    frame:SetScript("OnUpdate", function(self, elapsed)
        timer = timer + elapsed
        if timer >= 1.0 then  -- 每秒更新一次
            timer = 0
            update_info()
        end
    end)

    -- 创建关闭按钮
    local close = CreateFrame("Button", nil, frame, "UIPanelCloseButton")
    close:SetPoint("TOPRIGHT", frame, "TOPRIGHT", 0, 0)

    update_info()
    return frame
end

local info_frame = create_info_frame()
```

### 创建按钮与交互

创建可点击的按钮并绑定动作：

```lua
-- 创建一个功能按钮
local function create_action_button(parent, text, onClick)
    local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
    button:SetSize(120, 30)
    button:SetText(text)
    button:SetScript("OnClick", onClick)

    -- 添加鼠标悬停提示
    button:SetScript("OnEnter", function(self)
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        GameTooltip:SetText(text, 1, 1, 1)
        GameTooltip:Show()
    end)
    button:SetScript("OnLeave", function(self)
        GameTooltip:Hide()
    end)

    return button
end

-- 使用示例：创建一组操作按钮
local panel = CreateFrame("Frame", "MyActionPanel", UIParent, "BackdropTemplate")
panel:SetSize(200, 140)
panel:SetPoint("LEFT", UIParent, "LEFT", 20, 0)
panel:SetBackdrop({
    bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
    edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
    tile = true, tileSize = 16, edgeSize = 12,
    insets = { left = 3, right = 3, top = 3, bottom = 3 },
})
panel:SetBackdropColor(0, 0, 0, 0.7)
panel:SetMovable(true)
panel:EnableMouse(true)
panel:RegisterForDrag("LeftButton")
panel:SetScript("OnDragStart", panel.StartMoving)
panel:SetScript("OnDragStop", panel.StopMovingOrSizing)

-- 修理按钮
local repairBtn = create_action_button(panel, "自动修理", function()
    if CanMerchantRepair() then
        local cost = GetRepairAllCost()
        if cost > 0 then
            if GetMoney() >= cost then
                RepairAllItems()
                print("修理完成，花费: " .. GetCoinTextureString(cost))
            else
                print("金币不足，无法修理")
            end
        else
            print("装备无需修理")
        end
    end
end)
repairBtn:SetPoint("TOPLEFT", panel, "TOPLEFT", 15, -15)

-- 卖垃圾按钮
local sellBtn = create_action_button(panel, "出售垃圾", function()
    local total = 0
    for bag = 0, NUM_BAG_SLOTS do
        for slot = 1, GetContainerNumSlots(bag) do
            local _, _, quality, _, _, _, _, _, _, itemID = GetContainerItemInfo(bag, slot)
            if itemID and quality == 0 then  -- 灰色品质物品
                local sellPrice = select(11, GetItemInfo(itemID))
                if sellPrice and sellPrice > 0 then
                    total = total + sellPrice
                    UseContainerItem(bag, slot)
                end
            end
        end
    end
    if total > 0 then
        print("出售垃圾物品，获得: " .. GetCoinTextureString(total))
    else
        print("没有可出售的垃圾物品")
    end
end)
sellBtn:SetPoint("TOPLEFT", repairBtn, "BOTTOMLEFT", 0, -5)
```

### 斜杠命令

为插件注册自定义的斜杠命令，方便用户交互：

```lua
-- 注册斜杠命令
SLASH_MYADDON1 = "/myaddon"
SLASH_MYADDON2 = "/ma"

SlashCmdList["MYADDON"] = function(msg)
    -- 解析命令参数
    local command, arg = msg:match("^(%S*)%s*(.-)$")

    if command == "" or command == "help" then
        print("MyAddon 命令列表:")
        print("  /ma help - 显示帮助信息")
        print("  /ma show - 显示信息面板")
        print("  /ma hide - 隐藏信息面板")
        print("  /ma reset - 重置配置")
        print("  /ma config <key> <value> - 设置配置项")
    elseif command == "show" then
        if info_frame then info_frame:Show() end
    elseif command == "hide" then
        if info_frame then info_frame:Hide() end
    elseif command == "reset" then
        MyAddonDB = nil  -- 清除保存的变量
        print("配置已重置，请重新加载界面 (/reload)")
    elseif command == "config" then
        local key, value = arg:match("^(%S+)%s+(.+)$")
        if key and value then
            MyAddonDB = MyAddonDB or {}
            MyAddonDB[key] = value
            print("配置已更新: " .. key .. " = " .. value)
        else
            print("用法: /ma config <key> <value>")
        end
    else
        print("未知命令: " .. command .. "，输入 /ma help 查看帮助")
    end
end
```

### SavedVariables 持久化存储

在 TOC 文件中声明需要保存的变量：

```toc
## SavedVariables: MyAddonDB
```

然后在 Lua 代码中使用：

```lua
-- 初始化保存的变量（首次使用时设置默认值）
MyAddonDB = MyAddonDB or {
    showPanel = true,
    panelPosition = { point = "CENTER", x = 0, y = 0 },
    alerts = {
        lowHealth = true,
        lowHealthThreshold = 30,
        whisperAlert = true,
    },
}

-- 读取配置
local function get_config(key)
    return MyAddonDB[key]
end

-- 更新配置
local function set_config(key, value)
    MyAddonDB[key] = value
    -- 配置变更后立即生效
    if key == "showPanel" then
        if value then
            info_frame:Show()
        else
            info_frame:Hide()
        end
    end
end

-- 恢复面板位置
local function restore_position()
    local pos = MyAddonDB.panelPosition
    if pos then
        info_frame:ClearAllPoints()
        info_frame:SetPoint(pos.point, UIParent, pos.point, pos.x, pos.y)
    end
end

-- 保存面板位置
local function save_position()
    local point, _, _, x, y = info_frame:GetPoint()
    MyAddonDB.panelPosition = { point = point, x = x, y = y }
end

-- 在拖动停止时保存位置
info_frame:SetScript("OnDragStop", function(self)
    self:StopMovingOrSizing()
    save_position()
end)

-- 加载时恢复位置
restore_position()
```

## 常见场景

### 伤害统计插件

实现一个简单的伤害统计功能：

```lua
-- 伤害统计模块
local DamageTracker = {}
DamageTracker.__index = DamageTracker

function DamageTracker.new()
    local self = setmetatable({}, DamageTracker)
    self.data = {}  -- 玩家名 -> 总伤害
    self.combatStartTime = nil
    self.inCombat = false
    return self
end

function DamageTracker:StartCombat()
    self.data = {}
    self.combatStartTime = GetTime()
    self.inCombat = true
end

function DamageTracker:EndCombat()
    self.inCombat = false
    self:PrintReport()
end

function DamageTracker:RecordDamage(source, amount)
    if not self.inCombat then return end
    self.data[source] = (self.data[source] or 0) + amount
end

function DamageTracker:PrintReport()
    if not self.combatStartTime then return end

    local duration = GetTime() - self.combatStartTime
    print("--- 伤害统计报告 ---")
    print(string.format("战斗时长: %.1f 秒", duration))

    -- 按伤害量排序
    local sorted = {}
    for name, damage in pairs(self.data) do
        sorted[#sorted + 1] = {name = name, damage = damage}
    end
    table.sort(sorted, function(a, b) return a.damage > b.damage end)

    -- 计算总伤害
    local totalDamage = 0
    for _, entry in ipairs(sorted) do
        totalDamage = totalDamage + entry.damage
    end

    -- 打印每个玩家的统计
    for i, entry in ipairs(sorted) do
        local dps = entry.damage / duration
        local percent = (entry.damage / totalDamage) * 100
        print(string.format("%d. %s - 伤害: %d (%.1f%%) DPS: %.0f",
            i, entry.name, entry.damage, percent, dps))
    end
end

-- 创建追踪器实例
local tracker = DamageTracker.new()

-- 注册战斗事件
local combatFrame = CreateFrame("Frame")
combatFrame:RegisterEvent("PLAYER_REGEN_DISABLED")
combatFrame:RegisterEvent("PLAYER_REGEN_ENABLED")
combatFrame:RegisterEvent("COMBAT_LOG_EVENT_UNFILTERED")

combatFrame:SetScript("OnEvent", function(self, event, ...)
    if event == "PLAYER_REGEN_DISABLED" then
        tracker:StartCombat()
    elseif event == "PLAYER_REGEN_ENABLED" then
        tracker:EndCombat()
    elseif event == "COMBAT_LOG_EVENT_UNFILTERED" then
        local _, subEvent, _, sourceGUID, sourceName = CombatLogGetCurrentEventInfo()
        if subEvent == "SPELL_DAMAGE" or subEvent == "SWING_DAMAGE" or subEvent == "RANGE_DAMAGE" then
            local amount = select(12, CombatLogGetCurrentEventInfo())
            if sourceName and amount and amount > 0 then
                tracker:RecordDamage(sourceName, amount)
            end
        end
    end
end)
```

### 自动接受邀请

实现自动接受好友和公会成员的组队邀请：

```lua
-- 自动接受邀请配置
MyAddonDB = MyAddonDB or {
    autoAcceptFriends = true,
    autoAcceptGuild = true,
    autoAcceptAll = false,
}

local inviteFrame = CreateFrame("Frame")
inviteFrame:RegisterEvent("PARTY_INVITE_REQUEST")

inviteFrame:SetScript("OnEvent", function(self, event, sender)
    -- 检查是否来自好友
    if MyAddonDB.autoAcceptFriends then
        for i = 1, C_FriendList.GetNumFriends() do
            local friendInfo = C_FriendList.GetFriendInfoByIndex(i)
            if friendInfo and friendInfo.name == sender then
                AcceptGroup()
                print("自动接受好友 " .. sender .. " 的邀请")
                return
            end
        end
    end

    -- 检查是否来自公会成员
    if MyAddonDB.autoAcceptGuild then
        if IsInGuild() then
            for i = 1, GetNumGuildMembers() do
                local name = GetGuildRosterInfo(i)
                if name and name:match(sender) then
                    AcceptGroup()
                    print("自动接受公会成员 " .. sender .. " 的邀请")
                    return
                end
            end
        end
    end

    -- 全部自动接受
    if MyAddonDB.autoAcceptAll then
        AcceptGroup()
        print("自动接受 " .. sender .. " 的邀请")
        return
    end

    -- 未自动接受，提示用户
    print("收到 " .. sender .. " 的组队邀请")
end)
```

### 背包整理

实现一键整理背包的功能：

```lua
-- 背包整理模块
local BagSorter = {}

function BagSorter.Sort()
    -- 收集所有物品信息
    local items = {}
    for bag = 0, NUM_BAG_SLOTS do
        local slots = GetContainerNumSlots(bag)
        for slot = 1, slots do
            local itemID = GetContainerItemID(bag, slot)
            if itemID then
                local itemName, _, rarity, _, _, itemType, itemSubType = GetItemInfo(itemID)
                local _, count = GetContainerItemInfo(bag, slot)
                items[#items + 1] = {
                    bag = bag,
                    slot = slot,
                    itemID = itemID,
                    name = itemName,
                    rarity = rarity,
                    type = itemType,
                    subType = itemSubType,
                    count = count,
                }
            end
        end
    end

    -- 按品质、类型、名称排序
    table.sort(items, function(a, b)
        -- 先按品质降序
        if a.rarity ~= b.rarity then
            return a.rarity > b.rarity
        end
        -- 再按类型
        if a.type ~= b.type then
            return a.type < b.type
        end
        -- 最后按名称
        return a.name < b.name
    end)

    print("背包整理完成，共 " .. #items .. " 个物品")
end

-- 注册斜杠命令
SLASH_BAGSORT1 = "/bagsort"
SlashCmdList["BAGSORT"] = function(msg)
    BagSorter.Sort()
end
```

## 注意事项与常见错误

**不要使用阻塞操作**。WoW 的 Lua 环境运行在主线程中，任何阻塞操作都会导致游戏界面卡死。WoW 已经移除了 os.execute、io.open 等可能阻塞的 API。所有需要延迟执行的操作应使用 C_Timer.After 或 OnUpdate 脚本实现。

**注意 API 版本兼容性**。WoW 每个版本都可能修改或废弃部分 API。在 TOC 文件中正确设置 Interface 版本号，并使用 Interface/AddOns 中的加载机制检查兼容性。开发时建议参考当前版本的 API 文档，避免使用已废弃的函数。

**SavedVariables 的加载时机**。SavedVariables 在 ADDON_LOADED 事件触发时才可用，在此之前访问会得到 nil。如果插件需要在初始化时读取保存的配置，务必在 ADDON_LOADED 事件中执行初始化逻辑。

**避免在 OnUpdate 中执行重计算**。OnUpdate 每帧都会触发（通常约 60 次/秒），在其中执行复杂计算会严重影响游戏帧率。应使用节流机制（如累加 elapsed 时间，达到阈值才执行）来降低执行频率。

**字符串拼接的性能问题**。在频繁更新的文本（如 DPS 计时器）中，避免每帧都重新拼接字符串。可以使用 FontString 的 SetFormattedText 方法，或者在数据变化时才更新显示。

## 高级用法

### 使用 Ace3 框架

Ace3 是 WoW 插件开发中最流行的框架，提供了丰富的工具库：

```lua
-- 使用 Ace3 创建插件
local addon = LibStub("AceAddon-3.0"):NewAddon("MyAceAddon", "AceConsole-3.0", "AceEvent-3.0", "AceTimer-3.0")

-- 插件初始化
function addon:OnInitialize()
    -- 初始化数据库（自动处理 SavedVariables）
    self.db = LibStub("AceDB-3.0"):New("MyAceAddonDB", {
        profile = {
            enabled = true,
            showPanel = true,
            alertThreshold = 30,
        },
    })

    -- 注册斜杠命令
    self:RegisterChatCommand("maa", "ChatCommand")
    self:RegisterChatCommand("myaceaddon", "ChatCommand")

    print("MyAceAddon 已初始化")
end

-- 插件启用
function addon:OnEnable()
    -- 注册事件
    self:RegisterEvent("PLAYER_ENTERING_WORLD", "OnEnteringWorld")
    self:RegisterEvent("UNIT_HEALTH", "OnHealthChanged")

    -- 使用 AceTimer 定时执行
    self:ScheduleRepeatingTimer("UpdateInfo", 5)

    print("MyAceAddon 已启用")
end

-- 插件禁用
function addon:OnDisable()
    self:CancelAllTimers()
    self:UnregisterAllEvents()
end

-- 事件处理
function addon:OnEnteringWorld(event, isLogin)
    if isLogin then
        self:Print("欢迎回来！")
    end
end

function addon:OnHealthChanged(event, unit)
    if unit == "player" then
        local health = UnitHealth("player")
        local maxHealth = UnitHealthMax("player")
        local percent = (health / maxHealth) * 100

        if percent < self.db.profile.alertThreshold then
            self:Print("警告：生命值低于 " .. self.db.profile.alertThreshold .. "%！")
        end
    end
end

-- 定时更新
function addon:UpdateInfo()
    -- 定期执行的任务
end

-- 斜杠命令处理
function addon:ChatCommand(msg)
    local cmd = msg:lower():trim()
    if cmd == "show" then
        self.db.profile.showPanel = true
    elseif cmd == "hide" then
        self.db.profile.showPanel = false
    elseif cmd == "reset" then
        self.db:ResetProfile()
        self:Print("配置已重置")
    else
        self:Print("命令列表: show, hide, reset")
    end
end
```

### 创建小地图按钮

为插件添加小地图图标，方便快速访问：

```lua
-- 创建小地图按钮
local minimapButton = CreateFrame("Button", "MyAddonMinimapButton", Minimap)
minimapButton:SetSize(32, 32)
minimapButton:SetNormalTexture("Interface\\Icons\\INV_Misc_QuestionMark")
minimapButton:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")
minimapButton:SetPushedTexture("Interface\\Icons\\INV_Misc_QuestionMark")

-- 设置小地图位置（角度）
local function UpdateMinimapButtonPosition()
    local angle = MyAddonDB.minimapAngle or 45
    local rad = math.rad(angle)
    local x = math.cos(rad) * 80
    local y = math.sin(rad) * 80
    minimapButton:SetPoint("CENTER", Minimap, "CENTER", x, y)
end

-- 拖动小地图按钮
minimapButton:SetMovable(true)
minimapButton:EnableMouse(true)
minimapButton:RegisterForDrag("LeftButton")

minimapButton:SetScript("OnDragStart", function(self)
    self:StartMoving()
    self.isDragging = true
end)

minimapButton:SetScript("OnDragStop", function(self)
    self:StopMovingOrSizing()
    self.isDragging = false

    -- 计算按钮相对于小地图中心的角度
    local cx, cy = Minimap:GetCenter()
    local mx, my = self:GetCenter()
    local angle = math.deg(math.atan2(my - cy, mx - cx))
    MyAddonDB.minimapAngle = angle
end)

-- 点击小地图按钮
minimapButton:SetScript("OnClick", function(self, button)
    if button == "LeftButton" then
        -- 左键点击：切换面板显示
        if info_frame:IsShown() then
            info_frame:Hide()
        else
            info_frame:Show()
        end
    elseif button == "RightButton" then
        -- 右键点击：显示设置菜单
        local menu = {
            { text = "MyAddon 设置", isTitle = true },
            { text = "显示面板", checked = MyAddonDB.showPanel, func = function()
                MyAddonDB.showPanel = not MyAddonDB.showPanel
            end },
            { text = "低血量警报", checked = MyAddonDB.alerts.lowHealth, func = function()
                MyAddonDB.alerts.lowHealth = not MyAddonDB.alerts.lowHealth
            end },
        }
        EasyMenu(menu, CreateFrame("Frame", nil, UIParent, "UIDropDownMenuTemplate"), "cursor", 0, 0, "MENU")
    end
end)

UpdateMinimapButtonPosition()
```

### 消息过滤与聊天增强

实现聊天消息的过滤和增强功能：

```lua
-- 聊天消息过滤器
local chatFilter = CreateFrame("Frame")
chatFilter.filters = {
    -- 过滤关键词列表
    keywords = {"金币", "代练", "工作室"},
    -- 是否启用过滤
    enabled = true,
}

-- 注册聊天过滤器
ChatFrame_AddMessageEventFilter("CHAT_MSG_CHANNEL", function(self, event, msg, author, ...)
    if not chatFilter.filters.enabled then
        return false  -- 不过滤
    end

    -- 检查关键词
    local lowerMsg = msg:lower()
    for _, keyword in ipairs(chatFilter.filters.keywords) do
        if lowerMsg:find(keyword:lower()) then
            return true  -- 过滤掉该消息
        end
    end

    return false  -- 保留该消息
end)

-- 聊天消息高亮
ChatFrame_AddMessageEventFilter("CHAT_MSG_WHISPER", function(self, event, msg, author, ...)
    -- 为密语消息添加高亮前缀
    return false, "|cFFFF9900[密语]|r " .. msg, author, ...
end)

-- 注册斜杠命令管理过滤器
SLASH_CHATFILTER1 = "/cf"
SlashCmdList["CHATFILTER"] = function(msg)
    local cmd, arg = msg:match("^(%S*)%s*(.-)$")

    if cmd == "on" then
        chatFilter.filters.enabled = true
        print("聊天过滤器已启用")
    elseif cmd == "off" then
        chatFilter.filters.enabled = false
        print("聊天过滤器已禁用")
    elseif cmd == "add" then
        if arg and #arg > 0 then
            chatFilter.filters.keywords[#chatFilter.filters.keywords + 1] = arg
            print("已添加过滤关键词: " .. arg)
        end
    elseif cmd == "list" then
        print("当前过滤关键词:")
        for i, kw in ipairs(chatFilter.filters.keywords) do
            print("  " .. i .. ". " .. kw)
        end
    else
        print("用法: /cf on|off|add <keyword>|list")
    end
end
```
