package com.fandex.app.data

import android.annotation.SuppressLint
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import android.os.Handler
import android.os.Looper
import androidx.compose.ui.unit.dp
import com.fandex.app.ui.theme.MarkdownColorScheme

/**
 * WebView 离线渲染器（v4.2.1）
 * -----------------------------------------------------------------------------
 * 为 appold 补齐两类内容的高保真渲染：
 *   1. 数学公式（```math 块级公式）：KaTeX（本地 assets，无需联网）
 *   2. Mermaid 图表（```mermaid 代码块）：mermaid.js（本地 assets，无需联网）
 *
 * 设计说明：
 * - 原实现为 Compose 自研 LaTeX 子集（MathFormulaRenderer），仅支持少量命令且
 *   分数/根号退化为线性文本，复杂公式基本不可读；mermaid 则完全不支持，
 *   图表源码被当作普通代码块展示。
 * - WebView 方案复用 web 端同款渲染引擎，保证三端视觉一致；
 *   通过高度回报桥（FandexHeight）把 HTML 文档高度同步给 Compose，
 *   使 WebView 嵌入 Column(verticalScroll) 时表现为"定高自适应"，不产生滚动嵌套。
 * - 解析失败时在 HTML 内回退展示原文，保证内容始终可读。
 */

/** 资源根路径（assets/markdown-res） */
private const val RENDER_RES_BASE = "file:///android_asset/markdown-res"

/** 默认占位高度：渲染完成前的初始高度，避免 0 高度闪烁 */
private const val DEFAULT_WEBVIEW_HEIGHT_DP = 72

/** 最大高度上限：防止异常高度把页面撑爆 */
private const val MAX_WEBVIEW_HEIGHT_DP = 4096

/**
 * 高度回报桥：HTML 渲染完成后把文档像素高度回传给 Compose 侧。
 * JS 桥回调发生在后台线程，需切回主线程更新状态。
 */
private class HeightBridge(private val onHeightPx: (Int) -> Unit) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun onHeight(px: Int) {
        val safe = if (px <= 0) 0 else px
        mainHandler.post { onHeightPx(safe) }
    }
}

/**
 * 构建本地渲染页 URL。
 *
 * @param page 宿主页文件名（formula.html / mermaid.html）
 * @param content 正文内容（公式或图表源码），URL-safe Base64 编码传输
 * @param extraParams 其余查询参数（dark / fg / d 等），需已编码
 */
private fun buildRenderUrl(page: String, content: String, extraParams: String): String {
    val encoded = Base64.encodeToString(
        content.toByteArray(Charsets.UTF_8),
        Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
    )
    return "$RENDER_RES_BASE/$page?c=$encoded&$extraParams"
}

/**
 * 从颜色方案推断是否暗色：背景前景亮度越高说明配色越浅。
 * MarkdownColorScheme 无显式 isDark 字段，以前景文字亮度判定稳定可靠。
 */
private fun isDarkScheme(colorScheme: MarkdownColorScheme): Boolean {
    val argb = colorScheme.onBackground.toArgb()
    /* 提取 RGB 分量计算相对亮度（YIQ 公式，阈值 160 偏向"文字偏白即暗色"） */
    val r = (argb shr 16) and 0xFF
    val g = (argb shr 8) and 0xFF
    val b = argb and 0xFF
    return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

/** 颜色转 #RRGGBB 十六进制字符串，供 HTML 使用 */
private fun toHexColor(colorScheme: MarkdownColorScheme): String {
    val argb = colorScheme.onBackground.toArgb()
    return String.format("#%06X", 0xFFFFFF and argb)
}

/**
 * 通用离线渲染容器：加载宿主页 -> 接收高度回报 -> 定高显示。
 *
 * @param page 宿主页文件名
 * @param content 渲染内容（公式 / 图表源码）
 * @param extraParams 附加查询参数
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun OfflineRenderWebView(page: String, content: String, extraParams: String) {
    val context = LocalContext.current
    /* 高度状态：px（网页像素），换算 dp 时按设备密度折算 */
    val heightPx = remember { mutableIntStateOf(0) }
    /* 内容变化时重置高度，避免旧高度残留 */
    val url = remember(content, extraParams) { buildRenderUrl(page, content, extraParams) }

    AndroidView(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (heightPx.intValue > 0) {
                    /* 已回报高度：按文档实际高度定高（限制上限，超出内部横向滚动） */
                    Modifier.height(
                        minOf(
                            (heightPx.intValue / context.resources.displayMetrics.density).dp,
                            MAX_WEBVIEW_HEIGHT_DP.dp
                        )
                    )
                } else {
                    Modifier.heightIn(min = DEFAULT_WEBVIEW_HEIGHT_DP.dp)
                }
            ),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.allowFileAccess = true
                settings.loadWithOverviewMode = false
                settings.useWideViewPort = false
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                /* 高度桥必须在加载前注册 */
                addJavascriptInterface(HeightBridge { px -> heightPx.intValue = px }, "FandexHeight")
                webViewClient = WebViewClient()
                loadUrl(url)
            }
        },
        update = { webView ->
            /* 内容或主题变化时重新加载 */
            if (webView.url != url) webView.loadUrl(url)
        }
    )
}

/**
 * 块级数学公式渲染（KaTeX 离线渲染）。
 * 替代原 MathFormulaBlock（Compose 自研 LaTeX 子集），支持全部 KaTeX 语法。
 *
 * @param formula LaTeX 公式源码
 * @param colorScheme 颜色方案
 * @param isBlock 是否块级（true 居中 displayMode；false 行内紧凑）
 */
@Composable
internal fun MathWebViewBlock(
    formula: String,
    colorScheme: MarkdownColorScheme,
    isBlock: Boolean = true
) {
    val dark = isDarkScheme(colorScheme)
    val fg = toHexColor(colorScheme)
    OfflineRenderWebView(
        page = "formula.html",
        content = formula,
        extraParams = "d=${if (isBlock) 1 else 0}&dark=${if (dark) 1 else 0}&fg=$fg"
    )
}

/**
 * Mermaid 图表渲染（mermaid.js 离线渲染）。
 * 原 ```mermaid 代码块以普通代码展示，现渲染为真实图表；
 * 解析失败时在 WebView 内回退展示图源码。
 *
 * @param code mermaid 图源码
 * @param colorScheme 颜色方案
 */
@Composable
internal fun MermaidDiagramView(code: String, colorScheme: MarkdownColorScheme) {
    val dark = isDarkScheme(colorScheme)
    val fg = toHexColor(colorScheme)
    OfflineRenderWebView(
        page = "mermaid.html",
        content = code,
        extraParams = "dark=${if (dark) 1 else 0}&fg=$fg"
    )
}
