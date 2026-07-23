# 多媒体能力 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 多媒体模块导入

**导入 camera 模块**
`import camera from '@ohos.multimedia.camera'`
```typescript
import camera from '@ohos.multimedia.camera';
```

**通过 MultimediaKit 导入 camera**
`import { camera } from '@kit.MultimediaKit'`
```typescript
import { camera } from '@kit.MultimediaKit';
```

**导入 media 模块**
`import media from '@ohos.multimedia.media'`
```typescript
import media from '@ohos.multimedia.media';
```

**通过 MultimediaKit 导入 media**
`import { media } from '@kit.MultimediaKit'`
```typescript
import { media } from '@kit.MultimediaKit';
```

**导入 audio 模块**
`import audio from '@ohos.multimedia.audio'`
```typescript
import audio from '@ohos.multimedia.audio';
```

---

## 相机管理 API

**获取相机管理器**
`camera.getCameraManager(context: Context): CameraManager`
```typescript
const cameraManager = camera.getCameraManager(getContext(this));
```

**获取支持的相机列表**
`cameraManager.getSupportedCameras(): Array<CameraDevice>`
```typescript
const cameras = cameraManager.getSupportedCameras();
const cameraDevice = cameras[0]; // 默认使用后置摄像头
```

**获取相机输出能力**
`cameraManager.getSupportedOutputCapability(camera: CameraDevice): CameraOutputCapability`
```typescript
const capability = cameraManager.getSupportedOutputCapability(cameraDevice);
const previewProfile = capability.previewProfiles[0];
const photoProfile = capability.photoProfiles[0];
```

**CameraDevice 结构**
```typescript
interface CameraDevice {
  cameraId: string;
  cameraPosition: CameraPosition;
  cameraType: CameraType;
  connectionType: ConnectionType;
}
```

**CameraPosition 枚举**
`camera.CameraPosition`
```typescript
enum CameraPosition {
  CAMERA_POSITION_UNSPECIFIED = 0,
  CAMERA_POSITION_BACK = 1,
  CAMERA_POSITION_FRONT = 2
}
```

---

## 相机输入与输出

**创建相机输入**
`cameraManager.createCameraInput(camera: CameraDevice): CameraInput`
```typescript
const cameraInput = cameraManager.createCameraInput(cameraDevice);
await cameraInput.open();
```

**创建预览输出**
`cameraManager.createPreviewOutput(profile: Profile, surfaceId: string): PreviewOutput`
```typescript
const previewOutput = cameraManager.createPreviewOutput(previewProfile, surfaceId);
```

**创建拍照输出**
`cameraManager.createPhotoOutput(profile: Profile): PhotoOutput`
```typescript
const photoOutput = cameraManager.createPhotoOutput(photoProfile);
```

**CameraInput API**
```typescript
cameraInput.open(): Promise<void>;
cameraInput.close(): Promise<void>;
cameraInput.release(): Promise<void>;
```

---

## 相机会话 API

**创建拍照会话**
`cameraManager.createPhotoSession(): PhotoSession`
```typescript
const cameraSession = cameraManager.createPhotoSession();
```

**会话配置流程**
```typescript
cameraSession.beginConfig();
cameraSession.addInput(cameraInput);
cameraSession.addOutput(previewOutput);
cameraSession.addOutput(photoOutput);
await cameraSession.commitConfig();
await cameraSession.start();
```

**会话控制 API**
```typescript
cameraSession.start(): Promise<void>;
cameraSession.stop(): Promise<void>;
cameraSession.release(): Promise<void>;
cameraSession.hasFlash(): boolean;
cameraSession.isFlashModeSupported(mode: FlashMode): boolean;
cameraSession.setFlashMode(mode: FlashMode): void;
cameraSession.setFocusMode(mode: FocusMode): void;
```

**拍照**
`cameraSession.takePhoto(photoSettings?: PhotoCaptureSetting): Promise<void>`
```typescript
await cameraSession.takePhoto({
  quality: camera.QualityLevel.QUALITY_LEVEL_HIGH,
  rotation: camera.ImageRotation.ROTATION_0
});
```

**PhotoOutput 事件**
```typescript
photoOutput.on('photoAvailable', (err: BusinessError, photo: Photo): void);
photoOutput.on('frameShutter', (frame: FrameShutterInfo): void);
```

---

## FlashMode 闪光灯枚举

`camera.FlashMode`
```typescript
enum FlashMode {
  FLASH_MODE_CLOSE = 0,
  FLASH_MODE_OPEN = 1,
  FLASH_MODE_AUTO = 2,
  FLASH_MODE_ALWAYS_OPEN = 3
}
```

**QualityLevel 枚举**
`camera.QualityLevel`
```typescript
enum QualityLevel {
  QUALITY_LEVEL_HIGH = 0,
  QUALITY_LEVEL_MEDIUM = 1,
  QUALITY_LEVEL_LOW = 2
}
```

