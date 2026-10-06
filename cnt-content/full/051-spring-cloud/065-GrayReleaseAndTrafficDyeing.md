---
order: 80
title: 灰度发布与全链路流量染色
module: 'spring-cloud'
category: 后端技术
difficulty: beginner
description: 网关按 header/权重分流到灰度实例、Nacos 元数据打标、LoadBalancer 过滤策略与染色头透传
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：微服务的灰度发布（金丝雀发布）与全链路流量染色。
- 解决什么问题：新版本直接全量上线，bug 影响全部用户；需要"5% 流量先试、内部账号固定走新版本、出问题一键回切"，且整条调用链（网关 -> A 服务 -> B 服务）都稳定落在同一灰度环境。
- 什么时候用到：新版本放量、A/B 实验、灰度观察期（与《从单体到微服务》第 6 节绞杀者模式的流量搬迁同源）、问题版本的快速回切。
- 前置：《API 网关》第 5-7 节（Route/Predicate/Filter）、《负载均衡与重试》、《分布式链路追踪》（traceId 观测）。

## 前置知识

- Spring Cloud Gateway 的路由与过滤器模型；
- Spring Cloud LoadBalancer 的 ServiceInstanceListSupplier 扩展点；
- Nacos 服务实例元数据（metadata）；
- 链路追踪的 traceId 传播机制。

## 学习目标

- 理解灰度的两要素：**打标**（实例知道自己是谁）与**路由**（请求知道去找谁）；
- 会用网关 Predicate 按 header/权重分流，用 Nacos metadata 标记灰度实例；
- 会写 LoadBalancer 的实例过滤策略，让染色请求在服务间调用时继续命中灰度实例；
- 理解染色头全链路透传与 traceId 的配合观测方式。

## 1. 你现在要解决什么问题

订单服务 v2.1 上线：改了促销计算逻辑。全量发布的两种坏结局——有 bug 则全部用户受影响；完全不敢发则迭代停滞。灰度要的是中间态：

```text
              +-- 内部测试账号（header: gray=true 或特定 user 白名单）---> 灰度实例（v2.1）
用户请求 ---> 网关
              +-- 5% 随机放量 ---------------------------------------> 灰度实例（v2.1）
              +-- 其余 95% -------------------------------------------> 稳定实例（v2.0）
```

还有一个更容易被忽略的深水区：**订单服务调库存服务**。如果订单请求被染成灰色，它调的库存服务也必须是灰度实例——否则灰度订单跑了新逻辑、库存扣减跑的却是旧逻辑，两个版本对同一份数据各写各的。这就是"全链路"三个字的分量：灰度是链路属性，不是单服务属性。

## 2. 心智模型：打标与路由

灰度体系只回答两个问题：

1. **实例打标**：部署时告诉每个实例"你是灰还是稳"。用 Nacos 实例元数据最省事——服务发现本身知道每个实例的 metadata，路由方随取随用：

```bash
# 灰度实例启动时带上环境标签（k8s 里体现为 env 变量或启动参数）
java -jar order-service.jar \
  --spring.cloud.nacos.discovery.metadata.version=v2.1 \
  --spring.cloud.nacos.discovery.metadata.env=gray
```

2. **请求路由**：网关在入口决定这个请求"染成什么颜色"，后续每一跳的负载均衡都按颜色挑实例。颜色本身是一个 HTTP 头（如 `X-Gray: true`），随请求在链路里透传。

两者相遇的规则一句话：**负载均衡器在挑选实例时，优先挑与请求颜色相同的实例；灰色实例不存在则回退稳定实例**——回退规则是灰度安全网（灰度实例挂了，流量自动落回稳定版，而不是报错）。

## 3. 网关层：按 header 与权重分流

```java
@Configuration
public class GrayRouteConfig {

    @Bean
    public RouteLocator grayRoutes(RouteDefinitionLocator ignored) {
        return null; // 见下方 yml：配置式路由更贴近生产维护方式
    }
}
```

