<!--
  速查表组件 (CheatSheet)
  ========================
  功能概述：
  - 以分组形式展示代码速查条目，每个分组包含多条代码示例
  - 支持搜索过滤：在描述、代码、使用场景、进阶提示、预期输出、搜索关键词、常见错误等字段中进行模糊匹配
  - 支持分组折叠/展开：可配置是否允许折叠，以及默认折叠的分组
  - 支持代码一键复制：点击复制按钮将代码写入剪贴板，1.5秒后恢复
  - 支持学习指引：可选显示前置知识和推荐学习顺序
  - 代码高亮：优先使用预渲染的高亮代码，无高亮时回退到转义纯文本

  数据流：
  - 外部通过 `数据` prop 传入速查表结构化数据（分组+条目）
  - 搜索词驱动 computed 属性 `过滤后分组`，实时过滤匹配条目
  - 折叠状态和复制状态为组件内部管理，不影响外部

  使用场景：
  - 在文档页面中嵌入交互式代码速查表
  - 配合 Astro 岛屿架构，实现客户端交互
-->
<template>
  <div class="cheatsheet">
    <!-- 学习指引区域：展示前置知识和推荐学习顺序，使用 <details> 原生折叠 -->
    <details v-if="显示学习指引 && 数据.元数据" class="learning-guide" open>
      <summary>学习指引</summary>
      <!-- 前置知识列表：支持 HTML 内容（v-html 渲染） -->
      <div v-if="数据.元数据.前置知识?.length">
        <p class="label">前置知识</p>
        <ul>
          <li v-for="(item, i) in 数据.元数据.前置知识" :key="i" v-html="item"></li>
        </ul>
      </div>
      <!-- 推荐学习顺序：有序列表，纯文本渲染 -->
      <div v-if="数据.元数据.推荐学习顺序?.length">
        <p class="label">推荐学习顺序</p>
        <ol>
          <li v-for="(item, i) in 数据.元数据.推荐学习顺序" :key="i">{{ item }}</li>
        </ol>
      </div>
    </details>

    <!-- 搜索栏：输入搜索词实时过滤条目 -->
    <div class="search-bar">
      <!-- 搜索输入框：通过 aria-label 暴露可访问名，placeholder 不作为可访问名替代 -->
      <input v-model="搜索词" type="text" :placeholder="搜索框占位符" aria-label="搜索速查表条目" />
      <!-- 有搜索词时显示匹配条目总数 -->
      <span v-if="搜索词" class="result-count">{{ 匹配条目总数 }} 条结果</span>
    </div>

    <!-- 分组列表：遍历过滤后的分组 -->
    <div class="groups">
      <div v-for="group in 过滤后分组" :key="group.分组名" class="group">
        <!-- 分组标题：当允许折叠时，点击标题切换折叠状态 -->
        <div
          class="group-header"
          :style="允许分组折叠 ? 'cursor: pointer' : ''"
          @click="允许分组折叠 && toggleGroup(group.分组名)"
        >
          <!-- 折叠指示箭头：折叠时旋转90度 -->
          <span
            v-if="允许分组折叠"
            class="toggle-icon"
            :class="{ collapsed: 折叠分组集合[group.分组名] }"
            >&#9660;</span
          >
          <h3>{{ group.分组名 }}</h3>
          <!-- 分组说明：可选的分组描述文字 -->
          <span v-if="group.分组说明" class="group-desc">{{ group.分组说明 }}</span>
        </div>
        <!-- 分组条目列表：折叠时隐藏（v-show 保留 DOM，避免重复渲染） -->
        <div class="group-items" v-show="!折叠分组集合[group.分组名]">
          <div v-for="(item, idx) in group.条目" :key="idx" class="item">
            <!-- 条目描述：说明该代码片段的用途 -->
            <p class="item-desc">{{ item.描述 }}</p>
            <!-- 代码块：优先使用预渲染的高亮 HTML，否则回退到转义后的纯文本。
                 信任边界：高亮代码由构建时的高亮工具生成，代码源为静态 JSON，
                 非用户输入；fallbackCode 对纯文本代码做 HTML 转义后输出，安全。 -->
            <div class="code-block">
              <div v-html="item.高亮代码 || fallbackCode(item.代码)"></div>
              <!-- 复制按钮：复制后短暂显示"已复制" -->
              <button class="copy-btn" @click="copyCode(item, idx)">
                {{ 复制状态[idx] ? '已复制' : '复制' }}
              </button>
            </div>
            <!-- 预期输出：展示代码运行后的期望结果 -->
            <div v-if="item.预期输出" class="expected-output">
              <span class="label">输出: </span>{{ item.预期输出 }}
            </div>
            <!-- 使用场景：说明该代码适用的实际场景 -->
            <div v-if="item.使用场景" class="scene">
              <span class="label">场景: </span>{{ item.使用场景 }}
            </div>
            <!-- 常见错误列表：展示错误示例和解决方法 -->
            <div v-if="item.常见错误?.length" class="common-errors">
              <p class="label">常见错误</p>
              <ul>
                <li v-for="(err, ei) in item.常见错误" :key="ei">
                  <!-- 有错误示例时显示错误代码和解决方法 -->
                  <span v-if="err.错误示例"
                    >错误: <code>{{ err.错误示例 }}</code></span
                  >
                  <span v-if="err.解决方法"> -- 解决: {{ err.解决方法 }}</span>
                  <!-- 既无错误示例也无解决方法时，直接显示原始文本 -->
                  <span v-if="!err.错误示例 && !err.解决方法">{{ err }}</span>
                </li>
              </ul>
            </div>
            <!-- 进阶提示：提供更深入的使用建议 -->
            <div v-if="item.进阶提示" class="advance-tip">
              <span class="label">进阶: </span>{{ item.进阶提示 }}
            </div>
            <!-- 相关教程链接：跳转到外部教程页面 -->
            <a
              v-if="item.相关教程"
              class="related-link"
              :href="item.相关教程"
              target="_blank"
              rel="noopener"
              >相关教程</a
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索无结果提示：有搜索词但过滤后分组为空时显示 -->
    <div v-if="过滤后分组.length === 0 && 搜索词" class="no-results">未找到匹配的条目</div>
  </div>
