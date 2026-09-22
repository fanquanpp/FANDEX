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

private const val RENDER_RES_BASE = "file:///android_asset/markdown-res"

private const val DEFAULT_WEBVIEW_HEIGHT_DP = 72

private const val MAX_WEBVIEW_HEIGHT_DP = 4096

private class HeightBridge(private val onHeightPx: (Int) -> Unit) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun onHeight(px: Int) {
        val safe = if (px <= 0) 0 else px
        mainHandler.post { onHeightPx(safe) }
    }
}

private fun buildRenderUrl(page: String, content: String, extraParams: String): String {
    val encoded = Base64.encodeToString(
        content.toByteArray(Charsets.UTF_8),
        Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
    )
    return "$RENDER_RES_BASE/$page?c=$encoded&$extraParams"
}

private fun isDarkScheme(colorScheme: MarkdownColorScheme): Boolean {
    val argb = colorScheme.onBackground.toArgb()
    val r = (argb shr 16) and 0xFF
    val g = (argb shr 8) and 0xFF
    val b = argb and 0xFF
    return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

private fun toHexColor(colorScheme: MarkdownColorScheme): String {
    val argb = colorScheme.onBackground.toArgb()
    return String.format("#%06X", 0xFFFFFF and argb)
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun OfflineRenderWebView(page: String, content: String, extraParams: String) {
    val context = LocalContext.current
    val heightPx = remember { mutableIntStateOf(0) }
    val url = remember(content, extraParams) { buildRenderUrl(page, content, extraParams) }

    AndroidView(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (heightPx.intValue > 0) {
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
                addJavascriptInterface(HeightBridge { px -> heightPx.intValue = px }, "FandexHeight")
                webViewClient = WebViewClient()
                loadUrl(url)
            }
        },
        update = { webView ->
            if (webView.url != url) webView.loadUrl(url)
        }
    )
}

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
