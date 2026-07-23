/**
 * Metro 配置 — Expo + React Native Web + Tauri 集成
 *
 * 功能概述：
 * - 支持 Web 平台构建（react-native-web 别名）
 * - 支持 Tauri 桌面端打包（.tauri.[ext] 平台特定文件解析）
 * - 集成 shd-shared 共享层（tokens/styles/utils/astro-components/assets）
 *
 * 设计要点：
 * - Metro 作为统一 bundler，处理 iOS/Android/Web 三个目标
 * - Web 构建产物输出到 dist-web/，供 Tauri 打包消费
 * - 平台特定代码通过 .web.tsx / .tauri.tsx 扩展名区分
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** 默认 Metro 配置 */
const config = getDefaultConfig(__dirname);

/* ============================================================
 * Web 平台支持：react-native-web 别名
 * ============================================================
 * 将 react-native 导入重定向到 react-native-web，
 * 使 RN 组件在 Web 端渲染为等效的 DOM 元素。
 */
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native': 'react-native-web',
};

/* ============================================================
 * 平台扩展名：支持 .tauri.tsx 平台特定文件
 * ============================================================
 * Metro 默认支持 .web/.ios/.android 扩展名，
 * 此处新增 .tauri 扩展名，用于编写 Tauri 桌面端专属代码。
 */
config.resolver.platforms = ['tauri', 'web', 'ios', 'android', 'native'];

/* ============================================================
 * Monorepo 支持：监听 shd-shared 共享层
 * ============================================================
 * 确保 Metro 能正确解析 shd-shared/ 下的共享包，
 * 避免模块解析失败。
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

/* ============================================================
 * Web 输出目录：dist-web/
 * ============================================================
 * Web 构建产物输出到 dist-web/，
 * Tauri 的 tauri.conf.json 中 distDir 指向此目录。
 */
config.transformer = {
  ...config.transformer,
  assetPlugins: [],
};

module.exports = config;
