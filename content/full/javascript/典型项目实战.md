---
order: 130
tags:
  - javascript
  - project
difficulty: intermediate
title: 典型项目实战
module: javascript
category: 'JavaScript Basics'
description: '综合运用 DOM、异步与模块化的项目实践。'
author: fanquanpp
updated: '2026-05-03'
related:
  - 'javascript/Web API与浏览器接口'
  - javascript/调试与性能优化
  - javascript/Node.js高级特性与性能优化
  - 'javascript/项目示例-待办事项应用'
prerequisites:
  - javascript/语法速查
---

## 1. 项目实战案例

### 1.1 待办事项应用 (To-Do App)

#### 1.1.1 功能需求

- 添加任务
- 标记任务完成/未完成
- 删除任务
- 编辑任务
- 任务过滤（全部/已完成/未完成）
- 本地存储

#### 1.1.2 技术栈

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- LocalStorage

#### 1.1.3 项目结构

```
 todo-app/
 ├── index.html
 ├── style.css
 ├── script.js
 └── README.md
```

#### 1.1.4 完整实现

**index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>To-Do App</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">To-Do App</h1>
      <div class="flex mb-4">
        <input
          type="text"
          id="task-input"
          class="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a new task..."
        />
        <button
          id="add-task"
          class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 transition-colors"
        >
          Add
        </button>
      </div>
      <div class="flex mb-4">
        <button class="filter-btn active flex-1 py-2 text-center" data-filter="all">All</button>
        <button class="filter-btn flex-1 py-2 text-center" data-filter="active">Active</button>
        <button class="filter-btn flex-1 py-2 text-center" data-filter="completed">
          Completed
        </button>
      </div>
      <ul id="task-list" class="space-y-2 mb-4">
        <!-- Tasks will be added here -->
      </ul>
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span id="task-count">0 items left</span>
        <button id="clear-completed" class="hover:text-red-500">Clear completed</button>
      </div>
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

**style.css**

```css
.filter-btn {
  border-bottom: 2px solid transparent;
}
.filter-btn.active {
  border-bottom: 2px solid blue;
  font-weight: bold;
}
.task-item {
  transition: all 0.3s ease;
}
.task-item.completed {
  text-decoration: line-through;
  opacity: 0.6;
}
```

**script.js**

```javascript
class ToDoApp {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    this.currentFilter = 'all';
    this.init();
  }
  init() {
    this.bindEvents();
    this.renderTasks();
    this.updateTaskCount();
  }
  bindEvents() {
    // Add task event
    document.getElementById('add-task').addEventListener('click', () => this.addTask());
    document.getElementById('task-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });
    // Filter events
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.updateFilterButtons();
        this.renderTasks();
      });
    });
    // Clear completed event
    document
      .getElementById('clear-completed')
      .addEventListener('click', () => this.clearCompleted());
  }
  addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (text) {
      this.tasks.push({ id: Date.now(), text, completed: false });
      this.save();
      this.renderTasks();
      this.updateTaskCount();
      input.value = '';
    }
  }
  toggleTask(id) {
    this.tasks = this.tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    this.save();
    this.renderTasks();
    this.updateTaskCount();
  }
  deleteTask(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
    this.save();
    this.renderTasks();
    this.updateTaskCount();
  }
  editTask(id, newText) {
    this.tasks = this.tasks.map((task) => (task.id === id ? { ...task, text: newText } : task));
    this.save();
    this.renderTasks();
  }
  clearCompleted() {
    this.tasks = this.tasks.filter((task) => !task.completed);
    this.save();
    this.renderTasks();
    this.updateTaskCount();
  }
  save() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }
  renderTasks() {
    const taskList = document.getElementById('task-list');
    const filteredTasks = this.getFilteredTasks();
    taskList.innerHTML = '';
    filteredTasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''} flex items-center p-2 border border-gray-200 rounded-md`;
      li.innerHTML = `
  <input type="checkbox" class="task-checkbox mr-3" ${task.completed ? 'checked' : ''} data-id="${task.id}">
  <span class="task-text flex-1">${task.text}</span>
  <button class="delete-task text-red-500 hover:text-red-700" data-id="${task.id}">×</button>
  `;
      taskList.appendChild(li);
    });
    // Bind events for new tasks
    document.querySelectorAll('.task-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.toggleTask(id);
      });
    });
    document.querySelectorAll('.delete-task').forEach((button) => {
      button.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.deleteTask(id);
      });
    });
    // Add double-click to edit
    document.querySelectorAll('.task-text').forEach((text) => {
      text.addEventListener('dblclick', (e) => {
        const li = e.target.closest('.task-item');
        const id = parseInt(li.querySelector('.task-checkbox').dataset.id);
        const currentText = e.target.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className =
          'w-full border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500';
        e.target.replaceWith(input);
        input.focus();
        input.addEventListener('blur', () => {
          const newText = input.value.trim();
          if (newText) {
            this.editTask(id, newText);
          }
        });
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const newText = input.value.trim();
            if (newText) {
              this.editTask(id, newText);
            }
          }
        });
      });
    });
  }
  getFilteredTasks() {
    switch (this.currentFilter) {
      case 'active':
        return this.tasks.filter((task) => !task.completed);
      case 'completed':
        return this.tasks.filter((task) => task.completed);
      default:
        return this.tasks;
    }
  }
  updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.filter === this.currentFilter) {
        btn.classList.add('active');
      }
    });
  }
  updateTaskCount() {
    const activeTasks = this.tasks.filter((task) => !task.completed).length;
    document.getElementById('task-count').textContent =
      `${activeTasks} item${activeTasks !== 1 ? 's' : ''} left`;
  }
}
// Initialize the app
new ToDoApp();
```

### 1.2 天气应用

#### 1.2.1 功能需求

- 显示当前天气
- 5天天气预报
- 搜索城市
- 响应式设计

#### 1.2.2 技术栈

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- OpenWeather API

#### 1.2.3 项目结构

```
 weather-app/
 ├── index.html
 ├── style.css
 ├── script.js
 └── README.md
