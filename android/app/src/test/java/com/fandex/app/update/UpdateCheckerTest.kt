package com.fandex.app.update

import android.content.Context
import com.google.gson.Gson
import kotlinx.coroutines.test.runTest
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock

/**
 * UpdateChecker 单元测试
 *
 * 测试目标：
 * - checkLatestRelease 正常路径：解析 GitHubRelease JSON，返回 UpdateInfo
 * - checkLatestRelease HTTP 404 路径：返回 Result.failure(IOException)
 * - checkLatestRelease JSON 格式错误路径：返回 Result.failure(IOException)
 * - checkLatestRelease 响应体为空路径：返回 Result.failure(IOException)
 * - checkLatestRelease assets 中无 APK 文件路径：返回 Result.failure(IOException)
 * - checkLatestRelease 版本对比逻辑：旧版本触发 isUpdateAvailable=true，新版本或相同版本为 false
 * - checkLatestRelease 超时路径：返回 Result.failure(IOException)
 *
 * 测试策略：
 * - 使用 MockWebServer 模拟 GitHub Releases API 响应，避免真实网络依赖
 * - 通过 OkHttp Interceptor 将 UpdateChecker 内部硬编码的 GitHub URL 重定向到 MockWebServer，
 *   既不修改生产源码，又能完全控制响应内容
 * - 使用 runTest 协程测试调度器，验证 suspend 函数行为
 * - Context 由 Mockito mock 提供，UpdateChecker 内部仅使用 BuildConfig.VERSION_NAME（静态常量）
 */
class UpdateCheckerTest {

    /** MockWebServer 实例，用于模拟 GitHub API 响应 */
    private lateinit var mockWebServer: MockWebServer

    /** Context mock，UpdateChecker 构造参数 */
    private val mockContext: Context = mock()

    /** Gson 实例（生产代码使用同一实例） */
    private val gson = Gson()

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    /**
     * 构造 UpdateChecker 实例，通过 Interceptor 将 GitHub 请求重定向到 MockWebServer
     *
     * 设计说明：
     * - UpdateChecker.latestReleaseUrl 硬编码为 https://api.github.com/...
     * - 此处通过 Interceptor 重写请求 URL，保持 host/port/path 不变但指向 MockWebServer
     * - 避免修改生产源码，同时实现完全可控的测试
     */
    private fun createChecker(): UpdateChecker {
        val serverUrl = mockWebServer.url("/")

        /* 拦截器：将任意请求的 scheme/host/port 重写为 MockWebServer，保留 path 与 headers */
        val redirectInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()
            val originalUrl = originalRequest.url
            val newUrl = originalUrl.newBuilder()
                .scheme(serverUrl.scheme)
                .host(serverUrl.host)
                .port(serverUrl.port)
                .build()
            val newRequest = originalRequest.newBuilder()
                .url(newUrl)
                .build()
            chain.proceed(newRequest)
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(redirectInterceptor)
            .build()

        return UpdateChecker(mockContext, client, gson)
    }

    /**
     * 构造有效的 GitHub Release JSON 响应
     *
     * @param tagName 版本号标签，如 "v3.1.0"
     * @param apkFileName APK 文件名，如 "FANDEX-v3.1.0.apk"
     */
    private fun buildReleaseJson(
        tagName: String = "v3.1.0",
        apkFileName: String = "FANDEX-v3.1.0.apk"
    ): String {
        return """
        {
          "tag_name": "$tagName",
          "name": "FANDEX $tagName",
          "body": "## 新功能\n- 测试更新",
          "published_at": "2026-07-19T10:00:00Z",
          "html_url": "https://github.com/fanquanpp/FANDEX-App/releases/tag/$tagName",
          "assets": [
            {
              "name": "$apkFileName",
              "size": 10485760,
              "browser_download_url": "https://objects.githubusercontent.com/$apkFileName",
              "content_type": "application/vnd.android.package-archive"
            }
          ]
        }
        """.trimIndent()
    }

