---
order: 780
title: Python 序列化 JSON/CSV/Pickle
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 序列化 JSON/CSV/Pickle 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## json 序列化

**基本写法：对象转 JSON 字符串**
`json.dumps(<对象>)`
```python
# 将 Python 对象转为 JSON 字符串
import json
data = {"name": "Tom", "age": 18}
s = json.dumps(data)  # '{"name": "Tom", "age": 18}'
```

**基本写法：格式化输出**
`json.dumps(<对象>, indent=<缩进>, ensure_ascii=<布尔>)`
```python
# 缩进美化并保留中文字符
print(json.dumps(data, indent=2, ensure_ascii=False))
```

**基本写法：JSON 字符串转对象**
`json.loads(<字符串>)`
```python
# 将 JSON 字符串解析为 Python 对象
obj = json.loads('{"name": "Tom"}')
print(obj["name"])  # Tom
```

**基本写法：写入文件**
`json.dump(<对象>, <文件对象>)`
```python
# 将对象序列化写入文件
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

**基本写法：从文件读取**
`json.load(<文件对象>)`
```python
# 从文件读取并解析 JSON
with open("data.json", encoding="utf-8") as f:
    obj = json.load(f)
```

**基本写法：排序键输出**
`json.dumps(<对象>, sort_keys=True)`
```python
# 按键名排序输出
print(json.dumps({"b": 1, "a": 2}, sort_keys=True))
```

**基本写法：自定义序列化**
`json.dumps(<对象>, default=<函数>)`
```python
# 自定义非内置类型的序列化逻辑
from datetime import datetime
def default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError

print(json.dumps({"t": datetime.now()}, default=default))
```

**基本写法：自定义反序列化**
`json.loads(<字符串>, object_hook=<函数>)`
```python
# 解析时转换字典结构
def as_date(d):
    if "date" in d:
        return d["date"]
    return d

obj = json.loads('{"date": "2024-01-01"}', object_hook=as_date)
```

**基本写法：JSONEncoder 子类**
`class <类>(json.JSONEncoder):`
```python
# 通过子类化编码器统一处理类型
class MyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return list(o)
        return super().default(o)

print(json.dumps({1, 2}, cls=MyEncoder))
```

---

## csv 读写

**基本写法：写入 CSV**
`csv.writer(<文件对象>)`
```python
# 写入 CSV 文件
import csv
with open("data.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["name", "age"])
    w.writerow(["Tom", 18])
```

**基本写法：读取 CSV**
`csv.reader(<文件对象>)`
```python
# 读取 CSV 文件内容
with open("data.csv", encoding="utf-8") as f:
    reader = csv.reader(f)
    for row in reader:
        print(row)  # ['name', 'age']
```

**基本写法：字典方式写入**
`csv.DictWriter(<文件对象>, fieldnames=<字段列表>)`
```python
# 按字典结构写入
fields = ["name", "age"]
with open("data.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerow({"name": "Tom", "age": 18})
```

**基本写法：字典方式读取**
`csv.DictReader(<文件对象>)`
```python
# 按字典结构读取
with open("data.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"])  # Tom
```

**基本写法：指定分隔符与引号**
`csv.writer(<文件>, delimiter=<分隔符>, quotechar=<引号字符>)`
```python
# 自定义分隔符（如 TSV 制表符分隔）
with open("data.tsv", "w", newline="") as f:
    w = csv.writer(f, delimiter="\t")
    w.writerow(["a", "b"])
```

**基本写法：处理空值与方言**
`csv.register_dialect(<名称>, **<参数>)`
```python
# 注册自定义方言复用配置
csv.register_dialect("pipes", delimiter="|")
with open("data.txt", "w", newline="") as f:
    w = csv.writer(f, dialect="pipes")
    w.writerow(["a", "b"])
```

---

## pickle 序列化

**基本写法：对象转字节串**
`pickle.dumps(<对象>)`
```python
# 将任意 Python 对象序列化为字节
import pickle
data = {"name": "Tom", "list": [1, 2, 3]}
b = pickle.dumps(data)
```

**基本写法：字节串转对象**
`pickle.loads(<字节串>)`
```python
# 从字节反序列化为 Python 对象
obj = pickle.loads(b)
print(obj["name"])  # Tom
```

**基本写法：写入文件**
`pickle.dump(<对象>, <文件对象>)`
```python
# 序列化对象到文件
with open("data.pkl", "wb") as f:
    pickle.dump(data, f)
```

**基本写法：从文件读取**
`pickle.load(<文件对象>)`
```python
# 从文件反序列化对象
with open("data.pkl", "rb") as f:
    obj = pickle.load(f)
```

**基本写法：指定协议版本**
`pickle.dump(<对象>, <文件>, protocol=<版本>)`
```python
# 使用高版本协议提升效率
with open("data.pkl", "wb") as f:
    pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
```

**基本写法：批量序列化**
`pickle.dump + 循环`
```python
# 多次调用 dump 可写入多个对象
with open("data.pkl", "wb") as f:
    for item in [obj1, obj2, obj3]:
        pickle.dump(item, f)

# 读取时循环 load 直到 EOFError
with open("data.pkl", "rb") as f:
    while True:
        try:
            print(pickle.load(f))
        except EOFError:
            break
```

---

## shelve 持久化字典

**基本写法：打开 shelve 数据库**
`shelve.open(<文件名>)`
```python
# 像字典一样持久化存储对象
import shelve
db = shelve.open("mydb")
db["user"] = {"name": "Tom", "age": 18}
print(db["user"]["name"])  # Tom
db.close()
```

**基本写法：上下文管理**
`with shelve.open(<文件名>) as <变量>:`
```python
# 使用 with 自动关闭
with shelve.open("mydb") as db:
    db["key"] = "value"
    for k in db:
        print(k, db[k])
```

**基本写法：写回模式**
`shelve.open(<文件名>, writeback=True)`
```python
# 启用写回，修改可变值时自动同步
with shelve.open("mydb", writeback=True) as db:
    db["list"].append("new")  # 直接修改生效
```

---

## msgpack 与 orjson（高性能扩展）

**基本写法：orjson 高速序列化**
`orjson.dumps(<对象>)`
```python
# orjson 性能远高于标准 json（返回字节）
import orjson
b = orjson.dumps(data, option=orjson.OPT_INDENT_2)
obj = orjson.loads(b)
```

**基本写法：orjson 保留中文**
`orjson.dumps(<对象>, option=orjson.OPT_NON_STR_KEYS)`
```python
# orjson 默认即返回 UTF-8 字节，无需 ensure_ascii
import orjson
print(orjson.dumps({"名": "Tom"}))  # b'{"name":"Tom"}'
```
