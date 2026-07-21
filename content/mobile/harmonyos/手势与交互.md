# 手势与交互 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 手势绑定 API

**绑定手势**
`.gesture(gesture: GestureType, mask?: GestureMask): void`
```typescript
Text('点击我')
  .gesture(
    TapGesture()
      .onAction(() => {
        console.info('点击触发');
      })
  );
```

**优先级手势(父组件优先)**
`.priorityGesture(gesture: GestureType, mask?: GestureMask): void`
```typescript
Column() {
  Text('子组件')
    .gesture(TapGesture().onAction(() => console.info('子组件')))
}
.priorityGesture(TapGesture().onAction(() => console.info('父组件优先')));
```

**并行手势(子父组件同时识别)**
`.parallelGesture(gesture: GestureType, mask?: GestureMask): void`
```typescript
Scroll() {
  Text('可滚动且可拖动')
    .parallelGesture(PanGesture().onActionUpdate((event) => {
      console.info(`拖动中: ${event.offsetX}`);
    }));
};
```

**GestureMask 枚举**
`GestureMask`
```typescript
enum GestureMask {
  Normal = 'normal',     // 正常手势识别
  IgnoreInternal = 'ignoreInternal' // 忽略内部手势
}
```

---

## 点击手势

**TapGesture 构造**
`new TapGesture(value?: TapGestureInterface): TapGesture`
```typescript
TapGesture({ count: 1, fingers: 1 });
```

**TapGestureOption 配置**
```typescript
interface TapGestureOption {
  count?: number;   // 点击次数,默认 1
  fingers?: number; // 手指数量,默认 1
  repeat?: boolean; // 是否重复触发,默认 false
}
```

**点击事件回调**
`.onAction(event: (event: GestureEvent) => void): TapGesture`
```typescript
TapGesture({ count: 1 })
  .onAction((event: GestureEvent) => {
    console.info(`单击触发,手指数: ${event.fingerList.length}`);
  });
```

**单击示例**
```typescript
Text('单击我')
  .gesture(
    TapGesture({ count: 1 })
      .onAction(() => {
        this.clickCount++;
      })
  );
```

**双击示例**
```typescript
Text('双击我')
  .gesture(
    TapGesture({ count: 2 })
      .onAction(() => {
        this.message = '双击成功';
      })
  );
```

---

## 长按手势

**LongPressGesture 构造**
`new LongPressGesture(value?: LongPressGestureInterface): LongPressGesture`
```typescript
LongPressGesture({ repeat: true, duration: 500, fingers: 1 });
```

**LongPressGestureOption 配置**
```typescript
interface LongPressGestureOption {
  repeat?: boolean;    // 是否重复触发,默认 false
  fingers?: number;    // 手指数量,默认 1
  duration?: number;   // 触发时长(ms),默认 500
}
```

**长按事件回调**
`.onAction(event: (event: GestureEvent) => void): LongPressGesture`
`.onActionEnd(event: (event: GestureEvent) => void): LongPressGesture`
`.onActionCancel(event: () => void): LongPressGesture`
```typescript
LongPressGesture({ repeat: true, duration: 500 })
  .onAction((event: GestureEvent) => {
    console.info(`长按中,重复次数: ${event.repeatCount}`);
  })
  .onActionEnd(() => {
    console.info('长按结束');
  })
  .onActionCancel(() => {
    console.info('长按取消');
  });
```

---

## 拖动手势

**PanGesture 构造**
`new PanGesture(value?: PanGestureInterface): PanGesture`
```typescript
PanGesture({ fingers: 1, distance: 5, direction: PanDirection.All });
```

**PanGestureOption 配置**
```typescript
interface PanGestureOption {
  fingers?: number;           // 手指数量,默认 1
  distance?: number;          // 触发距离,默认 5(vp)
  direction?: PanDirection;   // 触发方向,默认 All
}
```

**PanDirection 枚举**
`PanDirection`
```typescript
enum PanDirection {
  All = 'all',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Left = 'left',
  Right = 'right',
  Up = 'up',
  Down = 'down'
}
```

