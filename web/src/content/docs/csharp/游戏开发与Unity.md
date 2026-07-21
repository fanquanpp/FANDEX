---
order: 10
title: 'C# 游戏开发与Unity'
module: csharp
category: 'C#'
difficulty: advanced
description: 'Unity 中 C# 编程、MonoBehaviour 生命周期、协程、ScriptableObject、ECS 模式、DOTS/Burst、性能优化'
author: fanquanpp
updated: '2026-06-14'
related:
  - csharp/NET平台与生态
  - csharp/测试与工程化
  - csharp/LINQ深度解析
  - csharp/异步编程详解
prerequisites: []
---

## 1. Unity 中的 C#

### 1.1 Unity 与 .NET 版本

| Unity 版本  | C# 版本 | .NET 运行时    | 说明                   |
| :---------- | :------ | :------------- | :--------------------- |
| **2021.2+** | C# 9    | Mono/IL2CPP    | 支持 Span、NativeArray |
| **2022.2+** | C# 9    | Mono/IL2CPP    | 可空引用类型           |
| **2023.2+** | C# 9    | CoreCLR/IL2CPP | CoreCLR 可选           |
| **Unity 6** | C# 9    | CoreCLR/IL2CPP | CoreCLR 默认           |

> Unity 使用的是 .NET Standard 2.1 兼容子集，部分 .NET API 不可用。通过 NuGet 包可扩展可用库。

### 1.2 Unity 项目结构

```
Assets/
├── Scripts/              # C# 脚本
│   ├── Player/
│   ├── Enemies/
│   ├── UI/
│   └── Managers/
├── Prefabs/              # 预制体
├── Scenes/               # 场景
├── ScriptableObjects/    # 数据资产
├── Resources/            # 运行时加载资源
└── StreamingAssets/      # 流式资产
```

## 2. MonoBehaviour 生命周期

### 2.1 生命周期流程

```
初始化阶段:
  Awake()       → 脚本实例加载时调用（最早）
  OnEnable()    → 对象启用时调用
  Start()       → 第一帧更新前调用（仅一次）

物理阶段:
  FixedUpdate() → 固定时间间隔调用（物理计算）

输入阶段:
  Update()      → 每帧调用

后期处理:
  LateUpdate()  → 每帧在所有 Update 之后调用

场景渲染:
  OnPreCull()   → OnPreRender() → OnPostRender()

禁用与销毁:
  OnDisable()   → 对象禁用时调用
  OnDestroy()   → 对象销毁时调用
```

### 2.2 生命周期代码

```csharp
public class PlayerController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private Rigidbody rb = null!;

    // 最早调用，用于初始化引用和状态
    private void Awake()
    {
        // 获取组件引用
        rb = GetComponent<Rigidbody>();

        // 初始化内部状态
        _health = maxHealth;
    }

    // 在 Start 之前，每次启用时调用
    private void OnEnable()
    {
        GameEvents.OnPlayerHit += HandleHit;
    }

    // 第一帧之前，用于依赖其他对象的初始化
    private void Start()
    {
        // 可以安全访问其他对象
        var spawnPoint = GameObject.Find("SpawnPoint");
        transform.position = spawnPoint!.transform.position;
    }

    // 物理更新（固定步长，默认 0.02s）
    private void FixedUpdate()
    {
        var move = new Vector3(
            Input.GetAxis("Horizontal"),
            0,
            Input.GetAxis("Vertical"));

        rb.linearVelocity = move * moveSpeed;
    }

    // 每帧更新（游戏逻辑）
    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            Jump();
        }

        UpdateAnimation();
    }

    // 所有 Update 之后（相机跟随等）
    private void LateUpdate()
    {
        Camera.main!.transform.position = transform.position + _cameraOffset;
    }

    // 禁用时调用
    private void OnDisable()
    {
        GameEvents.OnPlayerHit -= HandleHit;
    }

    // 销毁时清理
    private void OnDestroy()
    {
        // 释放资源、取消订阅
    }
}
```

## 3. 协程 (Coroutine)

### 3.1 基本用法

