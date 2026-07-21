package com.fandex.app.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * DataStoreManager 偏好持久化单元测试（覆盖 Task 51 目标）
 *
 * 测试目标：
 * - dynamicBackground 读写一致（默认 true）
 * - autoCheckUpdate 读写一致（默认 true）
 * - ignoredUpdateVersion 读写一致（默认空字符串）
 * - lastUpdateCheckTime 读写一致（默认 0L）
 * - 写入后重新读取数据保留（模拟应用重启）
 *
 * 测试策略：
 * - 使用 Robolectric 提供真实 Android Context（ApplicationProvider）
 * - 使用 runTest 协程测试调度器，验证 suspend 函数行为
 * - 通过先写后读的方式验证持久化链路完整
 *
 * 注意事项：
 * - DataStoreManager 是 object 单例，其内部 Context.dataStore 扩展属性
 *   会为不同 Context 创建不同 DataStore 文件，测试间不会相互干扰
 * - @Config sdk = 33 以避免 Robolectric 4.16 在 SDK 34+ 上的潜在兼容问题
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class DataStoreManagerTest {

    /** 应用级 Context，由 Robolectric 提供 */
    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Before
    fun setUp() = runTest {
        /* 重置所有偏好为已知状态，避免测试间数据污染 */
        DataStoreManager.saveDynamicBackground(context, true)
        DataStoreManager.saveAutoCheckUpdate(context, true)
        DataStoreManager.saveIgnoredUpdateVersion(context, "")
        DataStoreManager.saveLastUpdateCheckTime(context, 0L)
    }

    /**
     * 测试 dynamicBackground 默认值与读写一致
     */
    @Test
    fun `dynamicBackground 默认值与读写一致`() = runTest {
        /* 默认值验证（setUp 已写入 true，故此处读取应为 true） */
        val initialValue = DataStoreManager.getDynamicBackground(context).first()
        assertTrue("默认值应为 true", initialValue)

        /* 写入 false 后读取 */
        DataStoreManager.saveDynamicBackground(context, false)
        val afterDisable = DataStoreManager.getDynamicBackground(context).first()
        assertFalse("关闭动态背景后应读取 false", afterDisable)

        /* 再次写回 true */
        DataStoreManager.saveDynamicBackground(context, true)
        val afterReEnable = DataStoreManager.getDynamicBackground(context).first()
        assertTrue("重新开启动态背景后应读取 true", afterReEnable)
    }

    /**
     * 测试 autoCheckUpdate 默认值与读写一致
     */
    @Test
    fun `autoCheckUpdate 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getAutoCheckUpdate(context).first()
        assertTrue("默认值应为 true", initialValue)

        DataStoreManager.saveAutoCheckUpdate(context, false)
        val afterDisable = DataStoreManager.getAutoCheckUpdate(context).first()
        assertFalse("关闭自动检查更新后应读取 false", afterDisable)

        DataStoreManager.saveAutoCheckUpdate(context, true)
        val afterReEnable = DataStoreManager.getAutoCheckUpdate(context).first()
        assertTrue("重新开启自动检查更新后应读取 true", afterReEnable)
    }

    /**
     * 测试 ignoredUpdateVersion 默认值与读写一致
     */
    @Test
    fun `ignoredUpdateVersion 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("默认值应为空字符串", "", initialValue)

        DataStoreManager.saveIgnoredUpdateVersion(context, "3.1.0")
        val afterIgnore = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("3.1.0", afterIgnore)

        /* 测试版本号格式多样性 */
        DataStoreManager.saveIgnoredUpdateVersion(context, "v3.2.0-beta")
        val complexVersion = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("v3.2.0-beta", complexVersion)

        /* 清空忽略版本 */
        DataStoreManager.saveIgnoredUpdateVersion(context, "")
        val afterClear = DataStoreManager.getIgnoredUpdateVersion(context).first()
        assertEquals("清空后应读取空字符串", "", afterClear)
    }

    /**
     * 测试 lastUpdateCheckTime 默认值与读写一致
     */
    @Test
    fun `lastUpdateCheckTime 默认值与读写一致`() = runTest {
        val initialValue = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals("默认值应为 0L", 0L, initialValue)

        val timestamp1 = 1721400000000L
        DataStoreManager.saveLastUpdateCheckTime(context, timestamp1)
        val afterWrite = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals(timestamp1, afterWrite)

        /* 更新为更晚的时间戳（模拟再次检查） */
        val timestamp2 = 1721403600000L
        DataStoreManager.saveLastUpdateCheckTime(context, timestamp2)
        val afterUpdate = DataStoreManager.getLastUpdateCheckTime(context).first()
        assertEquals(timestamp2, afterUpdate)
    }

    /**
     * 测试应用重启后数据保留
     *
     * 设计说明：
     * - DataStore 底层写入磁盘文件，重启应用后应保留
     * - Robolectric 中 Context 是单例，DataStore 文件路径固定
     * - 此处通过先写入、再读取的方式模拟"重启"场景
     *   （真正的"重启"需重启 JVM，单测中难以模拟，但底层文件持久化保证此行为）
     */
    @Test
    fun `偏好设置写入后立即读取数据保留`() = runTest {
        DataStoreManager.saveDynamicBackground(context, false)
        DataStoreManager.saveAutoCheckUpdate(context, false)
        DataStoreManager.saveIgnoredUpdateVersion(context, "9.9.9")
        DataStoreManager.saveLastUpdateCheckTime(context, 1234567890L)

        /* 立即读取验证持久化链路完整 */
        assertEquals(false, DataStoreManager.getDynamicBackground(context).first())
        assertEquals(false, DataStoreManager.getAutoCheckUpdate(context).first())
        assertEquals("9.9.9", DataStoreManager.getIgnoredUpdateVersion(context).first())
        assertEquals(1234567890L, DataStoreManager.getLastUpdateCheckTime(context).first())
    }

    /**
     * 测试多个偏好字段互不干扰
     *
     * 设计意图：DataStore 单文件存储所有字段，验证字段间互不影响
     */
    @Test
    fun `多个偏好字段互不干扰`() = runTest {
        /* 设置差异化值 */
        DataStoreManager.saveDynamicBackground(context, false)
        DataStoreManager.saveAutoCheckUpdate(context, true)
        DataStoreManager.saveIgnoredUpdateVersion(context, "1.2.3")
        DataStoreManager.saveLastUpdateCheckTime(context, 999999L)

        /* 再次单独修改一个字段 */
        DataStoreManager.saveDynamicBackground(context, true)

        /* 其他字段不应受影响 */
        assertEquals(true, DataStoreManager.getDynamicBackground(context).first())
        assertEquals(true, DataStoreManager.getAutoCheckUpdate(context).first())
        assertEquals("1.2.3", DataStoreManager.getIgnoredUpdateVersion(context).first())
        assertEquals(999999L, DataStoreManager.getLastUpdateCheckTime(context).first())
    }
}
