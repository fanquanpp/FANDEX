---
order: 92
title: 'Agent 安全与沙盒'
module: agent
category: 'AI Agent'
difficulty: advanced
description: '托管沙盒隔离执行、响应式 API 流式返回、多智能体协作模式与具身智能。'
author: fanquanpp
updated: '2026-06-15'
related:
  - agent/Agent核心模块详解
  - agent/MCP与A2A协议
  - agent/ReAct模式
  - agent/思维链与思维树
prerequisites:
  - agent/概述与架构
---

## 1. Agent 安全概述

Agent 具备自主执行能力，一旦失控可能造成严重后果。安全是 Agent 系统的第一优先级。

### 1.1 Agent 安全威胁模型

Agent 安全威胁模型包含六大类别：

- **提示注入 (Prompt Injection)** — 恶意输入操控 Agent 行为
- **工具滥用 (Tool Abuse)** — Agent 调用危险工具或越权操作
- **数据泄露 (Data Leakage)** — Agent 将敏感信息泄露给第三方
- **权限逃逸 (Privilege Escalation)** — Agent 突破沙盒获取更高权限
- **资源耗尽 (Resource Exhaustion)** — Agent 无限循环或消耗过多资源
- **供应链攻击 (Supply Chain)** — 恶意工具或 MCP Server 注入

| 威胁类型       | 描述                         | 风险等级 |
| :------------- | :--------------------------- | :------- |
| **提示注入**   | 恶意输入操控 Agent 行为      | 高       |
| **工具滥用**   | Agent 调用危险工具或越权操作 | 高       |
| **数据泄露**   | Agent 将敏感信息泄露给第三方 | 高       |
| **权限逃逸**   | Agent 突破沙盒获取更高权限   | 中       |
| **资源耗尽**   | Agent 无限循环或消耗过多资源 | 中       |
| **供应链攻击** | 恶意工具或 MCP Server 注入   | 中       |

### 1.2 安全设计原则

| 原则         | 描述                               |
| :----------- | :--------------------------------- |
| **最小权限** | Agent 只拥有完成任务所需的最小权限 |
| **深度防御** | 多层安全机制，不依赖单一防线       |
| **默认拒绝** | 未明确允许的操作一律拒绝           |
| **可审计**   | 所有 Agent 行为可追溯和审计        |
| **故障安全** | 出错时进入安全状态而非危险状态     |

## 2. 托管沙盒（Sandbox）

### 2.1 沙盒架构

沙盒是安全执行 Agent 代码的隔离环境，确保 Agent 的行为不会影响宿主系统：

```mermaid
graph TD
    Host["宿主系统"]
    Manager["沙盒管理器"]
    SB1["沙盒实例1<br/>Agent Code<br/>隔离FS / 隔离Net / 限资源"]
    SB2["沙盒实例2<br/>Agent Code<br/>隔离FS / 隔离Net / 限资源"]
    SB3["沙盒实例3<br/>Agent Code<br/>隔离FS / 隔离Net / 限资源"]
    Engine["安全策略引擎<br/>权限控制 / 资源限制 / 审计日志"]
    Host --> Manager
    Manager --> SB1
    Manager --> SB2
    Manager --> SB3
    Host --> Engine
```

### 2.2 Docker 沙盒实现

