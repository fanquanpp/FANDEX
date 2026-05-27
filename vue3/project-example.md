# Vue3 项目示例：个人博客站点

## 项目概述

本项目实现一个基于 Vue3 的个人博客站点，综合运用组合式 API、Vue Router、Pinia 状态管理等核心知识点。支持文章展示、分类筛选、标签搜索、暗色模式等功能。

### 功能清单

| 功能模块 | 描述 |
|---------|------|
| 首页 | 文章列表、精选文章、最新文章 |
| 文章详情 | Markdown 渲染、目录导航、阅读进度 |
| 分类页面 | 按分类筛选文章 |
| 标签页面 | 标签云、按标签筛选 |
| 搜索功能 | 全文搜索文章标题和内容 |
| 暗色模式 | 主题切换，偏好持久化 |
| 响应式布局 | 适配桌面端和移动端 |
| 关于页面 | 个人信息展示 |

## 需求分析

### 数据需求

- 文章：ID、标题、摘要、内容（Markdown）、分类、标签、发布日期、阅读量
- 分类：ID、名称、描述、文章数量
- 标签：ID、名称、文章数量
- 作者：名称、头像、简介、社交链接

### 功能需求

- SPA 路由切换，支持浏览器前进后退
- 文章列表分页加载
- 阅读进度条
- 回到顶部按钮
- 代码块语法高亮

### 非功能需求

- 首屏加载 < 2s
- SEO 友好（考虑 SSR）
- 无障碍支持

## 技术选型

| 技术点 | 选型 | 理由 |
|-------|------|------|
| 框架 | Vue3 + Vite | 快速开发，HMR 体验好 |
| API 风格 | 组合式 API | 逻辑复用，TypeScript 友好 |
| 路由 | Vue Router 4 | 官方路由方案 |
| 状态管理 | Pinia | 轻量、类型安全、DevTools 支持 |
| 样式 | SCSS + CSS 变量 | 主题切换 + 样式组织 |
| Markdown | markdown-it + highlight.js | 渲染 + 代码高亮 |

## 完整代码

### 项目结构

```
blog/
  src/
    api/
      articles.ts
    assets/
      styles/
        variables.scss
        global.scss
    components/
      AppHeader.vue
      AppFooter.vue
      ArticleCard.vue
      TagCloud.vue
      ReadingProgress.vue
      ThemeToggle.vue
    composables/
      useTheme.ts
      useReadingProgress.ts
    layouts/
      DefaultLayout.vue
    router/
      index.ts
    stores/
      articles.ts
      theme.ts
    views/
      HomeView.vue
      ArticleView.vue
      CategoryView.vue
      TagView.vue
      AboutView.vue
    App.vue
    main.ts
```

### 主题 Composable

```typescript
// src/composables/useTheme.ts
import { ref, watchEffect } from "vue";

type Theme = "light" | "dark";

const STORAGE_KEY = "blog-theme";

const theme = ref<Theme>(
  (localStorage.getItem(STORAGE_KEY) as Theme) || "light"
);

export function useTheme() {
  function toggle() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }

  watchEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.value);
    localStorage.setItem(STORAGE_KEY, theme.value);
  });

  return { theme, toggle };
}
```

### 阅读进度 Composable

```typescript
// src/composables/useReadingProgress.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useReadingProgress() {
  const progress = ref(0);

  function update() {
    const el = document.documentElement;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    progress.value = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  }

  onMounted(() => window.addEventListener("scroll", update, { passive: true }));
  onUnmounted(() => window.removeEventListener("scroll", update));

  return { progress };
}
```

### Pinia Store