**ImageRotation 枚举**
`camera.ImageRotation`
```typescript
enum ImageRotation {
  ROTATION_0 = 0,
  ROTATION_90 = 90,
  ROTATION_180 = 180,
  ROTATION_270 = 270
}
```

**FocusMode 枚举**
`camera.FocusMode`
```typescript
enum FocusMode {
  FOCUS_MODE_MANUAL = 0,
  FOCUS_MODE_CONTINUOUS_AUTO = 1,
  FOCUS_MODE_AUTO = 2,
  FOCUS_MODE_LOCKED = 3
}
```

---

## AVPlayer 播放器 API

**创建播放器**
`media.createAVPlayer(): Promise<AVPlayer>`
```typescript
const player = await media.createAVPlayer();
```

**AVPlayer 状态机**
```typescript
type AVPlayerState =
  | 'idle'        // 初始状态
  | 'initialized' // 已初始化
  | 'prepared'    // 已准备就绪
  | 'playing'     // 播放中
  | 'paused'      // 已暂停
  | 'completed'   // 播放完成
  | 'stopped'     // 已停止
  | 'released'    // 已释放
  | 'error';      // 错误状态
```

**播放器属性**
```typescript
player.url: string;        // 设置播放源 URL
player.fdSrc: { fd: number; offset: number; length: number }; // 文件描述符
player.surfaceId: string;  // 视频渲染表面
player.duration: number;   // 媒体时长(ms)
player.currentTime: number; // 当前播放位置(ms)
player.volume: number;     // 音量 0-1
player.loop: boolean;      // 是否循环播放
```

**播放控制 API**
```typescript
player.prepare(): Promise<void>;
player.play(): Promise<void>;
player.pause(): Promise<void>;
player.stop(): Promise<void>;
player.reset(): Promise<void>;
player.release(): Promise<void>;
player.seek(timeMs: number, mode?: SeekMode): void;
player.setSpeed(speed: PlaybackSpeed): void;
```

**AVPlayer 事件监听**
```typescript
player.on('stateChange', (state: string, reason: StateChangeReason): void);
player.on('error', (err: BusinessError): void);
player.on('timeUpdate', (time: number): void);
player.on('durationUpdate', (duration: number): void);
player.on('videoSizeChange', (width: number, height: number): void);
player.on('audioInterrupt', (info: audio.InterruptEvent): void);
player.on('endOfStream', (): void);
```

---

## SeekMode 与 PlaybackSpeed 枚举

**SeekMode 枚举**
`media.SeekMode`
```typescript
enum SeekMode {
  SEEK_NEXT_SYNC = 0,
  SEEK_PREV_SYNC = 1,
  SEEK_CLOSEST_SYNC = 2,
  SEEK_CLOSEST = 3
}
```

**PlaybackSpeed 枚举**
`media.PlaybackSpeed`
```typescript
enum PlaybackSpeed {
  SPEED_FORWARD_0_75_X = 0,
  SPEED_FORWARD_1_00_X = 1,
  SPEED_FORWARD_1_25_X = 2,
  SPEED_FORWARD_1_75_X = 3,
  SPEED_FORWARD_2_00_X = 4
}
```

---

## AVRecorder 录制 API

**创建录制器**
`media.createAVRecorder(): Promise<AVRecorder>`
```typescript
const recorder = await media.createAVRecorder();
```

**AVRecorder 状态机**
```typescript
type AVRecorderState =
  | 'idle'
  | 'prepared'
  | 'started'
  | 'paused'
  | 'stopped'
  | 'released'
  | 'error';
```

**录制控制 API**
```typescript
recorder.prepare(config: AVRecorderConfig): Promise<void>;
recorder.start(): Promise<void>;
recorder.pause(): Promise<void>;
recorder.resume(): Promise<void>;
recorder.stop(): Promise<void>;
recorder.reset(): Promise<void>;
recorder.release(): Promise<void>;
```

**AVRecorderConfig 配置**
```typescript
interface AVRecorderConfig {
  audioSourceType?: AudioSourceType;
  videoSourceType?: VideoSourceType;
  profile: AVRecorderProfile;
  url: string;            // 输出文件路径
  rotation?: number;
  location?: Location;
}
```

**AVRecorderProfile 配置**
```typescript
interface AVRecorderProfile {
  audioBitrate?: number;
  audioChannels?: number;
  audioCodec?: CodecMimeType;
  audioSampleRate?: number;
  videoBitrate?: number;
  videoCodec?: CodecMimeType;
  videoFrameWidth?: number;
  videoFrameHeight?: number;
  videoFrameRate?: number;
  fileFormat: ContainerFormatType;
}
```

---

## 录制相关枚举

**AudioSourceType 枚举**
`media.AudioSourceType`
```typescript
enum AudioSourceType {
  AUDIO_SOURCE_TYPE_INVALID = -1,
  AUDIO_SOURCE_TYPE_MIC = 0,
  AUDIO_SOURCE_TYPE_VOICE_RECOGNITION = 1,
  AUDIO_SOURCE_TYPE_VOICE_COMMUNICATION = 2
}
```

