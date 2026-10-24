---
order: 380
title: 反向代理与负载均衡
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: nginx 核心配置逐段解释（upstream/proxy_pass/超时重试）、四层与七层负载均衡、健康检查、限流，以及作为金丝雀发布流量入口的角色
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：DevOps 基础设施 / 流量接入层（自建 nginx 专篇）。
- **解决什么问题**：应用从单机变多机之后：谁来分发流量、坏实例谁来摘除、慢请求谁来兜底、发布时流量怎么切——这一层就是反向代理与负载均衡。
- **什么时候用到**：自建机房/K8s 之外的 VM 部署；需要 TLS 终结、限流、缓存、金丝雀分流等七层能力；云上 SLB 不满足精细化路由时。
- **分工声明（跨模块）**：云厂商负载均衡产品（CLB/ALB 的类型、计费与自动扩缩）见 027-cloud 模块的 [负载均衡与自动伸缩](/cloud-computing/250-LoadBalanceAutoScaling)——**云 SLB 讲"买什么"，本篇讲"自建 nginx 怎么配"**，两篇互为对照；金丝雀/蓝绿的发布策略语义见[渐进式交付](/devops/145-ProgressiveDelivery)，本篇讲它们在 nginx 侧的流量实现。

## 心智模型：反向代理在链路中的位置

```text
用户 ──> DNS ──> nginx（反向代理）
                  ├── TLS 终结（https 在这层卸载）
                  ├── 七层路由（按域名/路径分发）
                  ├── 负载均衡（分发到多个上游）
                  ├── 健康检查（摘除坏实例）
                  ├── 限流（保护后端）
                  └── 缓存/压缩/重写
                       │
                       ▼
              upstream: app1 / app2 / app3
```

正向代理代理**客户端**（替用户出去）；反向代理代理**服务端**（替服务收流量）。四层（L4，基于 IP+端口转发，如 nginx stream 模块、云 SLB 的四层监听）性能高但看不懂内容；七层（L7，基于 HTTP 语义路由）能按域名、路径、Header、Cookie 做精细分发——代价是多一层解析。选择口诀：**纯转发走四层，要路由/限流/改写走七层**。

## 动手一：nginx 核心配置逐段读

一个生产级的七层反向代理最小集：

```nginx
# /etc/nginx/conf.d/app.conf
upstream app_backend {
    least_conn;                              # 负载算法：最少连接
    server 10.0.0.11:8080 weight=2 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8080 max_fails=3 fail_timeout=30s;
    server 10.0.0.13:8080 backup;            # 备胎：全员挂了才顶上
    keepalive 32;                            # 到上游的连接池，省去反复握手
}

server {
    listen 443 ssl;
    http2 on;
    server_name app.example.com;

    ssl_certificate     /etc/nginx/ssl/app.crt;
    ssl_certificate_key /etc/nginx/ssl/app.key;

    location / {
        proxy_pass http://app_backend;

        # 透传真实客户端信息（后端日志与风控要用）
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时三件套（默认值对慢接口太宽松）
        proxy_connect_timeout 5s;    # 握手超时：上游挂了快速失败
        proxy_send_timeout    30s;
        proxy_read_timeout    30s;   # 等上游响应：超时即 504

        # 失败重试：错误与超时换下一台（幂等接口才安全，见下文）
        proxy_next_upstream error timeout http_502;
        proxy_next_upstream_tries 2;

        # WebSocket 与长连接场景必须的两行
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

逐段讲解四个关键决策：

- `least_conn` vs 默认轮询：请求耗时差异大（有的 5ms 有的 2s）时轮询会让慢请求堆在同一台，最少连接把新请求派给最闲的实例。**后端性能均匀用轮询，长短请求混杂用 least_conn**，会话粘滞需求用 `ip_hash`（有损负载均衡性，尽量用集中式 session 替代）；
- `max_fails=3 fail_timeout=30s` 是 nginx 的**被动健康检查**：30 秒内失败 3 次就把该上游踢出 30 秒。被动检查的盲区是"恢复感知慢"——主动检查见下一节；
- 超时三件套是保护链条：connect 5s 保证坏实例快速失败而不是拖死用户；read 30s 是"最慢合法请求"的上限——**长于它的接口要么改异步要么单独 location 放宽**，全局调大到 300s 是自杀式配置（连接堆满 worker）；
- `proxy_next_upstream` 的重试会把请求发给另一台上游——GET 无所谓，**POST 幂等性存疑时必须加 `non_idempotent` 语义考虑**（默认 nginx 只对幂等方法重试，改成显式重试 POST 前先确认业务幂等）。

## 动手二：健康检查（被动与主动）

```nginx
# 被动检查（开源版自带）：由真实流量触发，max_fails/fail_timeout
server 10.0.0.11:8080 max_fails=3 fail_timeout=30s;

