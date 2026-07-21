---
order: 58
title: Lua与Neovim
module: lua
category: Lua
difficulty: intermediate
description: 'Neovim Lua配置'
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua即时编译器
  - lua/Lua与Love2D
  - lua/Lua与Redis脚本
  - lua/Lua与Nginx
prerequisites:
  - lua/概述与环境配置
---

## 概述

Neovim 是 Vim 编辑器的现代化分支，其最显著的特性之一就是将 Lua 作为一等配置语言。从 0.5 版本开始，Neovim 提供了完整的 Lua API，开发者可以使用 Lua 编写配置、定义快捷键、管理插件、配置语言服务器等，彻底告别了传统的 VimScript 配置方式。Lua 的执行速度远快于 VimScript，语法也更加简洁清晰，使得 Neovim 的配置更加高效和可维护。

Neovim 的 Lua 集成不仅仅是简单的脚本嵌入，而是深度整合。Neovim 暴露了丰富的 vim 全局模块，包含编辑器选项、缓冲区操作、窗口管理、键位映射、自动命令等 API。同时，Neovim 的插件生态也全面转向 Lua，主流插件如 nvim-treesitter、nvim-lspconfig、telescope.nvim、lazy.nvim 等都使用 Lua 编写，形成了一个完整的 Lua 生态。

## 基本概念

**init.lua** 是 Neovim 的 Lua 配置入口文件，位于 `~/.config/nvim/init.lua`（Linux/macOS）或 `~/AppData/Local/nvim/init.lua`（Windows）。Neovim 启动时会自动加载此文件，相当于传统 Vim 中的 init.vim。配置可以拆分为多个模块文件，通过 require 加载。

**vim 全局对象**是 Neovim 暴露给 Lua 的核心接口，包含多个子模块：vim.opt 用于设置编辑器选项，vim.keymap 用于定义键位映射，vim.api 用于调用 Neovim 的底层 API，vim.fn 用于调用 VimScript 函数，vim.cmd 用于执行 Ex 命令。

**Buffer（缓冲区）**是 Neovim 中文件内容的内存表示。每个打开的文件对应一个缓冲区，缓冲区有唯一的编号（bufnr）。通过 vim.api 模块可以对缓冲区进行操作，如获取内容、设置行、创建高亮等。

**Window（窗口）**是缓冲区的可视区域。一个缓冲区可以在多个窗口中显示，一个窗口只能显示一个缓冲区。窗口也有唯一的编号（winid）。

**Autocmd（自动命令）**是 Neovim 的事件响应机制。当特定事件发生时（如打开文件、切换缓冲区、退出插入模式等），自动执行指定的回调函数。这是实现自动格式化、语法高亮、文件类型检测等功能的基础。

## 快速开始

创建 Neovim 的 Lua 配置文件。首先确认配置目录存在：

```bash
mkdir -p ~/.config/nvim
```

创建 `init.lua` 文件，写入最基本的配置：

```lua
-- 基础选项设置
vim.opt.number = true           -- 显示行号
vim.opt.relativenumber = true   -- 显示相对行号
vim.opt.tabstop = 4             -- Tab 键宽度
vim.opt.shiftwidth = 4          -- 缩进宽度
vim.opt.expandtab = true        -- 将 Tab 转换为空格
vim.opt.smartindent = true      -- 智能缩进
vim.opt.wrap = false            -- 不自动换行
vim.opt.cursorline = true       -- 高亮当前行
vim.opt.signcolumn = "yes"      -- 始终显示符号列
vim.opt.termguicolors = true    -- 启用真彩色

-- 设置 Leader 键为空格
vim.g.mapleader = " "

-- 基本快捷键映射
vim.keymap.set("n", "<leader>w", ":w<CR>", { desc = "保存文件" })
vim.keymap.set("n", "<leader>q", ":q<CR>", { desc = "退出" })
vim.keymap.set("n", "<leader>h", ":nohlsearch<CR>", { desc = "清除搜索高亮" })

-- 窗口导航
vim.keymap.set("n", "<C-h>", "<C-w>h", { desc = "切换到左侧窗口" })
vim.keymap.set("n", "<C-j>", "<C-w>j", { desc = "切换到下方窗口" })
vim.keymap.set("n", "<C-k>", "<C-w>k", { desc = "切换到上方窗口" })
vim.keymap.set("n", "<C-l>", "<C-w>l", { desc = "切换到右侧窗口" })

-- 缓冲区切换
vim.keymap.set("n", "<leader>bn", ":bnext<CR>", { desc = "下一个缓冲区" })
vim.keymap.set("n", "<leader>bp", ":bprevious<CR>", { desc = "上一个缓冲区" })
vim.keymap.set("n", "<leader>bd", ":bdelete<CR>", { desc = "关闭缓冲区" })
```

