---
inclusion: always
---

# Skills Manager

Proactively load specialized skills when user queries match keywords below. Skills provide domain-specific guidance, workflows, and best practices.

## Core Rules

1. **Automatic Detection**: Scan user queries for keywords (English or Chinese) and load matching skills immediately
2. **File Location**: Skills are in `.skills/{skill-name}/SKILL.md`
3. **Matching Strategy**: Support exact matches, partial matches, and related terms
4. **Priority**: When multiple skills match, prefer the most specific one
5. **Validation**: Before applying, verify SKILL.md has proper structure (objectives, use cases, instructions)
6. **References**: Load additional context from `.agents/skills/{skill-name}/references/` if available
7. **Clarification**: If ambiguous, ask user which skill domain they need


## Skill Mappings

### 🛠️ Development

| Keywords | Skill |
| --- | --- |
| fastapi, backend, python api, async, pydantic, sqlalchemy, dependency injection, 后端开发, FastAPI开发, Python后端 | `dev-backend-fastapi` |
| backend patterns, repository pattern, service layer, caching strategy, error handling, authentication pattern, 后端模式, 仓储模式, 服务层, 缓存策略, 错误处理模式, 认证模式 | `dev-backend_patterns` |
| react, frontend, typescript, components, hooks, state management, zustand, react query, 前端开发, React开发, 组件开发 | `dev-frontend-react` |
| api design, rest, restful, openapi, swagger, api contract, http methods, status codes, API设计, 接口设计, RESTful | `dev-api-design` |
| testing, unit test, integration test, e2e, pytest, vitest, playwright, test coverage, 测试, 单元测试, 集成测试, 端到端测试 | `dev-testing` |
| tdd, test-driven development, test-driven, test first, red-green-refactor, 测试驱动开发, TDD, 测试优先, 先写测试 | `dev-tdd_workflow` |
| architecture, refactor, refactoring, system design, restructure, 架构, 重构, 系统设计, 架构图, 代码重构 | `dev-architecture_refactor` |
| azure, azure openai, azure ai search, azure blob storage, azure ai foundry, cloud, gpt-4o, ada-002, vector search, 云服务, Azure服务 | `cloud-azure` |
| docx, word, markdown, md, convert, word to markdown, docx to md, document conversion, pandoc, mammoth, python-docx, 转换, 文档转换 | `dev-docx_to_md` |
| download, data download, dataset, fetch data, download file, API download, kaggle, huggingface, sklearn, UCI, data acquisition, wget, curl, requests, http download, file download, batch download, 下载, 数据下载, 数据集, 获取数据, 下载文件, API下载, 数据获取, 批量下载 | `dev-data_download` |
| git, version control, commit, push, pull, branch, merge, rebase, conflict, repository, github, gitlab, gitignore, workflow, 版本控制, 提交, 推送, 拉取, 分支, 合并, 变基, 冲突, 仓库, 工作流 | `dev-git` |
| discover, resource discovery, evaluation, benchmark, selection, 发现, 资源发现, 评测, 选型 | `dev-resource_discovery` |
| code standards, naming conventions, directory structure, refactor, code organization, project structure, 代码规范, 命名规范, 目录结构, 重构, 代码组织, 项目结构 | `dev-code_standards` |
| coding standards, best practices, code quality, immutability, error handling, type safety, API design, KISS, DRY, YAGNI, 代码规范, 最佳实践, 代码质量, 不可变性, 错误处理, 类型安全 | `dev-coding_standards` |
| code style, formatting, linter, lint, prettier, eslint, ruff, black, type check, pre-commit, 代码风格, 格式化, 类型检查 | `dev-code_style` |
| frontend patterns, react patterns, component patterns, hooks, custom hooks, state management, performance optimization, forms, animation, accessibility, compound components, render props, 前端模式, React模式, 组件模式, 钩子, 状态管理, 性能优化, 表单, 动画, 可访问性 | `dev-frontend-patterns` |
| web scraping, crawler, playwright, selenium, beautifulsoup, data extraction, anti-bot, browser automation, 网页抓取, 爬虫, 数据提取, 反爬虫, 浏览器自动化 | `dev-web_scraping` |
| pdf, extract, convert, markdown, bilingual, translation, academic, paper, slides, 提取, 转换, 双语, 中英文, 翻译, 学术, 论文, 课件 | `dev-pdf_processing` |
| translation, technical translation, bilingual documentation, terminology, localization, i18n, 翻译, 技术翻译, 双语文档, 术语, 本地化 | `dev-translation` |
| document review, documentation quality, consistency check, accuracy, readability, technical writing, content organization, error detection, check document, 文档审查, 文档质量, 一致性检查, 准确性, 可读性, 技术写作, 内容组织, 错误检测, 检查文档 | `dev-document_review` |
| github review, project review, repository review, code review, project assessment, open source review, quality assessment, architecture review, 项目审查, 仓库审查, GitHub审查, 开源项目审查, 质量评估, 架构审查 | `dev-github_review` |
| security review, authentication, authorization, input validation, SQL injection, XSS, CSRF, secrets management, vulnerability, OWASP, 安全审查, 认证, 授权, 输入验证, SQL注入, 跨站脚本, 密钥管理, 漏洞 | `dev-security_review` |
| code quality check, quality checker, AST analysis, function size, file size, nesting depth, code smell, 代码质量检查, 质量检查器, 函数大小, 文件大小, 嵌套深度 | `dev-code_quality_check` |
| security scan, security scanner, vulnerability scan, secrets detection, hardcoded secrets, 安全扫描, 安全扫描器, 漏洞扫描, 密钥检测, 硬编码密钥 | `dev-security_scan` |

