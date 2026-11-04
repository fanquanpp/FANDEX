/* module 列表页 sidebar link 可正常点。那 sweep [low] 的 timeout 因子：
   sweep 枚举于 load+500ms（reset sw:true），点击于 freshGoto dcl+400ms。
   时点差异。而 debug30 证明 dcl+400 下 first()=doc-list-link 且 NAV。
   但 sweep log [low] 元素 label "01JavaScript..."（无前缀）→ first() 匹配 sidebar
   （sidebar link text 无序号）。debug29 hasText 'BeginnerJS...' count=0 —— 
   现在卡片 text 前缀是 "001入门"（difficulty badge），而 sweep 枚举时 textContent 同样含
   "001入门"？log 中 label "01JavaScript 是什么" 意味着 textContent.slice(0,40) 开头就是 "01"，
   即当时匹配到的其实是 SIDEBAR 链接文本。枚举顺序：sidebar 在 DOM 前部 → doc-list-link 在后。
   同 label "01JavaScript 是什么：你的第一门编程语言"（40字截断）下 sidebar link 全文匹配，
   first() = sidebar link（DOM 更早）。而 sidebar y=143 可见，为什么 click timeout？
   —— sweep 的 [low] log 真正报错是 click timeout + Enter no change。
   但 debug37 直接点同 link NAV 成功。
   差异：sweep 的 locate() first() 会匹配 page.locator('a', {hasText}) 的第一个 a —— 
   注意 header 里 GitHub link text=GitHub 不含。回到 root：也许当时 first() 命中了
   hero-entries 的 "01..."？没有。 
   —— 放弃逐案归因，改为重跑一个修正版验证套件：对每页只测"主内容区唯一目标"（id/href 精确匹配），
   消除 hasText 歧义。 */
console.log('decision: rerun corrected assertion pass with href-precise locators');
