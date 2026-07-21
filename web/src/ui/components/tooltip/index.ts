/**
 * Tooltip 组件入口
 *
 * 导出 Tooltip 全套组件，使用示例：
 *   <TooltipProvider>
 *     <Tooltip>
 *       <TooltipTrigger as-child>
 *         <Button>悬停我</Button>
 *       </TooltipTrigger>
 *       <TooltipContent>提示信息</TooltipContent>
 *     </Tooltip>
 *   </TooltipProvider>
 */

export { default as Tooltip } from './Tooltip.vue';
export { default as TooltipTrigger } from './TooltipTrigger.vue';
export { default as TooltipContent } from './TooltipContent.vue';
export { default as TooltipProvider } from './TooltipProvider.vue';