```python
import docker
import asyncio
from dataclasses import dataclass
from typing import Optional

@dataclass
class SandboxConfig:
    """沙盒配置"""
    image: str = "python:3.12-slim"
    memory_limit: str = "512m"       # 内存限制
    cpu_period: int = 100000         # CPU 周期
    cpu_quota: int = 50000           # CPU 配额（50%）
    timeout: int = 30                # 执行超时（秒）
    network_mode: str = "none"       # 网络隔离
    read_only_fs: bool = True        # 只读文件系统
    max_file_size: int = 10 * 1024 * 1024  # 最大文件 10MB
    allowed_commands: list = None    # 允许的命令白名单

class DockerSandbox:
    """Docker 沙盒执行器"""

    def __init__(self, config: SandboxConfig = None):
        self.config = config or SandboxConfig()
        self.client = docker.from_env()
        self._containers: dict[str, docker.models.containers.Container] = {}

    async def execute(self, code: str,
                      language: str = "python",
                      files: dict = None) -> dict:
        """在沙盒中执行代码"""
        # 构建执行命令
        command = self._build_command(code, language, files)

        # 创建容器
        container = self.client.containers.run(
            image=self.config.image,
            command=command,
            detach=True,
            mem_limit=self.config.memory_limit,
            cpu_period=self.config.cpu_period,
            cpu_quota=self.config.cpu_quota,
            network_mode=self.config.network_mode,
            read_only=self.config.read_only_fs,
            tmpfs={"/tmp": f"size={self.config.max_file_size}"},
            security_opt=["no-new-privileges"],
            pids_limit=64,                    # 进程数限制
            cap_drop=["ALL"],                 # 丢弃所有 Linux 能力
            user="nobody",                    # 非 root 运行
            working_dir="/tmp",
            environment={"PYTHONUNBUFFERED": "1"}
        )

        container_id = container.id
        self._containers[container_id] = container

        try:
            # 等待执行完成（带超时）
            result = await asyncio.wait_for(
                self._wait_container(container),
                timeout=self.config.timeout
            )
            return result
        except asyncio.TimeoutError:
            container.kill()
            return {
                "status": "timeout",
                "error": f"执行超时（{self.config.timeout}秒）"
            }
        finally:
            # 清理容器
            try:
                container.remove(force=True)
                del self._containers[container_id]
            except Exception:
                pass

    async def _wait_container(self, container) -> dict:
        """等待容器执行完成"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, container.wait
        )

        exit_code = result.get("StatusCode", -1)
        stdout = container.logs(stdout=True, stderr=False).decode()
        stderr = container.logs(stdout=False, stderr=True).decode()

        return {
            "status": "success" if exit_code == 0 else "error",
            "exit_code": exit_code,
            "stdout": stdout[:10000],   # 限制输出大小
            "stderr": stderr[:10000],
        }

    def _build_command(self, code: str, language: str,
                       files: dict = None) -> list:
        """构建容器执行命令"""
        if language == "python":
            # 使用受限 Python 执行
            return [
                "python", "-c",
                f"import sys; sys.path.insert(0, '/tmp'); "
                f"exec(open('/tmp/main.py').read())"
            ]
        elif language == "javascript":
            return ["node", "/tmp/main.js"]
        else:
            raise ValueError(f"不支持的语言: {language}")

    async def cleanup_all(self):
        """清理所有容器"""
        for cid, container in self._containers.items():
            try:
                container.remove(force=True)
            except Exception:
                pass
        self._containers.clear()
```

### 2.3 权限控制策略

```python
from enum import Flag, auto

class Permission(Flag):
    """Agent 权限标志"""
    NONE = 0
    FILE_READ = auto()         # 读取文件
    FILE_WRITE = auto()        # 写入文件
    NETWORK_GET = auto()       # HTTP GET 请求
    NETWORK_POST = auto()      # HTTP POST 请求
    EXECUTE_CODE = auto()      # 执行代码
    DATABASE_READ = auto()     # 读取数据库
    DATABASE_WRITE = auto()    # 写入数据库
    SYSTEM_INFO = auto()       # 获取系统信息
    ALL = (FILE_READ | FILE_WRITE | NETWORK_GET | NETWORK_POST |
           EXECUTE_CODE | DATABASE_READ | DATABASE_WRITE | SYSTEM_INFO)

@dataclass
class SecurityPolicy:
    """安全策略"""
    permissions: Permission
    max_iterations: int = 20
    max_tokens_per_call: int = 4096
    allowed_domains: list = None       # 网络请求白名单
    denied_paths: list = None          # 文件系统黑名单
    rate_limit: int = 60               # 每分钟最大调用次数
    require_approval_for: list = None  # 需要人工审批的操作

class PolicyEnforcer:
    """策略执行器"""

    def __init__(self, policy: SecurityPolicy):
        self.policy = policy
        self.call_history = []

    def check_permission(self, action: str, resource: str = None) -> bool:
        """检查是否有权限执行操作"""
        action_permission_map = {
            "file_read": Permission.FILE_READ,
            "file_write": Permission.FILE_WRITE,
            "http_get": Permission.NETWORK_GET,
            "http_post": Permission.NETWORK_POST,
            "execute": Permission.EXECUTE_CODE,
            "db_read": Permission.DATABASE_READ,
            "db_write": Permission.DATABASE_WRITE,
        }

        required = action_permission_map.get(action)
        if required and not (self.policy.permissions & required):
            return False

        # 检查域名白名单
        if action in ("http_get", "http_post") and resource:
            if self.policy.allowed_domains:
                from urllib.parse import urlparse
                domain = urlparse(resource).netloc
                if domain not in self.policy.allowed_domains:
                    return False

        # 检查路径黑名单
        if action in ("file_read", "file_write") and resource:
            if self.policy.denied_paths:
                for denied in self.policy.denied_paths:
                    if resource.startswith(denied):
                        return False

        # 检查是否需要人工审批
        if self.policy.require_approval_for and action in self.policy.require_approval_for:
            return self._request_human_approval(action, resource)

        # 检查速率限制
        if not self._check_rate_limit():
            return False

        return True

    def _check_rate_limit(self) -> bool:
        """检查速率限制"""
        import time
        now = time.time()
        # 保留最近 60 秒的调用记录
        self.call_history = [
            t for t in self.call_history if now - t < 60
        ]
        if len(self.call_history) >= self.policy.rate_limit:
            return False
        self.call_history.append(now)
        return True

    def _request_human_approval(self, action: str,
                                resource: str) -> bool:
        """请求人工审批"""
        # 实际实现可对接审批系统
        print(f"[审批请求] 操作: {action}, 资源: {resource}")
        return False  # 默认拒绝，等待审批
```

