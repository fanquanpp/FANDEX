---
order: 95
tags:
  - cpp
  - concurrency
difficulty: advanced
title: 并发编程
module: cpp
category: 'C++ Basics'
description: C++11/14/17/20多线程编程、互斥量、条件变量、原子操作、异步编程与并发设计模式。
author: fanquanpp
updated: '2026-06-13'
related:
  - cpp/C++26与最新标准
  - cpp/STL容器与迭代器
  - cpp/RAII资源管理
  - cpp/STL算法与函数对象
prerequisites:
  - cpp/概述与现代标准
---

## 1. C++ 并发编程概述

### 1.1 并发与并行

- **并发（Concurrency）**：多个任务在逻辑上同时推进，可能在单核上交替执行
- **并行（Parallelism）**：多个任务在物理上同时执行，需要多核处理器

### 1.2 C++ 线程支持演进

| 标准  | 新增特性                                                  |
| :---- | :-------------------------------------------------------- |
| C++11 | 线程库、mutex、condition_variable、atomic、future/promise |
| C++14 | shared_mutex（读写锁）、shared_timed_mutex                |
| C++17 | 并行STL算法                                               |
| C++20 | jthread（自动join）、协程、信号量、latch、barrier         |

## 2. 线程管理

### 2.1 创建与启动线程

```cpp
#include <iostream>
#include <thread>
#include <string>
#include <vector>

// 方式1：函数指针
void print_message(const std::string& msg) {
    std::cout << "Thread message: " << msg << std::endl;
}

// 方式2：Lambda表达式
void lambda_thread() {
    std::thread t([](int id) {
        std::cout << "Lambda thread id: " << id << std::endl;
    }, 42);
    t.join();
}

// 方式3：函数对象（仿函数）
class Worker {
public:
    void operator()(int iterations) {
        for (int i = 0; i < iterations; i++) {
            std::cout << "Worker iteration: " << i << std::endl;
        }
    }
};

// 方式4：成员函数
class Task {
public:
    void run() {
        std::cout << "Task running in thread" << std::endl;
    }
};

void thread_creation() {
    // 函数指针
    std::thread t1(print_message, "Hello from thread");

    // Lambda
    std::thread t2([]() {
        std::cout << "Lambda thread" << std::endl;
    });

    // 仿函数
    std::thread t3(Worker(), 5);

    // 成员函数
    Task task;
    std::thread t4(&Task::run, &task);

    // 等待所有线程完成
    t1.join();
    t2.join();
    t3.join();
    t4.join();
}
```

### 2.2 线程的生命周期管理

```cpp
void thread_lifecycle() {
    std::thread t([]() {
        std::cout << "Working..." << std::endl;
    });

    // join: 等待线程完成
    t.join();

    // detach: 分离线程，使其在后台运行
    std::thread t2([]() {
        std::cout << "Detached thread" << std::endl;
    });
    t2.detach();

    // joinable: 检查线程是否可join
    std::thread t3;
    std::cout << "Empty thread joinable: " << t3.joinable() << std::endl;  // 0

    // RAII线程守卫
    class ThreadGuard {
    public:
        explicit ThreadGuard(std::thread& t) : thread_(t) {}
        ~ThreadGuard() {
            if (thread_.joinable()) {
                thread_.join();
            }
        }
        ThreadGuard(const ThreadGuard&) = delete;
        ThreadGuard& operator=(const ThreadGuard&) = delete;
    private:
        std::thread& thread_;
    };

    {
        std::thread worker([]() { /* work */ });
        ThreadGuard guard(worker);
        // 即使异常发生，guard析构也会join线程
    }
}
```

### 2.3 C++20 jthread

```cpp
#include <thread>

void jthread_demo() {
    // jthread 自动在析构时 join
    std::jthread t([]() {
        std::cout << "jthread working" << std::endl;
    });
    // 无需手动join，析构时自动join

    // jthread 支持协作式取消
    std::jthread long_task([](std::stop_token st) {
        while (!st.stop_requested()) {
            std::cout << "Working..." << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        std::cout << "Task stopped" << std::endl;
    });

    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    long_task.request_stop();  // 请求停止
}
```

