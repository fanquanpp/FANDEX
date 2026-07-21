/**
 * UI 组件库总入口
 *
 * 功能概述：
 * 统一导出全部 8 个基础组件，供页面与其他组件按需引用。
 * 通过 barrel 文件隔离内部目录结构，仅暴露公共 API。
 *
 * 使用示例：
 *   import { Button, Card, Badge } from '@/ui/components';
 */

export * from './button';
export * from './card';
export * from './badge';
export * from './tooltip';
export * from './dialog';
export * from './tabs';
export * from './accordion';
export * from './scroll-area';
