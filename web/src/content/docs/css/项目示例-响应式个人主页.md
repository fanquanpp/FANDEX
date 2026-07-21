---
order: 110
tags:
  - css
  - project
difficulty: intermediate
title: 'CSS 项目示例：响应式个人主页'
module: css
category: 'CSS Practice'
description: '综合运用 Flexbox、Grid 与媒体查询的响应式主页。'
related:
  - css/HTML语义化与SEO优化
  - css/响应式图片
prerequisites:
  - css/概述与基本语法
---

| 英雄区   | 全屏背景，打字机效果，向下滚动指示  |
| -------- | ----------------------------------- |
| 关于我   | 双栏布局，技能进度条动画            |
| 项目展示 | Grid 自适应卡片，悬停效果           |
| 技术栈   | 图标网格，悬停放大                  |
| 联系方式 | 表单 + 社交链接                     |
| 页脚     | 简洁信息                            |
| 暗色模式 | CSS 变量切换，偏好持久化            |
| 响应式   | 移动端/平板/桌面三档适配            |
| 滚动动画 | IntersectionObserver 驱动的入场动画 |

## 需求分析

### 设计需求

- 视觉风格：简洁现代，留白充足
- 配色：亮色模式白底深色文字，暗色模式深色底浅色文字
- 字体：系统字体栈，标题加粗
- 动画：流畅但不过度，尊重 prefers-reduced-motion

### 布局需求

- 桌面端（>= 1024px）：多栏布局，侧边导航
- 平板端（768px - 1023px）：双栏布局
- 移动端（< 768px）：单栏布局，汉堡菜单

## 完整代码

### HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Personal Homepage</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <nav class="navbar" id="navbar">
      <div class="navbar__container">
        <a href="#" class="navbar__logo">DevName</a>
        <button class="navbar__toggle" id="navToggle" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
        <ul class="navbar__menu" id="navMenu">
          <li><a href="#about" class="navbar__link">About</a></li>
          <li><a href="#projects" class="navbar__link">Projects</a></li>
          <li><a href="#skills" class="navbar__link">Skills</a></li>
          <li><a href="#contact" class="navbar__link">Contact</a></li>
          <li>
            <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
              <svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
                />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <section class="hero" id="hero">
      <div class="hero__content">
        <p class="hero__greeting">Hello, I'm</p>
        <h1 class="hero__name">Zhang San</h1>
        <p class="hero__title">
          <span class="typewriter" id="typewriter"></span>
          <span class="typewriter__cursor">|</span>
        </p>
        <div class="hero__cta">
          <a href="#projects" class="btn btn--primary">View Projects</a>
          <a href="#contact" class="btn btn--outline">Contact Me</a>
        </div>
      </div>
      <div class="hero__scroll-indicator">
        <span>Scroll Down</span>
        <div class="hero__arrow"></div>
      </div>
    </section>

    <section class="section about" id="about">
      <div class="container">
        <h2 class="section__title">About Me</h2>
        <div class="about__grid">
          <div class="about__photo">
            <div class="about__photo-frame">
              <img src="https://picsum.photos/400/500" alt="Profile photo" loading="lazy" />
            </div>
          </div>
          <div class="about__info">
            <p class="about__bio">
              A passionate full-stack developer with 5 years of experience in building web
              applications. I love creating elegant solutions to complex problems and contributing
              to open source projects.
            </p>
            <div class="about__stats">
              <div class="stat">
                <span class="stat__number">5+</span>
                <span class="stat__label">Years Experience</span>
              </div>
              <div class="stat">
                <span class="stat__number">30+</span>
                <span class="stat__label">Projects</span>
              </div>
              <div class="stat">
                <span class="stat__number">10+</span>
                <span class="stat__label">Open Source</span>
              </div>
            </div>
            <div class="about__skills">
              <div class="skill">
                <div class="skill__header">
                  <span class="skill__name">JavaScript / TypeScript</span>
                  <span class="skill__percent">90%</span>
                </div>
                <div class="skill__bar">
                  <div class="skill__progress" data-width="90"></div>
                </div>
              </div>
              <div class="skill">
                <div class="skill__header">
                  <span class="skill__name">Vue / React</span>
                  <span class="skill__percent">85%</span>
                </div>
                <div class="skill__bar">
                  <div class="skill__progress" data-width="85"></div>
                </div>
              </div>
              <div class="skill">
                <div class="skill__header">
                  <span class="skill__name">Node.js / Python</span>
                  <span class="skill__percent">75%</span>
                </div>
                <div class="skill__bar">
                  <div class="skill__progress" data-width="75"></div>
                </div>
              </div>
              <div class="skill">
                <div class="skill__header">
                  <span class="skill__name">MySQL / MongoDB</span>
                  <span class="skill__percent">70%</span>
                </div>
                <div class="skill__bar">
                  <div class="skill__progress" data-width="70"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section projects" id="projects">
      <div class="container">
        <h2 class="section__title">Projects</h2>
        <div class="projects__grid">
          <article class="project-card">
            <div class="project-card__image">
              <img src="https://picsum.photos/600/400?1" alt="Project 1" loading="lazy" />
              <div class="project-card__overlay">
                <a href="#" class="btn btn--small">Demo</a>
                <a href="#" class="btn btn--small">Code</a>
              </div>
            </div>
            <div class="project-card__body">
              <h3 class="project-card__title">E-Commerce Platform</h3>
              <p class="project-card__desc">Full-stack e-commerce with Vue3, Node.js, and MySQL</p>
              <div class="project-card__tags">
                <span>Vue3</span><span>Node.js</span><span>MySQL</span>
              </div>
            </div>
          </article>
          <article class="project-card">
            <div class="project-card__image">
              <img src="https://picsum.photos/600/400?2" alt="Project 2" loading="lazy" />
              <div class="project-card__overlay">
                <a href="#" class="btn btn--small">Demo</a>
                <a href="#" class="btn btn--small">Code</a>
              </div>
            </div>
            <div class="project-card__body">
              <h3 class="project-card__title">Task Management App</h3>
              <p class="project-card__desc">
                Real-time collaborative task board with drag-and-drop
              </p>
              <div class="project-card__tags">
                <span>React</span><span>TypeScript</span><span>Firebase</span>
              </div>
            </div>
          </article>
          <article class="project-card">
            <div class="project-card__image">
              <img src="https://picsum.photos/600/400?3" alt="Project 3" loading="lazy" />
              <div class="project-card__overlay">
                <a href="#" class="btn btn--small">Demo</a>
                <a href="#" class="btn btn--small">Code</a>
              </div>
            </div>
            <div class="project-card__body">
              <h3 class="project-card__title">Data Dashboard</h3>
              <p class="project-card__desc">
                Interactive analytics dashboard with real-time charts
              </p>
              <div class="project-card__tags">
                <span>D3.js</span><span>Python</span><span>FastAPI</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section skills" id="skills">
      <div class="container">
        <h2 class="section__title">Tech Stack</h2>
        <div class="skills__grid">
          <div class="skill-icon"><span>HTML5</span></div>
          <div class="skill-icon"><span>CSS3</span></div>
          <div class="skill-icon"><span>JavaScript</span></div>
          <div class="skill-icon"><span>TypeScript</span></div>
          <div class="skill-icon"><span>Vue3</span></div>
          <div class="skill-icon"><span>React</span></div>
          <div class="skill-icon"><span>Node.js</span></div>
          <div class="skill-icon"><span>Python</span></div>
          <div class="skill-icon"><span>MySQL</span></div>
          <div class="skill-icon"><span>Docker</span></div>
          <div class="skill-icon"><span>Git</span></div>
          <div class="skill-icon"><span>Linux</span></div>
        </div>
      </div>
    </section>

    <section class="section contact" id="contact">
      <div class="container">
        <h2 class="section__title">Contact</h2>
        <div class="contact__grid">
          <form class="contact__form" id="contactForm">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn btn--primary btn--full">Send Message</button>
          </form>
          <div class="contact__info">
            <div class="contact__item">
              <h3>Email</h3>
              <p>hello@example.com</p>
            </div>
            <div class="contact__item">
              <h3>Location</h3>
              <p>Beijing, China</p>
            </div>
            <div class="contact__social">
              <a href="#" aria-label="GitHub">GitHub</a>
              <a href="#" aria-label="LinkedIn">LinkedIn</a>
              <a href="#" aria-label="Twitter">Twitter</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p>&copy; 2024 DevName. All rights reserved.</p>
      </div>
    </footer>

    <script src="app.js"></script>
  </body>
