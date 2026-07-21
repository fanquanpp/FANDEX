package com.fandex.app.data

/**
 * 字符串集合管理
 *
 * 功能：提供应用全局 UI 文本（简体中文）
 * 输出：所有 UI 文本的简体中文版本
 *
 * 默认语言：简体中文（唯一语言）
 * 文档内容语言：仅中文
 *
 * v3.1.0 变更：移除英语（EN）与日语（JA），仅保留简体中文与繁体中文，
 *              减少安装包体积并聚焦核心用户群体
 * v3.7.0 变更：移除繁体中文（ZH_TW），仅保留简体中文作为唯一语言，
 *              删除多语言切换机制与 Language 枚举，简化为单一 default 字符串集合
 */
object Strings {

    /** 语言字符串集合 */
    data class LangStrings(
        val appName: String,
        val welcomeBack: String,
        val appSubtitle: String,
        val homeSubtitle: String,
        val loading: String,
        val all: String,
        val docs: String,
        val modules: String,
        val home: String,
        val light: String,
        val dark: String,
        val lightMode: String,
        val darkMode: String,
        val back: String,
        val language: String,
        val previousDoc: String,
        val nextDoc: String,
        val backToTop: String,
        val noContent: String,
        val fontSizeIncrease: String,
        val fontSizeDecrease: String,
        val menu: String,
        val documents: String,
        val category: String,
        val description: String,
        val pageOf: String,
        val disclaimer: String,
        val disclaimerTitle: String,
        val copied: String,
        val copy: String,
        val latexLabel: String,
        val codeLabel: String,
        /* v3.1.0 新增：检查更新相关文案 */
        val checkUpdate: String,
        val checkingUpdate: String,
        val updateAvailable: String,
        val updateDownloadNow: String,
        val updateViewDetails: String,
        val updateIgnoreVersion: String,
        val updateLater: String,
        val updateDownloading: String,
        val updateCancel: String,
        val updateClose: String,
        val updateNoUpdate: String,
        val updateCheckFailed: String,
        val updateSize: String,
        /* v3.1.0 新增：侧边栏开关项文案 */
        val splashScreen: String,
        val dynamicBackground: String,
        val autoCheckUpdate: String,
        /* v3.6.0 新增：UI 显示大小调节文案 */
        val displaySize: String,
        val displaySizeHint: String,
        val displaySizeSmall: String,
        val displaySizeLarge: String,
        /* v3.1.0 新增：更新自检说明提示文字 */
        val updateCheckHint: String,
        val updateAutoCheckHint: String,
        val updateNetworkHint: String
    )

    /** 简体中文字符串集合（唯一语言） */
    val default: LangStrings = LangStrings(
        appName = "FANDEX",
        welcomeBack = "欢迎回来",
        appSubtitle = "离线技术知识查阅工具",
        homeSubtitle = "代码语法，离线速查",
        loading = "加载中...",
        all = "全部",
        docs = "篇",
        modules = "个模块",
        home = "首页",
        light = "亮色",
        dark = "暗色",
        lightMode = "亮色模式",
        darkMode = "暗色模式",
        back = "返回",
        language = "语言",
        previousDoc = "上一篇",
        nextDoc = "下一篇",
        backToTop = "回到顶部",
        noContent = "暂无内容",
        fontSizeIncrease = "字体增大",
        fontSizeDecrease = "字体缩小",
        menu = "菜单",
        documents = "文档",
        category = "分类",
        description = "简介",
        pageOf = "/",
        disclaimer = "内容由人工与 AI 共同编写，可能存在遗漏或错误，请结合官方文档独立验证。因使用本应用内容所产生的一切后果，由使用者自行承担。",
        disclaimerTitle = "免责声明",
        copied = "已复制",
        copy = "复制",
        latexLabel = "LaTeX",
        codeLabel = "代码",
        checkUpdate = "检查更新",
        checkingUpdate = "正在检查...",
        updateAvailable = "发现新版本",
        updateDownloadNow = "立即下载",
        updateViewDetails = "查看详情",
        updateIgnoreVersion = "忽略此版本",
        updateLater = "稍后提醒",
        updateDownloading = "正在下载新版本",
        updateCancel = "取消",
        updateClose = "关闭",
        updateNoUpdate = "当前已是最新版本",
        updateCheckFailed = "检查更新失败，请稍后重试",
        updateSize = "大小",
        splashScreen = "启动页",
        dynamicBackground = "动态背景",
        autoCheckUpdate = "自动检查更新",
        displaySize = "显示大小",
        displaySizeHint = "调节界面与正文字号（0.8x - 1.4x）",
        displaySizeSmall = "小",
        displaySizeLarge = "大",
        updateCheckHint = "点击检查 GitHub 是否有新版本",
        updateAutoCheckHint = "应用启动后自动检查新版本（仅访问 github.com）",
        updateNetworkHint = "更新检查仅访问 GitHub 域名，可随时关闭恢复完全离线"
    )
}