保存后重启 Neovim 或执行 `:source %` 即可生效。

## 详细用法

### 模块化配置

将配置拆分为多个文件，便于管理。推荐的目录结构：

```
~/.config/nvim/
  init.lua           -- 入口文件
  lua/
    config/
      options.lua    -- 编辑器选项
      keymaps.lua    -- 快捷键映射
      autocmds.lua   -- 自动命令
    plugins/
      init.lua       -- 插件管理
      lsp.lua        -- LSP 配置
      cmp.lua        -- 自动补全
      treesitter.lua -- 语法高亮
```

入口文件 `init.lua`：

```lua
-- 加载各模块
require("config.options")
require("config.keymaps")
require("config.autocmds")
require("plugins.init")
```

选项模块 `lua/config/options.lua`：

```lua
-- 编辑器选项配置
local opt = vim.opt

-- 行号与缩进
opt.number = true
opt.relativenumber = true
opt.tabstop = 4
opt.shiftwidth = 4
opt.expandtab = true
opt.smartindent = true

-- 搜索设置
opt.ignorecase = true      -- 搜索忽略大小写
opt.smartcase = true       -- 智能大小写（包含大写字母时区分）
opt.hlsearch = true        -- 搜索高亮
opt.incsearch = true       -- 增量搜索

-- 外观设置
opt.termguicolors = true
opt.signcolumn = "yes"
opt.cursorline = true
opt.wrap = false
opt.scrolloff = 8          -- 光标上下保留 8 行
opt.sidescrolloff = 8      -- 光标左右保留 8 列

-- 性能设置
opt.updatetime = 250       -- 快速更新时间
opt.timeoutlen = 300       -- 快捷键超时时间
opt.completeopt = "menu,menuone,noselect"  -- 补全行为

-- 文件设置
opt.undofile = true        -- 持久化撤销
opt.backup = false
opt.writebackup = false
opt.swapfile = false

-- 剪贴板
opt.clipboard = "unnamedplus"  -- 使用系统剪贴板
```

快捷键模块 `lua/config/keymaps.lua`：