```

#### 1.2.4 完整实现

**index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weather App</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">Weather App</h1>
      <div class="max-w-md mx-auto mb-8">
        <div class="flex">
          <input
            type="text"
            id="city-input"
            class="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter city name..."
          />
          <button
            id="search-btn"
            class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
      <div
        id="weather-container"
        class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 hidden"
      >
        <div class="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h2 id="city-name" class="text-2xl font-bold text-gray-800">City Name</h2>
            <p id="date" class="text-gray-600">Date</p>
          </div>
          <div class="flex items-center mt-4 md:mt-0">
            <img id="weather-icon" src="" alt="Weather icon" class="w-16 h-16 mr-4" />
            <div>
              <p id="weather-description" class="text-gray-600 capitalize">Weather Description</p>
              <p id="temperature" class="text-4xl font-bold text-gray-800">0°C</p>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <!-- Forecast items will be added here -->
        </div>
      </div>
      <div
        id="error-message"
        class="max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8 hidden"
      >
        <strong class="font-bold">Error:</strong> <span id="error-text">City not found</span>
      </div>
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

**style.css**

```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}
#weather-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
.forecast-item {
  transition: transform 0.3s ease;
}
.forecast-item:hover {
  transform: translateY(-5px);
}
```

**script.js**

```javascript
class WeatherApp {
  constructor() {
    this.apiKey = 'YOUR_API_KEY'; // Replace with your OpenWeather API key
    this.init();
  }
  init() {
    this.bindEvents();
    // Default city
    this.getWeather('New York');
  }
  bindEvents() {
    document.getElementById('search-btn').addEventListener('click', () => {
      const city = document.getElementById('city-input').value.trim();
      if (city) {
        this.getWeather(city);
      }
    });
    document.getElementById('city-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const city = e.target.value.trim();
        if (city) {
          this.getWeather(city);
        }
      }
    });
  }
  async getWeather(city) {
    try {
      // Get current weather
      const currentWeatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${this.apiKey}`
      );
      if (!currentWeatherResponse.ok) {
        throw new Error('City not found');
      }
      const currentWeather = await currentWeatherResponse.json();
      // Get forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${this.apiKey}`
      );
      const forecast = await forecastResponse.json();
      this.displayWeather(currentWeather, forecast);
      this.hideError();
    } catch (error) {
      this.showError(error.message);
    }
  }
  displayWeather(currentWeather, forecast) {
    // Update current weather
    document.getElementById('city-name').textContent = currentWeather.name;
    document.getElementById('date').textContent = this.formatDate(new Date());
    document.getElementById('weather-description').textContent =
      currentWeather.weather[0].description;
    document.getElementById('temperature').textContent =
      `${Math.round(currentWeather.main.temp)}°C`;
    document.getElementById('weather-icon').src =
      `https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@2x.png`;
    // Update forecast
    const forecastContainer = document.querySelector('.grid');
    forecastContainer.innerHTML = '';
    // Get daily forecast (every 8 hours)
    const dailyForecast = [];
    for (let i = 0; i < forecast.list.length; i += 8) {
      dailyForecast.push(forecast.list[i]);
    }
    dailyForecast.forEach((day) => {
      const forecastItem = document.createElement('div');
      forecastItem.className = 'forecast-item bg-gray-50 rounded-lg p-4 text-center';
      forecastItem.innerHTML = `
  <p class="font-medium text-gray-800">${this.formatDay(new Date(day.dt * 1000))}</p>
  <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="Weather icon" class="w-12 h-12 mx-auto my-2">
  <p class="text-gray-600">${Math.round(day.main.temp)}°C</p>
  `;
      forecastContainer.appendChild(forecastItem);
    });
    // Show weather container
    document.getElementById('weather-container').classList.remove('hidden');
  }
  formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  formatDay(date) {
    const options = { weekday: 'short' };
    return date.toLocaleDateString('en-US', options);
  }
  showError(message) {
    document.getElementById('error-text').textContent = message;
    document.getElementById('error-message').classList.remove('hidden');
    document.getElementById('weather-container').classList.add('hidden');
  }
  hideError() {
    document.getElementById('error-message').classList.add('hidden');
  }
}
// Initialize the app
new WeatherApp();
```

### 1.3 电商购物车

#### 1.3.1 功能需求

- 产品列表
- 添加到购物车
- 购物车管理
- 结算功能

#### 1.3.2 技术栈

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- LocalStorage

#### 1.3.3 项目结构

```
 shopping-cart/
 ├── index.html
 ├── style.css
 ├── script.js
 └── README.md
