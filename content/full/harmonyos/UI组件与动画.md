---
order: 3
title: UI组件与动画
module: harmonyos
category: 鸿蒙开发
difficulty: intermediate
description: 基础组件、容器组件、自定义组件、动画效果、深色模式适配与响应式布局。
author: fanquanpp
updated: '2026-06-14'
related:
  - harmonyos/概述与环境搭建
  - harmonyos/ArkTS与ArkUI
  - harmonyos/网络与数据持久化
  - harmonyos/多媒体与设备能力
prerequisites: []
---

## 1. 基础组件

### 1.1 Text 文本组件

```typescript
@Entry
@Component
struct TextDemo {
  build() {
    Scroll() {
      Column({ space: 12 }) {
        // 基础文本
        Text('基础文本')
          .fontSize(16)

        // 富文本样式
        Text('彩色粗体文本')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1a73e8')
          .letterSpacing(2)

        // 多行文本
        Text('这是一段很长的文本内容，当文本超过容器宽度时会自动换行显示')
          .fontSize(14)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        // 文本装饰
        Text('带装饰线的文本')
          .fontSize(16)
          .decoration({ type: TextDecorationType.Underline, color: '#1a73e8' })

        // Span 富文本
        Text() {
          Span('红色文本')
            .fontColor('#ff0000')
            .fontSize(16)
          Span(' 蓝色文本')
            .fontColor('#0000ff')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
        }
      }
      .padding(16)
    }
  }
}
```

### 1.2 Button 按钮组件

```typescript
@Entry
@Component
struct ButtonDemo {
  build() {
    Column({ space: 16 }) {
      // 基础按钮
      Button('主要按钮')
        .width('80%')
        .height(44)
        .type(ButtonType.Capsule)

      // 胶囊按钮
      Button('胶囊按钮')
        .width('80%')
        .height(44)
        .type(ButtonType.Capsule)
        .backgroundColor('#ff6600')

      // 圆形按钮
      Button('+')
        .width(56)
        .height(56)
        .type(ButtonType.Circle)
        .fontSize(24)

      // 自定义内容按钮
      Button() {
        Row({ space: 8 }) {
          Text('下载')
            .fontColor(Color.White)
            .fontSize(16)
          Text('12.5MB')
            .fontColor('#ffffffcc')
            .fontSize(12)
        }
      }
      .width('80%')
      .height(48)
      .type(ButtonType.Capsule)
      .backgroundColor('#1a73e8')

      // 禁用状态
      Button('禁用按钮')
        .width('80%')
        .height(44)
        .enabled(false)
        .opacity(0.5)
    }
    .padding(16)
  }
}
```

### 1.3 Image 图片组件

```typescript
@Entry
@Component
struct ImageDemo {
  build() {
    Column({ space: 16 }) {
      // 网络图片
      Image('https://example.com/photo.jpg')
        .width(200)
        .height(150)
        .objectFit(ImageFit.Cover)
        .borderRadius(8)
        .alt($r('app.media.placeholder'))  // 占位图

      // 本地资源图片
      Image($r('app.media.logo'))
        .width(100)
        .height(100)
        .interpolation(ImageInterpolation.High)

      // SVG 图标
      Image($r('app.media.icon_home'))
        .width(24)
        .height(24)
        .fillColor('#999999')

      // 图片事件
      Image($r('app.media.photo'))
        .width(200)
        .height(150)
        .onComplete(() => {
          console.info('图片加载完成');
        })
        .onError(() => {
          console.error('图片加载失败');
        })
    }
    .padding(16)
  }
}
```

### 1.4 List 列表组件