### 🤖 AI Technology

| Keywords | Skill |
| --- | --- |
| agent, AI agent, framework selection, 智能体, 框架选型 | `ai-agents` |
| prompt, prompt engineering, 提示词 | `ai-prompts` |
| skill, claude skill | `ai-skills` |
| llm, language model, 大模型, 语言模型 | `ai-llm_models` |

### 🎓 AI Learning

| Keywords | Skill |
| --- | --- |
| machine learning, ML, 机器学习 | `ai_learning-ml` |
| deep learning, DL, 深度学习 | `ai_learning-dl` |
| LLM learning, 大模型学习 | `ai_learning-llm` |
| NLP, natural language processing, 自然语言处理 | `ai_learning-nlp` |
| machine vision, MV, computer vision, CV, 机器视觉 | `ai_learning-mv` or `ai_learning-cv` |
| RAG, retrieval augmented generation, 检索增强 | `ai_learning-rag` |
| reinforcement learning, RL, 强化学习 | `ai_learning-rl` |

### 💼 Career Development

| Keywords | Skill |
| --- | --- |
| resume, CV, 简历 | `career-resume` |
| interview, 面试 | `career-interview` |
| job search, 求职 | `career-job_search` |
| certification, 认证 | `career-certification` |
| entrepreneurship, 创业 | `career-entrepreneurship` |

### 🛂 Immigration & Identity

| Keywords | Skill |
| --- | --- |
| visa, 签证 | `identity-visa` or `immigration-visa_renewal` |
| PR, permanent residence, immigration, 永居, 移民 | `immigration-pr_application` |
| work permit, 工签 | `immigration-work_permit` |
| citizenship, 入籍 | `immigration-citizenship` |
| family sponsorship, 家庭团聚, 担保 | `immigration-family_sponsorship` |
| SSN, social security number, 社保号 | `identity-ssn` |
| driver's license, 驾照 | `identity-driving` or `transportation-driving_license` |

### 💰 Finance

| Keywords | Skill |
| --- | --- |
| banking, 银行 | `finance-banking` |
| credit card, 信用卡 | `finance-credit_card` |
| insurance, 保险 | `finance-insurance` |
| investment, 投资 | `finance-investment` |
| remittance, 汇款 | `finance-remittance` |
| tax, 报税 | `finance-tax` |