```typescript
// src/stores/articles.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Article, Category, Tag } from "@/api/articles";
import { fetchArticles, fetchArticleBySlug } from "@/api/articles";

export const useArticleStore = defineStore("articles", () => {
  const articles = ref<Article[]>([]);
  const currentArticle = ref<Article | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const categories = computed<Category[]>(() => {
    const map = new Map<string, Category>();
    articles.value.forEach((article) => {
      const cat = article.category;
      if (!map.has(cat.slug)) {
        map.set(cat.slug, { ...cat, count: 1 });
      } else {
        map.get(cat.slug)!.count++;
      }
    });
    return Array.from(map.values());
  });

  const tags = computed<Tag[]>(() => {
    const map = new Map<string, Tag>();
    articles.value.forEach((article) => {
      article.tags.forEach((tag) => {
        if (!map.has(tag.slug)) {
          map.set(tag.slug, { ...tag, count: 1 });
        } else {
          map.get(tag.slug)!.count++;
        }
      });
    });
    return Array.from(map.values());
  });

  const featuredArticles = computed(() =>
    articles.value.filter((a) => a.featured).slice(0, 3)
  );

  const latestArticles = computed(() =>
    [...articles.value]
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 10)
  );

  function getArticlesByCategory(slug: string): Article[] {
    return articles.value.filter((a) => a.category.slug === slug);
  }

  function getArticlesByTag(slug: string): Article[] {
    return articles.value.filter((a) =>
      a.tags.some((t) => t.slug === slug)
    );
  }

  function searchArticles(query: string): Article[] {
    const q = query.toLowerCase();
    return articles.value.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }

  async function loadArticles() {
    loading.value = true;
    error.value = null;
    try {
      articles.value = await fetchArticles();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load articles";
    } finally {
      loading.value = false;
    }
  }

  async function loadArticle(slug: string) {
    loading.value = true;
    error.value = null;
    try {
      currentArticle.value = await fetchArticleBySlug(slug);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load article";
    } finally {
      loading.value = false;
    }
  }

  return {
    articles,
    currentArticle,
    loading,
    error,
    categories,
    tags,
    featuredArticles,
    latestArticles,
    getArticlesByCategory,
    getArticlesByTag,
    searchArticles,
    loadArticles,
    loadArticle,
  };
});
```

### 路由配置

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "home",
          component: () => import("@/views/HomeView.vue"),
        },
        {
          path: "article/:slug",
          name: "article",
          component: () => import("@/views/ArticleView.vue"),
          props: true,
        },
        {
          path: "category/:slug",
          name: "category",
          component: () => import("@/views/CategoryView.vue"),
          props: true,
        },
        {
          path: "tag/:slug",
          name: "tag",
          component: () => import("@/views/TagView.vue"),
          props: true,
        },
        {
          path: "about",
          name: "about",
          component: () => import("@/views/AboutView.vue"),
        },
      ],
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

export default router;
```

### 组件示例：ArticleCard

```vue
<!-- src/components/ArticleCard.vue -->
<template>
  <article class="article-card" @click="navigate">
    <div class="article-card__meta">
      <span class="article-card__category">{{ article.category.name }}</span>
      <time class="article-card__date">{{ formattedDate }}</time>
    </div>
    <h3 class="article-card__title">{{ article.title }}</h3>
    <p class="article-card__summary">{{ article.summary }}</p>
    <div class="article-card__tags">
      <span v-for="tag in article.tags" :key="tag.slug" class="article-card__tag">
        #{{ tag.name }}
      </span>
    </div>
    <div class="article-card__footer">
      <span class="article-card__views">{{ article.views }} views</span>
      <span class="article-card__read-more">Read more &rarr;</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { Article } from "@/api/articles";

const props = defineProps<{ article: Article }>();
const router = useRouter();

