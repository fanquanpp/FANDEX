---
order: 77
title: Java与AI
module: java
category: Java
difficulty: intermediate
description: Java机器学习与AI集成
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与GraphQL
  - java/Java性能调优
  - java/Java与安全
  - java/Java与WebAssembly
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本章学习后，你应当能够：

- **Remember（记忆）**：复述 Java 在 AI 与机器学习领域的核心生态，包括 DJL（Deep Java Library）、ONNX Runtime Java、TensorFlow Java、OpenNLP、Weka、Smile、Deeplearning4j 等库的定位与典型应用场景。
- **Understand（理解）**：解释 Java 在企业级 AI 部署中的优势——JIT 优化、GC 可控、与 Spring/Jakarta EE 生态深度集成、强类型与可观测性——并理解其在研究阶段相对 Python 的劣势。
- **Apply（应用）**：使用 DJL 加载预训练模型（PyTorch、TensorFlow、MXNet 后端）进行图像分类、目标检测、NLP 推理；使用 ONNX Runtime Java API 在 JVM 上运行跨框架模型推理。
- **Analyze（分析）**：分析 Java AI 推理服务的性能瓶颈——模型加载、内存映射、批处理、线程模型——并对比 JVM 推理与原生 Python 推理的吞吐与延迟。
- **Evaluate（评价）**：评估在 Java 中调用远程模型服务（HTTP/gRPC）与本地嵌入模型推理的取舍，量化网络延迟、序列化开销、资源占用对端到端 SLA 的影响。
- **Create（创造）**：设计一套基于 Spring Boot 的 AI 微服务，包含模型管理、推理 API、批处理、可观测性（JFR、Micrometer）、A/B 测试与灰度发布。

## 历史动机与发展脉络

### Java 在 AI 领域的曲折历程

Python 凭借 NumPy、Pandas、scikit-learn、PyTorch、TensorFlow 生态在 AI 研究阶段占据绝对主导。然而在企业生产部署阶段，Java 因其稳定性、并发模型、监控生态与既有业务系统的深度耦合，仍是大量企业的首选。这种"研究用 Python、生产用 Java"的双语言问题催生了 Java AI 部署生态的演进。

### Java AI 生态演进时间线

| 年份 | 里程碑 | 工程意义 |
| --- | --- | --- |
| 1997 | Weka 项目启动 | 数据挖掘工具，Java 早期 ML 生态起点 |
| 2007 | Mahout 加入 Apache 孵化 | 大规模机器学习（MapReduce 时代） |
| 2014 | Deeplearning4j 1.0 发布 | 首个商业级 Java 深度学习框架 |
| 2016 | TensorFlow Java API 早期 | Google 推出官方 Java 绑定 |
| 2017 | OpenNLP 1.8 | Apache 经典 NLP 工具箱成熟 |
| 2019 | DJL（Deep Java Library）发布 | AWS 推出框架无关的深度学习 Java API |
| 2020 | ONNX Runtime Java API | 微软推出跨框架推理运行时 Java 绑定 |
| 2021 | TensorFlow Java 0.4 | 与 TF 2.x 对齐，支持 SavedModel |
| 2022 | DJL 0.20+ | 支持 PyTorch 1.x/2.x、TensorFlow 2.x、MXNet、TensorRT 后端 |
| 2023 | LangChain4j | 大模型（LLM）应用开发框架出现 |
| 2024 | Spring AI 1.0 M1 | Spring 官方 AI 集成模块 |
| 2024 | JDK 21 虚拟线程 + 分代 ZGC | 高并发 LLM 服务底层优化 |

### 当代 Java AI 的三大主线

1. **模型推理（Inference）**：在 JVM 上加载 ONNX/PyTorch/TensorFlow 模型，进行低延迟推理。典型场景：电商实时推荐、风控评分、图像识别。
2. **数据管道（Data Pipeline）**：使用 Spark、Flink、Kafka Streams 进行大规模特征工程与模型训练数据准备。
3. **LLM 应用（LLM Application）**：通过 LangChain4j、Spring AI 集成 OpenAI、Anthropic、本地大模型，构建 RAG、Agent、Tool Use 应用。

### 设计动机

Java AI 生态的核心动机是"用 Java 部署 AI，避免双语言架构的复杂度"。具体优势：

- **统一运行时**：业务逻辑与模型推理共享 JVM，避免跨语言序列化开销。
- **企业级特性**：Spring Security、事务、监控、配置中心原生支持。
- **强类型与可维护性**：模型输入输出的 Java 类型安全，IDE 重构友好。
- **运维统一**：JVM 调优、JFR、APM、容器化运维与现有 Java 应用一致。

## 形式化定义

### 推理函数的形式化

设机器学习模型为函数 $f_\theta: \mathcal{X} \to \mathcal{Y}$，参数为 $\theta$。推理过程为：

$$
\hat{y} = f_\theta(x),\quad x \in \mathcal{X},\ \hat{y} \in \mathcal{Y}
$$

在 JVM 中，$f_\theta$ 通过加载序列化模型（ONNX、SavedModel、TorchScript）实现，输入 $x$ 与输出 $\hat{y}$ 映射为 Java 张量（Tensor）或领域对象。

### 张量表示

设张量 $T \in \mathbb{R}^{d_1 \times d_2 \times \dots \times d_n}$，DJL 中表示为 `NDArray`：

