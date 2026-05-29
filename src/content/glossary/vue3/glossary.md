---
title: 'Vue3 专有名词查阅表'
module: 'vue3'
category: 'vue3'
description: 'Vue3 专有名词注释查阅表，涵盖组合式API、响应式系统、组件系统等'
author: 'fanquanpp'
updated: '2026-05-29'
---

## 名词列表

### core 核心基础术语

| 术语            | 英文                     | 释义                                             |
| --------------- | ------------------------ | ------------------------------------------------ |
| 应用实例        | App Instance             | Vue3 应用根实例，用 `createApp()` 创建           |
| 应用级错误处理  | App-level Error Handling | 全局捕获组件错误的 `app.config.errorHandler`     |
| 属性透传        | Attribute Inheritance    | 自动传递给子组件根元素的属性                     |
| 组件实例        | Component Instance       | 组件的运行时对象，拥有自己的状态和方法           |
| 深度选择器      | Deep Selector            | `::v-deep`、`:deep()` 等穿透样式作用域的选择器   |
| 依赖注入        | Dependency Injection     | 用 `provide`/`inject` 在组件树中传递数据         |
| 动态组件        | Dynamic Component        | 用 `<component :is="...">` 动态切换组件          |
| 端到端测试      | E2E Testing              | 模拟真实用户行为的完整测试                       |
| 错误边界        | Error Boundary           | 捕获子组件错误的组件                             |
| 事件处理        | Event Handling           | 响应用户交互或系统事件的逻辑                     |
| 暴露            | Expose                   | 用 `defineExpose` 向父组件暴露子组件的属性和方法 |
| 暴露属性        | Exposed                  | 通过模板 ref 访问的子组件属性                    |
| 文件结构        | File Structure           | 项目的目录和文件组织方式                         |
| 过滤            | Filtering                | 筛选列表或数据的操作                             |
| 过滤器          | Filter                   | 已废弃的数据格式化方式                           |
| 固定定位        | Fixed Positioning        | 相对于视口固定定位                               |
| 片段            | Fragment                 | 多个根节点的虚拟组件                             |
| 函数式组件      | Functional Component     | 无状态无实例的轻量组件                           |
| 全局注册        | Global Registration      | 在应用级别注册组件或插件                         |
| 全局状态        | Global State             | 整个应用共享的状态                               |
| 全局样式        | Global Styles            | 应用于所有组件的样式                             |
| 挂载            | Mount                    | 将 Vue 应用实例挂载到 DOM 元素                   |
| 核心样式        | Core Styles              | 组件的基本样式                                   |
| 混合            | Mixin                    | 复用组件逻辑的方式，可包含选项                   |
| 激活            | Activation               | 组件或路由变为活跃状态                           |
| 激活状态        | Active State             | 当前被选中或使用的状态                           |
| 激活链接        | Active Link              | 当前路由对应的链接样式                           |
| 激活路由        | Active Route             | 当前 URL 对应的路由                              |
| 过渡            | Transition               | 元素或组件状态变化时的动画效果                   |
| 过渡效果        | Transition Effect        | 元素进入或离开时的视觉效果                       |
| 动画            | Animation                | 元素或组件的动态视觉效果                         |
| 动画效果        | Animation Effect         | 元素的运动和变形效果                             |
| 动画帧          | Animation Frame          | 动画的单个画面                                   |
| 动画库          | Animation Library        | 提供动画功能的库                                 |
| 激活            | Activation               | 组件或元素变为活跃                               |
| 动态导入        | Dynamic Import           | 按需导入组件或模块                               |
| 动态类          | Dynamic Class            | 根据条件动态添加的 CSS 类                        |
| 动态路由        | Dynamic Route            | 参数化的路由路径                                 |
| 动态样式        | Dynamic Style            | 根据数据动态绑定的样式                           |
| 动态模块        | Dynamic Module           | 条件加载的代码模块                               |
| 副作用          | Side Effect              | 函数对外部状态的影响                             |
| 副作用清理      | Side Effect Cleanup      | 清理组件中的副作用                               |
| 副作用钩子      | Side Effect Hooks        | 处理副作用的生命周期钩子                         |
| 本地状态        | Local State              | 组件内部的状态                                   |
| 本地存储        | Local Storage            | 浏览器本地存储 API                               |
| 锁定            | Locking                  | 防止并发修改的机制                               |
| 逻辑复用        | Logic Reuse              | 在多个组件间共享逻辑                             |
| 模板            | Template                 | 组件的 HTML 模板部分                             |
| 模板编译        | Template Compilation     | 将模板转换为渲染函数                             |
| 模板表达式      | Template Expression      | 模板中使用的 JavaScript 表达式                   |
| 模板语法        | Template Syntax          | Vue 模板的书写规则                               |
| 模块化          | Modularization           | 将代码组织为独立模块                             |
| 模块化设计      | Modular Design           | 模块化的系统设计                                 |
| 命名空间        | Namespace                | 组织和隔离代码的命名空间                         |
| 生命周期钩子    | Lifecycle Hook           | 组件各阶段的回调函数                             |
| 生命周期函数    | Lifecycle Function       | 响应生命周期阶段的函数                           |
| 初始化          | Initialization           | 创建组件实例的初始阶段                           |
| 初始渲染        | Initial Render           | 首次将组件渲染到 DOM                             |
| 初始值          | Initial Value            | 变量的起始值                                     |
| 初始状态        | Initial State            | 应用启动时的状态                                 |
| 树              | Tree                     | 组件的父子层级结构                               |
| 虚拟树          | Virtual Tree             | 组件树的内存表示                                 |
| 组件树          | Component Tree           | 组件间的层级关系图                               |
| 更新            | Update                   | 组件状态的重新渲染                               |
| 状态管理        | State Management         | 管理应用状态的模式和工具                         |
| 状态模式        | State Pattern            | 根据状态改变行为的模式                           |
| 状态机          | State Machine            | 有限状态系统                                     |
| 状态更新        | State Update             | 响应数据变化更新视图                             |
| 样式绑定        | Style Binding            | 将数据绑定到元素的 style 属性                    |
| 样式隔离        | Style Isolation          | 防止样式污染的机制                               |
| 样式模块        | Style Module             | CSS 模块化方案                                   |
| 样式作用域      | Style Scoping            | 限制样式作用范围的机制                           |
| 样式表          | Stylesheet               | CSS 样式文件                                     |
| 同步            | Synchronization          | 保持数据一致性                                   |
| 同构渲染        | Isomorphic Rendering     | 服务端和客户端渲染相同代码                       |
| 响应式依赖      | Reactive Dependency      | 响应式系统追踪的依赖                             |
| 响应式状态      | Reactive State           | 用 `ref` 或 `reactive` 创建的状态                |
| 响应式引用      | Reactive Reference       | 用 `ref` 创建的响应式变量                        |
| 响应式代理      | Reactive Proxy           | Vue3 用 Proxy 实现的响应式对象                   |
| 响应式 API      | Reactive API             | 创建和管理响应式数据的函数                       |
| 响应式原语      | Reactive Primitives      | ref、reactive 等基础响应式类型                   |
| 响应式追踪      | Reactive Tracking        | 依赖收集和变更追踪                               |
| 响应式系统      | Reactivity System        | 自动追踪依赖并更新视图的系统                     |
| 只读响应式      | Readonly Reactive        | 不可修改的响应式对象                             |
| 解包            | Unwrapping               | 自动提取 ref 的值                                |
| 自动解包        | Auto Unwrapping          | 模板中自动提取 ref 值                            |
| 插槽            | Slot                     | 分发内容给子组件的占位符                         |
| 插槽内容        | Slot Content             | 父组件传入插槽的 HTML                            |
| 插槽作用域      | Slot Scope               | 插槽可以访问的数据范围                           |
| 作用域插槽      | Scoped Slot              | 可以访问子组件数据的插槽                         |
| 具名插槽        | Named Slot               | 有名字的内容分发插槽                             |
| 默认插槽        | Default Slot             | 没有名字的插槽                                   |
| 动态插槽        | Dynamic Slot             | 动态决定的插槽名                                 |
| 服务端渲染      | SSR                      | 在服务器生成 HTML 的技术                         |
| 服务端预取      | Server-side Prefetching  | 服务端预加载数据                                 |
| 静态资源        | Static Assets            | 不需要构建处理的资源                             |
| 静态导入        | Static Import            | 编译时确定的导入                                 |
| 静态属性        | Static Property          | 类或组件的固定属性                               |
| 静态路由        | Static Route             | 路径固定的路由                                   |
| 静态定位        | Static Positioning       | 默认的定位方式                                   |
| 静态生成        | Static Generation        | 构建时生成静态 HTML                              |
| 类型支持        | Type Support             | 对 TypeScript 的支持                             |
| TypeScript 支持 | TypeScript Support       | Vue 对 TypeScript 的集成                         |
| 虚拟 DOM        | Virtual DOM              | DOM 的 JavaScript 对象表示                       |
| 虚拟列表        | Virtual List             | 只渲染可视区域的长列表优化                       |
| 虚拟滚动        | Virtual Scrolling        | 按需渲染长列表的技术                             |
| 视图            | View                     | 应用的单个页面或视图                             |
| 视图层          | View Layer               | 负责渲染的层                                     |
| 视图路由        | View Router              | 管理视图切换的路由器                             |
| 监听器          | Watchers                 | 响应数据变化的观察者                             |
| 监听属性        | Watched Property         | 被 watch 监控的属性                              |

