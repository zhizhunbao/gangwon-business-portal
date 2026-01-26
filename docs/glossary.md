# 江原道企业门户 - 业务术语对照表 (Glossary)

本文件定义了项目中的核心业务术语，确保前后端命名高度一致。

## 1. 核心实体 (Core Entities)

| 英文名 (English)    | 韩文名 (Korean) | 中文名 (Chinese) | 描述 (Description)           |
| ------------------- | --------------- | ---------------- | ---------------------------- |
| Enterprise / Member | 기업 / 회원     | 企业 / 会员      | 门户的主要服务对象           |
| Admin               | 관리자          | 管理员           | 门户的后台管理人员           |
| Project / Program   | 지원사업        | 扶持项目         | 江原道发布的各类企业扶持项目 |
| Application         | 신청            | 申请 / 申报      | 企业针对某个项目的申报记录   |
| Notice              | 공지사항        | 公告             | 系统发布的通知公告           |
| Support             | 고객지원        | 客户支持 / 咨询  | Q&A 或 1:1 咨询功能          |

## 2. 状态映射 (Status Mapping)

| 状态 Key  | 描述 (Description) |
| --------- | ------------------ |
| PENDING   | 待审核             |
| APPROVED  | 已批准 / 审核通过  |
| REJECTED  | 已驳回             |
| COMPLETED | 已完成             |
| DRAFT     | 草稿               |

## 3. 多语言 Key 规范 (i18n Keys)

- **Common**: `common.save`, `common.cancel`, `common.delete`
- **Auth**: `auth.login`, `auth.logout`, `auth.register`
- **Project**: `project.list.title`, `project.detail.apply`

---

_更新于: 2026-01-25_