$$
T[i_1, i_2, \dots, i_n] = \text{data}[\text{offset} + \sum_{k=1}^{n} i_k \cdot \text{stride}_k]
$$

其中 `stride` 与 `shape` 共同定义张量布局（NCHW、NHWC、row-major）。

### 批处理推理

设单样本推理延迟为 $\tau$，批大小为 $B$，则批处理推理吞吐：

$$
\text{throughput}(B) = \frac{B}{\tau_{\text{batch}}(B)}
$$

通常 $\tau_{\text{batch}}(B) < B \cdot \tau$，因 GPU/SIMD 并行化。最优批大小 $B^*$ 满足延迟约束与吞吐约束的帕累托前沿。

### RAG 检索增强生成

检索增强生成（Retrieval-Augmented Generation）形式化为：

$$
\hat{y} = \text{LLM}\left( \text{prompt} \oplus \text{TopK}(\text{Embed}(q), \text{Index}) \right)
$$

其中 $\text{Embed}: \text{Text} \to \mathbb{R}^d$ 为嵌入函数，$\text{Index}$ 为向量数据库（如 Milvus、Qdrant、Weaviate），$\text{TopK}$ 为近似最近邻搜索。

### LLM Token 流式生成

自回归 LLM 生成 token 序列 $y_1, y_2, \dots, y_T$：

$$
P(y_t \mid y_{<t}, x) = \text{softmax}(\text{LLM}_\theta(y_{<t}, x)_t)
$$

流式生成以 SSE（Server-Sent Events）或 WebSocket 推送增量 token，Java 服务通过 `Flux<String>`（Project Reactor）或虚拟线程实现。

## 理论推导与原理解析

### JVM 推理性能模型

设推理总延迟 $T_{\text{total}}$：

$$
T_{\text{total}} = T_{\text{preprocess}} + T_{\text{inference}} + T_{\text{postprocess}} + T_{\text{gc}} + T_{\text{jit}}
$$

JVM 推理相比原生 Python 的差异：

- $T_{\text{preprocess}}$：Java 通常更快（JIT 优化 + 强类型）。
- $T_{\text{inference}}$：底层调用相同 C++/CUDA 库，理论相同；Java 额外有 JNI 边界开销（约 10–100μs/次）。
- $T_{\text{gc}}$：Java 有 GC 开销，可通过 ZGC 控制在 < 1ms。
- $T_{\text{jit}}$：预热阶段（前几千次调用）较慢，稳态性能持平或超越。

结论：**JVM 推理稳态性能与 Python 持平**，劣势在冷启动与 JNI 边界。批处理场景下边界开销摊薄，Java 优势凸显。

### DJL 后端抽象

DJL 通过 `Model`、`Predictor`、`Trainer` 抽象屏蔽底层框架：

```
Application Code
       ↓
DJL API (Model, Predictor, NDManager)
       ↓
Engine Bridge (PyTorchEngine, TensorFlowEngine, MXNetEngine, OnnxRuntime)
       ↓
Native Library (libtorch, libtensorflow, onnxruntime)
```

每次推理通过 JNI 调用 native 库，张量在 Java 与 native 间通过 `ByteBuffer` 直接传递（零拷贝）。

### ONNX Runtime 推理管线

ONNX Runtime Java API 流程：

1. 加载 ONNX 模型文件（`OrtEnvironment.createModelSession(modelPath)`）。
2. 构造输入张量（`OnnxTensor.create(env, data)`）。
3. 执行推理（`session.run(inputs)`）。
4. 解析输出张量（`output.getValue()`）。

ONNX Runtime 通过图优化（constant folding、kernel fusion）、执行提供者（CUDA、TensorRT、OpenVINO、CoreML）跨硬件加速。

### Spring AI 抽象

Spring AI 提供统一抽象：

```java
ChatClient client = ChatClient.create(model);
String response = client.prompt()
    .user("Explain JVM GC")
    .call()
    .content();
```

底层支持 OpenAI、Anthropic、Azure OpenAI、Ollama、HuggingFace 等多提供商，通过 `ChatModel`、`EmbeddingModel`、`ImageModel` 接口统一。

### LangChain4j 架构

LangChain4j 移植自 Python LangChain，核心概念：

- **ChatLanguageModel**：LLM 抽象。
- **EmbeddingModel**：嵌入模型抽象。
- **VectorStore**：向量数据库抽象（Milvus、Pinecone、Qdrant）。
- **DocumentLoader/Splitter**：文档加载与切片。
- **Tools**：函数调用（`@Tool` 注解）。
- **Memory**：对话历史（chat memory、token window）。
- **RAG**：检索增强生成管道（`RetrievalAugmentor`）。

## 代码示例

### 示例 1：DJL 图像分类（PyTorch 后端）

`pom.xml`：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.fandex.ai</groupId>
    <artifactId>djl-demo</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <djl.version>0.24.0</djl.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>ai.djl</groupId>
            <artifactId>api</artifactId>
            <version>${djl.version}</version>
        </dependency>
        <dependency>
            <groupId>ai.djl.pytorch</groupId>
            <artifactId>pytorch-engine</artifactId>
            <version>${djl.version}</version>
        </dependency>
        <dependency>
            <groupId>ai.djl.pytorch</groupId>
            <artifactId>pytorch-model-zoo</artifactId>
            <version>${djl.version}</version>
        </dependency>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-simple</artifactId>
            <version>2.0.9</version>
        </dependency>
    </dependencies>