# 主动检查（nginx Plus 商业版原生；开源版用 upstream_check 模块或 lua）
check interval=3000 rise=2 fall=3 timeout=2000 type=http;
check_http_send "GET /healthz HTTP/1.0\r\n\r\n";
check_http_expect_alive http_2xx;
```

两者的取舍：被动检查零成本但**第一个用户当探针**（坏实例要吃满 fail 次数才摘）；主动检查用独立探测流量提前摘除/恢复，健康路径必须与业务路径一致（`/healthz` 要真的查依赖而不是只回 200——探针造假的教训见[渐进式交付](/devops/145-ProgressiveDelivery)的常见坑）。

## 动手三：限流与连接数控制

保护后端的两道闸：

```nginx
# 按 IP 限请求速率：10 req/s，突发 20 个排队
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
# 按 IP 限并发连接
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;
        limit_req_status 429;            # 默认 503，429 更语义化
        proxy_pass http://app_backend;
    }
}
```

逐段解释：`rate=10r/s` 是平滑速率，`burst=20` 允许突发攒 20 个，`nodelay` 表示突发额度立即放行不排队（不加则请求被延迟到匀速发出——用户感受是"卡"）；`$binary_remote_addr` 用二进制 IP 省 key 空间（一个 key 10m 区域可存 16 万 IP）。限流的正确姿势是**分层**：nginx 侧粗粒度防刷，应用侧按用户/API key 细粒度计费——只在一层做限流要么误伤要么漏防。

## 场景：nginx 作为金丝雀发布的流量入口

没有服务网格时，nginx 用两个 upstream + 权重就能做金丝雀（策略语义见[渐进式交付](/devops/145-ProgressiveDelivery)）：

```nginx
upstream canary { server 10.0.0.21:8080; }     # 新版本
upstream stable { server 10.0.0.11:8080; server 10.0.0.12:8080; }

# split_clients 按一致性哈希切 5% 流量（同一用户始终同版本，会话不跳）
split_clients "${remote_addr}${http_user_agent}" $backend_pool {
    5%      canary;
    *       stable;
}

