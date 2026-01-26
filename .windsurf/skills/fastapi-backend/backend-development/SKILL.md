---
name: "fastapi-backend"
description: "FastAPI backend development workflow for gangwon-business-portal"
version: "1.0.0"
author: "Development Team"
tags: ["backend", "fastapi", "python", "supabase", "sqlalchemy", "alembic"]
---

# FastAPI Backend Development Skill

## 描述
这个技能专门用于处理江原道创业企业绩效管理门户的 FastAPI 后端开发，基于项目的 Python + FastAPI + Supabase + SQLAlchemy 架构。

## 项目架构特点
- **Backend**: FastAPI + Python 3.11+
- **Database**: PostgreSQL via Supabase
- **ORM**: SQLAlchemy 2.0 with Alembic migrations
- **Authentication**: JWT with python-jose
- **Validation**: Pydantic v2
- **Testing**: Pytest + pytest-asyncio
- **File Upload**: python-multipart
- **Email**: aiosmtplib
- **Data Export**: openpyxl

## 使用场景
- 创建新的 API 端点
- 数据库模型设计和迁移
- Supabase 集成开发
- 认证和授权实现
- 数据验证和序列化
- 文件上传处理
- 邮件服务集成
- 数据导出功能

## 项目结构
```
backend/
├── src/
│   ├── api/          # API 路由
│   ├── models/       # SQLAlchemy 模型
│   ├── schemas/      # Pydantic 模式
│   ├── services/     # 业务逻辑
│   ├── utils/        # 工具函数
│   └── main.py       # 应用入口
├── alembic/          # 数据库迁移
├── tests/            # 测试文件
└── requirements.txt  # 依赖管理
```

## 包含资源
- FastAPI 路由模板
- SQLAlchemy 模型模板
- Pydantic 模式模板
- 服务层模板
- 数据库迁移模板
- 测试模板

## 调用方式
当任务涉及后端 API 开发、数据库操作或 FastAPI 功能实现时自动触发。
