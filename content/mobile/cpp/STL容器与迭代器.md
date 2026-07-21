# STL容器与迭代器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## vector

**基本写法：创建 vector**
`std::vector<<type>> <vec>;`
```cpp
#include <vector>
// 创建整型 vector
std::vector<int> vec;
```

---

**初始化写法：列表初始化**
`std::vector<<type>> <vec> = {<values>};`
```cpp
#include <vector>
// 列表初始化 vector
std::vector<int> vec = {1, 2, 3, 4, 5};
```

---

**大小写法：指定大小初始化**
`std::vector<<type>> <vec>(<size>);`
```cpp
#include <vector>
// 创建包含 10 个 0 的 vector
std::vector<int> vec(10);
```

---

**大小填充写法：指定大小和初始值**
`std::vector<<type>> <vec>(<size>, <value>);`
```cpp
#include <vector>
// 创建包含 10 个 5 的 vector
std::vector<int> vec(10, 5);
```

---

**添加写法：添加元素**
`<vec>.push_back(<value>);`
```cpp
#include <vector>
// 添加元素到末尾
std::vector<int> vec;
vec.push_back(10);
```

---

**原地构造写法：原地构造元素**
`<vec>.emplace_back(<args>);`
```cpp
#include <vector>
// 原地构造元素
std::vector<std::string> vec;
vec.emplace_back("Hello");
```

---

**访问写法：访问元素**
`<vec>[<index>]`
```cpp
#include <vector>
// 通过索引访问元素
std::vector<int> vec = {1, 2, 3};
std::cout << vec[0] << std::endl;
```

---

**at 写法：安全访问元素**
`<vec>.at(<index>)`
```cpp
#include <vector>
// 使用 at 安全访问（会进行边界检查）
std::vector<int> vec = {1, 2, 3};
std::cout << vec.at(0) << std::endl;
```

---

**大小写法：获取元素个数**
`<vec>.size()`
```cpp
#include <vector>
// 获取 vector 元素个数
std::vector<int> vec = {1, 2, 3};
std::cout << vec.size() << std::endl;
```

---

**删除写法：删除末尾元素**
`<vec>.pop_back();`
```cpp
#include <vector>
// 删除末尾元素
std::vector<int> vec = {1, 2, 3};
vec.pop_back();
```

---

**清空写法：清空 vector**
`<vec>.clear();`
```cpp
#include <vector>
// 清空 vector
std::vector<int> vec = {1, 2, 3};
vec.clear();
```

---

## list

**基本写法：创建 list**
`std::list<<type>> <lst>;`
```cpp
#include <list>
// 创建整型 list
std::list<int> lst;
```

---

**初始化写法：列表初始化**
`std::list<<type>> <lst> = {<values>};`
```cpp
#include <list>
// 列表初始化 list
std::list<int> lst = {1, 2, 3};
```

---

**添加写法：添加元素到末尾**
`<lst>.push_back(<value>);`
```cpp
#include <list>
// 添加元素到末尾
std::list<int> lst;
lst.push_back(10);
```

---

**添加写法：添加元素到开头**
`<lst>.push_front(<value>);`
```cpp
#include <list>
// 添加元素到开头
std::list<int> lst;
lst.push_front(10);
```

---

## deque

**基本写法：创建 deque**
`std::deque<<type>> <dq>;`
```cpp
#include <deque>
// 创建整型 deque
std::deque<int> dq;
```

---

**添加写法：添加元素到末尾**
`<dq>.push_back(<value>);`
```cpp
#include <deque>
// 添加元素到末尾
std::deque<int> dq;
dq.push_back(10);
```

---

**添加写法：添加元素到开头**
`<dq>.push_front(<value>);`
```cpp
#include <deque>
// 添加元素到开头
std::deque<int> dq;
dq.push_front(10);
```

---

## map

**基本写法：创建 map**
`std::map<<key_type>, <value_type>> <m>;`
```cpp
#include <map>
// 创建 string 到 int 的 map
std::map<std::string, int> m;
```

---

**初始化写法：列表初始化**
`std::map<<key_type>, <value_type>> <m> = { {<key>, <value>}, ... };`
```cpp
#include <map>
// 列表初始化 map
std::map<std::string, int> m = {{"apple", 1}, {"banana", 2}};
```

---

**插入写法：插入键值对**
`<m>[<key>] = <value>;`
```cpp
#include <map>
// 使用下标插入键值对
std::map<std::string, int> m;
m["apple"] = 1;
```

---

**insert 写法：使用 insert 插入**
`<m>.insert({<key>, <value>});`
```cpp
#include <map>
// 使用 insert 插入键值对
std::map<std::string, int> m;
m.insert({"banana", 2});
```

---

**访问写法：访问元素**
`<m>[<key>]`
```cpp
#include <map>
// 通过键访问值
std::map<std::string, int> m = {{"apple", 1}};
std::cout << m["apple"] << std::endl;
```

---

**at 写法：安全访问元素**
`<m>.at(<key>)`
```cpp
#include <map>
// 使用 at 安全访问（会进行键检查）
std::map<std::string, int> m = {{"apple", 1}};
std::cout << m.at("apple") << std::endl;
```

---

**查找写法：查找元素**
`auto <it> = <m>.find(<key>);`
```cpp
#include <map>
// 查找键
std::map<std::string, int> m = {{"apple", 1}};
auto it = m.find("apple");
if (it != m.end()) {
    std::cout << it->second << std::endl;
}
```

---

**删除写法：删除元素**
`<m>.erase(<key>);`
```cpp
#include <map>
// 删除指定键的元素
std::map<std::string, int> m = {{"apple", 1}};
m.erase("apple");
```

---

## unordered_map