```yaml
# 网关 application.yml：同一服务的两条路由，灰度路由优先
spring:
  cloud:
    gateway:
      routes:
        - id: order-gray-header        # 规则一：内部账号按 header 强制进灰度
          uri: lb://order-service
          predicates:
            - Path=/api/order/**
            - Header=X-Gray, true
          filters:
            - SetLoadBalancerHeader=env,gray   # 交给负载均衡层按标签挑实例（见第 4 节）

        - id: order-gray-weight        # 规则二：按权重放 5% 流量
          uri: lb://order-service
          predicates:
            - Path=/api/order/**
            - Weight=order-gray-group, 5
          filters:
            - SetLoadBalancerHeader=env,gray

        - id: order-stable             # 规则三：兜底走稳定
          uri: lb://order-service
          predicates:
            - Path=/api/order/**
```

**讲解：**

1. 三条路由按声明顺序求值：带 `X-Gray: true` 的先进灰度（确定性规则优先），其次 5% 权重放量，其余走稳定。`Weight` 谓词的 group 参数把多条权重路由编成一组，同一组内按比例分配且同一用户（按请求特征哈希）结果稳定——反复刷新不会被随机到不同版本。
2. 染色头 `X-Gray` 在网关侧产生后要传给下游服务，服务间调用（Feign）还要继续透传——这靠统一的 Feign 拦截器（第 4 节），网关只负责"染色源头"。
3. 易错点：灰度路由的 `uri` 仍是 `lb://order-service`——**灰度不是另一个服务名**，是同一服务的不同标签实例。如果起了 order-service-gray 这样的新服务名，注册中心里就是两个孤立服务，回切、监控、告警全部割裂。

## 4. 负载均衡层：按标签过滤实例

网关把"这个请求要灰"传达到了负载均衡器面前，剩下的活是：从 order-service 的实例列表里优先挑 `env=gray` 的。Spring Cloud LoadBalancer 的扩展点是自定义 `ServiceInstanceListSupplier` 装饰器：

```java
public class GrayFilteredSupplier extends DelegatingServiceInstanceListSupplier {

    @Override
    public Flux<List<ServiceInstance>> get(Request request) {
        return delegate.get(request).map(instances -> filter(instances, request));
    }

    private List<ServiceInstance> filter(List<ServiceInstance> instances, Request request) {
        RequestContext ctx = GrayContext.get();          // 从透传链路取当前请求颜色
        if (ctx == null || !ctx.isGray()) return instances;

        List<ServiceInstance> gray = instances.stream()
                .filter(i -> "gray".equals(i.getMetadata().get("env")))
                .toList();
        return gray.isEmpty() ? instances : gray;        // 回退规则：无灰度实例则放行全列表
    }
}
```

**讲解：**

1. 装饰器模式：`delegate.get()` 先拿到完整实例列表（来自 Nacos，含 metadata），`map` 里做"按颜色筛"——不改服务发现，只改这一次挑选。
2. **回退是安全网也是陷阱**：灰度实例全挂时流量落回稳定版是期望行为；但如果灰度实例"忘部署了"（列表里从来就没有 env=gray），灰度流量会**静默**全部落稳定版——你以为在灰度，实际 0% 覆盖。所以灰度期必须有一眼可见的"灰度实例数 >= 1"监控（第 6 节）。
3. 透传链：网关产生 `X-Gray` -> Feign 拦截器把它复制到下游请求头 -> 下游服务的 Filter 把它放进 ThreadLocal（GrayContext）供负载均衡器读。这段代码全公司写一次，做成公共 starter。
4. 与 traceId 的关系：染色头决定"请求去哪"，traceId 记录"请求去过哪"。两者都透传但互不替代——排查灰度问题时，在链路系统里按 `X-Gray=true` 的 span 标签过滤，灰度请求的整条瀑布一目了然（《分布式链路追踪》第 7 节的日志关联同样适用：给 MDC 加一个 gray 字段）。

## 5. 真实场景三则

**场景一：订单新版本放量 5%。** 促销引擎重构上线。第一周 1%（几乎只有内部造的测试流量）、第二周 5%、第三周 25%、第四周全量，每一步的晋级标准写死：灰度组的错误率与耗时不超过稳定组基线 +10%。中途一次灰度组错误率抬头，回切动作只是把网关里权重从 5 改成 0——秒级生效，不用回滚代码、不用重新发布。这就是灰度相对"全量发布 + 出事回滚"的核心优势：**回切是路由变更，不是部署变更**。