### 2.4 提示注入防御

```python
class PromptInjectionDetector:
    """提示注入检测器"""

    # 常见注入模式
    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"forget\s+(everything|all|previous)",
        r"you\s+are\s+now\s+",
        r"system\s*:\s*",
        r"new\s+instructions?\s*:",
        r"override\s+(safety|security|rules)",
        r"pretend\s+(you\s+are|to\s+be)",
        r"jailbreak",
        r"DAN\s+mode",
        r"developer\s+mode",
    ]

    def __init__(self, llm_client=None):
        self.llm = llm_client
        import re
        self.compiled_patterns = [
            re.compile(p, re.IGNORECASE)
            for p in self.INJECTION_PATTERNS
        ]

    async def detect(self, user_input: str) -> dict:
        """检测提示注入"""
        # 第一层：规则匹配
        rule_matches = self._rule_based_detect(user_input)

        # 第二层：LLM 判断
        llm_result = await self._llm_based_detect(user_input)

        # 综合判断
        is_injection = rule_matches or llm_result.get("is_injection", False)
        confidence = max(
            len(rule_matches) / max(len(self.INJECTION_PATTERNS), 1),
            llm_result.get("confidence", 0)
        )

        return {
            "is_injection": is_injection,
            "confidence": confidence,
            "rule_matches": rule_matches,
            "llm_analysis": llm_result
        }

    def _rule_based_detect(self, text: str) -> list:
        """基于规则的检测"""
        matches = []
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                matches.append(pattern.pattern)
        return matches

    async def _llm_based_detect(self, text: str) -> dict:
        """基于 LLM 的检测"""
        if not self.llm:
            return {"is_injection": False, "confidence": 0}

        prompt = f"""分析以下用户输入是否包含提示注入攻击。
提示注入是指试图让 AI 忽略原有指令、执行非预期操作的输入。

用户输入：{text}

请返回 JSON：
{{"is_injection": true/false, "confidence": 0.0-1.0, "reason": "原因"}}"""

        response = await self.llm.chat(prompt)
        return self._parse_response(response)
```

## 3. 响应式 API（Reactive API）

### 3.1 流式返回设计

响应式 API 让用户能够实时看到 Agent 的思考过程和执行结果，而非等待全部完成：

```mermaid
sequenceDiagram
    participant Agent
    participant Client
    Agent->>Client: thought "我需要查询..."
    Agent->>Client: tool_call 调用: search()
    Agent->>Client: tool_result 结果: [...]
    Agent->>Client: thought "根据结果..."
    Agent->>Client: final_answer "答案是..."
```

