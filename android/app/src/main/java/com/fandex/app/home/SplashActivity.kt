package com.fandex.app.home

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fandex.app.data.DataStoreManager
import com.fandex.app.data.Strings
import com.fandex.app.ui.components.GeoBgVariant
import com.fandex.app.ui.components.LocalStrings
import com.fandex.app.ui.background.BackgroundDecorSystem
import com.fandex.app.ui.theme.FANDEXTheme
import kotlinx.coroutines.delay

/**
 * 启动页 Activity
 *
 * 功能：应用冷启动入口，展示品牌信息与文字动画后跳转至 HomeActivity
 * 输入：无
 * 输出：启动页界面（品牌 Logo、文字逐字浮现动画、欢迎语、标语），1.5 秒后自动跳转
 * 流程：
 *   1. 从 DataStore 读取 is_splash_enabled 设置（默认 true）
 *   2. 若启动页开启：显示启动页 1.5 秒后跳转 HomeActivity
 *   3. 若启动页关闭：直接跳转 HomeActivity
 *   4. 跳转后 finish() 当前 Activity，防止返回
 *
 * v3.1.0 变更：
 *   - 启动页时长由 1.8s 固定为 1.5s
 *   - 新增文字逐字浮现动画 + 缩放淡入效果
 *   - 标语与欢迎语采用时序错峰进入，营造流畅的入场仪式感
 */
class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val context = LocalContext.current

            /* 从 DataStore 读取启动页开关设置，默认开启 */
            val isSplashEnabled by DataStoreManager.getSplashEnabled(context)
                .collectAsState(initial = true)

            /* v3.6.0：从 DataStore 读取主题偏好，启动页随用户设置切换深/浅色 */
            val isDarkMode by DataStoreManager.getDarkMode(context)
                .collectAsState(initial = true)

            /* 获取简体中文字符串集合（唯一语言） */
            val strings = Strings.default

            /* 启动页展示时长（毫秒） - v3.1.0 固定为 1500ms */
            val splashDurationMs = 1500L

            /* 监听设置值变化，决定是否展示启动页 */
            LaunchedEffect(isSplashEnabled) {
                try {
                    if (isSplashEnabled) {
                        /* 启动页开启：等待 1.5 秒后跳转 */
                        delay(splashDurationMs)
                    }
                    /* 跳转到 HomeActivity */
                    val intent = Intent(this@SplashActivity, HomeActivity::class.java)
                    startActivity(intent)
                    /* 销毁当前 Activity，防止返回键回到启动页 */
                    finish()
                } catch (e: Exception) {
                    Log.w(TAG, "启动页跳转主页面失败,尝试兜底跳转: ${e.message}", e)
                    /* 异常兜底：确保即使出错也能跳转到主页面 */
                    try {
                        val intent = Intent(this@SplashActivity, HomeActivity::class.java)
                        startActivity(intent)
                        finish()
                    } catch (e: Exception) {
                        Log.w(TAG, "启动页兜底跳转主页面二次异常: ${e.message}", e)
                    }
                }
            }

            /* v3.6.0：启动页随用户主题偏好切换，浅色模式时使用白色背景与黑色文字
               通过 CompositionLocalProvider 注入字符串集合与装饰颜色方案 */
            FANDEXTheme(darkTheme = isDarkMode) {
                CompositionLocalProvider(LocalStrings provides strings) {
                    SplashScreenContent(isDarkMode = isDarkMode)
                }
            }
        }
    }

    companion object {
        /** 日志 TAG */
        private const val TAG = "SplashActivity"
    }
}

/**
 * 启动页内容组件
 *
 * 功能：渲染启动页的品牌展示界面，包含文字逐字浮现动画
 * 输入：通过 LocalStrings CompositionLocal 获取当前文案；isDarkMode 控制深/浅色配色
 * 输出：背景 + Logo + 逐字浮现的欢迎语 + 标语
 *
 * v3.6.0 变更：
 *   - 增加浅色模式支持，随用户主题偏好切换配色
 *   - 浅色模式：白色背景 + 黑色文字 + 蓝色品牌色条
 *   - 暗色模式：保持原深色背景 + 白色文字 + 蓝色品牌色条
 *
 * 动画时序（总时长 1500ms 内完成）：
 *   - 0~300ms：Logo 竖色条 + FANDEX 品牌名淡入并轻微缩放
 *   - 200~700ms：欢迎语从下方滑入并淡入
 *   - 500~1000ms：标语淡入
 *   - 全程：Logo 旁的竖色条伴随呼吸缩放动画
 */