</project>
```

`src/main/java/com/fandex/ai/ImageClassification.java`（Java 21）：

```java
package com.fandex.ai;

import ai.djl.Application;
import ai.djl.ModelException;
import ai.djl.inference.Predictor;
import ai.djl.modality.Classifications;
import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.ImageFactory;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.translate.TranslateException;

import java.io.IOException;
import java.nio.file.Paths;

/**
 * 使用 DJL 加载 ResNet-50 进行图像分类。
 * 后端为 PyTorch，模型自动从 Model Zoo 下载。
 */
public final class ImageClassification {

    public static void main(String[] args) throws IOException, ModelException, TranslateException {
        Criteria<Image, Classifications> criteria = Criteria.builder()
                .optApplication(Application.CV.IMAGE_CLASSIFICATION)
                .setTypes(Image.class, Classifications.class)
                .optModelArtifactId("resnet")
                .optFilter("layers", "50")
                .build();

        try (ZooModel<Image, Classifications> model = criteria.loadModel();
             Predictor<Image, Classifications> predictor = model.newPredictor()) {
            Image img = ImageFactory.getInstance().fromFile(Paths.get("cat.jpg"));
            Classifications result = predictor.predict(img);
            System.out.println(result.best().getClassName() + ": " + result.best().getProbability());
        }
    }
}
```

### 示例 2：ONNX Runtime 文本分类

```java
package com.fandex.ai;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

import java.nio.file.Paths;
import java.util.Map;

/**
 * 使用 ONNX Runtime 加载 BERT 文本分类模型进行推理。
 */
public final class OnnxTextClassification {

    public static void main(String[] args) throws Exception {
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        try (OrtSession session = env.createSession(Paths.get("bert-classifier.onnx").toString())) {

            long[] inputIds = tokenize("Java is great for AI deployment.");
            long[][] inputShape = { inputIds };
            long[][] attentionMask = { new long[inputIds.length] };
            java.util.Arrays.fill(attentionMask[0], 1L);

            try (OnnxTensor inputTensor = OnnxTensor.createTensor(env, inputShape);
                 OnnxTensor maskTensor = OnnxTensor.createTensor(env, attentionMask);
                 OrtSession.Result result = session.run(Map.of(
                         "input_ids", inputTensor,
                         "attention_mask", maskTensor))) {

                float[][] logits = (float[][]) result.get(0).getValue();
                int predictedClass = argmax(logits[0]);
                System.out.println("Predicted class: " + predictedClass);
            }
        }
    }

    /** 简化版 tokenizer，实际应使用 HuggingFace tokenizer。 */
    private static long[] tokenize(String text) {
        // 实际项目中使用 tokenizers 或 DJL tokenizer
        return text.chars().asLongStream().toArray();
    }

    private static int argmax(float[] arr) {
        int best = 0;
        for (int i = 1; i < arr.length; i++) {
            if (arr[i] > arr[best]) best = i;
        }
        return best;
    }
}
```

### 示例 3：Spring AI 集成 OpenAI

```java
package com.fandex.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Spring AI 集成 OpenAI 的最小示例。
 * 通过 application.yml 配置 API Key。
 */
@SpringBootApplication
public class SpringAiDemo implements CommandLineRunner {

    private final ChatClient chatClient;

    public SpringAiDemo(OpenAiChatModel model) {
        this.chatClient = ChatClient.create(model);
    }

    public static void main(String[] args) {
        SpringApplication.run(SpringAiDemo.class, args);
    }

    @Override
    public void run(String... args) {
        String response = chatClient.prompt()
                .user("用 200 字解释 JVM 垃圾回收")
                .call()
                .content();
        System.out.println(response);
    }

    @Bean
    public CommandLineRunner streamDemo(OpenAiChatModel model) {
        return args -> {
            ChatClient.create(model).prompt()
                    .user("流式生成一段关于 Java 的诗")
                    .stream()
                    .content()
                    .doOnNext(System.out::print)
                    .blockLast();
        };
    }
}
```

`application.yml`：

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o
          temperature: 0.7
```

### 示例 4：LangChain4j RAG 应用

```java
package com.fandex.ai;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;

import java.util.List;

/**
 * 使用 LangChain4j 构建 RAG 索引。
 * 文档切片 → 嵌入 → 存入向量库。
 */
public final class RagIndexBuilder {

    public static void main(String[] args) {
        Document doc = Document.from("Java 21 引入虚拟线程，简化高并发编程。");

        DocumentSplitter splitter = DocumentSplitters.recursive(300, 30);
        List<TextSegment> segments = splitter.split(doc);

        OpenAiEmbeddingModel embedder = OpenAiEmbeddingModel.withApiKey(System.getenv("OPENAI_API_KEY"));
        List<Embedding> embeddings = embedder.embedAll(segments).content();

        EmbeddingStore<TextSegment> store = new InMemoryEmbeddingStore<>();
        for (int i = 0; i < segments.size(); i++) {
            store.add(embeddings.get(i), segments.get(i));
        }

        System.out.println("Indexed " + segments.size() + " segments");
    }
}
```

### 示例 5：批处理推理服务（虚拟线程）

