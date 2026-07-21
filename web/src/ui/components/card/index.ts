/**
 * Card 组件入口
 *
 * 导出 Card 容器及其 5 个子组件，遵循 shadcn-vue 的组合式 API 设计。
 * 使用示例：
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>标题</CardTitle>
 *       <CardDescription>描述</CardDescription>
 *     </CardHeader>
 *     <CardContent>正文</CardContent>
 *     <CardFooter>底部</CardFooter>
 *   </Card>
 */

export { default as Card } from './Card.vue';
export { default as CardHeader } from './CardHeader.vue';
export { default as CardTitle } from './CardTitle.vue';
export { default as CardDescription } from './CardDescription.vue';
export { default as CardContent } from './CardContent.vue';
export { default as CardFooter } from './CardFooter.vue';
