---
order: 8
title: 实战项目
module: agent
category: 'AI Agent'
difficulty: advanced
description: '编程助手、数据分析、客服、自动化工作流 Agent 及 RAG 聊天机器人实战。'
author: fanquanpp
updated: '2026-06-14'
related:
  - agent/多Agent系统
  - agent/Agent评估与安全
  - agent/Agent核心模块详解
  - agent/MCP与A2A协议
prerequisites: []
---

## 1. 编程助手 Agent

### 1.1 功能设计

| 功能     | 描述             | 工具           |
| :------- | :--------------- | :------------- |
| 代码生成 | 根据需求生成代码 | LLM            |
| 代码解释 | 解释代码逻辑     | LLM            |
| Bug 修复 | 定位并修复 Bug   | LLM + 文件读写 |
| 代码审查 | 审查代码质量     | LLM + Git      |
| 测试生成 | 生成单元测试     | LLM + 执行器   |

### 1.2 实现

```python
import json
import subprocess
from openai import OpenAI

client = OpenAI()

# 工具定义
tools = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取文件内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "写入文件内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                    "content": {"type": "string", "description": "文件内容"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "执行命令行命令",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "要执行的命令"},
                    "timeout": {"type": "integer", "description": "超时时间(秒)", "default": 30}
                },
                "required": ["command"]
            }
        }
    }
]

# 工具实现
def read_file(path: str) -> str:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"读取失败: {e}"

def write_file(path: str, content: str) -> str:
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"文件已写入: {path}"
    except Exception as e:
        return f"写入失败: {e}"

def run_command(command: str, timeout: int = 30) -> str:
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True,
            text=True, timeout=timeout
        )
        output = result.stdout
        if result.stderr:
            output += f"\nSTDERR: {result.stderr}"
        return output[:5000]  # 限制输出长度
    except subprocess.TimeoutExpired:
        return f"命令超时 ({timeout}s)"
    except Exception as e:
        return f"执行失败: {e}"

tool_map = {
    "read_file": read_file,
    "write_file": write_file,
    "run_command": run_command
}

# Agent 主循环
SYSTEM_PROMPT = """你是一个专业的编程助手 Agent。你可以：
1. 读取和写入文件
2. 执行命令行命令
3. 生成、解释和修复代码

注意事项：
- 执行命令前请确认安全性
- 写文件前先读取现有内容
- 代码必须包含类型注解和文档字符串
- 优先使用 Python 标准库"""

def coding_agent(user_request: str, max_steps: int = 10) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_request}
    ]

    for step in range(max_steps):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            temperature=0
        )

        msg = response.choices[0].message
        messages.append(msg.to_dict())

        if not msg.tool_calls:
            return msg.content

        for tool_call in msg.tool_calls:
            func_name = tool_call.function.name
            func_args = json.loads(tool_call.function.arguments)
            print(f"[Step {step+1}] {func_name}({func_args})")

            result = tool_map[func_name](**func_args)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(result)
            })

    return "达到最大步骤数"

# 使用
result = coding_agent("创建一个 Python FastAPI 项目，包含用户 CRUD 接口")
print(result)
```

## 2. 数据分析 Agent

### 2.1 功能设计

