# 实时通信 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

## WebRTC 核心组件

**WebRTC 三大组件表**

| 组件                      | 作用                       | 主要对象/方法                |
| ------------------------- | -------------------------- | ---------------------------- |
| **getUserMedia**          | 获取本地媒体流(摄像头/麦克风) | `navigator.mediaDevices.getUserMedia()` |
| **RTCPeerConnection**     | 建立点对点连接             | `new RTCPeerConnection()`    |
| **RTCDataChannel**        | 传输任意数据               | `pc.createDataChannel()`     |

---

## getUserMedia 媒体捕获

**获取本地媒体流**
`const stream = await navigator.mediaDevices.getUserMedia(<constraints>)`

```javascript
// 获取摄像头和麦克风媒体流
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,   // 启用视频
  audio: true    // 启用音频
});

// 将媒体流绑定到 video 元素
const video = document.querySelector('#localVideo');
video.srcObject = stream;
await video.play();
```

**媒体约束条件**
`{ video: { width, height, facingMode }, audio: { echoCancellation, noiseSuppression } }`

```javascript
// 精细化约束视频和音频参数
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },      // 理想宽度
    height: { ideal: 720 },      // 理想高度
    frameRate: { ideal: 30 },    // 理想帧率
    facingMode: 'user'           // 前置摄像头(user | environment)
  },
  audio: {
    echoCancellation: true,      // 回声消除
    noiseSuppression: true,      // 降噪
    autoGainControl: true        // 自动增益
  }
});
```

**屏幕共享**
`const stream = await navigator.mediaDevices.getDisplayMedia(<constraints>)`

```javascript
// 捕获屏幕、窗口或浏览器标签页(需用户选择)
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: { cursor: 'always' },  // 始终显示鼠标
  audio: false                   // 是否捕获系统音频
});
```

---

## 媒体轨道操作

**MediaStreamTrack 方法表**

| 方法                       | 说明                       |
| -------------------------- | -------------------------- |
| `track.stop()`             | 停止轨道                   |
| `track.enabled = false`    | 静音/禁用轨道              |
| `track.getSettings()`      | 获取当前轨道配置           |
| `track.getCapabilities()`  | 获取设备支持的配置范围     |
| `track.applyConstraints()` | 动态修改约束               |

```javascript
// 遍历并操作媒体轨道
stream.getTracks().forEach((track) => {
  console.log(`轨道类型: ${track.kind}, 状态: ${track.readyState}`);
  // track.stop();        // 停止
  // track.enabled = false; // 禁用
});

// 动态切换摄像头
async function switchCamera() {
  const videoTrack = stream.getVideoTracks()[0];
  const newConstraints = { facingMode: 'environment' };
  await videoTrack.applyConstraints(newConstraints);
}
```

---

## RTCPeerConnection 点对点连接

**创建 PeerConnection**
`const pc = new RTCPeerConnection(<configuration>)`

```javascript
// 创建点对点连接,配置 ICE 服务器(STUN/TURN)
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },                        // STUN 服务器
    { urls: 'turn:turn.example.com', username: 'user', credential: 'pass' } // TURN 服务器
  ],
  iceTransportPolicy: 'all' // all | relay
});
```

**添加本地媒体流**
`stream.getTracks().forEach(track => pc.addTrack(track, stream))`

```javascript
// 将本地媒体轨道添加到连接中
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach((track) => {
  pc.addTrack(track, stream);
});
```

**接收远端媒体流**
`pc.ontrack = (event) => { event.streams[0] }`

```javascript
// 监听远端媒体流到达
pc.ontrack = (event) => {
  console.log('收到远端轨道:', event.track.kind);
  const remoteVideo = document.getElementById('remote');
  remoteVideo.srcObject = event.streams[0];
};
```

---

## ICE 候选交换

**监听 ICE 候选**
`pc.onicecandidate = (event) => { event.candidate }`

```javascript
// 监听本地 ICE 候选,通过信令服务器发送给对端
pc.onicecandidate = (event) => {
  if (event.candidate) {
    // 将候选发送给对端
    sendSignal({ type: 'candidate', candidate: event.candidate });
  } else {
    console.log('ICE 候选收集完成');
  }
};

// 接收对端 ICE 候选
function handleRemoteCandidate(candidate) {
  pc.addIceCandidate(new RTCIceCandidate(candidate));
}
```

**ICE 连接状态**
`pc.oniceconnectionstatechange = () => { pc.iceConnectionState }`

```javascript
// 监听 ICE 连接状态变化
pc.oniceconnectionstatechange = () => {
  const state = pc.iceConnectionState;
  console.log('ICE 状态:', state);
  // checking | connected | completed | disconnected | failed | closed
};
```

---

## SDP 信令交换

**创建并设置 Offer**
`const offer = await pc.createOffer([options])`

```javascript
// 主叫方创建 Offer
const offer = await pc.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
});
await pc.setLocalDescription(offer);
// 通过信令服务器发送 offer 给被叫方
sendSignal({ type: 'offer', sdp: offer });
```

**接收并应答 Offer**
`const answer = await pc.createAnswer()`

```javascript
// 被叫方处理 Offer 并创建 Answer
async function handleOffer(offer) {
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal({ type: 'answer', sdp: answer });
}

// 主叫方接收 Answer
async function handleAnswer(answer) {
  await pc.setRemoteDescription(answer);
}
```

---

## RTCDataChannel 数据通道

**创建数据通道**
`const channel = pc.createDataChannel(<label>, [options])`

```javascript
// 创建有序数据通道
const channel = pc.createDataChannel('chat', {
  ordered: true,           // 保证送达顺序
  maxRetransmits: 3,       // 最大重传次数
  // maxPacketLifeTime: 3000  // 最大生存时间(毫秒,与 maxRetransmits 二选一)
});

channel.onopen = () => {
  console.log('通道已打开');
  channel.send('Hello!');
};

channel.onmessage = (event) => {
  console.log('收到:', event.data);
};

channel.onclose = () => console.log('通道已关闭');
channel.onerror = (err) => console.error('通道错误:', err);
```

**接收对端数据通道**
`pc.ondatachannel = (event) => { event.channel }`

```javascript
// 被叫方监听对端创建的数据通道
pc.ondatachannel = (event) => {
  const channel = event.channel;
  channel.onmessage = (e) => console.log('收到:', e.data);
  channel.onopen = () => channel.send('已连接');
};
```

---

## 连接关闭与状态

**关闭连接**
`pc.close()`

```javascript
// 关闭点对点连接,释放资源
pc.close();
```

**RTCPeerConnection 状态表**

| 属性                    | 值                                                  |
| ----------------------- | --------------------------------------------------- |
| `connectionState`       | new \| connecting \| connected \| disconnected \| failed \| closed |
| `iceConnectionState`    | new \| checking \| connected \| completed \| disconnected \| failed \| closed |
| `iceGatheringState`     | new \| gathering \| complete                        |
| `signalingState`        | stable \| have-local-offer \| have-remote-offer \| have-local-pranswer \| have-remote-pranswer \| closed |

---

## 安全与权限

- **HTTPS 要求**:WebRTC API 仅在安全上下文(HTTPS 或 localhost)中可用
- **用户授权**:`getUserMedia` 首次调用会弹出权限请求
- **权限查询**:`navigator.permissions.query({ name: 'camera' })` 或 `'microphone'`
- **加密传输**:WebRTC 所有的媒体流和数据通道均强制使用 SRTP/DTLS 加密
- **隐私保护**:摄像头/麦克风指示灯会亮起,提醒用户媒体正在被捕获