```csharp
// 协程 - Unity 的协作式多任务
public class Spawner : MonoBehaviour
{
    [SerializeField] private GameObject enemyPrefab = null!;
    [SerializeField] private float spawnInterval = 2f;

    private void Start()
    {
        StartCoroutine(SpawnEnemies());
    }

    private IEnumerator SpawnEnemies()
    {
        while (true)
        {
            Instantiate(enemyPrefab, GetRandomPosition(), Quaternion.identity);
            yield return new WaitForSeconds(spawnInterval);
        }
    }

    // 带返回值的协程
    private IEnumerator LoadAssetAsync(string path)
    {
        var request = Resources.LoadAsync<GameObject>(path);
        yield return request; // 等待加载完成

        if (request.asset != null)
        {
            Instantiate(request.asset);
        }
    }

    // 协程链
    private IEnumerator GameSequence()
    {
        yield return StartCoroutine(ShowIntro());
        yield return StartCoroutine(Countdown());
        yield return StartCoroutine(StartGameplay());
    }

    private IEnumerator ShowIntro()
    {
        // 显示介绍画面
        yield return new WaitForSeconds(3f);
    }

    private IEnumerator Countdown()
    {
        for (int i = 3; i > 0; i--)
        {
            Debug.Log(i);
            yield return new WaitForSeconds(1f);
        }
    }
}
```

### 3.2 协程控制

```csharp
public class CoroutineManager : MonoBehaviour
{
    private Coroutine? _currentCoroutine;

    public void StartTask()
    {
        // 停止之前的协程再启动新的
        if (_currentCoroutine != null)
            StopCoroutine(_currentCoroutine);

        _currentCoroutine = StartCoroutine(DoWork());
    }

    public void CancelTask()
    {
        if (_currentCoroutine != null)
        {
            StopCoroutine(_currentCoroutine);
            _currentCoroutine = null;
        }
    }

    // 停止所有协程
    public void CancelAll()
    {
        StopAllCoroutines();
    }

    // WaitUntil / WaitWhile
    private IEnumerator WaitForCondition()
    {
        yield return new WaitUntil(() => PlayerIsReady);
        yield return new WaitWhile(() => IsPaused);
        // 继续执行
    }

    // CustomYieldInstruction
    public class WaitForKeyPress : CustomYieldInstruction
    {
        private readonly KeyCode _key;
        public WaitForKeyPress(KeyCode key) => _key = key;
        public override bool keepWaiting => !Input.GetKeyDown(_key);
    }
}
```

## 4. ScriptableObject

### 4.1 数据驱动设计

```csharp
// 定义数据资产
[CreateAssetMenu(fileName = "NewWeapon", menuName = "Game/Weapon")]
public class WeaponData : ScriptableObject
{
    public string weaponName;
    public int damage;
    public float attackSpeed;
    public GameObject prefab;
    public Sprite icon;

    [Header("特殊效果")]
    public bool hasElementalEffect;
    public ElementalType elementType;
    public float effectDuration;
}

// 使用 ScriptableObject
public class WeaponSystem : MonoBehaviour
{
    [SerializeField] private WeaponData currentWeapon = null!;

    public void Attack()
    {
        Debug.Log($"使用 {currentWeapon.weaponName} 攻击，伤害 {currentWeapon.damage}");
        if (currentWeapon.hasElementalEffect)
        {
            ApplyElementalEffect(currentWeapon.elementType, currentWeapon.effectDuration);
        }
    }
}
```

### 4.2 运行时数据共享

```csharp
// 全局游戏配置
[CreateAssetMenu(fileName = "GameConfig", menuName = "Game/Config")]
public class GameConfig : ScriptableObject
{
    public float gravity = 9.8f;
    public float playerMoveSpeed = 5f;
    public int maxEnemies = 20;
    public LayerMask enemyLayer;

    // 运行时状态（不序列化）
    [System.NonSerialized] public int currentScore;
}

// 通过资源加载获取
public class GameManager : MonoBehaviour
{
    private GameConfig _config = null!;

    private void Awake()
    {
        _config = Resources.Load<GameConfig>("GameConfig");
    }
}
```

## 5. ECS 模式

### 5.1 传统 MonoBehaviour vs ECS

```
MonoBehaviour (OOP):
  GameObject → MonoBehaviour组件 → Update() 轮询
  问题：大量对象时性能差、GC 压力大、缓存不友好

ECS (Entity Component System):
  Entity   → 纯 ID，无数据无行为
  Component→ 纯数据，struct，连续内存
  System   → 纯逻辑，批量处理 Component
  优势：数据局部性、批量处理、无 GC、并行友好
```

