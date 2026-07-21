---
order: 5
title: 多媒体与设备能力
module: harmonyos
category: 鸿蒙开发
difficulty: intermediate
description: 相机调用、音视频播放录制、传感器访问、位置服务、通知与后台任务、应用打包签名发布。
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/UI组件与动画
  - harmonyos/网络与数据持久化
  - harmonyos/ArkTS语言特性
  - harmonyos/状态管理
prerequisites: []
---

## 1. 相机调用

### 1.1 权限声明

```json5
// module.json5
{
  module: {
    requestPermissions: [
      {
        name: 'ohos.permission.CAMERA',
        reason: '$string:camera_reason',
        usedScene: {
          abilities: ['EntryAbility'],
          when: 'inuse',
        },
      },
    ],
  },
}
```

### 1.2 相机管理

```typescript
import { camera } from '@kit.MultimediaKit';
import { image } from '@kit.ImageKit';

class CameraManager {
  private cameraManager: camera.CameraManager | null = null;
  private cameraSession: camera.PhotoSession | null = null;

  async init(surfaceId: string): Promise<void> {
    // 获取相机管理器
    this.cameraManager = camera.getCameraManager(getContext(this));

    // 获取相机列表
    const cameras = this.cameraManager.getSupportedCameras();
    const cameraDevice =
      cameras.find((cam) => cam.cameraPosition === camera.CameraPosition.CAMERA_POSITION_BACK) ||
      cameras[0];

    // 创建拍照会话
    const outputCapability = this.cameraManager.getSupportedOutputCapability(cameraDevice);
    const photoProfile = outputCapability.photoProfiles[0];
    const previewProfile = outputCapability.previewProfiles[0];

    // 创建输入
    const cameraInput = this.cameraManager.createCameraInput(cameraDevice);
    await cameraInput.open();

    // 创建预览输出
    const previewOutput = this.cameraManager.createPreviewOutput(previewProfile, surfaceId);

    // 创建拍照输出
    const photoOutput = this.cameraManager.createPhotoOutput(photoProfile);

    // 创建会话并配置
    this.cameraSession = this.cameraManager.createPhotoSession();
    this.cameraSession.beginConfig();
    this.cameraSession.addInput(cameraInput);
    this.cameraSession.addOutput(previewOutput);
    this.cameraSession.addOutput(photoOutput);
    await this.cameraSession.commitConfig();
    await this.cameraSession.start();
  }

  // 拍照
  async takePhoto(): Promise<image.PixelMap> {
    return new Promise((resolve) => {
      this.photoOutput?.on('photoAvailable', (err, photo) => {
        if (!err) {
          const pixelMap = photo.main;
          resolve(pixelMap);
        }
      });
      this.cameraSession?.takePhoto();
    });
  }
}
```

### 1.3 相机预览组件

```typescript
import { camera } from '@kit.MultimediaKit';
import { XComponentController } from '@kit.ArkUI';

@Entry
@Component
struct CameraPreview {
  private xComponentController: XComponentController = new XComponentController();
  private cameraManager: camera.CameraManager | null = null;

  build() {
    Column() {
      // 预览区域
      XComponent({
        id: 'cameraPreview',
        type: XComponentType.SURFACE,
        controller: this.xComponentController
      })
        .width('100%')
        .height(400)
        .onLoad(async () => {
          await this.initCamera();
        })

      // 拍照按钮
      Row() {
        Button('拍照')
          .width(64)
          .height(64)
          .type(ButtonType.Circle)
          .backgroundColor('#ffffff')
          .border({ width: 4, color: '#1a73e8' })
          .onClick(() => {
            this.takePhoto();
          })
      }
      .width('100%')
      .justifyContent(FlexAlign.Center)
      .padding({ top: 24, bottom: 24 })
    }
  }

  async initCamera() {
    // 初始化相机...
  }

  async takePhoto() {
    // 拍照逻辑...
  }
}
```

## 2. 音视频播放与录制

### 2.1 音频播放