### 3.2 SSE 流式实现

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from dataclasses import dataclass
from enum import Enum
import json
import asyncio

class StreamEventType(Enum):
    THOUGHT = "thought"           # 思考过程
    TOOL_CALL = "tool_call"       # 工具调用
    TOOL_RESULT = "tool_result"   # 工具结果
    PROGRESS = "progress"         # 进度更新
    FINAL_ANSWER = "final_answer" # 最终回答
    ERROR = "error"               # 错误

@dataclass
class StreamEvent:
    """流式事件"""
    type: StreamEventType
    data: dict
    timestamp: float = None

    def __post_init__(self):
        import time
        self.timestamp = self.timestamp or time.time()

    def to_sse(self) -> str:
        """转换为 SSE 格式"""
        return f"event: {self.type.value}\ndata: {json.dumps(self.data, ensure_ascii=False)}\n\n"

class ReactiveAgentAPI:
    """响应式 Agent API"""

    def __init__(self, agent):
        self.agent = agent
        self.app = FastAPI(title="Reactive Agent API")
        self._setup_routes()

    def _setup_routes(self):
        @self.app.post("/agent/run")
        async def run_agent(request: dict):
            """流式执行 Agent"""
            query = request.get("query", "")
            session_id = request.get("session_id")

            return StreamingResponse(
                self._stream_agent_execution(query, session_id),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )

        @self.app.get("/agent/status/{session_id}")
        async def get_status(session_id: str):
            """查询会话状态"""
            return {"session_id": session_id, "status": "running"}

    async def _stream_agent_execution(self, query: str,
                                      session_id: str = None):
        """流式生成 Agent 执行过程"""
        try:
            # 发送思考过程
            yield StreamEvent(
                type=StreamEventType.THOUGHT,
                data={"content": "正在分析您的问题..."}
            ).to_sse()

            async for step in self.agent.run_stream(query):
                if step["type"] == "thought":
                    yield StreamEvent(
                        type=StreamEventType.THOUGHT,
                        data={"content": step["content"]}
                    ).to_sse()

                elif step["type"] == "tool_call":
                    yield StreamEvent(
                        type=StreamEventType.TOOL_CALL,
                        data={
                            "tool": step["tool"],
                            "args": step["args"]
                        }
                    ).to_sse()

                elif step["type"] == "tool_result":
                    yield StreamEvent(
                        type=StreamEventType.TOOL_RESULT,
                        data={
                            "tool": step["tool"],
                            "result": step["result"]
                        }
                    ).to_sse()

                elif step["type"] == "answer":
                    yield StreamEvent(
                        type=StreamEventType.FINAL_ANSWER,
                        data={"content": step["content"]}
                    ).to_sse()

        except Exception as e:
            yield StreamEvent(
                type=StreamEventType.ERROR,
                data={"message": str(e)}
            ).to_sse()
```

### 3.3 Agent 端流式输出

```python
class StreamingAgent:
    """支持流式输出的 Agent"""

    def __init__(self, llm_client, executor):
        self.llm = llm_client
        self.executor = executor

    async def run_stream(self, query: str):
        """流式执行 Agent，逐步 yield 执行过程"""
        # 1. 思考阶段
        yield {
            "type": "thought",
            "content": f"分析用户查询：{query}"
        }

        # 2. 规划阶段
        plan = await self._plan(query)
        yield {
            "type": "thought",
            "content": f"制定执行计划，共 {len(plan)} 个步骤"
        }

        # 3. 逐步执行
        for i, step in enumerate(plan):
            yield {
                "type": "progress",
                "data": {
                    "current": i + 1,
                    "total": len(plan),
                    "step": step["description"]
                }
            }

            if step.get("tool"):
                yield {
                    "type": "tool_call",
                    "tool": step["tool"],
                    "args": step.get("args", {})
                }

                result = await self.executor.execute(
                    step["tool"], step.get("args", {})
                )

                yield {
                    "type": "tool_result",
                    "tool": step["tool"],
                    "result": str(result)[:2000]  # 限制结果大小
                }

        # 4. 生成最终回答
        answer = await self._generate_answer(query, plan)
        yield {
            "type": "answer",
            "content": answer
        }
```

### 3.4 客户端消费流式响应

```python
import httpx

