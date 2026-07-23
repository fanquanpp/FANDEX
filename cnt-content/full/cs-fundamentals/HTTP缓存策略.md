---
order: 109
title: HTTP缓存策略
module: 'cs-fundamentals'
category: 'comp-sci'
difficulty: intermediate
description: 'HTTP 缓存策略：强缓存（Cache-Control、Expires）、协商缓存（ETag、Last-Modified）与缓存流程。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/零拷贝'
  - 'cs-fundamentals/进程间通信'
  - 'cs-fundamentals/HTTPS握手过程'
  - 'cs-fundamentals/TCP拥塞控制'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 强缓存

### 1.1 Cache-Control 指令

Cache-Control 指令是HTTP缓存策略的重要组成部分。本节详细介绍Cache-Control 指令的核心概念、工作原理和实际应用。

**关键要点**：

- Cache-Control 指令的定义与核心原理
- Cache-Control 指令的实现方式与技术细节
- Cache-Control 指令在实际场景中的应用与最佳实践
- Cache-Control 指令的常见问题与解决方案

Cache-Control 指令在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 Expires 头

Expires 头是HTTP缓存策略的重要组成部分。本节详细介绍Expires 头的核心概念、工作原理和实际应用。

**关键要点**：

- Expires 头的定义与核心原理
- Expires 头的实现方式与技术细节
- Expires 头在实际场景中的应用与最佳实践
- Expires 头的常见问题与解决方案

Expires 头在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. 协商缓存

### 2.1 ETag / If-None-Match

ETag / If-None-Match是HTTP缓存策略的重要组成部分。本节详细介绍ETag / If-None-Match的核心概念、工作原理和实际应用。

**关键要点**：

- ETag / If-None-Match的定义与核心原理
- ETag / If-None-Match的实现方式与技术细节
- ETag / If-None-Match在实际场景中的应用与最佳实践
- ETag / If-None-Match的常见问题与解决方案

ETag / If-None-Match在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 Last-Modified / If-Modified-Since

Last-Modified / If-Modified-Since是HTTP缓存策略的重要组成部分。本节详细介绍Last-Modified / If-Modified-Since的核心概念、工作原理和实际应用。

**关键要点**：

- Last-Modified / If-Modified-Since的定义与核心原理
- Last-Modified / If-Modified-Since的实现方式与技术细节
- Last-Modified / If-Modified-Since在实际场景中的应用与最佳实践
- Last-Modified / If-Modified-Since的常见问题与解决方案

Last-Modified / If-Modified-Since在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. 缓存决策流程

### 3.1 完整缓存判断流程

完整缓存判断流程是HTTP缓存策略的重要组成部分。本节详细介绍完整缓存判断流程的核心概念、工作原理和实际应用。

**关键要点**：

- 完整缓存判断流程的定义与核心原理
- 完整缓存判断流程的实现方式与技术细节
- 完整缓存判断流程在实际场景中的应用与最佳实践
- 完整缓存判断流程的常见问题与解决方案

完整缓存判断流程在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 Vary 头的作用

Vary 头的作用是HTTP缓存策略的重要组成部分。本节详细介绍Vary 头的作用的核心概念、工作原理和实际应用。

**关键要点**：

- Vary 头的作用的定义与核心原理
- Vary 头的作用的实现方式与技术细节
- Vary 头的作用在实际场景中的应用与最佳实践
- Vary 头的作用的常见问题与解决方案

Vary 头的作用在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 缓存最佳实践

### 4.1 静态资源缓存

静态资源缓存是HTTP缓存策略的重要组成部分。本节详细介绍静态资源缓存的核心概念、工作原理和实际应用。

**关键要点**：

- 静态资源缓存的定义与核心原理
- 静态资源缓存的实现方式与技术细节
- 静态资源缓存在实际场景中的应用与最佳实践
- 静态资源缓存的常见问题与解决方案

静态资源缓存在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 API 缓存策略

API 缓存策略是HTTP缓存策略的重要组成部分。本节详细介绍API 缓存策略的核心概念、工作原理和实际应用。

**关键要点**：

- API 缓存策略的定义与核心原理
- API 缓存策略的实现方式与技术细节
- API 缓存策略在实际场景中的应用与最佳实践
- API 缓存策略的常见问题与解决方案

API 缓存策略在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