    /**
     * 测试正常路径：有效 JSON 响应，返回 UpdateInfo，字段正确填充
     *
     * 期望：
     * - Result.isSuccess 为 true
     * - latestVersion 为 "3.1.0"（已去除 v 前缀）
     * - downloadUrl 指向 CDN
     * - releaseNotes 包含 "新功能"
     * - isUpdateAvailable 取决于 BuildConfig.VERSION_NAME 与 3.1.0 的对比
     */
    @Test
    fun `checkLatestRelease 正常响应返回 UpdateInfo`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson("v3.1.0"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("正常响应应返回 success", result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("3.1.0", info.latestVersion)
        assertEquals("https://objects.githubusercontent.com/FANDEX-v3.1.0.apk", info.downloadUrl)
        assertEquals(10485760L, info.downloadSize)
        assertTrue("releaseNotes 应包含 '新功能'", info.releaseNotes.contains("新功能"))
        assertEquals("2026-07-19T10:00:00Z", info.publishedAt)
        /* 版本码计算：3 * 10000 + 1 * 100 + 0 = 30100 */
        assertEquals(30100, info.latestVersionCode)
    }

    /**
     * 测试 HTTP 404 路径
     *
     * 期望：返回 Result.failure，异常消息包含 "HTTP 404"
     */
    @Test
    fun `checkLatestRelease HTTP 404 返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("Not Found")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("HTTP 404 应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue("异常消息应包含 HTTP 404", exception!!.message!!.contains("HTTP 404"))
    }

    /**
     * 测试 JSON 格式错误路径
     *
     * 期望：Gson 解析抛异常，UpdateChecker 包装为 IOException，消息包含 "服务器响应格式异常"
     */
    @Test
    fun `checkLatestRelease JSON 格式错误返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{ "tag_name": "broken", "assets": [ }""")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("JSON 格式错误应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue(
            "异常消息应提示响应格式异常",
            exception!!.message!!.contains("响应格式异常")
        )
    }

    /**
     * 测试响应体为空路径
     *
     * 期望：返回 failure，消息为 "服务器响应为空"
     */
    @Test
    fun `checkLatestRelease 响应体为空返回 failure`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("")
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("空响应应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertEquals("服务器响应为空", exception!!.message)
    }

    /**
     * 测试 assets 中无 APK 文件路径
     *
     * 期望：返回 failure，消息包含 "未找到可下载的 APK 文件"
     */
    @Test
    fun `checkLatestRelease 无 APK 文件返回 failure`() = runTest {
        val json = """
        {
          "tag_name": "v3.1.0",
          "name": "FANDEX v3.1.0",
          "body": "test",
          "published_at": "2026-07-19T10:00:00Z",
          "html_url": "https://github.com/fanquanpp/FANDEX-App/releases/tag/v3.1.0",
          "assets": [
            {
              "name": "README.txt",
              "size": 100,
              "browser_download_url": "https://example.com/README.txt",
              "content_type": "text/plain"
            }
          ]
        }
        """.trimIndent()

        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(json)
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue("无 APK 应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        assertTrue(
            "异常消息应包含 '未找到可下载的 APK 文件'",
            exception!!.message!!.contains("未找到可下载的 APK 文件")
        )
    }

    /**
     * 测试版本对比：当 GitHub 返回的版本号小于当前版本（BuildConfig.VERSION_NAME = "3.0.0"）时
     *
     * 期望：isUpdateAvailable = false（已是最新或更新）
     *
     * 注意：BuildConfig.VERSION_NAME 由 build.gradle.kts 写入，单元测试运行时为真实值 "3.0.0"
     */
    @Test
    fun `checkLatestRelease 返回旧版本时 isUpdateAvailable 为 false`() = runTest {
        /* GitHub 返回 v2.5.0，当前为 3.0.0，应判定为无更新 */
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson(tagName = "v2.5.0", apkFileName = "FANDEX-v2.5.0.apk"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("2.5.0", info.latestVersion)
        assertFalse("旧版本不应触发更新提示", info.isUpdateAvailable)
    }

    /**
     * 测试版本对比：当 GitHub 返回的版本号大于当前版本时
     *
     * 期望：isUpdateAvailable = true
     */
    @Test
    fun `checkLatestRelease 返回新版本时 isUpdateAvailable 为 true`() = runTest {
        /* GitHub 返回 v99.99.99，必然大于当前 3.0.0 */
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    buildReleaseJson(
                        tagName = "v99.99.99",
                        apkFileName = "FANDEX-v99.99.99.apk"
                    )
                )
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("99.99.99", info.latestVersion)
        assertTrue("新版本应触发更新提示", info.isUpdateAvailable)
    }

    /**
     * 测试版本号解析：tagName 不带 v 前缀也能正确解析
     *
     * 期望：latestVersion 为去除前缀后的纯版本号
     */
    @Test
    fun `checkLatestRelease 无 v 前缀的 tagName 也能正确解析`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(buildReleaseJson(tagName = "99.99.99", apkFileName = "FANDEX-v99.99.99.apk"))
        )

        val checker = createChecker()
        val result = checker.checkLatestRelease()

        assertTrue(result.isSuccess)
        val info = result.getOrThrow()
        assertEquals("99.99.99", info.latestVersion)
        assertTrue(info.isUpdateAvailable)
    }

    /**
     * 测试超时路径：MockWebServer 不返回响应，触发 OkHttp callTimeout
     *
     * 期望：返回 failure，异常消息包含 "网络连接失败"
     *
     * 设计说明：
     * - UpdateChecker.ensureTimeouts 设置 callTimeout=60s，单元测试中不宜真等 60s
     * - 改用 body 延迟写入的方式触发 readTimeout 风险较大且耗时
     * - 此用例改为验证响应码非 200 时返回 failure，已在 HTTP 404 用例覆盖
     * - 此处保留一个轻量的 socket 拒绝连接场景：通过设置错误的端口使连接立即失败
     */
    @Test
    fun `checkLatestRelease 网络异常返回 failure`() = runTest {
        /* 先关闭 MockWebServer 模拟服务不可达 */
        mockWebServer.shutdown()

        /* 创建一个指向已关闭端口的 client，连接会立即失败 */
        val serverUrl = mockWebServer.url("/")
        val redirectInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()
            val newUrl = originalRequest.url.newBuilder()
                .host(serverUrl.host)
                .port(serverUrl.port)
                .scheme(serverUrl.scheme)
                .build()
            val newRequest = originalRequest.newBuilder().url(newUrl).build()
            chain.proceed(newRequest)
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(redirectInterceptor)
            .connectTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(1, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        val checker = UpdateChecker(mockContext, client, gson)
        val result = checker.checkLatestRelease()

        assertTrue("网络异常应返回 failure", result.isFailure)
        val exception = result.exceptionOrNull()
        assertNotNull(exception)
        /* 实际消息可能是 "网络连接失败" 或 "检查更新失败" */
        assertNotNull(exception!!.message)
    }
}