server {
    location / {
        proxy_pass http://$backend_pool;
    }
}
# 灰度观察无误后把 5% 调到 30%、100%，最后收敛为一个 upstream
```

为什么用 `split_clients` 而不是 weight：weight 是**请求级**随机，同一用户会在新旧版本间跳跃（购物车状态可能错乱）；split_clients 基于键的一致性哈希是**用户级**粘滞。换用 cookie/Header 切流（内部员工先试）用 map 指令实现——nginx 是金丝雀的"穷人版入口"，需要自动回滚与指标分析时升级到 Argo Rollouts/Flagger（见[渐进式交付](/devops/145-ProgressiveDelivery)的工具化一节）。

## 方言对照：nginx vs 云 SLB vs K8s Ingress

| 能力 | 自建 nginx | 云 SLB（见 cloud-250） | K8s Ingress（见 devops-090/095） |
| --- | --- | --- | --- |
| 部署形态 | 自己装、自己扩 | 托管、弹性伸缩 | Ingress Controller（本质是 nginx/envoy） |
| 健康检查 | 被动自带/主动要模块 | 原生主动检查 | 探针 + controller 配置 |
| 七层路由 | 全能（rewrite/lua） | 按监听器规则 | Ingress 资源声明 |
| 典型位置 | VM 机房的统一入口 | 云上第一跳 | 集群内七层入口 |

共同结论：**不管哪条路线，"超时、重试、健康检查、限流"这四件事都要有人做**——本篇的 nginx 配置就是把职责落到具体行的练习。

## 常见困惑

**"502 与 504 都是网关错误，差在哪？"**——502 Bad Gateway 是上游**返回了无效响应**（进程挂了、回了个 RST）；504 Gateway Timeout 是上游**超时没响应**（read_timeout 到点）。排障方向不同：502 查上游进程，504 查慢请求与超时配置。

**"加了 upstream keepalive 反而出现偶发 502？"**——经典坑：上游（如某些应用服务器）主动关闭空闲连接时 nginx 正好在用。修复就是配置里那两行 `proxy_http_version 1.1` + `proxy_set_header Connection ""`（显式长连接语义），配合上游的 keepalive_timeout 大于 nginx 侧的复用间隔。

**"负载均衡器自己是单点怎么办？"**——两台 nginx + Keepalived VIP（主备漂移），或直接用云 SLB 当第一跳、nginx 只做七层细节。高可用接线的完整图景见[高可用架构](/devops/350-HighAvailabilityArchitecture)。

## 动手实践：用 Docker 搭一套三后端的负载均衡

任务：

1. 用 nginx 官方镜像起 1 个代理 + 3 个返回各自主机名的后端（echo 服务即可）；
2. 验证轮询：curl 多次看三种响应轮换；改 `least_conn` 再观察；
3. 杀掉一个后端，观察 `max_fails` 摘除与 30s 后的恢复探测；
4. 给 `/api/` 配 `rate=5r/s burst=3`，用 `ab`/`hey` 打出 429；
5. （进阶）用 split_clients 实现 90/10 的金丝雀切流，curl 循环验证同一 IP 始终命中同一后端。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1. 三个后端（用 echoserver 类镜像或 nginx 返回主机名）
for i in 1 2 3; do
  docker run -d --name app$i --network appnet \
    -e WHOAMI=app$i traefik/whoami
done
# 代理配置（挂载正文场景的 conf，proxy_pass 指向 app1..3:80）
docker run -d --name lb --network appnet -p 8080:80 \
  -v $PWD/app.conf:/etc/nginx/conf.d/default.conf nginx:1.27

# 2
for i in $(seq 1 9); do curl -s http://127.0.0.1:8080/ | grep Hostname; done
# 三种主机名轮换出现；nginx -s reload 后改 least_conn 再试

# 3
docker stop app2
curl http://127.0.0.1:8080/          # 只剩两台轮换，无报错
docker start app2                     # fail_timeout 后自动回归

# 4
hey -n 100 -c 5 http://127.0.0.1:8080/api/
# 响应码分布出现 429（压测前在容器里改配置加 limit_req）

# 5（split_clients 同正文；验证）
for i in $(seq 1 20); do curl -s http://127.0.0.1:8080/ | grep Hostname; done | sort | uniq -c
# 同一来源 IP 恒定命中 canary 或 stable（粘滞），总体比例约 90/10
```

判读要点：任务 3 里被摘后端恢复后不是立即回归——`fail_timeout` 的 30 秒内 nginx 不再给它流量，这就是"被动检查的恢复延迟"；生产要更快恢复就用主动检查。
</details>

## 检验清单

- 能画出反向代理在链路中的位置并区分正向/反向、四层/七层；
- 能逐段解释 upstream 的负载算法选择、被动健康检查参数与超时三件套的作用；
- 能说出主动/被动健康检查的取舍与探针造假的坑；
- 能配置限流两层闸并解释 burst/nodelay 的行为；
- 能用 split_clients 实现用户粘滞的金丝雀切流，并说出它与 weight 的差别；
- 能区分 502 与 504 的排障方向，知道本篇与 cloud-250、devops-145 的分工。

## 下一步

- [渐进式交付](/devops/145-ProgressiveDelivery)：金丝雀背后的发布策略与自动回滚；
- [高可用架构](/devops/350-HighAvailabilityArchitecture)：负载均衡器自身的高可用；
- [负载均衡与自动伸缩](/cloud-computing/250-LoadBalanceAutoScaling)：云上托管负载均衡的产品形态。

## 参考与致谢

- nginx 官方文档 ngx_http_upstream_module / ngx_http_limit_req_module（BSD-2-Clause 文档）：<https://nginx.org/en/docs/>
- Keepalived/LVS 官方文档（GPL）：<https://www.keepalived.org/>
- 本篇配置骨架为通用生产实践整理，行为已对照 nginx 1.27 官方文档核校。