```lua
-- 快捷键映射
local map = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Leader 键
vim.g.mapleader = " "
vim.g.maplocalleader = "\\"

-- 文件操作
map("n", "<leader>w", ":w<CR>", { desc = "保存文件" })
map("n", "<leader>q", ":q<CR>", { desc = "退出" })
map("n", "<leader>Q", ":qa!<CR>", { desc = "强制退出所有" })

-- 窗口管理
map("n", "<leader>sv", ":vsplit<CR>", { desc = "垂直分屏" })
map("n", "<leader>sh", ":split<CR>", { desc = "水平分屏" })
map("n", "<leader>sc", ":close<CR>", { desc = "关闭窗口" })

-- 缓冲区导航
map("n", "<S-h>", ":bprevious<CR>", { desc = "上一个缓冲区" })
map("n", "<S-l>", ":bnext<CR>", { desc = "下一个缓冲区" })
map("n", "<leader>bd", ":bdelete<CR>", { desc = "关闭缓冲区" })

-- 移动优化
map("n", "j", "gj", opts)  -- 在软换行中按行移动
map("n", "k", "gk", opts)
map("n", "<C-d>", "<C-d>zz", { desc = "向下翻页并居中" })
map("n", "<C-u>", "<C-u>zz", { desc = "向上翻页并居中" })
map("n", "n", "nzzzv", { desc = "搜索下一个并居中" })
map("n", "N", "Nzzzv", { desc = "搜索上一个并居中" })

-- Visual 模式粘贴不覆盖寄存器
map("v", "p", '"_dP', opts)

-- 快速移动行
map("n", "<A-j>", ":m .+1<CR>==", opts)
map("n", "<A-k>", ":m .-2<CR>==", opts)
map("v", "<A-j>", ":m '>+1<CR>gv=gv", opts)
map("v", "<A-k>", ":m '<-2<CR>gv=gv", opts)
```

### 插件管理（lazy.nvim）

lazy.nvim 是当前最流行的 Neovim 插件管理器，支持延迟加载、自动安装、版本锁定等功能：

```lua
-- lua/plugins/init.lua
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

-- 自动安装 lazy.nvim
if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({
        "git", "clone", "--filter=blob:none",
        "https://github.com/folke/lazy.nvim.git",
        "--branch=stable",
        lazypath,
    })
end

vim.opt.rtp:prepend(lazypath)

-- 插件配置
require("lazy").setup({
    -- 主题
    {
        "folke/tokyonight.nvim",
        lazy = false,
        priority = 1000,
        config = function()
            require("tokyonight").setup({
                style = "night",
                transparent = false,
            })
            vim.cmd([[colorscheme tokyonight-night]])
        end,
    },

    -- 文件树
    {
        "nvim-neo-tree/neo-tree.nvim",
        branch = "v3.x",
        dependencies = {
            "nvim-lua/plenary.nvim",
            "nvim-tree/nvim-web-devicons",
            "MunifTanjim/nui.nvim",
        },
        keys = {
            { "<leader>e", ":Neotree toggle<CR>", desc = "文件树" },
        },
    },

    -- 模糊搜索
    {
        "nvim-telescope/telescope.nvim",
        branch = "0.1.x",
        dependencies = { "nvim-lua/plenary.nvim" },
        keys = {
            { "<leader>ff", ":Telescope find_files<CR>", desc = "查找文件" },
            { "<leader>fg", ":Telescope live_grep<CR>", desc = "全局搜索" },
            { "<leader>fb", ":Telescope buffers<CR>", desc = "缓冲区列表" },
            { "<leader>fh", ":Telescope help_tags<CR>", desc = "帮助标签" },
        },
    },

    -- 语法高亮
    {
        "nvim-treesitter/nvim-treesitter",
        build = ":TSUpdate",
        config = function()
            require("nvim-treesitter.configs").setup({
                ensure_installed = {
                    "lua", "python", "javascript", "typescript",
                    "html", "css", "json", "yaml", "markdown",
                },
                highlight = { enable = true },
                indent = { enable = true },
            })
        end,
    },

    -- Git 集成
    {
        "lewis6991/gitsigns.nvim",
        config = function()
            require("gitsigns").setup({
                signs = {
                    add = { text = "+" },
                    change = { text = "~" },
                    delete = { text = "_" },
                },
            })
        end,
    },

    -- 状态栏
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            require("lualine").setup({
                options = {
                    theme = "tokyonight",
                    section_separators = "",
                    component_separators = "",
                },
            })
        end,
    },
})
```

### LSP 配置

使用 nvim-lspconfig 配置语言服务器：

