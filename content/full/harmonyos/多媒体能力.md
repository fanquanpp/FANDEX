---
order: 60
title: 多媒体能力
module: harmonyos
category: HarmonyOS
difficulty: intermediate
description: 相机、音频与视频
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/手势与交互
  - harmonyos/通知与权限
  - harmonyos/传感器与位置
  - harmonyos/分布式能力
prerequisites:
  - harmonyos/概述与环境搭建
---

## 概述

HarmonyOS 提供了完整的多媒体能力，涵盖相机拍照录像、音频录制与播放、视频播放与录制等功能。这些能力通过 @ohos.multimedia 命名空间下的模块提供，包括 camera（相机）、audio（音频）、media（媒体播放）等。多媒体操作通常需要申请相应权限，并在使用完毕后及时释放资源，避免占用系统硬件。

## 基础概念

**CameraManager**：相机管理器，用于获取相机设备列表、创建相机会话。支持前置/后置摄像头切换、闪光灯控制、对焦模式设置等。

**CameraSession**：相机会话，管理相机输入（CameraInput）、预览输出（PreviewOutput）和拍照输出（PhotoOutput）的连接。需要按顺序配置输入和输出后才能启动会话。

**AudioRenderer**：音频渲染器，用于播放音频数据。支持设置采样率、声道数、编码格式等参数，适合播放 PCM 原始音频。

**AVPlayer**：高级媒体播放器，支持播放本地文件和网络流媒体。支持 MP4、HLS、MP3 等常见格式，提供播放控制、音量调节、倍速播放等能力。

**AudioCapturer**：音频采集器，用于录制音频数据。支持设置采样率和编码格式，适合语音录制场景。

## 快速上手

### 相机预览与拍照

```typescript
import camera from '@ohos.multimedia.camera'

@Component
struct CameraDemo {
  private cameraManager: camera.CameraManager | null = null
  private cameraSession: camera.PhotoSession | null = null

  // 初始化相机
  async initCamera(surfaceId: string) {
    // 获取相机管理器
    this.cameraManager = camera.getCameraManager(getContext(this))
    // 获取可用相机列表
    const cameras = this.cameraManager.getSupportedCameras()

    if (cameras.length === 0) {
      console.error('未找到可用相机')
      return
    }

    // 使用后置摄像头
    const cameraDevice = cameras[0]
    // 创建相机输入
    const cameraInput = this.cameraManager.createCameraInput(cameraDevice)
    await cameraInput.open()

    // 创建预览输出
    const previewOutput = this.cameraManager.createPreviewOutput(
      this.cameraManager.getSupportedOutputCapability(cameraDevice).previewProfiles[0],
      surfaceId
    )

    // 创建拍照输出
    const photoOutput = this.cameraManager.createPhotoOutput(
      this.cameraManager.getSupportedOutputCapability(cameraDevice).photoProfiles[0]
    )

    // 创建会话并配置
    this.cameraSession = this.cameraManager.createPhotoSession(cameraInput, previewOutput, photoOutput)
    await this.cameraSession.start()
  }

  build() {
    Column() {
      Text('相机功能')
        .fontSize(18)
    }
    .padding(20)
  }
}
```

### 音频播放

```typescript
import media from '@ohos.multimedia.media'

@Component
struct AudioPlayerDemo {
  private player: media.AVPlayer | null = null
  @State isPlaying: boolean = false

  // 创建播放器
  async createPlayer() {
    this.player = await media.createAVPlayer()

    // 设置播放状态回调
    this.player.on('stateChange', (state: string) => {
      if (state === 'playing') {
        this.isPlaying = true
      } else if (state === 'paused' || state === 'stopped') {
        this.isPlaying = false
      }
    })

    // 设置播放源
    const context = getContext(this)
    const fileDescriptor = await context.resourceManager.getRawFd('background.mp3')
    this.player.fdSrc = {
      fd: fileDescriptor.fd,
      offset: fileDescriptor.offset,
      length: fileDescriptor.length,
    }
  }

  build() {
    Column({ space: 10 }) {
      Text('音频播放器').fontSize(18)

      Row({ space: 10 }) {
        Button(this.isPlaying ? '暂停' : '播放')
          .onClick(() => {
            if (this.player) {
              if (this.isPlaying) {
                this.player.pause()
              } else {
                this.player.play()
              }
            }
          })

        Button('停止')
          .onClick(() => {
            this.player?.stop()
          })
      }
    }
    .padding(20)
  }
}
```