```typescript
interface ContactItem {
  name: string;
  phone: string;
  avatar: Resource;
}

@Entry
@Component
struct ListDemo {
  @State contacts: ContactItem[] = [
    { name: '张三', phone: '138****1234', avatar: $r('app.media.avatar1') },
    { name: '李四', phone: '139****5678', avatar: $r('app.media.avatar2') },
    { name: '王五', phone: '137****9012', avatar: $r('app.media.avatar3') },
  ];

  build() {
    Column() {
      List({ space: 8 }) {
        ForEach(this.contacts, (item: ContactItem) => {
          ListItem() {
            Row({ space: 12 }) {
              Image(item.avatar)
                .width(48)
                .height(48)
                .borderRadius(24)
              Column({ space: 4 }) {
                Text(item.name).fontSize(16).fontWeight(FontWeight.Medium)
                Text(item.phone).fontSize(14).fontColor('#999999')
              }
              .alignItems(HorizontalAlign.Start)
              .layoutWeight(1)
              Image($r('app.media.icon_arrow'))
                .width(16)
                .height(16)
            }
            .padding(12)
            .backgroundColor(Color.White)
            .borderRadius(8)
          }
          .swipeAction({ end: this.deleteButton() })
        })
      }
      .width('100%')
      .layoutWeight(1)
    }
    .padding(16)
  }

  @Builder
  deleteButton() {
    Button('删除')
      .backgroundColor('#ff4444')
      .fontColor(Color.White)
      .height('100%')
  }
}
```

### 1.5 Grid 网格组件

```typescript
@Entry
@Component
struct GridDemo {
  @State apps: string[] = ['微信', '支付宝', '淘宝', '抖音', '美团', '京东'];

  build() {
    Grid() {
      ForEach(this.apps, (app: string) => {
        GridItem() {
          Column({ space: 8 }) {
            Image($r('app.media.icon_default'))
              .width(48)
              .height(48)
            Text(app)
              .fontSize(12)
              .maxLines(1)
          }
          .justifyContent(FlexAlign.Center)
        }
      })
    }
    .columnsTemplate('1fr 1fr 1fr 1fr')
    .rowsTemplate('1fr 1fr')
    .columnsGap(16)
    .rowsGap(16)
    .width('100%')
    .height(300)
    .padding(16)
  }
}
```

### 1.6 Tabs 标签组件

```typescript
@Entry
@Component
struct TabsDemo {
  @State currentIndex: number = 0;

  build() {
    Column() {
      Tabs({ barPosition: BarPosition.End }) {
        TabContent() {
          this.HomeContent()
        }
        .tabBar('首页')

        TabContent() {
          this.DiscoverContent()
        }
        .tabBar('发现')

        TabContent() {
          this.ProfileContent()
        }
        .tabBar('我的')
      }
      .width('100%')
      .layoutWeight(1)
      .onChange((index: number) => {
        this.currentIndex = index;
      })
    }
  }

  @Builder HomeContent() {
    Column() {
      Text('首页内容').fontSize(24)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder DiscoverContent() {
    Column() {
      Text('发现内容').fontSize(24)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder ProfileContent() {
    Column() {
      Text('个人中心').fontSize(24)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
```

## 2. 容器组件

### 2.1 Column 与 Row

```typescript
@Entry
@Component
struct LayoutDemo {
  build() {
    Column({ space: 16 }) {
      // 垂直布局
      Text('Column 垂直布局')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)

      Row({ space: 12 }) {
        Text('左')
          .layoutWeight(1)
          .textAlign(TextAlign.Start)
        Text('中')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        Text('右')
          .layoutWeight(1)
          .textAlign(TextAlign.End)
      }
      .width('100%')
      .padding(12)
      .backgroundColor('#f0f0f0')
      .borderRadius(8)
    }
    .width('100%')
    .padding(16)
  }
}
```

### 2.2 Stack 层叠布局

```typescript
@Entry
@Component
struct StackDemo {
  build() {
    Stack({ alignContent: Alignment.BottomEnd }) {
      // 底层图片
      Image($r('app.media.banner'))
        .width('100%')
        .height(200)
        .objectFit(ImageFit.Cover)
        .borderRadius(12)

      // 叠加渐变遮罩
      Column() {
        Text('热门推荐')
          .fontSize(20)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
        Text('精选优质内容')
          .fontSize(14)
          .fontColor('#ffffffcc')
      }
      .width('100%')
      .padding(16)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .height(200)
    .borderRadius(12)
  }
}
```

### 2.3 Swiper 轮播组件

