/**
 * 参考文献类型定义
 *
 * 描述 FANDEX 文档中引用的参考文献条目，遵循 ACM Reference Format。
 * 支持书籍、期刊、会议、技术报告、标准、网站、文档、视频、课程等多种类型。
 */

/** 参考文献类型 */
export type ReferenceType =
  | 'book'
  | 'journal'
  | 'conference'
  | 'technical-report'
  | 'standard'
  | 'website'
  | 'documentation'
  | 'video'
  | 'course';

/** 参考文献条目（遵循 ACM Reference Format） */
export interface Reference {
  /** 类型 */
  type: ReferenceType;
  /** 作者列表（姓, 名 格式） */
  authors: string[];
  /** 出版年份 */
  year: number;
  /** 标题 */
  title: string;
  /** 出版物名称（期刊/会议/出版社） */
  venue: string;
  /** 卷号 */
  volume?: number;
  /** 期号 */
  issue?: number;
  /** 页码 */
  pages?: string;
  /** DOI */
  doi?: string;
  /** URL */
  url?: string;
  /** 访问日期（网站类） */
  accessedDate?: Date;
  /** 版本号（标准类，如 ISO/IEC 14882:2023） */
  version?: string;
}

/** 引用上下文（在文档中的引用位置） */
export interface Citation {
  /** 参考文献条目 */
  reference: Reference;
  /** 引用位置（章节标题） */
  section: string;
  /** 引用文本 */
  context: string;
}