```

#### 1.3.4 完整实现

**index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shopping Cart</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body class="bg-gray-100 min-h-screen">
    <header class="bg-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">Shopping Cart</h1>
        <div class="relative">
          <button
            id="cart-btn"
            class="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              ></path>
            </svg>
            Cart
            <span
              id="cart-count"
              class="ml-2 bg-white text-blue-500 rounded-full w-6 h-6 flex items-center justify-center"
              >0</span
            >
          </button>
          <div
            id="cart-dropdown"
            class="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-md p-4 hidden"
          >
            <h3 class="font-bold text-gray-800 mb-4">Your Cart</h3>
            <div id="cart-items" class="space-y-4 mb-4">
              <!-- Cart items will be added here -->
            </div>
            <div class="border-t pt-4">
              <div class="flex justify-between font-bold mb-4">
                <span>Total:</span>
                <span id="cart-total">$0.00</span>
              </div>
              <button
                id="checkout-btn"
                class="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="container mx-auto px-4 py-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Products</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Products will be added here -->
      </div>
    </main>
    <script src="script.js"></script>
  </body>
</html>
```

**style.css**

```css
.product-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
#cart-dropdown {
  z-index: 1000;
}
```

**script.js**

```javascript
class ShoppingCart {
  constructor() {
    this.products = [
      { id: 1, name: 'Product 1', price: 19.99, image: 'https://via.placeholder.com/300x200' },
      { id: 2, name: 'Product 2', price: 29.99, image: 'https://via.placeholder.com/300x200' },
      { id: 3, name: 'Product 3', price: 39.99, image: 'https://via.placeholder.com/300x200' },
      { id: 4, name: 'Product 4', price: 49.99, image: 'https://via.placeholder.com/300x200' },
      { id: 5, name: 'Product 5', price: 59.99, image: 'https://via.placeholder.com/300x200' },
      { id: 6, name: 'Product 6', price: 69.99, image: 'https://via.placeholder.com/300x200' },
    ];
    this.cart = JSON.parse(localStorage.getItem('cart')) || [];
    this.init();
  }
  init() {
    this.renderProducts();
    this.updateCart();
    this.bindEvents();
  }
  bindEvents() {
    // Cart dropdown toggle
    document.getElementById('cart-btn').addEventListener('click', () => {
      document.getElementById('cart-dropdown').classList.toggle('hidden');
    });
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const cartBtn = document.getElementById('cart-btn');
      const cartDropdown = document.getElementById('cart-dropdown');
      if (!cartBtn.contains(e.target) && !cartDropdown.contains(e.target)) {
        cartDropdown.classList.add('hidden');
      }
    });
    // Checkout button
    document.getElementById('checkout-btn').addEventListener('click', () => {
      alert('Checkout functionality would be implemented here');
    });
  }
  renderProducts() {
    const productsContainer = document.querySelector('.grid');
    productsContainer.innerHTML = '';
    this.products.forEach((product) => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card bg-white rounded-lg shadow-md overflow-hidden';
      productCard.innerHTML = `
  <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
  <div class="p-4">
  <h3 class="font-bold text-gray-800 mb-2">${product.name}</h3>
  <p class="text-blue-600 font-bold mb-4">$${product.price.toFixed(2)}</p>
  <button class="add-to-cart w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" data-id="${product.id}">Add to Cart</button>
  </div>
  `;
      productsContainer.appendChild(productCard);
    });
    // Bind add to cart events
    document.querySelectorAll('.add-to-cart').forEach((button) => {
      button.addEventListener('click', (e) => {
        const productId = parseInt(e.target.dataset.id);
        this.addToCart(productId);
      });
    });
  }
  addToCart(productId) {
    const product = this.products.find((p) => p.id === productId);
    if (product) {
      const existingItem = this.cart.find((item) => item.id === productId);
      if (existingItem) {
        existingItem.quantity++;
      } else {
        this.cart.push({ ...product, quantity: 1 });
      }
      this.saveCart();
      this.updateCart();
      // Show success message
      alert('Product added to cart!');
    }
  }
  removeFromCart(productId) {
    this.cart = this.cart.filter((item) => item.id !== productId);
    this.saveCart();
    this.updateCart();
  }
  updateQuantity(productId, change) {
    const item = this.cart.find((item) => item.id === productId);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        this.saveCart();
        this.updateCart();
      }
    }
  }
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.cart));
  }
  updateCart() {
    // Update cart count
    const cartCount = this.cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').textContent = cartCount;
    // Update cart items
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = '';
    if (this.cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="text-gray-600">Your cart is empty</p>';
    } else {
      this.cart.forEach((item) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'flex items-center justify-between';
        cartItem.innerHTML = `
  <div class="flex items-center">
  <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded">
  <div class="ml-3">
  <h4 class="font-medium text-gray-800">${item.name}</h4>
  <p class="text-gray-600">$${item.price.toFixed(2)}</p>
  </div>
  </div>
  <div class="flex items-center">
  <button class="quantity-btn bg-gray-200 text-gray-800 w-6 h-6 flex items-center justify-center rounded-l-md" data-id="${item.id}" data-change="-1">-</button>
  <span class="bg-gray-100 text-gray-800 w-8 h-6 flex items-center justify-center">${item.quantity}</span>
  <button class="quantity-btn bg-gray-200 text-gray-800 w-6 h-6 flex items-center justify-center rounded-r-md" data-id="${item.id}" data-change="1">+</button>
  <button class="remove-btn ml-2 text-red-500 hover:text-red-700" data-id="${item.id}">×</button>
  </div>
  `;
        cartItemsContainer.appendChild(cartItem);
      });
      // Bind quantity buttons
      document.querySelectorAll('.quantity-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
          const productId = parseInt(e.target.dataset.id);
          const change = parseInt(e.target.dataset.change);
          this.updateQuantity(productId, change);
        });
      });
      // Bind remove buttons
      document.querySelectorAll('.remove-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
          const productId = parseInt(e.target.dataset.id);
          this.removeFromCart(productId);
        });
      });
    }
    // Update cart total
    const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
  }
}
// Initialize the app
new ShoppingCart();
```

