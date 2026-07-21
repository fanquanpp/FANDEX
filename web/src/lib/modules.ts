export const categoryLabels: Record<string, string> = {
  toolchain: '工具链',
  'dev-lang': '开发语言',
  database: '数据库',
  'comp-sci': '计算机科学',
  'eng-infra': '工程与基础设施',
  data: '数据技术',
};

/** 每个分类一种统一颜色 — 高饱和清晰可辨 */
const C = {
  toolchain: '#4f5bd5',
  'dev-lang': '#d63031',
  database: '#00b894',
  'comp-sci': '#8854d0',
  'eng-infra': '#e05a2b',
  data: '#f9a825',
} as const;

export const categoryColors: Record<string, string> = C;

export const modules = [
  // ── 工具链 ──
  {
    id: 'getting-started',
    title: '入门指南',
    icon: '入门',
    description: '零基础环境搭建与学习规划',
    categories: ['toolchain'],
  },
  {
    id: 'markdown',
    title: 'Markdown',
    icon: 'Md',
    description: '文档标记与写作规范',
    categories: ['toolchain'],
  },
  {
    id: 'git',
    title: 'Git',
    icon: 'Git',
    description: '版本控制与分支管理',
    categories: ['toolchain'],
  },
  {
    id: 'github',
    title: 'GitHub',
    icon: 'GH',
    description: '代码协作与CI/CD',
    categories: ['toolchain'],
  },

  // ── 开发语言 ──
  {
    id: 'html5',
    title: 'HTML5',
    icon: 'H5',
    description: 'Web结构与语义',
    categories: ['dev-lang'],
  },
  { id: 'css', title: 'CSS', icon: 'CSS', description: '样式与视觉布局', categories: ['dev-lang'] },
  {
    id: 'svg',
    title: 'SVG',
    icon: 'SVG',
    description: '可缩放矢量图形与可视化',
    categories: ['dev-lang'],
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    icon: 'JS',
    description: '动态类型脚本语言',
    categories: ['dev-lang'],
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    icon: 'TS',
    description: '静态类型JavaScript',
    categories: ['dev-lang'],
  },
  {
    id: 'vue3',
    title: 'Vue 3',
    icon: 'V3',
    description: '响应式前端框架',
    categories: ['dev-lang'],
  },
  {
    id: 'react',
    title: 'React',
    icon: 'Re',
    description: '组件化前端框架',
    categories: ['dev-lang'],
  },
  {
    id: 'c',
    title: 'C',
    icon: 'C',
    description: '底层系统编程',
    categories: ['dev-lang', 'comp-sci'],
  },
  {
    id: 'cpp',
    title: 'C++',
    icon: 'C+',
    description: '高性能与泛型编程',
    categories: ['dev-lang', 'comp-sci'],
  },
  {
    id: 'java',
    title: 'Java',
    icon: 'Ja',
    description: '企业级应用开发',
    categories: ['dev-lang'],
  },
  {
    id: 'kotlin',
    title: 'Kotlin',
    icon: 'Kt',
    description: 'JVM现代编程语言',
    categories: ['dev-lang'],
  },
  {
    id: 'csharp',
    title: 'C#',
    icon: 'C#',
    description: '.NET生态核心语言',
    categories: ['dev-lang'],
  },
  {
    id: 'python',
    title: 'Python',
    icon: 'Py',
    description: '通用编程与自动化',
    categories: ['dev-lang', 'data'],
  },
  {
    id: 'go',
    title: 'Go',
    icon: 'Go',
    description: '云原生系统编程',
    categories: ['dev-lang', 'eng-infra'],
  },
  { id: 'lua', title: 'Lua', icon: 'Lua', description: '嵌入式脚本引擎', categories: ['dev-lang'] },
  {
    id: 'harmonyos',
    title: 'HarmonyOS',
    icon: '鸿蒙',
    description: 'HarmonyOS应用开发',
    categories: ['dev-lang'],
  },

  // ── 数据库 ──
  { id: 'sql', title: 'SQL', icon: 'SQL', description: '结构化查询语言', categories: ['database'] },
  {
    id: 'mysql',
    title: 'MySQL',
    icon: 'My',
    description: '关系型数据存储',
    categories: ['database'],
  },
  {
    id: 'postgresql',
    title: 'PostgreSQL',
    icon: 'PG',
    description: '高级关系型数据库',
    categories: ['database'],
  },
  {
    id: 'redis',
    title: 'Redis',
    icon: 'Rd',
    description: '内存数据库与缓存',
    categories: ['database', 'eng-infra'],
  },

  // ── 计算机科学 ──
  {
    id: 'algorithm',
    title: '算法与数据结构',
    icon: '算法',
    description: '复杂度分析与算法设计',
    categories: ['comp-sci'],
  },
  {
    id: 'cs-fundamentals',
    title: '计算机基础',
    icon: '计概',
    description: '体系结构·操作系统·网络·编译',
    categories: ['comp-sci'],
  },
  {
    id: 'calculus',
    title: '高等数学',
    icon: '高数',
    description: '微积分与数学分析',
    categories: ['comp-sci'],
  },
  {
    id: 'discrete-math',
    title: '离散数学',
    icon: '离散',
    description: '组合·图论·代数系统',
    categories: ['comp-sci'],
  },
  {
    id: 'linear-algebra',
    title: '线性代数',
    icon: '线代',
    description: '矩阵·向量空间·特征值',
    categories: ['comp-sci'],
  },
  {
    id: 'probability-statistics',
    title: '概率论与数理统计',
    icon: '概率',
    description: '概率模型与统计推断',
    categories: ['comp-sci', 'data'],
  },
  {
    id: 'english',
    title: '英语',
    icon: 'En',
    description: '应试英语与专业英语',
    categories: ['comp-sci'],
  },

  // ── 工程与基础设施 ──
  {
    id: 'devops',
    title: '运维',
    icon: '运维',
    description: '运维与SRE实践',
    categories: ['eng-infra'],
  },
  {
    id: 'networking',
    title: 'Networking',
    icon: '网络',
    description: '协议·路由·系统管理',
    categories: ['eng-infra', 'comp-sci'],
  },
  {
    id: 'cybersecurity',
    title: '网络安全',
    icon: '安全',
    description: '攻防·渗透·应急响应',
    categories: ['eng-infra'],
  },
  {
    id: 'cloud-computing',
    title: '云计算',
    icon: '云',
    description: '云架构与容器编排',
    categories: ['eng-infra'],
  },
  {
    id: 'iot',
    title: '物联网',
    icon: '物联',
    description: '嵌入式与边缘计算',
    categories: ['eng-infra'],
  },
  {
    id: 'software-testing',
    title: '软件测试',
    icon: '测试',
    description: '质量保障与测试工程',
    categories: ['eng-infra'],
  },
  {
    id: 'agent',
    title: 'AI Agent',
    icon: 'AI',
    description: '智能体架构与应用',
    categories: ['eng-infra', 'data'],
  },
  {
    id: 'software-engineering',
    title: '软件工程',
    icon: '软工',
    description: '需求·设计·重构·度量',
    categories: ['eng-infra'],
  },
  {
    id: 'software-architecture',
    title: '软件架构',
    icon: '架构',
    description: '架构风格·质量属性·领域驱动',
    categories: ['eng-infra'],
  },
  {
    id: 'engineering-practices',
    title: '工程实践',
    icon: '实践',
    description: 'Code Review·On-Call·事故复盘',
    categories: ['eng-infra'],
  },

  // ── 数据技术 ──
  {
    id: 'data-analysis',
    title: '数据分析',
    icon: '数据',
    description: '统计建模与可视化',
    categories: ['data'],
  },
  {
    id: 'big-data',
    title: '大数据',
    icon: '大数据',
    description: 'HDFS·Spark·Kafka·Flink',
    categories: ['data'],
  },
  {
    id: 'machine-learning',
    title: '机器学习',
    icon: 'ML',
    description: '监督·无监督·强化学习',
    categories: ['data'],
  },
  {
    id: 'deep-learning',
    title: '深度学习',
    icon: 'DL',
    description: 'CNN·RNN·Transformer',
    categories: ['data'],
  },
  {
    id: 'ai-engineering',
    title: 'AI工程',
    icon: 'AIE',
    description: '涵盖数学基础、机器学习与智能体工程',
    categories: ['data'],
  },
  {
    id: 'computer-vision',
    title: '计算机视觉',
    icon: 'CV',
    description: '图像分类·目标检测·图像生成',
    categories: ['data'],
  },
  {
    id: 'nlp',
    title: '自然语言处理',
    icon: 'NLP',
    description: '文本分类·信息抽取·对话系统',
    categories: ['data'],
  },
  {
    id: 'llm',
    title: '大语言模型',
    icon: 'LLM',
    description: 'Tokenizer·训练·微调·RLHF',
    categories: ['data'],
  },
  {
    id: 'generative-ai',
    title: '生成式AI',
    icon: 'Gen',
    description: 'VAE·GAN·Diffusion·视频生成',
    categories: ['data'],
  },
  {
    id: 'multimodal',
    title: '多模态AI',
    icon: 'MM',
    description: '视觉-语言·音频-文本·跨模态',
    categories: ['data'],
  },
  {
    id: 'ai-ethics',
    title: 'AI伦理与安全',
    icon: '伦理',
    description: '对齐·红队测试·双用风险',
    categories: ['data'],
  },
] as const;

