/**
 * 术语表类型定义
 *
 * 描述 FANDEX 计算机术语表的条目结构，包含术语的中文、英文、词源、定义、关联等信息。
 * 术语表是术语提示工具与术语检索页面的数据基础。
 */

/** 术语条目 */
export interface GlossaryEntry {
  /** 中文术语 */
  term: string;
  /** 英文原词 */
  english: string;
  /** 词源说明 */
  etymology?: string;
  /** 定义 */
  definition: string;
  /** 所属模块 ID */
  module: string;
  /** 相关术语 */
  related?: string[];
  /** 参考来源 */
  references?: string[];
  /** 同义词 */
  synonyms?: string[];
  /** 缩写展开（如果是缩写） */
  acronymFor?: string;
}