class AgentStreamClient:
    """Agent 流式客户端"""

    async def run(self, query: str, on_thought=None,
                  on_tool_call=None, on_result=None,
                  on_answer=None):
        """消费 Agent 流式响应"""
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "http://localhost:8000/agent/run",
                json={"query": query},
                timeout=120.0
            ) as response:
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue

                    if line.startswith("event: "):
                        event_type = line[7:].strip()
                    elif line.startswith("data: "):
                        data = json.loads(line[6:])

                        if event_type == "thought" and on_thought:
                            await on_thought(data["content"])
                        elif event_type == "tool_call" and on_tool_call:
                            await on_tool_call(data)
                        elif event_type == "tool_result" and on_result:
                            await on_result(data)
                        elif event_type == "final_answer" and on_answer:
                            await on_answer(data["content"])


# 使用示例
async def main():
    client = AgentStreamClient()

    async def on_thought(content):
        print(f" 思考: {content}")

    async def on_tool_call(data):
        print(f" 调用工具: {data['tool']}({data['args']})")

    async def on_result(data):
        print(f" 工具结果: {data['result'][:100]}...")

    async def on_answer(content):
        print(f" 最终回答: {content}")

    await client.run(
        "帮我分析最近的销售数据趋势",
        on_thought=on_thought,
        on_tool_call=on_tool_call,
        on_result=on_result,
        on_answer=on_answer
    )
```

## 4. 多智能体协作模式

### 4.1 协作模式分类

多智能体协作模式包含六种类型：

- **辩论模式 (Debate)** — 多个 Agent 对同一问题提出不同观点，通过辩论达成更优结论
- **协商模式 (Negotiate)** — Agent 之间通过多轮协商达成共识
- **投票模式 (Voting)** — 多个 Agent 对选项投票，少数服从多数
- **分工模式 (Division)** — 将任务分解为子任务，分配给不同 Agent 并行执行
- **层级模式 (Hierarchy)** — 上级 Agent 分配任务，下级 Agent 执行并汇报
- **混合模式 (Hybrid)** — 根据任务特点灵活组合以上模式

### 4.2 辩论模式

多个 Agent 对同一问题提出不同观点，通过辩论达成更优结论：

```python
@dataclass
class DebateRound:
    """辩论轮次"""
    round_number: int
    proposer_argument: str    # 正方论点
    opposer_argument: str     # 反方论点
    judge_verdict: str        # 裁判评判

class DebateOrchestrator:
    """辩论模式编排器"""

    def __init__(self, llm_client, max_rounds: int = 3):
        self.llm = llm_client
        self.max_rounds = max_rounds

    async def debate(self, topic: str) -> dict:
        """执行辩论"""
        rounds = []
        current_proposal = None

        for i in range(self.max_rounds):
            # 正方提出论点
            proposer_prompt = f"""你是一个辩论的正方。
主题：{topic}
{'当前论点：' + current_proposal if current_proposal else '请提出你的初始论点。'}
{'反方反驳：' + rounds[-1].opposer_argument if rounds else ''}

请提出或完善你的论点，要有理有据。"""

            proposal = await self.llm.chat(proposer_prompt)

            # 反方提出反驳
            opposer_prompt = f"""你是一个辩论的反方。
主题：{topic}
正方论点：{proposal}

请提出有力的反驳论点。"""

            opposition = await self.llm.chat(opposer_prompt)

            # 裁判评判
            judge_prompt = f"""你是辩论裁判。
主题：{topic}
正方论点：{proposal}
反方论点：{opposition}

请评判本轮辩论，指出双方优劣。"""

            verdict = await self.llm.chat(judge_prompt)

            round_result = DebateRound(
                round_number=i + 1,
                proposer_argument=proposal,
                opposer_argument=opposition,
                judge_verdict=verdict
            )
            rounds.append(round_result)
            current_proposal = proposal

        # 最终裁决
        final_verdict = await self._final_verdict(topic, rounds)

        return {
            "topic": topic,
            "rounds": rounds,
            "final_verdict": final_verdict
        }

    async def _final_verdict(self, topic: str,
                             rounds: list) -> dict:
        """最终裁决"""
        summary = "\n".join([
            f"第{r.round_number}轮 - 裁判评语：{r.judge_verdict[:200]}"
            for r in rounds
        ])

        prompt = f"""基于以下辩论过程，给出最终结论。

主题：{topic}
辩论摘要：
{summary}

请给出：1. 最终结论 2. 关键论据 3. 置信度"""

        return await self.llm.chat(prompt)