```python
import pandas as pd
import json

# 数据分析专用工具
analysis_tools = [
    {
        "type": "function",
        "function": {
            "name": "load_data",
            "description": "加载数据文件（CSV/Excel）",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "文件路径"},
                    "file_type": {"type": "string", "enum": ["csv", "excel"]}
                },
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_data",
            "description": "执行数据分析操作",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": ["describe", "head", "info", "value_counts", "correlation"],
                        "description": "分析操作类型"
                    },
                    "column": {"type": "string", "description": "目标列名"}
                },
                "required": ["operation"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "执行 Python 代码进行数据分析",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python 代码"}
                },
                "required": ["code"]
            }
        }
    }
]

class DataAnalysisAgent:
    def __init__(self, llm_client):
        self.client = llm_client
        self.dataframes = {}

    def load_data(self, file_path: str, file_type: str = "csv") -> str:
        try:
            if file_type == "csv":
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            name = file_path.split("/")[-1]
            self.dataframes[name] = df
            return f"已加载 {name}，{df.shape[0]} 行 x {df.shape[1]} 列\n列名: {list(df.columns)}"
        except Exception as e:
            return f"加载失败: {e}"

    def analyze_data(self, operation: str, column: str = None) -> str:
        if not self.dataframes:
            return "请先加载数据"
        df = list(self.dataframes.values())[0]

        if operation == "describe":
            return df.describe().to_string()
        elif operation == "head":
            return df.head().to_string()
        elif operation == "info":
            buffer = []
            df.info(buf=buffer)
            return "\n".join(buffer)
        elif operation == "value_counts" and column:
            return df[column].value_counts().to_string()
        elif operation == "correlation":
            return df.select_dtypes(include='number').corr().to_string()
        return "未知操作"

    def execute_python(self, code: str) -> str:
        """在沙箱中执行 Python 代码"""
        local_vars = {"pd": pd, "df": list(self.dataframes.values())[0] if self.dataframes else None}
        try:
            exec(code, {"__builtins__": {}}, local_vars)
            if "_result" in local_vars:
                return str(local_vars["_result"])
            return "代码执行成功"
        except Exception as e:
            return f"执行错误: {e}"

# 使用
agent = DataAnalysisAgent(client)
agent.load_data("sales_data.csv")
result = agent.analyze_data("describe")
```

## 3. 客服 Agent

### 3.1 架构设计

```
用户消息 → 意图识别 → 路由分发
                         │
              ┌──────────┼──────────┐
              ↓          ↓          ↓
          FAQ 回答    工单创建    人工转接
              │          │          │
              └──────────┴──────────┘
                         ↓
                     回复用户
```

### 3.2 实现

```python
from enum import Enum
from typing import Optional

class IntentType(Enum):
    FAQ = "faq"
    COMPLAINT = "complaint"
    ORDER_QUERY = "order_query"
    REFUND = "refund"
    HUMAN_TRANSFER = "human_transfer"

class CustomerServiceAgent:
    def __init__(self, llm_client):
        self.client = llm_client
        self.faq_knowledge = self._load_faq()
        self.conversation_history = []

    def _load_faq(self) -> dict:
        return {
            "退货政策": "购买后7天内可无理由退货，15天内可换货...",
            "配送时间": "标准配送3-5个工作日，加急1-2个工作日...",
            "支付方式": "支持支付宝、微信支付、银行卡...",
        }

    def classify_intent(self, message: str) -> IntentType:
        """意图分类"""
        prompt = f"""请分类以下客服消息的意图：
- faq: 常见问题咨询
- complaint: 投诉
- order_query: 订单查询
- refund: 退款请求
- human_transfer: 要求转人工

消息: {message}
意图:"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        intent_str = response.choices[0].message.content.strip().lower()
        try:
            return IntentType(intent_str)
        except ValueError:
            return IntentType.FAQ

    def handle(self, user_message: str) -> str:
        intent = self.classify_intent(user_message)

        if intent == IntentType.FAQ:
            return self._handle_faq(user_message)
        elif intent == IntentType.ORDER_QUERY:
            return self._handle_order_query(user_message)
        elif intent == IntentType.REFUND:
            return self._handle_refund(user_message)
        elif intent == IntentType.HUMAN_TRANSFER:
            return "正在为您转接人工客服，请稍候..."
        else:
            return self._handle_general(user_message)

    def _handle_faq(self, message: str) -> str:
        # 检索 FAQ 知识库
        context = "\n".join(f"{k}: {v}" for k, v in self.faq_knowledge.items())
        prompt = f"""基于以下 FAQ 知识回答用户问题。如果无法回答，请建议转人工客服。

FAQ 知识:
{context}

用户问题: {message}
回答:"""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return response.choices[0].message.content

    def _handle_order_query(self, message: str) -> str:
        # 调用订单查询 API
        return "请提供您的订单号，我帮您查询订单状态。"

    def _handle_refund(self, message: str) -> str:
        return "我理解您需要退款。请提供订单号和退款原因，我会为您处理退款申请。"

    def _handle_general(self, message: str) -> str:
        return "感谢您的咨询。如需更多帮助，请输入'转人工'联系客服人员。"
```

## 4. 自动化工作流 Agent

### 4.1 工作流引擎