```lua
-- lua/plugins/lsp.lua
local lspconfig = require("lspconfig")

-- LSP 快捷键（仅在 LSP 附加到缓冲区时生效）
vim.api.nvim_create_autocmd("LspAttach", {
    callback = function(args)
        local bufnr = args.buf
        local opts = { buffer = bufnr, noremap = true, silent = true }

        vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
        vim.keymap.set("n", "gD", vim.lsp.buf.declaration, opts)
        vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
        vim.keymap.set("n", "gi", vim.lsp.buf.implementation, opts)
        vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
        vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
        vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, opts)
        vim.keymap.set("n", "<leader>f", function()
            vim.lsp.buf.format({ async = true })
        end, opts)

        -- 诊断快捷键
        vim.keymap.set("n", "[d", vim.diagnostic.goto_prev, opts)
        vim.keymap.set("n", "]d", vim.diagnostic.goto_next, opts)
        vim.keymap.set("n", "<leader>d", vim.diagnostic.open_float, opts)
    end,
})

-- 诊断图标
vim.diagnostic.config({
    virtual_text = true,
    signs = true,
    underline = true,
    float = {
        border = "rounded",
        source = "always",
    },
})

-- Lua 语言服务器配置
lspconfig.lua_ls.setup({
    settings = {
        Lua = {
            runtime = { version = "LuaJIT" },
            diagnostics = {
                globals = { "vim" },  -- 识别 vim 全局变量
            },
            workspace = {
                library = vim.api.nvim_get_runtime_file("", true),
                checkThirdParty = false,
            },
            telemetry = { enable = false },
        },
    },
})

-- Python 语言服务器
lspconfig.pyright.setup({})

-- TypeScript 语言服务器
lspconfig.ts_ls.setup({})

-- Go 语言服务器
lspconfig.gopls.setup({})
```

### 自动命令

使用 Lua API 创建自动命令：

```lua
-- lua/config/autocmds.lua

-- 创建自动命令组
local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- 通用自动命令组
local general = augroup("General", { clear = true })

-- 进入文件时恢复上次光标位置
autocmd("BufReadPost", {
    group = general,
    callback = function()
        local mark = vim.api.nvim_buf_get_mark(0, '"')
        local line_count = vim.api.nvim_buf_line_count(0)
        if mark[1] > 0 and mark[1] <= line_count then
            vim.api.nvim_win_set_cursor(0, mark)
        end
    end,
})

-- 保存时自动去除行尾空白
autocmd("BufWritePre", {
    group = general,
    pattern = "*",
    callback = function()
        local save_cursor = vim.fn.winsaveview()
        vim.cmd([[%s/\s\+$//e]])
        vim.fn.winrestview(save_cursor)
    end,
})

-- 保存时自动格式化（仅对支持 LSP 格式化的文件生效）
autocmd("BufWritePre", {
    group = general,
    callback = function()
        local clients = vim.lsp.get_clients({ bufnr = 0 })
        if #clients > 0 then
            vim.lsp.buf.format({ async = false })
        end
    end,
})

-- 文件类型特定设置
local filetype = augroup("FileType", { clear = true })

autocmd("FileType", {
    group = filetype,
    pattern = { "lua", "python" },
    callback = function()
        vim.opt_local.tabstop = 4
        vim.opt_local.shiftwidth = 4
    end,
})

autocmd("FileType", {
    group = filetype,
    pattern = { "javascript", "typescript", "html", "css", "json", "yaml" },
    callback = function()
        vim.opt_local.tabstop = 2
        vim.opt_local.shiftwidth = 2
    end,
})

-- 高亮 yank（复制）区域
autocmd("TextYankPost", {
    group = general,
    callback = function()
        vim.highlight.on_yank({
            higroup = "IncSearch",
            timeout = 200,
        })
    end,
})
```

### 自定义用户命令

使用 Lua 创建自定义命令：

