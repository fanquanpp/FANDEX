package com.fandexpp.fandex.app_mobile

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private lateinit var vibrator: Vibrator

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as Vibrator
        }

        // GeoHaptics — 触感模式：tick / doubleTick / thud / success
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "fandex/haptics")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "pattern" -> {
                        playPattern(call.arguments as? String ?: "tick")
                        result.success("ok")
                    }
                    else -> result.notImplemented()
                }
            }

        // 更新安装 — FileProvider 调起系统安装器
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "fandex/updater")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "installApk" -> {
                        val path = call.arguments as? String
                        if (path == null) {
                            result.error("ARG", "path required", null)
                        } else {
                            installApk(path)
                            result.success("ok")
                        }
                    }
                    else -> result.notImplemented()
                }
            }

        // 外链
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "fandex/external")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "openExternal" -> {
                        val url = call.arguments as? String
                        if (url != null) {
                            try {
                                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                result.success("ok")
                            } catch (e: Exception) {
                                result.error("NO_ACTIVITY", e.message, null)
                            }
                        } else {
                            result.error("ARG", "url required", null)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun playPattern(name: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val effect = when (name) {
            "tick" -> VibrationEffect.createOneShot(18, 90)
            "doubleTick" -> VibrationEffect.createWaveform(longArrayOf(0, 16, 60, 16), intArrayOf(0, 110, 0, 110), -1)
            "thud" -> VibrationEffect.createOneShot(34, 170)
            "success" -> VibrationEffect.createWaveform(longArrayOf(0, 20, 70, 34), intArrayOf(0, 130, 0, 190), -1)
            else -> VibrationEffect.createOneShot(18, 90)
        }
        vibrator.vibrate(effect)
    }

    private fun installApk(path: String) {
        val file = File(path)
        val uri: Uri = FileProvider.getUriForFile(
            this,
            "$packageName.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }
}