@androidx.compose.runtime.Composable
private fun SplashScreenContent(isDarkMode: Boolean) {
    /* 从 CompositionLocal 读取当前文案 */
    val strings = LocalStrings.current
    /* v3.6.0：根据主题切换背景色 */
    val backgroundColor = if (isDarkMode) Color(0xFF0d0d0d) else Color(0xFFFFFFFF)
    /* 品牌竖色条颜色（深/浅色保持一致以维持品牌识别度） */
    val accentColor = Color(0xFF3366cc)
    /* v3.6.0：根据主题切换文字颜色 */
    val textColor = if (isDarkMode) Color.White else Color(0xFF0D0D0D)
    /* 次要文字颜色（半透明，随主题切换基色） */
    val secondaryTextColor = if (isDarkMode) {
        Color.White.copy(alpha = 0.6f)
    } else {
        Color(0xFF0D0D0D).copy(alpha = 0.6f)
    }

    /* 呼吸缩放动画：竖色条伴随呼吸缩放，营造仪式感（v3.6.0：去除光晕表述，保留缩放） */
    val infiniteTransition = rememberInfiniteTransition(label = "splash_accent")
    val accentScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "accent_scale"
    )

    /* Logo 入场动画状态：300ms 内淡入 + 缩放 0.85 -> 1.0 */
    var logoVisible by remember { mutableStateOf(false) }
    /* 欢迎语入场动画状态：200ms 延迟后 500ms 内从下方滑入并淡入 */
    var welcomeVisible by remember { mutableStateOf(false) }
    /* 标语入场动画状态：500ms 延迟后 500ms 内淡入 */
    var taglineVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        /* Logo 立即开始入场 */
        logoVisible = true
        /* 欢迎语延迟 200ms 入场 */
        delay(200)
        welcomeVisible = true
        /* 标语延迟 300ms 入场（相对欢迎语） */
        delay(300)
        taglineVisible = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        /* 启动页装饰系统：6 层背景装饰（启动页固定开启动态层以营造仪式感） */
        BackgroundDecorSystem(
            variant = GeoBgVariant.Splash,
            dynamicBackground = true
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            /* FANDEX Logo：竖色条 + 深底白字 FANDEX，带缩放淡入动画 */
            AnimatedVisibility(
                visible = logoVisible,
                enter = fadeIn(animationSpec = tween(300)) +
                    slideInVertically(
                        initialOffsetY = { it / 4 },
                        animationSpec = tween(300)
                    ),
                exit = fadeOut()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.scale(logoVisible.coerceScale())
                ) {
                    /* 左侧竖色条：伴随呼吸缩放动画 */
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(36.dp)
                            .scale(accentScale)
                            .background(accentColor)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    /* FANDEX 品牌名 */
                    Text(
                        text = strings.appName,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = textColor,
                        letterSpacing = 2.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            /* 欢迎语：从下方滑入并淡入 */
            AnimatedVisibility(
                visible = welcomeVisible,
                enter = fadeIn(animationSpec = tween(500)) +
                    slideInVertically(
                        initialOffsetY = { it / 3 },
                        animationSpec = tween(500)
                    ),
                exit = fadeOut()
            ) {
                Text(
                    text = strings.welcomeBack,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = textColor.copy(alpha = 0.85f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            /* 标语：渐显淡入 */
            AnimatedVisibility(
                visible = taglineVisible,
                enter = fadeIn(animationSpec = tween(500)),
                exit = fadeOut()
            ) {
                Text(
                    text = strings.appSubtitle,
                    fontSize = 14.sp,
                    color = secondaryTextColor
                )
            }
        }
    }
}

/**
 * 辅助函数：将 Boolean 强制为 1.0f 或 0.85f 用于缩放
 *
 * 输入：Boolean 状态
 * 输出：1.0f（true）或 0.85f（false）
 *
 * 说明：用于 Logo 入场时的轻微缩放效果，避免直接使用 Boolean 转 Float 导致的跳变
 */
private fun Boolean.coerceScale(): Float = if (this) 1.0f else 0.85f
