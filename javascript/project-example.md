# JavaScript 项目示例：待办事项应用

## 项目概述

本项目实现一个功能完整的待办事项（Todo）应用，综合运用 DOM 操作、LocalStorage 持久化、事件处理、CSS 动画等前端核心知识点。采用纯 JavaScript 实现，不依赖任何框架。

### 功能清单

| 功能模块 | 描述 |
|---------|------|
| 添加任务 | 输入任务标题，选择优先级和分类 |
| 完成任务 | 点击切换完成状态，视觉反馈 |
| 删除任务 | 删除单条任务，带确认和动画 |
| 编辑任务 | 双击进入编辑模式 |
| 筛选任务 | 全部/进行中/已完成 |
| 搜索任务 | 实时搜索匹配 |
| 分类管理 | 工作/学习/生活/其他 |
| 优先级 | 高/中/低，颜色区分 |
| 数据持久化 | LocalStorage 自动保存和恢复 |
| 统计面板 | 任务总数、完成率、各分类统计 |
| 拖拽排序 | 拖拽调整任务顺序 |
| 批量操作 | 全部完成/清除已完成 |

## 需求分析

### 数据需求

- 每个任务包含：ID、标题、完成状态、优先级、分类、创建时间、完成时间
- 数据存储在 LocalStorage 中，页面刷新不丢失
- 支持最多 500 条任务

### 功能需求

- 任务 CRUD 操作流畅
- 筛选和搜索实时响应
- 拖拽排序直观
- 操作有动画反馈
- 支持键盘快捷操作

### 非功能需求

- 零依赖，纯原生实现
- 响应式布局，适配移动端
- 无障碍支持（ARIA 属性、键盘导航）

## 技术选型

| 技术点 | 选型 | 理由 |
|-------|------|------|
| DOM 操作 | 原生 DOM API | 学习核心原理，不依赖框架 |
| 事件处理 | 事件委托 | 减少事件监听器数量，性能更优 |
| 数据存储 | LocalStorage | 简单持久化，无需后端 |
| 样式 | CSS3 + CSS 变量 | 现代布局和动画 |
| 模板 | 模板字符串 | 简洁的 HTML 生成 |
| 状态管理 | 发布-订阅模式 | 解耦 UI 和数据逻辑 |

## 完整代码

### HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-container">
        <header class="app-header">
            <h1>Todo List</h1>
            <div class="stats-bar" id="statsBar"></div>
        </header>

        <div class="input-section">
            <form id="todoForm" class="todo-form">
                <input type="text" id="todoInput" class="todo-input"
                       placeholder="What needs to be done?"
                       autocomplete="off" required>
                <select id="prioritySelect" class="priority-select">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                </select>
                <select id="categorySelect" class="category-select">
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="life">Life</option>
                    <option value="other">Other</option>
                </select>
                <button type="submit" class="add-btn">Add</button>
            </form>
        </div>

        <div class="toolbar">
            <div class="filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="active">Active</button>
                <button class="filter-btn" data-filter="completed">Completed</button>
            </div>
            <input type="text" id="searchInput" class="search-input"
                   placeholder="Search tasks...">
            <div class="batch-actions">
                <button id="completeAllBtn" class="batch-btn">Complete All</button>
                <button id="clearCompletedBtn" class="batch-btn">Clear Completed</button>
            </div>
        </div>

        <ul id="todoList" class="todo-list" role="list"></ul>

        <footer class="app-footer">
            <span id="itemCount"></span>
        </footer>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### CSS 样式