</html>
```

### CSS 核心样式

```css
:root,
[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-card: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #6c757d;
  --accent: #4361ee;
  --accent-hover: #3a56d4;
  --accent-light: #eef1ff;
  --border: #e0e0e0;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-hover: 0 8px 30px rgba(0, 0, 0, 0.12);
  --navbar-bg: rgba(255, 255, 255, 0.9);
  --skill-bar-bg: #e9ecef;
  --transition: 0.3s ease;
}

[data-theme='dark'] {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --bg-card: #1e1e36;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b8;
  --accent: #7c8cf8;
  --accent-hover: #6b7be8;
  --accent-light: #1e2040;
  --border: #2d2d4a;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-hover: 0 8px 30px rgba(0, 0, 0, 0.4);
  --navbar-bg: rgba(15, 15, 35, 0.9);
  --skill-bar-bg: #2d2d4a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  transition:
    background var(--transition),
    color var(--transition);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--navbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}

.navbar.scrolled {
  border-bottom-color: var(--border);
  box-shadow: var(--shadow);
}

.navbar__container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.navbar__logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

.navbar__menu {
  display: flex;
  align-items: center;
  gap: 32px;
  list-style: none;
}

.navbar__link {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color var(--transition);
  position: relative;
}

.navbar__link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--accent);
  transition: width var(--transition);
}

.navbar__link:hover {
  color: var(--accent);
}
.navbar__link:hover::after {
  width: 100%;
}

.navbar__toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.navbar__toggle span {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--text-primary);
  transition: all var(--transition);
}

/* Hero */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px 40px;
  position: relative;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--accent-light) 100%);
}

.hero__greeting {
  font-size: 1.2rem;
  color: var(--accent);
  font-weight: 500;
  margin-bottom: 8px;
  opacity: 0;
  animation: fadeInUp 0.6s ease 0.2s forwards;
}

.hero__name {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  margin-bottom: 16px;
  opacity: 0;
  animation: fadeInUp 0.6s ease 0.4s forwards;
}

.hero__title {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 32px;
  min-height: 2em;
  opacity: 0;
  animation: fadeInUp 0.6s ease 0.6s forwards;
}

.typewriter__cursor {
  animation: blink 1s step-end infinite;
}

.hero__cta {
  display: flex;
  gap: 16px;
  opacity: 0;
  animation: fadeInUp 0.6s ease 0.8s forwards;
}

.hero__scroll-indicator {
  position: absolute;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  animation: fadeInUp 0.6s ease 1s forwards;
  opacity: 0;
}

.hero__arrow {
  width: 20px;
  height: 20px;
  border-right: 2px solid var(--text-secondary);
  border-bottom: 2px solid var(--text-secondary);
  transform: rotate(45deg);
  animation: bounceDown 1.5s ease infinite;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition);
  border: 2px solid transparent;
}

.btn--primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.btn--primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.btn--outline {
  background: transparent;
  color: var(--accent);
  border-color: var(--accent);
}

.btn--outline:hover {
  background: var(--accent);
  color: #fff;
}

.btn--small {
  padding: 8px 16px;
  font-size: 0.85rem;
}
.btn--full {
  width: 100%;
}

/* Sections */
.section {
  padding: 100px 0;
}

.section__title {
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  position: relative;
}

.section__title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--accent);
  margin: 12px auto 0;
  border-radius: 2px;
}

/* About Grid */
.about__grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 48px;
  align-items: start;
}

.about__photo-frame {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
  position: relative;
}

.about__photo-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid var(--accent);
  border-radius: 16px;
  transform: translate(8px, 8px);
  z-index: -1;
}

.about__photo-frame img {
  width: 100%;
  display: block;
}

.about__stats {
  display: flex;
  gap: 32px;
  margin: 24px 0;
}

.stat {
  text-align: center;
}
.stat__number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent);
}
.stat__label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.skill {
  margin-bottom: 16px;
}
.skill__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.9rem;
}
.skill__bar {
  height: 8px;
  background: var(--skill-bar-bg);
  border-radius: 4px;
  overflow: hidden;
}
.skill__progress {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  border-radius: 4px;
  width: 0;
  transition: width 1s ease;
}