```python
from typing import Callable, Dict, List

class WorkflowStep:
    def __init__(self, name: str, handler: Callable, next_steps: List[str] = None, condition: Callable = None):
        self.name = name
        self.handler = handler
        self.next_steps = next_steps or []
        self.condition = condition

class WorkflowEngine:
    """工作流引擎"""
    def __init__(self):
        self.steps: Dict[str, WorkflowStep] = {}
        self.context = {}

    def add_step(self, step: WorkflowStep):
        self.steps[step.name] = step

    def run(self, start_step: str, initial_context: dict = None) -> dict:
        self.context = initial_context or {}
        current = start_step

        while current:
            step = self.steps.get(current)
            if not step:
                break

            print(f"执行步骤: {step.name}")
            result = step.handler(self.context)
            self.context.update(result)

            # 条件路由
            next_step = None
            for next_name in step.next_steps:
                next_step_def = self.steps.get(next_name)
                if next_step_def and (not next_step_def.condition or next_step_def.condition(self.context)):
                    next_step = next_name
                    break

            current = next_step

        return self.context

# 定义工作流
engine = WorkflowEngine()

def receive_email(ctx):
    print("  → 接收邮件")
    return {"email_received": True, "subject": "客户反馈"}

def classify_email(ctx):
    print("  → 分类邮件")
    return {"category": "complaint"}

def auto_reply(ctx):
    print("  → 自动回复")
    return {"replied": True}

def escalate(ctx):
    print("  → 升级处理")
    return {"escalated": True}

engine.add_step(WorkflowStep("receive", receive_email, ["classify"]))
engine.add_step(WorkflowStep("classify", classify_email, ["auto_reply", "escalate"]))
engine.add_step(WorkflowStep("auto_reply", auto_reply))
engine.add_step(WorkflowStep("escalate", escalate, condition=lambda ctx: ctx.get("category") == "complaint"))

result = engine.run("receive")
```

## 5. RAG 聊天机器人

### 5.1 完整实现

```python
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

class RAGChatbot:
    """RAG 聊天机器人"""
    def __init__(self, docs_path: str = "./docs", model: str = "gpt-4o"):
        self.llm = ChatOpenAI(model=model, temperature=0.3)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n## ", "\n### ", "\n\n", "\n", "。", " "]
        )
        self.vectorstore = None
        self.history = []
        self._init_knowledge_base(docs_path)

    def _init_knowledge_base(self, docs_path: str):
        """初始化知识库"""
        loader = DirectoryLoader(docs_path, glob="**/*.md")
        docs = loader.load()
        chunks = self.text_splitter.split_documents(docs)
        self.vectorstore = Chroma.from_documents(chunks, self.embeddings)
        self.retriever = self.vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 5, "fetch_k": 10}
        )

    def chat(self, question: str) -> str:
        """对话"""
        # 检索相关文档
        docs = self.retriever.invoke(question)
        context = "\n\n".join(doc.page_content for doc in docs)

        # 构建提示
        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是基于以下知识库的智能助手。请严格基于上下文回答问题。
如果上下文中没有相关信息，请明确说明"根据现有资料无法回答"。

知识库内容:
{context}

对话历史:
{history}"""),
            ("human", "{question}")
        ])

        # 格式化历史
        history_text = "\n".join(
            f"用户: {h['user']}\n助手: {h['assistant']}"
            for h in self.history[-5:]
        )

        # 生成回答
        chain = prompt | self.llm | StrOutputParser()
        answer = chain.invoke({
            "context": context,
            "history": history_text,
            "question": question
        })

        # 保存历史
        self.history.append({"user": question, "assistant": answer})

        return answer

    def add_documents(self, file_path: str):
        """增量添加文档"""
        from langchain_community.document_loaders import TextLoader
        loader = TextLoader(file_path)
        docs = loader.load()
        chunks = self.text_splitter.split_documents(docs)
        self.vectorstore.add_documents(chunks)

# 使用
bot = RAGChatbot(docs_path="./knowledge_base")
answer = bot.chat("什么是 ReAct 架构？")
print(answer)
```

## 6. 从零构建完整 Agent

### 6.1 完整 Agent 框架