```css
:root {
    --bg-primary: #f5f5f5;
    --bg-card: #ffffff;
    --text-primary: #333333;
    --text-secondary: #888888;
    --border-color: #e0e0e0;
    --accent: #4a90d9;
    --accent-hover: #357abd;
    --priority-high: #e74c3c;
    --priority-medium: #f39c12;
    --priority-low: #27ae60;
    --category-work: #3498db;
    --category-study: #9b59b6;
    --category-life: #1abc9c;
    --category-other: #95a5a6;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    --radius: 8px;
    --transition: 0.3s ease;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
}

.app-container {
    max-width: 680px;
    margin: 40px auto;
    padding: 0 20px;
}

.app-header h1 {
    font-size: 2rem;
    font-weight: 300;
    text-align: center;
    color: var(--accent);
    margin-bottom: 8px;
}

.stats-bar {
    display: flex;
    justify-content: center;
    gap: 24px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.stats-bar .stat-value {
    font-weight: 600;
    color: var(--text-primary);
}

.todo-form {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.todo-input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 1rem;
    transition: border-color var(--transition);
    outline: none;
}

.todo-input:focus {
    border-color: var(--accent);
}

.priority-select, .category-select {
    padding: 10px 12px;
    border: 2px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;
}

.add-btn {
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 1rem;
    cursor: pointer;
    transition: background var(--transition);
}

.add-btn:hover { background: var(--accent-hover); }

.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.filters { display: flex; gap: 4px; }

.filter-btn {
    padding: 6px 14px;
    border: 1px solid var(--border-color);
    border-radius: 20px;
    background: transparent;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all var(--transition);
}

.filter-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.search-input {
    flex: 1;
    min-width: 120px;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 20px;
    font-size: 0.85rem;
    outline: none;
}

.batch-btn {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    background: transparent;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all var(--transition);
}

.batch-btn:hover {
    background: var(--bg-primary);
}

.todo-list {
    list-style: none;
}

.todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--bg-card);
    border-radius: var(--radius);
    margin-bottom: 8px;
    box-shadow: var(--shadow);
    transition: all var(--transition);
    cursor: grab;
}

.todo-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.todo-item.dragging {
    opacity: 0.5;
    transform: scale(0.98);
}

.todo-item.completed .todo-text {
    text-decoration: line-through;
    color: var(--text-secondary);
}

.todo-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    flex-shrink: 0;
}

.todo-checkbox.checked {
    background: var(--accent);
    border-color: var(--accent);
}

.todo-checkbox.checked::after {
    content: "";
    width: 6px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
}

.todo-text {
    flex: 1;
    font-size: 0.95rem;
    word-break: break-word;
}

.todo-text-edit {
    flex: 1;
    font-size: 0.95rem;
    padding: 4px 8px;
    border: 1px solid var(--accent);
    border-radius: 4px;
    outline: none;
}

.priority-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
}

.priority-high { background: #fde8e8; color: var(--priority-high); }
.priority-medium { background: #fef3cd; color: var(--priority-medium); }
.priority-low { background: #d4edda; color: var(--priority-low); }

.category-tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    background: var(--bg-primary);
    color: var(--text-secondary);
}

.category-work { color: var(--category-work); }
.category-study { color: var(--category-study); }
.category-life { color: var(--category-life); }
.category-other { color: var(--category-other); }

.delete-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all var(--transition);
    opacity: 0;
}

.todo-item:hover .delete-btn { opacity: 1; }

.delete-btn:hover {
    color: var(--priority-high);
    background: #fde8e8;
}

.app-footer {
    text-align: center;
    padding: 16px 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(30px); }
}

.todo-item.entering { animation: slideIn 0.3s ease forwards; }
.todo-item.leaving { animation: slideOut 0.3s ease forwards; }

@media (max-width: 600px) {
    .todo-form { flex-wrap: wrap; }
    .todo-input { min-width: 100%; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .batch-actions { display: flex; gap: 8px; }
}
```

### JavaScript 核心逻辑

