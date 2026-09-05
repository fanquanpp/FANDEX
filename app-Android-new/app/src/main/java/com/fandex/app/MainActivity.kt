package com.fandex.app

import android.app.Application
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fandex.app.data.prefs.ThemeMode
import com.fandex.app.data.prefs.ThemePreferences
import com.fandex.app.ui.navigation.AppRoot
import com.fandex.app.ui.theme.FandexTheme
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * 主 Activity
 *
 * 单 Activity 架构，所有页面通过 Navigation Compose 导航
 * 启用沉浸式状态栏与导航栏；主题模式与全局字号缩放由用户设置驱动
 */
class MainActivity : ComponentActivity() {

    private val mainViewModel: MainViewModel by viewModels()

    /** 开屏保持标志：为 true 时 SplashScreen 保持可见 */
    private var splashHold by mutableStateOf(true)

    override fun onCreate(savedInstanceState: Bundle?) {
        // 品牌开屏（core-splashscreen）：Android 12+ 走系统开屏，
        // 26-11 由兼容库提供一致体验；首帧就绪即释放，不加人为延迟
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { splashHold }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by mainViewModel.themeMode.collectAsState()
            val fontScale by mainViewModel.fontScale.collectAsState()
            // Compose 首帧组合完成后立即释放开屏（无最短展示时长）
            LaunchedEffect(Unit) {
                splashHold = false
            }
            RootTheme(themeMode = themeMode, fontScale = fontScale) {
                AppRoot()
            }
        }
    }
}

/**
 * 根主题包装
 *
 * 根据用户选择的主题模式决定深浅色：
 * SYSTEM 跟随系统，LIGHT / DARK 强制指定；
 * fontScale 为全局字号缩放倍率（0.8-1.4），经 LocalDensity 全局生效
 */
@Composable
private fun RootTheme(themeMode: ThemeMode, fontScale: Float, content: @Composable () -> Unit) {
    val darkTheme = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    FandexTheme(darkTheme = darkTheme, fontScale = fontScale, content = content)
}

/**
 * 主界面 ViewModel
 *
 * 为根主题提供主题模式与全局字号缩放状态；页面级状态由各自 ViewModel 管理
 */
class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = (application as FandexApp).container.themePreferences

    /** 当前主题模式 */
    val themeMode: StateFlow<ThemeMode> = prefs.themeMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)

    /** 全局字号缩放倍率（0.8-1.4，默认 1.0） */
    val fontScale: StateFlow<Float> = prefs.fontScale
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemePreferences.DEFAULT_FONT_SCALE)

    /**
     * 循环切换主题模式：跟随系统 -> 浅色 -> 深色 -> 跟随系统
     */
    fun cycleThemeMode() {
        viewModelScope.launch {
            val next = when (themeMode.value) {
                ThemeMode.SYSTEM -> ThemeMode.LIGHT
                ThemeMode.LIGHT -> ThemeMode.DARK
                ThemeMode.DARK -> ThemeMode.SYSTEM
            }
            prefs.setThemeMode(next)
        }
    }

    /** 增大全局字号（步进 +0.1，自动收敛到 0.8-1.4） */
    fun increaseFontScale() = stepFontScale(+1)

    /** 减小全局字号（步进 -0.1，自动收敛到 0.8-1.4） */
    fun decreaseFontScale() = stepFontScale(-1)

    /** 字号步进写入（方向 x 步长，区间收敛在 ThemePreferences 内完成） */
    private fun stepFontScale(direction: Int) {
        viewModelScope.launch {
            prefs.setFontScale(fontScale.value + direction * ThemePreferences.FONT_SCALE_STEP)
        }
    }
}