```python
import json
from typing import List, Dict, Callable, Any
from dataclasses import dataclass, field
from openai import OpenAI

@dataclass
class Tool:
    name: str
    description: str
    func: Callable
    parameters: dict

class CompleteAgent:
    """完整的 AI Agent 实现"""
    def __init__(
        self,
        name: str = "Assistant",
        system_prompt: str = "",
        model: str = "gpt-4o",
        tools: List[Tool] = None,
        max_steps: int = 10,
        verbose: bool = True
    ):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model
        self.tools = {t.name: t for t in (tools or [])}
        self.max_steps = max_steps
        self.verbose = verbose
        self.client = OpenAI()
        self.history = []
        self.step_count = 0
        self.token_count = 0

    def add_tool(self, tool: Tool):
        self.tools[tool.name] = tool

    def _tool_schemas(self) -> list:
        schemas = []
        for tool in self.tools.values():
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            })
        return schemas

    def run(self, user_input: str) -> str:
        self.history.append({"role": "user", "content": user_input})

        for step in range(self.max_steps):
            self.step_count += 1
            messages = [
                {"role": "system", "content": self.system_prompt},
                *self.history[-20:]  # 保留最近20条消息
            ]

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self._tool_schemas() if self.tools else None,
                temperature=0
            )

            self.token_count += response.usage.total_tokens
            msg = response.choices[0].message
            self.history.append(msg.to_dict())

            if not msg.tool_calls:
                if self.verbose:
                    print(f"\n[{self.name}] {msg.content}")
                return msg.content

            # 执行工具调用
            for tool_call in msg.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)

                if self.verbose:
                    print(f"[Step {step+1}] 调用 {func_name}({json.dumps(func_args, ensure_ascii=False)})")

                if func_name in self.tools:
                    result = self.tools[func_name].func(**func_args)
                else:
                    result = f"未知工具: {func_name}"

                self.history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result)[:3000]
                })

        return "达到最大步骤数限制"

    def reset(self):
        self.history = []
        self.step_count = 0
        self.token_count = 0

# 创建并使用 Agent
agent = CompleteAgent(
    name="智能助手",
    system_prompt="你是一个全能的AI助手，可以使用工具帮助用户完成任务。",
    model="gpt-4o"
)

# 添加工具
agent.add_tool(Tool(
    name="search",
    description="搜索互联网",
    func=lambda query: f"搜索结果: {query}",
    parameters={
        "type": "object",
        "properties": {"query": {"type": "string", "description": "搜索关键词"}},
        "required": ["query"]
    }
))

agent.add_tool(Tool(
    name="calculate",
    description="计算数学表达式",
    func=lambda expression: str(eval(expression)),
    parameters={
        "type": "object",
        "properties": {"expression": {"type": "string", "description": "数学表达式"}},
        "required": ["expression"]
    }
))

# 运行
result = agent.run("搜索2024年AI发展趋势，并计算 2^10 的值")
```

## 7. 项目部署建议

### 7.1 部署架构

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  前端    │ →  │ API 网关  │ →  │ Agent 服务 │ →  │  LLM API  │
│ (Vue3)  │    │ (Nginx)  │    │ (FastAPI) │    │ (OpenAI)  │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
                                    │
                              ┌─────┼─────┐
                              ↓     ↓     ↓
                          ┌──────┐┌──────┐┌──────┐
                          │Redis ││Chroma││MySQL │
                          │缓存  ││向量库││持久化│
                          └──────┘└──────┘└──────┘
```

### 7.2 关键配置

| 配置项       | 建议       | 说明                     |
| :----------- | :--------- | :----------------------- |
| **超时设置** | 30-60s     | Agent 可能需要多步执行   |
| **速率限制** | 10 req/min | 控制成本和并发           |
| **缓存策略** | Redis 缓存 | 相同问题避免重复调用 LLM |
| **日志级别** | INFO       | 记录关键决策和工具调用   |
| **错误处理** | 优雅降级   | LLM 不可用时提供基础回复 |
| **成本监控** | 实时统计   | 防止 token 消耗失控      |

## 8. 小结

实战项目是掌握 Agent 开发的最佳方式：

1. **编程助手**是最经典的 Agent 应用，核心是工具调用和代码执行
2. **数据分析 Agent** 需要结合代码执行和数据操作工具
3. **客服 Agent** 需要意图识别和知识库检索
4. **工作流 Agent** 适合结构化的业务流程自动化
5. **RAG 聊天机器人** 是企业落地最常见的 Agent 形态
6. 从零构建 Agent 有助于理解核心原理，生产环境建议使用成熟框架
7. 部署时需关注超时、缓存、成本监控和错误处理