```javascript
const TodoApp = (function () {
    const STORAGE_KEY = "todo_app_data";
    let todos = [];
    let currentFilter = "all";
    let searchQuery = "";
    let dragItem = null;

    const pubsub = {
        events: {},
        on(event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
        },
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(cb => cb(data));
            }
        }
    };

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function loadTodos() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            todos = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load todos:", e);
            todos = [];
        }
    }

    function saveTodos() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
        } catch (e) {
            console.error("Failed to save todos:", e);
        }
    }

    function addTodo(title, priority, category) {
        const todo = {
            id: generateId(),
            title: title.trim(),
            completed: false,
            priority: priority || "medium",
            category: category || "other",
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        todos.unshift(todo);
        saveTodos();
        pubsub.emit("todo:added", todo);
        pubsub.emit("todo:changed");
        return todo;
    }

    function toggleTodo(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        todo.completed = !todo.completed;
        todo.completedAt = todo.completed ? new Date().toISOString() : null;
        saveTodos();
        pubsub.emit("todo:toggled", todo);
        pubsub.emit("todo:changed");
    }

    function deleteTodo(id) {
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return;
        const removed = todos.splice(index, 1)[0];
        saveTodos();
        pubsub.emit("todo:deleted", removed);
        pubsub.emit("todo:changed");
    }

    function updateTodo(id, updates) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        Object.assign(todo, updates);
        saveTodos();
        pubsub.emit("todo:updated", todo);
        pubsub.emit("todo:changed");
    }

    function getFilteredTodos() {
        return todos.filter(todo => {
            const matchesFilter =
                currentFilter === "all" ||
                (currentFilter === "active" && !todo.completed) ||
                (currentFilter === "completed" && todo.completed);

            const matchesSearch =
                !searchQuery ||
                todo.title.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesFilter && matchesSearch;
        });
    }

    function completeAll() {
        const activeTodos = todos.filter(t => !t.completed);
        activeTodos.forEach(t => {
            t.completed = true;
            t.completedAt = new Date().toISOString();
        });
        saveTodos();
        pubsub.emit("todo:changed");
    }

    function clearCompleted() {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        pubsub.emit("todo:changed");
    }

    function reorderTodos(fromIndex, toIndex) {
        const filtered = getFilteredTodos();
        const movedTodo = filtered[fromIndex];
        const targetTodo = filtered[toIndex];
        const realFrom = todos.findIndex(t => t.id === movedTodo.id);
        const realTo = todos.findIndex(t => t.id === targetTodo.id);
        todos.splice(realFrom, 1);
        todos.splice(realTo, 0, movedTodo);
        saveTodos();
        pubsub.emit("todo:changed");
    }

    function getStats() {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const byCategory = {};
        todos.forEach(t => {
            byCategory[t.category] = (byCategory[t.category] || 0) + 1;
        });
        return { total, completed, active, rate, byCategory };
    }

    function renderTodoItem(todo) {
        const li = document.createElement("li");
        li.className = `todo-item${todo.completed ? " completed" : ""} entering`;
        li.dataset.id = todo.id;
        li.setAttribute("draggable", "true");
        li.setAttribute("role", "listitem");

        li.innerHTML = `
            <div class="todo-checkbox${todo.completed ? " checked" : ""}"
                 role="checkbox" aria-checked="${todo.completed}"
                 tabindex="0" aria-label="Toggle completion"></div>
            <span class="todo-text">${escapeHtml(todo.title)}</span>
            <span class="priority-badge priority-${todo.priority}">${todo.priority}</span>
            <span class="category-tag category-${todo.category}">${todo.category}</span>
            <button class="delete-btn" aria-label="Delete task">&times;</button>
        `;

        setTimeout(() => li.classList.remove("entering"), 300);
        return li;
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function renderList() {
        const list = document.getElementById("todoList");
        list.innerHTML = "";
        const filtered = getFilteredTodos();
        filtered.forEach(todo => {
            list.appendChild(renderTodoItem(todo));
        });
    }

    function renderStats() {
        const stats = getStats();
        document.getElementById("statsBar").innerHTML = `
            <span>Total: <span class="stat-value">${stats.total}</span></span>
            <span>Active: <span class="stat-value">${stats.active}</span></span>
            <span>Done: <span class="stat-value">${stats.completed}</span></span>
            <span>Rate: <span class="stat-value">${stats.rate}%</span></span>
        `;
        document.getElementById("itemCount").textContent =
            `${stats.active} item${stats.active !== 1 ? "s" : ""} left`;
    }

    function initEventListeners() {
        const form = document.getElementById("todoForm");
        const list = document.getElementById("todoList");
        const searchInput = document.getElementById("searchInput");

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            const input = document.getElementById("todoInput");
            const priority = document.getElementById("prioritySelect").value;
            const category = document.getElementById("categorySelect").value;
            if (input.value.trim()) {
                addTodo(input.value, priority, category);
                input.value = "";
                input.focus();
            }
        });

        list.addEventListener("click", function (e) {
            const item = e.target.closest(".todo-item");
            if (!item) return;
            const id = item.dataset.id;

            if (e.target.closest(".todo-checkbox")) {
                toggleTodo(id);
            } else if (e.target.closest(".delete-btn")) {
                item.classList.add("leaving");
                setTimeout(() => deleteTodo(id), 300);
            }
        });

        list.addEventListener("dblclick", function (e) {
            const item = e.target.closest(".todo-item");
            if (!item) return;
            const textEl = e.target.closest(".todo-text");
            if (!textEl) return;

            const id = item.dataset.id;
            const todo = todos.find(t => t.id === id);
            if (!todo || todo.completed) return;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "todo-text-edit";
            input.value = todo.title;

            textEl.replaceWith(input);
            input.focus();
            input.select();

            function finishEdit() {
                const newTitle = input.value.trim();
                if (newTitle && newTitle !== todo.title) {
                    updateTodo(id, { title: newTitle });
                }
                renderList();
            }

            input.addEventListener("blur", finishEdit);
            input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") input.blur();
                if (e.key === "Escape") {
                    input.value = todo.title;
                    input.blur();
                }
            });
        });

        list.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                const checkbox = e.target.closest(".todo-checkbox");
                if (checkbox) {
                    e.preventDefault();
                    const item = checkbox.closest(".todo-item");
                    toggleTodo(item.dataset.id);
                }
            }
        });

        document.querySelector(".filters").addEventListener("click", function (e) {
            const btn = e.target.closest(".filter-btn");
            if (!btn) return;
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderList();
        });

        searchInput.addEventListener("input", function () {
            searchQuery = this.value;
            renderList();
        });

        document.getElementById("completeAllBtn").addEventListener("click", completeAll);
        document.getElementById("clearCompletedBtn").addEventListener("click", clearCompleted);

        list.addEventListener("dragstart", function (e) {
            dragItem = e.target.closest(".todo-item");
            if (dragItem) {
                dragItem.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
            }
        });

        list.addEventListener("dragover", function (e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement) {
                list.insertBefore(dragItem, afterElement);
            } else {
                list.appendChild(dragItem);
            }
        });

        list.addEventListener("dragend", function () {
            if (dragItem) {
                dragItem.classList.remove("dragging");
                const items = [...list.querySelectorAll(".todo-item")];
                const fromIndex = getFilteredTodos().findIndex(
                    t => t.id === dragItem.dataset.id
                );
                const toIndex = items.findIndex(
                    el => el.dataset.id === dragItem.dataset.id
                );
                if (fromIndex !== toIndex && fromIndex !== -1 && toIndex !== -1) {
                    reorderTodos(fromIndex, toIndex);
                }
                dragItem = null;
            }
        });

        pubsub.on("todo:changed", function () {
            renderList();
            renderStats();
        });
    }

    function getDragAfterElement(container, y) {
        const elements = [...container.querySelectorAll(".todo-item:not(.dragging)")];
        return elements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function init() {
        loadTodos();
        initEventListeners();
        renderList();
        renderStats();
    }

    return { init };
})();

document.addEventListener("DOMContentLoaded", TodoApp.init);
```

