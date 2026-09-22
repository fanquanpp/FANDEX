package com.fandex.app

import android.content.Context
import com.fandex.app.data.asset.AssetStore
import com.fandex.app.data.prefs.HistoryPreferences
import com.fandex.app.data.prefs.ThemePreferences
import com.fandex.app.data.prefs.UpdatePreferences
import com.fandex.app.data.repository.DocRepository
import com.fandex.app.data.repository.LearningPathRepository
import com.fandex.app.data.repository.ModuleRepository
import com.fandex.app.data.repository.SyntaxRepository

class AppContainer(context: Context) {

    val assetStore = AssetStore(context)

    val moduleRepository = ModuleRepository(assetStore)

    val docRepository = DocRepository(assetStore)

    val syntaxRepository = SyntaxRepository(assetStore)

    val learningPathRepository = LearningPathRepository(assetStore, moduleRepository)

    val themePreferences = ThemePreferences(context)

    val historyPreferences = HistoryPreferences(context)

    val updatePreferences = UpdatePreferences(context)
}
