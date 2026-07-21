/**
 * astro:content 模块测试桩
 *
 * 功能说明：
 * astro:content 是 Astro 框架在构建期注入的虚拟模块，仅提供类型声明而非真实运行时
 * 实现。在 Vitest 单元测试环境中，该虚拟模块无法被 Vite 原生解析，会抛出
 * "Failed to resolve import astro:content" 错误。
 *
 * 本文件作为 astro:content 的运行时桩，通过 vitest.config.ts 的 alias 配置映射
 * 到此文件，使依赖 astro:content 的 service 模块可在 Vitest 环境中正常加载。
 *
 * 测试用例若需自定义 getCollection 返回值，应使用 vi.mock('astro:content', ...)
 * 覆盖本桩的默认实现。
 *
 * 默认行为：getCollection 返回空数组，适配 SSR 安全降级路径测试。
 */

/** 默认空集合实现：所有 collection 查询均返回空数组 */
export async function getCollection(_collection: string): Promise<readonly never[]> {
  return [];
}