</template>

<script setup lang="ts">
/**
 * 速查表组件 (CheatSheet)
 * ========================
 * 展示按分组组织的代码速查条目，支持搜索、折叠、复制等功能。
 *
 * 核心数据流：
 *   props.数据 → 过滤后分组(computed) → 模板渲染
 *   搜索词(ref) ──────↑
 *   折叠分组集合(reactive) → 控制分组显隐
 *   复制状态(reactive) → 控制复制按钮文案
 *
 * 数据结构使用中文字段名，与 Markdown 速查表数据格式对应。
 * 这是因为速查表数据来源于 Markdown 文件的前端解析结果，
 * 字段名与 Markdown 中的中文标题保持一致，便于维护。
 */
import { ref, reactive, computed, onBeforeUnmount } from 'vue';

// ========== 类型定义 ==========

/** 常见错误条目：描述一个代码错误及其解决方法 */
interface CheatSheetError {
  /** 错误的代码示例 */
  错误示例?: string;
  /** 对应的解决方法说明 */
  解决方法?: string;
  /** 允许扩展字段，兼容不同数据来源 */
  [key: string]: unknown;
}

/** 速查条目：一条完整的代码速查信息 */
interface CheatSheetItem {
  /** 条目描述：简要说明代码的用途 */
  描述: string;
  /** 原始代码文本，用于复制功能 */
  代码: string;
  /** 预渲染的语法高亮 HTML，优先于纯文本代码展示 */
  高亮代码?: string;
  /** 代码运行后的预期输出结果 */
  预期输出?: string;
  /** 代码适用的实际使用场景 */
  使用场景?: string;
  /** 常见错误列表：帮助学习者避坑 */
  常见错误?: CheatSheetError[];
  /** 进阶使用提示 */
  进阶提示?: string;
  /** 相关教程的外部链接 */
  相关教程?: string;
  /** 额外搜索关键词：不在可见字段中但需要被搜索匹配的词 */
  搜索关键词?: string[];
  /** 允许扩展字段 */
  [key: string]: unknown;
}

