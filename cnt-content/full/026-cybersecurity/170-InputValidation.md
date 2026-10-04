---
order: 170
title: 输入验证
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 输入验证的三个动作（验证/净化/编码）与白名单优于黑名单的原理，从「多套解码器对同一字节序列理解不同」解释一切绕过手法的共同根源，附动手练习与面试题思路。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'cybersecurity/330-SecureCodingPrinciples'
  - 'cybersecurity/160-OWASPTop10Detailed'
  - 'cybersecurity/180-SQLInjection'
  - 'cybersecurity/290-AuthenticationAuthorization'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. 三个动作，别再混为一谈

「输入验证」这个泛称下面藏着三个目标完全不同的动作，混淆它们是防御写错位置
的根本原因：

| 动作     | 回答的问题               | 时机     | 失败表现         |
| :------- | :----------------------- | :------- | :--------------- |
| 验证     | 这个输入是不是合法的？   | 入口     | 拒绝（reject）   |
| 净化     | 输入里不允许的部分去掉？ | 入口后   | 改写（sanitize） |
| 编码     | 输出时会不会被误执行？   | 出口     | 转义（encode）   |

三个判断要点：

- **验证**只做「是/否」判断，不做「修正」。把 `<script>` 替换成空串是净化，
  不是验证——验证应当直接拒绝这条输入。净化是给「用户确实需要提交富文本」
  这类场景的妥协方案，能用验证解决就不要净化；
- **净化**有明确的适用场景（如评论允许加粗语法），但永远是次优解：改写逻辑
  一旦有漏，等于在系统里留了个半开的大门；
- **编码**发生在出口而不是入口——同一个字符串在 HTML、URL、SQL 三种上下文里
  「危险的样子」完全不同，所以编码必须贴着使用点做。这一步属于输出防御，
  在 SQL 注入（180）与 XSS（190/200）篇展开，本文聚焦前两个动作。

## 2. 白名单优于黑名单：一个不对称性原理

为什么所有规范都把这条排在第一位？因为攻防两侧的搜索空间不对称：

```text
黑名单思路：「禁止 '、;、--、<script>……」
  → 恶意输入的空间不可枚举（编码变体、大小写、注释、截断……无穷无尽）
  → 每种新写法都是一次绕过，黑名单永远在追赶

白名单思路：「订单号 = 恰好 16 位数字」
  → 合法输入的空间可以枚举（业务规则说了算）
  → 不在集合内的一律拒绝，新攻击写法自动被挡在门外
```

实操上的三档白名单，从严到宽：

1. **枚举集合**：状态字段只允许 `{active, pending, closed}`；
2. **格式模板**：用户名 `^[a-zA-Z0-9_]{3,20}$`、手机号固定位数；
3. **数值范围**：分页 `page ∈ [1, 1000]`，数量 `count ≤ 100`。

能用枚举绝不用正则，能用正则绝不用「过滤几个危险字符」——防御强度随自由度
上升而下降。

## 3. 验证什么：五层从外到内

拿到一个外部输入，逐层过：

```python
def validate_order_param(raw: str) -> int:
    if not isinstance(raw, str):          # 1. 类型层：它是不是我以为的类型
        raise ValidationError("bad type")
    if len(raw) > 10:                     # 2. 长度层：先限长再谈其他
        raise ValidationError("too long")
    if not raw.isdigit():                 # 3. 格式层：白名单字符集
        raise ValidationError("bad format")
    order_id = int(raw)
    if not (1 <= order_id <= 10**9):      # 4. 范围层：数值语义
        raise ValidationError("out of range")
    if not order_exists(order_id):        # 5. 语义层：业务规则（存在性/所有权）
        raise ValidationError("not found")
    return order_id
```

两个容易漏的层：**长度层**放得再宽也要限（超长输入本身是 DoS 向量，正则引擎
和下游解析器都可能被拖垮）；**语义层**不属于语法验证但属于验证——「资源存在
且属于当前用户」的判断漏掉就是 IDOR（水平越权）。

