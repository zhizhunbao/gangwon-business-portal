---
name: "feature-development"
description: "Feature development workflow for gangwon-business-portal features"
version: "1.0.0"
author: "Development Team"
tags: ["frontend", "react", "vite", "zustand", "i18n", "feature-based"]
---

# Feature Development Skill

## 描述
这个技能专门用于处理江原道创业企业绩效管理门户的功能模块开发，基于项目的 feature-based 架构设计。

## 项目架构特点
- **Frontend**: React + Vite + Zustand + React Query + i18n
- **Feature Structure**: `src/features/{feature}/components/{views,hooks,services,locales}`
- **Shared Layer**: `src/shared/{components,hooks,services,stores,i18n,utils}`
- **Testing**: Vitest + Playwright E2E

## 使用场景
- 创建新的功能模块 (about, auth, home, performance, projects, support)
- 开发功能组件 (views, hooks, services)
- 添加国际化支持
- 集成 Zustand 状态管理
- 设置 React Query 数据获取

## 功能模块
- **about**: 关于页面功能
- **auth**: 认证相关功能
- **home**: 首页功能
- **performance**: 绩效管理功能
- **projects**: 项目管理功能
- **support**: 支持服务功能

## 包含资源
- Feature 模块模板
- 组件开发模板
- 状态管理模板
- 服务层模板
- 国际化模板
- 测试模板

## 调用方式
当任务涉及功能模块开发、组件创建或功能扩展时自动触发。