/** 速查分组：一组相关条目的集合 */
interface CheatSheetGroup {
  /** 分组名称，同时作为分组的唯一标识 */
  分组名: string;
  /** 分组说明：对分组内容的补充描述 */
  分组说明?: string;
  /** 分组内的条目列表 */
  条目: CheatSheetItem[];
}

/** 速查表元数据：学习指引信息 */
interface CheatSheetMeta {
  /** 前置知识：学习当前内容前需要掌握的知识点 */
  前置知识?: string[];
  /** 推荐学习顺序：建议的学习路径 */
  推荐学习顺序?: string[];
  /** 允许扩展字段 */
  [key: string]: unknown;
}

/** 速查表完整数据：元数据 + 分组列表 */
interface CheatSheetData {
  /** 学习指引元数据 */
  元数据?: CheatSheetMeta;
  /** 速查条目分组列表 */
  分组?: CheatSheetGroup[];
  /** 允许扩展字段 */
  [key: string]: unknown;
}

// ========== 组件属性 ==========

const props = withDefaults(
  defineProps<{
    /** 速查表结构化数据，包含元数据和分组列表 */
    数据: CheatSheetData;
    /** 模块名称，用于标识当前速查表所属模块 */
    模块名?: string;
    /** 搜索框的占位提示文字 */
    搜索框占位符?: string;
    /** 是否允许分组折叠/展开操作 */
    允许分组折叠?: boolean;
    /** 默认折叠的分组名称列表，这些分组初始状态为折叠 */
    默认折叠分组?: string[];
    /** 是否显示学习指引区域（前置知识、推荐学习顺序） */
    显示学习指引?: boolean;
  }>(),
  {
    模块名: '',
    搜索框占位符: '搜索命令...',
    允许分组折叠: false,
    默认折叠分组: () => [],
    显示学习指引: true,
  }
);

// ========== 响应式状态 ==========

/** 搜索关键词：用户在搜索框中输入的文本，驱动过滤逻辑 */
const 搜索词 = ref('');
/**
 * 折叠分组的集合：键为分组名，值为 true（折叠）
 * 使用 reactive 对象而非 Set，便于模板直接通过键访问
 * 初始值从 props.默认折叠分组 构建
 */
const 折叠分组集合 = reactive<Record<string, boolean>>(
  Object.fromEntries((props.默认折叠分组 || []).map((name) => [name, true]))
);
/**
 * 复制状态：键为条目在当前渲染列表中的索引，值为 true（已复制）
 * 复制后 1.5 秒自动重置为 false，按钮文案从"已复制"恢复为"复制"
 */
const 复制状态 = reactive<Record<number, boolean>>({});

// ========== 方法 ==========

/**
 * 切换分组的折叠/展开状态
 * 折叠时将分组名添加到集合，展开时从集合中删除
 * 使用 delete 而非设为 false，保持集合中只包含折叠的分组
 */
function toggleGroup(groupName: string) {
  if (折叠分组集合[groupName]) {
    delete 折叠分组集合[groupName];
  } else {
    折叠分组集合[groupName] = true;
  }
}

/**
 * 判断条目是否匹配搜索词
 * 搜索范围覆盖：描述、代码、使用场景、进阶提示、预期输出、搜索关键词、常见错误
 * 匹配规则：不区分大小写的包含匹配
 * @param item - 待匹配的速查条目
 * @returns 是否匹配当前搜索词
 */
