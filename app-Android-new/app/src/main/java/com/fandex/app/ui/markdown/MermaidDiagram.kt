package com.fandex.app.ui.markdown

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.fandex.app.ui.theme.LocalExtendedColors
import kotlinx.serialization.json.Json

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MermaidDiagram(
    code: String,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current
    val density = LocalDensity.current
    val context = LocalContext.current
    val mainHandler = remember { Handler(Looper.getMainLooper()) }

    var contentHeightPx by remember { mutableIntStateOf(0) }
    var renderError by remember { mutableStateOf(false) }
    var pageReady by remember { mutableStateOf(false) }

    val bridge = remember {
        MermaidBridge(
            { px -> mainHandler.post { if (px > 0) contentHeightPx = px } },
            { mainHandler.post { renderError = true } }
        )
    }

    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            setBackgroundColor(android.graphics.Color.TRANSPARENT)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            addJavascriptInterface(bridge, "AndroidBridge")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    pageReady = true
                }
            }
            loadUrl("file:///android_asset/mermaid/index.html")
        }
    }

    LaunchedEffect(webView, code, extendedColors.isDark, pageReady) {
        if (pageReady) {
            val theme = if (extendedColors.isDark) "dark" else "neutral"
            val codeJson = Json.encodeToString(code)
            webView.evaluateJavascript("renderMermaid($codeJson, \"$theme\")", null)
        }
    }

    val height = if (contentHeightPx > 0) {
        with(density) { contentHeightPx.toDp() }.coerceIn(80.dp, 4000.dp)
    } else {
        220.dp
    }

    if (renderError) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(4.dp))
                .background(extendedColors.codeBg)
                .padding(12.dp)
        ) {
            Text(
                text = code,
                style = MaterialTheme.typography.bodySmall,
                color = extendedColors.codeText,
                maxLines = 12,
                overflow = TextOverflow.Ellipsis
            )
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault)
    ) {
        Row(Modifier.fillMaxWidth().height(height)) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .background(MaterialTheme.colorScheme.primary)
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                AndroidView(
                    factory = { webView },
                    modifier = Modifier.fillMaxWidth().height(height)
                )
            }
        }
        Text(
            text = "MERMAID 图表 · 双指缩放 / 双击适配",
            style = MaterialTheme.typography.labelSmall,
            color = extendedColors.fgTertiary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

private class MermaidBridge(
    private val onHeightCallback: (Int) -> Unit,
    private val onErrorCallback: (String) -> Unit
) {
    @JavascriptInterface
    fun onHeight(px: Int) = onHeightCallback(px)

    @JavascriptInterface
    fun onError(error: String) = onErrorCallback(error)
}
