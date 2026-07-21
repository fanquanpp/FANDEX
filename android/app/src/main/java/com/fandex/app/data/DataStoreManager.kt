package com.fandex.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * 应用设置持久化管理
 *
 * 功能：使用 DataStore Preferences 持久化存储用户偏好设置
 * 输入：Context 对象
 * 输出：Flow 形式的设置值，支持异步读取和写入
 *
 * 持久化项：
 * - isDarkMode: 是否深色模式（默认 true）
 * - fontSizeScale: 字体缩放比例（默认 1.0，范围 0.8-1.4）
 * - isSplashEnabled: 启动页开关（默认 true）
 * - dynamicBackground: 动态背景装饰开关（默认 true，控制 6 层装饰系统中的动画层）
 * - autoCheckUpdate: 自动检查更新开关（默认 true，启动后 5s 静默检查）
 * - ignoredUpdateVersion: 用户主动忽略的更新版本号（默认空字符串，该版本不再提示）
 * - lastUpdateCheckTime: 上次检查更新的时间戳（默认 0，用于频率限制）
 */
object DataStoreManager {

    /** DataStore 实例（懒加载，全局单例） */
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fandex_settings")

    /** 深色模式偏好键 */
    private val KEY_IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")

    /** 字体缩放偏好键 */
    private val KEY_FONT_SIZE_SCALE = floatPreferencesKey("font_size_scale")

    /** 启动页开关偏好键 */
    private val KEY_IS_SPLASH_ENABLED = booleanPreferencesKey("is_splash_enabled")

    /** 动态背景装饰开关偏好键（控制 L1/L2/L3/L5 动画层） */
    private val KEY_DYNAMIC_BACKGROUND = booleanPreferencesKey("dynamic_background")

    /** 自动检查更新开关偏好键 */
    private val KEY_AUTO_CHECK_UPDATE = booleanPreferencesKey("auto_check_update")

    /** 用户忽略的更新版本号偏好键 */
    private val KEY_IGNORED_UPDATE_VERSION = stringPreferencesKey("ignored_update_version")

    /** 上次检查更新时间戳偏好键（epoch millis） */
    private val KEY_LAST_UPDATE_CHECK_TIME = androidx.datastore.preferences.core.longPreferencesKey("last_update_check_time")

    /**
     * 读取深色模式设置
     *
     * 输入：Context
     * 输出：Flow<Boolean>，默认 true（深色）
     */
    fun getDarkMode(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_IS_DARK_MODE] ?: true }
    }

    /**
     * 保存深色模式设置
     *
     * 输入：Context、是否深色
     * 输出：无（异步写入）
     */
    suspend fun saveDarkMode(context: Context, isDark: Boolean) {
        context.dataStore.edit { it[KEY_IS_DARK_MODE] = isDark }
    }

    /**
     * 读取字体缩放设置
     *
     * 输入：Context
     * 输出：Flow<Float>，默认 1.0
     */
    fun getFontSizeScale(context: Context): Flow<Float> {
        return context.dataStore.data.map { it[KEY_FONT_SIZE_SCALE] ?: 1.0f }
    }

    /**
     * 保存字体缩放设置
     *
     * 输入：Context、缩放比例
     * 输出：无（异步写入）
     */
    suspend fun saveFontSizeScale(context: Context, scale: Float) {
        val clamped = scale.coerceIn(0.8f, 1.4f)
        context.dataStore.edit { it[KEY_FONT_SIZE_SCALE] = clamped }
    }

    /**
     * 读取启动页开关设置
     *
     * 输入：Context
     * 输出：Flow<Boolean>，默认 true（开启启动页）
     */
    fun getSplashEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_IS_SPLASH_ENABLED] ?: true }
    }

    /**
     * 保存启动页开关设置
     *
     * 输入：Context、是否开启启动页
     * 输出：无（异步写入）
     */
    suspend fun saveSplashEnabled(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_IS_SPLASH_ENABLED] = enabled }
    }

    /**
     * 读取动态背景装饰开关
     *
     * 输入：Context
     * 输出：Flow<Boolean>，默认 true（开启动态背景）
     *
     * 说明：控制背景装饰系统中的动画层（L1 粒子层）。
     * v3.6.0：L5 光标光晕层已移除，L2 渐变球层在 v3.1.0 已移除，本开关现仅控制 L1 粒子层。
     * 静态层（L3 网格点阵 / L4 几何装饰）始终开启，不受此开关影响。
     * 关闭后可降低电量消耗与 GPU 占用，适用于低端设备或省电模式。
     */
    fun getDynamicBackground(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_DYNAMIC_BACKGROUND] ?: true }
    }

    /**
     * 保存动态背景装饰开关
     *
     * 输入：Context、是否开启动态背景
     * 输出：无（异步写入）
     */
    suspend fun saveDynamicBackground(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_DYNAMIC_BACKGROUND] = enabled }
    }

    /**
     * 读取自动检查更新开关
     *
     * 输入：Context
     * 输出：Flow<Boolean>，默认 true（启动后 5s 静默检查）
     */
    fun getAutoCheckUpdate(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { it[KEY_AUTO_CHECK_UPDATE] ?: true }
    }

    /**
     * 保存自动检查更新开关
     *
     * 输入：Context、是否开启自动检查
     * 输出：无（异步写入）
     */
    suspend fun saveAutoCheckUpdate(context: Context, enabled: Boolean) {
        context.dataStore.edit { it[KEY_AUTO_CHECK_UPDATE] = enabled }
    }

    /**
     * 读取用户忽略的更新版本号
     *
     * 输入：Context
     * 输出：Flow<String>，默认空字符串（未忽略任何版本）
     *
     * 说明：用户点击"忽略此版本"后，该版本号会被记录。
     * 后续检查更新时若最新版本与忽略版本一致，则不再弹窗提示。
     */
    fun getIgnoredUpdateVersion(context: Context): Flow<String> {
        return context.dataStore.data.map { it[KEY_IGNORED_UPDATE_VERSION] ?: "" }
    }

    /**
     * 保存用户忽略的更新版本号
     *
     * 输入：Context、版本号字符串
     * 输出：无（异步写入）
     */
    suspend fun saveIgnoredUpdateVersion(context: Context, version: String) {
        context.dataStore.edit { it[KEY_IGNORED_UPDATE_VERSION] = version }
    }

    /**
     * 读取上次检查更新的时间戳
     *
     * 输入：Context
     * 输出：Flow<Long>，默认 0（从未检查过）
     *
     * 说明：用于频率限制，避免短时间内重复发起网络请求。
     * 默认策略：手动检查 1 小时内不重复，自动检查 24 小时内不重复。
     */
    fun getLastUpdateCheckTime(context: Context): Flow<Long> {
        return context.dataStore.data.map { it[KEY_LAST_UPDATE_CHECK_TIME] ?: 0L }
    }

    /**
     * 保存上次检查更新的时间戳
     *
     * 输入：Context、时间戳（epoch millis）
     * 输出：无（异步写入）
     */
    suspend fun saveLastUpdateCheckTime(context: Context, timestamp: Long) {
        context.dataStore.edit { it[KEY_LAST_UPDATE_CHECK_TIME] = timestamp }
    }
}
