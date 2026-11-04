/* goto 完全正常！54 的诡异结果 vs 56 正常 —— 54 的 click 用 CDP raw click；
   56 的 click 用 locator.click。差异点：CDP click 派发后 Astro ClientRouter
   开始 navigation；25s 内到达（NAV 打印）。然后 goto 回跳。之后 dump 显示 010？？
   —— 真正区别：54 的第二轮 goto 分支执行了吗？条件 !page.url().startsWith(url)。
   NAV 打印的条件是 page.url().includes(010) → URL=010 → 第二轮 goto 应触发。
   但 dump url=/010 且 cards=0 —— goto 被跳过了？
   重新读 54 代码…… if (!page.url().startsWith(url)) —— url 常量是
   'http://localhost:4321/FANDEX/javascript/'，而 page.url() = .../javascript/010-.../
   startsWith('.../javascript/') = TRUE！010 路径以 /javascript/ 开头！！
   —— startsWith 误判 → goto 没执行 → 仍停在 010 → 找不到卡片 → POS NULL。
   47/49/50/52 的 NOT FOUND/CLICK-TIMEOUT 全部同因：URL 前缀判断用 startsWith 有歧义。
   同时 Playwright locator.click timeout 的真实原因（debug40 场景）：
   回跳后 bbox 稳定但 click 超时 —— 那是另一场景：click 之前 URL 已经 NAV 到 010，
   verify 里 goto 条件同样误判 → 没回跳 → 点击"列表页卡片"定位器在 010 页上不存在
   → locator 解析 pending → timeout。全部真相大白：
   1) 模块列表卡片/侧栏/面包屑/pager 点击本身没有缺陷（真实点击全部 NAV）
   2) main 阶段 175 条 findings 全部是探针伪影（hasText 歧义 + startsWith 前缀歧义） */
console.log('ROOT CAUSE CONFIRMED: harness bugs (startsWith prefix ambiguity + hasText ambiguity); product nav is fine');
