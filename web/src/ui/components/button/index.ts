/**
 * Button 组件入口
 *
 * 统一导出 Button 组件与 buttonVariants 工具函数，方便外部按需引用。
 * 通过 barrel 文件隔离内部文件结构，仅暴露公共 API。
 */

export { default as Button } from './Button.vue';
export { buttonVariants, type ButtonVariants } from './button-variants';