## 3. 互斥量与锁

### 3.1 mutex 基本用法

```cpp
#include <iostream>
#include <thread>
#include <mutex>
#include <vector>

class ThreadSafeCounter {
public:
    void increment() {
        std::lock_guard<std::mutex> lock(mutex_);
        count_++;
    }

    int get() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return count_;
    }

private:
    mutable std::mutex mutex_;
    int count_ = 0;
};

void mutex_demo() {
    ThreadSafeCounter counter;
    std::vector<std::thread> threads;

    for (int i = 0; i < 10; i++) {
        threads.emplace_back([&counter]() {
            for (int j = 0; j < 1000; j++) {
                counter.increment();
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    std::cout << "Final count: " << counter.get() << std::endl;  // 10000
}
```

### 3.2 各种锁类型

```cpp
#include <mutex>
#include <shared_mutex>

void lock_types_demo() {
    std::mutex mtx;

    // 1. lock_guard: 最简单的RAII锁
    {
        std::lock_guard<std::mutex> lock(mtx);
        // 临界区
    }  // 自动解锁

    // 2. unique_lock: 更灵活的锁
    {
        std::unique_lock<std::mutex> lock(mtx);
        // 可以手动解锁和重新加锁
        lock.unlock();
        // 做一些不需要锁的操作
        lock.lock();
        // 也可以延迟加锁
        std::unique_lock<std::mutex> defer_lock(mtx, std::defer_lock);
        defer_lock.lock();  // 手动加锁
    }

    // 3. shared_mutex (C++17): 读写锁
    std::shared_mutex rw_mtx;
    {
        // 多个读者可以同时持有读锁
        std::shared_lock<std::shared_mutex> read_lock(rw_mtx);
        // 读取数据
    }
    {
        // 写锁独占
        std::unique_lock<std::shared_mutex> write_lock(rw_mtx);
        // 修改数据
    }
}
```

### 3.3 避免死锁

```cpp
#include <mutex>
#include <thread>

class BankAccount {
public:
    explicit BankAccount(int balance) : balance_(balance) {}
    void deposit(int amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        balance_ += amount;
    }
    void withdraw(int amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        balance_ -= amount;
    }
    int balance() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return balance_;
    }
    std::mutex& get_mutex() { return mutex_; }
private:
    mutable std::mutex mutex_;
    int balance_;
};

// 死锁场景：两个线程分别持有对方需要的锁
void deadlock_example() {
    BankAccount a(1000), b(1000);

    // 线程1: a → b
    std::thread t1([&]() {
        std::lock_guard<std::mutex> lock_a(a.get_mutex());
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        std::lock_guard<std::mutex> lock_b(b.get_mutex());  // 可能死锁！
        a.withdraw(100);
        b.deposit(100);
    });

    // 线程2: b → a
    std::thread t2([&]() {
        std::lock_guard<std::mutex> lock_b(b.get_mutex());
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        std::lock_guard<std::mutex> lock_a(a.get_mutex());  // 死锁！
        b.withdraw(100);
        a.deposit(100);
    });

    t1.join();
    t2.join();
}

// 解决方案1：std::lock 同时锁定多个互斥量
void safe_transfer1() {
    BankAccount a(1000), b(1000);

    auto transfer = [&]() {
        std::unique_lock<std::mutex> lock_a(a.get_mutex(), std::defer_lock);
        std::unique_lock<std::mutex> lock_b(b.get_mutex(), std::defer_lock);
        std::lock(lock_a, lock_b);  // 原子化锁定，避免死锁

        a.withdraw(100);
        b.deposit(100);
    };

    std::thread t1(transfer);
    std::thread t2(transfer);
    t1.join();
    t2.join();
}

// 解决方案2：C++17 scoped_lock
void safe_transfer2() {
    BankAccount a(1000), b(1000);

    auto transfer = [&]() {
        std::scoped_lock lock(a.get_mutex(), b.get_mutex());  // C++17
        a.withdraw(100);
        b.deposit(100);
    };

    std::thread t1(transfer);
    std::thread t2(transfer);
    t1.join();
    t2.join();
}
```