```lua
-- 创建用户命令
vim.api.nvim_create_user_command("Format", function()
    vim.lsp.buf.format({ async = true })
end, { desc = "格式化当前文件" })

-- 带参数的命令
vim.api.nvim_create_user_command("Term", function(opts)
    vim.cmd("terminal " .. opts.args)
end, {
    nargs = "*",
    desc = "打开终端",
    complete = function()
        return { "bash", "python", "node" }
    end,
})

-- 带范围选择的命令
vim.api.nvim_create_user_command("SortLines", function(opts)
    local start_line = opts.line1
    local end_line = opts.line2
    local lines = vim.api.nvim_buf_get_lines(0, start_line - 1, end_line, false)
    table.sort(lines)
    vim.api.nvim_buf_set_lines(0, start_line - 1, end_line, false, lines)
end, { range = true, desc = "排序选中行" })

-- 切换选项的命令
vim.api.nvim_create_user_command("ToggleWrap", function()
    vim.opt.wrap = not vim.opt.wrap:get()
    print("自动换行: " .. tostring(vim.opt.wrap:get()))
end, { desc = "切换自动换行" })

vim.api.nvim_create_user_command("ToggleNumber", function()
    if vim.opt.relativenumber:get() then
        vim.opt.relativenumber = false
        vim.opt.number = true
        print("绝对行号")
    else
        vim.opt.relativenumber = true
        print("相对行号")
    end
end, { desc = "切换行号模式" })
```

## 常见场景

### 自定义状态栏

使用 Neovim API 创建自定义状态栏：

```lua
-- 简单自定义状态栏
local function setup_statusline()
    -- 左侧：文件名和修改状态
    vim.opt.statusline = "%<%f"           -- 文件名
    vim.opt.statusline = vim.opt.statusline + "%h%m%r"  -- 标志
    vim.opt.statusline = vim.opt.statusline + "%="       -- 右对齐

    -- 右侧：文件类型、编码、行号
    vim.opt.statusline = vim.opt.statusline + "%y"       -- 文件类型
    vim.opt.statusline = vim.opt.statusline + " [%{&encoding}]"  -- 编码
    vim.opt.statusline = vim.opt.statusline + " [%l:%v/%L]"      -- 行号
end

setup_statusline()
```

### 自动补全配置

使用 nvim-cmp 配置自动补全：

```lua
-- lua/plugins/cmp.lua
local cmp = require("cmp")
local luasnip = require("luasnip")

cmp.setup({
    snippet = {
        expand = function(args)
            luasnip.lsp_expand(args.body)
        end,
    },

    mapping = cmp.mapping.preset.insert({
        ["<C-b>"] = cmp.mapping.scroll_docs(-4),
        ["<C-f>"] = cmp.mapping.scroll_docs(4),
        ["<C-Space>"] = cmp.mapping.complete(),
        ["<C-e>"] = cmp.mapping.abort(),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
        ["<Tab>"] = cmp.mapping(function(fallback)
            if cmp.visible() then
                cmp.select_next_item()
            elseif luasnip.expand_or_jumpable() then
                luasnip.expand_or_jump()
            else
                fallback()
            end
        end, { "i", "s" }),
    }),

    sources = cmp.config.sources({
        { name = "nvim_lsp" },
        { name = "luasnip" },
    }, {
        { name = "buffer" },
        { name = "path" },
    }),
})
```

### 项目本地配置

实现项目级别的 .nvim.lua 配置文件：

```lua
-- 加载项目本地配置
local function load_project_config()
    local config_file = ".nvim.lua"
    local path = vim.fn.findfile(config_file, ".;")

    if path ~= "" then
        -- 将项目配置目录加入 runtimepath
        vim.opt.rtp:append(vim.fn.fnamemodify(path, ":h"))

        -- 安全加载配置
        local ok, err = pcall(dofile, path)
        if not ok then
            vim.notify("项目配置加载失败: " .. err, vim.log.levels.WARN)
        else
            vim.notify("已加载项目配置: " .. path, vim.log.levels.INFO)
        end
    end
end

-- 在目录切换时检查项目配置
vim.api.nvim_create_autocmd("DirChanged", {
    callback = load_project_config,
})
```