const formattedDate = computed(() =>
  new Date(props.article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
);

function navigate() {
  router.push({ name: "article", params: { slug: props.article.slug } });
}
</script>

<style scoped lang="scss">
.article-card {
  padding: 24px;
  background: var(--card-bg);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 0.85rem;
  }

  &__category {
    color: var(--accent);
    font-weight: 600;
  }

  &__date {
    color: var(--text-secondary);
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  &__summary {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__tag {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  &__views {
    color: var(--text-secondary);
  }

  &__read-more {
    color: var(--accent);
    font-weight: 500;
  }
}
</style>
```

### 组件示例：ThemeToggle

```vue
<!-- src/components/ThemeToggle.vue -->
<template>
  <button class="theme-toggle" @click="toggle" :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`">
    <svg v-if="theme === 'light'" viewBox="0 0 24 24" width="20" height="20">
      <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
    </svg>
    <svg v-else viewBox="0 0 24 24" width="20" height="20">
      <path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";
const { theme, toggle } = useTheme();
</script>

<style scoped>
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: background 0.2s;
}
.theme-toggle:hover {
  background: var(--hover-bg);
}
</style>
```

### 视图示例：HomeView

```vue
<!-- src/views/HomeView.vue -->
<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero__title">My Blog</h1>
      <p class="hero__subtitle">Thoughts on code, design, and life</p>
    </section>

    <section v-if="store.featuredArticles.length" class="featured">
      <h2 class="section-title">Featured</h2>
      <div class="featured__grid">
        <ArticleCard
          v-for="article in store.featuredArticles"
          :key="article.id"
          :article="article"
        />
      </div>
    </section>

    <section class="latest">
      <h2 class="section-title">Latest Posts</h2>
      <div class="latest__list">
        <ArticleCard
          v-for="article in paginatedArticles"
          :key="article.id"
          :article="article"
        />
      </div>
      <button
        v-if="hasMore"
        class="load-more-btn"
        @click="loadMore"
      >
        Load More
      </button>
    </section>

    <aside class="sidebar">
      <TagCloud :tags="store.tags" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useArticleStore } from "@/stores/articles";
import ArticleCard from "@/components/ArticleCard.vue";
import TagCloud from "@/components/TagCloud.vue";

const store = useArticleStore();
const pageSize = 6;
const currentPage = ref(1);

const paginatedArticles = computed(() =>
  store.latestArticles.slice(0, currentPage.value * pageSize)
);

const hasMore = computed(
  () => currentPage.value * pageSize < store.latestArticles.length
);

function loadMore() {
  currentPage.value++;
}

onMounted(() => {
  if (store.articles.length === 0) {
    store.loadArticles();
  }
});
</script>

<style scoped lang="scss">
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero {
  text-align: center;
  padding: 80px 0 40px;

  &__title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 12px;
  }

  &__subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
  }
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--accent);
  display: inline-block;
}

.featured__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.latest__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.load-more-btn {
  display: block;
  margin: 0 auto;
  padding: 12px 32px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
}
</style>
```

### 主入口

```typescript
// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./assets/styles/global.scss";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
```

## 运行说明

### 创建项目

```bash
npm create vite@latest blog -- --template vue-ts
cd blog
npm install
npm install vue-router@4 pinia sass markdown-it highlight.js
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 扩展方向

1. **SSR/SSG** -- 使用 Nuxt3 实现服务端渲染或静态生成
2. **评论系统** -- 集成 Giscus/Disqus 评论
3. **RSS 订阅** -- 生成 RSS/Atom feed
4. **国际化** -- 使用 vue-i18n 支持多语言
5. **CMS 集成** -- 接入 Headless CMS（Strapi/Contentful）
6. **全文搜索** -- 集成 Algolia 或 FlexSearch
7. **PWA** -- 离线访问和推送通知

---

## 关键代码速查

### 组合式 API

```typescript
import { ref, computed, onMounted, watchEffect } from "vue";
const count = ref(0);
const doubled = computed(() => count.value * 2);
onMounted(() => { /* ... */ });
watchEffect(() => { /* 自动追踪依赖 */ });
```

### Pinia Store

```typescript
export const useStore = defineStore("name", () => {
  const state = ref(initialValue);
  const getter = computed(() => state.value);
  function action() { state.value = newValue; }
  return { state, getter, action };
});
```

### Vue Router

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("@/views/Home.vue") },
    { path: "/article/:slug", name: "article", component: () => import("@/views/Article.vue"), props: true },
  ],
});
```

### defineProps / defineEmits

```typescript
const props = defineProps<{ article: Article; limit?: number }>();
const emit = defineEmits<{ (e: "select", id: number): void }>();
```

### CSS 变量主题

```scss
:root, [data-theme="light"] { --bg: #fff; --text: #333; }
[data-theme="dark"] { --bg: #1a1a2e; --text: #e0e0e0; }
```