/* Projects Grid */
.projects__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.project-card {
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.project-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-hover);
}

.project-card__image {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3 / 2;
}

.project-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.project-card:hover .project-card__image img {
  transform: scale(1.05);
}

.project-card__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity var(--transition);
}

.project-card:hover .project-card__overlay {
  opacity: 1;
}

.project-card__overlay .btn {
  color: #fff;
  border-color: #fff;
}
.project-card__overlay .btn:hover {
  background: #fff;
  color: #000;
}

.project-card__body {
  padding: 20px;
}
.project-card__title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 8px;
}
.project-card__desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.project-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-card__tags span {
  padding: 2px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* Skills Grid */
.skills__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
}

.skill-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
  cursor: default;
}

.skill-icon:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: var(--shadow-hover);
}

.skill-icon span {
  margin-top: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Contact */
.contact__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color var(--transition);
  outline: none;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--accent);
}

.contact__social {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}
.contact__social a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
.contact__social a:hover {
  text-decoration: underline;
}

/* Footer */
.footer {
  padding: 24px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@keyframes bounceDown {
  0%,
  100% {
    transform: rotate(45deg) translateY(0);
  }
  50% {
    transform: rotate(45deg) translateY(8px);
  }
}

.fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 768px) {
  .navbar__toggle {
    display: flex;
  }
  .navbar__menu {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: var(--navbar-bg);
    backdrop-filter: blur(12px);
    flex-direction: column;
    padding: 24px;
    gap: 16px;
    border-bottom: 1px solid var(--border);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all var(--transition);
  }
  .navbar__menu.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .about__grid {
    grid-template-columns: 1fr;
  }
  .about__photo {
    max-width: 300px;
    margin: 0 auto;
  }
  .contact__grid {
    grid-template-columns: 1fr;
  }
  .hero__cta {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### JavaScript 交互

```javascript
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const themeToggle = document.getElementById('themeToggle');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
});

document.querySelectorAll('.navbar__link').forEach((link) => {
  link.addEventListener('click', () => navMenu.classList.remove('open'));
});

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

initTheme();

const titles = ['Full-Stack Developer', 'Open Source Enthusiast', 'Problem Solver'];
let titleIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typewriter = document.getElementById('typewriter');

function type() {
  const current = titles[titleIndex];
  if (isDeleting) {
    typewriter.textContent = current.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typewriter.textContent = current.substring(0, charIndex + 1);
    charIndex++;
  }

  let delay = isDeleting ? 50 : 100;

  if (!isDeleting && charIndex === current.length) {
    delay = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    titleIndex = (titleIndex + 1) % titles.length;
    delay = 500;
  }

  setTimeout(type, delay);
}

type();

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const progressBars = entry.target.querySelectorAll('.skill__progress');
        progressBars.forEach((bar) => {
          bar.style.width = bar.dataset.width + '%';
        });
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.fade-in, .about, .projects, .skills, .contact').forEach((el) => {
  el.classList.add('fade-in');
  observer.observe(el);
});
```

## 运行说明

直接用浏览器打开 HTML 文件即可。文件结构：

```
homepage/
  index.html
  style.css
  app.js
```

## 扩展方向

1. **粒子背景** -- Canvas 粒子动画
2. **3D 卡片** -- CSS 3D 变换
3. **平滑滚动** -- Locomotive Scroll
4. **国际化** -- 多语言支持
5. **PWA** -- 离线访问
6. **CMS** -- 接入 Headless CMS

---

## 关键代码速查

### CSS 变量主题

```css
:root {
  --accent: #4361ee;
  --bg: #fff;
}
[data-theme='dark'] {
  --accent: #7c8cf8;
  --bg: #0f0f23;
}
```

### Flex 居中

```css
display: flex;
align-items: center;
justify-content: center;
```

### Grid 自适应

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
gap: 24px;
```

### 毛玻璃导航

```css
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(12px);
```

### 悬停上浮

```css
transition:
  transform 0.3s,
  box-shadow 0.3s;
.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
```

### IntersectionObserver 入场

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
```
