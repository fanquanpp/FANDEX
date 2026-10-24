/**
 * 律动装饰配置 — 背景单图层（SceneBackdrop）的单一数据源。
 *
 * 让背景组件、文档与未来的岛屿共享同一份「页面轨道号 + 编制变奏」
 * 定义。页面变奏只在此增删，渲染器零改动。
 */

export type GeoBgVariant =
  | 'home'
  | 'docs'
  | 'list'
  | 'learning-path'
  | 'minimal'
  | 'loading'
  | 'error'
  | 'info'
  | 'playground';

export interface GeoDecorItem {
  readonly className: string;
  readonly style?: string;
  readonly content?: string;
  readonly label?: string;
  readonly children?: 'rings' | 'notes';
}

export interface GeoNumInfo {
  readonly num: string;
  readonly label: string;
}

/*
 * 律动装饰系统 — 页面轨道号：主页 00，子功能页依次 01、02……（404 页彩蛋 404）。
 * 编号只按变体给默认值，特殊页用 num prop 覆盖（如算法页共用 learning-path 变体）。
 */
export const NUM_DEFAULTS: Record<GeoBgVariant, GeoNumInfo | null> = {
  home: { num: '00', label: 'FANDEX' },
  docs: { num: '05', label: 'READING' },
  playground: { num: '01', label: 'FRONTEND LAB' },
  list: { num: '02', label: 'SYNTAX NOTES' },
  'learning-path': { num: '03', label: 'LEARNING PATH' },
  error: { num: '404', label: 'PAGE NOT FOUND' },
  info: { num: '06', label: 'NOTICE' },
  minimal: null,
  loading: null,
};

/*
 * 每个页面只讲一个「声音可视化 + 歌姬舞台」母题的强弱变奏：
 *   home          全编制：均衡条 + 三色轨道星系 + 三色音符 + 星尘 + 编号 00
 *   docs / list   轻编制：阅读优先，一两粒星尘
 *   playground    代码变奏：括号、终端、光标
 * 底纹网格与舞台光晕已按 2026-10-25 视觉裁定整体移除，勿再加回。
 */
export const GEO_DECOR_CONFIG: Record<GeoBgVariant, GeoDecorItem[]> = {
  home: [
    { className: 'decor-eq', style: 'bottom:16%;left:9%' },
    { className: 'decor-orbit', style: 'top:9%;right:6%', children: 'rings' },
    { className: 'decor-trio', style: 'top:34%;right:10%' },
    { className: 'decor-note', style: 'top:56%;left:5%' },
    { className: 'decor-note', style: 'top:66%;right:26%;animation-delay:-5s' },
    { className: 'decor-star decor-star--a', style: 'top:18%;left:30%' },
    { className: 'decor-star decor-star--b', style: 'top:70%;left:16%' },
    { className: 'decor-star decor-star--c', style: 'top:12%;left:55%' },
    { className: 'decor-star decor-star--d', style: 'bottom:30%;right:40%' },
    { className: 'decor-num', style: 'left:3%;bottom:4%;font-size:clamp(150px,22vw,280px)' },
  ],
  docs: [
    { className: 'decor-eq', style: 'bottom:9%;right:5%;height:38px' },
    { className: 'decor-star decor-star--b', style: 'top:20%;right:30%' },
  ],
  list: [
    { className: 'decor-orbit', style: 'top:12%;right:9%;width:130px;height:130px', children: 'rings' },
    { className: 'decor-eq', style: 'bottom:11%;left:7%' },
    { className: 'decor-star decor-star--c', style: 'bottom:22%;right:28%' },
  ],
  'learning-path': [
    { className: 'decor-eq', style: 'top:15%;right:6%' },
    { className: 'decor-star decor-star--a', style: 'top:40%;left:8%' },
    { className: 'decor-star decor-star--d', style: 'bottom:18%;right:12%' },
  ],
  minimal: [],
  loading: [
    { className: 'decor-eq', style: 'bottom:14%;left:50%;margin-left:-25px' },
  ],
  error: [
    { className: 'decor-eq', style: 'bottom:12%;left:8%' },
    { className: 'decor-star decor-star--a', style: 'top:24%;right:18%' },
  ],
  info: [
    { className: 'decor-orbit', style: 'top:16%;right:6%', children: 'rings' },
  ],
  playground: [
    { className: 'decor-brackets', style: 'top:12%;left:3%' },
    { className: 'decor-terminal', style: 'bottom:12%;right:4%' },
    { className: 'decor-caret', style: 'bottom:17%;right:13%' },
    { className: 'decor-num', style: 'bottom:4%;left:1.5%;font-size:clamp(90px,12vw,150px)' },
  ],
};
