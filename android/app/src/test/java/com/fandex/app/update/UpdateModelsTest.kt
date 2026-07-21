package com.fandex.app.update

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * UpdateModels 单元测试
 *
 * 测试目标：
 * - GitHubRelease / GitHubAsset 数据模型默认值（兼容 Gson 缺失字段反序列化）
 * - UpdateInfo 字段填充正确性
 * - DownloadState 状态机各子类实例化与字段
 * - CheckState 状态机各子类实例化与字段
 * - UpdateChecker.computeVersionCode 版本号计算逻辑（通过反射访问 private 方法）
 * - UpdateChecker.parseVersionName 版本名解析逻辑（通过反射访问 private 方法）
 *
 * 测试策略：
 * - 数据模型测试：直接构造实例，断言字段值
 * - sealed class 测试：验证子类继承关系与 when 分支可穷举性
 * - private 方法测试：通过 Kotlin 反射访问，避免修改生产代码可见性
 *   覆盖 Task 50.7「版本号比较逻辑」要求
 */
class UpdateModelsTest {

    /**
     * 测试 GitHubRelease 默认值
     *
     * 设计意图：Gson 反序列化时若 JSON 缺失字段，应使用默认值避免 NPE
     */
    @Test
    fun `GitHubRelease 默认值正确`() {
        val release = GitHubRelease()
        assertEquals("", release.tagName)
        assertEquals("", release.name)
        assertEquals("", release.body)
        assertEquals("", release.publishedAt)
        assertEquals("", release.htmlUrl)
        assertTrue("assets 默认应为空列表", release.assets.isEmpty())
    }

    /**
     * 测试 GitHubAsset 默认值
     */
    @Test
    fun `GitHubAsset 默认值正确`() {
        val asset = GitHubAsset()
        assertEquals("", asset.name)
        assertEquals(0L, asset.size)
        assertEquals("", asset.downloadUrl)
        assertEquals("", asset.contentType)
    }

    /**
     * 测试 GitHubRelease 字段赋值
     */
    @Test
    fun `GitHubRelease 字段赋值正确`() {
        val asset = GitHubAsset(
            name = "FANDEX-v3.0.0.apk",
            size = 10485760L,
            downloadUrl = "https://objects.githubusercontent.com/FANDEX-v3.0.0.apk",
            contentType = "application/vnd.android.package-archive"
        )
        val release = GitHubRelease(
            tagName = "v3.0.0",
            name = "FANDEX v3.0.0",
            body = "## 更新内容",
            publishedAt = "2026-07-19T10:00:00Z",
            htmlUrl = "https://github.com/fanquanpp/FANDEX-App/releases/tag/v3.0.0",
            assets = listOf(asset)
        )

        assertEquals("v3.0.0", release.tagName)
        assertEquals("FANDEX v3.0.0", release.name)
        assertEquals("## 更新内容", release.body)
        assertEquals("2026-07-19T10:00:00Z", release.publishedAt)
        assertEquals(1, release.assets.size)
        assertEquals("FANDEX-v3.0.0.apk", release.assets[0].name)
        assertEquals(10485760L, release.assets[0].size)
    }

    /**
     * 测试 UpdateInfo 字段
     */
    @Test
    fun `UpdateInfo 字段赋值正确`() {
        val info = UpdateInfo(
            latestVersion = "3.1.0",
            latestVersionCode = 30100,
            downloadUrl = "https://example.com/apk",
            downloadSize = 1024L,
            releaseNotes = "release notes",
            publishedAt = "2026-07-19T10:00:00Z",
            htmlUrl = "https://github.com/release",
            isUpdateAvailable = true
        )

        assertEquals("3.1.0", info.latestVersion)
        assertEquals(30100, info.latestVersionCode)
        assertTrue(info.isUpdateAvailable)
    }

    /**
     * 测试 DownloadState 状态机
     *
     * 验证各子类可正确实例化，且 sealed class 类型归属正确
     */
    @Test
    fun `DownloadState 状态机子类正确实例化`() {
        val idle: DownloadState = DownloadState.Idle
        val downloading: DownloadState = DownloadState.Downloading(
            progress = 50,
            downloadedBytes = 1024L,
            totalBytes = 2048L
        )
        val completed: DownloadState = DownloadState.Completed(File("/tmp/test.apk"))
        val failed: DownloadState = DownloadState.Failed("网络错误")

        assertTrue("Idle 应为 DownloadState 子类", idle is DownloadState)
        assertTrue("Downloading 应为 DownloadState 子类", downloading is DownloadState)
        assertTrue("Completed 应为 DownloadState 子类", completed is DownloadState)
        assertTrue("Failed 应为 DownloadState 子类", failed is DownloadState)

        /* 验证 Downloading 字段 */
        val downloadingState = downloading as DownloadState.Downloading
        assertEquals(50, downloadingState.progress)
        assertEquals(1024L, downloadingState.downloadedBytes)
        assertEquals(2048L, downloadingState.totalBytes)

        /* 验证 Completed 字段 */
        val completedState = completed as DownloadState.Completed
        assertEquals(File("/tmp/test.apk"), completedState.file)

        /* 验证 Failed 字段 */
        val failedState = failed as DownloadState.Failed
        assertEquals("网络错误", failedState.message)
    }