```java
package com.fandex.ai;

import ai.djl.ModelException;
import ai.djl.inference.Predictor;
import ai.djl.modality.Classifications;
import ai.djl.modality.cv.Image;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.translate.TranslateException;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * 使用虚拟线程池进行批处理图像分类推理。
 * Predictor 非线程安全，每个虚拟线程独立持有 Predictor 实例。
 */
public final class BatchInferenceService {

    private final ZooModel<Image, Classifications> model;

    public BatchInferenceService() throws IOException, ModelException {
        Criteria<Image, Classifications> criteria = Criteria.builder()
                .setTypes(Image.class, Classifications.class)
                .optModelArtifactId("resnet")
                .optFilter("layers", "50")
                .build();
        this.model = criteria.loadModel();
    }

    /** 并发处理一批图像。 */
    public List<Classifications> classifyBatch(List<Image> images) throws Exception {
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<Classifications>> futures = images.stream()
                    .map(img -> pool.submit(() -> predict(img)))
                    .toList();
            // 等待全部完成
            return futures.stream().map(f -> {
                try { return f.get(); }
                catch (Exception e) { throw new RuntimeException(e); }
            }).toList();
        }
    }

    private Classifications predict(Image img) {
        // 每线程独立 Predictor
        try (Predictor<Image, Classifications> predictor = model.newPredictor()) {
            return predictor.predict(img);
        } catch (TranslateException e) {
            throw new RuntimeException(e);
        }
    }

    public void close() {
        model.close();
    }
}
```

### 示例 6：Gradle 配置

`build.gradle.kts`：

```kotlin
plugins {
    application
}
application {
    mainClass.set("com.fandex.ai.ImageClassification")
}
dependencies {
    implementation("ai.djl:api:0.24.0")
    implementation("ai.djl.pytorch:pytorch-engine:0.24.0")
    implementation("ai.djl.pytorch:pytorch-model-zoo:0.24.0")
    implementation("org.slf4j:slf4j-simple:2.0.9")
}
java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}
```

## 对比分析

### Java AI 与 Python AI 生态对比

| 维度 | Java | Python | 备注 |
| --- | --- | --- | --- |
| 训练框架 | DJL（底层调 PyTorch/TF）、DL4J | PyTorch、TensorFlow、JAX | Python 训练生态远超 Java |
| 推理框架 | DJL、ONNX Runtime Java、TF Java、DL4J | ONNX Runtime、torch.cuda、TF Serving | Java 推理能力持平 |
| 数据处理 | Spark、Flink、Beam | Pandas、NumPy、Dask | 大数据 Java 强；小数据 Python 强 |
| NLP 工具 | OpenNLP、Stanford CoreNLP、DJL NLP | spaCy、NLTK、HuggingFace | Python NLP 生态更丰富 |
| LLM 应用 | LangChain4j、Spring AI | LangChain、LlamaIndex | Python 框架先发；Java 快速追赶 |
| 部署运维 | Spring Boot、Kubernetes、JFR | FastAPI、gunicorn、Prometheus | Java 企业级运维更成熟 |
| 性能（推理） | 稳态持平 Python，JNI 边界约 10–100μs | 原生调用 C++/CUDA | 差异通常 < 5% |
| 类型安全 | 强类型，IDE 重构友好 | 动态类型，运行时错误多 | Java 维护性更强 |
| 冷启动 | 较慢（JIT 预热、类加载） | 快（解释执行） | GraalVM native image 可优化 |
| 工程师普及度 | 企业后端工程师广泛 | AI/ML 工程师广泛 | 双语言架构常见 |

### 与 C# / Go / Rust AI 生态对比

| 语言 | 推理生态 | LLM 框架 | 优势 | 劣势 |
| --- | --- | --- | --- | --- |
| Java | DJL、ONNX Runtime、TF Java | LangChain4j、Spring AI | 企业级集成、JVM 生态 | 冷启动、研究生态 |
| C# | ONNX Runtime、ML.NET | Semantic Kernel、LangChain.NET | .NET 生态、Azure 集成 | Linux 部署生态较弱 |
| Go | ONNX Runtime Go、gorgonia | langchaingo | 部署简单、二进制静态 | 生态起步晚 |
| Rust | candle、tract、ort（ONNX） | langchain-rust | 性能极强、内存安全 | 学习曲线陡 |

### 双语言架构 vs 单语言架构

**双语言架构**（Python 训练 + Java 推理）：

- 优点：训练阶段充分利用 Python 生态；推理阶段享受 Java 企业级特性。
- 缺点：模型格式转换（PyTorch → ONNX）、序列化开销、双团队协作成本。

**单语言架构**（Python 端到端 或 Java 端到端）：

- Python 端到端：研究友好，但生产稳定性、并发、监控弱于 Java。
- Java 端到端：生产友好，但训练生态弱，难以进行大规模实验。

工业实践：**双语言架构最常见**，通过 ONNX 作为模型交换格式，CI/CD 自动化模型导出与部署。

## 常见陷阱与最佳实践

### 陷阱 1：模型文件未打包

直接将 `.onnx` 或 `.pt` 文件放入 `src/main/resources` 可能因体积过大（数百 MB）导致 JAR 膨胀、构建缓慢。

**最佳实践**：

- 模型文件单独存储于对象存储（S3、OSS）。
- 应用启动时下载至本地缓存（带校验和）。
- 使用 Docker volume 或 PVC 持久化缓存。

### 陷阱 2：Predictor 非线程安全

DJL `Predictor` 实例非线程安全，多线程共享会导致数据竞争与崩溃。

**最佳实践**：每个线程独立 `Predictor` 实例（如示例 5 所示），或使用 `PredictorPool`（DJL 0.24+）。

### 陷阱 3：JNI 边界开销

