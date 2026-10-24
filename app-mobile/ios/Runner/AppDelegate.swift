import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var lastImpact = 0

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    // GeoHaptics — 触感模式：tick / doubleTick / thud / success
    if let engine = engineBridge.pluginRegistry as? FlutterEngine {
      let channel = FlutterMethodChannel(
        name: "fandex/haptics",
        binaryMessenger: engine.binaryMessenger
      )
      channel.setMethodCallHandler { [weak self] call, result in
        guard call.method == "pattern" else {
          result(FlutterMethodNotImplemented)
          return
        }
        self?.playPattern(call.arguments as? String ?? "tick")
        result("ok")
      }
    }
  }

  private func playPattern(_ name: String) {
    let now = Int64(Date().timeIntervalSince1970 * 1000)
    guard now - lastImpact > 30 else { return }
    lastImpact = now

    switch name {
    case "tick":
      UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.7)
    case "doubleTick":
      UIImpactFeedbackGenerator(style: .medium).impactOccurred(intensity: 0.8)
    case "thud":
      UIImpactFeedbackGenerator(style: .heavy).impactOccurred(intensity: 0.9)
    case "success":
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    default:
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
  }
}