输入来源清单里最常被遗忘的三处：HTTP 头（User-Agent、Referer 都可伪造）、
文件上传（文件名与 MIME 都是客户端声明，不可信）、以及**数据库/缓存读出的
二次输入**——第一次入库时合法不代表第二次使用时无害（存储型 XSS 与二次注入
的温床，见 330-SecureCodingPrinciples 的数据流视角）。

## 4. 一切绕过手法的共同根源：解码器不止一个

绕过表背不完，但根源只有一句话：**你的验证代码和下游解析器看到的可能不是
同一个字符串**。Web 链路上有 HTTP 解析、URL 解码、HTML 实体解码、Unicode
规范化、Base64、JSON 多套解码器，字节序列在每一层被重新解释：

| 手法             | 例子                    | 原理                                |
| :--------------- | :---------------------- | :---------------------------------- |
| URL 编码         | `%3Cscript%3E`          | WAF 看到的是百分号编码，应用已解码  |
| 双重编码         | `%253C`                 | 解码一次还剩一层编码，各层解码次数不一致 |
| HTML 实体        | `&#60;script&#62;`      | 实体解码发生在渲染层，晚于你的验证  |
| Unicode 规范化   | 全角变半角、组合字符    | 规范化发生在验证之后，字符被换掉    |
| 大小写/注释混淆  | `SeLeCt/**/`            | 针对正则黑名单的已知模式做变形      |
| 空字节           | `file.php%00.jpg`       | C 语言栈按 `\0` 截断，验证器却看不到 |

由此得出两条工程结论：

1. **验证发生在「归一化之后」**：先把输入解码到应用层的统一形态（解 URL 编码、
   做 Unicode 规范化），再对归一化结果做白名单验证；只验证原始字节等于把
   检查建立在别人随时会重新解释的数据上。
2. **不要用黑名单去追赶变体**：看到上表应该想到的不是「把每种变体都加进
   黑名单」（追不完），而是「我的白名单根本不会放这些进大门」。

## 5. 工程化落地：schema 优先

逐个函数手写验证规则会散落、漂移、遗漏。现代做法是把验证收敛到「数据契约」：
入口处用 schema 声明每类数据的白名单规则，验证与文档共用同一份定义。

```python
from pydantic import BaseModel, Field

class OrderCreate(BaseModel):
    product_id: int = Field(ge=1, le=10**9)            # 范围层
    quantity: int = Field(ge=1, le=100)                # 范围层
    coupon: str | None = Field(None, max_length=32,
                               pattern=r'^[A-Z0-9]{4,32}$')  # 格式层
```

```javascript
import { z } from 'zod';

const OrderCreate = z.object({
  productId: z.number().int().min(1),
  quantity: z.number().int().min(1).max(100),
  coupon: z.string().max(32).regex(/^[A-Z0-9]{4,32}$/).optional(),
});
const order = OrderCreate.parse(body);   // 不合规直接抛错，天然失败安全
```

schema 优先解决三件事：规则集中在一份契约里（关注点分离）；验证失败统一走
异常路径（失败安全）；前后端、文档、测试用同一份规则（一致验证）。剩下需要
手写的是 schema 表达不了的语义层（存在性、所有权、业务约束）。

## 6. 面试题思路

- 「为什么白名单优于黑名单？」——答不对称性：恶意空间不可枚举、合法空间可
  枚举；黑名单是开放式问题（永远有新变体），白名单是封闭式问题（业务规则
  定义完就稳定）。
- 「前端验证、后端验证、数据库约束各是干什么的？」——前端验证是体验优化
  （即时反馈），后端验证是安全边界（可被 curl 绕过的只有它自己挡得住），
  数据库约束是最后防线（防应用层 bug 写脏数据）；三者规则必须同源。
- 「已知 WAF 拦截 `<script>`，你怎么判断能不能绕过？」——考点是「编码层
  差异」：逐一尝试 URL 编码、双重编码、HTML 实体、大小写与注释混淆，
  本质是找 WAF 解码轮次与应用解码轮次不一致的地方（渗透测试须有书面授权）。
- 「什么是二次注入？」——入库时数据「看起来无害」（被转义或本就合法），
  读出后拼接进新查询/渲染时才发作；防御是把验证与编码跟着使用点走，
  而不是只在第一次入库时做一次。