每次推理跨 JNI 调用有 10–100μs 开销。频繁小批量推理时，JNI 开销可能占总延迟 30%。

**最佳实践**：

- 增大批处理量，摊薄 JNI 开销。
- 使用 ONNX Runtime 的 `RunOptions` 配置 `batchSize`。
- 评估 GraalVM 的 LLVM 后端，减少 JNI 开销。

### 陷阱 4：JIT 预热导致 P99 尖刺

JVM 启动初期 JIT 编译导致延迟尖刺，对 SLA 敏感的推理服务影响显著。

**最佳实践**：

- 预热：启动后发送 N 次预热请求（dummy input）触发 JIT。
- 使用 AppCDS（Application Class Data Sharing）减少类加载开销。
- 评估 GraalVM Native Image：AOT 编译，无 JIT 预热。

### 陷阱 5：Native 内存泄漏

DJL/ONNX Runtime 的张量在 native 内存中分配，不受 JVM GC 管理。未显式 `close()` 会导致 native 内存泄漏。

**最佳实践**：

- 始终使用 try-with-resources 包裹 `NDArray`、`OnnxTensor`、`OrtSession.Result`。
- 监控 native 内存：`-XX:NativeMemoryTracking=summary`、`jcmd <pid> VM.native_memory`。

### 陷阱 6：LLM API Key 硬编码

```java
// 错误：硬编码 Key
String apiKey = "sk-xxxxxxxxxxxx";
```

**最佳实践**：

- 使用环境变量：`System.getenv("OPENAI_API_KEY")`。
- Spring Boot 配置：`${OPENAI_API_KEY}`，配合 Spring Cloud Config 或 Vault。
- 生产环境使用短期凭证（STS、Workload Identity）。

### 陷阱 7：流式生成阻塞主线程

LLM 流式生成（SSE）若以阻塞方式调用，会占用大量线程。

**最佳实践**：

- 使用 Project Reactor `Flux<String>` 异步流。
- 虚拟线程（JDK 21+）承载阻塞调用。
- Spring WebFlux + `Flux` 端到端非阻塞。

### 陷阱 8：忽略 LLM 调用可观测性

LLM 调用涉及网络、token 消耗、延迟、错误率，缺乏可观测性难以排障与优化。

**最佳实践**：

- Micrometer 暴露 `llm.tokens.input`、`llm.tokens.output`、`llm.latency`、`llm.errors`。
- Spring AI 内置 Micrometer 集成。
- 使用 LangSmith、Helicone 等专有 LLM 可观测性平台。

### 最佳实践清单

1. **模型文件外置**：对象存储 + 本地缓存。
2. **Predictor 线程隔离**：每线程独立实例。
3. **批处理推理**：摊薄 JNI 与模型调用开销。
4. **JIT 预热**：启动后预热请求。
5. **Native 资源释放**：try-with-resources。
6. **API Key 安全**：环境变量 + Vault。
7. **流式异步**：Reactor Flux / 虚拟线程。
8. **可观测性**：Micrometer + LLM 专有平台。

## 工程实践

### 构建与打包

Maven 项目集成 DJL 的最佳实践：

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <!-- 分层打包，模型缓存单独层 -->
                <layers>
                    <enabled>true</enabled>
                </layers>
                <jvmArguments>
                    -XX:+UseZGC -XX:+ZGenerational
                    -Xms4g -Xmx4g
                    -XX:MaxRAMPercentage=75
                </jvmArguments>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Docker 容器化部署

```dockerfile
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY target/app.jar /app/app.jar
COPY models/ /app/models/
ENV JAVA_OPTS="-XX:+UseZGC -XX:+ZGenerational -XX:MaxRAMPercentage=75 -XX:+HeapDumpOnOutOfMemoryError"
ENV DJL_CACHE_DIR=/app/models
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
```

### Kubernetes GPU 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fandex-ai-inference
spec:
  template:
    spec:
      containers:
      - name: app
        image: fandex/ai-app:21
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: 16Gi
          requests:
            nvidia.com/gpu: 1
            memory: 8Gi
        env:
        - name: JAVA_OPTS
          value: "-XX:+UseZGC -XX:+ZGenerational -Xms12g -Xmx12g"
        volumeMounts:
        - name: model-cache
          mountPath: /app/models
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-pvc
```

### JVM 调优

1. **GC**：JDK 21 优先分代 ZGC（`-XX:+UseZGC -XX:+ZGenerational`），避免推理停顿。
2. **堆大小**：模型加载常驻内存，建议 `Xms=Xmx` 避免动态扩容。
3. **JIT**：`-XX:+TieredCompilation -XX:CompileThreshold=1000` 加速预热。
4. **NativeMemoryTracking**：`-XX:NativeMemoryTracking=summary` 监控 native 内存。
5. **AppCDS**：`-XX:SharedArchiveFile=app.jsa` 减少类加载。

### 调试工具链

| 工具 | 用途 | 命令示例 |
| --- | --- | --- |
| JFR | 持续低开销采样 | `jcmd <pid> JFR.start duration=60s filename=ai.jfr` |
| async-profiler | CPU/堆/锁采样 | `./profiler.sh -d 60 -f flame.html <pid>` |
| JMH | 微基准测试 | `mvn exec:java -Dexec.mainClass=...Benchmark` |
| Micrometer | 业务指标 | `MeterRegistry` 自动暴露至 Prometheus |
| LangSmith | LLM 调用追踪 | https://smith.langchain.com |
| Helicone | LLM 代理与监控 | https://helicone.ai |
| ONNX Runtime Tracing | 推理性能分析 | `ORT_LOGGING_LEVEL=VERBOSE` |

### Spring AI 监控集成

```java
package com.fandex.ai;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * 包装 ChatClient，添加 Micrometer 指标。
 */