## 注意事项与常见错误

**vim.opt 与 vim.o 的区别**。vim.opt 返回一个特殊对象，支持链式调用和追加操作（如 vim.opt.wildignore:append("\*.o")），而 vim.o 直接返回字符串值。在条件判断中使用 vim.opt 时需要调用 :get() 方法获取实际值，否则判断结果可能不正确。

**vim.keymap.set 的模式参数**。第一个参数可以是单个模式字符串（如 "n"），也可以是模式列表（如 { "n", "v" }）。常见模式包括：n（普通模式）、i（插入模式）、v（可视模式）、x（行可视模式）、s（选择模式）、c（命令模式）、t（终端模式）。

**LSP 配置必须在服务器启动前完成**。lspconfig 的 setup 调用会启动语言服务器，之后的配置修改不会生效。如果需要动态修改 LSP 设置，应使用 vim.lsp.config 或在 LspAttach 回调中处理。

**require 的路径规则**。Neovim 的 require 从 runtimepath 下的 lua/ 目录查找模块。例如 require("config.options") 对应 lua/config/options.lua。注意不要在模块路径中包含 lua/ 前缀，也不要包含 .lua 后缀。

**避免在配置中使用 vim.cmd 执行复杂 VimScript**。虽然 vim.cmd 可以执行 VimScript 代码，但过度依赖会失去 Lua 配置的优势。尽量使用 Neovim 提供的 Lua API（如 vim.api、vim.keymap、vim.opt 等）来实现相同功能。

## 高级用法

### 自定义 Operator

使用 Neovim API 创建自定义操作符：

```lua
-- 创建自定义操作符：将选中文本转为大写
vim.api.nvim_create_user_command("Upper", function(opts)
    if opts.range == 0 then
        -- 没有范围，对当前行操作
        local line = vim.api.nvim_get_current_line()
        vim.api.nvim_set_current_line(line:upper())
    else
        -- 有范围，对选中行操作
        local lines = vim.api.nvim_buf_get_lines(0, opts.line1 - 1, opts.line2, false)
        for i, line in ipairs(lines) do
            lines[i] = line:upper()
        end
        vim.api.nvim_buf_set_lines(0, opts.line1 - 1, opts.line2, false, lines)
    end
end, { range = true, desc = "将选中区域转为大写" })

-- 使用 gU 作为操作符映射
vim.keymap.set("n", "gU", ":set operatorfunc=v:lua.upper_op<CR>g@", { expr = true })

-- 通过 Lua 函数定义操作符
_G.upper_op = function(type)
    local start_pos, end_pos
    if type == "line" then
        start_pos = vim.api.nvim_buf_get_mark(0, "[")
        end_pos = vim.api.nvim_buf_get_mark(0, "]")
    elseif type == "char" then
        start_pos = vim.api.nvim_buf_get_mark(0, "[")
        end_pos = vim.api.nvim_buf_get_mark(0, "]")
    end

    if start_pos and end_pos then
        local lines = vim.api.nvim_buf_get_lines(0, start_pos[1] - 1, end_pos[1], false)
        for i, line in ipairs(lines) do
            lines[i] = line:upper()
        end
        vim.api.nvim_buf_set_lines(0, start_pos[1] - 1, end_pos[1], false, lines)
    end
end
```

### 浮动终端

创建一个可切换的浮动终端窗口：

