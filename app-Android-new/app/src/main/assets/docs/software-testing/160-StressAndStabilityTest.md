---
order: 160
title: 压力测试与稳定性测试
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: 负载/压力/稳定性/尖峰测试的目标区分、性能指标的精确语义（分位值、吞吐量、开闭环负载模型）、JMeter/k6/Locust/Gatling 实战与结果分析方法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/140-PerformanceInterfaceTest'
  - 'software-testing/150-JMeter'
  - 'software-testing/210-AutomationTestFrameworkComparison'
prerequisites:
  - 'software-testing/140-PerformanceInterfaceTest'
---

## 1. 四类测试，四个问题

压测领域术语混用严重，先按「要回答什么问题」划分清楚：

| 类型         | 要回答的问题                   | 典型做法                     |
| ------------ | ------------------------------ | ---------------------------- |
| **负载测试** | 预期峰值下系统表现达标吗       | 加压到预期并发，验证指标     |
| **压力测试** | 极限在哪、怎么崩               | 持续加压直到吞吐量拐点/报错  |
| **稳定性测试**<br/>（浸泡/耐久） | 长时间运行会不会劣化           | 常规负载跑 8-72 小时，盯内存泄漏、连接池耗尽、性能衰减 |
| **尖峰测试** | 突发流量会不会打垮系统         | 瞬间拉到峰值再回落，看恢复   |

一句话区分：负载测「能不能扛住预期」，压力测「天花板在哪」，稳定性测
「扛得久不久」，尖峰测「冷不防来一波行不行」。

前置知识：性能指标（RT/TPS/QPS）的基本含义、「性能与接口测试」一文。

## 2. 指标语义：最容易踩坑的部分

### 2.1 响应时间必须看分位值，不能看平均值

「平均响应时间 200ms」可能毫无意义：100 个请求里 95 个 50ms、5 个
3200ms，平均值约 200ms，但每个用户都有 5% 概率碰上 3 秒。行业通行口径：

| 指标    | 含义                       | 用途                         |
| ------- | -------------------------- | ---------------------------- |
| P50     | 中位数                     | 用户的「典型」体验           |
| P95     | 95% 请求快于此值           | 绝大多数用户的体验下限       |
| P99     | 99% 请求快于此值           | 尾部体验，暴露长尾问题       |
| Max     | 最慢一次                   | 受单次抖动影响大，只作参考   |

**长尾才是稳定性测试的重点**：平均值平稳但 P99 缓慢爬升，往往预示连接池
不足、GC 停顿累积或锁竞争。

### 2.2 吞吐量、TPS、QPS

- **QPS**（Queries per second）：每秒查询数，常指读请求；
- **TPS**（Transactions per second）：每秒完成的完整业务事务数；
- **吞吐量**（Throughput）：单位时间处理量，HTTP 压测中常以 req/s 表示。

三者不是同义词：一次「下单事务」可能包含 4 个 HTTP 请求，TPS 是 100 时
QPS 可能是 400。汇报结果时必须说清口径，否则数字不可比。

### 2.3 并发用户数与开环/闭环负载

「1 万在线用户」不等于「1 万并发请求」。压测工具的负载模型分两类：

- **闭环（closed model）**：固定数量虚拟用户，每个用户「发请求-等响应-
  再发」。响应变慢时请求自然减少——系统崩了吞吐量反而「看起来稳定」，
  这是 JMeter 线程组类工具的默认行为，容易掩盖崩溃。
- **开环（open model）**：按固定速率到达（如每秒 500 个请求），不管响应
  快慢。真实流量更接近开环，能暴露过载排队与雪崩。

k6 的 `constant-arrival-rate` executor、JMeter 的 Throughput Shaping Timer
都是开环手段；只做闭环压测得到的天花板往往偏乐观。

## 3. 工具现状与选型（2026-09）

| 工具        | 语言/脚本        | 特点                                                       |
| ----------- | ---------------- | ---------------------------------------------------------- |
| JMeter      | GUI + Java      | 最成熟，协议覆盖广；GUI 只用于录制调试，施压必须用非 GUI 模式 |
| Grafana k6  | JavaScript/TS   | Go 引擎，单机吞吐高；已进入 1.0 稳定版；`thresholds` 阈值原生集成 CI，配合 Grafana 出图 |
| Locust      | Python          | 用纯 Python 写用户行为，灵活度最高；gevent 协程，单机承载低于 k6；原生支持分布式多机 |
| Gatling     | Scala DSL（低代码版可选） | 报告精细，高并发表现好，Java 技术栈亲和 |

