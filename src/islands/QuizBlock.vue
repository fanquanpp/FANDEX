<template>
  <div class="quiz-block" v-if="quiz.length > 0">
    <h3 class="quiz-title">知识检测</h3>
    <div class="quiz-list">
      <div v-for="(q, i) in quiz" :key="i" class="quiz-item" :class="getResultClass(i)">
        <div class="quiz-question">
          <span class="quiz-number">{{ i + 1 }}</span>
          <span class="quiz-type-badge">{{ typeLabel(q.type) }}</span>
          {{ q.question }}
        </div>

        <div v-if="q.type === 'fill'" class="quiz-answer-area">
          <input
            v-model="answers[i]"
            class="quiz-input"
            placeholder="输入答案..."
            :disabled="submitted[i]"
            @keyup.enter="submitAnswer(i)"
          />
          <button v-if="!submitted[i]" class="quiz-submit-btn" @click="submitAnswer(i)">
            提交
          </button>
        </div>

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
            <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
            {{ opt }}
          </button>
        </div>

        <div v-if="q.type === 'fix'" class="quiz-answer-area">
          <pre v-if="q.code" class="quiz-code">{{ q.code }}</pre>
          <textarea
            v-model="answers[i]"
            class="quiz-textarea"
            placeholder="输入修正后的代码或说明..."
            :disabled="submitted[i]"
            rows="2"
          ></textarea>
          <button v-if="!submitted[i]" class="quiz-submit-btn" @click="submitAnswer(i)">
            提交
          </button>
        </div>

        <div v-if="submitted[i]" class="quiz-feedback">
          <span v-if="results[i] === true" class="feedback-correct">正确</span>
          <span v-else class="feedback-wrong">不正确</span>
          <span v-if="q.type === 'fill'" class="feedback-answer">参考答案: {{ q.answer }}</span>
          <span v-if="q.type === 'fix'" class="feedback-answer">参考答案: {{ q.answer }}</span>
          <span v-if="q.explanation" class="feedback-explanation">{{ q.explanation }}</span>
          <span v-if="q.hint && results[i] !== true" class="feedback-hint">提示: {{ q.hint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface FillQ {
  type: 'fill';
  question: string;
  answer: string;
  hint?: string;
}
interface ChoiceQ {
  type: 'choice';
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}
interface FixQ {
  type: 'fix';
  question: string;
  code?: string;
  answer: string;
  explanation?: string;
}
type QuizItem = FillQ | ChoiceQ | FixQ;

const props = defineProps<{
  quiz: QuizItem[];
}>();

const answers = reactive<Record<number, string>>({});
const selectedOption = reactive<Record<number, number>>({});
const submitted = reactive<Record<number, boolean>>({});
const results = reactive<Record<number, boolean | null>>({});

function typeLabel(type: string) {
  const map: Record<string, string> = { fill: '填空', choice: '选择', fix: '修正' };
  return map[type] || type;
}

function selectOption(qi: number, oi: number) {
  selectedOption[qi] = oi;
  submitAnswer(qi);
}

function submitAnswer(qi: number) {
  submitted[qi] = true;
  const q = props.quiz[qi];
  if (q.type === 'fill') {
    const userAns = (answers[qi] || '').trim().toLowerCase();
    const correctAns = q.answer.trim().toLowerCase();
    results[qi] = userAns === correctAns;
  } else if (q.type === 'choice') {
    results[qi] = selectedOption[qi] === q.answer;
  } else {
    results[qi] = null;
  }
}

function getResultClass(i: number) {
  if (!submitted[i]) return '';
  if (results[i] === true) return 'result-correct';
  if (results[i] === false) return 'result-wrong';
  return 'result-neutral';
}
</script>

<style scoped>
.quiz-block {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.quiz-title {
  font-family: var(--font-display);
  font-size: 1.1em;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quiz-item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card);
}

.quiz-item.result-correct {
  border-color: #10b981;
}

.quiz-item.result-wrong {
  border-color: #ef4444;
}

.quiz-question {
  font-size: 0.92em;
  margin-bottom: var(--spacing-sm);
  line-height: 1.6;
}

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

.quiz-type-badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--color-bg-hover);
  font-size: 0.75em;
  color: var(--color-text-secondary);
  margin-right: 6px;
}

.quiz-answer-area {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  margin-top: var(--spacing-sm);
}

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

.quiz-input:focus {
  border-color: var(--color-primary);
}

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

.quiz-textarea:focus {
  border-color: var(--color-primary);
}

.quiz-code {
  width: 100%;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  font-size: 0.82em;
  margin-bottom: var(--spacing-xs);
  overflow-x: auto;
}

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

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--spacing-sm);
}

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

.quiz-option:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.quiz-option.selected {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}

.quiz-option.correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.quiz-option.wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

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

.quiz-feedback {
  margin-top: var(--spacing-sm);
  font-size: 0.85em;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: baseline;
}

.feedback-correct {
  color: #10b981;
  font-weight: 600;
}

.feedback-wrong {
  color: #ef4444;
  font-weight: 600;
}

.feedback-answer {
  color: var(--color-text-secondary);
}

.feedback-explanation {
  color: var(--color-text-secondary);
}

.feedback-hint {
  color: #f59e0b;
}
</style>