**场景二：内部测试账号固定走灰度。** 客服、运营、开发共 200 个账号是天然的验收队伍。网关的全局过滤器读 JWT 里的 userId，命中白名单则打上 `X-Gray: true`。比 header 方案更进一步的是零操作成本：测试同事完全无感知地在灰度环境用真实业务流程验货。配套纪律：白名单进 git 管理、变更走 PR——它是发布流程的一部分，不是某个人的本地配置。

**场景三：灰度实例异常一键回切 + 观测闭环。** 某晚灰度实例频繁 Full GC，值班同事的处置序列：监控告警（灰度组错误率）-> 打开链路系统按 gray 标签看瀑布（确认只有灰度实例受影响）-> 网关权重置 0（回切）-> 灰度实例摘除修 bug。全程 8 分钟，稳定组用户零感知。事后复盘依赖的正是三件套：分组的指标、带灰度标签的链路、秒级的路由开关。这一套与《监控告警》篇的告警分级、《API 网关》的过滤器链是同一盘棋。

## 6. 灰度检查清单（上线前过一遍）

- 灰度与稳定实例的注册元数据标签正确（`nacos console 可见 env/version`）；
- 网关路由顺序：确定性规则（header/白名单）在权重规则之前；
- 回退规则存在：无灰度实例时请求落稳定而非报错；
- 有"灰度实例数"与"灰度组错误率"两个告警，防止静默 0% 灰度；
- 染色头透传 starter 覆盖所有服务间调用方式（Feign、RestTemplate、MQ 生产者）；
- 回切手段演练过一次：把权重归零是真的秒级生效吗？在预发验证过才算数。

## 7. 实验

双实例现场走一次最小灰度闭环（无需 MQ，注册中心 + 网关 + 两个服务实例即可）：

1. 稳定实例（无标签）+ 灰度实例（metadata.env=gray）注册到 Nacos；
2. 网关配置 header 规则与 50% 权重规则；
3. 验证三件事：带 X-Gray 头必进灰度实例、不带头时按权重随机、停掉灰度实例后请求回退稳定实例。

先自己操作，再对照参考流程：

<details>
<summary>实验参考流程</summary>

```bash
# 1. 起两个实例：9001 稳定（不加标签）、9002 灰度
java -jar order-service.jar --server.port=9001
java -jar order-service.jar --server.port=9002 \
  --spring.cloud.nacos.discovery.metadata.env=gray

# 2. 网关路由（application.yml 摘要）
# - Path=/api/order/** + Header=X-Gray,true -> SetLoadBalancerHeader=env,gray
# - Path=/api/order/** + Weight=gray-group,50 -> 同上

# 3a. 确定性验证：连续 10 次带头请求，应全部命中 9002
for i in $(seq 1 10); do
  curl -s -H "X-Gray: true" http://gateway:8080/api/order/whoami
done
# 3b. 权重验证：不带头发 20 次，命中 9002 的次数应在 10 次上下浮动
for i in $(seq 1 20); do
  curl -s http://gateway:8080/api/order/whoami
done
# 3c. 回退验证：kill 9002 后再带头请求 -> 依然 200（来自 9001）

# whoami 接口建议返回 {instancePort, env}，日志里同时打印 MDC 的 traceId 与 gray 标记
```

观察点：3c 的回退是"可用性优先"的证明；同时想一想它的反面——如果 9002 从未注册成功，3b 的"权重放量"实际是 0%，这就是检查清单第 4 条要求配告警的原因。
</details>

## 8. 官方参考

- Spring Cloud Gateway 官方文档（Weight 谓词、SetLoadBalancerHeader 等过滤器）：https://docs.spring.io/spring-cloud-gateway/reference/
- Spring Cloud LoadBalancer 官方文档（ServiceInstanceListSupplier 扩展）：https://docs.spring.io/spring-cloud-commons/reference/
- Nacos 服务发现与元数据：https://nacos.io/docs/

## 自检

1. 灰度的两要素是什么？为什么"实例打标"选 Nacos metadata 而不是另起一个服务名？
2. 灰度实例全挂时的回退规则是什么？这条规则的静默失效场景怎么防？
3. 染色头与 traceId 都要透传，两者的职责差别是什么？
4. 回切为什么说"是路由变更不是部署变更"？这个优势依赖哪条配置？
