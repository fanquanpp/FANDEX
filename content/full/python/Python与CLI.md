---
order: 81
title: Python与CLI
module: python
category: Python
difficulty: beginner
description: 命令行工具开发
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与日志
  - python/Python与测试
  - python/Python与加密
  - python/函数详解
prerequisites:
  - python/语法速查
---

## 什么是 CLI

CLI 是 Command Line Interface 的缩写，即命令行界面。CLI 工具是用户在终端中通过输入命令来操作的程序，比如 git、pip、docker 都是 CLI 工具。

Python 非常适合开发 CLI 工具，因为它有丰富的标准库和第三方库来处理命令行参数、格式化输出、交互式输入等。很多知名的 CLI 工具都是用 Python 编写的，如 aws-cli、httpie、black 等。

## 基础概念

### 命令、参数与选项

一个典型的 CLI 命令由以下部分组成：

```
mytool --verbose process --format=json input.txt
```

- 命令（Command）：`process`，表示要执行的操作
- 选项（Option）：`--verbose`、`--format=json`，以 -- 开头的可选参数
- 参数（Argument）：`input.txt`，命令需要的位置参数

### 子命令

复杂的 CLI 工具通常有子命令结构，如 `git add`、`git commit`、`git push`。每个子命令有自己的参数和选项。

### 退出码

CLI 工具通过退出码告诉调用者执行是否成功。0 表示成功，非 0 表示失败。这在脚本和 CI/CD 中非常重要。

## 快速上手

### 使用 argparse（标准库）

argparse 是 Python 标准库中的命令行解析模块，不需要安装：

```python
# mytool.py
import argparse

def main():
    # 创建解析器
    parser = argparse.ArgumentParser(description='一个示例 CLI 工具')

    # 添加位置参数
    parser.add_argument('name', help='你的名字')

    # 添加可选参数
    parser.add_argument('--age', type=int, default=18, help='你的年龄')
    parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')

    # 解析参数
    args = parser.parse_args()

    # 使用参数
    if args.verbose:
        print(f"名字: {args.name}, 年龄: {args.age}")
    else:
        print(f"你好, {args.name}!")

if __name__ == '__main__':
    main()
```

使用方式：

```bash
# 基本用法
python mytool.py 张三

# 使用选项
python mytool.py 张三 --age 25

# 使用简写
python mytool.py 张三 -v

# 查看帮助
python mytool.py --help
```

### 使用 Click（推荐）

Click 是一个更现代的 CLI 开发库，使用装饰器语法，代码更简洁：

```bash
pip install click
```

```python
# mytool.py
import click

@click.command()
@click.argument('name')
@click.option('--age', default=18, help='你的年龄')
@click.option('--verbose', '-v', is_flag=True, help='详细输出')
def hello(name, age, verbose):
    """一个示例 CLI 工具"""
    if verbose:
        click.echo(f"名字: {name}, 年龄: {age}")
    else:
        click.echo(f"你好, {name}!")

if __name__ == '__main__':
    hello()
```

## 详细用法

### Click 子命令

```python
import click

@click.group()
def cli():
    """项目管理工具"""
    pass

@cli.command()
@click.argument('name')
@click.option('--description', '-d', default='', help='项目描述')
def create(name, description):
    """创建新项目"""
    click.echo(f"创建项目: {name}")
    if description:
        click.echo(f"描述: {description}")

@cli.command()
@click.argument('name')
def delete(name):
    """删除项目"""
    if click.confirm(f'确定要删除项目 {name} 吗?'):
        click.echo(f"已删除: {name}")

@cli.command()
@click.option('--format', '-f', type=click.Choice(['table', 'json']), default='table')
def list(format):
    """列出所有项目"""
    projects = [{'name': '项目A', 'status': '运行中'}, {'name': '项目B', 'status': '已停止'}]
    if format == 'json':
        import json
        click.echo(json.dumps(projects, ensure_ascii=False, indent=2))
    else:
        for p in projects:
            click.echo(f"  {p['name']} - {p['status']}")

if __name__ == '__main__':
    cli()
```

使用方式：

```bash
python mytool.py create myproject -d "我的项目"
python mytool.py delete myproject
python mytool.py list --format json
```

### 参数类型验证

```python
import click

@click.command()
@click.argument('input_file', type=click.Path(exists=True))  # 文件必须存在
@click.option('--count', '-n', type=click.IntRange(1, 100), default=10, help='处理次数')
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
def process(input_file, count, output):
    """处理文件"""
    click.echo(f"输入文件: {input_file}")
    click.echo(f"处理次数: {count}")
    if output:
        click.echo(f"输出到: {output}")
```

### 交互式输入

```python
import click

@click.command()
def setup():
    """交互式配置向导"""
    # 文本输入
    name = click.prompt('请输入你的名字')
    click.echo(f"你好, {name}!")

    # 带默认值的输入
    port = click.prompt('端口号', type=int, default=8000)
    click.echo(f"端口: {port}")

    # 密码输入（不显示输入内容）
    password = click.prompt('请输入密码', hide_input=True, confirmation_prompt=True)
    click.echo("密码已设置")

    # 确认
    if click.confirm('是否继续?'):
        click.echo("继续执行...")
    else:
        click.echo("已取消")
```

### 彩色输出

