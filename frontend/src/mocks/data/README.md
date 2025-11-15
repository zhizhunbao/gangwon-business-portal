# Mock Data 目录说明

本目录包含所有模块的 mock 数据文件，用于前端开发阶段通过 MSW 模拟后端 API 响应。

## 目录结构

```
data/
├── auth/             # 认证用户数据
│   ├── ko.json       # 韩文版本
│   └── zh.json       # 中文版本
├── projects/          # 项目数据
│   ├── ko.json       # 韩文版本
│   └── zh.json       # 中文版本
├── members/          # 会员数据
│   ├── ko.json
│   └── zh.json
├── performance/      # 绩效数据
│   ├── ko.json
│   └── zh.json
├── content/          # 内容数据（横幅、新闻、FAQ等）
│   ├── ko.json
│   └── zh.json
├── support/          # 支持数据（咨询、通知）
│   ├── ko.json
│   └── zh.json
└── settings/         # 系统设置数据
    ├── ko.json
    └── zh.json
```

## 数据模块说明

### 1. Auth (认证)

包含系统用户认证数据，用于登录和注册功能。

**主要字段：**
- `users`: 用户列表

**用户角色：**
- `admin`: 管理员（通过邮箱登录）
- `member`: 普通会员（通过营业执照号码登录）

**用户字段：**
- `id`: 用户ID
- `email`: 邮箱（管理员必填）
- `businessLicense`: 营业执照号码（会员必填，管理员为 null）
- `password`: 密码
- `role`: 用户角色
- `name`: 用户姓名
- `companyName`: 公司名称（会员必填，管理员为 null）
- `memberId`: 会员ID（关联到 members 数据）

### 2. Projects (项目)

包含项目列表和项目申请数据。

**主要字段：**
- `projects`: 项目列表
- `projectApplications`: 项目申请列表

详细说明请参考 `projects/README.md`

### 3. Members (会员)

包含企业会员信息和会员档案数据。

**主要字段：**
- `members`: 会员列表
- `memberProfiles`: 会员档案列表

**会员状态：**
- `approved`: 已批准
- `pending`: 待审批
- `rejected`: 已拒绝

### 4. Performance (绩效)

包含绩效记录和审核记录数据。

**主要字段：**
- `performanceRecords`: 绩效记录列表
- `performanceReviews`: 审核记录列表

**绩效记录状态：**
- `draft`: 草稿
- `pending`: 待审核
- `approved`: 已批准
- `revision_required`: 需要补正
- `rejected`: 已拒绝

**绩效数据类型：**
- 销售数据：销售额、内销、出口
- 雇佣数据：员工总数、正式员工、兼职员工、新招聘
- 政府支持：支援类型、金额、提供方
- 知识产权：专利、商标、设计、著作权

### 5. Content (内容)

包含横幅、弹窗、新闻、FAQ 和关于页面数据。

**主要字段：**
- `banners`: 横幅列表（主横幅、滚动横幅）
- `popups`: 弹窗列表
- `news`: 新闻/公告列表
- `faqs`: 常见问题列表
- `about`: 关于页面信息

**横幅类型：**
- `main`: 主横幅
- `scroll`: 滚动横幅

**新闻分类：**
- `announcement`: 公告
- `notice`: 通知

**FAQ 分类：**
- `registration`: 注册相关
- `project`: 项目相关
- `performance`: 绩效相关
- `support`: 支持相关

### 6. Support (支持)

包含咨询和通知数据。

**主要字段：**
- `inquiries`: 咨询列表
- `notifications`: 通知列表

**咨询状态：**
- `pending`: 待回复
- `answered`: 已回复

**咨询分类：**
- `project`: 项目相关
- `performance`: 绩效相关
- `system`: 系统相关

**通知类型：**
- `project`: 项目通知
- `performance`: 绩效通知
- `system`: 系统通知

### 7. Settings (设置)

包含系统配置、业务领域、合作领域、知识产权分类和条款数据。

**主要字段：**
- `businessAreas`: 业务领域列表
- `cooperationAreas`: 合作领域列表
- `ipCategories`: 知识产权分类列表
- `terms`: 条款列表（使用条款、隐私政策）
- `systemConfig`: 系统配置

**业务领域代码：**
- `IT`: 信息通信
- `BIO`: 生物
- `ENERGY`: 新能源
- `FOOD`: 食品
- `TOURISM`: 旅游

**知识产权类型：**
- `PATENT`: 专利
- `TRADEMARK`: 商标
- `DESIGN`: 设计
- `COPYRIGHT`: 著作权

## 使用方式

在 MSW handlers 中使用 `loadMockData` 函数加载数据：

```javascript
import { loadMockData } from '../config.js';

// 加载认证用户数据
const authData = await loadMockData('auth');
const users = authData.users;

// 加载项目数据
const data = await loadMockData('projects');
const projects = data.projects;

// 加载绩效数据
const perfData = await loadMockData('performance');
const records = perfData.performanceRecords;
```

## 数据格式规范

1. **日期格式**: 使用 ISO 8601 格式 (`YYYY-MM-DDTHH:mm:ssZ`)
2. **金额格式**: 使用整数（单位为韩元）
3. **ID 格式**: 使用递增整数
4. **布尔值**: 使用 `true`/`false`
5. **空值**: 使用 `null`

## 注意事项

- Mock 数据应该与实际后端 API 返回的数据格式保持一致
- 数据文件应保持 JSON 格式的有效性
- 韩文和中文版本的数据结构应保持一致，仅内容语言不同
- 数据中的 ID 应保持唯一性
- 关联数据（如 `memberId`、`projectId`）应引用实际存在的数据 ID