@Service
public class InstrumentedChatService {

    private final ChatClient client;
    private final Timer latencyTimer;
    private final Counter tokenCounter;
    private final Counter errorCounter;

    public InstrumentedChatService(ChatClient.Builder builder, MeterRegistry registry) {
        this.client = builder.build();
        this.latencyTimer = Timer.builder("llm.latency").register(registry);
        this.tokenCounter = Counter.builder("llm.tokens").register(registry);
        this.errorCounter = Counter.builder("llm.errors").register(registry);
    }

    public String chat(String prompt) {
        return latencyTimer.record(() -> {
            try {
                String response = client.prompt().user(prompt).call().content();
                tokenCounter.increment(estimateTokens(prompt) + estimateTokens(response));
                return response;
            } catch (Exception e) {
                errorCounter.increment();
                throw e;
            }
        });
    }

    private int estimateTokens(String text) {
        return text.length() / 4;  // 粗略估计
    }
}
```

## 案例研究

### 案例 1：电商实时图像审核

**场景**：电商平台 UGC 图片实时审核（违规、低质、版权）。

**架构**：

- 用户上传图片 → Kafka → Java 推理服务（DJL + ResNet） → 审核结果入库。
- 模型：自训练 ResNet-50（ONNX 格式）。
- 部署：JDK 21 + ZGC + 16GB 堆。

**性能**：

- 单次推理：80ms（CPU），15ms（GPU）。
- 吞吐：500 QPS（GPU 单卡）。
- P99 延迟：30ms。

**关键决策**：选择 ONNX Runtime 而非 DJL，因 ONNX 模型直接由 PyTorch 导出，避免 DJL 后端依赖。

### 案例 2：金融风控实时评分

**场景**：贷款申请实时评分，输入用户画像与行为特征，输出风险分。

**架构**：

- Spring Boot 微服务 + DJL（XGBoost 后端）。
- 模型：XGBoost（1000 棵树）。
- 部署：JDK 17 + G1 + 4GB 堆。

**性能**：

- 单次评分：5ms。
- 吞吐：5000 QPS。
- P99：8ms。

**关键决策**：选择 DJL 而非 OpenNLP，因 XGBoost 模型原生支持。

### 案例 3：客服 RAG 系统

**场景**：内部客服系统，基于知识库回答员工问题。

**架构**：

- Spring Boot + LangChain4j。
- 嵌入模型：bge-small-zh（本地 ONNX 推理）。
- LLM：GPT-4o（远程 API）。
- 向量库：Milvus。
- 部署：JDK 21 + 虚拟线程。

**性能**：

- 检索延迟：50ms（向量库）+ 20ms（嵌入推理）。
- LLM 生成：2–5s（首 token 800ms，流式）。
- 端到端 P99：6s。

**关键决策**：嵌入本地推理降低 API 成本；LLM 远程调用避免 GPU 资源投入。

### 案例 4：制造业视觉质检

**场景**：流水线产品缺陷检测，摄像头每秒 30 帧图像。

**架构**：

- Java Edge 服务 + DJL（YOLOv8 ONNX）。
- 模型：YOLOv8n（缺陷检测）。
- 部署：JDK 21 + 4GB 堆 + Intel NPU。

**性能**：

- 单帧推理：25ms（NPU）。
- 吞吐：40 FPS（满足 30 FPS 需求）。
- P99：35ms。

**关键决策**：使用 OpenVINO 后端 + Intel NPU 加速；DJL 通过 ONNX Runtime 调用 OpenVINO EP。

### 案例 5：推荐系统特征计算

**场景**：电商推荐系统实时特征计算，输入用户行为序列，输出 embedding。

**架构**：

- Flink + DJL（Transformer embedding）。
- 模型：自训练 BERT-small（128 维输出）。
- 部署：JDK 17 + 32GB 堆 + G1。

**性能**：

- 单次 embedding：15ms。
- 吞吐：10万 QPS。
- P99：25ms。

**关键决策**：使用 Flink 状态后端缓存最近行为；DJL Predictor 每任务实例独立。

## 习题

### 选择题

**1. 下列哪个库是 AWS 推出的框架无关的 Java 深度学习库？**

A. Deeplearning4j
B. DJL（Deep Java Library）
C. OpenNLP
D. Weka

**答案**：B
**解析**：DJL（Deep Java Library）由 AWS 于 2019 年发布，设计为框架无关的 Java 深度学习 API，底层可切换 PyTorch、TensorFlow、MXNet、ONNX Runtime 等后端。

**2. ONNX Runtime Java API 在 JVM 上的推理性能相比原生 Python 推理，通常如何？**

A. 远低于 Python
B. 稳态持平，JNI 边界有 10–100μs 开销
C. 远高于 Python
D. 完全相同

**答案**：B
**解析**：ONNX Runtime 底层调用相同的 C++/CUDA 库，推理性能理论上相同。Java 额外有 JNI 边界开销（10–100μs/次），但稳态性能持平。批处理场景下边界开销摊薄。

**3. DJL 中 Predictor 的线程安全性如何？**

A. 线程安全，可多线程共享
B. 非线程安全，每线程需独立实例
C. 通过 synchronized 自动同步
D. 通过 volatile 保证可见性

**答案**：B
**解析**：DJL `Predictor` 实例非线程安全，多线程共享会导致数据竞争与崩溃。最佳实践是每线程独立 `Predictor` 实例，或使用 `PredictorPool`（DJL 0.24+）。

**4. Spring AI 通过哪个抽象统一不同 LLM 提供商？**

A. `LlmClient`
B. `ChatModel` / `EmbeddingModel`
C. `ChatService`
D. `AiClient`

**答案**：B
**解析**：Spring AI 通过 `ChatModel`、`EmbeddingModel`、`ImageModel` 等接口抽象不同提供商（OpenAI、Anthropic、Azure、Ollama），通过 `ChatClient.create(model)` 创建流式 API。

**5. JDK 21 虚拟线程对 LLM 流式生成服务的核心改进是？**

A. 降低单次推理延迟
B. 提升模型精度
C. 高并发流式调用不占用平台线程
D. 减少 token 消耗

**答案**：C
**解析**：LLM 流式生成（SSE）通常为长连接（数秒到数十秒），传统平台线程模型下高并发会耗尽线程池。虚拟线程使每个流式调用独立调度，不占用平台线程，支持万级并发。

### 填空题

**1.** DJL 通过 ___ 抽象屏蔽底层框架（PyTorch、TensorFlow、MXNet）。

**答案**：Engine

**2.** ONNX 模型由 PyTorch 通过 ___ 方法导出。

**答案**：`torch.onnx.export`

**3.** LangChain4j 中 RAG 的核心流程是：文档切片 → ___ → 存入向量库 → 检索增强生成。

**答案**：嵌入（embedding）

**4.** Spring AI 流式生成通过 ___ 类型返回异步 token 流。

**答案**：`Flux<String>`

**5.** JVM 推理性能模型中，JIT 预热阶段通常持续前 ___ 次调用。

**答案**：几千

### 编程题

**1.** 使用 DJL 加载一个 PyTorch BERT 模型，实现文本情感分类。

**参考答案**：

```java
package com.fandex.ai;

