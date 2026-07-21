---
order: 63
title: 优化器追踪
module: mysql
category: MySQL
difficulty: advanced
description: MySQL优化器追踪OPTIMIZER_TRACE：执行计划选择过程、代价计算与调试方法
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/EXPLAIN输出详解
  - mysql/慢查询日志
  - mysql/子查询优化
  - mysql/派生表优化
prerequisites:
  - mysql/语法速查
---

## 1. 优化器追踪概述

MySQL 5.6 引入 OPTIMIZER_TRACE，记录优化器选择执行计划的完整过程。

## 2. 使用方法

```sql
-- 开启优化器追踪
SET optimizer_trace = 'enabled=on';
SET optimizer_trace_max_mem_size = 1048576;  -- 1MB

-- 执行查询
SELECT * FROM employees WHERE dept_id = 5;

-- 查看追踪结果
SELECT * FROM information_schema.OPTIMIZER_TRACE\G

-- 关闭追踪
SET optimizer_trace = 'enabled=off';
```

## 3. 追踪结果解读

```json
{
  "steps": [
    {
      "join_preparation": {
        "select#": 1,
        "steps": [
          {"expanded_query": "/* select#1 */ SELECT ..."}
        ]
      }
    },
    {
      "join_optimization": {
        "select#": 1,
        "steps": [
          {"condition_processing": {"condition": "WHERE"}},
          {"substitute_generated_columns": {}},
          {"table_dependencies": [...]},
          {"ref_optimizer_key_uses": [...]},
          {"rows_estimation": [...]},
          {"considered_execution_plans": [...]},
          {"attaching_conditions_to_tables": [...]}
        ]
      }
    },
    {
      "join_execution": {
        "select#": 1,
        "steps": [...]
      }
    }
  ]
}
```

## 4. 关键信息

### 4.1 rows_estimation

```json
{
  "rows_estimation": [
    {
      "table": "employees",
      "range_analysis": {
        "table_scan": { "rows": 10000, "cost": 2050 },
        "potential_range_indices": [
          { "index": "idx_dept", "usable": true, "key_parts": ["dept_id"] }
        ],
        "best_range_access": {
          "chosen": true,
          "index": "idx_dept",
          "rows": 100,
          "cost": 121
        }
      }
    }
  ]
}
```

### 4.2 considered_execution_plans

```json
{
  "considered_execution_plans": [
    {
      "plan_prefix": [],
      "table": "employees",
      "best_access_path": {
        "considered_access_paths": [
          { "access_type": "ref", "index": "idx_dept", "cost": 50, "chosen": true },
          { "access_type": "scan", "cost": 2050, "chosen": false }
        ]
      },
      "cost_for_plan": 50,
      "chosen": true
    }
  ]
}
```

## 5. 实际应用

```sql
-- 诊断优化器为何选择全表扫描
SET optimizer_trace = 'enabled=on';
SELECT * FROM large_table WHERE status = 'rare_value';
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
-- 查看 range_analysis 中各索引的代价估算
-- 如果索引代价估算偏高，可能需要更新统计信息
ANALYZE TABLE large_table;
```