```typescript
import { media } from '@kit.MultimediaKit';

class AudioPlayer {
  private player: media.AVPlayer | null = null;

  async init(url: string): Promise<void> {
    this.player = await media.createAVPlayer();

    // 设置状态变化监听
    this.player.on('stateChange', (state: string) => {
      switch (state) {
        case 'initialized':
          console.info('播放器初始化完成');
          break;
        case 'playing':
          console.info('正在播放');
          break;
        case 'paused':
          console.info('已暂停');
          break;
        case 'completed':
          console.info('播放完成');
          break;
      }
    });

    // 设置错误监听
    this.player.on('error', (err) => {
      console.error(`播放错误: ${JSON.stringify(err)}`);
    });

    // 设置播放源
    this.player.url = url;
  }

  async play(): Promise<void> {
    await this.player?.play();
  }

  async pause(): Promise<void> {
    await this.player?.pause();
  }

  async stop(): Promise<void> {
    await this.player?.stop();
  }

  async seek(timeMs: number): Promise<void> {
    await this.player?.seek(timeMs);
  }

  release(): void {
    this.player?.release();
    this.player = null;
  }
}
```

### 2.2 视频播放组件

```typescript
import { media } from '@kit.MultimediaKit';

@Entry
@Component
struct VideoPlayerDemo {
  private videoController: VideoController = new VideoController();
  @State isPlaying: boolean = false;
  @State currentTime: number = 0;
  @State duration: number = 0;

  build() {
    Column() {
      Video({
        src: 'https://example.com/video.mp4',
        controller: this.videoController
      })
        .width('100%')
        .height(240)
        .autoPlay(false)
        .controls(true)
        .onPrepared((e) => {
          this.duration = e.duration;
        })
        .onTimeUpdate((e) => {
          this.currentTime = e.time;
        })
        .onPlay(() => {
          this.isPlaying = true;
        })
        .onPause(() => {
          this.isPlaying = false;
        })
        .onFinish(() => {
          this.isPlaying = false;
        })

      // 自定义控制栏
      Row({ space: 16 }) {
        Button(this.isPlaying ? '暂停' : '播放')
          .onClick(() => {
            if (this.isPlaying) {
              this.videoController.pause();
            } else {
              this.videoController.start();
            }
          })

        Text(`${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`)
          .fontSize(14)
          .fontColor('#666666')
      }
      .width('100%')
      .justifyContent(FlexAlign.Center)
      .padding(12)
    }
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
}
```

### 2.3 音频录制

```typescript
import { media } from '@kit.MultimediaKit';

class AudioRecorder {
  private recorder: media.AVRecorder | null = null;

  async start(filePath: string): Promise<void> {
    this.recorder = await media.createAVRecorder();

    this.recorder.on('stateChange', (state: string) => {
      console.info(`录制状态: ${state}`);
    });

    // 配置录制参数
    const config: media.AVRecorderConfig = {
      audioSourceType: media.AudioSourceType.AUDIO_SOURCE_TYPE_MIC,
      profile: {
        audioBitrate: 128000,
        audioChannels: 2,
        audioCodec: media.CodecMimeType.AUDIO_AAC,
        audioSampleRate: 44100,
        fileFormat: media.ContainerFormatType.CFT_MPEG_4A,
      },
      url: `file://${filePath}`,
    };

    await this.recorder.prepare(config);
    await this.recorder.start();
  }

  async pause(): Promise<void> {
    await this.recorder?.pause();
  }

  async resume(): Promise<void> {
    await this.recorder?.resume();
  }

  async stop(): Promise<void> {
    await this.recorder?.stop();
    await this.recorder?.release();
    this.recorder = null;
  }
}
```

## 3. 传感器访问

### 3.1 加速度传感器

```typescript
import { sensor } from '@kit.SensorServiceKit';

@Entry
@Component
struct SensorDemo {
  @State accelX: number = 0;
  @State accelY: number = 0;
  @State accelZ: number = 0;

  aboutToAppear() {
    try {
      sensor.on(sensor.SensorId.ACCELEROMETER, (data: sensor.AccelerometerResponse) => {
        this.accelX = data.x;
        this.accelY = data.y;
        this.accelZ = data.z;
      }, { interval: 200000000 });  // 200ms 间隔
    } catch (error) {
      console.error(`订阅加速度传感器失败: ${error}`);
    }
  }

  aboutToDisappear() {
    sensor.off(sensor.SensorId.ACCELEROMETER);
  }