```typescript
@Entry
@Component
struct SwiperDemo {
  private swiperController: SwiperController = new SwiperController();

  build() {
    Column() {
      Swiper(this.swiperController) {
        Text('轮播 1')
          .width('100%')
          .height(180)
          .backgroundColor('#1a73e8')
          .fontColor(Color.White)
          .fontSize(24)
          .textAlign(TextAlign.Center)

        Text('轮播 2')
          .width('100%')
          .height(180)
          .backgroundColor('#ff6600')
          .fontColor(Color.White)
          .fontSize(24)
          .textAlign(TextAlign.Center)

        Text('轮播 3')
          .width('100%')
          .height(180)
          .backgroundColor('#00bfa5')
          .fontColor(Color.White)
          .fontSize(24)
          .textAlign(TextAlign.Center)
      }
      .autoPlay(true)
      .interval(3000)
      .indicator(true)
      .loop(true)
      .onChange((index: number) => {
        console.info(`当前轮播: ${index}`);
      })
    }
    .padding(16)
  }
}
```

## 3. 自定义组件

### 3.1 封装可复用组件

```typescript
// 可复用的卡片组件
@Component
export struct InfoCard {
  @Prop title: string = '';
  @Prop subtitle: string = '';
  @Prop icon: Resource = $r('app.media.icon_default');
  onCardClick?: () => void;

  build() {
    Row({ space: 12 }) {
      Image(this.icon)
        .width(48)
        .height(48)
        .borderRadius(8)

      Column({ space: 4 }) {
        Text(this.title)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .maxLines(1)
        Text(this.subtitle)
          .fontSize(13)
          .fontColor('#999999')
          .maxLines(1)
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)

      Image($r('app.media.icon_arrow'))
        .width(16)
        .height(16)
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({ radius: 4, color: '#1a000000', offsetY: 2 })
    .onClick(() => {
      this.onCardClick?.();
    })
  }
}

// 使用自定义组件
@Entry
@Component
struct CustomComponentDemo {
  build() {
    Column({ space: 12 }) {
      InfoCard({
        title: '系统设置',
        subtitle: '管理应用和系统配置',
        icon: $r('app.media.icon_settings'),
        onCardClick: () => {
          console.info('点击了系统设置');
        }
      })

      InfoCard({
        title: '账户安全',
        subtitle: '密码、指纹与面部识别',
        icon: $r('app.media.icon_security')
      })
    }
    .padding(16)
  }
}
```

## 4. 动画效果

### 4.1 属性动画

通过 `animation()` 装饰器实现属性变化的过渡动画：

```typescript
@Entry
@Component
struct PropertyAnimationDemo {
  @State scale: number = 1;
  @State rotate: number = 0;
  @State opacity: number = 1;

  build() {
    Column({ space: 30 }) {
      Image($r('app.media.icon_star'))
        .width(80)
        .height(80)
        .scale({ x: this.scale, y: this.scale })
        .rotate({ angle: this.rotate })
        .opacity(this.opacity)
        .animation({
          duration: 500,
          curve: Curve.EaseInOut,
          iterations: 1,
        })

      Row({ space: 12 }) {
        Button('放大').onClick(() => { this.scale = 1.5; })
        Button('缩小').onClick(() => { this.scale = 0.5; })
        Button('旋转').onClick(() => { this.rotate += 90; })
        Button('闪烁').onClick(() => { this.opacity = this.opacity === 1 ? 0.3 : 1; })
      }
    }
    .padding(16)
  }
}
```

### 4.2 显式动画

使用 `animateTo()` 控制动画：

```typescript
@Entry
@Component
struct ExplicitAnimationDemo {
  @State translateX: number = 0;
  @State bgColor: ResourceColor = '#1a73e8';

  build() {
    Column({ space: 30 }) {
      Row() {
        Text('滑动方块')
          .fontColor(Color.White)
          .fontSize(16)
      }
      .width(120)
      .height(120)
      .backgroundColor(this.bgColor)
      .borderRadius(12)
      .translate({ x: this.translateX })
      .justifyContent(FlexAlign.Center)

      Button('滑动并变色')
        .onClick(() => {
          animateTo({
            duration: 600,
            curve: Curve.FastOutSlowIn,
            onFinish: () => {
              console.info('动画完成');
            }
          }, () => {
            this.translateX = this.translateX === 0 ? 200 : 0;
            this.bgColor = this.bgColor === '#1a73e8' ? '#ff6600' : '#1a73e8';
          });
        })
    }
    .padding(16)
  }
}
```

### 4.3 转场动画

页面间转场效果：