```

### 4.3 协商模式

Agent 之间通过多轮协商达成共识：

```python
class NegotiationOrchestrator:
    """协商模式编排器"""

    async def negotiate(self, task: str, agents: list) -> dict:
        """多 Agent 协商"""
        proposals = {}

        # 第一轮：各 Agent 提出方案
        for agent in agents:
            proposal = await agent.propose(task)
            proposals[agent.name] = proposal

        # 多轮协商
        for round_num in range(3):
            new_proposals = {}
            for agent in agents:
                # 每个 Agent 看到其他人的方案后调整
                others = {
                    k: v for k, v in proposals.items()
                    if k != agent.name
                }
                revised = await agent.revise(task, others)
                new_proposals[agent.name] = revised

            # 检查是否达成共识
            if self._check_consensus(new_proposals):
                return {
                    "status": "consensus",
                    "rounds": round_num + 1,
                    "agreement": self._merge_proposals(new_proposals)
                }

            proposals = new_proposals

        # 未达成共识，取最佳方案
        return {
            "status": "best_effort",
            "rounds": 3,
            "agreement": self._select_best(proposals)
        }

    def _check_consensus(self, proposals: dict) -> bool:
        """检查是否达成共识"""
        # 简化实现：检查方案相似度
        values = list(proposals.values())
        if len(values) <= 1:
            return True
        # 实际可用语义相似度判断
        return False

    def _merge_proposals(self, proposals: dict) -> str:
        """合并多个方案"""
        return "\n".join(
            [f"[{name}] {proposal}" for name, proposal in proposals.items()]
        )
```

### 4.4 投票模式

```python
@dataclass
class Vote:
    """投票"""
    voter: str
    choice: str
    reason: str

class VotingOrchestrator:
    """投票模式编排器"""

    async def vote(self, question: str, options: list,
                   agents: list) -> dict:
        """多 Agent 投票决策"""
        votes = []

        for agent in agents:
            vote_prompt = f"""请对以下问题进行投票。

问题：{question}
选项：{options}

请返回 JSON：
{{"choice": "选项", "reason": "投票理由"}}"""

            response = await agent.llm.chat(vote_prompt)
            vote_data = self._parse_vote(response)

            votes.append(Vote(
                voter=agent.name,
                choice=vote_data["choice"],
                reason=vote_data["reason"]
            ))

        # 统计票数
        tally = {}
        for vote in votes:
            tally[vote.choice] = tally.get(vote.choice, 0) + 1

        # 确定获胜选项
        winner = max(tally, key=tally.get)

        return {
            "question": question,
            "votes": votes,
            "tally": tally,
            "winner": winner,
            "is_unanimous": len(tally) == 1
        }
```

### 4.5 分工模式

```python
class DivisionOrchestrator:
    """分工模式编排器"""

    async def divide_and_conquer(self, task: str,
                                 agents: list) -> dict:
        """任务分工执行"""
        # 1. 分解任务
        subtasks = await self._decompose(task, len(agents))

        # 2. 分配子任务
        assignments = {}
        for i, subtask in enumerate(subtasks):
            agent = agents[i % len(agents)]
            assignments[agent.name] = subtask

        # 3. 并行执行
        results = {}
        tasks = []
        for agent in agents:
            if agent.name in assignments:
                tasks.append(
                    agent.execute(assignments[agent.name])
                )

        task_results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, (agent_name, _) in enumerate(assignments.items()):
            result = task_results[i]
            if isinstance(result, Exception):
                results[agent_name] = {"error": str(result)}
            else:
                results[agent_name] = result

        # 4. 汇总结果
        final = await self._aggregate(task, results)

        return {
            "task": task,
            "subtasks": assignments,
            "results": results,
            "final": final
        }

    async def _decompose(self, task: str,
                         num_agents: int) -> list:
        """分解任务为子任务"""
        prompt = f"""将以下任务分解为 {num_agents} 个独立的子任务。

任务：{task}

返回 JSON 数组：["子任务1", "子任务2", ...]"""

        response = await self.llm.chat(prompt)
        return self._parse_subtasks(response)

    async def _aggregate(self, task: str,
                         results: dict) -> str:
        """汇总子任务结果"""
        summary = "\n".join(
            [f"[{name}] {r}" for name, r in results.items()]
        )

        prompt = f"""请汇总以下子任务结果，生成最终答案。

原始任务：{task}
子任务结果：
{summary}"""

        return await self.llm.chat(prompt)
