---
order: 710
title: JavaScript 毕业项目：个人书签管理器
description: JavaScript 模块出口项目：从需求清单出发做纯前端书签与阅读清单管理器——localStorage 持久化、URL 校验与 favicon、标签筛选、JSON 导入导出、键盘快捷键与 ES Modules 拆分。只给需求、验收断言与提示，不给答案代码。
module: 'javascript'
category: 前端技术
difficulty: advanced
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/380-JavaScriptModular'
  - 'javascript/400-ModuleBundlingAndTreeShaking'
  - 'javascript/430-WebAPIBrowserInterface'
  - 'javascript/110-Regex'
  - 'javascript/480-ErrorBoundaryGlobalErrorCatch'
  - 'javascript/090-ArrayHigherOrderMethod'
prerequisites:
  - 'javascript/410-DOMOperationEvent'
  - 'javascript/700-JavaScriptProjectExampleTodoApp'
  - 'javascript/460-StorageForTheWeb'
---

## 前置知识

- 已完成 [DOM 操作与事件](/javascript/410-DOMOperationEvent)：会 querySelector 与 addEventListener，背得出用户输入只进 textContent 的红线；
- 已完成（至少通读）[项目示例：待办应用](/javascript/700-JavaScriptProjectExampleTodoApp)。**700 篇是「跟着做」的项目示例，完整代码摆在那里逐行读懂；本文是「毕业验收」，只给需求、验收断言与提示，不给任何答案代码。
- [Web 存储 API](/javascript/460-StorageForTheWeb) 可后补：里程碑 1 前先读第 4.1、4.2 节即可，4.5 节跨标签页同步留到做 E1 时再读。

## 背景与目标

700 篇的待办应用给了你增删改查、事件委托、localStorage 存取，但它是照着成品抄的：数据结构别人定好，出错路径没人处理，标题里粘一段恶意 HTML 会怎样没人知道。

本项目要你换一种方式长出这些能力：**从需求清单出发，自己设计数据结构、自己拆文件、自己堵住崩溃的口子**，做一个你自己真的会用的书签与阅读清单管理器。它是 javascript 模块的出口项目（Level 5-6）。

相对 700 篇，学完你新增的能力：

1. 自己设计并演化数据模型；
2. 把不可信输入挡在门外，坏输入给行内提示而不是让页面崩溃；
3. 用 ES Modules 把应用拆成 3 到 5 个各司其职的文件；
4. 处理文件：JSON 导出下载与导入校验；
5. 用键盘快捷键把高频操作变成肌肉记忆。

约束：纯前端、无框架、零依赖或仅用 Vite；业务代码拆成 3 到 5 个 ES Module 文件。预计 1 到 2 天。

## User stories（必做 10 条）

每条都是可检查的断言，逐条勾掉。「行内提示」指页面出现提示文本，不是 alert，也不是控制台报错。

- **J1** 添加与持久化：粘贴一个 URL，填标题、加标签，提交后列表出现这条书签；刷新页面、重开浏览器，它仍在。
- **J2** URL 校验：粘贴「这不是网址」提交，输入框下方出现行内错误提示，页面不崩溃、不进脏数据；改成合法 URL 后提交成功，提示消失。
- **J3** favicon：每条书签自动显示站点图标；拿不到时显示占位（首字母色块或默认图），其余信息不受影响。
- **J4** 渲染安全：给标题填入 `<img src=x onerror=alert(1)>`，添加后页面显示的是这串文字本身，全程没弹出任何 alert。
- **J5** 标签筛选：界面展示所有已用标签；点「前端」，列表只剩带该标签的书签且计数同步；再点一次恢复全量；新标签自动出现在标签栏。
- **J6** 编辑与删除：书签可进编辑态改标题与标签，保存后列表与筛选同步更新；删除一条后刷新，它不再出现。
- **J7** 导出：点「导出」下载一个 .json 文件；内容粘进控制台执行 `JSON.parse` 得到数组，即刚才全部书签。
- **J8** 导入：选上一步导出的 JSON 文件，书签合并进列表（重复规则你定，验收时能说清）；选张图片当导入文件，行内报错，原数据一条不少。
- **J9** 键盘快捷键：不碰鼠标完成一轮操作：快捷键聚焦搜索框，输入回车后列表只剩匹配项，Esc 清空搜索与筛选；快捷键在界面有提示。
- **J10** 模块化：业务代码拆成 3 到 5 个 ES Module 文件（存储、渲染、快捷键等），入口用 `<script type="module">`；Network 面板可见它们分别加载。