  build() {
    Column({ space: 16 }) {
      Text('加速度传感器')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)

      Row() {
        Text(`X: ${this.accelX.toFixed(2)}`).layoutWeight(1)
        Text(`Y: ${this.accelY.toFixed(2)}`).layoutWeight(1)
        Text(`Z: ${this.accelZ.toFixed(2)}`).layoutWeight(1)
      }
      .fontSize(16)
    }
    .padding(16)
  }
}
```

### 3.2 常用传感器

| 传感器 ID          | 说明     | 典型用途     |
| :----------------- | :------- | :----------- |
| **ACCELEROMETER**  | 加速度   | 摇一摇、计步 |
| **GYROSCOPE**      | 陀螺仪   | 体感游戏     |
| **AMBIENT_LIGHT**  | 环境光   | 自动亮度     |
| **PROXIMITY**      | 接近光   | 通话息屏     |
| **MAGNETIC_FIELD** | 磁场     | 指南针       |
| **BAROMETER**      | 气压     | 海拔测量     |
| **HEART_RATE**     | 心率     | 健康监测     |
| **STEP_DETECTOR**  | 计步检测 | 运动追踪     |

## 4. 位置服务

### 4.1 权限声明

```json5
{
  requestPermissions: [
    {
      name: 'ohos.permission.APPROXIMATELY_LOCATION',
      reason: '$string:location_reason',
      usedScene: { abilities: ['EntryAbility'], when: 'inuse' },
    },
    {
      name: 'ohos.permission.LOCATION',
      reason: '$string:location_reason',
      usedScene: { abilities: ['EntryAbility'], when: 'inuse' },
    },
  ],
}
```

### 4.2 获取位置

```typescript
import { geoLocationManager } from '@kit.LocationKit';
import { abilityAccessCtrl, bundleManager, Permissions } from '@kit.AbilityKit';

class LocationManager {
  // 请求权限
  static async requestPermission(context: Context): Promise<boolean> {
    const atManager = abilityAccessCtrl.createAtManager();
    const permissions: Permissions[] = [
      'ohos.permission.APPROXIMATELY_LOCATION',
      'ohos.permission.LOCATION',
    ];

    try {
      const result = await atManager.requestPermissionsFromUser(context, permissions);
      return result.authResults[0] === 0;
    } catch (error) {
      console.error(`请求位置权限失败: ${error}`);
      return false;
    }
  }

  // 获取当前位置
  static async getCurrentLocation(): Promise<geoLocationManager.Location> {
    const requestInfo: geoLocationManager.CurrentLocationRequest = {
      priority: geoLocationManager.LocationRequestPriority.FIRST_FIX,
      scenario: geoLocationManager.LocationRequestScenario.UNSET,
      maxAccuracy: 100,
    };
    return await geoLocationManager.getCurrentLocation(requestInfo);
  }

  // 持续监听位置
  static onLocationChange(callback: (location: geoLocationManager.Location) => void): number {
    const requestInfo: geoLocationManager.LocationRequest = {
      priority: geoLocationManager.LocationRequestPriority.ACCURACY,
      scenario: geoLocationManager.LocationRequestScenario.NAVIGATION,
      timeInterval: 5,
      distanceInterval: 10,
    };
    return geoLocationManager.on('locationChange', requestInfo, callback);
  }

  // 取消监听
  static offLocationChange(callbackId: number): void {
    geoLocationManager.off('locationChange', callbackId);
  }
}
```

### 4.3 在组件中使用

```typescript
@Entry
@Component
struct LocationDemo {
  @State latitude: number = 0;
  @State longitude: number = 0;
  @State altitude: number = 0;
  private callbackId: number = -1;

  async aboutToAppear() {
    const granted = await LocationManager.requestPermission(getContext(this));
    if (granted) {
      this.callbackId = LocationManager.onLocationChange((location) => {
        this.latitude = location.latitude;
        this.longitude = location.longitude;
        this.altitude = location.altitude;
      });
    }
  }

  aboutToDisappear() {
    if (this.callbackId !== -1) {
      LocationManager.offLocationChange(this.callbackId);
    }
  }

  build() {
    Column({ space: 12 }) {
      Text('位置信息').fontSize(20).fontWeight(FontWeight.Bold)
      Text(`纬度: ${this.latitude.toFixed(6)}`).fontSize(16)
      Text(`经度: ${this.longitude.toFixed(6)}`).fontSize(16)
      Text(`海拔: ${this.altitude.toFixed(1)}m`).fontSize(16)
    }
    .padding(16)
  }
}
```

## 5. 通知与后台任务

### 5.1 发送通知

```typescript
import { notificationManager } from '@kit.NotificationKit';
import { wantAgent } from '@kit.AbilityKit';

