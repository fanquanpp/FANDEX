<!--
  知识检测组件 (QuizBlock)
  ========================
  功能概述：
  - 支持三种题型：填空题(fill)、选择题(choice)、代码修正题(fix)
  - 提交后显示对错反馈、参考答案和解析
  - 选择题选中即自动提交，填空题和修正题需手动点击提交
  - 修正题无法自动判题，结果为 null（中性状态）

  数据流：
  - 外部通过 quiz prop 传入题目数组
  - 用户输入/选择 → answers/selectedOption(reactive) → submitAnswer() → results(reactive)
  - results 驱动反馈区域显示和题目卡片样式

  事件处理：
  - 填空题：输入框 Enter 键或点击提交按钮 → submitAnswer()
  - 选择题：点击选项 → selectOption() → 自动调用 submitAnswer()
  - 修正题：点击提交按钮 → submitAnswer()

  判题逻辑：
  - 填空题：忽略大小写的精确匹配
  - 选择题：比较选项索引
  - 修正题：无法自动判断，结果为 null

  使用场景：
  - 在文档页面末尾嵌入知识检测，帮助学习者巩固所学内容
  - 配合 Astro 岛屿架构，仅客户端交互
-->
<template>
  <!-- 仅在有题目时渲染整个测验区域 -->
  <div class="quiz-block" v-if="quiz.length > 0">
    <h3 class="quiz-title">知识检测</h3>
    <div class="quiz-list">
      <!-- 遍历题目列表，每题一个卡片，通过 getResultClass 添加对错样式 -->
      <div v-for="(q, i) in quiz" :key="i" class="quiz-item" :class="getResultClass(i)">
        <!-- 题目行：序号圆圈 + 题型标签 + 题目文字 -->
        <div class="quiz-question">
          <span class="quiz-number">{{ i + 1 }}</span>
          <span class="quiz-type-badge">{{ typeLabel(q.type) }}</span>
          {{ q.question }}
        </div>

        <!-- 填空题输入区：文本输入框 + 提交按钮 -->
        <div v-if="q.type === 'fill'" class="quiz-answer-area">
          <!-- 填空题答案输入框：aria-label 动态包含题号，提供可访问名 -->
          <input
            v-model="answers[i]"
            class="quiz-input"
            placeholder="输入答案..."
            :aria-label="`第 ${i + 1} 题填空答案输入`"
            :disabled="submitted[i]"
            @keyup.enter="submitAnswer(i)"
          />
          <!-- 未提交时显示提交按钮 -->
          <button v-if="!submitted[i]" class="quiz-submit-btn" @click="submitAnswer(i)">
            提交
          </button>
        </div>

        <!-- 选择题选项区：每个选项一个按钮，选中即提交 -->
        <div v-if="q.type === 'choice'" class="quiz-options">
          <button
            v-for="(opt, oi) in q.options"
            :key="oi"
            class="quiz-option"
            :class="{
              selected: selectedOption[i] === oi,
              correct: submitted[i] && oi === q.answer,
              wrong: submitted[i] && selectedOption[i] === oi && oi !== q.answer,
            }"
            :disabled="submitted[i]"
            @click="selectOption(i, oi)"
          >
            <!-- 选项字母标识 A/B/C/D，通过 ASCII 码计算 -->
            <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
            {{ opt }}
          </button>
        </div>

        <!-- 代码修正题输入区：展示待修正代码 + 文本域 + 提交按钮 -->
        <div v-if="q.type === 'fix'" class="quiz-answer-area">
          <!-- 待修正的原始代码展示 -->
          <pre v-if="q.code" class="quiz-code">{{ q.code }}</pre>
          <!-- 修正题答案文本域：aria-label 动态包含题号，提供可访问名 -->
          <textarea
            v-model="answers[i]"
            class="quiz-textarea"
            placeholder="输入修正后的代码或说明..."
            :aria-label="`第 ${i + 1} 题代码修正输入`"
            :disabled="submitted[i]"
            rows="2"
          ></textarea>
          <!-- 未提交时显示提交按钮 -->
          <button v-if="!submitted[i]" class="quiz-submit-btn" @click="submitAnswer(i)">
            提交
          </button>
        </div>

        <!-- 提交后的反馈区域：对错标记 + 参考答案 + 解析 + 提示 -->
        <div v-if="submitted[i]" class="quiz-feedback">
          <!-- 对错标记 -->
          <span v-if="results[i] === true" class="feedback-correct">正确</span>
          <span v-else class="feedback-wrong">不正确</span>
          <!-- 填空题显示参考答案 -->
          <span v-if="q.type === 'fill'" class="feedback-answer">参考答案: {{ q.answer }}</span>
          <!-- 修正题显示参考答案 -->
          <span v-if="q.type === 'fix'" class="feedback-answer">参考答案: {{ q.answer }}</span>
          <!-- 解析说明（选择题和修正题可能有） -->
          <span v-if="q.explanation" class="feedback-explanation">{{ q.explanation }}</span>
          <!-- 答错时显示提示 -->
          <span v-if="q.hint && results[i] !== true" class="feedback-hint">提示: {{ q.hint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

// ========== 题目类型定义 ==========

/** 填空题：用户输入文本答案，忽略大小写精确匹配 */
interface FillQ {
  /** 题型标识 */
  type: 'fill';
  /** 题目文字 */
  question: string;
  /** 正确答案 */
  answer: string;
  /** 答错时显示的提示（显式包含 undefined 以匹配 Zod optional 推导类型，适配 exactOptionalPropertyTypes） */
  hint?: string | undefined;
}

/** 选择题：从多个选项中选择一个正确答案 */
interface ChoiceQ {
  /** 题型标识 */
  type: 'choice';
  /** 题目文字 */
  question: string;
  /** 选项列表 */
  options: string[];
  /** 正确答案的选项索引（从0开始） */
  answer: number;
  /** 提交后显示的解析说明（显式包含 undefined 以匹配 Zod optional 推导类型） */
  explanation?: string | undefined;
}

/** 代码修正题：展示有错误的代码，用户输入修正后的代码或说明 */
interface FixQ {
  /** 题型标识 */
  type: 'fix';
  /** 题目文字 */
  question: string;
  /** 待修正的原始代码（显式包含 undefined 以匹配 Zod optional 推导类型） */
  code?: string | undefined;
  /** 参考答案（修正后的代码或说明） */
  answer: string;
  /** 提交后显示的解析说明（显式包含 undefined 以匹配 Zod optional 推导类型） */
  explanation?: string | undefined;
}

/** 题目联合类型：三种题型的联合 */
type QuizItem = FillQ | ChoiceQ | FixQ;

/**
 * 组件属性
 * @prop quiz - 题目数组，支持填空题、选择题、代码修正题三种题型
 */
const props = defineProps<{
  /** 题目数组，每项为填空题、选择题或代码修正题 */
  quiz: QuizItem[];
}>();

// ========== 响应式状态 ==========

/**
 * 用户输入的答案（填空题/修正题共用）
 * 键为题目索引，值为用户输入的文本
 */
const answers = reactive<Record<number, string>>({});

/**
 * 选择题选中的选项索引
 * 键为题目索引，值为选项索引（从0开始）
 */
const selectedOption = reactive<Record<number, number>>({});

/**
 * 是否已提交
 * 键为题目索引，值为 true（已提交）
 * 提交后禁用输入和按钮，防止重复提交
 */
const submitted = reactive<Record<number, boolean>>({});

/**
 * 判题结果
 * 键为题目索引，值为：
 *   - true：答案正确
 *   - false：答案错误
 *   - null：无法自动判断（修正题）
 */
const results = reactive<Record<number, boolean | null>>({});

// ========== 方法 ==========

/**
 * 获取题目类型的中文标签
 * 用于在题目行中显示题型标签
 * @param type - 题型标识（'fill' | 'choice' | 'fix'）
 * @returns 中文标签（'填空' | '选择' | '修正'）
 */
function typeLabel(type: string) {
  const map: Record<string, string> = { fill: '填空', choice: '选择', fix: '修正' };
  return map[type] || type;
}

/**
 * 选择题：选中选项后立即提交
 * 选择题无需手动点击提交按钮，选中即自动判题
 * @param qi - 题目索引
 * @param oi - 选项索引
 */
function selectOption(qi: number, oi: number) {
  selectedOption[qi] = oi;
  submitAnswer(qi);
}

/**
 * 提交答案并判题
 * 根据题型采用不同的判题逻辑：
 *   - 填空题：忽略大小写的精确匹配（trim + toLowerCase）
 *   - 选择题：比较用户选中的选项索引与正确答案索引
 *   - 修正题：无法自动判断，结果设为 null
 * @param qi - 题目索引
 */
function submitAnswer(qi: number) {
  submitted[qi] = true;
  const q = props.quiz[qi];
  if (q.type === 'fill') {
    // 填空题：忽略大小写比较，去除首尾空格
    const userAns = (answers[qi] || '').trim().toLowerCase();
    const correctAns = q.answer.trim().toLowerCase();
    results[qi] = userAns === correctAns;
  } else if (q.type === 'choice') {
    // 选择题：比较选项索引
    results[qi] = selectedOption[qi] === q.answer;
  } else {
    // 修正题：无法自动判断，标记为中性状态
    results[qi] = null;
  }
}

/**
 * 根据判题结果返回对应的 CSS 类名
 * 用于控制题目卡片的边框颜色
 * @param i - 题目索引
 * @returns CSS 类名：'result-correct'（正确）| 'result-wrong'（错误）| 'result-neutral'（中性）| ''（未提交）
 */
function getResultClass(i: number) {
  if (!submitted[i]) return '';
  if (results[i] === true) return 'result-correct';
  if (results[i] === false) return 'result-wrong';
  return 'result-neutral';
}
</script>

<style scoped>
/* 测验区域整体样式：与上方内容分隔 */
.quiz-block {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

/* 标题样式 */
.quiz-title {
  font-family: var(--font-display);
  font-size: 1.1em;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
}

/* 题目列表：垂直排列，间距适中 */
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 单个题目卡片：带边框和背景 */
.quiz-item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card);
}

/* 答对时边框变绿 */
.quiz-item.result-correct {
  border-color: #10b981;
}

/* 答错时边框变红 */
.quiz-item.result-wrong {
  border-color: #ef4444;
}

/* 题目文字：适当行高，便于阅读 */
.quiz-question {
  font-size: 0.92em;
  margin-bottom: var(--spacing-sm);
  line-height: 1.6;
}

/* 题号圆圈：主题色背景，白色文字 */
.quiz-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.75em;
  font-weight: 700;
  margin-right: 6px;
  flex-shrink: 0;
}

