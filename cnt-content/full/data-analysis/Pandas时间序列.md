---
order: 104
title: Pandas时间序列
module: 'data-analysis'
category: data
difficulty: intermediate
description: 'Pandas 时间序列：resample、rolling、shift、diff 与时区处理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'data-analysis/特征工程'
  - 'data-analysis/Pandas分组聚合'
  - 'data-analysis/NumPy广播机制'
  - 'data-analysis/Matplotlib子图布局'
prerequisites:
  - 'data-analysis/数据分析概述'
---

## 1. 时间索引

### 1.1 DatetimeIndex

DatetimeIndex是Pandas时间序列的重要组成部分。本节详细介绍DatetimeIndex的核心概念、工作原理和实际应用。

**关键要点**：

- DatetimeIndex的定义与核心原理
- DatetimeIndex的实现方式与技术细节
- DatetimeIndex在实际场景中的应用与最佳实践
- DatetimeIndex的常见问题与解决方案

DatetimeIndex在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 PeriodIndex

PeriodIndex是Pandas时间序列的重要组成部分。本节详细介绍PeriodIndex的核心概念、工作原理和实际应用。

**关键要点**：

- PeriodIndex的定义与核心原理
- PeriodIndex的实现方式与技术细节
- PeriodIndex在实际场景中的应用与最佳实践
- PeriodIndex的常见问题与解决方案

PeriodIndex在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. 重采样

### 2.1 resample 降采样

resample 降采样是Pandas时间序列的重要组成部分。本节详细介绍resample 降采样的核心概念、工作原理和实际应用。

**关键要点**：

- resample 降采样的定义与核心原理
- resample 降采样的实现方式与技术细节
- resample 降采样在实际场景中的应用与最佳实践
- resample 降采样的常见问题与解决方案

resample 降采样在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 resample 升采样

resample 升采样是Pandas时间序列的重要组成部分。本节详细介绍resample 升采样的核心概念、工作原理和实际应用。

**关键要点**：

- resample 升采样的定义与核心原理
- resample 升采样的实现方式与技术细节
- resample 升采样在实际场景中的应用与最佳实践
- resample 升采样的常见问题与解决方案

resample 升采样在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.3 OHLC 重采样

OHLC 重采样是Pandas时间序列的重要组成部分。本节详细介绍OHLC 重采样的核心概念、工作原理和实际应用。

**关键要点**：

- OHLC 重采样的定义与核心原理
- OHLC 重采样的实现方式与技术细节
- OHLC 重采样在实际场景中的应用与最佳实践
- OHLC 重采样的常见问题与解决方案

OHLC 重采样在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. 滑动窗口

### 3.1 rolling 窗口

rolling 窗口是Pandas时间序列的重要组成部分。本节详细介绍rolling 窗口的核心概念、工作原理和实际应用。

**关键要点**：

- rolling 窗口的定义与核心原理
- rolling 窗口的实现方式与技术细节
- rolling 窗口在实际场景中的应用与最佳实践
- rolling 窗口的常见问题与解决方案

rolling 窗口在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 expanding 窗口

expanding 窗口是Pandas时间序列的重要组成部分。本节详细介绍expanding 窗口的核心概念、工作原理和实际应用。

**关键要点**：

- expanding 窗口的定义与核心原理
- expanding 窗口的实现方式与技术细节
- expanding 窗口在实际场景中的应用与最佳实践
- expanding 窗口的常见问题与解决方案

expanding 窗口在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.3 ewm 指数加权

ewm 指数加权是Pandas时间序列的重要组成部分。本节详细介绍ewm 指数加权的核心概念、工作原理和实际应用。

**关键要点**：

- ewm 指数加权的定义与核心原理
- ewm 指数加权的实现方式与技术细节
- ewm 指数加权在实际场景中的应用与最佳实践
- ewm 指数加权的常见问题与解决方案

ewm 指数加权在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 时序操作

### 4.1 shift/lag

shift/lag是Pandas时间序列的重要组成部分。本节详细介绍shift/lag的核心概念、工作原理和实际应用。

**关键要点**：

- shift/lag的定义与核心原理
- shift/lag的实现方式与技术细节
- shift/lag在实际场景中的应用与最佳实践
- shift/lag的常见问题与解决方案

shift/lag在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 diff 百分比变化

diff 百分比变化是Pandas时间序列的重要组成部分。本节详细介绍diff 百分比变化的核心概念、工作原理和实际应用。

**关键要点**：

- diff 百分比变化的定义与核心原理
- diff 百分比变化的实现方式与技术细节
- diff 百分比变化在实际场景中的应用与最佳实践
- diff 百分比变化的常见问题与解决方案

diff 百分比变化在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.3 时区处理

时区处理是Pandas时间序列的重要组成部分。本节详细介绍时区处理的核心概念、工作原理和实际应用。

**关键要点**：

- 时区处理的定义与核心原理
- 时区处理的实现方式与技术细节
- 时区处理在实际场景中的应用与最佳实践
- 时区处理的常见问题与解决方案

时区处理在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