async function sendNotification(title: string, text: string): Promise<void> {
  // 创建 WantAgent（点击通知后跳转）
  const wantAgentInfo: wantAgent.WantAgentInfo = {
    wants: [{ bundleName: 'com.example.myapp', abilityName: 'EntryAbility' }],
    requestCode: 0,
    operationType: wantAgent.OperationType.START_ABILITY,
    wantAgentFlags: [wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG],
  };
  const agent = await wantAgent.getWantAgent(wantAgentInfo);

  // 构建通知请求
  const request: notificationManager.NotificationRequest = {
    id: 1,
    content: {
      notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
      normal: {
        title: title,
        text: text,
      },
    },
    wantAgent: agent,
  };

  await notificationManager.publish(request);
}
```

### 5.2 后台长时任务

```typescript
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';

// 申请长时任务（如音乐播放、导航）
async function requestContinuousTask(context: Context): Promise<number> {
  const bgMode: backgroundTaskManager.BackgroundMode =
    backgroundTaskManager.BackgroundMode.AUDIO_PLAYBACK;

  const id = await backgroundTaskManager.requestSuspendDelay('音频播放', () => {
    console.info('长时任务即将到期');
  });

  // 也可以使用 backgroundTaskManager.startBackgroundRunning
  await backgroundTaskManager.startBackgroundRunning(context, bgMode, '正在播放音频');
  return id;
}

// 取消长时任务
async function cancelContinuousTask(context: Context): Promise<void> {
  await backgroundTaskManager.stopBackgroundRunning(context);
}
```

### 5.3 后台任务类型

| 类型                        | 说明       | 典型场景     |
| :-------------------------- | :--------- | :----------- |
| **DATA_TRANSFER**           | 数据传输   | 文件上传下载 |
| **AUDIO_PLAYBACK**          | 音频播放   | 音乐播放器   |
| **AUDIO_RECORDING**         | 音频录制   | 录音应用     |
| **LOCATION**                | 定位       | 导航应用     |
| **BLUETOOTH_INTERACTION**   | 蓝牙交互   | 蓝牙设备连接 |
| **MULTI_DEVICE_CONNECTION** | 多设备连接 | 分布式业务   |
| **TASK_KEEPING**            | 任务保持   | 倒计时、提醒 |

## 6. 应用打包签名发布

### 6.1 签名流程

```
生成密钥 → 生成证书签名请求(CSR) → 申请调试/发布证书 → 申请调试/发布Profile → 签名打包
```

### 6.2 生成密钥与证书

```bash
# 使用 DevEco Studio 生成
# Build → Generate Key and CSR

# 或使用命令行工具
# 生成密钥
java -jar keytool.jar -genkeypair -alias myapp -keyalg RSA -keysize 2048 -validity 36500 -keystore myapp.p12

# 生成 CSR
java -jar keytool.jar -certreq -alias myapp -keystore myapp.p12 -file myapp.csr
```

### 6.3 构建发布包

```bash
# 构建 HAP（HarmonyOS Ability Package）
# Build → Build Hap(s)/APP(s) → Build APP(s)

# 或使用命令行
hvigorw assembleApp --mode release
```

### 6.4 发布到应用市场

| 步骤        | 操作                        |
| :---------- | :-------------------------- |
| **1. 注册** | 华为开发者账号实名认证      |
| **2. 创建** | AppGallery Connect 创建应用 |
| **3. 上传** | 上传签名后的 APP 包         |
| **4. 填写** | 应用信息、截图、隐私政策    |
| **5. 提交** | 提交审核                    |
| **6. 发布** | 审核通过后发布上架          |

### 6.5 版本管理

```json5
// AppScope/app.json5
{
  app: {
    bundleName: 'com.example.myapp',
    vendor: 'example',
    versionCode: 1000000, // 递增版本号
    versionName: '1.0.0', // 展示版本号
    icon: '$media:app_icon',
    label: '$string:app_name',
  },
}
```

| 字段            | 说明           | 规则             |
| :-------------- | :------------- | :--------------- |
| **versionCode** | 内部版本号     | 整数，每次递增   |
| **versionName** | 用户可见版本号 | 语义化版本 x.y.z |
| **bundleName**  | 应用唯一标识   | 反域名格式       |