## 运行说明

### 直接打开

将 HTML、CSS 和 JS 文件放在同一目录，用浏览器打开 HTML 文件即可。

### 文件结构

```
todo-app/
  index.html
  style.css
  app.js
```

### 数据存储

- 数据自动保存在浏览器的 LocalStorage 中
- 键名：`todo_app_data`
- 清除数据：浏览器开发者工具 -> Application -> Local Storage -> 删除对应键

## 扩展方向

1. **截止日期** -- 添加任务截止日期，超期提醒
2. **子任务** -- 支持任务嵌套子任务
3. **标签系统** -- 自定义标签替代固定分类
4. **导入导出** -- JSON 格式导入导出任务数据
5. **暗色模式** -- CSS 变量切换主题
6. **PWA** -- 添加 Service Worker 支持离线使用
7. **后端同步** -- 接入 REST API 实现多设备同步

---

## 关键代码速查

### LocalStorage 操作

```javascript
localStorage.setItem("key", JSON.stringify(data));
const data = JSON.parse(localStorage.getItem("key"));
localStorage.removeItem("key");
```

### 事件委托

```javascript
list.addEventListener("click", function (e) {
    const item = e.target.closest(".todo-item");
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest(".delete-btn")) { /* ... */ }
});
```

### DOM 创建元素

```javascript
const li = document.createElement("li");
li.className = "todo-item";
li.dataset.id = id;
li.innerHTML = `<span class="text">${title}</span>`;
list.appendChild(li);
```

### 拖拽排序

```javascript
element.addEventListener("dragstart", e => { /* 记录拖拽项 */ });
element.addEventListener("dragover", e => { e.preventDefault(); /* 插入位置 */ });
element.addEventListener("drop", e => { /* 重新排序 */ });
```

### 发布订阅模式

```javascript
const pubsub = {
    events: {},
    on(event, cb) { (this.events[event] ||= []).push(cb); },
    emit(event, data) { (this.events[event] || []).forEach(cb => cb(data)); }
};
```

### CSS 动画

```css
@keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
.todo-item.entering { animation: slideIn 0.3s ease forwards; }
```