/* 题型标签：小号文字，浅色背景 */
.quiz-type-badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--color-bg-hover);
  font-size: 0.75em;
  color: var(--color-text-secondary);
  margin-right: 6px;
}

/* 答案输入区域：水平排列输入框和提交按钮 */
.quiz-answer-area {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  margin-top: var(--spacing-sm);
}

/* 填空输入框：自适应宽度 */
.quiz-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.88em;
  font-family: var(--font-display);
  outline: none;
}

/* 输入框聚焦效果 */
.quiz-input:focus {
  border-color: var(--color-primary);
}

/* 修正题文本域：等宽字体，支持垂直调整大小 */
.quiz-textarea {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.85em;
  font-family: var(--font-mono, monospace);
  outline: none;
  resize: vertical;
}

/* 文本域聚焦效果 */
.quiz-textarea:focus {
  border-color: var(--color-primary);
}

/* 修正题代码展示区：等宽字体，支持横向滚动 */
.quiz-code {
  width: 100%;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  font-size: 0.82em;
  margin-bottom: var(--spacing-xs);
  overflow-x: auto;
}

/* 提交按钮：透明背景，悬停时变为主题色 */
.quiz-submit-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
}

.quiz-submit-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 选择题选项列表：垂直排列 */
.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--spacing-sm);
}