## 4. 条件变量

### 4.1 生产者-消费者模型

```cpp
#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

template<typename T>
class ThreadSafeQueue {
public:
    void push(T value) {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            queue_.push(std::move(value));
        }
        cv_.notify_one();
    }

    T pop() {
        std::unique_lock<std::mutex> lock(mutex_);
        cv_.wait(lock, [this]() { return !queue_.empty(); });
        T value = std::move(queue_.front());
        queue_.pop();
        return value;
    }

    bool try_pop(T& value, std::chrono::milliseconds timeout) {
        std::unique_lock<std::mutex> lock(mutex_);
        if (cv_.wait_for(lock, timeout, [this]() { return !queue_.empty(); })) {
            value = std::move(queue_.front());
            queue_.pop();
            return true;
        }
        return false;
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return queue_.empty();
    }

private:
    mutable std::mutex mutex_;
    std::condition_variable cv_;
    std::queue<T> queue_;
};

void producer_consumer_demo() {
    ThreadSafeQueue<int> queue;
    bool done = false;

    // 生产者
    std::thread producer([&]() {
        for (int i = 0; i < 10; i++) {
            queue.push(i);
            std::cout << "Produced: " << i << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
        done = true;
        queue.push(-1);  // 哨兵值
    });

    // 消费者
    std::thread consumer([&]() {
        while (true) {
            int value = queue.pop();
            if (value == -1) break;
            std::cout << "Consumed: " << value << std::endl;
        }
    });

    producer.join();
    consumer.join();
}
```

## 5. 原子操作

### 5.1 atomic 基本用法

```cpp
#include <iostream>
#include <thread>
#include <atomic>
#include <vector>

void atomic_demo() {
    // 基本原子类型
    std::atomic<int> counter(0);
    std::atomic<bool> flag(false);

    std::vector<std::thread> threads;
    for (int i = 0; i < 10; i++) {
        threads.emplace_back([&counter]() {
            for (int j = 0; j < 1000; j++) {
                counter.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    std::cout << "Counter: " << counter.load() << std::endl;  // 10000
}
```

### 5.2 CAS（Compare-And-Swap）操作

```cpp
#include <atomic>

// 无锁栈的入栈操作
template<typename T>
class LockFreeStack {
    struct Node {
        T data;
        Node* next;
        explicit Node(T val) : data(std::move(val)), next(nullptr) {}
    };

    std::atomic<Node*> head_{nullptr};

public:
    void push(T value) {
        Node* new_node = new Node(std::move(value));
        new_node->next = head_.load(std::memory_order_relaxed);

        // CAS: 如果head_仍等于new_node->next，则更新为new_node
        while (!head_.compare_exchange_weak(
            new_node->next,        // expected: 期望的当前值
            new_node,              // desired: 想要设置的新值
            std::memory_order_release,
            std::memory_order_relaxed)) {
            // CAS失败，new_node->next已被自动更新为当前head_
            // 重试即可
        }
    }
};
```

### 5.3 内存序

```cpp
void memory_order_demo() {
    // memory_order_relaxed: 无同步，只保证原子性
    std::atomic<int> relaxed_counter{0};
    relaxed_counter.fetch_add(1, std::memory_order_relaxed);

    // memory_order_acquire: 读操作，确保之后的读写不会被重排到此之前
    // memory_order_release: 写操作，确保之前的读写不会被重排到此之后
    std::atomic<bool> ready{false};
    int data = 0;

    // 写入线程
    std::thread writer([&]() {
        data = 42;                                    // 写入数据
        ready.store(true, std::memory_order_release);  // 发布信号
    });

    // 读取线程
    std::thread reader([&]() {
        while (!ready.load(std::memory_order_acquire)) {  // 获取信号
            std::this_thread::yield();
        }
        std::cout << "data = " << data << std::endl;  // 保证看到42
    });

    writer.join();
    reader.join();

    // memory_order_seq_cst (默认): 顺序一致性，最严格的内存序
    // memory_order_acq_rel: 同时具有acquire和release语义
}
```