### 5.2 Unity DOTS 架构

```
┌─────────────────────────────────────────┐
│              Unity DOTS                  │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Entities    │  │  Burst Compiler  │  │
│  │ (ECS框架)   │  │  (SIMD编译器)     │  │
│  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ C# Job      │  │  Collections     │  │
│  │ System      │  │  (NativeArray等) │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

### 5.3 Entities 基础（Unity ECS）

```csharp
// Component - 纯数据（IComponentData）
public struct Movement : IComponentData
{
    public float3 direction;
    public float speed;
}

public struct Health : IComponentData
{
    public int current;
    public int max;
}

// System - 纯逻辑
[UpdateInGroup(typeof(FixedStepSimulationSystemGroup))]
public partial struct MovementSystem : ISystem
{
    public void OnUpdate(ref SystemState state)
    {
        var dt = SystemAPI.Time.DeltaTime;

        foreach (var (movement, transform) in
            SystemAPI.Query<RefRO<Movement>, RefRW<LocalTransform>>())
        {
            transform.ValueRW.Position +=
                movement.ValueRO.direction * movement.ValueRO.speed * dt;
        }
    }
}

// 生成 Entity
public class SpawnerAuthoring : MonoBehaviour
{
    public GameObject prefab;
    public int count;

    private class Baker : Baker<SpawnerAuthoring>
    {
        public override void Bake(SpawnerAuthoring authoring)
        {
            var entity = GetEntity(TransformUsageFlags.Dynamic);
            var prefabEntity = GetEntity(authoring.prefab, TransformUsageFlags.Dynamic);

            AddComponent(entity, new SpawnerData
            {
                Prefab = prefabEntity,
                Count = authoring.count
            });
        }
    }
}
```

## 6. DOTS/Burst

### 6.1 Burst 编译器

```csharp
using Unity.Burst;
using Unity.Mathematics;

[BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Fast,
              FloatPrecision = FloatPrecision.Standard)]
public struct PathfindingJob : IJobParallelFor
{
    [ReadOnly] public NativeArray<float3> positions;
    [ReadOnly] public NativeArray<float3> targets;
    public NativeArray<float> results;

    public void Execute(int index)
    {
        var dir = targets[index] - positions[index];
        results[index] = math.length(dir);
    }
}

// Burst 编译的方法
[BurstCompile]
public static float3 ComputeNormal(float3 a, float3 b, float3 c)
{
    return math.normalize(math.cross(b - a, c - a));
}
```

### 6.2 C# Job System

```csharp
// IJob - 单线程作业
[BurstCompile]
public struct ComputeDamageJob : IJob
{
    public int baseDamage;
    public float multiplier;
    public NativeArray<int> result;

    public void Execute()
    {
        result[0] = (int)(baseDamage * multiplier);
    }
}

// IJobParallelFor - 并行作业
[BurstCompile]
public struct TransformPositionsJob : IJobParallelFor
{
    [ReadOnly] public NativeArray<float3> input;
    public NativeArray<float3> output;
    public float4x4 matrix;

    public void Execute(int index)
    {
        output[index] = math.transform(matrix, input[index]);
    }
}

// 调度作业
public class JobScheduler : MonoBehaviour
{
    private void Update()
    {
        var input = new NativeArray<float3>(1000, Allocator.TempJob);
        var output = new NativeArray<float3>(1000, Allocator.TempJob);

        // 填充输入数据...

        var job = new TransformPositionsJob
        {
            input = input,
            output = output,
            matrix = float4x4.Translate(new float3(1, 0, 0))
        };

        // 调度并行作业
        var handle = job.Schedule(1000, 64);

        // 等待完成
        handle.Complete();

        // 使用结果...

        // 必须释放
        input.Dispose();
        output.Dispose();
    }
}
```

### 6.3 Native Collections

```csharp
// NativeArray - 连续内存数组
var array = new NativeArray<int>(1000, Allocator.TempJob);
array[0] = 42;
array.Dispose();

// NativeList - 动态数组
var list = new NativeList<int>(Allocator.TempJob);
list.Add(1);
list.Dispose();

// NativeHashMap - 哈希表
var map = new NativeHashMap<int, float3>(100, Allocator.TempJob);
map.TryAdd(1, new float3(1, 0, 0));
map.Dispose();