    /**
     * 测试 DownloadState when 分支穷举性
     *
     * 设计意图：sealed class 的核心价值是 when 穷举检查，
     *           新增子类时编译器会强制要求覆盖，避免遗漏
     */
    @Test
    fun `DownloadState when 分支穷举`() {
        fun describe(state: DownloadState): String = when (state) {
            is DownloadState.Idle -> "idle"
            is DownloadState.Downloading -> "downloading-${state.progress}"
            is DownloadState.Completed -> "completed-${state.file.name}"
            is DownloadState.Failed -> "failed-${state.message}"
        }

        assertEquals("idle", describe(DownloadState.Idle))
        assertEquals("downloading-75", describe(DownloadState.Downloading(75, 100L, 200L)))
        assertEquals("completed-test.apk", describe(DownloadState.Completed(File("test.apk"))))
        assertEquals("failed-timeout", describe(DownloadState.Failed("timeout")))
    }

    /**
     * 测试 CheckState 状态机
     */
    @Test
    fun `CheckState 状态机子类正确实例化`() {
        val idle: CheckState = CheckState.Idle
        val checking: CheckState = CheckState.Checking
        val upToDate: CheckState = CheckState.UpToDate
        val available: CheckState = CheckState.Available(
            UpdateInfo(
                latestVersion = "3.1.0",
                latestVersionCode = 30100,
                downloadUrl = "url",
                downloadSize = 100L,
                releaseNotes = "notes",
                publishedAt = "2026-07-19",
                htmlUrl = "html",
                isUpdateAvailable = true
            )
        )
        val failed: CheckState = CheckState.Failed("error")

        assertTrue(idle is CheckState)
        assertTrue(checking is CheckState)
        assertTrue(upToDate is CheckState)
        assertTrue(available is CheckState)
        assertTrue(failed is CheckState)

        /* 验证 Available 字段 */
        val availableState = available as CheckState.Available
        assertEquals("3.1.0", availableState.updateInfo.latestVersion)
        assertTrue(availableState.updateInfo.isUpdateAvailable)

        /* 验证 Failed 字段 */
        val failedState = failed as CheckState.Failed
        assertEquals("error", failedState.message)
    }

    /**
     * 测试 CheckState when 分支穷举性
     */
    @Test
    fun `CheckState when 分支穷举`() {
        fun describe(state: CheckState): String = when (state) {
            is CheckState.Idle -> "idle"
            is CheckState.Checking -> "checking"
            is CheckState.UpToDate -> "uptodate"
            is CheckState.Available -> "available-${state.updateInfo.latestVersion}"
            is CheckState.Failed -> "failed-${state.message}"
        }

        assertEquals("idle", describe(CheckState.Idle))
        assertEquals("checking", describe(CheckState.Checking))
        assertEquals("uptodate", describe(CheckState.UpToDate))
        assertEquals(
            "available-3.1.0",
            describe(
                CheckState.Available(
                    UpdateInfo(
                        latestVersion = "3.1.0",
                        latestVersionCode = 30100,
                        downloadUrl = "",
                        downloadSize = 0L,
                        releaseNotes = "",
                        publishedAt = "",
                        htmlUrl = "",
                        isUpdateAvailable = true
                    )
                )
            )
        )
        assertEquals("failed-timeout", describe(CheckState.Failed("timeout")))
    }

    /**
     * 测试 DownloadState.Idle 与 DownloadState.Checking 的单例性
     *
     * 设计意图：object 声明的子类应为单例，多次引用应指向同一实例
     */
    @Test
    fun `DownloadState Idle 与 CheckState Idle Checking UpToDate 为单例`() {
        assertSame(DownloadState.Idle, DownloadState.Idle)
        assertSame(CheckState.Idle, CheckState.Idle)
        assertSame(CheckState.Checking, CheckState.Checking)
        assertSame(CheckState.UpToDate, CheckState.UpToDate)
    }

    /**
     * 辅助断言：两引用相等
     */
    private fun assertSame(expected: Any?, actual: Any?) {
        assertTrue("期望两个引用相等: $expected vs $actual", expected === actual)
    }