```python
import click

@click.command()
def status():
    """显示系统状态"""
    click.echo(click.style('成功', fg='green', bold=True))
    click.echo(click.style('警告', fg='yellow'))
    click.echo(click.style('错误', fg='red', bold=True))

    # 进度信息
    click.echo("处理中...", nl=False)
    import time
    time.sleep(1)
    click.echo(click.style(' 完成', fg='green'))
```

### 进度条

```python
import click
import time

@click.command()
def download():
    """模拟下载过程"""
    items = range(100)
    with click.progressbar(items, label='下载中') as bar:
        for item in bar:
            time.sleep(0.02)  # 模拟下载延迟
    click.echo("下载完成!")
```

### 使用 Typer（更现代的选择）

Typer 基于 Click 构建，使用 Python 类型注解，代码更简洁：

```bash
pip install typer
```

```python
# app.py
import typer

app = typer.Typer(help='项目管理工具')

@app.command()
def create(name: str, description: str = typer.Option('', help='项目描述')):
    """创建新项目"""
    typer.echo(f"创建项目: {name}")
    if description:
        typer.echo(f"描述: {description}")

@app.command()
def delete(name: str, force: bool = typer.Option(False, '--force', '-f', help='强制删除')):
    """删除项目"""
    if force or typer.confirm(f'确定要删除 {name}?'):
        typer.echo(f"已删除: {name}")

@app.command()
def list(format: str = typer.Option('table', help='输出格式')):
    """列出项目"""
    typer.echo("项目列表...")

if __name__ == '__main__':
    app()
```

## 常见场景

### 文件处理工具

```python
import click
import json
import csv

@click.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--format', '-f', type=click.Choice(['json', 'csv']), required=True)
@click.option('--output', '-o', type=click.Path(), help='输出文件')
def convert(input_file, format, output):
    """文件格式转换工具"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if format == 'csv':
        if not data:
            click.echo("数据为空")
            return
        # JSON 转 CSV
        fieldnames = data[0].keys()
        output_file = output or input_file.replace('.json', '.csv')
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        click.echo(f"已转换并保存到 {output_file}")
```

### 批量操作工具

```python
import click
import os

@click.command()
@click.argument('directory', type=click.Path(exists=True))
@click.option('--pattern', '-p', default='.py', help='文件扩展名')
@click.option('--dry-run', is_flag=True, help='只显示不执行')
def cleanup(directory, pattern, dry_run):
    """清理指定类型的文件"""
    count = 0
    for root, dirs, files in os.walk(directory):
        for filename in files:
            if filename.endswith(pattern):
                filepath = os.path.join(root, filename)
                if dry_run:
                    click.echo(f"将删除: {filepath}")
                else:
                    os.remove(filepath)
                    click.echo(f"已删除: {filepath}")
                count += 1

    action = "将删除" if dry_run else "已删除"
    click.echo(f"\n共{action} {count} 个文件")
```

## 注意事项与常见错误

### 使用 click.echo 而不是 print

click.echo 正确处理了不同平台的编码问题，而 print 在某些环境下可能遇到 Unicode 编码错误。始终使用 click.echo。

### 退出码

当命令执行失败时，应该使用非零退出码退出：

```python
import click
import sys

@click.command()
def check():
    """检查系统状态"""
    if not health_check():
        click.echo("检查失败", err=True)  # 输出到 stderr
        sys.exit(1)  # 非零退出码
    click.echo("检查通过")
```

Click 也提供了更简洁的方式：

```python
@click.command()
def check():
    if not health_check():
        raise click.ClickException("检查失败")  # 自动使用退出码 1
```

### 打包为可执行命令

在 pyproject.toml 中配置入口点，安装后就可以直接在终端使用命令名：

```toml
[project.scripts]
mytool = "myapp.cli:cli"
```

安装后就可以直接运行 `mytool` 命令，而不需要 `python mytool.py`。

## 进阶用法

### 使用 Rich 美化输出

Rich 库可以让 CLI 输出更美观：

```bash
pip install rich
```

```python
from rich.console import Console
from rich.table import Table
from rich.progress import Progress
import time

console = Console()

# 彩色输出
console.print("[green]成功[/green]")
console.print("[red]失败[/red]")
console.print("[bold]重要信息[/bold]")

# 表格输出
table = Table(title="项目列表")
table.add_column("名称", style="cyan")
table.add_column("状态", style="green")
table.add_column("创建时间")
table.add_row("项目A", "运行中", "2026-01-15")
table.add_row("项目B", "已停止", "2026-01-10")
console.print(table)

# 进度条
with Progress() as progress:
    task = progress.add_task("处理中...", total=100)
    for i in range(100):
        time.sleep(0.02)
        progress.update(task, advance=1)
```

### 配置文件支持

```python
import click
import json
import os

CONFIG_PATH = os.path.expanduser('~/.mytool_config.json')

def load_config():
    """加载配置文件"""
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_config(config):
    """保存配置文件"""
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)

@click.group()
@click.pass_context
def cli(ctx):
    """项目管理工具"""
    ctx.obj = load_config()  # 将配置存入上下文

@cli.command()
@click.option('--api-key', prompt=True, hide_input=True)
@click.pass_obj
def config(config, api_key):
    """设置配置"""
    config['api_key'] = api_key
    save_config(config)
    click.echo("配置已保存")
```