**基本写法：创建 unordered_map**
`std::unordered_map<<key_type>, <value_type>> <m>;`
```cpp
#include <unordered_map>
// 创建哈希表
std::unordered_map<std::string, int> m;
```

---

**初始化写法：列表初始化**
`std::unordered_map<<key_type>, <value_type>> <m> = { {<key>, <value>}, ... };`
```cpp
#include <unordered_map>
// 列表初始化 unordered_map
std::unordered_map<std::string, int> m = {{"apple", 1}, {"banana", 2}};
```

---

## set

**基本写法：创建 set**
`std::set<<type>> <s>;`
```cpp
#include <set>
// 创建整型 set
std::set<int> s;
```

---

**插入写法：插入元素**
`<s>.insert(<value>);`
```cpp
#include <set>
// 插入元素
std::set<int> s;
s.insert(10);
```

---

**查找写法：查找元素**
`auto <it> = <s>.find(<value>);`
```cpp
#include <set>
// 查找元素
std::set<int> s = {1, 2, 3};
auto it = s.find(2);
if (it != s.end()) {
    std::cout << "Found" << std::endl;
}
```

---

## 迭代器

**begin 写法：获取起始迭代器**
`<container>.begin()`
```cpp
#include <vector>
// 获取起始迭代器
std::vector<int> vec = {1, 2, 3};
auto it = vec.begin();
```

---

**end 写法：获取结束迭代器**
`<container>.end()`
```cpp
#include <vector>
// 获取结束迭代器
std::vector<int> vec = {1, 2, 3};
auto it = vec.end();
```

---

**迭代器遍历写法：使用迭代器遍历**
`for (auto it = <container>.begin(); it != <container>.end(); ++it) { ... }`
```cpp
#include <vector>
// 使用迭代器遍历
std::vector<int> vec = {1, 2, 3};
for (auto it = vec.begin(); it != vec.end(); ++it) {
    std::cout << *it << std::endl;
}
```

---

**范围 for 写法：使用范围 for 循环**
`for (const auto& <item> : <container>) { ... }`
```cpp
#include <vector>
// 使用范围 for 循环遍历
std::vector<int> vec = {1, 2, 3};
for (const auto& item : vec) {
    std::cout << item << std::endl;
}
```

---

**反向迭代器写法：反向遍历**
`for (auto it = <container>.rbegin(); it != <container>.rend(); ++it) { ... }`
```cpp
#include <vector>
// 反向遍历
std::vector<int> vec = {1, 2, 3};
for (auto it = vec.rbegin(); it != vec.rend(); ++it) {
    std::cout << *it << std::endl;
}
```

---

## 算法

**sort 写法：排序**
`std::sort(<begin>, <end>);`
```cpp
#include <algorithm>
#include <vector>
// 对 vector 排序
std::vector<int> vec = {3, 1, 4, 1, 5};
std::sort(vec.begin(), vec.end());
```

---

**find 写法：查找元素**
`std::find(<begin>, <end>, <value>);`
```cpp
#include <algorithm>
#include <vector>
// 查找元素
std::vector<int> vec = {1, 2, 3};
auto it = std::find(vec.begin(), vec.end(), 2);
```

---

**count 写法：统计元素个数**
`std::count(<begin>, <end>, <value>);`
```cpp
#include <algorithm>
#include <vector>
// 统计元素个数
std::vector<int> vec = {1, 2, 3, 2, 2};
int count = std::count(vec.begin(), vec.end(), 2);
```

---

**accumulate 写法：求和**
`std::accumulate(<begin>, <end>, <init>);`
```cpp
#include <numeric>
#include <vector>
// 计算元素总和
std::vector<int> vec = {1, 2, 3, 4, 5};
int sum = std::accumulate(vec.begin(), vec.end(), 0);
```

---

**for_each 写法：遍历处理**
`std::for_each(<begin>, <end>, <func>);`
```cpp
#include <algorithm>
#include <vector>
// 遍历处理每个元素
std::vector<int> vec = {1, 2, 3};
std::for_each(vec.begin(), vec.end(), [](int x) {
    std::cout << x << std::endl;
});
```

---

**transform 写法：转换元素**
`std::transform(<begin>, <end>, <dest>, <func>);`
```cpp
#include <algorithm>
#include <vector>
// 转换元素
std::vector<int> src = {1, 2, 3};
std::vector<int> dest(3);
std::transform(src.begin(), src.end(), dest.begin(), [](int x) {
    return x * 2;
});
```

---

**copy 写法：复制元素**
`std::copy(<begin>, <end>, <dest>);`
```cpp
#include <algorithm>
#include <vector>
// 复制元素
std::vector<int> src = {1, 2, 3};
std::vector<int> dest(3);
std::copy(src.begin(), src.end(), dest.begin());
```

---

**remove 写法：删除元素**
`<container>.erase(std::remove(<begin>, <end>, <value>), <end>);`
```cpp
#include <algorithm>
#include <vector>
// 删除所有值为 2 的元素
std::vector<int> vec = {1, 2, 3, 2, 4};
vec.erase(std::remove(vec.begin(), vec.end(), 2), vec.end());
```

---

**lower_bound 写法：二分查找下界**
`std::lower_bound(<begin>, <end>, <value>);`
```cpp
#include <algorithm>
#include <vector>
// 二分查找下界
std::vector<int> vec = {1, 2, 3, 4, 5};
auto it = std::lower_bound(vec.begin(), vec.end(), 3);
```

---

**upper_bound 写法：二分查找上界**
`std::upper_bound(<begin>, <end>, <value>);`
```cpp
#include <algorithm>
#include <vector>
// 二分查找上界
std::vector<int> vec = {1, 2, 3, 4, 5};
auto it = std::upper_bound(vec.begin(), vec.end(), 3);
```
