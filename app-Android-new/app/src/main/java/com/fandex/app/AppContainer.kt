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

/**
 * 应用级依赖容器
 *
 * 集中管理数据层单例：UI 层（ViewModel）通过容器获取仓库实例，
 * 与 app-web 的 services 统一入口定位一致
 */
class AppContainer(context: Context) {

    /** assets 数据源（含缓存） */
    val assetStore = AssetStore(context)

    /** 模块仓库 */
    val moduleRepository = ModuleRepository(assetStore)

    /** 文档仓库 */
    val docRepository = DocRepository(assetStore)

    /** 语法速查仓库 */
    val syntaxRepository = SyntaxRepository(assetStore)

    /** 学习路径仓库 */
    val learningPathRepository = LearningPathRepository(assetStore, moduleRepository)

    /** 主题偏好 */
    val themePreferences = ThemePreferences(context)

    /** 阅读历史 */
    val historyPreferences = HistoryPreferences(context)

    /** 更新偏好（自动检查开关 / 忽略版本 / 上次检查时间） */
    val updatePreferences = UpdatePreferences(context)
}