```lua
-- 浮动终端模块
local Terminal = {}
Terminal.__index = Terminal

function Terminal.new()
    local self = setmetatable({}, Terminal)
    self.buf = nil
    self.win = nil
    self.is_open = false
    return self
end

function Terminal:toggle()
    if self.is_open and vim.api.nvim_win_is_valid(self.win) then
        self:close()
    else
        self:open()
    end
end

function Terminal:open()
    -- 创建缓冲区
    if not self.buf or not vim.api.nvim_buf_is_valid(self.buf) then
        self.buf = vim.api.nvim_create_buf(false, true)
    end

    -- 计算浮动窗口大小
    local width = math.floor(vim.o.columns * 0.8)
    local height = math.floor(vim.o.lines * 0.6)
    local col = math.floor((vim.o.columns - width) / 2)
    local row = math.floor((vim.o.lines - height) / 2)

    -- 创建浮动窗口
    self.win = vim.api.nvim_open_win(self.buf, true, {
        relative = "editor",
        width = width,
        height = height,
        col = col,
        row = row,
        style = "minimal",
        border = "rounded",
    })

    -- 如果缓冲区中没有终端，启动一个
    if vim.bo[self.buf].buftype ~= "terminal" then
        vim.cmd("terminal")
    end

    self.is_open = true

    -- 进入终端模式
    vim.cmd("startinsert")
end

function Terminal:close()
    if self.win and vim.api.nvim_win_is_valid(self.win) then
        vim.api.nvim_win_close(self.win, false)
    end
    self.is_open = false
end

-- 创建实例并绑定快捷键
local terminal = Terminal.new()
vim.keymap.set("n", "<leader>t", function()
    terminal:toggle()
end, { desc = "切换浮动终端" })

-- 终端模式下的快捷键
vim.keymap.set("t", "<Esc>", [[<C-\><C-n>]], { desc = "退出终端模式" })
vim.keymap.set("t", "<C-h>", [[<C-\><C-n><C-w>h]], { desc = "终端中切换窗口" })
```

### 自定义诊断显示

自定义 LSP 诊断的显示方式：

```lua
-- 自定义诊断符号
local signs = {
    Error = "E",
    Warn = "W",
    Hint = "H",
    Info = "I",
}

for type, icon in pairs(signs) do
    local hl = "DiagnosticSign" .. type
    vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = hl })
end

-- 自定义诊断配置
vim.diagnostic.config({
    virtual_text = {
        prefix = " ",  -- 虚拟文本前缀
        spacing = 4,
        source = "if_many",
    },
    float = {
        source = "always",
        border = "rounded",
        header = "",
        prefix = "",
    },
    signs = true,
    underline = true,
    update_in_insert = false,
    severity_sort = true,
})

-- 自定义诊断跳转，自动打开浮动窗口
vim.keymap.set("n", "[d", function()
    vim.diagnostic.goto_prev({ float = true })
end, { desc = "上一个诊断" })

vim.keymap.set("n", "]d", function()
    vim.diagnostic.goto_next({ float = true })
end, { desc = "下一个诊断" })
```

### 缓冲区局部键位映射

为特定文件类型设置局部快捷键：

```lua
-- 为 Lua 文件设置局部快捷键
vim.api.nvim_create_autocmd("FileType", {
    pattern = "lua",
    callback = function()
        local buf_opts = { buffer = true, noremap = true, silent = true }

        -- 快速执行当前 Lua 文件
        vim.keymap.set("n", "<leader>lr", ":luafile %<CR>",
            vim.tbl_extend("force", buf_opts, { desc = "执行当前 Lua 文件" }))

        -- 快速打开 Neovim 配置
        vim.keymap.set("n", "<leader>lc", ":e ~/.config/nvim/init.lua<CR>",
            vim.tbl_extend("force", buf_opts, { desc = "打开 Neovim 配置" }))
    end,
})

-- 为 Markdown 文件设置局部快捷键
vim.api.nvim_create_autocmd("FileType", {
    pattern = "markdown",
    callback = function()
        local buf_opts = { buffer = true, noremap = true, silent = true }

        vim.keymap.set("n", "<leader>mp", ":MarkdownPreview<CR>",
            vim.tbl_extend("force", buf_opts, { desc = "Markdown 预览" }))

        vim.opt_local.wrap = true
        vim.opt_local.spell = true
        vim.opt_local.spelllang = "en,cjk"
    end,
})
```