## 详细用法

### 视频播放

```typescript
import media from '@ohos.multimedia.media'

@Component
struct VideoPlayerDemo {
  private player: media.AVPlayer | null = null
  @State currentTime: number = 0
  @State duration: number = 0
  @State isPlaying: boolean = false

  async initPlayer(surfaceId: string) {
    this.player = await media.createAVPlayer()

    // 设置视频渲染表面
    this.player.surfaceId = surfaceId

    // 监听播放状态
    this.player.on('stateChange', (state: string) => {
      if (state === 'prepared') {
        // 准备就绪，获取时长
        this.duration = this.player?.duration ?? 0
      }
    })

    // 监听播放进度
    this.player.on('timeUpdate', (time: number) => {
      this.currentTime = time
    })

    // 设置播放源
    this.player.url = 'https://example.com/video.mp4'
  }

  build() {
    Column({ space: 10 }) {
      // 视频渲染区域（需要 XComponent 提供表面）
      XComponent({ id: 'videoSurface', type: XComponentType.SURFACE })
        .width('100%')
        .height(200)
        .onLoad(() => {
          // 表面加载完成后初始化播放器
        })

      // 进度条
      Slider({
        value: this.currentTime,
        min: 0,
        max: this.duration,
      })
        .onChange((value) => {
          this.player?.seek(value)
        })

      // 控制按钮
      Row({ space: 10 }) {
        Button(this.isPlaying ? '暂停' : '播放')
          .onClick(() => {
            if (this.isPlaying) {
              this.player?.pause()
            } else {
              this.player?.play()
            }
          })
      }
    }
    .padding(20)
  }
}
```

### 音频录制

```typescript
import media from '@ohos.multimedia.media'

@Component
struct AudioRecorderDemo {
  private recorder: media.AVRecorder | null = null
  @State isRecording: boolean = false
  @State recordTime: number = 0

  async startRecording() {
    this.recorder = await media.createAVRecorder()

    // 配置录音参数
    const config: media.AVRecorderConfig = {
      audioSourceType: media.AudioSourceType.AUDIO_SOURCE_TYPE_MIC,
      profile: {
        audioBitrate: 128000,    // 比特率
        audioChannels: 2,        // 声道数
        audioCodec: media.CodecMimeType.AUDIO_AAC,  // 编码格式
        audioSampleRate: 44100,  // 采样率
        fileFormat: media.ContainerFormatType.CFT_MPEG_4A, // 文件格式
      },
      url: `file://${getContext(this).filesDir}/recording_${Date.now()}.m4a`,
    }

    await this.recorder.prepare(config)
    await this.recorder.start()
    this.isRecording = true
  }

  async stopRecording() {
    if (this.recorder) {
      await this.recorder.stop()
      await this.recorder.release()
      this.recorder = null
    }
    this.isRecording = false
  }

  build() {
    Column({ space: 10 }) {
      Text(this.isRecording ? '录音中...' : '未录音')
        .fontSize(18)

      Button(this.isRecording ? '停止录音' : '开始录音')
        .onClick(() => {
          if (this.isRecording) {
            this.stopRecording()
          } else {
            this.startRecording()
          }
        })
    }
    .padding(20)
  }
}
```

### 相机切换与闪光灯

```typescript
import camera from '@ohos.multimedia.camera'

@Component
struct CameraControlDemo {
  private cameraManager: camera.CameraManager | null = null
  @State isFrontCamera: boolean = false
  @State isFlashOn: boolean = false

  // 切换前后摄像头
  async switchCamera() {
    if (!this.cameraManager) return

    const cameras = this.cameraManager.getSupportedCameras()
    // 根据当前状态选择相反的摄像头
    const targetCamera = this.isFrontCamera ? cameras[0] : cameras[1]

    if (targetCamera) {
      // 重新创建会话...
      this.isFrontCamera = !this.isFrontCamera
    }
  }

  // 切换闪光灯
  async toggleFlash() {
    if (!this.cameraManager) return

    const cameras = this.cameraManager.getSupportedCameras()
    const cameraDevice = cameras[0]
    const hasFlash = this.cameraManager.isFlashModeSupported(cameraDevice, camera.FlashMode.FLASH_MODE_ON)

    if (hasFlash) {
      if (this.isFlashOn) {
        this.cameraManager.setFlashMode(cameraDevice, camera.FlashMode.FLASH_MODE_OFF)
      } else {
        this.cameraManager.setFlashMode(cameraDevice, camera.FlashMode.FLASH_MODE_ON)
      }
      this.isFlashOn = !this.isFlashOn
    }
  }