### stdlib 标准库术语

| 术语                 | 英文                 | 释义                         |
| -------------------- | -------------------- | ---------------------------- |
| 抽象组件             | Abstract Component   | 不渲染自身内容的组件         |
| 基础组件             | Base Component       | 可复用的基础 UI 组件         |
| 业务组件             | Business Component   | 包含业务逻辑的组件           |
| 配置                 | Configuration        | 应用或插件的设置选项         |
| 配置插件             | Config Plugin        | 添加配置选项的插件           |
| 控制台警告           | Console Warning      | 浏览器控制台的警告信息       |
| 自定义事件           | Custom Event         | 用户自定义的事件             |
| 自定义指令           | Custom Directive     | 用户创建的 Vue 指令          |
| 自定义插件           | Custom Plugin        | 用户开发的 Vue 插件          |
| defineComponent      | defineComponent      | 创建组件类型定义的函数       |
| defineAsyncComponent | defineAsyncComponent | 定义异步组件的函数           |
| defineExpose         | defineExpose         | 暴露组件属性的宏             |
| defineEmits          | defineEmits          | 定义组件事件的宏             |
| defineProps          | defineProps          | 定义组件属性的宏             |
| defineModel          | defineModel          | 定义双向绑定的宏             |
| defineOptions        | defineOptions        | 定义组件选项的宏             |
| keep-alive           | keep-alive           | 缓存组件实例的组件           |
| nextTick             | nextTick             | DOM 更新后执行的回调         |
| onMounted            | onMounted            | 组件挂载完成的钩子           |
| onUpdated            | onUpdated            | 组件更新后的钩子             |
| onBeforeUnmount      | onBeforeUnmount      | 卸载前的钩子                 |
| onUnmounted          | onUnmounted          | 组件卸载后的钩子             |
| onActivated          | onActivated          | 被激活的钩子                 |
| onDeactivated        | onDeactivated        | 被停用的钩子                 |
| onErrorCaptured      | onErrorCaptured      | 捕获错误的钩子               |
| onRenderTracked      | onRenderTracked      | 渲染追踪的钩子               |
| onRenderTriggered    | onRenderTriggered    | 渲染触发的钩子               |
| onServerPrefetch     | onServerPrefetch     | 服务端预取的钩子             |
| provide              | provide              | 提供依赖给子孙组件           |
| inject               | inject               | 注入祖先组件提供的依赖       |
| reactive             | reactive             | 创建深层响应式对象           |
| ref                  | ref                  | 创建响应式引用               |
| shallowRef           | shallowRef           | 创建浅层响应式引用           |
| shallowReactive      | shallowReactive      | 创建浅层响应式对象           |
| toRef                | toRef                | 将响应式对象的属性转为 ref   |
| toRefs               | toRefs               | 将响应式对象所有属性转为 ref |
| toRaw                | toRaw                | 获取响应式对象的原始对象     |
| isRef                | isRef                | 检查是否为 ref               |
| isReactive           | isReactive           | 检查是否为 reactive 对象     |
| isProxy              | isProxy              | 检查是否为代理对象           |
| isReadonly           | isReadonly           | 检查是否为只读对象           |
| computed             | computed             | 创建计算属性                 |
| watch                | watch                | 监听数据变化                 |
| watchEffect          | watchEffect          | 立即执行的响应式监听         |
| watchPostEffect      | watchPostEffect      | DOM 更新后执行的监听         |
| watchSyncEffect      | watchSyncEffect      | 同步执行的监听               |
| effectScope          | effectScope          | 创建响应式作用域             |
| getCurrentScope      | getCurrentScope      | 获取当前作用域               |
| onScopeDispose       | onScopeDispose       | 作用域清理回调               |
| Transition           | Transition           | 元素过渡动画组件             |
| TransitionGroup      | TransitionGroup      | 列表过渡动画组件             |
| Teleport             | Teleport             | 将内容传送到其他位置         |
| Suspense             | Suspense             | 异步组件加载状态             |
| v-if                 | v-if                 | 条件渲染指令                 |
| v-else-if            | v-else-if            | else-if 条件渲染             |
| v-else               | v-else               | else 条件渲染                |
| v-show               | v-show               | 显示/隐藏元素                |
| v-for                | v-for                | 列表渲染指令                 |
| v-on                 | v-on                 | 事件监听指令，简写 @         |
| v-bind               | v-bind               | 属性绑定指令，简写 :         |
| v-model              | v-model              | 双向绑定指令                 |
| v-slot               | v-slot               | 插槽指令，简写 #             |
| v-pre                | v-pre                | 跳过编译                     |
| v-once               | v-once               | 只渲染一次                   |
| v-text               | v-text               | 文本插值                     |
| v-html               | v-html               | 插入 HTML                    |
| v-cloak              | v-cloak              | 编译前隐藏                   |
| Vue Router           | Vue Router           | Vue 官方路由管理器           |
| Vuex                 | Vuex                 | Vue 旧版状态管理库           |
| Pinia                | Pinia                | Vue3 推荐的状态管理库        |
| Vite                 | Vite                 | Vue3 推荐的前端构建工具      |

### advanced 高级进阶术语