function matchesSearch(item: CheatSheetItem): boolean {
  if (!搜索词.value) return true;
  const q = 搜索词.value.toLowerCase();
  // 收集所有可搜索的字段
  const fields: string[] = [
    item.描述,
    item.代码,
    item.使用场景,
    item.进阶提示,
    item.预期输出,
    ...(item.搜索关键词 || []),
  ];
  // 将常见错误的错误示例和解决方法也纳入搜索范围
  if (item.常见错误?.length) {
    for (const err of item.常见错误) {
      if (err.错误示例) fields.push(err.错误示例);
      if (err.解决方法) fields.push(err.解决方法);
    }
  }
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

/**
 * 复制代码到剪贴板
 * 使用 Clipboard API 写入代码文本，成功后更新复制状态
 * 1.5 秒后自动重置复制状态，按钮文案恢复为"复制"
 * @param item - 要复制的速查条目（取 item.代码 字段）
 * @param idx - 条目索引，用于定位复制状态
 */
// 复制定时器映射：key 为条目索引，value 为 setTimeout 返回的 timer id
// 用于在组件卸载时统一清理，避免定时器在组件销毁后仍执行导致的状态更新警告
const copyTimers = new Map<number, ReturnType<typeof setTimeout>>();
function copyCode(item: CheatSheetItem, idx: number) {
  navigator.clipboard.writeText(item.代码).then(() => {
    复制状态[idx] = true;
    // 清理同索引的旧定时器，避免连续点击产生多个定时器竞态
    const oldTimer = copyTimers.get(idx);
    if (oldTimer) clearTimeout(oldTimer);
    const timer = setTimeout(() => {
      复制状态[idx] = false;
      copyTimers.delete(idx);
    }, 1500);
    copyTimers.set(idx, timer);
  });
}

// 组件卸载时清理所有未完成的定制定时器，防止 Vue 报 "state update on unmounted component" 警告
onBeforeUnmount(() => {
  copyTimers.forEach((timer) => clearTimeout(timer));
  copyTimers.clear();
});

/**
 * HTML 转义，防止 XSS 攻击
 * 将特殊字符替换为 HTML 实体，确保用户输入或代码内容不会被浏览器解析为 HTML
 * @param str - 需要转义的原始字符串
 * @returns 转义后的安全字符串
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 代码回退渲染：当没有预渲染的高亮代码时使用
 * 将原始代码文本进行 HTML 转义后包裹在 <pre><code> 标签中
 * @param code - 原始代码文本
 * @returns 包含转义代码的 HTML 字符串
 */
function fallbackCode(code: string): string {
  return `<pre><code>${escapeHtml(code)}</code></pre>`;
}

// ========== 计算属性 ==========

/**
 * 根据搜索词过滤后的分组列表
 * 逻辑：
 *   1. 遍历所有分组，对每个分组内的条目进行搜索匹配过滤
 *   2. 过滤掉条目全部不匹配的空分组
 *   3. 保留分组的其他属性（分组名、分组说明等）
 * 依赖：props.数据.分组 + 搜索词
 */
const 过滤后分组 = computed<CheatSheetGroup[]>(() => {
  const groups = props.数据.分组 || [];
  return groups
    .map((group) => ({
      ...group,
      条目: group.条目.filter(matchesSearch),
    }))
    .filter((group) => group.条目.length > 0);
});

/**
 * 匹配搜索的条目总数
 * 用于在搜索栏右侧显示"X 条结果"
 * 通过累加所有过滤后分组中的条目数计算
 */
const 匹配条目总数 = computed(() => {
  return 过滤后分组.value.reduce((sum, group) => sum + group.条目.length, 0);
});
</script>

<style scoped>
/* 重置速查表内 pre/code 的默认样式，避免与全局样式冲突 */
.cheatsheet :deep(pre) {
  margin: 0;
}

/* 代码字体和大小设置 */
.cheatsheet :deep(code) {
  font-family: var(--font-code);
  font-size: 0.85em;
}

/* 分组标题：紧凑布局，加粗显示 */
.cheatsheet .group-header h3 {
  margin: 0;
  font-size: 1em;
  font-weight: 700;
}

/* 分组说明文字：较小字号，辅助色，与标题同行显示 */
.cheatsheet .group-desc {
  font-size: 0.82em;
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-sm);
  font-weight: 400;
}

/* 学习指引区域样式 */
.cheatsheet .learning-guide summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  font-family: var(--font-display);
}

.cheatsheet .learning-guide ul,
.cheatsheet .learning-guide ol {
  padding-left: var(--spacing-lg);
  margin: var(--spacing-xs) 0;
}

.cheatsheet .learning-guide li {
  margin-bottom: 2px;
}

/* 常见错误列表样式 */
.cheatsheet .common-errors ul {
  padding-left: var(--spacing-lg);
  margin: var(--spacing-xs) 0 0;
}

/* 错误示例中的行内代码：等宽字体 + 背景色高亮 */
.cheatsheet .common-errors code {
  font-family: var(--font-code);
  font-size: 0.9em;
  background: var(--color-bg-code);
  padding: 1px 4px;
}
</style>
