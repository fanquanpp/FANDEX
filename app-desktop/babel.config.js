/**
 * Babel 配置 — Expo / Metro 构建专用
 *
 * 功能概述：
 * - 使用 babel-preset-expo 预设，自动配置 React Native + Web 兼容转换
 * - 仅被 Metro bundler 读取（Vite/Astro 使用自有 Babel 配置，互不干扰）
 *
 * 设计要点：
 * - api.cache(true)：构建期缓存 Babel 转换结果，加速增量构建
 * - babel-preset-expo：内置 JSX、TypeScript、React Native Web、
 *   装饰器、async/await 等全部必要转换插件
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