## Extra credit（选做 4 条）

- **E1** 跨标签页同步：开两个窗口指向同一页面，A 窗口添加一条书签，B 窗口不刷新也出现它。
- **E2** 撤销删除：删除后 5 秒内出现「撤销」，点击后书签原样回来且位置不变；超过 5 秒真删。
- **E3** 数据体检：启动时检查 localStorage 里的数据，字段缺失或类型不对就补默认值，并在控制台说明。
- **E4** 上线：部署到任一静态托管，公开链接写进 README；无痕窗口能打开且数据可持久化。

## 里程碑拆解（4 步）

### 里程碑 1：数据层——存得住、验得过（对应 J1、J2）

先读：[Web 存储 API](/javascript/460-StorageForTheWeb) 第 4.1、4.2 节（基础 API 与 JSON 序列化）；[DOM 操作与事件](/javascript/410-DOMOperationEvent) 第 2 节最小示例。

方向：先别急着写列表。定下书签对象的字段——第一处「自己决定」。写「读出—改—写回」localStorage 的最小循环；URL 校验先上最简单规则，失败给行内提示。想用 Vite 就此刻起一个（背景见[模块打包与 Tree Shaking](/javascript/400-ModuleBundlingAndTreeShaking)）：

```bash
npx vite
```

完成后应看到：DevTools 的 Application 面板里出现你的键；控制台执行下面这行返回一个数字：

```javascript
JSON.parse(localStorage.getItem('你的键名')).length
```

数据层站住了，后面全是长肉。

### 里程碑 2：列表——渲染得对、点得动（对应 J3、J4、J5、J6）

先读：[DOM 操作与事件](/javascript/410-DOMOperationEvent) 第 5 节（textContent 与 innerHTML）与第 8 节（事件冒泡）；筛选会用到 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的 filter 与 map。

方向：把数据渲染成列表；删除、编辑、筛选全挂在一个监听上（委托）；favicon 用公开图标服务按域名取图，取不到落占位。每写完一个交互，随手用 J4 的恶意标题自测。

完成后应看到：列表随增删改实时更新；点标签只剩匹配项；恶意标题被当纯文本；favicon 缺图有占位。此刻 J3 到 J6 全绿。

### 里程碑 3：文件与键盘（对应 J7、J8、J9）

从这里起只给验收断言，涉及哪些 API 去提示区的文档矩阵查。

- J7：导出的文件在控制台 `JSON.parse` 出数组，条数与内容对得上；
- J8：合法文件合并成功且重复规则可解释；坏文件行内报错，原数据无损；
- J9：全程不碰鼠标完成「聚焦搜索、输入、回车、Esc 清空」，快捷键有界面提示。

完成后应看到：导出再导入一轮，书签一条不多一条不少；断网时照常工作——这一步不该发网络请求。

### 里程碑 4：拆文件与收尾（对应 J10 与 Extra credit）

同样只给验收断言：

- J10：Network 面板里业务代码按 3 到 5 个模块文件分别加载；任一模块改函数名，只有直接依赖它的文件要跟着改；
- 选做按各自断言自验：E1 双窗口、E2 计时撤销、E3 手工塞一条坏数据看启动修复、E4 无痕窗口打开线上链接。

完成后应看到：业务文件各司其职、没有谁超过三百行；README 写清「这是什么、怎么跑、快捷键表」；选做做了几条、自验结果如何，记录在案。

## 提示区

本文不给代码，按功能点查下面的关键词与出处：

