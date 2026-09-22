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

class MainActivity : ComponentActivity() {

    private val mainViewModel: MainViewModel by viewModels()

    private var splashHold by mutableStateOf(true)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { splashHold }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by mainViewModel.themeMode.collectAsState()
            val fontScale by mainViewModel.fontScale.collectAsState()
            LaunchedEffect(Unit) {
                splashHold = false
            }
            RootTheme(themeMode = themeMode, fontScale = fontScale) {
                AppRoot()
            }
        }
    }
}

@Composable
private fun RootTheme(themeMode: ThemeMode, fontScale: Float, content: @Composable () -> Unit) {
    val darkTheme = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    FandexTheme(darkTheme = darkTheme, fontScale = fontScale, content = content)
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = (application as FandexApp).container.themePreferences

    val themeMode: StateFlow<ThemeMode> = prefs.themeMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)

    val fontScale: StateFlow<Float> = prefs.fontScale
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemePreferences.DEFAULT_FONT_SCALE)

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

    fun increaseFontScale() = stepFontScale(+1)

    fun decreaseFontScale() = stepFontScale(-1)

    private fun stepFontScale(direction: Int) {
        viewModelScope.launch {
            prefs.setFontScale(fontScale.value + direction * ThemePreferences.FONT_SCALE_STEP)
        }
    }
}
