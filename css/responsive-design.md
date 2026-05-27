# 响应式设计 | Responsive Design
 False
 False> @Version: v3.5.0
 False
 False> @Author: fanquanpp
 False> @Category: CSS Basics
 False> @Description: 响应式设计 | Responsive Design
 False> @Updated: 2026-05-03
 False
 False---
 False
 False## 2. 媒体查询
 False
 False### 基本语法
 False
```css
 True@media (条件) {
 True /* 样式规则 */
 True}
 True```

 False### 常用媒体特性
 False
 False- `width`/`height`：视口宽度/高度
 False- `min-width`/`max-width`：最小/最大视口宽度
 False- `orientation`：设备方向（portrait/landscape）
 False- `device-pixel-ratio`：设备像素比
 False
 False### 断点设置
 False
```css
 True/* 移动设备 */
 True@media (max-width: 767px) {
 True /* 移动设备样式 */
 True}
 True
 True/* 平板设备 */
 True@media (min-width: 768px) and (max-width: 1023px) {
 True /* 平板设备样式 */
 True}
 True
 True/* 桌面设备 */
 True@media (min-width: 1024px) {
 True /* 桌面设备样式 */
 True}
 True```

 False## 3. 弹性布局技术
 False
 False### 弹性网格系统
 False
```css
 True.container {
 True display: flex;
 True flex-wrap: wrap;
 True gap: 20px;
 True}
 True
 True.item {
 True flex: 1 1 300px; /* 增长因子 1, 收缩因子 1, 基础宽度 300px */
 True}
 True```

 False### 网格布局
 False
```css
 True.grid {
 True display: grid;
 True grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
 True gap: 20px;
 True}
 True```

 False## 4. 响应式图像
 False
 False### 自适应图像
 False
```css
 Trueimg {
 True max-width: 100%;
 True height: auto;
 True}
 True```

 False### 图片源集
 False
```html
 True<picture>
 True <source media="(max-width: 768px)" srcset="small-image.jpg">
 True <source media="(min-width: 769px)" srcset="large-image.jpg">
 True <img src="fallback-image.jpg" alt="Description">
 True</picture>
 True```

 False## 5. 响应式排版
 False
 False### 相对字体单位
 False
```css
 True:root {
 True font-size: 16px;
 True}
 True
 True@media (max-width: 768px) {
 True :root {
 True font-size: 14px;
 True }
 True}
 True
 Truebody {
 True font-size: 1rem;
 True}
 True
 Trueh1 {
 True font-size: 2.5rem;
 True}
 True```

 False## 6. 响应式设计最佳实践
 False
 False1. **移动优先**：从移动设备开始设计，然后扩展到更大的屏幕
 False2. **渐进增强**：确保基本功能在所有设备上都能正常工作
 False3. **性能优化**：针对移动设备优化图像和资源加载
 False4. **测试**：在不同设备和浏览器上测试设计
 False5. **简化导航**：在移动设备上使用汉堡菜单等简化导航
 False
 False## 7. 常见问题与解决方案
 False
 False### 问题1：图像在小屏幕上显示过大
 False
 False**解决方案**：使用 `max-width: 100%; height: auto;` 确保图像适应容器
 False
 False### 问题2：导航菜单在小屏幕上拥挤
 False
 False**解决方案**：实现汉堡菜单，在小屏幕上折叠导航
 False
 False### 问题3：表格在小屏幕上溢出
 False
 False**解决方案**：在小屏幕上使表格可水平滚动，或重新设计表格布局
 False
 False## 8. 工具与资源
 False
 False- **响应式设计测试工具**：
 False - [Responsinator](http://www.responsinator.com/)
 False - [BrowserStack](https://www.browserstack.com/)
 False - Chrome DevTools 设备模拟器
 False
 False- **响应式框架**：
 False - [Bootstrap](https://getbootstrap.com/)
 False - [Foundation](https://get.foundation/)
 False - [Tailwind CSS](https://tailwindcss.com/)
 False
 False## 9. 实战示例
 False
 False### 响应式导航栏
 False
```html
 True<nav class="navbar">
 True <div class="logo">Logo</div>
 True <div class="menu-toggle"></div>
 True <ul class="nav-links">
 True <li><a href="#">Home</a></li>
 True <li><a href="#">About</a></li>
 True <li><a href="#">Services</a></li>
 True <li><a href="#">Contact</a></li>
 True </ul>
 True</nav>
 True```

```css
 True.navbar {
 True display: flex;
 True justify-content: space-between;
 True align-items: center;
 True padding: 1rem;
 True background: #333;
 True color: white;
 True}
 True
 True.nav-links {
 True display: flex;
 True list-style: none;
 True gap: 1rem;
 True}
 True
 True.menu-toggle {
 True display: none;
 True cursor: pointer;
 True}
 True
 True@media (max-width: 768px) {
 True .nav-links {
 True position: absolute;
 True top: 70px;
 True left: 0;
 True right: 0;
 True background: #333;
 True flex-direction: column;
 True align-items: center;
 True padding: 1rem;
 True gap: 1rem;
 True display: none;
 True }
 True 
 True .nav-links.active {
 True display: flex;
 True }
 True 
 True .menu-toggle {
 True display: block;
 True }
 True}
 True```

```javascript
 Trueconst menuToggle = document.querySelector('.menu-toggle');
 Trueconst navLinks = document.querySelector('.nav-links');
 True
 TruemenuToggle.addEventListener('click', () => {
 True navLinks.classList.toggle('active');
 True});
 True```

## 延伸阅读

- [[javascript/overview|JavaScript]]