**CodecMimeType 枚举**
`media.CodecMimeType`
```typescript
enum CodecMimeType {
  AUDIO_AAC = 'audio/mp4a-latm',
  AUDIO_OPUS = 'audio/opus',
  AUDIO_FLAC = 'audio/flac',
  VIDEO_H264 = 'video/avc',
  VIDEO_H265 = 'video/hevc',
  VIDEO_MPEG4 = 'video/mp4v-es'
}
```

**ContainerFormatType 枚举**
`media.ContainerFormatType`
```typescript
enum ContainerFormatType {
  CFT_MPEG_4 = 'mp4',
  CFT_MPEG_4A = 'm4a',
  CFT_3GPP = '3gp',
  CFT_OGG = 'ogg',
  CFT_FLAC = 'flac',
  CFT_WAV = 'wav'
}
```

---

## Audio 音频管理 API

**获取音频管理器**
`audio.getAudioManager(): AudioManager`
```typescript
const audioManager = audio.getAudioManager();
```

**音量控制 API**
```typescript
audioManager.getVolume(volumeType: AudioVolumeType): Promise<number>;
audioManager.setVolume(volumeType: AudioVolumeType, volume: number): Promise<void>;
audioManager.getMaxVolume(volumeType: AudioVolumeType): Promise<number>;
audioManager.mute(volumeType: AudioVolumeType): Promise<void>;
```

**AudioVolumeType 枚举**
`audio.AudioVolumeType`
```typescript
enum AudioVolumeType {
  RINGTONE = 2,
  MEDIA = 3,
  VOICE_CALL = 0,
  VOICE_ASSISTANT = 9
}
```

---

## AudioSession 音频会话

**创建音频会话**
`audioManager.createAudioSession(strategy: AudioSessionStrategy): Promise<AudioSession>`
```typescript
const session = await audioManager.createAudioSession(audio.AudioSessionStrategy.PLAYBACK);
```

**会话控制 API**
```typescript
session.activate(): Promise<void>;
session.deactivate(): Promise<void>;
session.on('interrupt', (event: InterruptEvent): void);
```

**AudioSessionStrategy 枚举**
`audio.AudioSessionStrategy`
```typescript
enum AudioSessionStrategy {
  PLAYBACK = 0,
  RECORDING = 1,
  CALL = 2
}
```

**InterruptEvent 事件**
```typescript
interface InterruptEvent {
  eventType: InterruptType;
  interrupt: InterruptHint;
}
```

**InterruptType 枚举**
`audio.InterruptType`
```typescript
enum InterruptType {
  INTERRUPT_TYPE_BEGIN = 0,
  INTERRUPT_TYPE_END = 1
}
```

---

## PhotoAccessHelper 媒体选择

**导入 photoAccessHelper**
`import photoAccessHelper from '@ohos.file.photoAccessHelper'`
```typescript
import photoAccessHelper from '@ohos.file.photoAccessHelper';
```

**获取 PhotoAccessHelper**
`photoAccessHelper.getPhotoAccessHelper(context: Context): PhotoAccessHelper`
```typescript
const helper = photoAccessHelper.getPhotoAccessHelper(getContext(this));
```

**打开图片选择对话框**
`helper.showAssetsCreationDialog(photoType: Array<PhotoType>, maxSelected: number): Promise<Array<string>>`
```typescript
const result = await helper.showAssetsCreationDialog(
  [photoAccessHelper.PhotoType.IMAGE],
  1
);
if (result.length > 0) {
  const uri = result[0];
}
```

**PhotoType 枚举**
`photoAccessHelper.PhotoType`
```typescript
enum PhotoType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}
```

---

## Video 组件 API

**Video 组件构造**
```typescript
Video(value: { src: string | Resource, controller: VideoController })
```
```typescript
Video({ src: 'https://example.com/video.mp4', controller: this.videoController })
  .autoPlay(false)
  .controls(true)
  .width('100%')
  .height(240);
```

**VideoController API**
```typescript
const controller = new VideoController();
controller.start();
controller.pause();
controller.stop();
controller.reset();
controller.seek(timeMs: number);
controller.requestFullscreen();
controller.exitFullscreen();
```

**Video 事件**
```typescript
.onPrepared((event: { duration: number }): void)
.onTimeUpdate((event: { time: number }): void)
.onPlay((): void)
.onPause((): void)
.onFinish((): void)
.onError((): void)
```

---

## XComponent 渲染表面

**XComponent 构造**
```typescript
XComponent(value: { id: string, type: XComponentType, controller?: XComponentController })
```
```typescript
XComponent({ id: 'videoSurface', type: XComponentType.SURFACE })
  .width('100%')
  .height(400)
  .onLoad(() => {
    // 表面加载完成后初始化播放器
  });
```

**XComponentType 枚举**
```typescript
enum XComponentType {
  SURFACE = 0,
  COMPONENT = 1
}
```

