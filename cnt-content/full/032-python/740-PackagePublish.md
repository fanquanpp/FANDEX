---
order: 580
title: 发布到 PyPI：从 dist 目录到 pip install
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「把 slide-forge 发上 PyPI」为场景，走完第一次发布全流程：TestPyPI 演练、API token 配置、twine check、正式上传与安装验证；进阶到 tag 触发的 GitHub Actions 自动发布与 Trusted Publisher 免密钥方案，附 PyPI 不可变原则与版本节奏实践。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/730-PythonPackagingEvolution'
  - 'python/780-PythonCICD'
  - 'python/700-CExtensionsAndFfi'
prerequisites:
  - 'python/730-PythonPackagingEvolution'
---

## 前置知识

- [打包演进与 pyproject.toml](/python/730-PythonPackagingEvolution)：项目已配好 `pyproject.toml`，`python -m build` 能产出 `dist/`。

## 你现在要解决什么问题

上一篇把 slide-forge 改造成了标准包，`dist/` 里躺着 sdist 和 wheel。最后一个环节：让任何人 `pip install slide-forge` 就能用上。这篇走完发布全流程——第一次手动发到测试仓库练手，第二次交给 CI 自动发。

## 先动手：在 TestPyPI 上发第一版

**TestPyPI**（test.pypi.org）是 PyPI 的完整彩排场：同样的上传流程、独立的账号体系，包发错了也无人知晓。第一次发布永远先来这里。

第一步，注册两个站的账号并在 PyPI 设置页生成 API token（用户名密码早已不能直接上传）。把 token 写进用户目录的 `~/.pypirc`：

```text
[distutils]
index-servers =
    pypi
    testpypi

[testpypi]
username = __token__
password = pypi-AgEIcHlwaS5vcmc...   # TestPyPI 的 token

[pypi]
username = __token__
password = pypi-AgEIcHlwaS5vcmc...   # 正式 PyPI 的 token
```

第二步，构建、自检、上传：

```bash
python -m pip install --upgrade build twine
python -m build
twine check dist/*
twine upload --repository testpypi dist/*
```

`twine check` 检查长描述等元数据能否正常渲染——PyPI 项目页上那片空白或一坨原始 Markdown，九成是这里漏跑了。第三步，开一个干净虚拟环境，从测试仓库装回来验证：

```bash
python -m venv /tmp/try && /tmp/try/Scripts/activate    # Linux/macOS 为 bin/activate
pip install --index-url https://test.pypi.org/simple/ slide-forge
slideforge --help
```

装得上、跑得动，彩排通过。正式发布只是换一个仓库参数：`twine upload dist/*`。几分钟后，任何人都能 `pip install slide-forge`。

## 发布后的铁律：版本不可变

上传成功后试着重传同一个版本号，会被拒收：

```text
Error: File already exists. See https://pypi.org/help/#file-name-reuse
```

PyPI 规定**同一版本号的文件永久不可替换**——已安装用户必须得到与版本号完全一致的内容，这是供应链可信的基石。因此「发错了怎么办」的答案只有一个：**改代码，加版本号，再发**。补丁 `0.3.1 -> 0.3.2`，预发布 `0.4.0rc1`。这也解释了为什么版本号要交给工具管（`hatch version`、`uv version`），人肉改 `pyproject.toml` 迟早撞车。

版本节奏用最朴素的语义化约定就够：`0.x` 阶段接口随便动；`1.0` 之后大版本号只在不兼容变更时递增；重大版本前发 `rc` 让下游先试。每版在 `CHANGELOG.md` 里留一行「改了什么、怎么迁移」，下游会感谢你。

## 进阶：交给 CI，tag 一下自动发布

