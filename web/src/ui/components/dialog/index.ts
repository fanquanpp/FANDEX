/**
 * Dialog 组件入口
 *
 * 导出 Dialog 全套组件，使用示例：
 *   <Dialog v-model:open="open">
 *     <DialogTrigger as-child>
 *       <Button>打开</Button>
 *     </DialogTrigger>
 *     <DialogContent>
 *       <DialogTitle>确认</DialogTitle>
 *       <DialogDescription>此操作不可撤销</DialogDescription>
 *     </DialogContent>
 *   </Dialog>
 */

export { default as Dialog } from './Dialog.vue';
export { default as DialogTrigger } from './DialogTrigger.vue';
export { default as DialogContent } from './DialogContent.vue';
export { default as DialogTitle } from './DialogTitle.vue';
export { default as DialogDescription } from './DialogDescription.vue';
export { default as DialogClose } from './DialogClose.vue';