  build() {
    Row({ space: 10 }) {
      Button(this.isFrontCamera ? '后置' : '前置')
        .onClick(() => this.switchCamera())

      Button(this.isFlashOn ? '关闪光灯' : '开闪光灯')
        .onClick(() => this.toggleFlash())
    }
    .padding(20)
  }
}
```

## 常见场景

### 简易音乐播放器

```typescript
import media from '@ohos.multimedia.media'

interface Song {
  title: string
  artist: string
  url: string
}

@Component
struct MusicPlayerDemo {
  private player: media.AVPlayer | null = null
  @State currentSong: Song | null = null
  @State isPlaying: boolean = false
  @State currentTime: number = 0
  @State duration: number = 0

  playlist: Song[] = [
    { title: '歌曲一', artist: '艺术家A', url: 'https://example.com/song1.mp3' },
    { title: '歌曲二', artist: '艺术家B', url: 'https://example.com/song2.mp3' },
  ]

  async playSong(song: Song) {
    // 释放之前的播放器
    if (this.player) {
      await this.player.release()
    }

    this.player = await media.createAVPlayer()
    this.currentSong = song

    this.player.on('stateChange', (state: string) => {
      if (state === 'prepared') {
        this.player?.play()
      }
    })

    this.player.on('timeUpdate', (time: number) => {
      this.currentTime = time
    })

    this.player.on('durationUpdate', (duration: number) => {
      this.duration = duration
    })

    // 设置播放源并准备
    this.player.url = song.url
    await this.player.prepare()
  }

  // 格式化时间
  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  build() {
    Column({ space: 15 }) {
      // 歌曲信息
      Column() {
        Text(this.currentSong?.title ?? '未播放')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Text(this.currentSong?.artist ?? '')
          .fontSize(14)
          .fontColor('#666666')
      }

      // 进度条
      Row() {
        Text(this.formatTime(this.currentTime))
          .fontSize(12)
        Slider({ value: this.currentTime, min: 0, max: this.duration })
          .layoutWeight(1)
          .onChange((value) => this.player?.seek(value))
        Text(this.formatTime(this.duration))
          .fontSize(12)
      }
      .width('100%')

      // 播放控制
      Row({ space: 20 }) {
        Button('上一首')
        Button(this.isPlaying ? '暂停' : '播放')
          .onClick(() => {
            if (this.isPlaying) {
              this.player?.pause()
            } else {
              this.player?.play()
            }
          })
        Button('下一首')
      }
    }
    .padding(20)
  }
}
```

### 图片选择与预览

```typescript
import photoAccessHelper from '@ohos.file.photoAccessHelper'

@Component
struct PhotoPickerDemo {
  @State imageUri: string = ''

  // 打开图片选择器
  async pickImage() {
    const helper = photoAccessHelper.getPhotoAccessHelper(getContext(this))
    const result = await helper.showAssetsCreationDialog(
      [photoAccessHelper.PhotoType.IMAGE],
      1 // 最多选择1张
    )

    if (result.length > 0) {
      this.imageUri = result[0]
    }
  }

  build() {
    Column({ space: 10 }) {
      if (this.imageUri) {
        Image(this.imageUri)
          .width(200)
          .height(200)
          .objectFit(ImageFit.Cover)
          .borderRadius(8)
      } else {
        Text('暂无图片')
          .fontSize(14)
          .fontColor('#999999')
      }

      Button('选择图片')
        .onClick(() => this.pickImage())
    }
    .padding(20)
  }
}
```

## 注意事项

- **权限申请**：使用相机需要 `ohos.permission.CAMERA` 权限，录音需要 `ohos.permission.MICROPHONE` 权限，读写媒体文件需要 `ohos.permission.READ_MEDIA` 和 `ohos.permission.WRITE_MEDIA` 权限。这些均为用户授权权限，需要在 module.json5 中声明并在运行时请求。
- **资源释放**：相机、播放器、录音器等硬件资源必须在使用完毕后释放（调用 release 方法），否则其他应用无法使用这些硬件。建议在组件的 aboutToDisappear 生命周期中释放。
- **生命周期管理**：播放器和录音器的状态机有严格的状态转换规则，必须按顺序调用方法。例如，AVPlayer 需要先 prepare 再 play，不能直接从 idle 状态跳到 playing。
- **主线程限制**：多媒体操作（特别是相机和录音）应在主线程执行，异步操作需使用 async/await 正确处理。
- **文件路径**：播放本地文件时，确保文件路径正确。rawfile 中的资源通过 resourceManager 获取，应用沙箱文件通过 filesDir 获取。

## 进阶用法

### 音频焦点管理

```typescript
import audio from '@ohos.multimedia.audio';