// NativeQueue - 队列
var queue = new NativeQueue<int>(Allocator.TempJob);
queue.Enqueue(1);
queue.Dispose();

// Allocator 选择
// Temp       - 单帧使用，最快
// TempJob    - 最多4帧，Job 内使用
// Persistent - 长期使用，最慢但最灵活
```

## 7. 性能优化

### 7.1 通用优化策略

```csharp
//  避免在 Update 中分配
private void Update()
{
    var list = new List<int>(); // 每帧 GC 分配！
}

//  缓存集合
private readonly List<int> _cache = new();
private void Update()
{
    _cache.Clear(); // 复用
}

//  避免 GetComponent 频繁调用
private void Update()
{
    GetComponent<Rigidbody>().linearVelocity = Vector3.zero;
}

//  Awake 中缓存
private Rigidbody _rb = null!;
private void Awake() => _rb = GetComponent<Rigidbody>();
private void Update() => _rb.linearVelocity = Vector3.zero;

//  避免字符串拼接
Debug.Log("Score: " + score + " Level: " + level);

//  使用字符串插值或 StringBuilder
Debug.Log($"Score: {score} Level: {level}");

//  避免 GameObject.Find / FindWithTag
var player = GameObject.Find("Player"); // O(n) 遍历

//  使用引用或管理器
[SerializeField] private Transform player;
```

### 7.2 对象池

```csharp
public class ObjectPool : MonoBehaviour
{
    [SerializeField] private GameObject prefab = null!;
    [SerializeField] private int initialSize = 20;

    private readonly Queue<GameObject> _pool = new();

    private void Start()
    {
        for (int i = 0; i < initialSize; i++)
        {
            var obj = Instantiate(prefab, transform);
            obj.SetActive(false);
            _pool.Enqueue(obj);
        }
    }

    public GameObject Get(Vector3 position, Quaternion rotation)
    {
        GameObject obj;
        if (_pool.Count > 0)
        {
            obj = _pool.Dequeue();
        }
        else
        {
            obj = Instantiate(prefab, transform);
        }

        obj.transform.SetPositionAndRotation(position, rotation);
        obj.SetActive(true);
        return obj;
    }

    public void Return(GameObject obj)
    {
        obj.SetActive(false);
        obj.transform.SetParent(transform);
        _pool.Enqueue(obj);
    }
}

// Unity 2021+ 内置对象池
// var pool = new UnityEngine.Pool.ObjectPool<GameObject>(
//     createFunc: () => Instantiate(prefab),
//     actionOnGet: obj => obj.SetActive(true),
//     actionOnRelease: obj => obj.SetActive(false),
//     defaultCapacity: 20);
```

### 7.3 Profiler 使用

```csharp
// 自定义 Profiler 标记
public class EnemyAI : MonoBehaviour
{
    private static readonly ProfilerMarker s_UpdateMarker =
        new("EnemyAI.Update");
    private static readonly ProfilerMarker s_PathfindMarker =
        new("EnemyAI.Pathfinding");

    private void Update()
    {
        s_UpdateMarker.Begin();
        // AI 逻辑
        s_PathfindMarker.Begin();
        FindPath();
        s_PathfindMarker.End();
        s_UpdateMarker.End();
    }
}

// 性能分析要点
// 1. CPU: 关注 GC.Alloc、耗时高的方法
// 2. GPU: 关注 Draw Call 数量、Shader 复杂度
// 3. 内存: 关注堆分配、Native 内存泄漏
// 4. 物理: 关注 FixedUpdate 耗时
```

### 7.4 性能优化清单

| 优化方向       | 具体措施                        | 效果           |
| :------------- | :------------------------------ | :------------- |
| **减少 GC**    | 对象池、缓存集合、避免装箱      | 减少卡顿       |
| **批量处理**   | DOTS/ECS、Job System            | CPU 并行加速   |
| **数据布局**   | struct 替代 class、SOA 替代 AOS | 缓存友好       |
| **渲染优化**   | 合批、LOD、遮挡剔除             | 减少 Draw Call |
| **资源管理**   | Addressables、异步加载          | 减少内存占用   |
| **物理优化**   | 简化碰撞体、分层                | 减少 CPU 开销  |
| **Burst 编译** | 数学运算、热路径代码            | 2-10x 加速     |