## 7. 动手实践

练习任务（先自己写，再看自检区）：

1. 为「文件下载接口」设计验证链：参数是文件名，要求防路径遍历
   （`../../etc/passwd`）与空字节截断，参考实现在下方。
2. 把一段只做黑名单过滤（`replace('<script>', '')`）的评论提交函数改成
   白名单验证 + 净化的正确组合，并说明两种角色（管理员富文本/普通用户
   纯文本）下各自的策略。
3. 用 Pydantic 或 Zod 给一个「用户注册」接口写完整 schema：用户名、邮箱、
   年龄三字段，覆盖类型/长度/格式/范围四层。

遮代码自检——先想再对：

提示一：路径遍历防御的三个关键动作是什么？顺序为什么重要？

```python
import os

def safe_download(base_dir: str, filename: str) -> str:
    if '\x00' in filename:                        # 空字节直接拒绝（C 栈截断风险）
        raise ValidationError("bad name")
    name = os.path.basename(filename)             # 剥掉任何路径成分
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,64}', name):
        raise ValidationError("bad name")         # 白名单字符集
    full = os.path.realpath(os.path.join(base_dir, name))  # 规范化解析符号链接
    if not full.startswith(os.path.realpath(base_dir) + os.sep):
        raise ValidationError("escape detected")  # 终点必须仍在基目录内
    return full
```

顺序要点：先归一化（basename、realpath）再验证、验证后还要复查终点——
「先检查后规范化」的顺序会让 `..%2f` 这类编码绕过检查后再被解码展开。

提示二：富文本和纯文本两个角色的策略差异在哪？

```python
# 普通用户：纯文本。验证 + 出口编码即可，不需要净化
#   - 验证：长度上限 + 拒绝控制字符
#   - 输出：模板引擎自动 HTML 转义（出口编码）

# 管理员富文本：允许有限标签，净化才登场
clean = bleach.clean(
    raw,
    tags={'b', 'i', 'a', 'p'},           # 白名单标签，不是黑名单删除
    attributes={'a': {'href'}},          # 白名单属性
    protocols={'https'},                 # href 协议白名单（防 javascript: 伪协议）
)
# 净化结果按「不可信 HTML」存储与渲染，仍不做二次转义（避免双重编码）
```

提示三：注册 schema 的四层各写在哪里？

```python
class Register(BaseModel):
    username: str = Field(min_length=3, max_length=20,
                          pattern=r'^[a-zA-Z0-9_]+$')   # 长度 + 格式
    email: EmailStr                                     # 格式（现成验证器）
    age: int = Field(ge=1, le=149)                      # 范围
    # 类型层由 Pydantic 的字段类型声明完成（str/int 之外的输入直接报错）
```

## 8. 常见误区

| 误区                                     | 事实                                                       |
| :--------------------------------------- | :--------------------------------------------------------- |
| 「把恶意字符过滤掉就是验证」              | 那是黑名单净化；验证只做「是否符合白名单」的是非判断         |
| 「前端验证过了后端可以省」                | 前端验证可被完全绕过，后端验证才是安全边界                   |
| 「入库时验证过就一劳永逸」                | 存储型 XSS/二次注入说明卡点要跟着使用点走                    |
| 「长度限制只是体验问题」                  | 超长输入是 DoS 向量，且会让下游解析器行为异常                |
| 「HTTPS 所以输入是安全的」                | 加密防窃听篡改传输，不改变「输入本身不可信」                 |

## 小结

- **初学者要点**：分清验证（入口、是非判断）、净化（有限场景的改写）、编码
  （出口、贴使用点）；一律白名单，五层逐层过（类型、长度、格式、范围、语义）；
  前端验证是体验、后端验证是边界。
- **进阶注意**：一切绕过手法都源于「验证代码与下游解析器看到的字符串不一致」，
  所以先归一化再验证、验证后复查终点；schema 优先把规则收敛成一份契约，
  schema 覆盖不了的语义层（所有权、存在性）必须手写；WAF 层的对抗视角见
  350-WAFRule，注入类漏洞的终点防御见 180 与 190。