import ai.djl.ModelException;
import ai.djl.inference.Predictor;
import ai.djl.modality.nlp.DefaultVocabulary;
import ai.djl.modality.nlp.bert.BertTokenizer;
import ai.djl.ndarray.NDArray;
import ai.djl.ndarray.NDList;
import ai.djl.ndarray.NDManager;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.translate.TranslateException;
import ai.djl.translate.Translator;
import ai.djl.translate.TranslatorContext;

import java.io.IOException;
import java.util.Map;

/**
 * 使用 DJL 加载 BERT 进行情感分类。
 */
public final class BertSentiment {

    public static void main(String[] args) throws IOException, ModelException {
        Criteria<String, String> criteria = Criteria.builder()
                .setTypes(String.class, String.class)
                .optModelArtifactId("bert")
                .optFilter("model", "sentiment")
                .build();

        try (ZooModel<String, String> model = criteria.loadModel();
             Predictor<String, String> predictor = model.newPredictor()) {
            String result = predictor.predict("Java is great for AI deployment!");
            System.out.println("Sentiment: " + result);
        } catch (TranslateException e) {
            throw new RuntimeException(e);
        }
    }
}
```

**2.** 实现 Spring AI 端点，支持流式生成与 Micrometer 监控。

**参考答案**：

```java
package com.fandex.ai;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * 流式生成端点，含 Micrometer 监控。
 */
@RestController
public class ChatController {

    private final ChatClient client;
    private final Timer latencyTimer;

    public ChatController(ChatClient.Builder builder, MeterRegistry registry) {
        this.client = builder.build();
        this.latencyTimer = Timer.builder("llm.stream.latency").register(registry);
    }