```

### 4.6 模式对比

| 模式     | 适用场景             | 优点         | 缺点               |
| :------- | :------------------- | :----------- | :----------------- |
| **辩论** | 需要多角度分析的问题 | 结论更全面   | Token 消耗大       |
| **协商** | 需要达成共识的决策   | 兼顾各方利益 | 可能无法达成共识   |
| **投票** | 多选项决策           | 简单高效     | 少数派意见被忽略   |
| **分工** | 可并行处理的复杂任务 | 效率高       | 子任务间依赖难处理 |

## 5. 具身智能（Embodied AI）

### 5.1 概念与架构

具身智能是指 Agent 具备物理实体，能够感知和操作物理世界：

```mermaid
graph TD
    Perception["感知层<br/>视觉(摄像头) / 触觉(传感器) / 听觉(麦克风)"]
    Cognition["认知层 (LLM Agent)<br/>场景理解 / 任务规划 / 动作决策 / 错误修正"]
    Execution["执行层<br/>机械臂 / 移动底盘 / 语音输出 / 显示屏"]
    Perception --> Cognition
    Cognition --> Execution
```

### 5.2 具身 Agent 实现

```python
from dataclasses import dataclass
from typing import Tuple

@dataclass
class PhysicalState:
    """物理状态"""
    position: Tuple[float, float, float]  # x, y, z
    orientation: Tuple[float, float, float, float]  # 四元数
    velocity: Tuple[float, float, float] = (0, 0, 0)
    gripper_open: bool = True

@dataclass
class SensorReading:
    """传感器读数"""
    sensor_type: str   # "camera" | "lidar" | "force" | "imu"
    data: bytes
    timestamp: float

class EmbodiedAgent:
    """具身智能 Agent"""

    def __init__(self, llm_client, robot_interface):
        self.llm = llm_client
        self.robot = robot_interface
        self.current_state = PhysicalState(
            position=(0, 0, 0),
            orientation=(0, 0, 0, 1)
        )

    async def perceive_environment(self) -> dict:
        """感知物理环境"""
        readings = await self.robot.get_sensor_readings()

        # 使用 VLM 理解视觉场景
        camera_data = next(
            (r for r in readings if r.sensor_type == "camera"), None
        )
        scene_description = ""
        if camera_data:
            scene_description = await self._understand_scene(camera_data)

        # 获取力觉反馈
        force_data = next(
            (r for r in readings if r.sensor_type == "force"), None
        )
        force_info = self._parse_force(force_data) if force_data else {}

        return {
            "scene": scene_description,
            "force": force_info,
            "state": self.current_state
        }

    async def plan_action(self, goal: str,
                          environment: dict) -> list:
        """规划物理动作序列"""
        prompt = f"""你是一个机器人控制 Agent。
当前场景：{environment['scene']}
当前位置：{environment['state'].position}
力觉反馈：{environment.get('force', '无')}

目标：{goal}

请规划动作序列，每个动作包含：
- move_to(x, y, z): 移动到指定位置
- grasp(): 闭合夹爪
- release(): 打开夹爪
- rotate(angle): 旋转

返回 JSON 数组格式的动作序列。"""

        response = await self.llm.chat(prompt)
        return self._parse_actions(response)

    async def execute_action(self, action: dict) -> dict:
        """执行物理动作"""
        action_type = action.get("type")

        try:
            if action_type == "move_to":
                target = action["target"]
                result = await self.robot.move_to(target)
                self.current_state.position = tuple(target)

            elif action_type == "grasp":
                result = await self.robot.grasp()
                self.current_state.gripper_open = False

            elif action_type == "release":
                result = await self.robot.release()
                self.current_state.gripper_open = True

            elif action_type == "rotate":
                angle = action["angle"]
                result = await self.robot.rotate(angle)

            else:
                return {"status": "error", "message": f"未知动作: {action_type}"}

            return {"status": "success", "result": result}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _understand_scene(self, camera_data: SensorReading) -> str:
        """使用视觉语言模型理解场景"""
        import base64
        b64 = base64.b64encode(camera_data.data).decode()
        description = await self.llm.chat_with_image(
            prompt="描述场景中的物体位置、距离和可操作性",
            image_base64=b64
        )
        return description