## 6. 异步编程

### 6.1 future 与 promise

```cpp
#include <iostream>
#include <future>
#include <thread>

int compute_value(int x) {
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    return x * x;
}

void async_demo() {
    // std::async: 异步执行任务
    // launch::async: 强制在新线程执行
    // launch::deferred: 延迟到get()时在当前线程执行
    std::future<int> fut = std::async(std::launch::async, compute_value, 10);

    // 做其他工作...
    std::cout << "Doing other work..." << std::endl;

    // 获取结果（阻塞直到完成）
    int result = fut.get();
    std::cout << "Result: " << result << std::endl;  // 100

    // std::promise: 显式设置值
    std::promise<int> prom;
    std::future<int> fut2 = prom.get_future();

    std::thread t([&prom]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        prom.set_value(42);
    });

    std::cout << "Promise value: " << fut2.get() << std::endl;
    t.join();
}
```

### 6.2 packaged_task

```cpp
#include <iostream>
#include <future>
#include <thread>
#include <queue>
#include <functional>

// 线程池简化版
class SimpleThreadPool {
public:
    SimpleThreadPool(size_t count) {
        for (size_t i = 0; i < count; i++) {
            workers_.emplace_back([this]() { worker_loop(); });
        }
    }

    ~SimpleThreadPool() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            stop_ = true;
        }
        cv_.notify_all();
        for (auto& w : workers_) w.join();
    }

    template<typename F>
    auto submit(F&& f) -> std::future<decltype(f())> {
        using ReturnType = decltype(f());
        auto task = std::make_shared<std::packaged_task<ReturnType()>>(
            std::forward<F>(f)
        );
        auto future = task->get_future();
        {
            std::lock_guard<std::mutex> lock(mutex_);
            tasks_.push([task]() { (*task)(); });
        }
        cv_.notify_one();
        return future;
    }

private:
    void worker_loop() {
        while (true) {
            std::function<void()> task;
            {
                std::unique_lock<std::mutex> lock(mutex_);
                cv_.wait(lock, [this]() { return stop_ || !tasks_.empty(); });
                if (stop_ && tasks_.empty()) return;
                task = std::move(tasks_.front());
                tasks_.pop();
            }
            task();
        }
    }

    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool stop_ = false;
};
```

## 7. 常见问题与解决方案

### 7.1 数据竞争

**问题**：多线程同时读写非原子变量

```cpp
// 错误：无保护的数据竞争
int counter = 0;
// 多线程执行 counter++ → 数据竞争

// 解决方案1：使用mutex
std::mutex mtx;
int counter = 0;
{
    std::lock_guard<std::mutex> lock(mtx);
    counter++;
}

// 解决方案2：使用atomic
std::atomic<int> counter{0};
counter.fetch_add(1, std::memory_order_relaxed);
```

### 7.2 死锁

**问题**：两个线程互相等待对方持有的锁

**解决方案**：

1. 使用 `std::lock` 或 `std::scoped_lock` 同时获取多个锁
2. 固定加锁顺序
3. 使用 `try_lock` 加超时机制
4. 尽量减少锁的粒度和持有时间

### 7.3 虚假唤醒

**问题**：条件变量的 `wait` 可能无故返回

```cpp
// 错误：不检查条件
cv.wait(lock);

// 正确：始终使用谓词
cv.wait(lock, []{ return condition; });
```

## 8. 总结与最佳实践

### 8.1 并发编程原则

1. **最小化共享数据**：减少线程间交互
2. **使用RAII管理锁**：`lock_guard`、`unique_lock`
3. **避免嵌套锁**：减少死锁风险
4. **优先使用高级抽象**：`future`、`packaged_task`、线程池
5. **原子操作优先于锁**：简单计数器用 `atomic`

### 8.2 性能优化

- 减小锁粒度：只锁必要的临界区
- 读写分离：`shared_mutex` 允许多读者并行
- 无锁编程：CAS操作适合简单数据结构
- 线程池：避免频繁创建销毁线程
- 避免伪共享：对齐频繁修改的原子变量