## 2. 项目结构与组织

### 2.1 模块化设计

#### 2.1.1 模块划分

- **核心模块**：业务逻辑
- **UI 模块**：界面渲染
- **服务模块**：API 调用
- **工具模块**：通用功能

#### 2.1.2 代码组织

```
 project/
 ├── src/
 │ ├── components/ # UI 组件
 │ ├── services/ # API 服务
 │ ├── utils/ # 工具函数
 │ ├── store/ # 状态管理
 │ ├── styles/ # 样式文件
 │ └── main.js # 入口文件
 ├── public/ # 静态资源
 ├── package.json # 项目配置
 └── README.md # 项目说明
```

### 2.2 依赖管理

#### 2.2.1 package.json 示例

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "My JavaScript project",
  "main": "src/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint src"
  },
  "dependencies": {
    "axios": "^0.27.2",
    "tailwindcss": "^3.1.8"
  },
  "devDependencies": {
    "vite": "^3.1.0",
    "eslint": "^8.23.1",
    "jest": "^28.1.3"
  }
}
```

### 2.3 前端构建工具

#### 2.3.1 Vite

- **快速的开发服务器**
- **优化的构建过程**
- **支持 ES 模块**

#### 2.3.2 Webpack

- **强大的打包能力**
- **丰富的插件生态**
- **适合大型项目**

## 3. 测试

### 3.1 单元测试

#### 3.1.1 Jest 配置

```json
{
  "testEnvironment": "jsdom",
  "transform": {
    "^.+\.js$": "babel-jest"
  }
}
```

#### 3.1.2 测试示例

```javascript
// utils.test.js
const { sum, multiply } = require('./utils');
test('sum adds two numbers', () => {
  expect(sum(1, 2)).toBe(3);
});
test('multiply multiplies two numbers', () => {
  expect(multiply(2, 3)).toBe(6);
});
```

### 3.2 集成测试

#### 3.2.1 Cypress 配置

```json
{
  "baseUrl": "http://localhost:3000",
  "viewportWidth": 1280,
  "viewportHeight": 720
}
```

#### 3.2.2 测试示例

```javascript
// cypress/integration/home.spec.js
describe('Home page', () => {
  it('should load the home page', () => {
    cy.visit('/');
    cy.contains('Welcome to My App');
  });
  it('should display products', () => {
    cy.visit('/');
    cy.get('.product-card').should('have.length.greaterThan', 0);
  });
});
```

## 4. 部署

### 4.1 静态网站部署

#### 4.1.1 GitHub Pages

- **步骤**：

1.  构建项目：`npm run build`
2.  推送 dist 目录到 gh-pages 分支
3.  在 GitHub 仓库设置中启用 Pages

#### 4.1.2 Netlify

- **步骤**：

1.  连接 GitHub 仓库
2.  配置构建命令：`npm run build`
3.  配置发布目录：`dist`
4.  部署

#### 4.1.3 Vercel

- **步骤**：

1.  连接 GitHub 仓库
2.  配置构建命令：`npm run build`
3.  配置发布目录：`dist`
4.  部署

### 4.2 容器化部署

#### 4.2.1 Dockerfile 示例

```dockerfile
 from node:16-alpine
 WORKDIR /app
 COPY package*.json ./
 RUN npm install
 COPY . .
 RUN npm run build
 EXPOSE 3000
 CMD ["npm", "start"]