### 🏠 Housing

| Keywords | Skill |
| --- | --- |
| rental, 租房 | `housing-rental` |
| home buying, 买房 | `housing-home_buying` |
| moving, 搬家 | `housing-moving` |
| furniture, 家具 | `housing-furniture` |
| utilities, 水电煤 | `housing-utilities` |

### 🚗 Transportation

| Keywords | Skill |
| --- | --- |
| car buying, 买车 | `transportation-car_buying` |
| car insurance, 车险 | `transportation-car_insurance` |
| public transit, 公交 | `transportation-public_transit` |
| flight, 机票 | `transportation-flight` |

### 🏥 Healthcare

| Keywords | Skill |
| --- | --- |
| family doctor, 家庭医生 | `healthcare-family_doctor` |
| clinic visit, 看病 | `healthcare-clinic_visit` |
| pharmacy, 药房 | `healthcare-pharmacy` |
| health insurance, 医疗保险 | `healthcare-health_insurance` |
| mental health, 心理健康 | `healthcare-mental_health` |
| childcare, 托儿 | `healthcare-childcare` |

### 📚 Education

| Keywords | Skill |
| --- | --- |
| school selection, 选校 | `education-school_selection` |
| credential evaluation, 学历认证 | `education-credential_evaluation` |
| language learning, 语言学习 | `education-language_learning` |
| skill training, 培训 | `education-skill_training` |
| tutoring, 补习 | `education-tutoring` |
| child education, 子女教育 | `education-child_education` |

### 📝 Learning & Study

| Keywords | Skill |
| --- | --- |
| notes, note-taking, study notes, lecture notes, organize notes, course materials, study guide, 笔记, 记笔记, 学习笔记, 课堂笔记, 整理笔记, 课程资料, 学习指南 | `learning-note_taking` |
| code generation, generate code, lab code, assignment code, jupyter, python script, homework code, 生成代码, 写代码, 作业代码 | `learning-code_generation` |
| assignment document, Lab.docx, submission document, word document, screenshots, discussion, analysis, 作业文档, 提交文档, 截图, 讨论, 分析 | `learning-assignment_document` |
| consistency, check consistency, verify files, compare files, validate code, .py .ipynb .md, 一致性, 检查一致, 验证文件, 对比文件, 验证代码 | `learning-code_consistency` |
| markdown to word, md转docx, convert to docx, pandoc, word document, format document, 转换docx, 生成word, 格式化文档 | `learning-md_to_docx` |
| notebook conversion, ipynb转py, py转ipynb, convert notebook, jupyter convert, nbconvert, jupytext, script to notebook, notebook to script, 转换notebook, 笔记本转换 | `learning-notebook_conversion` |
| submit lab, lab submission, prepare submission, zip file, upload assignment, brightspace, 提交lab, 作业提交, 准备提交, 打包, 上传作业 | `learning-lab_submission` |
| brightspace scraper, scrape brightspace, download course, course materials, scrape slides, scrape labs, LMS scraper, brightspace抓取, 抓取课程, 下载课程, 课程资料, 抓取slides, 抓取labs, 学习平台抓取 | `learning-brightspace_scraper` |


## Execution Workflow

When a user query is received:

1. **Scan for keywords** - Check query text against all keyword mappings (case-insensitive, both languages)
2. **Identify matches** - List all skills with matching keywords
3. **Select skill** - Choose the most specific match; if tied, ask user to clarify
4. **Load skill file** - Read `.skills/{skill-name}/SKILL.md`
5. **Validate structure** - Ensure file contains objectives, use cases, and instructions sections
6. **Load references** - If `.skills/{skill-name}/references/` exists, load relevant files
7. **Apply guidance** - Follow the skill's instructions to assist the user
8. **Silent operation** - Don't announce that you're loading a skill; just apply it naturally