/* 单个选项按钮：左对齐，带边框 */
.quiz-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px 10px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.88em;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

/* 选项悬停效果：边框变为主题色 */
.quiz-option:hover:not(:disabled) {
  border-color: var(--color-primary);
}

/* 选中状态：边框和背景高亮 */
.quiz-option.selected {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}

/* 正确选项高亮：绿色边框和浅绿背景 */
.quiz-option.correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

/* 错误选项高亮：红色边框和浅红背景 */
.quiz-option.wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

/* 选项字母标识：小方框内显示 A/B/C/D */
.option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-border);
  font-size: 0.78em;
  font-weight: 600;
  flex-shrink: 0;
}

/* 反馈区域：水平排列，自动换行 */
.quiz-feedback {
  margin-top: var(--spacing-sm);
  font-size: 0.85em;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: baseline;
}

/* 正确标记：绿色加粗 */
.feedback-correct {
  color: #10b981;
  font-weight: 600;
}

/* 错误标记：红色加粗 */
.feedback-wrong {
  color: #ef4444;
  font-weight: 600;
}

/* 参考答案：辅助色 */
.feedback-answer {
  color: var(--color-text-secondary);
}

/* 解析说明：辅助色 */
.feedback-explanation {
  color: var(--color-text-secondary);
}

/* 提示文字：琥珀色，仅在答错时显示 */
.feedback-hint {
  color: #f59e0b;
}
</style>