**拖动事件回调**
`.onActionStart(event: (event: GestureEvent) => void): PanGesture`
`.onActionUpdate(event: (event: GestureEvent) => void): PanGesture`
`.onActionEnd(event: (event: GestureEvent) => void): PanGesture`
```typescript
PanGesture()
  .onActionStart((event: GestureEvent) => {
    console.info('开始拖动');
  })
  .onActionUpdate((event: GestureEvent) => {
    this.offsetX += event.offsetX;
    this.offsetY += event.offsetY;
  })
  .onActionEnd(() => {
    console.info('拖动结束');
  });
```

**拖动示例**
```typescript
Row()
  .width(100).height(100)
  .backgroundColor(Color.Blue)
  .translate({ x: this.offsetX, y: this.offsetY })
  .gesture(
    PanGesture()
      .onActionUpdate((event: GestureEvent) => {
        this.offsetX += event.offsetX;
        this.offsetY += event.offsetY;
      })
  );
```

---

## 缩放手势

**PinchGesture 构造**
`new PinchGesture(value?: PinchGestureInterface): PinchGesture`
```typescript
PinchGesture({ fingers: 2, distance: 3 });
```

**PinchGestureOption 配置**
```typescript
interface PinchGestureOption {
  fingers?: number;   // 手指数量,默认 2
  distance?: number;  // 触发距离,默认 3(vp)
}
```

**缩放事件回调**
`.onActionStart(event: (event: GestureEvent) => void): PinchGesture`
`.onActionUpdate(event: (event: GestureEvent) => void): PinchGesture`
`.onActionEnd(event: (event: GestureEvent) => void): PinchGesture`
```typescript
PinchGesture()
  .onActionUpdate((event: GestureEvent) => {
    this.scale = Math.max(0.5, Math.min(3.0, this.scale * event.scale));
  });
```

**缩放示例**
```typescript
Image($r('app.media.photo'))
  .width(300).height(300)
  .objectFit(ImageFit.Contain)
  .scale({ x: this.scale, y: this.scale })
  .gesture(
    PinchGesture()
      .onActionUpdate((event: GestureEvent) => {
        this.scale = Math.max(0.5, Math.min(3.0, this.scale * event.scale));
      })
  );
```

---

## 旋转手势

**RotationGesture 构造**
`new RotationGesture(value?: RotationGestureInterface): RotationGesture`
```typescript
RotationGesture({ fingers: 2, angle: 1 });
```

**RotationGestureOption 配置**
```typescript
interface RotationGestureOption {
  fingers?: number;  // 手指数量,默认 2
  angle?: number;    // 触发角度,默认 1(度)
}
```

**旋转事件回调**
`.onActionStart(event: (event: GestureEvent) => void): RotationGesture`
`.onActionUpdate(event: (event: GestureEvent) => void): RotationGesture`
`.onActionEnd(event: (event: GestureEvent) => void): RotationGesture`
```typescript
RotationGesture()
  .onActionUpdate((event: GestureEvent) => {
    this.angle += event.angle;
  });
```

**旋转示例**
```typescript
Image($r('app.media.photo'))
  .width(200).height(200)
  .rotate({ angle: this.angle })
  .gesture(
    RotationGesture()
      .onActionUpdate((event: GestureEvent) => {
        this.angle += event.angle;
      })
  );
```

---

## 组合手势

**GestureGroup 构造**
`GestureGroup(mode: GestureMode, ...gestures: GestureType): GestureGroup`
```typescript
GestureGroup(
  GestureMode.Exclusive,
  TapGesture({ count: 2 }),
  LongPressGesture(),
  PanGesture()
);
```

**GestureMode 枚举**
`GestureMode`
```typescript
enum GestureMode {
  Sequential = 'sequential', // 串行模式
  Parallel = 'parallel',     // 并行模式
  Exclusive = 'exclusive'    // 互斥模式
}
```

**组合手势事件回调**
`.onActionStart(event: (event: GestureEvent) => void): GestureGroup`
`.onActionUpdate(event: (event: GestureEvent) => void): GestureGroup`
`.onActionEnd(event: (event: GestureEvent) => void): GestureGroup`
```typescript
GestureGroup(GestureMode.Parallel,
  PinchGesture().onActionUpdate((event) => {
    this.scale = Math.max(0.5, Math.min(5.0, this.scale * event.scale));
  }),
  RotationGesture().onActionUpdate((event) => {
    this.angle += event.angle;
  })
);
```