选型速判：Java 团队与多协议混合选 JMeter；CI/CD 优先、JS 团队选 k6；
需要复杂自定义用户行为或 Python 技术栈选 Locust。

## 4. 实战：k6 脚本与执行

```javascript
// spike.js：尖峰场景——目标速率 50/s 起步，1 分钟内冲到 500/s，再回落
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',   // 开环：按到达速率施压
      startRate: 50, timeUnit: '1s',
      preAllocatedVUs: 200, maxVUs: 2000, // 预分配虚拟用户，避免施压不足
      stages: [
        { target: 500, duration: '1m' },  // 1 分钟爬升到 500 请求/秒
        { target: 500, duration: '2m' },  // 峰值持续
        { target: 50,  duration: '1m' },  // 回落，观察恢复能力
      ],
    },
  },
  thresholds: {                            // 阈值不达标时 k6 退出码非零
    http_req_duration: ['p(95)<400'],      // P95 < 400ms
    http_req_failed: ['rate<0.01'],        // 错误率 < 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, {
    '状态码 200': (r) => r.status === 200,
    '响应包含列表': (r) => r.json('items') !== undefined,
  });
  sleep(1);   // 模拟用户思考时间（闭环场景下有意义）
}
```

```bash
k6 run spike.js        # 本地执行；阈值失败时命令退出码非零，可直接进 CI
```

Locust 等价写法（Python）：

```python
# locustfile.py：locust -f locustfile.py --headless -u 500 -r 50
from locust import HttpUser, task, between

class ShopUser(HttpUser):
    wait_time = between(1, 3)          # 用户思考时间

    @task
    def browse_products(self):
        with self.client.get("/products", catch_response=True) as resp:
            if resp.status_code != 200:
                resp.failure(f"bad status {resp.status_code}")
```

## 5. 结果分析：从数字到结论

1. **先看拐点**：绘「并发/速率-吞吐量」与「并发-响应时间」两条曲线。
   负载测试的黄金拐点：吞吐量停止线性增长、RT 开始陡升的位置即系统
   实际容量。
2. **错误分类**：4xx 多半是压测脚本或数据问题（限流、参数失效），5xx
   与超时才是服务端容量问题。把限流触发的 429 当「压测失败」是最常见的
   误判。
3. **对照资源监控**：压测数据必须与服务器 CPU/内存/GC/连接池/磁盘 IO
   联合分析。RT 上升 + CPU 未满，瓶颈通常在锁、连接池或下游依赖，
   而不是算力。
4. **稳定性测试盯趋势**：内存阶梯式上涨（只升不降）提示泄漏；P99 逐日
   抬升提示累积性劣化（日志膨胀、表索引退化、句柄泄漏）。

## 6. 常见陷阱

- **拿平均值汇报**：向业务方报「平均 80ms」掩盖了 P99 3s 的事实。
  内外部沟通统一用分位值。
- **施压机先成为瓶颈**：单机打满 CPU/带宽后，服务端数据全失真。
  JMeter 用分布式节点、k6/Locust 多实例分片，并监控施压机自身。
- **压测环境与生产不成比例**：数据量、缓存预热、第三方依赖用 Mock 的
  方式都会让结论失真；至少关键链路要按生产数据量级造数。
- **没有预热**：JIT、连接池、缓存冷启动会污染前几分钟数据，正式采样前
  先跑一段预热负载。
- **只在上线前压测**：容量是持续变化的，把小规模基线压测纳入 CI
  （k6 thresholds），大促/发布前再做全量压测。

## 小结

- 初学者要点：四类测试回答四个问题（扛不扛、天花板、扛多久、突袭）；
  响应时间看 P95/P99 而不是平均值；吞吐量与 TPS/QPS 口径不同，汇报先讲
  清口径。
- 进阶注意：闭环负载会掩盖过载崩溃，关键结论用开环（固定到达速率）验证；
  压测结论必须联着服务端资源曲线一起读；施压机自身监控与数据预热是结果
  可信的前提。