export type Module = (typeof modules)[number];

export function getModule(id: string) {
  return modules.find((m) => m.id === id);
}

export function getModulesByCategory(category: string) {
  return modules.filter((m) => (m.categories as readonly string[]).includes(category));
}

/** 获取模块的主分类（第一个分类） */
export function getPrimaryCategory(mod: Module): string {
  return mod.categories[0];
}

/** 从 content collection id 中提取 slug（文件名去除 .md 后缀） */
export function docSlug(id: string): string {
  return (id.split('/').pop() || id).replace(/\.(md|mdx)$/, '');
}

export const categoryOrder = ['toolchain', 'dev-lang', 'database', 'comp-sci', 'eng-infra', 'data'];

export const modulePrerequisites: Record<string, string[]> = {
  github: ['git'],
  html5: ['markdown'],
  css: ['html5'],
  svg: ['html5'],
  javascript: ['html5', 'css'],
  typescript: ['javascript'],
  vue3: ['javascript', 'html5', 'css'],
  react: ['javascript', 'html5', 'css'],
  python: [],
  'data-analysis': ['python'],
  mysql: [],
  sql: [],
  c: [],
  cpp: ['c'],
  csharp: [],
  java: [],
  kotlin: ['java'],
  go: [],
  lua: [],
  algorithm: [],
  'cs-fundamentals': [],
  'discrete-math': [],
  calculus: [],
  agent: ['python'],
  devops: ['git'],
  iot: ['c', 'python'],
  networking: [],
  cybersecurity: ['networking'],
  'cloud-computing': ['devops'],
  postgresql: ['sql'],
  redis: [],
  harmonyos: ['javascript', 'typescript'],
  'software-testing': [],
  git: [],
  markdown: [],
};