    @PostMapping(value = "/chat/stream", produces = "text/event-stream")
    public Flux<String> stream(@RequestBody String prompt) {
        long start = System.nanoTime();
        return client.prompt().user(prompt).stream().content()
                .doOnComplete(() -> latencyTimer.record(java.time.Duration.ofNanos(System.nanoTime() - start)))
                .doOnError(e -> latencyTimer.record(java.time.Duration.ofNanos(System.nanoTime() - start)));
    }
}
```

### 思考题

**1.** 为什么工业界常采用"Python 训练 + Java 推理"的双语言架构？这种架构的核心挑战是什么？

**参考答案**：(1) 训练阶段 Python 生态远超 Java（PyTorch、TF、JAX 等研究工具链完善）；(2) 推理阶段 Java 企业级特性（Spring、JFR、强类型、运维生态）更适合生产部署；(3) 通过 ONNX 作为模型交换格式解耦训练与推理。核心挑战：模型格式转换（PyTorch → ONNX）可能损失精度或算子不支持；双团队协作成本；版本对齐复杂。

**2.** 假设你需要部署一个 LLM 服务，QPS 1000，单次调用平均 3 秒。如何选择线程模型？

**参考答案**：(1) 传统平台线程：每请求占一线程，1000 QPS × 3s = 3000 并发线程，远超 JVM 平台线程上限（通常数百至数千）。不可行。(2) 虚拟线程（JDK 21+）：每请求一虚拟线程，3000 虚拟线程轻量（每线程 KB 级），底层少量平台线程调度。可行。(3) WebFlux + Reactor：非阻塞 IO，少量事件循环线程处理万级并发。可行，但需要全栈响应式编程。结论：JDK 21+ 优先虚拟线程；若已有 WebFlux 基础设施可继续使用 Reactor。

**3.** 解释"JNI 边界开销"对 JVM 推理性能的影响，并给出两种缓解方案。

**参考答案**：JNI 边界开销指 Java 调用 native（C++/CUDA）函数时的固定开销，约 10–100μs/次。影响：频繁小批量推理时，JNI 开销可能占总延迟 30%。缓解方案：(1) 增大批处理量，摊薄 JNI 开销；(2) 使用 GraalVM 的 LLVM 后端，部分模型可直接编译为 JVM 字节码，减少 JNI；(3) 模型蒸馏，将大模型压缩为小模型减少调用次数；(4) 多模型合并（multi-task model），单次 JNI 调用处理多任务。

## 参考文献

[1] Amazon Web Services. 2019. *Deep Java Library (DJL) Documentation*. AWS, Seattle, WA, USA. Available at: https://djl.ai

[2] Microsoft. 2020. *ONNX Runtime Java API*. Microsoft, Redmond, WA, USA. Available at: https://onnxruntime.ai/docs/get-started/with-java.html

[3] Pivotal Software. 2024. *Spring AI Reference Documentation*. VMware, Palo Alto, CA, USA. Available at: https://docs.spring.io/spring-ai/reference/

[4] LangChain4j. 2023. *LangChain4j Documentation*. Available at: https://docs.langchain4j.dev

[5] Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., and Polosukhin, I. 2017. Attention is all you need. In *Proceedings of the 31st International Conference on Neural Information Processing Systems (NIPS'17)*. Curran Associates Inc., Red Hook, NY, USA, 6000–6010. DOI: https://doi.org/10.5555/3295222.3295349

[6] Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., and Kiela, D. 2020. Retrieval-augmented generation for knowledge-intensive NLP tasks. In *Proceedings of the 34th International Conference on Neural Information Processing Systems (NeurIPS '20)*. Curran Associates Inc., Red Hook, NY, USA, 9459–9474. DOI: https://doi.org/10.5555/3495724.3496517

[7] Apache Software Foundation. 2023. *Apache OpenNLP Developer Documentation*. ASF, Wakefield, MA, USA. Available at: https://opennlp.apache.org/docs/

[8] Eclipse Deeplearning4j. 2023. *Deeplearning4j Documentation*. Eclipse Foundation, Ottawa, ON, Canada. Available at: https://deeplearning4j.konduit.ai

[9] Hall, M., Frank, E., Holmes, G., Pfahringer, B., Reutemann, P., and Witten, I. H. 2009. The WEKA data mining software: An update. *SIGKDD Explorations* 11, 1, 10–18. DOI: https://doi.org/10.1145/1656274.1656278

[10] Oracle Corporation. 2023. *The Java Virtual Machine Specification, Java SE 21 Edition*. Oracle, Redwood City, CA, USA.

[11] Press, O. 2024. *JDK 21 Virtual Threads (JEP 444)*. OpenJDK. Available at: https://openjdk.org/jeps/444

[12] Vaswani, A. et al. 2017. *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*. arXiv:1810.04805. DOI: https://doi.org/10.48550/arXiv.1810.04805

## 延伸阅读

### 书籍

- **Harrington, P.** *Machine Learning in Action*. Manning, 2012. — 经典 ML 算法实战。
- **Leskovec, J., Rajaraman, A., and Ullman, J. D.** *Mining of Massive Datasets* (3rd ed.). Cambridge University Press, 2020. — 大规模数据挖掘。
- **Geron, A.** *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (3rd ed.). O'Reilly, 2022. — ML 实战经典。
- **Bowley, M.** *Deep Learning with Java*. Apress, 2020. — DL4J 实战。

### 论文

- **Vaswani, A. et al.** *Attention Is All You Need*. NeurIPS, 2017. — Transformer 奠基。
- **Lewis, P. et al.** *Retrieval-Augmented Generation*. NeurIPS, 2020. — RAG 奠基。
- **Devlin, J. et al.** *BERT*. NAACL, 2019. — 预训练语言模型。
- **Brown, T. et al.** *Language Models are Few-Shot Learners*. NeurIPS, 2020. — GPT-3。

### 在线资源

- **DJL 官方文档**：https://djl.ai
- **ONNX Runtime Java 文档**：https://onnxruntime.ai/docs/get-started/with-java.html
- **Spring AI 文档**：https://docs.spring.io/spring-ai/reference/
- **LangChain4j 文档**：https://docs.langchain4j.dev
- **Apache OpenNLP**：https://opennlp.apache.org
- **Deeplearning4j**：https://deeplearning4j.konduit.ai
- **HuggingFace Java Tokenizers**：https://github.com/huggingface/tokenizers
- **LangSmith LLM 可观测性**：https://smith.langchain.com
- **Helicone LLM 监控**：https://helicone.ai

### 相关课程

- **MIT 6.036 Introduction to Machine Learning**：ML 基础。
- **Stanford CS224N Natural Language Processing**：NLP 与 LLM。
- **Stanford CS231N Computer Vision**：计算机视觉。
- **CMU 11-785 Introduction to Deep Learning**：深度学习。
- **Berkeley CS288 Natural Language Processing**：现代 NLP。
- **Fast.ai Practical Deep Learning**：实战深度学习。