| 功能 | 关键词与 API | 对应文档 |
| --- | --- | --- |
| 持久化 | localStorage、JSON.stringify/parse、try/catch | [Web 存储](/javascript/460-StorageForTheWeb) 第 4.1、4.2 节 |
| URL 校验 | new URL() 抛异常、正则 | [正则](/javascript/110-Regex)、[Web 存储](/javascript/460-StorageForTheWeb) |
| favicon | 按域名拼公开图标服务 URL、img 的 error 事件 | [DOM 与事件](/javascript/410-DOMOperationEvent) 第 7 节 |
| 列表与筛选 | 事件委托、filter/map、dataset | [DOM 与事件](/javascript/410-DOMOperationEvent) 第 8 节、[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) |
| 导入导出 | Blob、URL.createObjectURL、FileReader、input 的 files | [Web API 与浏览器接口](/javascript/430-WebAPIBrowserInterface) |
| 键盘快捷键 | keydown、e.key、preventDefault | [DOM 与事件](/javascript/410-DOMOperationEvent) 第 7 节 |
| 模块拆分 | import/export、type="module" | [JavaScript 模块化](/javascript/380-JavaScriptModular) 第 4 节 |
| 坏数据出路 | try/catch、全局错误兜底 | [错误边界与全局错误捕获](/javascript/480-ErrorBoundaryGlobalErrorCatch) |

数据结构建议（字段名自己定，这是一处自由度）：书签至少含唯一 ID、URL、标题、标签、添加时间，清单以数组为根存进 localStorage，导出格式就是存储格式。

常见坑：

- **JSON.parse 不会替你兜底**：localStorage 的数据可能被改坏，导入的文件可能不是 JSON——两处 parse 都要包 try/catch，catch 里给行内提示或回退默认值，别让首次加载白屏；
- **storage 事件只在「别人家」触发**：本页自己的写入不触发它，只发给同源的其他标签页——这正是 E1 的原理（460 篇第 4.5 节）；
- **XSS 的口子通常是自己开的**：用户输入拼进模板字符串塞给 innerHTML 是最危险的写法，J4 专门抓它；凡用户输入一律走 textContent 或 createElement；
- **type="module" 在 file:// 下不工作**：双击打开 HTML 会因 CORS 报错——用 Vite 或静态服务器调试 ES Modules；
- **favicon 是异步的**：图标加载不该挡住书签渲染，失败要有占位，别让一张 404 的图拖垮整行；
- **localStorage 有配额**：超限时 setItem 抛异常。书签数据很难超限，但把 setItem 包进 try/catch 的习惯从这里养成。

## 验收清单

- [ ] J1 添加后刷新、重开浏览器数据仍在
- [ ] J2 非 URL 文本行内报错，不崩溃不进脏数据
- [ ] J3 favicon 正常显示，缺图有占位
- [ ] J4 恶意标题显示为纯文本，无 alert
- [ ] J5 标签筛选与取消、计数同步、新标签自动出现
- [ ] J6 编辑保存与删除均同步到存储
- [ ] J7 导出文件可 JSON.parse，内容完整
- [ ] J8 导入合并成功、坏文件行内报错且原数据无损
- [ ] J9 不碰鼠标完成搜索一轮，快捷键有界面提示
- [ ] J10 业务代码 3 到 5 个模块文件，Network 面板可见
- [ ] E1 双窗口跨标签页同步（选做）
- [ ] E2 删除可撤销且超时不撤（选做）
- [ ] E3 启动自检修复坏数据（选做）
- [ ] E4 线上链接无痕窗口可用（选做）

## 常见弯路

- **先写 UI 再想数据**：列表写完才发现标签没法筛选，回头改数据结构牵一发动全身——数据层最难返工，所以先行；
- **全量 innerHTML 重渲染**：每次增删改重建整个列表，把 XSS 口子、输入焦点、动画状态一起丢掉；
- **导入导出拖到最后**：临做才发现数据混进渲染用临时字段，导出去全是垃圾。导出格式严格等于存储格式，反过来逼你写干净数据层；
- **快捷键裸奔**：在输入框打字也触发全局快捷键——按 n 想新建，字母打进了标题。判断事件目标是不是输入框是必修课；
- **把「能跑」当终点**：完成标志是验收清单逐条可勾。J2、J4、J8 专门盯着崩溃路径——真实用户的输入一定比这更离谱。

## 完成后你能做什么

- 表单草稿、偏好设置、离线缓存——任何「需要记住点什么」的纯前端需求，你都有了完整路径。做完 E4，它就是简历上第一个可点开的链接；进框架模块时你会发现，框架替你做的正是你手写过的渲染同步与状态管理；
- Git 纪律同步跟上：按 [Git 毕业项目](/git/430-GitCapstoneProject) 的标准管理这个仓库，两个毕业项目共用一个作品。