```

#### 4.2.2 docker-compose.yml 示例

```yaml
version: '3'
services:
  app:
  build: .
  ports:
    - '3000:3000'
  environment:
    - NODE_ENV=production
```

### 4.3 CI/CD 配置

#### 4.3.1 GitHub Actions 示例

```yaml
 name: CI/CD
 on:
  push:
  branches: [ main ]
  pull_request:
  branches: [ main ]
 jobs:
  build:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/checkout@v3
  - name: Setup Node.js
  uses: actions/setup-node@v3
  with:
  node-version: '16'
  - name: Install dependencies
  run: npm install
  - name: Run tests
  run: npm test
  - name: Build
  run: npm run build
  - name: Deploy to GitHub Pages
  if: github.ref == 'refs/heads/main'
  uses: peaceiris/actions-gh-pages@v4
  with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  publish_dir: ./dist
```

## 5. 性能优化

### 5.1 代码优化

#### 5.1.1 代码分割

- **按需加载**：使用动态导入
- **减少初始包大小**：分割 vendor 和 app 代码

#### 5.1.2 懒加载

- **图片懒加载**：使用 `loading="lazy"` 属性
- **组件懒加载**：使用动态导入

#### 5.1.3 缓存策略

- **浏览器缓存**：设置合理的缓存头
- **Service Worker**：离线缓存

### 5.2 网络优化

#### 5.2.1 资源压缩

- **Gzip/Brotli 压缩**
- **代码压缩**
- **图片压缩**

#### 5.2.2 CDN

- **使用内容分发网络**
- **减少网络延迟**

#### 5.2.3 资源提示

- **preload**：预加载关键资源
- **prefetch**：预加载未来可能使用的资源
- **dns-prefetch**：预解析 DNS

## 6. 安全最佳实践

### 6.1 XSS 防护

- **输入验证**：验证用户输入
- **输出编码**：编码输出到页面的内容
- **Content Security Policy**：设置 CSP 头

### 6.2 CSRF 防护

- **CSRF 令牌**：使用 CSRF 令牌
- **SameSite Cookie**：设置 SameSite 属性

### 6.3 数据验证

- **前端验证**：客户端验证
- **后端验证**：服务器端验证
- **使用验证库**：如 Joi、Yup

## 7. 实际应用案例

### 7.1 完整项目示例

#### 7.1.1 项目结构

```
 my-app/
 ├── src/
 │ ├── components/
 │ │ ├── Header.js
 │ │ ├── Footer.js
 │ │ └── ProductCard.js
 │ ├── services/
 │ │ └── api.js
 │ ├── utils/
 │ │ └── helpers.js
 │ ├── styles/
 │ │ └── main.css
 │ └── main.js
 ├── public/
 │ └── index.html
 ├── package.json
 └── README.md