```typescript
// 页面 A
@Entry
@Component
struct PageA {
  build() {
    Column() {
      Text('页面 A')
        .fontSize(24)
      Button('跳转页面 B')
        .onClick(() => {
          animateTo({ duration: 400 }, () => {
            // 触发转场
          });
          // 路由跳转
        })
    }
  }
}

// 组件转场
@Component
struct TransitionDemo {
  @State show: boolean = false;

  build() {
    Column() {
      Button('显示/隐藏')
        .onClick(() => {
          animateTo({ duration: 300 }, () => {
            this.show = !this.show;
          });
        })

      if (this.show) {
        Text('转场元素')
          .fontSize(24)
          .transition({
            type: TransitionType.Insertion,
            opacity: 0,
            translate: { y: -50 },
          })
          .transition({
            type: TransitionType.Deletion,
            opacity: 0,
            translate: { y: 50 },
          })
      }
    }
  }
}
```

### 4.4 动画曲线

| 曲线                    | 效果                 | 适用场景 |
| :---------------------- | :------------------- | :------- |
| **Curve.Linear**        | 匀速                 | 进度条   |
| **Curve.Ease**          | 先慢后快再慢         | 通用     |
| **Curve.EaseIn**        | 先慢后快             | 退出动画 |
| **Curve.EaseOut**       | 先快后慢             | 进入动画 |
| **Curve.EaseInOut**     | 两头慢中间快         | 位移动画 |
| **Curve.FastOutSlowIn** | 快出慢入（Material） | 强调动画 |
| **Curve.Spring**        | 弹簧效果             | 弹性交互 |
| **cubicBezier**         | 自定义贝塞尔曲线     | 精细控制 |

## 5. 深色模式适配

### 5.1 资源限定词

```
resources/
├── base/                 # 默认资源
│   ├── element/
│   │   └── color.json
│   └── media/
├── dark/                 # 深色模式资源
│   ├── element/
│   │   └── color.json
│   └── media/
└── rawfile/
```

### 5.2 颜色资源定义

```json
// base/element/color.json
{
  "color": [
    { "name": "bg_color", "value": "#ffffff" },
    { "name": "text_primary", "value": "#333333" },
    { "name": "text_secondary", "value": "#999999" }
  ]
}

// dark/element/color.json
{
  "color": [
    { "name": "bg_color", "value": "#1a1a1a" },
    { "name": "text_primary", "value": "#e5e5e5" },
    { "name": "text_secondary", "value": "#999999" }
  ]
}
```

### 5.3 代码中使用

```typescript
@Entry
@Component
struct DarkModeDemo {
  build() {
    Column() {
      Text('深色模式适配')
        .fontColor($r('app.color.text_primary'))
        .fontSize(20)

      Text('自动跟随系统')
        .fontColor($r('app.color.text_secondary'))
        .fontSize(14)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.bg_color'))
  }
}
```

## 6. 响应式布局

### 6.1 断点系统

```typescript
@Entry
@Component
struct ResponsiveDemo {
  @State currentBreakpoint: string = 'md';

  build() {
    GridRow({
      columns: {
        sm: 4,   // 小屏 4 列
        md: 8,   // 中屏 8 列
        lg: 12   // 大屏 12 列
      },
      breakpoints: {
        value: ['320vp', '600vp', '840vp'],
        reference: BreakpointsReference.WindowSize
      }
    }) {
      Col({ span: { sm: 4, md: 4, lg: 6 } }) {
        Text('左侧内容')
          .padding(16)
      }
      .backgroundColor('#f0f0f0')

      Col({ span: { sm: 4, md: 4, lg: 6 } }) {
        Text('右侧内容')
          .padding(16)
      }
      .backgroundColor('#e0e0e0')
    }
    .width('100%')
    .height('100%')
  }
}
```

### 6.2 常用响应式策略

| 策略             | 实现方式                 | 适用场景   |
| :--------------- | :----------------------- | :--------- |
| **百分比宽度**   | `.width('50%')`          | 简单等分   |
| **layoutWeight** | `.layoutWeight(1)`       | 弹性分配   |
| **GridRow/Col**  | 栅格布局系统             | 复杂响应式 |
| **断点监听**     | `mediaQuery` API         | 精细控制   |
| **多态组件**     | 根据设备类型渲染不同组件 | 设备差异化 |