    /**
     * 测试 UpdateChecker.computeVersionCode 版本号计算逻辑
     *
     * 通过反射访问 private 方法，覆盖以下场景：
     * - 标准版本号 "3.0.0" -> 30000
     * - 带 v 前缀 "v3.1.5" 由 parseVersionName 先去除前缀
     * - 多位 patch "3.1.10" -> 30110
     * - 大版本号 "10.2.3" -> 100203
     * - 缺失 patch "3.1" -> 30100
     * - 非数字段 "3.x.0" -> 30000 (x 按 0 处理)
     */
    @Test
    fun `computeVersionCode 版本号计算逻辑`() {
        val checker = createCheckerForReflection()
        val computeVersionCode = UpdateChecker::class.java
            .getDeclaredMethod("computeVersionCode", String::class.java)
            .apply { isAccessible = true }

        assertEquals(30000, computeVersionCode.invoke(checker, "3.0.0"))
        assertEquals(30100, computeVersionCode.invoke(checker, "3.1.0"))
        assertEquals(30105, computeVersionCode.invoke(checker, "3.1.5"))
        assertEquals(30110, computeVersionCode.invoke(checker, "3.1.10"))
        assertEquals(100203, computeVersionCode.invoke(checker, "10.2.3"))
        assertEquals(30100, computeVersionCode.invoke(checker, "3.1"))
        assertEquals(30000, computeVersionCode.invoke(checker, "3"))
        assertEquals(30000, computeVersionCode.invoke(checker, "3.x.0"))
        assertEquals(0, computeVersionCode.invoke(checker, ""))
    }

    /**
     * 测试 UpdateChecker.parseVersionName 版本名解析逻辑
     *
     * 覆盖以下场景：
     * - 小写 v 前缀 "v3.0.0" -> "3.0.0"
     * - 大写 V 前缀 "V3.0.0" -> "3.0.0"
     * - 无前缀 "3.0.0" -> "3.0.0"
     * - 带空格输入：" v3.0.0 "（注意 removePrefix 是字面匹配，前导空格导致 v 不被移除，
     *   仅 trim() 生效，结果为 "v3.0.0"）
     *
     * 设计说明：parseVersionName 内部实现为
     *   `tagName.removePrefix("v").removePrefix("V").trim()`
     * 不对前导空格做特殊处理，仅靠 trim() 去除首尾空白。
     */
    @Test
    fun `parseVersionName 版本名解析逻辑`() {
        val checker = createCheckerForReflection()
        val parseVersionName = UpdateChecker::class.java
            .getDeclaredMethod("parseVersionName", String::class.java)
            .apply { isAccessible = true }

        assertEquals("3.0.0", parseVersionName.invoke(checker, "v3.0.0"))
        assertEquals("3.0.0", parseVersionName.invoke(checker, "V3.0.0"))
        assertEquals("3.0.0", parseVersionName.invoke(checker, "3.0.0"))
        /* 带前导空格：removePrefix("v") 不生效，trim 后为 "v3.0.0" */
        assertEquals("v3.0.0", parseVersionName.invoke(checker, " v3.0.0 "))
    }

    /**
     * 构造 UpdateChecker 实例用于反射测试
     *
     * 设计说明：
     * - UpdateChecker 构造参数需要 Context / OkHttpClient / Gson
     * - 此处不发起真实网络请求，仅用于反射调用 private 方法
     * - 使用 Mockito mock Context 与简单 OkHttpClient
     */
    private fun createCheckerForReflection(): UpdateChecker {
        val mockContext = org.mockito.kotlin.mock<android.content.Context>()
        val client = okhttp3.OkHttpClient.Builder().build()
        val gson = com.google.gson.Gson()
        return UpdateChecker(mockContext, client, gson)
    }

    /**
     * 测试版本对比的等价性与有序性
     *
     * 通过 computeVersionCode 验证版本号大小关系：
     * - 3.1.0 > 3.0.0
     * - 3.0.1 > 3.0.0
     * - 3.0.0 == 3.0.0
     * - 2.9.9 < 3.0.0
     */
    @Test
    fun `版本码大小关系正确`() {
        val checker = createCheckerForReflection()
        val computeVersionCode = UpdateChecker::class.java
            .getDeclaredMethod("computeVersionCode", String::class.java)
            .apply { isAccessible = true }

        val v300 = computeVersionCode.invoke(checker, "3.0.0") as Int
        val v301 = computeVersionCode.invoke(checker, "3.0.1") as Int
        val v310 = computeVersionCode.invoke(checker, "3.1.0") as Int
        val v299 = computeVersionCode.invoke(checker, "2.9.9") as Int

        assertTrue("3.1.0 应大于 3.0.0", v310 > v300)
        assertTrue("3.0.1 应大于 3.0.0", v301 > v300)
        assertEquals("3.0.0 应等于自身", v300, computeVersionCode.invoke(checker, "3.0.0"))
        assertTrue("2.9.9 应小于 3.0.0", v299 < v300)
        assertNotEquals("3.0.0 与 3.0.1 应不相等", v300, v301)
    }
}