class AudioFocusManager {
  private audioManager: audio.AudioManager = audio.getAudioManager();
  private session: audio.AudioSession | null = null;

  // 请求音频焦点
  async requestFocus() {
    this.session = await this.audioManager.createAudioSession(audio.AudioSessionStrategy.PLAYBACK);
    await this.session.activate();

    // 监听焦点丢失事件
    this.session.on('interrupt', (interruptEvent: audio.InterruptEvent) => {
      if (interruptEvent.eventType === audio.InterruptType.INTERRUPT_TYPE_BEGIN) {
        // 焦点被抢占，暂停播放
        console.info('音频焦点丢失，暂停播放');
      } else if (interruptEvent.eventType === audio.InterruptType.INTERRUPT_TYPE_END) {
        // 焦点恢复，继续播放
        console.info('音频焦点恢复，继续播放');
      }
    });
  }

  // 释放音频焦点
  async releaseFocus() {
    if (this.session) {
      await this.session.deactivate();
      this.session = null;
    }
  }
}
```

### 视频倍速播放

```typescript
import media from '@ohos.multimedia.media'

@Component
struct SpeedPlayerDemo {
  private player: media.AVPlayer | null = null
  @State currentSpeed: number = 1.0
  speeds: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  async setSpeed(speed: number) {
    if (this.player) {
      // 设置播放倍速
      this.player.setSpeed(this.getSpeedEnum(speed))
      this.currentSpeed = speed
    }
  }

  // 将数值转换为枚举
  private getSpeedEnum(speed: number): media.PlaybackSpeed {
    switch (speed) {
      case 0.5: return media.PlaybackSpeed.SPEED_FORWARD_0_75_X
      case 0.75: return media.PlaybackSpeed.SPEED_FORWARD_0_75_X
      case 1.0: return media.PlaybackSpeed.SPEED_FORWARD_1_00_X
      case 1.25: return media.PlaybackSpeed.SPEED_FORWARD_1_25_X
      case 1.5: return media.PlaybackSpeed.SPEED_FORWARD_1_75_X
      case 2.0: return media.PlaybackSpeed.SPEED_FORWARD_2_00_X
      default: return media.PlaybackSpeed.SPEED_FORWARD_1_00_X
    }
  }

  build() {
    Column({ space: 10 }) {
      Text(`当前倍速: ${this.currentSpeed}x`)
        .fontSize(16)

      Row({ space: 8 }) {
        ForEach(this.speeds, (speed: number) => {
          Button(`${speed}x`)
            .fontSize(12)
            .backgroundColor(this.currentSpeed === speed ? '#2196F3' : '#e0e0e0')
            .fontColor(this.currentSpeed === speed ? Color.White : '#333333')
            .onClick(() => this.setSpeed(speed))
        }, (speed: number) => speed.toString())
      }
    }
    .padding(20)
  }
}
```

### 音量与音频流管理

```typescript
import audio from '@ohos.multimedia.audio'

@Component
struct VolumeControlDemo {
  private audioManager: audio.AudioManager = audio.getAudioManager()
  @State volume: number = 0

  async aboutToAppear() {
    // 获取当前音量
    this.volume = await this.audioManager.getVolume(audio.AudioVolumeType.MEDIA)
  }

  // 设置音量
  async setVolume(value: number) {
    await this.audioManager.setVolume(audio.AudioVolumeType.MEDIA, value)
    this.volume = value
  }

  build() {
    Column({ space: 10 }) {
      Text(`媒体音量: ${Math.round(this.volume * 100)}%`)
        .fontSize(16)

      Slider({
        value: this.volume,
        min: 0,
        max: 1,
        step: 0.01,
      })
        .onChange((value) => this.setVolume(value))
    }
    .padding(20)
  }
}
```