```

#### 7.1.2 核心文件

**src/main.js**

```javascript
import './styles/main.css';
import { initApp } from './app';
initApp();
```

**src/app.js**

```javascript
import { fetchProducts } from './services/api';
import { renderProducts } from './components/ProductCard';
export function initApp() {
  // Initialize the app
  console.log('App initialized');
  // Fetch and render products
  fetchProducts()
    .then((products) => {
      renderProducts(products);
    })
    .catch((error) => {
      console.error('Error fetching products:', error);
    });
}
```

**src/services/api.js**

```javascript
export async function fetchProducts() {
  try {
    const response = await fetch('https://api.example.com/products');
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return mock data for demonstration
    return [
      { id: 1, name: 'Product 1', price: 19.99, image: 'https://via.placeholder.com/300x200' },
      { id: 2, name: 'Product 2', price: 29.99, image: 'https://via.placeholder.com/300x200' },
    ];
  }
}
```

**src/components/ProductCard.js**

```javascript
export function renderProducts(products) {
  const container = document.querySelector('.products-container');
  container.innerHTML = '';
  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
  <img src="${product.image}" alt="${product.name}">
  <h3>${product.name}</h3>
  <p>$${product.price.toFixed(2)}</p>
  <button class="add-to-cart">Add to Cart</button>
  `;
    container.appendChild(card);
  });
}
```

## 8. 常见问题与解决方案

### 8.1 项目构建问题

**问题**：构建失败
**解决方案**：

- 检查依赖是否正确安装
- 检查构建配置
- 查看错误信息并修复
  **问题**：构建产物过大
  **解决方案**：
- 代码分割
- 树摇（Tree Shaking）
- 压缩资源

### 8.2 运行时问题

**问题**：页面加载缓慢
**解决方案**：

- 优化资源加载
- 懒加载
- 缓存策略
  **问题**：JavaScript 错误
  **解决方案**：
- 检查控制台错误
- 使用 try-catch 处理异常
- 调试代码

### 8.3 部署问题

**问题**：部署失败
**解决方案**：

- 检查部署配置
- 查看部署日志
- 确保构建产物正确
  **问题**：网站无法访问
  **解决方案**：
- 检查域名配置
- 检查服务器状态
- 查看网络连接

## 9. 最佳实践

### 9.1 代码规范

- **使用 ESLint**：保持代码风格一致
- **使用 Prettier**：自动格式化代码
- **遵循命名规范**：使用驼峰命名法
- **添加注释**：解释复杂代码

### 9.2 项目管理

- **使用 Git**：版本控制
- **使用 GitHub Issues**：任务管理
- **使用 Pull Requests**：代码审查
- **编写 README**：项目文档

### 9.3 性能优化

- **监控性能**：使用 Chrome DevTools
- **优化渲染**：减少重排和重绘
- **优化网络**：减少请求和响应大小
- **优化 JavaScript**：避免长任务

### 9.4 安全性

- **输入验证**：验证所有用户输入
- **使用 HTTPS**：加密传输
- **保护敏感数据**：避免暴露敏感信息
- **定期更新依赖**：修复安全漏洞

## 10. 延伸阅读

- [MDN Web 开发文档](https://developer.mozilla.org/en-US/docs/Web) <!-- nofollow -->
- [JavaScript.info](https://javascript.info/) <!-- nofollow -->
- [Frontend Masters](https://frontendmasters.com/) <!-- nofollow -->
- [CSS-Tricks](https://css-tricks.com/) <!-- nofollow -->
- [Smashing Magazine](https://www.smashingmagazine.com/) <!-- nofollow -->

## 11. 更新日志

- **2026-04-05**: 初始化项目实战，涵盖简易待办事项应用的设计与核心实现。
- **2026-05-03**: 扩展内容，添加更完整的项目实战案例、项目结构和组织、前端构建工具、测试、部署、性能优化、安全最佳实践等内容。