**三种组合模式示例**
```typescript
// 串行:先长按,长按成功后才能拖动
GestureGroup(GestureMode.Sequential,
  LongPressGesture(),
  PanGesture()
);

// 并行:缩放与旋转同时识别
GestureGroup(GestureMode.Parallel,
  PinchGesture(),
  RotationGesture()
);

// 互斥:只响应第一个识别成功的手势
GestureGroup(GestureMode.Exclusive,
  TapGesture({ count: 2 }),
  LongPressGesture(),
  PanGesture()
);
```

---

## GestureEvent 事件对象

**GestureEvent 属性**
```typescript
interface GestureEvent {
  repeatCount: number;        // 重复次数(长按)
  offsetX: number;            // X 轴偏移(拖动)
  offsetY: number;            // Y 轴偏移(拖动)
  scale: number;              // 缩放比例
  angle: number;              // 旋转角度
  speed: number;              // 速度
  fingerList: FingerInfo[];   // 手指信息列表
  pinchCenterX: number;       // 缩放中心 X
  pinchCenterY: number;       // 缩放中心 Y
}
```

**FingerInfo 手指信息**
```typescript
interface FingerInfo {
  id: number;          // 手指 ID
  globalX: number;     // 全局 X 坐标
  globalY: number;     // 全局 Y 坐标
  localX: number;      // 局部 X 坐标
  localY: number;      // 局部 Y 坐标
}
```

---

## 触摸事件

**绑定触摸事件**
`.onTouch(event: (event: TouchEvent) => void): void`
```typescript
Column() {
  Text('触摸区域')
}
.onTouch((event: TouchEvent) => {
  switch (event.type) {
    case TouchType.Down:
      console.info('手指按下');
      break;
    case TouchType.Move:
      console.info('手指移动');
      break;
    case TouchType.Up:
      console.info('手指抬起');
      break;
  }
});
```

**TouchType 枚举**
`TouchType`
```typescript
enum TouchType {
  Down = 0,  // 按下
  Up = 1,    // 抬起
  Move = 2,  // 移动
  Cancel = 3 // 取消
}
```

**TouchEvent 属性**
```typescript
interface TouchEvent {
  type: TouchType;            // 触摸类型
  touches: TouchObject[];     // 当前所有触摸点
  changedTouches: TouchObject[]; // 发生变化的触摸点
  source: SourceType;         // 事件来源
  timestamp: number;          // 时间戳
}
```

**TouchObject 触摸点**
```typescript
interface TouchObject {
  id: number;       // 触摸点 ID
  x: number;        // 局部 X 坐标
  y: number;        // 局部 Y 坐标
  screenX: number;  // 屏幕 X 坐标
  screenY: number;  // 屏幕 Y 坐标
}
```

---

## 通用事件

**点击事件**
`.onClick(event: (event: ClickEvent) => void): void`
```typescript
Button('点击').onClick((event: ClickEvent) => {
  console.info(`点击位置: (${event.x}, ${event.y})`);
});
```

**触摸区域事件**
`.onTouch(event: (event: TouchEvent) => void): void`
```typescript
Text('触摸').onTouch((event) => {
  if (event.type === TouchType.Down) {
    console.info('按下');
  }
});
```

**按键事件**
`.onKeyEvent(event: (event: KeyEvent) => void): void`
```typescript
TextInput({ placeholder: '请输入' })
  .onKeyEvent((event: KeyEvent) => {
    if (event.type === KeyType.Down) {
      console.info(`按下键: ${event.keyCode}`);
    }
  });
```

**挂起/失去焦点事件**
`.onMouse(event: (event: MouseEvent) => void): void`
`.onHover(event: (isHover: boolean) => void): void`
```typescript
Text('鼠标区域')
  .onHover((isHover) => {
    console.info(`悬停状态: ${isHover}`);
  });
```