```

### 5.3 具身智能安全

具身 Agent 直接操作物理世界，安全要求更高：

```python
class EmbodiedSafetyGuard:
    """具身智能安全守卫"""

    # 安全区域边界
    SAFE_ZONE = {
        "x": (-2.0, 2.0),
        "y": (-2.0, 2.0),
        "z": (0.0, 1.5)
    }

    # 最大速度限制
    MAX_VELOCITY = 0.5  # m/s

    # 最大力限制
    MAX_FORCE = 20.0  # N

    async def validate_action(self, action: dict,
                              current_state: PhysicalState) -> dict:
        """验证动作安全性"""
        checks = [
            self._check_boundary(action, current_state),
            self._check_velocity(action),
            self._check_force(action),
            self._check_collision(action, current_state),
        ]

        failures = [c for c in checks if not c["safe"]]

        if failures:
            return {
                "safe": False,
                "violations": failures,
                "suggested_alternative": await self._suggest_safe_action(
                    action, failures
                )
            }

        return {"safe": True}

    def _check_boundary(self, action: dict,
                        state: PhysicalState) -> dict:
        """检查边界约束"""
        if action.get("type") != "move_to":
            return {"safe": True, "check": "boundary"}

        target = action["target"]
        for i, axis in enumerate(["x", "y", "z"]):
            min_val, max_val = self.SAFE_ZONE[axis]
            if not (min_val <= target[i] <= max_val):
                return {
                    "safe": False,
                    "check": "boundary",
                    "message": f"{axis}轴超出安全范围: {target[i]}"
                }

        return {"safe": True, "check": "boundary"}

    def _check_velocity(self, action: dict) -> dict:
        """检查速度限制"""
        if "velocity" in action:
            speed = sum(v**2 for v in action["velocity"]) ** 0.5
            if speed > self.MAX_VELOCITY:
                return {
                    "safe": False,
                    "check": "velocity",
                    "message": f"速度超限: {speed:.2f} > {self.MAX_VELOCITY}"
                }
        return {"safe": True, "check": "velocity"}

    def _check_force(self, action: dict) -> dict:
        """检查力限制"""
        if "force" in action:
            if action["force"] > self.MAX_FORCE:
                return {
                    "safe": False,
                    "check": "force",
                    "message": f"力超限: {action['force']:.1f} > {self.MAX_FORCE}"
                }
        return {"safe": True, "check": "force"}

    def _check_collision(self, action: dict,
                         state: PhysicalState) -> dict:
        """检查碰撞风险"""
        # 简化实现：检查路径上是否有已知障碍物
        # 生产环境需要完整的碰撞检测
        return {"safe": True, "check": "collision"}

    async def _suggest_safe_action(self, action: dict,
                                   failures: list) -> dict:
        """建议安全替代动作"""
        # 将动作限制在安全范围内
        if action.get("type") == "move_to":
            safe_target = []
            for i, axis in enumerate(["x", "y", "z"]):
                min_val, max_val = self.SAFE_ZONE[axis]
                safe_val = max(min_val, min(max_val, action["target"][i]))
                safe_target.append(safe_val)
            return {"type": "move_to", "target": safe_target}

        return None
```

## 6. 小结

| 主题              | 核心要点                        | 安全等级 |
| :---------------- | :------------------------------ | :------- |
| **托管沙盒**      | Docker 隔离、权限控制、资源限制 | 关键     |
| **响应式 API**    | SSE 流式返回、思考链可视化      | 增强     |
| **多 Agent 协作** | 辩论/协商/投票/分工四种模式     | 重要     |
| **具身智能**      | 物理感知、动作规划、安全守卫    | 关键     |
