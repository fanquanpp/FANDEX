/**
 * ESLint flat config（ESLint 10）
 * -----------------------------------------------------------------------------
 * 作用域与决策：
 * - 目标文件：src 下的 .ts/.tsx（lib 客户端模块与 React islands）+ scripts 管线脚本
 * - .astro 文件不在 lint 范围：模板部分由 astro check（类型与编译期）覆盖，
 *   引入 eslint-plugin-astro 属于后续可选增强
 * - react-hooks 规则是本次引入的核心价值：islands（如 FrontendLab）状态密集，
 *   hooks 依赖数组错误此前只有类型检查兜底
 * - 动效/样式约定由仓库规范与 code review 保障，不属于静态 lint 职责
 * -----------------------------------------------------------------------------
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // 不进入 lint 的目录：构建产物、生成数据、脚手架
  {
    ignores: [
      'dist/**',
      '.astro/**',
      '.lighthouseci/**',
      'reports/**',
      'public/**',
      'src/data/**',
      'src/styles/**',
      'node_modules/**',
    ],
  },
  // 基础推荐集（JS 通用规则）
  js.configs.recommended,
  // TypeScript 语义规则（含 no-unused-vars 的 TS 感知版本）
  ...tseslint.configs.recommended,
  // 浏览器环境全局量 + React Hooks 规则（islands 核心保障）
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 约定：未使用参数/变量以 _ 前缀显式标记意图；rest 解构剔除键为标准 omit 手法
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // Astro 端点（如 rss.xml.js）：构建期在 Node 环境执行
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // 前端运行时模板：模板串末尾的 <\/script> 转义是防御 Astro 内联脚本时提前
  // 闭合标签的有意行为（该模板可能被内联进 HTML），豁免转义检查
  {
    files: ['src/islands/playground/pg-frontend-runtime.ts'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
  // 类型声明文件：env.d.ts 的三斜线引用是 Astro 官方脚手架约定
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  // 管线脚本：Node 环境（content-sync / audit / build-syntax 等零依赖脚本）
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