| 术语           | 英文                              | 释义                         |
| -------------- | --------------------------------- | ---------------------------- |
| 访问性         | Accessibility                     | 使应用对残障人士可用的实践   |
| 累积           | Accumulation                      | 在处理函数中累积结果         |
| 激活钩子       | Activation Hook                   | keep-alive 组件激活时的回调  |
| 适配器         | Adapter                           | 适配不同接口的包装器         |
| 适配器模式     | Adapter Pattern                   | 转换接口的设计模式           |
| 累积器         | Accumulator                       | reduce 函数中的累计变量      |
| 激活规则       | Activation Rule                   | 路由激活的判断条件           |
| 活动指示器     | Activity Indicator                | 表示加载中的 UI              |
| 聚合           | Aggregation                       | 组合多个数据源               |
| 别名           | Alias                             | 导入或路由的替代路径         |
| 分析           | Analysis                          | 检查代码或性能               |
| 分析器         | Analyzer                          | 执行分析的工具               |
| 注解           | Annotation                        | 元数据标记                   |
| 应用配置       | App Config                        | 应用的全局配置               |
| 应用上下文     | App Context                       | 应用级别的上下文             |
| 应用实例       | App Instance                      | createApp 返回的根实例       |
| 应用级 API     | App-level API                     | 实例方法如 `app.component()` |
| 应用插件       | App Plugin                        | 安装到应用的插件             |
| 架构           | Architecture                      | 代码和系统的组织结构         |
| 数组变更检测   | Array Mutation Detection          | 响应式追踪数组变化           |
| 断言           | Assertion                         | 测试中的验证语句             |
| 异步组件       | Async Component                   | 异步加载的组件               |
| 异步守卫       | Async Guard                       | 异步的路由守卫               |
| 异步组件钩子   | Async Component Hooks             | 异步相关的生命周期钩子       |
| 原子化         | Atomicity                         | 操作不可分割的特性           |
| 属性继承       | Attribute Inheritance             | 自动传递给根元素             |
| 属性穿透       | Attribute Passing                 | 将属性传递给子组件           |
| 自动导入       | Auto Import                       | 自动导入组件或模块           |
| 自动注册       | Auto Registration                 | 自动注册组件                 |
| 可用性         | Availability                      | 系统可用的程度               |
| 轴             | Axis                              | 布局的主轴或交叉轴           |
| 基准测试       | Benchmarking                      | 测量性能的测试               |
| 二进制操作     | Binary Operation                  | 位运算操作                   |
| 绑定           | Binding                           | 将数据连接到视图             |
| 绑定指令       | Binding Directive                 | 如 v-bind 的指令             |
| 边界           | Boundary                          | 组件或 DOM 的边界            |
| 分支           | Branch                            | if/else 的分支路径           |
| 构建配置       | Build Config                      | 构建工具的配置               |
| 构建优化       | Build Optimization                | 优化构建输出                 |
| 构建步骤       | Build Step                        | 构建过程的一个阶段           |
| 构建工具       | Build Tool                        | 自动构建的软件               |
| 批量更新       | Batched Update                    | 合并多次状态更新             |
| 批处理         | Batching                          | 将更新合并执行               |
| 行为           | Behavior                          | 组件或应用的反应             |
| 行为驱动开发   | BDD / Behavior-driven Development | 关注行为的开发方法           |
| 蓝图           | Blueprint                         | 应用的初始配置               |
| 边界情况       | Boundary Case                     | 极端或特殊的输入             |
| 桥接           | Bridging                          | 连接不同系统                 |
| 浏览器兼容性   | Browser Compatibility             | 在不同浏览器的支持情况       |
| 缓存           | Caching                           | 存储数据供后续使用           |
| 缓存失效       | Cache Invalidation                | 清除过期缓存                 |
| 回调队列       | Callback Queue                    | 待执行的回调列表             |
| 调用           | Call                              | 执行函数或方法               |
| 调用链         | Call Chain                        | 连续的函数调用               |
| 候选值         | Candidate                         | 条件渲染的选项               |
| 容量           | Capacity                          | 容器或资源的容量             |
| 分类           | Categorization                    | 分组和组织                   |
| 链式调用       | Chaining                          | 连续调用方法                 |
| 链式路由       | Chained Routes                    | 嵌套的路由                   |
| 变更检测       | Change Detection                  | 追踪状态变化                 |
| 变更历史       | Change History                    | 修改的记录                   |
| 混沌工程       | Chaos Engineering                 | 测试系统韧性                 |
| 检查           | Checking                          | 验证条件                     |
| 子组件         | Child Component                   | 被嵌套的组件                 |
| 类组件         | Class Component                   | 用类定义的组件               |
| 清理           | Cleanup                           | 释放资源和移除监听           |
| 客户端状态     | Client State                      | 浏览器端的状态               |
| 客户端路由     | Client Routing                    | 浏览器端路由切换             |
| 代码分割       | Code Splitting                    | 将代码分成多个块             |
| 代码生成       | Code Generation                   | 自动生成代码                 |
| 编码           | Coding                            | 编写代码                     |
| 组合           | Combination                       | 组合多个值或功能             |
| 组合式 API     | Composition API                   | 组织组件逻辑的新方式         |
| 复合组件       | Compound Component                | 协作的多个组件               |
| 计算属性       | Computed Property                 | 基于响应式数据计算的值       |
| 条件编译       | Conditional Compilation           | 根据条件选择代码             |
| 条件渲染       | Conditional Rendering             | 根据条件显示内容             |
| 配置           | Configuration                     | 设置选项                     |
| 配置级         | Configuration Level               | 配置的优先级                 |
| 确认           | Confirmation                      | 验证用户意图                 |
| 连接           | Connection                        | 两个组件的关联               |
| 连接处理       | Connection Handling               | 处理 WebSocket 等连接        |
| 容器           | Container                         | 包装组件的父组件             |
| 容器组件       | Container Component               | 包含业务逻辑的组件           |
| 上下文         | Context                           | 组件可访问的数据范围         |
| 上下文 API     | Context API                       | 传递数据的 API               |
| 持续集成       | Continuous Integration            | 频繁合并代码的实践           |
| 控制台         | Console                           | 浏览器开发者工具             |
| 约束           | Constraint                        | 限制条件                     |
| 消费者         | Consumer                          | 使用数据的组件               |
| 内容分发       | Content Projection                | 插槽传递内容                 |
| 上下文         | Context                           | 提供数据和功能的机制         |
| 合约           | Contract                          | 组件间的接口约定             |
| 合约测试       | Contract Testing                  | 验证接口兼容性               |
| 贡献           | Contribution                      | 向项目提交代码               |
| 控制反转       | Inversion of Control              | 由框架调用开发者代码         |
| 控制流         | Control Flow                      | 代码执行的顺序               |
| 核心组件       | Core Component                    | 框架内置的组件               |
| 核心插件       | Core Plugin                       | 框架内置的插件               |
| 对应           | Correspondence                    | 匹配关系                     |
| 耦合           | Coupling                          | 模块间的依赖程度             |
| 创建时         | Creation                          | 实例创建阶段                 |
| 创建钩子       | Creation Hooks                    | 实例创建时的钩子             |
| 跨组件通信     | Cross-component Communication     | 组件间传递数据               |
| 当前实例       | Current Instance                  | 正在处理的实例               |
| 当前路由       | Current Route                     | 当前 URL 对应的路由          |
| 自定义块       | Custom Block                      | Vue SFC 的自定义区块         |
| 自定义合并策略 | Custom Merge Strategy             | 自定义选项合并方式           |
| 循环依赖       | Cyclic Dependency                 | 模块相互依赖                 |
| 数据获取       | Data Fetching                     | 从服务端获取数据             |
| 数据流         | Data Flow                         | 数据在组件间的流动           |
| 数据映射       | Data Mapping                      | 转换数据结构                 |
| 数据迁移       | Data Migration                    | 升级数据格式                 |
| 数据持久化     | Data Persistence                  | 保存数据到存储               |
| 数据可视化     | Data Visualization                | 用图表展示数据               |
| 数据仓库       | Data Store                        | 存储数据的地方               |
| 调试           | Debugging                         | 查找和修复错误               |
| 声明           | Declaration                       | 定义组件、指令等             |
| 声明式渲染     | Declarative Rendering             | 描述期望的结果               |
| 声明式路由     | Declarative Routing               | 用配置定义路由               |
| 降级           | Degradation                       | 功能降级处理                 |
| 删除           | Deletion                          | 移除元素或数据               |
| 依赖           | Dependency                        | 组件依赖的其他代码           |
| 依赖解析       | Dependency Resolution             | 查找模块位置                 |
| 依赖追踪       | Dependency Tracking               | 记录数据依赖关系             |
| 部署           | Deployment                        | 发布应用到服务器             |
| 部署配置       | Deployment Config                 | 部署相关的配置               |
| 派生状态       | Derived State                     | 基于其他状态计算的状态       |
| 描述符         | Descriptor                        | 属性的配置对象               |
| 设计系统       | Design System                     | 组件和样式规范               |
| 销毁           | Destruction                       | 清理和销毁实例               |
| 销毁钩子       | Destruction Hooks                 | 实例销毁时的钩子             |
| 开发依赖       | Dev Dependency                    | 仅开发时需要的依赖           |
| 开发服务器     | Dev Server                        | 本地开发服务器               |
| 开发工具       | DevTools                          | 开发者工具                   |
| 开发版本       | Development Build                 | 开发用的构建版本             |
| 字典           | Dictionary                        | 键值对数据结构               |
| 有向无环图     | DAG / Directed Acyclic Graph      | 依赖关系的图结构             |
| 禁用           | Disabling                         | 禁止功能或交互               |
| 断开连接       | Disconnection                     | 断开网络连接                 |
| 调度           | Dispatching                       | 分发 Action                  |
| 分发           | Distribution                      | 部署和分发应用               |
| 区分大小写     | Case Sensitivity                  | 大小写是否重要               |
| 文档           | Documentation                     | 代码说明文档                 |
| 域             | Domain                            | 业务领域范围                 |
| 领域模型       | Domain Model                      | 业务领域的抽象               |
| 滴滴           | 滴滴                              | 一点点                       |
| 下拉列表       | Dropdown                          | 下拉选择菜单                 |
| 持续时间       | Duration                          | 过渡动画的时长               |
| 动态类绑定     | Dynamic Class Binding             | 条件添加 CSS 类              |
| 动态导入       | Dynamic Import                    | 按需加载模块                 |
| 动态路由匹配   | Dynamic Route Matching            | 参数化的路由                 |
| 动态样式绑定   | Dynamic Style Binding             | 动态绑定 style               |
| 动态更新       | Dynamic Update                    | 运行时更新内容               |
| 早期访问       | Early Access                      | 新特性提前试用               |
| 编辑           | Editing                           | 修改数据                     |
| 编辑模式       | Edit Mode                         | 可编辑的状态                 |
| 效果           | Effect                            | 代码的运行结果               |
| 副作用         | Side Effect                       | 函数外的状态变化             |
| 副作用钩子     | Effect Hooks                      | 处理副作用的钩子             |
| 元素           | Element                           | DOM 元素                     |
| 元素引用       | Element Reference                 | 获取 DOM 元素的引用          |
| 空值           | Empty Value                       | 为空的数据                   |
| 启用           | Enabling                          | 允许功能或交互               |
| 编码           | Encoding                          | 转换数据格式                 |
| 端点           | Endpoint                          | API 的访问地址               |
| 环境           | Environment                       | 运行环境                     |
| 环境变量       | Environment Variable              | 运行时配置                   |
| 相等           | Equality                          | 值是否相同                   |
| 错误处理       | Error Handling                    | 处理异常情况                 |
| 错误恢复       | Error Recovery                    | 从错误中恢复                 |
| 逃逸           | Escape                            | 转义特殊字符                 |
| 评估           | Evaluation                        | 计算表达式值                 |
| 事件总线       | Event Bus                         | 组件间通信的中央事件         |
| 事件流         | Event Flow                        | 事件传播的路径               |
| 事件委托       | Event Delegation                  | 在父元素处理子元素事件       |
| 事件触发       | Event Triggering                  | 触发事件                     |
| 事件类型       | Event Type                        | 事件的种类                   |
| 异常           | Exception                         | 错误情况                     |
| 显式           | Explicit                          | 明确指定                     |
| 显式安装       | Explicit Installation             | 手动调用 app.use()           |
| 显式更新       | Explicit Update                   | 手动调用 update              |
| 导出           | Export                            | 从模块导出内容               |
| 表达式         | Expression                        | 求值的代码片段               |
| 扩展           | Extension                         | 扩展功能                     |
| 扩展运算符     | Spread Operator                   | `...` 展开语法               |
| 额外数据       | Extra Data                        | 附加的额外信息               |
| 提取           | Extraction                        | 从复杂数据中获取             |
| 额外道具       | Extra Props                       | 传递给组件的额外属性         |
| 回退           | Fallback                          | 备选方案                     |
| 回退内容       | Fallback Content                  | 默认插槽内容                 |
| 回退路由       | Fallback Route                    | 匹配的备选路由               |
| 快速修复       | Fast Refresh                      | 快速重新加载组件             |
| 特性           | Feature                           | 功能特性                     |
| 特性标志       | Feature Flag                      | 控制特性开关                 |
| 特性分支       | Feature Branch                    | 开发新功能的分支             |
| 文件处理       | File Handling                     | 读取和写入文件               |
| 文件上传       | File Upload                       | 上传文件到服务器             |
| 文件监听       | File Watching                     | 监视文件变化                 |
| 过滤器         | Filter                            | 筛选数据                     |
| 最终值         | Final Value                       | 处理后的结果值               |
| 固定值         | Fixed Value                       | 不变的值                     |
| 闪存           | Flash                             | 短暂显示的消息               |
| 翻转           | Flip                              | 动画技术                     |
| 浮动元素       | Floating Element                  | 浮在页面上的元素             |
| 浮动层         | Floating Layer                    | 弹出层、对话框               |
| 焦点管理       | Focus Management                  | 控制输入焦点                 |
| 折叠           | Fold                              | 收起展开区域                 |
| 折叠面板       | Foldable Panel                    | 可折叠的面板                 |
| 强制更新       | Force Update                      | 强制重新渲染                 |
| 强制渲染       | Force Render                      | 强制渲染组件                 |
| 形式           | Form                              | 表单组件                     |
| 表单绑定       | Form Binding                      | 双向绑定表单数据             |
| 表单处理       | Form Handling                     | 处理表单提交                 |
| 表单验证       | Form Validation                   | 验证表单输入                 |
| 前向引用       | Forward Reference                 | 引用尚未定义的               |
| 片段           | Fragment                          | 不包含根元素的模板           |
| 框架           | Framework                         | 开发框架                     |
| 函数式         | Functional                        | 无状态的                     |
| 函数式编程     | Functional Programming            | 以函数为核心的编程范式       |
| 生成           | Generation                        | 创建代码或数据               |
| 生成器         | Generator                         | 生成数据的函数               |
| 获取           | Getter                            | 读取状态                     |
| 获取钩子       | Getter Hook                       | 读取数据时的处理             |
| 全局注册       | Global Registration               | 注册到应用级别               |
| 全局状态       | Global State                      | 全应用共享的状态             |
| 全局样式       | Global Style                      | 全局应用的样式               |
| 渐变           | Gradient                          | 颜色渐变效果                 |
| 图             | Graph                             | 组件或路由的关系图           |
| 图形           | Graphics                          | 可视化图形                   |
| 守卫           | Guard                             | 路由守卫函数                 |
| 路由守卫       | Route Guard                       | 控制路由访问                 |
| 指南           | Guide                             | 使用指南文档                 |
| 黑客           | Hack                              | 变通方案                     |
| 处理函数       | Handler                           | 处理事件的函数               |
| 处理程序       | Handler                           | 处理逻辑的函数               |
| 硬编码         | Hard-coded                        | 写死的数据                   |
| 硬重载         | Hard Reload                       | 强制刷新页面                 |
| 哈希模式       | Hash Mode                         | URL 中用 # 的路由模式        |
| 历史模式       | History Mode                      | 使用 HTML5 History API       |
| 占位符         | Placeholder                       | 临时内容                     |
| 悬停状态       | Hover State                       | 鼠标悬停的效果               |
| HMR            | HMR / Hot Module Replacement      | 模块热替换                   |
| 层级           | Hierarchy                         | 组件嵌套层级                 |
| 高阶组件       | Higher-order Component            | 返回组件的函数               |
| 持有           | Holding                           | 保持某个值或状态             |
| 钩子           | Hook                              | 生命周期回调                 |
| 钩子函数       | Hook Function                     | 生命周期函数                 |
| 宿主           | Host                              | 组件渲染的目标元素           |
| 宿主元素       | Host Element                      | 组件挂载的 DOM 元素          |
| 热更新         | Hot Update                        | 运行时更新代码               |
| 混用           | Hybrid                            | 混合不同技术                 |
| 标识符         | Identifier                        | 唯一标识                     |
| 惰性求值       | Lazy Evaluation                   | 延迟计算                     |
| 懒惰加载       | Lazy Loading                      | 按需加载                     |
| 布局           | Layout                            | 页面布局结构                 |
| 布局组件       | Layout Component                  | 提供布局的组件               |
| 库             | Library                           | 可复用的代码集合             |
| 生命周期       | Lifecycle                         | 实例从创建到销毁的过程       |
| 生命周期阶段   | Lifecycle Phase                   | 生命周期的各阶段             |
| 负载           | Load                              | 加载数据或资源               |
| 加载状态       | Loading State                     | 正在加载的界面               |
| 加载指示器     | Loading Indicator                 | 表示加载中的 UI              |
| 本地存储       | Local Storage                     | 浏览器本地存储               |
| 本地状态       | Local State                       | 组件内部状态                 |
| 位置           | Location                          | 路由位置对象                 |
| 锁定           | Locking                           | 防止同时修改                 |
| 日志           | Logging                           | 记录运行信息                 |
| 长任务         | Long Task                         | 耗时操作                     |
| 循环           | Loop                              | 重复执行                     |
| 宏             | Macro                             | 编译时展开的代码             |
| 主要路由       | Main Route                        | 主要页面路由                 |
| 管理           | Management                        | 管理功能                     |
| 管理界面       | Management UI                     | 管理界面                     |
| 手风琴         | Accordion                         | 折叠面板组件                 |
| 手动安装       | Manual Installation               | 手动调用 app.use()           |
| 手动挂载       | Manual Mounting                   | 手动调用 app.mount()         |
| 手动更新       | Manual Update                     | 手动触发更新                 |
| 映射           | Mapping                           | 对应关系                     |
| 标记           | Marker                            | 标记点                       |
| 匹配           | Matching                          | 路由匹配                     |
| 匹配器         | Matcher                           | 路由匹配器                   |
| 最大值         | Maximum Value                     | 最大数量或范围               |
| 记忆化         | Memoization                       | 缓存计算结果                 |
| 合并           | Merging                           | 合并配置或数据               |
| 合并策略       | Merge Strategy                    | 选项合并的方式               |
| 元信息         | Meta Information                  | 路由的元数据                 |
| 元编程         | Metaprogramming                   | 程序操作程序代码             |
| 方法           | Method                            | 组件的函数属性               |
| 微前端         | Micro-frontend                    | 前端微服务架构               |
| 微服务         | Microservice                      | 微服务架构                   |
| 中间件         | Middleware                        | 中间处理层                   |
| 最小值         | Minimum Value                     | 最小数量或范围               |
| 混合           | Mixing                            | 混合使用                     |
| 混排           | Mixing Layout                     | 混合布局方式                 |
| 移动端         | Mobile                            | 移动设备                     |
| 模块           | Module                            | 代码模块                     |
| 模块化         | Modularization                    | 模块化组织代码               |
| 模块解析       | Module Resolution                 | 查找模块文件                 |
| 监控           | Monitoring                        | 监视应用状态                 |
| 变化           | Mutation                          | 状态变更                     |
| 变化追踪       | Mutation Tracking                 | 记录状态变化                 |
| 命名           | Naming                            | 命名规范                     |
| 命名约定       | Naming Convention                 | 命名的规则                   |
| 命名路由       | Named Route                       | 给路由起名字                 |
| 本地导航       | Native Navigation                 | 系统原生导航                 |
| 本地存储       | Native Storage                    | 设备本地存储                 |
| 导航           | Navigation                        | 页面跳转                     |
| 导航守卫       | Navigation Guard                  | 控制导航的守卫               |
| 导航失败       | Navigation Failure                | 导航出错                     |
| 否定           | Negation                          | 取反                         |
| 巢状           | Nesting                           | 组件嵌套                     |
| 网络请求       | Network Request                   | HTTP 请求                    |
| 网络状态       | Network State                     | 连接状态                     |
| 新手模式       | Newbie Mode                       | 简化功能                     |
| 下一代         | Next Generation                   | 下一代版本                   |
| 节点           | Node                              | 组件树节点                   |
| 非递归         | Non-recursive                     | 不自我调用                   |
| 空状态         | Empty State                       | 无数据时的显示               |
| 对象属性       | Object Property                   | 对象的属性                   |
| 对象语法       | Object Syntax                     | 对象形式的绑定语法           |
| 观察者         | Observer                          | 响应式追踪者                 |
| 观察者模式     | Observer Pattern                  | 订阅-发布模式                |
| 离线           | Offline                           | 离线状态                     |
| 离线支持       | Offline Support                   | 离线可用                     |
| 打开           | Opening                           | 打开对话框等                 |
| 操作           | Operation                         | 操作行为                     |
| 可选           | Optional                          | 可选的功能                   |
| 可选属性       | Optional Property                 | 可有可无的属性               |
| 选项           | Option                            | 配置选项                     |
| 选项 API       | Options API                       | 组件定义的旧方式             |
| 选项合并       | Option Merging                    | 合并组件选项                 |
| 订单           | Order                             | 排序顺序                     |
| 原始值         | Raw Value                         | 未处理的值                   |
| 排序           | Ordering                          | 排列顺序                     |
| 组织           | Organization                      | 代码组织结构                 |
| 原始           | Original                          | 原始的、最初的               |
| 原始值         | Original Value                    | 初始的值                     |
| 覆盖           | Override                          | 覆盖原有行为                 |
| 重写           | Overwrite                         | 替换已有内容                 |
| 包             | Package                           | npm 包                       |
| 打包           | Packing                           | 打包代码                     |
| 分页           | Pagination                        | 分页显示                     |
| 分页组件       | Pagination Component              | 分页控件                     |
| 参数           | Parameter                         | 函数参数                     |
| 参数解析       | Parameter Parsing                 | 解析 URL 参数                |
| 父组件         | Parent Component                  | 嵌套其他组件的组件           |
| 部分           | Partial                           | 部分内容                     |
| 部分 hydratio  | Partial Hydration                 | 部分激活                     |
| 参与者         | Participant                       | 参与事件的对象               |
| 补丁           | Patch                             | 小幅更新                     |
| 路径           | Path                              | 文件或 URL 路径              |
| 路径参数       | Path Parameter                    | URL 路径中的参数             |
| 路径解析       | Path Resolution                   | 解析模块路径                 |
| 模式           | Pattern                           | 设计模式                     |
| 支付           | Payment                           | 支付功能                     |
| 性能           | Performance                       | 运行效率                     |
| 性能分析       | Performance Analysis              | 分析性能问题                 |
| 性能监控       | Performance Monitoring            | 监控性能指标                 |
| 永久           | Permanent                         | 持久不变的                   |
| 持久化         | Persistence                       | 长期保存                     |
| 持久状态       | Persistent State                  | 保存的状态                   |
| 占位符         | Placeholder                       | 临时替代内容                 |
| 占位内容       | Placeholder Content               | 默认显示内容                 |
| 策略           | Strategy                          | 解决问题的策略               |
| 策略模式       | Strategy Pattern                  | 选择算法的模式               |
| 预取           | Prefetching                       | 提前加载数据                 |
| 预加载         | Preloading                        | 提前加载资源                 |
| 预设           | Preset                            | 预设配置                     |
| 预设值         | Preset Value                      | 默认值                       |
| 预览           | Preview                           | 预览效果                     |
| 优先级         | Priority                          | 处理顺序                     |
| 处理           | Processing                        | 处理数据                     |
| 生产者         | Producer                          | 生产数据的代码               |
| 产品           | Product                           | 产品特性                     |
| 产品路线图     | Product Roadmap                   | 产品规划                     |
| 概要           | Profile                           | 性能概要                     |
| 分析器         | Profiler                          | 性能分析工具                 |
| 进度           | Progress                          | 进度指示                     |
| 进度条         | Progress Bar                      | 显示进度的条                 |
| 投影           | Projection                        | 映射转换                     |
| Promise        | Promise                           | 异步操作对象                 |
| 属性           | Property                          | 组件的键值对数据             |
| 协议           | Protocol                          | 通信协议                     |
| 提供者         | Provider                          | 提供数据的组件               |
| 代理           | Proxy                             | 拦截对象访问                 |
| 公共           | Public                            | 公开可访问                   |
| 公共组件       | Public Component                  | 对外暴露的组件               |
| 推送           | Push                              | 推送通知                     |
| 推送通知       | Push Notification                 | 服务器推送消息               |
| 质量           | Quality                           | 代码质量                     |
| 查询           | Query                             | 查询参数                     |
| 查询参数       | Query Parameter                   | URL 中 ? 后的参数            |
| 快速入门       | Quick Start                       | 快速上手指南                 |
| 随机访问       | Random Access                     | 随机访问数据                 |
| 范围           | Range                             | 范围区间                     |
| 等级           | Rank                              | 排序等级                     |
| 速率限制       | Rate Limiting                     | 限制请求频率                 |
| 原始           | Raw                               | 未处理的                     |
| 原始模板       | Raw Template                      | 原始模板内容                 |
| 只读           | Readonly                          | 只能读取                     |
| 就绪检查       | Readiness Check                   | 检查是否就绪                 |
| 真实来源       | Real Source                       | 真实数据来源                 |
| 实时           | Real-time                         | 实时更新                     |
| 重新渲染       | Re-rendering                      | 再次渲染                     |
| 重新计算       | Recalculation                     | 重新计算                     |
| 录制           | Recording                         | 记录操作                     |
| 递归           | Recursion                         | 函数自我调用                 |
| 递归组件       | Recursive Component               | 引用自身的组件               |
| 重定向         | Redirect                          | 跳转到其他路由               |
| 减少           | Reduction                         | 减少数据                     |
| 引用的         | Referenced                        | 被引用的                     |
| 刷新           | Refresh                           | 刷新页面或数据               |
| 刷新令牌       | Refresh Token                     | 刷新访问令牌                 |
| 注册           | Registration                      | 注册组件或插件               |
| 规律性         | Regularity                        | 规律性                       |
| 关联           | Relationship                      | 数据间关系                   |
| 相对引用       | Relative Reference                | 相对路径引用                 |
| 释放           | Release                           | 发布版本                     |
| 可靠性         | Reliability                       | 可靠程度                     |
| 重置           | Reset                             | 恢复初始状态                 |
| 资源           | Resource                          | 图片、字体等资源             |
| 资源懒加载     | Resource Lazy Loading             | 延迟加载资源                 |
| 响应           | Response                          | 服务端响应                   |
| 响应头         | Response Header                   | HTTP 响应头                  |
| 响应式         | Reactive                          | 自动响应变化                 |
| 响应式 API     | Reactivity API                    | 响应式相关函数               |
| 响应式依赖     | Reactive Dependency               | 被追踪的依赖                 |
| 响应式追踪     | Reactive Tracking                 | 依赖收集机制                 |
| 重试           | Retry                             | 失败后重试                   |
| 返回           | Return                            | 返回值                       |
| 路由           | Route                             | URL 路径                     |
| 路由匹配       | Route Matching                    | 匹配 URL 到路由              |
| 路由参数       | Route Parameter                   | 路由的路径参数               |
| 路由器         | Router                            | 管理路由的对象               |
| 路由守卫       | Route Guard                       | 控制路由访问                 |
| 路由元信息     | Route Meta                        | 路由的元数据                 |
| 行内           | Inline                            | 内联样式或脚本               |
| 行内组件       | Inline Component                  | 内联定义的组件               |
| 行内模板       | Inline Template                   | 内联在 HTML 中的模板         |
| 行内变量       | Inline Variable                   | 内联变量                     |
| 渲染           | Rendering                         | 生成视图                     |
| 渲染函数       | Render Function                   | 返回 VNode 的函数            |
| 渲染钩子       | Render Hook                       | 渲染阶段的钩子               |
| 渲染优化       | Rendering Optimization            | 优化渲染性能                 |
| 渲染性能       | Rendering Performance             | 渲染速度                     |
| 渲染后         | Post-render                       | 渲染完成后                   |
| 渲染前         | Pre-render                        | 渲染之前                     |
| 渲染时         | During Render                     | 渲染过程中                   |
| 替换           | Replacement                       | 替换内容                     |
| 替换策略       | Replacement Strategy              | 缓存替换算法                 |
| 报告           | Reporting                         | 报告生成                     |
| 报告工具       | Reporting Tool                    | 生成报告的工具               |
| 仓库           | Repository                        | 代码仓库                     |
| 代表           | Representative                    | 代表某物的对象               |
| 请求           | Request                           | HTTP 请求                    |
| 请求拦截器     | Request Interceptor               | 请求发送前处理               |
| 响应拦截器     | Response Interceptor              | 响应返回后处理               |
| 必需           | Required                          | 必须提供                     |
| 必需属性       | Required Property                 | 必须存在的属性               |
| 重做           | Redo                              | 恢复撤销的操作               |
| 引用           | Reference                         | 引用对象                     |
| 引用类型       | Reference Type                    | 引用而非复制                 |
| 引用值         | Referenced Value                  | 被引用的值                   |
| 区域           | Region                            | 页面区域                     |
| 区域划分       | Regionalization                   | 地区适配                     |
| 正则表达式     | Regular Expression                | 文本匹配模式                 |
| 关系           | Relation                          | 数据间关系                   |
| 关系型数据     | Relational Data                   | 有关联的数据                 |
| 相对           | Relative                          | 相对于其他                   |
| 相对路径       | Relative Path                     | 相对当前的位置               |
| 相关           | Relevant                          | 相关的                       |
| 可靠性         | Reliability                       | 稳定可靠                     |
| 可重用         | Reusable                          | 可复用的                     |
| 可重用组件     | Reusable Component                | 可复用的组件                 |
| 重用           | Reuse                             | 复用已有代码                 |
| 反向代理       | Reverse Proxy                     | 服务器端代理                 |
| 修订           | Revision                          | 版本修订                     |
| 修订版         | Revision                          | 代码版本                     |
| 角色           | Role                              | 用户角色                     |
| 根             | Root                              | 根节点                       |
| 根目录         | Root Directory                    | 项目根目录                   |
| 根实例         | Root Instance                     | 根组件实例                   |
| 路由           | Routing                           | 路由选择                     |
| 路由表         | Route Table                       | 路由配置表                   |
| 路由视图       | Router View                       | 显示路由组件                 |
| 行             | Row                               | 数据行                       |
| 行组件         | Row Component                     | 表格行组件                   |
| 规则           | Rule                              | 验证规则                     |
| 规则引擎       | Rule Engine                       | 执行规则的系统               |
| 运行时         | Runtime                           | 代码执行时                   |
| 运行时错误     | Runtime Error                     | 执行时发生的错误             |
| 运行时配置     | Runtime Config                    | 运行时配置                   |
| 样本           | Sample                            | 示例数据                     |
| 样本代码       | Sample Code                       | 示例代码                     |
| 比例           | Scale                             | 缩放比例                     |
| 规模           | Scale                             | 应用的规模                   |
| 可扩展         | Scalability                       | 扩展能力                     |
| 脚手架         | Scaffolding                       | 项目初始结构                 |
| 作用域         | Scope                             | 作用范围                     |
| 作用域样式     | Scoped Style                      | 限制范围的样式               |
| 评分           | Scoring                           | 计算分数                     |
| 脚本           | Script                            | 脚本代码                     |
| 脚本块         | Script Block                      | SFC 中的脚本部分             |
| 滚动           | Scrolling                         | 滚动行为                     |
| 滚动位置       | Scroll Position                   | 滚动条位置                   |
| 密封           | Sealing                           | 防止添加属性                 |
| 搜索           | Search                            | 搜索功能                     |
| 搜索结果       | Search Result                     | 搜索返回的结果               |
| 安全           | Security                          | 安全性                       |
| 安全漏洞       | Security Vulnerability            | 安全问题                     |
| 种子           | Seed                              | 初始数据                     |
| 段             | Segment                           | URL 的一段                   |
| 选择           | Selection                         | 选中的内容                   |
| 选择器         | Selector                          | CSS 选择器                   |
| 选择状态       | Selected State                    | 被选中的状态                 |
| 自引用         | Self-reference                    | 引用自身                     |
| 语义化         | Semantic                          | 语义明确的                   |
| 语义化标签     | Semantic Tag                      | 有意义的 HTML 标签           |
| 发送           | Sending                           | 发送数据                     |
| 敏感数据       | Sensitive Data                    | 敏感信息                     |
| 分离           | Separation                        | 分离关注点                   |
| 序列           | Sequence                          | 序列数据                     |
| 序列化         | Serialization                     | 对象转字符串                 |
| 服务器端       | Server-side                       | 在服务端执行                 |
| 服务端渲染     | Server-side Rendering             | 在服务端生成 HTML            |
| 服务器推送     | Server Push                       | HTTP/2 服务器推送            |
| 服务           | Service                           | 服务层代码                   |
| 服务层         | Service Layer                     | 业务逻辑层                   |
| 服务工作者     | Service Worker                    | 后台网络代理                 |
| 服务发现       | Service Discovery                 | 发现服务地址                 |
| 会话           | Session                           | 用户会话                     |
| 会话存储       | Session Storage                   | 会话级存储                   |
| 设置           | Setting                           | 设置功能                     |
| 阴影           | Shadow                            | 阴影效果                     |
| 阴影 DOM       | Shadow DOM                        | 封装的 DOM 树                |
| 浅层           | Shallow                           | 浅层的                       |
| 浅层相等       | Shallow Equality                  | 只比较一层                   |
| 共享           | Sharing                           | 共享资源                     |
| 共享状态       | Shared State                      | 共享的状态                   |
| 共享样式       | Shared Style                      | 共享的样式                   |
| 覆盖           | Shielding                         | 隔离保护                     |
| 简写           | Shorthand                         | 简化语法                     |
| 简化           | Simplification                    | 简化代码                     |
| 单例           | Singleton                         | 全局唯一实例                 |
| 单例模式       | Singleton Pattern                 | 只创建一个实例               |
| 站点           | Site                              | 网站                         |
| 大小写敏感     | Case Sensitivity                  | 区分大小写                   |
| 大小写转换     | Case Conversion                   | 转换大小写                   |
| 大小           | Size                              | 尺寸大小                     |
| 骨架屏         | Skeleton                          | 加载占位 UI                  |
| 跳过           | Skipping                          | 跳过某些处理                 |
| 滑动           | Sliding                           | 滑动效果                     |
| 插槽           | Slot                              | 内容分发                     |
| 插槽名称       | Slot Name                         | 插槽的标识名                 |
| 插槽对象       | Slot Object                       | 传递给插槽的对象             |
| 插槽道具       | Slot Props                        | 插槽获取的数据               |
| 插槽内容       | Slot Content                      | 插槽填充的内容               |
| 智能           | Smart                             | 智能组件                     |
| 智能组件       | Smart Component                   | 包含业务逻辑的组件           |
| 快照           | Snapshot                          | 状态快照                     |
| 快照测试       | Snapshot Testing                  | 记录 UI 快照的测试           |
| 软重载         | Soft Reload                       | 软刷新页面                   |
| 软件           | Software                          | 软件应用                     |
| 解决方案       | Solution                          | 问题解决方案                 |
| 源             | Source                            | 来源                         |
| 源代码         | Source Code                       | 原始代码                     |
| 源代码映射     | Source Map                        | 源码映射文件                 |
| 空间           | Space                             | 空白间距                     |
| 空间隔离       | Space Isolation                   | 隔离空间                     |
| Span           | Span                              | 列跨越                       |
| 特殊字符       | Special Character                 | 特殊符号                     |
| 特定平台       | Platform-specific                 | 特定平台代码                 |
| 规格           | Specification                     | 规格说明                     |
| 规范           | Specification                     | 代码规范                     |
| 拆分           | Splitting                         | 分割代码                     |
| 稳定           | Stable                            | 稳定版本                     |
| 稳定版本       | Stable Version                    | 正式版本                     |
| 堆栈           | Stack                             | 调用栈                       |
| 阶段           | Stage                             | 开发阶段                     |
| 阶段门禁       | Stage Gate                        | 阶段检查点                   |
| 陈述           | Statement                         | 代码语句                     |
| 静态           | Static                            | 静态的                       |
| 静态分析       | Static Analysis                   | 不运行代码的分析             |
| 静态生成       | Static Generation                 | 构建时生成                   |
| 静态类型检查   | Static Type Checking              | 编译时检查类型               |
| 统计           | Statistics                        | 统计数据                     |
| 步骤           | Step                              | 处理步骤                     |
| 粘性           | Sticky                            | 粘性定位                     |
| 存储           | Storage                           | 存储机制                     |
| 存储库         | Storage                           | 存放数据                     |
| 存储键         | Storage Key                       | 存储的键名                   |
| 故事           | Story                             | 组件用例故事                 |
| 故事书         | Storybook                         | 组件开发工具                 |
| 故事驱动开发   | Story-driven Development          | 以故事驱动开发               |
| 策略           | Strategy                          | 处理方式                     |
| 流             | Stream                            | 数据流                       |
| 状态           | State                             | 组件的数据状态               |
| 状态机         | State Machine                     | 状态转换模型                 |
| 状态管理模式   | State Management Pattern          | 状态管理的模式               |
| 静态生成       | Static Generation                 | 预渲染页面                   |
| 存储           | Store                             | 状态存储                     |
| 存储模块       | Store Module                      | 存储的模块                   |
| 严格模式       | Strict Mode                       | 严格检查模式                 |
| 严格相等       | Strict Equality                   | 绝对相等                     |
| 字符串         | String                            | 文本字符串                   |
| 字符串插值     | String Interpolation              | 模板中嵌入值                 |
| 强类型         | Strong Typing                     | 严格类型检查                 |
| 结构           | Structure                         | 代码结构                     |
| 结构化数据     | Structured Data                   | 结构化的数据格式             |
| 样式           | Style                             | CSS 样式                     |
| 样式表         | Stylesheet                        | CSS 文件                     |
| 样式隔离       | Style Isolation                   | 防止样式冲突                 |
| 子画面         | Subpixel                          | 子像素渲染                   |
| 订阅           | Subscription                      | 订阅数据变化                 |
| 替代           | Substitution                      | 替换内容                     |
| 基元           | Primitive                         | 基础类型                     |
| 优先级         | Priority                          | 优先级                       |
| 探查           | Probing                           | 探测检查                     |
| 处理           | Processing                        | 处理逻辑                     |
| 处理链         | Processing Chain                  | 处理流程链                   |
| 生产           | Production                        | 生产环境                     |
| 生产构建       | Production Build                  | 生产环境构建                 |
| 生产环境       | Production Environment            | 线上环境                     |
| 概要           | Synopsis                          | 内容概要                     |
| 系统           | System                            | 系统整体                     |
| 系统设计       | System Design                     | 系统架构设计                 |
| 表格           | Table                             | 表格组件                     |
| 标签           | Tag                               | HTML 标签                    |
| 标签导航       | Tab Navigation                    | 标签页切换                   |
| 模板           | Template                          | 组件模板                     |
| 模板引用       | Template Ref                      | 获取模板元素引用             |
| 模板语法       | Template Syntax                   | 模板书写规则                 |
| 时序图         | Sequence Diagram                  | 显示交互顺序                 |
| 测试           | Testing                           | 测试代码                     |
| 测试覆盖       | Test Coverage                     | 测试覆盖程度                 |
| 测试驱动开发   | TDD / Test-driven Development     | 先写测试的开发方式           |
| 测试框架       | Test Framework                    | 测试工具                     |
| 测试运行器     | Test Runner                       | 执行测试的工具               |
| 测试夹具       | Test Fixture                      | 测试数据                     |
| 文本           | Text                              | 文本内容                     |
| 文本节点       | Text Node                         | 文本 DOM 节点                |
| 主题           | Theme                             | 外观主题                     |
| 主题化         | Theming                           | 主题切换                     |
| 线程           | Thread                            | 执行线程                     |
| 线程安全       | Thread Safety                     | 多线程安全                   |
| 抛出           | Throwing                          | 抛出异常                     |
| 时间           | Time                              | 时间                         |
| 超时           | Timeout                           | 超时限制                     |
| 时间戳         | Timestamp                         | 时间戳                       |
| 提示           | Tip                               | 提示信息                     |
| 工具           | Tool                              | 开发工具                     |
| 工具链         | Toolchain                         | 工具组合                     |
| 工具提示       | Tooltip                           | 悬浮提示框                   |
| 主题           | Topic                             | 讨论话题                     |
| 追踪           | Tracking                          | 追踪分析                     |
| 追踪代码       | Tracking Code                     | 分析代码                     |
| 追踪器         | Tracker                           | 追踪器                       |
| 事务           | Transaction                       | 数据库事务                   |
| 转换           | Transformation                    | 数据转换                     |
| 转换函数       | Transform Function                | 转换数据的函数               |
| 转换器         | Transformer                       | 数据转换工具                 |
| 过渡           | Transition                        | 过渡动画                     |
| 过渡效果       | Transition Effect                 | 过渡视觉效果                 |
| 过渡模式       | Transition Mode                   | 过渡动画模式                 |
| 翻译           | Translation                       | 国际化翻译                   |
| 透明           | Transparent                       | 透明的                       |
| 树             | Tree                              | 树形结构                     |
| 树形控件       | Tree Control                      | 树形组件                     |
| 树形数据       | Tree Data                         | 树形结构数据                 |
| 树抖动         | Tree Shaking                      | 删除未用代码                 |
| 触发器         | Trigger                           | 触发条件                     |
| 截断           | Truncation                        | 截断文本                     |
| 信任           | Trust                             | 信任级别                     |
| 类型           | Type                              | 数据类型                     |
| 类型检查       | Type Checking                     | 类型验证                     |
| 类型强制       | Type Coercion                     | 类型转换                     |
| 类型定义       | Type Definition                   | 类型声明                     |
| 类型推断       | Type Inference                    | 自动推断类型                 |
| 典型           | Typical                           | 典型的                       |
| 取消           | Undoing                           | 撤销操作                     |
| 统一           | Unification                       | 统一格式                     |
| 唯一           | Unique                            | 唯一的                       |
| 唯一标识符     | Unique Identifier                 | 唯一 ID                      |
| 单位           | Unit                              | 单位                         |
| 单元测试       | Unit Test                         | 测试最小单元                 |
| 卸载           | Unmounting                        | 从 DOM 移除                  |
| 解包           | Unpacking                         | 提取值                       |
| 不稳定         | Unstable                          | 可能会变                     |
| 更新           | Update                            | 更新数据                     |
| 更新检测       | Update Detection                  | 检测更新                     |
| 更新策略       | Update Strategy                   | 更新方式                     |
| 更新时         | On Update                         | 数据更新时                   |
| 上传           | Upload                            | 上传文件                     |
| 上传组件       | Upload Component                  | 上传控件                     |
| 用法           | Usage                             | 使用方式                     |
| 用户           | User                              | 用户                         |
| 用户界面       | UI / User Interface               | 用户界面                     |
| 用户体验       | UX / User Experience              | 用户体验                     |
| 用户输入       | User Input                        | 用户输入                     |
| 用户交互       | User Interaction                  | 用户操作                     |
| 用户流程       | User Flow                         | 用户操作流程                 |
| 用户代理       | User Agent                        | 浏览器标识                   |
| 用户资料       | User Profile                      | 用户信息                     |
| 验证           | Validation                        | 验证数据                     |
| 验证器         | Validator                         | 验证函数                     |
| 验证规则       | Validation Rule                   | 验证规则                     |
| 值             | Value                             | 数据值                       |
| 值绑定         | Value Binding                     | 绑定数据值                   |
| 变量           | Variable                          | 变量                         |
| 变化           | Variation                         | 变体                         |
| 变体           | Variant                           | 不同版本                     |
| 变化检测       | Variation Detection               | 检测变化                     |
| 版本           | Version                           | 版本号                       |
| 版本控制       | Version Control                   | Git 等工具                   |
| 视图           | View                              | 页面视图                     |
| 视图模型       | View Model                        | 视图模型                     |
| 视图状态       | View State                        | 界面状态                     |
| 虚拟           | Virtual                           | 虚拟的                       |
| 虚拟列表       | Virtual List                      | 虚拟滚动列表                 |
| 可见性         | Visibility                        | 可见性                       |
| 可见性变化     | Visibility Change                 | 显示/隐藏变化                |
| 可视化         | Visualization                     | 数据可视化                   |
| 警告           | Warning                           | 警告信息                     |
| 监视           | Watching                          | 监视变化                     |
| 水印           | Watermark                         | 水印效果                     |
| Web API        | Web API                           | 浏览器 API                   |
| Web 组件       | Web Component                     | Web 组件标准                 |
| Webpack        | Webpack                           | 模块打包工具                 |
| WebSocket      | WebSocket                         | 双向通信协议                 |
| 网页           | Webpage                           | 网页                         |
| 网站           | Website                           | 网站                         |
| 加权           | Weighting                         | 权重计算                     |
| 欢迎           | Welcome                           | 欢迎信息                     |
| 欢迎屏幕       | Welcome Screen                    | 欢迎界面                     |
| 工作流         | Workflow                          | 工作流程                     |
| 工作流自动化   | Workflow Automation               | 自动化流程                   |
| 工作区         | Workspace                         | 工作空间                     |
| 世界           | World                             | 全局                         |
| 可写           | Writable                          | 可写入的                     |
| 可写存储       | Writable Store                    | 可修改的状态                 |
| 写入           | Writing                           | 写入数据                     |
| 年份           | Year                              | 年份                         |
| yield          | yield                             | 产出让步                     |
| 区域           | Zone                              | 区域                         |
| 区域模式       | Zone Mode                         | 执行区域                     |