手动流程熟练后，固化成 GitHub Actions：打 tag 即发布，人不再碰 twine。配套的安全机制是 **Trusted Publisher**：在 PyPI 项目设置里登记「哪个仓库的哪个 workflow 可以上传」，PyPI 凭 OIDC 令牌验证身份，仓库里不需要存任何密钥：

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write        # Trusted Publisher 必需
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m pip install build twine
      - run: python -m build
      - run: twine check dist/*
      - uses: pypa/gh-action-pypi-publish@release/v1
```

日常发布因此收敛成两步：

```bash
hatch version 0.3.2        # 或手动改 pyproject.toml
git tag v0.3.2 && git push --tags
```

首次使用需在 PyPI 上完成一次 Trusted Publisher 登记（项目名、GitHub 仓库名、workflow 文件名、环境名），之后全自动。没有 Trusted Publisher 的场合（GitLab、Jenkins），退回 API token 方案，把 token 放进 CI 的 secrets——不要写进任何文件提交。

## 两个发布之外的实务

**私有源**。公司内不公开的包，不必自建完整 PyPI：pypiserver、devpi 这类轻量私有索引，或云厂商的制品库（如 AWS CodeArtifact）都能当 `--index-url` 的目标，`twine upload --repository-url` 指过去即可。包可见性是发布体系里的正交开关。

**含 C 扩展的包**。纯 Python 包发一个 `py3-none-any` wheel 就覆盖全平台；带扩展的包要为每个平台、每个 Python 版本各构建一个 wheel（`cibuildwheel` 是事实标准工具），或退回只发 sdist 让用户自己编译。扩展本体见 [C 扩展与 FFI](/python/700-CExtensionsAndFfi)。

## 常见坑点

坑一：token 泄漏。`~/.pypirc` 千万别复制进仓库；万一 token 进了提交历史，立即去 PyPI 吊销重建。Trusted Publisher 方案从根上消除了这类事故，能用就用。

坑二：包名被抢注（typosquatting）。热门名字的近似拼写早被注册一空，动手前先在 PyPI 搜一下；名字确定后再发第一版占位，别等「写完再发」。

坑三：重传思维。构建脚本里写「先删 dist 再上传同名版本」在 PyPI 走不通；本地重发要换版本号，测试可以删文件重传的只有自建私有源。

坑四：忘了 `py.typed`。库写了类型注解但没在包里放 `py.typed` 空标记文件，下游 mypy 会提示「缺少类型信息」。在包目录放空文件并在构建配置里声明进 wheel（hatchling 的 `[tool.hatch.build.targets.wheel]` 里配 `packages` 时默认带上，setuptools 需手动配 `package-data`）。

坑五：`twine check` 缺席。README 路径写错、Markdown 语法不兼容这类问题，上传后只能看着 PyPI 项目页一坨乱码。check 这一步不花十秒，永远跑。

## 自我检查

- 能不查资料走完 TestPyPI 彩排到正式发布的全部命令；
- 能解释 PyPI 为什么禁止重传同版本号，以及错误版本的补救路径；
- 能画出 tag 触发自动发布的流程，说出 Trusted Publisher 消灭了什么风险；
- 知道库要发 `py.typed`、纯 Python 包与扩展包的 wheel 数量差异。

## 练习

1. 预测题：连续两次 `twine upload dist/*`，第二次会发生什么？换个角度：如果第二次前 `rm -rf dist && python -m build` 了呢？
2. 修改题：给发布 workflow 加一步——发布前跑 `pytest`，失败则中止；想清楚这个 job 与 publish job 之间的依赖怎么写。
3. 实战题：注册 TestPyPI，把任意自己的小工具按本篇流程完整发一版，并在干净虚拟环境里装回验证。
4. 挑战题：写一个 `release.sh`：检查工作区干净、跑测试、bump 版本、提交、打 tag、推送，任何一步失败立即中止；用 `set -euo pipefail` 实现。

## 下一步

- 发布只是 CI 的一个 job，完整流水线（测试矩阵、质量门禁）见 [Python 与 CI/CD](/python/780-PythonCICD)；
- 构建阶段的 pyproject.toml 细节回看：[打包演进与 pyproject.toml](/python/730-PythonPackagingEvolution)；
- 命令行工具的入口函数怎么写得像样：[Python CLI](/python/810-PythonCLI)。
