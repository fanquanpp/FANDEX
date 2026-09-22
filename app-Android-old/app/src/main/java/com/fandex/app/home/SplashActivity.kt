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

class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val context = LocalContext.current

            val isSplashEnabled by DataStoreManager.getSplashEnabled(context)
                .collectAsState(initial = true)

            val isDarkMode by DataStoreManager.getDarkMode(context)
                .collectAsState(initial = true)

            val strings = Strings.default

            val splashDurationMs = 1500L

            LaunchedEffect(isSplashEnabled) {
                try {
                    if (isSplashEnabled) {
                        delay(splashDurationMs)
                    }
                    val intent = Intent(this@SplashActivity, HomeActivity::class.java)
                    startActivity(intent)
                    finish()
                } catch (e: Exception) {
                    Log.w(TAG, "启动页跳转主页面失败,尝试兜底跳转: ${e.message}", e)
                    try {
                        val intent = Intent(this@SplashActivity, HomeActivity::class.java)
                        startActivity(intent)
                        finish()
                    } catch (e: Exception) {
                        Log.w(TAG, "启动页兜底跳转主页面二次异常: ${e.message}", e)
                    }
                }
            }

            FANDEXTheme(darkTheme = isDarkMode) {
                CompositionLocalProvider(LocalStrings provides strings) {
                    SplashScreenContent(isDarkMode = isDarkMode)
                }
            }
        }
    }

    companion object {
        private const val TAG = "SplashActivity"
    }
}

@androidx.compose.runtime.Composable
private fun SplashScreenContent(isDarkMode: Boolean) {
    val strings = LocalStrings.current
    val backgroundColor = if (isDarkMode) Color(0xFF0d0d0d) else Color(0xFFFFFFFF)
    val accentColor = Color(0xFF3366cc)
    val textColor = if (isDarkMode) Color.White else Color(0xFF0D0D0D)
    val secondaryTextColor = if (isDarkMode) {
        Color.White.copy(alpha = 0.6f)
    } else {
        Color(0xFF0D0D0D).copy(alpha = 0.6f)
    }

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

    var logoVisible by remember { mutableStateOf(false) }
    var welcomeVisible by remember { mutableStateOf(false) }
    var taglineVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        logoVisible = true
        delay(200)
        welcomeVisible = true
        delay(300)
        taglineVisible = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        BackgroundDecorSystem(
            variant = GeoBgVariant.Splash,
            dynamicBackground = true
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
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
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(36.dp)
                            .scale(accentScale)
                            .background(accentColor)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
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

private fun Boolean.coerceScale(): Float = if (this) 1.0f else 0.85f
