package com.fandex.app.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.fandex.app.AppContainer
import com.fandex.app.FandexApp

@Composable
fun rememberAppContainer(): AppContainer {
    return (LocalContext.current.applicationContext as FandexApp).container
}
